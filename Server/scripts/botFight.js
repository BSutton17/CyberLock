// Plays story fights end to end with simple bot players over real sockets, to check that the
// server-run combat never stalls. Also a starting point for balance testing.
//
//   node scripts/botFight.js [fights=3] [partySize=3] [--real-timing] [--strong]
//
// With --real-timing the server uses its normal pacing (slow); otherwise everything runs fast.
// The party gains a level after each fight that grants one in the story. --strong triples the
// party's health so the whole campaign can be checked for stalls regardless of balance.
import { io as connectClient } from 'socket.io-client';
import { createGameServer } from '../app.js';
import { config as baseConfig } from '../config.js';
import { createSessionToken } from '../auth/session.js';
import { createNarrator } from '../narrator/storyEngine.js';
import { createMockProvider } from '../narrator/providers/mock.js';
import CharactersData from '../../shared/data/characters.js';
import { ABILITIES } from '../../shared/combat/abilities.js';
import { distance, findPath, reachableCells } from '../../shared/combat/grid.js';

const args = process.argv.slice(2);
const fights = Number(args.find(arg => /^\d+$/.test(arg)) ?? 3);
const partySize = Number(args.filter(arg => /^\d+$/.test(arg))[1] ?? 3);
const realTiming = args.includes('--real-timing');
const strong = args.includes('--strong');

const quiet = { log: () => {}, warn: () => {}, error: console.error };
const fastTiming = {
  allyTurnAdvanceDelayMs: 0, autoEndTurnDelayMs: 0, combatStartEnemyDelayMs: 0, enemyThinkMs: 0,
  enemyAttackDelayMs: 0, enemyTurnEndDelayMs: 0, animationScale: 0, allyTurnTimeoutMs: 5000, disconnectGraceMs: 60000
};

const game = createGameServer({
  config: { ...baseConfig, isProduction: false, allowedOrigins: [], timing: realTiming ? baseConfig.timing : fastTiming },
  narrator: createNarrator({ provider: createMockProvider({ delayMs: 0 }), logger: quiet }),
  logger: quiet
});
await new Promise(resolve => game.server.listen(0, resolve));
const url = `http://127.0.0.1:${game.server.address().port}`;

const ack = (socket, event, ...rest) => new Promise(resolve => socket.emit(event, ...rest, resolve));

// One of each role first, then whatever is left.
const roster = ['offensive_tank_1', 'healing_support_1', 'aggressive_dps_2', 'spellcaster_dps_1', 'hacker_support_4', 'traditional_warrior_dps_3'];
const level1 = (role) => Object.values(ABILITIES).filter(a => a.role === role && a.level === 1).map(a => a.id);

const names = Array.from({ length: partySize }, (_, i) => `P${i + 1}`);
const sockets = [];
for (const name of names) {
  const socket = connectClient(url, { auth: { token: createSessionToken({ id: `u-${name}`, name, provider: 'guest' }) }, transports: ['websocket'], forceNew: true });
  await new Promise(resolve => socket.once('connect', resolve));
  sockets.push(socket);
}
const { room } = await ack(sockets[0], 'create_room', {});
for (let i = 0; i < sockets.length; i++) await ack(sockets[i], 'join_room', room, names[i]);

const roomState = game.state.rooms[room];
roomState.stage = 'playing';
roomState.selectedFaction = 'rebels';
names.forEach((name, i) => {
  const base = structuredClone(CharactersData.characters.find(c => c.id === roster[i % roster.length]));
  if (strong) base.stats.maxHealth = base.stats.health = base.stats.health * 3;
  roomState.characterSelections[name] = { ...base, abilities: [level1(base.role)[i % level1(base.role).length]] };
});

// Stand-in for the level-up screen: +3 to every stat and +10 health.
function levelUpParty() {
  for (const character of Object.values(roomState.characterSelections)) {
    if (character.level >= 5) continue;
    character.level += 1;
    for (const stat of ['speed', 'resistance', 'strength', 'ta']) character.stats[stat] += 3;
    character.stats.maxHealth += 10;
    character.stats.health = character.stats.maxHealth;
  }
}

