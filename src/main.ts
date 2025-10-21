import {
  ClassSerializerInterceptor,
  HttpStatus,
  RequestMethod,
  UnprocessableEntityException,
  ValidationError,
  ValidationPipe,
  VersioningType,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory, Reflector } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import compression from 'compression';
import helmet from 'helmet';
import { Logger } from 'nestjs-pino';
import { AuthService } from './api/auth/auth.service';
import { AppModule } from './app.module';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';
import { AuthGuard } from './common/guards/auth.guard';
import setupSwagger from './common/utils/setup-swagger';
import { type AllConfigType } from './config/config.type';
async function bootstrap() {
  const httpPlatform = process.env.HTTP_PLATFORM || 'fastify';

  console.info(`HTTP Platform: ${httpPlatform}`);

  if (httpPlatform === 'express') {
    return bootstrapExpress();
  } else {
    return bootstrapFastify();
  }
}

async function bootstrapExpress() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bufferLogs: true,
  });

  app.useLogger(app.get(Logger));

  const isDev = process.env.NODE_ENV === 'development';

  // Setup security headers with Swagger-friendly CSP
  app.use(
    helmet({
      contentSecurityPolicy: isDev
        ? {
            directives: {
              defaultSrc: ["'self'"],
              styleSrc: [
                "'self'",
                "'unsafe-inline'",
                'https://cdn.jsdelivr.net',
              ],
              scriptSrc: [
                "'self'",
                "'unsafe-inline'",
                "'unsafe-eval'",
                'https://cdn.jsdelivr.net',
              ],
              imgSrc: [
                "'self'",
                'data:',
                'https://cdn.jsdelivr.net',
                'https://validator.swagger.io',
              ],
              connectSrc: [
                "'self'",
                'http://localhost:*',
                'http://127.0.0.1:*',
                'ws://localhost:*',
                'ws://127.0.0.1:*',
              ],
            },
          }
        : true, // Production: use default strict CSP
    }),
  );
  app.use(compression());

  const { port } = setupCommonMiddleware(app);

  await app.listen(port);
  console.info(`Server running on ${await app.getUrl()}`);

  return app;
}

async function bootstrapFastify() {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter(),
    {
      bufferLogs: true,
    },
  );

  app.useLogger(app.get(Logger));

  const isDev = process.env.NODE_ENV === 'development';

  // Setup security headers with Swagger-friendly CSP
  const { default: fastifyHelmet } = await import('@fastify/helmet');
  const { default: fastifyCompress } = await import('@fastify/compress');

  await app.register(fastifyHelmet, {
    contentSecurityPolicy: isDev
      ? {
          directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'", 'https://cdn.jsdelivr.net'],
            scriptSrc: [
              "'self'",
              "'unsafe-inline'",
              "'unsafe-eval'",
              'https://cdn.jsdelivr.net',
            ],
            imgSrc: [
              "'self'",
              'data:',
              'https://cdn.jsdelivr.net',
              'https://validator.swagger.io',
            ],
            connectSrc: ["'self'", 'http://localhost:*', 'ws://localhost:*'],
          },
        }
      : true, // Production: use default strict CSP
  });

  await app.register(fastifyCompress);

  const { port } = setupCommonMiddleware(app);

  await app.listen(port, '0.0.0.0');
  console.info(`Server running on ${await app.getUrl()}`);

  return app;
}

function setupCommonMiddleware(
  app: NestExpressApplication | NestFastifyApplication,
) {
  const configService = app.get(ConfigService<AllConfigType>);
  const reflector = app.get(Reflector);
  const isDevelopment =
    configService.get('app.nodeEnv', { infer: true }) === 'development';
  const corsOrigin = configService.get('app.corsOrigin', {
    infer: true,
  });

  // Enhanced CORS configuration
  // In development, allow both localhost and 127.0.0.1 with any port
  const corsConfig = isDevelopment
    ? {
        origin: true, // Allow all origins in development
        methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
        allowedHeaders: 'Content-Type, Accept, Authorization, X-Custom-Lang',
        credentials: true,
      }
    : {
        origin: corsOrigin, // Use configured origins in production
        methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
        allowedHeaders: 'Content-Type, Accept, Authorization, X-Custom-Lang',
        credentials: true,
      };

  app.enableCors(corsConfig);
  console.info('CORS:', isDevelopment ? 'All origins (dev)' : corsOrigin);

  // Use global prefix if you don't have subdomain
  app.setGlobalPrefix(configService.get('app.apiPrefix', { infer: true }), {
    exclude: [
      { method: RequestMethod.GET, path: '/' },
      { method: RequestMethod.GET, path: 'health' },
      // Common browser/tool requests - excluded from /api prefix
      { method: RequestMethod.ALL, path: 'favicon.ico' },
      { method: RequestMethod.ALL, path: 'robots.txt' },
      { method: RequestMethod.ALL, path: 'sitemap.xml' },
      { method: RequestMethod.ALL, path: 'apple-touch-icon.png' },
      { method: RequestMethod.ALL, path: 'apple-touch-icon-precomposed.png' },
      { method: RequestMethod.ALL, path: 'manifest.json' },
      // Note: .well-known/* cannot be excluded due to wildcard routing limitations
      // These will be silently handled by GlobalExceptionFilter instead
    ],
  });

  app.enableVersioning({
    type: VersioningType.URI,
  });

  // Global Guards - Applied to all routes
  // Use @Public() decorator to bypass authentication
  // Use @UseGuards(AdminGuard) for admin-only endpoints
  app.useGlobalGuards(new AuthGuard(reflector, app.get(AuthService)));

  // Global Exception Filter
  app.useGlobalFilters(new GlobalExceptionFilter(configService));

  // Global Validation Pipe
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      errorHttpStatusCode: HttpStatus.UNPROCESSABLE_ENTITY,
      exceptionFactory: (errors: ValidationError[]) => {
        return new UnprocessableEntityException(errors);
      },
    }),
  );

  // Global Interceptors - Transform responses
  app.useGlobalInterceptors(new ClassSerializerInterceptor(reflector));

  if (isDevelopment) {
    setupSwagger(app as Parameters<typeof setupSwagger>[0]);
  }

  const port = configService.get('app.port', { infer: true });
  return { port };
}

void bootstrap();
