import React from 'react';
import { useState, useEffect, useRef } from 'react';
import { useGameContext } from '../../Components/Context';
import EnemiesData from '../../Components/Enemies.json';
import { executeEnemyTurn } from './EnemyCombat';
import { getAbility, executeAbility, applyAbilityEffects, tickCooldowns, tickActiveEffects, calculateTotalStat, getStatBonuses, hasDamageImmunity, getDamageTakenMultiplier, applyDamageKeywords, hasDamageReflection, updateBlizzardFieldEffects } from './AbilityLogic';
import { enrichCharacterAbilities } from '../../Utils/characterUtils';
import { GiDeathSkull, GiPoisonBottle, GiRunningShoe, GiCrossedChains } from 'react-icons/gi';
import { FaRegSnowflake, FaSkullCrossbones, FaFireAlt, FaShieldAlt } from 'react-icons/fa';
import { assignEnemyAbilities } from '../../Utils/enemyAbilityUtils';
import './Main.css';

const SCENE_BACKGROUNDS = {
    city_square: '/Background-City Square.png',
    warehouse: '/Background-Warehouse.png',
    club: '/Background-Club.png',
    hospital: '/Background-Hospital.png',
    office: '/Background-office.png',
    sewer: '/Background-sewer.png',
    shop: '/Background-shop.png',
    boss: '/Background-boss.png',
    street: './Cyberpunk City Street.png'
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
    boss: 'boss'
};

const SEWER_SLOW_TILE_KEYS = new Set([
    '3,0', '3,1', '3,2', '3,3', '3,4', '3,5', '3,6', '3,7', '3,8', '3,9',
    '1,4', '1,5', '2,4', '2,5', '4,4', '5,4', '5,5'
]);

const SEWER_SPAWN_BLOCKED_TILE_KEYS = new Set([
    ...SEWER_SLOW_TILE_KEYS,
    '0,4', '0,5', '6,4', '6,5'
]);

const toTileKey = (row, col) => `${row},${col}`;
const isSewerScene = (sceneKey) => sceneKey === 'sewer';

const isSewerSlowTile = (sceneKey, position) => {
    if (!isSewerScene(sceneKey) || !position) return false;
    return SEWER_SLOW_TILE_KEYS.has(toTileKey(position.row, position.col));
};

const isSewerSpawnBlockedTile = (sceneKey, row, col) => {
    if (!isSewerScene(sceneKey)) return false;
    return SEWER_SPAWN_BLOCKED_TILE_KEYS.has(toTileKey(row, col));
};

const getSewerAdjustedSpeed = (sceneKey, speedValue, position) => {
    const normalizedSpeed = Number.isFinite(speedValue) ? speedValue : 0;
    if (isSewerSlowTile(sceneKey, position)) {
        return Math.floor(normalizedSpeed / 2);
    }
    return normalizedSpeed;
};

const normalizeSceneToken = (value = '') =>
    value
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_+|_+$/g, '');

const resolveSceneKey = (rawKeyword = '') => {
    const normalizedKeyword = normalizeSceneToken(rawKeyword);
    return SCENE_ALIASES[normalizedKeyword] || null;
};

