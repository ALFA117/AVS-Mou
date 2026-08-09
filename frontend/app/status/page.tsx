"use client";

import { RefreshCw, Server, Link2, Droplet } from "lucide-react";
import { useConnection } from "@solana/wallet-adapter-react";
import { useSystemStatus, type ServiceStatus } from "@/hooks/useSystemStatus";
import { useTranslation } from "@/lib/LanguageContext";

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

export default function StatusPage() {
  const { status, refresh, erEndpoint } = useSystemStatus();
  const { connection } = useConnection();
  const { t } = useTranslation();

  const STATUS_LABEL: Record<ServiceStatus, string> = {
    checking: t("status.checking"),
    up: t("status.operational"),
    down: t("status.unreachable"),
  };

  return (
    <main className="mx-auto max-w-2xl px-6 py-10">
      <div className="flex items-center justify-between">
        <h1 className="font-heading text-2xl font-light tracking-tight text-foreground">{t("status.title")}</h1>
        <button
          onClick={() => void refresh()}
          className="flex cursor-pointer items-center gap-1.5 text-sm text-muted-foreground transition-colors duration-200 hover:text-foreground"
        >
          <RefreshCw className="h-3.5 w-3.5" strokeWidth={2} />
          {t("status.refresh")}
        </button>
      </div>

      <div className="mt-6 space-y-3">
        <StatusRow
          label={t("status.solanaLabel")}
          status={status.solana}
          statusLabel={STATUS_LABEL}
          detail={
            status.solanaSlot
              ? `${t("status.slot", { slot: status.solanaSlot.toLocaleString() })} · ${connection.rpcEndpoint}`
              : connection.rpcEndpoint
          }
        />
        <StatusRow
          label={t("status.magicblockLabel")}
          status={status.magicblockEr}
          statusLabel={STATUS_LABEL}
          detail={erEndpoint}
        />
      </div>

      <p className="mt-3 text-xs text-muted-foreground">{t("status.corsNote")}</p>

      <section className="mt-8">
        <h2 className="flex items-center gap-1.5 text-sm font-medium text-foreground">
          <Server className="h-3.5 w-3.5 text-primary" strokeWidth={2} />
          {t("status.deployedPrograms")}
        </h2>
        <div className="mt-2 space-y-1">
          {PROGRAM_IDS.map((p) => (
            <div key={p.id} className="flex flex-col gap-0.5 text-sm sm:flex-row sm:items-center sm:justify-between">
              <span className="text-foreground">{p.name}</span>
              <a
                href={`https://explorer.solana.com/address/${p.id}?cluster=devnet`}
                target="_blank"
                rel="noreferrer"
                className="break-all font-mono-avs text-xs text-primary underline"
              >
                {p.id}
              </a>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-8">
        <h2 className="flex items-center gap-1.5 text-sm font-medium text-foreground">
          <Droplet className="h-3.5 w-3.5 text-primary" strokeWidth={2} />
          {t("status.faucetTitle")}
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">{t("status.faucetNote")}</p>
        <a
          href="https://faucet.solana.com/"
          target="_blank"
          rel="noreferrer"
          className="mt-2 inline-block text-sm text-primary underline"
        >
          {t("status.faucetLink")}
        </a>
      </section>

      <section className="mt-8">
        <h2 className="flex items-center gap-1.5 text-sm font-medium text-foreground">
          <Link2 className="h-3.5 w-3.5 text-primary" strokeWidth={2} />
          {t("status.links")}
        </h2>
        <ul className="mt-2 space-y-1 text-sm">
          <li>
            <a
              href="https://explorer.solana.com/?cluster=devnet"
              target="_blank"
              rel="noreferrer"
              className="text-primary underline"
            >
              {t("status.explorerLink")}
            </a>
          </li>
          <li>
            <a href="https://status.solana.com" target="_blank" rel="noreferrer" className="text-primary underline">
              {t("status.solanaStatusLink")}
            </a>
          </li>
          <li>
            <a href="https://docs.magicblock.gg" target="_blank" rel="noreferrer" className="text-primary underline">
              {t("status.magicblockDocsLink")}
            </a>
          </li>
          <li>
            <a
              href="https://github.com/ALFA117/AVS-Mou"
              target="_blank"
              rel="noreferrer"
              className="text-primary underline"
            >
              {t("status.githubLink")}
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
  statusLabel,
  detail,
}: {
  label: string;
  status: ServiceStatus;
  statusLabel: Record<ServiceStatus, string>;
  detail?: string;
}) {
  return (
    <div className="flex items-center justify-between avs-elevate rounded-xl border border-border bg-card p-4">
      <div>
        <p className="font-medium text-card-foreground">{label}</p>
        {detail && <p className="font-mono-avs text-xs text-muted-foreground">{detail}</p>}
      </div>
      <span className="flex items-center gap-2 text-sm text-foreground">
        <span className={`h-2 w-2 rounded-full ${STATUS_DOT[status]}`} />
        {statusLabel[status]}
      </span>
    </div>
  );
}
