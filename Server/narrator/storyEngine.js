// The narrator: turns game events into narration, decisions and scene changes.
// The game decides structure (when a fight starts, who owns a decision, where fights happen);
// the model writes the words. Every path has a pre-written fallback so the game never stalls.
import {
  STORY_SYSTEM_PROMPT,
  RULES_SYSTEM_PROMPT,
  buildStateBlock,
  STORY_RESPONSE_SCHEMA,
  COMBAT_RESPONSE_SCHEMA,
  RULES_RESPONSE_SCHEMA
} from './prompts.js';
import { CHARACTERS, BOSSES, OPENING_SCENES, VALID_LOCATIONS, LOCATIONS, DECISION_ATTRIBUTES } from './lore.js';
import { getActFor, getCombatLocation, TOTAL_ENCOUNTERS, BOSS_ENCOUNTERS } from './campaign.js';
import { chooseDecisionAttribute, getDecisionOwner, normalizeAttribute } from './decisions.js';
import { FALLBACK_NARRATION, optionsForAttribute } from './fallbacks.js';
import { parseJsonObject } from './json.js';

export const FACTION_OPTIONS = ['Fight with the Enforcers', 'Fight with the Rebels'];
export const SHOP_INTRO_OPTIONS = ['Leave shop', 'Continue shopping'];
export const SHOP_CONTINUE_OPTIONS = ['Leave shop', 'Keep browsing'];

const STORY_LOCATIONS = VALID_LOCATIONS.filter(location => location !== 'boss' && location !== 'shop');
const MAX_STORY_CHARS = 1400;
const MAX_LOG_ENTRY_CHARS = 220;

export function createStorySession() {
  return {
    faction: null,
    openingCombatStarted: false,
    decisionsThisInterlude: 0,
    openingScene: null,
    storyLog: [],
    decisions: [],
    pendingDecision: null,
    lastNarration: '',
    lastStoryLocation: null,
    chatHistory: []
  };
}

// ---------------------------------------------------------------------------
// Text helpers
// ---------------------------------------------------------------------------

const ENFORCER_PATTERN = /enforcer|corporate|corp\b|authority|division|security|law|order|forces/;
const REBEL_PATTERN = /rebel|fighter|people|citizen|uprising|resistance|protest/;

// Works out which side a choice refers to. Explicit single-side values win over mixed text.
export function resolveFaction(...values) {
  const normalized = values.map(value => String(value || '').trim().toLowerCase()).filter(Boolean);
  for (const value of normalized) {
    if (value === 'enforcers' || value === 'rebels') return value;
    const enforcer = ENFORCER_PATTERN.test(value);
    const rebel = REBEL_PATTERN.test(value);
    if (enforcer && !rebel) return 'enforcers';
    if (rebel && !enforcer) return 'rebels';
  }
  return null;
}

