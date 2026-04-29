import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { UpsertClinicScheduleDto } from './upsert-clinic-schedule.dto';

describe('UpsertClinicScheduleDto Validation', () => {
  it('accepts day like "mon"', async () => {
    const dto = plainToInstance(UpsertClinicScheduleDto, {
      schedules: [{ dayOfWeek: 'mon', isOpen: true, openTime: '09:00', closeTime: '18:00' }],
    });
    const errors = await validate(dto);
    expect(errors.length).toBe(0);
    expect(dto.schedules[0].dayOfWeek).toBe('MONDAY');
  });

  it('accepts day number like 1 (Monday)', async () => {
    const dto = plainToInstance(UpsertClinicScheduleDto, {
      schedules: [{ dayOfWeek: 1, isOpen: true, openTime: '09:00', closeTime: '18:00' }],
    });
    const errors = await validate(dto);
    expect(errors.length).toBe(0);
    expect(dto.schedules[0].dayOfWeek).toBe('MONDAY');
  });

  it('rejects invalid day strings', async () => {
    const dto = plainToInstance(UpsertClinicScheduleDto, {
      schedules: [{ dayOfWeek: 'mondayy', isOpen: true, openTime: '09:00', closeTime: '18:00' }],
    });
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
  });
});

