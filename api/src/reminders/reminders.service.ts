import {
  Injectable,
  Inject,
  Logger,
  NotFoundException,
  BadRequestException,
  ConflictException,
  InternalServerErrorException,
} from '@nestjs/common';
import { FirestoreService } from '../core/firestore';
import { FIREBASE_ADMIN } from '../core/firebase';
import * as admin from 'firebase-admin';

const REMINDERS_COL = 'reminders';
const MAX_REMINDERS_PER_USER = 50;
const REMINDER_TTL = 7 * 24 * 60 * 60 * 1000; // 7 días en milisegundos

@Injectable()
export class RemindersService {
  private readonly logger = new Logger(RemindersService.name);

  constructor(
    @Inject(FIREBASE_ADMIN) private readonly firebaseApp: admin.app.App,
    private readonly firestore: FirestoreService,
  ) {}

  /**
   * Lista recordatorios del usuario con filtros
   */
  async findAll(userId: string) {
    const snap = await this.firestore
      .collection(REMINDERS_COL)
      .where('user_id', '==', userId)
      .orderBy('reminder_at', 'asc')
      .get();

    return snap.docs.map((doc) => doc.data());
  }

  /**
   * Obtiene un recordatorio específico (incluye expirados — para operaciones de lectura)
   * Verifica ownership pero NO lanza error si el recordatorio está expirado,
   * para permitir eliminar/actualizar recordatorios pasados.
   */
  async findOne(reminderId: string, userId: string) {
    const snap = await this.firestore.getDoc(REMINDERS_COL, reminderId);
    if (!snap.exists) {
      throw new NotFoundException(`Reminder ${reminderId} not found`);
    }

    const data = snap.data() as Record<string, unknown>;

    // Verificar ownership — usar NotFoundException para no revelar existencia del recurso
    if (data['user_id'] !== userId) {
      throw new NotFoundException(`Reminder ${reminderId} not found`);
    }

    return data;
  }

  /**
   * Obtiene un recordatorio solo si está activo (no expirado, no enviado)
   * Usar para crear nuevos recordatorios o verificar validez antes de acciones que requieren estado activo
   */
  async findOneActive(reminderId: string, userId: string) {
    const data = await this.findOne(reminderId, userId);

    const reminderAtTimestamp = data['reminder_at'] as
      | FirebaseFirestore.Timestamp
      | undefined;
    const reminderAt = reminderAtTimestamp?.toDate();
    if (reminderAt && reminderAt < new Date()) {
      throw new BadRequestException('Reminder has already expired');
    }

    return data;
  }

