import './styles.css';

import { resumeData } from './data/resume';
import { createResumeInterface } from './site/resumeInterface';

const app = document.querySelector<HTMLElement>('#app');

if (!app) {
  throw new Error('The application root was not found.');
}

const sceneParameters = new URLSearchParams(window.location.search);
const requestedBackground = sceneParameters.get('background');
const reducedMotion =
  window.matchMedia('(prefers-reduced-motion: reduce)').matches ||
  sceneParameters.get('motion') === 'reduce';
const backgroundMode =
  requestedBackground === 'space' ||
  requestedBackground === 'mountains' ||
  requestedBackground === 'baseline'
    ? requestedBackground
    : 'bridge';
const resumeInterface = createResumeInterface(app, resumeData, {
  bridgeMode: backgroundMode === 'bridge',
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
