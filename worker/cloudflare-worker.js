import JSZip from "jszip";

const jobs = new Map();
const jobList = [];
let integrationConfig = {
  mode: "local",
  endpoint: "",
  apiKey: "",
  apiKeyHeader: "Authorization",
  apiKeyPrefix: "Bearer ",
  customHeaders: "",
  workflowPayload: "flat",
  model: "gpt-4.1-mini",
  timeoutSec: 90,
  fallbackToLocal: true,
};

const DEFAULT_API_GUIDE = `# API Configuration Tutorial

## Cloudflare-only mode

This deployment runs fully on Cloudflare Workers. It does not use Vercel or a Python backend.

## Required fields

1. Choose a service.
2. Paste the API key.
3. Keep the default endpoint and model unless your provider gives a custom value.
4. Click Save connection.
5. Click Test API.

## Notes

- Local rules need no API key.
- Cloudflare Workers currently support .pptx conversion in this deployment.
- Old binary .ppt files are not supported in Cloudflare-only mode.
- Very large files are limited by Cloudflare Worker request and memory limits.
- API keys saved here are kept in the Worker isolate memory and may reset after redeploy or idle periods. For production, store provider keys as Cloudflare Secrets and hide them from the browser.
`;

function corsHeaders() {
  return {
    "access-control-allow-origin": "*",
    "access-control-allow-methods": "GET, POST, OPTIONS",
    "access-control-allow-headers": "Content-Type, Authorization, X-API-Key, api-key",
    "access-control-expose-headers": "Content-Disposition",
  };
}

function json(payload, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      ...corsHeaders(),
    },
  });
}

function textResponse(text, type = "text/plain; charset=utf-8", status = 200) {
  return new Response(text, {
    status,
    headers: {
      "content-type": type,
      "cache-control": "no-store",
      ...corsHeaders(),
    },
  });
}

function bytesResponse(bytes, type, filename) {
  return new Response(bytes, {
    headers: {
      "content-type": type,
      "content-disposition": `attachment; filename="${filename}"`,
      "cache-control": "no-store",
      ...corsHeaders(),
    },
  });
}

function publicIntegration(config = integrationConfig) {
  const { apiKey, ...rest } = config;
  return {
    ...rest,
    hasApiKey: Boolean(apiKey),
    apiKeyMasked: apiKey ? `${apiKey.slice(0, 4)}...${apiKey.slice(-4)}` : "",
  };
}

async function readJson(request) {
  try {
    return await request.json();
  } catch {
    throw new Error("Request body must be JSON.");
  }
}

function decodeDataUrl(dataUrl) {
  const match = String(dataUrl || "").match(/^data:([^;,]+)?(;base64)?,(.*)$/);
  if (!match) throw new Error("Invalid uploaded file payload.");
  const isBase64 = Boolean(match[2]);
  const payload = match[3] || "";
  const binary = isBase64 ? atob(payload) : decodeURIComponent(payload);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function bytesToBase64(bytes) {
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  }[char]));
}

function xmlDecode(value) {
  return String(value || "")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'");
}

function normalizeZipPath(base, target) {
  const parts = base.split("/");
  parts.pop();
  for (const item of target.split("/")) {
    if (!item || item === ".") continue;
    if (item === "..") parts.pop();
    else parts.push(item);
  }
  return parts.join("/");
}

function sortedSlidePaths(zip) {
  return Object.keys(zip.files)
    .filter((name) => /^ppt\/slides\/slide\d+\.xml$/i.test(name))
    .sort((a, b) => Number(a.match(/slide(\d+)\.xml/i)?.[1] || 0) - Number(b.match(/slide(\d+)\.xml/i)?.[1] || 0));
}

function relationshipMap(relsXml, slidePath) {
  const map = new Map();
  const relPattern = /<Relationship\b([^>]*?)\/?>/g;
  let match;
  while ((match = relPattern.exec(relsXml || ""))) {
    const attrs = match[1] || "";
    const id = attrs.match(/\bId="([^"]+)"/)?.[1];
    const target = attrs.match(/\bTarget="([^"]+)"/)?.[1];
    if (id && target) map.set(id, normalizeZipPath(slidePath, target));
  }
  return map;
}

