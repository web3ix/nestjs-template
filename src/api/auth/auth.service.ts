import { ValidationException } from '@/common/exceptions/validation.exception';
import { IEmailJob, IVerifyEmailJob } from '@/common/interfaces/job.interface';
import { Branded } from '@/common/types/types';
import { Uuid } from '@/common/types/uuid.type';
import { createCacheKey } from '@/common/utils/cache.util';
import { hashPassword, verifyPassword } from '@/common/utils/password.util';
import { AllConfigType } from '@/config/config.type';
import { Role } from '@/constants/auth.constant';
import { CacheKey } from '@/constants/cache.constant';
import { ErrorCode } from '@/constants/error-code.constant';
import { JobName, QueueName } from '@/constants/job.constant';
import { UserService } from '@/domains/user/application/services/user.service';
import { InjectQueue } from '@nestjs/bullmq';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { randomStringGenerator } from '@nestjs/common/utils/random-string-generator.util';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Queue } from 'bullmq';
import { Cache } from 'cache-manager';
import { plainToInstance } from 'class-transformer';
import crypto from 'crypto';
import { Auth, google } from 'googleapis';
import ms from 'ms';
import { GoogleReqDto } from './dto/google.req.dto';
import { LoginReqDto } from './dto/login.req.dto';
import { LoginResDto } from './dto/login.res.dto';
import { RefreshReqDto } from './dto/refresh.req.dto';
import { RefreshResDto } from './dto/refresh.res.dto';
import { RegisterReqDto } from './dto/register.req.dto';
import { RegisterResDto } from './dto/register.res.dto';
import { VerifyReqDto } from './dto/verify.req.dto';
import { JwtPayloadType } from './types/jwt-payload.type';
import { JwtRefreshPayloadType } from './types/jwt-refresh-payload.type';

type Token = Branded<
  {
    accessToken: string;
    refreshToken: string;
    tokenExpires: number;
  },
  'token'
>;

@Injectable()
export class AuthService {
  private readonly googleOathClient: Auth.OAuth2Client;

  constructor(
    private readonly configService: ConfigService<AllConfigType>,
    private readonly jwtService: JwtService,
    private readonly userService: UserService,
    @InjectQueue(QueueName.EMAIL)
    private readonly emailQueue: Queue<IEmailJob, any, string>,
    @Inject(CACHE_MANAGER)
    private readonly cacheManager: Cache,
  ) {
    this.googleOathClient = new google.auth.OAuth2(
      this.configService.getOrThrow('auth.googleClientId', {
        infer: true,
      }),
      this.configService.getOrThrow('auth.googleClientSecret', {
        infer: true,
      }),
    );
  }

  async signIn(dto: LoginReqDto): Promise<LoginResDto> {
    const { email, password } = dto;
    const user = await this.userService.findUserByEmail(email);

    if (!user) {
      throw new UnauthorizedException();
    }

    const isPasswordValid = await verifyPassword(password, user.passwordHash);

    if (!isPasswordValid) {
      throw new UnauthorizedException();
    }

    const hash = crypto
      .createHash('sha256')
      .update(randomStringGenerator())
      .digest('hex');

    const session = await this.userService.createSession(user, hash);

    const token = await this.createToken({
      id: user.id,
      email: user.email,
      role: user.getKycStatus() as unknown as Role, // TODO: fix this
      sessionId: session.id,
      hash,
    });

    return plainToInstance(LoginResDto, {
      userId: user.id,
      ...token,
    });
  }

  async signInByGoogle(dto: GoogleReqDto): Promise<LoginResDto> {
    const tokenInfo = await this.googleOathClient.getTokenInfo(dto.token);

    let user = await this.userService.findUserByEmail(tokenInfo.email);

    if (!user) {
      const passwordHash = await hashPassword(randomStringGenerator());
      user = await this.userService.createUser(tokenInfo.email, passwordHash);
    }

    const hash = crypto
      .createHash('sha256')
      .update(randomStringGenerator())
      .digest('hex');

    const session = await this.userService.createSession(user, hash);

    const token = await this.createToken({
      id: user.id,
      email: user.email,
      role: user.getKycStatus() as unknown as Role, // TODO: fix this
      sessionId: session.id,
      hash,
    });

    return plainToInstance(LoginResDto, {
      userId: user.id,
      ...token,
    });
  }

  async register(dto: RegisterReqDto): Promise<RegisterResDto> {
    const isExistUser = await this.userService.userExists(dto.email);

    if (isExistUser) {
      throw new ValidationException(ErrorCode.E001);
    }

    const passwordHash = await hashPassword(dto.password);
    const user = await this.userService.createUser(dto.email, passwordHash);

    const token = await this.createVerificationToken({ id: user.id });
    const tokenExpiresIn = this.configService.getOrThrow(
      'auth.confirmEmailExpires',
      {
        infer: true,
      },
    );
    await this.cacheManager.set(
      createCacheKey(CacheKey.EMAIL_VERIFICATION, user.id),
      token,
      ms(tokenExpiresIn),
    );
    await this.emailQueue.add(
      JobName.EMAIL_VERIFICATION,
      {
        email: dto.email,
        token,
      } as IVerifyEmailJob,
      { attempts: 3, backoff: { type: 'exponential', delay: 60000 } },
    );

    return plainToInstance(RegisterResDto, {
      userId: user.id,
    });
  }

