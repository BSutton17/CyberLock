import { VALID_ATTRIBUTES } from './lore.js';

export const normalizeAttribute = (value) => {
  const normalized = String(value || '').trim().toLowerCase().replace(/[^a-z]+/g, '');
  return VALID_ATTRIBUTES.includes(normalized) ? normalized : null;
};

const normalizedList = (attributes) =>
  (Array.isArray(attributes) ? attributes : []).map(normalizeAttribute);

/**
 * Who owns a decision for `attribute`: the player who ranked it highest (lowest index).
 * Ties go to whoever comes first in `players`. Mirrors getDecisionOwner in the client.
 */
export function getDecisionOwner(attribute, players = [], attributesByPlayer = {}) {
  const target = normalizeAttribute(attribute);
  if (!target) return null;

  let best = null;
  for (const player of players) {
    const index = normalizedList(attributesByPlayer[player]).indexOf(target);
    if (index === -1) continue;
    if (!best || index < best.index) {
      best = { player, index };
    }
  }
  return best ? best.player : null;
}

/**
 * Picks the attribute for the next story decision so the spotlight rotates: the eligible player
 * who decided least recently gets it, with whichever of their top three attributes was used least
 * recently (a solo player cycles Politician -> Spy -> Medic rather than the same one each time).
 * `history` is the list of past decisions: [{ owner, attribute }], oldest first.
 */
export function chooseDecisionAttribute({ players = [], attributesByPlayer = {}, connectedPlayers = null, history = [] } = {}) {
  const eligible = players.filter(player => !connectedPlayers || connectedPlayers.includes(player));
  const pool = eligible.length > 0 ? eligible : players;

  const candidates = [];
  for (const player of pool) {
    const ranked = normalizedList(attributesByPlayer[player]).slice(0, 3).filter(Boolean);
    for (const attribute of ranked) {
      if (getDecisionOwner(attribute, players, attributesByPlayer) === player) {
        candidates.push({ player, attribute, rank: ranked.indexOf(attribute) });
      }
    }
  }

  if (candidates.length === 0) return null;

  const lastIndex = (matches) => {
    for (let i = history.length - 1; i >= 0; i--) {
      if (matches(history[i])) return i;
    }
    return -1;
  };
  const lastDecidedAt = (player) => lastIndex(entry => entry?.owner === player);
  const lastUsedAt = (attribute) => lastIndex(entry => entry?.attribute === attribute);

  candidates.sort((a, b) => {
    const byRecency = lastDecidedAt(a.player) - lastDecidedAt(b.player);
    if (byRecency !== 0) return byRecency;
    const byUse = lastUsedAt(a.attribute) - lastUsedAt(b.attribute);
    if (byUse !== 0) return byUse;
    if (a.rank !== b.rank) return a.rank - b.rank;
    return pool.indexOf(a.player) - pool.indexOf(b.player);
  });

  const choice = candidates[0];
  return { attribute: choice.attribute, owner: choice.player };
}
