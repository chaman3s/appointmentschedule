import {
  Injectable,
  BadRequestException,
  ConflictException,
  NotFoundException,
  ForbiddenException,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';

import { InjectRepository } from '@nestjs/typeorm';
import {
  Repository,
  DataSource,
  EntityManager,
  SelectQueryBuilder,
} from 'typeorm';

import { Appointment } from './entities/appointment.entity';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { HoldNextAppointmentDto } from './dto/hold-next-appointment.dto';
import { Patients } from '../patients/entities/patient.entity';
import { ConsultingTime } from '../consulting-time/entity/consultingTime.entity';
import { CustomAvailability } from '../consulting-time/entity/custom_availability.entity';
import {
  SchedulingType,
  AppointmentStatus,
} from '../common/enums/appointment.enum';
import { getDayName } from '../../utils/index';

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
  is_full: boolean;
};

type Slot = StreamSlot | WaveSlot;

type SlotSummary = {
  total_slots: number;
  booked_slots: number;
  available_slots: number;
};

const HOLD_MINUTES = 5;
const HOLD_SEARCH_DAYS = 30;
const NEXT_AVAILABILITY_DEFAULT_MAX_DAYS = 3;

@Injectable()
export class AppointmentsService implements OnModuleInit, OnModuleDestroy {
  private reservationCleanupTimer?: ReturnType<typeof setInterval>;

  constructor(
    @InjectRepository(Appointment)
    private readonly appointmentRepo: Repository<Appointment>,

    @InjectRepository(ConsultingTime)
    private readonly consultingRepo: Repository<ConsultingTime>,

    @InjectRepository(CustomAvailability)
    private readonly customRepo: Repository<CustomAvailability>,

    private readonly dataSource: DataSource,
  ) {}

  onModuleInit() {
    void this.cleanupExpiredReservations();
    this.reservationCleanupTimer = setInterval(() => {
      void this.cleanupExpiredReservations();
    }, 60_000);
  }

  onModuleDestroy() {
    if (this.reservationCleanupTimer) {
      clearInterval(this.reservationCleanupTimer);
    }
  }

  // ================= BOOK SLOT =================
  async bookSlot(dto: CreateAppointmentDto) {
    const { doctor_id, appointment_date, start_time, end_time } = dto;

    return this.dataSource.transaction(async (manager) => {
      const { scheduling_type, slots } = await this.getAvailableSlots(
        doctor_id,
        appointment_date,
      );

      let finalStart = start_time;
      let finalEnd = end_time;

      const isWave = scheduling_type === SchedulingType.WAVE;

      // VALIDATION
      if (isWave) {
        const wave = slots[0] as WaveSlot;

        if (!wave || wave.available_spots <= 0) {
          throw new BadRequestException('Wave is full');
        }

        finalStart = wave.start;
        finalEnd = wave.end;
      } else {
        const slotExists = slots.some(
          (s: StreamSlot) =>
            s.start === start_time && s.end === end_time && s.available,
        );

        if (!slotExists) {
          throw new BadRequestException('Invalid slot');
        }
      }

      // STREAM LOCK
      if (!isWave) {
        const occupied = await this.getOccupiedSlotCount(
          manager,
          doctor_id,
          appointment_date,
          finalStart,
          undefined,
          true,
        );

        if (occupied > 0) {
          throw new ConflictException('Slot already booked');
        }
      }

      // WAVE CAPACITY
      if (isWave) {
        const wave = slots[0] as WaveSlot;
        const capacity = wave?.capacity || 1;

        const count = await this.getOccupiedSlotCount(
          manager,
          doctor_id,
          appointment_date,
          finalStart,
          undefined,
          true,
        );

        if (count >= capacity) {
          throw new ConflictException('Wave full');
        }
      }

      const appointment = manager.create(Appointment, {
        ...dto,
        doctor: { id: doctor_id },
        user: { id: dto.user_id },
        patient: dto.patient_id
          ? ({ patient_id: dto.patient_id } as Patients)
          : undefined,
        start_time: finalStart,
        end_time: finalEnd,
        status: AppointmentStatus.BOOKED,
        expires_at: null,
      });

      return manager.save(appointment);
    });
  }

