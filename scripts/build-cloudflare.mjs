import { copyFile, cp, mkdir, readFile, readdir, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const frontendDir = path.join(root, "app", "frontend");
const outDir = path.join(root, "dist");
const publicDir = path.join(outDir, "public");
const workerPath = path.join(root, "worker", "cloudflare-worker.js");
const workerOutPath = path.join(outDir, "cloudflare-worker.js");
const skillsDir = path.join(root, "worker", "ai-engine", "skills");
const aiEngineDir = path.join(root, "worker", "ai-engine");

async function collectTextAssets(dir, baseDir = dir, assets = {}) {
  const entries = await readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      await collectTextAssets(fullPath, baseDir, assets);
      continue;
    }
    if (!entry.isFile()) continue;
    const info = await stat(fullPath);
    if (info.size > 5 * 1024 * 1024) {
      throw new Error(`Frontend asset exceeds Cloudflare embedding limit: ${path.relative(root, fullPath)} (${info.size} bytes)`);
    }
    const relPath = path.relative(baseDir, fullPath).replace(/\\/g, "/");
    assets[relPath] = await readFile(fullPath, "utf8");
  }
  return assets;
}

async function embedAssetsInWorker() {
  const assets = await collectTextAssets(publicDir);
  const missingReferences = new Set();
  for (const [assetName, content] of Object.entries(assets)) {
    for (const match of String(content).matchAll(/\/static\/([A-Za-z0-9._/-]+)/g)) {
      if (match[1].endsWith("/") || !/\.[a-z0-9]+$/i.test(match[1])) continue;
      const referenced = `static/${match[1]}`;
      if (!Object.prototype.hasOwnProperty.call(assets, referenced)) missingReferences.add(`${assetName} -> ${referenced}`);
    }
  }
  if (missingReferences.size) {
    throw new Error(`Missing referenced frontend assets:\n${[...missingReferences].sort().join("\n")}`);
  }
  const skills = await collectTextAssets(skillsDir);
  const workerSource = await readFile(workerPath, "utf8");
  const requiredApiRoutes = [
    "/api/html-anything/convert/stream",
    "/api/word-deck/v2/window/stream",
    "/api/capabilities",
    "/api/ppt-ai-enhance",
    "/api/pdf-ai-enhance/stream",
    "/api/pdf-research/v4/outline/stream",
    "/api/pdf-research/v4/deck/stream",
    "/api/pdf-research/v5/outline/stream",
    "/api/pdf-research/v5/deck/stream",
    "/api/pdf-presentation/v1/plan/stream",
    "/api/image-model/config",
    "/api/image-model/test",
    "/api/minimal-zine-poster/v1/compile/stream",
    "/api/minimal-zine-poster/v1/render",
    "/api/quiet-humanist-poster/v1/compile/stream",
    "/api/quiet-humanist-poster/v1/render",
    "/api/acid-swiss-poster/v1/compile/stream",
    "/api/acid-swiss-poster/v1/render",
    "/api/editorial-action-poster/v1/compile/stream",
    "/api/editorial-action-poster/v1/render",
    "/api/qiaomu-mondo-poster/v1/compile/stream",
    "/api/qiaomu-mondo-poster/v1/render",
    "/api/academic-poster/copy/stream",
    "/api/academic-poster/image",
    "/api/academic-poster/plan/stream",
    "/api/academic-poster/render/stream",
    "/api/academic-poster/review/stream",
    "/api/academic-poster/v4/plan/stream",
    "/api/academic-poster/v4/render/stream",
    "/api/academic-poster/v4/review/stream",
    "/api/academic-poster/v4/repair/stream",
  ];
  const missingApiRoutes = requiredApiRoutes.filter((route) => !workerSource.includes(`path === "${route}"`) && !workerSource.includes(`path === '${route}'`));
  if (missingApiRoutes.length) {
    throw new Error(`Worker route contract failed; missing API routes:\n${missingApiRoutes.join("\n")}`);
  }
  const skillMarker = "const HTML_ANYTHING_SKILLS = Object.freeze(";
  const skillStart = workerSource.indexOf(skillMarker);
  const skillEnd = workerSource.indexOf("\nconst STATIC_ASSETS", skillStart);
  if (skillStart === -1 || skillEnd === -1) {
    throw new Error("Could not locate HTML_ANYTHING_SKILLS block in worker/cloudflare-worker.js");
  }
  const marker = "const STATIC_ASSETS = Object.freeze(";
  const staticEnd = (source, from) => {
    const match = /\r?\n\r?\nfunction corsHeaders\(\)/.exec(source.slice(from));
    return match ? from + match.index : -1;
  };
  const start = workerSource.indexOf(marker);
  const end = start === -1 ? -1 : staticEnd(workerSource, start);
  if (start === -1 || end === -1) {
    throw new Error("Could not locate STATIC_ASSETS block in worker/cloudflare-worker.js");
  }
  const withSkills = `${workerSource.slice(0, skillStart)}${skillMarker}${JSON.stringify(skills)});${workerSource.slice(skillEnd)}`;
  // Static frontend files are served by the Cloudflare Assets binding. Keep
  // the Worker fallback map empty so large JS/HTML/PDF runtimes do not inflate
  // the Worker bundle or get serialized on every request.
  const replacement = `${marker}{});`;
  const nextStart = withSkills.indexOf(marker);
  const nextEnd = nextStart === -1 ? -1 : staticEnd(withSkills, nextStart);
  await writeFile(workerOutPath, `${withSkills.slice(0, nextStart)}${replacement}${withSkills.slice(nextEnd)}`, "utf8");
  await cp(aiEngineDir, path.join(outDir, "ai-engine"), { recursive: true });
  console.log(`Prepared ${Object.keys(skills).length} HTML Anything skill assets and ${Object.keys(assets).length} static frontend assets for Cloudflare Assets`);
}

