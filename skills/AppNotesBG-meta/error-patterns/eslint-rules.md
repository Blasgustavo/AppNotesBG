# eslint-rules — Patrones de error AppNotesBG

## Tecnologia
ESLint + @typescript-eslint + @angular-eslint + eslint-plugin-rxjs

## Descripcion
Patrones para errores y advertencias de ESLint frecuentes en el stack Angular 21 + NestJS. Incluye la regla correcta y el fix para cada caso.

---

## Patron 1 — no-explicit-any

### Mensaje de error
```
Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
```

### Causa raiz
Uso de `any` como tipo de parametro, variable o retorno.

### Ejemplo del problema
```typescript
// MAL
function transform(data: any): any {
  return data;
}
const result: any = await this.notesService.getNote(id);
```

### Fix aplicado
```typescript
// Definir el tipo correcto o usar unknown con type guard
function transform(data: NoteDto): NoteResponseDto {
  return { ...data };
}
const result: Note = await this.notesService.getNote(id);

// Si el tipo es genuinamente desconocido en runtime
function transform(data: unknown): NoteResponseDto {
  if (!isNoteDto(data)) throw new BadRequestException();
  return { ...data };
}
```

### Regla de prevencion
**Prohibido usar `any`. Siempre definir el tipo en `src/shared/types/` o usar el DTO correspondiente. Para tipos de terceros sin tipos, instalar `@types/<package>` o declarar en `src/types/global.d.ts`.**

---

## Patron 2 — no-unused-vars

### Mensaje de error
```
'variable' is defined but never used.  @typescript-eslint/no-unused-vars
```

### Causa raiz
Variables, importaciones o parametros declarados pero no usados.

### Ejemplo del problema
```typescript
// MAL
import { Component, OnInit, OnDestroy } from '@angular/core'; // OnDestroy no se usa
const unusedVar = 'test';

function process(id: string, options: Options) { // options no se usa
  return id;
}
```

### Fix aplicado
```typescript
// Eliminar importaciones no usadas
import { Component, OnInit } from '@angular/core';

// Si el parametro es requerido por la firma pero no se usa, prefijar con _
function process(id: string, _options: Options): string {
  return id;
}

// Para variables de desestructuracion no usadas
const { id, ...rest } = note; // si rest no se usa, eliminar
const { id } = note;
```

### Regla de prevencion
**Ejecutar `npm run lint` antes de cada commit. Configurar el IDE para mostrar variables no usadas en tiempo real. No prefixar con `_` como atajo — si el parametro no se usa, revisar si la firma es correcta.**

---

## Patron 3 — rxjs/no-async-subscribe

### Mensaje de error
```
Passing async functions to subscribe is not recommended.  rxjs/no-async-subscribe
```

### Causa raiz
Usar `async/await` dentro de un callback de `.subscribe()`, lo que ignora errores y crea Promesas no manejadas.

### Ejemplo del problema
```typescript
// MAL
this.notesService.getNotes().subscribe(async (notes) => {
  const processed = await this.processNotes(notes);
  this.notes = processed;
});
```

### Fix aplicado
```typescript
// BIEN — usar switchMap para operaciones async
this.notesService.getNotes().pipe(
  switchMap(notes => from(this.processNotes(notes)))
).subscribe(processed => {
  this.notes = processed;
});

// O usar toSignal con from() para Angular Signals
notes = toSignal(
  this.notesService.getNotes().pipe(
    switchMap(notes => from(this.processNotes(notes)))
  ),
  { initialValue: [] }
);
```

### Regla de prevencion
**Nunca usar `async` dentro de `.subscribe()`. Usar `switchMap` + `from()` para convertir Promesas en Observables dentro de pipes. En NestJS, usar `lastValueFrom()` o `firstValueFrom()` para convertir Observable en Promise cuando sea necesario.**

---

## Patron 4 — @typescript-eslint/explicit-function-return-type

### Mensaje de error
```
Missing return type on function.  @typescript-eslint/explicit-function-return-type
```

### Causa raiz
Funciones sin tipo de retorno explicito en servicios y clases.

