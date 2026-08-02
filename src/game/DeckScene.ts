import Phaser from 'phaser';
import { go } from '../router';
import { DECOR, DOOR, HOTSPOTS, ROOM, ROOM_COLLIDERS, SPAWN, type Hotspot } from './hotspots';

const CANVAS_W = 400;
const CANVAS_H = 224;
const SPEED = 78;
const ZONE_PAD = 12;

type Dir = 'down' | 'left' | 'right' | 'up';

/**
 * Evan's PixelLab character, packed at half scale into 46x46 frames.
 * Row order in every sheet: east, north, west, south (right/up/left/down).
 * Character art occupies ~x17-30, y11-34 within the cell; feet at y~34.
 */
const EVAN = {
  frame: 46,
  rows: { right: 0, up: 1, left: 2, down: 3 } as Record<Dir, number>,
  walkFrames: 8,
  idleFrames: 8,
  interactFrames: 17,
  body: { w: 12, h: 6, ox: 17, oy: 28 },
  feet: 11,
};

export class DeckScene extends Phaser.Scene {
  private player!: Phaser.Physics.Arcade.Sprite;
  private keys!: Record<'W' | 'A' | 'S' | 'D' | 'UP' | 'DOWN' | 'LEFT' | 'RIGHT', Phaser.Input.Keyboard.Key>;
  private moveTarget: Phaser.Math.Vector2 | null = null;
  private facing: Dir = 'down';
  private starsFar!: Phaser.GameObjects.TileSprite;
  private starsNear!: Phaser.GameObjects.TileSprite;
  private door?: Phaser.GameObjects.Sprite;
  private doorOpen = false;
  private sparks!: Phaser.GameObjects.Particles.ParticleEmitter;
  private props = new Map<string, Phaser.GameObjects.Image | Phaser.GameObjects.Sprite>();
  private labels = new Map<string, Phaser.GameObjects.Text>();
  private zoneRects = new Map<string, Phaser.Geom.Rectangle>();
  private engaged = new Set<string>();
  private inCutscene = false;
  private interacting = false;
  private lastTriggerAt = 0;
  private blockedFrames = 0;
  private lastPos = new Phaser.Math.Vector2();

  constructor() {
    super('deck');
  }

  preload(): void {
    this.load.image('stars_far', 'assets/stars_far.png');
    this.load.image('stars_near', 'assets/stars_near.png');
    this.load.image('room_under', 'assets/room_under.png');
    this.load.image('room_mid', 'assets/room_mid.png');
    this.load.image('room_over', 'assets/room_over.png');
    this.load.spritesheet('evan_walk', 'assets/evan_walk.png', { frameWidth: 46, frameHeight: 46 });
    this.load.spritesheet('evan_idle', 'assets/evan_idle.png', { frameWidth: 46, frameHeight: 46 });
    this.load.spritesheet('evan_interact', 'assets/evan_interact.png', { frameWidth: 46, frameHeight: 46 });
    this.load.audio('door_open', 'assets/audio/door_open.mp3');
    this.load.audio('door_close', 'assets/audio/door_close.mp3');
    this.load.audio('blip', 'assets/audio/blip.wav');
    this.load.spritesheet('screens', 'assets/screens.png', { frameWidth: 64, frameHeight: 48 });
    this.load.spritesheet('server', 'assets/server.png', { frameWidth: 16, frameHeight: 48 });
    this.load.spritesheet('door', 'assets/door.png', { frameWidth: 32, frameHeight: 32 });
    this.load.spritesheet('guitar_summon', 'assets/guitar_summon.png', { frameWidth: 92, frameHeight: 92 });
    this.load.spritesheet('guitar_play', 'assets/guitar_play.png', { frameWidth: 92, frameHeight: 92 });
  }

  create(): void {
    this.makeGeneratedTextures();
    this.makeAnims();
    this.buildSpace();
    this.buildRoom();
    this.buildPlayer();
    this.buildHotspots();
    this.bindInput();
  }

