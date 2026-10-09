// Character Feats: players pick a primary and secondary attribute; the server shuffles the rest.
// Pure functions only; sockets live in Server/sockets.
import { VALID_ATTRIBUTES } from '../narrator/lore.js';
import { normalizeAttribute } from '../narrator/decisions.js';

// Display names, as the client shows and stores them ("Politician", "Crook"...).
export const ATTRIBUTE_NAMES = VALID_ATTRIBUTES.map(id => id.charAt(0).toUpperCase() + id.slice(1));
export const RANKING_LENGTH = ATTRIBUTE_NAMES.length;

const MAX_ATTEMPTS = 200;

const toName = (value) => {
  const id = normalizeAttribute(value);
  return id ? ATTRIBUTE_NAMES[VALID_ATTRIBUTES.indexOf(id)] : null;
};

function shuffle(list, random) {
  const copy = [...list];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

// The player's own picks in slots 0 and 1; everything else empty. Repeats and junk are dropped.
function startingRanking(attributes) {
  const ranking = Array(RANKING_LENGTH).fill(null);
  const picks = Array.isArray(attributes) ? attributes.slice(0, 2) : [];
  picks.forEach((value, slot) => {
    const name = toName(value);
    if (name && !ranking.includes(name)) ranking[slot] = name;
  });
  return ranking;
}

// Fills the empty slots of `ranking` with the player's unused attributes so that no slot repeats
// an attribute another player already has there (`taken[slot]`). Bipartite matching (Kuhn's
// algorithm) over shuffled slots and attributes, so the result is random. Null if impossible.
function fillRanking(ranking, taken, random) {
  const openSlots = shuffle(ranking.map((name, slot) => (name ? null : slot)).filter(slot => slot !== null), random);
  const unused = shuffle(ATTRIBUTE_NAMES.filter(name => !ranking.includes(name)), random);
  const slotOf = new Map(); // attribute -> slot

  const tryPlace = (slot, visited) => {
    for (const name of unused) {
      if (taken[slot].has(name) || visited.has(name)) continue;
      visited.add(name);
      if (!slotOf.has(name) || tryPlace(slotOf.get(name), visited)) {
        slotOf.set(name, slot);
        return true;
      }
    }
    return false;
  };

  for (const slot of openSlots) {
    if (!tryPlace(slot, new Set())) return null;
  }

  const filled = [...ranking];
  for (const [name, slot] of slotOf) filled[slot] = name;
  return filled;
}

/**
 * Completes every player's attribute ranking from their primary and secondary picks.
 * The remaining slots are shuffled so that no two players share an attribute in the same slot
 * (only picks the players made themselves, like optional secondaries in a full party, can clash).
 * @param {string[]} players
 * @param {Record<string, (string|null)[]>} attributesByPlayer - each player's picks; slots 0 and 1 are used
 * @param {() => number} [random]
 * @returns {Record<string, string[]>} player -> all ten attribute names in rank order
 */
export function completeAttributeRankings(players = [], attributesByPlayer = {}, random = Math.random) {
  const starting = Object.fromEntries(players.map(player => [player, startingRanking(attributesByPlayer[player])]));

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const taken = Array.from({ length: RANKING_LENGTH }, () => new Set());
    for (const ranking of Object.values(starting)) {
      ranking.forEach((name, slot) => name && taken[slot].add(name));
    }

    const result = {};
    let solved = true;
    for (const player of shuffle(players, random)) {
      const filled = fillRanking(starting[player], taken, random);
      if (!filled) {
        solved = false;
        break;
      }
      filled.forEach((name, slot) => taken[slot].add(name));
      result[player] = filled;
    }
    if (solved) return result;
  }

  // Never expected with six players and ten attributes, but the game must not stall: shuffle
  // each player's remaining attributes without the cross-player rule.
  return Object.fromEntries(players.map(player => {
    const ranking = starting[player];
    const rest = shuffle(ATTRIBUTE_NAMES.filter(name => !ranking.includes(name)), random);
    return [player, ranking.map(name => name || rest.shift())];
  }));
}
