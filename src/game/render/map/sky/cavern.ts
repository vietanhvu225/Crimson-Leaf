import { INK } from '../../palette';

/** Sky and celestial phenomena for cavern. */
export function paintCavernSky(
  ctx: CanvasRenderingContext2D,
  viewW: number,
  viewH: number,
  camX: number
) {
  // MÀN 5 (U MINH ĐỘNG): Subterranean Crystal Cave — NO open sky/moon! Hanging Stalactite Ceiling + Giant Glowing Amethyst Geodes + Bioluminescent Mushrooms
  ctx.save();
  const stalSpan = 110;
  const startStal = Math.floor((camX * 0.22 - 110) / stalSpan);
  const endStal = startStal + Math.ceil((viewW + 220) / stalSpan);

  // Upper Cavern Rock Ceiling & Hanging Stalactites + Glowing Purple Crystal Spikes
  for (let s = startStal; s <= endStal; s++) {
    const sx = s * stalSpan - camX * 0.22;
    const sh = 95 + (Math.abs(s * 53) % 115);
    const isCrystal = Math.abs(s) % 3 === 0;
    ctx.fillStyle = isCrystal ? '#c084fc' : '#2e1065';
    ctx.strokeStyle = INK;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(sx - 12, -10);
    ctx.lineTo(sx + stalSpan * 0.5, sh);
    ctx.lineTo(sx + stalSpan + 12, -10);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    if (isCrystal) {
      ctx.fillStyle = '#f5d0fe';
      ctx.beginPath();
      ctx.arc(sx + stalSpan * 0.5, sh - 18, 6, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Background Giant Bioluminescent Chibi Mushrooms
  const mushSpan = 340;
  const startMush = Math.floor((camX * 0.16 - 340) / mushSpan);
  const endMush = startMush + Math.ceil((viewW + 680) / mushSpan);
  for (let m = startMush; m <= endMush; m++) {
    const mx = m * mushSpan - camX * 0.16 + 140;
    const my = viewH - 90;
    // Stem
    ctx.fillStyle = '#e9d5ff';
    ctx.strokeStyle = INK;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.roundRect(mx - 16, my - 70, 32, 95, 10);
    ctx.fill();
    ctx.stroke();
    // Glowing Mushroom Cap
    ctx.fillStyle = Math.abs(m) % 2 === 0 ? '#a855f7' : '#ec4899';
    ctx.beginPath();
    ctx.arc(mx, my - 68, 56, Math.PI, 0);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    // Cute Glowing Spots
    ctx.fillStyle = '#fef08a';
    for (const spotX of [-26, 0, 24]) {
      ctx.beginPath();
      ctx.arc(mx + spotX, my - 92, 7, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
}
