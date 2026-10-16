# Huyền Thoại Cứu Mẹ — Crimson Leaf: Mother's Oath

Game hành động platformer / hack-and-slash 2.5D chạy trên trình duyệt, lấy cảm hứng từ *The Legend of Kage*. Bạn vào vai một ninja đi cứu mẹ, vượt qua 11 màn chơi. Mỗi màn có một cơ chế di chuyển riêng và một trùm cuối.

Công nghệ: React 19 + TypeScript + Vite 8 + Tailwind 4. Đồ họa vẽ trên Canvas 2D, âm thanh tạo bằng Web Audio.

## Cài đặt và chạy

Cần Node.js 22 trở lên.

```bash
npm install
npm run dev
```

Sau đó mở http://localhost:3001.

| Lệnh | Tác dụng |
|---|---|
| `npm run dev` | Chạy dev server (cổng 3001) |
| `npm run build` | Build bản production vào `dist/` |
| `npm run preview` | Xem thử bản build |
| `npm run typecheck` | Kiểm tra kiểu với `tsc --noEmit` |
| `npm test` | Chạy unit test luật chơi |

Mẹo: mở `http://localhost:3001/?autostart=1` để bỏ qua màn hình tiêu đề.

## Điều khiển

### Di chuyển và chiến đấu

| Phím | Hành động |
|---|---|
| `A` / `D` hoặc `←` / `→` | Chạy trái / phải |
| `W` / `↑` / `Space` | Nhảy (nhảy nhiều lần trên không, bám và bật tường) |
| `S` / `↓` | Rơi xuyên qua bục; lặn hoặc bay xuống ở các màn bơi/bay |
| `Shift` | Lướt (air dash) |
| `E` | Dây móc (grapple) / tương tác cơ chế màn |
| `Q` | Đổi làn trục Z (tiền cảnh ↔ hậu cảnh) |
| `J` / chuột trái | Chém Kodachi. Chém đúng lúc phi tiêu bay tới sẽ **Parry** đánh bật nó lại |
| `K` / chuột phải | Phóng phi tiêu Kunai, ngắm 360° theo chuột |

### Hệ thống

| Phím | Hành động |
|---|---|
| `Enter` / `Space` | Bắt đầu game ở màn hình tiêu đề |
| `Esc` / `P` | Tạm dừng |
| `R` | Chơi lại màn hiện tại |
| `M` | Bật/tắt âm thanh |
| `G` | Mở bảng thiết kế game (GDD) |
| `1` – `9` | Nhảy nhanh tới màn 1–9 |
| `C` | Đổi hệ nguyên tố (Hỏa → Lôi → Băng) |
| `H` | Kích hoạt trạng thái Thức Tỉnh Huyết Ảnh |
| `U` `I` `O` `Y` `L` | Nâng cấp kỹ năng: Kiếm Kodachi / Phi tiêu / Khinh công / Phản đòn / Hộ thể linh hoàn |
| `B` | Bật/tắt bất tử *(cheat/debug)* |
| `V` | Dịch chuyển tới trùm *(debug)* |

Trên điện thoại, HUD hiện sẵn các nút cảm ứng.

## Lối chơi

- **11 màn**, mỗi màn chia thành 3 Kết Giới (cổng phong ấn). Kết Giới 2 và 3 có Hộ Pháp tinh anh, cuối màn là trùm. Máu của trùm và độ khó tăng dần qua từng màn, từ 500 HP ở màn 1 lên 7000 HP ở màn 11.
- **Vòng 1 – Cốt Truyện Chuẩn** và **Vòng 2 – Huyết Ảnh Chân Tuyến** (hardcore, khó hơn khoảng 35%). Chọn vòng ở màn hình tiêu đề.
- **Parry:** chém đúng lúc trong khoảng 0,15 giây để đánh bật phi tiêu của địch, kèm hit-stop.
- **Hệ nguyên tố:** Hỏa có sát thương cao nhất và thiêu đốt địch. Lôi gây sát thương khá và có thể làm choáng. Băng gây ít sát thương nhất nhưng có thể đóng băng và làm chậm địch.
- **Thức Tỉnh Huyết Ảnh:** tăng tốc độ trong 12 giây; phi tiêu bắn 3 tia xuyên thấu và có thêm sóng kiếm khí.
- **Bảo vật (relic):** hút máu, giáng sét ở combo thứ 5, mở rộng vùng Parry, tăng tốc độ chạy, kéo dài Huyết Ảnh, tự hút vật phẩm.

### Danh sách màn

