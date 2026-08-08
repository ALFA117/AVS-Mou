"use client";

import { RefreshCw, Server, Link2 } from "lucide-react";
import { useSystemStatus, type ServiceStatus } from "@/hooks/useSystemStatus";

const PROGRAM_IDS: { name: string; id: string }[] = [
  { name: "sealed-auction", id: "Bycx3bB2yrFMYWSvi2Yjxutrt1QoVuYyzn37T6ys9YYo" },
  { name: "private-voting", id: "ErRYzAmuTFGHQSzZ7A38zX2rmwosGxDYTvPtPCSPq4Qs" },
  { name: "spl-token-manager", id: "fNkSCkp2szKMND8ouKwfxNpGqhAsnCdQ4PTzsxnDKa3" },
];

const STATUS_DOT: Record<ServiceStatus, string> = {
  checking: "bg-amber-400",
  up: "bg-green-500",
  down: "bg-red-500",
};

const STATUS_LABEL: Record<ServiceStatus, string> = {
  checking: "Checking…",
  up: "Operational",
  down: "Unreachable",
};

export default function StatusPage() {
  const { status, refresh, erEndpoint } = useSystemStatus();

  return (
    <main className="mx-auto max-w-2xl px-6 py-10">
      <div className="flex items-center justify-between">
        <h1 className="font-heading text-2xl font-bold text-foreground">System Status</h1>
        <button
          onClick={() => void refresh()}
          className="flex cursor-pointer items-center gap-1.5 text-sm text-muted-foreground transition hover:text-foreground"
        >
          <RefreshCw className="h-3.5 w-3.5" strokeWidth={2} />
          Refresh
        </button>
      </div>

      <div className="mt-6 space-y-3">
        <StatusRow
          label="Solana Devnet (base layer)"
          status={status.solana}
          detail={status.solanaSlot ? `Slot ${status.solanaSlot.toLocaleString()}` : undefined}
        />
        <StatusRow
          label="MagicBlock Ephemeral Rollup (devnet, hosted)"
          status={status.magicblockEr}
          detail={erEndpoint}
        />
      </div>

      <p className="mt-3 text-xs text-muted-foreground">
        The ER check may show a false &quot;Unreachable&quot; if the endpoint&apos;s CORS policy
        blocks browser requests — it&apos;s a best-effort client-side ping, not a guarantee.
      </p>

      <section className="mt-8">
        <h2 className="flex items-center gap-1.5 text-sm font-medium text-foreground">
          <Server className="h-3.5 w-3.5 text-primary" strokeWidth={2} />
          Deployed programs
        </h2>
        <div className="mt-2 space-y-1">
          {PROGRAM_IDS.map((p) => (
            <div key={p.id} className="flex items-center justify-between text-sm">
              <span className="text-foreground">{p.name}</span>
              <a
                href={`https://explorer.solana.com/address/${p.id}?cluster=devnet`}
                target="_blank"
                rel="noreferrer"
                className="font-mono-avs text-xs text-primary underline"
              >
                {p.id}
              </a>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-8">
        <h2 className="flex items-center gap-1.5 text-sm font-medium text-foreground">
          <Link2 className="h-3.5 w-3.5 text-primary" strokeWidth={2} />
          Links
        </h2>
        <ul className="mt-2 space-y-1 text-sm">
          <li>
            <a href="https://status.solana.com" target="_blank" rel="noreferrer" className="text-primary underline">
              Solana network status
            </a>
          </li>
          <li>
            <a href="https://docs.magicblock.gg" target="_blank" rel="noreferrer" className="text-primary underline">
              MagicBlock docs
            </a>
          </li>
        </ul>
      </section>
    </main>
  );
}

function StatusRow({
  label,
  status,
  detail,
}: {
  label: string;
  status: ServiceStatus;
  detail?: string;
}) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-border bg-card p-4">
      <div>
        <p className="font-medium text-card-foreground">{label}</p>
        {detail && <p className="font-mono-avs text-xs text-muted-foreground">{detail}</p>}
      </div>
      <span className="flex items-center gap-2 text-sm text-foreground">
        <span className={`h-2 w-2 rounded-full ${STATUS_DOT[status]}`} />
        {STATUS_LABEL[status]}
      </span>
    </div>
  );
}
