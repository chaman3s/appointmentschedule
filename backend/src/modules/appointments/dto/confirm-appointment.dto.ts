import { IsNotEmpty } from 'class-validator';

export class ConfirmAppointmentDto {
  @IsNotEmpty()
  appointment_id: number;
  
}
