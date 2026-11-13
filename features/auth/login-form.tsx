"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

function safeNext(value: string | null): string | null {
  return value && value.startsWith("/") && !value.startsWith("//") && !value.startsWith("/\\") ? value : null;
}

export function LoginForm({ initialMode = "login" }: { initialMode?: "login" | "register" }) {
  const router = useRouter();
  const params = useSearchParams();
  const next = safeNext(params.get("next"));
  const adminLogin = next?.startsWith("/admin") ?? false;
  const [mode, setMode] = useState(initialMode);
  const [error, setError] = useState(params.get("denied") ? "This account does not have admin access." : "");
  const [busy, setBusy] = useState(false);
  const registering = mode === "register" && !adminLogin;

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setBusy(true);
    setError("");
    try {
      const response = await fetch(`/api/v1/auth/${registering ? "register" : "login"}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: form.get("name"), email: form.get("email"), password: form.get("password") }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(body.error ?? "Something went wrong. Please try again.");
        return;
      }
      const isAdmin = body.data?.role === "ADMIN";
      router.replace(next && (isAdmin || !next.startsWith("/admin")) ? next : isAdmin ? "/admin" : "/account/orders");
      router.refresh();
    } catch {
      setError("Could not reach the server. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  }

  return <main className="section auth-page">
    <form className="auth-card" onSubmit={submit}>
      <span className="eyebrow">{adminLogin ? "Store operations" : "Welcome"}</span>
      <h1 className="serif">{adminLogin ? "Admin sign in" : registering ? "Create your account" : "Sign in"}</h1>
      {registering && <label>Full name<input name="name" required minLength={2} maxLength={80} autoComplete="name"/></label>}
      <label>Email<input name="email" type="email" required autoComplete="email"/></label>
      <label>Password<input name="password" type="password" required minLength={registering ? 8 : 1} autoComplete={registering ? "new-password" : "current-password"}/></label>
      {error && <p className="error-message" role="alert">{error}</p>}
      <button className="button dark" type="submit" disabled={busy}>{busy ? "Please wait…" : registering ? "Create account" : "Sign in"}</button>
      {!adminLogin && <button type="button" className="text-button" onClick={() => { setMode(registering ? "login" : "register"); setError(""); }}>
        {registering ? "Already have an account? Sign in" : "New here? Create an account"}
      </button>}
      <Link href="/shop" className="text-button">Continue as guest</Link>
    </form>
  </main>;
}
