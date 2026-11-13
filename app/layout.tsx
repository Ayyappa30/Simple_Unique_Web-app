import type { Metadata } from "next";
import { Cormorant_Garamond, Jost } from "next/font/google";
import "./globals.css";
import { Copyright } from "@/features/site/copyright";
import { SiteFooter } from "@/features/site/site-footer";
import { StoreProvider } from "@/store/provider";

// Display serif for headings, prices and the wordmark; light geometric sans for body text.
const display = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
  style: ["normal", "italic"],
  variable: "--font-display",
  display: "swap",
});
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
    <html lang="en" className={`${display.variable} ${body.variable}`}>
      <body><StoreProvider>{children}</StoreProvider><SiteFooter copyright={<Copyright />} /></body>
    </html>
  );
}
