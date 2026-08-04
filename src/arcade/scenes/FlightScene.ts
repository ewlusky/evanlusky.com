import Phaser from 'phaser';

const HORIZON = 424;
const ROAD_TOP = 560;

/** Layer scroll rates in pixels per second. Depth is sold by the spread. */
const RATES = {
  sky: 6,
  mountains: 26,
  palmsBack: 74,
  palms: 168,
  road: 470,
};

export class FlightScene extends Phaser.Scene {
  private sky!: Phaser.GameObjects.TileSprite;
  private mountains!: Phaser.GameObjects.TileSprite;
  private palmsBack!: Phaser.GameObjects.TileSprite;
  private palms!: Phaser.GameObjects.TileSprite;
  private road!: Phaser.GameObjects.TileSprite;
  private ship!: Phaser.GameObjects.Sprite;
  private trail!: Phaser.GameObjects.Particles.ParticleEmitter;
  private keys!: Record<'up' | 'down' | 'w' | 's' | 'exit' | 'boost', Phaser.Input.Keyboard.Key>;
  private shipY = 300;
  private boostFactor = 1;
  private theme?: Phaser.Sound.BaseSound;
  private leaving = false;

  constructor() {
    super('flight');
  }

  create(): void {
    const { width, height } = this.scale;
    this.cameras.main.fadeIn(420, 2, 4, 8);

    this.makeShipTexture();
    this.makeSparkTexture();

    // Tile wider than the canvas so only one sun is ever on screen.
    this.sky = this.add.tileSprite(0, 0, width, HORIZON + 40, 'px-back').setOrigin(0).setDepth(0);
    this.sky.setTileScale(5.5, 5.5);

    // Deep dusk band so no canvas background shows between horizon and road.
    this.add.rectangle(0, HORIZON - 120, width, ROAD_TOP - HORIZON + 126, 0x2a1145).setOrigin(0).setDepth(0.5);

    this.mountains = this.add
      .tileSprite(0, HORIZON - 200, width, 230, 'px-mountains')
      .setOrigin(0)
      .setDepth(1);
    this.mountains.setTileScale(4, 4);

    this.palmsBack = this.add
      .tileSprite(0, HORIZON - 96, width, 150, 'px-palms-back')
      .setOrigin(0)
      .setDepth(2);
    this.palmsBack.setTileScale(3, 3);

    this.palms = this.add.tileSprite(0, HORIZON - 150, width, 260, 'px-palms').setOrigin(0).setDepth(3);
    this.palms.setTileScale(4, 4);

    // Ground plate under the road strip so the horizon does not show through.
    this.add.rectangle(0, ROAD_TOP - 6, width, height - ROAD_TOP + 6, 0x1a0b2e).setOrigin(0).setDepth(3.5);
    this.road = this.add.tileSprite(0, ROAD_TOP, width, height - ROAD_TOP, 'px-road').setOrigin(0).setDepth(4);
    // 16px tall source over a 160px strip: one band, not two.
    this.road.setTileScale(10, 10);

    this.trail = this.add.particles(0, 0, 'spark', {
      speedX: { min: -260, max: -140 },
      speedY: { min: -22, max: 22 },
      lifespan: { min: 220, max: 520 },
      scale: { start: 1.5, end: 0 },
      quantity: 2,
      frequency: 24,
      tint: [0xff6ec7, 0x6fe7ff, 0xffe66e],
      blendMode: 'ADD',
    });
    this.trail.setDepth(5);

    this.ship = this.add.sprite(300, this.shipY, 'ship').setDepth(6).setScale(2.6);

    this.add
      .text(18, 14, 'EWL // OUTBOUND', { fontFamily: 'monospace', fontSize: '14px', color: '#ff6ec7' })
      .setDepth(100)
      .setResolution(2);
    this.add
      .text(this.scale.width - 18, 14, 'W/S FLY · SHIFT BOOST · Q RETURN TO DECK', {
        fontFamily: 'monospace',
        fontSize: '11px',
        color: '#7d8fb5',
      })
      .setOrigin(1, 0)
      .setDepth(100)
      .setResolution(2);

    const kb = this.input.keyboard!;
    const K = Phaser.Input.Keyboard.KeyCodes;
    this.keys = kb.addKeys(
      { up: K.UP, down: K.DOWN, w: K.W, s: K.S, exit: K.Q, boost: K.SHIFT },
      false,
    ) as FlightScene['keys'];
    kb.on('keydown-Q', () => this.returnToDeck());
    kb.on('keydown-ESC', () => this.returnToDeck());

    this.startTheme();
  }

  /** A small chunky craft, drawn rather than shipped as another PNG. */
  private makeShipTexture(): void {
    const g = this.make.graphics({ x: 0, y: 0 });
    g.fillStyle(0x2a1b4d).fillRect(4, 10, 46, 9);
    g.fillStyle(0xe8ecff).fillRect(8, 8, 34, 7);
    g.fillStyle(0xff6ec7).fillRect(10, 6, 22, 4);
    g.fillStyle(0x6fe7ff).fillRect(30, 9, 10, 4);
    g.fillStyle(0x1b1030).fillRect(2, 13, 12, 5);
    g.fillStyle(0xffe66e).fillRect(0, 13, 4, 4);
    g.fillStyle(0xe8ecff).fillRect(42, 11, 10, 5);
    g.generateTexture('ship', 56, 26);
    g.destroy();
  }

  private makeSparkTexture(): void {
    const g = this.make.graphics({ x: 0, y: 0 });
    g.fillStyle(0xffffff).fillRect(0, 0, 3, 3);
    g.generateTexture('spark', 3, 3);
    g.destroy();
  }

  private startTheme(): void {
    if (this.sound.locked) {
      this.sound.once(Phaser.Sound.Events.UNLOCKED, () => this.startTheme());
      return;
    }
    this.theme = this.sound.add('flight-theme', { loop: true, volume: 0.34 });
    this.theme.play();
  }

  private returnToDeck(): void {
    if (this.leaving) return;
    this.leaving = true;
    this.theme?.stop();
    this.cameras.main.fadeOut(360, 2, 4, 8);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => this.scene.start('deck'));
  }

  update(_time: number, delta: number): void {
    const seconds = delta / 1000;
    const k = this.keys;

    const boosting = k.boost.isDown;
    this.boostFactor = Phaser.Math.Linear(this.boostFactor, boosting ? 2.1 : 1, 0.08);

    let dir = 0;
    if (k.up.isDown || k.w.isDown) dir -= 1;
    if (k.down.isDown || k.s.isDown) dir += 1;
    this.shipY = Phaser.Math.Clamp(this.shipY + dir * 240 * seconds, 150, ROAD_TOP - 40);

    const bob = Math.sin(this.time.now / 420) * 4;
    this.ship.setPosition(300, Math.round(this.shipY + bob));
    this.ship.setAngle(Phaser.Math.Linear(this.ship.angle, dir * 7, 0.15));

    this.trail.setPosition(this.ship.x - 26, this.ship.y + 3);
    this.trail.setQuantity(boosting ? 4 : 2);

    const f = this.boostFactor * seconds;
    this.sky.tilePositionX += RATES.sky * f;
    this.mountains.tilePositionX += RATES.mountains * f;
    this.palmsBack.tilePositionX += RATES.palmsBack * f;
    this.palms.tilePositionX += RATES.palms * f;
    this.road.tilePositionX += RATES.road * f;
  }
}
