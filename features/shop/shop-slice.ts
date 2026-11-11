import { z } from "zod";
import type { UnknownAction } from "@reduxjs/toolkit";
import { seedProducts, type Product } from "@/features/catalog/products";

export type CartItem = { productId: string; quantity: number };
export type Order = {
  id: string;
  customerName: string;
  phone: string;
  email: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  paymentMethod: "cod";
  status: "Pending" | "Processing" | "Shipped" | "Delivered" | "Cancelled";
  total: number;
  createdAt: string;
  items: CartItem[];
};

export type ShopState = {
  products: Product[];
  cart: CartItem[];
  wishlist: string[];
  orders: Order[];
};

export const initialShopState: ShopState = { products: seedProducts, cart: [], wishlist: [], orders: [] };
export const persistedShopStateSchema = z.object({
  products: z.array(z.object({
    id: z.string(), slug: z.string(), name: z.string(),
    category: z.enum(["necklaces", "piercings", "bracelets", "earrings", "sets"]),
    price: z.number().nonnegative(), mrp: z.number().nonnegative(), image: z.string(),
    material: z.string(), stock: z.number().int().nonnegative(), tag: z.string(),
    description: z.string(), createdAt: z.string(),
  })),
  cart: z.array(z.object({ productId: z.string(), quantity: z.number().int().positive() })),
  wishlist: z.array(z.string()),
  orders: z.array(z.object({
    id: z.string(), customerName: z.string(), phone: z.string(), email: z.string(),
    address: z.string(), city: z.string(), state: z.string(), pincode: z.string(),
    paymentMethod: z.literal("cod"), status: z.enum(["Pending", "Processing", "Shipped", "Delivered", "Cancelled"]),
    total: z.number().nonnegative(), createdAt: z.string(),
    items: z.array(z.object({ productId: z.string(), quantity: z.number().int().positive() })),
  })),
}) satisfies z.ZodType<ShopState>;

type Action<T extends string, P = undefined> = P extends undefined
  ? { type: T }
  : { type: T; payload: P };
export type ShopAction =
  | Action<"shop/addToCart", string>
  | Action<"shop/setQuantity", { productId: string; quantity: number }>
  | Action<"shop/removeFromCart", string>
  | Action<"shop/toggleWishlist", string>
  | Action<"shop/placeOrder", Order>
  | Action<"shop/saveProduct", Product>
  | Action<"shop/deleteProduct", string>
  | Action<"shop/setOrderStatus", { id: string; status: Order["status"] }>
  | Action<"shop/restore", ShopState>;

export const addToCart = (productId: string): ShopAction => ({ type: "shop/addToCart", payload: productId });
export const setQuantity = (payload: { productId: string; quantity: number }): ShopAction => ({ type: "shop/setQuantity", payload });
export const removeFromCart = (productId: string): ShopAction => ({ type: "shop/removeFromCart", payload: productId });
export const toggleWishlist = (productId: string): ShopAction => ({ type: "shop/toggleWishlist", payload: productId });
export const placeOrder = (order: Order): ShopAction => ({ type: "shop/placeOrder", payload: order });
export const saveProduct = (product: Product): ShopAction => ({ type: "shop/saveProduct", payload: product });
export const deleteProduct = (productId: string): ShopAction => ({ type: "shop/deleteProduct", payload: productId });
export const setOrderStatus = (payload: { id: string; status: Order["status"] }): ShopAction => ({ type: "shop/setOrderStatus", payload });

export function shopReducer(state: ShopState = initialShopState, action: UnknownAction): ShopState {
  const shopAction = action as ShopAction;
  switch (shopAction.type) {
    case "shop/restore":
      return shopAction.payload;
    case "shop/addToCart": {
      const product = state.products.find((item) => item.id === shopAction.payload);
      if (!product || product.stock <= 0) return state;
      const current = state.cart.find((item) => item.productId === product.id);
      return { ...state, cart: current
        ? state.cart.map((item) => item.productId === product.id ? { ...item, quantity: Math.min(item.quantity + 1, product.stock) } : item)
        : [...state.cart, { productId: product.id, quantity: 1 }] };
    }
    case "shop/setQuantity": {
      const product = state.products.find((item) => item.id === shopAction.payload.productId);
      if (!product) return state;
      return { ...state, cart: shopAction.payload.quantity <= 0 || product.stock <= 0
        ? state.cart.filter((item) => item.productId !== product.id)
        : state.cart.map((item) => item.productId === product.id ? { ...item, quantity: Math.min(shopAction.payload.quantity, product.stock) } : item) };
    }
    case "shop/removeFromCart":
      return { ...state, cart: state.cart.filter((item) => item.productId !== shopAction.payload) };
    case "shop/toggleWishlist":
      return { ...state, wishlist: state.wishlist.includes(shopAction.payload)
        ? state.wishlist.filter((id) => id !== shopAction.payload)
        : [...state.wishlist, shopAction.payload] };
    case "shop/placeOrder":
      return {
        ...state,
        orders: [shopAction.payload, ...state.orders],
        products: state.products.map((product) => {
          const line = shopAction.payload.items.find((item) => item.productId === product.id);
          return line ? { ...product, stock: Math.max(0, product.stock - line.quantity) } : product;
        }),
        cart: [],
      };
    case "shop/saveProduct": {
      const exists = state.products.some((item) => item.id === shopAction.payload.id);
      const products = exists
        ? state.products.map((item) => item.id === shopAction.payload.id ? shopAction.payload : item)
        : [shopAction.payload, ...state.products];
      return {
        ...state,
        products,
        cart: shopAction.payload.stock <= 0
          ? state.cart.filter((item) => item.productId !== shopAction.payload.id)
          : state.cart.map((item) => item.productId === shopAction.payload.id ? { ...item, quantity: Math.min(item.quantity, shopAction.payload.stock) } : item),
      };
    }
    case "shop/deleteProduct":
      return {
        ...state,
        products: state.products.filter((item) => item.id !== shopAction.payload),
        cart: state.cart.filter((item) => item.productId !== shopAction.payload),
        wishlist: state.wishlist.filter((id) => id !== shopAction.payload),
      };
    case "shop/setOrderStatus":
      return { ...state, orders: state.orders.map((order) => order.id === shopAction.payload.id ? { ...order, status: shopAction.payload.status } : order) };
    default:
      return state;
  }
}
