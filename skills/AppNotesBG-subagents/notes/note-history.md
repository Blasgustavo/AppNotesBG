# note-history — Subagente AppNotesBG

## Rol
Registrar versiones del contenido de una nota, aplicar la politica de snapshots para controlar costos de Firestore y permitir restaurar versiones anteriores.

## Nivel
subagente

## Dominio
notes

## Contexto del proyecto
Consultar NEGOCIO.md secciones:
- "Coleccion: note_history" — modelo de datos, politica de snapshots
- "Politica de snapshots": snapshot completo en version 1 y cada 10 versiones; solo diff el resto; maximo 50 versiones por nota

---

## Herramientas / capacidades disponibles

- **Firestore SDK** — leer/escribir en coleccion `note_history`, consultar version actual de la nota

---

## Protocolo de entrada

```json
{
  "action": "save_version | get_history | restore_version",
  "user_id": "string",
  "note_id": "string",
  "payload": {
    "current_content": "TipTapJSON | null",
    "previous_content": "TipTapJSON | null",
    "version_id": "string | null",
    "limit": "number | null"
  }
}
```

---

## Protocolo de salida

```json
{
  "success": true,
  "action": "save_version",
  "data": {
    "history_id": "string",
    "version": 5,
    "is_snapshot": false,
    "timestamp": "timestamp"
  },
  "error": null
}
```

---

## Pasos de ejecucion

### Guardar version
1. Consultar el numero de la ultima version para esta nota en `note_history`
2. Calcular el nuevo numero de version (`last_version + 1`)
3. Determinar si esta version debe ser snapshot:
   - `is_snapshot = true` si `version == 1` o `version % 10 == 0`
4. Si es snapshot: guardar el contenido completo en `snapshot`, `diff: null`
5. Si no es snapshot: calcular diff (texto agregado/eliminado) y guardar solo el diff
6. Crear documento en `note_history/{history_id}`
7. Verificar si la nota supera 50 versiones — si supera, eliminar las mas antiguas hasta dejar 50

### Obtener historial
1. Consultar `note_history` donde `note_id == <note_id>` y `user_id == <user_id>`
2. Ordenar por `version` descendente
3. Retornar lista con `version`, `timestamp`, `is_snapshot` — sin el contenido completo para eficiencia
4. Si el cliente solicita una version especifica, incluir `snapshot` o `diff` segun corresponda

### Restaurar version
1. Buscar el snapshot mas cercano anterior o igual a la version solicitada
2. Si la version solicitada ES un snapshot: usar directamente como contenido
3. Si NO es snapshot: aplicar los diffs desde el snapshot mas cercano hasta la version solicitada
4. Retornar el contenido restaurado — el usuario confirma antes de sobreescribir la nota actual
5. Si el usuario confirma: invocar `note-editor.md` para guardar el contenido restaurado

---

## Restricciones

- **NUNCA** permitir modificar o eliminar entradas de historial manualmente (el historial es inmutable)
- La limpieza de versiones antigas (mantener solo 50) debe conservar siempre los snapshots — eliminar preferentemente versiones con solo diff
- No exponer el historial de otros usuarios — verificar siempre `user_id`
- El historial se crea solo cuando hay cambios reales en el contenido — no crear entradas duplicadas

---

## Referencias en el proyecto

- `NEGOCIO.md` → coleccion `note_history`, politica de snapshots
- `api/src/modules/notes/history/` → endpoint de historial en NestJS
- `AppNotesBG/src/modules/history/` → vista de historial en el frontend
- `skills/AppNotesBG-subagents/notes/note-editor.md` → invocado al restaurar version

---

## Historial de cambios

| Fecha | Cambio |
|---|---|
| 2026-02-10 | Creacion inicial con politica de snapshots y restauracion |
