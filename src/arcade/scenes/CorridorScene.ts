import Phaser from 'phaser';
import { CORRIDOR_FLOOR, projectFloor, type FloorPosition } from '../deck';
import {
  facingFromVector,
  idleAnimFor,
  runAnimFor,
  toFacing4,
  walkAnimFor,
  type CharacterManifest,
  type Facing8,
} from '../character';

const WALK_U = 0.5;
const WALK_V = 0.34;

type Keys = Record<
  'up' | 'down' | 'left' | 'right' | 'w' | 'a' | 's' | 'd' | 'flip' | 'shift',
  Phaser.Input.Keyboard.Key
>;

export class CorridorScene extends Phaser.Scene {
  private player!: Phaser.GameObjects.Sprite;
  private shadow!: Phaser.GameObjects.Ellipse;
  private keys!: Keys;
  private pos: FloorPosition = { u: 0, v: 0.92 };
  private facing: Facing8 = 'north';
  private busyUntil = 0;
  private prompt!: Phaser.GameObjects.Text;
  private doorLight!: Phaser.GameObjects.Rectangle;
  private leaving = false;

  constructor() {
    super('corridor');
  }

  create(): void {
    const manifest = this.registry.get('char-manifest') as CharacterManifest;
    const { width, height } = this.scale;

    this.cameras.main.fadeIn(320, 2, 4, 8);
    this.add.image(0, 0, 'room-corridor').setOrigin(0).setDisplaySize(width, height).setDepth(0);

    // The blast door sits dead centre at the end of the hall.
    this.doorLight = this.add.rectangle(640, 430, 150, 190, 0x6fe7ff, 0.06).setDepth(0.5);
    this.tweens.add({
      targets: this.doorLight,
      fillAlpha: { from: 0.05, to: 0.18 },
      duration: 1800,
      yoyo: true,
      repeat: -1,
    });

    this.shadow = this.add.ellipse(0, 0, 74, 20, 0x000000, 0.45).setDepth(1);
    this.player = this.add.sprite(0, 0, 'base-idle-north', 0);
    this.player.setOrigin(manifest.footPivot.x, manifest.footPivot.y);
    this.player.play('idle-north');

    this.add
      .text(18, 14, 'EWL // AFT CORRIDOR', {
        fontFamily: 'monospace',
        fontSize: '14px',
        color: '#6fe7ff',
      })
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
        flip: K.F,
        shift: K.SHIFT,
      },
      false,
    ) as Keys;
    kb.on('keydown-F', () => this.flip());

    this.applyPosition();
  }

  private flip(): void {
    if (this.time.now < this.busyUntil) return;
    const facing4 = toFacing4(this.facing);
    const key = `flip-${facing4 === 'north' ? 'south' : facing4}`;
    const anim = this.anims.get(key);
    if (!anim || anim.frameRate <= 0) return;
    this.player.play(key);
    this.busyUntil = this.time.now + (anim.getTotalFrames() / anim.frameRate) * 1000;
  }

  private leave(target: 'deck' | 'flight'): void {
    if (this.leaving) return;
    this.leaving = true;
    this.cameras.main.fadeOut(340, 2, 4, 8);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => this.scene.start(target));
  }

  update(_time: number, delta: number): void {
    if (this.leaving || this.time.now < this.busyUntil) {
      this.applyPosition();
      return;
    }
    const seconds = delta / 1000;
    const k = this.keys;
    let h = 0;
    let v = 0;
    if (k.left.isDown || k.a.isDown) h -= 1;
    if (k.right.isDown || k.d.isDown) h += 1;
    if (k.up.isDown || k.w.isDown) v -= 1;
    if (k.down.isDown || k.s.isDown) v += 1;

    const running = k.shift.isDown && (h !== 0 || v !== 0);
    if (h !== 0 && v !== 0) {
      h *= Math.SQRT1_2;
      v *= Math.SQRT1_2;
    }
    const speed = running ? 1.8 : 1;
    this.pos.u = Phaser.Math.Clamp(this.pos.u + h * WALK_U * speed * seconds, -0.95, 0.95);
    this.pos.v = this.pos.v + v * WALK_V * speed * seconds;

    // Walking off the near edge goes back to the deck; the far door launches.
    if (this.pos.v > 1.0) {
      this.leave('deck');
      return;
    }
    if (this.pos.v < 0.04 && Math.abs(this.pos.u) < 0.3) {
      this.leave('flight');
      return;
    }
    this.pos.v = Phaser.Math.Clamp(this.pos.v, 0.02, 1.02);

    if (h !== 0 || v !== 0) {
      this.facing = facingFromVector(h, v * 0.7);
      this.player.play(running ? runAnimFor(this.facing) : walkAnimFor(this.facing), true);
    } else {
      this.player.play(idleAnimFor(this.facing), true);
    }

    const nearDoor = this.pos.v < 0.16 && Math.abs(this.pos.u) < 0.34;
    this.prompt
      .setText(nearDoor ? 'HANGAR AHEAD  ·  KEEP WALKING' : 'BACK OUT THE WAY YOU CAME  ·  S')
      .setVisible(nearDoor || this.pos.v > 0.9);

    this.applyPosition();
  }

  private applyPosition(): void {
    const p = projectFloor(CORRIDOR_FLOOR, this.pos);
    this.player.setPosition(p.x, p.y).setScale(p.scale).setDepth(Math.round(p.y));
    this.shadow
      .setPosition(p.x, p.y - 3)
      .setScale(p.scale, p.scale)
      .setDepth(Math.round(p.y) - 1)
      .setAlpha(Phaser.Math.Linear(0.18, 0.48, this.pos.v));
  }
}
