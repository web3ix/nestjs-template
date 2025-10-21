# Running the Application

Learn different ways to run and manage your application.

## Development Mode

### Standard Development

Run with hot reload and watch mode:

```bash
pnpm start:dev
```

The application will automatically restart when you make changes to the code.

### Debug Mode

Run in debug mode with Node.js inspector:

```bash
pnpm start:debug
```

Then attach your debugger:

- **VSCode**: Press F5 or use the Debug panel
- **Chrome DevTools**: Navigate to `chrome://inspect`

### Specific Port

Override the port via environment variable:

```bash
APP_PORT=4000 pnpm start:dev
```

## Production Mode

### Build

Compile TypeScript to JavaScript:

```bash
pnpm build
```

Output will be in the `dist/` directory.

### Run Production Build

```bash
pnpm start:prod
```

### With PM2

For production deployment with process management:

```bash
# Install PM2 globally
npm install -g pm2

# Build the application
pnpm build

# Start with PM2
pm2 start dist/main.js --name nestjs-app

# View logs
pm2 logs nestjs-app

# Restart
pm2 restart nestjs-app

# Stop
pm2 stop nestjs-app
```

## Docker

### Using Docker Compose (Recommended)

Start all services (app, database, redis):

```bash
# Development
docker-compose -f docker-compose.local.yml up

# Production
docker-compose up -d
```

### Using Dockerfile

Build and run manually:

```bash
# Build image
docker build -t nestjs-app .

# Run container
docker run -p 3000:3000 \
  -e DATABASE_URL=postgres://... \
  -e JWT_SECRET=... \
  nestjs-app
```

## Database Operations

### Migrations

Generate migration from schema changes:

```bash
pnpm db:generate
```

Apply migrations to database:

```bash
pnpm db:migrate
```

Push schema directly (development only):

```bash
pnpm db:push
```

Check migration status:

```bash
pnpm db:migrate:check
```

### Database Studio

Launch Drizzle Studio for visual database management:

```bash
pnpm db:studio
```

Access at `https://local.drizzle.studio`

### Seed Database

Populate database with sample data:

```bash
pnpm db:seed
```

## Testing

### Unit Tests

Run all unit tests:

```bash
pnpm test
```

Watch mode:

```bash
pnpm test:watch
```

With coverage:

```bash
pnpm test:cov
```

### E2E Tests

Run end-to-end tests:

```bash
pnpm test:e2e
```

### Debug Tests

Debug tests in VSCode or Chrome:

```bash
pnpm test:debug
```

## Code Quality

### Linting

Check and fix linting issues:

```bash
pnpm lint
```

### Type Checking

Run TypeScript compiler without emitting files:

```bash
pnpm typecheck
```

### Format Code

Format code with Prettier:

```bash
pnpm format
```

### Run All Checks

Run lint, typecheck, and tests together:

```bash
pnpm check
```

This is what runs in CI/CD pipelines.

## Monitoring

### Health Check

Check application health:

```bash
curl http://localhost:3000/health
```

Response:

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

### Logs

View application logs:

```bash
# Development (pretty print)
pnpm start:dev

# Production (JSON format)
pnpm start:prod | pino-pretty
```

## Documentation

### API Documentation

Swagger UI is available at:

```
http://localhost:3000/docs
```

### Generate API Client

Export OpenAPI spec:

```bash
curl http://localhost:3000/docs-json > openapi.json
```

## Worker Processes

### Enable All Workers

```bash
WORKERS_ENABLED=true pnpm start:dev
```

### Enable Specific Workers

```bash
ENABLED_WORKERS=ticker,candles pnpm start:dev
```

### Disable Workers

```bash
WORKERS_ENABLED=false pnpm start:dev
```

## Environment Switching

### Switch HTTP Platform

Use Express instead of Fastify:

```bash
HTTP_PLATFORM=express pnpm start:dev
```

### Switch Database

Use PostgreSQL in development:

```bash
DATABASE_URL=postgres://user:pass@localhost:5432/db pnpm start:dev
```

### Switch Cache Driver

Use Redis instead of memory cache:

```bash
CACHE_DRIVER=redis REDIS_URL=redis://localhost:6379 pnpm start:dev
```

## Performance Profiling

### CPU Profiling

```bash
node --prof dist/main.js
node --prof-process isolate-*.log > profile.txt
```

### Memory Profiling

```bash
node --inspect dist/main.js
```

Then use Chrome DevTools Memory profiler.

## Common Issues

### Port Already in Use

```bash
# Find process using port 3000
lsof -ti:3000

# Kill process
kill -9 $(lsof -ti:3000)

# Or use different port
APP_PORT=4000 pnpm start:dev
```

### Module Not Found

```bash
# Clear cache and reinstall
rm -rf node_modules dist
pnpm install
pnpm build
```

### Database Lock (SQLite)

```bash
# Remove lock file
rm db/dev.db-journal

# Or use different database file
DATABASE_URL=sqlite://db/dev2.db pnpm start:dev
```

## Next Steps

- [Authentication](/guide/authentication) - Set up user authentication
- [Database](/guide/database) - Work with the database
- [Deployment](/deployment/docker) - Deploy to production
