# Notes App — Proyecto Personal

Aplicación de notas moderna inspirada en Evernote, Notion, AppFlowy y otros. Incluye autenticación con Google, sincronización en tiempo real, historial de cambios, estilos personalizables y adjuntos. Construida con **Angular**, **NestJS** y **Firebase**.

---

## Tecnologías principales

### Frontend
- Angular 21
- Angular Material (opcional)
- Firebase Web SDK (Auth, Firestore, Storage)
- **Angular Signals** para estado reactivo + RxJS para streams HTTP
- TailwindCSS
- **TipTap** (editor de texto enriquecido, basado en ProseMirror)
- **DOMPurify** (sanitización de contenido HTML)

### Backend
- NestJS 10+
- Firebase Admin SDK
- Endpoints para auditoría, procesamiento y lógica extendida
- **Algolia SDK** (indexación y búsqueda full-text)

### Base de datos
- Firebase Firestore (documentos y colecciones)
- Firebase Auth (Google Sign-In)
- Firebase Storage (archivos adjuntos)
- **Algolia** (índice de búsqueda full-text sincronizado via Cloud Functions)

---

## Estructura del proyecto (formato cascada)

AppNotesBG — Frontend Angular
Descripción: Aplicación principal de notas, UI, módulos de usuario, notas e historial.

```
└── /AppNotesBG
    └── /src
        └── /app
            └── /core
                └── /state            ← Servicios de estado por dominio (auth, notes, editor, ui)
            └── /shared
                └── /types            ← Modelos de datos (note.model.ts)
                └── /services
                └── /components
            └── /modules (por crear)
            └── /routes
```

api — Backend NestJS
Descripción: API central para lógica avanzada, validaciones, auditoría, búsqueda y servicios externos.

```
└── /api
    └── /src
        └── /app
        └── /core
        └── /shared
        └── /modules
            └── /notes
            └── /notebooks
            └── /auth
            └── /search
            └── /ai
```

firebase — Configuración de Firebase
Descripción: Reglas de seguridad para Firestore y Storage, y Cloud Functions.

```
└── /firebase
    └── firestore.rules
    └── storage.rules
    └── /functions
        └── /algolia-sync      (trigger onCreate/onUpdate/onDelete de notas)
        └── /reminder-notify   (scheduler para recordatorios)
```

skills — Sistema de agentes y habilidades de IA
Descripción: Orquestador completo para gestionar desarrollo, generación de código y operaciones del proyecto.

```
└── /skills
    ├── AppNotesBG-meta/                  ← Meta-skills que gestionan el sistema
    │   ├── create-skill.md               ← Crea nuevos skills interactivamente
    │   ├── sync-agents.md                ← Sincroniza todo el árbol de skills
    │   ├── error-handler.md               ← Detecta, documenta y aplica fixes de errores
    │   ├── git-workflow.md                ← Valida commits, ramas y PRs según estándares
    │   └── error-patterns/                ← Patrones de errores por tecnología
    │       ├── typescript-undefined.md    ← Errores undefined/null en TypeScript
    │       ├── eslint-rules.md             ← Reglas ESLint frecuentes
    │       ├── firestore-rules-errors.md  ← Errores en reglas de Firestore
    │       └── angular-rxjs-memory-leaks.md ← Memory leaks con RxJS
    │
    └── coding-standards/                  ← Convenciones proactivas (crecen gradualmente)
        ├── typescript.md                  ← Se crea al primer error TS del desarrollo
        ├── angular.md                     ← Se crea al primer error Angular
        ├── nestjs.md                      ← Se crea al primer error NestJS
        ├── tiptap.md                      ← Se crea al trabajar el editor
        ├── firestore.md                   ← Se crea al trabajar queries/listeners
        ├── rxjs.md                        ← Se crea al trabajar con Observables
        └── algolia.md                     ← Se crea al trabajar la indexación
```

