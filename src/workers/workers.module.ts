import { DynamicModule, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Module({})
export class WorkersModule {
  static forRoot(): DynamicModule {
    return {
      module: WorkersModule,
      imports: [],
      providers: [...WorkersModule.getEnabledWorkers()],
      exports: [...WorkersModule.getEnabledWorkers()],
    };
  }

  private static getEnabledWorkers() {
    const configService = new ConfigService();

    // Check if workers are enabled globally
    const workersEnabled = configService.get<boolean>('workers.enabled', true);

    if (!workersEnabled) {
      console.log(
        '[WorkersModule] All workers disabled via WORKERS_ENABLED=false',
      );
      return [];
    }

    const workers = [];

    // // Ticker Update Worker
    // if (allEnabled || enabledWorkersList.includes('ticker')) {
    //   workers.push(TickerUpdateWorker);
    //   console.log('[WorkersModule] Ticker Update Worker enabled');
    // }

    // // Candle Generation Worker
    // if (allEnabled || enabledWorkersList.includes('candles')) {
    //   workers.push(CandleGenerationWorker);
    //   console.log('[WorkersModule] Candle Generation Worker enabled');
    // }

    // // Order Expiration Worker
    // if (allEnabled || enabledWorkersList.includes('orderExpiration')) {
    //   workers.push(OrderExpirationWorker);
    //   console.log('[WorkersModule] Order Expiration Worker enabled');
    // }

    // // Deposit Monitoring Worker
    // if (allEnabled || enabledWorkersList.includes('depositMonitoring')) {
    //   workers.push(DepositMonitoringWorker);
    //   console.log('[WorkersModule] Deposit Monitoring Worker enabled');
    // }

    // // Withdrawal Processing Worker
    // if (allEnabled || enabledWorkersList.includes('withdrawalProcessing')) {
    //   workers.push(WithdrawalProcessingWorker);
    //   console.log('[WorkersModule] Withdrawal Processing Worker enabled');
    // }

    if (workers.length === 0) {
      console.log('[WorkersModule] No workers enabled');
    } else {
      console.log(`[WorkersModule] ${workers.length} workers enabled`);
    }

    return workers;
  }
}
