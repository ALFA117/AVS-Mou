import Link from "next/link";

const LINKS = [
  { href: "/about", label: "About" },
  { href: "/faq", label: "FAQ" },
  { href: "/legal", label: "Legal" },
  { href: "/status", label: "Status" },
  { href: "/settings", label: "Settings" },
];

export function Footer() {
  return (
    <footer className="mt-16 border-t border-neutral-200 dark:border-neutral-800">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-center gap-4 px-6 py-6 text-xs text-neutral-500">
        {LINKS.map((link) => (
          <Link key={link.href} href={link.href} className="hover:text-neutral-800 dark:hover:text-neutral-200">
            {link.label}
          </Link>
        ))}
      </div>
    </footer>
  );
}
