# Messaging Infrastructure

Event-driven messaging system for the Maven Exchange platform using domain events.

## Overview

The messaging module provides an event-driven architecture for decoupling domain logic and enabling reactive features like notifications, analytics, and real-time updates.

## Features

- **Domain Events**: Type-safe domain events with metadata
- **Event Publisher**: Publish single or multiple events
- **Event Subscribers**: Subscribe to specific events with decorators
- **Built on EventEmitter2**: Wildcard support, namespacing, and reliable delivery
- **Async Handling**: All event handlers are asynchronous
- **Logging**: Comprehensive logging for debugging

## Architecture

```
Domain Layer (aggregates/services)
    ↓ publishes
EventPublisher
    ↓ emits
EventEmitter2
    ↓ dispatches to
EventHandlers (subscribers)
```

## Installation

Import the `MessagingModule`:

```typescript
import { MessagingModule } from '@/infra/messaging/messaging.module';

@Module({
  imports: [MessagingModule],
})
export class YourModule {}
```

## Domain Events

### Base Event Class

All domain events extend `DomainEvent`:

```typescript
export abstract class DomainEvent {
  public readonly occurredAt: Date;
  public readonly eventId: Uuid;

  constructor() {
    this.occurredAt = new Date();
    this.eventId = Uuid.generate();
  }

  abstract getEventName(): string;
}
```

### Predefined Events

#### Order Events

```typescript
import {
  OrderCreatedEvent,
  OrderFilledEvent,
  OrderCancelledEvent,
  OrderExpiredEvent,
  OrderActivatedEvent,
  OrderRejectedEvent,
} from '@/infra/messaging/events/order.events';
```

**Order Created**
```typescript
const event = new OrderCreatedEvent(
  orderId,
  userId,
  tradingPairId,
  'LIMIT',
  'BUY',
  '1.5',
  '50000',
);
```

**Order Filled**
```typescript
const event = new OrderFilledEvent(
  orderId,
  userId,
  tradingPairId,
  '0.5', // filled quantity
  '50100', // fill price
  '1.0', // total filled
  false, // is completely filled
);
```

#### Trade Events

```typescript
import {
  TradeExecutedEvent,
  TradeCancelledEvent,
} from '@/infra/messaging/events/trade.events';
```

**Trade Executed**
```typescript
const event = new TradeExecutedEvent(
  tradeId,
  makerOrderId,
  takerOrderId,
  makerUserId,
  takerUserId,
  tradingPairId,
  '50000', // price
  '0.5', // quantity
  '0.5', // maker fee
  '1.0', // taker fee
);
```

#### Deposit Events

```typescript
import {
  DepositDetectedEvent,
  DepositConfirmedEvent,
  DepositCreditedEvent,
  DepositFailedEvent,
} from '@/infra/messaging/events/deposit.events';
```

**Deposit Detected**
```typescript
const event = new DepositDetectedEvent(
  depositId,
  walletId,
  chainTokenId,
  '1.5', // amount
  '0x123...', // tx hash
  '0xabc...', // address
);
```

**Deposit Confirmed**
```typescript
const event = new DepositConfirmedEvent(
  depositId,
  walletId,
  chainTokenId,
  '1.5',
  txHash,
  12, // confirmations
);
```

**Deposit Credited**
```typescript
const event = new DepositCreditedEvent(
  depositId,
  walletId,
  chainTokenId,
  '1.5',
  txHash,
);
```

#### Wallet/Balance Events

```typescript
import {
  BalanceCreditedEvent,
  BalanceDebitedEvent,
  BalanceLockedEvent,
  BalanceUnlockedEvent,
  WalletCreatedEvent,
} from '@/infra/messaging/events/wallet.events';
```

**Balance Credited**
```typescript
const event = new BalanceCreditedEvent(
  walletId,
  chainTokenId,
  '100.0', // amount
  '1100.0', // new balance
  'Deposit credited',
);
```

**Balance Locked**
```typescript
const event = new BalanceLockedEvent(
  walletId,
  chainTokenId,
  '50.0',
  '50.0', // new locked balance
  'Order placed',
);
```

## Publishing Events

### Inject the Publisher

```typescript
import { IEventPublisher } from '@/infra/messaging/interfaces/event.interface';

@Injectable()
export class OrderService {
  constructor(
    @Inject('IEventPublisher')
    private readonly eventPublisher: IEventPublisher,
  ) {}
}
```

### Publish Single Event

```typescript
async createOrder(params: CreateOrderParams): Promise<string> {
  const order = Order.create(params);
  await this.orderRepository.save(order);

  // Publish event
  const event = new OrderCreatedEvent(
    order.id,
    order.userId,
    order.tradingPairId,
    order.type,
    order.side,
    order.quantity,
    order.getPrice(),
  );

  await this.eventPublisher.publish(event);

  return order.id.toString();
}
```

### Publish Multiple Events

