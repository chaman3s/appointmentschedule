import { Test, TestingModule } from '@nestjs/testing';
import { HospitalController } from './hospital.controller';
import { HospitalService } from './hospital.service';

describe('HospitalController', () => {
  let controller: HospitalController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [HospitalController],
      providers: [
        {
          provide: HospitalService,
          useValue: {},
        },
      ],
    }).compile();

    controller = module.get<HospitalController>(HospitalController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
