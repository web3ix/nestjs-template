import { Global, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import drizzleConfig from './config/drizzle.config';
import { DrizzleService } from './drizzle.service';

@Global()
@Module({
  imports: [ConfigModule.forFeature(drizzleConfig)],
  providers: [DrizzleService],
  exports: [DrizzleService],
})
export class DrizzleModule {}
