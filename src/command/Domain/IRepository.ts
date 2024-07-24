export interface IRepository<Entity> {
  find(id: string): Promise<Entity>;
  store(id: string, entity: Entity): Promise<void>;
}
