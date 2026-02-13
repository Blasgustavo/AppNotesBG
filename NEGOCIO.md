# Notes App — Proyecto Personal

## Historial de versiones

| Versión | Fecha | Cambios | Autor |
|---------|-------|---------|-------|
| 1.0.0 | 2026-02-10 | Creación inicial del documento con modelo de datos, stack tecnológico, y roadmap | AppNotesBG setup |
| 1.1.0 | 2026-02-13 | Phase 1-5: autenticación (refresh/revoke sessions), validación de inputs (pipes), cifrado AES-256, auditoría avanzada, integración IA (Gemini), CI/CD (GitHub Actions), Cloud Functions, códigos de error | AppNotesBG |

---

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
- **jsdom** (servidor DOM para sanitización en backend)

### Backend
- NestJS 11+
- Firebase Admin SDK 13+
- Endpoints para auditoría, procesamiento y lógica extendida
- **Algolia SDK v5** (indexación y búsqueda full-text)
- **Winston** (logging estructurado — JSON en producción)
- **@nestjs/throttler** (rate limiting por IP y usuario)
- **class-validator** + **class-transformer** (validación de DTOs)
- **@google/generative-ai** (Google Gemini para IA)
- **crypto** (Node.js - cifrado AES-256)

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
    └── firestore.indexes.json
    └── /functions
        └── /src
            └── index.ts              ← Cloud Functions (helloWorld, syncAlgoliaIndex, detectAnomalies)
```

.github — GitHub Actions y configuración
Descripción: Pipelines de CI/CD y hooks de Git.

```
└── /.github
    └── /workflows
        └── ci.yml                  ← Pipeline de CI (lint, test, build)
        └── deploy.yml              ← Pipeline de CD (deploy a producción)
    └── /workflows.disabled
```

.husky — Git hooks
Descripción: Hooks de Git para validación de commits.

```
└── /.husky
    └── commit-msg                 ← Hook para validar mensajes de commit
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
Preferencias globales del usuario, datos de autenticación y configuración de seguridad.

```json
{
  "id": "google_uid",
  "email": "user@example.com",
  "display_name": "Blas",
  "avatar_url": "https://...",
  "created_at": "timestamp",
  "updated_at": "timestamp",
  "status": "active|suspended|deleted",
  "last_login_at": "timestamp",
  "login_count": 156,
  "email_verified": true,
  "preferences": {
    "language": "es|en|pt",
    "timezone": "America/New_York",
    "auto_save_interval": 30000,
    "export_format": "pdf|markdown|html",
    "theme_id": "custom_theme_123"
  },
  "security": {
    "failed_attempts": 0,
    "last_failed_at": null,
    "two_factor_enabled": false,
    "session_timeout": 3600
  },
  "quotas": {
    "storage_used_bytes": 1024000,
    "storage_limit_bytes": 524288000,
    "notes_count": 45,
    "attachments_count": 23
  },
  "audit": {
    "created_ip": "192.168.1.1",
    "last_updated_by": "system",
    "last_updated_ip": "192.168.1.1"
  }
}
```

> `storage_limit_bytes` = 500MB por usuario. Se valida en Storage Rules y en NestJS al subir archivos.
> 
> **Nuevos campos de seguridad:**
> - `status`: Control de estado de cuenta para suspensión/eliminación
> - `last_login_at` y `login_count`: Para monitoreo de seguridad y análisis
> - `security.failed_attempts`: Para bloqueo automático por intentos fallidos
> - `audit.*`: Trail completo de auditoría por usuario

---

