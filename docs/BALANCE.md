# Balance

How balanced CyberLock is, how we measure it, and how to re-check it after changing numbers.

## How it's measured

Balance is checked by **simulation**: the real combat rules (`shared/combat`) are played thousands
of times by bot parties, with nothing faked. `Server/balance/` holds the simulator and
`Server/scripts/balance.js` runs it.

**The bot.** Party members are played by a look-ahead bot (`shared/combat/partyAI.js`). On each
step it lists every sensible option (walk somewhere and attack each enemy, use each ready ability
on each sensible target, reposition, or end the turn), then for each option it plays the fight
forward on a copy until the end of its own next turn, using quick rules of thumb for everyone
else, and keeps the option that leaves the party best off (enemy health removed, weighted by how
hard each enemy hits, plus the party's own health, with big swings for knockouts, wins and
losses). Because it judges an ability by what it actually does in the game, it uses new or
changed abilities sensibly without being told how. The same bot plays the in-game **bots**.

**Party size.** For each party size (1-6) and each of the ten story fights, 100 random parties
(random characters, random ability picks, random side) play the fight. Characters are levelled
the way the story levels them (level 1 in fight 1, level 5 by fight 8), spending their points
like a typical player would (`levelUpPlan` in `Server/balance/simulate.js`). Fights are independent
(the party is fully healed after every win), so the chance of finishing the campaign is the
product of the ten win rates.

**Abilities.** Abilities are only compared with the other abilities a player could have picked
for the **same slot** (same role, same level: a level 1 Tank ability against the other level 1
Tank abilities). For each slot, 150 scenarios are drawn (a random party of 2-5 with one member of
that role, a random fight in the part of the story where that slot is open, random luck). Every
scenario is played once per ability in the slot, changing nothing but that one pick, so the
comparison is like-for-like.

Each fight gets a **score**: 1 + the share of the party's health left on a win, or the share of
the enemies' health removed on a loss. An ability's **edge** is how much better its average
score is than the slot's average in the same scenarios (± one standard error). Roughly: an edge
of +0.05 is a noticeable advantage, +0.10 a dominant one, and anything within ±0.02 is a wash.
"Uses per fight" shows how often the bot actually chose it: an ability the bot rarely picks over
a plain weapon attack is usually too weak to be worth its action.

**Limits.** The bot is good but not a person: it doesn't plan more than a turn ahead, and it
undervalues tricks that pay off over several turns (G.T.G., Way Too Close!). Small edges (under
about 0.02) are within noise. Treat the numbers as a strong hint, then playtest.

## Re-running it

```bash
cd Server
node scripts/balance.js all --out ../docs/balance-latest.md     # both reports (~25 min)
node scripts/balance.js abilities --ability-samples 150          # abilities only (~12 min)
node scripts/balance.js sizes --samples 100                      # party sizes only (~10 min)
node scripts/balance.js calibrate --samples 80 --rounds 6 --write   # re-tune ENEMY_POWER (~40 min)
```

Run `calibrate --write` again after changing abilities, characters or enemies, since all of
those change how hard fights are; then run `sizes` to confirm.

## Results (October 2026)

### Party size: before and after

Chance of beating the whole ten-fight campaign, by party size (100 random parties per size per fight):

| | 1 player | 2 | 3 | 4 | 5 | 6 |
|---|---|---|---|---|---|---|
| Before | 0% | 0% | 9% | 9% | 53% | 74% |
| **After** | **46%** | **41%** | **25%** | **31%** | **26%** | **43%** |
| Average rounds per fight, after | 2.5 | 2.5 | 2.6 | 2.6 | 2.8 | 2.7 |

What changed:

- **How many enemies show up depends on party size** (`encounterComposition` in
  `shared/combat/encounters.js`). A regular fight has one more enemy than there are players;
  medium and mini-boss fights add generic enemies only for bigger parties; small parties face a
  boss without its helpers.
- **Enemy power per fight and party size** (`ENEMY_POWER`): a multiplier on enemy max health,
  Resistance, Strength and TA, found by simulation so each fight is won about this often at every
  size: regular fights 95%, medium and mini-boss 90%, bosses 85%. Toughness scales with damage, so
  small parties don't get stuck in long fights. Rows are smoothed so a bigger party never faces
  weaker enemies. This replaced the old "+10% resistance per player above three" rule.
- **A support enemy never fights alone.** A lone enemy healer used to out-heal small parties
  (one solo fight averaged 54 rounds).
