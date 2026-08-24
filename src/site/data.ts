import type { Theme } from "../themes.js";

/**
 * The data the build hands to the browser. It is inlined into the page as a
 * JSON literal in place of the client's `__SITE_DATA__`, so the client ships as
 * one self-contained script with nothing to fetch.
 */
export interface SiteData {
  readonly themes: readonly Theme[];
  /** Where the cycle starts: the theme the stylesheet already paints. */
  readonly initialThemeIndex: number;
  readonly taglines: readonly string[];
}
