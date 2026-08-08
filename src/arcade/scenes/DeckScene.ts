import Phaser from 'phaser';
import {
  DECK_BLOCKERS,
  DECK_FLOOR,
  DECK_STATIONS,
  isBlocked,
  projectFloor,
  type FloorPosition,
  type Station,
} from '../deck';
import {
  facingFromVector,
  idleAnimFor,
  runAnimFor,
  toFacing4,
  walkAnimFor,
  type CharacterManifest,
  type Facing8,
} from '../character';

const WALK_U = 0.62;
const WALK_V = 0.42;
const RUN_MULTIPLIER = 1.75;
const NEAR_STATION = 0.16;

/**
 * The jump arc. The animation does not lift him off the ground by itself, so
 * the scene lifts the sprite while the flip plays.
 *
 * hopPeak   how high he gets at the top of the arc, in pixels before depth
 *           scaling. Bigger number, bigger jump.
 * travel    how far the flip carries him across the floor, in u units.
 * liftStart when his feet leave the floor, as a fraction of the animation.
 * liftEnd   when he lands again. Widen this pair if he floats before or after
 *           the tuck; tighten it if he hangs in the air too long.
 */
const FLIP = {
  hopPeak: 54,
  travel: 0.13,
  liftStart: 0.12,
  liftEnd: 0.88,
};

type Keys = Record<
  'up' | 'down' | 'left' | 'right' | 'w' | 'a' | 's' | 'd' | 'interact' | 'flip' | 'dance' | 'guitar' | 'shift',
  Phaser.Input.Keyboard.Key
>;

export class DeckScene extends Phaser.Scene {
  private player!: Phaser.GameObjects.Sprite;
  private shadow!: Phaser.GameObjects.Ellipse;
  private keys!: Keys;
  private pos: FloorPosition = { u: 0, v: 0.55 };
  private facing: Facing8 = 'south';
  private busyUntil = 0;
  private hop: { start: number; duration: number; fromU: number; toU: number } | null = null;
  private hopOffset = 0;
  private markers = new Map<string, Phaser.GameObjects.Ellipse>();
  private labels = new Map<string, Phaser.GameObjects.Text>();
  private activeStation: Station | null = null;
  private leaving = false;
  private prompt!: Phaser.GameObjects.Text;
  private stars!: Phaser.GameObjects.TileSprite;
  private exitArrow!: Phaser.GameObjects.Text;
  private moveTarget: FloorPosition | null = null;
  private theme?: Phaser.Sound.BaseSound;

  constructor() {
    super('deck');
  }

  create(): void {
    const manifest = this.registry.get('char-manifest') as CharacterManifest;
    const { width, height } = this.scale;

    this.add.image(0, 0, 'room-deck').setOrigin(0).setDisplaySize(width, height).setDepth(0);
    this.buildViewport();
    this.buildDoor();
    this.buildStations();

    this.shadow = this.add.ellipse(0, 0, 74, 20, 0x000000, 0.4).setDepth(1);
    this.player = this.add.sprite(0, 0, 'base-idle-south', 0);
    this.player.setOrigin(manifest.footPivot.x, manifest.footPivot.y);
    this.player.play('idle-south');

    this.buildForeground();
    this.buildHud();
    this.bindInput();
    this.startTheme();
    this.applyPosition();
  }

  /**
   * The round window in the room art looks out on drifting space. Generated
   * rather than a video loop: a texture always renders, a video element is at
   * the mercy of codec and autoplay policy.
   */
  private buildViewport(): void {
    const cx = 645;
    const cy = 305;
    const radius = 126;

    // Phaser 4 does not honour geometry masks the way v3 did, so nothing is
    // clipped: the star field is transparent and sized to sit inside the
    // window circle, which keeps every pixel of it within the glass.
    const inner = Math.floor(radius * Math.SQRT1_2 * 2);

    const g = this.make.graphics({ x: 0, y: 0 });
    const rng = new Phaser.Math.RandomDataGenerator(['deck-viewport']);
    for (let i = 0; i < 70; i++) {
      const shade = rng.pick([0xffffff, 0xbcd4ff, 0x8fb2ff, 0xffe9b0]);
      const size = rng.pick([1, 1, 1, 2]);
      g.fillStyle(shade, rng.realInRange(0.35, 1)).fillRect(rng.between(0, inner - 1), rng.between(0, inner - 1), size, size);
    }
    g.generateTexture('viewport-stars', inner, inner);
    g.destroy();

    this.add.circle(cx, cy, radius - 2, 0x060a14, 0.85).setDepth(0.4);

    // Two slow blooms behind the stars read as distant nebulae.
    for (let i = 0; i < 2; i++) {
      const nebula = this.add
        .ellipse(cx + (i === 0 ? -26 : 30), cy + (i === 0 ? 18 : -22), 96, 62, i === 0 ? 0x2b5c8a : 0x63306b, 0.32)
        .setDepth(0.42);
      this.tweens.add({
        targets: nebula,
        x: nebula.x + (i === 0 ? 44 : -50),
        scaleX: { from: 1, to: 1.2 },
        alpha: { from: 0.32, to: 0.12 },
        duration: 22000 + i * 6000,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.InOut',
      });
    }

    this.stars = this.add
      .tileSprite(cx, cy, inner, inner, 'viewport-stars')
      .setOrigin(0.5)
      .setDepth(0.45);
  }

