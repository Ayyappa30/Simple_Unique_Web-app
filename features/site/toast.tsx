"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

// A tiny notification bubble. Call showToast("...") from any client code; <Toaster/> (mounted once in the layout) shows it.
type Toast = { id: number; message: string; link?: { href: string; label: string } };
const EVENT = "su:toast";

export function showToast(message: string, link?: Toast["link"]) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent<Toast>(EVENT, { detail: { id: Date.now() + Math.random(), message, link } }));
}

export function Toaster() {
  const [toasts, setToasts] = useState<Toast[]>([]);
  useEffect(() => {
    const timers = new Set<number>();
    const onToast = (event: Event) => {
      const toast = (event as CustomEvent<Toast>).detail;
      setToasts((list) => [...list.slice(-2), toast]);
      const timer = window.setTimeout(() => { timers.delete(timer); setToasts((list) => list.filter((item) => item.id !== toast.id)); }, 3800);
      timers.add(timer);
    };
    window.addEventListener(EVENT, onToast);
    return () => { window.removeEventListener(EVENT, onToast); timers.forEach(window.clearTimeout); };
  }, []);
  return <div className="toaster" role="status" aria-live="polite">
    {toasts.map((toast) => <div className="toast" key={toast.id}>
      <span>{toast.message}</span>
      {toast.link && <Link href={toast.link.href}>{toast.link.label}</Link>}
    </div>)}
  </div>;
}
