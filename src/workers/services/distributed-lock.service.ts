import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Redis } from 'ioredis';

export interface LockOptions {
  ttl?: number; // milliseconds
  retryCount?: number;
  retryDelay?: number; // milliseconds
}

@Injectable()
export class DistributedLockService implements OnModuleDestroy {
  private readonly logger = new Logger(DistributedLockService.name);
  private redis: Redis | null = null;
  private readonly enabled: boolean;
  private readonly defaultTtl: number;
  private readonly defaultRetryCount: number;
  private readonly defaultRetryDelay: number;

  constructor(private readonly configService: ConfigService) {
    this.enabled = this.configService.get<boolean>(
      'workers.distributedLocking.enabled',
      false,
    );
    this.defaultTtl = this.configService.get<number>(
      'workers.distributedLocking.ttl',
      30000,
    );
    this.defaultRetryCount = this.configService.get<number>(
      'workers.distributedLocking.retryCount',
      3,
    );
    this.defaultRetryDelay = this.configService.get<number>(
      'workers.distributedLocking.retryDelay',
      200,
    );

    if (this.enabled) {
      this.initializeRedis();
    } else {
      this.logger.log('Distributed locking is disabled');
    }
  }

  private initializeRedis(): void {
    const redisUrl = this.configService.get<string>(
      'workers.distributedLocking.redisUrl',
    );

    if (!redisUrl) {
      this.logger.warn(
        'Redis URL not configured, distributed locking will not work',
      );
      return;
    }

    try {
      this.redis = new Redis(redisUrl, {
        maxRetriesPerRequest: 3,
        enableReadyCheck: true,
        lazyConnect: false,
      });

      this.redis.on('connect', () => {
        this.logger.log('Connected to Redis for distributed locking');
      });

      this.redis.on('error', (error) => {
        this.logger.error('Redis connection error:', error);
      });
    } catch (error) {
      this.logger.error(
        'Failed to initialize Redis for distributed locking:',
        error,
      );
    }
  }

  async onModuleDestroy() {
    if (this.redis) {
      await this.redis.quit();
    }
  }

  /**
   * Acquire a distributed lock
   * @param key - Lock key
   * @param options - Lock options
   * @returns Lock token if acquired, null otherwise
   */
  async acquire(key: string, options?: LockOptions): Promise<string | null> {
    // If distributed locking is disabled, always return a token (local mode)
    if (!this.enabled || !this.redis) {
      return `local-${Date.now()}`;
    }

    const ttl = options?.ttl || this.defaultTtl;
    const retryCount = options?.retryCount || this.defaultRetryCount;
    const retryDelay = options?.retryDelay || this.defaultRetryDelay;
    const token = `${process.pid}-${Date.now()}-${Math.random()}`;
    const lockKey = `worker:lock:${key}`;

    for (let attempt = 0; attempt <= retryCount; attempt++) {
      try {
        // SET key token NX PX ttl
        // NX: Only set if not exists
        // PX: Set expiry in milliseconds
        const result = await this.redis.set(lockKey, token, 'PX', ttl, 'NX');

        if (result === 'OK') {
          this.logger.debug(`Acquired lock: ${key} (attempt ${attempt + 1})`);
          return token;
        }

        // Lock not acquired, retry if attempts remaining
        if (attempt < retryCount) {
          await this.sleep(retryDelay);
        }
      } catch (error) {
        this.logger.error(`Error acquiring lock ${key}:`, error);
        return null;
      }
    }

    this.logger.debug(
      `Failed to acquire lock: ${key} after ${retryCount + 1} attempts`,
    );
    return null;
  }

  /**
   * Release a distributed lock
   * @param key - Lock key
   * @param token - Lock token from acquire
   */
  async release(key: string, token: string): Promise<boolean> {
    if (!this.enabled || !this.redis) {
      return true;
    }

    const lockKey = `worker:lock:${key}`;

    try {
      // Use Lua script to ensure atomic check-and-delete
      const script = `
        if redis.call("get", KEYS[1]) == ARGV[1] then
          return redis.call("del", KEYS[1])
        else
          return 0
        end
      `;

      const result = await this.redis.eval(script, 1, lockKey, token);

      if (result === 1) {
        this.logger.debug(`Released lock: ${key}`);
        return true;
      } else {
        this.logger.warn(
          `Failed to release lock ${key}: token mismatch or expired`,
        );
        return false;
      }
    } catch (error) {
      this.logger.error(`Error releasing lock ${key}:`, error);
      return false;
    }
  }

  /**
   * Extend lock TTL
   * @param key - Lock key
   * @param token - Lock token
   * @param ttl - New TTL in milliseconds
   */
  async extend(key: string, token: string, ttl: number): Promise<boolean> {
    if (!this.enabled || !this.redis) {
      return true;
    }

    const lockKey = `worker:lock:${key}`;

    try {
      // Use Lua script to ensure atomic check-and-extend
      const script = `
        if redis.call("get", KEYS[1]) == ARGV[1] then
          return redis.call("pexpire", KEYS[1], ARGV[2])
        else
          return 0
        end
      `;

      const result = await this.redis.eval(script, 1, lockKey, token, ttl);

      if (result === 1) {
        this.logger.debug(`Extended lock: ${key} by ${ttl}ms`);
        return true;
      } else {
        this.logger.warn(
          `Failed to extend lock ${key}: token mismatch or expired`,
        );
        return false;
      }
    } catch (error) {
      this.logger.error(`Error extending lock ${key}:`, error);
      return false;
    }
  }

  /**
   * Execute a function with a distributed lock
   * @param key - Lock key
   * @param fn - Function to execute
   * @param options - Lock options
   */
  async withLock<T>(
    key: string,
    fn: () => Promise<T>,
    options?: LockOptions,
  ): Promise<T | null> {
    const token = await this.acquire(key, options);

    if (!token) {
      this.logger.warn(`Could not acquire lock for ${key}, skipping execution`);
      return null;
    }

    try {
      const result = await fn();
      return result;
    } finally {
      await this.release(key, token);
    }
  }

  /**
   * Check if a lock exists
   * @param key - Lock key
   */
  async exists(key: string): Promise<boolean> {
    if (!this.enabled || !this.redis) {
      return false;
    }

    const lockKey = `worker:lock:${key}`;
    const result = await this.redis.exists(lockKey);
    return result === 1;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