```typescript
async executeMatching(matches: Match[]): Promise<void> {
  const events: DomainEvent[] = [];

  for (const match of matches) {
    // Create trade event
    events.push(
      new TradeExecutedEvent(
        match.tradeId,
        match.makerOrderId,
        match.takerOrderId,
        match.makerUserId,
        match.takerUserId,
        match.tradingPairId,
        match.price,
        match.quantity,
        match.makerFee,
        match.takerFee,
      ),
    );

    // Create order filled events
    events.push(
      new OrderFilledEvent(
        match.makerOrderId,
        match.makerUserId,
        match.tradingPairId,
        match.quantity,
        match.price,
        match.makerTotalFilled,
        match.makerIsFilled,
      ),
    );

    events.push(
      new OrderFilledEvent(
        match.takerOrderId,
        match.takerUserId,
        match.tradingPairId,
        match.quantity,
        match.price,
        match.takerTotalFilled,
        match.takerIsFilled,
      ),
    );
  }

  // Publish all events at once
  await this.eventPublisher.publishMany(events);
}
```

## Subscribing to Events

### Create Event Handler

```typescript
import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { OrderCreatedEvent } from '@/infra/messaging/events/order.events';

@Injectable()
export class OrderNotificationHandler {
  constructor(
    private readonly notificationService: NotificationService,
  ) {}

  @OnEvent('order.created')
  async handleOrderCreated(event: OrderCreatedEvent): Promise<void> {
    await this.notificationService.sendNotification({
      userId: event.userId,
      type: 'ORDER_CREATED',
      title: 'Order Created',
      message: `Your ${event.side} order for ${event.quantity} has been placed`,
      data: {
        orderId: event.orderId.toString(),
        tradingPairId: event.tradingPairId.toString(),
      },
    });
  }
}
```

### Multiple Event Handlers

```typescript
@Injectable()
export class TradeAnalyticsHandler {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @OnEvent('trade.executed')
  async handleTradeExecuted(event: TradeExecutedEvent): Promise<void> {
    await this.analyticsService.recordTrade({
      tradeId: event.tradeId.toString(),
      pair: event.tradingPairId.toString(),
      price: event.price,
      quantity: event.quantity,
      timestamp: event.occurredAt,
    });
  }

  @OnEvent('order.filled')
  async handleOrderFilled(event: OrderFilledEvent): Promise<void> {
    await this.analyticsService.updateOrderMetrics({
      orderId: event.orderId.toString(),
      filledQuantity: event.filledQuantity,
      isFilled: event.isFilled,
    });
  }
}
```

### Wildcard Subscriptions

Subscribe to all events of a type:

```typescript
@Injectable()
export class AllOrdersHandler {
  @OnEvent('order.*')
  async handleAnyOrderEvent(event: DomainEvent): Promise<void> {
    console.log('Order event occurred:', event.getEventName());
  }
}
```

### Multiple Events

```typescript
@Injectable()
export class WebSocketHandler {
  @OnEvent(['order.created', 'order.filled', 'order.cancelled'])
  async handleOrderEvent(event: DomainEvent): Promise<void> {
    // Send to WebSocket clients
    await this.websocketGateway.broadcast(event.getEventName(), event);
  }
}
```

## Use Cases

### 1. Real-time Notifications

```typescript
@Injectable()
export class NotificationHandler {
  @OnEvent('deposit.credited')
  async handleDepositCredited(event: DepositCreditedEvent): Promise<void> {
    await this.pushNotification(event.walletId, {
      title: 'Deposit Confirmed',
      body: `${event.amount} has been credited to your account`,
    });
  }

  @OnEvent('order.filled')
  async handleOrderFilled(event: OrderFilledEvent): Promise<void> {
    await this.pushNotification(event.userId, {
      title: 'Order Filled',
      body: `Your order has been ${event.isFilled ? 'fully' : 'partially'} filled`,
    });
  }
}
```

### 2. WebSocket Broadcasting

```typescript
@Injectable()
export class WebSocketBroadcaster {
  @OnEvent('trade.executed')
  async broadcastTrade(event: TradeExecutedEvent): Promise<void> {
    // Broadcast to all clients subscribed to this trading pair
    await this.websocketGateway.to(`pair:${event.tradingPairId}`).emit('trade', {
      id: event.tradeId.toString(),
      price: event.price,
      quantity: event.quantity,
      timestamp: event.occurredAt,
    });
  }

  @OnEvent('order.*')
  async broadcastOrderUpdate(event: DomainEvent): Promise<void> {
    // Broadcast to user's personal channel
    if ('userId' in event) {
      await this.websocketGateway
        .to(`user:${event.userId}`)
        .emit('order.update', event);
    }
  }
}
```

### 3. Analytics & Metrics

```typescript
@Injectable()
export class MetricsCollector {
  @OnEvent('trade.executed')
  async recordTradeMetrics(event: TradeExecutedEvent): Promise<void> {
    await this.metricsService.increment('trades.total');
    await this.metricsService.increment(`trades.pair.${event.tradingPairId}`);
    await this.metricsService.histogram('trade.volume', parseFloat(event.quantity));
  }

  @OnEvent('order.created')
  async recordOrderMetrics(event: OrderCreatedEvent): Promise<void> {
    await this.metricsService.increment('orders.total');
    await this.metricsService.increment(`orders.${event.type}.${event.side}`);
  }
}
```

