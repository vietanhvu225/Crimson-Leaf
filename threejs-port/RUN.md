# Chạy port Three.js qua đêm (PC2, Windows)

## 0. Cài những thứ script không tự cài được

Script setup chỉ **kiểm tra** những thứ dưới đây, không tự cài. Thiếu cái nào thì nó báo FAIL kèm cách sửa.

| Cần | Kiểm tra nhanh | Nếu thiếu |
|---|---|---|
| Node.js **≥ 22.18** (khuyến nghị 24 LTS) | `node --version` | https://nodejs.org. Node cũ hơn không chạy thẳng được file `.ts` bằng `node --test`. |
| Git for Windows (kèm **Git Bash**) | `git --version` | https://git-scm.com/download/win. Claude Code trên Windows chạy mọi lệnh qua Git Bash. |
| **Claude Code CLI** (khác với app Claude desktop) | `claude --version` | PowerShell: `irm https://claude.ai/install.ps1 \| iex` (hoặc `npm install -g @anthropic-ai/claude-code`). Mở terminal mới, chạy `claude` một lần để **đăng nhập**. |
| Mạng tới npm registry | `npm view vite version` | Kiểm tra proxy/firewall. |
| Máy không ngủ khi cắm điện | script tự đọc `powercfg` | PowerShell (admin): `powercfg /change standby-timeout-ac 0` và `powercfg /change hibernate-timeout-ac 0`. Tạm hoãn Windows Update cho đêm nay. |

**Playwright: không cần cài tay, và không cần Playwright MCP.** Kế hoạch dùng Playwright như một thư viện npm, gọi từ `scripts/shot.mjs`/`bot.mjs`. Script setup tự tải Chromium của Playwright và thử WebGL headless trên máy này.

## 1. Chạy script setup (một lần)

Mở **Git Bash** hoặc PowerShell ở thư mục game gốc (`D:\2_dev\Crimson-Leaf`):

```bash
node threejs-port/setup-pc2.mjs --check-only   # chỉ kiểm tra, không tạo gì (~1–3 phút, có gọi thử `claude -p` một lần)
node threejs-port/setup-pc2.mjs                # kiểm tra + dựng repo ở D:\2_dev\crimson-three (được phép có sẵn thư mục skills/)
```

