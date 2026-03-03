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
const CF_ACCESS_CLIENT_ID = process.env.CF_ACCESS_CLIENT_ID || '';
const CF_ACCESS_CLIENT_SECRET = process.env.CF_ACCESS_CLIENT_SECRET || '';

const allowedOrigins = [
  process.env.CLIENT_URL,
  'http://localhost:5173',
  'http://localhost:5713',
  'http://10.255.255.2:5173',
  'http://100.69.32.229:5173',
  'https://cyber-lock.online',
  'http://cyber-lock.online'
].filter(Boolean);

const localDevOriginPattern = /^https?:\/\/(localhost|127\.0\.0\.1|10\.\d+\.\d+\.\d+|192\.168\.\d+\.\d+|172\.(1[6-9]|2\d|3[0-1])\.\d+\.\d+):(5173|5713)$/;

const normalizeOrigin = (origin) => {
  if (!origin || typeof origin !== 'string') return origin;
  return origin.endsWith('/') ? origin.slice(0, -1) : origin;
};

const isAllowedOrigin = (origin) => {
  const normalizedOrigin = normalizeOrigin(origin);
  if (!normalizedOrigin) return true;
  return allowedOrigins.includes(normalizedOrigin) || localDevOriginPattern.test(normalizedOrigin);
};

