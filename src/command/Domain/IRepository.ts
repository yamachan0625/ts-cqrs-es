import { Aggregate } from "./Aggregate";
import { DomainEvent, SnapshotEvent } from "./DomainEvent/DomainEvent";

export interface IRepository<
  Entity extends Aggregate<Event>,
  Event extends DomainEvent = DomainEvent
> {
  findById(id: string): Promise<Entity | null>;
  store(
    id: string,
    entity: Entity,
    tryBuildSnapshot: (
      events: Event[],
      currentEntity: Entity,
      newRevision: bigint
    ) => SnapshotEvent | undefined
  ): Promise<void>;
}
