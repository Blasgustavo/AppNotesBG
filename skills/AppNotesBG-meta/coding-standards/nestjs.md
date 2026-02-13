# Coding Standards — NestJS (AppNotesBG)

> Creado: 2026-02-13 | Origen: audit de seguridad P3

---

## 1. Autenticación y Autorización

### Regla: FirebaseAuthGuard es global — todo endpoint lo requiere
```typescript
// app.module.ts — registro global
providers: [
  { provide: APP_GUARD, useClass: ThrottlerGuard },   // Primero: rate limit
  { provide: APP_GUARD, useClass: FirebaseAuthGuard }, // Segundo: auth
]
```
- Solo usar `@Public()` en endpoints verdaderamente públicos
- Nunca crear endpoints sin auth que retornen datos de usuario

### Regla: Verificación de ownership en todos los servicios
```typescript
// ✅ Correcto
const data = snap.data() as Record<string, unknown>;
if (data['user_id'] !== userId) {
  throw new NotFoundException(`Resource not found`); // NO ForbiddenException
}
```
- Usar `NotFoundException` (no `ForbiddenException`) para no revelar existencia del recurso
- Verificar ownership SIEMPRE en el servicio, nunca solo en el controlador

### Regla: Endpoints del sistema NO en API pública
```typescript
// ❌ Incorrecto — expone datos de todos los usuarios
@Get('pending')
async getPending() {
  return this.service.findAllPending(); // Sin filtro de userId
}

// ✅ Correcto — siempre filtrar por usuario autenticado
@Get('pending')
async getPending(@Req() req: AuthenticatedRequest) {
  return this.service.findPendingByUser(req.user.uid);
}
```

---

## 2. DTOs y Validación

### Regla: UpdateDto usa PartialType para PATCH semántico
```typescript
// ❌ Incorrecto — todos los campos son requeridos en el update
export class UpdateNoteDto extends CreateNoteDto {}

// ✅ Correcto — todos los campos son opcionales
import { PartialType } from '@nestjs/swagger';
export class UpdateNoteDto extends PartialType(CreateNoteDto) {
  @IsOptional()
  version?: number;
}
```

### Regla: Separar DTOs de usuario de DTOs de sistema
```typescript
// DTO para endpoints públicos — campos modificables por usuario
export class UpdateAttachmentDto {
  name?: string;
  alt_text?: string;
}

// DTO para uso interno (NO exponer en endpoints de usuario)
export class SystemUpdateAttachmentDto extends UpdateAttachmentDto {
  virus_scan_status?: 'pending' | 'clean' | 'infected' | 'quarantine';
}
```

### Regla: ValidationPipe global con whitelist
```typescript
// main.ts — siempre con whitelist: true para descartar campos extra
app.useGlobalPipes(new ValidationPipe({
  whitelist: true,           // Descarta propiedades no decoradas
  forbidNonWhitelisted: true, // Lanza error si hay propiedades extra
  transform: true,
  transformOptions: { enableImplicitConversion: true },
}));
```

---

## 3. Seguridad HTTP

### Regla: helmet() es obligatorio
```typescript
// main.ts — ANTES de cualquier otro middleware
import helmet from 'helmet';
app.use(helmet());
```

### Regla: trust proxy solo en producción
```typescript
// main.ts
if (process.env.NODE_ENV === 'production') {
  app.getHttpAdapter().getInstance().set('trust proxy', 1);
}
```

### Regla: Swagger solo en desarrollo
```typescript
if (process.env.NODE_ENV !== 'production') {
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);
}
```

---

## 4. Manejo de Errores

### Regla: Nunca exponer detalles internos en respuestas de error
```typescript
// ✅ Correcto — HttpExceptionFilter ya maneja esto
// Los errores no-HTTP se convierten en 500 sin mensaje interno
```

### Regla: Jerarquía de excepciones correcta
| Situación | Excepción |
|---|---|
| Recurso no encontrado | `NotFoundException` |
| Sin permiso (recurso existe) | `NotFoundException` (para evitar enumeración) |
| Input inválido | `BadRequestException` |
| Conflicto de datos | `ConflictException` |
| Error del servidor | `InternalServerErrorException` |

---

## 5. Imports y Dependencias

### Regla: Usar imports estáticos — nunca require() dinámico
```typescript
// ❌ Incorrecto — require() dentro de método
function generateHash(data: string): string {
  const crypto = require('crypto');
  return crypto.createHash('sha256').update(data).digest('hex');
}

// ✅ Correcto — import estático en el tope del archivo
import { createHash } from 'crypto';
function generateHash(data: string): string {
  return createHash('sha256').update(data).digest('hex');
}
```

### Regla: Eliminar dependencias no usadas
- Verificar con `npm ls` o `depcheck` que todas las dependencias se usan
- No instalar `passport` si la auth es Firebase (ya tiene su propio guard)

---

## 6. Firebase Admin SDK

### Regla: Credenciales SOLO por variables de entorno
```typescript
// ❌ NUNCA cargar service-account.json del disco
if (fs.existsSync('service-account.json')) { ... }

// ✅ Siempre desde ConfigService
const projectId = config.get<string>('FIREBASE_PROJECT_ID');
const clientEmail = config.get<string>('FIREBASE_CLIENT_EMAIL');
const privateKey = config.get<string>('FIREBASE_PRIVATE_KEY')?.replace(/\\n/g, '\n');
```

### Regla: El Admin SDK bypasea todas las reglas de Firestore
- El Admin SDK tiene acceso total — verificar ownership SIEMPRE en el servicio
- Las Firestore Rules solo aplican a accesos directos del cliente (listeners en tiempo real)

---

## 7. Filtros de Búsqueda Algolia

### Regla: Usar facetFilters (array) en lugar de string interpolation
```typescript
// ❌ Incorrecto — riesgo de inyección
filters: `user_id:${userId} AND tags:"${tag}"` // tag puede contener " o )

// ✅ Correcto — estructura de array (escaping automático)
facetFilters: [
  [`user_id:${userId}`],    // AND externo
  tags.map(t => `tags:${t.replace(/[":]/g, '')}`), // OR interno
]
```

---

## 8. Auditoría

### Regla: AuditService en todos los módulos
- `create`, `update`, `delete` de Notes, Notebooks, Attachments, Themes, Reminders deben registrar audit log
- Usar `'unknown'` para ipAddress cuando no está disponible en el contexto

---

## Historial de cambios

| Fecha | Cambio |
|---|---|
| 2026-02-13 | Creación inicial desde audit de seguridad P1-P3 |
