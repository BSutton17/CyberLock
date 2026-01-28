import React, { createContext, useContext, useState } from 'react';
import io from 'socket.io-client';

const GameContext = createContext();

export const useGameContext = () => {
  return useContext(GameContext);
};

export const GameProvider = ({ children }) => {
    const [players, setPlayers] = useState([]);
    const [isAdmin, setAdmin] = useState(false);
    const [room, setRoom] = useState("");
    const [displayGame, setDisplayGame] = useState(false);
<<<<<<< HEAD
    const [socket] = useState(() => io.connect("http://localhost:5000"));
=======
    const [screen, setScreen] = useState("waiting"); 
    const [playerName, setPlayerName] = useState("");
    const [playerCharacters, setPlayerCharacters] = useState({});
    const [readyPlayers, setReadyPlayers] = useState([]);
    const [currentTurn, setCurrentTurn] = useState(null);
    const [turnOrder, setTurnOrder] = useState([]); 
    const [isMyTurn, setIsMyTurn] = useState(false);
    const [enemies, setEnemies] = useState([]);
    const [socket] = useState(() => io.connect("http://localhost:3001"));
    const [gamePhase, setGamePhase] = useState('story');
    const [storyText, setStoryText] = useState('The adventure begins...');
    const [combatRewards, setCombatRewards] = useState(null);
>>>>>>> d28f15df6fa543ebc1cdc4303af54e1198a16ad7


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
        enemies, setEnemies
      }}
    >
      {children}
    </GameContext.Provider>
  );
};

export default GameContext;