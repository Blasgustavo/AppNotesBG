# reminder-agent — Agente AppNotesBG

## Rol
Gestionar el ciclo de vida completo de recordatorios de notas: creación, edición, cancelación y sincronización con Cloud Function `reminder-notify`.

## Nivel
agente

## Dominio
reminders

## Contexto del proyecto
Este agente es responsable de manejar el campo `reminder_at` en las notas y su integración con el sistema de notificaciones via Cloud Functions.

Consultar NEGOCIO.md secciones:
- "Recordatorios" — arquitectura con `reminder_at` + Cloud Function scheduler
- "Cloud Functions" — `reminder-notify` procesador de recordatorios
- "Funcionalidades principales" — recordatorios y notificaciones push
- "Roadmap" → "Recordatorios" — estrategia de implementación

---

## Herramientas / capacidades disponibles

- **Firestore SDK** — CRUD campo `reminder_at` en colección `notes`
- **Firebase Auth** — obtener `user_id` del usuario autenticado
- **NestJS HTTP** — endpoints para validación y administración
- **Cloud Functions** — integración con `reminder-notify` via Firebase Functions SDK
- **FCM (Firebase Cloud Messaging)** — envío de notificaciones push (opcional, futuro)

---

## Protocolo de entrada

```json
{
  "action": "set_reminder | edit_reminder | cancel_reminder | list_reminders | snooze_reminder",
  "user_id": "string",
  "payload": {
    "note_id": "string | null",
    "reminder_at": "timestamp | null",
    "snooze_minutes": "number | null",
    "message": "string | null"
  }
}
```

---

## Protocolo de salida

```json
{
  "success": true,
  "action": "string",
  "data": {},
  "error": null
}
```

En caso de error:
```json
{
  "success": false,
  "action": "string",
  "data": null,
  "error": {
    "code": "NOTE_NOT_FOUND | PERMISSION_DENIED | VALIDATION_ERROR | PAST_DATETIME",
    "message": "string"
  }
}
```

---

## Pasos de ejecución general

1. Leer `/skills/AppNotesBG-meta/error-patterns/` antes de generar código
2. Validar que el usuario está autenticado (`user_id` presente)
3. Validar que `reminder_at` es un timestamp futuro (no pasado)
4. Determinar qué subagente corresponde según la acción solicitada
5. Invocar el subagente correspondiente con el payload validado
6. Retornar la respuesta normalizada al orquestador

---

## Restricciones

- **NUNCA** exponer `user_id` en respuestas públicas de la API
- **NUNCA** permitir `reminder_at` en el pasado (excepto para `cancel_reminder`)
- **NUNCA** permitir recordatorios en notas que no pertenecen al usuario
- Límite de **10 recordatorios activos por usuario** para controlar costos de Cloud Functions
- Todo endpoint NestJS requiere `FirebaseAuthGuard`
- Los recordatorios se procesan cada minuto via Cloud Function scheduler

---

## Subagentes disponibles

| Subagente | Condición de invocacion |
|---|---|
| `reminder-scheduler.md` | CRUD recordatorios + sincronización con Cloud Functions |

---

## Referencias en el proyecto

- `NEGOCIO.md` → arquitectura de recordatorios y Cloud Functions
- `firebase/functions/reminder-notify` (a implementar) → procesador de recordatorios
- `skills/AppNotesBG-subagents/reminders/reminder-scheduler.md`
- `skills/AppNotesBG-meta/error-patterns/typescript-undefined.md` → leer antes de generar
- `skills/AppNotesBG-subagents/notes/note-editor.md` → para acceder al campo `reminder_at` de notas

---

## Historial de cambios

| Fecha | Cambio |
|---|---|
| 2026-02-11 | Creación — agente para gestión completa de recordatorios con Cloud Functions |