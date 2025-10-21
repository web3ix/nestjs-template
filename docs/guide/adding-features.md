# Adding Features

Learn how to add new features while maintaining architecture and code quality.

## Planning a Feature

Before coding, consider:

1. **Domain Boundaries**: Which domain does it belong to?
2. **Dependencies**: What existing modules does it need?
3. **Database Changes**: New tables or columns needed?
4. **API Design**: What endpoints will be exposed?
5. **Testing Strategy**: How will you test it?

## Creating a New Domain

### 1. Domain Structure

Create the domain directory structure:

```bash
mkdir -p src/domains/product
mkdir -p src/domains/product/domain/entities
mkdir -p src/domains/product/domain/repositories
mkdir -p src/domains/product/application/services
mkdir -p src/domains/product/infrastructure/persistence/repositories
```

### 2. Domain Entity

Define the core business entity:

```typescript
// src/domains/product/domain/entities/product.entity.ts
export class Product {
  constructor(
    public readonly id: Uuid,
    public name: string,
    public price: number,
    public stock: number,
    public readonly createdAt: Date,
  ) {}

  canPurchase(quantity: number): boolean {
    return this.stock >= quantity
  }

  decreaseStock(quantity: number): void {
    if (!this.canPurchase(quantity)) {
      throw new Error('Insufficient stock')
    }
    this.stock -= quantity
  }

  updatePrice(newPrice: number): void {
    if (newPrice < 0) {
      throw new Error('Price cannot be negative')
    }
    this.price = newPrice
  }
}
```

### 3. Repository Interface

Define the data access contract:

```typescript
// src/domains/product/domain/repositories/product.repository.ts
export abstract class ProductRepository {
  abstract findById(id: Uuid): Promise<Product | null>
  abstract findAll(): Promise<Product[]>
  abstract create(data: CreateProductData): Promise<Product>
  abstract update(id: Uuid, data: UpdateProductData): Promise<Product>
  abstract delete(id: Uuid): Promise<void>
}
```

### 4. Database Schema

Add the database schema:

```typescript
// src/infra/database/schema/product.schema.ts
import { pgTable, uuid, varchar, decimal, integer, timestamp } from 'drizzle-orm/pg-core'

export const products = pgTable('products', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 255 }).notNull(),
  price: decimal('price', { precision: 10, scale: 2 }).notNull(),
  stock: integer('stock').notNull().default(0),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
})
```

Generate and run migration:

```bash
pnpm db:generate
pnpm db:migrate
```

### 5. Repository Implementation

Implement the repository:

```typescript
// src/domains/product/infrastructure/persistence/repositories/product.repository.ts
import { Injectable } from '@nestjs/common'
import { DrizzleService } from '@/infra/database/drizzle.service'
import { products } from '@/infra/database/schema'
import { eq } from 'drizzle-orm'
import { Product } from '@/domains/product/domain/entities/product.entity'
import { ProductRepository } from '@/domains/product/domain/repositories/product.repository'

@Injectable()
export class DrizzleProductRepository implements ProductRepository {
  constructor(private readonly drizzle: DrizzleService) {}

  async findById(id: Uuid): Promise<Product | null> {
    const db = this.drizzle.getDb()
    const [row] = await db
      .select()
      .from(products)
      .where(eq(products.id, id))
      .limit(1)

    return row ? this.toDomain(row) : null
  }

  async create(data: CreateProductData): Promise<Product> {
    const db = this.drizzle.getDb()
    const [row] = await db
      .insert(products)
      .values(data)
      .returning()

    return this.toDomain(row)
  }

  private toDomain(row: any): Product {
    return new Product(
      row.id,
      row.name,
      parseFloat(row.price),
      row.stock,
      row.createdAt,
    )
  }
}
```

### 6. Application Service

Create the business logic service:

```typescript
// src/domains/product/application/services/product.service.ts
import { Injectable } from '@nestjs/common'
import { ProductRepository } from '@/domains/product/domain/repositories/product.repository'
import { Product } from '@/domains/product/domain/entities/product.entity'

@Injectable()
export class ProductService {
  constructor(
    private readonly productRepository: ProductRepository,
  ) {}

  async createProduct(name: string, price: number, stock: number): Promise<Product> {
    const product = await this.productRepository.create({
      name,
      price,
      stock,
    })

    return product
  }

  async getProduct(id: Uuid): Promise<Product> {
    const product = await this.productRepository.findById(id)
    
    if (!product) {
      throw new NotFoundException(`Product ${id} not found`)
    }

    return product
  }

  async purchaseProduct(id: Uuid, quantity: number): Promise<Product> {
    const product = await this.getProduct(id)
    
    product.decreaseStock(quantity)
    
    return await this.productRepository.update(id, {
      stock: product.stock,
    })
  }
}
```

