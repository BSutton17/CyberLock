import React, { createContext, useContext, useState } from 'react';
import { IoLogoElectron } from "react-icons/io5";
import { FaFistRaised } from "react-icons/fa";
import { LuCirclePlus } from "react-icons/lu";
import io from 'socket.io-client';

const GameContext = createContext();
const DEBUG_LOG_LEVEL = 'quiet';

const normalizeDebugLogLevel = (value) => {
  const normalized = (value || '').toLowerCase();
  if (normalized === 'quiet' || normalized === 'verbose' || normalized === 'important') {
    return normalized;
  }
  return 'important';
};

export const useGameContext = () => {
  const ctx = useContext(GameContext);
  if (!ctx) {
    if (import.meta.env.DEV) console.warn('[useGameContext] Called outside of GameProvider — returning empty context');
    return {};
  }
  return ctx;
};

export const GameProvider = ({ children }) => {
  const SOCKET_BASE_URL = import.meta.env.VITE_API_URL || `http://${window.location.hostname}:5000`;
    const debugLogLevel = normalizeDebugLogLevel(DEBUG_LOG_LEVEL);
    const [players, setPlayers] = useState([]);
    const [isAdmin, setAdmin] = useState(false);
    const [room, setRoom] = useState("");
    const [displayGame, setDisplayGame] = useState(false);
    const [screen, setScreen] = useState("waiting"); 
    const [playerName, setPlayerName] = useState("");
    const [playerCharacters, setPlayerCharacters] = useState({});
    const [readyPlayers, setReadyPlayers] = useState([]);
    const [currentTurn, setCurrentTurn] = useState(null);
    const [turnOrder, setTurnOrder] = useState([]); 
    const [isMyTurn, setIsMyTurn] = useState(false);
    const [enemies, setEnemies] = useState([]);
    const [socket] = useState(() => io.connect(SOCKET_BASE_URL, { withCredentials: true }));
    const [gamePhase, setGamePhase] = useState('story');
    const [storyText, setStoryText] = useState('The adventure begins...');
    const [combatRewards, setCombatRewards] = useState(null);
    const [attributeAllocations, setAttributeAllocations] = useState({});
    const [attributePoints, setAttributePoints] = useState({});
    const [chat, setChat] = useState(false);

    const characterImageMap = {
      offensive_tank_1: '/Offensive_Tank_1.png',
      defensive_tank_2: '/Defensive_Tank_2.png',
      spellcaster_dps_1: '/Spell_Caster_DPS_1.png',
      aggressive_dps_2: '/Aggressive_DPS_2.png',
      traditional_warrior_dps_3: '/Traditional_Warrior_3.png',
      healing_support_1: '/Healing_Support.png',
      offensive_support_2: '/Offensive_Support.png',
      jack_of_all_trades_support_3: '/Spell_Caster_DPS_2.png',
      hacker_support_4: '/Hacker.png'
    };

    const enemyImageMap = {
      enforcer_soldier: '/Enforcer_Solider.png',
      enforcer_drone: '/Enforcer_Drone.png',
      rebel_initiate: '/Rebel_Initiate.png',
      rebel_field_tech: '/Rebel_Field_Tech.png',
      division_command: '/Enforcer_Division_Command.png',
      division_strategist: '/Enforcer_Division_Strategist.png',
      vanguard_captain: '/Enforcer_Vangaurd_Captain.png',
      field_captain: '/Rebel_Field_Captain.png',
      rebel_coordinator: '/Rebel_Field_Coordinator.png',
      operations_handler: '/Rebel_Field_Tech.png',
      division_chief: '/Enforcer_Division_Command.png',
      rebellion_chief: '/Rebel_Field_Captain.png'
    };

    const getCharacterImage = (character) => {
      if (!character?.id) return '/vite.svg';
      return characterImageMap[character.id] || '/vite.svg';
    };

    const getEnemyImage = (enemy) => {
      const rawId = typeof enemy === 'string' ? enemy : enemy?.id;
      if (!rawId) return '/vite.svg';

      const normalizedId = rawId.replace(/_\d+$/, '');
      return enemyImageMap[rawId] || enemyImageMap[normalizedId] || '/vite.svg';
    };

    const getAbilityScaler = (ability) => {
      const icon = ability?.damageScaling == "strength" ? <FaFistRaised /> : ability?.damageScaling == undefined ? null : <IoLogoElectron  />;
      return icon;
    }

    const getIsBonusAction = (ability) => {
      const icon = ability?.consumesAction == false ? <LuCirclePlus /> : "";
      return icon;
    }

  return (
    <GameContext.Provider
      value={{
        players, setPlayers,
        isAdmin, setAdmin,
        room, setRoom,
        displayGame, setDisplayGame,
        screen, setScreen,
        playerName, setPlayerName,
        playerCharacters, setPlayerCharacters,
        readyPlayers, setReadyPlayers,
        socket,
        gamePhase, setGamePhase,
        storyText, setStoryText,
        combatRewards, setCombatRewards,
        currentTurn, setCurrentTurn,
        turnOrder, setTurnOrder,
        isMyTurn, setIsMyTurn,
        chat, setChat,
        enemies, setEnemies,
        attributeAllocations, setAttributeAllocations,
        attributePoints, setAttributePoints,
        debugLogLevel,
        characterImageMap,
        enemyImageMap,
        getCharacterImage,
        getEnemyImage,
        getAbilityScaler,
        getIsBonusAction
      }}
    >
      {children}
    </GameContext.Provider>
  );
};

export default GameContext;
