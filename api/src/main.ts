import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './core/filters/http-exception.filter';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule);

  // ─── Seguridad HTTP headers (helmet) ──────────────────────────────────────
  // Debe aplicarse antes de cualquier otro middleware
  app.use(helmet());

  // ─── Trust proxy — solo cuando hay un proxy/load balancer delante ─────────
  // Permite leer X-Forwarded-For de forma segura en producción
  const isProduction = process.env.NODE_ENV === 'production';
  if (isProduction) {
    // '1' = confiar en un nivel de proxy (ej: nginx/Cloud Run)
    app.getHttpAdapter().getInstance().set('trust proxy', 1);
  }

  // ─── Prefix global para API ────────────────────────────────────────────────
  app.setGlobalPrefix('api/v1');

  // ─── CORS ─────────────────────────────────────────────────────────────────
  const corsOrigin = process.env.CORS_ORIGIN?.split(',').map((o) => o.trim()) || [
    'http://localhost:4200',
  ];
  app.enableCors({
    origin: corsOrigin,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Authorization', 'Content-Type', 'Accept'],
  });

  // ─── Exception filter global — respuestas de error consistentes ───────────
  app.useGlobalFilters(new HttpExceptionFilter());

  // ─── ValidationPipe global para DTOs con class-validator ──────────────────
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  // ─── Swagger API documentation (solo en entornos no-producción) ───────────
  if (!isProduction) {
    const config = new DocumentBuilder()
      .setTitle('AppNotesBG API')
      .setDescription('Backend for modern notes application')
      .setVersion('1.0')
      .addBearerAuth()
      .build();
    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/docs', app, document);
    logger.log('Swagger docs available at /api/docs');
  }

  const port = process.env.PORT ?? 3000;
  await app.listen(port);
  logger.log(`Application running on port ${port} [${isProduction ? 'production' : 'development'}]`);
}
void bootstrap();
