// Final blows from lingering and sweeping abilities: two lines per enemy. Poison, mist and
// phosphorus usually finish someone a turn or two after they were cast, so the lines describe the
// effect doing the work. {user} is whoever used it, {victim} the enemy.

export const LINGERING_FINAL_BLOWS = {
    poison_apple: {
        enforcer_soldier: [
            `{user}'s poison works its way under {victim}'s armor. The soldier fights it for a while, then sits down against a wall and stops.`,
            `{victim} staggers, retches inside the helmet, and goes down. {user}'s poison doesn't care about body armor.`
        ],
        enforcer_drone: [
            `{user}'s poison eats through {victim}'s wiring like acid, and the drone sputters and drops.`,
            `{victim}'s circuits corrode from the inside out where {user}'s poison landed. It falls with a sad little beep.`
        ],
        rebel_initiate: [
            `{user}'s poison catches up with {victim}. The kid goes pale, sways, and folds to the ground.`,
            `{victim} drops the scrap blade to clutch their stomach. {user}'s poison has done its quiet work.`
        ],
        rebel_field_tech: [
            `{user}'s poison finishes {victim} mid-repair, screwdriver still in hand.`,
            `{victim} slumps over the launcher, green around the lips. {user}'s poison won the race.`
        ],
        division_command: [
            `{user}'s poison reaches {victim} in the middle of an order, and the order turns into a cough that never stops.`,
            `{victim} sinks down beside the uplink, which keeps asking for status. {user}'s poison answers for them.`
        ],
        division_strategist: [
            `{user}'s poison is the one variable {victim} never planned for. The strategist collapses mid-calculation.`,
            `{victim}'s hands shake too hard to work the holomap, then stop shaking at all. {user}'s poison saw to that.`
        ],
        vanguard_captain: [
            `{user}'s poison seeps through every joint in {victim}'s armor until the captain topples like a rotten tree.`,
            `{victim} keeps swinging the gauntlets longer than anyone should, but {user}'s poison wins in the end.`
        ],
        field_captain: [
            `{user}'s poison catches up with {victim} mid-rally. The captain sways, coughs, and falls on the sabre.`,
            `{victim}'s orders slur, then stop. {user}'s poison has finished its sentence.`
        ],
        rebel_coordinator: [
            `{user}'s poison works through {victim}, and the coordinator slumps forward over the breaker hammer.`,
            `{victim} lifts the hammer one last time, and {user}'s poison makes sure it never comes down.`
        ],
        operations_handler: [
            `{user}'s poison reaches {victim}, and the handler slides down behind cover, rifle sliding after them.`,
            `{victim}'s aim drifts, then the rest of them drifts too. {user}'s poison takes the handler out of the fight.`
        ],
        division_chief: [
            `{user}'s poison does what no court could and brings {victim} to their knees. The chief doesn't get up.`,
            `{victim} refuses to fall for a long time. {user}'s poison is patient.`
        ],
        rebellion_chief: [
            `{user}'s poison catches up with {victim}, and the rebel leader leans on the halberd, then slides down it.`,
            `{victim}'s war cry turns into a wet cough. {user}'s poison has the last word.`
        ],
        enforcer_the_architect: [
            `{user}'s poison works through {victim} with the same patience {victim} always preached. The founder sits down and doesn't get up.`,
            `{victim} looks at the dark spreading under his skin like it's a flaw in the design. Then {user}'s poison drops him.`
        ],
        enforcer_macro_hull: [
            `{user}'s poison takes a long time to fell something as big as {victim}, but it gets there. The giant goes down groaning.`,
            `{victim}'s core keeps roaring while the rest of him gives out. {user}'s poison doesn't need the core.`
        ],
        enforcer_genisis: [
            `{user}'s poison works through {victim}, and she diagnoses it perfectly right before it drops her.`,
            `{victim} reaches for a syringe with one of her arms. {user}'s poison is faster.`
        ],
        rebel_garret_maxwell: [
            `{user}'s poison works through {victim}, and the old rebel lowers himself carefully onto the rubble.`,
            `{victim} sets the cannon-hammer down, wipes his mouth, and keels over. {user}'s poison finishes it.`
        ],
        rebel_levi_wicker: [
            `{user}'s poison catches up with {victim} mid-fight, and the young rebel's blades slow, then stop.`,
            `{victim} keeps fighting long after he should have stopped. {user}'s poison waits him out.`
        ],
        rebel_virgil_wesley: [
            `{user}'s poison reaches {victim} mid-throw, and the dagger drops from his hand. He follows it.`,
            `{victim} fights on through {user}'s poison, out of pure stubbornness, until he can't.`
        ]
    },
    toxic_mist: {
        enforcer_soldier: [
            `{victim}'s helmet filter clogs in {user}'s mist. The soldier claws at the visor and goes down coughing.`,
            `{user}'s green mist finds every gap in {victim}'s armor, and the soldier sinks down into it.`
        ],
        enforcer_drone: [
            `{user}'s mist eats through {victim}'s rotor bearings, and the drone grinds to a stop in mid-air and falls.`,
            `{victim} hovers in {user}'s mist one turn too long. Its casing corrodes and it drops into the cloud.`
        ],
        rebel_initiate: [
            `{victim} didn't bring a mask. {user}'s mist reminds them why that matters, and the kid collapses.`,
            `{user}'s mist rolls over {victim}, and the kid sinks into it coughing, then stops coughing.`
        ],
        rebel_field_tech: [
            `{user}'s mist gets into {victim}'s homemade rebreather, and the field tech goes down tearing it off.`,
            `{victim} stays in {user}'s cloud to finish one last repair. It's the last thing they finish.`
        ],
        division_command: [
            `{user}'s mist rolls over {victim}'s command post, and the officer collapses mid-order, choking.`,
            `{victim} calls for evac from inside {user}'s mist. Nobody gets there in time.`
        ],
        division_strategist: [
            `{user}'s mist creeps into {victim}'s carefully chosen position. Even the best plan has to breathe.`,
            `{victim} plots a way out of {user}'s cloud, but runs out of breath before the route.`
        ],
        vanguard_captain: [
            `{user}'s mist pools inside {victim}'s heavy armor, and the captain topples, coughing into a sealed helmet.`,
            `{victim} stands their ground in {user}'s mist. That was the mistake. The captain finally crashes down.`
        ],
        field_captain: [
            `{user}'s mist chokes off {victim}'s rally mid-shout, and the captain drops into the green.`,
            `{victim} waves the line forward through {user}'s mist, then goes down in it first.`
        ],
        rebel_coordinator: [
            `{user}'s mist leaks through the crack in {victim}'s faceplate, and the coordinator collapses over the hammer.`,
            `{victim} swings at the cloud like they can beat it. {user}'s mist doesn't flinch, and the coordinator does.`
        ],
        operations_handler: [
            `{user}'s mist rolls over {victim}'s hiding spot, and the handler comes stumbling out and falls.`,
            `{victim} holds the scope steady in {user}'s mist for one more breath. It's one too many.`
        ],
        division_chief: [
            `{user}'s mist settles around {victim}, and the chief finally kneels, coughing into a gloved hand.`,
            `{victim} refuses to step out of {user}'s cloud. The Division's stubbornness gets the better of the chief.`
        ],
        rebellion_chief: [
            `{user}'s mist swallows {victim}'s banner and the chief beneath it. Neither one comes back up.`,
            `{victim} tries to shout through {user}'s mist and gets a lungful for the trouble.`
        ],
        enforcer_the_architect: [
            `{user}'s mist curls around {victim}, who refuses to hurry out of it. The founder finally sinks down, still composed.`,
            `{victim}'s prism can bend light but not air. {user}'s mist drops him.`
        ],
        enforcer_macro_hull: [
            `{user}'s mist gets sucked straight into {victim}'s core vents, and the giant's furnace chokes and dies.`,
            `{victim} breathes in {user}'s mist like a bellows, and goes down just as loudly.`
        ],
        enforcer_genisis: [
            `{user}'s mist gets into {victim}'s lungs while her arms are busy, and the surgeon goes down coughing.`,
            `{victim} pulls a mask from her coat pocket a moment too late. {user}'s mist drops her.`
        ],
        rebel_garret_maxwell: [
            `{user}'s mist creeps up on {victim} while he's busy with the cannon-hammer. The old rebel keels over coughing.`,
            `{victim} has breathed worse near the fusion plants, he says. {user}'s mist proves him wrong.`
        ],
        rebel_levi_wicker: [
            `{user}'s mist catches {victim} standing still for once, and that's all it needs.`,
            `{victim} fights his way through {user}'s mist and comes out the other side on his knees.`
        ],
        rebel_virgil_wesley: [
            `{user}'s mist swallows {victim} mid-charge, and the rebellion's symbol stumbles out of it and falls.`,
            `{victim} throws blind into {user}'s cloud, and the cloud wins.`
        ]
    },
    vine_whip: {
        enforcer_soldier: [
            `{user}'s whip cracks across {victim}'s knees, and the soldier goes down in a clatter of armor.`,
            `{user} lashes the whip around {victim}'s helmet and yanks. The soldier hits the pavement face first.`
        ],
        enforcer_drone: [
            `{user}'s whip snaps around {victim}'s rotor arm and drags it out of the sky.`,
            `{user} cracks the whip, and the tip slices through {victim}'s housing. It drops in two pieces.`
        ],
        rebel_initiate: [
            `{user}'s whip catches {victim} across the shins, and the kid goes down hard.`,
            `{user} sweeps the whip low, and {victim} trips over it and doesn't try to get up.`
        ],
        rebel_field_tech: [
            `{user}'s whip snags the launcher's strap and swings it right into {victim}'s head.`,
            `{user} lashes {victim} across the backpack, and salvage spills everywhere as the tech goes down.`
        ],
        division_command: [
            `{user}'s whip wraps around {victim}'s uplink arm, and one sharp tug drops the officer.`,
            `{user} cracks the whip in {victim}'s face mid-order, and the order ends there.`
        ],
        division_strategist: [
            `{user}'s whip snatches the railcaster away, and the backswing catches {victim} on the way out.`,
            `{user} lashes through {victim}'s holomap and across the strategist's chest.`
        ],
        vanguard_captain: [
            `{user}'s whip wraps around {victim}'s ankles, and all that armor comes down like a dropped piano.`,
            `{user} cracks the whip in the gap under {victim}'s helmet, and the captain topples.`
        ],
        field_captain: [
            `{user}'s whip snaps the sabre out of {victim}'s hand, and the next crack drops the captain.`,
            `{user} lashes {victim} across the chest mid-rally, and the captain goes down.`
        ],
        rebel_coordinator: [
            `{user}'s whip tangles in the breaker hammer's head, and one yank swings the hammer back into {victim}.`,
            `{user} cracks the whip across {victim}'s faceplate, and the dent becomes a crack. The coordinator drops.`
        ],
        operations_handler: [
            `{user}'s whip snaps the signal rifle's antenna, then {victim}'s footing.`,
            `{user} lashes {victim} across the headset, and the handler goes down clutching an ear.`
        ],
        division_chief: [
            `{user}'s whip catches the compliance blade mid-swing and rips it away. The backlash drops {victim}.`,
            `{user} cracks the whip across {victim}'s legs, and the chief kneels against their will.`
        ],
        rebellion_chief: [
            `{user}'s whip wraps the halberd's shaft and yanks it, and {victim} with it, onto the pavement.`,
            `{user} lashes {victim} across the chest, and the rebel leader drops under the banner.`
        ],
        enforcer_the_architect: [
            `{user}'s whip cracks across {victim}'s wrist, the prism flies, and the founder goes down after it.`,
            `{user} sweeps the whip low, and {victim} trips over something no algorithm predicted.`
        ],
        enforcer_macro_hull: [
            `{user}'s whip wraps around {victim}'s legs. It takes everything {user} has to pull, but the giant comes down.`,
            `{user} cracks the whip right across {victim}'s core housing, and the glow in his chest sputters out.`
        ],
        enforcer_genisis: [
            `{user}'s whip snarls around two of {victim}'s mechanical arms and yanks her off balance. She falls into the rest.`,
            `{user} cracks the whip across {victim}'s arm joints, and the whole frame crumples.`
        ],
        rebel_garret_maxwell: [
            `{user}'s whip yanks the cannon-hammer's barrel sideways, and the next shot drops {victim} instead.`,
            `{user} lashes {victim} across the knees, and the old rebel sits down in his own rubble.`
        ],
        rebel_levi_wicker: [
            `{user}'s whip wraps one of {victim}'s blades and rips it away, and the backlash takes his feet.`,
            `{user} cracks the whip as {victim} lunges, and the young rebel goes down mid-stride.`
        ],
        rebel_virgil_wesley: [
            `{user}'s whip snaps a thrown dagger out of the air, then catches {victim}'s ankle as he dives for it.`,
            `{user} lashes {victim} across the chest, and the rebellion's best fighter drops.`
        ]
    },
    white_phospherus: {
        enforcer_soldier: [
            `{user}'s white fire burns through {victim}'s armor seals, and the soldier goes down in a cloud of smoke.`,
            `{victim} can't shake {user}'s phosphorus. It eats through the uniform, and the soldier finally drops.`
        ],
        enforcer_drone: [
            `{user}'s phosphorus burns through {victim}'s casing, and it falls out of the sky, still burning white.`,
            `{victim} spins, trying to shake the fire off. {user}'s phosphorus doesn't come off, and the drone crashes.`
        ],
        rebel_initiate: [
            `{user}'s phosphorus clings to {victim}'s jacket, and the kid goes down beating at the flames.`,
            `{victim} runs, and {user}'s fire runs with them, until the kid can't run anymore.`
        ],
        rebel_field_tech: [
            `{user}'s phosphorus finds {victim}'s battery pack, and the burn turns into a bang.`,
            `{victim} tries to smother {user}'s white fire with a scrap of tarp. The tarp catches too.`
        ],
        division_command: [
            `{user}'s phosphorus melts {victim}'s uplink, then {victim}'s resolve, then {victim}.`,
            `{victim} calls for evac through the smoke. {user}'s white fire burns through the call.`
        ],
        division_strategist: [
            `{user}'s phosphorus burns a hole through {victim}'s holomap and the plans in it.`,
            `{victim} calculates a dozen ways to stop burning. None of them work. {user}'s fire finishes the strategist.`
        ],
        vanguard_captain: [
            `{user}'s phosphorus burns into the joints of {victim}'s armor, and the captain topples with smoke pouring out.`,
            `{victim} stays in the fight far too long under {user}'s white fire, then crashes down at once.`
        ],
        field_captain: [
            `{user}'s phosphorus catches the captain's coat, and {victim} goes down mid-shout.`,
            `{victim} rallies the line through the white fire, but {user}'s phosphorus outlasts the rally.`
        ],
        rebel_coordinator: [
            `{user}'s phosphorus burns through {victim}'s scrap armor, and the coordinator drops the hammer and falls.`,
            `{victim} swings at the smoke, but {user}'s fire can't be hit. The coordinator goes down.`
        ],
        operations_handler: [
            `{user}'s phosphorus melts {victim}'s headset, and the handler collapses in a shower of white sparks.`,
            `{victim}'s hiding spot fills with {user}'s burning smoke, and the handler doesn't come out.`
        ],
        division_chief: [
            `{user}'s phosphorus burns away the chief's composure first, then the chief. {victim} finally falls.`,
            `{victim} stands in {user}'s white fire like it's beneath them. It isn't.`
        ],
        rebellion_chief: [
            `{user}'s phosphorus turns {victim}'s banner to ash, and the chief goes down beneath it.`,
            `{victim} keeps shouting through {user}'s fire until there's no breath left to shout with.`
        ],
        enforcer_the_architect: [
            `{user}'s white fire is brighter than anything {victim}'s prism can bend. The founder goes down, blinded and burning.`,
            `{victim} tries to redirect {user}'s fire, and finds out that some things don't take orders.`
        ],
        enforcer_macro_hull: [
            `{user}'s phosphorus burns straight into {victim}'s core housing, and the giant's furnace finally overheats.`,
            `{victim} roars through {user}'s white fire for a long time. Then the roar stops, and so does he.`
        ],
        enforcer_genisis: [
            `{user}'s phosphorus clings to {victim}'s white coat and her machinery, and the surgeon finally burns out.`,
            `{victim} cuts away the burning cloth with her own arms. {user}'s white fire keeps going, and so does she, until she can't.`
        ],
        rebel_garret_maxwell: [
            `{user}'s phosphorus reaches {victim}'s spare charges, and the old rebel goes up in his own fireworks.`,
            `{victim} has seen fusion fire before, the kind that took his parents. {user}'s white fire brings him down all the same.`
        ],
        rebel_levi_wicker: [
            `{user}'s phosphorus clings to {victim} however fast he moves, and the young rebel finally goes down.`,
            `{victim} keeps fighting through {user}'s white fire until his blades and his legs give out together.`
        ],
        rebel_virgil_wesley: [
            `{user}'s phosphorus catches {victim}'s scarf and won't let go, and the rebellion's symbol goes down burning.`,
            `{victim} tries to fight through {user}'s white fire. It isn't something you can fight.`
        ]
    }
};
