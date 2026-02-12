import { Inject, Injectable } from '@nestjs/common';
import * as admin from 'firebase-admin';
import { FIREBASE_ADMIN } from '../firebase';

@Injectable()
export class FirestoreService {
  constructor(
    @Inject(FIREBASE_ADMIN) private readonly firebaseApp: admin.app.App,
  ) {}

  get db(): admin.firestore.Firestore {
    return this.firebaseApp.firestore();
  }

  /** Timestamp del servidor de Firestore */
  get serverTimestamp(): admin.firestore.FieldValue {
    return admin.firestore.FieldValue.serverTimestamp();
  }

  /** Incrementa un campo numérico atómicamente */
  increment(n: number): admin.firestore.FieldValue {
    return admin.firestore.FieldValue.increment(n);
  }

  /** Referencia a una colección */
  collection(path: string): admin.firestore.CollectionReference {
    return this.db.collection(path);
  }

  /** Referencia a un documento por colección + id */
  doc(collection: string, id: string): admin.firestore.DocumentReference {
    return this.db.collection(collection).doc(id);
  }

  /**
   * Obtiene un documento y lanza NotFoundException si no existe.
   * El llamador debe importar NotFoundException de @nestjs/common.
   */
  async getDoc(
    collection: string,
    id: string,
  ): Promise<admin.firestore.DocumentSnapshot> {
    return this.db.collection(collection).doc(id).get();
  }

  /**
   * Ejecuta una transacción de Firestore.
   */
  async runTransaction<T>(
    fn: (t: admin.firestore.Transaction) => Promise<T>,
  ): Promise<T> {
    return this.db.runTransaction(fn);
  }

  /**
   * Ejecuta un batch de escrituras.
   */
  batch(): admin.firestore.WriteBatch {
    return this.db.batch();
  }
}
