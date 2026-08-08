"use client";

import type { Choice } from "@/lib/types";

export function VoteConfirmModal({
  choice,
  onCancel,
  onConfirm,
}: {
  choice: Choice;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-sm rounded-lg bg-white p-6 shadow-lg">
        <h3 className="text-lg font-semibold">Confirm your vote</h3>
        <p className="mt-3 text-sm">
          You&apos;re voting <span className="font-semibold uppercase">{choice}</span>.
        </p>
        <p className="mt-2 text-xs text-neutral-500">
          Your vote is sealed — no one, including the startup, can see how you voted until
          reveal.
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
            Confirm Vote
          </button>
        </div>
      </div>
    </div>
  );
}