- **Bots** can fill empty seats (see `docs/COMBAT.md`), and count as party members for scaling.

### Abilities: what changed

Only buffs. Each change lifted an ability that measured weak against the others in its slot.

| Ability | Change |
|---|---|
| Quick Jab (DPS 1) | Bonus action |
| Selfish Sacrifice (DPS 1) | Bonus action; +20 Strength (was +5); cooldown 3 |
| Sparkshot (DPS 1) | 9× damage (was 7×); the slow always lands |
| Fireball (DPS 5) | Every enemy in the area takes full damage (was split between them); 30% burn |
| Poison Apple (DPS 5) | Opening hit; poison 10% of max health per turn, starting at once (was 5%, a turn later) |
| Dead Calm (DPS ult) | Bonus action; works this turn and next; +60 Strength and +30 Resistance |
| Rallying Guard (Tank 1) | Bonus action; +10 Speed, +20 Resistance |
| Defensive Jab (Tank 1) | 9× damage (was 6×); −15 Resistance for 2 turns |
| Guarded Breath (Tank 1) | The ally takes half damage (doubling Resistance barely mattered) |
| Way Too Close! (Tank 1) | Also deals damage; cooldown 3 |
| Toxic Mist (Tank 3) | Uses Strength or TA, whichever is higher (Tanks have almost no TA) |
| Shield Up (Tank 3) | Bonus action |
| Cursed (Tank 3) | +50% damage taken (was +35%) |
| Stonewall (Tank 5) | +25 bonus health to the caster and everyone within 2 tiles (was +15, adjacent only) |
| G.T.G. (Tank 5) | Range 2; a teleported enemy can't move on its next turn |
| White Phospherus (Tank ult) | 20 per tick (was 15), starting the turn it's used |
| Humble, Hurry Up! (Support 1) | Bonus actions; Hurry Up! gives +15 Speed for 2 turns |
| Iron Sharpens Iron (Support 1) | +15 Strength to DPS and Tanks (was +10, DPS only) |
| Zen (Support 3) | Heals the whole party 20%; supports also +15 TA for 2 turns |
| Love (Support 3) | Heals TA/4 (was TA/5) |
| Butterfly Effect (Support 3) | Bonus action; +2 cooldown turns; enemies lose 15 Speed and 10 Resistance |
| Count me Out (Support 3) | Bonus action; 3 turns off an ally's cooldowns |
| EMP (Support ult) | Also deals damage to every enemy |
| Dedicating Everything to You (Support ult) | +25 to all stats for 2 turns |

Biggest gap inside any slot, before and after (edge of the best ability minus the worst):

| Slot | Before | After |
|---|---|---|
| Support level 3 (Battery Drain on top) | 0.18 | 0.14 |
| DPS level 5 (Counter on top) | 0.16 | 0.10 |
| DPS ultimate (Black Hole on top) | 0.13 | 0.14 |
| Support ultimate | 0.10 | 0.05 |
| Tank level 3 | 0.08 | 0.06 |
| Every other slot | up to 0.06 | 0.00–0.07 |

Counter, Battery Drain and Black Hole are still the strongest picks in their slots. They weren't
nerfed. The DPS ultimate slot didn't narrow: Dead Calm got much better, but Black Hole rose with it
(the bot uses it well against the new enemy groups). Closing those last gaps is the next thing to
look at after playtesting. Other
changes made alongside: Last Legion now has 25 Strength and 25 TA (was 45 / 5), ultimates keep
their cooldowns between fights, and swapping an ultimate on a level-up starts the new one with the
old one's remaining cooldown + 3.

### Full ability tables (after)

#### DPS - Level 1

| Ability | Edge vs slot average | Win rate | Uses per fight |
|---|---|---|---|
| Quick Jab | +0.02 ± 0.01 | 93% | 1.0 |
| Shadow Strike | +0.01 ± 0.01 | 96% | 0.7 |
| Sparkshot | -0.01 ± 0.01 | 93% | 0.6 |
| Vine Whip | -0.01 ± 0.01 | 93% | 0.7 |
| Selfish Sacrifice | -0.01 ± 0.01 | 94% | 0.6 |

#### DPS - Level 3

| Ability | Edge vs slot average | Win rate | Uses per fight |
|---|---|---|---|
| Blizzard | +0.00 ± 0.01 | 94% | 0.1 |
| Calm Under Pressure | +0.00 ± 0.00 | 93% | 0.1 |
| Flood of Frost | -0.00 ± 0.01 | 93% | 0.2 |
| Flash Step | -0.00 ± 0.01 | 94% | 0.2 |

