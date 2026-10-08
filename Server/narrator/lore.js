// World, cast, and setting facts the narrator is allowed to use.
// Character names here MUST match Client/src/Components/Characters.json (players see the callsign).
// Boss and NPC biographies marked DRAFT were written to fill gaps in the design doc; edit freely.

export const WORLD = `
A futuristic cyberpunk city, dark and grungy. After a wave of major technological inventions the city
devolved into a corporatocracy: three companies control all of the power and use it to benefit
themselves and keep control.

SINGULARITY rose first. After achieving artificial general intelligence it built robots to do
everything, took jobs away from low-level workers, and worked its way into every part of citizens'
lives through convenience until its control was guaranteed. Founded by Ingram Robles, "The Architect".

ALPHA GENESIS rose at the same time. It invented stable nuclear fusion cores of every size, able to
power any technology with energy to spare. That abundance let Singularity push its technology further
than anyone thought possible. It bulldozes neighborhoods to build its plants. Founded by Marco Hall.
Fusion cores react to certain resonant frequencies, which can make nearby electronics surge or fail.

CROWN GENE rose through necessity and desire. As robots outpaced people, Crown Gene offered body
modification: ways to put ever-improving technology into the human body. It created Neurochips, which
connect people to cyberspace and double as everyone's secure ID, plus replacements and upgrades for
every part of the body. It records the brain activity of every customer. Some Crown Gene implants are
abused as drugs (Neuroxin feeds the implant a steady stream of pleasure).

THE ENFORCERS were created jointly by the three companies to keep the people under control. They act
as judge, jury and executioner, punishing anyone who breaks the law or rises up against those in
power. Once a police force of people like any other; now more military than police, increasingly
replaced by combat robots built to catch criminals efficiently, even at the cost of civilians.

THE REBELLION is a loose resistance of displaced workers, hackers and veterans fighting to break the
corporatocracy. Salvaged tech, homemade weapons, hidden bases in maintenance tunnels. Some cells are
disciplined; some are willing to hurt civilians to win.

Neither side is clean. The corporations keep the lights on and the streets "safe"; the rebels fight
for freedom but leave wreckage behind them. The story should let both be understandable.
`.trim();

// Playable characters keyed by Characters.json id. Backstories come from the game's design doc.
// Players see the callsign, so narration should mostly use it.
export const CHARACTERS = {
  offensive_tank_1: {
    callsign: 'Shipment',
    realName: 'Dax Slater',
    pronouns: 'he/him',
    role: 'Tank',
    weapon: 'Hammer',
    bio: 'Grew up surrounded by drugs and crime: his mother was addicted to Neuroxin through her Crown Gene implant, and his father drowned in gambling debt and was dragged off to smuggle for the bookies. Big and intimidating, Dax survived, got pulled into smuggling with his father, and was moved to guarding when the mob saw his talent; in exchange they cut him loose from his father\'s debts. For years he guarded warehouses and shipments, fought rival gangs and Enforcers, and earned such a reputation that almost nobody tried to rob what he guarded. An Enforcer operation finally tore the organization down and jailed its leaders, which left him free for the first time.'
  },
  defensive_tank_2: {
    callsign: 'E.N.C.A.G.E',
    realName: 'ENCAGE',
    pronouns: 'it/its',
    role: 'Tank',
    weapon: 'Taser Shield',
    bio: 'Engineered Neurons for Conscious Autonomous Giant Enforcers: a secret program of all three corporations to build sentient Enforcer robots (Alpha Genesis power, Singularity AI, and Crown Gene\'s library of customer brain scans). Every earlier mind failed and was destroyed. This one passed every test, so the researchers experimented on it relentlessly to learn why, and it grew resentful, hid that resentment, and endured until they gave it a body. Then it escaped. The details of that day were buried and the program was shelved. It knows exactly who built it and what they wanted it for.'
  },
  spellcaster_dps_1: {
    callsign: 'Gene Shock',
    realName: 'Aaron Bray',
    pronouns: 'they/them',
    role: 'DPS',
    weapon: 'Ray Gun',
    bio: 'A bright student obsessed with Crown Gene\'s body modification tech, hired into its research and development team after winning design competitions. Most of their ideas were never approved for testing, so they tested them on their own body; some caused lasting damage, but they worked. Powered by fusion cores, they can now produce destructive effects that look like magic. Crown Gene fired them when it found out, but by then they had everything they needed.'
  },
  aggressive_dps_2: {
    callsign: 'Leo',
    realName: 'Leo Fisk',
    pronouns: 'he/him',
    role: 'DPS',
    weapon: 'Energy Sword',
    bio: 'Nicknamed Sellsword. Orphaned young and found starving by a band of mercenaries who raised him, taught him their trade and eventually paid him a share. When they retired, old or injured, he turned to bounty hunting, bringing wanted people to the Enforcers for good money, and spent it on advanced gear. His energy swords are easy to hide, quiet, and make armor useless: perfect for a solo hunter.'
  },
  traditional_warrior_dps_3: {
    callsign: 'Last Legion',
    realName: 'Julius Stein',
    pronouns: 'he/him',
    role: 'DPS',
    weapon: 'Shotgun',
    bio: 'Joined the Enforcers for steady work and was good at it: fast breach operations, swift justice, dependable when things got tight. When the corporations took over, automation replaced officers like him and the job turned colder. At forty-five he walked away. He now tends bar in a district the Enforcers used to patrol, listening more than he speaks. He says he is done with that life, but he still notices who walks in armed, who watches the exits, and which drones linger too long.'
  },
  healing_support_1: {
    callsign: 'Patchwork',
    realName: 'Milo Young',
    pronouns: 'he/him',
    role: 'Support',
    weapon: 'Drone',
    bio: 'From a comfortable middle-class family, fascinated by robots: he spent his allowance buying them and taking them apart. He invented a system that can scan and repair electronics it has never seen before, but never sold or shared it; he just loves to build. His masterpiece is a drone that can fight, repair machines and even heal living tissue.'
  },
  offensive_support_2: {
    callsign: 'Livewire',
    realName: 'Jack Foster',
    pronouns: 'he/him',
    role: 'Support',
    weapon: 'Electric Guitar',
    bio: 'Grew up in a tight-knit neighborhood where people looked out for each other, until Alpha Genesis took it to build a massive power plant and scattered everyone. Music was his constant; rock was his favorite. Playing near the plant, he discovered that fusion cores react to certain frequencies, surging or crashing nearby electronics, and that his guitar could become a weapon.'
  },
  jack_of_all_trades_support_3: {
    callsign: 'True North',
    realName: 'Audrey Miller',
    pronouns: 'she/her',
    role: 'Support',
    weapon: 'Energy Staff',
    bio: 'Idolized her father, an Enforcer who died rescuing a family from a collapsing building, and joined the force to live up to him. Trained in combat and first aid, she specialized in helping people and fought only when she had to. When the Enforcers became a military that sacrificed civilians for efficiency, she left: it was not the kind of Enforcer her father was.'
  },
  hacker_support_4: {
    callsign: 'Ghost Shell',
    realName: 'Nile Adair',
    pronouns: 'he/him',
    role: 'Support',
    weapon: 'Laptop',
    bio: 'Grew up in the slums and found that code was the one thing he fully controlled. Hacking came naturally: pranks first (overheating a neighbor\'s house, stalling traffic lights), then paid jobs stealing corporate data, cutting power to districts, even hacking the Enforcers to help someone escape. If they pay, he hacks. He never leaves traces, has never been caught, and has never met a system he could not get into.'
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
