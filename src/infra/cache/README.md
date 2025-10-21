# Cache Infrastructure

Redis-based caching infrastructure for the Maven Exchange platform.

## Overview

The cache module provides a unified interface for Redis caching operations with support for all common Redis data structures and operations.

## Features

- **Full Redis Support**: All major Redis data types (String, Hash, Set, Sorted Set, List)
- **Auto JSON Serialization**: Automatically handles JSON serialization/deserialization
- **Type Safety**: Generic types for type-safe cache operations
- **Connection Management**: Automatic reconnection and error handling
- **TTL Support**: Expiration times for cached data
- **Pattern Deletion**: Delete keys matching patterns

## Installation

The cache module is automatically registered when you import `CacheModule`:

```typescript
import { CacheModule } from '@/infra/cache/cache.module';

@Module({
  imports: [CacheModule],
})
export class YourModule {}
```

## Usage

### Inject the Service

```typescript
import { ICacheService } from '@/infra/cache/interfaces/cache.interface';

@Injectable()
export class YourService {
  constructor(
    @Inject('ICacheService')
    private readonly cache: ICacheService,
  ) {}
}
```

### Basic Operations

#### Set/Get String Values

```typescript
// Set with TTL (in seconds)
await this.cache.set('user:123', userData, 3600);

// Set without TTL (persists forever)
await this.cache.set('config:app', configData);

// Get value
const user = await this.cache.get<User>('user:123');
```

#### Delete Operations

```typescript
// Delete single key
await this.cache.del('user:123');

// Delete all keys matching pattern
await this.cache.delPattern('user:*');
```

#### Check Existence & TTL

```typescript
// Check if key exists
const exists = await this.cache.exists('user:123'); // boolean

// Get remaining TTL
const ttl = await this.cache.ttl('user:123'); // seconds, -1 if no expiry, -2 if not exists

// Set expiration on existing key
await this.cache.expire('user:123', 3600);
```

#### Increment/Decrement

```typescript
// Increment
const views = await this.cache.increment('post:123:views'); // increment by 1
const score = await this.cache.increment('user:score', 10); // increment by 10

// Decrement
const remaining = await this.cache.decrement('rate:limit', 1);
```

### Hash Operations

Perfect for storing objects with individual field access:

```typescript
// Set single field
await this.cache.hset('user:123', 'name', 'John Doe');
await this.cache.hset('user:123', 'email', 'john@example.com');

// Get single field
const name = await this.cache.hget<string>('user:123', 'name');

// Get all fields
const user = await this.cache.hgetall<string>('user:123');
// Returns: { name: 'John Doe', email: 'john@example.com' }

// Delete fields
await this.cache.hdel('user:123', 'email', 'phone');
```

### Sorted Set Operations

Ideal for leaderboards, rankings, and time-series data:

```typescript
// Add member with score
await this.cache.zadd('leaderboard', 1000, 'user:123');
await this.cache.zadd('leaderboard', 850, 'user:456');

// Get top 10 (highest scores)
const top10 = await this.cache.zrange<string>('leaderboard', -10, -1);

// Get top 10 with scores
const top10WithScores = await this.cache.zrangeWithScores<string>(
  'leaderboard',
  -10,
  -1,
);
// Returns: [{ value: 'user:123', score: 1000 }, ...]

// Remove member
await this.cache.zrem('leaderboard', 'user:123');

// Remove by score range
await this.cache.zremrangebyscore('leaderboard', 0, 500);
```

### Set Operations

Great for unique collections and membership checks:

```typescript
// Add members
await this.cache.sadd('online:users', 'user:123', 'user:456');

// Get all members
const onlineUsers = await this.cache.smembers<string>('online:users');

// Check membership
const isOnline = await this.cache.sismember('online:users', 'user:123');

// Remove members
await this.cache.srem('online:users', 'user:123');
```

### List Operations

Useful for queues, activity feeds, and recent items:

```typescript
// Push to left (prepend)
await this.cache.lpush('notifications:user:123', notification1, notification2);

// Push to right (append)
await this.cache.rpush('activity:feed', activity1);

// Pop from left (FIFO)
const oldest = await this.cache.lpop<Notification>('notifications:user:123');

// Pop from right (LIFO/stack)
const latest = await this.cache.rpop<Activity>('activity:feed');

// Get range
const recentNotifications = await this.cache.lrange<Notification>(
  'notifications:user:123',
  0,
  9,
);

// Get length
const count = await this.cache.llen('notifications:user:123');
```

## Common Use Cases

### User Session Caching

