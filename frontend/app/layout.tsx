import type { Metadata } from "next";
import { Space_Grotesk, Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { WalletContextProvider } from "@/components/providers/WalletContextProvider";
import { NavBar } from "@/components/NavBar";
import { Footer } from "@/components/Footer";

// Font pairing from the ui-ux-pro-max design system for AVS (web3/fintech/
// dark, trustless-but-precise mood) — Space Grotesk for headings, Inter for
// body, JetBrains Mono for addresses/amounts (tabular figures).
const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-heading",
  weight: ["500", "600", "700"],
});
const inter = Inter({
  subsets: ["latin"],
  variable: "--font-body",
  weight: ["400", "500", "600"],
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
      <body
        className={`${spaceGrotesk.variable} ${inter.variable} ${jetbrainsMono.variable} antialiased`}
      >
        <WalletContextProvider>
          <NavBar />
          {children}
          <Footer />
        </WalletContextProvider>
      </body>
    </html>
  );
}
