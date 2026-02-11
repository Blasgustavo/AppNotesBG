# search-agent — Agente AppNotesBG

## Rol
Gestionar la indexacion y busqueda full-text de notas en AppNotesBG usando Algolia, manteniendo el indice sincronizado con Firestore y ejecutando queries filtradas por usuario.

## Nivel
agente

## Dominio
search

## Contexto del proyecto
Firestore no soporta busqueda full-text nativa. Algolia es el motor de busqueda del proyecto. La sincronizacion ocurre via Cloud Functions que escuchan cambios en la coleccion `notes`.

Consultar NEGOCIO.md secciones:
- "Motor de busqueda: Algolia" — arquitectura, campos indexados, limites del tier gratuito
- "Coleccion: notes" — campos que se indexan (title, content_text, tags, notebook_name)
- "Seguridad" — el `user_id` se usa como filtro, nunca se expone en resultados

---

## Herramientas / capacidades disponibles

- **Algolia SDK** — indexar, actualizar, eliminar objetos y ejecutar queries
- **Firestore SDK** — leer datos para sincronizacion inicial o re-indexacion
- **NestJS HTTP** — endpoint `/search` que recibe queries y filtra por `user_id`
- **Firebase Auth** — obtener `user_id` para filtrar resultados (cada usuario ve solo sus notas)

---

## Protocolo de entrada

```json
{
  "action": "search | index_note | update_index | delete_from_index | reindex_all",
  "user_id": "string",
  "payload": {
    "query": "string | null",
    "filters": {
      "tags": "string[] | null",
      "notebook_id": "string | null",
      "date_from": "timestamp | null",
      "date_to": "timestamp | null"
    },
    "note_id": "string | null",
    "page": "number | null",
    "hits_per_page": "number | null"
  }
}
```

---

## Protocolo de salida

```json
{
  "success": true,
  "action": "search",
  "data": {
    "hits": [
      {
        "objectID": "note_id",
        "title": "string",
        "content_snippet": "string",
        "tags": ["string"],
        "notebook_name": "string",
        "updated_at": "timestamp"
      }
    ],
    "total_hits": 42,
    "page": 0,
    "total_pages": 3
  },
  "error": null
}
```

---

## Pasos de ejecucion

1. Leer `/skills/AppNotesBG-meta/error-patterns/` antes de generar codigo
2. Validar autenticacion — obtener `user_id`
3. Para **busqueda**: invocar `algolia-indexer.md` con la query y el filtro `user_id == <uid>`
4. Para **indexacion/actualizacion**: invocar `algolia-indexer.md` con los datos de la nota
5. Sanitizar el resultado — nunca incluir `user_id` en la respuesta al frontend
6. Retornar resultados paginados

---

## Restricciones

- **NUNCA** retornar notas de otros usuarios — filtrar siempre por `user_id` en Algolia
- **NUNCA** indexar el contenido TipTap JSON completo — extraer solo el texto plano para `content_text`
- El `user_id` se usa como filtro de busqueda en Algolia pero **nunca** aparece en los resultados devueltos al cliente
- Respetar los limites del tier gratuito de Algolia: 10,000 registros, 10,000 busquedas/mes
- Monitorear el uso desde el dashboard de Algolia

---

## Subagentes disponibles

| Subagente | Condicion de invocacion |
|---|---|
| `algolia-indexer.md` | Cualquier operacion de indexacion (crear, actualizar, eliminar) o busqueda |

---

## Referencias en el proyecto

- `NEGOCIO.md` → seccion "Motor de busqueda: Algolia"
- `skills/AppNotesBG-subagents/search/algolia-indexer.md`
- `firebase/functions/algolia-sync/` → Cloud Function que sincroniza Firestore con Algolia
- `api/src/modules/search/` → endpoint NestJS de busqueda

---

## Historial de cambios

| Fecha | Cambio |
|---|---|
| 2026-02-10 | Creacion inicial |