Script làm theo thứ tự:
1. Kiểm tra Node, npm, Git, Git Bash (kèm `timeout`/`sleep` GNU), Claude Code CLI và đăng nhập (gọi thử `claude -p` đúng kiểu worker), mạng npm, ổ đĩa (≥ 15 GB), chế độ ngủ.
2. Tạo `D:\2_dev\crimson-three\`:
   - `reference/`: copy game gốc, bỏ `node_modules`, `dist`, `.git`, `threejs-port`.
   - `threejs-port/`: copy kế hoạch.
   - `.claude/settings.json`: allowlist quyền.
   - `.gitignore`.
3. `npm install` trong `reference/`, rồi chạy `typecheck`/`test`/`build` của bản gốc để chắc bản gốc xanh trên máy này. Nếu bản gốc đỏ thì T00 không bao giờ xanh được.
4. Chốt version `three`, `@types/three`, `playwright` vào `threejs-port/PINNED_VERSIONS.json`.
5. Tải Chromium của Playwright, thử 4 cấu hình headless (GPU thật / SwiftShader) để xem cấu hình nào có WebGL2 và đo fps thô, rồi ghi cấu hình tốt nhất vào `PINNED_VERSIONS.json`.
6. Ghi `threejs-port/PREFLIGHT.md`, rồi `git init -b main` và seed commit.

Thoát mã 0 nghĩa là sẵn sàng. Có FAIL thì sửa theo hướng dẫn in ra. Nếu FAIL xảy ra sau khi đã tạo thư mục đích thì xoá mọi thứ trong `D:\2_dev\crimson-three` **trừ thư mục `skills/`** (tức `reference/`, `threejs-port/`, `.claude/`, `.gitignore`, `.git/` nếu có) rồi chạy lại. Đổi chỗ đặt repo bằng `--target <đường dẫn>`. Bỏ qua bước gọi thử `claude -p` bằng `--skip-auth` (không khuyến nghị).

## 2. Khởi động orchestrator (tab Code trong app Claude desktop)

1. App Claude desktop → **Settings → Desktop app → General → bật "Keep computer awake"**. Cắm điện, không gập máy. Để app mở suốt đêm.
2. Tab **Code** → session mới → chọn thư mục `D:\2_dev\crimson-three`, chạy **local** trên máy này. **Không** bật tuỳ chọn chạy session trong worktree riêng (session isolation): orchestrator phải làm việc trên `main`.
3. Chọn chế độ quyền **Accept edits**. `.claude/settings.json` có `defaultMode: "dontAsk"`, nhưng tài liệu không nói rõ app desktop có dùng giá trị này hay không, nên kiểm ở bước 4.
4. **Thử quyền (2 phút, bắt buộc):** gõ vào session:
   ```
   Chạy đúng lệnh Bash này một lần và cho tôi biết kết quả: touch .permtest
   ```
   `touch` vô hại, không nằm trong allowlist, và không phải lệnh chỉ-đọc (lệnh chỉ-đọc như `whoami` được `dontAsk` cho qua nên không dùng để thử được).
   - **Bị từ chối ngay, không có hộp thoại** (file `.permtest` không được tạo): session đang ở `dontAsk`, đêm nay orchestrator không thể bị treo vì chờ duyệt.
   - **Hiện hộp thoại xin quyền:** bấm **Deny**. (Nếu lỡ tạo file thì xoá `.permtest` bằng tay.) Nghĩa là mọi lệnh ngoài allowlist sẽ đứng chờ bạn, nên phải ngồi canh hết T00 (bước 6).
5. Gõ:
   ```
   Đọc threejs-port/ORCHESTRATOR.md và bắt đầu. Chạy đến khi mọi task DONE hoặc BLOCKED.
   ```
6. **Ngồi xem đến hết T00** (khoảng 20–30 phút). Nếu orchestrator xin quyền một lệnh hợp lý thì bấm "always allow" (hoặc thêm vào `.claude/settings.json` rồi commit). Lệnh lạ thì Deny. Worker (`claude -p --permission-mode dontAsk`) không bao giờ hỏi: lệnh ngoài allowlist bị từ chối tự động và worker phải tìm cách khác.

Worker cần **Claude Code CLI** (`claude` trong terminal); app desktop không thay được phần này. Script setup đã gọi thử `claude -p --permission-mode dontAsk` để chắc chắn CLI chạy được.

**Usage:** 2 worker song song có thể chạm giới hạn 5 giờ của gói. Orchestrator tự `sleep` 30–60 phút rồi chạy tiếp.

**Không khởi động lại máy:** khởi động lại (kể cả do Windows Update) sẽ dừng mọi session. Tạm hoãn Windows Update cho đêm nay.

**Thư mục `skills/`** trong `crimson-three` là bản clone 2 repo skill gốc, chỉ để tham khảo; nó nằm trong `.gitignore` và không được nạp như skill. Skill thật mà worker dùng là `.claude/skills/crimson-threejs-ref/` (do setup chép từ `threejs-port/skills/`).

## 3. Sáng hôm sau xem gì

| File | Nội dung |
|---|---|
| `threejs-port/LOG.md` | Nhật ký orchestrator; phần đầu file là tóm tắt buổi sáng |
| `threejs-port/TASKS.md` | Trạng thái từng task |
| `threejs-port/FINAL_REPORT.md` | So sánh Canvas và Three.js: cơ chế, UI, hiệu ứng, hiệu năng |
| `threejs-port/reports/` | Báo cáo của từng worker |
| `threejs-port/PREFLIGHT.md` | Kết quả kiểm tra máy (để biết fps headless đo bằng GPU hay SwiftShader) |
| `shots/` | Ảnh chụp từng màn, từng giai đoạn |

Chơi thử (repo chính chưa có `node_modules`, vì worker cài trong worktree của nó):

```bash
cd /d/2_dev/crimson-three
npm install
npm run dev     # http://localhost:3002/?renderer=three   ·   đổi thành ?renderer=canvas để so với bản gốc
```

Nếu có worker bị giết giữa chừng, có thể còn `node.exe`/`chrome.exe` mồ côi chạy ngầm; `LOG.md` sẽ ghi lại. Mở Task Manager tắt chúng đi.

## Nếu bị dừng giữa chừng

Mở lại một session tab Code trên `crimson-three` (như bước 2) rồi gõ cùng câu trên. Orchestrator đọc `TASKS.md` và `LOG.md` để chạy tiếp từ chỗ dừng.
