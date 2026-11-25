// Game Design Data: Weapons, Armor Sets, Upgrades, Biomes, Enemies, Rooms

export const WEAPONS = {
  recurve: {
    id: 'recurve',
    name: 'Shadow Recurve',
    tag: 'AGILE / CRIT',
    desc: 'Crisp high-crit recurve. Fast kiting & reliable snap shots.',
    cost: 0,
    damage: 18,
    fireRate: 2.6, // shots/sec while kiting
    snapMult: 1.75,
    projSpeed: 295,
    count: 1,
    spread: 0,
    pierce: 0,
    bounce: 0,
    critChance: 0.22,
    knockback: 28,
    color: '#67e8f9',
    woodColor: '#7c4a2d',
    accentColor: '#38bdf8',
    wispOnKill: false,
  },
  arbalest: {
    id: 'arbalest',
    name: 'Repeating Arbalest',
    tag: '3-BOLT FAN',
    desc: 'Fires a shredding 3-bolt fan volley. Melts dense swarms.',
    cost: 65,
    damage: 12,
    fireRate: 2.35,
    snapMult: 1.55,
    projSpeed: 280,
    count: 3,
    spread: 0.24,
    pierce: 0,
    bounce: 0,
    critChance: 0.14,
    knockback: 22,
    color: '#fde047',
    woodColor: '#57534e',
    accentColor: '#f59e0b',
    wispOnKill: false,
  },
  greatbow: {
    id: 'greatbow',
    name: 'Siege Greatbow',
    tag: 'PIERCE / HEAVY',
    desc: 'Colossal ironwood draw. Skewers entire columns with huge knockback.',
    cost: 95,
    damage: 38,
    fireRate: 1.35,
    snapMult: 2.0,
    projSpeed: 360,
    count: 1,
    spread: 0,
    pierce: 3,
    bounce: 0,
    critChance: 0.2,
    knockback: 88,
    color: '#fb923c',
    woodColor: '#3f2e25',
    accentColor: '#f97316',
    wispOnKill: false,
  },
  soulweaver: {
    id: 'soulweaver',
    name: 'Soul-Weaver Bow',
    tag: 'HOMING WISPS',
    desc: 'Slain foes burst into twin homing phantom wisps.',
    cost: 115,
    damage: 21,
    fireRate: 2.25,
    snapMult: 1.7,
    projSpeed: 285,
    count: 1,
    spread: 0,
    pierce: 1,
    bounce: 0,
    critChance: 0.18,
    knockback: 25,
    color: '#e879f9',
    woodColor: '#4c1d95',
    accentColor: '#d946ef',
    wispOnKill: true,
  },
  chakram: {
    id: 'chakram',
    name: 'Ricochet Chakram',
    tag: 'WALL BOUNCE',
    desc: 'Spinning runic glaives ricochet wildly off walls & pillars.',
    cost: 105,
    damage: 22,
    fireRate: 2.1,
    snapMult: 1.65,
    projSpeed: 270,
    count: 1,
    spread: 0,
    pierce: 0,
    bounce: 3,
    critChance: 0.16,
    knockback: 32,
    color: '#34d399',
    woodColor: '#115e59',
    accentColor: '#10b981',
    wispOnKill: false,
  },
};

