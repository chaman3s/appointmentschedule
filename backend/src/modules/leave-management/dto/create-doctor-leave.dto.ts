import { IsBoolean, IsNotEmpty, IsOptional, IsString, Matches } from 'class-validator';

export class CreateDoctorLeaveDto {
  @IsNotEmpty()
  @Matches(/^\\d{4}-\\d{2}-\\d{2}$/, { message: 'startDate must be YYYY-MM-DD' })
  startDate: string;

  @IsNotEmpty()
  @Matches(/^\\d{4}-\\d{2}-\\d{2}$/, { message: 'endDate must be YYYY-MM-DD' })
  endDate: string;

  @IsBoolean()
  isFullDay: boolean;

  @IsOptional()
  @IsString()
  @Matches(/^([01]\\d|2[0-3]):([0-5]\\d)$/, { message: 'startTime must be HH:mm' })
  startTime?: string;

  @IsOptional()
  @IsString()
  @Matches(/^([01]\\d|2[0-3]):([0-5]\\d)$/, { message: 'endTime must be HH:mm' })
  endTime?: string;

  @IsOptional()
  @IsString()
  reason?: string;
}

