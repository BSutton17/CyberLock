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
 * Picks the attribute for the next story decision so the spotlight rotates:
 * the eligible player who decided least recently gets it, using their primary attribute
 * (or secondary, if the primary was used in the last two decisions).
 * `history` is the list of past decisions: [{ owner, attribute }], oldest first.
 */
export function chooseDecisionAttribute({ players = [], attributesByPlayer = {}, connectedPlayers = null, history = [] } = {}) {
  const eligible = players.filter(player => !connectedPlayers || connectedPlayers.includes(player));
  const pool = eligible.length > 0 ? eligible : players;

  const candidates = [];
  for (const player of pool) {
    const ranked = normalizedList(attributesByPlayer[player]).slice(0, 2).filter(Boolean);
    for (const attribute of ranked) {
      if (getDecisionOwner(attribute, players, attributesByPlayer) === player) {
        candidates.push({ player, attribute, rank: ranked.indexOf(attribute) });
      }
    }
  }

  if (candidates.length === 0) return null;

  const lastDecidedAt = (player) => {
    for (let i = history.length - 1; i >= 0; i--) {
      if (history[i]?.owner === player) return i;
    }
    return -1;
  };
  const recentAttributes = history.slice(-2).map(entry => entry?.attribute);

  candidates.sort((a, b) => {
    const byRecency = lastDecidedAt(a.player) - lastDecidedAt(b.player);
    if (byRecency !== 0) return byRecency;
    const aRecent = recentAttributes.includes(a.attribute) ? 1 : 0;
    const bRecent = recentAttributes.includes(b.attribute) ? 1 : 0;
    if (aRecent !== bRecent) return aRecent - bRecent;
    if (a.rank !== b.rank) return a.rank - b.rank;
    return pool.indexOf(a.player) - pool.indexOf(b.player);
  });

  const choice = candidates[0];
  return { attribute: choice.attribute, owner: choice.player };
}
