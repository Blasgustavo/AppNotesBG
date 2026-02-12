import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { FirebaseAdminModule, FirebaseAuthGuard } from './core/firebase';
import { FirestoreModule } from './core/firestore';
import { AuthModule } from './auth/auth.module';
import { NotebooksModule } from './notebooks/notebooks.module';
import { NotesModule } from './notes/notes.module';

@Module({
  imports: [
    // Variables de entorno disponibles globalmente via ConfigService
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),

    // Firebase Admin SDK — global, disponible en todos los módulos
    FirebaseAdminModule,

    // Firestore — servicio global de acceso a la base de datos
    FirestoreModule,

    // Módulos de dominio
    AuthModule,
    NotebooksModule,
    NotesModule,

    ThrottlerModule.forRoot([
      {
        ttl: 60000,   // 60 segundos
        limit: 100,   // 100 peticiones por minuto por IP
      },
    ]),
  ],
  controllers: [AppController],
  providers: [
    AppService,
    // ThrottlerGuard primero — rate limiting antes de autenticación
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    // FirebaseAuthGuard global — protege todos los endpoints
    // Usar @Public() para marcar rutas que no requieren auth
    { provide: APP_GUARD, useClass: FirebaseAuthGuard },
  ],
})
export class AppModule {}
