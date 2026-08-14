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
  private dockGlow!: Phaser.GameObjects.Rectangle;
  private dockLabel!: Phaser.GameObjects.Text;
  private trail!: Phaser.GameObjects.Particles.ParticleEmitter;
  private keys!: Record<
    'up' | 'down' | 'left' | 'right' | 'w' | 'a' | 's' | 'd' | 'exit' | 'boost',
    Phaser.Input.Keyboard.Key
  >;
  private shipX = 300;
  private shipY = 300;
  private boostFactor = 1;
  private theme?: Phaser.Sound.BaseSound;
  private leaving = false;

  constructor() {
    super('flight');
  }

  create(): void {
    const { width, height } = this.scale;

    // Same restart caveat as the other scenes: reset by hand.
    this.leaving = false;
    this.shipX = 300;
    this.shipY = 300;
    this.boostFactor = 1;
    this.input.keyboard?.removeAllListeners();

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

    this.ship = this.add.sprite(this.shipX, this.shipY, 'ship').setDepth(6).setScale(2.2);

    // Somewhere to actually fly to, so leaving is part of the world.
    this.dockGlow = this.add.rectangle(width - 26, height / 2, 52, height, 0x6fe7ff, 0.05).setDepth(7);
    this.tweens.add({
      targets: this.dockGlow,
      fillAlpha: { from: 0.04, to: 0.16 },
      duration: 1300,
      yoyo: true,
      repeat: -1,
    });
    this.dockLabel = this.add
      .text(width - 30, height / 2, 'D O C K  ▶', {
        fontFamily: 'monospace',
        fontSize: '13px',
        color: '#6fe7ff',
        backgroundColor: 'rgba(6,10,20,0.75)',
        padding: { x: 5, y: 4 },
      })
      .setOrigin(1, 0.5)
      .setDepth(101)
      .setResolution(2);

    this.add
      .text(18, 14, 'EWL // OUTBOUND', { fontFamily: 'monospace', fontSize: '14px', color: '#ff6ec7' })
      .setDepth(100)
      .setResolution(2);
    this.add
      .text(this.scale.width - 18, 14, 'WASD FLY · SHIFT BOOST · FLY RIGHT TO DOCK', {
        fontFamily: 'monospace',
        fontSize: '11px',
        color: '#7d8fb5',
      })
      .setOrigin(1, 0)
      .setDepth(100)
      .setResolution(2);

    // A tappable way home for anyone without a keyboard.
    const backButton = this.add
      .text(18, 40, '◀ BACK TO THE DECK', {
        fontFamily: 'monospace',
        fontSize: '12px',
        color: '#ffe66e',
        backgroundColor: 'rgba(6,10,20,0.8)',
        padding: { x: 7, y: 5 },
      })
      .setDepth(101)
      .setResolution(2)
      .setInteractive({ useHandCursor: true });
    backButton.on('pointerdown', () => this.leave('deck'));

    const kb = this.input.keyboard!;
    const K = Phaser.Input.Keyboard.KeyCodes;
    this.keys = kb.addKeys(
      {
        up: K.UP,
        down: K.DOWN,
        left: K.LEFT,
        right: K.RIGHT,
        w: K.W,
        a: K.A,
        s: K.S,
        d: K.D,
        exit: K.Q,
        boost: K.SHIFT,
      },
      false,
    ) as FlightScene['keys'];
    kb.on('keydown-Q', () => this.leave('deck'));
    kb.on('keydown-ESC', () => this.leave('deck'));

    this.startTheme();
  }

  /**
   * A chunky little interceptor, drawn rather than shipped as a PNG.
   * Nose points right; the scene never flips it.
   */
  private makeShipTexture(): void {
    const HULL_DARK = 0x241541;
    const HULL = 0x4a3a7a;
    const HULL_LIT = 0x8f7fd0;
    const TRIM = 0xff6ec7;
    const GLASS = 0x6fe7ff;
    const GLOW = 0xffe66e;

    const g = this.make.graphics({ x: 0, y: 0 });

    // swept wings, overlapping the hull so they read as one airframe
    g.fillStyle(HULL_DARK).fillRect(20, 5, 26, 7);
    g.fillStyle(HULL).fillRect(24, 6, 20, 4);
    g.fillStyle(HULL_DARK).fillRect(20, 22, 26, 7);
    g.fillStyle(HULL).fillRect(24, 24, 20, 4);

    // main hull
    g.fillStyle(HULL_DARK).fillRect(8, 11, 54, 12);
    g.fillStyle(HULL).fillRect(10, 12, 50, 9);
    g.fillStyle(HULL_LIT).fillRect(12, 13, 44, 3);

    // nose
    g.fillStyle(HULL_DARK).fillRect(62, 13, 6, 8);
    g.fillStyle(HULL_LIT).fillRect(66, 15, 4, 4);
    g.fillStyle(TRIM).fillRect(56, 14, 8, 2);

    // canopy
    g.fillStyle(0x0d1a2e).fillRect(40, 12, 14, 7);
    g.fillStyle(GLASS).fillRect(41, 13, 12, 4);
    g.fillStyle(0xffffff, 0.8).fillRect(48, 13, 4, 2);

    // engine block and exhaust
    g.fillStyle(HULL_DARK).fillRect(2, 12, 8, 10);
    g.fillStyle(TRIM).fillRect(4, 14, 4, 6);
    g.fillStyle(GLOW).fillRect(0, 15, 3, 4);
    g.fillStyle(0xffffff).fillRect(0, 16, 2, 2);

    // trim stripe along the flank
    g.fillStyle(TRIM).fillRect(14, 19, 30, 2);

    g.generateTexture('ship', 72, 34);
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

  private leave(target: 'deck' | 'corridor'): void {
    if (this.leaving) return;
    this.leaving = true;
    this.theme?.stop();
    this.cameras.main.fadeOut(360, 2, 4, 8);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => this.scene.start(target));
  }

  update(_time: number, delta: number): void {
    const seconds = delta / 1000;
    const k = this.keys;

    const boosting = k.boost.isDown;
    this.boostFactor = Phaser.Math.Linear(this.boostFactor, boosting ? 2.1 : 1, 0.08);

    const vi = (this.registry.get('virtual-input') as { up: boolean; down: boolean; left: boolean; right: boolean }) ?? {
      up: false,
      down: false,
      left: false,
      right: false,
    };
    let dir = 0;
    if (k.up.isDown || k.w.isDown || vi.up) dir -= 1;
    if (k.down.isDown || k.s.isDown || vi.down) dir += 1;
    this.shipY = Phaser.Math.Clamp(this.shipY + dir * 240 * seconds, 150, ROAD_TOP - 40);

    let lateral = 0;
    if (k.left.isDown || k.a.isDown || vi.left) lateral -= 1;
    if (k.right.isDown || k.d.isDown || vi.right) lateral += 1;
    this.shipX = Phaser.Math.Clamp(this.shipX + lateral * 260 * seconds, 120, this.scale.width - 18);

    // Flying into the docking beam on the right is the way back to the hangar.
    if (this.shipX >= this.scale.width - 24) {
      this.leave('corridor');
      return;
    }
    this.dockLabel.setAlpha(this.shipX > this.scale.width - 320 ? 1 : 0.55);

    const bob = Math.sin(this.time.now / 420) * 4;
    this.ship.setPosition(Math.round(this.shipX), Math.round(this.shipY + bob));
    this.ship.setAngle(Phaser.Math.Linear(this.ship.angle, dir * 7, 0.15));

    this.trail.setPosition(this.ship.x - 34, this.ship.y + 3);
    this.trail.setQuantity(boosting ? 4 : 2);

    const f = this.boostFactor * seconds;
    this.sky.tilePositionX += RATES.sky * f;
    this.mountains.tilePositionX += RATES.mountains * f;
    this.palmsBack.tilePositionX += RATES.palmsBack * f;
    this.palms.tilePositionX += RATES.palms * f;
    this.road.tilePositionX += RATES.road * f;
  }
}