function extractTexts(slideXml) {
  const texts = [];
  const pattern = /<a:t[^>]*>([\s\S]*?)<\/a:t>/g;
  let match;
  while ((match = pattern.exec(slideXml || ""))) {
    const text = xmlDecode(match[1]).replace(/\s+/g, " ").trim();
    if (text) texts.push(text);
  }
  return texts;
}

async function extractImages(zip, slideXml, rels, slideIndex) {
  const images = [];
  const seen = new Set();
  const pattern = /r:embed="([^"]+)"/g;
  let match;
  while ((match = pattern.exec(slideXml || ""))) {
    const relId = match[1];
    if (seen.has(relId)) continue;
    seen.add(relId);
    const path = rels.get(relId);
    const file = path ? zip.file(path) : null;
    if (!file) continue;
    const bytes = await file.async("uint8array");
    const ext = path.split(".").pop()?.toLowerCase() || "png";
    const mime = ext === "jpg" || ext === "jpeg" ? "image/jpeg" : ext === "gif" ? "image/gif" : ext === "svg" ? "image/svg+xml" : "image/png";
    images.push({
      src: `data:${mime};base64,${bytesToBase64(bytes)}`,
      name: `slide-${String(slideIndex).padStart(3, "0")}-image-${images.length + 1}.${ext}`,
      mime,
      size: bytes.length,
    });
  }
  return images;
}

async function extractPptx(fileBytes) {
  const zip = await JSZip.loadAsync(fileBytes);
  const slides = [];
  const paths = sortedSlidePaths(zip);
  for (let index = 0; index < paths.length; index += 1) {
    const slidePath = paths[index];
    const slideXml = await zip.file(slidePath).async("string");
    const relsPath = slidePath.replace("ppt/slides/", "ppt/slides/_rels/") + ".rels";
    const relsXml = zip.file(relsPath) ? await zip.file(relsPath).async("string") : "";
    const rels = relationshipMap(relsXml, slidePath);
    const texts = extractTexts(slideXml);
    const images = await extractImages(zip, slideXml, rels, index + 1);
    const title = texts[0] || `Slide ${index + 1}`;
    slides.push({
      page: index + 1,
      title,
      body: texts.slice(1),
      images,
    });
  }
  if (!slides.length) throw new Error("No slides found in this PPTX file.");
  return slides;
}

function splitCards(items, max = 6) {
  return items.filter(Boolean).slice(0, max);
}

function themeFor(style) {
  const themes = {
    softlesson: ["#f8fbff", "#1f3b67", "#477fb2", "#eaf4ff"],
    healing: ["#fff8ec", "#45352e", "#8abed8", "#f7e7c8"],
    doodle: ["#fff6df", "#3c2c2c", "#8ecae6", "#ffe4a8"],
    swiss: ["#ffffff", "#14213d", "#2563eb", "#eef2ff"],
    vivid: ["#fff7ed", "#172554", "#f97316", "#e0f2fe"],
    contrast: ["#0f172a", "#ffffff", "#38bdf8", "#1e293b"],
  };
  const [bg, ink, accent, panel] = themes[style] || ["#f8fbff", "#172554", "#3b82f6", "#eef6ff"];
  return { bg, ink, accent, panel };
}

function renderSlide(slide, index, total, style) {
  const theme = themeFor(style);
  const hasImages = slide.images.length > 0;
  const cards = splitCards(slide.body, hasImages ? 4 : 8);
  const bodyClass = hasImages ? "with-media" : "text-only";
  const cardHtml = cards.map((item) => `<div class="point-card">${escapeHtml(item)}</div>`).join("");
  const imageHtml = slide.images.map((image) => `<img src="${image.src}" alt="Slide ${slide.page} image" />`).join("");
  const isCover = index === 0;
  return `
    <section class="slide ${bodyClass} ${isCover ? "cover" : ""}" id="slide-${index + 1}" style="--bg:${theme.bg};--ink:${theme.ink};--accent:${theme.accent};--panel:${theme.panel}">
      <div class="slide-inner">
        <header>
          <span class="chapter">Chapter ${String(index + 1).padStart(2, "0")}</span>
          <h1>${escapeHtml(slide.title)}</h1>
        </header>
        <main>
          <div class="content-grid">${cardHtml || `<div class="point-card lead">${escapeHtml(slide.title)}</div>`}</div>
          ${hasImages ? `<div class="media-grid">${imageHtml}</div>` : ""}
        </main>
        <footer>${index + 1} / ${total}</footer>
      </div>
    </section>`;
}

