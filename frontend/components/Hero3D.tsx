"use client";

import { useMemo, useEffect, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Sparkles, Trail } from "@react-three/drei";
import { EffectComposer, Bloom, Vignette } from "@react-three/postprocessing";
import { useReducedMotion } from "framer-motion";
import { MathUtils, type Group, type Mesh, type MeshPhysicalMaterial, type MeshStandardMaterial } from "three";

/**
 * Scroll- and pointer-reactive 3D centerpiece for the landing hero.
 *
 * Concept — "Data Core": a wireframe geodesic lattice around a glowing
 * glass core (the sealed deal), with small light-trailed nodes (sealed
 * bids) orbiting on independent inclined paths. Two earlier passes —
 * a wobbling distort-material sphere, then flat-shaded platonic solids —
 * both read as either amorphous or as generic 3D-tutorial primitives.
 * What actually reads as premium here: real glass transmission on the
 * core, motion trails on the nodes (implies data/energy flow rather than
 * static shapes), and bloom post-processing so the emissive parts glow
 * instead of just being a bright flat color.
 *
 * Interaction: the whole assembly leans toward the cursor, brightens and
 * spins faster on hover, and a click fires a "reveal" — every node and
 * the core flash at once, mirroring the product's actual reveal mechanic
 * (every sealed bid becomes visible simultaneously).
 *
 * Client-only: mounted via next/dynamic({ ssr: false }) from app/page.tsx
 * since WebGL has no server-side representation.
 */

type NodeConfig = {
  radius: number;
  speed: number;
  inclination: number;
  phase: number;
  size: number;
  color: string;
};

const NODES: NodeConfig[] = [
  { radius: 2.1, speed: 0.42, inclination: 0.18, phase: 0, size: 0.075, color: "#60a5fa" },
  { radius: 2.5, speed: -0.31, inclination: -0.42, phase: 1.3, size: 0.06, color: "#34d399" },
  { radius: 2.85, speed: 0.24, inclination: 0.62, phase: 2.6, size: 0.065, color: "#34d399" },
  { radius: 2.3, speed: -0.46, inclination: -0.12, phase: 4.1, size: 0.05, color: "#60a5fa" },
];

type SharedState = {
  hovered: React.MutableRefObject<boolean>;
  pulse: React.MutableRefObject<number>;
  speedMul: React.MutableRefObject<number>;
};

function OrbitNode({ config, shared, reduceMotion }: { config: NodeConfig; shared: SharedState; reduceMotion: boolean }) {
  const nodeRef = useRef<Mesh>(null);
  const t = useRef(config.phase);

  useFrame((_, delta) => {
    if (!reduceMotion) t.current += delta * config.speed * shared.speedMul.current;
    if (nodeRef.current) {
      const cosI = Math.cos(config.inclination);
      const sinI = Math.sin(config.inclination);
      const x = Math.cos(t.current) * config.radius;
      const z0 = Math.sin(t.current) * config.radius;
      nodeRef.current.position.set(x, z0 * sinI, z0 * cosI);

      const targetEmissive = shared.pulse.current > 0 ? 3.2 : shared.hovered.current ? 1.3 : 0.6;
      const mat = nodeRef.current.material as MeshStandardMaterial;
      mat.emissiveIntensity = MathUtils.lerp(mat.emissiveIntensity, targetEmissive, 0.15);
    }
  });

  return (
    <Trail width={2.2} length={reduceMotion ? 0 : 5} color={config.color} attenuation={(w) => w * w} decay={1}>
      <mesh ref={nodeRef}>
        <sphereGeometry args={[config.size, 16, 16]} />
        <meshStandardMaterial color={config.color} emissive={config.color} emissiveIntensity={0.6} roughness={0.3} toneMapped={false} />
      </mesh>
    </Trail>
  );
}

