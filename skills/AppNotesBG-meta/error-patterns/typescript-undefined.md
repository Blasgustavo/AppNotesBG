# typescript-undefined — Patrones de error AppNotesBG

## Tecnologia
TypeScript (Angular 21 + NestJS 10+)

## Descripcion
Coleccion de patrones para errores relacionados con `undefined`, `null`, tipos implicitos y acceso inseguro a propiedades. Son los errores mas frecuentes en el stack TypeScript estricto del proyecto.

---

## Patron 1 — Acceso a propiedad de objeto posiblemente undefined

### Mensaje de error
```
Object is possibly 'undefined'. ts(2532)
Cannot read properties of undefined (reading '<property>')
```

### Causa raiz
Acceso directo a propiedades sin verificar si el objeto existe.

### Ejemplo del problema
```typescript
// notas.service.ts
const title = note.metadata.title;
const userId = user.profile.uid;
```

### Fix aplicado
```typescript
// Usar optional chaining
const title = note?.metadata?.title;
const userId = user?.profile?.uid;

// Si necesitas un valor por defecto
const title = note?.metadata?.title ?? 'Sin titulo';
```

### Regla de prevencion
**Siempre usar `?.` al acceder a propiedades de objetos que vienen de Firestore, APIs externas o inputs del usuario. Asumir que cualquier objeto externo puede ser `undefined`.**

### Aplica en
- Servicios Angular que consumen datos de Firestore
- DTOs en NestJS antes de validar con `class-validator`
- Callbacks de Algolia con resultados de busqueda
- Respuestas de Google Gemini API

---

## Patron 2 — Tipo `any` explicito o implicito

### Mensaje de error
```
Unexpected any. Specify a different type. @typescript-eslint/no-explicit-any
Parameter 'x' implicitly has an 'any' type. ts(7006)
```

### Causa raiz
No tipar parametros de funciones o usar `any` como atajo para resolver errores de tipos.

### Ejemplo del problema
```typescript
// MAL — any explicito
function processNote(data: any) {
  return data.title;
}

// MAL — any implicito
function processNote(data) {
  return data.title;
}

// MAL — as any para resolver error
const note = response as any;
```

### Fix aplicado
```typescript
// Importar o definir el tipo correcto
import { NoteDto } from '../dto/note.dto';

function processNote(data: NoteDto): string {
  return data.title;
}

// Si el tipo es desconocido temporalmente, usar unknown y hacer type guard
function processNote(data: unknown): string {
  if (typeof data === 'object' && data !== null && 'title' in data) {
    return (data as NoteDto).title;
  }
  return '';
}
```

### Regla de prevencion
**Nunca usar `any`. Si el tipo no se conoce, usar `unknown` y aplicar type guard. Los tipos de Firestore se definen en `src/shared/types/` o en los DTOs correspondientes.**

### Aplica en
- Todos los servicios y componentes Angular
- Todos los controladores y servicios NestJS
- Cloud Functions

---

## Patron 3 — Array sin verificacion antes de acceder por indice

### Mensaje de error
```
Object is possibly 'undefined'. ts(2532)
TypeError: Cannot read properties of undefined (reading 'id')
```

### Causa raiz
Acceder a `array[0]` o `array[n]` sin verificar que el elemento existe.

### Ejemplo del problema
```typescript
// MAL
const firstNote = notes[0].id;
const lastTag = note.tags[note.tags.length - 1];
```

### Fix aplicado
```typescript
// Usar optional chaining con indice
const firstNote = notes[0]?.id;

// Preferir Array.at() para claridad
const lastTag = note.tags.at(-1);
const firstNote = notes.at(0)?.id;

// Si el array puede estar vacio y necesitas un valor
const firstNote = notes.length > 0 ? notes[0].id : null;
```

### Regla de prevencion
**Siempre usar `?.` o `.at()` al acceder a elementos de arrays. Verificar `array.length > 0` antes de iterar si el array puede venir vacio de Firestore.**