  // ================= HOLD NEXT SLOT =================
  async holdNextSlot(dto: HoldNextAppointmentDto, userId: number) {
    await this.cleanupExpiredReservations();

    const today = this.toDateString(new Date());
    const requestedDate = dto.appointment_date || today;
    const startDate = requestedDate < today ? today : requestedDate;

    const configuredMaxDays = Number(process.env.HOLD_NEXT_MAX_DAYS);
    const dtoMaxSearchDays = dto.max_search_days;
    const effectiveMaxDays = Math.max(
      1,
      Math.floor(
        Number.isFinite(dtoMaxSearchDays ?? Number.NaN)
          ? (dtoMaxSearchDays as number)
          : Number.isFinite(configuredMaxDays)
            ? configuredMaxDays
            : HOLD_SEARCH_DAYS,
      ),
    );
    const searchDays = Math.min(effectiveMaxDays, HOLD_SEARCH_DAYS);

    const existing = await this.appointmentRepo.findOne({
  where: {
    user: { id: userId },
    doctor: { id: dto.doctor_id },
    appointment_date: startDate,
    status: AppointmentStatus.BOOKED
  }
});

if (existing) {
  throw new ConflictException(
    'User already has appointment for this day'
  );
}
    for (let dayOffset = 0; dayOffset < searchDays; dayOffset += 1) {
      const date = this.addDays(startDate, dayOffset);
      const { scheduling_type, slots } = await this.getAvailableSlots(
        dto.doctor_id,
        date,
      );

      for (const slot of slots) {
        const isWave = scheduling_type === SchedulingType.WAVE;
        const hasAvailability = isWave
          ? (slot as WaveSlot).available_spots > 0
          : (slot as StreamSlot).available;

        if (!hasAvailability) {
          continue;
        }

        const reserved = await this.tryReserveSlot(
          dto,
          userId,
          date,
          slot,
          scheduling_type,
        );

        if (reserved) {
          return reserved;
        }
      }
    }

    throw new NotFoundException(
      `No appointments available in the next ${searchDays} days. Please contact clinic.`,
    );
  }

  private async tryReserveSlot(
    dto: HoldNextAppointmentDto,
    userId: number,
    appointmentDate: string,
    slot: Slot,
    schedulingType: SchedulingType,
  ) {
    return this.dataSource.transaction(async (manager) => {
      const isWave = schedulingType === SchedulingType.WAVE;
      const capacity = isWave ? (slot as WaveSlot).capacity : 1;
      const occupied = await this.getOccupiedSlotCount(
        manager,
        dto.doctor_id,
        appointmentDate,
        slot.start,
        undefined,
        true,
      );

      if ((!isWave && occupied > 0) || (isWave && occupied >= capacity)) {
        return null;
      }

      const expiresAt = new Date(Date.now() + HOLD_MINUTES * 60_000);
      const appointment = manager.create(Appointment, {
        ...dto,
        doctor: { id: dto.doctor_id },
        user: { id: userId },
        patient: dto.patient_id
          ? ({ patient_id: dto.patient_id } as Patients)
          : undefined,
        appointment_date: appointmentDate,
        start_time: slot.start,
        end_time: slot.end,
        scheduling_type: schedulingType,
        status: AppointmentStatus.RESERVED,
        expires_at: expiresAt,
        max_capacity: capacity,
      });

      return manager.save(appointment);
    });
  }

