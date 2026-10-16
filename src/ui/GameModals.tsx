import React from 'react';
import { SEASONS, SeasonId, GameLoopRoute, StageClearOutcome } from '../game/rules';

export interface RunSnapshot {
  outcome: 'victory' | 'defeat';
  seasonId: SeasonId;
  loopRoute: GameLoopRoute;
  score: number;
  bestScore: number;
  parryCount: number;
  kills: number;
  clearTimeSec: number;
  progressPct: number;
  bossHpRemaining: number;
  stageClearInfo: StageClearOutcome | null;
}

interface PauseModalProps {
  seasonId: SeasonId;
  loopRoute: GameLoopRoute;
  onResume: () => void;
  onRestart: () => void;
  onReturnTitle: () => void;
  onOpenGdd: () => void;
}

export const PauseModal: React.FC<PauseModalProps> = ({
  seasonId,
  loopRoute,
  onResume,
  onRestart,
  onReturnTitle,
  onOpenGdd,
}) => {
  const season = SEASONS[seasonId];

  return (
    <div
      className="fixed inset-0 z-30 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(6, 9, 15, 0.82)' }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="pause-modal-title"
    >
      <div
        className="w-full max-w-md rounded border border-[#4c1d2e] p-6 text-[#f8fafc]"
        style={{
          backgroundColor: '#0e131f',
          boxShadow: '0 20px 50px rgba(0, 0, 0, 0.85)',
        }}
      >
        <div className="text-xs font-bold tracking-widest text-[#fb7185] uppercase mb-1">
          TẠM DỪNG CHIẾN ĐẤU · VÒNG {loopRoute}
        </div>
        <h2
          id="pause-modal-title"
          className="text-2xl font-bold mb-2"
          style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
        >
          {season.vietnameseTitle}
        </h2>
        <p className="text-xs text-[#94a3b8] mb-6">
          {loopRoute === 1 ? season.subtitle : season.loop2Subtitle}
        </p>

        <div className="space-y-2.5">
          <button
            type="button"
            onClick={onResume}
            className="w-full py-3 px-4 rounded bg-[#e11d48] hover:bg-[#be123c] text-white font-semibold text-sm transition-colors cursor-pointer whitespace-nowrap"
          >
            Tiếp Tục Chiến Đấu (Esc / P)
          </button>

          <button
            type="button"
            onClick={onRestart}
            className="w-full py-2.5 px-4 rounded bg-[#1e293b] hover:bg-[#334155] border border-[#475569] text-[#f1f5f9] font-medium text-sm transition-colors cursor-pointer whitespace-nowrap"
          >
            Chơi Lại Màn Này (R)
          </button>

          <button
            type="button"
            onClick={onOpenGdd}
            className="w-full py-2.5 px-4 rounded bg-[#1e293b] hover:bg-[#334155] border border-[#475569] text-[#fda4af] font-medium text-sm transition-colors cursor-pointer whitespace-nowrap"
          >
            Xem Hồ Sơ Thiết Kế &amp; Lộ Trình (GDD)
          </button>

          <button
            type="button"
            onClick={onReturnTitle}
            className="w-full py-2.5 px-4 rounded bg-[#090d16] hover:bg-[#141a26] border border-[#2c3446] text-[#94a3b8] hover:text-white font-medium text-sm transition-colors cursor-pointer whitespace-nowrap"
          >
            Về Màn Hình Chính
          </button>
        </div>
      </div>
    </div>
  );
};

interface OutcomeModalProps {
  snapshot: RunSnapshot;
  onPrimaryAction: () => void;
  onReturnTitle: () => void;
}