tests — Pruebas del proyecto
Descripción: Carpeta raíz para pruebas unitarias, integración y e2e.

```
└── /tests
    └── /unit
    └── /integration
    └── /e2e
    └── /firestore-rules
```

---

## Modelo de datos (Firestore)

### Colección: `users`
Preferencias globales del usuario y datos de autenticación.

```json
{
  "id": "google_uid",
  "email": "user@example.com",
  "display_name": "Blas",
  "avatar_url": "https://...",
  "created_at": "timestamp",
  "app_theme": "dark",
  "default_note_style": {
    "background_color": "#FFFFFF",
    "text_color": "#333333"
  },
  "default_font_family": "Inter",
  "default_font_size": 14,
  "default_color_palette": ["#FFEB3B", "#2196F3"],
  "storage_used_bytes": 0,
  "storage_limit_bytes": 524288000
}
```

> `storage_limit_bytes` = 500MB por usuario. Se valida en Storage Rules y en NestJS al subir archivos.

---

### Colección: `notebooks`
Libretas que agrupan notas. El usuario puede crear múltiples libretas.

```json
{
  "id": "notebook_id",
  "user_id": "google_uid",
  "name": "Trabajo",
  "icon": "briefcase",
  "color": "#2196F3",
  "parent_notebook_id": "parent_notebook_id",  // null para nivel raíz
  "created_at": "timestamp",
  "updated_at": "timestamp",
  "is_default": false,
  "note_count": 12
}
```

> Cada usuario tiene una libreta `is_default: true` creada automáticamente al registrarse.

---

### Colección: `notes`
Notas creadas por el usuario. El contenido usa formato **TipTap JSON**.

```json
{
  "id": "note_id",
  "user_id": "google_uid",
  "notebook_id": "notebook_id",
  "title": "Mi primera nota",
  "content": {
    "type": "doc",
    "content": [
      { "type": "paragraph", "content": [{ "type": "text", "text": "Hola mundo" }] }
    ]
  },
  "created_at": "timestamp",
  "updated_at": "timestamp",
  "deleted_at": null,
  "archived_at": null,
  "reminder_at": null,
  "tags": ["personal", "ideas"],
  "is_pinned": false,
  "collaborators": [
    { "user_id": "google_uid_2", "permission": "view" }
  ],
  "style": {
    "background_color": "#FFFFFF",
    "text_color": "#333333",
    "highlight_color": "#FFEB3B"
  },
  "font": {
    "family": "Inter",
    "size": 14,
    "weight": "normal",
    "line_height": 1.4
  },
  "attachments": [
    {
      "id": "file_id",
      "url": "https://...",
      "type": "image",
      "name": "foto.jpg",
      "size_bytes": 204800
    }
  ]
}
```

**Campos nuevos respecto al diseño original:**

| Campo | Descripción |
|---|---|
| `notebook_id` | Libreta a la que pertenece la nota |
| `content` | TipTap JSON (reemplaza `richtext \| markdown \| json` indefinido) |
| `archived_at` | Archivar nota sin eliminarla (distinto a `deleted_at`) |
| `reminder_at` | Timestamp para recordatorio (procesado por Cloud Function) |
| `collaborators[]` | Lista de usuarios con acceso y nivel de permiso (`view` / `edit`) |
| `attachments[].size_bytes` | Tamaño del archivo para control de cuota |

---

### Colección: `note_history`
Historial de cambios por nota.

**Política de snapshots para controlar costos de Firestore:**
- Se guarda un **snapshot completo** en la versión 1 y cada 10 versiones.
- El resto de versiones solo guarda el **diff** (texto añadido/eliminado).
- Máximo **50 versiones por nota**; las más antiguas se eliminan con Cloud Function.

```json
{
  "id": "history_id",
  "note_id": "note_id",
  "user_id": "google_uid",
  "version": 5,
  "timestamp": "timestamp",
  "is_snapshot": false,
  "diff": {
    "added": "nuevo texto",
    "removed": "texto eliminado"
  },
  "snapshot": null
}
```

