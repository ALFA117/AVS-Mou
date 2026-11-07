import type { Metadata } from "next";

// Pages here are client components, which can't export metadata — this
// server layout only gives the route its own <title> and description.
export const metadata: Metadata = {
  title: "System status",
  description: "Live checks of Solana devnet and the MagicBlock TEE Ephemeral Rollup AVS depends on.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
