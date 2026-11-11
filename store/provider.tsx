"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { initialShopState, persistedShopStateSchema, shopReducer, type ShopAction, type ShopState } from "@/features/shop/shop-slice";
import type { AppStore } from "@/store/store";

type ShopContextValue = { state: ShopState; dispatch: (action: ShopAction) => void };
const ShopContext = createContext<ShopContextValue | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState(initialShopState);
  const storeRef = useRef<AppStore | null>(null);
  const pendingActions = useRef<ShopAction[]>([]);

  const dispatch = useCallback((action: ShopAction) => {
    if (storeRef.current) {
      storeRef.current.dispatch(action);
      return;
    }
    pendingActions.current.push(action);
    setState((current) => shopReducer(current, action));
  }, []);

  useEffect(() => {
    let active = true;
    let unsubscribe: (() => void) | undefined;

    import("@/store/store").then(({ makeStore }) => {
      if (!active) return;
      let savedState = initialShopState;
      try {
        const saved = localStorage.getItem("simple-unique-shop-v1");
        if (saved) {
          const parsed = persistedShopStateSchema.safeParse(JSON.parse(saved));
          if (parsed.success) savedState = parsed.data;
        }
      } catch {
        try { localStorage.removeItem("simple-unique-shop-v1"); } catch { /* Storage may be unavailable. */ }
      }

      const store = makeStore(savedState);
      storeRef.current = store;
      for (const action of pendingActions.current) store.dispatch(action);
      pendingActions.current = [];

      const syncState = () => {
        const nextState = store.getState().shop;
        setState(nextState);
        try {
          localStorage.setItem("simple-unique-shop-v1", JSON.stringify(nextState));
        } catch {
          // Persistence is best-effort when storage is unavailable or full.
        }
      };
      syncState();
      unsubscribe = store.subscribe(syncState);
    });

    return () => {
      active = false;
      unsubscribe?.();
    };
  }, []);

  const value = useMemo(() => ({ state, dispatch }), [state, dispatch]);
  return <ShopContext.Provider value={value}>{children}</ShopContext.Provider>;
}

export function useShopSelector<T>(selector: (state: ShopState) => T): T {
  const context = useContext(ShopContext);
  if (!context) throw new Error("useShopSelector must be used inside StoreProvider");
  return selector(context.state);
}

export function useShopDispatch() {
  const context = useContext(ShopContext);
  if (!context) throw new Error("useShopDispatch must be used inside StoreProvider");
  return context.dispatch;
}
