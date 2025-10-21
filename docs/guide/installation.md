# Installation

## System Requirements

### Required

- **Node.js**: v20.x or higher
- **Package Manager**: pnpm (recommended), npm, or yarn
- **Database**: PostgreSQL 14+ or SQLite 3.x
- **Operating System**: Linux, macOS, or Windows (WSL recommended)

### Optional

- **Docker**: v24.x or higher (for containerization)
- **Redis**: v7.x or higher (for distributed caching)
- **Git**: v2.x or higher (for version control)

## Installing Node.js

### Using nvm (Recommended)

```bash
# Install nvm
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash

# Install Node.js v20
nvm install 20
nvm use 20
```

### Using Official Installer

Download from [nodejs.org](https://nodejs.org/) and follow the installation instructions for your OS.

## Installing pnpm

pnpm is the recommended package manager for this project.

```bash
# Using npm
npm install -g pnpm@9.12.3

# Using Corepack (Node.js 16.13+)
corepack enable
corepack prepare pnpm@9.12.3 --activate
```

## Clone Repository

```bash
git clone https://github.com/web3ix/nestjs-template.git
cd nestjs-template
```

## Install Dependencies

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

This will install all dependencies and run the `prepare` script to set up Git hooks with Husky.

## Database Setup

### SQLite (Development)

SQLite is the default for local development and requires no additional setup.

```bash
# The database file will be created automatically
pnpm db:migrate
```

### PostgreSQL (Production)

1. Install PostgreSQL:

::: code-tabs#shell

@tab Ubuntu/Debian

```bash
sudo apt update
sudo apt install postgresql postgresql-contrib
```

@tab macOS

```bash
brew install postgresql@14
brew services start postgresql@14
```

@tab Docker

```bash
docker run -d \
  --name postgres \
  -e POSTGRES_PASSWORD=password \
  -e POSTGRES_DB=myapp \
  -p 5432:5432 \
  postgres:14
```

:::

2. Create database:

```bash
# Connect to PostgreSQL
psql -U postgres

# Create database
CREATE DATABASE myapp;
CREATE USER myuser WITH PASSWORD 'mypassword';
GRANT ALL PRIVILEGES ON DATABASE myapp TO myuser;
\q
```

3. Update `.env`:

```env
DATABASE_URL=postgres://myuser:mypassword@localhost:5432/myapp
```

## Redis Setup (Optional)

Redis is optional but recommended for production caching.

### Install Redis

::: code-tabs#shell

@tab Ubuntu/Debian

```bash
sudo apt update
sudo apt install redis-server
sudo systemctl start redis-server
```

@tab macOS

```bash
brew install redis
brew services start redis
```

@tab Docker

```bash
docker run -d \
  --name redis \
  -p 6379:6379 \
  redis:7-alpine
```

:::

### Configure Redis

Update `.env`:

```env
CACHE_DRIVER=redis
REDIS_URL=redis://localhost:6379
```

## Verify Installation

Run the health check command:

```bash
pnpm check
```

This command will:
- Run ESLint
- Run TypeScript type checking
- Run all tests

All checks should pass ✅

## Troubleshooting

### Port Already in Use

If port 3000 is already in use, change the port in `.env`:

```env
APP_PORT=4000
```

### Database Connection Issues

1. Verify database credentials in `.env`
2. Ensure database server is running
3. Check firewall settings

### Permission Errors

On Linux/macOS, you may need to adjust file permissions:

```bash
chmod +x .husky/*
chmod +x scripts/*
```

### Module Not Found

Clear cache and reinstall:

```bash
rm -rf node_modules pnpm-lock.yaml
pnpm install
```

## Next Steps

- [Configuration](/guide/configuration) - Configure your application
- [Running](/guide/running) - Learn different ways to run the app
- [Project Structure](/guide/project-structure) - Explore the codebase
