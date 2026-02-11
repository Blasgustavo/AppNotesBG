# AGENTS.md — Orquestador Global AppNotesBG

## Descripcion del proyecto

AppNotesBG es una aplicacion de notas moderna inspirada en Evernote, Notion y AppFlowy.
Construida con **Angular 21**, **NestJS 10+** y **Firebase** (Auth, Firestore, Storage).
El editor de texto usa **TipTap**, la busqueda full-text usa **Algolia**, y la IA usa **Google Gemini API**.

Referencia completa del negocio: `NEGOCIO.md`

---

## Reglas globales — Todo agente debe respetar estas reglas

1. Leer `/skills/AppNotesBG-meta/error-patterns/` antes de generar cualquier codigo.
2. Leer `/skills/AppNotesBG-meta/coding-standards/<tecnologia>.md` antes de generar codigo de esa tecnologia (si el archivo existe).
3. Si ocurre un error durante la generacion, invocar `error-handler.md` inmediatamente.
4. Toda operacion Git o GitHub debe pasar por `git-workflow.md`.
5. Si se crea o modifica un skill, invocar `sync-agents.md` al finalizar.
6. El contenido de las notas siempre es **TipTap JSON** — nunca HTML crudo ni Markdown libre.
7. Nunca exponer `user_id` en respuestas publicas de la API.
8. Todo endpoint de NestJS requiere `FirebaseAuthGuard`.
9. Sanitizar contenido HTML con **DOMPurify** en el frontend antes de renderizar.
10. Usar siempre Angular Signals para estado reactivo en el frontend:
    - `signal()` → estado mutable
    - `computed()` → derivaciones (NUNCA Signal manual actualizado en multiples lugares)
    - `effect()` → efectos secundarios (NUNCA `.subscribe()` en Signals)
    - `input()` → inputs de componente (NUNCA decorator `@Input()`)
    - `output()` → outputs de componente (NUNCA `new EventEmitter()`)
    - `@if` / `@for` / `@switch` → control flow moderno (NUNCA `*ngIf` / `*ngFor`)

---

## Stack y convenciones

| Capa | Tecnologia | Version |
|---|---|---|
| Frontend | Angular | 21 |
| Estilos | TailwindCSS | 3+ |
| Editor | TipTap | 2+ |
| Backend | NestJS | 10+ |
| Base de datos | Firebase Firestore | SDK 10+ |
| Autenticacion | Firebase Auth (Google) | SDK 10+ |
| Storage | Firebase Storage | SDK 10+ |
| Busqueda | Algolia | v4 |
| IA | Google Gemini API | v1 |
| Estado reactivo | Angular Signals | 16+ |
| Testing Frontend | Angular Testing Library + Jest | - |
| Testing Backend | Jest + Supertest | - |
| E2E | Playwright | - |

### Paths clave del proyecto

```
/AppNotesBG          → Frontend Angular
/api                 → Backend NestJS
/firebase            → Reglas Firestore, Storage y Cloud Functions
/skills              → Sistema de agentes y skills
/tests               → Pruebas unitarias, integracion y e2e
NEGOCIO.md           → Fuente de verdad del negocio y modelo de datos
AGENTS.md            → Este archivo — orquestador global
```

---

## Tabla de agentes registrados

| Agente | Archivo | Dominio | Responsabilidad |
|---|---|---|---|
| notes-agent | `AppNotesBG-agents/notes-agent.md` | Notas | CRUD notas, libretas, adjuntos, historial |
| search-agent | `AppNotesBG-agents/search-agent.md` | Busqueda | Indexacion y busqueda full-text con Algolia |
| auth-agent | `AppNotesBG-agents/auth-agent.md` | Autenticacion | Login Google, validacion tokens, onboarding |
| ai-agent | `AppNotesBG-agents/ai-agent.md` | IA | Resumenes, sugerencias de tags con Gemini |
| themes-agent | `AppNotesBG-agents/themes-agent.md` | Temas | CRUD temas personalizados, aplicación y preview |
| reminder-agent | `AppNotesBG-agents/reminder-agent.md` | Recordatorios | Crear, editar, cancelar recordatorios + Cloud Functions |
| infra-agent | `AppNotesBG-agents/infra-agent.md` | Infraestructura | Reglas Firestore/Storage, Cloud Functions |

