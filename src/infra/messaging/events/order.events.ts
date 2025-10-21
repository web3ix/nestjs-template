import { Uuid } from '@/common/types/uuid.type';
import { DomainEvent } from '../interfaces/event.interface';

export class OrderCreatedEvent extends DomainEvent {
  constructor(
    public readonly orderId: Uuid,
    public readonly userId: Uuid,
    public readonly tradingPairId: Uuid,
    public readonly type: string,
    public readonly side: string,
    public readonly quantity: string,
    public readonly price: string | null,
  ) {
    super();
  }

  getEventName(): string {
    return 'order.created';
  }
}

export class OrderFilledEvent extends DomainEvent {
  constructor(
    public readonly orderId: Uuid,
    public readonly userId: Uuid,
    public readonly tradingPairId: Uuid,
    public readonly filledQuantity: string,
    public readonly price: string,
    public readonly totalFilled: string,
    public readonly isFilled: boolean,
  ) {
    super();
  }

  getEventName(): string {
    return 'order.filled';
  }
}

export class OrderCancelledEvent extends DomainEvent {
  constructor(
    public readonly orderId: Uuid,
    public readonly userId: Uuid,
    public readonly tradingPairId: Uuid,
    public readonly reason?: string,
  ) {
    super();
  }

  getEventName(): string {
    return 'order.cancelled';
  }
}

export class OrderExpiredEvent extends DomainEvent {
  constructor(
    public readonly orderId: Uuid,
    public readonly userId: Uuid,
    public readonly tradingPairId: Uuid,
  ) {
    super();
  }

  getEventName(): string {
    return 'order.expired';
  }
}

export class OrderActivatedEvent extends DomainEvent {
  constructor(
    public readonly orderId: Uuid,
    public readonly userId: Uuid,
    public readonly tradingPairId: Uuid,
  ) {
    super();
  }

  getEventName(): string {
    return 'order.activated';
  }
}

export class OrderRejectedEvent extends DomainEvent {
  constructor(
    public readonly orderId: Uuid,
    public readonly userId: Uuid,
    public readonly tradingPairId: Uuid,
    public readonly reason: string,
  ) {
    super();
  }

  getEventName(): string {
    return 'order.rejected';
  }
}
