"use client";

import Link from "next/link";
import { ArrowLeft, Users } from "lucide-react";
import { useWallet } from "@solana/wallet-adapter-react";
import { useDeal } from "@/hooks/useDeal";
import { useBids } from "@/hooks/useBids";
import { ChatPanel, roleLabel } from "@/components/ChatPanel";
import { Skeleton } from "@/components/Skeleton";
import { formatEquity, shortenAddress } from "@/lib/format";
import { useTranslation } from "@/lib/LanguageContext";
import type { MemberRole } from "@/lib/types";

export default function ChatPage({ params }: { params: { syndicateId: string } }) {
  const { publicKey } = useWallet();
  const { deal, loading } = useDeal(params.syndicateId);
  const { bids } = useBids(params.syndicateId);
  const { t } = useTranslation();

  const isMember = bids.some((b) => b.bidder === publicKey?.toBase58());

  if (loading) {
    return (
      <main className="mx-auto max-w-4xl px-6 py-10">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="mt-4 h-7 w-64" />
        <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-[1fr_240px]">
          <Skeleton className="h-96 w-full" />
          <Skeleton className="h-40 w-full" />
        </div>
      </main>
    );
  }
  if (!deal) {
    return (
      <main role="alert" className="mx-auto max-w-4xl px-6 py-10 text-red-600 dark:text-red-400">
        {t("chatPage.notFound")}
      </main>
    );
  }
  if (!publicKey) {
    return (
      <main className="mx-auto max-w-4xl px-6 py-10">
        <p className="text-muted-foreground">{t("chatPage.connectPrompt")}</p>
      </main>
    );
  }
  if (!isMember) {
    return (
      <main className="mx-auto max-w-4xl px-6 py-10">
        <p className="text-muted-foreground">{t("chatPage.notMember")}</p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-4xl px-6 py-10">
      <Link
        href={`/syndicates/${deal.publicKey}`}
        className="flex items-center gap-1.5 text-sm text-muted-foreground transition-colors duration-200 hover:text-foreground"
      >
        <ArrowLeft className="h-3.5 w-3.5" strokeWidth={2} />
        {t("chatPage.syndicate")}
      </Link>

      <h1 className="mt-4 font-heading text-2xl font-light tracking-tight text-foreground">
        {t("chatPage.title", { id: deal.dealId })}
      </h1>
      <p className="text-xs text-muted-foreground">{t("chatPage.localOnlyNote")}</p>

      <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-[1fr_240px]">
        <ChatPanel syndicateId={deal.publicKey} currentUser={publicKey.toBase58()} />

        <aside>
          <h3 className="flex items-center gap-1.5 text-sm font-medium text-foreground">
            <Users className="h-3.5 w-3.5 text-primary" strokeWidth={2} />
            {t("chatPage.members")}
          </h3>
          <div className="mt-2 space-y-1">
            {bids.map((b) => {
              const role: MemberRole = b.bidder === deal.startup ? "founder" : "member";
              return (
                <div key={b.publicKey} className="flex items-center justify-between text-xs">
                  <span className="font-mono-avs text-muted-foreground">{shortenAddress(b.bidder)}</span>
                  <span className="flex items-center gap-1 text-foreground">
                    {roleLabel(role, t)}
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
