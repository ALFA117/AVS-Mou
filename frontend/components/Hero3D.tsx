"use client";

import { useEffect, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Float, MeshDistortMaterial, Sphere } from "@react-three/drei";
import { useReducedMotion } from "framer-motion";
import type { Mesh } from "three";

/**
 * Scroll-reactive 3D centerpiece for the landing hero — sealed-vault motif
 * (a slowly warping glass sphere with an orbiting wireframe ring, evoking
 * "sealed until reveal") rendered with react-three-fiber. Client-only:
 * mounted via next/dynamic({ ssr: false }) from app/page.tsx since WebGL
 * has no server-side representation.
 */

function SealedCore({ scrollRef }: { scrollRef: React.MutableRefObject<number> }) {
  const coreRef = useRef<Mesh>(null);
  const ringRef = useRef<Mesh>(null);
  const reduceMotion = useReducedMotion();

  useFrame((_, delta) => {
    const scrollSpin = scrollRef.current * 0.0006;
    if (coreRef.current) {
      if (!reduceMotion) {
        coreRef.current.rotation.y += delta * 0.22;
        coreRef.current.rotation.x += delta * 0.07;
      }
      coreRef.current.rotation.z = scrollSpin;
    }
    if (ringRef.current) {
      if (!reduceMotion) {
        ringRef.current.rotation.z -= delta * 0.35;
      }
      ringRef.current.rotation.x = 1.15 + scrollSpin * 1.5;
    }
  });

  return (
    <group>
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
    return () => window.removeEventListener("scroll", onScroll);
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
