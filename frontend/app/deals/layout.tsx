import type { Metadata } from "next";

// Pages here are client components, which can't export metadata — this
// server layout only gives the route its own <title> and description.
export const metadata: Metadata = {
  title: "Deals",
  description: "Sealed-bid deal syndicates on Solana devnet: open deals, deals awaiting reveal, and revealed ones.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
