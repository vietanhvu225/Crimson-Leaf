# Crimson Leaf — Three.js port

Bản port Three.js của game Canvas 2D "Huyền Thoại Cứu Mẹ". Cùng một sim (`src/game/rules`, `src/game/engine`) chạy được bằng hai renderer: `three` (mới) và `canvas` (bản gốc, để đối chiếu).

Kết quả đánh giá: [`threejs-port/FINAL_REPORT.md`](threejs-port/FINAL_REPORT.md). Nhật ký đêm chạy: [`threejs-port/LOG.md`](threejs-port/LOG.md).

## Chạy thử trên máy khác

Cần **Node.js ≥ 22.18** (khuyến nghị 24 LTS) và Git.

```bash
git clone <repo> crimson-three
cd crimson-three
npm install
npm run dev
```

Mở http://localhost:3002/ (Vite dùng cổng khác nếu 3002 đang bận; xem dòng in ra terminal).

| URL | Xem gì |
|---|---|
| `/?renderer=three` | Bản Three.js (mặc định) |
| `/?renderer=canvas` | Bản Canvas 2D gốc, cùng sim |
| `/?ui=3d` | Title 3D (cổng torii chọn màn), số sát thương / bảng boss trong không gian 3D |
| `/?fx=low` | Tắt bloom + shadow (so hiệu năng trên máy yếu) |
| `/?debug=1` | Overlay fps · draw calls · triangles |
| `/?cam=flat` | Camera nhìn thẳng, không nghiêng |
| `/?stage=ocean_palace&loop=2&autostart=1` | Vào thẳng một màn (`spring` … `sky_sanctuary`), vòng 2 |

Các param ghép được với nhau, ví dụ `/?renderer=three&ui=3d&debug=1`. Trong trận: **F9** đổi three ↔ canvas, **M** tắt tiếng.

## Gates / công cụ (tuỳ chọn)

```bash
npm run typecheck
npm run test                        # rules + engine, chạy bằng Node (type stripping)
npm run build
npx playwright install chromium     # chỉ cần cho smoke/shot/bot/parity
npm run smoke                       # 11 màn × 2 renderer, ghi shots/smoke/result.json
npm run bot -- --stages spring      # bot chơi + đo ms/frame không vsync
npm install --prefix reference && npm run parity   # so sim với bản gốc trong reference/
```

Chromium headless được mở theo `chromiumLaunch` trong `threejs-port/PINNED_VERSIONS.json`, chốt cho máy chạy đêm (Windows, ANGLE D3D11, GPU thật). Nếu máy khác báo không có WebGL hoặc fps headless rất thấp, sửa `args` ở đó (ví dụ bỏ `--use-angle=d3d11`). Ngưỡng smoke (`scripts/smoke.config.json`: `minFps` 20, `minPixelStd` 8) cũng được calibrate trên máy đó.

## Cấu trúc

- `src/game/rules/`, `src/game/engine/`: sim (copy từ bản gốc, chỉ gỡ phần dính Canvas/DOM ở T01).
- `src/game/render/`: renderer Canvas 2D gốc.
- `src/game/render3d/`: renderer Three.js (`env/`, `actors/`, `vfx/`, `ui3d/`, `post.ts`).
- `src/ui/`: React UI (HUD DOM, title, modal); `GameView.tsx` chọn renderer.
- `scripts/`: `shot.mjs`, `bot.mjs`, `parity.mjs`, `harness.mjs`.
- `reference/`: game gốc, chỉ đọc.
- `shots/`: ảnh bằng chứng của từng task.
- `threejs-port/`: kế hoạch, spec, task, report.
