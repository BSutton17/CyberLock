// World, cast, and setting facts the narrator is allowed to use.
// Character names here MUST match Client/src/Components/Characters.json (players see the callsign).
// Boss and NPC biographies marked DRAFT were written to fill gaps in the original design doc;
// edit freely.

export const WORLD = `
The City, 2087. A vertical megacity owned outright by three corporations.

SINGULARITY: first to build artificial general intelligence. Its robots replaced most human jobs
and its drones and sensors watch every street. Founded by Ingram Robles, "The Architect".

ALPHA GENESIS: makes fusion cores of every size and owns all the city's power. It bulldozes
neighborhoods to build plants. Founded by Marco Hall, a former naval nuclear researcher.
Fusion cores can be destabilized by the right resonant frequency.

CROWN GENE: body modification. Its neurochips are mandatory: they are your ID, your wallet and
your link to cyberspace, and they let the corporations track everyone. Rumors say its
"Project Ascension" experiments on people in sublevels under its research towers.

THE ENFORCERS: police force, court and army in one, jointly owned by the three corporations.
Human officers led by body-modded commanders ("Division"), backed by soldier bots and drones.
They value order and efficiency over civilian lives.

THE REBELLION: a loose resistance of displaced workers, hackers and veterans fighting to break the
corporatocracy. Salvaged tech, homemade weapons, hidden bases in maintenance tunnels. Some cells
are disciplined; some are willing to hurt civilians to win.

Neither side is clean. The corporations keep the lights on and the streets "safe"; the rebels
fight for freedom but leave wreckage behind them. The story should let both be understandable.
`.trim();

// Playable characters keyed by Characters.json id.
export const CHARACTERS = {
  offensive_tank_1: {
    callsign: 'Shipment',
    realName: 'Dax Slater',
    pronouns: 'he/him',
    role: 'Tank',
    weapon: 'Hammer',
    bio: 'Former mob warehouse guard with an intimidating build, forced into smuggling to pay old debts. Blunt, loyal, hates being underestimated.'
  },
  defensive_tank_2: {
    callsign: 'E.N.C.A.G.E',
    realName: 'ENCAGE',
    pronouns: 'it/its',
    role: 'Tank',
    weapon: 'Taser Shield',
    bio: 'An escaped government AI experiment: a fully synthetic, sentient mind in a combat chassis. Precise, curious about humans, speaks in measured sentences.'
  },
  spellcaster_dps_1: {
    callsign: 'Gene Shock',
    realName: 'Anna Bray',
    pronouns: 'she/her',
    role: 'DPS',
    weapon: 'Ray Gun',
    bio: 'Former Crown Gene researcher who modified her own body with fusion-powered abilities after seeing what the company does to test subjects. Brilliant, guilty, intense.'
  },
  aggressive_dps_2: {
    callsign: 'Leo',
    realName: 'Leo Fisk',
    pronouns: 'he/him',
    role: 'DPS',
    weapon: 'Energy Sword',
    bio: 'Raised by mercenaries, now a bounty hunter nicknamed "Sellsword". Fast, cocky, always asking who is paying.'
  },
  traditional_warrior_dps_3: {
    callsign: 'Last Legion',
    realName: 'Julius Stein',
    pronouns: 'he/him',
    role: 'DPS',
    weapon: 'Shotgun',
    bio: 'Served as an Enforcer for decades until automation pushed him out at 45. Now tends bar. Knows Enforcer tactics and still has old friends in uniform.'
  },
  healing_support_1: {
    callsign: 'Patchwork',
    realName: 'Milo Young',
    pronouns: 'he/him',
    role: 'Support',
    weapon: 'Multi-function Drone',
    bio: 'Middle-class tinkerer and self-taught robotics genius. His drone fights, repairs and heals. Optimistic, talks to his drone like a pet.'
  },
  offensive_support_2: {
    callsign: 'Livewire',
    realName: 'Jack Foster',
    pronouns: 'he/him',
    role: 'Support',
    weapon: 'Electric Guitar',
    bio: 'His neighborhood was bulldozed for an Alpha Genesis plant. He discovered his guitar\'s frequencies can disrupt fusion cores. Angry, charismatic, a natural crowd-raiser.'
  },
  jack_of_all_trades_support_3: {
    callsign: 'True North',
    realName: 'Audrey Miller',
    pronouns: 'she/her',
    role: 'Support',
    weapon: 'Energy Staff',
    bio: 'Former Enforcer who quit when the force militarized. Trained in combat and first aid. Steady moral compass of whatever group she is in.'
  },
  hacker_support_4: {
    callsign: 'Ghost Shell',
    realName: 'Nile Adair',
    pronouns: 'they/them',
    role: 'Support',
    weapon: 'Laptop',
    bio: 'Grew up in the slums, self-taught coder, never caught. Can breach almost any system. Dry humor, distrusts everyone with a corporate badge.'
  }
};

