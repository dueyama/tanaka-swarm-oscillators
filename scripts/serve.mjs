import { createReadStream, existsSync, statSync } from "node:fs";
import { createServer } from "node:http";
import { extname, join, normalize, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const rootArg = process.argv[2] ?? ".";
const port = Number(process.argv[3] ?? 5173);
const root = resolve(here, "..", rootArg);
const mimes = new Map([
  [".html", "text/html; charset=utf-8"],
  [".css", "text/css; charset=utf-8"],
  [".js", "text/javascript; charset=utf-8"],
  [".json", "application/json; charset=utf-8"],
  [".svg", "image/svg+xml"],
  [".png", "image/png"],
]);

function safePath(urlPath) {
  const clean = decodeURIComponent(urlPath.split("?")[0]);
  const rel = normalize(clean).replace(/^\/+/, "");
  const candidate = resolve(root, rel || "index.html");
  if (!candidate.startsWith(root)) return null;
  return candidate;
}

createServer((req, res) => {
  let path = safePath(req.url ?? "/");
  if (!path) {
    res.writeHead(403);
    res.end("Forbidden");
    return;
  }
  if (existsSync(path) && statSync(path).isDirectory()) path = join(path, "index.html");
  if (!existsSync(path)) {
    // Single-page fallback for future routes; real static assets still 404 if extension is present.
    if (extname(path)) {
      res.writeHead(404);
      res.end("Not found");
      return;
    }
    path = join(root, "index.html");
  }
  res.writeHead(200, {
    "Content-Type": mimes.get(extname(path)) ?? "application/octet-stream",
    "Cache-Control": "no-cache",
  });
  createReadStream(path).pipe(res);
}).listen(port, "127.0.0.1", () => {
  console.log(`Dan Tanaka's Swarm Oscillators running at http://127.0.0.1:${port}/`);
});
