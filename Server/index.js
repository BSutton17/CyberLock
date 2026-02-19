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
const AI_API_URL = process.env.AI_API_URL || 'http://localhost:8000';
const AI_API_KEY = process.env.AI_API_KEY || '';

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
const MAX_PARTY_SIZE = 6;

function isEnemyAlive(enemy) {
  return enemy && !enemy.isDeadBody && (enemy.stats?.health || 0) > 0;
}

function markEnemyAsCorpse(enemy) {
  if (!enemy) return enemy;
  return {
    ...enemy,
    isDeadBody: true,
    corpseTurnsRemaining: 1,
    stats: {
      ...enemy.stats,
      health: 0
    }
  };
}

function tickEnemyCorpses(combat) {
  if (!combat?.enemies?.length) return false;

  const previousLength = combat.enemies.length;
  combat.enemies = combat.enemies
    .map(enemy => {
      if (!enemy?.isDeadBody) return enemy;
      const turnsRemaining = (enemy.corpseTurnsRemaining ?? 1) - 1;
      if (turnsRemaining <= 0) return null;
      return {
        ...enemy,
        corpseTurnsRemaining: turnsRemaining
      };
    })
    .filter(Boolean);

  return combat.enemies.length !== previousLength;
}

function normalizeEnemiesForCombat(incomingEnemies = [], existingEnemies = []) {
  return incomingEnemies.map(incomingEnemy => {
    const existingEnemy = existingEnemies.find(enemy => enemy.id === incomingEnemy.id);
    const alreadyCorpse = existingEnemy?.isDeadBody;

    if (alreadyCorpse) {
      return {
        ...incomingEnemy,
        isDeadBody: true,
        corpseTurnsRemaining: existingEnemy.corpseTurnsRemaining ?? 1,
        stats: {
          ...incomingEnemy.stats,
          health: 0
        }
      };
    }

    if ((incomingEnemy.stats?.health || 0) <= 0) {
      return markEnemyAsCorpse(incomingEnemy);
    }

    return {
      ...incomingEnemy,
      isDeadBody: false,
      corpseTurnsRemaining: 0
    };
  });
}

function removeDeadEnemiesFromTurnOrder(combat) {
  if (!combat?.turnOrder) return;
  const aliveEnemyIds = new Set((combat.enemies || []).filter(isEnemyAlive).map(enemy => enemy.id));
  combat.turnOrder = combat.turnOrder.filter(turn => turn.type !== 'enemy' || aliveEnemyIds.has(turn.id));

  if (combat.currentTurnIndex >= combat.turnOrder.length) {
    combat.currentTurnIndex = 0;
  }
}

function getAlliedEnemyIds(combat, actingEnemyId) {
  return (combat.enemies || [])
    .filter(isEnemyAlive)
    .map(enemy => enemy.id)
    .filter(id => id !== actingEnemyId);
}

function getEnemySpawnDepth(enemy) {
  const behavior = enemy?.behavior || 'aggressive';
  const role = enemy?.role || 'DPS';

  if (role === 'Support') return 0;
  if (behavior === 'defensive') return 1;
  if (behavior === 'aggressive') return 2;
  if (behavior === 'intelligent') return 1;
  return 1;
}

function generateSpreadColumns(count, totalCols = 10) {
  if (count <= 0) return [];
  if (count === 1) return [Math.floor(totalCols / 2)];

  const baseColumns = Array.from({ length: count }, (_, index) =>
    Math.round((index * (totalCols - 1)) / (count - 1))
  );

  const used = new Set();
  return baseColumns.map((baseCol) => {
    if (!used.has(baseCol)) {
      used.add(baseCol);
      return baseCol;
    }

    for (let offset = 1; offset < totalCols; offset++) {
      const left = baseCol - offset;
      const right = baseCol + offset;

      if (left >= 0 && !used.has(left)) {
        used.add(left);
        return left;
      }

      if (right < totalCols && !used.has(right)) {
        used.add(right);
        return right;
      }
    }

    return baseCol;
  });
}

