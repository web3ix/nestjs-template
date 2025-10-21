import { Module } from '@nestjs/common';
import { UserService } from './application/services/user.service';
import { SessionRepository } from './infrastructure/persistence/repositories/session.repository';
import { UserRepository } from './infrastructure/persistence/repositories/user.repository';

@Module({
  providers: [
    {
      provide: 'IUserRepository',
      useClass: UserRepository,
    },
    {
      provide: 'ISessionRepository',
      useClass: SessionRepository,
    },
    UserService,
  ],
  exports: [UserService],
})
export class UserDomainModule {}
