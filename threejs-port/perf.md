# perf.md — 11 màn × 2 renderer (T08)

Đo bằng `npm run bot` (`scripts/bot.mjs`). Máy PC2: **ANGLE D3D11, NVIDIA GeForce RTX 5070** (GPU thật, không phải SwiftShader). Viewport **1920×1080**, seed 1, loop 1, `fx` mặc định (high), muted.

**Cách đo:** rAF bị chặn trước khi app tải; sim chỉ chạy qua `__game.step(1)` (bước cố định 1/60 s, mỗi bước = 1 sim + 1 render), sau mỗi frame đọc 1 pixel (`readPixels` / `getImageData`) để chờ GPU xong. Vì vậy ms/frame **không bị vsync chặn** và có cả phần GPU: fps = 1000 / ms. `fps min` = cửa sổ 60 frame (1 s) tệ nhất; bỏ 60 frame đầu (compile shader). Số fps rAF thật (vsync 144 Hz) nằm trong smoke: 142.7–144 cho cả 22 lượt.

Vì cùng seed + cùng input, cả hai renderer chơi **đúng cùng một ván**. Cột "Sim giống nhau?" so dấu vân tay cuối (vị trí, hp, kills, score, số enemy sống, số frame).

## Bảng chính (bot v1, `shots/T08/bot/sweep.json`, sau khi sửa culling)

| Màn | Kết quả bot | Chết (lần đầu ở %) | Tiến độ % (trước teleport) | Teleport | Sim s | three fps avg / min | three ms p95 / worst | three draw calls max | three tris max | canvas fps avg / min | canvas ms p95 / worst | Sim giống nhau? |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| spring | thắng | 1 (20.5%) | 23.2 | có (t=91.4s) | 95.5 | 469 / 356.9 | 2.9 / 32 | 140 | 291772 | 118.6 / 98.9 | 9.5 / 16.1 | có |
| summer | thắng | 1 (41.3%) | 99.1 | không | 285.5 | 495.8 / 387.8 | 3 / 21.3 | 142 | 248708 | 121.7 / 99.2 | 9.4 / 16.9 | có |
| autumn | hết giờ (600 s) | 1 (7.6%) | 77.9 | không | 600 | 532.6 / 415.2 | 2.6 / 22.8 | 123 | 197682 | 125.5 / 93.4 | 9.3 / 19 | có |
| winter | thắng | 13 (12.3%) | 98 | không | 362.6 | 512.9 / 363.6 | 2.8 / 20.6 | 138 | 206366 | 173.4 / 132.3 | 6.9 / 13.5 | có |
| cavern | thắng | 0 | 23.8 | có (t=74.2s) | 138.8 | 474.9 / 321.5 | 3 / 20.8 | 135 | 406208 | 111.1 / 87.6 | 11 / 18.9 | có |
| thunder_peak | kẹt (bot v1) | 2 (0.5%) | 2.5 | có (t=198s) | 292.1 | 535 / 342.9 | 2.8 / 25.6 | 123 | 260352 | 111.9 / 92.5 | 10.6 / 27.2 | có |
| blood_abyss | thắng | 1 (8.7%) | 37.9 | có (t=143.4s) | 191.2 | 477.9 / 306.6 | 2.9 / 21.3 | 139 | 371230 | 109.2 / 85.4 | 10.7 / 18.5 | có |
| celestial_altar | kẹt (bot v1) | 4 (3.4%) | 24.1 | có (t=123.3s) | 213.4 | 485.1 / 285.3 | 3 / 23.7 | 142 | 310650 | 151.4 / 118.5 | 7.8 / 16 | có |
| ocean_palace | thắng | 2 (6.1%) | 100 | không | 335.6 | 501.7 / 377.6 | 2.8 / 20.2 | 137 | 285042 | 112.8 / 85.8 | 10.6 / 17.4 | có |
| earth_core | thắng | 2 (4.9%) | 99.5 | không | 472.8 | 492 / 352.3 | 3 / 22 | 139 | 208874 | 151 / 113.4 | 7.8 / 15.8 | có |
| sky_sanctuary | thắng | 3 (3%) | 100 | không | 522.7 | 528.6 / 382.9 | 2.7 / 22 | 132 | 266554 | 164.8 / 125.4 | 7.3 / 15.6 | có |

"Chết": bot đếm cái chết rồi hồi sinh tại chỗ (hp = max) để quét hết màn; tắt bằng `--no-revive`. Cái chết đầu tiên là con số "bot ngây thơ chết ở đâu".

