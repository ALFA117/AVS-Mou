import Link from "next/link";
import { Countdown } from "@/components/Countdown";
import { formatBps, formatTokenAmount, shortenAddress } from "@/lib/format";
import type { Deal } from "@/lib/types";

const STATUS_STYLES: Record<Deal["status"], string> = {
  open: "bg-green-100 text-green-800",
  revealed: "bg-amber-100 text-amber-800",
  settled: "bg-neutral-200 text-neutral-700",
};

export function DealCard({ deal }: { deal: Deal }) {
  return (
    <Link
      href={`/deals/${deal.publicKey}`}
      className="block rounded-lg border border-neutral-200 p-5 transition hover:border-neutral-400 hover:shadow-sm"
    >
      <div className="flex items-center justify-between">
        <span className="font-mono text-sm text-neutral-500">
          {shortenAddress(deal.startup)}
        </span>
        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[deal.status]}`}>
          {deal.status}
        </span>
      </div>
      <h3 className="mt-2 text-lg font-semibold">Deal #{deal.dealId}</h3>
      <dl className="mt-3 grid grid-cols-2 gap-2 text-sm">
        <div>
          <dt className="text-neutral-500">Equity offered</dt>
          <dd className="font-medium">{formatBps(deal.equityBps)}</dd>
        </div>
        <div>
          <dt className="text-neutral-500">Min investment</dt>
          <dd className="font-medium">{formatTokenAmount(deal.minInvestment)}</dd>
        </div>
        <div>
          <dt className="text-neutral-500">Raised so far</dt>
          <dd className="font-medium">
            {deal.status === "open" ? `${deal.bidCount} sealed bids` : formatTokenAmount(deal.totalRaised)}
          </dd>
        </div>
        <div>
          <dt className="text-neutral-500">{deal.status === "open" ? "Closes in" : "Status"}</dt>
          <dd className="font-medium">
            {deal.status === "open" ? <Countdown deadlineTs={deal.deadlineTs} /> : deal.status}
          </dd>
        </div>
      </dl>
    </Link>
  );
}
