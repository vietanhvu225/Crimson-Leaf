import React from 'react';
import {
  type GameLoopRoute,
  SEASONS,
  SEASON_ORDER,
  type SeasonId,
  getStageDifficultyMultipliers,
} from '../game/rules';
import { Sparkles, Compass, Swords, ShieldAlert } from 'lucide-react';

interface TitleScreenProps {
  selectedSeason: SeasonId;
  selectedLoop: GameLoopRoute;
  onSelectSeason: (season: SeasonId) => void;
  onSelectLoop: (loop: GameLoopRoute) => void;
  onStartGame: () => void;
  onOpenGdd: () => void;
}

export const TitleScreen: React.FC<TitleScreenProps> = ({
  selectedSeason,
  selectedLoop,
  onSelectSeason,
  onSelectLoop,
  onStartGame,
  onOpenGdd,
}) => {
  const currentConfig = SEASONS[selectedSeason];
  const currentDiff = getStageDifficultyMultipliers(selectedSeason, selectedLoop);

  return (
    <div className="fixed inset-0 z-30 flex flex-col justify-between p-5 sm:p-10 pointer-events-none select-none">
      {/* Top Archival Martial Header */}
      <div className="flex items-center justify-between">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-[#d4af37]/35 bg-[#090b12]/80 text-[11px] tracking-[0.18em] uppercase text-[#fde68a]">
          <Sparkles className="w-3.5 h-3.5 text-[#f43f5e]" />
          <span>SPIRITUAL SUCCESSOR TO THE LEGEND OF KAGE · 2.5D WUXIA ACTION</span>
        </div>
      </div>

      {/* Main Left-Aligned Wuxia Lacquer Panel */}
      <div
        className="my-auto max-w-2xl pointer-events-auto p-6 sm:p-8 rounded-2xl border border-[#d4af37]/40 shadow-2xl"
        style={{
          background:
            'linear-gradient(135deg, rgba(14, 11, 20, 0.94) 0%, rgba(8, 10, 18, 0.88) 100%)',
          boxShadow: '0 24px 60px rgba(0, 0, 0, 0.78), inset 0 1px 0 rgba(253, 224, 71, 0.22)',
        }}
      >
        {/* Calligraphic Crest + Vietnamese-Complete Display Title */}
        <div className="flex items-center gap-4 mb-4">
          <svg
            width="68"
            height="68"
            viewBox="0 0 72 72"
            className="shrink-0 drop-shadow-[0_0_20px_rgba(225,29,72,0.55)]"
            aria-hidden="true"
          >
            <circle cx="36" cy="36" r="32" fill="#be123c" stroke="#fde047" strokeWidth="2" />
            <circle cx="44" cy="24" r="5" fill="#fef08a" opacity="0.9" />
            <path
              d="M22 62 L22 14 M22 34 L34 24"
              stroke="#090a0f"
              strokeWidth="4"
              strokeLinecap="round"
            />
            <path
              d="M8 50 L66 22 L60 30 L12 55 Z"
              fill="#f8fafc"
              stroke="#fde047"
              strokeWidth="1"
            />
          </svg>

          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1
                className="text-3xl sm:text-5xl font-extrabold tracking-tight text-[#fffbeb] uppercase"
                style={{
                  fontFamily: "'Plus Jakarta Sans', sans-serif",
                  textShadow: '0 4px 24px rgba(225, 29, 72, 0.65)',
                }}
              >
                HUYỀN THOẠI CỨU MẸ
              </h1>
              <span className="px-2.5 py-1 text-[10px] font-bold tracking-widest uppercase bg-[#be123c] border border-[#fde047]/60 text-[#fff1f2] rounded">
                HUYẾT ẢNH
              </span>
            </div>
            <p
              className="text-xs sm:text-sm tracking-[0.22em] uppercase text-[#fde047] font-semibold mt-1"
              style={{ fontFamily: "'Cinzel', serif" }}
            >
              CRIMSON LEAF: MOTHER&apos;S OATH
            </p>
          </div>
        </div>

        <p className="text-xs sm:text-sm text-[#cbd5e1] leading-relaxed mb-5">
          Đêm trăng máu, tà phái Huyết Y bắt cóc người mẹ ẩn dật vì bí mật phong ấn Cửu Trùng. Khoác
          áo choàng đỏ, vung đoản kiếm Kodachi phản đòn phi tiêu và đột phá qua{' '}
          <strong className="text-[#fde047]">11 đại cảnh giới</strong> với cơ chế địa hình riêng
          biệt để giải cứu Mẫu Thân tại Cửu Thiên.
        </p>

        {/* 11-Stage Selector Grid with Unique Mechanic Preview */}
        <div className="mb-5 space-y-2.5">
          <div className="flex items-center justify-between text-xs text-[#fde68a]">
            <span className="font-bold tracking-wider uppercase flex items-center gap-1.5">
              <Compass className="w-3.5 h-3.5 text-[#f43f5e]" />
              CHỌN CẢNH GIỚI CHIẾN ĐẤU (11 MÀN CHƠI · ĐỘ KHÓ &amp; TRÙM TĂNG DẦN)
            </span>
            <span className="font-semibold text-[#fb7185] text-[11px]">
              {selectedLoop === 1 ? 'Vòng 1: Cốt Truyện' : 'Vòng 2: Huyết Ảnh (+35% Khó)'}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {SEASON_ORDER.map((sId) => {
              const cfg = SEASONS[sId];
              const active = selectedSeason === sId;
              return (
                <button
                  key={sId}
                  type="button"
                  onClick={() => onSelectSeason(sId)}
                  className={`px-3 py-1.5 rounded-lg text-left transition-all border cursor-pointer ${
                    active
                      ? 'bg-[#881337]/45 border-[#fde047] text-[#fffbeb] shadow-[0_0_16px_rgba(253,224,71,0.25)]'
                      : 'bg-[#111522]/85 border-[#2c3446] text-[#94a3b8] hover:text-[#f8fafc] hover:border-[#64748b]'
                  }`}
                >
                  <div className="text-xs font-bold truncate">{cfg.vietnameseTitle}</div>
                  <div className="text-[10px] text-[#38bdf8] truncate mt-0.5">
                    {cfg.mechanicName}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Selected Stage Mechanic, Grapple Anchor Item & Boss Highlight Box */}
          <div className="p-3 rounded-lg bg-[#0b0e17]/90 border border-[#d4af37]/30 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
            <div className="space-y-0.5">
              <div className="text-[#fde047] font-bold flex items-center gap-1.5">
                <Swords className="w-3.5 h-3.5 text-[#f43f5e]" />
                <span>Lối Chơi Đặc Trưng: {currentConfig.mechanicName}</span>
              </div>
              <div className="text-[11px] text-[#cbd5e1]">{currentConfig.mechanicDesc}</div>
              <div className="text-[10px] text-[#c084fc] font-semibold">
                Vật Phẩm Móc [E]:{' '}
                <span className="text-[#f3e8ff]">{currentConfig.grappleItemName}</span>
              </div>
            </div>
            <div className="sm:text-right shrink-0 border-t sm:border-t-0 sm:border-l border-[#262f42] pt-1.5 sm:pt-0 sm:pl-3">
              <div className="text-[10px] uppercase text-[#94a3b8] flex items-center sm:justify-end gap-1">
                <ShieldAlert className="w-3 h-3 text-[#fb7185]" />
                <span>
                  Trùm Cuối ({currentDiff.bossEffectiveMaxHp} HP · ST x
                  {currentDiff.bossDamageMult.toFixed(2)})
                </span>
              </div>
              <div className="text-xs font-bold text-[#fb7185]">
                {selectedLoop === 2 ? currentConfig.loop2BossName : currentConfig.bossName}
              </div>
            </div>
          </div>

          {/* Loop 1 / Loop 2 Selector */}
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <button
              type="button"
              onClick={() => onSelectLoop(1)}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold border transition-all cursor-pointer ${
                selectedLoop === 1
                  ? 'bg-[#1e293b] border-[#38bdf8] text-[#38bdf8]'
                  : 'bg-[#0c0e16]/75 border-[#262c3a] text-[#94a3b8]'
              }`}
            >
              Vòng 1: Cốt Truyện Chuẩn (Balanced)
            </button>
            <button
              type="button"
              onClick={() => onSelectLoop(2)}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold border transition-all cursor-pointer ${
                selectedLoop === 2
                  ? 'bg-[#881337]/50 border-[#f43f5e] text-[#fda4af]'
                  : 'bg-[#0c0e16]/75 border-[#262c3a] text-[#94a3b8]'
              }`}
            >
              Vòng 2: Huyết Ảnh Chân Tuyến (Hardcore +35%)
            </button>
          </div>
        </div>

        {/* Primary CTA & GDD Button */}
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={onStartGame}
            data-testid="start-game-btn"
            className="px-7 py-3.5 rounded-lg font-bold text-sm tracking-wider uppercase text-[#fffbeb] bg-gradient-to-r from-[#be123c] via-[#e11d48] to-[#b91c1c] hover:from-[#e11d48] hover:to-[#f43f5e] border border-[#fde047]/60 transition-all shadow-[0_0_28px_rgba(225,29,72,0.55)] cursor-pointer active:scale-95"
          >
            Bắt Đầu Giải Cứu Mẹ
          </button>

          <button
            type="button"
            onClick={onOpenGdd}
            data-testid="open-gdd-btn"
            className="px-5 py-3.5 rounded-lg font-semibold text-sm text-[#fde68a] bg-[#141824]/90 hover:bg-[#1e2536] border border-[#d4af37]/40 transition-colors cursor-pointer"
          >
            Hồ Sơ Thiết Kế & Cân Bằng (GDD)
          </button>
        </div>
      </div>

      {/* Bottom Controls Strip */}
      <div className="text-[11px] text-[#cbd5e1] flex flex-wrap items-center justify-between gap-2 border-t border-[#d4af37]/20 pt-3">
        <span>
          <strong className="text-[#fde047]">WASD / Space</strong> Khinh Công & Nhảy Tường ·{' '}
          <strong className="text-[#fb7185]">J / Chuột Trái</strong> Đoản Kiếm & Parry ·{' '}
          <strong className="text-[#38bdf8]">K / Chuột Phải</strong> Phi Tiêu 360° ·{' '}
          <strong className="text-[#c084fc]">Shift</strong> Lướt ·{' '}
          <strong className="text-[#34d399]">E</strong> Dây Móc ·{' '}
          <strong className="text-[#fde047]">C</strong> Đổi Hệ Nguyên Tố
        </span>
      </div>
    </div>
  );
};
