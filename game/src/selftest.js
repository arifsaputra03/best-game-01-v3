// Headless tests, run in the browser with ?selftest=1. No rendering, no
// sound, no network: pure logic stepped at a fixed 1/60s. The auto-player
// proves every map is winnable with a simple greedy strategy — if it
// cannot win a map, the balance is wrong, not the test.

import { createWorld, loadMap, startWave, stepWorld, placeTower, upgradeSelected, sellSelected, towerAt } from './world.js';
import { MAPS, isPathCell } from './levels.js';
import { towerCost, upgradeCost, relicEffects } from './config.js';
import { freshSave, buyRelic, recordMapWin, totalStars } from './economy.js';
import { makeEnemy, makeBoss, damageEnemy, placeEnemy } from './enemies.js';
import { towerSellValue } from './towers.js';
import { makeRng } from './random.js';
import { buildShot } from './shots.js';

export function silentSfx() {
  const noop = () => {};
  return {
    muted: true, shoot: noop, hit: noop, coin: noop, leak: noop,
    place: noop, upgrade: noop, sell: noop, wave: noop, click: noop,
    denied: noop, boss: noop, freeze: noop, win: noop, lose: noop,
  };
}

function newWorld(mapIndex, seed) {
  const save = freshSave();
  const world = createWorld(save, silentSfx(), makeRng(seed || 1));
  loadMap(world, mapIndex);
  return world;
}

function stepN(world, seconds) {
  const steps = Math.round(seconds * 60);
  for (let i = 0; i < steps; i++) {
    stepWorld(world, 1 / 60);
    if (world.state !== 'play') break;
  }
}

// Greedy auto-player: rank plots by how much path they cover, buy a fixed
// mix, upgrade when rich, call waves fast. Returns the end state.
function autoPlayMap(mapIndex, seed) {
  const save = freshSave();
  // Give the auto-player the relics a real campaign would have earned by
  // then: a few tiers spread across damage, gold and lives.
  save.relics = { sharp: 2, hoard: 1, sturdy: 1, pockets: 1 };
  const world = createWorld(save, silentSfx(), makeRng(seed || 1));
  loadMap(world, mapIndex);

  const mix = ['arrow', 'frost', 'cannon', 'spark', 'longbow', 'totem', 'arrow', 'cannon', 'spark', 'arrow', 'longbow', 'frost', 'cannon', 'arrow', 'spark'];
  let mixIdx = 0;

  // Plots ranked by path cells within arrow range.
  const ranked = world.map.plots.slice().sort((a, b) => cover(world, b) - cover(world, a));

  function cover(world, plot) {
    const px = plot[0] * 80 + 40, py = 48 + plot[1] * 80 + 40;
    let n = 0;
    for (let i = 0; i < world.pathPts.length - 1; i++) {
      const ax = world.pathPts[i].x, ay = world.pathPts[i].y;
      const bx = world.pathPts[i + 1].x, by = world.pathPts[i + 1].y;
      const steps = 12;
      for (let s = 0; s <= steps; s++) {
        const x = ax + ((bx - ax) * s) / steps;
        const y = ay + ((by - ay) * s) / steps;
        if (Math.hypot(x - px, y - py) <= 2.2 * 80) n++;
      }
    }
    return n;
  }

  function spend() {
    // Buy the next tower in the mix on the best free plot, while affordable.
    let bought = true;
    while (bought) {
      bought = false;
      const plot = ranked.find(([c, r]) => !towerAt(world, c, r));
      if (!plot) break;
      const type = mix[mixIdx % mix.length];
      const cost = towerCost(type, world.relics);
      if (world.gold >= cost) {
        if (placeTower(world, plot[0], plot[1], type)) {
          mixIdx++;
          bought = true;
        } else break;
      }
    }
    // Then upgrade the cheapest tier-1 tower we can afford.
    let upgraded = true;
    while (upgraded) {
      upgraded = false;
      const t = world.towers.filter((o) => o.tier < 3).sort((a, b) => upgradeCost(a.type, a.tier + 1) - upgradeCost(b.type, b.tier + 1))[0];
      if (t && world.gold >= upgradeCost(t.type, t.tier + 1)) {
        world.selectedTower = t;
        if (upgradeSelected(world)) upgraded = true;
      }
    }
    world.selectedTower = null;
  }

  let guard = 0;
  while (world.state === 'play' && guard++ < 60 * 60 * 12) {
    if (world.waveState === 'build') {
      spend();
      startWave(world);
    }
    stepWorld(world, 1 / 60);
  }
  return {
    state: world.state,
    lives: world.lives,
    kills: world.kills,
    waves: world.waveIndex + 1,
    gold: world.gold,
  };
}

