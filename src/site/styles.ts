import type { Theme } from "../themes.js";

/**
 * The stylesheet, recreated from oligarchy.fyi. The one thing that is computed
 * rather than copied is the banner's rem cap, which follows the wordmark's own
 * width so a different word renders at the same glyph size.
 *
 * The `:root` palette is emitted from the theme table rather than written out,
 * so the colours the page loads with cannot drift from the entry the client
 * starts its cycle at.
 */
export function styles(initialTheme: Theme, capWidthRem: number): string {
  const [, , background, green, blue, cyan, white, accent] = initialTheme;

  return `
  /* Self-hosted rather than pulled from Google Fonts: a swapped fallback would
     reflow the whole page. Light blocks (it's the banner), Bold swaps (it's one
     link). */
  @font-face {
    font-display: block;
    font-family: 'JetBrains Mono';
    font-style: normal;
    font-weight: 300;
    src: url('fonts/JetBrainsMono-Light.woff2') format('woff2');
  }

  @font-face {
    font-display: swap;
    font-family: 'JetBrains Mono';
    font-style: normal;
    font-weight: 700;
    src: url('fonts/JetBrainsMono-Bold.woff2') format('woff2');
  }

  /* Omarchy's tokyo-night. Clicking the banner swaps these for another of
     Omarchy's default themes — see src/themes.ts. */
  :root {
    --background: ${background};
    --green:      ${green};
    --blue:       ${blue};
    --cyan:       ${cyan};
    --white:      ${white};
    --accent:     ${accent};
    --font-family: 'JetBrains Mono', monospace;
    --transition: 0.15s cubic-bezier(0.33, 1, 0.68, 1);
  }

  * { margin: 0; padding: 0; box-sizing: border-box; }

  html { color-scheme: dark; }

  body {
    background: var(--background);
    color: var(--blue);
    font-family: var(--font-family);
    font-weight: 300;
    line-height: 1.5;
    min-height: 100vh;
    min-height: 100dvh;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 2em;
    padding: 2em 1em;
    text-align: center;
    text-wrap: balance;
    transition: background-color var(--transition), color var(--transition);
  }

  /* Vector, not a <pre>: at the sizes a phone lands on, per-glyph rounding
     knocks the rows out of column and the word turns to mush. The geometry is
     JetBrains Mono's own, so it draws what the <pre> was meant to look like —
     see src/logo/encode.ts. ${capWidthRem}rem is where the type caps, and 80vw
     tracks that proportion below it. */
  .banner {
    background: none;
    border: 0;
    color: var(--green);
    cursor: pointer;
    display: block;
    padding: 0;
    width: min(80vw, ${capWidthRem}rem);
    transition: color var(--transition);
  }

  .banner:focus-visible {
    outline: 2px solid var(--accent);
    outline-offset: 0.5em;
  }

  .logo {
    display: block;
    height: auto;
    width: 100%;
  }

  /* Two lines are reserved whatever the tagline, so the rotation never moves
     the page. 40ch is the widest measure that still wraps the longest line into
     two, and the vw term keeps that 40ch inside the viewport on phones. */
  .tagline {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 3em;
    font-size: min(3.5vw, 1.5rem);
    max-width: 40ch;
  }

  /* Lit in the banner colour while the characters are still cycling, settling
     back as the line resolves. */
  .tagline__text {
    transition: color 0.45s cubic-bezier(0.33, 1, 0.68, 1);
  }

  .tagline__text--rolling {
    color: var(--green);
    transition: none;
  }

  /* Carries the settled line for screen readers, which should never be read
     the scramble. Hidden without being removed from the accessibility tree. */
  .tagline__live {
    position: absolute;
    width: 1px;
    height: 1px;
    margin: -1px;
    padding: 0;
    border: 0;
    overflow: hidden;
    clip-path: inset(50%);
    white-space: nowrap;
  }

  a {
    color: var(--cyan);
    font-weight: 700;
    font-size: clamp(0.875rem, 1.75vw, 1rem);
    text-decoration-thickness: 0.0875em;
    text-underline-offset: 0.25em;
    transition: color var(--transition);
  }

  @media (hover: hover) {
    a:hover { color: var(--white); }
    .banner:hover { color: var(--accent); }
  }

  /* The roll itself is skipped in the client; this covers the rest. */
  @media (prefers-reduced-motion: reduce) {
    body, .banner, .tagline, .tagline__text { transition: none; }
  }
`;
}
