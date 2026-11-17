// Deterministic screenshot scenes: ?shot=<scene>&seed=<n> builds a fixed
// world state from a seeded random stream, freezes the clock, and lets the
// main loop draw exactly that frame. No wall clock, no input, same pixels
// every run.

import { loadMap, startWave, stepWorld } from './world.js';
import { makeTower } from './towers.js';
import { makeRng } from './random.js';

function place(world, type, col, row, tier) {
  const t = makeTower(type, col, row, 0);
  t.tier = tier || 1;
  t.invested = 100;
  world.towers.push(t);
  return t;
}

function simulate(world, seconds) {
  const steps = Math.round(seconds * 60);
  for (let i = 0; i < steps; i++) {
    stepWorld(world, 1 / 60);
    if (world.state !== 'play') break;
  }
}

export function buildShot(world, scene, seed) {
  world.rng = makeRng(seed || 1);
  world.sfx.muted = true;
  world.time = 0;

  if (scene === 'start') {
    // Title screen over a campaign already half-lit.
    world.save.stars = [3, 3, 2, 3, 3, 3, 3];
    world.state = 'title';
    world.titleTime = 2.0;
    return 'start';
  }

  if (scene === 'play') {
    // Stormspire, wave 4 in full swing: towers up, Gloom mid-path.
    loadMap(world, 4);
    world.gold = 420;
    place(world, 'arrow', 5, 3, 2);
    place(world, 'frost', 6, 2, 1);
    place(world, 'cannon', 9, 4, 2);
    place(world, 'spark', 8, 2, 2);
    place(world, 'longbow', 12, 4, 1);
    place(world, 'totem', 10, 4, 1);
    place(world, 'arrow', 3, 5, 1);
    world.waveIndex = 3;
    startWave(world);
    // 14s in: the first kills have landed and gold has grown, so the HUD
    // shows a fight in progress instead of an untouched opening.
    simulate(world, 14);
    // Select the cannon so the range ring and upgrade panel show.
    world.selectedTower = world.towers.find((t) => t.type === 'cannon');
    world.selectedPlot = null;
    return 'play';
  }

  if (scene === 'boss') {
    // Crown of Embers, final wave: the Gloom Sovereign walks the path.
    loadMap(world, 6);
    world.gold = 650;
    world.lives = 14;
    place(world, 'longbow', 8, 3, 3);
    place(world, 'cannon', 10, 4, 2);
    place(world, 'spark', 7, 2, 2);
    place(world, 'frost', 11, 3, 2);
    place(world, 'arrow', 5, 2, 2);
    place(world, 'totem', 7, 4, 1);
    place(world, 'longbow', 13, 3, 2);
    place(world, 'cannon', 11, 5, 2);
    world.waveIndex = 7;
    startWave(world);
    // Step until the boss is a third of the way along the path.
    let guard = 0;
    while (guard++ < 6000) {
      stepWorld(world, 1 / 60);
      if (world.state !== 'play') break;
      if (world.boss && world.boss.dist > world.pathLen * 0.35) break;
    }
    return 'boss';
  }

  if (scene === 'win') {
    // Campaign victory: all seven beacons lit, totals on the board.
    loadMap(world, 6);
    world.save.stars = [3, 3, 2, 3, 3, 3, 3];
    world.campaignStats = { stars: 19, kills: 842, goldEarned: 12480, timeSecs: 2145 };
    world.state = 'campaign';
    return 'win';
  }

  return 'start';
}
