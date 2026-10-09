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
            `{user} doesn't try to keep up with {victim}'s speed. He just waits for one mistake, and swings.`,
            `{user} lands one clean hit on {victim}, and one turns out to be enough. {victim} folds without a sound.`,
            `{user} takes three cuts to land one swing, but it's the swing that counts. {victim} drops.`
        ],
        rebel_garret_maxwell: [
            `{user} knocks the cannon aside and puts {victim} down. Two dockworkers, and only one still standing.`,
            `{user} hammers {victim} into the rubble {victim} made. There's some justice in that.`,
            `{user} catches {victim} reloading and ends the demolition early.`
        ],
        rebel_levi_wicker: [
            `{user} catches {victim} mid-joke with the hammer. The punchline never lands.`,
            `{user} waits for {victim}'s mods to flicker, then swings. {victim} goes down laughing, which is somehow worse.`,
            `{user} hits {victim} hard enough to end the showboating for good.`
        ],
        rebel_virgil_wesley: [
            `{user} shrugs off the whispers in his head and swings. {victim} didn't plan for someone too stubborn to listen.`,
            `{user} brings the hammer down on {victim}'s device, and the static in everybody's skull goes quiet.`,
            `{user} interrupts {victim}'s speech with the hammer. It's the most persuasive argument on the street.`
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
            `{user} reads {victim}'s pattern and holds the shield exactly where the next cut lands. The shock does the rest.`,
            `{user} recognizes something of itself in {victim}, a little, and ends it quickly out of respect.`,
            `{user} blocks a flurry of cuts, then shoves once. {victim} collapses, still polite.`
        ],
        rebel_garret_maxwell: [
            `{user} walks straight into {victim}'s cannon fire, shield up, and shocks {victim} out cold.`,
            `{user} pins the cannon's barrel under its shield and zaps {victim} until they let go.`,
            `{user} slams {victim} back into the rubble, and the cannon finally goes silent.`
        ],
        rebel_levi_wicker: [
            `{user} catches {victim}'s strike on the shield, and the current fries what's left of his mods. {victim} goes down hard.`,
            `{user} shocks {victim} mid-taunt, and {victim} stops talking.`,
            `{user} pins {victim} against the shield, and the joking finally stops.`
        ],
        rebel_virgil_wesley: [
            `{user} has no neurochip for {victim} to whisper into. It walks through the static and shocks {victim} flat.`,
            `{user} slams the shield into {victim}'s device, and the signal dies with a long electronic scream.`,
            `{user} pins {victim} beneath the shield. "No," it says, as {victim} starts to argue, and pulls the trigger.`
        ]
    },
    'Ray Gun': { // Gene Shock
        enforcer_soldier: [
            `{user} burns a hole straight through {victim}'s visor, and the soldier drops without a sound.`,
            `{user} catches {victim} mid-charge with a beam that melts the baton's grip. The rest of {victim} follows.`,
            `{user} fires once, and {victim} crumples with smoke curling off the armor.`
        ],
        enforcer_drone: [
            `{user} shoots {victim} out of the air, and it spirals down trailing smoke.`,
            `{user} melts {victim}'s rotors in one burst, and the drone drops like a stone.`,
            `{user} burns through {victim}'s targeting eye, and it crashes into a parked car.`
        ],
        rebel_initiate: [
            `{user} fires a quick shot that knocks {victim} flat. The scrap blade skitters across the street.`,
            `{user} takes a deep breath and burns {victim} down, wincing a little at how young they look.`,
            `{user} catches {victim} in the shoulder, and the kid spins once and hits the ground.`
        ],
        rebel_field_tech: [
            `{user} shoots {victim}'s arc launcher, and it goes off in their hands.`,
            `{user} burns {victim} down with a precise shot, then glances at the launcher, curious about the wiring.`,
            `{user} fires, and {victim} collapses in a heap of sparks and salvage.`
        ],
        division_command: [
            `{user} burns through {victim}'s uplink and keeps going. The orders stop for good.`,
            `{user} catches {victim} mid-transmission with a beam that ends the call.`,
            `{user} fires once, and {victim} goes down with the wrist display still asking for backup.`
        ],
        division_strategist: [
            `{user} shoots through {victim}'s holomap and hits the strategist behind it.`,
            `{user} beats {victim} to the shot by half a second, and half a second is plenty.`,
            `{user} melts the railcaster's barrel, then its owner. {victim} drops in a hiss of steam.`
        ],
        vanguard_captain: [
            `{user} overcharges the ray gun and burns right through {victim}'s armor plating. The gauntlets go still.`,
            `{user} finds a gap in {victim}'s armor and holds the beam on it until {victim} topples.`,
            `{user} hits {victim} so hard with the beam that the captain staggers back and doesn't come forward again.`
        ],
        field_captain: [
            `{user} shoots the sabre out of {victim}'s hand, then shoots {victim}.`,
            `{user} burns {victim} down mid-shout, and the line forgets the rest of the order.`,
            `{user} fires, and {victim} falls with the sabre still raised.`
        ],
        rebel_coordinator: [
            `{user} burns through {victim}'s faceplate, and the coordinator falls with the hammer still in hand.`,
            `{user} fires twice, and {victim} goes down hard, taking the cell's plan with them.`,
            `{user} catches {victim} mid-swing, and the breaker hammer clatters to the street.`
        ],
        operations_handler: [
            `{user} fries {victim}'s headset with the beam, and {victim} collapses clutching their ears.`,
            `{user} beats {victim}'s lock-on with a shot of their own, and the rifle beeps once and goes quiet.`,
            `{user} burns {victim} down, and the stolen comms crackle on, unheard.`
        ],
        division_chief: [
            `{user} cranks the ray gun to a color it's never made before and burns {victim} down. The verdict is overturned.`,
            `{user} dodges the compliance blade and shoots {victim} point blank.`,
            `{user} fires steadily until {victim} finally takes a knee and stays there.`
        ],
        rebellion_chief: [
            `{user} shoots the banner and then the chief beneath it. {victim} drops, and the cause loses its loudest voice.`,
            `{user} burns {victim} down mid-charge, and the halberd skids across the street.`,
            `{user} fires once, carefully, and {victim} sinks to the pavement.`
        ],
        enforcer_the_architect: [
            `{user} meets {victim}'s light with their own. The prism cracks first, then {victim} goes down.`,
            `{user} out-burns the prism, and {victim} finally looks surprised. Then {victim} stops looking at all.`,
            `{user} fires a beam so bright the prism can't bend it, and {victim} falls.`
        ],
        enforcer_macro_hull: [
            `{user} shoots straight into {victim}'s fusion core, and it flickers and fades. The giant goes down slowly.`,
            `{user} pours every bit of their own cores into one shot, and {victim}'s chest goes dark.`,
            `{user} dodges the maul and burns {victim}'s core out, and the ground stops shaking.`
        ],
        enforcer_genisis: [
            `{user} can't track {victim}, so they fire where {victim} is going to be. {victim} walks right into it.`,
            `{user} burns {victim} down mid-dash, and the blades clatter silent.`,
            `{user} fires wide on purpose, then catches {victim} on the dodge. {victim} folds.`
        ],
        rebel_garret_maxwell: [
            `{user} shoots the cannon's charge chamber, and the blast drops {victim} hard.`,
            `{user} trades fire with {victim} and wins, and the demolition chief goes down in the rubble.`,
            `{user} burns {victim} down in a single, precise shot.`
        ],
        rebel_levi_wicker: [
            `{user} fires right as {victim}'s mods fail, and the timing couldn't be worse for him.`,
            `{user} burns {victim} mid-laugh, and the laughing stops.`,
            `{user} catches {victim} mid-leap, and he drops out of the air.`
        ],
        rebel_virgil_wesley: [
            `{user} shoots the device on {victim}'s wrist, and the whispering in every skull nearby goes silent. {victim} goes down with it.`,
            `{user} fires through the static in their own head and hits {victim} square.`,
            `{user} ends {victim}'s argument the only way they know, with a beam to the chest.`
        ]
    },
    'Energy Sword': { // Leo
        enforcer_soldier: [
            `{user} slips past {victim}'s baton and opens them up in one smooth stroke.`,
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
            `{user} matches {victim} cut for cut, blade for blade, and then he's a hair faster. {victim} falls.`,
            `{user} and {victim} pass each other in a blur. A moment later, {victim} drops.`,
            `{user} finds the one gap in {victim}'s perfect form. "Good fight," he says, and means it.`
        ],
        rebel_garret_maxwell: [
            `{user} slips under the cannon's barrel and cuts {victim} down before it can fire.`,
            `{user} slices the cannon's charge cell, and {victim} goes down in the flash.`,
            `{user} gets in close, where heavy artillery doesn't help, and finishes {victim}.`
        ],
        rebel_levi_wicker: [
            `{user} and {victim} trade grins and cuts until {victim}'s mods give out mid-swing. {user} doesn't miss the chance.`,
            `{user} out-fights {victim} at his own game and cuts him down with a wry nod.`,
            `{user} catches {victim} mid-taunt with a cut that ends the conversation.`
        ],
        rebel_virgil_wesley: [
            `{user} slices the device off {victim}'s wrist, and the whispering stops. {victim} follows it to the ground.`,
            `{user} ignores every word {victim} says and cuts him down. He's heard better pitches.`,
            `{user} cuts {victim} down mid-sentence. The rest of the argument goes unspoken.`
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
            `{user} fires a spread wide enough that even {victim} can't dodge all of it. Some of it is plenty.`,
            `{user} waits for {victim} to come to him, then fires point blank.`,
            `{user} catches {victim} on the dodge, and the shell finds them anyway.`
        ],
        rebel_garret_maxwell: [
            `{user} out-shoots {victim}'s cannon at close range, and the demolition chief drops.`,
            `{user} fires at {victim} until the cannon goes quiet.`,
            `{user} blasts {victim} back into the rubble they made.`
        ],
        rebel_levi_wicker: [
            `{user} fires as {victim} lunges, and the leap ends early.`,
            `{user} catches {victim} with the spread mid-joke. He doesn't finish it.`,
            `{user} shoots {victim} down, and his flickering mods finally go dark.`
        ],
        rebel_virgil_wesley: [
            `{user} blasts the static out of his head by firing at the source. {victim} goes down.`,
            `{user} shoots {victim} mid-speech, and the crowd's attention snaps away from him.`,
            `{user} fires once into the device on {victim}'s wrist, then once into {victim}.`
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
            `{user}'s drone can't keep up with {victim}, so it just hovers and waits. When {victim} finally stops moving, it fires.`,
            `{user}'s drone catches {victim} right as {victim} lands from a dash. Perfect timing, maybe by accident.`,
            `{user}'s drone stings {victim} once too often, and the perfect enforcer finally falls.`
        ],
        rebel_garret_maxwell: [
            `{user}'s drone flies right into the cannon's barrel and fires. The backfire knocks {victim} off his feet.`,
            `{user}'s drone keeps zapping {victim} until the big demolitionist finally sits down in his own rubble.`,
            `{user}'s drone darts around {victim} until he can't track it, then finishes him from behind.`
        ],
        rebel_levi_wicker: [
            `{user}'s drone fries what's left of {victim}'s mods, and he finally drops.`,
            `{user}'s drone zaps {victim} mid-joke, and he doesn't get to the punchline.`,
            `{user}'s drone fires a burst at {victim}'s knees, and he goes down laughing at the indignity of it.`
        ],
        rebel_virgil_wesley: [
            `{user}'s drone jams {victim}'s signal, and the whispering stops. Then the drone fires.`,
            `{user}'s drone doesn't have a neurochip to listen with. It flies right past {victim}'s words and fires into his chest.`,
            `{user}'s drone fries the device on {victim}'s wrist, and {victim} goes down with it.`
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
            `{user} plays a wall of sound too wide to dodge, and {victim} finally stops moving.`,
            `{user} hits {victim} with feedback so loud the perfect enforcer covers both ears, then falls.`,
            `{user} finds the hum of {victim}'s implants and plays it back at them, louder. {victim} drops.`
        ],
        rebel_garret_maxwell: [
            `{user} hits a chord that sets off {victim}'s cannon early, and the blast knocks him flat.`,
            `{user} plays something slow and heavy, and {victim} finally sits down in the rubble and stays there.`,
            `{user} rips a riff at {victim} that shakes dust off every wall on the street, and the demolition man goes down under it.`
        ],
        rebel_levi_wicker: [
            `{user} finds the frequency of {victim}'s failing mods, and they all fail at once.`,
            `{user} plays a riff, and {victim} drops mid-laugh, still grinning.`,
            `{user} and {victim} share a look, two people who like being loud. Then {user} plays louder, and {victim} goes down.`
        ],
        rebel_virgil_wesley: [
            `{user} drowns out {victim}'s whispering with a riff, and keeps playing until {victim} drops.`,
            `{user} plays over the signal until there's nothing left of it, and {victim} folds with it.`,
            `{user} hits a chord that fries the device on {victim}'s wrist. The rebel mastermind goes down in a cloud of smoke.`
        ]
    },
    'Magic Energy': { // True North
        enforcer_soldier: [
            `{user} hits {victim} with a bolt that knocks the soldier flat. She lets out a long breath. Her father wore that uniform once.`,
            `{user} blasts {victim} back into a wall, and the soldier slides down it and stays there.`,
            `{user} holds a steady beam on {victim} until the baton drops, then the soldier.`
        ],
        enforcer_drone: [
            `{user} knocks {victim} out of the air with a single, careful bolt.`,
            `{user} catches {victim} mid-turn, and it spins away into a shop window.`,
            `{user} fires, and {victim} falls in a shower of sparks right at her feet.`
        ],
        rebel_initiate: [
            `{user} knocks {victim} down as gently as she can. "Stay down," she says. They do.`,
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
            `{user} fires where {victim} is going to be, and {victim} walks right into it.`,
            `{user} catches {victim} with a blast too wide to slip.`,
            `{user} hits {victim} with a bolt, and the perfect enforcer stops. "Rest," she says quietly.`
        ],
        rebel_garret_maxwell: [
            `{user} blasts {victim}'s cannon, and the explosion takes him down.`,
            `{user} hits {victim} with a bolt, and the big man finally drops into his own rubble.`,
            `{user} keeps firing until {victim} stops getting up.`
        ],
        rebel_levi_wicker: [
            `{user} catches {victim} mid-leap with a bolt, and he drops out of the air.`,
            `{user} hits {victim} just as his mods fail, and he goes down.`,
            `{user} blasts {victim}, and the jokes finally stop.`
        ],
        rebel_virgil_wesley: [
            `{user} shuts out the whispering in her head and fires. {victim} goes down.`,
            `{user} blasts the device on {victim}'s wrist, and the signal dies with him.`,
            `{user} hits {victim} with a beam in the middle of his speech. Nobody claps.`
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
            `{user} hacks the code that rebuilt {victim} and shuts it all down. The perfect enforcer stops.`,
            `{user} overloads {victim}'s implants, and they drop mid-step.`,
            `{user} finds a forgotten line of code in {victim}'s head, from before Crown Gene, and runs it. {victim} lies down.`
        ],
        rebel_garret_maxwell: [
            `{user} hacks {victim}'s cannon and overloads it. The blast takes {victim} down.`,
            `{user} fries the targeting on {victim}'s cannon, and the next shot lands right at his own feet.`,
            `{user} locks {victim}'s cannon in place and shocks him through the grip.`
        ],
        rebel_levi_wicker: [
            `{user} hacks {victim}'s failing mods and turns them off for good.`,
            `{user} overloads {victim}'s implants, and he drops mid-laugh.`,
            `{user} hijacks {victim}'s legs mid-sprint, and he goes down face first.`
        ],
        rebel_virgil_wesley: [
            `{user} out-hacks {victim} at his own game. The signal dies.`,
            `{user} hijacks {victim}'s device and turns the whispering on him. {victim} drops, hands over his ears.`,
            `{user} fries {victim}'s neurochip, and the rebellion's mastermind goes down.`
        ]
    }
};
