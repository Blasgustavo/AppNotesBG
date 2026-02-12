# Unused Imports — TypeScript Clean Code

## Pattern: Import statements not used in the file

### Description
ESLint detects when imports are declared but never referenced in the code, leading to larger bundles and confusing dependencies.

### Common Causes
1. **DTO refactoring**: Removing validation decorators but keeping imports
2. **Feature removal**: Commenting out code but not cleaning imports
3. **Copy-paste errors**: Importing utilities that aren't needed
4. **Type imports**: Importing types that aren't referenced

### Error Examples
```typescript
// ❌ Import not used
import { IsEmail, IsUrl, IsString } from 'class-validator';

// Only IsString is used
export class AuthDto {
  @IsString()
  email!: string;
}
```

```typescript
// ❌ Multiple unused imports
import {
  IsString,
  IsEnum,
  IsOptional,
  IsObject,
  IsNumber,
  IsEmail,    // ❌ Not used
  IsBoolean,  // ❌ Not used
  Min,
  Max,
  Length,
  Matches,
} from 'class-validator';
```

### Fix Strategy

#### 1. Remove Unused Imports
```typescript
// ✅ Keep only what's used
import {
  IsString,
  IsEnum,
  IsOptional,
  IsObject,
  IsNumber,
  Min,
  Max,
  Length,
  Matches,
} from 'class-validator';
```

#### 2. Use Type-Only Imports (when appropriate)
```typescript
// ✅ Type-only import
import type { CreateNoteDto } from './dto/create-note.dto';
```

#### 3. Group Related Imports
```typescript
// ✅ Organized imports
import {
  IsString,
  IsOptional,
  Min,
  Max,
} from 'class-validator';

import {
  Controller,
  Get,
  Post,
} from '@nestjs/common';

import { NotesService } from './notes.service';
```

### Prevention Checklist
- [ ] Run ESLint before committing: `npm run lint`
- [ ] Use IDE auto-import features
- [ ] Review imports after refactoring
- [ ] Check for duplicate imports
- [ ] Group imports by library type (NestJS, class-validator, etc.)
- [ ] Use barrel exports when available

### ESLint Configuration
```json
{
  "@typescript-eslint/no-unused-vars": [
    "error",
    {
      "args": "after-used",
      "ignoreRestSiblings": true,
      "varsIgnorePattern": "^_",
      "argsIgnorePattern": "^_"
    }
  ]
}
```

### Scripts to Detect Issues
```bash
# Check for unused imports
npm run lint

# Find duplicate imports
grep -r "import.*from.*class-validator" src/ | sort | uniq -c | sort -nr

# Find potentially unused imports
grep -r "import.*IsBoolean" src/ --include="*.ts" | wc -l
grep -r "IsBoolean" src/ --include="*.ts" | wc -l
```

### Real-world Examples Fixed

#### Before (Unused imports)
```typescript
import {
  IsString,
  IsEmail,      // ❌ Not used
  IsBoolean,   // ❌ Not used  
  IsOptional,
} from 'class-validator';

export class CreateAttachmentDto {
  @IsString()
  name!: string;
  
  @IsOptional()
  @IsString()
  alt_text?: string;
}
```

#### After (Clean imports)
```typescript
import {
  IsString,
  IsOptional,
} from 'class-validator';

export class CreateAttachmentDto {
  @IsString()
  name!: string;
  
  @IsOptional()
  @IsString()
  alt_text?: string;
}
```

### Benefits
- ✅ Smaller bundle sizes
- ✅ Faster compilation
- ✅ Cleaner dependency tree
- ✅ Easier code navigation
- ✅ Reduced confusion about what's actually used

### Automation
```bash
# Add to package.json scripts
{
  "scripts": {
    "lint:unused": "eslint '{src,apps,libs,test}/**/*.ts' --rule '@typescript-eslint/no-unused-vars:error'",
    "lint:fix": "eslint '{src,apps,libs,test}/**/*.ts' --fix"
  }
}
```

### IDE Extensions
- **VS Code**: ESLint extension with auto-fix
- **WebStorm**: Built-in unused import highlighting
- **Auto Import**: TS/JS auto-import extension