### Colección: `notebooks`
Libretas que agrupan notas. El usuario puede crear múltiples libretas con soporte para jerarquía y sharing.

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
  "is_favorite": false,
  "sort_order": 1,
  "note_count": 12,
  "sharing": {
    "share_token": "abc123def456",
    "share_permissions": "none|read|comment",
    "public_access_expires": null
  },
  "collaboration_mode": "private|team|public",
  "audit": {
    "created_ip": "192.168.1.1",
    "last_updated_by": "google_uid",
    "last_updated_ip": "192.168.1.1"
  }
}
```

> Cada usuario tiene una libreta `is_default: true` creada automáticamente al registrarse.
> 
> **Nuevos campos de colaboración:**
> - `sharing.*`: Sistema de sharing público con tokens y permisos
> - `collaboration_mode`: Modo de colaboración (privado, equipo, público)
> - `is_favorite` y `sort_order`: Para UX y organización personal
> - `audit.*`: Auditoría completa de cambios

---

### Colección: `notes`
Notas creadas por el usuario con integridad de datos, control de versiones y colaboración avanzada.

```json
{
  "id": "note_id",
  "user_id": "google_uid",
  "notebook_id": "notebook_id",
  "title": "Mi primera nota",
  "content": {
    "schema_version": "2.0",
    "type": "doc",
    "content": [
      { "type": "paragraph", "content": [{ "type": "text", "text": "Hola mundo" }] }
    ],
    "metadata": {
      "word_count": 1250,
      "character_count": 7500,
      "last_hash": "sha256_hash"
    }
  },
  "content_hash": "sha256_hash_of_content",
  "checksum": "md5_checksum_for_integrity",
  "version": 1,
  "sync_status": "synced|pending|conflict",
  "last_sync_at": "timestamp",
  "created_at": "timestamp",
  "updated_at": "timestamp",
  "deleted_at": null,
  "archived_at": null,
  "reminder_at": null,
  "tags": ["personal", "ideas"],
  "is_pinned": false,
  "is_template": false,
  "template_id": null,
  "word_count": 1250,
  "reading_time_minutes": 5,
  "sharing": {
    "public_slug": "abc123",
    "public_access_expires": "timestamp",
    "collaborators": [
      {
        "user_id": "google_uid_2",
        "permission": "view|edit|comment",
        "added_at": "timestamp",
        "added_by": "google_uid"
      }
    ]
  },
  "locking": {
    "locked_by": null,
    "locked_at": null,
    "lock_expires": null
  },
  "style": {
    "background_color": "#FFFFFF",
    "text_color": "#333333",
    "highlight_color": "#FFEB3B",
    "theme_id": "custom_theme_456"
  },
  "font": {
    "family": "Inter",
    "size": 14,
    "weight": "normal",
    "line_height": 1.4
  },
  "attachments_summary": {
    "count": 3,
    "total_size_bytes": 512000,
    "has_images": true,
    "has_documents": false
  },
  "audit": {
    "created_ip": "192.168.1.1",
    "last_updated_by": "google_uid",
    "last_updated_ip": "192.168.1.1"
  }
}
```

**Campos nuevos respecto al diseño original:**

| Campo | Descripción |
|---|---|
| `notebook_id` | Libreta a la que pertenece la nota |
| `content` | TipTap JSON con schema versioning y metadata |
| `content_hash` | SHA-256 para verificación de integridad |
| `checksum` | MD5 para validación rápida de datos |
| `version` | Para optimistic locking y control de cambios |
| `sync_status` | Estado de sincronización con backend |
| `archived_at` | Archivar nota sin eliminarla (distinto a `deleted_at`) |
| `reminder_at` | Timestamp para recordatorio (procesado por Cloud Function) |
| `is_template` | Indica si la nota es una plantilla |
| `word_count` y `reading_time_minutes` | Métricas para UX y búsqueda |
| `sharing.*` | Sistema de sharing público con slugs y expiración |
| `locking.*` | Control de edición colaborativa con locks |
| `attachments_summary.*` | Cache de adjuntos para performance |
| `audit.*` | Trail completo de auditoría y seguridad |

**Campos de integridad y seguridad:**
- `content_hash`: Verificación SHA-256 del contenido TipTap
- `checksum`: Validación MD5 para detección rápida de corrupción
- `version`: Control de concurrencia para edición colaborativa
- `sync_status`: Estado de sincronización para soporte offline
- `audit.*`: IP addresses y tracking de cambios para seguridad

---

### Colección: `note_history`
Historial de cambios por nota con integridad de datos y auditoría.

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
  "content_hash": "sha256_hash_of_this_version",
  "diff": {
    "added": "nuevo texto",
    "removed": "texto eliminado"
  },
  "snapshot": null,
  "change_summary": "Added paragraph about project timeline",
  "author_ip": "192.168.1.1",
  "device_info": "Chrome/Windows Desktop",
  "merge_conflict_resolved": false,
  "restore_count": 0,
  "compression_type": "gzip",
  "diff_algorithm_version": "1.0"
}
```

---

### Colección: `audit_logs`
Sistema completo de auditoría para todos los accesos y cambios en la aplicación.

**Política de retención:**
- Logs de acceso: 90 días
- Logs de cambios: 1 año
- Logs de seguridad: 5 años

```json
{
  "id": "audit_id",
  "user_id": "google_uid",
  "action": "create|update|delete|read|share|download|login|logout",
  "resource_type": "note|notebook|attachment|user|theme|invitation",
  "resource_id": "target_resource_id",
  "ip_address": "192.168.1.1",
  "user_agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
  "timestamp": "timestamp",
  "session_id": "session_123",
  "changes": {
    "before": {
      "title": "Título anterior",
      "tags": ["antiguo"]
    },
    "after": {
      "title": "Título nuevo",
      "tags": ["nuevo", "actualizado"]
    }
  },
  "security_context": {
    "success": true,
    "error_code": null,
    "rate_limited": false,
    "suspicious_activity": false
  }
}
```

> **Importante:** Esta colección es **solo escritura** para la aplicación y **solo lectura** para administradores. No se permite modificación ni eliminación de logs.

---

### Colección: `themes`
Temas personalizados del usuario con validación de seguridad y sistema de sharing.

```json
{
  "id": "theme_id",
  "user_id": "google_uid",
  "name": "Tema oscuro minimalista",
  "description": "Tema oscuro con acentos púrpura",
  "is_system": false,
  "is_public": true,
  "usage_count": 42,
  "compatible_version": "2.0+",
  "preview_image": "https://storage.googleapis.com/.../theme-preview.png",
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
    "font_size": 14,
    "line_height": 1.5
  },
  "layout": {
    "spacing": 8,
    "border_radius": 6
  },
  "css_variables": {
    "--custom-color": "#FF5722",
    "--custom-shadow": "0 2px 8px rgba(0,0,0,0.2)"
  },
  "export_data": {
    "css": "/* Full CSS for theme sharing */",
    "json": { /* Theme data for import */ }
  },
  "validation": {
    "css_injection_safe": true,
    "accessibility_compliant": true,
    "performance_impact": "low"
  },
  "audit": {
    "created_ip": "192.168.1.1",
    "last_updated_by": "google_uid",
    "last_updated_ip": "192.168.1.1"
  }
}
```

> **Seguridad de temas:**
> - `validation.css_injection_safe`: Verificación automática contra XSS
> - `css_variables`: Variables CSS permitidas (sandboxed)
> - `is_system`: Distingue temas del sistema vs usuario
> - `validation.*`: Checks de seguridad y performance

---

