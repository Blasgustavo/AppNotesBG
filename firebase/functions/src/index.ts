import { onRequest } from 'firebase-functions/v2/https';
import { onDocumentWritten, onDocumentCreated } from 'firebase-functions/v2/firestore';
import * as admin from 'firebase-admin';
import * as functions from 'firebase-functions';

admin.initializeApp();

const db = admin.firestore();

export const helloWorld = onRequest(async (_req, res) => {
  functions.logger.info('Hello logs!', { structuredData: true });
  res.json({ message: 'Hello from Firebase Functions!' });
});

export const syncAlgoliaIndex = onDocumentWritten('notes/{noteId}', async (event) => {
  const change = event.data;
  if (!change) {
    functions.logger.info('Note deleted, removing from Algolia');
    return;
  }
  functions.logger.info('Syncing note to Algolia');
});

export const detectAnomalies = onDocumentCreated('audit_logs/{logId}', async (event) => {
  const snap = event.data;
  if (!snap) return;

  const log = snap.data();
  if (!log) return;

  const isSuspicious = (log.action === 'delete' && log.resource_type === 'note') || log.ip_address === 'unknown';

  if (isSuspicious) {
    functions.logger.warn('Suspicious activity detected');
    await db.collection('security_alerts').add({
      type: 'suspicious_activity',
      user_id: log.user_id,
      log_id: snap.id,
      details: { action: log.action, resourceType: log.resource_type, ipAddress: log.ip_address },
      created_at: admin.firestore.FieldValue.serverTimestamp(),
      resolved: false,
    });
  }
});
