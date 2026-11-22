// ai.js — the rival's turn: a greedy planner that reads the table.
// It scores every playable card in hand, plays the best, and repeats until nothing
// affordable is worth playing: lethal first, then super-effective strikes, then
// guards when hurt, draws when the hand runs thin.
import { beats } from './cards.js';
import { playCard } from './game.js';

function scoreCard(state, card, index) {
  const me = state.ai;
  const foe = state.player;
  let score = 0;
  if (card.type === 'strike') {
    let power = card.power;
    if (me.comboElement === card.element && !me.comboUsed) power += 2;
    if (beats(card.element) === foe.aura) power += 3;
    if (power >= foe.life + foe.shield) score += 1000; // lethal
    score += power * 10 - card.cost * 3;
    if (card.id === 'tidal' || card.id === 'vine') score += 6;
  } else if (card.type === 'guard') {
    score += me.life <= 12 ? 60 + card.power * 4 : card.power * 2 - card.cost * 3;
  } else if (card.type === 'surge') {
    score += me.hand.length <= 2 ? 55 : 12;
  } else if (card.type === 'mend') {
    score += me.life < 30 ? (30 - me.life) * 2 : -20;
  }
  return score;
}

/** Play the rival's whole turn, one best card at a time. */
export function planAiTurn(state) {
  let guard = 0;
  while (state.phase === 'play' && guard < 12) {
    guard += 1;
    let best = -1;
    let bestScore = 8; // do not play a card worth less than holding mana
    for (let i = 0; i < state.ai.hand.length; i += 1) {
      const card = state.ai.hand[i];
      if (card.cost > state.ai.mana) continue;
      const score = scoreCard(state, card, i);
      if (score > bestScore) {
        bestScore = score;
        best = i;
      }
    }
    if (best < 0) break;
    playCard(state, state.ai, best);
  }
}
