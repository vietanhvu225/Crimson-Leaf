import React, { useState } from 'react';
import type { TouchInputState } from '../game/engine/entities';
import {
  ELEMENTAL_STANCES,
  type GameLoopRoute,
  type PlayerCombatState,
  SEASONS,
  type SeasonId,
  type SkillBranchId,
} from '../game/rules';
import { BossHealthBar } from './hud/BossHealthBar';
import { ComboPanel } from './hud/ComboPanel';
import { SkillDock } from './hud/SkillDock';
import { StageCompass } from './hud/StageCompass';
import { TouchControls } from './hud/TouchControls';
import { VitalsPanel } from './hud/VitalsPanel';
import { Flame, Snowflake, Zap } from 'lucide-react';

interface GameHUDProps {
  combat: PlayerCombatState;
  trailingHp: number;
  seasonId: SeasonId;
  loopRoute: GameLoopRoute;
  stageProgressPct: number;
  bossHp: number | null;
  bossMaxHp: number | null;
  isPaused: boolean;
  muted: boolean;
  touchInputRef: React.MutableRefObject<TouchInputState>;
  onTogglePause: () => void;
  onToggleMute: () => void;
  onOpenGdd: () => void;
  onQuickRestart: () => void;
  onSelectSeasonQuick: (s: SeasonId) => void;
  onTriggerAwaken: () => void;
  onToggleImmortal: () => void;
  onUpgradeSkill: (branch: SkillBranchId) => void;
  onCycleElement: () => void;
}

export const GameHUD: React.FC<GameHUDProps> = ({
  combat,
  trailingHp,
  seasonId,
  loopRoute,
  stageProgressPct,
  bossHp,
  bossMaxHp,
  isPaused,
  muted,
  touchInputRef,
  onTogglePause,
  onToggleMute,
  onOpenGdd,
  onQuickRestart,
  onSelectSeasonQuick,
  onTriggerAwaken,
  onToggleImmortal,
  onUpgradeSkill,
  onCycleElement,
}) => {
  const [stageDrawerOpen, setStageDrawerOpen] = useState(false);

  const cfg = SEASONS[seasonId];
  const hpPct = Math.max(0, Math.min(100, (combat.hp / combat.maxHp) * 100));
  const trailPct = Math.max(hpPct, Math.min(100, (trailingHp / combat.maxHp) * 100));
  const chakraPct = Math.max(0, Math.min(100, (combat.chakra / combat.maxChakra) * 100));
  const ragePct = Math.max(0, Math.min(100, (combat.rage / combat.maxRage) * 100));
  const isAwakened = combat.awakenedTimer > 0;
  const totalMeters = Math.round(cfg.stageLength / 20);
  const currentMeters = Math.round((stageProgressPct / 100) * totalMeters);
  const activeElem = ELEMENTAL_STANCES[combat.skills.activeElement];

  const totalMartialLevel =
    combat.skills.kodachiLevel +
    combat.skills.kunaiLevel +
    combat.skills.mobilityLevel +
    combat.skills.deflectLevel +
    combat.skills.guardianLevel;

  const renderElementIcon = () => {
    if (combat.skills.activeElement === 'crimson_fire') {
      return <Flame className="w-4 h-4 text-[#fb7185]" />;
    }
    if (combat.skills.activeElement === 'thunder_lightning') {
      return <Zap className="w-4 h-4 text-[#fde047]" />;
    }
    return <Snowflake className="w-4 h-4 text-[#38bdf8]" />;
  };

  return (
    <div className="fixed inset-0 pointer-events-none z-20 flex flex-col justify-between p-2 sm:p-4 select-none">
      {/* TOP BAR: Stacks cleanly on 390px mobile, 3-column on desktop */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-start justify-between gap-2 sm:gap-4 w-full">
        {/* 1. TOP-LEFT: Martial Crest & Skewed Vitality / Chakra / Rage Gauges */}
        <VitalsPanel
          isAwakened={isAwakened}
          onCycleElement={onCycleElement}
          activeElem={activeElem}
          renderElementIcon={renderElementIcon}
          totalMartialLevel={totalMartialLevel}
          combat={combat}
          trailPct={trailPct}
          hpPct={hpPct}
          chakraPct={chakraPct}
          ragePct={ragePct}
          onTriggerAwaken={onTriggerAwaken}
          onToggleImmortal={onToggleImmortal}
        />

        {/* 2. TOP-CENTER: Stage Horizon Compass, Unique Mechanic Badge & Sector Track */}
        <StageCompass
          setStageDrawerOpen={setStageDrawerOpen}
          cfg={cfg}
          loopRoute={loopRoute}
          currentMeters={currentMeters}
          totalMeters={totalMeters}
          stageProgressPct={stageProgressPct}
          stageDrawerOpen={stageDrawerOpen}
          seasonId={seasonId}
          onSelectSeasonQuick={onSelectSeasonQuick}
        />

        {/* 3. TOP-RIGHT: Calligraphic Combo, Score & Lacquer Utility Icons */}
        <ComboPanel
          cfg={cfg}
          currentMeters={currentMeters}
          totalMeters={totalMeters}
          combat={combat}
          onOpenGdd={onOpenGdd}
          onToggleMute={onToggleMute}
          muted={muted}
          onTogglePause={onTogglePause}
          isPaused={isPaused}
          onQuickRestart={onQuickRestart}
        />
      </div>

      {/* BOSS HEALTH BAR WHEN ENGAGED (Docked cleanly below top bar, never covering center gameplay) */}
      {bossHp !== null && bossMaxHp !== null && bossHp > 0 && (
        <BossHealthBar loopRoute={loopRoute} cfg={cfg} bossHp={bossHp} bossMaxHp={bossMaxHp} />
      )}

      {/* BOTTOM BAR: 5-Branch Martial Skill Scroll Dock (Desktop) + Touch Controls (Mobile) */}
      <div className="w-full flex flex-col gap-2">
        <SkillDock seasonId={seasonId} cfg={cfg} combat={combat} onUpgradeSkill={onUpgradeSkill} />

        {/* Mobile Touch Controls */}
        <TouchControls touchInputRef={touchInputRef} seasonId={seasonId} />
      </div>
    </div>
  );
};
