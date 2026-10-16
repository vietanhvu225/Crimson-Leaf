import React from 'react';
import { GameLoopRoute, SEASONS, SEASON_ORDER, SeasonConfig, SeasonId } from '../../game/rules';
import { ChevronDown, Compass } from 'lucide-react';

interface StageCompassProps {
  setStageDrawerOpen: React.Dispatch<React.SetStateAction<boolean>>;
  cfg: SeasonConfig;
  loopRoute: GameLoopRoute;
  currentMeters: number;
  totalMeters: number;
  stageProgressPct: number;
  stageDrawerOpen: boolean;
  seasonId: SeasonId;
  onSelectSeasonQuick: (s: SeasonId) => void;
}

/** Top-centre: stage title, mechanic badge, sector track and quick stage drawer. */
export function StageCompass({
  setStageDrawerOpen,
  cfg,
  loopRoute,
  currentMeters,
  totalMeters,
  stageProgressPct,
  stageDrawerOpen,
  seasonId,
  onSelectSeasonQuick,
}: StageCompassProps) {
  return (
    <div className="hidden lg:flex flex-col items-center gap-1.5 pointer-events-auto relative">
      <div
        className="flex flex-col gap-1.5 px-4 py-2 rounded-lg border border-[#d4af37]/35 shadow-xl min-w-[430px]"
        style={{
          background:
            'linear-gradient(180deg, rgba(15, 18, 28, 0.93) 0%, rgba(9, 11, 18, 0.88) 100%)',
        }}
      >
        <div className="flex items-center justify-between gap-3">
          <button
            type="button"
            data-testid="stage-drawer-toggle"
            onClick={() => setStageDrawerOpen((v) => !v)}
            className="flex items-center gap-1.5 text-xs font-bold text-[#fde68a] hover:text-white transition-colors cursor-pointer"
          >
            <Compass className="w-3.5 h-3.5 text-[#f43f5e]" />
            <span>{cfg.vietnameseTitle}</span>
            <span className="text-[10px] font-normal text-[#94a3b8]">
              ({loopRoute === 2 ? 'Vòng 2: Huyết Ảnh' : 'Vòng 1'})
            </span>
            <ChevronDown className="w-3.5 h-3.5 text-[#fde68a]" />
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              data-testid="warp-boss-btn"
              onClick={() =>
                window.dispatchEvent(new KeyboardEvent('keydown', { key: 'v', code: 'KeyV' }))
              }
              title="Dịch chuyển tức thời tới Võ Đài Trùm cuối màn (Phím V)"
              className="px-2 py-0.5 rounded bg-[#881337]/80 hover:bg-[#e11d48] border border-[#fb7185]/70 text-[10px] font-extrabold text-[#ffe4e6] transition-colors cursor-pointer"
            >
              Đấu Trùm [V]
            </button>
            <span className="text-[11px] font-mono text-[#e2e8f0] tabular-nums">
              <strong className="text-[#fde047]">{currentMeters}m</strong>/{totalMeters}m (
              {Math.round(stageProgressPct)}%)
            </span>
          </div>
        </div>

        {/* Unique Stage Gameplay Mode, Grapple Anchor Item & Boss Skill Strip */}
        <div className="flex items-center justify-between gap-2 text-[10px] px-2.5 py-0.5 rounded bg-[#1e293b]/80 border border-[#334155]">
          <span className="font-semibold text-[#38bdf8] truncate">
            Lối Chơi: <strong className="text-[#f8fafc]">{cfg.movementStyleName}</strong>
          </span>
          <span className="text-[#c084fc] font-semibold truncate">
            Móc [E]:{' '}
            <strong className="text-[#f3e8ff]">{cfg.grappleItemName.split('(')[0].trim()}</strong>
          </span>
          <span className="text-[#fda4af] font-semibold truncate">
            Trùm: <strong className="text-[#fde68a]">{cfg.bossSkillName}</strong>
          </span>
        </div>

        {/* Horizon Progress Bar with Checkpoint Markers */}
        <div className="relative w-full h-2 bg-[#07090e] rounded-full overflow-hidden border border-[#334155] mt-0.5">
          <div
            className="h-full transition-all duration-150"
            style={{
              width: `${stageProgressPct}%`,
              background: `linear-gradient(90deg, ${cfg.accentColor}, #fde047)`,
            }}
          />
          <div
            className="absolute top-0 bottom-0 w-0.5 bg-[#fde047]"
            style={{ left: '33%' }}
            title="Trạm Phong Ấn 1 (33%)"
          />
          <div
            className="absolute top-0 bottom-0 w-0.5 bg-[#fde047]"
            style={{ left: '66%' }}
            title="Trạm Phong Ấn 2 (66%)"
          />
        </div>
      </div>

      {/* Popover 9-Stage Quick Jump Drawer */}
      {stageDrawerOpen && (
        <div className="absolute top-full mt-1.5 p-2 rounded-lg border border-[#d4af37]/45 bg-[#0b0e17]/95 shadow-2xl grid grid-cols-3 gap-1.5 w-[500px] z-30">
          {SEASON_ORDER.map((sKey, idx) => {
            const sCfg = SEASONS[sKey];
            const active = sKey === seasonId;
            return (
              <button
                key={sKey}
                type="button"
                data-testid={`select-stage-${sKey}`}
                onClick={() => {
                  onSelectSeasonQuick(sKey);
                  setStageDrawerOpen(false);
                }}
                className={`px-2 py-1.5 rounded text-left transition-all cursor-pointer border ${
                  active
                    ? 'bg-[#e11d48]/25 text-[#fde047] border-[#fde047]'
                    : 'bg-[#131824] text-[#cbd5e1] border-[#2c3446] hover:border-[#64748b]'
                }`}
              >
                <div className="text-[10px] font-bold truncate">
                  [{idx + 1}] {sCfg.vietnameseTitle.replace(/^Màn \d+: /, '')}
                </div>
                <div className="text-[8px] text-[#38bdf8] truncate">{sCfg.movementStyleName}</div>
                <div className="text-[8px] text-[#c084fc] truncate">
                  Móc [E]: {sCfg.grappleItemName.split('(')[0].trim()}
                </div>
                <div className="text-[8px] text-[#fda4af] truncate">{sCfg.bossSkillName}</div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