function deckScript() {
  return `
    <script>
      let currentSlide = 0;
      const slides = Array.from(document.querySelectorAll('.slide'));
      function showSlide(index) {
        currentSlide = Math.max(0, Math.min(index, slides.length - 1));
        slides.forEach((slide, i) => slide.classList.toggle('active', i === currentSlide));
      }
      function nextSlide() { showSlide(currentSlide + 1); }
      function prevSlide() { showSlide(currentSlide - 1); }
      function toggleEdit(force) {
        const editing = typeof force === 'boolean' ? force : !document.body.classList.contains('editing');
        document.body.classList.toggle('editing', editing);
        document.querySelectorAll('h1,.point-card,.chapter').forEach((node) => node.contentEditable = editing ? 'true' : 'false');
      }
      async function exportEditedHtml(mode = 'paged') {
        const clone = document.documentElement.cloneNode(true);
        clone.querySelectorAll('[contenteditable]').forEach((node) => node.removeAttribute('contenteditable'));
        clone.querySelector('body')?.classList.remove('editing');
        if (mode === 'scroll') clone.querySelector('body')?.classList.add('scroll-mode');
        else clone.querySelector('body')?.classList.remove('scroll-mode');
        return '<!doctype html>\\n' + clone.outerHTML;
      }
      window.toggleEdit = toggleEdit;
      window.exportEditedHtml = exportEditedHtml;
      document.addEventListener('keydown', (event) => {
        if (event.key === 'ArrowRight' || event.key === 'PageDown') nextSlide();
        if (event.key === 'ArrowLeft' || event.key === 'PageUp') prevSlide();
      });
      showSlide(0);
    </script>`;
}

