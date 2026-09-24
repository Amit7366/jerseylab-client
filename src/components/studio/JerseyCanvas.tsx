"use client";

import { ContactShadows, Environment, OrbitControls } from "@react-three/drei";
import { Canvas, useFrame, useLoader, useThree } from "@react-three/fiber";
import { Suspense, useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { OBJLoader } from "three/examples/jsm/loaders/OBJLoader.js";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import { PARTS, type AngleId, type DesignConfig, type PartId } from "@/lib/design";
import { paintZoneTexture, TEXTURE_SIZE } from "@/lib/paintJersey";
import { splitPolo } from "./poloParts";

const ANGLE_POSITION: Record<AngleId, [number, number, number]> = {
  front: [0, 0.02, 4.15],
  back: [0, 0.02, -4.15],
  left: [-4.15, 0.12, 0.12],
  right: [4.15, 0.12, 0.12],
  "three-quarter": [2.3, 0.7, 3.3],
};

function useZoneTexture(configKey: string, paint: (canvas: HTMLCanvasElement) => void) {
  const texture = useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = TEXTURE_SIZE;
    canvas.height = TEXTURE_SIZE;
    paint(canvas);
    const next = new THREE.CanvasTexture(canvas);
    next.colorSpace = THREE.SRGBColorSpace;
    next.anisotropy = 8;
    next.needsUpdate = true;
    return next;
  }, [configKey, paint]);

  useEffect(() => () => texture.dispose(), [texture]);
  return texture;
}

function PartMesh({
  part,
  geometry,
  config,
  selected,
  onSelect,
}: {
  part: PartId;
  geometry: THREE.BufferGeometry;
  config: DesignConfig;
  selected: boolean;
  onSelect: (part: PartId) => void;
}) {
  const zone = config[part];
  const key = `${zone.color}|${zone.stripeColor}|${zone.pattern}|${JSON.stringify(config.logos)}|${JSON.stringify(config.lettering)}|${part}`;
  const paint = useMemo(() => {
    return (canvas: HTMLCanvasElement) => paintZoneTexture(canvas, zone, config, part);
  }, [zone, part, config]);
  const texture = useZoneTexture(key, paint);

  return (
    <mesh
      geometry={geometry}
      castShadow
      receiveShadow
      onClick={(event) => {
        event.stopPropagation();
        onSelect(part);
      }}
    >
      <meshPhysicalMaterial
        map={texture}
        roughness={0.72}
        metalness={0.04}
        sheen={0.65}
        sheenRoughness={0.35}
        sheenColor="#ffffff"
        emissive={selected ? "#ffffff" : "#000000"}
        emissiveIntensity={selected ? 0.18 : 0}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}

function JerseyModel({
  config,
  selected,
  onSelect,
}: {
  config: DesignConfig;
  selected: PartId;
  onSelect: (part: PartId) => void;
}) {
  const polo = useLoader(OBJLoader, "/models/polo.obj");
  const parts = useMemo(() => splitPolo(polo), [polo]);

  return (
    <group>
      {PARTS.map((part) => (
        <PartMesh
          key={part.id}
          part={part.id}
          geometry={parts[part.id]}
          config={config}
          selected={selected === part.id}
          onSelect={onSelect}
        />
      ))}
    </group>
  );
}

function CameraRig({ angle }: { angle: AngleId }) {
  const camera = useThree((state) => state.camera);
  const controls = useThree((state) => state.controls) as OrbitControlsImpl | null;
  const anim = useRef({ active: false, from: new THREE.Vector3(), to: new THREE.Vector3(), t: 1 });
  const first = useRef(true);

  useEffect(() => {
    if (first.current) {
      first.current = false;
      camera.position.set(...ANGLE_POSITION[angle]);
      return;
    }
    anim.current.from.copy(camera.position);
    anim.current.to.set(...ANGLE_POSITION[angle]);
    anim.current.t = 0;
    anim.current.active = true;
  }, [angle, camera]);

  useFrame((_, delta) => {
    if (!anim.current.active) return;
    anim.current.t = Math.min(1, anim.current.t + delta * 1.8);
    const eased = 1 - (1 - anim.current.t) ** 3;
    camera.position.lerpVectors(anim.current.from, anim.current.to, eased);
    controls?.target.set(0, 0.05, 0);
    controls?.update();
    if (anim.current.t >= 1) anim.current.active = false;
  });

  return null;
}

function PngCapture({ onReady }: { onReady: (download: (filename: string) => void) => void }) {
  const gl = useThree((state) => state.gl);
  const scene = useThree((state) => state.scene);
  const camera = useThree((state) => state.camera);

  useEffect(() => {
    onReady((filename) => {
      const previous = gl.getPixelRatio();
      const width = gl.domElement.clientWidth;
      const height = gl.domElement.clientHeight;
      gl.setPixelRatio(2);
      gl.setSize(width, height, false);
      gl.render(scene, camera);
      const href = gl.domElement.toDataURL("image/png");
      gl.setPixelRatio(previous);
      gl.setSize(width, height, false);
      const link = document.createElement("a");
      link.href = href;
      link.download = filename;
      link.click();
    });
  }, [camera, gl, onReady, scene]);

  return null;
}

export function JerseyCanvas({
  config,
  angle,
  selected,
  onSelect,
  onDownloadReady,
}: {
  config: DesignConfig;
  angle: AngleId;
  selected: PartId;
  onSelect: (part: PartId) => void;
  onDownloadReady: (download: (filename: string) => void) => void;
}) {
  return (
    <Canvas
      camera={{ position: ANGLE_POSITION.front, fov: 34 }}
      shadows
      dpr={[1, 2]}
      gl={{
        preserveDrawingBuffer: true,
        antialias: true,
        toneMapping: THREE.ACESFilmicToneMapping,
        toneMappingExposure: 1.05,
      }}
    >
      <color attach="background" args={["#09090b"]} />
      <ambientLight intensity={0.45} />
      <spotLight position={[4, 6, 5]} intensity={90} angle={0.45} penumbra={0.7} castShadow />
      <directionalLight position={[-4, 3, -2]} intensity={1.4} />
      <Suspense fallback={null}>
        <Environment preset="studio" />
      </Suspense>
      <Suspense fallback={null}>
        <JerseyModel config={config} selected={selected} onSelect={onSelect} />
      </Suspense>
      <ContactShadows position={[0, -1.25, 0]} opacity={0.45} scale={7} blur={2.4} far={3} />
      <CameraRig angle={angle} />
      <PngCapture onReady={onDownloadReady} />
      <OrbitControls
        makeDefault
        enablePan={false}
        minDistance={2.6}
        maxDistance={7.5}
        minPolarAngle={0.45}
        maxPolarAngle={Math.PI / 1.65}
        target={[0, 0.05, 0]}
      />
    </Canvas>
  );
}
