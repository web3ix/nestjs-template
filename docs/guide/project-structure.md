# Project Structure

This document explains the organization of the codebase following Domain-Driven Design (DDD) and Hexagonal Architecture principles.

## Directory Overview

```
nestjs-template/
├── .github/              # GitHub workflows and templates
├── .husky/               # Git hooks
├── docs/                 # VuePress documentation
├── k8s/                  # Kubernetes manifests
├── scripts/              # Utility scripts
├── src/                  # Application source code
│   ├── api/             # API layer (controllers, DTOs)
│   ├── app.module.ts    # Root application module
│   ├── common/          # Shared utilities and types
│   ├── config/          # Configuration modules
│   ├── constants/       # Application constants
│   ├── domains/         # Domain layer (business logic)
│   ├── generated/       # Auto-generated files (i18n)
│   ├── infra/           # Infrastructure layer
│   ├── main.ts          # Application entry point
│   └── workers/         # Background workers
├── test/                # End-to-end tests
└── package.json         # Dependencies and scripts
```

## Source Code Structure

### API Layer (`src/api/`)

HTTP interface for the application. Contains controllers and DTOs.

```
src/api/
├── api.module.ts           # API module aggregator
├── auth/                   # Authentication endpoints
│   ├── auth.controller.ts
│   ├── auth.service.ts
│   ├── auth.module.ts
│   ├── config/            # Auth-specific config
│   ├── dto/               # Request/response DTOs
│   └── types/             # JWT types
├── health/                 # Health check endpoints
└── fallback/              # Fallback/404 handler
```

**Responsibilities:**
- HTTP request/response handling
- DTO validation
- Route definitions
- Swagger documentation

### Domain Layer (`src/domains/`)

Core business logic organized by bounded contexts.

```
src/domains/
└── user/
    ├── user.module.ts
    ├── application/
    │   └── services/       # Application services (use cases)
    │       └── user.service.ts
    ├── domain/
    │   ├── entities/       # Domain entities
    │   │   ├── user.entity.ts
    │   │   └── session.entity.ts
    │   ├── enums/          # Domain enums
    │   └── repositories/   # Repository interfaces
    │       ├── user.repository.ts
    │       └── session.repository.ts
    └── infrastructure/
        └── persistence/    # Repository implementations
            └── repositories/
                ├── user.repository.ts
                └── session.repository.ts
```

**Layers:**
- **Domain**: Entities, value objects, repository interfaces
- **Application**: Business use cases and orchestration
- **Infrastructure**: Technical implementations (DB, external APIs)

### Infrastructure Layer (`src/infra/`)

External concerns and technical implementations.

```
src/infra/
├── cache/                  # Redis/Memory caching
│   ├── cache.module.ts
│   ├── interfaces/
│   └── services/
│       ├── redis-cache.service.ts
│       └── memory-cache.service.ts
├── database/               # ORM and database
│   ├── drizzle.module.ts
│   ├── drizzle.service.ts
│   ├── schema/            # Database schemas
│   ├── migrations/        # Database migrations
│   └── seed.ts           # Seed data
├── mail/                   # Email service
├── messaging/              # Event publishing/handling
│   ├── events/
│   ├── decorators/
│   └── services/
└── websocket/              # WebSocket gateway
    ├── websocket.module.ts
    ├── gateway/
    ├── guards/
    └── services/
```

### Common Layer (`src/common/`)

Shared utilities used across the application.

```
src/common/
├── decorators/             # Custom decorators
│   ├── public.decorator.ts
│   ├── current-user.decorator.ts
│   └── validators/        # Custom validators
├── domain/                 # Domain primitives
│   └── errors/
├── dto/                    # Shared DTOs
│   ├── cursor-pagination/
│   └── offset-pagination/
├── exceptions/             # Custom exceptions
├── filters/                # Exception filters
├── guards/                 # Auth guards
├── interceptors/           # HTTP interceptors
├── interfaces/             # Shared interfaces
├── types/                  # Type definitions
└── utils/                  # Utility functions
```

