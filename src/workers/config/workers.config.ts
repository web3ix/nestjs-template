import { registerAs } from '@nestjs/config';

export interface WorkersConfig {
  enabled: boolean;
  enabledWorkers: {
    ticker: boolean;
    candles: boolean;
    orderExpiration: boolean;
    depositMonitoring: boolean;
  };
  distributedLocking: {
    enabled: boolean;
    redisUrl: string;
    ttl: number; // milliseconds
    retryCount: number;
    retryDelay: number;
  };
}

export default registerAs('workers', (): WorkersConfig => {
  // Parse enabled workers from comma-separated list
  const enabledWorkersEnv = process.env.ENABLED_WORKERS || 'all';
  const enabledWorkersList = enabledWorkersEnv.split(',').map((w) => w.trim());

  const allEnabled = enabledWorkersEnv === 'all';

  return {
    // Master switch for all workers
    enabled: process.env.WORKERS_ENABLED !== 'false',

    // Individual worker toggles
    enabledWorkers: {
      ticker: allEnabled || enabledWorkersList.includes('ticker'),
      candles: allEnabled || enabledWorkersList.includes('candles'),
      orderExpiration:
        allEnabled || enabledWorkersList.includes('orderExpiration'),
      depositMonitoring:
        allEnabled || enabledWorkersList.includes('depositMonitoring'),
    },

    // Distributed locking for multi-instance deployments
    distributedLocking: {
      enabled: process.env.DISTRIBUTED_LOCKING_ENABLED === 'true',
      redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',
      ttl: parseInt(process.env.LOCK_TTL || '30000'), // 30 seconds
      retryCount: parseInt(process.env.LOCK_RETRY_COUNT || '3'),
      retryDelay: parseInt(process.env.LOCK_RETRY_DELAY || '200'), // ms
    },
  };
});
