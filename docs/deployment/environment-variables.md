# Environment Variables

Complete reference of all environment variables.

## Application

```env
# Environment
APP_ENV=production          # development, staging, production

# Server
APP_PORT=3000              # Port number
APP_URL=https://api.example.com  # Public URL

# HTTP Platform
HTTP_PLATFORM=fastify      # fastify or express
```

## Database

```env
# SQLite (Development)
DATABASE_URL=sqlite://db/dev.db

# PostgreSQL (Production)
DATABASE_URL=postgres://user:password@host:5432/database

# Connection pool (PostgreSQL only)
DB_POOL_MIN=2
DB_POOL_MAX=10
```

## Authentication

```env
# JWT Access Token
JWT_SECRET=your-jwt-secret-min-32-chars
JWT_EXPIRES=15m

# JWT Refresh Token
JWT_REFRESH_SECRET=your-refresh-secret-min-32-chars
JWT_REFRESH_EXPIRES=7d

# Email Verification
JWT_CONFIRM_EMAIL_SECRET=your-confirm-secret-min-32-chars
JWT_CONFIRM_EMAIL_EXPIRES=1d

# Google OAuth
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
```

## Cache

```env
# Cache Driver
CACHE_DRIVER=redis         # memory or redis
CACHE_TTL=60              # Default TTL in seconds

# Redis
REDIS_URL=redis://localhost:6379
REDIS_PASSWORD=           # Optional
REDIS_DB=0                # Database number (0-15)
REDIS_TLS_ENABLED=false   # Enable TLS
```

## Mail

```env
# SMTP Configuration
MAIL_HOST=smtp.gmail.com
MAIL_PORT=587
MAIL_USER=your-email@gmail.com
MAIL_PASSWORD=your-app-password
MAIL_FROM=noreply@yourapp.com
MAIL_FROM_NAME=Your App Name

# TLS
MAIL_SECURE=false         # true for 465, false for other ports
```

## Workers

```env
# Enable/Disable Workers
WORKERS_ENABLED=true

# Specific Workers
ENABLED_WORKERS=all       # all or comma-separated: ticker,candles

# Queue Redis
QUEUE_REDIS_URL=redis://localhost:6379
```

## WebSocket

```env
# WebSocket Port
WS_PORT=3001

# Redis for Scaling
WS_REDIS_URL=redis://localhost:6379
```

## Monitoring

```env
# Logging Level
LOG_LEVEL=info            # error, warn, info, debug, verbose

# Sentry (Optional)
SENTRY_DSN=https://xxx@xxx.ingest.sentry.io/xxx

# OpenTelemetry (Optional)
OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318
```

## Rate Limiting

```env
# Throttle
THROTTLE_TTL=60           # Time window in seconds
THROTTLE_LIMIT=10         # Max requests per window
```

## CORS

```env
# CORS Origins
CORS_ORIGIN=http://localhost:3000,https://yourapp.com
CORS_CREDENTIALS=true
```

## Security

```env
# Session
SESSION_SECRET=your-session-secret-min-32-chars

# Encryption
ENCRYPTION_KEY=your-encryption-key-32-chars

# API Keys (if applicable)
API_KEY=your-api-key
```

## External Services

```env
# Example: Third-party API
EXTERNAL_API_URL=https://api.external.com
EXTERNAL_API_KEY=your-api-key
EXTERNAL_API_TIMEOUT=5000
```

## Development

```env
# Development Only
DEBUG=true
SWAGGER_ENABLED=true
PRETTY_LOGS=true
```

## Testing

```env
# Test Database
TEST_DATABASE_URL=sqlite://db/test.db

# Test Redis
TEST_REDIS_URL=redis://localhost:6379/15
```

## Environment Templates

### .env.example

```env
# Application
APP_ENV=development
APP_PORT=3000
APP_URL=http://localhost:3000

# Database
DATABASE_URL=sqlite://db/dev.db

# Authentication
JWT_SECRET=change-me-in-production
JWT_EXPIRES=15m
JWT_REFRESH_SECRET=change-me-in-production
JWT_REFRESH_EXPIRES=7d

# Cache
CACHE_DRIVER=memory

# Mail (Optional)
MAIL_HOST=smtp.gmail.com
MAIL_PORT=587
MAIL_USER=
MAIL_PASSWORD=

# Workers
WORKERS_ENABLED=false

# Logging
LOG_LEVEL=debug
```

### .env.production

```env
# Application
APP_ENV=production
APP_PORT=3000
APP_URL=https://api.yourapp.com

# Database
DATABASE_URL=postgres://user:password@db-host:5432/production

# Authentication
JWT_SECRET=${JWT_SECRET}
JWT_REFRESH_SECRET=${JWT_REFRESH_SECRET}
GOOGLE_CLIENT_ID=${GOOGLE_CLIENT_ID}
GOOGLE_CLIENT_SECRET=${GOOGLE_CLIENT_SECRET}

# Cache
CACHE_DRIVER=redis
REDIS_URL=redis://redis-host:6379

# Mail
MAIL_HOST=${MAIL_HOST}
MAIL_USER=${MAIL_USER}
MAIL_PASSWORD=${MAIL_PASSWORD}

# Workers
WORKERS_ENABLED=true
QUEUE_REDIS_URL=redis://redis-host:6379

# Monitoring
SENTRY_DSN=${SENTRY_DSN}
LOG_LEVEL=info
```

## Validation

The application validates all environment variables at startup using `class-validator`.

Example validator:

```typescript
class EnvironmentVariables {
  @IsEnum(['development', 'staging', 'production'])
  APP_ENV: string

  @IsPort()
  @IsString()
  APP_PORT: string

  @IsUrl()
  APP_URL: string

  @IsString()
  @MinLength(32)
  JWT_SECRET: string
}
```

## Secret Management

### Development

Use `.env` file (never commit):

```bash
cp .env.example .env
# Edit .env with your values
```

### Production

Use secret management:

1. **Docker Secrets**
```bash
echo "my-secret" | docker secret create jwt_secret -
```

2. **Kubernetes Secrets**
```bash
kubectl create secret generic app-secrets \
  --from-literal=jwt-secret='your-secret'
```

3. **AWS Secrets Manager**
4. **HashiCorp Vault**
5. **Azure Key Vault**

## Best Practices

1. **Never commit secrets**: Use `.env.example` as template
2. **Use strong secrets**: Minimum 32 characters
3. **Rotate regularly**: Change secrets periodically
4. **Separate by environment**: Different secrets for dev/staging/prod
5. **Validate on startup**: Catch configuration errors early
6. **Use secret managers**: For production deployments
7. **Document variables**: Keep this reference updated

## Troubleshooting

### Missing Variables

```
Error: Configuration validation failed
  JWT_SECRET must be at least 32 characters
```

Solution: Set the variable in `.env` or environment.

### Invalid Format

```
Error: DATABASE_URL must be a valid URL
```

Solution: Check the URL format (e.g., `postgres://` not `postgresql://`).

## Next Steps

- [Configuration](/guide/configuration) - Configuration guide
- [Docker](/deployment/docker) - Docker deployment
- [Kubernetes](/deployment/kubernetes) - Kubernetes deployment
