import Phaser from 'phaser';

import type { ResumeSectionId } from '../../data/resume';
import type { VirtualDirection } from '../../site/resumeInterface';
import {
  GAME_HEIGHT,
  GAME_WIDTH,
  HOTSPOT_INTERACTION_DISTANCE,
  PLAYER_SCALE,
  PLAYER_SPEED,
  STARSHIP_SCALE,
  STARSHIP_X,
  STARSHIP_Y,
  TILE_GRID_SIZE,
  TILE_HEIGHT,
  TILE_ORIGIN_X,
  TILE_ORIGIN_Y,
  TILE_WIDTH,
  WALKABLE_DIAMOND,
} from '../config/gameConstants';
import {
  CELESTIAL_LAYERS,
  CELESTIAL_SOURCE_HEIGHT,
  CELESTIAL_SOURCE_WIDTH,
  PARALLAX_SOURCE_HEIGHT,
  PARALLAX_SOURCE_WIDTH,
  STORMY_MOUNTAIN_LAYERS,
  type ParallaxLayerDefinition,
} from '../config/parallaxBackdrops';

export type SceneBackgroundMode = 'bridge' | 'space' | 'mountains' | 'baseline';

type FacingDirection =
  | 'north'
  | 'north-east'
  | 'east'
  | 'south-east'
  | 'south'
  | 'south-west'
  | 'west'
  | 'north-west';

interface MovementKeys {
  readonly up: Phaser.Input.Keyboard.Key;
  readonly down: Phaser.Input.Keyboard.Key;
  readonly left: Phaser.Input.Keyboard.Key;
  readonly right: Phaser.Input.Keyboard.Key;
  readonly w: Phaser.Input.Keyboard.Key;
  readonly a: Phaser.Input.Keyboard.Key;
  readonly s: Phaser.Input.Keyboard.Key;
  readonly d: Phaser.Input.Keyboard.Key;
}

interface HotspotDefinition {
  readonly sectionId: ResumeSectionId;
  readonly sectionLabel: string;
  readonly stationLabel: string;
  readonly symbol: string;
  readonly x: number;
  readonly y: number;
  readonly bridgeX: number;
  readonly color: number;
}

interface HotspotInstance extends HotspotDefinition {
  readonly container: Phaser.GameObjects.Container;
  readonly glow: Phaser.GameObjects.Arc;
  readonly sectionText: Phaser.GameObjects.Text;
  readonly stationText: Phaser.GameObjects.Text;
}

interface SceneOptions {
  readonly reducedMotion: boolean;
  readonly backgroundMode: SceneBackgroundMode;
  readonly onSectionOpen: (sectionId: ResumeSectionId) => void;
  readonly onStatusChange: (message: string, state?: 'loading' | 'ready' | 'error') => void;
}

interface ParallaxLayerInstance {
  readonly definition: ParallaxLayerDefinition;
  readonly image: Phaser.GameObjects.Image | Phaser.GameObjects.TileSprite;
  readonly originX: number;
  readonly originY: number;
  readonly tiled: boolean;
}

interface ParallaxPropInstance {
  readonly image: Phaser.GameObjects.Image;
  readonly originX: number;
  readonly originY: number;
  readonly travelX: number;
  readonly travelY: number;
}

interface StarshipLayerDefinition {
  readonly key: string;
  readonly publicPath: string;
  readonly depth: number;
  readonly tint: number;
  readonly alpha: number;
}

const DIRECTIONS: readonly FacingDirection[] = [
  'north',
  'north-east',
  'east',
  'south-east',
  'south',
  'south-west',
  'west',
  'north-west',
];
const WALK_FRAME_COUNT = 8;
const INTERACTION_FRAME_COUNT = 9;
const INTERACTION_DIRECTIONS: readonly FacingDirection[] = ['south', 'east', 'west'];

const BRIDGE_POSTER_WIDTH = 1456;
const BRIDGE_POSTER_HEIGHT = 816;
const BRIDGE_VIDEO_WIDTH = 832;
const BRIDGE_VIDEO_HEIGHT = 464;
const BRIDGE_LANE_Y = 462;
const BRIDGE_MIN_X = 80;
const BRIDGE_MAX_X = 880;
const BRIDGE_STATION_Y = 370;
const BRIDGE_INTERACTION_DISTANCE = 62;
const BRIDGE_INACTIVE_ALPHA = 0.68;

const STARSHIP_LAYERS: readonly StarshipLayerDefinition[] = [
  {
    key: 'ship-engines',
    publicPath: '/assets/environment/scout-spaceship/engines.png',
    depth: -0.35,
    tint: 0x7894ad,
    alpha: 0.94,
  },
  {
    key: 'ship-shadows',
    publicPath: '/assets/environment/scout-spaceship/shadows.png',
    depth: -0.25,
    tint: 0x718ba2,
    alpha: 0.72,
  },
  {
    key: 'ship-floor',
    publicPath: '/assets/environment/scout-spaceship/floor.png',
    depth: -0.15,
    tint: 0x7894ad,
    alpha: 1,
  },
  {
    key: 'ship-walls',
    publicPath: '/assets/environment/scout-spaceship/walls.png',
    depth: -0.05,
    tint: 0x8ba9c4,
    alpha: 0.96,
  },
] as const;

