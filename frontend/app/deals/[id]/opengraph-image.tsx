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
          background: "linear-gradient(135deg, #f4f2ff 0%, #ffffff 55%, #fef1f6 100%)",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 28,
              background: "#533afd",
              display: "flex",
            }}
          />
          <div style={{ fontSize: 32, fontWeight: 600, color: "#0f0a2e" }}>AVS</div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div style={{ fontSize: 64, fontWeight: 300, color: "#0f0a2e", letterSpacing: -1 }}>
            {deal ? `Deal #${deal.dealId}` : "Anonymous Venture Syndicate"}
          </div>
          {deal ? (
            <div style={{ display: "flex", gap: 40 }}>
              <div style={{ display: "flex", flexDirection: "column" }}>
                <div style={{ fontSize: 20, color: "#6b6480" }}>Valuation</div>
                <div style={{ fontSize: 32, color: "#0f0a2e", fontWeight: 500 }}>
                  {formatTokenAmount(deal.valuation)}
                </div>
              </div>
              <div style={{ display: "flex", flexDirection: "column" }}>
                <div style={{ fontSize: 20, color: "#6b6480" }}>Equity offered</div>
                <div style={{ fontSize: 32, color: "#0f0a2e", fontWeight: 500 }}>
                  {formatBps(deal.equityBps)}
                </div>
              </div>
              <div style={{ display: "flex", flexDirection: "column" }}>
                <div style={{ fontSize: 20, color: "#6b6480" }}>Status</div>
                <div style={{ fontSize: 32, color: "#533afd", fontWeight: 500, textTransform: "capitalize" }}>
                  {deal.status}
                </div>
              </div>
            </div>
          ) : (
            <div style={{ fontSize: 28, color: "#6b6480" }}>
              Sealed-bid deal syndicates on Solana — bid or vote in secret.
            </div>
          )}
        </div>

        <div style={{ fontSize: 22, color: "#6b6480" }}>avs-mou.vercel.app</div>
      </div>
    ),
    { ...size },
  );
}
