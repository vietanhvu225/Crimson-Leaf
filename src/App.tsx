import { useState, useEffect, useRef, useCallback } from 'react';
import {
  createInitialPlayerCombatState,
  evaluateStageClear,
  type GameLoopRoute,
  type GameStateMode,
  type PlayerCombatState,
  SEASONS,
  type SeasonId,
  type SkillBranchId,
} from './game/rules';
import { soundEngine } from './game/audio';
import { TitleScreen } from './ui/TitleScreen';
import { GameHUD } from './ui/GameHUD';
import { PauseModal, OutcomeModal, type RunSnapshot } from './ui/GameModals';
import { GddModal } from './ui/GddModal';
import { GameView } from './ui/GameView';
import { parseRendererKind } from './game/view';
import type { TouchInputState } from './game/engine/entities';

// Initial state from URL params (?stage=<SeasonId>&loop=1|2&muted=1). Unknown values are ignored.
function readUrlParam(name: string): string | null {
  if (typeof window === 'undefined') return null;
  return new URLSearchParams(window.location.search).get(name);
}

function initialSeasonFromUrl(): SeasonId {
  const stage = readUrlParam('stage');
  return stage && Object.prototype.hasOwnProperty.call(SEASONS, stage) ? (stage as SeasonId) : 'spring';
}

function initialLoopFromUrl(): GameLoopRoute {
  return readUrlParam('loop') === '2' ? 2 : 1;
}

// ?rng=math (parity tests only): the sim shares the page-wide Math.random sequence.
const RNG_MODE: 'seeded' | 'math' = readUrlParam('rng') === 'math' ? 'math' : 'seeded';

// ?seed=<n>: sim RNG seed. Without it a random one is picked (not under rng=math, which must not
// draw from Math.random before the game does).
const SIM_SEED: number = (() => {
  const raw = readUrlParam('seed');
  const n = raw === null ? NaN : Number(raw);
  if (Number.isFinite(n)) return n >>> 0;
  return RNG_MODE === 'math' ? 0 : (Math.random() * 0x100000000) >>> 0;
})();

// ?renderer=canvas (T02 adds three) and ?debug=1 (stats overlay).
const RENDERER = parseRendererKind(readUrlParam('renderer'));
const DEBUG = readUrlParam('debug') === '1';

