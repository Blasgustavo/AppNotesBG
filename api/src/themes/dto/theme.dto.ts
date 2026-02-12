import {
  IsString,
  IsOptional,
  IsObject,
  IsArray,
  IsEnum,
  IsBoolean,
  IsNumber,
  Min,
  Max,
  Length,
  Matches,
} from 'class-validator';

export class CreateThemeDto {
  @IsString()
  @Length(1, 50, { message: 'Name must be between 1 and 50 characters' })
  name!: string;

  @IsOptional()
  @IsString()
  @Length(0, 200, { message: 'Description must be at most 200 characters' })
  description?: string;

  @IsObject()
  colors!: {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
    surface: string;
    text_primary: string;
    text_secondary: string;
    text_accent: string;
    text_on_surface: string;
    border: string;
    shadow: string;
    error: string;
    warning: string;
    success: string;
    info: string;
  };

  @IsObject()
  fonts!: {
    primary: {
      family: string;
      size: number;
      weight: string;
      line_height: number;
    };
    secondary: {
      family: string;
      size: number;
      weight: string;
      line_height: number;
    };
    monospace: {
      family: string;
      size: number;
      weight: string;
      line_height: number;
    };
    ui: {
      family: string;
      size: number;
      weight: string;
      line_height: number;
    };
  };

  @IsObject()
  spacing!: {
    xs: string;
    sm: string;
    md: string;
    lg: string;
    xl: string;
  };

  @IsObject()
  borders!: {
    radius: string;
    width: string;
  };

  @IsObject()
  shadows!: {
    sm: string;
    md: string;
    lg: string;
  };

  @IsOptional()
  @IsBoolean()
  is_public?: boolean = false;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @IsOptional()
  @IsString()
  @Matches(/^[a-zA-Z0-9_-]+$/, { message: 'Invalid category format' })
  category?: string;

  @IsOptional()
  @IsString()
  @Matches(/^(?:dark|light|auto)$/, { message: 'Invalid display mode' })
  display_mode?: 'dark' | 'light' | 'auto';

  @IsOptional()
  @IsString()
  @Length(0, 20, { message: 'Preview image URL must be at most 20 characters' })
  preview_image_url?: string;

  @IsOptional()
  @IsObject()
  custom_properties?: Record<string, any>;
}

export class UpdateThemeDto {
  @IsOptional()
  @IsString()
  @Length(1, 50, { message: 'Name must be between 1 and 50 characters' })
  name?: string;

  @IsOptional()
  @IsString()
  @Length(0, 200, { message: 'Description must be at most 200 characters' })
  description?: string;

  @IsOptional()
  @IsObject()
  colors?: CreateThemeDto['colors'];

  @IsOptional()
  @IsObject()
  fonts?: CreateThemeDto['fonts'];

  @IsOptional()
  @IsObject()
  spacing?: CreateThemeDto['spacing'];

  @IsOptional()
  @IsObject()
  borders?: CreateThemeDto['borders'];

  @IsOptional()
  @IsObject()
  shadows?: CreateThemeDto['shadows'];

  @IsOptional()
  @IsBoolean()
  is_public?: boolean;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsEnum(['dark', 'light', 'auto'])
  display_mode?: 'dark' | 'light' | 'auto';

  @IsOptional()
  @IsString()
  preview_image_url?: string;

  @IsOptional()
  @IsObject()
  custom_properties?: Record<string, any>;
}

export class QueryThemesDto {
  @IsOptional()
  @IsString()
  @Matches(/^(?:dark|light|auto|all)$/, {
    message: 'Invalid display mode filter',
  })
  display_mode?: 'dark' | 'light' | 'auto' | 'all';

  @IsOptional()
  @IsString()
  @Matches(/^[a-zA-Z0-9_-]+$/, { message: 'Invalid category format' })
  category?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @IsOptional()
  @IsBoolean()
  is_public?: boolean;

  @IsOptional()
  @IsBoolean()
  is_default?: boolean;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number;

  @IsOptional()
  @IsString()
  @Matches(/^[a-zA-Z0-9_-]+$/, { message: 'Invalid cursor format' })
  cursor?: string;
}

export class ApplyThemeDto {
  @IsString()
  @Length(1, 50, { message: 'Theme ID must be between 1 and 50 characters' })
  theme_id!: string;

  @IsOptional()
  @IsString()
  @Length(0, 200, { message: 'Note ID must be at most 200 characters' })
  note_id?: string;

  @IsOptional()
  @IsString()
  @Length(0, 200, { message: 'Notebook ID must be at most 200 characters' })
  notebook_id?: string;

  @IsOptional()
  @IsEnum(['note', 'notebook', 'global'])
  scope?: 'note' | 'notebook' | 'global';
}

export class ThemePreviewDto {
  @IsString()
  @Length(1, 50, { message: 'Theme ID must be between 1 and 50 characters' })
  theme_id!: string;

  @IsOptional()
  @IsString()
  @Length(0, 200, { message: 'Note ID must be at most 200 characters' })
  note_id?: string;

  @IsOptional()
  @IsString()
  @Length(0, 50, { message: 'CSS format must be specified' })
  format?: 'css' | 'json';
}

export class CloneThemeDto {
  @IsString()
  @Length(1, 50, { message: 'Theme ID must be between 1 and 50 characters' })
  source_theme_id!: string;

  @IsOptional()
  @IsString()
  @Length(1, 50, { message: 'Name must be between 1 and 50 characters' })
  name?: string;

  @IsOptional()
  @IsString()
  @Length(0, 200, { message: 'Description must be at most 200 characters' })
  description?: string;
}

export class ThemeExportDto {
  @IsString()
  @Matches(/^(?:json|css)$/, { message: 'Export format must be json or css' })
  format!: 'json' | 'css';

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  theme_ids?: string[];

  @IsOptional()
  @IsString()
  @Matches(/^[a-zA-Z0-9_-]+$/, { message: 'Invalid category format' })
  category?: string;
}

export class ThemeImportDto {
  @IsString()
  @Matches(/^(?:json|css)$/, { message: 'Import format must be json or css' })
  format!: 'json' | 'css';

  @IsString()
  @Length(1, 1000000, { message: 'Theme content is required' })
  content!: string;

  @IsOptional()
  @IsString()
  @Length(0, 50, { message: 'Theme name must be at most 50 characters' })
  name?: string;

  @IsOptional()
  @IsBoolean()
  overwrite_existing?: boolean = false;
}

export class ThemeShareDto {
  @IsString()
  @Length(1, 50, { message: 'Theme ID must be between 1 and 50 characters' })
  theme_id!: string;

  @IsOptional()
  @IsString()
  @Length(0, 200, { message: 'Recipient must be at most 200 characters' })
  recipient_email?: string;

  @IsOptional()
  @IsString()
  @Length(0, 1000, { message: 'Message must be at most 1000 characters' })
  message?: string;

  @IsOptional()
  @IsEnum(['read', 'edit'])
  permission?: 'read' | 'edit';

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(365)
  expires_in_days?: number = 7;

  @IsOptional()
  @IsBoolean()
  allow_modification?: boolean = false;
}

export class ThemeDataPropertyDto {
  @IsString()
  @Length(1, 50, {
    message: 'Property name must be between 1 and 50 characters',
  })
  name!: string;

  @IsString()
  @Length(0, 200, { message: 'Value must be at most 200 characters' })
  value!: string;

  @IsOptional()
  @IsString()
  @Length(0, 100, { message: 'Type must be at most 100 characters' })
  type?: 'color' | 'spacing' | 'font' | 'shadow' | 'border' | 'custom';
}
