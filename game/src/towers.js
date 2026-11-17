// Towers: the Warden's emplacements. Each tower picks the enemy furthest
// along the path in range, fires on its own clock, and grows through three
// tiers. Projectiles fly, splash, chain, or chill; totems buff neighbors.

import { TOWERS, TOWER_ORDER, towerStats, upgradeCost, SELL_RATE, clamp } from './config.js';
import { damageEnemy, slowEnemy } from './enemies.js';

let nextProjId = 1;

export function makeTower(type, col, row, invested) {
  return {
    type,
    tier: 1,
    col,
    row,
    x: col * 80 + 40,
    y: 48 + row * 80 + 40,
    cooldown: 0,
    invested: invested || TOWERS[type].cost,
    kills: 0,
    slowedUntil: 0,
    flash: 0,
  };
}

export function towerSellValue(t) {
  return Math.floor(t.invested * SELL_RATE);
}

export function canUpgrade(t) {
  return t.tier < 3;
}

export function doUpgrade(t) {
  if (!canUpgrade(t)) return 0;
  const cost = upgradeCost(t.type, t.tier + 1);
  t.invested += cost;
  t.tier += 1;
  return cost;
}

// Damage multiplier from nearby Ember Totems (aura stacks once, best only).
export function totemBonus(world, tower) {
  let best = 0;
  for (const o of world.towers) {
    if (o.type !== 'totem' || o === tower) continue;
    const d = Math.hypot(o.x - tower.x, o.y - tower.y);
    const stats = towerStats('totem', o.tier, world.relics);
    if (d <= stats.range) best = Math.max(best, stats.aura);
  }
  return best;
}

// Frost Elementals slow towers near them; bosses' novas slow all towers.
function towerSlowFactor(world, tower, now) {
  let f = 1;
  if (now < tower.slowedUntil) f *= 0.55;
  if (now < world.novaUntil) f *= 0.5;
  for (const e of world.enemies) {
    if (e.type === 'frost' && !e.dead) {
      const d = Math.hypot(e.x - tower.x, e.y - tower.y);
      if (d <= 120) { f *= 0.7; break; }
    }
  }
  return f;
}

// Furthest-along enemy inside range. Bosses are preferred when in range.
function pickTarget(world, tower, range) {
  let best = null;
  let bestDist = -1;
  for (const e of world.enemies) {
    if (e.dead || e.leaked) continue;
    const d = Math.hypot(e.x - tower.x, e.y - tower.y);
    if (d > range) continue;
    const score = e.dist + (e.boss ? 100000 : 0);
    if (score > bestDist) {
      bestDist = score;
      best = e;
    }
  }
  return best;
}

function fireProjectile(world, tower, target, stats, dmg) {
  world.projectiles.push({
    id: nextProjId++,
    kind: tower.type,
    x: tower.x,
    y: tower.y - 14,
    target,
    dmg,
    speed: 520,
    splash: tower.type === 'cannon' ? 0.9 * 80 : 0,
    chain: tower.type === 'spark' ? 3 : 0,
    chainFalloff: 0.6,
    slow: tower.type === 'frost' ? 0.4 : 0,
    slowSecs: tower.type === 'frost' ? 1.5 : 0,
    dead: false,
  });
}

function hitTarget(world, proj) {
  const t = proj.target;
  if (!t || t.dead || t.leaked) return;
  if (proj.splash > 0) {
    // Cannon: everyone near the impact takes the hit.
    for (const e of world.enemies) {
      if (e.dead || e.leaked) continue;
      if (Math.hypot(e.x - t.x, e.y - t.y) <= proj.splash) {
        if (damageEnemy(e, proj.dmg)) world.onEnemyKilled(e, proj);
      }
    }
    world.bursts.push({ x: t.x, y: t.y, r: proj.splash, age: 0, max: 0.25, color: '#ff7a3c' });
  } else if (proj.chain > 0) {
    // Spark: lightning jumps to the nearest unhit enemies.
    let dmg = proj.dmg;
    let from = t;
    const hitSet = new Set([t.id]);
    damageEnemy(t, dmg);
    if (t.dead) world.onEnemyKilled(t, proj);
    world.zaps.push({ x1: proj.x, y1: proj.y, x2: t.x, y2: t.y, age: 0, max: 0.15 });
    let remaining = proj.chain - 1;
    while (remaining > 0) {
      let next = null;
      let nd = Infinity;
      for (const e of world.enemies) {
        if (e.dead || e.leaked || hitSet.has(e.id)) continue;
        const d = Math.hypot(e.x - from.x, e.y - from.y);
        if (d < nd && d <= 130) { nd = d; next = e; }
      }
      if (!next) break;
      dmg = Math.round(dmg * proj.chainFalloff);
      hitSet.add(next.id);
      damageEnemy(next, dmg);
      if (next.dead) world.onEnemyKilled(next, proj);
      world.zaps.push({ x1: from.x, y1: from.y, x2: next.x, y2: next.y, age: 0, max: 0.15 });
      from = next;
      remaining -= 1;
    }
  } else {
    if (damageEnemy(t, proj.dmg)) world.onEnemyKilled(t, proj);
    if (proj.slow > 0) slowEnemy(t, 1 - proj.slow, proj.slowSecs, world.time);
  }
}

// One tower's turn: cool down, then fire at the best target in range.
export function stepTower(world, tower, dt) {
  if (tower.type === 'totem') return;
  const stats = towerStats(tower.type, tower.tier, world.relics);
  const slow = towerSlowFactor(world, tower, world.time);
  tower.cooldown -= dt * slow;
  if (tower.flash > 0) tower.flash -= dt;
  if (tower.cooldown > 0) return;
  const target = pickTarget(world, tower, stats.range);
  if (!target) return;
  const bonus = totemBonus(world, tower);
  const dmg = Math.round(stats.dmg * (1 + bonus));
  tower.cooldown = stats.rate;
  tower.flash = 0.08;
  fireProjectile(world, tower, target, stats, dmg);
  world.sfx.shoot(tower.type);
}

export function stepProjectiles(world, dt) {
  for (const p of world.projectiles) {
    if (p.dead) continue;
    const t = p.target;
    if (!t || t.dead || t.leaked) { p.dead = true; continue; }
    const dx = t.x - p.x, dy = t.y - p.y;
    const d = Math.hypot(dx, dy);
    const step = p.speed * dt;
    if (d <= step + 6) {
      hitTarget(world, p);
      p.dead = true;
    } else {
      p.x += (dx / d) * step;
      p.y += (dy / d) * step;
    }
  }
  world.projectiles = world.projectiles.filter((p) => !p.dead);
}

export { TOWER_ORDER };
