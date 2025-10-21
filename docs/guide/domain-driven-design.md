# Domain-Driven Design

Learn about Domain-Driven Design (DDD) principles used in this project.

## What is DDD?

Domain-Driven Design is a software development approach that focuses on modeling software to match the business domain. It emphasizes:

- **Ubiquitous Language**: Common vocabulary between developers and domain experts
- **Bounded Contexts**: Clear boundaries between different parts of the system
- **Domain Models**: Rich models that encapsulate business logic
- **Layered Architecture**: Separation of concerns across layers

## Core Concepts

### Entities

Objects with identity that persist over time:

```typescript
export class User {
  constructor(
    public readonly id: Uuid,
    public email: string,
    private passwordHash: string,
  ) {}

  changeEmail(newEmail: string): void {
    // Business rule: validate email format
    if (!this.isValidEmail(newEmail)) {
      throw new Error('Invalid email format')
    }
    this.email = newEmail
  }

  private isValidEmail(email: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  }
}
```

### Value Objects

Immutable objects defined by their attributes:

```typescript
export class Email {
  private constructor(private readonly value: string) {}

  static create(email: string): Email {
    if (!this.isValid(email)) {
      throw new Error('Invalid email')
    }
    return new Email(email.toLowerCase())
  }

  private static isValid(email: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  }

  toString(): string {
    return this.value
  }
}
```

### Aggregates

Cluster of entities with a root:

```typescript
export class Order {
  private items: OrderItem[] = []

  addItem(product: Product, quantity: number): void {
    // Business rule: validate stock
    if (product.stock < quantity) {
      throw new Error('Insufficient stock')
    }

    const existingItem = this.items.find(item => 
      item.productId === product.id
    )

    if (existingItem) {
      existingItem.increaseQuantity(quantity)
    } else {
      this.items.push(new OrderItem(product.id, quantity, product.price))
    }
  }

  calculateTotal(): number {
    return this.items.reduce((sum, item) => sum + item.subtotal(), 0)
  }
}
```

### Repositories

Abstraction for data access:

```typescript
// Domain layer - Interface
export abstract class UserRepository {
  abstract findById(id: Uuid): Promise<User | null>
  abstract save(user: User): Promise<void>
  abstract delete(id: Uuid): Promise<void>
}

// Infrastructure layer - Implementation
@Injectable()
export class DrizzleUserRepository implements UserRepository {
  async findById(id: Uuid): Promise<User | null> {
    // Database access implementation
  }
}
```

### Domain Services

Operations that don't belong to entities:

```typescript
@Injectable()
export class TransferService {
  transfer(from: Account, to: Account, amount: Money): void {
    if (!from.canWithdraw(amount)) {
      throw new Error('Insufficient funds')
    }

    from.withdraw(amount)
    to.deposit(amount)
  }
}
```

## Layered Architecture

### Domain Layer

Pure business logic with no dependencies:

```
src/domains/{context}/domain/
├── entities/          # Business entities
├── value-objects/     # Value objects
├── repositories/      # Repository interfaces
└── services/          # Domain services
```

### Application Layer

Use cases and orchestration:

```
src/domains/{context}/application/
└── services/          # Application services
```

### Infrastructure Layer

Technical implementations:

```
src/domains/{context}/infrastructure/
└── persistence/       # Database implementations
```

## Best Practices

### 1. Rich Domain Models

Don't use anemic models:

```typescript
// ❌ Anemic Model
class User {
  id: string
  email: string
  isActive: boolean
}

// ✅ Rich Model
class User {
  private isActive: boolean = false

  activate(): void {
    if (this.isActive) {
      throw new Error('User already active')
    }
    this.isActive = true
  }

  deactivate(): void {
    if (!this.isActive) {
      throw new Error('User already inactive')
    }
    this.isActive = false
  }
}
```

### 2. Protect Invariants

Ensure business rules are always satisfied:

```typescript
class BankAccount {
  private balance: number

  withdraw(amount: number): void {
    // Invariant: balance cannot go negative
    if (this.balance < amount) {
      throw new Error('Insufficient funds')
    }
    this.balance -= amount
  }
}
```

### 3. Use Domain Events

Communicate between aggregates:

```typescript
class User {
  register(email: string, password: string): void {
    this.email = email
    this.passwordHash = hashPassword(password)
    
    // Publish domain event
    this.addDomainEvent(new UserRegisteredEvent(this.id, this.email))
  }
}
```

### 4. Separate Reads from Writes

CQRS pattern:

```typescript
// Command (Write)
class CreateUserCommand {
  constructor(
    public readonly email: string,
    public readonly password: string,
  ) {}
}

// Query (Read)
class FindUserQuery {
  constructor(public readonly id: Uuid) {}
}
```

## Ubiquitous Language

Use business terminology consistently:

- **Order** (not Transaction)
- **Customer** (not User when referring to buyers)
- **Wallet** (not Account for crypto addresses)
- **Deposit** (not Add Funds)

## Bounded Contexts

Each domain has clear boundaries:

```
domains/
├── user/              # User management context
├── order/             # Order processing context
└── payment/           # Payment processing context
```

Each context can have its own model of shared concepts.

## Testing Domain Logic

Test business rules in isolation:

```typescript
describe('User', () => {
  it('should not allow invalid email', () => {
    expect(() => {
      new User('invalid-email', 'password')
    }).toThrow('Invalid email')
  })

  it('should activate user', () => {
    const user = new User('user@example.com', 'password')
    user.activate()
    expect(user.isActive()).toBe(true)
  })
})
```

## Further Reading

- [Domain-Driven Design by Eric Evans](https://www.domainlanguage.com/ddd/)
- [Implementing DDD by Vaughn Vernon](https://vaughnvernon.com/)
- [DDD Reference](https://www.domainlanguage.com/ddd/reference/)

## Next Steps

- [Architecture Overview](/architecture/overview)
- [Domain Layer](/architecture/domain-layer)
- [Project Structure](/guide/project-structure)
