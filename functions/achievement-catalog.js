// Generated from shared/achievements.json by scripts/generate-achievements.js.
const ACHIEVEMENT_SCHEMA_VERSION = 2;
const ACHIEVEMENTS = Object.freeze([
  {
    "id": "first_sortie",
    "name": "First Sortie",
    "description": "Complete your first run.",
    "category": "career",
    "tier": 1,
    "minLifetimeRuns": 1
  },
  {
    "id": "rookie_score",
    "name": "Rookie Ace",
    "description": "Score 250 in one run.",
    "category": "strike",
    "tier": 1,
    "minScore": 250
  },
  {
    "id": "ace_score",
    "name": "Ace Pilot",
    "description": "Score 1,000 in one run.",
    "category": "strike",
    "tier": 1,
    "minScore": 1000
  },
  {
    "id": "legend_score",
    "name": "Legend Run",
    "description": "Score 3,000 in one run.",
    "category": "strike",
    "tier": 2,
    "minScore": 3000
  },
  {
    "id": "surge_score",
    "name": "Score Surge",
    "description": "Score 6,000 in one run.",
    "category": "strike",
    "tier": 2,
    "minScore": 6000
  },
  {
    "id": "mythic_score",
    "name": "Mythic Rush",
    "description": "Score 10,000 in one run.",
    "category": "strike",
    "tier": 3,
    "minScore": 10000
  },
  {
    "id": "stellar_score",
    "name": "Stellar Velocity",
    "description": "Score 25,000 in one run.",
    "category": "strike",
    "tier": 4,
    "minScore": 25000
  },
  {
    "id": "nova_score",
    "name": "Nova Standard",
    "description": "Score 50,000 in one run.",
    "category": "strike",
    "tier": 4,
    "minScore": 50000
  },
  {
    "id": "eternal_score",
    "name": "Eternal Rush",
    "description": "Score 100,000 in one run.",
    "category": "strike",
    "tier": 5,
    "minScore": 100000
  },
  {
    "id": "phase_two",
    "name": "Phase Runner",
    "description": "Reach phase 2.",
    "category": "strike",
    "tier": 1,
    "minPhase": 2
  },
  {
    "id": "phase_three",
    "name": "Deep Strike",
    "description": "Reach phase 3.",
    "category": "strike",
    "tier": 1,
    "minPhase": 3
  },
  {
    "id": "phase_eight",
    "name": "Wraith Contact",
    "description": "Reach phase 8.",
    "category": "strike",
    "tier": 2,
    "minPhase": 8
  },
  {
    "id": "phase_twelve",
    "name": "Expansion Front",
    "description": "Reach phase 12.",
    "category": "strike",
    "tier": 3,
    "minPhase": 12
  },
  {
    "id": "phase_twenty",
    "name": "Outer Dark",
    "description": "Reach phase 20.",
    "category": "strike",
    "tier": 4,
    "minPhase": 20
  },
  {
    "id": "phase_thirty",
    "name": "Beyond the Map",
    "description": "Reach phase 30.",
    "category": "strike",
    "tier": 5,
    "minPhase": 30
  },
  {
    "id": "boss_breaker",
    "name": "Boss Breaker",
    "description": "Destroy a boss in one run.",
    "category": "combat",
    "tier": 1,
    "minBosses": 1
  },
  {
    "id": "boss_hunter",
    "name": "Boss Hunter",
    "description": "Destroy 3 bosses in one run.",
    "category": "combat",
    "tier": 2,
    "minBosses": 3
  },
  {
    "id": "boss_reaper",
    "name": "Boss Reaper",
    "description": "Destroy 5 bosses in one run.",
    "category": "combat",
    "tier": 3,
    "minBosses": 5
  },
  {
    "id": "warden_bane",
    "name": "Command Breaker",
    "description": "Destroy 10 bosses in one run.",
    "category": "combat",
    "tier": 4,
    "minBosses": 10
  },
  {
    "id": "pantheon_fall",
    "name": "Pantheon Fall",
    "description": "Destroy 20 bosses in one run.",
    "category": "combat",
    "tier": 5,
    "minBosses": 20
  },
  {
    "id": "swarm_clearer",
    "name": "Swarm Clearer",
    "description": "Destroy 25 enemies in one run.",
    "category": "combat",
    "tier": 1,
    "minKills": 25
  },
  {
    "id": "century_breaker",
    "name": "Century Breaker",
    "description": "Destroy 100 enemies in one run.",
    "category": "combat",
    "tier": 2,
    "minKills": 100
  },
  {
    "id": "void_harvester",
    "name": "Void Harvester",
    "description": "Destroy 250 enemies in one run.",
    "category": "combat",
    "tier": 3,
    "minKills": 250
  },
  {
    "id": "fleet_eraser",
    "name": "Fleet Eraser",
    "description": "Destroy 500 enemies in one run.",
    "category": "combat",
    "tier": 4,
    "minKills": 500
  },
  {
    "id": "one_ship_army",
    "name": "One Ship Army",
    "description": "Destroy 1,000 enemies in one run.",
    "category": "combat",
    "tier": 5,
    "minKills": 1000
  },
  {
    "id": "combo_ten",
    "name": "Kill Chain 10",
    "description": "Reach a 10-kill chain.",
    "category": "combat",
    "tier": 1,
    "minCombo": 10
  },
  {
    "id": "combo_twenty_five",
    "name": "Kill Chain 25",
    "description": "Reach a 25-kill chain.",
    "category": "combat",
    "tier": 2,
    "minCombo": 25
  },
  {
    "id": "combo_fifty",
    "name": "Kill Chain 50",
    "description": "Reach a 50-kill chain.",
    "category": "combat",
    "tier": 3,
    "minCombo": 50
  },
  {
    "id": "combo_hundred",
    "name": "Kill Chain 100",
    "description": "Reach a 100-kill chain.",
    "category": "combat",
    "tier": 4,
    "minCombo": 100
  },
  {
    "id": "combo_two_fifty",
    "name": "Kill Chain 250",
    "description": "Reach a 250-kill chain.",
    "category": "combat",
    "tier": 5,
    "minCombo": 250
  },
  {
    "id": "ghost_runner",
    "name": "Ghost Runner",
    "description": "Use Ghost Shift 3 times in one run.",
    "category": "systems",
    "tier": 1,
    "minGhostUses": 3
  },
  {
    "id": "ghost_dancer",
    "name": "Ghost Dancer",
    "description": "Use Ghost Shift 10 times in one run.",
    "category": "systems",
    "tier": 2,
    "minGhostUses": 10
  },
  {
    "id": "phase_specter",
    "name": "Phase Specter",
    "description": "Use Ghost Shift 25 times in one run.",
    "category": "systems",
    "tier": 3,
    "minGhostUses": 25
  },
  {
    "id": "unseen_fifty",
    "name": "Unseen Fifty",
    "description": "Use Ghost Shift 50 times in one run.",
    "category": "systems",
    "tier": 5,
    "minGhostUses": 50
  },
  {
    "id": "collector",
    "name": "Collector",
    "description": "Collect 3 powerups in one run.",
    "category": "systems",
    "tier": 1,
    "minPowerups": 3
  },
  {
    "id": "power_hungry",
    "name": "Power Hungry",
    "description": "Collect 8 powerups in one run.",
    "category": "systems",
    "tier": 2,
    "minPowerups": 8
  },
  {
    "id": "arsenal_online",
    "name": "Arsenal Online",
    "description": "Collect 15 powerups in one run.",
    "category": "systems",
    "tier": 3,
    "minPowerups": 15
  },
  {
    "id": "reactor_feast",
    "name": "Reactor Feast",
    "description": "Collect 30 powerups in one run.",
    "category": "systems",
    "tier": 4,
    "minPowerups": 30
  },
  {
    "id": "limitless_loadout",
    "name": "Limitless Loadout",
    "description": "Collect 50 powerups in one run.",
    "category": "systems",
    "tier": 5,
    "minPowerups": 50
  },
  {
    "id": "five_minute_flight",
    "name": "Holding Pattern",
    "description": "Survive 5 minutes in one run.",
    "category": "strike",
    "tier": 1,
    "minRunDurationMs": 300000
  },
  {
    "id": "ten_minute_flight",
    "name": "Long Range",
    "description": "Survive 10 minutes in one run.",
    "category": "strike",
    "tier": 2,
    "minRunDurationMs": 600000
  },
  {
    "id": "twenty_minute_flight",
    "name": "Endurance Pilot",
    "description": "Survive 20 minutes in one run.",
    "category": "strike",
    "tier": 4,
    "minRunDurationMs": 1200000
  },
  {
    "id": "thirty_minute_flight",
    "name": "No Return Vector",
    "description": "Survive 30 minutes in one run.",
    "category": "strike",
    "tier": 5,
    "minRunDurationMs": 1800000
  },
  {
    "id": "flawless_three",
    "name": "Clean Hull",
    "description": "Reach phase 3 without taking damage.",
    "category": "systems",
    "tier": 2,
    "minPhase": 3,
    "maxDamageTaken": 0
  },
  {
    "id": "flawless_eight",
    "name": "Glass Phantom",
    "description": "Reach phase 8 without taking damage.",
    "category": "systems",
    "tier": 4,
    "minPhase": 8,
    "maxDamageTaken": 0
  },
  {
    "id": "flawless_twelve",
    "name": "Perfect Machine",
    "description": "Reach phase 12 without taking damage.",
    "category": "systems",
    "tier": 5,
    "minPhase": 12,
    "maxDamageTaken": 0
  },
  {
    "id": "career_runs_10",
    "name": "Regular Patrol",
    "description": "Complete 10 lifetime runs.",
    "category": "career",
    "tier": 1,
    "minLifetimeRuns": 10
  },
  {
    "id": "career_runs_50",
    "name": "Flight Habit",
    "description": "Complete 50 lifetime runs.",
    "category": "career",
    "tier": 2,
    "minLifetimeRuns": 50
  },
  {
    "id": "career_runs_100",
    "name": "Centurion Pilot",
    "description": "Complete 100 lifetime runs.",
    "category": "career",
    "tier": 3,
    "minLifetimeRuns": 100
  },
  {
    "id": "career_runs_250",
    "name": "Veteran Circuit",
    "description": "Complete 250 lifetime runs.",
    "category": "career",
    "tier": 4,
    "minLifetimeRuns": 250
  },
  {
    "id": "career_runs_500",
    "name": "Five Hundred Flights",
    "description": "Complete 500 lifetime runs.",
    "category": "career",
    "tier": 4,
    "minLifetimeRuns": 500
  },
  {
    "id": "career_runs_1000",
    "name": "The Thousandth Dawn",
    "description": "Complete 1,000 lifetime runs.",
    "category": "career",
    "tier": 5,
    "minLifetimeRuns": 1000
  },
  {
    "id": "career_score_50k",
    "name": "Rising Record",
    "description": "Earn 50,000 lifetime score.",
    "category": "career",
    "tier": 1,
    "minLifetimeScore": 50000
  },
  {
    "id": "career_score_250k",
    "name": "Quarter Million",
    "description": "Earn 250,000 lifetime score.",
    "category": "career",
    "tier": 2,
    "minLifetimeScore": 250000
  },
  {
    "id": "career_score_1m",
    "name": "Million Point Pilot",
    "description": "Earn 1,000,000 lifetime score.",
    "category": "career",
    "tier": 3,
    "minLifetimeScore": 1000000
  },
  {
    "id": "career_score_5m",
    "name": "Five Million Flight",
    "description": "Earn 5,000,000 lifetime score.",
    "category": "career",
    "tier": 4,
    "minLifetimeScore": 5000000
  },
  {
    "id": "career_score_10m",
    "name": "Eight Digit Ace",
    "description": "Earn 10,000,000 lifetime score.",
    "category": "career",
    "tier": 4,
    "minLifetimeScore": 10000000
  },
  {
    "id": "career_score_25m",
    "name": "Star Eternal",
    "description": "Earn 25,000,000 lifetime score.",
    "category": "career",
    "tier": 5,
    "minLifetimeScore": 25000000
  },
  {
    "id": "career_kills_100",
    "name": "Threat Removed",
    "description": "Destroy 100 lifetime enemies.",
    "category": "career",
    "tier": 1,
    "minLifetimeKills": 100
  },
  {
    "id": "career_kills_1k",
    "name": "Thousand Down",
    "description": "Destroy 1,000 lifetime enemies.",
    "category": "career",
    "tier": 2,
    "minLifetimeKills": 1000
  },
  {
    "id": "career_kills_5k",
    "name": "Sector Defender",
    "description": "Destroy 5,000 lifetime enemies.",
    "category": "career",
    "tier": 3,
    "minLifetimeKills": 5000
  },
  {
    "id": "career_kills_25k",
    "name": "Fleetbreaker",
    "description": "Destroy 25,000 lifetime enemies.",
    "category": "career",
    "tier": 4,
    "minLifetimeKills": 25000
  },
  {
    "id": "career_kills_100k",
    "name": "Hundred Thousand",
    "description": "Destroy 100,000 lifetime enemies.",
    "category": "career",
    "tier": 4,
    "minLifetimeKills": 100000
  },
  {
    "id": "career_kills_250k",
    "name": "Final Answer",
    "description": "Destroy 250,000 lifetime enemies.",
    "category": "career",
    "tier": 5,
    "minLifetimeKills": 250000
  },
  {
    "id": "career_powerups_25",
    "name": "Systems Student",
    "description": "Collect 25 lifetime powerups.",
    "category": "career",
    "tier": 1,
    "minLifetimePowerups": 25
  },
  {
    "id": "career_powerups_100",
    "name": "Systems Engineer",
    "description": "Collect 100 lifetime powerups.",
    "category": "career",
    "tier": 2,
    "minLifetimePowerups": 100
  },
  {
    "id": "career_powerups_500",
    "name": "Loadout Architect",
    "description": "Collect 500 lifetime powerups.",
    "category": "career",
    "tier": 3,
    "minLifetimePowerups": 500
  },
  {
    "id": "career_powerups_2500",
    "name": "Arsenal Curator",
    "description": "Collect 2,500 lifetime powerups.",
    "category": "career",
    "tier": 4,
    "minLifetimePowerups": 2500
  },
  {
    "id": "career_powerups_10k",
    "name": "Every System Online",
    "description": "Collect 10,000 lifetime powerups.",
    "category": "career",
    "tier": 5,
    "minLifetimePowerups": 10000
  },
  {
    "id": "career_bosses_10",
    "name": "Command Hunter",
    "description": "Destroy 10 lifetime bosses.",
    "category": "career",
    "tier": 1,
    "minLifetimeBosses": 10
  },
  {
    "id": "career_bosses_50",
    "name": "Warden Specialist",
    "description": "Destroy 50 lifetime bosses.",
    "category": "career",
    "tier": 2,
    "minLifetimeBosses": 50
  },
  {
    "id": "career_bosses_250",
    "name": "Pantheon Breaker",
    "description": "Destroy 250 lifetime bosses.",
    "category": "career",
    "tier": 3,
    "minLifetimeBosses": 250
  },
  {
    "id": "career_bosses_1k",
    "name": "One Thousand Crowns",
    "description": "Destroy 1,000 lifetime bosses.",
    "category": "career",
    "tier": 4,
    "minLifetimeBosses": 1000
  },
  {
    "id": "career_bosses_2500",
    "name": "No Gods Left",
    "description": "Destroy 2,500 lifetime bosses.",
    "category": "career",
    "tier": 5,
    "minLifetimeBosses": 2500
  },
  {
    "id": "career_ghost_25",
    "name": "Between Frames",
    "description": "Use Ghost Shift 25 lifetime times.",
    "category": "career",
    "tier": 1,
    "minLifetimeGhostUses": 25
  },
  {
    "id": "career_ghost_100",
    "name": "Phase Native",
    "description": "Use Ghost Shift 100 lifetime times.",
    "category": "career",
    "tier": 2,
    "minLifetimeGhostUses": 100
  },
  {
    "id": "career_ghost_500",
    "name": "Half Seen",
    "description": "Use Ghost Shift 500 lifetime times.",
    "category": "career",
    "tier": 3,
    "minLifetimeGhostUses": 500
  },
  {
    "id": "career_ghost_2500",
    "name": "Unbound",
    "description": "Use Ghost Shift 2,500 lifetime times.",
    "category": "career",
    "tier": 4,
    "minLifetimeGhostUses": 2500
  },
  {
    "id": "career_ghost_5k",
    "name": "Living Ghost",
    "description": "Use Ghost Shift 5,000 lifetime times.",
    "category": "career",
    "tier": 5,
    "minLifetimeGhostUses": 5000
  }
].map((achievement) => Object.freeze(achievement)));

module.exports = { ACHIEVEMENT_SCHEMA_VERSION, ACHIEVEMENTS };
