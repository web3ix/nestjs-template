# NestJS Boilerplate AGENTS.md

A high-performance, domain-driven NestJS boilerplate designed for scalable microservice architectures. Supports runtime configuration for multiple platforms, databases, and caching layers.

---

## Build & Test

### Install & Setup

- Install dependencies: `pnpm install`
- Generate environment file: `cp .env.example .env`
- Initialize database (Drizzle migrations): `pnpm db:migrate`
- Seed development data: `pnpm db:seed`

### Run

- Development: `pnpm start:dev`
- Production: `pnpm build && pnpm start:prod`
- Test (unit + integration): `pnpm test`
- Lint & format: `pnpm lint && pnpm format`

### Switch Platforms

- **HTTP Adapter**
  - Default: **Fastify**
    ```ts
    const app = await NestFactory.create<NestFastifyApplication>(AppModule, new FastifyAdapter());
    ```
  - Switch to Express:  
    Set `HTTP_PLATFORM=express`  
    Then in `main.ts`, use:
    ```ts
    const app = await NestFactory.create(AppModule);
    ```

- **Database**
  - **SQLite**: for local dev; use `DATABASE_URL="sqlite://db/dev.db"`.
  - **Postgres**: for production; set `DATABASE_URL="postgres://user:pass@host:5432/db"`.
  - The ORM automatically infers type from the URL scheme (sqlite or postgres).

- **Cache Layer**
  - **redis**: set `CACHE_DRIVER=redis`, `REDIS_URL=redis://localhost:6379` ad use `RedisCacheService`
  - **memory**: set `CACHE_DRIVER=memory` and use built-in `cache-manager` memory adapter

---

## Architecture Overview

The project follows **Domain-Driven Design (DDD)** and **Hexagonal Architecture** principles:

- `src/api/` — incoming interfaces (REST controllers, DTOs)
- `src/domains/` — core domain logic split into bounded contexts (e.g., user, order)
- `src/infra/` — external adapters (database, cache, events, mail, websocket)
- `src/common/` — shared utilities, types, interceptors, decorators, and exceptions
- `src/config/` — strongly typed configuration modules using `@nestjs/config`
- `src/workers/` — background services and distributed tasks (e.g., locks, queues)

Cross-cutting concerns (validation, caching, logging, and monitoring) are centralized in `common/` and `infra/` modules.

---

## Conventions & Patterns

**Language & Style**

- TypeScript strict mode enabled; no implicit `any`.
- Single quotes, trailing commas, no semicolons.
- Imports ordered by domain scope (framework → infra → domain → local).
- Each class, interface, and function must be typed explicitly.

**Folder & Naming**

- Each module contains `*.controller.ts`, `*.service.ts`, `*.module.ts`.
- DTOs end with `.dto.ts`; entities with `.entity.ts`.
- Domain models go under `domains/<context>/domain/entities`.
- Persistence adapters go under `domains/<context>/infrastructure/persistence`.
- Repositories must implement an interface under `domain/repositories/`.
- Infrastructure repositories implement domain interfaces.
- Domain services: `application/services/*.service.ts`.
- Reusable logic always goes under `common/` or `infra/`.

**Testing**

- Unit tests colocated with implementation: `*.spec.ts`.
- Integration tests under `/tests`.
- Mocks belong in `__mocks__/` folders.
- Prefer jest.spyOn for mocking over custom stubs.

**Caching**

- `Redis` via `infra/cache/redis-cache.service.ts` for production.
- Fallback to in-memory `cache-manager` in test or local dev.
- Always use `CacheKey` and `CacheTTL` decorators for method-level caching.

**ORM (Drizzle)**

- Migrations under `infra/database/migrations/`.
- Entities declared in `infra/database/entities/`.
- Repository layer wraps Drizzle calls to enforce domain constraints.

---

## Security

