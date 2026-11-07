"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";

function cssColor(name: string, fallback: string) {
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return new THREE.Color(v || fallback);
}

/**
 * La escena WebGL de AmbientBackground. Vanilla three dentro de un efecto:
 * icosaedro exterior (la bóveda), icosaedro interior más chico que gira al
 * revés (el núcleo sellado) y una nube de partículas en cáscara esférica.
 * Pausa con la pestaña oculta, DPR ≤ 2, un solo cuadro con movimiento reducido
 * y libera geometrías y materiales al desmontar.
 */
export default function VaultScene({ full, reduce }: { full: boolean; reduce: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const mobile = window.matchMedia("(max-width: 767px)").matches;
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: !mobile });
    } catch {
      return; // sin WebGL: queda la aurora CSS, que ya es un fondo completo
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
    camera.position.set(0, 0, 8);

    const primary = cssColor("--primary", "#533afd");
    const accent = cssColor("--accent", "#0f9d58");
    const isDark = () =>
      document.documentElement.classList.contains("dark") ||
      (!document.documentElement.classList.contains("light") && window.matchMedia("(prefers-color-scheme: dark)").matches);
    // En claro y en celular la bóveda se atenúa: no debe competir con el título.
    const strengthFor = () => (full ? 1 : 0.5) * (isDark() ? 1 : 0.55) * (mobile ? 0.6 : 1);
    const strength = strengthFor();

    const shellGeo = new THREE.IcosahedronGeometry(1.5, mobile ? 1 : 2);
    const shellMat = new THREE.MeshBasicMaterial({ color: primary, wireframe: true, transparent: true, opacity: 0.32 * strength });
    const shell = new THREE.Mesh(shellGeo, shellMat);

    const coreGeo = new THREE.IcosahedronGeometry(0.6, 0);
    const coreMat = new THREE.MeshBasicMaterial({ color: accent, wireframe: true, transparent: true, opacity: 0.7 * strength });
    const core = new THREE.Mesh(coreGeo, coreMat);

    const count = Math.round((full ? 1300 : 600) * (mobile ? 0.5 : 1));
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      // Cáscara entre radio 2.4 y 4.4: las pujas de los demás, fuera de la bóveda.
      const r = 2 + Math.random() * 1.8;
      const th = Math.random() * Math.PI * 2;
      const ph = Math.acos(2 * Math.random() - 1);
      pos[i * 3] = r * Math.sin(ph) * Math.cos(th);
      pos[i * 3 + 1] = r * Math.sin(ph) * Math.sin(th);
      pos[i * 3 + 2] = r * Math.cos(ph);
    }
    const ptsGeo = new THREE.BufferGeometry();
    ptsGeo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    const ptsMat = new THREE.PointsMaterial({ color: primary, size: mobile ? 0.035 : 0.028, transparent: true, opacity: 0.65 * strength, depthWrite: false });
    const points = new THREE.Points(ptsGeo, ptsMat);

    const group = new THREE.Group();
    group.add(shell, core, points);
    scene.add(group);

    const resize = () => {
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      // En escritorio la bóveda vive a la derecha del contenido; en celular, arriba y más chica.
      group.position.set(mobile ? 1.1 : w > 1100 ? 3.6 : 2.6, mobile ? 2.5 : 0.4, 0);
      group.scale.setScalar(mobile ? 0.6 : 1);
      camera.updateProjectionMatrix();
    };
    resize();
    window.addEventListener("resize", resize);

    // Colores al día con el tema (la clase .dark cambia los tokens).
    const recolor = () => {
      const p = cssColor("--primary", "#533afd");
      shellMat.color.copy(p);
      ptsMat.color.copy(p);
      coreMat.color.copy(cssColor("--accent", "#0f9d58"));
      const k = strengthFor();
      shellMat.opacity = 0.32 * k;
      coreMat.opacity = 0.7 * k;
      ptsMat.opacity = 0.65 * k;
      if (reduce) renderer.render(scene, camera);
    };
    const obs = new MutationObserver(recolor);
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });

    let px = 0;
    let py = 0;
    const onMove = (e: PointerEvent) => {
      px = (e.clientX / window.innerWidth - 0.5) * 2;
      py = (e.clientY / window.innerHeight - 0.5) * 2;
    };
    const fine = window.matchMedia("(pointer: fine)").matches;
    if (fine && !reduce) window.addEventListener("pointermove", onMove, { passive: true });

    let raf = 0;
    const clock = new THREE.Clock();
    const frame = () => {
      const t = clock.getElapsedTime();
      shell.rotation.y += 0.0015;
      shell.rotation.x = py * 0.25 + Math.sin(t * 0.2) * 0.1;
      core.rotation.y -= 0.004;
      core.rotation.z += 0.002;
      points.rotation.y += 0.0006;
      const breathe = 1 + Math.sin(t * 0.8) * 0.03;
      shell.scale.setScalar(breathe);
      core.scale.setScalar(1 + Math.sin(t * 1.6) * 0.06);
      camera.position.x += (px * 0.4 - camera.position.x) * 0.04;
      camera.lookAt(0, 0, 0);
      renderer.render(scene, camera);
      raf = requestAnimationFrame(frame);
    };
    const onVis = () => {
      cancelAnimationFrame(raf);
      if (!document.hidden && !reduce) raf = requestAnimationFrame(frame);
    };

    if (reduce) renderer.render(scene, camera);
    else {
      raf = requestAnimationFrame(frame);
      document.addEventListener("visibilitychange", onVis);
    }

    return () => {
      cancelAnimationFrame(raf);
      obs.disconnect();
      window.removeEventListener("resize", resize);
      window.removeEventListener("pointermove", onMove);
      document.removeEventListener("visibilitychange", onVis);
      shellGeo.dispose();
      shellMat.dispose();
      coreGeo.dispose();
      coreMat.dispose();
      ptsGeo.dispose();
      ptsMat.dispose();
      renderer.dispose();
    };
  }, [full, reduce]);

  return <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />;
}
