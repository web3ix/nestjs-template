import validateConfig from '@/common/utils/validate-config';
import { registerAs } from '@nestjs/config';
import { IsString } from 'class-validator';
import { DrizzleConfig } from './drizzle-config.type';

class EnvironmentVariablesValidator {
  @IsString()
  DATABASE_URL: string;
}

export default registerAs<DrizzleConfig>('drizzle', () => {
  validateConfig(process.env, EnvironmentVariablesValidator);

  const databaseUrl = process.env.DATABASE_URL || 'sqlite://.sqlite/dev.db';
  const dialect = databaseUrl.startsWith('postgres') ? 'postgresql' : 'sqlite';

  return {
    url: databaseUrl,
    dialect,
  };
});
