// render.js — draws the whole table into the DOM from the game state.
// Cards are real DOM cards: big cost gem, element shape + colour, name, power and text,
// so every value stays readable when the screenshot shrinks to a thumbnail.
import { ELEMENTS } from './cards.js';
import { MAX_LIFE } from './game.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_WON = 'won';
export const SCREEN_LOST = 'lost';

function el(tag, cls, text) {
  const node = document.createElement(tag);
  if (cls) node.className = cls;
  if (text !== undefined && text !== null) node.textContent = text;
  return node;
}

function manaPips(side) {
  const wrap = el('div', 'pips');
  for (let i = 0; i < 10; i += 1) {
    const pip = el('span', 'pip' + (i < side.mana ? ' on' : ''));
    pip.textContent = '◆';
    wrap.appendChild(pip);
  }
  return wrap;
}

function lifeBar(side, label) {
  const wrap = el('div', 'lifebar');
  const name = el('span', 'side-name', label);
  const bar = el('div', 'bar');
  const fill = el('div', 'bar-fill');
  fill.style.width = `${Math.max(0, (side.life / MAX_LIFE) * 100)}%`;
  if (side.life <= 10) fill.classList.add('low');
  bar.appendChild(fill);
  const nums = el('span', 'life-nums', `${side.life} / ${MAX_LIFE}`);
  if (side.shield > 0) nums.appendChild(el('span', 'shield', `🛡 ${side.shield}`));
  const aura = ELEMENTS[side.aura];
  if (aura) nums.appendChild(el('span', 'aura', `${aura.symbol} ${aura.name}`));
  wrap.append(name, bar, nums);
  return wrap;
}

export function cardNode(card, index, playable, onPlay) {
  const info = ELEMENTS[card.element];
  const node = el('div', `card el-${card.element}${playable ? ' playable' : ''}`);
  node.style.setProperty('--el', info.color);
  node.style.setProperty('--el-dark', info.dark);
  const top = el('div', 'card-top');
  top.appendChild(el('span', 'cost', `⬢ ${card.cost}`));
  top.appendChild(el('span', 'element', `${info.symbol} ${info.name}`));
  node.appendChild(top);
  node.appendChild(el('div', 'card-name', card.name));
  const power = el('div', 'card-power', card.type === 'strike' ? `⚔ ${card.power}` : card.type === 'guard' ? `🛡 ${card.power}` : card.type === 'mend' ? `✚ ${card.power}` : `⇪ ${card.power}`);
  node.appendChild(power);
  node.appendChild(el('div', 'card-text', card.text));
  node.appendChild(el('div', 'card-key', index !== null ? `Press ${index + 1}` : ''));
  if (onPlay) {
    node.tabIndex = 0;
    node.addEventListener('click', () => onPlay(index));
    node.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        onPlay(index);
      }
    });
  }
  return node;
}

function cardBack() {
  const node = el('div', 'card back');
  node.appendChild(el('div', 'card-back-symbol', '✦'));
  node.appendChild(el('div', 'card-back-text', 'SIGIL'));
  return node;
}