  // ================= CONFIRM BOOKING =================
  async confirmBooking(appointmentId: number, userId: number) {
    return this.dataSource.transaction(async (manager) => {
      const appointment = await manager
        .createQueryBuilder(Appointment, 'a')
        .leftJoinAndSelect('a.user', 'appointmentUser')
        .leftJoinAndSelect('a.doctor', 'doctor')
        .leftJoinAndSelect('a.patient', 'patient')
        .setLock('pessimistic_write', undefined, ['a'])
        .where('a.appointment_id = :appointmentId', { appointmentId })
        .getOne();

      if (!appointment) {
        throw new NotFoundException('Reservation not found');
      }

      if (appointment.user.id !== userId) {
        throw new ForbiddenException('Reservation belongs to another user');
      }

      if (appointment.status !== AppointmentStatus.RESERVED) {
        throw new BadRequestException('Slot is not reserved');
      }

      if (!appointment.expires_at || appointment.expires_at <= new Date()) {
        await manager.delete(Appointment, { appointment_id: appointmentId });
        throw new BadRequestException('Reservation expired');
      }

      appointment.status = AppointmentStatus.BOOKED;
      appointment.expires_at = null;

      return manager.save(appointment);
    });
  }

  // ================= RESCHEDULE =================
  async rescheduleAppointment(
    appointmentId: number,
    userId: number,
    newDate: string,
    newStartTime: string,
    newEndTime: string,
  ) {
    return this.dataSource.transaction(async (manager) => {
      const [appointment] = await manager.query(
        `SELECT * FROM appointments
         WHERE appointment_id = $1 AND user_id = $2
         FOR UPDATE`,
        [appointmentId, userId],
      );

      if (!appointment) {
        throw new NotFoundException('Appointment not found');
      }

      if (appointment.status !== AppointmentStatus.BOOKED) {
        throw new BadRequestException(
          'Only booked appointments can be rescheduled',
        );
      }

      const isAvailable = await this.checkSlotAvailability(
        manager,
        Number(appointment.doctor_id),
        newDate,
        newStartTime,
        appointment.scheduling_type,
        Number(appointment.max_capacity),
        Number(appointment.appointment_id),
      );

      if (!isAvailable) {
        throw new BadRequestException('Slot not available');
      }

      await manager.update(
        Appointment,
        { appointment_id: appointmentId },
        {
          appointment_date: newDate,
          start_time: newStartTime,
          end_time: newEndTime,
        },
      );

      return manager.findOne(Appointment, {
        where: { appointment_id: appointmentId },
        relations: ['doctor', 'patient', 'user'],
      });
    });
  }

  // ================= SLOT CHECK =================
  async checkSlotAvailability(
    manager: EntityManager,
    doctorId: number,
    date: string,
    startTime: string,
    type: SchedulingType,
    capacity: number,
    excludeId?: number,
  ) {
    const qb = manager
      .createQueryBuilder(Appointment, 'a')
      .where('a.doctor_id = :doctorId', { doctorId })
      .andWhere('a.appointment_date = :date', { date })
      .andWhere('a.start_time = :startTime', { startTime })
      .andWhere(
        '(a.status = :booked OR (a.status = :reserved AND a.expires_at > :now))',
        {
          booked: AppointmentStatus.BOOKED,
          reserved: AppointmentStatus.RESERVED,
          now: new Date(),
        },
      );

    if (excludeId) {
      qb.andWhere('a.appointment_id != :id', { id: excludeId });
    }

    qb.setLock('pessimistic_write');

    const appointments = await qb.getMany();
    const count = appointments.length;

    if (type === SchedulingType.STREAM) return count === 0;
    if (type === SchedulingType.WAVE) return count < capacity;

    return false;
  }

  async cleanupExpiredReservations() {
    await this.appointmentRepo
      .createQueryBuilder()
      .delete()
      .from(Appointment)
      .where('status = :status', { status: AppointmentStatus.RESERVED })
      .andWhere('expires_at <= :now', { now: new Date() })
      .execute();
  }

  private async getOccupiedSlotCount(
    manager: EntityManager,
    doctorId: number,
    date: string,
    startTime: string,
    excludeId?: number,
    lock = false,
  ) {
    const qb = manager
      .createQueryBuilder(Appointment, 'a')
      .where('a.doctor_id = :doctorId', { doctorId })
      .andWhere('a.appointment_date = :date', { date })
      .andWhere('a.start_time = :startTime', { startTime });

    this.addActiveStatusFilter(qb);

    if (excludeId) {
      qb.andWhere('a.appointment_id != :id', { id: excludeId });
    }

    if (lock) {
      qb.setLock('pessimistic_write');
    }

    return (await qb.getMany()).length;
  }

