import { Uuid } from '@/common/types/uuid.type';
import { DomainEvent } from '../interfaces/event.interface';

export class BalanceCreditedEvent extends DomainEvent {
  constructor(
    public readonly walletId: Uuid,
    public readonly chainTokenId: Uuid,
    public readonly amount: string,
    public readonly newBalance: string,
    public readonly reason: string,
  ) {
    super();
  }

  getEventName(): string {
    return 'balance.credited';
  }
}

export class BalanceDebitedEvent extends DomainEvent {
  constructor(
    public readonly walletId: Uuid,
    public readonly chainTokenId: Uuid,
    public readonly amount: string,
    public readonly newBalance: string,
    public readonly reason: string,
  ) {
    super();
  }

  getEventName(): string {
    return 'balance.debited';
  }
}

export class BalanceLockedEvent extends DomainEvent {
  constructor(
    public readonly walletId: Uuid,
    public readonly chainTokenId: Uuid,
    public readonly amount: string,
    public readonly newLockedBalance: string,
    public readonly reason: string,
  ) {
    super();
  }

  getEventName(): string {
    return 'balance.locked';
  }
}

export class BalanceUnlockedEvent extends DomainEvent {
  constructor(
    public readonly walletId: Uuid,
    public readonly chainTokenId: Uuid,
    public readonly amount: string,
    public readonly newLockedBalance: string,
    public readonly reason: string,
  ) {
    super();
  }

  getEventName(): string {
    return 'balance.unlocked';
  }
}

export class WalletCreatedEvent extends DomainEvent {
  constructor(
    public readonly walletId: Uuid,
    public readonly userId: Uuid,
    public readonly type: string,
  ) {
    super();
  }

  getEventName(): string {
    return 'wallet.created';
  }
}
