import { Uuid } from '@/common/types/uuid.type';
import { User } from '../entities/user.entity';

export interface IUserRepository {
  save(user: User): Promise<void>;
  findById(id: Uuid): Promise<User | null>;
  findByEmail(email: string): Promise<User | null>;
  exists(email: string): Promise<boolean>;
  update(id: Uuid, data: Partial<User>): Promise<void>;
}
