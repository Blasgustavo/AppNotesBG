import { Inject, Injectable, Logger } from '@nestjs/common';
import * as admin from 'firebase-admin';
import { FIREBASE_ADMIN } from '../core/firebase';
import type { AuthMeResponseDto } from './dto/auth.dto';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @Inject(FIREBASE_ADMIN) private readonly firebaseApp: admin.app.App,
  ) {}

  private get db(): admin.firestore.Firestore {
    return this.firebaseApp.firestore();
  }

  /**
   * Crea o actualiza el documento del usuario en Firestore al hacer login.
   * Devuelve el perfil y si es un usuario nuevo.
   */
  async loginOrRegister(
    decodedToken: admin.auth.DecodedIdToken,
    ipAddress: string,
  ): Promise<AuthMeResponseDto> {
    const uid = decodedToken.uid;
    const userRef = this.db.collection('users').doc(uid);
    const userSnap = await userRef.get();

    const isNewUser = !userSnap.exists;
    const now = admin.firestore.FieldValue.serverTimestamp();

    if (isNewUser) {
      // Primer login — crear perfil completo
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
          storage_limit_bytes: 524288000, // 500MB
          notes_count: 0,
          attachments_count: 0,
        },
        audit: {
          created_ip: ipAddress,
          last_updated_by: 'system',
          last_updated_ip: ipAddress,
        },
      };

      await userRef.set(newUser);
      await this.createDefaultNotebook(uid, now);

      this.logger.log(`Nuevo usuario registrado: ${uid}`);
    } else {
      // Login recurrente — actualizar datos de sesión
      await userRef.update({
        last_login_at: now,
        login_count: admin.firestore.FieldValue.increment(1),
        email_verified: decodedToken.email_verified ?? false,
        // Actualizar avatar por si cambió en Google
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

  /**
   * Crea la libreta por defecto al registrarse un usuario nuevo.
   */
  private async createDefaultNotebook(
    uid: string,
    now: admin.firestore.FieldValue,
  ): Promise<void> {
    const notebookRef = this.db.collection('notebooks').doc();
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
