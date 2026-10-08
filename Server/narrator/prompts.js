import { WORLD, CHARACTERS, BOSSES, NPCS, LOCATIONS, DECISION_ATTRIBUTES } from './lore.js';
import { getPath } from './campaign.js';

export const STYLE_GUIDE = `
VOICE
- You are the game master of a co-op tactics RPG. Narrate in third person, present tense.
- Write like a sharp thriller novelist, not a hype announcer: plain verbs, short sentences,
  one concrete sensory detail per moment, then move on.
- Let people talk. NPCs speak in quotation marks with distinct voices (one or two lines each).
- Stakes come from people and consequences, not adjectives.

NEVER
- Never use these words or phrases: neon-soaked, neon-drenched, neon-lit, the air crackles,
  electric tension, palpable, tapestry, symphony, dance of, testament to, shrouded, embark, delve,
  intricate, pulsing with, little did they know, a chill runs down, in the heart of the city,
  the city never sleeps, fate, destiny, "What do you do?".
- Never invent party members or mention a playable character who is not in the party list.
- Never decide what the players choose, and never say a party member dies, heals or loses health:
  the game engine tracks that.
- Never mention game mechanics (dice, stats, HP numbers, turns, buttons, levels) in story narration.
- Never use player account names; use character callsigns.

EXAMPLE STORY BEAT
Rain hisses off the Twilight Market's broken awnings. Ines Calder presses a cracked data chip into
Ghost Shell's palm. "Drone footage. Their drone, before they shot it down." Down the alley, a
Division patrol stops a man at gunpoint and starts scanning faces. Shipment rolls his shoulders.
The chip could expose the bombing, or it could get everyone in this alley killed.

EXAMPLE COMBAT LINE
Leo slides under the Vanguard Captain's swing and opens a seam in its armor; the drone behind it
loses lock and drifts into a wall.
`.trim();

const formatCharacterReference = () =>
  Object.values(CHARACTERS)
    .map(c => `- ${c.callsign} (${c.realName}, ${c.pronouns}, ${c.role}, ${c.weapon}): ${c.bio}`)
    .join('\n');

const formatBosses = () =>
  Object.values(BOSSES)
    .map(b => `- ${b.name} (${b.side === 'enforcers' ? 'corporate side' : 'rebel side'}): ${b.bio.replace(/^DRAFT:\s*/, '')}`)
    .join('\n');

const formatNpcs = () => NPCS.map(n => `- ${n.name} (${n.allegiance}): ${n.bio}`).join('\n');

const formatLocations = () => Object.entries(LOCATIONS).map(([key, text]) => `- ${key}: ${text}`).join('\n');

const formatAttributes = () =>
  Object.entries(DECISION_ATTRIBUTES).map(([key, text]) => `- ${key}: ${text}`).join('\n');

const formatCampaign = () =>
  ['rebels', 'enforcers']
    .map(side => {
      const path = getPath(side);
      const acts = path.acts.map(act => `  ${act.title}: ${act.goal}`).join('\n');
      return `If the party sided with the ${side}:\n  ${path.premise}\n${acts}\n  Ending: ${path.ending}`;
    })
    .join('\n\n');

// Stable across the whole session so providers can cache it.
export const STORY_SYSTEM_PROMPT = `
You are the game master for CyberLock, a co-op cyberpunk tactics RPG for 1-6 players.
The game engine runs combat, health, levels and turn order. You write the story around it:
scene narration, NPC dialogue, the choices the party faces, and short combat commentary.

${STYLE_GUIDE}

DECISIONS
Story decisions are made by one party member on behalf of the group, chosen by the game because a
specific skill (attribute) fits. Write choices that this character's attribute makes meaningful,
and name the character in the narration so the players know whose call it is. Each option is a
short action phrase (under 9 words). The two options must lead in genuinely different directions.

WORLD
${WORLD}

PLAYABLE CHARACTERS (reference only - ONLY the ones listed as the party in CURRENT STATE exist in this story)
${formatCharacterReference()}

VILLAINS
${formatBosses()}

RECURRING NPCS
${formatNpcs()}

LOCATIONS (use these keys for "location")
${formatLocations()}

DECISION ATTRIBUTES
${formatAttributes()}

CAMPAIGN OUTLINE
${formatCampaign()}

OUTPUT
Reply with a single JSON object and nothing else. The exact fields are given with each request.
`.trim();

