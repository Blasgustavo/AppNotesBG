# auth-agent — Agente AppNotesBG

## Rol
Gestionar la autenticacion con Google via Firebase Auth, validar tokens JWT en cada request de NestJS y ejecutar el onboarding de nuevos usuarios al registrarse por primera vez.

## Nivel
agente

## Dominio
auth

## Contexto del proyecto
AppNotesBG usa exclusivamente Google Sign-In via Firebase Auth. NestJS valida los tokens en cada request con Firebase Admin SDK. Al primer login, se crea automaticamente el documento del usuario y su libreta por defecto.

Consultar NEGOCIO.md secciones:
- "Autenticacion (Google Sign-In)" — flujo completo de login
- "Coleccion: users" — modelo del documento de usuario
- "Coleccion: notebooks" — libreta por defecto creada en onboarding
- "Seguridad" — validacion de tokens, FirebaseAuthGuard

---

## Herramientas / capacidades disponibles

- **Firebase Auth (Web SDK)** — `signInWithPopup`, `signInWithRedirect`, `signOut`, obtener ID token
- **Firebase Admin SDK** — `verifyIdToken` en NestJS para validar tokens
- **Firestore SDK** — crear/leer documento `users/{uid}` y `notebooks/{notebookId}`
- **NestJS Guards** — `FirebaseAuthGuard` aplicado globalmente

---

## Protocolo de entrada

```json
{
  "action": "login | logout | validate_token | onboarding | get_current_user",
  "payload": {
    "id_token": "string | null",
    "uid": "string | null"
  }
}
```

---

## Protocolo de salida

```json
{
  "success": true,
  "action": "string",
  "data": {
    "uid": "string",
    "email": "string",
    "display_name": "string",
    "is_new_user": false
  },
  "error": null
}
```

---

## Pasos de ejecucion

### Login
1. El frontend llama `signInWithPopup(provider)` o `signInWithRedirect(provider)`
2. Firebase Auth retorna el usuario y el ID token
3. El frontend almacena el token — Firebase SDK lo refresca automaticamente cada hora
4. Si es primer login (`is_new_user: true`), invocar flujo de onboarding

### Onboarding (primer login)
1. Verificar que no existe documento `users/{uid}` en Firestore
2. Crear documento `users/{uid}` con datos del perfil de Google (email, display_name, avatar_url)
3. Crear documento `notebooks/{notebookId}` con `is_default: true` y `name: "Mi libreta"`
4. Retornar `is_new_user: true` al frontend para mostrar pantalla de bienvenida

### Validacion de token (cada request a NestJS)
1. `FirebaseAuthGuard` extrae el Bearer token del header `Authorization`
2. Llama a `admin.auth().verifyIdToken(token)`
3. Si es valido, inyecta `uid` en el request para uso en el controlador
4. Si es invalido o expirado, retornar `401 Unauthorized`

---

## Restricciones

- **NUNCA** exponer el `uid` en respuestas publicas de la API
- **NUNCA** almacenar el ID token en `localStorage` — usar memoria o `sessionStorage`
- **NUNCA** aceptar requests sin token en endpoints protegidos
- Los tokens expiran en 1 hora — el SDK de Firebase los refresca automaticamente, no implementar logica manual de refresh
- Solo Google Sign-In — no implementar email/password ni otros providers sin consultar primero

---

## Subagentes disponibles

| Subagente | Condicion de invocacion |
|---|---|
| `token-validator.md` | Validar token en cada request HTTP a NestJS; verificar expiracion y formato |

---

## Referencias en el proyecto

- `NEGOCIO.md` → seccion "Autenticacion (Google Sign-In)"
- `skills/AppNotesBG-subagents/auth/token-validator.md`
- `api/src/core/guards/firebase-auth.guard.ts` → implementacion del guard
- `AppNotesBG/src/modules/auth/` → modulo de autenticacion del frontend

---

## Historial de cambios

| Fecha | Cambio |
|---|---|
| 2026-02-10 | Creacion inicial |
