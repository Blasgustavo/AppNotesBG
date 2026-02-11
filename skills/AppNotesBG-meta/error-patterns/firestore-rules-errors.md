# firestore-rules-errors — Patrones de error AppNotesBG

## Tecnologia
Firebase Firestore Security Rules + Firebase Emulator Suite

## Descripcion
Patrones para errores comunes al escribir y probar reglas de seguridad de Firestore en AppNotesBG. Cubre permisos denegados inesperados, reglas mal estructuradas y casos edge del modelo de datos.

---

## Patron 1 — Missing or insufficient permissions

### Mensaje de error
```
FirebaseError: [code=permission-denied]: Missing or insufficient permissions.
```

### Causa raiz
La regla de Firestore no cubre el caso de acceso que se esta intentando. Puede ser que el campo que se evalua no existe en el documento, o la condicion logica esta mal escrita.

### Ejemplo del problema
```javascript
// firestore.rules — MAL
match /notes/{noteId} {
  allow read, write: if request.auth.uid == resource.data.userId;
  // El campo en Firestore se llama "user_id", no "userId"
}
```

### Fix aplicado
```javascript
// BIEN — usar el nombre exacto del campo segun NEGOCIO.md
match /notes/{noteId} {
  allow read: if request.auth != null
    && request.auth.uid == resource.data.user_id;
  allow write: if request.auth != null
    && request.auth.uid == resource.data.user_id;
}
```

### Regla de prevencion
**Siempre verificar el nombre exacto de los campos contra el modelo de datos en `NEGOCIO.md` antes de escribir reglas. Usar el Firebase Emulator para probar antes de hacer deploy.**

---

## Patron 2 — Acceso a campo inexistente en resource.data

### Mensaje de error
```
Error: simulator.rules line [N]: Property 'field' does not exist
// O silencioso: la regla evalua como false sin error explicito
```

### Causa raiz
Intentar acceder a un campo en `resource.data` que puede no existir en todos los documentos (campo opcional o agregado despues).

### Ejemplo del problema
```javascript
// MAL — collaborators puede no existir en notas antiguas
match /notes/{noteId} {
  allow read: if request.auth.uid in resource.data.collaborators;
}
```

### Fix aplicado
```javascript
// BIEN — verificar existencia del campo antes de acceder
match /notes/{noteId} {
  allow read: if request.auth.uid == resource.data.user_id
    || (
      'collaborators' in resource.data
      && resource.data.collaborators.hasAny([{user_id: request.auth.uid}])
    );
}
```

### Regla de prevencion
**Usar `'campo' in resource.data` antes de acceder a campos opcionales. Los campos marcados como opcionales en NEGOCIO.md (como `collaborators`, `archived_at`, `reminder_at`) siempre deben verificarse con `in` primero.**

---

## Patron 3 — request.resource vs resource en operaciones write

### Mensaje de error
```
// Silencioso: write se permite cuando no deberia, o se deniega cuando si deberia
```

### Causa raiz
Confundir `resource` (documento actual en Firestore) con `request.resource` (documento nuevo que se esta escribiendo) en reglas de escritura.

### Ejemplo del problema
```javascript
// MAL — usa resource en create (el documento no existe aun)
match /notes/{noteId} {
  allow create: if resource.data.user_id == request.auth.uid;
  // resource es null en create, la regla siempre falla
}
```

### Fix aplicado
```javascript
// BIEN — usar request.resource para create, resource para update/delete
match /notes/{noteId} {
  allow create: if request.auth != null
    && request.resource.data.user_id == request.auth.uid;

  allow update: if request.auth != null
    && resource.data.user_id == request.auth.uid
    && request.resource.data.user_id == resource.data.user_id; // no cambiar owner

  allow delete: if request.auth != null
    && resource.data.user_id == request.auth.uid;
}
```

### Regla de prevencion
**En operaciones `create`: usar `request.resource.data`. En operaciones `update` y `delete`: usar `resource.data` para leer el estado actual. Nunca mezclarlos en la misma condicion sin saber que hace cada uno.**

---

## Patron 4 — Regla demasiado permisiva por error

### Mensaje de error
```
// No hay error — pero cualquier usuario autenticado puede leer/escribir datos ajenos
```

### Causa raiz
Escribir `if request.auth != null` sin verificar que el usuario es el dueno del documento.

### Ejemplo del problema
```javascript
// MAL — cualquier usuario autenticado puede leer TODAS las notas
match /notes/{noteId} {
  allow read: if request.auth != null;
}
```

