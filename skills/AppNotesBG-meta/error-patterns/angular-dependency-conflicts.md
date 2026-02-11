# Error Pattern: Angular Dependency Conflicts (peer deps)

## Identificador
`angular-dependency-conflicts`

## Cuando ocurre
Al instalar librerias de terceros que declaran `peerDependency` sobre una version
de Angular inferior a la del proyecto.

## Ejemplo concreto — `@angular/fire` vs Angular 21

```
npm error code ERESOLVE
npm error ERESOLVE unable to resolve dependency tree
npm error
npm error While resolving: AppNotesBG@0.0.0
npm error Found: @angular/core@21.x.x
npm error node_modules/@angular/core
npm error   @angular/core@"^21.0.0" from the root project
npm error
npm error Could not resolve dependency:
npm error peer @angular/core@"^20.0.0" from @angular/fire@20.x.x
npm error node_modules/@angular/fire
npm error   @angular/fire@"^20.0.0" from the root project
```

**Causa:** `@angular/fire` v20 declara `peerDependency` sobre `@angular/core@^20`.
El proyecto usa Angular 21, lo cual rompe la resolucion de dependencias de npm por defecto.

---

## Fix probado

```bash
npm install @angular/fire --legacy-peer-deps
```

`--legacy-peer-deps` instruye a npm a ignorar conflictos de peerDependencies y
resolver usando el algoritmo de npm v6 (no estricto).

---

## Alternativas

| Opcion | Comando | Cuando usar |
|---|---|---|
| `--legacy-peer-deps` | `npm install <pkg> --legacy-peer-deps` | Libreria compatible en runtime aunque no declare la version exacta |
| `--force` | `npm install <pkg> --force` | Solo si se verifico manualmente que no hay breaking changes |
| Bajar version de Angular | — | No recomendado para este proyecto |
| Esperar nueva version del paquete | — | Si el paquete tiene un PR/release pendiente de soporte |

---

## Como verificar compatibilidad antes de instalar

1. Revisar si el paquete tiene una rama/tag de soporte para la version de Angular actual:
   ```
   npm info @angular/fire peerDependencies
   ```
2. Buscar en el repositorio del paquete issues con el tag de la version de Angular usada.
3. Revisar CHANGELOG del paquete para breaking changes entre versiones.

---

## Paquetes conocidos con este patron en AppNotesBG

| Paquete | Version instalada | Angular soportado | Workaround |
|---|---|---|---|
| `@angular/fire` | v20.x | Angular 20 | `--legacy-peer-deps` |

---

## Coding standard relacionado

Ver `coding-standards/angular.md` para convenciones de uso de `@angular/fire`
una vez instalado.

---

## Historial

| Fecha | Contexto |
|---|---|
| 2026-02-11 | Documentado al instalar `@angular/fire` en proyecto Angular 21 durante setup inicial |
