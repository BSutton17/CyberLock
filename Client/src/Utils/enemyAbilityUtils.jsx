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
    const { level = 1, behavior = 'aggressive' } = enemy;
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

    const unlockedAbilityLevels = [1, 3, 5].filter(abilityLevel => level >= abilityLevel);

    unlockedAbilityLevels.forEach((abilityLevel) => {
        const matchingAbilities = getAbilitiesByLevelAndRole(abilityLevel, validRoles);
        const selectedAbility = selectRandomAbility(matchingAbilities);

        if (selectedAbility) {
            assignedAbilities.push({
                id: selectedAbility.id,
                name: selectedAbility.name,
                level: selectedAbility.level,
                role: selectedAbility.role
            });
            console.log(`[ENEMY ABILITIES] Assigned level ${abilityLevel} ability: ${selectedAbility.name}`);
        } else {
            console.warn(`[ENEMY ABILITIES] No level ${abilityLevel} ${validRoles.join('/')} abilities found`);
        }
    });

    return assignedAbilities;
}
