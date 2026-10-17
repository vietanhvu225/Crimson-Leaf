# FINAL_REPORT: Port "Huyền Thoại Cứu Mẹ" sang Three.js

Nguồn: `reports/T00.md` … `reports/T08.md`, `reports/T05-review-1.md`, `perf.md`, `LOG.md` và ảnh trong `shots/`. Mọi đường dẫn ảnh trong file này là đường dẫn tương đối từ `threejs-port/`. Máy đo là PC2: Chromium headless, **ANGLE D3D11, NVIDIA GeForce RTX 5070**. Đây là GPU thật, không phải SwiftShader (`PREFLIGHT.md`, `reports/T00.md`). Số nào không có nguồn thì ghi là "chưa đo".

## 1. Tóm tắt

1. **Nên làm tiếp bằng Three.js, theo hướng "thêm renderer cho cùng một sim", không viết lại game.** Hai renderer đọc chung một `World`. Dấu vân tay sim trùng ở 11/11 màn (`perf.md`), và parity với bản gốc trùng 11/11 màn × 41 mốc (`reports/T01.md`).
2. **Hiệu năng không phải trở ngại.** Ở 1080p, three chạy 469–535 fps, canvas 109–173 fps khi không khoá vsync, tức three nhanh hơn khoảng 3–4×. Draw call tối đa là 142 (giới hạn 300), triangle tối đa là 406 k (giới hạn 500 k) (`perf.md`).
3. **Three.js hơn rõ ở các phần:** nước và dưới nước (fresnel, caustics, god rays), parallax thật theo độ sâu, fog, bóng đổ, và đồ vật bay quanh nhân vật thật trong 3D (`shots/T06/ocean_palace-l1.png`, `shots/T03/summer-l1.png`).
4. **Ba phần tốn công hơn hẳn canvas:**
   - Nhân vật dễ đọc: cần viền mực, góc 3/4 và instancing theo primitive.
   - Chữ: sprite và atlas `CanvasTexture`.
   - Che khuất giữa hai Z-lane: phải cắt slab và dùng x-ray.

   Ở ảnh 1080p, nhân vật bản canvas vẫn dễ nhận ra hơn (§ 7).
5. **Còn khoảng 2–4 tuần công người để đạt chất lượng bản gốc** (ước lượng, xem § 6). Chưa có người chơi thật thử cảm giác điều khiển. Hiệu năng mới đo trên RTX 5070, chưa đo trên máy tầm trung.

## 2. Cơ chế

### Parity với bản gốc

- **Harness** (`scripts/parity.mjs`, T01):
  - `Math.random` được thay bằng mulberry32 có seed, rAF bị chặn, game tắt tiếng.
  - Chạy 11 màn, mỗi màn 20 s giả lập, 41 mốc. Kịch bản input: đi, nhảy, chém, phi tiêu, đổi lane, lướt, móc, và restart ở giây 10.
  - Mỗi mốc so `render_game_to_text()`, snapshot world và số lần gọi random.
- **Kết quả:** `?renderer=canvas&rng=math` khớp `reference/` ở **11/11 màn, mọi mốc**. Orchestrator đã chạy lại độc lập sau T01, T02, T07 và T08 (`LOG.md`).
- **Đối chứng âm cho thấy harness bắt được sai lệch thật:** đổi seed thì lệch ở 33/41 mốc; bỏ `rng=math` thì lệch ở 1/41 mốc (`reports/T01.md`).
- **Pixel hash** đôi khi lệch 1/40 mốc dù state trùng. Lệch này có từ trước khi sửa code, nên do raster của GPU, không phải do port, và không tính vào kết quả.
- **Engine chạy được trong Node.** `npm test` có 30 test (16 rules + 14 engine), trong đó có golden 600 bước và kiểm tra cả 11 màn.

### Hai renderer trên cùng một ván

