import React, { useState } from 'react';
import { GDD_MILESTONES, TECH_DIRECTION_COMPARISON } from './gddData';
import { SEASONS, SEASON_ORDER, PHYSICS_CONSTANTS, type SeasonId } from '../game/rules';

interface GddModalProps {
  onClose: () => void;
  onLaunchSeason: (season: SeasonId) => void;
}

export const GddModal: React.FC<GddModalProps> = ({ onClose, onLaunchSeason }) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'mechanics' | 'seasons' | 'roadmap'>(
    'overview'
  );
  const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>(() => {
    const init: Record<string, boolean> = {};
    GDD_MILESTONES.forEach((m) =>
      m.items.forEach((it) => {
        init[it.id] = it.defaultDone;
      })
    );
    return init;
  });

  const totalTasks = GDD_MILESTONES.reduce((acc, m) => acc + m.items.length, 0);
  const completedTasks = Object.values(checkedItems).filter(Boolean).length;

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center p-4 md:p-8"
      style={{ backgroundColor: 'rgba(6, 9, 15, 0.88)' }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="gdd-modal-title"
    >
      <div
        className="w-full max-w-5xl max-h-[88vh] flex flex-col rounded border border-[#3b232a] text-[#f4efe6] overflow-hidden"
        style={{
          backgroundColor: '#0d111a',
          boxShadow: '0 24px 64px rgba(0,0,0,0.92)',
        }}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between gap-4 px-6 py-4 border-b border-[#262f40] bg-[#111622]">
          <div>
            <div className="text-xs text-[#fb7185] font-semibold tracking-wider">
              GAME DESIGN DOCUMENT (GDD) · SPIRITUAL SUCCESSOR TO THE LEGEND OF KAGE
            </div>
            <h2
              id="gdd-modal-title"
              className="text-xl md:text-2xl font-bold text-white"
              style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
            >
              Huyền Thoại Cứu Mẹ — Crimson Leaf: Mother&apos;s Oath
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded bg-[#e11d48] hover:bg-[#be123c] text-white text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap shrink-0"
          >
            Đóng Hồ Sơ &amp; Quay Lại Game
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 px-6 py-3 border-b border-[#1e2636] bg-[#0a0e17] overflow-x-auto">
          {[
            { id: 'overview', label: '01. Tổng Quan & Công Nghệ 2.5D' },
            { id: 'mechanics', label: '02. Cơ Chế Khinh Công & Chiến Đấu' },
            { id: 'seasons', label: '03. 11 Cảnh Giới Sinh Tử & Vòng Lặp' },
            { id: 'roadmap', label: `04. Lộ Trình Sản Xuất (${completedTasks}/${totalTasks})` },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={`px-3.5 py-2 rounded text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                activeTab === tab.id
                  ? 'bg-[#2a1219] text-[#ffe4e6] border border-[#e11d48]'
                  : 'text-[#94a3b8] hover:text-white hover:bg-[#161e2e]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-6 text-sm leading-relaxed">
          {activeTab === 'overview' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 rounded bg-[#141a26] border border-[#263042]">
                  <h3 className="font-semibold text-white mb-1">Góc Nhìn 2.5D Đa Lớp</h3>
                  <p className="text-xs text-[#cbd5e1]">
                    Di chuyển ngang/dọc trên trục X - Y, môi trường dựng có chiều sâu trục Z với
                    Parallax đa lớp, ánh sáng động (God Rays) và phục kích tiền cảnh/hậu cảnh.
                  </p>
                </div>
                <div className="p-4 rounded bg-[#141a26] border border-[#263042]">
                  <h3 className="font-semibold text-white mb-1">Cốt Truyện Việt Hóa</h3>
                  <p className="text-xs text-[#cbd5e1]">
                    Thiếu niên võ nghệ cao cường khoác áo choàng đỏ, cầm đoản kiếm Kodachi và phi
                    tiêu lao vào màn đêm giải cứu Mẹ khỏi tà phái Huyết Y qua 11 cảnh giới Sinh -
                    Tử.
                  </p>
                </div>
                <div className="p-4 rounded bg-[#141a26] border border-[#263042]">
                  <h3 className="font-semibold text-white mb-1">Định Hướng Bản Quyền</h3>
                  <p className="text-xs text-[#cbd5e1]">
                    Spiritual Successor: Giữ nhịp độ bay nhảy vượt ngọn cây dồn dập nhưng thiết kế
                    mới 100% mã nguồn, hình ảnh, cốt truyện và âm thanh tổng hợp.
                  </p>
                </div>
              </div>

              <div>
                <h3 className="text-base font-bold text-white mb-3">
                  Định Hướng Đồ Họa 2.5D &amp; Công Nghệ (Art &amp; Tech Direction)
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {TECH_DIRECTION_COMPARISON.map((opt) => (
                    <div
                      key={opt.id}
                      className="p-5 rounded bg-[#141a26] border border-[#2c364a] space-y-2"
                    >
                      <div className="text-xs font-medium text-[#fb7185]">{opt.badge}</div>
                      <h4 className="text-base font-bold text-white">{opt.title}</h4>
                      <div className="text-xs text-[#94a3b8]">Engine: {opt.engine}</div>
                      <p className="text-xs text-[#cbd5e1]">
                        <strong className="text-white">Nhân vật &amp; Quái:</strong>{' '}
                        {opt.characterArt}
                      </p>
                      <p className="text-xs text-[#cbd5e1]">
                        <strong className="text-white">Môi trường:</strong> {opt.environmentArt}
                      </p>
                      <p className="text-xs text-[#cbd5e1]">
                        <strong className="text-white">Điểm nhấn thị giác:</strong>{' '}
                        {opt.visualHighlight}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'mechanics' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-5 rounded bg-[#141a26] border border-[#263042] space-y-2.5">
                  <h3 className="text-base font-bold text-white">
                    3.1. Hệ Thống Di Chuyển Siêu Tốc (Hyper-Mobility)
                  </h3>
                  <ul className="space-y-2 text-xs text-[#cbd5e1]">
                    <li>
                      <strong className="text-[#fb7185]">Khinh công (Super Jump):</strong> Vận tốc
                      nhảy vọt{' '}
                      <code className="font-mono">{PHYSICS_CONSTANTS.SUPER_JUMP_VELOCITY}px/s</code>{' '}
                      lên thẳng các tầng cành cây đại thụ kèm Air Control và Coyote Time (
                      <code className="font-mono">{PHYSICS_CONSTANTS.COYOTE_TIME}s</code>).
                    </li>
                    <li>
                      <strong className="text-[#fbbf24]">
                        Lướt trên không (Air Dash [Shift]):
                      </strong>{' '}
                      Vận tốc{' '}
                      <code className="font-mono">{PHYSICS_CONSTANTS.AIR_DASH_SPEED}px/s</code> vượt
                      qua lưới đạn, hồi chiêu <code className="font-mono">0.8s</code>.
                    </li>
                    <li>
                      <strong className="text-[#22d3ee]">Bám &amp; Bật Tường (Wall Cling):</strong>{' '}
                      Ghim đoản kiếm vào thân cây cổ thụ hoặc vách thành để hãm rơi và bật nhảy liên
                      hoàn.
                    </li>
                    <li>
                      <strong className="text-[#a78bfa]">Dây móc (Grappling Hook [E]):</strong>{' '}
                      Phóng dây móc vào đèn lồng hoặc cành cao để đu vọt lên không ngắt quãng.
                    </li>
                  </ul>
                </div>

                <div className="p-5 rounded bg-[#141a26] border border-[#263042] space-y-2.5">
                  <h3 className="text-base font-bold text-white">
                    3.2. Hệ Thống Chiến Đấu &amp; Trục Z (Fast-Paced Combat)
                  </h3>
                  <ul className="space-y-2 text-xs text-[#cbd5e1]">
                    <li>
                      <strong className="text-[#fb7185]">
                        Đoản kiếm Kodachi &amp; Perfect Parry:
                      </strong>{' '}
                      Chém trúng phi tiêu địch trong khung <code className="font-mono">0.16s</code>{' '}
                      gạt văng ngược lại tiêu diệt địch, kích hoạt Hit-stop{' '}
                      <code className="font-mono">0.09s</code> và hồi lập tức{' '}
                      <code className="font-mono">+40 Nội lực</code>.
                    </li>
                    <li>
                      <strong className="text-[#22d3ee]">Phi tiêu 360° &amp; Nội lực:</strong> Nhắm
                      bắn 360° theo con trỏ chuột hoặc hướng di chuyển (tốn{' '}
                      <code className="font-mono">18 Nội lực</code>, hồi ngay khi chém cận chiến).
                    </li>
                    <li>
                      <strong className="text-[#f43f5e]">Thức Tỉnh Huyết Ảnh (15s):</strong> Nhặt
                      Huyết Ngọc từ Yêu Tăng hoặc đầy Nộ giúp tăng{' '}
                      <code className="font-mono">+30%</code> tốc độ, phi tiêu 3 tia xuyên thấu và
                      chém ra sóng kiếm khí tầm xa.
                    </li>
                    <li>
                      <strong className="text-[#34d399]">Tương tác trục Z ([Q] Đổi Làn):</strong>{' '}
                      Chuyển giữa Làn Ngoài (<code className="font-mono">Z=0</code>) và Làn Trong (
                      <code className="font-mono">Z=1</code>) để né bẫy đá lăn hoặc truy kích địch
                      phục kích.
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'seasons' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {SEASON_ORDER.map((sId) => {
                  const s = SEASONS[sId];
                  return (
                    <div
                      key={sId}
                      className="p-4 rounded bg-[#141a26] border border-[#2c364a] flex flex-col justify-between gap-3"
                    >
                      <div>
                        <div className="flex items-center justify-between">
                          <h4 className="text-base font-bold text-white">{s.vietnameseTitle}</h4>
                          <span className="text-xs font-mono text-[#94a3b8]">
                            {s.scrollMode === 'vertical' ? 'Vertical Climb' : 'Horizontal 2.5D'}
                          </span>
                        </div>
                        <p className="text-xs text-[#cbd5e1] mt-1">
                          <strong>Vòng 1:</strong> {s.subtitle}
                        </p>
                        <p className="text-xs text-[#fda4af] mt-0.5">
                          <strong>Vòng 2 (True Route):</strong> {s.loop2Subtitle}
                        </p>
                        <p className="text-xs text-[#94a3b8] mt-2">
                          Trùm trấn giữ: <strong className="text-white">{s.bossName}</strong> (HP:{' '}
                          <span className="font-mono tabular-nums">{s.bossMaxHp}</span>)
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          onLaunchSeason(sId);
                          onClose();
                        }}
                        className="self-start px-3.5 py-1.5 rounded bg-[#e11d48] hover:bg-[#be123c] text-white text-xs font-semibold cursor-pointer"
                      >
                        Chơi Thử {s.vietnameseTitle} Ngay
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {activeTab === 'roadmap' && (
            <div className="space-y-4">
              {GDD_MILESTONES.map((m) => (
                <div
                  key={m.id}
                  className="p-4 rounded bg-[#141a26] border border-[#263042] space-y-2.5"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h4 className="text-base font-bold text-white">
                      {m.phase}: {m.title}
                    </h4>
                    <span className="text-xs font-mono text-[#fb7185]">{m.duration}</span>
                  </div>
                  <p className="text-xs text-[#94a3b8]">{m.goal}</p>
                  <div className="space-y-1.5 pt-1">
                    {m.items.map((item) => {
                      const checked = !!checkedItems[item.id];
                      return (
                        <label
                          key={item.id}
                          className="flex items-start gap-2.5 text-xs text-[#e2e8f0] cursor-pointer select-none"
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() =>
                              setCheckedItems((prev) => ({
                                ...prev,
                                [item.id]: !prev[item.id],
                              }))
                            }
                            className="mt-0.5 accent-[#e11d48]"
                          />
                          <span className={checked ? 'text-white' : 'text-[#94a3b8]'}>
                            {item.text}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