  private addActiveStatusFilter(
    qb: SelectQueryBuilder<Appointment>,
    alias = 'a',
  ) {
    qb.andWhere(
      `(${alias}.status = :booked OR (${alias}.status = :reserved AND ${alias}.expires_at > :now))`,
      {
        booked: AppointmentStatus.BOOKED,
        reserved: AppointmentStatus.RESERVED,
        now: new Date(),
      },
    );
  }

  // ================= ADD PATIENT =================
  async addPatient(appointmentId: number, patientId: number, userId: number) {
    const appointment = await this.appointmentRepo.findOne({
      where: { appointment_id: appointmentId },
      relations: ['user'],
    });

    if (!appointment) throw new NotFoundException();
    if (appointment.user.id !== userId) throw new ForbiddenException();

    appointment.patient = { patient_id: patientId } as Patients;

    return this.appointmentRepo.save(appointment);
  }

  // ================= GET SLOTS =================
  async getAvailableSlots(
    doctorId: number,
    date: string,
  ): Promise<{
    scheduling_type: SchedulingType;
    slots: Slot[];
    is_working_day: boolean;
    summary: SlotSummary;
  }> {
    await this.cleanupExpiredReservations();

    const custom = await this.customRepo.findOne({
      where: {
        doctor: { id: doctorId },
        date,
      },
    });

    if (custom) {
      const slots = await this.handleStream(
        custom.startTime,
        custom.endTime,
        custom.slotDuration,
        doctorId,
        date,
      );

      return {
        scheduling_type: SchedulingType.STREAM,
        slots,
        is_working_day: true,
        summary: this.summarizeSlots(slots, SchedulingType.STREAM),
      };
    }

    const dayName = getDayName(date);

    const consultingList = await this.consultingRepo.find({
      where: { doctor: { id: doctorId } },
      relations: ['days'],
    });

    const matchedList = consultingList.filter((c) =>
      c.days?.some((d) => d.day === dayName),
    );

    if (matchedList.length === 0) {
      return {
        scheduling_type: SchedulingType.STREAM,
        slots: [],
        is_working_day: false,
        summary: { total_slots: 0, booked_slots: 0, available_slots: 0 },
      };
    }

    const results: Slot[] = [];

    const scheduling_type =
      matchedList[0].scheduling_type === 'WAVE'
        ? SchedulingType.WAVE
        : SchedulingType.STREAM;

    for (const matched of matchedList) {
      if (scheduling_type === SchedulingType.STREAM) {
        const slots = await this.handleStream(
          matched.startTime,
          matched.endTime,
          matched.slotDuration,
          doctorId,
          date,
        );
        results.push(...slots);
      }

      if (scheduling_type === SchedulingType.WAVE) {
        const slots = await this.handleWave(
          matched.startTime,
          matched.endTime,
          matched.wave_capacity,
          doctorId,
          date,
        );
        results.push(...slots);
      }
    }

    results.sort((a, b) => a.start.localeCompare(b.start));

    return {
      scheduling_type,
      slots: results,
      is_working_day: true,
      summary: this.summarizeSlots(results, scheduling_type),
    };
  }

