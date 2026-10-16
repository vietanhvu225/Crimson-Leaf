import { World } from '../../world';
import { pushPlat } from '../builders';
import { LevelContext } from '../context';
import { HorizontalLayout } from './layout';

// Ground spans, opening platform and boss arena geometry.

export function buildOpeningPlatform(world: World, L: LevelContext, H: HorizontalLayout) {
  // Opening Sanctuary Platform — tailored per stage so each stage's map looks & feels unique from x=0!
  if (L.sId === 'winter') {
    // MÀN 4 (TUYẾT SƠN): Start at the top crest of the Glacier Ski-Slope (Y = 250)!
    pushPlat(world, -120, 250, 440, 'both', 'ice');
  } else if (L.sId === 'ocean_palace') {
    // MÀN 9 (THỦY CUNG): Start floating in open deep water (Y = 320)! Deep coral seabed below at Y = 555
    pushPlat(world, -120, 555, 420, 'both', 'ground');
  } else if (L.sId === 'earth_core') {
    // MÀN 10 (ĐỊA TÂM HOANG CỔ): Alternating 45° Diagonal Downward Slopes & 90° Sheer Vertical Drop Shafts!
    pushPlat(world, -120, 180, 300, 'both', 'ground');
    for (let c = 0; 180 + c * 900 < H.bossArenaStart; c++) {
      const cBaseX = 180 + c * 900;
      const cBaseY = 180 + c * 720;
      // Cliff-edge flat ledge (localX = 420..540) right before the 90° vertical drop
      pushPlat(world, cBaseX + 420, cBaseY + 360, 120, 'both', 'ground');
      // Bottom landing floor of the 90° vertical drop shaft (localX = 540..900)
      pushPlat(world, cBaseX + 540, cBaseY + 720, 360, 'both', 'ground');
    }
  } else if (L.sId === 'sky_sanctuary') {
    // MÀN 11 (CỬU THIÊN KHÔNG CHIẾN): Open-sky aerial combat! Only a small high cloud perch at x=80
    pushPlat(world, 80, 420, 220, 'both', 'bagua_pad');
  } else {
    const openWidth =
      L.sId === 'summer' || L.sId === 'blood_abyss' || L.sId === 'celestial_altar' ? 420 : 620;
    pushPlat(world, -120, 560, openWidth, 'both', H.groundStyle);
  }
}

