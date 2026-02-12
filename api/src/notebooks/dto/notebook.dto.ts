import {
  IsString,
  IsOptional,
  IsBoolean,
  IsNumber,
  Length,
  Matches,
  Min,
  Max,
} from 'class-validator';

export class CreateNotebookDto {
  @IsString()
  @Length(1, 100, { message: 'El nombre debe tener entre 1 y 100 caracteres' })
  @Matches(/^[^<>]*$/, { message: 'El nombre no puede contener HTML' })
  name!: string;

  @IsOptional()
  @IsString()
  @Length(1, 50)
  icon?: string;

  @IsOptional()
  @IsString()
  @Matches(/^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/, {
    message: 'Color debe ser un valor hexadecimal válido (ej. #2196F3)',
  })
  color?: string;

  @IsOptional()
  @IsString()
  @Matches(/^[a-zA-Z0-9_-]+$/, { message: 'ID de libreta padre inválido' })
  parent_notebook_id?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(9999)
  sort_order?: number;
}

export class UpdateNotebookDto {
  @IsOptional()
  @IsString()
  @Length(1, 100)
  @Matches(/^[^<>]*$/, { message: 'El nombre no puede contener HTML' })
  name?: string;

  @IsOptional()
  @IsString()
  @Length(1, 50)
  icon?: string;

  @IsOptional()
  @IsString()
  @Matches(/^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/)
  color?: string;

  @IsOptional()
  @IsBoolean()
  is_favorite?: boolean;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(9999)
  sort_order?: number;
}

export class NotebookResponseDto {
  id!: string;
  user_id!: string;
  name!: string;
  icon!: string;
  color!: string;
  parent_notebook_id!: string | null;
  is_default!: boolean;
  is_favorite!: boolean;
  sort_order!: number;
  note_count!: number;
  created_at!: FirebaseFirestore.Timestamp;
  updated_at!: FirebaseFirestore.Timestamp;
}
