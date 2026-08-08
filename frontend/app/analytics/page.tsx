"use client";

import { useMemo } from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, LineChart, Line, XAxis, YAxis } from "recharts";
import { useWallet } from "@solana/wallet-adapter-react";
import { usePortfolio } from "@/hooks/usePortfolio";
import { formatTokenAmount } from "@/lib/format";

const COLORS = ["#111827", "#4b5563", "#9ca3af", "#d1d5db", "#e5e7eb", "#f3f4f6"];

export default function AnalyticsPage() {
  const { publicKey } = useWallet();
  const { positions, loading } = usePortfolio();

  const allocation = useMemo(
    () => positions.map((p) => ({ name: p.dealTitle, value: Number(p.bidAmount) })),
    [positions],
  );

  const cumulative = useMemo(() => {
    let running = 0;
    return positions.map((p, i) => {
      running += Number(p.bidAmount);
      return { name: `#${i + 1}`, invested: running / 10 ** 6 };
    });
  }, [positions]);

  const avgBid = positions.length
    ? positions.reduce((s, p) => s + Number(p.bidAmount), 0) / positions.length
    : 0;
  const settledCount = positions.filter((p) => p.status === "liquidated").length;

  return (
    <main className="mx-auto max-w-4xl px-6 py-10">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Analytics</h1>
      </div>

      {!publicKey ? (
        <p className="mt-10 text-center text-neutral-500">Connect your wallet to see your stats.</p>
      ) : loading ? (
        <p className="mt-10 text-center text-neutral-500">Loading…</p>
      ) : positions.length === 0 ? (
        <p className="mt-10 text-center text-neutral-500">No positions yet.</p>
      ) : (
        <>
          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Stat label="Avg bid amount" value={formatTokenAmount(avgBid)} />
            <Stat label="Deals settled" value={String(settledCount)} />
            <Stat label="Total positions" value={String(positions.length)} />
          </div>

          <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2">
            <div className="rounded-lg border border-neutral-200 p-4">
              <h3 className="text-sm font-medium text-neutral-700">Allocation breakdown</h3>
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={allocation} dataKey="value" nameKey="name" outerRadius={80}>
                      {allocation.map((_, i) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v) => formatTokenAmount(Number(v ?? 0))} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="rounded-lg border border-neutral-200 p-4">
              <h3 className="text-sm font-medium text-neutral-700">Cumulative investment</h3>
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={cumulative}>
                    <XAxis dataKey="name" fontSize={12} />
                    <YAxis fontSize={12} />
                    <Tooltip />
                    <Line type="monotone" dataKey="invested" stroke="#111827" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </>
      )}
    </main>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-neutral-200 p-4">
      <p className="text-xs text-neutral-500">{label}</p>
      <p className="mt-1 text-xl font-semibold">{value}</p>
    </div>
  );
}
