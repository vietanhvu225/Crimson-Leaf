# GAME_SPEC — Port "Huyền Thoại Cứu Mẹ" sang Three.js

## Mục tiêu

Dựng lại game Canvas 2D trong `reference/` bằng Three.js để trả lời 3 câu hỏi:

1. **Cơ chế:** gameplay có giữ nguyên cảm giác khi render bằng Three.js không (input, vật lý, va chạm, parry, Z-lane, 11 cơ chế màn)?
2. **UI:** UI trông thế nào khi làm theo hướng Three.js (HUD DOM chồng lên WebGL, UI trong không gian 3D, title screen 3D)?
3. **Hiệu ứng:** Three.js làm được gì hơn Canvas (ánh sáng, bóng, fog, bloom, particle instanced, camera động) và giá hiệu năng là bao nhiêu?

**Không phải mục tiêu:** thêm nội dung mới, đổi luật chơi, cân bằng lại game, dùng asset ngoài.

## Môi trường máy chạy (PC2)

Máy chạy đêm là Windows, đã được `threejs-port/setup-pc2.mjs` kiểm tra. Kết quả nằm ở `threejs-port/PREFLIGHT.md`; version đã chốt nằm ở `threejs-port/PINNED_VERSIONS.json`. Đọc cả hai trước khi làm task.

- **Shell:** Claude Code trên Windows chạy lệnh qua **Git Bash**. Dùng cú pháp bash và đường dẫn `/`. Không dùng lệnh PowerShell/cmd.
- **Playwright:** dùng **thư viện npm `playwright`** (devDependency, version lấy từ `PINNED_VERSIONS.json`), gọi từ `scripts/*.mjs`. **Không cần và không dùng Playwright MCP.** Chromium đã được tải sẵn vào cache dùng chung `%LOCALAPPDATA%\ms-playwright`, nên nếu version khớp thì `npx playwright install chromium` gần như không làm gì.
- **Cách launch Chromium:** dùng đúng `chromiumLaunch` trong `PINNED_VERSIONS.json` (`{ headless, channel?, args }`). Setup đã thử 4 cấu hình và chọn cấu hình có WebGL2, ưu tiên GPU thật hơn SwiftShader. Nếu `chromiumLaunch` là SwiftShader thì fps headless chỉ để so tương đối, không phải số thật.
- **Cổng:** `reference/` chạy ở 3001 (cố định trong config của nó). Bản port dùng **3002** cho `npm run dev`. `scripts/shot.mjs`/`bot.mjs` luôn tự chọn cổng trống (`port: 0` hoặc `strictPort: false`), không hardcode.

## Bản gốc (`reference/`, chỉ đọc)

Chạy bản gốc: `cd reference && npm install && npm run dev` (port 3001). Đây là nguồn sự thật cho mọi hành vi. `setup-pc2.mjs` đã chạy `npm install` cho `reference/` ở repo chính, commit `reference/package-lock.json`, và xác nhận `typecheck`/`test`/`build` của bản gốc xanh trên máy này. Trong worktree của worker thì không có `reference/node_modules` (không commit). Task nào cần chạy bản gốc (T01 parity, T08 so sánh) thì chạy `npm install --prefix reference`. Lệnh này chỉ tạo `node_modules`, không sửa file nguồn nào.

Bản gốc đã được tách lớp sẵn (xem README gốc, mục "Cấu trúc mã nguồn"). Phụ thuộc đi một chiều `ui → render → engine → rules`; `engine` không import `render`/`ui`.

| Thư mục | Nội dung | Với port |
|---|---|---|
| `src/game/rules/` | Hàm thuần: 11 màn (`SEASONS`), vật lý, combat, kỹ năng, nguyên tố, relic, phục kích, tuyệt kỹ boss. Có `rules.test.ts` (16 test). | **Copy nguyên**, test luôn xanh. |
| `src/game/engine/` | `createWorld()` (toàn bộ state), `level/` (dựng màn), `simulation/` (`stepSimulation` điều phối 27 pha), `input.ts`, `spawn.ts`, `damage.ts`, `actions.ts`, `hud.ts`, `debug.ts`. Không vẽ gì. | **Dùng lại**, T01 chỉ gỡ các điểm dính Canvas/DOM (xem dưới). |
| `src/game/render/` | Renderer Canvas 2D: `scene.ts` (thứ tự lớp vẽ), `map/` (`stagePalette.ts` = bảng màu từng màn, `sky/<màn>.ts`, platforms, trunks, hazards, gates, lanterns, water), `characters/` (protagonist, enemy + `enemyGear.ts` theo loại địch, `bossGear.ts`, motherShrine), `effects.ts`, `projectiles.ts`, `items.ts`. | Giữ làm renderer đối chiếu `?renderer=canvas`; là **tài liệu tham khảo hình dạng/màu** cho bản 3D. |
| `src/game/audio.ts` | Âm thanh Web Audio procedural. | Copy nguyên. |
| `src/ui/` | React + Tailwind: `GameCanvas.tsx` (host: `<canvas>`, rAF, props → engine), `GameHUD.tsx` + `hud/*`, TitleScreen, GameModals, GddModal. | Copy; `GameCanvas` sẽ được thay bằng `GameView`. |

