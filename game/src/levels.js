// The seven beacons of the campaign. Each map is hand-built: a path the
// Gloom walks, plots where the Warden builds, terrain that changes enemy
// speed, hazards that help or hurt, and waves that grow harder.
// Wave groups are [type, count, gapSeconds, hpMul]; 'boss:<id>' spawns a boss.

export const MAPS = [
  {
    id: 0,
    name: 'Meadowgate',
    sub: 'The first beacon. Learn the ropes.',
    palette: { ground: '#3f6b3a', ground2: '#355c31', path: '#c9a86a', pathEdge: '#a8874e', plot: '#2c4d28', accent: '#ffd76a', decor: 'grass' },
    path: [[0, 3], [4, 3], [4, 1], [10, 1], [10, 5], [13, 5], [13, 3], [15, 3]],
    plots: [[2, 2], [5, 2], [7, 0], [9, 2], [11, 2], [12, 4], [8, 4], [5, 4], [2, 4], [14, 4], [3, 5], [6, 6], [11, 6], [14, 1], [6, 3]],
    terrain: [],
    hazards: null,
    portals: [],
    boss: null,
    waves: [
      [['shambler', 6, 1.2, 1.0]],
      [['shambler', 8, 1.0, 1.05], ['wisp', 3, 0.8, 1.0]],
      [['shambler', 8, 0.9, 1.1], ['beetle', 2, 1.6, 1.0]],
      [['wisp', 8, 0.7, 1.1], ['shambler', 6, 0.9, 1.15]],
      [['beetle', 4, 1.4, 1.15], ['shambler', 10, 0.8, 1.2]],
    ],
    intro: 'The Gloom comes for the first beacon. Build, hold, light it.',
  },
  {
    id: 1,
    name: 'Mirefen',
    sub: 'Bog mud slows the Gloom. Use it.',
    palette: { ground: '#2e4a44', ground2: '#26403a', path: '#8a7a55', pathEdge: '#6b5f42', plot: '#1f332e', accent: '#8fe3c0', decor: 'bog' },
    path: [[0, 1], [3, 1], [3, 5], [6, 5], [6, 2], [10, 2], [10, 6], [13, 6], [13, 4], [15, 4]],
    plots: [[2, 2], [4, 2], [5, 3], [7, 4], [8, 5], [9, 3], [11, 3], [12, 5], [9, 6], [14, 5], [2, 4], [5, 1], [11, 1], [14, 2]],
    terrain: [
      { kind: 'mud', cells: [[4, 4], [5, 4], [7, 3], [8, 3], [9, 4]] },
    ],
    hazards: null,
    portals: [],
    boss: null,
    waves: [
      [['shambler', 8, 1.0, 1.2]],
      [['wisp', 6, 0.7, 1.15], ['shambler', 6, 1.0, 1.25]],
      [['beetle', 3, 1.4, 1.2], ['wisp', 6, 0.7, 1.2]],
      [['shambler', 10, 0.8, 1.3], ['beetle', 3, 1.3, 1.25]],
      [['wisp', 10, 0.6, 1.25], ['beetle', 4, 1.2, 1.3]],
      [['beetle', 5, 1.2, 1.35], ['shambler', 12, 0.7, 1.35], ['wisp', 6, 0.6, 1.3]],
    ],
    intro: 'The bog is thick. The Gloom is thicker. Hold the second beacon.',
  },
  {
    id: 2,
    name: 'Frostmere',
    sub: 'Ice hurries the Gloom. A Herald comes.',
    palette: { ground: '#5a7d99', ground2: '#4a6b86', path: '#dfeef7', pathEdge: '#a9c4d4', plot: '#3d5a73', accent: '#bfe9ff', decor: 'snow' },
    path: [[0, 5], [5, 5], [5, 2], [8, 2], [8, 6], [12, 6], [12, 3], [15, 3]],
    plots: [[2, 4], [3, 3], [6, 4], [7, 3], [9, 3], [10, 4], [11, 5], [13, 4], [14, 5], [2, 6], [6, 6], [10, 1], [13, 1], [4, 1]],
    terrain: [
      { kind: 'ice', cells: [[6, 3], [7, 3], [9, 4], [10, 4], [6, 5]] },
    ],
    hazards: null,
    portals: [],
    boss: 'frost',
    waves: [
      [['shambler', 8, 1.0, 1.4]],
      [['frost', 3, 1.5, 1.3], ['shambler', 8, 0.9, 1.45]],
      [['wisp', 8, 0.7, 1.4], ['frost', 4, 1.4, 1.35]],
      [['beetle', 4, 1.3, 1.45], ['frost', 4, 1.3, 1.4], ['shambler', 8, 0.8, 1.5]],
      [['frost', 6, 1.2, 1.45], ['wisp', 10, 0.6, 1.45]],
      [['boss:frost', 1, 0, 1.0], ['frost', 4, 1.2, 1.5], ['shambler', 8, 0.8, 1.55]],
    ],
    intro: 'Cold bites. The Frost Herald walks with the horde.',
  },
  {
    id: 3,
    name: 'Cindervale',
    sub: 'Lava vents burn the Gloom. Mind the imps.',
    palette: { ground: '#5c2f22', ground2: '#4a261b', path: '#7a4a33', pathEdge: '#5e3826', plot: '#3d1f15', accent: '#ff9a5c', decor: 'ember' },
    path: [[0, 2], [2, 2], [2, 6], [7, 6], [7, 1], [11, 1], [11, 4], [15, 4]],
    plots: [[1, 3], [3, 3], [4, 4], [5, 5], [6, 4], [8, 5], [9, 3], [10, 2], [12, 2], [13, 3], [4, 1], [9, 6], [12, 6], [14, 5]],
    terrain: [],
    hazards: { kind: 'vents', cells: [[4, 5], [9, 3], [12, 5]], interval: 6, damage: 30 },
    portals: [],
    boss: null,
    waves: [
      [['imp', 6, 0.9, 1.5], ['shambler', 6, 1.0, 1.6]],
      [['drake', 3, 1.4, 1.5], ['imp', 8, 0.8, 1.55]],
      [['beetle', 4, 1.3, 1.6], ['drake', 4, 1.2, 1.55], ['imp', 6, 0.8, 1.6]],
      [['frost', 4, 1.3, 1.6], ['drake', 5, 1.1, 1.6]],
      [['imp', 12, 0.6, 1.65], ['beetle', 4, 1.2, 1.65]],
      [['drake', 6, 1.0, 1.65], ['frost', 5, 1.2, 1.65], ['imp', 8, 0.7, 1.7]],
      [['beetle', 6, 1.1, 1.7], ['drake', 6, 1.0, 1.7], ['imp', 10, 0.6, 1.75]],
    ],
    intro: 'The vents breathe fire. Let them do your work.',
  },
  {
    id: 4,
    name: 'Stormspire',
    sub: 'Lightning hunts the Gloom. So does the Warden.',
    palette: { ground: '#3a3450', ground2: '#2e2942', path: '#6a6390', pathEdge: '#524c72', plot: '#262038', accent: '#d9b3ff', decor: 'storm' },
    path: [[0, 4], [4, 4], [4, 0], [7, 0], [7, 5], [11, 5], [11, 2], [15, 2]],
    plots: [[2, 3], [3, 5], [5, 3], [6, 2], [8, 2], [9, 4], [10, 4], [12, 4], [13, 3], [2, 5], [6, 6], [10, 6], [13, 1], [5, 1]],
    terrain: [],
    hazards: { kind: 'storm', interval: 7, damage: 45 },
    portals: [],
    boss: 'storm',
    waves: [
      [['bat', 8, 0.6, 1.7], ['shambler', 6, 1.0, 1.8]],
      [['drake', 5, 1.1, 1.7], ['bat', 8, 0.6, 1.75]],
      [['frost', 4, 1.3, 1.75], ['bat', 10, 0.5, 1.8], ['drake', 4, 1.1, 1.75]],
      [['beetle', 5, 1.2, 1.8], ['bat', 10, 0.5, 1.85], ['imp', 8, 0.7, 1.8]],
      [['drake', 6, 1.0, 1.85], ['frost', 5, 1.2, 1.8], ['bat', 8, 0.5, 1.9]],
      [['shade', 3, 1.6, 1.8], ['drake', 6, 1.0, 1.9], ['bat', 10, 0.5, 1.9]],
      [['boss:storm', 1, 0, 1.0], ['bat', 8, 0.5, 1.95], ['drake', 5, 1.0, 1.95]],
    ],
    intro: 'The storm answers the beacon. The Warden answers too.',
  },
  {
    id: 5,
    name: 'Deepgloom',
    sub: 'Shades pour from the dark. Nothing is cheap here.',
    palette: { ground: '#241d33', ground2: '#1c1628', path: '#4a3f66', pathEdge: '#372e4d', plot: '#171226', accent: '#8f7fd4', decor: 'gloom' },
    path: [[0, 0], [6, 0], [6, 3], [3, 3], [3, 6], [9, 6], [9, 2], [13, 2], [13, 5], [15, 5]],
    plots: [[2, 1], [4, 1], [5, 2], [7, 2], [8, 3], [5, 4], [7, 5], [10, 5], [11, 3], [12, 4], [14, 3], [2, 5], [8, 1], [11, 1]],
    terrain: [],
    hazards: null,
    portals: [
      { cell: [6, 3], waves: [4, 5, 6, 7, 8], type: 'shade', n: 2 },
      { cell: [9, 2], waves: [6, 7, 8], type: 'shade', n: 2 },
    ],
    boss: null,
    waves: [
      [['shade', 3, 1.6, 1.9], ['shambler', 8, 0.9, 2.0]],
      [['bat', 10, 0.5, 2.0], ['shade', 3, 1.5, 1.95]],
      [['frost', 5, 1.2, 2.0], ['shade', 4, 1.4, 2.0]],
      [['beetle', 5, 1.2, 2.05], ['shade', 4, 1.4, 2.05], ['drake', 5, 1.0, 2.0]],
      [['shade', 5, 1.3, 2.1], ['imp', 10, 0.6, 2.05]],
      [['shade', 6, 1.2, 2.15], ['bat', 10, 0.5, 2.1], ['frost', 5, 1.2, 2.1]],
      [['beetle', 6, 1.1, 2.15], ['shade', 6, 1.2, 2.2], ['drake', 6, 1.0, 2.15]],
      [['shade', 8, 1.1, 2.25], ['frost', 6, 1.1, 2.2], ['bat', 12, 0.45, 2.15]],
    ],
    intro: 'The dark itself walks here. Light the sixth beacon.',
  },
  {
    id: 6,
    name: 'Crown of Embers',
    sub: 'The last beacon. The Sovereign comes.',
    palette: { ground: '#4a2a1a', ground2: '#3a2013', path: '#8a6a3a', pathEdge: '#6b522c', plot: '#2e180e', accent: '#ffd76a', decor: 'crown' },
    path: [[0, 3], [3, 3], [3, 1], [6, 1], [6, 5], [9, 5], [9, 2], [12, 2], [12, 6], [15, 6]],
    plots: [[2, 2], [4, 2], [5, 2], [7, 2], [8, 3], [7, 4], [10, 4], [11, 3], [13, 3], [11, 5], [13, 5], [14, 4], [2, 5], [5, 6], [8, 6]],
    terrain: [
      { kind: 'mud', cells: [[4, 4], [5, 4]] },
      { kind: 'ice', cells: [[10, 3], [11, 4]] },
    ],
    hazards: { kind: 'vents', cells: [[5, 3], [10, 5]], interval: 6, damage: 30 },
    portals: [
      { cell: [6, 5], waves: [5, 6, 7, 8], type: 'shade', n: 2 },
    ],
    boss: 'gloom',
    waves: [
      [['shambler', 10, 0.9, 2.2], ['wisp', 6, 0.7, 2.2]],
      [['imp', 10, 0.7, 2.25], ['drake', 5, 1.1, 2.25]],
      [['frost', 6, 1.2, 2.3], ['bat', 12, 0.5, 2.3]],
      [['beetle', 6, 1.1, 2.35], ['shade', 4, 1.4, 2.35]],
      [['drake', 7, 1.0, 2.4], ['imp', 10, 0.6, 2.4], ['frost', 6, 1.2, 2.4]],
      [['shade', 6, 1.2, 2.45], ['bat', 12, 0.45, 2.45], ['beetle', 6, 1.1, 2.45]],
      [['frost', 7, 1.1, 2.5], ['drake', 7, 1.0, 2.5], ['shade', 6, 1.2, 2.5]],
      [['boss:gloom', 1, 0, 1.0], ['shade', 6, 1.2, 2.55], ['imp', 10, 0.6, 2.5]],
    ],
    intro: 'Everything you have built leads here. Hold the Crown.',
  },
];

