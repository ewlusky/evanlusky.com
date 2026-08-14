import './styles.css';

import { resumeData } from './data/resume';
import { createResumeInterface } from './site/resumeInterface';

const app = document.querySelector<HTMLElement>('#app');

if (!app) {
  throw new Error('The application root was not found.');
}

const sceneParameters = new URLSearchParams(window.location.search);
const reducedMotion =
  window.matchMedia('(prefers-reduced-motion: reduce)').matches ||
  sceneParameters.get('motion') === 'reduce';
// The command deck is a full 2D room, so the interface always renders the
// complete WASD instructions and the four-way touch pad.
const backgroundMode = 'deck';
const resumeInterface = createResumeInterface(app, resumeData, {
  bridgeMode: false,
});

async function loadInteractiveGame(): Promise<void> {
  try {
    const { createPortfolioGame } = await import('./game/createGame');
    const game = createPortfolioGame({
      parent: 'game-container',
      reducedMotion,
      backgroundMode,
      onSectionOpen: resumeInterface.openSection,
      onStatusChange: resumeInterface.setGameStatus,
    });

    resumeInterface.setGameControls(game);
    window.addEventListener('beforeunload', () => game.destroy(), { once: true });
  } catch (error) {
    console.error('The interactive résumé could not start.', error);
    resumeInterface.setGameStatus(
      'The interactive map could not start. The complete résumé is still available below.',
      'error',
    );
  }
}

requestAnimationFrame(() => void loadInteractiveGame());
