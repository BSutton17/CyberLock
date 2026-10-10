// Campaign outline (DRAFT - written overnight; tune freely).
// Encounters follow STORY_COMBAT_FLOW in Client/src/GameComponents/Main/Main.jsx:
//   0 low, 1 medium, 2 BOSS, 3 low, 4 medium, 5 low, 6 BOSS, 7 low, 8 mini-boss, 9 FINAL BOSS
// `party` is the side the players chose; they fight the other side.

export const TOTAL_ENCOUNTERS = 10;
export const BOSS_ENCOUNTERS = [2, 6, 9];

const REBEL_PATH = {
  premise: 'The party joined the rebellion. Together with Commander Rhea Vance they work to break the three corporations one founder at a time. Captain Mara Kessler of Division is hunting them.',
  acts: [
    {
      title: 'Act I - Eyes in the Sky',
      encounters: [0, 1, 2],
      goal: 'Prove the Twilight Market bombing was a Division false flag and take down Singularity\'s surveillance grid by confronting its founder, The Architect.',
      boss: 'enforcer_the_architect'
    },
    {
      title: 'Act II - Blackout',
      encounters: [3, 4, 5, 6],
      goal: 'Cut Particle Genesis\'s grip on the city\'s power. Find the plant where Macro Hull is building a fusion weapon and stop him.',
      boss: 'enforcer_macro_hull'
    },
    {
      title: 'Act III - Ascension',
      encounters: [7, 8, 9],
      goal: 'Expose Project Ascension, the experiments Crown Gene\'s chief surgeon Renee Walker runs in its sublevels, free the people she is working on, and face her: Genisis.',
      boss: 'enforcer_genisis'
    }
  ],
  encounters: {
    0: { location: 'city_square', setup: 'The opening battle: Enforcers lock down the square after the blast.' },
    1: { location: 'street', setup: 'Division strike team raids the safehouse street where the party is regrouping.' },
    2: { location: 'office', setup: 'Assault on the Singularity tower floor where The Architect runs the surveillance grid.' },
    3: { location: 'sewer', setup: 'Enforcer bots sweep the maintenance tunnels after the tower falls.' },
    4: { location: 'warehouse', setup: 'A Particle Genesis depot shipping weaponized fusion cells.' },
    5: { location: 'hospital', setup: 'Division holds a clinic hostage to flush the rebels out.' },
    6: { location: 'warehouse', setup: 'The fusion plant: Macro Hull defends his weapon in person.' },
    7: { location: 'club', setup: 'Kessler\'s last ambush in the club where the rebellion meets.' },
    8: { location: 'hospital', setup: 'Crown Gene sublevels: a Division Chief guards the Project Ascension labs.' },
    9: { location: 'boss', setup: 'Final stand against Genisis in her operating theater in the heart of Crown Gene.' }
  },
  // Starting points only: the actual ending must grow out of the party's choices.
  ending: 'Possible directions: the founders fall and the city goes dark for the first time in a generation; the rebellion wins but becomes what it fought; a fragile truce brokered by the party; or a pyrrhic victory where the party pays the price. Pick whatever the party\'s choices earned.'
};

const ENFORCER_PATH = {
  premise: 'The party sided with the Enforcers. Captain Mara Kessler of Division sends them after the rebellion\'s leaders, but evidence keeps surfacing that Division is not innocent either. Commander Rhea Vance\'s cell is hunting them.',
  acts: [
    {
      title: 'Act I - Fallout',
      encounters: [0, 1, 2],
      goal: 'Find who really bombed the Twilight Market and stop Garret Maxwell, the rebel leader whose parents died in a fusion disaster, before his cell destroys a Particle Genesis plant with a whole district around it.',
      boss: 'rebel_garret_maxwell'
    },
    {
      title: 'Act II - Inheritance',
      encounters: [3, 4, 5, 6],
      goal: 'Hunt Levi Wicker, the young rebel leader carrying on the fight his parents died for, and learn why the rebellion follows a twenty-six-year-old.',
      boss: 'rebel_levi_wicker'
    },
    {
      title: 'Act III - The Symbol',
      encounters: [7, 8, 9],
      goal: 'Stop Virgil Wesley, the rebellion\'s best fighter and its symbol, who joined after an Enforcer raid killed his brother, and decide what to do with what the party now knows about Division.',
      boss: 'rebel_virgil_wesley'
    }
  ],
  encounters: {
    0: { location: 'city_square', setup: 'The opening battle: rebels fight their way out of the square after the blast.' },
    1: { location: 'street', setup: 'A rebel cell ambushes the party\'s patrol in the market streets.' },
    2: { location: 'warehouse', setup: 'Garret Maxwell leads a raid on a Particle Genesis depot, sister to the plant built on the street where his parents died.' },
    3: { location: 'club', setup: 'Raid on the club where rebels trade intel on Levi.' },
    4: { location: 'sewer', setup: 'Following Levi\'s trail through the maintenance tunnels.' },
    5: { location: 'street', setup: 'Rebels stage a protest to cover Levi\'s escape.' },
    6: { location: 'hospital', setup: 'Levi Wicker makes his stand at the safehouse where his parents ran the first rebel cell.' },
    7: { location: 'sewer', setup: 'Wesley\'s fighters use the tunnels they trained in to ambush the party.' },
    8: { location: 'club', setup: 'A Rebellion Chief guards the meeting where Wesley rallies the cells.' },
    9: { location: 'boss', setup: 'Final confrontation with Virgil Wesley at the site of the raid that killed his brother.' }
  },
  // Starting points only: the actual ending must grow out of the party's choices.
  ending: 'Possible directions: order is restored and the party becomes the corporations\' favorite weapon; the party exposes Division from the inside; they turn on their employers at the last moment; or they walk away from both sides. Pick whatever the party\'s choices earned.'
};

export const CAMPAIGN = {
  rebels: REBEL_PATH,
  enforcers: ENFORCER_PATH
};

export function getPath(partyFaction) {
  return CAMPAIGN[partyFaction] || null;
}

// Where the story stands before encounter `encounterIndex` (0-based).
export function getActFor(partyFaction, encounterIndex) {
  const path = getPath(partyFaction);
  if (!path) return null;
  const index = Math.max(0, Math.min(TOTAL_ENCOUNTERS - 1, Number(encounterIndex) || 0));
  const act = path.acts.find(candidate => candidate.encounters.includes(index)) || path.acts[path.acts.length - 1];
  return {
    act,
    actNumber: path.acts.indexOf(act) + 1,
    encounter: path.encounters[index] || null,
    isBossEncounter: BOSS_ENCOUNTERS.includes(index),
    isFinalEncounter: index === TOTAL_ENCOUNTERS - 1
  };
}

export function getCombatLocation(partyFaction, encounterIndex, fallback = 'street') {
  const path = getPath(partyFaction);
  const index = Math.max(0, Math.min(TOTAL_ENCOUNTERS - 1, Number(encounterIndex) || 0));
  return path?.encounters?.[index]?.location || fallback;
}