---

### Colección: `themes`
Temas personalizados del usuario.

```json
{
  "id": "theme_id",
  "user_id": "google_uid",
  "name": "Tema oscuro minimalista",
  "palette": {
    "primary": "#1E1E1E",
    "secondary": "#3A3A3A",
    "accent": "#BB86FC",
    "background": "#121212",
    "surface": "#1E1E1E",
    "text": "#E0E0E0"
  },
  "typography": {
    "font_family": "Inter",
    "font_size": 14
  },
  "layout": {
    "spacing": 8,
    "border_radius": 6
  }
}
```

---

### Colección: `attachments`
Archivos subidos por el usuario.

```json
{
  "id": "file_id",
  "note_id": "note_id",
  "user_id": "google_uid",
  "url": "https://...",
  "storage_path": "users/{uid}/notes/{note_id}/{file_id}",
  "type": "image",
  "mime_type": "image/jpeg",
  "name": "foto.jpg",
  "size_bytes": 204800,
  "created_at": "timestamp"
}
```

---

### Colección: `invitations`
Invitaciones para compartir notas con otros usuarios.

```json
{
  "id": "invitation_id",
  "note_id": "note_id",
  "invited_by_uid": "google_uid",
  "invited_email": "colaborador@example.com",
  "permission": "edit",
  "status": "pending",
  "created_at": "timestamp",
  "accepted_at": null
}
```

> Valores de `permission`: `view` (solo lectura) | `edit` (lectura y escritura).
> Valores de `status`: `pending` | `accepted` | `rejected` | `revoked`.

---

## Sistema de agentes y gestión de desarrollo

### Orquestador global: `AGENTS.md`

Punto de entrada del sistema que define el routing, reglas globales y mapa de comunicación entre todos los agentes.

**Reglas globales que todos los agentes deben respetar:**
1. Leer `/skills/AppNotesBG-meta/error-patterns/` antes de generar cualquier código
2. Leer `/skills/AppNotesBG-meta/coding-standards/<tecnología>.md` antes de generar código de esa tecnología
3. Si ocurre un error, invocar `error-handler.md` inmediatamente
4. Toda operación Git debe pasar por `git-workflow.md`
5. Todo endpoint NestJS requiere `FirebaseAuthGuard`
6. El contenido de las notas siempre es **TipTap JSON** (nunca HTML crudo)

---

### Árbol de agentes y subagentes

```
AGENTS.md (Orquestador)
├── AppNotesBG-meta/                    ← Meta-skills
│   ├── create-skill.md               ← Crea skills interactivamente
│   ├── sync-agents.md                ← Sincroniza todo el árbol
│   ├── error-handler.md               ← Detecta + documenta + fix errores
│   ├── git-workflow.md                ← Valida commits/ramas/PRs
│   ├── error-patterns/                ← Errores por tecnología (reactivo)
│   └── coding-standards/              ← Convenciones por tecnología (proactivo)
│
├── AppNotesBG-agents/                 ← Agentes de dominio
│   ├── notes-agent.md                 ← CRUD notas, libretas, adjuntos, historial
│   ├── search-agent.md                ← Indexación y búsqueda con Algolia
│   ├── auth-agent.md                  ← Login Google, validación tokens, onboarding
│   ├── ai-agent.md                    ← Resúmenes y sugerencias con Gemini
│   └── infra-agent.md                 ← Reglas Firestore/Storage, Cloud Functions
│
└── AppNotesBG-subagents/              ← Subagentes especializados
    ├── notes/
    │   ├── note-creator.md           ← Crear notas/libretas/adjuntos
    │   ├── note-editor.md            ← Editar contenido, estilos, archivar
    │   └── note-history.md           ← Historial y restauración de versiones
    ├── search/
    │   └── algolia-indexer.md        ← Sincronización y búsquedas
    ├── auth/
    │   └── token-validator.md        ← Validación JWT en NestJS
    ├── ai/
    │   ├── summarizer.md             ← Resumir notas con Gemini
    │   └── tag-suggester.md          ← Sugerir etiquetas con Gemini
    └── infra/
        ├── firestore-rules.md       ← Reglas de seguridad Firestore
        └── storage-rules.md         ← Reglas de seguridad Storage
```

