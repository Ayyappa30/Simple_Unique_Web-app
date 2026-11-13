"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";

export function NewsletterForm() {
  const [state, setState] = useState<"idle" | "sending" | "done" | "error">("idle");
  const [message, setMessage] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const email = String(new FormData(form).get("email") ?? "");
    setState("sending");
    setMessage("");
    try {
      const response = await fetch("/api/v1/newsletter", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email }) });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) {
        setState("error");
        setMessage(body.error ?? "Something went wrong. Please try again.");
        return;
      }
      form.reset();
      setState("done");
      setMessage("Thank you. You're on the list.");
    } catch {
      setState("error");
      setMessage("We couldn't reach the server. Please try again.");
    }
  }

  return <form className="newsletter-form" onSubmit={submit} noValidate={false}>
    <div className="newsletter-row">
      <input name="email" type="email" required autoComplete="email" placeholder="Your email address" aria-label="Email address" disabled={state === "sending"}/>
      <button type="submit" disabled={state === "sending"}>{state === "sending" ? "Joining…" : "Subscribe"}</button>
    </div>
    <p className={`newsletter-status${state === "error" ? " is-error" : ""}`} role="status" aria-live="polite">{message}</p>
    <p className="newsletter-consent">By subscribing you agree to our <Link href="/privacy">Privacy Policy</Link>. Unsubscribe any time.</p>
  </form>;
}
