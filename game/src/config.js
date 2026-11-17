// EMBERWARD — balance and definitions.
// One file holds every number the game tunes by: towers, enemies, bosses,
// relics, economy. All other files read these tables, never hardcode them.

export const VIEW = {
  W: 1280,
  H: 720,
  HUD_H: 48, // top bar
  FIELD_Y: 48, // play field top
  FIELD_H: 560, // 7 rows of 80px
  BAR_Y: 608, // bottom build bar top
  BAR_H: 112,
  COLS: 16,
  ROWS: 7,
  CELL: 80,
};

export const START_GOLD = 200;
export const START_LIVES = 20;
export const SELL_RATE = 0.7;
export const MAX_STARS_PER_MAP = 3;
export const MAP_COUNT = 7;

// ---- Towers ---------------------------------------------------------------
// dmg: damage per shot. rate: seconds between shots. range: in cells.
// special: what makes the tower different from a plain shooter.
export const TOWERS = {
  arrow: {
    name: 'Arrow Spire',
    short: 'Arrow',
    cost: 60,
    dmg: 9,
    rate: 0.45,
    range: 2.2,
    color: '#e8b34b',
    dark: '#8a6420',
    desc: 'Fast arrows. Cheap and reliable.',
    hotkey: '1',
  },
  frost: {
    name: 'Frost Obelisk',
    short: 'Frost',
    cost: 80,
    dmg: 5,
    rate: 0.8,
    range: 2.0,
    color: '#7fd4ff',
    dark: '#2b6f9e',
    desc: 'Chills enemies, slowing them 40%.',
    hotkey: '2',
    slow: 0.4,
    slowSecs: 1.5,
  },
  cannon: {
    name: 'Ember Cannon',
    short: 'Cannon',
    cost: 120,
    dmg: 24,
    rate: 1.4,
    range: 2.0,
    color: '#ff7a3c',
    dark: '#93390f',
    desc: 'Explosive shells, splash damage.',
    hotkey: '3',
    splash: 0.9, // cells
  },
  spark: {
    name: 'Spark Coil',
    short: 'Spark',
    cost: 140,
    dmg: 13,
    rate: 1.0,
    range: 2.4,
    color: '#ffe14d',
    dark: '#8a7a10',
    desc: 'Lightning chains to 3 enemies.',
    hotkey: '4',
    chain: 3,
    chainFalloff: 0.6,
  },
  longbow: {
    name: 'Longbow Keep',
    short: 'Longbow',
    cost: 160,
    dmg: 45,
    rate: 1.8,
    range: 3.6,
    color: '#c9a2ff',
    dark: '#5b3a9e',
    desc: 'Huge range, heavy single shots.',
    hotkey: '5',
  },
  totem: {
    name: 'Ember Totem',
    short: 'Totem',
    cost: 100,
    dmg: 0,
    rate: 0,
    range: 1.6, // aura radius in cells
    color: '#ff5d8f',
    dark: '#8a1f47',
    desc: 'Nearby towers deal +25% damage.',
    hotkey: '6',
    aura: 0.25,
  },
};

export const TOWER_ORDER = ['arrow', 'frost', 'cannon', 'spark', 'longbow', 'totem'];

// Upgrade tiers: tier 2 and 3 multiply damage, widen range, quicken fire.
// Totem tiers raise the aura instead of damage.
export const TIER_COST_MUL = [0, 0.9, 1.4];
export const TIER_DMG_MUL = [1, 1.6, 2.6];
export const TIER_RANGE_ADD = [0, 0.15, 0.3];
export const TIER_RATE_MUL = [1, 0.92, 0.85];
export const TIER_AURA = [0.25, 0.4, 0.6];

