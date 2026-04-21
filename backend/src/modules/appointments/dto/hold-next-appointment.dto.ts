import {
  IsBoolean,
  IsDateString,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';

export class HoldNextAppointmentDto {
  @IsNotEmpty()
  doctor_id: number;

  @IsOptional()
  @IsDateString()
  appointment_date?: string;

  @IsString()
  consulting_type: string;

  @IsOptional()
  patient_id?: number;

  @IsOptional()
  @IsBoolean()
  is_family?: boolean;

  @IsOptional()
  @IsBoolean()
  payment_status?: boolean;

  @IsOptional()
  @IsString()
  visit_type?: string;

  @IsOptional()
  @IsString()
  complaint?: string;

  @IsOptional()
  @IsString()
  source?: string;

  @IsOptional()
  @IsString()
  ivr_reference_id?: string;

  @IsOptional()
  @IsString()
  ivr_status?: string;
}
