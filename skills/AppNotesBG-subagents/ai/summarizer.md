# summarizer — Subagente AppNotesBG

## Rol
Generar resumenes concisos de notas usando Google Gemini API, extrayendo el texto plano del contenido TipTap JSON antes de enviarlo al modelo.

## Nivel
subagente

## Dominio
ai

## Contexto del proyecto
Consultar NEGOCIO.md secciones:
- "Roadmap — IA para resumenes y organizacion automatica"
- "Editor de texto: TipTap" — formato de contenido del que se extrae texto plano
- "Decisiones tecnicas" → Google Gemini API v1

---

## Herramientas / capacidades disponibles

- **Google Gemini API** — modelo `gemini-pro` para generacion de texto
- **TipTap** — extraer texto plano del JSON recursivamente
- **NestJS HTTP** — llamada desde el endpoint `/ai/summarize`

---

## Protocolo de entrada

```json
{
  "action": "summarize",
  "payload": {
    "note_id": "string",
    "content": "TipTapJSON",
    "title": "string",
    "language": "es | en"
  }
}
```

---

## Protocolo de salida

```json
{
  "success": true,
  "action": "summarize",
  "data": {
    "summary": "string",
    "word_count_original": 350,
    "word_count_summary": 45,
    "language": "es"
  },
  "error": null
}
```

---

## Pasos de ejecucion

1. Extraer texto plano del TipTap JSON
2. Verificar que el texto tiene al menos 100 palabras — si tiene menos, retornar error `CONTENT_TOO_SHORT`
3. Truncar el texto a 4000 tokens si supera ese limite
4. Construir el prompt:
   ```
   Eres un asistente que resume notas de forma concisa.
   Resume el siguiente texto en 2-3 oraciones en [idioma].
   No inventes informacion que no este en el texto.
   Titulo: [title]
   Texto: [texto_plano]
   ```
5. Llamar a Gemini API con temperatura `0.3` para respuestas consistentes
6. Retornar el resumen — el usuario decide si guardarlo en la nota
7. Si Gemini falla: retornar `error.code: "AI_SERVICE_UNAVAILABLE"` con graceful degradation

---

## Restricciones

- **NUNCA** enviar `user_id`, email ni datos personales identificables a Gemini API
- **NUNCA** guardar el resumen automaticamente — siempre esperar confirmacion del usuario
- Limitar el texto a **4000 tokens** antes de enviar — truncar si es necesario
- Manejar errores de Gemini con graceful degradation — la app sigue funcionando si la IA falla
- No inventar informacion en el resumen — usar temperatura baja (0.3)

---

## Referencias en el proyecto

- `NEGOCIO.md` → seccion "Roadmap — IA"
- `api/src/modules/ai/summarizer.service.ts`
- `skills/AppNotesBG-subagents/ai/tag-suggester.md` → subagente hermano

---

## Historial de cambios

| Fecha | Cambio |
|---|---|
| 2026-02-10 | Creacion inicial |
