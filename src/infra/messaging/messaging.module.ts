import { Module } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { EventPublisherService } from './services/event-publisher.service';

@Module({
  imports: [
    EventEmitterModule.forRoot({
      wildcard: true,
      delimiter: '.',
      maxListeners: 20,
      verboseMemoryLeak: true,
      ignoreErrors: false,
    }),
  ],
  providers: [
    {
      provide: 'IEventPublisher',
      useClass: EventPublisherService,
    },
    EventPublisherService,
  ],
  exports: ['IEventPublisher', EventPublisherService, EventEmitterModule],
})
export class MessagingModule {}
