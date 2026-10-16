# T00 — review sau lần thử 1 (orchestrator)

Lần thử 1 BLOCKED do môi trường, không phải lỗi của worker: `claude -p` trên máy này mặc định chỉ có tool PowerShell, còn allowlist chỉ có luật `Bash(...)`.

Đã sửa: worker giờ được chạy với `CLAUDE_CODE_USE_POWERSHELL_TOOL=0` và `CLAUDE_CODE_GIT_BASH_PATH`, nên bạn có tool **Bash** (Git Bash). Đã kiểm tra: `node --version` chạy được ở chế độ dontAsk. Dùng Bash cho mọi lệnh, đúng cú pháp bash như WORKER.md.

Việc cần làm: làm lại toàn bộ T00 theo TASKS.md. Các file chưa commit còn lại trong worktree (`package.json`, `tsconfig.json`, `vite.config.ts`, `scripts/copy-reference.mjs`) là bản nháp của lần 1, dùng lại hoặc sửa tuỳ ý. Viết lại `threejs-port/reports/T00.md` (Attempt: 1, ghi chú "chạy lại sau sửa môi trường").
