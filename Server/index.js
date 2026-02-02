import express from 'express';
import http from 'http';
import cors from 'cors';
import { Server } from 'socket.io';
import dotenv from 'dotenv';
import { initializeDatabase } from './config/database.js';
import authRoutes from './routes/auth.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

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
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

// Initialize Database
try {
  await initializeDatabase();
} catch (error) {
  console.error('Failed to initialize database:', error);
  process.exit(1);
}

// Authentication Routes
app.use('/api/auth', authRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'Server is running' });
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
      
      const allReady = rooms[room].players.length > 0 && 
                       rooms[room].players.every(player => 
                         rooms[room].readyPlayers.includes(player) && 
                         rooms[room].characterSelections && 
                         rooms[room].characterSelections[player]
                       );
      
      // if (allReady) {
      //   io.to(room).emit("start_main_game");
      // }
       if (allReady) {
        io.to(room).emit("character_customization");
      }
    }
  });

  socket.on("select_ability", ({ room, playerName, abilities }) => {
    if (rooms[room]) {
      if (!rooms[room].abilitySelections) {
        rooms[room].abilitySelections = {};
      }
      rooms[room].abilitySelections[playerName] = abilities;
      io.to(room).emit("ability_selections_updated", rooms[room].abilitySelections);
    }
  });

  socket.on("ability_ready", ({ room, playerName }) => {
    if (rooms[room]) {
      if (!rooms[room].abilityReadyPlayers) {
        rooms[room].abilityReadyPlayers = [];
      }
      if (!rooms[room].abilityReadyPlayers.includes(playerName)) {
        rooms[room].abilityReadyPlayers.push(playerName);
      }
      io.to(room).emit("ability_ready_status", rooms[room].abilityReadyPlayers);
      
      const allAbilityReady = rooms[room].players.length > 0 && 
                              rooms[room].players.every(player => 
                                rooms[room].abilityReadyPlayers.includes(player)
                              );
      
      if (allAbilityReady) {
        io.to(room).emit("start_game");
      }
    }
  });

  socket.on("update_attribute_points", ({ room, playerName, points }) => {
    if (rooms[room]) {
      if (!rooms[room].attributePoints) {
        rooms[room].attributePoints = {};
      }
      rooms[room].attributePoints[playerName] = points;
      io.to(room).emit("attribute_points_updated", rooms[room].attributePoints);
    }
  });

  socket.on("attribute_ready", ({ room, playerName, sortedAttributes }) => {
    if (rooms[room]) {
      if (!rooms[room].attributeReadyPlayers) {
        rooms[room].attributeReadyPlayers = [];
      }
      if (!rooms[room].attributeReadyPlayers.includes(playerName)) {
        rooms[room].attributeReadyPlayers.push(playerName);
      }
      
      // Store sorted attributes
      if (!rooms[room].sortedAttributeAllocations) {
        rooms[room].sortedAttributeAllocations = {};
      }
      rooms[room].sortedAttributeAllocations[playerName] = sortedAttributes;
      
      io.to(room).emit("attribute_ready_status", rooms[room].attributeReadyPlayers);
      io.to(room).emit("attribute_allocations_updated", rooms[room].sortedAttributeAllocations);
      
      const allAttributeReady = rooms[room].players.length > 0 && 
                                rooms[room].players.every(player => 
                                  rooms[room].attributeReadyPlayers.includes(player)
                                );
      
      if (allAttributeReady) {
        io.to(room).emit("start_main_game");
      }
    }
  });

  socket.on("start_combat", ({ room, generatedEnemies }) => {
    console.log('Starting combat for room:', room);
    if(!combatSessions[room]) {
      combatSessions[room] = {};
    }

    combatSessions[room].enemies = generatedEnemies;

    // Generate enemy positions (server decides so all clients see same positions)
    const topRow = Math.floor(Math.random() * 2);
    const enemyPositions = {};
    generatedEnemies.forEach((enemy, index) => {
      enemyPositions[enemy.id] = { row: topRow, col: index + 3 };
    });
    combatSessions[room].enemyPositions = enemyPositions;

    const turnOrder = calculateTurnOrder(room);
    combatSessions[room].turnOrder = turnOrder;
    combatSessions[room].currentTurnIndex = 0;

    const firstTurn = turnOrder[0];
    
    // Broadcast character selections to ensure all players have current data
    const characterSelections = rooms[room]?.characterSelections || {};
    
    io.to(room).emit("phase_changed_combat", { 
      enemies: combatSessions[room].enemies, 
      enemyPositions: enemyPositions,
      turnOrder: turnOrder,
      currentTurn: firstTurn,
      characterSelections: characterSelections
     });
     
    // If first turn is an enemy, trigger enemy AI after positions are set
    if (firstTurn.type === 'enemy') {
      const combat = combatSessions[room];
      
      // Small delay to ensure client has set up enemy positions
      setTimeout(() => {
        io.to(room).emit("execute_enemy_turn", { 
          enemyId: firstTurn.id,
          allies: rooms[room]?.players || [],
          alliedEnemies: combat.enemies.map(e => e.id).filter(id => id !== firstTurn.id)
        });
      }, 500);
    }
  });

  socket.on("ability_used", ({ room, playerName, abilityId, result, updatedPlayerCharacters, updatedEnemies, updatedActiveEffects }) => {
    // Update character selections with the new stats
    if (rooms[room] && updatedPlayerCharacters) {
      rooms[room].characterSelections = {
        ...rooms[room].characterSelections,
        ...updatedPlayerCharacters
      };
      
      io.to(room).emit("characters_updated", updatedPlayerCharacters);
    }
    
    // Update enemies with new stats (for debuffs/buffs)
    if (rooms[room] && updatedEnemies) {
      if (combatSessions[room]) {
        combatSessions[room].enemies = updatedEnemies;
        console.log('[SERVER] Updated enemies in combatSession:', updatedEnemies.map(e => ({ id: e.id, speed: e.stats.speed })));
      }
      
      io.to(room).emit("enemies_updated", { enemies: updatedEnemies });
    }
    
    // Broadcast active effects so all players see buff/debuff indicators
    if (updatedActiveEffects) {
      io.to(room).emit("active_effects_updated", updatedActiveEffects);
    }
  });

  socket.on("end_turn", ({ room, playerName, updatedEnemies }) => {
    const combat = combatSessions[room];
    
    if (!combat) return;

    // Update enemies with any debuffs/buffs that were ticked
    if (updatedEnemies && Array.isArray(updatedEnemies)) {
      combat.enemies = updatedEnemies;
      console.log('[SERVER] Updated enemies on end_turn:', updatedEnemies.map(e => ({ id: e.id, speed: e.stats.speed, health: e.stats.health })));
    }

    const currentTurn = combat?.turnOrder[combat.currentTurnIndex];
    
    // Safety check for undefined currentTurn
    if (!currentTurn) {
      combat.currentTurnIndex = 0;
      if (combat.turnOrder.length === 0) {
        io.to(room).emit('combat_ended', { result: 'all_dead' });
        return;
      }
      const firstTurn = combat.turnOrder[0];
      io.to(room).emit("turn_changed", { currentTurn: firstTurn });
      if (firstTurn.type === 'enemy') {
        io.to(room).emit("execute_enemy_turn", { 
          enemyId: firstTurn.id,
          allies: rooms[room]?.players || [],
          alliedEnemies: combat.enemies.map(e => e.id).filter(id => id !== firstTurn.id)
        });
      }
      return;
    }
    
    if (currentTurn.id !== playerName) return;

    combat.currentTurnIndex++;
    if(combat.currentTurnIndex >= combat.turnOrder.length) {
      combat.currentTurnIndex = 0;
    }
    
    if (combat.turnOrder.length === 0) {
      io.to(room).emit('combat_ended', { result: 'all_dead' });
      return;
    }

    const nextTurn = combat.turnOrder[combat.currentTurnIndex];
    io.to(room).emit("turn_changed", { currentTurn: nextTurn });
    
    // If next turn is an enemy, trigger enemy AI
    if (nextTurn.type === 'enemy') {
      io.to(room).emit("execute_enemy_turn", { 
        enemyId: nextTurn.id,
        allies: rooms[room]?.players || [],
        alliedEnemies: combat.enemies.map(e => e.id).filter(id => id !== nextTurn.id)
      });
    }
  });

  socket.on("enemy_turn_complete", ({ room }) => {
    const combat = combatSessions[room];
    if (!combat) return;

    combat.currentTurnIndex++;
    if(combat.currentTurnIndex >= combat.turnOrder.length) {
      combat.currentTurnIndex = 0;
    }
    
    if (combat.turnOrder.length === 0) {
      io.to(room).emit('combat_ended', { result: 'all_dead' });
      return;
    }

    const nextTurn = combat.turnOrder[combat.currentTurnIndex];
    io.to(room).emit("turn_changed", { currentTurn: nextTurn });
    
    // Chain enemy turns if needed
    if (nextTurn.type === 'enemy') {
      io.to(room).emit("execute_enemy_turn", { 
        enemyId: nextTurn.id,
        allies: rooms[room]?.players || [],
        alliedEnemies: combat.enemies.map(e => e.id).filter(id => id !== nextTurn.id)
      });
    }
  });

  socket.on("enemy_moved", ({ room, enemyId, path, stepDelay }) => {
    io.to(room).emit("enemy_moved", { enemyId, path, stepDelay });
  });

  socket.on("player_moved", ({ room, playerName, position }) => {
    io.to(room).emit("player_moved", { playerName, position });
  });

  socket.on("enemy_damaged", ({ room, enemyId, damage, newHealth }) => {
    const combat = combatSessions[room];
    if (!combat) return;

    // Update enemy health in combat session
    combat.enemies = combat.enemies.map(e => 
      e.id === enemyId ? { ...e, stats: { ...e.stats, health: newHealth } } : e
    ).filter(e => e.stats.health > 0);

    // Remove dead enemy from turn order
    if (newHealth <= 0) {
      const currentTurn = combat.turnOrder[combat.currentTurnIndex];
      const wasCurrentTurn = currentTurn && currentTurn.id === enemyId;
      
      combat.turnOrder = combat.turnOrder.filter(turn => turn.id !== enemyId);
      console.log(`Enemy ${enemyId} defeated`);
      
      // If the dead enemy was the current turn, advance immediately
      if (wasCurrentTurn) {
        
        // Adjust index if needed
        if (combat.currentTurnIndex >= combat.turnOrder.length) {
          combat.currentTurnIndex = 0;
        }
        
        if (combat.turnOrder.length === 0) {
          io.to(room).emit('combat_ended', { result: 'all_dead' });
          return;
        }
        
        const nextTurn = combat.turnOrder[combat.currentTurnIndex];
        io.to(room).emit("turn_changed", { currentTurn: nextTurn });
        
        if (nextTurn.type === 'enemy') {
          io.to(room).emit("execute_enemy_turn", { 
            enemyId: nextTurn.id,
            allies: rooms[room]?.players || [],
            alliedEnemies: combat.enemies.map(e => e.id).filter(id => id !== nextTurn.id)
          });
        }
      }
    }

    // Broadcast updated enemies to all clients
    io.to(room).emit("enemies_updated", { enemies: combat.enemies });
  });

  socket.on("player_damaged", ({ room, playerName, damage, newHealth, updatedActiveEffects }) => {
    const combat = combatSessions[room];
    if (combat && newHealth <= 0) {
      const currentTurn = combat.turnOrder[combat.currentTurnIndex];
      const wasCurrentTurn = currentTurn && currentTurn.id === playerName;
      
      // Remove dead player from turn order
      combat.turnOrder = combat.turnOrder.filter(turn => turn.id !== playerName);
      console.log(`Player ${playerName} died`);
      
      // If the dead player was the current turn, advance immediately
      if (wasCurrentTurn) {
        
        // Adjust index if needed
        if (combat.currentTurnIndex >= combat.turnOrder.length) {
          combat.currentTurnIndex = 0;
        }
        
        if (combat.turnOrder.length === 0) {
          io.to(room).emit('combat_ended', { result: 'all_dead' });
          return;
        }
        
        const nextTurn = combat.turnOrder[combat.currentTurnIndex];
        io.to(room).emit("turn_changed", { currentTurn: nextTurn });
        
        if (nextTurn.type === 'enemy') {
          io.to(room).emit("execute_enemy_turn", { 
            enemyId: nextTurn.id,
            allies: rooms[room]?.players || [],
            alliedEnemies: combat.enemies.map(e => e.id).filter(id => id !== nextTurn.id)
          });
        }
      }
    }
    
    // Broadcast updated active effects if bonus health was consumed
    if (updatedActiveEffects) {
      io.to(room).emit("active_effects_updated", updatedActiveEffects);
    }
    
    // Broadcast player health update to all clients in the room
    io.to(room).emit("player_health_updated", { playerName, newHealth });
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

// Start Server
server.listen(PORT, () => {
  console.log(`✓ Server is running on http://localhost:${PORT}`);
});