import { IsEnum, IsNotEmpty, IsOptional, IsString, Matches, ValidateIf } from 'class-validator';
import { ClosureType } from '../entities/clinicClosure.entity';

export class CreateClinicClosureDto {
  @IsEnum(ClosureType)
  type: ClosureType;

  @IsNotEmpty()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'startDate must be in YYYY-MM-DD format' })
  startDate: string;

  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'endDate must be in YYYY-MM-DD format' })
  endDate?: string;

  @IsOptional()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/, { message: 'startTime must be in HH:mm format' })
  startTime?: string;

  @ValidateIf((o) => o.startTime !== undefined)
  @IsNotEmpty()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/, { message: 'endTime must be in HH:mm format' })
  endTime?: string;

  @IsOptional()
  @IsString()
  reason?: string;
}
