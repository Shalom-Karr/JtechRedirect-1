import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import vm from "node:vm";

import { seal } from "../src/site/seal.js";
import { THEMES } from "../src/themes.js";

/**
 * Exercises the bundle that actually ships — client plus baffle — inside a
 * hand-built DOM with the clock and the timer queue under test control, so the
 * changeover can be stepped through and inspected.
 *
 * These are integration checks on how the page drives baffle: that a changeover
 * lands on the right line, that the announcement waits for it, that reduced
 * motion skips it. Baffle's own behaviour is baffle's to test.
 *
 * The lines are sealed, so a changeover no longer resolves on the stack: the
 * page opens the next line while the current one holds, and the harness has to
 * let those opens land before it fires the beat that needs them. WebCrypto is
 * real here, wound down to a token number of rounds; `test/seal.test.ts` covers
 * the sealing itself.
 */

const BUNDLE = new URL("../../build/client.js", import.meta.url);

const TAGLINES = [
  "Where the thread is the documentation.",
  "TripleU is a boogy man. Nobody saw him log off.",
  "froggy left. Still sad about it.",
  "Bump.",
  "chatzie is oversmart and shows his work.",
  "Ars18 will hack it. Give him the afternoon.",
  "Uptime by stubbornness.",
];

/** Long enough to cover the obfuscate delay plus the reveal. */
const SETTLED_MS = 2000;

class FakeElement {
  /** baffle's getElements() takes this branch and wraps the node directly. */
  readonly nodeType = 1;
  textContent = "";
  content = "";
  readonly classList = {
    names: new Set<string>(),
    add(name: string) {
      this.names.add(name);
    },
    remove(name: string) {
      this.names.delete(name);
    },
    contains(name: string) {
      return this.names.has(name);
    },
  };
  readonly style: Record<string, unknown> = { setProperty: () => {} };
  private readonly listeners = new Map<string, Array<() => void>>();

  addEventListener(type: string, fn: () => void): void {
    const existing = this.listeners.get(type) ?? [];
    existing.push(fn);
    this.listeners.set(type, existing);
  }

  click(): void {
    for (const fn of this.listeners.get("click") ?? []) {
      fn();
    }
  }
}

interface Timer {
  at: number;
  every: number | undefined;
  fn: () => void;
  id: number;
}

interface Harness {
  readonly tagline: FakeElement;
  readonly announcer: FakeElement;
  readonly banner: FakeElement;
  readonly themeColor: FakeElement;
  readonly root: FakeElement;
  /** Advances the clock, running timers as they come due. */
  advance(ms: number): Promise<string[]>;
}

interface Options {
  readonly seed: number;
  readonly reduceMotion?: boolean;
  /** Leaves the sandbox without `crypto`, the way an insecure origin does. */
  readonly noCrypto?: boolean;
}

