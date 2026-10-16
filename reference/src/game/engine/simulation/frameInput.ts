import { toggleZLane } from '../../rules';
import { spawnBanner } from '../spawn';
import { World } from '../world';

// Keyboard / mouse / touch state -> per-frame input flags.

export function readFrameInput(world: World) {
  world.mouseWorldX = world.mouseClientX + world.camX;
  world.mouseWorldY = world.mouseClientY + world.camY;

  const tInput = world.touchInputRef.current;
  const moveLeft = world.keysHeld.has('KeyA') || world.keysHeld.has('ArrowLeft') || tInput.left;
  const moveRight = world.keysHeld.has('KeyD') || world.keysHeld.has('ArrowRight') || tInput.right;
  const jumpPressed =
    world.keysJustPressed.has('KeyW') ||
    world.keysJustPressed.has('ArrowUp') ||
    world.keysJustPressed.has('Space') ||
    tInput.jump;
  const jumpHeld =
    world.keysHeld.has('KeyW') ||
    world.keysHeld.has('ArrowUp') ||
    world.keysHeld.has('Space') ||
    tInput.jump;
  const dashPressed =
    world.keysJustPressed.has('ShiftLeft') ||
    world.keysJustPressed.has('ShiftRight') ||
    tInput.dash;
  const grapplePressed = world.keysJustPressed.has('KeyE') || tInput.grapple;
  const switchZPressed = world.keysJustPressed.has('KeyQ') || tInput.switchZ;
  const meleePressed = world.keysJustPressed.has('KeyJ') || world.lmbJustPressed || tInput.melee;
  const kunaiPressed = world.keysJustPressed.has('KeyK') || world.rmbJustPressed || tInput.kunai;

  tInput.jump = false;
  tInput.melee = false;
  tInput.kunai = false;
  tInput.dash = false;
  tInput.grapple = false;
  tInput.switchZ = false;

  if (switchZPressed) {
    const prevLane = world.combat.zLane;
    world.combat = toggleZLane(world.combat);
    if (world.combat.zLane !== prevLane) {
      spawnBanner(
        world,
        world.player.x,
        world.player.y - 52,
        world.combat.zLane === 1 ? 'LÀN TRONG (Z=1)' : 'LÀN NGOÀI (Z=0)',
        '#38bdf8'
      );
    }
  }

  return {
    moveLeft,
    moveRight,
    jumpPressed,
    jumpHeld,
    dashPressed,
    grapplePressed,
    switchZPressed,
    meleePressed,
    kunaiPressed,
  };
}

export type FrameInput = ReturnType<typeof readFrameInput>;
