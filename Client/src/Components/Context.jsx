import React, { createContext, useContext, useEffect, useState } from 'react';
import { IoLogoElectron } from "react-icons/io5";
import { FaFistRaised } from "react-icons/fa";
import { LuCirclePlus } from "react-icons/lu";
import io from 'socket.io-client';
import { CHARACTER_IMAGE_MAP, ENEMY_IMAGE_MAP, getCharacterImage, getEnemyImage } from './imageMaps';
import { useAuth, getStoredToken } from './AuthContext';
import { API_URL } from '../config';

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
    const debugLogLevel = normalizeDebugLogLevel(DEBUG_LOG_LEVEL);
    const [players, setPlayers] = useState([]);
    // Seats played by the computer (they are in `players` too).
    const [bots, setBots] = useState([]);
    // The host's "Mock" switch: the room uses the free offline narrator instead of the AI.
    const [narratorMock, setNarratorMock] = useState(false);
    // The "story so far" recap behind the Summarize button (rewritten after every fight).
    const [storySummary, setStorySummary] = useState(null);
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
    // The socket connects only after sign-in and sends the session token on every (re)connect.
    const [socket] = useState(() => io(API_URL || undefined, {
      autoConnect: false,
      auth: (callback) => callback({ token: getStoredToken() })
    }));
    const { token, logout } = useAuth();
    const [connectionStatus, setConnectionStatus] = useState('disconnected');
    const [connectedPlayers, setConnectedPlayers] = useState([]);
    // Players who dropped out: when their seat is given up, by this device's clock.
    const [awayPlayers, setAwayPlayers] = useState({});
    // A single-player game the player paused (Pause button in the top bar).
    const [gamePaused, setGamePaused] = useState({ paused: false, windowMs: 600000 });
    // This player stepped away from a paused game (their socket is closed until they rejoin).
    const [steppedAway, setSteppedAway] = useState(null);
    // "Livewire (sean) left the party.", shown for a few seconds.
    const [partyNotice, setPartyNotice] = useState(null);

    useEffect(() => {
      if (token) {
        if (!socket.connected) socket.connect();
      } else {
        socket.disconnect();
      }
    }, [socket, token]);

    useEffect(() => {
      const handleConnect = () => {
        setConnectionStatus('connected');
        setSteppedAway(null);
      };
      const handleDisconnect = (reason) => {
        // "io client disconnect" means we closed it on purpose (sign-out).
        setConnectionStatus(reason === 'io client disconnect' ? 'disconnected' : 'reconnecting');
      };
      const handleConnectError = (error) => {
        if (error?.message === 'unauthorized') {
          logout();
        } else {
          setConnectionStatus('reconnecting');
        }
      };
      const handlePresence = ({ connected, away } = {}) => {
        setConnectedPlayers(Array.isArray(connected) ? connected : []);
        const now = Date.now();
        setAwayPlayers(Object.fromEntries(Object.entries(away || {}).map(([player, msLeft]) => [player, now + (Number(msLeft) || 0)])));
      };
      const handlePaused = ({ paused, windowMs } = {}) => setGamePaused({ paused: !!paused, windowMs: Number(windowMs) || 600000 });
      const handlePlayerLeft = ({ playerName: who, characterName } = {}) => {
        setPartyNotice({ text: `${characterName ? `${characterName} (${who})` : who} left the party.`, at: Date.now() });
      };

      socket.on('connect', handleConnect);
      socket.on('disconnect', handleDisconnect);
      socket.on('connect_error', handleConnectError);
      socket.on('presence_updated', handlePresence);
      socket.on('game_paused', handlePaused);
      socket.on('player_left', handlePlayerLeft);
      return () => {
        socket.off('game_paused', handlePaused);
        socket.off('player_left', handlePlayerLeft);
        socket.off('connect', handleConnect);
        socket.off('disconnect', handleDisconnect);
        socket.off('connect_error', handleConnectError);
        socket.off('presence_updated', handlePresence);
      };
    }, [socket, logout]);
    const [gamePhase, setGamePhase] = useState('story');
    const [storyText, setStoryText] = useState('The adventure begins...');
    const [combatRewards, setCombatRewards] = useState(null);
    const [allPlayerAttributes, setAllPlayerAttributes] = useState({});
    const [chat, setChat] = useState(false);
    // Latest story snapshot from the server (encounter number, side, last decision), used to restore after a reconnect.
    const [serverStoryState, setServerStoryState] = useState(null);
    // Latest fight snapshot from the server (board, effects, cooldowns, whose turn). The server runs
    // the fight; the client only draws it and sends intents.
    const [combatState, setCombatState] = useState(null);

    const [musicVolume, setMusicVolume] = useState(() => {
      const savedVolume = localStorage.getItem('musicVolume');
      return savedVolume !== null ? parseFloat(savedVolume) : 0.75;
    });
    
    const [isMuted, setIsMuted] = useState(() => {
      const savedMuted = localStorage.getItem('isMuted');
      return savedMuted === 'true';
    });

    useEffect(() => {
      localStorage.setItem('musicVolume', musicVolume.toString());
    }, [musicVolume]);

    useEffect(() => {
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
        bots, setBots,
        narratorMock, setNarratorMock,
        storySummary, setStorySummary,
        isAdmin, setAdmin,
        room, setRoom,
        displayGame, setDisplayGame,
        screen, setScreen,
        playerName, setPlayerName,
        playerCharacters, setPlayerCharacters,
        readyPlayers, setReadyPlayers,
        socket,
        connectionStatus,
        connectedPlayers,
        awayPlayers,
        gamePaused,
        steppedAway, setSteppedAway,
        partyNotice, setPartyNotice,
        serverStoryState, setServerStoryState,
        combatState, setCombatState,
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
