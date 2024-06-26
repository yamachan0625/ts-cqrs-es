import {
  ANY,
  EventStoreDBClient,
  NO_STREAM,
  StreamNotFoundError,
  jsonEvent,
} from "@eventstore/db-client";
import { WrongExpectedVersion } from "@eventstore/db-client/generated/shared_pb";
import { Event } from "../../Domain/DomainEvent/events";

const client = EventStoreDBClient.connectionString(
  "esdb://127.0.0.1:2113?tls=false"
);

export interface EventStore {
  aggregateStream<Entity, E extends Event>(
    streamName: string,
    options: {
      applyEvent: (currentState: Entity, event: E) => Entity;
      getInitialState: () => Entity;
      expectedRevision?: bigint;
    }
  ): Promise<Entity | null>;

  readStream<E extends Event>(streamName: string): Promise<E[]>;

  appendToStream<E extends Event>(
    streamId: string,
    events: E[],
    options?: { expectedRevision?: bigint }
  ): Promise<bigint>;
}

export const getEventStore = (
  eventStore: EventStoreDBClient = client
): EventStore => {
  return {
    aggregateStream: async <Entity, E extends Event>(
      streamName: string,
      options: {
        applyEvent: (currentState: Entity, event: E) => Entity;
        getInitialState: () => Entity;
        expectedRevision?: bigint;
      }
    ): Promise<Entity | null> => {
      try {
        const { applyEvent, getInitialState, expectedRevision } = options;

        // snapshotから取得できる場合snapshotからエンティティを取得
        // let state = snapshot ?? getInitialState();
        let state = getInitialState();
        let streamRevision = -1n;

        for await (const { event } of eventStore.readStream(streamName)) {
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
        )
          throw new Error(EventStoreErrors.WrongExpectedRevision);

        return state;
      } catch (error) {
        if (error instanceof StreamNotFoundError) {
          return null;
        }

        throw error;
      }
    },

    readStream: async <E extends Event>(streamName: string): Promise<E[]> => {
      const events: E[] = [];

      try {
        for await (const { event } of eventStore.readStream(streamName)) {
          if (!event) continue;
          events.push(<E>{
            type: event.type,
            data: event.data,
          });
        }
        return events;
      } catch (error) {
        if (error instanceof StreamNotFoundError) {
          return [];
        }

        throw error;
      }
    },

    appendToStream: async <E extends Event>(
      streamId: string,
      events: E[],
      options?: { expectedRevision?: bigint }
    ): Promise<bigint> => {
      try {
        const serializedEvents = events.map(jsonEvent);

        const appendResult = await eventStore.appendToStream(
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
    },
  };
};

export const EventStoreErrors = {
  WrongExpectedRevision: "WrongExpectedRevision",
};
