import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';

@Injectable()
export class MemoryCacheService implements OnModuleDestroy {
  private readonly logger = new Logger(MemoryCacheService.name);
  private readonly store = new Map<
    string,
    { value: unknown; expires?: number }
  >();
  private cleanupInterval: NodeJS.Timeout;

  constructor() {
    // Cleanup expired keys every minute
    this.cleanupInterval = setInterval(() => this.cleanup(), 60000);
    this.logger.log('Memory cache initialized');
  }

  async get<T>(key: string): Promise<T | null> {
    const item = this.store.get(key);
    if (!item) return null;

    if (item.expires && Date.now() > item.expires) {
      this.store.delete(key);
      return null;
    }

    return item.value as T;
  }

  async set<T>(key: string, value: T, ttl?: number): Promise<void> {
    const expires = ttl ? Date.now() + ttl * 1000 : undefined;
    this.store.set(key, { value, expires });
  }

  async del(key: string): Promise<void> {
    this.store.delete(key);
  }

  async delPattern(pattern: string): Promise<void> {
    const regex = new RegExp(pattern.replace(/\*/g, '.*'));
    const keys = Array.from(this.store.keys()).filter((key) => regex.test(key));
    keys.forEach((key) => this.store.delete(key));
  }

  async exists(key: string): Promise<boolean> {
    const item = this.store.get(key);
    if (!item) return false;

    if (item.expires && Date.now() > item.expires) {
      this.store.delete(key);
      return false;
    }

    return true;
  }

  async ttl(key: string): Promise<number> {
    const item = this.store.get(key);
    if (!item) return -2;

    if (!item.expires) return -1;

    const remaining = Math.floor((item.expires - Date.now()) / 1000);
    return remaining > 0 ? remaining : -2;
  }

  async expire(key: string, ttl: number): Promise<void> {
    const item = this.store.get(key);
    if (item) {
      item.expires = Date.now() + ttl * 1000;
    }
  }

  async increment(key: string, value: number = 1): Promise<number> {
    const current = (await this.get<number>(key)) || 0;
    const newValue = current + value;
    await this.set(key, newValue);
    return newValue;
  }

  async decrement(key: string, value: number = 1): Promise<number> {
    const current = (await this.get<number>(key)) || 0;
    const newValue = current - value;
    await this.set(key, newValue);
    return newValue;
  }

  private cleanup() {
    const now = Date.now();
    const expired: string[] = [];

    this.store.forEach((item, key) => {
      if (item.expires && now > item.expires) {
        expired.push(key);
      }
    });

    expired.forEach((key) => this.store.delete(key));

    if (expired.length > 0) {
      this.logger.debug(`Cleaned up ${expired.length} expired keys`);
    }
  }

  onModuleDestroy() {
    clearInterval(this.cleanupInterval);
    this.store.clear();
    this.logger.log('Memory cache destroyed');
  }
}
