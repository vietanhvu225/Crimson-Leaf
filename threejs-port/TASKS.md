# TASKS

Orchestrator là người duy nhất sửa cột `status`. Giá trị: `TODO` · `IN_PROGRESS (attempt N)` · `DONE` · `BLOCKED (<lý do>)`.
Các task cùng nhóm `parallel` có thể chạy đồng thời (tối đa `MAX_PARALLEL`).
Dòng **Tham khảo** ở mỗi task chỉ ra file nào trong skill dự án `crimson-threejs-ref` nên đọc. Chỉ đọc những file được chỉ, không đọc hết; khi mâu thuẫn thì GAME_SPEC thắng (xem SKILL.md của skill).

| ID | Task | deps | parallel | status |
|---|---|---|---|---|
| T00 | Bootstrap project + công cụ chụp ảnh | - | - | DONE |
| T01 | Gỡ engine khỏi Canvas (rng, World, aim, GameView) | T00 | - | DONE |
| T02 | Khung Three.js chơi được (placeholder) | T01 | - | DONE |
| T03 | Môi trường: kit + màn 1–4 | T02 | A | DONE |
| T04 | Nhân vật, kẻ địch, boss | T02 | A | IN_PROGRESS (attempt 1) |
| T05 | VFX + post-processing | T02 | A | IN_PROGRESS (attempt 1) |
| T06 | Môi trường: màn 5–11 | T03 | B | IN_PROGRESS (attempt 1) |
| T07 | UI theo hướng Three.js | T04, T05 | B | TODO |
| T08 | Hiệu năng + bot playtest 11 màn | T06, T07 | - | TODO |
| T09 | FINAL_REPORT | T08 | - | TODO |

Để tránh xung đột giữa các task nhóm A: mỗi task chỉ sửa thư mục của mình (`src/game/render3d/env/`, `src/game/render3d/actors/`, `src/game/render3d/vfx/`). File `src/game/render3d/scene.ts` chỉ được thêm đúng một dòng đăng ký module.

---

## T00 — Bootstrap

**Tham khảo skill `crimson-threejs-ref` (`.claude/skills/crimson-threejs-ref/references/`):** `visual-test-harness.md` (cách chụp ổn định, kiểm canvas trống), mục cảnh báo SwiftShader trong `playtest-bot.md`. Bỏ qua phần `@playwright/test`/`pngjs`.

**Đọc trước:** `threejs-port/PREFLIGHT.md` và `threejs-port/PINNED_VERSIONS.json` (do `setup-pc2.mjs` tạo). Nếu `PREFLIGHT.md` có dòng FAIL thì báo `BLOCKED` ngay, kèm dòng đó.

**Làm:**
- Ở repo root, dựng Vite + React + TS + Tailwind theo `reference/package.json`, `reference/tsconfig.json`, `reference/vite.config.ts`. **Copy cả `reference/package-lock.json`** làm điểm xuất phát rồi mới `npm install`, để root dùng đúng version đã chạy xanh ở bản gốc trên máy này. Thêm `three` + `@types/three` (dependency) và `playwright` (devDependency) với **đúng version trong `PINNED_VERSIONS.json`**, ghi không dấu `^` (`npm install --save-exact three@<v>` …). Playwright là thư viện gọi từ script; không cần Playwright MCP.
- `vite.config.ts` của root: `server: { port: 3002, strictPort: false, host: true }` (3001 để dành cho `reference/`).
- Copy nguyên `reference/src/` (giữ cấu trúc `game/rules`, `game/engine`, `game/render`, `game/audio.ts`, `ui/`, `App.tsx`, `main.tsx`, `index.css`) và `reference/index.html`. Game phải chạy y hệt bản gốc ở bước này.
- Thay đổi duy nhất được phép trong `src/` ở T00: `App.tsx` đọc URL params `stage=<SeasonId>`, `loop=1|2`, `muted=1` (chỉ đặt state ban đầu; không đụng engine). Lý do: phím `1`–`9` không tới được màn 10–11, nên không có param thì smoke không phủ được 11 màn.
- Giữ các script `typecheck` và `test` (= `node --test src/game/rules/rules.test.ts`) của bản gốc.
- `scripts/shot.mjs`:
  - Dùng Vite JS API (`createServer({ server: { port: 0 } })` hoặc `strictPort: false`) để tự bật server trên cổng trống.
  - Mở Chromium bằng `chromium.launch(PINNED_VERSIONS.chromiumLaunch)`: đọc file JSON, không hardcode cờ.
  - Mở URL với params, chạy kịch bản input, chụp PNG, thu console error (`page.on('console')` loại `error` + `page.on('pageerror')`), rồi tắt browser và server trong `finally`.
  - Giữ khoá máy theo GAME_SPEC § Gates (chỉ một smoke chạy cùng lúc).
  - CLI:
    - `--stage <id> --renderer <three|canvas> --loop <1|2> --seed <n> --script <idle|run|combat|boss> --out <dir>`
    - `--smoke`: chạy cả 11 màn × renderer hiện có, kịch bản `run`, `muted=1`, ghi `<out>/result.json`, thoát mã 1 nếu fail theo § Gates. Mặc định `--out shots/smoke/`.
    - Param nào chưa tồn tại (`renderer`, `seed` trước T01) thì app phải bỏ qua mà không lỗi; script không cần biết.