- `scripts/bot.mjs` (T08) dùng bước cố định với cùng seed và cùng input. Dấu vân tay cuối ván (vị trí, hp, kills, score, số enemy còn sống, số frame) của three và canvas **giống nhau ở 11/11 màn**, nghĩa là không có lỗi render nào chạm vào sim (`perf.md` § Bug cơ chế).
- `__game` + bot thắng màn 1 bằng three, không bất tử, không teleport: 429 s sim, 223 kill (`shots/T02/spring-three-clear.json`).

### Chỗ lệch hoặc khác so với bản gốc

| Chỗ | Mô tả | Nguồn |
|---|---|---|
| Aim | Canvas coi 1 px màn hình = 1 đơn vị sim và cộng `camX` ngay giữa bước. Three phải raycast lên mặt z = 0 theo camera của đúng bước sim, qua hook `world.aimSync`. Parity canvas không đổi. | T01, T02 |
| Z-lane | Canvas vẽ hai lane trên cùng một mặt phẳng, phân biệt bằng alpha. 3D có chiều sâu thật nên phát sinh che khuất: slab lane 0 và slab `both` ở trên che player ở lane 1. Phải cắt mờ slab trong hộp quanh player và vẽ x-ray (`GreaterDepth`). | `shots/T03/spring-debug-lane1.png` (trước khi sửa), `shots/T03/spring-lane1.png`, `shots/T04/spring-lane1.png` (sau khi sửa) |
| Camera | Mặc định nghiêng nhẹ (nâng 12 % chiều cao view) để thấy chiều sâu giữa hai lane. `?cam=flat` cho z = 0 khớp 1:1 với canvas. | T02 |
| Số sát thương (ui=3d) | Tính từ chênh lệch hp giữa hai frame render, vì sim không phát sự kiện damage. Khi nhiều bước chạy liền nhau (`advanceTime`), các đòn trong cùng một khung bị gộp thành một số. | T07 |
| ui=3d ở title | Đổi màn ở title sẽ `rebuildLevel` và tiêu thụ `world.rng`. Vì vậy cùng seed nhưng ui=3d cho chuỗi random khác ui=dom. Parity, smoke và bot dùng ui=dom nên không bị ảnh hưởng. | T07 |
| Lỗi UI gốc đã sửa | Ở title DOM, nút "Bắt Đầu" bị cắt mất ở 1280×720 và 390×844, nên trên mobile không vào trận được. Đã sửa cho cả `ui=dom`. | T07 |

**Ba điểm lạ của sim gốc.** Ba điểm này xảy ra y hệt ở cả hai renderer nên không phải lỗi port. Chưa sửa, đúng luật của task (`perf.md`):

1. `teleportToBoss` ở thunder_peak thả người chơi giữa không trung, rồi người chơi rơi tới y ≈ 5 000–6 300. Lỗi chỉ xảy ra với phím debug V.
2. Ở cavern, người chơi lên tới y = −3 691, cao hơn đỉnh màn gần 4 000 px. Chưa kiểm bằng tay trên `reference/`.
3. Ở spring (x ≈ 8 265), bot kẹt 15 s. Có thể do bot kém, chưa xác nhận là bug.

### Cảm giác điều khiển

- Vòng lặp giữ đúng kiểu bản gốc: mỗi rAF gọi một `stepSimulation(world, rawDt)`, với `clampDt` 0.05 s. Không chuyển sang fixed-step (`reports/T01.md`).
- Input, vật lý, va chạm và parry đều dùng chung code `engine/`, nên khác biệt chỉ có thể đến từ thời gian render một frame. Ở 1080p, p95 dưới 3 ms (`perf.md`). fps rAF thực tế bị vsync khoá ở 142.7–144 cho cả 22 lượt smoke.
- Hit-stop (0.09 s), rung màn hình và FOV punch đều lấy từ state của sim (`hitstopTimer`, `cameraTrauma`), không có timer riêng (T05).
- **Chưa có:** chưa ai chơi thử bằng tay, và chưa đo độ trễ input. Câu hỏi "cảm giác có giữ nguyên không" mới được trả lời bằng tính tất định và số ms/frame, chưa có đánh giá chủ quan.

