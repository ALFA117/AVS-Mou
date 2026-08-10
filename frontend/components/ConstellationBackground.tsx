"use client";

import { useEffect, useRef } from "react";
import { useReducedMotion } from "framer-motion";

/**
 * Ambient particle-network backdrop — plain Canvas 2D (no three.js in this
 * project's dependency tree, see package.json), devicePixelRatio-aware, with
 * an IntersectionObserver pause so the rAF loop goes idle once scrolled out
 * of view. Color follows the app's actual theme tokens, not a fixed value:
 * dark mode's --background is a deep indigo (#1c1e54) — see globals.css —
 * so particles render white there for contrast; light mode's white
 * background gets brand-purple particles instead. A MutationObserver on
 * <html>'s class (lib/theme.ts toggles "light"/"dark" there) keeps this in
 * sync with the theme toggle without a remount.
 */
export function ConstellationBackground({ className }: { className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    const DPR = Math.min(window.devicePixelRatio || 1, 2);
    const LINK_DISTANCE = 140;
    const SPEED = 0.12;
    const DENSITY = 0.00007; // particles per css px^2
    const MAX_PARTICLES = 110;

    let width = 0;
    let height = 0;
    let particles: { x: number; y: number; vx: number; vy: number; r: number }[] = [];
    let isDark = document.documentElement.classList.contains("dark");
    let visible = true;
    let frame = 0;

    function particleColor(alpha: number) {
      return isDark ? `rgba(255,255,255,${alpha})` : `rgba(83,58,253,${alpha})`;
    }

    function seed() {
      const count = Math.min(MAX_PARTICLES, Math.max(24, Math.round(width * height * DENSITY)));
      particles = Array.from({ length: count }, () => ({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * SPEED,
        vy: (Math.random() - 0.5) * SPEED,
        r: Math.random() * 1.4 + 0.7,
      }));
    }

    function resize() {
      const rect = canvas!.getBoundingClientRect();
      width = rect.width;
      height = rect.height;
      canvas!.width = Math.max(1, Math.round(width * DPR));
      canvas!.height = Math.max(1, Math.round(height * DPR));
      ctx!.setTransform(DPR, 0, 0, DPR, 0, 0);
      seed();
    }

    function draw() {
      ctx!.clearRect(0, 0, width, height);

      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const a = particles[i];
          const b = particles[j];
          const dx = a.x - b.x;
          const dy = a.y - b.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < LINK_DISTANCE) {
            ctx!.strokeStyle = particleColor((1 - dist / LINK_DISTANCE) * 0.32);
            ctx!.lineWidth = 1;
            ctx!.beginPath();
            ctx!.moveTo(a.x, a.y);
            ctx!.lineTo(b.x, b.y);
            ctx!.stroke();
          }
        }
      }

      for (const p of particles) {
        ctx!.beginPath();
        ctx!.fillStyle = particleColor(0.85);
        ctx!.shadowColor = particleColor(0.55);
        ctx!.shadowBlur = 5;
        ctx!.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx!.fill();
      }
      ctx!.shadowBlur = 0;
    }

    function tick() {
      frame = requestAnimationFrame(tick);
      if (!visible) return;
      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x <= 0 || p.x >= width) p.vx *= -1;
        if (p.y <= 0 || p.y >= height) p.vy *= -1;
      }
      draw();
    }

    resize();
    draw();

    const resizeObserver = new ResizeObserver(() => {
      resize();
      draw();
    });
    resizeObserver.observe(canvas);

    const themeObserver = new MutationObserver(() => {
      isDark = document.documentElement.classList.contains("dark");
      draw();
    });
    themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });

    let intersectionObserver: IntersectionObserver | null = null;
    if (!reduceMotion) {
      intersectionObserver = new IntersectionObserver(([entry]) => {
        visible = entry.isIntersecting;
      });
      intersectionObserver.observe(canvas);
      frame = requestAnimationFrame(tick);
    }

    return () => {
      if (frame) cancelAnimationFrame(frame);
      resizeObserver.disconnect();
      themeObserver.disconnect();
      intersectionObserver?.disconnect();
    };
  }, [reduceMotion]);

  return (
    <canvas
      ref={canvasRef}
      className={`pointer-events-none absolute inset-0 h-full w-full ${className ?? ""}`}
      aria-hidden="true"
    />
  );
}
