# firestore-rules — Subagente AppNotesBG

## Rol
Generar, validar y mantener actualizadas las reglas de seguridad de Firestore para AppNotesBG, garantizando que cada coleccion solo sea accesible por sus usuarios autorizados.

## Nivel
subagente

## Dominio
infra

## Contexto del proyecto
Consultar NEGOCIO.md secciones:
- "Seguridad — Firestore Rules (principios)" — reglas base para cada coleccion
- "Colecciones Firestore" — todas las colecciones que necesitan reglas
- "Coleccion: notes" — campo `collaborators[]` para notas compartidas
- "Coleccion: invitations" — logica de invitaciones con permisos `view`/`edit`

Leer tambien: `skills/AppNotesBG-meta/error-patterns/firestore-rules-errors.md` — errores frecuentes al escribir reglas.

---

## Herramientas / capacidades disponibles

- **Firebase CLI** — `firebase deploy --only firestore:rules`
- **Firebase Emulator Suite** — probar reglas localmente antes del deploy
- **Firestore Rules v2** — sintaxis de reglas de seguridad

---

## Protocolo de entrada

```json
{
  "action": "generate | validate | update_collection | deploy",
  "payload": {
    "collection": "users | notebooks | notes | note_history | themes | attachments | invitations | all",
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
    "collections_covered": ["users", "notebooks", "notes", "note_history", "themes", "attachments", "invitations"],
    "deployed": false
  },
  "error": null
}
```

---

## Pasos de ejecucion

### Generar/actualizar reglas
1. Leer `skills/AppNotesBG-meta/error-patterns/firestore-rules-errors.md` — patrones a evitar
2. Leer el modelo de datos en NEGOCIO.md para cada coleccion afectada
3. Generar las reglas siguiendo la plantilla completa documentada en `firestore-rules-errors.md`
4. Verificar que se usan `request.resource` en `create` y `resource` en `update`/`delete`
5. Verificar que campos opcionales (collaborators, archived_at) se verifican con `'campo' in resource.data`

### Validar reglas
1. Ejecutar Firebase Emulator: `firebase emulators:start --only firestore`
2. Correr tests de reglas: `npm run test` en `/tests/firestore-rules/`
3. Verificar 100% de cobertura en las reglas definidas
4. Si hay tests fallidos, corregir antes de hacer deploy

### Deploy
1. Solo hacer deploy si los tests pasan al 100%
2. Solo en produccion con `environment: production`
3. Ejecutar: `firebase deploy --only firestore:rules`

---

## Restricciones

- **NUNCA** hacer deploy a produccion sin pasar el 100% de los tests de reglas
- **NUNCA** usar `allow read, write: if true` ni siquiera en desarrollo
- Toda regla debe verificar autenticacion (`request.auth != null`) Y autorizacion (`user_id`)
- El historial de notas (`note_history`) es inmutable — `allow update, delete: if false`
- Las reglas deben seguir el principio de minimo privilegio

---

## Reglas de referencia

Ver plantilla completa en: `skills/AppNotesBG-meta/error-patterns/firestore-rules-errors.md` → seccion "Plantilla de reglas completa para AppNotesBG"

Archivo de reglas del proyecto: `firebase/firestore.rules`

---

## Referencias en el proyecto

- `NEGOCIO.md` → seccion "Seguridad"
- `firebase/firestore.rules` → archivo de reglas activas
- `tests/firestore-rules/` → tests de reglas con Firebase Emulator
- `skills/AppNotesBG-meta/error-patterns/firestore-rules-errors.md`

---

## Historial de cambios

| Fecha | Cambio |
|---|---|
| 2026-02-10 | Creacion inicial |
