import { PlayerCombatState, SeasonConfig } from '../../game/rules';
import { BookOpen, Pause, Play, RotateCcw, Volume2, VolumeX } from 'lucide-react';

interface ComboPanelProps {
  cfg: SeasonConfig;
  currentMeters: number;
  totalMeters: number;
  combat: PlayerCombatState;
  onOpenGdd: () => void;
  onToggleMute: () => void;
  muted: boolean;
  onTogglePause: () => void;
  isPaused: boolean;
  onQuickRestart: () => void;
}

/** Top-right: combo, score and utility buttons. */
export function ComboPanel({
  cfg,
  currentMeters,
  totalMeters,
  combat,
  onOpenGdd,
  onToggleMute,
  muted,
  onTogglePause,
  isPaused,
  onQuickRestart,
}: ComboPanelProps) {
  return (
    <div className="flex flex-col items-stretch sm:items-end gap-1.5 pointer-events-auto w-full sm:w-auto">
      <div
        className="flex items-center justify-between sm:justify-end gap-2 sm:gap-3.5 px-2.5 py-1.5 sm:px-3.5 sm:py-2.5 rounded-lg border border-[#d4af37]/35 shadow-xl w-full sm:w-auto"
        style={{
          background:
            'linear-gradient(135deg, rgba(16, 12, 20, 0.94) 0%, rgba(10, 12, 22, 0.90) 100%)',
        }}
      >
        {/* Mobile Compact Stage Progress */}
        <div className="flex lg:hidden flex-col text-left sm:text-right pr-2 border-r border-[#2c3446]">
          <span className="text-[9px] font-bold uppercase text-[#fde68a]">
            Màn {cfg.index + 1}/9 · {cfg.mechanicName.split(' ')[0]}
          </span>
          <span className="text-[10px] font-mono text-[#e2e8f0] tabular-nums">
            {currentMeters}m/{totalMeters}m
          </span>
        </div>

        {/* Combo & Parry */}
        <div className="text-right pr-2 sm:pr-3 border-r border-[#2c3446]">
          <div className="text-[9px] uppercase tracking-wider text-[#fda4af] font-bold">
            COMBO · PARRY ({combat.parryCount})
          </div>
          <div className="text-xs sm:text-base font-extrabold font-mono text-[#fde047] tabular-nums leading-tight">
            {combat.combo > 0 ? `${combat.combo}x` : '0x'}
          </div>
        </div>

        {/* Score */}
        <div className="text-right pr-1 sm:pr-2">
          <div className="text-[9px] uppercase tracking-wider text-[#94a3b8]">CHIẾN CÔNG</div>
          <div className="text-xs sm:text-base font-bold font-mono text-[#f8fafc] tabular-nums leading-tight">
            {combat.score.toLocaleString()}
          </div>
        </div>

        {/* Utility Icon Buttons */}
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={onOpenGdd}
            title="Hồ Sơ Thiết Kế & Cân Bằng (G)"
            className="p-1.5 sm:p-2 rounded bg-[#141824] hover:bg-[#1e2638] text-[#fde68a] border border-[#d4af37]/35 transition-colors cursor-pointer"
          >
            <BookOpen className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </button>
          <button
            type="button"
            onClick={onToggleMute}
            title="Bật / Tắt Âm Thanh (M)"
            className="p-1.5 sm:p-2 rounded bg-[#141824] hover:bg-[#1e2638] text-[#f8fafc] border border-[#2c3446] transition-colors cursor-pointer"
          >
            {muted ? (
              <VolumeX className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#f43f5e]" />
            ) : (
              <Volume2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#38bdf8]" />
            )}
          </button>
          <button
            type="button"
            onClick={onTogglePause}
            title="Tạm Dừng (Esc / P)"
            className="p-1.5 sm:p-2 rounded bg-[#141824] hover:bg-[#1e2638] text-[#f8fafc] border border-[#2c3446] transition-colors cursor-pointer"
          >
            {isPaused ? (
              <Play className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#34d399]" />
            ) : (
              <Pause className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            )}
          </button>
          <button
            type="button"
            onClick={onQuickRestart}
            title="Khởi Động Lại Màn (R)"
            className="p-1.5 sm:p-2 rounded bg-[#141824] hover:bg-[#1e2638] text-[#f8fafc] border border-[#2c3446] transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