  // ================= NEXT AVAILABLE SLOTS =================
  async getSlotsWithNextAvailable(
    doctorId: number,
    date?: string,
    maxDays?: number,
  ): Promise<{
    requested_date: string;
    date: string;
    scheduling_type: SchedulingType;
    slots: Slot[];
    available_slots: Slot[];
    summary: SlotSummary;
    message?: string;
  }> {
    const today = this.toDateString(new Date());
    const requestedDate = date ?? today;

    if (!/^\d{4}-\d{2}-\d{2}$/.test(requestedDate)) {
      throw new BadRequestException('Invalid date format');
    }

    const parsedMaxDays =
      maxDays ??
      Number(process.env.NEXT_AVAILABLE_MAX_DAYS) ??
      NEXT_AVAILABILITY_DEFAULT_MAX_DAYS;

    const effectiveMaxDays = Number.isFinite(parsedMaxDays)
      ? Math.max(0, Math.floor(parsedMaxDays))
      : NEXT_AVAILABILITY_DEFAULT_MAX_DAYS;

    const startDate = requestedDate < today ? today : requestedDate;

    const todayResult = await this.getAvailableSlots(doctorId, startDate);
    const todayAvailableSlots = todayResult.slots.filter((slot) =>
      this.slotHasAvailability(slot, todayResult.scheduling_type),
    );

    if (todayAvailableSlots.length > 0) {
      return {
        requested_date: requestedDate,
        date: startDate,
        scheduling_type: todayResult.scheduling_type,
        slots: todayResult.slots,
        available_slots: todayAvailableSlots,
        summary: todayResult.summary,
      };
    }

    for (
      let dayOffset = 1;
      dayOffset <= effectiveMaxDays;
      dayOffset += 1
    ) {
      const candidateDate = this.addDays(startDate, dayOffset);
      const candidate = await this.getAvailableSlots(doctorId, candidateDate);
      const candidateAvailableSlots = candidate.slots.filter((slot) =>
        this.slotHasAvailability(slot, candidate.scheduling_type),
      );

      if (candidateAvailableSlots.length === 0) {
        continue;
      }

      const isToday = startDate === today;
      const message = isToday
        ? `No appointments available today. Next available appointment is on ${candidateDate}.`
        : `No appointments available on ${startDate}. Next available appointment is on ${candidateDate}.`;

      return {
        requested_date: requestedDate,
        date: candidateDate,
        scheduling_type: candidate.scheduling_type,
        slots: candidate.slots,
        available_slots: candidateAvailableSlots,
        summary: candidate.summary,
        message,
      };
    }

    return {
      requested_date: requestedDate,
      date: startDate,
      scheduling_type: todayResult.scheduling_type,
      slots: todayResult.slots,
      available_slots: [],
      summary: todayResult.summary,
      message: `No appointments available in the next ${effectiveMaxDays} days. Please contact clinic.`,
    };
  }

  private slotHasAvailability(slot: Slot, schedulingType: SchedulingType) {
    return schedulingType === SchedulingType.WAVE
      ? (slot as WaveSlot).available_spots > 0
      : (slot as StreamSlot).available;
  }

  private summarizeSlots(slots: Slot[], schedulingType: SchedulingType) {
    if (schedulingType === SchedulingType.WAVE) {
      const waves = slots as WaveSlot[];
      return waves.reduce<SlotSummary>(
        (acc, w) => ({
          total_slots: acc.total_slots + (w.capacity ?? 0),
          booked_slots: acc.booked_slots + (w.booked ?? 0),
          available_slots: acc.available_slots + (w.available_spots ?? 0),
        }),
        { total_slots: 0, booked_slots: 0, available_slots: 0 },
      );
    }

    const stream = slots as StreamSlot[];
    const availableSlots = stream.filter((s) => s.available).length;
    return {
      total_slots: stream.length,
      booked_slots: stream.length - availableSlots,
      available_slots: availableSlots,
    };
  }

  // ================= STREAM =================
  async handleStream(
    start: string,
    end: string,
    duration: number,
    doctorId: number,
    date: string,
  ): Promise<StreamSlot[]> {
    let slots: { start: string; end: string }[] = this.generateSlots(
      start,
      end,
      duration,
    );

    const now = new Date();
    const isToday = new Date(date).toDateString() === now.toDateString();

    if (isToday) {
      const currentTime = now.toTimeString().slice(0, 5);
      slots = slots.filter((s) => s.start > currentTime);
    }

    const bookingsQb = this.appointmentRepo
      .createQueryBuilder('a')
      .where('a.doctor_id = :doctorId', { doctorId })
      .andWhere('a.appointment_date = :date', { date });
    this.addActiveStatusFilter(bookingsQb);

    const bookings = await bookingsQb.getMany();
    const bookedSet = new Set(
      bookings.map((b) => this.normalizeTime(b.start_time)),
    );

    return slots.map((slot) => ({
      ...slot,
      available: !bookedSet.has(slot.start),
    }));
  }