function generateEnemySpawnPositions(enemies = []) {
  const sortedEnemies = [...enemies].sort((firstEnemy, secondEnemy) =>
    getEnemySpawnDepth(secondEnemy) - getEnemySpawnDepth(firstEnemy)
  );

  const columns = generateSpreadColumns(sortedEnemies.length, 10);
  const positions = {};

  sortedEnemies.forEach((enemy, index) => {
    positions[enemy.id] = {
      row: getEnemySpawnDepth(enemy),
      col: columns[index] ?? 0
    };
  });

  return positions;
}

async function requestAiNarration(payload) {
  if (!AI_API_URL) {
    throw new Error('AI_API_URL is not configured');
  }

  const response = await fetch(`${AI_API_URL}/game/event`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(AI_API_KEY ? { 'x-api-key': AI_API_KEY } : {})
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`AI API error ${response.status}: ${errorText}`);
  }

  return response.json();
}

function calculateTurnOrder(room) {
  const players = rooms[room]?.players || [];
  const enemies = (combatSessions[room]?.enemies || []).filter(isEnemyAlive);

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

  socket.on('ai_request', async ({ room, eventType, message, data, scenarioType, characterName, playerName }) => {
    if (!room || !eventType) return;

    try {
      const resolvedPlayer = playerName || playerNames[socket.id] || 'system';
      const aiResponse = await requestAiNarration({
        session_id: room,
        event_type: eventType,
        message,
        data,
        scenario_type: scenarioType,
        character_name: characterName || resolvedPlayer,
        use_memory: true
      });

      io.to(room).emit('ai_message', {
        eventType,
        response: aiResponse.response,
        from: resolvedPlayer
      });
    } catch (error) {
      console.error('[AI] Request failed:', error.message);
      socket.emit('ai_error', { error: error.message });
    }
  });

  socket.on("startGame", (room) => {
    io.to(room).emit("gameStarted", { room, players: rooms[room]?.players || [] });
  });

  socket.on("reset_game", ({ room }) => {
    console.log(`[RESET] Resetting game for room: ${room}`);
    if (rooms[room]) {
      // Clear all game-related data but keep the room and players
      rooms[room].characterSelections = {};
      rooms[room].readyPlayers = [];
      rooms[room].abilitySelections = {};
      rooms[room].abilityReadyPlayers = [];
      rooms[room].attributePoints = {};
      rooms[room].attributeReadyPlayers = [];
      rooms[room].sortedAttributeAllocations = {};
      
      // Clear combat session
      if (combatSessions[room]) {
        delete combatSessions[room];
      }
      
      // Notify all clients to reset
      io.to(room).emit("game_reset");
      console.log(`[RESET] Game reset complete for room: ${room}`);
    }
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
    const enemyPositions = generateEnemySpawnPositions(generatedEnemies);
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
          alliedEnemies: getAlliedEnemyIds(combat, firstTurn.id)
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
        combatSessions[room].enemies = normalizeEnemiesForCombat(updatedEnemies, combatSessions[room].enemies || []);
        removeDeadEnemiesFromTurnOrder(combatSessions[room]);
        console.log('[SERVER] Updated enemies in combatSession:', updatedEnemies.map(e => ({ id: e.id, speed: e.stats.speed })));
      }
      
      io.to(room).emit("enemies_updated", { enemies: combatSessions[room]?.enemies || updatedEnemies });
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
      combat.enemies = normalizeEnemiesForCombat(updatedEnemies, combat.enemies || []);
      removeDeadEnemiesFromTurnOrder(combat);
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
          alliedEnemies: getAlliedEnemyIds(combat, firstTurn.id)
        });
      }
      return;
    }
    
    if (currentTurn.id !== playerName) return;

    combat.currentTurnIndex++;
    if(combat.currentTurnIndex >= combat.turnOrder.length) {
      combat.currentTurnIndex = 0;
    }

    const removedCorpses = tickEnemyCorpses(combat);
    
    if (combat.turnOrder.length === 0) {
      io.to(room).emit('combat_ended', { result: 'all_dead' });
      return;
    }

    const nextTurn = combat.turnOrder[combat.currentTurnIndex];
    io.to(room).emit("turn_changed", { currentTurn: nextTurn });
    if (removedCorpses) {
      io.to(room).emit("enemies_updated", { enemies: combat.enemies });
    }
    
    // If next turn is an enemy, trigger enemy AI
    if (nextTurn.type === 'enemy') {
      io.to(room).emit("execute_enemy_turn", { 
        enemyId: nextTurn.id,
        allies: rooms[room]?.players || [],
        alliedEnemies: getAlliedEnemyIds(combat, nextTurn.id)
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

    const removedCorpses = tickEnemyCorpses(combat);
    
    if (combat.turnOrder.length === 0) {
      io.to(room).emit('combat_ended', { result: 'all_dead' });
      return;
    }

    const nextTurn = combat.turnOrder[combat.currentTurnIndex];
    io.to(room).emit("turn_changed", { currentTurn: nextTurn });
    if (removedCorpses) {
      io.to(room).emit("enemies_updated", { enemies: combat.enemies });
    }
    
    // Chain enemy turns if needed
    if (nextTurn.type === 'enemy') {
      io.to(room).emit("execute_enemy_turn", { 
        enemyId: nextTurn.id,
        allies: rooms[room]?.players || [],
        alliedEnemies: getAlliedEnemyIds(combat, nextTurn.id)
      });
    }
  });

  socket.on("enemy_moved", ({ room, enemyId, path, stepDelay }) => {
    io.to(room).emit("enemy_moved", { enemyId, path, stepDelay });
  });

  socket.on("player_moved", ({ room, playerName, position }) => {
    io.to(room).emit("player_moved", { playerName, position });
  });

  socket.on("reduce_cooldown", ({ room, targetPlayer, value }) => {
    console.log(`[SERVER] Cooldown reduction for ${targetPlayer} by ${value} in room ${room}`);
    io.to(room).emit("cooldown_reduced", { targetPlayer, value });
  });

  socket.on("reset_cooldowns", ({ room, targetPlayer }) => {
    console.log(`[SERVER] Cooldown reset for ${targetPlayer} in room ${room}`);
    io.to(room).emit("cooldowns_reset", { targetPlayer });
  });

  socket.on("enemy_damaged", ({ room, enemyId, damage, newHealth }) => {
    const combat = combatSessions[room];
    if (!combat) return;

    // Update enemy health in combat session
    combat.enemies = combat.enemies.map(e => {
      if (e.id !== enemyId) return e;
      if (newHealth <= 0) return markEnemyAsCorpse(e);
      return {
        ...e,
        stats: { ...e.stats, health: newHealth },
        isDeadBody: false,
        corpseTurnsRemaining: 0
      };
    });

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
            alliedEnemies: getAlliedEnemyIds(combat, nextTurn.id)
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
      
      // Check if all players are dead (no ally turns left)
      const allyTurnsRemaining = combat.turnOrder.filter(turn => turn.type === 'ally').length;
      if (allyTurnsRemaining === 0) {
        console.log('[SERVER] All players dead - ending combat');
        io.to(room).emit('combat_ended', { result: 'all_dead' });
        return;
      }
      
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
            alliedEnemies: getAlliedEnemyIds(combat, nextTurn.id)
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
    if (!rooms[room]) {
      rooms[room] = { players: [] };
    }

    const playerAlreadyInRoom = rooms[room].players.includes(name);
    const roomIsFull = rooms[room].players.length >= MAX_PARTY_SIZE;

    if (roomIsFull && !playerAlreadyInRoom) {
      socket.emit("room_full", {
        room,
        maxPlayers: MAX_PARTY_SIZE,
      });
      return;
    }

    socket.join(room);

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

  socket.on("level_up",() => {
    const room = playerRooms[socket.id];
  
    io.to(room).emit('level_up');
  });
});



// Start Server
server.listen(PORT, () => {
  console.log(`✓ Server is running on http://localhost:${PORT}`);
});