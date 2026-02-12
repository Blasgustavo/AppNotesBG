import { Module, Global } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as admin from 'firebase-admin';
import * as path from 'path';
import * as fs from 'fs';

export const FIREBASE_ADMIN = 'FIREBASE_ADMIN';

@Global()
@Module({
  providers: [
    {
      provide: FIREBASE_ADMIN,
      inject: [ConfigService],
      useFactory: (config: ConfigService): admin.app.App => {
        // Evitar inicializar dos veces (ej: hot-reload en dev)
        if (admin.apps.length > 0) {
          return admin.apps[0] as admin.app.App;
        }

        // En desarrollo: usar service-account.json si existe
        const serviceAccountPath = path.resolve(
          process.cwd(),
          'service-account.json',
        );
        if (fs.existsSync(serviceAccountPath)) {
          const serviceAccount = JSON.parse(
            fs.readFileSync(serviceAccountPath, 'utf8'),
          );
          return admin.initializeApp({
            credential: admin.credential.cert(serviceAccount),
          });
        }

        // En producción: usar variables de entorno
        const privateKey = config
          .get<string>('FIREBASE_PRIVATE_KEY')
          ?.replace(/\\n/g, '\n');

        return admin.initializeApp({
          credential: admin.credential.cert({
            projectId: config.get<string>('FIREBASE_PROJECT_ID'),
            clientEmail: config.get<string>('FIREBASE_CLIENT_EMAIL'),
            privateKey,
          }),
        });
      },
    },
  ],
  exports: [FIREBASE_ADMIN],
})
export class FirebaseAdminModule {}
