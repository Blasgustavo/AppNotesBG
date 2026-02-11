# reminder-scheduler — Subagente de Recordatorios

## Responsabilidad

Gestionar operaciones CRUD sobre el campo `reminder_at` de las notas y su sincronización con la Cloud Function `reminder-notify`.

---

## Flujo de ejecución

### set_reminder
1. Validar que `note_id` pertenece al usuario
2. Validar que `reminder_at` es un timestamp futuro (mínimo 5 minutos desde ahora)
3. Actualizar campo `reminder_at` en documento `notes/{noteId}`
4. Retornar reminder programado

### edit_reminder
1. Validar que `note_id` pertenece al usuario
2. Validar nuevo `reminder_at` (si se cambia)
3. Actualizar campo `reminder_at`
4. Retornar reminder actualizado

### cancel_reminder
1. Validar que `note_id` pertenece al usuario
2. Establecer `reminder_at = null` en la nota
3. Retornar confirmación de cancelación

### snooze_reminder
1. Calcular nuevo timestamp: `now + snooze_minutes`
2. Actualizar `reminder_at` con el nuevo timestamp
3. Retornar nuevo reminder

### list_reminders
1. Query Firestore por notas con `reminder_at > now` y `user_id == uid`
2. Ordenar por `reminder_at` ascendente
3. Retornar lista de reminders pendientes

---

## Validaciones

- `reminder_at` debe ser >= `now + 5 minutes` (para retrasos mínimos de Cloud Function)
- `reminder_at` debe ser <= `now + 1 year` (límite razonable)
- Máximo 10 reminders activos por usuario
- Solo se puede crear reminder en notas propias

---

## Cloud Function integration

La Cloud Function `reminder-notify` se ejecuta cada minuto:

```typescript
// Firebase Function (exports.reminderNotify)
export const reminderNotify = functions.pubsub
  .schedule('every 1 minutes')
  .onRun(async (context) => {
    const now = admin.firestore.Timestamp.now();
    const reminders = await db.collection('notes')
      .where('reminder_at', '<=', now)
      .where('reminder_at', '!=', null)
      .get();
    
    // Agrupar por user_id para enviar notificaciones batch
    const remindersByUser = groupBy(reminders.docs, r => r.data().user_id);
    
    for (const [userId, userReminders] of Object.entries(remindersByUser)) {
      // Enviar notificación FCM (opcional)
      // Marcar reminders como procesados (si se usa un campo de estado)
    }
  });
```

---

## Estado del reminder en frontend

```typescript
// En NotesStateService agregar:
readonly reminders = signal<Reminder[]>([]);

refreshReminders(): void {
  const now = new Date();
  const activeNotes = this.notes().filter(n => 
    n.reminder_at && n.reminder_at.toDate() > now
  );
  const reminders = activeNotes.map(n => ({
    noteId: n.id,
    noteTitle: n.title,
    reminderAt: n.reminder_at,
    status: 'pending'
  }));
  
  this.reminders.set(reminders);
}
```

---

## Seguridad

- Validar ownership del `note_id` en todas las operaciones
- No permitir `reminder_at` en el pasado (excepto cancelar)
- Rate limiting: 10 reminders/updates por minuto por usuario

---

## Historial

| Fecha | Cambio |
|---|---|
| 2026-02-11 | Creación — CRUD reminders + Cloud Function scheduling |