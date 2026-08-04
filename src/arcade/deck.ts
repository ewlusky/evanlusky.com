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
  const rawScale = Phaser.Math.Linear(shape.farScale, shape.nearScale, v);
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
  farScale: 0.4,
  nearScale: 0.72,
};

export const CORRIDOR_FLOOR: FloorShape = {
  centerX: 640,
  farY: 470,
  nearY: 740,
  farHalfWidth: 150,
  nearHalfWidth: 620,
  farScale: 0.26,
  nearScale: 0.86,
};

export interface Station {
  id: string;
  label: string;
  /** Matches a section id in the resume data. */
  section: string;
  u: number;
  v: number;
  color: number;
}

export const DECK_STATIONS: Station[] = [
  { id: 'profile', label: 'SIGNAL DESK', section: 'about', u: 0, v: 0.06, color: 0x6fe7ff },
  { id: 'experience', label: 'SYSTEMS CORE', section: 'experience', u: -0.84, v: 0.3, color: 0xffc36a },
  { id: 'skills', label: 'TOOL FORGE', section: 'skills', u: 0.84, v: 0.3, color: 0xb6a2ff },
  { id: 'projects', label: 'ARCHIVE GATE', section: 'projects', u: -0.78, v: 0.72, color: 0x7dffb0 },
  { id: 'education', label: 'LEARNING SPIRE', section: 'education', u: 0.78, v: 0.72, color: 0xff9ecb },
  { id: 'contact', label: 'COMMS RELAY', section: 'contact', u: 0, v: 0.95, color: 0xffe66e },
];
