import { ApiModule } from '@/api/api.module';
import authConfig from '@/api/auth/config/auth.config';
import { FallbackModule } from '@/api/fallback/fallback.module';
import appConfig from '@/config/app.config';
import { AllConfigType } from '@/config/config.type';
import redisConfig from '@/config/redis.config';
import { Environment } from '@/constants/app.constant';
import { CacheModule } from '@/infra/cache/cache.module';
import drizzleConfig from '@/infra/database/config/drizzle.config';
import { DrizzleModule } from '@/infra/database/drizzle.module';
import mailConfig from '@/infra/mail/config/mail.config';
import { MailModule } from '@/infra/mail/mail.module';
import { WebSocketModule } from '@/infra/websocket/websocket.module';
import { WorkersModule } from '@/workers/workers.module';
import { BullModule } from '@nestjs/bullmq';
import { CacheModule as NestCacheModule } from '@nestjs/cache-manager';
import { ModuleMetadata } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import {
  AcceptLanguageResolver,
  HeaderResolver,
  I18nModule,
  QueryResolver,
} from 'nestjs-i18n';
import { LoggerModule } from 'nestjs-pino';
import path from 'path';
import loggerFactory from './logger-factory';
function generateModulesSet() {
  const imports: ModuleMetadata['imports'] = [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig, drizzleConfig, redisConfig, mailConfig, authConfig],
      envFilePath: ['.env'],
    }),
  ];
  let customModules: ModuleMetadata['imports'] = [];

  const dbModule = DrizzleModule;

  const bullModule = BullModule.forRootAsync({
    imports: [ConfigModule],
    useFactory: (configService: ConfigService<AllConfigType>) => {
      return {
        connection: {
          host: configService.get('redis.host', {
            infer: true,
          }),
          port: configService.get('redis.port', {
            infer: true,
          }),
          password: configService.get('redis.password', {
            infer: true,
          }),
          tls: configService.get('redis.tlsEnabled', { infer: true }),
        },
      };
    },
    inject: [ConfigService],
  });

  const i18nModule = I18nModule.forRootAsync({
    resolvers: [
      { use: QueryResolver, options: ['lang'] },
      AcceptLanguageResolver,
      new HeaderResolver(['x-lang']),
    ],
    useFactory: (configService: ConfigService<AllConfigType>) => {
      const env = configService.get('app.nodeEnv', { infer: true });
      const isLocal = env === Environment.LOCAL;
      const isDevelopment = env === Environment.DEVELOPMENT;
      return {
        fallbackLanguage: configService.get('app.fallbackLanguage', {
          infer: true,
        }),
        loaderOptions: {
          path: path.join(__dirname, '../i18n/'),
          watch: isLocal,
        },
        typesOutputPath: path.join(
          __dirname,
          '../../src/generated/i18n.generated.ts',
        ),
        logging: isLocal || isDevelopment,
      };
    },
    inject: [ConfigService],
  });

  const loggerModule = LoggerModule.forRootAsync({
    imports: [ConfigModule],
    inject: [ConfigService],
    useFactory: loggerFactory,
  });

  const nestCacheModule = NestCacheModule.registerAsync({
    imports: [ConfigModule],
    useFactory: (_configService: ConfigService<AllConfigType>) => {
      return {
        // stores: createKeyv({
        //   password: configService.get('redis.password', {
        //     infer: true,
        //   }),
        //   socket: {
        //     host: configService.get('redis.host', {
        //       infer: true,
        //     }),
        //     port: configService.get('redis.port', {
        //       infer: true,
        //     }),
        //     tls: configService.get('redis.tlsEnabled', { infer: true }),
        //   },
        // }),
        // nonBlocking: true,
      };
    },
    isGlobal: true,
    inject: [ConfigService],
  });

  const modulesSet = process.env.MODULES_SET || 'monolith';

  switch (modulesSet) {
    case 'monolith':
      customModules = [
        bullModule,
        nestCacheModule,
        CacheModule,
        dbModule,
        i18nModule,
        loggerModule,
        ApiModule,
        MailModule,
        WebSocketModule,
        WorkersModule.forRoot(),
        FallbackModule, // Must be last to catch unmatched routes
      ];
      break;
    case 'api':
      customModules = [
        bullModule,
        nestCacheModule,
        CacheModule,
        dbModule,
        i18nModule,
        loggerModule,
        ApiModule,
        MailModule,
        WebSocketModule,
        FallbackModule, // Must be last to catch unmatched routes
      ];
      break;
    case 'workers':
      customModules = [
        bullModule,
        nestCacheModule,
        CacheModule,

        dbModule,
        i18nModule,
        loggerModule,
        WorkersModule.forRoot(),
      ];
      break;
    case 'background':
      // Legacy support - use 'workers' instead
      customModules = [
        bullModule,
        nestCacheModule,
        CacheModule,

        dbModule,
        i18nModule,
        loggerModule,
        WorkersModule.forRoot(),
      ];
      break;
    default:
      console.error(`Unsupported modules set: ${modulesSet}`);
      break;
  }

  return imports.concat(customModules);
}

export default generateModulesSet;