export const ARMORS = {
  ranger: {
    id: 'ranger',
    name: 'Twilight Ranger',
    tag: 'BALANCED',
    desc: 'Classic midnight-plum hood & leather mantle. +10% Move Speed.',
    cost: 0,
    maxHpBonus: 0,
    speedMult: 1.1,
    cloakDark: '#26183b',
    cloakMid: '#3f275e',
    cloakLight: '#6b4899',
    trim: '#d4a34f',
    hood: '#2c1b45',
    passive: 'none',
  },
  ashwalker: {
    id: 'ashwalker',
    name: 'Ash-Walker Cloak',
    tag: 'EMBER TRAIL',
    desc: 'Charred crimson mantle. Leaves burning embers behind while kiting.',
    cost: 70,
    maxHpBonus: 20,
    speedMult: 1.14,
    cloakDark: '#3f1116',
    cloakMid: '#7f1d1d',
    cloakLight: '#dc2626',
    trim: '#fb923c',
    hood: '#5c1419',
    passive: 'ember_trail',
  },
  ossuary: {
    id: 'ossuary',
    name: 'Ossuary Bone-Plate',
    tag: 'BONE SHIELDS',
    desc: 'Horned skull helm + 2 orbiting bone shards that damage & block.',
    cost: 90,
    maxHpBonus: 45,
    speedMult: 1.0,
    cloakDark: '#292524',
    cloakMid: '#57534e',
    cloakLight: '#e7e5e4',
    trim: '#f5f5f4',
    hood: '#d6d3d1',
    passive: 'bone_orbit',
  },
  nightstalker: {
    id: 'nightstalker',
    name: 'Night-Stalker Cowl',
    tag: 'SHADOW CRIT',
    desc: 'Kiting charges Stalker stacks; next Snap Shot deals +75% Crit DMG.',
    cost: 100,
    maxHpBonus: 15,
    speedMult: 1.18,
    cloakDark: '#0f172a',
    cloakMid: '#1e293b',
    cloakLight: '#38bdf8',
    trim: '#facc15',
    hood: '#172554',
    passive: 'stalker_crit',
  },
};

export const UPGRADES = [
  {
    id: 'multishot',
    name: 'Twin Nock',
    tag: 'GEOMETRY',
    icon: '➶',
    color: '#38bdf8',
    maxRank: 3,
    desc: '+1 additional parallel arrow per shot.',
    apply: (p) => { p.mods.extraArrows += 1; },
  },
  {
    id: 'spread',
    name: 'Fan Volley',
    tag: 'GEOMETRY',
    icon: '✣',
    color: '#60a5fa',
    maxRank: 3,
    desc: '+2 angled side arrows per shot for wide swarm coverage.',
    apply: (p) => { p.mods.sideArrows += 2; },
  },
  {
    id: 'ricochet',
    name: 'Runic Ricochet',
    tag: 'BOUNCE',
    icon: '⤿',
    color: '#34d399',
    maxRank: 3,
    desc: 'Arrows bounce +1 time off dungeon walls and enemies.',
    apply: (p) => { p.mods.bounce += 1; },
  },
  {
    id: 'pierce',
    name: 'Bodkin Piercer',
    tag: 'PIERCE',
    icon: '➤',
    color: '#fbbf24',
    maxRank: 3,
    desc: 'Arrows skewer +2 extra monsters in a line.',
    apply: (p) => { p.mods.pierce += 2; },
  },
  {
    id: 'hellfire',
    name: 'Hellfire Tips',
    tag: 'FIRE',
    icon: '🔥',
    color: '#f97316',
    maxRank: 3,
    desc: 'Arrows ignite foes for burning DoT & explode on death.',
    apply: (p) => { p.mods.fireLevel += 1; },
  },
  {
    id: 'frost',
    name: 'Frost Shatter',
    tag: 'ICE',
    icon: '❄',
    color: '#67e8f9',
    maxRank: 3,
    desc: 'Chills enemies (-35% speed); slain chilled foes shatter in ice shards.',
    apply: (p) => { p.mods.frostLevel += 1; },
  },
  {
    id: 'lightning',
    name: 'Storm Arc',
    tag: 'SHOCK',
    icon: '⚡',
    color: '#c084fc',
    maxRank: 3,
    desc: 'Hits arc chain lightning to nearby clustered swarm monsters.',
    apply: (p) => { p.mods.lightningLevel += 1; },
  },
  {
    id: 'rapiddraw',
    name: 'Quickdraw Sinew',
    tag: 'SPEED',
    icon: '»',
    color: '#fde047',
    maxRank: 4,
    desc: '+22% Attack Speed and faster Tension Snap charge.',
    apply: (p) => { p.mods.fireRateMult *= 1.22; },
  },
  {
    id: 'vampiric',
    name: 'Crimson Fletching',
    tag: 'SUSTAIN',
    icon: '♥',
    color: '#f43f5e',
    maxRank: 3,
    desc: '+12% Crit Chance; Crits have a 35% chance to heal 4 HP.',
    apply: (p) => { p.mods.critBonus += 0.12; p.mods.vampiric += 1; },
  },
  {
    id: 'heavy',
    name: 'Titan Draw',
    tag: 'POWER',
    icon: '⚔',
    color: '#fb7185',
    maxRank: 4,
    desc: '+28% Arrow Damage and +25% Knockback.',
    apply: (p) => { p.mods.damageMult *= 1.28; p.mods.knockbackMult *= 1.25; },
  },
  {
    id: 'haste',
    name: 'Phantom Stride',
    tag: 'MOBILITY',
    icon: '◈',
    color: '#a78bfa',
    maxRank: 3,
    desc: '+16% Move Speed and -20% Active Skill cooldowns.',
    apply: (p) => { p.mods.speedMult *= 1.16; p.mods.cdrMult *= 0.8; },
  },
  {
    id: 'vitality',
    name: 'Heart of Iron',
    tag: 'SURVIVE',
    icon: '✚',
    color: '#4ade80',
    maxRank: 3,
    desc: '+35 Max HP and immediately restores 45 HP.',
    apply: (p) => { p.maxHp += 35; p.hp = Math.min(p.maxHp, p.hp + 45); },
  },
];

