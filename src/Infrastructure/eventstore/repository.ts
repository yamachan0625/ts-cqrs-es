import { Aggregate } from "Domain/Aggregate";
import { Event } from "../../Domain/DomainEvent/events";
import { EventStore } from "./eventStore";

export interface Repository<Entity> {
  find(id: string): Promise<Entity>;
  store(id: string, entity: Entity): Promise<void>;
}

export class EventStoreRepository<
  Entity extends Aggregate<StreamEvent>,
  StreamEvent extends Event
> implements Repository<Entity>
{
  constructor(
    private eventStore: EventStore,
    private getInitialState: () => Entity,
    private mapToStreamId: (id: string) => string
  ) {}

  find = async (id: string): Promise<Entity> =>
    (await this.eventStore.aggregateStream<Entity, StreamEvent>(
      this.mapToStreamId(id),
      {
        applyEvent: (state, event) => {
          state.applyEvent(event);
          return state;
        },
        getInitialState: this.getInitialState,
      }
    )) ?? this.getInitialState();

  store = async (id: string, entity: Entity): Promise<void> => {
    const events = entity.getDomainEvents();

    if (events.length === 0) return;

    await this.eventStore.appendToStream(this.mapToStreamId(id), events);
  };
}
