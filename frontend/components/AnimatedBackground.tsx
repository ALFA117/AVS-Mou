"use client";

/**
 * Stripe-style "gradient mesh" backdrop — per the Stripe DESIGN.md reference
 * (VoltAgent/awesome-design-md): "a wide horizontal band of pastel cream,
 * sherbet orange, lavender, electric indigo, and ruby pink occupies the
 * upper third of nearly every marketing page... Do: apply the gradient
 * mesh to every marketing hero; bare-canvas heroes feel off-brand."
 *
 * Replaces the previous dark-fintech blob treatment entirely — this is a
 * light-canvas wash sitting behind the hero content, not a full-bleed dark
 * background. Motion is CSS-driven (`.avs-blob`, disabled under
 * `prefers-reduced-motion` in globals.css) so no JS branching is needed.
 */
export function AnimatedBackground() {
  return (
    <div
      className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[38rem] overflow-hidden dark:opacity-30"
      aria-hidden="true"
    >
      <div
        className="avs-blob absolute -left-20 top-[-8rem] h-[26rem] w-[26rem] rounded-full opacity-70 blur-3xl"
        style={{ background: "radial-gradient(circle, #f5e9d4, transparent 70%)" }}
      />
      <div
        className="avs-blob absolute left-[8%] top-[-4rem] h-[24rem] w-[24rem] rounded-full opacity-60 blur-3xl"
        style={{ background: "radial-gradient(circle, #f0b969, transparent 70%)", animationDelay: "-4s" }}
      />
      <div
        className="avs-blob absolute left-1/3 top-[-6rem] h-[28rem] w-[28rem] rounded-full opacity-70 blur-3xl"
        style={{ background: "radial-gradient(circle, #b9b9f9, transparent 70%)", animationDelay: "-9s" }}
      />
      <div
        className="avs-blob absolute right-[18%] top-[-8rem] h-[30rem] w-[30rem] rounded-full opacity-70 blur-3xl"
        style={{ background: "radial-gradient(circle, #533afd, transparent 70%)", animationDelay: "-14s" }}
      />
      <div
        className="avs-blob absolute -right-16 top-[-4rem] h-[24rem] w-[24rem] rounded-full opacity-50 blur-3xl"
        style={{ background: "radial-gradient(circle, #ea2261, transparent 70%)", animationDelay: "-6s" }}
      />
      {/* Soften the mesh into the white canvas below rather than cutting off hard */}
      <div
        className="absolute inset-x-0 bottom-0 h-40"
        style={{ background: "linear-gradient(to bottom, transparent, var(--background))" }}
      />
    </div>
  );
}