// SYNERGY EVOLUTIONS — Unlock in Level-Up Draft when you own both paired base upgrades!
export const EVOLUTIONS = [
  {
    id: 'comet_lance',
    name: 'COMET LANCE',
    icon: '☄',
    color: '#fb923c',
    requires: ['hellfire', 'pierce'],
    desc: 'Arrows become blazing lances (+40% DMG, +2 Pierce) leaving scorched fire trails in flight.',
    apply: (p) => {
      p.mods.damageMult *= 1.4;
      p.mods.pierce += 2;
      p.evolutions.add('comet_lance');
    },
  },
  {
    id: 'shatterstorm',
    name: 'SHATTERSTORM',
    icon: '❆',
    color: '#67e8f9',
    requires: ['frost', 'ricochet'],
    desc: 'Every arrow ricochet erupts into a 3-shard Frost Nova that chills & shreds nearby swarms.',
    apply: (p) => {
      p.mods.bounce += 1;
      p.evolutions.add('shatterstorm');
    },
  },
  {
    id: 'tempest_barrage',
    name: 'TEMPEST BARRAGE',
    icon: '🌩',
    color: '#d8b4fe',
    requires: ['lightning', 'multishot'],
    altRequires: ['lightning', 'spread'],
    desc: 'Crits & Snap Shots summon sky-to-ground Thunderbolts that blast & chain to 3 extra foes.',
    apply: (p) => {
      p.mods.lightningLevel += 1;
      p.evolutions.add('tempest_barrage');
    },
  },
  {
    id: 'blood_eclipse',
    name: 'BLOOD ECLIPSE',
    icon: '🩸',
    color: '#fb7185',
    requires: ['vampiric', 'heavy'],
    desc: '+25% Crit DMG. Every 3 Vampiric Crits unleashes a knockback Crimson Nova around you.',
    apply: (p) => {
      p.mods.critDmgBonus += 0.25;
      p.evolutions.add('blood_eclipse');
    },
  },
  {
    id: 'phantom_volley',
    name: 'PHANTOM VOLLEY',
    icon: '✦',
    color: '#a78bfa',
    requires: ['rapiddraw', 'haste'],
    desc: 'Firing while kiting unleashes an extra spectral Phantom Arrow + 25% faster Skill cooldowns.',
    apply: (p) => {
      p.mods.cdrMult *= 0.75;
      p.evolutions.add('phantom_volley');
    },
  },
];

