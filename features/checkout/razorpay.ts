// Browser-side helper for Razorpay Standard Checkout. Only the public key id ever reaches the browser.

export type PaymentParams = { razorpayOrderId: string; amount: number; currency: string; keyId: string };
export type PaymentOutcome = { status: "paid" } | { status: "dismissed" } | { status: "failed"; message: string };

type RazorpayResponse = { razorpay_payment_id: string; razorpay_order_id: string; razorpay_signature: string };
type RazorpayInstance = { open(): void; on(event: "payment.failed", handler: (response: { error?: { description?: string } }) => void): void };
declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => RazorpayInstance;
  }
}

const SCRIPT_URL = "https://checkout.razorpay.com/v1/checkout.js";

function loadScript(): Promise<boolean> {
  if (typeof window === "undefined") return Promise.resolve(false);
  if (window.Razorpay) return Promise.resolve(true);
  return new Promise((resolve) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${SCRIPT_URL}"]`);
    const script = existing ?? Object.assign(document.createElement("script"), { src: SCRIPT_URL, async: true });
    script.addEventListener("load", () => resolve(true), { once: true });
    script.addEventListener("error", () => resolve(false), { once: true });
    if (!existing) document.head.appendChild(script);
  });
}

/** Opens the Razorpay modal and, on success, asks our server to verify the signature before reporting "paid". */
export async function payWithRazorpay(args: {
  orderNumber: string;
  params: PaymentParams;
  prefill: { name: string; email: string; contact: string };
  onFailedAttempt?: (message: string) => void;
}): Promise<PaymentOutcome> {
  if (!(await loadScript()) || !window.Razorpay) {
    return { status: "failed", message: "We couldn't load the payment window. Check your connection and try again." };
  }
  const Razorpay = window.Razorpay;
  return new Promise<PaymentOutcome>((resolve) => {
    let settled = false;
    const finish = (outcome: PaymentOutcome) => {
      if (!settled) {
        settled = true;
        resolve(outcome);
      }
    };
    const instance = new Razorpay({
      key: args.params.keyId,
      amount: args.params.amount,
      currency: args.params.currency,
      order_id: args.params.razorpayOrderId,
      name: "Simple & Unique",
      description: `Order ${args.orderNumber}`,
      prefill: args.prefill,
      theme: { color: "#1d211e" },
      handler: async (response: RazorpayResponse) => {
        try {
          const verify = await fetch("/api/v1/payments/razorpay/verify", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ orderNumber: args.orderNumber, ...response }),
          });
          const body = await verify.json().catch(() => ({}));
          finish(verify.ok ? { status: "paid" } : { status: "failed", message: body.error ?? "We couldn't verify your payment." });
        } catch {
          finish({ status: "failed", message: "We couldn't confirm your payment. If you were charged, your order will update shortly." });
        }
      },
      modal: { ondismiss: () => finish({ status: "dismissed" }) },
    });
    // A failed attempt doesn't close the modal (the shopper can retry inside it), so only surface the message.
    instance.on("payment.failed", (response) => args.onFailedAttempt?.(response.error?.description ?? "The payment failed. Please try again."));
    instance.open();
  });
}
