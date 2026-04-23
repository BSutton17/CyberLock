import "../App.css";
import "./HomeScreen.css";
import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../Components/AuthContext";
import WaitingRoom from "./WaitingRoom";
import CharacterSelect from "./CharacterSelect/CharacterSelect";
import Main from "./Main/Main";
import Events from "../Components/Events";
import { useGameContext } from "../Components/Context";
import CharacterBuilder from "./CharacterBuilder/CharacterBuilder";
import CharacterBuilderPart2 from "./CharacterBuilder/CharacterBuilderPart2";
import LevelUp from "./LevelUp/LevelUp.jsx"
import ChooseAbilities from "./ChooseAbilities/ChooseAbilities.jsx"
import ChatBot from "./ChatBot/ChatBot.jsx";
import SettingsMenu from "../Components/SettingsMenu";
import { FaRotate } from "react-icons/fa6";

const getIsMobilePortrait = () => {
  if (typeof window === 'undefined') {
    return false;
  }

  const isCoarsePointer = window.matchMedia?.('(pointer: coarse)').matches ?? false;
  const isPortrait = window.innerHeight > window.innerWidth;
  const isMobileWidth = window.innerWidth <= 1080;

  return isCoarsePointer && isPortrait && isMobileWidth;
};

function HomeScreen() {
  const [joinError, setJoinError] = useState('');
  const [isMobilePortrait, setIsMobilePortrait] = useState(getIsMobilePortrait);
  const [isJoining, setIsJoining] = useState(() => {
    const savedName = localStorage.getItem('name');
    const savedRoom = localStorage.getItem('room');
    return !!(savedName && savedRoom);
  });
  const { socket, room, setRoom, screen, setPlayerName, setAdmin, setScreen, musicVolume, isMuted } = useGameContext();
  const navigate = useNavigate();
  const { user, logout: logoutAuth } = useAuth();
  const [name] = useState(() => {
    const savedName = localStorage.getItem('name');
    const savedRoom = localStorage.getItem('room');
    return (savedName && savedRoom) ? savedName : user?.username;
  });

  const titleMusicRef = useRef(null);

  useEffect(() => {
    if (!titleMusicRef.current) {
      titleMusicRef.current = new Audio('/Title.mp3');
      titleMusicRef.current.loop = true;
    }

    const screensWithTitleMusic = [
      "waiting", 
      "characterSelect", 
      "characterBuilder", 
      "characterBuilderPart2",
      "chooseAbilities"
    ];
    
    const shouldPlayTitleMusic = !isJoining || screensWithTitleMusic.includes(screen);

    if (shouldPlayTitleMusic) {
      const playPromise = titleMusicRef.current.play();
      if (playPromise !== undefined) {
          playPromise.catch(error => {
              console.log("Audio autoplay prevented or failed:", error);
          });
      }
    } else {
      titleMusicRef.current.pause();
      titleMusicRef.current.currentTime = 0;
    }
  }, [screen, isJoining]);

  useEffect(() => {
    return () => {
      if (titleMusicRef.current) {
        titleMusicRef.current.pause();
        titleMusicRef.current.currentTime = 0;
      }
    };
  }, []);

  useEffect(() => {
    if (titleMusicRef.current) {
      titleMusicRef.current.volume = musicVolume * (2 / 3);
      titleMusicRef.current.muted = isMuted;
    }
  }, [musicVolume, isMuted]);

  useEffect(() => {
    const updateOrientationState = () => {
      setIsMobilePortrait(getIsMobilePortrait());
    };

    updateOrientationState();
    window.addEventListener('resize', updateOrientationState);
    window.addEventListener('orientationchange', updateOrientationState);

    return () => {
      window.removeEventListener('resize', updateOrientationState);
      window.removeEventListener('orientationchange', updateOrientationState);
    };
  }, []);

  useEffect(() => {
    const handleRoomFull = () => {
      setIsJoining(false);
      setJoinError("This room is full.");
      localStorage.removeItem('room');
    };

    socket.on('room_full', handleRoomFull);

    return () => {
      socket.off('room_full', handleRoomFull);
    };
  }, [socket]);

  useEffect(() => {
    const savedName = localStorage.getItem('name');
    const savedRoom = localStorage.getItem('room');
    const savedIsAdmin = localStorage.getItem('isAdmin') === 'true';
    const savedScreen = localStorage.getItem('screen');

    if (savedName && savedRoom) {
      if (setPlayerName) setPlayerName(savedName);
      setRoom(savedRoom);
      if (setAdmin) setAdmin(savedIsAdmin);
      if (savedScreen) setScreen(savedScreen);

      socket.emit('join_room', savedRoom, savedName);
    }
  }, [setAdmin, setPlayerName, setRoom, socket, setScreen]);

  useEffect(() => {
    if (!isJoining || !room || !name || !screen) return;

    localStorage.setItem('screen', screen);

    socket.emit('player_screen_updated', {
      room,
      playerName: name,
      screen
    });
  }, [socket, isJoining, room, name, screen]);



  const joinRoom = () => {
    if (room !== '' && name !== '') {
      setJoinError('');
      localStorage.setItem('name', name);
      localStorage.setItem('room', room);
      localStorage.setItem('screen', 'waiting');
      if (setPlayerName) setPlayerName(name);

      socket.emit('join_room', room, name);
      setIsJoining(true);
    } else {
      alert('Please enter a valid room and name.');
    }
  };

  const startRoom = () => {
    setJoinError('');

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
      localStorage.setItem('screen', 'waiting');
      if (setPlayerName) setPlayerName(name);

      socket.emit('join_room', strRoom, name);
      setIsJoining(true);
    }, 20);
  };

  // Get rid of the saved data
  const leaveGame = () => {
    if (window.confirm("Are you sure you want to leave the game? This will disconnect you from the current room.")) {
      localStorage.removeItem("name");
      localStorage.removeItem("room");
      localStorage.removeItem("isAdmin");
      localStorage.removeItem("screen");
      window.location.reload();
      socket.emit("disconnect");
    }
  };

  // Logout from authentication
  const handleLogout = async () => {
    await logoutAuth();
    navigate('/login');
  };

  return (
    <div className="home-screen-container">
      <Events />
      <SettingsMenu />
      {isMobilePortrait && (
        <div className="rotate-device-overlay">
          <div className="rotate-device-card">
            <FaRotate className="rotate-device-icon" />
            <p>Please rotate your phone</p>
          </div>
        </div>
      )}
      {screen == "waiting" && <>
        <div className="home-title-card-wrap">
          <img className="home-title-card" src="/TitleCard.png" alt="Cyber Lock" />
        </div>
      </>}

      {!isJoining ? (
        <div className="case">
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
            {joinError && <div className="error-message">{joinError}</div>}
            <button onClick={joinRoom}>Join Room</button>
            <button onClick={startRoom}>Start Room</button>
          </div>
        </div>
      ) : (
        <div>
          {screen === "waiting" && <WaitingRoom />}
          {screen === "characterSelect" && <CharacterSelect />}
          {screen === "characterBuilder" && <CharacterBuilder />}
          {screen === "characterBuilderPart2" && <CharacterBuilderPart2 />}
          {screen === "main" && <Main />}
          {screen !== "main" && <button className="leave" onClick={leaveGame}>Leave Game</button>}
          {screen === "levelup" && <LevelUp />}
          {screen === "chooseAbilities" && <ChooseAbilities />}
        </div>
      )}
    </div>
  );
}

export default HomeScreen;