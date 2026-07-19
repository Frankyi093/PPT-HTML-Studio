import { copyFile, cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const frontendDir = path.join(root, "app", "frontend");
const outDir = path.join(root, "dist");

await rm(outDir, { recursive: true, force: true });
await mkdir(outDir, { recursive: true });
await cp(frontendDir, outDir, { recursive: true });

const aiHtmlPath = path.join(outDir, "ai-generate.html");
const aiLiveHtmlPath = path.join(outDir, "ai-generate-live.html");
const aiCssPath = path.join(outDir, "static", "ai-generate.css");
const aiJsPath = path.join(outDir, "static", "ai-generate.js");
const aiLiveCssPath = path.join(outDir, "static", "ai-generate-live.css");
const aiLiveJsPath = path.join(outDir, "static", "ai-generate-live.js");
const aiHtml = await readFile(aiHtmlPath, "utf8");
await copyFile(aiCssPath, aiLiveCssPath);
await copyFile(aiJsPath, aiLiveJsPath);
await writeFile(
  aiLiveHtmlPath,
  aiHtml
    .replace(/\/static\/ai-generate\.css/g, "/static/ai-generate-live.css")
    .replace(/\/static\/ai-generate\.js/g, "/static/ai-generate-live.js"),
  "utf8",
);

await copyFile(path.join(outDir, "index.html"), path.join(outDir, "index-current.html"));
await copyFile(path.join(outDir, "converter.html"), path.join(outDir, "converter-current.html"));
await copyFile(path.join(outDir, "chat-create.html"), path.join(outDir, "chat-create-current.html"));
await copyFile(path.join(outDir, "ai-settings.html"), path.join(outDir, "settings-current.html"));
await copyFile(aiLiveHtmlPath, path.join(outDir, "quick-create-current.html"));

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

console.log(`Cloudflare build complete: ${outDir}`);
