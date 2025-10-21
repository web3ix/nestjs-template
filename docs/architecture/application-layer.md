# Application Layer

The application layer orchestrates business use cases and coordinates domain objects.

## Responsibilities

- **Use Cases**: Business scenarios and workflows
- **Transaction Management**: Ensure data consistency
- **Event Publishing**: Emit domain events
- **Service Orchestration**: Coordinate multiple services
- **DTO Mapping**: Transform between layers

## Structure

```
src/domains/{context}/application/
├── services/              # Application services
├── commands/              # Command handlers (CQRS)
├── queries/               # Query handlers (CQRS)
└── dto/                   # Application DTOs
```

## Application Services

Orchestrate business logic:

```typescript
@Injectable()
export class OrderService {
  constructor(
    private readonly orderRepository: OrderRepository,
    private readonly userRepository: UserRepository,
    private readonly productRepository: ProductRepository,
    private readonly eventPublisher: EventPublisher,
  ) {}

  async placeOrder(
    userId: Uuid,
    items: OrderItemDto[],
  ): Promise<Order> {
    // 1. Validate user
    const user = await this.userRepository.findById(userId)
    if (!user) {
      throw new NotFoundException('User not found')
    }

    // 2. Create order
    const order = new Order(Uuid.generate(), userId, new Date())

    // 3. Add items and validate stock
    for (const item of items) {
      const product = await this.productRepository.findById(item.productId)
      if (!product) {
        throw new NotFoundException(`Product ${item.productId} not found`)
      }

      if (!product.canPurchase(item.quantity)) {
        throw new InsufficientStockException(
          product.id,
          item.quantity,
          product.stock,
        )
      }

      order.addItem(product, item.quantity)
      product.decreaseStock(item.quantity)
      await this.productRepository.update(product.id, product)
    }

    // 4. Confirm order
    order.confirm()

    // 5. Save order
    await this.orderRepository.save(order)

    // 6. Publish domain event
    await this.eventPublisher.publish('order.placed', {
      orderId: order.id,
      userId: order.userId,
      total: order.calculateTotal().toNumber(),
      timestamp: new Date(),
    })

    return order
  }

  async cancelOrder(orderId: Uuid, reason: string): Promise<void> {
    const order = await this.orderRepository.findById(orderId)
    if (!order) {
      throw new NotFoundException('Order not found')
    }

    order.cancel(reason)

    // Restore stock
    for (const item of order.getItems()) {
      const product = await this.productRepository.findById(item.productId)
      product.increaseStock(item.quantity)
      await this.productRepository.update(product.id, product)
    }

    await this.orderRepository.save(order)

    await this.eventPublisher.publish('order.cancelled', {
      orderId: order.id,
      reason,
      timestamp: new Date(),
    })
  }
}
```

## Transaction Management

Use database transactions for consistency:

```typescript
@Injectable()
export class TransferService {
  constructor(
    private readonly accountRepository: AccountRepository,
    private readonly drizzle: DrizzleService,
  ) {}

  async transfer(
    fromAccountId: Uuid,
    toAccountId: Uuid,
    amount: Money,
  ): Promise<void> {
    await this.drizzle.getDb().transaction(async (tx) => {
      // Load accounts
      const fromAccount = await this.accountRepository.findById(
        fromAccountId,
        tx,
      )
      const toAccount = await this.accountRepository.findById(toAccountId, tx)

      if (!fromAccount || !toAccount) {
        throw new NotFoundException('Account not found')
      }

      // Business logic
      fromAccount.withdraw(amount)
      toAccount.deposit(amount)

      // Save changes (within same transaction)
      await this.accountRepository.save(fromAccount, tx)
      await this.accountRepository.save(toAccount, tx)
    })
  }
}
```

## CQRS Pattern

### Commands (Write Operations)