```typescript
// Store user session
await this.cache.set(
  `session:${sessionId}`,
  {
    userId: user.id,
    email: user.email,
    roles: user.roles,
  },
  3600, // 1 hour
);

// Get session
const session = await this.cache.get<UserSession>(`session:${sessionId}`);

// Invalidate session
await this.cache.del(`session:${sessionId}`);
```

### Order Book Caching

```typescript
// Cache order book (sorted by price)
await this.cache.zadd(`orderbook:${pairId}:bids`, price, JSON.stringify(order));
await this.cache.zadd(`orderbook:${pairId}:asks`, price, JSON.stringify(order));

// Get top 20 bids (highest prices)
const topBids = await this.cache.zrangeWithScores<Order>(
  `orderbook:${pairId}:bids`,
  -20,
  -1,
);

// Get top 20 asks (lowest prices)
const topAsks = await this.cache.zrangeWithScores<Order>(
  `orderbook:${pairId}:asks`,
  0,
  19,
);
```

### Rate Limiting

```typescript
// Increment request count
const count = await this.cache.increment(`ratelimit:${userId}:${endpoint}`);

if (count === 1) {
  // First request, set expiration
  await this.cache.expire(`ratelimit:${userId}:${endpoint}`, 60); // 1 minute window
}

if (count > 100) {
  throw new Error('Rate limit exceeded');
}
```

### Market Data Caching

```typescript
// Cache latest price
await this.cache.set(`price:${pairId}`, latestPrice, 5); // 5 seconds

// Cache 24h statistics
await this.cache.hset(`stats:24h:${pairId}`, 'high', '50000');
await this.cache.hset(`stats:24h:${pairId}`, 'low', '48000');
await this.cache.hset(`stats:24h:${pairId}`, 'volume', '1000.5');
await this.cache.expire(`stats:24h:${pairId}`, 300); // 5 minutes

const stats = await this.cache.hgetall<string>(`stats:24h:${pairId}`);
```

### Recent Trades

```typescript
// Add to recent trades (keep last 100)
await this.cache.lpush(`trades:recent:${pairId}`, JSON.stringify(trade));

// Trim to last 100
const trades = await this.cache.lrange(`trades:recent:${pairId}`, 0, 99);
```

## Key Naming Conventions

Follow these patterns for consistency:

- User data: `user:{userId}:{type}`
- Session: `session:{sessionId}`
- Order book: `orderbook:{pairId}:{side}`
- Market data: `price:{pairId}`, `stats:{period}:{pairId}`
- Rate limiting: `ratelimit:{userId}:{endpoint}`
- Trades: `trades:recent:{pairId}`
- Leaderboards: `leaderboard:{type}`

## Configuration

Redis configuration is loaded from environment variables:

```env
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=your-password
REDIS_TLS_ENABLED=false
```

## Connection Management

The service automatically:
- Connects on module initialization
- Retries failed connections with exponential backoff
- Logs connection status
- Closes connection on module destruction

## Error Handling

All cache operations can throw errors. Wrap critical operations in try-catch:

```typescript
try {
  const data = await this.cache.get<User>('user:123');
} catch (error) {
  this.logger.error('Cache error:', error);
  // Fallback to database
  const data = await this.userRepository.findById('123');
}
```

## Performance Tips

1. **Use appropriate data structures**: Choose the right Redis data type for your use case
2. **Set TTLs**: Always set expiration for temporary data
3. **Batch operations**: Use `publishMany()` for multiple events
4. **Pattern deletions**: Be careful with `delPattern()` on large datasets
5. **Pipelining**: For multiple operations, consider using the raw client

## Direct Redis Client Access

If you need advanced features not covered by the interface:

```typescript
import { RedisCacheService } from '@/infra/cache/services/redis-cache.service';

@Injectable()
export class AdvancedService {
  constructor(private readonly cacheService: RedisCacheService) {}

  async advancedOperation() {
    const client = this.cacheService.getClient();
    // Use ioredis client directly
    await client.pipeline()
      .set('key1', 'value1')
      .set('key2', 'value2')
      .exec();
  }
}
```

## Testing

For unit tests, mock the cache service:

```typescript
const mockCacheService = {
  get: jest.fn(),
  set: jest.fn(),
  del: jest.fn(),
  // ... other methods
};

beforeEach(async () => {
  const module = await Test.createTestingModule({
    providers: [
      YourService,
      {
        provide: 'ICacheService',
        useValue: mockCacheService,
      },
    ],
  }).compile();
});
```

## Related Documentation

- Redis Documentation: https://redis.io/documentation
- ioredis Documentation: https://github.com/redis/ioredis
