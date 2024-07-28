import { EventStore } from "../eventStoreDB/EventStore";
import { IRepository } from "command/Domain/IRepository";
import { ShoppingCart } from "command/Domain/Aggregate/ShoppingCart/ShoppingCart";
import {
  ShoppingCartEvent,
  ShoppingCartSnapshotted,
} from "command/Domain/Aggregate/ShoppingCart/ShoppingCartEvent";

export class EventStoreRepository
  implements IRepository<ShoppingCart, ShoppingCartEvent>
{
  private eventStore = new EventStore<ShoppingCart, ShoppingCartEvent>();

  addSnapshotPrefix(id: string): string {
    return `snapshot-${id}`;
  }

  // async findById(id: string): Promise<ShoppingCart | null> {
  //   const entity = await this.eventStore.readEventStream<
  //     ShoppingCart,
  //     ShoppingCartEvent
  //   >(id, {
  //     applyEvent: (state, event) => {
  //       state.applyEvent(event);
  //       return state;
  //     },
  //     getInitialState: ShoppingCart.default,
  //   });

  //   return entity;
  // }

  private async readSnapshot(
    id: string
  ): Promise<ShoppingCartSnapshotted | null> {
    const events = await this.eventStore.readFromStream(id, {
      maxCount: 1,
      fromRevision: "end",
      direction: "backwards",
    });

    if (!events.length) {
      return null;
    }

    return events[0] as ShoppingCartSnapshotted;
  }

  async findById(id: string): Promise<ShoppingCart | null> {
    // snapshotから取得できる場合snapshotからエンティティを取得
    const snapshot = await this.readSnapshot(this.addSnapshotPrefix(id));

    const lastSnapshotRevision = snapshot
      ? BigInt(snapshot.metadata.snapshottedStreamRevision)
      : undefined;

    const events = await this.eventStore.readFromStream(id, {
      fromRevision: lastSnapshotRevision,
    });

    return ShoppingCart.apply(snapshot ? [snapshot, ...events] : events);
  }

  async store(id: string, currentEntity: ShoppingCart): Promise<void> {
    const events = currentEntity.getDomainEvents();

    if (events.length === 0) return;

    const newRevision = await this.eventStore.appendToStream(id, events);

    const snapshotEvent = ShoppingCart.tryBuildSnapshot(
      events,
      currentEntity,
      newRevision
    );
    if (snapshotEvent) {
      // snapshotを保存
      await this.eventStore.appendToStream(this.addSnapshotPrefix(id), [
        snapshotEvent,
      ]);
    }
  }
}
