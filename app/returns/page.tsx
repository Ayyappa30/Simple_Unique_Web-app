import type { Metadata } from "next";
import Link from "next/link";
import { PolicyPage } from "@/features/site/policy-page";
import { site } from "@/features/site/site-config";

export const metadata: Metadata = { title: `Returns, Refund & Cancellation Policy | ${site.name}` };

export default function ReturnsPage() {
  return <PolicyPage eyebrow="Changed your mind?" title="Returns, Refund & Cancellation">
    <p>We want you to love your {site.name} pieces. If something is not right, this is how returns, refunds and cancellations work.</p>

    <h2>Cancelling an order</h2>
    <ul>
      <li>You can cancel an order before it ships. Contact us at {site.supportEmail} with your order number as soon as possible.</li>
      <li>Once an order has shipped, it can no longer be cancelled, but you can return it as described below.</li>
      <li>If you paid online and your order is cancelled, we refund the full amount.</li>
    </ul>

    <h2>Returns and exchanges</h2>
    <ul>
      <li>You can request a return within <strong>{site.policy.returnWindow}</strong> of delivery.</li>
      <li>Items must be unused, unworn and in their original packaging with any tags and accessories.</li>
      <li>Some hygiene-sensitive items may not be returnable once opened. If you are unsure, contact us before you buy.</li>
      <li>If an item arrives damaged, defective or different from what you ordered, tell us within 48 hours of delivery with your order number and photographs, and we will replace it or refund you.</li>
    </ul>

    <h2>How to start a return</h2>
    <ol>
      <li>Email {site.supportEmail} with your order number and the reason for the return.</li>
      <li>We will confirm whether the return is accepted and tell you how to send the item back.</li>
      <li>Pack the item securely and send it as instructed. Please keep the courier receipt.</li>
    </ol>

    <h2>Refunds</h2>
    <ul>
      <li>Once we receive and check a returned item, we approve the refund and tell you by email.</li>
      <li>Online payments are refunded to the original payment method (card, UPI, net banking or wallet) within {site.policy.refundTime} of approval. Your bank may take extra time to show it.</li>
      <li>For cash on delivery orders, we refund by bank transfer or UPI to details you give us.</li>
      <li>Original shipping charges are refunded only if the return is due to our error or a damaged or defective item.</li>
    </ul>

    <h2>Need help?</h2>
    <p>See our <Link href="/contact">Contact page</Link> for how to reach us, including our Grievance Officer.</p>
  </PolicyPage>;
}
