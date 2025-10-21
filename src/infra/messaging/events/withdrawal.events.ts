import { Uuid } from '@/common/types/uuid.type';
import { DomainEvent } from '../interfaces/event.interface';

export class WithdrawalRequestedEvent extends DomainEvent {
  constructor(
    public readonly withdrawalId: Uuid,
    public readonly userId: Uuid,
    public readonly chainTokenId: Uuid,
    public readonly amount: string,
    public readonly fee: string,
    public readonly toAddress: string,
    public readonly requiresApproval: boolean,
  ) {
    super();
  }

  getEventName(): string {
    return 'withdrawal.requested';
  }
}

export class WithdrawalApprovedEvent extends DomainEvent {
  constructor(
    public readonly withdrawalId: Uuid,
    public readonly userId: Uuid,
    public readonly approvedBy: Uuid,
  ) {
    super();
  }

  getEventName(): string {
    return 'withdrawal.approved';
  }
}

export class WithdrawalRejectedEvent extends DomainEvent {
  constructor(
    public readonly withdrawalId: Uuid,
    public readonly userId: Uuid,
    public readonly rejectedBy: Uuid,
    public readonly reason: string,
  ) {
    super();
  }

  getEventName(): string {
    return 'withdrawal.rejected';
  }
}

export class WithdrawalProcessingEvent extends DomainEvent {
  constructor(
    public readonly withdrawalId: Uuid,
    public readonly userId: Uuid,
    public readonly txHash: string,
  ) {
    super();
  }

  getEventName(): string {
    return 'withdrawal.processing';
  }
}

export class WithdrawalCompletedEvent extends DomainEvent {
  constructor(
    public readonly withdrawalId: Uuid,
    public readonly userId: Uuid,
    public readonly txHash: string,
    public readonly amount: string,
  ) {
    super();
  }

  getEventName(): string {
    return 'withdrawal.completed';
  }
}

export class WithdrawalFailedEvent extends DomainEvent {
  constructor(
    public readonly withdrawalId: Uuid,
    public readonly userId: Uuid,
    public readonly reason: string,
  ) {
    super();
  }

  getEventName(): string {
    return 'withdrawal.failed';
  }
}

export class WithdrawalCancelledEvent extends DomainEvent {
  constructor(
    public readonly withdrawalId: Uuid,
    public readonly userId: Uuid,
  ) {
    super();
  }

  getEventName(): string {
    return 'withdrawal.cancelled';
  }
}
