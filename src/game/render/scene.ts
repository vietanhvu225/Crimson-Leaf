import type { World } from '../engine/world';
import { SEASONS } from '../rules';
import { renderEnemyBot } from './characters/enemy';
import { renderCaptiveMotherShrine } from './characters/motherShrine';
import { renderProtagonist } from './characters/protagonist';
import {
  drawAimReticle,
  drawBanners,
  drawGrappleRope,
  drawLightningArcs,
  drawParticles,
} from './effects';
import type { RenderFrame } from './frame';
import { drawBloodOrbs, drawWorldItems } from './items';
import { renderChibiBackdrop } from './map/backdrop';
import { renderChibiCheckpoints, renderChibiSealGates } from './map/gates';
import { renderChibiHazards } from './map/hazards';
import { renderChibiGrappleLanterns } from './map/lanterns';
import { renderChibiPlatforms } from './map/platforms';
import { renderChibiWorldTrunks } from './map/trunks';
import { renderChibiWaterOrMagma } from './map/water';
import { drawProjectiles } from './projectiles';

// Canvas 2D renderer: draws the whole world for one frame.

export function renderScene(ctx: CanvasRenderingContext2D, world: World) {
  const st = world.stateRef.current;
  const cfg = SEASONS[st.seasonId];
  const isLoop2 = st.loopRoute === 2;
  const r: RenderFrame = { st, cfg, isLoop2 };
  // Smooth damped sinusoidal shake instead of per-frame random jitter
  const shakeMag = Math.min(4.5, world.cameraTrauma * world.cameraTrauma * 6);
  const shakeX = Math.sin(world.stageTimeSec * 42) * shakeMag;
  const shakeY = Math.cos(world.stageTimeSec * 36) * shakeMag;
  ctx.save();
  // 1-3. Chibi Cel-Shaded Sky, Expressive Moon, Puffy Clouds, Rolling Cartoon Hills & Background Trees
  renderChibiBackdrop(
    ctx,
    world.viewW,
    world.viewH,
    world.camX,
    world.camY,
    world.stageTimeSec,
    st.seasonId,
    cfg,
    isLoop2,
    world.combat.awakenedTimer > 0,
    world.trunks
  );
  // World Camera Transform (rounded to crisp half-pixel to eliminate sub-pixel shimmer)
  ctx.translate(Math.round(-world.camX + shakeX), Math.round(-world.camY + shakeY));
  // 4. Main Z=0 Chibi Trees, Bamboo Stalks, Crystal Spires & Forge Pillars
  renderChibiWorldTrunks(
    ctx,
    world.trunks,
    world.camX,
    world.camY,
    world.viewW,
    world.viewH,
    st.seasonId,
    cfg,
    isLoop2
  );
  // 4A. Chibi Stage Environmental Hazard Zones (Puffy Updrafts, Chunky Spikes, Bubbly Geysers, Icicles, Storm Cloud Lightning)
  renderChibiHazards(
    ctx,
    world.hazards,
    world.camX,
    world.viewW,
    world.stageTimeSec,
    st.seasonId
  );
  // 4B. Chibi Sacred Torii Gate Checkpoints
  renderChibiCheckpoints(ctx, world.checkpoints, world.camX, world.viewW, world.stageTimeSec);
  // 4C. Chibi Seal Gates (Kết Giới Phong Ấn)
  renderChibiSealGates(
    ctx,
    world.sealGates,
    (gateId) => world.enemies.filter((e) => e.gateId === gateId && e.hp > 0).length,
    cfg.scrollMode,
    world.camX,
    world.viewW,
    world.stageTimeSec
  );
  // 5. Chibi 2D Anime Cel-Shaded Platforms & Ground
  renderChibiPlatforms(
    ctx,
    world.platforms,
    world.combat.zLane,
    world.camX,
    world.viewW,
    st.seasonId,
    cfg,
    isLoop2
  );
  // 6. Stage-Specific Chibi Grapple Anchor Items ([E])
  renderChibiGrappleLanterns(
    ctx,
    world.grapples,
    world.camX,
    world.viewW,
    world.stageTimeSec,
    st.seasonId
  );
  drawGrappleRope(ctx, world, r);
  drawWorldItems(ctx, world);
  drawBloodOrbs(ctx, world);
  // 8. Chibi Cel-Shaded Martial Enemies, Elite Sub-Bosses & Stage Bosses
  for (const en of world.enemies) {
    if (en.hp <= 0 && en.koTimer <= 0) continue;
    if (en.x < world.camX - 150 || en.x > world.camX + world.viewW + 150) continue;
    renderEnemyBot(ctx, en, world.combat, world.stageTimeSec, cfg.accentColor, st.seasonId);
  }
  // 8B. Final Stage (sky_sanctuary): Captive Mother Shrine at the Golden Cloud Altar!
  if (st.seasonId === 'sky_sanctuary') {
    const stageBoss = world.enemies.find((e) => e.archetype === 'boss');
    const bossAlive = Boolean(!stageBoss || stageBoss.hp > 0);
    renderCaptiveMotherShrine(ctx, cfg.stageLength - 185, 320, bossAlive, world.stageTimeSec);
  }
  // 9. Protagonist: 2D Anime Cel-Shaded Chibi Warrior (with Stage-Specific Swimming / Flying Sword / Ski-Charge Stance)
  renderProtagonist(ctx, world.player, world.combat, world.stageTimeSec, st.seasonId);
  drawProjectiles(ctx, world);
  drawLightningArcs(ctx, world);
  // 11. Scalloped Chibi Cartoon Water / Crystal Stream / Bubbling Magma Sea
  const renderWaterY =
    cfg.waterLevelY !== null
      ? st.seasonId === 'summer'
        ? cfg.waterLevelY + Math.sin(world.stageTimeSec * 1.35) * 38
        : cfg.waterLevelY
      : null;
  renderChibiWaterOrMagma(
    ctx,
    renderWaterY,
    world.camX,
    world.viewW,
    world.stageTimeSec,
    st.seasonId,
    isLoop2
  );
  drawParticles(ctx, world);
  drawBanners(ctx, world);
  drawAimReticle(ctx, world, r);
  ctx.restore();
}
