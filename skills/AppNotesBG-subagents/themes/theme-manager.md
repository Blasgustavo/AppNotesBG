# theme-manager — Subagente de Temas

## Responsabilidad

Gestionar operaciones CRUD sobre temas personalizados del usuario y su aplicación dinámica en el frontend.

---

## Flujo de ejecución

### create_theme
1. Validar que el usuario no ha alcanzado el límite de 20 temas
2. Sanitizar valores de color (hex, rgb, oklch válidos)
3. Crear documento en colección `themes` con `user_id` correspondiente
4. Retornar `theme_id` y preview URL

### edit_theme
1. Validar que `theme_id` pertenece al usuario
2. Sanitizar valores actualizados
3. Actualizar documento en Firestore
4. Retornar tema actualizado

### apply_theme
1. Actualizar campo `app_theme` en documento `users/{uid}`
2. Disparar actualización en frontend via `UiStateService` (si aplica)
3. Opcional: recargar variables CSS custom properties

### delete_theme
1. Validar que `theme_id` pertenece al usuario
2. Validar que el tema no está actualmente aplicado
3. Eliminar documento en Firestore
4. Actualizar `app_theme` en `users` si era el tema activo

### preview_theme
1. Generar variables CSS custom properties temporalmente
2. Aplicar a `:root` o clase de preview
3. Retornar CSS generado para guardar o descartar

---

## Validaciones

- `palette.primary`, `palette.secondary`, etc. deben ser CSS válidos
- `typography.font_family` debe estar en lista de fuentes seguras
- `layout.spacing` debe ser >= 0 y <= 24px
- `layout.border_radius` debe ser >= 0 y <= 16px
- Límite de 20 temas por usuario (control de storage)

---

## Implementación técnica (Angular)

```typescript
// En UiStateService agregar:
readonly activeTheme = signal<Theme | null>(null);

applyTheme(theme: Theme): void {
  this.activeTheme.set(theme);
  // Aplicar CSS custom properties
  const root = document.documentElement;
  Object.entries(theme.palette).forEach(([key, value]) => {
    root.style.setProperty(`--theme-${key}`, value);
  });
  root.style.setProperty('--theme-font-family', theme.typography.font_family);
  root.style.setProperty('--theme-font-size', `${theme.typography.font_size}px`);
  root.style.setProperty('--theme-spacing', `${theme.layout.spacing}px`);
  root.style.setProperty('--theme-border-radius', `${theme.layout.border_radius}px`);
}
```

---

## Seguridad

- Sanitizar colores para evitar CSS injection
- No permitir `javascript:` o `data:` URLs
- Validar que el tema pertenece al usuario autenticado

---

## Historial

| Fecha | Cambio |
|---|---|
| 2026-02-11 | Creación — operaciones CRUD + CSS custom properties |
