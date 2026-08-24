import { GLYPHS, GLYPH_ROWS } from "./glyphs.js";

/**
 * A word rendered as block art: `GLYPH_ROWS` equal-length rows of the cell
 * characters ` `, `█`, `▀`, `▄`, `▌`, `▐`.
 */
export type BlockArt = readonly string[];

/** The cell characters the font draws with. Anything else is a bug upstream. */
const CELL_CHARS = new Set([" ", "█", "▀", "▄", "▌", "▐"]);

/**
 * Renders `word` by concatenating glyph rows. The font is fixed-advance and
 * does no smushing, so concatenation is the whole algorithm — verified against
 * a FIGfont renderer for the words this project ships.
 *
 * Throws on any character the font does not define. The font has no digits and
 * no punctuation, so accepting them would quietly drop them from the wordmark;
 * a wordmark missing a character is worse than a build that stops.
 */
export function renderWord(word: string): BlockArt {
  if (word.length === 0) {
    throw new Error("renderWord: word is empty");
  }

  const glyphs = [...word].map((char) => {
    // The font is caseless: lowercase maps onto the same art.
    const glyph = GLYPHS[char.toUpperCase()];
    if (glyph === undefined) {
      throw new Error(
        `renderWord: the wordmark font has no glyph for ${JSON.stringify(char)} ` +
          `(in ${JSON.stringify(word)}). It defines A-Z and the space only.`,
      );
    }
    return glyph;
  });

  const rows = Array.from({ length: GLYPH_ROWS }, (_, row) =>
    glyphs.map((glyph) => glyph[row]).join(""),
  );

  for (const row of rows) {
    for (const char of row) {
      if (!CELL_CHARS.has(char)) {
        throw new Error(
          `renderWord: glyph data contains an unexpected cell ${JSON.stringify(char)}`,
        );
      }
    }
  }

  return rows;
}
