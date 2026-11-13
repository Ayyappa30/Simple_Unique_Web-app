"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { initialShopState, persistedShopStateSchema, setCatalog, shopReducer, type ShopAction, type ShopState } from "@/features/shop/shop-slice";
import type { Product } from "@/features/catalog/products";
import type { AppStore } from "@/store/store";

const CATEGORIES: Product["category"][] = ["necklaces", "piercings", "bracelets", "earrings", "sets"];

type ApiProduct = {
  id: string; slug: string; name: string; description: string; category: string; priceInPaise: number;
  mrpInPaise: number; material: string; stock: number; tag: string; createdAt: string; imageUrl: string | null;
};

function toProduct(item: ApiProduct): Product | null {
  if (!item.imageUrl || !CATEGORIES.includes(item.category as Product["category"])) return null;
  return {
    id: item.id, slug: item.slug, name: item.name, category: item.category as Product["category"],
    price: item.priceInPaise / 100, mrp: item.mrpInPaise / 100, image: item.imageUrl, material: item.material,
    stock: item.stock, tag: item.tag, description: item.description, createdAt: item.createdAt.slice(0, 10),
  };
}

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

      // Load the live catalog from the database. If the API is unavailable, keep the local catalog.
      // no-store skips the browser cache so admin changes show up on the next page load; the CDN still caches briefly.
      fetch("/api/v1/products?limit=48&sort=newest", { cache: "no-store" })
        .then((response) => (response.ok ? response.json() : null))
        .then((body: { data?: ApiProduct[] } | null) => {
          if (!active || !body?.data?.length) return;
          const products = body.data.flatMap((item) => toProduct(item) ?? []);
          if (products.length) store.dispatch(setCatalog(products));
        })
        .catch(() => {});
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
