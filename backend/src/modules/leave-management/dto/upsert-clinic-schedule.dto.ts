import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class ClinicScheduleItemDto {
  @IsInt()
  @Min(0)
  @Max(6)
  dayOfWeek: number; // 0=Sunday .. 6=Saturday

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

