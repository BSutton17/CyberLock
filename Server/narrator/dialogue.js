// Personal dialogue, told inside the narration. Two kinds of moment:
//   - an NPC talking to the group turns to ONE party member and asks them something ('reply');
//   - the group is with an NPC and one party member gets to ask them something ('ask').
// Only that player chooses, but everyone sees the moment in the narration and the choices on
// screen. Each answer is a different approach, gets its own reaction, and starts its own thread
// in the story (`lead`): a patrol on the party's trail, a shortcut, a name, a favor owed. The
// narrator is told the threads and pays them off in later scenes; the NPC also remembers how
// they were treated.
//
// The pieces here are used by the offline narrator and whenever the AI can't write a moment of
// its own (see writeDialogue in storyEngine.js). Every moment offers a straight answer, a pushy
// one and a sly one, plus a special one when the player ranks a fitting attribute in their top
// three (a Politician can talk a guard around).
import { normalizeAttribute } from './decisions.js';

// How an answer changes the NPC's opinion of the party.
export const TONE_EFFECT = { honest: 1, skill: 2, sly: 0, defiant: -1, silent: 0 };

// {character} = the party member, {npc} = who they're talking to, {side}/{enemySide} = the sides.
// Every answer is a different approach (straight, pushing back, sly, or a skill) with its own
// reaction and its own `lead`: where the answer takes the story. Leads are written as something
// that's now true, so the narrator can pay them off later.
const EXCHANGES = [
    // ---- NPCs asking a party member ----
    {
        kind: 'reply',
        npc: 'A checkpoint guard',
        intro: 'A checkpoint guard steps into the party\'s path and looks straight at {character}. "Why are you here?"',
        honest: {
            text: 'We\'re just passing through.',
            reaction: 'The guard studies {character} a second longer than he needs to, then waves the party on. "Keep it that way."',
            lead: 'The checkpoint guard logged the party as harmless, so checkpoints further in wave them through without a second look.'
        },
        defiant: {
            text: 'It\'s none of your business.',
            reaction: 'The guard\'s hand drifts to his baton. "Everything here is my business." He lets them pass, but he says {character}\'s name into his radio.',
            lead: 'The checkpoint guard radioed {character}\'s name down the line, and Division patrols are watching for the party now.'
        },
        sly: {
            text: 'Asking for a friend? Here, for your trouble.',
            told: '{character} folds a few credits into a handshake.',
            reaction: 'The guard pockets the credits without looking down and leans in. "East gate after midnight. Nobody checks it."',
            lead: 'A bribed checkpoint guard told the party the east gate goes unwatched after midnight.'
        },
        skills: {
            politician: { text: 'We came to save someone.', reaction: 'Something in the guard\'s face softens. "Then go save them," he says quietly, and looks the other way.', lead: 'The checkpoint guard has a cousin in the same kind of trouble, and quietly offered to help the party if they ever need a door opened.' },
            intimidation: { text: 'You really want to find out?', reaction: 'The guard swallows and steps aside. He won\'t forget {character}\'s face, but he won\'t stop them either.', lead: 'Rumors spread among the guards that {character} is someone you don\'t stop, which makes some of them nervous and some of them eager.' },
            crook: { text: 'Delivery. Check the manifest.', reaction: 'The guard squints at a manifest that didn\'t exist a minute ago, shrugs, and stamps it.', lead: 'The party now holds a stamped delivery manifest that gets them past any checkpoint, until someone checks the cargo.' }
        }
    },
    {
        kind: 'reply',
        npc: 'Ines Calder',
        intro: 'Ines Calder catches {character} by the sleeve before they can leave. "Do you even know who you\'re fighting for?"',
        honest: { text: 'Not really. We\'re figuring it out.', reaction: '"Good," Ines says. "The ones who are sure scare me more."', lead: 'Ines Calder decided the party can be trusted with what she saw, and plans to find them again soon.' },
        defiant: { text: 'We know enough.', reaction: 'Ines shakes her head slowly. "That\'s what they all say, right before they find out."', lead: 'Ines Calder went looking for someone else to tell what she saw, and the wrong people may find her first.' },
        sly: { text: 'Who do you think we\'re fighting for?', reaction: 'Ines narrows her eyes, then answers anyway: "For whoever pays. Prove me wrong." She tucks a data chip into {character}\'s pocket and walks off.', lead: 'Ines Calder slipped {character} an encrypted data chip that nobody has opened yet.' },
        skills: {
            scholar: { text: 'Better than they know themselves.', reaction: 'Ines laughs, surprised. "Then maybe you\'ll be the ones who tell the truth about all this."', lead: 'Ines Calder wants the party to make the truth about the bombing public, and will help if they do.' },
            detective: { text: 'We know who set off the bomb.', reaction: 'Ines goes very still. "Then be careful who you tell," she whispers.', lead: 'Ines Calder confirmed the bomb came from outside the market, and named a van the party can now track down.' },
            medic: { text: 'We\'re fighting for the people who get hurt.', reaction: 'Ines squeezes {character}\'s arm. "Then you\'re on the right side, whatever flag you\'re under."', lead: 'Ines Calder sent word to the street clinics that the party are friends, and they will hide them if it comes to that.' }
        }
    },
    {
        kind: 'reply',
        npc: '{allyNpc}',
        intro: '{allyNpc} looks the party over, then settles on {character}. "Can I trust you with the next one, or do I need to babysit?"',
        honest: { text: 'You can trust us.', reaction: '{allyNpc} nods once. "Don\'t make me regret it."', lead: '{allyNpc} is giving the party the next job without a minder, which means no backup either.' },
        defiant: { text: 'We don\'t need a babysitter.', reaction: '{allyNpc}\'s jaw tightens. "We\'ll see."', lead: '{allyNpc} assigned someone to keep an eye on the party, and that someone reports everything they do.' },
        sly: { text: 'Depends. What are you not telling us?', reaction: '{allyNpc} is quiet for a beat too long. "Ask me again after the next one."', lead: '{allyNpc} is holding something back about the next job, and almost admitted it.' },
        skills: {
            politician: { text: 'Trust is earned. We\'re earning it.', reaction: '{allyNpc} almost smiles. "Fair enough. Keep earning."', lead: '{allyNpc} started bringing the party into planning meetings, where they hear things most fighters don\'t.' },
            navigator: { text: 'We know these streets better than your scouts.', reaction: '{allyNpc} hands over a map with half the routes crossed out. "Prove it."', lead: '{allyNpc} gave the party a map with half its routes crossed out, and wants to know why those routes went bad.' },
            spy: { text: 'You won\'t even see us coming back.', reaction: '"That\'s what I\'m afraid of," {allyNpc} says, but there\'s respect in it.', lead: '{allyNpc} wants the party for a quiet job inside enemy lines, the kind nobody else can know about.' }
        }
    },
    {
        kind: 'reply',
        npc: 'A wounded {enemySide} soldier',
        intro: 'A wounded {enemySide} soldier props himself up against the wall and glares at {character}. "Just finish it. That\'s what you people do, isn\'t it?"',
        honest: { text: 'That\'s not who we are.', reaction: 'The soldier stares at {character} like they\'re speaking another language. Then, quietly: "Thanks."', lead: 'A {enemySide} soldier the party spared owes them a life, and knows it.' },
        defiant: { text: 'Don\'t tempt us.', reaction: 'The soldier spits on the ground and looks away. Word of this will travel.', lead: 'Word spread on the {enemySide} side that the party shows no mercy, and they fight harder against them now.' },
        sly: { text: 'Tell us something useful and we\'ll think about it.', reaction: 'The soldier weighs it, then mutters a shift change time and a door code. "Now leave me alone."', lead: 'A wounded {enemySide} soldier gave the party a door code and a shift change time, which may or may not still be good.' },
        skills: {
            medic: { text: 'Hold still. This is going to sting.', told: '{character} kneels down and starts dressing the wound without a word.', reaction: 'The soldier flinches, then lets {character} work. "Why?" he asks. Nobody answers.', lead: 'A {enemySide} soldier {character} patched up has started quietly asking his own side questions.' },
            intimidation: { text: 'Tell your friends what you saw today.', reaction: 'The soldier nods too fast. He will tell them, and they\'ll think twice.', lead: 'The {enemySide} grunts have heard about the party, and some of them would rather run than fight them.' },
            detective: { text: 'Tell us who gave the order, and you walk.', reaction: 'The soldier hesitates, then gives up a name. It\'s not one anyone expected.', lead: 'A wounded soldier named the officer who gave his unit its orders, and it was someone on the party\'s own side.' }
        }
    },
    {
        kind: 'reply',
        npc: 'A {side} recruit',
        intro: 'A {side} recruit who can\'t be older than seventeen keeps staring at {character}, and finally works up the nerve. "Is it true what they say about you? That you\'ve never lost?"',
        honest: { text: 'We\'ve lost plenty. We just keep going.', reaction: 'The recruit looks relieved, like {character} has given them permission to be scared.', lead: 'A young {side} recruit has started following the party\'s lead, and stays out of the dumbest fights because of it.' },
        defiant: { text: 'Stick around and find out.', reaction: 'The recruit grins and follows the party a little too closely for the rest of the day.', lead: 'An overeager {side} recruit keeps following the party into danger to prove themselves.' },
        sly: { text: 'Who told you that?', reaction: 'The recruit blinks. "Everyone\'s saying it. It\'s on the feeds." Somebody, somewhere, is spreading stories about the party on purpose.', lead: 'Someone is spreading stories about the party on the feeds, and nobody knows who or why.' },
        skills: {
            politician: { text: 'It\'s true. And you\'re part of it now.', reaction: 'The recruit stands up straighter. By tomorrow the whole cell will be repeating it.', lead: 'The {side} rank and file are rallying around the party, which makes them heroes and targets at once.' },
            medic: { text: 'Only because someone keeps patching us up.', reaction: 'The recruit laughs and asks if {character} can teach them to tie a tourniquet.', lead: 'A {side} recruit is learning field medicine from {character} and turns up wherever someone is hurt.' },
            scholar: { text: 'Winning isn\'t the same as being right.', reaction: 'The recruit frowns, thinking about it, and it clearly sticks.', lead: 'A {side} recruit started asking awkward questions about what the {side} side is really for.' }
        }
    },
    {
        kind: 'reply',
        npc: '{enemyNpc}',
        intro: 'Every screen on the street flickers, and {enemyNpc}\'s face appears on all of them, looking right at {character}. "You could still walk away. Nobody would blame you."',
        honest: { text: 'We would.', reaction: '{enemyNpc} studies {character} through the screen. "Pity," they say, and the feed cuts out.', lead: '{enemyNpc} decided the party can\'t be talked down, and is planning to stop them for good.' },
        defiant: { text: 'Come and make us.', reaction: '{enemyNpc} smiles thinly. "I was hoping you\'d say that." The screens go black.', lead: '{enemyNpc} took it as a challenge and is coming after the party personally.' },
        sly: { text: 'What would you give us to walk?', reaction: '{enemyNpc} pauses, interested despite themselves. "More than you\'re worth. Think about it." A contact code scrolls across the bottom of every screen.', lead: '{enemyNpc} offered the party a deal and left a contact code, and the party\'s own side may have seen it.' },
        skills: {
            intimidation: { text: 'You should be the one walking away.', reaction: 'For half a second, {enemyNpc} looks unsure. Then the feed cuts out.', lead: '{enemyNpc} is rattled, and pulling more guards close instead of sending them out.' },
            spy: { text: 'Nice office. We\'ll see you there soon.', reaction: '{enemyNpc}\'s eyes flick to something off-screen, just once. The feed cuts out fast.', lead: 'The party clocked something in the background of {enemyNpc}\'s feed that gives away where they work from.' },
            electrician: { text: 'Kill the feed mid-sentence.', told: '{character} pries open a junction box and yanks a cable.', reaction: 'Every screen on the street dies with a pop. Somewhere, {enemyNpc} is very annoyed.', lead: '{character} pulled a cable that killed {enemyNpc}\'s whole broadcast network on this side of the city.' }
        }
    },
    {
        kind: 'reply',
        npc: 'A street kid',
        intro: 'A street kid plants herself in front of {character} with her arms crossed. "Are you the good guys or the bad guys?"',
        honest: { text: 'We\'re trying to be the good guys.', reaction: 'The kid considers this seriously, then nods. "Okay. Try harder."', lead: 'A street kid has decided to keep an eye on the party, and she is better at it than most spies.' },
        defiant: { text: 'Depends who you ask.', reaction: 'The kid rolls her eyes. "That means bad guys," she announces to nobody in particular.', lead: 'The street kids have decided the party are bad guys, and nobody on the street will talk to them now.' },
        sly: { text: 'Which would you rather we were?', reaction: 'The kid thinks hard. "The kind that pays," she says, and holds out her hand.', lead: 'A street kid is selling information about the party to anyone who pays, and also selling them information if they pay more.' },
        skills: {
            navigator: { text: 'Know a quick way out of here?', reaction: 'The kid grins and points at a drainpipe nobody else noticed. "Ten credits."', lead: 'A street kid showed the party a hidden route over the rooftops that the patrols don\'t know about.' },
            crook: { text: 'Flip her a coin.', told: '{character} flips the kid a coin. "Good guys tip."', reaction: 'The kid pockets it in one smooth motion and disappears. Later, a warning note turns up in {character}\'s pocket.', lead: 'A street kid slipped {character} a warning note: someone is following the party.' },
            medic: { text: 'You\'re bleeding. Let me see that.', reaction: 'The kid lets {character} clean the scrape and decides, firmly, that they\'re the good guys.', lead: 'A street kid {character} helped told all her friends, and the kids now warn the party when patrols come.' }
        }
    },
    {
        kind: 'reply',
        npc: 'A Division drone',
        intro: 'A Division drone drops out of the sky and hovers at eye level with {character}, its speaker crackling. "Citizen. State your business in this sector."',
        honest: { text: 'Heading home.', reaction: 'The drone scans {character} for a long, humming second, then rises away. Its red light lingers on the party all the way down the block.', lead: 'A Division drone tagged the party\'s faces as "monitored," and drones follow them at a distance now.' },
        defiant: { text: 'Mind your own business, tin can.', reaction: 'The drone chirps once and flies straight up. Thirty seconds later, two more arrive.', lead: 'The party is flagged as hostile on the Division drone network, and drones swarm wherever they go.' },
        sly: { text: 'Maintenance crew. We\'re here for you, actually.', reaction: 'The drone hesitates, then lowers itself for inspection, which is exactly when {character} pulls its memory card.', lead: 'The party pulled a memory card out of a Division drone, full of patrol footage nobody has looked through yet.' },
        skills: {
            electrician: { text: 'Pop its access panel.', told: '{character} reaches up and pops the drone\'s access panel open.', reaction: 'The drone spins in a slow, confused circle and settles on {character}\'s shoulder like a pet.', lead: '{character} rewired a Division drone, and it follows the party now, feeding them the network\'s chatter.' },
            spy: { text: 'Give it a fake ID number.', reaction: 'The drone accepts the ID with a polite beep and logs the party as a Division survey team.', lead: 'The Division network has the party logged as one of its own survey teams, which works until somebody checks.' },
            intimidation: { text: 'Stare it down until it leaves.', told: '{character} stares into the drone\'s lens and doesn\'t blink.', reaction: 'Whoever is watching through it blinks first. The drone backs away.', lead: 'A Division operator watching through a drone feed has become fixated on {character}, and keeps finding excuses to watch them.' }
        }
    },
    {
        kind: 'reply',
        npc: 'A {side} veteran',
        intro: 'A {side} veteran with a mechanical arm and a tired face sits down next to {character}. "Why do you even care who wins this? You don\'t look like a believer."',
        honest: { text: 'We care who gets hurt.', reaction: 'The veteran grunts. "Then you\'ll hate what comes next." He gets up and doesn\'t explain.', lead: 'A {side} veteran warned the party that the next operation will hurt a lot of civilians, and walked off before saying how.' },
        defiant: { text: 'We don\'t. We care who pays.', reaction: 'The veteran laughs, short and bitter. "Honest, at least." He slides a name across the table: someone who pays well.', lead: 'A {side} veteran pointed the party at a buyer who pays well for dangerous work, no questions asked.' },
        sly: { text: 'Why do you?', reaction: 'The veteran is quiet for a long time. "My unit. What\'s left of it." He nods at a photo on the wall with half the faces crossed out.', lead: 'A {side} veteran\'s old unit was wiped out on a mission nobody will talk about, and he wants to know why.' },
        skills: {
            scholar: { text: 'Because how this ends decides everything after.', reaction: 'The veteran looks at {character} differently after that. "Then you should read these." He hands over a stack of old orders.', lead: 'A {side} veteran gave the party a stack of old orders that don\'t match the official story of the war.' },
            medic: { text: 'Let me look at that arm.', reaction: 'The veteran lets {character} tighten a loose joint and flexes the arm, surprised. "Huh. Haven\'t felt that in years."', lead: 'A grateful {side} veteran offered the party his old safehouse, no questions asked.' },
            politician: { text: 'Because someone has to win it right.', reaction: '"Right," the veteran repeats, tasting the word. "Okay. I\'ll put a word in."', lead: 'A respected {side} veteran is vouching for the party, and people who used to ignore them are listening now.' }
        }
    },
    {
        kind: 'reply',
        npc: 'A nervous clinic doctor',
        intro: 'A doctor at a backstreet clinic blocks the door as the party arrives, and stares straight at {character}. "Every time people like you come through here, I lose patients. Why should I let you in?"',
        honest: { text: 'Because we\'re hurt, and we won\'t start anything.', reaction: 'The doctor sighs and steps aside. "Back room. Keep your weapons where I can see them."', lead: 'A backstreet clinic doctor agreed to patch up the party, and expects them to keep trouble away from her door.' },
        defiant: { text: 'Because we\'re coming in either way.', reaction: 'The doctor steps aside, but her hand goes to the phone on the wall the moment their backs are turned.', lead: 'A backstreet doctor reported the party to someone, and nobody knows which side she called.' },
        sly: { text: 'Because the people chasing us are worse.', reaction: 'The doctor\'s eyes go to the street behind them, then back. "Basement. Now."', lead: 'A backstreet doctor is hiding the party, and the people after them are working their way down the block.' },
        skills: {
            medic: { text: 'Because I can help with your patients while we\'re here.', reaction: 'The doctor looks at {character}\'s hands, then nods. "Scrub in."', lead: '{character} helped save a patient at a backstreet clinic, and the doctor owes the party a favor she means to repay.' },
            banker: { text: 'Because we can pay for the trouble.', told: '{character} sets a heavy credit chip on the counter.', reaction: 'The doctor pockets it. "For that much, I didn\'t see you."', lead: 'A backstreet clinic now has the party\'s money and a reason to keep quiet, for as long as the money lasts.' },
            detective: { text: 'Because someone\'s been stealing your medicine.', reaction: 'The doctor freezes. "How do you know that?" She lets them in to find out.', lead: 'Someone has been stealing medicine from the backstreet clinics, and the party has the first clue who.' }
        }
    },
    {
        kind: 'reply',
        npc: 'Dex "Static" Moreno',
        intro: 'Dex "Static" Moreno leans over the counter toward {character}. "Little bird says you\'ve been making enemies. Should I be worried about selling to you?"',
        honest: { text: 'Probably. But we pay on time.', reaction: 'Dex laughs. "Best answer I\'ve heard all week." He knocks a little off the price.', lead: 'Dex "Static" Moreno is giving the party a regular\'s discount, and a regular\'s warnings when trouble asks about them.' },
        defiant: { text: 'Worry about the ones who don\'t pay.', reaction: 'Dex holds up both hands. "Easy." His smile doesn\'t reach his eyes.', lead: 'Dex "Static" Moreno is quietly selling information about the party to whoever asks.' },
        sly: { text: 'Depends. Who\'s the little bird?', reaction: 'Dex taps his nose. "Good question. Wrong price." He names a number.', lead: 'Dex "Static" Moreno knows who has been asking about the party, and will sell the name for the right price.' },
        skills: {
            banker: { text: 'Worried enough to give us credit?', reaction: 'Dex looks impressed. "A line of credit. Small one. Don\'t make me collect."', lead: 'Dex "Static" Moreno extended the party a line of credit, which means he wants them alive.' },
            crook: { text: 'Worried enough to show us the back room?', reaction: 'Dex grins and pulls the curtain. Behind it is everything he doesn\'t put on the shelves.', lead: 'Dex "Static" Moreno showed the party his back room, full of military gear that fell off a very specific truck.' },
            spy: { text: 'Only if you keep talking to that little bird.', reaction: 'Dex goes still. "You know about that?" He lowers his voice and tells them everything.', lead: 'Dex "Static" Moreno admitted someone is paying him to report on the party, and agreed to feed them false reports instead.' }
        }
    },

    // ---- A party member asking an NPC ----
    {
        kind: 'ask',
        npc: 'Ines Calder',
        intro: 'Ines Calder is picking through the wreck of her stall, and she clearly saw more than she has told anyone. {character} has a moment to ask her something.',
        honest: { text: 'Ask what she saw that night.', told: '{character} asks Ines, gently, what she saw that night.', reaction: '"A Division van," Ines says quietly. "Parked behind the market an hour before. Nobody else seems to remember it."', lead: 'Ines Calder saw a Division van behind the market an hour before the bombing, and the party wants to find it.' },
        defiant: { text: 'Press her: who is she protecting?', told: '{character} asks Ines who she is protecting.', reaction: 'Ines\'s face closes like a door. "Myself," she says. "Same as you." She won\'t say more today.', lead: 'Ines Calder is protecting someone involved in the bombing, and shut the party out for asking.' },
        sly: { text: 'Ask who else has been asking her questions.', told: '{character} asks Ines who else has come around asking questions.', reaction: 'Ines glances at the street. "A man in a good coat. Twice. He wasn\'t buying anything."', lead: 'A man in an expensive coat has been asking Ines Calder about the bombing, and he will be back.' },
        skills: {
            detective: { text: 'Ask about the scorch marks.', told: '{character} asks Ines why the scorch marks point the wrong way.', reaction: 'Ines looks at {character} for a long moment. "Because it didn\'t come from inside," she says. "And whoever did it knew the market would be full."', lead: 'Ines Calder confirmed the market bomb was planted from outside, by someone who wanted it full.' },
            medic: { text: 'Ask about her burned hands first.', told: '{character} takes Ines\'s burned hands and asks how bad it is.', reaction: 'Ines lets {character} wrap them, and somewhere in the middle of it she starts talking: a van, a uniform, a man she has seen on the news.', lead: 'Ines Calder recognized a man from the news at the bombing, and trusts {character} enough to say who if they ask again.' },
            politician: { text: 'Ask what she needs to feel safe talking.', told: '{character} asks what it would take for Ines to feel safe telling the truth.', reaction: '"Somebody listening who isn\'t paid to forget," Ines says. "You\'ll do, for now."', lead: 'Ines Calder will testify about the bombing if the party can find her somewhere safe.' }
        }
    },
    {
        kind: 'ask',
        npc: 'Dex "Static" Moreno',
        intro: 'Dex "Static" Moreno is leaning in his doorway, which means he is bored, which means he will talk. {character} has a chance to ask him something.',
        honest: { text: 'Ask what people are saying about the party.', told: '{character} asks Dex what people are saying about the party.', reaction: '"Depends who you ask," Dex says. "The ones who matter are scared of you. That\'s new."', lead: 'The people who run things in the city have started taking the party seriously, and scared people make bad decisions.' },
        defiant: { text: 'Ask what he\'s hiding in the back.', told: '{character} nods at the curtain behind the counter and asks what Dex is hiding back there.', reaction: '"Inventory," Dex says flatly, and pulls the curtain the rest of the way shut.', lead: 'Dex "Static" Moreno is hiding something, or someone, in his back room.' },
        sly: { text: 'Ask what he\'d pay for a good rumor.', told: '{character} asks Dex what a good rumor goes for these days.', reaction: 'Dex\'s eyebrows go up. "Depends on the rumor." They agree on a price for the next one the party brings him.', lead: 'Dex "Static" Moreno will pay the party for rumors, and anything they tell him will end up somewhere.' },
        skills: {
            banker: { text: 'Ask who\'s been paying him lately.', told: '{character} asks Dex who has been paying him lately.', reaction: 'Dex lowers his voice. "Someone with Division money and no Division badge. Make of that what you want."', lead: 'Someone with Division money and no badge has been paying Dex "Static" Moreno, and the money can be traced.' },
            crook: { text: 'Ask what fell off which truck.', told: '{character} asks Dex what has fallen off which truck this week.', reaction: 'Dex grins. "Fusion cells. Military grade. Off a truck that wasn\'t supposed to exist."', lead: 'Military-grade fusion cells are moving through the black market off a truck that officially doesn\'t exist.' },
            electrician: { text: 'Ask why his lights keep flickering.', told: '{character} asks why every light in the shop keeps flickering.', reaction: '"Somebody\'s pulling a lot of power nearby," Dex says. "Started three days ago. You tell me."', lead: 'Something nearby has been drawing huge amounts of power for days, and nobody knows what.' }
        }
    },
    {
        kind: 'ask',
        npc: '{allyNpc}',
        intro: '{allyNpc} is going over a map, alone for once. {character} has a chance to ask something before the others come back.',
        honest: { text: 'Ask what the plan really is.', told: '{character} asks {allyNpc} what the plan really is.', reaction: '{allyNpc} taps the map. "Win the next fight. Then the one after that. Anyone who tells you more than that is lying."', lead: '{allyNpc} admitted there is no grand plan, only the next fight, and the party may need to make one.' },
        defiant: { text: 'Ask why we should keep taking orders.', told: '{character} asks {allyNpc} why the party should keep taking orders.', reaction: '"Because the alternative is taking them from the other side," {allyNpc} says, without looking up.', lead: '{allyNpc} is less sure of the party\'s loyalty now, and has started making backup plans without them.' },
        sly: { text: 'Ask who drew this map.', told: '{character} asks {allyNpc} who drew the map.', reaction: '{allyNpc} hesitates. "Someone on the inside. I can\'t tell you who." Their hand covers a signature in the corner.', lead: '{allyNpc} has a source inside the other side, and the source\'s signature is on the map.' },
        skills: {
            scholar: { text: 'Ask how this ends, long term.', told: '{character} asks {allyNpc} how this ends, years from now.', reaction: '{allyNpc} is quiet for a long time. "I don\'t know," they say finally. "Nobody\'s ever asked me that."', lead: '{allyNpc} has started thinking about what comes after the fighting, and wants the party\'s help deciding.' },
            spy: { text: 'Ask who else is on the payroll.', told: '{character} asks {allyNpc}, quietly, who else is on the payroll.', reaction: '{allyNpc} glances at the door, then writes two names on the corner of the map and tears it off.', lead: '{allyNpc} gave the party two names on a torn corner of a map: people being paid by both sides.' },
            navigator: { text: 'Ask about the routes she crossed out.', told: '{character} asks {allyNpc} why half the routes on the map are crossed out.', reaction: '"Compromised," {allyNpc} says. "All of them, in the last week. Someone is feeding the other side our maps."', lead: 'Someone on the party\'s own side is leaking their routes to the enemy.' }
        }
    },
    {
        kind: 'ask',
        npc: 'A captured {enemySide} officer',
        intro: 'A captured {enemySide} officer sits on a crate with their hands bound, watching everyone. {character} gets a minute alone with them.',
        honest: { text: 'Ask what they\'re fighting for.', told: '{character} asks the officer what they are actually fighting for.', reaction: '"Same as you," the officer says. "Somebody I don\'t want to see hurt." It is not the answer anyone expected.', lead: 'A captured {enemySide} officer has family in the city they are trying to protect, and might deal for their safety.' },
        defiant: { text: 'Demand their next target.', told: '{character} leans in and demands the next target.', reaction: 'The officer smiles and says nothing at all, which tells everyone exactly how much they are not going to get.', lead: 'A captured {enemySide} officer refused to talk, and their people will come looking for them.' },
        sly: { text: 'Mention their side already wrote them off.', told: '{character} mentions, casually, that the officer\'s side has already written them off.', reaction: 'The officer laughs, but it comes out wrong. Then they start talking, slowly, about a meeting nobody was supposed to know about.', lead: 'A captured {enemySide} officer revealed a secret meeting between the leaders of both sides.' },
        skills: {
            intimidation: { text: 'Lean in close and ask again.', told: '{character} leans in close and asks again, very quietly.', reaction: 'The officer\'s composure cracks. A location spills out, then a time.', lead: 'A captured officer gave up the location and time of the next {enemySide} operation.' },
            detective: { text: 'Ask about the ink stain on their cuff.', told: '{character} asks about the ink stain on the officer\'s cuff.', reaction: 'The officer glances down, too late. "Printed orders," they mutter. "Nobody trusts the network anymore."', lead: 'The {enemySide} side has stopped trusting its own network and passes orders on paper, which can be stolen.' },
            politician: { text: 'Offer them a way out.', told: '{character} offers the officer a way out of all this.', reaction: 'The officer laughs, but it comes out wrong. "Ask me again tomorrow," they say, and they sound like they mean it.', lead: 'A captured {enemySide} officer is thinking about switching sides, and wants an answer by tomorrow.' }
        }
    },
    {
        kind: 'ask',
        npc: 'A courier with a sealed case',
        intro: 'A courier sits on the curb with a sealed case chained to one wrist, waiting for someone who is clearly late. {character} has a chance to ask them something.',
        honest: { text: 'Ask who they\'re waiting for.', told: '{character} asks the courier who they are waiting for.', reaction: '"Above my pay grade," the courier says, then glances at their watch. "And they\'re an hour late, which never happens."', lead: 'A courier\'s contact never showed up, and the sealed case is still out there waiting for a buyer.' },
        defiant: { text: 'Ask what\'s in the case, or else.', told: '{character} asks what\'s in the case, and makes it clear asking nicely is optional.', reaction: 'The courier bolts. The chain on the case rattles all the way down the alley.', lead: 'A spooked courier ran off with a sealed case, straight toward whoever was supposed to receive it.' },
        sly: { text: 'Offer to deliver it for them.', told: '{character} offers to take the delivery off the courier\'s hands.', reaction: 'The courier thinks about it way too seriously, then unlocks the chain. "Address is on the bottom. Don\'t open it."', lead: 'The party is carrying a sealed case they promised not to open, to an address they don\'t recognize.' },
        skills: {
            crook: { text: 'Ask them to look the other way for a second.', told: '{character} lifts the case\'s seal with two fingers while asking the courier for directions.', reaction: 'Inside, under the foam, are blank neurochips. Hundreds of them.', lead: 'The party found hundreds of blank neurochips in a courier\'s sealed case, bound for someone unknown.' },
            spy: { text: 'Ask about the chain\'s lock.', told: '{character} asks where the courier got such a nice lock.', reaction: '"Company issue," the courier says, then realizes what they have just admitted. The company stamp on the lock is Crown Gene\'s.', lead: 'Crown Gene is moving something in sealed cases through couriers, off the books.' },
            navigator: { text: 'Ask where the drop point is.', told: '{character} asks where the drop point is supposed to be.', reaction: 'The courier names a place. {character} knows it: an empty building nobody has used in years.', lead: 'A secret handoff is set for an abandoned building the party knows how to get into.' }
        }
    },
    {
        kind: 'ask',
        npc: 'A reporter with a camera drone',
        intro: 'A reporter is hiding in a doorway with a camera drone tucked under one arm, filming whatever she can. {character} catches her eye and gets a chance to ask her something.',
        honest: { text: 'Ask what she\'s seen today.', told: '{character} asks the reporter what she has seen today.', reaction: 'She plays back some footage. In the corner of one frame, someone in a corporate suit is directing Enforcers.', lead: 'A reporter has footage of a corporate executive directing Enforcers in the street, and nobody will air it.' },
        defiant: { text: 'Ask her to stop filming them.', told: '{character} asks the reporter to stop filming the party.', reaction: 'She lowers the drone, offended. "Fine. You\'ll be the ones without anyone telling your side."', lead: 'A reporter is telling the story of the fighting without the party\'s side of it, and it isn\'t flattering.' },
        sly: { text: 'Ask who she\'s really working for.', told: '{character} asks the reporter who she is really working for.', reaction: 'She grins. "Whoever doesn\'t own a news station." She offers {character} a card with a secure channel on it.', lead: 'An independent reporter gave the party a secure channel, and will broadcast what they send her.' },
        skills: {
            politician: { text: 'Offer her an interview.', told: '{character} offers the reporter an interview.', reaction: 'Her eyes light up. Ten minutes later, {character}\'s face is on every pirate feed in the city.', lead: '{character}\'s interview went out on the pirate feeds, and half the city now knows the party by name.' },
            scholar: { text: 'Ask what the official story leaves out.', told: '{character} asks what the official story leaves out.', reaction: '"Everything that matters," she says, and sends over a file of facts the official reports skipped.', lead: 'The party has a file of facts the official reports left out, and some of them point straight at the founders.' },
            electrician: { text: 'Ask to borrow her drone\'s signal.', told: '{character} asks if they can borrow the drone\'s broadcast signal.', reaction: 'She hands over the controller, curious. {character} uses it to tap into a nearby Enforcer channel.', lead: '{character} tapped into an Enforcer channel through a reporter\'s drone, and can listen in for a while.' }
        }
    },
    {
        kind: 'ask',
        npc: 'A black-market surgeon',
        intro: 'A black-market surgeon is washing their hands in a basement sink, apron stained, humming. {character} has a chance to ask something before they turn around.',
        honest: { text: 'Ask what they\'re working on.', told: '{character} asks the surgeon what they are working on.', reaction: '"Taking out implants that phone home," the surgeon says. "Busy week. Lots of people suddenly don\'t want Crown Gene listening."', lead: 'People are paying to have Crown Gene implants removed, because the implants started reporting more than they should.' },
        defiant: { text: 'Ask who their last patient was.', told: '{character} asks who the surgeon\'s last patient was.', reaction: 'The surgeon turns, scalpel still in hand. "Somebody who appreciated discretion," they say. "Get out."', lead: 'A black-market surgeon threw the party out and will warn their clients the party came asking.' },
        sly: { text: 'Ask what they\'d charge to fix one of us.', told: '{character} asks what the surgeon would charge to work on the party.', reaction: 'The surgeon looks {character} over, professionally. "For you? A favor. A big one. Later."', lead: 'A black-market surgeon will treat the party in exchange for a favor they haven\'t named yet.' },
        skills: {
            medic: { text: 'Ask about the scars on the last patient\'s file.', told: '{character} reads the open patient file and asks about the strange scars.', reaction: 'The surgeon sighs. "You saw that. Ascension scars. Somebody escaped a Crown Gene lab and came here."', lead: 'An escaped Project Ascension test subject is hiding somewhere in the city after visiting a black-market surgeon.' },
            detective: { text: 'Ask why the sink water is tinted blue.', told: '{character} asks why the sink water has a blue tint to it.', reaction: 'The surgeon goes pale. "Coolant. From a cybernetic heart. You don\'t see many of those outside the founders\' towers."', lead: 'Someone from the founders\' towers came to a black-market surgeon in secret, with a cybernetic heart.' },
            banker: { text: 'Ask who pays their rent.', told: '{character} asks who pays the surgeon\'s rent.', reaction: 'The surgeon laughs. "Rebels, Enforcers, executives. Whoever\'s bleeding." Then, quieter: "The executives pay the most."', lead: 'Corporate executives are quietly paying a black-market surgeon for work they can\'t get done in their own clinics.' }
        }
    }
];

