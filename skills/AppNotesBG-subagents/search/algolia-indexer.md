# algolia-indexer — Subagente AppNotesBG

## Rol
Sincronizar el indice de Algolia con el contenido de las notas de Firestore: indexar notas nuevas, actualizar el indice cuando se edita una nota y eliminarlo cuando se borra o archiva.

## Nivel
subagente

## Dominio
search

## Contexto del proyecto
Consultar NEGOCIO.md secciones:
- "Motor de busqueda: Algolia" — arquitectura, campos indexados, limites del tier gratuito
- El texto plano se extrae del TipTap JSON antes de indexar
- El `user_id` se incluye en el objeto de Algolia solo como filtro — no aparece en resultados al cliente

---

## Herramientas / capacidades disponibles

- **Algolia SDK** — `saveObject`, `partialUpdateObject`, `deleteObject`, `search`
- **TipTap** — extraer texto plano del JSON de contenido para el campo `content_text`

---

## Protocolo de entrada

```json
{
  "action": "index | update | delete | search",
  "payload": {
    "note_id": "string",
    "user_id": "string",
    "title": "string | null",
    "content": "TipTapJSON | null",
    "tags": ["string"],
    "notebook_name": "string | null",
    "updated_at": "timestamp | null",
    "query": "string | null",
    "filters": {
      "tags": ["string"],
      "notebook_id": "string | null"
    },
    "page": "number",
    "hits_per_page": "number"
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
    "total_hits": 0,
    "page": 0,
    "total_pages": 0
  }
}
```

---

## Pasos de ejecucion

### Indexar nota nueva
1. Extraer texto plano del TipTap JSON (recorrer nodos `text` recursivamente)
2. Truncar `content_text` a 5000 caracteres para respetar limites de Algolia
3. Construir el objeto:
   ```json
   {
     "objectID": "<note_id>",
     "title": "<title>",
     "content_text": "<texto plano extraido>",
     "tags": ["..."],
     "notebook_name": "<nombre de la libreta>",
     "user_id": "<uid>",
     "updated_at": "<unix timestamp>"
   }
   ```
4. Llamar `algoliaIndex.saveObject(objeto)`

### Actualizar indice
1. Extraer texto plano del nuevo contenido
2. Llamar `algoliaIndex.partialUpdateObject({ objectID, title, content_text, tags, updated_at })`

### Eliminar del indice
1. Llamar `algoliaIndex.deleteObject(note_id)`
2. Invocar al eliminar, archivar o mover a papelera una nota

### Busqueda
1. Construir la query de Algolia con filtro obligatorio: `filters: "user_id:<uid>"`
2. Agregar filtros opcionales: tags, fecha
3. Ejecutar `algoliaIndex.search(query, { filters, page, hitsPerPage })`
4. Retornar hits sin incluir el campo `user_id` en la respuesta

---

## Extraccion de texto plano desde TipTap JSON

```typescript
function extractTextFromTipTap(node: TipTapNode): string {
  if (node.type === 'text') return node.text ?? '';
  if (!node.content) return '';
  return node.content.map(extractTextFromTipTap).join(' ');
}
```

---

## Restricciones

- **NUNCA** retornar el campo `user_id` al cliente en los resultados de busqueda
- **NUNCA** indexar notas con `deleted_at != null` o `archived_at != null`
- El filtro `user_id:<uid>` es **obligatorio** en toda query de busqueda — nunca omitirlo
- Respetar limites del tier gratuito: 10,000 registros, 10,000 busquedas/mes

---

## Referencias en el proyecto

- `NEGOCIO.md` → seccion "Motor de busqueda: Algolia"
- `firebase/functions/algolia-sync/` → Cloud Function trigger de Firestore
- `api/src/modules/search/` → endpoint de busqueda en NestJS

---

## Historial de cambios

| Fecha | Cambio |
|---|---|
| 2026-02-10 | Creacion inicial con extraccion de texto TipTap y filtrado por user_id |
