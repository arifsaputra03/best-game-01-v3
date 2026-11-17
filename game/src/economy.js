// The campaign's memory: stars per beacon, shards, relics, and the best
// run. Kept in localStorage so progress survives a reload; every read is
// guarded because headless and private modes may refuse storage.

import { RELICS, RELIC_ORDER, SHARDS_PER_STAR, SHARDS_PER_WIN, MAP_COUNT } from './config.js';

const SAVE_KEY = 'emberward-save-v1';

export function freshSave() {
  return {
    stars: [0, 0, 0, 0, 0, 0, 0],
    shards: 0,
    relics: {},
    unlocked: 1, // how many beacons are open (first is always open)
    best: { kills: 0, goldEarned: 0, timeSecs: 0, stars: 0 },
    muted: false,
  };
}

export function loadSave() {
  try {
    const raw = window.localStorage.getItem(SAVE_KEY);
    if (!raw) return freshSave();
    const data = JSON.parse(raw);
    const save = freshSave();
    if (Array.isArray(data.stars)) {
      for (let i = 0; i < MAP_COUNT; i++) save.stars[i] = data.stars[i] | 0;
    }
    save.shards = data.shards | 0;
    save.relics = data.relics || {};
    save.unlocked = Math.max(1, Math.min(MAP_COUNT, data.unlocked | 0 || 1));
    if (data.best) save.best = { ...save.best, ...data.best };
    save.muted = !!data.muted;
    return save;
  } catch (e) {
    return freshSave();
  }
}

export function storeSave(save) {
  try {
    window.localStorage.setItem(SAVE_KEY, JSON.stringify(save));
  } catch (e) { /* storage is a convenience, never a crash */ }
}

export function totalStars(save) {
  return save.stars.reduce((a, b) => a + b, 0);
}

// After winning a map: keep the best star count, bank the shards, unlock next.
export function recordMapWin(save, mapId, stars) {
  const before = save.stars[mapId] || 0;
  const gained = Math.max(0, stars - before) * SHARDS_PER_STAR;
  save.stars[mapId] = Math.max(before, stars);
  save.shards += gained + SHARDS_PER_WIN;
  save.unlocked = Math.max(save.unlocked, Math.min(MAP_COUNT, mapId + 2));
  return gained + SHARDS_PER_WIN;
}

export function relicTier(save, id) {
  return save.relics[id] || 0;
}

export function relicCost(id, tier) {
  // tier is the tier being bought (1, 2 or 3)
  return RELICS[id].costs[tier - 1];
}

export function canBuyRelic(save, id) {
  const tier = relicTier(save, id);
  if (tier >= 3) return false;
  return save.shards >= relicCost(id, tier + 1);
}

export function buyRelic(save, id) {
  const tier = relicTier(save, id);
  if (tier >= 3) return false;
  const cost = relicCost(id, tier + 1);
  if (save.shards < cost) return false;
  save.shards -= cost;
  save.relics[id] = tier + 1;
  return true;
}

export { RELIC_ORDER, MAP_COUNT };
