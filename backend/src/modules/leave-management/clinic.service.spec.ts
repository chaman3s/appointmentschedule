import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConflictException, NotFoundException } from '@nestjs/common';

import { ClinicService } from './clinic.service';
import { Clinic } from './entities/Clinic.entity';
import { Doctors } from '../doctors/entity/doctor.entity';
import { ClinicSchedule } from './entities/clinicSchedule.entity';
import { ClinicClosure } from './entities/clinicClosure.entity';

describe('ClinicService', () => {
  let service: ClinicService;
  let clinicRepoMock: any;
  let doctorRepoMock: any;

  beforeEach(async () => {
    clinicRepoMock = {
      create: jest.fn((v) => v),
      save: jest.fn(),
      update: jest.fn(),
      findOne: jest.fn(),
    };

    doctorRepoMock = {
      findOne: jest.fn(),
      save: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ClinicService,
        { provide: getRepositoryToken(Clinic), useValue: clinicRepoMock },
        { provide: getRepositoryToken(Doctors), useValue: doctorRepoMock },
        { provide: getRepositoryToken(ClinicSchedule), useValue: {} },
        { provide: getRepositoryToken(ClinicClosure), useValue: {} },
      ],
    }).compile();

    service = module.get<ClinicService>(ClinicService);
  });

  describe('createMyClinic()', () => {
    it('throws when doctor already has a clinic', async () => {
      doctorRepoMock.findOne.mockResolvedValue({ id: 1, clinic: { id: 10 } });
      await expect(
        service.createMyClinic(1, { name: 'A' } as any),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it('creates clinic when none exists', async () => {
      doctorRepoMock.findOne.mockResolvedValue({ id: 1, clinic: null });
      clinicRepoMock.save.mockResolvedValue({ id: 123 });
      doctorRepoMock.save.mockResolvedValue({ id: 1, clinic: { id: 123 } });
      jest.spyOn(service, 'getMyClinic').mockResolvedValue({ id: 123 } as any);

      const result = await service.createMyClinic(1, { name: 'A' } as any);

      expect(clinicRepoMock.save).toHaveBeenCalled();
      expect(doctorRepoMock.save).toHaveBeenCalled();
      expect(result).toEqual({ id: 123 });
    });
  });

  describe('updateMyClinic()', () => {
    it('throws when clinic profile missing', async () => {
      doctorRepoMock.findOne.mockResolvedValue({ id: 1, clinic: null });
      await expect(
        service.updateMyClinic(1, { name: 'A' } as any),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('does not call update when body empty', async () => {
      doctorRepoMock.findOne.mockResolvedValue({ id: 1, clinic: { id: 10 } });
      jest.spyOn(service, 'getMyClinic').mockResolvedValue({ id: 10 } as any);

      await service.updateMyClinic(1, {} as any);

      expect(clinicRepoMock.update).not.toHaveBeenCalled();
    });
  });
});