### Colección: `attachments`
Archivos subidos por el usuario con seguridad, optimización y metadata avanzada.

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
  "original_name": "photo_original.jpg",
  "size_bytes": 204800,
  "file_hash": "sha256_hash_for_deduplication",
  "virus_scan_status": "pending|clean|infected|quarantine",
  "is_duplicate_of": "original_file_id",
  "thumbnail_url": "https://storage.googleapis.com/.../thumbnail.jpg",
  "compression_ratio": 0.65,
  "alt_text": "Descripción alternativa para accesibilidad",
  "extracted_metadata": {
    "exif": {
      "camera": "Canon EOS R5",
      "date_taken": "2024-01-15T10:30:00Z",
      "gps": { "lat": 40.7128, "lng": -74.0060 }
    },
    "pdf_info": {
      "page_count": 15,
      "author": "John Doe",
      "creation_date": "2024-01-10"
    },
    "duration_seconds": 180,
    "dimensions": { "width": 1920, "height": 1080 }
  },
  "download_count": 5,
  "last_accessed_at": "timestamp",
  "access_control": {
    "public_access": false,
    "allowed_users": ["google_uid_2"],
    "download_permissions": "all|owner|collaborators"
  },
  "optimization": {
    "is_optimized": true,
    "webp_available": true,
    "cdn_cached": true,
    "cache_expires": "timestamp"
  },
  "audit": {
    "created_ip": "192.168.1.1",
    "last_updated_by": "google_uid",
    "last_updated_ip": "192.168.1.1"
  },
  "created_at": "timestamp",
  "updated_at": "timestamp"
}
```

> **Seguridad y optimización:**
> - `file_hash`: Detección de duplicados y verificación de integridad
> - `virus_scan_status`: Análisis de seguridad obligatorio
> - `alt_text`: Accesibilidad obligatoria para imágenes
> - `extracted_metadata`: Información extraída para búsqueda y analytics
> - `download_count`: Métricas de uso y control de abusos

---

### Colección: `invitations`
Invitaciones para compartir notas con otros usuarios con control de seguridad y expiración.

```json
{
  "id": "invitation_id",
  "note_id": "note_id",
  "invited_by_uid": "google_uid",
  "invited_email": "colaborador@example.com",
  "invitation_token": "secure_token_abc123",
  "permission": "view|edit|comment",
  "status": "pending|accepted|rejected|revoked|expired",
  "message": "¡Hola! Me gustaría compartir esta nota contigo para que colaboremos en el proyecto.",
  "expires_at": "timestamp",
  "max_uses": 1,
  "use_count": 0,
  "group_invite": false,
  "accepted_ip": "192.168.1.1",
  "accepted_user_agent": "Mozilla/5.0...",
  "security": {
    "rate_limited": false,
    "suspicious_activity": false,
    "abuse_detected": false
  },
  "audit": {
    "created_ip": "192.168.1.1",
    "last_updated_by": "google_uid",
    "last_updated_ip": "192.168.1.1"
  },
  "created_at": "timestamp",
  "updated_at": "timestamp",
  "accepted_at": null
}
```

> **Valores de `permission`:**
> - `view`: Solo lectura
> - `edit`: Lectura y escritura
> - `comment`: Lectura y comentarios (sin editar)
> 
> **Valores de `status`:**
> - `pending`: Esperando respuesta
> - `accepted`: Invitación aceptada
> - `rejected`: Invitación rechazada
> - `revoked`: Invitación cancelada por el creador
> - `expired`: Invitación expiró por tiempo
> 
> **Seguridad:**
> - `invitation_token`: Token seguro único para cada invitación
> - `expires_at`: Expiración automática para seguridad
> - `max_uses`: Control de usos (single-use por defecto)
> - `security.*`: Detección de abusos y actividad sospechosa

---

### Colección: `sessions`
Gestión de sesiones de usuario con rotación de tokens y soporte múltiples dispositivos.

```json
{
  "id": "session_id",
  "user_id": "google_uid",
  "refresh_token_hash": "sha256_hash_of_refresh_token",
  "created_at": "timestamp",
  "expires_at": "timestamp",
  "device_info": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
  "ip_address": "192.168.1.1",
  "is_active": true,
  "last_used_at": "timestamp",
  "revoked_at": null,
  "revoked_ip": null
}
```

> **Gestión de sesiones:**
> - `refresh_token_hash`: Token de refresco hasheado con SHA-256
> - `expires_at`: Expiración de sesión (30 días por defecto)
> - `is_active`: Control de sesión activa/revocada
> - Máximo 5 sesiones concurrentes por usuario
> - Rotación de tokens en cada refresh

---

### Colección: `notifications`
Notificaciones de recordatorios y otras alertas para el usuario.

```json
{
  "id": "notification_id",
  "user_id": "google_uid",
  "note_id": "note_id",
  "type": "reminder|share|mention",
  "title": "Recordatorio: título de la nota",
  "message": "Mensaje adicional de la notificación",
  "created_at": "timestamp",
  "read": false,
  "read_at": null
}
```

> **Tipos de notificaciones:**
> - `reminder`: Recordatorio de nota
> - `share`: Nota compartida con el usuario
> - `mention`: Usuario mencionado en una nota colaborativa

---

### Colección: `security_alerts`
Alertas de seguridad generadas por Cloud Functions para detectar actividad sospechosa.

```json
{
  "id": "alert_id",
  "type": "suspicious_activity|rate_limit_exceeded|failed_login|...",
  "user_id": "google_uid",
  "log_id": "audit_log_id",
  "details": {
    "action": "delete",
    "resourceType": "note",
    "ipAddress": "unknown"
  },
  "created_at": "timestamp",
  "resolved": false,
  "resolved_at": null,
  "resolved_by": null
}
```

> **Alertas de seguridad:**
> - Detección automática de actividad sospechosa via Cloud Functions
> -Tracking de IPs desconocidas
> - Registro de acciones sensibles (delete, etc.)
> - Estado de resolución para seguimiento

---

## Índices Críticos de Performance

### Índices Compuestos Requeridos

Para garantizar un rendimiento óptimo con el modelo de datos mejorado, se requieren los siguientes índices compuestos en Firestore:

```javascript
// Índices primarios para queries frecuentes
db.collection('notes').createIndex({ 'user_id': 1, 'updated_at': -1 });
db.collection('notes').createIndex({ 'user_id': 1, 'tags': 1, 'updated_at': -1 });
db.collection('notes').createIndex({ 'user_id': 1, 'is_pinned': 1, 'updated_at': -1 });
db.collection('notes').createIndex({ 'notebook_id': 1, 'updated_at': -1 });
db.collection('notes').createIndex({ 'user_id': 1, 'sync_status': 1 });

