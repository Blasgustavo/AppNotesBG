import { IsString, IsOptional, IsArray, IsObject, IsNumber, IsBoolean, ValidateNested, IsEnum, IsEmail, Min, Max, Length, Matches } from 'class-validator';
import { TipTapDocument } from '../../../../shared/types/tiptap.types';

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
  user_id!: string;

  @IsEnum(['view', 'edit'])
  permission!: 'view' | 'edit';
}

export class CreateNoteDto {
  @IsString()
  @Length(1, 200, { message: 'Title must be between 1 and 200 characters' })
  @Matches(/^[^<>]*$/, { message: 'Title cannot contain HTML tags' })
  title!: string;

  @IsObject()
  @ValidateNested()
  content!: TipTapDocument;

  @IsString()
  @Matches(/^[a-zA-Z0-9_-]+$/, { message: 'Invalid notebook ID format' })
  notebook_id!: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
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
  @Matches(/^[a-fA-F0-9]{64}$/, { message: 'Content hash must be a valid SHA-256 hash' })
  content_hash?: string;

  @IsOptional()
  @IsString()
  @Matches(/^[a-fA-F0-9]{32}$/, { message: 'Checksum must be a valid MD5 hash' })
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
}

export class UpdateNoteDto extends CreateNoteDto {
  @IsOptional()
  @IsNumber()
  @Min(1)
  version!: number;
}