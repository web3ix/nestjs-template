# Domain Layer

The domain layer contains pure business logic with no external dependencies.

## Responsibilities

- **Business Entities**: Core domain objects with identity
- **Value Objects**: Immutable objects defined by attributes
- **Domain Events**: Events representing business occurrences
- **Repository Interfaces**: Contracts for data access
- **Domain Services**: Business logic that doesn't belong to entities
- **Business Rules**: Validation and constraints

## Structure

```
src/domains/{context}/domain/
├── entities/              # Business entities
├── value-objects/         # Immutable value objects  
├── events/                # Domain events
├── repositories/          # Repository interfaces
├── services/              # Domain services
└── exceptions/            # Domain-specific exceptions
```

## Entities

Entities have identity and lifecycle:

```typescript
export class Order {
  private items: OrderItem[] = []
  private status: OrderStatus = OrderStatus.PENDING

  constructor(
    public readonly id: Uuid,
    public readonly userId: Uuid,
    public readonly createdAt: Date,
  ) {}

  addItem(product: Product, quantity: number): void {
    if (this.status !== OrderStatus.PENDING) {
      throw new Error('Cannot modify confirmed order')
    }

    if (quantity <= 0) {
      throw new Error('Quantity must be positive')
    }

    const item = new OrderItem(product.id, quantity, product.price)
    this.items.push(item)
  }

  confirm(): void {
    if (this.items.length === 0) {
      throw new Error('Cannot confirm empty order')
    }

    this.status = OrderStatus.CONFIRMED
  }

  calculateTotal(): Money {
    return this.items.reduce(
      (sum, item) => sum.add(item.subtotal()),
      Money.zero(),
    )
  }
}
```

## Value Objects

Immutable objects without identity:

```typescript
export class Money {
  private constructor(
    private readonly amount: number,
    private readonly currency: string,
  ) {
    if (amount < 0) {
      throw new Error('Amount cannot be negative')
    }
  }

  static create(amount: number, currency: string): Money {
    return new Money(amount, currency)
  }

  static zero(): Money {
    return new Money(0, 'USD')
  }

  add(other: Money): Money {
    if (this.currency !== other.currency) {
      throw new Error('Cannot add different currencies')
    }
    return new Money(this.amount + other.amount, this.currency)
  }

  multiply(factor: number): Money {
    return new Money(this.amount * factor, this.currency)
  }

  toString(): string {
    return `${this.amount} ${this.currency}`
  }
}
```

## Aggregates

Cluster of entities with root:

```typescript
export class ShoppingCart {
  private items: Map<string, CartItem> = new Map()

  constructor(
    public readonly id: Uuid,
    public readonly userId: Uuid,
  ) {}

  addItem(productId: string, quantity: number, price: Money): void {
    const existing = this.items.get(productId)

    if (existing) {
      existing.increaseQuantity(quantity)
    } else {
      this.items.set(productId, new CartItem(productId, quantity, price))
    }
  }

  removeItem(productId: string): void {
    this.items.delete(productId)
  }

  clear(): void {
    this.items.clear()
  }

  getItems(): CartItem[] {
    return Array.from(this.items.values())
  }

  calculateTotal(): Money {
    return this.getItems().reduce(
      (sum, item) => sum.add(item.subtotal()),
      Money.zero(),
    )
  }
}
```

## Repository Interfaces

Abstract data access:

```typescript
export abstract class OrderRepository {
  abstract findById(id: Uuid): Promise<Order | null>
  abstract findByUserId(userId: Uuid): Promise<Order[]>
  abstract save(order: Order): Promise<void>
  abstract delete(id: Uuid): Promise<void>
}
```

## Domain Services

Business logic spanning multiple entities:

```typescript
@Injectable()
export class PricingService {
  calculateDiscount(order: Order, user: User): Money {
    let discount = Money.zero()

    // VIP discount
    if (user.isVip()) {
      discount = discount.add(
        order.calculateTotal().multiply(0.1)
      )
    }

    // Bulk discount
    if (order.itemCount() > 10) {
      discount = discount.add(
        order.calculateTotal().multiply(0.05)
      )
    }

    return discount
  }

  applyDiscount(order: Order, discount: Money): Money {
    const total = order.calculateTotal()
    return total.subtract(discount)
  }
}
```

## Domain Events

Represent business occurrences:

```typescript
export class OrderPlacedEvent {
  constructor(
    public readonly orderId: Uuid,
    public readonly userId: Uuid,
    public readonly total: Money,
    public readonly occurredAt: Date = new Date(),
  ) {}
}

export class OrderCancelledEvent {
  constructor(
    public readonly orderId: Uuid,
    public readonly reason: string,
    public readonly occurredAt: Date = new Date(),
  ) {}
}
```

## Business Rules

Encapsulate domain constraints:

