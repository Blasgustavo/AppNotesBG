import { Injectable, Logger } from '@nestjs/common';
import * as admin from 'firebase-admin';
import { FirestoreService } from '../core/firestore';
import type { AuthMeResponseDto } from './dto/auth.dto';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(private readonly firestore: FirestoreService) {}

  /**
   * Crea o actualiza el documento del usuario en Firestore al hacer login.
   * Devuelve el perfil y si es un usuario nuevo.
   * M-9: Usa userRef.create() con manejo de conflicto para evitar race condition
   */
  async loginOrRegister(
    decodedToken: admin.auth.DecodedIdToken,
    ipAddress: string,
    userAgent: string,
  ): Promise<AuthMeResponseDto> {
    const uid = decodedToken.uid;
    const userRef = this.firestore.doc('users', uid);
    const userSnap = await userRef.get();

    const isNewUser = !userSnap.exists;
    const now = this.firestore.serverTimestamp;

    if (isNewUser) {
      const newUser = {
        id: uid,
        email: decodedToken.email ?? '',
        display_name: decodedToken.name ?? decodedToken.email ?? 'Usuario',
        avatar_url: decodedToken.picture ?? null,
        created_at: now,
        updated_at: now,
        status: 'active',
        last_login_at: now,
        login_count: 1,
        email_verified: decodedToken.email_verified ?? false,
        preferences: {
          language: 'es',
          timezone: 'America/New_York',
          auto_save_interval: 30000,
          export_format: 'pdf',
          theme_id: null,
        },
        security: {
          failed_attempts: 0,
          last_failed_at: null,
          two_factor_enabled: false,
          session_timeout: 3600,
        },
        quotas: {
          storage_used_bytes: 0,
          storage_limit_bytes: 524288000,
          notes_count: 0,
          attachments_count: 0,
        },
        audit: {
          created_ip: ipAddress,
          last_updated_by: 'system',
          last_updated_ip: ipAddress,
        },
      };

      // M-9: Usar create() en lugar de set() para evitar race condition
      // Si el documento ya existe, fallará y we'll handle it gracefully
      try {
        await userRef.create(newUser);
        await this.createDefaultNotebook(uid, now);
        this.logger.log(`Nuevo usuario registrado: ${uid}`);
      } catch (createError: any) {
        // Si falla por conflicto (otro request creó el usuario), obtener datos existentes
        if (createError.code === 6 || createError.message?.includes('already exists')) {
          this.logger.warn(`Usuario ${uid} ya existe (race condition resuelta)`);
          // Re-obtener datos del usuario
          const existingUserSnap = await userRef.get();
          if (existingUserSnap.exists) {
            const existingData = existingUserSnap.data();
            // Actualizar login del usuario existente
            await userRef.update({
              last_login_at: now,
              login_count: this.firestore.increment(1),
              email_verified: decodedToken.email_verified ?? false,
              avatar_url: decodedToken.picture ?? existingData?.avatar_url ?? null,
              updated_at: now,
            });
            return {
              id: uid,
              email: existingData?.email ?? '',
              display_name: existingData?.display_name ?? 'Usuario',
              avatar_url: existingData?.avatar_url ?? null,
              is_new_user: false,
            };
          }
        }
        throw createError;
      }
    } else {
      await userRef.update({
        last_login_at: now,
        login_count: this.firestore.increment(1),
        email_verified: decodedToken.email_verified ?? false,
        avatar_url: decodedToken.picture ?? userSnap.data()?.avatar_url ?? null,
        'audit.last_updated_by': uid,
        'audit.last_updated_ip': ipAddress,
        updated_at: now,
      });
    }

    return {
      id: uid,
      email: decodedToken.email ?? '',
      display_name: decodedToken.name ?? decodedToken.email ?? 'Usuario',
      avatar_url: decodedToken.picture ?? null,
      is_new_user: isNewUser,
    };
  }

  private async createDefaultNotebook(
    uid: string,
    now: admin.firestore.FieldValue,
  ): Promise<void> {
    const notebookRef = this.firestore.collection('notebooks').doc();
    await notebookRef.set({
      id: notebookRef.id,
      user_id: uid,
      name: 'Mi libreta',
      icon: 'book',
      color: '#2196F3',
      parent_notebook_id: null,
      created_at: now,
      updated_at: now,
      is_default: true,
      is_favorite: false,
      sort_order: 0,
      note_count: 0,
      sharing: {
        share_token: null,
        share_permissions: 'none',
        public_access_expires: null,
      },
      collaboration_mode: 'private',
      audit: {
        created_ip: 'system',
        last_updated_by: uid,
        last_updated_ip: 'system',
      },
    });

    this.logger.log(`Libreta por defecto creada para usuario: ${uid}`);
  }
}
