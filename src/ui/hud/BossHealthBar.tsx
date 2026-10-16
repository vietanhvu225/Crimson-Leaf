import { Flame } from 'lucide-react';
import type { GameLoopRoute, SeasonConfig } from '../../game/rules';

interface BossHealthBarProps {
  loopRoute: GameLoopRoute;
  cfg: SeasonConfig;
  bossHp: number;
  bossMaxHp: number;
}

/** Boss health bar shown while a boss is engaged. */
export function BossHealthBar({ loopRoute, cfg, bossHp, bossMaxHp }: BossHealthBarProps) {
  return (
    <div className="mx-auto w-full max-w-lg px-4 mt-1.5 mb-auto pointer-events-none">
      <div
        className="p-2 rounded-lg border border-[#e11d48]/70 shadow-2xl"
        style={{ backgroundColor: 'rgba(14, 8, 16, 0.92)' }}
      >
        <div className="flex items-center justify-between text-xs mb-1">
          <div className="flex flex-col">
            <span className="font-bold tracking-wider uppercase text-[#fda4af] flex items-center gap-1.5">
              <Flame className="w-3.5 h-3.5 text-[#e11d48]" />
              {loopRoute === 2 ? cfg.loop2BossName : cfg.bossName}
            </span>
            <span className="text-[10px] text-[#fde047] font-semibold">
              Tuyệt Kỹ: {cfg.bossSkillName}
            </span>
          </div>
          <span className="font-mono text-[#f8fafc] tabular-nums shrink-0 ml-2">
            {Math.ceil(bossHp)} / {bossMaxHp}
          </span>
        </div>
        <div className="w-full h-2.5 bg-[#090a0f] rounded-sm overflow-hidden border border-[#881337]">
          <div
            className="h-full bg-gradient-to-r from-[#9f1239] via-[#e11d48] to-[#fbbf24] transition-all duration-100"
            style={{ width: `${Math.max(0, Math.min(100, (bossHp / bossMaxHp) * 100))}%` }}
          />
        </div>
      </div>
    </div>
  );
}
