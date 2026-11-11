import type { Metadata } from "next";
import "./globals.css";
import { StoreProvider } from "@/store/provider";

export const metadata: Metadata = {
  title: "Simple & Unique | Everyday pieces, made to stay",
  description: "Discover thoughtful, anti-tarnish jewellery and everyday accessories from Simple & Unique.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en">
      <body><StoreProvider>{children}</StoreProvider></body>
    </html>
  );
}
