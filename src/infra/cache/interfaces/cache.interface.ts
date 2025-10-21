export interface ICacheService {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T, ttl?: number): Promise<void>;
  del(key: string): Promise<void>;
  delPattern(pattern: string): Promise<void>;
  exists(key: string): Promise<boolean>;
  ttl(key: string): Promise<number>;
  expire(key: string, ttl: number): Promise<void>;
  increment(key: string, value?: number): Promise<number>;
  decrement(key: string, value?: number): Promise<number>;
  hset(key: string, field: string, value: any): Promise<void>;
  hget<T>(key: string, field: string): Promise<T | null>;
  hgetall<T>(key: string): Promise<Record<string, T>>;
  hdel(key: string, ...fields: string[]): Promise<void>;
  zadd(key: string, score: number, member: string): Promise<void>;
  zrange<T>(key: string, start: number, stop: number): Promise<T[]>;
  zrangeWithScores<T>(
    key: string,
    start: number,
    stop: number,
  ): Promise<Array<{ value: T; score: number }>>;
  zrem(key: string, member: string): Promise<void>;
  zremrangebyscore(key: string, min: number, max: number): Promise<void>;
  sadd(key: string, ...members: string[]): Promise<void>;
  smembers<T>(key: string): Promise<T[]>;
  srem(key: string, ...members: string[]): Promise<void>;
  sismember(key: string, member: string): Promise<boolean>;
  lpush(key: string, ...values: any[]): Promise<void>;
  rpush(key: string, ...values: any[]): Promise<void>;
  lpop<T>(key: string): Promise<T | null>;
  rpop<T>(key: string): Promise<T | null>;
  lrange<T>(key: string, start: number, stop: number): Promise<T[]>;
  llen(key: string): Promise<number>;
}
