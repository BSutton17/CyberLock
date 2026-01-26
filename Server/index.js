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
      //remove a player from a room when they disconnect
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