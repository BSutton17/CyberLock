"""
Combat encounter system for the cyberpunk RPG.
Manages enemy composition and encounter difficulty progression.
"""

STORY_COMBAT_FLOW = [
    {
        "encounter_index": 0,
        "combat_type": "low",
        "num_generic": 0,  # Will be party_size + 2
        "num_mid": 0,
        "num_mini": 0,
        "has_boss": False,
        "post_combat": "levelUp"
    },
    {
        "encounter_index": 1,
        "combat_type": "low",
        "num_generic": 0,  # Will be party_size + 2
        "num_mid": 0,
        "num_mini": 0,
        "has_boss": False,
        "post_combat": "none"
    },
    {
        "encounter_index": 2,
        "combat_type": "medium",
        "num_generic": 2,
        "num_mid": 2,
        "num_mini": 0,
        "has_boss": False,
        "post_combat": "none"
    },
    {
        "encounter_index": 3,
        "combat_type": "boss",
        "num_generic": 2,
        "num_mid": 1,
        "num_mini": 0,
        "has_boss": True,
        "post_combat": "levelUp"
    },
    {
        "encounter_index": 4,
        "combat_type": "low",
        "num_generic": 0,
        "num_mid": 0,
        "num_mini": 0,
        "has_boss": False,
        "post_combat": "none"
    },
    {
        "encounter_index": 5,
        "combat_type": "medium",
        "num_generic": 3,
        "num_mid": 2,
        "num_mini": 0,
        "has_boss": False,
        "post_combat": "levelUp"
    },
    {
        "encounter_index": 6,
        "combat_type": "low",
        "num_generic": 0,
        "num_mid": 0,
        "num_mini": 0,
        "has_boss": False,
        "post_combat": "none"
    },
    {
        "encounter_index": 7,
        "combat_type": "boss",
        "num_generic": 2,
        "num_mid": 1,
        "num_mini": 0,
        "has_boss": True,
        "post_combat": "levelUp"
    },
    {
        "encounter_index": 8,
        "combat_type": "low",
        "num_generic": 0,
        "num_mid": 0,
        "num_mini": 0,
        "has_boss": False,
        "post_combat": "none"
    },
    {
        "encounter_index": 9,
        "combat_type": "mini-boss",
        "num_generic": 5,
        "num_mid": 0,
        "num_mini": 1,
        "has_boss": False,
        "post_combat": "none"
    },
    {
        "encounter_index": 10,
        "combat_type": "boss",
        "num_generic": 4,
        "num_mid": 1,
        "num_mini": 0,
        "has_boss": True,
        "post_combat": "none"
    }
]

# Map enemy types to their IDs from Enemies.json
ENEMY_TYPE_MAPPING = {
    'enforcers': {
        'generic': ['enforcer_soldier', 'enforcer_drone'],  # ✅ FIXED
        'mid': ['division_command', 'division_strategist', 'vanguard_captain'],
        'mini': ['division_chief']
    },
    'rebels': {
        'generic': ['rebel_initiate', 'rebel_field_tech'],  # ✅ FIXED
        'mid': ['field_captain', 'rebel_coordinator', 'operations_handler'],
        'mini': ['rebellion_chief']
    }
}


def get_combat_encounter(encounter_index, faction='enforcers'):
    """
    Get encounter details for a specific encounter index.
    
    Args:
        encounter_index: Index in STORY_COMBAT_FLOW (0-10)
        faction: 'enforcers' or 'rebels' - determines opposing faction
    
    Returns:
        Dictionary with encounter details including enemy composition
    """
    if encounter_index < 0 or encounter_index >= len(STORY_COMBAT_FLOW):
        encounter_index = 0
    
    encounter = STORY_COMBAT_FLOW[encounter_index].copy()
    
    # Determine opposing faction
    opposing_faction = 'rebels' if faction == 'enforcers' else 'enforcers'
    enemy_pool = ENEMY_TYPE_MAPPING.get(opposing_faction, ENEMY_TYPE_MAPPING['enforcers'])
    
    # Build enemy list
    enemies = []
    
    # Generic enemies
    num_generic = encounter['num_generic']
    if num_generic > 0:
        for enemy_id in enemy_pool['generic'] * (num_generic // len(enemy_pool['generic']) + 1):
            if len(enemies) >= num_generic:
                break
            enemies.append(enemy_id)
    
    # Mid-tier enemies
    num_mid = encounter['num_mid']
    if num_mid > 0:
        for enemy_id in enemy_pool['mid'] * (num_mid // len(enemy_pool['mid']) + 1):
            if len([e for e in enemies if e in enemy_pool['mid']]) >= num_mid:
                break
            enemies.append(enemy_id)
    
    # Mini-boss enemies
    num_mini = encounter['num_mini']
    if num_mini > 0:
        for enemy_id in enemy_pool['mini'] * num_mini:
            if len([e for e in enemies if e in enemy_pool['mini']]) >= num_mini:
                break
            enemies.append(enemy_id)
    
    encounter['enemies'] = enemies
    encounter['faction'] = opposing_faction
    
    return encounter


def format_combat_context(encounter_index, faction='enforcers'):
    """
    Format encounter information for AI prompt context.
    
    Args:
        encounter_index: Index in STORY_COMBAT_FLOW (0-10)
        faction: 'enforcers' or 'rebels'
    
    Returns:
        Formatted string for inclusion in AI prompt
    """
    encounter = get_combat_encounter(encounter_index, faction)
    
    # Format enemy list with proper names
    enemy_names = []
    for enemy_id in encounter['enemies']:
        # Convert ID to display name (e.g., 'enforcer_soldier' -> 'Enforcer Soldier')
        name = ' '.join(word.capitalize() for word in enemy_id.split('_'))
        enemy_names.append(name)
    
    context = f"""## Current Combat Encounter:
- Encounter Type: {encounter['combat_type']}
- Faction: {encounter['faction'].capitalize()}
- Enemies Present:
"""
    
    for name in enemy_names:
        context += f"  * {name}\n"
    
    context += f"- Boss Battle: {'Yes' if encounter['has_boss'] else 'No'}\n"
    context += f"- After Combat: {'Players level up' if encounter['post_combat'] == 'levelUp' else 'Continue to next encounter'}\n"
    
    return context