import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConsultingTimeService } from './consulting-time.service';
import { ConsultingTime } from './entity/consultingTime.entity';
import { ConsultingDay } from './entity/consultingDays.entity';
import { CustomAvailability } from './entity/custom_availability.entity';
import { Doctors } from '../doctors/entity/doctor.entity';

describe('ConsultingTimeService', () => {
  let service: ConsultingTimeService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ConsultingTimeService,
        { provide: getRepositoryToken(ConsultingTime), useValue: {} },
        { provide: getRepositoryToken(ConsultingDay), useValue: {} },
        { provide: getRepositoryToken(CustomAvailability), useValue: {} },
        { provide: getRepositoryToken(Doctors), useValue: {} },
      ],
    }).compile();

    service = module.get<ConsultingTimeService>(ConsultingTimeService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
