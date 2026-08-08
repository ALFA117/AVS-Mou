"use client";

import { formatBps } from "@/lib/format";

export function BidConfirmModal({
  amount,
  equityBps,
  onCancel,
  onConfirm,
}: {
  amount: string;
  equityBps: number;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-sm rounded-lg bg-white p-6 shadow-lg">
        <h3 className="text-lg font-semibold">Confirm sealed bid</h3>
        <dl className="mt-4 space-y-2 text-sm">
          <div className="flex justify-between">
            <dt className="text-neutral-500">Amount</dt>
            <dd className="font-medium">{amount}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-neutral-500">Equity offered (round)</dt>
            <dd className="font-medium">{formatBps(equityBps)}</dd>
          </div>
        </dl>
        <p className="mt-4 text-xs text-neutral-500">
          Your bid is sealed — no one, including the startup, can see this amount until the
          deal reveals after its deadline.
        </p>
        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-md border border-neutral-300 px-4 py-2 text-sm font-medium hover:bg-neutral-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="rounded-md bg-black px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800"
          >
            Confirm Bid
          </button>
        </div>
      </div>
    </div>
  );
}