- Calibrate ngưỡng: chạy smoke 3 lần, lấy fps thấp nhất đo được × 0.6 làm `minFps` (sàn 5, trần 20) và đặt `minPixelStd`. Ghi vào `scripts/smoke.config.json` và vào report, cùng renderer WebGL thật đang dùng (lấy từ `PINNED_VERSIONS.json`).

**Tiêu chí đạt:** `npm install` sạch · version `three`/`@types/three`/`playwright` trong `package.json` khớp `PINNED_VERSIONS.json` và không có `^` · `typecheck`/`test`/`build` xanh · `node scripts/shot.mjs --smoke` xanh trên bản canvas copy cho **cả 11 màn** · có ảnh màn 1 và màn `sky_sanctuary` trong `shots/T00/`.

## T01 — Gỡ engine khỏi Canvas

**Tham khảo skill `crimson-threejs-ref` (`.claude/skills/crimson-threejs-ref/references/`):** không cần skill. Task này là engine/parity; references không áp dụng. Riêng lời khuyên "route all randomness through createSeededRandom" trong `game-feel.md` **không** áp dụng cho sim: sim dùng `world.rng` theo GAME_SPEC.

Bản gốc đã tách sẵn `rules/` · `engine/` · `render/` · `ui/`. Task này chỉ xử lý các điểm engine còn dính Canvas/DOM (GAME_SPEC § Bản gốc, mục 1–6), **không viết lại logic**.

**Thứ tự làm (mỗi bước một commit, chạy parity sau bước 2 và bước 5):**
1. **Harness parity trước tiên:** `scripts/parity.mjs`, theo GAME_SPEC § Kiểm tra trùng khớp.
   - Bật `reference/` (sau `npm install --prefix reference`) và bản port, mỗi bên một Vite server trên cổng trống.
   - Mỗi bên có PRNG chèn bằng `addInitScript`, `requestAnimationFrame = () => 0`, và tắt tiếng.
   - Chạy 11 màn × chuỗi input cố định (đi phải, nhảy, chém, phi tiêu, đổi lane), lấy snapshot ở mỗi mốc (ví dụ mỗi 500 ms giả lập, tổng 20 s), và in diff đầu tiên nếu lệch.
   - Chạy harness ngay khi chưa sửa gì: phải trùng khớp 100%. Nếu chưa trùng thì sửa harness, không sửa game.
