import { SEASONS } from './stages.ts';
import type { SeasonId } from './types.ts';

// Per-stage boss skill bursts.

export interface BossSkillProjectileSpec {
  offsetX: number;
  offsetY: number;
  vx: number;
  vy: number;
  gravity: number;
  homing: boolean;
  crossZ: boolean;
  explosive: boolean;
  isFireball: boolean;
  isSwordBeam: boolean;
  waveAmp: number;
  boomerangReturn: boolean;
  damage: number;
  color: string;
}

export interface BossSkillBurstResult {
  skillBanner: string;
  bannerColor: string;
  bossDashVx: number;
  bossLeapVy: number;
  teleportTargetX?: number;
  projectiles: BossSkillProjectileSpec[];
}

/**
 * Pure generator for each of the 8 Stage Bosses' unique signature skills and attack patterns.
 */
export function computeBossSkillBurst(params: {
  seasonId: SeasonId;
  bossX: number;
  bossY: number;
  playerX: number;
  playerY: number;
  castIndex: number;
  hpRatio: number;
  enemyDamageMult: number;
  bossDamageMult?: number;
  projectileSpeedMult: number;
}): BossSkillBurstResult {
  const dx = params.playerX - params.bossX;
  const dy = params.playerY - 24 - (params.bossY - 28);
  const aimAng = Math.atan2(dy, dx);
  const dir: 1 | -1 = dx >= 0 ? 1 : -1;
  const isEnraged = params.hpRatio < 0.5;
  const stageIdx = SEASONS[params.seasonId].index;
  const effectiveBossDmgMult =
    params.bossDamageMult ??
    Number((1 + stageIdx * 0.24).toFixed(2)) *
      (params.enemyDamageMult >= 1.25 && stageIdx === 0 ? 1.3 : 1);
  const baseDmg = Math.round(20 * effectiveBossDmgMult);
  const spMult = params.projectileSpeedMult;
  const altCast = params.castIndex % 2 === 1;

  switch (params.seasonId) {
    case 'spring': {
      // Boss 1: Yêu Tăng Phun Lửa — Hỏa Long Liên Hoàn Pháo (5-way Dragon Fire Stream) & Hỏa Trụ Phun Trào
      const projs: BossSkillProjectileSpec[] = [];
      const count = isEnraged ? 6 : 4;
      for (let i = 0; i < count; i++) {
        const spread = (i - (count - 1) * 0.5) * 0.16;
        const speed = (370 + i * 25) * spMult;
        projs.push({
          offsetX: dir * 24,
          offsetY: -28,
          vx: Math.cos(aimAng + spread) * speed,
          vy: Math.sin(aimAng + spread) * speed,
          gravity: altCast ? 360 : 0,
          homing: false,
          crossZ: false,
          explosive: true,
          isFireball: true,
          isSwordBeam: false,
          waveAmp: 0,
          boomerangReturn: false,
          damage: baseDmg,
          color: '#f97316',
        });
      }
      return {
        skillBanner: altCast
          ? 'TUYỆT KỸ BOSS: MƯA LỬA ĐẠI THỤ!'
          : 'TUYỆT KỸ BOSS: HỎA LONG LIÊN HOÀN PHÁO!',
        bannerColor: '#f97316',
        bossDashVx: altCast ? dir * 160 : 0,
        bossLeapVy: altCast ? -460 : 0,
        projectiles: projs,
      };
    }

    case 'summer': {
      // Boss 2: Giao Long Song Kiếm Khách — Giao Long Toàn Phong Trảm (Tidal Dash + Wave Sword Beams)
      const projs: BossSkillProjectileSpec[] = [];
      const heights = [-16, -38, -60];
      for (let i = 0; i < heights.length; i++) {
        const speed = (440 + i * 35) * spMult;
        projs.push({
          offsetX: dir * 26,
          offsetY: heights[i],
          vx: dir * speed,
          vy: (i - 1) * 45,
          gravity: 0,
          homing: false,
          crossZ: true,
          explosive: false,
          isFireball: false,
          isSwordBeam: true,
          waveAmp: 120,
          boomerangReturn: false,
          damage: baseDmg,
          color: '#06b6d4',
        });
      }
      return {
        skillBanner: altCast
          ? 'TUYỆT KỸ BOSS: GIAO LONG ĐẠP THỦY TRẢM!'
          : 'TUYỆT KỸ BOSS: SÓNG KIẾM THỦY TRIỀU!',
        bannerColor: '#22d3ee',
        bossDashVx: dir * (isEnraged ? 340 : 260),
        bossLeapVy: altCast ? -420 : -220,
        projectiles: projs,
      };
    }

    case 'autumn': {
      // Boss 3: Đại Tướng Quân Thiết Chùy — Thiết Chùy Chấn Địa (Ground Shockwaves + Sky Arrow Rain)
      const projs: BossSkillProjectileSpec[] = [];
      // Left & Right Ground Shockwaves
      for (const sDir of [-1, 1]) {
        projs.push({
          offsetX: sDir * 24,
          offsetY: -8,
          vx: sDir * 420 * spMult,
          vy: 0,
          gravity: 0,
          homing: false,
          crossZ: true,
          explosive: true,
          isFireball: true,
          isSwordBeam: false,
          waveAmp: 0,
          boomerangReturn: false,
          damage: Math.round(baseDmg * 1.15),
          color: '#f97316',
        });
      }
      // Diagonal Sky Arrows / Iron Spikes
      for (let a = -1; a <= 1; a++) {
        projs.push({
          offsetX: a * 70,
          offsetY: -140,
          vx: dir * 180 + a * 65,
          vy: 390 * spMult,
          gravity: 220,
          homing: false,
          crossZ: false,
          explosive: false,
          isFireball: false,
          isSwordBeam: false,
          waveAmp: 0,
          boomerangReturn: false,
          damage: baseDmg,
          color: '#fbbf24',
        });
      }
      return {
        skillBanner: 'TUYỆT KỸ BOSS: THIẾT CHÙY CHẤN ĐỊA & MƯA TÊN!',
        bannerColor: '#fb923c',
        bossDashVx: dir * 140,
        bossLeapVy: -520,
        projectiles: projs,
      };
    }

    case 'winter': {
      // Boss 4: Hàn Băng Tuyết Yêu Vương — Băng Tinh Bát Phương (8-Way Frost Ring + Ice Teleport)
      const projs: BossSkillProjectileSpec[] = [];
      const ringCount = isEnraged ? 8 : 6;
      for (let i = 0; i < ringCount; i++) {
        const ang = aimAng + (Math.PI * 2 * i) / ringCount;
        const speed = 390 * spMult;
        projs.push({
          offsetX: Math.cos(ang) * 20,
          offsetY: -28 + Math.sin(ang) * 20,
          vx: Math.cos(ang) * speed,
          vy: Math.sin(ang) * speed,
          gravity: 0,
          homing: i === 0,
          crossZ: true,
          explosive: false,
          isFireball: false,
          isSwordBeam: true,
          waveAmp: 0,
          boomerangReturn: false,
          damage: baseDmg,
          color: '#38bdf8',
        });
      }
      return {
        skillBanner: altCast
          ? 'TUYỆT KỸ BOSS: HÀN BĂNG DỊCH CHUYỂN!'
          : 'TUYỆT KỸ BOSS: BĂNG TINH BÁT PHƯƠNG TRẬN!',
        bannerColor: '#7dd3fc',
        bossDashVx: -dir * 210,
        bossLeapVy: -380,
        projectiles: projs,
      };
    }

    case 'cavern': {
      // Boss 5: Vạn Độc Minh Vương — Mưa Độc Bào Tử (Parabolic Acid Lob + Boomerang Poison Hook)
      const projs: BossSkillProjectileSpec[] = [];
      for (let b = 0; b < 3; b++) {
        projs.push({
          offsetX: dir * 18,
          offsetY: -34,
          vx: dir * (180 + b * 95) * spMult,
          vy: -360 - b * 65,
          gravity: 640,
          homing: false,
          crossZ: false,
          explosive: true,
          isFireball: true,
          isSwordBeam: false,
          waveAmp: 0,
          boomerangReturn: false,
          damage: baseDmg,
          color: '#a855f7',
        });
      }
      // Boomerang Poison Hook
      projs.push({
        offsetX: dir * 26,
        offsetY: -24,
        vx: Math.cos(aimAng) * 470 * spMult,
        vy: Math.sin(aimAng) * 470 * spMult,
        gravity: 0,
        homing: false,
        crossZ: true,
        explosive: false,
        isFireball: false,
        isSwordBeam: false,
        waveAmp: 0,
        boomerangReturn: true,
        damage: baseDmg,
        color: '#4ade80',
      });
      return {
        skillBanner: 'TUYỆT KỸ BOSS: VẠN ĐỘC BÀO TỬ & SONG CÂU ĐOẠT MỆNH!',
        bannerColor: '#c084fc',
        bossDashVx: dir * 195,
        bossLeapVy: -440,
        projectiles: projs,
      };
    }

    case 'thunder_peak': {
      // Boss 6: Lôi Điện Pháp Vương — Bát Trống Thiên Lôi (Homing Thunder Drums + Sky Lightning Columns)
      const projs: BossSkillProjectileSpec[] = [];
      for (let d = 0; d < 3; d++) {
        const spread = (d - 1) * 0.25;
        projs.push({
          offsetX: dir * 20,
          offsetY: -36,
          vx: Math.cos(aimAng + spread) * 450 * spMult,
          vy: Math.sin(aimAng + spread) * 450 * spMult,
          gravity: 0,
          homing: true,
          crossZ: true,
          explosive: true,
          isFireball: false,
          isSwordBeam: true,
          waveAmp: 90,
          boomerangReturn: false,
          damage: baseDmg,
          color: '#facc15',
        });
      }
      return {
        skillBanner: 'TUYỆT KỸ BOSS: BÁT TRỐNG THIÊN LÔI VẠN CỔ!',
        bannerColor: '#fde047',
        bossDashVx: dir * 250,
        bossLeapVy: -490,
        projectiles: projs,
      };
    }

    case 'blood_abyss': {
      // Boss 7: Huyết Ma Đại Tượng — Đập Đe Thiên Thạch & Xích Lửa Quét Sàn
      const projs: BossSkillProjectileSpec[] = [];
      // 4 Molten Slag Meteors lobbed in high parabolic arcs
      for (let m = 0; m < 4; m++) {
        projs.push({
          offsetX: (m - 1.5) * 20,
          offsetY: -42,
          vx: dir * (130 + m * 85) * spMult,
          vy: -430 - m * 45,
          gravity: 720,
          homing: false,
          crossZ: true,
          explosive: true,
          isFireball: true,
          isSwordBeam: false,
          waveAmp: 0,
          boomerangReturn: false,
          damage: Math.round(baseDmg * 1.15),
          color: '#ef4444',
        });
      }
      // Horizontal Returning Molten Chain Whip
      projs.push({
        offsetX: dir * 28,
        offsetY: -22,
        vx: dir * 510 * spMult,
        vy: 0,
        gravity: 0,
        homing: false,
        crossZ: true,
        explosive: true,
        isFireball: false,
        isSwordBeam: false,
        waveAmp: 0,
        boomerangReturn: true,
        damage: baseDmg,
        color: '#fb923c',
      });
      return {
        skillBanner: 'TUYỆT KỸ BOSS: ĐẬP ĐE DUNG NHAM & XÍCH LỬA ĐỊA NGỤC!',
        bannerColor: '#ef4444',
        bossDashVx: dir * 180,
        bossLeapVy: -360,
        projectiles: projs,
      };
    }

    case 'ocean_palace': {
      // Boss 9: Đông Hải Long Vương — Hải Vương Tam Xoa Kích & Xoáy Nước Thủy Triều
      const projs: BossSkillProjectileSpec[] = [];
      const prongs = isEnraged ? 5 : 3;
      for (let p = 0; p < prongs; p++) {
        const offsetIdx = p - (prongs - 1) * 0.5;
        const spread = offsetIdx * 0.14;
        const speed = (470 + Math.abs(offsetIdx) * 25) * spMult;
        projs.push({
          offsetX: dir * 30,
          offsetY: -28 + offsetIdx * 14,
          vx: Math.cos(aimAng + spread) * speed,
          vy: Math.sin(aimAng + spread) * speed,
          gravity: 0,
          homing: p === Math.floor(prongs / 2),
          crossZ: true,
          explosive: false,
          isFireball: false,
          isSwordBeam: true,
          waveAmp: 135,
          boomerangReturn: false,
          damage: Math.round(baseDmg * 1.18),
          color: p % 2 === 0 ? '#22d3ee' : '#fde047',
        });
      }
      // Boomerang Abyssal Whirlpool Orbs
      for (const sideFactor of [-1, 1]) {
        projs.push({
          offsetX: dir * 22,
          offsetY: -24 + sideFactor * 18,
          vx: dir * 430 * spMult,
          vy: sideFactor * 150,
          gravity: 0,
          homing: false,
          crossZ: true,
          explosive: true,
          isFireball: false,
          isSwordBeam: false,
          waveAmp: 95,
          boomerangReturn: true,
          damage: baseDmg,
          color: '#38bdf8',
        });
      }
      return {
        skillBanner: altCast
          ? 'TUYỆT KỸ LONG VƯƠNG: XOÁY NƯỚC ĐẠI HẢI TRIỀU!'
          : 'TUYỆT KỸ LONG VƯƠNG: HẢI VƯƠNG TAM XOA KÍCH!',
        bannerColor: '#22d3ee',
        bossDashVx: dir * 320,
        bossLeapVy: -410,
        projectiles: projs,
      };
    }

    case 'earth_core': {
      // Boss 10: Địa Tâm Cổ Long Vương — Địa Long Phá Thạch (Tectonic Golden Boulders + Subterranean Seismic Waves)
      const projs: BossSkillProjectileSpec[] = [];
      const boulderCount = isEnraged ? 5 : 4;
      for (let b = 0; b < boulderCount; b++) {
        projs.push({
          offsetX: dir * 24 + (b - 1.5) * 18,
          offsetY: -38,
          vx: dir * (165 + b * 82) * spMult,
          vy: -420 - b * 52,
          gravity: 690,
          homing: false,
          crossZ: true,
          explosive: true,
          isFireball: true,
          isSwordBeam: false,
          waveAmp: 0,
          boomerangReturn: false,
          damage: Math.round(baseDmg * 1.2),
          color: '#f59e0b',
        });
      }
      // Twin Subterranean Golden Tectonic Shockwaves
      for (const sDir of [-1, 1]) {
        projs.push({
          offsetX: sDir * 28,
          offsetY: -12,
          vx: sDir * 480 * spMult,
          vy: sDir * 72,
          gravity: 0,
          homing: sDir === dir,
          crossZ: true,
          explosive: true,
          isFireball: false,
          isSwordBeam: true,
          waveAmp: 85,
          boomerangReturn: false,
          damage: Math.round(baseDmg * 1.18),
          color: '#fde047',
        });
      }
      return {
        skillBanner: altCast
          ? 'TUYỆT KỸ ĐỊA TÂM: HOÀNG KIM ĐỊA CHẤN VẠN DẶM!'
          : 'TUYỆT KỸ ĐỊA TÂM: ĐỊA LONG PHÁ THẠCH!',
        bannerColor: '#f59e0b',
        bossDashVx: dir * 310,
        bossLeapVy: -460,
        projectiles: projs,
      };
    }

    case 'sky_sanctuary': {
      // Boss 11: Thiên Bằng Kim Dực Vương — Thiên Bằng Vũ Nhận (Golden Wing-Blade Barrage + Nine-Heavens Cyclone)
      const projs: BossSkillProjectileSpec[] = [];
      const featherCount = isEnraged ? 7 : 5;
      for (let f = 0; f < featherCount; f++) {
        const offsetIdx = f - (featherCount - 1) * 0.5;
        const spread = offsetIdx * 0.13;
        const speed = (510 + Math.abs(offsetIdx) * 28) * spMult;
        projs.push({
          offsetX: dir * 30,
          offsetY: -30 + offsetIdx * 11,
          vx: Math.cos(aimAng + spread) * speed,
          vy: Math.sin(aimAng + spread) * speed,
          gravity: 0,
          homing: f === Math.floor(featherCount / 2),
          crossZ: true,
          explosive: false,
          isFireball: false,
          isSwordBeam: true,
          waveAmp: altCast ? 140 : 0,
          boomerangReturn: false,
          damage: Math.round(baseDmg * 1.22),
          color: f % 2 === 0 ? '#fde047' : '#38bdf8',
        });
      }
      // Twin Boomerang Wind-Vortex Chakrams
      for (const sideFactor of [-1, 1]) {
        projs.push({
          offsetX: dir * 24,
          offsetY: -24 + sideFactor * 20,
          vx: dir * 480 * spMult,
          vy: sideFactor * 165,
          gravity: 0,
          homing: false,
          crossZ: true,
          explosive: true,
          isFireball: false,
          isSwordBeam: false,
          waveAmp: 110,
          boomerangReturn: true,
          damage: Math.round(baseDmg * 1.15),
          color: '#67e8f9',
        });
      }
      return {
        skillBanner: altCast
          ? 'TUYỆT KỸ THIÊN BẰNG: ĐẠI PHONG BÃO CỬU THIÊN!'
          : 'TUYỆT KỸ THIÊN BẰNG: KIM DỰC VẠN VŨ NHẬN!',
        bannerColor: '#38bdf8',
        bossDashVx: dir * 360,
        bossLeapVy: -380,
        projectiles: projs,
      };
    }

    case 'celestial_altar':
    default: {
      // Boss 8: Huyết Y Thái Thượng Giáo Chủ — Vạn Kiếm Quy Tông & Nhật Nguyệt Thực Trận
      const projs: BossSkillProjectileSpec[] = [];
      const swordCount = isEnraged ? 6 : 5;
      for (let s = 0; s < swordCount; s++) {
        const spread = (s - (swordCount - 1) * 0.5) * 0.19;
        const speed = (460 + s * 22) * spMult;
        projs.push({
          offsetX: Math.cos(spread) * 28,
          offsetY: -36 + (s - 2) * 12,
          vx: Math.cos(aimAng + spread) * speed,
          vy: Math.sin(aimAng + spread) * speed,
          gravity: 0,
          homing: s % 2 === 0,
          crossZ: true,
          explosive: s === Math.floor(swordCount / 2),
          isFireball: false,
          isSwordBeam: true,
          waveAmp: altCast ? 110 : 0,
          boomerangReturn: false,
          damage: Math.round(baseDmg * 1.2),
          color: s % 2 === 0 ? '#f43f5e' : '#fde047',
        });
      }
      return {
        skillBanner: altCast
          ? 'TUYỆT KỸ GIÁO CHỦ: NHẬT NGUYỆT THỰC ĐẠI TRẬN!'
          : 'TUYỆT KỸ GIÁO CHỦ: VẠN KIẾM QUY TÔNG!',
        bannerColor: '#f43f5e',
        bossDashVx: dir * 290,
        bossLeapVy: -510,
        projectiles: projs,
      };
    }
  }
}
