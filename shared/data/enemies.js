// Enemy templates by tier. Encounters scale these by party size and level.
export default {
  "enemies": [
    {
      "id": "enforcer_soldier",
      "name": "Enforcer Soldier",
      "tier": "generic",
      "role": "DPS",
      "level": 1,
      "behavior": "aggressive",
      "stats": {
        "health": 40,
        "maxHealth": 40,
        "speed": 30,
        "resistance": 20,
        "strength": 40,
        "ta": 20
      },
      "weapon": {
        "name": "Shock Baton",
        "damage": 6,
        "range": 1
      }
    },
    {
      "id": "enforcer_drone",
      "name": "Enforcer Drone",
      "tier": "generic",
      "role": "DPS",
      "level": 1,
      "behavior": "defensive",
      "stats": {
        "health": 30,
        "maxHealth": 30,
        "speed": 35,
        "resistance": 20,
        "strength": 20,
        "ta": 45
      },
      "weapon": {
        "name": "Pulse Carbine",
        "damage": 4,
        "range": 3
      }
    },
    {
      "id": "rebel_initiate",
      "name": "Rebel Initiate",
      "tier": "generic",
      "role": "DPS",
      "level": 1,
      "behavior": "aggressive",
      "stats": {
        "health": 35,
        "maxHealth": 35,
        "speed": 35,
        "resistance": 15,
        "strength": 50,
        "ta": 15
      },
      "weapon": {
        "name": "Scrap Blade",
        "damage": 6,
        "range": 1
      }
    },
    {
      "id": "rebel_field_tech",
      "name": "Rebel Field Tech",
      "tier": "generic",
      "role": "DPS",
      "level": 1,
      "behavior": "defensive",
      "stats": {
        "health": 30,
        "maxHealth": 30,
        "speed": 30,
        "resistance": 20,
        "strength": 20,
        "ta": 50
      },
      "weapon": {
        "name": "Arc Launcher",
        "damage": 4,
        "range": 3
      }
    },
    {
      "id": "division_command",
      "name": "Division Command",
      "tier": "mid-tier",
      "role": "DPS",
      "level": 1,
      "behavior": "defensive",
      "stats": {
        "health": 70,
        "maxHealth": 70,
        "speed": 60,
        "resistance": 60,
        "strength": 40,
        "ta": 65
      },
      "weapon": {
        "name": "Command Uplink",
        "damage": 7,
        "range": 3
      }
    },
    {
      "id": "division_strategist",
      "name": "Division Strategist",
      "tier": "mid-tier",
      "role": "Support",
      "level": 1,
      "behavior": "support",
      "stats": {
        "health": 55,
        "maxHealth": 55,
        "speed": 30,
        "resistance": 55,
        "strength": 35,
        "ta": 70
      },
      "weapon": {
        "name": "Tactical Railcaster",
        "damage": 7,
        "range": 4
      }
    },
    {
      "id": "vanguard_captain",
      "name": "Vanguard Captain",
      "tier": "mid-tier",
      "role": "Tank",
      "level": 1,
      "behavior": "intelligent",
      "stats": {
        "health": 90,
        "maxHealth": 90,
        "speed": 55,
        "resistance": 65,
        "strength": 50,
        "ta": 25
      },
      "weapon": {
        "name": "Siege Gauntlets",
        "damage": 10,
        "range": 1
      }
    },
    {
      "id": "field_captain",
      "name": "Field Captain",
      "tier": "mid-tier",
      "role": "Tank",
      "level": 1,
      "behavior": "intelligent",
      "stats": {
        "health": 100,
        "maxHealth": 100,
        "speed": 40,
        "resistance": 60,
        "strength": 35,
        "ta": 20
      },
      "weapon": {
        "name": "Command Sabre",
        "damage": 10,
        "range": 1
      }
    },
    {
      "id": "rebel_coordinator",
      "name": "Rebel Coordinator",
      "tier": "mid-tier",
      "role": "Tank",
      "level": 1,
      "behavior": "aggressive",
      "stats": {
        "health": 95,
        "maxHealth": 95,
        "speed": 45,
        "resistance": 45,
        "strength": 45,
        "ta": 20
      },
      "weapon": {
        "name": "Breaker Hammer",
        "damage": 10,
        "range": 1
      }
    },
    {
      "id": "operations_handler",
      "name": "Operations Handler",
      "tier": "mid-tier",
      "role": "Support",
      "level": 1,
      "behavior": "support",
      "stats": {
        "health": 60,
        "maxHealth": 60,
        "speed": 30,
        "resistance": 40,
        "strength": 25,
        "ta": 70
      },
      "weapon": {
        "name": "Signal Rifle",
        "damage": 8,
        "range": 3
      }
    },
    {
      "id": "division_chief",
      "name": "Division Chief",
      "tier": "mini-boss",
      "role": "Tank",
      "level": 1,
      "behavior": "intelligent",
      "stats": {
        "health": 125,
        "maxHealth": 125,
        "speed": 30,
        "resistance": 80,
        "strength": 35,
        "ta": 30
      },
      "weapon": {
        "name": "Compliance Blade",
        "damage": 8,
        "range": 1
      }
    },
    {
      "id": "rebellion_chief",
      "name": "Rebellion Chief",
      "tier": "mini-boss",
      "role": "Tank",
      "level": 1,
      "behavior": "intelligent",
      "stats": {
        "health": 115,
        "maxHealth": 115,
        "speed": 30,
        "resistance": 60,
        "strength": 60,
        "ta": 35
      },
      "weapon": {
        "name": "Liberator Halberd",
        "damage": 9,
        "range": 1
      }
    },
    {
      "id": "enforcer_the_architect",
      "name": "The Architect",
      "tier": "boss",
      "role": "DPS",
      "level": 1,
      "behavior": "defensive",
      "stats": {
        "health": 160,
        "maxHealth": 160,
        "speed": 40,
        "resistance": 130,
        "strength": 35,
        "ta": 85
      },
      "weapon": {
        "name": "Directive Prism",
        "damage": 8,
        "range": 4
      }
    },
    {
      "id": "enforcer_macro_hull",
      "name": "Macro Hull",
      "tier": "boss",
      "role": "Tank",
      "level": 1,
      "behavior": "intelligent",
      "stats": {
        "health": 180,
        "maxHealth": 180,
        "speed": 25,
        "resistance": 150,
        "strength": 70,
        "ta": 25
      },
      "weapon": {
        "name": "Bastion Maul",
        "damage": 10,
        "range": 1
      }
    },
    {
      "id": "enforcer_genisis",
      "name": "Genisis",
      "tier": "boss",
      "role": "DPS",
      "level": 1,
      "behavior": "intelligent",
      "stats": {
        "health": 155,
        "maxHealth": 155,
        "speed": 50,
        "resistance": 120,
        "strength": 95,
        "ta": 30
      },
      "weapon": {
        "name": "Zero-Lag Blades",
        "damage": 10,
        "range": 1
      }
    },
    {
      "id": "rebel_garret_maxwell",
      "name": "Garret Maxwell",
      "tier": "boss",
      "role": "Tank",
      "level": 1,
      "behavior": "defensive",
      "stats": {
        "health": 175,
        "maxHealth": 175,
        "speed": 35,
        "resistance": 140,
        "strength": 65,
        "ta": 35
      },
      "weapon": {
        "name": "Breaker Cannon",
        "damage": 9,
        "range": 2
      }
    },
    {
      "id": "rebel_levi_wicker",
      "name": "Levi Wicker",
      "tier": "boss",
      "role": "DPS",
      "level": 1,
      "behavior": "intelligent",
      "stats": {
        "health": 150,
        "maxHealth": 150,
        "speed": 50,
        "resistance": 115,
        "strength": 105,
        "ta": 30
      },
      "weapon": {
        "name": "Riot Splitter",
        "damage": 11,
        "range": 1
      }
    },
    {
      "id": "rebel_virgil_wesley",
      "name": "Virgil Wesley",
      "tier": "boss",
      "role": "DPS",
      "level": 1,
      "behavior": "defensive",
      "stats": {
        "health": 160,
        "maxHealth": 160,
        "speed": 40,
        "resistance": 125,
        "strength": 35,
        "ta": 90
      },
      "weapon": {
        "name": "Signal Dominion",
        "damage": 9,
        "range": 4
      }
    }
  ]
};
