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

  socket.on("startGame", () => {
    io.emit("gameStarted");
  });

  socket.on("join_room", (room, name) => {
    socket.join(room);
  
    if (!rooms[room]) {
      rooms[room] = { players: [] };
    }

    const isAdmin = rooms[room].players.length === 0;
    io.to(room).emit("setAdmin", isAdmin);
  
    if (!rooms[room].players.includes(name)) {
      rooms[room].players.push(name);
      playerNames[socket.id] = name;
      playerRooms[socket.id] = room;
    }
  
    io.to(room).emit("updatePlayerList", rooms[room].players);
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