```typescript
export class MinimumOrderRule {
  private readonly minimumAmount = Money.create(10, 'USD')

  validate(order: Order): void {
    if (order.calculateTotal().isLessThan(this.minimumAmount)) {
      throw new Error(`Minimum order is ${this.minimumAmount}`)
    }
  }
}

export class StockAvailabilityRule {
  validate(product: Product, requestedQuantity: number): void {
    if (product.stock < requestedQuantity) {
      throw new Error('Insufficient stock')
    }
  }
}
```

## Domain Exceptions

Custom exceptions for domain errors:

```typescript
export class InsufficientStockException extends Error {
  constructor(
    public readonly productId: string,
    public readonly requested: number,
    public readonly available: number,
  ) {
    super(`Insufficient stock for product ${productId}`)
  }
}

export class InvalidOrderStateException extends Error {
  constructor(
    public readonly orderId: string,
    public readonly currentState: string,
  ) {
    super(`Invalid operation for order ${orderId} in state ${currentState}`)
  }
}
```

## Specifications

Query criteria as objects:

```typescript
export interface Specification<T> {
  isSatisfiedBy(entity: T): boolean
}

export class ActiveUserSpecification implements Specification<User> {
  isSatisfiedBy(user: User): boolean {
    return user.isActive && user.isVerified
  }
}

export class PremiumUserSpecification implements Specification<User> {
  isSatisfiedBy(user: User): boolean {
    return user.subscriptionLevel === 'premium'
  }
}

// Compose specifications
export class AndSpecification<T> implements Specification<T> {
  constructor(
    private readonly specs: Specification<T>[],
  ) {}

  isSatisfiedBy(entity: T): boolean {
    return this.specs.every(spec => spec.isSatisfiedBy(entity))
  }
}
```

## Factory Pattern

Create complex objects:

```typescript
export class OrderFactory {
  create(userId: Uuid): Order {
    return new Order(
      Uuid.generate(),
      userId,
      new Date(),
    )
  }

  createFromCart(cart: ShoppingCart): Order {
    const order = this.create(cart.userId)

    cart.getItems().forEach(item => {
      order.addItem(item.productId, item.quantity, item.price)
    })

    return order
  }
}
```

## Best Practices

### 1. No External Dependencies

Domain layer should have no dependencies on infrastructure:

```typescript
// ✅ Good - Pure domain logic
class User {
  changeEmail(newEmail: string): void {
    this.email = newEmail
  }
}

// ❌ Bad - Depends on infrastructure
class User {
  async changeEmail(newEmail: string): Promise<void> {
    this.email = newEmail
    await this.emailService.send(...)  // Infrastructure dependency!
  }
}
```

### 2. Rich Domain Models

Encapsulate behavior:

```typescript
// ✅ Good - Behavior in entity
class Account {
  private balance: Money

  withdraw(amount: Money): void {
    if (this.balance.isLessThan(amount)) {
      throw new InsufficientFundsException()
    }
    this.balance = this.balance.subtract(amount)
  }
}

// ❌ Bad - Anemic model
class Account {
  balance: number
}

// Service does all the work
class AccountService {
  withdraw(account: Account, amount: number) {
    if (account.balance < amount) throw new Error()
    account.balance -= amount
  }
}
```

### 3. Immutable Value Objects

```typescript
// ✅ Good - Immutable
class Email {
  private constructor(private readonly value: string) {}
  
  static create(value: string): Email {
    return new Email(value.toLowerCase())
  }
}

// ❌ Bad - Mutable
class Email {
  value: string
  
  setEmail(value: string) {
    this.value = value
  }
}
```

### 4. Validate at Construction

```typescript
// ✅ Good - Always valid
class Age {
  private constructor(private readonly value: number) {}

  static create(value: number): Age {
    if (value < 0 || value > 150) {
      throw new Error('Invalid age')
    }
    return new Age(value)
  }
}

// ❌ Bad - Can be invalid
class Age {
  value: number
}
```

## Testing

Domain layer is easiest to test (no dependencies):

```typescript
describe('Order', () => {
  it('should add item', () => {
    const order = new Order(Uuid.generate(), Uuid.generate(), new Date())
    const product = new Product('1', 'Test', Money.create(10, 'USD'))

    order.addItem(product, 2)

    expect(order.itemCount()).toBe(1)
    expect(order.calculateTotal()).toEqual(Money.create(20, 'USD'))
  })

  it('should not add item to confirmed order', () => {
    const order = new Order(Uuid.generate(), Uuid.generate(), new Date())
    order.confirm()

    expect(() => {
      order.addItem(product, 1)
    }).toThrow('Cannot modify confirmed order')
  })
})
```

## Next Steps

- [Application Layer](/architecture/application-layer)
- [Infrastructure Layer](/architecture/infrastructure-layer)
- [Domain-Driven Design](/guide/domain-driven-design)