### 7. DTOs

Define request and response DTOs:

```typescript
// src/api/product/dto/create-product.req.dto.ts
import { IsString, IsNumber, IsPositive, Min } from 'class-validator'

export class CreateProductReqDto {
  @IsString()
  @IsNotEmpty()
  name: string

  @IsNumber()
  @IsPositive()
  price: number

  @IsNumber()
  @Min(0)
  stock: number
}

// src/api/product/dto/product.res.dto.ts
import { Expose } from 'class-transformer'

export class ProductResDto {
  @Expose()
  id: string

  @Expose()
  name: string

  @Expose()
  price: number

  @Expose()
  stock: number

  @Expose()
  createdAt: Date
}
```

### 8. Controller

Create the API controller:

```typescript
// src/api/product/product.controller.ts
import { Controller, Get, Post, Body, Param } from '@nestjs/common'
import { ApiTags, ApiOperation } from '@nestjs/swagger'
import { ProductService } from '@/domains/product/application/services/product.service'
import { CreateProductReqDto } from './dto/create-product.req.dto'
import { ProductResDto } from './dto/product.res.dto'
import { plainToInstance } from 'class-transformer'

@ApiTags('products')
@Controller('products')
export class ProductController {
  constructor(
    private readonly productService: ProductService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Create a new product' })
  async create(@Body() dto: CreateProductReqDto): Promise<ProductResDto> {
    const product = await this.productService.createProduct(
      dto.name,
      dto.price,
      dto.stock,
    )

    return plainToInstance(ProductResDto, product)
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get product by ID' })
  async findOne(@Param('id') id: string): Promise<ProductResDto> {
    const product = await this.productService.getProduct(id)
    return plainToInstance(ProductResDto, product)
  }
}
```

### 9. Module

Wire everything together:

```typescript
// src/domains/product/product.module.ts
import { Module } from '@nestjs/common'
import { ProductService } from './application/services/product.service'
import { ProductRepository } from './domain/repositories/product.repository'
import { DrizzleProductRepository } from './infrastructure/persistence/repositories/product.repository'
import { ProductController } from '@/api/product/product.controller'

@Module({
  controllers: [ProductController],
  providers: [
    ProductService,
    {
      provide: ProductRepository,
      useClass: DrizzleProductRepository,
    },
  ],
  exports: [ProductService],
})
export class ProductModule {}
```

Register in `AppModule`:

```typescript
// src/app.module.ts
import { ProductModule } from './domains/product/product.module'

@Module({
  imports: [
    // ... other modules
    ProductModule,
  ],
})
export class AppModule {}
```

## Adding to Existing Domain

### 1. Extend Entity

Add new business logic to existing entity:

```typescript
export class User {
  // Existing properties...

  updateProfile(name: string, bio: string): void {
    this.validateName(name)
    this.name = name
    this.bio = bio
  }

  private validateName(name: string): void {
    if (name.length < 2) {
      throw new Error('Name too short')
    }
  }
}
```

### 2. Add Repository Method

Extend repository interface:

```typescript
export abstract class UserRepository {
  // Existing methods...
  abstract findByEmail(email: string): Promise<User | null>
  abstract searchByName(query: string): Promise<User[]> // New method
}
```

Implement in repository:

```typescript
async searchByName(query: string): Promise<User[]> {
  const db = this.drizzle.getDb()
  const rows = await db
    .select()
    .from(users)
    .where(like(users.name, `%${query}%`))

  return rows.map(this.toDomain)
}
```

### 3. Add Service Method

Add business logic:

```typescript
export class UserService {
  // Existing methods...

  async searchUsers(query: string): Promise<User[]> {
    return await this.userRepository.searchByName(query)
  }
}
```

### 4. Add Controller Endpoint

```typescript
@Get('search')
@ApiOperation({ summary: 'Search users by name' })
async search(@Query('q') query: string): Promise<UserResDto[]> {
  const users = await this.userService.searchUsers(query)
  return users.map(user => plainToInstance(UserResDto, user))
}
```

## Adding Database Column

### 1. Update Schema

```typescript
export const users = pgTable('users', {
  // Existing columns...
  phoneNumber: varchar('phone_number', { length: 20 }), // New column
})
```

### 2. Generate Migration

```bash
pnpm db:generate
```

### 3. Review Migration

Check generated SQL in `src/infra/database/migrations/`:

