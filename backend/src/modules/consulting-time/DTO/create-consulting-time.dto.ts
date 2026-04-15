import { IsArray, IsOptional, IsString, IsBoolean } from 'class-validator';

export class CreateConsultingTimeDto {
  @IsString()
  startTime: string; // "02:00"

  @IsString()
  endTime: string; // "05:00"

  @IsArray()
  days: string[];
  @IsOptional()
  @IsBoolean()
  repeat?: boolean;
  @IsEnum(['STREAM', 'WAVE'])
  scheduling_type: 'STREAM' | 'WAVE';
  @ValidateIf(o => o.scheduling_type === 'WAVE')
  @IsInt()
  @Min(1)
  wave_capacity?: number;

}