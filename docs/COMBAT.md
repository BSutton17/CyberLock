# How combat works

The server runs every fight. Browsers draw the board and send **intents**; they never decide
damage, health, cooldowns or enemy moves.

```
Browser                     Server (Server/sockets/combat.js)          Rules (shared/combat)
-------                     ---------------------------------          ---------------------
combat_move { to }    --->  checks it's your turn, runs the rule  -->  engine.movePlayer
combat_attack { id }  --->                                        -->  engine.attack
combat_ability {...}  --->                                        -->  engine.useAbility
combat_end_turn       --->  ticks effects, narrates, next turn    -->  engine.finishTurn
                      <---  combat_state (whole board + events)
                      <---  combat_error { message }   (to the sender only, when refused)
                      <---  combat_narration { text }  (one line per turn)
                      <---  combat_ended { result, postCombat, ... }
```

Enemy turns run on the server too: think → ability and/or move (clients animate the path) →
weapon attack → end of turn. With nobody connected, enemy turns pause until someone returns.

## Where things live

| File | What it holds |
|---|---|
| `shared/combat/abilities.js` | Every ability: numbers, targeting, and what it does from the caster's point of view |
| `shared/combat/effects.js` | Effect rules: stat totals, damage keywords (curse, immunity, reflection), bonus health, zones |
| `shared/combat/engine.js` | The fight itself: actions, action economy, deaths, effect ticks, enemy turns, snapshots |
| `shared/combat/enemyAI.js` | How enemies pick targets, move and choose abilities |
| `shared/combat/encounters.js` | The ten story fights and how their enemies are built and scaled |
| `shared/combat/grid.js` | Board size, distances, paths, sewer terrain |
| `shared/combat/turnOrder.js` | Turn order bookkeeping (speed order, removals, rejoining) |
| `Server/sockets/combat.js` | Pacing, timers, broadcasting, narration, starting/ending fights |
| `Server/combat/*.test.js` | Tests for all of the above, including every ability used in a real fight |

## Turns

- One **action** (weapon attack or an action ability) and one **bonus action** (abilities marked
  with the + icon) per turn, plus movement: every 10 Speed is one tile.
- Slowing terrain (sewer water) and blizzards are judged from where your turn started.
- A turn ends when you press End Turn, when you have nothing left to do (action spent, no
  movement, no bonus ability ready), or after 40 seconds.

## Effect timing

Every effect has an **owner** (whoever caused it) and counts down only when the owner's turn ends.

- Most effects start **next turn**: they become active when the owner ends the turn they were
  cast in, then last `duration` more owner turns. Example: Counter cast on your turn protects you
  through the enemies' turns until your next turn ends.
- Effects marked `tickOnCastTurn` are active immediately (Flash Step, zones).
- When a unit falls, effects it owns end. Over-time effects on a fallen unit end too.

## Zones

Zones act on whoever is **standing in them when they tick** (at the end of the caster's turn),
not on whoever was there when they were placed.

| Zone | Effect |
|---|---|
| Feels Like Home | Heals the caster's side standing in the 3x3 field, twice |
| Toxic Mist | Damages the other side standing in the 3x3 field, twice |
| Blizzard | Halves the speed of the other side while they stand in it |

Zones remember which side placed them, so an enemy healer's field heals enemies, and cautious
enemies walk around zones the party placed.

## Adding or changing an ability

1. Edit or add it in `shared/combat/abilities.js` (role, level, cooldown, targetType, execute).
2. If it needs a new kind of effect, teach `engine.js` (`tickEffects` for things that happen over
   time, `applyInstantEffect` for one-off changes like cooldowns).
3. Run `npm test`. The "every ability works when used in a fight" test uses each ability in a
   real fight; add a focused test in `Server/combat/engine.test.js` for anything with timing.

## Bots

`node Server/scripts/botFight.js [fights] [partySize] [--real-timing] [--strong]` plays story fights
with simple bots over real sockets. Use it to check nothing stalls after a rules change; it is
also the starting point for balance testing.
