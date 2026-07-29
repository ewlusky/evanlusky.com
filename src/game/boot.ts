import Phaser from 'phaser';
import { DeckScene } from './DeckScene';

export function createGame(parent: HTMLElement): Phaser.Game {
  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent,
    backgroundColor: '#0a0d18',
    pixelArt: true,
    physics: {
      default: 'arcade',
    },
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
      width: 400,
      height: 224,
    },
    scene: [DeckScene],
  });

  // FIT only re-measures on window resize; the container can change size
  // without one (panel toggles, orientation, first paint in a collapsed pane)
  new ResizeObserver(() => game.scale.refresh()).observe(parent);

  return game;
}
