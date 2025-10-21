import { AuthService } from '@/api/auth/auth.service';
import { Reflector } from '@nestjs/core';
import { Test, TestingModule } from '@nestjs/testing';
import { AuthGuard } from './auth.guard';

describe('AuthGuard', () => {
  let guard: AuthGuard;
  let reflector: Partial<Record<keyof Reflector, jest.Mock>>;
  let authService: Partial<Record<keyof AuthService, jest.Mock>>;
  let module: TestingModule;

  beforeAll(async () => {
    authService = {
      verifyAccessToken: jest.fn(),
    };

    reflector = {
      getAllAndOverride: jest.fn(),
    };

    module = await Test.createTestingModule({
      providers: [
        AuthGuard,
        {
          provide: AuthService,
          useValue: authService,
        },
        {
          provide: Reflector,
          useValue: reflector,
        },
      ],
    }).compile();
    guard = module.get<AuthGuard>(AuthGuard);
  });

  afterEach(async () => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(guard).toBeDefined();
  });
});
