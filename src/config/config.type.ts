import { AuthConfig } from '@/api/auth/config/auth-config.type';
import { RedisConfig } from '@/config/redis-config.type';
import { DrizzleConfig } from '@/infra/database/config/drizzle-config.type';
import { MailConfig } from '@/infra/mail/config/mail-config.type';
import { AppConfig } from './app-config.type';

export type AllConfigType = {
  app: AppConfig;
  drizzle: DrizzleConfig;
  redis: RedisConfig;
  auth: AuthConfig;
  mail: MailConfig;
};
