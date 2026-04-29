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
import { Doctors } from '../doctors/entity/doctor.entity';
import { Appointment } from './entities/appointment.entity';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { HoldNextAppointmentDto } from './dto/hold-next-appointment.dto';
import { Patients } from '../patients/entities/patient.entity';
import { ConsultingTime } from '../consulting-time/entity/consultingTime.entity';
import { CustomAvailability } from '../consulting-time/entity/custom_availability.entity';
import { ClinicSchedule } from '../leave-management/entities/clinicSchedule.entity';
import { ClinicClosure } from '../leave-management/entities/clinicClosure.entity';
import { DoctorLeave } from '../leave-management/entities/DoctorLeave.entity';
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

type UnavailabilityReason =
  | 'SLOTS_FULL'
  | 'CONSULTING_OVER'
  | 'DOCTOR_ON_LEAVE'
  | 'CLINIC_CLOSED'
  | 'DOCTOR_NOT_WORKING'
  | null;

const HOLD_MINUTES = 5;
const HOLD_SEARCH_DAYS = 30;
const NEXT_AVAILABILITY_DEFAULT_MAX_DAYS = 30;

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
    @InjectRepository(Doctors)
    private readonly doctorRepo: Repository<Doctors>,

    @InjectRepository(ClinicSchedule)
    private readonly clinicScheduleRepo: Repository<ClinicSchedule>,

    @InjectRepository(ClinicClosure)
    private readonly clinicClosureRepo: Repository<ClinicClosure>,

    @InjectRepository(DoctorLeave)
    private readonly doctorLeaveRepo: Repository<DoctorLeave>,
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
async findBestAvailableSlot(
  doctorId: number,
  requestedDate: string,
  requestedStart?: string,
  requestedEnd?: string,
) {

  const today =
    await this.getAvailableSlots(
      doctorId,
      requestedDate,
    );

  const isWave =
    today.scheduling_type ===
    SchedulingType.WAVE;

  const leaveAdjustedDate = await this.getNextDateIfOnFullDayLeave(
    doctorId,
    requestedDate, 
  );
  console.log("9:",leaveAdjustedDate)
  if (leaveAdjustedDate !== requestedDate) {
    const next = await this.getSlotsWithNextAvailable(
      doctorId,
      leaveAdjustedDate,
      undefined,
    );
    if (!next || !next.available_slots.length) {
      throw new BadRequestException(next?.message || 'No future slots available');
    }
    const first = next.available_slots[0];
    return { date: next.date, start: first.start, end: first.end };
  }

  let minStartAfterLeave: string | undefined;

if (
  requestedStart &&
  requestedEnd &&
  !isWave
) {
  minStartAfterLeave =
    await this.getMinStartAfterPartialLeave(
      doctorId,
      requestedDate,
      requestedStart,
      requestedEnd
    );
}

if (minStartAfterLeave) {

  // First try same-day slot after leave ends
  const afterLeaveSlot =
   (today.slots as StreamSlot[])
    .filter(s => s.available)
    .find(
      s =>
      this.toMinutes(s.start) >=
      this.toMinutes(minStartAfterLeave)
    );

  if (afterLeaveSlot) {
    return {
      date: requestedDate,
      start: afterLeaveSlot.start,
      end: afterLeaveSlot.end
    };
  }

  // No same-day slot exists after leave
  // Search future days
  const next =
   await this.getSlotsWithNextAvailable(
      doctorId,
      this.addDays(requestedDate,1), // start tomorrow
      30
   );

  if (
    next &&
    next.available_slots.length
  ) {

    const first =
      next.available_slots[0];

    return {
      date: next.date,
      start: first.start,
      end: first.end
    };
  }

  throw new BadRequestException(
    'No future slots available'
  );
}

  // ---------------------------------
  // exact requested slot
  // ---------------------------------

  if (
    requestedStart &&
    requestedEnd &&
    !isWave
  ) {

    const exact =
      (today.slots as StreamSlot[])
      .find(
        s =>
          s.start === requestedStart &&
          s.end === requestedEnd &&
          s.available,
      );

    if (exact) {
      return {
        date: requestedDate,
        start: exact.start,
        end: exact.end,
      };
    }
  }

  if (isWave) {

    const wave =
      today.slots[0] as WaveSlot;

    if (
      wave &&
      wave.available_spots > 0
    ) {

      return {
        date: requestedDate,
        start: wave.start,
        end: wave.end,
      };
    }
  }

  // ---------------------------------
  // same day different time
  // ---------------------------------

  if (!isWave) {

const sameDayOther =
 (today.slots as StreamSlot[])
   .filter(s => s.available)
   .filter(s =>
      !minStartAfterLeave ||
      this.toMinutes(s.start) >= this.toMinutes(minStartAfterLeave)
   )
   .sort((a,b)=>
      this.toMinutes(a.start)-this.toMinutes(b.start)
   )[0];
    if (sameDayOther) {

      return {
        date: requestedDate,
        start:
          sameDayOther.start,
        end:
          sameDayOther.end,
      };
    }
  }

  const next =
    await this.getSlotsWithNextAvailable(
      doctorId,
      requestedDate,
      undefined,
    );

  if (
    !next ||
    !next.available_slots.length
  ) {
    throw new BadRequestException(
      next?.message || 'No future slots available',
    );
  }

  // prefer same time on future day
  if (
    requestedStart &&
    requestedEnd
  ) {

    const sameTimeFuture =
      next.available_slots.find(
        s =>
          s.start === requestedStart &&
          s.end === requestedEnd,
      );

    if (sameTimeFuture) {

      return {
        date: next.date,
        start:
          sameTimeFuture.start,
        end:
          sameTimeFuture.end,
      };
    }
  }

  // fallback first available

  const first =
    next.available_slots[0];

  return {
    date: next.date,
    start: first.start,
    end: first.end,
  };
}
private getTodayDate(): string {
  const today = new Date();

  const year = today.getFullYear();

  const month = String(
    today.getMonth() + 1
  ).padStart(2,'0');

  const day = String(
    today.getDate()
  ).padStart(2,'0');

  return `${year}-${month}-${day}`;
}

