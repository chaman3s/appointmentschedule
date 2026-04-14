import { Test, TestingModule } from '@nestjs/testing';
import { ConsultingTimeService } from './consulting-time.service';

describe('ConsultingTimeService', () => {
  let service: ConsultingTimeService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ConsultingTimeService],
    }).compile();

    service = module.get<ConsultingTimeService>(ConsultingTimeService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
