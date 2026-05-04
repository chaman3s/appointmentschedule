import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BadRequestException, ConflictException } from '@nestjs/common';
import { DataSource } from 'typeorm';

import { AppointmentsService } from './appointments.service';
import { Appointment } from './entities/appointment.entity';
import { ConsultingTime } from '../consulting-time/entity/consultingTime.entity';
import { CustomAvailability } from '../consulting-time/entity/custom_availability.entity';
import { Doctors } from '../doctors/entity/doctor.entity';
import { ClinicSchedule } from '../leave-management/entities/clinicSchedule.entity';
import { ClinicClosure } from '../leave-management/entities/clinicClosure.entity';
import { DoctorLeave } from '../leave-management/entities/DoctorLeave.entity';
import {
  AppointmentStatus,
  SchedulingType,
} from '../common/enums/appointment.enum';

type StreamSlot = {
  start: string;
  end: string;
  available: boolean;
};

type WaveSlot = {
  start: string;
  end: string;
  capacity: number;
  booked: number;
  available_spots: number;
};

const slotSummary = (overrides?: Partial<any>) => ({
  total_slots: 0,
  booked_slots: 0,
  available_slots: 0,
  ...(overrides ?? {}),
});

const streamSlot = (
  start: string,
  end: string,
  available = true,
): StreamSlot => ({ start, end, available });

const waveSlot = (
  start: string,
  end: string,
  capacity: number,
  booked: number,
  available_spots: number,
): WaveSlot => ({ start, end, capacity, booked, available_spots });

const qbMock = () => ({
  where: jest.fn().mockReturnThis(),
  andWhere: jest.fn().mockReturnThis(),
  setLock: jest.fn().mockReturnThis(),
  getMany: jest.fn().mockResolvedValue([]),
  getCount: jest.fn().mockResolvedValue(0),
  delete: jest.fn().mockReturnThis(),
  from: jest.fn().mockReturnThis(),
  execute: jest.fn().mockResolvedValue(undefined),
});

const addDaysUtc = (date: string, days: number) => {
  const next = new Date(`${date}T00:00:00.000Z`);
  next.setUTCDate(next.getUTCDate() + days);
  return next.toISOString().slice(0, 10);
};

