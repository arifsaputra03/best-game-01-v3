[![make.fun · best-game-01](https://make.fun/badge/best-game-01.svg)](https://make.fun/bounty/best-game-01?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)
[![rank](https://make.fun/badge/best-game-01/arifsaputra03/best-game-01-v3/rank.svg)](https://make.fun/bounty/best-game-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)
[![reward](https://make.fun/badge/best-game-01/arifsaputra03/best-game-01-v3/reward.svg)](https://make.fun/bounty/best-game-01?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)

# EMBERWARD — Hold the Seven Beacons

A tower-defence campaign. Seven hand-built realms stand between the dark and
the last light, and you hold them one beacon at a time.

- **7 beacons, 7 maps** — Meadowgate, Mirefen, Frostmere, Cindervale,
  Stormspire, Deepgloom, and the Crown of Embers. Each has its own path,
  plots, palette, hazards, and waves; nothing is a palette swap.
- **6 tower types, 3 tiers each** — Arrow, Frost, Cannon, Spark, Longbow,
  and the Totem that buffs everything around it. Upgrades and sells, with
  a 70% refund.
- **9 enemy types + elites + 3 bosses** — shamblers, wisps, beetles, frost
  runners, imps that split into mites, drakes, bats, and shades. Frost
  Herald, Storm Warden, and the two-phase Gloom Sovereign each fight
  differently.
- **Layered progression** — gold inside a map, stars (1–3) per beacon,
  shards across the campaign, and a War Council shop with 5 relic lines
  (damage, frost, gold, lives, range), 3 tiers each. A map's hazards change
  how you play: wind, ice, lava, storms, darkness, and the final crown's
  curse.
- **Full game shell** — title, map select, pause, speed 1×/2×, mute,
  WebAudio synth sound, localStorage saves and best scores, victory and
  defeat screens with full campaign statistics.

Play it: open `game/index.html` in a desktop browser (or `node serve.ts`
and visit http://localhost:8080). No install, no network, no account.

- Click a beacon to play it. Click a plot, then pick a tower from the
  build bar (or press 1–6). Start the wave with the button or Space.
- Click a tower to upgrade it (2 more tiers) or sell it back.
- Between maps, spend shards on relics at the War Council.
- Win a beacon without a single leak for 3 stars. Light all seven beacons
  to hold the realm.

Made for the make.fun bounty [best-game-01](https://make.fun/bounty/best-game-01).
All art, code, and sound in this repo are original.

## Layout

- `game/` — the game itself: `index.html` plus `src/` modules.
  - `src/config.js` — balance tables, tower and enemy definitions.
  - `src/levels.js` — the seven hand-built maps.
  - `src/enemies.js` — enemy factory, movement, slow, split, boss hooks.
  - `src/towers.js` — tower targeting, projectiles, splash, chain, auras.
  - `src/economy.js` — save data, stars, shards, the relic shop.
  - `src/world.js` — game state, waves, hazards, boss timers, win/lose.
  - `src/render.js` — canvas drawing: field, towers, enemies, HUD, screens.
  - `src/input.js` — mouse and keyboard.
  - `src/audio.js` — WebAudio synth sound effects.
  - `src/random.js` — seeded random numbers.
  - `src/shots.js` — deterministic screenshot scenes.
  - `src/selftest.js` — headless tests, including an auto-player that
    proves every map is winnable.
  - `src/main.js` — loop, fixed timestep, state glue.
- `vendor/makefun-game.ts` — the make.fun dossier helper (vendored
  unchanged from the bounty kit).
- `main.ts` — copies `game/` and `screenshots/` to the output and writes
  `dossier.json` (run with Node 22).
- `serve.ts` — tiny local server for play-testing.
- `shots.json` — the four screenshot scenes.

## Headless tests

Open the game with `?selftest=1` in a browser (or run it headless) to run
the built-in suite: map validity, economy, combat (kill, frost, splash,
chain, armor), wave flow, boss spawning and phases, relic shop, stars,
save round-trip, and an auto-player that wins all seven maps. Results are
written to `window.__selftest` and the page title.

## License

MIT — see `LICENSE`.
