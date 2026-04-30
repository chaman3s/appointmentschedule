import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { UpdateClinicProfileDto } from './update-clinic-profile.dto';

describe('UpdateClinicProfileDto Validation', () => {
  it('allows empty body (all optional)', async () => {
    const dto = plainToInstance(UpdateClinicProfileDto, {});
    const errors = await validate(dto);
    expect(errors.length).toBe(0);
  });
});