  /** Leaving happens by walking out the left side of the deck, not through a door. */
  private buildDoor(): void {
    const edge = projectFloor(DECK_FLOOR, { u: -0.94, v: 0.62 });
    this.exitArrow = this.add
      .text(edge.x - 26, edge.y - 40, '◀ AFT\nCORRIDOR', {
        fontFamily: 'monospace',
        fontSize: '11px',
        color: '#7dffb0',
        align: 'center',
        backgroundColor: 'rgba(4,8,14,0.7)',
        padding: { x: 5, y: 3 },
      })
      .setOrigin(0.5)
      .setDepth(2000)
      .setResolution(2)
      .setAlpha(0.5);
    this.tweens.add({
      targets: this.exitArrow,
      alpha: { from: 0.45, to: 0.95 },
      duration: 1500,
      yoyo: true,
      repeat: -1,
    });
  }

  private buildStations(): void {
    for (const station of DECK_STATIONS) {
      const p = projectFloor(DECK_FLOOR, station);
      const marker = this.add
        .ellipse(p.x, p.y, 78 * p.scale + 22, 26 * p.scale + 8, station.color, 0.2)
        .setDepth(0.7);
      this.tweens.add({
        targets: marker,
        fillAlpha: { from: 0.14, to: 0.32 },
        duration: 1600,
        yoyo: true,
        repeat: -1,
        delay: Phaser.Math.Between(0, 800),
      });
      this.markers.set(station.id, marker);

      const label = this.add
        .text(p.x, p.y - 96 * p.scale, station.label, {
          fontFamily: 'monospace',
          fontSize: '12px',
          color: '#e8f4ff',
          backgroundColor: 'rgba(4,8,14,0.7)',
          padding: { x: 5, y: 3 },
        })
        .setOrigin(0.5)
        .setDepth(2000)
        .setResolution(2)
        .setAlpha(0.85);
      label.setInteractive({ useHandCursor: true });
      label.on('pointerdown', () => this.openSection(station));
      this.labels.set(station.id, label);
    }
  }

  /** A foreground lip sells the room as a place rather than a backdrop. */
  private buildForeground(): void {
    const { width, height } = this.scale;
    const bar = this.add.graphics().setDepth(3000);
    bar.fillStyle(0x04070c, 0.92).fillRect(0, height - 26, width, 26);
    bar.fillStyle(0x0d1826, 1).fillRect(0, height - 30, width, 5);
  }

  private buildHud(): void {
    const { width, height } = this.scale;
    this.add
      .text(18, 14, 'EWL // COMMAND DECK', {
        fontFamily: 'monospace',
        fontSize: '14px',
        color: '#6fe7ff',
      })
      .setDepth(3100)
      .setResolution(2);

    this.add
      .text(width - 18, 14, 'WASD MOVE · SPACE FLIP · E OPEN · G DANCE · R GUITAR', {
        fontFamily: 'monospace',
        fontSize: '11px',
        color: '#5f7590',
      })
      .setOrigin(1, 0)
      .setDepth(3100)
      .setResolution(2);

    this.prompt = this.add
      .text(width / 2, height - 44, '', {
        fontFamily: 'monospace',
        fontSize: '13px',
        color: '#ffe66e',
        backgroundColor: 'rgba(4,8,14,0.8)',
        padding: { x: 8, y: 4 },
      })
      .setOrigin(0.5)
      .setDepth(3100)
      .setResolution(2)
      .setVisible(false);
  }

