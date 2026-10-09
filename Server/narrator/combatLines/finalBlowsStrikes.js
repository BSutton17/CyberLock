// Final blows from abilities that hit one enemy up close or at range: two lines per enemy.
// {user} is whoever used it (any party member, so no pronouns for them), {victim} the enemy.

export const STRIKE_FINAL_BLOWS = {
    quick_jab: {
        enforcer_soldier: [
            `{user} snaps a jab under {victim}'s chin strap, and the soldier's legs just quit.`,
            `{user} pops {victim} in the visor twice, fast. The second one is the one that counts.`
        ],
        enforcer_drone: [
            `{user} flicks a jab into {victim}'s housing, and something inside rattles loose. It wobbles, dips, and drops.`,
            `{user} taps {victim} right on the targeting eye, and the light goes out.`
        ],
        rebel_initiate: [
            `{user} jabs {victim} once in the gut, and the kid folds right up.`,
            `{user} pops {victim} on the nose, not even hard. The scrap blade hits the ground before {victim} does.`
        ],
        rebel_field_tech: [
            `{user} jabs {victim} in the wrist, and the launcher goes off into the pavement. The blowback does the rest.`,
            `{user} sneaks a quick shot past the launcher and catches {victim} on the temple. Lights out.`
        ],
        division_command: [
            `{user} jabs {victim} right in the middle of an order, and the order never ends.`,
            `{user} catches {victim} on the jaw, and the uplink clatters to the ground with them.`
        ],
        division_strategist: [
            `{user} gets inside the railcaster's length and taps {victim} once in the throat. The strategy session is over.`,
            `{user} jabs {victim} so fast the holomap doesn't even register the movement. {victim} drops.`
        ],
        vanguard_captain: [
            `{user} finds the one soft spot under {victim}'s helmet with a single quick jab. All that armor goes down at once.`,
            `{user} jabs {victim} in the hinge of the gauntlet, then the hinge of the jaw. The captain topples.`
        ],
        field_captain: [
            `{user} jabs {victim} in the sword arm, then the chin. The captain sits down hard.`,
            `{user} slips the sabre and pops {victim} once. It's a smaller hit than the rally deserved.`
        ],
        rebel_coordinator: [
            `{user} darts in under the breaker hammer and jabs {victim} right in the dented faceplate. It caves.`,
            `{user} pops {victim} in the ribs mid-swing, and the coordinator goes down under the weight of their own hammer.`
        ],
        operations_handler: [
            `{user} jabs {victim} in the ear, right through the headset. The handler drops like someone pulled the plug.`,
            `{user} taps {victim} twice before the rifle comes up, and {victim} doesn't get a third chance.`
        ],
        division_chief: [
            `{user} slips the compliance blade and puts a quick jab right on {victim}'s chin. The chief's knees give out.`,
            `{user} jabs {victim}, small and quick, and the Division's judge goes down to a punch that barely made a sound.`
        ],
        rebellion_chief: [
            `{user} slips inside the halberd's reach and jabs {victim} under the ribs. The rebel leader crumples.`,
            `{user} catches {victim} mid-war-cry with a jab to the jaw. The cry turns into a cough, then silence.`
        ],
        enforcer_the_architect: [
            `{user} steps inside the light and jabs {victim} once on the chin. The founder of Singularity folds up like a lawn chair.`,
            `{user} pops {victim} right in the middle of a lecture. {victim} goes down, mouth still open.`
        ],
        enforcer_macro_hull: [
            `{user} jabs the cracked seam over {victim}'s fusion core, and the giant's whole body seizes. Down he goes.`,
            `{user} lands a small, perfect jab on {victim}'s chin, and a man that size drops like a cut cable.`
        ],
        enforcer_genisis: [
            `{user} finally matches {victim}'s speed for exactly one jab. It's enough. {victim} sinks to the ground.`,
            `{user} catches {victim} coming out of a dash with a jab to the temple. The perfect enforcer stops.`
        ],
        rebel_garret_maxwell: [
            `{user} slips past the cannon barrel and jabs {victim} once on the chin. The demolition chief sits down in his own rubble.`,
            `{user} pops {victim} in the solar plexus, and the big man goes down wheezing.`
        ],
        rebel_levi_wicker: [
            `{user} jabs {victim} mid-taunt, and his flickering mods pick that moment to quit. He drops.`,
            `{user} beats {victim} to the punch, literally. He goes down looking honestly impressed.`
        ],
        rebel_virgil_wesley: [
            `{user} jabs {victim} before the whispering can start, and the mastermind drops mid-breath.`,
            `{user} pops {victim} once. The rebellion's best speaker has nothing to say.`
        ]
    },
    sparkshot: {
        enforcer_soldier: [
            `{user}'s spark slams into {victim}'s chest plate, and the soldier jerks once and goes down twitching.`,
            `{user} fires a bolt into {victim}'s visor, and every light in the helmet blinks out at once.`
        ],
        enforcer_drone: [
            `{user}'s spark hits {victim} dead center, and it falls out of the air trailing smoke.`,
            `{user} zaps {victim}'s rotor motor, and it spirals down into a dumpster.`
        ],
        rebel_initiate: [
            `{user}'s spark catches {victim} in the shoulder, and the kid spins once and falls.`,
            `{user} zaps {victim}'s scrap blade, and the current runs right up the duct tape handle.`
        ],
        rebel_field_tech: [
            `{user}'s spark jumps into {victim}'s launcher, and the whole thing goes off at once.`,
            `{user} fires a bolt into {victim}'s backpack of salvage, and every spare battery in it answers.`
        ],
        division_command: [
            `{user} fires a spark straight into {victim}'s uplink, and it fries along with the officer wearing it.`,
            `{user}'s bolt hits {victim} mid-transmission. The Division hears a scream, then static.`
        ],
        division_strategist: [
            `{user}'s spark arcs through {victim}'s holomap and hits the strategist behind it.`,
            `{user} zaps the railcaster just as it finishes charging, and {victim} eats the backlash.`
        ],
        vanguard_captain: [
            `{user}'s spark finds a crack in {victim}'s armor and runs through every plate. The captain locks up and topples.`,
            `{user} fires into {victim}'s gauntlets, and they short out with the captain still inside them.`
        ],
        field_captain: [
            `{user}'s spark catches {victim} mid-shout, and the captain drops with the sabre still raised.`,
            `{user} zaps the sabre, and the current runs straight up {victim}'s arm.`
        ],
        rebel_coordinator: [
            `{user}'s spark hits {victim}'s breaker hammer, and the piston fires backward into its owner.`,
            `{user} fires through the crack in {victim}'s faceplate. The coordinator drops.`
        ],
        operations_handler: [
            `{user}'s spark jumps into {victim}'s headset, and the handler goes down shrieking.`,
            `{user} fires a bolt into {victim}'s signal rifle, and the feedback flattens them.`
        ],
        division_chief: [
            `{user}'s spark slams into {victim}'s chest, and the chief finally drops to one knee, then the other.`,
            `{user} fires a bolt into the compliance blade, and the shock runs straight up {victim}'s arm.`
        ],
        rebellion_chief: [
            `{user}'s spark hits {victim}'s halberd, and the metal haft carries the current home.`,
            `{user} zaps {victim} square in the chest, and the rebel leader falls under the banner.`
        ],
        enforcer_the_architect: [
            `{user}'s spark slips past the prism's glare and hits {victim} in the heart of all that calm.`,
            `{user} fires a bolt into the prism, and {victim} takes every bit of the backlash.`
        ],
        enforcer_macro_hull: [
            `{user}'s spark hits {victim}'s fusion core at just the wrong angle, and the whole system crashes.`,
            `{user} zaps {victim}'s chest, and the giant's core flickers, gutters and dies.`
        ],
        enforcer_genisis: [
            `{user}'s spark catches {victim} mid-blur, and the perfect enforcer locks up and falls.`,
            `{user} fires a bolt that {victim} can't quite dodge, and {victim} drops, implants smoking.`
        ],
        rebel_garret_maxwell: [
            `{user}'s spark arcs into {victim}'s cannon, and the charge cell answers loudly.`,
            `{user} zaps {victim} square in the chest, and the demolitionist goes down in the dust.`
        ],
        rebel_levi_wicker: [
            `{user}'s spark finds {victim}'s failing mods, and they fail all at once.`,
            `{user} zaps {victim} mid-leap, and he lands in a twitching heap.`
        ],
        rebel_virgil_wesley: [
            `{user}'s spark hits the device on {victim}'s wrist, and the signal dies with a long electronic scream.`,
            `{user} zaps {victim}'s neurochip, and the rebellion's mastermind goes quiet.`
        ]
    },
    shadow_strike: {
        enforcer_soldier: [
            `{user} steps out of the dark behind {victim}, and the soldier never even turns around.`,
            `{user} vanishes, and {victim} spins to find them. The strike comes from the other side.`
        ],
        enforcer_drone: [
            `{user} drops out of the shadows above {victim} and drives it into the pavement.`,
            `{user} melts into the dark, and {victim}'s sensors lose them right before the hit.`
        ],
        rebel_initiate: [
            `{user} appears behind {victim} and ends it before the kid even knows anyone's there.`,
            `{user} slips out of a shadow and lays {victim} out with one strike.`
        ],
        rebel_field_tech: [
            `{user} steps out of the dark beside {victim} and buries a strike under the arm. The launcher drops.`,
            `{user} fades from sight, and {victim} swings the launcher around wildly. The strike lands from behind.`
        ],
        division_command: [
            `{user} drops out of the shadows behind {victim}, right where the uplink can't see.`,
            `{user} vanishes, and {victim}'s last order is to find them. Too late.`
        ],
        division_strategist: [
            `{user} steps out of a blind spot on {victim}'s holomap and ends the strategy session.`,
            `{user} disappears, reappears behind {victim}, and the railcaster clatters to the ground.`
        ],
        vanguard_captain: [
            `{user} melts into the dark and comes out right at the gap in {victim}'s back armor.`,
            `{user} vanishes, and {victim}'s gauntlets punch at empty air. The strike comes from behind.`
        ],
        field_captain: [
            `{user} slips out of the shadows behind {victim} mid-rally. The sabre drops.`,
            `{user} fades, and {victim} raises the sabre at the wrong shadow. The right one strikes.`
        ],
        rebel_coordinator: [
            `{user} steps out of the dark behind {victim}, and the breaker hammer never gets its swing.`,
            `{user} disappears, and {victim} spins with the hammer. The strike lands on the backswing.`
        ],
        operations_handler: [
            `{user} slips out of the shadows behind {victim} while they're looking through the scope.`,
            `{user} vanishes, and {victim}'s rifle beeps for a lock it never finds.`
        ],
        division_chief: [
            `{user} steps out of the dark, and {victim}'s compliance blade cuts nothing but air. The chief falls.`,
            `{user} disappears, then strikes {victim} from the blind side. Judgment, delivered.`
        ],
        rebellion_chief: [
            `{user} slips out of the shadows behind {victim}, and the halberd's sweep comes too late.`,
            `{user} melts into the dark, and {victim} falls without ever seeing the hit.`
        ],
        enforcer_the_architect: [
            `{user} steps out of the one shadow the prism couldn't light. {victim} goes down.`,
            `{user} fades into the dark, and {victim} turns the prism every way but the right one.`
        ],
        enforcer_macro_hull: [
            `{user} slips behind {victim}, and the strike lands right on the back of the core housing.`,
            `{user} vanishes under the maul's swing and comes out behind {victim}. The giant topples.`
        ],
        enforcer_genisis: [
            `{user} and {victim} both vanish. Only one of them comes back standing.`,
            `{user} beats {victim} at its own game, appearing behind it before it can blink.`
        ],
        rebel_garret_maxwell: [
            `{user} drops out of the dark beside {victim}'s cannon and puts the big man down.`,
            `{user} slips behind {victim}, where heavy artillery doesn't help.`
        ],
        rebel_levi_wicker: [
            `{user} steps out of the shadows behind {victim} mid-taunt. He doesn't get to finish.`,
            `{user} vanishes, and {victim} laughs, then stops laughing.`
        ],
        rebel_virgil_wesley: [
            `{user} slips out of the dark behind {victim}, out of reach of any whisper.`,
            `{user} disappears, and {victim}'s next word is never spoken.`
        ]
    },
    defensive_jab: {
        enforcer_soldier: [
            `{user} drives a short punch into {victim}'s chest plate. The plate caves in, and the soldier sits down inside it.`,
            `{user} jabs {victim} right where the armor already cracked, and the soldier folds around the fist.`
        ],
        enforcer_drone: [
            `{user} punches {victim} out of the air with one blunt jab to the casing. It hits the ground skidding.`,
            `{user} catches {victim} on a low pass, and the jab crumples its frame like a soda can.`
        ],
        rebel_initiate: [
            `{user} plants a short jab in {victim}'s stomach. The kid's breath goes out, and the rest of them follows it down.`,
            `{user} knocks {victim}'s guard aside with one punch and taps them with the next. {victim} doesn't get up.`
        ],
        rebel_field_tech: [
            `{user} jabs {victim} square in the battery pack strapped to their chest. It dies with a whine, and so does the fight.`,
            `{user} punches straight through the launcher's flimsy housing and into {victim} behind it.`
        ],
        division_command: [
            `{user} steps under {victim}'s outstretched arm and jabs them in the ribs. The orders turn into a gasp.`,
            `{user} punches the uplink right into {victim}'s chest. Neither of them works after that.`
        ],
        division_strategist: [
            `{user} slips past the railcaster's long barrel and jabs {victim} once. The strategist didn't account for close range.`,
            `{user} punches through the holomap like it's fog and drops {victim} standing behind it.`
        ],
        vanguard_captain: [
            `{user} jabs the same dented plate for the third time, and on the third time it gives. {victim} topples.`,
            `{user} finds the seam between {victim}'s chest plate and shoulder and drives a fist into it. The captain goes over.`
        ],
        field_captain: [
            `{user} jabs right through {victim}'s parry, and the captain sits down hard on the curb.`,
            `{user} punches {victim} in the sword arm, then the chest. The sabre falls first, then the captain.`
        ],
        rebel_coordinator: [
            `{user} jabs {victim} right in the old dent on their faceplate, and it gives way.`,
            `{user} punches {victim} under the hammer's handle as they wind up. The coordinator drops the hammer on their own foot, then falls.`
        ],
        operations_handler: [
            `{user} jabs {victim} on the side of the head, right through the headset. The handler drops.`,
            `{user} punches up under the signal rifle into {victim}'s chin.`
        ],
        division_chief: [
            `{user} takes a slash on the forearm to get close, then jabs {victim} hard in the sternum. The chief finally drops.`,
            `{user} punches through {victim}'s guard with a short, ugly jab. The compliance blade clatters on the pavement.`
        ],
        rebellion_chief: [
            `{user} steps inside the halberd and jabs {victim} under the ribs. The rebel leader folds over the haft.`,
            `{user} punches {victim} in the chest so hard the banner pole snaps behind them.`
        ],
        enforcer_the_architect: [
            `{user} walks through the glare and jabs {victim} in the chest. The founder sits down, looking honestly confused.`,
            `{user} punches {victim} once, plain and simple, and the man who designed the city falls over.`
        ],
        enforcer_macro_hull: [
            `{user} jabs the cracked plate over {victim}'s core. The core coughs, and the giant goes to his knees, then his face.`,
            `{user} drives a fist right into {victim}'s chest. For once, Macro Hull is the one who gets moved.`
        ],
        enforcer_genisis: [
            `{user} reads {victim}'s next dash and has a fist waiting at the end of it. {victim} runs right into it and drops.`,
            `{user} punches through {victim}'s perfect guard, and the perfect enforcer falls without a sound.`
        ],
        rebel_garret_maxwell: [
            `{user} slips past the cannon barrel and jabs {victim} in the gut. The big man sits down in his own rubble.`,
            `{user} punches {victim} in the chest, and he finally stops getting back up.`
        ],
        rebel_levi_wicker: [
            `{user} jabs {victim} mid-laugh, and his flickering mods go dark along with him.`,
            `{user} catches {victim} with a short punch he didn't see coming. For once he has nothing to say.`
        ],
        rebel_virgil_wesley: [
            `{user} jabs {victim} before the whispering can start, and he drops with a surprised little grunt.`,
            `{user} punches straight through {victim}'s calm, and the mastermind ends up on the ground for once.`
        ]
    },
    way_too_close: {
        enforcer_soldier: [
            `{user} shoves {victim} back so hard the soldier slams into the rising barrier and slides down it.`,
            `{user} plants a boot in {victim}'s chest, and the barrier catches the soldier on the way back.`
        ],
        enforcer_drone: [
            `{user} swats {victim} back into the barrier as it snaps up. The drone pops like a bug on a windshield.`,
            `{user} shoves {victim} away, and the barrier slices its rotors clean off.`
        ],
        rebel_initiate: [
            `{user} shoves {victim} back a step, and the kid trips over the base of the barrier and lies there.`,
            `{user} pushes {victim} away. "Too close, kid." The barrier knocks the last of the fight out of them.`
        ],
        rebel_field_tech: [
            `{user} shoves {victim} into the barrier, and the launcher on their back goes off against it.`,
            `{user} pushes {victim} back, and the jolt from the barrier fries every piece of salvage they're wearing.`
        ],
        division_command: [
            `{user} shoves {victim} back into the barrier. The uplink sparks, and so does the officer wearing it.`,
            `{user} pushes {victim} away hard, and the barrier rises right into the back of their head.`
        ],
        division_strategist: [
            `{user} shoves {victim} back into the barrier, and the strategist crumples against it.`,
            `{user} pushes {victim} away so hard the railcaster snaps in half against the wall of light.`
        ],
        vanguard_captain: [
            `{user} shoves {victim}, and all that armor hits the barrier with a crash that rattles windows. The captain stays down.`,
            `{user} plants a boot in {victim}'s chest, and the barrier snaps up just in time to stop the captain cold.`
        ],
        field_captain: [
            `{user} shoves {victim} back into the barrier mid-lunge, and the captain slumps against it.`,
            `{user} pushes {victim} away, and the sabre bounces off the barrier and back into its owner.`
        ],
        rebel_coordinator: [
            `{user} shoves {victim} back, and the breaker hammer hits the barrier first. The recoil takes the coordinator down.`,
            `{user} pushes {victim} away, and the barrier knocks the coordinator flat on their back.`
        ],
        operations_handler: [
            `{user} shoves {victim} into the barrier, and the headset shorts out with a pop.`,
            `{user} pushes {victim} back, and the handler crumples against the wall of light.`
        ],
        division_chief: [
            `{user} shoves {victim} back into the barrier. The chief kneels for the first time in a long career.`,
            `{user} pushes {victim} away, and the barrier delivers a verdict of its own.`
        ],
        rebellion_chief: [
            `{user} shoves {victim} back, and the barrier knocks the halberd loose. The chief goes down after it.`,
            `{user} pushes {victim} away, and the rebel leader slumps against the barrier.`
        ],
        enforcer_the_architect: [
            `{user} shoves {victim} back into the barrier, and the founder of Singularity crumples against something he didn't design.`,
            `{user} pushes {victim} away. "Way too close." The barrier agrees.`
        ],
        enforcer_macro_hull: [
            `{user} shoves {victim}, and the giant hits the barrier hard enough to crack it. He doesn't get up.`,
            `{user} pushes {victim} back, and the core in his chest sputters out against the barrier.`
        ],
        enforcer_genisis: [
            `{user} shoves {victim} back, and the barrier catches it in the middle of a dash.`,
            `{user} pushes {victim} away, and the perfect enforcer slumps against the wall of light.`
        ],
        rebel_garret_maxwell: [
            `{user} shoves {victim} back into the barrier, and the cannon goes off against it.`,
            `{user} pushes {victim} away, and the big man finally sits down.`
        ],
        rebel_levi_wicker: [
            `{user} shoves {victim} back, and he bounces off the barrier with a laugh that turns into a groan.`,
            `{user} pushes {victim} away, and his mods give out against the barrier.`
        ],
        rebel_virgil_wesley: [
            `{user} shoves {victim} back into the barrier, and the whispering stops.`,
            `{user} pushes {victim} away, and the mastermind slumps against the wall of light, out of words.`
        ]
    },
    charge: {
        enforcer_soldier: [
            `{user} barrels into {victim} at full speed, and the soldier ends up folded over the hood of a parked car.`,
            `{user} charges straight through {victim}'s guard. The baton goes one way, the helmet goes another, and the soldier stays where they land.`
        ],
        enforcer_drone: [
            `{user} charges {victim} just as it dips low and drives it straight into the pavement. It doesn't take off again.`,
            `{user} leaps into {victim} mid-charge, and the drone breaks apart on impact like a dropped toaster.`
        ],
        rebel_initiate: [
            `{user} charges {victim}, and the kid is flat on their back before the scream even comes out.`,
            `{user} runs right through {victim}. The scrap blade skids across the street, and the kid doesn't try to go after it.`
        ],
        rebel_field_tech: [
            `{user} charges {victim} launcher-first, and the whole contraption ends up wrapped around its owner.`,
            `{user} slams into {victim}, and a whole backpack of salvage explodes across the street in a cloud of springs and wires.`
        ],
        division_command: [
            `{user} charges through {victim}'s covering fire, takes every hit, and flattens the officer anyway.`,
            `{user} barrels into {victim}, and the uplink skitters away still trying to call for help.`
        ],
        division_strategist: [
            `{user} charges straight through the holomap and into {victim}. Neither the plan nor the planner was ready.`,
            `{user} closes the gap before the railcaster finishes charging. {victim} gets flattened mid-calculation.`
        ],
        vanguard_captain: [
            `{user} and {victim} hit each other at full speed like two trucks in an intersection. Only one of them gets up.`,
            `{user} lowers a shoulder and drives {victim} back step by step until the captain's feet go out from under them.`
        ],
        field_captain: [
            `{user} charges {victim} in the middle of a rallying cry, and the sabre goes spinning off into the gutter.`,
            `{user} barrels into {victim}, and the captain hits the ground so hard the whole line flinches.`
        ],
        rebel_coordinator: [
            `{user} charges {victim} before the breaker hammer comes all the way back, and the coordinator goes down under their own weapon.`,
            `{user} slams into {victim}, and the crash of all that scrap armor echoes down the street.`
        ],
        operations_handler: [
            `{user} charges {victim} while they're still peering through the scope. The signal rifle goes flying and so does the handler.`,
            `{user} barrels into {victim}, and the headset gets crushed between them.`
        ],
        division_chief: [
            `{user} puts everything into one last charge, and {victim} finally goes down. The compliance blade spins away across the pavement.`,
            `{user} takes a cut on the way in and doesn't slow down. {victim} gets driven into the ground.`
        ],
        rebellion_chief: [
            `{user} charges {victim}, and the chief and the banner go down together in a tangle of cloth and pole.`,
            `{user} slams into {victim}, and the halberd snaps clean in half between them.`
        ],
        enforcer_the_architect: [
            `{user} charges straight through the prism's glare with both eyes shut and flattens {victim}.`,
            `{user} barrels into {victim}, and the founder of Singularity learns what a bad day in the real world feels like.`
        ],
        enforcer_macro_hull: [
            `{user} charges {victim} at full speed. The giant finally topples, and the street shakes when he lands.`,
            `{user} slams into {victim}'s chest, and the core in it sputters on impact and goes dark.`
        ],
        enforcer_genisis: [
            `{user} charges {victim} right as it lands from a dash. There's no time to dodge, and it gets knocked flat.`,
            `{user} doesn't aim, just runs, and the sheer size of the charge leaves {victim} nowhere to go.`
        ],
        rebel_garret_maxwell: [
            `{user} charges {victim}, and the demolition chief goes down in a pile of his own rubble.`,
            `{user} slams into {victim}, and the cannon goes spinning off into a wall.`
        ],
        rebel_levi_wicker: [
            `{user} charges {victim} mid-taunt, and he goes flying with the rest of the joke stuck in his throat.`,
            `{user} slams into {victim}, and his failing mods give out completely on impact.`
        ],
        rebel_virgil_wesley: [
            `{user} charges {victim} before he can say a word, and the mastermind gets knocked flat on his back.`,
            `{user} slams into {victim}, and the whispering in everyone's head cuts off mid-sentence.`
        ]
    },
    flood_of_frost: {
        enforcer_soldier: [
            `{user} buries {victim} in a wave of ice, and the soldier freezes mid-step, baton still raised.`,
            `{user} blasts {victim} with frost until the visor fogs over, then frosts white. The soldier stops moving.`
        ],
        enforcer_drone: [
            `{user} freezes {victim}'s rotors solid, and it drops out of the sky like a stone.`,
            `{user} catches {victim} in a spray of ice, and it crashes into the street with a crunch.`
        ],
        rebel_initiate: [
            `{user} freezes {victim}'s feet to the ground, then the rest of them. The kid stops struggling.`,
            `{user} blasts {victim} with a wave of frost, and the kid goes down shivering, blade frozen to their hand.`
        ],
        rebel_field_tech: [
            `{user} freezes the launcher's barrel shut, and when {victim} pulls the trigger it blows up in their hands.`,
            `{user} buries {victim} in ice, and the salvage on their back freezes into one solid block.`
        ],
        division_command: [
            `{user} freezes {victim}'s uplink solid, then {victim} along with it. The orders stop.`,
            `{user} blasts {victim} with frost mid-order, and the officer goes stiff and topples over.`
        ],
        division_strategist: [
            `{user} freezes {victim} solid in the middle of a calculation. The holomap keeps flickering over a statue.`,
            `{user} buries {victim} in ice before the railcaster can fire, and the strategist cracks to the ground.`
        ],
        vanguard_captain: [
            `{user} freezes {victim}'s armor solid, and the captain topples like a frozen fridge.`,
            `{user} blasts {victim} with frost until the gauntlets lock up mid-punch and the captain falls forward.`
        ],
        field_captain: [
            `{user} freezes {victim} mid-rally, sabre still raised, mouth still open.`,
            `{user} buries {victim} in ice, and the captain's last order comes out as a puff of cold breath.`
        ],
        rebel_coordinator: [
            `{user} freezes the breaker hammer to {victim}'s hands, and the coordinator topples under its weight.`,
            `{user} blasts {victim} with frost, and the dented faceplate cracks right across the middle.`
        ],
        operations_handler: [
            `{user} freezes {victim}'s headset to their head, and the handler drops, shaking.`,
            `{user} buries {victim} in ice before the rifle can lock on. It beeps uselessly under the frost.`
        ],
        division_chief: [
            `{user} freezes {victim} solid, and the chief's verdict dies in a frozen mouth.`,
            `{user} blasts {victim} with frost until the chief finally kneels, then can't get back up.`
        ],
        rebellion_chief: [
            `{user} freezes {victim} mid-war-cry, and the uprising's loudest voice goes quiet.`,
            `{user} buries {victim} in ice, and the halberd falls out of numb fingers.`
        ],
        enforcer_the_architect: [
            `{user} freezes the prism solid, and the light inside it goes out. So does {victim}.`,
            `{user} buries {victim} in ice, and the founder of Singularity stops moving, still looking very calm.`
        ],
        enforcer_macro_hull: [
            `{user} freezes {victim}'s fusion core, and the giant topples with frost spreading across his chest.`,
            `{user} blasts {victim} with frost until the furnace in his chest goes cold, and he goes down with it.`
        ],
        enforcer_genisis: [
            `{user} freezes {victim} mid-dash, and the perfect enforcer stops perfectly still.`,
            `{user} buries {victim} in ice, and it falls over without a sound.`
        ],
        rebel_garret_maxwell: [
            `{user} freezes {victim}'s cannon solid, and the next shot backfires right in his face.`,
            `{user} blasts {victim} with frost until the big man drops into the rubble, shivering.`
        ],
        rebel_levi_wicker: [
            `{user} freezes {victim} mid-laugh, and his mods sputter out in the cold.`,
            `{user} buries {victim} in ice, and the grin on his face freezes along with the rest of him.`
        ],
        rebel_virgil_wesley: [
            `{user} freezes {victim} mid-sentence, and the rest of his argument is just a cloud of breath.`,
            `{user} buries {victim} in ice, and the whispering in everyone's head goes still.`
        ]
    },
    battery_drain: {
        enforcer_soldier: [
            `{user} drains every volt out of {victim}'s armor, and the soldier collapses inside a suddenly very heavy suit.`,
            `{user} pulls the charge out of {victim}'s baton and then out of {victim}. The soldier sags to the ground.`
        ],
        enforcer_drone: [
            `{user} drains {victim}'s battery dry, and it drifts down to the pavement like a dropped leaf.`,
            `{user} sucks the power out of {victim}, and its red eye fades to nothing.`
        ],
        rebel_initiate: [
            `{user} drains the cheap implant behind {victim}'s ear, and the kid passes out mid-swing.`,
            `{user} pulls the energy out of {victim}, and they sit down hard, too tired to stand.`
        ],
        rebel_field_tech: [
            `{user} drains {victim}'s launcher dry, then keeps pulling. The field tech goes down with it.`,
            `{user} pulls the power out of every battery {victim} is carrying, and the tech crumples under the dead weight.`
        ],
        division_command: [
            `{user} drains {victim}'s uplink, and the officer goes dark right along with the screen.`,
            `{user} pulls the charge out of {victim}'s implants, and the orders stop mid-word.`
        ],
        division_strategist: [
            `{user} drains the railcaster just as it finishes charging, then pulls the rest out of {victim}.`,
            `{user} pulls the energy out of {victim}'s holomap, and the strategist collapses in the dark.`
        ],
        vanguard_captain: [
            `{user} drains {victim}'s gauntlets dry, and the dead weight drags the captain down to the pavement.`,
            `{user} pulls every bit of power out of {victim}'s armor, and it locks up with the captain inside it.`
        ],
        field_captain: [
            `{user} drains {victim} in the middle of the rally, and the captain sags to the ground.`,
            `{user} pulls the power out of {victim}, and the sabre clatters out of a limp hand.`
        ],
        rebel_coordinator: [
            `{user} drains the piston in {victim}'s breaker hammer, then the coordinator. Both go still.`,
            `{user} pulls the energy out of {victim}, and the coordinator slumps forward over the hammer's handle.`
        ],
        operations_handler: [
            `{user} drains {victim}'s rifle and headset at the same time, and the handler goes down in sudden silence.`,
            `{user} pulls the charge out of {victim}, and the stolen comms die mid-word.`
        ],
        division_chief: [
            `{user} drains the compliance blade until it stops humming, then drains {victim} until the chief stops standing.`,
            `{user} pulls the energy out of {victim}, and the chief finally sinks to one knee.`
        ],
        rebellion_chief: [
            `{user} drains {victim}, and the rebel leader drops right under the banner.`,
            `{user} pulls the power out of {victim}, and the war cry fades into a tired sigh.`
        ],
        enforcer_the_architect: [
            `{user} drains the prism of every scrap of light, then drains {victim}. The founder goes dark.`,
            `{user} pulls the energy out of {victim}'s neurochip, and the man who built the city sits down in it.`
        ],
        enforcer_macro_hull: [
            `{user} drains {victim}'s fusion core dry. The furnace in his chest goes cold, and the giant topples.`,
            `{user} pulls the power out of {victim}'s chest and hands it to someone who needs it more.`
        ],
        enforcer_genisis: [
            `{user} drains {victim}'s implants, and the perfect enforcer stops mid-motion.`,
            `{user} pulls the energy out of {victim}, and it drops like a puppet with cut strings.`
        ],
        rebel_garret_maxwell: [
            `{user} drains {victim}'s cannon, then {victim}. The demolition chief slumps against a wall.`,
            `{user} pulls the power out of {victim}, and the big man finally lies down.`
        ],
        rebel_levi_wicker: [
            `{user} drains {victim}'s failing mods, and he drops before they can fail on their own.`,
            `{user} pulls the energy out of {victim}, and he runs out of jokes and strength at the same time.`
        ],
        rebel_virgil_wesley: [
            `{user} drains {victim}'s device, and the whispering stops all at once.`,
            `{user} pulls the power out of {victim}, and the mastermind goes dark mid-thought.`
        ]
    }
};
