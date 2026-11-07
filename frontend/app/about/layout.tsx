import type { Metadata } from "next";

// Pages here are client components, which can't export metadata — this
// server layout only gives the route its own <title> and description.
export const metadata: Metadata = {
  title: "About",
  description: "What AVS is, why sealed bids matter, and how the three Anchor programs work.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