## 3. UI: DOM chồng lên WebGL so với UI 3D

Mặc định là `ui=dom`, tức HUD React gốc chồng lên canvas WebGL. Bật `?ui=3d` (T07) thì có thêm:

- title có cảnh bay qua màn đang chọn;
- 11 cổng torii 3D chọn màn bằng raycast;
- số sát thương và combo nổi trong không gian 3D;
- bảng máu boss treo trên đầu boss;
- biển ĐẠI THẮNG / BẠI TRẬN rơi xuống.

Bộ ảnh đầy đủ có 30 ảnh (dom/3d × 3 độ phân giải × 5 trạng thái), cả 6 lượt chạy đều `ok: true, errors=0`.

| Trạng thái | ui=dom | ui=3d |
|---|---|---|
| Title 1080p | ![](../shots/T07/uidom-1920x1080-title.png) | ![](../shots/T07/ui3d-1920x1080-title.png) |
| Chọn màn 720p | ![](../shots/T07/uidom-1280x720-pick.png) | ![](../shots/T07/ui3d-1280x720-pick.png) |
| HUD 1080p | ![](../shots/T07/uidom-1920x1080-hud.png) | ![](../shots/T07/ui3d-1920x1080-hud.png) |
| HUD mobile 390×844 | ![](../shots/T07/uidom-390x844-hud.png) | ![](../shots/T07/ui3d-390x844-hud.png) |
| Thắng 720p | ![](../shots/T07/uidom-1280x720-victory.png) | ![](../shots/T07/ui3d-1280x720-victory.png) |
| Thua mobile | ![](../shots/T07/uidom-390x844-defeat.png) | ![](../shots/T07/ui3d-390x844-defeat.png) |

**Nhận xét:**

- **Thông tin dày nên để DOM:** vitals, skill dock, modal số liệu, GDD, pause. DOM có sẵn layout responsive, focus và chữ sắc nét. Ở 390×844, nút cảm ứng vẫn nằm ở đáy và dùng được ở cả hai chế độ.
- **UI 3D có ích ở chỗ gắn với thế giới.** Bảng máu boss nằm ngay trên boss (904/1400 trong `ui3d-1920x1080-hud.png`), số sát thương và combo nằm cạnh chỗ đánh nhau, nên mắt người chơi không phải rời khỏi trận. Bảng boss neo vào mép màn hình kèm mũi tên khi boss ra ngoài khung.
- **Điểm yếu thấy trong ảnh:**
  - Chữ chồng lên nhau khi nhiều sự kiện xảy ra cùng lúc. Banner sim chồng nhau ở **cả hai renderer**, nên đây là hành vi gốc: xem `../shots/T08/bot/sweep-winter-canvas.png` và `sweep-winter-three.png`. Phần riêng của ui=3d là số sát thương "52" đè lên "22 COMBO" (`ui3d-1920x1080-hud.png`).
  - Ở title 3D 1080p, nhãn của các cổng hàng trên nằm sát nhau và lẫn vào cảnh nền (`ui3d-1920x1080-title.png`).
  - Cổng 3D chưa điều khiển được bằng bàn phím. Panel còn nút ◀ ▶ và Enter để thay thế.
- **Chi phí:** ui=3d thêm khoảng 6 draw call ở màn kết quả (102 so với 96 ở 720p), khoảng 14 ở title, khoảng 34 texture, và +68 triangle (`reports/T07.md`).
- **Khó hơn so với DOM:**
  - Chữ phải tự vẽ lên `CanvasTexture`.
  - `renderOrder` giữa các lớp `depthTest:false` của nhiều module phải phối hợp bằng tay.
  - Hit-test phải tự raycast.
  - Bố cục responsive phải tự tính theo frustum.

## 4. Hiệu ứng

### Three.js làm đẹp hơn rõ rệt

