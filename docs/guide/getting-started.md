# Getting Started

Welcome to the NestJS Boilerplate documentation! This guide will help you get up and running quickly.

## Prerequisites

Before you begin, make sure you have the following installed:

- **Node.js** (v20 or higher)
- **pnpm** (v9.12.3 or higher) - Recommended
- **Docker** (optional, for containerization)
- **PostgreSQL** or **SQLite** (SQLite is used by default for development)

## Installation

1. Clone the repository:

```bash
git clone https://github.com/web3ix/nestjs-template.git
cd nestjs-template
```

2. Install dependencies:

::: code-tabs#shell

@tab pnpm

```bash
pnpm install
```

@tab npm

```bash
npm install
```

@tab yarn

```bash
yarn install
```

:::

3. Set up environment variables:

```bash
cp .env.example .env
```

4. Edit the `.env` file with your configuration:

```env
APP_ENV=development
APP_PORT=3000
DATABASE_URL=sqlite://db/dev.db
HTTP_PLATFORM=fastify
CACHE_DRIVER=memory
JWT_SECRET=your_jwt_secret_here
```

## Database Setup

### Run Migrations

Initialize the database schema:

```bash
pnpm db:migrate
```

### Seed Database (Optional)

Populate the database with sample data:

```bash
pnpm db:seed
```

## Running the Application

### Development Mode

Start the application in development mode with hot reload:

```bash
pnpm start:dev
```

The application will be available at `http://localhost:3000`.

### Production Mode

Build and run in production mode:

```bash
# Build the application
pnpm build

# Start production server
pnpm start:prod
```

## Verify Installation

### Health Check

Visit the health check endpoint:

```bash
curl http://localhost:3000/health
```

Expected response:

```json
{
  "status": "ok",
  "info": {
    "database": {
      "status": "up"
    }
  }
}
```

### API Documentation

Access the Swagger documentation:

```
http://localhost:3000/docs
```

## Next Steps

- [Configuration](/guide/configuration) - Learn about environment variables and configuration
- [Project Structure](/guide/project-structure) - Understand the codebase organization
- [Authentication](/guide/authentication) - Set up user authentication
- [Database](/guide/database) - Work with the database layer
