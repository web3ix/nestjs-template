import { Uuid } from '@/common/types/uuid.type';
import { Inject, Injectable } from '@nestjs/common';
import { Session } from '../../domain/entities/session.entity';
import { User } from '../../domain/entities/user.entity';
import { ISessionRepository } from '../../domain/repositories/session.repository';
import { IUserRepository } from '../../domain/repositories/user.repository';

@Injectable()
export class UserService {
  constructor(
    @Inject('IUserRepository')
    private readonly userRepository: IUserRepository,
    @Inject('ISessionRepository')
    private readonly sessionRepository: ISessionRepository,
  ) {}

  // User operations
  async createUser(email: string, passwordHash: string): Promise<User> {
    const user = User.create(email, passwordHash);
    await this.userRepository.save(user);
    return user;
  }

  async findUserById(id: Uuid): Promise<User | null> {
    return await this.userRepository.findById(id);
  }

  async findUserByEmail(email: string): Promise<User | null> {
    return await this.userRepository.findByEmail(email);
  }

  async userExists(email: string): Promise<boolean> {
    return await this.userRepository.exists(email);
  }

  async updateUser(id: Uuid, data: Partial<User>): Promise<void> {
    await this.userRepository.update(id, data);
  }

  async verifyUser(id: Uuid): Promise<void> {
    await this.userRepository.update(id, { verified: true });
  }

  // Session operations
  async createSession(user: User, hash: string): Promise<Session> {
    const session = Session.create(user, hash);
    await this.sessionRepository.save(session);
    return session;
  }

  async findSessionById(id: Uuid): Promise<Session | null> {
    return await this.sessionRepository.findById(id);
  }

  async updateSession(id: Uuid, data: Partial<Session>): Promise<void> {
    await this.sessionRepository.update(id, data);
  }

  async deleteSession(id: Uuid): Promise<void> {
    await this.sessionRepository.delete(id);
  }
}
