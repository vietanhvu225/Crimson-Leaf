import {
  type PlayerCombatState,
  SKILL_BRANCH_ORDER,
  SKILL_DESCRIPTIONS,
  type SkillBranchId,
  getBranchLevelKey,
  getSkillUpgradeCost,
  type SeasonConfig,
  type SeasonId,
} from '../../game/rules';
import { Sparkles } from 'lucide-react';

interface SkillDockProps {
  seasonId: SeasonId;
  cfg: SeasonConfig;
  combat: PlayerCombatState;
  onUpgradeSkill: (branch: SkillBranchId) => void;
}

/** Desktop skill-scroll dock with the five upgrade branches. */
export function SkillDock({ seasonId, cfg, combat, onUpgradeSkill }: SkillDockProps) {
  return (
    <div className="hidden md:flex items-end justify-between w-full pointer-events-none">
      {/* Compact Controls Legend — adapts for Underwater Swimming in Stage 9 and shows Stage Grapple Item */}
      <div
        data-testid="controls-legend"
        className="px-3 py-2 rounded-lg border border-[#2c3446] text-[11px] text-[#cbd5e1] flex items-center gap-2.5"
        style={{ backgroundColor: 'rgba(10, 12, 20, 0.88)' }}
      >
        {seasonId === 'ocean_palace' ? (
          <>
            <span>
              <strong className="text-[#38bdf8]">[W/S/A/D]</strong> Bơi Thủy Chiến 360°
            </span>
            <span className="text-[#475569]">·</span>
            <span>
              <strong className="text-[#fde047]">[Shift]</strong> Phóng Thủy Ngư Lôi
            </span>
            <span className="text-[#475569]">·</span>
          </>
        ) : null}
        <span>
          <strong className="text-[#fb7185]">[J/LMB]</strong> Kiếm & Parry
        </span>
        <span className="text-[#475569]">·</span>
        <span>
          <strong className="text-[#38bdf8]">[K/RMB]</strong> Phi Tiêu 360°
        </span>
        <span className="text-[#475569]">·</span>
        {seasonId !== 'ocean_palace' && (
          <>
            <span>
              <strong className="text-[#fde047]">[Shift]</strong> Lướt
            </span>
            <span className="text-[#475569]">·</span>
          </>
        )}
        <span>
          <strong className="text-[#c084fc]">[E]</strong> {cfg.grappleItemName.split('(')[0].trim()}
        </span>
        <span className="text-[#475569]">·</span>
        <span>
          <strong className="text-[#34d399]">[Q]</strong> Làn Z
        </span>
      </div>

      {/* 5-Branch Martial Medallion Dock with Progressive Upgrade Costs */}
      <div
        className="pointer-events-auto flex items-center gap-2 p-2 rounded-lg border border-[#d4af37]/40 shadow-2xl"
        style={{
          background:
            'linear-gradient(180deg, rgba(16, 14, 24, 0.94) 0%, rgba(9, 11, 18, 0.94) 100%)',
        }}
      >
        <div className="flex flex-col items-center justify-center px-2.5 py-1 rounded bg-[#181320] border border-[#d4af37]/40">
          <div className="flex items-center gap-1 text-[10px] font-bold text-[#fde047]">
            <Sparkles className="w-3 h-3" />
            <span>BÍ KÍP</span>
          </div>
          <span className="text-base font-extrabold font-mono text-white tabular-nums">
            {combat.skills.unspentScrolls}
          </span>
        </div>

        {SKILL_BRANCH_ORDER.map((branch) => {
          const meta = SKILL_DESCRIPTIONS[branch];
          const lv = combat.skills[getBranchLevelKey(branch)];
          const cost = getSkillUpgradeCost(lv);
          const canUpgrade = lv < 5 && combat.skills.unspentScrolls >= cost;

          return (
            <button
              key={branch}
              type="button"
              onClick={() => onUpgradeSkill(branch)}
              disabled={!canUpgrade}
              title={`${meta.name} (Lv.${lv}/5): ${meta.tierBonuses[lv - 1]}${
                lv < 5 ? ` — Nâng lên Lv.${lv + 1} cần ${cost} Bí Kíp` : ' (Đã đạt Tối Đa)'
              }`}
              className={`flex flex-col justify-between px-2.5 py-1.5 rounded-md border text-left transition-all min-w-[118px] ${
                canUpgrade
                  ? 'bg-[#1e1b2e] border-[#fde047] hover:bg-[#2d2644] cursor-pointer shadow-[0_0_12px_rgba(253,224,71,0.28)]'
                  : 'bg-[#0d111a]/90 border-[#262f42] opacity-85 cursor-default'
              }`}
            >
              <div className="flex items-center justify-between gap-1.5 w-full">
                <span className="text-[10px] font-bold" style={{ color: meta.color }}>
                  [{meta.hotkey}] {meta.shortName}
                </span>
                <span className="text-[9px] font-mono text-[#fde68a]">
                  {lv < 5 ? `${cost} BK` : 'MAX'}
                </span>
              </div>

              {/* 5 Level Diamond Pips */}
              <div className="flex items-center justify-between mt-1">
                <div className="flex items-center gap-0.5">
                  {[1, 2, 3, 4, 5].map((pip) => (
                    <span
                      key={pip}
                      className="w-2 h-2 rounded-xs transition-colors"
                      style={{
                        backgroundColor: pip <= lv ? meta.color : '#1e293b',
                        border: pip <= lv ? 'none' : '1px solid #334155',
                      }}
                    />
                  ))}
                </div>
                <span className="text-[9px] font-mono font-bold text-[#e2e8f0]">Lv.{lv}</span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
