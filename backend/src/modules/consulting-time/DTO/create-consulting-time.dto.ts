import { IsArray, IsOptional, IsString, IsBoolean, Min, IsEnum, ValidateIf, IsInt, IsNumber } from 'class-validator';

export class CreateConsultingTimeDto {
  @IsString()
  startTime: string; // 
  @IsString()
  endTime: string;
  
  
  
  @ValidateIf(o => o.scheduling_type === 'STREAM')
  @IsNumber()
  slotDuration: number;
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