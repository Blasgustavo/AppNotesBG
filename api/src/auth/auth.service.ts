import {
  Injectable,
  Logger,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import * as admin from 'firebase-admin';
import { FirestoreService } from '../core/firestore';
import type {
  AuthMeResponseDto,
  AuthRefreshResponseDto,
  SessionInfoDto,
} from './dto/auth.dto';

const SESSIONS_COL = 'sessions';
const MAX_CONCURRENT_SESSIONS = 5;
const SESSION_EXPIRY_DAYS = 30;

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

      try {
        await userRef.create(newUser);
        await this.createDefaultNotebook(uid, now);
        this.logger.log(`Nuevo usuario registrado: ${uid}`);
      } catch (createError: any) {
        if (
          createError.code === 6 ||
          createError.message?.includes('already exists')
        ) {
          this.logger.warn(
            `Usuario ${uid} ya existe (race condition resuelta)`,
          );
          const existingUserSnap = await userRef.get();
          if (existingUserSnap.exists) {
            const existingData = existingUserSnap.data();
            await userRef.update({
              last_login_at: now,
              login_count: this.firestore.increment(1),
              email_verified: decodedToken.email_verified ?? false,
              avatar_url:
                decodedToken.picture ?? existingData?.avatar_url ?? null,
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

  /**
   * Refresca el token de sesión y crea una nueva sesión con rotación.
   * Genera un nuevo session_id y refresh_token.
   */
  async refreshSession(
    decodedToken: admin.auth.DecodedIdToken,
    refreshToken: string,
    ipAddress: string,
    userAgent: string,
  ): Promise<AuthRefreshResponseDto> {
    const uid = decodedToken.uid;
    const now = new Date();
    const expiresAt = new Date(
      now.getTime() + SESSION_EXPIRY_DAYS * 24 * 60 * 60 * 1000,
    );

    const sessionId = this.generateSessionId();
    const newRefreshToken = this.generateRefreshToken();

    const sessionData = {
      id: sessionId,
      user_id: uid,
      refresh_token_hash: this.hashToken(refreshToken),
      created_at: this.firestore.timestampFromDate(now),
      expires_at: this.firestore.timestampFromDate(expiresAt),
      device_info: userAgent,
      ip_address: ipAddress,
      is_active: true,
      last_used_at: this.firestore.timestampFromDate(now),
    };

    await this.firestore
      .collection(SESSIONS_COL)
      .doc(sessionId)
      .set(sessionData);

    const customToken = await this.generateCustomToken(uid, sessionId);

    this.logger.log(`Session refreshed for user ${uid}, session: ${sessionId}`);

    return {
      access_token: customToken,
      refresh_token: newRefreshToken,
      expires_in: SESSION_EXPIRY_DAYS * 24 * 60 * 60,
    };
  }

  /**
   * Revoca una sesión específica o todas las sesiones del usuario.
   * Si session_id no se proporciona, revoca todas las sesiones.
   */
  async revokeSession(
    uid: string,
    sessionId: string | undefined,
    ipAddress: string,
  ): Promise<void> {
    if (sessionId) {
      const sessionRef = this.firestore.doc(SESSIONS_COL, sessionId);
      const sessionSnap = await sessionRef.get();

      if (!sessionSnap.exists) {
        throw new BadRequestException('Sesión no encontrada');
      }

      const sessionData = sessionSnap.data() as Record<string, unknown>;
      if (sessionData['user_id'] !== uid) {
        throw new UnauthorizedException('No tienes acceso a esta sesión');
      }

      await sessionRef.update({
        is_active: false,
        revoked_at: this.firestore.serverTimestamp,
        revoked_ip: ipAddress,
      });

      this.logger.log(`Session ${sessionId} revoked for user ${uid}`);
    } else {
      const snap = await this.firestore
        .collection(SESSIONS_COL)
        .where('user_id', '==', uid)
        .where('is_active', '==', true)
        .get();

      const batch = this.firestore.batch();
      for (const doc of snap.docs) {
        batch.update(doc.ref, {
          is_active: false,
          revoked_at: this.firestore.serverTimestamp,
          revoked_ip: ipAddress,
        });
      }
      await batch.commit();

      this.logger.log(`All sessions revoked for user ${uid}`);
    }
  }

  /**
   * Lista las sesiones activas del usuario.
   * No devuelve el refresh_token por seguridad.
   */
  async getActiveSessions(uid: string): Promise<SessionInfoDto[]> {
    const snap = await this.firestore
      .collection(SESSIONS_COL)
      .where('user_id', '==', uid)
      .where('is_active', '==', true)
      .orderBy('created_at', 'desc')
      .limit(MAX_CONCURRENT_SESSIONS)
      .get();

    const currentSessionId = await this.getCurrentSessionId(uid);

    return snap.docs.map((doc) => {
      const data = doc.data();
      return {
        session_id: data['id'] as string,
        created_at: (data['created_at'] as admin.firestore.Timestamp).toDate(),
        expires_at: (data['expires_at'] as admin.firestore.Timestamp).toDate(),
        device_info: data['device_info'] as string,
        ip_address: data['ip_address'] as string,
        is_current: data['id'] === currentSessionId,
      };
    });
  }

  /**
   * Obtiene el ID de sesión actual del usuario desde Firestore.
   * Este método debería integrarse con el token JWT.
   */
  private async getCurrentSessionId(uid: string): Promise<string | null> {
    const snap = await this.firestore
      .collection(SESSIONS_COL)
      .where('user_id', '==', uid)
      .where('is_active', '==', true)
      .orderBy('last_used_at', 'desc')
      .limit(1)
      .get();

    if (snap.empty) return null;
    return snap.docs[0].id;
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
  }

  private generateRefreshToken(): string {
    return `rt_${Date.now()}_${Math.random().toString(36).substring(2, 15)}${Math.random().toString(36).substring(2, 15)}`;
  }

  private hashToken(token: string): string {
    const crypto = require('crypto');
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  private async generateCustomToken(
    uid: string,
    sessionId: string,
  ): Promise<string> {
    const additionalClaims = {
      session_id: sessionId,
    };
    return admin.auth().createCustomToken(uid, additionalClaims);
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
