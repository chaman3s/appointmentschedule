import { Test, TestingModule } from '@nestjs/testing';
import { LeaveManagementService } from './leave-management.service';

describe('LeaveManagementService', () => {
  let service: LeaveManagementService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [LeaveManagementService],
    }).compile();

    service = module.get<LeaveManagementService>(LeaveManagementService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