## Ba màn kẹt ở bot v1 → bot v2 (chỉ `three`; sim độc lập renderer nên canvas cho cùng kết quả)

Bot v2: đuổi theo boss bất kể chênh độ cao, teleport lại (tối đa 3) nếu boss không mất máu 30 s, móc (E) lên grapple phía trên ở màn dọc. Nguồn: `shots/T08/bot/fix.json`, `fix2.json`, `--max-sim-sec 900`.

| Màn | Kết quả | Tiến độ % (trước teleport) | Teleport | Sim s | three fps avg / min | draw calls max | tris max |
|---|---|---|---|---|---|---|---|
| autumn | **thắng** | 100 | không | 766 | 528.1 / 397.6 | 123 | 197682 |
| thunder_peak | **thắng** | 98.7 | không | 315.5 | 506.3 / 335.8 | 130 | 224370 |
| celestial_altar | **thắng** | 24.1 | 3 | 206.1 | 498.8 / 300 | 142 | 288622 |

→ Không màn nào crash, 0 console error trong 25 lượt, 11/11 màn bot thắng được (8 màn không cần teleport hoặc chỉ teleport vì bot quá đơn giản).

## Tối ưu điểm nóng

| Điểm nóng | Phát hiện bằng | Trước | Sau |
|---|---|---|---|
| Actors chỉ cull theo x. Ở màn dọc (autumn, thunder_peak) cả tháp nằm cùng dải x nên **mọi enemy của màn** được dựng mỗi frame (≈1 800 instance sphere/capsule, ×2 vì shadow pass) | `--profile` (gom triangle theo geometry/material từ `window.__three.scene`) | autumn **1 301 824** tris (vượt ngân sách 500k) | autumn **197 682** tris (−85 %); ms/frame avg 2.54 → 1.88 (bot cùng seed, `try3` → `sweep`) |

Các điểm khác đã kiểm, không cần sửa: draw calls tối đa 142 (< 300) ở mọi màn nhờ InstancedMesh; tris tối đa 406k (cavern) < 500k; shadow map 2048 một đèn; particle/projectile đã là pool instanced. Ms/frame p95 ≤ 3 ms ở 1080p → dư rất nhiều so với 16.7 ms (60 fps). Frame tệ nhất 20–32 ms là frame đầu khi gặp loại địch/hiệu ứng mới (compile shader), không phải tải đều.

## Bug cơ chế phát hiện được

Dấu vân tay sim giống nhau ở **11/11 màn** giữa three và canvas → **không có bug render nào chạm vào sim**. Các điểm dưới đây xảy ra y hệt ở cả hai renderer, nên là hành vi của sim gốc (không sửa, theo WORKER.md):

1. **`teleportToBoss` ở thunder_peak thả người chơi giữa không trung** (360, 320) với `onGround = true`, nhưng ở đó không có đảo (đảo di chuyển) → rơi xuống y ≈ 5 000–6 300 (`sweep.json`, `fix.json`). Chỉ ảnh hưởng phím debug V.
2. **cavern: người chơi lên tới y = −3 691**, tức gần 4 000 px trên đỉnh màn, ở lane 1, rồi không tiến được nữa (log `stuck at x=9933 y=-3691`). Có vẻ một cơ chế bay/móc ở cavern không bị giới hạn trần. Cần xem trong `reference/` có tái hiện bằng tay không.
3. **spring x ≈ 8 265, y ≈ 11:** bot đứng trên một chỗ cao và không đi tiếp/xuống được trong 15 s (cả hai renderer). Có thể chỉ là bot kém (không biết lùi + nhảy đúng lúc); chưa xác nhận là bug.
4. Bot ngây thơ chết sớm ở hầu hết màn (lần chết đầu 0.5–41 % tiến độ, winter chết 13 lần). Đó là độ khó, không phải bug.

## Three vs canvas

- Three nhanh hơn canvas 2D **3–4 lần** ở 1080p trên GPU này (469–535 vs 109–173 fps không vsync). Canvas 2D vẽ từng hình bằng CPU (gradient, path, `fillText`) mỗi frame; three đẩy ~130 draw call instanced cho GPU.
- Canvas nhanh nhất ở màn ít hiệu ứng nền (winter 173, sky_sanctuary 165), chậm nhất ở màn có nhiều lớp nền (blood_abyss 109).
- Cả hai đều > 60 fps với biên rất rộng; trên máy yếu hơn chênh lệch có thể khác (headless trên RTX 5070, không đo máy tầm trung thật).