| Hiệu ứng | Vì sao hơn | Chi phí | Ảnh |
|---|---|---|---|
| Nước và dung nham | Shader tự viết (khoảng 150 dòng): sóng 3D, fresnel, lấp lánh; ở màn hạ, hồ chạy ra tới chân trời. Canvas chỉ có gradient và đường sóng. | 1 shader, vài draw call | `../shots/T03/summer-l1.png` so với `../shots/T03/summer-l1-canvas.png` |
| Dưới nước | Caustics theo toạ độ thế giới (khoảng 15 dòng GLSL vá vào material dùng chung), god rays, fog tint, sứa và bọt ở nhiều độ sâu. | **0 draw call thêm** cho caustics | `../shots/T06/ocean_palace-l1.png` so với `../shots/T06/ocean_palace-l1-canvas.png` |
| Parallax thật | Lớp nền đặt ở z −17 … −96, phối cảnh tự tạo parallax, kể cả parallax dọc ở màn leo (bánh răng ở thu, đảo đá ở thunder, địa tầng ở earth_core). Canvas phải nhân hệ số bằng tay cho từng lớp. | Phải tính `viewAtDepth` để tile | `../shots/T03/autumn-l1.png`, `../shots/T06/thunder_peak-l1.png` |
| Fog và bóng đổ | Gần như có sẵn trong three. Shadow map 2048 dùng một đèn. | Nằm trong khoảng 0.32 ms post + shadow ở 1080p | `../shots/T05/review2/winter-combat-fxhigh.png` |
| Đồ vật quanh nhân vật | Tràng hạt, xích liềm và phi kiếm hộ thể bay quanh thân thật trong 3D, có trước có sau. Nhân vật quay người khi đổi hướng. | Instancing theo primitive | `../shots/T04/gallery.png`, `../shots/T04/winter-boss.png` |
| Bloom chọn lọc | Áp cho tia lửa parry, sét và Huyết Ảnh (layer 1, nửa độ phân giải). | fx=high 132 draw call so với fx=low 77 (winter combat) | `../shots/T05/review2/spring-parry.png`, `../shots/T05/review2/spring-awaken.png` |

### Không đáng công, hoặc phải trả giá đắt

- **Post-processing ghép từ nhiều module.** Ở T05 lần 1, `fx=high` làm cả cảnh mờ sữa khi chạy cùng env thật. Có bốn lỗi chồng nhau:
  1. OutputPass áp ACES lên sky, fog và halo;
  2. viền Huyết Ảnh cộng đỏ lên gần cả màn hình;
  3. bloom `readBuffer` đã chứa sẵn VFX nên VFX bị cộng hai lần;
  4. bloom bị mã hoá sRGB trước khi cộng.

  Cách sửa: bỏ final composer, vẽ cảnh thẳng ra màn hình rồi blend overlay lên trên. Lỗi này tốn thêm một lần thử ($3.73, khoảng 10 phút). Ảnh trước và sau khi sửa: `../shots/T05/review1/winter-combat-fxhigh.png` và `../shots/T05/review2/winter-combat-fxhigh.png`. Canvas không có loại lỗi này vì mọi thứ đã là màu sRGB cuối cùng.
- **Additive dày đặc cùng bloom.** 70 tia lửa dồn vào một chỗ thành một khối trắng, nên phải chia gain theo mật độ (`√(10/n)`). Ảnh sét vẫn còn một mảng trắng ở mục tiêu, và mảng này có cả ở `fx=low` (`../shots/T05/review2/spring-fxlow-lightning.png`).
- **Glow của bloom không bị geometry che** (T05). Nhấp nháy khi bất tử làm bằng dither 50 %, trông lổn nhổn ở 720p (T04).
- **Mặt anime phẳng của canvas khó giữ trong 3D.** Phải xoay nhân vật về góc 3/4, dán mắt "flat" lên mặt cầu, và vẽ viền inverted hull. Viền làm số triangle tăng gấp đôi, cộng shadow pass thì ×3 (T04). Kết quả vẫn kém dễ đọc hơn canvas ở cảnh đông người (§ 7).

