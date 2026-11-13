import type { Metadata } from "next";
import Link from "next/link";
import { PolicyPage } from "@/features/site/policy-page";
import { site } from "@/features/site/site-config";

export const metadata: Metadata = { title: `Privacy Policy | ${site.name}` };

export default function PrivacyPage() {
  return <PolicyPage eyebrow="Your information" title="Privacy Policy">
    <p>{site.name} respects your privacy. This policy explains what personal information we collect, why, and the choices you have, in line with the Digital Personal Data Protection Act, 2023 and the Information Technology Act, 2000.</p>

    <h2>Information we collect</h2>
    <ul>
      <li><strong>Account details:</strong> your name, email address and an encrypted (hashed) password if you create an account.</li>
      <li><strong>Order details:</strong> your name, phone number, email address, delivery address and the items you buy.</li>
      <li><strong>Newsletter:</strong> your email address if you subscribe.</li>
      <li><strong>Payment information:</strong> online payments are handled by Razorpay. We receive a payment reference and the status of your payment, but we never see or store your card, UPI or bank details.</li>
      <li><strong>On your device:</strong> your bag, wishlist and the order numbers of orders you placed are saved in your browser so the store works between visits. We use a secure cookie to keep you signed in. We do not use advertising cookies.</li>
    </ul>

    <h2>How we use it</h2>
    <ul>
      <li>To process and deliver your orders, send order and shipping updates, and provide support.</li>
      <li>To run your account and keep it secure.</li>
      <li>To send our newsletter, only if you subscribed. You can unsubscribe at any time.</li>
      <li>To meet legal, tax and accounting requirements and to prevent fraud.</li>
    </ul>

    <h2>Who we share it with</h2>
    <p>We share information only with service providers who help us run the store, and only what they need: our payment partner (Razorpay), courier and logistics partners, our email delivery provider, and our website and database hosts. We do not sell your personal information. We may disclose information when the law requires it.</p>

    <h2>How long we keep it</h2>
    <p>We keep order and account information for as long as needed to serve you and to meet legal and accounting obligations. Newsletter details are kept until you unsubscribe.</p>

    <h2>Your rights</h2>
    <p>You can ask us to show you the personal information we hold, correct it, delete it, or withdraw your consent, subject to what the law requires us to keep. Write to us at {site.supportEmail}, or contact our Grievance Officer on the <Link href="/contact#grievance">Contact page</Link>.</p>

    <h2>Security</h2>
    <p>We use reasonable safeguards, including encrypted connections, hashed passwords and restricted access, to protect your information. No online service can be completely secure, so please keep your password private.</p>

    <h2>Children</h2>
    <p>Our website is not meant for children under 18, and we do not knowingly collect their personal information.</p>

    <h2>Changes to this policy</h2>
    <p>We may update this policy from time to time. The latest version is always on this page.</p>
  </PolicyPage>;
}
