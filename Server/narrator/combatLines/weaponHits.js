// Weapon hits by how much they hurt next to the target's max health: low, medium, high.
// Party weapons get six lines per tier, enemy weapons four. {user} swings, {target} takes it.

export const WEAPON_HITS = {
    // ----- The party -----
    Hammer: { // Shipment
        low: [
            `{user} clips {target} with the edge of the hammer. It barely counts, and he knows it.`,
            `{user}'s hammer glances off {target}'s shoulder with a dull clang.`,
            `{user} swings wide, and the hammer only kisses {target} on the way past.`,
            `{user} catches {target} with the handle instead of the head. Still hurts. Not much.`,
            `{user} taps {target} with the hammer, mostly to remind them he's there.`,
            `{user} brings the hammer around a beat too late, and {target} rolls with most of it.`
        ],
        medium: [
            `{user} brings the hammer down on {target}'s guard and something in their arm gives.`,
            `{user} swings the hammer into {target}'s ribs with a sound like a door slamming.`,
            `{user} plants his feet and drives the hammer into {target}, who stumbles back a step.`,
            `{user} hooks the hammer around and catches {target} square in the hip.`,
            `{user} hammers {target} once, hard, and lets them think about it.`,
            `{user} slams the hammer into {target}'s side, knocking the wind clean out of them.`
        ],
        high: [
            `{user} winds up all the way back and caves {target} in with one swing.`,
            `{user} brings the hammer down on {target} like he's driving a fence post, and {target} folds right over.`,
            `{user}'s hammer lands on {target} with a crunch everyone on the street hears. Nobody likes that sound.`,
            `{user} swings from the floor, and the hammer launches {target} off their feet.`,
            `{user} puts his whole weight behind one swing. {target} meets the pavement the hard way.`,
            `{user} hits {target} so hard the hammer hums afterward.`
        ]
    },
    'Taser Shield': { // E.N.C.A.G.E
        low: [
            `{user} bumps {target} with the shield, and the charge only nips at them.`,
            `{user}'s shield sparks against {target}'s armor without much bite.`,
            `{user} jabs the shield's edge at {target}, a quick zap and nothing more.`,
            `{user} nudges {target} back with the shield, which buzzes in mild protest.`,
            `{user} catches {target} with a weak arc from the shield's rim.`,
            `{user} slaps {target} with the flat of the shield, more warning than attack.`
        ],
        medium: [
            `{user} drives the taser shield into {target}, and the charge locks up their arm.`,
            `{user} slams the shield into {target}, and a crackle of current knocks them back.`,
            `{user} pins {target} for a second with the shield and lets the current do the rest.`,
            `{user} rams {target} with the shield's face, leaving them twitching.`,
            `{user} shoves the electrified shield into {target}'s chest, and their whole body jerks.`,
            `{user} hammers {target} with the shield's edge, the current biting hard on contact.`
        ],
        high: [
            `{user} slams the shield into {target} at full charge, and the flash lights up the whole street.`,
            `{user} crushes {target} behind the shield and dumps every volt it has into them.`,
            `{user} brings the shield down on {target} like a falling door, current screaming.`,
            `{user} charges {target} shield first. When it connects, {target} goes rigid and drops.`,
            `{user} lets the shield's capacitor go all at once into {target}, and they smoke a little afterward.`,
            `{user} pins {target} to the nearest wall with the shield and holds the trigger down.`
        ]
    },
    'Ray Gun': { // Gene Shock
        low: [
            `{user}'s ray gun singes {target}, leaving a scorch mark and not much else.`,
            `{user} snaps off a quick shot that grazes {target}'s arm.`,
            `{user}'s beam skims {target}, more sunburn than wound.`,
            `{user} fires from the hip, and the ray only scorches the edge of {target}'s armor.`,
            `{user} clips {target} with a thin, sputtering beam.`,
            `{user}'s shot catches {target}'s shoulder, a hot little sting.`
        ],
        medium: [
            `{user} levels the ray gun and scorches a line across {target}'s chest.`,
            `{user} squeezes off a steady beam that burns straight into {target}'s side.`,
            `{user}'s ray gun hisses, and {target} staggers back with smoke coming off their armor.`,
            `{user} fires a bright, clean shot into {target}, who doubles over around it.`,
            `{user} holds the trigger down a little longer than usual. {target} feels every extra second.`,
            `{user} catches {target} mid-step with a beam that melts a hole in their guard.`
        ],
        high: [
            `{user} cranks the ray gun to a color it probably shouldn't make, and the beam punches right through {target}.`,
            `{user} fires, and the ray hits {target} so hard their armor glows afterward.`,
            `{user}'s cores flare as they pour everything into one shot. {target} takes all of it.`,
            `{user} lets off a blast that throws {target} back in a cloud of smoke and sparks.`,
            `{user} overcharges the ray gun and lights {target} up from the inside out.`,
            `{user} fires a beam so bright everyone looks away, and {target} has nowhere to go.`
        ]
    },
    'Energy Sword': { // Leo
        low: [
            `{user}'s sword flicks across {target}'s guard and leaves a thin, glowing scratch.`,
            `{user} nicks {target} on a fast pass, barely breaking stride.`,
            `{user} tests {target}'s guard with a light cut, learning more than he hurts.`,
            `{user}'s blade grazes {target}'s arm as they twist away.`,
            `{user} slashes, and {target} gets their armor in the way just in time.`,
            `{user} draws a shallow line across {target}'s side. A warning shot.`
        ],
        medium: [
            `{user} slips inside {target}'s reach and opens a clean cut across their ribs.`,
            `{user}'s energy sword carves through {target}'s armor like it isn't there.`,
            `{user} feints left, cuts right, and {target} pays for watching the wrong hand.`,
            `{user} spins and slashes {target} across the back on the way through.`,
            `{user} parries {target}'s swing and answers with a cut that sends them reeling.`,
            `{user}'s blade hums through {target}'s guard and leaves a smoking gash.`
        ],
        high: [
            `{user} vanishes inside {target}'s guard and comes out the other side with the sword already dimming.`,
            `{user} carves {target} open with one long, quiet stroke. No wasted motion.`,
            `{user} brings the sword down through {target}'s armor, plating and all.`,
            `{user} lunges and runs the blade straight through {target}'s defenses. {target} sags against it.`,
            `{user}'s sword flashes twice, so fast it looks like one cut, and {target} staggers like they took ten.`,
            `{user} catches {target} wide open and doesn't waste the chance.`
        ]
    },
    Shotgun: { // Last Legion
        low: [
            `{user}'s shotgun clips {target} with the edge of the spread.`,
            `{user} fires a hurried shot that only peppers {target}'s armor.`,
            `{user} catches {target} with a couple of stray pellets.`,
            `{user}'s blast rattles off {target}'s shoulder plate.`,
            `{user} fires low, and the spread nicks {target}'s legs.`,
            `{user} pumps and fires from too far out. {target} winces, but that's about it.`
        ],
        medium: [
            `{user} racks the shotgun and puts a load into {target}'s chest.`,
            `{user} unloads the shotgun into {target}, who stumbles back under the spread.`,
            `{user} fires twice, fast, and the second shot catches {target} square.`,
            `{user} steps around cover and blasts {target} in the side.`,
            `{user}'s shotgun barks, and {target} spins halfway around.`,
            `{user} leads {target} a half step and the spread meets them right where they land.`
        ],
        high: [
            `{user} walks right up to {target} and fires point blank. It's not subtle, and it's not supposed to be.`,
            `{user} unloads at close range, and {target} gets thrown back into the wall.`,
            `{user} pumps the shotgun with one hand and empties it into {target} with the same calm he used to pour drinks.`,
            `{user}'s blast catches {target} dead center and knocks them flat.`,
            `{user} fires, racks, and fires again before {target} hits the ground.`,
            `{user} puts a slug right through {target}'s guard. Old habits.`
        ]
    },
    Drone: { // Patchwork
        low: [
            `{user}'s drone zips past {target} and gets in one cheeky little shock.`,
            `{user} sends the drone buzzing at {target}, and it lands a tiny zap before pulling back.`,
            `{user}'s drone bumps into {target}'s helmet and apologizes with a beep.`,
            `{user} has the drone take a quick shot at {target}. It mostly singes paint.`,
            `{user}'s drone fires a short burst that skips off {target}'s armor.`,
            `{user}'s drone darts in, nips {target}, and darts right back out.`
        ],
        medium: [
            `{user} sends the drone zooming at {target}, and its little laser burns a hole in their armor.`,
            `{user}'s drone dives at {target}, blasting all the way down.`,
            `{user} spins up the drone and it rattles off a burst straight into {target}.`,
            `{user}'s drone circles {target} twice, firing the whole time.`,
            `{user}'s drone rams {target} on purpose, then fires point blank for good measure.`,
            `{user} thumbs the controller, and the drone strafes {target} from the side.`
        ],
        high: [
            `{user} overclocks the drone and it tears into {target} with everything it has.`,
            `{user}'s drone screams down on {target} and empties its whole battery into them.`,
            `{user} sends the drone into a kamikaze dive that pulls up just before it hits, firing into {target}'s face the whole time.`,
            `{user}'s drone locks on and holds the beam steady on {target} until it smokes.`,
            `{user}'s drone fires so hard it gets thrown backward through the air. {target} gets thrown farther.`,
            `{user} whispers "go" to the drone, and it rips into {target} like it has a grudge.`
        ]
    },
    'Electric Guitar': { // Livewire
        low: [
            `{user} strums a quick chord, and the shockwave barely ruffles {target}.`,
            `{user} hits a flat note that only rattles {target}'s helmet.`,
            `{user} plays a short riff, and a weak pulse tickles {target}'s armor.`,
            `{user} plucks one string at {target}. It twangs. They flinch. That's about it.`,
            `{user}'s chord wobbles out of tune, and the blast only grazes {target}.`,
            `{user} slaps the strings, and a little burst of sound clips {target}.`
        ],
        medium: [
            `{user} hits a chord, and the shockwave rattles {target} right down to the boots.`,
            `{user} rips a riff that slams into {target} like an amp falling over.`,
            `{user} bends a note until it screams, and {target} grabs their head.`,
            `{user} plays a fast run that hammers {target} with wave after wave of sound.`,
            `{user} strikes a power chord, and {target} gets knocked back a step.`,
            `{user} turns the dial up and lets {target} have the chorus.`
        ],
        high: [
            `{user} windmills a chord so loud it cracks the windows, and {target} gets the worst of it.`,
            `{user} plays the loudest note of his life, and {target} goes flying.`,
            `{user} shreds a solo straight at {target}, and nearby electronics start blowing up in sympathy.`,
            `{user} slams the strings with everything he's got, and the blast knocks {target} flat.`,
            `{user} finds the frequency that makes {target}'s gear scream, then holds it there.`,
            `{user} plays a chord that rattles teeth from across the street. Closer in, {target} doesn't stand a chance.`
        ]
    },
    'Magic Energy': { // True North
        low: [
            `{user} flicks a wisp of energy at {target} that leaves a faint scorch.`,
            `{user}'s bolt glances off {target}'s armor in a shower of sparks.`,
            `{user} throws a small burst of light that stings {target} without slowing them.`,
            `{user} grazes {target} with a quick spark from her fingers.`,
            `{user}'s energy brushes past {target}, hot enough to make them flinch.`,
            `{user} sends a cautious little bolt at {target}, aiming more to warn than to hurt.`
        ],
        medium: [
            `{user} hurls a bolt of energy that slams into {target}'s chest.`,
            `{user} pushes a wave of light into {target}, knocking them off balance.`,
            `{user} fires a steady stream of energy that burns into {target}'s guard.`,
            `{user} spins her staff and launches a crackling burst into {target}.`,
            `{user} lets fly with two quick bolts. Both of them find {target}.`,
            `{user} catches {target} with a bright blast that sends them stumbling.`
        ],
        high: [
            `{user} gathers everything she has and blasts {target} off their feet.`,
            `{user} unleashes a torrent of energy that hammers {target} into the ground.`,
            `{user} brings her staff down, and a column of light crashes onto {target}.`,
            `{user} sets her jaw and fires a beam that tears straight through {target}'s defenses.`,
            `{user} hits {target} with a burst so bright the shadows all point the other way for a second.`,
            `{user} lets loose a wave of light that slams {target} back and leaves the ground glowing.`
        ]
    },
    Laptop: { // Ghost Shell
        low: [
            `{user} pushes a cheap exploit into {target}'s gear, and their visor flickers.`,
            `{user} types a quick line, and {target}'s armor gives off a weak little shock.`,
            `{user} pings {target}'s implants just to annoy them. It works.`,
            `{user} sends a minor virus at {target}, and their gear stutters for a moment.`,
            `{user} hacks {target}'s comms and blasts static into their ears.`,
            `{user} trips a fault in {target}'s gear. Their whole suit hiccups.`
        ],
        medium: [
            `{user} types fast, and something in {target}'s gear sparks and pops.`,
            `{user} overloads {target}'s armor, and it shocks them from the inside.`,
            `{user} fires a burst of code at {target}, and their limbs jerk out of sync.`,
            `{user} hijacks {target}'s targeting and makes them punch themselves in the visor.`,
            `{user} overheats {target}'s power pack until it burns them through the armor.`,
            `{user} hits enter, and {target}'s gear turns on them with a vicious jolt.`
        ],
        high: [
            `{user} cracks {target}'s security wide open and fries every system they're wearing.`,
            `{user} tells {target}'s power core to explode, and it tries its absolute best.`,
            `{user} slams a whole library of viruses into {target}, and their suit goes haywire.`,
            `{user} finds a backdoor into {target}'s implants and turns everything up to eleven.`,
            `{user} bricks {target}'s armor while they're still wearing it, and it locks up hard.`,
            `{user} hits one last key with a flourish. {target}'s gear shorts out in a shower of sparks.`
        ]
    },

    // ----- Enforcers and the Division -----
    'Shock Baton': { // Enforcer Soldier
        low: [
            `{user} jabs {target} with the shock baton, and it bites without much charge.`,
            `{user}'s baton cracks against {target}'s guard and fizzles out.`,
            `{user} swings the baton and only clips {target}'s elbow.`,
            `{user} prods {target} with the baton. It sparks. It stings. That's it.`
        ],
        medium: [
            `{user} cracks {target} across the shoulder with the shock baton, and the jolt locks up {target.their} arm.`,
            `{user}'s baton hits {target} in the ribs with a sharp electric snap.`,
            `{user} drives the baton into {target}'s side and holds it there a second too long.`,
            `{user} brings the baton down on {target}, and the current makes {target.their} knees buckle.`
        ],
        high: [
            `{user} cranks the baton to full charge and slams it into {target}. They go rigid.`,
            `{user} swings the baton with both hands and lights {target} up like a fuse box.`,
            `{user} jams the baton under {target}'s guard and dumps the whole battery into {target.them}.`,
            `{user} catches {target} across the head with the baton, and the street flashes blue.`
        ]
    },
    'Pulse Carbine': { // Enforcer Drone
        low: [
            `{user}'s carbine stitches a line of sparks across {target}'s feet.`,
            `{user} fires a short pulse that grazes {target}.`,
            `{user} takes a potshot at {target} that skims off cover and only half connects.`,
            `{user} chirps and fires, and the pulse nicks {target}'s arm.`
        ],
        medium: [
            `{user} hovers steady and pumps three pulses into {target}.`,
            `{user}'s carbine catches {target} in the shoulder with a thudding blast.`,
            `{user} swoops low and strafes {target} with a burst of fire.`,
            `{user} locks on with a beep, and the pulse slams into {target}'s chest.`
        ],
        high: [
            `{user} unloads the carbine on full auto, and {target} disappears behind the flashes.`,
            `{user} drops right in front of {target} and fires point blank.`,
            `{user}'s carbine overheats as it pours fire into {target}.`,
            `{user} lines up a perfect shot, and the pulse knocks {target} clean off {target.their} feet.`
        ]
    },
    'Scrap Blade': { // Rebel Initiate
        low: [
            `{user}'s scrap blade scrapes across {target}'s guard and squeals off.`,
            `{user} slashes wildly and just barely catches {target}'s sleeve.`,
            `{user} jabs with the scrap blade, and {target} mostly turns it aside.`,
            `{user} nicks {target} with the jagged edge and looks surprised it worked.`
        ],
        medium: [
            `{user} drives the scrap blade into {target}'s side, rough edge first.`,
            `{user} hacks at {target} and opens a ragged cut.`,
            `{user} gets lucky and slips the scrap blade past {target}'s guard.`,
            `{user} swings with both hands and the blade bites deep into {target}'s arm.`
        ],
        high: [
            `{user} screams and buries the scrap blade in {target} up to the duct tape.`,
            `{user} lunges with everything and rips a long, ugly gash across {target}.`,
            `{user} gets inside {target}'s reach and slashes again and again, sloppy and vicious.`,
            `{user} catches {target} wide open and makes the most of a jagged piece of metal.`
        ]
    },
    'Arc Launcher': { // Rebel Field Tech
        low: [
            `{user}'s arc launcher spits a weak bolt that fizzles against {target}.`,
            `{user} fires, and the arc jumps to a lamppost before it ever reaches {target}. Mostly.`,
            `{user} lobs an arc that only tickles {target}'s armor.`,
            `{user}'s launcher coughs, sputters, and lands a feeble zap on {target}.`
        ],
        medium: [
            `{user} fires an arc of lightning that lashes {target} and makes {target.them} jerk.`,
            `{user}'s launcher hums and throws a bolt that wraps around {target}.`,
            `{user} lands an arc square on {target}, who smells briefly like burnt hair.`,
            `{user} fires twice, and the second arc catches {target} in the back.`
        ],
        high: [
            `{user} overcharges the launcher and the arc hits {target} like a blown transformer.`,
            `{user} fires a bolt that chains through {target} and leaves {target.them} twitching on the pavement.`,
            `{user} cranks the launcher past its warning beep and absolutely blasts {target}.`,
            `{user}'s arc catches {target} dead center, and every hair on {target.their} body stands up.`
        ]
    },
    'Command Uplink': { // Division Command
        low: [
            `{user} taps the uplink, and a small drone strike pings {target}.`,
            `{user} sends a targeting pulse that only stings {target}.`,
            `{user} calls down a weak burst that grazes {target}.`,
            `{user} pings {target}'s position, and a single shot follows it in.`
        ],
        medium: [
            `{user} calls a strike through the uplink, and it lands right on {target}.`,
            `{user} relays coordinates, and a hail of fire hammers {target}.`,
            `{user} jabs at the uplink, and a burst from somewhere overhead slams into {target}.`,
            `{user} marks {target}, and the city's guns agree with the decision.`
        ],
        high: [
            `{user} authorizes full fire, and the whole sky seems to land on {target}.`,
            `{user} calls in a strike that rocks the pavement under {target}.`,
            `{user} slaps the uplink twice, and two blasts flatten {target} in a row.`,
            `{user} locks the uplink onto {target} and doesn't stop the fire until the screen turns red.`
        ]
    },
    'Tactical Railcaster': { // Division Strategist
        low: [
            `{user}'s railcaster round skims {target}'s armor with a whine.`,
            `{user} fires a quick shot that only grazes {target}.`,
            `{user} takes a rushed shot, and the round clips {target}'s shoulder.`,
            `{user} fires through a gap in cover and catches a sliver of {target}.`
        ],
        medium: [
            `{user} fires the railcaster, and the round punches into {target}'s side.`,
            `{user} lines up a calm shot that slams {target} back a step.`,
            `{user}'s rail round tears through {target}'s guard with a supersonic crack.`,
            `{user} adjusts the angle a hair and puts a round square in {target}.`
        ],
        high: [
            `{user} waits for the perfect shot, and the railcaster drills straight through {target}.`,
            `{user} fires a round that hits {target} so hard the sound arrives afterward.`,
            `{user} charges the railcaster all the way and lays {target} out.`,
            `{user} fires once, precisely, and {target} hits the ground spinning.`
        ]
    },
    'Siege Gauntlets': { // Vanguard Captain
        low: [
            `{user} swipes at {target} with a gauntlet and only catches armor.`,
            `{user}'s fist grazes {target}'s jaw.`,
            `{user} shoves {target} with a gauntlet, more push than punch.`,
            `{user} throws a heavy hook that {target} mostly rolls under.`
        ],
        medium: [
            `{user} drives a gauntlet into {target}'s stomach, and {target} folds over it.`,
            `{user} slams both fists down on {target}'s guard and breaks it open.`,
            `{user}'s gauntlet catches {target} on the shoulder with a crunch.`,
            `{user} clubs {target} with a backhand that sends {target.them} sideways.`
        ],
        high: [
            `{user} winds up and hits {target} with a punch that leaves a crater behind {target.them}.`,
            `{user} lands a double-fisted blow on {target}, and the pavement cracks underneath.`,
            `{user}'s gauntlets ignite, and the uppercut lifts {target} clean off the ground.`,
            `{user} pins {target} with one gauntlet and pounds {target.them} with the other.`
        ]
    },
    'Command Sabre': { // Field Captain
        low: [
            `{user}'s sabre flicks across {target}'s guard and leaves a thin line.`,
            `{user} lunges, and the tip only grazes {target}.`,
            `{user} slashes, and {target} parries most of it.`,
            `{user} nicks {target} with a quick cut on the backswing.`
        ],
        medium: [
            `{user} cuts {target} across the arm with a crisp, practiced stroke.`,
            `{user}'s sabre slices into {target}'s side with textbook form.`,
            `{user} beats {target}'s guard aside and lands a clean cut.`,
            `{user} thrusts the sabre through a gap in {target}'s defense.`
        ],
        high: [
            `{user} brings the sabre down in a perfect arc that cleaves through {target}'s guard.`,
            `{user} lunges hard and runs {target} through.`,
            `{user} slashes twice in a perfect drill pattern. Both cuts land deep on {target}.`,
            `{user} dodges {target}'s swing and answers with a cut that drops {target.them} to one knee.`
        ]
    },
    'Breaker Hammer': { // Rebel Coordinator
        low: [
            `{user}'s breaker hammer glances off {target}'s shoulder.`,
            `{user} swings wide, and only the handle catches {target}.`,
            `{user} brings the hammer down a beat late and clips {target}'s heel.`,
            `{user} shoves {target} with the hammer's head, more nudge than hit.`
        ],
        medium: [
            `{user} slams the breaker hammer into {target}, and the impact rattles {target.their} teeth.`,
            `{user} hammers {target} in the side, and something cracks.`,
            `{user} swings low and takes {target}'s legs out from under {target.them}.`,
            `{user} brings the hammer down on {target}'s guard and busts it wide open.`
        ],
        high: [
            `{user} swings the breaker hammer all the way around and crushes {target}.`,
            `{user} drops the hammer on {target} with a crack that echoes off the buildings.`,
            `{user} triggers the hammer's piston on contact, and {target} gets launched.`,
            `{user} hits {target} so hard the hammer's head throws sparks.`
        ]
    },
    'Signal Rifle': { // Operations Handler
        low: [
            `{user}'s signal rifle pings {target} with a weak, buzzing shot.`,
            `{user} fires, and the round barely clips {target}.`,
            `{user} takes a rushed shot that grazes {target}'s arm.`,
            `{user} fires a burst of static that only stings {target}.`
        ],
        medium: [
            `{user} lands a clean shot on {target}, and the signal round leaves {target.their} ears ringing.`,
            `{user} fires twice, and both rounds find {target}.`,
            `{user} catches {target} mid-step with a buzzing round.`,
            `{user} lines up the scope and hits {target} square in the chest.`
        ],
        high: [
            `{user} fires a round that scrambles {target}'s whole nervous system.`,
            `{user} catches {target} with a shot that drops {target.them} to {target.their} knees, twitching.`,
            `{user} unloads the signal rifle into {target}, every round screaming static.`,
            `{user} waits, steadies, fires. {target} goes down hard.`
        ]
    },
    'Compliance Blade': { // Division Chief
        low: [
            `{user}'s compliance blade grazes {target} with a soft electronic tone.`,
            `{user} cuts, and {target} gets {target.their} arm up just in time.`,
            `{user} slices a thin line across {target}'s armor.`,
            `{user} flicks the blade at {target}, a reminder more than a wound.`
        ],
        medium: [
            `{user} cuts across {target}'s chest, and the blade hums its approval.`,
            `{user}'s blade bites into {target}'s side with surgical calm.`,
            `{user} parries {target}'s swing and answers with a measured cut.`,
            `{user} brings the blade down on {target}, and the stun charge lands with it.`
        ],
        high: [
            `{user} passes sentence with one stroke, and {target} crumples under it.`,
            `{user}'s blade cuts through {target}'s guard and leaves {target.them} gasping.`,
            `{user} brings the blade down on {target} with the full weight of the Division behind it.`,
            `{user} strikes twice, both perfect. {target} barely stays on {target.their} feet.`
        ]
    },
    'Liberator Halberd': { // Rebellion Chief
        low: [
            `{user}'s halberd scrapes across {target}'s guard.`,
            `{user} sweeps the halberd and catches only a corner of {target}.`,
            `{user} jabs with the spear tip, and {target} slips most of it.`,
            `{user} swings wide, and the haft clips {target} on the way past.`
        ],
        medium: [
            `{user} sweeps the halberd into {target}'s legs and knocks {target.them} stumbling.`,
            `{user} drives the spear tip into {target}'s shoulder.`,
            `{user} brings the axe head around in a wide arc and catches {target} hard.`,
            `{user} hooks {target}'s guard with the halberd and drags it open.`
        ],
        high: [
            `{user} brings the halberd down in a two-handed chop that drops {target} to a knee.`,
            `{user} spins the halberd overhead and slams the axe head into {target}.`,
            `{user} runs {target} through with the spear tip and shoves {target.them} back off it.`,
            `{user} sweeps the halberd in a full circle, and {target} is right in the middle of it.`
        ]
    },
    'Directive Prism': { // The Architect
        low: [
            `{user} tilts the prism, and a thin beam of light singes {target}.`,
            `{user} bends a sliver of light at {target}, a warning more than an attack.`,
            `{user}'s prism scatters a glare that stings {target}'s eyes.`,
            `{user} flicks the prism, and a stray reflection burns across {target}'s armor.`
        ],
        medium: [
            `{user} focuses the prism, and a beam of white light burns into {target}.`,
            `{user} bends three beams into one and lays it across {target}.`,
            `{user} catches the city's light in the prism and sends it straight into {target}'s chest.`,
            `{user} angles the prism patiently, and the beam finds {target} anyway.`
        ],
        high: [
            `{user} turns the prism and the whole street's light converges on {target}.`,
            `{user} fires a beam so focused it cuts a line in the pavement behind {target}.`,
            `{user} lets the prism drink in light until it hurts to look at, then gives all of it to {target}.`,
            `{user} sighs, almost disappointed, and burns {target} down with a single beam.`
        ]
    },
    'Bastion Maul': { // Macro Hull
        low: [
            `{user}'s maul clips {target} and still knocks {target.them} a step sideways.`,
            `{user} swings lazily, and the maul glances off {target}'s guard.`,
            `{user} nudges {target} with the maul's head, which is still a lot of maul.`,
            `{user} brings the maul around a little slow, and {target} rolls with most of it.`
        ],
        medium: [
            `{user} slams the maul into {target}, and the fusion core in his chest flares with it.`,
            `{user} swings the maul into {target}'s side and laughs when {target} staggers.`,
            `{user} brings the maul down on {target}'s guard and nearly breaks it in two.`,
            `{user} drives the maul into {target}'s chest, and the shockwave rattles the glass nearby.`
        ],
        high: [
            `{user} brings the maul down on {target} and the ground caves in around {target.them}.`,
            `{user} swings the maul with a roar, and {target} gets launched across the street.`,
            `{user} vents his core through the maul on impact, and {target} takes a direct hit from a power plant.`,
            `{user} crushes {target} under the maul, laughing the whole time.`
        ]
    },
    'Zero-Lag Blades': { // Genisis
        low: [
            `{user} cuts so fast that {target} only notices the thin line afterward.`,
            `{user}'s blades flicker past {target}, leaving a shallow scratch.`,
            `{user} grazes {target}, then apologizes for the inconvenience.`,
            `{user} tests {target}'s guard with a cut too quick to see.`
        ],
        medium: [
            `{user}'s blades open three cuts on {target} in the time it takes to blink.`,
            `{user} slips past {target}'s guard and slices {target.them} twice on the way.`,
            `{user} cuts {target} with mechanical precision, exactly where it hurts most.`,
            `{user} is behind {target}, then in front, and both blades have found their mark.`
        ],
        high: [
            `{user} becomes a blur of steel around {target}, and {target} staggers out of it bleeding.`,
            `{user} cuts {target} so many times that the sound of it is one long note.`,
            `{user} parts {target}'s guard and {target.their} armor in one perfect, polite motion.`,
            `{user} blinks across the gap, and {target} drops to a knee before the cuts even register.`
        ]
    },
    'Breaker Cannon': { // Garret Maxwell
        low: [
            `{user}'s cannon round bursts near {target} and peppers {target.them} with debris.`,
            `{user} fires a little short, and the blast only rocks {target}.`,
            `{user}'s shell clips a pillar first and only half the blast reaches {target}.`,
            `{user} fires, and the shockwave just shoves {target} back.`
        ],
        medium: [
            `{user} fires the breaker cannon, and the blast slams {target} into the ground.`,
            `{user} lands a shell right next to {target}, and the explosion sends {target.them} tumbling.`,
            `{user} braces and fires, and {target} gets caught in a cloud of smoke and rubble.`,
            `{user}'s round hits {target} square, and the noise echoes for blocks.`
        ],
        high: [
            `{user} fires the breaker cannon point blank, and {target} vanishes in the blast.`,
            `{user} drops a round on {target} that takes a chunk out of the street with it.`,
            `{user} fires, and the shockwave hurls {target} into the nearest wall.`,
            `{user} shells {target} with the patience of a man taking down a building one wall at a time.`
        ]
    },
    'Riot Splitter': { // Levi Wicker
        low: [
            `{user} swipes at {target} and grins when the blade only grazes {target.them}.`,
            `{user}'s weapon catches {target}'s sleeve as he spins past.`,
            `{user} taps {target} with the flat of the blade. "Tag."`,
            `{user} slashes lazily and nicks {target}.`
        ],
        medium: [
            `{user} spins his weapon and opens a cut across {target}'s chest.`,
            `{user} lunges with a laugh and the blade bites into {target}'s shoulder.`,
            `{user} splits {target}'s guard down the middle and slips a cut through.`,
            `{user} hits {target} twice, fast and sloppy and very effective.`
        ],
        high: [
            `{user} brings the weapon down so hard it splits {target}'s armor open.`,
            `{user} goes wild, a flurry of cuts that leave {target} reeling.`,
            `{user}'s mods surge, and the next strike sends {target} sprawling.`,
            `{user} laughs, swings, and {target} stops being able to laugh along.`
        ]
    },
    'Signal Dominion': { // Virgil Wesley
        low: [
            `{user} whispers into {target}'s neurochip, and {target} flinches at a sudden headache.`,
            `{user}'s signal brushes {target}'s mind, an itch behind the eyes.`,
            `{user} sends a burst of static into {target}'s implant, and it buzzes for a moment.`,
            `{user} murmurs a few words, and {target} loses {target.their} balance for a second.`
        ],
        medium: [
            `{user} pushes a signal through {target}'s neurochip that makes {target.them} scream.`,
            `{user} hijacks {target}'s nerves for a moment and makes {target.them} stumble.`,
            `{user} floods {target}'s implant with noise until {target} clutches {target.their} head.`,
            `{user} smiles and sends a jolt straight into {target}'s brain.`
        ],
        high: [
            `{user} takes over {target}'s implant completely, and {target} drops to {target.their} knees, shaking.`,
            `{user} fills {target}'s head with so much static {target.they} can't stand up straight.`,
            `{user} whispers a single word, and {target}'s whole body seizes.`,
            `{user} overloads {target}'s neurochip until it burns, and {target} hits the ground.`
        ]
    }
};
