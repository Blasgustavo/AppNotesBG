import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

admin.initializeApp();

const db = admin.firestore();
const storage = admin.storage();

export const cleanupOrphanedAttachments = functions.pubsub
  .schedule('every 24 hours')
  .onRun(async (context) => {
    functions.logger.info('Starting cleanup of orphaned attachments');

    const attachmentsSnap = await db
      .collection('attachments')
      .where('created_at', '<', admin.firestore.Timestamp.fromDate(
        new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
      ))
      .get();

    let deletedCount = 0;
    const errors: string[] = [];

    for (const doc of attachmentsSnap.docs) {
      const data = doc.data();
      
      if (!data.note_id) {
        try {
          await doc.ref.delete();
          deletedCount++;
          
          if (data.storage_path) {
            try {
              await storage.bucket().file(data.storage_path).delete();
            } catch (e) {
              errors.push(`Failed to delete storage file: ${data.storage_path}`);
            }
          }
        } catch (e) {
          errors.push(`Failed to delete attachment doc: ${doc.id}`);
        }
      }
    }

    functions.logger.info(`Cleanup completed. Deleted ${deletedCount} orphaned attachments`);
    if (errors.length > 0) {
      functions.logger.warn(`Encountered ${errors.length} errors during cleanup`);
    }

    return null;
  });

export const processReminders = functions.pubsub
  .schedule('every 5 minutes')
  .onRun(async (context) => {
    functions.logger.info('Processing pending reminders');

    const now = admin.firestore.Timestamp.now();
    const remindersSnap = await db
      .collection('notes')
      .where('reminder_at', '<=', now)
      .where('reminder_sent', '==', false)
      .limit(100)
      .get();

    let processedCount = 0;

    for (const doc of remindersSnap.docs) {
      const data = doc.data();
      
      try {
        await doc.ref.update({
          reminder_sent: true,
          reminder_processed_at: admin.firestore.FieldValue.serverTimestamp(),
        });

        await db.collection('notifications').add({
          user_id: data.user_id,
          note_id: doc.id,
          type: 'reminder',
          title: `Recordatorio: ${data.title}`,
          created_at: admin.firestore.FieldValue.serverTimestamp(),
          read: false,
        });

        processedCount++;
      } catch (e) {
        functions.logger.error(`Failed to process reminder for note ${doc.id}:`, e);
      }
    }

    functions.logger.info(`Processed ${processedCount} reminders`);
    return null;
  });

export const syncAlgoliaIndex = functions.firestore
  .document('notes/{noteId}')
  .onWrite(async (change, context) => {
    const noteId = context.params.noteId;
    const before = change.before.exists ? change.before.data() : null;
    const after = change.after.exists ? change.after.data() : null;

    if (!after) {
      functions.logger.info(`Note ${noteId} deleted, removing from Algolia`);
      return null;
    }

    const indexName = 'notes_dev';
    
    functions.logger.info(`Syncing note ${noteId} to Algolia index ${indexName}`);
    
    return null;
  });

export const detectAnomalies = functions.firestore
  .document('audit_logs/{logId}')
  .onCreate(async (snap, context) => {
    const log = snap.data();
    
    if (!log) return null;

    const suspiciousPatterns = [
      log.action === 'delete' && log.resource_type === 'note',
      log.changes?.before?.title && !log.changes?.after?.title,
      log.ip_address === 'unknown',
    ];

    const isSuspicious = suspiciousPatterns.some(Boolean);

    if (isSuspicious) {
      functions.logger.warn('Suspicious activity detected:', {
        userId: log.user_id,
        action: log.action,
        resourceType: log.resource_type,
        resourceId: log.resource_id,
        ipAddress: log.ip_address,
      });

      await db.collection('security_alerts').add({
        type: 'suspicious_activity',
        user_id: log.user_id,
        log_id: snap.id,
        details: {
          action: log.action,
          resourceType: log.resource_type,
          ipAddress: log.ip_address,
        },
        created_at: admin.firestore.FieldValue.serverTimestamp(),
        resolved: false,
      });
    }

    return null;
  });