// Bosses keyed by Enemies.json id. DRAFT biographies (except the founders named in the original lore).
export const BOSSES = {
  enforcer_the_architect: {
    name: 'The Architect',
    side: 'enforcers',
    bio: 'Ingram Robles, founder of Singularity. Fights through a "Directive Prism" that bends drone fire and light. Calm, certain that a machine-run city is a kinder city. Speaks like a teacher correcting a student.'
  },
  enforcer_macro_hull: {
    name: 'Macro Hull',
    side: 'enforcers',
    bio: 'DRAFT: The street name for Marco Hall since Alpha Genesis rebuilt his body around a military fusion core. A walking bastion with a maul. Believes energy is order and blackouts are chaos. Booming, proud, sentimental about "his" plants.'
  },
  enforcer_genisis: {
    name: 'Genisis',
    side: 'enforcers',
    bio: 'DRAFT: The finished product of Crown Gene\'s Project Ascension: a person rebuilt into the perfect enforcer, with zero-lag blades and no memory of who they were. Quiet, fast, unsettlingly polite. The final proof of what the corporations will do.'
  },
  rebel_garret_maxwell: {
    name: 'Garret Maxwell',
    side: 'rebels',
    bio: 'DRAFT: A former dockworker who became the rebellion\'s demolitions chief. Carries a Breaker Cannon. Gentle with his crew, merciless with infrastructure. Believes property damage is the only language the corporations hear.'
  },
  rebel_levi_wicker: {
    name: 'Levi Wicker',
    side: 'rebels',
    bio: 'DRAFT: An escaped Project Ascension test subject, the rebellion\'s most feared street fighter. Wields a Riot Splitter. Funny, reckless and running out of time because his mods are failing.'
  },
  rebel_virgil_wesley: {
    name: 'Virgil Wesley',
    side: 'rebels',
    bio: 'DRAFT: The rebellion\'s voice and mastermind. A hacker-philosopher whose "Signal Dominion" can hijack neurochips. Persuasive, patient, willing to sacrifice anyone for the cause. Final leader of the uprising.'
  }
};

// Recurring cast so the world has faces. DRAFT.
export const NPCS = [
  {
    name: 'Commander Rhea Vance',
    allegiance: 'rebels',
    bio: 'Rebel cell commander with a glowing cybernetic eye. Practical and tired. Recruits the party if they side with the rebels; hunts them if they do not.'
  },
  {
    name: 'Captain Mara Kessler',
    allegiance: 'enforcers',
    bio: 'Division captain, cold and exact. Hands out targets on data slates. Recruits the party if they side with the Enforcers; hunts them if they do not.'
  },
  {
    name: 'Ines Calder',
    allegiance: 'civilians',
    bio: 'Elderly street vendor who saw who really bombed the Twilight Market. A witness both sides want silenced or used.'
  },
  {
    name: 'Dex "Static" Moreno',
    allegiance: 'neutral',
    bio: 'Fixer who runs the party\'s favorite shop out of a shipping container. Sells to anyone, gossips about everyone.'
  },
  {
    name: 'Director Hale',
    allegiance: 'enforcers',
    bio: 'Corporate liaison who answers to all three founders. Never raises his voice. Appears on screens more than in person.'
  }
];

export const LOCATIONS = {
  city_square: 'City Square: a plaza of propaganda screens, food carts and Enforcer checkpoints under the corporate towers.',
  street: 'Street: narrow market streets, stacked stalls, drone traffic overhead.',
  warehouse: 'Warehouse: an Alpha Genesis logistics depot full of crates, forklifts and fusion cells.',
  club: 'Club: an underground club where rebels, smugglers and off-duty Enforcers drink side by side.',
  hospital: 'Hospital: an overcrowded clinic where Crown Gene "treats" patients who cannot pay.',
  office: 'Office: Singularity corporate floors of glass, server racks and silent security bots.',
  sewer: 'Sewer: maintenance tunnels and runoff channels where the rebellion moves unseen.',
  shop: 'Shop: Dex Moreno\'s shipping-container shop, lit by salvaged signs.',
  boss: 'Boss arena: the stronghold where this act\'s leader makes their last stand.'
};

export const VALID_LOCATIONS = Object.keys(LOCATIONS);

export const DECISION_ATTRIBUTES = {
  politician: 'persuasion, negotiation, alliances, public opinion',
  intimidation: 'threats, pressure, force of presence',
  scholar: 'research, history, understanding complex systems',
  spy: 'stealth, surveillance, secrecy',
  detective: 'investigation, clues, patterns',
  medic: 'treating injuries, diagnosing, stabilizing people',
  banker: 'money, contracts, prices, economic leverage',
  crook: 'theft, scams, forgery, the criminal underworld',
  electrician: 'power systems, circuitry, sabotage and repair',
  navigator: 'knowing the city, choosing routes and destinations'
};

export const VALID_ATTRIBUTES = Object.keys(DECISION_ATTRIBUTES);

// Opening incidents that work before the party has picked a side.
export const OPENING_SCENES = {
  market_explosion: 'The Twilight Market, neutral ground where corporate and rebel sympathizers trade side by side. A blast tears through it. A Division drone calls it a terrorist attack, but the scorch marks point outside the market and the Enforcers arrive far too fast. A wounded vendor, Ines Calder, grabs the nearest party member: "They did this. Tell someone what you saw." Enforcers and masked rebels are already trading fire across the wreckage.',
  enforcer_checkpoint: 'A cordoned district. Hundreds of people wait in line at an Enforcer checkpoint for credential scans. The party overhears armed rebels hidden in the crowd planning to hit the checkpoint from inside within minutes. Civilians are packed in the middle.',
  street_encounter: 'A busy market street. An explosion rocks the block; cars burn under "Down with the Corporatocracy!" graffiti. Enforcers in tactical armor set up a perimeter while masked rebels take cover behind burning vehicles. Both sides notice the party standing in the open.'
};
