import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Prefix global para API
  app.setGlobalPrefix('api/v1');

  // CORS configuration
  const corsOrigin = process.env.CORS_ORIGIN?.split(',') || ['http://localhost:4200'];
  app.enableCors({
    origin: corsOrigin,
    credentials: true,
  });

  // ValidationPipe global para DTOs con class-validator
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
    transformOptions: { enableImplicitConversion: true },
  }));

  // Swagger API documentation
  const config = new DocumentBuilder()
    .setTitle('AppNotesBG API')
    .setDescription('Backend for modern notes application')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
