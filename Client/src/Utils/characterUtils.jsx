import { ABILITIES } from '../GameComponents/Main/AbilityStore';

//load in data from Ability Store
export const enrichCharacterAbilities = (character) => {
    // Create a copy to avoid mutating the original
    const enrichedCharacter = { ...character };
    
    // Enrich abilities
    if (character.abilities && Array.isArray(character.abilities)) {
        enrichedCharacter.abilities = character.abilities.map((abilityItem) => {
            const abilityId = typeof abilityItem === 'string' ? abilityItem : abilityItem?.id;
            const abilityData = abilityId ? ABILITIES[abilityId] : null;
            if (!abilityData) {
                console.error(`Ability not found in AbilityStore: ${abilityId}`);
                return {
                    id: abilityId,
                    name: 'Unknown Ability',
                    description: 'Ability data missing',
                    cooldown: 0
                };
            }
            return {
                id: abilityData.id,
                name: abilityData.name,
                description: abilityData.description,
                cooldown: abilityData.cooldown,
                range: abilityData.range,
                targetType: abilityData.targetType,
                damageScaling: abilityData.damageScaling
            };
        });
    }
    
    // Enrich ultimate
    if (character.ultimate) {
        const ultimateId = typeof character.ultimate === 'string' ? character.ultimate : character.ultimate?.id;
        const ultimateData = ultimateId ? ABILITIES[ultimateId] : null;
        if (!ultimateData) {
            console.error(`Ultimate not found in AbilityStore: ${ultimateId}`);
            enrichedCharacter.ultimate = {
                id: ultimateId,
                name: 'Unknown Ultimate',
                description: 'Ultimate data missing'
            };
        } else {
            enrichedCharacter.ultimate = {
                id: ultimateData.id,
                name: ultimateData.name,
                description: ultimateData.description,
                cooldown: ultimateData.cooldown,
                range: ultimateData.range,
                targetType: ultimateData.targetType,
                damageScaling: ultimateData.damageScaling
            };
        }
    }
    
    return enrichedCharacter;
};


export const enrichAllCharacters = (charactersData) => {
    return {
        ...charactersData,
        characters: charactersData.characters.map(enrichCharacterAbilities)
    };
};