// Índices para búsqueda y filtrado
db.collection('notes').createIndex({ 'user_id': 1, 'word_count': 1 });
db.collection('notes').createIndex({ 'user_id': 1, 'is_template': 1 });
db.collection('notes').createIndex({ 'sharing.public_slug': 1, 'sharing.public_access_expires': 1 });

// Índices para historial y auditoría
db.collection('note_history').createIndex({ 'note_id': 1, 'version': -1 });
db.collection('note_history').createIndex({ 'user_id': 1, 'timestamp': -1 });
db.collection('audit_logs').createIndex({ 'user_id': 1, 'timestamp': -1 });
db.collection('audit_logs').createIndex({ 'resource_type': 1, 'resource_id': 1, 'timestamp': -1 });

// Índices para adjuntos y storage
db.collection('attachments').createIndex({ 'user_id': 1, 'created_at': -1 });
db.collection('attachments').createIndex({ 'file_hash': 1 });
db.collection('attachments').createIndex({ 'note_id': 1, 'created_at': -1 });

// Índices para notebooks
db.collection('notebooks').createIndex({ 'user_id': 1, 'parent_notebook_id': 1 });
db.collection('notebooks').createIndex({ 'user_id': 1, 'is_favorite': 1, 'sort_order': 1 });

// Índices para invitations
db.collection('invitations').createIndex({ 'invited_email': 1, 'status': 1 });
db.collection('invitations').createIndex({ 'invitation_token': 1 });
db.collection('invitations').createIndex({ 'expires_at': 1 });
```

### Estrategia de Optimización de Queries

1. **Pagination**: Todas las listas deben usar `limit()` y `startAfter()`
2. **Caching**: Resultados frecuentes cacheados por 5 minutos
3. **Denormalization**: Campos como `attachment_count` y `word_count` pre-calculados
4. **Compound Queries**: Usar índices compuestos para filtros múltiples
5. **Result Streaming**: Para datasets grandes (>1000 documentos)

---

## Estrategia de Validación TipTap

### Schema Versioning y Validación

El contenido TipTap debe seguir un schema estricto con versioning para soportar migraciones y validación:

```typescript
interface TipTapDocumentV2 {
  schema_version: "2.0";
  type: "doc";
  content: TipTapNode[];
  metadata?: {
    word_count: number;
    character_count: number;
    last_hash: string;
    created_with: "AppNotesBG v1.0";
  };
}

