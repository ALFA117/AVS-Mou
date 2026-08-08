import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import AboutPage from "@/app/about/page";
import FaqPage from "@/app/faq/page";
import LegalPage from "@/app/legal/page";

describe("static pages (Task 085)", () => {
  it("/about renders the privacy explainer and links out to FAQ/Legal", () => {
    render(<AboutPage />);
    expect(screen.getByText("About AVS")).toBeTruthy();
    expect(screen.getByText("Why privacy matters")).toBeTruthy();
    expect(screen.getByRole("link", { name: "FAQ" })).toBeTruthy();
    expect(screen.getByRole("link", { name: "Terms & Privacy" })).toBeTruthy();
  });

  it("/faq renders every question", () => {
    render(<FaqPage />);
    expect(screen.getByText("Is my bid really private?")).toBeTruthy();
    expect(screen.getByText("Do I need SOL in my wallet to bid or vote?")).toBeTruthy();
  });

  it("/legal renders the disclaimer, terms, and privacy sections", () => {
    render(<LegalPage />);
    expect(screen.getByText("Disclaimer")).toBeTruthy();
    expect(screen.getByText("Terms of Service")).toBeTruthy();
    expect(screen.getByText("Privacy Policy")).toBeTruthy();
  });
});