## Tabla de subagentes compartidos

| Subagente | Archivo | Invocado por | Responsabilidad |
|---|---|---|---|
| state-manager | `AppNotesBG-subagents/shared/state-manager.md` | Todos los agentes frontend | Estado reactivo Angular Signals: AuthState, NotesState, EditorState, UiState |
| theme-manager | `AppNotesBG-subagents/themes/theme-manager.md` | themes-agent | CRUD temas personalizados + CSS custom properties |
| reminder-scheduler | `AppNotesBG-subagents/reminders/reminder-scheduler.md` | reminder-agent | CRUD recordatorios + sincronización con Cloud Functions |

---

## Tabla de meta-skills registrados

| Skill | Archivo | Activacion | Responsabilidad |
|---|---|---|---|
| create-skill | `AppNotesBG-meta/create-skill.md` | Manual o por agente | Genera nuevos skills interactivamente |
| sync-agents | `AppNotesBG-meta/sync-agents.md` | Automatica | Propaga cambios en todo el arbol de skills |
| error-handler | `AppNotesBG-meta/error-handler.md` | Automatica al detectar error | Fix + documenta patron en error-patterns + actualiza coding-standards + invoca sync |
| git-workflow | `AppNotesBG-meta/git-workflow.md` | Cada operacion Git/GitHub | Valida commits, ramas y PRs segun estandares |

## Sistema de conocimiento acumulativo

Los skills de aprendizaje crecen gradualmente durante el desarrollo:

| Carpeta | Proposito | Cuando crece |
|---|---|---|
| `AppNotesBG-meta/error-patterns/` | Errores especificos + fix puntual (reactivo) | Cada vez que ocurre un error nuevo |
| `AppNotesBG-meta/coding-standards/` | Convenciones generales por tecnologia (proactivo) | Cuando un error revela una convencion no documentada |

**Archivos de coding-standards previstos** (se crean durante el desarrollo, no antes):

```
coding-standards/
├── typescript.md     → al primer error TS
├── angular.md        → al primer error Angular
├── nestjs.md         → al primer error NestJS
├── tiptap.md         → al trabajar el editor
├── firestore.md      → al trabajar queries/listeners
├── rxjs.md           → al trabajar con Observables
└── algolia.md        → al trabajar la indexacion
```

---

## Mapa global de comunicacion

```
AGENTS.md (Orquestador)
│
├── [Meta] Toda operacion Git        → git-workflow.md
├── [Meta] Error en generacion       → error-handler.md → error-patterns/ + coding-standards/ → sync-agents.md
├── [Meta] Nuevo/modificado skill    → sync-agents.md
├── [Meta] Crear skill nuevo         → create-skill.md → sync-agents.md
│
├── notes-agent
│   ├── CRUD notas/libretas          → note-creator.md
│   ├── Edicion de contenido         → note-editor.md
│   └── Historial de versiones       → note-history.md
│
├── search-agent
│   └── Indexacion/busqueda          → algolia-indexer.md
│
├── auth-agent
│   └── Validacion de tokens         → token-validator.md
│
├── ai-agent
│   ├── Resumenes de notas           → summarizer.md
│   └── Sugerencia de tags           → tag-suggester.md
│
├── themes-agent
│   └── Gestión completa            → theme-manager.md
│
├── reminder-agent
│   └── CRUD + Cloud Functions    → reminder-scheduler.md
│
└── infra-agent
    ├── Reglas Firestore             → firestore-rules.md
    └── Reglas Storage               → storage-rules.md
```

---

## Tabla de routing — Tarea a agente

