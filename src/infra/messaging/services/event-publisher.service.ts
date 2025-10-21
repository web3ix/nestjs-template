import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { DomainEvent, IEventPublisher } from '../interfaces/event.interface';

@Injectable()
export class EventPublisherService implements IEventPublisher {
  private readonly logger = new Logger(EventPublisherService.name);

  constructor(private readonly eventEmitter: EventEmitter2) {}

  async publish(event: DomainEvent): Promise<void> {
    const eventName = event.getEventName();
    this.logger.log(`Publishing event: ${eventName}`, {
      eventId: event.eventId.toString(),
      occurredAt: event.occurredAt,
    });

    try {
      this.eventEmitter.emit(eventName, event);
    } catch (error) {
      this.logger.error(`Failed to publish event ${eventName}:`, error);
      throw error;
    }
  }

  async publishMany(events: DomainEvent[]): Promise<void> {
    this.logger.log(`Publishing ${events.length} events`);

    const publishPromises = events.map((event) => this.publish(event));
    await Promise.all(publishPromises);
  }
}
