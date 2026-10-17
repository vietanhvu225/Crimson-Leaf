# Crimson Leaf — Three.js port

**English** · [Tiếng Việt](README_vi.md)

A Three.js port of the Canvas 2D game "Huyền Thoại Cứu Mẹ" (Crimson Leaf: Mother's Oath). The same simulation (`src/game/rules`, `src/game/engine`) runs with two renderers: `three` (new) and `canvas` (the original, kept for comparison).

Evaluation results: [`threejs-port/FINAL_REPORT.md`](threejs-port/FINAL_REPORT.md). Overnight run log: [`threejs-port/LOG.md`](threejs-port/LOG.md). Both are written in Vietnamese.

## Running on another machine

Requires **Node.js ≥ 22.18** (24 LTS recommended) and Git.

```bash
git clone <repo> crimson-three
cd crimson-three
npm install
npm run dev
```

Open http://localhost:3002/ (Vite picks another port if 3002 is busy; check the terminal output).

| URL | What you get |
|---|---|
| `/?renderer=three` | Three.js version (default) |
| `/?renderer=canvas` | Original Canvas 2D version, same simulation |
| `/?ui=3d` | 3D title (torii gates for stage select), damage numbers and boss plaque in 3D space |
| `/?fx=low` | Bloom and shadows off (for comparing performance on weaker machines) |
| `/?debug=1` | fps · draw calls · triangles overlay |
| `/?cam=flat` | Straight-on camera, no tilt |
| `/?stage=ocean_palace&loop=2&autostart=1` | Jump straight into a stage (`spring` … `sky_sanctuary`), loop 2 |

Params can be combined, e.g. `/?renderer=three&ui=3d&debug=1`. In game: **F9** switches three ↔ canvas, **M** toggles sound.

## Gates and tools (optional)

```bash
npm run typecheck
npm run test                        # rules + engine, run directly by Node (type stripping)
npm run build
npx playwright install chromium     # only needed for smoke/shot/bot/parity
npm run smoke                       # 11 stages × 2 renderers, writes shots/smoke/result.json
npm run bot -- --stages spring      # bot plays + measures uncapped ms/frame
npm install --prefix reference && npm run parity   # compare the sim against the original in reference/
```

Headless Chromium is launched with `chromiumLaunch` from `threejs-port/PINNED_VERSIONS.json`, pinned for the overnight machine (Windows, ANGLE D3D11, real GPU). If another machine reports no WebGL or very low headless fps, edit the `args` there (for example, drop `--use-angle=d3d11`). The smoke thresholds (`scripts/smoke.config.json`: `minFps` 20, `minPixelStd` 8) were also calibrated on that machine.

## Layout

- `src/game/rules/`, `src/game/engine/`: simulation (copied from the original; only the Canvas/DOM coupling was removed in T01).
- `src/game/render/`: original Canvas 2D renderer.
- `src/game/render3d/`: Three.js renderer (`env/`, `actors/`, `vfx/`, `ui3d/`, `post.ts`).
- `src/ui/`: React UI (DOM HUD, title, modals); `GameView.tsx` picks the renderer.
- `scripts/`: `shot.mjs`, `bot.mjs`, `parity.mjs`, `harness.mjs`.
- `reference/`: the original game, read-only.
- `shots/`: evidence screenshots for each task.
- `threejs-port/`: plan, spec, tasks, reports (Vietnamese).
