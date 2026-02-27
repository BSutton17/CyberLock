import React, { createContext, useContext, useState } from 'react';
import io from 'socket.io-client';

const GameContext = createContext();

export const useGameContext = () => {
  return useContext(GameContext);
};

export const GameProvider = ({ children }) => {
  const SOCKET_BASE_URL = import.meta.env.MODE === 'production' 
    ? undefined
    : (import.meta.env.VITE_API_URL || "http://localhost:5000");
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
    const [socket] = useState(() => io.connect(SOCKET_BASE_URL));
    const [gamePhase, setGamePhase] = useState('story');
    const [storyText, setStoryText] = useState('The adventure begins...');
    const [combatRewards, setCombatRewards] = useState(null);
    const [attributeAllocations, setAttributeAllocations] = useState({});


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
        enemies, setEnemies,
        attributeAllocations, setAttributeAllocations
      }}
    >
      {children}
    </GameContext.Provider>
  );
};

export default GameContext;