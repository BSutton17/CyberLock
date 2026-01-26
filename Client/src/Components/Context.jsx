import React, { createContext, useContext, useState } from 'react';
import io from 'socket.io-client';

const GameContext = createContext();

export const useGameContext = () => {
  return useContext(GameContext);
};

export const GameProvider = ({ children }) => {
    const [count, setCount] = useState(0)
    const [players, setPlayers] = useState([]);
    const [isAdmin, setAdmin] = useState(false);
    const [room, setRoom] = useState("");
    const [displayGame, setDisplayGame] = useState(false);
    const [screen, setScreen] = useState("waiting"); // "waiting" or "characterSelect"
    const [playerName, setPlayerName] = useState("");
    const [playerCharacters, setPlayerCharacters] = useState({});
    const [socket] = useState(() => io.connect("http://localhost:3001"));


  return (
    <GameContext.Provider
      value={{count, setCount
        , players, setPlayers
        , isAdmin, setAdmin
        , room, setRoom
        , displayGame, setDisplayGame
        , screen, setScreen
        , playerName, setPlayerName
        , playerCharacters, setPlayerCharacters
        , socket
      }}
    >
      {children}
    </GameContext.Provider>
  );
};

export default GameContext;