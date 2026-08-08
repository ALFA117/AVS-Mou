"use client";

import Link from "next/link";
import { ArrowLeft, Users } from "lucide-react";
import { useWallet } from "@solana/wallet-adapter-react";
import { useDeal } from "@/hooks/useDeal";
import { useBids } from "@/hooks/useBids";
import { ChatPanel, roleLabel } from "@/components/ChatPanel";
import { formatEquity, shortenAddress } from "@/lib/format";
import type { MemberRole } from "@/lib/types";

export default function ChatPage({ params }: { params: { syndicateId: string } }) {
  const { publicKey } = useWallet();
  const { deal, loading } = useDeal(params.syndicateId);
  const { bids } = useBids(params.syndicateId);

  const isMember = bids.some((b) => b.bidder === publicKey?.toBase58());

  if (loading) {
    return <main className="mx-auto max-w-4xl px-6 py-10 text-muted-foreground">Loading…</main>;
  }
  if (!deal) {
    return <main className="mx-auto max-w-4xl px-6 py-10 text-red-600 dark:text-red-400">Syndicate not found.</main>;
  }
  if (!publicKey) {
    return (
      <main className="mx-auto max-w-4xl px-6 py-10">
        <p className="text-muted-foreground">Connect your wallet to open syndicate chat.</p>
      </main>
    );
  }
  if (!isMember) {
    return (
      <main className="mx-auto max-w-4xl px-6 py-10">
        <p className="text-muted-foreground">
          Chat is only visible to syndicate members with a settled bid on this deal.
        </p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-4xl px-6 py-10">
      <Link
        href={`/syndicates/${deal.publicKey}`}
        className="flex items-center gap-1.5 text-sm text-muted-foreground transition hover:text-foreground"
      >
        <ArrowLeft className="h-3.5 w-3.5" strokeWidth={2} />
        Syndicate
      </Link>

      <h1 className="mt-4 font-heading text-2xl font-bold text-foreground">
        Syndicate Chat — Deal #{deal.dealId}
      </h1>
      <p className="text-xs text-muted-foreground">
        Local-only for now — see docs note in lib/chatStore.ts for the planned on-chain
        ephemeral-account-chats upgrade.
      </p>

      <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-[1fr_240px]">
        <ChatPanel syndicateId={deal.publicKey} currentUser={publicKey.toBase58()} />

        <aside>
          <h3 className="flex items-center gap-1.5 text-sm font-medium text-foreground">
            <Users className="h-3.5 w-3.5 text-primary" strokeWidth={2} />
            Members
          </h3>
          <div className="mt-2 space-y-1">
            {bids.map((b) => {
              const role: MemberRole = b.bidder === deal.startup ? "founder" : "member";
              return (
                <div key={b.publicKey} className="flex items-center justify-between text-xs">
                  <span className="font-mono-avs text-muted-foreground">{shortenAddress(b.bidder)}</span>
                  <span className="flex items-center gap-1 text-foreground">
                    {roleLabel(role)}
                    {Number(b.equityAllocated) > 0 && (
                      <span className="text-muted-foreground">· {formatEquity(b.equityAllocated)}</span>
                    )}
                  </span>
                </div>
              );
            })}
          </div>
        </aside>
      </div>
    </main>
  );
}