const SILENT = {
    reply: { told: '{character} doesn\'t answer.', reaction: '{npc} waits, shrugs, and turns away.' },
    ask: { told: '{character} lets the moment pass without asking anything.', reaction: '{npc} goes back to what they were doing.' }
};

// After the moment, the story turns back to the group's decision.
const BACK_TO_THE_GROUP = [
    'Then it\'s back to the problem in front of them. It\'s {owner}\'s call.',
    'The others turn back to the matter at hand, and to {owner}, whose call it is.',
    'There\'s still a decision to make, and it\'s {owner}\'s to make.'
];

const fill = (text, values) => String(text).replace(/\{(\w+)\}/g, (_, key) => values[key] ?? '');

const SIDES = {
    rebels: { side: 'Rebel', enemySide: 'Enforcer', allyNpc: 'Commander Rhea Vance', enemyNpc: 'Captain Mara Kessler' },
    enforcers: { side: 'Enforcer', enemySide: 'Rebel', allyNpc: 'Captain Mara Kessler', enemyNpc: 'Commander Rhea Vance' }
};

/** How an NPC feels about the party, from their running score. */
export function attitudeLabel(score) {
    if (score >= 3) return 'trusts the party';
    if (score >= 1) return 'warming to the party';
    if (score <= -3) return 'hostile to the party';
    if (score <= -1) return 'wary of the party';
    return 'undecided about the party';
}

