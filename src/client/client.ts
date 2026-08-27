import baffle from "baffle";

import { opener } from "./open.js";

/**
 * The page's whole runtime: click the banner to repaint in the next theme, and
 * shuffle the tagline over to the next one on a timer.
 *
 * The taglines arrive sealed (see `src/site/data.ts`), so each one is opened
 * during the hold before it is due rather than all of them up front.
 *
 * esbuild bundles this and its dependencies into a single IIFE, which the build
 * then inlines into the page; the build asserts the bundle is import-free, so
 * nothing is left for the browser to fetch. The site-data token is declared in
 * `site-data.d.ts` and the build swaps it for a JSON literal, insisting on
 * finding it exactly once.
 */

/** How long a tagline holds before the next one comes in. */
const ROTATE_MS = 7000;

/** How long the text stays scrambled before it starts resolving. */
const OBFUSCATE_MS = 320;

/** How long the reveal takes once it begins. */
const REVEAL_MS = 900;

/** How often baffle re-rolls the scrambled characters. */
const SPEED_MS = 55;

/**
 * The pool baffle scrambles with — weighted towards the block shapes the
 * wordmark is built from, so the effect reads as part of the same typeface
 * rather than as noise borrowed from somewhere else.
 */
const CHARACTERS = "█▓▒░▄▀▌▐<>/\\[]{}()=+*^?#$&%0123456789ABCDEF";

function need<T>(value: T | null, what: string): T {
  if (value === null) {
    throw new Error(`client: missing ${what}`);
  }
  return value;
}

const data = __SITE_DATA__;

const root = document.documentElement;
const banner = need(document.querySelector<HTMLButtonElement>(".banner"), ".banner");
const tagline = need(document.querySelector<HTMLElement>(".tagline__text"), ".tagline__text");
const announcer = need(document.querySelector<HTMLElement>(".tagline__live"), ".tagline__live");
const themeColor = need(
  document.querySelector<HTMLMetaElement>("meta[name=theme-color]"),
  "the theme-color meta",
);

const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

/* -- theme -------------------------------------------------------------- */

// The stylesheet already paints the initial theme, so the first click moves on
// from where the page starts rather than repainting it.
let themeIndex = data.initialThemeIndex;

banner.addEventListener("click", () => {
  themeIndex = (themeIndex + 1) % data.themes.length;
  const [, mode, background, green, blue, cyan, white, accent] = data.themes[themeIndex];

  root.style.colorScheme = mode;
  for (const [name, color] of Object.entries({ background, green, blue, cyan, white, accent })) {
    root.style.setProperty(`--${name}`, color);
  }
  themeColor.content = background;
});

/* -- where this visit starts -------------------------------------------- */

/** mulberry32: small, fast, and good enough to spread a clock seed out. */
function seeded(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const random = seeded(Date.now());

function gcd(a: number, b: number): number {
  while (b !== 0) {
    [a, b] = [b, a % b];
  }
  return a;
}

/**
 * A stride that is coprime with the list length, so adding it repeatedly visits
 * every tagline exactly once before any of them repeats. Seeding both the start
 * and the stride from the clock means a reload does not merely begin at a
 * different point in a fixed running order — it takes a different route through
 * the whole list.
 */
function stride(length: number): number {
  if (length < 3) {
    return 1;
  }
  let step = 1 + Math.floor(random() * (length - 1));
  while (gcd(step, length) !== 1) {
    step = (step % (length - 1)) + 1;
  }
  return step;
}

const sealed = data.taglines;
const count = sealed.lines.length;
const open = opener(sealed);
const step = stride(count);
let taglineIndex = Math.floor(random() * count);

/* -- the changeover ------------------------------------------------------ */

const shuffle = baffle(tagline, { characters: CHARACTERS, speed: SPEED_MS });

/** Cancels a pending reveal if the next changeover starts first. */
let settling: ReturnType<typeof setTimeout> | undefined;

/**
 * Scrambles the line, swaps in the next one underneath, and lets it resolve.
 *
 * The live region is updated only once the text has settled, so a screen reader
 * is given the line rather than the scramble on its way there.
 */
function changeover(next: string): void {
  if (reduceMotion.matches) {
    tagline.textContent = next;
    announcer.textContent = next;
    return;
  }

  clearTimeout(settling);
  tagline.classList.add("tagline__text--rolling");

  shuffle.start();
  shuffle.text(() => next);
  shuffle.reveal(REVEAL_MS, OBFUSCATE_MS);

  // reveal() does not report completion in 0.3.6, so the settle is timed to it.
  settling = setTimeout(() => {
    tagline.classList.remove("tagline__text--rolling");
    announcer.textContent = next;
  }, OBFUSCATE_MS + REVEAL_MS);
}

/* -- opening the next line ahead of its turn ----------------------------- */

/** The line the next beat will show, once it has come open. */
let upcoming: string | undefined;

/** Whether an open is already in flight, so a missed beat does not stack. */
let opening = false;

function lookAhead(): void {
  if (opening || upcoming !== undefined) {
    return;
  }
  opening = true;
  void open((taglineIndex + step) % count).then(
    (line) => {
      upcoming = line;
      opening = false;
    },
    () => {
      // Nothing to do about it here; the next beat asks again.
      opening = false;
    },
  );
}

const rotating = setInterval(() => {
  if (upcoming === undefined) {
    // Still opening. Hold this line for another beat rather than start a
    // scramble with nothing to land on.
    lookAhead();
    return;
  }

  taglineIndex = (taglineIndex + step) % count;
  const line = upcoming;
  upcoming = undefined;
  changeover(line);
  lookAhead();
}, ROTATE_MS);

// The page ships with a line already in it, so there is something to read while
// this visit's own opening line comes open. That swap has always been abrupt —
// it just used to be instant as well.
void open(taglineIndex).then(
  (line) => {
    tagline.textContent = line;
    announcer.textContent = line;
    lookAhead();
  },
  () => {
    // The first line failing means the boxes cannot be opened at all — no
    // `crypto.subtle`, which is what an insecure origin gets. The page keeps
    // the line it was served rather than retrying every seven seconds.
    clearInterval(rotating);
  },
);
