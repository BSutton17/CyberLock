// Personal dialogue, told inside the narration. Two kinds of moment:
//   - an NPC talking to the group turns to ONE party member and asks them something ('reply');
//   - the group is with an NPC and one party member gets to ask them something ('ask').
// Only that player chooses, but everyone sees the moment in the narration and the choices on
// screen. Answers don't move the story to a new place; they change how the NPC feels about the
// party, which the NPC shows right away and the narrator is told about from then on.
//
// Every moment has a straight option and a pushy/defiant one, plus a special one when the player
// ranks a fitting attribute in their top three (a Politician can talk a guard around).
import { normalizeAttribute } from './decisions.js';

// How an answer changes the NPC's opinion of the party.
export const TONE_EFFECT = { honest: 1, skill: 2, defiant: -1, silent: 0 };

// {character} = the party member, {npc} = who they're talking to, {side}/{enemySide} = the sides.
// `told` is how the narration reports the choice; it defaults to {character}: "<text>".
const EXCHANGES = [
    // ---- NPCs asking a party member ----
    {
        kind: 'reply',
        npc: 'A checkpoint guard',
        intro: 'A checkpoint guard steps into the party\'s path and looks straight at {character}. "Why are you here?"',
        honest: { text: 'We\'re just passing through.', reaction: 'The guard studies {character} a second longer than he needs to, then waves the party on. "Keep it that way."' },
        defiant: { text: 'It\'s none of your business.', reaction: 'The guard\'s hand drifts to his baton. "Everything here is my business." He lets them pass, but he says {character}\'s name into his radio.' },
        skills: {
            politician: { text: 'We came to save someone.', reaction: 'Something in the guard\'s face softens. "Then go save them," he says quietly, and looks the other way.' },
            intimidation: { text: 'You really want to find out?', reaction: 'The guard swallows and steps aside. He won\'t forget {character}\'s face, but he won\'t stop them either.' },
            crook: { text: 'Delivery. Check the manifest.', reaction: 'The guard squints at a manifest that didn\'t exist a minute ago, shrugs, and stamps it.' }
        }
    },
    {
        kind: 'reply',
        npc: 'Ines Calder',
        intro: 'Ines Calder catches {character} by the sleeve before they can leave. "Do you even know who you\'re fighting for?"',
        honest: { text: 'Not really. We\'re figuring it out.', reaction: '"Good," Ines says. "The ones who are sure scare me more."' },
        defiant: { text: 'We know enough.', reaction: 'Ines shakes her head slowly. "That\'s what they all say, right before they find out."' },
        skills: {
            scholar: { text: 'Better than they know themselves.', reaction: 'Ines laughs, surprised. "Then maybe you\'ll be the ones who tell the truth about all this."' },
            detective: { text: 'We know who set off the bomb.', reaction: 'Ines goes very still. "Then be careful who you tell," she whispers.' },
            medic: { text: 'We\'re fighting for the people who get hurt.', reaction: 'Ines squeezes {character}\'s arm. "Then you\'re on the right side, whatever flag you\'re under."' }
        }
    },
    {
        kind: 'reply',
        npc: '{allyNpc}',
        intro: '{allyNpc} looks the party over, then settles on {character}. "Can I trust you with the next one, or do I need to babysit?"',
        honest: { text: 'You can trust us.', reaction: '{allyNpc} nods once. "Don\'t make me regret it."' },
        defiant: { text: 'We don\'t need a babysitter.', reaction: '{allyNpc}\'s jaw tightens. "We\'ll see."' },
        skills: {
            politician: { text: 'Trust is earned. We\'re earning it.', reaction: '{allyNpc} almost smiles. "Fair enough. Keep earning."' },
            navigator: { text: 'We know these streets better than your scouts.', reaction: '{allyNpc} hands over a map with half the routes crossed out. "Prove it."' },
            spy: { text: 'You won\'t even see us coming back.', reaction: '"That\'s what I\'m afraid of," {allyNpc} says, but there\'s respect in it.' }
        }
    },
    {
        kind: 'reply',
        npc: 'A wounded {enemySide} soldier',
        intro: 'A wounded {enemySide} soldier props himself up against the wall and glares at {character}. "Just finish it. That\'s what you people do, isn\'t it?"',
        honest: { text: 'That\'s not who we are.', reaction: 'The soldier stares at {character} like they\'re speaking another language. Then, quietly: "Thanks."' },
        defiant: { text: 'Don\'t tempt us.', reaction: 'The soldier spits on the ground and looks away. Word of this will travel.' },
        skills: {
            medic: { text: 'Hold still. This is going to sting.', told: '{character} kneels down and starts dressing the wound without a word.', reaction: 'The soldier flinches, then lets {character} work. "Why?" he asks. Nobody answers.' },
            intimidation: { text: 'Tell your friends what you saw today.', reaction: 'The soldier nods too fast. He will tell them, and they\'ll think twice.' },
            detective: { text: 'Tell us who gave the order, and you walk.', reaction: 'The soldier hesitates, then gives up a name. It\'s not one anyone expected.' }
        }
    },
    {
        kind: 'reply',
        npc: 'A {side} recruit',
        intro: 'A {side} recruit who can\'t be older than seventeen keeps staring at {character}, and finally works up the nerve. "Is it true what they say about you? That you\'ve never lost?"',
        honest: { text: 'We\'ve lost plenty. We just keep going.', reaction: 'The recruit looks relieved, like {character} has given them permission to be scared.' },
        defiant: { text: 'Stick around and find out.', reaction: 'The recruit grins and follows the party a little too closely for the rest of the day.' },
        skills: {
            politician: { text: 'It\'s true. And you\'re part of it now.', reaction: 'The recruit stands up straighter. By tomorrow the whole cell will be repeating it.' },
            medic: { text: 'Only because someone keeps patching us up.', reaction: 'The recruit laughs and asks if {character} can teach them to tie a tourniquet.' },
            scholar: { text: 'Winning isn\'t the same as being right.', reaction: 'The recruit frowns, thinking about it, and it clearly sticks.' }
        }
    },
    {
        kind: 'reply',
        npc: '{enemyNpc}',
        intro: 'Every screen on the street flickers, and {enemyNpc}\'s face appears on all of them, looking right at {character}. "You could still walk away. Nobody would blame you."',
        honest: { text: 'We would.', reaction: '{enemyNpc} studies {character} through the screen. "Pity," they say, and the feed cuts out.' },
        defiant: { text: 'Come and make us.', reaction: '{enemyNpc} smiles thinly. "I was hoping you\'d say that." The screens go black.' },
        skills: {
            intimidation: { text: 'You should be the one walking away.', reaction: 'For half a second, {enemyNpc} looks unsure. Then the feed cuts out.' },
            spy: { text: 'Nice office. We\'ll see you there soon.', reaction: '{enemyNpc}\'s eyes flick to something off-screen, just once. The feed cuts out fast.' },
            electrician: { text: 'Kill the feed mid-sentence.', told: '{character} pries open a junction box and yanks a cable.', reaction: 'Every screen on the street dies with a pop. Somewhere, {enemyNpc} is very annoyed.' }
        }
    },
    {
        kind: 'reply',
        npc: 'A street kid',
        intro: 'A street kid plants herself in front of {character} with her arms crossed. "Are you the good guys or the bad guys?"',
        honest: { text: 'We\'re trying to be the good guys.', reaction: 'The kid considers this seriously, then nods. "Okay. Try harder."' },
        defiant: { text: 'Depends who you ask.', reaction: 'The kid rolls her eyes. "That means bad guys," she announces to nobody in particular.' },
        skills: {
            navigator: { text: 'Know a quick way out of here?', reaction: 'The kid grins and points at a drainpipe nobody else noticed. "Ten credits."' },
            crook: { text: 'Flip her a coin.', told: '{character} flips the kid a coin. "Good guys tip."', reaction: 'The kid pockets it in one smooth motion and disappears. Later, a warning note turns up in {character}\'s pocket.' },
            medic: { text: 'You\'re bleeding. Let me see that.', reaction: 'The kid lets {character} clean the scrape and decides, firmly, that they\'re the good guys.' }
        }
    },

    // ---- A party member asking an NPC ----
    {
        kind: 'ask',
        npc: 'Ines Calder',
        intro: 'Ines Calder is picking through the wreck of her stall, and she clearly saw more than she has told anyone. {character} has a moment to ask her something.',
        honest: { text: 'Ask what she saw that night.', told: '{character} asks Ines, gently, what she saw that night.', reaction: '"A Division van," Ines says quietly. "Parked behind the market an hour before. Nobody else seems to remember it."' },
        defiant: { text: 'Press her: who is she protecting?', told: '{character} asks Ines who she is protecting.', reaction: 'Ines\'s face closes like a door. "Myself," she says. "Same as you." She won\'t say more today.' },
        skills: {
            detective: { text: 'Ask about the scorch marks.', told: '{character} asks Ines why the scorch marks point the wrong way.', reaction: 'Ines looks at {character} for a long moment. "Because it didn\'t come from inside," she says. "And whoever did it knew the market would be full."' },
            medic: { text: 'Ask about her burned hands first.', told: '{character} takes Ines\'s burned hands and asks how bad it is.', reaction: 'Ines lets {character} wrap them, and somewhere in the middle of it she starts talking: a van, a uniform, a man she has seen on the news.' },
            politician: { text: 'Ask what she needs to feel safe talking.', told: '{character} asks what it would take for Ines to feel safe telling the truth.', reaction: '"Somebody listening who isn\'t paid to forget," Ines says. "You\'ll do, for now."' }
        }
    },
    {
        kind: 'ask',
        npc: 'Dex "Static" Moreno',
        intro: 'Dex "Static" Moreno is leaning in his doorway, which means he is bored, which means he will talk. {character} has a chance to ask him something.',
        honest: { text: 'Ask what people are saying about the party.', told: '{character} asks Dex what people are saying about the party.', reaction: '"Depends who you ask," Dex says. "The ones who matter are scared of you. That\'s new."' },
        defiant: { text: 'Ask what he\'s hiding in the back.', told: '{character} nods at the curtain behind the counter and asks what Dex is hiding back there.', reaction: '"Inventory," Dex says flatly, and pulls the curtain the rest of the way shut.' },
        skills: {
            banker: { text: 'Ask who\'s been paying him lately.', told: '{character} asks Dex who has been paying him lately.', reaction: 'Dex lowers his voice. "Someone with Division money and no Division badge. Make of that what you want."' },
            crook: { text: 'Ask what fell off which truck.', told: '{character} asks Dex what has fallen off which truck this week.', reaction: 'Dex grins. "Fusion cells. Military grade. Off a truck that wasn\'t supposed to exist."' },
            electrician: { text: 'Ask why his lights keep flickering.', told: '{character} asks why every light in the shop keeps flickering.', reaction: '"Somebody\'s pulling a lot of power nearby," Dex says. "Started three days ago. You tell me."' }
        }
    },
    {
        kind: 'ask',
        npc: '{allyNpc}',
        intro: '{allyNpc} is going over a map, alone for once. {character} has a chance to ask something before the others come back.',
        honest: { text: 'Ask what the plan really is.', told: '{character} asks {allyNpc} what the plan really is.', reaction: '{allyNpc} taps the map. "Win the next fight. Then the one after that. Anyone who tells you more than that is lying."' },
        defiant: { text: 'Ask why we should keep taking orders.', told: '{character} asks {allyNpc} why the party should keep taking orders.', reaction: '"Because the alternative is taking them from the other side," {allyNpc} says, without looking up.' },
        skills: {
            scholar: { text: 'Ask how this ends, long term.', told: '{character} asks {allyNpc} how this ends, years from now.', reaction: '{allyNpc} is quiet for a long time. "I don\'t know," they say finally. "Nobody\'s ever asked me that."' },
            spy: { text: 'Ask who else is on the payroll.', told: '{character} asks {allyNpc}, quietly, who else is on the payroll.', reaction: '{allyNpc} glances at the door, then writes two names on the corner of the map and tears it off.' },
            navigator: { text: 'Ask about the routes she crossed out.', told: '{character} asks {allyNpc} why half the routes on the map are crossed out.', reaction: '"Compromised," {allyNpc} says. "All of them, in the last week. Someone is feeding the other side our maps."' }
        }
    },
    {
        kind: 'ask',
        npc: 'A captured {enemySide} officer',
        intro: 'A captured {enemySide} officer sits on a crate with their hands bound, watching everyone. {character} gets a minute alone with them.',
        honest: { text: 'Ask what they\'re fighting for.', told: '{character} asks the officer what they are actually fighting for.', reaction: '"Same as you," the officer says. "Somebody I don\'t want to see hurt." It is not the answer anyone expected.' },
        defiant: { text: 'Demand their next target.', told: '{character} leans in and demands the next target.', reaction: 'The officer smiles and says nothing at all, which tells everyone exactly how much they are not going to get.' },
        skills: {
            intimidation: { text: 'Lean in close and ask again.', told: '{character} leans in close and asks again, very quietly.', reaction: 'The officer\'s composure cracks. A location spills out, then a time.' },
            detective: { text: 'Ask about the ink stain on their cuff.', told: '{character} asks about the ink stain on the officer\'s cuff.', reaction: 'The officer glances down, too late. "Printed orders," they mutter. "Nobody trusts the network anymore."' },
            politician: { text: 'Offer them a way out.', told: '{character} offers the officer a way out of all this.', reaction: 'The officer laughs, but it comes out wrong. "Ask me again tomorrow," they say, and they sound like they mean it.' }
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
        reaction: fill(entry.reaction, withNpc)
    });

    const options = [];
    if (skill) options.push(option('skill', 'skill', exchange.skills[skill], skill));
    options.push(option('honest', 'honest', exchange.honest));
    options.push(option('defiant', 'defiant', exchange.defiant));
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