// ---------------------------------------------------------------------------
// The bot: use an ability if one is ready and sensible, hit the closest enemy, else walk at it.
// ---------------------------------------------------------------------------
let latest = null;
const log = [];
sockets[0].on('combat_narration', ({ text }) => log.push(text));

const lastActedOn = {};
function act(socket, name, snapshot) {
  const turn = snapshot.turn;
  if (!turn || turn.type !== 'ally' || turn.id !== name || snapshot.endedResult) return;
  // React once per distinct state of our turn.
  const key = [turn.number, turn.movementUsed, turn.actionUsed, turn.extraWeaponAttacks].join(':');
  if (lastActedOn[name] === key) return;
  lastActedOn[name] = key;
  const me = snapshot.characters[name];
  const myPos = snapshot.positions[name];
  const enemies = snapshot.enemies.filter(e => !e.isDeadBody && e.stats.health > 0 && snapshot.positions[e.id]);
  if (!me || !myPos || enemies.length === 0) return;

  const nearest = enemies.reduce((best, e) => (distance(myPos, snapshot.positions[e.id]) < distance(myPos, snapshot.positions[best.id]) ? e : best));
  const nearestPos = snapshot.positions[nearest.id];
  const range = me.weapon?.range || 1;

  if ((!turn.actionUsed || turn.extraWeaponAttacks > 0) && distance(myPos, nearestPos) <= range) {
    socket.emit('combat_attack', { room, targetId: nearest.id });
    return;
  }

  if (turn.movementLeft > 0) {
    const options = reachableCells(myPos, turn.movementLeft, { positions: snapshot.positions, movingId: name, activeEffects: snapshot.activeEffects });
    const best = options.reduce((choice, cell) => (!choice || distance(cell, nearestPos) < distance(choice, nearestPos) ? cell : choice), null);
    if (best && distance(best, nearestPos) < distance(myPos, nearestPos) && findPath(myPos, best, { positions: snapshot.positions, movingId: name, activeEffects: snapshot.activeEffects })) {
      socket.emit('combat_move', { room, to: { row: best.row, col: best.col } });
      return;
    }
  }

  socket.emit('combat_end_turn', { room });
}

const errors = [];
sockets.forEach((socket, i) => {
  socket.on('combat_state', snapshot => {
    if (i === 0) latest = snapshot;
    act(socket, names[i], snapshot);
  });
  socket.on('combat_error', e => errors.push(`${names[i]}: ${e.message}`));
});

// ---------------------------------------------------------------------------
// Fights
// ---------------------------------------------------------------------------
const results = [];
for (let fight = 0; fight < fights; fight++) {
  const started = Date.now();
  const ended = new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`fight ${fight} stalled; last turn: ${JSON.stringify(latest?.currentTurn)}`)), realTiming ? 600000 : 60000);
    sockets[0].once('combat_ended', payload => { clearTimeout(timer); resolve(payload); });
  });
  sockets[0].emit('start_combat', { room, sceneKey: 'street' });
  const outcome = await ended;
  const turns = latest?.turn?.number ?? 0;
  results.push({ fight: outcome.encounterIndex, result: outcome.result, seconds: ((Date.now() - started) / 1000).toFixed(1), enemies: latest?.enemies.length });
  console.log(`fight ${outcome.encounterIndex}: ${outcome.result} in ${((Date.now() - started) / 1000).toFixed(1)}s (${latest?.enemies.length} enemies)`);
  if (outcome.result === 'all_dead') break;
  if (outcome.postCombat === 'levelUp') levelUpParty();
  void turns;
}

console.log('\nlast few narration lines:\n  ' + log.slice(-5).join('\n  '));
console.log(`\nrefused actions: ${errors.length}${errors.length ? ` (e.g. ${errors.slice(0, 3).join('; ')})` : ''}`);
sockets.forEach(socket => socket.disconnect());
await game.close();
process.exit(0);
