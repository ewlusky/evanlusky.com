export interface ParallaxLayerDefinition {
  readonly key: string;
  readonly publicPath: string;
  readonly depth: number;
  readonly travelX: number;
  readonly travelY: number;
  readonly alpha: number;
}

export const STORMY_MOUNTAIN_LAYERS: readonly ParallaxLayerDefinition[] = [
  {
    key: 'stormy-background',
    publicPath: '/assets/environment/stormy-mountains/background.png',
    depth: -9.8,
    travelX: 0,
    travelY: 0,
    alpha: 1,
  },
  {
    key: 'stormy-cloud-far',
    publicPath: '/assets/environment/stormy-mountains/cloud-far.png',
    depth: -9.6,
    travelX: 3,
    travelY: 1,
    alpha: 0.8,
  },
  {
    key: 'stormy-cloud-mid',
    publicPath: '/assets/environment/stormy-mountains/cloud-mid.png',
    depth: -9.4,
    travelX: 5,
    travelY: 2,
    alpha: 0.84,
  },
  {
    key: 'stormy-mountain-far',
    publicPath: '/assets/environment/stormy-mountains/mountain-far.png',
    depth: -9.2,
    travelX: 7,
    travelY: 3,
    alpha: 0.94,
  },
  {
    key: 'stormy-mountain-mid',
    publicPath: '/assets/environment/stormy-mountains/mountain-mid.png',
    depth: -9,
    travelX: 11,
    travelY: 4,
    alpha: 0.97,
  },
  {
    key: 'stormy-mountain-near',
    publicPath: '/assets/environment/stormy-mountains/mountain-near.png',
    depth: -8.8,
    travelX: 15,
    travelY: 6,
    alpha: 1,
  },
  {
    key: 'stormy-cloud-front',
    publicPath: '/assets/environment/stormy-mountains/cloud-front.png',
    depth: -8.6,
    travelX: 18,
    travelY: 7,
    alpha: 0.58,
  },
] as const;

export const PARALLAX_SOURCE_WIDTH = 640;
export const PARALLAX_SOURCE_HEIGHT = 360;

export const CELESTIAL_LAYERS: readonly ParallaxLayerDefinition[] = [
  {
    key: 'space-background',
    publicPath: '/assets/environment/celestial-backdrop/background.png',
    depth: -9.8,
    travelX: 0,
    travelY: 0,
    alpha: 1,
  },
  {
    key: 'space-galactic-near',
    publicPath: '/assets/environment/celestial-backdrop/galactic-near.png',
    depth: -9.6,
    travelX: 7,
    travelY: 2,
    alpha: 0.86,
  },
  {
    key: 'space-galactic-far',
    publicPath: '/assets/environment/celestial-backdrop/galactic-far.png',
    depth: -9.4,
    travelX: 10,
    travelY: 3,
    alpha: 0.8,
  },
  {
    key: 'space-star-borders',
    publicPath: '/assets/environment/celestial-backdrop/star-borders.png',
    depth: -9.2,
    travelX: 17,
    travelY: 5,
    alpha: 0.92,
  },
] as const;

export const CELESTIAL_SOURCE_WIDTH = 512;
export const CELESTIAL_SOURCE_HEIGHT = 360;
