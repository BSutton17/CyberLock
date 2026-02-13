import React from "react";
import { useGameContext } from "../Components/Context.jsx";
import "./WaitingRoom.css";

function WaitingRoom() {
    const { players, isAdmin, room, socket } = useGameContext();

    const handleStartGame = () => {
        socket.emit("startGame", room);
    };

  return (
    <div className="waiting-room-container">
      <div className="header">
        {isAdmin ? (
            <h1>Game Code: {room}</h1>
        ) : (
            <h1>Waiting for Players...</h1>
        )}
        {isAdmin && <h2>Share this code with your friends!</h2>}
        {!isAdmin && <h2>Room Code: {room}</h2>}
      </div>

      <div className="player-list-section">
        <h3>Players: {players.length}/6</h3>
        <ul>
          {players.map((player, index) => (
            <li className="player-card" key={index}>{player}</li>
          ))}
        </ul>
      </div>

      <div className="footer-controls">
        {isAdmin && (
            <button 
                className="start-button" 
                onClick={handleStartGame}
                // disabled={players.length < 2} // Optional: styling for disabled state is ready
            >
            Start Game
            </button>
        )}
      </div>
    </div>
  );
}

export default WaitingRoom;