function DataCore({ scrollRef }: { scrollRef: React.MutableRefObject<number> }) {
  const groupRef = useRef<Group>(null);
  const latticeRef = useRef<Mesh>(null);
  const coreRef = useRef<Mesh>(null);
  const reduceMotion = useReducedMotion() ?? false;

  const hovered = useRef(false);
  const pulse = useRef(0);
  const speedMul = useRef(1);
  const scale = useRef(1);
  const shared = useMemo<SharedState>(() => ({ hovered, pulse, speedMul }), []);

  useFrame((state, delta) => {
    const scrollSpin = scrollRef.current * 0.0007;

    if (groupRef.current) {
      const targetTiltX = reduceMotion ? 0 : state.pointer.y * 0.22;
      const targetTiltY = (reduceMotion ? 0 : state.pointer.x * 0.32) + (reduceMotion ? 0 : state.clock.elapsedTime * 0.05);
      groupRef.current.rotation.x = MathUtils.lerp(groupRef.current.rotation.x, targetTiltX, 0.06);
      groupRef.current.rotation.y = MathUtils.lerp(groupRef.current.rotation.y, targetTiltY, 0.04);
      groupRef.current.rotation.z = scrollSpin;

      if (pulse.current > 0) pulse.current = Math.max(0, pulse.current - delta * 1.5);
      const targetScale = (hovered.current ? 1.06 : 1) + Math.sin(pulse.current * Math.PI) * 0.08;
      scale.current = MathUtils.lerp(scale.current, targetScale, 0.15);
      groupRef.current.scale.setScalar(scale.current);
    }

    speedMul.current = MathUtils.lerp(speedMul.current, hovered.current ? 1.8 : 1, 0.08);

    if (latticeRef.current && !reduceMotion) {
      latticeRef.current.rotation.y += delta * 0.09;
      latticeRef.current.rotation.x += delta * 0.035;
    }

    if (coreRef.current) {
      if (!reduceMotion) coreRef.current.rotation.y -= delta * 0.14;
      const mat = coreRef.current.material as MeshPhysicalMaterial;
      const targetEmissive = pulse.current > 0 ? 2.2 : hovered.current ? 0.85 : 0.4;
      mat.emissiveIntensity = MathUtils.lerp(mat.emissiveIntensity, targetEmissive, 0.12);
    }
  });

  return (
    <group
      ref={groupRef}
      onPointerOver={(e) => {
        e.stopPropagation();
        hovered.current = true;
        document.body.style.cursor = "pointer";
      }}
      onPointerOut={(e) => {
        e.stopPropagation();
        hovered.current = false;
        document.body.style.cursor = "auto";
      }}
      onClick={(e) => {
        e.stopPropagation();
        pulse.current = 1;
      }}
    >
      <pointLight color="#3b82f6" intensity={3} distance={5} decay={2} />

      <mesh ref={latticeRef}>
        <icosahedronGeometry args={[1.55, 2]} />
        <meshBasicMaterial color="#3b82f6" wireframe transparent opacity={0.3} />
      </mesh>

      <mesh ref={coreRef}>
        <icosahedronGeometry args={[0.82, 3]} />
        <meshPhysicalMaterial
          color="#1e3a8a"
          emissive="#3b82f6"
          emissiveIntensity={0.4}
          roughness={0.05}
          metalness={0}
          transmission={0.92}
          thickness={1.4}
          ior={1.45}
          clearcoat={1}
          clearcoatRoughness={0.08}
        />
      </mesh>

      {NODES.map((config, i) => (
        <OrbitNode key={i} config={config} shared={shared} reduceMotion={reduceMotion} />
      ))}

      <Sparkles count={50} scale={6} size={1.4} speed={reduceMotion ? 0 : 0.2} color="#93c5fd" opacity={0.45} />
    </group>
  );
}

export function Hero3D() {
  const scrollRef = useRef(0);
  const reduceMotion = useReducedMotion() ?? false;

  useEffect(() => {
    const onScroll = () => {
      scrollRef.current = window.scrollY;
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      document.body.style.cursor = "auto";
    };
  }, []);

  return (
    <div className="mx-auto h-64 w-full max-w-md sm:h-80 md:h-96" aria-hidden="true">
      <Canvas camera={{ position: [0, 0.6, 6], fov: 40 }} dpr={[1, 1.5]} gl={{ antialias: true, alpha: true }}>
        <ambientLight intensity={0.5} />
        <directionalLight position={[3, 3, 4]} intensity={1.1} color="#93c5fd" />
        <directionalLight position={[-3, -2, -3]} intensity={0.4} color="#10b981" />
        <DataCore scrollRef={scrollRef} />
        {!reduceMotion && (
          <EffectComposer>
            <Bloom intensity={0.9} luminanceThreshold={0.15} luminanceSmoothing={0.4} mipmapBlur radius={0.6} />
            <Vignette eskil={false} offset={0.15} darkness={0.6} />
          </EffectComposer>
        )}
      </Canvas>
    </div>
  );
}
