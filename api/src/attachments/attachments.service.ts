import {
  Injectable,
  Inject,
  Logger,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { FirestoreService } from '../core/firestore';
import * as admin from 'firebase-admin';
import { FIREBASE_ADMIN } from '../core/firebase';
import { AuditService } from '../audit';
import {
  CreateAttachmentDto,
  UpdateAttachmentDto,
} from './dto/create-attachment.dto';

const ATTACHMENTS_COL = 'attachments';
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_STORAGE_PER_USER = 500 * 1024 * 1024; // 500MB
const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'application/pdf',
  'audio/mpeg',
  'audio/mp3',
  'audio/wav',
  'video/mp4',
  'video/webm',
  'text/plain',
  'application/json',
];

@Injectable()
export class AttachmentsService {
  private readonly logger = new Logger(AttachmentsService.name);
  private readonly storage: admin.storage.Storage;

  constructor(
    @Inject(FIREBASE_ADMIN) private readonly firebaseApp: admin.app.App,
    private readonly firestore: FirestoreService,
    private readonly configService: ConfigService,
    private readonly auditService: AuditService,
  ) {
    this.storage = this.firebaseApp.storage();
  }

  /**
   * Sube un archivo a Firebase Storage y crea el registro en Firestore
   */
  async uploadAttachment(
    userId: string,
    noteId: string,
    file: any,
    dto: CreateAttachmentDto,
    ipAddress: string,
  ): Promise<any> {
    try {
      // Validar archivo
      this.validateFile(file);

      // Verificar cuota del usuario
      await this.checkUserQuota(userId, file.size);

      // Verificar que la nota existe y pertenece al usuario
      await this.validateNoteOwnership(noteId, userId);

      // Generar nombre único y ruta
      const fileExtension = file.originalname.split('.').pop() || '';
      const fileName = `${Date.now()}_${Math.random().toString(36).substring(2)}.${fileExtension}`;
      const storagePath = `users/${userId}/notes/${noteId}/${fileName}`;

      // Subir archivo a Storage
      const fileRef = this.storage.bucket().file(storagePath);
      await fileRef.save(file.buffer, {
        metadata: {
          contentType: file.mimetype,
          metadata: {
            originalName: file.originalname,
            uploadedBy: userId,
            uploadedAt: new Date().toISOString(),
            ipAddress,
          },
        },
      });

      // Obtener URL pública
      const [url] = await fileRef.getSignedUrl({
        action: 'read',
        expires: '03-01-2500', // URL válida por mucho tiempo
      });

      // Crear thumbnail para imágenes
      let thumbnailUrl: string | undefined;
      if (file.mimetype.startsWith('image/')) {
        thumbnailUrl = await this.generateThumbnail(fileRef);
      }

      // Extraer metadata
      const extractedMetadata = await this.extractMetadata(file, fileRef);

      // Crear registro en Firestore
      const attachmentData = {
        id: fileName,
        note_id: noteId,
        user_id: userId,
        url,
        storage_path: storagePath,
        type: this.getFileType(file.mimetype),
        mime_type: file.mimetype,
        name: dto.name || file.originalname,
        original_name: file.originalname,
        size_bytes: file.size,
        file_hash: dto.file_hash || this.generateFileHash(file.buffer),
        virus_scan_status: 'pending' as const,
        is_duplicate_of: dto.is_duplicate_of || null,
        thumbnail_url: thumbnailUrl,
        alt_text: dto.alt_text || null,
        extracted_metadata: extractedMetadata,
        download_count: 0,
        last_accessed_at: null,
        access_control: {
          public_access: false,
          allowed_users: [],
          download_permissions: 'all' as const,
        },
        optimization: {
          is_optimized: false,
          webp_available: false,
          cdn_cached: false,
          cache_expires: null,
        },
        audit: {
          created_ip: ipAddress,
          last_updated_by: userId,
          last_updated_ip: ipAddress,
        },
        created_at: this.firestore.serverTimestamp,
        updated_at: this.firestore.serverTimestamp,
      };

      const attachmentRef = this.firestore
        .collection(ATTACHMENTS_COL)
        .doc(fileName);
      await attachmentRef.set(attachmentData);

      // Actualizar summary en la nota
      await this.updateNoteAttachmentSummary(noteId, userId);

      // Actualizar cuota de storage del usuario
      await this.updateUserStorageQuota(userId, file.size, 'add');

      this.logger.log(`Attachment uploaded: ${fileName} by user: ${userId}`);

      // Registrar auditoría
      await this.auditService.log(
        userId,
        'create',
        'attachment',
        fileName,
        ipAddress,
        'AttachmentsService/1.0',
        {
          after: {
            note_id: noteId,
            name: dto.name || file.originalname,
            size_bytes: file.size,
            type: this.getFileType(file.mimetype),
          },
        },
      );

      const created = await attachmentRef.get();
      return created.data();
    } catch (error) {
      this.logger.error(`Failed to upload attachment:`, error);

      // Limpiar archivo de Storage si falló el registro en Firestore
      if (file) {
        try {
          const storagePath = `users/${userId}/notes/${noteId}/${file.originalname}`;
          await this.storage.bucket().file(storagePath).delete();
        } catch (cleanupError) {
          this.logger.error('Failed to cleanup storage file:', cleanupError);
        }
      }

      throw error;
    }
  }