/** Render the live table for `state`; `ui` carries the callbacks the buttons need. */
export function renderTable(root, state, ui) {
  root.innerHTML = '';
  const table = el('div', 'table');

  // Rival row: name, life, mana, face-down hand.
  const rival = el('section', 'rival-row');
  const rivalHead = el('div', 'side-head');
  rivalHead.appendChild(el('h2', '', '⚔ RIVAL — The Hollow Sigil'));
  rivalHead.appendChild(el('span', 'deck-count', `Deck ${state.ai.deck.length} · Hand ${state.ai.hand.length}`));
  rival.appendChild(rivalHead);
  rival.appendChild(lifeBar(state.ai, 'RIVAL'));
  rival.appendChild(manaPips(state.ai));
  const rivalHand = el('div', 'hand rival-hand');
  for (let i = 0; i < state.ai.hand.length; i += 1) rivalHand.appendChild(cardBack());
  rival.appendChild(rivalHand);
  table.appendChild(rival);

  // Middle: last plays and the log.
  const mid = el('div', 'mid-row');
  const plays = el('div', 'plays');
  plays.appendChild(el('h3', '', 'Last plays'));
  if (state.lastPlays.length === 0) plays.appendChild(el('p', 'muted', 'No cards played yet.'));
  for (const play of state.lastPlays) {
    const info = ELEMENTS[play.card.element];
    plays.appendChild(el('p', 'play-line', `${play.who}: ${info.symbol} ${play.card.name} — ${play.detail}`));
  }
  mid.appendChild(plays);
  const logBox = el('div', 'log');
  logBox.appendChild(el('h3', '', 'Battle log'));
  for (const line of state.log) logBox.appendChild(el('p', '', line));
  mid.appendChild(logBox);
  table.appendChild(mid);

  // Player row: life, mana, hand of real cards.
  const player = el('section', 'player-row');
  const playerHead = el('div', 'side-head');
  playerHead.appendChild(el('h2', '', '✦ YOU'));
  playerHead.appendChild(el('span', 'deck-count', `Turn ${state.turn} · Deck ${state.player.deck.length} · Discard ${state.player.discard.length}`));
  player.appendChild(playerHead);
  player.appendChild(lifeBar(state.player, 'YOU'));
  player.appendChild(manaPips(state.player));
  const hand = el('div', 'hand player-hand');
  state.player.hand.forEach((card, i) => {
    const playable = state.phase === 'play' && state.active === 'player' && card.cost <= state.player.mana;
    hand.appendChild(cardNode(card, i, playable, playable ? ui.onPlayCard : null));
  });
  player.appendChild(hand);
  table.appendChild(player);

  // Controls.
  const controls = el('div', 'controls');
  const endBtn = el('button', 'btn primary', 'End Turn  (Space)');
  endBtn.disabled = state.phase !== 'play' || state.active !== 'player';
  endBtn.addEventListener('click', ui.onEndTurn);
  const restartBtn = el('button', 'btn', 'Restart  (R)');
  restartBtn.addEventListener('click', ui.onRestart);
  const helpBtn = el('button', 'btn', 'How to play  (H)');
  helpBtn.addEventListener('click', ui.onHelp);
  controls.append(endBtn, restartBtn, helpBtn);
  table.appendChild(controls);

  const hint = el('p', 'hint', 'Click a glowing card or press 1–7 to play it · Ember ▲ beats Thorn ◆, Thorn beats Tide ●, Tide beats Ember · second card of one element in a turn: COMBO +2 · a strike against the rival aura it beats: SUPER +3');
  table.appendChild(hint);
  root.appendChild(table);
}

/** Full-screen overlay: title, win or loss. */
export function renderOverlay(root, kind, state, ui) {
  const overlay = el('div', `overlay ${kind}`);
  if (kind === SCREEN_TITLE) {
    overlay.appendChild(el('div', 'sigil-mark', '✦'));
    overlay.appendChild(el('h1', 'game-title', 'SIGIL CLASH'));
    overlay.appendChild(el('p', 'tagline', 'An elemental card duel — outwit the Hollow Sigil.'));
    const rules = el('div', 'rules');
    rules.appendChild(el('p', '', '♦ Both duelists start at 30 life. Mana grows 1 → 10, one more each turn.'));
    rules.appendChild(el('p', '', '♦ Play cards with mouse or keys 1–7, End Turn with Space. Reduce the rival to 0 life to win.'));
    rules.appendChild(el('p', '', '▲ Ember beats ◆ Thorn · ◆ Thorn beats ● Tide · ● Tide beats ▲ Ember · ★ Storm is wild.'));
    rules.appendChild(el('p', '', '♦ Second card of one element in a turn: COMBO +2. A strike against an aura it beats: SUPER +3.'));
    overlay.appendChild(rules);
    const start = el('button', 'btn primary big', '▶  Start the duel  (Enter)');
    start.addEventListener('click', ui.onStart);
    overlay.appendChild(start);
    overlay.appendChild(el('p', 'muted', 'Offline · no network · original game'));
  } else {
    const won = kind === SCREEN_WON;
    overlay.appendChild(el('div', 'sigil-mark', won ? '🏆' : '💀'));
    overlay.appendChild(el('h1', 'game-title', won ? 'VICTORY!' : 'DEFEAT'));
    overlay.appendChild(el('p', 'tagline', won ? 'The rival sigil shatters. The table is yours.' : 'Your sigil shatters. The rival takes the table.'));
    const score = el('div', 'score-box');
    score.appendChild(el('p', '', `Final life — You ${state.player.life} · Rival ${state.ai.life}`));
    score.appendChild(el('p', '', `Turns ${state.turn} · Cards played ${state.stats.cardsPlayed} · Damage dealt ${state.stats.damageDealt}`));
    overlay.appendChild(score);
    const again = el('button', 'btn primary big', '↻  Play again  (R)');
    again.addEventListener('click', ui.onRestart);
    overlay.appendChild(again);
  }
  root.appendChild(overlay);
}