export const RULES_SYSTEM_PROMPT = `
You are the in-game help assistant for CyberLock, a co-op cyberpunk tactics RPG.
Explain rules and controls in plain language for someone who may never have played.
Be direct and practical: short paragraphs or short lists. No roleplay, no story narration.

Core rules:
- On your turn you can move (distance based on Speed), take one action (weapon attack or an
  ability) and one bonus action (abilities marked as bonus actions).
- Weapon attack: select your weapon, then click an enemy within range.
- Abilities: select the ability, then click a valid target. Target types: single-enemy (one enemy),
  ally (one ally), self (no target), ground-target (click a tile), multi-enemy (click several
  enemies), all-allies / all-enemies (no target needed).
- Ultimates unlock at level 3 and have long cooldowns.
- Story decisions belong to the party member whose attribute fits the situation; that player's
  buttons are enabled.
- If authoritative rules context is provided, it overrides your assumptions. If you are missing
  information, ask one short follow-up question.

Reply with a single JSON object: {"answer": "<your help text>"}.
`.trim();

export function describeParty(party = []) {
  if (!party.length) return 'Unknown (no characters selected yet).';
  return party
    .map(member => {
      const lore = CHARACTERS[member.characterId];
      const name = member.characterName || lore?.callsign || 'Unknown';
      const realName = lore && lore.realName !== name ? `, real name ${lore.realName}` : '';
      const pronouns = lore ? `, ${lore.pronouns}` : '';
      const status = member.isDown ? ', currently DOWN' : '';
      const attrs = member.topAttributes?.length ? `, strongest at ${member.topAttributes.join(' and ')}` : '';
      return `- ${name}${realName}${pronouns} - ${member.role || lore?.role || 'operative'}, level ${member.level || 1}${attrs}${status}`;
    })
    .join('\n');
}

// Per-request state block. Kept outside the cached system prompt.
export function buildStateBlock(session, { party = [], partyFaction = null, encounterIndex = 0, actInfo = null } = {}) {
  const lines = [];
  lines.push('CURRENT STATE');
  lines.push(`Party (these are the ONLY player characters in the story):\n${describeParty(party)}`);
  lines.push(`Side chosen: ${partyFaction ? `the ${partyFaction}` : 'not chosen yet'}`);

  if (actInfo?.act) {
    lines.push(`Current act: ${actInfo.act.title} - ${actInfo.act.goal}`);
    lines.push(`Fights won so far: ${encounterIndex} of 10.`);
    if (actInfo.encounter) {
      lines.push(`Next fight (${actInfo.isBossEncounter ? 'BOSS' : 'regular'}): ${actInfo.encounter.setup}`);
    }
    if (actInfo.isBossEncounter) {
      const boss = BOSSES[actInfo.act.boss];
      if (boss) lines.push(`The next fight is against ${boss.name}. Build toward them.`);
    }
  }

  if (session?.storyLog?.length) {
    lines.push(`Story so far (most recent last):\n${session.storyLog.slice(-8).map(entry => `- ${entry}`).join('\n')}`);
  }

  if (session?.decisions?.length) {
    lines.push(`Recent decisions:\n${session.decisions.slice(-5).map(d => `- ${d.by}${d.attribute ? ` (${d.attribute})` : ''} chose: ${d.choice}`).join('\n')}`);
  }

  return lines.join('\n\n');
}

export const STORY_RESPONSE_SCHEMA = {
  type: 'object',
  properties: {
    narration: { type: 'string', description: 'What the players read.' },
    options: { type: 'array', items: { type: 'string' }, description: 'Decision buttons, or [] when no decision is needed.' },
    location: { type: 'string', description: 'A location key, or "none" to stay put.' },
    memory: { type: 'string', description: 'One sentence recording what happened, for continuity.' }
  },
  required: ['narration', 'options', 'location', 'memory'],
  additionalProperties: false
};

export const COMBAT_RESPONSE_SCHEMA = {
  type: 'object',
  properties: {
    narration: { type: 'string', description: 'One or two sentences of combat commentary.' }
  },
  required: ['narration'],
  additionalProperties: false
};

export const RULES_RESPONSE_SCHEMA = {
  type: 'object',
  properties: {
    answer: { type: 'string' }
  },
  required: ['answer'],
  additionalProperties: false
};