export function runSelfTests() {
  const results = [];
  const t = (name, fn) => {
    try {
      const info = fn();
      results.push({ name, pass: true, info: info || '' });
    } catch (e) {
      results.push({ name, pass: false, info: String(e && e.message || e) });
    }
  };
  const assert = (cond, msg) => {
    if (!cond) throw new Error(msg || 'assertion failed');
  };

  t('maps-parse', () => {
    assert(MAPS.length === 7, 'need 7 maps');
    for (const map of MAPS) {
      assert(map.waves.length >= 5, `${map.name}: too few waves`);
      assert(map.plots.length >= 12, `${map.name}: too few plots`);
      for (let i = 1; i < map.path.length; i++) {
        const [c0, r0] = map.path[i - 1];
        const [c1, r1] = map.path[i];
        const d = Math.abs(c1 - c0) + Math.abs(r1 - r0);
        assert(d > 0, `${map.name}: zero-length path step`);
      }
      for (const [c, r] of map.plots) {
        assert(!isPathCell(map, c, r), `${map.name}: plot on path at ${c},${r}`);
        assert(c >= 0 && c < 16 && r >= 0 && r < 7, `${map.name}: plot off grid`);
      }
    }
    return '7 maps, paths and plots valid';
  });

  t('economy-place', () => {
    const w = newWorld(0);
    const plot = w.map.plots[0];
    const before = w.gold;
    assert(placeTower(w, plot[0], plot[1], 'arrow'), 'place arrow');
    assert(w.gold === before - towerCost('arrow', w.relics), 'gold deducted');
    assert(!placeTower(w, plot[0], plot[1], 'arrow'), 'no double place');
    assert(!placeTower(w, w.map.path[0][0], w.map.path[0][1], 'arrow'), 'no place on path');
    w.gold = 0;
    const plot2 = w.map.plots[1];
    assert(!placeTower(w, plot2[0], plot2[1], 'arrow'), 'no place without gold');
    const tw = w.towers[0];
    const refund = towerSellValue(tw);
    w.selectedTower = tw;
    assert(sellSelected(w), 'sell works');
    assert(w.gold === refund, 'refund is 70%');
    return `refund ${refund}g`;
  });

  t('combat-kill', () => {
    const w = newWorld(0);
    const plot = w.map.plots[0];
    placeTower(w, plot[0], plot[1], 'arrow');
    const e = makeEnemy('shambler', { hpMul: 1 });
    placeEnemy(e, w, 100);
    w.enemies.push(e);
    stepN(w, 6);
    assert(e.dead, 'arrow tower killed the shambler');
    assert(w.kills === 1, 'kill counted');
    return 'shambler dead, 1 kill';
  });

  t('combat-frost', () => {
    const w = newWorld(0);
    placeTower(w, w.map.plots[0][0], w.map.plots[0][1], 'frost');
    const e = makeEnemy('wisp', { hpMul: 1 });
    placeEnemy(e, w, 100);
    w.enemies.push(e);
    const d0 = e.dist;
    stepN(w, 3);
    assert(e.dist < d0 + 78 * 3 * 0.95, 'frost slowed the wisp');
    return 'wisp slowed';
  });

  t('combat-cannon', () => {
    const w = newWorld(0);
    placeTower(w, w.map.plots[0][0], w.map.plots[0][1], 'cannon');
    const a = makeEnemy('shambler', { hpMul: 1 });
    const b = makeEnemy('shambler', { hpMul: 1 });
    placeEnemy(a, w, 100);
    placeEnemy(b, w, 130);
    w.enemies.push(a, b);
    stepN(w, 4);
    assert(a.hp < 30 || b.hp < 30, 'cannon splash hurt a neighbor');
    return 'splash hit';
  });

  t('combat-spark', () => {
    const w = newWorld(0);
    placeTower(w, w.map.plots[0][0], w.map.plots[0][1], 'spark');
    for (let i = 0; i < 3; i++) {
      const e = makeEnemy('wisp', { hpMul: 1 });
      placeEnemy(e, w, 100 + i * 25);
      w.enemies.push(e);
    }
    // Check early: the chain hurts several targets at once, before any
    // of them has time to die and leave the enemies list.
    stepN(w, 0.6);
    const hurt = w.enemies.filter((e) => e.hp < e.maxHp).length;
    assert(hurt >= 2, `spark chained to ${hurt} targets`);
    return `chained to ${hurt}`;
  });

  t('combat-armor', () => {
    const b = makeEnemy('beetle', { hpMul: 1 });
    const before = b.hp;
    damageEnemy(b, 3);
    assert(b.hp === before - 1, 'beetle armor absorbs to 1 damage');
    return 'armor works';
  });

  t('wave-flow', () => {
    const w = newWorld(0);
    const gold0 = w.gold;
    assert(startWave(w), 'wave starts');
    assert(w.waveState === 'fighting', 'fighting');
    stepN(w, 120);
    assert(w.waveIndex >= 1 || w.state !== 'play', 'wave advanced or map ended');
    assert(w.gold > gold0 || w.kills > 0, 'wave paid out');
    return `wave ${w.waveIndex + 1}, kills ${w.kills}`;
  });

  t('boss-spawn', () => {
    const w = newWorld(2);
    // Gold first, then the tower line — placeTower deducts as it goes.
    w.gold = 5000;
    for (const [c, r] of w.map.plots.slice(0, 6)) placeTower(w, c, r, 'longbow');
    for (const [c, r] of w.map.plots.slice(6, 12)) placeTower(w, c, r, 'cannon');
    let guard = 0;
    while (w.state === 'play' && w.waveIndex < 5 && guard++ < 60 * 60 * 10) {
      if (w.waveState === 'build') startWave(w);
      stepWorld(w, 1 / 60);
    }
    assert(w.waveIndex === 5, `reached wave 6, got wave ${w.waveIndex + 1}`);
    assert(w.state === 'play', 'still alive at wave 6');
    startWave(w);
    stepN(w, 25);
    assert(w.boss, 'Frost Herald spawned on wave 6');
    stepN(w, 120);
    assert(w.boss.dead || w.state === 'victory', 'boss died or map won');
    return 'boss handled';
  });

  t('leak-lose', () => {
    const w = newWorld(0);
    w.lives = 1;
    startWave(w);
    stepN(w, 120);
    assert(w.state === 'defeat' || w.lives < 1, 'leaks end the map');
    return `lives ${w.lives}`;
  });

  t('relics', () => {
    const save = freshSave();
    save.shards = 100;
    assert(buyRelic(save, 'sharp'), 'buy sharp tier 1');
    assert(relicEffects(save.relics).dmgMul > 1.07, 'damage bonus applies');
    save.shards = 0;
    assert(!buyRelic(save, 'sharp'), 'cannot buy without shards');
    return 'relic shop works';
  });

  t('stars', () => {
    const save = freshSave();
    const shards = recordMapWin(save, 0, 3);
    assert(save.stars[0] === 3, '3 stars kept');
    assert(shards === 35, '35 shards for 3 stars + win');
    assert(save.unlocked === 2, 'next beacon unlocked');
    assert(totalStars(save) === 3, 'total stars 3');
    return '3 stars, 35 shards';
  });

  t('save-roundtrip', () => {
    const save = freshSave();
    save.stars = [3, 2, 0, 0, 0, 0, 0];
    save.shards = 42;
    save.relics = { sharp: 2 };
    // Round-trip through JSON, the same shape localStorage holds.
    const back = JSON.parse(JSON.stringify(save));
    assert(back.stars[0] === 3 && back.shards === 42 && back.relics.sharp === 2, 'save survives JSON');
    return 'save shape stable';
  });

  t('boss-phase', () => {
    const b = makeBoss('gloom', {});
    assert(b.phase === 1, 'phase 1 at full health');
    damageEnemy(b, b.maxHp * 0.6);
    const w = newWorld(6);
    w.boss = b;
    b.dist = 100;
    placeEnemy(b, w, 100);
    w.enemies.push(b);
    stepN(w, 1);
    assert(b.phase === 2, 'phase 2 below half health');
    return 'gloom enrages';
  });

  t('robustness', () => {
    const w = newWorld(6);
    for (const [c, r] of w.map.plots.slice(0, 8)) placeTower(w, c, r, 'arrow');
    startWave(w);
    stepN(w, 5);
    assert(w.state === 'play' || w.state === 'victory' || w.state === 'defeat', 'no crash in 5s');
    return `5s simulated, ${w.enemies.length} enemies live`;
  });

  t('shots-ready', () => {
    for (const scene of ['start', 'play', 'boss', 'win']) {
      const save = freshSave();
      const world = createWorld(save, silentSfx(), makeRng(1));
      const got = buildShot(world, scene, 1);
      assert(got === scene, `shot ${scene} builds`);
    }
    return '4 scenes build';
  });

  // The balance proof: a greedy auto-player must win every map.
  for (let i = 0; i < 7; i++) {
    t(`autoplay-map-${i + 1}`, () => {
      const r = autoPlayMap(i, i + 11);
      assert(r.state === 'victory' || r.state === 'campaign', `map ${i + 1} ended ${r.state}, lives ${r.lives}, waves ${r.waves}`);
      return `${MAPS[i].name}: won with ${r.lives} lives, ${r.kills} kills`;
    });
  }

  const passed = results.filter((r) => r.pass).length;
  const failed = results.filter((r) => !r.pass);
  return { passed, failed: failed.length, total: results.length, results };
}
