import type { Metadata } from "next";
import { Jost } from "next/font/google";
import "./globals.css";
import { Copyright } from "@/features/site/copyright";
import { SiteFooter } from "@/features/site/site-footer";
import { StoreProvider } from "@/store/provider";

// Jost is a free, Futura-style geometric sans (the look Lovisa uses). One family for the whole store.
const body = Jost({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
  variable: "--font-body",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Simple & Unique | Everyday pieces, made to stay",
  description: "Discover thoughtful, anti-tarnish jewellery and everyday accessories from Simple & Unique.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={body.variable}>
      <body><StoreProvider>{children}</StoreProvider><SiteFooter copyright={<Copyright />} /></body>
    </html>
  );
}
