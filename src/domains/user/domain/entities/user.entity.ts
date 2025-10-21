import { Uuid } from '@/common/types/uuid.type';
import { KycStatus } from '../enums/kyc-status.enum';

export class User {
  private constructor(
    public readonly id: Uuid,
    public readonly email: string,
    public readonly passwordHash: string,
    private kycStatus: KycStatus,
    public verified: boolean,
    public readonly createdAt: Date,
    private updatedAt: Date,
  ) {}

  public static create(email: string, passwordHash: string): User {
    return new User(
      Uuid.generate(),
      email,
      passwordHash,
      KycStatus.NONE,
      false,
      new Date(),
      new Date(),
    );
  }

  public getKycStatus(): KycStatus {
    return this.kycStatus;
  }

  public getUpdatedAt(): Date {
    return this.updatedAt;
  }

  public verify(): void {
    this.verified = true;
    this.updatedAt = new Date();
  }
}
