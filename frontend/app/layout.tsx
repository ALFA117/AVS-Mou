import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { WalletContextProvider } from "@/components/providers/WalletContextProvider";
import { LanguageProvider } from "@/lib/LanguageContext";
import { NavBar } from "@/components/NavBar";
import { Footer } from "@/components/Footer";

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

export const metadata: Metadata = {
  title: "AVS — Anonymous Venture Syndicate",
  description: "Sealed-bid deal syndicates on Solana, powered by MagicBlock Ephemeral Rollups.",
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
            <NavBar />
            {children}
            <Footer />
          </WalletContextProvider>
        </LanguageProvider>
      </body>
    </html>
  );
}
