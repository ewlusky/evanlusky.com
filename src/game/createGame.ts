/// <reference types="vite/client" />
import Phaser from 'phaser';

import type { ResumeSectionId } from '../data/resume';
import type { GameInputControls, VirtualDirection } from '../site/resumeInterface';
import { BootScene } from '../arcade/scenes/BootScene';
import { DeckScene } from '../arcade/scenes/DeckScene';
import { CorridorScene } from '../arcade/scenes/CorridorScene';
import { FlightScene } from '../arcade/scenes/FlightScene';

interface CreateGameOptions {
  readonly parent: string;
  readonly reducedMotion: boolean;
  readonly backgroundMode: string;
  readonly onSectionOpen: (sectionId: ResumeSectionId) => void;
  readonly onStatusChange: (message: string, state?: 'loading' | 'ready' | 'error') => void;
}

export interface PortfolioGameControls extends GameInputControls {
  destroy(): void;
}

export interface VirtualInputState {
  up: boolean;
  down: boolean;
  left: boolean;
  right: boolean;
}

/**
 * The command-deck game behind the same contract the site already speaks:
 * one callback out (open a section), a small control surface in.
 */
export function createPortfolioGame(options: CreateGameOptions): PortfolioGameControls {
  const inputTarget = document.getElementById(options.parent);
  if (!inputTarget) {
    throw new Error(`The interactive game container "${options.parent}" was not found.`);
  }

  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent: options.parent,
    backgroundColor: '#04070c',
    pixelArt: true,
    roundPixels: true,
    render: {
      antialiasGL: false,
      pixelArt: true,
      roundPixels: true,
    },
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
      width: 1280,
      height: 720,
    },
    scene: [BootScene, DeckScene, CorridorScene, FlightScene],
  });

  if (import.meta.env.DEV) {
    (window as unknown as Record<string, unknown>).__embedded = game;
  }

  const virtualInput: VirtualInputState = { up: false, down: false, left: false, right: false };
  game.registry.set('virtual-input', virtualInput);
  game.registry.set('reduced-motion', options.reducedMotion);

  game.events.on('arcade:open-section', (sectionId: ResumeSectionId) => options.onSectionOpen(sectionId));
  game.events.once('arcade:ready', () =>
    options.onStatusChange('Command deck online. Walk the ship, or open any station directly.', 'ready'),
  );
  game.events.on('arcade:status', (message: string, state?: 'loading' | 'ready' | 'error') =>
    options.onStatusChange(message, state),
  );

  game.canvas.tabIndex = 0;
  game.canvas.setAttribute(
    'aria-label',
    'Interactive 2.5D command deck. Move with WASD or the arrow keys, press Space to flip, and E or Enter to open the nearest station. Every station is also directly selectable.',
  );
  game.canvas.addEventListener('pointerdown', () => game.canvas.focus());

  // The keys work from anywhere on the page: no click-to-focus ritual.
  // The first movement key also brings the game into view.
  const MOVE_KEYS = new Set(['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright']);
  let lastCenter = 0;
  const centerOnGame = (event: KeyboardEvent) => {
    if (!MOVE_KEYS.has(event.key.toLowerCase())) return;
    const target = event.target as HTMLElement | null;
    if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) return;
    if (document.querySelector('dialog[open]')) return;
    const rect = inputTarget.getBoundingClientRect();
    const viewport = window.innerHeight;
    const visible = rect.top >= -40 && rect.bottom <= viewport + 40;
    if (!visible && Date.now() - lastCenter > 600) {
      lastCenter = Date.now();
      inputTarget.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };
  window.addEventListener('keydown', centerOnGame);

  const activeDeck = (): DeckScene | null => {
    const deck = game.scene.getScene('deck') as DeckScene | null;
    return deck && deck.scene.isActive() ? deck : null;
  };

  return {
    focusCanvas() {
      game.canvas.focus();
    },
    setVirtualDirection(direction: VirtualDirection, isPressed: boolean) {
      virtualInput[direction] = isPressed;
    },
    interact() {
      activeDeck()?.interactNearby();
    },
    setPaused(isPaused: boolean) {
      virtualInput.up = virtualInput.down = virtualInput.left = virtualInput.right = false;
      for (const scene of game.scene.getScenes(true)) {
        if (isPaused) scene.scene.pause();
      }
      if (!isPaused) {
        for (const scene of game.scene.getScenes(false)) {
          if (scene.scene.isPaused()) scene.scene.resume();
        }
      }
      if (isPaused) {
        game.sound.pauseAll();
      } else {
        game.sound.resumeAll();
      }
    },
    destroy() {
      window.removeEventListener('keydown', centerOnGame);
      game.destroy(true);
    },
  };
}