  async verifyEmail(dto: VerifyReqDto): Promise<boolean> {
    let payload: JwtPayloadType;
    try {
      payload = this.jwtService.verify(dto.token, {
        secret: this.configService.getOrThrow('auth.confirmEmailSecret', {
          infer: true,
        }),
      });

      const user = await this.userService.findUserById(payload.id as Uuid);

      if (!user) {
        throw new UnauthorizedException();
      }

      const tokenCache = await this.cacheManager.get(
        createCacheKey(CacheKey.EMAIL_VERIFICATION, payload.id),
      );

      await this.cacheManager.del(
        createCacheKey(CacheKey.EMAIL_VERIFICATION, payload.id),
      );

      if (!tokenCache || payload.exp < Math.floor(Date.now() / 1000))
        throw new UnauthorizedException();

      await this.userService.verifyUser(user.id);

      return true;
    } catch {
      throw new UnauthorizedException();
    }
  }

  async logout(userToken: JwtPayloadType): Promise<void> {
    await this.cacheManager.set(
      createCacheKey(CacheKey.SESSION_BLACKLIST, userToken.sessionId),
      true,
      userToken.exp * 1000 - Date.now(),
    );
    await this.userService.deleteSession(userToken.sessionId as Uuid);
  }

  async refreshToken(dto: RefreshReqDto): Promise<RefreshResDto> {
    const { sessionId } = this.verifyRefreshToken(dto.refreshToken);
    const session = await this.userService.findSessionById(sessionId as Uuid);

    if (!session) {
      throw new UnauthorizedException();
    }

    const user = await this.userService.findUserById(session.user.id);

    if (!user) {
      throw new UnauthorizedException();
    }

    const newHash = crypto
      .createHash('sha256')
      .update(randomStringGenerator())
      .digest('hex');

    await this.userService.updateSession(session.id, { hash: newHash });

    return await this.createToken({
      id: user.id,
      email: user.email,
      role: user.getKycStatus() as unknown as Role, // TODO: fix this
      sessionId: session.id,
      hash: newHash,
    });
  }

  async verifyAccessToken(token: string): Promise<JwtPayloadType> {
    let payload: JwtPayloadType;
    try {
      payload = this.jwtService.verify(token, {
        secret: this.configService.getOrThrow('auth.secret', { infer: true }),
      });
    } catch {
      throw new UnauthorizedException();
    }

    const isSessionBlacklisted = await this.cacheManager.get<boolean>(
      createCacheKey(CacheKey.SESSION_BLACKLIST, payload.sessionId),
    );

    if (isSessionBlacklisted) {
      throw new UnauthorizedException();
    }

    return payload;
  }

  private verifyRefreshToken(token: string): JwtRefreshPayloadType {
    try {
      return this.jwtService.verify(token, {
        secret: this.configService.getOrThrow('auth.refreshSecret', {
          infer: true,
        }),
      });
    } catch {
      throw new UnauthorizedException();
    }
  }

  private async createVerificationToken(data: { id: string }): Promise<string> {
    return await this.jwtService.signAsync(
      {
        id: data.id,
      },
      {
        secret: this.configService.getOrThrow('auth.confirmEmailSecret', {
          infer: true,
        }),
        expiresIn: this.configService.getOrThrow('auth.confirmEmailExpires', {
          infer: true,
        }),
      },
    );
  }

  private async createToken(data: {
    id: Uuid;
    email: string;
    role: Role;
    sessionId: Uuid;
    hash: string;
  }): Promise<Token> {
    const tokenExpiresIn = this.configService.getOrThrow('auth.expires', {
      infer: true,
    });
    const tokenExpires = Date.now() + ms(tokenExpiresIn);

    const [accessToken, refreshToken] = await Promise.all([
      await this.jwtService.signAsync(
        {
          id: data.id,
          email: data.email,
          role: data.role,
          sessionId: data.sessionId,
        },
        {
          secret: this.configService.getOrThrow('auth.secret', { infer: true }),
          expiresIn: tokenExpiresIn,
        },
      ),
      await this.jwtService.signAsync(
        {
          sessionId: data.sessionId,
          hash: data.hash,
        },
        {
          secret: this.configService.getOrThrow('auth.refreshSecret', {
            infer: true,
          }),
          expiresIn: this.configService.getOrThrow('auth.refreshExpires', {
            infer: true,
          }),
        },
      ),
    ]);
    return {
      accessToken,
      refreshToken,
      tokenExpires,
    } as Token;
  }
}