**Các điểm engine còn dính Canvas/DOM (việc của T01, đã đối chiếu với code thật):**

1. **RNG:** 39 chỗ `Math.random()` trong `engine/` (`simulation/projectiles.ts` 20, `simulation/ambient.ts` 6, `simulation/movement.ts` 6, `simulation/abilities.ts` 3, `damage.ts` 2, `simulation/playerAttacks.ts` 2). Engine phải đổi sang `world.rng()`. Ngoài engine còn 2 nơi gọi `Math.random` dùng chung chuỗi random với engine trong bản gốc:
   - `audio.ts` (`randomDetune`): gọi mỗi lần phát âm thanh, nhưng **chỉ khi không tắt tiếng**, vì `ensureContext()` trả `null` khi muted và hàm return trước khi gọi random.
   - `render/map/platforms.ts:169`: gọi mỗi lần vẽ một platform đang rung (`collapseTimer > 0`).

   Hai chỗ này giữ nguyên `Math.random` (chỉ ảnh hưởng âm thanh/hình ảnh). Hệ quả cho parity: xem § Kiểm tra trùng khớp.
2. **`World` giữ `canvas`, `ctx`, `canvasRect`:** `createWorld(canvas, ctx, stateRef, touchInputRef)`. Engine không dùng `ctx`; chỉ renderer canvas dùng. Cần bỏ khỏi `World` để `createWorld` chạy được trong Node và để renderer 3D không phải có canvas 2D. Ngoài ra `createWorld` còn đọc `window.innerWidth/innerHeight` và `navigator.userAgent`: hai giá trị này phải do host truyền vào.
3. **Chuột:** `input.ts` tính `mouseClientX/Y` từ `canvasRect`; `simulation/frameInput.ts` đổi sang toạ độ thế giới bằng `mouseClient + camX/camY` (giả định 1 px = 1 đơn vị, không zoom). Renderer 3D phải tự raycast lên mặt phẳng `z = 0` rồi ghi thẳng `mouseWorldX/Y`, nên engine cần nhận "aim theo toạ độ thế giới" từ host.
4. **Khung nhìn:** `viewW`/`viewH` (px) được engine dùng cho camera follow, spawn particle nền, cảnh kết màn (`simulation/camera.ts`, `ambient.ts`, `outcome.ts`, `actions.ts`, `level/index.ts`). Camera 3D phải nhìn đúng vùng `[camX, camX + viewW] × [camY, camY + viewH]` của sim.
5. **Debug hook đã có:** `window.render_game_to_text()` và `window.advanceTime(ms)` (`engine/debug.ts`; `installDebugHooks(world, render)` nhận hàm render nên dùng được cho cả renderer 3D). `advanceTime` chạy `round(ms / 16.67)` bước, mỗi bước cố định `0.01667` s, rồi render **một lần**.
6. **Import không chạy được trong Node.** `node --test` chạy file `.ts` bằng type stripping của Node (Node ≥ 22.18), nên **không** resolve module kiểu Vite/tsc:
   - `rules/` đã import có đuôi (`'./physics.ts'`, `'./index.ts'`) nên `rules.test.ts` chạy được.
   - `engine/` import không đuôi và import thư mục (`'../../rules'`, `'./simulation'`, `'../world'`). Node báo `ERR_MODULE_NOT_FOUND`.
   - `engine/` import type không có từ khoá `type` (ví dụ `import { World } from '../world'`, trong đó `World` là `type`). Strip xong, Node báo "does not provide an export named …".

   Cách sửa, thuần cú pháp, không đổi hành vi:
   - Mọi import tương đối trong `engine/` và những gì engine kéo theo (`audio.ts`) phải có đuôi `.ts`; import thư mục đổi thành `…/index.ts`.
   - Import chỉ dùng type đổi thành `import type`.
   - Bật `"verbatimModuleSyntax": true` và `"erasableSyntaxOnly": true` trong `tsconfig.json` để `tsc` bắt các lỗi này (`allowImportingTsExtensions` đã bật). Nếu `ui/`/`render/` đỏ theo thì sửa cơ học giống như trên.
   - Không thêm `tsx`/`ts-node`/`vitest`.

## Kiến trúc đích