export const OutcomeModal: React.FC<OutcomeModalProps> = ({
  snapshot,
  onPrimaryAction,
  onReturnTitle,
}) => {
  const isVictory = snapshot.outcome === 'victory';
  const clearInfo = snapshot.stageClearInfo;

  return (
    <div
      className="fixed inset-0 z-30 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(6, 9, 15, 0.86)' }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="outcome-modal-title"
    >
      <div
        className="w-full max-w-lg rounded border p-6 md:p-7 text-[#f8fafc]"
        style={{
          backgroundColor: '#0e131f',
          borderColor:
            isVictory && clearInfo?.isMotherRescued ? '#fde047' : isVictory ? '#e11d48' : '#475569',
          boxShadow: '0 24px 60px rgba(0, 0, 0, 0.9)',
        }}
      >
        <div
          className={`text-xs font-bold tracking-widest uppercase mb-1.5 ${
            isVictory && clearInfo?.isMotherRescued ? 'text-[#4ade80]' : 'text-[#fb7185]'
          }`}
        >
          {isVictory
            ? clearInfo?.isMotherRescued
              ? 'ĐẠI CÔNG CÁO THÀNH · ĐÃ GIẢI CỨU MẸ THÀNH CÔNG!'
              : clearInfo?.isTrueEnding
                ? 'CHÂN KẾT CỤC · TRUE ENDING'
                : clearInfo?.isLoopTwist
                  ? 'ĐIỆU HỔ LY SƠN · MỞ KHÓA VÒNG 2'
                  : 'CHIẾN THẮNG MÀN CHƠI'
            : 'THẤT BẠI TRÊN ĐƯỜNG CỨU MẸ'}
        </div>

        <h2
          id="outcome-modal-title"
          className="text-2xl font-bold mb-2"
          style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", textWrap: 'balance' }}
        >
          {isVictory && clearInfo
            ? clearInfo.headline
            : `${SEASONS[snapshot.seasonId].vietnameseTitle} — Trọng Thương`}
        </h2>

        {isVictory && clearInfo?.isMotherRescued && (
          <div className="mb-4 p-3 rounded-lg bg-[#064e3b]/55 border border-[#34d399]/60 text-xs text-[#a7f3d0] font-semibold">
            ✨ Phong ấn Cửu Thiên đã bị phá hủy hoàn toàn sau khi hạ gục Thiên Bằng Kim Dực Vương!
            Kage đã giải cứu Mẫu Thân bình an vô sự!
          </div>
        )}

        <p className="text-sm text-[#cbd5e1] leading-relaxed mb-6">
          {isVictory && clearInfo
            ? clearInfo.narrative
            : 'Đoản kiếm chưa gãy, lời thề cứu mẹ vẫn còn cháy bỏng. Hãy canh chuẩn nhịp Parry phi tiêu để hồi đầy Nội lực và bật Huyết Ảnh!'}
        </p>

        {/* 3 Tabular-Nums Mastery / Progress Stat Tiles */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="p-3 rounded bg-[#141a26] border border-[#263042]">
            <div className="text-[10px] font-bold tracking-wider text-[#94a3b8] uppercase">
              ĐIỂM / KỶ LỤC
            </div>
            <div className="text-lg font-bold font-mono tabular-nums text-white mt-0.5">
              {Math.round(snapshot.score)}
            </div>
            <div className="text-[11px] font-mono tabular-nums text-[#64748b]">
              Cao nhất: {Math.round(snapshot.bestScore)}
            </div>
          </div>

          <div className="p-3 rounded bg-[#141a26] border border-[#263042]">
            <div className="text-[10px] font-bold tracking-wider text-[#94a3b8] uppercase">
              {isVictory ? 'THỜI GIAN VƯỢT' : 'TIẾN ĐỘ MÀN'}
            </div>
            <div className="text-lg font-bold font-mono tabular-nums text-[#fbbf24] mt-0.5">
              {isVictory
                ? `${snapshot.clearTimeSec.toFixed(1)}s`
                : `${Math.round(snapshot.progressPct)}%`}
            </div>
            <div className="text-[11px] font-mono tabular-nums text-[#64748b]">
              Hạ địch: {snapshot.kills}
            </div>
          </div>

          <div className="p-3 rounded bg-[#141a26] border border-[#263042]">
            <div className="text-[10px] font-bold tracking-wider text-[#94a3b8] uppercase">
              {isVictory ? 'PHẢN ĐÒN PARRY' : 'MÁU BOSS CÒN'}
            </div>
            <div className="text-lg font-bold font-mono tabular-nums text-[#22d3ee] mt-0.5">
              {isVictory ? `${snapshot.parryCount} lần` : `${Math.round(snapshot.bossHpRemaining)}`}
            </div>
            <div className="text-[11px] font-mono tabular-nums text-[#64748b]">
              Vòng {snapshot.loopRoute}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            data-start="true"
            onClick={(e) => {
              e.currentTarget.blur();
              onPrimaryAction();
            }}
            className="flex-1 py-3 px-5 rounded bg-[#e11d48] hover:bg-[#be123c] text-white font-semibold text-sm transition-colors cursor-pointer whitespace-nowrap"
          >
            {isVictory
              ? clearInfo?.isTrueEnding
                ? 'Chơi Lại Từ Đầu (Đã Giải Cứu Mẹ!)'
                : clearInfo?.isLoopTwist
                  ? 'Khiêu Chiến Vòng 2: Huyết Ảnh (+35% Khó)'
                  : `Sang Màn Kế (${SEASONS[clearInfo?.nextSeason ?? 'spring'].vietnameseTitle})`
              : 'Thử Lại Ngay'}
          </button>

          <button
            type="button"
            onClick={onReturnTitle}
            className="py-3 px-4 rounded bg-[#1e293b] hover:bg-[#334155] border border-[#475569] text-[#e2e8f0] font-medium text-sm transition-colors cursor-pointer whitespace-nowrap"
          >
            Màn Hình Chính
          </button>
        </div>
      </div>
    </div>
  );
};