const splitSentences = (text) =>
  String(text || '')
    .split(/(?<=[.!?]["”']?)\s+/)
    .map(sentence => sentence.trim())
    .filter(Boolean);

export function cleanNarration(text, maxChars = MAX_STORY_CHARS) {
  let cleaned = String(text || '')
    .replace(/\*\*|__|`/g, '')
    .replace(/^#+\s*/gm, '')
    .replace(/\bWhat (?:do|will) (?:you|they|the party) do\?/gi, '')
    .replace(/\s+/g, ' ')
    .trim();

  if (cleaned.length > maxChars) {
    const sentences = splitSentences(cleaned);
    let result = '';
    for (const sentence of sentences) {
      if ((result + ' ' + sentence).trim().length > maxChars) break;
      result = `${result} ${sentence}`.trim();
    }
    cleaned = result || cleaned.slice(0, maxChars);
  }
  return cleaned;
}

export function limitSentences(text, maxSentences, maxWords) {
  const sentences = splitSentences(text).slice(0, maxSentences);
  let result = sentences.join(' ');
  const words = result.split(/\s+/).filter(Boolean);
  if (words.length > maxWords) {
    result = words.slice(0, maxWords).join(' ').replace(/[,;:]+$/, '');
    if (!/[.!?]$/.test(result)) result += '.';
  }
  return result;
}

export function cleanOptions(options, count = 2) {
  if (!Array.isArray(options)) return [];
  return options
    .map(option => String(option || '')
      .replace(/^\s*(?:\d+[.)]|[-*•])\s*/, '')
      .replace(/^["'“]|["'”]$/g, '')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 60))
    .filter(Boolean)
    .filter((option, index, list) => list.indexOf(option) === index)
    .slice(0, count);
}

const normalizeLocation = (value) => {
  const key = String(value || '').trim().toLowerCase().replace(/[^a-z]+/g, '_').replace(/^_|_$/g, '');
  const aliases = { city: 'city_square', square: 'city_square', citysquare: 'city_square' };
  const resolved = aliases[key] || key;
  return VALID_LOCATIONS.includes(resolved) ? resolved : null;
};

// Names of playable characters that are NOT in the party but appear in `text`.
export function findOutsiderNames(text, party = []) {
  const inParty = new Set(party.map(member => member.characterId));
  const found = [];
  for (const [id, character] of Object.entries(CHARACTERS)) {
    if (inParty.has(id)) continue;
    const firstName = character.realName.split(' ')[0];
    const names = [character.realName, character.callsign, firstName].filter(name => name && name.length > 2);
    for (const name of new Set(names)) {
      const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      // Case-sensitive so "the shipment" or "true north" as ordinary words don't trip it.
      if (new RegExp(`(^|[^A-Za-z])${escaped}([^A-Za-z]|$)`).test(text)) {
        found.push(name);
        break;
      }
    }
  }
  return found;
}

const stripSentencesMentioning = (text, names) =>
  splitSentences(text).filter(sentence => !names.some(name => sentence.includes(name))).join(' ');

// "Leo's turn ends: Leo strikes X for 12.0 damage." -> "Leo strikes X for 12 damage."
export function tidyCombatSummary(text) {
  return String(text || '')
    .replace(/^[^:]{1,60}'s turn ends:\s*/i, '')
    .replace(/(\d+)\.\d+/g, '$1')
    .replace(/\s+/g, ' ')
    .trim();
}

const NOTABLE_COMBAT_PATTERN = /defeat|falls|fallen|killed|\bdies\b|\bdown\b|ultimate|unleash|casts|\buses\b|activates|heal|reflect|black hole|teleport|curse|burn|poison|freez|immobil/i;

export function isNotableTurn(message, data = {}, enemies = []) {
  const text = [message, ...(Array.isArray(data?.summaries) ? data.summaries : [])].join(' ');
  if (NOTABLE_COMBAT_PATTERN.test(text)) return true;
  const actor = String(data?.actor || '');
  return enemies.some(enemy => enemy?.name === actor && (enemy.tier === 'boss' || enemy.tier === 'mini-boss'));
}

// ---------------------------------------------------------------------------
// Narrator
// ---------------------------------------------------------------------------

export function createNarrator({
  provider,
  decisionsPerInterlude = 2,
  combatLinesPerMinute = 12,
  logger = console,
  random = Math.random,
  now = Date.now
} = {}) {
  if (!provider) throw new Error('createNarrator requires a provider');

  const sessions = new Map();
  const combatCallTimes = [];

  const getSession = (room) => {
    if (!sessions.has(room)) sessions.set(room, createStorySession());
    return sessions.get(room);
  };

  const remember = (session, entry) => {
    const text = String(entry || '').replace(/\s+/g, ' ').trim().slice(0, MAX_LOG_ENTRY_CHARS);
    if (!text) return;
    session.storyLog.push(text);
    if (session.storyLog.length > 30) session.storyLog.splice(0, session.storyLog.length - 30);
  };

  const characterNameFor = (playerName, context) =>
    context.party?.find(member => member.playerName === playerName)?.characterName || playerName || 'the party';

  async function callModel({ kind, system, userContent, schema, maxTokens, hints }) {
    const started = now();
    const raw = await provider.generate({
      kind,
      system,
      messages: [{ role: 'user', content: userContent }],
      schema,
      maxTokens,
      hints
    });
    const parsed = parseJsonObject(raw);
    if (!parsed) throw new Error(`${provider.name} did not return JSON`);
    logger.log?.(`[AI] ${provider.name} ${kind} ${now() - started}ms`);
    return parsed;
  }

  // Story beat with fact guard: one retry if the model mentions characters outside the party.
  async function writeStoryBeat({ session, context, instructions, hints }) {
    const actInfo = session.faction ? getActFor(session.faction, context.encounterIndex) : null;
    const state = buildStateBlock(session, {
      party: context.party,
      partyFaction: session.faction,
      encounterIndex: context.encounterIndex,
      actInfo
    });
    const lastNarration = session.lastNarration ? `\n\nPrevious narration (continue from here, do not repeat it):\n${session.lastNarration.slice(0, 700)}` : '';
    const baseContent = `${state}${lastNarration}\n\nTASK\n${instructions}\n\nReturn JSON with fields: narration, options, location, memory.`;

    let parsed = await callModel({ kind: 'story', system: STORY_SYSTEM_PROMPT, userContent: baseContent, schema: STORY_RESPONSE_SCHEMA, maxTokens: 900, hints });
    let narration = cleanNarration(parsed.narration);
    let outsiders = findOutsiderNames(narration, context.party);

    if (outsiders.length > 0) {
      logger.warn?.(`[AI] Narration mentioned characters outside the party (${outsiders.join(', ')}); retrying.`);
      const correction = `${baseContent}\n\nYour previous draft mentioned ${outsiders.join(', ')}, who are NOT in this party. Rewrite it using only the party members listed above.`;
      parsed = await callModel({ kind: 'story', system: STORY_SYSTEM_PROMPT, userContent: correction, schema: STORY_RESPONSE_SCHEMA, maxTokens: 900, hints });
      narration = cleanNarration(parsed.narration);
      outsiders = findOutsiderNames(narration, context.party);
      if (outsiders.length > 0) {
        narration = stripSentencesMentioning(narration, outsiders);
        if (!narration) {
          throw new Error('narration only described characters outside the party');
        }
      }
    }

    return {
      narration,
      options: cleanOptions(parsed.options),
      location: normalizeLocation(parsed.location),
      memory: String(parsed.memory || '').trim()
    };
  }

  const partyNames = (context) => (context.party || []).map(member => member.characterName).filter(Boolean);

  function pickStoryLocation(session, proposed) {
    if (proposed && STORY_LOCATIONS.includes(proposed)) {
      session.lastStoryLocation = proposed;
      return proposed;
    }
    return session.lastStoryLocation || null;
  }

  function nextDecision(session, context) {
    const choice = chooseDecisionAttribute({
      players: context.players,
      attributesByPlayer: context.attributesByPlayer,
      connectedPlayers: context.connectedPlayers,
      history: session.decisions
    });
    if (choice) return choice;
    // No attribute data yet: fall back to a rotating default.
    const fallbackAttributes = ['politician', 'detective', 'spy', 'electrician', 'medic', 'crook', 'scholar', 'intimidation'];
    const attribute = fallbackAttributes[session.decisions.length % fallbackAttributes.length];
    return { attribute, owner: getDecisionOwner(attribute, context.players, context.attributesByPlayer) };
  }

  function recordChoice(session, context, choice) {
    const pending = session.pendingDecision;
    const owner = pending?.owner || null;
    session.decisions.push({
      owner,
      by: pending?.ownerName || (owner ? characterNameFor(owner, context) : 'The party'),
      attribute: pending?.attribute || null,
      choice: String(choice || '').slice(0, 80)
    });
    if (session.decisions.length > 40) session.decisions.splice(0, session.decisions.length - 40);
    session.pendingDecision = null;
  }

  // -------------------------------------------------------------------------
  // Event handlers. Each returns { response, location, attribute, startCombat, options }.
  // -------------------------------------------------------------------------

  async function gameStart(session, context) {
    const sceneKeys = Object.keys(OPENING_SCENES);
    session.openingScene = session.openingScene || sceneKeys[Math.floor(random() * sceneKeys.length)];
    session.decisionsThisInterlude = 0;
    const owner = getDecisionOwner('politician', context.players, context.attributesByPlayer);
    const ownerName = characterNameFor(owner, context);
    session.pendingDecision = { attribute: 'politician', owner, ownerName, options: FACTION_OPTIONS };

    const instructions = [
      'Write the OPENING SCENE in 5-7 sentences.',
      'Spend at most two sentences on the city itself, then drop the party into this incident:',
      OPENING_SCENES[session.openingScene],
      'Show the party members reacting in character (use their callsigns). Give one NPC a line of dialogue.',
      `End by framing the choice: help the Enforcers or help the Rebels. ${ownerName} (Politician) must make the call for the group.`,
      `Set options to exactly ${JSON.stringify(FACTION_OPTIONS)} and location to "city_square".`
    ].join('\n');

    let beat;
    try {
      beat = await writeStoryBeat({
        session,
        context,
        instructions,
        hints: { eventType: 'game_start', partyNames: partyNames(context), ownerName, attribute: 'politician', needsOptions: true, fixedOptions: FACTION_OPTIONS, location: 'city_square' }
      });
    } catch (error) {
      logger.warn?.(`[AI] game_start fell back: ${error.message}`);
      beat = { narration: FALLBACK_NARRATION.game_start, memory: 'A bombing at the Twilight Market forced the party to pick a side.', fallback: true };
    }

    remember(session, beat.memory || 'The party was caught in a bombing and forced to choose a side.');
    session.lastNarration = beat.narration;
    session.lastStoryLocation = 'city_square';
    return { response: beat.narration, location: 'city_square', attribute: 'politician', startCombat: false, options: FACTION_OPTIONS, fallback: !!beat.fallback };
  }

  async function factionChosen(session, context, faction) {
    session.faction = faction;
    session.openingCombatStarted = true;
    session.decisionsThisInterlude = 0;
    recordChoice(session, context, faction === 'enforcers' ? 'side with the Enforcers' : 'side with the Rebels');

    const other = faction === 'enforcers' ? 'Rebels' : 'Enforcers';
    const chosen = faction === 'enforcers' ? 'Enforcers' : 'Rebels';
    const location = getCombatLocation(faction, 0, 'city_square');
    const instructions = [
      `The party sides with the ${chosen} against the ${other}.`,
      'In 2-3 sentences: show them committing (an NPC from the chosen side reacts with one line), then the opening battle erupts.',
      `Set options to [] and location to "${location}".`
    ].join('\n');

    let beat;
    try {
      beat = await writeStoryBeat({ session, context, instructions, hints: { eventType: 'faction', partyNames: partyNames(context), startsCombat: true, location } });
    } catch (error) {
      logger.warn?.(`[AI] faction choice fell back: ${error.message}`);
      beat = { narration: `The party sides with the ${chosen} against the ${other}. ${FALLBACK_NARRATION.faction_choice}`, fallback: true };
    }

    remember(session, beat.memory || `The party sided with the ${chosen}.`);
    session.lastNarration = beat.narration;
    return { response: beat.narration, location, attribute: null, startCombat: true, options: null, fallback: !!beat.fallback };
  }

  async function presentDecision(session, context, { eventType, intro, lastChoice = null }) {
    const decision = nextDecision(session, context);
    const ownerName = characterNameFor(decision.owner, context);
    const instructions = [
      intro,
      `Then present the next decision. It is ${ownerName}'s call, because the situation calls for ${decision.attribute[0].toUpperCase()}${decision.attribute.slice(1)} skills: ${DECISION_ATTRIBUTES[decision.attribute] || 'their expertise'}.`,
      'Write exactly two options that play to that skill, each under 9 words, leading in different directions.',
      'Set location to the location key where this scene happens (not "boss" or "shop"), or "none" to stay put.'
    ].join('\n');

    let beat;
    try {
      beat = await writeStoryBeat({
        session,
        context,
        instructions,
        hints: { eventType, partyNames: partyNames(context), ownerName, attribute: decision.attribute, needsOptions: true, lastChoice }
      });
    } catch (error) {
      logger.warn?.(`[AI] ${eventType} fell back: ${error.message}`);
      beat = { narration: `${FALLBACK_NARRATION[eventType] || FALLBACK_NARRATION.choice_made} All eyes turn to ${ownerName}.`, options: [], fallback: true };
    }

    const options = beat.options?.length === 2 ? beat.options : optionsForAttribute(decision.attribute);
    session.pendingDecision = { attribute: decision.attribute, owner: decision.owner, ownerName, options };
    remember(session, beat.memory);
    session.lastNarration = beat.narration;
    const location = pickStoryLocation(session, beat.location);
    return { response: beat.narration, location, attribute: decision.attribute, startCombat: false, options, fallback: !!beat.fallback };
  }

  async function leadIntoFight(session, context, { eventType, intro, lastChoice = null }) {
    session.decisionsThisInterlude = 0;
    const encounterIndex = Math.min(TOTAL_ENCOUNTERS - 1, context.encounterIndex);
    const actInfo = session.faction ? getActFor(session.faction, encounterIndex) : null;
    const location = getCombatLocation(session.faction, encounterIndex, 'street');
    const boss = actInfo?.isBossEncounter ? BOSSES[actInfo.act.boss] : null;
    const instructions = [
      intro,
      actInfo?.encounter ? `Lead straight into the next fight: ${actInfo.encounter.setup}` : 'Lead straight into the next fight.',
      boss ? `${boss.name} appears in person: give them one line of dialogue that fits their personality.` : 'Keep it tight: 2-4 sentences.',
      `End the moment the fight begins. Set options to [] and location to "${location}".`
    ].join('\n');

    let beat;
    try {
      beat = await writeStoryBeat({ session, context, instructions, hints: { eventType, partyNames: partyNames(context), startsCombat: true, location, lastChoice, setup: actInfo?.encounter?.setup } });
    } catch (error) {
      logger.warn?.(`[AI] ${eventType} fell back: ${error.message}`);
      beat = { narration: FALLBACK_NARRATION.next_encounter, fallback: true };
    }

    remember(session, beat.memory);
    session.lastNarration = beat.narration;
    return { response: beat.narration, location, attribute: null, startCombat: true, options: null, fallback: !!beat.fallback };
  }

  async function encounterEnd(session, context) {
    session.decisionsThisInterlude = 0;
    const justFinished = Math.max(0, context.encounterIndex - 1);
    const actInfo = session.faction ? getActFor(session.faction, justFinished) : null;
    const defeatedBoss = BOSS_ENCOUNTERS.includes(justFinished) && actInfo ? BOSSES[actInfo.act.boss] : null;
    const nextAct = session.faction ? getActFor(session.faction, context.encounterIndex) : null;

    if (context.encounterIndex >= TOTAL_ENCOUNTERS) {
      return ending(session, context);
    }

    const intro = defeatedBoss
      ? `The party just defeated ${defeatedBoss.name}. Describe the aftermath in 2-3 sentences and close this act. ${nextAct?.act ? `Then open the next act: ${nextAct.act.title} - ${nextAct.act.goal}` : ''}`
      : 'The fight is over. Describe the aftermath in 2-3 sentences (what the party finds, who is watching), moving the current act forward.';

    return presentDecision(session, context, { eventType: 'encounter_end', intro });
  }

  async function ending(session, context) {
    let beat;
    try {
      beat = await writeStoryBeat({
        session,
        context,
        instructions: [
          'The final villain is defeated. Write the ENDING in 6-9 sentences.',
          'The ending must grow out of the choices this party actually made; the campaign ending for this side lists possible directions, not a required one.',
          session.decisions.length
            ? 'Every decision this party made, in order:\n' + session.decisions.map(d => `- ${d.by}${d.attribute ? ` (${d.attribute})` : ''}: ${d.choice}`).join('\n')
            : '',
          "Name what their choices cost or saved, close each party member's arc in a phrase, and end with a line of dialogue from a surviving NPC.",
          'Set options to [] and location to "none".'
        ].filter(Boolean).join('\n'),
        hints: { eventType: 'ending', partyNames: partyNames(context) }
      });
    } catch {
      beat = { narration: FALLBACK_NARRATION.ending, fallback: true };
    }
    session.lastNarration = beat.narration;
    return { response: beat.narration, location: null, attribute: null, startCombat: false, options: null, fallback: !!beat.fallback };
  }

  async function storyChoice(session, context, choice) {
    recordChoice(session, context, choice);
    session.decisionsThisInterlude += 1;
    const intro = `${session.decisions[session.decisions.length - 1]?.by || 'The party'} decided: "${choice}". Narrate the consequence in 2-4 sentences; it should matter.`;

    if (session.decisionsThisInterlude >= decisionsPerInterlude) {
      return leadIntoFight(session, context, { eventType: 'choice_made', intro, lastChoice: choice });
    }
    return presentDecision(session, context, { eventType: 'choice_made', intro, lastChoice: choice });
  }

  async function shop(session, context, eventType) {
    const owner = getDecisionOwner('banker', context.players, context.attributesByPlayer);
    const ownerName = characterNameFor(owner, context);
    const options = eventType === 'shop_intro' ? SHOP_INTRO_OPTIONS : SHOP_CONTINUE_OPTIONS;
    let beat;
    try {
      beat = await writeStoryBeat({
        session,
        context,
        instructions: `${eventType === 'shop_intro' ? 'The party visits Dex "Static" Moreno\'s shop. Describe it in 2-3 sentences with one line from Dex.' : 'The party keeps browsing. One or two sentences: Dex shows something interesting.'} ${ownerName} (Banker) handles the money. Set options to ${JSON.stringify(options)} and location to "shop".`,
        hints: { eventType, partyNames: partyNames(context), ownerName, attribute: 'banker', needsOptions: true, fixedOptions: options, location: 'shop' }
      });
    } catch {
      beat = { narration: FALLBACK_NARRATION[eventType], fallback: true };
    }
    session.pendingDecision = { attribute: 'banker', owner, ownerName, options };
    session.lastNarration = beat.narration;
    return { response: beat.narration, location: 'shop', attribute: 'banker', startCombat: false, options, fallback: !!beat.fallback };
  }

  async function combatLine(session, context, message, data) {
    const summary = tidyCombatSummary(message);
    const recent = combatCallTimes.filter(time => now() - time < 60_000);
    combatCallTimes.length = 0;
    combatCallTimes.push(...recent);

    const notable = isNotableTurn(message, data, context.enemies);
    if (!notable || combatCallTimes.length >= combatLinesPerMinute) {
      return { response: summary || 'The fight grinds on.', location: null, attribute: null, startCombat: false, options: null, fallback: false };
    }

    combatCallTimes.push(now());
    const enemyNames = [...new Set((context.enemies || []).filter(e => !e.isDead).map(e => e.name))];
    const content = [
      `Party: ${partyNames(context).join(', ') || 'unknown'}.`,
      enemyNames.length ? `Enemies still standing: ${enemyNames.join(', ')}.` : '',
      `What just happened (game log): ${summary}`,
      'Write ONE or TWO sentences (max 35 words) of vivid combat commentary about exactly these actions. Use the names from the log. No numbers. Return JSON {"narration": "..."}.'
    ].filter(Boolean).join('\n');

    try {
      const parsed = await callModel({ kind: 'combat', system: STORY_SYSTEM_PROMPT, userContent: content, schema: COMBAT_RESPONSE_SCHEMA, maxTokens: 160, hints: { summary } });
      let narration = limitSentences(cleanNarration(parsed.narration, 400), 2, 50);
      const outsiders = findOutsiderNames(narration, context.party);
      if (outsiders.length > 0 || !narration) narration = summary;
      return { response: narration, location: null, attribute: null, startCombat: false, options: null, fallback: false };
    } catch (error) {
      logger.warn?.(`[AI] combat line fell back: ${error.message}`);
      return { response: summary || 'The fight grinds on.', location: null, attribute: null, startCombat: false, options: null, fallback: true };
    }
  }

  async function rulesHelp(session, context, message, data) {
    const question = String(message || '').slice(0, 600);
    const rulesContext = buildRulesContext(question, data?.rulesContext);
    const history = session.chatHistory.slice(-6).map(entry => `${entry.role === 'user' ? 'Player' : 'Helper'}: ${entry.text}`).join('\n');
    const content = [
      rulesContext,
      history ? `Conversation so far:\n${history}` : '',
      `Player question: ${question}`
    ].filter(Boolean).join('\n\n');

    try {
      const parsed = await callModel({ kind: 'rules', system: RULES_SYSTEM_PROMPT, userContent: content, schema: RULES_RESPONSE_SCHEMA, maxTokens: 450, hints: { question } });
      const answer = cleanNarration(parsed.answer || parsed.response || parsed.narration, 1500) || FALLBACK_NARRATION.chat_message;
      session.chatHistory.push({ role: 'user', text: question }, { role: 'assistant', text: answer });
      if (session.chatHistory.length > 12) session.chatHistory.splice(0, session.chatHistory.length - 12);
      return { response: answer, location: null, attribute: null, startCombat: false, options: null, fallback: false };
    } catch (error) {
      logger.warn?.(`[AI] rules help fell back: ${error.message}`);
      return { response: FALLBACK_NARRATION.chat_message, location: null, attribute: null, startCombat: false, options: null, fallback: true };
    }
  }

  return {
    providerName: provider.name,

    getSession,

    resetSession(room) {
      sessions.delete(room);
    },

    // Public snapshot used to restore a reconnecting client.
    describeSession(room) {
      const session = sessions.get(room);
      if (!session) return null;
      return {
        faction: session.faction,
        openingCombatStarted: session.openingCombatStarted,
        pendingDecision: session.pendingDecision,
        lastNarration: session.lastNarration
      };
    },

    /**
     * @param {object} request
     * @param {string} request.room
     * @param {string} request.eventType
     * @param {string} [request.message]
     * @param {object} [request.data]
     * @param {object} request.context - party, players, attributesByPlayer, connectedPlayers,
     *   partyFaction, encounterIndex (fights started so far), enemies
     */
    async handleEvent({ room, eventType, message = '', data = {}, context = {} }) {
      const session = getSession(room);
      const safeContext = {
        party: context.party || [],
        players: context.players || [],
        attributesByPlayer: context.attributesByPlayer || {},
        connectedPlayers: context.connectedPlayers || null,
        encounterIndex: Number.isFinite(context.encounterIndex) ? context.encounterIndex : 0,
        enemies: context.enemies || []
      };
      if (!session.faction && (context.partyFaction === 'enforcers' || context.partyFaction === 'rebels')) {
        session.faction = context.partyFaction;
      }
      const payload = data && typeof data === 'object' ? data : {};

      switch (eventType) {
        case 'chat_message':
          return rulesHelp(session, safeContext, message, payload);

        case 'turn_action':
          return combatLine(session, safeContext, message, payload);

        case 'game_start':
          return gameStart(session, safeContext);

        case 'shop_intro':
        case 'shop_continue':
          return shop(session, safeContext, eventType);

        case 'next_encounter':
          return leadIntoFight(session, safeContext, { eventType, intro: 'The party moves on.' });

        case 'encounter_end':
          return encounterEnd(session, safeContext);

        case 'campaign_end':
          return ending(session, safeContext);

        case 'choice_made':
        case 'story_choice':
        case 'dynamic_scenario': {
          const choice = payload.choice || message;
          if (!session.openingCombatStarted) {
            const faction = resolveFaction(payload.selected_faction, payload.faction, payload.selected_side, payload.choice, message);
            if (faction) return factionChosen(session, safeContext, faction);
            // Unclear answer to the opening question: ask again rather than guessing a side.
            return {
              response: 'The party hesitates. Both sides are waiting for an answer.',
              location: 'city_square',
              attribute: 'politician',
              startCombat: false,
              options: FACTION_OPTIONS,
              fallback: false
            };
          }
          return storyChoice(session, safeContext, choice);
        }

        default:
          return {
            response: cleanNarration(message) || 'The city hums on.',
            location: null,
            attribute: null,
            startCombat: false,
            options: null,
            fallback: false
          };
      }
    }
  };
}

// Builds a short, relevant rules context for the help assistant from what the client sends.
export function buildRulesContext(question, rulesContext) {
  if (!rulesContext || typeof rulesContext !== 'object') return '';
  const lines = ['Authoritative rules context from the game (trust this over assumptions):'];
  const lower = question.toLowerCase();
  const character = rulesContext.currentCharacter;

  if (character?.name) {
    lines.push(`Player character: ${character.name} (${character.role || 'unknown role'}, level ${character.level ?? '?'})`);
    if (character.weapon?.name) {
      lines.push(`Weapon: ${character.weapon.name}, damage ${character.weapon.damage ?? '?'}, range ${character.weapon.range ?? '?'}`);
    }
    const formatAbility = (ability) =>
      `- ${ability.name}: ${ability.description} [target ${ability.targetType || '?'}, range ${ability.range ?? '-'}, cooldown ${ability.cooldown ?? '-'}, ${ability.actionCost === 'bonus' ? 'bonus action' : 'action'}${ability.isUltimate ? ', ultimate' : ''}]`;
    if (Array.isArray(character.abilities) && character.abilities.length) {
      lines.push(`Equipped abilities:\n${character.abilities.map(formatAbility).join('\n')}`);
    }
    if (character.ultimate?.name) {
      lines.push(`Ultimate:\n${formatAbility(character.ultimate)}`);
    }
  }

  const rules = rulesContext.generalRules || {};
  if (/attack|weapon/.test(lower) && rules.basicAttack) lines.push(`Basic attack: ${rules.basicAttack}`);
  if (/ultimate/.test(lower) && rules.ultimates) lines.push(`Ultimates: ${rules.ultimates}`);
  if (/bonus/.test(lower) && rules.bonusActions) lines.push(`Bonus actions: ${rules.bonusActions}`);
  if (/attribute|decision|politician|banker|navigator/.test(lower) && rules.decisionAttributes) {
    lines.push(`Attributes: ${rules.decisionAttributes}`);
  }

  const catalog = Array.isArray(rulesContext.abilityCatalog) ? rulesContext.abilityCatalog : [];
  const mentioned = catalog.filter(ability => ability?.name && lower.includes(String(ability.name).toLowerCase())).slice(0, 4);
  if (mentioned.length) {
    lines.push(`Abilities mentioned:\n${mentioned.map(a => `- ${a.name}: ${a.description} [target ${a.targetType || '?'}, range ${a.range ?? '-'}, cooldown ${a.cooldown ?? '-'}]`).join('\n')}`);
  }

  return lines.length > 1 ? lines.join('\n') : '';
}

// Kept for callers that only need to know if a location key is real.
export const isKnownLocation = (value) => !!normalizeLocation(value) && !!LOCATIONS[normalizeLocation(value)];
export { normalizeAttribute };