async function start(options: Options): Promise<Harness> {
  const tagline = new FakeElement();
  const announcer = new FakeElement();
  const banner = new FakeElement();
  const themeColor = new FakeElement();
  const root = new FakeElement();

  const nodes: Record<string, FakeElement> = {
    ".banner": banner,
    ".tagline__text": tagline,
    ".tagline__live": announcer,
    "meta[name=theme-color]": themeColor,
  };

  let clock = 0;
  let nextId = 1;
  const timers = new Map<number, Timer>();

  const schedule = (fn: () => void, ms: number, every: number | undefined): number => {
    const id = nextId++;
    timers.set(id, { at: clock + (ms || 0), every, fn, id });
    return id;
  };

  /**
   * WebCrypto, with the calls in flight counted. The count is what tells the
   * harness an open has finished: checked at a macrotask boundary it is zero
   * only when the whole chain has run out, because each step queues the next
   * before the loop comes back around.
   */
  let inFlight = 0;
  const counting = <A extends unknown[], R>(
    fn: (...args: A) => Promise<R>,
  ): ((...args: A) => Promise<R>) => {
    return (...args) => {
      inFlight++;
      return fn(...args).finally(() => {
        inFlight--;
      });
    };
  };

  const subtle = globalThis.crypto.subtle;
  const counted = {
    subtle: {
      importKey: counting(subtle.importKey.bind(subtle)),
      deriveKey: counting(subtle.deriveKey.bind(subtle)),
      decrypt: counting(subtle.decrypt.bind(subtle)),
    },
  };

  /**
   * Stands the virtual clock still until every open has landed. One real turn
   * of the loop per step of the chain, so three is the whole of it and the
   * budget below is only there to fail a genuine hang rather than sit on it.
   */
  const settle = async (): Promise<void> => {
    for (let turn = 0; inFlight > 0; turn++) {
      assert.ok(turn < 200, "an open never finished");
      await new Promise((resolve) => setTimeout(resolve, 0));
    }
  };

  const sandbox = {
    document: {
      documentElement: root,
      querySelector: (selector: string) => nodes[selector] ?? null,
      querySelectorAll: () => [],
    },
    window: { matchMedia: () => ({ matches: options.reduceMotion === true }) },
    // baffle's getElements() references these before reaching its nodeType check.
    NodeList: class {},
    HTMLCollection: class {},
    setTimeout: (fn: () => void, ms: number) => schedule(fn, ms, undefined),
    setInterval: (fn: () => void, ms: number) => schedule(fn, ms, ms),
    clearTimeout: (id: number) => timers.delete(id),
    clearInterval: (id: number) => timers.delete(id),
    performance: { now: () => clock },
    requestAnimationFrame: (fn: (now: number) => void) => schedule(() => fn(clock), 16, undefined),
    Date: { now: () => options.seed },
    crypto: options.noCrypto === true ? undefined : counted,
    atob,
    TextEncoder,
    TextDecoder,
    // The host's, so the bytes handed to the host's WebCrypto are its own.
    Uint8Array,
  };

  const code = readFileSync(BUNDLE, "utf8").replace(
    "__SITE_DATA__",
    JSON.stringify({
      themes: THEMES,
      initialThemeIndex: 19,
      taglines: seal(TAGLINES, { iterations: 1000 }),
    }),
  );

  vm.createContext(sandbox);
  vm.runInContext(code, sandbox);

  const advance = async (ms: number): Promise<string[]> => {
    const painted: string[] = [];
    const until = clock + ms;
    let guard = 0;

    for (;;) {
      const due = [...timers.values()]
        .filter((t) => t.at <= until)
        .sort((a, b) => a.at - b.at)[0];
      if (due === undefined || guard++ > 20000) {
        break;
      }
      clock = due.at;
      if (due.every === undefined) {
        timers.delete(due.id);
      } else {
        // The rotation is the only repeating timer, and it is the one that
        // needs the line it is about to show already open.
        due.at = clock + due.every;
        await settle();
      }
      due.fn();
      painted.push(tagline.textContent);
    }

    clock = until;
    await settle();
    return painted;
  };

  // The opening line has to come open before there is anything to look at.
  await settle();

  return { tagline, announcer, banner, themeColor, root, advance };
}

test("opens on a tagline, in both the visible text and the live region", async () => {
  const page = await start({ seed: 1_700_000_000_000 });

  assert.ok(TAGLINES.includes(page.tagline.textContent));
  assert.equal(page.announcer.textContent, page.tagline.textContent);
});

test("scrambles on the way over, then lands exactly on the next line", async () => {
  const page = await start({ seed: 1_700_000_000_000 });
  const before = page.tagline.textContent;

  const painted = await page.advance(SETTLED_MS + 7000);
  const after = page.tagline.textContent;

  assert.notEqual(after, before, "the tagline never changed");
  assert.ok(TAGLINES.includes(after), `landed on something unexpected: ${after}`);

  const pool = new Set("█▓▒░▄▀▌▐<>/\\[]{}()=+*^?#$&%0123456789ABCDEF");
  const scrambled = painted.filter(
    (frame) => !TAGLINES.includes(frame) && [...frame].some((char) => pool.has(char)),
  );
  assert.ok(scrambled.length > 0, "nothing was ever scrambled");
});

