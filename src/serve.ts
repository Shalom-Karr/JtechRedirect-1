import { createReadStream, statSync } from "node:fs";
import { createServer } from "node:http";
import { extname, join, normalize } from "node:path";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

/** A static file server for `dist/`, so the page can be checked in a browser. */

// Compiles to `build/src/serve.js`, so the project root is two up.
const dist = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "dist");
const port = Number(process.env.PORT ?? 8080);

const TYPES: Readonly<Record<string, string>> = {
  ".html": "text/html; charset=utf-8",
  ".woff2": "font/woff2",
  ".txt": "text/plain; charset=utf-8",
};

createServer((request, response) => {
  const path = new URL(request.url ?? "/", `http://localhost:${port}`).pathname;
  // normalize() collapses any `..`, and the prefix check rejects what is left.
  const file = join(dist, normalize(path === "/" ? "/index.html" : path));

  if (!file.startsWith(dist)) {
    response.writeHead(403).end("forbidden");
    return;
  }

  try {
    statSync(file);
  } catch {
    response.writeHead(404, { "content-type": "text/plain" }).end("not found");
    return;
  }

  response.writeHead(200, { "content-type": TYPES[extname(file)] ?? "application/octet-stream" });
  createReadStream(file).pipe(response);
}).listen(port, () => {
  console.log(`serving dist/ on http://localhost:${port}`);
});
