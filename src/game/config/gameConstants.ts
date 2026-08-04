export const GAME_WIDTH = 960;
export const GAME_HEIGHT = 560;

export const TILE_WIDTH = 88;
export const TILE_HEIGHT = 44;
export const TILE_GRID_SIZE = 9;
export const TILE_ORIGIN_X = GAME_WIDTH / 2;
export const TILE_ORIGIN_Y = 72;

export const PLAYER_SPEED = 205;
export const PLAYER_SCALE = 0.55;
export const HOTSPOT_INTERACTION_DISTANCE = 82;

export const STARSHIP_X = GAME_WIDTH / 2;
export const STARSHIP_Y = 296;
export const STARSHIP_SCALE = 1.72;

export const WALKABLE_DIAMOND = {
  top: { x: GAME_WIDTH / 2, y: 104 },
  right: { x: 842, y: 292 },
  bottom: { x: GAME_WIDTH / 2, y: 482 },
  left: { x: 118, y: 292 },
} as const;