  // ================= WAVE =================
  async handleWave(
    start: string,
    end: string,
    capacity: number,
    doctorId: number,
    date: string,
  ): Promise<WaveSlot[]> {
    const bookingsQb = this.appointmentRepo
      .createQueryBuilder('a')
      .where('a.doctor_id = :doctorId', { doctorId })
      .andWhere('a.appointment_date = :date', { date })
      .andWhere('a.start_time = :start', { start });
    this.addActiveStatusFilter(bookingsQb);

    const bookingsCount = await bookingsQb.getCount();

    const availableSpots = capacity - bookingsCount;

    return [
      {
        start,
        end,
        capacity,
        booked: bookingsCount,
        available_spots: Math.max(availableSpots, 0),
        is_full: bookingsCount >= capacity,
      },
    ];
  }

  // ================= UTIL =================
  generateSlots(
    start: string,
    end: string,
    duration: number,
  ): { start: string; end: string }[] {
    const slots: { start: string; end: string }[] = [];
    let current = this.toMinutes(start);
    const endMin = this.toMinutes(end);

    while (current + duration <= endMin) {
      slots.push({
        start: this.toTime(current),
        end: this.toTime(current + duration),
      });
      current += duration;
    }

    return slots;
  }
  toMinutes(time: string) {
    const [h, m] = time.split(':').map(Number);
    return h * 60 + m;
  }

  toTime(mins: number) {
    const h = Math.floor(mins / 60)
      .toString()
      .padStart(2, '0');
    const m = (mins % 60).toString().padStart(2, '0');
    return `${h}:${m}`;
  }

  private normalizeTime(time: string) {
    return time.slice(0, 5);
  }

  private toDateString(date: Date) {
    return date.toISOString().slice(0, 10);
  }

  private addDays(date: string, days: number) {
    const next = new Date(`${date}T00:00:00.000Z`);
    next.setUTCDate(next.getUTCDate() + days);
    return this.toDateString(next);
  }

  async getUserAppointments(userId: number) {
    const appointments = await this.appointmentRepo.find({
      where: {
        user: { id: userId },
      },
      relations: ['doctor', 'patient'],
      order: {
        appointment_date: 'DESC',
      },
    });
    const consultingTimes = await this.consultingRepo.find({
      relations: ['days', 'doctor'],
    });
    return appointments.map((appt) => {
      const dayName = getDayName(appt.appointment_date);
      const matched = consultingTimes.find(
        (ct) =>
          ct.doctor.id === appt.doctor.id &&
          ct.days?.some((d) => d.day === dayName) &&
          ct.startTime <= appt.start_time &&
          ct.endTime >= appt.end_time,
      );
      return {
        ...appt,
        scheduling_type: matched?.scheduling_type || null,
      };
    });
  }
  async getDoctorAppointments(doctorId: number) {
    const appointments = await this.appointmentRepo.find({
      where: {
        doctor: { id: doctorId },
      },
      relations: ['user', 'patient', 'doctor'],
      order: {
        appointment_date: 'DESC',
      },
    });

    // 🔷 fetch consulting times of this doctor only (optimized)
    const consultingTimes = await this.consultingRepo.find({
      where: {
        doctor: { id: doctorId },
      },
      relations: ['days'],
    });
    return appointments.map((appt) => {
      const dayName = getDayName(appt.appointment_date);
      // 🔍 find matching consulting time
      const matched = consultingTimes.find(
        (ct) =>
          ct.days?.some((d) => d.day === dayName) &&
          ct.startTime <= appt.start_time &&
          ct.endTime >= appt.end_time,
      );
      return {
        ...appt,
        scheduling_type: matched?.scheduling_type || null,
      };
    });
  }
}
