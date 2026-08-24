/**
 * The build-time token the build replaces with a JSON literal.
 *
 * Declared here rather than imported in `client.ts`, so that file stays a
 * script: a single `import type` would be enough for TypeScript to emit a
 * trailing `export {}` and turn the client into a module the page cannot run
 * inline.
 */
declare const __SITE_DATA__: import("../site/data.js").SiteData;
