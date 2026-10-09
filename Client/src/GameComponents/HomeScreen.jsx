import "../App.css";
import "./HomeScreen.css";
import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../Components/AuthContext";
import WaitingRoom from "./WaitingRoom";
import CharacterSelect from "./CharacterSelect/CharacterSelect";
import Main from "./Main/Main";
import Events from "../Components/Events";
import { useGameContext } from "../Components/Context";
import CharacterBuilder from "./CharacterBuilder/CharacterBuilder";
import LevelUp from "./LevelUp/LevelUp.jsx"
import ChooseAbilities from "./ChooseAbilities/ChooseAbilities.jsx"
import SettingsMenu from "../Components/SettingsMenu";
import MockToggle from "../Components/MockToggle";
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

const SAVED_KEYS = ['name', 'room', 'screen', 'isAdmin'];

const readSaved = (key) => {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
};

const clearSavedGame = () => {
  try {
    SAVED_KEYS.forEach(key => localStorage.removeItem(key));
  } catch {
    // ignore
  }
};

function HomeScreen() {
  const [joinError, setJoinError] = useState('');
  const [isMobilePortrait, setIsMobilePortrait] = useState(getIsMobilePortrait);
  const [isJoining, setIsJoining] = useState(() => !!(readSaved('name') && readSaved('room')));
  const [isBusy, setIsBusy] = useState(false);
  const { socket, room, setRoom, screen, setPlayerName, setAdmin, setScreen, musicVolume, isMuted, connectionStatus } = useGameContext();
  const navigate = useNavigate();
  const { user, logout: logoutAuth } = useAuth();
  const [displayName, setDisplayName] = useState(() => readSaved('displayName') || user?.name || '');

  const titleMusicRef = useRef(null);

  useEffect(() => {
    if (!titleMusicRef.current) {
      titleMusicRef.current = new Audio('/audio/Title.mp3');
      titleMusicRef.current.loop = true;
    }

    const screensWithTitleMusic = [
      "waiting",
      "characterSelect",
      "characterBuilder",
      "chooseAbilities"
    ];

    const shouldPlayTitleMusic = !isJoining || screensWithTitleMusic.includes(screen);

    if (shouldPlayTitleMusic) {
      const playPromise = titleMusicRef.current.play();
      if (playPromise !== undefined) {
          playPromise.catch(() => {
              // Browsers block autoplay until the first click; music starts after that.
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

  // Joins a room and applies the server's answer (it may adjust our name or refuse us).
  const joinRoomCode = useCallback((roomCode, requestedName) => new Promise((resolve) => {
    socket.emit('join_room', roomCode, requestedName, (result = {}) => {
      if (result.ok) {
        try {
          localStorage.setItem('name', result.playerName);
          localStorage.setItem('room', result.room);
        } catch {
          // ignore
        }
        setPlayerName(result.playerName);
        setRoom(result.room);
        setAdmin(!!result.isAdmin);
        setJoinError('');
        setIsJoining(true);
      }
      resolve(result);
    });
  }), [socket, setPlayerName, setRoom, setAdmin]);

  // Rejoin the saved game every time the socket (re)connects: after a refresh, a Wi-Fi blip,
  // or the server waking up.
  useEffect(() => {
    const rejoinSavedGame = async () => {
      const savedName = readSaved('name');
      const savedRoom = readSaved('room');
      if (!savedName || !savedRoom) return;

      const savedScreen = readSaved('screen');
      if (savedScreen) setScreen(savedScreen);

      const result = await joinRoomCode(savedRoom, savedName);
      if (!result.ok) {
        clearSavedGame();
        setIsJoining(false);
        setScreen('waiting');
        setRoom('');
        setJoinError(result.message || 'Could not rejoin your last game.');
      }
    };

    if (socket.connected) rejoinSavedGame();
    socket.on('connect', rejoinSavedGame);
    return () => {
      socket.off('connect', rejoinSavedGame);
    };
  }, [socket, joinRoomCode, setScreen, setRoom]);

  useEffect(() => {
    const handleRoomFull = () => {
      setIsJoining(false);
      setJoinError("This room is full.");
      try { localStorage.removeItem('room'); } catch { /* ignore */ }
    };

    socket.on('room_full', handleRoomFull);

    return () => {
      socket.off('room_full', handleRoomFull);
    };
  }, [socket]);

  useEffect(() => {
    if (!isJoining || !room || !screen) return;

    try { localStorage.setItem('screen', screen); } catch { /* ignore */ }

    socket.emit('player_screen_updated', { room, screen });
  }, [socket, isJoining, room, screen]);

  const resolvedName = () => {
    const trimmed = displayName.trim();
    if (trimmed) {
      try { localStorage.setItem('displayName', trimmed); } catch { /* ignore */ }
    }
    return trimmed || user?.name || 'Operative';
  };

  const joinRoom = async () => {
    const code = String(room || '').trim();
    if (!/^\d{4,6}$/.test(code)) {
      setJoinError('Enter the 4-digit room code your host shared.');
      return;
    }
    setIsBusy(true);
    try { localStorage.setItem('screen', 'waiting'); } catch { /* ignore */ }
    setScreen('waiting');
    const result = await joinRoomCode(code, resolvedName());
    setIsBusy(false);
    if (!result.ok) setJoinError(result.message || 'Could not join that room.');
  };

  const startRoom = () => {
    setJoinError('');
    setIsBusy(true);
    socket.emit('create_room', {}, async ({ room: newRoom } = {}) => {
      if (!newRoom) {
        setIsBusy(false);
        setJoinError('Could not create a room. Try again.');
        return;
      }
      try { localStorage.setItem('screen', 'waiting'); } catch { /* ignore */ }
      setScreen('waiting');
      const result = await joinRoomCode(newRoom, resolvedName());
      setIsBusy(false);
      if (!result.ok) setJoinError(result.message || 'Could not join the new room.');
    });
  };

  const leaveGame = () => {
    if (window.confirm("Are you sure you want to leave the game? This will remove you from the current room.")) {
      socket.emit('leave_room');
      clearSavedGame();
      window.location.reload();
    }
  };

  const handleLogout = () => {
    if (isJoining) socket.emit('leave_room');
    clearSavedGame();
    logoutAuth();
    navigate('/login');
  };

  return (
    <div className="home-screen-container">
      <Events />
      {screen !== 'main' && <SettingsMenu />}
      <MockToggle inRoom={isJoining && screen !== 'main'} />
      {connectionStatus === 'reconnecting' && (
        <div className="connection-banner" role="status">Connection lost. Reconnecting...</div>
      )}
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
          <img className="home-title-card" src="/ui/TitleCard.png" alt="Cyber Lock" />
        </div>
      </>}

      {!isJoining ? (
        <div className="case">
          <div className="name_input">
            <div className="user-header">
              <div className="user-info">
                <span className="welcome-text">Signed in as <strong>{user?.name}</strong></span>
              </div>
              <button className="logout-btn" onClick={handleLogout}>
                Sign out
              </button>
            </div>
            <input
              placeholder="Display name"
              type="text"
              maxLength={24}
              value={displayName}
              onChange={(event) => setDisplayName(event.target.value)}
              aria-label="Display name"
            />
            <input
              placeholder="Room code"
              inputMode="numeric"
              maxLength={6}
              value={room}
              onChange={(event) => setRoom(event.target.value.replace(/\D/g, ''))}
              onKeyDown={(event) => event.key === 'Enter' && joinRoom()}
              aria-label="Room code"
            />
            {joinError && <div className="error-message" role="alert">{joinError}</div>}
            <button onClick={joinRoom} disabled={isBusy || connectionStatus !== 'connected'}>Join Room</button>
            <button onClick={startRoom} disabled={isBusy || connectionStatus !== 'connected'}>Start Room</button>
            {connectionStatus !== 'connected' && <div className="connection-hint">Connecting to the server...</div>}
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
          {screen === "chooseAbilities" && <ChooseAbilities />}
        </div>
      )}
    </div>
  );
}

export default HomeScreen;
