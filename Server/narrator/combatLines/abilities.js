// Using an ability, eight lines each. Enemies draw abilities from the same pool, so {user} can be
// anyone. {target} appears only in abilities aimed at one unit (an enemy, an ally, or whoever a
// gate moves). Some lines are two sentences; they cost nothing.

export const ABILITY_LINES = {
    // ----- Tank -----
    ability_boost: [
        `{user} rolls both shoulders and comes out of it looking a size bigger.`,
        `{user} takes one long breath, and every move after it is a little faster and a little meaner.`,
        `{user} shakes out both arms between hits. Whatever that did, it worked.`,
        `{user} grits {user.their} teeth and pushes everything a notch past where it should go.`,
        `{user} bounces on {user.their} heels, loosening up like the fight is only now getting started.`,
        `{user} slaps both cheeks, hard, and the tiredness drains right out of {user.their} face.`,
        `{user} stomps once and squares up, sharper everywhere at once.`,
        `{user} cranks something on {user.their} gear until it whines, then grins at the result.`
    ],
    guarded_breath: [
        `{user} steps in front of {target} and squares up to take the worst of it.`,
        `{user} puts a hand on {target}'s shoulder. "Stay behind me."`,
        `{user} shifts over to cover {target}, ready to eat whatever comes next.`,
        `{user} raises a guard over {target}, close enough to catch anything meant for {target.them}.`,
        `{user} gets between {target} and the fight, which is the whole job.`,
        `{user} drags {target} half a step back and plants {user.self} right where {target} was standing.`,
        `{user} keeps one eye on the enemy and the other on {target}. Nobody's touching {target.them} on this watch.`,
        `{user} nods at {target}. "I've got you." It isn't a question.`
    ],
    rallying_guard: [
        `{user} bangs a fist on {user.their} chest and digs in, suddenly much harder to move.`,
        `{user} lets out a shout that's half warning, half dare, and settles into a crouch.`,
        `{user} squares up, light on the feet and heavy everywhere else.`,
        `{user} plants both feet and rolls {user.their} neck. Anyone who wants through is welcome to try.`,
        `{user} tightens every strap at once and bounces on the balls of {user.their} feet.`,
        `{user} hunches behind raised forearms and starts moving in short, quick shuffles.`,
        `{user} shakes off the last hit and comes back up tougher than before.`,
        `{user} barks a rallying cry that's mostly for {user.their} own benefit, and it works.`
    ],
    defensive_jab: [
        `{user} snaps a short, ugly jab into {target}'s guard and leaves a dent in it.`,
        `{user} drives a quick strike into {target}, cracking the armor at the seam.`,
        `{user} jabs {target} hard enough to knock a plate loose.`,
        `{user} punches straight through {target}'s defenses and leaves a gap behind.`,
        `{user} catches {target} with a blunt, efficient strike. Their guard isn't what it was.`,
        `{user} feints high and drills {target} low, right where the armor's thinnest.`,
        `{user} raps {target} twice in the same spot, and the second hit goes through.`,
        `{user} steps in and jabs {target} in the chest, nothing fancy, just enough to open {target.them} up.`
    ],
    way_too_close: [
        `{user} shoves {target} back a step and slams a barrier down between them.`,
        `{user} plants a boot in {target}'s chest. "Way too close."`,
        `{user} hurls {target} backward and throws up a shimmering wall before {target.they} can come back.`,
        `{user} bodies {target} out of reach and seals the gap with a sheet of hard light.`,
        `{user} shoves {target} away and a barrier snaps up between them. Personal space, enforced.`,
        `{user} catches {target} with a hard shoulder that sends {target.them} stumbling, then walls {target.them} off.`,
        `{user} doesn't like how close {target} got, and says so with an elbow and a force field.`,
        `{user} pushes {target} back hard. The barrier that drops between them hums like it agrees.`
    ],
    shield_up: [
        `{user} braces behind a shimmering shield and goes perfectly, stubbornly still.`,
        `{user} locks the shield in place and becomes a wall that doesn't move.`,
        `{user} raises a barrier and sinks behind it, rooted to the spot.`,
        `{user} hunkers down behind an energy shield and waits for the storm.`,
        `{user} snaps up a shield that drinks in every hit, then plants both feet.`,
        `{user} crouches behind a dome of light. Nothing's getting through, and {user} isn't going anywhere.`,
        `{user} throws up a barrier with a grunt and digs in for the long haul.`,
        `{user} raises a shield so solid that the next blow just stops against it.`
    ],
    toxic_mist: [
        `{user} cracks open a canister and a green, choking mist rolls across the ground.`,
        `{user} lobs a toxic charge that blooms into a sickly cloud.`,
        `{user} floods the area with a stinging haze that makes eyes water from across the street.`,
        `{user} releases a hissing cloud that settles low and mean.`,
        `{user} spreads a fog that smells like a chemical plant on a bad day.`,
        `{user} pops a seal and a thick green vapor spills out, curling around ankles.`,
        `{user} tosses a canister into the middle of the enemy and steps back to watch them cough.`,
        `{user} sprays a cloud of poison across the ground. Nobody wants to stand in that, and soon nobody will.`
    ],
    binding_chains: [
        `{user} hurls energy chains that snap tight around two enemies and pin them in place.`,
        `{user} lashes out with glowing chains that wrap, lock and hold.`,
        `{user} flings a pair of chains that coil around the nearest targets and pull them up short.`,
        `{user} binds two foes with snapping links of light that refuse to let go.`,
        `{user} throws a tangle of chains, and two enemies find their feet stuck right where they are.`,
        `{user} whips out a length of shimmering chain. Two enemies are suddenly going nowhere.`,
        `{user} sends chains snaking across the ground to lock around two sets of ankles.`,
        `{user} yanks hard on a fistful of energy chains and two enemies jerk to a stop.`
    ],
    cursed: [
        `{user} points at {target}, and a dark mark spreads across {target.their} armor.`,
        `{user} stamps a glowing brand onto {target}, the kind of mark that invites trouble.`,
        `{user} marks {target} with a flick of the wrist, and now everyone knows who to hit.`,
        `{user} lays a curse on {target}. Every hit from here on is going to hurt a lot more.`,
        `{user} curses {target} under {user.their} breath, and the words leave a stain that glows.`,
        `{user} taps {target} with two fingers, and a sickly light seeps into the spot.`,
        `{user} tags {target} with a mark that flickers like a target painted on a wall.`,
        `{user} whispers something nasty at {target}, and the air around {target.them} goes sour.`
    ],
    greater_ability_boost: [
        `{user} cranks every system to the limit and the heat coming off {user.them} warps the air.`,
        `{user} roars, muscles bulging and armor flaring as the boost kicks in.`,
        `{user} overclocks everything at once: faster, tougher, meaner.`,
        `{user} triggers a surge that turns {user.their} whole body into a weapon.`,
        `{user} lets out a guttural shout as power floods every limb.`,
        `{user} punches a button on {user.their} chest rig and immediately looks like a much worse problem.`,
        `{user} breathes in hard and comes up taller. Whatever's running through {user.their} veins now, it isn't coffee.`,
        `{user} kicks every limiter offline, grinning like that was a great idea.`
    ],
    stonewall: [
        `{user} slams a fist into the ground and a shimmering wall rises over everyone nearby.`,
        `{user} raises an arm, and a dome of hard light settles over the closest allies.`,
        `{user} plants both feet and throws a barrier over the whole huddle.`,
        `{user} digs in, and a ripple of shielding spreads to everyone within arm's reach.`,
        `{user} yells for everyone to get close. The barrier slams down around them a heartbeat later.`,
        `{user} braces, and a ring of protective light blooms around the nearby party.`,
        `{user} stamps the ground and a curtain of energy wraps the closest allies like a coat.`,
        `{user} spreads both arms wide. Everyone within reach is suddenly much harder to hurt.`
    ],
    charge: [
        `{user} drops a shoulder and barrels into {target} at full speed.`,
        `{user} charges {target} at a dead sprint, every ounce of weight behind it.`,
        `{user} launches at {target} with a bellow that rattles the windows.`,
        `{user} hurtles into {target} with nothing held back.`,
        `{user} goes straight through {target} and doesn't slow down to apologize.`,
        `{user} lowers {user.their} head and charges. {target} has about half a second to regret standing there.`,
        `{user} rushes {target}, closing the distance faster than anyone that size should.`,
        `{user} picks a line straight through {target} and commits to it.`
    ],
    gtg: [
        `{user} drops a gate under {target}, and {target} blinks to a new spot on the street.`,
        `{user} slaps a transport gate down and {target} vanishes in a flash, reappearing somewhere else entirely.`,
        `{user} opens a shimmering doorway beneath {target}, who drops through it with a yelp.`,
        `{user} relocates {target} with a gate and a satisfied little nod.`,
        `{user} tosses a disc at {target}'s feet. One flash later, {target} is standing somewhere new and very confused.`,
        `{user} folds space around {target} and puts {target.them} right where {target.they} should be.`,
        `{user} thumbs a trigger, a gate snaps open, and {target} gets moved like a piece on a board.`,
        `{user} drops a portal under {target}. It isn't a gentle trip.`
    ],
    murus_fictilis: [
        `{user} raises a fist and the whole party is suddenly standing behind a wall of hard light.`,
        `{user} roars a command, and shimmering armor snaps over every ally at once.`,
        `{user} slams a palm into the pavement and a great shield rises for everyone.`,
        `{user} calls up the old wall. The party stands behind something nothing gets through.`,
        `{user} plants a banner of light, and every ally stands taller and tougher behind it.`,
        `{user} brings both fists together and a glowing barrier wraps the entire party.`,
        `{user} shouts, "Hold the line!" and the line suddenly has a lot more armor to hold it with.`,
        `{user} lifts both hands, and every ally lights up with a hard, glassy shell.`
    ],
    executioners_judgment: [
        `{user} raises a hand like a judge passing sentence, and every enemy feels the weight of it.`,
        `{user} speaks a single word, and the enemy line buckles.`,
        `{user} hammers down a verdict that hits every foe at once.`,
        `{user} lets a terrible pressure fall across the field, crushing the weak and staggering the strong.`,
        `{user} points at the enemy line. The weakest of them fold first.`,
        `{user} brings a fist down, and every enemy staggers like the ground dropped out from under them.`,
        `{user} passes judgment on the whole field. Nobody on the other side walks away untouched.`,
        `{user} glares across the battlefield, and the enemies sag under a weight they can't see.`
    ],
    white_phospherus: [
        `{user} hurls a phosphorus charge that bursts over the enemy line in a falling white shower.`,
        `{user} sets the whole field ablaze with a blinding white fire that won't go out.`,
        `{user} rains burning phosphorus across every enemy in sight.`,
        `{user} unleashes a hissing white inferno that clings and keeps on burning.`,
        `{user} detonates a phosphorus shell overhead, and the enemies scatter under the burning rain.`,
        `{user} tosses a canister into the sky. It bursts, and white fire drifts down onto everything that isn't on {user.their} side.`,
        `{user} lights up the enemy line with fire so bright it leaves spots behind everyone's eyes.`,
        `{user} sets off a phosphorus burst. The enemies are going to be feeling that one for a while.`
    ],

    // ----- DPS -----
    selfish_sacrifice: [
        `{user} burns {user.their} own tech for raw muscle, veins glowing with the stolen power.`,
        `{user} reroutes everything into strength and speed, technique be damned.`,
        `{user} trades finesse for force, and the change is visible from across the street.`,
        `{user} grits {user.their} teeth as the tech drains into muscle, coming out bigger and faster.`,
        `{user} gives up the clever stuff for the brutal stuff, and looks happy about it.`,
        `{user} rips a cable out of {user.their} own rig and plugs it into something that makes {user.them} twitch.`,
        `{user} dumps every circuit's worth of power into arms and legs. Subtle it isn't.`,
        `{user} shorts out {user.their} own gear on purpose. What comes back is pure, ugly strength.`
    ],
    quick_jab: [
        `{user} flicks a lightning jab into {target} that rattles {target.their} whole arm.`,
        `{user} snaps a quick strike at {target}, and {target.their} next swing is going to be a weak one.`,
        `{user} darts in, tags {target}, and darts right back out.`,
        `{user} lands a sharp jab on {target} before {target.they} can even blink.`,
        `{user} pops {target} in the wrist, and {target.their} grip goes slack.`,
        `{user} sneaks a fast one past {target}'s guard. It's not a big hit, but it stings in all the right places.`,
        `{user} jabs {target} in the shoulder, right where it takes the fight out of an arm.`,
        `{user} throws a quick shot at {target}'s elbow. That arm isn't swinging hard anytime soon.`
    ],
    sparkshot: [
        `{user} fires a spitting spark at {target} that leaves {target.them} twitching and slow.`,
        `{user} looses a bolt of energy that slams into {target} and wrecks {target.their} footing.`,
        `{user} snaps off a burst of sparks that catches {target} square.`,
        `{user} zaps {target} with a flash of electric light.`,
        `{user} flings a ball of energy at {target}, and {target.their} legs don't want to work right after.`,
        `{user} points two fingers at {target} and a bolt jumps the gap. {target} stumbles.`,
        `{user} tags {target} with a jolt that locks up {target.their} knees for a second.`,
        `{user} sends a hissing spark into {target}'s chest, and every step {target} takes after that looks like wading.`
    ],
    shadow_strike: [
        `{user} melts into the shadows and comes back out behind {target}, already swinging.`,
        `{user} disappears for a heartbeat and reappears with a strike buried in {target}.`,
        `{user} circles around {target} and lands a brutal blow from the blind side.`,
        `{user} slips out of sight, then hits {target} from somewhere {target.they} never thought to look.`,
        `{user} steps through the darkness and buries a strike in {target}.`,
        `{user} fades, and {target} spins around to find nothing there. The hit comes from the other side.`,
        `{user} drops low out of sight and comes up under {target}'s guard.`,
        `{user} vanishes into the dark between two streetlights. {target} finds out where with {target.their} ribs.`
    ],
    vine_whip: [
        `{user} lashes out with a sweeping whip that cracks across the enemies in front.`,
        `{user} spins and flays everything in a wide arc ahead.`,
        `{user} snaps a whip of energy left and right, catching anyone standing too close.`,
        `{user} unleashes a lashing sweep that clears the ground ahead.`,
        `{user} cracks the whip in a wide circle, and everyone nearby flinches.`,
        `{user} swings a long, thorny lash low across the ground, catching ankles and knees.`,
        `{user} whips both arms forward and a crackling vine tears through the front of the enemy line.`,
        `{user} flicks the whip out and back. Anyone in front of {user} now has a matching welt.`
    ],
    flash_step: [
        `{user} blurs, suddenly moving twice as fast as anyone has a right to.`,
        `{user} kicks into high gear, and the rest of the fight seems to slow down around {user.them}.`,
        `{user} flickers with speed and is somewhere else before anyone can react.`,
        `{user} winds up and bursts into a blinding sprint.`,
        `{user} hits the accelerator, every step a flash.`,
        `{user} rocks back on {user.their} heels, and then there's just a streak of light where {user} was standing.`,
        `{user} shakes out {user.their} legs and takes off. The ground barely has time to feel it.`,
        `{user} finds another gear. Everyone else is suddenly moving underwater.`
    ],
    blizzard: [
        `{user} calls down a howling blizzard that turns the ground to ice.`,
        `{user} conjures a swirling storm of snow and sleet right on top of the enemy.`,
        `{user} summons a whiteout, and the enemies slog through it at half speed.`,
        `{user} unleashes a freezing storm that coats everything in frost.`,
        `{user} spins up a funnel of ice and wind that bites straight through armor.`,
        `{user} throws a fistful of cold into the air. A second later it's snowing sideways.`,
        `{user} drops the temperature of a whole corner of the street, and anyone standing in it starts to shiver.`,
        `{user} brings a blizzard down on the enemies. Every step through it is a fight.`
    ],
    calm_under_pressure: [
        `{user} closes both eyes for a single breath and comes back steadier.`,
        `{user} finds the center of all this chaos and rests in it for a moment, and the wounds ease.`,
        `{user} takes a long, slow breath and pulls the pieces back together.`,
        `{user} goes quiet inside the noise. When {user.their} eyes open again, the pain has backed off.`,
        `{user} steadies {user.their} breathing, and the worst of the hurt fades.`,
        `{user} rolls {user.their} shoulders and lets the panic drain out. What's left can still fight.`,
        `{user} breathes in through the nose and out through the mouth, the way someone once taught {user.them}. It still works.`,
        `{user} keeps {user.their} head while everything else is falling apart, and patches up the damage in the quiet.`
    ],
    flood_of_frost: [
        `{user} unleashes a flood of ice that slams into {target} and locks up {target.their} joints.`,
        `{user} sends a rolling wave of frost into {target}, freezing {target.their} feet to the ground.`,
        `{user} conjures a torrent of freezing water that crashes over {target}.`,
        `{user} blasts {target} with a frosty surge, and {target} slows to a crawl.`,
        `{user} buries {target} in a wave of glittering ice.`,
        `{user} throws both hands forward, and {target} disappears in a burst of frost. They come out of it moving like molasses.`,
        `{user} breathes out a stream of cold that turns {target}'s armor white.`,
        `{user} drowns {target} in ice water that freezes the moment it touches {target.them}.`
    ],
    counter: [
        `{user} settles into a perfect stance, daring anyone to swing first.`,
        `{user} smiles thinly and raises a guard that will send any blow straight back.`,
        `{user} goes still and watchful, a trap with the spring already set.`,
        `{user} switches up the stance and waits for someone foolish enough to attack.`,
        `{user} spreads both hands in invitation, and a faint shimmer settles over {user.them}.`,
        `{user} motions with two fingers. "Go on, hit me." Nobody's sure they should.`,
        `{user} sets {user.their} feet and loosens up, ready to turn the next hit around on whoever throws it.`,
        `{user} raises a barrier that hums softly, waiting for something to bounce back.`
    ],
    fireball: [
        `{user} hurls a roaring fireball that bursts in a storm of flame.`,
        `{user} conjures a sphere of fire and flings it into the thick of the enemies.`,
        `{user} launches a blazing fireball that lights up the whole block.`,
        `{user} lobs a ball of fire that goes off in a bright, hungry bloom.`,
        `{user} calls up a fireball that crashes down and leaves the ground burning.`,
        `{user} cups fire between both hands until it's too hot to hold, then throws it.`,
        `{user} sends a fireball spinning into the enemies. A few of them are going to be smoking for a while.`,
        `{user} flicks a spark that swells into a fireball mid-flight and lands right on top of them.`
    ],
    poison_apple: [
        `{user} throws a glowing green orb that bursts against {target} and soaks in.`,
        `{user} hits {target} with a toxic shot, and {target.their} wounds start to fester.`,
        `{user} poisons {target} with a sweet-smelling burst that turns sour fast.`,
        `{user} offers {target} a gift of poison {target.they} never asked for.`,
        `{user} lands a venomous strike on {target}, who won't be healing anytime soon.`,
        `{user} flicks a drop of something bright green at {target}. It hisses on contact.`,
        `{user} tags {target} with a dart that leaves a spreading purple bruise behind.`,
        `{user} hits {target} with a nasty little burst of poison. Every breath costs {target.them} something now.`
    ],
    no_limits: [
        `{user} throws every rule and restraint away, ready to strike again and again.`,
        `{user} grins, cracks {user.their} knuckles, and decides there are no limits today.`,
        `{user} lets everything go at once, faster than any weapon should be able to swing.`,
        `{user} shrugs off every limit with a roar, weapon already moving.`,
        `{user} goes into overdrive, ready to tear through anything in reach.`,
        `{user} rips the safety off. What comes next isn't going to be pretty.`,
        `{user} rolls {user.their} neck and stops holding back, for the first time all day.`,
        `{user} loosens up, eyes going bright. It's going to be a flurry.`
    ],
    dead_calm: [
        `{user} goes utterly still, and the noise around {user.them} seems to fade.`,
        `{user} plants both feet and turns into an immovable, deadly calm.`,
        `{user} breathes out slowly, and the world narrows to a single point.`,
        `{user} roots to the spot, muscles locking with sudden, terrible strength.`,
        `{user} lets the noise fall away and becomes nothing but the next blow.`,
        `{user} stops moving. It's the scariest thing anyone on the street has seen so far.`,
        `{user} settles into a stance and stays there. Whatever comes close is going to get hit very hard.`,
        `{user} goes so still the dust settles on {user.them}. Then comes the smile.`
    ],
    black_hole: [
        `{user} tears open a black hole, and the enemies get dragged screaming into its spiral.`,
        `{user} rips a hole in the street, and the whole enemy line falls toward the dark.`,
        `{user} summons a crushing void that drags every enemy nearby into its center.`,
        `{user} opens a swirling black hole, and suddenly the fight has a center of gravity.`,
        `{user} conjures an inky void that pulls in everything around it and doesn't let go.`,
        `{user} closes a fist, and a pinprick of black swells into a whirlpool that swallows the enemy line.`,
        `{user} drops a spiral of darkness into the middle of the enemies. They slide toward it, clawing at the pavement.`,
        `{user} bends space until it breaks, and every enemy nearby gets sucked into the crack.`
    ],

    // ----- Support -----
    feels_like_home: [
        `{user} drops a warm glow of healing light that settles over the ground like a hearth.`,
        `{user} lays down a soft field of light that smells faintly of home cooking.`,
        `{user} plants a healing zone, and for the first time today the air inside it feels safe.`,
        `{user} spreads a gentle aura that knits wounds closed for anyone who steps in.`,
        `{user} anchors a ring of healing energy that hums like a lullaby.`,
        `{user} tosses down a little device that unfolds into a circle of warm, golden light.`,
        `{user} marks out a safe spot on the street. Anyone standing in it will feel better soon.`,
        `{user} sets up a glowing patch of ground that feels like coming home after a long shift.`
    ],
    the_show_must_go_on: [
        `{user} patches up {target} with quick, practiced hands.`,
        `{user} sends a pulse of healing into {target}. "Not yet. Show's not over."`,
        `{user} hauls {target} back onto {target.their} feet with a burst of warm light.`,
        `{user} slaps a fix on {target}'s worst wound and sends {target.them} back out.`,
        `{user} pumps a jolt of energy into {target}, who stands a little straighter.`,
        `{user} jogs over to {target}, does something quick and medical, and slaps {target.their} back.`,
        `{user} tells {target} to hold still. Thirty seconds of work later, {target} is good to go.`,
        `{user} shoves a glowing patch onto {target}'s side. "You're fine. Get back out there."`
    ],
    humble: [
        `{user} takes a breath, sets the ego aside, and focuses.`,
        `{user} nods to nobody in particular, and {user.their} mind sharpens.`,
        `{user} drops the bravado and gets clever.`,
        `{user} lets the noise wash past and finds a sharper focus underneath.`,
        `{user} cracks {user.their} knuckles and settles into a smarter rhythm.`,
        `{user} swallows a smart remark and puts that energy somewhere more useful.`,
        `{user} goes quiet and thoughtful. That's usually when {user} is most dangerous.`,
        `{user} shakes off the showing off and gets down to work.`
    ],
    hurry_up: [
        `{user} slaps {target} on the back. "Move it, move it!"`,
        `{user} fires a burst of adrenaline into {target}, who suddenly can't stand still.`,
        `{user} kicks {target} into gear with a jolt of speed.`,
        `{user} shouts {target} into a sprint.`,
        `{user} gives {target} a shove of pure speed and a look that says hurry.`,
        `{user} snaps fingers at {target}. "Today would be good." {target}'s feet get the message.`,
        `{user} jabs {target} with something that makes {target.their} legs feel brand new.`,
        `{user} yells at {target} to stop standing around, and helps with a burst of energy.`
    ],
    iron_sharpens_iron: [
        `{user} bangs a fist on the nearest armor, and every fighter in the party stands a little taller.`,
        `{user} shouts encouragement, and the heavy hitters dig in harder.`,
        `{user} rallies the fighters, and their grips tighten on their weapons.`,
        `{user} fires up the front line with a few hard words and a harder look.`,
        `{user} sends a surge of fighting spirit through every brawler in the party.`,
        `{user} reminds the fighters exactly why they're here. They swing harder after that.`,
        `{user} claps twice and points at the enemy. The party's muscle takes it personally.`,
        `{user} yells something rude about the enemy's mother, and the fighters laugh and hit harder.`
    ],
    love: [
        `{user} spreads a warm wave of healing across the whole party.`,
        `{user} sends a pulse of light through every ally at once, and they all breathe easier.`,
        `{user} gives the party something to hold on to, and their wounds close a little.`,
        `{user} reaches out to everyone at once with a gentle surge of healing.`,
        `{user} lights up with warmth, and the whole team gets a share of it.`,
        `{user} smiles, and somehow every ally on the street feels it.`,
        `{user} closes both eyes and sends something soft and bright out to everyone on {user.their} side.`,
        `{user} lets out a long breath, and a gentle glow passes from ally to ally like a handshake.`
    ],
    count_me_out: [
        `{user} plugs into {target}'s gear and gets it humming again way ahead of schedule.`,
        `{user} reroutes power to {target}, and every one of {target.their} tricks is ready again.`,
        `{user} taps something on {target}'s wrist and winks. "You're good to go."`,
        `{user} jolts {target}'s tech back to life, ready to go another round.`,
        `{user} gives {target} a fresh start with a burst of energy.`,
        `{user} reboots {target}'s systems with one quick command.`,
        `{user} slaps {target}'s back hard enough to knock the rust loose. Everything in {target.their} kit is ready to use again.`,
        `{user} tosses {target} a fresh power cell. "Stop waiting. Go."`
    ],
    zen: [
        `{user} closes both eyes and breathes, and the whole party seems to breathe with {user.them}.`,
        `{user} spreads a calm that settles over every ally like warm rain.`,
        `{user} finds a quiet center and shares it with the team.`,
        `{user} hums softly, and wounds start knitting closed all around.`,
        `{user} lets off a calm glow that steadies every ally in sight.`,
        `{user} sits down in the middle of the fight, legs crossed. Everyone around {user.them} starts to heal.`,
        `{user} breathes deep and slow, and every ally's heartbeat settles to match.`,
        `{user} goes so calm that some of it rubs off on everyone else. Wounds close, nerves settle.`
    ],
    battery_drain: [
        `{user} siphons a stream of energy out of {target} and passes it to a wounded friend.`,
        `{user} latches onto {target}'s power cells and drinks {target.them} dry.`,
        `{user} drains {target}, and the stolen energy flows straight to the weakest ally.`,
        `{user} sucks the charge out of {target}, the same way you'd pull a plug.`,
        `{user} pulls power out of {target} in a hissing stream of blue light.`,
        `{user} grabs onto {target} with a beam that leaves {target.them} flickering and weak.`,
        `{user} taps {target} like a stolen power line and sends the juice to a teammate who needs it.`,
        `{user} drains {target} until the lights on {target.their} gear sputter.`
    ],
    butterfly_effect: [
        `{user} nudges one small thing, and every enemy's plan quietly falls apart.`,
        `{user} flicks a single switch, and the enemy stumbles everywhere at once.`,
        `{user} sets off a chain of tiny disruptions that slows every foe in sight.`,
        `{user} sends a ripple of interference through the enemy line.`,
        `{user} triggers a cascade of small failures, and the enemy line slows to a crawl.`,
        `{user} tweaks one setting on a handheld. Across the street, every enemy's gear starts acting up.`,
        `{user} whispers a command into the city's network. The enemies' equipment stops trusting them.`,
        `{user} jams the enemy's rhythm with a pulse nobody can hear. Everything over there gets slower and clumsier.`
    ],
    blackjack: [
        `{user} rolls the dice on {target}, hoping for a winning hand.`,
        `{user} gambles on a risky burst of healing for {target}.`,
        `{user} flips a coin over {target} and lets it decide.`,
        `{user} deals {target} a card off the bottom of the deck and hopes it's an ace.`,
        `{user} bets big on {target}'s recovery.`,
        `{user} closes {user.their} eyes, crosses {user.their} fingers, and throws everything at {target}.`,
        `{user} goes all in on {target}. Whatever happens next, at least it was exciting.`,
        `{user} takes a long shot on fixing {target}. The house usually wins, but not always.`
    ],
    eagle_eye: [
        `{user} narrows both eyes and reads every enemy like an open book.`,
        `{user} scans the field, and every weakness lights up in sharp detail.`,
        `{user} sees everything at once: every wound, every weak spot.`,
        `{user} takes in the whole fight with one long, piercing look.`,
        `{user} peers through the chaos and reads every foe at a glance.`,
        `{user} flips down a visor, and every enemy's injuries scroll past in neat little columns.`,
        `{user} studies the enemy line. Now {user} knows exactly who's about to fold.`,
        `{user} squints, tilts {user.their} head, and figures out exactly how badly everyone on the other side is hurting.`
    ],
    here_we_go_again: [
        `{user} hits reset, and every ally's gear hums back to life.`,
        `{user} grins. "Here we go again." The whole party is ready to run it back.`,
        `{user} rewinds the clock on every ally's gear.`,
        `{user} restarts every system on the team with a single sweeping gesture.`,
        `{user} gives everyone a second wind and a full reload.`,
        `{user} claps once, and every trick the party already used is ready to go again.`,
        `{user} reboots the whole team at once. Round two, same as round one.`,
        `{user} sends a refresh through every ally's gear, and the whole party perks up.`
    ],
    dedicating: [
        `{user} pours everything into {target}, who lights up with borrowed power.`,
        `{user} gives {target} every ounce of energy, holding nothing back.`,
        `{user} dedicates all of it to {target}, who suddenly looks unstoppable.`,
        `{user} channels a surge of power into {target} with a fierce, quiet focus.`,
        `{user} makes {target} the centerpiece of the fight, boosting everything about {target.them}.`,
        `{user} grabs {target}'s hand and lets it all go. {target} comes away shaking with power.`,
        `{user} bets the whole fight on {target} and gives {target.them} every scrap of strength to win it.`,
        `{user} looks at {target}. "This is all yours." Then {target} starts glowing.`
    ],
    emp: [
        `{user} sets off a pulse that kills every light and every enemy system nearby.`,
        `{user} detonates an electromagnetic burst, and the enemy gear sputters, sparks and dies.`,
        `{user} unleashes a wave that fries every circuit on the other side.`,
        `{user} triggers a pulse that sends the enemies' systems into a smoking blackout.`,
        `{user} lets loose a burst, and the whole enemy line flickers and goes dark.`,
        `{user} slams a palm onto a homemade device. A heartbeat later, every enemy's gear goes dead in their hands.`,
        `{user} overloads a power cell and throws it. The flash knocks out every enemy system on the street.`,
        `{user} cuts the power to everything the enemy owns. Their screens go black and their weapons go quiet.`
    ],
    love_galore: [
        `{user} opens up, and a flood of warm light washes over the whole party.`,
        `{user} unleashes a wave of healing so strong it lifts everyone off their knees.`,
        `{user} pours out everything, and every ally feels it like a hand on the shoulder.`,
        `{user} glows with a golden warmth that heals the entire team.`,
        `{user} sends a surge of light through the party, and wounds close all over.`,
        `{user} throws both arms wide. Every ally on the street gets back up a little stronger.`,
        `{user} lets loose a burst of healing so bright it makes the enemy squint.`,
        `{user} gives everything to the people around {user.them}. It's a lot.`
    ]
};
