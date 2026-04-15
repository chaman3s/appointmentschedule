import { IsString, Matches } from 'class-validator';

export class CreateCustomAvailabilityDto {
  @IsString()
  date: string; // YYYY-MM-DD

  @IsString()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/)
  startTime: string;

  @IsString()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/)
  endTime: string;
}