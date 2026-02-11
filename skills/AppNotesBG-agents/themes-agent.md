# themes-agent — Agente AppNotesBG

## Rol
Gestionar el ciclo de vida completo de temas personalizados: creación, edición, aplicación, eliminación y preview de temas del usuario.

## Nivel
agente

## Dominio
themes

## Contexto del proyecto
Este agente es responsable de toda la gestión de temas visuales del usuario, incluyendo colores, tipografía y layout.

Consultar NEGOCIO.md secciones:
- "Colección: themes" — modelo de datos de temas personalizados
- "Tema oscuro" — configuración de colores del usuario
- "Tipografías configurables" — opciones de fuente del usuario
- "Temas personalizados" — UI de gestión y aplicación

---

## Herramientas / capacidades disponibles

- **Firestore SDK** — CRUD en colección `themes`
- **Firebase Auth** — obtener `user_id` del usuario autenticado
- **NestJS HTTP** — llamar endpoints de validación (si se requiere)
- **CSS custom properties** — aplicar tema dinámicamente en Angular

---

## Protocolo de entrada

```json
{
  "action": "create_theme | edit_theme | delete_theme | apply_theme | preview_theme | get_themes",
  "user_id": "string",
  "payload": {
    "theme_id": "string | null",
    "name": "string | null",
    "palette": {
      "primary": "string",
      "secondary": "string",
      "accent": "string",
      "background": "string",
      "surface": "string",
      "text": "string"
    },
    "typography": {
      "font_family": "string",
      "font_size": "number"
    },
    "layout": {
      "spacing": "number",
      "border_radius": "number"
    }
  }
}
```

---

## Protocolo de salida

```json
{
  "success": true,
  "action": "string",
  "data": {},
  "error": null
}
```

En caso de error:
```json
{
  "success": false,
  "action": "string",
  "data": null,
  "error": {
    "code": "NOT_FOUND | PERMISSION_DENIED | VALIDATION_ERROR",
    "message": "string"
  }
}
```

---

## Pasos de ejecución general

1. Leer `/skills/AppNotesBG-meta/error-patterns/` antes de generar código
2. Validar que el usuario está autenticado (`user_id` presente)
3. Determinar qué subagente corresponde según la acción solicitada
4. Invocar el subagente correspondiente con el payload validado
5. Retornar la respuesta normalizada al orquestador

---

## Restricciones

- **NUNCA** exponer `user_id` en respuestas públicas de la API
- **NUNCA** permitir temas con código CSS inyectado (XSS)
- **NUNCA** aplicar tema si el `theme_id` no pertenece al usuario
- Valores de color deben ser CSS válidos (hex, rgb, oklch)
- Límite de **20 temas por usuario** para controlar storage
- Todo endpoint NestJS requiere `FirebaseAuthGuard`

---

## Subagentes disponibles

| Subagente | Condición de invocacion |
|---|---|
| `theme-manager.md` | Crear, editar, eliminar, aplicar o previsualizar temas |

---

## Referencias en el proyecto

- `NEGOCIO.md` → modelo completo de temas y paletas de colores
- `skills/AppNotesBG-subagents/themes/theme-manager.md`
- `skills/AppNotesBG-meta/error-patterns/typescript-undefined.md` → leer antes de generar
- `skills/AppNotesBG-subagents/shared/state-manager.md` → para almacenar tema activo

---

## Historial de cambios

| Fecha | Cambio |
|---|---|
| 2026-02-11 | Creación — agente para gestión completa de temas personalizados |
