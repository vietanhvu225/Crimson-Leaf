import type { GameLoopRoute, SeasonId, StageMechanicId } from './types.ts';

export interface SeasonConfig {
  id: SeasonId;
  index: number;
  vietnameseTitle: string;
  englishTitle: string;
  subtitle: string;
  loop2Subtitle: string;
  mechanicId: StageMechanicId;
  mechanicName: string;
  mechanicDesc: string;
  movementStyleName: string;
  grappleItemName: string;
  bossSkillName: string;
  scrollMode: 'horizontal' | 'vertical';
  waterLevelY: number | null;
  visibilityRadius: number | null;
  stageLength: number;
  sectors: [string, string, string];
  bossName: string;
  loop2BossName: string;
  bossMaxHp: number;
  skyTop: string;
  skyBottom: string;
  loop2SkyTop: string;
  loop2SkyBottom: string;
  accentColor: string;
  particleType: 'petals' | 'fireflies' | 'maple' | 'snow' | 'embers' | 'bubbles';
}

export const SEASONS: Record<SeasonId, SeasonConfig> = {
  spring: {
    id: 'spring',
    index: 0,
    vietnameseTitle: 'Màn 1: Rừng Đại Thụ Xuân',
    englishTitle: 'Stage I: Giant Sakura Canopy',
    subtitle: 'Rừng Đại Thụ Anh Đào — Bật thân cây cổ thụ, Đệm trúc & Gió xuân',
    loop2Subtitle: 'Rừng Xuân Bốc Cháy — Biển lửa Huyết Y Giáo',
    mechanicId: 'updraft_bamboo',
    mechanicName: 'Khinh Công Đại Thụ 3 Tầng & Móc Chuông Gió Anh Đào [E]',
    mechanicDesc:
      'Bám & bật nhảy trực tiếp trên mọi thân đại thụ · Đệm trúc, gió lốc & Chuông Gió Anh Đào nâng lên 3 tầng tán cây',
    movementStyleName: 'Khinh Công Bật Thân Cây & Đệm Trúc',
    grappleItemName: 'Chuông Gió Anh Đào',
    bossSkillName: 'Hỏa Long Liên Hoàn Pháo & Cột Lửa Địa Ngục',
    scrollMode: 'horizontal',
    waterLevelY: null,
    visibilityRadius: null,
    stageLength: 36000,
    sectors: [
      'Khu 1: Bìa Rừng Đại Thụ Anh Đào',
      'Khu 2: Tán Cây 3 Tầng & Cột Gió Lốc',
      'Khu 3: Cổ Tự Hỏa Thiền Sư',
    ],
    bossName: 'Yêu Tăng Phun Lửa (Hỏa Thiền Sư)',
    loop2BossName: 'Huyết Hỏa Yêu Tăng (Cuồng Nộ)',
    bossMaxHp: 500,
    skyTop: '#080d1a',
    skyBottom: '#162436',
    loop2SkyTop: '#1f0808',
    loop2SkyBottom: '#3d120a',
    accentColor: '#f43f5e',
    particleType: 'petals',
  },
  summer: {
    id: 'summer',
    index: 1,
    vietnameseTitle: 'Màn 2: Thủy Thành Đầm Sen',
    englishTitle: 'Stage II: Lotus Moat Archipelago',
    subtitle: 'Chiến Thuyền Trên Sông — Thủy thượng phiêu lướt sóng & Nhảy bè chiến thuyền',
    loop2Subtitle: 'Hào Nước Đóng Băng — Hàn Băng Tử Đầm',
    mechanicId: 'tidal_rafts',
    mechanicName: 'Thủy Thượng Phiêu Trên Sông & Chiến Thuyền Di Động (Không Bờ Đất)',
    mechanicDesc:
      'Không có mặt đất cố định — Lướt nhanh trên mặt sông bằng Thủy Thượng Phiêu, nhảy giữa Chiến Thuyền & móc Phù Tiêu Hồ Lô [E]',
    movementStyleName: 'Thủy Thượng Phiêu & Nhảy Chiến Thuyền',
    grappleItemName: 'Phù Tiêu Hồ Lô Đồng',
    bossSkillName: 'Giao Long Toàn Phong Trảm & Sóng Kiếm Thủy Triều',
    scrollMode: 'horizontal',
    waterLevelY: 495,
    visibilityRadius: null,
    stageLength: 38000,
    sectors: [
      'Khu 1: Đội Chiến Thuyền Đầm Sen',
      'Khu 2: Sông Rộng Thủy Thượng Phiêu & Vòi Rồng',
      'Khu 3: Thủy Quan Đại Môn',
    ],
    bossName: 'Giao Long Song Kiếm Khách (Thủy Quan Vệ)',
    loop2BossName: 'Hàn Băng Giao Long Kiếm Khách',
    bossMaxHp: 700,
    skyTop: '#06151f',
    skyBottom: '#0f3138',
    loop2SkyTop: '#071b2e',
    loop2SkyBottom: '#163d5c',
    accentColor: '#06b6d4',
    particleType: 'fireflies',
  },
  autumn: {
    id: 'autumn',
    index: 2,
    vietnameseTitle: 'Màn 3: Tường Thành Phong Hỏa',
    englishTitle: 'Stage III: Fortress Rampart Ascent',
    subtitle: 'Leo Tháp Tường Thành — Phi diêm tẩu bích chạy dọc vách thành & Chuông Đồng',
    loop2Subtitle: 'Tường Thành Sụp Đổ — Huyết Phong Thiết Thành',
    mechanicId: 'crosswind_towers',
    mechanicName: 'Phi Diêm Tẩu Bích (Chạy Thẳng Đứng Vách Thành) & Móc Chuông Đồng [E]',
    mechanicDesc:
      'Áp sát vách thành giữ [W] để chạy thẳng đứng lên tường · Móc Linh Chung Đồng Cổ [E] vượt bánh răng cơ quan',
    movementStyleName: 'Phi Diêm Tẩu Bích (Chạy Dọc Tường) & Cưỡi Gió',
    grappleItemName: 'Linh Chung Đồng Cổ',
    bossSkillName: 'Thiết Chùy Chấn Địa & Mưa Tên Phong Hỏa',
    scrollMode: 'vertical',
    waterLevelY: null,
    visibilityRadius: null,
    stageLength: 28000,
    sectors: [
      'Tầng 1: Chân Thành Đá Tảng & Cờ Chiến',
      'Tầng 2: Tháp Bánh Răng Cơ Quan',
      'Tầng 3: Đỉnh Thiên Thủ Các',
    ],
    bossName: 'Đại Tướng Quân Thiết Chùy',
    loop2BossName: 'Ma Tướng Thiết Giáp Huyết Y',
    bossMaxHp: 1000,
    skyTop: '#1f0d07',
    skyBottom: '#4a1c0d',
    loop2SkyTop: '#290611',
    loop2SkyBottom: '#590d22',
    accentColor: '#f97316',
    particleType: 'maple',
  },
  winter: {
    id: 'winter',
    index: 3,
    vietnameseTitle: 'Màn 4: Tuyết Sơn Cực Quang',
    englishTitle: 'Stage IV: Aurora Glacier Sanctum',
    subtitle: 'Đổ Đèo Trượt Tuyết — Hàn Băng Xung Kích húc văng địch & Đài phóng băng',
    loop2Subtitle: 'Huyết Điện Tối Thượng — Phá giải Phong Ấn Cổ',
    mechanicId: 'ice_icicles',
    mechanicName: 'Đổ Đèo Trượt Băng Tốc Độ Cao (x1.58) & Hàn Băng Hộ Giáp Húc Địch',
    mechanicDesc:
      'Đường trượt băng dốc bậc thang liên hoàn · Khi trượt nhanh tự bật Hàn Băng Hộ Giáp húc văng địch & phóng qua vực băng',
    movementStyleName: 'Đổ Đèo Trượt Tuyết & Hàn Băng Húc Địch',
    grappleItemName: 'Tinh Thể Băng Tinh',
    bossSkillName: 'Băng Tinh Bát Phương & Tuyết Ảnh Dịch Chuyển',
    scrollMode: 'horizontal',
    waterLevelY: null,
    visibilityRadius: 430,
    stageLength: 40000,
    sectors: [
      'Khu 1: Đèo Trượt Tuyết Cực Quang',
      'Khu 2: Đài Phóng Băng & Băng Nhũ Rơi',
      'Khu 3: Cung Điện Hàn Băng',
    ],
    bossName: 'Hàn Băng Tuyết Yêu Vương (Băng Ma Nữ)',
    loop2BossName: 'Cửu U Hàn Băng Giáo Chủ',
    bossMaxHp: 1400,
    skyTop: '#090d16',
    skyBottom: '#1e293b',
    loop2SkyTop: '#1a051d',
    loop2SkyBottom: '#3b0736',
    accentColor: '#38bdf8',
    particleType: 'snow',
  },
  cavern: {
    id: 'cavern',
    index: 4,
    vietnameseTitle: 'Màn 5: U Minh Tinh Thể Động',
    englishTitle: 'Stage V: Subterranean Crystal Cavern',
    subtitle: 'Hang Tinh Thể Phản Trọng Lực — Bay lơ lửng lên trần hang & Cổng dịch chuyển',
    loop2Subtitle: 'Huyết Tinh Địa Ngục — Dòng sông kịch độc Huyết Y',
    mechanicId: 'crystal_geysers',
    mechanicName: 'Từ Trường Phản Trọng Lực (Giữ W Bay Lên Trần Hang) & Móc Thạch Anh [E]',
    mechanicDesc:
      'Giữ [W/Space] kích hoạt Từ Trường Tinh Thể bay ngược lên đường trần hang thạch nhũ · Cổng Tinh Thể dịch chuyển tức thời',
    movementStyleName: 'Bay Phản Trọng Lực Trần Hang & Móc Thạch Anh',
    grappleItemName: 'Cụm Thạch Anh Tím',
    bossSkillName: 'Mưa Độc Bào Tử & Song Câu Truy Hồn',
    scrollMode: 'horizontal',
    waterLevelY: 535,
    visibilityRadius: 490,
    stageLength: 42000,
    sectors: [
      'Khu 1: Đường Trần Thạch Nhũ Phản Trọng Lực',
      'Khu 2: Mê Cung Cổng Tinh Thể & Suối Độc',
      'Khu 3: Tế Đàn Vạn Độc Vương',
    ],
    bossName: 'Vạn Độc Minh Vương (Chúa Tể Hang Ngầm)',
    loop2BossName: 'Huyết Độc Ngô Công Chúa (Thức Tỉnh)',
    bossMaxHp: 1900,
    skyTop: '#0b0518',
    skyBottom: '#1e1035',
    loop2SkyTop: '#240515',
    loop2SkyBottom: '#4c0a28',
    accentColor: '#a855f7',
    particleType: 'fireflies',
  },
  thunder_peak: {
    id: 'thunder_peak',
    index: 5,
    vietnameseTitle: 'Màn 6: Đỉnh Lôi Phong',
    englishTitle: 'Stage VI: Thunder-Shattered Sky Spire',
    subtitle: 'Chuỗi Đảo Đá Giữa Trời — Móc Lôi Cầu nổ sét liên hoàn & Lướt 8 hướng',
    loop2Subtitle: 'Cuồng Lôi Hủy Diệt — Đỉnh Trời Sụp Đổ',
    mechanicId: 'lightning_storm',
    mechanicName: 'Móc Lôi Cầu Nổ Sét Liên Hoàn [E] & Ngự Lôi Thiểm Đạp 8 Hướng',
    mechanicDesc:
      'Không có vách thành hai bên — Búng mình liên hoàn qua chuỗi Lôi Cầu [E] gây nổ điện AoE & hồi ngay Lướt 8 Hướng [Shift]',
    movementStyleName: 'Búng Lôi Cầu Nổ Sét [E] & Lướt 8 Hướng',
    grappleItemName: 'Lôi Cầu Tụ Điện',
    bossSkillName: 'Bát Trống Thiên Lôi & Lưới Điện Truy Kích',
    scrollMode: 'vertical',
    waterLevelY: null,
    visibilityRadius: null,
    stageLength: 30000,
    sectors: [
      'Tầng 1: Mạng Lưới Lôi Cầu & Đảo Phù Không',
      'Tầng 2: Đài Phóng Bát Quái Bão Sấm',
      'Tầng 3: Điện Thờ Lôi Thần',
    ],
    bossName: 'Lôi Điện Pháp Vương (Bát Trống Thiên Lôi)',
    loop2BossName: 'Cuồng Lôi Thần Tướng Huyết Y',
    bossMaxHp: 2500,
    skyTop: '#081226',
    skyBottom: '#1c315e',
    loop2SkyTop: '#1d1138',
    loop2SkyBottom: '#3c1e70',
    accentColor: '#eab308',
    particleType: 'embers',
  },
  blood_abyss: {
    id: 'blood_abyss',
    index: 6,
    vietnameseTitle: 'Màn 7: Huyết Hải Luyện Ngục',
    englishTitle: 'Stage VII: Molten Forge Abyss',
    subtitle: 'Biển Dung Nham Sụp Đổ — Đạp dung nham bật cao & Hỏa Chấn Thiên nổ địa chấn [S]',
    loop2Subtitle: 'Đại Lò Hủy Diệt — Nơi rèn Binh Khí Tà Thần',
    mechanicId: 'lava_collapse',
    mechanicName: 'Hỏa Chấn Thiên Nổ Địa Chấn [S] & Nhiệt Phản Đẩy Dung Nham',
    mechanicDesc:
      'Toàn bộ cầu sắt đều sập — Chạm dung nham được Nhiệt Khí đẩy vọt lên cao, nhấn [S] giáng Hỏa Chấn Thiên nổ tung địch xung quanh!',
    movementStyleName: 'Đạp Dung Nham Bật Cao & Giáng Nổ Hỏa Chấn [S]',
    grappleItemName: 'Lồng Xích Lõi Dung Nham',
    bossSkillName: 'Đập Đe Thiên Thạch & Xích Lửa Quét Sàn',
    scrollMode: 'horizontal',
    waterLevelY: 520,
    visibilityRadius: null,
    stageLength: 45000,
    sectors: [
      'Khu 1: Cầu Sắt Nung Đỏ Sập Liên Hoàn',
      'Khu 2: Biển Dung Nham Phản Đẩy & Bệ Đe',
      'Khu 3: Huyết Thiết Đại Điện',
    ],
    bossName: 'Huyết Ma Đại Tượng (Viêm Ma Thợ Rèn)',
    loop2BossName: 'Viêm Ma Thần Tượng Tối Thượng',
    bossMaxHp: 3200,
    skyTop: '#1c0505',
    skyBottom: '#450a0a',
    loop2SkyTop: '#2e0404',
    loop2SkyBottom: '#690808',
    accentColor: '#ef4444',
    particleType: 'embers',
  },
  celestial_altar: {
    id: 'celestial_altar',
    index: 7,
    vietnameseTitle: 'Màn 8: Thiên Đàn Nguyệt Thực',
    englishTitle: 'Stage VIII: Cosmic Eclipse Sanctum',
    subtitle: 'Ngự Kiếm Phi Tiên Giữa Tinh Hà — Cưỡi Tiên Kiếm lướt mây & Trận Bát Quái',
    loop2Subtitle: 'Chân Huyết Thiên Đàn — Giải cứu Mẹ khỏi Tà Thần Huyết Y',
    mechanicId: 'bagua_eclipse',
    mechanicName: 'Ngự Kiếm Phi Tiên (Cưỡi Tiên Kiếm Giữa Không Trung) & Tốc Biến Tinh Tú',
    mechanicDesc:
      'Cưỡi Bạch Ngọc Tiên Kiếm lướt giữa bầu trời sao (+3 bậc Đạp Vân) · Đài Bát Quái phóng xuyên tinh hà & móc Ngọc Bội Tiên Giới [E]',
    movementStyleName: 'Ngự Kiếm Phi Tiên & Dịch Chuyển Bát Quái',
    grappleItemName: 'Ngọc Bội Tiên Giới',
    bossSkillName: 'Vạn Kiếm Quy Tông & Nhật Nguyệt Luân Hồi',
    scrollMode: 'horizontal',
    waterLevelY: null,
    visibilityRadius: null,
    stageLength: 48000,
    sectors: [
      'Khu 1: Tinh Lộ Ngự Kiếm Phi Tiên',
      'Khu 2: Đại Trận Bát Quái Tinh Tú',
      'Khu 3: Đỉnh Thiên Đàn Nguyệt Thực',
    ],
    bossName: 'Huyết Y Thái Thượng Giáo Chủ',
    loop2BossName: 'Huyết Nguyệt Cổ Thần (Chân Thân)',
    bossMaxHp: 4000,
    skyTop: '#050814',
    skyBottom: '#1e1b4b',
    loop2SkyTop: '#1f0318',
    loop2SkyBottom: '#4a044e',
    accentColor: '#f43f5e',
    particleType: 'petals',
  },
  ocean_palace: {
    id: 'ocean_palace',
    index: 8,
    vietnameseTitle: 'Màn 9: Thủy Cung Đại Chiến',
    englishTitle: 'Stage IX: Abyssal Dragon Palace',
    subtitle: 'Bơi Thủy Chiến 360° Dưới Đáy Biển — Bơi 4 hướng tự do, Lướt Thủy Lôi & Trai Ngọc',
    loop2Subtitle: 'Huyết Hải Long Cung — Vực Sâu Áp Suất Tối Thượng',
    mechanicId: 'underwater_combat',
    mechanicName: 'Bơi Thủy Chiến Tự Do 4 Hướng [W/A/S/D] & Móc Trai Ngọc Dạ Quang [E]',
    mechanicDesc:
      'Không đi bộ hay nhảy — Bơi lội tự do 360° trong lòng biển [W/A/S/D], Lướt Thủy Lôi xoáy nước [Shift] & Móc Trai Ngọc Dạ Quang [E]',
    movementStyleName: 'Bơi Thủy Chiến Tự Do 360° & Lướt Thủy Lôi',
    grappleItemName: 'Trai Ngọc Dạ Quang',
    bossSkillName: 'Hải Vương Tam Xoa Kích & Thủy Triều Xoáy Nước',
    scrollMode: 'horizontal',
    waterLevelY: 36,
    visibilityRadius: null,
    stageLength: 44000,
    sectors: [
      'Khu 1: Rạn San Hô & Bơi Thủy Chiến 360°',
      'Khu 2: Hải Lưu Xoáy Nước & Thủy Quân Long Cung',
      'Khu 3: Đại Điện Đông Hải Long Vương',
    ],
    bossName: 'Đông Hải Long Vương (Hải Thần Tam Xoa Kích)',
    loop2BossName: 'Huyết Hải Ma Long Vương (Chúa Tể Vực Thẳm)',
    bossMaxHp: 4900,
    skyTop: '#021024',
    skyBottom: '#064e63',
    loop2SkyTop: '#160624',
    loop2SkyBottom: '#3b0a45',
    accentColor: '#06b6d4',
    particleType: 'bubbles',
  },
  earth_core: {
    id: 'earth_core',
    index: 9,
    vietnameseTitle: 'Màn 10: Địa Tâm Hoang Cổ',
    englishTitle: 'Stage X: Primordial Earth-Core Descent',
    subtitle: 'Đi Xuyên Xuống Lòng Đất — Địa Đạo Dốc Sâu, Khoan Địa Tâm [S] & Ròng Rọc Mỏ Cổ',
    loop2Subtitle: 'Cửu U Long Mạch — Vực Thẳm Tâm Trái Đất Thức Tỉnh',
    mechanicId: 'earth_core_descent',
    mechanicName: 'Địa Đạo Dốc Xuyên Lòng Đất & Mũi Khoan Địa Tâm [S/Shift]',
    mechanicDesc:
      'Bản đồ dốc sâu liên tục xuyên thẳng xuống Địa Tâm (-7.500m) · Lao dốc tăng tốc, nhấn [S/Shift] bật Mũi Khoan Địa Tâm phá đá & Móc Ròng Rọc Mỏ Cổ [E]',
    movementStyleName: 'Đổ Dốc Xuyên Lòng Đất & Khoan Địa Tâm [S]',
    grappleItemName: 'Ròng Rọc Mỏ Địa Tâm',
    bossSkillName: 'Địa Long Phá Thạch & Sóng Địa Chấn Hoàng Kim',
    scrollMode: 'horizontal',
    waterLevelY: null,
    visibilityRadius: null,
    stageLength: 42000,
    sectors: [
      'Tầng 1: Giếng Mỏ Cổ & Dốc Đá Trầm Tích (-1.500m)',
      'Tầng 2: Hẻm Núi Hóa Thạch & Mạch Vàng Nóng Chảy (-4.500m)',
      'Tầng 3: Lõi Địa Tâm Hoàng Kim & Long Mạch (-7.500m)',
    ],
    bossName: 'Địa Tâm Cổ Long Vương (Hoàng Kim Địa Tạng)',
    loop2BossName: 'Cửu U Thôn Thiên Địa Long (Chúa Tể Lòng Đất)',
    bossMaxHp: 5900,
    skyTop: '#160d06',
    skyBottom: '#361f0d',
    loop2SkyTop: '#240b05',
    loop2SkyBottom: '#4d1908',
    accentColor: '#f59e0b',
    particleType: 'embers',
  },
  sky_sanctuary: {
    id: 'sky_sanctuary',
    index: 10,
    vietnameseTitle: 'Màn 11: Cửu Thiên Không Chiến',
    englishTitle: 'Stage XI: Nine-Heavens Aerial Sanctuary',
    subtitle:
      'Bay Lơ Lửng & Không Chiến 360° Giữa Trời Mây — Phong Dực Phi Hành [W/A/S/D] & Phong Linh Luân [E]',
    loop2Subtitle: 'Huyết Vũ Thiên Khung — Đại Chiến Giữa Tầng Mây Đỏ',
    mechanicId: 'aerial_levitation',
    mechanicName: 'Bay Lơ Lửng Tự Do [W/A/S/D] & Phong Dực Xung Kích Không Chiến [Shift]',
    mechanicDesc:
      'Không có mặt đất, không đi bộ hay nhảy — Khoác Thần Dực bay lơ lửng tự do 360° giữa bầu trời [W/A/S/D], Xung Kích Xé Gió [Shift] & Móc Phong Linh Luân [E]',
    movementStyleName: 'Bay Lơ Lửng 360° & Không Chiến Giữa Trời',
    grappleItemName: 'Phong Linh Thiên Luân',
    bossSkillName: 'Thiên Bằng Vũ Nhận & Đại Phong Bão Cửu Thiên',
    scrollMode: 'horizontal',
    waterLevelY: null,
    visibilityRadius: null,
    stageLength: 45000,
    sectors: [
      'Không Vực 1: Biển Mây Hoàng Kim & Đàn Hạc Trắng',
      'Không Vực 2: Luồng Gió Xoáy Cửu Thiên & Chiến Thuyền Bay',
      'Không Vực 3: Điện Vân Tiêu — Thiên Bằng Kim Dực Vương',
    ],
    bossName: 'Thiên Bằng Kim Dực Vương (Chúa Tể Bầu Trời)',
    loop2BossName: 'Huyết Vũ Thiên Ma Vương (Chân Thân Cửu Thiên)',
    bossMaxHp: 7000,
    skyTop: '#082f49',
    skyBottom: '#0284c7',
    loop2SkyTop: '#2a081d',
    loop2SkyBottom: '#6b1138',
    accentColor: '#38bdf8',
    particleType: 'petals',
  },
};

