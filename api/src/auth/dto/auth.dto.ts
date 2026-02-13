import {
  IsString,
  IsOptional,
  IsUUID,
  IsBoolean,
  IsDateString,
} from 'class-validator';
import { Type } from 'class-transformer';

export class AuthMeResponseDto {
  id!: string;
  email!: string;
  display_name!: string;
  avatar_url!: string | null;
  is_new_user!: boolean;
}

export class RefreshTokenDto {
  @IsString()
  refresh_token!: string;
}

export class RevokeSessionDto {
  @IsOptional()
  @IsString()
  session_id?: string;
}

export class SessionInfoDto {
  session_id!: string;
  created_at!: Date;
  expires_at!: Date;
  device_info!: string;
  ip_address!: string;
  is_current!: boolean;
}

export class AuthRefreshResponseDto {
  access_token!: string;
  refresh_token!: string;
  expires_in!: number;
}

export class UpdateUserPreferencesDto {
  @IsOptional()
  @IsString()
  language?: 'es' | 'en' | 'pt';

  @IsOptional()
  @IsString()
  timezone?: string;

  @IsOptional()
  app_theme?: 'light' | 'dark';
}
