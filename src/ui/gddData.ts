export interface MilestoneTask {
  id: string;
  phase: string;
  duration: string;
  title: string;
  goal: string;
  items: { id: string; text: string; defaultDone: boolean }[];
}

export const GDD_MILESTONES: MilestoneTask[] = [
  {
    id: 'm1',
    phase: 'Giai đoạn 1: Prototype',
    duration: '2 - 3 tuần',
    title: 'Cảm giác bay nhảy (Hyper-Mobility & Parry Core)',
    goal: 'Đảm bảo chỉ riêng việc chạy, nhảy chuyền cành và chém phi tiêu đã mang lại cảm giác "sướng tay" trước khi làm đồ họa.',
    items: [
      {
        id: 'm1-1',
        text: 'Dựng khung 2.5D đa lớp (Parallax Z-Planes) & Character Controller khinh công nhảy vọt ngọn cây + Air Control mượt mà.',
        defaultDone: true,
      },
      {
        id: 'm1-2',
        text: 'Lập trình Bám & Chạy thân cây (Wall Cling / Wall Jump), Lướt trên không (Air Dash 0.8s CD) và Dây móc (Grappling Hook).',
        defaultDone: true,
      },
      {
        id: 'm1-3',
        text: 'Cơ chế Đoản kiếm Kodachi & Perfect Parry gạt văng phi tiêu ngược lại kèm Hit-stop (0.09s) và tia lửa rực sáng.',
        defaultDone: true,
      },
    ],
  },
  {
    id: 'm2',
    phase: 'Giai đoạn 2: Vertical Slice',
    duration: '4 - 6 tuần',
    title: 'Rừng Đại Thụ 2.5D (Màn 1 - Mùa Xuân)',
    goal: 'Dựng hoàn chỉnh Màn 1 với đầy đủ tài nguyên 2.5D: Thân cây đa lớp, ánh sáng động, lá rơi, âm thanh dồn dập.',
    items: [
      {
        id: 'm2-1',
        text: 'Môi trường Rừng Đại Thụ ban đêm, hiệu ứng God Rays xuyên kẽ lá và hạt cánh hoa đào rơi theo gió.',
        defaultDone: true,
      },
      {
        id: 'm2-2',
        text: 'AI Ninja Áo Xanh (nhảy chuyền cành, giữ khoảng cách phóng tiêu) & Ninja Áo Đỏ (áp sát chém kiếm, phục kích từ trục Z).',
        defaultDone: true,
      },
      {
        id: 'm2-3',
        text: 'Mini-boss Yêu Tăng Phun Lửa (Hỏa Thiền Sư) với đòn phun lửa chiếu sáng rực khu rừng và rơi Huyết Ngọc.',
        defaultDone: true,
      },
    ],
  },
  {
    id: 'm3',
    phase: 'Giai đoạn 3: Mở rộng Nội dung & Boss',
    duration: '2 - 3 tháng',
    title: 'Bốn Mùa Sinh Tử & Vòng Lặp Đa Tầng',
    goal: 'Xây dựng 3 màn còn lại (Hào nước, Leo tường thành, Lâu đài tuyết) cùng State Machine Boss và Vòng 2 True Route.',
    items: [
      {
        id: 'm3-1',
        text: 'Màn 2 Mùa Hạ (Hào Nước làm chậm chạy, Thủy Ninja phóng từ tiền cảnh, Boss Song Kiếm Khách).',
        defaultDone: true,
      },
      {
        id: 'm3-2',
        text: 'Màn 3 Mùa Thu (Cuộn dọc Vertical Scrolling leo tường thành bất tận, né đá lăn, Boss Đại Tướng Quân Giáp Sắt).',
        defaultDone: true,
      },
      {
        id: 'm3-3',
        text: 'Màn 4 Mùa Đông (Bão tuyết giảm tầm nhìn, Boss Tà Sư Huyết Y dịch chuyển trục Z) & Twist Vòng 2: Huyết Ảnh Chân Tuyến.',
        defaultDone: true,
      },
    ],
  },
  {
    id: 'm4',
    phase: 'Giai đoạn 4: Polish, Juice & Phát hành',
    duration: '1 tháng',
    title: 'Game Juice, Object Pooling & Speedrun',
    goal: 'Tối ưu hiệu năng 60 FPS với Object Pooling cho phi tiêu/lá rơi, rung màn hình và âm thanh kim loại đanh gọn.',
    items: [
      {
        id: 'm4-1',
        text: 'Zero-GC Object Pooling cho hệ thống hạt (cánh hoa, lá phong, bông tuyết, tia lửa Parry) và phi tiêu.',
        defaultDone: true,
      },
      {
        id: 'm4-2',
        text: 'Trạng thái Thức Tỉnh Huyết Ảnh (15s: +30% tốc độ, phi tiêu 3 tia xuyên thấu, sóng kiếm khí tầm xa).',
        defaultDone: true,
      },
      {
        id: 'm4-3',
        text: 'Bộ đếm Speedrun Timer, Combo Counter, và Bảng thông số kỹ thuật GDD trực quan ngay trong bản dựng.',
        defaultDone: true,
      },
    ],
  },
];

export const TECH_DIRECTION_COMPARISON = [
  {
    id: 'option-a',
    badge: 'Khuyên dùng cho Indie · Đang kích hoạt trong Prototype',
    title: 'Phương án A: HD-2D / 2D Sprite in 3D World',
    engine: 'Godot 4 (C#) / Unity URP / Custom 2.5D Multi-Plane Canvas',
    characterArt: '2D Pixel Art độ phân giải cao / Hand-drawn Spine Animation sắc nét.',
    environmentArt:
      'Thân cây đại thụ, tường thành, mặt nước, mái chùa xếp chồng đa lớp theo trục Z.',
    visualHighlight:
      'Ánh sáng động (Dynamic Lighting), God Rays xuyên tán lá, sương mù Volumetric Fog, và hạt lá/tuyết/lửa thời gian thực phản xạ lên thân cây.',
  },
  {
    id: 'option-b',
    badge: 'Điện ảnh 3D · Kiểu Metroid Dread / Shadow Complex',
    title: 'Phương án B: Full 3D trên trục 2D',
    engine: 'Unity 3D / Unreal Engine 5 / Godot 4 3D',
    characterArt: '3D Model hoàn chỉnh với Skeletal Rigging & Cloth Physics cho áo choàng đỏ.',
    environmentArt: 'Full 3D Modular Assets khóa camera di chuyển trên mặt phẳng 2D.',
    visualHighlight:
      'Xoay góc máy linh hoạt (Dynamic Camera) ở các pha kết liễu Boss (Finisher) hoặc khi chuyển cảnh leo tường thành Mùa Thu.',
  },
];
