import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { AuthServices } from './auth.service';
import { UserService } from '../users/user.service';
import { DoctorServices } from '../doctors/doctor.service';

describe('AuthServices', () => {
  let service: AuthServices;
  let jwt: JwtService;
  let users: UserService;
  let doctors: DoctorServices;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthServices,
        {
          provide: JwtService,
          useValue: { sign: jest.fn().mockReturnValue('signed') },
        },
        {
          provide: UserService,
          useValue: { login: jest.fn(), createUser: jest.fn() },
        },
        {
          provide: DoctorServices,
          useValue: { login: jest.fn(), createDoctor: jest.fn() },
        },
      ],
    }).compile();

    service = module.get<AuthServices>(AuthServices);
    jwt = module.get<JwtService>(JwtService);
    users = module.get<UserService>(UserService);
    doctors = module.get<DoctorServices>(DoctorServices);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('Userlogin returns role not defined for non-user', async () => {
    await expect(service.Userlogin('999', 'doctor')).resolves.toEqual({
      message: 'Role is not defined',
    });
  });

  it('Userlogin returns response when user missing', async () => {
    (users.login as jest.Mock).mockResolvedValue({ message: 'Invalid mobile number' });
    await expect(service.Userlogin('999', 'user')).resolves.toEqual({
      message: 'Invalid mobile number',
    });
    expect(jwt.sign).not.toHaveBeenCalled();
  });

  it('Userlogin signs token when user exists', async () => {
    (users.login as jest.Mock).mockResolvedValue({
      user: { id: 1, name: 'U', mobileNumber: '999' },
    });
    await expect(service.Userlogin('999', 'user')).resolves.toEqual({
      message: 'Login successful',
      token: 'signed',
      role: 'user',
    });
    expect(jwt.sign).toHaveBeenCalledWith({ sub: 1, role: 'user' });
  });

  it('doctorlogin signs token when doctor exists', async () => {
    (doctors.login as jest.Mock).mockResolvedValue({
      doctor: { id: 10, name: 'D' },
    });
    await expect(
      service.doctorlogin({ number: '888', password: 'pw', role: 'doctor' }),
    ).resolves.toEqual({
      message: 'Login successful',
      token: 'signed',
      doctorId: 10,
      role: 'doctor',
    });
    expect(jwt.sign).toHaveBeenCalledWith({ sub: 10, role: 'doctor' });
  });
});