// Validaciones de seguridad obligatorias
const TipTapValidationRules = {
  max_document_size: 5 * 1024 * 1024, // 5MB
  max_nested_levels: 50,
  max_text_length: 1000000, // 1M caracteres
  forbidden_tags: ['script', 'iframe', 'object', 'embed', 'form'],
  forbidden_attributes: ['onclick', 'onload', 'onerror', 'src'],
  required_sanitization: true,
  schema_validation: true
};
```

### Proceso de Validación

1. **Entrada**: Validar schema y tamaño antes de persistir
2. **Sanitización**: DOMPurify para remover contenido malicioso
3. **Hash Verification**: Calcular SHA-256 para integridad
4. **Schema Migration**: Actualizar a versión actual si es necesario
5. **Metadata Extraction**: Calcular word_count, character_count
6. **Storage**: Persistir con schema_version y metadata

### Extensiones Habilitadas y Validación

```typescript
const TipTapExtensions = {
  // Core extensions (validadas)
  StarterKit: {
    Document: { max_depth: 50 },
    Text: { max_length: 100000 },
    Paragraph: { max_children: 100 },
    Heading: { levels: [1, 2, 3, 4, 5, 6] },
    BulletList: { max_items: 1000 },
    OrderedList: { max_items: 1000 },
    Blockquote: { max_depth: 10 },
    CodeBlock: { max_lines: 1000 }
  },
  
  // Media extensions (con validación)
  Image: {
    max_size: 10 * 1024 * 1024, // 10MB
    allowed_types: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
    required_alt: true
  },
  
  // Task extensions (validadas)
  TaskList: { max_items: 500 },
  TaskItem: { max_text_length: 1000 },
  
  // Code extensions (validadas)
  CodeBlockLowlight: {
    max_lines: 1000,
    allowed_languages: ['javascript', 'typescript', 'python', 'java', 'cpp', 'html', 'css', 'json', 'markdown']
  },
  
  // Link extensions (validadas)
  Link: {
    allowed_protocols: ['http', 'https', 'mailto', 'tel'],
    max_url_length: 2048,
    require_rel_nofollow: true
  }
};
```

---

## Políticas de Seguridad

### Rate Limiting y Control de Abusos

```typescript
const SecurityPolicies = {
  // Rate limiting por endpoint
  rate_limits: {
    auth_attempts: { max: 5, window: '1m', per_ip: true },
    note_creation: { max: 100, window: '1m', per_user: true },
    file_upload: { max: 20, window: '1m', per_user: true },
    invitation_creation: { max: 10, window: '1m', per_user: true },
    search_queries: { max: 1000, window: '1h', per_user: true }
  },
  
  // Validaciones de integridad
  integrity_checks: {
    sha256_verification: true,
    checksum_validation: true,
    schema_versioning: true,
    audit_trail_required: true
  },
  
  // Control de acceso
  access_control: {
    session_timeout: 3600, // 1 hora
    ip_based_detection: true,
    suspicious_activity_threshold: 10,
    account_lockout_attempts: 5,
    two_factor_optional: true
  },
  
  // Validaciones de contenido
  content_validation: {
    max_note_size: 5 * 1024 * 1024, // 5MB
    max_attachment_size: 10 * 1024 * 1024, // 10MB
    virus_scanning_required: true,
    content_sanitization: true,
    forbidden_patterns: [
      /<script[^>]*>.*?<\/script>/gi,
      /javascript:/gi,
      /on\w+\s*=/gi
    ]
  }
};
```

### Auditoría y Logging

```typescript
const AuditRequirements = {
  // Eventos obligatorios de auditar
  mandatory_events: [
    'user.login', 'user.logout', 'user.register',
    'note.create', 'note.update', 'note.delete', 'note.read',
    'attachment.upload', 'attachment.download',
    'invitation.create', 'invitation.accept',
    'sharing.public', 'sharing.revoke'
  ],
  
  // Retención de logs
  retention_policies: {
    access_logs: '90 days',
    change_logs: '1 year',
    security_logs: '5 years',
    audit_logs: '7 years'
  },
  
  // Campos obligatorios en audit logs
  required_fields: [
    'user_id', 'action', 'resource_type', 'resource_id',
    'ip_address', 'user_agent', 'timestamp', 'success'
  ]
};
```

---

## Códigos de Error

Sistema de códigos de error estandarizados para toda la API. Implementado en `api/src/core/errors/error-codes.ts`.

### Estructura de códigos

| Prefijo | Categoría |
|---------|-----------|
| `A1xxx` | Errores de Autenticación |
| `N2xxx` | Errores de Notas |
| `B3xxx` | Errores de Libretas |
| `AT4xxx` | Errores de Adjuntos |
| `V5xxx` | Errores de Validación |
| `F6xxx` | Errores de Firestore |
| `R7xxx` | Errores de Rate Limiting |
| `I9xxx` | Errores Internos |

### Códigos detallados

#### Autenticación (A1xxx)

| Código | Descripción |
|--------|------------|
| A1001 | Token de autenticación inválido |
| A1002 | Token de autenticación expirado |
| A1003 | Se requiere refresh token |
| A1004 | Refresh token inválido o expirado |
| A1005 | Sesión no encontrada |
| A1006 | Sesión expirada |
| A1007 | Máximo de sesiones alcanzado |
| A1008 | Credenciales inválidas |

#### Notas (N2xxx)

| Código | Descripción |
|--------|------------|
| N2001 | Nota no encontrada |
| N2002 | No tienes acceso a esta nota |
| N2003 | Contenido de nota inválido |
| N2004 | Conflicto de versiones |
| N2005 | Snapshot de versión no encontrado |
| N2006 | La nota está bloqueada por otro usuario |
| N2007 | La nota está archivada |

#### Libretas (B3xxx)

| Código | Descripción |
|--------|------------|
| B3001 | Libreta no encontrada |
| B3002 | No tienes acceso a esta libreta |
| B3003 | No se puede modificar la libreta por defecto |
| B3004 | No se puede eliminar una libreta con notas |
| B3005 | No se puede eliminar una libreta con notas archivadas |

#### Adjuntos (AT4xxx)

| Código | Descripción |
|--------|------------|
| AT4001 | Adjunto no encontrado |
| AT4002 | No tienes acceso a este adjunto |
| AT4003 | El archivo excede el tamaño máximo permitido |
| AT4004 | Tipo de archivo no permitido |
| AT4005 | Cuota de almacenamiento excedida |
| AT4006 | Error al subir el archivo |

#### Validación (V5xxx)

| Código | Descripción |
|--------|------------|
| V5001 | Entrada inválida |
| V5002 | Campo requerido faltante |
| V5003 | Formato inválido |
| V5004 | Longitud máxima excedida |
| V5005 | Número máximo de elementos excedido |

#### Firestore (F6xxx)

| Código | Descripción |
|--------|------------|
| F6001 | Documento no encontrado |
| F6002 | El documento ya existe |
| F6003 | Error en la transacción |
| F6004 | Error en la consulta |

#### Rate Limiting (R7xxx)

| Código | Descripción |
|--------|------------|
| R7001 | Demasiadas solicitudes |
| R7002 | Límite de solicitudes del usuario excedido |

#### Internos (I9xxx)

| Código | Descripción |
|--------|------------|
| I9001 | Error interno del servidor |
| I9002 | Error de base de datos |
| I9003 | Error en servicio externo |

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
│   │   ├── typescript-undefined.md
│   │   ├── eslint-rules.md
│   │   ├── firestore-rules-errors.md
│   │   ├── angular-rxjs-memory-leaks.md
│   │   ├── angular-dependency-conflicts.md
│   │   ├── nestjs-typescript-unsafe.md
│   │   └── unused-imports.md
│   └── coding-standards/              ← Convenciones por tecnología (proactivo)
│       └── angular.md                 ← Convenciones Angular Signals
│
├── AppNotesBG-agents/                 ← Agentes de dominio (7)
│   ├── notes-agent.md                 ← CRUD notas, libretas, adjuntos, historial
│   ├── search-agent.md                ← Indexación y búsqueda con Algolia
│   ├── auth-agent.md                  ← Login Google, validación tokens, onboarding
│   ├── ai-agent.md                    ← Resúmenes y sugerencias con Gemini
│   ├── themes-agent.md                ← CRUD temas personalizados
│   ├── reminder-agent.md              ← Gestión de recordatorios
│   └── infra-agent.md                 ← Reglas Firestore/Storage, Cloud Functions
│
└── AppNotesBG-subagents/              ← Subagentes especializados (11)
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
    ├── infra/
    │   ├── firestore-rules.md       ← Reglas de seguridad Firestore
    │   └── storage-rules.md         ← Reglas de seguridad Storage
    ├── themes/
    │   └── theme-manager.md         ← Gestión de temas personalizados
    ├── reminders/
    │   └── reminder-scheduler.md    ← CRUD recordatorios + Cloud Functions
    └── shared/
        └── state-manager.md         ← Estado reactivo Angular Signals
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

## CI/CD

### GitHub Actions

#### Workflow: CI (`ci.yml`)

Pipeline de integración continua que se ejecuta en cada push y pull request.

```
├── on: [push, pull_request]
│   └── branches: [main, develop]
├── Jobs:
│   ├── test
│   │   ├── Node.js 20
│   │   ├── npm ci
│   │   ├── npm run lint
│   │   └── npm run test
│   └── lint-commits
│       └── wagoid/commitlint-github-action
```

#### Workflow: Deploy (`deploy.yml`)

Pipeline de deployment que se ejecuta solo en pushes a main.

```
├── on: [push]
│   └── branches: [main]
├── Jobs:
│   ├── deploy-api (Cloud Run)
│   ├── deploy-firebase (Firestore, Storage)
│   └── deploy-functions (Firebase Functions)
```

### Commitlint + Husky

Validación de mensajes de commit usando Conventional Commits.

```bash
# Formato requerido
<tipo>(<alcance>): <descripción>