export const SEASON_ORDER: SeasonId[] = [
  'spring',
  'summer',
  'autumn',
  'winter',
  'cavern',
  'thunder_peak',
  'blood_abyss',
  'celestial_altar',
  'ocean_palace',
  'earth_core',
  'sky_sanctuary',
];

export interface StageDifficultyScaling {
  stageNumber: number;
  difficultyRankLabel: string;
  enemyHpMult: number;
  enemyDamageMult: number;
  enemyMoveSpeedMult: number;
  bossHpMult: number;
  bossDamageMult: number;
  bossMoveSpeedMult: number;
  bossAttackCooldownMult: number;
  bossEffectiveMaxHp: number;
  bossBaseSkillDamage: number;
  projectileSpeedMult: number;
  attackCooldownMult: number;
  hazardDamageMult: number;
  maxSimultaneousAttackers: number;
}

export function getStageDifficultyMultipliers(
  seasonId: SeasonId,
  loopRoute: GameLoopRoute
): StageDifficultyScaling {
  const cfg = SEASONS[seasonId];
  const stageIdx = cfg.index; // 0 .. 10 (11 stages)
  const loopHpMult = loopRoute === 2 ? 1.35 : 1.0;
  const loopDmgMult = loopRoute === 2 ? 1.25 : 1.0;
  const rankLabels = [
    'Cấp 1: Nhập Môn (Chuẩn)',
    'Cấp 2: Sơ Cảnh (+18% ST)',
    'Cấp 3: Thử Thách (+36% ST)',
    'Cấp 4: Khốc Liệt (+54% ST)',
    'Cấp 5: Ác Mộng (+72% ST)',
    'Cấp 6: Thiên Kiếp (+90% ST)',
    'Cấp 7: Luyện Ngục (+108% ST)',
    'Cấp 8: Tuyệt Cảnh (+126% ST)',
    'Cấp 9: Thâm Uyên (+144% ST)',
    'Cấp 10: Địa Tâm (+162% ST)',
    'Cấp 11: Thần Phạt (+180% ST)',
  ];
  const bossDamageMult = Number(((1 + stageIdx * 0.24) * (loopRoute === 2 ? 1.3 : 1.0)).toFixed(2));
  const bossEffectiveMaxHp = Math.round(cfg.bossMaxHp * loopHpMult);
  return {
    stageNumber: stageIdx + 1,
    difficultyRankLabel: rankLabels[stageIdx] ?? `Cấp ${stageIdx + 1}`,
    enemyHpMult: Number(((1 + stageIdx * 0.22) * loopHpMult).toFixed(2)),
    enemyDamageMult: Number(((1 + stageIdx * 0.18) * loopDmgMult).toFixed(2)),
    enemyMoveSpeedMult: Number((1 + stageIdx * 0.06 + (loopRoute === 2 ? 0.1 : 0)).toFixed(2)),
    bossHpMult: Number((bossEffectiveMaxHp / SEASONS.spring.bossMaxHp).toFixed(2)),
    bossDamageMult,
    bossMoveSpeedMult: Number((1 + stageIdx * 0.075 + (loopRoute === 2 ? 0.12 : 0)).toFixed(2)),
    bossAttackCooldownMult: Number(
      Math.max(0.4, 1 - stageIdx * 0.056 - (loopRoute === 2 ? 0.08 : 0)).toFixed(2)
    ),
    bossEffectiveMaxHp,
    bossBaseSkillDamage: Math.round(20 * bossDamageMult),
    projectileSpeedMult: Number((1 + stageIdx * 0.065 + (loopRoute === 2 ? 0.12 : 0)).toFixed(2)),
    attackCooldownMult: Number(
      Math.max(0.45, 1 - stageIdx * 0.052 - (loopRoute === 2 ? 0.08 : 0)).toFixed(2)
    ),
    hazardDamageMult: Number(((1 + stageIdx * 0.15) * loopDmgMult).toFixed(2)),
    maxSimultaneousAttackers: Math.min(
      9,
      3 + Math.floor(stageIdx * 0.55) + (loopRoute === 2 ? 1 : 0)
    ),
  };
}

