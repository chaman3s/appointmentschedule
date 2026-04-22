import { AppointmentsService } from './appointments.service';
import { SchedulingType } from '../common/enums/appointment.enum';

describe('AppointmentsService', () => {
  let service: AppointmentsService;

  beforeEach(async () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-04-22T10:00:00.000Z').getTime());

    service = new AppointmentsService(
      {} as any,
      {} as any,
      {} as any,
      {} as any,
    );
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('returns same-day slots when available', async () => {
    jest.spyOn(service, 'getAvailableSlots').mockResolvedValue({
      scheduling_type: SchedulingType.STREAM,
      slots: [
        { start: '10:00', end: '10:15', available: false },
        { start: '10:15', end: '10:30', available: true },
      ],
    });

    const result = await service.getSlotsWithNextAvailable(1, '2026-04-22', 3);

    expect(result.date).toBe('2026-04-22');
    expect(result.message).toBeUndefined();
    expect(result.available_slots).toEqual([
      { start: '10:15', end: '10:30', available: true },
    ]);
  });

  it('returns next available day when today is full', async () => {
    const getAvailableSlots = jest
      .spyOn(service, 'getAvailableSlots')
      .mockImplementation(async (_doctorId, date) => {
        if (date === '2026-04-22') {
          return {
            scheduling_type: SchedulingType.STREAM,
            slots: [{ start: '10:00', end: '10:15', available: false }],
          };
        }
        if (date === '2026-04-23') {
          return {
            scheduling_type: SchedulingType.STREAM,
            slots: [],
          };
        }
        return {
          scheduling_type: SchedulingType.STREAM,
          slots: [{ start: '11:00', end: '11:15', available: true }],
        };
      });

    const result = await service.getSlotsWithNextAvailable(1, '2026-04-22', 3);

    expect(getAvailableSlots).toHaveBeenCalledTimes(3);
    expect(result.date).toBe('2026-04-24');
    expect(result.message).toBe(
      'No appointments available today. Next available appointment is on 2026-04-24.',
    );
    expect(result.available_slots).toEqual([
      { start: '11:00', end: '11:15', available: true },
    ]);
  });

  it('returns fallback message when no availability in window', async () => {
    jest.spyOn(service, 'getAvailableSlots').mockResolvedValue({
      scheduling_type: SchedulingType.STREAM,
      slots: [{ start: '10:00', end: '10:15', available: false }],
    });

    const result = await service.getSlotsWithNextAvailable(1, '2026-04-22', 2);

    expect(result.date).toBe('2026-04-22');
    expect(result.available_slots).toEqual([]);
    expect(result.message).toBe(
      'No appointments available in the next 2 days. Please contact clinic.',
    );
  });
});
