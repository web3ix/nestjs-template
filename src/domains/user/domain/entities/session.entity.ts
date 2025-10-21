import { Uuid } from '@/common/types/uuid.type';
import { User } from './user.entity';

export class Session {
  private constructor(
    public readonly id: Uuid,
    public readonly user: User,
    public hash: string,
    public readonly createdAt: Date,
  ) {}

  public static create(user: User, hash: string): Session {
    return new Session(Uuid.generate(), user, hash, new Date());
  }

  public updateHash(hash: string): void {
    this.hash = hash;
  }
}
