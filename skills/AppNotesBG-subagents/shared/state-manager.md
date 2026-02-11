# state-manager — Subagente de Estado Reactivo (Angular Signals)

## Responsabilidad

Gestionar el estado reactivo del frontend usando Angular Signals correctamente.
Este subagente es invocado por cualquier agente que necesite leer o escribir estado global.

---

## Arquitectura de servicios de estado

El estado global esta dividido en 4 servicios por dominio ubicados en
`AppNotesBG/src/app/core/state/`:

| Servicio | Archivo | Dominio | Signals clave |
|---|---|---|---|
| `AuthStateService` | `auth-state.service.ts` | Autenticacion | `currentUser`, `isAuthenticated` (computed) |
| `NotesStateService` | `notes-state.service.ts` | Notas y libretas | `notes`, `filteredNotes` (computed), `selectedNote`, `notebooks`, `currentNotebook` |
| `EditorStateService` | `editor-state.service.ts` | Editor TipTap | `editorContent`, `isEditorDirty`, `isEditing` |
| `UiStateService` | `ui-state.service.ts` | UI global | `isLoading`, `error`, `searchQuery` |

> `StateService` en `shared/services/state.service.ts` es un facade deprecado
> que re-exporta los 4 servicios por compatibilidad. **No agregar logica nueva ahi.**

---

## Reglas obligatorias (de AGENTS.md regla #10)

```
signal()    → estado mutable primitivo
computed()  → derivaciones — NUNCA Signal actualizado en multiples lugares
effect()    → efectos secundarios — NUNCA .subscribe() en un Signal
input()     → inputs de componente — NUNCA @Input() decorator
output()    → outputs de componente — NUNCA new EventEmitter()
@if / @for  → control flow — NUNCA *ngIf / *ngFor
```

---

## Patron correcto: computed() para derivaciones

```typescript
// CORRECTO
readonly filteredNotes = computed(() => {
  const query = this.uiState.searchQuery().toLowerCase();
  const notes = this.notes();
  if (!query) return notes;
  return notes.filter(note => note.title.toLowerCase().includes(query));
});

// INCORRECTO — nunca actualizar un Signal manualmente en multiples lugares
readonly filteredNotes = signal<Note[]>([]);
setNotes(notes: Note[]) { this.filteredNotes.set(notes); }       // lugar 1
setSearchQuery(q: string) { this.filteredNotes.set(...); }       // lugar 2 — MAL
```

---

## Patron correcto: effect() para efectos secundarios

```typescript
// CORRECTO — en el constructor del componente
constructor() {
  effect(() => {
    const content = this.editorState.editorContent();
    if (this.editor() && !this.isDirty()) {
      this.editor()!.commands.setContent(content);
    }
  });
}

// INCORRECTO — .subscribe() no existe en Signals
this.editorState.editorContent.subscribe(content => { ... }); // ERROR
```

---

## Patron correcto: output() para eventos de componente

```typescript
// CORRECTO (Angular 17+)
contentChange = output<TipTapJSON>();
save = output<{ title: string; content: TipTapJSON }>();

// INCORRECTO
contentChange = new EventEmitter<TipTapJSON>(); // MAL en Angular 17+
```

---

## Dependencias entre servicios

`NotesStateService` inyecta `UiStateService` para leer `searchQuery` en `filteredNotes`.
Los demas servicios son independientes entre si.

```
UiStateService          (sin dependencias)
AuthStateService        (sin dependencias)
EditorStateService      (sin dependencias)
NotesStateService  →  inject(UiStateService)
```

---

## Cuando invocar este subagente

- Cualquier agente que cree o modifique un componente Angular con estado
- Al crear nuevos signals, computed o effects en el frontend
- Al migrar codigo legado que use `@Input()`, `new EventEmitter()`, `*ngIf` o `.subscribe()`

---

## Historial

| Fecha | Cambio |
|---|---|
| 2026-02-11 | Creacion — derivado de la division de StateService en 4 servicios de dominio |
