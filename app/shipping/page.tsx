import type { Metadata } from "next";
import Link from "next/link";
import { formatPrice } from "@/features/catalog/products";
import { PolicyPage } from "@/features/site/policy-page";
import { site } from "@/features/site/site-config";
import { FREE_SHIPPING_THRESHOLD, SHIPPING_FEE } from "@/server/orders/pricing";

export const metadata: Metadata = { title: `Shipping Policy | ${site.name}` };

export default function ShippingPage() {
  return <PolicyPage eyebrow="Delivered with care" title="Shipping Policy">
    <p>We ship {site.name} pieces across India. This policy explains how and when your order reaches you.</p>

    <h2>Where we deliver</h2>
    <p>We deliver to addresses across India that our courier partners serve. Enter your PIN code at checkout; if we cannot deliver there, we will tell you before you pay.</p>

    <h2>Shipping charges</h2>
    <ul>
      <li>Shipping is <strong>free</strong> on orders of {formatPrice(FREE_SHIPPING_THRESHOLD / 100)} or more (after any discount).</li>
      <li>Below that, a flat shipping charge of <strong>{formatPrice(SHIPPING_FEE / 100)}</strong> applies.</li>
      <li>The exact charge is shown in your bag and at checkout before you pay.</li>
    </ul>

    <h2>Processing and delivery time</h2>
    <ul>
      <li>Orders are packed and handed to our courier partner within a short time of being confirmed. Online orders are confirmed once payment succeeds.</li>
      <li>Delivery usually takes {site.policy.deliveryTime} from dispatch, depending on your location.</li>
      <li>Delivery times are estimates. Weather, festivals, strikes and courier delays can affect them.</li>
    </ul>

    <h2>Tracking your order</h2>
    <p>When your order ships, we email you the courier name and tracking number. You can also see your order status any time on the <Link href="/account/orders">order history page</Link> or with the link in your confirmation email.</p>

    <h2>Cash on delivery</h2>
    <p>Cash on delivery is available on eligible orders. Please keep the exact amount ready when the courier arrives.</p>

    <h2>Wrong or incomplete address</h2>
    <p>Please check your delivery address and phone number carefully. If a parcel cannot be delivered because of an incorrect or incomplete address, or because nobody was available after the courier&rsquo;s attempts, it may be returned to us, and we may charge re-shipping.</p>

    <h2>Damaged or missing parcels</h2>
    <p>If your parcel arrives damaged or tampered with, or does not arrive, contact us within 48 hours of delivery (or the expected delivery date) at {site.supportEmail} with your order number and photographs. We will make it right as set out in our <Link href="/returns">Returns, Refund &amp; Cancellation Policy</Link>.</p>
  </PolicyPage>;
}
