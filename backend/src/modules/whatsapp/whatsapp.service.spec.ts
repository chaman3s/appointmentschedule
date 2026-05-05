import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { WhatsappService } from './whatsapp.service';
import { User } from '../users/entities/user.entity';
import { Doctors } from '../doctors/entity/doctor.entity';
import { AppointmentsService } from '../appointments/appointments.service';

describe('WhatsappService', () => {
  let service: WhatsappService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WhatsappService,
        { provide: getRepositoryToken(User), useValue: {} },
        { provide: AppointmentsService, useValue: {} },
        { provide: getRepositoryToken(Doctors), useValue: {} },
      ],
    }).compile();

    service = module.get<WhatsappService>(WhatsappService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