#### DPS - Level 5

| Ability | Edge vs slot average | Win rate | Uses per fight |
|---|---|---|---|
| Counter | +0.06 ± 0.01 | 95% | 0.5 |
| Fireball | -0.02 ± 0.01 | 92% | 0.5 |
| Poison Apple | -0.04 ± 0.01 | 91% | 0.4 |

#### DPS - Ultimate

| Ability | Edge vs slot average | Win rate | Uses per fight |
|---|---|---|---|
| Black Hole | +0.08 ± 0.02 | 97% | 0.6 |
| No Limits | -0.02 ± 0.01 | 90% | 0.8 |
| Dead Calm | -0.06 ± 0.01 | 89% | 0.6 |

#### Tank - Level 1

| Ability | Edge vs slot average | Win rate | Uses per fight |
|---|---|---|---|
| Ability Boost | +0.01 ± 0.01 | 93% | 1.0 |
| Guarded Breath | +0.01 ± 0.01 | 93% | 0.6 |
| Defensive Jab | +0.00 ± 0.01 | 93% | 0.5 |
| Rallying Guard | -0.01 ± 0.01 | 93% | 0.9 |
| Way Too Close! | -0.02 ± 0.00 | 92% | 0.2 |

#### Tank - Level 3

| Ability | Edge vs slot average | Win rate | Uses per fight |
|---|---|---|---|
| Toxic Mist | +0.03 ± 0.01 | 97% | 0.9 |
| Shield Up | +0.02 ± 0.01 | 97% | 0.8 |
| Cursed | -0.02 ± 0.01 | 97% | 0.8 |
| Binding Chains | -0.03 ± 0.01 | 95% | 0.5 |

#### Tank - Level 5

| Ability | Edge vs slot average | Win rate | Uses per fight |
|---|---|---|---|
| Greater Ability Boost | +0.02 ± 0.01 | 93% | 1.0 |
| Charge! | +0.01 ± 0.01 | 93% | 0.2 |
| G.T.G. | -0.01 ± 0.01 | 90% | 0.3 |
| Stonewall | -0.02 ± 0.01 | 90% | 0.9 |

#### Tank - Ultimate

| Ability | Edge vs slot average | Win rate | Uses per fight |
|---|---|---|---|
| White Phospherus | +0.02 ± 0.01 | 99% | 0.9 |
| Executioner's Judgment | -0.01 ± 0.01 | 97% | 0.8 |
| Murus Fictilis | -0.01 ± 0.01 | 94% | 0.8 |

#### Support - Level 1

| Ability | Edge vs slot average | Win rate | Uses per fight |
|---|---|---|---|
| The Show Must Go On | +0.04 ± 0.01 | 89% | 1.2 |
| Feels Like Home | +0.03 ± 0.01 | 87% | 1.6 |
| Humble | -0.02 ± 0.01 | 89% | 2.6 |
| Hurry Up! | -0.03 ± 0.01 | 85% | 0.7 |
| Iron Sharpens Iron | -0.03 ± 0.01 | 85% | 0.4 |

#### Support - Level 3

| Ability | Edge vs slot average | Win rate | Uses per fight |
|---|---|---|---|
| Battery Drain | +0.10 ± 0.02 | 96% | 1.1 |
| Love | +0.00 ± 0.01 | 87% | 0.8 |
| Zen | -0.02 ± 0.01 | 91% | 0.5 |
| Count me Out | -0.04 ± 0.01 | 89% | 0.6 |
| Butterfly Effect | -0.04 ± 0.01 | 88% | 0.5 |

#### Support - Level 5

| Ability | Edge vs slot average | Win rate | Uses per fight |
|---|---|---|---|
| Here We Go Again | +0.00 ± 0.01 | 81% | 0.2 |
| Blackjack | +0.00 ± 0.01 | 80% | 0.4 |
| Eagle Eye | -0.01 ± 0.01 | 81% | 0.2 |

#### Support - Ultimate

| Ability | Edge vs slot average | Win rate | Uses per fight |
|---|---|---|---|
| Love Galore | +0.02 ± 0.02 | 81% | 0.6 |
| EMP | +0.01 ± 0.01 | 81% | 0.8 |
| Dedicating Everything to You | -0.03 ± 0.02 | 79% | 0.8 |
