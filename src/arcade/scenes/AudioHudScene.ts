import Phaser from 'phaser';
import { REG_MUSIC_ON, REG_SFX_ON, loadAudioPrefs, saveAudioPrefs } from '../audio';

/**
 * Two floating toggles in the top-right corner, always on top. A Phaser scene
 * rather than DOM so the same buttons ride over the embedded game and the
 * full-screen arcade page alike, and survive every room change.
 */
export class AudioHudScene extends Phaser.Scene {
  private musicButton!: Phaser.GameObjects.Text;
  private sfxButton!: Phaser.GameObjects.Text;

  constructor() {
    super('audio-hud');
  }

  create(): void {
    const prefs = loadAudioPrefs();
    this.registry.set(REG_MUSIC_ON, prefs.music);
    this.registry.set(REG_SFX_ON, prefs.sfx);

    const { width } = this.scale;
    this.musicButton = this.buildButton(width - 18, 36, () => this.toggle('music'));
    this.sfxButton = this.buildButton(width - 18, 60, () => this.toggle('sfx'));
    this.refresh();
  }

  private buildButton(x: number, y: number, onToggle: () => void): Phaser.GameObjects.Text {
    const button = this.add
      .text(x, y, '', {
        fontFamily: 'monospace',
        fontSize: '11px',
        color: '#9fb4cf',
        backgroundColor: 'rgba(4,8,14,0.75)',
        padding: { x: 6, y: 4 },
      })
      .setOrigin(1, 0)
      .setResolution(2)
      .setInteractive({ useHandCursor: true });
    button.on('pointerdown', (_p: Phaser.Input.Pointer, _x: number, _y: number, event: Event) => {
      // The deck listens for stray clicks (to stop the guitar); a click on a
      // toggle is not a stray click.
      event.stopPropagation();
      onToggle();
    });
    return button;
  }

  private toggle(which: 'music' | 'sfx'): void {
    const key = which === 'music' ? REG_MUSIC_ON : REG_SFX_ON;
    this.registry.set(key, this.registry.get(key) === false);
    saveAudioPrefs({
      music: this.registry.get(REG_MUSIC_ON) !== false,
      sfx: this.registry.get(REG_SFX_ON) !== false,
    });
    this.refresh();
  }

  private refresh(): void {
    const musicOn = this.registry.get(REG_MUSIC_ON) !== false;
    const sfxOn = this.registry.get(REG_SFX_ON) !== false;
    this.musicButton.setText(musicOn ? '♪ MUSIC ON' : '♪ MUSIC OFF').setColor(musicOn ? '#7dffb0' : '#5f7590');
    this.sfxButton.setText(sfxOn ? '◆ SFX ON' : '◆ SFX OFF').setColor(sfxOn ? '#7dffb0' : '#5f7590');
  }
}
