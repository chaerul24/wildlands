import { Game } from './core/Game.js';

function init() {
  if (window.__wildlandsGame) return;
  const game = new Game();
  window.__wildlandsGame = game;
}

if (document.readyState === 'loading') {
  window.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