  private makeGeneratedTextures(): void {
    const g = this.add.graphics();

    g.fillStyle(0xffe66e).fillRect(0, 0, 2, 2);
    g.generateTexture('spark', 2, 2);
    g.clear();

    // placeholder props for hotspots without pack art
    for (const h of HOTSPOTS) {
      if (h.texture) continue;
      const base = Phaser.Display.Color.ValueToColor(h.color);
      const dark = base.clone().darken(45).color;
      const mid = base.clone().darken(20).color;
      g.fillStyle(0x05070d).fillRect(0, 0, h.w, h.h);
      g.fillStyle(dark).fillRect(1, 1, h.w - 2, h.h - 2);
      g.fillStyle(mid).fillRect(2, 2, h.w - 4, Math.max(2, Math.floor(h.h / 2) - 2));
      g.fillStyle(h.color).fillRect(
        Math.floor(h.w / 2) - Math.max(2, Math.floor(h.w / 4)),
        Math.floor(h.h / 4),
        Math.max(4, Math.floor(h.w / 2)),
        Math.max(2, Math.floor(h.h / 4)),
      );
      g.generateTexture(`prop-${h.id}`, h.w, h.h);
      g.clear();
    }

    g.destroy();
  }

  private makeAnims(): void {
    (['right', 'up', 'left', 'down'] as Dir[]).forEach((dir) => {
      const row = EVAN.rows[dir];
      this.anims.create({
        key: `walk-${dir}`,
        frames: this.anims.generateFrameNumbers('evan_walk', { start: row * EVAN.walkFrames, end: row * EVAN.walkFrames + EVAN.walkFrames - 1 }),
        frameRate: 12,
        repeat: -1,
      });
      this.anims.create({
        key: `idle-${dir}`,
        frames: this.anims.generateFrameNumbers('evan_idle', { start: row * EVAN.idleFrames, end: row * EVAN.idleFrames + EVAN.idleFrames - 1 }),
        frameRate: 6,
        repeat: -1,
      });
      this.anims.create({
        key: `interact-${dir}`,
        frames: this.anims.generateFrameNumbers('evan_interact', { start: row * EVAN.interactFrames, end: row * EVAN.interactFrames + EVAN.interactFrames - 1 }),
        frameRate: 20,
      });
    });

    this.anims.create({
      key: 'screens-flicker',
      frames: this.anims.generateFrameNumbers('screens', { start: 0, end: 10 }),
      frameRate: 6,
      repeat: -1,
    });
    this.anims.create({
      key: 'server-blink',
      frames: this.anims.generateFrameNumbers('server', { start: 0, end: 2 }),
      frameRate: 2,
      repeat: -1,
    });
    this.anims.create({
      key: 'door-open',
      frames: this.anims.generateFrameNumbers('door', { start: 0, end: 13 }),
      frameRate: 24,
    });
    this.anims.create({
      key: 'guitar-summon',
      frames: this.anims.generateFrameNumbers('guitar_summon', { start: 0, end: 16 }),
      frameRate: 12,
    });
    this.anims.create({
      key: 'guitar-riff',
      frames: this.anims.generateFrameNumbers('guitar_play', { start: 0, end: 16 }),
      frameRate: 12,
      repeat: 1,
    });
  }

  private buildSpace(): void {
    this.starsFar = this.add.tileSprite(0, 0, CANVAS_W, CANVAS_H, 'stars_far').setOrigin(0).setDepth(-10);
    this.starsNear = this.add.tileSprite(0, 0, CANVAS_W, CANVAS_H, 'stars_near').setOrigin(0).setDepth(-9);
  }

  private buildRoom(): void {
    this.add.image(ROOM.x, ROOM.y, 'room_under').setOrigin(0).setDepth(0);
    this.add.image(ROOM.x, ROOM.y, 'room_mid').setOrigin(0).setDepth(900);
    this.add.image(ROOM.x, ROOM.y, 'room_over').setOrigin(0).setDepth(950);

    for (const d of DECOR) {
      this.add.sprite(d.x, d.y, d.key).setOrigin(0).setDepth(2).play(`${d.key}-flicker`);
    }

    this.door = this.add.sprite(DOOR.x, DOOR.y, 'door', 0).setDepth(3);

    const b = ROOM.bounds;
    this.physics.world.setBounds(b.x, b.y, b.w, b.h);
  }

