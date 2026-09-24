import * as THREE from "three";
import { TessellateModifier } from "three/examples/jsm/modifiers/TessellateModifier.js";
import { PARTS, type PartId } from "@/lib/design";

function zoneOf(x: number, y: number, z: number): PartId {
  if (Math.abs(x) > 2.55) return x < 0 ? "leftCuff" : "rightCuff";
  if (Math.abs(x) > 1.45) return x < 0 ? "leftSleeve" : "rightSleeve";
  if (y > 6.45 && Math.abs(x) < 0.8) return "collar";
  return z >= 0 ? "front" : "back";
}

function planarUv(geometry: THREE.BufferGeometry) {
  geometry.computeBoundingBox();
  const box = geometry.boundingBox;
  const position = geometry.getAttribute("position");
  if (!box || !position) return;
  const size = new THREE.Vector3();
  box.getSize(size);
  const uv = new Float32Array(position.count * 2);
  for (let i = 0; i < position.count; i += 1) {
    uv[i * 2] = (position.getX(i) - box.min.x) / (size.x || 1);
    uv[i * 2 + 1] = (position.getY(i) - box.min.y) / (size.y || 1);
  }
  geometry.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
}

function smoothGeometry(geometry: THREE.BufferGeometry) {
  const position = geometry.getAttribute("position");
  const index = geometry.getIndex();
  if (!index) return geometry;
  const neighbors = Array.from({ length: position.count }, () => new Set<number>());
  for (let i = 0; i < index.count; i += 3) {
    const ids = [index.getX(i), index.getX(i + 1), index.getX(i + 2)];
    for (let edge = 0; edge < 3; edge += 1) {
      neighbors[ids[edge]].add(ids[(edge + 1) % 3]);
      neighbors[ids[(edge + 1) % 3]].add(ids[edge]);
    }
  }
  const next = new Float32Array(position.count * 3);
  for (let i = 0; i < position.count; i += 1) {
    const ring = neighbors[i];
    let x = 0;
    let y = 0;
    let z = 0;
    for (const neighbor of ring) {
      x += position.getX(neighbor);
      y += position.getY(neighbor);
      z += position.getZ(neighbor);
    }
    const weight = 0.35;
    const count = ring.size || 1;
    next[i * 3] = position.getX(i) * (1 - weight) + (x / count) * weight;
    next[i * 3 + 1] = position.getY(i) * (1 - weight) + (y / count) * weight;
    next[i * 3 + 2] = position.getZ(i) * (1 - weight) + (z / count) * weight;
  }
  geometry.setAttribute("position", new THREE.BufferAttribute(next, 3));
  return geometry;
}

export function splitPolo(root: THREE.Object3D) {
  const mesh = root.getObjectByProperty("type", "Mesh") as THREE.Mesh | undefined;
  if (!mesh) throw new Error("Polo mesh missing");
  const modifier = new TessellateModifier(0.22, 2);
  const source = smoothGeometry(modifier.modify(mesh.geometry));
  const position = source.getAttribute("position");
  const index = source.getIndex();
  const buckets = Object.fromEntries(PARTS.map((part) => [part.id, [] as number[]])) as Record<PartId, number[]>;
  const triangles = index ? index.count / 3 : position.count / 3;

  for (let triangle = 0; triangle < triangles; triangle += 1) {
    const ids = [0, 1, 2].map((offset) => (index ? index.getX(triangle * 3 + offset) : triangle * 3 + offset));
    const points = ids.map((id) => new THREE.Vector3(position.getX(id), position.getY(id), position.getZ(id)));
    const center = points[0].clone().add(points[1]).add(points[2]).multiplyScalar(1 / 3);
    const zone = zoneOf(center.x, center.y, center.z);
    for (const point of points) buckets[zone].push(point.x, point.y, point.z);
  }

  const geometries = {} as Record<PartId, THREE.BufferGeometry>;
  for (const part of PARTS) {
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.Float32BufferAttribute(buckets[part.id], 3));
    geometry.computeVertexNormals();
    planarUv(geometry);
    geometries[part.id] = geometry;
  }

  const box = new THREE.Box3();
  for (const geometry of Object.values(geometries)) box.expandByObject(new THREE.Mesh(geometry));
  const size = new THREE.Vector3();
  const center = new THREE.Vector3();
  box.getSize(size);
  box.getCenter(center);
  const scale = 2.25 / size.y;
  for (const geometry of Object.values(geometries)) {
    geometry.translate(-center.x, -center.y, -center.z);
    geometry.scale(scale, scale, scale);
  }

  return geometries;
}