---

### Flujo de trabajo completo

1. **Onboarding de nuevo dev:** Lee `AGENTS.md` → `NEGOCIO.md` → `error-handler.md` → `git-workflow.md`
2. **Desarrollo:** Antes de generar código, lee `error-patterns/` y `coding-standards/`
3. **Si ocurre error:** `error-handler.md` → documenta en `error-patterns/` → actualiza `coding-standards/` → invoca `sync-agents.md`
4. **Para commits:** `git-workflow.md` valida formato (Conventional Commits + Gitmoji) y flujo de ramas
5. **Para crear nuevos skills:** `create-skill.md` → preguntas interactivas → invoca `sync-agents.md`

---

### Sistema de conocimiento acumulativo

| Carpeta | Propósito | Cuándo crece |
|---|---|---|
| `error-patterns/` | Errores específicos + fix puntual (reactivo) | Cada vez que ocurre un error nuevo |
| `coding-standards/` | Convenciones generales por tecnología (proactivo) | Cuando un error revela una convención no documentada |

**Archivos de coding-standards previstos** (se crean durante el desarrollo, no antes):
- `typescript.md` → convenciones de TypeScript para el proyecto
- `angular.md` → estructura de componentes, signals, lazy loading
- `nestjs.md` → DTOs, guards, interceptors, módulos
- `tiptap.md` → manipulación JSON, extensiones, sanitización
- `firestore.md` → patrones de queries, transacciones, listeners
- `rxjs.md` → operadores permitidos, patrones de composición
- `algolia.md` → indexación, filtros, paginación

---

## Autenticación (Google Sign-In)

1. Firebase Auth maneja el login con `signInWithPopup` o `signInWithRedirect`.
2. Angular obtiene el ID token del usuario autenticado.
3. NestJS valida el token en cada request mediante Firebase Admin SDK (`verifyIdToken`).
4. Los tokens expiran en 1 hora; el cliente los refresca automáticamente via Firebase SDK.
5. Al primer login, se crea automáticamente el documento `users/{uid}` y una libreta por defecto.

---

## Organizacion de notas

La app soporta los tres modelos de organización. El usuario puede elegir su modo preferido en la configuración:

| Modo | Descripcion | Como funciona |
|---|---|---|
| **Notebooks** | Libretas con notas dentro | `notebook_id` en cada nota. Vista de libretas en sidebar |
| **Solo tags** | Sin jerarquía, filtrado por etiquetas | `tags[]` en cada nota. Vista plana con filtros |
| **Carpetas anidadas** | Notas dentro de notebooks que pueden anidarse | `parent_notebook_id` en `notebooks` para jerarquía |

> La estructura de datos con `notebook_id` y `tags[]` soporta los tres modos sin cambios en el modelo.

---

## Editor de texto: TipTap

### Extensiones habilitadas

| Extension | Funcion |
|---|---|
| `StarterKit` | Negrita, cursiva, encabezados H1-H3, listas, blockquote, code |
| `Image` | Insertar imágenes desde adjuntos |
| `Link` | Hiperenlaces con validación |
| `TaskList` + `TaskItem` | Listas de tareas con checkboxes |
| `CodeBlockLowlight` | Bloques de código con syntax highlighting |
| `Typography` | Tipografía inteligente (comillas, em-dash) |
| `Placeholder` | Texto de ayuda en editor vacío |
| `CharacterCount` | Contador de caracteres y palabras |

### Formato de almacenamiento