  /**
   * Crea un nuevo recordatorio
   */
  async create(
    userId: string,
    noteId: string,
    reminderData: any,
    ipAddress: string,
  ) {
    // Verificar límite de recordatorios
    const remindersSnap = await this.firestore
      .collection(REMINDERS_COL)
      .where('user_id', '==', userId)
      .get();

    const remindersCount = remindersSnap.size;
    if (remindersCount >= MAX_REMINDERS_PER_USER) {
      throw new BadRequestException(
        `Maximum ${MAX_REMINDERS_PER_USER} reminders per user allowed`,
      );
    }

    // Verificar que la nota existe y pertenece al usuario
    const noteSnap = await this.firestore.getDoc('notes', noteId);
    if (!noteSnap.exists) {
      throw new NotFoundException(`Note ${noteId} not found`);
    }

    const noteData = noteSnap.data() as Record<string, unknown>;
    if (noteData['user_id'] !== userId) {
      // Usar NotFoundException para no revelar existencia de recursos de otros usuarios
      throw new NotFoundException(`Note ${noteId} not found`);
    }

    // Validar que la fecha del recordatorio sea futura
    const reminderAt = new Date(reminderData.reminder_at);
    const now = new Date();
    if (reminderAt <= now) {
      throw new BadRequestException('Reminder date must be in the future');
    }

    // Validar mensaje y opciones
    if (!reminderData.message || reminderData.message.trim().length === 0) {
      throw new BadRequestException('Reminder message is required');
    }

    // Verificar que no exista un recordatorio duplicado
    const existingReminderSnap = await this.firestore
      .collection(REMINDERS_COL)
      .where('user_id', '==', userId)
      .where('note_id', '==', noteId)
      .where('reminder_at', '==', reminderData.reminder_at)
      .get();

    if (!existingReminderSnap.empty) {
      throw new ConflictException(
        'A reminder already exists for this date and time',
      );
    }

    const nowTimestamp = this.firestore.serverTimestamp;
    const reminderDocument = {
      id: this.firestore.generateId(),
      user_id: userId,
      note_id: noteId,
      reminder_at: this.firestore.timestampFromDate(reminderAt),
      message: reminderData.message,
      is_sent: false,
      is_expired: false,
      method: reminderData.method || 'popup',
      repeat_type: reminderData.repeat_type || 'once',
      repeat_interval_days: reminderData.repeat_interval_days || null,
      repeat_count: reminderData.repeat_count || 1,
      repeat_count_completed: reminderData.repeat_count_completed || 0,
      next_reminder_at: this.calculateNextReminder(reminderAt, reminderData),
      audit: {
        created_ip: ipAddress,
        last_updated_by: userId,
        last_updated_ip: ipAddress,
      },
      created_at: nowTimestamp,
      updated_at: nowTimestamp,
    };

    const reminderRef = this.firestore
      .collection(REMINDERS_COL)
      .doc(reminderDocument.id);
    await reminderRef.set(reminderDocument);

    // Configurar el Cloud Function para enviar notificación
    await this.scheduleNotification(
      reminderDocument.id,
      reminderAt,
      reminderData.message,
    );

    this.logger.log(
      `Reminder created: ${reminderDocument.id} for note: ${noteId} by user: ${userId}`,
    );

    const created = await reminderRef.get();
    return created.data();
  }

  /**
   * Actualiza un recordatorio existente
   * Soporta actualizar recordatorios expirados (ej: reactivar con nueva fecha)
   */
  async update(
    reminderId: string,
    userId: string,
    updateData: any,
    ipAddress: string,
  ) {
    // findOne verifica ownership y existencia — permite expirados para actualizaciones
    const existing = await this.findOne(reminderId, userId);

    // Si se está proporcionando una nueva fecha, debe ser futura
    const existingReminderAt = (
      existing['reminder_at'] as FirebaseFirestore.Timestamp
    )?.toDate();
    const nextReminderAt = updateData.reminder_at
      ? new Date(updateData.reminder_at)
      : existingReminderAt || new Date();

    // Solo validar fecha futura si se está cambiando la fecha
    if (updateData.reminder_at !== undefined && nextReminderAt <= new Date()) {
      throw new BadRequestException('Reminder date must be in the future');
    }

    const updates: Record<string, unknown> = {
      updated_at: this.firestore.serverTimestamp,
      'audit.last_updated_by': userId,
      'audit.last_updated_ip': ipAddress,
    };

    if (updateData.message !== undefined)
      updates['message'] = updateData.message.trim();
    if (updateData.method !== undefined) updates['method'] = updateData.method;
    if (updateData.repeat_type !== undefined)
      updates['repeat_type'] = updateData.repeat_type;
    if (updateData.repeat_interval_days !== undefined)
      updates['repeat_interval_days'] = updateData.repeat_interval_days;
    if (updateData.repeat_count !== undefined)
      updates['repeat_count'] = updateData.repeat_count;

    // Si la fecha del recordatorio cambió, recalcular siguiente
    if (updateData.reminder_at !== undefined) {
      updates['reminder_at'] = this.firestore.timestampFromDate(nextReminderAt);
      updates['next_reminder_at'] = this.calculateNextReminder(
        nextReminderAt,
        updateData,
      );
      // Solo resetear is_sent cuando cambia la fecha del recordatorio
      updates['is_sent'] = false;
    }
    // NOTA: No reseteamos is_sent si solo se actualiza el mensaje u otros campos

    await this.firestore.doc(REMINDERS_COL, reminderId).update(updates);

    // Re-programar notificación si es necesario
    if (updateData.reminder_at !== undefined) {
      const updated = await this.firestore.getDoc(REMINDERS_COL, reminderId);
      const updatedData = updated.data() as Record<string, unknown>;
      const reminderAtValue = updatedData[
        'reminder_at'
      ] as FirebaseFirestore.Timestamp;
      await this.scheduleNotification(
        updated.id,
        reminderAtValue.toDate(),
        updateData.message as string,
      );
    }

    const updated = await this.firestore.getDoc(REMINDERS_COL, reminderId);
    this.logger.log(`Reminder updated: ${reminderId} by user: ${userId}`);

    return updated.data();
  }

