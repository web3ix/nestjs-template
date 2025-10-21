import { Public } from '@/common/decorators/public.decorator';
import { AllConfigType } from '@/config/config.type';
import { Environment } from '@/constants/app.constant';
import { DrizzleService } from '@/infra/database/drizzle.service';
import { Controller, Get } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  HealthCheck,
  HealthCheckResult,
  HealthCheckService,
  HealthIndicatorResult,
  HttpHealthIndicator,
} from '@nestjs/terminus';

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(
    private configService: ConfigService<AllConfigType>,
    private health: HealthCheckService,
    private http: HttpHealthIndicator,
    private drizzle: DrizzleService,
  ) {}

  @Public()
  @ApiOperation({ summary: 'Health check' })
  @Get()
  @HealthCheck()
  async check(): Promise<HealthCheckResult> {
    const list = [
      () => this.databaseHealthCheck(),
      ...(this.configService.getOrThrow('app.nodeEnv', { infer: true }) ===
      Environment.DEVELOPMENT
        ? [
            () =>
              this.http.pingCheck(
                'docs',
                `${this.configService.getOrThrow('app.url', { infer: true })}/docs`,
              ),
          ]
        : []),
    ];
    return this.health.check(list);
  }

  private async databaseHealthCheck(): Promise<HealthIndicatorResult> {
    const db = this.drizzle.getDb();
    const dialect = this.drizzle.getDialect();

    if (dialect === 'postgresql') {
      await db.execute('SELECT 1');
    } else {
      await db.all('SELECT 1');
    }

    return {
      database: {
        status: 'up',
      },
    };
  }
}
