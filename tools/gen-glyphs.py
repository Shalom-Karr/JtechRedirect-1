#!/usr/bin/env python3
"""Regenerate src/figlet/glyphs.ts from the delta_corps_priest_1 FIGfont.

    pip install pyfiglet && python3 tools/gen-glyphs.py

The wordmark on oligarchy.fyi is set in this FIGfont; transcribing its glyph
art into TypeScript keeps the build free of a runtime FIGfont dependency.
Only A-Z and the space are emitted: every other printable code point is blank
in the .flf, so there is nothing to carry.
"""
import pathlib
import pyfiglet

FONT = "delta_corps_priest_1"
ROWS = 9
OUT = pathlib.Path(__file__).resolve().parent.parent / "src" / "figlet" / "glyphs.ts"

fig = pyfiglet.Figlet(font=FONT, width=4000)


def glyph(char: str) -> list[str]:
    """The char's art, padded to its own widest row (the font's advance width)."""
    lines = fig.renderText(char).split("\n")[:ROWS]
    if len(lines) != ROWS:
        raise SystemExit(f"{char!r}: expected {ROWS} rows, got {len(lines)}")
    width = max(len(line) for line in lines)
    return [line.ljust(width) for line in lines]


HEADER = f'''/**
 * Glyph art for the FIGfont `{FONT}` (Font Author: CoSMiC cHiLD,
 * built with patorjk.com's FIGFont Editor) — the typeface the oligarchy.fyi
 * wordmark is set in.
 *
 * GENERATED FILE — run `python3 tools/gen-glyphs.py` to rebuild. Do not edit.
 *
 * Each glyph is exactly {ROWS} rows tall and carries its own fixed advance
 * width, so a word renders by plain row-wise concatenation: this font does no
 * kerning and no character smushing. Only A-Z and the space exist here, and
 * the font is caseless — lowercase input maps onto the same art.
 */

export const GLYPH_ROWS = {ROWS};

export const GLYPHS: Readonly<Record<string, readonly string[]>> = {{
'''

chars = [" "] + [chr(c) for c in range(ord("A"), ord("Z") + 1)]
body = []
for char in chars:
    key = '" "' if char == " " else f'"{char}"'
    rows = ",\n".join(f"    {row!r}".replace("'", '"') for row in glyph(char))
    body.append(f"  {key}: [\n{rows},\n  ],\n")

OUT.write_text(HEADER + "".join(body) + "};\n", encoding="utf-8")
print(f"wrote {OUT} ({len(chars)} glyphs)")
