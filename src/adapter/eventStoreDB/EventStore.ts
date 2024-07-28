import {
  ANY,
  EventStoreDBClient,
  NO_STREAM,
  ReadStreamOptions,
  // StreamNotFoundError,
  jsonEvent,
} from "@eventstore/db-client";
import { WrongExpectedVersion } from "@eventstore/db-client/generated/shared_pb";
import { DomainEvent } from "../../command/Domain/DomainEvent/DomainEvent";

const client = EventStoreDBClient.connectionString(
  "esdb://127.0.0.1:2113?tls=false"
);

export interface IEventStore<Entity, Event extends DomainEvent> {
  /**
   * ストリームを読み込み、イベントを適用してエンティティを返す
   */
  // readEventStream(
  //   streamName: string,
  //   options: {
  //     applyEvent: (currentState: Entity, event: Event) => Entity;
  //     getInitialState: () => Entity;
  //     expectedRevision?: bigint;
  //   }
  // ): Promise<Entity | null>;

  /**
   * ストリームを読み込む
   */
  readFromStream(
    streamName: string,
    options?: ReadStreamOptions
  ): Promise<DomainEvent[]>;

  /**
   * ストリームにイベントを追加する
   */
  appendToStream(
    streamId: string,
    events: Event[],
    options?: { expectedRevision?: bigint }
  ): Promise<bigint>;

  /**
   * 全てのイベントを購読する
   */
  subscribeAll(handleEvent: (event: Event) => Promise<void>): Promise<void>;
}

export class EventStore<Entity, Event extends DomainEvent>
  implements IEventStore<Entity, Event>
{
  private client: EventStoreDBClient;

  constructor(eventStoreClient: EventStoreDBClient = client) {
    this.client = eventStoreClient;
  }

  async readFromStream(
    streamName: string,
    options?: ReadStreamOptions
  ): Promise<Event[]> {
    const events: Event[] = [];

    for await (const { event } of this.client.readStream(streamName, options)) {
      if (!event) continue;

      events.push(<Event>{
        type: event.type,
        data: event.data,
        metadata: event?.metadata,
      });
    }

    return events;
  }

  // async readEventStream<Entity, E>(
  //   streamName: string,
  //   options: {
  //     applyEvent: (currentState: Entity, event: E) => Entity;
  //     getInitialState: () => Entity;
  //     expectedRevision?: bigint;
  //   }
  // ): Promise<Entity | null> {
  //   try {
  //     const { applyEvent, getInitialState, expectedRevision } = options;

  //     // snapshotから取得できる場合snapshotからエンティティを取得
  //     const events = await this.readFromStream(streamName, {
  //       maxCount: 1,
  //       direction: "backwards",
  //     });
  //     const snapshot = events[0];

  //     // let state = snapshot ?? getInitialState();
  //     let state = getInitialState();
  //     let streamRevision = -1n;

  //     for await (const { event } of this.client.readStream(streamName, {
  //       fromRevision: 0n,
  //     })) {
  //       if (!event) continue;

  //       state = applyEvent(state, <E>{
  //         type: event.type,
  //         data: event.data,
  //       });
  //       streamRevision = event.revision;
  //     }

  //     if (
  //       expectedRevision !== undefined &&
  //       expectedRevision !== streamRevision
  //     ) {
  //       throw new Error(EventStoreErrors.WrongExpectedRevision);
  //     }

  //     return state;
  //   } catch (error) {
  //     if (error instanceof StreamNotFoundError) {
  //       return null;
  //     }

  //     throw error;
  //   }
  // }

  async appendToStream(
    streamId: string,
    events: Event[],
    options?: { expectedRevision?: bigint }
  ): Promise<bigint> {
    try {
      const serializedEvents = events.map(jsonEvent);

      const appendResult = await this.client.appendToStream(
        streamId,
        serializedEvents,
        {
          expectedRevision:
            options?.expectedRevision != undefined
              ? options.expectedRevision !== -1n
                ? options.expectedRevision
                : NO_STREAM
              : ANY,
        }
      );

      return appendResult.nextExpectedRevision;
    } catch (error) {
      if (error instanceof WrongExpectedVersion) {
        throw new Error(EventStoreErrors.WrongExpectedRevision);
      }

      throw error;
    }
  }

  async subscribeAll(handleEvent: (event: Event) => Promise<void>) {
    // NOTE: 特定のポジションから購読する
    // https://developers.eventstore.com/clients/grpc/subscriptions.html#subscribing-from-a-specific-position
    const subscription = this.client.subscribeToAll();

    for await (const { event } of subscription) {
      if (!event) {
        continue;
      }

      await handleEvent(<Event>{
        type: event.type,
        data: event.data,
      });
    }
  }
}

export const EventStoreErrors = {
  WrongExpectedRevision: "WrongExpectedRevision",
};
