---
name: crimson-threejs-ref
description: Three.js reference recipes for the Crimson Leaf port (shaders, post-processing, render budgets, procedural models, game feel, bot playtests, visual tests, debugging, HUD/UI). Use when implementing or reviewing anything under src/game/render3d/, scripts/shot.mjs, scripts/bot.mjs, or the 3D UI. Read-only guidance; threejs-port/GAME_SPEC.md always wins.
---

# Crimson Leaf: Three.js reference

Tài liệu tham khảo cho bản port Three.js. Đây **chỉ là tài liệu để đọc**: không có script để chạy, không có scaffold, không sinh asset.

## Thứ tự ưu tiên khi mâu thuẫn

`threejs-port/GAME_SPEC.md` > mục task trong `threejs-port/TASKS.md` > `threejs-port/WORKER.md` > các file trong `references/` của skill này.

Các file trong `references/` được viết cho một **game scaffold khác** (`src/game/Game.ts`, `src/utils/random.ts`, `createSeededRandom`, `update(delta, elapsed)`, `window.__THREE_GAME_TEST_HOOKS__`, director, evidence manifest, scorecard). **Repo này không có những thứ đó.** Lấy ý tưởng và code mẫu, rồi đặt vào kiến trúc của mình (`World` + `stepSimulation` + `render3d/`, hook `window.__game`).

## Luật cứng của dự án (đè lên mọi gợi ý trong references)

- **Không asset ngoài:** không GLB/FBX/glTF/Draco, không ảnh/texture tải về, không CDN, không font mới. Geometry procedural, texture chỉ dùng `CanvasTexture` hoặc màu thuần. Bỏ qua mọi đoạn nói về imported assets, generators (`threejs-3d-generator`, `threejs-image-generator`, `threejs-audio-generator`), Tripo/Gemini/ElevenLabs, API key.
- **Không physics engine:** không Rapier/cannon-es/ammo. Sim đã có physics riêng và phải giữ nguyên hành vi. Bỏ qua `physics: { engine: 'rapier' … }` trong debug-playbook.
- **Không React Three Fiber.** Chỉ `three` và `three/examples/jsm` (alias `three/addons/*` dùng được). Version `three` là bản chốt trong `threejs-port/PINNED_VERSIONS.json`, không phải `^0.184` như ghi trong references. Nếu API trong recipe khác với version đang dùng thì theo version đang dùng.
- **RNG (quan trọng cho parity):**
  - `render3d/` và VFX **không bao giờ** được gọi `world.rng()`. Mỗi lần gọi sẽ đổi chuỗi random của sim và làm hỏng parity với bản gốc.
  - Hiệu ứng thuần hình ảnh dùng RNG riêng của renderer (ví dụ một `mulberry32` tạo trong `render3d/`) hoặc `Math.random`.
  - Lời khuyên "route all randomness through the seeded RNG" trong game-feel.md chỉ áp dụng cho RNG riêng của renderer.
- **Hit-stop, screen shake, thời gian hiệu ứng** lấy từ trạng thái sim (`world.hitstopTimer`, shake trong `World`…), không tự đặt timer riêng (GAME_SPEC § Hiệu ứng, T05).
- **Playwright** là thư viện npm `playwright` (không phải `@playwright/test`, không `pngjs`, không MCP). Launch bằng `PINNED_VERSIONS.json → chromiumLaunch`. Các ví dụ trong playtest-bot.md và visual-test-harness.md cần chuyển sang API của `playwright` và hook `window.__game`.
- **Không quy trình "scorecard / lead / delegate / evidence manifest / keep going until ≥2".** Tiêu chí đạt là mục "Tiêu chí đạt" của task. Time box theo WORKER.md.
- **Không chạy Python, `uv`, hay script shell nào** từ các repo skill gốc.

## Đọc file nào cho việc gì

| Việc | File |
|---|---|
| Renderer setup, tone mapping, env map không cần HDR, material PBR/toon, `onBeforeCompile`, sky dome gradient, dissolve, wind sway, chuỗi EffectComposer → OutputPass | `references/shader-cookbook.md` |
| Ngân sách draw call/triangle, instancing, merge geometry tĩnh, khi nào shader đáng làm, `renderer.info` | `references/technical-art.md` |
| Dựng model procedural (ghép primitive), ánh sáng, fog, thứ tự render pipeline, post | `references/authoring-recipes.md` |
| Screen shake kiểu trauma, hit-stop, squash & stretch, FOV punch, phản hồi khi trúng đòn | `references/game-feel.md` |
| Bot playtest (T08): softlock detection, metric, seed; lưu ý SwiftShader cho fps headless | `references/playtest-bot.md` |
| So ảnh / visual regression, mask vùng nhiễu, baseline | `references/visual-test-harness.md` |
| Debug thứ tự kiểm tra (màn đen, mất mesh, color space, rò rỉ dispose), profiling | `references/debug-playbook.md` |
| HUD, menu, số cố định độ rộng, touch input, safe area, responsive (T07) | `references/ui-patterns.md` |

Những gì references **không có**, phải tự làm:
- Bloom chọn lọc theo layer: dùng `UnrealBloomPass` + layers / darken-non-bloomed, hoặc bloom theo ngưỡng với emissive cao chỉ trên vật cần sáng.
- Shader nước và dung nham: sóng + fresnel, xem T03.
- Thanh máu world-space và chọn màn bằng raycast: xem T07.

## Nguồn

Các file trong `references/` được chép nguyên văn từ [majidmanzarpour/threejs-game-skills](https://github.com/majidmanzarpour/threejs-game-skills), commit `8286774` (giấy phép MIT, xem `LICENSE-threejs-game-skills`). Repo [mintdotgg/mint-threejs-skills](https://github.com/mintdotgg/mint-threejs-skills) (`de7af44`) đã được xem xét nhưng không dùng: nó là bản fork cũ hơn của các file trên, gắn với Mint MCP/CDN, và có chính sách bắt người dùng duyệt trước khi chạy QA, không hợp với đêm chạy tự động.
