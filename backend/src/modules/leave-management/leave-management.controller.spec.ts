import { Test, TestingModule } from '@nestjs/testing';
import { LeaveManagementController } from './leave-management.controller';
import { LeaveManagementService } from './leave-management.service';

describe('LeaveManagementController', () => {
  let controller: LeaveManagementController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [LeaveManagementController],
      providers: [LeaveManagementService],
    }).compile();

    controller = module.get<LeaveManagementController>(LeaveManagementController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