const HOTSPOTS: readonly HotspotDefinition[] = [
  {
    sectionId: 'about',
    sectionLabel: 'PROFILE',
    stationLabel: 'SIGNAL DESK',
    symbol: '◎',
    x: 480,
    y: 126,
    bridgeX: 120,
    color: 0x5de4c7,
  },
  {
    sectionId: 'experience',
    sectionLabel: 'EXPERIENCE',
    stationLabel: 'SYSTEMS CORE',
    symbol: '▦',
    x: 280,
    y: 278,
    bridgeX: 264,
    color: 0xffc857,
  },
  {
    sectionId: 'skills',
    sectionLabel: 'SKILLS',
    stationLabel: 'TOOL FORGE',
    symbol: '⌘',
    x: 680,
    y: 278,
    bridgeX: 408,
    color: 0xf28fad,
  },
  {
    sectionId: 'projects',
    sectionLabel: 'PROJECTS',
    stationLabel: 'ARCHIVE GATE',
    symbol: '◇',
    x: 400,
    y: 365,
    bridgeX: 552,
    color: 0x9aa5ff,
  },
  {
    sectionId: 'education',
    sectionLabel: 'EDUCATION + RESEARCH',
    stationLabel: 'LEARNING SPIRE',
    symbol: '△',
    x: 560,
    y: 365,
    bridgeX: 696,
    color: 0xff8a5b,
  },
  {
    sectionId: 'contact',
    sectionLabel: 'CONTACT',
    stationLabel: 'COMMS RELAY',
    symbol: '◉',
    x: 480,
    y: 445,
    bridgeX: 840,
    color: 0x6bd6ff,
  },
];

export class PortfolioScene extends Phaser.Scene {
  private readonly options: SceneOptions;
  private readonly virtualDirections: Record<VirtualDirection, boolean> = {
    up: false,
    down: false,
    left: false,
    right: false,
  };

  private movementKeys?: MovementKeys;
  private player?: Phaser.GameObjects.Sprite;
  private facing: FacingDirection = 'south';
  private walkableArea?: Phaser.Geom.Polygon;
  private hotspotInstances: HotspotInstance[] = [];
  private nearbyHotspot?: HotspotInstance;
  private interactionPrompt?: Phaser.GameObjects.Text;
  private bridgePlayerShadow?: Phaser.GameObjects.Ellipse;
  private bridgeVideo?: Phaser.GameObjects.Video;
  private characterAssetsReady = true;
  private interactionAssetReady = true;
  private environmentAssetsReady = true;
  private bridgePosterReady = true;
  private bridgeVideoReady = true;
  private parallaxLayers: ParallaxLayerInstance[] = [];
  private parallaxProps: ParallaxPropInstance[] = [];
  private bridgeActive = false;
  private starshipActive = false;
  private isInteracting = false;

  public constructor(options: SceneOptions) {
    super({ key: 'portfolio' });
    this.options = options;
  }

  public preload(): void {
    this.options.onStatusChange('Loading Red and the command deck…', 'loading');

    for (const direction of DIRECTIONS) {
      this.load.image(`evan-idle-${direction}`, `/assets/characters/evan/idle/${direction}.png`);
      for (let frame = 0; frame < WALK_FRAME_COUNT; frame += 1) {
        const frameName = frame.toString().padStart(3, '0');
        this.load.image(
          `evan-walk-${direction}-${frame}`,
          `/assets/characters/evan/walk/${direction}/frame_${frameName}.png`,
        );
      }
    }

    for (const direction of INTERACTION_DIRECTIONS) {
      for (let frame = 0; frame < INTERACTION_FRAME_COUNT; frame += 1) {
        const frameName = frame.toString().padStart(3, '0');
        this.load.image(
          `evan-interact-${direction}-${frame}`,
          `/assets/characters/evan/interact/${direction}/frame_${frameName}.png`,
        );
      }
    }

    if (this.options.backgroundMode === 'bridge') {
      this.load.image(
        'bridge-poster',
        '/assets/environment/command-bridge/bridge-poster.png',
      );
      if (!this.options.reducedMotion) {
        this.load.video(
          'bridge-video',
          '/assets/environment/command-bridge/bridge-ambient-loop.mp4',
          true,
        );
      }
    }

    if (this.options.backgroundMode === 'mountains') {
      for (const layer of STORMY_MOUNTAIN_LAYERS) {
        this.load.image(layer.key, layer.publicPath);
      }
    }

    if (this.options.backgroundMode === 'space') {
      for (const layer of CELESTIAL_LAYERS) {
        this.load.image(layer.key, layer.publicPath);
      }
      this.load.spritesheet(
        'space-planets',
        '/assets/environment/celestial-backdrop/planets.png',
        { frameWidth: 72, frameHeight: 72 },
      );
      for (const layer of STARSHIP_LAYERS) {
        this.load.image(layer.key, layer.publicPath);
      }
    }

    this.load.on('loaderror', (file: Phaser.Loader.File) => {
      const assetKey = String(file.key);

      if (assetKey === 'bridge-video') {
        this.bridgeVideoReady = false;
        return;
      }

      if (assetKey === 'bridge-poster') {
        this.bridgePosterReady = false;
        this.options.onStatusChange(
          'The command-room art failed to load. Using a synthesized bridge fallback.',
          'error',
        );
        return;
      }

      if (assetKey.startsWith('evan-interact-')) {
        this.interactionAssetReady = false;
        return;
      }

      if (assetKey.startsWith('evan-')) {
        this.characterAssetsReady = false;
        this.options.onStatusChange('Some Red frames failed to load. Using a fallback marker.', 'error');
        return;
      }

      if (
        assetKey.startsWith('stormy-') ||
        assetKey.startsWith('space-') ||
        assetKey.startsWith('ship-')
      ) {
        this.environmentAssetsReady = false;
        this.options.onStatusChange('Some environment art failed to load. Using the archive fallback.', 'error');
      }
    });
  }