2. **Import chạy được trong Node** (GAME_SPEC mục 6): thêm đuôi `.ts`, dùng `import type`, bật `verbatimModuleSyntax` + `erasableSyntaxOnly`. Thuần cú pháp. Parity phải vẫn 100%.
3. `src/game/engine/rng.ts` (mulberry32). `createWorld` nhận `{ stateRef, touchInputRef, seed, rng?, viewW, viewH, isHeadless }`; `World` có `rng()` và `seed`. Đổi cả 39 chỗ `Math.random()` trong `engine/` sang `world.rng()`, giữ nguyên thứ tự gọi. **Không** đổi `audio.ts` và `render/map/platforms.ts`. Host đọc `?rng=math` để truyền `rng: () => Math.random()` (GAME_SPEC: chuỗi random dùng chung).
4. Bỏ `canvas`, `ctx`, `canvasRect` khỏi `World`; bỏ đọc `window`/`navigator` trong `createWorld` (host truyền `viewW`, `viewH`, `isHeadless`). Renderer canvas (`render/scene.ts` và các hàm con) nhận `ctx` qua tham số hoặc qua object `CanvasView` riêng. `input.ts` nhận phần tử/rect từ host thay vì `world.canvasRect`.
5. Aim: host ghi toạ độ chuột theo thế giới (`setAimWorld(x, y)`). Host canvas tính như cũ (`client + cam`, dùng camX/camY **của cùng thời điểm** như bản gốc); host 3D sẽ raycast ở T02. `simulation/frameInput.ts` không tự cộng `camX` nữa.
6. `src/ui/GameView.tsx` thay `GameCanvas.tsx`: cùng props (`HostState` + `resetToken`, `touchInputRef`, các token). Vòng lặp giữ đúng kiểu bản gốc (mỗi rAF một `stepSimulation(world, rawDt)`, xem GAME_SPEC § Kiến trúc đích). Chọn renderer theo `?renderer` (lúc này mới có `canvas`). `App.tsx` chỉ đổi import và đọc thêm `seed`, `debug`, `renderer`, `rng`.
7. `window.__game` mở rộng từ `engine/debug.ts` (giữ `render_game_to_text`, `advanceTime`).
8. `src/game/engine/engine.test.ts`, thêm vào script `test` (`node --test src/game/rules/rules.test.ts src/game/engine/engine.test.ts`). Test chỉ import `world.ts`, `level/index.ts`, `simulation/index.ts`, `rng.ts`; không import `input.ts`/`debug.ts` vì chúng dùng `window`.
   - (a) 600 bước `stepSimulation(world, 1/60)` với input cố định, seed=1, muted. Assert snapshot (vị trí player, hp, số enemy, score) bằng golden value ghi lần đầu.
   - (b) Cùng seed chạy 2 lần ra kết quả giống nhau.
   - (c) Với mỗi màn trong 11 màn: `createWorld` + `rebuildLevel` + 300 bước không ném lỗi và player không rơi khỏi map.
9. Dùng Grep để chắc chắn `src/game/engine/` không còn `CanvasRenderingContext2D`, `HTMLCanvasElement`, `Math.random`, `window.innerWidth`, `navigator`, hay import `render`/`ui`/`react`/`three`. `input.ts` (gắn listener lên `window`) và `debug.ts` (gắn hook lên `window`) là hai ngoại lệ được dùng DOM.

**Tiêu chí đạt:** `node scripts/parity.mjs` báo 11/11 màn trùng khớp mọi mốc giữa `?renderer=canvas&rng=math` và `reference/` (cùng PRNG chèn vào `Math.random`, cả hai muted) · engine test xanh trong Node · smoke xanh · report có đoạn output parity.

## T02 — Khung Three.js chơi được

**Tham khảo skill `crimson-threejs-ref` (`.claude/skills/crimson-threejs-ref/references/`):** `shader-cookbook.md` § Prerequisite (renderer, tone mapping, color space), `technical-art.md` (instancing, pool, `renderer.info`), `debug-playbook.md` (màn đen / mất mesh / dispose).

**Làm:** `src/game/render3d/`: `WebGLRenderer` (antialias, sRGB, ACES tone mapping), scene, camera theo § Ánh xạ tọa độ, ánh sáng cơ bản (hemi + directional có shadow). Placeholder: platform = box, nhân vật = capsule đỏ, enemy = capsule theo màu archetype, projectile = mesh nhỏ instanced, hazard/gate/checkpoint = box màu. Sync mỗi frame: tạo/xóa/cập nhật mesh theo entity trong `World`, dùng map `id → mesh` + pool (không tạo mesh mới mỗi frame). Mặc định `renderer=three`; đổi renderer khi đang chơi không được rò rỉ (dispose geometry/material/renderer). Debug overlay `?debug=1`.

**Tiêu chí đạt:** chơi hết được màn 1 bằng `renderer=three` (bot hoặc `__game.step` + teleportToBoss để test boss) · đổi lane Q thấy rõ chiều sâu thật · đọc gameplay rõ như bản canvas · smoke xanh cho cả `three` lẫn `canvas`.

## T03 — Môi trường: kit + màn 1–4 (`src/game/render3d/env/`)

**Tham khảo skill `crimson-threejs-ref` (`.claude/skills/crimson-threejs-ref/references/`):** `authoring-recipes.md` (ghép primitive, ánh sáng, fog, pipeline), `shader-cookbook.md` (sky dome gradient, `onBeforeCompile`, wind sway cho cây/lá), `technical-art.md` (merge geometry tĩnh, ngân sách draw call). Nước/dung nham phải tự viết.