const server = http.createServer(app);

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors({
  origin: (origin, callback) => {
    if (isAllowedOrigin(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Socket.io setup
const io = new Server(server, {
  cors: {
    origin: (origin, callback) => {
      if (isAllowedOrigin(origin)) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
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

// Serve static files from React build (Production only)
if (process.env.NODE_ENV === 'production') {
  const path = await import('path');
  const fs = await import('fs');
  const { fileURLToPath } = await import('url');
  
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  
  const clientDistPath = path.join(__dirname, '../Client/dist');
  const clientIndexPath = path.join(clientDistPath, 'index.html');

  if (fs.existsSync(clientIndexPath)) {
    app.use(express.static(clientDistPath));

    app.get('*', (req, res) => {
      res.sendFile(clientIndexPath);
    });

    console.log('✅ Serving React app from /Client/dist');
  } else {
    app.get('/', (req, res) => {
      res.json({
        status: 'Server is running',
        message: 'No Client/dist bundle found on this deployment. Use frontend dev server or deploy client separately.',
        clientUrl: process.env.CLIENT_URL || 'http://localhost:5713'
      });
    });

    app.get('*', (req, res) => {
      res.status(404).json({
        error: 'Not Found',
        message: 'Route not found on API server deployment.'
      });
    });
  }
} else {
  app.get('/', (req, res) => {
    res.json({ 
      message: 'Server running in development mode',
      clientUrl: process.env.CLIENT_URL || 'http://localhost:5173'
    });
  });
}

let rooms = {};
let playerNames = {};
let playerRooms = {};
let combatSessions = {};
let pendingDisconnects = {};
let activePlayerSockets = {};
let enemyTurnWatchdogs = {};
const MAX_PARTY_SIZE = 6;
const DISCONNECT_GRACE_MS = 60_000;
const ENEMY_TURN_TIMEOUT_MS = 15_000;
const ENEMY_TURN_MAX_RETRIES = 2;

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
  const currentTurn = combat.turnOrder[combat.currentTurnIndex];
  const aliveEnemyIds = new Set((combat.enemies || []).filter(isEnemyAlive).map(enemy => enemy.id));
  combat.turnOrder = combat.turnOrder.filter(turn => turn.type !== 'enemy' || aliveEnemyIds.has(turn.id));

  if (combat.turnOrder.length === 0) {
    combat.currentTurnIndex = 0;
    return;
  }

  if (currentTurn) {
    const preservedIndex = combat.turnOrder.findIndex(turn => turn.type === currentTurn.type && turn.id === currentTurn.id);
    if (preservedIndex !== -1) {
      combat.currentTurnIndex = preservedIndex;
      return;
    }
  }

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

function getConnectedPlayersInRoom(room) {
  const roomPlayers = rooms[room]?.players || [];
  const activeSocketsByPlayer = activePlayerSockets[room] || {};

  return roomPlayers.filter(player => (activeSocketsByPlayer[player]?.size || 0) > 0);
}

function getEnemyTurnHandlers(room) {
  return getConnectedPlayersInRoom(room);
}

function hasActiveEnemyTurnWatchdog(room, enemyId) {
  const watchdog = enemyTurnWatchdogs[room];
  if (!watchdog || typeof watchdog !== 'object') return false;
  return watchdog.enemyId === enemyId;
}

function clearEnemyTurnWatchdog(room) {
  const watchdog = enemyTurnWatchdogs[room];
  if (!watchdog) return;

  const timeoutId = typeof watchdog === 'object' ? watchdog.timeoutId : watchdog;
  clearTimeout(timeoutId);
  delete enemyTurnWatchdogs[room];
}

function advancePastStalledEnemyTurn(io, room, combat, enemyId) {
  if (!combat?.turnOrder?.length) {
    clearEnemyTurnWatchdog(room);
    return;
  }

  const activeTurn = combat.turnOrder[combat.currentTurnIndex];
  if (!activeTurn || activeTurn.type !== 'enemy' || activeTurn.id !== enemyId) {
    clearEnemyTurnWatchdog(room);
    return;
  }

  const availableHandlers = getEnemyTurnHandlers(room);
  if (availableHandlers.length === 0) {
    clearEnemyTurnWatchdog(room);
    return;
  }

  clearEnemyTurnWatchdog(room);

  combat.currentTurnIndex += 1;
  if (combat.currentTurnIndex >= combat.turnOrder.length) {
    combat.currentTurnIndex = 0;
  }

  if (!combat.turnOrder.length) {
    io.to(room).emit('combat_ended', { result: 'all_dead' });
    return;
  }

  const nextTurn = combat.turnOrder[combat.currentTurnIndex];
  io.to(room).emit('turn_changed', { currentTurn: nextTurn });

  if (nextTurn?.type === 'enemy') {
    dispatchEnemyTurn(io, room, combat, nextTurn.id);
  }
}

function dispatchEnemyTurn(io, room, combat, enemyId) {
  const allies = getEnemyTurnHandlers(room);
  if (allies.length === 0) {
    clearEnemyTurnWatchdog(room);
    return;
  }

  const existingWatchdog = enemyTurnWatchdogs[room];
  const previousRetries = (typeof existingWatchdog === 'object' && existingWatchdog.enemyId === enemyId)
    ? existingWatchdog.retries
    : 0;

  io.to(room).emit('execute_enemy_turn', {
    enemyId,
    allies,
    alliedEnemies: getAlliedEnemyIds(combat, enemyId)
  });

  clearEnemyTurnWatchdog(room);
  const timeoutId = setTimeout(() => {
    const latestCombat = combatSessions[room];
    if (!latestCombat?.turnOrder?.length) {
      clearEnemyTurnWatchdog(room);
      return;
    }

    const activeTurn = latestCombat.turnOrder[latestCombat.currentTurnIndex];
    if (activeTurn?.type === 'enemy' && activeTurn.id === enemyId) {
      const watchdogState = enemyTurnWatchdogs[room];
      const retries = typeof watchdogState === 'object' ? watchdogState.retries : 0;

      if (retries >= ENEMY_TURN_MAX_RETRIES) {
        advancePastStalledEnemyTurn(io, room, latestCombat, enemyId);
        return;
      }

      enemyTurnWatchdogs[room] = {
        timeoutId: null,
        enemyId,
        retries: retries + 1
      };
      emitCurrentTurn(io, room, latestCombat);
      return;
    }

    clearEnemyTurnWatchdog(room);
  }, ENEMY_TURN_TIMEOUT_MS);

  enemyTurnWatchdogs[room] = {
    timeoutId,
    enemyId,
    retries: previousRetries
  };
}

function getEnemySpawnDepth(enemy) {
  const behavior = enemy?.behavior || 'aggressive';
  const role = enemy?.role || 'DPS';

  if (role === 'Support') return 0;
  if (behavior === 'defensive') return 0;
  if (behavior === 'aggressive') return 1;
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
  const usedCells = new Set();

  const findOpenCell = (preferredRow, preferredCol) => {
    const withinBounds = (row, col) => row >= 0 && row < 7 && col >= 0 && col < 10;
    const isOpen = (row, col) => !usedCells.has(`${row},${col}`);

    if (withinBounds(preferredRow, preferredCol) && isOpen(preferredRow, preferredCol)) {
      return { row: preferredRow, col: preferredCol };
    }

    for (let radius = 1; radius <= 10; radius++) {
      for (let rowOffset = -radius; rowOffset <= radius; rowOffset++) {
        const colOffset = radius - Math.abs(rowOffset);
        const candidates = [
          { row: preferredRow + rowOffset, col: preferredCol + colOffset },
          { row: preferredRow + rowOffset, col: preferredCol - colOffset }
        ];

        for (const candidate of candidates) {
          if (!withinBounds(candidate.row, candidate.col)) continue;
          if (isOpen(candidate.row, candidate.col)) {
            return candidate;
          }
        }
      }
    }

    for (let row = 0; row < 7; row++) {
      for (let col = 0; col < 10; col++) {
        if (isOpen(row, col)) {
          return { row, col };
        }
      }
    }

    return { row: preferredRow, col: preferredCol };
  };

  sortedEnemies.forEach((enemy, index) => {
    const preferredRow = getEnemySpawnDepth(enemy);
    const preferredCol = columns[index] ?? 0;
    const spawnCell = findOpenCell(preferredRow, preferredCol);
    positions[enemy.id] = spawnCell;
    usedCells.add(`${spawnCell.row},${spawnCell.col}`);
  });

  return positions;
}

function generatePlayerSpawnPositions(players = []) {
  const positions = {};
  const bottomRow = 6;
  players.forEach((player, index) => {
    positions[player] = { row: bottomRow, col: index + 3 };
  });
  return positions;
}

function cloneDeep(value) {
  return JSON.parse(JSON.stringify(value));
}

function updateEnemyPositionInCombat(room, enemyId, path = []) {
  const combat = combatSessions[room];
  if (!combat || !enemyId || !Array.isArray(path) || path.length === 0) return;

  if (!combat.enemyPositions) {
    combat.enemyPositions = {};
  }

  const finalPosition = path[path.length - 1];
  if (!finalPosition || typeof finalPosition.row !== 'number' || typeof finalPosition.col !== 'number') {
    return;
  }

  combat.enemyPositions[enemyId] = { row: finalPosition.row, col: finalPosition.col };
}

function getEnemyPositionsSnapshot(room) {
  return combatSessions[room]?.enemyPositions || {};
}

async function requestAiNarration(payload) {
  if (!AI_API_URL) {
    throw new Error('AI_API_URL is not configured');
  }

  console.log(`[AI] Making request to: ${AI_API_URL}/game/event`);
  
  try {
    const response = await fetch(`${AI_API_URL}/game/event`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(AI_API_KEY ? { 'x-api-key': AI_API_KEY } : {}),
        ...(CF_ACCESS_CLIENT_ID && CF_ACCESS_CLIENT_SECRET ? {
          'CF-Access-Client-Id': CF_ACCESS_CLIENT_ID,
          'CF-Access-Client-Secret': CF_ACCESS_CLIENT_SECRET
        } : {})
      },
      body: JSON.stringify(payload),
    });

    console.log(`[AI] Response status: ${response.status} ${response.statusText}`);

    // Read response as text first, then parse as needed
    const responseText = await response.text();

    if (!response.ok) {
      console.error(`[AI] Error response body:`, responseText);
      
      // Check if we got HTML instead of JSON
      if (responseText.includes('<!DOCTYPE') || responseText.includes('<html')) {
        throw new Error(`AI API returned HTML error page (${response.status}). URL: ${AI_API_URL}/game/event. This suggests the AI service is not running or the URL is incorrect.`);
      }
      
      // Try to parse as JSON for better error messages
      try {
        const errorJson = JSON.parse(responseText);
        throw new Error(`AI API error ${response.status}: ${errorJson.detail || responseText}`);
      } catch (parseError) {
        throw new Error(`AI API error ${response.status}: ${responseText}`);
      }
    }

    // Parse successful response as JSON
    try {
      const jsonResponse = JSON.parse(responseText);
      console.log(`[AI] Success - received response`);
      return jsonResponse;
    } catch (parseError) {
      throw new Error(`Failed to parse AI response as JSON. Response was: ${responseText.substring(0, 200)}...`);
    }
    
  } catch (error) {
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      throw new Error(`Failed to connect to AI API at ${AI_API_URL}. Check if the service is running and the URL is correct. Original error: ${error.message}`);
    }
    throw error;
  }
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

function clearPendingDisconnect(room, playerName) {
  const roomPending = pendingDisconnects[room];
  if (!roomPending || !roomPending[playerName]) return;

  clearTimeout(roomPending[playerName].timeoutId);
  delete roomPending[playerName];

  if (Object.keys(roomPending).length === 0) {
    delete pendingDisconnects[room];
  }
}

function emitCurrentTurn(io, room, combat) {
  if (!combat?.turnOrder?.length) {
    io.to(room).emit('combat_ended', { result: 'all_dead' });
    return;
  }

  if (combat.currentTurnIndex >= combat.turnOrder.length) {
    combat.currentTurnIndex = 0;
  }

  const currentTurn = combat.turnOrder[combat.currentTurnIndex];
  io.to(room).emit('turn_changed', { currentTurn });

  if (currentTurn?.type === 'enemy') {
    dispatchEnemyTurn(io, room, combat, currentTurn.id);
  } else {
    clearEnemyTurnWatchdog(room);
  }
}

function removePlayerFromReadyStates(room, playerName) {
  const roomState = rooms[room];
  if (!roomState) return;

  if (roomState.readyPlayers) {
    roomState.readyPlayers = roomState.readyPlayers.filter(player => player !== playerName);
  }
  if (roomState.abilityReadyPlayers) {
    roomState.abilityReadyPlayers = roomState.abilityReadyPlayers.filter(player => player !== playerName);
  }
  if (roomState.attributeReadyPlayers) {
    roomState.attributeReadyPlayers = roomState.attributeReadyPlayers.filter(player => player !== playerName);
  }
  if (roomState.levelUpReadyPlayers) {
    roomState.levelUpReadyPlayers = roomState.levelUpReadyPlayers.filter(player => player !== playerName);
  }
}

function emitReadyStateUpdates(io, room) {
  const roomState = rooms[room];
  if (!roomState) return;

  io.to(room).emit('update_ready_status', roomState.readyPlayers || []);
  io.to(room).emit('ability_ready_status', roomState.abilityReadyPlayers || []);
  io.to(room).emit('attribute_ready_status', roomState.attributeReadyPlayers || []);
  io.to(room).emit('level_up_ready_status', roomState.levelUpReadyPlayers || []);
}

function removeAllyFromTurnOrderPreserveCurrent(combat, playerName) {
  if (!combat?.turnOrder?.length) return;

  const currentTurn = combat.turnOrder[combat.currentTurnIndex] || null;
  combat.turnOrder = combat.turnOrder.filter(
    turn => !(turn.type === 'ally' && turn.id === playerName)
  );

  if (combat.turnOrder.length === 0) {
    combat.currentTurnIndex = 0;
    return;
  }

  if (currentTurn) {
    const preservedIndex = combat.turnOrder.findIndex(
      turn => turn.type === currentTurn.type && turn.id === currentTurn.id
    );

    if (preservedIndex !== -1) {
      combat.currentTurnIndex = preservedIndex;
      return;
    }
  }

  if (combat.currentTurnIndex >= combat.turnOrder.length) {
    combat.currentTurnIndex = 0;
  }
}

function finalizeDisconnectedPlayer(io, room, playerName) {
  const pending = pendingDisconnects[room]?.[playerName];
  if (!pending) return;

  const roomState = rooms[room];
  clearPendingDisconnect(room, playerName);
  if (!roomState) return;

  roomState.players = (roomState.players || []).filter(player => player !== playerName);

  if (roomState.characterSelections) {
    delete roomState.characterSelections[playerName];
  }
  if (roomState.readyPlayers) {
    roomState.readyPlayers = roomState.readyPlayers.filter(player => player !== playerName);
  }
  if (roomState.abilitySelections) {
    delete roomState.abilitySelections[playerName];
  }
  if (roomState.abilityReadyPlayers) {
    roomState.abilityReadyPlayers = roomState.abilityReadyPlayers.filter(player => player !== playerName);
  }
  if (roomState.levelUpReadyPlayers) {
    roomState.levelUpReadyPlayers = roomState.levelUpReadyPlayers.filter(player => player !== playerName);
  }
  if (roomState.attributePoints) {
    delete roomState.attributePoints[playerName];
  }
  if (roomState.attributeReadyPlayers) {
    roomState.attributeReadyPlayers = roomState.attributeReadyPlayers.filter(player => player !== playerName);
  }
  if (roomState.sortedAttributeAllocations) {
    delete roomState.sortedAttributeAllocations[playerName];
  }
  if (roomState.playerScreens) {
    delete roomState.playerScreens[playerName];
  }

  const combat = combatSessions[room];
  if (combat?.turnOrder) {
    const currentTurn = combat.turnOrder[combat.currentTurnIndex];
    const wasCurrentTurn = currentTurn?.type === 'ally' && currentTurn.id === playerName;

    removeAllyFromTurnOrderPreserveCurrent(combat, playerName);

    io.to(room).emit('turn_order_updated', {
      turnOrder: combat.turnOrder,
      currentTurnIndex: combat.currentTurnIndex
    });

    const allyTurnsRemaining = combat.turnOrder.filter(turn => turn.type === 'ally').length;
    if (allyTurnsRemaining === 0) {
      io.to(room).emit('combat_ended', { result: 'all_dead' });
    } else if (wasCurrentTurn) {
      emitCurrentTurn(io, room, combat);
    }
  }

  io.to(room).emit('updatePlayerList', roomState.players || []);
  io.to(room).emit('update_character_selections', roomState.characterSelections || {});
  emitReadyStateUpdates(io, room);
  io.to(room).emit('attribute_points_updated', roomState.attributePoints || {});
  io.to(room).emit('attribute_allocations_updated', roomState.sortedAttributeAllocations || {});

  if ((roomState.players || []).length === 0) {
    clearEnemyTurnWatchdog(room);
    delete rooms[room];
    delete combatSessions[room];
    delete pendingDisconnects[room];
  }
}

io.on('connection', (socket) => {
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
    if (rooms[room]) {
      // Clear all game-related data but keep the room and players
      rooms[room].characterSelections = {};
      rooms[room].readyPlayers = [];
      rooms[room].abilitySelections = {};
      rooms[room].abilityReadyPlayers = [];
      rooms[room].levelUpReadyPlayers = [];
      rooms[room].attributePoints = {};
      rooms[room].attributeReadyPlayers = [];
      rooms[room].sortedAttributeAllocations = {};
      rooms[room].selectedFaction = null;
      
      // Clear combat session
      if (combatSessions[room]) {
        clearEnemyTurnWatchdog(room);
        delete combatSessions[room];
      }
      
      // Notify all clients to reset
      io.to(room).emit("game_reset");
    }
  });

  socket.on('faction_selected', ({ room, faction }) => {
    if (!rooms[room]) return;

    const normalizedFaction = faction === 'enforcers' || faction === 'rebels' ? faction : null;
    if (!normalizedFaction) return;

    rooms[room].selectedFaction = normalizedFaction;
    io.to(room).emit('faction_selected', normalizedFaction);
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
        rooms[room].abilityReadyPlayers = [];
        io.to(room).emit("ability_ready_status", []);
        io.to(room).emit("start_main_game");
      }
    }
  });

  socket.on("start_combat", ({ room, generatedEnemies }) => {
    if(!combatSessions[room]) {
      combatSessions[room] = {};
    }

    combatSessions[room].enemies = generatedEnemies;

    // Generate enemy positions (server decides so all clients see same positions)
    const enemyPositions = generateEnemySpawnPositions(generatedEnemies);
    const playerPositions = generatePlayerSpawnPositions(rooms[room]?.players || []);
    combatSessions[room].enemyPositions = enemyPositions;
    combatSessions[room].playerPositions = playerPositions;

    const turnOrder = calculateTurnOrder(room);
    combatSessions[room].turnOrder = turnOrder;
    combatSessions[room].currentTurnIndex = 0;
    clearEnemyTurnWatchdog(room);

    const firstTurn = turnOrder[0];
    
    // Broadcast character selections to ensure all players have current data
    const characterSelections = rooms[room]?.characterSelections || {};
    
    io.to(room).emit("phase_changed_combat", { 
      enemies: combatSessions[room].enemies, 
      enemyPositions: enemyPositions,
      playerPositions: playerPositions,
      turnOrder: turnOrder,
      currentTurn: firstTurn,
      characterSelections: characterSelections
     });
     
    // If first turn is an enemy, trigger enemy AI after positions are set
    if (firstTurn.type === 'enemy') {
      const combat = combatSessions[room];
      
      // Small delay to ensure client has set up enemy positions
      setTimeout(() => {
        dispatchEnemyTurn(io, room, combat, firstTurn.id);
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
      }
      
      io.to(room).emit("enemies_updated", { enemies: combatSessions[room]?.enemies || updatedEnemies });
    }
    
    // Broadcast active effects so all players see buff/debuff indicators
    if (updatedActiveEffects) {
      io.to(room).emit("active_effects_updated", updatedActiveEffects);
    }
  });

  socket.on("end_turn", ({ room, playerName, updatedEnemies, updatedPlayerCharacters, updatedActiveEffects }) => {
    const combat = combatSessions[room];
    
    if (!combat) return;

    // Update enemies with any debuffs/buffs that were ticked
    if (updatedEnemies && Array.isArray(updatedEnemies)) {
      combat.enemies = normalizeEnemiesForCombat(updatedEnemies, combat.enemies || []);
      removeDeadEnemiesFromTurnOrder(combat);
    }

    if (rooms[room] && updatedPlayerCharacters) {
      rooms[room].characterSelections = {
        ...rooms[room].characterSelections,
        ...updatedPlayerCharacters
      };
      io.to(room).emit("characters_updated", updatedPlayerCharacters);
    }

    if (updatedActiveEffects) {
      io.to(room).emit("active_effects_updated", updatedActiveEffects);
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
        dispatchEnemyTurn(io, room, combat, firstTurn.id);
      } else {
        clearEnemyTurnWatchdog(room);
      }
      return;
    }
    
    if (currentTurn.id !== playerName) {
      io.to(room).emit("turn_changed", { currentTurn });
      if (currentTurn.type === 'enemy') {
        dispatchEnemyTurn(io, room, combat, currentTurn.id);
      } else {
        clearEnemyTurnWatchdog(room);
      }
      return;
    }

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
      dispatchEnemyTurn(io, room, combat, nextTurn.id);
    } else {
      clearEnemyTurnWatchdog(room);
    }
  });

  socket.on("enemy_turn_complete", ({ room, enemyId, updatedEnemies, updatedPlayerCharacters, updatedActiveEffects, enemyFinalPosition }) => {
    const combat = combatSessions[room];
    if (!combat) return;

    const activeTurn = combat.turnOrder?.[combat.currentTurnIndex];
    if (!activeTurn || activeTurn.type !== 'enemy' || activeTurn.id !== enemyId) {
      return;
    }

    clearEnemyTurnWatchdog(room);

    if (updatedEnemies && Array.isArray(updatedEnemies)) {
      combat.enemies = normalizeEnemiesForCombat(updatedEnemies, combat.enemies || []);
      removeDeadEnemiesFromTurnOrder(combat);
      io.to(room).emit("enemies_updated", { enemies: combat.enemies });
    }

    if (rooms[room] && updatedPlayerCharacters) {
      rooms[room].characterSelections = {
        ...rooms[room].characterSelections,
        ...updatedPlayerCharacters
      };
      io.to(room).emit("characters_updated", updatedPlayerCharacters);
    }

    if (updatedActiveEffects) {
      io.to(room).emit("active_effects_updated", updatedActiveEffects);
    }

    if (
      enemyFinalPosition &&
      typeof enemyFinalPosition.row === 'number' &&
      typeof enemyFinalPosition.col === 'number'
    ) {
      if (!combat.enemyPositions) {
        combat.enemyPositions = {};
      }
      combat.enemyPositions[enemyId] = {
        row: enemyFinalPosition.row,
        col: enemyFinalPosition.col
      };
    }

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
      dispatchEnemyTurn(io, room, combat, nextTurn.id);
    } else {
      clearEnemyTurnWatchdog(room);
    }
  });

  socket.on("enemy_moved", ({ room, enemyId, path, stepDelay }) => {
    updateEnemyPositionInCombat(room, enemyId, path);
    io.to(room).emit("enemy_moved", { enemyId, path, stepDelay });
  });

  socket.on("player_moved", ({ room, playerName, position }) => {
    const combat = combatSessions[room];
    if (combat && position && typeof position.row === 'number' && typeof position.col === 'number') {
      if (!combat.playerPositions) {
        combat.playerPositions = {};
      }
      combat.playerPositions[playerName] = { row: position.row, col: position.col };
    }

    io.to(room).emit("player_moved", { playerName, position });
  });

  socket.on("reduce_cooldown", ({ room, targetPlayer, value }) => {
    io.to(room).emit("cooldown_reduced", { targetPlayer, value });
  });

  socket.on("reset_cooldowns", ({ room, targetPlayer }) => {
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

      if (combat.enemyPositions && combat.enemyPositions[enemyId]) {
        delete combat.enemyPositions[enemyId];
      }

      removeDeadEnemiesFromTurnOrder(combat);
      
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
          dispatchEnemyTurn(io, room, combat, nextTurn.id);
        } else {
          clearEnemyTurnWatchdog(room);
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
      
      // Check if all players are dead (no ally turns left)
      const allyTurnsRemaining = combat.turnOrder.filter(turn => turn.type === 'ally').length;
      if (allyTurnsRemaining === 0) {
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
          dispatchEnemyTurn(io, room, combat, nextTurn.id);
        } else {
          clearEnemyTurnWatchdog(room);
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
    const reconnectState = pendingDisconnects[room]?.[name] || null;
    if (reconnectState?.snapshot) {
      if (reconnectState.snapshot.characterSelections && rooms[room]) {
        rooms[room].characterSelections = cloneDeep(reconnectState.snapshot.characterSelections);
      }

      if (reconnectState.snapshot.combatState) {
        combatSessions[room] = cloneDeep(reconnectState.snapshot.combatState);
      }
    }

    if (reconnectState) {
      clearPendingDisconnect(room, name);
    }

    if (!rooms[room]) {
      rooms[room] = { players: [] };
    }
    if (!rooms[room].playerScreens) {
      rooms[room].playerScreens = {};
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

    if (!activePlayerSockets[room]) {
      activePlayerSockets[room] = {};
    }
    if (!activePlayerSockets[room][name]) {
      activePlayerSockets[room][name] = new Set();
    }
    activePlayerSockets[room][name].add(socket.id);

    const isAdmin = rooms[room].players.length === 0;
    socket.emit("setAdmin", isAdmin);
  
    if (!rooms[room].players.includes(name)) {
      rooms[room].players.push(name);
    }

    if (!rooms[room].playerScreens[name]) {
      rooms[room].playerScreens[name] = 'waiting';
    }

    playerNames[socket.id] = name;
    playerRooms[socket.id] = room;
  
    io.to(room).emit("updatePlayerList", rooms[room].players);
    
    // Send existing character selections to the newly joined player
    if (rooms[room].characterSelections) {
      socket.emit("update_character_selections", rooms[room].characterSelections);
    }

    socket.emit('restore_screen', { screen: rooms[room].playerScreens[name] || 'waiting' });

    if (rooms[room].selectedFaction) {
      socket.emit('faction_selected', rooms[room].selectedFaction);
    }

    const combat = combatSessions[room];
    if (combat?.turnOrder) {
      const alreadyInTurnOrder = combat.turnOrder.some(turn => turn.type === 'ally' && turn.id === name);

      if (!alreadyInTurnOrder) {
        const character = rooms[room]?.characterSelections?.[name];
        const restoredTurnEntry = {
          type: 'ally',
          id: name,
          speed: character?.stats?.speed || 0
        };

        const restoreIndex = Math.max(
          0,
          Math.min(reconnectState?.turnOrderIndex ?? combat.turnOrder.length, combat.turnOrder.length)
        );

        combat.turnOrder.splice(restoreIndex, 0, restoredTurnEntry);

        if (restoreIndex <= combat.currentTurnIndex) {
          combat.currentTurnIndex += 1;
        }

        if (combat.currentTurnIndex >= combat.turnOrder.length) {
          combat.currentTurnIndex = 0;
        }

        io.to(room).emit('turn_order_updated', {
          turnOrder: combat.turnOrder,
          currentTurnIndex: combat.currentTurnIndex
        });
      }

      const currentTurn = combat.turnOrder[combat.currentTurnIndex] || null;
      socket.emit('phase_changed_combat', {
        enemies: combat.enemies || [],
        enemyPositions: combat.enemyPositions || {},
        playerPositions: combat.playerPositions || {},
        turnOrder: combat.turnOrder || [],
        currentTurn,
        characterSelections: rooms[room]?.characterSelections || {}
      });
      socket.emit('start_game');

      if (currentTurn?.type === 'enemy') {
        if (!hasActiveEnemyTurnWatchdog(room, currentTurn.id)) {
          dispatchEnemyTurn(io, room, combat, currentTurn.id);
        }
      }
    }
  });

  socket.on('disconnect', () => {
    const playerName = playerNames[socket.id];
    const room = playerRooms[socket.id];
    const designatedEnemyHandlerBeforeDisconnect = room ? getEnemyTurnHandlers(room)[0] : null;

    if (room && playerName && activePlayerSockets[room]?.[playerName]) {
      activePlayerSockets[room][playerName].delete(socket.id);

      if (activePlayerSockets[room][playerName].size === 0) {
        delete activePlayerSockets[room][playerName];
      }

      if (Object.keys(activePlayerSockets[room]).length === 0) {
        delete activePlayerSockets[room];
      }
    }

    const playerStillConnected = !!(room && playerName && activePlayerSockets[room]?.[playerName]?.size > 0);

    if (room && rooms[room]) {
      if (playerName && !playerStillConnected) {
        removePlayerFromReadyStates(room, playerName);
        emitReadyStateUpdates(io, room);

        if (!pendingDisconnects[room]) {
          pendingDisconnects[room] = {};
        }

        const combat = combatSessions[room];
        const disconnectState = {
          disconnectAt: Date.now(),
          timeoutId: null,
          turnOrderIndex: -1,
          snapshot: {
            characterSelections: cloneDeep(rooms[room]?.characterSelections || {}),
            combatState: cloneDeep(combatSessions[room] || null)
          }
        };

        if (combat?.turnOrder) {
          disconnectState.turnOrderIndex = combat.turnOrder.findIndex(
            turn => turn.type === 'ally' && turn.id === playerName
          );

          const currentTurn = combat.turnOrder[combat.currentTurnIndex];
          const wasCurrentTurn = currentTurn?.type === 'ally' && currentTurn.id === playerName;

          removeAllyFromTurnOrderPreserveCurrent(combat, playerName);

          io.to(room).emit('turn_order_updated', {
            turnOrder: combat.turnOrder,
            currentTurnIndex: combat.currentTurnIndex
          });

          if (wasCurrentTurn) {
            emitCurrentTurn(io, room, combat);
          } else {
            const activeTurn = combat.turnOrder[combat.currentTurnIndex];
            const designatedEnemyHandlerAfterDisconnect = getEnemyTurnHandlers(room)[0];
            const handlerChanged = designatedEnemyHandlerBeforeDisconnect !== designatedEnemyHandlerAfterDisconnect;

            if (activeTurn?.type === 'enemy' && handlerChanged) {
              dispatchEnemyTurn(io, room, combat, activeTurn.id);
            }
          }
        }

        disconnectState.timeoutId = setTimeout(() => {
          finalizeDisconnectedPlayer(io, room, playerName);
        }, DISCONNECT_GRACE_MS);

        pendingDisconnects[room][playerName] = disconnectState;
      }
    }

    delete playerNames[socket.id];
    delete playerRooms[socket.id];
  });

  socket.on("level_up",({room}) => {
    if (rooms[room]) {
      rooms[room].levelUpReadyPlayers = [];
      io.to(room).emit('level_up_ready_status', []);
    }
    io.to(room).emit('level_up');
  });

  socket.on("level_up_ready", ({ room, playerName, updatedCharacter }) => {
    if (!rooms[room]) return;

    if (!rooms[room].levelUpReadyPlayers) {
      rooms[room].levelUpReadyPlayers = [];
    }

    if (updatedCharacter) {
      if (!rooms[room].characterSelections) {
        rooms[room].characterSelections = {};
      }
      rooms[room].characterSelections[playerName] = updatedCharacter;
      io.to(room).emit("characters_updated", { [playerName]: updatedCharacter });
    }

    if (!rooms[room].levelUpReadyPlayers.includes(playerName)) {
      rooms[room].levelUpReadyPlayers.push(playerName);
    }

    io.to(room).emit('level_up_ready_status', rooms[room].levelUpReadyPlayers);

    const allLevelReady = rooms[room].players.length > 0 &&
      rooms[room].players.every(player => rooms[room].levelUpReadyPlayers.includes(player));

    if (allLevelReady) {
      rooms[room].abilityReadyPlayers = [];
      io.to(room).emit('ability_ready_status', []);
      io.to(room).emit('level_up_complete');
    }
  });

  socket.on('player_screen_updated', ({ room, playerName, screen }) => {
    if (!room || !playerName || !screen) return;
    if (!rooms[room]) return;

    if (!rooms[room].playerScreens) {
      rooms[room].playerScreens = {};
    }

    const existingScreen = rooms[room].playerScreens[playerName];
    const isReconnectPending = !!pendingDisconnects[room]?.[playerName];
    if (isReconnectPending && existingScreen && existingScreen !== 'waiting' && screen === 'waiting') {
      return;
    }

    rooms[room].playerScreens[playerName] = screen;
  });
});



// Start Server
server.listen(PORT, '0.0.0.0', () => {
  console.log(`Server is running on http://0.0.0.0:${PORT}`);
});