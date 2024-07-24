import { Aggregate } from "command/Domain/Aggregate";
import { DomainEvent } from "../command/Domain/DomainEvent/DomainEvent";
import { EventStore, IEventStore } from "./eventStoreDB/EventStore";
import { IRepository } from "command/Domain/IRepository";

export class EventStoreRepository<
  Entity extends Aggregate<Event>,
  Event extends DomainEvent
> implements IRepository<Entity>
{
  private eventStore: IEventStore = new EventStore();

  constructor(
    private getInitialState: () => Entity,
    private mapToStreamId: (id: string) => string
  ) {}

  async find(id: string): Promise<Entity> {
    const entity = await this.eventStore.aggregateStream<Entity, Event>(
      this.mapToStreamId(id),
      {
        applyEvent: (state, event) => {
          state.applyEvent(event);
          return state;
        },
        getInitialState: this.getInitialState,
      }
    );

    return entity ?? this.getInitialState();
  }

  async store(id: string, entity: Entity): Promise<void> {
    const events = entity.getDomainEvents();

    if (events.length === 0) return;

    await this.eventStore.appendToStream(this.mapToStreamId(id), events);
  }
}
