import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';

import { AppController } from '../src/app.controller';
import { AppService } from '../src/app.service';
import { Jwtguard } from '../src/modules/common/Guard/jwt.guard';
import { RolesGuard } from '../src/modules/common/Guard/roles.guard';

import { AuthController } from '../src/modules/auth/auth.Controller';
import { AuthServices } from '../src/modules/auth/auth.service';

import { UserController } from '../src/modules/users/user.Controller';
import { UserService } from '../src/modules/users/user.service';

import { DoctorController } from '../src/modules/doctors/doctor.Controller';
import { DoctorServices } from '../src/modules/doctors/doctor.service';

import { PatientController } from '../src/modules/patients/patients.controller';
import { PatientService } from '../src/modules/patients/patients.service';

import { AppointmentsController } from '../src/modules/appointments/appointments.controller';
import { AppointmentsService } from '../src/modules/appointments/appointments.service';

import { ConsultingTimeController } from '../src/modules/consulting-time/consulting-time.controller';
import { ConsultingTimeService } from '../src/modules/consulting-time/consulting-time.service';

import { UserDoctorController } from '../src/modules/userdoctor/user-doctor.controller';

import { HospitalController } from '../src/modules/hospital/hospital.controller';
import { HospitalService } from '../src/modules/hospital/hospital.service';

import { LeaveManagementController } from '../src/modules/leave-management/leave-management.controller';
import { LeaveManagementService } from '../src/modules/leave-management/leave-management.service';

import { ClinicController } from '../src/modules/leave-management/clinic.controller';
import { ClinicService } from '../src/modules/leave-management/clinic.service';

import { DoctorLeaveController } from '../src/modules/leave-management/doctor-leave.controller';
import { DoctorLeaveService } from '../src/modules/leave-management/doctor-leave.service';

import { WhatsappController } from '../src/modules/whatsapp/whatsapp.controller';
import { WhatsappService } from '../src/modules/whatsapp/whatsapp.service';

