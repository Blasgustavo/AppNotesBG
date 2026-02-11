# error-handler — Meta-skill AppNotesBG

## Rol
Detectar errores durante la generacion de codigo, aplicar el fix automaticamente, documentar el patron en `/error-patterns/` y propagar el aprendizaje al arbol de skills via `sync-agents.md`.

## Nivel
meta

## Dominio
meta

## Activacion
**Automatica** — se invoca inmediatamente cuando ocurre cualquier error durante la generacion de codigo, compilacion, lint o tests. No esperar a que el error se repita.

---

## Flujo de ejecucion

```
Error detectado
    │
    ▼
1. Identificar el error (mensaje exacto + contexto)
    │
    ▼
2. Buscar en /skills/AppNotesBG-meta/error-patterns/
    │
    ├── ENCONTRADO → Aplicar fix documentado → Fin
    │
    └── NO ENCONTRADO
            │
            ▼
        3. Analizar causa raiz
            │
            ▼
        4. Aplicar fix
            │
            ▼
        5. Verificar que el fix resuelve el error
            │
            ▼
        6. Crear/actualizar archivo en /error-patterns/<tecnologia>.md
            │
            ▼
        7. ¿El error revela una convencion general no documentada?
            │
            ├── SI → Crear/actualizar /coding-standards/<tecnologia>.md
            │         con la convencion general que el error revelo
            │
            └── NO → Saltar
            │
            ▼
        8. Invocar sync-agents.md para propagar
```

### Diferencia entre error-patterns y coding-standards

| | `error-patterns/` | `coding-standards/` |
|---|---|---|
| **Que contiene** | Error especifico + fix puntual | Convencion general de la tecnologia |
| **Granularidad** | Un patron por error | Guia completa de como codificar |
| **Ejemplo** | "`Object is possibly undefined` → usar `?.`" | "Todo acceso a props externas usa optional chaining" |
| **Cuando crece** | Cada error nuevo | Solo cuando el error revela una convencion NO documentada |
| **Trazabilidad** | Independiente | Referencia al error que origino cada convencion |

---

## Protocolo de entrada

```json
{
  "error_message": "string — mensaje exacto del error",
  "error_type": "typescript | eslint | runtime | firestore | angular | nestjs | rxjs | playwright",
  "file_path": "string — archivo donde ocurrio",
  "line_number": "number | null",
  "code_context": "string — fragmento de codigo que genero el error",
  "stack_trace": "string | null"
}
```

---

## Protocolo de salida

```json
{
  "resolved": true,
  "fix_applied": "descripcion del fix",
  "pattern_existed": false,
  "pattern_file": "skills/AppNotesBG-meta/error-patterns/typescript-undefined.md",
  "pattern_created": true,
  "sync_invoked": true
}
```

---

## Clasificacion de errores por tecnologia

| Tecnologia | Archivo de patrones | Archivo de standards | Errores tipicos |
|---|---|---|---|
| TypeScript | `error-patterns/typescript-undefined.md` | `coding-standards/typescript.md` | undefined, null, any implicito, tipos faltantes |
| ESLint | `error-patterns/eslint-rules.md` | `coding-standards/typescript.md` | no-explicit-any, unused-vars, no-async-subscribe |
| Angular | `error-patterns/angular-rxjs-memory-leaks.md` | `coding-standards/angular.md` | memory leaks, subscripciones no cerradas |
| RxJS | `error-patterns/angular-rxjs-memory-leaks.md` | `coding-standards/rxjs.md` | operadores incorrectos, streams no completados |
| Firestore Rules | `error-patterns/firestore-rules-errors.md` | `coding-standards/firestore.md` | permisos denegados, reglas mal escritas |
| NestJS | *(se crea al ocurrir el primer error)* | `coding-standards/nestjs.md` | DTOs, guards, pipes, excepciones |
| TipTap | *(se crea al ocurrir el primer error)* | `coding-standards/tiptap.md` | manipulacion JSON, extensiones, sanitizacion |
| Algolia | *(se crea al ocurrir el primer error)* | `coding-standards/algolia.md` | indexacion, filtros, paginacion |

---

## Reglas de prevencion — Leer ANTES de generar codigo

Antes de generar cualquier codigo TypeScript/Angular/NestJS, revisar estos patrones:

### TypeScript — Reglas activas

1. **Siempre usar optional chaining** para acceso a propiedades de objetos que pueden ser undefined:
   ```typescript
   // MAL
   const name = user.profile.name;
   // BIEN
   const name = user?.profile?.name;
   ```

2. **Nunca usar `any` explicito o implicito** — tipar siempre:
   ```typescript
   // MAL
   function process(data: any) {}
   // BIEN
   function process(data: NoteDto) {}
   ```

