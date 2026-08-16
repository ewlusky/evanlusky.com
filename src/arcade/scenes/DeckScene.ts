import Phaser from 'phaser';
import {
  DECK_BLOCKERS,
  DECK_CHAIR,
  DECK_FLOOR,
  DECK_STATIONS,
  EXIT_LANE_MIN_V,
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
  private hovered = new Set<string>();
  private leaving = false;
  private playingGuitar = false;
  private seated = false;
  private guitarLoop?: Phaser.Sound.BaseSound;
  private readonly debug = new URLSearchParams(window.location.search).has('debug');
  private debugReadout?: Phaser.GameObjects.Text;
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

    this.resetState();
    this.add.image(0, 0, 'room-deck').setOrigin(0).setDisplaySize(width, height).setDepth(0);
    this.buildViewport();
    this.buildDoor();
    this.buildStations();

    this.shadow = this.add.ellipse(0, 0, 74, 20, 0x000000, 0.4).setDepth(1);
    this.player = this.add.sprite(0, 0, 'base-idle-south', 0);
    this.player.setOrigin(manifest.footPivot.x, manifest.footPivot.y);
    this.player.play('idle-south');

    this.buildChair();
    this.buildForeground();
    this.buildHud();
    this.bindInput();
    this.startTheme();
    this.applyPosition();
    if (this.debug) this.buildDebugOverlay();
    this.game.events.emit('arcade:ready');
  }

  /** The site's touch controls and station buttons come through here. */
  public interactNearby(): void {
    this.tryInteract();
  }

  /** Virtual d-pad state shared by the page's touch controls. */
  private virtual(): { up: boolean; down: boolean; left: boolean; right: boolean } {
    return (
      (this.registry.get('virtual-input') as { up: boolean; down: boolean; left: boolean; right: boolean }) ?? {
        up: false,
        down: false,
        left: false,
        right: false,
      }
    );
  }

  /**
   * Phaser keeps one instance per scene and only runs field initializers when
   * it is constructed, so every restart has to clear its own state by hand.
   * Without this, `leaving` stays true after you walk out and come back, and
   * update() bails on the first line forever.
   */
  private resetState(): void {
    this.leaving = false;
    this.busyUntil = 0;
    this.hop = null;
    this.hopOffset = 0;
    this.moveTarget = null;
    this.activeStation = null;
    this.facing = 'south';
    // Coming back from the corridor puts him at the port entrance rings,
    // right where he left, instead of teleporting to the middle of the room.
    if (this.registry.get('deck-entry') === 'port') {
      this.registry.remove('deck-entry');
      this.pos = { u: -0.88, v: 0.74 };
      this.facing = 'east';
    } else {
      this.pos = { u: 0, v: 0.55 };
    }
    this.markers.clear();
    this.labels.clear();
    this.hovered.clear();
    this.playingGuitar = false;
    this.seated = false;
    this.input.keyboard?.removeAllListeners();
  }

  /**
   * The chair is drawn from the room art at its original position, so the
   * pixels line up exactly. Giving it a depth of its own base lets him pass
   * behind it when he is further back and in front of it when he is nearer.
   */
  private buildChair(): void {
    this.add
      .image(DECK_CHAIR.x, DECK_CHAIR.y, 'deck-chair')
      .setOrigin(0)
      .setDepth(DECK_CHAIR.baseY);
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

      // Labels live IN the world: their depth is the station's floor depth,
      // so walking in front of one occludes it like any other furniture.
      const label = this.add
        .text(p.x, p.y - 96 * p.scale, station.label, {
          fontFamily: 'monospace',
          fontSize: '12px',
          color: '#e8f4ff',
          backgroundColor: 'rgba(4,8,14,0.7)',
          padding: { x: 5, y: 3 },
        })
        .setOrigin(0.5)
        .setDepth(p.y)
        .setResolution(2)
        .setAlpha(0.85);
      label.setInteractive({ useHandCursor: true });
      label.on('pointerdown', (_p: Phaser.Input.Pointer, _x: number, _y: number, event: Event) => {
        event.stopPropagation();
        this.openSection(station, true);
      });
      label.on('pointerover', () => {
        this.hovered.add(station.id);
        this.refreshStationLook(station);
      });
      label.on('pointerout', () => {
        this.hovered.delete(station.id);
        this.refreshStationLook(station);
      });
      this.labels.set(station.id, label);
    }
  }

  /**
   * One look for both attention states: hovering a label and standing at the
   * station do the same thing, including swapping the themed name for what it
   * actually opens.
   */
  private refreshStationLook(station: Station): void {
    const active = this.hovered.has(station.id) || this.activeStation?.id === station.id;
    const marker = this.markers.get(station.id);
    const label = this.labels.get(station.id);
    marker?.setStrokeStyle(active ? 2 : 0, station.color, 0.9);
    label?.setAlpha(active ? 1 : 0.72);
    label?.setText(active ? station.opens.toUpperCase() : station.label);
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
      .text(width - 18, 14, 'WASD MOVE · SPACE FLIP · E USE · G DANCE · R GUITAR', {
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

    // Stop the browser scrolling the page when the game wants these keys.
    kb.addCapture([K.SPACE, K.UP, K.DOWN, K.LEFT, K.RIGHT]);

    kb.on('keydown-E', () => this.tryInteract());
    kb.on('keydown-ENTER', () => this.tryInteract());
    kb.on('keydown-F', () => this.playFlourish('flip'));
    kb.on('keydown-SPACE', () => this.playFlourish('flip'));
    kb.on('keydown-G', () => this.playFlourish('dance'));
    kb.on('keydown-R', () => this.toggleGuitar());

    // Click movement is off: the mouse is for the labels, the keys are for him.
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (this.playingGuitar) this.stopGuitar();
      if (this.debug) {
        const p = this.unproject(pointer.worldX, pointer.worldY);
        console.log(`floor u: ${p.u.toFixed(3)}  v: ${p.v.toFixed(3)}`);
      }
    });
  }

  /**
   * Draws every blocker and reports the floor coordinate under the cursor, so
   * new collision rectangles can be read straight off the screen.
   * Open the arcade with ?debug=1.
   */
  private buildDebugOverlay(): void {
    const g = this.add.graphics().setDepth(5000);
    g.lineStyle(1, 0xff3860, 0.9);
    g.fillStyle(0xff3860, 0.14);
    for (const b of DECK_BLOCKERS) {
      const corners = [
        projectFloor(DECK_FLOOR, { u: b.u0, v: b.v0 }),
        projectFloor(DECK_FLOOR, { u: b.u1, v: b.v0 }),
        projectFloor(DECK_FLOOR, { u: b.u1, v: b.v1 }),
        projectFloor(DECK_FLOOR, { u: b.u0, v: b.v1 }),
      ];
      g.beginPath();
      g.moveTo(corners[0].x, corners[0].y);
      for (const c of corners.slice(1)) g.lineTo(c.x, c.y);
      g.closePath();
      g.fillPath();
      g.strokePath();
    }

    // Floor grid every 0.1 in v, every 0.2 in u.
    g.lineStyle(1, 0x6fe7ff, 0.25);
    for (let v = 0; v <= 1.0001; v += 0.1) {
      const a = projectFloor(DECK_FLOOR, { u: -1, v });
      const b = projectFloor(DECK_FLOOR, { u: 1, v });
      g.lineBetween(a.x, a.y, b.x, b.y);
    }
    for (let u = -1; u <= 1.0001; u += 0.2) {
      const a = projectFloor(DECK_FLOOR, { u, v: 0 });
      const b = projectFloor(DECK_FLOOR, { u, v: 1 });
      g.lineBetween(a.x, a.y, b.x, b.y);
    }

    this.debugReadout = this.add
      .text(18, 64, '', {
        fontFamily: 'monospace',
        fontSize: '13px',
        color: '#ff3860',
        backgroundColor: 'rgba(4,8,14,0.85)',
        padding: { x: 6, y: 4 },
      })
      .setDepth(5001)
      .setResolution(2);

    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      const p = this.unproject(pointer.worldX, pointer.worldY);
      this.debugReadout?.setText(
        `cursor  u ${p.u.toFixed(3)}   v ${p.v.toFixed(3)}\nplayer  u ${this.pos.u.toFixed(3)}   v ${this.pos.v.toFixed(3)}`,
      );
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

  private playFlourish(kind: 'flip' | 'dance'): void {
    if (this.busy()) return;
    if (this.playingGuitar) this.stopGuitar();
    const facing4 = toFacing4(this.facing);
    let key: string;
    if (kind === 'flip') {
      // Moving: the travelling flip. Standing still: a two-footed hop.
      const k = this.keys;
      const moving =
        k.left.isDown || k.a.isDown || k.right.isDown || k.d.isDown ||
        k.up.isDown || k.w.isDown || k.down.isDown || k.s.isDown;
      const flipFacing = facing4 === 'north' ? 'south' : facing4;
      key = moving ? `flip-${flipFacing}` : `jump-still-${flipFacing}`;
      if (!this.anims.exists(key)) key = `flip-${flipFacing}`;
    } else {
      key = 'dance';
      this.facing = 'south';
    }
    if (!this.anims.exists(key)) return;

    this.moveTarget = null;
    this.player.play(key);
    const duration = this.animDuration(key);
    this.busyUntil = this.time.now + duration;

    if (kind === 'flip') {
      // The neutral jump goes straight up; the flip carries him forward.
      const travelling = key.startsWith('flip-');
      const forward = travelling ? (facing4 === 'west' ? -1 : facing4 === 'east' ? 1 : 0) : 0;
      const toU = Phaser.Math.Clamp(this.pos.u + forward * FLIP.travel, -0.94, 0.94);
      this.hop = {
        start: this.time.now,
        duration,
        fromU: this.pos.u,
        toU: isBlocked(DECK_BLOCKERS, toU, this.pos.v) ? this.pos.u : toU,
      };
    }

  }

  /**
   * He takes the guitar out and keeps playing until he is told otherwise:
   * press R again, walk, or click. The strum loop rides along with the
   * animation loop rather than a fixed number of repeats.
   */
  private toggleGuitar(): void {
    if (this.playingGuitar) {
      this.stopGuitar();
      return;
    }
    if (this.busy()) return;
    if (!this.anims.exists('guitar-summon')) return;

    this.moveTarget = null;
    this.facing = 'south';
    this.playingGuitar = true;
    this.player.play('guitar-summon');
    this.busyUntil = this.time.now + this.animDuration('guitar-summon');
    this.playSound('guitar-summon-sfx', 0.5);

    this.player.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => {
      if (!this.playingGuitar || !this.anims.exists('guitar-play')) return;
      this.player.play('guitar-play');
      this.busyUntil = 0;
      if (this.cache.audio.exists('guitar-loop')) {
        this.guitarLoop = this.sound.add('guitar-loop', { loop: true, volume: 0.5 });
        this.guitarLoop.play();
        this.setThemeVolume(0.08);
      }
    });
  }

  private stopGuitar(): void {
    if (!this.playingGuitar) return;
    this.playingGuitar = false;
    this.guitarLoop?.stop();
    this.guitarLoop = undefined;
    this.setThemeVolume(0.32);
    this.busyUntil = 0;
    this.player.play(idleAnimFor(this.facing), true);
  }

  /** Both sound backends expose setVolume, but the base type does not. */
  private setThemeVolume(value: number): void {
    const sound = this.theme as (Phaser.Sound.BaseSound & { setVolume?: (v: number) => void }) | undefined;
    sound?.setVolume?.(value);
  }

  /** Plays a sound only if it actually made it into the bundle. */
  private playSound(key: string, volume: number): void {
    if (this.cache.audio.exists(key)) this.sound.play(key, { volume });
  }

  private tryInteract(): void {
    if (this.seated) {
      this.standUp();
      return;
    }
    if (this.busy()) return;
    if (this.activeStation?.sit) {
      this.sitDown(this.activeStation);
      return;
    }
    if (this.activeStation) {
      this.openSection(this.activeStation);
      return;
    }
    // Nothing nearby: he presses a button that is not there.
    const idleKey = `push-${toFacing4(this.facing)}`;
    if (this.anims.exists(idleKey)) {
      this.player.play(idleKey);
      this.busyUntil = this.time.now + this.animDuration(idleKey);
    }
  }

  /**
   * The Tool Forge IS the pilot's seat: he walks behind it, drops in, works
   * the holo screen, and the Skills panel arrives while he is still typing.
   */
  private sitDown(station?: Station): void {
    if (!this.anims.exists('sit-down') || !this.anims.exists('sit-loop')) return;
    this.seated = true;
    this.moveTarget = null;
    if (this.playingGuitar) this.stopGuitar();
    this.pos.u = DECK_CHAIR.seatU;
    this.pos.v = DECK_CHAIR.seatV;
    this.applyPosition();
    this.player.play('sit-down');
    this.busyUntil = this.time.now + this.animDuration('sit-down');
    this.playSound('interact', 0.4);
    this.player.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => {
      if (!this.seated) return;
      const seatedLoop = station && this.anims.exists('sit-screen') ? 'sit-screen' : 'sit-loop';
      this.player.play(seatedLoop);
      this.busyUntil = 0;
      if (station) {
        this.time.delayedCall(900, () => {
          if (!this.seated) return;
          this.playSound('chime', 0.4);
          this.cameras.main.flash(180, 40, 90, 120);
          this.game.events.emit('arcade:open-section', station.section);
        });
      }
    });
  }

  private standUp(): void {
    if (!this.seated) return;
    this.seated = false;
    if (this.anims.exists('sit-stand')) {
      this.player.play('sit-stand');
      this.busyUntil = this.time.now + this.animDuration('sit-stand');
    }
    this.pos.u = DECK_CHAIR.standU;
    this.pos.v = DECK_CHAIR.standV;
    this.facing = 'south';
  }

  /**
   * Walking up and pressing E lets him work the console before the panel
   * appears, because that animation is worth watching. Clicking a station
   * label directly is a deliberate shortcut and opens straight away.
   */
  private openSection(station: Station, immediate = false): void {
    if (this.busy()) return;
    if (this.playingGuitar) this.stopGuitar();
    this.moveTarget = null;

    const reveal = () => {
      this.cameras.main.flash(180, 40, 90, 120);
      this.game.events.emit('arcade:open-section', station.section);
    };

    // Turn toward the console he is actually using before the animation.
    if (!immediate) {
      const du = station.u - this.pos.u;
      const dv = (station.v - this.pos.v) * 0.7;
      if (Math.abs(du) > 0.02 || Math.abs(dv) > 0.02) {
        this.facing = facingFromVector(du, dv);
      }
    }

    const facing4 = toFacing4(this.facing);
    const startKey = `screen-start-${facing4}`;
    const loopKey = `screen-loop-${facing4}`;
    const key = this.anims.exists(startKey) ? startKey : `console-${facing4}`;
    if (immediate || !this.anims.exists(key)) {
      this.playSound('chime', 0.4);
      reveal();
      return;
    }

    // He brings the holo screen up, works it for a beat, then the panel
    // arrives. The animation is the point; let it play.
    this.player.play(key);
    const duration = this.animDuration(key) + (key === startKey ? 650 : 0);
    this.busyUntil = this.time.now + duration;
    this.playSound('interact', 0.45);
    if (key === startKey && this.anims.exists(loopKey)) {
      this.player.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => this.player.play(loopKey));
    }
    this.time.delayedCall(duration, () => {
      this.playSound('chime', 0.4);
      reveal();
    });
  }

  private toCorridor(): void {
    if (this.leaving) return;
    this.leaving = true;
    this.playSound('transition', 0.5);
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

    if (this.seated) {
      const k = this.keys;
      const wantsUp =
        k.left.isDown || k.a.isDown || k.right.isDown || k.d.isDown ||
        k.up.isDown || k.w.isDown || k.down.isDown || k.s.isDown;
      if (wantsUp) {
        this.standUp();
      } else {
        this.prompt.setText('[E]  STAND UP').setVisible(true);
        this.applyPosition();
        return;
      }
    }
    if (this.hop) {
      this.hop = null;
      this.hopOffset = 0;
    }

    const k = this.keys;
    const vi = this.virtual();
    let h = 0;
    let v = 0;
    if (k.left.isDown || k.a.isDown || vi.left) h -= 1;
    if (k.right.isDown || k.d.isDown || vi.right) h += 1;
    if (k.up.isDown || k.w.isDown || vi.up) v -= 1;
    if (k.down.isDown || k.s.isDown || vi.down) v += 1;

    if (h !== 0 || v !== 0) {
      this.moveTarget = null;
      if (this.playingGuitar) this.stopGuitar();
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

    // The way out is the foreground passage, walking in front of the port
    // consoles. Further back, the console bank blocks the way.
    if (this.pos.u <= -0.96 && this.pos.v >= EXIT_LANE_MIN_V) {
      this.toCorridor();
      return;
    }
    this.pos.u = Phaser.Math.Clamp(this.pos.u, -0.96, 0.94);

    if (h !== 0 || v !== 0) {
      // Depth reads slower than width on a trapezoid floor, so bias the facing
      // toward the axis that actually moved the character on screen.
      this.facing = facingFromVector(h, v * 0.7);
      this.player.play(running ? runAnimFor(this.facing) : walkAnimFor(this.facing), true);
    } else if (!this.playingGuitar) {
      // The idle override must not stomp the strumming loop, or the guitar
      // gets "put away" one frame after the summon finishes.
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
    // Seated, he belongs in front of the chair rather than sorted behind it.
    const depth = this.seated ? DECK_CHAIR.baseY + 2 : Math.round(p.y);
    this.player.setPosition(p.x, p.y - lift).setScale(p.scale).setDepth(depth);
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

    const previous = this.activeStation;
    this.activeStation = bestDistance < NEAR_STATION ? nearest : null;
    if (previous?.id !== this.activeStation?.id) {
      if (previous) this.refreshStationLook(previous);
      if (this.activeStation) this.refreshStationLook(this.activeStation);
    }

    if (this.activeStation?.sit) {
      this.prompt.setText(`[E]  SIT DOWN · ${this.activeStation.opens.toUpperCase()}`).setVisible(true);
    } else if (this.activeStation) {
      this.prompt.setText(`[E]  OPEN ${this.activeStation.opens.toUpperCase()}`).setVisible(true);
    } else if (this.pos.u < -0.7 && this.pos.v >= EXIT_LANE_MIN_V) {
      this.prompt.setText('KEEP WALKING LEFT TO REACH THE CORRIDOR').setVisible(true);
    } else {
      this.prompt.setVisible(false);
    }
  }
}