describe('API (e2e)', () => {
  let app: INestApplication;

  const appService = { getHello: jest.fn().mockReturnValue('Hello World!') };

  const authService = {
    Userlogin: jest.fn().mockResolvedValue({ access_token: 'user-token' }),
    doctorlogin: jest
      .fn()
      .mockResolvedValue({ access_token: 'doctor-token' }),
    signupUser: jest.fn().mockResolvedValue({ id: 1 }),
    signupDoctor: jest.fn().mockResolvedValue({ id: 2 }),
  };

  const userService = {
    getUserProfile: jest.fn().mockResolvedValue({ id: 1, name: 'User' }),
    updateUserProfile: jest.fn().mockResolvedValue({ ok: true }),
  };

  const doctorService = {
    getDoctorProfile: jest.fn().mockResolvedValue({ id: 10 }),
    createOrUpdate: jest.fn().mockResolvedValue({ ok: true }),
    getDoctors: jest.fn().mockResolvedValue([{ id: 10 }]),
  };

  const patientService = {
    create: jest.fn().mockResolvedValue({ id: 100 }),
    getAll: jest.fn().mockResolvedValue([{ id: 100 }]),
    update: jest.fn().mockResolvedValue({ ok: true }),
    remove: jest.fn().mockResolvedValue({ ok: true }),
  };

  const appointmentsService = {
    getAvailableSlots: jest.fn().mockResolvedValue([{ start_time: '09:00' }]),
    getSlotsWithNextAvailable: jest
      .fn()
      .mockResolvedValue({ slots: [], nextAvailable: '2026-01-01' }),
    holdNextSlot: jest.fn().mockResolvedValue({ appointment_id: 123 }),
    confirmBooking: jest.fn().mockResolvedValue({ ok: true }),
    bookSlot: jest.fn().mockResolvedValue({ id: 123 }),
    addPatient: jest.fn().mockResolvedValue({ ok: true }),
    getDoctorAppointments: jest.fn().mockResolvedValue([]),
    getUserAppointments: jest.fn().mockResolvedValue([]),
    rescheduleAppointment: jest.fn().mockResolvedValue({ ok: true }),
    cancelAppointment: jest.fn().mockResolvedValue({ ok: true }),
  };

  const consultingTimeService = {
    create: jest.fn().mockResolvedValue({ ok: true }),
    getDoctorSchedule: jest.fn().mockResolvedValue([]),
    getAvailability: jest.fn().mockResolvedValue([]),
    createCustomAvailability: jest.fn().mockResolvedValue({ ok: true }),
  };

  const hospitalService = {
    create: jest.fn().mockResolvedValue({ id: 1 }),
    findAll: jest.fn().mockResolvedValue([]),
    findOne: jest.fn().mockResolvedValue({ id: 1 }),
    update: jest.fn().mockResolvedValue({ ok: true }),
    remove: jest.fn().mockResolvedValue({ ok: true }),
  };

  const leaveManagementService = {
    create: jest.fn().mockResolvedValue({ id: 1 }),
    findAll: jest.fn().mockResolvedValue([]),
    findOne: jest.fn().mockResolvedValue({ id: 1 }),
    update: jest.fn().mockResolvedValue({ ok: true }),
    remove: jest.fn().mockResolvedValue({ ok: true }),
  };

  const clinicService = {
    createMyClinic: jest.fn().mockResolvedValue({ id: 1 }),
    getMyClinic: jest.fn().mockResolvedValue({ id: 1 }),
    updateMyClinic: jest.fn().mockResolvedValue({ ok: true }),
    upsertMyClinicSchedules: jest.fn().mockResolvedValue({ ok: true }),
    addMyClinicClosure: jest.fn().mockResolvedValue({ id: 1 }),
    listMyClinicClosures: jest.fn().mockResolvedValue([]),
    deleteMyClinicClosure: jest.fn().mockResolvedValue({ ok: true }),
  };

  const doctorLeaveService = {
    createForMe: jest.fn().mockResolvedValue({ id: 1 }),
    listForMe: jest.fn().mockResolvedValue([]),
    deleteForMe: jest.fn().mockResolvedValue({ ok: true }),
  };

  const whatsappService = {
    create: jest.fn().mockResolvedValue({ ok: true }),
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [ThrottlerModule.forRoot([{ ttl: 60, limit: 5 }])],
      controllers: [
        AppController,
        AuthController,
        UserController,
        DoctorController,
        PatientController,
        AppointmentsController,
        ConsultingTimeController,
        UserDoctorController,
        HospitalController,
        LeaveManagementController,
        ClinicController,
        DoctorLeaveController,
        WhatsappController,
      ],
      providers: [
        { provide: AppService, useValue: appService },
        { provide: AuthServices, useValue: authService },
        { provide: UserService, useValue: userService },
        { provide: DoctorServices, useValue: doctorService },
        { provide: PatientService, useValue: patientService },
        { provide: AppointmentsService, useValue: appointmentsService },
        { provide: ConsultingTimeService, useValue: consultingTimeService },
        { provide: HospitalService, useValue: hospitalService },
        { provide: LeaveManagementService, useValue: leaveManagementService },
        { provide: ClinicService, useValue: clinicService },
        { provide: DoctorLeaveService, useValue: doctorLeaveService },
        { provide: WhatsappService, useValue: whatsappService },
      ],
    })
      .overrideGuard(Jwtguard)
      .useValue({
        canActivate: (context) => {
          const req = context.switchToHttp().getRequest();
          req.user = { id: 1, sub: 1 };
          return true;
        },
      })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(ThrottlerGuard)
      .useValue({ canActivate: () => true })
      .compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /', async () => {
    await request(app.getHttpServer()).get('/').expect(200).expect('Hello World!');
  });

  describe('Auth', () => {
    it('POST /auth/login (missing number)', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ password: 'x', role: 'doctor' })
        .expect(201);
      expect(res.body).toEqual({ message: 'Number is required for login' });
    });

    it('POST /auth/login (user)', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ number: '999', password: 'x', role: 'user' })
        .expect(201);
      expect(authService.Userlogin).toHaveBeenCalledWith('999', 'user');
      expect(res.body).toEqual({ access_token: 'user-token' });
    });

    it('POST /auth/login (doctor)', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ number: '888', password: 'pw', role: 'doctor' })
        .expect(201);
      expect(authService.doctorlogin).toHaveBeenCalledWith({
        number: '888',
        password: 'pw',
        role: 'doctor',
      });
      expect(res.body).toEqual({ access_token: 'doctor-token' });
    });

    it('POST /auth/signup/user', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/signup/user')
        .send({ number: '777', name: 'Alice' })
        .expect(201);
      expect(authService.signupUser).toHaveBeenCalledWith({
        number: '777',
        name: 'Alice',
      });
      expect(res.body).toEqual({ id: 1 });
    });

    it('POST /auth/signup/doctor', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/signup/doctor')
        .send({ number: '111', password: 'pw', role: 'doctor' })
        .expect(201);
      expect(authService.signupDoctor).toHaveBeenCalled();
      expect(res.body).toEqual({ id: 2 });
    });
  });

  describe('User', () => {
    it('GET /user/profile', async () => {
      const res = await request(app.getHttpServer())
        .get('/user/profile')
        .expect(200);
      expect(userService.getUserProfile).toHaveBeenCalledWith(1);
      expect(res.body).toEqual({ id: 1, name: 'User' });
    });

    it('PATCH /user/update/profile', async () => {
      const res = await request(app.getHttpServer())
        .patch('/user/update/profile')
        .send({ name: 'New Name' })
        .expect(200);
      expect(userService.updateUserProfile).toHaveBeenCalledWith(1, {
        name: 'New Name',
      });
      expect(res.body).toEqual({ ok: true });
    });
  });

  describe('Doctors', () => {
    it('GET /doctors/profile', async () => {
      const res = await request(app.getHttpServer())
        .get('/doctors/profile')
        .expect(200);
      expect(doctorService.getDoctorProfile).toHaveBeenCalledWith(1);
      expect(res.body).toEqual({ id: 10 });
    });

    it('POST /doctors/profile', async () => {
      const res = await request(app.getHttpServer())
        .post('/doctors/profile')
        .send({ bio: 'hi' })
        .expect(201);
      expect(doctorService.createOrUpdate).toHaveBeenCalledWith(1, {
        bio: 'hi',
      });
      expect(res.body).toEqual({ ok: true });
    });

    it('GET /doctors/getDoctorlist', async () => {
      const res = await request(app.getHttpServer())
        .get('/doctors/getDoctorlist?specialization=cardio&search=ali')
        .expect(200);
      expect(doctorService.getDoctors).toHaveBeenCalledWith('cardio', 'ali');
      expect(res.body).toEqual([{ id: 10 }]);
    });
  });

  describe('Patients', () => {
    it('POST /patients', async () => {
      const res = await request(app.getHttpServer())
        .post('/patients')
        .send({ name: 'Patient' })
        .expect(201);
      expect(patientService.create).toHaveBeenCalledWith(1, { name: 'Patient' });
      expect(res.body).toEqual({ id: 100 });
    });

    it('GET /patients', async () => {
      const res = await request(app.getHttpServer()).get('/patients').expect(200);
      expect(patientService.getAll).toHaveBeenCalledWith(1);
      expect(res.body).toEqual([{ id: 100 }]);
    });

    it('PATCH /patients/:id', async () => {
      const res = await request(app.getHttpServer())
        .patch('/patients/100')
        .send({ name: 'Updated' })
        .expect(200);
      expect(patientService.update).toHaveBeenCalledWith('100', { name: 'Updated' });
      expect(res.body).toEqual({ ok: true });
    });

    it('DELETE /patients/:id', async () => {
      const res = await request(app.getHttpServer())
        .delete('/patients/100')
        .expect(200);
      expect(patientService.remove).toHaveBeenCalledWith('100');
      expect(res.body).toEqual({ ok: true });
    });
  });

  describe('Appointments', () => {
    it('GET /appointments/slots/:doctorId (missing date)', async () => {
      await request(app.getHttpServer())
        .get('/appointments/slots/10')
        .expect(400);
    });

    it('GET /appointments/slots/:doctorId', async () => {
      const res = await request(app.getHttpServer())
        .get('/appointments/slots/10?date=2026-01-01')
        .expect(200);
      expect(appointmentsService.getAvailableSlots).toHaveBeenCalledWith(
        10,
        '2026-01-01',
      );
      expect(res.body).toEqual([{ start_time: '09:00' }]);
    });

    it('GET /appointments/slots/next/:doctorId', async () => {
      const res = await request(app.getHttpServer())
        .get('/appointments/slots/next/10?date=2026-01-01&maxDays=7')
        .expect(200);
      expect(appointmentsService.getSlotsWithNextAvailable).toHaveBeenCalledWith(
        10,
        '2026-01-01',
        7,
      );
      expect(res.body).toEqual({ slots: [], nextAvailable: '2026-01-01' });
    });

    it('POST /appointments/bookNext', async () => {
      const res = await request(app.getHttpServer())
        .post('/appointments/bookNext')
        .send({ doctor_id: 10 })
        .expect(201);
      expect(appointmentsService.holdNextSlot).toHaveBeenCalledWith(
        { doctor_id: 10 },
        1,
      );
      expect(res.body).toEqual({ appointment_id: 123 });
    });

    it('POST /appointments/confirmNextBook', async () => {
      const res = await request(app.getHttpServer())
        .post('/appointments/confirmNextBook')
        .send({ appointment_id: 123 })
        .expect(201);
      expect(appointmentsService.confirmBooking).toHaveBeenCalledWith(123, 1);
      expect(res.body).toEqual({ ok: true });
    });

    it('POST /appointments', async () => {
      const res = await request(app.getHttpServer())
        .post('/appointments')
        .send({ doctor_id: 10, date: '2026-01-01', user_id: 999 })
        .expect(201);
      expect(appointmentsService.bookSlot).toHaveBeenCalledWith({
        doctor_id: 10,
        date: '2026-01-01',
        user_id: 1,
      });
      expect(res.body).toEqual({ id: 123 });
    });

    it('PATCH /appointments/:id/addpatient', async () => {
      const res = await request(app.getHttpServer())
        .patch('/appointments/123/addpatient')
        .send({ patient_id: 100 })
        .expect(200);
      expect(appointmentsService.addPatient).toHaveBeenCalledWith(123, 100, 1);
      expect(res.body).toEqual({ ok: true });
    });

    it('GET /appointments/doctor', async () => {
      const res = await request(app.getHttpServer())
        .get('/appointments/doctor')
        .expect(200);
      expect(appointmentsService.getDoctorAppointments).toHaveBeenCalledWith(1);
      expect(res.body).toEqual([]);
    });

    it('GET /appointments/user/all', async () => {
      const res = await request(app.getHttpServer())
        .get('/appointments/user/all')
        .expect(200);
      expect(appointmentsService.getUserAppointments).toHaveBeenCalledWith(1);
      expect(res.body).toEqual([]);
    });

    it('GET /appointments/my', async () => {
      const res = await request(app.getHttpServer())
        .get('/appointments/my')
        .expect(200);
      expect(appointmentsService.getUserAppointments).toHaveBeenCalledWith(1);
      expect(res.body).toEqual([]);
    });

    it('PATCH /appointments/reschedule/:id', async () => {
      const res = await request(app.getHttpServer())
        .patch('/appointments/reschedule/123')
        .send({ date: '2026-01-02', start_time: '09:00', end_time: '10:00' })
        .expect(200);
      expect(appointmentsService.rescheduleAppointment).toHaveBeenCalledWith(
        123,
        1,
        '2026-01-02',
        '09:00',
        '10:00',
      );
      expect(res.body).toEqual({ ok: true });
    });

    it('PATCH /appointments/:id/cancel', async () => {
      const res = await request(app.getHttpServer())
        .patch('/appointments/123/cancel')
        .send({ reason: 'changed mind' })
        .expect(200);
      expect(appointmentsService.cancelAppointment).toHaveBeenCalledWith(
        123,
        1,
        'changed mind',
      );
      expect(res.body).toEqual({ ok: true });
    });
  });

  describe('Consulting Time', () => {
    it('POST /doctor/consultingTime/create', async () => {
      const res = await request(app.getHttpServer())
        .post('/doctor/consultingTime/create')
        .send({ day: 'MON', start_time: '09:00', end_time: '10:00' })
        .expect(201);
      expect(consultingTimeService.create).toHaveBeenCalled();
      expect(res.body).toEqual({ ok: true });
    });

    it('GET /doctor/consultingTime/me', async () => {
      const res = await request(app.getHttpServer())
        .get('/doctor/consultingTime/me')
        .expect(200);
      expect(consultingTimeService.getDoctorSchedule).toHaveBeenCalledWith(1);
      expect(res.body).toEqual([]);
    });

    it('GET /doctor/consultingTime/availability (missing date)', async () => {
      await request(app.getHttpServer())
        .get('/doctor/consultingTime/availability')
        .expect(400);
    });

    it('GET /doctor/consultingTime/availability', async () => {
      const res = await request(app.getHttpServer())
        .get('/doctor/consultingTime/availability?date=2026-01-01')
        .expect(200);
      expect(consultingTimeService.getAvailability).toHaveBeenCalledWith(
        1,
        '2026-01-01',
      );
      expect(res.body).toEqual([]);
    });

    it('POST /doctor/consultingTime/custom-availability', async () => {
      const res = await request(app.getHttpServer())
        .post('/doctor/consultingTime/custom-availability')
        .send({ date: '2026-01-01', slots: [] })
        .expect(201);
      expect(consultingTimeService.createCustomAvailability).toHaveBeenCalled();
      expect(res.body).toEqual({ ok: true });
    });
  });

  describe('User/Doctor (public)', () => {
    it('GET /users/doctors/:doctorId/schedule', async () => {
      const res = await request(app.getHttpServer())
        .get('/users/doctors/10/schedule')
        .expect(200);
      expect(consultingTimeService.getDoctorSchedule).toHaveBeenCalledWith(10);
      expect(res.body).toEqual([]);
    });

    it('GET /users/doctors/:doctorId/availability (missing date)', async () => {
      await request(app.getHttpServer())
        .get('/users/doctors/10/availability')
        .expect(400);
    });

    it('GET /users/doctors/:doctorId/availability', async () => {
      const res = await request(app.getHttpServer())
        .get('/users/doctors/10/availability?date=2026-01-01')
        .expect(200);
      expect(consultingTimeService.getAvailability).toHaveBeenCalledWith(
        10,
        '2026-01-01',
      );
      expect(res.body).toEqual([]);
    });
  });

  describe('Hospital', () => {
    it('POST /hospital', async () => {
      const res = await request(app.getHttpServer())
        .post('/hospital')
        .send({ name: 'H' })
        .expect(201);
      expect(hospitalService.create).toHaveBeenCalledWith({ name: 'H' }, 1);
      expect(res.body).toEqual({ id: 1 });
    });

    it('GET /hospital', async () => {
      const res = await request(app.getHttpServer()).get('/hospital').expect(200);
      expect(hospitalService.findAll).toHaveBeenCalled();
      expect(res.body).toEqual([]);
    });

    it('GET /hospital/:id', async () => {
      const res = await request(app.getHttpServer())
        .get('/hospital/1')
        .expect(200);
      expect(hospitalService.findOne).toHaveBeenCalledWith(1);
      expect(res.body).toEqual({ id: 1 });
    });

    it('PATCH /hospital/:id', async () => {
      const res = await request(app.getHttpServer())
        .patch('/hospital/1')
        .send({ name: 'N' })
        .expect(200);
      expect(hospitalService.update).toHaveBeenCalledWith(1, { name: 'N' });
      expect(res.body).toEqual({ ok: true });
    });

    it('DELETE /hospital/:id', async () => {
      const res = await request(app.getHttpServer())
        .delete('/hospital/1')
        .expect(200);
      expect(hospitalService.remove).toHaveBeenCalledWith(1);
      expect(res.body).toEqual({ ok: true });
    });
  });

  describe('Leave Management', () => {
    it('POST /leave-management', async () => {
      const res = await request(app.getHttpServer())
        .post('/leave-management')
        .send({ date: '2026-01-01' })
        .expect(201);
      expect(leaveManagementService.create).toHaveBeenCalledWith({
        date: '2026-01-01',
      });
      expect(res.body).toEqual({ id: 1 });
    });

    it('GET /leave-management', async () => {
      const res = await request(app.getHttpServer())
        .get('/leave-management')
        .expect(200);
      expect(leaveManagementService.findAll).toHaveBeenCalled();
      expect(res.body).toEqual([]);
    });

    it('GET /leave-management/:id', async () => {
      const res = await request(app.getHttpServer())
        .get('/leave-management/1')
        .expect(200);
      expect(leaveManagementService.findOne).toHaveBeenCalledWith(1);
      expect(res.body).toEqual({ id: 1 });
    });

    it('PATCH /leave-management/:id', async () => {
      const res = await request(app.getHttpServer())
        .patch('/leave-management/1')
        .send({ reason: 'x' })
        .expect(200);
      expect(leaveManagementService.update).toHaveBeenCalledWith(1, {
        reason: 'x',
      });
      expect(res.body).toEqual({ ok: true });
    });

    it('DELETE /leave-management/:id', async () => {
      const res = await request(app.getHttpServer())
        .delete('/leave-management/1')
        .expect(200);
      expect(leaveManagementService.remove).toHaveBeenCalledWith(1);
      expect(res.body).toEqual({ ok: true });
    });
  });

  describe('Clinic', () => {
    it('POST /clinic/profile', async () => {
      const res = await request(app.getHttpServer())
        .post('/clinic/profile')
        .send({ name: 'C' })
        .expect(201);
      expect(clinicService.createMyClinic).toHaveBeenCalledWith(1, { name: 'C' });
      expect(res.body).toEqual({ id: 1 });
    });

    it('GET /clinic/me', async () => {
      const res = await request(app.getHttpServer()).get('/clinic/me').expect(200);
      expect(clinicService.getMyClinic).toHaveBeenCalledWith(1);
      expect(res.body).toEqual({ id: 1 });
    });

    it('PATCH /clinic/profile', async () => {
      const res = await request(app.getHttpServer())
        .patch('/clinic/profile')
        .send({ name: 'N' })
        .expect(200);
      expect(clinicService.updateMyClinic).toHaveBeenCalledWith(1, { name: 'N' });
      expect(res.body).toEqual({ ok: true });
    });

    it('POST /clinic/schedules', async () => {
      const res = await request(app.getHttpServer())
        .post('/clinic/schedules')
        .send({ schedules: [] })
        .expect(201);
      expect(clinicService.upsertMyClinicSchedules).toHaveBeenCalledWith(1, {
        schedules: [],
      });
      expect(res.body).toEqual({ ok: true });
    });

    it('POST /clinic/closures', async () => {
      const res = await request(app.getHttpServer())
        .post('/clinic/closures')
        .send({ date: '2026-01-01' })
        .expect(201);
      expect(clinicService.addMyClinicClosure).toHaveBeenCalledWith(1, {
        date: '2026-01-01',
      });
      expect(res.body).toEqual({ id: 1 });
    });

    it('GET /clinic/closures', async () => {
      const res = await request(app.getHttpServer())
        .get('/clinic/closures')
        .expect(200);
      expect(clinicService.listMyClinicClosures).toHaveBeenCalledWith(1);
      expect(res.body).toEqual([]);
    });

    it('DELETE /clinic/closures/:id', async () => {
      const res = await request(app.getHttpServer())
        .delete('/clinic/closures/1')
        .expect(200);
      expect(clinicService.deleteMyClinicClosure).toHaveBeenCalledWith(1, 1);
      expect(res.body).toEqual({ ok: true });
    });
  });

  describe('Doctor Leaves', () => {
    it('POST /doctor/leaves', async () => {
      const res = await request(app.getHttpServer())
        .post('/doctor/leaves')
        .send({ from: '2026-01-01', to: '2026-01-02' })
        .expect(201);
      expect(doctorLeaveService.createForMe).toHaveBeenCalledWith(1, {
        from: '2026-01-01',
        to: '2026-01-02',
      });
      expect(res.body).toEqual({ id: 1 });
    });

    it('GET /doctor/leaves', async () => {
      const res = await request(app.getHttpServer())
        .get('/doctor/leaves?from=2026-01-01&to=2026-01-02')
        .expect(200);
      expect(doctorLeaveService.listForMe).toHaveBeenCalledWith(
        1,
        '2026-01-01',
        '2026-01-02',
      );
      expect(res.body).toEqual([]);
    });

    it('DELETE /doctor/leaves/:id', async () => {
      const res = await request(app.getHttpServer())
        .delete('/doctor/leaves/1')
        .expect(200);
      expect(doctorLeaveService.deleteForMe).toHaveBeenCalledWith(1, 1);
      expect(res.body).toEqual({ ok: true });
    });
  });

  describe('Whatsapp', () => {
    it('POST /whatsapp/chat', async () => {
      const res = await request(app.getHttpServer())
        .post('/whatsapp/chat')
        .send({ number: '999', message: 'hi' })
        .expect(201);
      expect(whatsappService.create).toHaveBeenCalledWith({
        number: '999',
        message: 'hi',
      });
      expect(res.body).toEqual({ ok: true });
    });
  });
});