  public create(): void {
    this.drawBackdrop();

    if (this.options.backgroundMode === 'bridge') {
      this.createBridgeStage();
      this.bridgeActive = true;
    } else if (this.options.backgroundMode === 'space' && this.environmentAssetsReady) {
      this.createParallaxBackdrop(
        CELESTIAL_LAYERS,
        CELESTIAL_SOURCE_WIDTH,
        CELESTIAL_SOURCE_HEIGHT,
        true,
      );
      this.createCelestialProps();
      this.drawSpaceOverlay();
      this.drawStarshipPlatform();
      this.starshipActive = true;
    } else {
      if (this.options.backgroundMode === 'mountains' && this.environmentAssetsReady) {
        this.createParallaxBackdrop(
          STORMY_MOUNTAIN_LAYERS,
          PARALLAX_SOURCE_WIDTH,
          PARALLAX_SOURCE_HEIGHT,
        );
        this.drawMountainOverlay();
      }
      this.drawIsometricFloor();
      this.drawBoundaryArchitecture();
      this.walkableArea = new Phaser.Geom.Polygon([
        WALKABLE_DIAMOND.top,
        WALKABLE_DIAMOND.right,
        WALKABLE_DIAMOND.bottom,
        WALKABLE_DIAMOND.left,
      ]);
    }

    this.hotspotInstances = HOTSPOTS.map((definition) => this.createHotspot(definition));
    this.createPlayer();
    this.createInput();
    this.createHudDetails();

    if (!this.characterAssetsReady) {
      this.options.onStatusChange('Deck online with a fallback player marker.', 'ready');
    } else if (this.bridgeActive) {
      this.options.onStatusChange(
        this.bridgeVideo && this.bridgeVideoReady
          ? 'Command bridge online. Walk left or right, or choose a console directly.'
          : 'Command bridge online in still mode. Walk left or right, or choose a console directly.',
        'ready',
      );
    } else if (this.starshipActive) {
      this.options.onStatusChange('Command deck online. Choose a station or begin walking.', 'ready');
    } else if (this.options.backgroundMode === 'mountains' && this.environmentAssetsReady) {
      this.options.onStatusChange('Mountain archive online. Choose a station or begin walking.', 'ready');
    } else {
      this.options.onStatusChange('Archive online. Choose a station or begin walking.', 'ready');
    }
  }

  public update(time: number, delta: number): void {
    this.updateParallax(time, delta);

    if (!this.player) {
      return;
    }

    this.updateNearbyHotspot();

    if (this.isInteracting) {
      return;
    }

    const movement = this.readMovement();
    if (this.bridgeActive) {
      this.updateBridgePlayer(movement.x, delta);
    } else {
      const isMoving = movement.lengthSq() > 0;

      if (isMoving) {
        movement.normalize();
        const distance = PLAYER_SPEED * (delta / 1000);
        const nextX = this.player.x + movement.x * distance;
        const nextY = this.player.y + movement.y * distance;

        if (this.isWalkable(nextX, this.player.y)) {
          this.player.x = nextX;
        }
        if (this.isWalkable(this.player.x, nextY)) {
          this.player.y = nextY;
        }

        this.updateFacing(movement.x, movement.y);
        if (this.characterAssetsReady) {
          this.player.play(`walk-${this.facing}`, true);
        }
      } else if (this.characterAssetsReady) {
        this.player.stop();
        this.player.setTexture(`evan-idle-${this.facing}`);
      }

      this.player.setDepth(Math.round(this.player.y));
    }

  }

  public setVirtualDirection(direction: VirtualDirection, isPressed: boolean): void {
    this.virtualDirections[direction] = isPressed;
  }

  public clearVirtualDirections(): void {
    for (const direction of Object.keys(this.virtualDirections) as VirtualDirection[]) {
      this.virtualDirections[direction] = false;
    }
  }

  public interactNearby(): void {
    this.openNearbyHotspot();
  }

  private drawBackdrop(): void {
    const background = this.add.graphics().setDepth(-10);
    background.fillStyle(0x080d19, 1);
    background.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

    background.lineStyle(1, 0x203252, 0.45);
    for (let x = -120; x < GAME_WIDTH + 120; x += 56) {
      background.lineBetween(x, 0, x + 280, GAME_HEIGHT);
      background.lineBetween(x, 0, x - 280, GAME_HEIGHT);
    }

    background.fillStyle(0x111a2a, 0.9);
    background.fillRect(0, 0, GAME_WIDTH, 46);
    background.fillRect(0, GAME_HEIGHT - 42, GAME_WIDTH, 42);
    background.lineStyle(2, 0x5de4c7, 0.4);
    background.lineBetween(32, 45, GAME_WIDTH - 32, 45);
  }

  private createBridgeStage(): void {
    if (this.bridgePosterReady && this.textures.exists('bridge-poster')) {
      const posterScale = Math.max(
        GAME_WIDTH / BRIDGE_POSTER_WIDTH,
        GAME_HEIGHT / BRIDGE_POSTER_HEIGHT,
      );
      this.add
        .image(GAME_WIDTH / 2, GAME_HEIGHT / 2, 'bridge-poster')
        .setScale(posterScale)
        .setDepth(-9.8);
    }

    if (
      !this.options.reducedMotion &&
      this.bridgeVideoReady &&
      this.cache.video.exists('bridge-video')
    ) {
      const videoScale = Math.max(
        GAME_WIDTH / BRIDGE_VIDEO_WIDTH,
        GAME_HEIGHT / BRIDGE_VIDEO_HEIGHT,
      );
      this.bridgeVideo = this.add
        .video(GAME_WIDTH / 2, GAME_HEIGHT / 2, 'bridge-video')
        .setScale(videoScale)
        .setDepth(-9.7)
        .setMute(true)
        .setLoop(true)
        .play(true);

      this.events.on(Phaser.Scenes.Events.PAUSE, () => this.bridgeVideo?.pause());
      this.events.on(Phaser.Scenes.Events.RESUME, () => this.bridgeVideo?.resume());
      this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.bridgeVideo?.stop());
    }

    const atmosphere = this.add.graphics().setDepth(-8.8);
    atmosphere.fillStyle(0x06101a, 0.31);
    atmosphere.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

    for (let edge = 0; edge < 6; edge += 1) {
      const inset = edge * 18;
      const alpha = 0.055 - edge * 0.006;
      atmosphere.fillStyle(0x02060b, alpha);
      atmosphere.fillRect(inset, 0, 18, GAME_HEIGHT);
      atmosphere.fillRect(GAME_WIDTH - inset - 18, 0, 18, GAME_HEIGHT);
    }

