import React, { createContext, useContext, useState } from 'react';
import { IoLogoElectron } from "react-icons/io5";
import { FaFistRaised } from "react-icons/fa";
import io from 'socket.io-client';

const GameContext = createContext();

export const useGameContext = () => {
  return useContext(GameContext);
};

export const GameProvider = ({ children }) => {
  const SOCKET_BASE_URL = 'https://cs-capstone-491b8f4e8664.herokuapp.com' || 'http://localhost:5000';
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

    const getCharacterImage = (character) => {
      if (!character?.id) return '/vite.svg';
      return characterImageMap[character.id] || '/vite.svg';
    };

    const getAbilityScaler = (ability) => {
      const icon = ability?.damageScaling == "strength" ? <FaFistRaised /> : ability?.damageScaling == undefined ? null : <IoLogoElectron  />;
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
        enemies, setEnemies,
        attributeAllocations, setAttributeAllocations,
        characterImageMap,
        getCharacterImage,
        getAbilityScaler
      }}
    >
      {children}
    </GameContext.Provider>
  );
};

export default GameContext;