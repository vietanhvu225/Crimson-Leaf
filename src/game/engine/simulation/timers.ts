import { PHYSICS_CONSTANTS } from '../../rules/index.ts';
import type { World } from '../world.ts';
import type { Frame } from './frame.ts';

// Player resource regen and cooldown timers.

export function tickPlayerTimers(world: World, f: Frame) {
  world.cameraTrauma = Math.max(0, world.cameraTrauma - f.dt * 2.2);
  world.trailingHp += (world.combat.hp - world.trailingHp) * Math.min(1, f.dt * 4.5);

  const regenRate =
    world.combat.skills.guardianLevel >= 3 ? 11 : PHYSICS_CONSTANTS.CHAKRA_REGEN_PER_SEC;
  world.combat.chakra = world.combat.isImmortal
    ? world.combat.maxChakra
    : Math.min(world.combat.maxChakra, world.combat.chakra + regenRate * f.dt);
  if (world.combat.isImmortal) {
    world.combat.hp = world.combat.maxHp;
  }
  if (world.combat.awakenedTimer > 0) {
    world.combat.awakenedTimer = Math.max(0, world.combat.awakenedTimer - f.dt);
  }
  if (world.combat.dashCooldown > 0) {
    world.combat.dashCooldown = Math.max(0, world.combat.dashCooldown - f.dt);
  }
  if (world.combat.dashTimer > 0) {
    world.combat.dashTimer = Math.max(0, world.combat.dashTimer - f.dt);
  }
  if (world.combat.coyoteTimer > 0) {
    world.combat.coyoteTimer = Math.max(0, world.combat.coyoteTimer - f.dt);
  }
  if (world.combat.jumpBufferTimer > 0) {
    world.combat.jumpBufferTimer = Math.max(0, world.combat.jumpBufferTimer - f.dt);
  }
  if (world.combat.zSwitchCooldown > 0) {
    world.combat.zSwitchCooldown = Math.max(0, world.combat.zSwitchCooldown - f.dt);
  }
  if (world.combat.comboTimer > 0) {
    world.combat.comboTimer = Math.max(0, world.combat.comboTimer - f.dt);
    if (world.combat.comboTimer === 0) world.combat.combo = 0;
  }
  if (world.player.invulnTimer > 0) {
    world.player.invulnTimer = Math.max(0, world.player.invulnTimer - f.dt);
  }
  if (world.player.guardianBlockCooldown > 0) {
    world.player.guardianBlockCooldown = Math.max(0, world.player.guardianBlockCooldown - f.dt);
  }
}
