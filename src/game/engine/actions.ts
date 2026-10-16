import { soundEngine } from '../audio';
import { spawnBanner, spawnParticle } from './spawn';
import { syncHud } from './hud';
import { World } from './world';
import {
  PHYSICS_CONSTANTS,
  SEASONS,
  SkillBranchId,
  SKILL_DESCRIPTIONS,
  ELEMENTAL_STANCES,
  upgradeSkillBranch,
  cycleElementalStance,
  toggleImmortality,
  computeSubterraneanSlopeY,
} from '../rules';

// Player-triggered actions: awakening, skill upgrades, element cycling, cheats.

export function triggerAwakening(world: World) {
  if (world.combat.awakenedTimer > 0) return;
  if (world.combat.rage >= 50 || world.combat.awakenedTimer === 0) {
    const duration = world.combat.skills.relics.includes('dragon_seal')
      ? PHYSICS_CONSTANTS.AWAKENING_DURATION + 4
      : PHYSICS_CONSTANTS.AWAKENING_DURATION;
    world.combat.awakenedTimer = duration;
    world.combat.rage = 0;
    world.cameraTrauma = 0.65;
    soundEngine.playAwakening();
    spawnBanner(world, world.player.x, world.player.y - 70, 'HUYẾT ẢNH THỨC TỈNH!', '#f43f5e');
    for (let i = 0; i < 28; i++) {
      const ang = (Math.PI * 2 * i) / 28;
      spawnParticle(
        world,
        world.player.x,
        world.player.y - 24,
        Math.cos(ang) * 260,
        Math.sin(ang) * 260,
        5,
        '#fb7185',
        0.55,
        'spark'
      );
    }
  }
}

export function upgradeSkill(world: World, branch: SkillBranchId) {
  const res = upgradeSkillBranch(world.combat, branch, false);
  if (res.upgraded) {
    world.combat = res.nextState;
    const meta = SKILL_DESCRIPTIONS[branch];
    const tierName = meta.tierNames[res.newLevel - 1];
    soundEngine.playSkillUpgrade();
    spawnBanner(
      world,
      world.player.x,
      world.player.y - 72,
      `${meta.shortName.toUpperCase()} LV.${res.newLevel}: ${tierName.toUpperCase()}!`,
      meta.color
    );
    for (let i = 0; i < 20; i++) {
      const ang = (Math.PI * 2 * i) / 20;
      spawnParticle(
        world,
        world.player.x,
        world.player.y - 28,
        Math.cos(ang) * 210,
        Math.sin(ang) * 210,
        4.5,
        meta.color,
        0.45,
        'spark'
      );
    }
  } else {
    spawnBanner(
      world,
      world.player.x,
      world.player.y - 60,
      'CHƯA ĐỦ ĐIỂM BÍ KÍP CẦN THIẾT!',
      '#fbbf24'
    );
  }
}

export function cycleElement(world: World) {
  world.combat = cycleElementalStance(world.combat);
  const meta = ELEMENTAL_STANCES[world.combat.skills.activeElement];
  soundEngine.playItemPickup();
  spawnBanner(
    world,
    world.player.x,
    world.player.y - 68,
    `CHUYỂN HỆ: ${meta.name.toUpperCase()}`,
    meta.color
  );
}

export function toggleImmortal(world: World) {
  world.combat = toggleImmortality(world.combat);
  world.trailingHp = world.combat.hp;
  if (world.combat.isImmortal) {
    soundEngine.playAwakening();
    spawnBanner(
      world,
      world.player.x,
      world.player.y - 72,
      'KIM THÂN BẤT TỬ: ĐÃ BẬT (MIỄN 100% SÁT THƯƠNG)!',
      '#fde047'
    );
    for (let i = 0; i < 24; i++) {
      const ang = (Math.PI * 2 * i) / 24;
      spawnParticle(
        world,
        world.player.x,
        world.player.y - 28,
        Math.cos(ang) * 230,
        Math.sin(ang) * 230,
        4.8,
        '#fde047',
        0.5,
        'spark'
      );
    }
  } else {
    soundEngine.playItemPickup();
    spawnBanner(world, world.player.x, world.player.y - 68, 'KIM THÂN BẤT TỬ: ĐÃ TẮT', '#94a3b8');
  }

  syncHud(world);
}

export function teleportToBoss(world: World) {
  const st = world.stateRef.current;
  const cfg = SEASONS[st.seasonId];
  for (const g of world.sealGates) {
    g.unlocked = true;
  }
  if (cfg.scrollMode === 'horizontal') {
    world.player.x = cfg.stageLength - 680;
    world.player.y =
      st.seasonId === 'earth_core'
        ? computeSubterraneanSlopeY(world.player.x) - 20
        : st.seasonId === 'ocean_palace' || st.seasonId === 'sky_sanctuary'
          ? 320
          : 440;
  } else {
    world.player.x = 360;
    world.player.y = 320;
  }
  world.player.vx = 0;
  world.player.vy = 0;
  world.player.onGround = st.seasonId !== 'ocean_palace' && st.seasonId !== 'sky_sanctuary';
  world.camX =
    cfg.scrollMode === 'horizontal' ? Math.max(0, world.player.x - world.viewW * 0.32) : 0;
  world.camY =
    cfg.scrollMode === 'vertical'
      ? Math.max(0, world.player.y - world.viewH * 0.6)
      : st.seasonId === 'earth_core'
        ? Math.max(0, world.player.y - world.viewH * 0.52)
        : 0;
  soundEngine.playAwakening();
  spawnBanner(
    world,
    world.player.x,
    world.player.y - 68,
    `KHIÊU CHIẾN TRÙM: ${cfg.bossName.toUpperCase()}!`,
    '#fde047'
  );
}