### Fix aplicado
```javascript
// BIEN — solo el dueno puede leer su nota
// O los colaboradores listados en el documento
match /notes/{noteId} {
  allow read: if request.auth != null && (
    resource.data.user_id == request.auth.uid
    || (
      'collaborators' in resource.data
      && resource.data.collaborators.hasAny([{user_id: request.auth.uid}])
    )
  );
}
```

### Regla de prevencion
**`request.auth != null` solo verifica autenticacion, no autorizacion. Siempre agregar la verificacion de ownership (`resource.data.user_id == request.auth.uid`) ademas de la autenticacion.**

---

## Patron 5 — note_history accesible sin verificar nota padre

### Mensaje de error
```
FirebaseError: [code=permission-denied] en tests de historial
// O el contrario: historial accesible sin ser dueno de la nota
```

### Causa raiz
Las reglas de `note_history` no verifican que el usuario sea dueno de la nota padre.

### Ejemplo del problema
```javascript
// MAL — solo verifica user_id en el historial, no en la nota
match /note_history/{historyId} {
  allow read: if resource.data.user_id == request.auth.uid;
}
```

### Fix aplicado
```javascript
// BIEN — verificar ownership en el documento de historial
// (note_history.user_id debe ser igual al user_id de la nota)
match /note_history/{historyId} {
  allow read: if request.auth != null
    && resource.data.user_id == request.auth.uid;

  allow create: if request.auth != null
    && request.resource.data.user_id == request.auth.uid;

  // Solo lectura para el usuario — no puede modificar historial
  allow update, delete: if false;
}
```

### Regla de prevencion
**El historial de notas es inmutable — nunca permitir `update` ni `delete` en `note_history`. Solo `create` (al guardar version) y `read` (al consultar historial). El `user_id` en historial debe coincidir con el `user_id` de la nota.**

---

## Plantilla de reglas completa para AppNotesBG

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // Funcion helper: verificar autenticacion
    function isAuthenticated() {
      return request.auth != null;
    }

    // Funcion helper: verificar ownership
    function isOwner(userId) {
      return isAuthenticated() && request.auth.uid == userId;
    }

    // Funcion helper: verificar colaborador
    function isCollaborator(collaborators) {
      return isAuthenticated()
        && 'collaborators' in resource.data
        && resource.data.collaborators.hasAny([{user_id: request.auth.uid}]);
    }

    // users
    match /users/{userId} {
      allow read, write: if isOwner(userId);
    }

    // notebooks
    match /notebooks/{notebookId} {
      allow read, write: if isAuthenticated()
        && resource.data.user_id == request.auth.uid;
      allow create: if isAuthenticated()
        && request.resource.data.user_id == request.auth.uid;
    }

    // notes
    match /notes/{noteId} {
      allow read: if isAuthenticated() && (
        resource.data.user_id == request.auth.uid
        || isCollaborator(resource.data.collaborators)
      );
      allow create: if isAuthenticated()
        && request.resource.data.user_id == request.auth.uid;
      allow update: if isAuthenticated()
        && resource.data.user_id == request.auth.uid;
      allow delete: if isAuthenticated()
        && resource.data.user_id == request.auth.uid;
    }

    // note_history — inmutable
    match /note_history/{historyId} {
      allow read: if isAuthenticated()
        && resource.data.user_id == request.auth.uid;
      allow create: if isAuthenticated()
        && request.resource.data.user_id == request.auth.uid;
      allow update, delete: if false;
    }

    // themes
    match /themes/{themeId} {
      allow read, write: if isAuthenticated()
        && resource.data.user_id == request.auth.uid;
      allow create: if isAuthenticated()
        && request.resource.data.user_id == request.auth.uid;
    }

    // attachments
    match /attachments/{attachmentId} {
      allow read, write: if isAuthenticated()
        && resource.data.user_id == request.auth.uid;
      allow create: if isAuthenticated()
        && request.resource.data.user_id == request.auth.uid;
    }

    // invitations
    match /invitations/{invitationId} {
      // El dueno puede crear y revocar
      allow create, delete: if isAuthenticated()
        && request.resource.data.invited_by_uid == request.auth.uid;
      // El invitado puede leer y actualizar status
      allow read, update: if isAuthenticated() && (
        resource.data.invited_by_uid == request.auth.uid
        || resource.data.invited_email == request.auth.token.email
      );
    }
  }
}
```

---

## Historial de cambios

| Fecha | Cambio |
|---|---|
| 2026-02-10 | Creacion inicial con 5 patrones + plantilla completa de reglas |
