# Coding Standards — Firestore (AppNotesBG)

> Creado: 2026-02-14 | Origen: segunda auditoría de seguridad

---

## 1. Queries y Filtrado

### Regla: Inequality filters requieren orderBy en el mismo campo

```typescript
// ❌ Incorrecto — Violación de Firestore
q = q.where('archived_at', '!=', null);
q = q.orderBy('updated_at', 'desc'); // ERROR: requiere orderBy en archived_at primero

// ✅ Correcto
q = q.where('archived_at', '!=', null);
q = q.orderBy('archived_at', 'desc').orderBy('updated_at', 'desc');
```

### Regla: Usar serverTimestamp solo en writes, NO en queries

```typescript
// ❌ Incorrecto — serverTimestamp es un write sentinel, no se puede usar en where()
const now = this.firestore.serverTimestamp;
q = q.where('reminder_at', '<=', now); // Runtime error!

// ✅ Correcto — usar Timestamp.now() para queries
const now = admin.firestore.Timestamp.now();
q = q.where('reminder_at', '<=', now);
```

### Regla: Siempre filtrar por user_id en colecciones de usuario

```typescript
// ✅ Correcto — siempre agregar filtro de usuario
q = q.where('user_id', '==', userId);

// ❌ Incorrecto — expondría datos de otros usuarios
// (Solo permitido en Cloud Functions internas, NO en API pública)
```

---

## 2. Timestamps y Fechas

### Regla: Usar timestampFromDate para convertir strings a Timestamp

```typescript
// ✅ Correcto
if (dto.reminder_at) {
  updates['reminder_at'] = this.firestore.timestampFromDate(new Date(dto.reminder_at));
}

// ⚠️ Cuidado: No usar new Date() directamente en Firestore
// Firestore almacenará un objeto Date de JS, no un Timestamp de Firestore
```

### Regla: No esparcir Timestamps de Firestore en DTOs

```typescript
// ❌ Incorrecto — restaurar versión esparce Timestamps raw
const updateDto = {
  ...noteData, // Esto incluye created_at, updated_at como Timestamps
  content: restoredContent,
} as UpdateNoteDto;

// ✅ Correcto — construir explícitamente
const updateDto = {
  title: noteData['title'],
  content: restoredContent,
  // No incluir fields como created_at, user_id, etc.
} as UpdateNoteDto;
```

---

## 3. Transacciones

### Regla: Usar transacciones para operaciones read-modify-write

```typescript
// ❌ Incorrecto — race condition
const notebook = await this.getNotebook(id);
if (notebook.noteCount > 0) throw new Error('Not empty');
await this.deleteNotebook(id); // another request could add note between check and delete

// ✅ Correcto — transacción atómica
await this.firestore.runTransaction(async (transaction) => {
  const notebook = await transaction.get(notebookRef);
  const data = notebook.data() as Record<string, unknown>;
  if ((data['note_count'] as number) > 0) {
    throw new Error('Not empty');
  }
  transaction.delete(notebookRef);
});
```

---

## 4. Índices Compuestos

### Regla: Conocer los índices requeridos

Firestore requiere índices compuestos para queries con múltiples filtros de rango:

```typescript
// Requiere índice compuesto: user_id + updated_at
q = q.where('user_id', '==', userId).orderBy('updated_at', 'desc');

// Requiere índice compuesto: user_id + tags + updated_at
q = q.where('user_id', '==', userId)
    .where('tags', 'array-contains-any', tags)
    .orderBy('updated_at', 'desc');
```

### Índices requeridos para AppNotesBG (de NEGOCIO.md)

```javascript
// Notas
db.collection('notes').createIndex({ 'user_id': 1, 'updated_at': -1 });
db.collection('notes').createIndex({ 'user_id': 1, 'tags': 1, 'updated_at': -1 });
db.collection('notes').createIndex({ 'notebook_id': 1, 'updated_at': -1 });

// Historial
db.collection('note_history').createIndex({ 'note_id': 1, 'version': -1 });

// Auditoría
db.collection('audit_logs').createIndex({ 'user_id': 1, 'timestamp': -1 });
```

---

## 5. Validación de Ownership

### Regla: Siempre verificar ownership en el servicio, nunca confiar solo en el guard

```typescript
// ✅ Correcto — verificar ownership en el servicio
async findOne(noteId: string, userId: string) {
  const snap = await this.firestore.getDoc('notes', noteId);
  if (!snap.exists) throw new NotFoundException();
  
  const data = snap.data() as Record<string, unknown>;
  if (data['user_id'] !== userId) {
    // Usar NotFoundException, no ForbiddenException
    throw new NotFoundException('Nota no encontrada');
  }
  return data;
}
```

### Regla: Usar NotFoundException para ownership failures (evita enumeración)

```typescript
// ❌ Incorrecto — revela que el recurso existe
if (data['user_id'] !== userId) {
  throw new ForbiddenException('Sin acceso a esta nota');
}

// ✅ Correcto — no revela existencia del recurso
if (data['user_id'] !== userId) {
  throw new NotFoundException('Nota no encontrada');
}
```

---

## 6. Contadores y Agregaciones

### Regla: Usar increment() para contadores atómicos

```typescript
// ✅ Correcto — atómico
batch.update(notebookRef, {
  note_count: this.firestore.increment(1), // +1
  // o
  note_count: this.firestore.increment(-1), // -1
});

// ❌ Incorrecto — race condition
const current = (notebook.data()['note_count'] as number) || 0;
batch.update(notebookRef, { note_count: current + 1 });
```

---

## 7. Imports y Tipos

### Regla: Usar Record<string, unknown> para DocumentData

```typescript
// ✅ Correcto — acceso seguro con cast
const data = snap.data() as Record<string, unknown>;
const userId = data['user_id'] as string;

// ❌ Evitar — any implícito
const data: any = snap.data();
```

---

## Historial de cambios

| Fecha | Cambio |
|---|---|
| 2026-02-14 | Creación inicial desde segunda auditoría de seguridad |