# Ejemplos
feat(auth): add refresh token endpoint
fix(notes): resolve version conflict
docs: update NEGOCIO.md to v1.1.0
```

**Tipos permitidos:** feat, fix, docs, style, refactor, perf, test, build, ci, chore, revert

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

## Estado actual del proyecto

### ✅ Completado — Documentación y arquitectura

| Componente | Estado | Detalles |
|---|---|---|
| **NEGOCIO.md** | ✅ Completo | Modelo de datos, stack, funcionalidades, roadmap, decisiones técnicas |
| **AGENTS.md** | ✅ Completo | Orquestador global con routing, reglas y comunicación entre agentes |
| **Sistema de skills** | ✅ Completo | 30 archivos en 3 capas: meta-skills, agentes, subagentes |
| **Meta-skills** | ✅ Completos | create-skill, sync-agents, error-handler, git-workflow |
| **Error patterns** | ✅ Completos | 7 patrones por tecnología (TS, ESLint, Firestore, RxJS, Angular, NestJS, unused imports) |
| **Coding standards** | ✅ En progreso | 1 completo (angular.md), 6 previstos para creación gradual |
| **Agentes de dominio** | ✅ Completos | 7 agentes: notes, search, auth, ai, themes, reminders, infra |
| **Subagentes** | ✅ Completos | 11 subagentes especializados con input/output tipado |

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

### ✅ Completado — Infraestructura base (2026-02-11)

| Componente | Estado | Detalles |
|---|---|---|
| **Proyecto Firebase** | ✅ Creado | `appnotesbg-app` — Auth (Google), Firestore y Storage habilitados |
| **Firebase CLI** | ✅ v15.5.1 | Instalado y vinculado al proyecto |
| **@angular/fire** | ✅ v20.0.1 | Instalado; provideFirebaseApp, provideAuth, provideFirestore (offline persistence), provideStorage |
| **environment.ts** | ✅ Completo | `AppNotesBG/src/environments/environment.ts` y `environment.prod.ts` con config Firebase y Algolia |
| **AppModule Angular** | ✅ Actualizado | Firebase providers + HttpClient + RouterOutlet |
| **ConfigModule NestJS** | ✅ Global | Carga `.env` globalmente vía ConfigService |
| **FirebaseAdminModule** | ✅ Global | Inicializa Firebase Admin SDK; usa `service-account.json` en dev, env vars en prod |
| **FirebaseAuthGuard** | ✅ Listo | Valida Bearer token en cada request; expone `req.user` (DecodedIdToken) |
| **.env + .env.example** | ✅ Creados | `api/.env` con credenciales; `api/.env.example` como plantilla |
| **service-account.json** | ✅ En .gitignore | Clave privada del service account protegida |

### ✅ Completado — Módulo de autenticación (2026-02-11)

| Componente | Estado | Detalles |
|---|---|---|
| **AuthService (Angular)** | ✅ Completo | `loginWithGoogle()` via signInWithPopup, `logout()`, `getIdToken()` |
| **LoginComponent** | ✅ Completo | UI Tailwind con botón Google, spinner y manejo de errores. Standalone |
| **authGuard / publicGuard** | ✅ Completos | `CanActivateFn` — protege rutas autenticadas y redirige si ya hay sesión |
| **Routing Angular** | ✅ Configurado | `/login` (publicGuard) y `/` (authGuard) con lazy loading |
| **AuthController NestJS** | ✅ Completo | `POST /api/v1/auth/me` protegido con FirebaseAuthGuard |
| **AuthService NestJS** | ✅ Completo | Crea usuario completo en Firestore en primer login + libreta por defecto; actualiza sesión en logins recurrentes |
| **AuthModule NestJS** | ✅ Registrado | Registrado en AppModule |

### Flujo de autenticación implementado

```
Usuario → clic "Continuar con Google"
  → Firebase signInWithPopup
  → obtiene ID token
  → POST /api/v1/auth/me (Bearer token)
    → NestJS: FirebaseAuthGuard.verifyIdToken()
    → AuthService.loginOrRegister()
      → Primer login: crea users/{uid} + notebook "Mi libreta"
      → Login recurrente: actualiza last_login_at, login_count, avatar_url
  → AuthStateService.setUser(perfil)
  → Router navega a /
