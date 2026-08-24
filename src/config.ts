/**
 * Everything that makes this page *this* page. The wordmark, the domains and
 * the copy live here so a variant is a config change rather than an edit spread
 * across the template, the stylesheet and the client.
 */
export interface SiteConfig {
  /** The word set in block type. A-Z and spaces only — see `renderWord`. */
  readonly wordmark: string;
  /** The domain the page points at, and the one all copies canonicalise to. */
  readonly domain: string;
  readonly title: string;
  readonly description: string;
}

export const SITE: SiteConfig = {
  wordmark: "Jtech Forums",
  domain: "jtechforums.org",
  title: "Jtech Forums",
  description: "Where the thread is the documentation.",
};

/** The site every copy of this page sends its visitors and its ranking to. */
export const SITE_URL = `https://${SITE.domain}`;

/**
 * Every hostname this build is served from. One Cloudflare Pages project backs
 * all of them; they differ only in the URL in the address bar, which is why
 * each carries a canonical pointing back at `SITE_URL`.
 */
export const HOSTNAMES: readonly string[] = [
  "mitmachim.com",
  "apps4flip.org",
  "jtechforums.com",
  "jtech.tripleu.org",
  "jtech.tripleumdm.com",
  "jtech.jtechforums.org",
];
