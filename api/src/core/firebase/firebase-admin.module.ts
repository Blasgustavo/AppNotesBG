import { Module, Global, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as admin from 'firebase-admin';

export const FIREBASE_ADMIN = 'FIREBASE_ADMIN';

@Global()
@Module({
  providers: [
    {
      provide: FIREBASE_ADMIN,
      inject: [ConfigService],
      useFactory: (config: ConfigService): admin.app.App => {
        const logger = new Logger('FirebaseAdminModule');

        // Evitar inicializar dos veces (ej: hot-reload en dev)
        if (admin.apps.length > 0) {
          return admin.apps[0] as admin.app.App;
        }

        // Credenciales exclusivamente por variables de entorno
        // NUNCA usar service-account.json en disco (riesgo de seguridad)
        const projectId = config.get<string>('FIREBASE_PROJECT_ID');
        const clientEmail = config.get<string>('FIREBASE_CLIENT_EMAIL');
        const privateKey = config
          .get<string>('FIREBASE_PRIVATE_KEY')
          ?.replace(/\\n/g, '\n');

        if (!projectId || !clientEmail || !privateKey) {
          logger.error(
            'Firebase Admin SDK credentials missing. ' +
            'Set FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL and FIREBASE_PRIVATE_KEY in .env',
          );
          throw new Error('Firebase Admin SDK credentials not configured');
        }

        logger.log(`Firebase Admin SDK initialized for project: ${projectId}`);

        return admin.initializeApp({
          credential: admin.credential.cert({
            projectId,
            clientEmail,
            privateKey,
          }),
        });
      },
    },
  ],
  exports: [FIREBASE_ADMIN],
})
export class FirebaseAdminModule {}
