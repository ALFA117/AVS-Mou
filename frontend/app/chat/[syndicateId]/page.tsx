"use client";

import Link from "next/link";
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
    return <main className="mx-auto max-w-4xl px-6 py-10 text-neutral-500">Loading…</main>;
  }
  if (!deal) {
    return <main className="mx-auto max-w-4xl px-6 py-10 text-red-600">Syndicate not found.</main>;
  }
  if (!publicKey) {
    return (
      <main className="mx-auto max-w-4xl px-6 py-10">
        <p className="text-neutral-500">Connect your wallet to open syndicate chat.</p>
      </main>
    );
  }
  if (!isMember) {
    return (
      <main className="mx-auto max-w-4xl px-6 py-10">
        <p className="text-neutral-500">
          Chat is only visible to syndicate members with a settled bid on this deal.
        </p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-4xl px-6 py-10">
      <Link href={`/syndicates/${deal.publicKey}`} className="text-sm text-neutral-500 hover:text-neutral-800">
        ← Syndicate
      </Link>

      <h1 className="mt-4 text-2xl font-bold">Syndicate Chat — Deal #{deal.dealId}</h1>
      <p className="text-xs text-neutral-400">
        Local-only for now — see docs note in lib/chatStore.ts for the planned on-chain
        ephemeral-account-chats upgrade.
      </p>

      <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-[1fr_240px]">
        <ChatPanel syndicateId={deal.publicKey} currentUser={publicKey.toBase58()} />

        <aside>
          <h3 className="text-sm font-medium text-neutral-700">Members</h3>
          <div className="mt-2 space-y-1">
            {bids.map((b) => {
              const role: MemberRole = b.bidder === deal.startup ? "founder" : "member";
              return (
                <div key={b.publicKey} className="flex items-center justify-between text-xs">
                  <span className="font-mono text-neutral-500">{shortenAddress(b.bidder)}</span>
                  <span className="flex items-center gap-1">
                    {roleLabel(role)}
                    {Number(b.equityAllocated) > 0 && (
                      <span className="text-neutral-400">· {formatEquity(b.equityAllocated)}</span>
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
