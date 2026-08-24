import type { SiteConfig } from "../config.js";

/**
 * Search and social metadata.
 *
 * These six hostnames serve identical content, which is duplicate content by
 * any search engine's definition. The right answer for a set of redirect
 * domains is not to fight that but to declare it: every copy carries a
 * canonical pointing at the main site, so whatever signal the other five
 * attract is consolidated there instead of competing with it.
 */

export interface SeoInput {
  readonly site: SiteConfig;
  /** The hostname this copy is served from. */
  readonly origin: string;
  /** The site all copies consolidate their ranking signal into. */
  readonly canonical: string;
  readonly ogImage: string;
}

function jsonLd(input: SeoInput): string {
  const { site, canonical, ogImage } = input;

  const graph = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": `${canonical}/#organization`,
        name: site.title,
        url: canonical,
        logo: { "@type": "ImageObject", url: ogImage },
      },
      {
        "@type": "WebSite",
        "@id": `${canonical}/#website`,
        name: site.title,
        description: site.description,
        url: canonical,
        publisher: { "@id": `${canonical}/#organization` },
        inLanguage: "en",
      },
      {
        "@type": "WebPage",
        "@id": `${canonical}/#webpage`,
        name: site.title,
        description: site.description,
        url: canonical,
        isPartOf: { "@id": `${canonical}/#website` },
        primaryImageOfPage: { "@type": "ImageObject", url: ogImage },
      },
    ],
  };

  // `<` escaped so nothing in the data can close the script element early.
  return JSON.stringify(graph).replace(/</g, "\\u003c");
}

export function seoTags(input: SeoInput): string {
  const { site, canonical, ogImage } = input;
  const escape = (text: string): string =>
    text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

  return [
    `<meta name="description" content="${escape(site.description)}">`,
    `<link rel="canonical" href="${escape(canonical)}">`,
    // Indexed and followed, with no snippet or preview limits.
    `<meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1">`,
    `<meta property="og:site_name" content="${escape(site.title)}">`,
    `<meta property="og:title" content="${escape(site.title)}">`,
    `<meta property="og:description" content="${escape(site.description)}">`,
    `<meta property="og:url" content="${escape(canonical)}">`,
    `<meta property="og:type" content="website">`,
    `<meta property="og:locale" content="en_US">`,
    `<meta property="og:image" content="${escape(ogImage)}">`,
    `<meta property="og:image:width" content="1200">`,
    `<meta property="og:image:height" content="630">`,
    `<meta property="og:image:alt" content="${escape(site.wordmark)}">`,
    `<meta name="twitter:card" content="summary_large_image">`,
    `<meta name="twitter:title" content="${escape(site.title)}">`,
    `<meta name="twitter:description" content="${escape(site.description)}">`,
    `<meta name="twitter:image" content="${escape(ogImage)}">`,
    `<script type="application/ld+json">${jsonLd(input)}</script>`,
  ].join("\n");
}

/**
 * Everything is crawlable — the canonical, not a disallow, is what tells search
 * engines which copy counts.
 */
export function robotsTxt(sitemapUrl: string): string {
  return ["User-agent: *", "Allow: /", "", `Sitemap: ${sitemapUrl}`, ""].join("\n");
}

export function sitemapXml(urls: readonly string[], lastModified: string): string {
  const entries = urls
    .map((url) =>
      [
        "  <url>",
        `    <loc>${url}</loc>`,
        `    <lastmod>${lastModified}</lastmod>`,
        "    <changefreq>weekly</changefreq>",
        "    <priority>1.0</priority>",
        "  </url>",
      ].join("\n"),
    )
    .join("\n");

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    entries,
    "</urlset>",
    "",
  ].join("\n");
}

/**
 * Cloudflare Pages reads this to set response headers. The font and the image
 * are immutable build outputs, so they get a long cache; the page itself must
 * revalidate or a deploy would not reach anyone already holding a copy.
 */
export function headersFile(): string {
  return `/*
  X-Content-Type-Options: nosniff
  Referrer-Policy: strict-origin-when-cross-origin
  X-Frame-Options: SAMEORIGIN
  Permissions-Policy: geolocation=(), microphone=(), camera=()

/fonts/*
  Cache-Control: public, max-age=31536000, immutable

/og.png
  Cache-Control: public, max-age=86400

/index.html
  Cache-Control: public, max-age=0, must-revalidate
`;
}
