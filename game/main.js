// main.js — boots Sigil Clash: interactive play, or a deterministic ?shot= scene.
// Keyboard: 1–7 play a card, Space ends the turn, Enter starts, R restarts, H help.
import { createGame, endPlayerTurn, playCard, startMatch } from './game.js';
import { planAiTurn } from './ai.js';
import { renderOverlay, renderTable, SCREEN_LOST, SCREEN_PLAY, SCREEN_TITLE, SCREEN_WON } from './render.js';
import { stageShot } from './shots.js';

const app = document.getElementById('app');
const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seed = Number(params.get('seed') || '7');

let state = createGame(seed);
let helpOpen = false;

function draw() {
  app.innerHTML = '';
  const ui = {
    onPlayCard: (index) => {
      if (playCard(state, state.player, index)) draw();
    },
    onEndTurn: () => {
      endPlayerTurn(state, planAiTurn);
      draw();
    },
    onRestart: () => {
      state = createGame(Date.now() % 2147483647);
      startMatch(state);
      draw();
    },
    onStart: () => {
      startMatch(state);
      draw();
    },
    onHelp: () => {
      helpOpen = !helpOpen;
      document.getElementById('help').classList.toggle('open', helpOpen);
    },
  };
  if (state.phase === 'title') {
    renderOverlay(app, SCREEN_TITLE, state, ui);
  } else {
    renderTable(app, state, ui);
    if (state.phase === 'won') renderOverlay(app, SCREEN_WON, state, ui);
    if (state.phase === 'lost') renderOverlay(app, SCREEN_LOST, state, ui);
  }
  const help = document.getElementById('help');
  if (help) help.classList.toggle('open', helpOpen);
}

// Exposed for headless play-testing: window.__game gives the live state.
window.__game = { get state() { return state; }, startMatch, playCard, endPlayerTurn, planAiTurn };

if (shot) {
  const staged = stageShot(shot, seed);
  state = staged.state;
  app.innerHTML = '';
  const ui = {
    onPlayCard: () => {},
    onEndTurn: () => {},
    onRestart: () => {},
    onStart: () => {},
    onHelp: () => {},
  };
  if (staged.screen === SCREEN_TITLE) renderOverlay(app, SCREEN_TITLE, state, ui);
  else {
    renderTable(app, state, ui);
    if (staged.screen === SCREEN_WON) renderOverlay(app, SCREEN_WON, state, ui);
    if (staged.screen === SCREEN_LOST) renderOverlay(app, SCREEN_LOST, state, ui);
  }
  document.title = `Sigil Clash — ${shot}`;
} else {
  draw();
}

document.addEventListener('keydown', (event) => {
  if (shot) return;
  if (event.key === 'Enter' && state.phase === 'title') {
    startMatch(state);
    draw();
    return;
  }
  if (event.key === 'r' || event.key === 'R') {
    if (state.phase !== 'title') {
      state = createGame(Date.now() % 2147483647);
      startMatch(state);
      draw();
    }
    return;
  }
  if (state.phase !== 'play' || state.active !== 'player') return;
  if (event.key === ' ') {
    event.preventDefault();
    endPlayerTurn(state, planAiTurn);
    draw();
    return;
  }
  const digit = Number(event.key);
  if (digit >= 1 && digit <= state.player.hand.length) {
    if (playCard(state, state.player, digit - 1)) draw();
  }
});
