import React from 'react';
import { type ElementalCombatProfile, type PlayerCombatState, RELIC_CATALOG } from '../../game/rules';
import { Award, Shield } from 'lucide-react';

interface VitalsPanelProps {
  isAwakened: boolean;
  onCycleElement: () => void;
  activeElem: ElementalCombatProfile;
  renderElementIcon: () => React.JSX.Element;
  totalMartialLevel: number;
  combat: PlayerCombatState;
  trailPct: number;
  hpPct: number;
  chakraPct: number;
  ragePct: number;
  onTriggerAwaken: () => void;
  onToggleImmortal: () => void;
}

/** Top-left: martial crest, HP / chakra / rage gauges, element and relics. */
export function VitalsPanel({
  isAwakened,
  onCycleElement,
  activeElem,
  renderElementIcon,
  totalMartialLevel,
  combat,
  trailPct,
  hpPct,
  chakraPct,
  ragePct,
  onTriggerAwaken,
  onToggleImmortal,
}: VitalsPanelProps) {
  return (
    <div className="flex flex-col gap-1.5 pointer-events-auto w-full sm:w-auto">
      <div
        className="flex items-center gap-2.5 sm:gap-3 p-2 sm:p-3 rounded-lg border border-[#d4af37]/35 shadow-2xl w-full sm:w-auto"
        style={{
          background:
            'linear-gradient(135deg, rgba(16, 12, 20, 0.94) 0%, rgba(10, 12, 22, 0.90) 100%)',
          boxShadow: isAwakened
            ? '0 0 28px rgba(225, 29, 72, 0.45), inset 0 0 12px rgba(225, 29, 72, 0.2)'
            : '0 10px 30px rgba(0, 0, 0, 0.65), inset 0 1px 0 rgba(253, 224, 71, 0.18)',
        }}
      >
        {/* Interactive Elemental Stance Medallion ([C]) */}
        <button
          type="button"
          onClick={onCycleElement}
          title={`${activeElem.name}: ${activeElem.desc} (Nhấn [C] để đổi Hệ)`}
          className="relative flex flex-col items-center justify-center w-11 h-11 sm:w-14 sm:h-14 rounded-lg border border-[#d4af37]/50 bg-[#090b12] hover:border-[#fde047] transition-all shrink-0 cursor-pointer"
        >
          <div
            className="w-6 h-6 sm:w-7 sm:h-7 rounded-full flex items-center justify-center border"
            style={{
              borderColor: activeElem.color,
              backgroundColor: `${activeElem.color}20`,
            }}
          >
            {renderElementIcon()}
          </div>
          <span
            className="text-[9px] font-bold tracking-tight mt-0.5"
            style={{ color: activeElem.color }}
          >
            {activeElem.shortName}
          </span>
          <span className="absolute -top-1.5 -right-1.5 px-1 py-0.2 rounded bg-[#1e293b] border border-[#475569] text-[8px] font-mono text-[#e2e8f0]">
            [C]
          </span>
        </button>

        {/* Vitality, Chakra & Rage Bars */}
        <div className="flex flex-col gap-1 flex-1 sm:w-68">
          {/* Header: Sinh Mệnh + Martial Realm Level */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-bold tracking-wider uppercase text-[#f5e6c8]">
                SINH MỆNH
              </span>
              <span className="px-1.5 py-0.2 rounded bg-[#d4af37]/15 border border-[#d4af37]/40 text-[9px] font-semibold text-[#fde68a]">
                Cảnh Giới {totalMartialLevel}
              </span>
              {combat.isImmortal && (
                <span className="px-1.5 py-0.2 rounded bg-[#fde047] text-[#090d16] text-[9px] font-extrabold tracking-tight">
                  ∞ BẤT TỬ
                </span>
              )}
            </div>
            <span className="text-xs font-mono font-bold text-[#f8fafc] tabular-nums">
              {combat.isImmortal ? '∞' : Math.ceil(combat.hp)}
              <span className="text-[#94a3b8]">/{combat.maxHp}</span>
            </span>
          </div>

          {/* Skewed Crimson / Golden Immortal Lacquer HP Bar */}
          <div
            className={`relative h-2.5 sm:h-3 w-full bg-[#07090e] border -skew-x-12 overflow-hidden p-0.5 ${
              combat.isImmortal ? 'border-[#fde047]' : 'border-[#475569]/70'
            }`}
          >
            <div
              className="absolute inset-y-0 left-0 bg-[#fde68a]/80 transition-all duration-150"
              style={{ width: `${combat.isImmortal ? 100 : trailPct}%` }}
            />
            <div
              className="relative h-full transition-all duration-75"
              style={{
                width: `${combat.isImmortal ? 100 : hpPct}%`,
                background: combat.isImmortal
                  ? 'linear-gradient(90deg, #d97706, #f59e0b, #fde047, #fef08a)'
                  : isAwakened
                    ? 'linear-gradient(90deg, #be123c, #fb7185, #fde047)'
                    : 'linear-gradient(90deg, #881337, #e11d48, #fb7185)',
              }}
            />
          </div>

          {/* Skewed Cyan Chakra Bar */}
          <div className="flex items-center justify-between text-[9px] sm:text-[10px]">
            <span className="font-semibold tracking-wider uppercase text-[#7dd3fc]">
              NỘI LỰC (TIÊU & KIẾM KHÍ)
            </span>
            <span className="font-mono font-bold text-[#38bdf8] tabular-nums">
              {combat.isImmortal ? '∞' : Math.floor(combat.chakra)}/{combat.maxChakra}
            </span>
          </div>
          <div className="relative h-1.5 sm:h-2 w-full bg-[#07090e] border border-[#334155] -skew-x-12 overflow-hidden">
            <div
              className="h-full transition-all duration-75"
              style={{
                width: `${combat.isImmortal ? 100 : chakraPct}%`,
                background: isAwakened
                  ? 'linear-gradient(90deg, #e11d48, #fde047)'
                  : 'linear-gradient(90deg, #0369a1, #06b6d4, #67e8f9)',
              }}
            />
          </div>

          {/* Bottom Micro Row: Huyết Nộ + Awaken Button + Bất Tử Toggle Button + Z-Lane */}
          <div className="flex items-center justify-between pt-0.5 gap-1.5">
            <div className="flex items-center gap-1">
              <div className="w-10 sm:w-12 h-1.5 bg-[#090d16] rounded-full overflow-hidden border border-[#334155]">
                <div
                  className="h-full bg-gradient-to-r from-[#e11d48] to-[#fde047]"
                  style={{ width: `${isAwakened ? 100 : ragePct}%` }}
                />
              </div>
              <span className="text-[9px] font-mono text-[#fda4af] tabular-nums">
                {isAwakened ? `${combat.awakenedTimer.toFixed(1)}s` : `${Math.floor(ragePct)}%`}
              </span>
            </div>

            <div className="flex items-center gap-1">
              {!isAwakened && (
                <button
                  type="button"
                  onClick={onTriggerAwaken}
                  className="px-1.5 py-0.5 rounded bg-[#881337]/70 hover:bg-[#be123c] border border-[#f43f5e]/60 text-[9px] font-bold text-[#ffe4e6] transition-colors cursor-pointer"
                >
                  Huyết Ảnh [H]
                </button>
              )}

              <button
                type="button"
                data-testid="immortal-toggle-btn"
                aria-pressed={combat.isImmortal}
                onClick={onToggleImmortal}
                title="Bật / Tắt Kim Thân Bất Tử — Miễn 100% sát thương & vô hạn Nội Lực (Phím B)"
                className={`flex items-center gap-1 px-2 py-0.5 rounded border text-[9px] font-extrabold transition-all cursor-pointer ${
                  combat.isImmortal
                    ? 'bg-gradient-to-r from-[#f59e0b] to-[#fde047] text-[#090d16] border-[#fef08a] shadow-[0_0_12px_rgba(253,224,71,0.75)]'
                    : 'bg-[#78350f]/75 hover:bg-[#b45309] text-[#fef08a] border-[#f59e0b]/80'
                }`}
              >
                <Shield className="w-2.5 h-2.5 shrink-0" />
                <span>{combat.isImmortal ? 'Đang Bất Tử [B]' : 'Bất Tử [B]'}</span>
              </button>
            </div>

            <span className="text-[9px] font-semibold text-[#cbd5e1] shrink-0">
              Z:<strong className="font-mono text-[#fde047] ml-0.5">{combat.zLane}</strong>
            </span>
          </div>
        </div>
      </div>

      {/* Collected Relics Strip */}
      {combat.skills.relics.length > 0 && (
        <div className="hidden sm:flex flex-wrap items-center gap-1 px-2.5 py-1 rounded border border-[#d4af37]/30 bg-[#0b0e17]/90 max-w-xs">
          <Award className="w-3 h-3 text-[#fde047] shrink-0" />
          {combat.skills.relics.map((rId) => {
            const rel = RELIC_CATALOG[rId];
            return (
              <span
                key={rId}
                title={rel.desc}
                className="px-1.5 py-0.5 rounded text-[9px] font-bold border"
                style={{
                  borderColor: `${rel.color}55`,
                  color: rel.color,
                  backgroundColor: `${rel.color}15`,
                }}
              >
                {rel.name}
              </span>
            );
          })}
        </div>
      )}
    </div>
  );
}
