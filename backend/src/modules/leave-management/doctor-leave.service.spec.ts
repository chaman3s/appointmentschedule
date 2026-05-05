import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BadRequestException } from '@nestjs/common';

import { DoctorLeaveService } from './doctor-leave.service';
import { DoctorLeave } from './entities/DoctorLeave.entity';
import { Doctors } from '../doctors/entity/doctor.entity';

describe('DoctorLeaveService', () => {
  let service: DoctorLeaveService;
  let leaveRepo: any;
  let doctorRepo: any;

  beforeEach(async () => {
    leaveRepo = {
      create: jest.fn((v) => v),
      save: jest.fn(async (v) => v),
      createQueryBuilder: jest.fn(() => ({
        where: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        addOrderBy: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]),
      })),
      findOne: jest.fn(),
      delete: jest.fn(),
    };
    doctorRepo = { findOne: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DoctorLeaveService,
        { provide: getRepositoryToken(DoctorLeave), useValue: leaveRepo },
        { provide: getRepositoryToken(Doctors), useValue: doctorRepo },
      ],
    }).compile();

    service = module.get<DoctorLeaveService>(DoctorLeaveService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('createForMe throws when doctor invalid', async () => {
    doctorRepo.findOne.mockResolvedValue(null);
    await expect(
      service.createForMe(1, { startDate: '2030-01-01', isFullDay: true } as any),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});

