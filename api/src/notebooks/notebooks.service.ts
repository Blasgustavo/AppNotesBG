import {
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { FirestoreService } from '../core/firestore';
import type { CreateNotebookDto, UpdateNotebookDto } from './dto/notebook.dto';

@Injectable()
export class NotebooksService {
  private readonly logger = new Logger(NotebooksService.name);
  private readonly COL = 'notebooks';
  private readonly NOTES_COL = 'notes';

  constructor(private readonly firestore: FirestoreService) {}

  async findAll(userId: string): Promise<FirebaseFirestore.DocumentData[]> {
    const snap = await this.firestore
      .collection(this.COL)
      .where('user_id', '==', userId)
      .orderBy('sort_order', 'asc')
      .get();

    return snap.docs.map((d) => d.data());
  }

  async findOne(
    notebookId: string,
    userId: string,
  ): Promise<FirebaseFirestore.DocumentData> {
    const snap = await this.firestore.getDoc(this.COL, notebookId);

    if (!snap.exists) {
      throw new NotFoundException(`Libreta ${notebookId} no encontrada`);
    }

    const data = snap.data()!;
    if (data['user_id'] !== userId) {
      throw new ForbiddenException('No tienes acceso a esta libreta');
    }

    return data;
  }

  async create(
    userId: string,
    dto: CreateNotebookDto,
    ipAddress: string,
  ): Promise<FirebaseFirestore.DocumentData> {
    const now = this.firestore.serverTimestamp;
    const ref = this.firestore.collection(this.COL).doc();

    const notebook = {
      id: ref.id,
      user_id: userId,
      name: dto.name,
      icon: dto.icon ?? 'book',
      color: dto.color ?? '#2196F3',
      parent_notebook_id: dto.parent_notebook_id ?? null,
      created_at: now,
      updated_at: now,
      is_default: false,
      is_favorite: false,
      sort_order: dto.sort_order ?? 0,
      note_count: 0,
      sharing: {
        share_token: null,
        share_permissions: 'none',
        public_access_expires: null,
      },
      collaboration_mode: 'private',
      audit: {
        created_ip: ipAddress,
        last_updated_by: userId,
        last_updated_ip: ipAddress,
      },
    };

    await ref.set(notebook);
    this.logger.log(`Libreta creada: ${ref.id} para usuario: ${userId}`);

    const created = await ref.get();
    return created.data()!;
  }

  async update(
    notebookId: string,
    userId: string,
    dto: UpdateNotebookDto,
    ipAddress: string,
  ): Promise<FirebaseFirestore.DocumentData> {
    const existing = await this.findOne(notebookId, userId);

    if (existing['is_default'] && dto.name && dto.name !== existing['name']) {
      throw new BadRequestException(
        'No se puede renombrar la libreta por defecto',
      );
    }

    const updates: Record<string, unknown> = {
      updated_at: this.firestore.serverTimestamp,
      'audit.last_updated_by': userId,
      'audit.last_updated_ip': ipAddress,
    };

    if (dto.name !== undefined) updates['name'] = dto.name;
    if (dto.icon !== undefined) updates['icon'] = dto.icon;
    if (dto.color !== undefined) updates['color'] = dto.color;
    if (dto.is_favorite !== undefined) updates['is_favorite'] = dto.is_favorite;
    if (dto.sort_order !== undefined) updates['sort_order'] = dto.sort_order;

    await this.firestore.doc(this.COL, notebookId).update(updates);

    const updated = await this.firestore.getDoc(this.COL, notebookId);
    return updated.data()!;
  }

  async remove(notebookId: string, userId: string): Promise<void> {
    const existing = await this.findOne(notebookId, userId);

    if (existing['is_default']) {
      throw new BadRequestException(
        'No se puede eliminar la libreta por defecto',
      );
    }

    const activeNotesSnap = await this.firestore
      .collection(this.NOTES_COL)
      .where('notebook_id', '==', notebookId)
      .where('user_id', '==', userId)
      .where('deleted_at', '==', null)
      .limit(1)
      .get();

    if (!activeNotesSnap.empty) {
      throw new BadRequestException(
        'No se puede eliminar una libreta con notas. Mueve o elimina las notas primero.',
      );
    }

    const archivedNotesSnap = await this.firestore
      .collection(this.NOTES_COL)
      .where('notebook_id', '==', notebookId)
      .where('user_id', '==', userId)
      .where('archived_at', '!=', null)
      .limit(1)
      .get();

    if (!archivedNotesSnap.empty) {
      throw new BadRequestException(
        'No se puede eliminar una libreta con notas archivadas. Mueve o elimina las notas archivadas primero.',
      );
    }

    await this.firestore.doc(this.COL, notebookId).delete();
    this.logger.log(`Libreta eliminada: ${notebookId}`);
  }
}