**Làm:** bộ kit dùng lại được: thân đại thụ, platform theo `PlatformSubType`, nước/dung nham (shader đơn giản: sóng + fresnel), hazard, seal gate, grapple lantern, checkpoint shrine, nền parallax nhiều lớp thật, sky gradient, fog. Bảng màu theo `getChibiStagePalette` (`render/map/stagePalette.ts`); tham khảo hình dạng ở `render/map/*.ts` và bầu trời ở `render/map/sky/<màn>.ts`. Hoàn thiện màn 1–4 (spring, summer, autumn, winter) cho cả `loop=1` và `loop=2`.

**Ghi chú orchestrator (sau T02):** khi player ở lane 1 (z = −3), slab lane 0 phía trước vẫn che phần lớn player (camera nghiêng mặc định). Kit platform mới phải giữ player lane 1 đọc được: làm mờ/cắt slab nằm giữa camera và player, hoặc chỉnh độ dày/độ sâu slab. Kèm ảnh `shots/T03/spring-lane1.png` chứng minh. Đăng ký module theo registry `MODULES` trong `render3d/scene.ts` (xem `reports/T02.md`).

**Tiêu chí đạt:** mỗi màn 1–4 có ảnh `shots/T03/<stage>-l1.png` và `-l2.png`, nhận ra được ngay là màn nào khi đặt cạnh bản canvas · platform hiển thị khớp đúng hitbox (overlay `debug=1` vẽ hitbox wireframe để chứng minh) · draw calls < 300.

## T04 — Nhân vật, kẻ địch, boss (`src/game/render3d/actors/`)

**Tham khảo skill `crimson-threejs-ref` (`.claude/skills/crimson-threejs-ref/references/`):** `authoring-recipes.md` (model procedural từ primitive, silhouette), `game-feel.md` (squash & stretch, phản hồi trúng đòn), `shader-cookbook.md` (material toon/PBR, dissolve khi chết).

**Làm:** nhân vật chính procedural chibi (đầu to, khăn/áo choàng đỏ bay theo vận tốc, Kodachi), animation bằng code: idle, run, jump, wall-cling, dash, chém, parry, bị đánh, chết. Mọi `EnemyArchetype` trong `rules/enemies.ts` (hình dạng/màu: `render/characters/enemy.ts`, vũ khí từng loại ở `enemyGear.ts`), 11 boss với silhouette riêng (`bossGear.ts`), đền mẹ bị giam (`motherShrine.ts`). Nhân vật chính tham khảo `protagonist.ts`, `protagonistArm.ts`, `protagonistMounts.ts`. Thanh máu và nhãn tên trên đầu (sprite/billboard).

**Tiêu chí đạt:** ảnh dàn hàng toàn bộ archetype + 11 boss (`?debug=1&gallery=actors` là một scene trưng bày) · trạng thái animation đọc được khi chơi · facing đúng hướng · không tụt fps khi có 30 enemy.

## T05 — VFX + post (`src/game/render3d/vfx/`, `src/game/render3d/post.ts`)

**Tham khảo skill `crimson-threejs-ref` (`.claude/skills/crimson-threejs-ref/references/`):** `game-feel.md` (trauma shake, hit-stop, FOV punch; nhưng thời gian lấy từ sim), `shader-cookbook.md` (EffectComposer → OutputPass, bloom), `technical-art.md` (particle instanced, giới hạn fill rate). Bloom chọn lọc theo layer phải tự làm.

**Làm:** toàn bộ § Hiệu ứng cần có trong GAME_SPEC (bản canvas tương ứng: `render/effects.ts`, `render/projectiles.ts`, `render/items.ts`). Particle bằng `InstancedMesh`/`Points` có pool. Bloom (UnrealBloomPass) có chọn lọc cho tia lửa, sét, Huyết Ảnh. Hit-stop và screen shake lấy từ trạng thái sim, không tự đặt thời gian riêng. `?fx=low` tắt bloom/shadow để so hiệu năng.

**Tiêu chí đạt:** ảnh parry, sét, Huyết Ảnh, mỗi loại particle · đo fps/draw calls với `fx=high` và `fx=low`, ghi vào report.

## T06 — Môi trường: màn 5–11