    atmosphere.fillStyle(0x07101b, 0.14);
    atmosphere.fillRect(34, 414, GAME_WIDTH - 68, 104);
    atmosphere.lineStyle(1, 0x6bd6ff, 0.12);
    atmosphere.lineBetween(38, 414, GAME_WIDTH - 38, 414);
    atmosphere.lineBetween(20, 518, GAME_WIDTH - 20, 518);
    for (let x = 52; x < GAME_WIDTH - 52; x += 48) {
      atmosphere.lineBetween(x, 506, x + 22, 506);
    }

    if (!this.options.reducedMotion) {
      const sweep = this.add
        .rectangle(GAME_WIDTH / 2, 310, GAME_WIDTH - 84, 2, 0x6bd6ff, 0.08)
        .setDepth(-8.7);
      this.tweens.add({
        targets: sweep,
        y: 470,
        alpha: { from: 0.02, to: 0.1 },
        duration: 4600,
        ease: 'Sine.InOut',
        yoyo: true,
        repeat: -1,
      });
    }

    const frame = this.add.graphics().setDepth(1800);
    frame.fillStyle(0x060b14, 0.94);
    frame.fillRect(0, 0, GAME_WIDTH, 46);
    frame.fillRect(0, GAME_HEIGHT - 42, GAME_WIDTH, 42);
    frame.lineStyle(2, 0x5de4c7, 0.46);
    frame.lineBetween(32, 45, GAME_WIDTH - 32, 45);
    frame.lineStyle(1, 0x6bd6ff, 0.2);
    frame.lineBetween(32, GAME_HEIGHT - 42, GAME_WIDTH - 32, GAME_HEIGHT - 42);
  }

  private createParallaxBackdrop(
    definitions: readonly ParallaxLayerDefinition[],
    sourceWidth: number,
    sourceHeight: number,
    tiled = false,
  ): void {
    const coverScale = tiled
      ? GAME_HEIGHT / sourceHeight
      : Math.max(GAME_WIDTH / sourceWidth, GAME_HEIGHT / sourceHeight);

    this.parallaxLayers = definitions.map((definition) => {
      const originX = tiled ? 0 : GAME_WIDTH / 2;
      const originY = tiled ? 0 : GAME_HEIGHT / 2;
      const image = tiled
        ? this.add
            .tileSprite(
              originX,
              originY,
              GAME_WIDTH / coverScale,
              GAME_HEIGHT / coverScale,
              definition.key,
            )
            .setOrigin(0)
            .setScale(coverScale)
            .setAlpha(definition.alpha)
            .setDepth(definition.depth)
        : this.add
            .image(originX, originY, definition.key)
            .setOrigin(0.5)
            .setScale(coverScale)
            .setAlpha(definition.alpha)
            .setDepth(definition.depth);

      return { definition, image, originX, originY, tiled };
    });
  }

  private createCelestialProps(): void {
    const nearPlanet = this.add
      .image(824, 112, 'space-planets', 0)
      .setScale(1.04)
      .setAlpha(0.82)
      .setDepth(-9.3);
    const farPlanet = this.add
      .image(112, 420, 'space-planets', 4)
      .setScale(0.82)
      .setAlpha(0.52)
      .setDepth(-9.5);

    this.parallaxProps = [
      {
        image: farPlanet,
        originX: farPlanet.x,
        originY: farPlanet.y,
        travelX: 7,
        travelY: 3,
      },
      {
        image: nearPlanet,
        originX: nearPlanet.x,
        originY: nearPlanet.y,
        travelX: 15,
        travelY: 6,
      },
    ];
  }

  private drawSpaceOverlay(): void {
    const overlay = this.add.graphics().setDepth(-8.9);
    overlay.fillStyle(0x07101d, 0.12);
    overlay.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

    overlay.lineStyle(1, 0x5de4c7, 0.06);
    for (let y = 70; y < GAME_HEIGHT - 42; y += 34) {
      overlay.lineBetween(0, y, GAME_WIDTH, y);
    }

    overlay.fillStyle(0x070c16, 0.9);
    overlay.fillRect(0, 0, GAME_WIDTH, 46);
    overlay.fillRect(0, GAME_HEIGHT - 42, GAME_WIDTH, 42);
    overlay.lineStyle(2, 0x5de4c7, 0.48);
    overlay.lineBetween(32, 45, GAME_WIDTH - 32, 45);
  }

  private drawMountainOverlay(): void {
    const overlay = this.add.graphics().setDepth(-8.4);
    overlay.fillStyle(0x07101d, 0.38);
    overlay.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

    overlay.lineStyle(1, 0x5b7898, 0.12);
    for (let x = -120; x < GAME_WIDTH + 120; x += 56) {
      overlay.lineBetween(x, 0, x + 280, GAME_HEIGHT);
      overlay.lineBetween(x, 0, x - 280, GAME_HEIGHT);
    }

    overlay.fillStyle(0x0a1220, 0.88);
    overlay.fillRect(0, 0, GAME_WIDTH, 46);
    overlay.fillRect(0, GAME_HEIGHT - 42, GAME_WIDTH, 42);
    overlay.lineStyle(2, 0x5de4c7, 0.4);
    overlay.lineBetween(32, 45, GAME_WIDTH - 32, 45);
  }

  private updateParallax(time: number, delta: number): void {
    if (this.options.reducedMotion || (this.parallaxLayers.length === 0 && this.parallaxProps.length === 0)) {
      return;
    }

    const playerX = this.player?.x ?? GAME_WIDTH / 2;
    const playerY = this.player?.y ?? GAME_HEIGHT / 2;
    const movementX = Phaser.Math.Clamp((playerX - GAME_WIDTH / 2) / (GAME_WIDTH / 2), -1, 1);
    const movementY = Phaser.Math.Clamp((playerY - GAME_HEIGHT / 2) / (GAME_HEIGHT / 2), -1, 1);
    const ambientX = Math.sin(time * 0.00012) * 0.16;
    const ambientY = Math.cos(time * 0.00009) * 0.1;
    const easing = 1 - Math.pow(0.001, delta / 1000);

    for (const layer of this.parallaxLayers) {
      const targetX =
        layer.originX - (movementX * 0.62 + ambientX) * layer.definition.travelX;
      const targetY =
        layer.originY - (movementY * 0.42 + ambientY) * layer.definition.travelY;

      if (layer.tiled) {
        const tileSprite = layer.image as Phaser.GameObjects.TileSprite;
        tileSprite.tilePositionX = Phaser.Math.Linear(
          tileSprite.tilePositionX,
          -targetX,
          easing,
        );
        tileSprite.tilePositionY = Phaser.Math.Linear(
          tileSprite.tilePositionY,
          -targetY,
          easing,
        );
      } else {
        layer.image.x = Phaser.Math.Linear(layer.image.x, targetX, easing);
        layer.image.y = Phaser.Math.Linear(layer.image.y, targetY, easing);
      }
    }

    for (const prop of this.parallaxProps) {
      const targetX = prop.originX - (movementX * 0.7 + ambientX) * prop.travelX;
      const targetY = prop.originY - (movementY * 0.5 + ambientY) * prop.travelY;
      prop.image.x = Phaser.Math.Linear(prop.image.x, targetX, easing);
      prop.image.y = Phaser.Math.Linear(prop.image.y, targetY, easing);
    }
  }

  private drawStarshipPlatform(): void {
    const platformGlow = this.add.graphics().setDepth(-0.45);
    platformGlow.fillStyle(0x5de4c7, 0.035);
    platformGlow.fillEllipse(STARSHIP_X, STARSHIP_Y + 8, 620, 458);
    platformGlow.lineStyle(2, 0x6bd6ff, 0.14);
    platformGlow.strokeEllipse(STARSHIP_X, STARSHIP_Y + 8, 622, 460);

    platformGlow.fillStyle(0x6bd6ff, 0.12);
    platformGlow.fillEllipse(264, 447, 54, 16);
    platformGlow.fillEllipse(696, 447, 54, 16);
    platformGlow.fillEllipse(407, 507, 48, 13);
    platformGlow.fillEllipse(553, 507, 48, 13);

    for (const definition of STARSHIP_LAYERS) {
      this.add
        .image(STARSHIP_X, STARSHIP_Y, definition.key)
        .setOrigin(0.5)
        .setScale(STARSHIP_SCALE)
        .setTint(definition.tint)
        .setAlpha(definition.alpha)
        .setDepth(definition.depth);
    }
  }

  private drawIsometricFloor(): void {
    const floor = this.add.graphics().setDepth(0);

    for (let row = 0; row < TILE_GRID_SIZE; row += 1) {
      for (let column = 0; column < TILE_GRID_SIZE; column += 1) {
        const x = TILE_ORIGIN_X + (column - row) * (TILE_WIDTH / 2);
        const y = TILE_ORIGIN_Y + (column + row) * (TILE_HEIGHT / 2);
        const isAlternate = (row + column) % 2 === 0;
        const points = [
          new Phaser.Math.Vector2(x, y),
          new Phaser.Math.Vector2(x + TILE_WIDTH / 2, y + TILE_HEIGHT / 2),
          new Phaser.Math.Vector2(x, y + TILE_HEIGHT),
          new Phaser.Math.Vector2(x - TILE_WIDTH / 2, y + TILE_HEIGHT / 2),
        ];

        floor.fillStyle(isAlternate ? 0x172840 : 0x142339, 1);
        floor.fillPoints(points, true);
        floor.lineStyle(1, 0x31506d, 0.72);
        floor.strokePoints(points, true);

        if ((row * 3 + column) % 7 === 0) {
          floor.lineStyle(2, 0x5de4c7, 0.18);
          floor.lineBetween(x - 14, y + TILE_HEIGHT / 2, x + 14, y + TILE_HEIGHT / 2);
        }
      }
    }
  }

  private drawBoundaryArchitecture(): void {
    const architecture = this.add.graphics().setDepth(40);
    architecture.fillStyle(0x0d1626, 1);
    architecture.lineStyle(2, 0x4e698b, 1);

    const northLeft = [
      new Phaser.Math.Vector2(88, 278),
      new Phaser.Math.Vector2(480, 72),
      new Phaser.Math.Vector2(480, 98),
      new Phaser.Math.Vector2(116, 292),
    ];
    const northRight = [
      new Phaser.Math.Vector2(480, 72),
      new Phaser.Math.Vector2(872, 278),
      new Phaser.Math.Vector2(844, 292),
      new Phaser.Math.Vector2(480, 98),
    ];

    architecture.fillPoints(northLeft, true);
    architecture.strokePoints(northLeft, true);
    architecture.fillPoints(northRight, true);
    architecture.strokePoints(northRight, true);

    architecture.fillStyle(0x5de4c7, 0.75);
    architecture.fillRect(475, 70, 10, 26);
    architecture.fillStyle(0xffc857, 0.8);
    architecture.fillCircle(96, 280, 5);
    architecture.fillCircle(864, 280, 5);
  }

  private createHotspot(definition: HotspotDefinition): HotspotInstance {
    if (this.bridgeActive) {
      return this.createBridgeHotspot(definition);
    }

    const glow = this.add.circle(0, 4, 35, definition.color, 0.13);
    const pad = this.add.graphics();
    pad.fillStyle(0x050a13, 0.72);
    pad.fillEllipse(0, 10, 68, 27);
    pad.lineStyle(2, definition.color, 0.82);
    pad.strokeEllipse(0, 6, 58, 23);
    pad.lineStyle(1, definition.color, 0.42);
    pad.strokeEllipse(0, 4, 42, 16);
    pad.lineBetween(-22, 4, 22, 4);
    pad.lineBetween(0, -4, 0, 12);
    pad.fillStyle(definition.color, 0.22);
    pad.fillCircle(0, 4, 11);

    const beam = this.add.graphics();
    beam.fillStyle(definition.color, 0.055);
    beam.fillTriangle(-17, 2, 17, 2, 0, -30);
    beam.lineStyle(1, definition.color, 0.18);
    beam.lineBetween(-17, 2, 0, -30);
    beam.lineBetween(17, 2, 0, -30);

    const symbol = this.add
      .text(0, -17, definition.symbol, {
        color: `#${definition.color.toString(16).padStart(6, '0')}`,
        fontFamily: 'Consolas, monospace',
        fontSize: '24px',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);
    const sectionText = this.add
      .text(0, 34, definition.sectionLabel, {
        color: `#${definition.color.toString(16).padStart(6, '0')}`,
        fontFamily: 'Consolas, monospace',
        fontSize: definition.sectionLabel.length > 14 ? '8px' : '10px',
        fontStyle: 'bold',
        letterSpacing: 1.5,
        backgroundColor: '#050a14e8',
        padding: { x: 7, y: 3 },
      })
      .setOrigin(0.5, 0);
    const stationText = this.add
      .text(0, 53, definition.stationLabel, {
        color: '#dce8f5',
        fontFamily: 'Consolas, monospace',
        fontSize: '9px',
        letterSpacing: 1.2,
        backgroundColor: '#050a14e8',
        padding: { x: 7, y: 3 },
      })
      .setOrigin(0.5, 0);

    const container = this.add
      .container(definition.x, definition.y, [glow, pad, beam, symbol, sectionText, stationText])
      .setSize(148, 91)
      .setDepth(Math.round(definition.y))
      .setInteractive({ useHandCursor: true });

    container.on('pointerover', () => {
      glow.setAlpha(0.34);
      sectionText.setColor('#ffffff');
      stationText.setColor('#ffffff');
    });
    container.on('pointerout', () => {
      glow.setAlpha(0.13);
      sectionText.setColor(`#${definition.color.toString(16).padStart(6, '0')}`);
      stationText.setColor('#dce8f5');
    });
    container.on('pointerdown', () => this.options.onSectionOpen(definition.sectionId));

    if (!this.options.reducedMotion) {
      this.tweens.add({
        targets: glow,
        scale: 1.2,
        duration: 1450,
        ease: 'Sine.InOut',
        yoyo: true,
        repeat: -1,
        delay: definition.x,
      });
      this.tweens.add({
        targets: symbol,
        y: -20,
        duration: 1100,
        ease: 'Sine.InOut',
        yoyo: true,
        repeat: -1,
        delay: definition.y,
      });
    }

    return { ...definition, container, glow, sectionText, stationText };
  }

  private createBridgeHotspot(definition: HotspotDefinition): HotspotInstance {
    const glow = this.add.circle(0, 55, 34, definition.color, 0.16);
    const pad = this.add.graphics();
    pad.fillStyle(0x030810, 0.78);
    pad.fillEllipse(0, 57, 66, 18);
    pad.lineStyle(2, definition.color, 0.92);
    pad.strokeEllipse(0, 54, 55, 15);
    pad.lineStyle(1, definition.color, 0.4);
    pad.strokeEllipse(0, 54, 37, 9);
    pad.lineBetween(-18, 54, 18, 54);

    const beam = this.add.graphics();
    beam.fillStyle(definition.color, 0.045);
    beam.fillTriangle(-22, 49, 22, 49, 0, 3);
    beam.lineStyle(1, definition.color, 0.22);
    beam.lineBetween(-22, 49, 0, 3);
    beam.lineBetween(22, 49, 0, 3);

    const panel = this.add.graphics();
    panel.fillStyle(0x040a13, 0.92);
    panel.fillRoundedRect(-64, -46, 128, 48, 3);
    panel.lineStyle(1, definition.color, 0.84);
    panel.strokeRoundedRect(-64, -46, 128, 48, 3);
    panel.fillStyle(definition.color, 0.22);
    panel.fillRect(-64, -46, 3, 48);
    panel.lineStyle(1, definition.color, 0.24);
    panel.lineBetween(-55, -5, 55, -5);

    const symbol = this.add
      .text(-49, -34, definition.symbol, {
        color: `#${definition.color.toString(16).padStart(6, '0')}`,
        fontFamily: 'Consolas, monospace',
        fontSize: '19px',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);
    const sectionText = this.add
      .text(8, -35, definition.sectionLabel, {
        color: '#ffffff',
        fontFamily: 'Consolas, monospace',
        fontSize: definition.sectionLabel.length > 14 ? '7px' : '9px',
        fontStyle: 'bold',
        letterSpacing: definition.sectionLabel.length > 14 ? 0.6 : 1.1,
      })
      .setOrigin(0.5);
    const stationText = this.add
      .text(8, -17, definition.stationLabel, {
        color: `#${definition.color.toString(16).padStart(6, '0')}`,
        fontFamily: 'Consolas, monospace',
        fontSize: '8px',
        letterSpacing: 0.8,
      })
      .setOrigin(0.5);

    const container = this.add
      .container(definition.bridgeX, BRIDGE_STATION_Y, [
        glow,
        pad,
        beam,
        panel,
        symbol,
        sectionText,
        stationText,
      ])
      .setSize(132, 116)
      .setAlpha(BRIDGE_INACTIVE_ALPHA)
      .setDepth(430)
      .setInteractive({ useHandCursor: true });

    container.on('pointerover', () => {
      container.setAlpha(1);
      glow.setAlpha(0.44);
      sectionText.setColor('#ffffff');
      stationText.setColor('#ffffff');
    });
    container.on('pointerout', () => {
      const isNearby = this.nearbyHotspot?.sectionId === definition.sectionId;
      container.setAlpha(isNearby ? 1 : BRIDGE_INACTIVE_ALPHA);
      glow.setAlpha(isNearby ? 0.42 : 0.16);
      stationText.setColor(`#${definition.color.toString(16).padStart(6, '0')}`);
    });
    container.on('pointerdown', () => {
      if (!this.isInteracting) {
        this.options.onSectionOpen(definition.sectionId);
      }
    });

    if (!this.options.reducedMotion) {
      this.tweens.add({
        targets: glow,
        scaleX: 1.14,
        scaleY: 1.14,
        duration: 1550,
        ease: 'Sine.InOut',
        yoyo: true,
        repeat: -1,
        delay: definition.bridgeX * 2,
      });
      this.tweens.add({
        targets: symbol,
        y: -36,
        duration: 1250,
        ease: 'Sine.InOut',
        yoyo: true,
        repeat: -1,
        delay: definition.bridgeX,
      });
    }

    return { ...definition, container, glow, sectionText, stationText };
  }

  private createPlayer(): void {
    if (this.characterAssetsReady && this.textures.exists('evan-idle-south')) {
      for (const direction of DIRECTIONS) {
        this.anims.create({
          key: `walk-${direction}`,
          frames: Array.from({ length: WALK_FRAME_COUNT }, (_, frame) => ({
            key: `evan-walk-${direction}-${frame}`,
          })),
          frameRate: this.options.reducedMotion ? 6 : 10,
          repeat: -1,
        });
      }

      if (this.interactionAssetReady) {
        for (const direction of INTERACTION_DIRECTIONS) {
          this.anims.create({
            key: `interact-${direction}`,
            frames: Array.from({ length: INTERACTION_FRAME_COUNT }, (_, frame) => ({
              key: `evan-interact-${direction}-${frame}`,
            })),
            frameRate: this.bridgeActive ? 15 : 11,
            repeat: 0,
          });
        }
      }

      const startingX = this.bridgeActive ? HOTSPOTS[0].bridgeX : 480;
      const startingY = this.bridgeActive ? BRIDGE_LANE_Y : 318;
      this.facing = this.bridgeActive ? 'east' : 'south';
      this.player = this.add.sprite(startingX, startingY, `evan-idle-${this.facing}`);
      this.player.setScale(PLAYER_SCALE).setOrigin(0.5, 0.805);
    } else {
      this.characterAssetsReady = false;
      const fallback = this.add.graphics();
      fallback.fillStyle(0x5de4c7, 1);
      fallback.fillCircle(24, 18, 11);
      fallback.fillStyle(0x29344b, 1);
      fallback.fillRoundedRect(13, 29, 22, 35, 5);
      fallback.lineStyle(3, 0xffc857, 1);
      fallback.lineBetween(24, 33, 24, 58);
      fallback.generateTexture('fallback-player', 48, 72);
      fallback.destroy();
      this.player = this.add
        .sprite(
          this.bridgeActive ? HOTSPOTS[0].bridgeX : 480,
          this.bridgeActive ? BRIDGE_LANE_Y : 318,
          'fallback-player',
        )
        .setOrigin(0.5, 0.88);
    }

    if (this.bridgeActive) {
      this.bridgePlayerShadow = this.add
        .ellipse(this.player.x, BRIDGE_LANE_Y + 4, 38, 10, 0x02050a, 0.48)
        .setDepth(519);
      this.player.setDepth(520);
    } else {
      this.player.setDepth(Math.round(this.player.y));
    }
  }

  private createInput(): void {
    const keyboard = this.input.keyboard;
    if (!keyboard) {
      return;
    }

    this.movementKeys = keyboard.addKeys({
      up: Phaser.Input.Keyboard.KeyCodes.UP,
      down: Phaser.Input.Keyboard.KeyCodes.DOWN,
      left: Phaser.Input.Keyboard.KeyCodes.LEFT,
      right: Phaser.Input.Keyboard.KeyCodes.RIGHT,
      w: Phaser.Input.Keyboard.KeyCodes.W,
      a: Phaser.Input.Keyboard.KeyCodes.A,
      s: Phaser.Input.Keyboard.KeyCodes.S,
      d: Phaser.Input.Keyboard.KeyCodes.D,
    }) as MovementKeys;

  }

  private createHudDetails(): void {
    const commandDeckActive = this.bridgeActive || this.starshipActive;
    this.add
      .text(28, 54, commandDeckActive ? 'EWL // COMMAND DECK' : 'EWL // CAREER ARCHIVE', {
        color: '#6f88a8',
        fontFamily: 'Consolas, monospace',
        fontSize: '11px',
        letterSpacing: 1.5,
      })
      .setDepth(2000);
    this.add
      .text(
        GAME_WIDTH - 28,
        54,
        this.bridgeActive
          ? 'NAV // CONSOLE WALKWAY'
          : this.starshipActive
            ? 'NAV // PORTFOLIO'
            : 'SECTOR 01',
        {
        color: '#6f88a8',
        fontFamily: 'Consolas, monospace',
        fontSize: '11px',
        letterSpacing: 1.5,
        },
      )
      .setOrigin(1, 0)
      .setDepth(2000);

    this.interactionPrompt = this.add
      .text(
        GAME_WIDTH / 2,
        GAME_HEIGHT - 18,
        this.bridgeActive
          ? 'A / D  WALK THE BRIDGE  //  SELECT ANY CONSOLE DIRECTLY'
          : 'MOVE TO A STATION OR SELECT IT DIRECTLY',
        {
        color: '#8295ad',
        fontFamily: 'Consolas, monospace',
        fontSize: '12px',
        letterSpacing: 1.2,
        },
      )
      .setOrigin(0.5, 1)
      .setDepth(2000);
  }

  private updateBridgePlayer(horizontal: number, delta: number): void {
    if (!this.player) {
      return;
    }

    const isMoving = Math.abs(horizontal) > 0.01;
    if (isMoving) {
      const direction = Math.sign(horizontal);
      this.player.x = Phaser.Math.Clamp(
        this.player.x + direction * PLAYER_SPEED * 0.82 * (delta / 1000),
        BRIDGE_MIN_X,
        BRIDGE_MAX_X,
      );
      this.facing = direction > 0 ? 'east' : 'west';
      if (this.characterAssetsReady) {
        this.player.play(`walk-${this.facing}`, true);
      }
    } else if (this.characterAssetsReady) {
      this.player.stop();
      this.player.setTexture(`evan-idle-${this.facing}`);
    }

    this.player.y = BRIDGE_LANE_Y;
    this.player.setDepth(520);
    this.bridgePlayerShadow?.setPosition(this.player.x, BRIDGE_LANE_Y + 4);
  }

  private readMovement(): Phaser.Math.Vector2 {
    const keys = this.movementKeys;
    const isLeft = this.virtualDirections.left || keys?.left.isDown || keys?.a.isDown;
    const isRight = this.virtualDirections.right || keys?.right.isDown || keys?.d.isDown;
    const isUp = this.virtualDirections.up || keys?.up.isDown || keys?.w.isDown;
    const isDown = this.virtualDirections.down || keys?.down.isDown || keys?.s.isDown;

    return new Phaser.Math.Vector2(
      Number(Boolean(isRight)) - Number(Boolean(isLeft)),
      Number(Boolean(isDown)) - Number(Boolean(isUp)),
    );
  }

  private updateFacing(horizontal: number, vertical: number): void {
    const horizontalDirection = horizontal > 0 ? 'east' : 'west';
    const verticalDirection = vertical > 0 ? 'south' : 'north';

    if (Math.abs(horizontal) < 0.25) {
      this.facing = verticalDirection;
    } else if (Math.abs(vertical) < 0.25) {
      this.facing = horizontalDirection;
    } else {
      this.facing = `${verticalDirection}-${horizontalDirection}` as FacingDirection;
    }
  }

  private isWalkable(x: number, y: number): boolean {
    if (!this.starshipActive) {
      return Boolean(this.walkableArea && Phaser.Geom.Polygon.Contains(this.walkableArea, x, y));
    }

    const upperDeck = new Phaser.Geom.Polygon([
      { x: 448, y: 103 },
      { x: 512, y: 103 },
      { x: 595, y: 246 },
      { x: 365, y: 246 },
    ]);
    const crossDeck = new Phaser.Geom.Rectangle(238, 236, 484, 101);
    const lowerDeck = new Phaser.Geom.Rectangle(382, 302, 196, 164);

    return (
      Phaser.Geom.Polygon.Contains(upperDeck, x, y) ||
      Phaser.Geom.Rectangle.Contains(crossDeck, x, y) ||
      Phaser.Geom.Rectangle.Contains(lowerDeck, x, y)
    );
  }

  private updateNearbyHotspot(): void {
    if (!this.player || !this.interactionPrompt) {
      return;
    }

    const nearest = this.hotspotInstances
      .map((hotspot) => ({
        hotspot,
        distance: this.bridgeActive
          ? Math.abs(this.player!.x - hotspot.bridgeX)
          : Phaser.Math.Distance.Between(this.player!.x, this.player!.y, hotspot.x, hotspot.y),
      }))
      .sort((left, right) => left.distance - right.distance)[0];
    const interactionDistance = this.bridgeActive
      ? BRIDGE_INTERACTION_DISTANCE
      : HOTSPOT_INTERACTION_DISTANCE;
    const nextNearby = nearest?.distance <= interactionDistance ? nearest.hotspot : undefined;

    if (this.nearbyHotspot !== nextNearby) {
      this.nearbyHotspot?.glow.setAlpha(0.13);
      if (this.bridgeActive && this.nearbyHotspot) {
        this.nearbyHotspot.container.setAlpha(BRIDGE_INACTIVE_ALPHA);
      }
      this.nearbyHotspot = nextNearby;
      this.nearbyHotspot?.glow.setAlpha(0.42);
      if (this.bridgeActive && this.nearbyHotspot) {
        this.nearbyHotspot.container.setAlpha(1);
      }
    }

    if (this.isInteracting && this.nearbyHotspot) {
      this.interactionPrompt.setText(`ACCESSING ${this.nearbyHotspot.sectionLabel}…`);
      this.interactionPrompt.setColor('#ffffff');
      return;
    }

    this.interactionPrompt.setText(
      this.nearbyHotspot
        ? `E / ENTER  OPEN ${this.nearbyHotspot.sectionLabel}  //  ${this.nearbyHotspot.stationLabel}`
        : this.bridgeActive
          ? 'A / D  WALK THE BRIDGE  //  SELECT ANY CONSOLE DIRECTLY'
          : 'MOVE TO A STATION OR SELECT IT DIRECTLY',
    );
    this.interactionPrompt.setColor(this.nearbyHotspot ? '#ffffff' : '#8295ad');
  }

  private openNearbyHotspot(): void {
    if (this.isInteracting || !this.nearbyHotspot || !this.player) {
      return;
    }

    const hotspot = this.nearbyHotspot;
    const interactionDirection: FacingDirection = this.bridgeActive
      ? this.player.x <= hotspot.bridgeX
        ? 'east'
        : 'west'
      : 'south';
    const interactionAnimation = `interact-${interactionDirection}`;
    if (
      this.options.reducedMotion ||
      !this.characterAssetsReady ||
      !this.interactionAssetReady ||
      !this.anims.exists(interactionAnimation)
    ) {
      this.options.onSectionOpen(hotspot.sectionId);
      return;
    }

    this.isInteracting = true;
    const previousFacing = this.facing;
    this.facing = interactionDirection;
    hotspot.container.setAlpha(0.28);
    this.player.play(interactionAnimation);
    this.player.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => {
      this.isInteracting = false;
      hotspot.container.setAlpha(1);
      this.facing = previousFacing;
      this.player?.setTexture(`evan-idle-${previousFacing}`);
      this.options.onSectionOpen(hotspot.sectionId);
    });
  }
}