function Main() {
    const { players, playerCharacters, setPlayerCharacters, playerName, room, socket,getAbilityScaler, attributeAllocations, setGamePhase, isMyTurn, currentTurn, enemies, setEnemies, turnOrder, setTurnOrder, isAdmin, setScreen, getCharacterImage, getEnemyImage } = useGameContext();
    const [currentPlayerCharacter, setCurrentPlayerCharacter] = useState(null);
    const [ultimateReady, setUltimateReady] = useState(false);
    const [characterPositions, setCharacterPositions] = useState({});
    const [weaponSelected, setWeaponSelected] = useState(false);
    const [selectedAbility, setSelectedAbility] = useState(null);
    const [selectedTargets, setSelectedTargets] = useState([]);
    const [pendingRelocateTarget, setPendingRelocateTarget] = useState(null);
    const [cooldowns, setCooldowns] = useState({});
    const [activeEffects, setActiveEffects] = useState([]);
    const [turnStartPosition, setTurnStartPosition] = useState(null);
    const [movementUsed, setMovementUsed] = useState(0);
    const [actionUsed, setActionUsed] = useState(false);
    const [extraWeaponAttacksRemaining, setExtraWeaponAttacksRemaining] = useState(0);
    const [turnTimeLeft, setTurnTimeLeft] = useState(null);
    const [aiLog, setAiLog] = useState([]);
    const [aiBusy, setAiBusy] = useState(false);
    const [pendingFactionChoice, setPendingFactionChoice] = useState(false);
    const [selectedFaction, setSelectedFaction] = useState(null);
    const [pendingPostEncounterChoice, setPendingPostEncounterChoice] = useState(false);
    const [pendingNextEncounterChoice, setPendingNextEncounterChoice] = useState(false);
    const [aiText, setAiText] = useState('');
    const [aiSentences, setAiSentences] = useState([]);
    const [currentSentenceIndex, setCurrentSentenceIndex] = useState(0);
    const [displayText, setDisplayText] = useState('');
    const [typingIndex, setTypingIndex] = useState(0);
    const [currentSceneKey, setCurrentSceneKey] = useState('city');
    const [aiOptions, setAiOptions] = useState(null);
    const [aiAttribute, setAiAttribute] = useState(null);
    const aiLogRef = useRef(null);
    const hasRequestedIntroRef = useRef(false);
    const pendingStartCombatRef = useRef(false);
    const cooldownStorageKey = room && playerName ? `cooldowns_${room}_${playerName}` : null;

    //state for AI story flow
    const [pendingChoice, setPendingChoice] = useState(null);
    const [choiceOptions, setChoiceOptions] = useState([]);
    const [choiceAttribute, setChoiceAttribute] = useState(null);
    const [choiceStartCombat, setChoiceStartCombat] = useState(false);

    const getDecisionOwner = (requiredAttribute) => {
        if (!requiredAttribute) return null;
        const owner = players.find(player => attributeAllocations[player]?.[0] === requiredAttribute);
        return owner || null;
    };

    const arePositionsEqual = (firstPosition, secondPosition) => {
        if (!firstPosition || !secondPosition) return false;
        return firstPosition.row === secondPosition.row && firstPosition.col === secondPosition.col;
    };

    const canPlayerDecide = (requiredAttribute) => {
        const owner = getDecisionOwner(requiredAttribute);
        if (!owner) return isAdmin;
        return owner === playerName;
    };
    const [showYouDiedScreen, setShowYouDiedScreen] = useState(false);
    const [gameOver, setGameOver] = useState(false);

    // Refs to track latest state values for handleEndTurn
    const activeEffectsRef = useRef(activeEffects);
    const playerCharactersRef = useRef(playerCharacters);
    const enemiesRef = useRef(enemies);
    const gameOverRef = useRef(gameOver);
    const movementUsedRef = useRef(movementUsed);
    const currentPlayerCharacterRef = useRef(currentPlayerCharacter);
    const actionUsedRef = useRef(actionUsed);
    const currentTurnRef = useRef(currentTurn);
    const currentTurnCycleRef = useRef(0);
    const completedEnemyTurnCyclesRef = useRef(new Set());
    const completedAllyTurnCyclesRef = useRef(new Set());
    const turnTimerIntervalRef = useRef(null);
    const turnTimerAutoEndedRef = useRef(false);
    const playerCorpseRemovalTurnRef = useRef({});

    const isEnemyDeadBody = (enemy) => {
        return !!enemy && (enemy.isDeadBody || (enemy.stats?.health || 0) <= 0);
    };

    const schedulePlayerCorpseRemoval = (deadPlayerId) => {
        if (!deadPlayerId) return;

        if (Number.isFinite(playerCorpseRemovalTurnRef.current[deadPlayerId])) return;

        playerCorpseRemovalTurnRef.current[deadPlayerId] = currentTurnCycleRef.current + 1;
    };

    const normalizeEnemiesState = (enemyList = []) => {
        return enemyList.map(enemy => {
            if (isEnemyDeadBody(enemy)) {
                return {
                    ...enemy,
                    isDeadBody: true,
                    corpseTurnsRemaining: enemy.corpseTurnsRemaining ?? 1,
                    stats: {
                        ...enemy.stats,
                        health: 0
                    }
                };
            }

            return {
                ...enemy,
                isDeadBody: false,
                corpseTurnsRemaining: enemy.corpseTurnsRemaining ?? 0
            };
        });
    };

    // Update refs whenever state changes
    useEffect(() => {
        activeEffectsRef.current = activeEffects;
    }, [activeEffects]);

    useEffect(() => {
        playerCharactersRef.current = playerCharacters;
    }, [playerCharacters]);

    useEffect(() => {
        enemiesRef.current = enemies;
    }, [enemies]);

    useEffect(() => {
        gameOverRef.current = gameOver;
    }, [gameOver]);

    useEffect(() => {
        if (!selectedAbility) {
            setPendingRelocateTarget(null);
        }
    }, [selectedAbility]);

    useEffect(() => {
        movementUsedRef.current = movementUsed;
    }, [movementUsed]);

    useEffect(() => {
        currentPlayerCharacterRef.current = currentPlayerCharacter;
    }, [currentPlayerCharacter]);

    useEffect(() => {
        actionUsedRef.current = actionUsed;
    }, [actionUsed]);

    useEffect(() => {
        currentTurnRef.current = currentTurn;
    }, [currentTurn]);

    useEffect(() => {
        currentTurnCycleRef.current += 1;
    }, [currentTurn?.type, currentTurn?.id]);

    useEffect(() => {
        return () => {
            playerCorpseRemovalTurnRef.current = {};
        };
    }, []);

    useEffect(() => {
        players.forEach(playerId => {
            const playerHealth = playerCharacters?.[playerId]?.stats?.health;
            const hasPositionOnBoard = !!characterPositions[playerId];

            if (Number.isFinite(playerHealth) && playerHealth <= 0 && hasPositionOnBoard) {
                schedulePlayerCorpseRemoval(playerId);
            } else if (Number.isFinite(playerHealth) && playerHealth > 0 && playerCorpseRemovalTurnRef.current[playerId] !== undefined) {
                delete playerCorpseRemovalTurnRef.current[playerId];
            }
        });
    }, [players, playerCharacters, characterPositions]);

    useEffect(() => {
        const dueRemovals = Object.entries(playerCorpseRemovalTurnRef.current)
            .filter(([, removalTurn]) => currentTurnCycleRef.current >= removalTurn)
            .map(([playerId]) => playerId);

        if (dueRemovals.length === 0) return;

        const storedPlayerPositions = sessionStorage.getItem(`playerPositions_${room}`);
        const parsedPlayerPositions = storedPlayerPositions ? JSON.parse(storedPlayerPositions) : {};
        let removedStoredPosition = false;

        dueRemovals.forEach(playerId => {
            if (parsedPlayerPositions[playerId]) {
                delete parsedPlayerPositions[playerId];
                removedStoredPosition = true;
            }
        });

        if (removedStoredPosition) {
            sessionStorage.setItem(`playerPositions_${room}`, JSON.stringify(parsedPlayerPositions));
        }

        setCharacterPositions(prev => {
            const nextPositions = { ...prev };
            dueRemovals.forEach(playerId => {
                if ((playerCharactersRef.current?.[playerId]?.stats?.health || 0) <= 0) {
                    delete nextPositions[playerId];
                }
                delete playerCorpseRemovalTurnRef.current[playerId];
            });
            return nextPositions;
        });
    }, [currentTurn?.type, currentTurn?.id]);

    const getMovementRemainingForAutoEnd = () => {
        const playerCharacter = currentPlayerCharacterRef.current;
        if (!playerCharacter) return 0;

        const totalSpeed = calculateTotalStat(playerCharacter, playerName, 'speed', activeEffectsRef.current || []);
        const currentPosition = characterPositions[playerName];
        const effectiveSpeed = getSewerAdjustedSpeed(currentSceneKey, totalSpeed, currentPosition);
        const maxMovement = Math.floor(effectiveSpeed / 10);
        return Math.max(0, maxMovement - (movementUsedRef.current || 0));
    };

    const shouldAutoEndTurn = () => {
        return actionUsedRef.current === true && getMovementRemainingForAutoEnd() <= 0;
    };

    const appendAiLog = (entry) => {
        const logEntry = {
            id: `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
            role: entry.role,
            text: entry.text,
            eventType: entry.eventType || 'chat'
        };
        setAiLog(prev => [...prev, logEntry]);
    };

    const setSceneFromKeyword = (keyword) => {
        const resolvedScene = resolveSceneKey(keyword);
        setCurrentSceneKey(resolvedScene || 'city_square');
    };

    const emitAiEvent = (eventType, message, data = {}, options = {}) => {
        if (!room) return;
        setAiBusy(true);
        setAiOptions(null);
        setAiAttribute(null);
        socket.emit('ai_request', {
            room,
            eventType,
            message,
            data,
            scenarioType: options.scenarioType,
            characterName: currentPlayerCharacter?.name,
            playerName
        });
    };
    

    const handleFactionChoice = (choice) => {
        if (!canPlayerDecide('politician')) return;

        const normalizedChoice = choice?.toLowerCase().includes('enforcer') ? 'enforcers' : 'rebels';
        setSelectedFaction(normalizedChoice);
        socket.emit('faction_selected', { room, faction: normalizedChoice });

        setPendingFactionChoice(false);
        setAiOptions(null);
        pendingStartCombatRef.current = true;
        emitAiEvent('choice_made', `The party chooses to fight with ${choice}.`, { choice });
    };

    useEffect(() => {
        const handleFactionSelected = (faction) => {
            if (faction === 'enforcers' || faction === 'rebels') {
                setSelectedFaction(faction);
            }
        };

        socket.on('faction_selected', handleFactionSelected);
        return () => {
            socket.off('faction_selected', handleFactionSelected);
        };
    }, [socket]);

    const handlePostEncounterChoice = (choice) => {
        const requiredAttribute = choice === 'shop' ? 'banker' : 'navigator';
        if (!canPlayerDecide(requiredAttribute)) return;
        setPendingPostEncounterChoice(false);
        if (choice === 'shop') {
            emitAiEvent('shop_intro', 'The party heads to the shop after the encounter.', { choice });
        } else {
            pendingStartCombatRef.current = true;
            emitAiEvent('next_encounter', 'The party pushes onward to the next encounter.', { choice });
        }
    };

    const handleNextEncounter = () => {
        if (!canPlayerDecide('navigator')) return;
        setPendingNextEncounterChoice(false);
        pendingStartCombatRef.current = true;
        emitAiEvent('next_encounter', 'Leaving the shop, the party moves toward the next encounter.', { choice: 'next_encounter' });
    };

    const handleAiOptionClick = (option) => {
        // Determine which attribute governs this choice
        const requiredAttribute = aiAttribute || null;
        if (requiredAttribute && !canPlayerDecide(requiredAttribute)) return;
        if (aiBusy) return;

        // Detect common option patterns and route them to existing handlers
        const lowerOption = option.toLowerCase();

        if (lowerOption.includes('enforcer')) {
            handleFactionChoice(option);
            return;
        }
        if (lowerOption.includes('people') || lowerOption.includes('rebel')) {
            handleFactionChoice(option);
            return;
        }
        if (lowerOption.includes('shop')) {
            handlePostEncounterChoice('shop');
            return;
        }
        if (lowerOption.includes('next encounter') || lowerOption.includes('next_encounter')) {
            setPendingPostEncounterChoice(false);
            setPendingNextEncounterChoice(false);
            pendingStartCombatRef.current = true;
            emitAiEvent('next_encounter', `The party chose: ${option}`, { choice: option });
            return;
        }

        // Generic: send as a choice_made event
        setAiOptions(null);
        emitAiEvent('choice_made', `The party chose: ${option}`, { choice: option });
    };

    useEffect(() => {
        if (playerCharacters[playerName]) {
            const nextCharacter = playerCharacters[playerName];
            console.log('[ABILITY DEBUG] Hydrating current player character:', {
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
        if (!cooldownStorageKey) return;

        const storedCooldowns = sessionStorage.getItem(cooldownStorageKey);
        if (!storedCooldowns) return;

        try {
            const parsedCooldowns = JSON.parse(storedCooldowns);
            if (parsedCooldowns && typeof parsedCooldowns === 'object' && !Array.isArray(parsedCooldowns)) {
                setCooldowns(parsedCooldowns);
            }
        } catch (error) {
            console.error('[COOLDOWN RESTORE] Failed to parse stored cooldowns:', error);
        }
    }, [cooldownStorageKey]);

    useEffect(() => {
        if (!cooldownStorageKey) return;

        sessionStorage.setItem(cooldownStorageKey, JSON.stringify(cooldowns || {}));
    }, [cooldowns, cooldownStorageKey]);

    useEffect(() => {
        const message = (aiText || '').trim();
        if (!message) {
            setAiSentences([]);
            setCurrentSentenceIndex(0);
            setDisplayText('');
            setTypingIndex(0);
            return;
        }

        const segments = message
            .split(/(?<=[.!?])\s+|\n+/)
            .map(segment => segment.trim())
            .filter(Boolean);

        setAiSentences(segments.length > 0 ? segments : [message]);
        setCurrentSentenceIndex(0);
        setDisplayText('');
        setTypingIndex(0);
    }, [aiText]);

    useEffect(() => {
        const currentSentence = aiSentences[currentSentenceIndex] || '';
        if (!currentSentence || typingIndex >= currentSentence.length) {
            return;
        }

        const interval = setInterval(() => {
            setDisplayText((prevText) => prevText + currentSentence.charAt(typingIndex));
            setTypingIndex((prevIndex) => prevIndex + 1);
        }, 20);

        return () => clearInterval(interval);
    }, [aiSentences, currentSentenceIndex, typingIndex]);

    useEffect(() => {
        const currentSentence = aiSentences[currentSentenceIndex] || '';
        if (!currentSentence || typingIndex < currentSentence.length) {
            return;
        }

        if (currentSentenceIndex >= aiSentences.length - 1) {
            return;
        }

        const timer = setTimeout(() => {
            setCurrentSentenceIndex((prevIndex) => prevIndex + 1);
            setDisplayText('');
            setTypingIndex(0);
        }, currentSentence.length * 18);

        return () => clearTimeout(timer);
    }, [aiSentences, currentSentenceIndex, typingIndex]);

    useEffect(() => {
        if (!isAdmin || !room || hasRequestedIntroRef.current) return;
        if (players.length === 0) return;

        hasRequestedIntroRef.current = true;
        const partySummary = players.map(player => {
            const character = playerCharacters[player];
            return character ? `${player} (${character.name})` : player;
        });

        emitAiEvent(
            'game_start',
            `Launch the story for party: ${partySummary.join(', ')}.`,
            { party: partySummary },
            { scenarioType: 'street_encounter' }
        );
    }, [isAdmin, room, players, playerCharacters]);

    useEffect(() => {
        const handleAiMessage = ({ eventType, response, location, attribute, startCombat, options }) => {
            setAiBusy(false);
            appendAiLog({ role: 'ai', text: response, eventType });
            setAiText(response || '');

            // Update location from structured response
            if (location) {
                setSceneFromKeyword(location);
            } else {
                const trimmedResponse = (response || '').trim();
                const isSingleKeyword = /^[a-zA-Z0-9_-]+$/.test(trimmedResponse);
                const isSceneEvent = eventType === 'scene' || eventType === 'scene_change' || eventType === 'location';
                if (isSceneEvent || isSingleKeyword) {
                    setSceneFromKeyword(trimmedResponse);
                }
            }

            // Store attribute for decision-making
            setAiAttribute(attribute || null);

            // Display options from AI if provided
            if (options && Array.isArray(options) && options.length > 0) {
                setAiOptions(options);
            } else {
                setAiOptions(null);
            }

            // Handle start_combat flag from AI
            if (startCombat && isAdmin) {
                pendingStartCombatRef.current = false;
                handleStoryComplete("medium");
                return;
            }

            // Fallback event-type logic for cases where AI doesn't set structured fields
            if (eventType === 'game_start' && !options) {
                setPendingFactionChoice(true);
            }

            if (eventType === 'choice_made' && !startCombat) {
                if (pendingStartCombatRef.current && isAdmin) {
                    pendingStartCombatRef.current = false;
                    handleStoryComplete("low");
                }
            }

            if (eventType === 'encounter_end' && !options) {
                setPendingPostEncounterChoice(true);
            }

            if (eventType === 'shop_intro' && !options) {
                setPendingNextEncounterChoice(true);
            }

            if (eventType === 'next_encounter' && !startCombat) {
                if (pendingStartCombatRef.current && isAdmin) {
                    pendingStartCombatRef.current = false;
                    handleStoryComplete("low");
                }
            }
        };

        const handleAiError = ({ error }) => {
            setAiBusy(false);
            appendAiLog({ role: 'system', text: `AI error: ${error}`, eventType: 'error' });
        };

        const handleAiThinking = ({ thinking }) => {
            setAiBusy(thinking);
        };

        const handleCombatEnded = ({ result }) => {
            console.log('[COMBAT ENDED] Received with result:', result);
            
            if (result === 'all_dead') {
                setTurnOrder([]);
                setEnemies([]);
                setGameOver(true);
                console.log('[COMBAT ENDED] All players defeated - showing game over screen');
                return;
            }
            
            if (!isAdmin) return;
            emitAiEvent('encounter_end', 'The encounter has ended.', { room });
        };

        socket.on('ai_message', handleAiMessage);
        socket.on('ai_error', handleAiError);
        socket.on('ai_thinking', handleAiThinking);
        socket.on('combat_ended', handleCombatEnded);

        return () => {
            socket.off('ai_message', handleAiMessage);
            socket.off('ai_error', handleAiError);
            socket.off('ai_thinking', handleAiThinking);
            socket.off('combat_ended', handleCombatEnded);
        };
    }, [socket, isAdmin, room, playerName, players, playerCharacters]);

    // Reset movement tracking when turn starts
    useEffect(() => {
        if (isMyTurn && characterPositions[playerName]) {
            setTurnStartPosition(characterPositions[playerName]);
            setMovementUsed(0);
            setActionUsed(false);
            setExtraWeaponAttacksRemaining(0);
            console.log('Turn started - movement reset');
            console.log('[TURN DEBUG] Player:', playerName);
            console.log('[TURN DEBUG] Current character:', currentPlayerCharacter?.name);
            console.log('[TURN DEBUG] Character position:', characterPositions[playerName]);
            console.log('[TURN DEBUG] Character stats:', currentPlayerCharacter?.stats);
        } else if (isMyTurn && !characterPositions[playerName]) {
            console.error('[TURN DEBUG] ITS MY TURN BUT NO POSITION!');
            console.error('[TURN DEBUG] Player:', playerName);
            console.error('[TURN DEBUG] All positions:', characterPositions);
        }
    }, [isMyTurn, playerName]);

    useEffect(() => {
        if (turnTimerIntervalRef.current) {
            clearInterval(turnTimerIntervalRef.current);
            turnTimerIntervalRef.current = null;
        }

        if (!isMyTurn) {
            turnTimerAutoEndedRef.current = false;
            setTurnTimeLeft(null);
            return;
        }

        turnTimerAutoEndedRef.current = false;
        setTurnTimeLeft(30);

        turnTimerIntervalRef.current = setInterval(() => {
            setTurnTimeLeft(prev => {
                if (prev === null) return null;
                return Math.max(0, prev - 1);
            });
        }, 1000);

        return () => {
            if (turnTimerIntervalRef.current) {
                clearInterval(turnTimerIntervalRef.current);
                turnTimerIntervalRef.current = null;
            }
        };
    }, [isMyTurn, currentTurn?.id]);

    useEffect(() => {
        if (!isMyTurn || turnTimeLeft !== 0 || turnTimerAutoEndedRef.current) {
            return;
        }

        if (!shouldAutoEndTurn()) {
            return;
        }

        turnTimerAutoEndedRef.current = true;
        console.log('[AUTO END TURN TIMER] Timer reached 0, ending turn');
        handleEndTurn();
    }, [isMyTurn, turnTimeLeft]);

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

        if (hasStatus(effect => effect.type === 'stat_buff' && effect.stat === 'resistance')) {
            return <FaShieldAlt />;
        }

        if (hasStatus(effect => effect.type === 'stat_buff' && effect.stat === 'speed')) {
            return <GiRunningShoe />;
        }

        return null;
    };

    const getPlayerIdByCharacterName = (characterName) => {
        if (!characterName || !playerCharacters) return null;

        const matchingPlayerIds = Object.keys(playerCharacters).filter(
            id => playerCharacters[id]?.name === characterName
        );

        if (matchingPlayerIds.length === 1) {
            return matchingPlayerIds[0];
        }

        return null;
    };

    const getCanonicalUnitId = (unitId) => {
        if (!unitId) return null;
        if (playerCharacters?.[unitId]) return unitId;

        const matchingPlayerId = getPlayerIdByCharacterName(unitId);
        return matchingPlayerId || unitId;
    };

    const getCurrentPlayerPosition = () => {
        const byPlayerId = characterPositions[playerName];
        if (byPlayerId) return byPlayerId;

        const byCharacterName = currentPlayerCharacter?.name
            ? characterPositions[currentPlayerCharacter.name]
            : null;

        return byCharacterName || null;
    };

    const resolveUnitIdFromCell = (rawId, row, col) => {
        if (!rawId) return rawId;

        if (playerCharacters?.[rawId]) return rawId;
        if (enemies?.some(enemy => enemy.id === rawId)) return rawId;

        const playerAtCell = players.find(playerId => {
            const pos = characterPositions[playerId];
            return pos?.row === row && pos?.col === col;
        });

        if (playerAtCell) return playerAtCell;

        const byCharacterName = getPlayerIdByCharacterName(rawId);
        if (byCharacterName) return byCharacterName;

        return rawId;
    };

    const getResolvedUnitsAtCell = (row, col) => {
        const rawUnits = Object.entries(characterPositions)
            .filter(([, pos]) => pos.row === row && pos.col === col)
            .map(([id]) => id);

        const resolved = rawUnits.map(id => resolveUnitIdFromCell(id, row, col));
        return [...new Set(resolved)];
    };

    const getEnemySpawnDepth = (enemy) => {
        const behavior = enemy.behavior || 'aggressive';
        const role = enemy.role || 'DPS';

        if (role === 'Support') return 0;
        if (behavior === 'defensive') return 0;
        if (behavior === 'aggressive') return 1;
        if (behavior === 'intelligent') return 1;
        return 1;
    };

    const generateSpreadColumns = (count, totalCols = 10) => {
        if (count <= 0) return [];
        const preferredMiddle = [4, 5, 6].filter(col => col >= 0 && col < totalCols);
        const center = (totalCols - 1) / 2;

        const remainingColumns = Array.from({ length: totalCols }, (_, col) => col)
            .filter(col => !preferredMiddle.includes(col))
            .sort((firstCol, secondCol) => {
                const firstDistance = Math.abs(firstCol - center);
                const secondDistance = Math.abs(secondCol - center);

                if (firstDistance !== secondDistance) {
                    return firstDistance - secondDistance;
                }

                return firstCol - secondCol;
            });

        return [...preferredMiddle, ...remainingColumns].slice(0, count);
    };

    const generateEnemyFallbackPositions = (enemyList = []) => {
        const sortedEnemies = [...enemyList].sort((firstEnemy, secondEnemy) =>
            getEnemySpawnDepth(secondEnemy) - getEnemySpawnDepth(firstEnemy)
        );

        const columns = generateSpreadColumns(sortedEnemies.length, 10);
        const positions = {};
        const usedCells = new Set();

        const findOpenCell = (preferredRow, preferredCol) => {
            const withinBounds = (row, col) => row >= 0 && row < 7 && col >= 0 && col < 10;
            const isOpen = (row, col) => {
                if (isSewerSpawnBlockedTile(currentSceneKey, row, col)) return false;
                return !usedCells.has(`${row},${col}`);
            };

            if (withinBounds(preferredRow, preferredCol) && isOpen(preferredRow, preferredCol)) {
                return { row: preferredRow, col: preferredCol };
            }

            for (let radius = 1; radius <= 10; radius++) {
                for (let rowOffset = -radius; rowOffset <= radius; rowOffset++) {
                    const colOffset = radius - Math.abs(rowOffset);
                    const candidates = [
                        { row: preferredRow + rowOffset, col: preferredCol + colOffset },
                        { row: preferredRow + rowOffset, col: preferredCol - colOffset }
                    ];

                    for (const candidate of candidates) {
                        if (!withinBounds(candidate.row, candidate.col)) continue;
                        if (isOpen(candidate.row, candidate.col)) {
                            return candidate;
                        }
                    }
                }
            }

            for (let row = 0; row < 7; row++) {
                for (let col = 0; col < 10; col++) {
                    if (isOpen(row, col)) {
                        return { row, col };
                    }
                }
            }

            return { row: preferredRow, col: preferredCol };
        };

        sortedEnemies.forEach((enemy, index) => {
            const preferredRow = getEnemySpawnDepth(enemy);
            const preferredCol = columns[index] ?? 0;
            const spawnCell = findOpenCell(preferredRow, preferredCol);

            positions[enemy.id] = spawnCell;
            usedCells.add(`${spawnCell.row},${spawnCell.col}`);
        });

        return positions;
    };

    const createEnemyInstance = (enemyTemplate, instanceNumber, partySize, partyLevel = 1) => {
        const resistanceMultiplier = partySize / 3;
        const normalizedEnemyLevel = Math.max(1, partyLevel || 1);
        const levelBonus = (normalizedEnemyLevel - 1) * 3;

        const scaledStats = {
            health: (enemyTemplate.stats.health || 0) + levelBonus,
            maxHealth: (enemyTemplate.stats.maxHealth || enemyTemplate.stats.health || 0) + levelBonus,
            speed: (enemyTemplate.stats.speed || 0) + levelBonus,
            resistance: (enemyTemplate.stats.resistance || 0) + levelBonus,
            strength: (enemyTemplate.stats.strength || 0) + levelBonus,
            ta: (enemyTemplate.stats.ta || 0) + levelBonus
        };

        const enemyInstance = {
            ...enemyTemplate,
            level: normalizedEnemyLevel,
            stats: {
                ...scaledStats,
                health: scaledStats.maxHealth,
                resistance: scaledStats.resistance * resistanceMultiplier
            },
            weapon: { ...enemyTemplate.weapon },
            id: `${enemyTemplate.id}_${instanceNumber + 1}`
        };

        // Assign abilities based on enemy level and behavior
        enemyInstance.abilities = assignEnemyAbilities(enemyInstance);
        
        // Initialize cooldowns for enemy abilities
        enemyInstance.cooldowns = {};
        if (enemyInstance.abilities && Array.isArray(enemyInstance.abilities)) {
            enemyInstance.abilities.forEach(ability => {
                enemyInstance.cooldowns[ability.id] = 0;
            });
        }
        
        console.log(`[ENEMY CREATION] ${enemyInstance.name} created with abilities:`, enemyInstance.abilities);
        console.log(`[ENEMY CREATION] Initialized cooldowns:`, enemyInstance.cooldowns);

        return enemyInstance;
    };

    const getPartyLevel = () => {
        const levels = players
            .map(player => playerCharacters[player]?.level)
            .filter(level => Number.isFinite(level) && level > 0);

        if (levels.length === 0) return 1;
        return Math.max(...levels);
    };

    const selectEnemiesByTier = (tier, count, partySize, partyLevel) => {
        const getEnemyFaction = (enemy) => {
            const enemyId = (enemy?.id || '').toLowerCase();

            const isEnforcer =
                enemyId.startsWith('enforcer_') ||
                enemyId.startsWith('division_') ||
                enemyId.startsWith('vanguard_');

            if (isEnforcer) return 'enforcers';

            const isRebel =
                enemyId.startsWith('rebel_') ||
                enemyId === 'field_captain' ||
                enemyId.startsWith('operations_') ||
                enemyId.startsWith('rebellion_');

            if (isRebel) return 'rebels';
            return null;
        };

        const opposingFaction =
            selectedFaction === 'enforcers'
                ? 'rebels'
                : selectedFaction === 'rebels'
                    ? 'enforcers'
                    : null;

        let tierEnemies = EnemiesData.enemies.filter(enemy => enemy.tier === tier);

        if (opposingFaction) {
            const factionTierEnemies = tierEnemies.filter(enemy => getEnemyFaction(enemy) === opposingFaction);
            if (factionTierEnemies.length > 0) {
                tierEnemies = factionTierEnemies;
            }
        }

        if (tierEnemies.length === 0) return [];

        const selectedEnemies = [];
        for (let index = 0; index < count; index++) {
            const randomIndex = Math.floor(Math.random() * tierEnemies.length);
            selectedEnemies.push(createEnemyInstance(tierEnemies[randomIndex], index, partySize, partyLevel));
        }

        return selectedEnemies;
    };

    const generateEnemies = (spawnType = 'low') => {
        const partySize = players.length;
        const partyLevel = getPartyLevel();

        if (spawnType === 'medium') {
            const mediumCount = partySize <= 4 ? 2 : 3;
            const mediumEnemies = selectEnemiesByTier('mid-tier', mediumCount, partySize, partyLevel);
            return mediumEnemies.length > 0 ? mediumEnemies : selectEnemiesByTier('generic', mediumCount, partySize, partyLevel);
        }

        if (spawnType === 'boss') {
            const bossEnemies = selectEnemiesByTier('boss', 1, partySize, partyLevel);
            if (bossEnemies.length > 0) return bossEnemies;

            const fallbackCount = partySize <= 4 ? 2: 3;
            const mediumEnemies = selectEnemiesByTier('mid-tier', fallbackCount, partySize, partyLevel);
            return mediumEnemies.length > 0 ? mediumEnemies : selectEnemiesByTier('generic', fallbackCount, partySize, partyLevel);
        }

        // Default: low spawn
        const lowCount = partySize + 2;
        const genericEnemies = selectEnemiesByTier('generic', lowCount, partySize, partyLevel);
        return genericEnemies;
    };

    // Initialize player positions with role-based rows
    useEffect(() => {
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
                    return;
                }
            } catch (error) {
                console.error('[POSITION RESTORE] Failed to parse stored player positions:', error);
            }
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
    }, [players, room, characterPositions, playerCharacters]);

    useEffect(() => {
        if (enemies && enemies.length > 0) {
            // Check if server provided positions
            const storedPositions = sessionStorage.getItem(`enemyPositions_${room}`);
            
            if (storedPositions) {
                // Use server-provided positions
                const serverPositions = JSON.parse(storedPositions);
                const enemyPositions = {};
                
                enemies.forEach((enemy) => {
                    // Only set position if enemy doesn't already have one
                    if (!characterPositions[enemy.id] && serverPositions[enemy.id]) {
                        enemyPositions[enemy.id] = serverPositions[enemy.id];
                    }
                });
                
                if (Object.keys(enemyPositions).length > 0) {
                    setCharacterPositions(prev => ({ ...prev, ...enemyPositions }));
                }
            } else {
                // Fallback to client-side generation (shouldn't happen in multiplayer)
                const generatedPositions = generateEnemyFallbackPositions(enemies);
                const enemyPositions = {};

                enemies.forEach((enemy) => {
                    if (!characterPositions[enemy.id] && generatedPositions[enemy.id]) {
                        enemyPositions[enemy.id] = generatedPositions[enemy.id];
                    }
                });

                if (Object.keys(enemyPositions).length > 0) {
                    setCharacterPositions(prev => ({ ...prev, ...enemyPositions }));
                }
            }
        }
    }, [enemies]);

    useEffect(() => {
        setCharacterPositions(prev => {
            const enemyIds = new Set((enemies || []).map(enemy => enemy.id));
            const validPlayerIds = new Set(players);
            const nextPositions = { ...prev };

            Object.keys(nextPositions).forEach(id => {
                const isTrackedPlayer = validPlayerIds.has(id);
                const isTrackedEnemy = enemyIds.has(id);

                if (!isTrackedPlayer && !isTrackedEnemy) {
                    delete nextPositions[id];
                }
            });

            return nextPositions;
        });
    }, [enemies, players]);

    // Helper function to calculate path between two positions
    const calculatePath = (start, end) => {
        const path = [];
        let current = { ...start };
        
        // Move row-wise first, then column-wise
        while (current.row !== end.row) {
            current = { ...current, row: current.row + (end.row > current.row ? 1 : -1) };
            path.push({ ...current });
        }
        
        while (current.col !== end.col) {
            current = { ...current, col: current.col + (end.col > current.col ? 1 : -1) };
            path.push({ ...current });
        }
        
        return path;
    };

    const findShortestWalkablePath = (start, end, allPositions, movingCharacterId) => {
        const ROWS = 7;
        const COLS = 10;

        if (!start || !end) return null;
        if (start.row === end.row && start.col === end.col) return [];

        const occupied = new Set(
            Object.entries(allPositions)
                .filter(([id]) => id !== movingCharacterId)
                .map(([, pos]) => `${pos.row},${pos.col}`)
        );

        const barrierCells = new Set(
            (activeEffects || [])
                .filter(effect => effect.type === 'blue_barrier' && effect.turnsRemaining > 0 && effect.cell)
                .map(effect => `${effect.cell.row},${effect.cell.col}`)
        );

        const endKey = `${end.row},${end.col}`;
        if (occupied.has(endKey) || barrierCells.has(endKey)) return null;

        const startKey = `${start.row},${start.col}`;
        const queue = [{ row: start.row, col: start.col, path: [] }];
        const visited = new Set([startKey]);
        const directions = [
            { row: 1, col: 0 },
            { row: -1, col: 0 },
            { row: 0, col: 1 },
            { row: 0, col: -1 }
        ];

        while (queue.length > 0) {
            const current = queue.shift();

            for (const direction of directions) {
                const nextRow = current.row + direction.row;
                const nextCol = current.col + direction.col;

                if (nextRow < 0 || nextRow >= ROWS || nextCol < 0 || nextCol >= COLS) continue;

                const nextKey = `${nextRow},${nextCol}`;
                if (visited.has(nextKey) || occupied.has(nextKey) || barrierCells.has(nextKey)) continue;

                const nextPath = [...current.path, { row: nextRow, col: nextCol }];
                if (nextRow === end.row && nextCol === end.col) {
                    return nextPath;
                }

                visited.add(nextKey);
                queue.push({ row: nextRow, col: nextCol, path: nextPath });
            }
        }

        return null;
    };

    // Listen for enemy turn execution
    useEffect(() => {
        const handleExecuteEnemyTurn = ({ enemyId, allies, alliedEnemies }) => {
            const latestEnemies = enemiesRef.current;
            const latestPlayerCharacters = playerCharactersRef.current;
            const latestActiveEffects = activeEffectsRef.current;

            // Check if game is over - don't execute enemy turns
            if (gameOverRef.current) {
                console.log('[ENEMY TURN] Game is over, skipping enemy turn');
                return;
            }
            
            console.log('EXECUTE_ENEMY_TURN EVENT RECEIVED');
            console.log('Enemy ID:', enemyId);
            console.log('Player Name:', playerName);
            console.log('Allies list:', allies);
            
            // Only the first player in the allies list handles enemy turns
            if (allies[0] !== playerName) {
                console.log('[ENEMY TURN] Not the designated handler, skipping');
                return;
            }
            
            console.log('[ENEMY TURN] This player will handle the enemy turn');
            console.log('Allied Enemies:', alliedEnemies);
            
            const enemy = latestEnemies.find(e => e.id === enemyId && !isEnemyDeadBody(e));
            if (!enemy) {
                console.error('Enemy not found:', enemyId);
                console.log('Available enemies:', latestEnemies.map(e => e.id));
                return;
            }

            console.log(`\nExecuting AI turn for: ${enemy.name}`);

            const turnAction = executeEnemyTurn(
                enemy,
                allies,
                alliedEnemies,
                latestEnemies,
                latestPlayerCharacters,
                characterPositions,
                latestActiveEffects,
                currentSceneKey
            );
            let abilityUsedSuccessfully = false;

            console.log('Turn Action:', turnAction);

            // Handle enemy ability usage - execute the ability if one is selected
            if (turnAction.abilityToUse && !turnAction.immobilized) {
                console.log(`[ENEMY ABILITY] ${enemy.name} using ability: ${turnAction.abilityToUse.name}`);

                const enemyAbilityTargets = Object.entries(latestPlayerCharacters).map(([id, character]) => ({
                    ...character,
                    id
                }));
                const enemyAllyCharacters = latestEnemies
                    .filter(aliveEnemy => !isEnemyDeadBody(aliveEnemy))
                    .reduce((accumulator, aliveEnemy) => {
                        accumulator[aliveEnemy.id] = aliveEnemy;
                        return accumulator;
                    }, {});
                const enemyAbilityDef = getAbility(turnAction.abilityToUse.id);
                const enemyTargetPosition = turnAction.target ? characterPositions[turnAction.target] : null;

                const enemyAbilityParams = {
                    caster: enemy,
                    playerName: enemy.id,
                    target: turnAction.target,
                    enemies: enemyAbilityTargets,
                    playerCharacters: enemyAllyCharacters,
                    characterPositions,
                    cooldowns: enemy.cooldowns
                };

                if (enemyAbilityDef?.targetType === 'ground-target') {
                    enemyAbilityParams.targetPosition = enemyTargetPosition;
                }

                if (enemyAbilityDef?.targetType === 'multi-enemy' && turnAction.target) {
                    enemyAbilityParams.targets = [turnAction.target];
                }
                
                let abilityResult;
                if (enemyAbilityDef?.targetType === 'ground-target' && !enemyTargetPosition) {
                    console.warn(`[ENEMY ABILITY] ${enemy.name} cannot use ${turnAction.abilityToUse.name}: missing targetPosition for target ${turnAction.target}`);
                    abilityResult = { success: false, message: 'Missing target position for ground-target ability' };
                } else {
                    abilityResult = executeAbility(turnAction.abilityToUse.id, enemyAbilityParams);
                }
                
                if (abilityResult.success) {
                    abilityUsedSuccessfully = true;
                    console.log(`[ENEMY ABILITY] ${enemy.name} successfully used ${turnAction.abilityToUse.name}! Effects:`, abilityResult.effects);
                    console.log(`[ENEMY ABILITY] New cooldown for ${turnAction.abilityToUse.name}: ${abilityResult.newCooldown}`);
                    console.log(`[ENEMY ABILITY] Message from ability result: ${abilityResult.message || '(no message returned)'}`);
                    
                    // Apply ability effects
                    const updates = applyAbilityEffects(abilityResult, {
                        enemies: latestEnemies,
                        playerCharacters: latestPlayerCharacters,
                        activeEffects: latestActiveEffects,
                        effectOwnerTurnId: enemy.id
                    });
                    
                    // Handle special effects for enemy abilities (cooldown_increase, etc)
                    let finalUpdatedEnemies = updates.enemies;
                    if (abilityResult.effects) {
                        abilityResult.effects.forEach(effect => {
                            if (effect.type === 'cooldown_increase') {
                                // Increase cooldowns for target enemy
                                console.log(`[ENEMY ABILITY] Effect: cooldown_increase for ${effect.target} by ${effect.value}`);
                                finalUpdatedEnemies = finalUpdatedEnemies.map(e => {
                                    if (e.id === effect.target && e.cooldowns) {
                                        const newCooldowns = { ...e.cooldowns };
                                        Object.keys(newCooldowns).forEach(abilityId => {
                                            if (newCooldowns[abilityId] >= 0) {
                                                newCooldowns[abilityId] += effect.value;
                                                console.log(`  - ${e.name} ${abilityId}: increased by ${effect.value} to ${newCooldowns[abilityId]}`);
                                            }
                                        });
                                        return { ...e, cooldowns: newCooldowns };
                                    }
                                    return e;
                                });
                            }
                        });
                    }
                    
                    // Set cooldown for the ability using the value returned from executeAbility
                    const updatedEnemies2 = finalUpdatedEnemies.map(e => {
                        if (e.id === enemy.id) {
                            const newCooldowns = { ...e.cooldowns };
                            newCooldowns[turnAction.abilityToUse.id] = abilityResult.newCooldown;
                            console.log(`[ENEMY ABILITY] Set ${enemy.name}'s ${turnAction.abilityToUse.name} cooldown to ${abilityResult.newCooldown}`);
                            return {
                                ...e,
                                cooldowns: newCooldowns,
                                usedAbilityLastTurn: true
                            };
                        }
                        return e;
                    });
                    
                    // Update state
                    setActiveEffects(updates.activeEffects);
                    setPlayerCharacters(updates.playerCharacters);
                    setEnemies(normalizeEnemiesState(updatedEnemies2));
                    
                    // Emit ability usage to server
                    socket.emit('ability_used', {
                        room,
                        actor: enemy.name,
                        ability: turnAction.abilityToUse.name,
                        target: turnAction.target,
                        effects: abilityResult.effects
                    });
                    
                    emitAiEvent(
                        'turn_action',
                        abilityResult.message || `${enemy.name} uses ${turnAction.abilityToUse.name}!`,
                        {
                            actor: enemy.name,
                            actionType: 'enemy_ability',
                            ability: turnAction.abilityToUse.name,
                            target: turnAction.target
                        }
                    );
                } else {
                    console.log(`[ENEMY ABILITY] ${enemy.name} failed to use ${turnAction.abilityToUse.name}:`, abilityResult.message);
                }
            }

            let movementDelay = 0;
            let enemyFinalPositionForTurn = null;
            if (turnAction.movement) {
                const startPos = characterPositions[enemyId];
                const endPos = { row: turnAction.movement.row, col: turnAction.movement.col };
                enemyFinalPositionForTurn = endPos;
                const path = findShortestWalkablePath(startPos, endPos, characterPositions, enemyId) || calculatePath(startPos, endPos);
                const stepDelay = 10000 / enemy.stats.speed;
                movementDelay = path.length * stepDelay;
                
                // Emit the path for animation
                socket.emit('enemy_moved', {
                    room,
                    enemyId,
                    path: path,
                    stepDelay: stepDelay
                });

                if (!turnAction.target) {
                    setTimeout(() => {
                        emitAiEvent(
                            'turn_action',
                            `${enemy.name} advances across the grid, scanning for a target.`,
                            { actor: enemy.name, actionType: 'enemy_move', to: endPos }
                        );
                    }, movementDelay);
                }
            }

            // Apply damage after movement delay
            if (turnAction.target && !turnAction.abilityToUse) {
                setTimeout(() => {
                    const target = playerCharacters[turnAction.target];
                if (target) {
                    const hasImmunity = hasDamageImmunity(activeEffects, turnAction.target);
                    const hasReflection = hasDamageReflection(activeEffects, turnAction.target);
                    let damageAmount = Math.max(1, (enemy.stats.strength / 10) * enemy.weapon.damage - (target.stats.resistance / 10));
                    damageAmount = applyDamageKeywords(damageAmount, activeEffects, turnAction.target, { minimumDamage: 0 });
                    console.log(`[WEAPON ATTACK] ${enemy.name} attacks ${turnAction.target} for ${damageAmount.toFixed(1)} damage!`);
                    if (hasImmunity) {
                        console.log('[DAMAGE KEYWORD] damage_immunity negated incoming damage for', turnAction.target);
                    }

                    // Handle damage reflection
                    if (hasReflection && damageAmount > 0) {
                        console.log(`[DAMAGE REFLECTION] ${turnAction.target} reflects ${damageAmount.toFixed(1)} damage back to ${enemy.name}!`);
                        
                        emitAiEvent(
                            'turn_action',
                            `${enemy.name} attacks ${turnAction.target}, but the damage is reflected back! ${enemy.name} takes ${damageAmount.toFixed(1)} damage.`,
                            {
                                actor: enemy.name,
                                target: turnAction.target,
                                damage: Number(damageAmount.toFixed(1)),
                                actionType: 'enemy_attack_reflected'
                            }
                        );

                        // Apply reflected damage to the attacking enemy
                        const enemyIndex = enemies.findIndex(e => e.id === enemy.id);
                        if (enemyIndex !== -1) {
                            const newEnemyHealth = enemies[enemyIndex].stats.health - damageAmount;
                            const updatedEnemies = normalizeEnemiesState(
                                enemies.map((e, idx) => 
                                    idx === enemyIndex ? { ...e, stats: { ...e.stats, health: Math.max(0, newEnemyHealth) } } : e
                                )
                            );
                            setEnemies(updatedEnemies);

                            // Remove dead enemy from turn order
                            if (newEnemyHealth <= 0) {
                                setTurnOrder(prevOrder => prevOrder.filter(turn => turn.id !== enemy.id));
                            }

                            socket.emit('enemy_damaged', { room, enemyId: enemy.id, damage: damageAmount, newHealth: Math.max(0, newEnemyHealth) });
                        }
                    } else {
                        // Normal damage application to player
                        emitAiEvent(
                            'turn_action',
                            `${enemy.name} closes in and attacks ${turnAction.target} for ${damageAmount.toFixed(1)} damage.`,
                            {
                                actor: enemy.name,
                                target: turnAction.target,
                                damage: Number(damageAmount.toFixed(1)),
                                actionType: 'enemy_attack'
                            }
                        );
                        
                        // Check for health buffs (bonus health) - consume them first
                        const healthBuffs = activeEffects.filter(e => 
                            e.target === turnAction.target && 
                            e.stat === 'health' && 
                            e.type === 'stat_buff' && 
                            e.turnsRemaining > 0
                        );
                        
                        let remainingDamage = damageAmount;
                        const updatedEffects = [...activeEffects];
                        
                        // Consume health buffs first
                        healthBuffs.forEach(buff => {
                            if (remainingDamage > 0) {
                                const buffIndex = updatedEffects.findIndex(e => 
                                    e.target === buff.target && 
                                    e.stat === buff.stat && 
                                    e.type === buff.type &&
                                    e.turnsRemaining === buff.turnsRemaining
                                );
                                if (buffIndex !== -1) {
                                    if (buff.value <= remainingDamage) {
                                        // Buff completely consumed
                                        remainingDamage -= buff.value;
                                        updatedEffects.splice(buffIndex, 1);
                                    } else {
                                        // Buff partially consumed
                                        updatedEffects[buffIndex] = { ...buff, value: buff.value - remainingDamage };
                                        remainingDamage = 0;
                                    }
                                }
                            }
                        });
                        
                        // Remove health buffs that have been completely consumed (value <= 0)
                        const filteredEffects = updatedEffects.filter(effect => {
                            if (effect.stat === 'health' && effect.type === 'stat_buff') {
                                return effect.value > 0;
                            }
                            return true;
                        });
                        
                        setActiveEffects(filteredEffects);
                        
                        // Apply remaining damage to base health
                        const newHealth = target.stats.health - remainingDamage;
                        const updatedPlayerCharacters = {
                            ...playerCharacters,
                            [turnAction.target]: {
                                ...target,
                                stats: { ...target.stats, health: Math.max(0, newHealth) }
                            }
                        };
                        setPlayerCharacters(updatedPlayerCharacters);
                        
                        // Remove dead player from turn order and handle death
                        if (newHealth <= 0) {
                            console.log(`Player ${turnAction.target} has died! Removing from turn order.`);
                            setTurnOrder(prevOrder => prevOrder.filter(turn => turn.id !== turnAction.target));
                            
                            // Check if all players are dead
                            const remainingPlayers = players.filter(p => p !== turnAction.target);
                            const allPlayersDeadCheck = remainingPlayers.every(p => 
                                updatedPlayerCharacters[p]?.stats.health <= 0
                            );
                            
                            if (allPlayersDeadCheck) {
                            console.log('All players defeated! Game Over.');
                            setGameOver(true);
                        } else {
                            // Only show "You Died" screen if this is the current player and not all players are dead
                            if (turnAction.target === playerName) {
                                setShowYouDiedScreen(true);
                                setTimeout(() => {
                                    setShowYouDiedScreen(false);
                                }, 2500); // Show for 2.5 seconds
                            }
                        }
                    }
                    
                    // Emit to server to sync player health and active effects
                    socket.emit('player_damaged', { 
                        room, 
                        playerName: turnAction.target, 
                        damage: damageAmount, 
                        newHealth: Math.max(0, newHealth),
                        bonusHealthConsumed: damageAmount - remainingDamage,
                        updatedActiveEffects: filteredEffects
                    });
                    
                    console.log(`${turnAction.target} health: ${target.stats.health} → ${Math.max(0, newHealth)} (${damageAmount - remainingDamage} absorbed by bonus health)`);
                    }

                    }
                }, movementDelay); // Apply attack after movement completes
            }

            // Delay before completing turn (movement + attack + visual feedback)
            const totalDelay = movementDelay + (turnAction.target ? 500 : 0) + 1000;
            const turnCycleAtSchedule = currentTurnCycleRef.current;
            const completionKey = `${enemyId}:${turnCycleAtSchedule}`;
            setTimeout(() => {
                const liveTurn = currentTurnRef.current;
                if (!liveTurn || liveTurn.type !== 'enemy' || liveTurn.id !== enemyId) {
                    console.log('[ENEMY TURN] Skipping stale completion callback:', {
                        enemyId,
                        liveTurn
                    });
                    return;
                }

                if (completedEnemyTurnCyclesRef.current.has(completionKey)) {
                    console.log('[ENEMY TURN] Skipping duplicate completion for turn cycle:', {
                        enemyId,
                        turnCycleAtSchedule,
                        completionKey
                    });
                    return;
                }

                completedEnemyTurnCyclesRef.current.add(completionKey);

                console.log('[ENEMY TURN] Completing turn for', enemyId);
                
                // Tick down cooldowns for ALL enemies
                console.log('[ENEMY COOLDOWNS] Ticking down cooldowns for all enemies');
                const latestEnemies = enemiesRef.current;
                const updatedEnemies = latestEnemies.map(e => {
                    const newCooldowns = { ...e.cooldowns };
                    Object.keys(newCooldowns).forEach(abilityId => {
                        if (newCooldowns[abilityId] > 0) {
                            newCooldowns[abilityId]--;
                            console.log(`[ENEMY COOLDOWNS]   - ${e.name} ${abilityId}: ${newCooldowns[abilityId]}`);
                        }
                    });
                    return {
                        ...e,
                        cooldowns: newCooldowns,
                        usedAbilityLastTurn: e.id === enemyId ? abilityUsedSuccessfully : (e.usedAbilityLastTurn || false)
                    };
                });

                const tickResult = tickActiveEffects(
                    activeEffectsRef.current,
                    playerCharactersRef.current,
                    updatedEnemies,
                    enemyId
                );
                
                setActiveEffects(tickResult.updatedEffects);
                setPlayerCharacters(tickResult.updatedCharacters);
                setEnemies(normalizeEnemiesState(tickResult.updatedEnemies));
                socket.emit('enemy_turn_complete', {
                    room,
                    enemyId,
                    updatedEnemies: tickResult.updatedEnemies,
                    updatedPlayerCharacters: tickResult.updatedCharacters,
                    updatedActiveEffects: tickResult.updatedEffects,
                    enemyFinalPosition: enemyFinalPositionForTurn
                });
            }, totalDelay);
        };

        const handleEnemiesUpdated = ({ enemies: updatedEnemies }) => {
            console.log('Enemies updated:', updatedEnemies);
            if (updatedEnemies && Array.isArray(updatedEnemies)) {
                setEnemies(normalizeEnemiesState(updatedEnemies));
            } else {
                console.error('[ENEMIES UPDATED] Received invalid enemies data:', updatedEnemies);
            }
        };

        const handleCharactersUpdated = (updatedCharacters) => {
            console.log('[CHARACTERS UPDATED] Received from server:', updatedCharacters);
            if (!updatedCharacters) return;
            setPlayerCharacters(prevChars => {
                const normalizedUpdates = Object.fromEntries(
                    Object.entries(updatedCharacters).map(([name, character]) => {
                        const prevCharacter = prevChars[name] || {};
                        const incomingAbilities = character?.abilities;
                        const previousAbilities = prevCharacter?.abilities;
                        const shouldPreservePreviousAbilities =
                            Array.isArray(incomingAbilities) &&
                            incomingAbilities.length === 0 &&
                            Array.isArray(previousAbilities) &&
                            previousAbilities.length > 0;

                        const incomingUltimate = character?.ultimate;
                        const hasValidIncomingUltimate =
                            (typeof incomingUltimate === 'string' && incomingUltimate.trim().length > 0) ||
                            (incomingUltimate && typeof incomingUltimate === 'object' && !!incomingUltimate.id);

                        const mergedCharacter = {
                            ...prevCharacter,
                            ...character,
                            abilities: shouldPreservePreviousAbilities
                                ? previousAbilities
                                : (Array.isArray(incomingAbilities) ? incomingAbilities : previousAbilities),
                            ultimate: hasValidIncomingUltimate ? incomingUltimate : prevCharacter?.ultimate
                        };
                        console.log('[ABILITY DEBUG] Merged character result:', {
                            player: name,
                            mergedAbilitiesType: Array.isArray(mergedCharacter?.abilities) ? 'array' : typeof mergedCharacter?.abilities,
                            mergedAbilitiesLength: Array.isArray(mergedCharacter?.abilities) ? mergedCharacter.abilities.length : null,
                            mergedAbilitiesPreview: Array.isArray(mergedCharacter?.abilities)
                                ? mergedCharacter.abilities.map(ability => (typeof ability === 'string' ? ability : ability?.id || ability?.name || 'invalid'))
                                : mergedCharacter?.abilities,
                            mergedUltimatePreview: typeof mergedCharacter?.ultimate === 'string'
                                ? mergedCharacter.ultimate
                                : mergedCharacter?.ultimate?.id || mergedCharacter?.ultimate?.name || null
                        });
                        return [name, enrichCharacterAbilities(mergedCharacter)];
                    })
                );

                return {
                    ...prevChars,
                    ...normalizedUpdates
                };
            });
        };

        const handleActiveEffectsUpdated = (updatedEffects) => {
            console.log('[ACTIVE EFFECTS UPDATED] Received from server:', updatedEffects);
            setActiveEffects(updatedEffects);
        };

        const handleEnemyMoved = ({ enemyId, path, stepDelay }) => {
            if (!path || path.length === 0) return;

            setActiveEffects(prevEffects => prevEffects.filter(effect => {
                if (effect.type === 'gtg_target_marker' && effect.target === enemyId) {
                    return false;
                }

                if (effect.type === 'gtg_origin_marker' && (effect.target === enemyId || !effect.target)) {
                    return false;
                }

                return true;
            }));

            const startingPosition = characterPositions[enemyId] || null;
            const finalPosition = path[path.length - 1] || null;

            console.log('[TELEPORT DEBUG] Enemy movement received:', {
                enemyId,
                from: startingPosition,
                to: finalPosition,
                path,
                stepDelay
            });

            console.log('[BLACK HOLE TELEPORT] Before enemy_moved apply:', {
                enemyId,
                from: startingPosition,
                path,
                to: finalPosition
            });
            
            // Animate through each step in the path
            path.forEach((position, index) => {
                setTimeout(() => {
                    setCharacterPositions(prev => ({
                        ...prev,
                        [enemyId]: position
                    }));
                }, stepDelay * index);
            });
            
            // After movement animation completes, check blizzard field effects
            setTimeout(() => {
                const { updatedEffects, updatedEnemies } = updateBlizzardFieldEffects(
                    activeEffects,
                    enemies,
                    characterPositions
                );
                
                if (updatedEffects.length !== activeEffects.length || 
                    updatedEnemies.some((e, i) => e.stats.speed !== enemies[i]?.stats.speed)) {
                    setActiveEffects(updatedEffects);
                    setEnemies(normalizeEnemiesState(updatedEnemies));
                    socket.emit('active_effects_updated', { room, effects: updatedEffects });
                    socket.emit('enemies_updated', { room, enemies: updatedEnemies });
                }

                console.log('[BLACK HOLE TELEPORT] After enemy_moved apply:', {
                    enemyId,
                    from: startingPosition,
                    to: finalPosition
                });
            }, stepDelay * path.length + 50); // Small delay after final position update
        };

        const handlePlayerMoved = ({ playerName: movedPlayer, position }) => {
            const canonicalPlayerId = getCanonicalUnitId(movedPlayer);
            const beforePosition =
                characterPositions[canonicalPlayerId] ||
                (movedPlayer !== canonicalPlayerId ? characterPositions[movedPlayer] : null) ||
                null;
            console.log('[PLAYER MOVED] Received:', movedPlayer, 'canonical:', canonicalPlayerId, 'to', position);
            console.log('[TELEPORT DEBUG] Player movement received:', {
                incomingId: movedPlayer,
                canonicalId: canonicalPlayerId,
                from: beforePosition,
                to: position
            });

            setActiveEffects(prevEffects => prevEffects.filter(effect => {
                if (effect.type === 'gtg_target_marker' && (effect.target === movedPlayer || effect.target === canonicalPlayerId)) {
                    return false;
                }

                if (effect.type === 'gtg_origin_marker' && (effect.target === movedPlayer || effect.target === canonicalPlayerId || !effect.target)) {
                    return false;
                }

                return true;
            }));

            setCharacterPositions(prev => {
                const updated = {
                    ...prev,
                    [canonicalPlayerId]: position
                };

                if (movedPlayer !== canonicalPlayerId && updated[movedPlayer]) {
                    delete updated[movedPlayer];
                }

                return updated;
            });

            const storedPlayerPositions = sessionStorage.getItem(`playerPositions_${room}`);
            const parsedPlayerPositions = storedPlayerPositions ? JSON.parse(storedPlayerPositions) : {};
            parsedPlayerPositions[canonicalPlayerId] = position;
            sessionStorage.setItem(`playerPositions_${room}`, JSON.stringify(parsedPlayerPositions));
        };

        const handleCooldownReduced = ({ targetPlayer, value }) => {
            console.log('[COOLDOWN REDUCED] Received for player:', targetPlayer, 'value:', value);
            // Only apply if this is the target player
            if (targetPlayer === playerName) {
                console.log('[COOLDOWN REDUCED] Applying to my cooldowns');
                setCooldowns(prev => {
                    const updated = { ...prev };
                    const myCharacter = playerCharacters[playerName];
                    
                    if (myCharacter) {
                        // Reduce cooldown for each ability
                        myCharacter.abilities.forEach(ability => {
                            if (updated[ability.id] > 0) {
                                const oldValue = updated[ability.id];
                                updated[ability.id] = Math.max(0, updated[ability.id] - value);
                                console.log(`  - ${ability.name}: ${oldValue} → ${updated[ability.id]}`);
                            }
                        });
                        
                        // Also check ultimate
                        if (myCharacter.ultimate && updated[myCharacter.ultimate.id] > 0) {
                            const oldValue = updated[myCharacter.ultimate.id];
                            updated[myCharacter.ultimate.id] = Math.max(0, updated[myCharacter.ultimate.id] - value);
                            console.log(`  - ${myCharacter.ultimate.name} (Ultimate): ${oldValue} → ${updated[myCharacter.ultimate.id]}`);
                        }
                    }
                    
                    return updated;
                });
            }
        };

        const handleCooldownsReset = ({ targetPlayer, excludeAbilityIds = [] }) => {
            console.log('[COOLDOWNS RESET] Received for player:', targetPlayer);
            // Only apply if this is the target player
            if (targetPlayer === playerName) {
                console.log('[COOLDOWNS RESET] Resetting all my cooldowns to 0');
                setCooldowns(prev => {
                    const updated = { ...prev };
                    const myCharacter = playerCharacters[playerName];
                    const excludedAbilities = new Set(excludeAbilityIds || []);
                    
                    if (myCharacter) {
                        // Reset cooldown for each ability
                        myCharacter.abilities.forEach(ability => {
                            if (excludedAbilities.has(ability.id)) {
                                return;
                            }
                            if (updated[ability.id] > 0) {
                                console.log(`  - ${ability.name}: ${updated[ability.id]} → 0`);
                                updated[ability.id] = 0;
                            }
                        });
                        
                        // Also reset ultimate (but it stays at 0 since ultimates don't have cooldowns)
                        if (myCharacter.ultimate && !excludedAbilities.has(myCharacter.ultimate.id) && updated[myCharacter.ultimate.id] > 0) {
                            console.log(`  - ${myCharacter.ultimate.name} (Ultimate): ${updated[myCharacter.ultimate.id]} → 0`);
                            updated[myCharacter.ultimate.id] = 0;
                        }
                    }
                    
                    return updated;
                });
            }
        };

        socket.on("execute_enemy_turn", handleExecuteEnemyTurn);
        socket.on("enemies_updated", handleEnemiesUpdated);
        socket.on("characters_updated", handleCharactersUpdated);
        socket.on("active_effects_updated", handleActiveEffectsUpdated);
        socket.on("enemy_moved", handleEnemyMoved);
        socket.on("player_moved", handlePlayerMoved);
        socket.on("cooldown_reduced", handleCooldownReduced);
        socket.on("cooldowns_reset", handleCooldownsReset);

        return () => {
            socket.off("execute_enemy_turn", handleExecuteEnemyTurn);
            socket.off("enemies_updated", handleEnemiesUpdated);
            socket.off("characters_updated", handleCharactersUpdated);
            socket.off("active_effects_updated", handleActiveEffectsUpdated);
            socket.off("enemy_moved", handleEnemyMoved);
            socket.off("player_moved", handlePlayerMoved);
            socket.off("cooldown_reduced", handleCooldownReduced);
            socket.off("cooldowns_reset", handleCooldownsReset);
        };
    }, [socket, enemies, playerCharacters, setPlayerCharacters, characterPositions, room, turnOrder, setTurnOrder, playerName, activeEffects, setEnemies, isAdmin, setGameOver]);

    const handleGridClick = (row, col) => {
        console.log('[GRID CLICK]', { row, col, isMyTurn, playerName, hasCharacter: !!currentPlayerCharacter });
        
        if (!isMyTurn || !isPlayerAlive) {
            console.log('[GRID CLICK] Blocked - not my turn or player is dead');
            return;
        }
        
        const characterOnCell = Object.entries(characterPositions).find(
            ([, pos]) => pos.row === row && pos.col === col
        );

        // Handle ground-target abilities
        if (selectedAbility) {
            const abilityData = getAbility(selectedAbility);

            if (abilityData?.targetType === 'relocate') {
                if (!pendingRelocateTarget) {
                    const resolvedUnitsOnCell = getResolvedUnitsAtCell(row, col);

                    if (resolvedUnitsOnCell.length === 0) {
                        console.log('[RELOCATE] Select an ally or enemy first');
                        return;
                    }

                    const validTargets = resolvedUnitsOnCell.filter(id => {
                        const isAllyTarget = !!playerCharacters[id];
                        const isEnemyTarget = enemies.some(e => e.id === id && !isEnemyDeadBody(e));
                        return isAllyTarget || isEnemyTarget;
                    });

                    if (validTargets.length === 0) {
                        console.log('[RELOCATE] Invalid target selected');
                        return;
                    }

                    const targetId = validTargets.find(id => id !== playerName) || validTargets[0];
                    const allyTarget = !!playerCharacters[targetId];
                    const enemyTarget = enemies.find(e => e.id === targetId && !isEnemyDeadBody(e));

                    if (!allyTarget && !enemyTarget) {
                        console.log('[RELOCATE] Invalid target selected');
                        return;
                    }

                    const currentPos = getCurrentPlayerPosition();
                    const targetPos = characterPositions[targetId];
                    if (currentPos && targetPos && abilityData.range) {
                        const distance = Math.abs(currentPos.row - targetPos.row) + Math.abs(currentPos.col - targetPos.col);
                        if (distance > abilityData.range) {
                            console.log(`[RELOCATE] Target out of range! Distance: ${distance}, Max Range: ${abilityData.range}`);
                            return;
                        }
                    }

                    setPendingRelocateTarget(targetId);
                    console.log('[RELOCATE] Target selected. Click an empty destination tile.');
                    return;
                }

                const pendingTargetCanonicalId = getCanonicalUnitId(pendingRelocateTarget);

                const isOccupied = Object.entries(characterPositions).some(
                    ([id, pos]) => getCanonicalUnitId(id) !== pendingTargetCanonicalId && pos.row === row && pos.col === col
                );

                if (isOccupied) {
                    console.log('[RELOCATE] Destination must be empty');
                    return;
                }

                executeRelocateAbility(selectedAbility, pendingRelocateTarget, { row, col });
                return;
            }
            
            if (abilityData?.targetType === 'ground-target') {
                console.log('[GROUND TARGET] Executing ground-target ability at:', { row, col });
                
                // Check range from caster position
                const currentPos = characterPositions[playerName];
                if (currentPos && abilityData.range) {
                    const distance = Math.abs(currentPos.row - row) + Math.abs(currentPos.col - col);
                    
                    if (distance > abilityData.range) {
                        console.log(`[GROUND TARGET] Target out of range! Distance: ${distance}, Max Range: ${abilityData.range}`);
                        setSelectedAbility(null);
                        return;
                    }
                }
                
                // Execute ground-target ability
                executeAbilityOnGroundTarget(selectedAbility, { row, col });
                return;
            }
        }
        
        // Check if clicking on an enemy with weapon selected
        // Handle ability targeting
        if (selectedAbility && characterOnCell) {
            const targetId = characterOnCell[0];
            const abilityData = getAbility(selectedAbility);
            
            console.log('[ABILITY TARGET] Checking target:', {
                targetId,
                abilityId: selectedAbility,
                targetType: abilityData?.targetType,
                characterOnCell
            });
            
            // Check if targeting an ally
            const isAlly = playerCharacters[targetId];
            const enemy = enemies.find(e => e.id === targetId && !isEnemyDeadBody(e));
            
            console.log('[ABILITY TARGET] Target validation:', {
                isAlly: !!isAlly,
                isEnemy: !!enemy,
                allyName: isAlly?.name,
                enemyName: enemy?.name,
                playerCharacterKeys: Object.keys(playerCharacters)
            });
            
            // Handle ally-targeted abilities
            if (abilityData.targetType === 'ally') {
                if (isAlly) {
                    console.log('[ALLY TARGET] Executing ally-targeted ability on:', targetId, isAlly.name);
                    executeAbilityOnTarget(selectedAbility, targetId);
                } else {
                    console.log('[ALLY TARGET] Target is not an ally, cannot use this ability');
                    setSelectedAbility(null);
                }
                return;
            }
            
            // Handle enemy-targeted abilities
            if (enemy) {
                // Check range for abilities with range requirement
                if (abilityData.range) {
                    const currentPos = getCurrentPlayerPosition();
                    const targetPos = characterPositions[getCanonicalUnitId(targetId)];
                    
                    if (currentPos && targetPos) {
                        const distance = Math.abs(currentPos.row - targetPos.row) + Math.abs(currentPos.col - targetPos.col);
                        
                        if (distance > abilityData.range) {
                            console.log(`[ABILITY RANGE] Target out of range! Distance: ${distance}, Max Range: ${abilityData.range}`);
                            setSelectedAbility(null);
                            return;
                        }
                    }
                }
                
                // Check if it's a multi-target ability
                if (abilityData.targetType === 'multi-enemy') {
                    // Add to selected targets
                    if (!selectedTargets.includes(targetId)) {
                        const newTargets = [...selectedTargets, targetId];
                        setSelectedTargets(newTargets);
                        
                        console.log(`Selected target ${enemy.name}. Total: ${newTargets.length}/${abilityData.maxTargets || 2}`);
                        
                        // If we have enough targets, execute
                        if (newTargets.length >= (abilityData.maxTargets || 2)) {
                            executeAbilityMultiTarget(selectedAbility, newTargets);
                        }
                    }
                } else {
                    // Single target ability
                    executeAbilityOnTarget(selectedAbility, targetId);
                }
                return;
            }
        }
        
        if (weaponSelected && characterOnCell) {
            const enemyId = characterOnCell[0];
            const enemy = enemies.find(e => e.id === enemyId && !isEnemyDeadBody(e));
            
            if (enemy && currentPlayerCharacter) {
                // Check weapon range
                const currentPos = getCurrentPlayerPosition();
                const enemyPos = characterPositions[enemyId];
                
                if (!currentPos || !enemyPos) return;
                
                // Calculate distance (Manhattan distance for grid-based movement)
                const distance = Math.abs(currentPos.row - enemyPos.row) + Math.abs(currentPos.col - enemyPos.col);
                const weaponRange = currentPlayerCharacter.weapon.range || 1;
                
                if (distance > weaponRange) {
                    console.log('Target out of range:', {
                        weapon: currentPlayerCharacter.weapon.name,
                        range: weaponRange,
                        distance: distance,
                        message: `Move closer to attack! (Range: ${weaponRange}, Distance: ${distance})`
                    });
                    setWeaponSelected(false);
                    return;
                }
                
                const baseDamage = Math.max(1, (currentPlayerCharacter.stats.strength / 10) * currentPlayerCharacter.weapon.damage - (enemy.stats.resistance / 10));
                const totalMultiplier = getDamageTakenMultiplier(activeEffects, enemyId);
                const damage = applyDamageKeywords(baseDamage, activeEffects, enemyId, { minimumDamage: 1 });
                const newHealth = enemy.stats.health - damage;
                
                console.log('Weapon Attack:', {
                    attacker: currentPlayerCharacter.name,
                    target: enemy.name,
                    weapon: currentPlayerCharacter.weapon.name,
                    range: weaponRange,
                    distance: distance,
                    baseDamage: baseDamage.toFixed(1),
                    multiplier: totalMultiplier.toFixed(2),
                    damage: damage.toFixed(1),
                    newHealth: Math.max(0, newHealth).toFixed(1)
                });

                emitAiEvent(
                    'turn_action',
                    `${currentPlayerCharacter.name} fires ${currentPlayerCharacter.weapon.name} at ${enemy.name}, dealing ${damage.toFixed(1)} damage.`,
                    {
                        actor: currentPlayerCharacter.name,
                        target: enemy.name,
                        weapon: currentPlayerCharacter.weapon.name,
                        damage: Number(damage.toFixed(1)),
                        actionType: 'weapon_attack'
                    }
                );
                
                // Update enemy health
                const updatedEnemies = normalizeEnemiesState(
                    enemies.map(e => 
                        e.id === enemyId ? { ...e, stats: { ...e.stats, health: Math.max(0, newHealth) } } : e
                    )
                );
                
                setEnemies(updatedEnemies);
                
                // Update turn order to remove dead enemy
                if (newHealth <= 0) {
                    const updatedTurnOrder = turnOrder.filter(turn => turn.id !== enemyId);
                    setTurnOrder(updatedTurnOrder);
                }
                
                socket.emit('enemy_damaged', { room, enemyId, damage, newHealth: Math.max(0, newHealth) });
                setWeaponSelected(false);

                if (extraWeaponAttacksRemaining > 0) {
                    const nextRemaining = extraWeaponAttacksRemaining - 1;
                    setExtraWeaponAttacksRemaining(nextRemaining);
                    setActionUsed(nextRemaining <= 0);
                } else {
                    setActionUsed(true);
                }
                
                // Auto-end only if movement is exhausted
                setTimeout(() => {
                    if (isMyTurn && shouldAutoEndTurn()) {
                        handleEndTurn();
                    }
                }, 1500);
                return;
            }
        }
        
        const currentPos = characterPositions[playerName];
        if (!currentPos) return;

        // Calculate max movement based on speed (including buffs from activeEffects)
        const totalSpeed = calculateTotalStat(currentPlayerCharacter, playerName, 'speed', activeEffects);
        const effectiveSpeed = getSewerAdjustedSpeed(currentSceneKey, totalSpeed, currentPos);
        const maxMovement = Math.floor(effectiveSpeed / 10);
        
        console.log('[MOVEMENT CALC]', {
            baseSpeed: currentPlayerCharacter.stats.speed,
            totalSpeed,
            effectiveSpeed,
            maxMovement
        });
        
        const pathToTarget = findShortestWalkablePath(
            currentPos,
            { row, col },
            characterPositions,
            playerName
        );

        // Movement cost is based on actual walkable path length (blocked if null)
        const movementThisStep = pathToTarget ? pathToTarget.length : Infinity;
        
        // Check if we have enough movement remaining
        const movementRemaining = maxMovement - movementUsed;

        const isOccupied = Object.entries(characterPositions).some(
            ([id, pos]) => id !== playerName && pos.row === row && pos.col === col
        );

        if (!pathToTarget) {
            console.log('Movement blocked by occupied cells:', {
                from: currentPos,
                to: { row, col }
            });
            return;
        }

        if (movementThisStep <= movementRemaining && movementThisStep > 0 && !isOccupied) {
            const movementRemainingAfterMove = movementRemaining - movementThisStep;

            console.log('Movement:', {
                character: currentPlayerCharacter.name,
                speed: currentPlayerCharacter.stats.speed,
                maxMovement: maxMovement,
                movementUsed: movementUsed,
                movementThisStep: movementThisStep,
                movementRemaining: movementRemainingAfterMove,
                from: currentPos,
                to: { row, col }
            });
            
            const newPosition = { row, col };
            setCharacterPositions(prev => ({
                ...prev,
                [playerName]: newPosition
            }));
            setMovementUsed(movementUsed + movementThisStep);
            
            // Broadcast player movement to all players
            socket.emit('player_moved', {
                room,
                playerName,
                position: newPosition
            });

            const storedPlayerPositions = sessionStorage.getItem(`playerPositions_${room}`);
            const parsedPlayerPositions = storedPlayerPositions ? JSON.parse(storedPlayerPositions) : {};
            parsedPlayerPositions[playerName] = newPosition;
            sessionStorage.setItem(`playerPositions_${room}`, JSON.stringify(parsedPlayerPositions));

            if (movementRemainingAfterMove <= 0) {
                setTimeout(() => {
                    if (isMyTurn && shouldAutoEndTurn()) {
                        console.log('[AUTO END TURN MOVE] Action used and no movement remaining, ending turn');
                        handleEndTurn();
                    }
                }, 250);
            }
        } else if (movementThisStep > movementRemaining) {
            console.log('Not enough movement remaining:', {
                movementThisStep: movementThisStep,
                movementRemaining: movementRemaining,
                movementUsed: movementUsed,
                maxMovement: maxMovement
            });
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
                console.log(enemyOnCell)
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
                    effect.type === 'stat_buff' &&
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
                        className={`grid-cell ${
                            characterOnCell ? 'occupied' : ''
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
                                                    {enemyOnCell?.stats.health || 0}
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

    function handleStoryComplete(spawnType = 'low') {
        const normalizedSpawnType = ['low', 'medium', 'boss'].includes(spawnType) ? spawnType : 'low';
        const generatedEnemies = generateEnemies(normalizedSpawnType);
        setEnemies(normalizeEnemiesState(generatedEnemies));
        setGamePhase('combat');
        socket.emit('start_combat', { room, generatedEnemies, spawnType: normalizedSpawnType, sceneKey: currentSceneKey });
    }

    function handleCombatComplete(rewards) {
        socket.emit('combat_complete', { room, rewards });    
    }

    const handleAbilityClick = (ability) => {
        console.log('[ABILITY CLICK] Ability clicked:', ability.name, 'ID:', ability.id);
        
        if (!isMyTurn || actionUsed || !isPlayerAlive || aiBusy) {
            console.log('[ABILITY CLICK] Blocked - isMyTurn:', isMyTurn, 'actionUsed:', actionUsed, 'isPlayerAlive:', isPlayerAlive, 'aiBusy:', aiBusy);
            return;
        }
        
        const abilityData = getAbility(ability.id);
        console.log('[ABILITY CLICK] Ability data:', abilityData);
        
        if (!abilityData) {
            console.log('[ABILITY CLICK] No ability data found!');
            return;
        }
        
        // Check cooldown
        if (cooldowns[ability.id] > 0) {
            console.log(`Ability ${ability.name} on cooldown: ${cooldowns[ability.id]} turns remaining`);
            return;
        }
        
        // Handle abilities that don't need target selection
        console.log('[ABILITY CLICK] Target type:', abilityData.targetType);
        if (abilityData.targetType === 'self' || abilityData.targetType === 'all-allies' || abilityData.targetType === 'all-enemies') {
            console.log('[ABILITY CLICK] Executing immediately - no target needed');
            executeAbilityOnTarget(ability.id, null);
        } else {
            // For other abilities, select and wait for target
            setSelectedAbility(ability.id);
            setSelectedTargets([]);
            setPendingRelocateTarget(null);
            setWeaponSelected(false);
            console.log(`Selected ability: ${ability.name}. Click a target.`);
        }
    };

    const executeRelocateAbility = (abilityId, target, targetPosition) => {
        const result = executeAbility(abilityId, {
            caster: currentPlayerCharacter,
            playerName,
            target,
            targetPosition,
            enemies,
            playerCharacters,
            characterPositions,
            cooldowns
        });

        if (!result.success) {
            console.log('Relocate ability failed:', result.message);
            return;
        }

        const updates = applyAbilityEffects(result, {
            enemies,
            playerCharacters,
            activeEffects,
            effectOwnerTurnId: playerName
        });

        setEnemies(normalizeEnemiesState(updates.enemies));
        setPlayerCharacters(updates.playerCharacters);
        setActiveEffects(updates.activeEffects);

        if (result.forcedMovement && result.forcedMovement.length > 0) {
            result.forcedMovement.forEach(({ enemyId, path, to }) => {
                const movementPath = path && path.length > 0 ? path : (to ? [to] : []);
                if (movementPath.length === 0) return;

                const movedUnitId = getCanonicalUnitId(enemyId);
                const destination = movementPath[movementPath.length - 1];
                const isPlayerUnit = !!playerCharacters[movedUnitId];
                const unitType = isPlayerUnit ? 'player' : 'enemy';

                const preTeleportPosition =
                    characterPositions[movedUnitId] ||
                    (enemyId !== movedUnitId ? characterPositions[enemyId] : null) ||
                    null;

                console.log('[TELEPORT DEBUG] Before teleport apply:', {
                    abilityId,
                    unitType,
                    unitId: movedUnitId,
                    incomingId: enemyId,
                    from: preTeleportPosition,
                    to: destination,
                    path: movementPath
                });

                setCharacterPositions(prev => {
                    const latestFrom =
                        prev[movedUnitId] ||
                        (enemyId !== movedUnitId ? prev[enemyId] : null) ||
                        null;

                    const updated = {
                        ...prev,
                        [movedUnitId]: destination
                    };

                    if (enemyId !== movedUnitId && updated[enemyId]) {
                        delete updated[enemyId];
                    }

                    console.log('[TELEPORT DEBUG] After teleport apply:', {
                        abilityId,
                        unitType,
                        unitId: movedUnitId,
                        incomingId: enemyId,
                        from: latestFrom,
                        to: updated[movedUnitId]
                    });

                    return updated;
                });

                if (isPlayerUnit) {
                    socket.emit('player_moved', {
                        room,
                        playerName: movedUnitId,
                        position: destination
                    });
                } else {
                    socket.emit('enemy_moved', {
                        room,
                        enemyId: movedUnitId,
                        path: movementPath,
                        stepDelay: 1
                    });
                }
            });
        }

        if (result.newCooldown) {
            setCooldowns(prev => ({
                ...prev,
                [abilityId]: result.newCooldown
            }));
        }

        socket.emit('ability_used', {
            room,
            playerName,
            abilityId,
            result,
            updatedPlayerCharacters: updates.playerCharacters,
            updatedEnemies: updates.enemies,
            updatedActiveEffects: updates.activeEffects
        });

        setSelectedAbility(null);
        setSelectedTargets([]);
        setPendingRelocateTarget(null);
        setActionUsed(true);

        setTimeout(() => {
            if (isMyTurn && shouldAutoEndTurn()) {
                handleEndTurn();
            }
        }, 300);
    };

    const executeAbilityOnTarget = (abilityId, target) => {
        const abilityData = getAbility(abilityId);
        
        console.log('[EXECUTE ABILITY] Starting execution:', {
            abilityId,
            target,
            targetType: abilityData?.targetType,
            caster: currentPlayerCharacter?.name,
            playerCharacters: Object.keys(playerCharacters)
        });
        
        const result = executeAbility(abilityId, {
            caster: currentPlayerCharacter,
            playerName: playerName,
            target: target,
            targets: target ? [target] : undefined, // For multi-target abilities
            enemies: enemies,
            playerCharacters: playerCharacters,
            characterPositions: characterPositions,
            cooldowns: cooldowns
        });
        
        console.log('[EXECUTE ABILITY] Result:', result);
        
        if (!result.success) {
            console.log('Ability failed:', result.message);
            return;
        }
        
        console.log('✨ Ability executed:', result.message);

        emitAiEvent(
            'turn_action',
            `${currentPlayerCharacter?.name || playerName} uses ${abilityId}: ${result.message}`,
            {
                actor: currentPlayerCharacter?.name || playerName,
                abilityId,
                target,
                actionType: 'ability'
            }
        );
        
        // Apply effects to game state
        const updates = applyAbilityEffects(result, {
            enemies,
            playerCharacters,
            activeEffects,
            effectOwnerTurnId: playerName
        });

        const normalizedEnemies = normalizeEnemiesState(updates.enemies);
        const shouldRemoveDeadBodiesImmediately = abilityId === 'charge';
        const finalEnemies = shouldRemoveDeadBodiesImmediately
            ? normalizedEnemies.filter(enemy => !isEnemyDeadBody(enemy))
            : normalizedEnemies;

        if (shouldRemoveDeadBodiesImmediately) {
            const removedEnemyIds = normalizedEnemies
                .filter(enemy => isEnemyDeadBody(enemy))
                .map(enemy => enemy.id);

            if (removedEnemyIds.length > 0) {
                setTurnOrder(prevOrder => prevOrder.filter(turn => !removedEnemyIds.includes(turn.id)));
            }
        }

        let postEffectEnemies = finalEnemies;

        if (result.forcedMovement && result.forcedMovement.length > 0) {
            result.forcedMovement.forEach(({ enemyId, path, to }) => {
                const movementPath = path && path.length > 0 ? path : (to ? [to] : []);
                if (movementPath.length === 0) return;

                socket.emit('enemy_moved', {
                    room,
                    enemyId,
                    path: movementPath,
                    stepDelay: 1
                });
            });
        }

        console.log('[ABILITY COMPLETE] Updated enemies:', updates.enemies);
        console.log('[ABILITY COMPLETE] Updated playerCharacters:', updates.playerCharacters);
        
        // Check if target was an enemy
        const targetEnemy = updates.enemies.find(e => e.id === target);
        if (targetEnemy) {
            console.log(`[ABILITY COMPLETE] Enemy ${targetEnemy.name} stats:`, targetEnemy.stats);
        }
        
        // Handle cooldown modification effects (cooldown_reduction, cooldown_increase, cooldown_reset)
        if (result.effects) {
            result.effects.forEach(effect => {
                if (effect.type === 'cooldown_reduction') {
                    // Emit cooldown reduction to target player via socket
                    console.log(`[COOLDOWN REDUCTION] Emitting to ${effect.target} to reduce by ${effect.value}`);
                    socket.emit('reduce_cooldown', {
                        room,
                        targetPlayer: effect.target,
                        value: effect.value
                    });
                } else if (effect.type === 'cooldown_reset') {
                    // Reset all cooldowns for target player
                    console.log(`[COOLDOWN RESET] Resetting cooldowns for ${effect.target}`);
                    socket.emit('reset_cooldowns', {
                        room,
                        targetPlayer: effect.target,
                        excludeAbilityIds: effect.excludeAbilityIds || []
                    });
                } else if (effect.type === 'cooldown_increase') {
                    // Increase cooldowns for target enemy
                    console.log(`[COOLDOWN INCREASE] Increasing cooldowns for enemy ${effect.target} by ${effect.value}`);
                    postEffectEnemies = postEffectEnemies.map(enemy => {
                        if (enemy.id !== effect.target || !enemy.cooldowns) {
                            return enemy;
                        }

                        const nextCooldowns = { ...enemy.cooldowns };
                        Object.keys(nextCooldowns).forEach(enemyAbilityId => {
                            if (nextCooldowns[enemyAbilityId] >= 0) {
                                nextCooldowns[enemyAbilityId] += effect.value;
                                console.log(`  - ${enemyAbilityId}: increased by ${effect.value} to ${nextCooldowns[enemyAbilityId]}`);
                            }
                        });

                        return {
                            ...enemy,
                            cooldowns: nextCooldowns
                        };
                    });
                }
            });
        }

        setEnemies(postEffectEnemies);
        setPlayerCharacters(updates.playerCharacters);
        setActiveEffects(updates.activeEffects);
        
        // Update cooldowns
        if (result.newCooldown) {
            console.log(`Setting cooldown for ${abilityId}: ${result.newCooldown} turns`);
            setCooldowns(prev => {
                const updated = {
                    ...prev,
                    [abilityId]: result.newCooldown
                };
                console.log('Updated cooldowns:', updated);
                return updated;
            });
        }
        
        // Emit to server for sync
        socket.emit('ability_used', {
            room,
            playerName,
            abilityId,
            result,
            updatedPlayerCharacters: updates.playerCharacters,
            updatedEnemies: postEffectEnemies,
            updatedActiveEffects: updates.activeEffects
        });
        
        console.log('[ABILITY SYNC] Emitting updated playerCharacters and enemies to server');
        
        setSelectedAbility(null);
        setSelectedTargets([]);

        const noLimitsEffect = result.effects?.find(effect =>
            effect.type === 'extra_weapon_attacks' &&
            effect.target === playerName
        );

        if (noLimitsEffect) {
            setExtraWeaponAttacksRemaining(noLimitsEffect.value || 0);
            setActionUsed(false);
        } else {
            setActionUsed(true);
        }
        
        // Auto-end only if movement is exhausted
        setTimeout(() => {
            if (isMyTurn && shouldAutoEndTurn()) {
                console.log('[AUTO END TURN] Action used and no movement remaining after ability use, ending turn');
                handleEndTurn();
            } else {
                console.log('[AUTO END TURN] Skipped - action not used, movement remains, or no longer our turn');
            }
        }, 1500);
    };

    const executeAbilityMultiTarget = (abilityId, targets) => {
        const result = executeAbility(abilityId, {
            caster: currentPlayerCharacter,
            playerName: playerName,
            targets: targets,
            enemies: enemies,
            playerCharacters: playerCharacters,
            cooldowns: cooldowns
        });
        
        if (!result.success) {
            console.log('Ability failed:', result.message);
            setSelectedTargets([]);
            return;
        }
        
        console.log('Ability executed:', result.message);

        emitAiEvent(
            'turn_action',
            `${currentPlayerCharacter?.name || playerName} unleashes ${abilityId}: ${result.message}`,
            {
                actor: currentPlayerCharacter?.name || playerName,
                abilityId,
                targets,
                actionType: 'ability_multi'
            }
        );
        
        // Apply effects to game state
        const updates = applyAbilityEffects(result, {
            enemies,
            playerCharacters,
            activeEffects,
            effectOwnerTurnId: playerName
        });
        
        setEnemies(normalizeEnemiesState(updates.enemies));
        setPlayerCharacters(updates.playerCharacters);
        setActiveEffects(updates.activeEffects);

        if (result.forcedMovement && result.forcedMovement.length > 0) {
            result.forcedMovement.forEach(({ enemyId, path, to }) => {
                const movementPath = path && path.length > 0 ? path : (to ? [to] : []);
                if (movementPath.length === 0) return;

                console.log('[BLACK HOLE TELEPORT] Emitting enemy_moved (multi-target path):', {
                    enemyId,
                    from: characterPositions[enemyId] || null,
                    to: movementPath[movementPath.length - 1]
                });

                socket.emit('enemy_moved', {
                    room,
                    enemyId,
                    path: movementPath,
                    stepDelay: 1
                });
            });
        }
        
        // Update cooldowns
        if (result.newCooldown) {
            console.log(`Setting cooldown for ${abilityId}: ${result.newCooldown} turns`);
            setCooldowns(prev => {
                const updated = {
                    ...prev,
                    [abilityId]: result.newCooldown
                };
                console.log('Updated cooldowns:', updated);
                return updated;
            });
        }
        
        // Emit to server for sync
        socket.emit('ability_used', {
            room,
            playerName,
            abilityId,
            result,
            updatedPlayerCharacters: updates.playerCharacters
        });
        
        console.log('[ABILITY SYNC] Emitting updated playerCharacters to server (multi-target)');
        
        setSelectedAbility(null);
        setSelectedTargets([]);
        setActionUsed(true);
        
        // Auto-end only if movement is exhausted
        setTimeout(() => {
            if (isMyTurn && shouldAutoEndTurn()) {
                console.log('[AUTO END TURN MULTI] Action used and no movement remaining after ability use, ending turn');
                handleEndTurn();
            } else {
                console.log('[AUTO END TURN MULTI] Skipped - action not used, movement remains, or no longer our turn');
            }
        }, 1500);
    };

    const executeAbilityOnGroundTarget = (abilityId, targetPosition) => {
        const abilityData = getAbility(abilityId);
        
        console.log('[EXECUTE GROUND TARGET] Starting execution:', {
            abilityId,
            targetPosition,
            caster: currentPlayerCharacter?.name
        });
        
        const result = executeAbility(abilityId, {
            caster: currentPlayerCharacter,
            playerName: playerName,
            targetPosition: targetPosition,
            characterPositions: characterPositions,
            enemies: enemies,
            playerCharacters: playerCharacters,
            cooldowns: cooldowns
        });
        
        console.log('[EXECUTE GROUND TARGET] Result:', result);
        
        if (!result.success) {
            console.log('Ground-target ability failed:', result.message);
            setSelectedAbility(null);
            return;
        }
        
        console.log('✨ Ground-target ability executed:', result.message);

        emitAiEvent(
            'turn_action',
            `${currentPlayerCharacter?.name || playerName} targets the ground with ${abilityId}: ${result.message}`,
            {
                actor: currentPlayerCharacter?.name || playerName,
                abilityId,
                targetPosition,
                actionType: 'ability_ground'
            }
        );
        
        // Apply effects to game state
        const updates = applyAbilityEffects(result, {
            enemies,
            playerCharacters,
            activeEffects,
            effectOwnerTurnId: playerName
        });
        
        setEnemies(normalizeEnemiesState(updates.enemies));
        setPlayerCharacters(updates.playerCharacters);
        setActiveEffects(updates.activeEffects);

        if (result.forcedMovement && result.forcedMovement.length > 0) {
            result.forcedMovement.forEach(({ enemyId, path, to }) => {
                const movementPath = path && path.length > 0 ? path : (to ? [to] : []);
                if (movementPath.length === 0) return;

                console.log('[BLACK HOLE TELEPORT] Emitting enemy_moved (ground-target path):', {
                    enemyId,
                    from: characterPositions[enemyId] || null,
                    to: movementPath[movementPath.length - 1]
                });

                socket.emit('enemy_moved', {
                    room,
                    enemyId,
                    path: movementPath,
                    stepDelay: 1
                });
            });
        }
        
        console.log('[GROUND TARGET COMPLETE] Updated enemies:', updates.enemies);
        console.log('[GROUND TARGET COMPLETE] Updated playerCharacters:', updates.playerCharacters);
        console.log('[GROUND TARGET COMPLETE] Updated activeEffects:', updates.activeEffects);
        
        // Update cooldowns
        if (result.newCooldown) {
            console.log(`Setting cooldown for ${abilityId}: ${result.newCooldown} turns`);
            setCooldowns(prev => {
                const updated = {
                    ...prev,
                    [abilityId]: result.newCooldown
                };
                console.log('Updated cooldowns:', updated);
                return updated;
            });
        }
        
        // Emit to server for sync
        socket.emit('ability_used', {
            room,
            playerName,
            abilityId,
            result,
            updatedPlayerCharacters: updates.playerCharacters,
            updatedEnemies: updates.enemies,
            updatedActiveEffects: updates.activeEffects
        });
        
        console.log('[GROUND TARGET SYNC] Emitting updated game state to server');
        
        setSelectedAbility(null);
        setActionUsed(true);
        
        // Auto-end only if movement is exhausted
        setTimeout(() => {
            if (isMyTurn && shouldAutoEndTurn()) {
                console.log('[AUTO END TURN GROUND] Action used and no movement remaining after ability use, ending turn');
                handleEndTurn();
            } else {
                console.log('[AUTO END TURN GROUND] Skipped - action not used, movement remains, or no longer our turn');
            }
        }, 1500);
    };

    const handleEndTurn = () => {
        if (!isMyTurn) return;

        const liveTurn = currentTurnRef.current;
        const turnCycle = currentTurnCycleRef.current;
        const isCurrentPlayersTurn = liveTurn?.type === 'ally' && liveTurn?.id === playerName;

        if (!isCurrentPlayersTurn) {
            console.log('[END TURN] Ignored stale end-turn request:', {
                playerName,
                liveTurn,
                turnCycle
            });
            return;
        }

        if (completedAllyTurnCyclesRef.current.has(turnCycle)) {
            console.log('[END TURN] Duplicate end-turn ignored for turn cycle:', {
                playerName,
                turnCycle
            });
            return;
        }

        completedAllyTurnCyclesRef.current.add(turnCycle);

        console.log('END TURN clicked');
        console.log('Player Name:', playerName);
        console.log('Room:', room);
        
        // Tick down cooldowns
        setCooldowns(prevCooldowns => tickCooldowns(prevCooldowns));
        
        // Use refs to get latest state values (avoids closure issues)
        const { updatedEffects, updatedCharacters, updatedEnemies } = tickActiveEffects(
            activeEffectsRef.current, 
            playerCharactersRef.current, 
            enemiesRef.current,
            playerName
        );
        
        console.log('Effects ticked:', {
            remainingEffects: updatedEffects.length,
            expiredEffects: activeEffectsRef.current.length - updatedEffects.length
        });
        
        setActiveEffects(updatedEffects);
        setPlayerCharacters(updatedCharacters);
        setEnemies(normalizeEnemiesState(updatedEnemies));
        
        // Emit updated game state to server to maintain sync across all clients
        socket.emit('end_turn', {
            room,
            playerName,
            updatedEnemies,
            updatedPlayerCharacters: updatedCharacters,
            updatedActiveEffects: updatedEffects
        });

        if (!actionUsed && turnStartPosition && characterPositions[playerName]) {
            const endPos = characterPositions[playerName];
            const moved = endPos.row !== turnStartPosition.row || endPos.col !== turnStartPosition.col;
            if (moved) {
                emitAiEvent(
                    'turn_action',
                    `${currentPlayerCharacter?.name || playerName} repositions from (${turnStartPosition.row}, ${turnStartPosition.col}) to (${endPos.row}, ${endPos.col}) and ends the turn.`,
                    {
                        actor: currentPlayerCharacter?.name || playerName,
                        from: turnStartPosition,
                        to: endPos,
                        actionType: 'movement'
                    }
                );
            }
        }
    };
  
    return (
        <div className="main-game-container">
        {showYouDiedScreen && (
            <div className="you-died-screen">
                <div className="you-died-content">
                    <h1>YOU HAVE FALLEN</h1>
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
                                setEnemies([]);
                                setTurnOrder([]);
                                setActiveEffects([]);
                                setCooldowns({});
                                if (cooldownStorageKey) {
                                    sessionStorage.removeItem(cooldownStorageKey);
                                }
                                setActionUsed(false);
                                setMovementUsed(0);
                                setSelectedAbility(null);
                                setSelectedTargets([]);
                                setWeaponSelected(false);
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
                                setEnemies([]);
                                setTurnOrder([]);
                                setActiveEffects([]);
                                setCooldowns({});
                                if (cooldownStorageKey) {
                                    sessionStorage.removeItem(cooldownStorageKey);
                                }
                                
                                // Leave the room
                                socket.emit('leave_room', { room, playerName });
                                localStorage.removeItem("name");
                                localStorage.removeItem("room");
                                localStorage.removeItem("isAdmin");
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
            <h2>{SCENE_LABELS[currentSceneKey] || SCENE_LABELS.city_square}</h2>
            <h2>
                {isMyTurn ? (
                    <div className="turn">
                        YOUR TURN
                        {turnTimeLeft !== null && turnTimeLeft < 16 && (
                            <span className="turn-timer">{turnTimeLeft}s</span>
                        )}
                    </div>
                ) : (
                    <div className="turn">
                    {currentTurn?.type === 'ally' 
                        ? `${currentTurn.id}'s Turn` 
                        : "Enemy's Turn"}
                    </div>
                )}
            </h2>
        </div>
        <div className="party">
            <h3>Party</h3>
            {players
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
                                            <span className="stat-hp">HP: {character.stats.health}/{character.stats.maxHealth}</span>
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
            <div className='Response'>
            <div className="ai-header">
                <span className={`ai-status ${aiBusy ? 'busy' : ''}`}>
                    {aiBusy ? 'DM is thinking...' : 'Ready'}
                </span>
                {currentSceneKey && SCENE_LABELS[currentSceneKey] && (
                    <span className="ai-scene-label">{SCENE_LABELS[currentSceneKey]}</span>
                )}
            </div>
            {aiBusy && (
                <div className="ai-thinking-overlay">
                    <div className="ai-thinking-spinner"></div>
                    <span>The DM is crafting the story...</span>
                </div>
            )}
            {/* AI-driven dynamic options */}
            {aiOptions && aiOptions.length > 0 && !aiBusy && (
                <div className="ai-choices">
                    {aiAttribute && (
                        <div className="ai-choice-owner">
                            Decision owner: {getDecisionOwner(aiAttribute) || 'Admin'}
                        </div>
                    )}
                    {aiOptions.map((option, idx) => (
                        <button
                            key={idx}
                            onClick={() => handleAiOptionClick(option)}
                            disabled={aiBusy || (aiAttribute && !canPlayerDecide(aiAttribute))}
                        >
                            {option}
                        </button>
                    ))}
                </div>
            )}
            {/* Legacy faction choice fallback */}
            {pendingFactionChoice && !aiOptions && (
                <div className="ai-choices">
                    <div className="ai-choice-owner">
                        Decision owner: {getDecisionOwner('politician') || 'Admin'}
                    </div>
                    <button onClick={() => handleFactionChoice('the Enforcers')} disabled={aiBusy || !canPlayerDecide('politician')}>Fight with Enforcers</button>
                    <button onClick={() => handleFactionChoice('the People of the City')} disabled={aiBusy || !canPlayerDecide('politician')}>Fight with the People of the City</button>
                </div>
            )}
            {pendingPostEncounterChoice && !aiOptions && (
                <div className="ai-choices">
                    <div className="ai-choice-owner">
                        Shop decision: {getDecisionOwner('banker') || 'Admin'} | Travel decision: {getDecisionOwner('navigator') || 'Admin'}
                    </div>
                    <button onClick={() => handlePostEncounterChoice('shop')} disabled={aiBusy || !canPlayerDecide('banker')}>Go to Shop</button>
                    <button onClick={() => handlePostEncounterChoice('next_encounter')} disabled={aiBusy || !canPlayerDecide('navigator')}>Next Encounter</button>
                </div>
            )}
            {pendingNextEncounterChoice && !aiOptions && (
                <div className="ai-choices">
                    <div className="ai-choice-owner">
                        Travel decision: {getDecisionOwner('navigator') || 'Admin'}
                    </div>
                    <button onClick={handleNextEncounter} disabled={aiBusy || !canPlayerDecide('navigator')}>Next Encounter</button>
                </div>
            )}
        {/* <button style={{ width: '150px' }} onClick={handleLevelUp}>Level Up</button> */}
        <button style={{ width: '150px' }} onClick={() => handleStoryComplete()}>Combat</button>
            </div>
            <span className="ai-text">
                {displayText}
            </span>
       </div>
        <div className="inventory">
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
                            {attributeAllocations[playerName] && attributeAllocations[playerName].length > 0 ? (
                                <>
                                    <div className="attribute-line">
                                        <span className="primary-ability small">
                                            {attributeAllocations[playerName][0]?.charAt(0).toUpperCase() + attributeAllocations[playerName][0]?.slice(1)}
                                        </span>
                                    </div>
                                    /
                                    <div className="attribute-line">
                                        <span className="secondary-ability small">
                                            {attributeAllocations[playerName][1]?.charAt(0).toUpperCase() + attributeAllocations[playerName][1]?.slice(1)}
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
                                    const statBonuses = getStatBonuses(playerName, activeEffects);
                                    const currentPosition = characterPositions[playerName];
                                    const sewerSpeedPenalty = isSewerSlowTile(currentSceneKey, currentPosition)
                                        ? Math.floor((currentPlayerCharacter?.stats?.speed || 0) / 2)
                                        : 0;
                                    return (
                                        <>
                                            <div className="stat-item">
                                                <span className="stat-label">Health</span>
                                                <span className="stat-value">
                                                    {currentPlayerCharacter.stats.health}
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
                                                <span className="stat-label">Technical Ability</span>
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
                        <div 
                            className={`weapon-card ${weaponSelected ? 'weapon-selected' : ''} ${((actionUsed && extraWeaponAttacksRemaining <= 0) || !isPlayerAlive) ? 'weapon-disabled' : ''}`}
                            onClick={() => isMyTurn && (!actionUsed || extraWeaponAttacksRemaining > 0) && isPlayerAlive && setWeaponSelected(!weaponSelected)}
                            style={{ cursor: (isMyTurn && (!actionUsed || extraWeaponAttacksRemaining > 0) && isPlayerAlive) ? 'pointer' : 'not-allowed' }}
                        >
                            <div className="weapon-info">
                                <i><div className="weapon-name">{currentPlayerCharacter.weapon.name}</div></i>
                                <div className="weapon-range">{currentPlayerCharacter.weapon.range == 1 ? "Melee" : "Range: " + currentPlayerCharacter.weapon.range}</div>
                            </div>
                        </div>
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
                                        className={`ability-card ${
                                            isOnCooldown ? 'ability-on-cooldown' : ''
                                        } ${
                                            isSelected ? 'ability-selected' : ''
                                        }`}
                                        disabled={!isMyTurn || isOnCooldown || actionUsed || !isPlayerAlive}
                                    >
                                        <div className='damage-scaling'>{scalerIcon}</div>
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

                            return (
                        <button 
                            className="ultimate-card" 
                            disabled={!isMyTurn || actionUsed || !isPlayerAlive || !hasUltimate}
                            onClick={() => {
                                if (!hasUltimate) {
                                    console.warn('[ABILITY DEBUG] Ultimate click blocked - invalid or missing ultimate:', rawUltimate);
                                    return;
                                }
                                console.log('[ULTIMATE CLICK] Ultimate clicked:', resolvedUltimate);
                                handleAbilityClick(resolvedUltimate);
                            }}
                        >
                            <div className="ultimate-header">
                                <div className="ultimate-name">{hasUltimate ? resolvedUltimate.name : 'No Ultimate Available'}</div>
                            </div>
                            <div className="ultimate-desc">{hasUltimate ? resolvedUltimate.description : 'Reach level 5 to unlock your ultimate.'}</div>
                        </button>
                            );
                        })()}
                    </div>
                </>
            ) : (
                <div className="no-character">No character selected</div>
            )}
        </div>

        {isMyTurn && <button className="end-turn" onClick={handleEndTurn} disabled={!isMyTurn}>End Turn</button>}
        </div>

    );
};

export default Main;


