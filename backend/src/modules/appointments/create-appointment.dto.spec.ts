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
// missing 
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

  it('should fail when appointment_date missing', async () => {
   const dto = validDto();
   delete (dto as any).appointment_date
   const errors = await validate(dto);
   expect(errors.length).toBeGreaterThan(0);
 });
   it('should fail when end_time missing', async () => {
   const dto = validDto();
   delete (dto as any).end_time
   const errors = await validate(dto);
   expect(errors.length).toBeGreaterThan(0);
 });

  it('should fail when start_time missing', async () => {
   const dto = validDto();
   delete (dto as any).start_time
   const errors = await validate(dto);
   expect(errors.length).toBeGreaterThan(0);
 });
   it('should fail when consulting_type  missing', async () => {
   const dto = validDto();
   delete (dto as any).consulting_type 
   const errors = await validate(dto);
   expect(errors.length).toBeGreaterThan(0);
 });
  it('should fail when scheduling_type  missing', async () => {
   const dto = validDto();
   delete (dto as any).scheduling_type
   const errors = await validate(dto);
   expect(errors.length).toBeGreaterThan(0);
 });
 // type checking
 it('should fail when appointment_date invalid', async () => {
   const dto = validDto();
   dto.appointment_date = 25-10-2025;
   const errors = await validate(dto);
   expect(errors.length).toBeGreaterThan(0);
 });
// foramate checking
 it('should fail when appointment_date invalid', async () => {
   const dto = validDto();
   dto.appointment_date = "25-10-2025";
   const errors = await validate(dto);
   expect(errors.length).toBeGreaterThan(0);
 });
 it('should fail when appointment_date invalid', async () => {
   const dto = validDto();
   dto.appointment_date = "2025-25-10";
   const errors = await validate(dto);
   expect(errors.length).toBeGreaterThan(0);
 });
 it('should fail when appointment_date invalid', async () => {
   const dto = validDto();
   dto.appointment_date = '4-2026-25';
   const errors = await validate(dto);
   expect(errors.length).toBeGreaterThan(0);
 });
 it('should fail invalid start_time format', async () => {
   const dto = validDto();
   dto.start_time = '1:25';
   const errors = await validate(dto);
   expect(errors.length).toBeGreaterThan(0);
 });
 it('should fail invalid start_time format', async () => {
   const dto = validDto();
   dto.start_time = '1:25';
   const errors = await validate(dto);
   expect(errors.length).toBeGreaterThan(0);
 }); it('should fail invalid start_time format', async () => {
   const dto = validDto();
   dto.start_time = '001:25';
   const errors = await validate(dto);
   expect(errors.length).toBeGreaterThan(0);
 });
  it('should fail invalid start_time format', async () => {
   const dto = validDto();
   dto.start_time = '1:250';
   const errors = await validate(dto);
   expect(errors.length).toBeGreaterThan(0);
 });
  it('should fail invalid start_time format', async () => {
   const dto = validDto();
   dto.start_time = '1.25';
   const errors = await validate(dto);
   expect(errors.length).toBeGreaterThan(0);
 });
  it('should fail invalid start_time format', async () => {
   const dto = validDto();
   dto.start_time = '1:2';
   const errors = await validate(dto);
   expect(errors.length).toBeGreaterThan(0);
 });
   it('should fail invalid start_time format', async () => {
   const dto = validDto();
   dto.start_time = '1:2';
   const errors = await validate(dto);
   expect(errors.length).toBeGreaterThan(0);
 });
  it('should fail invalid start_time format', async () => {
   const dto = validDto();
   dto.start_time = '1:2';
   const errors = await validate(dto);
   expect(errors.length).toBeGreaterThan(0);
 });
   it('should fail invalid start_time format', async () => {
   const dto = validDto();
   dto.start_time = '01:2';
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
 it('should fail invalid start_time format', async () => {
   const dto = validDto();
   dto.end_time = '24:00';
   const errors = await validate(dto);
   expect(errors.length).toBeGreaterThan(0);
 });

});