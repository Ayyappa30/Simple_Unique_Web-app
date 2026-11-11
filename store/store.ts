import { configureStore } from "@reduxjs/toolkit";
import { initialShopState, shopReducer, type ShopState } from "@/features/shop/shop-slice";

export const makeStore = (preloadedState: ShopState = initialShopState) =>
  configureStore({ reducer: { shop: shopReducer }, preloadedState: { shop: preloadedState } });
export type AppStore = ReturnType<typeof makeStore>;
export type RootState = ReturnType<AppStore["getState"]>;
export type AppDispatch = AppStore["dispatch"];
