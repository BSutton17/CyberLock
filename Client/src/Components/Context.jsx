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
    const [allPlayerAttributes, setAllPlayerAttributes] = useState({});
    const [chat, setChat] = useState(false);

    const [musicVolume, setMusicVolume] = useState(() => {
      const savedVolume = localStorage.getItem('musicVolume');
      return savedVolume !== null ? parseFloat(savedVolume) : 0.75;
    });
    
    const [isMuted, setIsMuted] = useState(() => {
      const savedMuted = localStorage.getItem('isMuted');
      return savedMuted === 'true';
    });

    React.useEffect(() => {
      localStorage.setItem('musicVolume', musicVolume.toString());
    }, [musicVolume]);

    React.useEffect(() => {
      localStorage.setItem('isMuted', isMuted.toString());
    }, [isMuted]);
    const characterImageMap = {
      offensive_tank_1: '/characters/Offensive_Tank_1.png',
      defensive_tank_2: '/characters/Defensive_Tank_2.png',
      spellcaster_dps_1: '/characters/Spell_Caster_DPS_1.png',
      aggressive_dps_2: '/characters/Aggressive_DPS_2.png',
      traditional_warrior_dps_3: '/characters/Traditional_Warrior_3.png',
      healing_support_1: '/characters/Healing_Support.png',
      offensive_support_2: '/characters/Offensive_Support.png',
      jack_of_all_trades_support_3: '/characters/Spell_Caster_DPS_2.png',
      hacker_support_4: '/characters/Hacker.png'
    };

    const enemyImageMap = {
      enforcer_soldier: '/enemies/Enforcer_Solider.png',
      enforcer_drone: '/enemies/Enforcer_Drone.png',
      rebel_initiate: '/enemies/Rebel_Initiate.png',
      rebel_field_tech: '/enemies/Rebel_Field_Tech.png',
      division_command: '/enemies/Enforcer_Division_Command.png',
      division_strategist: '/enemies/Enforcer_Division_Strategist.png',
      vanguard_captain: '/enemies/Enforcer_Vangaurd_Captain.png',
      field_captain: '/enemies/Rebel_Field_Captain.png',
      rebel_coordinator: '/enemies/Rebel_Coordinator.png',
      operations_handler: '/enemies/Rebel_Field_Tech.png',
      division_chief: '/enemies/Enforcer_Division_Command.png',
      rebellion_chief: '/enemies/Rebel_Field_Captain.png',
      enforcer_the_architect: '/enemies/The Architect.png',
      enforcer_macro_hull: '/enemies/Macro Hull.png',
      enforcer_genisis: '/enemies/Genisis.png',
      rebel_garret_maxwell: '/enemies/Garret Maxwell.png',
      rebel_levi_wicker: '/enemies/Levi Wicker.png',
      rebel_virgil_wesley: '/enemies/Virgil Wesley.png'
    };

    const enemyNameImageMap = {
      'Garret Maxwell': '/enemies/Garret Maxwell.png',
      'Genisis': '/enemies/Genisis.png',
      'Levi Wicker': '/enemies/Levi Wicker.png',
      'Macro Hull': '/enemies/Macro Hull.png',
      'The Architect': '/enemies/The Architect.png',
      'Virgil Wesley': '/enemies/Virgil Wesley.png'
    };

    const getCharacterImage = (character) => {
      if (!character?.id) return '/vite.svg';
      return characterImageMap[character.id] || '/vite.svg';
    };

    const getEnemyImage = (enemy) => {
      const rawId = typeof enemy === 'string' ? enemy : enemy?.id;
      const enemyName = typeof enemy === 'object' ? enemy?.name : null;
      if (!rawId) return enemyNameImageMap[enemyName] || '/vite.svg';

      const normalizedId = rawId.replace(/_\d+$/, '');
      return enemyImageMap[rawId] || enemyImageMap[normalizedId] || enemyNameImageMap[enemyName] || '/vite.svg';
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
        allPlayerAttributes, setAllPlayerAttributes,
        debugLogLevel,
        musicVolume, setMusicVolume,
        isMuted, setIsMuted,
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
