# angular-rxjs-memory-leaks — Patrones de error AppNotesBG

## Tecnologia
Angular 21 + RxJS 7+

## Descripcion
Patrones para detectar y prevenir memory leaks causados por suscripciones no cerradas a Observables en componentes Angular. Es uno de los errores mas comunes y dificiles de detectar en runtime.

---

## Patron 1 — Subscribe sin desuscripcion en componente

### Mensaje de error
```
// No hay error en consola — el leak es silencioso
// Sintoma: el componente sigue recibiendo eventos despues de ser destruido
// Sintoma: memoria del browser crece progresivamente
```

### Causa raiz
Llamar a `.subscribe()` en el `ngOnInit` de un componente sin cerrar la suscripcion cuando el componente se destruye.

### Ejemplo del problema
```typescript
// MAL
@Component({...})
export class NotesListComponent implements OnInit {
  notes: Note[] = [];

  constructor(private notesService: NotesService) {}

  ngOnInit(): void {
    // Esta suscripcion NUNCA se cierra
    this.notesService.getNotes().subscribe(notes => {
      this.notes = notes;
    });
  }
}
```

### Fix aplicado
```typescript
// BIEN — Angular 16+ con inject(DestroyRef)
@Component({...})
export class NotesListComponent implements OnInit {
  private destroyRef = inject(DestroyRef);
  notes: Note[] = [];

  constructor(private notesService: NotesService) {}

  ngOnInit(): void {
    this.notesService.getNotes()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(notes => {
        this.notes = notes;
      });
  }
}
```

### Regla de prevencion
**Todo `.subscribe()` dentro de un componente Angular DEBE tener `takeUntilDestroyed(this.destroyRef)` en el pipe. Declarar `private destroyRef = inject(DestroyRef)` en todos los componentes que se suscriban a Observables.**

---

## Patron 2 — Multiples suscripciones acumuladas

### Mensaje de error
```
// Silencioso — cada navegacion al componente agrega una suscripcion nueva
// Sintoma: los callbacks se ejecutan N veces (N = numero de visitas al componente)
```

### Causa raiz
Suscripciones dentro de metodos que se llaman multiples veces sin limpiar las anteriores.

### Ejemplo del problema
```typescript
// MAL
@Component({...})
export class NoteEditorComponent {
  loadNote(noteId: string): void {
    // Cada llamada agrega una suscripcion nueva sin cerrar la anterior
    this.notesService.getNote(noteId).subscribe(note => {
      this.currentNote = note;
    });
  }
}
```

### Fix aplicado
```typescript
// BIEN — usar switchMap para cancelar la suscripcion anterior automaticamente
@Component({...})
export class NoteEditorComponent implements OnInit {
  private destroyRef = inject(DestroyRef);
  private noteId$ = new BehaviorSubject<string>('');
  currentNote: Note | null = null;

  ngOnInit(): void {
    this.noteId$.pipe(
      switchMap(id => id ? this.notesService.getNote(id) : of(null)),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe(note => {
      this.currentNote = note;
    });
  }

  loadNote(noteId: string): void {
    this.noteId$.next(noteId); // switchMap cancela la anterior automaticamente
  }
}
```

### Regla de prevencion
**Nunca llamar `.subscribe()` dentro de metodos que se invocan multiples veces. Centralizar las suscripciones en `ngOnInit` usando `switchMap` para cambiar la fuente de datos reactivamente.**

---

## Patron 3 — Suscripcion a Firestore `onSnapshot` sin unsubscribe

### Mensaje de error
```
// Silencioso — el listener de Firestore sigue activo y facturando lecturas
// Sintoma: costos de Firestore inesperadamente altos
// Sintoma: callbacks ejecutandose en componentes destruidos
```

### Causa raiz
Usar `onSnapshot` de Firestore directamente sin guardar la funcion `unsubscribe` que retorna.

### Ejemplo del problema
```typescript
// MAL
ngOnInit(): void {
  onSnapshot(collection(this.firestore, 'notes'), (snapshot) => {
    this.notes = snapshot.docs.map(d => d.data() as Note);
  });
  // El listener NUNCA se cierra
}
```

