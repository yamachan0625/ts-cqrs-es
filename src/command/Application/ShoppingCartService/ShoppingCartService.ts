import { ApplicationService } from "../ApplicationService";
import { ShoppingCart } from "../../Domain/Aggregate/ShoppingCart/ShoppingCart";
import {
  AddProductItemToShoppingCart,
  CancelShoppingCart,
  ConfirmShoppingCart,
  OpenShoppingCart,
  RemoveProductItemFromShoppingCart,
} from "../../Domain/Aggregate/ShoppingCart/businessLogic";
import { IRepository } from "command/Domain/IRepository";

export class ShoppingCartService extends ApplicationService<ShoppingCart> {
  constructor(protected repository: IRepository<ShoppingCart>) {
    super(repository);
  }

  public open = ({
    data: { shoppingCartId, clientId, now },
  }: OpenShoppingCart) => {
    return this.apply(shoppingCartId, () => {
      return ShoppingCart.open(shoppingCartId, clientId, now);
    });
  };

  public addProductItem = ({
    data: { shoppingCartId, productItem },
  }: AddProductItemToShoppingCart) =>
    this.apply(shoppingCartId, (shoppingCart) =>
      shoppingCart.addProductItem(productItem)
    );

  public removeProductItem = ({
    data: { shoppingCartId, productItem },
  }: RemoveProductItemFromShoppingCart) =>
    this.apply(shoppingCartId, (shoppingCart) =>
      shoppingCart.removeProductItem(productItem)
    );

  public confirm = ({ data: { shoppingCartId, now } }: ConfirmShoppingCart) =>
    this.apply(shoppingCartId, (shoppingCart) => shoppingCart.confirm(now));

  public cancel = ({ data: { shoppingCartId, now } }: CancelShoppingCart) =>
    this.apply(shoppingCartId, (shoppingCart) => shoppingCart.cancel(now));
}
