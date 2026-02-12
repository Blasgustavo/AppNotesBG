import {
  IsString,
  IsEnum,
  IsOptional,
  IsNumber,
  IsEmail,
  IsBoolean,
  Min,
  Max,
  Length,
  Matches,
} from 'class-validator';

export class CreateInvitationDto {
  @IsString()
  note_id!: string;

  @IsEmail()
  invited_email!: string;

  @IsEnum(['view', 'edit', 'comment'])
  permission!: 'view' | 'edit' | 'comment';

  @IsOptional()
  @IsString()
  @Length(0, 1000, { message: 'Message must be at most 1000 characters' })
  message?: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(365, { message: 'Expiration cannot exceed 365 days' })
  expires_in_days?: number = 7;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100, { message: 'Max uses cannot exceed 100' })
  max_uses?: number = 1;

  @IsOptional()
  @IsBoolean()
  group_invite?: boolean = false;
}

export class UpdateInvitationDto {
  @IsOptional()
  @IsEnum(['pending', 'accepted', 'rejected', 'revoked', 'expired'])
  status?: 'pending' | 'accepted' | 'rejected' | 'revoked' | 'expired';

  @IsOptional()
  @IsString()
  @Matches(/^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/, {
    message: 'Invalid IP address format',
  })
  accepted_ip?: string;

  @IsOptional()
  @IsString()
  @Length(10, 500, {
    message: 'User agent must be between 10 and 500 characters',
  })
  accepted_user_agent?: string;
}

export class AcceptInvitationDto {
  @IsString()
  @Length(32, 128, { message: 'Invalid invitation token format' })
  invitation_token!: string;

  @IsOptional()
  @IsString()
  @Matches(/^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/, {
    message: 'Invalid IP address format',
  })
  ip_address?: string;

  @IsOptional()
  @IsString()
  @Length(10, 500, {
    message: 'User agent must be between 10 and 500 characters',
  })
  user_agent?: string;
}
