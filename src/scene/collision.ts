import {
  APARTMENT_BOUNDS,
  ApartmentLayoutConfig,
  ColliderBox,
  FURNITURE_COLLIDERS,
  PLAYER_RADIUS,
  WALL_SEGMENTS,
} from './apartmentData';
import { LANDSCAPE_POV_BOUNDS } from './masterplanData';

interface Segment2D {
  x1: number;
  z1: number;
  x2: number;
  z2: number;
  halfThick: number;
}

export interface CollisionContext {
  bounds: { minX: number; maxX: number; minZ: number; maxZ: number };
  hasCurvedTopLeft: boolean;
  walls: Segment2D[];
  colliders: ColliderBox[];
}

export function buildCollisionContext(layout: ApartmentLayoutConfig): CollisionContext {
  return {
    bounds: layout.bounds,
    hasCurvedTopLeft: layout.hasCurvedTopLeft,
    walls: layout.walls
      .filter((w) => w.collidable)
      .map((w) => ({
        x1: w.x1,
        z1: w.z1,
        x2: w.x2,
        z2: w.z2,
        halfThick: Math.max(0.04, w.thickness * 0.5),
      })),
    colliders: layout.colliders,
  };
}

const DEFAULT_CONTEXT: CollisionContext = {
  bounds: APARTMENT_BOUNDS,
  hasCurvedTopLeft: true,
  walls: WALL_SEGMENTS.filter((w) => w.collidable).map((w) => ({
    x1: w.x1,
    z1: w.z1,
    x2: w.x2,
    z2: w.z2,
    halfThick: Math.max(0.04, w.thickness * 0.5),
  })),
  colliders: FURNITURE_COLLIDERS,
};

// Push circle (px, pz, r) out of segment (x1, z1)-(x2, z2) with thickness
function resolveSegment(
  pos: { x: number; z: number },
  r: number,
  seg: Segment2D
) {
  const vx = seg.x2 - seg.x1;
  const vz = seg.z2 - seg.z1;
  const lenSq = vx * vx + vz * vz;
  if (lenSq < 1e-6) return;

  const wx = pos.x - seg.x1;
  const wz = pos.z - seg.z1;
  const t = Math.max(0, Math.min(1, (wx * vx + wz * vz) / lenSq));
  const cx = seg.x1 + t * vx;
  const cz = seg.z1 + t * vz;

  const dx = pos.x - cx;
  const dz = pos.z - cz;
  const distSq = dx * dx + dz * dz;
  const minDist = r + seg.halfThick;

  if (distSq < minDist * minDist) {
    const dist = Math.sqrt(distSq);
    if (dist > 1e-5) {
      const push = minDist - dist;
      pos.x += (dx / dist) * push;
      pos.z += (dz / dist) * push;
    } else {
      pos.z += minDist;
    }
  }
}

// Push circle out of AABB box
function resolveBox(
  pos: { x: number; z: number },
  r: number,
  box: { minX: number; maxX: number; minZ: number; maxZ: number }
) {
  const closestX = Math.max(box.minX, Math.min(pos.x, box.maxX));
  const closestZ = Math.max(box.minZ, Math.min(pos.z, box.maxZ));

  const dx = pos.x - closestX;
  const dz = pos.z - closestZ;
  const distSq = dx * dx + dz * dz;

  if (distSq < r * r) {
    const dist = Math.sqrt(distSq);
    if (dist > 1e-5) {
      const push = r - dist;
      pos.x += (dx / dist) * push;
      pos.z += (dz / dist) * push;
    } else {
      const leftPen = Math.abs(pos.x - box.minX);
      const rightPen = Math.abs(box.maxX - pos.x);
      const topPen = Math.abs(pos.z - box.minZ);
      const botPen = Math.abs(box.maxZ - pos.z);
      const m = Math.min(leftPen, rightPen, topPen, botPen);
      if (m === leftPen) pos.x = box.minX - r;
      else if (m === rightPen) pos.x = box.maxX + r;
      else if (m === topPen) pos.z = box.minZ - r;
      else pos.z = box.maxZ + r;
    }
  }
}

export function resolvePlayerCollision(
  pos: { x: number; z: number },
  ctx: CollisionContext = DEFAULT_CONTEXT
) {
  const r = PLAYER_RADIUS;

  for (let pass = 0; pass < 3; pass++) {
    if (pos.x < ctx.bounds.minX + r) pos.x = ctx.bounds.minX + r;
    if (pos.x > ctx.bounds.maxX - r) pos.x = ctx.bounds.maxX - r;
    if (pos.z < ctx.bounds.minZ + r) pos.z = ctx.bounds.minZ + r;
    if (pos.z > ctx.bounds.maxZ - r) pos.z = ctx.bounds.maxZ - r;

    if (ctx.hasCurvedTopLeft && pos.x < -4.05 && pos.z < -1.5) {
      const ex = (pos.x + 4.05) / (2.1 - r);
      const ez = (pos.z + 1.5) / (2.26 - r);
      const eDist = Math.hypot(ex, ez);
      if (eDist > 1.0) {
        pos.x = -4.05 + (ex / eDist) * (2.1 - r);
        pos.z = -1.5 + (ez / eDist) * (2.26 - r);
      }
    }

    for (let i = 0; i < ctx.walls.length; i++) {
      resolveSegment(pos, r, ctx.walls[i]);
    }

    for (let i = 0; i < ctx.colliders.length; i++) {
      resolveBox(pos, r, ctx.colliders[i]);
    }
  }
}

// Masterplan ground-level obstacle collision (keeps pedestrian out of tower cores, pool basin & courts)
const LANDSCAPE_OBSTACLES: ColliderBox[] = [
  { minX: 9.5, maxX: 23.0, minZ: -11.0, maxZ: 9.5 },  // Tower B coastal stepped wing
  { minX: 2.5, maxX: 19.0, minZ: 2.5, maxZ: 14.0 },   // Tower B inward 34F wing facing Tower A
  { minX: -21.5, maxX: -8.5, minZ: -12.5, maxZ: 3.5 },// Tower A footprint (SE / Right from ocean)
  { minX: -5.5, maxX: 6.2, minZ: -12.8, maxZ: 2.2 },  // Lagoon swimming pool between Towers A & B
  { minX: 24.0, maxX: 34.5, minZ: -13.5, maxZ: -0.5 },// Pickleball courts fence (left of Tower B)
];

export function resolveLandscapeCollision(pos: { x: number; z: number }) {
  const r = 0.55;
  for (let pass = 0; pass < 2; pass++) {
    if (pos.x < LANDSCAPE_POV_BOUNDS.minX) pos.x = LANDSCAPE_POV_BOUNDS.minX;
    if (pos.x > LANDSCAPE_POV_BOUNDS.maxX) pos.x = LANDSCAPE_POV_BOUNDS.maxX;
    if (pos.z < LANDSCAPE_POV_BOUNDS.minZ) pos.z = LANDSCAPE_POV_BOUNDS.minZ;
    if (pos.z > LANDSCAPE_POV_BOUNDS.maxZ) pos.z = LANDSCAPE_POV_BOUNDS.maxZ;
    for (let i = 0; i < LANDSCAPE_OBSTACLES.length; i++) {
      resolveBox(pos, r, LANDSCAPE_OBSTACLES[i]);
    }
  }
}
