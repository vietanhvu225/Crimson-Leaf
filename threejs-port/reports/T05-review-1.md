# T05 — review sau lần thử 1 (orchestrator)

Gates xanh (typecheck, test 30/30, build, smoke 22/22). Bloom chọn lọc, parry, sét, Huyết Ảnh, particle, bench: đạt. **Chưa merge vì một lỗi chỉ lộ ra khi chạy chung với env T03/T06 + actors T04.**

Branch này đã được orchestrator merge main (T03 env, T04 actors, T06 env 5–11). Xung đột `MODULES` trong `render3d/scene.ts` và danh sách script trong `scripts/shot.mjs` đã giải quyết (giữ cả hai bên). Đừng đảo lại.

## Lỗi cần sửa (bắt buộc)
1. **Toàn cảnh bị mờ sữa / nhạt khi `fx=high` chạy cùng env thật.** So sánh cùng seed 3, `--stage winter --script combat`:
   - `shots/T05/review1/winter-combat-fxhigh.png`: platform, trời, cực quang nhạt và trắng đục, tương phản thấp, như có lớp sương phủ cả màn.
   - `shots/T05/review1/winter-combat-fxlow.png`: màu đúng như trước T05 (gần với ảnh T04/T03).
   - `shots/T05/review1/spring-parry-integrated.png`: frame parry gần như trắng toàn màn (chớp hit-stop + bloom cộng dồn), nhân vật không đọc được.
   Ảnh `shots/T05/*-weather.png` của bạn chụp trên env placeholder nên không thấy lỗi này.
   Nghi vấn (bạn tự xác minh): chuyển màu/tone mapping bị áp hai lần trong đường final composer (RenderPass vào target HalfFloat → OutputPass) với các material của env tự xử lý colorspace (sky dome `ShaderMaterial` của T03 "không tone mapping, chỉ chuyển colorspace", thẻ `halo`/`skyHalo` additive, `ray`, mặt nước shader); hoặc god rays/vignette/composite cộng thêm sáng; hoặc bloom bắt cả thẻ additive của env. Dùng `?fxdebug=bloom` và so từng pass.
   **Kỳ vọng:** với `fx=high`, màu nền/platform/nhân vật khớp `fx=low` (sai khác chỉ ở chỗ phát sáng: tia lửa, sét, aura, projectile). Frame parry vẫn đọc được nhân vật + địch (chớp hit-stop ngắn, không trắng cả màn).
2. Chụp lại bằng chứng **trên branch đã merge** (env thật): ít nhất `winter-combat` fx=high vs fx=low (seed 3), `spring-parry`, `spring-awaken`, `ocean_palace-weather`, một màn tối (`cavern` hoặc `blood_abyss`). Cập nhật bảng fps/draw calls nếu đổi.

## Lưu ý phụ (sửa nếu rẻ, không bắt buộc)
- Debuff đóng băng có thể bị vẽ hai lần (T04 actors vẽ khối băng trên địch; T05 vfx cũng vẽ). Giữ một bên, ghi vào report.
- `enemyHeight` trong vfx: T04 đã có kích thước thật; dùng chung nếu actors export ra được, không thì ghi lại.

Time box lần này: ~45 phút. Chỉ sửa trong `render3d/vfx/`, `render3d/post.ts` (và đúng chỗ cần trong `scene.ts`/`module.ts` nếu bắt buộc). Không sửa `env/` hay `actors/` trừ khi lỗi nằm hẳn ở đó; nếu vậy ghi rõ lý do.
