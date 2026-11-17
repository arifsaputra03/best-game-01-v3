// The world: one campaign map at a time. It owns the state machine
// (title, map select, shop, play, pause, victory, defeat, campaign),
// the wave spawner, hazards, boss timers, and every rule that decides
// whether the Warden holds the beacon or the Gloom takes it.

import {
  START_GOLD, START_LIVES, towerCost, upgradeCost, relicEffects, starsForResult,
} from './config.js';
import { MAPS, pathPoints, pathLength, pathDistOfCell } from './levels.js';
import { makeEnemy, makeBoss, damageEnemy, stepEnemy, placeEnemy } from './enemies.js';
import { makeTower, stepTower, stepProjectiles, towerSellValue, canUpgrade, doUpgrade } from './towers.js';
import { recordMapWin, storeSave, totalStars } from './economy.js';
import { makeRng } from './random.js';

export function createWorld(save, sfx, rng) {
  const world = {
    save,
    sfx,
    rng: rng || makeRng(1),
    state: 'title',
    map: null,
    mapIndex: 0,
    pathPts: [],
    pathLen: 0,
    time: 0,
    gold: START_GOLD,
    lives: START_LIVES,
    livesMax: START_LIVES,
    relics: save.relics,
    waveIndex: 0,
    waveState: 'build', // 'build' | 'fighting'
    spawnQueue: [],
    spawnClock: 0,
    enemies: [],
    towers: [],
    projectiles: [],
    particles: [],
    bursts: [],
    zaps: [],
    coins: [],
    kills: 0,
    goldEarned: 0,
    leaks: 0,
    timePlayed: 0,
    speed: 1,
    paused: false,
    selectedPlot: null,
    selectedTower: null,
    buildType: null,
    hover: null,
    hazardTimer: 0,
    stormTimer: 0,
    novaUntil: 0,
    boss: null,
    victoryInfo: null,
    campaignStats: null,
    mapStats: null,
    titleTime: 0,
  };

  // Gold, particles and splits when an enemy dies.
  world.onEnemyKilled = (e) => {
    const eff = relicEffects(world.relics);
    const gold = Math.round(e.gold * eff.goldMul);
    world.gold += gold;
    world.goldEarned += gold;
    world.kills += 1;
    world.coins.push({ x: e.x, y: e.y - 10, age: 0, max: 0.9, text: `+${gold}` });
    world.burst(e.x, e.y, e.color, 10);
    world.sfx.coin();
    if (e.type === 'imp') {
      for (let i = 0; i < 2; i++) {
        const mite = makeEnemy('mite', { hpMul: 1, dist: Math.max(0, e.dist - 12 - i * 10) });
        placeEnemy(mite, world, mite.dist);
        world.enemies.push(mite);
      }
    }
  };

  world.burst = (x, y, color, n) => {
    for (let i = 0; i < n; i++) {
      const a = world.rng() * Math.PI * 2;
      const sp = 40 + world.rng() * 90;
      world.particles.push({
        x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
        age: 0, max: 0.4 + world.rng() * 0.3, color, size: 2 + world.rng() * 3,
      });
    }
  };

  world.zap = (x1, y1, x2, y2) => {
    world.zaps.push({ x1, y1, x2, y2, age: 0, max: 0.18 });
  };

  return world;
}

// ---- Map setup ------------------------------------------------------------
export function loadMap(world, mapIndex) {
  const map = MAPS[mapIndex];
  world.map = map;
  world.mapIndex = mapIndex;
  world.pathPts = pathPoints(map);
  world.pathLen = pathLength(world.pathPts);
  const eff = relicEffects(world.relics);
  world.livesMax = START_LIVES + eff.lives;
  world.lives = world.livesMax;
  world.gold = START_GOLD + eff.startGold;
  world.waveIndex = 0;
  world.waveState = 'build';
  world.spawnQueue = [];
  world.enemies = [];
  world.towers = [];
  world.projectiles = [];
  world.particles = [];
  world.bursts = [];
  world.zaps = [];
  world.coins = [];
  world.kills = 0;
  world.goldEarned = 0;
  world.leaks = 0;
  world.timePlayed = 0;
  world.time = 0;
  world.speed = 1;
  world.paused = false;
  world.selectedPlot = null;
  world.selectedTower = null;
  world.buildType = null;
  world.hazardTimer = map.hazards ? map.hazards.interval : 0;
  world.stormTimer = map.hazards && map.hazards.kind === 'storm' ? map.hazards.interval : 0;
  world.novaUntil = 0;
  world.boss = null;
  world.victoryInfo = null;
  world.state = 'play';
}

export function startMap(world, mapIndex) {
  loadMap(world, mapIndex);
}