  /**
   * Elimina un recordatorio (incluyendo expirados)
   */
  async remove(reminderId: string, userId: string) {
    // findOne verifica ownership y existencia — permite expirados para eliminación
    const existing = await this.findOne(reminderId, userId);

    if (existing['is_sent'] && existing['repeat_type'] === 'once') {
      throw new BadRequestException(
        'Cannot delete a one-time reminder that has already been sent',
      );
    }

    // Cancelar notificación programada
    await this.cancelNotification(reminderId);

    await this.firestore.doc(REMINDERS_COL, reminderId).delete();

    this.logger.log(`Reminder deleted: ${reminderId} by user: ${userId}`);
  }

  /**
   * Marca un recordatorio como enviado y programa el siguiente si es recurrente
   */
  async markAsSent(reminderId: string, userId: string) {
    // Para marcar como enviado: verificar ownership pero permitir si ya expiró
    const existing =
      userId === 'system'
        ? await this.findOneBySystem(reminderId)
        : await this.findOne(reminderId, userId);

    if (existing['is_sent'] && existing['repeat_type'] === 'once') {
      throw new BadRequestException('Reminder is already marked as sent');
    }

    const nowTimestamp = this.firestore.serverTimestamp;
    const updates: Record<string, unknown> = {
      is_sent: true,
      sent_at: nowTimestamp,
      'audit.last_updated_by': userId,
      'audit.last_updated_ip': 'system',
    };

    // Si es recurrente, programar siguiente recordatorio
    const nextReminderAtTimestamp = existing['next_reminder_at'] as
      | FirebaseFirestore.Timestamp
      | undefined;
    if (existing['repeat_type'] !== 'once' && nextReminderAtTimestamp) {
      const nextReminderDate = nextReminderAtTimestamp.toDate();
      updates['is_sent'] = false; // Reset para nuevo envío
      updates['next_reminder_at'] = this.calculateNextReminder(
        nextReminderDate,
        existing,
      );
      const repeatCountCompleted =
        (existing['repeat_count_completed'] as number) || 0;
      updates['repeat_count_completed'] = repeatCountCompleted + 1;
      updates['reminder_at'] =
        this.firestore.timestampFromDate(nextReminderDate);

      // Programar siguiente notificación
      await this.scheduleNotification(
        reminderId,
        nextReminderDate,
        existing['message'] as string,
      );
    }

    await this.firestore.doc(REMINDERS_COL, reminderId).update(updates);

    this.logger.log(
      `Reminder marked as sent: ${reminderId} by user: ${userId}`,
    );
  }

  /**
   * Obtiene un recordatorio sin verificar ownership (uso interno/sistema únicamente)
   * NO usar desde endpoints de usuario — solo para Cloud Functions y tareas programadas
   */
  private async findOneBySystem(
    reminderId: string,
  ): Promise<Record<string, unknown>> {
    const snap = await this.firestore.getDoc(REMINDERS_COL, reminderId);
    if (!snap.exists) {
      throw new NotFoundException(`Reminder ${reminderId} not found`);
    }
    return snap.data() as Record<string, unknown>;
  }

  /**
   * Obtiene recordatorios expirados
   * H-5 FIX: Usar Timestamp.now() en lugar de serverTimestamp en queries
   */
  async findExpired(userId: string) {
    const now = admin.firestore.Timestamp.now();
    const snap = await this.firestore
      .collection(REMINDERS_COL)
      .where('user_id', '==', userId)
      .where('reminder_at', '<=', now)
      .where('is_sent', '==', false)
      .limit(20)
      .get();

    return snap.docs.map((doc) => ({
      ...doc.data(),
      id: doc.id,
    }));
  }