- El contenido se guarda como **TipTap JSON** en Firestore.
- Para búsqueda, se extrae el texto plano al indexar en Algolia.
- Para exportar (PDF, Markdown), NestJS convierte el JSON con `@tiptap/html` o `unified`.

### Seguridad (XSS)

- Todo contenido HTML renderizado desde TipTap JSON pasa por **DOMPurify** en el frontend.
- NestJS aplica sanitización adicional antes de persistir cualquier contenido recibido.

---

## Motor de busqueda: Algolia

### Arquitectura

```
Firestore (onCreate/onUpdate/onDelete de notes)
    → Cloud Function: algolia-sync
        → Algolia Index: notes_{env}
            → Angular SearchBox → NestJS /search → Algolia API
```

### Campos indexados en Algolia

```json
{
  "objectID": "note_id",
  "title": "Mi primera nota",
  "content_text": "Texto plano extraído del TipTap JSON",
  "tags": ["personal", "ideas"],
  "notebook_name": "Trabajo",
  "user_id": "google_uid",
  "updated_at": 1700000000
}
```

> `user_id` se usa como filtro en cada query para que cada usuario solo vea sus propias notas.

### Limites

- Tier gratuito de Algolia: 10,000 registros, 10,000 búsquedas/mes.
- Se monitorea el uso desde el dashboard de Algolia.

---

## Seguridad

### Firestore Rules (principios)

```
- users/{uid}: lectura/escritura solo si request.auth.uid == uid
- notes/{noteId}: lectura/escritura si resource.data.user_id == request.auth.uid
                  O si request.auth.uid está en resource.data.collaborators[].user_id
- notebooks/{notebookId}: solo el propietario puede leer/escribir
- note_history/{historyId}: solo el propietario de la nota puede leer
- invitations/{invId}: el invitado puede leer/actualizar status; el dueño puede crear/revocar
```

### Storage Rules (principios)

```
- Solo usuarios autenticados pueden subir archivos.
- Ruta obligatoria: users/{uid}/notes/{noteId}/{fileId}
- Tamaño máximo por archivo: 10MB (10 * 1024 * 1024 bytes)
- Tipos permitidos: image/jpeg, image/png, image/gif, image/webp, application/pdf, audio/mpeg, audio/mp4
- El uid en la ruta debe coincidir con request.auth.uid
```

### NestJS (API)

- Todos los endpoints requieren token JWT de Firebase validado via `firebase-admin.verifyIdToken()`.
- Guard global `FirebaseAuthGuard` en todos los módulos.
- Validación de cuota de Storage antes de aceptar upload (consulta `users.storage_used_bytes`).
- Rate limiting: 100 requests/minuto por usuario (usando `@nestjs/throttler`).

### Límites de uso

| Recurso | Limite |
|---|---|
| Storage por usuario | 500 MB |
| Tamaño máximo por adjunto | 10 MB |
| Versiones en historial por nota | 50 versiones |
| Notas por libreta | Sin límite (paginación requerida) |
| Adjuntos por nota | 20 archivos |

---

## Funcionalidades principales

1. Crear, editar y eliminar notas (soft delete con `deleted_at`)
2. Archivar notas (`archived_at`) sin eliminarlas
3. Historial de versiones por nota (máx. 50, política de snapshots)
4. Organización por libretas (notebooks) con soporte para tags y carpetas anidadas
5. Estilos personalizados por usuario y por nota
6. Adjuntar imágenes, PDFs y audios (máx. 10MB/archivo, 500MB/usuario)
7. Etiquetas y búsqueda full-text con Algolia
8. Papelera con recuperación (30 días antes de eliminación permanente)
9. Sincronización en tiempo real (Firestore listeners)
10. Temas personalizados (light/dark/custom)
11. Tipografías configurables
12. Recordatorios (campo `reminder_at` + Cloud Function scheduler)

---

## Roadmap

### Editor de texto enriquecido
- **Dependencia**: TipTap + extensiones (ver sección Editor)
- **Estado**: Prioridad 1

