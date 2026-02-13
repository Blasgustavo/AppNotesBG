import {
  IsString,
  IsOptional,
  IsArray,
  IsObject,
  IsNumber,
  IsBoolean,
  ValidateNested,
  IsEnum,
  Min,
  Max,
  Length,
  Matches,
  MaxLength,
  ArrayMaxSize,
} from 'class-validator';
import { Type } from 'class-transformer';
import { PartialType } from '@nestjs/swagger';
import type { TipTapDocument } from '../../../../shared/types/tiptap.types';

export class TipTapContentDto {
  @IsString()
  type!: string;

  @IsOptional()
  @IsArray()
  content?: any[];
}

export class NoteStyleDto {
  @IsString()
  background_color!: string;

  @IsString()
  text_color!: string;

  @IsOptional()
  @IsString()
  highlight_color?: string;
}

export class NoteFontDto {
  @IsString()
  family!: string;

  @IsNumber()
  size!: number;

  @IsString()
  weight!: string;

  @IsNumber()
  line_height!: number;
}

export class AttachmentDto {
  @IsString()
  id!: string;

  @IsString()
  url!: string;

  @IsString()
  type!: string;

  @IsString()
  name!: string;

  @IsNumber()
  size_bytes!: number;
}

export class CollaboratorDto {
  @IsString()
  @Matches(/^[a-zA-Z0-9_-]{20,}$/, {
    message: 'User ID must be a valid Firebase UID',
  })
  user_id!: string;

  @IsEnum(['view', 'edit', 'comment'])
  permission!: 'view' | 'edit' | 'comment';

  @IsOptional()
  added_at?: string;

  @IsOptional()
  @IsString()
  added_by?: string;
}

export class SharingDto {
  @IsOptional()
  @IsString()
  @Matches(/^[a-zA-Z0-9_-]{8,32}$/, {
    message: 'Public slug must be 8-32 alphanumeric characters',
  })
  public_slug?: string;

  @IsOptional()
  @IsString()
  public_access_expires?: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(50, { message: 'Maximum 50 collaborators allowed' })
  @ValidateNested({ each: true })
  @Type(() => CollaboratorDto)
  collaborators?: CollaboratorDto[];
}

export class LockingDto {
  @IsOptional()
  @IsString()
  locked_by?: string;

  @IsOptional()
  @IsString()
  locked_at?: string;

  @IsOptional()
  @IsString()
  lock_expires?: string;
}

export class CreateNoteDto {
  @IsString()
  @Length(1, 200, { message: 'Title must be between 1 and 200 characters' })
  @Matches(/^[^<>]*$/, { message: 'Title cannot contain HTML tags' })
  @MaxLength(200)
  title!: string;

  @IsObject()
  @ValidateNested()
  content!: TipTapDocument;

  @IsString()
  @Matches(/^[a-zA-Z0-9_-]+$/, { message: 'Invalid notebook ID format' })
  notebook_id!: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20, { message: 'Maximum 20 tags allowed' })
  @IsString({ each: true })
  @MaxLength(50, {
    each: true,
    message: 'Each tag must be 50 characters or less',
  })
  tags?: string[];

  @IsOptional()
  @IsArray()
  attachments?: AttachmentDto[];

  @IsOptional()
  @IsArray()
  collaborators?: CollaboratorDto[];

  @IsOptional()
  @ValidateNested()
  style?: NoteStyleDto;

  @IsOptional()
  @ValidateNested()
  font?: NoteFontDto;

  @IsOptional()
  @IsBoolean()
  is_pinned?: boolean;

  @IsOptional()
  @IsString()
  @Matches(/^[a-fA-F0-9]{64}$/, {
    message: 'Content hash must be a valid SHA-256 hash',
  })
  content_hash?: string;

  @IsOptional()
  @IsString()
  @Matches(/^[a-fA-F0-9]{32}$/, {
    message: 'Checksum must be a valid MD5 hash',
  })
  checksum?: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  version?: number;

  @IsOptional()
  @IsEnum(['synced', 'pending', 'conflict'])
  sync_status?: 'synced' | 'pending' | 'conflict';

  @IsOptional()
  @IsBoolean()
  is_template?: boolean;

  @IsOptional()
  @IsString()
  @Matches(/^[a-zA-Z0-9_-]+$/, { message: 'Invalid template ID format' })
  template_id?: string;

  @IsOptional()
  @IsString()
  reminder_at?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => SharingDto)
  sharing?: SharingDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => LockingDto)
  locking?: LockingDto;
}

/**
 * UpdateNoteDto — todos los campos son opcionales (PATCH semántico).
 * Usa PartialType de @nestjs/swagger para heredar validaciones y hacer todo opcional.
 * Agrega `version` para optimistic locking en actualizaciones concurrentes.
 */
export class UpdateNoteDto extends PartialType(CreateNoteDto) {
  @IsOptional()
  @IsNumber()
  @Min(1)
  declare version?: number;
}

/** Parámetros de query para GET /notes */
export class QueryNotesDto {
  @IsOptional()
  @IsString()
  @Matches(/^[a-zA-Z0-9_-]+$/, { message: 'Invalid notebook ID format' })
  notebook_id?: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @IsString({ each: true })
  tags?: string[];

  @IsOptional()
  @IsBoolean()
  is_pinned?: boolean;

  @IsOptional()
  @IsBoolean()
  archived?: boolean;

  @IsOptional()
  @IsBoolean()
  deleted?: boolean;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  @Type(() => Number)
  limit?: number;

  @IsOptional()
  @IsString()
  cursor?: string; // ID del último documento para paginación startAfter
}

/** Body para restaurar una versión del historial */
export class RestoreVersionDto {
  @IsNumber()
  @Min(1)
  version!: number;
}
