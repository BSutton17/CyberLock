import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import http from 'http';
import { Server } from 'socket.io';
import { initializeDatabase } from './config/database.js';
import { authenticateToken } from './middleware/auth.js';
import authRoutes from './routes/auth.js';

dotenv.config();

const app = express();
const server = http.createServer(app);

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? process.env.CLIENT_URL 
    : 'http://localhost:5173',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Socket.io setup
const io = new Server(server, {
  cors: {
    origin: 'http://localhost:5173',
    methods: ['GET', 'POST'],
  },
});

// Initialize database
await initializeDatabase();

// Routes
app.use('/auth', authRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'Server is running' });
});

// Test protected endpoint
app.get('/api/protected', authenticateToken, (req, res) => {
  res.json({
    message: 'This is a protected route',
    user: req.user,
  });
});

// Socket.io events
let rooms = {};
let playerNames = {};
let playerRooms = {};

io.on('connection', (socket) => {
  console.log('A user connected:', socket.id);

  socket.on('startGame', () => {
    io.emit('gameStarted');
  });

  socket.on('join_room', (room, name) => {
    socket.join(room);

    if (!rooms[room]) {
      rooms[room] = { players: [] };
    }

    const isAdmin = rooms[room].players.length === 0;
    io.to(room).emit('setAdmin', isAdmin);

    if (!rooms[room].players.includes(name)) {
      rooms[room].players.push(name);
      playerNames[socket.id] = name;
      playerRooms[socket.id] = room;
    }

    io.to(room).emit('updatePlayerList', rooms[room].players);
  });

  socket.on('disconnect', () => {
    console.log('A user disconnected:', socket.id);

    const playerName = playerNames[socket.id];
    const room = playerRooms[socket.id];

    if (room && rooms[room]) {
      rooms[room].players = rooms[room].players.filter(name => name !== playerName);
      io.to(room).emit('updatePlayerList', rooms[room].players);

      if (rooms[room].players.length === 0) {
        delete rooms[room];
      }
    }
    delete playerNames[socket.id];
    delete playerRooms[socket.id];
  });
});

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`✓ Server running on port ${PORT}`);
});