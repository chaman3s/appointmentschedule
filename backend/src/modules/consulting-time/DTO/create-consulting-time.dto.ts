import { IsArray, IsString } from 'class-validator';

export class CreateConsultingTimeDto {
  @IsString()
  startTime: string; // "02:00"

  @IsString()
  endTime: string; // "05:00"

  @IsArray()
  days: string[]; // ["MONDAY", "TUESDAY"]
}