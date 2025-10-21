# Caching

The application provides a flexible caching layer supporting both Redis and in-memory caching.

## Overview

The cache module provides:
- **Unified Interface**: Switch between Redis and memory cache without code changes
- **Type Safety**: Generic types for type-safe operations
- **Auto Serialization**: JSON serialization/deserialization
- **TTL Support**: Automatic expiration of cached data
- **Pattern Deletion**: Delete keys matching patterns

## Configuration

Configure caching via environment variables:

```env
# Cache driver: memory or redis
CACHE_DRIVER=memory

# Redis configuration (if using redis driver)
REDIS_URL=redis://localhost:6379
REDIS_PASSWORD=
REDIS_DB=0
```

## Basic Usage

### Inject the Service

```typescript
import { ICacheService } from '@/infra/cache/interfaces/cache.interface'

@Injectable()
export class YourService {
  constructor(
    @Inject('ICacheService')
    private readonly cache: ICacheService,
  ) {}
}
```

### Set/Get Values

```typescript
// Set with TTL (in seconds)
await this.cache.set('user:123', userData, 3600)

// Set without TTL (persists forever)
await this.cache.set('config:app', configData)

// Get value
const user = await this.cache.get<User>('user:123')
```

### Delete Operations

```typescript
// Delete single key
await this.cache.del('user:123')

// Delete all keys matching pattern (Redis only)
await this.cache.delPattern('user:*')
```

### Check Existence & TTL

```typescript
// Check if key exists
const exists = await this.cache.exists('user:123')

// Get remaining TTL (-1 if no expiry, -2 if not exists)
const ttl = await this.cache.ttl('user:123')

// Set expiration on existing key
await this.cache.expire('user:123', 3600)
```

## Redis-Specific Features

When using Redis driver, you get access to advanced data structures:

### Hash Operations

Perfect for storing objects with individual field access:

```typescript
// Set fields
await this.cache.hset('user:123', 'name', 'John Doe')
await this.cache.hset('user:123', 'email', 'john@example.com')

// Get single field
const name = await this.cache.hget<string>('user:123', 'name')

// Get all fields
const user = await this.cache.hgetall<string>('user:123')

// Delete fields
await this.cache.hdel('user:123', 'email')
```

### Sorted Sets

Ideal for leaderboards and rankings:

```typescript
// Add members with scores
await this.cache.zadd('leaderboard', 1000, 'user:123')
await this.cache.zadd('leaderboard', 850, 'user:456')

// Get top 10
const top10 = await this.cache.zrange<string>('leaderboard', -10, -1)

// Get with scores
const top10WithScores = await this.cache.zrangeWithScores<string>(
  'leaderboard',
  -10,
  -1,
)

// Remove members
await this.cache.zrem('leaderboard', 'user:123')
```

### Sets

Great for unique collections:

```typescript
// Add members
await this.cache.sadd('online:users', 'user:123', 'user:456')

// Get all members
const onlineUsers = await this.cache.smembers<string>('online:users')

// Check membership
const isOnline = await this.cache.sismember('online:users', 'user:123')

// Remove members
await this.cache.srem('online:users', 'user:123')
```

### Lists

Useful for queues and feeds:

```typescript
// Push to left (prepend)
await this.cache.lpush('notifications:user:123', notification)

// Push to right (append)
await this.cache.rpush('activity:feed', activity)

// Pop from left (FIFO)
const oldest = await this.cache.lpop<Notification>('notifications:user:123')

// Get range
const recent = await this.cache.lrange<Notification>(
  'notifications:user:123',
  0,
  9,
)
```

## Common Use Cases

### User Session Caching

```typescript
// Store session
await this.cache.set(
  `session:${sessionId}`,
  { userId, email, roles },
  3600, // 1 hour
)

// Get session
const session = await this.cache.get<Session>(`session:${sessionId}`)

// Invalidate session
await this.cache.del(`session:${sessionId}`)
```

### Rate Limiting

```typescript
const key = `ratelimit:${userId}:${endpoint}`
const count = await this.cache.increment(key)

if (count === 1) {
  // First request, set expiration
  await this.cache.expire(key, 60) // 1 minute window
}

if (count > 100) {
  throw new Error('Rate limit exceeded')
}
```

### Query Result Caching

```typescript
// Check cache first
let users = await this.cache.get<User[]>('users:active')

if (!users) {
  // Cache miss, query database
  users = await this.userRepository.findActive()
  
  // Cache result for 5 minutes
  await this.cache.set('users:active', users, 300)
}

return users
```

## Method-Level Caching

Use decorators for automatic caching:

```typescript
import { CacheKey, CacheTTL } from '@/common/decorators/cache.decorators'

@Injectable()
export class UserService {
  @CacheKey('users:active')
  @CacheTTL(300) // 5 minutes
  async findActiveUsers(): Promise<User[]> {
    // This method result will be automatically cached
    return this.userRepository.findActive()
  }
}
```

## Key Naming Conventions

Follow these patterns for consistency:

- User data: `user:{userId}:{type}`
- Session: `session:{sessionId}`
- Rate limiting: `ratelimit:{userId}:{endpoint}`
- Query results: `{entity}:{query}`
- Temporary data: `temp:{type}:{id}`

## Performance Tips

1. **Set appropriate TTLs**: Always expire temporary data
2. **Use pattern deletion carefully**: Can be slow on large datasets
3. **Choose right data structure**: Use hashes for objects, sorted sets for rankings
4. **Avoid large values**: Keep cached values under 1MB
5. **Monitor memory usage**: Track Redis memory consumption

## Error Handling

Always handle cache errors gracefully:

```typescript
try {
  const data = await this.cache.get<User>('user:123')
} catch (error) {
  this.logger.error('Cache error:', error)
  // Fallback to database
  const data = await this.userRepository.findById('123')
}
```

## Testing

Mock the cache service in tests:

```typescript
const mockCache = {
  get: jest.fn(),
  set: jest.fn(),
  del: jest.fn(),
}

beforeEach(async () => {
  const module = await Test.createTestingModule({
    providers: [
      YourService,
      {
        provide: 'ICacheService',
        useValue: mockCache,
      },
    ],
  }).compile()
})
```

## Switching Between Drivers

The application automatically uses the configured driver:

```env
# Use memory cache (development)
CACHE_DRIVER=memory

# Use Redis (production)
CACHE_DRIVER=redis
REDIS_URL=redis://localhost:6379
```

No code changes required - the interface is identical.

## Next Steps

- [Database](/guide/database) - Database layer
- [Authentication](/guide/authentication) - Auth with session caching
- [Workers](/guide/workers) - Background jobs with distributed locks
