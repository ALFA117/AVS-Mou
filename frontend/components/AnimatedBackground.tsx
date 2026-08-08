"use client";

/**
 * Ambient hero background — ui-ux-pro-max "Modern Dark (Cinema)" style
 * (see memory/feedback_ui_ux_pro_max_skill.md): softly oscillating blurred
 * gradient blobs behind hero content, not a literal 3D scene (no WebGL
 * dependency, keeps bundle/perf light per the skill's Performance
 * guidelines — `image-optimization`/`main-thread-budget`). Motion is
 * CSS-driven (`.avs-blob` in globals.css) and fully disabled under
 * `prefers-reduced-motion` there, so no JS branching is needed here.
 */
export function AnimatedBackground() {
  return (
    <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden" aria-hidden="true">
      <div
        className="avs-blob absolute -left-24 -top-24 h-[28rem] w-[28rem] rounded-full opacity-20 blur-3xl"
        style={{ background: "radial-gradient(circle, var(--primary), transparent 70%)" }}
      />
      <div
        className="avs-blob absolute -bottom-32 -right-16 h-[32rem] w-[32rem] rounded-full opacity-20 blur-3xl"
        style={{ background: "radial-gradient(circle, var(--accent), transparent 70%)", animationDelay: "-6s" }}
      />
      <div
        className="avs-blob absolute left-1/3 top-1/2 h-[20rem] w-[20rem] -translate-y-1/2 rounded-full opacity-10 blur-3xl"
        style={{ background: "radial-gradient(circle, var(--primary), transparent 70%)", animationDelay: "-12s" }}
      />
      {/* Faint grid — precision/fintech cue from the style guide, kept subtle */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage:
            "linear-gradient(var(--foreground) 1px, transparent 1px), linear-gradient(90deg, var(--foreground) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
        }}
      />
    </div>
  );
}