### Chưa làm hoặc còn lệch

- Ocean ở loop 2: tia sáng, caustics và mặt nước vẫn màu cyan, chỉ fog và palette chuyển sang đỏ (T06).
- Cavern quá tím và sáng, vì đang dùng hemi light chung cho mọi màn (T06).

## 5. Hiệu năng

**11 màn × 2 renderer**, 1920×1080, seed 1, fx=high. rAF bị chặn, mỗi frame = 1 bước sim + 1 render + `readPixels` để chờ GPU xong, nên số liệu không bị vsync khoá (`perf.md`, `../shots/T08/bot/sweep.json`).

| Màn | three fps avg / min | three ms p95 | three draw calls max | three tris max | canvas fps avg / min | canvas ms p95 | Sim giống nhau |
|---|---|---|---|---|---|---|---|
| spring | 469 / 356.9 | 2.9 | 140 | 291 772 | 118.6 / 98.9 | 9.5 | có |
| summer | 495.8 / 387.8 | 3.0 | 142 | 248 708 | 121.7 / 99.2 | 9.4 | có |
| autumn | 532.6 / 415.2 | 2.6 | 123 | 197 682 | 125.5 / 93.4 | 9.3 | có |
| winter | 512.9 / 363.6 | 2.8 | 138 | 206 366 | 173.4 / 132.3 | 6.9 | có |
| cavern | 474.9 / 321.5 | 3.0 | 135 | 406 208 | 111.1 / 87.6 | 11.0 | có |
| thunder_peak | 535 / 342.9 | 2.8 | 123 | 260 352 | 111.9 / 92.5 | 10.6 | có |
| blood_abyss | 477.9 / 306.6 | 2.9 | 139 | 371 230 | 109.2 / 85.4 | 10.7 | có |
| celestial_altar | 485.1 / 285.3 | 3.0 | 142 | 310 650 | 151.4 / 118.5 | 7.8 | có |
| ocean_palace | 501.7 / 377.6 | 2.8 | 137 | 285 042 | 112.8 / 85.8 | 10.6 | có |
| earth_core | 492 / 352.3 | 3.0 | 139 | 208 874 | 151 / 113.4 | 7.8 | có |
| sky_sanctuary | 528.6 / 382.9 | 2.7 | 132 | 266 554 | 164.8 / 125.4 | 7.3 | có |

**Đo thêm:**

| Đo | Kết quả | Nguồn |
|---|---|---|
| fps rAF thật (vsync 144 Hz), 1280×720, smoke 22 lượt | three và canvas đều 142.7–144 | `reports/T08.md` |
| Frame tệ nhất (three) | 20–32 ms. Đây là frame đầu tiên gặp loại địch hoặc hiệu ứng mới (compile shader), không phải tải đều. | `perf.md` |
| fx=high so với fx=low, winter combat | 132 / 125 k so với 77 / 79 k (draw calls / tris) | `reports/T05.md` |
| fx=high so với fx=low, bench spring 1080p (sim + render) | 1.12 ms so với 0.80 ms. Post + shadow tốn khoảng 0.32 ms. | `../shots/T05/perf/bench2-*.json` |
| 30 enemy thêm vào quanh player (1080p) | fps 144 → 144.3 (vsync), draw calls 67 → **68**, tris 126 k → 413 k | `../shots/T04/crowd30.json` |
| Đổi renderer F9 × 40 lần | geometries 42 → 39 rồi ổn định, textures giữ 6, 0 cảnh báo WebGL. JS heap tăng 45 → 51.5 MB, nghi do GC chưa chạy. | `../shots/T04/swap.json` |
| Tối ưu cull actors theo y (autumn) | 1 301 824 → 197 682 tris; ms/frame 2.54 → 1.88 | `perf.md` |
| Tối ưu cull env theo y (thunder_peak) | 340 k → 40 k tris | `reports/T06.md` |

