import './style.css';
import { initRouter } from './router';

initRouter();

const deck = document.getElementById('deck');
if (deck) {
  // Phaser is ~340KB gzipped; load it after the content so the page is
  // readable immediately even on a slow connection
  import('./game/boot').then(({ createGame }) => {
    const game = createGame(deck);
    if (import.meta.env.DEV) {
      (window as unknown as Record<string, unknown>).__game = game;
    }
  });
}