private async afterLeaveSlotAvailable(
 doctorId:number,
 date:string
):Promise<boolean>{

 const leave =
  await this.doctorLeaveRepo.findOne({
    where:{
      doctor:{id:doctorId},
      startDate:date,
      isFullDay:false
    }
 });
 console.log("12:",leave)

 const consulting =
  await this.consultingRepo.findOne({
    where:{
      doctor:{id:doctorId}
    }
 });

 if(!consulting) return false;

 const slotDuration=
   consulting.slotDuration;

 const toMinutes=(t:string)=>{
   const [h,m]=t.split(':').map(Number);
   return h*60+m;
 };

 const consultStart=
   toMinutes(consulting.startTime);

 const consultEnd=
   toMinutes(consulting.endTime);

 // current time if booking today
 const now = new Date();

 const currentMinutes=
   now.getHours()*60+
   now.getMinutes();

 let availableSlots:number[]=[];

 // generate all slots
 for(
   let t=consultStart;
   t+slotDuration<=consultEnd;
   t+=slotDuration
 ){
   availableSlots.push(t);
 }

 // remove expired slots
 if(date===this.getTodayDate()){
   availableSlots=
    availableSlots.filter(
      s => s > currentMinutes
    );
 }

 // remove slots inside leave
 if(leave){
   const leaveStart=
    toMinutes(leave.startTime!);

   const leaveEnd=
    toMinutes(leave.endTime!);

   availableSlots=
    availableSlots.filter(
      s =>
       s < leaveStart ||
       s >= leaveEnd
    );
 }

 return availableSlots.length>0;
}
  private async getNextDateIfOnFullDayLeave(
  doctorId:number,
  date:string
){
  const leaves =
   await this.getDoctorLeavesForDate(
      doctorId,
      date
   );

  const fullDay =
   leaves.filter(
      l => l.isFullDay
   );

  // no full-day leave
  if(fullDay.length===0){
    console.log("ok1")

    const hasSlots =
      await this.afterLeaveSlotAvailable(
         doctorId,
         date
      );
    
    if(hasSlots){
      console.log("ok2")
      return date;
    }else{
      return this.addDays(date,1); // next day
    }
  }

  // full-day leave exists
  const latestEndDate =
    fullDay
      .map(l=>l.endDate)
      .sort()
      .at(-1);

  if(!latestEndDate){
    return date;
  }

  return this.addDays(
    latestEndDate,
    1
  );
}

  private async getMinStartAfterPartialLeave(
    doctorId: number,
    date: string,
    requestedStart: string,
    requestedEnd: string,
  ) {
    const leaves = await this.getDoctorLeavesForDate(doctorId, date);
    const partialLeaves = leaves.filter((l) => !l.isFullDay);
    if (partialLeaves.length === 0) return undefined;

    const overlaps = partialLeaves.filter((l) =>
      this.slotOverlapsLeave(requestedStart, requestedEnd, l),
    );
    if (overlaps.length === 0) return undefined;

    const latestLeaveEnd = overlaps
      .map((l) => (l.endTime ? this.normalizeTime(l.endTime) : undefined))
      .filter((t): t is string => Boolean(t))
      .sort()
      .at(-1);

    if (!latestLeaveEnd) return undefined;
    return latestLeaveEnd > requestedStart ? latestLeaveEnd : requestedStart;
  }
