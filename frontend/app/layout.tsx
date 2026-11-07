import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";
import { WalletContextProvider } from "@/components/providers/WalletContextProvider";
import { LanguageProvider } from "@/lib/LanguageContext";
import { NavBar } from "@/components/NavBar";
import { Footer } from "@/components/Footer";
import { SkipLink } from "@/components/SkipLink";
import { AmbientBackground } from "@/components/AmbientBackground";

// Font system per the Stripe DESIGN.md reference (VoltAgent/awesome-design-md):
// one family (Inter, the documented open-source substitute for the
// proprietary Sohne) carrying both display and body — weight 300 for
// headings with negative tracking (see globals.css), regular weights for
// body copy. JetBrains Mono is kept, narrowly, for wallet addresses/hashes
// where true monospace alignment helps; money/numeric values use Inter's
// own tabular-nums feature instead, per the reference's own guidance.
const inter = Inter({
  subsets: ["latin"],
  variable: "--font-body",
  weight: ["300", "400", "500", "600"],
});
const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  weight: ["400", "500"],
});

const TITLE = "AVS — Anonymous Venture Syndicate";
const DESCRIPTION =
  "Sealed-bid deal syndicates on Solana devnet. Bid or vote in secret — the outcome reveals at once. Powered by MagicBlock Ephemeral Rollups.";

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#533afd" },
    { media: "(prefers-color-scheme: dark)", color: "#665efd" },
  ],
};

export const metadata: Metadata = {
  metadataBase: new URL("https://avs-mou.vercel.app"),
  // Each route's layout.tsx sets its own short title ("Deals", "FAQ", …).
  title: { default: TITLE, template: "%s · AVS" },
  description: DESCRIPTION,
  manifest: "/manifest.json",
  // The share image itself comes from app/opengraph-image.tsx (1200×630);
  // app/deals/[id]/opengraph-image.tsx overrides it per deal.
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: "https://avs-mou.vercel.app",
    siteName: "AVS",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.variable} ${jetbrainsMono.variable} antialiased`}>
        <LanguageProvider>
          <WalletContextProvider>
            <AmbientBackground />
            <SkipLink />
            <NavBar />
            {/* Every page's own root element is already a <main> — this id
                is just the skip-link's landing target, not a second
                landmark, so it stays a plain div. */}
            <div id="main-content">{children}</div>
            <Footer />
          </WalletContextProvider>
        </LanguageProvider>
        <Analytics />
      </body>
    </html>
  );
}
