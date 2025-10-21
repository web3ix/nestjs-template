# Background Workers

Automated background workers for the Maven Exchange platform.

## Overview

The background workers module provides automated processing for:
- **Ticker Updates**: 24-hour ticker statistics updates
- **Candle Generation**: OHLCV candlestick generation across all timeframes
- **Order Expiration**: Automatic expiration and cleanup of expired orders
- **Deposit Monitoring**: Blockchain deposit detection, confirmation tracking, and crediting

## Workers

### 1. Ticker Update Worker

**File**: `ticker-update.worker.ts`

Automatically updates 24-hour ticker statistics for all active trading pairs.

#### Schedule

```typescript
@Cron(CronExpression.EVERY_5_SECONDS)
// Runs: Every 5 seconds
```

#### What It Does

1. Fetches all active trading pairs
2. Calculates 24h statistics for each pair:
   - Last price, open, high, low
   - Price change and percentage
   - Volume (base + quote)
   - Trade count
3. Caches results in Redis (5s TTL)
4. Logs performance metrics

#### Example Log Output

```
[TickerUpdateWorker] Starting ticker update...
[TickerUpdateWorker] Updated ticker for BTC/USDT
[TickerUpdateWorker] Updated ticker for ETH/USDT
[TickerUpdateWorker] Updated 2 tickers in 87ms
```

#### Performance

- **Typical Duration**: 50-150ms for 10 pairs
- **Concurrency**: Updates all pairs in parallel
- **Skip Protection**: Skips execution if previous run still running
- **Error Handling**: Continues on individual pair failures

---

### 2. Candle Generation Worker

**File**: `candle-generation.worker.ts`

Automatically generates OHLCV candlestick data for all time intervals.

#### Schedules

| Interval | Cron Expression | Description |
|----------|----------------|-------------|
| 1m | `@Cron(CronExpression.EVERY_MINUTE)` | Every minute |
| 5m | `@Cron('0 */5 * * * *')` | Every 5 minutes |
| 15m | `@Cron('0 */15 * * * *')` | Every 15 minutes |
| 30m | `@Cron('0 */30 * * * *')` | Every 30 minutes |
| 1h | `@Cron(CronExpression.EVERY_HOUR)` | Every hour |
| 4h | `@Cron('0 0 */4 * * *')` | Every 4 hours |
| 1d | `@Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)` | Daily at midnight |
| 1w | `@Cron('0 0 0 * * 1')` | Every Monday at midnight |
| 1M | `@Cron('0 0 0 1 * *')` | 1st of month at midnight |

#### What It Does

1. Fetches all active trading pairs
2. Aggregates trades for the time interval
3. Calculates OHLCV data:
   - Open, High, Low, Close prices
   - Volume (base + quote)
   - Trade count
4. Caches candles in Redis (60s TTL)
5. Logs success/failure counts

#### Example Log Output

```
[CandleGenerationWorker] Starting 1m candle generation...
[CandleGenerationWorker] Generated 1m candle for BTC/USDT
[CandleGenerationWorker] Generated 1m candle for ETH/USDT
[CandleGenerationWorker] Generated 1m candles: 2 success, 0 failed (124ms)
```

#### Performance

- **1m candles**: ~100-200ms for 10 pairs
- **1h candles**: ~200-400ms for 10 pairs
- **1d candles**: ~300-600ms for 10 pairs
- **Concurrency**: Generates all pairs in parallel
- **Lock Protection**: Per-interval locks prevent overlapping

---

### 3. Order Expiration Worker

**File**: `order-expiration.worker.ts`

Automatically expires and cleans up orders that have passed their expiration time.

#### Schedule

```typescript
@Cron(CronExpression.EVERY_10_SECONDS)
// Runs: Every 10 seconds
```

#### What It Does

1. Fetches all active orders
2. Checks for expired orders (based on `expiresAt` field)
3. For each expired order:
   - Removes from matching engine
   - Updates order status to `EXPIRED`
   - Unlocks locked balance
   - Publishes `OrderExpiredEvent`
   - Publishes `BalanceUnlockedEvent`
4. Logs expiration statistics

#### Example Log Output

```
[OrderExpirationWorker] Checking for expired orders...
[OrderExpirationWorker] Expired order 123e4567-e89b-12d3-a456-426614174000 (BTC/USDT)
[OrderExpirationWorker] Expired 1 orders, 0 errors (45ms)
```

#### Performance

- **Typical Duration**: 20-50ms for 100 active orders
- **Skip Protection**: Skips if previous run still running
- **Error Handling**: Continues on individual order failures
- **Balance Safety**: Always unlocks balance even on partial failures

#### Balance Unlock Calculation

