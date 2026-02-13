import {
  IsString,
  IsOptional,
  IsEnum,
  IsBoolean,
  IsNumber,
  IsArray,
  IsObject,
  Min,
  Max,
  Length,
  Matches,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateReminderDto {
  @IsString()
  @Length(1, 500, { message: 'Message must be between 1 and 500 characters' })
  message!: string;

  @IsString()
  @Length(1, 50, { message: 'Note ID must be between 1 and 50 characters' })
  note_id!: string;

  @IsOptional()
  @IsEnum(['once', 'daily', 'weekly', 'monthly', 'custom'])
  repeat_type?: 'once' | 'daily' | 'weekly' | 'monthly' | 'custom';

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(1000)
  repeat_interval_days?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  repeat_count?: number;

  @IsOptional()
  @IsString()
  @Length(0, 100, { message: 'Method must be at most 100 characters' })
  method?: string;

  @IsOptional()
  @IsString()
  @Matches(
    /^(?:\d{4})-(?:\d{2})-(?:\d{2})T(?:\d{2}:\d{2}:?\d{2})(?:[+-]\d{2}:?\d{2})$/,
    {
      message: 'Invalid time format. Expected HH:mm or HH:mm:ss',
    },
  )
  reminder_at!: string;
}

export class UpdateReminderDto {
  @IsOptional()
  @IsString()
  @Length(1, 500, { message: 'Message must be between 1 and 500 characters' })
  message?: string;

  @IsOptional()
  @IsEnum(['once', 'daily', 'weekly', 'monthly', 'custom'])
  repeat_type?: 'once' | 'daily' | 'weekly' | 'monthly' | 'custom';

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(1000)
  repeat_interval_days?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  repeat_count?: number;

  @IsOptional()
  @IsString()
  @Length(0, 100, { message: 'Method must be at most 100 characters' })
  method?: string;

  @IsOptional()
  @IsString()
  @Matches(
    /^(?:\d{4})-(?:\d{2})-(?:\d{2})T(?:\d{2}:\d{2}:?\d{2})(?:[+-]\d{2}:?\d{2})?$/,
    {
      message: 'Invalid time format. Expected ISO 8601 datetime',
    },
  )
  reminder_at?: string;
}

export class QueryRemindersDto {
  @IsOptional()
  @IsEnum(['pending', 'sent', 'expired'])
  status?: 'pending' | 'sent' | 'expired';

  @IsOptional()
  @IsString()
  @Length(1, 50, { message: 'Note ID must be between 1 and 50 characters' })
  note_id?: string;

  @IsOptional()
  @IsBoolean()
  include_completed?: boolean;

  @IsOptional()
  @IsBoolean()
  only_expired?: boolean;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number;

  @IsOptional()
  @IsString()
  @Length(0, 20, { message: 'Cursor must be at most 20 characters' })
  cursor?: string;

  @IsOptional()
  @IsString()
  @Matches(/^(?:past|upcoming|today|custom)$/, {
    message: 'Invalid time filter',
  })
  time_filter?: 'past' | 'upcoming' | 'today' | 'custom';

  @IsOptional()
  @IsEnum(['reminder_at', 'created_at', 'message', 'updated_at'])
  sort_order?: 'reminder_at' | 'created_at' | 'message' | 'updated_at';

  @IsOptional()
  @IsEnum(['asc', 'desc'])
  sort_direction?: 'asc' | 'desc';
}

export class MarkAsSentDto {
  @IsString()
  @Length(1, 50, { message: 'Reminder ID must be between 1 and 50 characters' })
  reminder_id!: string;

  @IsOptional()
  @IsString()
  @Length(0, 500, { message: 'Custom message (optional)' })
  custom_message?: string;
}

export class BatchActionDto {
  @IsEnum(['mark_sent', 'delete', 'update', 'mark_complete', 'reactivate'])
  type!: 'mark_sent' | 'delete' | 'update' | 'mark_complete' | 'reactivate';

  @IsString()
  reminder_id!: string;

  @IsOptional()
  @IsObject()
  data?: Record<string, any>;
}

export class BatchRemindersDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BatchActionDto)
  actions!: BatchActionDto[];
}

export class NotificationPreferencesDto {
  @IsOptional()
  @IsBoolean()
  email_notifications?: boolean = true;

  @IsOptional()
  @IsBoolean()
  push_notifications?: boolean = true;

  @IsOptional()
  @IsBoolean()
  sms_notifications?: boolean = false;

  @IsOptional()
  @IsString()
  @Length(10, 100, {
    message: 'Sound identifier must be between 10 and 100 characters',
  })
  notification_sound?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(60)
  notification_advance_minutes?: number = 30;
}
