# git-workflow — Meta-skill AppNotesBG

## Rol
Gestionar y validar toda operacion Git y GitHub del proyecto AppNotesBG, garantizando que commits, ramas y pull requests cumplan los estandares definidos antes de ejecutarse.

## Nivel
meta

## Dominio
meta

## Activacion
Obligatoria antes de cualquier operacion: `git commit`, `git push`, crear rama, abrir PR, hacer merge.

---

## Estandar de commits: Conventional Commits + Gitmoji

### Formato obligatorio

```
<gitmoji> <type>(<scope>): <descripcion en imperativo, minusculas>

[body opcional — explicar el POR QUE, no el que]

[footer opcional: refs #issue, BREAKING CHANGE: descripcion]
```

### Tabla de tipos validos

| Gitmoji | Type | Cuando usarlo |
|---|---|---|
| ✨ | `feat` | Nueva funcionalidad visible para el usuario |
| 🐛 | `fix` | Correccion de bug |
| ♻️ | `refactor` | Refactor sin cambio funcional ni fix |
| 📝 | `docs` | Solo documentacion (md, comentarios, JSDoc) |
| 🧪 | `test` | Agregar o corregir tests |
| 🎨 | `style` | Formato, lint, espacios — sin logica |
| ⚡ | `perf` | Mejora de rendimiento |
| 🔧 | `chore` | Config, dependencias, scripts, herramientas |
| 🚀 | `ci` | CI/CD pipelines y workflows |
| 🔥 | `revert` | Revertir un commit anterior |
| 🔒 | `security` | Parche de seguridad o fix de vulnerabilidad |

### Scopes validos para AppNotesBG

```
notes | notebooks | auth | search | ai | infra | editor
themes | attachments | skills | api | frontend | e2e | deps
```

### Ejemplos correctos

```
✨ feat(notes): add notebook creation with default assignment
🐛 fix(auth): handle expired token refresh on silent login
📝 docs(skills): update AGENTS.md routing table
🧪 test(search): add algolia indexer integration tests
♻️ refactor(notes): extract note-mapper to shared util
🔧 chore(deps): upgrade angular to 21.1.0
🔒 security(auth): validate token expiry before Firestore write
```

### Ejemplos incorrectos (rechazar)

```
// Sin gitmoji
feat(notes): add notebook

// Sin scope
✨ feat: add notebook creation

// Descripcion en pasado
✨ feat(notes): added notebook creation

// Descripcion en mayusculas
✨ feat(notes): Add Notebook Creation

// Tipo invalido
✨ update(notes): notebook creation
```

---

## Flujo de ramas: GitHub Flow

### Estructura

```
main  ← produccion, siempre deployable, protegida
 └── feature/<scope>/<descripcion-corta>
 └── fix/<scope>/<descripcion-corta>
 └── docs/<descripcion-corta>
 └── chore/<descripcion-corta>
 └── security/<scope>/<descripcion-corta>
```

### Convencion de nombres de rama

- Usar kebab-case
- Maximo 50 caracteres
- Describe QUE se hace, no como

```
// Correctos
feature/notes/notebook-creation
feature/auth/google-signin-flow
fix/search/algolia-sync-on-delete
fix/editor/tiptap-image-upload
docs/skills/add-git-workflow
chore/deps/upgrade-nestjs-10
security/auth/token-expiry-validation

// Incorrectos
feature/addNotebookCreation     ← camelCase
feature/notes                   ← demasiado vago
my-branch                       ← sin tipo ni scope
fix/notas-bug                   ← descripcion en espanol mezclada
```

### Reglas del flujo

1. **Nunca** hacer commit directo a `main`
2. Toda rama se crea desde `main` actualizado (`git pull origin main` primero)
3. PR obligatorio para mergear a `main` — no merge directo
4. La rama se elimina despues del merge (GitHub: "Delete branch" automatico)
5. `main` debe tener todos los tests pasando antes del merge
6. Un PR = una funcionalidad o fix — no mezclar multiples features

---

## Pull Requests — Estandar

### Titulo del PR

Misma convencion que el commit principal:
```
✨ feat(notes): add notebook creation with default assignment
```

### Plantilla obligatoria del body

```markdown
## Que hace este PR?
- [bullet 1]
- [bullet 2]
- [bullet 3 opcional]

## Tipo de cambio
- [ ] feat (nueva funcionalidad)
- [ ] fix (correccion de bug)
- [ ] refactor
- [ ] docs
- [ ] chore

## Como probarlo
1. Paso 1
2. Paso 2
3. Resultado esperado

## Checklist
- [ ] Tests agregados o actualizados
- [ ] Sin `console.log` olvidados
- [ ] Sin errores de lint (`npm run lint`)
- [ ] AGENTS.md actualizado si cambio algun skill
- [ ] NEGOCIO.md actualizado si cambio el modelo de datos
```

---

## Protocolo de validacion — Paso a paso

### Antes de `git commit`

1. Verificar que el mensaje sigue el formato: `<gitmoji> <type>(<scope>): <desc>`
2. Verificar que `<type>` esta en la tabla de tipos validos
3. Verificar que `<scope>` esta en la lista de scopes de AppNotesBG
4. Verificar que la descripcion esta en imperativo y minusculas
5. Si el commit toca un skill → recordar invocar `sync-agents.md`

### Antes de `git push`

1. Verificar que NO es la rama `main`
2. Verificar que la rama sigue la convencion `type/scope/descripcion`
3. Ejecutar `npm run lint` y `npm run test` — no pushear con errores

### Antes de abrir un PR

1. Verificar que la rama esta actualizada con `main` (rebase o merge)
2. Usar la plantilla de PR definida arriba
3. Asignar al menos un reviewer si hay colaboradores
4. Verificar que el titulo del PR sigue la convencion de commits

### Antes de merge a `main`

1. Todos los checks de CI deben pasar (lint, tests, build)
2. Sin conflictos sin resolver
3. PR aprobado (si hay reviewers)
4. Squash merge recomendado para mantener historial limpio

---

## Comandos utiles de referencia

```bash
# Crear rama correctamente
git checkout main && git pull origin main
git checkout -b feature/notes/notebook-creation

# Commit con verificacion
git add .
git status                    # revisar que no hay archivos inesperados
git commit -m "✨ feat(notes): add notebook creation with default assignment"

# Push primera vez
git push -u origin feature/notes/notebook-creation

# Actualizar rama con main antes del PR
git fetch origin
git rebase origin/main

# Ver historial limpio
git log --oneline --graph
```

---

## Restricciones

- **NUNCA** hacer `git push --force` a `main`
- **NUNCA** hacer `git commit --no-verify` para saltarse hooks
- **NUNCA** incluir en un commit: `.env`, credenciales, tokens, `firebase-adminsdk.json`
- **NUNCA** mezclar refactor + feat en el mismo commit
- **NO** usar `git add .` sin revisar `git status` primero

---

## Referencias en el proyecto

- `AGENTS.md` → tabla de routing (actualizar si cambia estructura de agentes)
- `NEGOCIO.md` → modelo de datos (actualizar si cambia schema Firestore)
- `skills/AppNotesBG-meta/sync-agents.md` → invocar cuando un skill cambia
- `.github/pull_request_template.md` → plantilla de PR para GitHub (crear si no existe)

---

## Historial de cambios

| Fecha | Cambio |
|---|---|
| 2026-02-10 | Creacion inicial |
