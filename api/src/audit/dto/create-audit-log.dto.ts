import {
  IsString,
  IsEnum,
  IsOptional,
  IsObject,
  IsNumber,
  Min,
  Matches,
  Length,
} from 'class-validator';

export class CreateAuditLogDto {
  @IsString()
  user_id!: string;

  @IsEnum([
    'create',
    'update',
    'delete',
    'read',
    'share',
    'download',
    'login',
    'logout',
  ])
  action!:
    | 'create'
    | 'update'
    | 'delete'
    | 'read'
    | 'share'
    | 'download'
    | 'login'
    | 'logout';

  @IsEnum(['note', 'notebook', 'attachment', 'user', 'theme', 'invitation'])
  resource_type!:
    | 'note'
    | 'notebook'
    | 'attachment'
    | 'user'
    | 'theme'
    | 'invitation';

  @IsString()
  resource_id!: string;

  @IsString()
  @Matches(/^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/, {
    message: 'Invalid IP address format',
  })
  ip_address!: string;

  @IsString()
  @Length(10, 500, {
    message: 'User agent must be between 10 and 500 characters',
  })
  user_agent!: string;

  @IsOptional()
  @IsString()
  @Matches(/^[a-zA-Z0-9_-]+$/, { message: 'Invalid session ID format' })
  session_id?: string;

  @IsOptional()
  @IsObject()
  changes?: {
    before?: Record<string, any>;
    after?: Record<string, any>;
  };

  @IsOptional()
  @IsObject()
  security_context?: {
    success: boolean;
    error_code?: string;
    rate_limited: boolean;
    suspicious_activity: boolean;
  };
}

export class QueryAuditLogsDto {
  @IsOptional()
  @IsString()
  user_id?: string;

  @IsOptional()
  @IsEnum([
    'create',
    'update',
    'delete',
    'read',
    'share',
    'download',
    'login',
    'logout',
  ])
  action?:
    | 'create'
    | 'update'
    | 'delete'
    | 'read'
    | 'share'
    | 'download'
    | 'login'
    | 'logout';

  @IsOptional()
  @IsEnum(['note', 'notebook', 'attachment', 'user', 'theme', 'invitation'])
  resource_type?:
    | 'note'
    | 'notebook'
    | 'attachment'
    | 'user'
    | 'theme'
    | 'invitation';

  @IsOptional()
  @IsString()
  resource_id?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  limit?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  offset?: number;
}
