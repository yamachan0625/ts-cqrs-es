import { Event } from "./DomainEvent/events";

export abstract class Aggregate<E extends Event> {
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
