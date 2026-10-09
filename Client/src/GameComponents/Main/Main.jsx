import React from 'react';
import { useState, useEffect, useRef } from 'react';
import { useGameContext } from '../../Components/Context';
import { getAbility, calculateTotalStat, getStatBonuses } from '@shared/combat/effects.js';
import { SEWER_SLOW_TILE_KEYS, speedOnTile, tileKey } from '@shared/combat/grid.js';
import { TOTAL_ENCOUNTERS } from '@shared/combat/encounters.js';
import { GiDeathSkull, GiPoisonBottle, GiRunningShoe, GiCrossedChains } from 'react-icons/gi';
import { FaRegSnowflake, FaSkullCrossbones, FaFireAlt, FaShieldAlt } from 'react-icons/fa';
import './Main.css';
import ChatBot from '../ChatBot/ChatBot';
import SettingsMenu from '../../Components/SettingsMenu';
import DialogueChoices from './DialogueChoices';

const SCENE_BACKGROUNDS = {
    city_square: '/backgrounds/Background-City Square.png',
    warehouse: '/backgrounds/Background-Warehouse.png',
    club: '/backgrounds/Background-Club.png',
    hospital: '/backgrounds/Background-Hospital.png',
    office: '/backgrounds/Background-office.png',
    sewer: '/backgrounds/Background-sewer.png',
    shop: '/backgrounds/Background-shop.png',
    boss: '/backgrounds/Background-boss.png',
    street: '/backgrounds/Cyberpunk City Street.png'
};

const SCENE_LABELS = {
    city_square: 'City Square',
    warehouse: 'Warehouse',
    club: 'Club',
    hospital: 'Hospital',
    office: 'Office',
    sewer: 'Sewer',
    shop: 'Shop',
    boss: 'Boss Arena',
    street: 'Street'
};

const SCENE_ALIASES = {
    city: 'city_square',
    citysquare: 'city_square',
    city_square: 'city_square',
    square: 'city_square',
    warehouse: 'warehouse',
    club: 'club',
    hospital: 'hospital',
    office: 'office',
    sewer: 'sewer',
    shop: 'shop',
    boss: 'boss',
    street: 'street'
};


const TURN_START_ACTION_LOCK_MS = 500;
// How fast a player's token walks between tiles (enemy speed comes from the server).
const PLAYER_STEP_MS = 140;
const DEFAULT_SCENE_KEY = 'city';
const DECISION_ATTRIBUTE_ALIASES = {
    politics: 'politician',
    political: 'politician',
    persuasion: 'politician',
    diplomat: 'politician',
    diplomacy: 'politician',
    intimidation: 'intimidation',
    scholar: 'scholar',
    research: 'scholar',
    spy: 'spy',
    stealth: 'spy',
    detective: 'detective',
    investigation: 'detective',
    investigate: 'detective',
    medic: 'medic',
    medicine: 'medic',
    medical: 'medic',
    navigator: 'navigator',
    navigation: 'navigator',
    travel: 'navigator',
    banker: 'banker',
    finance: 'banker',
    financial: 'banker',
    money: 'banker',
    crook: 'crook',
    criminal: 'crook',
    underworld: 'crook',
    electrician: 'electrician',
    electric: 'electrician',
    electrical: 'electrician',
    tech: 'electrician'
};

const SCENE_TRANSITION_EVENTS = new Set([
    'game_start',
    'choice_made',
    'shop_intro',
    'next_encounter',
    'scene',
    'scene_change',
    'location',
    'story_choice',
    'dynamic_scenario'
]);

// Sewer tiles where nobody is placed when the party is laid out on the story board.
const SEWER_SPAWN_BLOCKED_TILE_KEYS = new Set([...SEWER_SLOW_TILE_KEYS, '0,4', '0,5', '6,4', '6,5']);
const isSewerSpawnBlockedTile = (sceneKey, row, col) =>
    sceneKey === 'sewer' && SEWER_SPAWN_BLOCKED_TILE_KEYS.has(tileKey(row, col));

const normalizeSceneToken = (value = '') =>
    value
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_+|_+$/g, '');
const normalizeDecisionAttribute = (rawAttribute = '') => {
    const normalizedAttribute = normalizeSceneToken(rawAttribute);
    return DECISION_ATTRIBUTE_ALIASES[normalizedAttribute] || normalizedAttribute || null;
};

const inferDecisionAttributeFromOptions = (eventType, options = []) => {
    if (eventType === 'shop_intro' || eventType === 'shop_continue') {
        return 'banker';
    }
    if (eventType === 'game_start') {
        return 'politician';
    }

    const optionText = options.join(' ').toLowerCase();

    if (/(shop|vendor|buy|sell|browse|market|store|price|barter)/.test(optionText)) {
        return 'banker';
    }
    if (/(leave|journey|travel|route|where|next encounter|move|head|go)/.test(optionText)) {
        return 'navigator';
    }
    if (/(help|ally|support|convince|negotiate|diplomacy|corporate|fighters|people)/.test(optionText)) {
        return 'politician';
    }
    if (/(threat|pressure|coerce|intimidat)/.test(optionText)) {
        return 'intimidation';
    }
    if (/(clue|investigat|evidence|pattern)/.test(optionText)) {
        return 'detective';
    }
    if (/(stealth|infiltrat|surveil|sneak)/.test(optionText)) {
        return 'spy';
    }
    if (/(study|research|lore|decipher|ancient)/.test(optionText)) {
        return 'scholar';
    }
    if (/(heal|treat|diagnos|stabilize)/.test(optionText)) {
        return 'medic';
    }
    if (/(theft|forge|scam|criminal|underworld)/.test(optionText)) {
        return 'crook';
    }
    if (/(circuit|power|electric|grid|reroute)/.test(optionText)) {
        return 'electrician';
    }

    return 'politician';
};