```
src/
  game/rules/      copy nguyên
  game/engine/     copy; T01 gỡ các điểm dính Canvas/DOM ở trên, thêm rng.ts + test chạy trong Node
  game/render/     renderer Canvas 2D (đối chiếu), chỉ sửa để nhận ctx riêng thay vì world.ctx
  game/render3d/   MỚI: scene.ts, camera.ts, env/, actors/, vfx/, post.ts, ui3d/
  game/audio.ts
  ui/              GameView.tsx thay GameCanvas.tsx (props = HostState + resetToken/touchInputRef/tokens)
                   + UI gốc
scripts/
  shot.mjs         chụp ảnh tự động (thư viện Playwright)
  bot.mjs          bot chơi tự động qua window.__game
  smoke.config.json  ngưỡng smoke đã calibrate ở T00 (minFps, minPixelStd)
```

`GameView` tạo `World`, chạy vòng lặp **giống hệt bản gốc**: mỗi frame rAF gọi `stepSimulation(world, rawDt)` một lần (`clampDt` giới hạn dt ở 0.05 s), rồi gọi renderer theo `?renderer=three|canvas` (mặc định `three`). Không đổi sang fixed-step: nếu đổi, cảm giác điều khiển sẽ khác bản gốc và làm nhiễu câu hỏi 1. Tính tất định đã có `advanceTime` (bước cố định) lo. Nếu thấy fixed-step đáng thử thì làm sau cờ `?loop=fixed` và ghi vào report, không bật mặc định. Cả hai renderer đọc **cùng một** `World`; đó là cách so cơ chế 1:1.

### Kiểm tra trùng khớp (parity) — cách đã dùng khi tách lớp bản gốc

Mọi thay đổi trong `rules/` hoặc `engine/` phải giữ nguyên hành vi. Cách kiểm tra tất định, đã dùng để xác minh lần tách lớp:

1. Chèn script **trước** khi app tải (Playwright `page.addInitScript`): thay `Math.random` bằng một PRNG có seed (cùng thuật toán và seed ở cả hai bản), đặt `window.requestAnimationFrame = () => 0` để game không tự chạy theo thời gian thực.
2. **Tắt tiếng** ở cả hai bản (bấm `M` hoặc đặt muted trước khi chạy), để `audio.ts` không tiêu thụ random.
3. Với mỗi màn: chọn màn, rồi chạy chuỗi input cố định chỉ bằng `window.advanceTime(ms)`.
4. Tại mỗi mốc, băm `render_game_to_text()` cùng snapshot world (vị trí/hp/vận tốc của player, enemy, projectile). Pixel canvas chỉ là bằng chứng phụ. Sau đó so hash giữa hai bản.

**Chuỗi random dùng chung (bắt buộc cho parity):** ở bản gốc, engine và `render/map/platforms.ts` lấy random từ cùng một `Math.random`. Vì vậy `createWorld` phải nhận RNG từ ngoài: `createWorld({ …, seed, rng? })`, trong đó `rng` mặc định là `mulberry32(seed)`. Khi chạy parity, host canvas truyền `rng: () => Math.random()` (đã bị thay bằng PRNG có seed). Như vậy engine và renderer canvas tiêu thụ **cùng một chuỗi theo đúng thứ tự** như bản gốc, kể cả ở màn có platform sụp. Bật bằng `?rng=math` (chỉ dùng cho test). Ở chế độ thường thì dùng `world.rng` riêng theo `?seed`.

Kỳ vọng: nếu thứ tự gọi random giữ nguyên thì hai bản trùng khớp từng mốc trên cả 11 màn. Lệch ở mốc nào thì in diff snapshot đầu tiên khác nhau vào report.

### URL params

| Param | Ý nghĩa |
|---|---|
| `autostart=1` | Bỏ qua title (đã có trong bản gốc) |
| `stage=<SeasonId>` | `spring`, `summer`, `autumn`, `winter`, `cavern`, `thunder_peak`, `blood_abyss`, `celestial_altar`, `ocean_palace`, `earth_core`, `sky_sanctuary` (T00 thêm vào `App.tsx` vì phím `1`–`9` không tới được màn 10–11) |
| `loop=1\|2` | Vòng chơi (T00 thêm cùng `stage`) |
| `renderer=three\|canvas` | Chọn renderer |
| `seed=<n>` | Seed RNG (mặc định ngẫu nhiên) |
| `rng=math` | Chỉ cho test parity: engine dùng `Math.random` toàn cục (xem trên) |
| `muted=1` | Bắt đầu ở trạng thái tắt tiếng (dùng cho test/smoke) |
| `debug=1` | Hiện overlay FPS / draw calls / triangles |

