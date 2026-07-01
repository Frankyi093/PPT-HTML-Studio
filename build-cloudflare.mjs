import { cp, mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const frontendDir = path.join(root, "app", "frontend");
const outDir = path.join(root, "dist");

await rm(outDir, { recursive: true, force: true });
await mkdir(outDir, { recursive: true });
await cp(frontendDir, outDir, { recursive: true });

await writeFile(
  path.join(outDir, "_headers"),
  [
    "/*",
    "  X-Content-Type-Options: nosniff",
    "  Referrer-Policy: strict-origin-when-cross-origin",
    "",
  ].join("\n"),
  "utf8",
);

console.log(`Cloudflare Pages build complete: ${outDir}`);
