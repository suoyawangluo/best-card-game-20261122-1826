// cards.js — the card pool, the four elements and the deck builder for Sigil Clash.
// Every card is an original design: a name, an element, a mana cost and one effect.
// Elements beat each other in a cycle: Ember > Thorn > Tide > Ember. Storm is wild:
// it beats nothing and nothing beats it, but its cards hit the hardest.
export const ELEMENTS = {
  ember: { name: 'Ember', symbol: '▲', color: '#ff6b35', dark: '#c2410c', blurb: 'beats Thorn' },
  tide: { name: 'Tide', symbol: '●', color: '#38bdf8', dark: '#0369a1', blurb: 'beats Ember' },
  thorn: { name: 'Thorn', symbol: '◆', color: '#4ade80', dark: '#15803d', blurb: 'beats Tide' },
  storm: { name: 'Storm', symbol: '★', color: '#facc15', dark: '#a16207', blurb: 'wild, beats none' },
};

/** The element `a` beats, or null when `a` beats nothing. */
export function beats(a) {
  if (a === 'ember') return 'thorn';
  if (a === 'thorn') return 'tide';
  if (a === 'tide') return 'ember';
  return null;
}

/** A tiny deterministic RNG so a seed always deals the same game. */
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function next() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// type: strike hits the other side, guard raises your shield, surge draws cards,
// mend restores life. power is the size of the effect.
export const CARD_POOL = [
  { id: 'cinder', name: 'Cinder Slash', element: 'ember', type: 'strike', cost: 2, power: 4, text: 'Deal 4 damage.' },
  { id: 'inferno', name: 'Inferno', element: 'ember', type: 'strike', cost: 5, power: 9, text: 'Deal 9 damage.' },
  { id: 'ashwall', name: 'Ash Wall', element: 'ember', type: 'guard', cost: 1, power: 5, text: 'Gain 5 shield.' },
  { id: 'hearth', name: 'Warm Hearth', element: 'ember', type: 'mend', cost: 3, power: 8, text: 'Restore 8 life.' },
  { id: 'wave', name: 'Wave Crash', element: 'tide', type: 'strike', cost: 3, power: 5, text: 'Deal 5 damage.' },
  { id: 'tidal', name: 'Tidal Surge', element: 'tide', type: 'strike', cost: 5, power: 8, text: 'Deal 8 damage, draw 1.' },
  { id: 'coral', name: 'Coral Shield', element: 'tide', type: 'guard', cost: 2, power: 7, text: 'Gain 7 shield.' },
  { id: 'current', name: 'Deep Current', element: 'tide', type: 'surge', cost: 2, power: 2, text: 'Draw 2 cards.' },
  { id: 'vine', name: 'Vine Whip', element: 'thorn', type: 'strike', cost: 2, power: 3, text: 'Deal 3 damage, draw 1.' },
  { id: 'overgrowth', name: 'Overgrowth', element: 'thorn', type: 'strike', cost: 4, power: 6, text: 'Deal 6 damage, heal 3.' },
  { id: 'bark', name: 'Bark Guard', element: 'thorn', type: 'guard', cost: 1, power: 4, text: 'Gain 4 shield, heal 2.' },
  { id: 'bloom', name: 'Bloom Mend', element: 'thorn', type: 'mend', cost: 2, power: 6, text: 'Restore 6 life.' },
  { id: 'volt', name: 'Volt Jolt', element: 'storm', type: 'strike', cost: 4, power: 7, text: 'Deal 7 damage.' },
  { id: 'tempest', name: 'Tempest', element: 'storm', type: 'strike', cost: 6, power: 11, text: 'Deal 11 damage.' },
  { id: 'veil', name: 'Static Veil', element: 'storm', type: 'guard', cost: 2, power: 5, text: 'Gain 5 shield, draw 1.' },
  { id: 'gale', name: 'Gale Call', element: 'storm', type: 'surge', cost: 3, power: 2, text: 'Draw 2 cards.' },
];

/** Two copies of every pool card, shuffled: a 32-card deck. */
export function buildDeck(rng) {
  const deck = [];
  for (const card of CARD_POOL) deck.push({ ...card }, { ...card });
  for (let i = deck.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}
