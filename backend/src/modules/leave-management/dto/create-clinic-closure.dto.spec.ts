import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { CreateClinicClosureDto } from './create-clinic-closure.dto';
import { ClosureType } from '../entities/clinicClosure.entity';

describe('CreateClinicClosureDto Validation', () => {
  it('accepts date-only closure (endDate optional)', async () => {
    const dto = plainToInstance(CreateClinicClosureDto, {
      type: ClosureType.HOLIDAY,
      startDate: '2026-05-01',
    });
    const errors = await validate(dto);
    expect(errors.length).toBe(0);
  });

  it('accepts date + time window', async () => {
    const dto = plainToInstance(CreateClinicClosureDto, {
      type: ClosureType.TEMPORARY,
      startDate: '2026-05-01',
      endDate: '2026-05-02',
      startTime: '10:00',
      endTime: '12:00',
    });
    const errors = await validate(dto);
    expect(errors.length).toBe(0);
  });

  it('rejects when endTime missing but startTime provided', async () => {
    const dto = plainToInstance(CreateClinicClosureDto, {
      type: ClosureType.TEMPORARY,
      startDate: '2026-05-01',
      startTime: '10:00',
    });
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
  });
});