### 4. Audit Logging

```typescript
@Injectable()
export class AuditLogger {
  @OnEvent('balance.*')
  async logBalanceChange(event: DomainEvent): Promise<void> {
    await this.auditService.log({
      eventType: event.getEventName(),
      occurredAt: event.occurredAt,
      data: event,
    });
  }

  @OnEvent('order.*')
  async logOrderActivity(event: DomainEvent): Promise<void> {
    await this.auditService.log({
      eventType: event.getEventName(),
      occurredAt: event.occurredAt,
      data: event,
    });
  }
}
```

### 5. Email Notifications

```typescript
@Injectable()
export class EmailHandler {
  @OnEvent('deposit.credited')
  async sendDepositEmail(event: DepositCreditedEvent): Promise<void> {
    const user = await this.userService.findById(event.walletId);

    await this.emailService.send({
      to: user.email,
      template: 'deposit-credited',
      data: {
        amount: event.amount,
        txHash: event.txHash,
        timestamp: event.occurredAt,
      },
    });
  }

  @OnEvent('order.filled')
  async sendOrderFilledEmail(event: OrderFilledEvent): Promise<void> {
    if (event.isFilled) {
      const user = await this.userService.findById(event.userId);

      await this.emailService.send({
        to: user.email,
        template: 'order-filled',
        data: {
          orderId: event.orderId.toString(),
          quantity: event.totalFilled,
          price: event.price,
        },
      });
    }
  }
}
```

## Creating Custom Events

```typescript
import { Uuid } from '@/common/domain/value-objects/uuid.vo';
import { DomainEvent } from '@/infra/messaging/interfaces/event.interface';

export class WithdrawalRequestedEvent extends DomainEvent {
  constructor(
    public readonly withdrawalId: Uuid,
    public readonly userId: Uuid,
    public readonly chainTokenId: Uuid,
    public readonly amount: string,
    public readonly address: string,
  ) {
    super();
  }

  getEventName(): string {
    return 'withdrawal.requested';
  }
}
```

## Error Handling

Event handlers should handle their own errors:

```typescript
@Injectable()
export class SafeHandler {
  private readonly logger = new Logger(SafeHandler.name);

  @OnEvent('order.created')
  async handleOrderCreated(event: OrderCreatedEvent): Promise<void> {
    try {
      await this.processOrder(event);
    } catch (error) {
      this.logger.error('Failed to process order event:', error);
      // Don't throw - other handlers should still execute
    }
  }
}
```

## Testing

### Mock Event Publisher

```typescript
const mockEventPublisher = {
  publish: jest.fn(),
  publishMany: jest.fn(),
};

beforeEach(async () => {
  const module = await Test.createTestingModule({
    providers: [
      YourService,
      {
        provide: 'IEventPublisher',
        useValue: mockEventPublisher,
      },
    ],
  }).compile();
});

it('should publish order created event', async () => {
  await service.createOrder(params);

  expect(mockEventPublisher.publish).toHaveBeenCalledWith(
    expect.objectContaining({
      orderId: expect.any(Object),
      userId: expect.any(Object),
    }),
  );
});
```

### Test Event Handlers

```typescript
describe('OrderNotificationHandler', () => {
  it('should send notification on order created', async () => {
    const event = new OrderCreatedEvent(
      orderId,
      userId,
      tradingPairId,
      'LIMIT',
      'BUY',
      '1.0',
      '50000',
    );

    await handler.handleOrderCreated(event);

    expect(notificationService.sendNotification).toHaveBeenCalled();
  });
});
```

## Best Practices

1. **Keep handlers focused**: Each handler should do one thing
2. **Handle errors**: Don't let one handler's error affect others
3. **Async operations**: All handlers are async, use await
4. **Idempotency**: Handlers should be idempotent when possible
5. **Event naming**: Use dot notation for namespacing (e.g., `order.created`)
6. **Data in events**: Include all necessary data to avoid extra queries
7. **Don't modify domain**: Event handlers are read-only observers

## Performance Considerations

- Event emitting is synchronous but handlers run async
- Multiple handlers for same event run in parallel
- For high-frequency events, consider batching or sampling
- Use wildcards carefully - they match all events

## Configuration

The module is configured in `messaging.module.ts`:

```typescript
EventEmitterModule.forRoot({
  wildcard: true,           // Enable dot notation
  delimiter: '.',           // Event name separator
  maxListeners: 20,         // Max listeners per event
  verboseMemoryLeak: true,  // Warn on leaks
  ignoreErrors: false,      // Don't swallow errors
})
```

## Related Documentation

- EventEmitter2: https://github.com/EventEmitter2/EventEmitter2
- Event-Driven Architecture: https://martinfowler.com/articles/201701-event-driven.html