const sanitizeAiNarrationText = (rawText = '') => {
    const normalizedText = String(rawText || '')
        .replace(/\\\//g, '/')
        .replace(/\\n/g, '\n')
        .replace(/\\r/g, '\n')
        .replace(/\\t/g, ' ')
        .replace(/\\"/g, '"');

    const lines = normalizedText
        .split('\n')
        .map(line => line.trim())
        .filter(line => line && line !== '/' && line !== '\\' && line !== '```' && line !== '```json');

    return lines
        .join(' ')
        .replace(/\b(?:location|attribute|start_?combat|options)\b\s*(?:[:=]|is)?\s*(?:null|none|true|false|\[[^\]]*\]|"[^"]*"|[a-z_]+)/gi, '')
        .replace(/\s+/g, ' ')
        .trim();
};

const resolveSceneKey = (rawKeyword = '') => {
    const normalizedKeyword = normalizeSceneToken(rawKeyword);
    return SCENE_ALIASES[normalizedKeyword] || null;
};

const TYPEWRITER_CHAR_INTERVAL_MS = 20;
const TYPEWRITER_SENTENCE_GAP_FACTOR_MS = 18;
const TURN_ADVANCE_AFTER_TYPING_MS = 1000;
// Real models can take several seconds for a story beat; fall back only if the server is truly stuck.
const POST_COMBAT_NARRATION_TIMEOUT_MS = 25000;

const splitAiTextSegments = (message = '') => {
    const trimmedMessage = String(message || '').trim();
    if (!trimmedMessage) return [];

    const segments = trimmedMessage
        .split(/(?<=[.!?])\s+|\n+/)
        .map(segment => segment.trim())
        .filter(Boolean);

    return segments.length > 0 ? segments : [trimmedMessage];
};

const estimateTypewriterDurationMs = (message = '') => {
    const segments = splitAiTextSegments(message);
    if (segments.length === 0) return 0;

    return segments.reduce((durationMs, segment, index) => {
        const typingDurationMs = segment.length * TYPEWRITER_CHAR_INTERVAL_MS;
        const sentencePauseMs = index < segments.length - 1
            ? segment.length * TYPEWRITER_SENTENCE_GAP_FACTOR_MS
            : 0;

        return durationMs + typingDurationMs + sentencePauseMs;
    }, 0);
};


function Main() {
    const {
        players,
        playerCharacters,
        playerName,
        room,
        socket,
        getAbilityScaler,
        gamePhase,
        setGamePhase,
        isMyTurn,
        currentTurn,
        setCurrentTurn,
        setIsMyTurn,
        enemies,
        setEnemies,
        setTurnOrder,
        getCharacterImage,
        getEnemyImage,
        debugLogLevel,
        chat,
        setChat,
        getIsBonusAction,
        allPlayerAttributes,
        setAllPlayerAttributes,
        musicVolume,
        isMuted,
        connectedPlayers,
        serverStoryState,
        combatState,
        bots = []
    } = useGameContext();
    const [currentPlayerCharacter, setCurrentPlayerCharacter] = useState(null);
    const [characterPositions, setCharacterPositions] = useState({});
    const [weaponSelected, setWeaponSelected] = useState(false);
    const [selectedAbility, setSelectedAbility] = useState(null);
    const [selectedTargets, setSelectedTargets] = useState([]);
    const [pendingRelocateTarget, setPendingRelocateTarget] = useState(null);
    const [combatNotice, setCombatNotice] = useState(null);
    // The fight runs on the server; everything below comes from its latest combat_state.
    const inCombat = gamePhase === 'combat' && !!combatState && !combatState.endedResult;
    const activeEffects = inCombat ? (combatState.activeEffects || []) : [];
    const cooldowns = combatState?.cooldowns?.[playerName] || {};
    const myTurnState = inCombat && combatState.turn?.type === 'ally' && combatState.turn.id === playerName ? combatState.turn : null;
    const actionUsed = !!myTurnState?.actionUsed;
    const bonusActionUsed = !!myTurnState?.bonusActionUsed;
    const extraWeaponAttacksRemaining = myTurnState?.extraWeaponAttacks || 0;
    const movementLeft = myTurnState?.movementLeft ?? 0;
    const [turnTimeLeft, setTurnTimeLeft] = useState(null);
    const [isTurnActionLocked, setIsTurnActionLocked] = useState(false);
    const [turnStartLockRemainingMs, setTurnStartLockRemainingMs] = useState(0);
    const [aiBusy, setAiBusy] = useState(false);
    const [aiNarrationComplete, setAiNarrationComplete] = useState(false);
    const [pendingFactionChoice, setPendingFactionChoice] = useState(false);
    const [selectedFaction, setSelectedFaction] = useState(null);
    const [pendingPostEncounterChoice, setPendingPostEncounterChoice] = useState(false);
    const [pendingNextEncounterChoice, setPendingNextEncounterChoice] = useState(false);
    const [aiText, setAiText] = useState('');
    // A personal moment in the narration: one party member answers (or asks) an NPC. Its choices
    // show where the story choices go; the group's options follow once it's answered.
    const [dialogue, setDialogue] = useState(null);
    const [dialogueBusy, setDialogueBusy] = useState(false);
    const [aiSentences, setAiSentences] = useState([]);
    // The text the sentences above were split from (to tell a fresh message from the last one).
    const [sentencesSource, setSentencesSource] = useState('');
    const [currentSentenceIndex, setCurrentSentenceIndex] = useState(0);
    // Typewriter: how many characters of the current sentence are showing.
    const [typingIndex, setTypingIndex] = useState(0);
    const [currentSceneKey, setCurrentSceneKey] = useState('city');
    const [aiOptions, setAiOptions] = useState(null);
    const [aiAttribute, setAiAttribute] = useState(null);
    const hasRequestedIntroRef = useRef(false);
    const pendingStartCombatRef = useRef(false);
    const selectedFactionRef = useRef(selectedFaction);
    const combatFlowIndexRef = useRef(0);
    const pendingAiRequestResolversRef = useRef(new Map());
    const completedAiRequestIdsRef = useRef(new Set());
    const aiTypingCompletionByRequestIdRef = useRef(new Map());
    const pendingPostCombatActionRef = useRef(null);
    const pendingEncounterEndAfterLevelUpRef = useRef(null);
    const pendingPostCombatNarrationRequestIdRef = useRef(null);
    const pendingStartCombatNarrationRequestIdRef = useRef(null);
    const introNarrationRequestIdRef = useRef(null);
    const introNarrationGateSettledRef = useRef(false);
    const pendingPostCombatFallbackTimeoutRef = useRef(null);
    const postCombatOverlayTimeoutRef = useRef(null);
    const combatLifecycleActiveRef = useRef(false);
    const storyProgressStorageKey = room ? `storyProgress_${room}` : null;
    const pendingEncounterNarrationStorageKey = room ? `pendingEncounterEndAfterLevelUp_${room}` : null;
    const attributesStorageKey = room ? `allPlayerAttributes_${room}` : null;
    const isQuietLogs = debugLogLevel === 'quiet';
    const isVerboseLogs = debugLogLevel === 'verbose';
    const [isStoryStateHydrated, setIsStoryStateHydrated] = useState(false);
    const [isIntroNarrationGateActive, setIsIntroNarrationGateActive] = useState(false);
    const isIntroNarrationGateActiveRef = useRef(false);
    const gamePhaseRef = useRef(gamePhase);

    const logImportant = (...args) => {
        if (isQuietLogs) return;
        console.log(...args);
    };

    const logVerbose = (...args) => {
        if (!isVerboseLogs) return;
        console.log(...args);
    };

    const setIntroNarrationGate = (isActive) => {
        isIntroNarrationGateActiveRef.current = Boolean(isActive);
        setIsIntroNarrationGateActive(Boolean(isActive));
    };

    const battleMusicRef = useRef(null);

    useEffect(() => {
        if (!battleMusicRef.current) {
            battleMusicRef.current = new Audio('/audio/BattleMusic.mp3');
            battleMusicRef.current.loop = true;
        }
        
        battleMusicRef.current.volume = musicVolume * (2 / 3);
        battleMusicRef.current.muted = isMuted;

        const playPromise = battleMusicRef.current.play();
        if (playPromise !== undefined) {
            playPromise.catch(error => {
                console.log("Audio autoplay prevented or failed:", error);
            });
        }

        return () => {
            if (battleMusicRef.current) {
                battleMusicRef.current.pause();
                battleMusicRef.current.currentTime = 0;
            }
        };
    }, []);

    useEffect(() => {
        if (battleMusicRef.current) {
            battleMusicRef.current.volume = musicVolume * (2 / 3);
            battleMusicRef.current.muted = isMuted;
        }
    }, [musicVolume, isMuted]);

    useEffect(() => {
        if (!room || !playerName) return;

        const currentPlayerPositionsKey = `playerPositions_${room}`;
        const currentEnemyPositionsKey = `enemyPositions_${room}`;
        const currentCooldownKey = `cooldowns_${room}_${playerName}`;
        const currentStoryProgressKey = `storyProgress_${room}`;
        const currentPendingEncounterNarrationKey = `pendingEncounterEndAfterLevelUp_${room}`;

        const removedKeys = [];

        for (let index = sessionStorage.length - 1; index >= 0; index--) {
            const key = sessionStorage.key(index);
            if (!key) continue;

            const isStalePlayerPositions = key.startsWith('playerPositions_') && key !== currentPlayerPositionsKey;
            const isStaleEnemyPositions = key.startsWith('enemyPositions_') && key !== currentEnemyPositionsKey;
            const isStaleCooldownForPlayer =
                key.startsWith('cooldowns_') &&
                key.endsWith(`_${playerName}`) &&
                key !== currentCooldownKey;
            const isStaleStoryProgress =
                key.startsWith('storyProgress_') &&
                key !== currentStoryProgressKey;
            const isStalePendingEncounterNarration =
                key.startsWith('pendingEncounterEndAfterLevelUp_') &&
                key !== currentPendingEncounterNarrationKey;

            if (
                isStalePlayerPositions ||
                isStaleEnemyPositions ||
                isStaleCooldownForPlayer ||
                isStaleStoryProgress ||
                isStalePendingEncounterNarration
            ) {
                removedKeys.push(key);
                sessionStorage.removeItem(key);
            }
        }

        if (removedKeys.length > 0) {
            logVerbose('[SESSION CLEANUP] Removed stale room keys:', removedKeys);
        }
    }, [room, playerName]);

    const [combatFlowIndex, setCombatFlowIndex] = useState(0);
    const [allowFallbackFactionChoices, setAllowFallbackFactionChoices] = useState(false);
    const [allowFallbackPostEncounterChoices, setAllowFallbackPostEncounterChoices] = useState(false);
    const [allowFallbackNextEncounterChoice, setAllowFallbackNextEncounterChoice] = useState(false);

    // Bots never hold story decisions or control the story.
    const humanPlayers = players.filter(player => !bots.includes(player));
    const livingStoryController = humanPlayers.find(player => (playerCharacters[player]?.stats?.health || 0) > 0) || humanPlayers[0] || null;
    const previousStoryControllerRef = useRef(livingStoryController);
    const isStoryController = livingStoryController === playerName;
    const storyControllerLabel = livingStoryController || 'Admin';
    const currentAiSentence = aiSentences[currentSentenceIndex] || '';
    const displayText = currentAiSentence.slice(0, typingIndex);
    // The sentences must belong to the current text: right after new narration arrives they still
    // hold the previous (fully typed) message for a moment, which would show the choices too early.
    const isAiNarrationComplete = aiNarrationComplete || (!aiBusy && (
        !aiText?.trim() ||
        (sentencesSource === aiText.trim() && aiSentences.length > 0 && currentSentenceIndex >= aiSentences.length - 1 && typingIndex >= currentAiSentence.length)
    ));

    const getDecisionOwner = (requiredAttribute) => {
        const normalizedAttribute = normalizeDecisionAttribute(requiredAttribute);
        if (!normalizedAttribute) return null;

        // allPlayerAttributes is an object where each player maps to an array of attributes
        // We need to find players who have this attribute, prioritizing those with it earliest in their list
        const playersWithAttribute = humanPlayers
            .map(player => {
                const playerAttributes = allPlayerAttributes?.[player];
                if (!Array.isArray(playerAttributes)) return null;
                
                // Find the index of this attribute in their list
                const attributeIndex = playerAttributes.findIndex(attr => 
                    normalizeDecisionAttribute(attr) === normalizedAttribute
                );
                
                // If they don't have it, exclude them
                if (attributeIndex === -1) return null;
                
                return { player, attributeIndex };
            })
            .filter(Boolean) // Remove null entries
            .sort((a, b) => a.attributeIndex - b.attributeIndex); // Sort by attribute index (lower = higher priority)

        // Highest priority wins; if that player is offline the decision passes to the next one
        // so the group is never stuck waiting on someone who left.
        if (playersWithAttribute.length > 0) {
            const connectedOwner = playersWithAttribute.find(({ player }) =>
                !Array.isArray(connectedPlayers) || connectedPlayers.length === 0 || connectedPlayers.includes(player)
            );
            return (connectedOwner || playersWithAttribute[0]).player;
        }

        return null;
    };

    // One action (weapon or ability) and one bonus action per turn; the server has the final say.
    const canUseAbilityThisTurn = (ability) => {
        const resolvedAbility = typeof ability === 'string' ? getAbility(ability) : ability;
        if (!resolvedAbility || !myTurnState) return false;
        return resolvedAbility.consumesAction === false ? !bonusActionUsed : !actionUsed;
    };

    const getPlayerWeaponScalingStat = (character) =>
        (character?.role === 'Support' || character?.id === 'spellcaster_dps_1') ? 'ta' : 'strength';

    const arePositionsEqual = (firstPosition, secondPosition) => {
        if (!firstPosition || !secondPosition) return false;
        return firstPosition.row === secondPosition.row && firstPosition.col === secondPosition.col;
    };

    const canPlayerDecide = (requiredAttribute) => {
        const owner = getDecisionOwner(requiredAttribute);
        if (!owner) return isStoryController;
        return owner === playerName;
    };

    const buildFallbackStoryOptions = (eventType = 'story_choice') => {
        if (eventType === 'encounter_end') {
            return ['Investigate the nearest lead', 'Take a cautious route forward'];
        }
        if (eventType === 'choice_made') {
            return ['Press the advantage', 'Regroup and gather intel'];
        }
        return ['Push the story forward', 'Take the safer approach'];
    };

    const formatDecisionAttributeLabel = (rawAttribute) => {
        const normalizedAttribute = normalizeDecisionAttribute(rawAttribute || 'politician') || 'politician';
        return normalizedAttribute
            .split('_')
            .map(part => part.charAt(0).toUpperCase() + part.slice(1))
            .join(' ');
    };

    const getDecisionOwnerDisplay = (rawAttribute, fallbackAttribute = 'politician') => {
        const normalizedAttribute = normalizeDecisionAttribute(rawAttribute || fallbackAttribute) || fallbackAttribute;
        const owner = getDecisionOwner(normalizedAttribute) || livingStoryController;
        const attributeLabel = formatDecisionAttributeLabel(normalizedAttribute);
        if (owner && owner === playerName) {
            return `Your call (${attributeLabel}) - talk it over, then choose for the team`;
        }
        const characterName = owner ? playerCharacters?.[owner]?.name : null;
        const ownerLabel = characterName ? `${characterName} (${owner})` : (owner || storyControllerLabel);
        return `${ownerLabel} decides (${attributeLabel})`;
    };

    const effectiveAiDecisionAttribute = normalizeDecisionAttribute(aiAttribute || 'politician') || 'politician';

    const handleDialogueReply = (optionId) => {
        if (!dialogue || dialogueBusy) return;
        setDialogueBusy(true);
        socket.emit('dialogue_reply', { room, dialogueId: dialogue.id, optionId }, (result) => {
            if (!result?.ok) setDialogueBusy(false);
        });
    };
    // Shown where the story choices go once the narration has finished, never during a fight.
    const showDialogue = !!dialogue && isAiNarrationComplete && gamePhase !== 'combat';

    // While a personal moment waits for its answer, only its choices are shown.
    const awaitingDialogue = !!dialogue;
    const hasDynamicAiChoices = !!(aiOptions && aiOptions.length > 0 && isAiNarrationComplete && !awaitingDialogue);
    const hasFallbackFactionChoices = !!(pendingFactionChoice && !aiOptions && allowFallbackFactionChoices && isAiNarrationComplete && !awaitingDialogue);
    const hasFallbackPostEncounterChoices = !!(pendingPostEncounterChoice && !aiOptions && allowFallbackPostEncounterChoices && isAiNarrationComplete && !awaitingDialogue);
    const hasFallbackNextEncounterChoices = !!(pendingNextEncounterChoice && !aiOptions && allowFallbackNextEncounterChoice && isAiNarrationComplete && !awaitingDialogue);
    const hasAnyVisibleAiChoices =
        hasDynamicAiChoices ||
        hasFallbackFactionChoices ||
        hasFallbackPostEncounterChoices ||
        hasFallbackNextEncounterChoices;
    const shouldShowMobileAiOverlay = !isMyTurn && (
        isIntroNarrationGateActive ||
        aiBusy ||
        Boolean(displayText?.trim()) ||
        hasAnyVisibleAiChoices ||
        (!!dialogue && gamePhase !== 'combat')
    );
    const [showYouDiedScreen, setShowYouDiedScreen] = useState(false);
    const [showEnemiesDefeatedScreen, setShowEnemiesDefeatedScreen] = useState(false);
    const [showTheEndScreen, setShowTheEndScreen] = useState(false);
    const [gameOver, setGameOver] = useState(false);

    const playerCharactersRef = useRef(playerCharacters);
    const characterPositionsRef = useRef(characterPositions);
    const moveAnimationTimersRef = useRef([]);
    const combatNoticeTimeoutRef = useRef(null);
    const turnDeadlineRef = useRef(null);
    const turnStartLockTimeoutRef = useRef(null);
    const turnStartLockIntervalRef = useRef(null);

    const isEnemyDeadBody = (enemy) => {
        return !!enemy && (enemy.isDeadBody || (enemy.stats?.health || 0) <= 0);
    };

    const showCombatNotice = (text) => {
        if (!text) return;
        setCombatNotice(text);
        if (combatNoticeTimeoutRef.current) clearTimeout(combatNoticeTimeoutRef.current);
        combatNoticeTimeoutRef.current = setTimeout(() => setCombatNotice(null), 2800);
    };

    // Update refs whenever state changes
    useEffect(() => {
        playerCharactersRef.current = playerCharacters;
    }, [playerCharacters]);

    useEffect(() => {
        characterPositionsRef.current = characterPositions;
    }, [characterPositions]);

    useEffect(() => {
        if (!selectedAbility) {
            setPendingRelocateTarget(null);
        }
    }, [selectedAbility]);

    useEffect(() => {
        gamePhaseRef.current = gamePhase;
    }, [gamePhase]);

    useEffect(() => {
        selectedFactionRef.current = selectedFaction;
    }, [selectedFaction]);

    useEffect(() => {
        if (!storyProgressStorageKey) {
            setIsStoryStateHydrated(false);
            return;
        }

        const defaultStoryState = {
            combatFlowIndex: 0,
            selectedFaction: null,
            currentSceneKey: DEFAULT_SCENE_KEY,
            pendingFactionChoice: false,
            pendingPostEncounterChoice: false,
            pendingNextEncounterChoice: false,
            hasRequestedIntro: false,
            aiText: '',
            aiOptions: null,
            aiAttribute: null,
            allowFallbackFactionChoices: false,
            allowFallbackPostEncounterChoices: false,
            allowFallbackNextEncounterChoice: false,
            aiNarrationComplete: false
        };

        let nextStoryState = defaultStoryState;
        const storedStoryState = sessionStorage.getItem(storyProgressStorageKey);

        if (storedStoryState) {
            try {
                const parsedStoryState = JSON.parse(storedStoryState);
                const normalizedCombatFlowIndex = Number.isFinite(Number(parsedStoryState?.combatFlowIndex))
                    ? Math.max(0, Math.min(TOTAL_ENCOUNTERS, Number(parsedStoryState.combatFlowIndex)))
                    : 0;
                const normalizedSelectedFaction =
                    parsedStoryState?.selectedFaction === 'enforcers' || parsedStoryState?.selectedFaction === 'rebels'
                        ? parsedStoryState.selectedFaction
                        : null;
                const normalizedSceneKey = parsedStoryState?.currentSceneKey || DEFAULT_SCENE_KEY;

                nextStoryState = {
                    combatFlowIndex: normalizedCombatFlowIndex,
                    selectedFaction: normalizedSelectedFaction,
                    currentSceneKey: normalizedSceneKey,
                    pendingFactionChoice: Boolean(parsedStoryState?.pendingFactionChoice) && !normalizedSelectedFaction,
                    pendingPostEncounterChoice: Boolean(parsedStoryState?.pendingPostEncounterChoice),
                    pendingNextEncounterChoice: Boolean(parsedStoryState?.pendingNextEncounterChoice),
                    aiText: typeof parsedStoryState?.aiText === 'string' ? parsedStoryState.aiText : '',
                    aiOptions: Array.isArray(parsedStoryState?.aiOptions) ? parsedStoryState.aiOptions.filter(option => typeof option === 'string') : null,
                    aiAttribute: normalizeDecisionAttribute(parsedStoryState?.aiAttribute || ''),
                    allowFallbackFactionChoices: Boolean(parsedStoryState?.allowFallbackFactionChoices),
                    allowFallbackPostEncounterChoices: Boolean(parsedStoryState?.allowFallbackPostEncounterChoices),
                    allowFallbackNextEncounterChoice: Boolean(parsedStoryState?.allowFallbackNextEncounterChoice),
                    hasRequestedIntro:
                        Boolean(parsedStoryState?.hasRequestedIntro) ||
                        !!normalizedSelectedFaction ||
                        normalizedCombatFlowIndex > 0,
                    aiNarrationComplete: Boolean(parsedStoryState?.aiNarrationComplete)
                };
            } catch (error) {
                console.error('[STORY FLOW] Failed to parse stored story progress:', error);
            }
        }

        combatFlowIndexRef.current = nextStoryState.combatFlowIndex;
        setCombatFlowIndex(nextStoryState.combatFlowIndex);
        selectedFactionRef.current = nextStoryState.selectedFaction;
        setSelectedFaction(nextStoryState.selectedFaction);
        setCurrentSceneKey(nextStoryState.currentSceneKey);
        setPendingFactionChoice(nextStoryState.pendingFactionChoice);
        setPendingPostEncounterChoice(nextStoryState.pendingPostEncounterChoice);
        setPendingNextEncounterChoice(nextStoryState.pendingNextEncounterChoice);
        setAiText(nextStoryState.aiText);
        setAiOptions(nextStoryState.aiOptions);
        setAiAttribute(nextStoryState.aiAttribute);
        setAiNarrationComplete(nextStoryState.aiNarrationComplete);
        setAllowFallbackFactionChoices(nextStoryState.allowFallbackFactionChoices);
        setAllowFallbackPostEncounterChoices(nextStoryState.allowFallbackPostEncounterChoices);
        setAllowFallbackNextEncounterChoice(nextStoryState.allowFallbackNextEncounterChoice);
        hasRequestedIntroRef.current = nextStoryState.hasRequestedIntro;
        setIsStoryStateHydrated(true);
    }, [storyProgressStorageKey]);

    useEffect(() => {
        if (!storyProgressStorageKey || !isStoryStateHydrated) return;

        sessionStorage.setItem(storyProgressStorageKey, JSON.stringify({
            combatFlowIndex,
            selectedFaction,
            currentSceneKey,
            pendingFactionChoice,
            pendingPostEncounterChoice,
            pendingNextEncounterChoice,
            aiText,
            aiOptions,
            aiAttribute,
            allowFallbackFactionChoices,
            allowFallbackPostEncounterChoices,
            allowFallbackNextEncounterChoice,
            hasRequestedIntro: hasRequestedIntroRef.current,
            aiNarrationComplete
        }));
    }, [
        storyProgressStorageKey,
        isStoryStateHydrated,
        combatFlowIndex,
        selectedFaction,
        currentSceneKey,
        pendingFactionChoice,
        pendingPostEncounterChoice,
        pendingNextEncounterChoice,
        aiText,
        aiOptions,
        aiAttribute,
        allowFallbackFactionChoices,
        allowFallbackPostEncounterChoices,
        allowFallbackNextEncounterChoice,
        aiNarrationComplete
    ]);

    // Load attributes from localStorage on mount
    useEffect(() => {
        if (!attributesStorageKey) return;
        
        const storedAttributes = sessionStorage.getItem(attributesStorageKey);
        if (storedAttributes) {
            try {
                const parsedAttributes = JSON.parse(storedAttributes);
                setAllPlayerAttributes(parsedAttributes);
                logVerbose('[ATTRIBUTES] Loaded from storage:', parsedAttributes);
            } catch (error) {
                console.error('[ATTRIBUTES] Failed to parse stored attributes:', error);
            }
        }
    }, [attributesStorageKey]);

    // Save attributes to localStorage whenever they change
    useEffect(() => {
        if (!attributesStorageKey || Object.keys(allPlayerAttributes).length === 0) return;
        
        sessionStorage.setItem(attributesStorageKey, JSON.stringify(allPlayerAttributes));
        logVerbose('[ATTRIBUTES] Saved to storage:', allPlayerAttributes);
    }, [attributesStorageKey, allPlayerAttributes]);

    useEffect(() => {
        combatFlowIndexRef.current = combatFlowIndex;
    }, [combatFlowIndex]);

    // The server remembers the story too. When it is ahead of this browser (rejoining from another
    // device, cleared storage, a second tab), adopt its progress and re-show any pending decision.
    useEffect(() => {
        if (!isStoryStateHydrated || !serverStoryState) return;

        const serverIndex = Number(serverStoryState.combatFlowIndex) || 0;
        if (serverIndex > combatFlowIndexRef.current) {
            combatFlowIndexRef.current = serverIndex;
            setCombatFlowIndex(serverIndex);
            hasRequestedIntroRef.current = true;
        }

        const serverFaction = serverStoryState.selectedFaction;
        if (!selectedFactionRef.current && (serverFaction === 'enforcers' || serverFaction === 'rebels')) {
            selectedFactionRef.current = serverFaction;
            setSelectedFaction(serverFaction);
            setPendingFactionChoice(false);
            hasRequestedIntroRef.current = true;
        }

        const last = serverStoryState.lastStoryMessage;
        const hasPendingServerChoice = last && Array.isArray(last.options) && last.options.length > 0 && !last.startCombat;
        if (hasPendingServerChoice && gamePhaseRef.current !== 'combat') {
            hasRequestedIntroRef.current = true;
            setAiText(sanitizeAiNarrationText(last.response || ''));
            setAiOptions(last.options);
            setDialogue(null);
            setAiAttribute(normalizeDecisionAttribute(last.attribute || '') || null);
            setAiNarrationComplete(true);
            setIntroNarrationGate(false);
            if (last.eventType === 'game_start' && !selectedFactionRef.current) {
                setPendingFactionChoice(true);
            } else {
                setPendingPostEncounterChoice(true);
            }
        }

        if (last?.dialogue && !hasPendingServerChoice && gamePhaseRef.current !== 'combat') {
            hasRequestedIntroRef.current = true;
            setAiText(sanitizeAiNarrationText(last.response || ''));
            setAiOptions(null);
            setDialogue(last.dialogue);
            setAiNarrationComplete(true);
            setIntroNarrationGate(false);
        }

        if (serverStoryState.gameOver) {
            setGameOver(true);
        }
    }, [isStoryStateHydrated, serverStoryState]);

    // Handle story controller death - reset AI flow to prevent freeze
    useEffect(() => {
        const previousController = previousStoryControllerRef.current;
        const currentController = livingStoryController;
        
        // If story controller changed (someone died or changed roles)
        if (previousController && previousController !== currentController) {
            logImportant(`[STORY CONTROLLER] Changed from ${previousController} to ${currentController}`);
            
            // If we're waiting for AI choices from dead controller, clear them
            if (aiBusy && !isStoryController) {
                logImportant(`[STORY CONTROLLER] Clearing AI state from dead controller`);
                setAiBusy(false);
                setAiText('');
                setAiOptions(null);
                setAiAttribute(null);
            }
        }
        
        previousStoryControllerRef.current = currentController;
    }, [livingStoryController, aiBusy, isStoryController]);

    useEffect(() => {
        combatLifecycleActiveRef.current = false;
        pendingEncounterEndAfterLevelUpRef.current = null;
    }, [room]);

    useEffect(() => {
        return () => {
            if (postCombatOverlayTimeoutRef.current) {
                clearTimeout(postCombatOverlayTimeoutRef.current);
                postCombatOverlayTimeoutRef.current = null;
            }
            if (pendingPostCombatFallbackTimeoutRef.current) {
                clearTimeout(pendingPostCombatFallbackTimeoutRef.current);
                pendingPostCombatFallbackTimeoutRef.current = null;
            }
            if (turnStartLockTimeoutRef.current) {
                clearTimeout(turnStartLockTimeoutRef.current);
                turnStartLockTimeoutRef.current = null;
            }
            if (turnStartLockIntervalRef.current) {
                clearInterval(turnStartLockIntervalRef.current);
                turnStartLockIntervalRef.current = null;
            }
            if (combatNoticeTimeoutRef.current) clearTimeout(combatNoticeTimeoutRef.current);
            moveAnimationTimersRef.current.forEach(clearTimeout);
        };
    }, []);

    const setSceneFromKeyword = (keyword) => {
        const resolvedScene = resolveSceneKey(keyword);
        if (resolvedScene) {
            setCurrentSceneKey(resolvedScene);
        }
    };

    const emitAiEvent = (eventType, message, data = {}, options = {}) => {
        if (!room) return null;

        const requestId = options.requestId || `${eventType}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
        setAiBusy(true);
        setAiNarrationComplete(false);
        setAiOptions(null);
        setAiAttribute(null);

        if (eventType === 'game_start') {
            setAllowFallbackFactionChoices(false);
        }
        if (eventType === 'encounter_end') {
            setAllowFallbackPostEncounterChoices(false);
        }
        if (eventType === 'shop_intro' || eventType === 'next_encounter') {
            setAllowFallbackNextEncounterChoice(false);
        }
        socket.emit('ai_request', {
            requestId,
            room,
            eventType,
            message,
            data,
            scenarioType: options.scenarioType,
            characterName: currentPlayerCharacter?.name,
            playerName
        });

        return requestId;
    };

    const markAiRequestCompleted = (requestId) => {
        if (!requestId) return;

        const resolver = pendingAiRequestResolversRef.current.get(requestId);
        if (resolver) {
            pendingAiRequestResolversRef.current.delete(requestId);
            resolver(true);
            return;
        }

        completedAiRequestIdsRef.current.add(requestId);
    };

    const waitForAiRequestCompletion = (requestId, timeoutMs = 20000) => {
        if (!requestId) return Promise.resolve(false);

        if (completedAiRequestIdsRef.current.has(requestId)) {
            completedAiRequestIdsRef.current.delete(requestId);
            return Promise.resolve(true);
        }

        return new Promise((resolve) => {
            const timeoutId = setTimeout(() => {
                pendingAiRequestResolversRef.current.delete(requestId);
                resolve(false);
            }, timeoutMs);

            pendingAiRequestResolversRef.current.set(requestId, (didComplete = true) => {
                clearTimeout(timeoutId);
                completedAiRequestIdsRef.current.delete(requestId);
                resolve(Boolean(didComplete));
            });
        });
    };

    const markAiTypingExpectedCompletion = (requestId, responseText) => {
        if (!requestId) return;

        const estimatedTypingMs = estimateTypewriterDurationMs(responseText || '');
        aiTypingCompletionByRequestIdRef.current.set(requestId, Date.now() + estimatedTypingMs);
    };

    const waitForNarrationTypingCompletion = async (requestIds = [], extraDelayMs = TURN_ADVANCE_AFTER_TYPING_MS) => {
        const uniqueRequestIds = [...new Set((requestIds || []).filter(Boolean))];

        if (uniqueRequestIds.length === 0) {
            if (extraDelayMs > 0) {
                await new Promise(resolve => setTimeout(resolve, extraDelayMs));
            }
            return;
        }

        await Promise.all(uniqueRequestIds.map(requestId => waitForAiRequestCompletion(requestId)));

        let latestTypingDoneAt = Date.now();
        uniqueRequestIds.forEach((requestId) => {
            const expectedDoneAt = aiTypingCompletionByRequestIdRef.current.get(requestId);
            if (Number.isFinite(expectedDoneAt)) {
                latestTypingDoneAt = Math.max(latestTypingDoneAt, expectedDoneAt);
            }
        });

        const waitMs = Math.max(0, latestTypingDoneAt - Date.now()) + Math.max(0, extraDelayMs || 0);
        if (waitMs > 0) {
            await new Promise(resolve => setTimeout(resolve, waitMs));
        }

        uniqueRequestIds.forEach((requestId) => {
            aiTypingCompletionByRequestIdRef.current.delete(requestId);
        });
    };

    const startCombatAfterNarration = async (requestIds = []) => {
        const uniqueRequestIds = [...new Set((requestIds || []).filter(Boolean))];
        await waitForNarrationTypingCompletion(uniqueRequestIds, TURN_ADVANCE_AFTER_TYPING_MS);

        if (!isStoryController) return;

        pendingStartCombatNarrationRequestIdRef.current = null;
        pendingStartCombatRef.current = false;
        handleStoryComplete();
    };

    const resolveFactionAlignment = (rawChoice = '') => {
        const normalized = String(rawChoice || '').toLowerCase();

        if (
            normalized.includes('enforcer') ||
            normalized.includes('corporate') ||
            normalized.includes('corp') ||
            normalized.includes('force') ||
            normalized.includes('division') ||
            normalized.includes('security') ||
            normalized.includes('authority') ||
            normalized.includes('law')
        ) {
            return 'enforcers';
        }

        if (
            normalized.includes('rebel') ||
            normalized.includes('fighter') ||
            normalized.includes('fighters') ||
            normalized.includes('people') ||
            normalized.includes('protester') ||
            normalized.includes('protestor') ||
            normalized.includes('protest') ||
            normalized.includes('uprising') ||
            normalized.includes('resistance') ||
            normalized.includes('citizens')
        ) {
            return 'rebels';
        }

        return null;
    };


    const handleFactionChoice = (choice, explicitFaction = null) => {
        if (!canPlayerDecide('politician')) return;

        const normalizedChoice = explicitFaction || resolveFactionAlignment(choice);
        if (!normalizedChoice) {
            logImportant('[FACTION] Unable to resolve faction from choice:', choice);
            setPendingFactionChoice(true);
            return;
        }

        setSelectedFaction(normalizedChoice);
        selectedFactionRef.current = normalizedChoice;
        socket.emit('faction_selected', { room, faction: normalizedChoice });

        setPendingFactionChoice(false);
        setAllowFallbackFactionChoices(false);
        setAiOptions(null);
        pendingStartCombatRef.current = true;
        const selectedSide = normalizedChoice;
        const opposingSide = selectedSide === 'enforcers' ? 'rebels' : 'enforcers';
        const selectedLabel = selectedSide === 'enforcers' ? 'Enforcers' : 'Rebels';
        const opposingLabel = opposingSide === 'enforcers' ? 'Enforcers' : 'Rebels';
        emitAiEvent(
            'choice_made',
            `The party sides with the ${selectedLabel} against the ${opposingLabel}.`,
            {
                choice,
                faction: selectedSide,
                selected_faction: selectedSide,
                opposing_faction: opposingSide
            }
        );
    };

    useEffect(() => {
        const handleFactionSelected = (faction) => {
            if (faction === 'enforcers' || faction === 'rebels') {
                setSelectedFaction(faction);
                selectedFactionRef.current = faction;
                setPendingFactionChoice(false);
                setAllowFallbackFactionChoices(false);
                setAiOptions(null);
                pendingStartCombatRef.current = true;

                if (pendingStartCombatRef.current && isStoryController && pendingStartCombatNarrationRequestIdRef.current) {
                    void startCombatAfterNarration([pendingStartCombatNarrationRequestIdRef.current]);
                }
            }
        };

        socket.on('faction_selected', handleFactionSelected);
        return () => {
            socket.off('faction_selected', handleFactionSelected);
        };
    }, [socket, isStoryController]);

    const handleStoryPointChoice = (choice) => {
        const requiredAttribute = aiAttribute || null;
        if (requiredAttribute && !canPlayerDecide(requiredAttribute)) return;
        if (aiBusy) return;

        setAiOptions(null);
        emitAiEvent(
            'choice_made',
            `The party chose: ${choice}`,
            { choice, source: 'story_point' }
        );
    };

    const handleAiOptionClick = (option) => {
        // Determine which attribute governs this choice
        const requiredAttribute = aiAttribute || null;
        const decisionOwner = getDecisionOwner(requiredAttribute);
        const canDecide = canPlayerDecide(requiredAttribute);
        
        console.log('[DECISION] AI option clicked:', {
            option,
            requiredAttribute,
            decisionOwner,
            currentPlayer: playerName,
            canDecide,
            aiBusy
        });
        
        if (requiredAttribute && !canDecide) {
            console.log('[DECISION] BLOCKED - only', decisionOwner, 'can make this decision');
            return;
        }
        if (aiBusy) return;

        // Detect common option patterns and route them to existing handlers
        const lowerOption = option.toLowerCase();

        const parsedFaction = resolveFactionAlignment(lowerOption);
        if (parsedFaction && (pendingFactionChoice || (!selectedFactionRef.current && aiAttribute === 'politician'))) {
            handleFactionChoice(option, parsedFaction);
            return;
        }

        if (pendingFactionChoice) {
            logImportant('[FACTION] Option selected while awaiting faction, but faction could not be resolved:', option);
            return;
        }

        if (!selectedFactionRef.current && pendingFactionChoice && lowerOption.includes('enforcer')) {
            handleFactionChoice(option);
            return;
        }
        if (!selectedFactionRef.current && pendingFactionChoice && (lowerOption.includes('people') || lowerOption.includes('rebel'))) {
            handleFactionChoice(option);
            return;
        }
        if (pendingPostEncounterChoice || pendingNextEncounterChoice) {
            handleStoryPointChoice(option);
            return;
        }

        // Generic: send as a choice_made event
        setAiOptions(null);
        emitAiEvent('choice_made', `The party chose: ${option}`, { choice: option });
    };

    useEffect(() => {
        if (playerCharacters[playerName]) {
            const nextCharacter = playerCharacters[playerName];
            logVerbose('[ABILITY DEBUG] Hydrating current player character:', {
                playerName,
                hasCharacter: !!nextCharacter,
                abilitiesType: Array.isArray(nextCharacter?.abilities) ? 'array' : typeof nextCharacter?.abilities,
                abilitiesLength: Array.isArray(nextCharacter?.abilities) ? nextCharacter.abilities.length : null,
                abilitiesPreview: Array.isArray(nextCharacter?.abilities)
                    ? nextCharacter.abilities.map(ability => (typeof ability === 'string' ? ability : ability?.id || ability?.name || 'invalid'))
                    : nextCharacter?.abilities,
                ultimateType: typeof nextCharacter?.ultimate,
                ultimatePreview: typeof nextCharacter?.ultimate === 'string'
                    ? nextCharacter.ultimate
                    : nextCharacter?.ultimate?.id || nextCharacter?.ultimate?.name || null
            });
            setCurrentPlayerCharacter(nextCharacter);
        }
    }, [playerCharacters, playerName]);

    useEffect(() => {
        const message = (aiText || '').trim();
        if (!message) {
            setAiSentences([]);
            setCurrentSentenceIndex(0);
            setTypingIndex(0);
            return;
        }

        const segments = splitAiTextSegments(message);

        setSentencesSource(message);
        setAiSentences(segments.length > 0 ? segments : [message]);
        setCurrentSentenceIndex(0);
        setTypingIndex(0);
    }, [aiText]);

    useEffect(() => {
        const currentSentence = aiSentences[currentSentenceIndex] || '';
        if (!currentSentence || typingIndex >= currentSentence.length) {
            return;
        }

        // One character per tick. The text shown is derived from the count, so a slow render can
        // never repeat or skip letters.
        const timer = setTimeout(() => setTypingIndex((prevIndex) => prevIndex + 1), TYPEWRITER_CHAR_INTERVAL_MS);
        return () => clearTimeout(timer);
    }, [aiSentences, currentSentenceIndex, typingIndex]);

    useEffect(() => {
        const currentSentence = aiSentences[currentSentenceIndex] || '';
        if (!currentSentence || typingIndex < currentSentence.length) {
            return;
        }

        if (currentSentenceIndex >= aiSentences.length - 1) {
            setAiNarrationComplete(true);
            return;
        }

        const timer = setTimeout(() => {
            setCurrentSentenceIndex((prevIndex) => prevIndex + 1);
            setTypingIndex(0);
        }, currentSentence.length * TYPEWRITER_SENTENCE_GAP_FACTOR_MS);

        return () => clearTimeout(timer);
    }, [aiSentences, currentSentenceIndex, typingIndex]);

    useEffect(() => {
        if (!isStoryStateHydrated) return;
        if (!isStoryController || !room || hasRequestedIntroRef.current) return;
        if (selectedFactionRef.current) return;
        if (players.length === 0) return;

        hasRequestedIntroRef.current = true;
        introNarrationGateSettledRef.current = false;
        const partySummary = players.map(player => {
            const character = playerCharacters[player];
            return character ? `${player} (${character.name})` : player;
        });

        const requestId = emitAiEvent(
            'game_start',
            `Launch the story for party: ${partySummary.join(', ')}.`,
            { party: partySummary },
            { scenarioType: 'street_encounter' }
        );

        introNarrationRequestIdRef.current = requestId;
        setIntroNarrationGate(Boolean(requestId));
    }, [isStoryController, room, players, playerCharacters, isStoryStateHydrated]);

    useEffect(() => {
        const clearPendingPostCombatFallback = () => {
            if (pendingPostCombatFallbackTimeoutRef.current) {
                clearTimeout(pendingPostCombatFallbackTimeoutRef.current);
                pendingPostCombatFallbackTimeoutRef.current = null;
            }
        };

        const persistPendingEncounterNarration = (payload) => {
            pendingEncounterEndAfterLevelUpRef.current = payload;

            if (!pendingEncounterNarrationStorageKey || !payload) return;

            try {
                sessionStorage.setItem(pendingEncounterNarrationStorageKey, JSON.stringify(payload));
            } catch (error) {
                console.error('[POST-COMBAT] Failed to persist pending level-up narration:', error);
            }
        };

        const consumePendingEncounterNarration = () => {
            let pendingNarration = pendingEncounterEndAfterLevelUpRef.current;

            if (!pendingNarration && pendingEncounterNarrationStorageKey) {
                const storedNarration = sessionStorage.getItem(pendingEncounterNarrationStorageKey);
                if (storedNarration) {
                    try {
                        pendingNarration = JSON.parse(storedNarration);
                    } catch (error) {
                        console.error('[POST-COMBAT] Failed to parse pending level-up narration:', error);
                    }
                }
            }

            pendingEncounterEndAfterLevelUpRef.current = null;
            if (pendingEncounterNarrationStorageKey) {
                sessionStorage.removeItem(pendingEncounterNarrationStorageKey);
            }

            if (!pendingNarration?.postCombatAction || !pendingNarration?.narrationMessage) {
                return null;
            }

            return pendingNarration;
        };

        const proceedPostCombatAction = (postCombatAction) => {
            clearPendingPostCombatFallback();
            logImportant('[POST-COMBAT] Proceeding with postCombatAction:', postCombatAction);
            
            if (postCombatAction === 'levelUp') {
                setPendingPostEncounterChoice(true);
                setPendingNextEncounterChoice(false);
                setAllowFallbackPostEncounterChoices(true);
                logImportant('[POST-COMBAT] Level up complete; post-combat story choices unlocked');
                return;
            }

            if (postCombatAction === 'shop') {
                setSceneFromKeyword('shop');
                setPendingPostEncounterChoice(true);  // Changed from pendingNextEncounterChoice to pendingPostEncounterChoice
                setAllowFallbackPostEncounterChoices(false);
                logImportant('[POST-COMBAT] Shop scene set; pending choice set');
                return;
            }

            // For 'none', proceed directly to next encounter
            pendingStartCombatRef.current = false;
            setPendingPostEncounterChoice(true);
            setAllowFallbackPostEncounterChoices(false);
            logImportant('[POST-COMBAT] No post-combat action; pending choice set for next encounter');
        };

        const queueEncounterEndNarration = (postCombatAction, narrationMessage, extraData = {}) => {
            if (!isStoryController) return;

            pendingPostCombatActionRef.current = postCombatAction;
            const requestId = emitAiEvent('encounter_end', narrationMessage, {
                room,
                postCombatAction,
                ...extraData
            });
            pendingPostCombatNarrationRequestIdRef.current = requestId;

            clearPendingPostCombatFallback();
            pendingPostCombatFallbackTimeoutRef.current = setTimeout(() => {
                if (!isStoryController) return;
                if (pendingPostCombatNarrationRequestIdRef.current !== requestId) return;

                logImportant('[POST-COMBAT] AI narration timed out, continuing with fallback action:', postCombatAction);
                pendingPostCombatNarrationRequestIdRef.current = null;
                pendingPostCombatActionRef.current = null;
                proceedPostCombatAction(postCombatAction);
                setAllowFallbackPostEncounterChoices(true);
            }, POST_COMBAT_NARRATION_TIMEOUT_MS);
        };

        const handleLevelUpComplete = () => {
            if (!isStoryController) return;

            const pendingNarration = consumePendingEncounterNarration();
            if (!pendingNarration) return;

            queueEncounterEndNarration(
                pendingNarration.postCombatAction,
                pendingNarration.narrationMessage,
                { source: 'post_level_up' }
            );
        };

        const handleAiMessage = ({ requestId, eventType, response, location, attribute, startCombat, options, fallback, dialogue: incomingDialogue }) => {
            const normalizedIncomingOptions = Array.isArray(options)
                ? options.map(option => String(option || '').trim()).filter(Boolean)
                : [];
            const hasIncomingOptions = normalizedIncomingOptions.length > 0;
            const normalizedIncomingAttribute = normalizeDecisionAttribute(attribute || '');
            const effectiveIncomingAttribute = hasIncomingOptions
                ? (normalizedIncomingAttribute || inferDecisionAttributeFromOptions(eventType, normalizedIncomingOptions))
                : normalizedIncomingAttribute;

            const isStoryDecisionEvent = eventType === 'encounter_end' || eventType === 'choice_made' || eventType === 'story_choice' || eventType === 'dialogue_reply';
            let resolvedIncomingOptions = normalizedIncomingOptions;
            let resolvedIncomingAttribute = effectiveIncomingAttribute;

            // A personal moment comes first: the group's options arrive with the narration after it.
            if (isStoryDecisionEvent && !startCombat && resolvedIncomingOptions.length === 0 && !incomingDialogue) {
                resolvedIncomingOptions = buildFallbackStoryOptions(eventType);
                resolvedIncomingAttribute =
                    normalizeDecisionAttribute(
                        resolvedIncomingAttribute || inferDecisionAttributeFromOptions(eventType, resolvedIncomingOptions)
                    ) || 'politician';
            }

            const hasResolvedOptions = resolvedIncomingOptions.length > 0;

            const safeResponse = sanitizeAiNarrationText(response || '');

            const isIntroNarrationResponse =
                eventType === 'game_start' ||
                (requestId && requestId === introNarrationRequestIdRef.current);

            if (isIntroNarrationResponse && !introNarrationGateSettledRef.current) {
                introNarrationGateSettledRef.current = true;
                void (async () => {
                    await waitForNarrationTypingCompletion([requestId], 0);
                    setIntroNarrationGate(false);
                })();
            }

            markAiRequestCompleted(requestId);
            markAiTypingExpectedCompletion(requestId, safeResponse);
            setAiBusy(false);
            // New narration types out first; its choices appear once it has finished.
            setAiNarrationComplete(false);
            setAiText(safeResponse);
            // A new story beat replaces any earlier personal moment.
            setDialogue(incomingDialogue || null);
            setDialogueBusy(false);

            const isCombatPhaseActive = gamePhaseRef.current === 'combat';
            const isSceneTransitionEvent = SCENE_TRANSITION_EVENTS.has(eventType);

            // Ignore all location changes during combat and only accept scene shifts from scene-transition events.
            if (!isCombatPhaseActive && isSceneTransitionEvent) {
                if (location) {
                    setSceneFromKeyword(location);
                } else {
                    const trimmedResponse = safeResponse.trim();
                    const isSingleKeyword = /^[a-zA-Z0-9_-]+$/.test(trimmedResponse);
                    if (isSingleKeyword) {
                        setSceneFromKeyword(trimmedResponse);
                    }
                }
            } else if (isCombatPhaseActive && location) {
                logImportant('[LOCATION LOCK] Ignoring AI location during combat:', {
                    eventType,
                    location
                });
            }

            const canShowDecisionOptions = !isCombatPhaseActive;

            // Store attribute for decision-making
            setAiAttribute(canShowDecisionOptions ? (resolvedIncomingAttribute || null) : null);

            // Handle post-combat narration FIRST, before options display logic
            if (
                isStoryController &&
                requestId &&
                requestId === pendingPostCombatNarrationRequestIdRef.current
            ) {
                clearPendingPostCombatFallback();
                const postCombatAction = pendingPostCombatActionRef.current || 'none';
                pendingPostCombatNarrationRequestIdRef.current = null;
                pendingPostCombatActionRef.current = null;

                if (hasResolvedOptions) {
                    setPendingPostEncounterChoice(true);
                    setPendingNextEncounterChoice(false);
                    setAllowFallbackPostEncounterChoices(false);
                    setAiOptions(canShowDecisionOptions ? resolvedIncomingOptions : null);
                    return;
                }

                // A personal moment comes first: only its choices show now. The group's options
                // arrive with the narration after the answer (a 'dialogue_reply' message).
                if (incomingDialogue) {
                    setPendingPostEncounterChoice(true);
                    setPendingNextEncounterChoice(false);
                    setAllowFallbackPostEncounterChoices(false);
                    setAiOptions(null);
                    return;
                }

                proceedPostCombatAction(postCombatAction);
                setAllowFallbackPostEncounterChoices(Boolean(fallback));
                return;
            }

            // Handle start_combat flag from AI
            if (startCombat && isStoryController) {
                setPendingPostEncounterChoice(false);
                setPendingNextEncounterChoice(false);
                setAllowFallbackPostEncounterChoices(false);
                setAllowFallbackNextEncounterChoice(false);
                setAiOptions(null);
                setAiAttribute(null);

                if (!selectedFactionRef.current) {
                    pendingStartCombatRef.current = true;
                    pendingStartCombatNarrationRequestIdRef.current = requestId || null;
                    setPendingFactionChoice(true);
                    logImportant('[FACTION] start_combat received before faction selection; waiting for faction choice.');
                    return;
                }

                void startCombatAfterNarration([requestId]);
                return;
            }

            // Sync decision state for all clients so decision UI renders for everyone.
            if (eventType === 'encounter_end' || eventType === 'choice_made' || eventType === 'story_choice' || eventType === 'dialogue_reply') {
                setPendingPostEncounterChoice(true);
                setPendingNextEncounterChoice(false);
            }

            // Display options from AI only when a decision state is active
            const shouldAcceptAiOptions =
                canShowDecisionOptions && (
                    pendingFactionChoice ||
                    pendingPostEncounterChoice ||
                    pendingNextEncounterChoice ||
                    eventType === 'encounter_end' ||
                    eventType === 'choice_made' ||
                    eventType === 'story_choice' ||
                    eventType === 'dialogue_reply' ||
                    (!selectedFactionRef.current && (eventType === 'game_start' || resolvedIncomingAttribute === 'politician'))
                );

            if (hasResolvedOptions && shouldAcceptAiOptions) {
                setAiOptions(resolvedIncomingOptions);
            } else {
                setAiOptions(null);
            }

            // Fallback event-type logic for cases where AI doesn't set structured fields
            if (eventType === 'game_start' && !options && !selectedFactionRef.current) {
                setPendingFactionChoice(true);
                setAllowFallbackFactionChoices(Boolean(fallback));
            }

            if (eventType === 'choice_made' && !startCombat) {
                if (pendingStartCombatRef.current && isStoryController) {
                    if (selectedFactionRef.current) {
                        void startCombatAfterNarration([requestId]);
                    } else {
                        logImportant('[FACTION] Waiting for faction_selected before starting combat');
                    }
                }
            }

            if (eventType === 'encounter_end' && !hasResolvedOptions) {
                logImportant('[ENCOUNTER_END] No AI options provided in fallback/normal response');
                setAllowFallbackPostEncounterChoices(Boolean(fallback));
            } else if (eventType === 'encounter_end') {
                logImportant('[ENCOUNTER_END] AI provided options:', options);
            }

            if ((eventType === 'choice_made' || eventType === 'story_choice') && !hasResolvedOptions && !startCombat) {
                setAllowFallbackPostEncounterChoices(Boolean(fallback));
            }
        };

        const handleAiError = ({ requestId, error }) => {
            console.warn('[AI] Narration request failed:', error);

            const isIntroNarrationError = requestId && requestId === introNarrationRequestIdRef.current;
            if (isIntroNarrationError && !introNarrationGateSettledRef.current) {
                introNarrationGateSettledRef.current = true;
                setPendingFactionChoice(true);
                setAllowFallbackFactionChoices(true);
                setIntroNarrationGate(false);
            }

            markAiRequestCompleted(requestId);
            markAiTypingExpectedCompletion(requestId, '');
            setAiBusy(false);

            if (pendingFactionChoice) {
                setAllowFallbackFactionChoices(true);
            }
            if (pendingPostEncounterChoice) {
                setAllowFallbackPostEncounterChoices(true);
            }
            if (pendingNextEncounterChoice) {
                setAllowFallbackNextEncounterChoice(true);
            }

            if (
                isStoryController &&
                requestId &&
                requestId === pendingPostCombatNarrationRequestIdRef.current
            ) {
                clearPendingPostCombatFallback();
                const postCombatAction = pendingPostCombatActionRef.current || 'none';
                pendingPostCombatNarrationRequestIdRef.current = null;
                pendingPostCombatActionRef.current = null;
                proceedPostCombatAction(postCombatAction);
                setAllowFallbackPostEncounterChoices(true);
            }
        };

        const handleAiThinking = ({ thinking }) => {
            setAiBusy(thinking);
        };

        const handleCombatEnded = ({ result, encounterIndex, postCombat, isFinalEncounter, partyPositions } = {}) => {
            combatLifecycleActiveRef.current = false;
            moveAnimationTimersRef.current.forEach(clearTimeout);
            moveAnimationTimersRef.current = [];

            if (result === 'all_dead') {
                setTurnOrder([]);
                setEnemies([]);
                setGameOver(true);
                return;
            }

            setSelectedAbility(null);
            setSelectedTargets([]);
            setPendingRelocateTarget(null);
            setWeaponSelected(false);
            setIsTurnActionLocked(false);
            setTurnStartLockRemainingMs(0);
            setTurnTimeLeft(null);

            // Back on the story board where the fight ended; anyone who fell is set down near the rest.
            const restoredPlayerPositions = {};
            players.forEach((playerId) => {
                const position = partyPositions?.[playerId];
                if (position && Number.isInteger(position.row) && Number.isInteger(position.col)) {
                    restoredPlayerPositions[playerId] = { row: position.row, col: position.col };
                }
            });

            const positionTaken = (row, col) =>
                Object.values(restoredPlayerPositions).some(pos => pos.row === row && pos.col === col);

            const claimFallbackPosition = (preferredRow, preferredCol) => {
                for (let radius = 0; radius < 10; radius++) {
                    const candidateCols = radius === 0 ? [preferredCol] : [preferredCol - radius, preferredCol + radius];
                    for (const candidateCol of candidateCols) {
                        if (candidateCol < 0 || candidateCol > 9) continue;
                        if (!positionTaken(preferredRow, candidateCol)) return { row: preferredRow, col: candidateCol };
                    }
                }
                for (let row = 0; row < 7; row++) {
                    for (let col = 0; col < 10; col++) {
                        if (!positionTaken(row, col)) return { row, col };
                    }
                }
                return { row: preferredRow, col: Math.max(0, Math.min(9, preferredCol)) };
            };

            players.forEach((playerId, index) => {
                if (restoredPlayerPositions[playerId]) return;
                const role = (playerCharactersRef.current?.[playerId]?.role || '').toLowerCase();
                restoredPlayerPositions[playerId] = claimFallbackPosition(role === 'tank' ? 5 : 6, index + 3);
            });

            setEnemies([]);
            setTurnOrder([]);
            setCurrentTurn(null);
            setIsMyTurn(false);
            setCharacterPositions(restoredPlayerPositions);
            sessionStorage.setItem(`playerPositions_${room}`, JSON.stringify(restoredPlayerPositions));

            if (postCombatOverlayTimeoutRef.current) {
                clearTimeout(postCombatOverlayTimeoutRef.current);
                postCombatOverlayTimeoutRef.current = null;
            }

            setShowEnemiesDefeatedScreen(true);

            const postCombatAction = postCombat || 'none';
            logImportant('[POST-COMBAT] Combat ended:', { encounterIndex, postCombatAction, isFinalEncounter, isStoryController });

            if (isFinalEncounter) {
                setShowEnemiesDefeatedScreen(false);
                setPendingPostEncounterChoice(false);
                setPendingNextEncounterChoice(false);
                setAllowFallbackPostEncounterChoices(false);
                setAllowFallbackNextEncounterChoice(false);
                setAiOptions(null);
                setAiAttribute(null);
                setAiBusy(false);
                clearPendingPostCombatFallback();
                pendingPostCombatNarrationRequestIdRef.current = null;
                pendingPostCombatActionRef.current = null;
                pendingEncounterEndAfterLevelUpRef.current = null;
                if (pendingEncounterNarrationStorageKey) {
                    sessionStorage.removeItem(pendingEncounterNarrationStorageKey);
                }
                setShowTheEndScreen(true);
                if (isStoryController) {
                    emitAiEvent('campaign_end', 'The final battle is won.', { final: true });
                }
                return;
            }

            setGamePhase('story');
            gamePhaseRef.current = 'story';

            postCombatOverlayTimeoutRef.current = setTimeout(() => {
                setShowEnemiesDefeatedScreen(false);
                postCombatOverlayTimeoutRef.current = null;

                if (!isStoryController) {
                    logImportant('[POST-COMBAT] Not story controller, skipping level up trigger. isStoryController:', isStoryController);
                    return;
                }

                const narrationMessage =
                    postCombatAction === 'levelUp'
                        ? 'All enemies have been defeated. The team catches a breath and prepares to level up.'
                        : postCombatAction === 'shop'
                            ? 'All enemies have been defeated. The team regroups and heads toward the shop.'
                            : 'All enemies have been defeated. The team regroups and pushes forward.';

                if (postCombatAction === 'levelUp') {
                    logImportant('[POST-COMBAT] Triggering level up! Emitting level_up event.');
                    persistPendingEncounterNarration({
                        postCombatAction,
                        narrationMessage
                    });
                    socket.emit('level_up', { room, encounterIndex: Number.isFinite(encounterIndex) ? encounterIndex : Math.max(0, combatFlowIndexRef.current - 1) });
                    return;
                }
                logImportant('[POST-COMBAT] postCombatAction is not levelUp, value:', postCombatAction);

                queueEncounterEndNarration(postCombatAction, narrationMessage);
            }, 2000);
        };

        socket.on('ai_message', handleAiMessage);
        socket.on('ai_error', handleAiError);
        socket.on('ai_thinking', handleAiThinking);
        socket.on('combat_ended', handleCombatEnded);
        socket.on('level_up_complete', handleLevelUpComplete);

        // Recover delayed post-levelup narration when Main remounts after levelup screen transitions.
        if (
            isStoryController &&
            !pendingPostCombatNarrationRequestIdRef.current
        ) {
            const pendingNarration = consumePendingEncounterNarration();
            if (pendingNarration) {
                queueEncounterEndNarration(
                    pendingNarration.postCombatAction,
                    pendingNarration.narrationMessage,
                    { source: 'post_level_up_resume' }
                );
            }
        }

        return () => {
            socket.off('ai_message', handleAiMessage);
            socket.off('ai_error', handleAiError);
            socket.off('ai_thinking', handleAiThinking);
            socket.off('combat_ended', handleCombatEnded);
            socket.off('level_up_complete', handleLevelUpComplete);
        };
    }, [socket, isStoryController, room, playerName, players, playerCharacters, pendingFactionChoice, pendingPostEncounterChoice, pendingNextEncounterChoice, pendingEncounterNarrationStorageKey]);

    useEffect(() => {
        return () => {
            pendingAiRequestResolversRef.current.clear();
            completedAiRequestIdsRef.current.clear();
            aiTypingCompletionByRequestIdRef.current.clear();
            pendingEncounterEndAfterLevelUpRef.current = null;
        };
    }, []);

    useEffect(() => {
        if (selectedFactionRef.current) {
            setIntroNarrationGate(false);
        }
    }, [selectedFaction]);

    useEffect(() => {
        if (turnStartLockTimeoutRef.current) {
            clearTimeout(turnStartLockTimeoutRef.current);
            turnStartLockTimeoutRef.current = null;
        }

        if (turnStartLockIntervalRef.current) {
            clearInterval(turnStartLockIntervalRef.current);
            turnStartLockIntervalRef.current = null;
        }

        if (!isMyTurn) {
            setIsTurnActionLocked(false);
            setTurnStartLockRemainingMs(0);
            return;
        }

        const lockStartTime = Date.now();
        setIsTurnActionLocked(true);
        setTurnStartLockRemainingMs(TURN_START_ACTION_LOCK_MS);

        turnStartLockIntervalRef.current = setInterval(() => {
            const elapsed = Date.now() - lockStartTime;
            const remaining = Math.max(0, TURN_START_ACTION_LOCK_MS - elapsed);
            setTurnStartLockRemainingMs(remaining);
        }, 100);

        turnStartLockTimeoutRef.current = setTimeout(() => {
            setIsTurnActionLocked(false);
            setTurnStartLockRemainingMs(0);

            if (turnStartLockIntervalRef.current) {
                clearInterval(turnStartLockIntervalRef.current);
                turnStartLockIntervalRef.current = null;
            }
            turnStartLockTimeoutRef.current = null;
        }, TURN_START_ACTION_LOCK_MS);

        return () => {
            if (turnStartLockTimeoutRef.current) {
                clearTimeout(turnStartLockTimeoutRef.current);
                turnStartLockTimeoutRef.current = null;
            }
            if (turnStartLockIntervalRef.current) {
                clearInterval(turnStartLockIntervalRef.current);
                turnStartLockIntervalRef.current = null;
            }
        };
    }, [isMyTurn, currentTurn?.type, currentTurn?.id]);

    // The server ends a turn when its clock runs out; this just shows the countdown.
    useEffect(() => {
        if (!isMyTurn) {
            setTurnTimeLeft(null);
            return;
        }
        const tick = () => {
            const deadline = turnDeadlineRef.current;
            setTurnTimeLeft(deadline ? Math.max(0, Math.ceil((deadline - Date.now()) / 1000)) : null);
        };
        tick();
        const interval = setInterval(tick, 500);
        return () => clearInterval(interval);
    }, [isMyTurn, currentTurn?.id]);

    // Check if current player is alive
    const isPlayerAlive = currentPlayerCharacter && currentPlayerCharacter.stats.health > 0;

    const hasEnhancedVision = activeEffects.some(effect =>
        effect.type === 'vision_enhanced' &&
        effect.target === playerName &&
        effect.turnsRemaining > 0
    );

    const getHighestPriorityStatusIcon = (unitId) => {
        if (!unitId) return null;

        const hasStatus = (predicate) => activeEffects.some(effect =>
            effect.target === unitId &&
            effect.turnsRemaining > 0 &&
            predicate(effect)
        );
        if (hasStatus(effect => effect.type === 'status_effect' && effect.status === 'immobilized')) {
            return <GiCrossedChains />;
        }

        if (hasStatus(effect => effect.type === 'stat_debuff' && effect.stat === 'speed')) {
            return <FaRegSnowflake />;
        }

        if (hasStatus(effect => effect.type === 'healing_prevented')) {
            return <FaSkullCrossbones />;
        }

        if (hasStatus(effect => effect.type === 'burn')) {
            return <FaFireAlt />;
        }

        if (hasStatus(effect =>
            effect.type === 'damage_over_time' &&
            (effect.source === 'white_phospherus' || effect.source === 'toxic_mist' || effect.source === 'toxic_mist_field' || !effect.source)
        )) {
            return <GiPoisonBottle />;
        }

        if (hasStatus(effect =>
            (effect.type === 'stat_buff' && effect.stat === 'resistance') ||
            (effect.type === 'damage_taken_multiplier' && effect.value < 1)
        )) {
            return <FaShieldAlt />;
        }

        if (hasStatus(effect => effect.type === 'stat_buff' && effect.stat === 'speed')) {
            return <GiRunningShoe />;
        }

        return null;
    };

    const hasControlLockEffect = (unitId, lockKey) =>
        activeEffects.some(effect => effect?.target === unitId && effect.turnsRemaining > 0 && effect[lockKey]);

    const isActionLockedForPlayer = () => hasControlLockEffect(playerName, 'preventActions');

    const unitAt = (row, col) =>
        Object.entries(characterPositions).find(([, pos]) => pos.row === row && pos.col === col)?.[0] || null;

    const livingEnemyAt = (row, col) => {
        const unitId = unitAt(row, col);
        return enemies.find(enemy => enemy.id === unitId && !isEnemyDeadBody(enemy)) || null;
    };

    const livingAllyAt = (row, col) => {
        const unitId = unitAt(row, col);
        return unitId && (playerCharacters[unitId]?.stats?.health || 0) > 0 ? unitId : null;
    };

    // Initialize player positions with role-based rows
    useEffect(() => {
        if (inCombat) return;
        const storedPlayerPositions = sessionStorage.getItem(`playerPositions_${room}`);
        if (storedPlayerPositions) {
            try {
                const serverPlayerPositions = JSON.parse(storedPlayerPositions);
                const restoredPlayerPositions = {};
                const nextStoredPlayerPositions = { ...serverPlayerPositions };
                let removedDeadStoredPosition = false;

                players.forEach((player) => {
                    const isDeadPlayer = (playerCharacters[player]?.stats?.health || 0) <= 0;
                    if (isDeadPlayer) {
                        if (nextStoredPlayerPositions[player]) {
                            delete nextStoredPlayerPositions[player];
                            removedDeadStoredPosition = true;
                        }
                        return;
                    }

                    const serverPosition = serverPlayerPositions[player];
                    if (!serverPosition) return;

                    if (!arePositionsEqual(characterPositions[player], serverPosition)) {
                        restoredPlayerPositions[player] = serverPosition;
                    }
                });

                if (removedDeadStoredPosition) {
                    sessionStorage.setItem(`playerPositions_${room}`, JSON.stringify(nextStoredPlayerPositions));
                }

                if (Object.keys(restoredPlayerPositions).length > 0) {
                    setCharacterPositions(prev => ({ ...prev, ...restoredPlayerPositions }));
                }

                return;
            } catch (error) {
                console.error('[POSITION RESTORE] Failed to parse stored player positions:', error);
            }
        }

        if ((enemies || []).length > 0) {
            return;
        }

        const getPlayerSpawnRow = (playerId) => {
            const role = (playerCharacters[playerId]?.role || '').toLowerCase();

            if (role === 'tank') {
                return 5;
            }

            return 6;
        };

        const usedPlayerCells = new Set(
            Object.entries(characterPositions)
                .filter(([id]) => players.includes(id))
                .map(([, pos]) => `${pos.row},${pos.col}`)
        );

        const findPlayerSpawnCell = (preferredRow, preferredCol) => {
            const candidateRows = [preferredRow, preferredRow === 5 ? 6 : 5];
            const maxOffset = 10;

            for (let offset = 0; offset < maxOffset; offset++) {
                const candidateCols = offset === 0
                    ? [preferredCol]
                    : [preferredCol - offset, preferredCol + offset];

                for (const row of candidateRows) {
                    for (const col of candidateCols) {
                        if (col < 0 || col >= 10) continue;
                        if (isSewerSpawnBlockedTile(currentSceneKey, row, col)) continue;

                        const key = `${row},${col}`;
                        if (!usedPlayerCells.has(key)) {
                            usedPlayerCells.add(key);
                            return { row, col };
                        }
                    }
                }
            }

            for (const row of candidateRows) {
                for (let col = 0; col < 10; col++) {
                    if (isSewerSpawnBlockedTile(currentSceneKey, row, col)) continue;

                    const key = `${row},${col}`;
                    if (!usedPlayerCells.has(key)) {
                        usedPlayerCells.add(key);
                        return { row, col };
                    }
                }
            }

            return { row: preferredRow, col: preferredCol };
        };

        const newPositions = {};
        players.forEach((player, index) => {
            const isDeadPlayer = (playerCharacters[player]?.stats?.health || 0) <= 0;
            if (isDeadPlayer) return;

            if (!characterPositions[player]) {
                const preferredRow = getPlayerSpawnRow(player);
                const preferredCol = index + 3;
                newPositions[player] = findPlayerSpawnCell(preferredRow, preferredCol);
            }
        });
        if (Object.keys(newPositions).length > 0) {
            setCharacterPositions(prev => ({ ...prev, ...newPositions }));
        }
    }, [players, room, characterPositions, playerCharacters, enemies, inCombat]);

    // Draws each new server snapshot, walking moved units along their paths.
    useEffect(() => {
        if (!combatState || gamePhase !== 'combat') return;
        const snapshot = combatState;

        moveAnimationTimersRef.current.forEach(clearTimeout);
        moveAnimationTimersRef.current = [];
        const finalPositions = snapshot.positions || {};
        const moves = (snapshot.events || []).filter(event => event.type === 'move' && Array.isArray(event.path) && event.path.length > 0);
        const shown = characterPositionsRef.current || {};

        setCharacterPositions({
            ...finalPositions,
            ...Object.fromEntries(moves.map(move => [move.unitId, shown[move.unitId] || move.path[0]]))
        });
        moves.forEach(move => {
            const stepMs = move.stepMs || PLAYER_STEP_MS;
            move.path.forEach((position, index) => {
                moveAnimationTimersRef.current.push(setTimeout(() => {
                    setCharacterPositions(previous => ({ ...previous, [move.unitId]: position }));
                }, stepMs * (index + 1)));
            });
        });

        const encounterNumber = (Number(snapshot.encounterIndex) || 0) + 1;
        if (encounterNumber > combatFlowIndexRef.current) {
            combatFlowIndexRef.current = encounterNumber;
            setCombatFlowIndex(encounterNumber);
        }

        const iWentDown = (snapshot.events || []).some(event => event.type === 'death' && event.unitId === playerName);
        if (iWentDown && !snapshot.endedResult) {
            setShowYouDiedScreen(true);
            setTimeout(() => setShowYouDiedScreen(false), 2500);
        }

        const myTurn = snapshot.turn?.type === 'ally' && snapshot.turn.id === playerName;
        turnDeadlineRef.current = myTurn && Number.isFinite(snapshot.turnMsRemaining)
            ? Date.now() + snapshot.turnMsRemaining
            : null;
    }, [combatState, gamePhase, playerName]);

    useEffect(() => {
        const handleCombatError = ({ message } = {}) => showCombatNotice(message);
        const handleTurnTimedOut = ({ playerName: timedOut } = {}) => {
            showCombatNotice(timedOut === playerName
                ? 'Out of time: your turn was ended.'
                : `${playerCharactersRef.current?.[timedOut]?.name || timedOut} ran out of time.`);
        };
        const handleCombatNarration = ({ text } = {}) => {
            const safeText = sanitizeAiNarrationText(text || '');
            if (safeText) setAiText(safeText);
        };

        socket.on('combat_error', handleCombatError);
        socket.on('turn_timed_out', handleTurnTimedOut);
        socket.on('combat_narration', handleCombatNarration);
        return () => {
            socket.off('combat_error', handleCombatError);
            socket.off('turn_timed_out', handleTurnTimedOut);
            socket.off('combat_narration', handleCombatNarration);
        };
    }, [socket, playerName]);

    const clearSelection = () => {
        setSelectedAbility(null);
        setSelectedTargets([]);
        setPendingRelocateTarget(null);
        setWeaponSelected(false);
    };

    // Player intents. The server checks them and answers with a new board or a reason it refused.
    const emitCombat = (event, payload = {}) => {
        socket.emit(event, { room, ...payload });
    };

    const handleGridClick = (row, col) => {
        if (isTurnActionLocked || isIntroNarrationGateActiveRef.current) return;
        if (!isMyTurn || !isPlayerAlive) return;

        const abilityData = selectedAbility ? getAbility(selectedAbility) : null;
        if (abilityData) {
            const cast = (payload) => {
                emitCombat('combat_ability', { abilityId: abilityData.id, ...payload });
                clearSelection();
            };

            switch (abilityData.targetType) {
                case 'ground-target':
                    cast({ targetPosition: { row, col } });
                    return;
                case 'ally': {
                    const allyId = livingAllyAt(row, col);
                    if (allyId) cast({ targetId: allyId });
                    else showCombatNotice('Pick a party member.');
                    return;
                }
                case 'single-enemy': {
                    const target = livingEnemyAt(row, col);
                    if (target) cast({ targetId: target.id });
                    else showCombatNotice('Pick an enemy.');
                    return;
                }
                case 'multi-enemy': {
                    const target = livingEnemyAt(row, col);
                    if (!target) {
                        showCombatNotice('Pick an enemy.');
                        return;
                    }
                    const alreadyPicked = selectedTargets.includes(target.id);
                    const targets = alreadyPicked ? selectedTargets : [...selectedTargets, target.id];
                    const livingEnemies = enemies.filter(enemy => !isEnemyDeadBody(enemy)).length;
                    const needed = Math.min(abilityData.maxTargets || 2, livingEnemies);
                    // Clicking a picked enemy again casts on the ones chosen so far.
                    if (targets.length >= needed || alreadyPicked) cast({ targets });
                    else setSelectedTargets(targets);
                    return;
                }
                case 'relocate': {
                    if (!pendingRelocateTarget) {
                        const unitId = livingEnemyAt(row, col)?.id || livingAllyAt(row, col);
                        if (unitId) setPendingRelocateTarget(unitId);
                        else showCombatNotice('Pick someone to move first.');
                        return;
                    }
                    cast({ targetId: pendingRelocateTarget, targetPosition: { row, col } });
                    return;
                }
                default:
                    clearSelection();
                    return;
            }
        }

        if (weaponSelected) {
            const target = livingEnemyAt(row, col);
            if (target) {
                emitCombat('combat_attack', { targetId: target.id });
                setWeaponSelected(false);
            } else {
                showCombatNotice('Pick an enemy to attack.');
            }
            return;
        }

        if (!unitAt(row, col)) {
            emitCombat('combat_move', { to: { row, col } });
        }
    };

    const renderGrid = () => {
        const grid = [];
        const ROWS = 7;
        const COLS = 10;
        const activeHealingFields = activeEffects.filter(effect =>
            effect.type === 'healing_field' &&
            effect.turnsRemaining > 0 &&
            effect.center
        );
        const activeFireballZones = activeEffects.filter(effect =>
            effect.type === 'fireball_zone' &&
            effect.turnsRemaining > 0 &&
            effect.center
        );
        const activeBlackHoleZones = activeEffects.filter(effect =>
            effect.type === 'black_hole_zone' &&
            effect.turnsRemaining > 0 &&
            effect.center
        );
        const activeBlizzardFields = activeEffects.filter(effect =>
            effect.type === 'blizzard_field' &&
            effect.turnsRemaining > 0 &&
            effect.center
        );
        const activeToxicMistFields = activeEffects.filter(effect =>
            effect.type === 'toxic_mist_field' &&
            effect.turnsRemaining > 0 &&
            effect.center
        );
        const activeBlueBarriers = activeEffects.filter(effect =>
            effect.type === 'blue_barrier' &&
            effect.turnsRemaining > 0 &&
            effect.cell
        );
        const activeGtgOriginMarkers = activeEffects.filter(effect =>
            effect.type === 'gtg_origin_marker' &&
            effect.turnsRemaining > 0 &&
            effect.cell
        );

        for (let row = 0; row < ROWS; row++) {
            for (let col = 0; col < COLS; col++) {
                const characterOnCell = Object.entries(characterPositions).find(
                    ([, pos]) => pos.row === row && pos.col === col
                );

                const enemyOnCell = characterOnCell ? enemies.find(e => e.id === characterOnCell[0]) : null;
                const isEnemy = !!enemyOnCell;
                const isCorpse = isEnemyDeadBody(enemyOnCell);
                const isDeadPlayer = !isEnemy && !!characterOnCell && (playerCharacters[characterOnCell[0]]?.stats?.health || 0) <= 0;
                const isPlayerCharacter = characterOnCell && characterOnCell[0] === playerName;
                const isHealingFieldCell = activeHealingFields.some(field => {
                    const radius = field.radius ?? 1;
                    return (
                        Math.abs(field.center.row - row) <= radius &&
                        Math.abs(field.center.col - col) <= radius
                    );
                });
                const isFireballZoneCell = activeFireballZones.some(zone => {
                    const radius = zone.radius ?? 1;
                    return (
                        Math.abs(zone.center.row - row) <= radius &&
                        Math.abs(zone.center.col - col) <= radius
                    );
                });
                const isBlackHoleZoneCell = activeBlackHoleZones.some(zone => {
                    const radius = zone.radius ?? 2;
                    return (
                        Math.abs(zone.center.row - row) <= radius &&
                        Math.abs(zone.center.col - col) <= radius
                    );
                });
                const isBlizzardFieldCell = activeBlizzardFields.some(field => {
                    const radius = field.radius ?? 1;
                    return (
                        Math.abs(field.center.row - row) <= radius &&
                        Math.abs(field.center.col - col) <= radius
                    );
                });
                const isToxicMistCell = activeToxicMistFields.some(field => {
                    const radius = field.radius ?? 1;
                    return (
                        Math.abs(field.center.row - row) <= radius &&
                        Math.abs(field.center.col - col) <= radius
                    );
                });
                const isBlueBarrierCell = activeBlueBarriers.some(barrier =>
                    barrier.cell.row === row && barrier.cell.col === col
                );
                const isGtgOriginCell = activeGtgOriginMarkers.some(marker =>
                    marker.cell.row === row && marker.cell.col === col
                );
                const isWhitePhospherusEnemy = isEnemy && enemyOnCell && activeEffects.some(effect =>
                    effect.type === 'damage_over_time' &&
                    effect.source === 'white_phospherus' &&
                    effect.target === enemyOnCell.id &&
                    effect.turnsRemaining > 0
                );
                const unitStatusIcon = characterOnCell && !isCorpse
                    ? getHighestPriorityStatusIcon(characterOnCell[0])
                    : null;
                const isGuardedBreathAlly = !isEnemy && !!characterOnCell && activeEffects.some(effect =>
                    effect.source === 'guarded_breath' &&
                    effect.target === characterOnCell[0] &&
                    effect.turnsRemaining > 0
                );
                const isGtgTeleportedTarget = !!characterOnCell && activeEffects.some(effect =>
                    effect.type === 'gtg_target_marker' &&
                    effect.target === characterOnCell[0] &&
                    effect.turnsRemaining > 0
                );

                grid.push(
                    <div
                        key={`${row}-${col}`}
                        className={`grid-cell ${characterOnCell ? 'occupied' : ''
                            } ${isPlayerCharacter ? 'player-controlled' : ''} ${isEnemy ? (isCorpse ? 'enemy-corpse-cell' : 'enemy-cell') : ''} ${isHealingFieldCell ? 'healing-field-cell' : ''} ${isFireballZoneCell ? 'fireball-zone-cell' : ''} ${isBlackHoleZoneCell ? 'black-hole-zone-cell' : ''} ${isBlizzardFieldCell ? 'blizzard-field-cell' : ''} ${isToxicMistCell ? 'toxic-mist-cell' : ''} ${isBlueBarrierCell ? 'blue-barrier-cell' : ''} ${isGtgOriginCell ? 'gtg-origin-cell' : ''} ${isWhitePhospherusEnemy ? 'white-phospherus-glow' : ''} ${isGuardedBreathAlly ? 'guarded-breath-glow' : ''} ${isGtgTeleportedTarget ? 'gtg-target-glow' : ''}`}
                        onClick={() => handleGridClick(row, col)}
                    >
                        {/* <h3>{row} - {col}</h3> */}
                        {characterOnCell && (
                            <div className={`grid-character ${!isEnemy ? 'player-grid-character' : ''}`}>
                                <div className='status'></div>
                                {isEnemy ? (
                                    isCorpse ? (
                                        <div className="enemy-corpse-icon">
                                            <GiDeathSkull />
                                        </div>
                                    ) : (
                                        <>
                                            {unitStatusIcon && (
                                                <div className="status-effect-indicator status-effect-indicator-grid">
                                                    {unitStatusIcon}
                                                </div>
                                            )}
                                            <img
                                                className="enemy-grid-image"
                                                src={getEnemyImage(enemyOnCell)}
                                                alt={enemyOnCell?.name || 'Enemy'}
                                            />
                                            {hasEnhancedVision && (
                                                <div className="enemy-health">
                                                    {Math.ceil(enemyOnCell?.stats.health || 0)}
                                                </div>
                                            )}
                                        </>
                                    )
                                ) : (
                                    isDeadPlayer ? (
                                        <div className="enemy-corpse-icon">
                                            <GiDeathSkull />
                                        </div>
                                    ) : (
                                        playerCharacters[characterOnCell[0]] ? (
                                            <>
                                                {unitStatusIcon && (
                                                    <div className="status-effect-indicator status-effect-indicator-grid">
                                                        {unitStatusIcon}
                                                    </div>
                                                )}
                                                <img
                                                    className="grid-character-image"
                                                    src={getCharacterImage(playerCharacters[characterOnCell[0]])}
                                                    alt={playerCharacters[characterOnCell[0]].name}
                                                />
                                            </>
                                        ) : '?'
                                    )
                                )}
                            </div>
                        )}
                    </div>
                );
            }
        }
        return grid;
    };

    function handleStoryComplete() {
        if (combatLifecycleActiveRef.current) {
            logImportant('[COMBAT FLOW] Ignoring duplicate handleStoryComplete call while combat is active/in-flight.');
            return;
        }
        combatLifecycleActiveRef.current = true;
        clearSelection();
        setIsTurnActionLocked(false);
        setTurnStartLockRemainingMs(0);
        setTurnTimeLeft(null);

        // Where the party stands on the story board carries into the fight (the server checks it).
        const latestPositions = characterPositionsRef.current || {};
        const proposedPlayerPositions = {};
        players.forEach((playerId) => {
            const position = latestPositions[playerId];
            if (position && Number.isInteger(position.row) && Number.isInteger(position.col)) {
                proposedPlayerPositions[playerId] = { row: position.row, col: position.col };
            }
        });

        logImportant(`[COMBAT FLOW] Starting encounter ${combatFlowIndexRef.current + 1}/${TOTAL_ENCOUNTERS}`);
        socket.emit('start_combat', { room, sceneKey: currentSceneKey, playerPositions: proposedPlayerPositions });
    }

    const handleAbilityClick = (ability) => {
        if (isTurnActionLocked || isIntroNarrationGateActiveRef.current) return;
        if (!isMyTurn || !isPlayerAlive) return;

        if (isActionLockedForPlayer()) {
            showCombatNotice("You can't act right now.");
            return;
        }

        const abilityData = getAbility(ability.id);
        if (!abilityData || !canUseAbilityThisTurn(abilityData) || (cooldowns[ability.id] || 0) > 0) return;

        if (selectedAbility === abilityData.id) {
            clearSelection();
            return;
        }

        if (['self', 'all-allies', 'all-enemies'].includes(abilityData.targetType)) {
            emitCombat('combat_ability', { abilityId: abilityData.id });
            clearSelection();
            return;
        }

        setSelectedAbility(abilityData.id);
        setSelectedTargets([]);
        setPendingRelocateTarget(null);
        setWeaponSelected(false);
    };

    const handleEndTurn = () => {
        if (isTurnActionLocked || isIntroNarrationGateActiveRef.current) return;
        if (!isMyTurn) return;
        clearSelection();
        emitCombat('combat_end_turn');
    };

    return (
        <div className="main-game-container">
            {chat && <ChatBot />}
            {showYouDiedScreen && (
                <div className="you-died-screen">
                    <div className="you-died-content">
                        <h1>YOU HAVE FALLEN</h1>
                    </div>
                </div>
            )}

            {showEnemiesDefeatedScreen && (
                <div className="you-died-screen">
                    <div className="enemies-defeated-content">
                        <h1>ALL ENEMIES DEFEATED</h1>
                    </div>
                </div>
            )}

            {showTheEndScreen && (
                <div className="you-died-screen">
                    <div className="the-end-content">
                        <h1>THE END</h1>
                        {aiBusy && <p className="the-end-text">The story is being written...</p>}
                        {!aiBusy && aiText && <p className="the-end-text">{aiText}</p>}
                    </div>
                </div>
            )}

            {gameOver && (
                <div className="game-over-overlay">
                    <div className="game-over-screen">
                        <h1>GAME OVER</h1>
                        <p>All team members have fallen. The mission is lost</p>
                        <div className="game-over-buttons">
                            <button
                                className="game-over-button"
                                onClick={() => {
                                    console.log('[NEW GAME] Resetting game...');
                                    // Reset local state
                                    setGameOver(false);
                                    setShowYouDiedScreen(false);
                                    setShowEnemiesDefeatedScreen(false);
                                    setShowTheEndScreen(false);
                                    setEnemies([]);
                                    setTurnOrder([]);
                                    clearSelection();
                                    setCharacterPositions({});
                                    setSelectedFaction(null);

                                    // Request server to reset game state for all players
                                    socket.emit('reset_game', { room });
                                }}
                            >
                                New Game
                            </button>
                            <button
                                className="game-over-button"
                                onClick={() => {
                                    // Reset game state
                                    setGameOver(false);
                                    setShowYouDiedScreen(false);
                                    setShowEnemiesDefeatedScreen(false);
                                    setShowTheEndScreen(false);
                                    setEnemies([]);
                                    setTurnOrder([]);

                                    // Leave the room
                                    socket.emit('leave_room', { room, playerName });
                                    localStorage.removeItem("name");
                                    localStorage.removeItem("room");
                                    localStorage.removeItem("isAdmin");
                                    localStorage.removeItem("screen");
                                    window.location.reload();
                                }}
                            >
                                Quit
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div className="scene-name">
                <div className="scene-actions-left">
                    <button
                        className="leave-main"
                        onClick={() => {
                            if (window.confirm("Are you sure you want to leave the game? This will disconnect you from the current room.")) {
                                localStorage.removeItem("name");
                                localStorage.removeItem("room");
                                localStorage.removeItem("isAdmin");
                                localStorage.removeItem("screen");
                                socket.emit('leave_room', { room, playerName });
                                window.location.reload();
                            }
                        }}
                    >
                        LEAVE GAME
                    </button>
                    <SettingsMenu />
                    <button className='leave-main-help' onClick={() => setChat(true)}>Help</button>
                </div>
                <h2 className='title'>{SCENE_LABELS[currentSceneKey] || SCENE_LABELS.city_square}</h2>
                {combatNotice && <div className="combat-notice" role="status">{combatNotice}</div>}
                <h2>
                    {isMyTurn ? (
                        <div className="turn">
                            YOUR TURN
                            {isTurnActionLocked && (
                                <span className="turn-timer">{Math.ceil(turnStartLockRemainingMs / 1000)}s</span>
                            )}
                            {turnTimeLeft !== null && turnTimeLeft < 16 && (
                                <span className="turn-timer">{turnTimeLeft}s</span>
                            )}
                            {myTurnState && (
                                <span className="turn-moves">{movementLeft} {movementLeft === 1 ? 'move' : 'moves'} left</span>
                            )}
                        </div>
                    ) : (
                        <div className="turn">
                            {currentTurn?.type === 'ally'
                                ? `${currentTurn.id}'s Turn`
                                : `${enemies.find(enemy => enemy.id === currentTurn?.id)?.name || 'Enemy'}'s Turn`}
                        </div>
                    )}
                </h2>
            </div>
            <div className="party">
                <h3>Party</h3>
                {[...players]
                    .sort((a, b) => {
                        const speedA = playerCharacters[a]?.stats.speed || 0;
                        const speedB = playerCharacters[b]?.stats.speed || 0;
                        return speedB - speedA;
                    })
                    .map((player, index) => {
                        const character = playerCharacters[player];
                        const isPlayerChar = player === playerName;
                        const partyStatusIcon = getHighestPriorityStatusIcon(player);
                        return (
                            <div
                                key={index}
                                className={`party-member ${isPlayerChar ? 'party-selected player-char' : ''}`}
                            >
                                {character ? (
                                    <>
                                        <div className="character-icon">
                                            {partyStatusIcon && (
                                                <div className="status-effect-indicator status-effect-indicator-party">
                                                    {partyStatusIcon}
                                                </div>
                                            )}
                                            <img
                                                src={getCharacterImage(character)}
                                                alt={character.name}
                                            />
                                        </div>
                                        <div className="character-info">
                                            <div className="character-name">{character.name}</div>
                                            <div className="character-stats">
                                                <span className="stat-speed">SPD: {character.stats.speed}</span>
                                                <span className="stat-hp">HP: {Math.ceil(character.stats.health)}/{character.stats.maxHealth}</span>
                                            </div>
                                            <div className="party-member-health-bar-container">
                                                <div
                                                    className="party-member-health-bar-fill"
                                                    style={{ width: `${Math.max(0, Math.min(100, (character.stats.health / character.stats.maxHealth) * 100))}%` }}
                                                ></div>
                                            </div>
                                        </div>
                                    </>
                                ) : (
                                    <div className="character-name">No Character</div>
                                )}
                            </div>
                        );
                    })}
            </div>

            <div className="main-game">
                <div
                    className="game-area"
                    style={{ backgroundImage: `url('${SCENE_BACKGROUNDS[currentSceneKey] || SCENE_BACKGROUNDS.city_square}')` }}
                >
                    <div className="battle-grid">
                        {renderGrid()}
                    </div>
                </div>
            </div>

            <div className="AI-script">
                <div className="ai-header">
                    <span className={`ai-status ${aiBusy ? '' : ''}`}>
                        {aiBusy ? '' : 'Ready'}
                    </span>
                </div>
                <span className="ai-text">
                    {displayText}
                </span>
                <div className='Response'>
                    {aiBusy && (
                        <div className="ai-thinking-overlay">
                            <div className="ai-thinking-spinner"></div>
                            <span>The DM is crafting the story...</span>
                        </div>
                    )}
                    {/* AI-driven dynamic options */}
                    {hasDynamicAiChoices && (
                        <div className="ai-choices">
                            <div className="ai-choice-owner">
                                {getDecisionOwnerDisplay(aiAttribute, 'politician')}
                            </div>
                            {aiOptions.map((option, idx) => (
                                <button
                                    key={idx}
                                    onClick={() => handleAiOptionClick(option)}
                                    disabled={aiBusy || !canPlayerDecide(effectiveAiDecisionAttribute)}
                                >
                                    {option}
                                </button>
                            ))}
                        </div>
                    )}
                    {/* Legacy faction choice fallback */}
                    {hasFallbackFactionChoices && (
                        <div className="ai-choices">
                            <div className="ai-choice-owner">
                                {getDecisionOwnerDisplay('politician', 'politician')}
                            </div>
                            <button onClick={() => handleFactionChoice('the Enforcers')} disabled={aiBusy || !canPlayerDecide('politician')}>Fight with the Enforcers</button>
                            <button onClick={() => handleFactionChoice('the Rebels')} disabled={aiBusy || !canPlayerDecide('politician')}>Fight with the Rebels</button>
                        </div>
                    )}
                    {hasFallbackPostEncounterChoices && (
                        <div className="ai-choices">
                            <div className="ai-choice-owner">
                                {getDecisionOwnerDisplay(aiAttribute || 'politician', 'politician')}
                            </div>
                            <button onClick={() => handleStoryPointChoice('Investigate the nearest lead')} disabled={aiBusy || !canPlayerDecide(effectiveAiDecisionAttribute)}>Investigate the nearest lead</button>
                            <button onClick={() => handleStoryPointChoice('Take a cautious route forward')} disabled={aiBusy || !canPlayerDecide(effectiveAiDecisionAttribute)}>Take a cautious route forward</button>
                        </div>
                    )}
                    {hasFallbackNextEncounterChoices && (
                        <div className="ai-choices">
                            <div className="ai-choice-owner">
                                {getDecisionOwnerDisplay(aiAttribute || 'politician', 'politician')}
                            </div>
                            <button onClick={() => handleStoryPointChoice('Push the story forward')} disabled={aiBusy || !canPlayerDecide(effectiveAiDecisionAttribute)}>Push the story forward</button>
                        </div>
                    )}
                    {showDialogue && (
                        <DialogueChoices dialogue={dialogue} playerName={playerName} onChoose={handleDialogueReply} busy={dialogueBusy || aiBusy} />
                    )}
                    {/* <button style={{ width: '150px' }} onClick={handleLevelUp}>Level Up</button> */}
                    {/* <button style={{ width: '150px' }} onClick={() => handleStoryComplete()}>Combat</button> */}
                </div>
            </div>
            <div className={`inventory ${shouldShowMobileAiOverlay ? 'mobile-ai-active' : ''}`}>
                <div className="mobile-ai-overlay" aria-hidden={!shouldShowMobileAiOverlay}>
                    <div className="mobile-ai-overlay-content">
                        {aiBusy && (
                            <div className="mobile-ai-overlay-status">The DM is crafting the story...</div>
                        )}
                        <div className="mobile-ai-overlay-text">
                            {displayText}
                        </div>
                        {hasDynamicAiChoices && (
                            <div className="mobile-ai-overlay-choices">
                                <div className="mobile-ai-choice-owner">
                                    {getDecisionOwnerDisplay(aiAttribute, 'politician')}
                                </div>
                                {aiOptions.map((option, idx) => (
                                    <button
                                        key={`mobile-ai-option-${idx}`}
                                        onClick={() => handleAiOptionClick(option)}
                                        disabled={aiBusy || !canPlayerDecide(effectiveAiDecisionAttribute)}
                                    >
                                        {option}
                                    </button>
                                ))}
                            </div>
                        )}
                        {hasFallbackFactionChoices && (
                            <div className="mobile-ai-overlay-choices">
                                <div className="mobile-ai-choice-owner">
                                    {getDecisionOwnerDisplay('politician', 'politician')}
                                </div>
                                <button onClick={() => handleFactionChoice('the Enforcers')} disabled={aiBusy || !canPlayerDecide('politician')}>Fight with the Enforcers</button>
                                <button onClick={() => handleFactionChoice('the Rebels')} disabled={aiBusy || !canPlayerDecide('politician')}>Fight with the Rebels</button>
                            </div>
                        )}
                        {hasFallbackPostEncounterChoices && (
                            <div className="mobile-ai-overlay-choices">
                                <div className="mobile-ai-choice-owner">
                                    {getDecisionOwnerDisplay(aiAttribute || 'politician', 'politician')}
                                </div>
                                <button onClick={() => handleStoryPointChoice('Investigate the nearest lead')} disabled={aiBusy || !canPlayerDecide(effectiveAiDecisionAttribute)}>Investigate the nearest lead</button>
                                <button onClick={() => handleStoryPointChoice('Take a cautious route forward')} disabled={aiBusy || !canPlayerDecide(effectiveAiDecisionAttribute)}>Take a cautious route forward</button>
                            </div>
                        )}
                        {hasFallbackNextEncounterChoices && (
                            <div className="mobile-ai-overlay-choices">
                                <div className="mobile-ai-choice-owner">
                                    {getDecisionOwnerDisplay(aiAttribute || 'politician', 'politician')}
                                </div>
                                <button onClick={() => handleStoryPointChoice('Push the story forward')} disabled={aiBusy || !canPlayerDecide(effectiveAiDecisionAttribute)}>Push the story forward</button>
                            </div>
                        )}
                        {showDialogue && (
                            <DialogueChoices dialogue={dialogue} playerName={playerName} onChoose={handleDialogueReply} busy={dialogueBusy || aiBusy} mobile />
                        )}
                    </div>
                </div>
                {currentPlayerCharacter ? (
                    <>
                        <div className="character-sheet-header">
                            <div className="character-portrait">
                                <div className="portrait-icon">
                                    <img
                                        src={getCharacterImage(currentPlayerCharacter)}
                                        alt={currentPlayerCharacter.name}
                                    />
                                </div>
                                <div className="character-title">
                                    <div className="char-name">{currentPlayerCharacter.name}</div>
                                    <div className="char-role">{currentPlayerCharacter.role}</div>

                                    <div className='attributes'>
                                        {allPlayerAttributes[playerName] && allPlayerAttributes[playerName].length > 0 ? (
                                            <>
                                                <div className="attribute-line">
                                                    <span className="primary-ability small">
                                                        {allPlayerAttributes[playerName][0]?.charAt(0).toUpperCase() + allPlayerAttributes[playerName][0]?.slice(1)}
                                                    </span>
                                                </div>
                                                /
                                                <div className="attribute-line">
                                                    <span className="secondary-ability small">
                                                        {allPlayerAttributes[playerName][1]?.charAt(0).toUpperCase() + allPlayerAttributes[playerName][1]?.slice(1)}
                                                    </span>
                                                </div>
                                            </>
                                        ) : (
                                            <div className="no-allocation">No attributes allocated</div>
                                        )}
                                    </div>
                                </div>
                            </div>
                            <div className="stats-section">
                                <h4>Stats</h4>
                                <div className="stats-grid">
                                    {(() => {
                                        const statBonuses = getStatBonuses(currentPlayerCharacter, playerName, activeEffects);
                                        const currentPosition = characterPositions[playerName];
                                        const totalSpeedBeforeTerrain = calculateTotalStat(currentPlayerCharacter, playerName, 'speed', activeEffects);
                                        const sewerAdjustedSpeed = speedOnTile(totalSpeedBeforeTerrain, currentPosition, currentSceneKey);
                                        const sewerSpeedPenalty = Math.max(0, totalSpeedBeforeTerrain - sewerAdjustedSpeed);
                                        return (
                                            <>
                                                <div className="stat-item">
                                                    <span className="stat-label">Health</span>
                                                    <span className="stat-value">
                                                        {Math.ceil(currentPlayerCharacter.stats.health)}
                                                        {statBonuses.health && (
                                                            <span className={statBonuses.health > 0 ? 'stat-buff' : 'stat-debuff'}>
                                                                {statBonuses.health > 0 ? ' +' : ' '}{statBonuses.health}
                                                            </span>
                                                        )}
                                                    </span>
                                                </div>
                                                <div className="stat-item">
                                                    <span className="stat-label">Speed</span>
                                                    <span className="stat-value">
                                                        {currentPlayerCharacter.stats.speed}
                                                        {statBonuses.speed && (
                                                            <span className={statBonuses.speed > 0 ? 'stat-buff' : 'stat-debuff'}>
                                                                {statBonuses.speed > 0 ? ' +' : ' '}{statBonuses.speed}
                                                            </span>
                                                        )}
                                                        {sewerSpeedPenalty > 0 && (
                                                            <span className="stat-debuff"> -{sewerSpeedPenalty}</span>
                                                        )}
                                                    </span>
                                                </div>
                                                <div className="stat-item">
                                                    <span className="stat-label">Resistance</span>
                                                    <span className="stat-value">
                                                        {currentPlayerCharacter.stats.resistance}
                                                        {statBonuses.resistance && (
                                                            <span className={statBonuses.resistance > 0 ? 'stat-buff' : 'stat-debuff'}>
                                                                {statBonuses.resistance > 0 ? ' +' : ' '}{statBonuses.resistance}
                                                            </span>
                                                        )}
                                                    </span>
                                                </div>
                                                <div className="stat-item">
                                                    <span className="stat-label">Strength</span>
                                                    <span className="stat-value">
                                                        {currentPlayerCharacter.stats.strength}
                                                        {statBonuses.strength && (
                                                            <span className={statBonuses.strength > 0 ? 'stat-buff' : 'stat-debuff'}>
                                                                {statBonuses.strength > 0 ? ' +' : ' '}{statBonuses.strength}
                                                            </span>
                                                        )}
                                                    </span>
                                                </div>
                                                <div className="stat-item">
                                                    <span className="stat-label">Tech Ability</span>
                                                    <span className="stat-value">
                                                        {currentPlayerCharacter.stats.ta}
                                                        {statBonuses.ta && (
                                                            <span className={statBonuses.ta > 0 ? 'stat-buff' : 'stat-debuff'}>
                                                                {statBonuses.ta > 0 ? ' +' : ' '}{statBonuses.ta}
                                                            </span>
                                                        )}
                                                    </span>
                                                </div>
                                            </>
                                        );
                                    })()}
                                </div>
                            </div>
                        </div>

                        <div className="weapon-section">
                            <h4>Weapon</h4>
                            {(() => {
                                const weaponScalingStat = getPlayerWeaponScalingStat(currentPlayerCharacter);
                                const weaponScalerIcon = getAbilityScaler({ damageScaling: weaponScalingStat });

                                return (
                            <div
                                className={`weapon-card ${weaponSelected ? 'weapon-selected' : ''} ${((actionUsed && extraWeaponAttacksRemaining <= 0) || !isPlayerAlive || isTurnActionLocked) ? 'weapon-disabled' : ''}`}
                                onClick={() => {
                                    if (!isMyTurn || isTurnActionLocked || !isPlayerAlive || (actionUsed && extraWeaponAttacksRemaining <= 0)) return;
                                    const selectWeapon = !weaponSelected;
                                    clearSelection();
                                    setWeaponSelected(selectWeapon);
                                }}
                                style={{ cursor: (isMyTurn && !isTurnActionLocked && (!actionUsed || extraWeaponAttacksRemaining > 0) && isPlayerAlive) ? 'pointer' : 'not-allowed' }}
                            >
                                <div className='damage-scaling'>{weaponScalerIcon}</div>
                                <div className="weapon-info">
                                    <div className="weapon-name" style={currentPlayerCharacter.weapon.name === 'Shotgun' ? { color: 'var(--neon-pink)', textShadow: '0 0 8px rgba(var(--neon-pink-rgb), 0.6)' } : {}}>{currentPlayerCharacter.weapon.name}</div>
                                    <div className="weapon-range" style={currentPlayerCharacter.weapon.name === 'Shotgun' ? { color: '#9a9aaa', fontWeight: 400, lineHeight: 1.3 } : {}}>{currentPlayerCharacter.weapon.range == 1 ? "Melee" : "Range: " + currentPlayerCharacter.weapon.range}</div>
                                </div>
                            </div>
                                );
                            })()}
                        </div>

                        <div className="abilities-section">
                            <h4>Abilities</h4>
                            <div className="abilities-grid">
                                {(Array.isArray(currentPlayerCharacter.abilities) ? currentPlayerCharacter.abilities : []).map((ability, index) => {
                                    const resolvedAbility = typeof ability === 'string' ? getAbility(ability) : ability;
                                    if (!resolvedAbility?.id) {
                                        console.warn('[ABILITY DEBUG] Dropping ability during render - invalid shape:', {
                                            index,
                                            rawAbility: ability,
                                            rawType: typeof ability,
                                            resolvedAbility
                                        });
                                        return null;
                                    }

                                    const currentCooldown = cooldowns[resolvedAbility.id] || 0;
                                    const isOnCooldown = currentCooldown > 0;
                                    const isSelected = selectedAbility === resolvedAbility.id;
                                    const range = resolvedAbility.range === 1 ? "Melee" : resolvedAbility.range === undefined ? "" : "Range: " + resolvedAbility.range;
                                    const canonicalAbility = getAbility(resolvedAbility.id) || resolvedAbility;
                                    const scalerIcon = getAbilityScaler(canonicalAbility);
                                    const bonusIcon = getIsBonusAction(canonicalAbility);

                                    // console.log('[ABILITY SCALER]', {
                                    //     abilityId: resolvedAbility.id,
                                    //     abilityName: resolvedAbility.name,
                                    //     damageScaling: canonicalAbility.damageScaling,
                                    //     hasScalerIcon: !!scalerIcon
                                    // });

                                    return (
                                        <button
                                            onClick={() => handleAbilityClick(resolvedAbility)}
                                            key={index}
                                            className={`ability-card ${isOnCooldown ? 'ability-on-cooldown' : ''
                                                } ${isSelected ? 'ability-selected' : ''
                                                }`}
                                            disabled={!isMyTurn || isTurnActionLocked || isOnCooldown || !canUseAbilityThisTurn(resolvedAbility) || !isPlayerAlive}
                                        >
                                            <div className='damage-scaling'>{scalerIcon}{bonusIcon}</div>
                                            <div className="ability-header">
                                                <div className="ability-name">{resolvedAbility.name}</div>
                                                <div className="ability-cd">
                                                    {isOnCooldown ? currentCooldown : `CD: ${resolvedAbility.cooldown}`}
                                                    <div className="ability-range">
                                                        {range}
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="ability-desc">{resolvedAbility.description}</div>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        <div className="ultimate-section">
                            <h4>Ultimate</h4>
                            {(() => {
                                const rawUltimate = currentPlayerCharacter?.ultimate;
                                const resolvedUltimate = typeof rawUltimate === 'string'
                                    ? getAbility(rawUltimate)
                                    : rawUltimate;
                                const hasUltimate = !!resolvedUltimate?.id;
                                const ultimateId = resolvedUltimate?.id;
                                const currentCooldown = ultimateId ? (cooldowns[ultimateId] || 0) : 0;
                                const isOnCooldown = currentCooldown > 0;
                                const isSelected = ultimateId ? selectedAbility === ultimateId : false;
                                const range = hasUltimate
                                    ? (resolvedUltimate.range === 1 ? "Melee" : resolvedUltimate.range === undefined ? "" : "Range: " + resolvedUltimate.range)
                                    : "";
                                const canonicalAbility = hasUltimate ? (getAbility(ultimateId) || resolvedUltimate) : null;
                                const scalerIcon = canonicalAbility ? getAbilityScaler(canonicalAbility) : null;

                                return (
                                    <button
                                        className={`ultimate-card ${isOnCooldown ? 'ultimate-on-cooldown' : ''
                                            } ${isSelected ? 'ultimate-selected' : ''
                                            }`}
                                        disabled={!isMyTurn || isTurnActionLocked || isOnCooldown || (hasUltimate && !canUseAbilityThisTurn(resolvedUltimate)) || !isPlayerAlive || !hasUltimate}
                                        onClick={() => {
                                            if (!hasUltimate) {
                                                console.warn('[ABILITY DEBUG] Ultimate click blocked - invalid or missing ultimate:', rawUltimate);
                                                return;
                                            }
                                            console.log('[ULTIMATE CLICK] Ultimate clicked:', resolvedUltimate);
                                            handleAbilityClick(resolvedUltimate);
                                        }}
                                    >
                                        {scalerIcon && <div className='damage-scaling'>{scalerIcon}</div>}
                                        <div className="ultimate-header">
                                            <div className="ultimate-name">{hasUltimate ? resolvedUltimate.name : 'No Ultimate Available'}</div>
                                             <div className="ability-cd-ultimate">
                                             {hasUltimate ? (isOnCooldown ? currentCooldown : `CD: ${resolvedUltimate.cooldown}`) : ''}
                                             {range && <div className="ability-range">{range}</div>}
                                             </div>
                                        </div>
                                        <div className="ultimate-desc">{hasUltimate ? resolvedUltimate.description : 'Reach level 3 to unlock your ultimate.'}</div>
                                    </button>
                                );
                            })()}
                        </div>
                    </>
                ) : (
                    <div className="no-character">No character selected</div>
                )}
            </div>

            {isMyTurn && <button className="end-turn" onClick={handleEndTurn} disabled={!isMyTurn || isTurnActionLocked}>End Turn</button>}
        </div>

    );
};

export default Main;