**Nhận xét:**

- Three nhanh hơn canvas 2D khoảng 3–4× trên GPU này. Canvas tốn CPU cho gradient, path và `fillText` mỗi frame; three gom cảnh lại thành khoảng 130 draw call instanced.
- Số draw call gần như không đổi khi số enemy tăng, nhờ instancing theo cặp (primitive, style) ở T04. Nếu mỗi enemy là một Group khoảng 60 mesh thì 30 enemy sẽ thành khoảng 1 800 draw call.
- **Bẫy riêng của 3D:** culling phải làm theo cả hai trục. Hai lần thiếu điều kiện cull theo y làm màn dọc vượt ngân sách triangle (autumn vượt 2.6×).
- **Chưa đo:** máy tầm trung thật, GPU tích hợp, mobile thật. Mọi số ở trên là của RTX 5070 headless.

## 6. Công sức

Mỗi task do một worker Claude headless làm. Thời gian và chi phí lấy từ `LOG.md`; T09 không tính.

| Task | Thời gian | Chi phí | Lần thử | Ghi chú khó |
|---|---|---|---|---|
| T00 Bootstrap | ~9 phút | $2.09 | 1 (+1 BLOCKED do môi trường) | Lần đầu worker chỉ có tool PowerShell trong khi allowlist chỉ có `Bash(...)`. Phải đổi biến môi trường để có Bash, và lần đó không tính là một lần thử. |
| T01 Gỡ engine khỏi Canvas | ~30 phút | $4.84 | 1 | Aim cần một hook giữa bước sim. Harness parity phải chờ React commit. |
| T02 Khung Three.js | ~22 phút | $6.65 | 1 | Che khuất giữa hai lane |
| T03 Env màn 1–4 | ~18 phút | $5.80 | 1 | Cắt slab ở lane 1, shader nước |
| T04 Actors | ~24 phút | $6.91 | 1 | Instancing theo primitive, viền, chọn góc 3/4 |
| T05 VFX + post | ~20 + 10 phút | $7.07 + $3.73 | **2** | Lỗi mờ sữa chỉ lộ ra khi ghép với env thật |
| T06 Env màn 5–11 | ~20 phút | $7.20 | 1 | Cull theo y, additive cộng màu fog |
| T07 UI 3D | ~22 phút | $6.52 | 1 | Phối hợp `renderOrder`, bố cục theo frustum |
| T08 Perf + bot | ~49 phút | $4.01 | 1 | Bot leo màn dọc; cull actors theo y |
| **Tổng** | **~224 phút** | **~$54.82** | | |

- **BLOCKED:** chỉ có T00 lần đầu, do môi trường (PowerShell so với Bash), không phải do kỹ thuật. Không task nào BLOCKED vì kỹ thuật. Chỉ T05 cần lần thử thứ 2.
- **Quy mô code** (`git ls-files … | xargs wc -l`):
  - `render3d/` có 8 997 dòng: env 2 652, actors 2 418, vfx 1 296, ui3d 951, còn lại là khung và placeholder.
  - Để so: renderer canvas gốc `render/` có 7 083 dòng.
  - `scripts/` (shot, bot, parity, harness) có 2 178 dòng.
  - Sim (`rules/`, `engine/`) không phải viết lại.

**Ước lượng việc còn lại để đạt chất lượng bản gốc.** Đây là ước lượng chủ quan, dựa trên các mục "Vấn đề còn lại" của từng report, không phải số đo:

| Việc | Vì sao | Ước lượng |
|---|---|---|
| Nhân vật dễ đọc ở cảnh đông (cỡ, viền, tương phản với nền, nhấp nháy bất tử không dùng dither) | Canvas dễ đọc hơn trong các cặp ảnh đã xem ở § 7 | 3–5 ngày |
| Chống chồng chữ: banner, số sát thương, nhãn cổng | Thấy trong `ui3d-1920x1080-hud.png` và `ui3d-1920x1080-title.png` | 1–2 ngày |
| Ánh sáng theo màn (cavern quá sáng, ocean loop 2 vẫn màu cyan) và rà palette loop 2 cho cả 11 màn | T06 | 2–3 ngày |
| Che khuất lane: rà lại ở mọi màn (mới chụp kỹ ở spring), thử giảm `LANE_HALF_DEPTH` | T03 | 1–2 ngày |
| Người chơi thật thử cảm giác điều khiển, đo độ trễ input | Chưa làm | 1–2 ngày |
| Đo trên máy tầm trung hoặc mobile thật; thêm preset `fx` | Chưa đo | 1–2 ngày |
| Bloom bị che đúng, glow mép khi dissolve, dọn chunk > 500 kB | T04, T05, build | 1–2 ngày |
| Kiểm và quyết định về 3 điểm lạ của sim gốc (cavern y = −3 691…) | `perf.md` | 0.5–1 ngày |
| **Tổng** | | **khoảng 2–4 tuần công người** |

## 7. Gallery: canvas và three, 11 màn

Cột chính lấy từ bot sweep T08 (`../shots/T08/bot/`). Ảnh ở 1080p, chụp trên bản đã gộp đủ env, actors, vfx và ui. Hai ảnh cùng hàng là **cùng một ván, cùng frame cuối**, vì dấu vân tay sim trùng nhau. Cột "Env (l1 / l2)" là ảnh 720p của T03/T06, chụp lúc nhân vật còn là capsule placeholder, chỉ dùng để xem môi trường và palette loop 2.

| Màn | Canvas | Three | Env three (l1 / l2) và canvas |
|---|---|---|---|
| 1 spring | ![](../shots/T08/bot/sweep-spring-canvas.png) | ![](../shots/T08/bot/sweep-spring-three.png) | [l1](../shots/T03/spring-l1.png) · [l2](../shots/T03/spring-l2.png) · [canvas](../shots/T03/spring-l1-canvas.png) |
| 2 summer | ![](../shots/T08/bot/sweep-summer-canvas.png) | ![](../shots/T08/bot/sweep-summer-three.png) | [l1](../shots/T03/summer-l1.png) · [l2](../shots/T03/summer-l2.png) · [canvas](../shots/T03/summer-l1-canvas.png) |
| 3 autumn | ![](../shots/T08/bot/sweep-autumn-canvas.png) | ![](../shots/T08/bot/sweep-autumn-three.png) | [l1](../shots/T03/autumn-l1.png) · [l2](../shots/T03/autumn-l2.png) · [canvas](../shots/T03/autumn-l1-canvas.png) |
| 4 winter | ![](../shots/T08/bot/sweep-winter-canvas.png) | ![](../shots/T08/bot/sweep-winter-three.png) | [l1](../shots/T03/winter-l1.png) · [l2](../shots/T03/winter-l2.png) · [canvas](../shots/T03/winter-l1-canvas.png) |
| 5 cavern | ![](../shots/T08/bot/sweep-cavern-canvas.png) | ![](../shots/T08/bot/sweep-cavern-three.png) | [l1](../shots/T06/cavern-l1.png) · [l2](../shots/T06/cavern-l2.png) · [canvas](../shots/T06/cavern-l1-canvas.png) |
| 6 thunder_peak | ![](../shots/T08/bot/sweep-thunder_peak-canvas.png) | ![](../shots/T08/bot/sweep-thunder_peak-three.png) | [l1](../shots/T06/thunder_peak-l1.png) · [l2](../shots/T06/thunder_peak-l2.png) · [canvas](../shots/T06/thunder_peak-l1-canvas.png) |
| 7 blood_abyss | ![](../shots/T08/bot/sweep-blood_abyss-canvas.png) | ![](../shots/T08/bot/sweep-blood_abyss-three.png) | [l1](../shots/T06/blood_abyss-l1.png) · [l2](../shots/T06/blood_abyss-l2.png) · [canvas](../shots/T06/blood_abyss-l1-canvas.png) |
| 8 celestial_altar | ![](../shots/T08/bot/sweep-celestial_altar-canvas.png) | ![](../shots/T08/bot/sweep-celestial_altar-three.png) | [l1](../shots/T06/celestial_altar-l1.png) · [l2](../shots/T06/celestial_altar-l2.png) · [canvas](../shots/T06/celestial_altar-l1-canvas.png) |
| 9 ocean_palace | ![](../shots/T08/bot/sweep-ocean_palace-canvas.png) | ![](../shots/T08/bot/sweep-ocean_palace-three.png) | [l1](../shots/T06/ocean_palace-l1.png) · [l2](../shots/T06/ocean_palace-l2.png) · [canvas](../shots/T06/ocean_palace-l1-canvas.png) |
| 10 earth_core | ![](../shots/T08/bot/sweep-earth_core-canvas.png) | ![](../shots/T08/bot/sweep-earth_core-three.png) | [l1](../shots/T06/earth_core-l1.png) · [l2](../shots/T06/earth_core-l2.png) · [canvas](../shots/T06/earth_core-l1-canvas.png) |
| 11 sky_sanctuary | ![](../shots/T08/bot/sweep-sky_sanctuary-canvas.png) | ![](../shots/T08/bot/sweep-sky_sanctuary-three.png) | [l1](../shots/T06/sky_sanctuary-l1.png) · [l2](../shots/T06/sky_sanctuary-l2.png) · [canvas](../shots/T06/sky_sanctuary-l1-canvas.png) |

