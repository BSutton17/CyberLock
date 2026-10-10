// The offline narrator's story writer. No AI: each beat is assembled from hand-written pieces
// (scene details, situations, consequences, villain lines) chosen to fit what the game knows right
// now: who is in the party, which side they joined, the act and its villain, where they are, and
// what they just decided. It can't improvise like a model, but it keeps the campaign playable and
// different each time.
import { CHARACTERS, OPENING_SCENES, DECISION_ATTRIBUTES } from './lore.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const fill = (template, values) => template.replace(/\{(\w+)\}/g, (_, key) => values[key] ?? '');
const lowerFirst = (text) => (text ? text.charAt(0).toLowerCase() + text.slice(1) : text);
const sentence = (text) => {
    const trimmed = String(text || '').trim();
    if (!trimmed) return '';
    return /[.!?"]$/.test(trimmed) ? trimmed : `${trimmed}.`;
};

// `recent` remembers what was said lately so a campaign doesn't hear the same line twice in a row.
function makeTools(random, recent = []) {
    const pick = (list) => {
        const fresh = list.filter(item => !recent.includes(item));
        const pool = fresh.length > 0 ? fresh : list;
        const item = pool[Math.floor(random() * pool.length) % pool.length];
        recent.push(item);
        if (recent.length > 60) recent.splice(0, recent.length - 60);
        return item;
    };
    const chance = (probability) => random() < probability;
    return { pick, chance, roll: () => random() };
}

const SIDES = {
    rebels: { name: 'the Rebels', enemy: 'the Enforcers', allyNpc: 'Commander Rhea Vance', enemyNpc: 'Captain Mara Kessler' },
    enforcers: { name: 'the Enforcers', enemy: 'the Rebels', allyNpc: 'Captain Mara Kessler', enemyNpc: 'Commander Rhea Vance' }
};
const NEUTRAL_SIDE = { name: 'whoever pays', enemy: 'whoever shoots first', allyNpc: 'Dex "Static" Moreno', enemyNpc: 'a Division drone' };

const PLACES = {
    city_square: 'the square',
    street: 'the market streets',
    warehouse: 'the depot',
    club: 'the club',
    hospital: 'the clinic',
    office: 'the tower',
    sewer: 'the tunnels',
    shop: "Dex's shop",
    boss: 'the stronghold'
};

// ---------------------------------------------------------------------------
// Opening
// ---------------------------------------------------------------------------

// The city shown through what's in front of the party, never as a list of facts.
const CITY_DETAILS = [
    'A Singularity ad flickers over a boarded-up noodle stall, promising a robot that will do your job for you. Somebody has sprayed THEN WHAT DO WE DO across half of it.',
    'A Division drone drifts low over the crowd, scanning faces a little too slowly, and the vendor at the next stall stops talking until it passes.',
    'The streetlights are Particle Genesis cores, humming at a pitch you stop hearing after a week. Tonight two of them are dark, and nobody has come to fix them.',
    'Half the people in line have the same Crown Gene implant behind the ear, the cheap model that comes with an ad every morning.',
    'An Enforcer in polished armor is buying dumplings and paying full price, which tells you how nervous everyone is today.',
    'Someone has scratched a rebel slogan into the checkpoint railing. Someone else has scratched a smiley face next to it. Neither has been cleaned off.',
    'The towers of the three founders glow above everything, close enough to see and far enough that nobody down here has ever been inside.',
    'A kid sells bootleg power cells out of a backpack and folds the whole operation shut the second he sees a uniform.'
];

// Why each character is here today, drawn from their backstory.
const ARRIVALS = {
    offensive_tank_1: '{name} is here to pay down a debt that was never his, the same one that swallowed his father.',
    defensive_tank_2: '{name} stands very still at the edge of the crowd, the way something does when it is trying not to be noticed by the people who built it.',
    spellcaster_dps_1: '{name} came to buy parts Crown Gene would never approve, cash only, no names.',
    aggressive_dps_2: '{name} is working a bounty, and the face on his screen was last seen two stalls down.',
    traditional_warrior_dps_3: '{name} still walks like an Enforcer, even though a machine took his badge years ago.',
    healing_support_1: "{name}'s drone hums at his shoulder; he came for a cracked servo nobody else wanted.",
    offensive_support_2: '{name} has his guitar case and a gig that paid in noodles, which is better than most gigs.',
    jack_of_all_trades_support_3: '{name} is off duty, or tells herself she is, and still counts the exits out of habit.',
    hacker_support_4: '{name} is here because somebody paid him to look at a corporate drive, and the drop point was the market.'
};

// The opening incidents, told as a scene (lore.js has the outline the AI works from).
const OPENING_PROSE = {
    market_explosion: 'The blast comes from the east end of the market and folds three stalls in half. A Division drone is already announcing a terrorist attack before the smoke clears, which is fast, even for Division. The scorch marks point the wrong way for that story. Enforcers pour in from one side and masked rebels from the other, and within seconds they are shooting at each other across the wreckage. An old vendor, Ines Calder, grabs the nearest sleeve. "I saw who did this," she says. "Tell someone. Anyone."',
    enforcer_checkpoint: 'The line for the Enforcer checkpoint wraps around the block, hundreds of people waiting to have their credentials scanned. Two people behind the party are talking too quietly, and then not quietly enough: there are armed rebels in this line, and they are going to hit the checkpoint from the inside in about five minutes. The civilians are packed right in the middle. An Enforcer looks straight at the party, and so does a woman with a pistol under her coat.',
    street_encounter: 'An explosion rocks the block and two parked cars go up under fresh graffiti that reads DOWN WITH THE CORPORATOCRACY. Enforcers in tactical armor fan out to set a perimeter. Masked rebels duck behind the burning cars. The party is standing in the open, right between them, and both sides have noticed.'
};

function opening(hints, tools, ctx) {
    const { pick } = tools;
    const details = [...CITY_DETAILS].sort(() => tools.chance(0.5) ? 1 : -1).slice(0, 2);
    const members = ctx.party.slice(0, 4).map(member => fill(ARRIVALS[member.characterId] || '{name} has reasons for being here, and keeps them close.', { name: member.name }));
    const rest = ctx.party.slice(4).map(member => member.name);
    const restLine = rest.length ? `${rest.join(' and ')} ${rest.length > 1 ? 'are' : 'is'} here too, each for reasons of their own.` : '';
    const incident = OPENING_PROSE[hints.openingScene] || OPENING_SCENES[hints.openingScene] || OPENING_PROSE.market_explosion;
    const strangers = ctx.party.length > 1
        ? pick(['None of them planned on standing this close to strangers.', 'They are strangers to each other, for about another ten seconds.'])
        : pick(['Nobody here knows them, which is how they like it.', 'It was supposed to be a quiet errand.']);
    const frame = ctx.hasOwner
        ? pick([
            `Both sides have seen ${ctx.ownerName} now, and both are waiting for an answer. Help the Enforcers, or help the Rebels.`,
            `Everyone is looking at ${ctx.ownerName}, as if ${ctx.ownerName} were the one in charge. Maybe that is true now. The Enforcers, or the Rebels?`
        ])
        : pick([
            'Both sides have seen them now, and both are waiting for an answer. Help the Enforcers, or help the Rebels.',
            'Standing still is not an option anymore. The Enforcers, or the Rebels?'
        ]);
    return [...details, ...members, restLine, strangers, incident, frame].map(sentence).filter(Boolean).join(' ');
}

// ---------------------------------------------------------------------------
// Joining a side
// ---------------------------------------------------------------------------

const COMMIT = {
    rebels: [
        '"Took you long enough," Commander Rhea Vance says, her cybernetic eye clicking as it focuses on the party. "Stay low and keep moving."',
        'A masked rebel tosses the party a spare comm. "Channel nine. If it goes quiet, run."'
    ],
    enforcers: [
        '"Good," Captain Mara Kessler says, already marking targets on her slate. "Try not to die before I learn your names."',
        'An Enforcer sergeant waves the party through the line without looking up. "You\'re with us now. Act like it."'
    ]
};
const ERUPT = [
    'Then the other side opens fire, and there is no more time to think about it.',
    'The first shots crack off the walls before anyone finishes the thought.',
    'Somewhere a window shatters, and the square turns into a battlefield.'
];

// ---------------------------------------------------------------------------
// Decisions: a situation for each kind of expertise, each with its own two options
// ---------------------------------------------------------------------------

const SITUATIONS = {
    politician: [
        { text: 'A crowd has gathered outside {place}, angry and scared, and a few of them recognize the party. One wrong word and this turns into a riot.', options: ['Speak to the crowd directly', 'Slip out before it boils over'], location: 'city_square' },
        { text: '{allyNpc} wants a favor from a ward boss who owes nobody anything. He will talk, but only to someone who can make him feel important.', options: ['Promise him a seat at the table', 'Remind him who is winning'] },
        { text: 'A reporter with a shaky camera drone offers to air the party\'s side of the story, live, tonight.', options: ['Go on camera and make the case', 'Feed her a story off the record'] }
    ],
    intimidation: [
        { text: 'A scared informant knows where {enemySide} are moving next, and is more afraid of them than of the party. For now.', options: ['Lean on the informant', 'Make him an offer instead'] },
        { text: 'A checkpoint guard is blocking the only way forward and enjoying it.', options: ['Stare him down', 'Make an example of him'] },
        { text: 'Two gang lookouts are watching the party from a rooftop, deciding whether to sell them out.', options: ['Pay them a visit', 'Let them see what happens to snitches'] }
    ],
    scholar: [
        { text: 'A cracked corporate data slate turns up in the wreckage, full of schematics nobody here can read at a glance.', options: ['Decode the corporate files', 'Study the fusion schematics'] },
        { text: 'The archive under the old transit office still has paper records from before the founders, if anyone can make sense of them.', options: ['Dig through the old records', 'Trace the founders\' first contracts'], location: 'office' },
        { text: 'A wounded technician mutters about an "Ascension protocol" before passing out. The terms are in a language only a lab would use.', options: ['Piece together the protocol', 'Cross-check it with public patents'] }
    ],
    spy: [
        { text: 'A courier from {enemySide} is moving through the crowd with a case cuffed to his wrist.', options: ['Tail the courier quietly', 'Plant a tracker and wait'], location: 'street' },
        { text: '{enemyNpc} is holding a meeting in a back room two floors up, and the vent system runs right past it.', options: ['Listen in through the vents', 'Bug the room and leave'], location: 'club' },
        { text: 'Someone has been following the party for three blocks. Clumsy, but persistent.', options: ['Turn the tables and follow them', 'Feed them a false trail'] }
    ],
    detective: [
        { text: 'The scorch marks here are wrong. Whatever blew up did not start where everyone says it did.', options: ['Follow the evidence trail', 'Find who cleaned up so fast'] },
        { text: 'A witness tells the same story three times, and it changes a little every time.', options: ['Question the witness again', 'Check her story against the cameras'] },
        { text: 'Every target {enemySide} hit this week shares one strange thing: a delivery from the same shell company.', options: ['Follow the deliveries', 'Look into the shell company'], location: 'warehouse' }
    ],
    medic: [
        { text: 'The clinic is overflowing. Crown Gene staff are only treating patients who can pay, and the rest are lined up along the wall.', options: ['Treat the wounded first', 'Trade medical help for intel'], location: 'hospital' },
        { text: 'One of the prisoners is barely breathing, and he is the only one who knows where {villain} is.', options: ['Stabilize him and ask later', 'Ask now, while he can still talk'] },
        { text: 'A kid in the crowd has an implant that is overheating behind his ear. Nobody else is moving.', options: ['Pull the implant out here', 'Rush him to the clinic'], location: 'hospital' }
    ],
    banker: [
        { text: 'A broker in a too-nice coat says he can sell the party exactly what they need to know. The price is steep and not negotiable, he says.', options: ['Buy the information', 'Follow the money instead'] },
        { text: 'The operation {enemySide} are running is expensive. Someone is paying for it, and money always leaves footprints.', options: ['Trace the payments', 'Freeze the accounts'], location: 'office' },
        { text: 'A loan shark is offering a quick line of credit for gear, with interest that would make a founder blush.', options: ['Take the loan, gear up now', 'Find a cheaper supplier'], location: 'shop' }
    ],
    crook: [
        { text: 'The access keys the party needs are clipped to the belt of a very bored security guard.', options: ['Steal the access keys', 'Forge new credentials'] },
        { text: 'A smuggler named Tilly runs goods through the tunnels and does not ask questions, for a price.', options: ['Hitch a ride with the smuggler', 'Rob the smuggler\'s stash'], location: 'sewer' },
        { text: 'The evidence locker is two doors down, and the lock is older than half the party.', options: ['Crack the locker tonight', 'Swap the evidence for fakes'] }
    ],
    electrician: [
        { text: 'A junction box hums behind a chain-link fence. Everything on this block, cameras included, runs through it.', options: ['Cut the district power', 'Hijack the security grid'] },
        { text: 'The tunnels are lined with old Particle Genesis conduit, still live, and {enemySide} are using it to power their gear.', options: ['Overload their power line', 'Tap the line and listen'], location: 'sewer' },
        { text: 'A fusion cell in the depot is leaking just enough to make the lights flicker. Someone should deal with that before it deals with everyone.', options: ['Stabilize the fusion cell', 'Rig it as a distraction'], location: 'warehouse' }
    ],
    navigator: [
        { text: 'Two routes lead to where {enemySide} are holed up. Both are bad; they are bad in different ways.', options: ['Take the tunnels', 'Cut across the rooftops'] },
        { text: 'Division has closed the main roads. The city has a hundred side streets, and most of them lead somewhere.', options: ['Take the back alleys', 'Ride the freight line'], location: 'street' },
        { text: 'The fastest way to {villain} goes straight through a district the party really should not be seen in.', options: ['Go through anyway', 'Take the long way around'] }
    ]
};

const OWNER_FRAMES = [
    'Everyone looks at {owner}. Nobody here is better at {skill}, and that makes it {owner}\'s call.',
    '{owner} has the most experience with this kind of thing, which means the decision lands on {owner}.',
    'It\'s {owner}\'s call. Talk it through, but {owner} decides.',
    'This needs someone good at {skill}. The others turn to {owner} and wait.'
];

// What each decision attribute is good for, phrased to fit "good at ...".
const SKILL_PHRASES = {
    politician: 'talking people around',
    intimidation: 'leaning on people',
    scholar: 'reading what nobody else can',
    spy: 'not being seen',
    detective: 'noticing what doesn\'t fit',
    medic: 'keeping people alive',
    banker: 'following the money',
    crook: 'bending the rules quietly',
    electrician: 'anything with a wire in it',
    navigator: 'knowing the streets'
};

// A last word on how a decision landed, in the voice of the skill behind it.
const AFTERTASTE = {
    politician: 'Word spreads fast. By tonight, half the block will have an opinion about the party.',
    intimidation: 'Nobody will be sleeping easy on this street for a while.',
    scholar: 'The more they learn, the less the official story holds together.',
    spy: 'Whoever was watching never knew they were being watched back.',
    detective: 'Another piece clicks into place. The picture it makes is not a pretty one.',
    medic: 'The people they patched up won\'t forget it.',
    banker: 'Money talks. This time it said a lot.',
    crook: 'Somewhere, an alarm that should have gone off stays quiet.',
    electrician: 'Every light on the block flickers once, like the city noticed.',
    navigator: 'They know a way through now that most of the city has forgotten.'
};

// ---------------------------------------------------------------------------
// Consequences of a decision: how it went (clean, complicated, or costly)
// ---------------------------------------------------------------------------

const CONSEQUENCES = {
    clean: [
        'It works better than anyone expected. {by} doesn\'t say "I told you so", but it\'s right there on their face.',
        'Clean, quiet and quick. Nobody says it out loud, but they\'re starting to work like a crew.',
        'For once the city cooperates. Nobody gets hurt, and the party walks away with exactly what it came for.',
        'It goes smoothly, which in this city is almost suspicious.'
    ],
    complication: [
        'It works, mostly. Somewhere along the way, someone from {enemySide} got a good look at {by}.',
        'It works, and then a camera nobody noticed swivels to follow them out. That will come back later.',
        'It gets done, but it takes twice as long as it should, and {enemyNpc} will hear about it by morning.',
        'The plan holds together right up until it doesn\'t. They get what they needed, and also a lot of attention they didn\'t.'
    ],
    cost: [
        'It works, but not for free. Someone on the street pays for it, and the party sees the look on their face.',
        'They get it done. On the way out, {someone} notices a kid watching from a doorway, and wishes the kid hadn\'t seen any of it.',
        'They get what they wanted. {allyNpc} isn\'t happy about how they got it.',
        'It costs more than anyone wants to admit out loud, and {by} is quiet for a while afterward.'
    ]
};

const CHOICE_ECHO = [
    '{by} made the call: {choice}.',
    '{by} decides to {choice}, and nobody argues for long.',
    'In the end, {by} chooses to {choice}.'
];

// ---------------------------------------------------------------------------
// After a fight
// ---------------------------------------------------------------------------

const AFTERMATH = [
    'The last shot echoes off the walls and then it\'s quiet, the kind of quiet that rings. {someone} is the first to lower their weapon.',
    'Smoke drifts across {place}. Somewhere a siren starts and then thinks better of it.',
    '{someone} checks the bodies for anything useful and comes up with a data chip, a half-eaten protein bar, and a bad feeling.',
    'Nobody celebrates. {someone} leans against the wall until their hands stop shaking.',
    'It is over, for now. Across the street, a curtain twitches; somebody saw all of it.'
];

const BOSS_DEFEATED = {
    enforcer_the_architect: ['The Architect\'s prism cracks down the middle, and every drone in the tower drops out of the air at once.', '"You have no idea what you just turned off," The Architect says, very calmly, before the lights go out.'],
    enforcer_macro_hull: ['Macro Hull hits the floor hard enough to shake the catwalks, his core sputtering like a dying engine.', '"Lights out," Macro Hull rumbles, almost fondly, and then his do.'],
    enforcer_genisis: ['Genisis sinks to her knees, her mechanical arms folding in around her one by one. "Sloppy," she murmurs. "I was so close."', '"You have no idea what you just ended," Genisis says, and for once her hands are shaking.'],
    rebel_garret_maxwell: ['Garret Maxwell lowers the cannon, breathing hard. "They built a power plant on my parents\' street," he says. "Remember that."', '"Tell the cells to keep going," Garret Maxwell says, and finally sits down.'],
    rebel_levi_wicker: ['Levi Wicker slides down the wall, both blades still lit. "My parents started this," he says quietly. "Somebody has to finish it."', '"You don\'t get to end this," Levi Wicker says through gritted teeth, and then he stops getting up.'],
    rebel_virgil_wesley: ['Virgil Wesley drops to one knee, daggers dimming. "My brother used to win these," he says. "I never did."', '"You can beat me," Virgil Wesley says. "You can\'t beat what I stand for."']
};

const NEXT_ACT = [
    'Which only leaves the next problem: {goal}',
    'Nobody gets to rest long. Next: {goal}',
    'By morning, {allyNpc} has a new job for them: {goal}'
];

// ---------------------------------------------------------------------------
// Into the next fight
// ---------------------------------------------------------------------------

const TRANSITIONS = [
    'They don\'t get far before it all goes wrong.',
    'It is quiet for exactly as long as it takes to get comfortable.',
    '{someone} hears it first: boots, a lot of them, coming fast.',
    'The comm crackles with a warning that arrives about five seconds too late.'
];

// The act's villain casting a shadow over the scenes before the fight (see foreshadowing in
// storyEngine.js for the AI's version).
const BOSS_FORESHADOWING = {
    enforcer_the_architect: [
        'Every screen on the block switches to the same Singularity ad for a second: a calm man with a halo of light, smiling. "Ingram Robles," someone mutters. "The Architect."',
        'A delivery robot stops, scans the party, and rolls on. Everyone here knows who taught the machines to do that.',
        'An old programmer at a noodle stand says The Architect broke computing wide open with quantum bits, then patented it before anyone else could catch up.',
        'The drones overhead fly a tighter pattern than usual, the way they do when somebody important is watching.',
        'Graffiti on a wall shows a halo over a skull. Underneath: THE ARCHITECT SEES YOU.'
    ],
    enforcer_macro_hull: [
        'The streetlights flicker in time, a slow heartbeat from a fusion plant somewhere. People say Marco Hall can feel every one of them.',
        'A news feed replays old footage: a young navy engineer on a submarine deck, then the same man, older and enormous, cutting the ribbon on a reactor.',
        'A worker in a Particle Genesis jumpsuit says the boss walks the plant floor himself these days, in a suit that hums like a reactor.',
        'The air near the substation tastes like metal. Somewhere in the city, Macro Hull\'s plants are running hotter than they should.',
        'Everyone knows the joke: Particle Genesis keeps the lights on, and Marco Hall decides who pays for it.'
    ],
    enforcer_genisis: [
        'A Crown Gene billboard promises "Better than the original." In the corner, in small print, a signature: R. Walker.',
        'A man with a brand-new mechanical arm flexes it nervously at a bus stop. "Dr. Walker did it herself," he says. He doesn\'t sound happy about it.',
        'A nurse on a smoke break mutters about patients who go down to Crown Gene\'s sublevels and come back different, if they come back.',
        'Someone has painted spider legs around a Crown Gene logo. Everyone seems to know what it means.',
        'The clinic\'s waiting-room screens show a woman in a white coat with white hair, very calm: "The future of the body is already here."'
    ],
    rebel_garret_maxwell: [
        'An old woman lights a candle at the memorial wall for the district the fusion explosion took. One name has fresh flowers: Maxwell.',
        'Rebel graffiti here is signed with a hammer. The Enforcers paint over it every morning, and it\'s back every night.',
        'A rebel kid talks about Garret Maxwell like he\'s weather: "He was there before there was a rebellion. He\'ll be there after."',
        'A Particle Genesis plant looms over the rooftops, built on a street that used to have homes on it. Someone has written GARRET REMEMBERS on the fence.',
        'The Division briefing lists Garret Maxwell\'s last known location three times, and each one is a different power plant.'
    ],
    rebel_levi_wicker: [
        'A rebel recruit wears a patch with two crossed blades. "Levi\'s," she says, proud. "His parents started all this."',
        'Two older rebels argue about whether a twenty-six-year-old should be giving them orders. Neither of them actually disobeys.',
        'An Enforcer wanted poster for Levi Wicker has been torn down and taped back up so many times the tape looks like scar tissue.',
        'Someone tells the story of the raid that killed Levi Wicker\'s parents, and everyone nearby goes quiet.',
        'Chalk on the pavement: a pair of blades and the words FINISH WHAT THEY STARTED.'
    ],
    rebel_virgil_wesley: [
        'A rebel fighter practices with two training knives, copying moves everyone says came from Virgil Wesley.',
        'A mural of a man with a red scarf and two glowing daggers covers half a building. Nobody has painted over it.',
        'A rebel says Virgil Wesley didn\'t even believe in the cause until an Enforcer raid killed his brother. Now he\'s the cause\'s favorite face.',
        'Division posters call Virgil Wesley the most dangerous fighter in the city. The rebels have started hanging them up themselves.',
        'Someone hums a song about a man who lost his brother and found a war. The chorus is just a name: Wesley.'
    ]
};

const BOSS_ENTRANCES = {
    enforcer_the_architect: ['The Architect steps out from behind a wall of glass, hands folded. "You are confused," he says, gently. "Let me correct that."'],
    enforcer_macro_hull: ['Macro Hull fills the doorway, his core glowing through his chest plate. "You want the lights off?" he booms. "Come and turn them off."'],
    enforcer_genisis: ['Genisis steps out of the operating theater, white coat spotless, mechanical arms unfolding behind her like a spider waking up. "Hold still," she says. "This is delicate work."'],
    rebel_garret_maxwell: ['Garret Maxwell rests the cannon-hammer on his shoulder. "Nothing personal," he says. "I just don\'t let them build on graves anymore."'],
    rebel_levi_wicker: ['Levi Wicker steps out of the dark with both blades lit. "My parents gave their lives for this," he says. "You\'re not taking it."'],
    rebel_virgil_wesley: ['Virgil Wesley spins a glowing dagger in each hand. "My brother died in a raid like this one," he says. "Let\'s see how you do."']
};

const FIGHT_STARTS = [
    'Then the shooting starts.',
    'No more talking.',
    'Weapons come up on both sides.',
    'Here we go.'
];

// ---------------------------------------------------------------------------
// The end
// ---------------------------------------------------------------------------

const ROLE_CLOSINGS = {
    Tank: ['{name} finally puts the weapon down and leaves it there.', '{name} stands guard at the door one more night, out of habit.'],
    DPS: ['{name} walks off alone, which is how {name} prefers it.', '{name} laughs for the first time in weeks.'],
    Support: ['{name} spends the next morning patching up strangers.', '{name} sits on a curb and just breathes for a while.']
};

const ENDINGS = {
    rebels: [
        'The founders\' towers go dark one by one, and for the first time in a generation the city has to decide for itself what happens next.',
        'The corporations are broken, but the rebellion is tired, and tired people make hard choices. The city wakes up different, if not better.'
    ],
    enforcers: [
        'Order holds. The streets are quiet, the towers stay lit, and the party knows better than anyone what that quiet cost.',
        'The rebellion is broken, but so is the story Division told about itself, and the party has the proof in their pocket.'
    ]
};

// ---------------------------------------------------------------------------
// Shop
// ---------------------------------------------------------------------------

const SHOP_INTROS = [
    'Dex "Static" Moreno slides open the door of his shipping container, and salvaged signs buzz to life over racks of gear. "Credits up front," he says. "Questions never."',
    'Dex\'s shop smells like solder and instant noodles. "Look who survived," he says. "Spend some of that luck before it runs out."'
];
const SHOP_MORE = [
    'Dex taps the counter. "Anything else, or are you just warming my floor?"',
    'Dex pulls a dusty case from under the counter. "For you? A discount. A small one. Don\'t tell anyone."'
];

// ---------------------------------------------------------------------------
// Callbacks to things party members said to people (personal dialogue)
// ---------------------------------------------------------------------------

const MOMENT_CALLBACKS = {
    warm: [
        '{npc} has been telling people about {by}. Good things, mostly.',
        'Someone mentions that {npcMid} put in a good word for {by}. Doors open a little easier today.'
    ],
    cold: [
        '{npc} hasn\'t forgotten what {by} said. People are a little quicker to look away today.',
        'Word of how {by} talked to {npcMid} has gotten around, and not everyone liked it.'
    ]
};

// A thread an answer started, paid off: the lead itself, introduced by a short beat.
const THREAD_LEAD_INS = [
    'What {by} said earlier is already catching up with them.',
    'The conversation with {npcMid} hasn\'t stayed a conversation.',
    'Things said in passing have a way of coming back around.',
    '{by}\'s answer earlier is still rippling outward.'
];

function momentCallback(hints, tools, recent = []) {
    const moments = hints.personalMoments || [];
    if (moments.length === 0) return null;
    const moment = moments[moments.length - 1];
    // A thread nobody has heard paid off yet comes first, every time.
    if (moment.lead && !recent.includes(moment.lead)) {
        recent.push(moment.lead);
        const npcMid = moment.npc.replace(/^A /, 'a ');
        return `${fill(tools.pick(THREAD_LEAD_INS), { npcMid, by: moment.by })} ${moment.lead}`;
    }
    if (!tools.chance(0.35)) return null;
    const pool = moment.tone === 'defiant' ? MOMENT_CALLBACKS.cold : MOMENT_CALLBACKS.warm;
    // "A checkpoint guard" starts a sentence; mid-sentence it's "a checkpoint guard".
    const npcMid = moment.npc.replace(/^A /, 'a ');
    return fill(tools.pick(pool), { npc: moment.npc, npcMid, by: moment.by });
}

// ---------------------------------------------------------------------------
// The writer
// ---------------------------------------------------------------------------

function contextFrom(hints, tools) {
    const party = (hints.party && hints.party.length
        ? hints.party
        : (hints.partyNames || []).map(name => ({ name, characterId: Object.keys(CHARACTERS).find(id => CHARACTERS[id].callsign === name), role: Object.values(CHARACTERS).find(c => c.callsign === name)?.role })));
    const names = party.map(member => member.name).filter(Boolean);
    const side = SIDES[hints.faction] || NEUTRAL_SIDE;
    const someone = () => (names.length ? tools.pick(names) : 'Someone');
    const hasOwner = !!hints.ownerName && hints.ownerName !== 'the party';
    const ownerName = hasOwner ? hints.ownerName : (names[0] || 'the party');
    return {
        party,
        names,
        side,
        ownerName,
        hasOwner,
        values: () => ({
            someone: someone(),
            owner: ownerName,
            place: PLACES[hints.location] || PLACES[hints.storyLocation] || 'the street',
            allySide: side.name,
            enemySide: side.enemy,
            allyNpc: side.allyNpc,
            enemyNpc: side.enemyNpc,
            villain: hints.villain || 'whoever is running this',
            skill: SKILL_PHRASES[hints.attribute] || (DECISION_ATTRIBUTES[hints.attribute] || 'this').split(',')[0]
        })
    };
}

function consequence(hints, tools, ctx) {
    const last = (hints.decisions || []).slice(-1)[0];
    const choice = hints.lastChoice;
    if (!choice) return [];
    const by = last?.by || ctx.ownerName;
    const roll = tools.roll();
    const kind = roll < 0.45 ? 'clean' : roll < 0.8 ? 'complication' : 'cost';
    const values = { ...ctx.values(), by, choice: lowerFirst(choice).replace(/[.!]$/, '') };
    const lines = [fill(tools.pick(CHOICE_ECHO), values), fill(tools.pick(CONSEQUENCES[kind]), values)];
    if (last?.attribute && AFTERTASTE[last.attribute] && tools.chance(0.5)) lines.push(AFTERTASTE[last.attribute]);
    return lines;
}

/**
 * One story beat for the offline narrator.
 * @param {object} hints - what the story engine knows (see writeStoryBeat in storyEngine.js)
 * @param {() => number} random
 * @param {Array} [recent] - lines used lately (kept by the caller between beats) to avoid repeats
 * @returns {{ narration, options, location, memory }}
 */
export function mockStoryBeat(hints = {}, random = Math.random, recent = []) {
    const tools = makeTools(random, recent);
    const ctx = contextFrom(hints, tools);
    const v = ctx.values();
    const lines = [];
    let options = [];
    let location = hints.location || 'none';
    let memory = '';

    switch (hints.eventType) {
        case 'game_start': {
            lines.push(opening(hints, tools, ctx));
            options = hints.fixedOptions || [];
            memory = 'The party was caught in the chaos and had to choose a side.';
            break;
        }
        case 'faction': {
            lines.push(tools.pick(COMMIT[hints.faction] || COMMIT.rebels), tools.pick(ERUPT));
            memory = `The party joined ${ctx.side.name}.`;
            break;
        }
        case 'shop_intro':
        case 'shop_continue': {
            lines.push(tools.pick(hints.eventType === 'shop_intro' ? SHOP_INTROS : SHOP_MORE));
            if (hints.eventType === 'shop_intro') lines.push(`${ctx.ownerName} handles the money. Everyone else tries not to touch anything expensive.`);
            options = hints.fixedOptions || [];
            break;
        }
        case 'ending': {
            const decisions = hints.decisions || [];
            lines.push(tools.pick(ENDINGS[hints.faction] || ENDINGS.rebels));
            if (decisions.length >= 2) {
                lines.push(`It started when ${decisions[0].by} chose to ${lowerFirst(decisions[0].choice)}, and it ended with ${decisions[decisions.length - 1].by} choosing to ${lowerFirst(decisions[decisions.length - 1].choice)}. Everything in between still matters.`);
            }
            for (const member of ctx.party.slice(0, 6)) {
                lines.push(fill(tools.pick(ROLE_CLOSINGS[member.role] || ROLE_CLOSINGS.DPS), { name: member.name }));
            }
            const moment = (hints.personalMoments || []).slice(-1)[0];
            if (moment) lines.push(`Somewhere, ${moment.npc.replace(/^A /, 'a ')} still tells the story of what ${moment.by} said to them.`);
            lines.push(`"So what now?" Ines Calder asks. Nobody has an answer yet, and that feels like a start.`);
            memory = 'The campaign ended.';
            break;
        }
        default: {
            // A decision just made (or a fight just won), then either the next decision or the next fight.
            lines.push(...consequence(hints, tools, ctx));

            if (hints.eventType === 'encounter_end') {
                if (hints.defeatedBossId && BOSS_DEFEATED[hints.defeatedBossId]) lines.push(tools.pick(BOSS_DEFEATED[hints.defeatedBossId]));
                else lines.push(fill(tools.pick(AFTERMATH), v));
                if (hints.nextActGoal) lines.push(fill(tools.pick(NEXT_ACT), { ...v, goal: lowerFirst(hints.nextActGoal) }));
            }

            if (hints.startsCombat) {
                // A thread an earlier answer started can be what this fight grows out of.
                const thread = momentCallback(hints, tools, recent);
                if (thread) lines.push(thread);
                lines.push(fill(tools.pick(TRANSITIONS), v));
                // The campaign's fight setups are written as outlines ("Assault on the tower..."), so lead into them.
                if (hints.setup) lines.push(sentence(`${tools.pick(['The job: ', 'Next stop: ', 'What comes next: '])}${lowerFirst(hints.setup)}`));
                if (hints.bossId && BOSS_ENTRANCES[hints.bossId]) lines.push(tools.pick(BOSS_ENTRANCES[hints.bossId]));
                lines.push(tools.pick(FIGHT_STARTS));
                memory = hints.setup || 'Another fight broke out.';
            } else if (hints.needsOptions) {
                const callback = momentCallback(hints, tools, recent);
                if (callback) lines.push(callback);
                // The villain casts a shadow: always right before their fight, often before that.
                const shadow = BOSS_FORESHADOWING[hints.villainId];
                if (shadow && (hints.bossNext || tools.chance(0.5))) lines.push(tools.pick(shadow));
                const situation = tools.pick(SITUATIONS[hints.attribute] || SITUATIONS.navigator);
                lines.push(fill(situation.text, v));
                // With a personal moment coming first, whose call it is gets said after it.
                if (!hints.deferDecisionFrame) lines.push(fill(tools.pick(OWNER_FRAMES), v));
                options = hints.fixedOptions || situation.options;
                location = situation.location || 'none';
                memory = hints.lastChoice ? `${ctx.ownerName} faced a new decision after the party chose to ${lowerFirst(hints.lastChoice)}.` : `${ctx.ownerName} faced a new decision.`;
            }
            break;
        }
    }

    return {
        narration: lines.map(sentence).filter(Boolean).join(' '),
        options,
        location,
        memory: memory || `${ctx.names[0] || 'The party'} pressed on.`
    };
}

// Exposed for tests: every situation the offline narrator can offer, with its options.
export const MOCK_SITUATIONS = SITUATIONS;
