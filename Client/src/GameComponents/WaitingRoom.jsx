import React from "react";

import { useGameContext } from "../Components/Context.jsx";

function WaitingRoom() {
    const { players, isAdmin, room, socket } = useGameContext();

    const handleStartGame = () => {
        socket.emit("startGame", room);
    };

  return (
    <div className="waiting_room">
      {isAdmin ?
      (
        <h1>Game Code: {room}</h1>
      ):(
        <h1>Waiting for Players {room}</h1>      )}
      <ul>
        {players.map((player, index) => (
          <li className="playerList" key={index}>{player}</li>
        ))}
      </ul>
      {isAdmin && (
        <button className="start-button" onClick={handleStartGame}>
          Start Game
        </button>
      )}

    </div>
  );
}

export default WaitingRoom;