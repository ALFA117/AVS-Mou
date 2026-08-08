import { describe, it, expect } from "vitest";
import { positionsToCsv } from "@/lib/csv";
import type { Position } from "@/lib/types";

describe("positionsToCsv", () => {
  it("emits a header row plus one row per position", () => {
    const positions: Position[] = [
      {
        dealPublicKey: "Deal1111111111111111111111111111111111111",
        dealTitle: "Deal #1",
        bidAmount: "1000000",
        equityAllocated: "5000000",
        entryDate: 0,
        status: "active",
      },
      {
        dealPublicKey: "Deal2222222222222222222222222222222222222",
        dealTitle: "Deal #2",
        bidAmount: "2000000",
        equityAllocated: "0",
        entryDate: 0,
        status: "voting",
      },
    ];

    const csv = positionsToCsv(positions);
    const lines = csv.split("\n");
    expect(lines[0]).toBe("deal,deal_id,bid_amount,equity_allocated,status");
    expect(lines).toHaveLength(3);
    expect(lines[1]).toContain("Deal #1");
    expect(lines[1]).toContain("active");
    expect(lines[2]).toContain("voting");
  });

  it("returns only the header row for an empty portfolio", () => {
    expect(positionsToCsv([]).split("\n")).toHaveLength(1);
  });
});