### Vista tipo tablero (Kanban)
- **Dependencia**: Nueva colección `boards` con `columns[]` y referencias a `note_id`
- **Modelo adicional necesario**:
  ```json
  { "id": "board_id", "user_id": "...", "notebook_id": "...", "columns": [{ "name": "Por hacer", "note_ids": ["..."] }] }
  ```
- **Estado**: Post-MVP

### Recordatorios
- **Dependencia**: Campo `reminder_at` en `notes` + Cloud Function con Cloud Scheduler
- **Implementación**: Cloud Function revisa cada minuto notas con `reminder_at <= now` y envía push notification via FCM
- **Estado**: MVP tardío

### Compartir notas con otros usuarios
- **Dependencia**: Colección `invitations`, campo `collaborators[]` en notas, reglas de Firestore actualizadas
- **Flujo**: Dueño crea invitación → colaborador recibe email → acepta → se agrega a `collaborators[]`
- **Estado**: Post-MVP

### Modo offline
- **Dependencia**: `enablePersistence()` de Firestore SDK (activar desde día 1 para evitar refactor)
- **Nota**: Firebase Firestore soporta offline nativo; habilitar en la inicialización del cliente
- **Estado**: Habilitar desde el inicio

### IA para resúmenes y organización automática
- **Dependencia**: NestJS endpoint `/ai/summarize` que consume **Google Gemini API**
- **Funcionalidades planificadas**: Resumir nota, sugerir tags, detectar duplicados, organización automática en libretas
- **Estado**: Post-MVP

---

## Scripts recomendados

### Frontend

```bash
npm run start          # Servidor de desarrollo
npm run build          # Build de producción
npm run test           # Pruebas unitarias con Jest
npm run e2e            # Pruebas E2E con Playwright
npm run lint           # ESLint + Prettier
```

### Backend

```bash
npm run start:dev      # Servidor con hot-reload
npm run build          # Build de producción
npm run test           # Pruebas unitarias con Jest
npm run test:e2e       # Pruebas de integración
npm run lint           # ESLint
```

### Firebase

```bash
firebase emulators:start              # Emuladores locales (Auth, Firestore, Storage, Functions)
firebase deploy --only firestore:rules
firebase deploy --only storage:rules
firebase deploy --only functions
```

---

## Testing

### Estrategia y cobertura mínima

| Capa | Herramienta | Cobertura mínima |
|---|---|---|
| Frontend (Angular) | Angular Testing Library + Jest | 70% |
| Backend (NestJS) | Jest + Supertest | 80% |
| E2E | Playwright | Flujos críticos: login, crear nota, buscar |
| Reglas Firestore | Firebase Emulator Suite | 100% de reglas definidas |
| Cloud Functions | Jest + Firebase Emulator | 70% |

### Flujos E2E críticos

1. Login con Google → crear libreta → crear nota → editar → buscar → cerrar sesión
2. Subir adjunto → verificar en Storage → eliminar adjunto
3. Crear historial → restaurar versión anterior
4. Invitar colaborador → aceptar → editar nota compartida

---

## Decisiones técnicas registradas

| Decision | Eleccion | Razon |
|---|---|---|
| Editor de texto | TipTap | ProseMirror-based, extensible, soporte colaborativo futuro |
| Formato de contenido | TipTap JSON | Tipado, serializable, fácil de convertir a HTML/MD |
| Búsqueda full-text | Algolia | Tier gratuito suficiente para MVP, integración Firebase nativa |
| Sanitización HTML | DOMPurify | Estándar de industria, activo en frontend y backend |
| Sincronización offline | Firestore persistence | Nativo en el SDK, habilitar desde día 1 |
| IA | Google Gemini API | Integración natural con Firebase/Google Cloud |
| Rate limiting | @nestjs/throttler | Nativo de NestJS, configuración simple |

---

## Estado actual del proyecto (En progreso)

