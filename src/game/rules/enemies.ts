// Enemy archetypes.

export type EnemyArchetype =
  | 'blue_kiter' // Lam Ảnh Nhẫn Giả (Phi tiêu 4 cánh)
  | 'red_ambusher' // Huyết Quỷ Ám Sát (Đoản đao chém gần)
  | 'fire_monk' // Hỏa Thiền Sư (Trượng phép cầu lửa)
  | 'bomb_alchemist' // Bộc Phá Nhẫn Giả (Ném bom khói & lựu đạn cầu vồng nổ AoE)
  | 'chain_kusarigama' // Xích Liêm Nhẫn Giả (Quăng liềm xích Kusarigama quay vòng boomerang)
  | 'claw_assassin' // Thiết Trảo Phi Hồ (Móng vuốt sắt Ưng Trảo bổ nhào từ không trung)
  | 'tessen_gale' // Thiết Phiến Phong Cơ (Quạt sắt phóng lốc xoáy lượn sóng)
  | 'thunder_puppeteer' // Lôi Tuyến Khôi Lỗi (Luân nhận bùa sét tự dẫn đường xuyên làn Z)
  | 'elite_guard'
  | 'boss';

export const ROAD_NINJA_ARCHETYPES: EnemyArchetype[] = [
  'blue_kiter',
  'red_ambusher',
  'fire_monk',
  'bomb_alchemist',
  'chain_kusarigama',
  'claw_assassin',
  'tessen_gale',
  'thunder_puppeteer',
];
