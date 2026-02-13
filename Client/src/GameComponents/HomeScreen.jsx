import "../App.css";
import "./HomeScreen.css";

import App from "../App";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../Components/AuthContext";
import WaitingRoom from "./WaitingRoom";
import CharacterSelect from "./CharacterSelect/CharacterSelect";
import Main from "./Main/Main";
import Events from "../Components/Events";
import { useGameContext } from "../Components/Context";
import CharacterBuilder from "./CharacterBuilder/CharacterBuilder";
import LevelUp from "./LevelUp/LevelUp.jsx"

function HomeScreen() {       
  const [isJoining, setIsJoining] = useState(() => {
    const savedName = localStorage.getItem('name');
    const savedRoom = localStorage.getItem('room');
    return !!(savedName && savedRoom);
  }); 
  const { socket, room, setRoom, screen, setPlayerName, setAdmin } = useGameContext();
  const navigate = useNavigate();
  const { user, logout: logoutAuth } = useAuth();
  const [name] = useState(() => {
    const savedName = localStorage.getItem('name');
    const savedRoom = localStorage.getItem('room');
    return (savedName && savedRoom) ? savedName : user?.username;
  });

  useEffect(() => {
    const savedName = localStorage.getItem('name');
    const savedRoom = localStorage.getItem('room');
    const savedIsAdmin = localStorage.getItem('isAdmin') === 'true';

    if (savedName && savedRoom) {
      if (setPlayerName) setPlayerName(savedName);
      setRoom(savedRoom);
      if (setAdmin) setAdmin(savedIsAdmin);

      socket.emit('join_room', savedRoom, savedName);
    }
  }, [setAdmin, setPlayerName, setRoom, socket]);



  const joinRoom = () => {
    if (room !== '' && name !== '') {
      localStorage.setItem('name', name);
      localStorage.setItem('room', room);
      if (setPlayerName) setPlayerName(name);

      socket.emit('join_room', room, name);
      setIsJoining(true);
    } else {
      alert('Please enter a valid room and name.');
    }
  };

  const startRoom = () => {

    // Generate random 4-digit room ID
    const newRoom = Math.floor(Math.random() * (9999 - 1000 + 1) + 1000);
    const strRoom = String(newRoom);

    // Simulate typing room ID character by character
    setRoom('');
    setTimeout(() => setRoom(strRoom.substring(0, 3)), 30);
    setTimeout(() => setRoom(strRoom), 60);

    setTimeout(() => {
      localStorage.setItem('name', name);
      localStorage.setItem('room', strRoom);
      if (setPlayerName) setPlayerName(name);

      socket.emit('join_room', strRoom, name);
      setIsJoining(true);
    }, 20);
  };

  // Get rid of the saved data
  const leaveGame = () => {
    localStorage.removeItem("name");
    localStorage.removeItem("room");
    localStorage.removeItem("isAdmin");
    window.location.reload(); 
    socket.emit("disconnect");
  };

  // Logout from authentication
  const handleLogout = async () => {
    await logoutAuth();
    navigate('/login');
  };

  return (
    <div className="home-screen-container">
      <Events />
      {!isJoining ? (
        <div className="case">
          {/* User Header */}
          <div className="name_input">
            <div className="user-header">
              <div className="user-info">
                <span className="welcome-text">Welcome, <strong>{user?.username}</strong></span>
              </div>
              <button className="logout-btn" onClick={handleLogout}>
                Logout
              </button>
            </div>
            <input
              placeholder="Room Id..."
              type="number"
              value={room}
              onChange={(event) => setRoom(event.target.value)}
            />
            <button onClick={joinRoom}>Join Room</button>
            <button onClick={startRoom}>Start Room</button>
          </div>
        </div>
      ) : (
        <div>
          {screen === "waiting" && <WaitingRoom />}
          {screen === "characterSelect" && <CharacterSelect />}
          {screen === "characterBuilder" && <CharacterBuilder />}
          {screen === "main" && <Main />}
          {screen !== "main" && <button className="leave" onClick={leaveGame}>Leave Game</button>}
          {screen === "levelup" && <LevelUp />}
          
        </div>
      )}
    </div>
  );
}

export default HomeScreen;