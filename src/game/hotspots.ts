import type { Route } from '../router';

export interface Hotspot {
  id: string;
  label: string;
  /** Section to open on trigger. Omitted for pure easter eggs. */
  route?: Route;
  /** Pixel-space rect of the prop, origin top-left, in the 400x224 room. */
  x: number;
  y: number;
  w: number;
  h: number;
  color: number;
  /** Slow alpha pulse, for things that should read as "powered on". */
  pulse?: boolean;
  /** Idle spark particles + repair interaction instead of navigation. */
  sparking?: boolean;
}

export const HOTSPOTS: Hotspot[] = [
  { id: 'console', label: "SHIP'S LOG", route: 'resume', x: 176, y: 20, w: 48, h: 24, color: 0x4dc3ff, pulse: true },
  { id: 'holomap', label: 'NAV CHART', route: 'projects', x: 304, y: 88, w: 32, h: 32, color: 0x57e6c6, pulse: true },
  { id: 'goboard', label: 'STRATEGY TABLE', route: 'skills', x: 64, y: 88, w: 24, h: 24, color: 0xffb454 },
  { id: 'guitar', label: 'GUITAR', route: 'about', x: 56, y: 164, w: 16, h: 28, color: 0xff6e9c },
  { id: 'comms', label: 'COMMS', route: 'contact', x: 352, y: 56, w: 16, h: 32, color: 0xb492ff, pulse: true },
  { id: 'wires', label: 'SPARKING WIRES', x: 288, y: 184, w: 28, h: 14, color: 0xffe66e, sparking: true },
];
