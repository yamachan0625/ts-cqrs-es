import { Aggregate } from "../../Aggregate";
import {
  ShoppingCartEvent,
  ShoppingCartSnapshotted,
} from "./ShoppingCartEvent";
import { ShoppingCartErrors } from "./businessLogic";

export interface ProductItem {
  productId: string;
  quantity: number;
}

export type PricedProductItem = ProductItem & {
  unitPrice: number;
};

export enum ShoppingCartStatus {
  Pending = "Pending",
  Confirmed = "Confirmed",
  Canceled = "Canceled",
}

export class ShoppingCart extends Aggregate<ShoppingCartEvent> {
  private constructor(
    private _id: string,
    private _clientId: string,
    private _status: ShoppingCartStatus,
    private _openedAt: Date,
    private _productItems: PricedProductItem[] = [],
    private _confirmedAt?: Date,
    private _canceledAt?: Date
  ) {
    super();
  }

  get id() {
    return this._id;
  }

  get clientId() {
    return this._clientId;
  }

  get status() {
    return this._status;
  }

  get openedAt() {
    return this._openedAt;
  }

  get productItems() {
    return this._productItems;
  }

  get confirmedAt() {
    return this._confirmedAt;
  }

  get canceledAt() {
    return this._canceledAt;
  }

  public static default = (): ShoppingCart =>
    new ShoppingCart(
      undefined!,
      undefined!,
      undefined!,
      undefined!,
      undefined,
      undefined,
      undefined
    );

  public static open = (
    shoppingCartId: string,
    clientId: string,
    now: Date
  ) => {
    const shoppingCart = ShoppingCart.default();

    shoppingCart.addDomainEvent({
      type: "ShoppingCartOpened",
      data: { shoppingCartId, clientId, openedAt: now },
    });

    return shoppingCart;
  };

  public addProductItem = (productItem: PricedProductItem): void => {
    this.assertIsPending();

    this.addDomainEvent({
      type: "ProductItemAddedToShoppingCart",
      data: { productItem, shoppingCartId: this._id },
    });
  };

  public removeProductItem = (productItem: PricedProductItem): void => {
    this.assertIsPending();
    this.assertProductItemExists(productItem);

    this.addDomainEvent({
      type: "ProductItemRemovedFromShoppingCart",
      data: { productItem, shoppingCartId: this._id },
    });
  };

  public confirm = (now: Date): void => {
    this.assertIsPending();
    this.assertIsNotEmpty();

    this.addDomainEvent({
      type: "ShoppingCartConfirmed",
      data: { shoppingCartId: this._id, confirmedAt: now },
    });
  };

  public cancel = (now: Date): void => {
    this.assertIsPending();

    this.addDomainEvent({
      type: "ShoppingCartCanceled",
      data: { shoppingCartId: this._id, canceledAt: now },
    });
  };

  public applyEvent = ({ type, data: event }: ShoppingCartEvent): void => {
    switch (type) {
      case "ShoppingCartOpened": {
        this._id = event.shoppingCartId;
        this._clientId = event.clientId;
        this._status = ShoppingCartStatus.Pending;
        this._openedAt = event.openedAt;
        this._productItems = [];
        return;
      }
      case "ProductItemAddedToShoppingCart": {
        const {
          productItem: { productId, quantity, unitPrice },
        } = event;

        const currentProductItem = this._productItems.find(
          (pi) => pi.productId === productId && pi.unitPrice === unitPrice
        );

        if (currentProductItem) {
          currentProductItem.quantity += quantity;
        } else {
          this._productItems.push({ ...event.productItem });
        }
        return;
      }
      case "ProductItemRemovedFromShoppingCart": {
        const {
          productItem: { productId, quantity, unitPrice },
        } = event;

        const currentProductItem = this._productItems.find(
          (pi) => pi.productId === productId && pi.unitPrice === unitPrice
        );

        if (!currentProductItem) {
          return;
        }

        currentProductItem.quantity -= quantity;

        if (currentProductItem.quantity <= 0) {
          this._productItems.splice(
            this._productItems.indexOf(currentProductItem),
            1
          );
        }
        return;
      }
      case "ShoppingCartConfirmed": {
        this._status = ShoppingCartStatus.Confirmed;
        this._confirmedAt = event.confirmedAt;
        return;
      }
      case "ShoppingCartCanceled": {
        this._status = ShoppingCartStatus.Canceled;
        this._canceledAt = event.canceledAt;
        return;
      }
      case "ShoppingCartSnapshotted": {
        this._id = event.shoppingCartId;
        this._clientId = event.clientId;
        this._status = event.status;
        this._openedAt = event.openedAt;
        this._confirmedAt = event.confirmedAt;
        this._canceledAt = event.canceledAt;
        this._productItems = event.productItems;
        return;
      }
      default: {
        throw new Error(ShoppingCartErrors.UNKNOWN_EVENT_TYPE);
      }
    }
  };

  private assertIsPending = (): void => {
    if (this._status !== ShoppingCartStatus.Pending) {
      throw new Error(ShoppingCartErrors.CART_IS_ALREADY_CLOSED);
    }
  };

  private assertProductItemExists = ({
    productId,
    quantity,
    unitPrice,
  }: PricedProductItem): void => {
    const currentQuantity =
      this.productItems.find(
        (p) => p.productId === productId && p.unitPrice == unitPrice
      )?.quantity ?? 0;

    if (currentQuantity < quantity) {
      throw new Error(ShoppingCartErrors.PRODUCT_ITEM_NOT_FOUND);
    }
  };

  private assertIsNotEmpty = (): void => {
    if (this._productItems.length === 0) {
      throw new Error(ShoppingCartErrors.CART_IS_EMPTY);
    }
  };

  public static apply = (events: ShoppingCartEvent[]): ShoppingCart => {
    return events.reduce<ShoppingCart>((state, event) => {
      state.applyEvent(event);
      return state;
    }, ShoppingCart.default());
  };

  public static tryBuildSnapshot = (
    currentEvents: ShoppingCartEvent[],
    currentEntity: ShoppingCart,
    newRevision: bigint
  ): ShoppingCartSnapshotted | undefined => {
    const eventTypeList = currentEvents.map((event) => event.type);
    if (eventTypeList.includes("ShoppingCartCanceled")) {
      return {
        type: "ShoppingCartSnapshotted",
        data: {
          shoppingCartId: currentEntity.id,
          clientId: currentEntity.clientId,
          status: currentEntity.status,
          openedAt: currentEntity.openedAt,
          confirmedAt: currentEntity.confirmedAt,
          canceledAt: currentEntity.canceledAt,
          productItems: currentEntity.productItems,
        },
        metadata: {
          snapshottedStreamRevision: newRevision.toString(),
        },
      };
    }

    return undefined;
  };
}
