import React from 'react';
import { TouchInputState } from '../../game/engine/entities';
import { SeasonId } from '../../game/rules';

interface TouchControlsProps {
  touchInputRef: React.MutableRefObject<TouchInputState>;
  seasonId: SeasonId;
}

/** On-screen buttons for mobile. */
export function TouchControls({ touchInputRef, seasonId }: TouchControlsProps) {
  return (
    <div className="flex md:hidden items-end justify-between w-full pointer-events-auto pb-1">
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onPointerDown={() => (touchInputRef.current.left = true)}
          onPointerUp={() => (touchInputRef.current.left = false)}
          onPointerLeave={() => (touchInputRef.current.left = false)}
          className="w-12 h-12 rounded-lg bg-[#141824]/90 border border-[#2c3446] text-white font-bold active:bg-[#e11d48]/40"
        >
          ◀
        </button>
        <button
          type="button"
          onPointerDown={() => (touchInputRef.current.right = true)}
          onPointerUp={() => (touchInputRef.current.right = false)}
          onPointerLeave={() => (touchInputRef.current.right = false)}
          className="w-12 h-12 rounded-lg bg-[#141824]/90 border border-[#2c3446] text-white font-bold active:bg-[#e11d48]/40"
        >
          ▶
        </button>
        <button
          type="button"
          onPointerDown={() => (touchInputRef.current.jump = true)}
          onPointerUp={() => {
            if (seasonId === 'ocean_palace') touchInputRef.current.jump = false;
          }}
          className="w-12 h-12 rounded-lg bg-[#141824]/90 border border-[#38bdf8]/50 text-[#38bdf8] text-xs font-bold active:bg-[#38bdf8]/30"
        >
          {seasonId === 'ocean_palace' ? 'BƠI' : 'NHẢY'}
        </button>
      </div>

      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onPointerDown={() => (touchInputRef.current.melee = true)}
          className="w-12 h-12 rounded-lg bg-[#881337]/90 border border-[#f43f5e] text-white text-xs font-bold active:bg-[#e11d48]"
        >
          CHÉM
        </button>
        <button
          type="button"
          onPointerDown={() => (touchInputRef.current.kunai = true)}
          className="w-12 h-12 rounded-lg bg-[#0c4a6e]/90 border border-[#38bdf8] text-[#e0f2fe] text-xs font-bold active:bg-[#0284c7]"
        >
          TIÊU
        </button>
        <button
          type="button"
          onPointerDown={() => (touchInputRef.current.dash = true)}
          className="w-12 h-12 rounded-lg bg-[#141824]/90 border border-[#fbbf24]/60 text-[#fde047] text-xs font-bold active:bg-[#fbbf24]/30"
        >
          LƯỚT
        </button>
      </div>
    </div>
  );
}