/**
 * Builds a dialogue moment for one party member.
 * @param {object} options
 * @param {{ playerName, characterName }} options.target - who chooses
 * @param {string[]} options.attributes - the target's attribute ranking (best first)
 * @param {string|null} options.faction - the side the party joined
 * @param {Set<number>} [options.used] - moments already used this campaign
 * @returns {{ id, exchange, kind, npc, intro, playerName, characterName, options }}
 *   `intro` is the narration that sets the moment up (it ends with the question, for 'reply').
 */
export function createDialogue({ target, attributes = [], faction = null, used = new Set(), random = Math.random, id = 'd1' }) {
    const values = { ...(SIDES[faction] || { side: 'street', enemySide: 'corporate', allyNpc: 'Dex "Static" Moreno', enemyNpc: 'Director Hale' }), character: target.characterName };
    const fresh = EXCHANGES.map((_, index) => index).filter(index => !used.has(index));
    const pool = fresh.length > 0 ? fresh : EXCHANGES.map((_, index) => index);
    const index = pool[Math.floor(random() * pool.length) % pool.length];
    const exchange = EXCHANGES[index];
    const npc = fill(exchange.npc, values);
    const withNpc = { ...values, npc };

    const top = attributes.map(normalizeAttribute).filter(Boolean).slice(0, 3);
    const skill = top.find(attribute => exchange.skills[attribute]);
    const option = (id, tone, entry, attribute = null) => ({
        id,
        tone,
        attribute,
        text: fill(entry.text, withNpc),
        told: fill(entry.told || '{character}: "' + entry.text + '"', withNpc),
        reaction: fill(entry.reaction, withNpc),
        lead: entry.lead ? fill(entry.lead, withNpc) : null
    });

    const options = [];
    if (skill) options.push(option('skill', 'skill', exchange.skills[skill], skill));
    options.push(option('honest', 'honest', exchange.honest));
    options.push(option('defiant', 'defiant', exchange.defiant));
    if (exchange.sly) options.push(option('sly', 'sly', exchange.sly));
    const silent = SILENT[exchange.kind];
    options.push({ id: 'silent', tone: 'silent', attribute: null, hidden: true, text: '', told: fill(silent.told, withNpc), reaction: fill(silent.reaction, withNpc) });

    return {
        id,
        exchange: index,
        kind: exchange.kind,
        npc,
        intro: fill(exchange.intro, withNpc),
        playerName: target.playerName,
        characterName: target.characterName,
        options
    };
}

/** What every client sees: the choices, without the reactions (and without staying silent). */
export function publicDialogue(dialogue) {
    if (!dialogue) return null;
    return {
        id: dialogue.id,
        kind: dialogue.kind,
        npc: dialogue.npc,
        playerName: dialogue.playerName,
        characterName: dialogue.characterName,
        options: dialogue.options.filter(option => !option.hidden).map(({ id, text, attribute }) => ({ id, text, attribute: attribute || null }))
    };
}

/** The narration after a choice: what was said, how the NPC took it, and back to the group. */
export function followUpNarration(dialogue, option, { ownerName = null, random = Math.random } = {}) {
    const back = ownerName ? ' ' + fill(BACK_TO_THE_GROUP[Math.floor(random() * BACK_TO_THE_GROUP.length) % BACK_TO_THE_GROUP.length], { owner: ownerName }) : '';
    return `${option.told} ${option.reaction}${back}`;
}

// Exposed for tests.
export const DIALOGUE_EXCHANGES = EXCHANGES;
