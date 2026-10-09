// The last blow an ability lands on an enemy: two lines per damaging ability per enemy, split by
// the kind of ability so each file stays readable.
import { STRIKE_FINAL_BLOWS } from './finalBlowsStrikes.js';
import { AREA_FINAL_BLOWS } from './finalBlowsAreas.js';
import { LINGERING_FINAL_BLOWS } from './finalBlowsLingering.js';

export const FINAL_BLOWS = { ...STRIKE_FINAL_BLOWS, ...AREA_FINAL_BLOWS, ...LINGERING_FINAL_BLOWS };
