import Phaser from 'phaser';

import type { ResumeSectionId } from '../data/resume';
import type { GameInputControls, VirtualDirection } from '../site/resumeInterface';
import { GAME_HEIGHT, GAME_WIDTH } from './config/gameConstants';
import { PortfolioScene, type SceneBackgroundMode } from './scenes/PortfolioScene';

interface CreateGameOptions {
  readonly parent: string;
  readonly reducedMotion: boolean;
  readonly backgroundMode: SceneBackgroundMode;
  readonly onSectionOpen: (sectionId: ResumeSectionId) => void;
  readonly onStatusChange: (message: string, state?: 'loading' | 'ready' | 'error') => void;
}

export interface PortfolioGameControls extends GameInputControls {
  destroy(): void;
}

export function createPortfolioGame(options: CreateGameOptions): PortfolioGameControls {
  const inputTarget = document.getElementById(options.parent);
  if (!inputTarget) {
    throw new Error(`The interactive game container "${options.parent}" was not found.`);
  }

  const scene = new PortfolioScene({
    reducedMotion: options.reducedMotion,
    backgroundMode: options.backgroundMode,
    onSectionOpen: options.onSectionOpen,
    onStatusChange: options.onStatusChange,
  });
  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent: options.parent,
    width: GAME_WIDTH,
    height: GAME_HEIGHT,
    backgroundColor: '#080d19',
    pixelArt: true,
    antialias: false,
    roundPixels: true,
    render: {
      antialiasGL: false,
      pixelArt: true,
      roundPixels: true,
    },
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
    },
    input: {
      keyboard: {
        target: inputTarget,
      },
    },
    scene: [scene],
  });

  game.canvas.tabIndex = 0;
  game.canvas.setAttribute(
    'aria-label',
    options.backgroundMode === 'bridge'
      ? 'Interactive 2.5D résumé command bridge'
      : 'Interactive résumé archive map',
  );
  game.canvas.addEventListener('pointerdown', () => game.canvas.focus());
  const handleInteractionKey = (event: KeyboardEvent): void => {
    if (!event.repeat && (event.key.toLowerCase() === 'e' || event.key === 'Enter')) {
      event.preventDefault();
      scene.interactNearby();
    }
  };
  inputTarget.addEventListener('keydown', handleInteractionKey);

  return {
    focusCanvas() {
      game.canvas.focus();
    },
    setVirtualDirection(direction: VirtualDirection, isPressed: boolean) {
      scene.setVirtualDirection(direction, isPressed);
    },
    interact() {
      scene.interactNearby();
    },
    setPaused(isPaused: boolean) {
      scene.clearVirtualDirections();
      if (isPaused) {
        scene.scene.pause();
      } else {
        scene.scene.resume();
      }
    },
    destroy() {
      inputTarget.removeEventListener('keydown', handleInteractionKey);
      game.destroy(true);
    },
  };
}
