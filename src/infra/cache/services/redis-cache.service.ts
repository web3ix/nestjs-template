import { AllConfigType } from '@/config/config.type';
import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { ICacheService } from '../interfaces/cache.interface';

@Injectable()
export class RedisCacheService implements ICacheService, OnModuleDestroy {
  private readonly logger = new Logger(RedisCacheService.name);
  private readonly client: Redis;

  constructor(private readonly configService: ConfigService<AllConfigType>) {
    const host = this.configService.get('redis.host', { infer: true });
    const port = this.configService.get('redis.port', { infer: true });
    const password = this.configService.get('redis.password', { infer: true });
    const tlsEnabled = this.configService.get('redis.tlsEnabled', {
      infer: true,
    });

    this.client = new Redis({
      host,
      port,
      password,
      tls: tlsEnabled ? {} : undefined,
      retryStrategy: (times) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
      maxRetriesPerRequest: 3,
    });

    this.client.on('connect', () => {
      this.logger.log('Redis connected');
    });

    this.client.on('error', (error) => {
      this.logger.error('Redis connection error:', error);
    });

    this.client.on('ready', () => {
      this.logger.log('Redis ready');
    });
  }

  async onModuleDestroy() {
    await this.client.quit();
    this.logger.log('Redis connection closed');
  }

  async get<T>(key: string): Promise<T | null> {
    const value = await this.client.get(key);
    if (!value) return null;

    try {
      return JSON.parse(value) as T;
    } catch {
      return value as T;
    }
  }

  async set<T>(key: string, value: T, ttl?: number): Promise<void> {
    const serialized =
      typeof value === 'string' ? value : JSON.stringify(value);

    if (ttl) {
      await this.client.setex(key, ttl, serialized);
    } else {
      await this.client.set(key, serialized);
    }
  }

  async del(key: string): Promise<void> {
    await this.client.del(key);
  }

  async delPattern(pattern: string): Promise<void> {
    const keys = await this.client.keys(pattern);
    if (keys.length > 0) {
      await this.client.del(...keys);
    }
  }

  async exists(key: string): Promise<boolean> {
    const result = await this.client.exists(key);
    return result === 1;
  }

  async ttl(key: string): Promise<number> {
    return await this.client.ttl(key);
  }

  async expire(key: string, ttl: number): Promise<void> {
    await this.client.expire(key, ttl);
  }

  async increment(key: string, value: number = 1): Promise<number> {
    return await this.client.incrby(key, value);
  }

  async decrement(key: string, value: number = 1): Promise<number> {
    return await this.client.decrby(key, value);
  }

  async hset(key: string, field: string, value: any): Promise<void> {
    const serialized =
      typeof value === 'string' ? value : JSON.stringify(value);
    await this.client.hset(key, field, serialized);
  }

  async hget<T>(key: string, field: string): Promise<T | null> {
    const value = await this.client.hget(key, field);
    if (!value) return null;

    try {
      return JSON.parse(value) as T;
    } catch {
      return value as T;
    }
  }

  async hgetall<T>(key: string): Promise<Record<string, T>> {
    const data = await this.client.hgetall(key);
    const result: Record<string, T> = {};

    for (const [field, value] of Object.entries(data)) {
      try {
        result[field] = JSON.parse(value) as T;
      } catch {
        result[field] = value as T;
      }
    }

    return result;
  }

  async hdel(key: string, ...fields: string[]): Promise<void> {
    if (fields.length > 0) {
      await this.client.hdel(key, ...fields);
    }
  }

  async zadd(key: string, score: number, member: string): Promise<void> {
    await this.client.zadd(key, score, member);
  }

  async zrange<T>(key: string, start: number, stop: number): Promise<T[]> {
    const values = await this.client.zrange(key, start, stop);
    return values.map((v) => {
      try {
        return JSON.parse(v) as T;
      } catch {
        return v as T;
      }
    });
  }

  async zrangeWithScores<T>(
    key: string,
    start: number,
    stop: number,
  ): Promise<Array<{ value: T; score: number }>> {
    const results = await this.client.zrange(key, start, stop, 'WITHSCORES');
    const pairs: Array<{ value: T; score: number }> = [];

    for (let i = 0; i < results.length; i += 2) {
      const value = results[i];
      const score = parseFloat(results[i + 1]);

      try {
        pairs.push({ value: JSON.parse(value) as T, score });
      } catch {
        pairs.push({ value: value as T, score });
      }
    }

    return pairs;
  }

  async zrem(key: string, member: string): Promise<void> {
    await this.client.zrem(key, member);
  }

  async zremrangebyscore(key: string, min: number, max: number): Promise<void> {
    await this.client.zremrangebyscore(key, min, max);
  }

  async sadd(key: string, ...members: string[]): Promise<void> {
    if (members.length > 0) {
      await this.client.sadd(key, ...members);
    }
  }

  async smembers<T>(key: string): Promise<T[]> {
    const values = await this.client.smembers(key);
    return values.map((v) => {
      try {
        return JSON.parse(v) as T;
      } catch {
        return v as T;
      }
    });
  }

  async srem(key: string, ...members: string[]): Promise<void> {
    if (members.length > 0) {
      await this.client.srem(key, ...members);
    }
  }

  async sismember(key: string, member: string): Promise<boolean> {
    const result = await this.client.sismember(key, member);
    return result === 1;
  }

  async lpush(key: string, ...values: any[]): Promise<void> {
    const serialized = values.map((v) =>
      typeof v === 'string' ? v : JSON.stringify(v),
    );
    await this.client.lpush(key, ...serialized);
  }

  async rpush(key: string, ...values: any[]): Promise<void> {
    const serialized = values.map((v) =>
      typeof v === 'string' ? v : JSON.stringify(v),
    );
    await this.client.rpush(key, ...serialized);
  }

  async lpop<T>(key: string): Promise<T | null> {
    const value = await this.client.lpop(key);
    if (!value) return null;

    try {
      return JSON.parse(value) as T;
    } catch {
      return value as T;
    }
  }

  async rpop<T>(key: string): Promise<T | null> {
    const value = await this.client.rpop(key);
    if (!value) return null;

    try {
      return JSON.parse(value) as T;
    } catch {
      return value as T;
    }
  }

  async lrange<T>(key: string, start: number, stop: number): Promise<T[]> {
    const values = await this.client.lrange(key, start, stop);
    return values.map((v) => {
      try {
        return JSON.parse(v) as T;
      } catch {
        return v as T;
      }
    });
  }

  async llen(key: string): Promise<number> {
    return await this.client.llen(key);
  }

  getClient(): Redis {
    return this.client;
  }
}
