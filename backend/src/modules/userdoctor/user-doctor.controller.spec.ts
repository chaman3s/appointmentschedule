import { Test, TestingModule } from '@nestjs/testing';
import { ConsultingTimeService } from '../consulting-time/consulting-time.service';
import { UserDoctorController } from './user-doctor.controller';

describe('UserDoctorController', () => {
  let controller: UserDoctorController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UserDoctorController],
      providers: [
        {
          provide: ConsultingTimeService,
          useValue: {},
        },
      ],
    }).compile();

    controller = module.get<UserDoctorController>(UserDoctorController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});

