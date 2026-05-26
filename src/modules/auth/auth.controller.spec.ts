import { Test, TestingModule } from '@nestjs/testing';
import { ThrottlerModule } from '@nestjs/throttler';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

describe('AuthController', () => {
  let controller: AuthController;
  let service: AuthService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [ThrottlerModule.forRoot([{ ttl: 60000, limit: 10 }])],
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: {
            login: jest.fn(),
            register: jest.fn(),
            forgotPassword: jest.fn(),
            resetPassword: jest.fn(),
            refreshTokens: jest.fn(),
            logout: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
    service = module.get<AuthService>(AuthService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('refresh chama service.refreshTokens', async () => {
    const spy = jest
      .spyOn(service, 'refreshTokens')
      .mockResolvedValue({ access_token: 'a', refresh_token: 'r' } as any);
    await controller.refresh({ refresh_token: 'r' });
    expect(spy).toHaveBeenCalledWith('r');
  });

  it('logout chama service.logout', async () => {
    const spy = jest.spyOn(service, 'logout').mockResolvedValue({ revoked: true });
    await controller.logout({ refresh_token: 'r' });
    expect(spy).toHaveBeenCalledWith('r');
  });
});