// ---- Waves ----------------------------------------------------------------
function buildSpawnQueue(world) {
  const map = world.map;
  const wave = map.waves[world.waveIndex];
  const queue = [];
  let at = 0.5;
  for (const group of wave) {
    const [type, n, gap, hpMul] = group;
    for (let i = 0; i < n; i++) {
      queue.push({ at: at + i * gap, type, hpMul, elite: false, dist: 0 });
    }
    at += n * gap + 1.2;
  }
  // Portal spawns: shades slip in mid-path on listed waves.
  for (const portal of map.portals || []) {
    if (!portal.waves.includes(world.waveIndex + 1)) continue;
    const dist = pathDistOfCell(world.pathPts, portal.cell[0], portal.cell[1]);
    for (let i = 0; i < portal.n; i++) {
      queue.push({ at: 6 + i * 3, type: portal.type, hpMul: 1.6, elite: false, dist });
    }
  }
  queue.sort((a, b) => a.at - b.at);
  return queue;
}

export function startWave(world) {
  if (world.state !== 'play' || world.waveState !== 'build') return false;
  // Swift commanders are rewarded: starting the next wave within 10s of
  // clearing the last one pays +25 gold.
  if (world.time - (world.lastWaveEnd || -1000) < 10) {
    world.gold += 25;
    world.goldEarned += 25;
  }
  world.spawnQueue = buildSpawnQueue(world);
  world.spawnClock = 0;
  world.waveState = 'fighting';
  world.sfx.wave();
  return true;
}

// Call the next wave early for a gold bonus.
export function callEarly(world) {
  return startWave(world);
}

function spawnOne(world, spec) {
  let e;
  if (spec.type.startsWith('boss:')) {
    const id = spec.type.slice(5);
    e = makeBoss(id, { hpMul: spec.hpMul });
    world.boss = e;
    world.sfx.boss();
  } else {
    e = makeEnemy(spec.type, { hpMul: spec.hpMul, elite: spec.elite, dist: spec.dist });
  }
  placeEnemy(e, world, spec.dist || 0);
  world.enemies.push(e);
}

function waveCleared(world) {
  const bonus = 20 + (world.waveIndex + 1) * 5;
  world.gold += bonus;
  world.goldEarned += bonus;
  world.lastWaveEnd = world.time;
  if (world.waveIndex >= world.map.waves.length - 1) {
    winMap(world);
    return;
  }
  world.waveIndex += 1;
  world.waveState = 'build';
}

function winMap(world) {
  const stars = starsForResult(true, world.lives, world.livesMax);
  const shards = recordMapWin(world.save, world.mapIndex, stars);
  storeSave(world.save);
  world.victoryInfo = {
    stars,
    shards,
    kills: world.kills,
    goldEarned: world.goldEarned,
    timeSecs: Math.round(world.timePlayed),
    lives: world.lives,
    livesMax: world.livesMax,
  };
  const best = world.save.best;
  best.kills = Math.max(best.kills, world.kills);
  best.goldEarned = Math.max(best.goldEarned, world.goldEarned);
  best.timeSecs += Math.round(world.timePlayed);
  best.stars = totalStars(world.save);
  storeSave(world.save);
  world.sfx.win();
  if (world.mapIndex >= MAPS.length - 1) {
    world.campaignStats = {
      stars: totalStars(world.save),
      kills: best.kills,
      goldEarned: best.goldEarned,
      timeSecs: best.timeSecs,
    };
    world.state = 'campaign';
  } else {
    world.state = 'victory';
  }
}

function loseMap(world) {
  world.sfx.lose();
  world.state = 'defeat';
}

// ---- Building -------------------------------------------------------------
export function plotAt(world, col, row) {
  for (const [c, r] of world.map.plots) {
    if (c === col && r === row) return true;
  }
  return false;
}

export function towerAt(world, col, row) {
  return world.towers.find((t) => t.col === col && t.row === row) || null;
}

export function placeTower(world, col, row, type) {
  if (world.state !== 'play') return false;
  if (!plotAt(world, col, row)) return false;
  if (towerAt(world, col, row)) return false;
  const cost = towerCost(type, world.relics);
  if (world.gold < cost) {
    world.sfx.denied();
    return false;
  }
  world.gold -= cost;
  world.towers.push(makeTower(type, col, row, cost));
  world.sfx.place();
  return true;
}

export function upgradeSelected(world) {
  const t = world.selectedTower;
  if (!t || !canUpgrade(t)) return false;
  const cost = upgradeCost(t.type, t.tier + 1);
  if (world.gold < cost) {
    world.sfx.denied();
    return false;
  }
  world.gold -= cost;
  doUpgrade(t);
  world.sfx.upgrade();
  return true;
}

export function sellSelected(world) {
  const t = world.selectedTower;
  if (!t) return false;
  world.gold += towerSellValue(t);
  world.towers = world.towers.filter((o) => o !== t);
  world.selectedTower = null;
  world.sfx.sell();
  return true;
}