### ✅ Completado — Documentación y arquitectura

| Componente | Estado | Detalles |
|---|---|---|
| **NEGOCIO.md** | ✅ Completo | Modelo de datos, stack, funcionalidades, roadmap, decisiones técnicas |
| **AGENTS.md** | ✅ Completo | Orquestador global con routing, reglas y comunicación entre agentes |
| **Sistema de skills** | ✅ Completo | 22 archivos en 3 capas: meta-skills, agentes, subagentes |
| **Meta-skills** | ✅ Completos | create-skill, sync-agents, error-handler, git-workflow |
| **Error patterns** | ✅ Completos | 4 patrones por tecnología (TS, ESLint, Firestore, RxJS) |
| **Agentes de dominio** | ✅ Completos | 5 agentes: notes, search, auth, ai, infra |
| **Subagentes** | ✅ Completos | 8 subagentes especializados con input/output tipado |

### ✅ Completado — Convenciones y estándares

| Convención | Estado | Documentado en |
|---|---|---|
| **Git** | ✅ Conventional Commits + Gitmoji | `skills/AppNotesBG-meta/git-workflow.md` |
| **TypeScript** | ✅ Strict mode + prevención undefined | `error-patterns/typescript-undefined.md` |
| **Angular** | ✅ Signals + control flow + computed/effect patterns | `skills/AppNotesBG-meta/coding-standards/angular.md` |
| **RxJS** | ✅ Memory leaks prevention | `error-patterns/angular-rxjs-memory-leaks.md` |
| **ESLint** | ✅ Rules + fix patterns | `error-patterns/eslint-rules.md` |
| **Firestore Rules** | ✅ Principios + templates | `error-patterns/firestore-rules-errors.md` |
| **API Security** | ✅ ValidationPipe + CORS + FirebaseAuthGuard + ThrottlerGuard | `AGENTS.md` + `auth-agent.md` |

### 🔄 Sistema de aprendizaje acumulativo

| Sistema | Flujo | Resultado |
|---|---|---|
| **Error handling** | Error detectado → `error-handler.md` → `error-patterns/` + `coding-standards/` → `sync-agents.md` | Cada error solo ocurre una vez |
| **Skills creation** | Nuevo dominio → `create-skill.md` → nuevo agente/subagente → `sync-agents.md` | Agregado sin romper arquitectura |
| **Knowledge base** | `coding-standards/<tech>.md` se crea gradualmente | Convenciones crecen según necesidades reales |

### 📋 Estadísticas de implementación

| Categoría | Cantidad | Archivos |
|---|---|---|
| **Meta-skills** | 4 | create-skill, sync-agents, error-handler, git-workflow |
| **Error patterns** | 4 | typescript-undefined, eslint-rules, firestore-rules-errors, angular-rxjs-memory-leaks |
| **Agentes** | 5 | notes-agent, search-agent, auth-agent, ai-agent, infra-agent |
| **Subagentes** | 8 | note-creator, note-editor, note-history, algolia-indexer, token-validator, summarizer, tag-suggester, firestore-rules, storage-rules |
| **Total** | **26** | **Arquitectura completa y lista para desarrollo** |
| **Shared types** | 1 | tiptap.types.ts (TipTap interfaces compartidas entre frontend y backend) |
| **Core state services** | 4 | auth-state.service.ts, notes-state.service.ts, editor-state.service.ts, ui-state.service.ts |

### 🎯 Próximos pasos de desarrollo

1. **Iniciar MVP:** Leer `AGENTS.md` → `error-patterns/` → codificar primer feature (ej: `notes-agent` + `note-creator.md`)
2. **Primer error:** El sistema lo detectará → creará el primer `coding-standards/<tech>.md` automáticamente
3. **Iteración:** Cada feature nuevo usa los skills correspondientes, el sistema aprende de cada error

**La arquitectura está lista para escalar desde el primer día de desarrollo.**
