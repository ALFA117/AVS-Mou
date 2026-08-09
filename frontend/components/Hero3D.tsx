"use client";

import { useMemo, useEffect, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Sparkles } from "@react-three/drei";
import { useReducedMotion } from "framer-motion";
import { MathUtils, type Group, type Mesh, type MeshStandardMaterial, type MeshPhysicalMaterial } from "three";

/**
 * Scroll- and pointer-reactive 3D centerpiece for the landing hero.
 *
 * Concept — "Sealed Network": a faceted glass core (the deal/vault) with
 * several small satellite nodes (individual sealed bids) orbiting it on
 * their own inclined, independent paths, each on a faint orbit ring.
 * Everything stays sharp-faceted / low-poly (no organic distort material)
 * on purpose — a first pass used a wobbling glossy sphere and it read as
 * amorphous rather than precise, which is the wrong feeling for a
 * "sealed, precise, trustless" fintech product.
 *
 * Interaction: the whole assembly leans toward the cursor, brightens and
 * spins faster on hover, and a click fires a "reveal" — every node
 * flashes bright at once, mirroring the product's actual reveal mechanic
 * (every sealed bid becomes visible simultaneously).
 *
 * Client-only: mounted via next/dynamic({ ssr: false }) from app/page.tsx
 * since WebGL has no server-side representation.
 */

type SatelliteConfig = {
  radius: number;
  speed: number;
  inclination: number;
  phase: number;
  size: number;
  color: string;
};

const SATELLITES: SatelliteConfig[] = [
  { radius: 1.95, speed: 0.42, inclination: 0.18, phase: 0, size: 0.16, color: "#3b82f6" },
  { radius: 2.35, speed: -0.31, inclination: -0.42, phase: 1.3, size: 0.12, color: "#10b981" },
  { radius: 2.7, speed: 0.24, inclination: 0.62, phase: 2.6, size: 0.14, color: "#10b981" },
  { radius: 2.15, speed: -0.46, inclination: -0.12, phase: 4.1, size: 0.1, color: "#3b82f6" },
  { radius: 2.9, speed: 0.19, inclination: 0.08, phase: 5.4, size: 0.17, color: "#3b82f6" },
  { radius: 2.5, speed: -0.27, inclination: -0.6, phase: 3.3, size: 0.11, color: "#10b981" },
];

type SharedState = {
  hovered: React.MutableRefObject<boolean>;
  pulse: React.MutableRefObject<number>;
  speedMul: React.MutableRefObject<number>;
};

function OrbitNode({ config, shared, reduceMotion }: { config: SatelliteConfig; shared: SharedState; reduceMotion: boolean }) {
  const orbitRef = useRef<Group>(null);
  const nodeRef = useRef<Mesh>(null);
  const t = useRef(config.phase);

  useFrame((_, delta) => {
    if (!reduceMotion) {
      t.current += delta * config.speed * shared.speedMul.current;
    }
    if (nodeRef.current) {
      nodeRef.current.position.x = Math.cos(t.current) * config.radius;
      nodeRef.current.position.z = Math.sin(t.current) * config.radius;
      nodeRef.current.rotation.y += reduceMotion ? 0 : delta * 0.8;
      nodeRef.current.rotation.x += reduceMotion ? 0 : delta * 0.5;

      const targetEmissive = shared.pulse.current > 0 ? 2.6 : shared.hovered.current ? 1.0 : 0.45;
      const mat = nodeRef.current.material as MeshStandardMaterial;
      mat.emissiveIntensity = MathUtils.lerp(mat.emissiveIntensity, targetEmissive, 0.15);
    }
  });

  return (
    <group ref={orbitRef} rotation={[config.inclination, 0, 0]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <torusGeometry args={[config.radius, 0.004, 8, 96]} />
        <meshBasicMaterial color={config.color} transparent opacity={0.18} />
      </mesh>
      <mesh ref={nodeRef}>
        <octahedronGeometry args={[config.size, 0]} />
        <meshStandardMaterial
          color={config.color}
          emissive={config.color}
          emissiveIntensity={0.45}
          roughness={0.25}
          metalness={0.4}
          flatShading
        />
      </mesh>
    </group>
  );
}

function SealedNetwork({ scrollRef }: { scrollRef: React.MutableRefObject<number> }) {
  const groupRef = useRef<Group>(null);
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
      const targetTiltY = reduceMotion ? 0 : state.pointer.x * 0.32;
      groupRef.current.rotation.x = MathUtils.lerp(groupRef.current.rotation.x, targetTiltX, 0.06);
      groupRef.current.rotation.y = MathUtils.lerp(groupRef.current.rotation.y + (reduceMotion ? 0 : delta * 0.06), targetTiltY, 0.06);
      groupRef.current.rotation.z = scrollSpin;

      if (pulse.current > 0) pulse.current = Math.max(0, pulse.current - delta * 1.6);
      const targetScale = (hovered.current ? 1.06 : 1) + Math.sin(pulse.current * Math.PI) * 0.1;
      scale.current = MathUtils.lerp(scale.current, targetScale, 0.15);
      groupRef.current.scale.setScalar(scale.current);
    }

    speedMul.current = MathUtils.lerp(speedMul.current, hovered.current ? 1.7 : 1, 0.08);

    if (coreRef.current) {
      if (!reduceMotion) {
        coreRef.current.rotation.y += delta * 0.18;
        coreRef.current.rotation.x += delta * 0.06;
      }
      const mat = coreRef.current.material as MeshPhysicalMaterial;
      const targetEmissive = pulse.current > 0 ? 1.4 : hovered.current ? 0.55 : 0.25;
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
      <pointLight color="#3b82f6" intensity={2.2} distance={4} decay={2} />

      <mesh ref={coreRef}>
        <icosahedronGeometry args={[1, 0]} />
        <meshPhysicalMaterial
          color="#1d4ed8"
          emissive="#3b82f6"
          emissiveIntensity={0.25}
          roughness={0.12}
          metalness={0.1}
          transmission={0.85}
          thickness={1.1}
          ior={1.4}
          clearcoat={1}
          clearcoatRoughness={0.1}
          flatShading
        />
      </mesh>

      {SATELLITES.map((config, i) => (
        <OrbitNode key={i} config={config} shared={shared} reduceMotion={reduceMotion} />
      ))}

      <Sparkles count={36} scale={5.5} size={1.6} speed={reduceMotion ? 0 : 0.25} color="#93c5fd" opacity={0.5} />
    </group>
  );
}

export function Hero3D() {
  const scrollRef = useRef(0);

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
      <Canvas camera={{ position: [0, 0.6, 5.6], fov: 42 }} dpr={[1, 1.5]} gl={{ antialias: true, alpha: true }}>
        <ambientLight intensity={0.55} />
        <directionalLight position={[3, 3, 4]} intensity={1.2} color="#93c5fd" />
        <directionalLight position={[-3, -2, -3]} intensity={0.45} color="#10b981" />
        <SealedNetwork scrollRef={scrollRef} />
      </Canvas>
    </div>
  );
}