  /**
   * Obtiene un attachment por ID verificando ownership
   */
  async getAttachment(attachmentId: string, userId: string): Promise<any> {
    const snap = await this.firestore.getDoc(ATTACHMENTS_COL, attachmentId);
    if (!snap.exists) {
      throw new NotFoundException(`Attachment ${attachmentId} not found`);
    }

    const data = snap.data() as Record<string, unknown>;
    if (data['user_id'] !== userId) {
      throw new ForbiddenException('Access denied to this attachment');
    }

    // Incrementar download count
    await this.firestore.doc(ATTACHMENTS_COL, attachmentId).update({
      download_count: this.firestore.increment(1),
      last_accessed_at: this.firestore.serverTimestamp,
    });

    return data;
  }

  /**
   * Lista attachments de una nota
   */
  async listNoteAttachments(noteId: string, userId: string): Promise<any[]> {
    // Verificar que la nota existe y pertenece al usuario
    await this.validateNoteOwnership(noteId, userId);

    const snap = await this.firestore
      .collection(ATTACHMENTS_COL)
      .where('note_id', '==', noteId)
      .where('user_id', '==', userId)
      .orderBy('created_at', 'desc')
      .get();

    return snap.docs.map((doc) => doc.data());
  }

  /**
   * Actualiza metadata de un attachment
   */
  async updateAttachment(
    attachmentId: string,
    userId: string,
    dto: UpdateAttachmentDto,
    ipAddress: string,
  ): Promise<any> {
    const existing = await this.getAttachment(attachmentId, userId);

    const updates: Record<string, unknown> = {
      updated_at: this.firestore.serverTimestamp,
      'audit.last_updated_by': userId,
      'audit.last_updated_ip': ipAddress,
    };

    if (dto.name !== undefined) updates['name'] = dto.name;
    if (dto.alt_text !== undefined) updates['alt_text'] = dto.alt_text;
    if (dto.virus_scan_status !== undefined)
      updates['virus_scan_status'] = dto.virus_scan_status;
    if (dto.access_control !== undefined)
      updates['access_control'] = dto.access_control;
    if (dto.optimization !== undefined)
      updates['optimization'] = dto.optimization;

    await this.firestore.doc(ATTACHMENTS_COL, attachmentId).update(updates);

    const updated = await this.firestore.getDoc(ATTACHMENTS_COL, attachmentId);
    return updated.data();
  }

