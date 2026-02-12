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

export class CreateAttachmentDto {
  @IsString()
  note_id!: string;

  @IsString()
  @Length(1, 255, { message: 'Name must be between 1 and 255 characters' })
  name!: string;

  @IsString()
  original_name!: string;

  @IsEnum(['image', 'document', 'audio', 'video', 'other'])
  type!: 'image' | 'document' | 'audio' | 'video' | 'other';

  @IsString()
  @Matches(/^[a-zA-Z0-9/-]+$/, { message: 'Invalid MIME type format' })
  mime_type!: string;

  @IsNumber()
  @Min(1)
  @Max(10 * 1024 * 1024, { message: 'File size cannot exceed 10MB' })
  size_bytes!: number;

  @IsString()
  @Matches(/^[a-fA-F0-9]{64}$/, {
    message: 'File hash must be a valid SHA-256 hash',
  })
  file_hash!: string;

  @IsOptional()
  @IsString()
  @Matches(/^[a-fA-F0-9]{64}$/, {
    message: 'Original file hash must be a valid SHA-256 hash',
  })
  is_duplicate_of?: string;

  @IsOptional()
  @IsString()
  @Length(1, 500, { message: 'Alt text must be between 1 and 500 characters' })
  alt_text?: string;

  @IsOptional()
  @IsObject()
  extracted_metadata?: {
    exif?: Record<string, any>;
    pdf_info?: Record<string, any>;
    duration_seconds?: number;
    dimensions?: { width: number; height: number };
  };

  @IsOptional()
  @IsObject()
  access_control?: {
    public_access: boolean;
    allowed_users?: string[];
    download_permissions: 'all' | 'owner' | 'collaborators';
  };
}

export class UpdateAttachmentDto {
  @IsOptional()
  @IsString()
  @Length(1, 255, { message: 'Name must be between 1 and 255 characters' })
  name?: string;

  @IsOptional()
  @IsString()
  @Length(1, 500, { message: 'Alt text must be between 1 and 500 characters' })
  alt_text?: string;

  @IsOptional()
  @IsEnum(['pending', 'clean', 'infected', 'quarantine'])
  virus_scan_status?: 'pending' | 'clean' | 'infected' | 'quarantine';

  @IsOptional()
  @IsObject()
  access_control?: {
    public_access: boolean;
    allowed_users?: string[];
    download_permissions: 'all' | 'owner' | 'collaborators';
  };

  @IsOptional()
  @IsObject()
  optimization?: {
    is_optimized: boolean;
    webp_available: boolean;
    cdn_cached: boolean;
    cache_expires: Date;
  };
}