  /**
   * Obtiene recordatorios pendientes de un usuario específico
   * NOTA: Este método es seguro — siempre filtra por userId
   * H-5 FIX: Usar Timestamp.now() en lugar de serverTimestamp en queries
   */
  async findPendingByUser(userId: string) {
    const now = admin.firestore.Timestamp.now();
    const snap = await this.firestore
      .collection(REMINDERS_COL)
      .where('user_id', '==', userId)
      .where('reminder_at', '<=', now)
      .where('is_sent', '==', false)
      .limit(50)
      .get();

    return snap.docs.map((doc) => ({
      ...doc.data(),
      id: doc.id,
    }));
  }

  /**
   * Obtiene recordatorios que necesitan ser procesados (uso interno/Cloud Functions únicamente)
   * ADVERTENCIA: Este método retorna datos de TODOS los usuarios.
   * NO exponer en endpoints públicos — usar solo desde Cloud Functions o tareas programadas.
   * H-5 FIX: Usar Timestamp.now() en lugar de serverTimestamp en queries
   */
  async findPendingNotifications() {
    const now = admin.firestore.Timestamp.now();
    const snap = await this.firestore
      .collection(REMINDERS_COL)
      .where('reminder_at', '<=', now)
      .where('is_sent', '==', false)
      .limit(100)
      .get();

    return snap.docs.map((doc) => ({
      ...doc.data(),
      id: doc.id,
    }));
  }

  /**
   * Programar notificación push via FCM
   */
  private async scheduleNotification(
    reminderId: string,
    reminderAt: Date,
    message: string,
  ) {
    try {
      // Obtener la nota asociada para obtener información del usuario
      const reminderSnap = await this.firestore.getDoc(
        REMINDERS_COL,
        reminderId,
      );
      const reminderData = reminderSnap.data() as Record<string, unknown>;
      const noteId = reminderData['note_id'] as string;

      const noteSnap = await this.firestore.getDoc('notes', noteId);
      if (noteSnap.exists) {
        const noteData = noteSnap.data() as Record<string, unknown>;
        const user = noteData['user_id'] as string;

        // Obtener FCM token del usuario (guardado en el login)
        const userSnap = await this.firestore.doc('users', user).get();
        const userData = userSnap.data() as Record<string, unknown>;
        const fcmToken = userData['fcm_token'] as string;

        if (fcmToken) {
          // Usar la API moderna de FCM (send en lugar de sendToDevice)
          const messagePayload: admin.messaging.Message = {
            token: fcmToken,
            notification: {
              title: 'Reminder: AppNotesBG',
              body: message,
            },
            data: {
              note_id: noteId,
              reminder_id: reminderId,
              click_action: 'OPEN_NOTE',
            },
          };

          await this.firebaseApp.messaging().send(messagePayload);
          this.logger.log(
            `FCM notification scheduled: ${reminderId} for user: ${user}`,
          );
        }
      }
    } catch (error) {
      this.logger.error(
        `Failed to schedule FCM notification for reminder ${reminderId}:`,
        error,
      );
    }
  }

  /**
   * Cancela notificación programada
   */
  private async cancelNotification(reminderId: string) {
    try {
      const reminderSnap = await this.firestore.getDoc(
        REMINDERS_COL,
        reminderId,
      );
      const reminderData = reminderSnap.data() as Record<string, unknown>;
      const noteId = reminderData['note_id'] as string;

      const noteSnap = await this.firestore.getDoc('notes', noteId);
      if (noteSnap.exists) {
        const noteData = noteSnap.data() as Record<string, unknown>;
        const user = noteData['user_id'] as string;

        // Obtener FCM token del usuario
        const userSnap = await this.firestore.doc('users', user).get();
        const userData = userSnap.data() as Record<string, unknown>;
        const fcmToken = userData['fcm_token'] as string;

        if (fcmToken) {
          const messagePayload: admin.messaging.Message = {
            token: fcmToken,
            notification: {
              title: 'Reminder Cancelled',
              body: 'Your reminder has been cancelled',
            },
          };

          await this.firebaseApp.messaging().send(messagePayload);
          this.logger.log(
            `FCM notification cancelled: ${reminderId} for user: ${user}`,
          );
        }
      }
    } catch (error) {
      this.logger.error(
        `Failed to cancel FCM notification for reminder ${reminderId}:`,
        error,
      );
    }
  }

