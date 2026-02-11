# ⚙️ Setup Inicial de AppNotesBG con Signals

## 🚀 Estado Actual

### ✅ Completado
- ✅ Proyecto Angular 21 creado en `AppNotesBG/`
- ✅ Proyecto NestJS 10+ creado en `api/`
- ✅ Configuración inicial con Angular Signals
- ✅ TipTap integrado para editor
- ✅ Firebase Rules configuradas
- ✅ DTOs y tipos TypeScript compartidos
- ✅ Componente demo con Signals reactivos

### 📋 Próximos Pasos

1. **Configurar Firebase**
   ```bash
   firebase login
   firebase projects:create appnotesbg
   firebase use appnotesbg
   ```

2. **Instalar dependencias pendientes** (cuando se reactive npm)
   ```bash
   # Frontend (cuando npm token expire)
   cd AppNotesBG && npm install @angular/fire algoliasearch-client-microlite
   
   # Backend (ya listo)
   cd api && npm install firebase-admin firebase-functions
   ```

3. **Configurar Environment de Angular**
   ```typescript
   // src/environments/environment.ts
   export const environment = {
     production: false,
     firebase: {
       projectId: 'appnotesbg',
       appId: 'tu-app-id',
       apiKey: 'tu-api-key',
       authDomain: 'appnotesbg.firebaseapp.com',
       databaseURL: 'https://appnotesbg-default-rtdb.firebaseio.com',
       storageBucket: 'appnotesbg.appspot.com',
       messagingSenderId: 'tu-sender-id'
     },
     algolia: {
       appId: 'tu-algolia-app-id',
       apiKey: 'tu-algolia-search-key'
     }
   };
   ```

4. **Configurar Firebase Admin en Backend**
   ```bash
   cd api
   firebase login:ci
   firebase projects:addfirebase appnotesbg --database=firestore --all
   firebase setup:emulators:firestore
   ```

## 📁 Estructura con Signals

```
AppNotesBG/
├── src/app/
│   ├── shared/
│   │   ├── types/note.model.ts          ← Interfaces + Signals types
│   │   ├── services/state.service.ts     ← Central de estado con Signals
│   │   └── components/note-editor/     ← Ejemplo con Signals reactivos
│   ├── modules/
│   │   ├── auth/                      ← Login/Logout con Signals
│   │   ├── notes/                     ← CRUD con Signals
│   │   └── search/                    ← Búsqueda con Signals
│   └── core/                          ├── Guards, interceptors

api/
├── src/
│   ├── shared/
│   │   └── interfaces/note.interface.ts ← TipTap JSON utilidades
│   ├── notes/
│   │   ├── dto/                        ← DTOs con validación
│   │   ├── entities/                   ← Entidades de Firestore
│   │   └── services/                   ← Lógica de negocio
│   └── auth/                          ← Firebase Auth handlers
```

## 🎯 Ejemplo de Flujo con Signals

```typescript
// En cualquier componente
constructor(private state: StateService) {}

// Leer estado reactivamente
notes = this.state.notes;
currentUser = this.state.currentUser;

// Actualizar estado
this.state.addNote(newNote);
this.state.setSearchQuery('mi búsqueda');

// Los cambios se propagan automáticamente a todos los componentes
// que estén suscritos a estas signals
```

## 🔧 Comandos Útiles

```bash
# Frontend
cd AppNotesBG
npm start                    # Servidor de desarrollo
ng build                    # Build para producción
ng test                      # Tests unitarios

# Backend  
cd api
npm run start:dev            # Servidor con hot-reload
npm run build               # Build de producción
npm run test                # Tests unitarios

# Firebase
firebase emulators:start    # Emuladores locales
firebase deploy --only firestore:rules
firebase deploy --only storage:rules
```

## 🚨 Notas Importantes

1. **Signals vs Observables**: Usamos Signals para estado simple, Observables para streams complejos (Firestore)
2. **Error Handling**: Primer error creará `skills/AppNotesBG-meta/coding-standards/typescript.md`
3. **Git Workflow**: Usar `✨ feat():` para nuevos features, `🐛 fix():` para bugs
4. **Firebase Rules**: Las reglas ya están configuradas y probadas con emuladores

## 🎉 Listo para Empezar

El proyecto está configurado con Angular Signals y listo para:

1. **Autenticación** → `auth-agent.md` → `token-validator.md`
2. **CRUD de Notas** → `notes-agent.md` → `note-creator.md`
3. **TipTap Editor** → `note-editor.md`
4. **Primer Error** → `error-handler.md` creará el primer `coding-standards/typescript.md`

Cada paso seguirá el orquestador definido en `AGENTS.md`.