export interface SealGateDefinition {
  id: number;
  coord: number; // X for horizontal stages, Y for vertical stages
  title: string;
  requiredKillsInZone: number;
  hasEliteSubBoss: boolean;
}

export function getStageSealGates(seasonId: SeasonId): SealGateDefinition[] {
  const cfg = SEASONS[seasonId];
  const len = cfg.stageLength;
  if (cfg.scrollMode === 'horizontal') {
    return [
      {
        id: 1,
        coord: Math.round(len * 0.24),
        title: 'Kết Giới Tiền Đồn (Khu 1)',
        requiredKillsInZone: 3,
        hasEliteSubBoss: false,
      },
      {
        id: 2,
        coord: Math.round(len * 0.5),
        title: 'Kết Giới Trung Tâm — Hộ Pháp Tinh Anh',
        requiredKillsInZone: 4,
        hasEliteSubBoss: true,
      },
      {
        id: 3,
        coord: Math.round(len * 0.76),
        title: 'Kết Giới Nội Điện — Đại Hộ Pháp',
        requiredKillsInZone: 4,
        hasEliteSubBoss: true,
      },
    ];
  }
  return [
    {
      id: 1,
      coord: Math.round(len * 0.72),
      title: 'Kết Giới Tầng Hạ (Tầng 1)',
      requiredKillsInZone: 3,
      hasEliteSubBoss: false,
    },
    {
      id: 2,
      coord: Math.round(len * 0.48),
      title: 'Kết Giới Tầng Trung — Hộ Pháp Tinh Anh',
      requiredKillsInZone: 3,
      hasEliteSubBoss: true,
    },
    {
      id: 3,
      coord: Math.round(len * 0.24),
      title: 'Kết Giới Đỉnh Tháp — Đại Hộ Pháp',
      requiredKillsInZone: 3,
      hasEliteSubBoss: true,
    },
  ];
}

