// Everything the player sees: the field, the towers, the Gloom, the HUD,
// the build bar, and every screen (title, map select, shop, pause,
// victory, defeat, campaign). Drawing is deterministic: decorations come
// from a seeded random stream keyed by the map, so a screenshot of a
// scene always looks the same.

import { VIEW, TOWERS, TOWER_ORDER, RELICS, RELIC_ORDER, towerCost, towerStats, canUpgrade, upgradeCost } from './config.js';
import { towerSellValue } from './towers.js';
import { MAPS } from './levels.js';
import { makeRng } from './random.js';
import { totalStars, relicTier, relicCost, canBuyRelic } from './economy.js';

const { W, H, HUD_H, FIELD_Y, CELL } = VIEW;

// ---- Layout ---------------------------------------------------------------
export const LAYOUT = {
  cards: TOWER_ORDER.map((_, i) => ({ x: 16 + i * 148, y: 616, w: 140, h: 96 })),
  waveBtn: { x: 924, y: 616, w: 168, h: 44 },
  speedBtn: { x: 924, y: 668, w: 80, h: 44 },
  pauseBtn: { x: 1012, y: 668, w: 80, h: 44 },
  muteBtn: { x: 1216, y: 8, w: 56, h: 32 },
  towerPanel: { x: 880, y: 440, w: 384, h: 152 },
  upgradeBtn: { x: 900, y: 536, w: 168, h: 44 },
  sellBtn: { x: 1076, y: 536, w: 168, h: 44 },
  mapNodes: MAPS.map((_, i) => ({ x: 140 + i * 170, y: i % 2 === 0 ? 280 : 400, r: 46 })),
  shopBtn: { x: 1060, y: 88, w: 180, h: 48 },
  backBtn: { x: 40, y: 88, w: 140, h: 48 },
};

function inRect(x, y, r) {
  return x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h;
}

function inCircle(x, y, c) {
  return Math.hypot(x - c.x, y - c.y) <= c.r;
}

// ---- Small drawing helpers ------------------------------------------------
function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function star(ctx, cx, cy, r, filled, color) {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const ang = -Math.PI / 2 + (i * Math.PI) / 5;
    const rad = i % 2 === 0 ? r : r * 0.45;
    const x = cx + Math.cos(ang) * rad;
    const y = cy + Math.sin(ang) * rad;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
  if (filled) {
    ctx.fillStyle = color || '#ffd76a';
    ctx.fill();
  } else {
    ctx.strokeStyle = '#8a7a55';
    ctx.lineWidth = 2;
    ctx.stroke();
  }
}

function text(ctx, s, x, y, size, color, align, weight) {
  ctx.fillStyle = color || '#fff';
  ctx.font = `${weight || 'bold'} ${size}px system-ui, sans-serif`;
  ctx.textAlign = align || 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(s, x, y);
}

function drawHeart(ctx, x, y, s, color) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(x - s * 0.35, y - s * 0.25, s * 0.38, 0, Math.PI * 2);
  ctx.arc(x + s * 0.35, y - s * 0.25, s * 0.38, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(x - s * 0.72, y - s * 0.05);
  ctx.lineTo(x + s * 0.72, y - s * 0.05);
  ctx.lineTo(x, y + s * 0.75);
  ctx.closePath();
  ctx.fill();
}

