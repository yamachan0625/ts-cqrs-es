import {
  DomainEvent,
  SnapshotEvent,
} from "command/Domain/DomainEvent/DomainEvent";
import { PricedProductItem, ShoppingCartStatus } from "./ShoppingCart";

export type ShoppingCartOpened = DomainEvent<
  "ShoppingCartOpened",
  {
    shoppingCartId: string;
    clientId: string;
    openedAt: Date;
  }
>;

export type ProductItemAddedToShoppingCart = DomainEvent<
  "ProductItemAddedToShoppingCart",
  {
    shoppingCartId: string;
    productItem: PricedProductItem;
  }
>;

export type ProductItemRemovedFromShoppingCart = DomainEvent<
  "ProductItemRemovedFromShoppingCart",
  {
    shoppingCartId: string;
    productItem: PricedProductItem;
  }
>;

export type ShoppingCartConfirmed = DomainEvent<
  "ShoppingCartConfirmed",
  {
    shoppingCartId: string;
    confirmedAt: Date;
  }
>;

export type ShoppingCartCanceled = DomainEvent<
  "ShoppingCartCanceled",
  {
    shoppingCartId: string;
    canceledAt: Date;
  }
>;

export type ShoppingCartSnapshotted = SnapshotEvent<
  "ShoppingCartSnapshotted",
  {
    shoppingCartId: string;
    productItems: PricedProductItem[];
    clientId: string;
    status: ShoppingCartStatus;
    openedAt: Date;
    confirmedAt?: Date;
    canceledAt?: Date;
  }
>;

export type ShoppingCartEvent =
  | ShoppingCartOpened
  | ProductItemAddedToShoppingCart
  | ProductItemRemovedFromShoppingCart
  | ShoppingCartConfirmed
  | ShoppingCartCanceled
  | ShoppingCartSnapshotted;
