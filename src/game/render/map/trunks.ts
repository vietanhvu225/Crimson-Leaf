import { type SeasonConfig, type SeasonId, computeSubterraneanSlopeY } from '../../rules';
import { INK } from '../palette';
import { drawCleanChibiPuff } from './shapes';
import { getChibiStagePalette } from './stagePalette';
import type { MapTrunk } from './types';

// Foreground trees, bamboo, crystal spires and forge pillars.

/**
 * 2. Renders Stage-Specific World Architecture Pillars / Trunks (zDepth === 0) so each stage has a distinct foreground silhouette!
 */
export function renderChibiWorldTrunks(
  ctx: CanvasRenderingContext2D,
  trunks: MapTrunk[],
  camX: number,
  camY: number,
  viewW: number,
  viewH: number,
  seasonId: SeasonId,
  cfg: SeasonConfig,
  isLoop2: boolean
): void {
  const pal = getChibiStagePalette(seasonId, isLoop2);

  for (const tr of trunks) {
    if (tr.zDepth !== 0) continue;
    if (tr.x + tr.w < camX - 160 || tr.x - tr.w > camX + viewW + 160) continue;

    ctx.save();
    const leftX = tr.x - tr.w * 0.5;
    const topY = camY - 120;
    const totalH = viewH + 240;

    if (seasonId === 'summer') {
      // MÀN 2 (HẠ): Short Red-Lacquered Water-Gate Mooring Posts & Giant Cattail Reeds (Does NOT span top-to-bottom like trees!)
      const postTopY = 250;
      ctx.fillStyle = '#be123c';
      ctx.strokeStyle = INK;
      ctx.lineWidth = 3.2;
      ctx.beginPath();
      ctx.roundRect(tr.x - 22, postTopY, 44, 380, 8);
      ctx.fill();
      ctx.stroke();

      // Golden Copper Cap & Rope Ring on Mooring Post
      ctx.fillStyle = '#fde047';
      ctx.beginPath();
      ctx.roundRect(tr.x - 28, postTopY - 10, 56, 18, 6);
      ctx.fill();
      ctx.stroke();
      ctx.restore();
      continue;
    }

    if (seasonId === 'winter') {
      // MÀN 4 (ĐÔNG): Faceted Translucent Blue Glacier Ice Pillars (Not brown wood!)
      ctx.fillStyle = 'rgba(56, 189, 248, 0.52)';
      ctx.strokeStyle = INK;
      ctx.lineWidth = 3.2;
      ctx.fillRect(leftX + 8, topY, tr.w - 16, totalH);
      ctx.fillStyle = 'rgba(224, 242, 254, 0.65)';
      ctx.fillRect(leftX + 14, topY, 12, totalH);
      ctx.strokeRect(leftX + 8, topY, tr.w - 16, totalH);
      ctx.restore();
      continue;
    }

    if (seasonId === 'celestial_altar') {
      // MÀN 8 (THIÊN ĐÀN): Floating White-Jade Dragon Pillars with Golden Cloud Rings (Suspended in mid-air!)
      const colTop = 140;
      const colH = 380;
      ctx.fillStyle = '#f8fafc';
      ctx.strokeStyle = INK;
      ctx.lineWidth = 3.2;
      ctx.beginPath();
      ctx.roundRect(tr.x - 26, colTop, 52, colH, 12);
      ctx.fill();
      ctx.stroke();

      // Golden Dragon Rings around Jade Pillar
      for (const ry of [colTop + 12, colTop + colH * 0.5, colTop + colH - 22]) {
        ctx.fillStyle = '#fde047';
        ctx.beginPath();
        ctx.roundRect(tr.x - 34, ry, 68, 14, 6);
        ctx.fill();
        ctx.stroke();
      }
      ctx.restore();
      continue;
    }

    if (seasonId === 'ocean_palace') {
      // MÀN 9 (THỦY CUNG): Underwater Dragon Palace Pearl-Inlaid Coral Columns & Seaweed Kelp Ribbons!
      const colTop = 95;
      const colH = 470;
      ctx.fillStyle = '#0e7490';
      ctx.strokeStyle = INK;
      ctx.lineWidth = 3.2;
      ctx.beginPath();
      ctx.roundRect(tr.x - 24, colTop, 48, colH, 14);
      ctx.fill();
      ctx.stroke();

      // Glossy cyan highlight stripe
      ctx.fillStyle = '#67e8f9';
      ctx.fillRect(tr.x - 16, colTop + 10, 8, colH - 20);

      // Rose-Coral Branches & Glowing Sea Pearls along the column
      for (const ry of [colTop + 65, colTop + 210, colTop + 350]) {
        ctx.fillStyle = '#fb7185';
        ctx.beginPath();
        ctx.roundRect(tr.x - 34, ry - 7, 68, 14, 7);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#fef08a';
        ctx.beginPath();
        ctx.arc(tr.x, ry, 7, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }
      ctx.restore();
      continue;
    }

    if (seasonId === 'earth_core') {
      // MÀN 10 (ĐỊA TÂM HOANG CỔ): Heavy Subterranean Mine-Shaft Timber & Iron Support Pillars anchored at 45°/90° tunnel depth!
      const floorY = computeSubterraneanSlopeY(tr.x);
      const colTop = floorY - 430;
      const colH = 440;
      ctx.fillStyle = '#451a03';
      ctx.strokeStyle = INK;
      ctx.lineWidth = 3.2;
      ctx.beginPath();
      ctx.roundRect(tr.x - 24, colTop, 48, colH, 8);
      ctx.fill();
      ctx.stroke();

      // Vertical Amber-Wood Grain Highlight
      ctx.fillStyle = '#92400e';
      ctx.fillRect(tr.x - 14, colTop + 10, 10, colH - 20);

      // Forged Iron Reinforcement Brackets & Glowing Amber Ore Crystals
      for (const ry of [colTop + 70, colTop + 230, colTop + 390]) {
        ctx.fillStyle = '#334155';
        ctx.beginPath();
        ctx.roundRect(tr.x - 30, ry - 8, 60, 16, 5);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#fde047';
        ctx.beginPath();
        ctx.arc(tr.x, ry, 6.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }
      ctx.restore();
      continue;
    }

    if (seasonId === 'sky_sanctuary') {
      // MÀN 11 (CỬU THIÊN KHÔNG CHIẾN): Floating Winged Wind-Totem Obelisks (Thiên Phong Phù Trụ) hovering in mid-air!
      const colTop = 130;
      const colH = 340;
      ctx.fillStyle = '#e0f2fe';
      ctx.strokeStyle = INK;
      ctx.lineWidth = 3.2;
      ctx.beginPath();
      ctx.roundRect(tr.x - 20, colTop, 40, colH, 14);
      ctx.fill();
      ctx.stroke();

      // Golden Winged Wind-Rings around the Floating Sky Obelisk
      for (const ry of [colTop + 45, colTop + 170, colTop + 295]) {
        ctx.fillStyle = '#fde047';
        ctx.beginPath();
        ctx.ellipse(tr.x, ry, 34, 8, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }
      ctx.restore();
      continue;
    }

    // Standard full-height vertical structures for Spring (Sakura Trees), Autumn (Stone Wall Towers), Cavern (Crystal Columns), Thunder Peak (Lightning Rods), Blood Abyss (Iron Chains/Forge Pillars)
    ctx.fillStyle = pal.trunkFill;
    ctx.strokeStyle = INK;
    ctx.lineWidth = 3.2;
    ctx.fillRect(leftX, topY, tr.w, totalH);

    ctx.fillStyle = pal.trunkHighlight;
    ctx.fillRect(leftX + 5, topY, Math.max(6, tr.w * 0.18), totalH);
    ctx.fillStyle = pal.trunkShade;
    ctx.fillRect(leftX + tr.w * 0.72, topY, tr.w * 0.28, totalH);

    ctx.beginPath();
    ctx.moveTo(leftX, topY);
    ctx.lineTo(leftX, topY + totalH);
    ctx.moveTo(leftX + tr.w, topY);
    ctx.lineTo(leftX + tr.w, topY + totalH);
    ctx.stroke();

    const stepY = 125;
    const firstRingY = Math.floor((camY - 100) / stepY) * stepY;
    for (let ry = firstRingY; ry < camY + viewH + 100; ry += stepY) {
      const side = Math.abs(Math.round(ry / stepY)) % 2 === 0 ? 1 : -1;
      const sideX = tr.x + side * (tr.w * 0.56);

      if (seasonId === 'cavern') {
        ctx.fillStyle = pal.canopyPrimary;
        ctx.strokeStyle = INK;
        ctx.lineWidth = 2.6;
        ctx.lineJoin = 'round';
        ctx.beginPath();
        ctx.moveTo(tr.x + side * (tr.w * 0.45), ry + 6);
        ctx.lineTo(sideX + side * 18, ry - 16);
        ctx.lineTo(sideX + side * 6, ry - 26);
        ctx.lineTo(tr.x + side * (tr.w * 0.45), ry - 12);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      } else if (
        seasonId === 'blood_abyss' ||
        seasonId === 'thunder_peak' ||
        seasonId === 'autumn'
      ) {
        ctx.fillStyle = '#1f2937';
        ctx.strokeStyle = INK;
        ctx.lineWidth = 2.8;
        ctx.beginPath();
        ctx.roundRect(leftX - 5, ry - 8, tr.w + 10, 16, 5);
        ctx.fill();
        ctx.stroke();

        for (const rOff of [-tr.w * 0.28, 0, tr.w * 0.28]) {
          ctx.fillStyle = pal.canopySecondary;
          ctx.beginPath();
          ctx.arc(tr.x + rOff, ry, 4, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
        }
      } else {
        // Spring Giant Sakura Trunk with Pink Blossom Clusters
        ctx.fillStyle = pal.trunkHighlight;
        ctx.strokeStyle = INK;
        ctx.lineWidth = 2.6;
        ctx.beginPath();
        ctx.roundRect(leftX - 4, ry - 5, tr.w + 8, 10, 5);
        ctx.fill();
        ctx.stroke();

        drawCleanChibiPuff(ctx, sideX, ry - 18, 0.95, pal.canopyPrimary, pal.canopySecondary);
      }
    }

    ctx.restore();
  }
}
