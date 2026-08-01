import type { Route } from '../router';

/** Where the 176x160 room art sits inside the 400x224 canvas. */
export const ROOM = {
  x: 112,
  y: 32,
  w: 176,
  h: 160,
  /** Walkable interior in world px (inside the room walls). */
  bounds: { x: 122, y: 78, w: 156, h: 102 },
} as const;

/** Solid furniture baked into the room art layers (world-space rects). */
export const ROOM_COLLIDERS: ReadonlyArray<{ x: number; y: number; w: number; h: number }> = [
  { x: 152, y: 84, w: 96, h: 36 }, // curved command desk (layer 3)
  { x: 118, y: 76, w: 30, h: 30 }, // left spotlight rig
  { x: 252, y: 76, w: 30, h: 30 }, // right spotlight rig
  { x: 116, y: 136, w: 38, h: 30 }, // lower-left lamp/camera cluster
];

/** Purely decorative animated sprites from the room's pack. */
export const DECOR = [
  { key: 'screens', x: 168, y: 52, frameRate: 6 }, // monitor wall above the desk
] as const;

/** Sliding door in the bottom wall; opens when the player walks near. */
export const DOOR = { x: 204, y: 177 } as const;

/** Where the player materializes: clear of every trigger zone. */
export const SPAWN = { x: 226, y: 158 } as const;

export interface Hotspot {
  id: string;
  label: string;
  /** Section to open on trigger. Omitted for pure easter eggs. */
  route?: Route;
  /** World-space rect of the interactable prop. */
  x: number;
  y: number;
  w: number;
  h: number;
  /** Loaded texture key; omitted = placeholder art generated at boot. */
  texture?: string;
  frameRate?: number;
  color: number;
  pulse?: boolean;
  sparking?: boolean;
  /** Plays the big guitar summon/play cutscene before routing. */
  cutscene?: boolean;
  /** Trigger-zone padding around the prop rect (default 12). */
  zonePad?: number;
}

export const HOTSPOTS: Hotspot[] = [
  // the room's own desk; its approach lane (x 190-240) must stay prop-free
  { id: 'console', label: "SHIP'S LOG", route: 'resume', x: 168, y: 94, w: 64, h: 24, color: 0x4dc3ff },
  { id: 'holomap', label: 'NAV CHART', route: 'projects', x: 248, y: 126, w: 28, h: 20, color: 0x57e6c6, pulse: true },
  { id: 'goboard', label: 'STRATEGY TABLE', route: 'skills', x: 130, y: 158, w: 24, h: 18, color: 0xffb454 },
  { id: 'guitar', label: 'GUITAR', route: 'about', x: 250, y: 170, w: 16, h: 26, color: 0xff6e9c, cutscene: true, zonePad: 10 },
  { id: 'comms', label: 'COMMS', route: 'contact', x: 122, y: 108, w: 16, h: 40, texture: 'server', frameRate: 2, color: 0xb492ff, pulse: true, zonePad: 8 },
  { id: 'wires', label: 'SPARKING WIRES', x: 176, y: 172, w: 26, h: 12, color: 0xffe66e, sparking: true },
];