| # | Màn | Cơ chế chính | Trùm |
|---|---|---|---|
| 1 | Rừng Đại Thụ Xuân | Bật thân cây, đệm trúc, gió xuân | Yêu Tăng Phun Lửa |
| 2 | Thủy Thành Đầm Sen | Lướt sóng, nhảy bè chiến thuyền | Giao Long Song Kiếm Khách |
| 3 | Tường Thành Phong Hỏa | Chạy dọc vách thành, chuông đồng | Đại Tướng Quân Thiết Chùy |
| 4 | Tuyết Sơn Cực Quang | Trượt tuyết đổ đèo, đài phóng băng | Hàn Băng Tuyết Yêu Vương |
| 5 | U Minh Tinh Thể Động | Phản trọng lực, cổng dịch chuyển | Vạn Độc Minh Vương |
| 6 | Đỉnh Lôi Phong | Đảo đá giữa trời, lôi cầu, lướt 8 hướng | Lôi Điện Pháp Vương |
| 7 | Huyết Hải Luyện Ngục | Đạp dung nham bật cao, nổ địa chấn | Huyết Ma Đại Tượng |
| 8 | Thiên Đàn Nguyệt Thực | Ngự kiếm lướt mây, trận Bát Quái | Huyết Y Thái Thượng Giáo Chủ |
| 9 | Thủy Cung Đại Chiến | Bơi 360° dưới đáy biển | Đông Hải Long Vương |
| 10 | Địa Tâm Hoang Cổ | Địa đạo dốc sâu, khoan địa tâm | Địa Tâm Cổ Long Vương |
| 11 | Cửu Thiên Không Chiến | Bay tự do (W/A/S/D), không chiến 360° | Thiên Bằng Kim Dực Vương |

## Cấu trúc mã nguồn

Code chia thành 4 lớp, phụ thuộc theo một chiều: `ui → render → engine → rules`. `rules` là hàm thuần. `engine` không import `render` hay `ui`, không vẽ gì; nó chỉ giữ tham chiếu `canvas`/`ctx` trong `World` để `render` dùng và để tính toạ độ chuột. Nhờ vậy có thể thay renderer (ví dụ sang Three.js) mà không phải đụng tới luật chơi hay mô phỏng.

```
src/
  App.tsx                     State machine: title / playing / paused / gameover
  main.tsx, index.css

  game/rules/                 LUẬT CHƠI — hàm thuần, không phụ thuộc gì, có unit test
    types.ts                  Kiểu chung: SeasonId, SkillBranchId, RelicId...
    stages.ts                 Cấu hình 11 màn (SEASONS), độ khó, cổng phong ấn, checkpoint
    physics.ts                Hằng số vật lý, tốc độ, hồ sơ di chuyển từng màn (bơi, bay, dốc)
    combat.ts                 Máu/nội lực/nộ, nhận sát thương, chém, phi tiêu, parry, nhặt đồ
    skills.ts                 5 nhánh kỹ năng, chi phí, chỉ số hiệu dụng
    elements.ts / relics.ts   Hệ nguyên tố và bảo vật
    enemies.ts / ambush.ts    Loại địch, phục kích kiểu Legend of Kage
    bossSkills.ts             Tuyệt kỹ của boss từng màn
    index.ts                  Gom export cho phần còn lại của game
    rules.test.ts             Unit test (node:test)

  game/engine/                TRẠNG THÁI + MÔ PHỎNG — không vẽ gì
    world.ts                  createWorld(): toàn bộ trạng thái mutable (player, địch, pool...)
    entities.ts               Kiểu entity: Platform, Enemy, Projectile, Particle...
    input.ts                  Bàn phím / chuột → world (attachInput)
    spawn.ts                  Pool spawner: particle, projectile, banner, sét, vật phẩm
    damage.ts                 Gây sát thương + hiệu ứng nguyên tố / relic khi trúng
    actions.ts                Thức tỉnh, nâng kỹ năng, đổi hệ, bất tử, dịch chuyển boss
    hud.ts                    Tiến độ màn, snapshot combat, đồng bộ HUD
    debug.ts                  window.render_game_to_text / advanceTime cho test tự động
    level/                    Dựng màn: reset, màn cuộn ngang (terrain, structures,
                              checkpoints, enemies) và màn cuộn dọc
    simulation/               stepSimulation(): điều phối 27 pha mỗi frame —
                              frameInput, movement, abilities, jumping, collision,
                              hazards, pickups, playerAttacks, ambush, enemies,
                              projectiles, outcome, camera...

  game/render/                VẼ CANVAS 2D — chỉ đọc world
    scene.ts                  renderScene(): thứ tự các lớp vẽ
    map/                      Nền trời theo màn (sky/*), cây, platform, hazard, cổng, nước
    characters/               Nhân vật chính, địch, trang bị theo loại địch, boss, đền mẹ
    items.ts / projectiles.ts / effects.ts
    palette.ts                Màu viền mực dùng chung

  game/audio.ts               Âm thanh tổng hợp bằng Web Audio

  ui/                         REACT
    GameCanvas.tsx            Host của engine: <canvas>, vòng rAF, nối props → engine
    GameHUD.tsx + hud/        HUD: máu, la bàn màn, combo, thanh boss, dock kỹ năng, nút cảm ứng
    TitleScreen.tsx, GameModals.tsx, GddModal.tsx, gddData.ts
```

Muốn chỉnh cân bằng game (tốc độ, máu trùm, độ khó...) thì sửa trong `src/game/rules/`, sau đó chạy `npm test`. Muốn sửa một cơ chế trong frame, xem thứ tự các pha ở `src/game/engine/simulation/index.ts`.
