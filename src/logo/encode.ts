import type { BlockArt } from "../figlet/render.js";

/**
 * Turns block art into a single-path SVG.
 *
 * The wordmark is drawn as vector rectangles rather than as a `<pre>` of block
 * characters because at phone sizes a browser's per-glyph rounding knocks the
 * rows out of column and the word turns to mush. The geometry below is not an
 * approximation of that `<pre>` — it is the same numbers the browser would have
 * used, so the path draws exactly what the text was meant to look like at any
 * size.
 *
 * Units are thousandths of an em, JetBrains Mono's own (`unitsPerEm` is 1000),
 * which is why every constant here is a round figure from either the font or
 * omarchy-site's `assets/css/pre.css`. `test/encode.test.ts` pins the result by
 * re-encoding oligarchy.fyi's own wordmark and comparing byte for byte.
 */

/**
 * Column advance: the block glyphs' 600-unit advance width, plus the
 * `letter-spacing: -0.0425em` the type is set with. Cells therefore overlap by
 * 42.5 units rather than meeting on a seam a rasteriser could open up.
 */
const COL_PITCH = 600 - 42.5;

/** Row advance: `line-height: 1.09375`. */
const ROW_PITCH = 1093.75;

/**
 * A cell's drawn size, straight from the font: the full block `█` has a
 * bounding box of x 0..600 and y -300..1020, so it stands 1320 tall — taller
 * than the line it sits on.
 */
const CELL_WIDTH = 600;
const CELL_HEIGHT = 1320;

/**
 * Row 0's top edge. CSS centres the 1320-tall glyph box in the 1093.75-tall
 * line box, and that negative half-leading is also why the viewBox starts above
 * the origin.
 */
const ROW_ORIGIN = -(CELL_HEIGHT - ROW_PITCH) / 2;

/** The half blocks split their cell exactly in two, in the font as well. */
const HALF_WIDTH = CELL_WIDTH / 2;
const HALF_HEIGHT = CELL_HEIGHT / 2;

interface CellShape {
  /** Offset from the cell's top-left corner. */
  readonly dx: number;
  readonly dy: number;
  readonly width: number;
  readonly height: number;
  /**
   * Whether a run of this cell collapses into one rectangle. Only the
   * full-width cells may: two adjacent half-width cells are 557.5 apart but
   * only 300 wide, and merging them would flood the gap between them.
   */
  readonly mergeable: boolean;
}

/**
 * Each cell's rectangle, matching that character's glyph box in the font:
 * `▀` is y 360..1020, `▄` is y -300..360, `▌` is x 0..300.
 */
const CELL_SHAPES: Readonly<Record<string, CellShape>> = {
  "█": { dx: 0, dy: 0, width: CELL_WIDTH, height: CELL_HEIGHT, mergeable: true },
  "▀": { dx: 0, dy: 0, width: CELL_WIDTH, height: HALF_HEIGHT, mergeable: true },
  "▄": { dx: 0, dy: HALF_HEIGHT, width: CELL_WIDTH, height: HALF_HEIGHT, mergeable: true },
  "▌": { dx: 0, dy: 0, width: HALF_WIDTH, height: CELL_HEIGHT, mergeable: false },
  "▐": { dx: HALF_WIDTH, dy: 0, width: HALF_WIDTH, height: CELL_HEIGHT, mergeable: false },
};

interface Rect {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

export interface LogoGeometry {
  /** `minX minY width height`, sized to the drawn ink rather than to the art's
   *  nominal column count — trailing blank columns must not pad the box. */
  readonly viewBox: string;
  /** The `d` attribute: one closed rectangle per run, in scan order. */
  readonly path: string;
  /** Columns up to and including the rightmost one carrying ink. */
  readonly inkColumns: number;
  readonly rows: number;
  /**
   * The width the wordmark caps at, in rem — the width the same word would
   * have occupied as text at the 1rem ceiling of pre.css's
   * `clamp(0.425rem, 1.25vw, 1rem)`. Following the column count rather than a
   * fixed figure keeps a glyph the same rendered size whatever the word.
   */
  readonly capWidthRem: number;
}

/** Serialises a coordinate the way the source path does: shortest exact form. */
function coord(value: number): string {
  if (!Number.isFinite(value)) {
    throw new Error(`encodeLogo: non-finite coordinate ${value}`);
  }
  // -0 stringifies as "0" only after this normalisation.
  const text = String(value === 0 ? 0 : value);
  // Every pitch is an exact binary fraction, so nothing here should ever need
  // rounding or reach exponential notation.
  if (!/^-?\d+(\.\d+)?$/.test(text)) {
    throw new Error(`encodeLogo: coordinate ${value} does not serialise exactly (${text})`);
  }
  return text;
}

function rectsOf(art: BlockArt): Rect[] {
  const rects: Rect[] = [];

  art.forEach((line, row) => {
    const top = ROW_ORIGIN + row * ROW_PITCH;
    let col = 0;

    while (col < line.length) {
      const char = line[col];
      if (char === " ") {
        col += 1;
        continue;
      }

      const shape = CELL_SHAPES[char];
      if (shape === undefined) {
        throw new Error(`encodeLogo: no shape for cell ${JSON.stringify(char)}`);
      }

      // Collapse the run of identical cells this one starts.
      let run = 1;
      if (shape.mergeable) {
        while (col + run < line.length && line[col + run] === char) {
          run += 1;
        }
      }

      rects.push({
        x: col * COL_PITCH + shape.dx,
        y: top + shape.dy,
        width: shape.width + (run - 1) * COL_PITCH,
        height: shape.height,
      });

      col += run;
    }
  });

  return rects;
}

export function encodeLogo(art: BlockArt): LogoGeometry {
  const rects = rectsOf(art);
  if (rects.length === 0) {
    throw new Error("encodeLogo: the art has no ink");
  }

  const minX = Math.min(...rects.map((rect) => rect.x));
  const minY = Math.min(...rects.map((rect) => rect.y));
  const maxX = Math.max(...rects.map((rect) => rect.x + rect.width));
  const maxY = Math.max(...rects.map((rect) => rect.y + rect.height));

  // Rects come out of the scan already in row-major, left-to-right order,
  // which is the order the source path lists them in.
  const path = rects
    .map(({ x, y, width, height }) => {
      const w = coord(width);
      return `M${coord(x)} ${coord(y)}h${w}v${coord(height)}h-${w}z`;
    })
    .join("");

  const width = maxX - minX;

  // The box is one cell wide plus one pitch per further column. Half-width
  // cells never sit rightmost in practice, and would only round this down.
  const inkColumns = Math.round((width - CELL_WIDTH) / COL_PITCH) + 1;

  return {
    viewBox: `${coord(minX)} ${coord(minY)} ${coord(width)} ${coord(maxY - minY)}`,
    path,
    inkColumns,
    rows: art.length,
    capWidthRem: Math.round((inkColumns * COL_PITCH) / 100) / 10,
  };
}
