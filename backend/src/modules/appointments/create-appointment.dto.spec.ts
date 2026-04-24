import { validate } from 'class-validator';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { SchedulingType } from '../common/enums/appointment.enum';

describe('CreateAppointmentDto Validation', () => {
 const validDto = (): CreateAppointmentDto => {
   const dto = new CreateAppointmentDto();
   dto.doctor_id = 1;
   dto.appointment_date = '2026-04-25';
   dto.start_time = '10:00';
   dto.end_time = '10:30';
   dto.consulting_type = 'OPD';
   dto.scheduling_type = SchedulingType.WAVE; // use valid enum value
   return dto;
 };
 it('should pass with valid dto', async () => {
   const dto = validDto();
   const errors = await validate(dto);
   expect(errors.length).toBe(0);
 });
 it('should fail when doctor_id missing', async () => {
   const dto = validDto();
   delete (dto as any).doctor_id;
   const errors = await validate(dto);
   expect(errors.length).toBeGreaterThan(0);
 });

 it('should fail when appointment_date invalid', async () => {
   const dto = validDto();
   dto.appointment_date = '25-04-2026';
   const errors = await validate(dto);
   expect(errors.length).toBeGreaterThan(0);
 });

 it('should fail invalid start_time format', async () => {
   const dto = validDto();
   dto.start_time = '25:99';
   const errors = await validate(dto);
   expect(errors.length).toBeGreaterThan(0);
 });

 it('should fail invalid end_time format', async () => {
   const dto = validDto();
   dto.end_time = '9 AM';
   const errors = await validate(dto);
   expect(errors.length).toBeGreaterThan(0);
 });
 it('should fail when scheduling_type invalid', async () => {
   const dto = validDto();
   (dto as any).scheduling_type = 'BAD_VALUE';
   const errors = await validate(dto);
   expect(errors.length).toBeGreaterThan(0);
 });

});