  private bindInput(): void {
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
        interact: K.E,
        flip: K.F,
        dance: K.G,
        guitar: K.R,
        shift: K.SHIFT,
      },
      false,
    ) as Keys;

    kb.on('keydown-E', () => this.tryInteract());
    kb.on('keydown-F', () => this.playFlourish('flip'));
    kb.on('keydown-SPACE', () => this.playFlourish('flip'));
    kb.on('keydown-G', () => this.playFlourish('dance'));
    kb.on('keydown-R', () => this.playFlourish('guitar'));

    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      this.moveTarget = this.unproject(pointer.worldX, pointer.worldY);
    });
  }

  /** Screen point back to floor coordinates, so click-to-walk lands where it looks. */
  private unproject(x: number, y: number): FloorPosition {
    const v = Phaser.Math.Clamp(
      (y - DECK_FLOOR.farY) / (DECK_FLOOR.nearY - DECK_FLOOR.farY),
      0.02,
      0.97,
    );
    const halfWidth = Phaser.Math.Linear(DECK_FLOOR.farHalfWidth, DECK_FLOOR.nearHalfWidth, v);
    const u = Phaser.Math.Clamp((x - DECK_FLOOR.centerX) / halfWidth, -0.94, 0.94);
    return { u, v };
  }

  private startTheme(): void {
    if (this.sound.locked) {
      this.sound.once(Phaser.Sound.Events.UNLOCKED, () => this.startTheme());
      return;
    }
    if (this.theme?.isPlaying) return;
    this.theme = this.sound.add('deck-theme', { loop: true, volume: 0.32 });
    this.theme.play();
  }

  private busy(): boolean {
    return this.time.now < this.busyUntil;
  }

  /** Wall-clock length of an animation including its repeats. */
  private animDuration(key: string): number {
    const anim = this.anims.get(key);
    if (!anim || anim.frameRate <= 0) return 0;
    return (anim.getTotalFrames() / anim.frameRate) * 1000 * (anim.repeat + 1);
  }

  private playFlourish(kind: 'flip' | 'dance' | 'guitar'): void {
    if (this.busy()) return;
    const facing4 = toFacing4(this.facing);
    let key: string;
    if (kind === 'flip') {
      key = `flip-${facing4 === 'north' ? 'south' : facing4}`;
    } else if (kind === 'dance') {
      key = 'dance';
      this.facing = 'south';
    } else {
      key = 'guitar-summon';
      this.facing = 'south';
    }
    if (!this.anims.exists(key)) return;

    this.moveTarget = null;
    this.player.play(key);
    const duration = this.animDuration(key);
    this.busyUntil = this.time.now + duration;

    if (kind === 'flip') {
      const forward = facing4 === 'west' ? -1 : facing4 === 'east' ? 1 : 0;
      const toU = Phaser.Math.Clamp(this.pos.u + forward * FLIP.travel, -0.94, 0.94);
      this.hop = {
        start: this.time.now,
        duration,
        fromU: this.pos.u,
        toU: isBlocked(DECK_BLOCKERS, toU, this.pos.v) ? this.pos.u : toU,
      };
    }

    if (kind === 'guitar') {
      this.player.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => {
        if (!this.anims.exists('guitar-play')) return;
        this.player.play('guitar-play');
        this.busyUntil = this.time.now + this.animDuration('guitar-play');
      });
    }
  }

  private tryInteract(): void {
    if (this.busy()) return;
    if (this.activeStation) {
      this.openSection(this.activeStation);
    }
  }

  private openSection(station: Station): void {
    if (this.busy()) return;
    this.moveTarget = null;
    const key = `console-${toFacing4(this.facing)}`;
    if (this.anims.exists(key)) {
      this.player.play(key);
      this.busyUntil = this.time.now + this.animDuration(key);
    }
    this.sound.play('chime', { volume: 0.4 });
    this.cameras.main.flash(180, 40, 90, 120);
    this.game.events.emit('arcade:open-section', station.section);
  }

  private toCorridor(): void {
    if (this.leaving) return;
    this.leaving = true;
    this.cameras.main.fadeOut(320, 2, 4, 8);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      this.theme?.stop();
      this.scene.start('corridor');
    });
  }

  update(_time: number, delta: number): void {
    const seconds = delta / 1000;
    this.stars.tilePositionX += 2.4 * seconds;
    this.stars.tilePositionY -= 0.7 * seconds;

    if (this.leaving) return;

    if (this.busy()) {
      this.updateHop();
      this.applyPosition();
      return;
    }
    if (this.hop) {
      this.hop = null;
      this.hopOffset = 0;
    }

    const k = this.keys;
    let h = 0;
    let v = 0;
    if (k.left.isDown || k.a.isDown) h -= 1;
    if (k.right.isDown || k.d.isDown) h += 1;
    if (k.up.isDown || k.w.isDown) v -= 1;
    if (k.down.isDown || k.s.isDown) v += 1;

    if (h !== 0 || v !== 0) {
      this.moveTarget = null;
    } else if (this.moveTarget) {
      const du = this.moveTarget.u - this.pos.u;
      const dv = this.moveTarget.v - this.pos.v;
      if (Math.abs(du) < 0.02 && Math.abs(dv) < 0.015) {
        this.moveTarget = null;
      } else {
        h = Phaser.Math.Clamp(du * 6, -1, 1);
        v = Phaser.Math.Clamp(dv * 6, -1, 1);
      }
    }

    const running = k.shift.isDown && (h !== 0 || v !== 0);
    const speed = running ? RUN_MULTIPLIER : 1;

    if (h !== 0 && v !== 0) {
      const correction = Math.SQRT1_2;
      h *= correction;
      v *= correction;
    }

    // Axis-separated so a blocked direction slides instead of sticking.
    const nextU = this.pos.u + h * WALK_U * speed * seconds;
    if (!isBlocked(DECK_BLOCKERS, nextU, this.pos.v)) {
      this.pos.u = nextU;
    }
    const nextV = Phaser.Math.Clamp(this.pos.v + v * WALK_V * speed * seconds, 0.02, 0.97);
    if (!isBlocked(DECK_BLOCKERS, this.pos.u, nextV)) {
      this.pos.v = nextV;
    }

    // Walking off the port side is the way out of the room.
    if (this.pos.u <= -0.96) {
      this.toCorridor();
      return;
    }
    this.pos.u = Phaser.Math.Clamp(this.pos.u, -0.96, 0.94);

    if (h !== 0 || v !== 0) {
      // Depth reads slower than width on a trapezoid floor, so bias the facing
      // toward the axis that actually moved the character on screen.
      this.facing = facingFromVector(h, v * 0.7);
      this.player.play(running ? runAnimFor(this.facing) : walkAnimFor(this.facing), true);
    } else {
      this.player.play(idleAnimFor(this.facing), true);
    }

    this.applyPosition();
    this.updateStations();
  }

  /**
   * Lifts him along a sine arc while the flip plays and carries him forward.
   * Airborne time is clipped to FLIP.liftStart/liftEnd so the arc lines up with
   * the frames where he is actually off the deck.
   */
  private updateHop(): void {
    if (!this.hop) return;
    const t = Phaser.Math.Clamp((this.time.now - this.hop.start) / this.hop.duration, 0, 1);
    this.pos.u = Phaser.Math.Linear(this.hop.fromU, this.hop.toU, t);

    const span = FLIP.liftEnd - FLIP.liftStart;
    const air = Phaser.Math.Clamp((t - FLIP.liftStart) / span, 0, 1);
    this.hopOffset = Math.sin(Math.PI * air) * FLIP.hopPeak;
  }

  private applyPosition(): void {
    const p = projectFloor(DECK_FLOOR, this.pos);
    // The shadow stays on the deck while he rises, which is what sells the jump.
    const lift = Math.round(this.hopOffset * p.scale);
    this.player.setPosition(p.x, p.y - lift).setScale(p.scale).setDepth(Math.round(p.y));
    this.shadow
      .setPosition(p.x, p.y - 3)
      .setScale(p.scale * (1 - this.hopOffset / (FLIP.hopPeak * 3)), p.scale)
      .setDepth(Math.round(p.y) - 1)
      .setAlpha(Phaser.Math.Linear(0.22, 0.46, this.pos.v) * (1 - this.hopOffset / (FLIP.hopPeak * 2.2)));
  }

  private updateStations(): void {
    let nearest: Station | null = null;
    let bestDistance = Number.POSITIVE_INFINITY;

    for (const station of DECK_STATIONS) {
      const du = station.u - this.pos.u;
      const dv = (station.v - this.pos.v) * 1.6;
      const distance = Math.hypot(du, dv);
      const marker = this.markers.get(station.id);
      const label = this.labels.get(station.id);
      const close = distance < NEAR_STATION * 2.4;
      marker?.setStrokeStyle(close ? 2 : 0, station.color, 0.9);
      label?.setAlpha(close ? 1 : 0.72);
      if (distance < bestDistance) {
        bestDistance = distance;
        nearest = station;
      }
    }

    this.activeStation = bestDistance < NEAR_STATION ? nearest : null;

    if (this.activeStation) {
      this.prompt.setText(`[E]  OPEN ${this.activeStation.label}`).setVisible(true);
    } else if (this.pos.u < -0.7) {
      this.prompt.setText('KEEP WALKING LEFT TO REACH THE CORRIDOR').setVisible(true);
    } else {
      this.prompt.setVisible(false);
    }
  }
}
