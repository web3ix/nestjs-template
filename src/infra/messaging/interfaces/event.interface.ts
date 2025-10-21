import { Uuid } from '@/common/types/uuid.type';

export abstract class DomainEvent {
  public readonly occurredAt: Date;
  public readonly eventId: Uuid;

  constructor() {
    this.occurredAt = new Date();
    this.eventId = Uuid.generate();
  }

  abstract getEventName(): string;
}

export interface IEventPublisher {
  publish(event: DomainEvent): Promise<void>;
  publishMany(events: DomainEvent[]): Promise<void>;
}

export interface IEventSubscriber<T extends DomainEvent = DomainEvent> {
  handle(event: T): Promise<void>;
  getEventName(): string;
}
