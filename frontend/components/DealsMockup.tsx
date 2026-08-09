import { formatBps, formatTokenAmount } from "@/lib/format";

/**
 * Illustrative example data for the landing-page preview only — styled
 * identically to the real DealCard so this reads as an honest product
 * screenshot, not a fabricated dashboard (see taste-skill guidance).
 */
const EXAMPLE_DEALS = [
  {
    startup: "9f2a…c71b",
    dealId: 41,
    status: "open" as const,
    equityBps: 800,
    minInvestment: 500_000_000,
    sealedBids: 14,
    closesIn: "2d 6h",
  },
  {
    startup: "3b7e…91af",
    dealId: 38,
    status: "revealed" as const,
    equityBps: 500,
    minInvestment: 1_000_000_000,
    totalRaised: 62_000_000_000,
  },
];

const STATUS_STYLES: Record<"open" | "revealed", string> = {
  open: "bg-green-100 text-green-800 dark:bg-green-500/15 dark:text-green-400",
  revealed: "bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-400",
};

export function DealsMockup() {
  return (
    <div className="avs-glow-primary mx-auto max-w-lg overflow-hidden rounded-2xl border border-border bg-card">
      <div className="flex items-center gap-1.5 border-b border-border bg-muted/50 px-4 py-2.5">
        <span className="h-2.5 w-2.5 rounded-full bg-red-400/70" />
        <span className="h-2.5 w-2.5 rounded-full bg-amber-400/70" />
        <span className="h-2.5 w-2.5 rounded-full bg-green-400/70" />
        <span className="ml-3 font-mono-avs text-xs text-muted-foreground">avs-mou.vercel.app/deals</span>
      </div>
      <div className="space-y-3 p-4">
        {EXAMPLE_DEALS.map((deal) => (
          <div key={deal.dealId} className="rounded-xl border border-border p-4">
            <div className="flex items-center justify-between">
              <span className="font-mono text-sm text-muted-foreground">{deal.startup}</span>
              <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[deal.status]}`}>
                {deal.status}
              </span>
            </div>
            <h3 className="mt-2 font-heading text-lg font-light tracking-tight text-card-foreground">
              Deal #{deal.dealId}
            </h3>
            <dl className="mt-3 grid grid-cols-2 gap-2 text-sm">
              <div>
                <dt className="text-muted-foreground">Equity offered</dt>
                <dd className="font-mono-avs font-medium text-card-foreground">{formatBps(deal.equityBps)}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Min investment</dt>
                <dd className="font-mono-avs font-medium text-card-foreground">
                  {formatTokenAmount(deal.minInvestment)}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Raised so far</dt>
                <dd className="font-mono-avs font-medium text-card-foreground">
                  {deal.status === "open" ? `${deal.sealedBids} sealed bids` : formatTokenAmount(deal.totalRaised!)}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">{deal.status === "open" ? "Closes in" : "Status"}</dt>
                <dd className="font-medium text-card-foreground">
                  {deal.status === "open" ? deal.closesIn : deal.status}
                </dd>
              </div>
            </dl>
          </div>
        ))}
      </div>
    </div>
  );
}
