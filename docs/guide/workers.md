# Workers

Background job processing using BullMQ with Redis.

## Overview

Workers handle:
- **Async Tasks**: Long-running operations
- **Scheduled Jobs**: Cron-based tasks
- **Distributed Processing**: Scale across multiple instances
- **Job Queues**: Prioritized job processing
- **Retry Logic**: Automatic retry on failure

## Configuration

```env
# Enable/disable workers
WORKERS_ENABLED=true

# Specific workers to enable
ENABLED_WORKERS=all  # or comma-separated: ticker,candles

# Redis for queues
QUEUE_REDIS_URL=redis://localhost:6379
```

## Creating a Worker

```typescript
import { Processor, WorkerHost } from '@nestjs/bullmq'
import { Job } from 'bullmq'

@Processor('email')
export class EmailWorker extends WorkerHost {
  async process(job: Job): Promise<any> {
    const { email, subject, body } = job.data

    await this.sendEmail(email, subject, body)

    return { sent: true }
  }

  private async sendEmail(email: string, subject: string, body: string) {
    // Email sending logic
  }
}
```

## Adding Jobs to Queue

```typescript
import { InjectQueue } from '@nestjs/bullmq'
import { Queue } from 'bullmq'

@Injectable()
export class UserService {
  constructor(
    @InjectQueue('email')
    private readonly emailQueue: Queue,
  ) {}

  async sendWelcomeEmail(email: string): Promise<void> {
    await this.emailQueue.add('welcome-email', {
      email,
      subject: 'Welcome!',
      body: 'Thank you for registering',
    })
  }
}
```

## Job Options

```typescript
await this.emailQueue.add(
  'welcome-email',
  { email, subject, body },
  {
    attempts: 3,                    // Retry up to 3 times
    backoff: {
      type: 'exponential',          // Exponential backoff
      delay: 60000,                 // Start with 1 minute
    },
    delay: 5000,                    // Delay 5 seconds before processing
    priority: 1,                    // Higher priority (lower number)
    removeOnComplete: true,         // Remove after completion
    removeOnFail: false,            // Keep failed jobs
  },
)
```

## Scheduled Jobs

### Cron Jobs

```typescript
import { Cron, CronExpression } from '@nestjs/schedule'

@Injectable()
export class TickerWorker {
  @Cron(CronExpression.EVERY_10_SECONDS)
  async updateTickers(): Promise<void> {
    // Update ticker data
  }

  @Cron('0 0 * * *') // Daily at midnight
  async dailyCleanup(): Promise<void> {
    // Cleanup old data
  }
}
```

### Repeatable Jobs

```typescript
await this.queue.add(
  'sync-data',
  { source: 'api' },
  {
    repeat: {
      pattern: '*/5 * * * *', // Every 5 minutes
    },
  },
)
```

## Job Progress

Report progress for long-running jobs:

```typescript
async process(job: Job): Promise<any> {
  const items = job.data.items
  const total = items.length

  for (let i = 0; i < total; i++) {
    await this.processItem(items[i])
    
    // Update progress
    await job.updateProgress((i + 1) / total * 100)
  }

  return { processed: total }
}
```

## Job Events

Listen to job events:

```typescript
@Processor('email')
export class EmailWorker extends WorkerHost {
  async process(job: Job): Promise<any> {
    // Process job
  }

  @OnWorkerEvent('completed')
  onCompleted(job: Job) {
    console.log(`Job ${job.id} completed`)
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job, error: Error) {
    console.error(`Job ${job.id} failed:`, error)
  }

  @OnWorkerEvent('progress')
  onProgress(job: Job, progress: number) {
    console.log(`Job ${job.id} progress: ${progress}%`)
  }
}
```

## Distributed Locks

Prevent concurrent execution:

```typescript
import { DistributedLockService } from '@/workers/services/distributed-lock.service'

@Injectable()
export class SyncWorker {
  constructor(
    private readonly lockService: DistributedLockService,
  ) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async syncData(): Promise<void> {
    const lock = await this.lockService.acquire('sync-data', 60000) // 60s TTL

    if (!lock) {
      console.log('Another instance is already syncing')
      return
    }

    try {
      // Perform sync
      await this.performSync()
    } finally {
      await this.lockService.release('sync-data')
    }
  }
}
```

## Queue Management

### Pause/Resume Queue

```typescript
// Pause queue
await this.queue.pause()

// Resume queue
await this.queue.resume()
```

### Clean Old Jobs

```typescript
// Remove completed jobs older than 1 day
await this.queue.clean(24 * 60 * 60 * 1000, 'completed')

// Remove failed jobs older than 7 days
await this.queue.clean(7 * 24 * 60 * 60 * 1000, 'failed')
```

### Get Job Counts

```typescript
const counts = await this.queue.getJobCounts()
console.log({
  waiting: counts.waiting,
  active: counts.active,
  completed: counts.completed,
  failed: counts.failed,
})
```

## Worker Registration

Workers are automatically registered in `WorkersModule`:

```typescript
@Module({})
export class WorkersModule {
  static forRoot(): DynamicModule {
    return {
      module: WorkersModule,
      imports: [
        BullModule.forRoot({
          connection: {
            url: process.env.QUEUE_REDIS_URL,
          },
        }),
        BullModule.registerQueue(
          { name: 'email' },
          { name: 'ticker' },
        ),
      ],
      providers: [
        EmailWorker,
        TickerWorker,
      ],
    }
  }
}
```

## Error Handling

```typescript
async process(job: Job): Promise<any> {
  try {
    await this.performTask(job.data)
    return { success: true }
  } catch (error) {
    console.error(`Job ${job.id} failed:`, error)
    
    // Throw error to trigger retry
    throw error
  }
}
```

## Monitoring

### BullBoard (Optional)

Install and configure Bull Board for monitoring:

```bash
pnpm add @bull-board/api @bull-board/fastify
```

```typescript
import { createBullBoard } from '@bull-board/api'
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter'
import { FastifyAdapter } from '@bull-board/fastify'

const serverAdapter = new FastifyAdapter()
createBullBoard({
  queues: [
    new BullMQAdapter(emailQueue),
    new BullMQAdapter(tickerQueue),
  ],
  serverAdapter,
})

app.register(serverAdapter.registerPlugin(), { prefix: '/admin/queues' })
```

Access at `http://localhost:3000/admin/queues`

## Testing Workers

```typescript
describe('EmailWorker', () => {
  let worker: EmailWorker
  let mailService: MailService

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        EmailWorker,
        {
          provide: MailService,
          useValue: {
            send: jest.fn(),
          },
        },
      ],
    }).compile()

    worker = module.get<EmailWorker>(EmailWorker)
    mailService = module.get<MailService>(MailService)
  })

  it('should send email', async () => {
    const job = {
      data: {
        email: 'user@example.com',
        subject: 'Test',
        body: 'Hello',
      },
    } as Job

    await worker.process(job)

    expect(mailService.send).toHaveBeenCalledWith({
      to: 'user@example.com',
      subject: 'Test',
      body: 'Hello',
    })
  })
})
```

## Best Practices

1. **Idempotent jobs**: Jobs should be safe to retry
2. **Small payloads**: Keep job data minimal
3. **Error handling**: Always handle errors properly
4. **Timeouts**: Set reasonable timeouts
5. **Monitoring**: Monitor queue health
6. **Cleanup**: Remove old jobs regularly
7. **Logging**: Log job execution for debugging

## Next Steps

- [Messaging](/guide/messaging) - Event-driven architecture
- [Caching](/guide/caching) - Redis caching
- [Configuration](/guide/configuration) - Configure workers