### Configuration (`src/config/`)

Strongly-typed configuration modules.

```
src/config/
├── config.type.ts          # Type aggregator
├── app.config.ts           # App configuration
├── auth.config.ts          # Auth configuration
└── redis.config.ts         # Redis configuration
```

### Workers (`src/workers/`)

Background job processors and scheduled tasks.

```
src/workers/
├── workers.module.ts       # Worker registration
├── config/                 # Worker configuration
└── services/
    └── distributed-lock.service.ts
```

## Module Organization

Each feature follows this pattern:

```
feature/
├── feature.module.ts       # Module definition
├── feature.controller.ts   # HTTP endpoints
├── feature.service.ts      # Business logic
├── dto/                    # Data transfer objects
│   ├── request.dto.ts
│   └── response.dto.ts
└── feature.spec.ts         # Unit tests
```

## Configuration Files

### Root Configuration

```
nestjs-template/
├── .env.example            # Environment template
├── .eslintrc.js           # ESLint rules
├── .prettierrc            # Prettier config
├── commitlint.config.mjs  # Commit message rules
├── drizzle.config.ts      # Drizzle ORM config
├── jest.config.json       # Jest test config
├── nest-cli.json          # NestJS CLI config
├── tsconfig.json          # TypeScript config
└── package.json           # Dependencies
```

## File Naming Conventions

- **Controllers**: `*.controller.ts`
- **Services**: `*.service.ts`
- **Modules**: `*.module.ts`
- **DTOs**: `*.dto.ts`
- **Entities**: `*.entity.ts`
- **Repositories**: `*.repository.ts`
- **Guards**: `*.guard.ts`
- **Interceptors**: `*.interceptor.ts`
- **Filters**: `*.filter.ts`
- **Decorators**: `*.decorator.ts`
- **Types**: `*.type.ts`
- **Interfaces**: `*.interface.ts`
- **Tests**: `*.spec.ts` (unit), `*.e2e-spec.ts` (E2E)

## Import Path Aliases

The project uses TypeScript path aliases for cleaner imports:

```typescript
import { UserService } from '@/domains/user/application/services/user.service'
import { AllConfigType } from '@/config/config.type'
import { CacheKey } from '@/constants/cache.constant'
```

Configured in `tsconfig.json`:

```json
{
  "compilerOptions": {
    "paths": {
      "@/*": ["src/*"]
    }
  }
}
```

## Key Design Patterns

### Dependency Injection

All services use constructor-based DI:

```typescript
@Injectable()
export class UserService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly sessionRepository: SessionRepository,
  ) {}
}
```

### Repository Pattern

Domain defines interfaces, infrastructure implements:

```typescript
// Domain layer - Interface
export abstract class UserRepository {
  abstract findById(id: Uuid): Promise<User | null>
  abstract create(data: CreateUserData): Promise<User>
}

// Infrastructure layer - Implementation
@Injectable()
export class DrizzleUserRepository implements UserRepository {
  async findById(id: Uuid): Promise<User | null> {
    // Implementation using Drizzle ORM
  }
}
```

### Event-Driven Architecture

Domain events for cross-cutting concerns:

```typescript
// Publish event
this.eventPublisher.publish('user.registered', { userId: user.id })

// Handle event
@EventHandler('user.registered')
async handleUserRegistered(payload: UserRegisteredEvent) {
  // Send welcome email
}
```

## Testing Structure

Tests are colocated with source files:

```
src/
├── api/
│   └── auth/
│       ├── auth.service.ts
│       └── auth.service.spec.ts   # Unit test
└── test/
    └── auth.e2e-spec.ts            # E2E test
```

## Next Steps

- [Domain-Driven Design](/guide/domain-driven-design) - Understand DDD principles
- [Conventions](/guide/conventions) - Coding standards
- [Database](/guide/database) - Database layer details
