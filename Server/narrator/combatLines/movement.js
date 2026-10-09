// Moving, ten lines per character and enemy: four advancing on the nearest foe ({other}), three
// backing away from one ({other}), three falling in beside a teammate ({other}). {user} moves.

export const MOVEMENT = {
    // ----- The party -----
    offensive_tank_1: { // Shipment
        advance: [
            `{user} walks straight at {other}, hammer swinging loose at his side.`,
            `{user} cracks his neck and heads for {other}, in no hurry at all.`,
            `{user} shoulders a busted crate out of his way on the path to {other}.`,
            `{user} closes in on {other}, and nobody standing in between seems to want to be there anymore.`
        ],
        retreat: [
            `{user} backs off from {other} one heavy step at a time, never once turning around.`,
            `{user} gives {other} some ground, and he clearly hates every inch of it.`,
            `{user} eases away from {other} with the hammer still up, just in case they get brave.`
        ],
        regroup: [
            `{user} plants himself next to {other} and folds his arms, which is somehow a threat.`,
            `{user} lumbers over beside {other} so nobody gets any ideas.`,
            `{user} takes up a spot at {other}'s shoulder, the same way he used to stand guard on a loading dock.`
        ]
    },
    defensive_tank_2: { // E.N.C.A.G.E
        advance: [
            `{user} marches toward {other}, every step exactly the same length as the last.`,
            `{user}'s optics narrow on {other} as it moves in, shield first.`,
            `{user} closes the gap to {other}, the taser shield humming louder the nearer it gets.`,
            `{user} recalculates, decides {other} is the problem, and walks over to solve it.`
        ],
        retreat: [
            `{user} withdraws from {other} with the shield angled to cover every inch of the retreat.`,
            `{user} steps back from {other} and resets its stance, servos whining.`,
            `{user} gives ground to {other} without once lowering the shield.`
        ],
        regroup: [
            `{user} moves to {other}'s side and raises the shield over both of them.`,
            `{user} repositions next to {other}, putting its own frame between them and the worst of it.`,
            `{user} falls back to {other}, scanning the field over their head.`
        ]
    },
    spellcaster_dps_1: { // Gene Shock
        advance: [
            `{user} edges toward {other}, the fusion cores under their skin glowing brighter with every step.`,
            `{user} walks up on {other} with the ray gun warm in their grip and a very focused look.`,
            `{user} moves in on {other}, sparks crawling up both forearms.`,
            `{user} heads for {other}, already working out where the next shot should land.`
        ],
        retreat: [
            `{user} slips back from {other}, keeping a careful distance.`,
            `{user} retreats from {other}, muttering a correction to some calculation only they can see.`,
            `{user} puts space between themself and {other}, cores dimming down to a low simmer.`
        ],
        regroup: [
            `{user} ducks in beside {other}, still giving off a faint smell of ozone.`,
            `{user} slides over to {other}, close enough to share cover and keep both hands free.`,
            `{user} falls in near {other} and checks the charge on the ray gun.`
        ]
    },
    aggressive_dps_2: { // Leo
        advance: [
            `{user} cuts across the ground toward {other}, sword low and quiet at his hip.`,
            `{user} stalks in on {other}, light on his feet and in no mood to waste a step.`,
            `{user} closes the gap to {other} with the easy confidence of somebody who's done this a hundred times.`,
            `{user} slips between two pieces of cover and comes out much closer to {other}.`
        ],
        retreat: [
            `{user} backs away from {other}, eyes never leaving his mark.`,
            `{user} slides out of {other}'s reach, already planning a better angle.`,
            `{user} gives {other} a little room and lets them think it was their idea.`
        ],
        regroup: [
            `{user} drifts over beside {other}, sword dimmed but ready.`,
            `{user} falls in near {other} and nods once, the way his old crew used to.`,
            `{user} slips in at {other}'s back without a word.`
        ]
    },
    traditional_warrior_dps_3: { // Last Legion
        advance: [
            `{user} pumps the shotgun and walks toward {other}, same as any breach he ever ran.`,
            `{user} pushes up on {other} in short, practiced bounds, cover to cover.`,
            `{user} moves in on {other}, counting the old breach count under his breath.`,
            `{user} advances on {other} with the shotgun tucked tight and his eyes on the doorways.`
        ],
        retreat: [
            `{user} falls back from {other} by the book, covering every inch he gives up.`,
            `{user} steps back from {other} and thumbs fresh shells into the shotgun, unbothered.`,
            `{user} withdraws from {other} like he's seen this exact mess go wrong before.`
        ],
        regroup: [
            `{user} posts up next to {other} the way he used to stack up on a door.`,
            `{user} moves over to cover {other}, scanning the exits out of habit.`,
            `{user} takes position at {other}'s shoulder and grunts something that might be encouragement.`
        ]
    },
    healing_support_1: { // Patchwork
        advance: [
            `{user} edges toward {other} while his drone buzzes ahead, way more eager than he is.`,
            `{user} hustles closer to {other}, clutching his toolkit and hoping this is a good idea.`,
            `{user} creeps up on {other} as the drone circles overhead, scanning everything it can find.`,
            `{user} moves in toward {other}, thumbing new instructions into the drone's controller.`
        ],
        retreat: [
            `{user} scrambles back from {other}, the drone covering his retreat with an anxious whine.`,
            `{user} backs away from {other}, deciding that distance is also a kind of strategy.`,
            `{user} retreats from {other} and mutters an apology to the drone for the rough flying.`
        ],
        regroup: [
            `{user} hurries to {other}'s side, already running a scan on them.`,
            `{user} slides in beside {other}, his drone settling into a lazy loop over both of them.`,
            `{user} jogs over to {other}, toolkit rattling, ready to fix whatever breaks next.`
        ]
    },
    offensive_support_2: { // Livewire
        advance: [
            `{user} struts toward {other} with his guitar slung low, playing to a crowd that isn't there.`,
            `{user} walks up on {other} tapping a rhythm out on the strings.`,
            `{user} saunters toward {other}, humming the opening of a song nobody asked for.`,
            `{user} heads for {other} with a grin that says the loud part's coming up.`
        ],
        retreat: [
            `{user} backs away from {other}, holding the guitar up in front of him like it can stop anything.`,
            `{user} retreats from {other} with a wince and one muted chord.`,
            `{user} gives {other} some room, the way a busker packs up fast when the cops show.`
        ],
        regroup: [
            `{user} drifts over to {other}, still nodding along to a beat only he can hear.`,
            `{user} sidles up next to {other} and flashes them a quick grin.`,
            `{user} falls in beside {other}, fingers resting on the strings and ready.`
        ]
    },
    jack_of_all_trades_support_3: { // True North
        advance: [
            `{user} moves toward {other} with her chin up, steady and unhurried.`,
            `{user} advances on {other}, energy curling around her fingers.`,
            `{user} pushes forward toward {other}, calm and deliberate.`,
            `{user} walks straight at {other} without a speech or a war cry, just her.`
        ],
        retreat: [
            `{user} steps back from {other} without panic, eyes up, guard higher.`,
            `{user} withdraws from {other}, counting the exits like she always does.`,
            `{user} gives {other} ground the way she was trained to: slowly, and never all of it at once.`
        ],
        regroup: [
            `{user} hurries to {other}, already checking them for wounds.`,
            `{user} moves to {other}'s side and quietly covers the angle they can't watch.`,
            `{user} falls in next to {other}, steady enough for the both of them.`
        ]
    },
    hacker_support_4: { // Ghost Shell
        advance: [
            `{user} drifts toward {other} with his laptop open, typing without looking down.`,
            `{user} slinks closer to {other}, cracking his knuckles between keystrokes.`,
            `{user} edges up on {other}, the screen's glow lighting up a very satisfied smirk.`,
            `{user} moves in on {other}, already three layers deep in something that doesn't belong to him.`
        ],
        retreat: [
            `{user} slips away from {other} so quietly that it takes a second to notice he's gone.`,
            `{user} backs away from {other}, laptop hugged close to his chest.`,
            `{user} retreats from {other} with his eyes still on the screen, trusting his feet to know the way.`
        ],
        regroup: [
            `{user} drifts over to {other} and sets up shop in their shadow.`,
            `{user} ducks in behind {other}, using them as a very expensive firewall.`,
            `{user} slides in beside {other}, fingers still flying across the keys.`
        ]
    },

    // ----- Enforcers and the Division -----
    enforcer_soldier: {
        advance: [
            `{user} marches on {other}, shock baton sparking with a fresh charge.`,
            `{user} advances on {other} in lockstep with orders piped straight into the helmet.`,
            `{user} bears down on {other}, visor lit and baton raised.`,
            `{user} pushes toward {other}, boots hitting the pavement in perfect rhythm.`
        ],
        retreat: [
            `{user} falls back from {other} and calls something short into the radio.`,
            `{user} withdraws from {other} in a careful, by-the-manual retreat.`,
            `{user} backs away from {other}, baton held out to keep the distance.`
        ],
        regroup: [
            `{user} forms up beside {other}, armor plates clacking together.`,
            `{user} closes ranks with {other} and the formation snaps back into shape.`,
            `{user} falls in at {other}'s flank without being told twice.`
        ]
    },
    enforcer_drone: {
        advance: [
            `{user} glides toward {other}, rotors whining as it locks on.`,
            `{user} hums closer to {other}, a red targeting light sweeping back and forth.`,
            `{user} swoops in on {other} with a chirp that sounds almost pleased.`,
            `{user} drifts toward {other}, its carbine twitching to follow every move they make.`
        ],
        retreat: [
            `{user} pulls back from {other}, climbing out of reach with a mechanical whir.`,
            `{user} retreats from {other} in tidy, calculated arcs.`,
            `{user} rises and drifts away from {other}, recalculating.`
        ],
        regroup: [
            `{user} hovers over to {other} and the two of them trade targeting data in a burst of static.`,
            `{user} takes up a flanking orbit near {other}.`,
            `{user} glides in beside {other}, rotor wash kicking grit into the air.`
        ]
    },
    division_command: {
        advance: [
            `{user} advances on {other} with orders flashing across a wrist display.`,
            `{user} pushes toward {other} while barking coordinates into the uplink.`,
            `{user} strides at {other} with the irritation of a manager whose report is overdue.`,
            `{user} moves on {other}, eyes flicking between the target and a stream of data.`
        ],
        retreat: [
            `{user} falls back from {other} to a better vantage point, still issuing orders.`,
            `{user} withdraws from {other} and refreshes the tactical feed.`,
            `{user} steps back from {other} and starts redrawing the whole engagement.`
        ],
        regroup: [
            `{user} moves to {other}'s position and starts pointing at things.`,
            `{user} regroups with {other}, pinging their location to the entire Division.`,
            `{user} falls in near {other} to tighten up the chain of command.`
        ]
    },
    division_strategist: {
        advance: [
            `{user} advances on {other}, the railcaster whining as it charges.`,
            `{user} edges toward {other}, plotting firing lines nobody else can see.`,
            `{user} steps toward {other} with the cold patience of a chess player three moves ahead.`,
            `{user} moves up on {other}, a holographic map flickering at eye level.`
        ],
        retreat: [
            `{user} pulls away from {other}, choosing distance over courage.`,
            `{user} retreats from {other} to a cleaner line of fire.`,
            `{user} withdraws from {other}, never once looking hurried.`
        ],
        regroup: [
            `{user} moves in behind {other} and lines up shots over their shoulder.`,
            `{user} regroups with {other} and murmurs a correction to their footing.`,
            `{user} slides in near {other}, resting the railcaster across one arm.`
        ]
    },
    vanguard_captain: {
        advance: [
            `{user} rumbles toward {other}, siege gauntlets grinding with every clench.`,
            `{user} bulls straight at {other}, the pavement cracking under armored boots.`,
            `{user} advances on {other}, gauntlets glowing hot at the knuckles.`,
            `{user} marches on {other} and doesn't bother walking around anything in the way.`
        ],
        retreat: [
            `{user} grudgingly backs away from {other}, gauntlets still raised.`,
            `{user} retreats from {other} with heavy, deliberate steps.`,
            `{user} gives ground to {other}, looking for all the world like this is only a breather.`
        ],
        regroup: [
            `{user} moves to shield {other}, a wall of armor sliding into place.`,
            `{user} plants both boots beside {other} and dares anyone to try.`,
            `{user} falls back to {other}, gauntlets crossed in front of them both.`
        ]
    },
    field_captain: {
        advance: [
            `{user} advances on {other}, sabre drawn and gleaming.`,
            `{user} strides toward {other} with the posture of someone who expects to be saluted.`,
            `{user} closes on {other}, sabre angled for the first cut.`,
            `{user} pushes up on {other}, shouting for the line to follow.`
        ],
        retreat: [
            `{user} withdraws from {other} in a disciplined retreat.`,
            `{user} steps back from {other}, sabre held en garde.`,
            `{user} falls back from {other}, regrouping straight out of a training manual.`
        ],
        regroup: [
            `{user} moves to {other}'s side and straightens the line.`,
            `{user} regroups with {other} and points the sabre at the next target.`,
            `{user} falls in beside {other} with a barked command to hold.`
        ]
    },
    division_chief: {
        advance: [
            `{user} walks toward {other} with the slow certainty of a verdict that's already been written.`,
            `{user} advances on {other}, the compliance blade humming a low note.`,
            `{user} closes on {other}, clearly planning to deliver the sentence personally.`,
            `{user} bears down on {other} without hurrying, because the Division never hurries.`
        ],
        retreat: [
            `{user} takes a measured step back from {other}, as if granting a short recess.`,
            `{user} withdraws from {other} to review the situation, blade still drawn.`,
            `{user} gives {other} some ground, eyes narrowed in plain disapproval.`
        ],
        regroup: [
            `{user} steps in beside {other} and takes command of the line.`,
            `{user} moves to {other}'s side, a silent signal to hold.`,
            `{user} falls in with {other}, the compliance blade raised over both of them.`
        ]
    },
    enforcer_the_architect: {
        advance: [
            `{user} drifts toward {other}, the prism in his hand bending the light around every step.`,
            `{user} advances on {other} with the calm of a teacher walking over to a student who won't sit down.`,
            `{user} steps toward {other}, and the drones overhead tilt to follow.`,
            `{user} closes on {other}, the prism humming as it gathers light off every screen on the street.`
        ],
        retreat: [
            `{user} withdraws from {other} without any sign of concern, as if this were all on the schedule.`,
            `{user} steps back from {other}, adjusting the angle of the prism thoughtfully.`,
            `{user} gives {other} a little room, with the patience of a man who designed the room.`
        ],
        regroup: [
            `{user} moves beside {other} and quietly corrects their stance.`,
            `{user} drifts to {other}'s position, the prism throwing a blinding glare in front of them.`,
            `{user} falls in with {other}, composed, hands folded behind his back.`
        ]
    },
    enforcer_macro_hull: {
        advance: [
            `{user} lumbers toward {other}, the fusion core in his chest roaring like a furnace.`,
            `{user} stomps at {other}, dragging the maul behind him and leaving a trail of sparks.`,
            `{user} advances on {other} with a booming laugh that rattles the windows.`,
            `{user} thunders toward {other}, and every step shakes loose a little more of the street.`
        ],
        retreat: [
            `{user} backs away from {other}, the core in his chest dimming to a sulky glow.`,
            `{user} grudgingly retreats from {other}, grumbling about wasted energy.`,
            `{user} steps back from {other} and lets the maul rest on one huge shoulder.`
        ],
        regroup: [
            `{user} stomps over to {other}'s side and the ground complains the whole way.`,
            `{user} moves over to {other} and claps them on the back hard enough to bruise.`,
            `{user} plants himself beside {other}, maul ready to swat anything that gets close.`
        ]
    },
    enforcer_genisis: {
        advance: [
            `{user} is suddenly closer to {other}, with no visible footsteps in between.`,
            `{user} glides toward {other}, both blades held loose and almost polite.`,
            `{user} advances on {other} with an apologetic tilt of the head that's somehow worse than a threat.`,
            `{user} drifts toward {other}, perfectly silent and perfectly balanced.`
        ],
        retreat: [
            `{user} steps back from {other} in a single smooth motion.`,
            `{user} withdraws from {other}, blades folding back as if bowing out.`,
            `{user} gives ground to {other} with eerie, practiced grace.`
        ],
        regroup: [
            `{user} appears at {other}'s side as if it had always been standing there.`,
            `{user} glides over to {other} and takes up a guard position without a sound.`,
            `{user} falls in next to {other}, blades low and patient.`
        ]
    },

    // ----- The Rebellion -----
    rebel_initiate: {
        advance: [
            `{user} rushes at {other}, scrap blade raised and fear barely held in check.`,
            `{user} charges toward {other} with a shout that cracks halfway through.`,
            `{user} darts toward {other}, running on a lot more nerve than training.`,
            `{user} scrambles toward {other}, gripping the scrap blade with both hands.`
        ],
        retreat: [
            `{user} stumbles back from {other}, breathing hard.`,
            `{user} retreats from {other}, glancing around for someone who knows what they're doing.`,
            `{user} backs away from {other}, the scrap blade shaking in a white-knuckled grip.`
        ],
        regroup: [
            `{user} runs to {other}'s side, clearly relieved not to be alone.`,
            `{user} regroups with {other}, whispering about a plan they never really had.`,
            `{user} falls in behind {other}, blade up but voice shaking.`
        ]
    },
    rebel_field_tech: {
        advance: [
            `{user} moves up on {other}, the arc launcher whining as it charges.`,
            `{user} advances on {other}, tightening a jury-rigged scope with a screwdriver on the way.`,
            `{user} edges toward {other}, a backpack of salvage clanking with every step.`,
            `{user} pushes toward {other}, loose wiring spitting sparks out of the launcher's housing.`
        ],
        retreat: [
            `{user} pulls back from {other}, cursing at the launcher's battery meter.`,
            `{user} retreats from {other} to find a better angle.`,
            `{user} scrambles back from {other}, the launcher bouncing on a frayed strap.`
        ],
        regroup: [
            `{user} drops in next to {other}, fiddling with a loose wire.`,
            `{user} regroups with {other}, swapping out a spent power cell on the move.`,
            `{user} hustles to {other}'s side and props the launcher on a makeshift bipod.`
        ]
    },
    rebel_coordinator: {
        advance: [
            `{user} lumbers at {other}, swinging the breaker hammer in slow, heavy arcs.`,
            `{user} advances on {other}, shouting directions to the rebels behind.`,
            `{user} bulls toward {other}, the hammer's head scraping sparks off the ground.`,
            `{user} pushes up on {other} with the whole cell's courage riding on it.`
        ],
        retreat: [
            `{user} backs off from {other}, hammer still raised for the next swing.`,
            `{user} retreats from {other} and waves the others into cover.`,
            `{user} pulls away from {other}, breathing hard behind a dented faceplate.`
        ],
        regroup: [
            `{user} sets up next to {other}, hammer resting on a shoulder.`,
            `{user} moves to {other}'s side, barking a rough plan through clenched teeth.`,
            `{user} regroups with {other} and points the hammer at the biggest target on the field.`
        ]
    },
    operations_handler: {
        advance: [
            `{user} advances on {other}, the signal rifle beeping as it finds a lock.`,
            `{user} pushes toward {other}, headset crackling with stolen Enforcer chatter.`,
            `{user} moves up on {other} with the rifle's scope flickering green.`,
            `{user} edges toward {other}, whispering coordinates into a hidden mic.`
        ],
        retreat: [
            `{user} retreats from {other}, the signal rifle still tracking.`,
            `{user} withdraws from {other} to keep the network alive.`,
            `{user} slides back from {other}, eyes never leaving the rifle's readout.`
        ],
        regroup: [
            `{user} links up with {other}, rerouting their comms on the fly.`,
            `{user} moves to {other}'s side, the rifle's antenna twitching.`,
            `{user} regroups with {other} and dials a new frequency into the headset.`
        ]
    },
    rebellion_chief: {
        advance: [
            `{user} advances on {other}, the halberd sweeping a wide warning arc.`,
            `{user} strides toward {other} with the whole uprising watching.`,
            `{user} pushes up on {other} under a ragged banner, halberd leveled.`,
            `{user} closes on {other} with a war cry the whole street can hear.`
        ],
        retreat: [
            `{user} pulls back from {other} and plants the halberd in the ground out of pure defiance.`,
            `{user} retreats from {other}, rallying the rebels with a single raised fist.`,
            `{user} steps away from {other}, eyes still bright and furious.`
        ],
        regroup: [
            `{user} moves to {other}'s side and grips their shoulder hard.`,
            `{user} regroups with {other}, the halberd held across them like a gate.`,
            `{user} falls in with {other} and says something low that makes them stand up straighter.`
        ]
    },
    rebel_garret_maxwell: {
        advance: [
            `{user} lumbers toward {other} with the cannon braced on his hip, steady as a dockside crane.`,
            `{user} pushes up on {other}, cannon humming and a slow smile on his face.`,
            `{user} advances on {other}, calling out to his crew as if this were just another job.`,
            `{user} walks at {other} with the cannon leveled and nothing left to prove.`
        ],
        retreat: [
            `{user} backs away from {other}, eyeing the nearest support pillar with professional interest.`,
            `{user} retreats from {other} and checks the cannon's charge with total calm.`,
            `{user} gives {other} some room, plainly thinking about taking down the building instead.`
        ],
        regroup: [
            `{user} moves to {other} and claps a heavy hand on their shoulder.`,
            `{user} falls in beside {other}, rumbling something reassuring about the plan.`,
            `{user} plants himself next to {other}, the cannon resting between them.`
        ]
    },
    rebel_levi_wicker: {
        advance: [
            `{user} bounces toward {other}, twirling his weapon with a grin on his face.`,
            `{user} saunters toward {other}, cracking a joke nobody laughs at.`,
            `{user} lunges toward {other}, his failing mods flaring bright for a second.`,
            `{user} sprints at {other} like he's got somewhere better to be after this.`
        ],
        retreat: [
            `{user} skips back from {other} with a mocking little bow.`,
            `{user} retreats from {other}, wincing as one of his mods misfires.`,
            `{user} backs away from {other}, laughing like it was all part of the plan.`
        ],
        regroup: [
            `{user} drifts over to {other} and throws an arm around them.`,
            `{user} falls in with {other}, spinning his weapon out of pure boredom.`,
            `{user} saunters over to {other}, whistling a tune that doesn't fit the moment at all.`
        ]
    },
    rebel_virgil_wesley: {
        advance: [
            `{user} walks toward {other}, and every neurochip in reach starts whispering at once.`,
            `{user} advances on {other} with a patient smile, as if this were a debate he's already won.`,
            `{user} moves closer to {other}, talking so softly that everyone leans in to listen.`,
            `{user} closes in on {other}, a hiss of static following him that sounds almost like words.`
        ],
        retreat: [
            `{user} steps back from {other}, unbothered, as if retreating were just another argument.`,
            `{user} withdraws from {other}, the device on his wrist humming a low warning.`,
            `{user} gives {other} some space, still smiling like he knows how this ends.`
        ],
        regroup: [
            `{user} moves to {other}'s side and murmurs something that steadies them.`,
            `{user} falls in with {other}, a quiet general among foot soldiers.`,
            `{user} regroups with {other}, fingers dancing over a wrist display.`
        ]
    }
};
