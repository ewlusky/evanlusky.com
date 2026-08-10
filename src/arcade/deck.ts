import Phaser from 'phaser';

/** Normalized floor coordinates: u is -1 left to +1 right, v is 0 far to 1 near. */
export interface FloorPosition {
  u: number;
  v: number;
}

export interface FloorShape {
  centerX: number;
  farY: number;
  nearY: number;
  farHalfWidth: number;
  nearHalfWidth: number;
  farScale: number;
  nearScale: number;
  /**
   * Shapes how fast he grows as he comes forward. 1 is a straight line from
   * farScale to nearScale. Below 1 he reaches most of his size early, which
   * keeps the middle of the floor from looking undersized. Above 1 he stays
   * small until he is close.
   */
  scaleCurve?: number;
}

export interface Projected {
  x: number;
  y: number;
  scale: number;
}

/**
 * Projects a point on the trapezoidal floor into screen space. Scale is
 * quantized into fixed steps because continuously resampling pixel art makes
 * individual pixels crawl as the character moves.
 */
export function projectFloor(shape: FloorShape, position: FloorPosition): Projected {
  const v = Phaser.Math.Clamp(position.v, 0, 1);
  const u = Phaser.Math.Clamp(position.u, -1, 1);
  const y = Phaser.Math.Linear(shape.farY, shape.nearY, v);
  const halfWidth = Phaser.Math.Linear(shape.farHalfWidth, shape.nearHalfWidth, v);
  const rawScale = Phaser.Math.Linear(shape.farScale, shape.nearScale, Math.pow(v, shape.scaleCurve ?? 1));
  return {
    x: Math.round(shape.centerX + u * halfWidth),
    y: Math.round(y),
    scale: Math.round(rawScale * 32) / 32,
  };
}

export const DECK_FLOOR: FloorShape = {
  centerX: 640,
  farY: 552,
  nearY: 712,
  farHalfWidth: 285,
  nearHalfWidth: 555,
  // Sized against the bucket seat in the room art: he should stand a little
  // taller than its headrest, not come up to its armrest. The back of the room
  // read correctly at 0.92, so that stays put and the curve does the work of
  // lifting the middle and front, which were both about a quarter too small.
  farScale: 0.92,
  nearScale: 1.88,
  scaleCurve: 0.7,
};

export const CORRIDOR_FLOOR: FloorShape = {
  centerX: 640,
  farY: 470,
  nearY: 740,
  farHalfWidth: 150,
  nearHalfWidth: 620,
  // The hall runs much deeper than the deck, so the range is wider, but the
  // near end matches the deck so he stays the same person between rooms.
  farScale: 0.34,
  nearScale: 1.78,
  scaleCurve: 0.78,
};

/** The pilot's chair on the starboard side, lifted out of the room art. */
export const DECK_CHAIR = {
  /** Where the crop came from in the 1280x720 room image. */
  x: 879,
  y: 437,
  width: 84,
  height: 180,
  /** Screen y of its base, which is what the player y-sorts against. */
  baseY: 613,
  /** Where he stands to be offered the seat, and where he sits. */
  standU: 0.62,
  standV: 0.52,
  seatU: 0.735,
  seatV: 0.38,
} as const;

export interface Station {
  id: string;
  label: string;
  /** Matches a section id in the resume data. */
  section: string;
  u: number;
  v: number;
  color: number;
}

/**
 * Rectangles of floor he cannot stand on, in the same u/v space.
 * Collision is axis-separated, so walking into one slides along it.
 */
export interface Blocker {
  u0: number;
  u1: number;
  v0: number;
  v1: number;
}

export const DECK_BLOCKERS: Blocker[] = [
  // The console bank across the back of the room. Everything nearer than this
  // is open floor, which keeps the hallway at the bottom clear.
  // Add more rectangles here to block props; keep them clear of DECK_STATIONS
  // or the station they cover becomes unreachable on foot.
  // Open the arcade with ?debug=1 to see these drawn and to read the u/v
  // under the cursor while you place new ones.
  { u0: -1.1, u1: 1.1, v0: -0.5, v1: 0.13 },
  // The pilot's chair. He walks around it, and behind it when he is further back.
  { u0: 0.58, u1: 0.86, v0: 0.26, v1: 0.46 },
];

export function isBlocked(blockers: readonly Blocker[], u: number, v: number): boolean {
  return blockers.some((b) => u >= b.u0 && u <= b.u1 && v >= b.v0 && v <= b.v1);
}

export const DECK_STATIONS: Station[] = [
  { id: 'profile', label: 'SIGNAL DESK', section: 'about', u: 0, v: 0.2, color: 0x6fe7ff },
  { id: 'experience', label: 'SYSTEMS CORE', section: 'experience', u: -0.84, v: 0.3, color: 0xffc36a },
  // Sits below the chair so the chair blocker never walls it off.
  { id: 'skills', label: 'TOOL FORGE', section: 'skills', u: 0.88, v: 0.6, color: 0xb6a2ff },
  { id: 'projects', label: 'ARCHIVE GATE', section: 'projects', u: -0.78, v: 0.72, color: 0x7dffb0 },
  { id: 'education', label: 'LEARNING SPIRE', section: 'education', u: 0.66, v: 0.9, color: 0xff9ecb },
  { id: 'contact', label: 'COMMS RELAY', section: 'contact', u: 0, v: 0.95, color: 0xffe66e },
];