async bookSlot(
 dto: CreateAppointmentDto
) {

 return this.dataSource.transaction(
  async (manager) => {
   const {doctor_id,appointment_date,start_time,end_time} = dto;
   console.log("log id:",doctor_id)
  const appointmentDateTime = new Date(`${appointment_date}T${start_time}:00`);
  const now = new Date();
if (appointmentDateTime < now) {
  throw new BadRequestException(
    'Cannot book appointment in the past'
  );
}
   const existingSameDay =
    await this.appointmentRepo.findOne({
      where:{
        user:{ id:dto.user_id },
        doctor:{ id:doctor_id },
        appointment_date,
        status: AppointmentStatus.BOOKED
      }
    });
     if (existingSameDay) {
    throw new ConflictException(
      `you already book appointment for ${appointment_date}`
    );
   }
   const current =
    await this.getAvailableSlots(
      doctor_id,
      appointment_date,
    );
    console.log("6:", current)

   const dateAvailability = await this.getDateAvailability(
     doctor_id,
     appointment_date,
     current.is_working_day,
   );
   const isWave =
    current.scheduling_type ===
    SchedulingType.WAVE;
   let requestedAvailable=false;
   if (!isWave) {
    requestedAvailable =
      (current.slots as StreamSlot[])
      .some(
        s =>
         s.start===start_time &&
         s.end===end_time &&
         s.available
      );
   }
   if (isWave) {
    const wave = current.slots[0] as WaveSlot;
    requestedAvailable =
      wave.available_spots > 0;
   }

   if (dateAvailability.reason === 'CONSULTING_OVER') {
     requestedAvailable = false;
   }
if (!requestedAvailable) {
  if (dateAvailability.reason === 'CONSULTING_OVER') {
    const nextDay = this.addDays(appointment_date, 1);
    const next = await this.getSlotsWithNextAvailable(doctor_id, nextDay, undefined);
    if (!next || !next.available_slots.length) {
      throw new BadRequestException(next?.message || 'No future slots available');
    }
    const first = next.available_slots[0];
    const tokenNo = await this.getTokenNummber(doctor_id, next.date);
    const reportTime = await this.getRepporting(doctor_id, first.start);
    return {
      booked: false,
      message: this.formatNextAvailableMessage('CONSULTING_OVER', next.date, first.start),
      next_available_date: next.date,
      next_available_start: first.start,
      next_available_end: first.end,
      estimatedTokenNo: tokenNo,
      estimatedReportingTime: reportTime,
    };
  }

  const best = await this.findBestAvailableSlot(
    doctor_id,
    appointment_date,
    start_time,
    end_time,
  );
console.log("be:",best)
  const tokenNo = await this.getTokenNummber(doctor_id, best.date);
  const reportTime = await this.getRepporting(doctor_id, best.start);
  const reason =
    best.date === appointment_date
      ? null
      : await this.getUnavailabilityReason(
          doctor_id,
          appointment_date,
          current.is_working_day,
        );
console.log("hi",best.date)
  return {
    booked: false,
    message: this.formatNextAvailableMessage(reason, best.date, best.start),
    re:"ok",
    next_available_date: best.date,
    next_available_start: best.start,
    next_available_end: best.end,
    estimatedTokenNo: tokenNo,
    estimatedReportingTime: reportTime,
  };
}
   const occupied =
    await this.getOccupiedSlotCount(
      manager,
      doctor_id,
      appointment_date,
      start_time,
      undefined,
      true,
    );

   if (!isWave && occupied>0) {
     throw new ConflictException(
      'Slot already booked'
     );
   }
   if (isWave) {
    const wave =
      current.slots[0] as WaveSlot;
    if (
      occupied >=
      wave.capacity
    ) {
      throw new ConflictException(
       'Wave full'
      );
    }
   }
   const tokenno= await this.getTokenNummber(doctor_id,appointment_date)
   const reportingTime = await this.getRepporting(doctor_id,start_time)
   const appointment =
    await manager.save(
      manager.create(
        Appointment,
        {
          ...dto,
          doctor:{
            id:doctor_id
          },
          tokenNo:tokenno,
          reportTime:reportingTime,
          user:{
            id:dto.user_id
          },
          patient:
            dto.patient_id
            ? ({
                patient_id:
                dto.patient_id
              } as Patients)
            : undefined,
          status:
            AppointmentStatus.BOOKED,
          expires_at:null,
        }
      )
    );

   return {
     booked:true,
     TokenNo:tokenno,
     appointmentId:appointment.appointment_id,
     reportingTime: reportingTime,
     booked_date:appointment_date,
     booked_start:start_time,
     booked_end: end_time,
     appointment
   };

  }
 );
}
async getRepporting(doctorId:number,startTime:string){
  const doctor = await this.doctorRepo.findOne({
  where: { id: doctorId },
  select: {
    reportBefore: true
  }
});
const reportBefore = doctor?.reportBefore;
   const [hours, minutes] = startTime.split(':').map(Number);
  const date = new Date();
  date.setHours(hours, minutes - (reportBefore ?? 15), 0);
  return date.toTimeString().slice(0,5);

}
 async getTokenNummber(doctorId:number,appointment_date:string){
   const lastAppointment = await this.appointmentRepo.findOne({
   where: {
     doctor: { id: doctorId },
     appointment_date:appointment_date,
   },
   select: {
     appointment_id: true,
     tokenNo: true
   },
   order: {
     tokenNo: 'DESC'
   }
 });
 const lastTokenNumber= lastAppointment?.tokenNo
   return  (lastTokenNumber ?? 0) +1
 }
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
    `User already has appointment for ${startDate} `
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
      `No appointments available in the next 3 days. Please contact clinic.`,
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
    console.log("1")
    const clinicOpen = await this.isClinicOpenForDoctor(doctorId, date);
    if (!clinicOpen.isOpen) {
      return {
        scheduling_type: SchedulingType.STREAM,
        slots: [],
        is_working_day: true,
        summary: { total_slots: 0, booked_slots: 0, available_slots: 0 },
      };
    }
     console.log("2:",date)
  
    if (await this.isDoctorOnLeaveFullDay(doctorId, date)) {
      console.log("3")
      return {
        scheduling_type: SchedulingType.STREAM,
        slots: [],
        is_working_day: true,
        summary: { total_slots: 0, booked_slots: 0, available_slots: 0 },
      };
    }
    const custom = await this.customRepo.findOne({
      where: {
        doctor: { id: doctorId },
        date,
      },
    });
    console.log("ecust",custom)

    if (custom) {
      let slots = await this.handleStream(
        custom.startTime,
        custom.endTime,
        custom.slotDuration,
        doctorId,
        date,
      );

      slots = await this.applyDoctorLeaveToStreamSlots(doctorId, date, slots);
      console.log("5",slots)
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
    console.log("consul:",consultingList)


    const matchedList = consultingList.filter((c) =>
      c.days?.some((d) => d.day === dayName),
    );
     console.log("7:",matchedList)
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
        let slots = await this.handleStream(
          matched.startTime,
          matched.endTime,
          matched.slotDuration,
          doctorId,
          date,
        );
        slots = await this.applyDoctorLeaveToStreamSlots(doctorId, date, slots);
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
        const filtered = await this.applyDoctorLeaveToWaveSlots(doctorId, date, slots);
        results.push(...filtered);
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
    const todayAvailableSlots = this.filterAvailableSlots(
      todayResult.slots,
      todayResult.scheduling_type,
    );

    const todayAvailability = await this.getDateAvailability(
      doctorId,
      startDate,
      todayResult.is_working_day,
    );

    if (todayAvailableSlots.length > 0 && todayAvailability.reason !== 'CONSULTING_OVER') {
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
      const candidateAvailableSlots = this.filterAvailableSlots(
        candidate.slots,
        candidate.scheduling_type,
      );

      if (candidateAvailableSlots.length === 0) {
        continue;
      }

      const isToday = startDate === today;
      const reason = await this.getUnavailabilityReason(
        doctorId,
        startDate,
        todayResult.is_working_day,
      );
      const message = isToday
        ? this.formatNextAvailableMessage(reason, candidateDate)
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

  private filterAvailableSlots(slots: Slot[], schedulingType: SchedulingType) {
    return slots.filter((slot) => this.slotHasAvailability(slot, schedulingType));
  }

  private async getDateAvailability(
    doctorId: number,
    date: string,
    isDoctorWorkingDay?: boolean,
  ) {
    const [clinicOpen, consultingOver, doctorOnLeave] = await Promise.all([
      this.isClinicOpenForDoctor(doctorId, date),
      this.isConsultingTimeOver(doctorId, date),
      this.isDoctorOnLeaveFullDay(doctorId, date),
    ]);

    const resolvedIsDoctorWorkingDay =
      isDoctorWorkingDay ?? (await this.isDoctorWorkingDay(doctorId, date));

    const isClinicOpen = clinicOpen.isOpen;

    const reason = !isClinicOpen
      ? ('CLINIC_CLOSED' as const)
      : !resolvedIsDoctorWorkingDay
        ? ('DOCTOR_NOT_WORKING' as const)
        : doctorOnLeave
          ? ('DOCTOR_ON_LEAVE' as const)
          : consultingOver
            ? ('CONSULTING_OVER' as const)
            : null;

    return {
      isClinicOpen,
      isDoctorWorkingDay: resolvedIsDoctorWorkingDay,
      doctorOnLeave,
      reason,
    } as const;
  }

  private async getUnavailabilityReason(
    doctorId: number,
    date: string,
    isDoctorWorkingDay?: boolean,
  ): Promise<UnavailabilityReason> {
    const availability = await this.getDateAvailability(doctorId, date, isDoctorWorkingDay);
    if (availability.reason) return availability.reason;

    const slots = await this.getAvailableSlots(doctorId, date);
    const anyAvailable =
      this.filterAvailableSlots(slots.slots, slots.scheduling_type).length > 0;
    return anyAvailable ? null : 'SLOTS_FULL';
  }

  private formatNextAvailableMessage(
    reason: UnavailabilityReason,
    nextDate: string,
    nextTime?: string,
  ) {
    const timeSuffix = nextTime ? ` at ${nextTime}` : '';
    switch (reason) {
      case null:
        return `Requested slot unavailable. Next available slot is on ${nextDate}${timeSuffix}.`;
      case 'CONSULTING_OVER':
        return `Consultation hours are over. Next available slot is on ${nextDate}${timeSuffix}.`;
      case 'DOCTOR_ON_LEAVE':
        return `Doctor is unavailable on selected date. Next available slot is on ${nextDate}${timeSuffix}.`;
      case 'CLINIC_CLOSED':
        return `Clinic is closed on selected date. Next available slot is on ${nextDate}${timeSuffix}.`;
      case 'DOCTOR_NOT_WORKING':
        return `Doctor is unavailable on selected date. Next available slot is on ${nextDate}${timeSuffix}.`;
      case 'SLOTS_FULL':
      default:
        return `Today’s appointments are fully booked. Next available slot is on ${nextDate}${timeSuffix}.`;
    }
  }

  private async isDoctorWorkingDay(doctorId: number, date: string) {
    const dayName = getDayName(date);
    const consultingList = await this.consultingRepo.find({
      where: { doctor: { id: doctorId } },
      relations: ['days'],
    });
    return consultingList.some((c) => c.days?.some((d) => d.day === dayName));
  }

  private async isConsultingTimeOver(doctorId: number, date: string) {
    const now = new Date();
    const today = this.toDateString(now);
    if (date !== today) return false;

    const dayName = getDayName(date);
    const consultingList = await this.consultingRepo.find({
      where: { doctor: { id: doctorId } },
      relations: ['days'],
    });
    const matched = consultingList.filter((c) => c.days?.some((d) => d.day === dayName));
    if (matched.length === 0) return false;

    const latestEnd = matched
      .map((m) => this.normalizeTime(m.endTime))
      .sort()
      .at(-1);

    if (!latestEnd) return false;
    const currentTime = now.toTimeString().slice(0, 5);
    return currentTime >= latestEnd;
  }

  private async isClinicOpenForDoctor(doctorId: number, date: string) {
    const doctor = await this.doctorRepo.findOne({
      where: { id: doctorId },
      relations: ['clinic'],
    });

    const clinicId = doctor?.clinic?.id;
    if (!clinicId) return { isOpen: true as const };

    const dayOfWeek = new Date(`${date}T00:00:00.000Z`).getUTCDay();
    const schedule = await this.clinicScheduleRepo.findOne({
      where: { clinic: { id: clinicId }, dayOfWeek },
    });

    // Backwards compatible: if schedules not configured, treat clinic as open.
    if (!schedule) return { isOpen: true as const };
    if (!schedule.isOpen) return { isOpen: false as const };

    const startOfDay = new Date(`${date}T00:00:00.000Z`);
    const endOfDay = new Date(`${date}T23:59:59.999Z`);

    const closureCount = await this.clinicClosureRepo
      .createQueryBuilder('c')
      .where('c.clinicId = :clinicId', { clinicId })
      .andWhere('c.startDateTime <= :endOfDay', { endOfDay })
      .andWhere('c.endDateTime >= :startOfDay', { startOfDay })
      .getCount();

    return { isOpen: closureCount === 0 } as const;
  }

  private async isDoctorOnLeaveFullDay(doctorId: number, date: string) {
    const qb = this.doctorLeaveRepo
      .createQueryBuilder('l')
      .where('l.doctor = :doctorId', { doctorId })
      .andWhere(':date BETWEEN l.startDate AND l.endDate', { date })
      .andWhere('l.isFullDay = true');

    return (await qb.getCount()) > 0;
  }

  private async applyDoctorLeaveToStreamSlots(
    doctorId: number,
    date: string,
    slots: StreamSlot[],
  ) {
    const leaves = await this.getDoctorLeavesForDate(doctorId, date);
    if (leaves.length === 0) return slots;
    if (leaves.some((l) => l.isFullDay)) return [];

   return slots.filter((s) => {

  const blocked = leaves.some((l) => {
    if (l.isFullDay) return true;

    if (!l.startTime || !l.endTime) {
      return false;
    }

    const slotStart = this.toMinutes(this.normalizeTime(s.start));
    const slotEnd   = this.toMinutes(this.normalizeTime(s.end));

    const leaveStart = this.toMinutes(
      this.normalizeTime(String(l.startTime))
    );

    const leaveEnd = this.toMinutes(
      this.normalizeTime(String(l.endTime))
    );

    return slotStart < leaveEnd &&
           slotEnd > leaveStart;
  });

  return !blocked;
});
  }

  private async applyDoctorLeaveToWaveSlots(
    doctorId: number,
    date: string,
    slots: WaveSlot[],
  ) {
    const leaves = await this.getDoctorLeavesForDate(doctorId, date);
    if (leaves.length === 0) return slots;
    if (leaves.some((l) => l.isFullDay)) return [];

    return slots.filter((s) => !leaves.some((l) => this.slotOverlapsLeave(s.start, s.end, l)));
  }

  private async getDoctorLeavesForDate(doctorId: number, date: string) {
    return this.doctorLeaveRepo
      .createQueryBuilder('l')
      .where('l.doctor = :doctorId', { doctorId })
      .andWhere(':date BETWEEN l.startDate AND l.endDate', { date })
      .getMany();
      
  }

  private slotOverlapsLeave(start: string, end: string, leave: DoctorLeave) {
    if (leave.isFullDay) return true;
    if (!leave.startTime || !leave.endTime) return false;

    const slotStart = this.toMinutes(start);
    const slotEnd = this.toMinutes(end);
    const leaveStart = this.toMinutes(this.normalizeTime(leave.startTime));
    const leaveEnd = this.toMinutes(this.normalizeTime(leave.endTime));

    return slotStart < leaveEnd && slotEnd > leaveStart;
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