test("leaves the word gaps alone so the line still reads as words", async () => {
  const page = await start({ seed: 1_700_000_000_042 });
  const painted = await page.advance(SETTLED_MS + 7000);
  const target = page.tagline.textContent;

  // baffle excludes the space character by default; this pins that we have not
  // overridden it, because filling the gaps turns the line into a bar of noise.
  const gaps = [...target].flatMap((char, i) => (char === " " ? [i] : []));
  assert.ok(gaps.length > 0, "the destination line has no spaces to check");

  const midway = painted.filter((frame) => frame.length === target.length && frame !== target);
  assert.ok(midway.length > 0, "never caught a frame mid-scramble");

  for (const frame of midway) {
    for (const at of gaps) {
      assert.equal(frame[at], " ", `gap at ${at} filled in: ${JSON.stringify(frame)}`);
    }
  }
});

test("holds the announcement back until the line has settled", async () => {
  const page = await start({ seed: 1_700_000_000_007 });
  const opening = page.announcer.textContent;

  // Into the first changeover, but not through it.
  await page.advance(7000 + 200);
  assert.equal(page.announcer.textContent, opening, "announced before it settled");

  await page.advance(SETTLED_MS);
  assert.equal(page.announcer.textContent, page.tagline.textContent);
  assert.ok(TAGLINES.includes(page.announcer.textContent));
});

test("swaps outright when the visitor asked for reduced motion", async () => {
  const page = await start({ seed: 1_700_000_000_000, reduceMotion: true });
  const before = page.tagline.textContent;

  await page.advance(7000 + 1);

  assert.notEqual(page.tagline.textContent, before);
  assert.ok(TAGLINES.includes(page.tagline.textContent));
  // Settled and announced together, with nothing scrambled in between.
  assert.equal(page.announcer.textContent, page.tagline.textContent);
});

test("a different clock gives a different walk, and the walk covers everything", async () => {
  const walk = async (seed: number): Promise<string[]> => {
    const page = await start({ seed });
    const seen = [page.tagline.textContent];
    // Sampled a fixed offset past each tick, so exactly one changeover lands
    // between samples and each one is read after it has settled. Advancing by a
    // window wider than the interval would eventually fit two ticks into one.
    await page.advance(7000 + 1500);
    seen.push(page.tagline.textContent);
    for (let i = 2; i < TAGLINES.length; i++) {
      await page.advance(7000);
      seen.push(page.tagline.textContent);
    }
    return seen;
  };

  const first = await walk(1_700_000_000_000);
  const second = await walk(1_700_000_555_123);

  // The stride is coprime with the list length, so one pass visits every line.
  for (const [label, seen] of [["first", first], ["second", second]] as const) {
    assert.ok(
      seen.every((line) => TAGLINES.includes(line)),
      `${label} walk sampled something mid-scramble: ${JSON.stringify(seen)}`,
    );
    assert.equal(new Set(seen).size, TAGLINES.length, `${label} walk repeated a line`);
  }
  assert.notDeepEqual(first, second, "two different clocks produced the same walk");
});

test("keeps the line it was served when the boxes cannot be opened at all", async () => {
  // What an insecure origin gets: no `crypto.subtle`, so nothing ever opens and
  // the page is left with the line the server rendered rather than a blank.
  const page = await start({ seed: 1_700_000_000_000, noCrypto: true });

  assert.equal(page.tagline.textContent, "", "the harness renders no opening line");
  await page.advance(7000 * 3);
  assert.equal(page.tagline.textContent, "", "kept trying after the first failure");
});

test("cycles the theme when the banner is clicked", async () => {
  const page = await start({ seed: 1_700_000_000_000 });

  page.banner.click();

  // Starts at tokyo-night (19), so one click lands on the next theme along.
  assert.equal(page.themeColor.content, THEMES[20][2]);
  assert.equal(page.root.style.colorScheme, THEMES[20][1]);
});
