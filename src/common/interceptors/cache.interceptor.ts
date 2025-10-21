import {
  CallHandler,
  ExecutionContext,
  Inject,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable, of } from 'rxjs';
import { tap } from 'rxjs/operators';
import {
  CACHE_KEY_METADATA,
  CACHE_TTL_METADATA,
} from '../decorators/cache.decorators';

@Injectable()
export class CacheInterceptor implements NestInterceptor {
  private readonly logger = new Logger(CacheInterceptor.name);

  constructor(
    @Inject('CacheService') private readonly cacheService: any,
    private readonly reflector: Reflector,
  ) {}

  async intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Promise<Observable<any>> {
    const cacheKey = this.reflector.get<string>(
      CACHE_KEY_METADATA,
      context.getHandler(),
    );
    const cacheTTL = this.reflector.get<number>(
      CACHE_TTL_METADATA,
      context.getHandler(),
    );

    if (!cacheKey) {
      return next.handle();
    }

    const request = context.switchToHttp().getRequest();
    const key = this.generateCacheKey(cacheKey, request);

    try {
      const cached = await this.cacheService.get(key);
      if (cached !== null) {
        this.logger.debug(`Cache hit for key: ${key}`);
        return of(cached);
      }
    } catch (error) {
      this.logger.error(`Cache get error: ${error}`);
    }

    this.logger.debug(`Cache miss for key: ${key}`);

    return next.handle().pipe(
      tap(async (response) => {
        try {
          await this.cacheService.set(key, response, cacheTTL);
          this.logger.debug(`Cached response for key: ${key}`);
        } catch (error) {
          this.logger.error(`Cache set error: ${error}`);
        }
      }),
    );
  }

  private generateCacheKey(template: string, request: any): string {
    let key = template;

    // Replace :param with actual request params
    if (request.params) {
      Object.keys(request.params).forEach((param) => {
        key = key.replace(`:${param}`, request.params[param]);
      });
    }

    // Replace :query with actual query params
    if (request.query) {
      Object.keys(request.query).forEach((param) => {
        key = key.replace(`:${param}`, request.query[param]);
      });
    }

    return key;
  }
}
