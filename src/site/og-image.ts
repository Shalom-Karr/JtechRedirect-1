import { deflateSync } from "node:zlib";

import type { BlockArt } from "../figlet/render.js";

/**
 * Renders the wordmark to a PNG for `og:image`, so a link to any of these
 * domains unfurls with the mark rather than a blank card.
 *
 * A PNG is written by hand rather than pulled from an image library: the art is
 * a grid of solid rectangles in two colours, which is a few lines of pixel
 * pushing, and it keeps the build dependency-free. `node:zlib` supplies the
 * deflate that PNG's IDAT stream wants.
 */

/** The size link unfurlers expect, and the ratio they crop to. */
const WIDTH = 1200;
const HEIGHT = 630;

/** Keeps the mark clear of the edges, and of any platform's rounded corners. */
const MARGIN = 90;

/** Row-to-column ratio of the block type, from the same pitches the SVG uses. */
const CELL_RATIO = 1093.75 / 557.5;

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(bytes: Buffer): number {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc = CRC_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type: string, data: Buffer): Buffer {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([length, body, crc]);
}

function rgb(hex: string): [number, number, number] {
  const value = hex.replace("#", "");
  const full =
    value.length === 3
      ? [...value].map((c) => c + c).join("")
      : value;
  return [
    parseInt(full.slice(0, 2), 16),
    parseInt(full.slice(2, 4), 16),
    parseInt(full.slice(4, 6), 16),
  ];
}

/** Which part of its cell each block character fills, as fractions. */
const CELL_COVERAGE: Readonly<Record<string, [number, number, number, number]>> = {
  // [x, y, width, height]
  "█": [0, 0, 1, 1],
  "▀": [0, 0, 1, 0.5],
  "▄": [0, 0.5, 1, 0.5],
  "▌": [0, 0, 0.5, 1],
  "▐": [0.5, 0, 0.5, 1],
};

export function renderOgImage(art: BlockArt, background: string, ink: string): Buffer {
  const columns = Math.max(...art.map((line) => line.trimEnd().length));
  const rows = art.length;

  // Largest whole-pixel cell that keeps the mark inside the margins.
  const cellWidth = Math.max(1, Math.floor((WIDTH - MARGIN * 2) / columns));
  const cellHeight = Math.max(1, Math.round(cellWidth * CELL_RATIO));
  const originX = Math.round((WIDTH - columns * cellWidth) / 2);
  const originY = Math.round((HEIGHT - rows * cellHeight) / 2);

  const [br, bg, bb] = rgb(background);
  const [ir, ig, ib] = rgb(ink);

  // One filter byte per scanline, then RGB triples.
  const stride = WIDTH * 3 + 1;
  const raw = Buffer.alloc(stride * HEIGHT);
  for (let y = 0; y < HEIGHT; y++) {
    const row = y * stride;
    raw[row] = 0; // filter: none
    for (let x = 0; x < WIDTH; x++) {
      const at = row + 1 + x * 3;
      raw[at] = br;
      raw[at + 1] = bg;
      raw[at + 2] = bb;
    }
  }

  const paint = (x0: number, y0: number, w: number, h: number): void => {
    const left = Math.max(0, Math.round(x0));
    const top = Math.max(0, Math.round(y0));
    const right = Math.min(WIDTH, Math.round(x0 + w));
    const bottom = Math.min(HEIGHT, Math.round(y0 + h));
    for (let y = top; y < bottom; y++) {
      const row = y * stride;
      for (let x = left; x < right; x++) {
        const at = row + 1 + x * 3;
        raw[at] = ir;
        raw[at + 1] = ig;
        raw[at + 2] = ib;
      }
    }
  };

  art.forEach((line, row) => {
    [...line].forEach((char, column) => {
      const coverage = CELL_COVERAGE[char];
      if (coverage === undefined) {
        return; // a space, or anything else that draws nothing
      }
      const [fx, fy, fw, fh] = coverage;
      paint(
        originX + (column + fx) * cellWidth,
        originY + (row + fy) * cellHeight,
        fw * cellWidth,
        fh * cellHeight,
      );
    });
  });

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(WIDTH, 0);
  ihdr.writeUInt32BE(HEIGHT, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // colour type: truecolour
  ihdr[10] = 0; // deflate
  ihdr[11] = 0; // adaptive filtering
  ihdr[12] = 0; // no interlace

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

export const OG_IMAGE_SIZE = { width: WIDTH, height: HEIGHT } as const;