**Buy Orders:**
```
Unlock Amount = (Remaining Quantity × Price) + Fee
```

**Sell Orders:**
```
Unlock Amount = Remaining Quantity
```

---

### 4. Deposit Monitoring Worker

**File**: `deposit-monitoring.worker.ts`

Monitors blockchain deposits, tracks confirmations, and credits user balances.

#### Schedules

| Task | Cron Expression | Description |
|------|----------------|-------------|
| Check Confirmations | `@Cron(CronExpression.EVERY_30_SECONDS)` | Update deposit confirmations |
| Credit Deposits | `@Cron(CronExpression.EVERY_10_SECONDS)` | Credit confirmed deposits |
| Scan Blockchain | `@Cron(CronExpression.EVERY_MINUTE)` | Backup deposit scan |
| Log Stats | `@Cron('0 */5 * * * *')` | Deposit statistics |
| Check Stuck | `@Cron(CronExpression.EVERY_HOUR)` | Find stuck deposits |

#### What It Does

**Confirmation Tracking:**
1. Fetches all pending/confirming deposits
2. Queries blockchain for current block number
3. Calculates confirmations (current block - deposit block + 1)
4. Updates deposit confirmation count
5. Confirms deposits when reaching required confirmations
6. Publishes `DepositConfirmedEvent`

**Deposit Crediting:**
1. Fetches all confirmed deposits (not yet credited)
2. Credits wallet balance
3. Marks deposit as credited
4. Publishes `DepositCreditedEvent` and `BalanceCreditedEvent`
5. Handles failures by marking deposit as failed

**Blockchain Monitoring:**
1. Verifies blockchain monitor is active
2. Re-initializes if needed
3. Logs monitored chains

**Statistics & Alerts:**
1. Logs deposit counts by status
2. Warns about deposits waiting to be credited
3. Identifies stuck deposits (>24h old)

#### Example Log Output

```
[DepositMonitoringWorker] Checking deposit confirmations...
[DepositMonitoringWorker] Updated deposit abc-123 confirmations: 12
[DepositMonitoringWorker] Confirmed deposit abc-123 with 12 confirmations
[DepositMonitoringWorker] Checked 5 deposits: 3 updated, 2 confirmed, 0 errors (234ms)

[DepositMonitoringWorker] Crediting confirmed deposits...
[DepositMonitoringWorker] Credited deposit abc-123: 1.5 BTC (tx: 0x1234...)
[DepositMonitoringWorker] Credited 2 deposits, 0 errors (156ms)

[DepositMonitoringWorker] Deposit stats - Pending: 3, Confirming: 5, Confirmed: 2, Credited: 127
```

#### Deposit Flow

```
User Sends Transaction
    ↓
Blockchain Monitor Detects
    ↓
Create Deposit (PENDING)
    ↓
Block Confirmations Start
    ↓
[Worker] Update Confirmations
    ↓
Status: CONFIRMING
    ↓
[Worker] Check Confirmations >= Required
    ↓
Status: CONFIRMED
    ↓
[Worker] Credit Wallet Balance
    ↓
Status: CREDITED
    ↓
User Balance Updated ✓
```

#### Configuration

**Required Confirmations by Chain:**

```typescript
private getRequiredConfirmations(chainTokenId: any): number {
  // Default: 12 confirmations
  // TODO: Should be configurable per chain:
  // - Bitcoin: 6 confirmations
  // - Ethereum: 12 confirmations
  // - BSC: 15 confirmations
  // - Polygon: 128 confirmations
  // - Solana: 32 confirmations
  return 12;
}
```

#### Performance

- **Confirmation Check**: 100-300ms for 50 deposits
- **Crediting**: 50-150ms per deposit
- **Concurrency**: Processes all deposits in parallel
- **Skip Protection**: Skips if previous run still active
- **Error Handling**: Marks failed deposits, continues with others

#### Error Scenarios

**Failed to Credit:**
```
[DepositMonitoringWorker] Failed to credit deposit abc-123: Insufficient gas
```
- Deposit marked as FAILED
- Failure reason saved
- Can be manually retried

**Stuck Deposits:**
```
[DepositMonitoringWorker] Found 2 deposits stuck for >24h:
  - id: abc-123, txHash: 0x1234, status: CONFIRMING, confirmations: 8, age: 36h
```
- Logged every hour
- Requires manual investigation
- May indicate blockchain issues

**Blockchain Monitor Down:**
```
[DepositMonitoringWorker] Blockchain monitoring is not active!
```
- Automatically attempts re-initialization
- Critical alert - deposits won't be processed

#### Integration with Blockchain Monitor

The worker works with `BlockchainMonitorService`:

```typescript
// Real-time detection happens via BlockchainMonitorService
// Worker provides:
// 1. Confirmation tracking (every 30s)
// 2. Automatic crediting (every 10s)
// 3. Backup scanning (every minute)
// 4. Stuck deposit detection (hourly)
```

---

## Configuration

### Environment Variables

```env
# Workers are enabled by default in all modules sets
MODULES_SET=monolith  # or 'api' or 'background'

# Logging level
LOG_LEVEL=info  # debug, info, warn, error
```

### Module Sets

Workers are registered in the following module sets:

- **monolith**: All workers active (default)
- **api**: All workers active (for single-instance deployments)
- **background**: Only workers (for dedicated background worker instances)

---

## Monitoring

### Logs

All workers log their activity:

```
[TickerUpdateWorker] Updated 5 tickers in 92ms
[CandleGenerationWorker] Generated 1h candles: 5 success, 0 failed (156ms)
[OrderExpirationWorker] Expired 3 orders, 0 errors (34ms)
```

### Debug Mode

Enable debug logging to see detailed execution:

```typescript
// In worker files
this.logger.debug('Starting ticker update...');
this.logger.debug(`Updated ticker for ${pair.symbol}`);
```

Set `LOG_LEVEL=debug` in environment variables.

### Metrics to Track

**Ticker Worker:**
- Update frequency (should be ~5s)
- Update duration
- Number of pairs processed
- Failure rate

**Candle Worker:**
- Generation frequency per interval
- Generation duration
- Success/failure counts
- Missing candles (gaps in data)

**Expiration Worker:**
- Check frequency (should be ~10s)
- Expired order count
- Balance unlock failures
- Matching engine removal failures

---

## Performance Tuning

### Ticker Updates

If ticker updates are slow:

```typescript
// Increase concurrency limit (default: unlimited)
const batchSize = 10;
for (let i = 0; i < pairs.length; i += batchSize) {
  const batch = pairs.slice(i, i + batchSize);
  await Promise.all(batch.map(pair => this.tickerService.update24hTicker(pair.id)));
}
```

### Candle Generation

If candle generation is slow:

```typescript
// Increase interval between runs
@Cron('0 */2 * * * *') // Every 2 minutes instead of 1
async generate1mCandles() {
  // Generate last 2 candles to catch up
}
```

### Order Expiration

If expiration checks are slow:

```typescript
// Add pagination to active orders query
const limit = 100;
const orders = await this.orderService.getActiveOrders(limit);
```

---

## Error Handling

All workers implement robust error handling:

### Individual Item Failures

Workers continue processing even if individual items fail:

```typescript
for (const pair of pairs) {
  try {
    await this.tickerService.update24hTicker(pair.id);
  } catch (error) {
    this.logger.error(`Failed for ${pair.symbol}:`, error);
    // Continue to next pair
  }
}
```

### Complete Failures

If entire worker execution fails:

```typescript
try {
  // Worker logic
} catch (error) {
  this.logger.error('Worker failed:', error);
} finally {
  this.isRunning = false; // Always release lock
}
```

### Concurrency Protection

Workers skip execution if previous run is still active:

```typescript
if (this.isRunning) {
  this.logger.warn('Previous run still running, skipping...');
  return;
}
this.isRunning = true;
```

---

## Testing

### Manual Testing

Trigger workers manually for testing:

```typescript
// In a test or admin endpoint
import { TickerUpdateWorker } from '@/workers';

@Injectable()
export class AdminService {
  constructor(private readonly tickerWorker: TickerUpdateWorker) {}

  async triggerTickerUpdate() {
    await this.tickerWorker.updateAllTickers();
  }
}
```

### Unit Testing

```typescript
import { Test } from '@nestjs/testing';
import { TickerUpdateWorker } from './ticker-update.worker';

describe('TickerUpdateWorker', () => {
  let worker: TickerUpdateWorker;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        TickerUpdateWorker,
        // Mock dependencies
      ],
    }).compile();

    worker = module.get<TickerUpdateWorker>(TickerUpdateWorker);
  });

  it('should update all tickers', async () => {
    await worker.updateAllTickers();
    // Verify tickers were updated
  });
});
```

### Integration Testing

```typescript
describe('Workers Integration', () => {
  it('should generate candles after trades', async () => {
    // Create some trades
    await createTestTrades();
    
    // Wait for candle worker
    await sleep(65000); // Wait for next minute
    
    // Verify candles exist
    const candles = await candleService.getCandles(pairId, '1m');
    expect(candles.length).toBeGreaterThan(0);
  });
});
```

---

## Deployment

### Single Instance (Monolith)

Workers run alongside API:

```bash
MODULES_SET=monolith npm run start:prod
```

All workers active in same process as API.

### Dedicated Background Workers

Run workers separately from API:

**API Instance:**
```bash
MODULES_SET=api npm run start:prod
```

**Worker Instance:**
```bash
MODULES_SET=background npm run start:prod
```

Allows scaling API and workers independently.

### Horizontal Scaling

For multiple worker instances:

1. **Use distributed locks** (Redis-based):

```typescript
import Redlock from 'redlock';

@Injectable()
export class TickerUpdateWorker {
  private redlock: Redlock;

  async updateAllTickers() {
    const lock = await this.redlock.acquire(['ticker-update'], 5000);
    try {
      // Update tickers
    } finally {
      await lock.release();
    }
  }
}
```

2. **Or use unique worker assignments**:

```bash
# Worker 1: Only tickers
WORKER_TYPE=ticker npm run start:prod

# Worker 2: Only candles
WORKER_TYPE=candles npm run start:prod
```

---

## Troubleshooting

### Workers Not Running

**Check 1**: Module registered?

```typescript
// src/common/utils/modules-set.ts
customModules = [
  // ...
  WorkersModule, // Must be present
];
```

**Check 2**: Schedule module imported?

```typescript
// workers.module.ts
imports: [
  ScheduleModule.forRoot(), // Required
  // ...
],
```

### Ticker Updates Not Appearing

**Check 1**: Trading pairs exist?

```bash
# Check database
SELECT * FROM trading_pairs WHERE status = 'ACTIVE';
```

**Check 2**: Trades exist?

```bash
# Tickers need trades to calculate
SELECT COUNT(*) FROM trades WHERE created_at > NOW() - INTERVAL '24 hours';
```

**Check 3**: Redis cache?

```bash
# Check cached tickers
redis-cli KEYS "ticker:24h:*"
redis-cli GET "ticker:24h:<trading-pair-id>"
```

### Candles Not Generating

**Check 1**: Trades in time range?

```bash
# Candles need trades
SELECT COUNT(*) FROM trades 
WHERE created_at >= DATE_TRUNC('minute', NOW())
  AND created_at < DATE_TRUNC('minute', NOW()) + INTERVAL '1 minute';
```

**Check 2**: Candle service working?

```typescript
// Test directly
const candles = await candleService.generateCandles(pairId, '1m');
console.log('Generated candles:', candles);
```

### Orders Not Expiring

**Check 1**: Orders have expiration?

```bash
# Check for expired orders
SELECT * FROM orders 
WHERE status IN ('OPEN', 'PARTIALLY_FILLED')
  AND expires_at < NOW();
```

**Check 2**: Expiration worker running?

```bash
# Check logs
grep "OrderExpirationWorker" logs/app.log
```

---

## Best Practices

### 1. Idempotency

Make workers idempotent (safe to run multiple times):

```typescript
// Bad: Might create duplicates
await createCandle(data);

// Good: Upsert or check existence
const existing = await findCandle(timestamp);
if (!existing) {
  await createCandle(data);
}
```

### 2. Batching

Process items in batches for better performance:

```typescript
const batchSize = 100;
for (let i = 0; i < items.length; i += batchSize) {
  const batch = items.slice(i, i + batchSize);
  await processBatch(batch);
}
```

### 3. Graceful Degradation

Continue on failures, don't stop entire worker:

```typescript
let successCount = 0;
let failCount = 0;

for (const item of items) {
  try {
    await processItem(item);
    successCount++;
  } catch (error) {
    failCount++;
    this.logger.error(`Failed: ${item.id}`, error);
  }
}

this.logger.log(`Processed: ${successCount} success, ${failCount} failed`);
```

### 4. Monitoring

Always log metrics:

```typescript
const startTime = Date.now();
// ... process ...
const duration = Date.now() - startTime;
this.logger.log(`Processed ${count} items in ${duration}ms`);
```

### 5. Resource Cleanup

Always cleanup resources:

```typescript
try {
  this.isRunning = true;
  // ... work ...
} finally {
  this.isRunning = false; // Always reset
}
```

---

## Future Enhancements

Potential improvements:

1. **WebSocket Broadcasting**: Broadcast updates to connected clients
2. **Metrics Collection**: Prometheus/Grafana metrics
3. **Dead Letter Queue**: Failed items for retry
4. **Health Checks**: Worker health endpoints
5. **Circuit Breaker**: Stop worker on repeated failures
6. **Adaptive Scheduling**: Adjust frequency based on load
7. **Distributed Locking**: Redis-based locks for multi-instance
8. **Worker Prioritization**: Critical workers run first

---

## Related Documentation

- Market Data: `src/infra/market-data/README.md`
- Order Domain: `src/domains/order/README.md`
- Wallet Domain: `src/domains/wallet/README.md`
- Messaging: `src/infra/messaging/README.md`
