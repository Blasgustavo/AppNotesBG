# sync-agents — Meta-skill AppNotesBG

## Rol
Propagar cambios a todo el arbol de skills cuando se crea, modifica o elimina cualquier agente, subagente o meta-skill, manteniendo coherencia entre subagentes, agentes padre y el orquestador AGENTS.md.

## Nivel
meta

## Dominio
meta

## Activacion
**Automatica** — invocado por `create-skill.md`, `error-handler.md` o cualquier agente que modifique un skill. Tambien puede invocarse manualmente.

---

## Protocolo de entrada

```json
{
  "event": "skill_created | skill_modified | skill_deleted",
  "skill_type": "agente | subagente | meta",
  "skill_name": "nombre-del-skill",
  "skill_path": "skills/AppNotesBG-<tipo>/<dominio>/<nombre>.md",
  "parent_agent": "nombre-del-agente-padre | null",
  "changes_summary": "descripcion breve de que cambio"
}
```

---

## Protocolo de salida

```json
{
  "sync_completed": true,
  "files_updated": [
    "skills/AppNotesBG-agents/notes-agent.md",
    "AGENTS.md"
  ],
  "changes_applied": [
    "Agregado note-archiver en seccion Subagentes de notes-agent.md",
    "Actualizada tabla de routing en AGENTS.md"
  ]
}
```

---

## Matriz de propagacion

Segun el evento y tipo de skill, estos son los archivos que deben actualizarse:

### skill_created

| Tipo de skill creado | Archivos a actualizar |
|---|---|
| **subagente** | 1. Agente padre: agregar en "Subagentes disponibles" 2. `AGENTS.md`: agregar en tabla de routing si corresponde |
| **agente** | 1. `AGENTS.md`: agregar en tabla de agentes registrados + mapa de comunicacion + tabla de routing |
| **meta** | 1. `AGENTS.md`: agregar en tabla de meta-skills registrados |

### skill_modified

| Tipo de skill modificado | Que revisar y actualizar |
|---|---|
| **subagente** — cambio de Rol | Actualizar descripcion en agente padre + tabla routing AGENTS.md |
| **subagente** — cambio de input/output | Actualizar "Condicion de invocacion" en agente padre |
| **agente** — cambio de Rol | Actualizar tabla de agentes en AGENTS.md |
| **agente** — cambio de subagentes | Actualizar mapa de comunicacion en AGENTS.md |
| **meta** — cambio de Rol | Actualizar tabla de meta-skills en AGENTS.md |

### skill_deleted

| Tipo de skill eliminado | Acciones de limpieza |
|---|---|
| **subagente** | Remover de "Subagentes disponibles" del agente padre + limpiar AGENTS.md |
| **agente** | Remover de tabla de agentes + mapa + routing en AGENTS.md. Advertir si tenia subagentes activos |
| **meta** | Remover de tabla de meta-skills en AGENTS.md |

---

## Pasos de ejecucion

1. **Leer el archivo del skill afectado** para entender sus campos: Rol, Nivel, Dominio, Subagentes
2. **Determinar el tipo de evento** (`created | modified | deleted`) y tipo de skill
3. **Consultar la matriz de propagacion** arriba para saber que archivos tocar
4. **Leer cada archivo a actualizar** antes de editarlo
5. **Aplicar cambios minimos** — no reescribir el archivo completo, solo las secciones afectadas
6. **Verificar consistencia**: que no queden referencias rotas en ningun archivo
7. **Reportar resumen** de todos los cambios aplicados

---

## Secciones de AGENTS.md que puede tocar este skill

### Tabla de agentes registrados
```markdown
| <nombre-agente> | `AppNotesBG-agents/<nombre>.md` | <dominio> | <rol en una linea> |
```

### Tabla de meta-skills registrados
```markdown
| <nombre-skill> | `AppNotesBG-meta/<nombre>.md` | <activacion> | <responsabilidad> |
```

### Mapa global de comunicacion
```markdown
├── <nombre-agente>
│   ├── <descripcion tarea>  → <nombre-subagente>.md
│   └── <descripcion tarea>  → <nombre-subagente>.md
```

### Tabla de routing
```markdown
| <tipo de tarea> | <agente-responsable> | <subagentes a invocar> |
```

---

## Secciones del agente padre que puede tocar este skill

### Subagentes disponibles
```markdown
| Subagente | Condicion de invocacion |
|---|---|
| `<nombre-subagente>.md` | <cuando invocarlo> |
```

---

## Restricciones

- **NUNCA** reescribir un archivo completo — solo editar las secciones afectadas
- **NUNCA** eliminar contenido existente si no fue parte del cambio
- **SIEMPRE** leer el archivo antes de editarlo para preservar el contenido actual
- Si un cambio rompe la consistencia del arbol (ej: subagente sin agente padre), reportar el problema antes de aplicar
- No modificar las secciones "Historial de cambios" de otros archivos — solo del archivo del skill que origino el sync

---

## Ejemplo de ejecucion

**Evento:** Se crea `skills/AppNotesBG-subagents/notes/note-archiver.md`

**Acciones del sync:**

1. Leer `note-archiver.md` → Rol: "Archivar y desarchivar notas usando el campo `archived_at`"
2. Leer `skills/AppNotesBG-agents/notes-agent.md`
3. Agregar en la seccion "Subagentes disponibles" de `notes-agent.md`:
   ```
   | `note-archiver.md` | Cuando se solicita archivar o desarchivar una nota |
   ```
4. Leer `AGENTS.md`
5. Agregar en tabla de routing:
   ```
   | Archivar/desarchivar nota | notes-agent | note-archiver |
   ```
6. Agregar en mapa de comunicacion bajo `notes-agent`:
   ```
   │   └── Archivar notas  → note-archiver.md
   ```
7. Reportar: "2 archivos actualizados: notes-agent.md, AGENTS.md"

---

## Referencias en el proyecto

- `AGENTS.md` → orquestador — principal archivo a mantener actualizado
- `skills/AppNotesBG-agents/` → agentes padre de los subagentes
- `skills/AppNotesBG-meta/create-skill.md` → quien invoca este skill al crear
- `skills/AppNotesBG-meta/error-handler.md` → quien invoca este skill al documentar errores

---

## Historial de cambios

| Fecha | Cambio |
|---|---|
| 2026-02-10 | Creacion inicial con matriz de propagacion completa |