  /**
   * Elimina un attachment (soft delete + Storage cleanup)
   */
  async deleteAttachment(attachmentId: string, userId: string): Promise<void> {
    const attachment = await this.getAttachment(attachmentId, userId);
    const noteId = attachment['note_id'] as string;
    const storagePath = attachment['storage_path'] as string;

    // Eliminar de Firestore
    await this.firestore.doc(ATTACHMENTS_COL, attachmentId).delete();

    // Eliminar de Storage
    try {
      await this.storage.bucket().file(storagePath).delete();
      this.logger.log(`Storage file deleted: ${storagePath}`);
    } catch (error) {
      this.logger.error(`Failed to delete storage file ${storagePath}:`, error);
      // No fallamos la operación si no se puede eliminar el archivo
    }

    // Eliminar thumbnail si existe
    const thumbnailPath = attachment['thumbnail_path'] as string;
    if (thumbnailPath) {
      try {
        await this.storage.bucket().file(thumbnailPath).delete();
      } catch (error) {
        this.logger.error(
          `Failed to delete thumbnail ${thumbnailPath}:`,
          error,
        );
      }
    }

    // Actualizar summary en la nota
    await this.updateNoteAttachmentSummary(noteId, userId);

    // Actualizar cuota de storage del usuario
    const fileSize = attachment['size_bytes'] as number;
    await this.updateUserStorageQuota(userId, fileSize, 'remove');

    this.logger.log(`Attachment deleted: ${attachmentId} by user: ${userId}`);

    // Registrar auditoría
    await this.auditService.log(
      userId,
      'delete',
      'attachment',
      attachmentId,
      'unknown', // ipAddress no está disponible en este método
      'AttachmentsService/1.0',
      {
        before: {
          note_id: noteId,
          name: attachment['name'],
          size_bytes: fileSize,
          type: attachment['type'],
        },
      },
    );
  }

  /**
   * Obtiene URL de descarga firmada para un attachment
   */
  async getDownloadUrl(
    attachmentId: string,
    userId: string,
  ): Promise<{ url: string; expires: number }> {
    const attachment = await this.getAttachment(attachmentId, userId);
    const storagePath = attachment['storage_path'] as string;

    const fileRef = this.storage.bucket().file(storagePath);
    const [url] = await fileRef.getSignedUrl({
      action: 'read',
      expires: Date.now() + 24 * 60 * 60 * 1000, // 24 horas
    });

    return {
      url,
      expires: Date.now() + 24 * 60 * 60 * 1000,
    };
  }

  // ─────────────────────────────────────────────
  // Métodos privados
  // ─────────────────────────────────────────────

