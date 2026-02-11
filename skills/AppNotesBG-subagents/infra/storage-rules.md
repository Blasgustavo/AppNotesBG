# storage-rules — Subagente AppNotesBG

## Rol
Generar, validar y mantener las reglas de seguridad de Firebase Storage para AppNotesBG, controlando el acceso, tipos de archivo permitidos y limites de tamaño.

## Nivel
subagente

## Dominio
infra

## Contexto del proyecto
Consultar NEGOCIO.md secciones:
- "Seguridad — Storage Rules (principios)" — tipos permitidos, limite de 10MB por archivo
- "Coleccion: attachments" — estructura de rutas `users/{uid}/notes/{noteId}/{fileId}`
- "Limites de uso" — 500MB por usuario, 20 adjuntos por nota

---

## Herramientas / capacidades disponibles

- **Firebase CLI** — `firebase deploy --only storage:rules`
- **Firebase Emulator Suite** — probar reglas de Storage localmente
- **Firebase Storage Rules v2** — sintaxis de reglas

---

## Protocolo de entrada

```json
{
  "action": "generate | validate | deploy",
  "payload": {
    "change_description": "string",
    "environment": "development | production"
  }
}
```

---

## Protocolo de salida

```json
{
  "success": true,
  "action": "validate",
  "data": {
    "rules_valid": true,
    "max_file_size_mb": 10,
    "allowed_types": ["image/jpeg", "image/png", "image/gif", "image/webp", "application/pdf", "audio/mpeg", "audio/mp4"],
    "deployed": false
  }
}
```

---

## Pasos de ejecucion

### Generar reglas
1. Definir la ruta obligatoria: `users/{userId}/notes/{noteId}/{fileId}`
2. Verificar que `userId` en la ruta coincide con `request.auth.uid`
3. Limitar el tamaño del archivo a 10MB
4. Restringir los tipos MIME permitidos
5. Verificar autenticacion en toda operacion

### Reglas de Storage completas para AppNotesBG

```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {

    // Archivos de usuarios — ruta: users/{userId}/notes/{noteId}/{fileId}
    match /users/{userId}/notes/{noteId}/{fileId} {

      // Solo el dueno del archivo puede leer
      allow read: if request.auth != null
        && request.auth.uid == userId;

      // Crear archivo: autenticado, dueno de la ruta, tamaño y tipo validos
      allow create: if request.auth != null
        && request.auth.uid == userId
        && request.resource.size <= 10 * 1024 * 1024
        && request.resource.contentType.matches(
          'image/jpeg|image/png|image/gif|image/webp|application/pdf|audio/mpeg|audio/mp4'
        );

      // No se permite actualizar archivos — solo crear y eliminar
      allow update: if false;

      // Solo el dueno puede eliminar
      allow delete: if request.auth != null
        && request.auth.uid == userId;
    }

    // Bloquear cualquier otra ruta no definida
    match /{allPaths=**} {
      allow read, write: if false;
    }
  }
}
```

### Validar y hacer deploy
1. Ejecutar emulador: `firebase emulators:start --only storage`
2. Correr tests de Storage si existen en `/tests/`
3. Si los tests pasan: `firebase deploy --only storage:rules`

---

## Restricciones

- **NUNCA** permitir `allow write: if true` ni `allow read: if true`
- **NUNCA** permitir tipos de archivo ejecutables (.exe, .sh, .bat, .js, .php)
- El limite de 10MB se valida en las reglas de Storage Y en NestJS (doble validacion)
- La ruta del archivo siempre debe incluir el `userId` para garantizar el aislamiento entre usuarios
- No permitir `update` de archivos — si se necesita reemplazar, eliminar y subir de nuevo

---

## Referencias en el proyecto

- `NEGOCIO.md` → seccion "Seguridad — Storage Rules"
- `firebase/storage.rules` → archivo de reglas activas
- `skills/AppNotesBG-subagents/notes/note-creator.md` → quien sube y elimina archivos
- `api/src/modules/notes/` → validacion de cuota en NestJS antes de subir

---

## Historial de cambios

| Fecha | Cambio |
|---|---|
| 2026-02-10 | Creacion inicial con reglas completas y tipos MIME permitidos |