function buildHtml(slides, style, mode = "paged") {
  const bodyClass = mode === "scroll" ? "scroll-mode" : "";
  const slideHtml = slides.map((slide, index) => renderSlide(slide, index, slides.length, style)).join("\n");
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>PPT HTML Studio</title>
  <style>
    * { box-sizing: border-box; }
    html, body { margin: 0; min-height: 100%; background: #edf4ff; color: #16213e; font-family: Inter, Arial, sans-serif; }
    body { overflow: hidden; }
    body.scroll-mode { overflow: auto; }
    .slide { width: 100vw; height: 100vh; display: none; background: var(--bg); color: var(--ink); overflow: hidden; }
    .slide.active { display: block; }
    body.scroll-mode .slide { display: block; min-height: 100vh; height: auto; page-break-after: always; }
    .slide-inner { width: min(1600px, 100vw); height: 100%; margin: 0 auto; padding: 54px 74px 52px; display: grid; grid-template-rows: auto 1fr auto; gap: 26px; position: relative; }
    header { display: grid; gap: 12px; text-align: left; }
    .chapter { color: var(--accent); font-size: 28px; font-weight: 800; letter-spacing: .04em; text-transform: uppercase; }
    h1 { margin: 0; font-size: clamp(46px, 5.2vw, 82px); line-height: 1.05; max-width: 100%; overflow-wrap: anywhere; }
    .cover header { align-self: center; text-align: center; }
    .cover h1 { font-size: clamp(58px, 6.4vw, 96px); }
    main { min-height: 0; display: grid; gap: 34px; align-items: stretch; }
    .with-media main { grid-template-columns: minmax(0, 1fr) minmax(340px, .9fr); }
    .text-only main { grid-template-columns: 1fr; }
    .content-grid { min-height: 0; display: grid; grid-template-columns: repeat(auto-fit, minmax(310px, 1fr)); gap: 22px; align-content: stretch; }
    .point-card { min-width: 0; border-radius: 22px; background: var(--panel); border: 2px solid color-mix(in srgb, var(--accent) 22%, transparent); padding: 24px 28px; font-size: clamp(30px, 2.4vw, 42px); line-height: 1.22; font-weight: 650; overflow-wrap: anywhere; display: flex; align-items: center; box-shadow: 0 18px 45px rgba(20, 36, 70, .08); }
    .point-card.lead { justify-content: center; text-align: center; }
    .media-grid { min-height: 0; display: grid; gap: 18px; align-content: center; }
    .media-grid img { width: 100%; max-height: 34vh; object-fit: contain; border-radius: 18px; box-shadow: 0 20px 50px rgba(15, 23, 42, .18); background: #fff; }
    footer { justify-self: end; color: color-mix(in srgb, var(--ink) 60%, transparent); font-size: 22px; }
    .nav { position: fixed; z-index: 20; left: 50%; bottom: 18px; transform: translateX(-50%); display: flex; gap: 10px; }
    .nav button { border: 0; border-radius: 10px; padding: 10px 16px; background: rgba(37, 99, 235, .86); color: white; font-size: 18px; font-weight: 800; cursor: pointer; box-shadow: 0 10px 24px rgba(30, 64, 175, .24); }
    .nav button:first-child { background: rgba(100, 116, 139, .55); }
    body.scroll-mode .nav { display: none; }
    body.editing [contenteditable="true"] { outline: 3px dashed var(--accent); outline-offset: 4px; }
    @media (max-width: 900px) {
      .slide-inner { padding: 34px 28px 50px; }
      .with-media main { grid-template-columns: 1fr; }
      h1 { font-size: 44px; }
      .point-card { font-size: 28px; }
    }
  </style>
</head>
<body class="${bodyClass}">
  ${slideHtml}
  <div class="nav"><button onclick="prevSlide()">Prev</button><button onclick="nextSlide()">Next</button></div>
  ${deckScript()}
</body>
</html>`;
}

async function maybeGenerateAiHtml(slides, config, style) {
  if (!config.apiKey || config.mode !== "ai_api" || !config.endpoint) return null;
  const endpoint = normalizeChatEndpoint(config.endpoint);
  const prompt = `Generate a complete standalone editable HTML slide deck in English from this JSON. Use embedded images as provided. Strict rules: all body text font-size must be greater than 30pt; all titles must be greater than 45pt; no text may overflow the viewport; do not use scrollable text boxes; preserve images; include Prev/Next buttons that are small and do not overlap editing controls; expose window.toggleEdit() and window.exportEditedHtml(mode). Return only HTML code.\n\n${JSON.stringify({ style, slides: slides.map((slide) => ({ title: slide.title, body: slide.body, images: slide.images.map((image) => image.src) })) }).slice(0, 90000)}`;
  const headers = {
    "content-type": "application/json",
    [config.apiKeyHeader || "Authorization"]: `${config.apiKeyPrefix ?? "Bearer "}${config.apiKey}`,
  };
  for (const line of String(config.customHeaders || "").split(/\r?\n/)) {
    const [key, ...rest] = line.split(":");
    if (key && rest.length) headers[key.trim()] = rest.join(":").trim();
  }
  const response = await fetch(endpoint, {
    method: "POST",
    headers,
    body: JSON.stringify({
      model: config.model || "gpt-4.1-mini",
      messages: [
        { role: "system", content: "You are an expert presentation HTML designer. Return only valid standalone HTML." },
        { role: "user", content: prompt },
      ],
      temperature: 0.2,
    }),
  });
  const data = await response.json().catch(async () => ({ message: await response.text() }));
  if (!response.ok) throw new Error(data.message || data.error?.message || `API HTTP ${response.status}`);
  const text = data.choices?.[0]?.message?.content || data.output_text || data.text || "";
  const html = extractHtml(text);
  return html || null;
}

function normalizeChatEndpoint(endpoint) {
  const value = String(endpoint || "").trim().replace(/\/+$/, "");
  if (!value) return "";
  if (value.endsWith("/chat/completions")) return value;
  if (value.endsWith("/v1") || value.endsWith("/api/v3")) return `${value}/chat/completions`;
  return value;
}

function extractHtml(text) {
  const raw = String(text || "").trim();
  const fenced = raw.match(/```(?:html)?\s*([\s\S]*?)```/i)?.[1]?.trim();
  const candidate = fenced || raw;
  if (/<html[\s>]/i.test(candidate) || /<!doctype html/i.test(candidate)) return candidate;
  return "";
}

async function buildZip(job) {
  const zip = new JSZip();
  zip.file("index.html", job.inlinePreviewHtml);
  zip.file("index-scroll.html", job.inlineScrollHtml);
  zip.file("index-single-file.html", job.inlinePreviewHtml);
  zip.file("index-scroll-single-file.html", job.inlineScrollHtml);
  zip.file("README-open.txt", "Open index.html for paged navigation, or index-scroll.html for continuous scrolling.\nImages are embedded in the HTML, so they will not be lost.\n");
  return zip.generateAsync({ type: "uint8array", compression: "DEFLATE" });
}

async function createJob(payload) {
  const filename = String(payload.filename || "presentation.pptx");
  if (!filename.toLowerCase().endsWith(".pptx")) {
    throw new Error("Cloudflare-only deployment supports .pptx files. Old .ppt files require the local Python backend.");
  }
  const fileBytes = decodeDataUrl(payload.fileBase64);
  const slides = await extractPptx(fileBytes);
  const style = payload.style || "teaching";
  let aiStatus = { mode: integrationConfig.mode || "local", used: false };
  let pagedHtml = "";
  try {
    pagedHtml = await maybeGenerateAiHtml(slides, integrationConfig, style);
    if (pagedHtml) {
      aiStatus = { mode: integrationConfig.mode, provider: integrationConfig.endpoint, used: true, resultType: "html" };
    }
  } catch (error) {
    aiStatus = { mode: integrationConfig.mode, used: false, fallback: true, error: String(error.message || error) };
    if (!integrationConfig.fallbackToLocal) throw error;
  }
  if (!pagedHtml) pagedHtml = buildHtml(slides, style, "paged");
  const scrollHtml = pagedHtml.includes("scroll-mode") ? pagedHtml.replace(/<body class="[^"]*"/, '<body class="scroll-mode"') : buildHtml(slides, style, "scroll");
  const id = `CF-${Date.now().toString(36).toUpperCase()}-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
  const job = {
    id,
    fileName: filename,
    slides: slides.length,
    style,
    status: "completed",
    updatedAt: new Date().toISOString(),
    previewUrl: `/outputs/${id}/index.html`,
    scrollUrl: `/outputs/${id}/index-scroll.html`,
    downloadUrl: `/api/jobs/${id}/download`,
    inlinePreviewHtml: pagedHtml,
    inlineScrollHtml: scrollHtml,
    inlinePreviewMode: "blob",
    aiStatus,
    share: {
      status: "ready",
      recommendation: "Ready to share. Images are embedded in the HTML and included in the ZIP package.",
      totalImages: slides.reduce((sum, slide) => sum + slide.images.length, 0),
      embeddedImages: slides.reduce((sum, slide) => sum + slide.images.length, 0),
      missingImages: 0,
      riskyPaths: 0,
      externalImages: 0,
      zipPackageUrl: `/api/jobs/${id}/download`,
      singleFileUrl: `/outputs/${id}/index-single-file.html`,
      scrollSingleFileUrl: `/outputs/${id}/index-scroll-single-file.html`,
      reportUrl: `/outputs/${id}/share-report.json`,
    },
  };
  jobs.set(id, job);
  jobList.unshift(job);
  while (jobList.length > 20) {
    const removed = jobList.pop();
    if (removed) jobs.delete(removed.id);
  }
  return job;
}

async function handleGenerate(request) {
  const payload = await readJson(request);
  const job = await createJob(payload);
  return json({ job });
}

async function saveEdited(request, id) {
  const job = jobs.get(id);
  if (!job) return json({ error: "job_not_found", message: "This Cloudflare Worker instance no longer has the job. Regenerate the PPT and download immediately." }, 404);
  const payload = await readJson(request);
  if (payload.pagedHtml) job.inlinePreviewHtml = String(payload.pagedHtml);
  if (payload.scrollHtml) job.inlineScrollHtml = String(payload.scrollHtml);
  job.updatedAt = new Date().toISOString();
  return json({ job, share: job.share });
}

async function testIntegration() {
  if (integrationConfig.mode === "local") return json({ ok: true, message: "Local Cloudflare rules are ready." });
  if (!integrationConfig.apiKey) return json({ ok: false, message: "API key is required." }, 400);
  try {
    const html = await maybeGenerateAiHtml([{ title: "API Test", body: ["Return a tiny valid HTML slide."], images: [] }], integrationConfig, "clean");
    return json({ ok: Boolean(html), message: html ? "API test passed." : "API responded but did not return HTML." });
  } catch (error) {
    return json({ ok: false, error: "integration_test_failed", message: String(error.message || error) }, 502);
  }
}

function routeOutput(path) {
  const match = path.match(/^\/outputs\/([^/]+)\/(.+)$/);
  if (!match) return null;
  const job = jobs.get(match[1]);
  if (!job) return json({ error: "job_not_found", message: "This generated file is no longer in Worker memory. Regenerate and download the ZIP." }, 404);
  const file = match[2];
  if (file === "index.html" || file === "index-single-file.html") return textResponse(job.inlinePreviewHtml, "text/html; charset=utf-8");
  if (file === "index-scroll.html" || file === "index-scroll-single-file.html") return textResponse(job.inlineScrollHtml, "text/html; charset=utf-8");
  if (file === "share-report.json") return json(job.share);
  return null;
}

async function handleApi(request, env) {
  const url = new URL(request.url);
  const path = url.pathname;
  if (request.method === "GET" && path === "/api/health") {
    return json({
      status: "ok",
      runtime: "cloudflare-worker-only",
      supportedFormats: [".pptx"],
      maxUploadMb: 20,
      maxRawUploadMb: 20,
      maxRawUploadBytes: 20 * 1024 * 1024,
      maxPayloadBytes: 35 * 1024 * 1024,
      message: "Cloudflare-only backend ready. No Vercel or Python backend is used.",
    });
  }
  if (request.method === "GET" && path === "/api/help/api-guide") return json({ markdown: DEFAULT_API_GUIDE });
  if (request.method === "GET" && path === "/api/jobs") return json({ jobs: jobList });
  if (request.method === "GET" && path === "/api/integration") return json({ integration: publicIntegration() });
  if (request.method === "POST" && path === "/api/integration") {
    const payload = await readJson(request);
    const patch = payload.integration || payload;
    integrationConfig = { ...integrationConfig, ...patch };
    if (!patch.apiKey && integrationConfig.apiKey && !patch.clearApiKey) {
      integrationConfig.apiKey = integrationConfig.apiKey;
    }
    if (patch.clearApiKey) integrationConfig.apiKey = "";
    return json({ integration: publicIntegration() });
  }
  if (request.method === "POST" && path === "/api/integration/test") return testIntegration();
  if (request.method === "POST" && path === "/api/generate") return handleGenerate(request);
  const saveMatch = path.match(/^\/api\/jobs\/([^/]+)\/save-edited$/);
  if (request.method === "POST" && saveMatch) return saveEdited(request, saveMatch[1]);
  const shareMatch = path.match(/^\/api\/jobs\/([^/]+)\/share$/);
  if (request.method === "GET" && shareMatch) {
    const job = jobs.get(shareMatch[1]);
    if (!job) return json({ error: "job_not_found" }, 404);
    return json({ job, share: job.share });
  }
  const downloadMatch = path.match(/^\/api\/jobs\/([^/]+)\/download$/);
  if (request.method === "GET" && downloadMatch) {
    const job = jobs.get(downloadMatch[1]);
    if (!job) return json({ error: "job_not_found", message: "Regenerate this PPT and download immediately. Worker memory is temporary without KV/R2." }, 404);
    const zipBytes = await buildZip(job);
    return bytesResponse(zipBytes, "application/zip", `${job.id}.zip`);
  }
  return null;
}

export default {
  async fetch(request, env) {
    try {
      const url = new URL(request.url);
      if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders() });
      if (url.pathname.startsWith("/api/")) {
        const response = await handleApi(request, env);
        if (response) return response;
      }
      if (url.pathname.startsWith("/outputs/")) {
        const response = routeOutput(url.pathname);
        if (response) return response;
      }
      return env.ASSETS.fetch(request);
    } catch (error) {
      return json({ error: "worker_error", message: String(error.message || error) }, 500);
    }
  },
};