### Ejemplo del problema
```typescript
// MAL
async getNote(id: string) {
  return await this.firestore.collection('notes').doc(id).get();
}

getNotes() {
  return this.notes$;
}
```

### Fix aplicado
```typescript
// BIEN — tipado de retorno explicito
async getNote(id: string): Promise<Note | null> {
  const snap = await this.firestore.collection('notes').doc(id).get();
  return snap.exists ? (snap.data() as Note) : null;
}

getNotes(): Observable<Note[]> {
  return this.notes$;
}
```

### Regla de prevencion
**Siempre declarar el tipo de retorno en metodos de servicios, controladores y funciones publicas. Las funciones de flecha en templates y callbacks simples pueden omitirlo.**

---

## Patron 5 — @angular-eslint/no-empty-lifecycle-method

### Mensaje de error
```
Lifecycle methods should not be empty.  @angular-eslint/no-empty-lifecycle-method
```

### Causa raiz
Implementar interfaces de ciclo de vida (`OnInit`, `OnDestroy`) sin contenido en el metodo.

### Ejemplo del problema
```typescript
// MAL
export class NotesComponent implements OnInit, OnDestroy {
  ngOnInit(): void {}  // vacio
  ngOnDestroy(): void {}  // vacio
}
```

### Fix aplicado
```typescript
// Opcion 1 — Eliminar la interfaz y el metodo si no se usan
export class NotesComponent {
  // sin lifecycle methods innecesarios
}

// Opcion 2 — Si OnDestroy se necesita para DestroyRef (Angular 16+)
// No implementar la interfaz, usar inject(DestroyRef)
export class NotesComponent {
  private destroyRef = inject(DestroyRef);

  ngOnInit(): void {
    this.notesService.getNotes()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(notes => this.notes.set(notes));
  }
}
```

### Regla de prevencion
**No implementar interfaces de ciclo de vida si los metodos van a estar vacios. Para manejar desuscripciones en Angular 16+, usar `inject(DestroyRef)` + `takeUntilDestroyed()` en lugar de `ngOnDestroy`.**

---

## Patron 6 — @typescript-eslint/no-floating-promises

### Mensaje de error
```
Promises must be awaited, end with a call to .catch, or end with a call to .then with a rejection handler.  @typescript-eslint/no-floating-promises
```

### Causa raiz
Llamar a funciones async sin `await` o sin manejar el rechazo de la Promesa.

### Ejemplo del problema
```typescript
// MAL
this.notesService.deleteNote(id);  // retorna Promise, no se await
this.router.navigate(['/notes']);   // retorna Promise, no se await
```

### Fix aplicado
```typescript
// BIEN — await la promesa
await this.notesService.deleteNote(id);

// Si esta en un contexto no async, agregar .catch()
this.notesService.deleteNote(id).catch(err => {
  console.error('Error al eliminar nota:', err);
});

// Para navigate de Angular Router, ignorar con void si es intencional
void this.router.navigate(['/notes']);
```

### Regla de prevencion
**Siempre `await` las Promesas en funciones `async`. Si no puedes usar `await` (contexto sincrono), encadenar `.catch()`. Usar `void` solo cuando el resultado es genuinamente irrelevante y documentar por que.**

---

## Configuracion ESLint recomendada para AppNotesBG

Las siguientes reglas deben estar activas en `.eslintrc.json`:

```json
{
  "rules": {
    "@typescript-eslint/no-explicit-any": "error",
    "@typescript-eslint/no-unused-vars": ["error", { "argsIgnorePattern": "^_" }],
    "@typescript-eslint/explicit-function-return-type": ["error", {
      "allowExpressions": true,
      "allowTypedFunctionExpressions": true
    }],
    "@typescript-eslint/no-floating-promises": "error",
    "rxjs/no-async-subscribe": "error",
    "@angular-eslint/no-empty-lifecycle-method": "error"
  }
}
```

---

## Historial de cambios

| Fecha | Cambio |
|---|---|
| 2026-02-10 | Creacion inicial con 6 patrones ESLint mas frecuentes del stack |