// ---- Path helpers ----------------------------------------------------------
// Waypoints in grid cells -> pixel points along the polyline.
export function pathPoints(map) {
  return map.path.map(([c, r]) => ({
    x: c * 80 + 40,
    y: 48 + r * 80 + 40,
    c,
    r,
  }));
}

export function pathLength(pts) {
  let len = 0;
  for (let i = 1; i < pts.length; i++) {
    len += Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y);
  }
  return len;
}

// Point at distance d along the polyline, plus the direction of travel.
export function pathPointAt(pts, d) {
  let rest = d;
  for (let i = 1; i < pts.length; i++) {
    const seg = Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y);
    if (rest <= seg) {
      const t = seg === 0 ? 0 : rest / seg;
      return {
        x: pts[i - 1].x + (pts[i].x - pts[i - 1].x) * t,
        y: pts[i - 1].y + (pts[i].y - pts[i - 1].y) * t,
        dx: (pts[i].x - pts[i - 1].x) / (seg || 1),
        dy: (pts[i].y - pts[i - 1].y) / (seg || 1),
      };
    }
    rest -= seg;
  }
  const last = pts[pts.length - 1];
  const prev = pts[pts.length - 2];
  const seg = Math.hypot(last.x - prev.x, last.y - prev.y) || 1;
  return { x: last.x, y: last.y, dx: (last.x - prev.x) / seg, dy: (last.y - prev.y) / seg };
}