  private validateFile(file: any): void {
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    if (file.size > MAX_FILE_SIZE) {
      throw new BadRequestException(
        `File size exceeds limit of ${MAX_FILE_SIZE} bytes`,
      );
    }

    if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      throw new BadRequestException(`File type ${file.mimetype} not allowed`);
    }
  }

  private async checkUserQuota(
    userId: string,
    fileSize: number,
  ): Promise<void> {
    const userSnap = await this.firestore.getDoc('users', userId);
    if (!userSnap.exists) {
      throw new NotFoundException('User not found');
    }

    const userData = userSnap.data() as Record<string, unknown>;
    const quotas = userData['quotas'] as Record<string, unknown>;
    const currentUsage = (quotas['storage_used_bytes'] as number) || 0;

    if (currentUsage + fileSize > MAX_STORAGE_PER_USER) {
      throw new BadRequestException('Storage quota exceeded');
    }
  }

  private async validateNoteOwnership(
    noteId: string,
    userId: string,
  ): Promise<void> {
    const noteSnap = await this.firestore.getDoc('notes', noteId);
    if (!noteSnap.exists) {
      throw new NotFoundException(`Note ${noteId} not found`);
    }

    const noteData = noteSnap.data() as Record<string, unknown>;
    if (noteData['user_id'] !== userId) {
      throw new ForbiddenException('Access denied to this note');
    }
  }

  private getFileType(mimeType: string): string {
    if (mimeType.startsWith('image/')) return 'image';
    if (mimeType.startsWith('video/')) return 'video';
    if (mimeType.startsWith('audio/')) return 'audio';
    if (mimeType === 'application/pdf') return 'document';
    if (mimeType.startsWith('text/')) return 'document';
    return 'other';
  }

  private generateFileHash(buffer: Buffer): string {
    const crypto = require('crypto');
    return crypto.createHash('sha256').update(buffer).digest('hex');
  }

  private async generateThumbnail(
    fileRef: any,
  ): Promise<string | undefined> {
    try {
      // Para una implementación completa, usaríamos image processing library
      // Por ahora, devolvemos undefined
      // TODO: Implementar thumbnail generation con sharp o similar
      return undefined;
    } catch (error) {
      this.logger.error('Failed to generate thumbnail:', error);
      return undefined;
    }
  }

  private async extractMetadata(
    file: any,
    fileRef: any,
  ): Promise<Record<string, unknown>> {
    const metadata: Record<string, unknown> = {};

    // Extraer dimensiones para imágenes
    if (file.mimetype.startsWith('image/')) {
      try {
        // TODO: Implementar metadata extraction con sharp o similar
        metadata.dimensions = { width: 0, height: 0 };
      } catch (error) {
        this.logger.error('Failed to extract image dimensions:', error);
      }
    }

    // Extraer info para PDFs
    if (file.mimetype === 'application/pdf') {
      try {
        // TODO: Implementar PDF metadata extraction
        metadata.pdf_info = { page_count: 0 };
      } catch (error) {
        this.logger.error('Failed to extract PDF metadata:', error);
      }
    }

    // Extraer duración para audio/video
    if (
      file.mimetype.startsWith('audio/') ||
      file.mimetype.startsWith('video/')
    ) {
      try {
        // TODO: Implementar duration extraction
        metadata.duration_seconds = 0;
      } catch (error) {
        this.logger.error('Failed to extract media duration:', error);
      }
    }

    return metadata;
  }

  private async updateUserStorageQuota(
    userId: string,
    fileSize: number,
    operation: 'add' | 'remove',
  ): Promise<void> {
    try {
      const userRef = this.firestore.doc('users', userId);
      const increment = operation === 'add' ? fileSize : -fileSize;
      
      await userRef.update({
        'quotas.storage_used_bytes': this.firestore.increment(increment),
        'quotas.attachments_count': this.firestore.increment(operation === 'add' ? 1 : -1),
        updated_at: this.firestore.serverTimestamp,
      });
      
      this.logger.log(
        `User ${userId} storage quota ${operation === 'add' ? 'increased' : 'decreased'} by ${fileSize} bytes`,
      );
    } catch (error) {
      this.logger.error(`Failed to update user storage quota for ${userId}:`, error);
      // No fallamos la operación si no se puede actualizar la cuota
    }
  }

  private async updateNoteAttachmentSummary(
    noteId: string,
    userId: string,
  ): Promise<void> {
    const attachmentsSnap = await this.firestore
      .collection(ATTACHMENTS_COL)
      .where('note_id', '==', noteId)
      .where('user_id', '==', userId)
      .get();

    const attachments = attachmentsSnap.docs.map(
      (doc) => doc.data() as Record<string, unknown>,
    );

    let totalSize = 0;
    let hasImages = false;
    let hasDocuments = false;

    for (const attachment of attachments) {
      totalSize += attachment['size_bytes'] as number;
      const type = attachment['type'] as string;
      if (type === 'image') hasImages = true;
      if (type === 'document') hasDocuments = true;
    }

    const summary = {
      count: attachments.length,
      total_size_bytes: totalSize,
      has_images: hasImages,
      has_documents: hasDocuments,
    };

    await this.firestore.doc('notes', noteId).update({
      attachments_summary: summary,
      updated_at: this.firestore.serverTimestamp,
    });
  }
}
