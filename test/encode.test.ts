import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

import { renderWord } from "../src/figlet/render.js";
import { encodeLogo } from "../src/logo/encode.js";
import { SITE } from "../src/config.js";

interface LogoFixture {
  readonly source: string;
  readonly word: string;
  readonly viewBox: string;
  readonly d: string;
}

const fixture: LogoFixture = JSON.parse(
  // This file runs from `build/test/`; the fixture stays in the source tree.
  readFileSync(new URL("../../test/fixtures/oligarchy-logo.json", import.meta.url), "utf8"),
);

/**
 * The acceptance test for the whole wordmark pipeline. Render the word the
 * source page renders, encode it, and demand the same bytes it shipped — path
 * and viewBox both. The viewBox is the half that catches the interesting bug:
 * a box sized from the art's nominal column count instead of from its rightmost
 * ink is one trailing blank column too wide, and the path still matches.
 */
test("re-encodes the oligarchy.fyi wordmark byte for byte", () => {
  const geometry = encodeLogo(renderWord(fixture.word));

  assert.equal(geometry.path, fixture.d, "path differs from the live wordmark");
  assert.equal(geometry.viewBox, fixture.viewBox, "viewBox differs from the live wordmark");
});

test("caps its width where the source page caps its type", () => {
  const geometry = encodeLogo(renderWord(fixture.word));

  // 55.8rem is the value in oligarchy.fyi's stylesheet.
  assert.equal(geometry.capWidthRem, 55.8);
});

test("sizes the viewBox from the rightmost ink, not the nominal width", () => {
  // The trailing glyph of "Oligarchy" is a Y, whose art ends in a blank column;
  // the box must stop at column 99 rather than padding out to 100.
  const geometry = encodeLogo(renderWord(fixture.word));

  assert.equal(geometry.inkColumns, 100);
  assert.equal(renderWord(fixture.word)[0].length, 101);
});

test("renders this site's own wordmark", () => {
  const geometry = encodeLogo(renderWord(SITE.wordmark));

  assert.equal(geometry.rows, 9);
  assert.ok(geometry.path.startsWith("M"));
  assert.ok(geometry.path.endsWith("z"));
  assert.match(geometry.viewBox, /^0 -113\.125 \d+(\.\d+)? \d+(\.\d+)?$/);
});

test("rejects characters the wordmark font cannot draw", () => {
  // The font defines A-Z and the space only — every digit and every mark of
  // punctuation is blank in it, so these must stop the build.
  for (const word of ["Jtech Forums 2", "jtechforums.org", "Jtech-Forums"]) {
    assert.throws(() => renderWord(word), /has no glyph for/);
  }
});

test("collapses runs but never merges half-width cells", () => {
  // A row of four full cells is one rectangle; a row of two left-half cells is
  // two, because merging them would flood the gap between them.
  assert.equal(encodeLogo(["████", "", "", "", "", "", "", "", ""]).path.match(/M/g)?.length, 1);
  assert.equal(encodeLogo(["▌▌", "", "", "", "", "", "", "", ""]).path.match(/M/g)?.length, 2);
});
