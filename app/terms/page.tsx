import type { Metadata } from "next";
import Link from "next/link";
import { PolicyPage } from "@/features/site/policy-page";
import { site } from "@/features/site/site-config";

export const metadata: Metadata = { title: `Terms & Conditions | ${site.name}` };

export default function TermsPage() {
  return <PolicyPage eyebrow="The small print" title="Terms & Conditions">
    <p>Welcome to {site.name}. By browsing this website or placing an order, you agree to these terms. Please read them with our <Link href="/privacy">Privacy Policy</Link>, <Link href="/shipping">Shipping Policy</Link> and <Link href="/returns">Returns, Refund &amp; Cancellation Policy</Link>.</p>

    <h2>Who we are</h2>
    <p>This website is operated by {site.legalName} (&ldquo;{site.name}&rdquo;, &ldquo;we&rdquo;, &ldquo;us&rdquo;), located at {site.address}. You can reach us on the <Link href="/contact">Contact page</Link>.</p>

    <h2>Using the website</h2>
    <ul>
      <li>You must be at least 18 years old, or use the website under the supervision of a parent or guardian.</li>
      <li>You agree to give accurate details when you register or check out, and to keep your account password private.</li>
      <li>You must not misuse the website, attempt to gain unauthorised access, or interfere with how it works.</li>
    </ul>

    <h2>Products and pricing</h2>
    <ul>
      <li>We try to show our jewellery and accessories as accurately as possible. Colours may look slightly different on your screen, and each piece may vary slightly.</li>
      <li>All prices are in Indian Rupees (&#8377;) and include applicable taxes unless stated otherwise. Shipping charges, if any, are shown before you pay.</li>
      <li>We may change prices, offers and availability at any time. A price is confirmed when your order is placed.</li>
      <li>Coupon codes are subject to their stated conditions and cannot be combined unless we say so.</li>
    </ul>

    <h2>Orders and payment</h2>
    <ul>
      <li>Placing an order is an offer to buy. We confirm it by email or on the order page. We may decline or cancel an order, for example if an item is out of stock or a price was shown in error, and we will refund any payment you made.</li>
      <li>You can pay online (UPI, cards, net banking and wallets) through our payment partner Razorpay, or choose cash on delivery where available. We do not see or store your card or bank details.</li>
      <li>Orders paid online are held for a limited time while payment is pending and are released if payment is not completed.</li>
    </ul>

    <h2>Shipping, returns and refunds</h2>
    <p>Delivery, returns, cancellations and refunds are covered by our <Link href="/shipping">Shipping Policy</Link> and <Link href="/returns">Returns, Refund &amp; Cancellation Policy</Link>, which form part of these terms.</p>

    <h2>Intellectual property</h2>
    <p>The text, photographs, logos and designs on this website belong to {site.name} or its licensors. You may not copy, reproduce or use them commercially without our written permission.</p>

    <h2>Limitation of liability</h2>
    <p>To the extent the law allows, {site.name} is not liable for indirect or consequential loss arising from your use of the website or our products. Nothing in these terms limits your rights under the Consumer Protection Act, 2019 or any other law that cannot be limited.</p>

    <h2>Governing law</h2>
    <p>These terms are governed by the laws of India. Courts in {site.policy.jurisdiction} have jurisdiction over disputes, subject to any consumer rights you have to approach another forum.</p>

    <h2>Changes to these terms</h2>
    <p>We may update these terms from time to time. The version on this page is the one that applies when you place an order.</p>

    <h2>Questions</h2>
    <p>Write to us at {site.supportEmail} or see the <Link href="/contact">Contact page</Link>.</p>
  </PolicyPage>;
}
