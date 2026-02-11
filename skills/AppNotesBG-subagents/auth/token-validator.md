# token-validator — Subagente AppNotesBG

## Rol
Validar tokens JWT de Firebase en cada request HTTP a NestJS, verificando autenticidad, expiracion y extrayendo el `uid` del usuario para uso en los controladores.

## Nivel
subagente

## Dominio
auth

## Contexto del proyecto
Consultar NEGOCIO.md secciones:
- "Autenticacion (Google Sign-In)" — flujo de tokens, expiracion en 1 hora, refresh automatico
- "Seguridad" — FirebaseAuthGuard obligatorio en todos los endpoints

---

## Herramientas / capacidades disponibles

- **Firebase Admin SDK** — `admin.auth().verifyIdToken(token)`
- **NestJS Guards** — implementacion de `CanActivate` para `FirebaseAuthGuard`

---

## Protocolo de entrada

```json
{
  "action": "validate_token",
  "payload": {
    "authorization_header": "Bearer <id_token>"
  }
}
```

---

## Protocolo de salida

```json
{
  "valid": true,
  "uid": "google_uid",
  "email": "user@example.com",
  "expires_at": "timestamp"
}
```

En caso de token invalido:
```json
{
  "valid": false,
  "uid": null,
  "error": "TOKEN_EXPIRED | TOKEN_INVALID | TOKEN_MISSING"
}
```

---

## Pasos de ejecucion

1. Extraer el token del header: `Authorization: Bearer <token>`
2. Si no hay header o no tiene formato `Bearer <token>`: retornar `TOKEN_MISSING` → HTTP 401
3. Llamar `admin.auth().verifyIdToken(token, true)` — el `true` fuerza verificacion de revocacion
4. Si el token es invalido o expirado: retornar el codigo de error correspondiente → HTTP 401
5. Si es valido: extraer `uid` y `email` del decoded token
6. Inyectar `uid` en el objeto `request` de NestJS para uso en los controladores
7. Continuar con la ejecucion del endpoint

---

## Implementacion del guard en NestJS

```typescript
// core/guards/firebase-auth.guard.ts
@Injectable()
export class FirebaseAuthGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers.authorization;

    if (!authHeader?.startsWith('Bearer ')) {
      throw new UnauthorizedException('TOKEN_MISSING');
    }

    const token = authHeader.split('Bearer ')[1];

    try {
      const decoded = await admin.auth().verifyIdToken(token, true);
      request.user = { uid: decoded.uid, email: decoded.email };
      return true;
    } catch (error) {
      if (error.code === 'auth/id-token-expired') {
        throw new UnauthorizedException('TOKEN_EXPIRED');
      }
      throw new UnauthorizedException('TOKEN_INVALID');
    }
  }
}
```

---

## Restricciones

- **NUNCA** aceptar tokens sin verificar con Firebase Admin — nunca decodificar JWT manualmente
- **NUNCA** cachear tokens validados — verificar en cada request
- **NUNCA** exponer el `uid` del usuario en respuestas de error
- Los tokens expirados son rechazados — el cliente es responsable de refrescarlos via Firebase SDK
- Usar `checkRevoked: true` en `verifyIdToken` para detectar tokens revocados

---

## Referencias en el proyecto

- `NEGOCIO.md` → seccion "Autenticacion (Google Sign-In)"
- `api/src/core/guards/firebase-auth.guard.ts`
- `api/src/app.module.ts` → registro global del guard
- `skills/AppNotesBG-meta/error-patterns/typescript-undefined.md`

---

## Historial de cambios

| Fecha | Cambio |
|---|---|
| 2026-02-10 | Creacion inicial con implementacion del guard NestJS |
