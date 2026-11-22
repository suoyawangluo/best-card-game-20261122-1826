// game.js — the rules of Sigil Clash: turns, mana, combos, auras and damage.
// One side at a time owns the turn. Playing a card spends mana, then the card's effect
// resolves at once. Two rules make each hand a decision:
//  * Aura: the element of the last card you played is your aura. A strike whose element
//    beats the defender's aura deals +3 (SUPER!); one that loses to it deals -1.
//  * Combo: the second card you play of one element in the same turn gains +2 power.
import { beats, buildDeck, mulberry32 } from './cards.js';
import { drawCards, START_HAND } from './deck.js';

export const MAX_LIFE = 30;
export const MAX_MANA = 10;

export function newSide(rng) {
  return {
    life: MAX_LIFE,
    mana: 0,
    maxMana: 0,
    shield: 0,
    deck: buildDeck(rng),
    hand: [],
    discard: [],
    aura: null,
    comboElement: null,
    comboUsed: false,
  };
}

export function createGame(seed) {
  const rng = mulberry32(seed);
  const state = {
    seed,
    rng,
    turn: 1,
    phase: 'title', // title | play | won | lost
    player: newSide(rng),
    ai: newSide(rng),
    active: 'player',
    log: [],
    lastPlays: [],
    stats: { cardsPlayed: 0, damageDealt: 0, damageTaken: 0, turns: 0 },
    winner: null,
  };
  return state;
}

export function addLog(state, text) {
  state.log.unshift(text);
  if (state.log.length > 8) state.log.length = 8;
}

/** Start a fresh match: deal opening hands, player goes first. */
export function startMatch(state) {
  state.phase = 'play';
  state.turn = 1;
  state.active = 'player';
  state.log = [];
  state.lastPlays = [];
  state.stats = { cardsPlayed: 0, damageDealt: 0, damageTaken: 0, turns: 0 };
  drawCards(state.player, START_HAND, (n) => hurt(state, state.player, n, 'fatigue'));
  drawCards(state.ai, START_HAND, (n) => hurt(state, state.ai, n, 'fatigue'));
  beginTurn(state, state.player);
  addLog(state, 'Match started — your move. Play a card, then End Turn.');
}

export function beginTurn(state, side) {
  side.maxMana = Math.min(MAX_MANA, side.maxMana + 1);
  side.mana = side.maxMana;
  side.comboElement = null;
  side.comboUsed = false;
  drawCards(side, 1, (n) => hurt(state, side, n, 'fatigue'));
}

/** Damage after shields; returns the life actually lost. */
export function hurt(state, side, amount, source) {
  let left = amount;
  if (side.shield > 0) {
    const blocked = Math.min(side.shield, left);
    side.shield -= blocked;
    left -= blocked;
    if (blocked > 0) addLog(state, `${side === state.player ? 'You' : 'Rival'} blocked ${blocked} with shield.`);
  }
  if (left > 0) {
    side.life = Math.max(0, side.life - left);
    if (side === state.player) state.stats.damageTaken += left;
    else state.stats.damageDealt += left;
  }
  checkEnd(state);
  return left;
}

function checkEnd(state) {
  if (state.phase !== 'play') return;
  if (state.ai.life <= 0) {
    state.phase = 'won';
    state.winner = 'player';
    addLog(state, 'Rival sigil shattered — you win!');
  } else if (state.player.life <= 0) {
    state.phase = 'lost';
    state.winner = 'ai';
    addLog(state, 'Your sigil shattered — rival wins.');
  }
}

/** The +3 / -1 aura swing for a strike, plus +2 when `combo` applies. */
export function strikePower(state, attacker, defender, card, combo) {
  let power = card.power;
  const notes = [];
  if (combo) {
    power += 2;
    notes.push('COMBO +2');
  }
  const strong = beats(card.element);
  if (strong && defender.aura === strong) {
    power += 3;
    notes.push('SUPER +3');
  } else if (defender.aura && beats(defender.aura) === card.element) {
    power = Math.max(1, power - 1);
    notes.push('RESISTED -1');
  }
  return { power, notes };
}

/** Play hand[index] for `side`; returns false when the card cannot be played. */
export function playCard(state, side, index) {
  if (state.phase !== 'play') return false;
  const card = side.hand[index];
  if (!card || side.mana < card.cost) return false;
  const foe = side === state.player ? state.ai : state.player;
  const who = side === state.player ? 'You' : 'Rival';
  side.mana -= card.cost;
  side.hand.splice(index, 1);
  side.discard.push(card);
  state.stats.cardsPlayed += 1;
  // The combo belongs to the SECOND card of one element in a turn: it applies only
  // when an earlier card this turn already set the combo element to this card's.
  const comboApplies = side.comboElement === card.element && !side.comboUsed;
  if (comboApplies) side.comboUsed = true;
  if (side.comboElement === null) side.comboElement = card.element;

  let detail = '';
  if (card.type === 'strike') {
    const { power, notes } = strikePower(state, side, foe, card, comboApplies);
    hurt(state, foe, power, 'strike');
    detail = `dealt ${power} damage${notes.length ? ` (${notes.join(', ')})` : ''}`;
    if (card.id === 'tidal' || card.id === 'vine') drawCards(side, 1, (n) => hurt(state, side, n, 'fatigue'));
    if (card.id === 'overgrowth') {
      side.life = Math.min(MAX_LIFE, side.life + 3);
      detail += ', healed 3';
    }
  } else if (card.type === 'guard') {
    let gain = card.power;
    if (comboApplies) gain += 2;
    side.shield += gain;
    detail = `gained ${gain} shield`;
    if (card.id === 'bark') {
      side.life = Math.min(MAX_LIFE, side.life + 2);
      detail += ', healed 2';
    }
    if (card.id === 'veil') drawCards(side, 1, (n) => hurt(state, side, n, 'fatigue'));
  } else if (card.type === 'surge') {
    drawCards(side, card.power, (n) => hurt(state, side, n, 'fatigue'));
    detail = `drew ${card.power} cards`;
  } else if (card.type === 'mend') {
    let heal = card.power;
    if (comboApplies) heal += 2;
    side.life = Math.min(MAX_LIFE, side.life + heal);
    detail = `restored ${heal} life`;
  }
  side.aura = card.element;
  state.lastPlays.unshift({ who, card, detail });
  if (state.lastPlays.length > 4) state.lastPlays.length = 4;
  addLog(state, `${who} played ${card.name} — ${detail}.`);
  return true;
}

/** End the player's turn: the rival plays, then a new player turn begins. */
export function endPlayerTurn(state, aiPlan) {
  if (state.phase !== 'play' || state.active !== 'player') return;
  state.active = 'ai';
  beginTurn(state, state.ai);
  aiPlan(state);
  if (state.phase !== 'play') return;
  state.turn += 1;
  state.stats.turns = state.turn;
  state.active = 'player';
  beginTurn(state, state.player);
  addLog(state, `Turn ${state.turn} — ${state.player.mana} mana, draw a card.`);
}
