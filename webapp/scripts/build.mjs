import { cp, mkdir, rm, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");
const dist = join(root, "dist");

await rm(dist, { recursive: true, force: true });
await mkdir(dist, { recursive: true });

for (const item of [
  "index.html",
  "preset-guide.html",
  "preset-guide.js",
  "styles.css",
  "app.js",
  "src",
  "favicon.ico",
  "favicon.png",
  "apple-touch-icon.png",
]) {
  await cp(join(root, item), join(dist, item), { recursive: true });
}

const buildInfo = {
  name: "Dan Tanaka's Swarm Oscillators",
  generatedAt: new Date().toISOString(),
  modelModes: ["tanaka"],
  note: "Static browser build. No backend required.",
};
await writeFile(join(dist, "build-info.json"), JSON.stringify(buildInfo, null, 2));
console.log(`Built static site in ${dist}`);
