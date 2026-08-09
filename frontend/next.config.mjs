/** @type {import('next').NextConfig} */
const nextConfig = {
  async headers() {
    return [
      {
        // Deliberately no Content-Security-Policy here — wallet extensions
        // (Phantom/Solflare/MetaMask) inject their own connect popups and
        // scripts, and a hand-rolled CSP risks silently breaking wallet
        // signing without a lot more testing than a devnet demo warrants.
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
    ];
  },
};

export default nextConfig;
