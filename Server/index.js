const express = require("express");
const app = express();
const http = require("http");
const cors = require("cors");
const { Server } = require("socket.io");

app.use(cors());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "http://localhost:5173",
    methods: ["GET", "POST"],
  },
});

let rooms = {};
let playerNames = {};
let playerRooms = {};
let combatSessions = {};

function calculateTurnOrder(room) {
  const players = rooms[room]?.players || [];
  const enemies = combatSessions[room]?.enemies || [];

  let characters = [];

  players.forEach(player => {
    const character = rooms[room]?.characterSelections[player];
    characters.push({ 
      type: 'ally',
      id: player, 
      speed: character?.stats.speed || 0 
    });
  });

  enemies.forEach(enemy => {
    characters.push({ 
      type: 'enemy',
      id: enemy.id, 
      speed: enemy.stats.speed || 0 
    });
  });

  return characters.sort((a, b) => b.speed - a.speed);
}

io.on('connection', (socket) => {
  console.log('A user connected');

  socket.on("startGame", (room) => {
    io.to(room).emit("gameStarted", { room, players: rooms[room]?.players || [] });
  });

  socket.on("character_selected", ({ room, playerName, character }) => {
    if (rooms[room]) {
      if (!rooms[room].characterSelections) {
        rooms[room].characterSelections = {};
      }
      rooms[room].characterSelections[playerName] = character;
      io.to(room).emit("update_character_selections", rooms[room].characterSelections);
    }
  });

  socket.on("character_removed", ({ room, playerName }) => {
    if (rooms[room] && rooms[room].characterSelections) {
      delete rooms[room].characterSelections[playerName];
      io.to(room).emit("update_character_selections", rooms[room].characterSelections);
    }
  });

  socket.on("player_ready", ({ room, playerName }) => {
    if (rooms[room]) {
      if (!rooms[room].readyPlayers) {
        rooms[room].readyPlayers = [];
      }
      if (!rooms[room].readyPlayers.includes(playerName)) {
        rooms[room].readyPlayers.push(playerName);
      }
      io.to(room).emit("update_ready_status", rooms[room].readyPlayers);
      
      // Check if all players are ready and have selected characters
      const allReady = rooms[room].players.length > 0 && 
                       rooms[room].players.every(player => 
                         rooms[room].readyPlayers.includes(player) && 
                         rooms[room].characterSelections && 
                         rooms[room].characterSelections[player]
                       );
      
      if (allReady) {
        io.to(room).emit("start_main_game");
      }
    }
  });

  socket.on("start_combat", ({ room, generatedEnemies }) => {
    console.log('Starting combat for room:', room, 'with enemies:', generatedEnemies);
    if(!combatSessions[room]) {
      combatSessions[room] = {};
    }

    combatSessions[room].enemies = generatedEnemies;

    const turnOrder = calculateTurnOrder(room);
    combatSessions[room].turnOrder = turnOrder;
    combatSessions[room].currentTurnIndex = 0;

    io.to(room).emit("phase_changed_combat", { 
      enemies: combatSessions[room].enemies, 
      turnOrder: turnOrder,
      currentTurn: turnOrder[0]
     });
  });

  socket.on("end_turn", ({ room, playerName }) => {
    const combat = combatSessions[room];

    const currentTurn = combat?.turnOrder[combat.currentTurnIndex];
    if (currentTurn.id !== playerName) return;

    combat.currentTurnIndex++;
    if(combat.currentTurnIndex >= combat.turnOrder.length) {
      combat.currentTurnIndex = 0;
    }

    const nextTurn = combat.turnOrder[combat.currentTurnIndex];
    io.to(room).emit("turn_changed", { currentTurn: nextTurn });

  });



  socket.on("join_room", (room, name) => {
    socket.join(room);
  
    if (!rooms[room]) {
      rooms[room] = { players: [] };
    }

    const isAdmin = rooms[room].players.length === 0;
    socket.emit("setAdmin", isAdmin);
  
    if (!rooms[room].players.includes(name)) {
      rooms[room].players.push(name);
      playerNames[socket.id] = name;
      playerRooms[socket.id] = room;
    }
  
    io.to(room).emit("updatePlayerList", rooms[room].players);
    
    // Send existing character selections to the newly joined player
    if (rooms[room].characterSelections) {
      socket.emit("update_character_selections", rooms[room].characterSelections);
    }
  });

  socket.on("disconnect", () => {
    console.log("A user disconnected");
    
    const playerName = playerNames[socket.id];
    const room = playerRooms[socket.id];
    
    if (room && rooms[room]) {
      rooms[room].players = rooms[room].players.filter(name => name !== playerName);
      
      io.to(room).emit("updatePlayerList", rooms[room].players);
      
      if (rooms[room].players.length === 0) {
        delete rooms[room];
      }
    }
    delete playerNames[socket.id];
    delete playerRooms[socket.id];
  });
});

server.listen(process.env.PORT || 3001, () => {
  console.log("SERVER RUNNING");
});