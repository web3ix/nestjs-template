import { Uuid } from '@/common/types/uuid.type';
import { Session } from '../entities/session.entity';

export interface ISessionRepository {
  save(session: Session): Promise<void>;
  findById(id: Uuid): Promise<Session | null>;
  delete(id: Uuid): Promise<void>;
  update(id: Uuid, data: Partial<Session>): Promise<void>;
}
