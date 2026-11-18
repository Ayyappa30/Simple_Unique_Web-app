"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import { Search, Star, X } from "lucide-react";
import { formatPrice, matchesSearch, productImageUrl } from "@/features/catalog/products";
import { useShopSelector } from "@/store/provider";

// Edit these to change the "Trending searches" shown under the search box.
const trending = ["Gold plated", "Anti-tarnish", "Hoops", "Pearl", "Necklace", "Bracelet", "Rings", "Studs", "Sets", "Bestseller"];

const MAX_SUGGESTIONS = 4;

export function HeaderSearch() {
  const router = useRouter();
  const products = useShopSelector((state) => state.products);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const panelId = useId();

  const term = query.trim();
  const matches = term ? products.filter((product) => matchesSearch(product, term)) : [];

  const close = (returnFocus = false) => {
    setOpen(false);
    if (returnFocus) buttonRef.current?.focus();
  };

  useEffect(() => {
    if (!open) return;
    inputRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") { setOpen(false); buttonRef.current?.focus(); }
    };
    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("pointerdown", onPointerDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("pointerdown", onPointerDown);
    };
  }, [open]);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!term) return;
    close();
    router.push(`/shop?q=${encodeURIComponent(term)}`);
  };

  return <div className="header-search" ref={rootRef}>
    <button
      ref={buttonRef}
      className="icon-button"
      type="button"
      aria-label="Search products"
      aria-expanded={open}
      aria-controls={panelId}
      onClick={() => setOpen((value) => !value)}
    ><Search size={17} aria-hidden="true"/></button>

    {open && <div className="search-panel" id={panelId} role="search">
      <form className="search-panel-bar" onSubmit={submit}>
        <Search size={18} aria-hidden="true"/>
        <input
          ref={inputRef}
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search necklaces, hoops, gold plated…"
          aria-label="Search products"
          autoComplete="off"
          enterKeyHint="search"
        />
        {query && <button type="button" className="search-clear" aria-label="Clear search" onClick={() => { setQuery(""); inputRef.current?.focus(); }}><X size={16} aria-hidden="true"/></button>}
        <button type="button" className="search-close" aria-label="Close search" onClick={() => close(true)}>Close</button>
      </form>

      {term ? <div className="search-results" aria-live="polite">
        {matches.length > 0 ? <>
          <p className="search-heading">{matches.length} {matches.length === 1 ? "piece" : "pieces"} found</p>
          <ul>
            {matches.slice(0, MAX_SUGGESTIONS).map((product) => <li key={product.id}>
              <Link href={`/products/${product.slug}`} onClick={() => close()}>
                <Image src={productImageUrl(product.image, 160)} alt="" width={56} height={64} sizes="56px"/>
                <span className="search-result-name">{product.name}<small>{product.material}</small></span>
                <span className="search-result-price">{formatPrice(product.price)}</span>
              </Link>
            </li>)}
          </ul>
          <Link className="search-all" href={`/shop?q=${encodeURIComponent(term)}`} onClick={() => close()}>See all results for “{term}”</Link>
        </> : <>
          <p className="search-empty">No pieces match “{term}”. Try another word, or browse our trending searches.</p>
          <div className="search-chips">{trending.map((word) => <Link key={word} href={`/shop?q=${encodeURIComponent(word)}`} onClick={() => close()}><Star size={13} aria-hidden="true"/>{word}</Link>)}</div>
        </>}
      </div> : <div className="search-trending">
        <p className="search-heading">Trending searches</p>
        <div className="search-chips">{trending.map((word) => <Link key={word} href={`/shop?q=${encodeURIComponent(word)}`} onClick={() => close()}><Star size={13} aria-hidden="true"/>{word}</Link>)}</div>
      </div>}
    </div>}
  </div>;
}
