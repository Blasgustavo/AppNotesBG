import { IsString, IsEmail, IsOptional, IsUrl } from 'class-validator';

export class AuthMeResponseDto {
  id!: string;
  email!: string;
  display_name!: string;
  avatar_url!: string | null;
  is_new_user!: boolean;
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
