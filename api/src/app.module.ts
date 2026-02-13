import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { WinstonModule } from 'nest-winston';
import * as winston from 'winston';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { FirebaseAdminModule, FirebaseAuthGuard } from './core/firebase';
import { FirestoreModule } from './core/firestore';
import { TipTapModule } from './core/tiptap';
import { AuthModule } from './auth/auth.module';
import { NotebooksModule } from './notebooks/notebooks.module';
import { NotesModule } from './notes/notes.module';
import { SearchModule } from './search/search.module';
import { AttachmentsModule } from './attachments/attachments.module';
import { ThemesModule } from './themes/themes.module';
import { RemindersModule } from './reminders/reminders.module';
import { AuditModule } from './audit/audit.module';

@Module({
  imports: [
    // Variables de entorno disponibles globalmente via ConfigService
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),

    // Logger estructurado con Winston — reemplaza console.log/error en producción
    WinstonModule.forRoot({
      level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
      format: process.env.NODE_ENV === 'production'
        ? winston.format.combine(
            winston.format.timestamp(),
            winston.format.errors({ stack: true }),
            winston.format.json(), // JSON estructurado para Cloud Logging / Datadog
          )
        : winston.format.combine(
            winston.format.colorize(),
            winston.format.timestamp({ format: 'HH:mm:ss' }),
            winston.format.printf(({ level, message, timestamp, context, stack }) =>
              `${timestamp} [${context ?? 'App'}] ${level}: ${message}${stack ? '\n' + stack : ''}`,
            ),
          ),
      transports: [
        new winston.transports.Console(),
        // En producción agregar: new winston.transports.File({ filename: 'error.log', level: 'error' })
      ],
    }),

    // Firebase Admin SDK — global, disponible en todos los módulos
    FirebaseAdminModule,

    // Firestore — servicio global de acceso a la base de datos
    FirestoreModule,

    // TipTap — procesamiento y validación de contenido
    TipTapModule,

    // Módulos de dominio
    AuthModule,
    NotebooksModule,
    NotesModule,
    SearchModule,
    AttachmentsModule,
    ThemesModule,
    RemindersModule,
    AuditModule,

    ThrottlerModule.forRoot([
      {
        ttl: 60000, // 60 segundos
        limit: 100, // 100 peticiones por minuto por IP
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
