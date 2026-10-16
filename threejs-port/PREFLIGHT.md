# PREFLIGHT — kết quả setup-pc2.mjs

Thời điểm: 2026-10-16T20:21:26.405Z · Máy: DESKTOP-DN87ESK · win32 10.0.26200 x64

| Mục | Kết quả | Chi tiết |
|---|---|---|
| Hệ điều hành | OK | win32 10.0.26200 x64, 18 luồng CPU, 31.4 GB RAM |
| Node.js | OK | v24.20.0 |
| npm | OK | v11.19.0 |
| Git | OK | git version 2.56.0.windows.2 |
| Git identity | OK | vietanhvu225 <vietanhvu225@users.noreply.github.com> |
| Git Bash | OK | D:\5_setup\Git\bin\bash.exe |
| timeout/sleep trong Git Bash | OK | timeout (GNU coreutils) 8.32 |
| Claude Code CLI | OK | 2.1.301 (Claude Code) |
| Claude Code đăng nhập + chạy headless | OK | claude -p chạy được (result: OK) |
| npm registry | OK | three@0.186.1, @types/three@0.186.0, playwright@1.64.1 |
| Dung lượng trống | OK | 445.3 GB ở D:\ (khuyến nghị >= 15 GB) |
| Chế độ ngủ khi cắm điện | OK | sleep: không bao giờ, hibernate: không bao giờ. |
| Skill dự án | OK | .claude/skills/crimson-threejs-ref |
| Copy reference/ + threejs-port/ + .claude/settings.json | OK | D:\2_dev\crimson-three |
| reference: npm install | OK | xong (package-lock.json mới được tạo và sẽ commit để chốt version) |
| reference: npm run typecheck | OK |  |
| reference: npm run test | OK |  |
| reference: npm run build | OK |  |
| Playwright 1.64.1 + Chromium | OK | Chromium đã tải về cache dùng chung của Playwright (%LOCALAPPDATA%\ms-playwright) |
| WebGL headless [headless-shell mặc định] | OK | ANGLE (Google, Vulkan 1.3.0 (SwiftShader Device (Subzero) (0x0000C0DE)), SwiftShader driver) \| ~17 fps (cảnh test 2000 tam giác, 1280×720) |
| WebGL headless [headless-shell + SwiftShader] | OK | ANGLE (Google, Vulkan 1.3.0 (SwiftShader Device (Subzero) (0x0000C0DE)), SwiftShader driver) \| ~26 fps (cảnh test 2000 tam giác, 1280×720) |
| WebGL headless [chromium new-headless + GPU (ANGLE D3D11)] | OK | ANGLE (NVIDIA, NVIDIA GeForce RTX 5070 (0x00002F04) Direct3D11 vs_5_0 ps_5_0, D3D11) \| ~142 fps (cảnh test 2000 tam giác, 1280×720) |
| WebGL headless [chromium new-headless + SwiftShader] | OK | ANGLE (Google, Vulkan 1.3.0 (SwiftShader Device (Subzero) (0x0000C0DE)), SwiftShader driver) \| ~17 fps (cảnh test 2000 tam giác, 1280×720) |
| Cấu hình Chromium headless khuyến nghị | OK | chromium new-headless + GPU (ANGLE D3D11): {"headless":true,"channel":"chromium","args":["--use-angle=d3d11","--enable-gpu","--ignore-gpu-blocklist"]} |

Version chốt và cấu hình Chromium: `threejs-port/PINNED_VERSIONS.json`.
