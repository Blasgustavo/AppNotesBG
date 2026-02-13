import { Injectable, Logger } from '@nestjs/common';
import { isIP } from 'net';
import { FirestoreService } from '../core/firestore';
import type { CreateAuditLogDto } from './dto/create-audit-log.dto';

const AUDIT_LOGS_COL = 'audit_logs';

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(private readonly firestore: FirestoreService) {}

  /**
   * Valida y sanitiza la dirección IP
   * Acepta: IPv4, IPv6, o 'unknown' como sentinel
   */
  private validateIpAddress(ip: string): string {
    if (ip === 'unknown') {
      return ip;
    }
    // isIP returns 4 for IPv4, 6 for IPv6, 0 for invalid
    if (isIP(ip) === 0) {
      this.logger.warn(`Invalid IP address received: ${ip}, using 'unknown'`);
      return 'unknown';
    }
    return ip;
  }

  /**
   * Crea un registro de auditoría
   * Esta colección es solo escritura - no se permite modificación ni eliminación
   */
  async createAuditLog(dto: CreateAuditLogDto): Promise<void> {
    // Validar y sanitizar IP antes de guardar
    const sanitizedIp = this.validateIpAddress(dto.ip_address);

    const auditLog = {
      id: '',
      user_id: dto.user_id,
      action: dto.action,
      resource_type: dto.resource_type,
      resource_id: dto.resource_id,
      ip_address: sanitizedIp,
      user_agent: dto.user_agent,
      session_id: dto.session_id || null,
      timestamp: this.firestore.serverTimestamp,
      changes: dto.changes || null,
      security_context: dto.security_context || {
        success: true,
        error_code: null,
        rate_limited: false,
        suspicious_activity: false,
      },
    };

    try {
      const auditRef = this.firestore.collection(AUDIT_LOGS_COL).doc();
      auditLog.id = auditRef.id;
      
      await auditRef.set(auditLog);
      
      this.logger.debug(
        `Audit log created: ${dto.action} on ${dto.resource_type}:${dto.resource_id} by user:${dto.user_id}`,
      );
    } catch (error) {
      // C-5: Retry once after brief delay
      try {
        await new Promise(resolve => setTimeout(resolve, 100));
        const retryRef = this.firestore.collection(AUDIT_LOGS_COL).doc();
        auditLog.id = retryRef.id;
        await retryRef.set(auditLog);
        this.logger.log('Audit log created on retry');
      } catch (retryError) {
        // Fallback: log to stderr for critical compliance
        // eslint-disable-next-line no-console
        console.error(
          `[CRITICAL AUDIT FAILURE] ${new Date().toISOString()} - ` +
          `action=${dto.action} resource=${dto.resource_type}:${dto.resource_id} ` +
          `user=${dto.user_id} ip=${sanitizedIp} error=${retryError}`,
        );
        // Don't throw - primary operation should succeed even if audit fails
      }
    }
  }

  /**
   * Crea un registro de auditoría simplificado (para uso común)
   */
  async log(
    userId: string,
    action: CreateAuditLogDto['action'],
    resourceType: CreateAuditLogDto['resource_type'],
    resourceId: string,
    ipAddress: string,
    userAgent: string,
    changes?: CreateAuditLogDto['changes'],
  ): Promise<void> {
    await this.createAuditLog({
      user_id: userId,
      action,
      resource_type: resourceType,
      resource_id: resourceId,
      ip_address: ipAddress,
      user_agent: userAgent,
      changes,
    });
  }

  /**
   * Obtiene logs de auditoría para un usuario específico
   * Solo para administradores - los usuarios normales no tienen acceso
   */
  async findByUser(
    userId: string,
    limit: number = 100,
  ): Promise<FirebaseFirestore.DocumentData[]> {
    const snap = await this.firestore
      .collection(AUDIT_LOGS_COL)
      .where('user_id', '==', userId)
      .orderBy('timestamp', 'desc')
      .limit(limit)
      .get();

    return snap.docs.map((d) => d.data());
  }

  /**
   * Obtiene logs de auditoría para un recurso específico
   */
  async findByResource(
    resourceType: string,
    resourceId: string,
    limit: number = 100,
  ): Promise<FirebaseFirestore.DocumentData[]> {
    const snap = await this.firestore
      .collection(AUDIT_LOGS_COL)
      .where('resource_type', '==', resourceType)
      .where('resource_id', '==', resourceId)
      .orderBy('timestamp', 'desc')
      .limit(limit)
      .get();

    return snap.docs.map((d) => d.data());
  }

  /**
   * Obtiene logs de auditoría recientes
   */
  async findRecent(limit: number = 100): Promise<FirebaseFirestore.DocumentData[]> {
    const snap = await this.firestore
      .collection(AUDIT_LOGS_COL)
      .orderBy('timestamp', 'desc')
      .limit(limit)
      .get();

    return snap.docs.map((d) => d.data());
  }
}
