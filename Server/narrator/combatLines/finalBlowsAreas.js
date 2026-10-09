// Final blows from abilities that hit an area, or turn an enemy's own attack around:
// two lines per enemy. {user} is whoever used it, {victim} the enemy. A fireball's burn can
// finish someone a turn later, so its lines also work for the fire doing the work.

export const AREA_FINAL_BLOWS = {
    counter: {
        enforcer_soldier: [
            `{victim} swings the shock baton at {user}, and the whole charge comes straight back up the baton. The soldier drops, twitching.`,
            `{victim} hits {user} as hard as they can. Every bit of it bounces back, and the soldier ends up flat on the pavement wondering what happened.`
        ],
        enforcer_drone: [
            `{victim} opens fire on {user}, and its own shots ricochet back into its rotors. It spins down into the gutter.`,
            `{victim} locks on to {user} and fires. The blast turns around mid-air and the drone eats its own pulse.`
        ],
        rebel_initiate: [
            `{victim} slashes at {user} with everything they've got, and it all comes right back at them. The kid drops the blade and the fight at once.`,
            `{victim} lunges at {user}, and their own swing knocks them flat. {victim} lies there, staring at the sky, confused.`
        ],
        rebel_field_tech: [
            `{victim} fires the arc launcher at {user}, and the bolt bends back and finds its way home. The field tech goes down sizzling.`,
            `{victim} lands a shot on {user}, or thinks so, until the arc wraps around and fries the launcher and its owner.`
        ],
        division_command: [
            `{victim} calls a strike down on {user}. The blast rebounds, and the uplink calls one last strike on its own position.`,
            `{victim} fires at {user}, and the shot comes back to settle the account. The officer drops.`
        ],
        division_strategist: [
            `{victim} fires the railcaster at {user}, and the round comes back faster than it left. The strategist never calculated for that.`,
            `{victim} takes the perfect shot at {user}. It's perfect on the way back too.`
        ],
        vanguard_captain: [
            `{victim} drives both gauntlets into {user}, and the force comes straight back. The captain collapses inside their own armor.`,
            `{victim} throws a punch at {user} that could've cracked a wall. It cracks the captain instead.`
        ],
        field_captain: [
            `{victim} lunges at {user} with the sabre, and the cut comes back on its owner. The captain goes down hard.`,
            `{victim} lands a textbook strike on {user}, and the textbook hits right back.`
        ],
        rebel_coordinator: [
            `{victim} brings the breaker hammer down on {user}, and the piston kicks back into the coordinator's own chest.`,
            `{victim} swings at {user} with everything, and the swing comes home. The coordinator topples over.`
        ],
        operations_handler: [
            `{victim} fires the signal rifle at {user}, and the static comes screaming back through the headset. The handler drops.`,
            `{victim} gets a clean shot on {user}, and gets it right back, cleaner.`
        ],
        division_chief: [
            `{victim} brings the compliance blade down on {user}, and the sentence gets served on the judge instead.`,
            `{victim} strikes {user} with the full weight of the Division, and every ounce of it comes back. The chief kneels.`
        ],
        rebellion_chief: [
            `{victim} swings the halberd at {user}, and the blow comes right back down the haft. The rebel leader crumples.`,
            `{victim} charges {user} with a war cry, and the charge comes back twice as hard.`
        ],
        enforcer_the_architect: [
            `{victim} focuses the prism on {user}, and the light bends right back into its source. The founder goes down blinking.`,
            `{victim} fires a perfect beam at {user}. {user} sends it back, and {victim} learns what it feels like.`
        ],
        enforcer_macro_hull: [
            `{victim} brings the maul down on {user}, and the whole impact rebounds into the giant's own chest. His core gutters out.`,
            `{victim} hits {user} like a power plant. The power plant gets hit right back, and it finally goes dark.`
        ],
        enforcer_genisis: [
            `{victim} lands a flurry of cuts on {user}, and every single one comes back. The perfect enforcer drops, finally outdone by its own speed.`,
            `{victim} strikes {user} faster than anyone could follow, and the reflection is just as fast.`
        ],
        rebel_garret_maxwell: [
            `{victim} fires the breaker cannon at {user}, and the shell comes right back at him. He disappears in his own blast.`,
            `{victim} shells {user}, and the explosion turns around and takes the demolition chief down instead.`
        ],
        rebel_levi_wicker: [
            `{victim} lands a flashy strike on {user}, and it comes back flashier. He goes down laughing at himself.`,
            `{victim} swings at {user}, and his own blow knocks the last spark out of his mods.`
        ],
        rebel_virgil_wesley: [
            `{victim} pushes his signal into {user}'s head, and it comes right back into his own. The mastermind goes down screaming.`,
            `{victim} sends a jolt at {user}, and gets his own message back.`
        ]
    },
    emp: {
        enforcer_soldier: [
            `{user}'s pulse kills every light in {victim}'s armor, and the soldier collapses inside a dead suit.`,
            `{user} sets off the pulse, and {victim}'s baton and helmet fry together. The soldier drops in the sudden quiet.`
        ],
        enforcer_drone: [
            `{user}'s pulse washes over {victim}, and it falls out of the sky with every circuit dead.`,
            `{user} triggers the burst, and {victim} doesn't even get to spark. It just stops, and drops.`
        ],
        rebel_initiate: [
            `{user}'s pulse fries the cheap implant behind {victim}'s ear, and the kid crumples.`,
            `{user} sets off the burst, and {victim}'s budget cyberware gives out all at once.`
        ],
        rebel_field_tech: [
            `{user}'s pulse turns every piece of salvage on {victim} into smoking junk, and the field tech with it.`,
            `{user} sets off the burst, and {victim}'s launcher discharges into its owner on the way down.`
        ],
        division_command: [
            `{user}'s pulse kills {victim}'s uplink mid-order, and the officer drops like someone hit their off switch.`,
            `{user} triggers the burst, and {victim}'s implants shut down hard.`
        ],
        division_strategist: [
            `{user}'s pulse wipes out {victim}'s holomap and the strategist behind it.`,
            `{user} sets off the burst, and the railcaster dies in {victim}'s hands. So does their plan.`
        ],
        vanguard_captain: [
            `{user}'s pulse locks up every servo in {victim}'s armor, and the captain topples like a statue.`,
            `{user} triggers the burst, and {victim}'s gauntlets go dead weight. The captain goes down under them.`
        ],
        field_captain: [
            `{user}'s pulse fries {victim}'s comms mid-rally, and the captain drops.`,
            `{user} sets off the burst, and {victim}'s implant overloads. The sabre falls first.`
        ],
        rebel_coordinator: [
            `{user}'s pulse fries the hammer's piston and {victim} holding it.`,
            `{user} triggers the burst, and the cheap electronics in {victim}'s faceplate burst into smoke.`
        ],
        operations_handler: [
            `{user}'s pulse fries {victim}'s headset, rifle and implant in one go. The handler drops in silence.`,
            `{user} sets off the burst, and {victim}'s whole network goes dark, including them.`
        ],
        division_chief: [
            `{user}'s pulse kills the compliance blade and everything else {victim} is wearing. The chief falls.`,
            `{user} triggers the burst, and the Division's best equipment turns into dead metal on {victim}'s back.`
        ],
        rebellion_chief: [
            `{user}'s pulse fries {victim}'s gear, and the rebel leader drops under the banner.`,
            `{user} sets off the burst, and {victim}'s implants give out mid-war-cry.`
        ],
        enforcer_the_architect: [
            `{user}'s pulse kills the prism's light, and {victim} falls in the sudden dark.`,
            `{user} triggers the burst, and {victim} finds out how it feels when the network goes down.`
        ],
        enforcer_macro_hull: [
            `{user}'s pulse crashes {victim}'s fusion core, and the giant topples.`,
            `{user} sets off the burst, and the furnace in {victim}'s chest flickers out.`
        ],
        enforcer_genisis: [
            `{user}'s pulse shuts down every implant that rebuilt {victim}, and the perfect enforcer stops.`,
            `{user} triggers the burst, and {victim} drops mid-dash, all those systems dead at once.`
        ],
        rebel_garret_maxwell: [
            `{user}'s pulse kills the cannon's charge cell, and the backlash knocks {victim} flat.`,
            `{user} sets off the burst, and {victim}'s gear fries along with him.`
        ],
        rebel_levi_wicker: [
            `{user}'s pulse fries what's left of {victim}'s failing mods, and he drops mid-laugh.`,
            `{user} triggers the burst, and {victim}'s implants give out for good.`
        ],
        rebel_virgil_wesley: [
            `{user}'s pulse kills {victim}'s device, and the whispering in every skull stops at once.`,
            `{user} sets off the burst, and {victim}'s neurochip fries. He drops.`
        ]
    },
    executioners_judgment: {
        enforcer_soldier: [
            `{user} passes judgment, and {victim} buckles under a weight nobody can see. The soldier's knees hit the pavement first.`,
            `{user} brings a fist down, and {victim}'s armor groans like something heavy just sat on it. The soldier doesn't get back up.`
        ],
        enforcer_drone: [
            `{user}'s judgment slams {victim} out of the air and pins it flat to the street.`,
            `{user} pronounces the verdict, and {victim}'s frame crumples in on itself with a long metal whine.`
        ],
        rebel_initiate: [
            `{user}'s judgment falls, and {victim} sinks to the ground under it. Too young for that kind of weight.`,
            `{user} passes sentence, and {victim}'s legs simply quit. The scrap blade lands next to them with a clink.`
        ],
        rebel_field_tech: [
            `{user}'s judgment crushes {victim} flat, and a whole backpack of salvage flattens with them.`,
            `{user} brings the verdict down, and {victim}'s launcher crumples in their arms before they do.`
        ],
        division_command: [
            `{user} passes judgment on {victim}, and for once the Division is on the receiving end of a sentence.`,
            `{user}'s verdict lands, and {victim} goes down with the uplink still blinking for a response.`
        ],
        division_strategist: [
            `{user}'s judgment falls on {victim}, and the holomap flickers out over a strategist who never saw it coming.`,
            `{user} pronounces sentence, and {victim} folds up neatly, like a chair someone put away.`
        ],
        vanguard_captain: [
            `{user}'s judgment presses down on {victim} until all that heavy armor becomes the problem. The captain topples.`,
            `{user} passes sentence, and {victim}'s gauntlets hit the pavement first, dragging the captain down after them.`
        ],
        field_captain: [
            `{user}'s verdict lands in the middle of {victim}'s rally, and the captain drops to both knees.`,
            `{user} passes judgment, and {victim}'s sabre arm sags, then the rest of the captain follows it down.`
        ],
        rebel_coordinator: [
            `{user}'s judgment flattens {victim}, and the breaker hammer clatters across the street on its own.`,
            `{user} brings the verdict down, and {victim}'s dented faceplate dents a whole lot further.`
        ],
        operations_handler: [
            `{user}'s judgment falls, and {victim} drops with the headset still crackling stolen chatter into the dirt.`,
            `{user} passes sentence, and {victim} slumps over the signal rifle like it's suddenly made of lead.`
        ],
        division_chief: [
            `{user} passes judgment on the judge. {victim} kneels for the first time in a long career, then falls over.`,
            `{user}'s verdict lands, and {victim} looks almost offended to be sentenced by somebody else.`
        ],
        rebellion_chief: [
            `{user}'s judgment falls, and {victim} goes down right under the banner they carried in.`,
            `{user} passes sentence, and {victim}'s halberd slips out of shaking hands. The chief follows it.`
        ],
        enforcer_the_architect: [
            `{user} passes judgment on {victim}, and the man who built this city finally feels the weight of it.`,
            `{user}'s verdict crushes the light out of the prism, and {victim} sits down hard in the dark.`
        ],
        enforcer_macro_hull: [
            `{user}'s judgment drags {victim} down by inches. The giant fights it the whole way to the ground, and loses.`,
            `{user} passes sentence, and {victim}'s core flickers under the pressure until the big man topples.`
        ],
        enforcer_genisis: [
            `{user}'s judgment catches {victim} mid-dash and flattens the perfect enforcer mid-stride.`,
            `{user} passes sentence, and {victim} kneels, bows its head politely, and stays there.`
        ],
        rebel_garret_maxwell: [
            `{user}'s judgment falls, and {victim} sinks down into his own rubble.`,
            `{user} passes sentence, and {victim} finally sets the cannon down and lies down next to it.`
        ],
        rebel_levi_wicker: [
            `{user}'s judgment falls, and {victim} goes down mid-laugh. "Harsh," he wheezes from the ground.`,
            `{user} passes sentence, and {victim}'s failing mods choose that moment to fail completely.`
        ],
        rebel_virgil_wesley: [
            `{user}'s judgment falls, and {victim}'s best argument dies with his footing.`,
            `{user} passes sentence, and {victim} sits down, out of words for once.`
        ]
    },
    fireball: {
        enforcer_soldier: [
            `{user}'s fire catches in the seams of {victim}'s armor, and the soldier goes down trying to slap it out.`,
            `{user}'s fireball lands right on {victim}. When the smoke clears, the soldier is face down and the baton is melting.`
        ],
        enforcer_drone: [
            `{user}'s fireball swallows {victim} whole, and it falls out of the sky trailing flame like a shooting star.`,
            `{user}'s fire melts {victim}'s rotors into lumps, and it drops in a burning heap.`
        ],
        rebel_initiate: [
            `{user}'s fire catches the back of {victim}'s jacket, and the kid drops and rolls and doesn't get back up.`,
            `{user}'s fireball knocks {victim} flat, and the scrap blade glows red on the ground next to them.`
        ],
        rebel_field_tech: [
            `{user}'s fire finds the battery pack on {victim}'s back. It goes off with a loud, bright pop.`,
            `{user}'s fireball sets every scrap of salvage on {victim} burning at once, and the field tech goes down in the smoke.`
        ],
        division_command: [
            `{user}'s fire melts the uplink right onto {victim}'s wrist, and the officer drops screaming into the gutter.`,
            `{user}'s fireball lands on {victim}'s position, and the last order dissolves into smoke.`
        ],
        division_strategist: [
            `{user}'s fire burns straight through {victim}'s holomap and the strategist standing behind it.`,
            `{user}'s fireball catches {victim} mid-calculation. There's no plan for being on fire.`
        ],
        vanguard_captain: [
            `{user}'s fire turns {victim}'s heavy armor into an oven, and the captain finally topples.`,
            `{user}'s fireball wraps around {victim}, and the gauntlets glow cherry red before the captain goes down.`
        ],
        field_captain: [
            `{user}'s fire catches {victim}'s long coat, and the captain goes down slapping at the flames.`,
            `{user}'s fireball lands right in the middle of {victim}'s rally, and the captain is the first one to fall.`
        ],
        rebel_coordinator: [
            `{user}'s fire catches in the gaps of {victim}'s scrap armor, and the coordinator drops the hammer and then drops.`,
            `{user}'s fireball engulfs {victim}, and the breaker hammer's grip gets too hot to hold.`
        ],
        operations_handler: [
            `{user}'s fire melts {victim}'s headset into a lump, and the handler goes down clawing at it.`,
            `{user}'s fireball lands right on {victim}'s sniper nest, and nothing comes out of it but smoke.`
        ],
        division_chief: [
            `{user}'s fire burns through the chief's perfect composure, and {victim} finally goes down.`,
            `{user}'s fireball engulfs {victim}. The compliance blade hisses as it hits the wet pavement.`
        ],
        rebellion_chief: [
            `{user}'s fire takes the banner first, then {victim} holding it. Both go down in the same blaze.`,
            `{user}'s fireball engulfs {victim}, and the war cry ends in a cough.`
        ],
        enforcer_the_architect: [
            `{user}'s fire catches {victim}'s coat, and the founder goes down in a cloud of expensive smoke.`,
            `{user}'s fireball engulfs {victim}. The prism cracks in the heat, and the light in it dies.`
        ],
        enforcer_macro_hull: [
            `{user}'s fire gets into {victim}'s core housing, and the furnace in his chest finally overheats. The giant topples.`,
            `{user}'s fireball lands on {victim}, and for once something is hotter than he is.`
        ],
        enforcer_genisis: [
            `{user}'s fire catches {victim} mid-dash. The perfect enforcer stumbles for the first time today, and falls.`,
            `{user}'s fireball engulfs the whole space where {victim} was going to be. It doesn't come out the other side.`
        ],
        rebel_garret_maxwell: [
            `{user}'s fire sets off {victim}'s spare cannon charges, and the demolition chief goes down in his own fireworks.`,
            `{user}'s fireball engulfs {victim}, and the big man finally sits down in the flames.`
        ],
        rebel_levi_wicker: [
            `{user}'s fire catches {victim} mid-leap, and he lands rolling and doesn't get up.`,
            `{user}'s fireball engulfs {victim}, and the last of his mods fizzle out in the heat.`
        ],
        rebel_virgil_wesley: [
            `{user}'s fire takes the device on {victim}'s wrist first, then takes {victim}.`,
            `{user}'s fireball engulfs {victim}, and the whispering in every skull goes silent in the smoke.`
        ]
    }
};
