import { copyFileSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { HOSTNAMES, SITE, SITE_URL } from "./config.js";
import { INITIAL_THEME, THEMES } from "./themes.js";
import { TAGLINES } from "./taglines.js";
import { renderWord } from "./figlet/render.js";
import { encodeLogo } from "./logo/encode.js";
import { page } from "./site/template.js";
import { renderOgImage } from "./site/og-image.js";
import { headersFile, robotsTxt, sitemapXml } from "./site/seo.js";
import type { SiteData } from "./site/data.js";

/** This file compiles to `build/src/build.js`, so the project root is two up. */
const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..", "..");
const dist = join(root, "dist");

/** The files that ship alongside the page. */
const FONTS = ["JetBrainsMono-Light.woff2", "JetBrainsMono-Bold.woff2", "OFL.txt"];

/**
 * Inlines the site data into the bundled client.
 *
 * Two guards, because both failures are silent in the browser: an `import` or
 * `export` surviving the bundle would ship a page whose script never runs, and
 * a `__SITE_DATA__` token that failed to match would leave the client reading
 * an identifier that does not exist.
 */
function bundleClient(data: SiteData): string {
  const compiled = readFileSync(join(here, "..", "client.js"), "utf8");

  const moduleSyntax = /^\s*(?:import|export)\b/m.exec(compiled);
  if (moduleSyntax !== null) {
    throw new Error(
      `build: the bundle still has module syntax (${moduleSyntax[0].trim()}). ` +
        "esbuild should have resolved every dependency into the IIFE.",
    );
  }

  const token = /__SITE_DATA__/g;
  const hits = compiled.match(token);
  if (hits === null || hits.length !== 1) {
    throw new Error(
      `build: expected exactly one __SITE_DATA__ token in the compiled client, found ${
        hits?.length ?? 0
      }`,
    );
  }

  // `<` escaped so a tagline can never close the script element early.
  const literal = JSON.stringify(data).replace(/</g, "\\u003c");
  // esbuild already wrapped the bundle in an IIFE.
  return compiled.replace(token, literal);
}

function build(): void {
  const art = renderWord(SITE.wordmark);
  const logo = encodeLogo(art);

  const initialThemeIndex = THEMES.findIndex((theme) => theme[0] === INITIAL_THEME);
  if (initialThemeIndex === -1) {
    throw new Error(`build: no theme named ${INITIAL_THEME}`);
  }
  const initialTheme = THEMES[initialThemeIndex];

  const data: SiteData = { themes: THEMES, initialThemeIndex, taglines: TAGLINES };

  const ogImage = `${SITE_URL}/og.png`;

  const html = page({
    site: SITE,
    url: SITE_URL,
    logo,
    initialTheme,
    // The server-rendered line; the client swaps in a random one on load.
    initialTagline: TAGLINES[0],
    script: bundleClient(data),
    ogImage,
  });

  rmSync(dist, { recursive: true, force: true });
  mkdirSync(join(dist, "fonts"), { recursive: true });
  writeFileSync(join(dist, "index.html"), html, "utf8");
  for (const font of FONTS) {
    copyFileSync(join(root, "public", "fonts", font), join(dist, "fonts", font));
  }

  const [, , background, green] = initialTheme;
  writeFileSync(join(dist, "og.png"), renderOgImage(art, background, green));

  // The canonical host is the only one listed: the other five deliberately
  // point their signal at it rather than competing for the same terms.
  writeFileSync(join(dist, "robots.txt"), robotsTxt(`${SITE_URL}/sitemap.xml`), "utf8");
  writeFileSync(
    join(dist, "sitemap.xml"),
    sitemapXml([SITE_URL + "/"], new Date().toISOString().slice(0, 10)),
    "utf8",
  );
  writeFileSync(join(dist, "_headers"), headersFile(), "utf8");

  const kb = (Buffer.byteLength(html) / 1024).toFixed(1);
  console.log(
    `dist/index.html  ${kb} kB  —  ${SITE.wordmark} ` +
      `(${logo.inkColumns}×${logo.rows} cells, ${logo.capWidthRem}rem cap, ` +
      `${THEMES.length} themes, ${TAGLINES.length} taglines)`,
  );
  console.log(`  + og.png, robots.txt, sitemap.xml, _headers`);
  console.log(`  canonical ${SITE_URL} — served from ${HOSTNAMES.length} hostnames`);
}

build();