export interface IntraStageGateScaling {
  gatesCleared: number; // 0, 1, 2, or 3
  zoneLabel: string;
  zoneHpMult: number;
  zoneDamageMult: number;
}

/**
 * Computes progressive enemy HP and Damage multipliers WITHIN a single stage
 * as the player advances past each Seal Gate (Cửa Ải 1 -> Cửa Ải 2 -> Cửa Ải 3).
 * Enemies in later sectors / waves after clearing gates have significantly higher HP and Damage than Wave 1!
 */
export function getIntraStageGateScaling(params: {
  seasonId: SeasonId;
  worldCoord: number; // X for horizontal stages, Y for vertical stages
  unlockedGatesCount?: number;
}): IntraStageGateScaling {
  const cfg = SEASONS[params.seasonId];
  const gates = getStageSealGates(params.seasonId);
  let coordGateTier = 0;

  if (cfg.scrollMode === 'horizontal') {
    for (const g of gates) {
      if (params.worldCoord >= g.coord) {
        coordGateTier += 1;
      }
    }
  } else {
    // Vertical stages climb upward (decreasing Y)
    for (const g of gates) {
      if (params.worldCoord <= g.coord) {
        coordGateTier += 1;
      }
    }
  }

  const gatesCleared = Math.min(3, Math.max(coordGateTier, params.unlockedGatesCount ?? 0));
  const hpTiers = [1.0, 1.28, 1.6, 1.95];
  const dmgTiers = [1.0, 1.22, 1.48, 1.78];
  const labels = [
    'Đợt 1: Tiền Đồn (Chuẩn)',
    'Qua Ải 1: Trung Tâm (+28% Máu · +22% Dame)',
    'Qua Ải 2: Nội Điện (+60% Máu · +48% Dame)',
    'Qua Ải 3: Cấm Địa Trùm (+95% Máu · +78% Dame)',
  ];

  return {
    gatesCleared,
    zoneLabel: labels[gatesCleared] ?? labels[0],
    zoneHpMult: hpTiers[gatesCleared] ?? 1.0,
    zoneDamageMult: dmgTiers[gatesCleared] ?? 1.0,
  };
}

