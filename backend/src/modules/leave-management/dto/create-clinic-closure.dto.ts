import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ClosureType } from '../entities/clinicClosure.entity';

export class CreateClinicClosureDto {
  @IsEnum(ClosureType)
  type: ClosureType;

  @IsNotEmpty()
  startDateTime: string; // ISO string

  @IsNotEmpty()
  endDateTime: string; // ISO string

  @IsOptional()
  @IsString()
  reason?: string;
}

