"use client";

import { useEffect, useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Float, MeshDistortMaterial, Sphere } from "@react-three/drei";
import { useReducedMotion } from "framer-motion";
import { MathUtils, type Group, type Mesh, type MeshStandardMaterial } from "three";

/**
 * Scroll- and pointer-reactive 3D centerpiece for the landing hero —
 * sealed-vault motif (a slowly warping glass sphere with an orbiting
 * wireframe ring, evoking "sealed until reveal") rendered with
 * react-three-fiber. Client-only: mounted via next/dynamic({ ssr: false })
 * from app/page.tsx since WebGL has no server-side representation.
 *
 * Interaction: the whole shape leans toward the cursor (parallax tilt),
 * brightens and scales up slightly on hover, and clicking triggers a
 * quick "reveal" pulse (brief scale/glow bounce) — a nod to the product's
 * own sealed -> reveal mechanic, not just decoration for its own sake.
 */
function SealedCore({ scrollRef }: { scrollRef: React.MutableRefObject<number> }) {
  const groupRef = useRef<Group>(null);
  const coreRef = useRef<Mesh>(null);
  const ringRef = useRef<Mesh>(null);
  const reduceMotion = useReducedMotion();
  const [hovered, setHovered] = useState(false);

  // Refs, not state, for anything driven every frame — avoids a re-render
  // per frame while still letting hover/click retarget the lerp smoothly.
  const pulse = useRef(0);
  const scale = useRef(1);
  const emissive = useRef(0.6);

  useFrame((state, delta) => {
    const scrollSpin = scrollRef.current * 0.0006;

    if (groupRef.current) {
      const targetTiltX = reduceMotion ? 0 : state.pointer.y * 0.25;
      const targetTiltY = reduceMotion ? 0 : state.pointer.x * 0.35;
      groupRef.current.rotation.x = MathUtils.lerp(groupRef.current.rotation.x, targetTiltX, 0.06);
      groupRef.current.rotation.y = MathUtils.lerp(groupRef.current.rotation.y, targetTiltY, 0.06);

      if (pulse.current > 0) pulse.current = Math.max(0, pulse.current - delta * 1.8);
      const targetScale = (hovered ? 1.08 : 1) + Math.sin(pulse.current * Math.PI) * 0.15;
      scale.current = MathUtils.lerp(scale.current, targetScale, 0.15);
      groupRef.current.scale.setScalar(scale.current);
    }

    if (coreRef.current) {
      if (!reduceMotion) {
        coreRef.current.rotation.y += delta * (hovered ? 0.34 : 0.22);
        coreRef.current.rotation.x += delta * 0.07;
      }
      coreRef.current.rotation.z = scrollSpin;
    }

    if (ringRef.current) {
      if (!reduceMotion) {
        ringRef.current.rotation.z -= delta * (hovered ? 0.7 : 0.35);
      }
      ringRef.current.rotation.x = 1.15 + scrollSpin * 1.5;

      const targetEmissive = pulse.current > 0 ? 2.2 : hovered ? 1.1 : 0.6;
      emissive.current = MathUtils.lerp(emissive.current, targetEmissive, 0.12);
      (ringRef.current.material as MeshStandardMaterial).emissiveIntensity = emissive.current;
    }
  });

  return (
    <group
      ref={groupRef}
      onPointerOver={(e) => {
        e.stopPropagation();
        setHovered(true);
        document.body.style.cursor = "pointer";
      }}
      onPointerOut={(e) => {
        e.stopPropagation();
        setHovered(false);
        document.body.style.cursor = "auto";
      }}
      onClick={(e) => {
        e.stopPropagation();
        pulse.current = 1;
      }}
    >
      <Float
        speed={reduceMotion ? 0 : 1.4}
        rotationIntensity={reduceMotion ? 0 : 0.35}
        floatIntensity={reduceMotion ? 0 : 0.7}
      >
        <Sphere ref={coreRef} args={[1.15, 64, 64]}>
          <MeshDistortMaterial
            color="#3b82f6"
            roughness={0.15}
            metalness={0.3}
            distort={0.28}
            speed={reduceMotion ? 0 : 1.6}
          />
        </Sphere>
        <mesh ref={ringRef} rotation={[1.15, 0, 0]}>
          <torusGeometry args={[1.65, 0.02, 16, 100]} />
          <meshStandardMaterial color="#10b981" emissive="#10b981" emissiveIntensity={0.6} roughness={0.3} />
        </mesh>
      </Float>
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
    <div className="mx-auto h-56 w-full max-w-sm sm:h-72 md:h-80" aria-hidden="true">
      <Canvas camera={{ position: [0, 0, 4.4], fov: 42 }} dpr={[1, 1.5]} gl={{ antialias: true, alpha: true }}>
        <ambientLight intensity={0.7} />
        <directionalLight position={[3, 3, 4]} intensity={1.3} color="#93c5fd" />
        <directionalLight position={[-3, -2, -3]} intensity={0.5} color="#10b981" />
        <SealedCore scrollRef={scrollRef} />
      </Canvas>
    </div>
  );
}
