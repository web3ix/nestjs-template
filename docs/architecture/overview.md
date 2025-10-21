# Architecture Overview

This document provides a high-level overview of the application architecture.

## Design Principles

The application follows these key principles:

1. **Domain-Driven Design (DDD)**: Business logic organized by domain
2. **Hexagonal Architecture**: Separation of concerns with ports and adapters
3. **SOLID Principles**: Maintainable and extensible code
4. **Type Safety**: Full TypeScript with strict mode
5. **Testability**: Dependency injection and interface-based design

## Architecture Layers

```
┌─────────────────────────────────────────────┐
│           API Layer (Controllers)           │
│         HTTP Requests/Responses             │
└─────────────────┬───────────────────────────┘
                  │
┌─────────────────▼───────────────────────────┐
│      Application Layer (Services)           │
│       Use Cases & Orchestration             │
└─────────────────┬───────────────────────────┘
                  │
┌─────────────────▼───────────────────────────┐
│         Domain Layer (Entities)             │
│      Business Logic & Rules                 │
└─────────────────┬───────────────────────────┘
                  │
┌─────────────────▼───────────────────────────┐
│    Infrastructure Layer (Adapters)          │
│   Database, Cache, External APIs            │
└─────────────────────────────────────────────┘
```

### API Layer

**Location**: `src/api/`

**Responsibilities**:
- HTTP request handling
- Request validation via DTOs
- Response serialization
- Route definitions
- API documentation (Swagger)

**Example**:
```typescript
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  async login(@Body() dto: LoginReqDto): Promise<LoginResDto> {
    return this.authService.signIn(dto)
  }
}
```

### Application Layer

**Location**: `src/domains/{context}/application/`

**Responsibilities**:
- Business use cases
- Transaction management
- Service orchestration
- Event publishing
- Cross-domain coordination

**Example**:
```typescript
@Injectable()
export class UserService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly eventPublisher: EventPublisher,
  ) {}

  async createUser(email: string, password: string): Promise<User> {
    // Business logic
    const user = await this.userRepository.create({ email, password })
    
    // Publish domain event
    this.eventPublisher.publish('user.created', { userId: user.id })
    
    return user
  }
}
```

### Domain Layer

**Location**: `src/domains/{context}/domain/`

**Responsibilities**:
- Business entities
- Value objects
- Domain events
- Business rules
- Repository interfaces

**Example**:
```typescript
export class User {
  constructor(
    public readonly id: Uuid,
    public email: string,
    private passwordHash: string,
    private kycStatus: KycStatus,
  ) {}

  verifyEmail(): void {
    if (this.isVerified) {
      throw new Error('Email already verified')
    }
    this.isVerified = true
  }

  getKycStatus(): KycStatus {
    return this.kycStatus
  }
}
```

### Infrastructure Layer

**Location**: `src/infra/`

**Responsibilities**:
- Database access
- Caching
- External API integration
- Message queues
- File storage
- Email sending

**Example**:
```typescript
@Injectable()
export class DrizzleUserRepository implements UserRepository {
  constructor(private readonly drizzle: DrizzleService) {}

  async findById(id: Uuid): Promise<User | null> {
    const db = this.drizzle.getDb()
    const [row] = await db
      .select()
      .from(users)
      .where(eq(users.id, id))
      
    return row ? this.toDomain(row) : null
  }
}
```

## Dependency Flow

Dependencies flow inward (Dependency Inversion Principle):

```
API Layer         ─────►  Application Layer
                         ▲
                         │
Infrastructure Layer ────┘
                         │
                         ▼
                  Domain Layer
```

- Domain layer has no dependencies
- Application layer depends on domain
- Infrastructure implements domain interfaces
- API layer depends on application

## Module Organization

Each domain is self-contained with its own module:

```
src/domains/user/
├── user.module.ts              # Module definition
├── application/
│   └── services/               # Use cases
│       └── user.service.ts
├── domain/
│   ├── entities/               # Business entities
│   ├── repositories/           # Repository interfaces
│   └── events/                 # Domain events
└── infrastructure/
    └── persistence/            # Repository implementations
```

## Cross-Cutting Concerns

Handled via:

- **Guards**: Authentication, authorization
- **Interceptors**: Logging, caching, transformation
- **Filters**: Exception handling
- **Pipes**: Validation, transformation
- **Middleware**: Request preprocessing

## Communication Patterns

### Synchronous

- HTTP REST API
- Direct service calls

### Asynchronous

- Event-driven architecture
- Message queues (BullMQ)
- WebSocket connections

## Data Flow

1. **Request** → API Layer (Controller)
2. **Validation** → DTO validation
3. **Business Logic** → Application Service
4. **Domain Rules** → Domain Entity
5. **Persistence** → Repository Implementation
6. **Response** → Serialize and return

## Testing Strategy

- **Unit Tests**: Test individual components
- **Integration Tests**: Test component interactions
- **E2E Tests**: Test complete user flows

Each layer is testable in isolation via mocking.

## Scalability

The architecture supports:

- **Horizontal scaling**: Stateless services
- **Vertical scaling**: Resource optimization
- **Microservices**: Domain separation
- **Caching**: Redis for distributed cache
- **Queue processing**: Background workers

## Security

- **Authentication**: JWT tokens
- **Authorization**: Role-based access control
- **Validation**: DTO validation with class-validator
- **Rate limiting**: Built-in throttling
- **CORS**: Configurable cross-origin policies
- **Helmet**: Security headers

## Next Steps

- [Domain Layer](/architecture/domain-layer)
- [Application Layer](/architecture/application-layer)
- [Infrastructure Layer](/architecture/infrastructure-layer)
- [API Layer](/architecture/api-layer)
