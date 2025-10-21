import { Uuid } from '@/common/types/uuid.type';
import { User } from '@/domains/user/domain/entities/user.entity';
import { KycStatusValue } from '@/domains/user/domain/enums/kyc-status.enum';
import { IUserRepository } from '@/domains/user/domain/repositories/user.repository';
import { DrizzleService } from '@/infra/database/drizzle.service';
import { User as UserRow, users } from '@/infra/database/schema';
import { Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';

@Injectable()
export class UserRepository implements IUserRepository {
  constructor(private readonly drizzle: DrizzleService) {}

  async save(user: User): Promise<void> {
    const db = this.drizzle.getDb() as any;
    const data = {
      id: user.id as string,
      email: user.email,
      username: user.email.split('@')[0],
      passwordHash: user.passwordHash,
      kycStatus: user.getKycStatus() as KycStatusValue,
      verified: user.verified,
      createdAt: user.createdAt,
      createdBy: 'system',
      updatedAt: user.getUpdatedAt(),
      updatedBy: 'system',
      deletedAt: null,
    };

    await db
      .insert(users)
      .values(data)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          email: data.email,
          passwordHash: data.passwordHash,
          kycStatus: data.kycStatus,
          verified: data.verified,
          updatedAt: data.updatedAt,
          updatedBy: data.updatedBy,
        },
      });
  }

  async findById(id: Uuid): Promise<User | null> {
    const db = this.drizzle.getDb() as any;
    const result = await db
      .select()
      .from(users)
      .where(eq(users.id, id as string))
      .limit(1);

    if (result.length === 0) return null;

    return this.toDomain(result[0]);
  }

  async findByEmail(email: string): Promise<User | null> {
    const db = this.drizzle.getDb() as any;
    const result = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (result.length === 0) return null;

    return this.toDomain(result[0]);
  }

  async exists(email: string): Promise<boolean> {
    const db = this.drizzle.getDb() as any;
    const result = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    return result.length > 0;
  }

  async update(id: Uuid, data: Partial<User>): Promise<void> {
    const db = this.drizzle.getDb() as any;
    const updateData: Partial<UserRow> = {
      updatedAt: new Date(),
      updatedBy: 'system',
    };

    if (data.email) updateData.email = data.email;
    if (data.passwordHash) updateData.passwordHash = data.passwordHash;
    if (data.verified !== undefined) updateData.verified = data.verified;
    if (data.getKycStatus) {
      updateData.kycStatus = data.getKycStatus() as KycStatusValue;
    }

    await db
      .update(users)
      .set(updateData)
      .where(eq(users.id, id as string));
  }

  private toDomain(row: UserRow): User {
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