### Fix aplicado
```typescript
// BIEN — usar collectionData/docData de @angular/fire que retorna Observable
// O guardar y llamar la funcion unsubscribe manualmente

// Opcion 1 (recomendada) — Angular Fire con Observable
@Component({...})
export class NotesListComponent implements OnInit {
  private destroyRef = inject(DestroyRef);

  ngOnInit(): void {
    collectionData(
      query(collection(this.firestore, 'notes'),
        where('user_id', '==', this.userId)
      ),
      { idField: 'id' }
    ).pipe(
      takeUntilDestroyed(this.destroyRef)
    ).subscribe(notes => {
      this.notes = notes as Note[];
    });
  }
}

// Opcion 2 — onSnapshot manual con cleanup
@Component({...})
export class NotesListComponent implements OnInit, OnDestroy {
  private unsubscribeFirestore?: () => void;

  ngOnInit(): void {
    this.unsubscribeFirestore = onSnapshot(
      collection(this.firestore, 'notes'),
      (snapshot) => {
        this.notes = snapshot.docs.map(d => d.data() as Note);
      }
    );
  }

  ngOnDestroy(): void {
    this.unsubscribeFirestore?.();
  }
}
```

### Regla de prevencion
**Preferir `@angular/fire` (`collectionData`, `docData`) sobre el SDK nativo de Firebase para obtener Observables en lugar de callbacks. Si se usa `onSnapshot` directamente, siempre guardar la funcion de unsubscribe y llamarla en `ngOnDestroy`.**

---

## Patron 4 — async pipe olvidado causa suscripcion huerfana

### Mensaje de error
```
// Silencioso — el Observable se crea pero nunca se suscribe
// Sintoma: la UI no se actualiza aunque el servicio retorna datos
```

### Causa raiz
Olvidar el `async` pipe en el template al usar Observables directamente.

### Ejemplo del problema
```typescript
// notas-list.component.ts
notes$ = this.notesService.getNotes(); // Observable<Note[]>
```
```html
<!-- MAL — falta el async pipe -->
<div *ngFor="let note of notes$">{{ note.title }}</div>

<!-- BIEN — con async pipe -->
<div *ngFor="let note of notes$ | async">{{ note.title }}</div>
```

### Fix aplicado
```typescript
// Alternativa con signal — Angular 17+
notes = toSignal(this.notesService.getNotes(), { initialValue: [] });
```
```html
<!-- Con signal, sin async pipe -->
@for (note of notes(); track note.id) {
  <div>{{ note.title }}</div>
}
```

### Regla de prevencion
**Si el Observable se usa en el template, siempre usar `async` pipe o convertirlo a Signal con `toSignal()`. Si se suscribe manualmente en el componente, usar `takeUntilDestroyed`. Nunca mezclar ambos enfoques para el mismo dato.**

---

## Patron 5 — combineLatest / forkJoin sin manejo de errores

### Mensaje de error
```
ERROR: Unhandled Promise rejection / Observable error
// Sintoma: si uno de los Observables falla, toda la cadena se rompe
```

### Causa raiz
`combineLatest` y `forkJoin` propagan errores de cualquiera de sus fuentes y terminan el Observable combinado.

### Ejemplo del problema
```typescript
// MAL — si getNote() falla, toda la suscripcion muere
combineLatest([
  this.notesService.getNote(noteId),
  this.authService.currentUser$
]).subscribe(([note, user]) => {
  this.note = note;
  this.user = user;
});
```

### Fix aplicado
```typescript
// BIEN — catchError en cada fuente individual
combineLatest([
  this.notesService.getNote(noteId).pipe(
    catchError(err => {
      console.error('Error cargando nota:', err);
      return of(null);
    })
  ),
  this.authService.currentUser$
]).pipe(
  takeUntilDestroyed(this.destroyRef)
).subscribe(([note, user]) => {
  this.note = note;
  this.user = user;
});
```

### Regla de prevencion
**Siempre agregar `catchError` en cada fuente de `combineLatest` o `forkJoin` que pueda fallar (llamadas a Firestore, APIs externas, Algolia). Retornar `of(null)` o un valor por defecto para que el stream combinado continue funcionando.**

---

## Resumen de patrones de desuscripcion por contexto

| Contexto | Patron recomendado |
|---|---|
| Componente Angular 16+ | `inject(DestroyRef)` + `takeUntilDestroyed()` |
| Componente Angular < 16 | `Subject` + `takeUntil()` + `ngOnDestroy` |
| Observable en template | `async` pipe o `toSignal()` |
| `onSnapshot` de Firestore | `@angular/fire` `collectionData` / `docData` |
| Multiples fuentes | `combineLatest` + `catchError` en cada fuente |
| Cambio de parametro reactivo | `switchMap` desde un `BehaviorSubject` |

---

## Historial de cambios

| Fecha | Cambio |
|---|---|
| 2026-02-10 | Creacion inicial con 5 patrones de memory leaks Angular/RxJS |
