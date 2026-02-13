# Coding Standards — TypeScript (AppNotesBG)

> Creado: 2026-02-13 | Origen: audit de seguridad P3

---

## 1. Configuración del Compilador

### tsconfig.json — configuración strict obligatoria
```json
{
  "compilerOptions": {
    "noImplicitAny": true,          // Sin any implícito
    "strictNullChecks": true,        // null/undefined explícitos
    "strictBindCallApply": true,     // Verificación de tipos en bind/call/apply
    "noFallthroughCasesInSwitch": true, // switch sin fall-through accidental
    "forceConsistentCasingInFileNames": true
  }
}
```

---

## 2. Uso de `any`

### Regla: Evitar `any` — usar tipos explícitos o `unknown`
```typescript
// ❌ Incorrecto
async update(reminderId: string, userId: string, updateData: any) {}

// ✅ Correcto — tipo específico
async update(reminderId: string, userId: string, updateData: UpdateReminderDto) {}

// ✅ Aceptable cuando es inevitable (ej: respuesta de SDK externo)
const result = await (this.client as any).search({ ... });
// Documentar por qué se usa any
```

### Regla: `unknown` para valores de origen externo/desconocido
```typescript
// Para datos de Firestore cuya estructura no se conoce en compilación:
const data = snap.data() as Record<string, unknown>;
const userId = data['user_id'] as string; // Cast explícito cuando se usa
```

---

## 3. Acceso a Propiedades de Firestore

### Patrón estándar para DocumentData de Firestore
```typescript
const snap = await this.firestore.getDoc('collection', 'docId');
if (!snap.exists) {
  throw new NotFoundException('Not found');
}

// Cast a Record<string, unknown> para acceso con índice
const data = snap.data() as Record<string, unknown>;

// Cast explícito al tipo concreto al usar el valor
const userId = data['user_id'] as string;
const timestamp = data['created_at'] as FirebaseFirestore.Timestamp;
const date = timestamp?.toDate();
```

---

## 4. Imports

### Regla: Siempre imports estáticos — nunca require() dinámico
```typescript
// ❌ Incorrecto — require dinámico dentro de función
function hash(data: string) {
  const crypto = require('crypto'); // Anti-patrón
  return crypto.createHash('sha256').update(data).digest('hex');
}

// ✅ Correcto — import estático en el tope
import { createHash } from 'crypto';
function hash(data: string) {
  return createHash('sha256').update(data).digest('hex');
}
```

### Regla: `import type` para tipos que no necesitan runtime
```typescript
import type { TipTapDocument } from '../../../../shared/types/tiptap.types';
```

---

## 5. Tipos Compartidos

### Regla: Tipos en `/shared/types/` para frontend y backend
- El directorio `/shared/types/` es compartido entre Angular y NestJS
- Los tipos deben ser compatibles con ambos entornos (no usar APIs de Node ni del browser)
- Los type guards (`is*`) deben ser funciones puras sin side effects

### TipTapDocument — siempre incluir schema_version
```typescript
// ✅ Correcto
const doc: TipTapDocument = {
  schema_version: '2.0',
  type: 'doc',
  content: [{ type: 'paragraph', content: [] }],
};

// Usar helper para documentos vacíos
import { createEmptyTipTapDocument } from '../../../shared/types/tiptap.types';
const empty = createEmptyTipTapDocument();
```

---

## 6. Enums y Uniones de Tipo

### Preferir uniones de string sobre enums en DTOs
```typescript
// ✅ Preferido en DTOs — más claro en Swagger y JSON
@IsEnum(['pending', 'clean', 'infected', 'quarantine'])
virus_scan_status?: 'pending' | 'clean' | 'infected' | 'quarantine';

// Aceptable para constantes internas
enum ReminderStatus {
  PENDING = 'pending',
  SENT = 'sent',
}
```

---

## 7. Null Safety

### Regla: Optional chaining y nullish coalescing
```typescript
// ✅ Optional chaining para acceso a propiedades posiblemente undefined
const reminderAt = (data['reminder_at'] as FirebaseFirestore.Timestamp | undefined)?.toDate();

// ✅ Nullish coalescing para valores por defecto
const count = (data['repeat_count'] as number) ?? 1;

// ❌ Evitar assertions no nulas (!) sin verificación previa
const name = data['name']!; // Riesgo de runtime error
```

---

## Historial de cambios

| Fecha | Cambio |
|---|---|
| 2026-02-13 | Creación inicial desde audit de seguridad P3 |
