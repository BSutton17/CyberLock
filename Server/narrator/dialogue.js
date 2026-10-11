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
// its own (see writeDialogue in storyEngine.js). Every moment offers three answers: a straight
// one, a pushy one and a sly one.

// How an answer changes the NPC's opinion of the party.
export const TONE_EFFECT = { honest: 1, sly: 0, defiant: -1, silent: 0 };

// {character} = the party member, {npc} = who they're talking to, {side}/{enemySide} = the sides.
// Every answer is a different approach (straight, pushing back, or sly) with its own
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
        }
    },
    {
        kind: 'reply',
        npc: 'Ines Calder',
        intro: 'Ines Calder catches {character} by the sleeve before they can leave. "Do you even know who you\'re fighting for?"',
        honest: { text: 'Not really. We\'re figuring it out.', reaction: '"Good," Ines says. "The ones who are sure scare me more."', lead: 'Ines Calder decided the party can be trusted with what she saw, and plans to find them again soon.' },
        defiant: { text: 'We know enough.', reaction: 'Ines shakes her head slowly. "That\'s what they all say, right before they find out."', lead: 'Ines Calder went looking for someone else to tell what she saw, and the wrong people may find her first.' },
        sly: { text: 'Who do you think we\'re fighting for?', reaction: 'Ines narrows her eyes, then answers anyway: "For whoever pays. Prove me wrong." She tucks a data chip into {character}\'s pocket and walks off.', lead: 'Ines Calder slipped {character} an encrypted data chip that nobody has opened yet.' }
    },
    {
        kind: 'reply',
        npc: '{allyNpc}',
        intro: '{allyNpc} looks the party over, then settles on {character}. "Can I trust you with the next one, or do I need to babysit?"',
        honest: { text: 'You can trust us.', reaction: '{allyNpc} nods once. "Don\'t make me regret it."', lead: '{allyNpc} is giving the party the next job without a minder, which means no backup either.' },
        defiant: { text: 'We don\'t need a babysitter.', reaction: '{allyNpc}\'s jaw tightens. "We\'ll see."', lead: '{allyNpc} assigned someone to keep an eye on the party, and that someone reports everything they do.' },
        sly: { text: 'Depends. What are you not telling us?', reaction: '{allyNpc} is quiet for a beat too long. "Ask me again after the next one."', lead: '{allyNpc} is holding something back about the next job, and almost admitted it.' }
    },
    {
        kind: 'reply',
        npc: 'A wounded {enemySide} soldier',
        intro: 'A wounded {enemySide} soldier props himself up against the wall and glares at {character}. "Just finish it. That\'s what you people do, isn\'t it?"',
        honest: { text: 'That\'s not who we are.', reaction: 'The soldier stares at {character} like they\'re speaking another language. Then, quietly: "Thanks."', lead: 'A {enemySide} soldier the party spared owes them a life, and knows it.' },
        defiant: { text: 'Don\'t tempt us.', reaction: 'The soldier spits on the ground and looks away. Word of this will travel.', lead: 'Word spread on the {enemySide} side that the party shows no mercy, and they fight harder against them now.' },
        sly: { text: 'Tell us something useful and we\'ll think about it.', reaction: 'The soldier weighs it, then mutters a shift change time and a door code. "Now leave me alone."', lead: 'A wounded {enemySide} soldier gave the party a door code and a shift change time, which may or may not still be good.' }
    },
    {
        kind: 'reply',
        npc: 'A {side} recruit',
        intro: 'A {side} recruit who can\'t be older than seventeen keeps staring at {character}, and finally works up the nerve. "Is it true what they say about you? That you\'ve never lost?"',
        honest: { text: 'We\'ve lost plenty. We just keep going.', reaction: 'The recruit looks relieved, like {character} has given them permission to be scared.', lead: 'A young {side} recruit has started following the party\'s lead, and stays out of the dumbest fights because of it.' },
        defiant: { text: 'Stick around and find out.', reaction: 'The recruit grins and follows the party a little too closely for the rest of the day.', lead: 'An overeager {side} recruit keeps following the party into danger to prove themselves.' },
        sly: { text: 'Who told you that?', reaction: 'The recruit blinks. "Everyone\'s saying it. It\'s on the feeds." Somebody, somewhere, is spreading stories about the party on purpose.', lead: 'Someone is spreading stories about the party on the feeds, and nobody knows who or why.' }
    },
    {
        kind: 'reply',
        npc: '{enemyNpc}',
        intro: 'Every screen on the street flickers, and {enemyNpc}\'s face appears on all of them, looking right at {character}. "You could still walk away. Nobody would blame you."',
        honest: { text: 'We would.', reaction: '{enemyNpc} studies {character} through the screen. "Pity," they say, and the feed cuts out.', lead: '{enemyNpc} decided the party can\'t be talked down, and is planning to stop them for good.' },
        defiant: { text: 'Come and make us.', reaction: '{enemyNpc} smiles thinly. "I was hoping you\'d say that." The screens go black.', lead: '{enemyNpc} took it as a challenge and is coming after the party personally.' },
        sly: { text: 'What would you give us to walk?', reaction: '{enemyNpc} pauses, interested despite themselves. "More than you\'re worth. Think about it." A contact code scrolls across the bottom of every screen.', lead: '{enemyNpc} offered the party a deal and left a contact code, and the party\'s own side may have seen it.' }
    },
    {
        kind: 'reply',
        npc: 'A street kid',
        intro: 'A street kid plants herself in front of {character} with her arms crossed. "Are you the good guys or the bad guys?"',
        honest: { text: 'We\'re trying to be the good guys.', reaction: 'The kid considers this seriously, then nods. "Okay. Try harder."', lead: 'A street kid has decided to keep an eye on the party, and she is better at it than most spies.' },
        defiant: { text: 'Depends who you ask.', reaction: 'The kid rolls her eyes. "That means bad guys," she announces to nobody in particular.', lead: 'The street kids have decided the party are bad guys, and nobody on the street will talk to them now.' },
        sly: { text: 'Which would you rather we were?', reaction: 'The kid thinks hard. "The kind that pays," she says, and holds out her hand.', lead: 'A street kid is selling information about the party to anyone who pays, and also selling them information if they pay more.' }
    },
    {
        kind: 'reply',
        npc: 'A Division drone',
        intro: 'A Division drone drops out of the sky and hovers at eye level with {character}, its speaker crackling. "Citizen. State your business in this sector."',
        honest: { text: 'Heading home.', reaction: 'The drone scans {character} for a long, humming second, then rises away. Its red light lingers on the party all the way down the block.', lead: 'A Division drone tagged the party\'s faces as "monitored," and drones follow them at a distance now.' },
        defiant: { text: 'Mind your own business, tin can.', reaction: 'The drone chirps once and flies straight up. Thirty seconds later, two more arrive.', lead: 'The party is flagged as hostile on the Division drone network, and drones swarm wherever they go.' },
        sly: { text: 'Maintenance crew. We\'re here for you, actually.', reaction: 'The drone hesitates, then lowers itself for inspection, which is exactly when {character} pulls its memory card.', lead: 'The party pulled a memory card out of a Division drone, full of patrol footage nobody has looked through yet.' }
    },
    {
        kind: 'reply',
        npc: 'A {side} veteran',
        intro: 'A {side} veteran with a mechanical arm and a tired face sits down next to {character}. "Why do you even care who wins this? You don\'t look like a believer."',
        honest: { text: 'We care who gets hurt.', reaction: 'The veteran grunts. "Then you\'ll hate what comes next." He gets up and doesn\'t explain.', lead: 'A {side} veteran warned the party that the next operation will hurt a lot of civilians, and walked off before saying how.' },
        defiant: { text: 'We don\'t. We care who pays.', reaction: 'The veteran laughs, short and bitter. "Honest, at least." He slides a name across the table: someone who pays well.', lead: 'A {side} veteran pointed the party at a buyer who pays well for dangerous work, no questions asked.' },
        sly: { text: 'Why do you?', reaction: 'The veteran is quiet for a long time. "My unit. What\'s left of it." He nods at a photo on the wall with half the faces crossed out.', lead: 'A {side} veteran\'s old unit was wiped out on a mission nobody will talk about, and he wants to know why.' }
    },
    {
        kind: 'reply',
        npc: 'A nervous clinic doctor',
        intro: 'A doctor at a backstreet clinic blocks the door as the party arrives, and stares straight at {character}. "Every time people like you come through here, I lose patients. Why should I let you in?"',
        honest: { text: 'Because we\'re hurt, and we won\'t start anything.', reaction: 'The doctor sighs and steps aside. "Back room. Keep your weapons where I can see them."', lead: 'A backstreet clinic doctor agreed to patch up the party, and expects them to keep trouble away from her door.' },
        defiant: { text: 'Because we\'re coming in either way.', reaction: 'The doctor steps aside, but her hand goes to the phone on the wall the moment their backs are turned.', lead: 'A backstreet doctor reported the party to someone, and nobody knows which side she called.' },
        sly: { text: 'Because the people chasing us are worse.', reaction: 'The doctor\'s eyes go to the street behind them, then back. "Basement. Now."', lead: 'A backstreet doctor is hiding the party, and the people after them are working their way down the block.' }
    },
    {
        kind: 'reply',
        npc: 'Dex "Static" Moreno',
        intro: 'Dex "Static" Moreno leans over the counter toward {character}. "Little bird says you\'ve been making enemies. Should I be worried about selling to you?"',
        honest: { text: 'Probably. But we pay on time.', reaction: 'Dex laughs. "Best answer I\'ve heard all week." He knocks a little off the price.', lead: 'Dex "Static" Moreno is giving the party a regular\'s discount, and a regular\'s warnings when trouble asks about them.' },
        defiant: { text: 'Worry about the ones who don\'t pay.', reaction: 'Dex holds up both hands. "Easy." His smile doesn\'t reach his eyes.', lead: 'Dex "Static" Moreno is quietly selling information about the party to whoever asks.' },
        sly: { text: 'Depends. Who\'s the little bird?', reaction: 'Dex taps his nose. "Good question. Wrong price." He names a number.', lead: 'Dex "Static" Moreno knows who has been asking about the party, and will sell the name for the right price.' }
    },

    // ---- A party member asking an NPC ----
    {
        kind: 'ask',
        npc: 'Ines Calder',
        intro: 'Ines Calder is picking through the wreck of her stall, and she clearly saw more than she has told anyone. {character} has a moment to ask her something.',
        honest: { text: 'Ask what she saw that night.', told: '{character} asks Ines, gently, what she saw that night.', reaction: '"A Division van," Ines says quietly. "Parked behind the market an hour before. Nobody else seems to remember it."', lead: 'Ines Calder saw a Division van behind the market an hour before the bombing, and the party wants to find it.' },
        defiant: { text: 'Press her: who is she protecting?', told: '{character} asks Ines who she is protecting.', reaction: 'Ines\'s face closes like a door. "Myself," she says. "Same as you." She won\'t say more today.', lead: 'Ines Calder is protecting someone involved in the bombing, and shut the party out for asking.' },
        sly: { text: 'Ask who else has been asking her questions.', told: '{character} asks Ines who else has come around asking questions.', reaction: 'Ines glances at the street. "A man in a good coat. Twice. He wasn\'t buying anything."', lead: 'A man in an expensive coat has been asking Ines Calder about the bombing, and he will be back.' }
    },
    {
        kind: 'ask',
        npc: 'Dex "Static" Moreno',
        intro: 'Dex "Static" Moreno is leaning in his doorway, which means he is bored, which means he will talk. {character} has a chance to ask him something.',
        honest: { text: 'Ask what people are saying about the party.', told: '{character} asks Dex what people are saying about the party.', reaction: '"Depends who you ask," Dex says. "The ones who matter are scared of you. That\'s new."', lead: 'The people who run things in the city have started taking the party seriously, and scared people make bad decisions.' },
        defiant: { text: 'Ask what he\'s hiding in the back.', told: '{character} nods at the curtain behind the counter and asks what Dex is hiding back there.', reaction: '"Inventory," Dex says flatly, and pulls the curtain the rest of the way shut.', lead: 'Dex "Static" Moreno is hiding something, or someone, in his back room.' },
        sly: { text: 'Ask what he\'d pay for a good rumor.', told: '{character} asks Dex what a good rumor goes for these days.', reaction: 'Dex\'s eyebrows go up. "Depends on the rumor." They agree on a price for the next one the party brings him.', lead: 'Dex "Static" Moreno will pay the party for rumors, and anything they tell him will end up somewhere.' }
    },
    {
        kind: 'ask',
        npc: '{allyNpc}',
        intro: '{allyNpc} is going over a map, alone for once. {character} has a chance to ask something before the others come back.',
        honest: { text: 'Ask what the plan really is.', told: '{character} asks {allyNpc} what the plan really is.', reaction: '{allyNpc} taps the map. "Win the next fight. Then the one after that. Anyone who tells you more than that is lying."', lead: '{allyNpc} admitted there is no grand plan, only the next fight, and the party may need to make one.' },
        defiant: { text: 'Ask why we should keep taking orders.', told: '{character} asks {allyNpc} why the party should keep taking orders.', reaction: '"Because the alternative is taking them from the other side," {allyNpc} says, without looking up.', lead: '{allyNpc} is less sure of the party\'s loyalty now, and has started making backup plans without them.' },
        sly: { text: 'Ask who drew this map.', told: '{character} asks {allyNpc} who drew the map.', reaction: '{allyNpc} hesitates. "Someone on the inside. I can\'t tell you who." Their hand covers a signature in the corner.', lead: '{allyNpc} has a source inside the other side, and the source\'s signature is on the map.' }
    },
    {
        kind: 'ask',
        npc: 'A captured {enemySide} officer',
        intro: 'A captured {enemySide} officer sits on a crate with their hands bound, watching everyone. {character} gets a minute alone with them.',
        honest: { text: 'Ask what they\'re fighting for.', told: '{character} asks the officer what they are actually fighting for.', reaction: '"Same as you," the officer says. "Somebody I don\'t want to see hurt." It is not the answer anyone expected.', lead: 'A captured {enemySide} officer has family in the city they are trying to protect, and might deal for their safety.' },
        defiant: { text: 'Demand their next target.', told: '{character} leans in and demands the next target.', reaction: 'The officer smiles and says nothing at all, which tells everyone exactly how much they are not going to get.', lead: 'A captured {enemySide} officer refused to talk, and their people will come looking for them.' },
        sly: { text: 'Mention their side already wrote them off.', told: '{character} mentions, casually, that the officer\'s side has already written them off.', reaction: 'The officer laughs, but it comes out wrong. Then they start talking, slowly, about a meeting nobody was supposed to know about.', lead: 'A captured {enemySide} officer revealed a secret meeting between the leaders of both sides.' }
    },
    {
        kind: 'ask',
        npc: 'A courier with a sealed case',
        intro: 'A courier sits on the curb with a sealed case chained to one wrist, waiting for someone who is clearly late. {character} has a chance to ask them something.',
        honest: { text: 'Ask who they\'re waiting for.', told: '{character} asks the courier who they are waiting for.', reaction: '"Above my pay grade," the courier says, then glances at their watch. "And they\'re an hour late, which never happens."', lead: 'A courier\'s contact never showed up, and the sealed case is still out there waiting for a buyer.' },
        defiant: { text: 'Ask what\'s in the case, or else.', told: '{character} asks what\'s in the case, and makes it clear asking nicely is optional.', reaction: 'The courier bolts. The chain on the case rattles all the way down the alley.', lead: 'A spooked courier ran off with a sealed case, straight toward whoever was supposed to receive it.' },
        sly: { text: 'Offer to deliver it for them.', told: '{character} offers to take the delivery off the courier\'s hands.', reaction: 'The courier thinks about it way too seriously, then unlocks the chain. "Address is on the bottom. Don\'t open it."', lead: 'The party is carrying a sealed case they promised not to open, to an address they don\'t recognize.' }
    },
    {
        kind: 'ask',
        npc: 'A reporter with a camera drone',
        intro: 'A reporter is hiding in a doorway with a camera drone tucked under one arm, filming whatever she can. {character} catches her eye and gets a chance to ask her something.',
        honest: { text: 'Ask what she\'s seen today.', told: '{character} asks the reporter what she has seen today.', reaction: 'She plays back some footage. In the corner of one frame, someone in a corporate suit is directing Enforcers.', lead: 'A reporter has footage of a corporate executive directing Enforcers in the street, and nobody will air it.' },
        defiant: { text: 'Ask her to stop filming them.', told: '{character} asks the reporter to stop filming the party.', reaction: 'She lowers the drone, offended. "Fine. You\'ll be the ones without anyone telling your side."', lead: 'A reporter is telling the story of the fighting without the party\'s side of it, and it isn\'t flattering.' },
        sly: { text: 'Ask who she\'s really working for.', told: '{character} asks the reporter who she is really working for.', reaction: 'She grins. "Whoever doesn\'t own a news station." She offers {character} a card with a secure channel on it.', lead: 'An independent reporter gave the party a secure channel, and will broadcast what they send her.' }
    },
    {
        kind: 'ask',
        npc: 'A black-market surgeon',
        intro: 'A black-market surgeon is washing their hands in a basement sink, apron stained, humming. {character} has a chance to ask something before they turn around.',
        honest: { text: 'Ask what they\'re working on.', told: '{character} asks the surgeon what they are working on.', reaction: '"Taking out implants that phone home," the surgeon says. "Busy week. Lots of people suddenly don\'t want Crown Gene listening."', lead: 'People are paying to have Crown Gene implants removed, because the implants started reporting more than they should.' },
        defiant: { text: 'Ask who their last patient was.', told: '{character} asks who the surgeon\'s last patient was.', reaction: 'The surgeon turns, scalpel still in hand. "Somebody who appreciated discretion," they say. "Get out."', lead: 'A black-market surgeon threw the party out and will warn their clients the party came asking.' },
        sly: { text: 'Ask what they\'d charge to fix one of us.', told: '{character} asks what the surgeon would charge to work on the party.', reaction: 'The surgeon looks {character} over, professionally. "For you? A favor. A big one. Later."', lead: 'A black-market surgeon will treat the party in exchange for a favor they haven\'t named yet.' }
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
 * @param {string|null} options.faction - the side the party joined
 * @param {Set<number>} [options.used] - moments already used this campaign
 * @returns {{ id, exchange, kind, npc, intro, playerName, characterName, options }}
 *   `intro` is the narration that sets the moment up (it ends with the question, for 'reply').
 */
export function createDialogue({ target, faction = null, used = new Set(), random = Math.random, id = 'd1' }) {
    const values = { ...(SIDES[faction] || { side: 'street', enemySide: 'corporate', allyNpc: 'Dex "Static" Moreno', enemyNpc: 'Director Hale' }), character: target.characterName };
    const fresh = EXCHANGES.map((_, index) => index).filter(index => !used.has(index));
    const pool = fresh.length > 0 ? fresh : EXCHANGES.map((_, index) => index);
    const index = pool[Math.floor(random() * pool.length) % pool.length];
    const exchange = EXCHANGES[index];
    const npc = fill(exchange.npc, values);
    const withNpc = { ...values, npc };

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
// Separate paragraphs, like a book: the answer, the other person's reaction, back to the group.
export function followUpNarration(dialogue, option, { ownerName = null, random = Math.random } = {}) {
    const back = ownerName ? fill(BACK_TO_THE_GROUP[Math.floor(random() * BACK_TO_THE_GROUP.length) % BACK_TO_THE_GROUP.length], { owner: ownerName }) : '';
    return [option.told, option.reaction, back].map(part => String(part || '').trim()).filter(Boolean).join('\n\n');
}

// Exposed for tests.
export const DIALOGUE_EXCHANGES = EXCHANGES;
