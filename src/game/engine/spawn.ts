import { ProjectileActor, PooledParticle } from './entities';
import { World } from './world';
import { ZLane, PickupItemKind } from '../rules';

// Pooled spawners: particles, projectiles, banners, lightning, pickups.

export function spawnLightningBolt(
  world: World,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  color = '#fde047',
  maxLife = 0.24
) {
  const slot = world.lightningBolts[world.lightningCursor % world.lightningBolts.length];
  world.lightningCursor++;
  slot.active = true;
  slot.x1 = x1;
  slot.y1 = y1;
  slot.x2 = x2;
  slot.y2 = y2;
  slot.life = maxLife;
  slot.maxLife = maxLife;
  slot.color = color;
}

export function spawnBanner(world: World, x: number, y: number, text: string, color: string) {
  const b = world.banners[world.bannerCursor % world.banners.length];
  world.bannerCursor++;
  b.active = true;
  b.x = x;
  b.y = y;
  b.text = text;
  b.color = color;
  b.life = 1.3;
}

export function spawnParticle(
  world: World,
  x: number,
  y: number,
  vx: number,
  vy: number,
  size: number,
  color: string,
  maxLife: number,
  kind: PooledParticle['kind'] = 'spark'
) {
  const p = world.particles[world.particleCursor % world.particles.length];
  world.particleCursor++;
  p.active = true;
  p.x = x;
  p.y = y;
  p.vx = vx;
  p.vy = vy;
  p.size = size;
  p.color = color;
  p.alpha = 1;
  p.life = maxLife;
  p.maxLife = maxLife;
  p.kind = kind;
}

export function spawnProjectile(world: World, params: Omit<ProjectileActor, 'active'>) {
  const slot = world.projectiles.find((p) => !p.active) || world.projectiles[0];
  slot.gravity = 0;
  slot.waveAmp = 0;
  slot.boomerangReturn = false;
  slot.customColor = undefined;
  Object.assign(slot, params, { active: true });
}

export function spawnBloodOrb(world: World, x: number, y: number) {
  const slot = world.bloodOrbs.find((o) => !o.active) || world.bloodOrbs[0];
  slot.active = true;
  slot.x = x;
  slot.y = y;
  slot.vy = -240;
  slot.life = 14;
}

export function getItemLabel(world: World, kind: PickupItemKind): string {
  switch (kind) {
    case 'scroll_kodachi':
      return 'Bí Kíp Kiếm Pháp';
    case 'scroll_kunai':
      return 'Bí Kíp Ám Khí';
    case 'scroll_mobility':
      return 'Bí Kíp Thân Pháp';
    case 'scroll_deflect':
      return 'Bí Kíp Phản Đòn';
    case 'scroll_guardian':
      return 'Bí Kíp Hộ Thể';
    case 'relic_chest':
      return 'Rương Thánh Vật';
    case 'elemental_shrine':
      return 'Đài Nguyên Tố';
    case 'jade_elixir':
      return 'Hồ Lô Linh Đan';
    case 'chakra_pearl':
      return 'Long Châu Nội Lực';
    case 'blood_orb':
      return 'Huyết Ngọc Cổ';
  }
}

export function spawnWorldItem(
  world: World,
  kind: PickupItemKind,
  x: number,
  y: number,
  zLane: ZLane | 'both' = 'both'
) {
  world.worldItems.push({
    id: world.itemIdCounter++,
    kind,
    x,
    y,
    baseY: y,
    zLane,
    collected: false,
    label: getItemLabel(world, kind),
  });
}
