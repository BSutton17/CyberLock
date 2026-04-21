import { ABILITIES } from '../GameComponents/Main/AbilityStore';

const NON_COMBAT_ATTRIBUTES = [
    { id: 'politician', name: 'Politician', description: 'Politicians excel at persuasion, negotiation, and public influence. They thrive in situations involving diplomacy, alliances, or shifting public opinion.' },
    { id: 'intimidation', name: 'Intimidation', description: 'Characters with Intimidation can coerce others through threats or presence. They thrive when pressure, leverage, or force of personality is required.' },
    { id: 'scholar', name: 'Scholar', description: 'Scholars possess deep academic or historical knowledge. They thrive in situations that require research, deciphering ancient texts, or understanding complex systems and lore.' },
    { id: 'spy', name: 'Spy', description: 'Spies are information gatherers in settings that require stealth. They thrive in situations that require secrecy, surveillance, and precision.' },
    { id: 'detective', name: 'Detective', description: 'Detectives can sniff out a clue a mile away. They thrive in situations that require investigation, pattern recognition, or solving mysteries.' },
    { id: 'medic', name: 'Medic', description: 'Medics specialize in treatment and recovery outside of combat. They thrive when diagnosing illnesses, stabilizing injuries, or providing long-term care.' },
    { id: 'navigator', name: 'Navigator', description: 'Navigators know the city like the back of their hand. When deciding where to go, Navigators get the final say.' },
    { id: 'banker', name: 'Banker', description: 'Bankers understand money, contracts, and economic leverage. They thrive in situations involving financial literacy or negotiating prices.' },
    { id: 'crook', name: 'Crook', description: 'Crooks live on the edge of the law. They are familiar with navigating the criminal underworld.' },
    { id: 'electrician', name: 'Electrician', description: 'Electricians are experts in power systems and circuitry. They thrive when repairing, sabotaging, or rerouting electrical systems and technology.' }
];

const NON_COMBAT_ATTRIBUTE_MAP = Object.fromEntries(
    NON_COMBAT_ATTRIBUTES.map((attribute) => [attribute.id, attribute])
);

const summarizeAbility = (ability) => {
    if (!ability?.id) return null;

    return {
        id: ability.id,
        name: ability.name,
        description: ability.description,
        role: ability.role || null,
        level: ability.level ?? null,
        cooldown: ability.cooldown ?? null,
        range: ability.range ?? null,
        targetType: ability.targetType || null,
        type: ability.type || null,
        isUltimate: Boolean(ability.isUltimate),
        actionCost: ability.consumesAction === false ? 'bonus' : 'action'
    };
};

const summarizeWeapon = (weapon) => {
    if (!weapon?.name) return null;

    return {
        name: weapon.name,
        damage: weapon.damage ?? null,
        range: weapon.range ?? null
    };
};

const resolveAbility = (abilityLike) => {
    const abilityId = typeof abilityLike === 'string' ? abilityLike : abilityLike?.id;
    return abilityId ? ABILITIES[abilityId] || null : null;
};

const buildCurrentCharacterSummary = (character) => {
    if (!character?.id) return null;

    const abilities = Array.isArray(character.abilities)
        ? character.abilities.map(resolveAbility).map(summarizeAbility).filter(Boolean)
        : [];
    const ultimate = summarizeAbility(resolveAbility(character.ultimate));

    return {
        id: character.id,
        name: character.name,
        role: character.role || null,
        level: character.level ?? null,
        weapon: summarizeWeapon(character.weapon),
        abilities,
        ultimate
    };
};

const ABILITY_CATALOG = Object.values(ABILITIES)
    .map(summarizeAbility)
    .filter(Boolean)
    .sort((left, right) => left.name.localeCompare(right.name));

export const buildChatbotRulesContext = ({ playerName, playerCharacters, allPlayerAttributes }) => {
    const currentCharacter = buildCurrentCharacterSummary(playerCharacters?.[playerName]);
    const currentAttributeIds = Array.isArray(allPlayerAttributes?.[playerName])
        ? allPlayerAttributes[playerName].filter(Boolean)
        : [];

    return {
        authoritative: true,
        player: playerName || null,
        generalRules: {
            basicAttack: 'Select your weapon, then click an enemy in range.',
            ultimates: 'There is no separate ultimate gauge in the client code. Ultimates unlock at level 3, appear in the Ultimate section, and can be used when it is your turn, you are able to act, and the ultimate is not on cooldown.',
            bonusActions: 'Abilities with actionCost bonus are bonus actions. The game only allows them if you have not already used your bonus action this turn.',
            decisionAttributes: 'Non-combat attributes such as Politician, Banker, and Navigator are used for story and decision ownership, not as combat stat bonuses unless some other mechanic explicitly says so.'
        },
        currentCharacter,
        currentAttributes: currentAttributeIds
            .map((attributeId) => NON_COMBAT_ATTRIBUTE_MAP[attributeId])
            .filter(Boolean),
        attributeCatalog: NON_COMBAT_ATTRIBUTES,
        abilityCatalog: ABILITY_CATALOG
    };
};