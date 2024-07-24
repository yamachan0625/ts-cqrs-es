import { DomainEvent } from "./DomainEvent/DomainEvent";

export abstract class Aggregate<E extends DomainEvent> {
  private domainEvents: E[] = [];

  abstract applyEvent(event: E): void;

  protected addDomainEvent = (event: E) => {
    this.domainEvents = [...this.domainEvents, event];
  };

  getDomainEvents(): E[] {
    return this.domainEvents;
  }

  clearDomainEvents() {
    this.domainEvents = [];
  }
}