export default function App() {
  const [gameState, setGameState] = useState<GameStateMode>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('autostart') === '1') {
        return 'playing';
      }
    }
    return 'title';
  });

  const [seasonId, setSeasonId] = useState<SeasonId>(initialSeasonFromUrl);
  const [loopRoute, setLoopRoute] = useState<GameLoopRoute>(initialLoopFromUrl);
  const [resetToken, setResetToken] = useState<number>(0);
  const [awakenTriggerToken, setAwakenTriggerToken] = useState<number>(0);
  const [immortalToggleToken, setImmortalToggleToken] = useState<number>(0);
  const [elementCycleToken, setElementCycleToken] = useState<number>(0);
  const [skillUpgradeRequest, setSkillUpgradeRequest] = useState<{
    token: number;
    branch: SkillBranchId;
  }>({
    token: 0,
    branch: 'kodachi',
  });
  const [muted, setMuted] = useState<boolean>(() => {
    const initial = readUrlParam('muted') === '1';
    if (initial) soundEngine.setMuted(true);
    return initial;
  });
  const [showGddModal, setShowGddModal] = useState<boolean>(false);

  const [combatHud, setCombatHud] = useState<PlayerCombatState>(() =>
    createInitialPlayerCombatState()
  );
  const [trailingHp, setTrailingHp] = useState<number>(100);
  const [stageProgressPct, setStageProgressPct] = useState<number>(0);
  const [bossHp, setBossHp] = useState<number | null>(null);
  const [bossMaxHp, setBossMaxHp] = useState<number | null>(null);
  const [bestScore, setBestScore] = useState<number>(1250);
  const [runSnapshot, setRunSnapshot] = useState<RunSnapshot | null>(null);

  const touchInputRef = useRef<TouchInputState>({
    left: false,
    right: false,
    jump: false,
    melee: false,
    kunai: false,
    dash: false,
    grapple: false,
    switchZ: false,
  });

  // Mirror state machine to document.body.dataset.state
  useEffect(() => {
    document.body.dataset.state = gameState;
  }, [gameState]);

  const startGame = useCallback(() => {
    document.body.dataset.state = 'playing';
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    setShowGddModal(false);
    setRunSnapshot(null);
    setResetToken((t) => t + 1);
    setGameState('playing');
  }, []);

  // Bind Enter and Space on 'title' screen (when GDD modal is closed) to start game
  useEffect(() => {
    if (gameState !== 'title' || showGddModal) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Enter' || e.code === 'Space') {
        e.preventDefault();
        startGame();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [gameState, showGddModal, startGame]);

  const handleSyncHud = useCallback(
    (
      nextCombat: PlayerCombatState,
      nextTrailingHp: number,
      nextProgressPct: number,
      nextBossHp: number | null,
      nextBossMaxHp: number | null
    ) => {
      setCombatHud(nextCombat);
      setTrailingHp(nextTrailingHp);
      setStageProgressPct(nextProgressPct);
      setBossHp(nextBossHp);
      setBossMaxHp(nextBossMaxHp);
      if (nextCombat.score > bestScore) {
        setBestScore(nextCombat.score);
      }
    },
    [bestScore]
  );

  const handleStageOutcome = useCallback(
    (
      outcome: 'victory' | 'defeat',
      finalCombat: PlayerCombatState,
      clearTimeSec: number,
      progressPct: number,
      bossHpRemaining: number
    ) => {
      const updatedBest = Math.max(bestScore, finalCombat.score);
      setBestScore(updatedBest);
      const clearInfo = outcome === 'victory' ? evaluateStageClear(seasonId, loopRoute) : null;

      setRunSnapshot({
        outcome,
        seasonId,
        loopRoute,
        score: finalCombat.score,
        bestScore: updatedBest,
        parryCount: finalCombat.parryCount,
        kills: finalCombat.kills,
        clearTimeSec,
        progressPct,
        bossHpRemaining,
        stageClearInfo: clearInfo,
      });
      document.body.dataset.state = 'gameover';
      setGameState('gameover');
    },
    [bestScore, seasonId, loopRoute]
  );

  const handleTogglePause = useCallback(() => {
    setGameState((prev) => {
      const next = prev === 'playing' ? 'paused' : prev === 'paused' ? 'playing' : prev;
      document.body.dataset.state = next;
      return next;
    });
  }, []);

  const handleQuickRestart = useCallback(() => {
    document.body.dataset.state = 'playing';
    setRunSnapshot(null);
    setResetToken((t) => t + 1);
    setGameState('playing');
  }, []);

  const handleToggleMute = useCallback(() => {
    setMuted((prev) => {
      const next = !prev;
      soundEngine.setMuted(next);
      return next;
    });
  }, []);

  const handleOutcomePrimaryAction = useCallback(() => {
    if (runSnapshot?.outcome === 'victory' && runSnapshot.stageClearInfo) {
      setSeasonId(runSnapshot.stageClearInfo.nextSeason);
      setLoopRoute(runSnapshot.stageClearInfo.nextLoopRoute);
    }
    document.body.dataset.state = 'playing';
    setRunSnapshot(null);
    setResetToken((t) => t + 1);
    setGameState('playing');
  }, [runSnapshot]);

  return (
    <main className="relative w-screen h-screen overflow-hidden bg-[#090a0f] select-none">
      {/* Persistent 2.5D Canvas Engine */}
      <GameView
        gameState={showGddModal && gameState === 'playing' ? 'paused' : gameState}
        seasonId={seasonId}
        loopRoute={loopRoute}
        muted={muted}
        resetToken={resetToken}
        awakenTriggerToken={awakenTriggerToken}
        immortalToggleToken={immortalToggleToken}
        elementCycleToken={elementCycleToken}
        skillUpgradeRequest={skillUpgradeRequest}
        touchInputRef={touchInputRef}
        seed={SIM_SEED}
        rngMode={RNG_MODE}
        renderer={RENDERER}
        debug={DEBUG}
        onSyncHud={handleSyncHud}
        onStageOutcome={handleStageOutcome}
        onTogglePause={handleTogglePause}
        onQuickRestart={handleQuickRestart}
        onToggleMute={handleToggleMute}
        onOpenGdd={() => setShowGddModal(true)}
        onSelectSeasonQuick={(s) => {
          setSeasonId(s);
          setResetToken((t) => t + 1);
        }}
      />

      {/* Title Screen Overlay */}
      {gameState === 'title' && (
        <TitleScreen
          selectedSeason={seasonId}
          selectedLoop={loopRoute}
          onSelectSeason={setSeasonId}
          onSelectLoop={setLoopRoute}
          onStartGame={startGame}
          onOpenGdd={() => setShowGddModal(true)}
        />
      )}

      {/* Active Gameplay HUD */}
      {(gameState === 'playing' || gameState === 'paused') && (
        <GameHUD
          combat={combatHud}
          trailingHp={trailingHp}
          seasonId={seasonId}
          loopRoute={loopRoute}
          stageProgressPct={stageProgressPct}
          bossHp={bossHp}
          bossMaxHp={bossMaxHp}
          isPaused={gameState === 'paused'}
          muted={muted}
          touchInputRef={touchInputRef}
          onToggleMute={handleToggleMute}
          onTogglePause={handleTogglePause}
          onQuickRestart={handleQuickRestart}
          onOpenGdd={() => setShowGddModal(true)}
          onSelectSeasonQuick={(s) => {
            setSeasonId(s);
            setResetToken((t) => t + 1);
          }}
          onUpgradeSkill={(branch) =>
            setSkillUpgradeRequest((prev) => ({ token: prev.token + 1, branch }))
          }
          onCycleElement={() => setElementCycleToken((t) => t + 1)}
          onTriggerAwaken={() => setAwakenTriggerToken((t) => t + 1)}
          onToggleImmortal={() => setImmortalToggleToken((t) => t + 1)}
        />
      )}

      {/* Pause Modal */}
      {gameState === 'paused' && !showGddModal && (
        <PauseModal
          seasonId={seasonId}
          loopRoute={loopRoute}
          onResume={handleTogglePause}
          onRestart={handleQuickRestart}
          onReturnTitle={() => {
            document.body.dataset.state = 'title';
            setGameState('title');
          }}
          onOpenGdd={() => setShowGddModal(true)}
        />
      )}

      {/* Victory / Defeat Modal */}
      {gameState === 'gameover' && runSnapshot && !showGddModal && (
        <OutcomeModal
          snapshot={runSnapshot}
          onPrimaryAction={handleOutcomePrimaryAction}
          onReturnTitle={() => {
            document.body.dataset.state = 'title';
            setGameState('title');
          }}
        />
      )}

      {/* Interactive GDD & Production Roadmap Modal */}
      {showGddModal && (
        <GddModal
          onClose={() => setShowGddModal(false)}
          onLaunchSeason={(s) => {
            setSeasonId(s);
            setShowGddModal(false);
            document.body.dataset.state = 'playing';
            setResetToken((t) => t + 1);
            setGameState('playing');
          }}
        />
      )}
    </main>
  );
}