// ---- Boss timers ------------------------------------------------------------
function stepBoss(world, dt) {
  const b = world.boss;
  if (!b || b.dead || b.leaked) return;
  if (b.boss === 'gloom' && b.phase === 1 && b.hp < b.maxHp / 2) {
    b.phase = 2;
    world.burst(b.x, b.y, '#ff6a8a', 24);
    world.sfx.boss();
  }
  if (b.boss === 'frost') {
    b.novaTimer -= dt;
    if (b.novaTimer <= 0) {
      b.novaTimer = 9;
      world.novaUntil = world.time + 2;
      world.sfx.freeze();
      world.bursts.push({ x: b.x, y: b.y, r: 160, age: 0, max: 0.5, color: '#bfe9ff' });
    }
  } else if (b.boss === 'storm') {
    b.summonTimer -= dt;
    if (b.summonTimer <= 0) {
      b.summonTimer = 12;
      for (let i = 0; i < 3; i++) {
        const bat = makeEnemy('bat', { hpMul: 1.5, dist: Math.max(0, b.dist - 20 - i * 15) });
        placeEnemy(bat, world, bat.dist);
        world.enemies.push(bat);
      }
      world.sfx.wave();
    }
  } else if (b.boss === 'gloom') {
    b.summonTimer -= dt;
    if (b.summonTimer <= 0) {
      b.summonTimer = 10;
      for (let i = 0; i < 2; i++) {
        const s = makeEnemy('shade', { hpMul: 1.6, dist: Math.max(0, b.dist - 20 - i * 15) });
        placeEnemy(s, world, s.dist);
        world.enemies.push(s);
      }
      world.sfx.wave();
    }
  }
}

// ---- Hazards ----------------------------------------------------------------
function stepHazards(world, dt) {
  const hz = world.map.hazards;
  if (!hz) return;
  if (hz.kind === 'vents') {
    world.hazardTimer -= dt;
    if (world.hazardTimer <= 0) {
      world.hazardTimer = hz.interval;
      for (const [c, r] of hz.cells) {
        const x = c * 80 + 40, y = 48 + r * 80 + 40;
        world.bursts.push({ x, y, r: 44, age: 0, max: 0.4, color: '#ff7a3c' });
        for (const e of world.enemies) {
          if (!e.dead && !e.leaked && Math.hypot(e.x - x, e.y - y) <= 44) {
            if (damageEnemy(e, hz.damage)) world.onEnemyKilled(e);
          }
        }
      }
      world.sfx.hit();
    }
  } else if (hz.kind === 'storm') {
    world.stormTimer -= dt;
    if (world.stormTimer <= 0) {
      world.stormTimer = hz.interval;
      let target = null;
      let best = -1;
      for (const e of world.enemies) {
        if (!e.dead && !e.leaked && e.dist > best) { best = e.dist; target = e; }
      }
      if (target) {
        world.zap(target.x, 48, target.x, target.y);
        world.bursts.push({ x: target.x, y: target.y, r: 30, age: 0, max: 0.3, color: '#ffe14d' });
        if (damageEnemy(target, hz.damage)) world.onEnemyKilled(target);
        world.sfx.shoot('spark');
      }
    }
  }
}

// ---- Main step --------------------------------------------------------------
export function stepWorld(world, rawDt) {
  if (world.state === 'title') {
    world.titleTime += rawDt;
    return;
  }
  if (world.state !== 'play' || world.paused) return;
  const dt = rawDt * world.speed;
  world.time += dt;
  world.timePlayed += dt;

  if (world.waveState === 'fighting') {
    world.spawnClock += dt;
    while (world.spawnQueue.length && world.spawnQueue[0].at <= world.spawnClock) {
      spawnOne(world, world.spawnQueue.shift());
    }
  }

  for (const e of world.enemies) {
    if (e.dead || e.leaked) continue;
    if (stepEnemy(e, dt, world, world.time) === 'leaked') {
      const cost = e.boss ? 5 : 1;
      world.lives -= cost;
      world.leaks += 1;
      world.sfx.leak();
      world.burst(e.x, e.y, '#ff5d5d', 8);
      if (world.lives <= 0) {
        world.lives = 0;
        loseMap(world);
        return;
      }
    }
  }

  stepBoss(world, dt);
  for (const t of world.towers) stepTower(world, t, dt);
  stepProjectiles(world, dt);
  stepHazards(world, dt);

  world.enemies = world.enemies.filter((e) => !e.dead && !e.leaked);

  for (const p of world.particles) { p.age += dt; p.x += p.vx * dt; p.y += p.vy * dt; }
  world.particles = world.particles.filter((p) => p.age < p.max);
  for (const b of world.bursts) b.age += dt;
  world.bursts = world.bursts.filter((b) => b.age < b.max);
  for (const z of world.zaps) z.age += dt;
  world.zaps = world.zaps.filter((z) => z.age < z.max);
  for (const c of world.coins) { c.age += dt; c.y -= 24 * dt; }
  world.coins = world.coins.filter((c) => c.age < c.max);

  if (world.waveState === 'fighting' && world.spawnQueue.length === 0 && world.enemies.length === 0) {
    waveCleared(world);
  }
}

