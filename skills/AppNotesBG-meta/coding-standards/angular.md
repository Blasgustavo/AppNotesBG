# coding-standards/angular.md — Convenciones Angular para AppNotesBG

> Archivo creado al corregir errores Angular detectados durante el setup inicial.
> Cada convencion documenta el error especifico que la origino.

---

## 1. Signals — derivaciones con `computed()`

**Regla:** Nunca usar un `signal()` que se actualiza manualmente en multiples lugares.
Usar siempre `computed()` para valores derivados.

**Error que la origino:** `filteredNotes` era un `signal<Note[]>` que se llamaba
`.set()` tanto en `setNotes()` como en `setSearchQuery()`, causando inconsistencias
cuando uno de los dos actualizaba sin que el otro se ejecutara.

```typescript
// CORRECTO
readonly filteredNotes = computed(() => {
  const query = this.searchQuery().toLowerCase();
  return !query
    ? this.notes()
    : this.notes().filter(n => n.title.toLowerCase().includes(query));
});

// INCORRECTO
readonly filteredNotes = signal<Note[]>([]);
setNotes(notes: Note[]) { this.filteredNotes.set(notes); }       // lugar 1
setSearchQuery(q: string) { this.filteredNotes.set(...); }       // lugar 2 — RACE CONDITION
```

---

## 2. Signals — `.map()` no existe en Signal

**Regla:** `signal.map()` no es una API valida en Angular Signals. Usar `computed()`.

**Error que lo origino:** `this.currentUser.map(user => !!user)` en `StateService`,
que compila pero falla en runtime porque `Signal<T>` no tiene metodo `.map()`.

```typescript
// CORRECTO
readonly isAuthenticated = computed(() => !!this.currentUser());

// INCORRECTO — Signal no tiene .map()
readonly isAuthenticated = this.currentUser.map(user => !!user); // ERROR en runtime
```

---

## 3. Signals — efectos secundarios con `effect()`, no `.subscribe()`

**Regla:** Los Signals NO tienen `.subscribe()`. Para efectos secundarios en respuesta
a cambios de un Signal, usar `effect()` en el constructor del componente o servicio.

**Error que lo origino:** `this.stateService.editorContent.subscribe(newContent => {...})`
en `NoteEditorComponent`, que compila con error TS porque `.subscribe()` no existe en Signal.

```typescript
// CORRECTO — en el constructor
constructor() {
  effect(() => {
    const content = this.editorState.editorContent();
    if (this.editor() && !this.isDirty()) {
      this.editor()!.commands.setContent(content);
    }
  });
}

// INCORRECTO
this.editorState.editorContent.subscribe(content => { ... }); // TypeError
```

---

## 4. Outputs — `output<T>()` en lugar de `new EventEmitter<T>()`

**Regla:** En Angular 17+, usar la funcion `output<T>()` del API de Signals para
declarar outputs de componentes. `EventEmitter` queda obsoleto.

**Error que lo origino:** `save = new EventEmitter<{...}>()` en `NoteEditorComponent`
(patron Angular < 17).

```typescript
// CORRECTO (Angular 17+)
import { output } from '@angular/core';
contentChange = output<TipTapJSON>();
save = output<{ title: string; content: TipTapJSON }>();

// INCORRECTO (pre Angular 17)
import { EventEmitter } from '@angular/core';
save = new EventEmitter<{ title: string; content: TipTapJSON }>(); // obsoleto
```

> Nota: `.emit()` funciona igual en ambos — no cambia el template ni el padre.

---

## 5. Control flow — `@if` / `@for` en lugar de `*ngIf` / `*ngFor`

**Regla:** En Angular 17+, usar la sintaxis de control flow declarativa en templates.
No usar directivas estructurales `*ngIf`, `*ngFor`, `*ngSwitch`.

**Error que lo origino:** `<p *ngIf="!isEditorReady()">` en el template de `NoteEditorComponent`.
En componentes standalone modernos `*ngIf` requiere importar `CommonModule` innecesariamente.

```html
<!-- CORRECTO -->
@if (!isEditorReady()) {
  <p>Cargando editor...</p>
}

@for (note of notes(); track note.id) {
  <app-note-card [note]="note" />
}

<!-- INCORRECTO (pre Angular 17) -->
<p *ngIf="!isEditorReady()">Cargando editor...</p>        <!-- requiere CommonModule -->
<app-note-card *ngFor="let note of notes()"></app-note-card>
```

---

## 6. Imports de template — no importar `CommonModule` si se usa control flow moderno

**Regla:** Si el componente standalone usa `@if` / `@for` (control flow moderno),
no es necesario importar `CommonModule`. Hacerlo infla el bundle innecesariamente.

**Error que lo origino:** `imports: [CommonModule]` en `NoteEditorComponent` coexistia
con `*ngIf`, lo cual era inconsistente. Al migrar a `@if`, se elimino `CommonModule`.

```typescript
// CORRECTO — sin CommonModule si se usa control flow moderno
@Component({
  standalone: true,
  imports: [],   // o solo los modulos que realmente se necesitan
  template: `@if (loaded()) { <div>...</div> }`
})

// INCORRECTO — CommonModule innecesario si ya se usa @if
imports: [CommonModule]
```

---

## 7. TipTap — no pasar extensiones redundantes a `StarterKit.configure()`

**Regla:** `StarterKit` ya incluye `Document`, `Text` y `Paragraph`. Pasarlos como
instancias en `.configure()` causa conflictos de registros de extension duplicados.

**Error que lo origino:** `StarterKit.configure({ document: Document, text: Text, paragraph: Paragraph })`
en `NoteEditorComponent`, que causa warnings de TipTap sobre extensiones duplicadas.

```typescript
// CORRECTO
extensions: [StarterKit]

// INCORRECTO — Document, Text, Paragraph ya estan en StarterKit
extensions: [
  StarterKit.configure({
    document: Document,   // redundante — ya incluido
    text: Text,           // redundante — ya incluido
    paragraph: Paragraph, // redundante — ya incluido
  }),
]
```

---

## Historial

| Fecha | Origen |
|---|---|
| 2026-02-11 | Creado al corregir 7 errores en setup inicial de AppNotesBG |
