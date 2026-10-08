// Pre-written text used when the AI is unavailable, slow, or rate limited, so the game never stalls.

export const OPTIONS_BY_ATTRIBUTE = {
  politician: ['Negotiate safe passage', 'Rally the crowd to our side'],
  intimidation: ['Lean on the informant', 'Make an example of the guard'],
  scholar: ['Decode the corporate files', 'Study the fusion schematics'],
  spy: ['Tail the courier quietly', 'Plant a tracker and wait'],
  detective: ['Follow the evidence trail', 'Question the witness again'],
  medic: ['Treat the wounded first', 'Trade medical help for intel'],
  banker: ['Buy the information', 'Follow the money instead'],
  crook: ['Steal the access keys', 'Forge new credentials'],
  electrician: ['Cut the district power', 'Hijack the security grid'],
  navigator: ['Take the tunnels', 'Cut across the rooftops']
};

export const DEFAULT_OPTIONS = ['Press forward', 'Take the careful route'];

export function optionsForAttribute(attribute) {
  return OPTIONS_BY_ATTRIBUTE[attribute] || DEFAULT_OPTIONS;
}

export const FALLBACK_NARRATION = {
  game_start: 'Smoke rolls across the market as Enforcers and masked rebels trade fire over the wreckage. A wounded vendor grabs the nearest of you: "They did this. Somebody has to choose a side." Both sides have seen you.',
  faction_choice: 'The party commits. There is no walking it back now, and the first shots are already coming your way.',
  choice_made: 'The decision is made. The city reacts the way it always does: fast, loud, and with someone else paying for it.',
  encounter_end: 'The fighting stops. In the ringing quiet the party catches its breath and looks at what it cost.',
  next_encounter: 'The trail leads on. Before anyone can settle, the next fight finds them.',
  shop_intro: 'Dex "Static" Moreno slides open his shipping-container shop. "Credits up front, questions never."',
  shop_continue: 'Dex taps the counter. "Anything else, or are you just warming my floor?"',
  chat_message: 'I could not reach the rules assistant just now. Try again in a moment, or ask a shorter question.',
  ending: 'The last enemy falls. The city does not cheer; it just keeps going. But it is not the same city, and the party is not the same crew that walked into the Twilight Market.'
};
