# TypeScript Safety Issues — Backend NestJS

## Pattern: Unsafe assignments with `any` type

### Description
When working with Firestore responses and complex objects, TypeScript often infers `any` type leading to unsafe operations and potential runtime errors.

### Common Scenarios
1. **Firestore document access**: `snap.data()!['field']` returns `any`
2. **Firebase Admin SDK**: `@Inject(FIREBASE_ADMIN)` injects `any` 
3. **Request objects**: `req.user` can be typed as `any`
4. **External libraries**: Algolia, DOMPurify, jsdom return `any`

### Error Examples
```typescript
// ❌ Unsafe assignment
const data = snap.data()!;
if (data['user_id'] !== userId) // data is `any`

// ❌ Unsafe argument
this.tipTap.validateSchema(dto.content as any) 

// ❌ Unsafe injection
@Inject(FIREBASE_ADMIN) private readonly firebaseApp: any

// ❌ Unsafe return
return this.firestore.increment(1) // returns `any`
```

### Fix Strategy
```typescript
// ✅ Explicit typing with interfaces
interface NoteDocument {
  user_id: string;
  title: string;
  content: TipTapDocument;
}

const data = snap.data() as NoteDocument;
if (data.user_id !== userId) // Safe access

// ✅ Proper type injection
@Inject(FIREBASE_ADMIN) private readonly firebaseApp: admin.app.App

// ✅ Type-safe Firestore operations
import type { 
  AuthenticatedRequest, 
  TipTapDocument,
  CreateNoteDto 
} from '../types';

// ✅ Utility functions for type conversion
function toRecord<T>(obj: any): Record<string, T> {
  return obj as Record<string, T>;
}

const userData = toRecord<string>(userSnap.data());
```

### Prevention Checklist
- [ ] Always type Firestore responses with interfaces
- [ ] Use proper dependency injection typing
- [ ] Create utility types for complex operations
- [ ] Add explicit `as Type` assertions where necessary
- [ ] Use `Record<string, Type>` instead of `any` for objects
- [ ] Import types from external libraries (`@types/` packages)
- [ ] Enable strict TypeScript settings
- [ ] Use type guards for runtime type checking

### ESLint Rules
```json
{
  "@typescript-eslint/no-unsafe-assignment": "error",
  "@typescript-eslint/no-unsafe-member-access": "error", 
  "@typescript-eslint/no-unsafe-call": "error",
  "@typescript-eslint/no-unsafe-argument": "error",
  "@typescript-eslint/no-unsafe-return": "error",
  "@typescript-eslint/prefer-as-const": "error"
}
```

### Real-world Examples Fixed

#### Before (Unsafe)
```typescript
async findOne(noteId: string, userId: string) {
  const snap = await this.firestore.getDoc(NOTES_COL, noteId);
  const data = snap.data()!;
  if (data['user_id'] !== userId) {
    throw new ForbiddenException('Access denied');
  }
  return data;
}
```

#### After (Type-safe)
```typescript
interface NoteData {
  user_id: string;
  title: string;
  content: TipTapDocument;
  deleted_at: FirebaseFirestore.Timestamp | null;
}

async findOne(noteId: string, userId: string): Promise<NoteData> {
  const snap = await this.firestore.getDoc(NOTES_COL, noteId);
  const data = snap.data() as NoteData;
  if (data.user_id !== userId) {
    throw new ForbiddenException('Access denied');
  }
  return data;
}
```

### Benefits
- ✅ Compile-time error detection
- ✅ Better IDE autocomplete and intellisense
- ✅ Runtime type safety
- ✅ Easier refactoring
- ✅ Self-documenting code

### When to Use `any`
Only in these specific cases:
1. **Migration legacy code** temporarily
2. **External library types** not properly exported
3. **JSON parsing** with dynamic structure
4. **Mock data** in tests

Always add `// TODO: Add proper typing` comments.