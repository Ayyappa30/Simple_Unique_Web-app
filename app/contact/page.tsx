import type { Metadata } from "next";
import { Mail, MapPin, Phone } from "lucide-react";
import { PolicyPage } from "@/features/site/policy-page";
import { site } from "@/features/site/site-config";

export const metadata: Metadata = { title: `Contact Us | ${site.name}` };

export default function ContactPage() {
  const { grievanceOfficer: officer } = site;
  return <PolicyPage eyebrow="We're here to help" title="Contact us">
    <p>Questions about an order, a product or anything else? Write or call us and we will get back to you as soon as we can.</p>

    <div className="contact-grid">
      <div className="contact-card"><Mail size={18} aria-hidden="true"/><h2>Email</h2><p>{site.supportEmail}</p></div>
      <div className="contact-card"><Phone size={18} aria-hidden="true"/><h2>Phone</h2><p>{site.supportPhone}</p><small>{site.supportHours}</small></div>
      <div className="contact-card"><MapPin size={18} aria-hidden="true"/><h2>Registered address</h2><p>{site.legalName}</p><p>{site.address}</p>{site.gstin && <small>GSTIN: {site.gstin}</small>}</div>
    </div>

    <h2 id="grievance">Grievance Officer</h2>
    <p>If you have a complaint about our products, services or how your personal information is handled, please contact our Grievance Officer. As required by the Consumer Protection (E-Commerce) Rules, 2020, we acknowledge complaints within 48 hours and aim to resolve them within one month.</p>
    <ul>
      <li><strong>Name:</strong> {officer.name}</li>
      <li><strong>Email:</strong> {officer.email}</li>
      <li><strong>Phone:</strong> {officer.phone}</li>
      <li><strong>Address:</strong> {site.address}</li>
    </ul>
    <p>Please include your name, order number (if any) and a description of your concern so that we can help you quickly.</p>
  </PolicyPage>;
}
