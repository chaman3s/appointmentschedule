import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { HospitalService } from './hospital.service';
import { Hospital } from './entities/hospital.entity';
import { Doctors } from '../doctors/entity/doctor.entity';

describe('HospitalService', () => {
  let service: HospitalService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        HospitalService,
        {
          provide: getRepositoryToken(Hospital),
          useValue: {},
        },
        {
          provide: getRepositoryToken(Doctors),
          useValue: {},
        },
      ],
    }).compile();

    service = module.get<HospitalService>(HospitalService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
