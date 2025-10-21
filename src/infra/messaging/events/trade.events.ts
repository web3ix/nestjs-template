import { Uuid } from '@/common/types/uuid.type';
import { DomainEvent } from '../interfaces/event.interface';

export class TradeExecutedEvent extends DomainEvent {
  constructor(
    public readonly tradeId: Uuid,
    public readonly makerOrderId: Uuid,
    public readonly takerOrderId: Uuid,
    public readonly makerUserId: Uuid,
    public readonly takerUserId: Uuid,
    public readonly tradingPairId: Uuid,
    public readonly price: string,
    public readonly quantity: string,
    public readonly makerFee: string,
    public readonly takerFee: string,
  ) {
    super();
  }

  getEventName(): string {
    return 'trade.executed';
  }
}

export class TradeCancelledEvent extends DomainEvent {
  constructor(
    public readonly tradeId: Uuid,
    public readonly reason: string,
  ) {
    super();
  }

  getEventName(): string {
    return 'trade.cancelled';
  }
}