export function isEvolutionUnlocked(evo, ranks, ownedEvolutions) {
  if (ownedEvolutions.has(evo.id)) return false;
  const hasPair = (pair) => pair.every((id) => (ranks[id] || 0) >= 1);
  return hasPair(evo.requires) || (evo.altRequires && hasPair(evo.altRequires));
}

export function getSynergyHint(upgradeId, ranks, ownedEvolutions) {
  for (const evo of EVOLUTIONS) {
    if (ownedEvolutions.has(evo.id)) continue;
    const pairs = evo.altRequires ? [evo.requires, evo.altRequires] : [evo.requires];
    for (const pair of pairs) {
      if (pair.includes(upgradeId)) {
        const partner = pair.find((id) => id !== upgradeId);
        if ((ranks[partner] || 0) >= 1) {
          return `SYNERGY → ${evo.name}`;
        }
      }
    }
  }
  return null;
}

// BOSS & TREASURE RELICS — Dropped from sprite-stacked Ironbound Chests!
export const RELICS = [
  {
    id: 'brazier_heart',
    name: 'Brazier Heart',
    tag: 'ORBITAL FIRE',
    icon: '🔥',
    color: '#fb923c',
    desc: 'An orbiting molten ember burns nearby foes & ignites arrows flying past it.',
  },
  {
    id: 'clockwork_quiver',
    name: 'Clockwork Quiver',
    tag: 'ECHO VOLLEY',
    icon: '⚙',
    color: '#fde047',
    desc: 'Every 4th attack immediately fires a free Double-Burst Echo Volley.',
  },
  {
    id: 'vampire_fang',
    name: 'Vampire Fang',
    tag: 'FRENZY HEAL',
    icon: '🦇',
    color: '#f43f5e',
    desc: 'Every 8 kills restores 12 HP and triggers +30% Move Speed for 3 seconds.',
  },
  {
    id: 'mirror_shadow',
    name: 'Mirror Shadow',
    tag: 'TAUNT DECOY',
    icon: '👤',
    color: '#c084fc',
    desc: 'Shadow Roll spawns a sprite-stacked Decoy that taunts monsters & explodes.',
  },
  {
    id: 'runic_magnet',
    name: 'Runic Magnet',
    tag: 'GOLD BOLTS',
    icon: '🧲',
    color: '#34d399',
    desc: '2x Pickup Magnet, +25% Gold, and collecting coins fires homing Golden Bolts.',
  },
  {
    id: 'loaded_dice',
    name: "Gambler's Dice",
    tag: 'CRIT + DICE',
    icon: '🎲',
    color: '#38bdf8',
    desc: 'Gain +3 Reroll Dice immediately and +12% permanent Crit Chance.',
  },
];

export const CURSED_PACTS = [
  {
    id: 'bloodlust',
    name: 'Pact of Endless Arrows',
    desc: '+45% Attack Speed & +1 Arrow, but enemies move 18% faster.',
    apply: (g) => {
      g.player.mods.fireRateMult *= 1.45;
      g.player.mods.extraArrows += 1;
      g.curseEnemySpeed *= 1.18;
    },
  },
  {
    id: 'glasscannon',
    name: 'Demon-Forged Tension',
    desc: '+65% Arrow Damage & +20% Crit, but Lose 25% Max HP.',
    apply: (g) => {
      g.player.mods.damageMult *= 1.65;
      g.player.mods.critBonus += 0.2;
      g.player.maxHp = Math.max(50, Math.round(g.player.maxHp * 0.75));
      g.player.hp = Math.min(g.player.hp, g.player.maxHp);
    },
  },
  {
    id: 'greed',
    name: 'Gilded Horde',
    desc: 'Gain 110 Gold + 1 Free Level immediately, but Swarms are 30% thicker.',
    apply: (g) => {
      g.gold += 110;
      g.curseSwarmDensity *= 1.3;
      g.pendingLevelUps += 1;
    },
  },
];