export function buildGroundSpans(world: World, L: LevelContext, H: HorizontalLayout) {
  // 11 BESPOKE MAP ARCHITECTURES (Each stage has its own non-cloned level geometry!)
  for (let gx = 400; gx < H.bossArenaStart; gx += 480) {
    const segIdx = Math.round(gx / 480);
    const nearGate = world.sealGates.some((g) => Math.abs(gx - g.coord) < 520);

    if (L.sId === 'earth_core') {
      continue;
    }

    if (nearGate) {
      if (L.sId === 'sky_sanctuary') {
        pushPlat(world, gx - 20, 465, 360, 'both', 'bagua_pad');
      } else {
        pushPlat(world, gx - 50, 555, 560, 'both', H.groundStyle);
      }
      continue;
    }

    if (L.sId === 'spring') {
      // MÀN 1 (XUÂN): Stepped Forest Ground + Bamboo Spike Trenches
      if (segIdx % 2 === 0) {
        pushPlat(world, gx, 560, 380, 'both', 'ground');
        world.hazards.push({
          id: world.hazardIdCounter++,
          kind: 'spike_trap',
          x: gx + 140,
          y: 534,
          w: 96,
          h: 26,
          timer: 0,
          period: 1,
          active: true,
        });
      } else {
        pushPlat(world, gx, 545, 220, 'both', 'ground');
        pushPlat(world, gx + 260, 515, 200, 'both', 'roof');
      }
    } else if (L.sId === 'summer') {
      // MÀN 2 (HẠ): Open Flooded Lotus River — Wide Gliding War-Barges & Bouncy Giant Lotus Pads!
      pushPlat(world, gx, 492, 310, 'both', 'moving', {
        moveAmpX: 90,
        moveSpeed: 1.85,
        movePhase: segIdx,
      });
      if (segIdx % 2 === 0) {
        pushPlat(world, gx + 330, 468, 130, 'both', 'springboard');
      }
    } else if (L.sId === 'winter') {
      // MÀN 4 (ĐÔNG): Downhill Glacier Ski-Slope Slalom (Cascading downhill ramps Y=260->330->400->470->535 + Ski-Jump Launchers!)
      const slopeStep = segIdx % 4;
      const slopeY = 265 + slopeStep * 68;
      pushPlat(world, gx - 20, slopeY, 390, 'both', 'ice');
      if (slopeStep === 3) {
        pushPlat(world, gx + 340, slopeY - 12, 130, 'both', 'bagua_pad');
      }
    } else if (L.sId === 'cavern') {
      // MÀN 5 (U MINH ĐỘNG): Lower Bioluminescent Mushroom Islands + Amethyst Warp Pads over Acid!
      pushPlat(world, gx, 515 - (segIdx % 2) * 30, 210, 'both', 'branch');
      pushPlat(world, gx + 250, 465, 155, 'both', segIdx % 2 === 0 ? 'bagua_pad' : 'springboard');
    } else if (L.sId === 'blood_abyss') {
      // MÀN 7 (HUYẾT HẢI LUYỆN NGỤC): Every lower bridge is a Collapsing Red-Hot Iron Grate over Boiling Magma + Forge Pistons!
      pushPlat(world, gx, 510, 230, 'both', 'collapsing');
      pushPlat(world, gx + 265, 450, 175, 'both', 'moving', {
        moveAmpY: 68,
        moveSpeed: 2.2,
        movePhase: segIdx,
      });
    } else if (L.sId === 'ocean_palace') {
      // MÀN 9 (THỦY CUNG): Open Deep-Sea Swimming Arena — Sparse sunken coral reefs on seabed so 360° swimming is unobstructed!
      if (segIdx % 2 === 0) {
        pushPlat(world, gx, 552, 260, 'both', 'ground');
      }
    } else if (L.sId === 'sky_sanctuary') {
      // MÀN 11 (CỬU THIÊN KHÔNG CHIẾN): Open Nine-Heavens Sky — NO ground floor! Only sparse high-altitude Cloud Rings!
      if (segIdx % 2 === 0) {
        pushPlat(world, gx + 60, 440 - (segIdx % 3) * 75, 170, 'both', 'moving', {
          moveAmpY: 55,
          moveSpeed: 1.8,
          movePhase: segIdx,
        });
      }
    } else {
      // MÀN 8 (THIÊN ĐÀN NGUYỆT THỰC): Open Cosmic Void — Starlight Bagua Portals & Drifting Nebula Clouds!
      pushPlat(world, gx, 485 - (segIdx % 2) * 45, 200, 'both', 'moving', {
        moveAmpX: 80,
        moveSpeed: 1.9,
        movePhase: segIdx,
      });
      pushPlat(world, gx + 255, 445, 165, 'both', 'bagua_pad');
    }
  }
}

export function buildBossArenaFloor(world: World, L: LevelContext, H: HorizontalLayout) {
  // BOSS ARENA FLOOR (Except in Sky Sanctuary where the entire final battle & Mother Rescue take place in open sky!)
  if (L.sId === 'sky_sanctuary') {
    pushPlat(world, H.bossArenaStart + 120, 470, 220, 'both', 'bagua_pad');
    pushPlat(world, H.bossArenaStart + 520, 470, 220, 'both', 'bagua_pad');
  } else {
    pushPlat(
      world,
      H.bossArenaStart - 60,
      L.sId === 'earth_core' ? H.earthBossFloorY : 560,
      L.cfg.stageLength - H.bossArenaStart + 260,
      'both',
      H.groundStyle
    );
  }
}

export function buildBossArenaPlatforms(world: World, L: LevelContext, H: HorizontalLayout) {
  // Boss Arena Platforms
  const arenaBaseY = L.sId === 'earth_core' ? H.earthBossFloorY : 560;
  pushPlat(world, L.cfg.stageLength - 760, arenaBaseY - 120, 210, 'both', 'roof');
  pushPlat(world, L.cfg.stageLength - 360, arenaBaseY - 120, 210, 'both', 'roof');
  pushPlat(world, L.cfg.stageLength - 560, arenaBaseY - 245, 210, 'both', 'springboard');
  world.grapples.push({ x: L.cfg.stageLength - 640, y: arenaBaseY - 335 });
  world.grapples.push({ x: L.cfg.stageLength - 280, y: arenaBaseY - 335 });
}
