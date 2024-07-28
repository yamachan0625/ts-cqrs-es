export type DomainEvent<
  EventType extends string = string,
  EventData extends Record<string, unknown> = Record<string, unknown>,
  EventMetadata extends object = object
> = Readonly<{
  type: Readonly<EventType>;
  data: Readonly<EventData>;
  metadata?: EventMetadata;
}>;

type SnapshotMetadata = Readonly<{
  snapshottedStreamRevision: string;
}>;

export type SnapshotEvent<
  EventType extends string = string,
  EventData extends Record<string, unknown> = Record<string, unknown>
> = DomainEvent<EventType, EventData, SnapshotMetadata> & {
  metadata: SnapshotMetadata; // SnapshotEventではmetadataを必須にする
};