export function getActiveStageSector(
  seasonId: SeasonId,
  progressPct: number
): { index: 0 | 1 | 2; name: string } {
  const sectors = SEASONS[seasonId].sectors;
  if (progressPct < 33) {
    return { index: 0, name: sectors[0] };
  }
  if (progressPct < 66) {
    return { index: 1, name: sectors[1] };
  }
  return { index: 2, name: sectors[2] };
}

export function getCheckpointCoordinates(seasonId: SeasonId): {
  cp1: number;
  cp2: number;
  bossPos: number;
} {
  const cfg = SEASONS[seasonId];
  if (cfg.scrollMode === 'horizontal') {
    return {
      cp1: Math.round(cfg.stageLength * 0.35),
      cp2: Math.round(cfg.stageLength * 0.68),
      bossPos: cfg.stageLength - 650,
    };
  }
  return {
    cp1: Math.round(cfg.stageLength * 0.67),
    cp2: Math.round(cfg.stageLength * 0.35),
    bossPos: 540,
  };
}

export interface StageClearOutcome {
  nextSeason: SeasonId;
  nextLoopRoute: GameLoopRoute;
  isLoopTwist: boolean;
  isTrueEnding: boolean;
  isMotherRescued: boolean;
  headline: string;
  narrative: string;
}

