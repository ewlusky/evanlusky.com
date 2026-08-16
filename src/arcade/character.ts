import Phaser from 'phaser';

export interface CharacterManifest {
  frameWidth: number;
  frameHeight: number;
  footPivot: { x: number; y: number };
  clips: Record<string, { file: string; frames: number }>;
}

export type Facing8 =
  | 'north'
  | 'north-east'
  | 'east'
  | 'south-east'
  | 'south'
  | 'south-west'
  | 'west'
  | 'north-west';

export type Facing4 = 'north' | 'east' | 'south' | 'west';

const CLIP_PREFIX = {
  walk: 'base-walking-',
  idle: 'base-idle-',
  run: 'hop-running-',
  push: 'hop-button-push-',
  console: 'hop-man-continues-to-navigate-through-a-futuristic-',
  flip: 'base-front-flip-',
  jump: 'base-running-jump-',
} as const;

export const CLIP_DANCE = 'hop-terrible-dance-south';
/** The chair set. He drops into the seat facing away, then works it. */
export const CLIP_SIT_DOWN = 'hop-character-sits-back-in-the-sci-fi-pilots-seat-east';
export const CLIP_SIT_LOOP = 'base-character-stays-seated-in-the-sci-fi-pilots-se-east';
export const CLIP_SIT_SCREEN = 'base-character-begins-with-screen-already-active-an-east';
export const CLIP_SIT_STAND = 'base-character-gets-up-from-sitting-position-to-sta-east';
export const CLIP_GUITAR_SUMMON = 'hop-the-man-reaches-into-the-air-pulling-an-acoust-south';
export const CLIP_GUITAR_PLAY = 'hop-holding-the-acoustic-guitar-he-begins-to-pluck-south';

export const FACINGS_8: Facing8[] = [
  'north',
  'north-east',
  'east',
  'south-east',
  'south',
  'south-west',
  'west',
  'north-west',
];

/** Screen-space vector to one of eight facings. Screen y grows downward. */
export function facingFromVector(dx: number, dy: number): Facing8 {
  const angle = Math.atan2(dy, dx);
  const index = Math.round((angle + Math.PI) / (Math.PI / 4)) % 8;
  const byAngle: Facing8[] = [
    'west',
    'north-west',
    'north',
    'north-east',
    'east',
    'south-east',
    'south',
    'south-west',
  ];
  return byAngle[index] ?? 'south';
}

export function toFacing4(facing: Facing8): Facing4 {
  if (facing === 'north-east' || facing === 'south-east') return 'east';
  if (facing === 'north-west' || facing === 'south-west') return 'west';
  return facing as Facing4;
}

/** Queues every strip sheet in the manifest onto the loader. */
export function queueCharacterSheets(load: Phaser.Loader.LoaderPlugin, manifest: CharacterManifest, base: string): void {
  for (const [key, clip] of Object.entries(manifest.clips)) {
    load.spritesheet(key, `${base}/${clip.file}`, {
      frameWidth: manifest.frameWidth,
      frameHeight: manifest.frameHeight,
    });
  }
}

interface AnimSpec {
  key: string;
  clip: string;
  frameRate: number;
  repeat: number;
}

/** Registers friendly animation keys (walk-south, flip-east, ...) once per game. */
export function registerCharacterAnims(anims: Phaser.Animations.AnimationManager, manifest: CharacterManifest): void {
  const specs: AnimSpec[] = [];

  for (const facing of FACINGS_8) {
    specs.push({ key: `walk-${facing}`, clip: `${CLIP_PREFIX.walk}${facing}`, frameRate: 12, repeat: -1 });
  }
  for (const facing of ['north', 'east', 'south', 'west'] as Facing4[]) {
    specs.push({ key: `idle-${facing}`, clip: `${CLIP_PREFIX.idle}${facing}`, frameRate: 7, repeat: -1 });
    specs.push({ key: `run-${facing}`, clip: `${CLIP_PREFIX.run}${facing}`, frameRate: 15, repeat: -1 });
    specs.push({ key: `push-${facing}`, clip: `${CLIP_PREFIX.push}${facing}`, frameRate: 14, repeat: 0 });
    // One pass: long enough to watch him work the console, short enough that
    // the panel does not feel withheld.
    specs.push({ key: `console-${facing}`, clip: `${CLIP_PREFIX.console}${facing}`, frameRate: 12, repeat: 0 });
  }
  for (const facing of ['east', 'south', 'west']) {
    specs.push({ key: `flip-${facing}`, clip: `${CLIP_PREFIX.flip}${facing}`, frameRate: 18, repeat: 0 });
  }
  for (const facing of ['north', 'east', 'south', 'west'] as Facing4[]) {
    specs.push({ key: `jump-${facing}`, clip: `${CLIP_PREFIX.jump}${facing}`, frameRate: 14, repeat: 0 });
  }
  specs.push({ key: 'dance', clip: CLIP_DANCE, frameRate: 10, repeat: 3 });
  specs.push({ key: 'sit-down', clip: CLIP_SIT_DOWN, frameRate: 12, repeat: 0 });
  specs.push({ key: 'sit-loop', clip: CLIP_SIT_LOOP, frameRate: 8, repeat: -1 });
  specs.push({ key: 'sit-screen', clip: CLIP_SIT_SCREEN, frameRate: 10, repeat: -1 });
  specs.push({ key: 'sit-stand', clip: CLIP_SIT_STAND, frameRate: 12, repeat: 0 });
  for (const facing of ['east', 'south', 'west']) {
    specs.push({ key: `jump-still-${facing}`, clip: `hop-two-footed-jump-${facing}`, frameRate: 14, repeat: 0 });
  }
  for (const facing of ['north', 'east', 'south', 'west'] as Facing4[]) {
    specs.push({ key: `screen-start-${facing}`, clip: `hop-start-screen-interact-${facing}`, frameRate: 14, repeat: 0 });
    specs.push({ key: `screen-loop-${facing}`, clip: `hop-screen-interact-loop-${facing}`, frameRate: 12, repeat: -1 });
  }
  specs.push({ key: 'guitar-summon', clip: CLIP_GUITAR_SUMMON, frameRate: 12, repeat: 0 });
  // Loops forever; the scene decides when he puts it away.
  specs.push({ key: 'guitar-play', clip: CLIP_GUITAR_PLAY, frameRate: 12, repeat: -1 });

  for (const spec of specs) {
    const clip = manifest.clips[spec.clip];
    if (!clip || anims.exists(spec.key)) continue;
    anims.create({
      key: spec.key,
      frames: anims.generateFrameNumbers(spec.clip, { start: 0, end: clip.frames - 1 }),
      frameRate: spec.frameRate,
      repeat: spec.repeat,
    });
  }
}

/** Walk animations exist for all eight facings; everything else falls back to four. */
export function walkAnimFor(facing: Facing8): string {
  return `walk-${facing}`;
}

export function idleAnimFor(facing: Facing8): string {
  return `idle-${toFacing4(facing)}`;
}

export function runAnimFor(facing: Facing8): string {
  return `run-${toFacing4(facing)}`;
}
