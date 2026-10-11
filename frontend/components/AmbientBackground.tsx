"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";
import { motion, useReducedMotion, useScroll, useTransform } from "framer-motion";

/**
 * Fondo ambiental de toda la app (receta 6 de /diseno: malla low-poly con Three.js),
 * adaptado a AVS como una "bóveda sellada": un icosaedro de alambre que encierra
 * un núcleo (tu puja), rodeado por una nube de partículas (las pujas de los demás,
 * que no ves). La bóveda respira y gira lento; el puntero mueve la cámara.
 *
 * Capas: aurora lejana (CSS, la misma paleta "gradient mesh" de la marca) y la
 * escena WebGL. Completa en la landing; tranquila (menos partículas, menos
 * opacidad) en las pantallas de trabajo. Three.js se carga aparte con
 * `ssr: false`, así que nunca retrasa el primer render.
 */
const VaultScene = dynamic(() => import("./VaultScene"), { ssr: false });

export function AmbientBackground() {
  const pathname = usePathname();
  const full = pathname === "/";
  const reduce = useReducedMotion() ?? false;
  const [ready, setReady] = useState(false);

  // WebGL después de que el navegador quede libre: el contenido pinta primero.
  useEffect(() => {
    if ("requestIdleCallback" in window) {
      const id = window.requestIdleCallback(() => setReady(true), { timeout: 1500 });
      return () => window.cancelIdleCallback(id);
    }
    const id = setTimeout(() => setReady(true), 400);
    return () => clearTimeout(id);
  }, []);

  const { scrollYProgress } = useScroll();
  const auroraY = useTransform(scrollYProgress, (v) => v * -120);
  const sceneY = useTransform(scrollYProgress, (v) => v * -60);

  return (
    <div aria-hidden="true" className={`amb-root ${full ? "amb-full" : "amb-calm"}`}>
      <motion.div className="amb-aurora" style={{ y: reduce ? 0 : auroraY }}>
        <span className="amb-blob amb-blob-1" />
        <span className="amb-blob amb-blob-2" />
        <span className="amb-blob amb-blob-3" />
      </motion.div>
      <motion.div className="amb-scene" style={{ y: reduce ? 0 : sceneY }}>
        {ready && <VaultScene full={full} reduce={reduce} />}
      </motion.div>
      <div className="amb-vignette" />
    </div>
  );
}
