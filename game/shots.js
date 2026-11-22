// shots.js — deterministic screenshot scenes for ?shot=start|play|win|loss.
// Each scene plays the real rules forward from a fresh seeded game with a simple
// autopilot (play the best affordable card, then end the turn), so the frame is what
// a short real game looks like and the same seed always gives the same frame.
import { beginTurn, createGame, playCard, startMatch } from './game.js';
import { planAiTurn } from './ai.js';
import { SCREEN_LOST, SCREEN_PLAY, SCREEN_TITLE, SCREEN_WON } from './render.js';

const PLAY_TURNS = 5;

/** Score a card for the autopilot: damage first, guards when hurt, draw when thin. */
function autopilotScore(state, side, card) {
  const foe = side === state.player ? state.ai : state.player;
  if (card.type === 'strike') return card.power * 10 - card.cost * 2 + (card.power >= foe.life ? 500 : 0);
  if (card.type === 'guard') return side.life <= 14 ? 70 : 5;
  if (card.type === 'surge') return side.hand.length <= 3 ? 40 : 5;
  return side.life < 30 ? 40 : -10;
}

function autopilotTurn(state, side) {
  let guard = 0;
  while (state.phase === 'play' && guard < 12) {
    guard += 1;
    let best = -1;
    let bestScore = 0;
    for (let i = 0; i < side.hand.length; i += 1) {
      const card = side.hand[i];
      if (card.cost > side.mana) continue;
      const score = autopilotScore(state, side, card);
      if (score > bestScore) {
        bestScore = score;
        best = i;
      }
    }
    if (best < 0) break;
    playCard(state, side, best);
  }
}

/** Run one full round (player autopilot, then rival autopilot) for `turns` turns. */
function runTurns(state, turns, rivalPlays) {
  for (let t = 0; t < turns && state.phase === 'play'; t += 1) {
    autopilotTurn(state, state.player);
    if (state.phase !== 'play') break;
    if (rivalPlays) {
      state.active = 'ai';
      beginTurn(state, state.ai);
      planAiTurn(state);
    }
    if (state.phase !== 'play') break;
    state.turn += 1;
    state.stats.turns = state.turn;
    state.active = 'player';
    beginTurn(state, state.player);
  }
}

/**
 * Set `state` to the named scene and return the screen to draw over it.
 * win: the rival passes every turn, so the player wins by the rules.
 * loss: the player passes every turn, so the rival wins by the rules.
 */
export function stageShot(name, seed) {
  const state = createGame(seed);
  startMatch(state);
  if (name === 'play') {
    runTurns(state, PLAY_TURNS, true);
    return { state, screen: state.phase === 'play' ? SCREEN_PLAY : state.phase };
  }
  if (name === 'win') {
    runTurns(state, 30, false);
    return { state, screen: state.phase === 'won' ? SCREEN_WON : state.phase };
  }
  if (name === 'loss') {
    // Player passes; rival plays its hand every turn.
    for (let t = 0; t < 30 && state.phase === 'play'; t += 1) {
      state.active = 'ai';
      beginTurn(state, state.ai);
      planAiTurn(state);
      if (state.phase !== 'play') break;
      state.turn += 1;
      state.stats.turns = state.turn;
      state.active = 'player';
      beginTurn(state, state.player);
    }
    return { state, screen: state.phase === 'lost' ? SCREEN_LOST : state.phase };
  }
  return { state, screen: SCREEN_TITLE };
}
