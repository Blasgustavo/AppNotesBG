# note-editor — Subagente AppNotesBG

## Rol
Editar el contenido, metadatos y estado de una nota existente: titulo, contenido TipTap, tags, estilo, libreta, archivado y restauracion desde papelera.

## Nivel
subagente

## Dominio
notes

## Contexto del proyecto
Consultar NEGOCIO.md secciones:
- "Coleccion: notes" — todos los campos editables: title, content, tags, style, font, notebook_id, is_pinned, archived_at
- "Editor de texto: TipTap" — formato de contenido y seguridad XSS con DOMPurify
- "Organizacion de notas" — mover nota entre libretas

---

## Herramientas / capacidades disponibles

- **Firestore SDK** — actualizar documentos en coleccion `notes`
- **TipTap** — validar que el contenido entrante es TipTap JSON valido
- **DOMPurify** — sanitizar cualquier contenido antes de persistir

---

## Protocolo de entrada

```json
{
  "action": "update_content | update_title | update_tags | update_style | move_to_notebook | pin_note | archive_note | unarchive_note | restore_from_trash",
  "user_id": "string",
  "note_id": "string",
  "payload": {
    "title": "string | null",
    "content": "TipTapJSON | null",
    "tags": ["string"] ,
    "style": {
      "background_color": "string | null",
      "text_color": "string | null",
      "highlight_color": "string | null"
    },
    "font": {
      "family": "string | null",
      "size": "number | null"
    },
    "notebook_id": "string | null",
    "is_pinned": "boolean | null"
  }
}
```

---

## Protocolo de salida

```json
{
  "success": true,
  "action": "update_content",
  "data": {
    "note_id": "string",
    "updated_at": "timestamp",
    "fields_updated": ["content", "updated_at"]
  },
  "error": null
}
```

---

## Pasos de ejecucion

### Editar contenido
1. Verificar que la nota existe y pertenece al usuario (`user_id`)
2. Verificar que `content` es TipTap JSON valido (tiene `type: "doc"`)
3. Sanitizar contenido con DOMPurify antes de persistir
4. Actualizar campos `content` y `updated_at` en Firestore
5. Disparar guardado en `note_history` (via notes-agent → note-history.md)
6. Actualizar indice de Algolia (via search-agent) con el nuevo texto plano

### Archivar nota
1. Verificar ownership
2. Actualizar `archived_at` con timestamp actual
3. La nota deja de aparecer en la lista principal pero es accesible desde "Archivados"

### Restaurar desde papelera
1. Verificar que `deleted_at` no es null (esta en papelera)
2. Limpiar `deleted_at` → `null`
3. La nota vuelve a su libreta original

### Mover a otra libreta
1. Verificar que la libreta destino existe y pertenece al usuario
2. Actualizar `notebook_id` en la nota
3. Actualizar `note_count` en la libreta origen (decrementar) y destino (incrementar)

---

## Restricciones

- **NUNCA** aceptar contenido HTML crudo — validar que es TipTap JSON antes de persistir
- **NUNCA** modificar `user_id`, `created_at` ni `id` de la nota — son inmutables
- Siempre actualizar `updated_at` en cualquier operacion de edicion
- Si se edita el contenido, siempre notificar a `note-history.md` para registrar la version

---

## Referencias en el proyecto

- `NEGOCIO.md` → coleccion `notes`, seccion "Editor de texto: TipTap"
- `AppNotesBG/src/modules/notes/` → componente editor del frontend
- `api/src/modules/notes/` → endpoint PATCH de notas en NestJS
- `skills/AppNotesBG-meta/error-patterns/typescript-undefined.md`

---

## Historial de cambios

| Fecha | Cambio |
|---|---|
| 2026-02-10 | Creacion inicial |
