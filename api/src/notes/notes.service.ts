import {
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { FirestoreService } from '../core/firestore';
import { TipTapService } from '../core/tiptap';
import { AuditService } from '../audit';
import type {
  CreateNoteDto,
  UpdateNoteDto,
  QueryNotesDto,
} from './dto/create-note.dto';
import type { TipTapDocument } from '../../../shared/types/tiptap.types';

const NOTES_COL = 'notes';
const HISTORY_COL = 'note_history';
const NOTEBOOKS_COL = 'notebooks';
const MAX_HISTORY = 50;
const SNAPSHOT_INTERVAL = 10;

@Injectable()
export class NotesService {
  private readonly logger = new Logger(NotesService.name);

  constructor(
    private readonly firestore: FirestoreService,
    private readonly tipTap: TipTapService,
    private readonly auditService: AuditService,
  ) {}

  // ─────────────────────────────────────────────
  // CRUD
  // ─────────────────────────────────────────────

  /** Lista notas del usuario con filtros y paginación */
  async findAll(userId: string, query: QueryNotesDto) {
    let q: FirebaseFirestore.Query = this.firestore
      .collection(NOTES_COL)
      .where('user_id', '==', userId)
      .where('deleted_at', '==', null);

    if (query.notebook_id) {
      q = q.where('notebook_id', '==', query.notebook_id);
    }
    if (query.is_pinned !== undefined) {
      q = q.where('is_pinned', '==', query.is_pinned);
    }
    if (query.archived === true) {
      q = q.where('archived_at', '!=', null);
    } else if (!query.archived) {
      q = q.where('archived_at', '==', null);
    }

    // Filtrado por tags - usar array-contains-any para múltiples tags
    if (query.tags && query.tags.length > 0) {
      if (query.tags.length === 1) {
        q = q.where('tags', 'array-contains', query.tags[0]);
      } else {
        // Firestore permite máximo 10 valores en array-contains-any
        const tagsToFilter = query.tags.slice(0, 10);
        q = q.where('tags', 'array-contains-any', tagsToFilter);
      }
    }

    q = q.orderBy('updated_at', 'desc').limit(query.limit ?? 20);

    if (query.cursor) {
      const cursorSnap = await this.firestore.getDoc(NOTES_COL, query.cursor);
      if (cursorSnap.exists) q = q.startAfter(cursorSnap);
    }

    const snap = await q.get();
    return snap.docs.map((d) => d.data());
  }

  /** Obtiene una nota verificando ownership */
  async findOne(noteId: string, userId: string) {
    const snap = await this.firestore.getDoc(NOTES_COL, noteId);
    if (!snap.exists)
      throw new NotFoundException(`Nota ${noteId} no encontrada`);

    const data = snap.data() as Record<string, unknown>;
    if (data['user_id'] !== userId)
      throw new ForbiddenException('Sin acceso a esta nota');
    if (data['deleted_at'])
      throw new NotFoundException('Esta nota fue eliminada');

    return data;
  }

  /** Crea una nota y guarda snapshot v1 en note_history */
  async create(userId: string, dto: CreateNoteDto, ipAddress: string) {
    // Verificar que el notebook existe y pertenece al usuario
    await this.assertNotebookOwnership(dto.notebook_id, userId);

    const now = this.firestore.serverTimestamp;
    const noteRef = this.firestore.collection(NOTES_COL).doc();

    // Validar y sanitizar contenido TipTap
    const validation = this.tipTap.validateSchema(
      dto.content as TipTapDocument,
    );
    if (!validation.isValid) {
      throw new BadRequestException(
        `Invalid TipTap content: ${validation.errors.join(', ')}`,
      );
    }

    const sanitizedContent = this.tipTap.sanitizeContent(
      dto.content as TipTapDocument,
    );
    const metrics = this.tipTap.calculateMetrics(sanitizedContent);
    const contentHash = this.tipTap.generateContentHash(sanitizedContent);

    const note = {
      id: noteRef.id,
      user_id: userId,
      notebook_id: dto.notebook_id,
      title: dto.title,
      content: sanitizedContent,
      content_hash: contentHash,
      checksum: this.tipTap.generateChecksum(sanitizedContent),
      version: 1,
      sync_status: 'synced',
      last_sync_at: now,
      created_at: now,
      updated_at: now,
      deleted_at: null,
      archived_at: null,
      reminder_at: dto.reminder_at ? this.firestore.timestampFromDate(new Date(dto.reminder_at)) : null,
      tags: dto.tags ?? [],
      is_pinned: dto.is_pinned ?? false,
      is_template: dto.is_template ?? false,
      template_id: dto.template_id ?? null,
      word_count: metrics.word_count,
      reading_time_minutes: metrics.reading_time_minutes,
      style: dto.style ?? {
        background_color: '#FFFFFF',
        text_color: '#333333',
        highlight_color: '#FFEB3B',
      },
      font: dto.font ?? {
        family: 'Inter',
        size: 14,
        weight: 'normal',
        line_height: 1.4,
      },
      attachments_summary: {
        count: 0,
        total_size_bytes: 0,
        has_images: false,
        has_documents: false,
      },
      sharing: dto.sharing ? {
        public_slug: dto.sharing.public_slug || null,
        public_access_expires: dto.sharing.public_access_expires ? this.firestore.timestampFromDate(new Date(dto.sharing.public_access_expires)) : null,
        collaborators: dto.sharing.collaborators || [],
      } : {
        public_slug: null,
        public_access_expires: null,
        collaborators: [],
      },
      locking: dto.locking ? {
        locked_by: dto.locking.locked_by || null,
        locked_at: dto.locking.locked_at ? this.firestore.timestampFromDate(new Date(dto.locking.locked_at)) : null,
        lock_expires: dto.locking.lock_expires ? this.firestore.timestampFromDate(new Date(dto.locking.lock_expires)) : null,
      } : {
        locked_by: null,
        locked_at: null,
        lock_expires: null,
      },
      audit: {
        created_ip: ipAddress,
        last_updated_by: userId,
        last_updated_ip: ipAddress,
      },
    };

    // Escritura atómica: nota + historial v1 + incrementar note_count
    const batch = this.firestore.batch();

    batch.set(noteRef, note);

    // Snapshot v1 (siempre snapshot completo en v1)
    const histRef = this.firestore.collection(HISTORY_COL).doc();
    batch.set(histRef, {
      id: histRef.id,
      note_id: noteRef.id,
      user_id: userId,
      version: 1,
      timestamp: now,
      is_snapshot: true,
      content_hash: contentHash,
      snapshot: sanitizedContent,
      diff: null,
      change_summary: 'Nota creada',
      author_ip: ipAddress,
      restore_count: 0,
      compression_type: 'none',
      diff_algorithm_version: '1.0',
    });

    // Incrementar note_count en el notebook
    const notebookRef = this.firestore.doc(NOTEBOOKS_COL, dto.notebook_id);
    batch.update(notebookRef, { note_count: this.firestore.increment(1) });

    await batch.commit();
    this.logger.log(`Nota creada: ${noteRef.id} por usuario: ${userId}`);

    // Registrar auditoría
    await this.auditService.log(
      userId,
      'create',
      'note',
      noteRef.id,
      ipAddress,
      'NotesService/1.0',
      {
        after: { title: dto.title, notebook_id: dto.notebook_id },
      },
    );

    const created = await noteRef.get();
    return created.data()!;
  }

  /** Actualiza una nota y guarda diff en note_history */
  async update(
    noteId: string,
    userId: string,
    dto: UpdateNoteDto,
    ipAddress: string,
  ) {
    const existing = await this.findOne(noteId, userId);

    // Si cambia de notebook, verificar ownership del nuevo notebook
    if (dto.notebook_id && dto.notebook_id !== existing['notebook_id']) {
      await this.assertNotebookOwnership(dto.notebook_id, userId);
    }

    const nextVersion = ((existing['version'] as number) ?? 1) + 1;
    const now = this.firestore.serverTimestamp;

    // Validar y sanitizar contenido TipTap
    const validation = this.tipTap.validateSchema(
      dto.content as TipTapDocument,
    );
    if (!validation.isValid) {
      throw new BadRequestException(
        `Invalid TipTap content: ${validation.errors.join(', ')}`,
      );
    }

    const sanitizedContent = this.tipTap.sanitizeContent(
      dto.content as TipTapDocument,
    );
    const metrics = this.tipTap.calculateMetrics(sanitizedContent);
    const contentHash = this.tipTap.generateContentHash(sanitizedContent);
    const isSnapshot =
      nextVersion === 1 || nextVersion % SNAPSHOT_INTERVAL === 0;

    const updates: Record<string, unknown> = {
      title: dto.title,
      content: sanitizedContent,
      content_hash: contentHash,
      checksum: this.tipTap.generateChecksum(sanitizedContent),
      version: nextVersion,
      sync_status: 'synced',
      last_sync_at: now,
      updated_at: now,
      tags: dto.tags ?? existing['tags'],
      is_pinned: dto.is_pinned ?? existing['is_pinned'],
      word_count: metrics.word_count,
      reading_time_minutes: metrics.reading_time_minutes,
      'audit.last_updated_by': userId,
      'audit.last_updated_ip': ipAddress,
    };

    if (dto.notebook_id) updates['notebook_id'] = dto.notebook_id;
    if (dto.style) updates['style'] = dto.style;
    if (dto.font) updates['font'] = dto.font;
    if (dto.reminder_at) updates['reminder_at'] = this.firestore.timestampFromDate(new Date(dto.reminder_at));
    if (dto.sharing) {
      const existingSharing = existing['sharing'] as Record<string, any> | undefined;
      updates['sharing'] = {
        public_slug: dto.sharing.public_slug ?? existingSharing?.public_slug,
        public_access_expires: dto.sharing.public_access_expires 
          ? this.firestore.timestampFromDate(new Date(dto.sharing.public_access_expires))
          : existingSharing?.public_access_expires,
        collaborators: dto.sharing.collaborators ?? existingSharing?.collaborators ?? [],
      };
    }
    if (dto.locking) {
      const existingLocking = existing['locking'] as Record<string, any> | undefined;
      updates['locking'] = {
        locked_by: dto.locking.locked_by ?? existingLocking?.locked_by,
        locked_at: dto.locking.locked_at 
          ? this.firestore.timestampFromDate(new Date(dto.locking.locked_at))
          : existingLocking?.locked_at,
        lock_expires: dto.locking.lock_expires 
          ? this.firestore.timestampFromDate(new Date(dto.locking.lock_expires))
          : existingLocking?.lock_expires,
      };
    }

    const batch = this.firestore.batch();

    // Actualizar nota
    batch.update(this.firestore.doc(NOTES_COL, noteId), updates);

    // Guardar historial
    const histRef = this.firestore.collection(HISTORY_COL).doc();
    batch.set(histRef, {
      id: histRef.id,
      note_id: noteId,
      user_id: userId,
      version: nextVersion,
      timestamp: now,
      is_snapshot: isSnapshot,
      content_hash: contentHash,
      snapshot: isSnapshot ? sanitizedContent : null,
      diff: isSnapshot ? null : { added: '', removed: '' }, // diff real: post-MVP
      change_summary: `Versión ${nextVersion}`,
      author_ip: ipAddress,
      restore_count: 0,
      compression_type: 'none',
      diff_algorithm_version: '1.0',
    });

    await batch.commit();

    // Registrar auditoría
    await this.auditService.log(
      userId,
      'update',
      'note',
      noteId,
      ipAddress,
      'NotesService/1.0',
      {
        before: { title: existing['title'], version: existing['version'] },
        after: { title: dto.title, version: nextVersion },
      },
    );

    // Limpiar historial si supera MAX_HISTORY
    await this.pruneHistory(noteId);

    const updated = await this.firestore.getDoc(NOTES_COL, noteId);
    return updated.data()!;
  }

  /** Soft delete: pone deleted_at, no borra el documento */
  async softDelete(noteId: string, userId: string, ipAddress: string): Promise<void> {
    const noteData = await this.findOne(noteId, userId);
    const notebookId = noteData['notebook_id'] as string;

    const batch = this.firestore.batch();
    batch.update(this.firestore.doc(NOTES_COL, noteId), {
      deleted_at: this.firestore.serverTimestamp,
      updated_at: this.firestore.serverTimestamp,
    });
    batch.update(this.firestore.doc(NOTEBOOKS_COL, notebookId), {
      note_count: this.firestore.increment(-1),
    });
    await batch.commit();
    this.logger.log(`Nota soft-deleted: ${noteId}`);

    // Registrar auditoría
    await this.auditService.log(
      userId,
      'delete',
      'note',
      noteId,
      ipAddress,
      'NotesService/1.0',
      {
        before: { title: noteData['title'], deleted_at: null },
        after: { title: noteData['title'], deleted_at: 'soft-deleted' },
      },
    );
  }

  /** Archiva o desarchiva una nota */
  async toggleArchive(
    noteId: string,
    userId: string,
  ): Promise<Record<string, unknown>> {
    const existing = await this.findOne(noteId, userId);
    const isArchived = !!(existing[
      'archived_at'
    ] as FirebaseFirestore.Timestamp | null);

    await this.firestore.doc(NOTES_COL, noteId).update({
      archived_at: isArchived ? null : this.firestore.serverTimestamp,
      updated_at: this.firestore.serverTimestamp,
    });

    const updatedSnap = await this.firestore.getDoc(NOTES_COL, noteId);
    return updatedSnap.data()! as Record<string, unknown>;
  }

  // ─────────────────────────────────────────────
  // HISTORIAL
  // ─────────────────────────────────────────────

  /** Lista el historial de versiones de una nota (sin el snapshot completo) */
  async getHistory(noteId: string, userId: string) {
    await this.findOne(noteId, userId); // verifica ownership

    const snap = await this.firestore
      .collection(HISTORY_COL)
      .where('note_id', '==', noteId)
      .orderBy('version', 'desc')
      .limit(MAX_HISTORY)
      .get();

    return snap.docs.map((d) => {
      const data = d.data();
      // No devolver el snapshot completo en el listado por performance
      const { snapshot: _snapshot, ...rest } = data as Record<string, unknown>;
      return rest;
    });
  }

  /** Restaura una nota a una versión anterior */
  async restoreVersion(
    noteId: string,
    userId: string,
    version: number,
    ipAddress: string,
  ) {
    await this.findOne(noteId, userId);

    // Buscar el snapshot más cercano <= version
    const histSnap = await this.firestore
      .collection(HISTORY_COL)
      .where('note_id', '==', noteId)
      .where('is_snapshot', '==', true)
      .where('version', '<=', version)
      .orderBy('version', 'desc')
      .limit(1)
      .get();

    if (histSnap.empty) {
      throw new BadRequestException(
        `No se encontró snapshot para la versión ${version}`,
      );
    }

    const histData = histSnap.docs[0].data() as Record<string, unknown>;
    const restoredContent = histData['snapshot'] as TipTapDocument;

    if (!restoredContent) {
      throw new BadRequestException('El snapshot está vacío');
    }

    // Incrementar restore_count del historial restaurado
    await histSnap.docs[0].ref.update({
      restore_count: this.firestore.increment(1),
    });

    // Guardar como nueva versión
    const noteSnap = await this.firestore.getDoc(NOTES_COL, noteId);
    const noteData = noteSnap.data() as Record<string, unknown>;
    const updateDto = {
      ...noteData,
      content: restoredContent,
    } as unknown as UpdateNoteDto;

    this.logger.log(
      `Nota ${noteId} restaurada a versión ${version} por ${userId}`,
    );
    return this.update(noteId, userId, updateDto, ipAddress);
  }

  // ─────────────────────────────────────────────
  // HELPERS PRIVADOS
  // ─────────────────────────────────────────────

  private async assertNotebookOwnership(
    notebookId: string,
    userId: string,
  ): Promise<void> {
    const notebookSnap = await this.firestore.getDoc(NOTEBOOKS_COL, notebookId);
    if (!notebookSnap.exists)
      throw new NotFoundException(`Libreta ${notebookId} no encontrada`);
    const notebookData = notebookSnap.data() as Record<string, unknown>;
    if (notebookData['user_id'] !== userId)
      throw new ForbiddenException('Sin acceso a esta libreta');
  }

  /** Elimina los registros de historial más antiguos si supera MAX_HISTORY */
  private async pruneHistory(noteId: string): Promise<void> {
    const snap = await this.firestore
      .collection(HISTORY_COL)
      .where('note_id', '==', noteId)
      .orderBy('version', 'desc')
      .get();

    if (snap.size <= MAX_HISTORY) return;

    const toDelete = snap.docs.slice(MAX_HISTORY);
    const batch = this.firestore.batch();
    toDelete.forEach((doc) => batch.delete(doc.ref));
    await batch.commit();
    this.logger.log(
      `Pruned ${toDelete.length} history entries for note ${noteId}`,
    );
  }
}
