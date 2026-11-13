import { Suspense } from "react";
import type { Metadata } from "next";
import { SiteHeader } from "@/features/storefront/site-header";
import { LoginForm } from "@/features/auth/login-form";

export const metadata: Metadata = { title: "Create account | Simple & Unique" };

export default function RegisterPage() {
  return <><SiteHeader/><Suspense><LoginForm initialMode="register"/></Suspense></>;
}
