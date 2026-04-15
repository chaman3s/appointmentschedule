// src/modules/appointments/dto/create-appointment.dto.ts

import {
  IsNotEmpty,
  IsOptional,
  IsString,
  IsBoolean,
  IsDateString,
  Matches,
} from 'class-validator';

export class CreateAppointmentDto {
  // ---------------- REQUIRED ----------------

  @IsNotEmpty()
  doctor_id: number;

  @IsNotEmpty()
  user_id: number;

  @IsDateString()
  appointment_date: string;

  // HH:mm format
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/, {
    message: 'start_time must be in HH:mm format',
  })
  start_time: string;

  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/, {
    message: 'end_time must be in HH:mm format',
  })
  end_time: string;

  @IsString()
  consulting_type: string;

  // ---------------- OPTIONAL ----------------

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
  status?: string;

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