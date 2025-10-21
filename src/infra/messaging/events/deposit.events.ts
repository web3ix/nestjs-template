import { Uuid } from '@/common/types/uuid.type';
import { DomainEvent } from '../interfaces/event.interface';

export class DepositDetectedEvent extends DomainEvent {
  constructor(
    public readonly depositId: Uuid,
    public readonly walletId: Uuid,
    public readonly chainTokenId: Uuid,
    public readonly amount: string,
    public readonly txHash: string,
    public readonly address: string,
  ) {
    super();
  }

  getEventName(): string {
    return 'deposit.detected';
  }
}

export class DepositConfirmedEvent extends DomainEvent {
  constructor(
    public readonly depositId: Uuid,
    public readonly walletId: Uuid,
    public readonly chainTokenId: Uuid,
    public readonly amount: string,
    public readonly txHash: string,
    public readonly confirmations: number,
  ) {
    super();
  }

  getEventName(): string {
    return 'deposit.confirmed';
  }
}

export class DepositCreditedEvent extends DomainEvent {
  constructor(
    public readonly depositId: Uuid,
    public readonly walletId: Uuid,
    public readonly chainTokenId: Uuid,
    public readonly amount: string,
    public readonly txHash: string,
  ) {
    super();
  }

  getEventName(): string {
    return 'deposit.credited';
  }
}

export class DepositFailedEvent extends DomainEvent {
  constructor(
    public readonly depositId: Uuid,
    public readonly walletId: Uuid,
    public readonly chainTokenId: Uuid,
    public readonly txHash: string,
    public readonly reason: string,
  ) {
    super();
  }

  getEventName(): string {
    return 'deposit.failed';
  }
}
