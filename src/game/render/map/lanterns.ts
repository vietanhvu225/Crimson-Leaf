import { SeasonId } from '../../rules';
import { INK } from '../palette';
import { MapGrapplePoint } from './types';

// Stage-specific grapple anchor items.

/**
 * 7. Renders Stage-Specific Chibi Grapple Anchor Items ([E]) matching each of the 9 maps' authentic theme!
 * (No generic paper lanterns: Sakura Wind-Chime, Lotus Gourd Buoy, Bronze War-Bell, Frost-Crystal Prism,
 *  Amethyst Geode Cluster, Raijin Thunder-Orb, Hellfire Chain-Cage, Celestial Jade Bi-Disc, and Giant Clam Pearl & Starfish!)
 */
export function renderChibiGrappleLanterns(
  ctx: CanvasRenderingContext2D,
  grapples: MapGrapplePoint[],
  camX: number,
  viewW: number,
  stageTimeSec: number,
  seasonId: SeasonId = 'spring'
): void {
  for (const g of grapples) {
    if (g.x < camX - 80 || g.x > camX + viewW + 80) continue;
    ctx.save();

    const sway = Math.sin(stageTimeSec * 3.5 + g.x * 0.02) * 2.5;

    // 1. Stage-specific tether / chain / kelp / levitation aura above anchor
    if (seasonId === 'ocean_palace') {
      // Wavy Emerald Seaweed Kelp Tether & Rising Mini Bubbles
      ctx.strokeStyle = '#10b981';
      ctx.lineWidth = 3.2;
      ctx.beginPath();
      ctx.moveTo(g.x, g.y - 38);
      ctx.quadraticCurveTo(g.x + sway * 1.6, g.y - 25, g.x + sway, g.y - 10);
      ctx.stroke();
    } else if (seasonId === 'celestial_altar') {
      // Levitating Astral Ring — no ceiling wire! Draw a floating golden star-ring above
      ctx.strokeStyle = '#fde047';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.ellipse(g.x + sway * 0.5, g.y - 18, 12, 3.5, 0, 0, Math.PI * 2);
      ctx.stroke();
    } else if (seasonId === 'blood_abyss' || seasonId === 'autumn') {
      // Forged Iron Chain Links
      ctx.strokeStyle = INK;
      ctx.lineWidth = 3.6;
      ctx.beginPath();
      ctx.moveTo(g.x, g.y - 38);
      ctx.lineTo(g.x + sway * 0.6, g.y - 12);
      ctx.stroke();
      ctx.strokeStyle = '#94a3b8';
      ctx.lineWidth = 1.6;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(g.x, g.y - 38);
      ctx.lineTo(g.x + sway * 0.6, g.y - 12);
      ctx.stroke();
      ctx.setLineDash([]);
    } else {
      ctx.strokeStyle = INK;
      ctx.lineWidth = 2.8;
      ctx.beginPath();
      ctx.moveTo(g.x, g.y - 38);
      ctx.lineTo(g.x + sway * 0.6, g.y - 12);
      ctx.stroke();
    }

    // 2. Stage-specific radial glow halo
    const haloInner =
      seasonId === 'ocean_palace'
        ? 'rgba(103, 232, 249, 0.85)'
        : seasonId === 'winter'
          ? 'rgba(186, 230, 253, 0.85)'
          : seasonId === 'cavern'
            ? 'rgba(232, 121, 249, 0.82)'
            : seasonId === 'thunder_peak'
              ? 'rgba(254, 240, 138, 0.9)'
              : seasonId === 'summer'
                ? 'rgba(110, 231, 183, 0.82)'
                : 'rgba(254, 240, 138, 0.85)';
    const haloOuter =
      seasonId === 'ocean_palace'
        ? 'rgba(6, 182, 212, 0.32)'
        : seasonId === 'winter'
          ? 'rgba(56, 189, 248, 0.32)'
          : seasonId === 'cavern'
            ? 'rgba(168, 85, 247, 0.35)'
            : seasonId === 'thunder_peak'
              ? 'rgba(99, 102, 241, 0.38)'
              : seasonId === 'blood_abyss'
                ? 'rgba(239, 68, 68, 0.42)'
                : 'rgba(251, 113, 133, 0.35)';

    const halo = ctx.createRadialGradient(g.x, g.y, 4, g.x, g.y, 35);
    halo.addColorStop(0, haloInner);
    halo.addColorStop(0.55, haloOuter);
    halo.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = halo;
    ctx.beginPath();
    ctx.arc(g.x, g.y, 35, 0, Math.PI * 2);
    ctx.fill();

    ctx.translate(g.x + sway, g.y);
    ctx.lineJoin = 'round';

    // 3. Draw bespoke Chibi item per stage!
    if (seasonId === 'ocean_palace') {
      // MÀN 9 (THỦY CUNG): Bioluminescent Giant Clam Shell cradling a Glowing Moon-Pearl & Coral Starfish!
      // Upper Scalloped Clam Shell Valve
      ctx.fillStyle = '#0e7490';
      ctx.strokeStyle = INK;
      ctx.lineWidth = 2.6;
      ctx.beginPath();
      ctx.arc(0, -2, 14, Math.PI, 0);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Lower Open Clam Shell Cradle
      ctx.fillStyle = '#22d3ee';
      ctx.beginPath();
      ctx.ellipse(0, 5, 15, 7.5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Inner Mother-of-Pearl Pink Shell Cavity
      ctx.fillStyle = '#fda4af';
      ctx.beginPath();
      ctx.ellipse(0, 2, 11, 5, 0, 0, Math.PI * 2);
      ctx.fill();

      // Radiant Abyssal Moon-Pearl (Dạ Minh Châu) in the center!
      ctx.fillStyle = '#fef08a';
      ctx.strokeStyle = INK;
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.arc(0, 0, 7.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(-2.5, -2.5, 2.8, 0, Math.PI * 2);
      ctx.fill();

      // Cute Rose-Coral Starfish Clasp on top of the shell
      ctx.fillStyle = '#fb7185';
      ctx.beginPath();
      ctx.arc(-9, -9, 4.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    } else if (seasonId === 'spring') {
      // MÀN 1 (XUÂN): Sakura Glass Wind-Chime Bell (Chuông Gió Anh Đào) & Fluttering Tanzaku Petal Strip!
      ctx.fillStyle = '#f472b6';
      ctx.strokeStyle = INK;
      ctx.lineWidth = 2.6;
      ctx.beginPath();
      ctx.arc(0, -2, 12, Math.PI, 0);
      ctx.lineTo(12, 5);
      ctx.lineTo(-12, 5);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Glossy Sakura Rim & Highlight
      ctx.fillStyle = '#fbcfe8';
      ctx.beginPath();
      ctx.roundRect(-10, -1, 20, 4, 2);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(-4.5, -6, 2.8, 0, Math.PI * 2);
      ctx.fill();

      // Golden Clapper Bead & Fluttering Pink Tanzaku Paper Tag below bell
      ctx.fillStyle = '#fde047';
      ctx.beginPath();
      ctx.arc(0, 7, 3.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#ffe4e6';
      ctx.beginPath();
      ctx.roundRect(-4.5, 11, 9, 14, 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#f43f5e';
      ctx.beginPath();
      ctx.arc(0, 18, 2.2, 0, Math.PI * 2);
      ctx.fill();
    } else if (seasonId === 'summer') {
      // MÀN 2 (HẠ): Floating Jade Lotus Gourd Buoy & Brass Mooring Ring (Phù Tiêu Hồ Lô Đồng)!
      ctx.fillStyle = '#10b981';
      ctx.strokeStyle = INK;
      ctx.lineWidth = 2.6;
      ctx.beginPath();
      ctx.arc(0, -7, 7.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#34d399';
      ctx.beginPath();
      ctx.arc(0, 3, 11, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Crimson Waist Cord & Brass Grapple Ring underneath
      ctx.fillStyle = '#f43f5e';
      ctx.fillRect(-7, -3.5, 14, 3.5);
      ctx.strokeStyle = '#fde047';
      ctx.lineWidth = 3.2;
      ctx.beginPath();
      ctx.arc(0, 15, 5.5, 0, Math.PI * 2);
      ctx.stroke();

      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(-4, 1, 2.8, 0, Math.PI * 2);
      ctx.fill();
    } else if (seasonId === 'autumn') {
      // MÀN 3 (THU): Ornate Ancient Bronze Temple War-Bell (Linh Chung Đồng Cổ)!
      ctx.fillStyle = '#d97706';
      ctx.strokeStyle = INK;
      ctx.lineWidth = 2.8;
      ctx.beginPath();
      ctx.moveTo(-8, -11);
      ctx.lineTo(8, -11);
      ctx.lineTo(14, 8);
      ctx.lineTo(-14, 8);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Golden Engraved Bell Rim & Crown Loop
      ctx.fillStyle = '#fde047';
      ctx.beginPath();
      ctx.roundRect(-15, 6, 30, 5, 2.5);
      ctx.roundRect(-5, -15, 10, 5, 2);
      ctx.fill();
      ctx.stroke();

      // Crimson Maple Tassel hanging below bronze bell
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(0, 11);
      ctx.lineTo(0, 20);
      ctx.stroke();
    } else if (seasonId === 'winter') {
      // MÀN 4 (ĐÔNG): Multifaceted Aurora Frost-Crystal Hex Prism (Tinh Thể Băng Tinh)!
      ctx.fillStyle = '#38bdf8';
      ctx.strokeStyle = INK;
      ctx.lineWidth = 2.6;
      ctx.beginPath();
      ctx.moveTo(0, -16);
      ctx.lineTo(12, -5);
      ctx.lineTo(12, 6);
      ctx.lineTo(0, 17);
      ctx.lineTo(-12, 6);
      ctx.lineTo(-12, -5);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Inner Diamond Ice Facet
      ctx.fillStyle = '#e0f2fe';
      ctx.beginPath();
      ctx.moveTo(0, -11);
      ctx.lineTo(6.5, 0);
      ctx.lineTo(0, 11);
      ctx.lineTo(-6.5, 0);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(-3, -5, 2.5, 0, Math.PI * 2);
      ctx.fill();
    } else if (seasonId === 'cavern') {
      // MÀN 5 (U MINH ĐỘNG): Bioluminescent Amethyst Geode Cluster (Cụm Thạch Anh Tím)!
      const shards = [
        { x: -7, y: 2, w: 7, h: 15, rot: -0.35, col: '#9333ea' },
        { x: 7, y: 2, w: 7, h: 15, rot: 0.35, col: '#c084fc' },
        { x: 0, y: -2, w: 9, h: 20, rot: 0, col: '#e879f9' },
      ];
      for (const sh of shards) {
        ctx.save();
        ctx.translate(sh.x, sh.y);
        ctx.rotate(sh.rot);
        ctx.fillStyle = sh.col;
        ctx.strokeStyle = INK;
        ctx.lineWidth = 2.4;
        ctx.beginPath();
        ctx.moveTo(0, -sh.h * 0.6);
        ctx.lineTo(sh.w, 0);
        ctx.lineTo(sh.w * 0.6, sh.h * 0.5);
        ctx.lineTo(-sh.w * 0.6, sh.h * 0.5);
        ctx.lineTo(-sh.w, 0);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.restore();
      }
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(-1.5, -6, 2.5, 0, Math.PI * 2);
      ctx.fill();
    } else if (seasonId === 'thunder_peak') {
      // MÀN 6 (ĐỈNH LÔI PHONG): Crackling Raijin Thunder-Drum Sphere (Lôi Cầu Tụ Điện)!
      ctx.fillStyle = '#312e81';
      ctx.strokeStyle = INK;
      ctx.lineWidth = 2.8;
      ctx.beginPath();
      ctx.arc(0, 0, 13, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Golden Lightning Ring & Tomoe Core
      ctx.strokeStyle = '#fde047';
      ctx.lineWidth = 2.6;
      ctx.beginPath();
      ctx.arc(0, 0, 9.5, 0, Math.PI * 2);
      ctx.stroke();

      ctx.fillStyle = '#fef08a';
      ctx.beginPath();
      ctx.moveTo(-2, -6);
      ctx.lineTo(4, -1);
      ctx.lineTo(0, -1);
      ctx.lineTo(2, 6);
      ctx.lineTo(-4, 1);
      ctx.lineTo(0, 1);
      ctx.closePath();
      ctx.fill();
    } else if (seasonId === 'blood_abyss') {
      // MÀN 7 (HUYẾT HẢI LUYỆN NGỤC): Spiked Hellfire Iron Chain-Cage & Molten Core (Lồng Xích Lõi Dung Nham)!
      ctx.fillStyle = '#1f2937';
      ctx.strokeStyle = INK;
      ctx.lineWidth = 2.8;
      ctx.beginPath();
      ctx.arc(0, 0, 13.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Glowing Molten Magma Core inside iron cage bars
      ctx.fillStyle = '#ef4444';
      ctx.beginPath();
      ctx.arc(0, 0, 9, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#fef08a';
      ctx.beginPath();
      ctx.arc(0, 0, 5, 0, Math.PI * 2);
      ctx.fill();

      // Iron Cage Cross-Bars
      ctx.strokeStyle = '#374151';
      ctx.lineWidth = 2.6;
      ctx.beginPath();
      ctx.moveTo(-12, 0);
      ctx.lineTo(12, 0);
      ctx.moveTo(0, -12);
      ctx.lineTo(0, 12);
      ctx.stroke();
    } else if (seasonId === 'earth_core') {
      // MÀN 10 (ĐỊA TÂM HOANG CỔ): Spinning Brass & Iron Subterranean Mine-Pulley Wheel (Ròng Rọc Mỏ Địa Tâm) with Amber Core!
      ctx.save();
      ctx.rotate(stageTimeSec * 2.6);
      ctx.fillStyle = '#b45309';
      ctx.strokeStyle = INK;
      ctx.lineWidth = 2.6;
      // Outer Pulley Gear Teeth
      for (let t = 0; t < 6; t++) {
        ctx.rotate(Math.PI / 3);
        ctx.fillRect(-3.5, -16, 7, 5);
        ctx.strokeRect(-3.5, -16, 7, 5);
      }
      ctx.beginPath();
      ctx.arc(0, 0, 12.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.restore();

      // Glowing Golden-Amber Earth-Core Hub
      ctx.fillStyle = '#fde047';
      ctx.strokeStyle = INK;
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.arc(0, 0, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    } else if (seasonId === 'sky_sanctuary') {
      // MÀN 11 (CỬU THIÊN KHÔNG CHIẾN): Spinning Celestial Wind-Wheel & Feathered Astrolabe (Phong Linh Thiên Luân)!
      ctx.save();
      ctx.rotate(stageTimeSec * 3.4);
      // 4 Curved Cyan-Gold Wind Pinwheel Blades
      for (let w = 0; w < 4; w++) {
        ctx.rotate(Math.PI * 0.5);
        ctx.fillStyle = w % 2 === 0 ? '#38bdf8' : '#fde047';
        ctx.strokeStyle = INK;
        ctx.lineWidth = 2.2;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.quadraticCurveTo(10, -10, 16, -2);
        ctx.quadraticCurveTo(8, 5, 0, 0);
        ctx.fill();
        ctx.stroke();
      }
      ctx.restore();

      // Outer Golden Wind-Ring & Radiant Sky-Pearl Center
      ctx.strokeStyle = '#fde047';
      ctx.lineWidth = 2.6;
      ctx.beginPath();
      ctx.arc(0, 0, 13.5, 0, Math.PI * 2);
      ctx.stroke();

      ctx.fillStyle = '#ffffff';
      ctx.strokeStyle = INK;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, 5.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    } else {
      // MÀN 8 (THIÊN ĐÀN NGUYỆT THỰC): Floating White-Jade Immortal Bi-Disc & Golden Ribbon (Ngọc Bội Tiên Giới)!
      ctx.fillStyle = '#ecfdf5';
      ctx.strokeStyle = INK;
      ctx.lineWidth = 2.6;
      ctx.beginPath();
      ctx.arc(0, 0, 13.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.strokeStyle = '#34d399';
      ctx.lineWidth = 3.2;
      ctx.beginPath();
      ctx.arc(0, 0, 9.5, 0, Math.PI * 2);
      ctx.stroke();

      // Inner Golden Core Ring
      ctx.fillStyle = '#fde047';
      ctx.beginPath();
      ctx.arc(0, 0, 4.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Flowing Golden Immortal Silk Ribbons
      ctx.strokeStyle = '#fbbf24';
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      ctx.moveTo(-10, 8);
      ctx.quadraticCurveTo(-16, 15, -12, 21);
      ctx.moveTo(10, 8);
      ctx.quadraticCurveTo(16, 15, 12, 21);
      ctx.stroke();
    }

    ctx.restore();
  }
}
