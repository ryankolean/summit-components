import "@summit/hero/hero.css";
import "./site.css";
import type { Metadata } from "next";
import type { ReactNode } from "react";
import { entityJsonLd, faqJsonLd, serializeJsonLd } from "@summit/seo";
import { toCssVariables } from "@summit/tokens";
import { absolute, baseOpenGraph, brand, entity, mode, siteRoot } from "../lib/site";

export const metadata: Metadata = {
  metadataBase: siteRoot,
  description: entity.description,
  robots: mode === "production" ? { index: true, follow: true } : { index: false, follow: false },
  openGraph: baseOpenGraph,
  twitter: { card: "summary_large_image" },
  icons: { icon: absolute("favicon.svg") },
};

const jsonLd = [entityJsonLd(entity), faqJsonLd(entity)].filter(Boolean);

export default function RootLayout({ children }: { children: ReactNode }) {
  const address = entity.locations[0]?.address;
  return (
    <html lang="en">
      <head>
        <style dangerouslySetInnerHTML={{ __html: toCssVariables(brand) }} />
        {jsonLd.map((data, i) => (
          <script key={i} type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(data) }} />
        ))}
      </head>
      <body>
        <main>{children}</main>
        <footer className="site-footer">
          <p>
            {entity.name}. {address?.street}, {address?.locality}.
          </p>
        </footer>
      </body>
    </html>
  );
}