| Tipo de tarea | Agente responsable | Subagentes a invocar |
|---|---|---|
| Crear/editar/eliminar notas | notes-agent | note-creator, note-editor |
| Gestionar libretas (notebooks) | notes-agent | note-creator |
| Ver/restaurar historial de nota | notes-agent | note-history |
| Subir/eliminar adjuntos | notes-agent | note-creator |
| Buscar notas por texto | search-agent | algolia-indexer |
| Login / logout | auth-agent | token-validator |
| Validar token en request | auth-agent | token-validator |
| Resumir nota con IA | ai-agent | summarizer |
| Sugerir tags con IA | ai-agent | tag-suggester |
| Modificar reglas Firestore | infra-agent | firestore-rules |
| Modificar reglas Storage | infra-agent | storage-rules |
| Deploy Cloud Functions | infra-agent | firestore-rules, storage-rules |
| Crear un nuevo skill | [meta] | create-skill → sync-agents |
| Sincronizar arbol de skills | [meta] | sync-agents |
| Error durante generacion | [meta] | error-handler → sync-agents |
| Commit / push / PR | [meta] | git-workflow |
| Error Firebase Auth/Firestore | auth-agent / infra-agent | token-validator / firestore-rules |
| Gestionar temas | themes-agent | theme-manager |
| Gestionar recordatorios | reminder-agent | reminder-scheduler |

---

## Protocolo de onboarding para nuevos agentes

Cuando se incorpora un nuevo agente o dev al proyecto:

1. Leer `NEGOCIO.md` — modelo de datos, stack y funcionalidades
2. Leer este `AGENTS.md` — routing, reglas globales y mapa de comunicacion
3. Leer `AppNotesBG-meta/error-handler.md` — errores frecuentes y como evitarlos
4. Leer `AppNotesBG-meta/git-workflow.md` — convenciones de commits y ramas
5. Leer `AppNotesBG-meta/error-patterns/` — patrones de errores ya documentados
6. Leer `AppNotesBG-meta/coding-standards/` — convenciones por tecnologia (si existen)
7. Leer el agente del dominio asignado en `AppNotesBG-agents/`
8. Leer los subagentes relevantes en `AppNotesBG-subagents/`

---

## Colecciones Firestore (referencia rapida)

| Coleccion | Descripcion |
|---|---|
| `users` | Perfil y preferencias del usuario |
| `notebooks` | Libretas que agrupan notas |
| `notes` | Notas (contenido TipTap JSON) |
| `note_history` | Historial de versiones por nota |
| `themes` | Temas personalizados |
| `attachments` | Metadatos de archivos subidos |
| `invitations` | Invitaciones para compartir notas |

Modelo de datos completo: ver seccion "Modelo de datos" en `NEGOCIO.md`

---

## Historial de cambios en este archivo

| Fecha | Cambio | Quien |
|---|---|---|
| 2026-02-10 | Creacion inicial del orquestador | AppNotesBG setup |
| 2026-02-10 | Agregada regla global #2: leer coding-standards antes de generar codigo | AppNotesBG setup |
| 2026-02-10 | Actualizada tabla de meta-skills con error-handler mejorado | AppNotesBG setup |
| 2026-02-10 | Agregada seccion "Sistema de conocimiento acumulativo" y mapa de archivos | AppNotesBG setup |
| 2026-02-10 | Actualizado mapa de comunicacion: error-handler ahora actualiza coding-standards | AppNotesBG setup |
| 2026-02-10 | Actualizado protocolo de onboarding con pasos 5-6 (error-patterns y coding-standards) | AppNotesBG setup |
| 2026-02-11 | Agregada regla global #10: convenciones Angular Signals | AppNotesBG setup |
| 2026-02-11 | Agregado Angular Signals a tabla de stack | AppNotesBG setup |
| 2026-02-11 | Agregado routing para errores Firebase Auth/Firestore | AppNotesBG setup |
| 2026-02-11 | Agregada tabla de subagentes compartidos con state-manager | AppNotesBG setup |
| 2026-02-11 | Agregados themes-agent y reminder-agent con sus subagentes | AppNotesBG setup |
