import '../App.css';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { useGameContext } from './Context';
import WaitingRoom from './WaitingRoom';
import Events from './Events';

function HomeScreen() {
  const [name, setName] = useState('');
  const [isJoining, setIsJoining] = useState(false);
  const { user, logout: logoutAuth } = useAuth();
  const { players, socket, room, setRoom } = useGameContext();
  const navigate = useNavigate();

  // Load saved name and room from localStorage on first load
  useEffect(() => {
    const savedName = localStorage.getItem('name');
    const savedRoom = localStorage.getItem('room');

    if (savedName && savedRoom) {
      setName(savedName);
      setRoom(savedRoom);
      setIsJoining(true);

      socket.emit('join_room', savedRoom, savedName);
    }
  }, []);

  const joinRoom = () => {
    if (room !== '' && name !== '') {
      localStorage.setItem('name', name);
      localStorage.setItem('room', room);

      socket.emit('join_room', room, name);
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
      localStorage.setItem('name', name);
      localStorage.setItem('room', strRoom);

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
          <WaitingRoom />
          <button onClick={leaveGame}>Leave Game</button>
        </div>
      )}
    </div>
  );
}

export default HomeScreen;