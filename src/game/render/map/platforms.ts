import { type SeasonConfig, type SeasonId, type ZLane, computeSubterraneanSlopeY } from '../../rules';
import { INK } from '../palette';
import { getChibiStagePalette } from './stagePalette';
import type { MapPlatform } from './types';

// Platforms and ground.

/**
 * 6. Renders 2D Anime Cel-Shaded Chibi Platforms & Ground (Chunky Rounded Blocks, Puffy Grass/Snow/Tile Caps, Cute Wood Logs & Bouncy Bamboo Pads).
 */
export function renderChibiPlatforms(
  ctx: CanvasRenderingContext2D,
  platforms: MapPlatform[],
  playerZLane: ZLane,
  camX: number,
  viewW: number,
  seasonId: SeasonId,
  cfg: SeasonConfig,
  isLoop2: boolean
): void {
  const pal = getChibiStagePalette(seasonId, isLoop2);

  // STAGE 10 (EARTH CORE): Render Alternating 45° Diagonal Slopes & 90° Sheer Vertical Drop Shafts!
  if (seasonId === 'earth_core') {
    const slopeStartX = Math.max(160, Math.floor((camX - 80) / 15) * 15);
    const slopeEndX = Math.min(cfg.stageLength - 980, Math.ceil((camX + viewW + 80) / 15) * 15);
    if (slopeEndX > slopeStartX) {
      const samplePts: { x: number; y: number }[] = [];
      for (let sx = slopeStartX; sx <= slopeEndX; sx += 15) {
        const effX = sx - 180;
        const modX = ((effX % 900) + 900) % 900;
        // Insert exact pre-cliff and post-cliff points so the 90° vertical drop is a razor-sharp 90-degree vertical wall!
        if (modX >= 530 && modX <= 550) {
          const cliffX = sx - modX + 540;
          samplePts.push({ x: cliffX, y: computeSubterraneanSlopeY(cliffX - 1) });
          samplePts.push({ x: cliffX, y: computeSubterraneanSlopeY(cliffX + 1) });
        } else {
          samplePts.push({ x: sx, y: computeSubterraneanSlopeY(sx) });
        }
      }

      if (samplePts.length >= 2) {
        ctx.save();

        // 1. Subterranean Bedrock Foundation following the exact 45° slopes and 90° vertical drop walls
        ctx.fillStyle = pal.groundBodyFill;
        ctx.strokeStyle = INK;
        ctx.lineWidth = 3.5;
        ctx.beginPath();
        ctx.moveTo(samplePts[0].x, samplePts[0].y);
        for (let i = 1; i < samplePts.length; i++) {
          ctx.lineTo(samplePts[i].x, samplePts[i].y);
        }
        ctx.lineTo(samplePts[samplePts.length - 1].x, samplePts[samplePts.length - 1].y + 520);
        ctx.lineTo(samplePts[0].x, samplePts[0].y + 520);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // 2. Golden-Amber Tectonic Crust Top Cap along the 45° ramps & 90° vertical walls
        ctx.strokeStyle = pal.groundCapFill;
        ctx.lineWidth = 14;
        ctx.lineJoin = 'round';
        ctx.beginPath();
        ctx.moveTo(samplePts[0].x, samplePts[0].y + 4);
        for (let i = 1; i < samplePts.length; i++) {
          ctx.lineTo(samplePts[i].x, samplePts[i].y + 4);
        }
        ctx.stroke();

        ctx.strokeStyle = '#fde047';
        ctx.lineWidth = 3.5;
        ctx.beginPath();
        ctx.moveTo(samplePts[0].x, samplePts[0].y - 1);
        for (let i = 1; i < samplePts.length; i++) {
          ctx.lineTo(samplePts[i].x, samplePts[i].y - 1);
        }
        ctx.stroke();

        // 3. Matching 45° / 90° Cavern Ceiling overhead (430px above the tunnel floor)
        const ceilOffset = 430;
        ctx.fillStyle = '#1c1008';
        ctx.strokeStyle = INK;
        ctx.lineWidth = 3.2;
        ctx.beginPath();
        ctx.moveTo(samplePts[0].x, samplePts[0].y - ceilOffset - 260);
        for (let i = 1; i < samplePts.length; i++) {
          ctx.lineTo(samplePts[i].x, samplePts[i].y - ceilOffset - 260);
        }
        for (let i = samplePts.length - 1; i >= 0; i--) {
          ctx.lineTo(samplePts[i].x, samplePts[i].y - ceilOffset);
        }
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // 4. Visual Callout Markers for 45° Diagonal Ramps & 90° Sheer Vertical Drop Shafts
        const startCycle = Math.max(0, Math.floor((slopeStartX - 180) / 900));
        const endCycle = Math.floor((slopeEndX - 180) / 900) + 1;
        for (let c = startCycle; c <= endCycle; c++) {
          const rampMidX = 180 + c * 900 + 210;
          if (rampMidX >= slopeStartX && rampMidX <= slopeEndX) {
            const ry = computeSubterraneanSlopeY(rampMidX);
            const depthM = Math.round(120 + c * 180);
            ctx.fillStyle = '#0f172a';
            ctx.strokeStyle = '#fbbf24';
            ctx.lineWidth = 2.4;
            ctx.beginPath();
            ctx.roundRect(rampMidX - 82, ry + 32, 164, 26, 8);
            ctx.fill();
            ctx.stroke();
            ctx.font = 'bold 11px "Be Vietnam Pro", "Plus Jakarta Sans", sans-serif';
            ctx.textAlign = 'center';
            ctx.fillStyle = '#fde047';
            ctx.fillText(`↘ DỐC CHÉO 45° (-${depthM}m)`, rampMidX, ry + 49);
          }

          const cliffX = 180 + c * 900 + 540;
          if (cliffX >= slopeStartX && cliffX <= slopeEndX) {
            const topY = computeSubterraneanSlopeY(cliffX - 2);
            const botY = computeSubterraneanSlopeY(cliffX + 2);
            // Vertical glowing guide arrows inside the 90° drop shaft
            ctx.strokeStyle = 'rgba(251, 191, 36, 0.55)';
            ctx.lineWidth = 3;
            ctx.setLineDash([10, 8]);
            ctx.beginPath();
            ctx.moveTo(cliffX + 44, topY + 10);
            ctx.lineTo(cliffX + 44, botY - 14);
            ctx.stroke();
            ctx.setLineDash([]);

            ctx.fillStyle = '#7c2d12';
            ctx.strokeStyle = '#fde047';
            ctx.lineWidth = 2.4;
            ctx.beginPath();
            ctx.roundRect(cliffX - 12, topY - 46, 174, 26, 8);
            ctx.fill();
            ctx.stroke();
            ctx.font = 'bold 11px "Be Vietnam Pro", "Plus Jakarta Sans", sans-serif';
            ctx.textAlign = 'center';
            ctx.fillStyle = '#fef08a';
            ctx.fillText('⬇ HỐ THẲNG ĐỨNG 90°', cliffX + 75, topY - 29);
          }
        }

        ctx.restore();
      }
    }
  }

  for (const plat of platforms) {
    if (plat.respawnTimer && plat.respawnTimer > 0) continue;
    if (plat.x + plat.w < camX - 100 || plat.x > camX + viewW + 100) continue;

    // On Stage 10 (earth_core), the 45°/90° continuous bedrock polygon already renders the main ground floor cleanly
    if (
      seasonId === 'earth_core' &&
      plat.type === 'ground' &&
      plat.x >= 150 &&
      plat.x < cfg.stageLength - 980
    ) {
      continue;
    }

    const sameLane = plat.zLane === 'both' || plat.zLane === playerZLane;
    ctx.save();
    ctx.globalAlpha = sameLane ? 1 : 0.45;

    const trembleX = plat.collapseTimer && plat.collapseTimer > 0 ? (Math.random() - 0.5) * 6 : 0;
    const px = plat.x + trembleX;
    const py = plat.y;
    const pw = plat.w;

    // UNDERWATER CORAL REEF GARDEN, GIANT LUMINOUS PEARL CLAMS & JELLYFISH BELLS (ZERO dirt/land mounds underwater!)
    if (seasonId === 'ocean_palace' || (cfg.waterLevelY !== null && py >= cfg.waterLevelY + 12)) {
      const cx = px + pw * 0.5;
      if (plat.type === 'ground') {
        // 1. Purely Aquatic Underwater Wonders: Giant Open Pearl Clam Shells, Dragon Palace Jade Pillars & Staghorn Coral Clusters (ZERO dirt/earth mounds!)
        const nodeCount = Math.max(3, Math.floor(pw / 88));
        const nodeStep = pw / nodeCount;
        for (let m = 0; m < nodeCount; m++) {
          const mx = px + (m + 0.5) * nodeStep;
          const rx = nodeStep * 0.48;

          // Trailing Bioluminescent Sea-Anemone & Kelp Roots hanging below into the abyss (NO flat bottom line!)
          for (let r = -2; r <= 2; r++) {
            const rootX = mx + r * (rx * 0.36);
            ctx.strokeStyle = Math.abs(r) % 2 === 0 ? '#06b6d4' : '#10b981';
            ctx.lineWidth = 4.2;
            ctx.lineCap = 'round';
            ctx.beginPath();
            ctx.moveTo(rootX, py + 10);
            ctx.quadraticCurveTo(
              rootX + (r % 2 === 0 ? 9 : -9),
              py + 34,
              rootX,
              py + 62 + (Math.abs(r) % 2) * 16
            );
            ctx.stroke();
          }

          // Swaying Emerald & Cyan Seaweed Kelp Fronds rising upward
          for (const kOff of [-rx * 0.55, rx * 0.55]) {
            const kx = mx + kOff;
            ctx.strokeStyle = m % 2 === 0 ? '#10b981' : '#22d3ee';
            ctx.lineWidth = 5.5;
            ctx.lineCap = 'round';
            ctx.beginPath();
            ctx.moveTo(kx, py + 10);
            ctx.quadraticCurveTo(kx - 10, py - 8, kx + 6, py - 26);
            ctx.quadraticCurveTo(kx + 14, py - 40, kx - 4, py - 54);
            ctx.stroke();
          }

          // Multi-Branched Rose-Pink & Golden Staghorn Coral Trees
          ctx.strokeStyle = INK;
          ctx.lineWidth = 8.5;
          ctx.lineCap = 'round';
          ctx.beginPath();
          ctx.moveTo(mx, py + 8);
          ctx.lineTo(mx, py - 30);
          ctx.moveTo(mx, py - 8);
          ctx.lineTo(mx - 19, py - 26);
          ctx.moveTo(mx, py - 14);
          ctx.lineTo(mx + 19, py - 32);
          ctx.stroke();

          ctx.strokeStyle = m % 2 === 0 ? '#fb7185' : '#fde047';
          ctx.lineWidth = 4.8;
          ctx.stroke();

          // Giant Open Ribbed Pearl Clam Shell & Luminous Dragon Pearl (replaces any dirt/earth mound!)
          // Upper open clam valve
          ctx.fillStyle = m % 2 === 0 ? '#c084fc' : '#38bdf8';
          ctx.strokeStyle = INK;
          ctx.lineWidth = 2.6;
          ctx.beginPath();
          ctx.ellipse(mx - 4, py - 2, rx * 0.78, 12, -0.35, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();

          // Lower scalloped clam valve cradle (full rounded ellipse, no flat dirt bottom!)
          ctx.fillStyle = m % 2 === 0 ? '#f472b6' : '#0284c7';
          ctx.beginPath();
          ctx.ellipse(mx, py + 8, rx * 0.88, 13, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();

          // Glowing Sea Pearl inside every Clam Shell
          ctx.fillStyle = '#fef08a';
          ctx.beginPath();
          ctx.arc(mx + 2, py + 3, 8.5, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
          ctx.fillStyle = '#ffffff';
          ctx.beginPath();
          ctx.arc(mx, py + 1, 3.2, 0, Math.PI * 2);
          ctx.fill();
        }
      } else {
        // 2. Mid-Water Floating Underwater Structure: Giant Bioluminescent Jellyfish Bell & Pearl Clam Cushion (NO rectangular bars!)
        // Trailing Tentacles underneath
        for (let t = -3; t <= 3; t++) {
          const tx = cx + t * (pw * 0.12);
          ctx.strokeStyle = Math.abs(t) % 2 === 0 ? '#67e8f9' : '#f472b6';
          ctx.lineWidth = 3.2;
          ctx.lineCap = 'round';
          ctx.beginPath();
          ctx.moveTo(tx, py + 12);
          ctx.quadraticCurveTo(tx + (t % 2 === 0 ? 8 : -8), py + 28, tx, py + 44);
          ctx.stroke();
        }

        // Translucent Bioluminescent Jellyfish / Sea Anemone Dome
        ctx.fillStyle = '#0891b2';
        ctx.strokeStyle = INK;
        ctx.lineWidth = 3.0;
        ctx.beginPath();
        ctx.ellipse(cx, py + 12, pw * 0.48, 16, 0, Math.PI, 0);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#22d3ee';
        ctx.beginPath();
        ctx.ellipse(cx, py + 9, pw * 0.42, 12, 0, Math.PI, 0);
        ctx.closePath();
        ctx.fill();

        // Glowing Pink-Gold Pearl Crown on top of the Underwater Jellyfish Cushion
        ctx.fillStyle = '#f472b6';
        ctx.beginPath();
        ctx.arc(cx - 18, py + 2, 6, 0, Math.PI * 2);
        ctx.arc(cx + 18, py + 2, 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#fef08a';
        ctx.beginPath();
        ctx.arc(cx, py - 1, 7.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }
      ctx.restore();
      continue;
    }

    // SKY SANCTUARY (MÀN 11): Puffy White & Azure Immortal Cloud Cushions (NEVER draw brown/yellow dirt slabs in the sky!)
    if (seasonId === 'sky_sanctuary') {
      ctx.fillStyle = '#bae6fd';
      ctx.strokeStyle = INK;
      ctx.lineWidth = 2.8;
      ctx.beginPath();
      ctx.roundRect(px + 2, py + 6, pw - 4, 18, 12);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      const puffCount = Math.max(3, Math.floor(pw / 42));
      const puffStep = pw / puffCount;
      for (let i = 0; i <= puffCount; i++) {
        const puffX = px + i * puffStep;
        const puffR = i === 0 || i === puffCount ? 12 : 16;
        ctx.arc(puffX, py + 6, puffR, 0, Math.PI * 2);
      }
      ctx.fill();
      ctx.stroke();
      ctx.restore();
      continue;
    }

    // SUMMER WATER STAGE (MÀN 2): Giant Floating Emerald Lotus Pads & Curved Dragon-Boats on Water (No dirt slabs!)
    if (seasonId === 'summer' && plat.type !== 'roof') {
      ctx.fillStyle = '#047857';
      ctx.strokeStyle = INK;
      ctx.lineWidth = 3.0;
      ctx.beginPath();
      ctx.ellipse(px + pw * 0.5, py + 10, pw * 0.52, 13, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#10b981';
      ctx.beginPath();
      ctx.ellipse(px + pw * 0.5, py + 5, pw * 0.5, 10, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Cute Pink Lotus Bloom on edge of pad
      ctx.fillStyle = '#fb7185';
      ctx.beginPath();
      ctx.arc(px + 24, py - 1, 7, Math.PI, 0);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.restore();
      continue;
    }

    if (plat.type === 'ground') {
      // Chunky Chibi Ground Foundation with Rounded Stone Bricks & Puffy Top Turf Cap
      ctx.fillStyle = pal.groundBodyFill;
      ctx.strokeStyle = INK;
      ctx.lineWidth = 3.2;
      ctx.beginPath();
      ctx.roundRect(px, py, pw, 240, 14);
      ctx.fill();
      ctx.stroke();

      // Cute Cartoon Cobblestone / Brick Blocks along the ground wall
      const brickStep = 76;
      for (let bx = px + 14; bx < px + pw - 50; bx += brickStep) {
        const rowOffset = Math.floor((bx - px) / brickStep) % 2 === 0 ? 24 : 44;
        ctx.fillStyle = pal.groundBrickFill;
        ctx.strokeStyle = INK;
        ctx.lineWidth = 2.2;
        ctx.beginPath();
        ctx.roundRect(bx, py + rowOffset, 44, 20, 7);
        ctx.fill();
        ctx.stroke();
      }

      // Overhanging Puffy Chibi Grass / Snow / Crystal / Magma Crust Cap!
      ctx.fillStyle = pal.groundCapFill;
      ctx.strokeStyle = INK;
      ctx.lineWidth = 3.2;
      ctx.beginPath();
      ctx.roundRect(px - 4, py - 4, pw + 8, 20, 10);
      ctx.fill();
      ctx.stroke();

      // Cute Scalloped Hang-Down Lumps along bottom of turf cap
      const scallopStep = 44;
      for (let sx = px + 18; sx < px + pw - 18; sx += scallopStep) {
        ctx.fillStyle = pal.groundCapFill;
        ctx.beginPath();
        ctx.arc(sx, py + 15, 10, 0, Math.PI);
        ctx.fill();
        ctx.stroke();
      }

      // Top glossy anime highlight stripe along the ground edge
      ctx.fillStyle = pal.groundCapHighlight;
      ctx.beginPath();
      ctx.roundRect(px + 6, py - 1, Math.max(12, pw - 12), 5, 3);
      ctx.fill();
    } else {
      const h = 24;
      let bodyColor = pal.platformBodyFill;
      let capColor = sameLane ? pal.platformCapFill : '#64748b';
      let highlightColor = '#ffffff';

      if (plat.type === 'springboard') {
        bodyColor = '#15803d';
        capColor = '#4ade80';
        highlightColor = '#bbf7d0';
      } else if (plat.type === 'bagua_pad') {
        bodyColor = '#b45309';
        capColor = '#fde047';
        highlightColor = '#fef9c3';
      } else if (plat.type === 'ice') {
        bodyColor = '#0284c7';
        capColor = '#bae6fd';
        highlightColor = '#ffffff';
      } else if (plat.type === 'collapsing') {
        bodyColor = '#9a3412';
        capColor = '#fb923c';
        highlightColor = '#fed7aa';
      } else if (plat.type === 'moving') {
        bodyColor = '#0369a1';
        capColor = '#38bdf8';
        highlightColor = '#e0f2fe';
      } else if (plat.type === 'roof') {
        bodyColor = '#881337';
        capColor = '#f43f5e';
        highlightColor = '#fda4af';
      }

      ctx.fillStyle = bodyColor;
      ctx.strokeStyle = INK;
      ctx.lineWidth = 3;
      ctx.lineJoin = 'round';
      ctx.beginPath();
      ctx.roundRect(px, py + 4, pw, h - 4, 10);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = capColor;
      ctx.beginPath();
      if (plat.type === 'roof') {
        ctx.moveTo(px - 8, py + 4);
        ctx.quadraticCurveTo(px + pw * 0.5, py - 5, px + pw + 8, py + 4);
        ctx.lineTo(px + pw + 3, py + 12);
        ctx.lineTo(px - 3, py + 12);
        ctx.closePath();
      } else {
        ctx.roundRect(px - 3, py - 2, pw + 6, 13, 7);
      }
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = highlightColor;
      ctx.globalAlpha = sameLane ? 0.75 : 0.35;
      ctx.beginPath();
      ctx.roundRect(px + 8, py + 1, Math.max(10, pw - 16), 4, 2);
      ctx.fill();
      ctx.globalAlpha = sameLane ? 1 : 0.45;

      if (plat.type === 'springboard') {
        const cx = px + pw * 0.5;
        ctx.fillStyle = '#fef08a';
        ctx.strokeStyle = INK;
        ctx.lineWidth = 2.2;
        ctx.beginPath();
        ctx.arc(cx, py - 4, 7, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      } else if (plat.type === 'collapsing') {
        const cx = px + pw * 0.5;
        ctx.strokeStyle = INK;
        ctx.lineWidth = 2.4;
        ctx.beginPath();
        ctx.moveTo(cx - 8, py + 2);
        ctx.lineTo(cx, py + 12);
        ctx.lineTo(cx + 6, py + 18);
        ctx.stroke();
      }
    }

    ctx.restore();
  }
}
