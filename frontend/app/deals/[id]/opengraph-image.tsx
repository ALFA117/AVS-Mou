import { ImageResponse } from "next/og";
import { Connection, PublicKey, clusterApiUrl } from "@solana/web3.js";
import { sealedAuctionProgram } from "@/lib/programs";
import { mapDeal } from "@/lib/mappers";
import { formatBps, formatTokenAmount } from "@/lib/format";

// Node.js runtime, not Edge — this reuses the same Anchor/web3.js program
// helpers the rest of the app already runs server-side (lib/faucetServer.ts,
// lib/relayServer.ts), which are only proven to work under Node.
export const runtime = "nodejs";
export const alt = "AVS deal card";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const PAPER = "#F8F6F1";
const INK = "#17141F";
const RULE = "#E2DDD3";
const MUTED = "#5E5868";
const PLUM = "#4A2C82";

const RPC_URL = process.env.NEXT_PUBLIC_SOLANA_RPC_URL || clusterApiUrl("devnet");

const READONLY_WALLET = {
  publicKey: PublicKey.default,
  signTransaction: async () => {
    throw new Error("read-only");
  },
  signAllTransactions: async () => {
    throw new Error("read-only");
  },
};

async function fetchDealSummary(id: string) {
  const connection = new Connection(RPC_URL, "confirmed");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const program = sealedAuctionProgram(connection, READONLY_WALLET as any);
  const pk = new PublicKey(id);
  const account = await program.account.deal.fetch(pk);
  return mapDeal(pk, account as unknown as Record<string, unknown>);
}

export default async function Image({ params }: { params: { id: string } }) {
  // Social crawlers time out fast (X gives ~5s) — never let a slow or dead
  // RPC block the image response, fall back to a generic branded card.
  const deal = await Promise.race([
    fetchDealSummary(params.id).catch(() => null),
    new Promise<null>((resolve) => setTimeout(() => resolve(null), 3500)),
  ]);

  const statusLabel = !deal
    ? ""
    : deal.status === "open" && deal.deadlineTs * 1000 < Date.now()
      ? "Awaiting reveal"
      : deal.status === "open"
        ? "Open for bids"
        : deal.status === "revealed"
          ? "Revealed"
          : "Settled";

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: 64,
          background: PAPER,
          fontFamily: "sans-serif",
          color: INK,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            paddingBottom: 24,
            borderBottom: `2px solid ${INK}`,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <div style={{ width: 44, height: 44, borderRadius: 6, background: PLUM, display: "flex" }} />
            <div style={{ fontSize: 32, fontWeight: 600 }}>AVS</div>
          </div>
          <div style={{ display: "flex", fontSize: 20, color: MUTED, letterSpacing: 2 }}>SOLANA DEVNET</div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
          <div style={{ fontSize: 68, fontWeight: 400, letterSpacing: -1.5 }}>
            {deal ? `Deal #${deal.dealId}` : "Anonymous Venture Syndicate"}
          </div>
          {deal ? (
            <div style={{ display: "flex", border: `1px solid ${RULE}`, background: "#FFFFFF" }}>
              {[
                ["Valuation", formatTokenAmount(deal.valuation), INK],
                ["Equity offered", formatBps(deal.equityBps), INK],
                ["Status", statusLabel, PLUM],
              ].map(([label, value, color], i) => (
                <div
                  key={label}
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    flex: 1,
                    padding: "20px 24px",
                    borderLeft: i === 0 ? "none" : `1px solid ${RULE}`,
                  }}
                >
                  <div style={{ fontSize: 20, color: MUTED }}>{label}</div>
                  <div style={{ fontSize: 34, color, fontWeight: 500, marginTop: 6 }}>{value}</div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ fontSize: 28, color: MUTED }}>
              Sealed-bid deal syndicates on Solana. Bid or vote in secret.
            </div>
          )}
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 22, color: MUTED }}>
          <div style={{ display: "flex" }}>Sealed bids and private votes on MagicBlock Ephemeral Rollups</div>
          <div style={{ display: "flex" }}>avs-mou.vercel.app</div>
        </div>
      </div>
    ),
    { ...size },
  );
}
