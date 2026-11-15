import { ImageResponse } from "next/og";

// Site-wide share card (the old one was the 256px app icon). No data
// fetch, so it renders quickly for crawlers.
export const alt = "AVS — Anonymous Venture Syndicate: sealed-bid deal syndicates on Solana devnet";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
// Rendered per request instead of prerendered at build: @vercel/og's
// prerender step crashes on Windows paths (fileURLToPath) in local builds.
export const dynamic = "force-dynamic";

// Same "private placement memorandum" palette as the site: ivory paper,
// ink, hairline rules, one plum accent and brass only for what is sealed.
const PAPER = "#F8F6F1";
const INK = "#17141F";
const RULE = "#E2DDD3";
const MUTED = "#5E5868";
const PLUM = "#4A2C82";
const BRASS = "#86651F";

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
            <div style={{ fontSize: 34, fontWeight: 600, letterSpacing: -0.5 }}>AVS</div>
          </div>
          <div
            style={{
              display: "flex",
              fontSize: 18,
              padding: "6px 12px",
              borderRadius: 3,
              border: "1px solid #D9B45A",
              background: "#FBF3DF",
              color: "#6B4E12",
              letterSpacing: 2,
            }}
          >
            SOLANA DEVNET
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
          <div style={{ fontSize: 72, fontWeight: 400, letterSpacing: -2, lineHeight: 1.05 }}>
            Anonymous Venture Syndicate
          </div>
          <div style={{ display: "flex", flexDirection: "column", border: `1px solid ${RULE}`, background: "#FFFFFF" }}>
            <div style={{ display: "flex", alignItems: "center", padding: "16px 24px", borderBottom: `1px solid ${RULE}`, fontSize: 26 }}>
              <div style={{ display: "flex", width: 260, color: MUTED }}>Your bid</div>
              <div style={{ display: "flex", color: PLUM, fontWeight: 600 }}>readable only by you and the startup</div>
            </div>
            <div style={{ display: "flex", alignItems: "center", padding: "16px 24px", fontSize: 26 }}>
              <div style={{ display: "flex", width: 260, color: MUTED }}>Other bids</div>
              <div style={{ display: "flex", width: 220, height: 26, background: INK, borderRadius: 2 }} />
              <div style={{ display: "flex", marginLeft: 16, color: BRASS }}>sealed</div>
            </div>
          </div>
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
