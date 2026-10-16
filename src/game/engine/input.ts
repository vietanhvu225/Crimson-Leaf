import {
  triggerAwakening,
  upgradeSkill,
  cycleElement,
  toggleImmortal,
  teleportToBoss,
} from './actions';
import { World } from './world';

// Keyboard / mouse handlers writing into world input state.

export function clearInputs(world: World) {
  world.keysHeld.clear();
  world.keysJustPressed.clear();
  world.lmbJustPressed = false;
  world.rmbJustPressed = false;
}

export function onKeyDown(world: World, e: KeyboardEvent) {
  const code = e.code;
  if (!world.keysHeld.has(code)) {
    world.keysJustPressed.add(code);
  }
  world.keysHeld.add(code);

  const st = world.stateRef.current;
  if (code === 'Escape' || code === 'KeyP') {
    if (st.gameState === 'playing' || st.gameState === 'paused') {
      e.preventDefault();
      st.onTogglePause();
    }
  } else if (code === 'KeyM') {
    st.onToggleMute();
  } else if (code === 'KeyR' && st.gameState === 'playing') {
    st.onQuickRestart();
  } else if (code === 'KeyG' && st.gameState === 'playing') {
    st.onOpenGdd();
  } else if (code === 'KeyH' && st.gameState === 'playing') {
    triggerAwakening(world);
  } else if (code === 'KeyB' && st.gameState === 'playing') {
    toggleImmortal(world);
  } else if (code === 'KeyV' && st.gameState === 'playing') {
    teleportToBoss(world);
  } else if (st.gameState === 'playing') {
    if (code === 'Digit1') st.onSelectSeasonQuick('spring');
    if (code === 'Digit2') st.onSelectSeasonQuick('summer');
    if (code === 'Digit3') st.onSelectSeasonQuick('autumn');
    if (code === 'Digit4') st.onSelectSeasonQuick('winter');
    if (code === 'Digit5') st.onSelectSeasonQuick('cavern');
    if (code === 'Digit6') st.onSelectSeasonQuick('thunder_peak');
    if (code === 'Digit7') st.onSelectSeasonQuick('blood_abyss');
    if (code === 'Digit8') st.onSelectSeasonQuick('celestial_altar');
    if (code === 'Digit9') st.onSelectSeasonQuick('ocean_palace');
    if (code === 'KeyU') upgradeSkill(world, 'kodachi');
    if (code === 'KeyI') upgradeSkill(world, 'kunai');
    if (code === 'KeyO') upgradeSkill(world, 'mobility');
    if (code === 'KeyY') upgradeSkill(world, 'deflect');
    if (code === 'KeyL') upgradeSkill(world, 'guardian');
    if (code === 'KeyC') cycleElement(world);
  }
}

export function onKeyUp(world: World, e: KeyboardEvent) {
  world.keysHeld.delete(e.code);
}

export function onMouseMove(world: World, e: MouseEvent) {
  world.mouseClientX = e.clientX - world.canvasRect.left;
  world.mouseClientY = e.clientY - world.canvasRect.top;
}

export function onMouseDown(world: World, e: MouseEvent) {
  if (world.stateRef.current.gameState !== 'playing') return;
  world.mouseClientX = e.clientX - world.canvasRect.left;
  world.mouseClientY = e.clientY - world.canvasRect.top;
  if (e.button === 0) {
    world.lmbJustPressed = true;
  } else if (e.button === 2) {
    world.rmbJustPressed = true;
  }
}

export function onContextMenu(world: World, e: MouseEvent) {
  if (world.stateRef.current.gameState === 'playing') {
    e.preventDefault();
  }
}

export function onVisibilityChange(world: World) {
  if (document.hidden) clearInputs(world);
}

/** Registers window/document listeners; returns a detach function. */
export function attachInput(world: World): () => void {
  const keydown = (e: KeyboardEvent) => onKeyDown(world, e);
  const keyup = (e: KeyboardEvent) => onKeyUp(world, e);
  const mousemove = (e: MouseEvent) => onMouseMove(world, e);
  const mousedown = (e: MouseEvent) => onMouseDown(world, e);
  const contextmenu = (e: MouseEvent) => onContextMenu(world, e);
  const blur = () => clearInputs(world);
  const visibility = () => onVisibilityChange(world);
  window.addEventListener('keydown', keydown);
  window.addEventListener('keyup', keyup);
  window.addEventListener('mousemove', mousemove);
  window.addEventListener('mousedown', mousedown);
  window.addEventListener('contextmenu', contextmenu);
  window.addEventListener('blur', blur);
  document.addEventListener('visibilitychange', visibility);
  return () => {
    window.removeEventListener('keydown', keydown);
    window.removeEventListener('keyup', keyup);
    window.removeEventListener('mousemove', mousemove);
    window.removeEventListener('mousedown', mousedown);
    window.removeEventListener('contextmenu', contextmenu);
    window.removeEventListener('blur', blur);
    document.removeEventListener('visibilitychange', visibility);
  };
}
