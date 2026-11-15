import type { Metadata, Viewport } from "next";
import { Newsreader, IBM_Plex_Sans, IBM_Plex_Mono } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";
import { WalletContextProvider } from "@/components/providers/WalletContextProvider";
import { LanguageProvider } from "@/lib/LanguageContext";
import { NavBar } from "@/components/NavBar";
import { Footer } from "@/components/Footer";
import { SkipLink } from "@/components/SkipLink";

// Type system (rediseno-pro): Newsreader — a text serif with real optical
// sizes — for display titles, the way term sheets and placement memos are
// set; IBM Plex Sans for interface copy; IBM Plex Mono for amounts,
// addresses and deal ids.
const display = Newsreader({
  subsets: ["latin"],
  variable: "--font-display",
  weight: ["400", "500"],
  style: ["normal", "italic"],
  display: "swap",
});
const sans = IBM_Plex_Sans({
  subsets: ["latin"],
  variable: "--font-body",
  weight: ["400", "500", "600"],
  display: "swap",
});
const mono = IBM_Plex_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  weight: ["400", "500"],
  display: "swap",
});

const TITLE = "AVS â€” Anonymous Venture Syndicate";
const DESCRIPTION =
  "Sealed-bid deal syndicates on Solana devnet. Bid or vote in secret â€” the outcome reveals at once. Powered by MagicBlock Ephemeral Rollups.";

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f8f6f1" },
    { media: "(prefers-color-scheme: dark)", color: "#121016" },
  ],
};

export const metadata: Metadata = {
  metadataBase: new URL("https://avs-mou.vercel.app"),
  // Each route's layout.tsx sets its own short title ("Deals", "FAQ", â€¦).
  title: { default: TITLE, template: "%s Â· AVS" },
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
      <body className={`${display.variable} ${sans.variable} ${mono.variable} antialiased`}>
        <LanguageProvider>
          <WalletContextProvider>
            <SkipLink />
            <NavBar />
            {/* Every page's own root element is already a <main> â€” this id
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
