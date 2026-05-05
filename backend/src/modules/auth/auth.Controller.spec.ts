import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.Controller';
import { AuthServices } from './auth.service';

describe('AuthController', () => {
  let controller: AuthController;
  let authService: AuthServices;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthServices,
          useValue: {
            Userlogin: jest.fn(),
            doctorlogin: jest.fn(),
            signupUser: jest.fn(),
            signupDoctor: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
    authService = module.get<AuthServices>(AuthServices);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('login returns message when number missing', async () => {
    await expect(
      controller.login({ number: '', password: 'x', role: 'doctor' }),
    ).resolves.toEqual({ message: 'Number is required for login' });
  });

  it('login calls Userlogin for role user', async () => {
    (authService.Userlogin as jest.Mock).mockResolvedValue({ ok: true });
    await expect(
      controller.login({ number: '999', password: 'x', role: 'user' }),
    ).resolves.toEqual({ ok: true });
    expect(authService.Userlogin).toHaveBeenCalledWith('999', 'user');
  });

  it('login calls doctorlogin for role doctor', async () => {
    (authService.doctorlogin as jest.Mock).mockResolvedValue({ ok: true });
    await expect(
      controller.login({ number: '888', password: 'pw', role: 'doctor' }),
    ).resolves.toEqual({ ok: true });
    expect(authService.doctorlogin).toHaveBeenCalledWith({
      number: '888',
      password: 'pw',
      role: 'doctor',
    });
  });
});