// Distance along the path of the point nearest to a cell (for portals).
export function pathDistOfCell(pts, col, row) {
  const px = col * 80 + 40;
  const py = 48 + row * 80 + 40;
  let best = 0;
  let bestD = Infinity;
  let acc = 0;
  for (let i = 1; i < pts.length; i++) {
    const ax = pts[i - 1].x, ay = pts[i - 1].y;
    const bx = pts[i].x, by = pts[i].y;
    const dx = bx - ax, dy = by - ay;
    const len2 = dx * dx + dy * dy || 1;
    let t = ((px - ax) * dx + (py - ay) * dy) / len2;
    t = Math.max(0, Math.min(1, t));
    const cx = ax + dx * t, cy = ay + dy * t;
    const d = Math.hypot(px - cx, py - cy);
    if (d < bestD) {
      bestD = d;
      best = acc + Math.sqrt(len2) * t;
    }
    acc += Math.sqrt(len2);
  }
  return best;
}

// Terrain patch lookup: returns 'mud' | 'ice' | null for a cell.
export function terrainAt(map, col, row) {
  for (const patch of map.terrain || []) {
    for (const [c, r] of patch.cells) {
      if (c === col && r === row) return patch.kind;
    }
  }
  return null;
}

// Is a cell on the path? Used to validate plots and placements.
export function isPathCell(map, col, row) {
  const pts = pathPoints(map);
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1], b = pts[i];
    const minC = Math.min(a.c, b.c), maxC = Math.max(a.c, b.c);
    const minR = Math.min(a.r, b.r), maxR = Math.max(a.r, b.r);
    if (col >= minC && col <= maxC && row >= minR && row <= maxR) return true;
  }
  return false;
}
