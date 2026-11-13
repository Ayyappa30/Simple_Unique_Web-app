import { Suspense } from "react";
import type { Metadata } from "next";
import { SiteHeader } from "@/features/storefront/site-header";
import { LoginForm } from "@/features/auth/login-form";

export const metadata: Metadata = { title: "Sign in | Simple & Unique" };

export default function LoginPage() {
  return <><SiteHeader/><Suspense><LoginForm/></Suspense></>;
}
