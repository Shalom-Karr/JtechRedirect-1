import type { LogoGeometry } from "../logo/encode.js";
import type { SiteConfig } from "../config.js";
import type { Theme } from "../themes.js";

import { faviconDataUri } from "./favicon.js";
import { seoTags } from "./seo.js";
import { styles } from "./styles.js";

/** Escapes text for an attribute value or for element content. */
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export interface PageInput {
  readonly site: SiteConfig;
  readonly url: string;
  readonly logo: LogoGeometry;
  readonly initialTheme: Theme;
  readonly initialTagline: string;
  /** The compiled client, data already inlined and body already wrapped. */
  readonly script: string;
  /** Absolute URL of the social card image. */
  readonly ogImage: string;
}

export function page(input: PageInput): string {
  const { site, url, logo, initialTheme, initialTagline, script, ogImage } = input;
  const [, , background, green] = initialTheme;
  const favicon = faviconDataUri(site.wordmark, background, green);

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(site.title)}</title>
${seoTags({ site, origin: url, canonical: url, ogImage })}
<link rel="icon" href="${escapeHtml(favicon)}">
<meta name="theme-color" content="${escapeHtml(background)}">
<link rel="preload" href="fonts/JetBrainsMono-Light.woff2" as="font" type="font/woff2" crossorigin>
<style>${styles(initialTheme, logo.capWidthRem)}</style>
</head>
<body>
  <button class="banner" type="button" aria-label="Change colour scheme">
  <!-- logo:start -->
  <svg class="logo" viewBox="${logo.viewBox}" role="img" aria-label="${escapeHtml(
    site.wordmark,
  )}" xmlns="http://www.w3.org/2000/svg"><path fill="currentColor" d="${logo.path}"/></svg>
  <!-- logo:end -->
  </button>
  <p class="tagline"><span class="tagline__text" aria-hidden="true">${escapeHtml(
    initialTagline,
  )}</span><span class="tagline__live" aria-live="polite">${escapeHtml(initialTagline)}</span></p>
  <a href="${escapeHtml(url)}">${escapeHtml(site.domain)}&nbsp;&rarr;</a>
  <script>${script}</script>
</body>
</html>
`;
}
