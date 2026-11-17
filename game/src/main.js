// EMBERWARD — entry point. Boots the canvas, runs the fixed-timestep
// loop, routes clicks and keys to the world, and serves the two special
// modes: ?selftest=1 (headless logic tests) and ?shot=<scene> (a frozen,
// deterministic frame for screenshots).

import { createWorld, loadMap, startWave, stepWorld, placeTower, upgradeSelected, sellSelected, towerAt } from './world.js';
import { draw, uiHit } from './render.js';
import { createInput } from './input.js';
import { createAudio } from './audio.js';
import { loadSave, storeSave, buyRelic } from './economy.js';
import { buildShot } from './shots.js';
import { runSelfTests } from './selftest.js';
import { makeRng } from './random.js';
import { towerCost } from './config.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const params = new URLSearchParams(location.search);
const shotScene = params.get('shot');
const selftestMode = params.get('selftest') === '1';

const save = loadSave();
const sfx = createAudio();
sfx.muted = !!save.muted;
const world = createWorld(save, sfx, makeRng((Date.now() % 2147483647) || 1));
const input = createInput(canvas);

// ---- Self-test mode ---------------------------------------------------------
if (selftestMode) {
  const out = runSelfTests();
  const lines = out.results.map((r) => `${r.pass ? 'PASS' : 'FAIL'} ${r.name} — ${r.info}`);
  console.log(`SELFTEST ${out.passed}/${out.total} passed`);
  lines.forEach((l) => console.log(l));
  document.title = `SELFTEST ${out.passed}/${out.total}`;
  const pre = document.createElement('pre');
  pre.id = 'selftest-results';
  pre.textContent = `SELFTEST ${out.passed}/${out.total} passed\n` + lines.join('\n');
  document.body.appendChild(pre);
  window.__selftest = out;
  window.__shotReady = true;
} else if (shotScene) {
  // ---- Screenshot mode: one frozen, deterministic frame --------------------
  buildShot(world, shotScene, parseInt(params.get('seed') || '1', 10));
  draw(ctx, world, input);
  window.__shotReady = true;
} else {
  // ---- Normal play ----------------------------------------------------------
  world.state = 'title';

  function dispatchClick(x, y) {
    const hit = uiHit(world, x, y);
    if (!hit) {
      world.selectedTower = null;
      world.selectedPlot = null;
      return;
    }
    switch (hit.kind) {
      case 'title':
        world.state = 'map';
        sfx.click();
        break;
      case 'back':
        world.state = world.state === 'shop' ? 'map' : 'title';
        sfx.click();
        break;
      case 'shop':
        world.state = 'shop';
        sfx.click();
        break;
      case 'map':
        loadMap(world, hit.id);
        sfx.click();
        break;
      case 'relic':
        if (buyRelic(world.save, hit.id)) {
          storeSave(world.save);
          sfx.upgrade();
        } else {
          sfx.denied();
        }
        break;
      case 'wave':
        if (startWave(world)) sfx.click();
        break;
      case 'speed':
        world.speed = world.speed === 1 ? 2 : 1;
        sfx.click();
        break;
      case 'pause':
        world.state = 'pause';
        sfx.click();
        break;
      case 'mute':
        sfx.muted = !sfx.muted;
        world.save.muted = sfx.muted;
        storeSave(world.save);
        break;
      case 'build':
        world.buildType = world.buildType === hit.type ? null : hit.type;
        world.selectedTower = null;
        world.selectedPlot = null;
        sfx.click();
        break;
      case 'field': {
        const tower = towerAt(world, hit.col, hit.row);
        if (world.buildType) {
          placeTower(world, hit.col, hit.row, world.buildType);
        } else if (tower) {
          world.selectedTower = tower;
          world.selectedPlot = null;
          sfx.click();
        } else {
          world.selectedTower = null;
          world.selectedPlot = { col: hit.col, row: hit.row };
        }
        break;
      }
      case 'upgrade':
        upgradeSelected(world);
        break;
      case 'sell':
        sellSelected(world);
        break;
      case 'resume':
        world.state = 'play';
        sfx.click();
        break;
      case 'restart':
      case 'retry':
        loadMap(world, world.mapIndex);
        sfx.click();
        break;
      case 'next':
        loadMap(world, Math.min(6, world.mapIndex + 1));
        sfx.click();
        break;
      case 'menu':
      case 'again':
        world.state = 'map';
        sfx.click();
        break;
      default:
        break;
    }
  }

  function handleKeys() {
    const hotkeys = { 1: 'arrow', 2: 'frost', 3: 'cannon', 4: 'spark', 5: 'longbow', 6: 'totem' };
    for (const [key, type] of Object.entries(hotkeys)) {
      if (input.wasPressed(key)) {
        world.buildType = world.buildType === type ? null : type;
        world.selectedTower = null;
        world.selectedPlot = null;
      }
    }
    if (input.wasPressed('Escape')) {
      if (world.buildType || world.selectedTower || world.selectedPlot) {
        world.buildType = null;
        world.selectedTower = null;
        world.selectedPlot = null;
      } else if (world.state === 'play') {
        world.state = 'pause';
      } else if (world.state === 'pause') {
        world.state = 'play';
      }
    }
    if (input.wasPressed(' ')) {
      if (world.state === 'play') startWave(world);
      else if (world.state === 'title') world.state = 'map';
    }
    if (input.wasPressed('Enter')) {
      if (world.state === 'title') world.state = 'map';
      else if (world.state === 'victory') loadMap(world, Math.min(6, world.mapIndex + 1));
      else if (world.state === 'defeat') loadMap(world, world.mapIndex);
      else if (world.state === 'campaign') world.state = 'map';
    }
    if (input.wasPressed('p') || input.wasPressed('P')) {
      if (world.state === 'play') world.state = 'pause';
      else if (world.state === 'pause') world.state = 'play';
    }
    if (input.wasPressed('f') || input.wasPressed('F')) {
      world.speed = world.speed === 1 ? 2 : 1;
    }
    if (input.wasPressed('m') || input.wasPressed('M')) {
      sfx.muted = !sfx.muted;
      world.save.muted = sfx.muted;
      storeSave(world.save);
    }
    if (input.wasPressed('r') || input.wasPressed('R')) {
      if (world.state === 'play' || world.state === 'pause' || world.state === 'defeat') {
        loadMap(world, world.mapIndex);
      }
    }
    if (input.rightClicked) {
      world.buildType = null;
      world.selectedTower = null;
      world.selectedPlot = null;
    }
  }

  const STEP = 1 / 60;
  let acc = 0;
  let last = performance.now();
  let first = true;

  function frame(now) {
    const dt = Math.min(0.1, (now - last) / 1000 || 0);
    last = now;
    if (first) { first = false; }
    handleKeys();
    if (input.clicked) dispatchClick(input.clicked.x, input.clicked.y);
    input.endFrame();
    if (world.state === 'play' || world.state === 'title') {
      acc += dt;
      let n = 0;
      while (acc >= STEP && n < 5) {
        stepWorld(world, STEP);
        acc -= STEP;
        n += 1;
      }
      if (n === 5) acc = 0;
    }
    draw(ctx, world, input);
    requestAnimationFrame(frame);
  }

  requestAnimationFrame(frame);
}

export { world };
