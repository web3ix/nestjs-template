import { Uuid } from '@/common/types/uuid.type';
import { Session } from '@/domains/user/domain/entities/session.entity';
import { User } from '@/domains/user/domain/entities/user.entity';
import { ISessionRepository } from '@/domains/user/domain/repositories/session.repository';
import { DrizzleService } from '@/infra/database/drizzle.service';
import {
  Session as SessionRow,
  sessions,
  User as UserRow,
  users,
} from '@/infra/database/schema';
import { Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';

@Injectable()
export class SessionRepository implements ISessionRepository {
  constructor(private readonly drizzle: DrizzleService) {}

  async save(session: Session): Promise<void> {
    const db = this.drizzle.getDb() as any;
    const data = {
      id: session.id as string,
      userId: session.user.id as string,
      hash: session.hash,
      createdAt: session.createdAt,
      createdBy: 'system',
      updatedAt: new Date(),
      updatedBy: 'system',
      deletedAt: null,
    };

    await db
      .insert(sessions)
      .values(data)
      .onConflictDoUpdate({
        target: sessions.id,
        set: {
          hash: data.hash,
          updatedAt: data.updatedAt,
          updatedBy: data.updatedBy,
        },
      });
  }

  async findById(id: Uuid): Promise<Session | null> {
    const db = this.drizzle.getDb() as any;
    const result = await db
      .select()
      .from(sessions)
      .leftJoin(users, eq(sessions.userId, users.id))
      .where(eq(sessions.id, id as string))
      .limit(1);

    if (result.length === 0 || !result[0].users) return null;

    const user = this.toUserDomain(result[0].users);
    const session = Session.create(user, result[0].sessions.hash);
    Object.assign(session, {
      id: Uuid.fromString(result[0].sessions.id),
      createdAt: new Date(result[0].sessions.createdAt),
    });
    return session;
  }

  async delete(id: Uuid): Promise<void> {
    const db = this.drizzle.getDb() as any;
    await db.delete(sessions).where(eq(sessions.id, id as string));
  }

  async update(id: Uuid, data: Partial<Session>): Promise<void> {
    const db = this.drizzle.getDb() as any;
    const updateData: Partial<SessionRow> = {
      updatedAt: new Date(),
      updatedBy: 'system',
    };

    if (data.hash) updateData.hash = data.hash;
    if (data.user) updateData.userId = data.user.id as string;

    await db
      .update(sessions)
      .set(updateData)
      .where(eq(sessions.id, id as string));
  }

  private toUserDomain(row: UserRow): User {
    const user = User.create(row.email, row.passwordHash);
    Object.assign(user, {
      id: Uuid.fromString(row.id),
      kycStatus: row.kycStatus,
      verified: row.verified,
      createdAt: new Date(row.createdAt),
      updatedAt: new Date(row.updatedAt),
    });
    return user;
  }
}