### Debug hook (bắt buộc từ T01)

Mở rộng từ hook sẵn có (`render_game_to_text`, `advanceTime`): `window.__game = { world, step(n), setInput(partialFrameInput), stats() }`. `stats()` trả `{ fps, drawCalls, triangles, entities }`. Dùng cho `shot.mjs` và `bot.mjs`. Giữ nguyên hai hook cũ để harness parity vẫn chạy.

## Ánh xạ tọa độ 2.5D

- Sim giữ đơn vị px, trục y hướng xuống, đúng như bản gốc. Không đổi đơn vị trong sim.
- Three: `x3 = simX * S`, `y3 = -simY * S`, với `S = 0.01` (100 px = 1 unit).
- Z-lane (`ZLane` 0 = Ngoài, 1 = Trong): lane 0 → `z = 0`, lane 1 → `z = -3`. Nền parallax đặt các lớp thật ở `z = -10 … -80` thay cho parallax giả.
- Camera: `PerspectiveCamera` FOV khoảng 30°, bám theo player bằng lerp như bản gốc, khoảng nhìn ngang tương đương bản Canvas ở 1920×1080 để độ dễ đọc gameplay giống nhau. Cho phép thêm camera động (zoom khi boss xuất hiện, nghiêng nhẹ khi lướt) nhưng phải tắt được bằng `?cam=flat`.

## Hướng hình ảnh

- Chibi stylized, toon/flat shading (`MeshToonMaterial` hoặc `MeshStandardMaterial` roughness cao). Màu lấy từ `getChibiStagePalette()` (`render/map/stagePalette.ts`) để mỗi màn nhận ra được ngay; bầu trời từng màn tham khảo `render/map/sky/<màn>.ts`.
- Nhân vật: mesh procedural low-poly (capsule, sphere, box ghép lại), animate bằng code (bob, squash, xoay tay chém). Không có rig ngoài. Áo choàng đỏ của nhân vật chính là điểm nhận diện chính.
- Được phép dùng: `three` + `@types/three` (**đúng version trong `PINNED_VERSIONS.json`, không `^`**), `three/examples/jsm` (EffectComposer, UnrealBloomPass, OutputPass...). Không thêm thư viện 3D khác (không R3F, không physics engine; sim đã có physics riêng).
- Texture: chỉ `CanvasTexture` vẽ procedural hoặc màu thuần.

## Hiệu ứng cần có (map từ bản Canvas)

Particle theo màn (`particleType`: petals, fireflies, maple, snow, embers, bubbles) · tia lửa Parry + hit-stop 0.09s · rung màn hình · vệt phi tiêu · cầu sét (LightningArc) · hào quang Thức Tỉnh Huyết Ảnh · đốt/choáng/đóng băng theo nguyên tố · nước/dung nham · god rays/fog · banner chữ nổi · cổng phong ấn và checkpoint phát sáng · đòn đặc biệt của boss.

## Ngân sách hiệu năng

60 FPS ở 1080p trên PC tầm trung. Draw calls < 300, triangles < 500k. Particle và projectile phải dùng `InstancedMesh` hoặc `Points` với pool. Không cấp phát object trong hot loop. Đo bằng `renderer.info`. Số fps "thật" chỉ có ý nghĩa khi `chromiumLaunch` dùng GPU. Nếu là SwiftShader thì so tương đối giữa các cấu hình (`fx=high`/`low`, `three`/`canvas`) và ghi rõ điều đó trong report. Draw calls và triangles thì không phụ thuộc GPU, luôn so được.

## Gates (orchestrator và worker đều chạy)

```bash
npm run typecheck                              # tsc --noEmit
npm run test                                   # node --test: rules (T00) + engine (T01 thêm vào script)
npm run build
node scripts/shot.mjs --smoke                  # mọi màn × renderer hiện có: 0 console error, ảnh không trắng/đen, fps ghi vào result.json
```

`--smoke` phải thoát với mã khác 0 nếu có console error, canvas trống (độ lệch chuẩn pixel < `minPixelStd`), hoặc fps < `minFps`. Hai ngưỡng này nằm trong `scripts/smoke.config.json`, do T00 calibrate. Smoke chạy với `muted=1`.

**Chỉ một smoke chạy tại một thời điểm trên máy.** Hai worker chạy WebGL headless cùng lúc sẽ làm fps tụt và smoke đỏ giả. `shot.mjs` phải giữ một file khoá ở `os.tmpdir()/crimson-shot.lock` (tạo bằng `fs.openSync(path, 'wx')`, chờ tối đa 20 phút nếu khoá đang bị giữ, xoá khoá khi thoát kể cả khi lỗi). Khoá cũ hơn 30 phút thì coi là rác và chiếm lại.