// ---- Field ------------------------------------------------------------------
function drawField(ctx, world) {
  const map = world.map;
  const pal = map.palette;
  const g = ctx.createLinearGradient(0, FIELD_Y, 0, FIELD_Y + 560);
  g.addColorStop(0, pal.ground);
  g.addColorStop(1, pal.ground2);
  ctx.fillStyle = g;
  ctx.fillRect(0, FIELD_Y, W, 560);

  // Seeded decorations, same every frame.
  const rng = makeRng(map.id * 1000 + 7);
  for (let i = 0; i < 70; i++) {
    const x = rng() * W;
    const y = FIELD_Y + rng() * 560;
    const kind = pal.decor;
    ctx.globalAlpha = 0.25 + rng() * 0.3;
    if (kind === 'snow') {
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(x, y, 1 + rng() * 2, 0, Math.PI * 2);
      ctx.fill();
    } else if (kind === 'ember' || kind === 'crown') {
      ctx.fillStyle = rng() > 0.5 ? '#ff9a5c' : '#ffd76a';
      ctx.beginPath();
      ctx.arc(x, y, 1 + rng() * 2.5, 0, Math.PI * 2);
      ctx.fill();
    } else if (kind === 'gloom') {
      ctx.fillStyle = '#6a5a99';
      ctx.beginPath();
      ctx.arc(x, y, 2 + rng() * 3, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.strokeStyle = pal.ground2;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + (rng() - 0.5) * 8, y - 6 - rng() * 6);
      ctx.stroke();
    }
  }
  ctx.globalAlpha = 1;

  // Terrain patches on the path (mud slows, ice hurries).
  for (const patch of map.terrain || []) {
    for (const [c, r] of patch.cells) {
      ctx.fillStyle = patch.kind === 'mud' ? 'rgba(90,70,40,0.55)' : 'rgba(200,230,255,0.5)';
      roundRect(ctx, c * CELL + 4, FIELD_Y + r * CELL + 4, CELL - 8, CELL - 8, 12);
      ctx.fill();
    }
  }

  // The path: a wide stone road with a lighter middle.
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.strokeStyle = pal.pathEdge;
  ctx.lineWidth = 66;
  ctx.beginPath();
  world.pathPts.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
  ctx.stroke();
  ctx.strokeStyle = pal.path;
  ctx.lineWidth = 56;
  ctx.beginPath();
  world.pathPts.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
  ctx.stroke();

  // Hazard vents: glowing holes that erupt.
  if (map.hazards && map.hazards.kind === 'vents') {
    const pulse = 0.6 + 0.4 * Math.sin(world.time * 3);
    for (const [c, r] of map.hazards.cells) {
      const x = c * CELL + 40, y = FIELD_Y + r * CELL + 40;
      ctx.fillStyle = '#1a0d08';
      ctx.beginPath();
      ctx.arc(x, y, 22, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = `rgba(255,122,60,${0.5 * pulse})`;
      ctx.beginPath();
      ctx.arc(x, y, 14, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Gloom portals: purple swirls where shades slip in.
  for (const portal of map.portals || []) {
    const x = portal.cell[0] * CELL + 40, y = FIELD_Y + portal.cell[1] * CELL + 40;
    const pulse = 0.5 + 0.3 * Math.sin(world.time * 2.5);
    ctx.strokeStyle = `rgba(180,140,255,${pulse})`;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(x, y, 26, world.time, world.time + Math.PI * 1.5);
    ctx.stroke();
    ctx.fillStyle = 'rgba(60,30,90,0.8)';
    ctx.beginPath();
    ctx.arc(x, y, 18, 0, Math.PI * 2);
    ctx.fill();
  }

  // The beacon at the path's end: the thing being defended.
  const end = world.pathPts[world.pathPts.length - 1];
  const glow = 0.5 + 0.3 * Math.sin(world.time * 2);
  ctx.fillStyle = `rgba(255,215,106,${glow})`;
  ctx.beginPath();
  ctx.arc(end.x, end.y, 30, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#ffd76a';
  ctx.beginPath();
  ctx.arc(end.x, end.y, 18, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#fff3c4';
  ctx.beginPath();
  ctx.arc(end.x, end.y, 8, 0, Math.PI * 2);
  ctx.fill();
}

// ---- Plots and towers ---------------------------------------------------------
function drawPlots(ctx, world, input) {
  const hover = input ? input.gridCell() : null;
  for (const [c, r] of world.map.plots) {
    const x = c * CELL + 40, y = FIELD_Y + r * CELL + 40;
    const has = world.towers.some((t) => t.col === c && t.row === r);
    if (has) continue;
    const isHover = hover && hover.col === c && hover.row === r;
    const isSel = world.selectedPlot && world.selectedPlot.col === c && world.selectedPlot.row === r;
    ctx.strokeStyle = isSel ? '#ffd76a' : isHover ? '#ffffff' : 'rgba(255,255,255,0.35)';
    ctx.lineWidth = isSel || isHover ? 3 : 2;
    ctx.setLineDash([6, 5]);
    ctx.beginPath();
    ctx.arc(x, y, 24, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
    if (isHover && world.buildType) {
      const stats = towerStats(world.buildType, 1, world.relics);
      ctx.strokeStyle = 'rgba(255,215,106,0.5)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(x, y, stats.range, 0, Math.PI * 2);
      ctx.stroke();
    }
  }
}

function drawTowerShape(ctx, type, x, y, color, dark, tier) {
  ctx.fillStyle = dark;
  ctx.beginPath();
  ctx.arc(x, y + 8, 22, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = color;
  if (type === 'arrow') {
    ctx.beginPath();
    ctx.moveTo(x, y - 20);
    ctx.lineTo(x + 14, y + 10);
    ctx.lineTo(x - 14, y + 10);
    ctx.closePath();
    ctx.fill();
  } else if (type === 'frost') {
    ctx.beginPath();
    ctx.moveTo(x, y - 22);
    ctx.lineTo(x + 12, y);
    ctx.lineTo(x, y + 16);
    ctx.lineTo(x - 12, y);
    ctx.closePath();
    ctx.fill();
  } else if (type === 'cannon') {
    ctx.beginPath();
    ctx.arc(x, y - 4, 15, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#2a2a2a';
    ctx.fillRect(x - 4, y - 22, 8, 18);
  } else if (type === 'spark') {
    ctx.beginPath();
    ctx.arc(x, y - 6, 13, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#fff3c4';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(x - 6, y - 14);
    ctx.lineTo(x + 2, y - 4);
    ctx.lineTo(x - 4, y + 4);
    ctx.lineTo(x + 6, y + 12);
    ctx.stroke();
  } else if (type === 'longbow') {
    ctx.strokeStyle = color;
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.arc(x, y + 6, 18, -Math.PI * 0.75, Math.PI * 0.75);
    ctx.stroke();
    ctx.strokeStyle = '#fff3c4';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x - 12, y - 8);
    ctx.lineTo(x - 12, y + 18);
    ctx.stroke();
  } else if (type === 'totem') {
    ctx.fillRect(x - 5, y - 22, 10, 34);
    ctx.fillStyle = '#ff9a3c';
    ctx.beginPath();
    ctx.arc(x, y - 24, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffd76a';
    ctx.beginPath();
    ctx.arc(x, y - 24, 4, 0, Math.PI * 2);
    ctx.fill();
  }
  // Tier pips.
  for (let i = 0; i < tier; i++) {
    ctx.fillStyle = '#ffd76a';
    ctx.beginPath();
    ctx.arc(x - 10 + i * 10, y + 24, 3.5, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawTowers(ctx, world) {
  for (const t of world.towers) {
    const def = TOWERS[t.type];
    if (world.selectedTower === t) {
      const stats = towerStats(t.type, t.tier, world.relics);
      ctx.strokeStyle = 'rgba(255,215,106,0.55)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(t.x, t.y, stats.range, 0, Math.PI * 2);
      ctx.stroke();
    }
    drawTowerShape(ctx, t.type, t.x, t.y, def.color, def.dark, t.tier);
    if (t.flash > 0) {
      ctx.fillStyle = 'rgba(255,255,255,0.5)';
      ctx.beginPath();
      ctx.arc(t.x, t.y - 6, 10, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

// ---- Enemies ------------------------------------------------------------------
function drawEnemyShape(ctx, e, now) {
  const bob = e.flying ? Math.sin(now * 6 + e.wobble) * 5 : 0;
  const y = e.y + bob;
  if (e.flying) {
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.beginPath();
    ctx.ellipse(e.x, e.y + 14, e.radius, 5, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = e.flash > 0 ? '#ffffff' : e.color;
  const r = e.radius;
  if (e.type === 'shambler') {
    ctx.beginPath();
    ctx.arc(e.x, y, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#2a2a2a';
    ctx.beginPath();
    ctx.arc(e.x - 4, y - 3, 2.5, 0, Math.PI * 2);
    ctx.arc(e.x + 4, y - 3, 2.5, 0, Math.PI * 2);
    ctx.fill();
  } else if (e.type === 'wisp') {
    ctx.globalAlpha = 0.85;
    ctx.beginPath();
    ctx.arc(e.x, y, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(e.x, y, r * 0.4, 0, Math.PI * 2);
    ctx.fill();
  } else if (e.type === 'beetle') {
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      const px = e.x + Math.cos(a) * r, py = y + Math.sin(a) * r;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = e.dark;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(e.x, y - r);
    ctx.lineTo(e.x, y + r);
    ctx.stroke();
  } else if (e.type === 'frost') {
    ctx.beginPath();
    ctx.moveTo(e.x, y - r - 4);
    ctx.lineTo(e.x + r * 0.8, y);
    ctx.lineTo(e.x, y + r + 4);
    ctx.lineTo(e.x - r * 0.8, y);
    ctx.closePath();
    ctx.fill();
  } else if (e.type === 'imp' || e.type === 'mite') {
    ctx.beginPath();
    ctx.moveTo(e.x, y - r);
    ctx.lineTo(e.x + r, y + r * 0.8);
    ctx.lineTo(e.x - r, y + r * 0.8);
    ctx.closePath();
    ctx.fill();
  } else if (e.type === 'drake') {
    ctx.beginPath();
    ctx.moveTo(e.x - r, y + 4);
    ctx.lineTo(e.x, y - r);
    ctx.lineTo(e.x + r, y + 4);
    ctx.lineTo(e.x, y + r * 0.6);
    ctx.closePath();
    ctx.fill();
  } else if (e.type === 'bat') {
    ctx.beginPath();
    ctx.moveTo(e.x - r, y);
    ctx.quadraticCurveTo(e.x - r * 0.4, y - r, e.x, y);
    ctx.quadraticCurveTo(e.x + r * 0.4, y - r, e.x + r, y);
    ctx.quadraticCurveTo(e.x + r * 0.4, y + r * 0.5, e.x, y + r * 0.3);
    ctx.quadraticCurveTo(e.x - r * 0.4, y + r * 0.5, e.x - r, y);
    ctx.fill();
  } else if (e.type === 'shade') {
    ctx.globalAlpha = 0.9;
    ctx.beginPath();
    ctx.arc(e.x, y, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.fillStyle = '#d9b3ff';
    ctx.beginPath();
    ctx.arc(e.x - 4, y - 3, 2.5, 0, Math.PI * 2);
    ctx.arc(e.x + 4, y - 3, 2.5, 0, Math.PI * 2);
    ctx.fill();
  } else if (e.type === 'boss') {
    ctx.beginPath();
    ctx.arc(e.x, y, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffd76a';
    ctx.beginPath();
    ctx.moveTo(e.x - 14, y - r - 2);
    ctx.lineTo(e.x - 7, y - r - 14);
    ctx.lineTo(e.x, y - r - 4);
    ctx.lineTo(e.x + 7, y - r - 14);
    ctx.lineTo(e.x + 14, y - r - 2);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#2a2a2a';
    ctx.beginPath();
    ctx.arc(e.x - 7, y - 4, 3, 0, Math.PI * 2);
    ctx.arc(e.x + 7, y - 4, 3, 0, Math.PI * 2);
    ctx.fill();
  }
  if (e.elite) {
    ctx.strokeStyle = '#ffd76a';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(e.x, y, r + 4, 0, Math.PI * 2);
    ctx.stroke();
  }
  // Health bar when hurt.
  if (e.hp < e.maxHp) {
    const w = Math.max(28, r * 2);
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(e.x - w / 2, y - r - 12, w, 5);
    ctx.fillStyle = e.boss ? '#ff5d6a' : '#7ee081';
    ctx.fillRect(e.x - w / 2, y - r - 12, w * Math.max(0, e.hp / e.maxHp), 5);
  }
}

function drawEnemies(ctx, world) {
  for (const e of world.enemies) {
    if (e.dead || e.leaked) continue;
    drawEnemyShape(ctx, e, world.time);
  }
  // Boss bar at the top of the field.
  if (world.boss && !world.boss.dead && !world.boss.leaked) {
    const b = world.boss;
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    roundRect(ctx, 390, 58, 500, 34, 8);
    ctx.fill();
    text(ctx, b.name.toUpperCase() + (b.phase === 2 ? '  ·  ENRAGED' : ''), 640, 70, 14, '#ff8fa3', 'center');
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(410, 80, 460, 7);
    ctx.fillStyle = '#ff5d6a';
    ctx.fillRect(410, 80, 460 * Math.max(0, b.hp / b.maxHp), 7);
  }
}

// ---- Projectiles, effects -----------------------------------------------------
function drawEffects(ctx, world) {
  for (const p of world.projectiles) {
    ctx.strokeStyle = p.kind === 'spark' ? '#ffe14d' : p.kind === 'frost' ? '#7fd4ff' : '#ffffff';
    ctx.lineWidth = p.kind === 'cannon' ? 5 : 3;
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
    ctx.lineTo(p.x - 6, p.y + 4);
    ctx.stroke();
    if (p.kind === 'cannon') {
      ctx.fillStyle = '#2a2a2a';
      ctx.beginPath();
      ctx.arc(p.x, p.y, 5, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  for (const z of world.zaps) {
    ctx.strokeStyle = 'rgba(255,225,77,0.9)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    const midX = (z.x1 + z.x2) / 2 + (Math.random() - 0.5) * 20;
    const midY = (z.y1 + z.y2) / 2;
    ctx.moveTo(z.x1, z.y1);
    ctx.lineTo(midX, midY);
    ctx.lineTo(z.x2, z.y2);
    ctx.stroke();
  }
  for (const b of world.bursts) {
    const t = b.age / b.max;
    ctx.strokeStyle = b.color;
    ctx.globalAlpha = 1 - t;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(b.x, b.y, b.r * (0.4 + t), 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }
  for (const p of world.particles) {
    ctx.globalAlpha = 1 - p.age / p.max;
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  for (const c of world.coins) {
    ctx.globalAlpha = 1 - c.age / c.max;
    text(ctx, c.text, c.x, c.y, 14, '#ffd76a', 'center');
  }
  ctx.globalAlpha = 1;
}

// ---- HUD and build bar ---------------------------------------------------------
function drawHud(ctx, world) {
  ctx.fillStyle = 'rgba(12,14,20,0.88)';
  ctx.fillRect(0, 0, W, HUD_H);
  const map = world.map;
  text(ctx, `${map.id + 1} · ${map.name}`, 16, 25, 18, '#ffd76a');
  const waveLabel = world.waveState === 'fighting'
    ? `WAVE ${world.waveIndex + 1}/${map.waves.length}`
    : `WAVE ${world.waveIndex + 1}/${map.waves.length} — BUILD`;
  text(ctx, waveLabel, 250, 25, 16, '#ffffff');
  text(ctx, `◈ ${world.gold}`, 470, 25, 18, '#ffd76a');
  // Lives: one heart plus the count — a full row of hearts does not fit.
  drawHeart(ctx, 620, 25, 8, world.lives > 0 ? '#ff5d6a' : '#5a3a3f');
  text(ctx, `${world.lives}/${world.livesMax}`, 636, 25, 14, '#ff8fa3');
  text(ctx, `★ ${totalStars(world.save)}/21`, 730, 25, 16, '#ffd76a');
  text(ctx, `KILLS ${world.kills}`, 850, 25, 14, '#cfd6e4');
  // Mute button.
  const m = LAYOUT.muteBtn;
  ctx.fillStyle = world.sfx.muted ? '#5a3a3f' : '#2a3242';
  roundRect(ctx, m.x, m.y, m.w, m.h, 6);
  ctx.fill();
  text(ctx, world.sfx.muted ? 'MUTE ×' : 'SOUND', m.x + m.w / 2, m.y + m.h / 2 + 1, 13, '#ffffff', 'center');
}

function drawBuildBar(ctx, world) {
  ctx.fillStyle = 'rgba(12,14,20,0.92)';
  ctx.fillRect(0, VIEW.BAR_Y, W, VIEW.BAR_H);
  TOWER_ORDER.forEach((type, i) => {
    const def = TOWERS[type];
    const r = LAYOUT.cards[i];
    const cost = towerCost(type, world.relics);
    const afford = world.gold >= cost;
    const selected = world.buildType === type;
    ctx.fillStyle = selected ? '#3a2f10' : '#1d2330';
    roundRect(ctx, r.x, r.y, r.w, r.h, 8);
    ctx.fill();
    ctx.strokeStyle = selected ? '#ffd76a' : '#3a4356';
    ctx.lineWidth = selected ? 3 : 1;
    roundRect(ctx, r.x, r.y, r.w, r.h, 8);
    ctx.stroke();
    drawTowerShape(ctx, type, r.x + 28, r.y + 42, def.color, def.dark, 1);
    ctx.globalAlpha = afford ? 1 : 0.45;
    text(ctx, def.short, r.x + 52, r.y + 26, 15, '#ffffff');
    text(ctx, `◈ ${cost}`, r.x + 52, r.y + 50, 14, '#ffd76a');
    text(ctx, `[${def.hotkey}]`, r.x + 52, r.y + 74, 12, '#8a94a8');
    ctx.globalAlpha = 1;
  });

  // Wave / speed / pause buttons.
  const w = LAYOUT.waveBtn;
  const fighting = world.waveState === 'fighting';
  ctx.fillStyle = fighting ? '#2a3242' : '#2f7a3a';
  roundRect(ctx, w.x, w.y, w.w, w.h, 8);
  ctx.fill();
  text(ctx, fighting ? `WAVE ${world.waveIndex + 1}/${world.map.waves.length}` : '▶ START WAVE', w.x + w.w / 2, w.y + 23, 15, '#ffffff', 'center');
  const s = LAYOUT.speedBtn;
  ctx.fillStyle = '#2a3242';
  roundRect(ctx, s.x, s.y, s.w, s.h, 8);
  ctx.fill();
  text(ctx, world.speed === 2 ? '2×' : '1×', s.x + s.w / 2, s.y + 23, 15, '#ffffff', 'center');
  const p = LAYOUT.pauseBtn;
  ctx.fillStyle = '#2a3242';
  roundRect(ctx, p.x, p.y, p.w, p.h, 8);
  ctx.fill();
  text(ctx, 'II', p.x + p.w / 2, p.y + 23, 15, '#ffffff', 'center');

  // Selected tower panel: upgrade and sell, floating above the bar.
  const t = world.selectedTower;
  if (t) {
    const panel = LAYOUT.towerPanel;
    const def = TOWERS[t.type];
    const stats = towerStats(t.type, t.tier, world.relics);
    ctx.fillStyle = 'rgba(12,14,20,0.95)';
    roundRect(ctx, panel.x, panel.y, panel.w, panel.h, 10);
    ctx.fill();
    ctx.strokeStyle = '#ffd76a';
    ctx.lineWidth = 2;
    roundRect(ctx, panel.x, panel.y, panel.w, panel.h, 10);
    ctx.stroke();
    text(ctx, `${def.name}  ·  Tier ${t.tier}/3`, panel.x + 20, panel.y + 26, 16, '#ffffff');
    text(ctx, `DMG ${stats.dmg}   RATE ${stats.rate.toFixed(2)}s   RANGE ${(stats.range / 80).toFixed(1)}`, panel.x + 20, panel.y + 54, 13, '#cfd6e4');
    text(ctx, `KILLS ${t.kills}`, panel.x + 20, panel.y + 78, 13, '#8a94a8');
    const up = LAYOUT.upgradeBtn;
    const canUp = canUpgrade(t.type, t.tier);
    const upCost = canUp ? upgradeCost(t.type, t.tier + 1) : 0;
    ctx.fillStyle = canUp && world.gold >= upCost ? '#2f7a3a' : '#2a3242';
    roundRect(ctx, up.x, up.y, up.w, up.h, 8);
    ctx.fill();
    text(ctx, canUp ? `UPGRADE ◈ ${upCost}` : 'MAX TIER', up.x + up.w / 2, up.y + 23, 14, '#ffffff', 'center');
    const sl = LAYOUT.sellBtn;
    ctx.fillStyle = '#7a3a2f';
    roundRect(ctx, sl.x, sl.y, sl.w, sl.h, 8);
    ctx.fill();
    text(ctx, `SELL ◈ ${towerSellValue(t)}`, sl.x + sl.w / 2, sl.y + 23, 14, '#ffffff', 'center');
  }
}

// ---- Screens --------------------------------------------------------------------
function drawTitle(ctx, world) {
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, '#1a1430');
  g.addColorStop(0.6, '#3a2a1a');
  g.addColorStop(1, '#0d0a18');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  // Seven beacons along the bottom, lit by progress.
  for (let i = 0; i < 7; i++) {
    const x = 200 + i * 150;
    const y = 560;
    const lit = world.save.stars[i] > 0;
    ctx.fillStyle = lit ? '#ffd76a' : '#3a3450';
    ctx.beginPath();
    ctx.arc(x, y, 26, 0, Math.PI * 2);
    ctx.fill();
    if (lit) {
      ctx.fillStyle = '#fff3c4';
      ctx.beginPath();
      ctx.arc(x, y, 12, 0, Math.PI * 2);
      ctx.fill();
    }
    text(ctx, MAPS[i].name.toUpperCase(), x, y + 48, 11, lit ? '#ffd76a' : '#8a94a8', 'center');
  }
  text(ctx, 'EMBERWARD', 640, 220, 84, '#ffd76a', 'center');
  text(ctx, 'HOLD THE SEVEN BEACONS', 640, 290, 24, '#ffffff', 'center');
  text(ctx, 'A tower-defence campaign against the Gloom.', 640, 330, 17, '#cfd6e4', 'center');
  const blink = 0.6 + 0.4 * Math.sin(world.titleTime * 3);
  ctx.globalAlpha = blink;
  text(ctx, 'PRESS ENTER OR CLICK TO BEGIN', 640, 420, 20, '#ffffff', 'center');
  ctx.globalAlpha = 1;
  text(ctx, `★ ${totalStars(world.save)}/21   ·   7 beacons   ·   6 towers   ·   3 bosses`, 640, 480, 15, '#8a94a8', 'center');
}

function drawMapSelect(ctx, world) {
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, '#141024');
  g.addColorStop(1, '#0d0a18');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  text(ctx, 'CHOOSE A BEACON', 640, 60, 36, '#ffd76a', 'center');
  text(ctx, 'Win a beacon to unlock the next. Stars earn shards for the War Council.', 640, 100, 15, '#cfd6e4', 'center');
  // Connect the beacons with a road.
  ctx.strokeStyle = '#3a3450';
  ctx.lineWidth = 4;
  ctx.beginPath();
  LAYOUT.mapNodes.forEach((n, i) => (i === 0 ? ctx.moveTo(n.x, n.y) : ctx.lineTo(n.x, n.y)));
  ctx.stroke();
  MAPS.forEach((map, i) => {
    const n = LAYOUT.mapNodes[i];
    const open = i < world.save.unlocked;
    const stars = world.save.stars[i] || 0;
    ctx.fillStyle = open ? map.palette.accent : '#2a2438';
    ctx.beginPath();
    ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = open ? '#ffd76a' : '#4a4356';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
    ctx.stroke();
    text(ctx, `${i + 1}`, n.x, n.y - 8, 26, open ? '#1a1430' : '#8a94a8', 'center');
    text(ctx, open ? map.name : 'LOCKED', n.x, n.y + 62, 13, open ? '#ffffff' : '#5a5468', 'center');
    for (let s = 0; s < 3; s++) star(ctx, n.x - 24 + s * 24, n.y + 84, 9, s < stars);
  });
  const sb = LAYOUT.shopBtn;
  ctx.fillStyle = '#2f7a3a';
  roundRect(ctx, sb.x, sb.y, sb.w, sb.h, 8);
  ctx.fill();
  text(ctx, `⚒ WAR COUNCIL ◈ ${world.save.shards}`, sb.x + sb.w / 2, sb.y + 25, 14, '#ffffff', 'center');
  const bb = LAYOUT.backBtn;
  ctx.fillStyle = '#2a3242';
  roundRect(ctx, bb.x, bb.y, bb.w, bb.h, 8);
  ctx.fill();
  text(ctx, '◀ TITLE', bb.x + bb.w / 2, bb.y + 25, 14, '#ffffff', 'center');
}

function drawShop(ctx, world) {
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, '#1a1430');
  g.addColorStop(1, '#0d0a18');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  text(ctx, 'WAR COUNCIL', 640, 60, 36, '#ffd76a', 'center');
  text(ctx, `Ember shards: ◈ ${world.save.shards}   —   relics last the whole campaign`, 640, 100, 15, '#cfd6e4', 'center');
  RELIC_ORDER.forEach((id, i) => {
    const relic = RELICS[id];
    const tier = relicTier(world.save, id);
    const y = 150 + i * 92;
    ctx.fillStyle = '#1d2330';
    roundRect(ctx, 240, y, 800, 76, 10);
    ctx.fill();
    ctx.strokeStyle = '#3a4356';
    ctx.lineWidth = 1;
    roundRect(ctx, 240, y, 800, 76, 10);
    ctx.stroke();
    text(ctx, relic.name, 268, y + 26, 18, '#ffffff');
    text(ctx, relic.desc + '  ·  per tier', 268, y + 54, 13, '#8a94a8');
    for (let s = 0; s < 3; s++) star(ctx, 620 + s * 26, y + 30, 10, s < tier);
    const can = canBuyRelic(world.save, id);
    const cost = tier >= 3 ? 0 : relicCost(id, tier + 1);
    ctx.fillStyle = tier >= 3 ? '#2a3242' : can ? '#2f7a3a' : '#5a3a3f';
    roundRect(ctx, 900, y + 16, 120, 44, 8);
    ctx.fill();
    text(ctx, tier >= 3 ? 'MAXED' : `BUY ◈ ${cost}`, 960, y + 39, 14, '#ffffff', 'center');
  });
  const bb = LAYOUT.backBtn;
  ctx.fillStyle = '#2a3242';
  roundRect(ctx, bb.x, bb.y + 540, bb.w, bb.h, 8);
  ctx.fill();
  text(ctx, '◀ BEACONS', bb.x + bb.w / 2, bb.y + 565, 14, '#ffffff', 'center');
}

function drawCenterPanel(ctx, title, titleColor, lines, buttons) {
  ctx.fillStyle = 'rgba(8,8,14,0.72)';
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = 'rgba(16,18,28,0.97)';
  roundRect(ctx, 340, 150, 600, 420, 16);
  ctx.fill();
  ctx.strokeStyle = '#ffd76a';
  ctx.lineWidth = 2;
  roundRect(ctx, 340, 150, 600, 420, 16);
  ctx.stroke();
  text(ctx, title, 640, 200, 34, titleColor, 'center');
  lines.forEach((line, i) => {
    text(ctx, line, 640, 260 + i * 34, 17, '#e8ecf4', 'center');
  });
  buttons.forEach((b) => {
    ctx.fillStyle = b.primary ? '#2f7a3a' : '#2a3242';
    roundRect(ctx, b.x, b.y, b.w, b.h, 8);
    ctx.fill();
    text(ctx, b.label, b.x + b.w / 2, b.y + b.h / 2 + 1, 15, '#ffffff', 'center');
  });
}

export function victoryButtons() {
  return [
    { kind: 'next', label: 'NEXT BEACON ▶', x: 420, y: 470, w: 200, h: 48, primary: true },
    { kind: 'retry', label: 'REPLAY', x: 640, y: 470, w: 120, h: 48 },
    { kind: 'menu', label: 'BEACONS', x: 780, y: 470, w: 120, h: 48 },
  ];
}

export function defeatButtons() {
  return [
    { kind: 'retry', label: 'TRY AGAIN', x: 440, y: 470, w: 180, h: 48, primary: true },
    { kind: 'menu', label: 'BEACONS', x: 640, y: 470, w: 180, h: 48 },
  ];
}

export function pauseButtons() {
  return [
    { kind: 'resume', label: 'RESUME', x: 440, y: 420, w: 180, h: 48, primary: true },
    { kind: 'restart', label: 'RESTART MAP', x: 640, y: 420, w: 180, h: 48 },
    { kind: 'menu', label: 'QUIT TO BEACONS', x: 440, y: 480, w: 380, h: 48 },
  ];
}

export function campaignButtons() {
  return [
    { kind: 'again', label: 'PLAY AGAIN', x: 440, y: 470, w: 180, h: 48, primary: true },
    { kind: 'menu', label: 'BEACONS', x: 640, y: 470, w: 180, h: 48 },
  ];
}

// ---- Main draw ---------------------------------------------------------------
export function draw(ctx, world, input) {
  ctx.clearRect(0, 0, W, H);
  if (world.state === 'title') {
    drawTitle(ctx, world);
    return;
  }
  if (world.state === 'map') {
    drawMapSelect(ctx, world);
    return;
  }
  if (world.state === 'shop') {
    drawShop(ctx, world);
    return;
  }
  // Play, pause, victory, defeat, campaign all render the field underneath.
  drawField(ctx, world);
  drawPlots(ctx, world, input);
  drawTowers(ctx, world);
  drawEnemies(ctx, world);
  drawEffects(ctx, world);
  drawHud(ctx, world);
  drawBuildBar(ctx, world);

  if (world.state === 'pause') {
    drawCenterPanel(ctx, 'PAUSED', '#ffd76a',
      [`${world.map.name}  ·  Wave ${world.waveIndex + 1}/${world.map.waves.length}`, 'Take a breath. The Gloom waits.'],
      pauseButtons());
  } else if (world.state === 'victory' && world.victoryInfo) {
    const v = world.victoryInfo;
    const starsLine = '★'.repeat(v.stars) + '☆'.repeat(3 - v.stars);
    drawCenterPanel(ctx, 'BEACON HELD!', '#ffd76a',
      [starsLine, `${world.map.name} is lit.  +${v.shards} ember shards.`,
       `Kills ${v.kills}   ·   Gold earned ◈ ${v.goldEarned}   ·   Time ${Math.floor(v.timeSecs / 60)}:${String(v.timeSecs % 60).padStart(2, '0')}   ·   Lives ${v.lives}/${v.livesMax}`],
      victoryButtons());
  } else if (world.state === 'defeat') {
    drawCenterPanel(ctx, 'THE BEACON FALLS', '#ff5d6a',
      [`The Gloom took ${world.map.name} on wave ${world.waveIndex + 1}.`,
       `Kills ${world.kills}   ·   Gold earned ◈ ${world.goldEarned}`],
      defeatButtons());
  } else if (world.state === 'campaign' && world.campaignStats) {
    const c = world.campaignStats;
    drawCenterPanel(ctx, 'ALL SEVEN BEACONS BURN BRIGHT', '#ffd76a',
      [`★ ${c.stars}/21 stars across the campaign`,
       `Kills ${c.kills}   ·   Gold earned ◈ ${c.goldEarned}   ·   Time ${Math.floor(c.timeSecs / 60)}:${String(c.timeSecs % 60).padStart(2, '0')}`,
       'The realm is safe — for now.'],
      campaignButtons());
  }
}

// ---- Click handling ----------------------------------------------------------
// Returns an action descriptor for a click at (x, y), or null.
export function uiHit(world, x, y) {
  if (world.state === 'title') return { kind: 'title' };
  if (world.state === 'map') {
    if (inRect(x, y, LAYOUT.shopBtn)) return { kind: 'shop' };
    if (inRect(x, y, LAYOUT.backBtn)) return { kind: 'back' };
    for (let i = 0; i < MAPS.length; i++) {
      if (inCircle(x, y, LAYOUT.mapNodes[i]) && i < world.save.unlocked) return { kind: 'map', id: i };
    }
    return null;
  }
  if (world.state === 'shop') {
    if (inRect(x, y, { x: LAYOUT.backBtn.x, y: LAYOUT.backBtn.y + 540, w: LAYOUT.backBtn.w, h: LAYOUT.backBtn.h })) return { kind: 'back' };
    for (let i = 0; i < RELIC_ORDER.length; i++) {
      const buy = { x: 900, y: 150 + i * 92 + 16, w: 120, h: 44 };
      if (inRect(x, y, buy)) return { kind: 'relic', id: RELIC_ORDER[i] };
    }
    return null;
  }
  if (world.state === 'pause') {
    for (const b of pauseButtons()) if (inRect(x, y, b)) return { kind: b.kind };
    return null;
  }
  if (world.state === 'victory') {
    for (const b of victoryButtons()) if (inRect(x, y, b)) return { kind: b.kind };
    return null;
  }
  if (world.state === 'defeat') {
    for (const b of defeatButtons()) if (inRect(x, y, b)) return { kind: b.kind };
    return null;
  }
  if (world.state === 'campaign') {
    for (const b of campaignButtons()) if (inRect(x, y, b)) return { kind: b.kind };
    return null;
  }
  // Play state.
  if (world.selectedTower) {
    if (inRect(x, y, LAYOUT.upgradeBtn)) return { kind: 'upgrade' };
    if (inRect(x, y, LAYOUT.sellBtn)) return { kind: 'sell' };
  }
  if (inRect(x, y, LAYOUT.waveBtn)) return { kind: 'wave' };
  if (inRect(x, y, LAYOUT.speedBtn)) return { kind: 'speed' };
  if (inRect(x, y, LAYOUT.pauseBtn)) return { kind: 'pause' };
  if (inRect(x, y, LAYOUT.muteBtn)) return { kind: 'mute' };
  for (let i = 0; i < TOWER_ORDER.length; i++) {
    if (inRect(x, y, LAYOUT.cards[i])) return { kind: 'build', type: TOWER_ORDER[i] };
  }
  const col = Math.floor(x / CELL);
  const row = Math.floor((y - FIELD_Y) / CELL);
  if (col >= 0 && col < 16 && row >= 0 && row < 7 && y >= FIELD_Y && y < FIELD_Y + 560) {
    return { kind: 'field', col, row };
  }
  return null;
}
