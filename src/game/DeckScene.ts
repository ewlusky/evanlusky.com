import Phaser from 'phaser';
import { go } from '../router';
import { HOTSPOTS, type Hotspot } from './hotspots';

const ROOM_W = 400;
const ROOM_H = 224;
const WALL = 16;
const SPEED = 85;
const ZONE_PAD = 12;

type Dir = 'down' | 'left' | 'right' | 'up';
const DIR_ROW: Record<Dir, number> = { down: 0, left: 1, right: 2, up: 3 };

export class DeckScene extends Phaser.Scene {
  private player!: Phaser.Physics.Arcade.Sprite;
  private keys!: Record<'W' | 'A' | 'S' | 'D' | 'UP' | 'DOWN' | 'LEFT' | 'RIGHT', Phaser.Input.Keyboard.Key>;
  private moveTarget: Phaser.Math.Vector2 | null = null;
  private facing: Dir = 'down';
  private sparks!: Phaser.GameObjects.Particles.ParticleEmitter;
  private props = new Map<string, Phaser.GameObjects.Image>();
  private labels = new Map<string, Phaser.GameObjects.Text>();
  private zoneRects = new Map<string, Phaser.Geom.Rectangle>();
  private engaged = new Set<string>();

  constructor() {
    super('deck');
  }

  create(): void {
    this.makeTextures();
    this.buildRoom();
    this.buildPlayer();
    this.buildHotspots();
    this.bindInput();
  }

