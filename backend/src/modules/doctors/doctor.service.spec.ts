import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { DoctorServices } from './doctor.service';
import { Doctors } from './entity/doctor.entity';

jest.mock('bcrypt', () => ({
  compare: jest.fn(),
  hash: jest.fn(),
}));

describe('DoctorServices', () => {
  let service: DoctorServices;
  let repo: any;

  beforeEach(async () => {
    repo = {
      findOne: jest.fn(),
      create: jest.fn((v) => v),
      save: jest.fn(async (v) => v),
      createQueryBuilder: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DoctorServices,
        {
          provide: getRepositoryToken(Doctors),
          useValue: repo,
        },
      ],
    }).compile();

    service = module.get<DoctorServices>(DoctorServices);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('login returns message when missing fields', async () => {
    await expect(service.login('', '')).resolves.toEqual({
      message: 'Please enter number and password',
    });
  });

  it('createDoctor returns exists when duplicate', async () => {
    repo.findOne.mockResolvedValue({ id: 1 });
    await expect(
      service.createDoctor({ name: 'D', mobileNumber: '1', password: 'pw' } as any),
    ).resolves.toEqual({ message: 'Doctor already exists' });
  });

  it('createDoctor hashes password and saves', async () => {
    repo.findOne.mockResolvedValue(null);
    (bcrypt.hash as unknown as jest.Mock).mockResolvedValue('hashed');
    await service.createDoctor({ name: 'D', mobileNumber: '1', password: 'pw' } as any);
    expect(bcrypt.hash).toHaveBeenCalledWith('pw', 10);
    expect(repo.save).toHaveBeenCalled();
  });
});