**Nhận xét khi đặt cạnh nhau** (mình đã xem trực tiếp `sweep-spring-*`, `sweep-winter-*`, `sweep-ocean_palace-three`, `sweep-sky_sanctuary-three`, `spring-l1*`, `ocean_palace-l1*`; các cặp khác chưa xem kỹ):

- Mỗi màn bản three vẫn nhận ra ngay nhờ palette và vật nền lấy từ canvas: anh đào + Phú Sĩ, hồ sen, hoàng hôn + bánh răng, cực quang, thạch nhũ, trống sấm, lò quỷ, nhật thực bát quái, long cung, địa tầng, biển mây.
- **Bản three có chiều sâu, ánh sáng và nước đẹp hơn.** Dưới nước (màn 9) là khác biệt lớn nhất.
- **Bản canvas đọc gameplay dễ hơn ở 1080p.** Nhân vật canvas có viền đen dày, tương phản cao với nền phẳng. Nhân vật three nhỏ hơn về mặt thị giác và dễ lẫn vào VFX: lúc hạ boss ở `sweep-spring-three.png`, vùng quanh boss bị chói; ở `sweep-winter-three.png`, player bị quầng hồng che, còn bản canvas cùng frame vẫn thấy rõ áo choàng đỏ. Nắp platform 3D chiếm nhiều diện tích màn hình do camera nghiêng.

Ảnh bổ sung:

- Dàn hàng actors: `../shots/T04/gallery.png` (8 archetype, hộ pháp, Mẹ, 11 boss, 10 tư thế player).
- Hai lane: `../shots/T04/spring-lane0.png`, `../shots/T04/spring-lane1.png`.
- Hitbox khớp hình: `../shots/T03/autumn-hitbox.png`, `../shots/T06/earth_core-hitbox.png`.
- Bot giải cứu Mẹ: `../shots/T08/bot/sweep-sky_sanctuary-three.png`.
- Chụp lại trên HEAD lúc viết report (T09, seed 1, `--script combat`, 1080p, 0 console error):
  - `../shots/T09/spring-three.png`: 123 draw calls, 184 k tris. Player lại bị quầng hồng che.
  - `../shots/T09/spring-canvas.png`
  - `../shots/T09/ocean_palace-three.png`: 129 draw calls, 183 k tris.