await rm(outDir, { recursive: true, force: true });
await mkdir(outDir, { recursive: true });
await mkdir(publicDir, { recursive: true });
await cp(frontendDir, publicDir, { recursive: true });
// PDF parsing stays entirely in the browser.  Only the parser and its worker
// are copied into the deployed static assets; the Worker never receives an
// uploaded PDF binary and no external document/OCR service is introduced.
const pdfJsDir = path.join(root, "node_modules", "pdfjs-dist", "legacy", "build");
await copyFile(path.join(pdfJsDir, "pdf.min.js"), path.join(publicDir, "static", "pdf.min.js"));
await copyFile(path.join(pdfJsDir, "pdf.worker.min.js"), path.join(publicDir, "static", "pdf.worker.min.js"));

const aiHtmlPath = path.join(publicDir, "ai-generate.html");
const aiLiveHtmlPath = path.join(publicDir, "ai-generate-live.html");
const aiCssPath = path.join(publicDir, "static", "ai-generate.css");
const aiJsPath = path.join(publicDir, "static", "ai-generate.js");
const aiLiveCssPath = path.join(publicDir, "static", "ai-generate-live.css");
const aiLiveJsPath = path.join(publicDir, "static", "ai-generate-live.js");
const aiHtml = await readFile(aiHtmlPath, "utf8");
await copyFile(aiCssPath, aiLiveCssPath);
// Keep the dedicated live runtime when it exists.  It owns the preview
// workbench integration and must not be replaced by the legacy quick-create
// bundle during every Cloudflare build.
try {
  await stat(aiLiveJsPath);
} catch {
  await copyFile(aiJsPath, aiLiveJsPath);
}
await writeFile(
  aiLiveHtmlPath,
  aiHtml
    .replace(/\/static\/ai-generate\.css/g, "/static/ai-generate-live.css")
    .replace(/\/static\/ai-generate\.js/g, "/static/ai-generate-live.js"),
  "utf8",
);

await copyFile(path.join(publicDir, "index.html"), path.join(publicDir, "index-current.html"));
await copyFile(path.join(publicDir, "converter.html"), path.join(publicDir, "converter-current.html"));
await copyFile(path.join(publicDir, "chat-create.html"), path.join(publicDir, "chat-create-current.html"));
await copyFile(path.join(publicDir, "ai-settings.html"), path.join(publicDir, "settings-current.html"));
await copyFile(aiLiveHtmlPath, path.join(publicDir, "quick-create-current.html"));

await writeFile(
  path.join(publicDir, "_headers"),
  [
    "/*",
    "  X-Content-Type-Options: nosniff",
    "  Referrer-Policy: strict-origin-when-cross-origin",
    "",
  ].join("\n"),
  "utf8",
);

await embedAssetsInWorker();

console.log(`Cloudflare build complete: ${outDir}`);
