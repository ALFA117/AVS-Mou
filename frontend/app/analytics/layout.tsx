import type { Metadata } from "next";

// Pages here are client components, which can't export metadata — this
// server layout only gives the route its own <title> and description.
export const metadata: Metadata = {
  title: "Analytics",
  description: "Public platform stats for AVS on Solana devnet — no wallet needed.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
