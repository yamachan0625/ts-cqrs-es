import {
  ANY,
  EventStoreDBClient,
  NO_STREAM,
  StreamNotFoundError,
  jsonEvent,
} from "@eventstore/db-client";
import { WrongExpectedVersion } from "@eventstore/db-client/generated/shared_pb";
import { DomainEvent } from "../../command/Domain/DomainEvent/DomainEvent";

const client = EventStoreDBClient.connectionString(
  "esdb://127.0.0.1:2113?tls=false"
);

export interface IEventStore {
  /**
   * ストリームを読み込み、イベントを適用してエンティティを返す
   */
  aggregateStream<Entity, E extends DomainEvent>(
    streamName: string,
    options: {
      applyEvent: (currentState: Entity, event: E) => Entity;
      getInitialState: () => Entity;
      expectedRevision?: bigint;
    }
  ): Promise<Entity | null>;

  appendToStream<E extends DomainEvent>(
    streamId: string,
    events: E[],
    options?: { expectedRevision?: bigint }
  ): Promise<bigint>;

  subscribeAll<E extends DomainEvent>(
    handleEvent: (event: E) => Promise<void>
  ): Promise<void>;
}

export class EventStore implements IEventStore {
  private client: EventStoreDBClient;

  constructor(eventStoreClient: EventStoreDBClient = client) {
    this.client = eventStoreClient;
  }

  async aggregateStream<Entity, E extends DomainEvent>(
    streamName: string,
    options: {
      applyEvent: (currentState: Entity, event: E) => Entity;
      getInitialState: () => Entity;
      expectedRevision?: bigint;
    }
  ): Promise<Entity | null> {
    try {
      const { applyEvent, getInitialState, expectedRevision } = options;

      // snapshotから取得できる場合snapshotからエンティティを取得
      // let state = snapshot ?? getInitialState();
      let state = getInitialState();
      let streamRevision = -1n;

      for await (const { event } of this.client.readStream(streamName)) {
        if (!event) continue;

        state = applyEvent(state, <E>{
          type: event.type,
          data: event.data,
        });
        streamRevision = event.revision;
      }

      if (
        expectedRevision !== undefined &&
        expectedRevision !== streamRevision
      ) {
        throw new Error(EventStoreErrors.WrongExpectedRevision);
      }

      return state;
    } catch (error) {
      if (error instanceof StreamNotFoundError) {
        return null;
      }

      throw error;
    }
  }

  async appendToStream<E extends DomainEvent>(
    streamId: string,
    events: E[],
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

  async subscribeAll<E extends DomainEvent>(
    handleEvent: (event: E) => Promise<void>
  ) {
    // NOTE: 特定のポジションから購読する
    // https://developers.eventstore.com/clients/grpc/subscriptions.html#subscribing-from-a-specific-position
    const subscription = this.client.subscribeToAll();

    for await (const { event } of subscription) {
      if (!event) {
        continue;
      }

      await handleEvent(<E>{
        type: event.type,
        data: event.data,
      });
    }
  }
}

export const EventStoreErrors = {
  WrongExpectedRevision: "WrongExpectedRevision",
};