  private buildPlayer(): void {
    this.player = this.physics.add.sprite(SPAWN.x, SPAWN.y, 'evan_idle', EVAN.rows.down * EVAN.idleFrames);
    this.player.setCollideWorldBounds(true);
    this.player.body!.setSize(EVAN.body.w, EVAN.body.h);
    this.player.body!.setOffset(EVAN.body.ox, EVAN.body.oy);
    this.player.anims.play('idle-down');
  }

  private buildHotspots(): void {
    const solids = this.physics.add.staticGroup();
    const zones: Phaser.GameObjects.Zone[] = [];

    this.sparks = this.add.particles(0, 0, 'spark', {
      speed: { min: 15, max: 55 },
      lifespan: { min: 200, max: 450 },
      gravityY: 60,
      quantity: 1,
      emitting: false,
    });
    this.sparks.setDepth(1500);

    for (const r of ROOM_COLLIDERS) {
      const block = this.add.rectangle(r.x + r.w / 2, r.y + r.h / 2, r.w, r.h).setVisible(false);
      this.physics.add.existing(block, true);
      solids.add(block);
    }

    for (const h of HOTSPOTS) {
      const cx = h.x + h.w / 2;
      const cy = h.y + h.h / 2;

      // the console is the room's own desk: no extra sprite, no extra solid
      if (h.id !== 'console') {
        let prop: Phaser.GameObjects.Image | Phaser.GameObjects.Sprite;
        if (h.texture) {
          const sprite = this.add.sprite(cx, cy, h.texture);
          if (h.frameRate) sprite.play(`${h.texture}-blink`);
          prop = sprite;
        } else {
          prop = this.add.image(cx, cy, `prop-${h.id}`);
        }
        prop.setDepth(h.y + h.h);
        this.props.set(h.id, prop);

        const solid = this.add.rectangle(cx, cy + 2, h.w, Math.max(6, h.h - 8)).setVisible(false);
        this.physics.add.existing(solid, true);
        solids.add(solid);

        if (h.pulse) {
          this.tweens.add({ targets: prop, alpha: { from: 1, to: 0.72 }, duration: 750, yoyo: true, repeat: -1 });
        }
      }

      const label = this.add
        .text(cx, h.y - 4, h.label, {
          fontFamily: 'monospace',
          fontSize: '8px',
          color: '#d8dcf0',
          backgroundColor: 'rgba(5, 7, 13, 0.75)',
          padding: { x: 2, y: 1 },
        })
        .setOrigin(0.5, 1)
        .setResolution(3)
        .setDepth(1600);
      this.labels.set(h.id, label);

      const pad = h.zonePad ?? ZONE_PAD;
      const rect = new Phaser.Geom.Rectangle(h.x - pad, h.y - pad, h.w + pad * 2, h.h + pad * 2);
      this.zoneRects.set(h.id, rect);

      const zone = this.add.zone(rect.x, rect.y, rect.width, rect.height).setOrigin(0);
      this.physics.add.existing(zone, true);
      zone.setData('hotspot', h);
      zones.push(zone);

      if (h.sparking) {
        this.time.addEvent({
          delay: 900,
          loop: true,
          callback: () => {
            if (!this.inCutscene) this.sparks.explode(3, cx + Phaser.Math.Between(-6, 6), cy - 4);
          },
        });
      }
    }

    this.physics.add.collider(this.player, solids);
    this.physics.add.overlap(this.player, zones, (_player, zoneObj) => {
      const h = (zoneObj as Phaser.GameObjects.Zone).getData('hotspot') as Hotspot;
      this.trigger(h);
    });
  }