```

### ✅ Completado — Backend Core (2026-02-12)

| Componente | Estado | Detalles |
|---|---|---|
| **NotesModule** | ✅ Completo | CRUD notas con campos faltantes (reminder_at, sharing, locking), filtrado por tags, integridad de datos (MD5/SHA-256) |
| **NotebooksModule** | ✅ Completo | CRUD libretas con soporte para colaboración |
| **AttachmentsModule** | ✅ Completo | Upload/download archivos con sincronización de cuotas de storage |
| **AuditModule** | ✅ Completo | Sistema de auditoría completo (create, update, delete, read, share, download, login, logout) |
| **RemindersModule** | ✅ Completo | CRUD recordatorios con integración FCM (Firebase Cloud Messaging) |
| **SearchModule** | ✅ Completo | Integración Algolia v5 para búsqueda full-text |
| **TipTapModule** | ✅ Completo | Validación, sanitización y métricas de contenido TipTap JSON |
| **Compilación** | ✅ Exitosa | `npm run build` sin errores TypeScript |

### Correcciones aplicadas al backend

1. **Modelo de datos de notas**: Agregados campos faltantes (`reminder_at`, `sharing`, `locking`) a los DTOs y servicios
2. **Integridad de datos**: SHA-256 para `content_hash`, MD5 para `checksum` en TipTapService
3. **Gestión de cuotas**: AttachmentsService actualiza automáticamente `storage_used_bytes` y `attachments_count`
4. **Sistema de auditoría**: Nuevo AuditModule con logging de todas las operaciones críticas
5. **Filtrado por tags**: Implementado `array-contains-any` en NotesService.findAll()
6. **Correcciones de tipos**: Fixeados errores TypeScript en RemindersModule, SearchModule (Algolia v5), ThemesModule
7. **Index exports**: Creados archivos index.ts para TipTapModule y AuditModule

### 📋 Estadísticas de implementación

| Categoría | Cantidad | Archivos clave |
|---|---|---|
| **Meta-skills** | 4 | create-skill, sync-agents, error-handler, git-workflow |
| **Error patterns** | 7 | typescript-undefined, eslint-rules, firestore-rules-errors, angular-rxjs-memory-leaks, angular-dependency-conflicts, nestjs-typescript-unsafe, unused-imports |
| **Coding standards** | 1 | angular.md (typescript.md, nestjs.md, tiptap.md, firestore.md, rxjs.md, algolia.md previstos) |
| **Agentes** | 7 | notes-agent, search-agent, auth-agent, ai-agent, themes-agent, reminder-agent, infra-agent |
| **Subagentes** | 11 | note-creator, note-editor, note-history, algolia-indexer, token-validator, summarizer, tag-suggester, firestore-rules, storage-rules, state-manager, theme-manager, reminder-scheduler |
| **Core state services** | 4 | auth-state, notes-state, editor-state, ui-state |
| **Shared types** | 1 | tiptap.types.ts |
| **Guards Angular** | 2 | authGuard, publicGuard | |
| **Firestore Service** | 1 | `FirestoreService` global con helpers para acceso desde cualquier módulo |
| **Exception Filter** | 1 | `HttpExceptionFilter` global para respuestas consistentes |
| **Módulos NestJS** | 5 | AuthModule, NotesModule, NotebooksModule, AttachmentsModule, AuditModule |

### 🎯 Próximos pasos de desarrollo (MVP)

| Prioridad | Feature | Agente responsable |
|---|---|---|
| 1 | CRUD de notas (crear, editar, archivar, eliminar) | notes-agent → note-creator, note-editor |
| 2 | Libretas (notebooks) — listar, crear, seleccionar | notes-agent → note-creator |
| 3 | Tags — etiquetar notas y filtrar | notes-agent → note-editor |
| 4 | Historial de versiones | notes-agent → note-history |
| 5 | Búsqueda full-text con Algolia | search-agent → algolia-indexer |
| 6 | Temas light/dark | ✅ themes-agent → theme-manager |
| 7 | Adjuntos (imágenes/PDFs) | notes-agent → note-creator |

### 🔄 Sistema de aprendizaje acumulativo

| Sistema | Flujo | Resultado |
|---|---|---|
| **Error handling** | Error detectado → `error-handler.md` → `error-patterns/` + `coding-standards/` → `sync-agents.md` | Cada error solo ocurre una vez |
| **Skills creation** | Nuevo dominio → `create-skill.md` → nuevo agente/subagente → `sync-agents.md` | Agregado sin romper arquitectura |
| **Knowledge base** | `coding-standards/<tech>.md` se crea gradualmente | Convenciones crecen según necesidades reales |

### ✅ Completado — Audit de Seguridad y Calidad (2026-02-13)

| Área | Mejoras aplicadas |
|---|---|
| **Credenciales** | Eliminado `service-account.json` del disco; Firebase Admin SDK usa exclusivamente variables de entorno |
| **HTTP Security** | `helmet()` aplicado en `main.ts` con headers: X-Frame-Options, HSTS, X-Content-Type-Options, CSP |
| **Trust Proxy** | Configurado `trust proxy: 1` solo en producción para X-Forwarded-For seguro |
| **Endpoints expuestos** | `/reminders/expired`, `/reminders/pending` y `/search/stats` ahora son user-scoped; nunca retornan datos de otros usuarios |
| **Swagger** | Solo disponible en entornos no-producción (`NODE_ENV !== 'production'`) |
| **TipTap Schema** | `TipTapDocument` incluye campo `schema_version: '2.0'` requerido; `isValidTipTapDocument()` lo verifica |
| **Reminders bugs** | `findOne()` ya no lanza error en recordatorios expirados; permite eliminar/actualizar reminders pasados |
| **Attachment cleanup** | Error handler usa `storagePath` correcto (fileName generado) en lugar de `file.originalname` |
| **UpdateNoteDto** | Extiende `PartialType(CreateNoteDto)` — todos los campos son opcionales para PATCH parcial |
| **Firebase Rules** | `/firebase/firestore.rules` y `/firebase/storage.rules` sincronizados con la versión canónica del root |
| **Ownership errors** | `reminders.service.ts`: `BadRequestException` → `NotFoundException` para no revelar existencia de recursos |
| **virus_scan_status** | Separado en `SystemUpdateAttachmentDto` — usuarios no pueden auto-marcarse como 'clean' |
| **Algolia injection** | Filtros de búsqueda migrados a `facetFilters` (array estructurado) para eliminar inyección por string interpolation |
| **Dead dependencies** | Eliminados: `passport`, `passport-google-oauth20`, `@nestjs/passport`, `express-rate-limit` |
| **TypeScript strict** | `noImplicitAny: true`, `strictBindCallApply: true`, `noFallthroughCasesInSwitch: true` activados |
| **Crypto imports** | Reemplazados `require('crypto')` dinámicos por `import { createHash } from 'crypto'` estático |
| **Logging** | Winston integrado via `nest-winston` — logs JSON estructurados en producción, coloridos en desarrollo |
| **Coding standards** | Creados `skills/AppNotesBG-meta/coding-standards/nestjs.md` y `typescript.md` |

### ✅ Completado — Segunda Auditoría (2026-02-14)

| Área | Mejoras aplicadas |
|---|---|
| **IP Spoofing** | Nuevo helper `getClientIp(req)` en `core/request.utils.ts` que usa `req.ip` (respeta trust proxy) en lugar de raw `x-forwarded-for` header |
| **User-Agent real** | Propagado `userAgent` desde controllers → services → audit logs (antes siempre era `'NotesService/1.0'`) |
| **IP validation** | Removido regex inválido de `CreateAuditLogDto`; validación server-side con `net.isIP()` en `AuditService.validateIpAddress()` |
| **Audit failures** | Retry una vez + fallback a stderr para compliance crítico |
| **Route shadows** | Renombradas rutas `/themes/default` → `/system`, `/export` → `/export-data`, `/reminders/expired` → `/by-status`, etc. |
| **serverTimestamp en queries** | `RemindersService.findExpired()`, `findPendingByUser()`, `findPendingNotifications()` ahora usan `admin.firestore.Timestamp.now()` |
| **update() crash** | `NotesService.update()` ahora solo procesa TipTap si `dto.content !== undefined` |
| **locked_by forging** | `locked_by` siempre forzado a `req.user.uid` en `NotesService.update()` — usuarios no pueden forjar ownership |
| **processExpiredReminders** | Cambiado de `findExpired('system')` a `findPendingNotifications()` — ahora funciona correctamente |
| **TestModule** | Removido de AppModule - no disponible en producción |
| **restoreVersion timestamps** | Fix de spread de Firestore Timestamps en `UpdateNoteDto` |
| **is_sent reset** | `RemindersService.update()` ahora solo resetea `is_sent` cuando cambia `reminder_at` |
| **Batch validation** | `batchOperations` ahora valida `data` contra `UpdateReminderDto` con `plainToInstance()` |
| **Auth race condition** | `AuthService.loginOrRegister()` ahora usa `userRef.create()` con manejo de conflicto para evitar duplicate notebooks |
| **Archived query** | `NotesService.findAll()` ahora usa `orderBy('archived_at')` antes de `orderBy('updated_at')` (requerido por Firestore) |

### Historial de cambios de estado

| Fecha | Hito | Commit |
|---|---|---|
| 2026-02-10 | Documentación y arquitectura completa | `57966a2` |
| 2026-02-11 | Infraestructura base Firebase + environments | `b0e2bc7` |
| 2026-02-11 | Módulo de autenticación completo | `ad0f362` |
| 2026-02-12 | Backend alineado con NEGOCIO.md: AuditModule, correcciones de modelo y compilación exitosa | `36bf7ee` |
| 2026-02-13 | Audit P1: credenciales, helmet, endpoints expuestos, schema_version TipTap | `b62a136` |
| 2026-02-13 | Audit P2: bugs bloqueantes reminders/attachments, UpdateNoteDto, Firebase rules sync | `b1ad8b4` |
| 2026-02-13 | Audit P3: validación entradas, Algolia injection, TypeScript strict, dead deps | `1eb8663` |
| 2026-02-14 | Audit 2 P1: IP spoofing, user-agent real, audit failures, route shadows | `2e1eca7` |
| 2026-02-14 | Audit 2 P2: is_sent reset, batch validation, auth race, archived query | `8118abc` |
