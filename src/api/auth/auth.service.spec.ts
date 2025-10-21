import { SessionRepository } from '@/domains/user/infrastructure/persistence/repositories/session.repository';
import { UserRepository } from '@/domains/user/infrastructure/persistence/repositories/user.repository';
import { getQueueToken } from '@nestjs/bullmq';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  let service: AuthService;
  let configServiceValue: Partial<Record<keyof ConfigService, jest.Mock>>;
  let jwtServiceValue: Partial<Record<keyof JwtService, jest.Mock>>;
  let userRepositoryValue: Partial<Record<keyof SessionRepository, jest.Mock>>;
  let sessionRepositoryValue: Partial<Record<keyof UserRepository, jest.Mock>>;

  beforeAll(async () => {
    configServiceValue = {
      get: jest.fn(),
      getOrThrow: jest.fn(),
    };

    jwtServiceValue = {
      sign: jest.fn(),
      verify: jest.fn(),
      signAsync: jest.fn(),
    };

    userRepositoryValue = {
      // @todo fix
      // findByEmail: jest.fn(),
      // exists: jest.fn(),
      // save: jest.fn(),
      // findById: jest.fn(),
      // update: jest.fn(),
    };

    sessionRepositoryValue = {
      // save: jest.fn(),
      // findById: jest.fn(),
      // delete: jest.fn(),
      // update: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: ConfigService,
          useValue: configServiceValue,
        },
        {
          provide: JwtService,
          useValue: jwtServiceValue,
        },
        {
          provide: UserRepository,
          useValue: userRepositoryValue,
        },
        {
          provide: SessionRepository,
          useValue: sessionRepositoryValue,
        },
        {
          provide: getQueueToken('email'),
          useValue: {
            add: jest.fn(),
          },
        },
        {
          provide: CACHE_MANAGER,
          useValue: {
            set: jest.fn(),
            get: jest.fn(),
            del: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
