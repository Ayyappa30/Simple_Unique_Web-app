"use client";

import { Heart, Search, ShoppingBag, UserRound } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useShopSelector } from "@/store/provider";

export function SiteHeader() {
  const { cart, wishlist } = useShopSelector((state) => state);
  const count = cart.reduce((total, item) => total + item.quantity, 0);
  const [loginPromptOpen, setLoginPromptOpen] = useState(false);
  const accountButtonRef = useRef<HTMLButtonElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!loginPromptOpen) return;
    const accountButton = accountButtonRef.current;
    closeButtonRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setLoginPromptOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      accountButton?.focus();
    };
  }, [loginPromptOpen]);

  return <>
    <div className="announcement">A little something extra — free shipping on orders over ₹1,499</div>
    <header className="site-header">
      <nav className="nav-links"><Link href="/shop">Shop all</Link><Link href="/shop?category=necklaces">Necklaces</Link><Link href="/shop?category=earrings">Earrings</Link><Link href="/#about">Our story</Link></nav>
      <Link href="/" className="brand">SIMPLE & UNIQUE<small>EVERYDAY, ELEVATED</small></Link>
      <div className="header-actions"><Link className="icon-button" href="/shop" aria-label="Search products"><Search size={17}/></Link><button ref={accountButtonRef} className="icon-button" type="button" aria-label="Sign in" aria-haspopup="dialog" aria-expanded={loginPromptOpen} onClick={() => setLoginPromptOpen(true)}><UserRound size={17}/></button><Link className="icon-button" href="/wishlist" aria-label={`Wishlist, ${wishlist.length} items`}><Heart size={17}/><span>{wishlist.length}</span></Link><Link className="icon-button" href="/cart" aria-label={`Shopping bag, ${count} items`}><ShoppingBag size={17}/><span>{count}</span></Link></div>
    </header>
    {loginPromptOpen && <div className="account-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setLoginPromptOpen(false); }}>
      <section className="account-modal" role="dialog" aria-modal="true" aria-labelledby="login-prompt-title" aria-describedby="login-prompt-copy">
        <button ref={closeButtonRef} className="account-modal-close" type="button" aria-label="Close sign-in message" onClick={() => setLoginPromptOpen(false)}>×</button>
        <span className="eyebrow">A little more, just for you</span>
        <h2 className="serif" id="login-prompt-title">Login now to avail best offers!</h2>
        <p id="login-prompt-copy">Sign-in is coming soon. For now, your cart and wishlist stay saved on this device.</p>
        <div className="account-modal-actions"><Link className="button dark" href="/account/orders">Continue as guest</Link><button className="text-button" type="button" onClick={() => setLoginPromptOpen(false)}>Maybe later</button></div>
      </section>
    </div>}
  </>;
}
