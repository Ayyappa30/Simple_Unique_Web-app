"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowUp } from "lucide-react";
import { NewsletterForm } from "@/features/site/newsletter-form";
import { site } from "@/features/site/site-config";

const shopLinks = [
  ["Shop all", "/shop"],
  ["Necklaces", "/shop?category=necklaces"],
  ["Earrings", "/shop?category=earrings"],
  ["Bracelets", "/shop?category=bracelets"],
  ["Body piercings", "/shop?category=piercings"],
  ["Sets", "/shop?category=sets"],
] as const;

const helpLinks = [
  ["Contact us", "/contact"],
  ["Shipping & delivery", "/shipping"],
  ["Returns & refunds", "/returns"],
  ["Track an order", "/account/orders"],
  ["My account", "/login"],
  ["Wishlist", "/wishlist"],
] as const;

const aboutLinks = [
  ["Our story", "/#about"],
  ["Contact & Grievance Officer", "/contact#grievance"],
] as const;

const legalLinks = [
  ["Terms & Conditions", "/terms"],
  ["Privacy Policy", "/privacy"],
  ["Shipping Policy", "/shipping"],
  ["Returns & Refunds", "/returns"],
  ["Grievance Officer", "/contact#grievance"],
] as const;

// Simple stroke icons (the icon library in use has no brand logos).
const socialIcons = {
  instagram: <><rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/></>,
  facebook: <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/>,
  youtube: <><path d="M22.54 6.42a2.78 2.78 0 0 0-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.46a2.78 2.78 0 0 0-1.94 2A29 29 0 0 0 1 11.75a29 29 0 0 0 .46 5.33A2.78 2.78 0 0 0 3.4 19c1.72.46 8.6.46 8.6.46s6.88 0 8.6-.46a2.78 2.78 0 0 0 1.94-2 29 29 0 0 0 .46-5.25 29 29 0 0 0-.46-5.33z"/><polygon points="9.75 15.02 15.5 11.75 9.75 8.48 9.75 15.02"/></>,
} as const;
const socialLabels = { instagram: "Instagram", facebook: "Facebook", youtube: "YouTube" } as const;

function LinkColumn({ title, links }: { title: string; links: readonly (readonly [string, string])[] }) {
  return <nav className="footer-col" aria-label={title}>
    <h3>{title}</h3>
    <ul>{links.map(([label, href]) => <li key={label}><Link href={href}>{label}</Link></li>)}</ul>
  </nav>;
}

export function SiteFooter({ copyright }: { copyright: ReactNode }) {
  const socials = (Object.keys(socialIcons) as (keyof typeof socialIcons)[]).filter((key) => site.socials[key]);
  return <footer className="site-footer">
    <div className="footer-main">
      <section className="footer-join" aria-labelledby="footer-join-title">
        <h2 id="footer-join-title">Join our world</h2>
        <p>Be the first to know about new pieces and little stories, plus a treat on your first order.</p>
        <NewsletterForm/>
        {socials.length > 0 && <div className="footer-social">
          <span>Get social with us</span>
          {socials.map((key) => <a key={key} href={site.socials[key]} target="_blank" rel="noopener noreferrer" aria-label={socialLabels[key]}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{socialIcons[key]}</svg>
          </a>)}
        </div>}
      </section>
      <LinkColumn title="About us" links={aboutLinks}/>
      <LinkColumn title="Need help" links={helpLinks}/>
      <LinkColumn title="Discover" links={shopLinks}/>
    </div>

    <div className="footer-bottom">
      <ul className="footer-legal" aria-label="Legal">
        {legalLinks.map(([label, href]) => <li key={label}><Link href={href}>{label}</Link></li>)}
        <li className="footer-copy">{copyright}</li>
      </ul>
      <button type="button" className="back-to-top" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}><ArrowUp size={14} aria-hidden="true"/> Back to top</button>
      <div className="footer-locale">
        <span className="footer-region">
          <svg width="22" height="15" viewBox="0 0 22 15" aria-hidden="true"><rect width="22" height="5" fill="#FF9933"/><rect y="5" width="22" height="5" fill="#FFFFFF"/><rect y="10" width="22" height="5" fill="#138808"/><circle cx="11" cy="7.5" r="1.8" fill="none" stroke="#000080" strokeWidth=".6"/></svg>
          India (&#8377; INR)
        </span>
        <span className="footer-language">Language: English</span>
      </div>
    </div>
  </footer>;
}