export const BIOMES = [
  {
    name: 'TORCHLIT CRYPTS',
    minFloor: 1,
    floorA: '#1d1629',
    floorB: '#231b32',
    grout: '#120d1a',
    wallTop: '#403259',
    wallSide: '#251c38',
    ambient: 'rgba(18, 11, 30, 0.28)',
    brazierColor: '#ff9438',
  },
  {
    name: 'SUNKEN CATACOMBS',
    minFloor: 4,
    floorA: '#142024',
    floorB: '#1a2a2e',
    grout: '#0c1417',
    wallTop: '#2e4a4f',
    wallSide: '#182b2e',
    ambient: 'rgba(8, 24, 26, 0.30)',
    brazierColor: '#4ade80',
  },
  {
    name: 'BRIMSTONE FOUNDRY',
    minFloor: 7,
    floorA: '#241418',
    floorB: '#2d191d',
    grout: '#150a0d',
    wallTop: '#592c2a',
    wallSide: '#331719',
    ambient: 'rgba(32, 10, 12, 0.26)',
    brazierColor: '#ff5722',
  },
  {
    name: 'ABYSSAL SANCTUM',
    minFloor: 10,
    floorA: '#160d24',
    floorB: '#211235',
    grout: '#0a0512',
    wallTop: '#5b2a86',
    wallSide: '#2c1347',
    ambient: 'rgba(20, 6, 36, 0.32)',
    brazierColor: '#e879f9',
  },
];

export function getBiomeForFloor(floor) {
  let chosen = BIOMES[0];
  for (const b of BIOMES) {
    if (floor >= b.minFloor) chosen = b;
  }
  return chosen;
}

export const ENEMY_DEFS = {
  skeleton: {
    id: 'skeleton',
    name: 'Skeleton Thrall',
    sprite: 'skeleton',
    hp: 58,
    speed: 44,
    radius: 8,
    damage: 10,
    xp: 8,
    gold: 3,
    behavior: 'chase',
    layers: 12,
  },
  imp: {
    id: 'imp',
    name: 'Crimson Imp',
    sprite: 'imp',
    hp: 40,
    speed: 74,
    radius: 7,
    damage: 9,
    xp: 9,
    gold: 4,
    behavior: 'zigzag',
    layers: 10,
  },
  bone_archer: {
    id: 'bone_archer',
    name: 'Bone Archer',
    sprite: 'bone_archer',
    hp: 66,
    speed: 36,
    radius: 8,
    damage: 13,
    xp: 12,
    gold: 5,
    behavior: 'ranged',
    fireCooldown: 2.2,
    layers: 13,
  },
  ghoul: {
    id: 'ghoul',
    name: 'Plague Ghoul',
    sprite: 'ghoul',
    hp: 98,
    speed: 56,
    radius: 9,
    damage: 14,
    xp: 14,
    gold: 6,
    behavior: 'toxic_chase',
    layers: 11,
  },
  hellguard: {
    id: 'hellguard',
    name: 'Hellguard Knight',
    sprite: 'hellguard',
    hp: 215,
    speed: 35,
    radius: 11,
    damage: 20,
    xp: 28,
    gold: 14,
    behavior: 'armored',
    armorMax: 115,
    layers: 16,
  },
  boss_warden: {
    id: 'boss_warden',
    name: 'OSSUARY WARDEN',
    sprite: 'boss_warden',
    hp: 1150,
    speed: 40,
    radius: 17,
    damage: 24,
    xp: 110,
    gold: 65,
    behavior: 'boss',
    armorMax: 360,
    layers: 20,
    isBoss: true,
  },
  boss_inquisitor: {
    id: 'boss_inquisitor',
    name: 'IRON INQUISITOR',
    sprite: 'boss_inquisitor',
    hp: 1750,
    speed: 46,
    radius: 18,
    damage: 28,
    xp: 150,
    gold: 95,
    behavior: 'boss_fire',
    armorMax: 520,
    layers: 21,
    isBoss: true,
  },
};
