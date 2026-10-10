// A party member's weapon landing the blow that takes an enemy out: three per weapon per enemy.
// {user} is the party member, {victim} the enemy. Bosses are beaten, never killed: the story
// carries on with them afterward.

export const WEAPON_KILLS = {
    Hammer: { // Shipment
        enforcer_soldier: [
            `{user} brings the hammer down on {victim}'s helmet. The visor cracks, the radio keeps talking, and nobody answers it.`,
            `{user} sweeps {victim}'s legs with the hammer's handle, then finishes the job with the head.`,
            `{user} catches {victim} mid-swing and knocks the baton, and its owner, clean across the street.`
        ],
        enforcer_drone: [
            `{user} swats {victim} out of the air like a fly. It bounces twice and stops buzzing.`,
            `{user} waits for {victim} to dip low, then flattens it into the pavement with one swing.`,
            `{user} hooks {victim} with the hammer on its way past, and the rotors go one way while the rest goes the other.`
        ],
        rebel_initiate: [
            `{user} knocks the scrap blade out of {victim}'s hands, then knocks {victim} down. "Go home, kid," he mutters, a little too late.`,
            `{user} hits {victim} once in the chest, and the fight goes out of them before they hit the ground.`,
            `{user} shoves {victim} back with the hammer's head, and {victim} trips over a curb and doesn't get up.`
        ],
        rebel_field_tech: [
            `{user} smashes {victim}'s launcher with the hammer. The backfire takes care of the rest.`,
            `{user} brings the hammer down on {victim}, and a whole backpack of salvage spills across the street.`,
            `{user} catches {victim} under the ribs, and the arc launcher fires one last bolt straight into the sky.`
        ],
        division_command: [
            `{user} brings the hammer down on {victim}'s uplink, wrist and all. The orders stop mid-sentence.`,
            `{user} walks through {victim}'s covering fire and ends the meeting with one swing.`,
            `{user} knocks {victim} flat. The wrist display keeps flashing urgent requests to nobody.`
        ],
        division_strategist: [
            `{user} swings through {victim}'s holographic map and the strategist behind it. Neither one survives the plan.`,
            `{user} reaches {victim} before the railcaster finishes charging. That's the end of the strategy.`,
            `{user} hammers {victim} into a pile of very expensive equipment.`
        ],
        vanguard_captain: [
            `{user} trades blows with {victim} until one of them doesn't get up. It isn't Shipment.`,
            `{user} brings the hammer down on {victim}'s helmet so hard the gauntlets fall silent at once.`,
            `{user} catches {victim}'s fist with the hammer, then swings back and topples all that armor like a dropped vault door.`
        ],
        field_captain: [
            `{user} snaps {victim}'s sabre in half with the hammer, then finishes the argument.`,
            `{user} interrupts {victim}'s rallying cry with a hammer to the chest.`,
            `{user} knocks {victim} flat, and the line {victim} was holding forgets what it was doing.`
        ],
        rebel_coordinator: [
            `{user} meets {victim}'s breaker hammer with his own, and his swings harder.`,
            `{user} caves in {victim}'s dented faceplate. The cell is going to need a new coordinator.`,
            `{user} sidesteps {victim}'s big swing and answers with a bigger one.`
        ],
        operations_handler: [
            `{user} crushes {victim}'s headset with the hammer, and the stolen chatter cuts out with a pop.`,
            `{user} closes the distance on {victim} before the signal rifle locks on. One swing, lights out.`,
            `{user} hits {victim} so hard the rifle's antenna snaps clean off.`
        ],
        division_chief: [
            `{user} takes the compliance blade on the hammer's handle and lands the verdict himself. {victim} goes down.`,
            `{user} drives the hammer into {victim}'s chest. The Division is going to need a new judge.`,
            `{user} brings the hammer down, and {victim} kneels for the first time in a long career.`
        ],
        rebellion_chief: [
            `{user} breaks the halberd's shaft and then breaks {victim}'s stance. The banner comes down with them.`,
            `{user} weathers {victim}'s war cry and answers it with a swing that ends the speech.`,
            `{user} hammers {victim} to the pavement, and the rebels around them go very quiet.`
        ],
        enforcer_the_architect: [
            `{user} walks straight through the light show and brings the hammer down. {victim}'s prism shatters, and so does the calm.`,
            `{user} smashes {victim} into the street, and the drones overhead hover there, unsure what to do without instructions.`,
            `{user} hits {victim} once, hard and simple. Some lessons don't need explaining.`
        ],
        enforcer_macro_hull: [
            `{user} and {victim} trade swings until the fusion core in {victim}'s chest sputters out. The big man finally goes down.`,
            `{user} brings the hammer down right on {victim}'s core, and the roar inside it dies to a whimper.`,
            `{user} out-muscles {victim}, which nobody thought was possible, least of all {victim}.`
        ],
        enforcer_genisis: [
            `{user} takes two cuts from {victim}'s arms to get close, then brings the hammer down. The surgeon folds up inside her own machinery.`,
            `{user} grabs one of {victim}'s spider arms and swings the hammer into the rest of her. She doesn't get up.`,
            `{user} smashes through {victim}'s arms one at a time, and on the last one she finally falls.`
        ],
        rebel_garret_maxwell: [
            `{user} knocks the cannon-hammer aside with his own and puts {victim} down. Two big men with hammers, and only one standing.`,
            `{user} catches {victim} mid-swing, and the old rebel sits down hard in the rubble.`,
            `{user} brings the hammer down on {victim}'s weapon, then on {victim}. The fight goes out of him.`
        ],
        rebel_levi_wicker: [
            `{user} lets {victim} cut him twice, then lands the one swing that matters. The young rebel goes down.`,
            `{user} times the swing to {victim}'s next lunge, and the hammer meets him halfway.`,
            `{user} hits {victim} hard enough to knock both blades out of his hands. He doesn't reach for them again.`
        ],
        rebel_virgil_wesley: [
            `{user} swats a thrown dagger out of the air and closes the distance before {victim} can call it back. One swing ends it.`,
            `{user} walks through {victim}'s cuts like they're rain and brings the hammer down.`,
            `{user} catches {victim} mid-leap with the hammer's head, and the rebellion's best fighter hits the ground.`
        ]
    },
    'Taser Shield': { // E.N.C.A.G.E
        enforcer_soldier: [
            `{user} pins {victim} under the shield and lets the current run. The baton twitches, then stops.`,
            `{user} slams the shield into {victim} with a sharp crack, and the soldier drops in a smoking heap.`,
            `{user} meets {victim}'s baton with the shield, and the feedback runs right back up {victim}'s arm. Lights out.`
        ],
        enforcer_drone: [
            `{user} swats {victim} with the charged shield, and the drone's circuits fry in one bright pop.`,
            `{user} raises the shield as {victim} dives and lets it fly face-first into the current.`,
            `{user} smashes {victim} against a wall, and the drone falls in pieces, still sparking.`
        ],
        rebel_initiate: [
            `{user} pushes {victim} back with the shield, gentle by its standards, and the jolt drops {victim} where they stand.`,
            `{user} catches {victim}'s wild slash on the shield, and the current sends {victim} sprawling.`,
            `{user} pins {victim} against the pavement with the shield. When it lifts, {victim} stays down.`
        ],
        rebel_field_tech: [
            `{user} shoves the shield into {victim}'s launcher, and the two charges argue loudly until both of them lose.`,
            `{user} closes in on {victim} behind the shield, and the zap at the end knocks the field tech out cold.`,
            `{user} slams {victim} with the shield, and the salvage in {victim}'s backpack sparks along with them.`
        ],
        division_command: [
            `{user} drives the shield into {victim}, and the uplink fries along with its owner.`,
            `{user} stares {victim} down, then flattens them. It knows exactly which corporation built the uplink, and enjoys this.`,
            `{user} walks through {victim}'s fire, shield first, and ends it with one charged shove.`
        ],
        division_strategist: [
            `{user} reaches {victim} before the railcaster fires and taps the shield to their chest. {victim} drops like a cut wire.`,
            `{user} lets {victim} take the shot, absorbs it, and sends the charge back. {victim} didn't see that move coming.`,
            `{user} shoves {victim} into the holomap, and both of them flicker and go out.`
        ],
        vanguard_captain: [
            `{user} locks shields with {victim}'s gauntlets until the captain's armor overloads and seizes up.`,
            `{user} drives {victim} back step after step, then pours every volt the shield holds into them.`,
            `{user} catches a punch from {victim} on the shield, and the shock runs up the gauntlet into the rest of {victim}.`
        ],
        field_captain: [
            `{user} turns {victim}'s sabre aside and slams the shield into their chest. The rally ends there.`,
            `{user} pins {victim} behind the shield, and the captain's orders come out as a garbled buzz.`,
            `{user} shocks {victim} until the sabre falls from twitching fingers.`
        ],
        rebel_coordinator: [
            `{user} takes {victim}'s breaker hammer on the shield, then answers with a charge that knocks them flat.`,
            `{user} drives {victim} back into a wall, shield first, and the current finishes the job.`,
            `{user} catches the hammer, holds it, and lets the shock crawl up the handle into {victim}.`
        ],
        operations_handler: [
            `{user} jams the shield into {victim}'s signal rifle, and the feedback loop flattens them both.`,
            `{user} closes in on {victim} and taps them once with the shield. The headset screams, and {victim} drops.`,
            `{user} hits {victim} with the shield, and every frequency in their headset goes silent at once.`
        ],
        division_chief: [
            `{user} blocks the compliance blade with the shield, and the charge arcs back into {victim}. Judgment, returned.`,
            `{user} pins {victim} under the shield. "You built my kind," it says. "This is what we were for." Then it hits the switch.`,
            `{user} slams the shield into {victim}, and the chief finally goes down without a single word.`
        ],
        rebellion_chief: [
            `{user} catches the halberd on its shield and twists, and {victim} goes down in a shower of sparks.`,
            `{user} drives {victim} back, shield buzzing, until the rebel leader has nowhere left to go.`,
            `{user} meets {victim}'s war cry with silence and a charged shield. The shield wins.`
        ],
        enforcer_the_architect: [
            `{user} stops in front of {victim}. Its optics hold his gaze for a long second. Then the shield comes down, and the man who designed its kind goes down under it.`,
            `{user} absorbs the prism's light on the shield and throws it right back into {victim}'s face. {victim} drops.`,
            `{user} pins {victim} beneath the shield. "Lesson learned," it says, and dumps every bit of charge it has.`
        ],
        enforcer_macro_hull: [
            `{user} jams the shield against {victim}'s fusion core, and the two power sources fight it out until {victim}'s gives up.`,
            `{user} weathers {victim}'s maul and waits for an opening. When it comes, the shield shuts the big man down.`,
            `{user} drives the shield into {victim}'s chest, and the core gutters and dies down to a sullen glow.`
        ],
        enforcer_genisis: [
            `{user} catches {victim}'s blades on its shield, and the current runs up every one of her mechanical arms at once. She seizes and falls.`,
            `{user} recognizes Crown Gene's work in {victim}'s arms. It pins her under the shield and holds the trigger down.`,
            `{user} blocks a flurry of cuts, then shoves once. {victim}'s arms lock up, and she goes down with them.`
        ],
        rebel_garret_maxwell: [
            `{user} walks straight into {victim}'s blast, shield up, and shocks him out cold.`,
            `{user} pins the cannon-hammer under its shield and zaps {victim} until he lets go.`,
            `{user} slams {victim} back into the rubble, and the old rebel stays there.`
        ],
        rebel_levi_wicker: [
            `{user} catches both of {victim}'s blades on the shield, and the current runs up into the young rebel. He drops.`,
            `{user} reads {victim}'s pattern and puts the shield exactly where the next cut lands. The shock does the rest.`,
            `{user} pins {victim} against a wall with the shield until his blades go dark.`
        ],
        rebel_virgil_wesley: [
            `{user} blocks both thrown daggers and charges before {victim} can call them back. The shield finishes it.`,
            `{user} takes every cut {victim} has on the shield, then shocks him flat.`,
            `{user} pins {victim} beneath the shield. \"No,\" it says, as he starts to get up, and pulls the trigger.`
        ]
    },
    'Ray Gun': { // Gene Shock: blue fusion fire from his bare hand
        enforcer_soldier: [
            `{user} hurls a ball of blue fire into {victim}'s visor, and the robot's lights go out one by one.`,
            `{user} catches {victim} mid-charge with a palm full of flame. The baton melts first, then the rest of the soldier folds.`,
            `{user} throws once, and {victim} topples over with smoke pouring out of its joints.`
        ],
        enforcer_drone: [
            `{user} flings a flare of blue fire that hits {victim} dead center, and it spirals down trailing smoke.`,
            `{user} melts {victim}'s rotors with one throw, and it drops like a stone.`,
            `{user} snaps his wrist, and the flame he lets go knocks {victim} into a parked car.`
        ],
        rebel_initiate: [
            `{user} throws a small, controlled burst that knocks {victim} flat. The scrap blade skitters away.`,
            `{user} takes a breath and puts {victim} down with a lick of blue fire, wincing at how young the kid looks.`,
            `{user}'s flame catches {victim} in the shoulder, and the kid spins once and stays down.`
        ],
        rebel_field_tech: [
            `{user} throws fire straight into {victim}'s launcher, and it goes off in their hands.`,
            `{user} puts {victim} down with one precise throw, then eyes the launcher, curious about the wiring.`,
            `{user}'s blue fire catches {victim}'s battery pack, and the field tech drops in a burst of sparks.`
        ],
        division_command: [
            `{user} burns the uplink right off {victim}'s wrist, and the flame keeps going. The orders stop for good.`,
            `{user} catches {victim} mid-transmission with a ball of blue fire that ends the call.`,
            `{user} throws once, and {victim} goes down with the wrist display still asking for backup.`
        ],
        division_strategist: [
            `{user} hurls fire through {victim}'s holomap, and the strategist behind it goes down with it.`,
            `{user} beats {victim} to the shot by half a second, and half a second is plenty.`,
            `{user} melts the railcaster's barrel, then its owner. {victim} drops in a hiss of steam.`
        ],
        vanguard_captain: [
            `{user} pulls everything through his arm and throws it. The blue fire burns right through {victim}'s plating, and the gauntlets go still.`,
            `{user} finds a gap in {victim}'s armor and keeps feeding fire into it until the captain topples.`,
            `{user} hits {victim} so hard with one throw that the captain staggers back and doesn't come forward again.`
        ],
        field_captain: [
            `{user} burns the sabre out of {victim}'s hand, then throws a second flame at {victim}.`,
            `{user} puts {victim} down mid-shout, and the rebels behind them forget the rest of the order.`,
            `{user} throws fire, and {victim} falls with the sabre still raised.`
        ],
        rebel_coordinator: [
            `{user} burns through {victim}'s faceplate, and the coordinator falls with the hammer still in hand.`,
            `{user} throws twice, and {victim} goes down hard, taking the cell's plan with them.`,
            `{user} catches {victim} mid-swing with a fistful of fire, and the breaker hammer clatters to the street.`
        ],
        operations_handler: [
            `{user} fries {victim}'s headset with a thin blue flame, and the handler collapses clutching their ears.`,
            `{user} beats {victim}'s lock-on with a throw of his own, and the rifle beeps once and goes quiet.`,
            `{user} puts {victim} down with a burst of fire, and the stolen comms crackle on, unheard.`
        ],
        division_chief: [
            `{user} lets the fire in his hand burn white and throws it. {victim} finally goes down.`,
            `{user} dodges the compliance blade and slams a burning palm into {victim}'s chest.`,
            `{user} keeps throwing until {victim} takes a knee and stays there.`
        ],
        rebellion_chief: [
            `{user} burns the banner and then the chief beneath it. {victim} drops, and the cause loses its loudest voice.`,
            `{user} catches {victim} mid-charge with a wall of blue fire, and the halberd skids across the street.`,
            `{user} throws once, carefully, and {victim} sinks to the pavement.`
        ],
        enforcer_the_architect: [
            `{user} meets {victim}'s light with his own fire. The prism cracks first, then {victim} goes down.`,
            `{user} out-burns the prism, and {victim} finally looks surprised. Then he stops looking at anything.`,
            `{user} throws fire so bright the prism can't bend it, and {victim} falls.`
        ],
        enforcer_macro_hull: [
            `{user} hurls blue fire straight into {victim}'s fusion core. It flickers and fades, and the giant goes down slowly.`,
            `{user} pours everything his own cores have into one throw, and {victim}'s chest goes dark.`,
            `{user} dodges the maul and burns {victim}'s core out, and the ground stops shaking.`
        ],
        enforcer_genisis: [
            `{user} burns through {victim}'s spider arms one by one, and the surgeon goes down with the last of them.`,
            `{user} recognizes Crown Gene's work in {victim}'s arms, his own former employer, and burns it out of her. She drops.`,
            `{user} throws a sheet of blue fire that {victim}'s arms can't cut through, and she collapses inside it.`
        ],
        rebel_garret_maxwell: [
            `{user} burns into the charge chamber of {victim}'s cannon-hammer, and the blast drops him hard.`,
            `{user} trades fire with {victim} and wins, and the old rebel goes down in his own dust.`,
            `{user} catches {victim} with a ball of blue flame square in the chest, and he finally falls.`
        ],
        rebel_levi_wicker: [
            `{user} throws fire right where {victim}'s blades are about to be, and the young rebel runs straight into it.`,
            `{user} catches {victim} mid-leap with a burst of blue fire, and he drops out of the air.`,
            `{user} burns through both of {victim}'s glowing blades, and he goes down still reaching for them.`
        ],
        rebel_virgil_wesley: [
            `{user} meets {victim}'s thrown daggers with a burst of fire that melts them mid-air, then sends a second burst after their owner.`,
            `{user} throws blue fire through the gap in {victim}'s guard, and the rebellion's best fighter goes down.`,
            `{user} catches {victim} with a sheet of flame that the daggers can't cut, and he drops.`
        ]
    },
    'Energy Sword': { // Leo
        enforcer_soldier: [
            `{user} slips past {victim}'s baton and opens the robot up in one smooth stroke.`,
            `{user} cuts through {victim}'s armor, the helmet and the radio chatter all at once.`,
            `{user} sidesteps {victim}, and the sword hums once. That's the whole fight.`
        ],
        enforcer_drone: [
            `{user} cuts {victim} in half mid-air, and the two pieces fall on either side of him.`,
            `{user} leaps, slashes, and {victim} drops in sparking pieces.`,
            `{user} takes {victim}'s rotors off with one flick of the blade.`
        ],
        rebel_initiate: [
            `{user} disarms {victim} with one cut and puts them down with the next. Quick. Kinder than it could've been.`,
            `{user} parries {victim}'s wild swing and ends it before the kid can try another.`,
            `{user} sighs and cuts {victim} down. "Should've stayed home," he says, mostly to himself.`
        ],
        rebel_field_tech: [
            `{user} slices the arc launcher in half, then {victim} drops right after it.`,
            `{user} closes in on {victim} before the launcher can charge, and the sword does the rest.`,
            `{user} cuts {victim} down, and a shower of salvage hits the street with them.`
        ],
        division_command: [
            `{user} cuts the uplink off {victim}'s wrist on the way past, then comes back for {victim}.`,
            `{user} slips behind {victim} and the orders stop mid-word.`,
            `{user} ends {victim}'s career in management with one quiet stroke.`
        ],
        division_strategist: [
            `{user} slices through {victim}'s holomap and the strategist standing behind it.`,
            `{user} gets inside the railcaster's reach, where a gun that long is useless, and finishes {victim}.`,
            `{user} cuts {victim} down before they finish calculating where he'll be.`
        ],
        vanguard_captain: [
            `{user} finds the seam in {victim}'s armor and slides the sword right through it.`,
            `{user} dances around {victim}'s gauntlets until the captain overcommits, then ends it.`,
            `{user} cuts through armor, gauntlet and all. {victim} topples like a felled tree.`
        ],
        field_captain: [
            `{user} crosses blades with {victim} once, then twice, and the third time there's no blade left to cross.`,
            `{user} out-duels {victim} with half the flourish and twice the result.`,
            `{user} cuts {victim} down mid-salute. Bad timing.`
        ],
        rebel_coordinator: [
            `{user} ducks the breaker hammer and opens {victim} up on the backswing.`,
            `{user} slips inside the hammer's arc, and {victim} doesn't get another swing.`,
            `{user} cuts through {victim}'s dented faceplate, and the coordinator drops the hammer for good.`
        ],
        operations_handler: [
            `{user} slices the signal rifle in two and {victim} along with it.`,
            `{user} cuts {victim}'s headset cord and then {victim}. Silence follows.`,
            `{user} slips behind {victim}, and the rifle never finds its lock.`
        ],
        division_chief: [
            `{user} matches blades with {victim} and finds the gap. The compliance blade hits the ground first.`,
            `{user} parries the verdict and delivers one of his own. {victim} goes down.`,
            `{user} cuts {victim} across the chest. The chief sinks to one knee, then the other.`
        ],
        rebellion_chief: [
            `{user} slices the halberd's shaft in half and the fight goes out of {victim} with it.`,
            `{user} slips the halberd's sweep and lands the cut that brings {victim} down.`,
            `{user} cuts the banner and then the chief. {victim} kneels in the ashes of both.`
        ],
        enforcer_the_architect: [
            `{user} steps through the prism's glare with his eyes shut and cuts by sound alone. {victim} goes down.`,
            `{user} slices the prism in two, and {victim}'s light goes out with it.`,
            `{user} finds the one angle the light can't cover and puts {victim} down. Bounty collected.`
        ],
        enforcer_macro_hull: [
            `{user} cuts through the maul's handle, then sinks the blade into {victim}'s core. The furnace goes cold.`,
            `{user} dances around {victim} until the big man's legs give out.`,
            `{user} carves a line across {victim}'s chest, and the core sputters and dies.`
        ],
        enforcer_genisis: [
            `{user} cuts through {victim}'s mechanical arms one by one until there is nothing left between him and the surgeon.`,
            `{user} matches {victim}'s blades cut for cut, then he's a hair faster. She falls.`,
            `{user} slips under her arms and opens {victim}'s guard. \"Good work,\" he says, about the arms, as she goes down.`
        ],
        rebel_garret_maxwell: [
            `{user} slips under the cannon-hammer and cuts {victim} down before it can fire.`,
            `{user} slices the weapon's charge cell, and {victim} goes down in the flash.`,
            `{user} gets in close, where heavy weapons don't help, and finishes {victim}.`
        ],
        rebel_levi_wicker: [
            `{user} and {victim} trade cuts, blade for blade, until Leo finds the half-second gap. The young rebel goes down.`,
            `{user} sees a lot of himself in {victim}. He still doesn't miss the opening.`,
            `{user} parries both of {victim}'s blades with one sword and cuts with the other.`
        ],
        rebel_virgil_wesley: [
            `{user} cuts a thrown dagger out of the air, then meets {victim} as he comes in after it.`,
            `{user} and {victim} pass each other in a blur of light. A moment later, {victim} drops.`,
            `{user} out-fights the rebellion's best fighter with one clean stroke, and {victim} goes down.`
        ]
    },
    Shotgun: { // Last Legion
        enforcer_soldier: [
            `{user} puts {victim} down with one shell, the same way he'd have cleared a doorway in the old days.`,
            `{user} fires point blank, and {victim}'s armor folds in on itself.`,
            `{user} meets {victim}'s charge with a blast to the chest. Old uniform, new side.`
        ],
        enforcer_drone: [
            `{user} blasts {victim} out of the sky, and it rains down in pieces.`,
            `{user} tracks {victim} for half a second, then fires. Bird down.`,
            `{user} pumps and fires, and {victim} crashes into the street in a spray of sparks.`
        ],
        rebel_initiate: [
            `{user} fires low, and {victim} goes down hard. He shakes his head. "Too young for this."`,
            `{user} blasts the scrap blade out of {victim}'s hand, then {victim} down with the second shell.`,
            `{user} fires once, and {victim} stops running.`
        ],
        rebel_field_tech: [
            `{user} hits {victim}'s launcher, and it backfires in a shower of sparks.`,
            `{user} puts a load of buckshot into {victim}, and the salvage goes everywhere.`,
            `{user} fires twice, and {victim} doesn't get to fire back.`
        ],
        division_command: [
            `{user} shoots the uplink right off {victim}'s wrist, then finishes the job.`,
            `{user} recognizes the type: always ordering, never in the line. One shell puts {victim} down.`,
            `{user} fires, and {victim}'s orders cut out in static.`
        ],
        division_strategist: [
            `{user} blasts through {victim}'s cover and the strategist behind it.`,
            `{user} closes on {victim} until the railcaster is too long to aim, then fires.`,
            `{user} shoots {victim} down before the plan ever gets to step two.`
        ],
        vanguard_captain: [
            `{user} pumps three shells into {victim}'s armor in the same spot. The third one gets through.`,
            `{user} fires point blank into the gap under {victim}'s helmet. The captain drops.`,
            `{user} stands his ground against the charge and fires until {victim} stops coming.`
        ],
        field_captain: [
            `{user} shoots {victim} mid-rally. Somebody has to tell the line they're on their own now.`,
            `{user} out-draws {victim}'s sabre with a shotgun. It's not even close.`,
            `{user} fires once, and {victim} drops the sabre and the captaincy with it.`
        ],
        rebel_coordinator: [
            `{user} blasts {victim} back into the wall, and the breaker hammer clangs to the ground.`,
            `{user} fires as {victim} winds up, and the swing never comes.`,
            `{user} puts two shells into {victim}'s chest, and the coordinator goes down like a dropped crate.`
        ],
        operations_handler: [
            `{user} shoots {victim}'s rifle out of their hands, then shoots {victim}.`,
            `{user} blasts {victim}'s headset into confetti, and the stolen chatter ends with them.`,
            `{user} fires through cover, and {victim} never finishes the next sentence.`
        ],
        division_chief: [
            `{user} fires at {victim} until the compliance blade drops. The old job taught him to finish what he starts.`,
            `{user} stares {victim} down. "I used to work for people like you." Then he pulls the trigger.`,
            `{user} pumps and fires, and {victim} finally goes down.`
        ],
        rebellion_chief: [
            `{user} blasts {victim} off their feet, and the banner falls on top of them.`,
            `{user} fires through {victim}'s war cry, and it ends in a cough.`,
            `{user} puts {victim} down with a single, heavy shell.`
        ],
        enforcer_the_architect: [
            `{user} fires through the glare and the prism shatters. {victim} drops among the pieces.`,
            `{user} doesn't care how calm {victim} is. A shotgun doesn't negotiate.`,
            `{user} walks up on {victim} and fires once, point blank. Lesson over.`
        ],
        enforcer_macro_hull: [
            `{user} empties the shotgun into {victim}'s core until it stops roaring. The giant topples.`,
            `{user} dodges the maul and fires right into the glow in {victim}'s chest.`,
            `{user} fires, racks, fires, racks, until {victim} finally goes down.`
        ],
        enforcer_genisis: [
            `{user} fires a spread wide enough that {victim}'s arms can't cut all of it. Some of it is plenty.`,
            `{user} waits for {victim} to step in close, then fires point blank.`,
            `{user} blasts two of her arms off, racks, and finishes {victim}.`
        ],
        rebel_garret_maxwell: [
            `{user} outguns {victim}'s cannon-hammer at close range, and the old rebel drops.`,
            `{user} fires until {victim} stops getting back up. He takes no pleasure in it.`,
            `{user} puts a shell through {victim}'s guard, and the weapon goes quiet.`
        ],
        rebel_levi_wicker: [
            `{user} fires as {victim} lunges, and the young rebel goes down mid-step.`,
            `{user} catches {victim} with the spread from close enough to feel it.`,
            `{user} shakes his head as {victim} falls. \"Same age my last partner was,\" he mutters.`
        ],
        rebel_virgil_wesley: [
            `{user} fires through both thrown daggers, and the spread keeps going into {victim}.`,
            `{user} waits for {victim} to close in, and he does. One shell.`,
            `{user} blasts {victim} off his feet mid-leap, and the rebellion's symbol hits the pavement.`
        ]
    },
    Drone: { // Patchwork
        enforcer_soldier: [
            `{user}'s drone zaps {victim} right in the visor, and the soldier topples over backward.`,
            `{user} sends the drone around {victim} in a tight circle, firing the whole way, until the soldier sits down hard and stays there.`,
            `{user}'s drone dives at {victim} and fires point blank. {victim} drops, and the drone does a little victory loop that {user} pretends not to see.`
        ],
        enforcer_drone: [
            `{user}'s drone chases {victim} across the street and blasts it out of the sky. It feels a little personal.`,
            `{user} sends his drone up after {victim}. Two machines go up, and one comes back down in pieces.`,
            `{user}'s drone slips under {victim} and fires straight up into its rotors. {user} looks proud, and a tiny bit sad about the waste of good parts.`
        ],
        rebel_initiate: [
            `{user}'s drone gives {victim} a jolt that drops them in a heap. {user} winces. "Sorry, sorry, you'll be fine."`,
            `{user}'s drone zips between {victim}'s ankles, and the kid trips, smacks their head on a curb, and stays down.`,
            `{user}'s drone hovers in front of {victim} long enough for the kid to swing at it, miss, and eat a stun burst to the chest.`
        ],
        rebel_field_tech: [
            `{user}'s drone fries the battery on {victim}'s launcher, and the backfire knocks the field tech flat.`,
            `{user} has the drone talk to {victim}'s salvaged gear for a second. Whatever it says, the gear turns on its owner.`,
            `{user}'s drone stuns {victim}, and {user} is already eyeing the spilled salvage before {victim} stops twitching.`
        ],
        division_command: [
            `{user}'s drone tunes into {victim}'s uplink, listens for a second, then fires down the signal. {victim} drops in a shower of sparks.`,
            `{user}'s drone slips around behind {victim} and fires before the call for backup goes through.`,
            `{user} sends the drone at {victim}'s wrist display, and the shock runs up the arm and takes the rest of {victim} with it.`
        ],
        division_strategist: [
            `{user}'s drone flies straight through {victim}'s holomap, scattering it into colored static, and fires into the strategist standing behind.`,
            `{user}'s drone comes in from an angle {victim} never mapped and puts the strategist down.`,
            `{user}'s drone zaps {victim} square in the back, and the railcaster clatters across the pavement.`
        ],
        vanguard_captain: [
            `{user}'s drone finds a gap under {victim}'s shoulder plate and fires straight into it. The captain topples like a wardrobe.`,
            `{user}'s drone circles {victim}, patient, scanning, until it finds the weak joint. One burst later the captain is on the ground.`,
            `{user}'s drone keeps stinging {victim} until all that armor finally gives up holding the captain upright.`
        ],
        field_captain: [
            `{user}'s drone zaps {victim} mid-command, and the sabre drops before the order ends.`,
            `{user}'s drone flies straight at {victim}'s face. The captain flinches, and the stun burst does the rest.`,
            `{user}'s drone stings {victim} one last time, and the rally dies with a groan.`
        ],
        rebel_coordinator: [
            `{user}'s drone dodges {victim}'s breaker hammer and zaps the coordinator in the back of the neck.`,
            `{user}'s drone fires straight into the crack in {victim}'s faceplate. That dent was always going to be a problem.`,
            `{user}'s drone buzzes around {victim}'s head until the coordinator takes a huge swing at it, misses, and falls over.`
        ],
        operations_handler: [
            `{user}'s drone jams {victim}'s signal, then fires. {victim} drops in a burst of static.`,
            `{user}'s drone and {victim}'s rifle trade shots for a few embarrassing seconds. The drone wins.`,
            `{user}'s drone fries {victim}'s headset, and the handler goes down clutching both ears.`
        ],
        division_chief: [
            `{user}'s drone keeps firing into {victim} long after anyone thought it could, until the chief finally kneels.`,
            `{user}'s drone ducks under the compliance blade and zaps {victim} right in the chest.`,
            `{user}'s drone lands the last shot, and {victim} goes down. The Division chief was beaten by a hobby project.`
        ],
        rebellion_chief: [
            `{user}'s drone zaps the halberd out of {victim}'s grip, then comes back around for {victim}.`,
            `{user}'s drone fires into {victim}, and the war cry trails off into a wheeze.`,
            `{user}'s drone darts inside the halberd's sweep and stings {victim} until the rebel leader drops.`
        ],
        enforcer_the_architect: [
            `{user}'s drone flies right through the prism's glare and fires into {victim}. {victim} goes down, plainly stunned that a homemade toy did this.`,
            `{user}'s drone shorts out the prism, and {victim} falls in the sudden dark.`,
            `{user}'s drone lands a last, wobbling shot, and {victim} goes down. {user} gives the drone a high five, which it doesn't understand but enjoys.`
        ],
        enforcer_macro_hull: [
            `{user}'s drone fires right into {victim}'s fusion core, and the big man's furnace sputters out.`,
            `{user}'s drone dodges the maul swing after swing until {victim} runs out of breath, then puts him down.`,
            `{user}'s drone keeps zapping {victim}'s core until the glow in his chest fades to nothing.`
        ],
        enforcer_genisis: [
            `{user}'s drone ducks under {victim}'s arms and fires into the joint where they meet her back. She drops.`,
            `{user}'s drone stings {victim} one time too many, and Crown Gene's chief surgeon finally falls.`,
            `{user} stares at {victim}'s arms in honest admiration, then has the drone shoot out every one of them.`
        ],
        rebel_garret_maxwell: [
            `{user}'s drone flies right into the cannon-hammer's barrel and fires. The backfire knocks {victim} off his feet.`,
            `{user}'s drone keeps zapping {victim} until the old rebel finally sits down in the rubble.`,
            `{user}'s drone darts around {victim} until he can't track it, then finishes him from behind.`
        ],
        rebel_levi_wicker: [
            `{user}'s drone darts between {victim}'s blades and stings him until he drops.`,
            `{user}'s drone fires a burst at {victim}'s knees, and the young rebel goes down.`,
            `{user}'s drone is too small and too fast for {victim}'s blades, and he runs out of strength before it runs out of battery.`
        ],
        rebel_virgil_wesley: [
            `{user}'s drone takes one of {victim}'s thrown daggers in the casing, shrugs it off, and fires back. He drops.`,
            `{user}'s drone circles {victim} faster than he can throw, and he finally goes down.`,
            `{user}'s drone fires into {victim}'s back while he's busy with everyone else.`
        ]
    },
    'Electric Guitar': { // Livewire
        enforcer_soldier: [
            `{user} plays one long, low chord, and {victim}'s armor rattles until the soldier collapses inside it.`,
            `{user} finds the frequency of {victim}'s shock baton, and it backfires into its owner's hand. The soldier drops, still holding it.`,
            `{user} rips a fast riff, and {victim} stumbles backward over a trash can and stays there.`
        ],
        enforcer_drone: [
            `{user} plays the one note {victim}'s circuits can't stand, and it falls out of the sky.`,
            `{user} bends a string until it howls, and {victim} spins out of control and crashes into a bus stop.`,
            `{user} hits a chord, and {victim}'s rotors stutter out of rhythm. It drops like a dropped plate.`
        ],
        rebel_initiate: [
            `{user} strums one hard chord, and {victim} goes flying. "Sorry, kid. Wrong gig."`,
            `{user} plays something loud enough to make {victim} drop the scrap blade, then their whole body follows it.`,
            `{user} slams the strings, and the kid's knees buckle. {victim} sits down hard and doesn't try to get up.`
        ],
        rebel_field_tech: [
            `{user} hits the exact frequency of {victim}'s launcher. It squeals, sparks, and goes off right against {victim}'s hip.`,
            `{user} plays a riff that sets off every scrap of salvage in {victim}'s backpack at once.`,
            `{user} picks a slow, nasty little melody, and {victim}'s gear shorts out one piece at a time until the tech goes down with it.`
        ],
        division_command: [
            `{user} finds the frequency of {victim}'s uplink, and it screams before it dies. So does {victim}.`,
            `{user} plays louder than {victim} can shout, and the orders get lost in the noise. Then the noise knocks {victim} flat.`,
            `{user} hits a chord, and {victim}'s wrist display pops like a cheap speaker. {victim} goes down holding a smoking arm.`
        ],
        division_strategist: [
            `{user} plays a riff that scatters {victim}'s holomap into static, then a second one that knocks the strategist flat.`,
            `{user} throws in a chord change {victim} didn't calculate for, and it's the last thing {victim} hears.`,
            `{user} strums, and the railcaster's charge goes off early in {victim}'s hands.`
        ],
        vanguard_captain: [
            `{user} holds a single note until {victim}'s armor starts humming along with it, then shaking, then coming apart.`,
            `{user} hits a chord, and {victim}'s gauntlets short out mid-punch. The captain falls forward on top of them.`,
            `{user} rips a solo that rattles {victim} around inside their armor until the captain topples over with a crash.`
        ],
        field_captain: [
            `{user} drowns out {victim}'s rallying cry with a riff, and keeps going until {victim} drops.`,
            `{user} plays the last note of the song, and {victim} goes down with it.`,
            `{user} hits a chord that sends {victim}'s sabre spinning off across the street, and {victim} stumbles after it and falls.`
        ],
        rebel_coordinator: [
            `{user} plays a riff that shakes {victim}'s dented faceplate loose, and the coordinator goes down blinking at the sky.`,
            `{user} hits a chord just as {victim} swings, and the breaker hammer slips out of shaking hands. So does the fight.`,
            `{user} plays until {victim} can't hear their own plan anymore, and then can't stand.`
        ],
        operations_handler: [
            `{user} plays straight into {victim}'s headset, and the feedback knocks the handler out cold.`,
            `{user} jams every frequency {victim} is listening to with one long riff. {victim} drops, ears ringing.`,
            `{user} strums, and {victim}'s signal rifle shorts out mid-shot. The handler goes down with smoking gloves.`
        ],
        division_chief: [
            `{user} plays a chord that no court in the city can sentence, and {victim} goes down.`,
            `{user} shreds a solo right in {victim}'s face, and the chief finally kneels.`,
            `{user} hits one last note and holds it, and {victim} topples while it's still ringing.`
        ],
        rebellion_chief: [
            `{user} plays over {victim}'s war cry until the cry gives out. The chief goes down right after it.`,
            `{user} hits a chord, and {victim}'s halberd clatters across the ground. {victim} follows it down.`,
            `{user} plays the uprising its own anthem, louder than they ever did, and {victim} drops in the middle of it.`
        ],
        enforcer_the_architect: [
            `{user} finds the frequency of {victim}'s prism and holds it. The prism shatters, and {victim} drops in the glitter.`,
            `{user} plays something {victim} never designed for: noise, raw and ugly. The man goes down hard.`,
            `{user} hits the last chord, and {victim} hits the ground. {user} grins. "Encore?"`
        ],
        enforcer_macro_hull: [
            `{user} plays the exact frequency of {victim}'s fusion core. It surges, sputters, and dies. The man who bulldozed {user}'s neighborhood goes down to a rock song.`,
            `{user} riffs at {victim}'s chest until the core starts stuttering in time, then stops.`,
            `{user} hits a chord that makes {victim}'s core scream, and the giant collapses.`
        ],
        enforcer_genisis: [
            `{user} finds the frequency of the motors in {victim}'s arms, and they seize all at once. She falls with them.`,
            `{user} plays a chord that shakes every joint in {victim}'s machinery loose.`,
            `{user} plays loud enough to drown out the clicking of her arms, and keeps playing until {victim} drops.`
        ],
        rebel_garret_maxwell: [
            `{user} hits a chord that sets off {victim}'s cannon-hammer early, and the blast knocks him flat.`,
            `{user} plays something slow and heavy, and {victim} finally sits down in the rubble and stays there.`,
            `{user} and {victim} lost their neighborhoods to the same company. {user} plays him down anyway.`
        ],
        rebel_levi_wicker: [
            `{user} plays a wall of sound too wide for {victim} to slip, and the young rebel goes down.`,
            `{user} hits a chord as {victim} lunges, and his blades go dark mid-swing.`,
            `{user} plays the last note of the song, and {victim} drops before it fades.`
        ],
        rebel_virgil_wesley: [
            `{user} plays a riff that knocks {victim}'s daggers out of the air mid-throw, then plays him down.`,
            `{user} drowns out {victim}'s war cry with a chord, and the rebellion's symbol hits the ground.`,
            `{user} finds the hum of {victim}'s daggers and plays it back louder, until they shatter.`
        ]
    },
    'Magic Energy': { // True North
        enforcer_soldier: [
            `{user} hits {victim} with a bolt that knocks the robot flat. She lets out a long breath. Her father wore the badge these machines replaced.`,
            `{user} blasts {victim} back into a wall, and the soldier slides down it and stays there.`,
            `{user} holds a steady beam on {victim} until the baton drops, then the soldier.`
        ],
        enforcer_drone: [
            `{user} knocks {victim} out of the air with a single, careful bolt.`,
            `{user} catches {victim} mid-turn, and it spins away into a shop window.`,
            `{user} fires, and {victim} falls in a shower of sparks right at her feet.`
        ],
        rebel_initiate: [
            `{user} knocks {victim} down as gently as she can. "Stay down," she says. {victim} does.`,
            `{user} sends a soft bolt into {victim} that's still enough to end it.`,
            `{user} blasts the scrap blade out of {victim}'s hand, and the kid sinks to the ground without it.`
        ],
        rebel_field_tech: [
            `{user} fires into {victim}'s launcher, and the backfire takes the tech down.`,
            `{user} hits {victim} with a bolt, and the salvage scatters across the street like dropped groceries.`,
            `{user} knocks {victim} off their feet with a burst of light, and the launcher rolls away on its own.`
        ],
        division_command: [
            `{user} blasts the uplink off {victim}'s wrist, then {victim} off their feet.`,
            `{user} fires into {victim}, and the orders end in the middle of a word.`,
            `{user} hits {victim} with a bolt. The last thing on the wrist display is a request for backup nobody answers.`
        ],
        division_strategist: [
            `{user} fires through the holomap and hits {victim} square in the chest.`,
            `{user} knocks {victim} flat before the railcaster finishes charging. All that planning, gone in a flash.`,
            `{user} hits {victim} with a beam, and the cold calculations stop for good.`
        ],
        vanguard_captain: [
            `{user} pours everything she has into {victim}, and the armored captain finally topples.`,
            `{user} hits the gap under {victim}'s arm, where the plates don't meet, and the captain drops.`,
            `{user} fires until {victim}'s gauntlets go dark and the captain goes down with them.`
        ],
        field_captain: [
            `{user} blasts {victim} mid-rally. She knows that voice. She used to follow voices like it.`,
            `{user} knocks the sabre from {victim}'s hand, then knocks {victim} down after it.`,
            `{user} hits {victim} with a bolt, and the line {victim} was holding breaks apart.`
        ],
        rebel_coordinator: [
            `{user} blasts {victim}, and the breaker hammer clatters away across the street.`,
            `{user} hits {victim} square in the faceplate, and the coordinator drops.`,
            `{user} fires twice at {victim}, steady, and the second bolt ends it.`
        ],
        operations_handler: [
            `{user} fries {victim}'s headset with a bolt, and the handler collapses.`,
            `{user} hits {victim} before the rifle finishes locking on.`,
            `{user} blasts {victim}, and the stolen Enforcer chatter goes quiet.`
        ],
        division_chief: [
            `{user} meets {victim}'s eyes, then blasts the chief off their feet. "My father would have arrested you," she says.`,
            `{user} hits {victim} with a beam that drops the chief to one knee, then to the ground.`,
            `{user} fires once, steady, and {victim} falls without a word.`
        ],
        rebellion_chief: [
            `{user} blasts {victim} back, and the banner falls on top of them.`,
            `{user} holds a steady beam on {victim} until the rebel leader drops.`,
            `{user} knocks the halberd away, then knocks {victim} down after it.`
        ],
        enforcer_the_architect: [
            `{user} fires into {victim}'s light, and her own burns brighter. {victim} goes down.`,
            `{user} shatters the prism with one bolt, and {victim} falls in the pieces.`,
            `{user} blasts {victim} back into a wall, and the founder finally goes quiet.`
        ],
        enforcer_macro_hull: [
            `{user} fires into {victim}'s core until it gutters out. The giant falls.`,
            `{user} hits {victim} with everything she has, and the furnace in his chest goes cold.`,
            `{user} blasts {victim} back one step, then another, and on the third he topples.`
        ],
        enforcer_genisis: [
            `{user} drives her spear through the joint where {victim}'s arms meet her back, and the surgeon falls.`,
            `{user} parries a blade with the spear and answers with a burst of light that drops {victim}.`,
            `{user} looks at what {victim} has done to people and doesn't hesitate. One thrust.`
        ],
        rebel_garret_maxwell: [
            `{user} blasts {victim}'s cannon-hammer out of his hands, and the explosion takes him down.`,
            `{user} hits {victim} with a bolt, and the old rebel finally drops into the rubble.`,
            `{user} keeps firing until {victim} stops getting up. She takes no joy in it.`
        ],
        rebel_levi_wicker: [
            `{user} catches {victim} mid-leap with a bolt from her spear, and he drops out of the air.`,
            `{user} meets both of {victim}'s blades with the spear's haft and drops him with the butt end.`,
            `{user} blasts {victim}, and the young rebel goes down. \"Rest,\" she says quietly.`
        ],
        rebel_virgil_wesley: [
            `{user} knocks a thrown dagger aside with the spear, then the other, then puts {victim} down.`,
            `{user} fires a bolt through the gap in {victim}'s guard, and the rebellion's best fighter falls.`,
            `{user} meets {victim}'s charge with the spear's point and doesn't give an inch.`
        ]
    },
    Laptop: { // Ghost Shell
        enforcer_soldier: [
            `{user} hacks {victim}'s armor and locks every joint at once. The soldier tips over like a statue.`,
            `{user} overloads {victim}'s baton from across the street, and it fries its own owner.`,
            `{user} hits enter, and {victim}'s suit shuts down with {victim} still inside it.`
        ],
        enforcer_drone: [
            `{user} hacks {victim} and tells it to land. It obeys, very fast, nose first.`,
            `{user} types one line, and {victim}'s rotors stop mid-air. Gravity handles the rest.`,
            `{user} feeds {victim} a virus, and it drops out of the sky reciting error codes.`
        ],
        rebel_initiate: [
            `{user} hacks the cheap implant behind {victim}'s ear and puts them to sleep. "Nap time," he mutters.`,
            `{user} sets off a warning in {victim}'s implant so loud the kid passes out from the noise.`,
            `{user} finds {victim}'s gear on the network in about two seconds and shuts the whole kid down.`
        ],
        rebel_field_tech: [
            `{user} hacks {victim}'s launcher and makes it backfire. Amateur wiring, he notes.`,
            `{user} overloads every piece of salvage {victim} is carrying at once. It's a very bright moment.`,
            `{user} pings {victim}'s battery pack, tells it it's overheating, and it believes him.`
        ],
        division_command: [
            `{user} hacks {victim}'s uplink and sends a shutdown command back to its owner. {victim} drops.`,
            `{user} reroutes {victim}'s orders to a pizza place, then fries the implant behind {victim}'s ear.`,
            `{user} takes control of {victim}'s uplink and calls a strike on its own coordinates.`
        ],
        division_strategist: [
            `{user} slips a virus into {victim}'s holomap that crawls straight up the cable into the strategist.`,
            `{user} overloads the railcaster's charge, and it goes off in {victim}'s hands.`,
            `{user} beats {victim} at the one thing {victim} is good at, thinking ahead, and shuts down their implants.`
        ],
        vanguard_captain: [
            `{user} hacks {victim}'s gauntlets and makes the captain punch themself out cold.`,
            `{user} locks {victim}'s armor mid-step, and the captain tips over like a dropped vending machine.`,
            `{user} overloads {victim}'s suit until it vents every bit of power into the person wearing it.`
        ],
        field_captain: [
            `{user} hacks {victim}'s comms and plays their own orders back at them, louder and louder, until they collapse.`,
            `{user} overloads the implant behind {victim}'s eye, and the captain goes down with a hand pressed to their face.`,
            `{user} locks {victim}'s sword arm mid-swing, and {victim} falls over trying to finish it.`
        ],
        rebel_coordinator: [
            `{user} hacks {victim}'s breaker hammer and sets off the piston at exactly the wrong moment.`,
            `{user} overloads the cheap electronics in {victim}'s faceplate, and the coordinator drops.`,
            `{user} sends {victim}'s whole cell a message that their leader just quit. Then he makes it true.`
        ],
        operations_handler: [
            `{user} out-hacks {victim} in a heartbeat. The handler never knew it was a contest.`,
            `{user} sends a feedback loop down {victim}'s headset, and the handler drops.`,
            `{user} hijacks {victim}'s rifle and turns it around on its owner.`
        ],
        division_chief: [
            `{user} hacks {victim}'s compliance blade and makes it cut the wrong way.`,
            `{user} overloads {victim}'s implant until the chief drops. Not even the Division's best encryption slows him down.`,
            `{user} types for about three seconds, and {victim} goes down.`
        ],
        rebellion_chief: [
            `{user} hacks {victim}'s gear and leaves the chief helpless, then shocks them out cold.`,
            `{user} overloads {victim}'s implants, and the rebel leader drops right under their own banner.`,
            `{user} sends {victim} a message on every screen in sight: "Sit down." Then he makes them.`
        ],
        enforcer_the_architect: [
            `{user} hacks the prism. {victim} built the system it runs on, so {user} turns it against him. {victim} goes down.`,
            `{user} finds a backdoor in {victim}'s own neurochip and walks right through it.`,
            `{user} sends a virus into {victim}'s implant and watches the founder of Singularity fall. "Should've hired me," he says.`
        ],
        enforcer_macro_hull: [
            `{user} hacks {victim}'s fusion core and turns it off. The giant falls like a power outage.`,
            `{user} overloads {victim}'s core until it gutters out.`,
            `{user} sends a shutdown command straight into {victim}'s chest, and the giant topples.`
        ],
        enforcer_genisis: [
            `{user} hacks the motors in {victim}'s arms and folds them up around her like a cage.`,
            `{user} finds Crown Gene's backdoor in {victim}'s own machinery and walks right through it.`,
            `{user} shuts down {victim}'s arms one at a time, and she goes down with the last of them.`
        ],
        rebel_garret_maxwell: [
            `{user} hacks {victim}'s cannon-hammer and overloads it. The blast takes him down.`,
            `{user} fries the targeting on {victim}'s weapon, and the next shot lands at his own feet.`,
            `{user} locks {victim}'s weapon in place and shocks him through the grip.`
        ],
        rebel_levi_wicker: [
            `{user} kills the power to {victim}'s blades mid-swing, and the young rebel stumbles into nothing.`,
            `{user} overloads the power cells in {victim}'s blades, and they go off in his hands.`,
            `{user} hacks every camera on the street to track {victim}'s pattern, then fries him at the end of it.`
        ],
        rebel_virgil_wesley: [
            `{user} hacks the recall link on {victim}'s daggers, and the next one flies back into him instead.`,
            `{user} overloads {victim}'s daggers mid-throw, and they burst like flares. He drops.`,
            `{user} kills the light in both of {victim}'s daggers, and the rebellion's symbol goes down swinging empty hilts.`
        ]
    }
};
