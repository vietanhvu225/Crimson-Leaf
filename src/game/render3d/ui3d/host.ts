import type { SeasonId } from '../../rules/index.ts';

// `?ui=3d` (T07): UI pieces drawn in the 3D scene. The React host (App.tsx) registers its intents
// here; the ui3d module calls them (gate click → select stage, click on the selected gate → start).
// The UI never mutates the World: it dispatches the same intents as the DOM buttons.

export type UiMode = 'dom' | '3d';

/** `?ui=3d|dom` (default dom). */
export function readUiMode(): UiMode {
  if (typeof window === 'undefined') return 'dom';
  return new URLSearchParams(window.location.search).get('ui') === '3d' ? '3d' : 'dom';
}

export interface Ui3dHost {
  selectStage(id: SeasonId): void;
  startGame(): void;
}

const noop = () => {};

/** Intents the 3D UI can raise; App.tsx replaces these on mount. */
export const ui3dHost: Ui3dHost = { selectStage: noop, startGame: noop };
