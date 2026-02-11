import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { FirebaseAdminModule } from './core/firebase';

@Module({
  imports: [
    // Variables de entorno disponibles globalmente via ConfigService
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),

    // Firebase Admin SDK — global, disponible en todos los módulos
    FirebaseAdminModule,

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
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class AppModule {}