```typescript
// Command
export class CreateUserCommand {
  constructor(
    public readonly email: string,
    public readonly password: string,
  ) {}
}

// Command Handler
@Injectable()
export class CreateUserHandler {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly eventPublisher: EventPublisher,
  ) {}

  async execute(command: CreateUserCommand): Promise<User> {
    // Validate
    const exists = await this.userRepository.findByEmail(command.email)
    if (exists) {
      throw new ConflictException('Email already exists')
    }

    // Create
    const passwordHash = await hashPassword(command.password)
    const user = await this.userRepository.create({
      email: command.email,
      passwordHash,
    })

    // Publish event
    await this.eventPublisher.publish('user.created', {
      userId: user.id,
      email: user.email,
    })

    return user
  }
}
```

### Queries (Read Operations)

```typescript
// Query
export class FindUserByIdQuery {
  constructor(public readonly userId: Uuid) {}
}

// Query Handler
@Injectable()
export class FindUserByIdHandler {
  constructor(
    private readonly userRepository: UserRepository,
  ) {}

  async execute(query: FindUserByIdQuery): Promise<User | null> {
    return await this.userRepository.findById(query.userId)
  }
}
```

## Event Publishing

Publish domain events:

```typescript
@Injectable()
export class UserService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly eventPublisher: EventPublisher,
  ) {}

  async verifyEmail(userId: Uuid): Promise<void> {
    const user = await this.userRepository.findById(userId)
    if (!user) {
      throw new NotFoundException('User not found')
    }

    user.verify()
    await this.userRepository.save(user)

    // Publish multiple events if needed
    await Promise.all([
      this.eventPublisher.publish('user.verified', {
        userId: user.id,
        timestamp: new Date(),
      }),
      this.eventPublisher.publish('analytics.track', {
        event: 'email_verified',
        userId: user.id,
      }),
    ])
  }
}
```

## Service Composition

Compose multiple services:

```typescript
@Injectable()
export class CheckoutService {
  constructor(
    private readonly orderService: OrderService,
    private readonly paymentService: PaymentService,
    private readonly inventoryService: InventoryService,
    private readonly notificationService: NotificationService,
  ) {}

  async checkout(
    userId: Uuid,
    cartItems: CartItemDto[],
    paymentMethod: PaymentMethod,
  ): Promise<CheckoutResult> {
    // 1. Reserve inventory
    const reservation = await this.inventoryService.reserve(cartItems)

    try {
      // 2. Create order
      const order = await this.orderService.placeOrder(userId, cartItems)

      // 3. Process payment
      const payment = await this.paymentService.charge(
        userId,
        order.calculateTotal(),
        paymentMethod,
      )

      // 4. Confirm inventory
      await this.inventoryService.confirmReservation(reservation.id)

      // 5. Send notifications
      await this.notificationService.sendOrderConfirmation(userId, order.id)

      return {
        orderId: order.id,
        paymentId: payment.id,
        status: 'success',
      }
    } catch (error) {
      // Rollback inventory reservation
      await this.inventoryService.cancelReservation(reservation.id)
      throw error
    }
  }
}
```

## DTO Mapping

Map between layers:

```typescript
@Injectable()
export class OrderService {
  async getOrderDetails(orderId: Uuid): Promise<OrderDetailsDto> {
    const order = await this.orderRepository.findById(orderId)
    if (!order) {
      throw new NotFoundException('Order not found')
    }

    // Map domain entity to DTO
    return {
      id: order.id,
      userId: order.userId,
      status: order.status,
      items: order.getItems().map(item => ({
        productId: item.productId,
        quantity: item.quantity,
        price: item.price.toNumber(),
        subtotal: item.subtotal().toNumber(),
      })),
      total: order.calculateTotal().toNumber(),
      createdAt: order.createdAt,
    }
  }
}
```

## Error Handling

Handle domain errors and convert to application exceptions:

