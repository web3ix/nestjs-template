# Messaging

Event-driven architecture using an event publisher/subscriber pattern.

## Overview

The messaging system provides:
- **Event Publishing**: Emit domain events
- **Event Handling**: Subscribe to events
- **Decoupling**: Separate concerns across domains
- **Async Processing**: Handle events asynchronously

## Publishing Events

### In Services

```typescript
@Injectable()
export class UserService {
  constructor(
    private readonly eventPublisher: EventPublisher,
  ) {}

  async createUser(email: string, password: string): Promise<User> {
    const user = await this.userRepository.create({ email, password })
    
    // Publish domain event
    await this.eventPublisher.publish('user.created', {
      userId: user.id,
      email: user.email,
      timestamp: new Date(),
    })
    
    return user
  }
}
```

### Event Types

Define event interfaces:

```typescript
export interface UserCreatedEvent {
  userId: string
  email: string
  timestamp: Date
}

export interface OrderPlacedEvent {
  orderId: string
  userId: string
  amount: number
  timestamp: Date
}
```

## Handling Events

### Event Handler Decorator

```typescript
import { EventHandler } from '@/infra/messaging/decorators/event-handler.decorator'

@Injectable()
export class UserEventHandler {
  constructor(
    private readonly mailService: MailService,
  ) {}

  @EventHandler('user.created')
  async handleUserCreated(event: UserCreatedEvent): Promise<void> {
    // Send welcome email
    await this.mailService.sendWelcomeEmail(event.email)
  }

  @EventHandler('user.verified')
  async handleUserVerified(event: UserVerifiedEvent): Promise<void> {
    // Log verification
    console.log(`User ${event.userId} verified`)
  }
}
```

### Multiple Handlers

Multiple handlers can subscribe to the same event:

```typescript
@EventHandler('order.placed')
async handleOrderPlaced(event: OrderPlacedEvent): Promise<void> {
  // Send confirmation email
}

@EventHandler('order.placed')
async logOrderPlaced(event: OrderPlacedEvent): Promise<void> {
  // Log to analytics
}
```

## Event Names

Use consistent naming:

- **Entity.Action**: `user.created`, `order.placed`
- **Dot notation**: Use dots to separate parts
- **Lowercase**: Always lowercase
- **Past tense**: Use past tense for actions

Examples:
- `user.created`
- `user.updated`
- `user.deleted`
- `order.placed`
- `payment.completed`
- `wallet.deposited`

## Event Payload

Keep payloads minimal:

```typescript
// ✅ Good - Only necessary data
{
  userId: '123',
  email: 'user@example.com',
  timestamp: new Date()
}

// ❌ Bad - Too much data
{
  user: { /* entire user object */ },
  request: { /* entire request */ },
  session: { /* entire session */ }
}
```

## Registration

Register event handlers in modules:

```typescript
@Module({
  imports: [MessagingModule],
  providers: [UserEventHandler],
})
export class UserModule {}
```

The `MessagingModule` automatically discovers and registers handlers.

## Error Handling

Wrap handlers in try-catch:

```typescript
@EventHandler('user.created')
async handleUserCreated(event: UserCreatedEvent): Promise<void> {
  try {
    await this.mailService.sendWelcomeEmail(event.email)
  } catch (error) {
    this.logger.error(`Failed to send welcome email: ${error.message}`)
    // Don't throw - other handlers should still run
  }
}
```

## Event Storage

Events can be persisted for:
- **Event Sourcing**: Rebuild state from events
- **Auditing**: Track all changes
- **Debugging**: Replay events

```typescript
@EventHandler('*')
async persistEvent(eventName: string, payload: any): Promise<void> {
  await this.eventRepository.save({
    name: eventName,
    payload,
    timestamp: new Date(),
  })
}
```

## Testing Events

### Publishing

```typescript
it('should publish user.created event', async () => {
  const spy = jest.spyOn(eventPublisher, 'publish')
  
  await service.createUser('user@example.com', 'password')
  
  expect(spy).toHaveBeenCalledWith('user.created', {
    userId: expect.any(String),
    email: 'user@example.com',
    timestamp: expect.any(Date),
  })
})
```

### Handling

```typescript
it('should handle user.created event', async () => {
  const event = {
    userId: '123',
    email: 'user@example.com',
    timestamp: new Date(),
  }
  
  await handler.handleUserCreated(event)
  
  expect(mailService.sendWelcomeEmail).toHaveBeenCalledWith(event.email)
})
```

## Best Practices

1. **Keep handlers idempotent**: Same event can be processed multiple times
2. **Handle errors gracefully**: Don't let one handler failure affect others
3. **Use specific events**: Prefer specific events over generic ones
4. **Document events**: Maintain a list of all domain events
5. **Version events**: Consider versioning for breaking changes

## Event Documentation

Maintain a list of all events:

```typescript
// src/infra/messaging/events/user.events.ts
export const USER_EVENTS = {
  CREATED: 'user.created',
  UPDATED: 'user.updated',
  DELETED: 'user.deleted',
  VERIFIED: 'user.verified',
} as const
```

## Advanced Patterns

### Event Sourcing

Store all state changes as events:

```typescript
class Account {
  private balance = 0
  private events: Event[] = []

  deposit(amount: number): void {
    const event = { type: 'deposited', amount }
    this.apply(event)
    this.events.push(event)
  }

  private apply(event: Event): void {
    if (event.type === 'deposited') {
      this.balance += event.amount
    }
  }
}
```

### CQRS

Separate read and write models:

```typescript
// Command side - emits events
class CreateUserCommand {
  async execute(): Promise<void> {
    const user = await this.repository.save(data)
    await this.eventPublisher.publish('user.created', user)
  }
}

// Query side - listens to events
@EventHandler('user.created')
async updateReadModel(event: UserCreatedEvent): Promise<void> {
  await this.readRepository.insert(event)
}
```

## Next Steps

- [Workers](/guide/workers) - Background job processing
- [WebSockets](/guide/websockets) - Real-time communication
- [Architecture](/architecture/overview) - System architecture
