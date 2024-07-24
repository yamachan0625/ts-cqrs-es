import { IRepository } from "command/Domain/IRepository";

export abstract class ApplicationService<Entity> {
  constructor(protected repository: IRepository<Entity>) {}

  protected apply = async (
    id: string,
    handle: (entity: Entity) => void | Entity
  ) => {
    const aggregate = await this.repository.find(id);

    const result = handle(aggregate) ?? aggregate;

    await this.repository.store(id, result);
  };
}
