# create-skill — Meta-skill AppNotesBG

## Rol
Guiar interactivamente la creacion de nuevos skills (agentes, subagentes o meta-skills) para AppNotesBG, generando el archivo `.md` con todas las secciones completas basadas en el contexto del proyecto, e invocando `sync-agents.md` al finalizar.

## Nivel
meta

## Dominio
meta

## Activacion
Manual — invocado por un dev o agente cuando se necesita agregar una nueva capacidad al sistema.

---

## Flujo interactivo de creacion

El skill hace las siguientes preguntas en orden. No avanzar a la siguiente sin respuesta de la anterior.

### Pregunta 1 — Tipo de skill
```
¿Que tipo de skill quieres crear?
  1. agente     → dominio de negocio (notes, auth, search, ai, infra)
  2. subagente  → tarea especifica dentro de un dominio
  3. meta       → gestiona el propio sistema de skills
```

### Pregunta 2 — Nombre
```
¿Cual es el nombre del skill? (usar kebab-case, sin prefijo del proyecto)
Ejemplo: note-archiver, reminder-sender, pdf-exporter
```
El archivo se guardara como:
- Agente: `skills/AppNotesBG-agents/<nombre>.md`
- Subagente: `skills/AppNotesBG-subagents/<dominio>/<nombre>.md`
- Meta: `skills/AppNotesBG-meta/<nombre>.md`

### Pregunta 3 — Dominio
```
¿A que dominio pertenece?
  notes | notebooks | auth | search | ai | infra | meta | [nuevo dominio]
```
Si el dominio es nuevo, crear la carpeta `skills/AppNotesBG-subagents/<nuevo-dominio>/`.

### Pregunta 4 — Responsabilidad
```
¿Cual es la responsabilidad de este skill en UNA oracion?
(Sera el campo "Rol" del archivo)
```

### Pregunta 5 — Solo para subagentes
```
¿A que agente padre pertenece este subagente?
(Agentes disponibles: notes-agent, search-agent, auth-agent, ai-agent, infra-agent)
```

### Pregunta 6 — Solo para agentes
```
¿Que subagentes existentes necesita invocar? (puede ser ninguno)
Lista de subagentes disponibles: [leer AppNotesBG-subagents/]
```

### Pregunta 7 — Herramientas
```
¿Que herramientas o capacidades necesita? Seleccionar las que aplican:
  - Firestore SDK (lectura/escritura de colecciones)
  - Firebase Auth (validacion de tokens)
  - Firebase Storage (subir/eliminar archivos)
  - Algolia SDK (indexar/buscar)
  - NestJS HTTP (llamar endpoints de la API)
  - Google Gemini API (IA)
  - TipTap (manipulacion de contenido JSON)
  - Angular Forms (input del usuario)
  - Otras: [especificar]
```

### Pregunta 8 — Referencias del proyecto
```
¿Que secciones de NEGOCIO.md o que archivos del proyecto son relevantes?
Ejemplo: "Coleccion notes, coleccion notebooks, seccion Editor TipTap"
```

---

## Generacion del archivo

Con las respuestas, generar el archivo usando la siguiente plantilla completa:

```markdown
# <nombre> — <tipo> AppNotesBG

## Rol
<responsabilidad en una oracion — respuesta pregunta 4>

## Nivel
<agente | subagente | meta>

## Dominio
<dominio — respuesta pregunta 3>

## Contexto del proyecto
<referencias relevantes del proyecto — respuesta pregunta 8>
Consultar NEGOCIO.md seccion: <secciones relevantes>

## Herramientas / capacidades disponibles
<lista de herramientas — respuesta pregunta 7>

## Protocolo de entrada
```json
{
  // definir campos esperados con sus tipos
}
```

## Protocolo de salida
```json
{
  "success": true,
  // definir campos de retorno
}
```

## Pasos de ejecucion
1. [Paso 1]
2. [Paso 2]
3. [Paso 3]

## Restricciones
- [Que NO debe hacer]

## Referencias en el proyecto
- `NEGOCIO.md` → <seccion relevante>
- `<archivo relevante>` → <para que>

## Subagentes disponibles    ← Solo incluir si es agente
| Subagente | Condicion de invocacion |
|---|---|
| <nombre> | <cuando invocarlo> |

## Historial de cambios
| Fecha | Cambio |
|---|---|
| <fecha> | Creacion inicial |
```

---

## Acciones post-creacion

Una vez generado el archivo, ejecutar automaticamente:

1. **Invocar `sync-agents.md`** con:
   ```json
   {
     "event": "skill_created",
     "skill_type": "<agente|subagente|meta>",
     "skill_name": "<nombre>",
     "skill_path": "<ruta del archivo creado>",
     "parent_agent": "<agente padre si es subagente | null>"
   }
   ```

2. **Confirmar al dev** con el resumen:
   ```
   Skill creado: skills/AppNotesBG-<tipo>/<dominio>/<nombre>.md
   Agente padre actualizado: [si aplica]
   AGENTS.md actualizado: si
   ```

---

## Restricciones

- **NUNCA** crear un skill sin completar todas las preguntas del flujo
- **NUNCA** omitir el campo "Rol" — es la descripcion que usa AGENTS.md para el routing
- **NUNCA** crear un subagente sin asignarlo a un agente padre
- **SIEMPRE** invocar `sync-agents.md` al finalizar — el arbol debe estar sincronizado
- Los nombres de archivo usan **kebab-case** — sin espacios, sin mayusculas, sin prefijo del proyecto

---

## Referencias en el proyecto

- `AGENTS.md` → tabla de agentes y meta-skills registrados (sync-agents lo actualiza)
- `NEGOCIO.md` → fuente de verdad del negocio para rellenar el contexto del skill
- `skills/AppNotesBG-meta/sync-agents.md` → invocar al finalizar
- `skills/AppNotesBG-agents/` → agentes existentes
- `skills/AppNotesBG-subagents/` → subagentes existentes

---

## Historial de cambios

| Fecha | Cambio |
|---|---|
| 2026-02-10 | Creacion inicial con flujo interactivo de 8 preguntas |
