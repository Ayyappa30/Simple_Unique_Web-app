import type { OrderView } from "@/server/orders/repository";
import { sendEmail, type Email } from "./send";

export type OrderEmailKind = "placed" | "shipped" | "delivered" | "cancelled";

const esc = (value: string) =>
  value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
const rupees = (paise: number) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(paise / 100);
const siteUrl = () => (process.env.SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");

function copy(kind: OrderEmailKind, order: OrderView) {
  const first = order.customer.name.split(" ")[0] ?? "there";
  const tracking = order.trackingNumber ? ` Tracking: ${order.carrier ? `${order.carrier} · ` : ""}${order.trackingNumber}.` : "";
  switch (kind) {
    case "placed":
      return { subject: `We’ve got your order ${order.orderNumber}`, heading: "Thank you for your order", body: order.paymentMethod === "cod" ? `Hi ${first}, your order is confirmed. You’ll pay ${rupees(order.totalInPaise)} in cash when it arrives.` : `Hi ${first}, your payment of ${rupees(order.totalInPaise)} was received and your order is confirmed.` };
    case "shipped":
      return { subject: `Your order ${order.orderNumber} is on its way`, heading: "Your order has shipped", body: `Hi ${first}, good news: your order is on its way.${tracking}` };
    case "delivered":
      return { subject: `Your order ${order.orderNumber} was delivered`, heading: "Delivered", body: `Hi ${first}, your order has been delivered. We hope you love it. Thank you for shopping with us.` };
    case "cancelled":
      return { subject: `Your order ${order.orderNumber} was cancelled`, heading: "Order cancelled", body: `Hi ${first}, your order has been cancelled. If this is a surprise, just reply to this email and we’ll help.` };
  }
}

export function buildOrderEmail(kind: OrderEmailKind, order: OrderView): Email {
  const { subject, heading, body } = copy(kind, order);
  const link = `${siteUrl()}/orders/${order.orderNumber}`;
  const lines = order.items.map((item) => ({ label: `${item.name} × ${item.quantity}`, amount: rupees(item.unitPriceInPaise * item.quantity) }));
  const address = [order.shipping.street, order.shipping.city, `${order.shipping.state} ${order.shipping.pincode}`].filter(Boolean).join(", ");

  const rows = lines.map((l) => `<tr><td style="padding:6px 0">${esc(l.label)}</td><td style="padding:6px 0;text-align:right">${esc(l.amount)}</td></tr>`).join("")
    + (order.discountInPaise ? `<tr><td style="padding:6px 0">Discount</td><td style="padding:6px 0;text-align:right">−${rupees(order.discountInPaise)}</td></tr>` : "")
    + `<tr><td style="padding:6px 0">Shipping</td><td style="padding:6px 0;text-align:right">${order.shippingInPaise ? rupees(order.shippingInPaise) : "Free"}</td></tr>`
    + `<tr><td style="padding:10px 0;border-top:1px solid #ddd"><strong>Total</strong></td><td style="padding:10px 0;border-top:1px solid #ddd;text-align:right"><strong>${rupees(order.totalInPaise)}</strong></td></tr>`;
  const trackingHtml = kind === "shipped" && order.trackingNumber
    ? `<p style="margin:16px 0 0"><strong>Tracking:</strong> ${esc(order.carrier ? `${order.carrier} · ` : "")}${esc(order.trackingNumber)}</p>` : "";

  const html = `<div style="font-family:Georgia,serif;background:#f8f6f2;padding:24px"><div style="max-width:520px;margin:auto;background:#fff;padding:32px">
<p style="letter-spacing:.2em;font-size:12px;margin:0 0 20px">SIMPLE &amp; UNIQUE</p>
<h1 style="font-weight:400;font-size:26px;margin:0 0 12px">${esc(heading)}</h1>
<p style="line-height:1.6;margin:0 0 20px">${esc(body)}</p>
<p style="margin:0 0 4px"><strong>Order ${esc(order.orderNumber)}</strong></p>
<table style="width:100%;border-collapse:collapse;font-size:14px">${rows}</table>${trackingHtml}
<p style="font-size:14px;margin:16px 0 0"><strong>Delivering to:</strong> ${esc(address)}</p>
<p style="margin:24px 0 0"><a href="${esc(link)}" style="background:#222;color:#fff;padding:12px 20px;text-decoration:none;font-size:13px">View your order</a></p>
</div></div>`;

  const text = [heading, "", body, "", `Order ${order.orderNumber}`, ...lines.map((l) => `${l.label}  ${l.amount}`),
    ...(order.discountInPaise ? [`Discount  -${rupees(order.discountInPaise)}`] : []),
    `Shipping  ${order.shippingInPaise ? rupees(order.shippingInPaise) : "Free"}`, `Total  ${rupees(order.totalInPaise)}`, "",
    `Delivering to: ${address}`, `View your order: ${link}`].join("\n");

  return { to: order.customer.email, subject, html, text };
}

/** Fire-and-forget. Call inside `after()` so it never delays the response. */
export async function sendOrderEmail(kind: OrderEmailKind, order: OrderView) {
  await sendEmail(buildOrderEmail(kind, order));
}
