# Jtech Forums — landing page

The page served on the Jtech redirect domains. Block-type wordmark, a tagline
that scrambles to the next one, one link out. Click the wordmark to change theme.

```
npm install
npm run check     # compile, test, build
npm run serve     # build, then serve dist/ on :8080
npm run deploy    # build, then push to Cloudflare Pages
```

Output is `dist/` — one self-contained `index.html`, fonts, `og.png`,
`robots.txt`, `sitemap.xml`, `_headers`.

## Editing

| Want to change | File |
| --- | --- |
| the word, the domain, the copy | `src/config.ts` |
| the taglines | `src/taglines.ts` |
| the colours | `src/themes.ts` |
| the layout | `src/site/styles.ts` |

Changing the wordmark is one line in `src/config.ts` — the SVG, viewBox, width
cap and favicon all follow from it. **A-Z and spaces only:** the type has no
digits or punctuation, so anything else stops the build.

## Hosting

One Cloudflare Pages project, `jtechredirect`, serves nine hostnames:

- `mitmachim.com`, `apps4flip.org`, `jtechforums.com` — each with `www.`
- `jtech.tripleu.org`, `jtech.tripleumdm.com`, `jtech.jtechforums.org`

All canonicalise to jtechforums.org. Deploying needs a **scoped** Cloudflare API
token (Account → Cloudflare Pages → Edit), never the account-wide Global key:

```
export CLOUDFLARE_API_TOKEN=...
export CLOUDFLARE_ACCOUNT_ID=2d433e3215fc8be53cc63fc504a5b993
```

## Five things that will bite you

**The redirect rules are disabled, not deleted.** `mitmachim.com`,
`apps4flip.org` and `jtechforums.com` each had a rule 301-ing everything to
jtechforums.org. It fires before Pages, so it had to go off for this page to
show. Re-enable in Rules → Redirect Rules per zone. A 301 consolidates SEO
better than a canonical — if these domains should only pass signal, turn them
back on.

**`jtechforums.org` is not this project.** Its apex runs on the separate
`jtechforums` project. Only the `jtech.` subdomain is served from here. Don't
point the apex at this.

**`og:image` uses the pages.dev origin, not the canonical host.** jtechforums.org
answers `/og.png` with its own HTML, which breaks every social card. See
`ASSET_ORIGIN` in `src/config.ts`.

**No `www.jtech.*`.** That's a second-level subdomain; the edge certificate
doesn't cover it. It was tried, TLS failed, it was removed. Needs Advanced
Certificate Manager.

**No WebCrypto, no rotation.** The taglines are sealed, so showing one means
opening it, which needs a secure context. `https://` and `http://localhost` are
fine. Served from a bare LAN IP it is not, and the page silently keeps the one
line it was rendered with — nothing errors, so there is nothing in the console
to find.

## How the wordmark works

The type is the FIGfont `delta_corps_priest_1`; `src/figlet/glyphs.ts` holds its
glyph art. That art ships as SVG rectangles rather than as a `<pre>`, because at
phone sizes per-glyph rounding knocks the rows out of column.

The rectangles aren't an approximation of that text — they use the numbers the
browser would have, in thousandths of an em:

| | | from |
| --- | --- | --- |
| column pitch | `557.5` | advance `600` + `letter-spacing: -0.0425em` |
| row pitch | `1093.75` | `line-height: 1.09375` |
| cell | `600 × 1320` | `█`'s box in JetBrains Mono |
| row 0 top | `−113.125` | CSS half-leading |

`test/encode.test.ts` re-encodes [oligarchy.fyi](https://oligarchy.fyi/)'s own
wordmark — the page this is recreated from — and asserts the result matches what
that page ships, byte for byte, path and viewBox both.

## The tagline

128 lines, shuffled. Each holds 7s, then scrambles over using
[baffle](https://github.com/camwiegert/baffle) (MIT). esbuild bundles it in, so
the page still fetches nothing.

Where a visit starts and the stride it walks by are both seeded from the clock,
and the stride is coprime with the list length — so one pass hits all 128 before
any repeat, and two reloads take different routes.

Screen readers get only settled lines, never the scramble.
`prefers-reduced-motion` skips it.

### They don't ship as text

Each line is an AES-256-GCM box under a key of its own, stretched with 600,000
rounds of PBKDF2-SHA-256 over a salt that is fresh every build.
`src/site/seal.ts` writes them, `src/client/open.ts` opens them,
`test/seal.test.ts` holds those two ends together.

This is not secrecy and can't be — the password is right there in the bundle,
because the browser is the thing doing the opening. What it buys is that
`view-source` shows base64 instead of the list, so the jokes get met one at a
time rather than read in a block. The cost is per line, ~0.1s in Chrome on a
laptop: the page pays it for the next line while the current one is still up, so
it disappears into the 7s hold. Reading all 128 means paying it 128 times —
~15s of pegged CPU on a laptop, minutes on a phone, and a script to drive it.
Whoever writes that script was never going to be stopped by anything shipped to
their machine. Whoever opens devtools out of idle curiosity is.

Exactly one line ships in the clear: the site description, because the page has
to say something before a script has run and that line is in the meta tags
anyway. `src/build.ts` fails the build if any other tagline turns up in the HTML.

`ITERATIONS` in `src/site/seal.ts` is the only lever, and it is double-edged —
it slows a dump and the first line of a visit by the same factor, and the first
line is the one a visitor actually waits for.

A slow enough device just misses a beat: with nothing open yet the line holds
another 7s instead of scrambling into a blank.

## Notes

- Fonts are self-hosted, byte-identical to the ones omarchy-site ships. OFL-1.1,
  licence travels with them.
- Cloudflare Web Analytics is on per-zone with auto-install — the beacon is
  injected at the edge, not in this repo.
- `tools/*.py` regenerate `glyphs.ts` and reshuffle `taglines.ts`. Not in the
  build; both outputs are committed. Delete them if you like.
- The wordmark is 140 columns to oligarchy's 100, so glyphs run thinner on a
  phone under the same `80vw` rule. Lever is in `src/site/styles.ts`.
