import { Injectable, Logger, ForbiddenException } from '@nestjs/common';
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
      try {
        await new Promise((resolve) => setTimeout(resolve, 100));
        const retryRef = this.firestore.collection(AUDIT_LOGS_COL).doc();
        auditLog.id = retryRef.id;
        await retryRef.set(auditLog);
        this.logger.log('Audit log created on retry');
      } catch (retryError) {
        console.error(
          `[CRITICAL AUDIT FAILURE] ${new Date().toISOString()} - ` +
            `action=${dto.action} resource=${dto.resource_type}:${dto.resource_id} ` +
            `user=${dto.user_id} ip=${sanitizedIp} error=${retryError}`,
        );
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
  async findRecent(
    limit: number = 100,
  ): Promise<FirebaseFirestore.DocumentData[]> {
    const snap = await this.firestore
      .collection(AUDIT_LOGS_COL)
      .orderBy('timestamp', 'desc')
      .limit(limit)
      .get();

    return snap.docs.map((d) => d.data());
  }

  /**
   * Exporta logs de auditoría para compliance
   * Formato: JSON o CSV
   */
  async exportLogs(
    userId: string | undefined,
    format: 'json' | 'csv' = 'json',
    limit?: number,
    startDate?: string,
    endDate?: string,
  ): Promise<any> {
    if (!userId) {
      throw new ForbiddenException('Access denied');
    }

    const adminEmails = ['admin@appnotesbg.com'];
    const isAdmin = adminEmails.includes(userId);

    let query: FirebaseFirestore.Query =
      this.firestore.collection(AUDIT_LOGS_COL);

    if (!isAdmin) {
      query = query.where('user_id', '==', userId);
    }

    if (startDate) {
      const startTimestamp = new Date(startDate);
      query = query.where('timestamp', '>=', startTimestamp);
    }

    if (endDate) {
      const endTimestamp = new Date(endDate);
      query = query.where('timestamp', '<=', endTimestamp);
    }

    query = query.orderBy('timestamp', 'desc');

    if (limit) {
      query = query.limit(Math.min(limit, 1000));
    }

    const snap = await query.get();
    const logs = snap.docs.map((d) => {
      const data = d.data();
      return {
        id: data['id'],
        user_id: data['user_id'],
        action: data['action'],
        resource_type: data['resource_type'],
        resource_id: data['resource_id'],
        ip_address: data['ip_address'],
        timestamp:
          data['timestamp']?.toDate?.()?.toISOString() || data['timestamp'],
        success: data['security_context']?.success,
      };
    });

    if (format === 'csv') {
      const header =
        'id,user_id,action,resource_type,resource_id,ip_address,timestamp,success\n';
      const rows = logs
        .map(
          (log: any) =>
            `${log.id},${log.user_id},${log.action},${log.resource_type},${log.resource_id},${log.ip_address},${log.timestamp},${log.success}`,
        )
        .join('\n');

      return {
        format: 'csv',
        data: header + rows,
        count: logs.length,
      };
    }

    return {
      format: 'json',
      data: logs,
      count: logs.length,
    };
  }
}
