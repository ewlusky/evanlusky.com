/// <reference types="vite/client" />
import Phaser from 'phaser';
import './arcade.css';
import { BootScene } from './scenes/BootScene';
import { DeckScene } from './scenes/DeckScene';
import { CorridorScene } from './scenes/CorridorScene';
import { FlightScene } from './scenes/FlightScene';
import { AudioHudScene } from './scenes/AudioHudScene';
import { createPanel } from './panel';

const host = document.getElementById('arcade');
const stage = document.getElementById('arcade-stage');

if (host && stage) {
  const panel = createPanel(host);

  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent: stage,
    backgroundColor: '#04070c',
    pixelArt: true,
    roundPixels: true,
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
      width: 1280,
      height: 720,
    },
    scene: [BootScene, DeckScene, CorridorScene, FlightScene, AudioHudScene],
  });

  game.events.on('arcade:open-section', (sectionId: string) => panel.open(sectionId));

  // FIT only remeasures on window resize; the stage can change without one.
  new ResizeObserver(() => game.scale.refresh()).observe(stage);

  if (import.meta.env.DEV) {
    (window as unknown as Record<string, unknown>).__arcade = game;
  }
}
