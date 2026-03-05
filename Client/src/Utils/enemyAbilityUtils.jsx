import { ABILITIES } from '../GameComponents/Main/AbilityStore';

const ENEMY_BANNED_ABILITY_IDS = new Set([
    'charge',
    'eagle_eye',
    'gtg',
    'iron_sharpens_iron',
    'zen',
    ''
]);

/**
 * Get all abilities filtered by level and role
 * @param {number} level - The ability level to filter by
 * @param {string[]} roles - Array of roles to filter by (e.g., ['DPS', 'Tank'])
 * @returns {Array} Array of ability objects matching criteria
 */
export function getAbilitiesByLevelAndRole(level, roles) {
    const allAbilities = Object.values(ABILITIES);
    return allAbilities.filter(ability => {
        if (ENEMY_BANNED_ABILITY_IDS.has(ability.id)) {
            return false;
        }
        const matchesLevel = ability.level === level;
        const matchesRole = roles.includes(ability.role);
        return matchesLevel && matchesRole;
    });
}

/**
 * Randomly select one ability from an array
 * @param {Array} abilitiesList - Array of abilities to choose from
 * @returns {Object|null} Random ability or null if array is empty
 */
export function selectRandomAbility(abilitiesList) {
    if (!abilitiesList || abilitiesList.length === 0) {
        return null;
    }
    const randomIndex = Math.floor(Math.random() * abilitiesList.length);
    return abilitiesList[randomIndex];
}

/**
 * Assign abilities to an enemy based on their level and behavior
 * @param {Object} enemy - The enemy object
 * @returns {Array} Array of ability objects assigned to the enemy
 */
export function assignEnemyAbilities(enemy) {
    const { level = 1, behavior = 'aggressive', role = 'DPS' } = enemy;
    const assignedAbilities = [];

    // Determine which ability roles are valid for this enemy
    let validRoles = [];
    
    if (behavior === 'aggressive') {
        validRoles = ['DPS'];
    } else if (behavior === 'defensive') {
        validRoles = ['DPS', 'Tank'];
    } else if (behavior === 'intelligent') {
        validRoles = ['DPS', 'Tank'];
    } else if (behavior === 'support') {
        validRoles = ['Support'];
    } else {
        // Default fallback
        validRoles = ['DPS'];
    }

    console.log(`[ENEMY ABILITIES] Assigning abilities for ${enemy.name} (level ${level}, behavior: ${behavior})`);
    console.log(`[ENEMY ABILITIES] Valid roles: ${validRoles.join(', ')}`);

    // For level 1 enemies: assign 1 level 1 ability
    if (level === 1) {
        const level1Abilities = getAbilitiesByLevelAndRole(1, validRoles);
        const selectedAbility = selectRandomAbility(level1Abilities);
        
        if (selectedAbility) {
            assignedAbilities.push({
                id: selectedAbility.id,
                name: selectedAbility.name,
                level: selectedAbility.level,
                role: selectedAbility.role
            });
            console.log(`[ENEMY ABILITIES] Assigned level 1 ability: ${selectedAbility.name}`);
        } else {
            console.warn(`[ENEMY ABILITIES] No level 1 ${validRoles.join('/')} abilities found`);
        }
    } 
    // For higher level enemies: assign 1 ability at their level + 1 level 1 ability
    else if (level > 1) {
        // Assign a level 1 ability
        const level1Abilities = getAbilitiesByLevelAndRole(1, validRoles);
        const level1Ability = selectRandomAbility(level1Abilities);
        
        if (level1Ability) {
            assignedAbilities.push({
                id: level1Ability.id,
                name: level1Ability.name,
                level: level1Ability.level,
                role: level1Ability.role
            });
            console.log(`[ENEMY ABILITIES] Assigned level 1 ability: ${level1Ability.name}`);
        }

        // Assign an ability at the enemy's level
        const levelMatchAbilities = getAbilitiesByLevelAndRole(level, validRoles);
        const levelMatchAbility = selectRandomAbility(levelMatchAbilities);
        
        if (levelMatchAbility) {
            assignedAbilities.push({
                id: levelMatchAbility.id,
                name: levelMatchAbility.name,
                level: levelMatchAbility.level,
                role: levelMatchAbility.role
            });
            console.log(`[ENEMY ABILITIES] Assigned level ${level} ability: ${levelMatchAbility.name}`);
        } else {
            console.warn(`[ENEMY ABILITIES] No level ${level} ${validRoles.join('/')} abilities found`);
        }
    }

    return assignedAbilities;
}
