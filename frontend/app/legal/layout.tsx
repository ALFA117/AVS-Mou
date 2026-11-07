import type { Metadata } from "next";

// Pages here are client components, which can't export metadata — this
// server layout only gives the route its own <title> and description.
export const metadata: Metadata = {
  title: "Legal",
  description: "Disclaimer, terms and privacy policy for AVS, a Solana devnet hackathon project.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