// ---- Enemies --------------------------------------------------------------
export const ENEMIES = {
  shambler: { name: 'Shambler', hp: 30, speed: 40, gold: 6, radius: 13, color: '#9fb27a', dark: '#4d5c33', score: 10 },
  wisp: { name: 'Wisp', hp: 16, speed: 78, gold: 5, radius: 10, color: '#bfe9ff', dark: '#4d7a99', score: 10 },
  beetle: { name: 'Iron Beetle', hp: 95, speed: 28, gold: 10, radius: 15, color: '#c98a4b', dark: '#6e4517', score: 15, armor: 2 },
  frost: { name: 'Frost Elemental', hp: 62, speed: 36, gold: 12, radius: 14, color: '#aee6ff', dark: '#3a6f92', score: 15, towerSlow: 0.3, towerSlowRadius: 120 },
  imp: { name: 'Cinder Imp', hp: 24, speed: 62, gold: 7, radius: 11, color: '#ff9a5c', dark: '#8a3d12', score: 15, splitsInto: 'mite' },
  mite: { name: 'Ember Mite', hp: 9, speed: 72, gold: 2, radius: 7, color: '#ffb37a', dark: '#8a4d1a', score: 5 },
  drake: { name: 'Ash Drake', hp: 48, speed: 66, gold: 12, radius: 12, color: '#e26a6a', dark: '#7a2626', score: 20, flying: true },
  bat: { name: 'Gloom Bat', hp: 15, speed: 92, gold: 6, radius: 10, color: '#b78cff', dark: '#4d2a80', score: 15, flying: true },
  shade: { name: 'Deep Shade', hp: 145, speed: 33, gold: 16, radius: 15, color: '#8f7fd4', dark: '#3d2f66', score: 25 },
};

// Bosses: one per late map. leak costs 5 lives. Phases and summons live in world.js.
export const BOSSES = {
  frost: {
    name: 'Frost Herald',
    hp: 1200, speed: 22, gold: 200, radius: 26,
    color: '#cfeeff', dark: '#2f6f9e',
    desc: 'Freezes your towers with a chilling nova.',
  },
  storm: {
    name: 'Storm Warden',
    hp: 1650, speed: 26, gold: 250, radius: 27,
    color: '#d9b3ff', dark: '#5b2f8a',
    desc: 'Calls gloom bats from the storm.',
  },
  gloom: {
    name: 'The Gloom Sovereign',
    hp: 2600, speed: 20, gold: 400, radius: 30,
    color: '#ff6a8a', dark: '#7a1f3d',
    desc: 'Two phases. Summons shades when wounded.',
  },
};

// ---- Relics (War Council shop, permanent, 3 tiers each) -------------------
export const RELICS = {
  sturdy: { name: 'Sturdy Wards', desc: '+4 lives each map', costs: [20, 40, 70] },
  sharp: { name: 'Sharpened Points', desc: '+8% tower damage', costs: [25, 50, 90] },
  pockets: { name: 'Deep Pockets', desc: '+40 starting gold', costs: [20, 40, 70] },
  swift: { name: 'Swift Hands', desc: 'Towers 6% cheaper', costs: [25, 50, 90] },
  hoard: { name: 'Ember Hoard', desc: '+12% gold from kills', costs: [25, 50, 90] },
};
export const RELIC_ORDER = ['sturdy', 'sharp', 'pockets', 'swift', 'hoard'];
export const SHARDS_PER_STAR = 10;
export const SHARDS_PER_WIN = 5;

// ---- Helpers --------------------------------------------------------------
export function clamp(v, lo, hi) {
  return v < lo ? lo : v > hi ? hi : v;
}

// Permanent bonuses from owned relics: { tier } per relic id.
export function relicEffects(relics) {
  const t = (id) => (relics && relics[id] ? relics[id] : 0);
  return {
    lives: 4 * t('sturdy'),
    dmgMul: 1 + 0.08 * t('sharp'),
    startGold: 40 * t('pockets'),
    costMul: 1 - 0.06 * t('swift'),
    goldMul: 1 + 0.12 * t('hoard'),
  };
}

export function towerCost(type, relics) {
  const base = TOWERS[type].cost;
  const eff = relicEffects(relics);
  return Math.max(10, Math.round(base * eff.costMul));
}

export function canUpgrade(type, tier) {
  return tier < 3;
}

export function upgradeCost(type, tier) {
  // tier is the tier being bought (2 or 3)
  return Math.round(TOWERS[type].cost * TIER_COST_MUL[tier - 1]);
}

// Full combat stats of a tower at a tier, with relic damage bonus.
export function towerStats(type, tier, relics) {
  const def = TOWERS[type];
  const eff = relicEffects(relics);
  return {
    dmg: Math.round(def.dmg * TIER_DMG_MUL[tier - 1] * eff.dmgMul),
    rate: def.rate * TIER_RATE_MUL[tier - 1],
    range: (def.range + TIER_RANGE_ADD[tier - 1]) * VIEW.CELL,
    aura: TIER_AURA[tier - 1] || 0,
  };
}

// Stars for a finished map: 3 with no leaks, 2 with at least half lives left.
export function starsForResult(won, livesLeft, livesMax) {
  if (!won) return 0;
  if (livesLeft >= livesMax) return 3;
  if (livesLeft >= Math.ceil(livesMax / 2)) return 2;
  return 1;
}
