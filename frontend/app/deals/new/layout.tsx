import type { Metadata } from "next";

// Pages here are client components, which can't export metadata — this
// server layout only gives the route its own <title> and description.
export const metadata: Metadata = {
  title: { absolute: "Create a deal · AVS" },
  description: "Post a sealed-bid deal on Solana devnet via MagicBlock Ephemeral Rollups.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
