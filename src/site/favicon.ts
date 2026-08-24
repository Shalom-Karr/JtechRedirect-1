import { renderWord } from "../figlet/render.js";
import { encodeLogo } from "../logo/encode.js";

/**
 * A favicon cut from the same block type as the wordmark: the word's first
 * letter, painted in the banner colour on the page background.
 *
 * The source page hotlinks omarchy.org's PNG; deriving one instead keeps the
 * page self-contained and leaves nothing pointing at somebody else's asset.
 */
export function faviconDataUri(word: string, background: string, ink: string): string {
  const initial = [...word][0];
  const { viewBox, path } = encodeLogo(renderWord(initial));

  // A square box around the glyph, so the letter is centred rather than
  // stretched when the browser scales it into a 16px tab icon.
  const [x, y, width, height] = viewBox.split(" ").map(Number);
  const side = Math.max(width, height) * 1.25;
  const box = [
    x - (side - width) / 2,
    y - (side - height) / 2,
    side,
    side,
  ].join(" ");

  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${box}">` +
    `<rect x="${x - (side - width) / 2}" y="${y - (side - height) / 2}" ` +
    `width="${side}" height="${side}" fill="${background}"/>` +
    `<path fill="${ink}" d="${path}"/>` +
    `</svg>`;

  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}