  private makeTextures(): void {
    const g = this.add.graphics();

    // floor tile
    g.fillStyle(0x10142a).fillRect(0, 0, 16, 16);
    g.fillStyle(0x0c1022).fillRect(15, 0, 1, 16).fillRect(0, 15, 16, 1);
    g.fillStyle(0x161c38).fillRect(3, 3, 1, 1);
    g.generateTexture('floor', 16, 16);
    g.clear();

    // wall tile
    g.fillStyle(0x232b52).fillRect(0, 0, 16, 16);
    g.fillStyle(0x2f3a6e).fillRect(0, 0, 16, 2);
    g.fillStyle(0x141a36).fillRect(0, 12, 16, 4);
    g.generateTexture('wall', 16, 16);
    g.clear();

    // spark particle
    g.fillStyle(0xffe66e).fillRect(0, 0, 2, 2);
    g.generateTexture('spark', 2, 2);
    g.clear();

    // props
    for (const h of HOTSPOTS) {
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

    this.makePlayerTexture();
  }

  /**
   * Placeholder pixel-Evan: 16x24 frames, 4 directions x 4 walk frames on one
   * canvas. The real Aseprite/LimeZu sheet replaces this texture key and the
   * rest of the scene never knows the difference.
   */
  private makePlayerTexture(): void {
    const tex = this.textures.createCanvas('player', 64, 96);
    if (!tex) return;
    const ctx = tex.getContext();

    const SKIN = '#e8b89a';
    const SKIN_HI = '#f6d0b8';
    const BEARD = '#7a5340';
    const SHIRT = '#4a7dde';
    const OVERSHIRT = '#2b4a8f';
    const JEANS = '#3a4670';
    const SHOES = '#1c2030';
    const EYES = '#1a1d2c';

    (['down', 'left', 'right', 'up'] as Dir[]).forEach((dir) => {
      const row = DIR_ROW[dir];
      for (let f = 0; f < 4; f++) {
        const ox = f * 16;
        const oy = row * 24;
        const bob = f === 1 || f === 3 ? 1 : 0;

        // head (bald, with a top highlight)
        ctx.fillStyle = SKIN;
        ctx.fillRect(ox + 5, oy + 1 + bob, 6, 6);
        ctx.fillStyle = SKIN_HI;
        ctx.fillRect(ox + 6, oy + 1 + bob, 4, 1);

        if (dir !== 'up') {
          ctx.fillStyle = BEARD;
          ctx.fillRect(ox + 5, oy + 5 + bob, 6, 2);
          ctx.fillStyle = EYES;
          if (dir === 'down') {
            ctx.fillRect(ox + 6, oy + 3 + bob, 1, 1);
            ctx.fillRect(ox + 9, oy + 3 + bob, 1, 1);
          } else if (dir === 'left') {
            ctx.fillRect(ox + 5, oy + 3 + bob, 1, 1);
          } else {
            ctx.fillRect(ox + 10, oy + 3 + bob, 1, 1);
          }
        }

        // torso: open overshirt with shirt underneath (back view is all overshirt)
        ctx.fillStyle = OVERSHIRT;
        ctx.fillRect(ox + 3, oy + 8 + bob, 10, 7);
        if (dir !== 'up') {
          ctx.fillStyle = SHIRT;
          ctx.fillRect(ox + 6, oy + 8 + bob, 4, 6);
        }

        // jeans
        ctx.fillStyle = JEANS;
        ctx.fillRect(ox + 4, oy + 15 + bob, 8, 5);

        // feet: alternate steps on frames 1 and 3
        ctx.fillStyle = SHOES;
        if (f === 1) {
          ctx.fillRect(ox + 4, oy + 21, 3, 3);
          ctx.fillRect(ox + 9, oy + 20, 3, 2);
        } else if (f === 3) {
          ctx.fillRect(ox + 4, oy + 20, 3, 2);
          ctx.fillRect(ox + 9, oy + 21, 3, 3);
        } else {
          ctx.fillRect(ox + 4, oy + 20, 3, 3);
          ctx.fillRect(ox + 9, oy + 20, 3, 3);
        }
      }
    });

    tex.refresh();

    for (let i = 0; i < 16; i++) {
      const col = i % 4;
      const row = Math.floor(i / 4);
      tex.add(i, 0, col * 16, row * 24, 16, 24);
    }

    (['down', 'left', 'right', 'up'] as Dir[]).forEach((dir) => {
      const row = DIR_ROW[dir];
      this.anims.create({
        key: `walk-${dir}`,
        frames: [0, 1, 2, 3].map((f) => ({ key: 'player', frame: row * 4 + f })),
        frameRate: 8,
        repeat: -1,
      });
      this.anims.create({
        key: `idle-${dir}`,
        frames: [{ key: 'player', frame: row * 4 }],
      });
    });
  }

  private buildRoom(): void {
    this.add.tileSprite(0, 0, ROOM_W, ROOM_H, 'floor').setOrigin(0);
    this.add.tileSprite(0, 0, ROOM_W, WALL, 'wall').setOrigin(0);
    this.add.tileSprite(0, ROOM_H - WALL, ROOM_W, WALL, 'wall').setOrigin(0);
    this.add.tileSprite(0, WALL, WALL, ROOM_H - 2 * WALL, 'wall').setOrigin(0);
    this.add.tileSprite(ROOM_W - WALL, WALL, WALL, ROOM_H - 2 * WALL, 'wall').setOrigin(0);

    this.physics.world.setBounds(WALL, WALL, ROOM_W - 2 * WALL, ROOM_H - 2 * WALL);
  }

  private buildPlayer(): void {
    this.player = this.physics.add.sprite(ROOM_W / 2, 132, 'player', 0);
    this.player.setCollideWorldBounds(true);
    // collide from the feet, so the sprite can overlap walls/props a little
    this.player.body!.setSize(12, 8);
    this.player.body!.setOffset(2, 16);
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

    for (const h of HOTSPOTS) {
      const cx = h.x + h.w / 2;
      const cy = h.y + h.h / 2;

      const prop = solids.create(cx, cy, `prop-${h.id}`) as Phaser.GameObjects.Image;
      this.props.set(h.id, prop);

      if (h.pulse) {
        this.tweens.add({
          targets: prop,
          alpha: { from: 1, to: 0.7 },
          duration: 750,
          yoyo: true,
          repeat: -1,
        });
      }

      const label = this.add
        .text(cx, h.y - 3, h.label, {
          fontFamily: 'monospace',
          fontSize: '8px',
          color: '#d8dcf0',
          backgroundColor: 'rgba(5, 7, 13, 0.75)',
          padding: { x: 2, y: 1 },
        })
        .setOrigin(0.5, 1)
        .setResolution(3);
      this.labels.set(h.id, label);

      const rect = new Phaser.Geom.Rectangle(
        h.x - ZONE_PAD,
        h.y - ZONE_PAD,
        h.w + ZONE_PAD * 2,
        h.h + ZONE_PAD * 2,
      );
      this.zoneRects.set(h.id, rect);

      const zone = this.add.zone(rect.x, rect.y, rect.width, rect.height).setOrigin(0);
      this.physics.add.existing(zone, true);
      zone.setData('hotspot', h);
      zones.push(zone);

      if (h.sparking) {
        this.time.addEvent({
          delay: 900,
          loop: true,
          callback: () => this.sparks.explode(3, cx + Phaser.Math.Between(-6, 6), cy - 4),
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

    // no captures by default: keys move the character, but only capture (and
    // stop the page from scrolling) while the cursor is over the canvas
    this.keys = kb.addKeys(
      { W: K.W, A: K.A, S: K.S, D: K.D, UP: K.UP, DOWN: K.DOWN, LEFT: K.LEFT, RIGHT: K.RIGHT },
      false,
    ) as DeckScene['keys'];

    const canvas = this.game.canvas;
    canvas.addEventListener('mouseenter', () => kb.addCapture(codes));
    canvas.addEventListener('mouseleave', () => kb.removeCapture(codes));

    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      this.moveTarget = new Phaser.Math.Vector2(
        Phaser.Math.Clamp(pointer.worldX, WALL + 6, ROOM_W - WALL - 6),
        Phaser.Math.Clamp(pointer.worldY, WALL + 8, ROOM_H - WALL - 4),
      );
    });
  }

  private trigger(h: Hotspot): void {
    if (this.engaged.has(h.id)) return;
    this.engaged.add(h.id);

    const prop = this.props.get(h.id)!;
    const cx = prop.x;
    const cy = prop.y;

    this.tweens.add({
      targets: prop,
      scaleX: 1.12,
      scaleY: 1.12,
      duration: 90,
      yoyo: true,
      repeat: 1,
    });

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
      this.time.delayedCall(450, () => go(h.route!));
    }
  }

  update(): void {
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
      const dist = Phaser.Math.Distance.Between(
        this.player.x,
        this.player.y,
        this.moveTarget.x,
        this.moveTarget.y,
      );
      if (dist < 3) {
        this.moveTarget = null;
        this.player.setVelocity(0);
      } else {
        this.physics.moveTo(this.player, this.moveTarget.x, this.moveTarget.y, SPEED);
      }
      vx = this.player.body!.velocity.x;
      vy = this.player.body!.velocity.y;
    } else {
      this.player.setVelocity(0);
    }

    const moving = Math.abs(vx) > 5 || Math.abs(vy) > 5;
    if (moving) {
      this.facing =
        Math.abs(vx) >= Math.abs(vy) ? (vx > 0 ? 'right' : 'left') : vy > 0 ? 'down' : 'up';
      this.player.anims.play(`walk-${this.facing}`, true);
    } else {
      this.player.anims.play(`idle-${this.facing}`, true);
    }

    // re-arm hotspots once the player walks away
    for (const [id, rect] of this.zoneRects) {
      if (this.engaged.has(id) && !rect.contains(this.player.x, this.player.y)) {
        this.engaged.delete(id);
      }
    }
  }
}
