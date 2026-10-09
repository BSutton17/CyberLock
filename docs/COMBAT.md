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
| `shared/combat/partyAI.js` | The party bot: plays a party member's turn (in-game bots and balance tests) |
| `shared/combat/autoplay.js` | Plays fights forward without timers (used by the bot and the simulator) |
| `shared/combat/encounters.js` | The ten story fights, how many enemies each party size faces, and their power |
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

## Movement

Party members can walk through each other (but never stop on a teammate's tile), so nobody gets
boxed in by their own side. Enemies and barriers still block.

## Enemy targeting

On each enemy's first turn, if more than one party member is in reach, it goes for the one with
the highest max health (weapon or damage ability), so fragile supports aren't knocked out before
they can act. After that it picks off whoever it can knock out, else the most fragile target.

## Starting positions

Tanks start on the second row from the bottom and everyone else on the bottom row, in columns
shuffled every fight. The outer columns are never used, so nobody starts against a side wall
(`generatePlayerSpawnPositions` in `Server/game/spawning.js`). Enemies start in the top rows.

## Party size

Every party size should have the same chance of winning, so fights scale with the party
(`shared/combat/encounters.js`):

- `encounterComposition` decides how many enemies of each tier show up. A regular fight has one
  more enemy than there are players; small parties face a boss alone, without its helpers.
- `ENEMY_POWER` multiplies enemy health, Strength and TA per fight and per party size. It is tuned
  by simulation (`node scripts/balance.js calibrate --write`), not by hand. See
  [BALANCE.md](BALANCE.md).

Bots count as party members, so a solo player with two bots faces a three-player fight.

## Bots

On the character screen the host can **Add bot** to fill an empty seat (up to six). A bot takes
the role the party is missing (Tank, then Support, then DPS), is always ready, picks its primary
and secondary attributes from what the people left, picks its abilities at random as slots open,
and levels itself up: three chunks of 5 points per level, each rolled against its character's
chances (`LEVEL_UP_CHANCES` in `Server/game/bots.js`):

| Character | HP | Resistance | Speed | Strength | TA |
|---|---|---|---|---|---|
| Tanks | 26% | 26% | 8% | 20% | 20% |
| Leo | 10% | 20% | 35% | 35% | - |
| Gene Shock | 15% | 15% | 15% | 15% | 40% |
| Last Legion | 20% | 20% | 20% | 20% | 20% |
| Supports | 16% | 16% | 16% | - | 52% | Bots never
own story decisions. In a fight its turns are played by the party bot
(`shared/combat/partyAI.js`) through the same rule checks as a player's intents, one step at a
time with a short pause (`BOT_STEP_MS`, default 900 ms) so players can follow along. If every
person disconnects, the fight pauses instead of letting bots play on alone, and a room with only
bots left is closed.

The party bot looks one turn ahead: for each sensible option it plays the fight forward on a copy
and keeps the best. Live bots weigh at most 20 options per step to keep the server responsive.

`node Server/scripts/botFight.js [fights] [partySize] [--real-timing] [--strong]` plays story
fights end to end over real sockets with simple bots, to check nothing stalls after a rules
change. For balance testing use `node Server/scripts/balance.js` (see [BALANCE.md](BALANCE.md)).
