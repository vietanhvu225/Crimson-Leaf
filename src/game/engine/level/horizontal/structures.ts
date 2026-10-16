import { computeSubterraneanSlopeY } from '../../../rules/index.ts';
import { spawnWorldItem } from '../../spawn.ts';
import type { World } from '../../world.ts';
import { ITEM_ROTATION, pushPlat } from '../builders.ts';
import type { LevelContext } from '../context.ts';
import type { HorizontalLayout } from './layout.ts';

// Upper stage-specific structures (branches, roofs, lanterns, hazards).

export function buildUpperStructures(world: World, L: LevelContext, H: HorizontalLayout) {
  // Upper Stage-Specific Structures & Distinct Verticality
  for (let x = 320; x < H.bossArenaStart; x += 380) {
    const stepIndex = Math.round(x / 380);
    const inSector2 = x >= H.s1End && x < H.s2End;

    if (
      L.sId === 'spring' ||
      L.sId === 'cavern' ||
      L.sId === 'blood_abyss' ||
      L.sId === 'earth_core'
    ) {
      world.trunks.push({ x, w: 80, zDepth: 0 });
      world.trunks.push({ x: x - 160, w: 118, zDepth: -1 });
    } else if (
      (L.sId === 'summer' ||
        L.sId === 'celestial_altar' ||
        L.sId === 'ocean_palace' ||
        L.sId === 'sky_sanctuary') &&
      stepIndex % 3 === 0
    ) {
      world.trunks.push({ x, w: 68, zDepth: 0 });
    }

    if (L.sId === 'spring') {
      pushPlat(world, x - 85, 445, 175, 'both', 'springboard');
      pushPlat(world, x + 55, 305, 210, stepIndex % 2 === 0 ? 0 : 1, 'branch');
      pushPlat(world, x - 35, 185, 200, 'both', 'branch');
      world.hazards.push({
        id: world.hazardIdCounter++,
        kind: 'updraft',
        x: x + 135,
        y: 160,
        w: 85,
        h: 400,
        timer: 0,
        period: 1,
        active: true,
      });
    } else if (L.sId === 'summer') {
      if (stepIndex % 2 === 0) {
        pushPlat(world, x + 20, 265, 210, 'both', 'roof');
      }
      world.hazards.push({
        id: world.hazardIdCounter++,
        kind: 'geyser',
        x: x + 125,
        y: 235,
        w: 58,
        h: 280,
        timer: (stepIndex * 0.9) % 3.0,
        period: 3.0,
        active: false,
      });
    } else if (L.sId === 'winter') {
      if (stepIndex % 2 === 1) {
        pushPlat(world, x - 40, 195, 230, 'both', 'ice');
      }
      world.hazards.push({
        id: world.hazardIdCounter++,
        kind: 'icicle',
        x: x + 45,
        y: 70,
        w: 44,
        h: 470,
        timer: (stepIndex * 0.7) % 2.6,
        period: 2.6,
        active: false,
        fallY: 70,
      });
    } else if (L.sId === 'cavern') {
      pushPlat(world, x - 90, 165 + (stepIndex % 2) * 22, 285, 'both', 'branch');
      pushPlat(world, x + 30, 315, 175, stepIndex % 2 === 0 ? 1 : 'both', 'branch');
      world.hazards.push({
        id: world.hazardIdCounter++,
        kind: 'updraft',
        x: x - 40,
        y: 110,
        w: 160,
        h: 430,
        timer: 0,
        period: 1,
        active: true,
      });
    } else if (L.sId === 'blood_abyss') {
      pushPlat(world, x - 80, 340, 195, 'both', 'collapsing');
      if (stepIndex % 2 === 0) {
        pushPlat(world, x + 40, 210, 195, 'both', 'roof');
      }
      world.hazards.push({
        id: world.hazardIdCounter++,
        kind: 'geyser',
        x: x + 130,
        y: 230,
        w: 66,
        h: 300,
        timer: (stepIndex * 0.75) % 2.8,
        period: 2.8,
        active: false,
      });
    } else if (L.sId === 'ocean_palace') {
      if (stepIndex % 2 === 0) {
        pushPlat(world, x - 40, 370, 170, 'both', 'moving', {
          moveAmpX: 65,
          moveSpeed: 1.6,
          movePhase: stepIndex,
        });
      }
      world.hazards.push({
        id: world.hazardIdCounter++,
        kind: 'updraft',
        x: x + 125,
        y: 110,
        w: 95,
        h: 420,
        timer: 0,
        period: 1,
        active: true,
      });
    } else if (L.sId === 'earth_core') {
      // MÀN 10 (ĐỊA TÂM HOANG CỔ): Subterranean Mine Cart Ledges & Tectonic Magma Vents (Kept clear of 90° vertical drop shafts!)
      const localCycleX = (((x - 180) % 900) + 900) % 900;
      const slopeY = computeSubterraneanSlopeY(x);
      if (localCycleX < 340 || localCycleX > 680) {
        pushPlat(world, x - 60, Math.max(135, slopeY - 135), 170, 'both', 'roof');
      }
      if (localCycleX > 680) {
        world.hazards.push({
          id: world.hazardIdCounter++,
          kind: 'geyser',
          x: x + 65,
          y: Math.max(180, slopeY - 210),
          w: 58,
          h: 210,
          timer: (stepIndex * 0.8) % 2.9,
          period: 2.9,
          active: false,
        });
      }
    } else if (L.sId === 'sky_sanctuary') {
      // MÀN 11 (CỬU THIÊN KHÔNG CHIẾN): Celestial Wind Currents & Sky Lightning Columns!
      world.hazards.push({
        id: world.hazardIdCounter++,
        kind: stepIndex % 2 === 0 ? 'updraft' : 'lightning',
        x: x + 95,
        y: stepIndex % 2 === 0 ? 90 : 0,
        w: stepIndex % 2 === 0 ? 110 : 58,
        h: 480,
        timer: (stepIndex * 0.85) % 3.2,
        period: 3.2,
        active: stepIndex % 2 === 0,
      });
    } else {
      // celestial_altar: 3-Tier Cosmic Starlight Ring Highway for Sword-Surfing!
      pushPlat(world, x - 80, 315, 195, 'both', 'bagua_pad');
      pushPlat(world, x + 35, 175, 220, 'both', 'moving', {
        moveAmpX: 85,
        moveSpeed: 1.9,
        movePhase: stepIndex,
      });
      world.hazards.push({
        id: world.hazardIdCounter++,
        kind: 'lightning',
        x: x + 90,
        y: 0,
        w: 60,
        h: 560,
        timer: (stepIndex * 0.9) % 3.4,
        period: 3.4,
        active: false,
      });
    }

    const grappleBaseY =
      L.sId === 'earth_core' ? Math.max(115, computeSubterraneanSlopeY(x) - 165) : 225;
    world.grapples.push({ x: x + 110, y: grappleBaseY });
    if (stepIndex % 2 === 0) {
      world.grapples.push({ x: x + 190, y: Math.max(95, grappleBaseY - 95) });
    }

    if (stepIndex >= 4 && stepIndex % 4 === 0) {
      const itemKind = ITEM_ROTATION[(stepIndex / 4) % ITEM_ROTATION.length];
      const itemY =
        L.sId === 'earth_core'
          ? Math.max(140, computeSubterraneanSlopeY(x) - 70)
          : inSector2
            ? 255
            : stepIndex % 2 === 0
              ? 385
              : 255;
      spawnWorldItem(world, itemKind, x + 45, itemY, 'both');
    }
  }
}