- Auth implemented with JWT (access + refresh).
- Secrets stored in `.env` or external secret manager (e.g., Vault).
- CORS and rate-limiting enabled globally via Nest middlewares.
- Sensitive data (passwords, API keys) encrypted at rest using `argon2`.
- `helmet` integrated for HTTP headers hardening.
- Validation via `class-validator` + `class-transformer`.
- Rate limiting configured at gateway level

## Environment Variables:

APP_ENV=development
APP_PORT=3000
DATABASE_URL=postgres://user:pass@localhost:5432/app
HTTP_PLATFORM=fastify
CACHE_DRIVER=redis
REDIS_URL=redis://localhost:6379
JWT_SECRET=your_jwt_secret
CACHE_TTL=60

---

## Git Workflows

1. Branch from `main`: `feature/<name>` or `fix/<name>`.
2. Always run `pnpm check` (lint + type + test) before commit.
3. Use **Conventional Commits**:
   - `feat: add auth refresh token`
   - `fix: correct pagination offset`
   - `refactor: simplify dto validation`
4. Commit message must describe _intent and impact_.
5. Force pushes allowed only on feature branches.
6. PR checklist:
   - ✅ Tests pass
   - ✅ Lint clean
   - ✅ Diff limited to intended scope
   - ✅ Added/updated relevant docs or configs

---

## External Services

| Service   | Purpose              | Env Key(s)               |
| --------- | -------------------- | ------------------------ |
| Redis     | Distributed cache    | `REDIS_URL`              |
| Database  | Postgres/SQLite      | `DATABASE_URL`           |
| Mailer    | SMTP notifications   | `MAIL_HOST`, `MAIL_PORT` |
| WebSocket | Real-time gateway    | `WS_PORT`                |
| i18n      | Multilingual support | `src/i18n/`              |

---

## Gotchas

- **Fastify adapter** requires explicit body parser config for multipart.
- **Drizzle migrations** must be run before service start; use `pnpm db:migrate`.
- **Redis unavailable** → system gracefully degrades to in-memory caching.
- **Type mismatches** between `domain` and `infrastructure` layers must be mapped explicitly — no implicit casting.
- **DTOs ≠ Entities** — always transform via `class-transformer`.

---

## Microservices & Scalability

- Uses NestJS’s `ClientsModule` for inter-service communication.
- Supports transport options: `TCP`, `Redis`, `NATS`.
- Each service is self-contained under `src/domains/<context>/`.
- Workers (`src/workers/`) handle background tasks using distributed locks.

Scalability rules:

- Keep `api/` free from business logic.
- Domain services (`application/services`) must remain stateless.
- Heavy computation → move to worker queue.

---

## Performance Practices

- Prefer Fastify over Express for lower overhead.
- Cache database lookups & static responses.
- Use async streams for large payloads.
- Global interceptors for request timing & metrics.
- Lazy-load modules via `DynamicModule.registerAsync()` when possible.

---

## Verification

Run before merging:
pnpm check
pnpm test
pnpm build
pnpm db:migrate:check

Proof required for each PR:

- ✅ Green tests
- ✅ Lint/type check passed
- ✅ No runtime dependencies added silently
- ✅ Documentation updated if config changed

---

## Domain Vocabulary

| Term         | Meaning                                   |
| ------------ | ----------------------------------------- |
| `VO`         | Value Object (immutable domain type)      |
| `Entity`     | Domain object with identity               |
| `Repository` | Abstracts data persistence                |
| `Aggregate`  | Cluster of entities with a root           |
| `DTO`        | Data Transfer Object for request/response |
| `Service`    | Stateless domain operation handler        |

---

## Summary

This boilerplate is a **foundation for scalable NestJS microservices**, emphasizing **DDD**, **performance**, and **maintainability**.  
Agents modifying this project should:

1. Respect domain boundaries.
2. Preserve modular independence.
3. Use typed configs and explicit interfaces.
4. Update this file when build or runtime conventions change.
