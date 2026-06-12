import { cp, mkdir, readdir, rm, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");
const source = join(root, "src");
const dist = join(root, "dist");

await rm(dist, { recursive: true, force: true });
await mkdir(dist, { recursive: true });

for (const item of await readdir(source)) {
  await cp(join(source, item), join(dist, item), { recursive: true });
}

const buildInfo = {
  name: "Dan Tanaka's Swarm Oscillators",
  generatedAt: new Date().toISOString(),
  modelModes: ["tanaka"],
  note: "Static browser build. No backend required.",
};
await writeFile(join(dist, "build-info.json"), JSON.stringify(buildInfo, null, 2));
console.log(`Built static site in ${dist}`);