  private bindInput(): void {
    const kb = this.input.keyboard!;
    const K = Phaser.Input.Keyboard.KeyCodes;
    const codes = [K.W, K.A, K.S, K.D, K.UP, K.DOWN, K.LEFT, K.RIGHT];

    // captures only while the cursor is over the canvas, so arrow keys still
    // scroll the page everywhere else
    this.keys = kb.addKeys(
      { W: K.W, A: K.A, S: K.S, D: K.D, UP: K.UP, DOWN: K.DOWN, LEFT: K.LEFT, RIGHT: K.RIGHT },
      false,
    ) as DeckScene['keys'];

    const canvas = this.game.canvas;
    canvas.addEventListener('mouseenter', () => kb.addCapture(codes));
    canvas.addEventListener('mouseleave', () => kb.removeCapture(codes));

    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (this.inCutscene || this.interacting) return;
      const b = ROOM.bounds;
      this.moveTarget = new Phaser.Math.Vector2(
        Phaser.Math.Clamp(pointer.worldX, b.x + 6, b.x + b.w - 6),
        Phaser.Math.Clamp(pointer.worldY, b.y + 8, b.y + b.h - 4),
      );
    });
  }

  private trigger(h: Hotspot): void {
    if (this.inCutscene || this.interacting || this.engaged.has(h.id)) return;
    // adjacent zones can graze each other; one route per moment
    if (this.time.now - this.lastTriggerAt < 700) return;
    this.lastTriggerAt = this.time.now;
    this.engaged.add(h.id);

    const cx = h.x + h.w / 2;
    const cy = h.y + h.h / 2;
    const prop = this.props.get(h.id);

    if (h.cutscene) {
      this.playGuitarCutscene(h);
      return;
    }

    // face the prop and actually touch it before anything happens
    this.interacting = true;
    this.moveTarget = null;
    this.player.setVelocity(0);
    const dx = cx - this.player.x;
    const dy = cy - (this.player.y + EVAN.feet);
    this.facing = Math.abs(dx) >= Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : dy > 0 ? 'down' : 'up';
    this.player.anims.play(`interact-${this.facing}`);
    this.sound.play('blip', { volume: 0.25 });

    this.player.once(`${Phaser.Animations.Events.ANIMATION_COMPLETE_KEY}interact-${this.facing}`, () => {
      this.interacting = false;
      if (prop) {
        this.tweens.add({ targets: prop, scaleX: 1.12, scaleY: 1.12, duration: 90, yoyo: true, repeat: 1 });
      }
      if (h.sparking) {
        this.sparks.explode(26, cx, cy - 4);
        this.cameras.main.shake(140, 0.004);
        const label = this.labels.get(h.id)!;
        label.setText('REPAIRED! ...FOR NOW');
        this.time.delayedCall(1800, () => label.setText(h.label));
        return;
      }
      this.sparks.explode(10, cx, cy);
      if (h.route) {
        this.time.delayedCall(250, () => go(h.route!));
      }
    });
  }

  private playGuitarCutscene(h: Hotspot): void {
    this.inCutscene = true;
    this.player.setVelocity(0);
    this.moveTarget = null;

    const dim = this.add.rectangle(CANVAS_W / 2, CANVAS_H / 2, CANVAS_W, CANVAS_H, 0x05070d, 0).setDepth(1990);
    const star = this.add.sprite(CANVAS_W / 2, CANVAS_H / 2 + 6, 'guitar_summon', 0).setScale(2).setDepth(2000);
    this.tweens.add({ targets: dim, fillAlpha: 0.75, duration: 250 });

    let finished = false;
    const finish = () => {
      if (finished) return;
      finished = true;
      this.events.emit('cutscene-finished');
      this.tweens.add({
        targets: [dim, star],
        alpha: 0,
        duration: 250,
        onComplete: () => {
          dim.destroy();
          star.destroy();
          this.inCutscene = false;
          if (h.route) go(h.route);
        },
      });
    };

    star.play('guitar-summon');
    star.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => {
      if (finished) return;
      star.play('guitar-riff');
      star.once(Phaser.Animations.Events.ANIMATION_COMPLETE, finish);
    });

    // click or any fresh keypress skips, but not the held key that walked us
    // in here (its auto-repeat keydowns would end the show instantly)
    const onSkipKey = (e: KeyboardEvent) => {
      if (!e.repeat) finish();
    };
    this.time.delayedCall(600, () => {
      if (finished) return;
      this.input.once('pointerdown', finish);
      this.input.keyboard!.on('keydown', onSkipKey);
    });
    this.events.once('cutscene-finished', () => this.input.keyboard!.off('keydown', onSkipKey));
    this.time.delayedCall(6500, finish);
  }

  update(_time: number, delta: number): void {
    const dt = delta / 1000;
    this.starsFar.tilePositionX += 3 * dt;
    this.starsNear.tilePositionX += 8 * dt;

    if (this.inCutscene) return;

    if (this.interacting) {
      this.player.setVelocity(0);
      this.player.setDepth(this.player.y + EVAN.feet);
      return;
    }

    const k = this.keys;
    const left = k.A.isDown || k.LEFT.isDown;
    const right = k.D.isDown || k.RIGHT.isDown;
    const up = k.W.isDown || k.UP.isDown;
    const down = k.S.isDown || k.DOWN.isDown;

    let vx = 0;
    let vy = 0;

    if (left || right || up || down) {
      this.moveTarget = null;
      vx = (right ? 1 : 0) - (left ? 1 : 0);
      vy = (down ? 1 : 0) - (up ? 1 : 0);
      const len = Math.hypot(vx, vy) || 1;
      vx = (vx / len) * SPEED;
      vy = (vy / len) * SPEED;
      this.player.setVelocity(vx, vy);
    } else if (this.moveTarget) {
      const dist = Phaser.Math.Distance.Between(this.player.x, this.player.y, this.moveTarget.x, this.moveTarget.y);
      // clicking ON a prop puts the target inside its collider; give up
      // instead of jogging against the furniture forever
      const moved = Phaser.Math.Distance.Between(this.player.x, this.player.y, this.lastPos.x, this.lastPos.y);
      this.blockedFrames = moved < 0.2 ? this.blockedFrames + 1 : 0;
      if (dist < 3 || this.blockedFrames > 8) {
        this.moveTarget = null;
        this.blockedFrames = 0;
        this.player.setVelocity(0);
      } else {
        this.physics.moveTo(this.player, this.moveTarget.x, this.moveTarget.y, SPEED);
      }
      vx = this.player.body!.velocity.x;
      vy = this.player.body!.velocity.y;
    } else {
      this.player.setVelocity(0);
    }
    this.lastPos.set(this.player.x, this.player.y);

    const moving = Math.abs(vx) > 5 || Math.abs(vy) > 5;
    if (moving) {
      this.facing = Math.abs(vx) >= Math.abs(vy) ? (vx > 0 ? 'right' : 'left') : vy > 0 ? 'down' : 'up';
      this.player.anims.play(`walk-${this.facing}`, true);
    } else {
      this.player.anims.play(`idle-${this.facing}`, true);
    }

    // y-sort against furniture; feet decide
    this.player.setDepth(this.player.y + EVAN.feet);

    // sliding door reacts to proximity
    if (this.door) {
      const nearDoor = Phaser.Math.Distance.Between(this.player.x, this.player.y + EVAN.feet, DOOR.x, DOOR.y) < 26;
      if (nearDoor && !this.doorOpen) {
        this.doorOpen = true;
        this.door.play('door-open');
        this.sound.play('door_open', { volume: 0.35 });
      } else if (!nearDoor && this.doorOpen) {
        this.doorOpen = false;
        this.door.anims.playReverse('door-open');
        this.sound.play('door_close', { volume: 0.35 });
      }
    }

    // re-arm hotspots once the player walks away; must use the same geometry
    // as the physics overlap (the body rect), or edge-standing re-triggers
    const b = this.player.body!;
    const bodyRect = new Phaser.Geom.Rectangle(b.x, b.y, b.width, b.height);
    for (const [id, rect] of this.zoneRects) {
      if (this.engaged.has(id) && !Phaser.Geom.Rectangle.Overlaps(rect, bodyRect)) {
        this.engaged.delete(id);
      }
    }
  }
}
