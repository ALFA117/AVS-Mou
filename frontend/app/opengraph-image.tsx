import { ImageResponse } from "next/og";

// Site-wide share card (the old one was the 256px app icon). No data
// fetch, so it renders quickly for crawlers.
export const alt = "AVS — Anonymous Venture Syndicate: sealed-bid deal syndicates on Solana devnet";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
// Rendered per request instead of prerendered at build: @vercel/og's
// prerender step crashes on Windows paths (fileURLToPath) in local builds.
export const dynamic = "force-dynamic";

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: 72,
          background: "linear-gradient(135deg, #0f0a2e 0%, #1c1457 55%, #533afd 130%)",
          fontFamily: "sans-serif",
          color: "#ffffff",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          <div style={{ width: 52, height: 52, borderRadius: 26, background: "#665efd", display: "flex" }} />
          <div style={{ fontSize: 34, fontWeight: 600 }}>AVS</div>
          <div
            style={{
              marginLeft: 12,
              display: "flex",
              fontSize: 20,
              padding: "6px 14px",
              borderRadius: 999,
              background: "rgba(251, 191, 36, 0.18)",
              color: "#fcd34d",
              textTransform: "uppercase",
              letterSpacing: 2,
            }}
          >
            Solana devnet
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
          <div style={{ fontSize: 76, fontWeight: 300, letterSpacing: -2, lineHeight: 1.05 }}>
            Anonymous Venture Syndicate
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 16, fontSize: 30, color: "#c9c3ff" }}>
            <div style={{ display: "flex" }}>Your bid:</div>
            <div style={{ display: "flex", width: 210, height: 34, borderRadius: 6, background: "#8b84ff" }} />
            <div style={{ display: "flex" }}>· sealed until the reveal</div>
          </div>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 24, color: "#a9a3d9" }}>
          <div style={{ display: "flex" }}>Sealed bids & private votes on MagicBlock Ephemeral Rollups</div>
          <div style={{ display: "flex" }}>avs-mou.vercel.app</div>
        </div>
      </div>
    ),
    { ...size },
  );
}
