import { ApplicationService } from "../ApplicationService";
import { ShoppingCart } from "../../Domain/Aggregate/ShoppingCart/ShoppingCart";
import { Repository } from "../../Infrastructure/eventstore/repository";
import {
  AddProductItemToShoppingCart,
  CancelShoppingCart,
  ConfirmShoppingCart,
  OpenShoppingCart,
  RemoveProductItemFromShoppingCart,
} from "../../Domain/Aggregate/ShoppingCart/businessLogic";

export class ShoppingCartService extends ApplicationService<ShoppingCart> {
  constructor(protected repository: Repository<ShoppingCart>) {
    super(repository);
  }

  public open = ({
    data: { shoppingCartId, clientId, now },
  }: OpenShoppingCart) => {
    return this.on(shoppingCartId, () => {
      return ShoppingCart.open(shoppingCartId, clientId, now);
    });
  };

  public addProductItem = ({
    data: { shoppingCartId, productItem },
  }: AddProductItemToShoppingCart) =>
    this.on(shoppingCartId, (shoppingCart) =>
      shoppingCart.addProductItem(productItem)
    );

  public removeProductItem = ({
    data: { shoppingCartId, productItem },
  }: RemoveProductItemFromShoppingCart) =>
    this.on(shoppingCartId, (shoppingCart) =>
      shoppingCart.removeProductItem(productItem)
    );

  public confirm = ({ data: { shoppingCartId, now } }: ConfirmShoppingCart) =>
    this.on(shoppingCartId, (shoppingCart) => shoppingCart.confirm(now));

  public cancel = ({ data: { shoppingCartId, now } }: CancelShoppingCart) =>
    this.on(shoppingCartId, (shoppingCart) => shoppingCart.cancel(now));
}