**Tham khảo skill `crimson-threejs-ref` (`.claude/skills/crimson-threejs-ref/references/`):** như T03, cộng `shader-cookbook.md` cho tint/caustics dưới nước và hiệu ứng mây.

**Làm:** dùng kit của T03 cho cavern, thunder_peak, blood_abyss, celestial_altar, ocean_palace (dưới nước: tint, caustics, bọt), earth_core, sky_sanctuary (bay giữa mây). Phần nào khác biệt riêng (dung nham sụp đổ, Bát Quái, khoan địa tâm) thì làm nhẹ mà vẫn nhận ra được.

**Tiêu chí đạt:** như T03 cho 7 màn còn lại.

## T07 — UI theo hướng Three.js (`src/game/render3d/ui3d/` + `src/ui/`)

**Tham khảo skill `crimson-threejs-ref` (`.claude/skills/crimson-threejs-ref/references/`):** `ui-patterns.md` (HUD, số cố định độ rộng, touch, `pointercancel`, safe area, responsive). Bỏ qua phần trỏ tới `threejs-image-generator`/`threejs-3d-generator`.

**Làm:** giữ HUD DOM gốc (`ui/GameHUD.tsx` + `ui/hud/*`) làm mặc định (đã chạy được). Thêm `?ui=3d` để thử:
- Title screen có scene 3D sống phía sau (camera bay chậm qua màn đang chọn), panel DOM chồng lên.
- Số sát thương, combo, banner bay trong không gian 3D (sprite hoặc text mesh tự vẽ bằng canvas texture).
- Thanh máu boss/kẻ địch dạng world-space.
- Màn chọn màn: 11 “cổng” 3D có thể click (raycast).
- Responsive: chạy ở 1920×1080, 1280×720, 390×844 (mobile, nút cảm ứng vẫn dùng được).

**Tiêu chí đạt:** ảnh so sánh `ui=dom` và `ui=3d` cho title, HUD trong game, kết quả thắng/thua, ở 3 độ phân giải · không mất chức năng nào của UI gốc.

## T08 — Hiệu năng + bot playtest

**Tham khảo skill `crimson-threejs-ref` (`.claude/skills/crimson-threejs-ref/references/`):** `playtest-bot.md` (bot, phát hiện softlock, metric; fps headless SwiftShader không phải số thật), `debug-playbook.md` (thứ tự profiling), `technical-art.md` (điểm nóng: instancing, merge, culling, shadow map).

**Làm:** `scripts/bot.mjs` dùng `window.__game` chơi từng màn (đi phải, nhảy khi gặp vật cản, chém/parry khi có projectile gần, dùng teleportToBoss nếu kẹt quá N giây), ghi tiến độ %, có chết không, fps min/avg, draw calls max. Chạy 11 màn × `renderer=three`. Tối ưu điểm nóng (instancing, merge geometry tĩnh, frustum culling, giảm shadow map). So với `renderer=canvas`.

**Tiêu chí đạt:** `threejs-port/perf.md` có bảng 11 màn × 2 renderer · không màn nào crash hoặc bot kẹt vĩnh viễn · danh sách bug cơ chế phát hiện được (khác nhau giữa 2 renderer = bug render; giống nhau = bug sim gốc).

## T09 — FINAL_REPORT

**Tham khảo skill `crimson-threejs-ref` (`.claude/skills/crimson-threejs-ref/references/`):** không cần.

**Làm:** viết `threejs-port/FINAL_REPORT.md` cho người đọc sáng mai: tổng hợp từ mọi `reports/*.md`, `perf.md` và ảnh. Mục:
1. Tóm tắt 5 dòng: đáng làm tiếp bằng Three.js không, vì sao.
2. Cơ chế: parity với bản gốc, chỗ lệch, cảm giác điều khiển.
3. UI: DOM chồng lên WebGL so với UI 3D, ảnh so sánh.
4. Hiệu ứng: cái Three.js làm đẹp hơn rõ rệt, cái không đáng công.
5. Hiệu năng: bảng số liệu.
6. Công sức: task nào khó, BLOCKED gì, ước lượng còn bao nhiêu việc để đạt chất lượng bản gốc.
7. Gallery: ảnh canvas và three đặt cạnh nhau cho 11 màn (link tương đối tới `shots/`).

**Tiêu chí đạt:** mọi khẳng định đều có số liệu hoặc ảnh đi kèm · không bịa số.
