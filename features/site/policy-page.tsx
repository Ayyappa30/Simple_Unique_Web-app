import type { ReactNode } from "react";
import { SiteHeader } from "@/features/storefront/site-header";
import { site } from "@/features/site/site-config";

/** Shared shell for the policy and contact pages. */
export function PolicyPage({ eyebrow, title, children }: { eyebrow: string; title: string; children: ReactNode }) {
  return <><SiteHeader/><main className="section policy-page">
    <span className="eyebrow">{eyebrow}</span>
    <h1 className="serif">{title}</h1>
    <p className="policy-updated">Last updated: {site.policy.lastUpdated}</p>
    {!site.policiesReviewed && <p className="policy-draft" role="note">Draft: this page still contains placeholder details in [square brackets]. Fill in <code>features/site/site-config.ts</code> and have the wording reviewed before you launch.</p>}
    <div className="policy-body">{children}</div>
  </main></>;
}
