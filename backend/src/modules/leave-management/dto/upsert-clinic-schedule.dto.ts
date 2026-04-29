import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  ValidateNested,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { normalizeDay } from '../../../utils';

export class ClinicScheduleItemDto {
  @Transform(({ value }) => {
    if (
      typeof value === 'number' ||
      (typeof value === 'string' && /^\d+$/.test(value))
    ) {
      const n = Number(value);
      const codes = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
      try {
        return normalizeDay(codes[n] ?? '');
      } catch {
        return value;
      }
    }
    if (typeof value === 'string') {
      try {
        return normalizeDay(value);
      } catch {
        return value;
      }
    }
    return value;
  })
  @IsString()
  @Matches(/^(SUNDAY|MONDAY|TUESDAY|WEDNESDAY|THURSDAY|FRIDAY|SATURDAY)$/, {
    message:
      'dayOfWeek must be a valid day like "mon", "monday", or "MONDAY"',
  })
  dayOfWeek: string;

  @IsBoolean()
  isOpen: boolean;

  @IsOptional()
  @IsString()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/, { message: 'openTime must be in HH:mm format' })
  openTime?: string;

  @IsOptional()
  @IsString()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/, { message: 'closeTime must be in HH:mm format' })
  closeTime?: string;
}

export class UpsertClinicScheduleDto {
  @IsNotEmpty()
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(7)
  @ValidateNested({ each: true })
  @Type(() => ClinicScheduleItemDto)
  schedules: ClinicScheduleItemDto[];
}
