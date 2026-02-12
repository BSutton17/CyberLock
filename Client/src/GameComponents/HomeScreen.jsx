import "../App.css";
import io from "socket.io-client";
import App from "../App";
import { useState, useEffect } from "react";
import WaitingRoom from "./WaitingRoom";
import CharacterSelect from "./CharacterSelect/CharacterSelect";
import Main from "./Main/Main";
import Events from "../Components/Events";
import { useGameContext } from "../Components/Context";
function HomeScreen() {     
  const [name, setName] = useState("");       
  const [isJoining, setIsJoining] = useState(false); 
  const { players, socket, room, setRoom, screen, setPlayerName } = useGameContext();

  // Load saved name and room from localStorage on first load
  useEffect(() => {
    const savedName = localStorage.getItem('name');
    const savedRoom = localStorage.getItem('room');

    if (savedName && savedRoom) {
      setName(savedName);
      setPlayerName(savedName);
      setRoom(savedRoom);
      setIsJoining(true);

      socket.emit('join_room', savedRoom, savedName);
    }
  }, []);

  const joinRoom = () => {
    if (room !== '' && name !== '') {
      localStorage.setItem('name', name);
      localStorage.setItem('room', room);

      localStorage.setItem("name", name);
      localStorage.setItem("room", room);
      setPlayerName(name);

      socket.emit("join_room", room, name); 
      setIsJoining(true);
    } else {
      alert('Please enter a valid room and name.');
    }
  };

  const startRoom = () => {
    if (name === '') {
      alert('Please enter a valid name.');
      return;
    }

    // Generate random 4-digit room ID
    const newRoom = Math.floor(Math.random() * (9999 - 1000 + 1) + 1000);
    const strRoom = String(newRoom);

    // Simulate typing room ID character by character
    setRoom('');
    setTimeout(() => setRoom(strRoom.substring(0, 3)), 30);
    setTimeout(() => setRoom(strRoom), 60);

    setTimeout(() => {
      localStorage.setItem("name", name);
      localStorage.setItem("room", strRoom);
      setPlayerName(name);

      socket.emit('join_room', strRoom, name);
      setIsJoining(true);
    }, 20);
  };

  // Leave game
  const leaveGame = () => {
    localStorage.removeItem('name');
    localStorage.removeItem('room');
    socket.emit('disconnect');
    setIsJoining(false);
    setName('');
    setRoom('');
  };

  // Logout from app
  const handleLogout = async () => {
    localStorage.removeItem('name');
    localStorage.removeItem('room');
    //socket.emit('disconnect');
    await logoutAuth();
    navigate('/login');
  };

  return (
    <div>
      <div style={{ position: 'absolute', top: 20, right: 20 }}>
        <span style={{ marginRight: '15px' }}>Welcome, {user?.username}!</span>
        <button
          onClick={handleLogout}
          style={{
            padding: '8px 16px',
            backgroundColor: '#dc3545',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
          }}
        >
          Logout
        </button>
      </div>

      <Events />
      {!isJoining ? (
        <div className="case">
          <div className="name_input">
            <input
              placeholder="Name..."
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
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
          {screen === "main" && <Main />}
          {screen !== "main" && <button onClick={logout}>Leave Game</button>}
        </div>
      )}
    </div>
  );
}

export default HomeScreen;