### Aplica en
- Listas de notas, tags, adjuntos, colaboradores
- Resultados de queries de Firestore
- Resultados de busqueda de Algolia

---

## Patron 4 — Parametro de funcion sin valor por defecto

### Mensaje de error
```
Expected 2 arguments, but got 1. ts(2554)
```

### Causa raiz
Funciones con parametros opcionales sin valor por defecto, o llamadas sin todos los argumentos.

### Ejemplo del problema
```typescript
// MAL
function getNotes(userId: string, options: QueryOptions) {
  const limit = options.limit;
}

// La llamada falla si options no se pasa
getNotes('uid123');
```

### Fix aplicado
```typescript
// Dar valor por defecto al parametro
function getNotes(userId: string, options: QueryOptions = {}): Promise<Note[]> {
  const limit = options.limit ?? 20;
  return [];
}

// Para interfaces, definir campos opcionales correctamente
interface QueryOptions {
  limit?: number;
  orderBy?: string;
  startAfter?: string;
}
```

### Regla de prevencion
**Siempre asignar valores por defecto a parametros opcionales. Marcar campos opcionales con `?` en interfaces y DTOs. Usar `??` para coalescencia nula en lugar de `||`.**

### Aplica en
- Metodos de servicio con opciones de query
- Metodos de componentes con @Input() opcionales
- Funciones de utilidad compartidas

---

## Patron 5 — Propiedad de componente Angular sin inicializar

### Mensaje de error
```
Property 'notes' has no initializer and is not definitely assigned in the constructor. ts(2564)
```

### Causa raiz
Angular con `strictPropertyInitialization: true` requiere que todas las propiedades esten inicializadas.

### Ejemplo del problema
```typescript
// MAL
@Component({...})
export class NotesListComponent {
  notes: Note[];
  currentUser: User;
}
```

### Fix aplicado
```typescript
// BIEN — inicializar con valor por defecto
@Component({...})
export class NotesListComponent {
  notes: Note[] = [];
  currentUser: User | null = null;

  // Para @Input() obligatorios, usar el operador de asercion
  @Input({ required: true }) noteId!: string;

  // Para valores que se asignan en ngOnInit, usar signal o inicializar
  note = signal<Note | null>(null);
}
```

### Regla de prevencion
**Siempre inicializar propiedades de componentes. Para @Input() obligatorios usar `!` con `required: true`. Preferir `signal<T | null>(null)` sobre propiedades clasicas para estado reactivo.**

### Aplica en
- Todos los componentes Angular del frontend AppNotesBG
- `src/modules/notes/`, `src/modules/auth/`, `src/modules/search/`

---

## Patron 6 — Resultado de Firestore `getDoc` sin verificar existencia

### Mensaje de error
```
Object is possibly 'undefined'. ts(2532)
Property 'data' does not exist on type 'DocumentSnapshot<...>'
```

### Causa raiz
Usar `doc.data()` sin verificar `doc.exists()` primero.

### Ejemplo del problema
```typescript
// MAL
const docSnap = await getDoc(noteRef);
const note = docSnap.data() as Note; // puede ser undefined
```

### Fix aplicado
```typescript
// BIEN — verificar existencia antes de usar
const docSnap = await getDoc(noteRef);

if (!docSnap.exists()) {
  throw new NotFoundException(`Nota ${noteId} no encontrada`);
}

const note = docSnap.data() as Note;
```

### Regla de prevencion
**Siempre verificar `docSnap.exists()` antes de llamar `.data()` en cualquier resultado de Firestore `getDoc`. Nunca asumir que un documento existe.**

### Aplica en
- Servicios NestJS que usan Firebase Admin SDK
- Cloud Functions que leen documentos de Firestore
- Servicios Angular que usan Firebase Web SDK

---

## Historial de cambios

| Fecha | Cambio |
|---|---|
| 2026-02-10 | Creacion inicial con 6 patrones del stack Angular + NestJS + Firestore |
