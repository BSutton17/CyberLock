// Playable characters (base stats at level 1). `behavior` is how the character moves when a bot
// plays it: aggressive (closes in), defensive (keeps weapon range) or intelligent (falls back to a
// healer when badly hurt).
export default {
  "characters": [
    {
      "id": "offensive_tank_1",
      "behavior": "aggressive",
      "name": "Shipment",
      "role": "Tank",
      "level": 1,
      "stats": {
        "health": 85,
        "maxHealth": 85,
        "speed": 30,
        "resistance": 35,
        "strength": 35,
        "ta": 15
      },
      "weapon": {
        "range": 1,
        "name": "Hammer",
        "damage": 9
      },
      "abilities": [],
      "ultimate": ""
    },
    {
      "id": "defensive_tank_2",
      "behavior": "intelligent",
      "name": "E.N.C.A.G.E",
      "role": "Tank",
      "level": 1,
      "stats": {
        "health": 100,
        "maxHealth": 100,
        "speed": 20,
        "resistance": 50,
        "strength": 25,
        "ta": 10
      },
      "weapon": {
        "range": 1,
        "name": "Taser Shield",
        "damage": 8
      },
      "abilities": [],
      "ultimate": ""
    },
    {
      "id": "spellcaster_dps_1",
      "behavior": "defensive",
      "name": "Gene Shock",
      "role": "DPS",
      "level": 1,
      "stats": {
        "health": 75,
        "maxHealth": 75,
        "speed": 30,
        "resistance": 25,
        "strength": 10,
        "ta": 60
      },
      "weapon": {
        "range": 3,
        "name": "Ray Gun",
        "damage": 4.5
      },
      "abilities": [],
      "ultimate": ""
    },
    {
      "id": "aggressive_dps_2",
      "behavior": "aggressive",
      "name": "Leo",
      "role": "DPS",
      "level": 1,
      "stats": {
        "health": 75,
        "maxHealth": 75,
        "speed": 45,
        "resistance": 20,
        "strength": 45,
        "ta": 15
      },
      "weapon": {
        "range": 1,
        "name": "Energy Sword",
        "damage": 10
      },
      "abilities": [],
      "ultimate": ""
    },
    {
      "id": "traditional_warrior_dps_3",
      "behavior": "intelligent",
      "name": "Last Legion",
      "role": "DPS",
      "level": 1,
      "stats": {
        "health": 85,
        "maxHealth": 85,
        "speed": 35,
        "resistance": 30,
        "strength": 25,
        "ta": 25
      },
      "weapon": {
        "range": 2,
        "name": "Shotgun",
        "damage": 9
      },
      "abilities": [],
      "ultimate": ""
    },
    {
      "id": "healing_support_1",
      "behavior": "defensive",
      "name": "Patchwork",
      "role": "Support",
      "level": 1,
      "stats": {
        "health": 55,
        "maxHealth": 55,
        "speed": 20,
        "resistance": 30,
        "strength": 5,
        "ta": 65
      },
      "weapon": {
        "range": 4,
        "name": "Drone",
        "damage": 3
      },
      "abilities": [],
      "ultimate": ""
    },
    {
      "id": "offensive_support_2",
      "behavior": "intelligent",
      "name": "Livewire",
      "role": "Support",
      "level": 1,
      "stats": {
        "health": 60,
        "maxHealth": 60,
        "speed": 30,
        "resistance": 20,
        "strength": 25,
        "ta": 40
      },
      "weapon": {
        "range": 3,
        "name": "Electric Guitar",
        "damage": 3
      },
      "abilities": [],
      "ultimate": ""
    },
    {
      "id": "jack_of_all_trades_support_3",
      "behavior": "defensive",
      "name": "True North",
      "role": "Support",
      "level": 1,
      "stats": {
        "health": 65,
        "maxHealth": 65,
        "speed": 25,
        "resistance": 25,
        "strength": 20,
        "ta": 40
      },
      "weapon": {
        "range": 3,
        "name": "Magic Energy",
        "damage": 3
      },
      "abilities": [],
      "ultimate": ""
    },
    {
      "id": "hacker_support_4",
      "behavior": "intelligent",
      "name": "Ghost Shell",
      "role": "Support",
      "level": 1,
      "stats": {
        "health": 55,
        "maxHealth": 55,
        "speed": 30,
        "resistance": 20,
        "strength": 10,
        "ta": 60
      },
      "weapon": {
        "range": 3,
        "name": "Laptop",
        "damage": 3
      },
      "abilities": [],
      "ultimate": ""
    }
  ]
};
