"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { WalletConnectButton } from "@/components/WalletConnectButton";
import { ThemeToggle } from "@/components/ThemeToggle";

const LINKS = [
  { href: "/deals", label: "Deals" },
  { href: "/dashboard", label: "Dashboard" },
  { href: "/vote", label: "Vote" },
  { href: "/analytics", label: "Analytics" },
];

export function NavBar() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-3">
        <Link href="/" className="font-heading font-semibold tracking-tight text-foreground">
          AVS
        </Link>
        <nav className="flex items-center gap-4 text-sm">
          {LINKS.map((link) => {
            const active = pathname?.startsWith(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                aria-current={active ? "page" : undefined}
                className={
                  active
                    ? "border-b-2 border-primary font-medium text-foreground"
                    : "border-b-2 border-transparent text-muted-foreground transition hover:text-foreground"
                }
              >
                {link.label}
              </Link>
            );
          })}
        </nav>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <WalletConnectButton />
        </div>
      </div>
    </header>
  );
}