```typescript
@Injectable()
export class PaymentService {
  async processPayment(
    userId: Uuid,
    amount: Money,
  ): Promise<Payment> {
    try {
      const user = await this.userRepository.findById(userId)
      const payment = user.createPayment(amount)

      return await this.paymentRepository.save(payment)
    } catch (error) {
      if (error instanceof InsufficientFundsException) {
        throw new BadRequestException('Insufficient funds')
      }

      if (error instanceof InvalidPaymentMethodException) {
        throw new BadRequestException('Invalid payment method')
      }

      // Log and rethrow unexpected errors
      this.logger.error('Payment processing failed', error)
      throw new InternalServerErrorException('Payment processing failed')
    }
  }
}
```

## Async Operations

Handle long-running operations:

```typescript
@Injectable()
export class ReportService {
  constructor(
    @InjectQueue('report')
    private readonly reportQueue: Queue,
  ) {}

  async generateReport(
    userId: Uuid,
    type: ReportType,
  ): Promise<{ jobId: string }> {
    // Queue the report generation
    const job = await this.reportQueue.add('generate-report', {
      userId,
      type,
      requestedAt: new Date(),
    })

    return { jobId: job.id }
  }

  async getReportStatus(jobId: string): Promise<ReportStatus> {
    const job = await this.reportQueue.getJob(jobId)

    if (!job) {
      throw new NotFoundException('Job not found')
    }

    return {
      id: job.id,
      status: await job.getState(),
      progress: job.progress,
      result: job.returnvalue,
    }
  }
}
```

## Testing

Test application services with mocks:

```typescript
describe('OrderService', () => {
  let service: OrderService
  let orderRepository: jest.Mocked<OrderRepository>
  let userRepository: jest.Mocked<UserRepository>
  let productRepository: jest.Mocked<ProductRepository>
  let eventPublisher: jest.Mocked<EventPublisher>

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        OrderService,
        {
          provide: OrderRepository,
          useValue: {
            save: jest.fn(),
            findById: jest.fn(),
          },
        },
        {
          provide: UserRepository,
          useValue: {
            findById: jest.fn(),
          },
        },
        {
          provide: ProductRepository,
          useValue: {
            findById: jest.fn(),
            update: jest.fn(),
          },
        },
        {
          provide: EventPublisher,
          useValue: {
            publish: jest.fn(),
          },
        },
      ],
    }).compile()

    service = module.get<OrderService>(OrderService)
    orderRepository = module.get(OrderRepository)
    userRepository = module.get(UserRepository)
    productRepository = module.get(ProductRepository)
    eventPublisher = module.get(EventPublisher)
  })

  it('should place order', async () => {
    const userId = Uuid.generate()
    const user = new User(userId, 'user@test.com')
    const product = new Product('1', 'Test', Money.create(10, 'USD'), 5)

    userRepository.findById.mockResolvedValue(user)
    productRepository.findById.mockResolvedValue(product)
    orderRepository.save.mockResolvedValue(undefined)

    const order = await service.placeOrder(userId, [
      { productId: '1', quantity: 2 },
    ])

    expect(order).toBeDefined()
    expect(orderRepository.save).toHaveBeenCalled()
    expect(eventPublisher.publish).toHaveBeenCalledWith(
      'order.placed',
      expect.any(Object),
    )
  })

  it('should throw if insufficient stock', async () => {
    const userId = Uuid.generate()
    const user = new User(userId, 'user@test.com')
    const product = new Product('1', 'Test', Money.create(10, 'USD'), 1)

    userRepository.findById.mockResolvedValue(user)
    productRepository.findById.mockResolvedValue(product)

    await expect(
      service.placeOrder(userId, [{ productId: '1', quantity: 10 }]),
    ).rejects.toThrow(InsufficientStockException)
  })
})
```

## Best Practices

1. **Keep services thin**: Delegate to domain objects
2. **Use transactions**: For multi-step operations
3. **Publish events**: For cross-domain communication
4. **Handle errors**: Convert domain errors to HTTP exceptions
5. **Test thoroughly**: Mock repositories and dependencies
6. **No business logic**: Logic belongs in domain layer

## Next Steps

- [Domain Layer](/architecture/domain-layer)
- [Infrastructure Layer](/architecture/infrastructure-layer)
- [Adding Features](/guide/adding-features)