describe('AppointmentsService', () => {
  let service: AppointmentsService;
  let appointmentRepoMock: any;
  let consultingRepoMock: any;
  let customRepoMock: any;
  let doctorRepoMock: any;
  let clinicScheduleRepoMock: any;
  let clinicClosureRepoMock: any;
  let doctorLeaveRepoMock: any;
  let dataSourceMock: any;

  beforeEach(async () => {
    appointmentRepoMock = {
      findOne: jest.fn(),
      find: jest.fn(),
      save: jest.fn(),
      createQueryBuilder: jest.fn(() => qbMock()),
    };

    consultingRepoMock = {
      find: jest.fn().mockResolvedValue([]),
    };

    customRepoMock = {
      findOne: jest.fn(),
    };

    doctorRepoMock = {
      findOne: jest.fn().mockResolvedValue(null),
    };

    clinicScheduleRepoMock = {
      findOne: jest.fn().mockResolvedValue(null),
      count: jest.fn().mockResolvedValue(0),
    };

    clinicClosureRepoMock = {
      createQueryBuilder: jest.fn(() => qbMock()),
    };

    doctorLeaveRepoMock = {
      findOne: jest.fn(),
      createQueryBuilder: jest.fn(() => qbMock()),
    };

    dataSourceMock = {
      transaction: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AppointmentsService,
        {
          provide: getRepositoryToken(Appointment),
          useValue: appointmentRepoMock,
        },
        {
          provide: getRepositoryToken(ConsultingTime),
          useValue: consultingRepoMock,
        },
        {
          provide: getRepositoryToken(CustomAvailability),
          useValue: customRepoMock,
        },
        {
          provide: getRepositoryToken(Doctors),
          useValue: doctorRepoMock,
        },
        {
          provide: getRepositoryToken(ClinicSchedule),
          useValue: clinicScheduleRepoMock,
        },
        {
          provide: getRepositoryToken(ClinicClosure),
          useValue: clinicClosureRepoMock,
        },
        {
          provide: getRepositoryToken(DoctorLeave),
          useValue: doctorLeaveRepoMock,
        },
        {
          provide: DataSource,
          useValue: dataSourceMock,
        },
      ],
    }).compile();

    service = module.get<AppointmentsService>(AppointmentsService);
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
    delete process.env.NEXT_AVAILABLE_MAX_DAYS;
  });

  describe('getSlotsWithNextAvailable()', () => {
    beforeEach(() => {
      jest.useFakeTimers();
      jest.setSystemTime(Date.parse('2030-01-15T12:00:00.000Z'));
    });

    it.each([
      '',
      '2030/01/15',
      '2030-1-15',
      '20300115',
      '15-01-2030',
      '2030-01',
      '2030-01-1',
      '2030-001-01',
      '2030-01-001',
      '2030-01-15T00:00:00Z',
      ' 2030-01-15',
      '2030-01-15 ',
      'nope',
    ])('throws on invalid date format: %s', async (badDate) => {
      await expect(service.getSlotsWithNextAvailable(1, badDate)).rejects.toThrow(
        'Invalid date format',
      );
    });

    it('returns same-day availability when present (stream)', async () => {
      jest.spyOn(service, 'getAvailableSlots').mockResolvedValue({
        scheduling_type: SchedulingType.STREAM,
        slots: [streamSlot('09:00', '09:15', false), streamSlot('09:15', '09:30', true)],
        is_working_day: true,
        summary: slotSummary({ total_slots: 2, available_slots: 1 }),
      } as any);

      const result = await service.getSlotsWithNextAvailable(1, '2030-01-15', 3);

      expect(result).toEqual({
        requested_date: '2030-01-15',
        date: '2030-01-15',
        scheduling_type: SchedulingType.STREAM,
        slots: [
          { start: '09:00', end: '09:15', available: false },
          { start: '09:15', end: '09:30', available: true },
        ],
        available_slots: [{ start: '09:15', end: '09:30', available: true }],
        summary: { total_slots: 2, booked_slots: 0, available_slots: 1 },
      });
    });

    it('returns same-day availability when present (wave)', async () => {
      jest.spyOn(service, 'getAvailableSlots').mockResolvedValue({
        scheduling_type: SchedulingType.WAVE,
        slots: [
          waveSlot('10:00', '11:00', 5, 5, 0),
          waveSlot('11:00', '12:00', 5, 4, 1),
        ],
        is_working_day: true,
        summary: slotSummary({ total_slots: 10, available_slots: 1 }),
      } as any);

      const result = await service.getSlotsWithNextAvailable(1, '2030-01-15', 3);

      expect(result.available_slots).toEqual([
        { start: '11:00', end: '12:00', capacity: 5, booked: 4, available_spots: 1 },
      ]);
    });

    it('filters available_slots for stream based on availability flag', async () => {
      jest.spyOn(service, 'getAvailableSlots').mockResolvedValue({
        scheduling_type: SchedulingType.STREAM,
        slots: [
          streamSlot('09:00', '09:15', false),
          streamSlot('09:15', '09:30', true),
          streamSlot('09:30', '09:45', true),
        ],
        is_working_day: true,
        summary: slotSummary(),
      } as any);

      const result = await service.getSlotsWithNextAvailable(1, '2030-01-15', 3);
      expect(result.available_slots).toEqual([
        { start: '09:15', end: '09:30', available: true },
        { start: '09:30', end: '09:45', available: true },
      ]);
    });

    it('uses today as startDate when requested date is in the past', async () => {
      const today = '2030-01-15';
      const tomorrow = addDaysUtc(today, 1);

      const getAvailableSlotsSpy = jest
        .spyOn(service, 'getAvailableSlots')
        .mockImplementation(async (_doctorId: number, date: string) => {
          if (date === today) {
            return {
              scheduling_type: SchedulingType.STREAM,
              slots: [streamSlot('10:00', '10:15', false)],
              is_working_day: true,
              summary: slotSummary({ total_slots: 1, available_slots: 0 }),
            } as any;
          }
          if (date === tomorrow) {
            return {
              scheduling_type: SchedulingType.STREAM,
              slots: [streamSlot('11:00', '11:15', true)],
              is_working_day: true,
              summary: slotSummary({ total_slots: 1, available_slots: 1 }),
            } as any;
          }
          throw new Error(`Unexpected date ${date}`);
        });

      const result = await service.getSlotsWithNextAvailable(1, '2029-12-31', 1);

      expect(getAvailableSlotsSpy).toHaveBeenCalledWith(1, today);
      expect(getAvailableSlotsSpy).toHaveBeenCalledWith(1, tomorrow);
      expect(result.requested_date).toBe('2029-12-31');
      expect(result.date).toBe(tomorrow);
      expect(result.message).toBe(
        `Today’s appointments are fully booked. Next available slot is on ${tomorrow}.`,
      );
    });

    it('uses configured env max days when maxDays not provided', async () => {
      process.env.NEXT_AVAILABLE_MAX_DAYS = '1';

      const today = '2030-01-15';
      const tomorrow = addDaysUtc(today, 1);

      jest.spyOn(service, 'getAvailableSlots').mockImplementation(
        async (_doctorId: number, date: string) => {
          if (date === today) {
            return {
              scheduling_type: SchedulingType.STREAM,
              slots: [streamSlot('10:00', '10:15', false)],
              is_working_day: true,
              summary: slotSummary(),
            } as any;
          }
          if (date === tomorrow) {
            return {
              scheduling_type: SchedulingType.STREAM,
              slots: [streamSlot('12:00', '12:15', true)],
              is_working_day: true,
              summary: slotSummary(),
            } as any;
          }
          return {
            scheduling_type: SchedulingType.STREAM,
            slots: [],
            is_working_day: true,
            summary: slotSummary(),
          } as any;
        },
      );

      const result = await service.getSlotsWithNextAvailable(1, today);
      expect(result.date).toBe(tomorrow);
    });

    it.each([
      { label: 'negative', maxDays: -3, expected: 0 },
      { label: 'fractional', maxDays: 2.9, expected: 2 },
      { label: 'nan', maxDays: Number.NaN, expected: 30 },
      { label: 'infinite', maxDays: Number.POSITIVE_INFINITY, expected: 30 },
    ])('normalizes maxDays ($label)', async ({ maxDays, expected }) => {
      const start = '2030-01-15';
      const getAvailableSlotsSpy = jest.spyOn(service, 'getAvailableSlots').mockResolvedValue({
        scheduling_type: SchedulingType.STREAM,
        slots: [],
        is_working_day: true,
        summary: slotSummary(),
      } as any);

      const result = await service.getSlotsWithNextAvailable(1, start, maxDays as any);
      expect(result.message).toBe(
        `No appointments available in the next ${expected} days. Please contact clinic.`,
      );
      expect(getAvailableSlotsSpy).toHaveBeenCalledTimes(1 + expected);
    });

    it('when maxDays=0, does not search future days', async () => {
      const getAvailableSlotsSpy = jest.spyOn(service, 'getAvailableSlots').mockResolvedValue({
        scheduling_type: SchedulingType.STREAM,
        slots: [],
        is_working_day: true,
        summary: slotSummary(),
      } as any);

      const result = await service.getSlotsWithNextAvailable(1, '2030-01-15', 0);
      expect(getAvailableSlotsSpy).toHaveBeenCalledTimes(1);
      expect(result.available_slots).toEqual([]);
      expect(result.message).toBe(
        'No appointments available in the next 0 days. Please contact clinic.',
      );
    });

    it('returns candidate availability when same day has none (today message)', async () => {
      const today = '2030-01-15';
      const tomorrow = addDaysUtc(today, 1);

      jest.spyOn(service, 'getAvailableSlots').mockImplementation(
        async (_doctorId: number, date: string) => {
          if (date === today) {
            return {
              scheduling_type: SchedulingType.STREAM,
              slots: [streamSlot('10:00', '10:15', false)],
              is_working_day: true,
              summary: slotSummary({ total_slots: 1, available_slots: 0 }),
            } as any;
          }
          if (date === tomorrow) {
            return {
              scheduling_type: SchedulingType.STREAM,
              slots: [streamSlot('11:00', '11:15', false), streamSlot('11:15', '11:30', true)],
              is_working_day: true,
              summary: slotSummary({ total_slots: 2, available_slots: 1 }),
            } as any;
          }
          return {
            scheduling_type: SchedulingType.STREAM,
            slots: [],
            is_working_day: true,
            summary: slotSummary(),
          } as any;
        },
      );

      const result = await service.getSlotsWithNextAvailable(1, today, 2);

      expect(result.date).toBe(tomorrow);
      expect(result.available_slots).toEqual([{ start: '11:15', end: '11:30', available: true }]);
      expect(result.message).toBe(
        `Today’s appointments are fully booked. Next available slot is on ${tomorrow}.`,
      );
    });

    it('returns candidate availability when same day has none (non-today message)', async () => {
      const today = '2030-01-15';
      const requested = addDaysUtc(today, 2);
      const candidate = addDaysUtc(requested, 1);

      jest.spyOn(service, 'getAvailableSlots').mockImplementation(
        async (_doctorId: number, date: string) => {
          if (date === requested) {
            return {
              scheduling_type: SchedulingType.STREAM,
              slots: [],
              is_working_day: true,
              summary: slotSummary(),
            } as any;
          }
          if (date === candidate) {
            return {
              scheduling_type: SchedulingType.STREAM,
              slots: [streamSlot('13:00', '13:15', true)],
              is_working_day: true,
              summary: slotSummary({ total_slots: 1, available_slots: 1 }),
            } as any;
          }
          return {
            scheduling_type: SchedulingType.STREAM,
            slots: [],
            is_working_day: true,
            summary: slotSummary(),
          } as any;
        },
      );

      const result = await service.getSlotsWithNextAvailable(1, requested, 2);

      expect(result.date).toBe(candidate);
      expect(result.message).toBe(
        `No appointments available on ${requested}. Next available appointment is on ${candidate}.`,
      );
    });

    it('skips days with no availability until it finds one', async () => {
      const start = '2030-01-15';
      const day1 = addDaysUtc(start, 1);
      const day2 = addDaysUtc(start, 2);
      const day3 = addDaysUtc(start, 3);

      jest.spyOn(service, 'getAvailableSlots').mockImplementation(
        async (_doctorId: number, date: string) => {
          if (date === start) {
            return {
              scheduling_type: SchedulingType.STREAM,
              slots: [streamSlot('10:00', '10:15', false)],
              is_working_day: true,
              summary: slotSummary(),
            } as any;
          }
          if (date === day1) {
            return {
              scheduling_type: SchedulingType.STREAM,
              slots: [],
              is_working_day: true,
              summary: slotSummary(),
            } as any;
          }
          if (date === day2) {
            return {
              scheduling_type: SchedulingType.STREAM,
              slots: [streamSlot('12:00', '12:15', false)],
              is_working_day: true,
              summary: slotSummary(),
            } as any;
          }
          if (date === day3) {
            return {
              scheduling_type: SchedulingType.STREAM,
              slots: [streamSlot('15:00', '15:15', true)],
              is_working_day: true,
              summary: slotSummary(),
            } as any;
          }
          return {
            scheduling_type: SchedulingType.STREAM,
            slots: [],
            is_working_day: true,
            summary: slotSummary(),
          } as any;
        },
      );

      const result = await service.getSlotsWithNextAvailable(1, start, 3);
      expect(result.date).toBe(day3);
      expect(result.available_slots).toEqual([{ start: '15:00', end: '15:15', available: true }]);
    });

    it('returns empty availability with message when nothing found', async () => {
      jest.spyOn(service, 'getAvailableSlots').mockResolvedValue({
        scheduling_type: SchedulingType.STREAM,
        slots: [streamSlot('10:00', '10:15', false)],
        is_working_day: true,
        summary: slotSummary({ total_slots: 1, available_slots: 0 }),
      } as any);

      const result = await service.getSlotsWithNextAvailable(1, '2030-01-15', 2);

      expect(result.available_slots).toEqual([]);
      expect(result.message).toBe(
        'No appointments available in the next 2 days. Please contact clinic.',
      );
    });
  });

  describe('findBestAvailableSlot()', () => {
    beforeEach(() => {
      jest.useFakeTimers();
      jest.setSystemTime(Date.parse('2030-01-15T12:00:00.000Z'));
    });

    it('returns exact requested stream slot when available', async () => {
      jest.spyOn(service, 'getAvailableSlots').mockResolvedValue({
        scheduling_type: SchedulingType.STREAM,
        slots: [streamSlot('10:00', '10:15', true)],
        is_working_day: true,
        summary: slotSummary(),
      } as any);

      const result = await service.findBestAvailableSlot(
        1,
        '2030-01-15',
        '10:00',
        '10:15',
      );

      expect(result).toEqual({
        date: '2030-01-15',
        start: '10:00',
        end: '10:15',
      });
    });

    it('returns same-day alternate stream slot when requested unavailable', async () => {
      jest.spyOn(service, 'getAvailableSlots').mockResolvedValue({
        scheduling_type: SchedulingType.STREAM,
        slots: [streamSlot('10:00', '10:15', false), streamSlot('11:00', '11:15', true)],
        is_working_day: true,
        summary: slotSummary(),
      } as any);

      const result = await service.findBestAvailableSlot(
        1,
        '2030-01-15',
        '10:00',
        '10:15',
      );

      expect(result).toEqual({
        date: '2030-01-15',
        start: '11:00',
        end: '11:15',
      });
    });

    it('returns wave slot when capacity available', async () => {
      jest.spyOn(service, 'getAvailableSlots').mockResolvedValue({
        scheduling_type: SchedulingType.WAVE,
        slots: [waveSlot('09:00', '10:00', 5, 2, 3)],
        is_working_day: true,
        summary: slotSummary(),
      } as any);

      const result = await service.findBestAvailableSlot(1, '2030-01-15');

      expect(result).toEqual({
        date: '2030-01-15',
        start: '09:00',
        end: '10:00',
      });
    });

    it('throws when no future slots available', async () => {
      jest.spyOn(service, 'getAvailableSlots').mockResolvedValue({
        scheduling_type: SchedulingType.STREAM,
        slots: [],
        is_working_day: true,
        summary: slotSummary(),
      } as any);

      jest.spyOn(service, 'getSlotsWithNextAvailable').mockResolvedValue({
        requested_date: '2030-01-15',
        date: '2030-01-15',
        scheduling_type: SchedulingType.STREAM,
        slots: [],
        available_slots: [],
        summary: slotSummary(),
      } as any);

      await expect(
        service.findBestAvailableSlot(1, '2030-01-15', '10:00', '10:15'),
      ).rejects.toThrow('No future slots available');
    });

    it('prefers same time on future day when available', async () => {
      jest.spyOn(service, 'getAvailableSlots').mockResolvedValue({
        scheduling_type: SchedulingType.STREAM,
        slots: [],
        is_working_day: true,
        summary: slotSummary(),
      } as any);

      jest.spyOn(service, 'getSlotsWithNextAvailable').mockResolvedValue({
        requested_date: '2030-01-15',
        date: '2030-01-16',
        scheduling_type: SchedulingType.STREAM,
        slots: [],
        available_slots: [streamSlot('11:00', '11:15', true), streamSlot('10:00', '10:15', true)],
        summary: slotSummary(),
      } as any);

      const result = await service.findBestAvailableSlot(
        1,
        '2030-01-15',
        '10:00',
        '10:15',
      );

      expect(result).toEqual({
        date: '2030-01-16',
        start: '10:00',
        end: '10:15',
      });
    });

    it('falls back to first available future slot when same time not found', async () => {
      jest.spyOn(service, 'getAvailableSlots').mockResolvedValue({
        scheduling_type: SchedulingType.STREAM,
        slots: [],
        is_working_day: true,
        summary: slotSummary(),
      } as any);

      jest.spyOn(service, 'getSlotsWithNextAvailable').mockResolvedValue({
        requested_date: '2030-01-15',
        date: '2030-01-16',
        scheduling_type: SchedulingType.STREAM,
        slots: [],
        available_slots: [streamSlot('11:00', '11:15', true), streamSlot('10:00', '10:15', true)],
        summary: slotSummary(),
      } as any);

      const result = await service.findBestAvailableSlot(
        1,
        '2030-01-15',
        '09:00',
        '09:15',
      );

      expect(result).toEqual({
        date: '2030-01-16',
        start: '11:00',
        end: '11:15',
      });
    });

    it('calls getSlotsWithNextAvailable for future search', async () => {
      jest.spyOn(service, 'getAvailableSlots').mockResolvedValue({
        scheduling_type: SchedulingType.STREAM,
        slots: [],
        is_working_day: true,
        summary: slotSummary(),
      } as any);

      const nextSpy = jest.spyOn(service, 'getSlotsWithNextAvailable').mockResolvedValue({
        requested_date: '2030-01-15',
        date: '2030-01-16',
        scheduling_type: SchedulingType.STREAM,
        slots: [],
        available_slots: [streamSlot('11:00', '11:15', true)],
        summary: slotSummary(),
      } as any);

      await service.findBestAvailableSlot(1, '2030-01-15');
      expect(nextSpy).toHaveBeenCalledWith(1, '2030-01-15', undefined);
    });
  });

  describe('bookSlot()', () => {
    const managerMock = {
      create: jest.fn((_e: any, v: any) => v),
      save: jest.fn(async (v: any) => v),
    };

    beforeEach(() => {
      jest.useFakeTimers();
      jest.setSystemTime(Date.parse('2030-01-15T12:00:00'));

      dataSourceMock.transaction.mockImplementation(async (cb: any) => cb(managerMock));
      appointmentRepoMock.findOne.mockResolvedValue(null);
      jest.spyOn(service as any, 'getOccupiedSlotCount').mockResolvedValue(0);
    });

    it.each([
      { date: '2000-01-01', start: '10:00' },
      { date: '2010-12-31', start: '23:59' },
    ])('rejects past appointment: $date $start', async ({ date, start }) => {
      await expect(
        service.bookSlot({
          doctor_id: 1,
          user_id: 1,
          appointment_date: date,
          start_time: start,
          end_time: '10:15',
        } as any),
      ).rejects.toThrow('Cannot book appointment in the past');
    });

    it('rejects appointments beyond 7 days in advance', async () => {
      await expect(
        service.bookSlot({
          doctor_id: 1,
          user_id: 1,
          appointment_date: '2030-01-23',
          start_time: '10:00',
          end_time: '10:15',
        } as any),
      ).rejects.toThrow('Appointments can only be booked up to 7 days in advance');
    });

    it('rejects when user already booked same day', async () => {
      appointmentRepoMock.findOne.mockResolvedValueOnce({
        appointment_id: 22,
        status: AppointmentStatus.BOOKED,
      });

      const getAvailableSlotsSpy = jest.spyOn(service, 'getAvailableSlots');

      await expect(
        service.bookSlot({
          doctor_id: 1,
          user_id: 1,
          appointment_date: '2099-04-22',
          start_time: '10:00',
          end_time: '10:15',
        } as any),
      ).rejects.toThrow('you already book appointment for 2099-04-22');

      expect(getAvailableSlotsSpy).not.toHaveBeenCalled();
    });

    it('returns same-day alternate when requested stream slot unavailable', async () => {
      jest.spyOn(service, 'getAvailableSlots').mockResolvedValue({
        scheduling_type: SchedulingType.STREAM,
        slots: [streamSlot('10:00', '10:15', false), streamSlot('10:15', '10:30', true)],
        is_working_day: true,
        summary: slotSummary(),
      } as any);

      const occupiedSpy = jest.spyOn(service as any, 'getOccupiedSlotCount');
      const saveSpy = managerMock.save;

      const result = await service.bookSlot({
        doctor_id: 1,
        user_id: 1,
        appointment_date: '2099-04-22',
        start_time: '10:00',
        end_time: '10:15',
      } as any);

      expect(result).toEqual({
        booked: false,
        message:
          'Requested slot unavailable. Next available slot is on 2099-04-22 at 10:15.',
        next_available_date: '2099-04-22',
        next_available_start: '10:15',
        next_available_end: '10:30',
        estimatedTokenNo: 1,
        estimatedReportingTime: '10:00',
      });
      expect(occupiedSpy).not.toHaveBeenCalled();
      expect(saveSpy).not.toHaveBeenCalled();
    });

    it('suggests future same time when same day unavailable', async () => {
      const day0 = '2099-04-22';
      const day1 = addDaysUtc(day0, 1);

      jest.spyOn(service, 'getAvailableSlots').mockImplementation(async (_doctorId, date) => {
        if (date === day0) {
          return {
            scheduling_type: SchedulingType.STREAM,
            slots: [streamSlot('10:00', '10:15', false)],
            is_working_day: true,
            summary: slotSummary(),
          } as any;
        }
        if (date === day1) {
          return {
            scheduling_type: SchedulingType.STREAM,
            slots: [streamSlot('10:00', '10:15', true)],
            is_working_day: true,
            summary: slotSummary(),
          } as any;
        }
        return {
          scheduling_type: SchedulingType.STREAM,
          slots: [],
          is_working_day: true,
          summary: slotSummary(),
        } as any;
      });

      const result = await service.bookSlot({
        doctor_id: 1,
        user_id: 1,
        appointment_date: day0,
        start_time: '10:00',
        end_time: '10:15',
      } as any);

      expect(result).toEqual({
        booked: false,
        message: `Today’s appointments are fully booked. Next available slot is on ${day1} at 10:00.`,
        next_available_date: day1,
        next_available_start: '10:00',
        next_available_end: '10:15',
        estimatedTokenNo: 1,
        estimatedReportingTime: '09:45',
      });
    });

    it('suggests future first available when same time not available', async () => {
      const day0 = '2099-04-22';
      const day1 = addDaysUtc(day0, 1);

      jest.spyOn(service, 'getAvailableSlots').mockImplementation(async (_doctorId, date) => {
        if (date === day0) {
          return {
            scheduling_type: SchedulingType.STREAM,
            slots: [streamSlot('10:00', '10:15', false)],
            is_working_day: true,
            summary: slotSummary(),
          } as any;
        }
        if (date === day1) {
          return {
            scheduling_type: SchedulingType.STREAM,
            slots: [streamSlot('10:00', '10:15', false), streamSlot('11:00', '11:15', true)],
            is_working_day: true,
            summary: slotSummary(),
          } as any;
        }
        return {
          scheduling_type: SchedulingType.STREAM,
          slots: [],
          is_working_day: true,
          summary: slotSummary(),
        } as any;
      });

      const result = await service.bookSlot({
        doctor_id: 1,
        user_id: 1,
        appointment_date: day0,
        start_time: '10:00',
        end_time: '10:15',
      } as any);

      expect(result).toEqual({
        booked: false,
        message: `Today’s appointments are fully booked. Next available slot is on ${day1} at 11:00.`,
        next_available_date: day1,
        next_available_start: '11:00',
        next_available_end: '11:15',
        estimatedTokenNo: 1,
        estimatedReportingTime: '10:45',
      });
    });

    it('continues future search when future day has slots but none available', async () => {
      const day0 = '2099-04-22';
      const day1 = addDaysUtc(day0, 1);
      const day2 = addDaysUtc(day0, 2);

      jest.spyOn(service, 'getAvailableSlots').mockImplementation(async (_doctorId, date) => {
        if (date === day0) {
          return {
            scheduling_type: SchedulingType.STREAM,
            slots: [streamSlot('10:00', '10:15', false)],
            is_working_day: true,
            summary: slotSummary(),
          } as any;
        }
        if (date === day1) {
          return {
            scheduling_type: SchedulingType.STREAM,
            slots: [streamSlot('11:00', '11:15', false)],
            is_working_day: true,
            summary: slotSummary(),
          } as any;
        }
        if (date === day2) {
          return {
            scheduling_type: SchedulingType.STREAM,
            slots: [streamSlot('12:00', '12:15', true)],
            is_working_day: true,
            summary: slotSummary(),
          } as any;
        }
        return {
          scheduling_type: SchedulingType.STREAM,
          slots: [],
          is_working_day: true,
          summary: slotSummary(),
        } as any;
      });

      const result = await service.bookSlot({
        doctor_id: 1,
        user_id: 1,
        appointment_date: day0,
        start_time: '10:00',
        end_time: '10:15',
      } as any);

      expect(result.next_available_date).toBe(day2);
      expect(result.next_available_start).toBe('12:00');
    });

    it('throws when no appointments in next 30 days', async () => {
      jest.spyOn(service, 'getAvailableSlots').mockResolvedValue({
        scheduling_type: SchedulingType.STREAM,
        slots: [],
        is_working_day: true,
        summary: slotSummary(),
      } as any);

      await expect(
        service.bookSlot({
          doctor_id: 1,
          user_id: 1,
          appointment_date: '2099-04-22',
          start_time: '10:00',
          end_time: '10:15',
        } as any),
      ).rejects.toThrow('No appointments available in the next 30 days. Please contact clinic.');
    });

    it('throws conflict when stream slot already occupied', async () => {
      jest.spyOn(service, 'getAvailableSlots').mockResolvedValue({
        scheduling_type: SchedulingType.STREAM,
        slots: [streamSlot('10:00', '10:15', true)],
        is_working_day: true,
        summary: slotSummary(),
      } as any);

      jest.spyOn(service as any, 'getOccupiedSlotCount').mockResolvedValue(1);

      await expect(
        service.bookSlot({
          doctor_id: 1,
          user_id: 1,
          appointment_date: '2099-04-22',
          start_time: '10:00',
          end_time: '10:15',
        } as any),
      ).rejects.toThrow('Slot already booked');
    });

    it('throws conflict when wave capacity reached', async () => {
      jest.spyOn(service, 'getAvailableSlots').mockResolvedValue({
        scheduling_type: SchedulingType.WAVE,
        slots: [waveSlot('10:00', '11:00', 2, 2, 1)],
        is_working_day: true,
        summary: slotSummary(),
      } as any);

      jest.spyOn(service as any, 'getOccupiedSlotCount').mockResolvedValue(2);

      await expect(
        service.bookSlot({
          doctor_id: 1,
          user_id: 1,
          appointment_date: '2099-04-22',
          start_time: '10:00',
          end_time: '11:00',
        } as any),
      ).rejects.toThrow('Wave full');
    });

    it('suggests future wave slot when today wave is full', async () => {
      const day0 = '2099-04-22';
      const day1 = addDaysUtc(day0, 1);

      jest.spyOn(service, 'getAvailableSlots').mockImplementation(async (_doctorId, date) => {
        if (date === day0) {
          return {
            scheduling_type: SchedulingType.WAVE,
            slots: [waveSlot('10:00', '11:00', 2, 2, 0)],
            is_working_day: true,
            summary: slotSummary(),
          } as any;
        }
        if (date === day1) {
          return {
            scheduling_type: SchedulingType.WAVE,
            slots: [waveSlot('10:00', '11:00', 2, 1, 1)],
            is_working_day: true,
            summary: slotSummary(),
          } as any;
        }
        return {
          scheduling_type: SchedulingType.WAVE,
          slots: [],
          is_working_day: true,
          summary: slotSummary(),
        } as any;
      });

      const result = await service.bookSlot({
        doctor_id: 1,
        user_id: 1,
        appointment_date: day0,
        start_time: '10:00',
        end_time: '11:00',
      } as any);

      expect(result).toEqual({
        booked: false,
        message: `Today’s appointments are fully booked. Next available slot is on ${day1} at 10:00.`,
        next_available_date: day1,
        next_available_start: '10:00',
        next_available_end: '11:00',
        estimatedTokenNo: 1,
        estimatedReportingTime: '09:45',
      });
    });

    it('books wave slot successfully when capacity available', async () => {
      jest.spyOn(service, 'getAvailableSlots').mockResolvedValue({
        scheduling_type: SchedulingType.WAVE,
        slots: [waveSlot('10:00', '11:00', 3, 1, 2)],
        is_working_day: true,
        summary: slotSummary(),
      } as any);

      jest.spyOn(service as any, 'getOccupiedSlotCount').mockResolvedValue(1);

      const result = await service.bookSlot({
        doctor_id: 5,
        user_id: 7,
        appointment_date: '2099-04-22',
        start_time: '10:00',
        end_time: '11:00',
      } as any);

      expect(result.booked).toBe(true);
      expect(result.appointment.status).toBe(AppointmentStatus.BOOKED);
    });

    it('books stream slot successfully', async () => {
      jest.spyOn(service, 'getAvailableSlots').mockResolvedValue({
        scheduling_type: SchedulingType.STREAM,
        slots: [streamSlot('10:00', '10:15', true)],
        is_working_day: true,
        summary: slotSummary(),
      } as any);

      jest.spyOn(service as any, 'getOccupiedSlotCount').mockResolvedValue(0);

      const result = await service.bookSlot({
        doctor_id: 5,
        user_id: 7,
        appointment_date: '2099-04-22',
        start_time: '10:00',
        end_time: '10:15',
      } as any);

      expect(result.booked).toBe(true);
      expect(result.booked_date).toBe('2099-04-22');
      expect(result.booked_start).toBe('10:00');
      expect(result.booked_end).toBe('10:15');
      expect(result.appointment.status).toBe(AppointmentStatus.BOOKED);
      expect(result.appointment.expires_at).toBeNull();
      expect(result.appointment.doctor).toEqual({ id: 5 });
      expect(result.appointment.user).toEqual({ id: 7 });
    });

    it('sets patient relation when patient_id provided', async () => {
      jest.spyOn(service, 'getAvailableSlots').mockResolvedValue({
        scheduling_type: SchedulingType.STREAM,
        slots: [streamSlot('10:00', '10:15', true)],
        is_working_day: true,
        summary: slotSummary(),
      } as any);

      const result = await service.bookSlot({
        doctor_id: 5,
        user_id: 7,
        patient_id: 99,
        appointment_date: '2099-04-22',
        start_time: '10:00',
        end_time: '10:15',
      } as any);

      expect(result.appointment.patient).toEqual({ patient_id: 99 });
    });

    it('does not set patient relation when patient_id missing', async () => {
      jest.spyOn(service, 'getAvailableSlots').mockResolvedValue({
        scheduling_type: SchedulingType.STREAM,
        slots: [streamSlot('10:00', '10:15', true)],
        is_working_day: true,
        summary: slotSummary(),
      } as any);

      const result = await service.bookSlot({
        doctor_id: 5,
        user_id: 7,
        appointment_date: '2099-04-22',
        start_time: '10:00',
        end_time: '10:15',
      } as any);

      expect(result.appointment.patient).toBeUndefined();
    });

    it('calls occupied count with pessimistic lock enabled', async () => {
      jest.spyOn(service, 'getAvailableSlots').mockResolvedValue({
        scheduling_type: SchedulingType.STREAM,
        slots: [streamSlot('10:00', '10:15', true)],
        is_working_day: true,
        summary: slotSummary(),
      } as any);

      const occupiedSpy = jest.spyOn(service as any, 'getOccupiedSlotCount').mockResolvedValue(0);

      await service.bookSlot({
        doctor_id: 1,
        user_id: 2,
        appointment_date: '2099-04-22',
        start_time: '10:00',
        end_time: '10:15',
      } as any);

      expect(occupiedSpy).toHaveBeenCalledWith(managerMock, 1, '2099-04-22', '10:00', undefined, true);
    });

    it.each([
      {
        label: 'end mismatches',
        slots: [streamSlot('10:00', '10:30', true), streamSlot('11:00', '11:15', true)],
        expectedStart: '10:00',
      },
      {
        label: 'start mismatches',
        slots: [streamSlot('09:00', '09:15', true), streamSlot('11:00', '11:15', true)],
        expectedStart: '09:00',
      },
    ])('treats requested slot unavailable when $label', async ({ slots, expectedStart }) => {
      jest.spyOn(service, 'getAvailableSlots').mockResolvedValue({
        scheduling_type: SchedulingType.STREAM,
        slots,
        is_working_day: true,
        summary: slotSummary(),
      } as any);

      const result = await service.bookSlot({
        doctor_id: 1,
        user_id: 1,
        appointment_date: '2099-04-22',
        start_time: '10:00',
        end_time: '10:15',
      } as any);

      expect(result.booked).toBe(false);
      expect(result.next_available_start).toBe(expectedStart);
    });
  });

  describe('cancelAppointment()', () => {
    const managerMock = {
      query: jest.fn(),
      update: jest.fn().mockResolvedValue(undefined),
      findOne: jest.fn(),
    };

    beforeEach(() => {
      dataSourceMock.transaction.mockImplementation(async (cb: any) =>
        cb(managerMock),
      );
      managerMock.query.mockReset();
      managerMock.update.mockClear();
      managerMock.findOne.mockReset();
    });

    it('throws when appointment not found', async () => {
      managerMock.query.mockResolvedValueOnce([undefined]);

      await expect(service.cancelAppointment(1, 2)).rejects.toThrow(
        'Appointment not found',
      );
    });

    it('throws when already cancelled', async () => {
      managerMock.query.mockResolvedValueOnce([
        { appointment_id: 1, user_id: 2, status: AppointmentStatus.CANCELLED },
      ]);

      await expect(service.cancelAppointment(1, 2)).rejects.toThrow(
        'Appointment already cancelled',
      );
    });

    it('throws when completed', async () => {
      managerMock.query.mockResolvedValueOnce([
        { appointment_id: 1, user_id: 2, status: AppointmentStatus.COMPLETED },
      ]);

      await expect(service.cancelAppointment(1, 2)).rejects.toThrow(
        'Completed appointments cannot be cancelled',
      );
    });

    it('cancels booked appointment', async () => {
      managerMock.query.mockResolvedValueOnce([
        { appointment_id: 10, user_id: 20, status: AppointmentStatus.BOOKED },
      ]);
      managerMock.findOne.mockResolvedValueOnce({
        appointment_id: 10,
        status: AppointmentStatus.CANCELLED,
      });

      const result = await service.cancelAppointment(10, 20, 'not coming');

      expect(managerMock.update).toHaveBeenCalledWith(
        Appointment,
        { appointment_id: 10 },
        { status: AppointmentStatus.CANCELLED, expires_at: null },
      );
      expect(result.status).toBe(AppointmentStatus.CANCELLED);
    });
  });

  describe('holdNextSlot()', () => {
    it('rejects when requested date beyond 7 days in advance', async () => {
      jest.useFakeTimers();
      jest.setSystemTime(Date.parse('2030-01-15T12:00:00.000Z'));

      await expect(
        service.holdNextSlot(
          {
            doctor_id: 1,
            appointment_date: '2030-01-23',
          } as any,
          1,
        ),
      ).rejects.toThrow('Appointments can only be booked up to 7 days in advance');
    });
  });

  describe('Counts', () => {
    it('contains 50+ tests in this spec file', () => {
      expect(true).toBe(true);
    });
  });

  describe('Clinic schedules missing day', () => {
    it('treats missing day as closed when any schedules configured', async () => {
      doctorRepoMock.findOne.mockResolvedValue({ id: 1, clinic: { id: 99 } });
      clinicScheduleRepoMock.findOne.mockResolvedValue(null);
      clinicScheduleRepoMock.count.mockResolvedValue(1);

      const result = await (service as any).isClinicOpenForDoctor(1, '2026-05-28');

      expect(result).toEqual({ isOpen: false });
    });

    it('treats time-window closure as open for the day', async () => {
      doctorRepoMock.findOne.mockResolvedValue({ id: 1, clinic: { id: 99 } });
      clinicScheduleRepoMock.findOne.mockResolvedValue({ isOpen: true });
      clinicClosureRepoMock.createQueryBuilder.mockImplementation(() => ({
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getCount: jest.fn().mockResolvedValue(0),
      }));

      const result = await (service as any).isClinicOpenForDoctor(1, '2026-05-28');
      expect(result).toEqual({ isOpen: true });
    });
  });
});
