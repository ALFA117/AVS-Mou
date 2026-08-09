import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { BidConfirmModal } from "@/components/BidConfirmModal";

describe("BidConfirmModal", () => {
  it("exposes dialog semantics for screen readers", () => {
    render(<BidConfirmModal amount="500" equityBps={800} onCancel={vi.fn()} onConfirm={vi.fn()} />);
    const dialog = screen.getByRole("dialog");
    expect(dialog.getAttribute("aria-modal")).toBe("true");
    expect(dialog.getAttribute("aria-labelledby")).toBeTruthy();
  });

  it("moves focus to the cancel button on mount", () => {
    render(<BidConfirmModal amount="500" equityBps={800} onCancel={vi.fn()} onConfirm={vi.fn()} />);
    expect(document.activeElement?.textContent).toBe("Cancel");
  });

  it("calls onCancel when Escape is pressed", () => {
    const onCancel = vi.fn();
    render(<BidConfirmModal amount="500" equityBps={800} onCancel={onCancel} onConfirm={vi.fn()} />);
    fireEvent.keyDown(document, { key: "Escape" });
    expect(onCancel).toHaveBeenCalledTimes(1);
  });
});
