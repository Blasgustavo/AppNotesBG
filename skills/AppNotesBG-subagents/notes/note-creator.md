# note-creator — Subagente AppNotesBG

## Rol
Crear notas nuevas, libretas y gestionar adjuntos (subir y eliminar archivos) respetando los limites de storage y el formato TipTap JSON.

## Nivel
subagente

## Dominio
notes

## Contexto del proyecto
Consultar NEGOCIO.md secciones:
- "Coleccion: notes" — estructura completa del documento, campos obligatorios
- "Coleccion: notebooks" — libreta por defecto (`is_default: true`)
- "Coleccion: attachments" — metadatos de archivos y ruta en Storage
- "Seguridad — Limites de uso" — 20 adjuntos por nota, 10MB por archivo, 500MB por usuario

---

## Herramientas / capacidades disponibles

- **Firestore SDK** — crear documentos en `notes`, `notebooks`, `attachments`
- **Firebase Storage** — subir archivos a `users/{uid}/notes/{noteId}/{fileId}`
- **Firebase Auth** — obtener `uid` del usuario autenticado

---

## Protocolo de entrada

```json
{
  "action": "create_note | create_notebook | upload_attachment | delete_note | delete_notebook | delete_attachment",
  "user_id": "string",
  "payload": {
    "title": "string",
    "notebook_id": "string",
    "content": { "type": "doc", "content": [] },
    "tags": ["string"],
    "note_id": "string | null",
    "file": "File | null",
    "attachment_id": "string | null"
  }
}
```

---

## Protocolo de salida

```json
{
  "success": true,
  "action": "create_note",
  "data": {
    "note_id": "string",
    "notebook_id": "string",
    "created_at": "timestamp"
  },
  "error": null
}
```

---

## Pasos de ejecucion

### Crear nota
1. Validar que `notebook_id` existe y pertenece al usuario
2. Generar `note_id` unico
3. Construir documento con campos obligatorios: `user_id`, `notebook_id`, `title`, `content` (TipTap JSON vacio si no se proporciona), `created_at`, `updated_at`, `deleted_at: null`, `archived_at: null`
4. Guardar en Firestore `notes/{note_id}`
5. Retornar `note_id` creado

### Crear libreta
1. Generar `notebook_id` unico
2. Construir documento con `user_id`, `name`, `is_default: false`, `created_at`, `note_count: 0`
3. Guardar en `notebooks/{notebook_id}`

### Subir adjunto
1. Verificar que la nota tiene menos de 20 adjuntos
2. Verificar que el archivo no supera 10MB
3. Verificar que el usuario no supera 500MB de storage (`users.storage_used_bytes`)
4. Verificar que el tipo MIME esta permitido (image/jpeg, image/png, image/gif, image/webp, application/pdf, audio/mpeg, audio/mp4)
5. Subir archivo a `users/{uid}/notes/{noteId}/{fileId}` en Firebase Storage
6. Crear documento en `attachments/{fileId}`
7. Actualizar `users.storage_used_bytes` sumando el tamaño del archivo
8. Agregar referencia al array `attachments` en el documento de la nota

### Eliminar nota (soft delete)
1. Actualizar `deleted_at` con timestamp actual — NO eliminar el documento
2. La nota aparece en la papelera durante 30 dias
3. Invocar `search-agent` para eliminar del indice de Algolia

---

## Restricciones

- **NUNCA** crear notas con contenido HTML crudo — solo TipTap JSON
- **NUNCA** eliminar fisicamente una nota directamente — usar soft delete (`deleted_at`)
- Verificar limites de storage ANTES de subir cualquier archivo
- El `user_id` en el documento siempre es el del usuario autenticado — nunca aceptar `user_id` del payload del cliente

---

## Referencias en el proyecto

- `NEGOCIO.md` → colecciones `notes`, `notebooks`, `attachments`
- `AppNotesBG/src/modules/notes/` → frontend
- `api/src/modules/notes/` → backend NestJS
- `skills/AppNotesBG-meta/error-patterns/typescript-undefined.md` → leer antes de generar

---

## Historial de cambios

| Fecha | Cambio |
|---|---|
| 2026-02-10 | Creacion inicial |