export function evaluateStageClear(
  currentSeason: SeasonId,
  currentLoop: GameLoopRoute
): StageClearOutcome {
  const idx = SEASON_ORDER.indexOf(currentSeason);
  if (idx < SEASON_ORDER.length - 1) {
    const nextSeason = SEASON_ORDER[idx + 1];
    return {
      nextSeason,
      nextLoopRoute: currentLoop,
      isLoopTwist: false,
      isTrueEnding: false,
      isMotherRescued: false,
      headline: `${SEASONS[currentSeason].vietnameseTitle} Hoàn Tất!`,
      narrative:
        currentLoop === 1
          ? `Kẻ canh giữ đã ngã xuống. Dấu vết áo choàng Huyết Y dẫn thẳng tới ${SEASONS[nextSeason].vietnameseTitle}.`
          : `Phong ấn tứ phương đang rung chuyển! Tiếp tục đột phá sang ${SEASONS[nextSeason].loop2Subtitle}.`,
    };
  }

  // Final Stage (Màn 11: Cửu Thiên Không Chiến) — Defeating the Final Boss ALWAYS rescues Kage's Mother!
  if (currentLoop === 1) {
    return {
      nextSeason: 'spring',
      nextLoopRoute: 2,
      isLoopTwist: true,
      isTrueEnding: true,
      isMotherRescued: true,
      headline: 'Đại Thắng Màn Cuối: Đã Giải Cứu Mẹ Thành Công!',
      narrative:
        'Thiên Bằng Kim Dực Vương đã ngã xuống! Lồng ngọc phong ấn trên đỉnh Cửu Thiên vỡ tan, Kage lao tới đỡ lấy Mẫu Thân đoàn tụ giữa biển mây hoàng kim rực rỡ! (Mở khóa thêm Vòng 2: Huyết Ảnh Siêu Cấp +35% Khó)',
    };
  }

  return {
    nextSeason: 'spring',
    nextLoopRoute: 2,
    isLoopTwist: false,
    isTrueEnding: true,
    isMotherRescued: true,
    headline: 'Chân Kết Cục Viên Mãn: Giải Cứu Mẹ & Bình Định Cửu Thiên!',
    narrative:
      'Huyết Vũ Thiên Ma Vương bị chém tan thành tro bụi! Phong ấn Cửu Thiên hoàn toàn giải mở, hai mẹ con đoàn tụ vĩnh viễn dưới ánh bình minh thái bình!',
  };
}
