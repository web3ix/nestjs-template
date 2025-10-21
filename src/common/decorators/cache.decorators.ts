import { SetMetadata } from '@nestjs/common';

export const CACHE_KEY_METADATA = 'cache:key';
export const CACHE_TTL_METADATA = 'cache:ttl';

/**
 * Decorator to set cache key for method-level caching
 * @param key - Cache key template (can use :param for dynamic values)
 * @example @CacheKey('user::id')
 */
export const CacheKey = (key: string) => SetMetadata(CACHE_KEY_METADATA, key);

/**
 * Decorator to set cache TTL (Time To Live) in seconds
 * @param ttl - TTL in seconds
 * @example @CacheTTL(60) // Cache for 60 seconds
 */
export const CacheTTL = (ttl: number) => SetMetadata(CACHE_TTL_METADATA, ttl);