```sql
ALTER TABLE "users" ADD COLUMN "phone_number" varchar(20);
```

### 4. Run Migration

```bash
pnpm db:migrate
```

### 5. Update Entity

```typescript
export class User {
  constructor(
    public readonly id: Uuid,
    public email: string,
    public phoneNumber: string | null, // New property
    // ...
  ) {}
}
```

## Adding Background Job

### 1. Define Job Data

```typescript
// src/common/interfaces/job.interface.ts
export interface ISendNotificationJob {
  userId: string
  message: string
  type: 'email' | 'push'
}
```

### 2. Create Worker

```typescript
// src/workers/notification.worker.ts
import { Processor, WorkerHost } from '@nestjs/bullmq'
import { Job } from 'bullmq'

@Processor('notification')
export class NotificationWorker extends WorkerHost {
  async process(job: Job<ISendNotificationJob>): Promise<any> {
    const { userId, message, type } = job.data

    if (type === 'email') {
      await this.sendEmail(userId, message)
    } else {
      await this.sendPush(userId, message)
    }

    return { sent: true }
  }
}
```

### 3. Register Queue

```typescript
// src/workers/workers.module.ts
BullModule.registerQueue({ name: 'notification' }),
```

### 4. Dispatch Job

```typescript
@Injectable()
export class UserService {
  constructor(
    @InjectQueue('notification')
    private readonly notificationQueue: Queue,
  ) {}

  async notifyUser(userId: string, message: string): Promise<void> {
    await this.notificationQueue.add('send-notification', {
      userId,
      message,
      type: 'email',
    })
  }
}
```

## Adding Event Handler

### 1. Define Event

```typescript
// src/infra/messaging/events/product.events.ts
export interface ProductCreatedEvent {
  productId: string
  name: string
  price: number
  timestamp: Date
}
```

### 2. Publish Event

```typescript
export class ProductService {
  constructor(
    private readonly eventPublisher: EventPublisher,
  ) {}

  async createProduct(data: CreateProductData): Promise<Product> {
    const product = await this.productRepository.create(data)

    await this.eventPublisher.publish('product.created', {
      productId: product.id,
      name: product.name,
      price: product.price,
      timestamp: new Date(),
    })

    return product
  }
}
```

### 3. Handle Event

```typescript
// src/domains/analytics/application/handlers/product.handler.ts
import { EventHandler } from '@/infra/messaging/decorators/event-handler.decorator'

@Injectable()
export class ProductEventHandler {
  @EventHandler('product.created')
  async handleProductCreated(event: ProductCreatedEvent): Promise<void> {
    // Log to analytics
    await this.analyticsService.track('product_created', {
      productId: event.productId,
      price: event.price,
    })
  }
}
```

## Testing New Features

### Unit Tests

```typescript
describe('ProductService', () => {
  let service: ProductService
  let repository: ProductRepository

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        ProductService,
        {
          provide: ProductRepository,
          useValue: {
            create: jest.fn(),
            findById: jest.fn(),
          },
        },
      ],
    }).compile()

    service = module.get<ProductService>(ProductService)
    repository = module.get<ProductRepository>(ProductRepository)
  })

  it('should create product', async () => {
    const productData = { name: 'Test', price: 10, stock: 5 }
    const product = new Product('1', 'Test', 10, 5, new Date())

    jest.spyOn(repository, 'create').mockResolvedValue(product)

    const result = await service.createProduct(
      productData.name,
      productData.price,
      productData.stock,
    )

    expect(result).toEqual(product)
    expect(repository.create).toHaveBeenCalledWith(productData)
  })
})
```

### E2E Tests

```typescript
describe('Product API (e2e)', () => {
  let app: INestApplication

  beforeEach(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile()

    app = moduleFixture.createNestApplication()
    await app.init()
  })

  it('/products (POST)', () => {
    return request(app.getHttpServer())
      .post('/products')
      .send({
        name: 'Test Product',
        price: 99.99,
        stock: 10,
      })
      .expect(201)
      .expect((res) => {
        expect(res.body.id).toBeDefined()
        expect(res.body.name).toBe('Test Product')
      })
  })
})
```

## Documentation

Update documentation for new features:

1. **API Docs**: Add Swagger decorators
2. **README**: Update features list if significant
3. **Guides**: Create guides for complex features
4. **CHANGELOG**: Document changes

## Next Steps

- [Conventions](/guide/conventions) - Follow coding standards
- [Domain-Driven Design](/guide/domain-driven-design) - DDD principles
- [Project Structure](/guide/project-structure) - Understand architecture
- [Testing](/guide/testing) - Write comprehensive tests
