import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { WalletContextProvider } from "@/components/providers/WalletContextProvider";
import { LanguageProvider } from "@/lib/LanguageContext";
import { NavBar } from "@/components/NavBar";
import { Footer } from "@/components/Footer";
import { DevnetBanner } from "@/components/DevnetBanner";

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
  "Sealed-bid deal syndicates on Solana. Bid or vote in secret — everyone reveals at once. Powered by MagicBlock Ephemeral Rollups.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: "https://avs-mou.vercel.app",
    siteName: "AVS",
    images: [{ url: "/icon.png", width: 256, height: 256 }],
    type: "website",
  },
  twitter: {
    card: "summary",
    title: TITLE,
    description: DESCRIPTION,
    images: ["/icon.png"],
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
            <DevnetBanner />
            <NavBar />
            {children}
            <Footer />
          </WalletContextProvider>
        </LanguageProvider>
      </body>
    </html>
  );
}
