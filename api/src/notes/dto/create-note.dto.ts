import { IsString, IsOptional, IsArray, IsObject, ValidateNested, IsEnum } from 'class-validator';

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
  title!: string;

  @IsObject()
  @ValidateNested()
  content!: TipTapContentDto;

  @IsString()
  notebook_id!: string;

  @IsOptional()
  @IsArray()
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
  @IsEnum(['true'])
  is_pinned?: boolean;
}