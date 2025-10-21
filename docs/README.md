---
home: true
title: Home
heroImage: /images/logo.svg
heroText: NestJS Boilerplate
tagline: High-performance, domain-driven NestJS boilerplate for scalable microservices
actions:
  - text: Get Started
    link: /guide/getting-started
    type: primary
  - text: View on GitHub
    link: https://github.com/web3ix/nestjs-template
    type: secondary

features:
  - title: Domain-Driven Design
    details: Built with DDD principles and hexagonal architecture for maintainable, scalable codebases.
  - title: Multiple Platforms
    details: Switch between Fastify/Express, PostgreSQL/SQLite, and Redis/Memory cache at runtime.
  - title: Type-Safe
    details: Fully typed with TypeScript strict mode, Drizzle ORM, and comprehensive validation.
  - title: Production-Ready
    details: Includes authentication, caching, queues, WebSockets, monitoring, and more.
  - title: Developer Experience
    details: Hot reload, linting, testing, Git hooks, conventional commits, and automated releases.
  - title: Cloud-Native
    details: Docker support, Kubernetes manifests, environment-based configuration, and health checks.
---

## Quick Start

::: code-tabs#shell

@tab pnpm

```bash
# Install dependencies
pnpm install

# Setup environment
cp .env.example .env

# Run migrations
pnpm db:migrate

# Seed database
pnpm db:seed

# Start development server
pnpm start:dev
```

@tab npm

```bash
# Install dependencies
npm install

# Setup environment
cp .env.example .env

# Run migrations
npm run db:migrate

# Seed database
npm run db:seed

# Start development server
npm run start:dev
```

@tab yarn

```bash
# Install dependencies
yarn install

# Setup environment
cp .env.example .env

# Run migrations
yarn db:migrate

# Seed database
yarn db:seed

# Start development server
yarn start:dev
```

:::

## Architecture

This boilerplate follows **Domain-Driven Design (DDD)** and **Hexagonal Architecture** principles:

```
src/
├── api/           # Incoming interfaces (REST controllers, DTOs)
├── domains/       # Core domain logic (entities, repositories, services)
├── infra/         # External adapters (database, cache, events, mail)
├── common/        # Shared utilities, types, decorators, exceptions
├── config/        # Strongly typed configuration modules
└── workers/       # Background services and distributed tasks
```

## Key Features

### 🔐 Authentication & Authorization

- JWT-based authentication with refresh tokens
- Role-based access control (RBAC)
- Google OAuth integration
- Session management with Redis

### 🗄️ Database

- Drizzle ORM with TypeScript support
- PostgreSQL for production
- SQLite for local development
- Type-safe queries and migrations

### ⚡ Performance

- Redis caching with fallback to memory
- Fastify adapter for low overhead
- Request/response compression
- Efficient query optimization

### 🔄 Real-time & Background Jobs

- WebSocket support with Socket.IO
- BullMQ for distributed job queues
- Event-driven architecture
- Distributed locks

### 📊 Monitoring & Observability

- Health checks
- Structured logging with Pino
- Request tracing
- Error tracking

### 🧪 Testing

- Unit tests with Jest
- Integration tests
- E2E tests
- Test coverage reporting

## Community

- [GitHub Issues](https://github.com/web3ix/nestjs-template/issues)
- [GitHub Discussions](https://github.com/web3ix/nestjs-template/discussions)

## License

MIT © [manhtrv](https://github.com/manhtrv)
