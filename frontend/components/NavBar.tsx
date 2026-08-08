"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { WalletConnectButton } from "@/components/WalletConnectButton";

const LINKS = [
  { href: "/deals", label: "Deals" },
  { href: "/dashboard", label: "Dashboard" },
  { href: "/vote", label: "Vote" },
  { href: "/analytics", label: "Analytics" },
];

export function NavBar() {
  const pathname = usePathname();

  return (
    <header className="border-b border-neutral-200">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-3">
        <Link href="/" className="font-semibold tracking-tight">
          AVS
        </Link>
        <nav className="flex items-center gap-4 text-sm">
          {LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={
                pathname?.startsWith(link.href)
                  ? "font-medium text-black"
                  : "text-neutral-500 hover:text-black"
              }
            >
              {link.label}
            </Link>
          ))}
        </nav>
        <WalletConnectButton />
      </div>
    </header>
  );
}
