# tag-suggester — Subagente AppNotesBG

## Rol
Sugerir etiquetas relevantes para una nota usando Google Gemini API, teniendo en cuenta los tags existentes del usuario para mantener consistencia en su sistema de organizacion.

## Nivel
subagente

## Dominio
ai

## Contexto del proyecto
Consultar NEGOCIO.md secciones:
- "Roadmap — IA para resumenes y organizacion automatica"
- "Coleccion: notes" — campo `tags: string[]`
- "Coleccion: users" — tags usados previamente por el usuario (para contexto)

---

## Herramientas / capacidades disponibles

- **Google Gemini API** — modelo `gemini-pro` para clasificacion y sugerencia de etiquetas
- **TipTap** — extraer texto plano del JSON para analisis
- **Firestore SDK** — leer tags existentes del usuario para contexto

---

## Protocolo de entrada

```json
{
  "action": "suggest_tags",
  "payload": {
    "note_id": "string",
    "content": "TipTapJSON",
    "title": "string",
    "existing_note_tags": ["string"],
    "user_existing_tags": ["string"],
    "language": "es | en",
    "max_suggestions": 5
  }
}
```

---

## Protocolo de salida

```json
{
  "success": true,
  "action": "suggest_tags",
  "data": {
    "suggested_tags": ["trabajo", "ideas", "proyecto-alpha"],
    "matched_existing": ["trabajo"],
    "new_tags": ["ideas", "proyecto-alpha"],
    "confidence": 0.85
  },
  "error": null
}
```

---

## Pasos de ejecucion

1. Extraer texto plano del TipTap JSON
2. Obtener los tags que el usuario ya usa en otras notas (para contexto de consistencia)
3. Construir el prompt:
   ```
   Eres un asistente que sugiere etiquetas para notas.
   Sugiere entre 3 y [max_suggestions] etiquetas relevantes en [idioma].
   Prefiere etiquetas de la lista de tags existentes del usuario si aplican.
   Si propones etiquetas nuevas, deben ser cortas (1-2 palabras) y en minusculas.
   Tags que el usuario ya usa: [user_existing_tags]
   Titulo: [title]
   Texto: [texto_plano]
   Responde SOLO con un array JSON de strings.
   ```
4. Llamar a Gemini API con temperatura `0.4`
5. Parsear y validar la respuesta como array de strings
6. Separar las sugerencias en `matched_existing` (tags que ya usa el usuario) y `new_tags` (tags nuevos)
7. Retornar sugerencias — el usuario elige cuales aplicar
8. Si Gemini falla: retornar `error.code: "AI_SERVICE_UNAVAILABLE"` con graceful degradation

---

## Restricciones

- **NUNCA** aplicar tags automaticamente — siempre requiere confirmacion del usuario
- **NUNCA** enviar `user_id` ni datos personales a Gemini API
- Los tags sugeridos deben ser en minusculas y sin caracteres especiales
- Maximo 5 sugerencias por llamada para evitar sobrecarga cognitiva al usuario
- Manejar errores de Gemini con graceful degradation

---

## Referencias en el proyecto

- `NEGOCIO.md` → seccion "Roadmap — IA", campo `tags` en coleccion `notes`
- `api/src/modules/ai/tag-suggester.service.ts`
- `skills/AppNotesBG-subagents/ai/summarizer.md` → subagente hermano

---

## Historial de cambios

| Fecha | Cambio |
|---|---|
| 2026-02-10 | Creacion inicial |
