// deck.js — drawing, discarding and fatigue for one side's deck.
export const HAND_LIMIT = 7;
export const START_HAND = 4;

/** Draw `count` cards into `side.hand`; an empty deck costs 2 fatigue damage. */
export function drawCards(side, count, onFatigue) {
  const drawn = [];
  for (let i = 0; i < count; i += 1) {
    if (side.hand.length >= HAND_LIMIT) break;
    if (side.deck.length === 0) {
      if (side.discard.length > 0) {
        side.deck = side.discard;
        side.discard = [];
      } else {
        onFatigue(2);
        continue;
      }
    }
    const card = side.deck.pop();
    side.hand.push(card);
    drawn.push(card);
  }
  return drawn;
}
