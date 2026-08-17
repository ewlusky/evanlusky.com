import Phaser from 'phaser';
import { queueCharacterSheets, registerCharacterAnims, type CharacterManifest } from '../character';

const CHAR_BASE = 'assets/characters/red';

export class BootScene extends Phaser.Scene {
  private barFill?: Phaser.GameObjects.Rectangle;
  private label?: Phaser.GameObjects.Text;

  constructor() {
    super('boot');
  }

  preload(): void {
    this.buildLoaderUi();
    this.load.json('char-manifest', `${CHAR_BASE}/character.json`);
  }

  create(): void {
    const manifest = this.cache.json.get('char-manifest') as CharacterManifest | undefined;
    if (!manifest) {
      this.fail('Character manifest failed to load.');
      return;
    }

    queueCharacterSheets(this.load, manifest, CHAR_BASE);
    this.load.image('room-deck', 'assets/rooms/deck.png');
    this.load.image('deck-chair', 'assets/rooms/deck-chair.png');
    this.load.image('room-corridor', 'assets/rooms/corridor.png');
    this.load.image('px-back', 'assets/parallax/back.png');
    this.load.image('px-mountains', 'assets/parallax/mountains.png');
    this.load.image('px-palms-back', 'assets/parallax/palms-back.png');
    this.load.image('px-palms', 'assets/parallax/palms.png');
    this.load.image('px-road', 'assets/parallax/road.png');
    this.load.audio('deck-theme', 'assets/audio/deck-theme.ogg');
    this.load.audio('flight-theme', 'assets/audio/flight-theme.ogg');
    this.load.audio('chime', 'assets/audio/chime.ogg');
    this.load.audio('interact', 'assets/audio/interact.ogg');
    this.load.audio('transition', 'assets/audio/transition.ogg');
    this.load.audio('guitar-summon-sfx', 'assets/audio/guitar-summon-sfx.ogg');
    this.load.audio('guitar-loop', 'assets/audio/guitar-loop.ogg');
    this.load.audio('explosion-8bit', 'assets/audio/explosion-8bit.ogg');
    this.load.audio('beam-charge', 'assets/audio/beam-charge.ogg');
    this.load.audio('beam-fire', 'assets/audio/beam-fire.ogg');

    this.load.once(Phaser.Loader.Events.COMPLETE, () => {
      registerCharacterAnims(this.anims, manifest);
      this.registry.set('char-manifest', manifest);
      // The mute toggles live in their own scene so they float over every room.
      this.scene.launch('audio-hud');
      this.scene.start('deck');
    });
    this.load.start();
  }

  private buildLoaderUi(): void {
    const { width, height } = this.scale;
    this.add.rectangle(0, 0, width, height, 0x05070d).setOrigin(0);
    this.label = this.add
      .text(width / 2, height / 2 - 34, 'WAKING THE DECK', {
        fontFamily: 'monospace',
        fontSize: '18px',
        color: '#7dffb0',
      })
      .setOrigin(0.5);

    const barWidth = 380;
    this.add.rectangle(width / 2, height / 2 + 8, barWidth, 10, 0x101a2c).setOrigin(0.5);
    this.barFill = this.add
      .rectangle(width / 2 - barWidth / 2, height / 2 + 8, 0, 10, 0x6fe7ff)
      .setOrigin(0, 0.5);

    this.load.on(Phaser.Loader.Events.PROGRESS, (value: number) => {
      this.barFill?.setSize(Math.round(barWidth * value), 10);
    });
  }

  private fail(message: string): void {
    this.label?.setText(message).setColor('#ff8a8a');
  }
}