  /**
   * Calcula la fecha del siguiente recordatorio recurrente
   */
  private calculateNextReminder(
    currentReminderAt: Date,
    reminderData: any,
  ): Date | null {
    const { repeat_type, repeat_interval_days, repeat_count } = reminderData;

    if (repeat_type === 'once') {
      return null;
    }

    const next = new Date(currentReminderAt);

    switch (repeat_type) {
      case 'daily':
        next.setDate(next.getDate() + 1);
        break;
      case 'weekly':
        next.setDate(next.getDate() + 7);
        break;
      case 'monthly':
        next.setMonth(next.getMonth() + 1);
        break;
      case 'yearly':
        next.setFullYear(next.getFullYear() + 1);
        break;
      case 'custom':
        if (repeat_interval_days && repeat_interval_days > 0) {
          next.setDate(next.getDate() + repeat_interval_days);
        }
        break;
    }

    return next;
  }

  /**
   * Ejecuta recordatorios expirados
   * H-6 FIX: Usar findPendingNotifications() en lugar de findExpired('system')
   * que siempre retornaba cero resultados
   */
  async processExpiredReminders() {
    const pendingReminders = await this.findPendingNotifications();

    for (const reminder of pendingReminders) {
      this.logger.log(`Processing expired reminder: ${reminder.id}`);

      // Marcar como expirado
      await this.firestore.doc(REMINDERS_COL, reminder.id).update({
        is_expired: true,
        updated_at: this.firestore.serverTimestamp,
        'audit.last_updated_by': 'system',
        'audit.last_updated_ip': 'system',
      });

      // Enviar notificación al usuario (opcional)
      const reminderData = reminder as Record<string, any>;
      if (reminderData['note_id']) {
        try {
          const noteSnap = await this.firestore.getDoc(
            'notes',
            reminderData['note_id'] as string,
          );
          if (noteSnap.exists) {
            const noteData = noteSnap.data() as Record<string, unknown>;
            const user = noteData['user_id'] as string;

            const userSnap = await this.firestore.doc('users', user).get();
            const userData = userSnap.data() as Record<string, unknown>;
            const fcmToken = userData['fcm_token'] as string;

            if (fcmToken) {
              const messagePayload: admin.messaging.Message = {
                token: fcmToken,
                notification: {
                  title: 'Reminder Expired',
                  body: `Your reminder "${reminderData['message']}" has expired`,
                },
                data: {
                  click_action: 'OPEN_NOTE',
                },
              };

              await this.firebaseApp.messaging().send(messagePayload);
            }
          }
        } catch (error) {
          this.logger.error(`Failed to send expiration notification:`, error);
        }
      }
    }
  }

  /**
   * Verifica y procesa recordatorios pendientes
   */
  async processPendingReminders() {
    const pending = await this.findPendingNotifications();

    for (const reminder of pending) {
      const reminderData = reminder as Record<string, any>;
      const reminderAt = reminderData['reminder_at']?.toDate();
      if (reminderAt && reminderAt <= new Date()) {
        this.logger.log(`Processing reminder: ${reminderData['id']}`);

        try {
          // Enviar notificación push
          await this.scheduleNotification(
            reminderData['id'],
            reminderAt,
            reminderData['message'],
          );

          // Marcar como enviado
          await this.markAsSent(reminderData['id'], 'system');

          this.logger.log(`Reminder processed: ${reminderData['id']}`);
        } catch (error) {
          this.logger.error(
            `Failed to process reminder ${reminderData['id']}:`,
            error,
          );
        }
      }
    }
  }

  /**
   * Actualiza preferencias de notificación del usuario (stub)
   */
  async updatePreferences(userId: string, preferences: any): Promise<void> {
    this.logger.log(
      `Updating preferences for user ${userId}: ${JSON.stringify(preferences)}`,
    );
    // TODO: Implementar actualización de preferencias
  }

  /**
   * Obtiene estadísticas de recordatorios del usuario (stub)
   */
  async getStats(userId: string): Promise<any> {
    this.logger.log(`Getting stats for user ${userId}`);
    // TODO: Implementar estadísticas
    return {
      total: 0,
      pending: 0,
      sent: 0,
      expired: 0,
    };
  }
}
