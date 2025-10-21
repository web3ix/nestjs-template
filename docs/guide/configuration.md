# Configuration

The application uses environment variables for configuration with strong typing through `@nestjs/config`.

## Environment Variables

### Core Settings

```env
# Application
APP_ENV=development          # Environment: development, staging, production
APP_PORT=3000               # Port number
APP_URL=http://localhost:3000  # Public URL

# HTTP Platform
HTTP_PLATFORM=fastify       # HTTP adapter: fastify or express
```

### Database

```env
# SQLite (Development)
DATABASE_URL=sqlite://db/dev.db

# PostgreSQL (Production)
DATABASE_URL=postgres://user:password@localhost:5432/dbname
```

The ORM automatically detects the database type from the URL scheme.

### Caching

```env
# Cache Driver
CACHE_DRIVER=memory         # Options: memory, redis
CACHE_TTL=60               # Default cache TTL in seconds

# Redis (if using redis driver)
REDIS_URL=redis://localhost:6379
REDIS_PASSWORD=            # Optional
REDIS_DB=0                 # Redis database number
```

### Authentication

```env
# JWT
JWT_SECRET=your-secret-key-here
JWT_EXPIRES=15m            # Access token expiration
JWT_REFRESH_SECRET=your-refresh-secret-here
JWT_REFRESH_EXPIRES=7d     # Refresh token expiration

# Email Verification
JWT_CONFIRM_EMAIL_SECRET=your-confirm-secret-here
JWT_CONFIRM_EMAIL_EXPIRES=1d

# OAuth
GOOGLE_CLIENT_ID=your-client-id
GOOGLE_CLIENT_SECRET=your-client-secret
```

### Mail

```env
MAIL_HOST=smtp.gmail.com
MAIL_PORT=587
MAIL_USER=your-email@gmail.com
MAIL_PASSWORD=your-app-password
MAIL_FROM=noreply@yourapp.com
MAIL_FROM_NAME=Your App Name
```

### Workers & Queues

```env
WORKERS_ENABLED=true
ENABLED_WORKERS=all         # Options: all, or comma-separated list

# BullMQ (requires Redis)
QUEUE_REDIS_URL=redis://localhost:6379
```

### WebSocket

```env
WS_PORT=3001               # WebSocket server port
WS_REDIS_URL=redis://localhost:6379  # For scaling across instances
```

## Configuration Files

Configuration is organized by domain in `src/config/`:

```
src/config/
├── app.config.ts          # Application settings
├── auth.config.ts         # Authentication settings
├── redis.config.ts        # Redis connection
├── drizzle.config.ts      # Database configuration
└── config.type.ts         # Type definitions
```

### Creating Custom Config

1. Create config file:

```typescript
// src/config/my-feature.config.ts
import { registerAs } from '@nestjs/config'
import { IsString, IsNumber } from 'class-validator'
import { validateConfig } from '@/common/utils/validate-config'

export type MyFeatureConfig = {
  apiKey: string
  timeout: number
}

class EnvironmentVariablesValidator {
  @IsString()
  MY_FEATURE_API_KEY: string

  @IsNumber()
  MY_FEATURE_TIMEOUT: number
}

export default registerAs<MyFeatureConfig>('myFeature', () => {
  validateConfig(process.env, EnvironmentVariablesValidator)

  return {
    apiKey: process.env.MY_FEATURE_API_KEY,
    timeout: parseInt(process.env.MY_FEATURE_TIMEOUT || '5000', 10),
  }
})
```

2. Add type definition:

```typescript
// src/config/config.type.ts
import { ConfigType } from '@nestjs/config'
import myFeatureConfig from './my-feature.config'

export type AllConfigType = {
  // ... existing configs
  myFeature: ConfigType<typeof myFeatureConfig>
}
```

3. Register in AppModule:

```typescript
// src/app.module.ts
import myFeatureConfig from './config/my-feature.config'

@Module({
  imports: [
    ConfigModule.forRoot({
      load: [
        // ... existing configs
        myFeatureConfig,
      ],
    }),
  ],
})
```

4. Use in your service:

```typescript
import { ConfigService } from '@nestjs/config'
import { AllConfigType } from '@/config/config.type'

export class MyService {
  constructor(
    private configService: ConfigService<AllConfigType>
  ) {}

  someMethod() {
    const apiKey = this.configService.get('myFeature.apiKey', { infer: true })
    const timeout = this.configService.get('myFeature.timeout', { infer: true })
  }
}
```

## Environment-Specific Configuration

### Development

```env
APP_ENV=development
DATABASE_URL=sqlite://db/dev.db
CACHE_DRIVER=memory
```

### Staging

```env
APP_ENV=staging
DATABASE_URL=postgres://user:pass@staging-db:5432/app
CACHE_DRIVER=redis
REDIS_URL=redis://staging-redis:6379
```

### Production

```env
APP_ENV=production
DATABASE_URL=postgres://user:pass@prod-db:5432/app
CACHE_DRIVER=redis
REDIS_URL=redis://prod-redis:6379
JWT_SECRET=<strong-random-secret>
```

## Configuration Validation

All configuration is validated at startup using `class-validator`. Invalid configuration will prevent the application from starting.

Example validation error:

```
Error: Configuration validation failed
  MY_FEATURE_API_KEY must be a string
  MY_FEATURE_TIMEOUT must be a number
```

## Best Practices

1. **Never commit `.env` files** - Use `.env.example` as a template
2. **Use strong secrets** - Generate random secrets for production
3. **Separate by environment** - Use different values for dev/staging/prod
4. **Validate early** - Configuration errors should fail fast at startup
5. **Document required vars** - Keep `.env.example` up to date
6. **Use secret management** - Consider Vault or AWS Secrets Manager for production

## Secret Management

For production environments, consider using:

- **AWS Secrets Manager**
- **HashiCorp Vault**
- **Azure Key Vault**
- **Google Secret Manager**

The project includes support for HashiCorp Vault via `@litehex/node-vault`.

## Next Steps

- [Running the Application](/guide/running)
- [Project Structure](/guide/project-structure)
- [Environment Variables Reference](/deployment/environment-variables)