3. **Siempre verificar arrays antes de acceder por indice**:
   ```typescript
   // MAL
   const first = items[0].id;
   // BIEN
   const first = items[0]?.id;
   // O mejor
   const first = items.at(0)?.id;
   ```

4. **Siempre proporcionar valores por defecto en parametros**:
   ```typescript
   // MAL
   function getNote(id: string, options: Options) {}
   // BIEN
   function getNote(id: string, options: Options = {}) {}
   ```

5. **Usar `strictNullChecks` — nunca desactivar**

### Angular — Reglas activas

1. **Siempre desuscribirse en `ngOnDestroy`** usando `takeUntilDestroyed()` o `Subject` + `takeUntil`:
   ```typescript
   // BIEN — Angular 16+
   private destroyRef = inject(DestroyRef);
   this.service.data$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe();
   ```

2. **Nunca subscribirse dentro de otro subscribe** — usar `switchMap`, `mergeMap`, `concatMap`

3. **Inicializar propiedades del componente** — no dejar `undefined` implicito:
   ```typescript
   // MAL
   notes: Note[];
   // BIEN
   notes: Note[] = [];
   ```

### NestJS — Reglas activas

1. **Siempre tipar el retorno de los metodos de servicio**
2. **Usar DTOs con `class-validator`** para validar input — nunca `any` en `@Body()`
3. **Siempre manejar el caso `null`** en operaciones Firestore que pueden no retornar documento

---

## Pasos para crear un nuevo patron en error-patterns

Cuando el error no existe en `/error-patterns/`, crear o actualizar el archivo con este patron:

```markdown
# [Nombre descriptivo del patron]

## Tecnologia
[TypeScript | ESLint | Angular | NestJS | Firestore | RxJS | TipTap | Algolia]

## Mensaje de error
[Texto exacto o regex del error]

## Causa raiz
[Por que ocurre — explicacion breve]

## Ejemplo del problema
```typescript
// codigo que genera el error
```

## Fix aplicado
```typescript
// codigo corregido
```

## Regla de prevencion
[Instruccion concreta en imperativo para que la IA no genere este error]

## Aplica en
[Contextos: componentes Angular / servicios NestJS / Cloud Functions / etc.]

## Fecha de registro
[YYYY-MM-DD]
```

---

## Pasos para crear o actualizar un coding-standard

Si el error revelo una convencion general no documentada, crear o actualizar
`/coding-standards/<tecnologia>.md` con la plantilla siguiente.

**Los archivos se crean gradualmente durante el desarrollo** — solo cuando un error
revela que falta documentar una convencion para esa tecnologia.

```markdown
# <tecnologia> — Coding Standards AppNotesBG

## Proposito
Como se codifica con [tecnologia] en AppNotesBG. Leer antes de generar cualquier codigo que use esta tecnologia.

## Configuracion base del proyecto
[tsconfig, eslintrc, versiones, configuracion especifica del proyecto]

## Convenciones aprobadas
### [Categoria 1]
[Descripcion + ejemplo de codigo correcto]

### [Categoria 2]
[Descripcion + ejemplo de codigo correcto]

## Patrones prohibidos
| Patron | Por que esta prohibido | Alternativa |
|---|---|---|
| [codigo malo] | [razon] | [codigo bueno] |

## Historial de actualizaciones
| Fecha | Convencion agregada | Error que la origino |
|---|---|---|
| [fecha] | [convencion] | [referencia al patron en error-patterns/] |
```

La columna **"Error que la origino"** vincula cada convencion con el error real
que la genero, creando trazabilidad del aprendizaje acumulado.

---

## Restricciones

- **NUNCA** ignorar un error con `// @ts-ignore` o `// eslint-disable` sin documentar por que
- **NUNCA** usar `as any` para resolver un error de tipos — buscar el tipo correcto
- **NUNCA** suprimir errores de lint de forma global en `.eslintrc` sin consenso
- Si el fix requiere cambiar la arquitectura, notificar antes de aplicar

---

## Referencias en el proyecto

- `skills/AppNotesBG-meta/error-patterns/` → patrones de errores documentados (reactivo)
- `skills/AppNotesBG-meta/coding-standards/` → convenciones por tecnologia (proactivo, crece gradualmente)
- `skills/AppNotesBG-meta/sync-agents.md` → invocar al crear/actualizar cualquier archivo
- `NEGOCIO.md` → modelo de datos para entender tipos esperados
- `tsconfig.json` → configuracion de strict mode (debe tener `"strict": true`)

---

## Historial de cambios

| Fecha | Cambio |
|---|---|
| 2026-02-10 | Creacion inicial con reglas preventivas para TS, Angular y NestJS |
| 2026-02-10 | Agregado paso 7 al flujo: crear/actualizar coding-standards al detectar convencion nueva |
| 2026-02-10 | Agregada plantilla de coding-standards y tabla de trazabilidad tecnologia→archivos |
