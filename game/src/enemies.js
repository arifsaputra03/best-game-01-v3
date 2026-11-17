// Enemies: the Gloom's walkers. Each one follows the map's path from the
// entrance to the beacon, slowed by frost, split by imps, and hunted by
// the Warden's towers. Bosses carry their own timers in world.js.

import { ENEMIES, BOSSES } from './config.js';
import { pathPointAt, pathLength, terrainAt } from './levels.js';

let nextId = 1;

export function makeEnemy(type, opts = {}) {
  const def = ENEMIES[type];
  const hpMul = opts.hpMul || 1;
  const elite = !!opts.elite;
  const hp = Math.round(def.hp * hpMul * (elite ? 3 : 1));
  return {
    id: nextId++,
    type,
    name: def.name,
    hp,
    maxHp: hp,
    speed: def.speed,
    baseSpeed: def.speed,
    gold: Math.round(def.gold * (elite ? 2 : 1)),
    radius: def.radius,
    color: def.color,
    dark: def.dark,
    armor: def.armor || 0,
    flying: !!def.flying,
    elite,
    boss: null,
    dist: opts.dist || 0,
    x: 0,
    y: 0,
    slowUntil: 0,
    slowFactor: 1,
    towerSlowUntil: 0,
    dead: false,
    leaked: false,
    spawnAge: 0,
    wobble: Math.random() * Math.PI * 2,
    flash: 0,
  };
}

export function makeBoss(id, opts = {}) {
  const def = BOSSES[id];
  const hp = Math.round(def.hp * (opts.hpMul || 1));
  const e = {
    id: nextId++,
    type: 'boss',
    boss: id,
    name: def.name,
    hp,
    maxHp: hp,
    speed: def.speed,
    baseSpeed: def.speed,
    gold: def.gold,
    radius: def.radius,
    color: def.color,
    dark: def.dark,
    armor: 0,
    flying: false,
    elite: false,
    dist: opts.dist || 0,
    x: 0,
    y: 0,
    slowUntil: 0,
    slowFactor: 1,
    towerSlowUntil: 0,
    dead: false,
    leaked: false,
    spawnAge: 0,
    wobble: 0,
    flash: 0,
    phase: 1,
    summonTimer: 8,
    novaTimer: 6,
  };
  return e;
}

// Damage an enemy, honoring beetle armor. Returns true when it dies.
export function damageEnemy(e, dmg) {
  const taken = Math.max(1, dmg - (e.armor || 0));
  e.hp -= taken;
  e.flash = 0.12;
  if (e.hp <= 0) {
    e.dead = true;
    return true;
  }
  return false;
}

export function slowEnemy(e, factor, secs, now) {
  // factor is the speed multiplier while slowed (0.6 = 40% slow).
  if (now + secs > e.slowUntil) {
    e.slowUntil = now + secs;
    e.slowFactor = Math.min(e.slowFactor, factor);
  }
}

// Move one enemy along the path for dt seconds. Returns 'leaked' when it
// reaches the beacon, 'ok' otherwise. Terrain patches change its speed.
export function stepEnemy(e, dt, world, now) {
  e.spawnAge += dt;
  if (e.flash > 0) e.flash -= dt;

  let speed = e.baseSpeed;
  if (now < e.slowUntil) speed *= e.slowFactor;
  // Terrain under the enemy's feet.
  const col = Math.floor(e.x / 80);
  const row = Math.floor((e.y - 48) / 80);
  const terrain = terrainAt(world.map, col, row);
  if (terrain === 'mud') speed *= 0.75;
  else if (terrain === 'ice') speed *= 1.15;
  if (e.boss === 'gloom' && e.phase === 2) speed *= 1.4;

  e.dist += speed * dt;
  const total = pathLength(world.pathPts);
  if (e.dist >= total) {
    e.leaked = true;
    return 'leaked';
  }
  const p = pathPointAt(world.pathPts, e.dist);
  e.x = p.x;
  e.y = p.y;
  return 'ok';
}

// Where a freshly spawned enemy stands: at the path start, or at a portal.
export function placeEnemy(e, world, dist) {
  e.dist = dist || 0;
  const p = pathPointAt(world.pathPts, e.dist);
  e.x = p.x;
  e.y = p.y;
}
