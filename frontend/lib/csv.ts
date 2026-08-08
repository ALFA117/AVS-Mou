import type { Position } from "./types";

/** Task 069: CSV export of a portfolio's positions. */
export function positionsToCsv(positions: Position[]): string {
  const header = ["deal", "deal_id", "bid_amount", "equity_allocated", "status"];
  const rows = positions.map((p) =>
    [p.dealPublicKey, p.dealTitle, p.bidAmount, p.equityAllocated, p.status].join(","),
  );
  return [header.join(","), ...rows].join("\n");
}

export function downloadCsv(filename: string, csv: string): void {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
