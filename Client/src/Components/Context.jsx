import React, { createContext, useContext, useState } from 'react';
import { IoLogoElectron } from "react-icons/io5";
import { FaFistRaised } from "react-icons/fa";
import { LuCirclePlus } from "react-icons/lu";
import io from 'socket.io-client';
import { CHARACTER_IMAGE_MAP, ENEMY_IMAGE_MAP, getCharacterImage, getEnemyImage } from './imageMaps';

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
        characterImageMap: CHARACTER_IMAGE_MAP,
        enemyImageMap: ENEMY_IMAGE_MAP,
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
