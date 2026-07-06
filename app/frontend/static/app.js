const steps = [
  ["Upload", "Upload your PPT file"],
  ["Extract", "Extract content from PPT"],
  ["Optimize", "Apply readability & layout rules"],
  ["Convert", "Convert to HTML slides"],
  ["Edit", "Review and refine HTML"],
];

const styles = [
  ["teaching", "Teaching Blue"],
  ["softlesson", "Soft Lesson"],
  ["webacademic", "Academic Webpage"],
  ["clean", "Clean"],
  ["academic", "Academic"],
  ["instructional", "Instructional"],
  ["minimal", "Minimal"],
  ["contrast", "High Contrast"],
  ["healing", "Healing Hand-drawn"],
  ["doodle", "Doodle Sketch"],
  ["swiss", "Swiss Grid"],
  ["editorial", "Editorial"],
  ["vivid", "Vivid"],
];

const apiProviders = {
  local: {
    mode: "local",
    label: "Local rules active",
  },
  deepseek: {
    mode: "ai_api",
    endpoint: "https://api.deepseek.com/v1",
    model: "deepseek-chat",
    apiKeyHeader: "Authorization",
    apiKeyPrefix: "Bearer ",
    customHeaders: "",
    workflowPayload: "flat",
    label: "DeepSeek ready",
  },
  doubao_seed: {
    mode: "ai_api",
    endpoint: "https://ark.cn-beijing.volces.com/api/v3",
    model: "doubao-seed-2-0-lite-260428",
    apiKeyHeader: "Authorization",
    apiKeyPrefix: "Bearer ",
    customHeaders: "",
    workflowPayload: "flat",
    timeoutSec: 300,
    label: "Doubao Seed 2.0 ready",
  },
  openai: {
    mode: "ai_api",
    endpoint: "https://api.openai.com/v1",
    model: "gpt-4.1-mini",
    apiKeyHeader: "Authorization",
    apiKeyPrefix: "Bearer ",
    customHeaders: "",
    workflowPayload: "flat",
    label: "OpenAI-compatible ready",
  },
  custom_ai: {
    mode: "ai_api",
    model: "gpt-4.1-mini",
    apiKeyHeader: "Authorization",
    apiKeyPrefix: "Bearer ",
    workflowPayload: "flat",
    label: "Custom AI API ready",
  },
  workflow: {
    mode: "workflow_api",
    apiKeyHeader: "Authorization",
    apiKeyPrefix: "Bearer ",
    workflowPayload: "flat",
    label: "Workflow API ready",
  },
  dify: {
    mode: "workflow_api",
    apiKeyHeader: "Authorization",
    apiKeyPrefix: "Bearer ",
    workflowPayload: "dify",
    label: "Dify workflow ready",
  },
};

const state = {
  selectedFile: null,
  selectedStyle: "teaching",
  apiProvider: "local",
  apiBaseUrl: "",
  runtime: "local",
  maxUploadBytes: 100 * 1024 * 1024,
  maxRequestBytes: 150 * 1024 * 1024,
  jobs: [],
  activeJob: null,
  activeShare: null,
  activeStep: 0,
  busy: false,
  generationOverlayDismissed: false,
  inlineObjectUrls: [],
  integration: {
    mode: "local",
    endpoint: "",
    apiKeyHeader: "Authorization",
    apiKeyPrefix: "Bearer ",
    customHeaders: "",
    workflowPayload: "flat",
    model: "gpt-4.1-mini",
    timeoutSec: 90,
    fallbackToLocal: true,
    hasApiKey: false,
    apiKeyMasked: "",
  },
};

const el = (id) => document.getElementById(id);
const API_SECRET_STORAGE_KEY = "ppt-html-studio-api-secret-v2";

function readLocalApiSecret() {
  try {
    return JSON.parse(localStorage.getItem(API_SECRET_STORAGE_KEY) || "{}");
  } catch {
    return {};
  }
}

function writeLocalApiSecret(secret) {
  try {
    localStorage.setItem(API_SECRET_STORAGE_KEY, JSON.stringify(secret || {}));
  } catch {
    // localStorage can be disabled in strict browser modes; generation will still work when a key is typed.
  }
}

function localApiKeyForCurrentProvider() {
  const secret = readLocalApiSecret();
  const provider = state.apiProvider || inferApiProvider(state.integration);
  return secret[provider] || secret[state.integration.endpoint || ""] || "";
}

function maskedKey(value) {
  return value ? `${value.slice(0, 4)}...${value.slice(-4)}` : "";
}

function integrationForGeneration() {
  const integration = collectIntegration(false, { allowClear: false });
  const savedKey = localApiKeyForCurrentProvider();
  if (integration.mode !== "local") {
    integration.apiKey = el("apiKey").value.trim() || savedKey;
    integration.fallbackToLocal = false;
  }
  return integration;
}

function normalizeBaseUrl(value) {
  return String(value || "").trim().replace(/\/+$/, "");
}

function apiUrl(path) {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${state.apiBaseUrl}${normalizedPath}`;
}

function absoluteRuntimeUrl(url) {
  if (!url || /^(?:blob:|data:|https?:\/\/)/i.test(url)) return url;
  return apiUrl(url);
}

function escapeHelpHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  }[char]));
}

function inlineMarkdown(value) {
  return escapeHelpHtml(value)
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
}

function renderHelpMarkdown(markdown) {
  const lines = String(markdown || "").replace(/\r\n/g, "\n").split("\n");
  const parts = [];
  let inCode = false;
  let codeLines = [];
  let inList = false;

  const closeList = () => {
    if (inList) {
      parts.push("</ul>");
      inList = false;
    }
  };

  lines.forEach((rawLine) => {
    const line = rawLine.trimEnd();
    if (line.trim().startsWith("```")) {
      if (inCode) {
        parts.push(`<pre><code>${escapeHelpHtml(codeLines.join("\n"))}</code></pre>`);
        codeLines = [];
        inCode = false;
      } else {
        closeList();
        inCode = true;
      }
      return;
    }
    if (inCode) {
      codeLines.push(rawLine);
      return;
    }
    if (!line.trim()) {
      closeList();
      return;
    }
    const heading = line.match(/^(#{1,4})\s+(.+)$/);
    if (heading) {
      closeList();
      const level = Math.min(heading[1].length + 1, 5);
      parts.push(`<h${level}>${inlineMarkdown(heading[2])}</h${level}>`);
      return;
    }
    const bullet = line.match(/^\s*(?:[-*]|\d+[.)])\s+(.+)$/);
    if (bullet) {
      if (!inList) {
        parts.push("<ul>");
        inList = true;
      }
      parts.push(`<li>${inlineMarkdown(bullet[1])}</li>`);
      return;
    }
    closeList();
    parts.push(`<p>${inlineMarkdown(line.trim())}</p>`);
  });
  closeList();
  if (inCode) parts.push(`<pre><code>${escapeHelpHtml(codeLines.join("\n"))}</code></pre>`);
  return parts.join("");
}

async function openHelp() {
  const overlay = el("helpOverlay");
  const content = el("helpContent");
  overlay.classList.remove("hidden");
  content.innerHTML = "<p>Loading API configuration tutorial...</p>";
  try {
    const response = await fetch(apiUrl("/api/help/api-guide"));
    const data = await readJsonResponse(response, "Could not load API guide.");
    content.innerHTML = renderHelpMarkdown(data.markdown || "");
  } catch (error) {
    content.innerHTML = `<p class="help-error">${escapeHelpHtml(error.message || "Could not load API guide.")}</p>`;
  }
}

function closeHelp() {
  el("helpOverlay").classList.add("hidden");
}

function renderSteps() {
  el("steps").innerHTML = steps.map((step, index) => `
    <li class="${index <= state.activeStep ? "active" : ""}">
      <span>${index + 1}</span>
      <div><strong>${step[0]}</strong><small>${step[1]}</small></div>
    </li>
  `).join("");
}

function renderStyles() {
  el("styleTabs").innerHTML = styles.map(([key, label]) => `
    <button type="button" class="${state.selectedStyle === key ? "selected" : ""}" data-style="${key}">${label}</button>
  `).join("");
  document.querySelectorAll("[data-style]").forEach((button) => {
    button.addEventListener("click", () => {
      state.selectedStyle = button.dataset.style;
      renderStyles();
    });
  });
}

function setStatus(message, kind = "") {
  el("statusLine").textContent = message;
  el("statusLine").className = `status-line ${kind}`;
}

function setGenerationOverlay(visible, message = "") {
  const overlay = el("generationOverlay");
  if (!overlay) return;
  if (message) el("generationMessage").textContent = message;
  overlay.classList.toggle("hidden", !visible || state.generationOverlayDismissed);
}

function hideGenerationOverlay() {
  state.generationOverlayDismissed = true;
  setGenerationOverlay(false);
}

function createInlineHtmlUrl(html) {
  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  state.inlineObjectUrls.push(url);
  return url;
}

function hydrateShare(share) {
  if (!share) return share;
  return {
    ...share,
    zipPackageUrl: absoluteRuntimeUrl(share.zipPackageUrl),
    singleFileUrl: absoluteRuntimeUrl(share.singleFileUrl),
    scrollSingleFileUrl: absoluteRuntimeUrl(share.scrollSingleFileUrl),
    reportUrl: absoluteRuntimeUrl(share.reportUrl),
  };
}

function hydrateInlineJob(job) {
  if (!job) return job;
  const hydrated = { ...job };
  if (hydrated.inlinePreviewHtml) {
    hydrated.inlinePreviewHtmlCache = hydrated.inlinePreviewHtml;
    hydrated.previewUrl = createInlineHtmlUrl(hydrated.inlinePreviewHtmlCache);
    hydrated.inlinePreviewAvailable = true;
    delete hydrated.inlinePreviewHtml;
  }
  if (hydrated.inlineScrollHtml) {
    hydrated.inlineScrollHtmlCache = hydrated.inlineScrollHtml;
    hydrated.scrollUrl = createInlineHtmlUrl(hydrated.inlineScrollHtmlCache);
    hydrated.inlinePreviewAvailable = true;
    delete hydrated.inlineScrollHtml;
  }
  hydrated.previewUrl = absoluteRuntimeUrl(hydrated.previewUrl);
  hydrated.scrollUrl = absoluteRuntimeUrl(hydrated.scrollUrl);
  hydrated.downloadUrl = absoluteRuntimeUrl(hydrated.downloadUrl);
  hydrated.share = hydrateShare(hydrated.share);
  return hydrated;
}

function formatBytes(size) {
  if (!size) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const power = Math.min(Math.floor(Math.log(size) / Math.log(1024)), units.length - 1);
  return `${(size / Math.pow(1024, power)).toFixed(power ? 1 : 0)} ${units[power]}`;
}

function uploadLimitMessage() {
  if (state.runtime === "cloudflare-worker-only") {
    return `Cloudflare-only mode supports .pptx files up to about ${formatBytes(state.maxUploadBytes)}. Old .ppt files require the local Python backend.`;
  }
  if (state.runtime === "vercel") {
    return `Serverless mode supports PPT files up to about ${formatBytes(state.maxUploadBytes)}. Larger files need local running or dedicated storage.`;
  }
  return `Supports .ppt and .pptx up to ${formatBytes(state.maxUploadBytes)}`;
}

function fileTooLargeMessage(file) {
  return `${file.name} is ${formatBytes(file.size)}, which is larger than this deployment can safely upload (${formatBytes(state.maxUploadBytes)}). Run the app locally for larger PPT files.`;
}

function enforceUploadLimit(file) {
  if (!file || file.size <= state.maxUploadBytes) return true;
  setStatus(fileTooLargeMessage(file), "error");
  return false;
}

async function readJsonResponse(response, fallbackMessage = "Request failed") {
  const text = await response.text();
  let data = {};
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      const plain = text.replace(/\s+/g, " ").trim();
      const isWorkerLimit = /Worker exceeded resource limits|cf-error-code"?\s*>?\s*1102|Error<\/span>\s*<span[^>]*>\s*1102/i.test(text);
      data = {
        error: isWorkerLimit ? "worker_resource_limit" : "non_json_response",
        message: isWorkerLimit
          ? "Cloudflare Worker exceeded its CPU or memory limit while processing this PPT. Try a smaller PPT, compress oversized images, or use fewer image-heavy slides. The platform now skips oversized embedded images automatically; refresh and try again."
          : plain || fallbackMessage,
      };
    }
  }
  if (!response.ok) {
    let message = data.message || data.error || response.statusText || fallbackMessage;
    if (response.status === 413 || /request entity too large|payload too large/i.test(message)) {
      message = `The PPT is too large for this deployment. Please use a file up to about ${formatBytes(state.maxUploadBytes)}, or run the app locally for larger files.`;
    }
    throw new Error(message);
  }
  return data;
}

function handleFile(file) {
  if (!file) return;
  if (state.runtime === "cloudflare-worker-only" && !/\.pptx$/i.test(file.name)) {
    setStatus("Cloudflare-only deployment supports .pptx files. Please convert old .ppt files to .pptx first.", "error");
    return;
  }
  if (!/\.(ppt|pptx)$/i.test(file.name)) {
    setStatus("Please choose a .ppt or .pptx file.", "error");
    return;
  }
  if (!enforceUploadLimit(file)) {
    state.selectedFile = null;
    el("fileCard").classList.add("hidden");
    el("fileInput").value = "";
    return;
  }
  state.selectedFile = file;
  el("fileCard").classList.remove("hidden");
  el("fileName").textContent = file.name;
  el("fileMeta").textContent = `${formatBytes(file.size)} selected`;
  setStatus("Ready to generate.", "ok");
  state.activeStep = 0;
  renderSteps();
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

async function loadClientZipRuntime() {
  if (window.JSZip) return window.JSZip;
  const loadScript = (src) => new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = src;
    script.onload = resolve;
    script.onerror = reject;
    document.head.appendChild(script);
  });
  await loadScript("/static/jszip.min.js").catch(() => loadScript("https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js"));
  if (!window.JSZip) throw new Error("Browser PPT parser did not initialize.");
  return window.JSZip;
}

function clientXmlDecode(value) {
  return String(value || "")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'");
}

function clientCleanText(text) {
  return String(text || "").replace(/\s+/g, " ").replace(/^[•·\-\s]+/, "").trim();
}

function clientUsefulText(text) {
  const value = clientCleanText(text);
  if (!value) return false;
  if (/^[\d\s./\\-]+$/.test(value)) return false;
  if (/^[()[\]{}.,;:!?'"`~_\-]+$/.test(value)) return false;
  return value.length > 1;
}

function clientNormalizeZipPath(base, target) {
  const parts = base.split("/");
  parts.pop();
  target.split("/").forEach((item) => {
    if (!item || item === ".") return;
    if (item === "..") parts.pop();
    else parts.push(item);
  });
  return parts.join("/");
}

function clientRelationshipMap(relsXml, slidePath) {
  const map = new Map();
  const relPattern = /<Relationship\b([^>]*?)\/?>/g;
  let match;
  while ((match = relPattern.exec(relsXml || ""))) {
    const attrs = match[1] || "";
    const id = attrs.match(/\bId="([^"]+)"/)?.[1];
    const target = attrs.match(/\bTarget="([^"]+)"/)?.[1];
    if (id && target) map.set(id, clientNormalizeZipPath(slidePath, target));
  }
  return map;
}

function clientExtractTexts(slideXml) {
  const texts = [];
  const pattern = /<a:t[^>]*>([\s\S]*?)<\/a:t>/g;
  let match;
  while ((match = pattern.exec(slideXml || ""))) {
    const text = clientCleanText(clientXmlDecode(match[1]));
    if (clientUsefulText(text)) texts.push(text);
  }
  return texts;
}

async function clientExtractImages(zip, slideXml, rels, slideIndex, stats) {
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
    const estimatedSize = Number(file._data?.uncompressedSize || file._data?.compressedSize || 0);
    if (stats.embeddedImages >= 36 || (estimatedSize && estimatedSize > 700 * 1024) || (estimatedSize && stats.embeddedImageBytes + estimatedSize > 6 * 1024 * 1024)) {
      stats.skippedImages += 1;
      continue;
    }
    const base64 = await file.async("base64");
    const bytes = Math.ceil(base64.length * 0.75);
    if (bytes > 700 * 1024 || stats.embeddedImageBytes + bytes > 6 * 1024 * 1024) {
      stats.skippedImages += 1;
      continue;
    }
    const ext = path.split(".").pop()?.toLowerCase() || "png";
    const mime = ext === "jpg" || ext === "jpeg" ? "image/jpeg" : ext === "gif" ? "image/gif" : ext === "svg" ? "image/svg+xml" : "image/png";
    stats.embeddedImages += 1;
    stats.embeddedImageBytes += bytes;
    images.push({ src: `data:${mime};base64,${base64}`, size: bytes, name: `slide-${slideIndex}-image-${images.length + 1}.${ext}` });
  }
  return images;
}

async function extractPptxInBrowser(file) {
  const JSZipRuntime = await loadClientZipRuntime();
  const zip = await JSZipRuntime.loadAsync(await file.arrayBuffer());
  const paths = Object.keys(zip.files)
    .filter((name) => /^ppt\/slides\/slide\d+\.xml$/i.test(name))
    .sort((a, b) => Number(a.match(/slide(\d+)\.xml/i)?.[1] || 0) - Number(b.match(/slide(\d+)\.xml/i)?.[1] || 0));
  const stats = { embeddedImages: 0, embeddedImageBytes: 0, skippedImages: 0, skippedBlankSlides: 0 };
  const slides = [];
  for (let index = 0; index < paths.length; index += 1) {
    const slidePath = paths[index];
    const slideXml = await zip.file(slidePath).async("string");
    const relsPath = slidePath.replace("ppt/slides/", "ppt/slides/_rels/") + ".rels";
    const relsXml = zip.file(relsPath) ? await zip.file(relsPath).async("string") : "";
    const rels = clientRelationshipMap(relsXml, slidePath);
    const texts = clientExtractTexts(slideXml);
    const images = await clientExtractImages(zip, slideXml, rels, index + 1, stats);
    const isDefaultOnlySlide = texts.length === 1 && /^slide\s*\d+$/i.test(texts[0]) && !images.length;
    if ((!texts.length && !images.length) || isDefaultOnlySlide) {
      stats.skippedBlankSlides += 1;
      continue;
    }
    slides.push({ page: index + 1, title: texts[0] || "", body: texts.slice(1), images });
  }
  if (!slides.length) throw new Error("No slides found in this PPTX file.");
  return { slides, stats };
}

function clientEditorRuntime() {
  return `<style id="ppt-html-editor-style">.editor-toolbar{position:fixed;z-index:9999;top:14px;right:14px;display:none;gap:6px;padding:8px;border:1px solid #c7d2fe;border-radius:12px;background:#fff;box-shadow:0 12px 30px rgba(15,23,42,.16);font-family:Arial,sans-serif}body.editing .editor-toolbar{display:flex}.editor-toolbar button,.editor-toolbar select,.editor-toolbar input{height:30px;border:1px solid #c7d2fe;border-radius:8px;background:#fff;color:#1e3a8a;font:700 12px Arial;padding:0 8px}body.editing .editable-text,body.editing [contenteditable=true]{outline:2px dashed #60a5fa;outline-offset:3px}.media-box{resize:both;overflow:hidden}.media-box img{width:100%;height:100%;object-fit:contain}</style><script>(()=>{let i=0;const slides=[...document.querySelectorAll('.slide')];let selected=null;function show(n){i=Math.max(0,Math.min(n,slides.length-1));slides.forEach((s,k)=>s.classList.toggle('active',k===i))}function apply(p,v){const t=selected&&!selected.matches('.media-box,img')?selected:document.activeElement;if(t&&t!==document.body)t.style[p]=v}function toolbar(){if(document.querySelector('.editor-toolbar'))return;const t=document.createElement('div');t.className='editor-toolbar';t.innerHTML='<select data-font><option value="Arial,sans-serif">Arial</option><option value="Georgia,serif">Georgia</option><option value="Times New Roman,serif">Times</option><option value="Verdana,sans-serif">Verdana</option><option value="Microsoft YaHei,sans-serif">Microsoft YaHei</option></select><input data-size type="number" min="12" max="120" value="30"><input data-color type="color" value="#172554"><button data-bold>B</button><button data-italic>I</button><button data-underline>U</button>';document.body.appendChild(t);t.querySelector('[data-font]').onchange=e=>apply('fontFamily',e.target.value);t.querySelector('[data-size]').onchange=e=>apply('fontSize',e.target.value+'px');t.querySelector('[data-color]').oninput=e=>apply('color',e.target.value);t.querySelector('[data-bold]').onclick=()=>document.execCommand('bold');t.querySelector('[data-italic]').onclick=()=>document.execCommand('italic');t.querySelector('[data-underline]').onclick=()=>document.execCommand('underline')}window.toggleEdit=(force)=>{const editing=typeof force==='boolean'?force:!document.body.classList.contains('editing');toolbar();document.body.classList.toggle('editing',editing);document.querySelectorAll('h1,.chapter,.point-card,.editable-text,p,li').forEach(n=>n.contentEditable=editing?'true':'false')};window.exportEditedHtml=async(mode='paged')=>{const c=document.documentElement.cloneNode(true);c.querySelector('.editor-toolbar')?.remove();c.querySelector('#ppt-html-editor-style')?.remove();c.querySelectorAll('[contenteditable]').forEach(n=>n.removeAttribute('contenteditable'));c.querySelector('body')?.classList.remove('editing');if(mode==='scroll')c.querySelector('body')?.classList.add('scroll-mode');else c.querySelector('body')?.classList.remove('scroll-mode');return '<!doctype html>\\n'+c.outerHTML};window.nextSlide=()=>show(i+1);window.prevSlide=()=>show(i-1);document.addEventListener('click',e=>{selected=e.target.closest('.media-box,.editable-text,.point-card,h1,.chapter')},true);show(0)})();</script>`;
}

function clientSlideLayout(slide, index, items) {
  const title = String(slide.title || "").toLowerCase();
  if (index === 0) return "cover";
  if (/\b(outline|agenda|contents?|today|schedule|syllabus|overview)\b/i.test(title)) return "agenda";
  if (/\b(exercise|quiz|question|practice|activity|discussion|answer|solution|case)\b/i.test(title)) return "workshop";
  if (slide.images.length) return "image-split";
  if (items.length <= 2) return "statement";
  return "lesson";
}

function buildBrowserFallbackHtml(slides, style, mode = "paged") {
  const bodyClass = mode === "scroll" ? "scroll-mode" : "";
  const slideHtml = slides.map((slide, index) => {
    const items = slide.body.filter(clientUsefulText).slice(0, 12);
    const hasImages = slide.images.length > 0;
    const layout = clientSlideLayout(slide, index, items);
    const lead = items[0] || "";
    const agendaHtml = items.slice(0, 12).map((item, itemIndex) => `<div class="agenda-item editable-text"><span>${String(itemIndex + 1).padStart(2, "0")}</span><p>${escapeHtml(item)}</p></div>`).join("");
    const bulletsHtml = items.slice(lead ? 1 : 0, lead ? 5 : 6).map((item) => `<li class="editable-text">${escapeHtml(item)}</li>`).join("");
    const conceptHtml = items.slice(0, 3).map((item) => `<div class="point-card editable-text">${escapeHtml(item)}</div>`).join("");
    const contentHtml = {
      cover: items.length ? `<p class="cover-subtitle editable-text">${escapeHtml(items.slice(0, 2).join(" · "))}</p>` : "",
      agenda: `<div class="agenda-list">${agendaHtml}</div>`,
      workshop: `<div class="workshop-prompt">${lead ? `<p class="lead-text editable-text">${escapeHtml(lead)}</p>` : ""}${bulletsHtml ? `<ul class="quiet-list">${bulletsHtml}</ul>` : ""}<div class="thinking-space editable-text">Class discussion space</div></div>`,
      statement: `<div class="statement-block">${lead ? `<p class="lead-text editable-text">${escapeHtml(lead)}</p>` : ""}${bulletsHtml ? `<ul class="quiet-list">${bulletsHtml}</ul>` : ""}</div>`,
      lesson: `<div class="lesson-block">${lead ? `<p class="lead-text editable-text">${escapeHtml(lead)}</p>` : ""}${items.length > 4 ? `<ul class="quiet-list">${items.slice(1, 6).map((item) => `<li class="editable-text">${escapeHtml(item)}</li>`).join("")}</ul>` : `<div class="concept-row">${conceptHtml}</div>`}</div>`,
      "image-split": `<div class="lesson-block">${lead ? `<p class="lead-text editable-text">${escapeHtml(lead)}</p>` : ""}${bulletsHtml ? `<ul class="quiet-list">${bulletsHtml}</ul>` : ""}</div>`,
    }[layout] || "";
    const imageHtml = slide.images.map((image) => `<figure class="media-box"><img src="${image.src}" alt="Slide image"></figure>`).join("");
    return `<section class="slide ${layout} ${hasImages ? "has-media" : "text-only"} ${index === 0 ? "active" : ""}"><div class="slide-inner"><header><span class="chapter editable-text">Chapter ${String(index + 1).padStart(2, "0")}</span>${slide.title ? `<h1 class="editable-text">${escapeHtml(slide.title)}</h1>` : ""}</header><main>${contentHtml}${hasImages ? `<div class="media-grid">${imageHtml}</div>` : ""}</main><footer>${index + 1} / ${slides.length}</footer></div></section>`;
  }).join("");
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>PPT HTML Studio</title><style>*{box-sizing:border-box}html,body{margin:0;min-height:100%;background:#f6f8fb;color:#17213f;font-family:Inter,Arial,sans-serif}body{overflow:hidden}body.scroll-mode{overflow:auto}.slide{width:100vw;height:100vh;display:none;background:#fff;overflow:hidden}.slide.active{display:block}body.scroll-mode .slide{display:block;min-height:100vh;height:auto}.slide-inner{width:min(1440px,100vw);height:100%;margin:0 auto;padding:clamp(42px,6vh,76px) clamp(72px,8vw,132px) 64px;display:grid;grid-template-rows:auto 1fr auto;gap:clamp(28px,5vh,58px)}header{display:grid;gap:14px;max-width:1120px}.chapter{color:#2563eb;font-size:clamp(17px,1.45vw,24px);font-weight:800;letter-spacing:.08em;text-transform:uppercase}h1{margin:0;font-size:clamp(40px,4vw,64px);line-height:1.05;max-width:1080px;overflow-wrap:anywhere}.cover header{align-self:center;text-align:center;max-width:1100px;margin:0 auto}.cover h1{font-size:clamp(48px,5.1vw,78px)}.cover-subtitle{margin:18px auto 0;max-width:860px;color:#64748b;font-size:clamp(24px,2vw,34px);line-height:1.35;font-weight:500}main{min-height:0;display:grid;gap:clamp(28px,4vh,48px);align-items:center}.image-split main{grid-template-columns:minmax(0,.82fr) minmax(360px,.9fr)}.lead-text{margin:0;max-width:980px;font-size:clamp(30px,2.45vw,44px);line-height:1.18;font-weight:760;color:#17213f}.lesson-block,.statement-block,.workshop-prompt{max-width:1040px;display:grid;gap:26px}.quiet-list,.numbered-list{margin:0;padding:0;list-style:none;display:grid;gap:16px;max-width:940px}.quiet-list li{position:relative;padding-left:28px;font-size:clamp(24px,1.85vw,32px);line-height:1.34;color:#334155}.quiet-list li:before{content:"";position:absolute;left:0;top:.58em;width:8px;height:8px;border-radius:50%;background:#2563eb}.numbered-list li{display:grid;grid-template-columns:42px 1fr;gap:18px;font-size:clamp(23px,1.7vw,30px);line-height:1.3;color:#334155}.numbered-list li span{color:#2563eb;font-weight:800}.agenda-list{width:min(980px,80vw);display:grid;grid-template-columns:repeat(2,minmax(260px,1fr));gap:18px 48px}.agenda-item{display:grid;grid-template-columns:46px 1fr;gap:16px;align-items:center;min-height:54px;border-bottom:1px solid #dbe5f2}.agenda-item span{color:#2563eb;font-size:18px;font-weight:800}.agenda-item p{margin:0;font-size:clamp(24px,1.85vw,32px);line-height:1.15;font-weight:650;color:#17213f}.concept-row{display:grid;grid-template-columns:repeat(3,minmax(180px,1fr));gap:18px;max-width:980px}.point-card{border-radius:8px;background:#fff;border:1px solid #d7e3f4;padding:22px 24px;font-size:clamp(22px,1.65vw,30px);line-height:1.25;font-weight:650;box-shadow:none}.thinking-space{width:min(860px,68vw);min-height:180px;border:1px dashed #b7c7dc;border-radius:8px;color:#94a3b8;display:grid;place-items:center;font-size:24px;font-weight:600}.media-grid{display:grid;gap:18px;align-content:center}.media-box{margin:0;display:grid;place-items:center}.media-box img{width:100%;max-height:54vh;object-fit:contain;border-radius:8px;box-shadow:none}footer{justify-self:end;font-size:20px;color:#64748b}.nav{position:fixed;z-index:20;left:50%;bottom:18px;transform:translateX(-50%);display:flex;gap:10px}.nav button{border:1px solid #d8e2f0;border-radius:8px;padding:8px 13px;background:#fff;color:#1e3a8a;font-size:15px;font-weight:800}.nav button:last-child{background:#2563eb;color:#fff;border-color:#2563eb}body.scroll-mode .nav{display:none}@media(max-width:900px){.slide-inner{padding:34px 28px 50px}.image-split main{grid-template-columns:1fr}.agenda-list,.concept-row{grid-template-columns:1fr;width:100%}h1{font-size:44px}.point-card,.quiet-list li,.agenda-item p{font-size:26px}}</style></head><body class="${bodyClass}">${slideHtml}<div class="nav"><button onclick="prevSlide()">Prev</button><button onclick="nextSlide()">Next</button></div>${clientEditorRuntime()}</body></html>`;
}

async function generateInBrowserFallback(reason) {
  setGenerationOverlay(true, "Cloudflare was overloaded, generating locally in this browser...");
  const { slides, stats } = await extractPptxInBrowser(state.selectedFile);
  if (state.integration.mode === "ai_api") {
    try {
      setGenerationOverlay(true, "Extracted PPT locally. Asking AI to design the HTML...");
      const response = await fetch(apiUrl("/api/generate-ai-from-slides"), {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          filename: state.selectedFile.name,
          style: state.selectedStyle,
          integration: integrationForGeneration(),
          slides,
          stats,
          fallbackReason: reason,
        }),
      });
      const data = await readJsonResponse(response, "AI generation failed");
      const generatedJob = hydrateInlineJob(data.job);
      state.activeJob = generatedJob;
      state.jobs.unshift(generatedJob);
      renderJobs();
      renderJobSelect();
      selectJob(generatedJob.id);
      const aiMessage = formatAiStatus(generatedJob);
      setStatus(aiMessage ? `Completed. ${aiMessage}` : "Completed. AI preview is ready.", generatedJob.aiStatus?.fallback ? "error" : "ok");
      return generatedJob;
    } catch (aiError) {
      console.warn("AI generation after browser extraction failed", aiError);
      reason = aiError.message || reason;
    }
  }
  const pagedHtml = buildBrowserFallbackHtml(slides, state.selectedStyle, "paged");
  const scrollHtml = buildBrowserFallbackHtml(slides, state.selectedStyle, "scroll");
  const id = `LOCAL-${Date.now().toString(36).toUpperCase()}`;
  const job = hydrateInlineJob({
    id,
    fileName: state.selectedFile.name,
    slides: slides.length,
    style: state.selectedStyle,
    status: "completed",
    updatedAt: new Date().toISOString(),
    previewUrl: "",
    scrollUrl: "",
    downloadUrl: "",
    inlinePreviewHtml: pagedHtml,
    inlineScrollHtml: scrollHtml,
    inlinePreviewMode: "blob",
    aiStatus: { mode: state.integration.mode || "local", fallback: true, error: reason },
    share: {
      status: "ready",
      recommendation: stats.skippedImages ? `${stats.embeddedImages} images were embedded. ${stats.skippedImages} oversized images were skipped in browser fallback mode.` : "Browser fallback generated successfully.",
      totalImages: stats.embeddedImages + stats.skippedImages,
      embeddedImages: stats.embeddedImages,
      missingImages: stats.skippedImages,
      riskyPaths: 0,
      externalImages: 0,
    },
  });
  state.activeJob = job;
  state.jobs.unshift(job);
  renderJobs();
  renderJobSelect();
  selectJob(job.id);
  setStatus(`Generated locally in your browser to avoid Cloudflare file-processing limits. ${stats.skippedImages ? "Some oversized images were skipped." : ""}`, "ok");
  return job;
}

async function generate() {
  if (state.busy) return;
  if (!state.selectedFile) {
    setStatus("Upload PPT first.", "error");
    return;
  }
  if (!enforceUploadLimit(state.selectedFile)) return;
  state.busy = true;
  state.generationOverlayDismissed = false;
  el("runButton").disabled = true;
  const labels = ["Uploading", "Extracting", "Optimizing", "Converting", "Preparing editor"];
  try {
    setGenerationOverlay(true, "Preparing the PPT for AI layout generation...");
    for (let i = 0; i < labels.length; i += 1) {
      state.activeStep = i;
      renderSteps();
      setStatus(`${labels[i]}...`);
      setGenerationOverlay(true, `${labels[i]}...`);
      await new Promise((resolve) => setTimeout(resolve, 160));
    }
    await saveIntegration(false, false);
    setGenerationOverlay(true, "AI is arranging titles, text, images, and final HTML...");
    const fileBase64 = await fileToBase64(state.selectedFile);
    const response = await fetch(apiUrl("/api/generate"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        filename: state.selectedFile.name,
        fileBase64,
        style: state.selectedStyle,
        integration: integrationForGeneration(),
        options: {
          keepText: el("keepText").checked,
          readableText: el("readableText").checked,
          imagesIntact: el("imagesIntact").checked,
        },
      }),
    });
    const data = await readJsonResponse(response, "Generation failed");
    state.activeStep = 4;
    const generatedJob = hydrateInlineJob(data.job);
    state.activeJob = generatedJob;
    const aiMessage = formatAiStatus(generatedJob);
    const inlineMessage = generatedJob.inlinePreviewAvailable ? " Inline preview is ready." : "";
    setStatus(aiMessage ? `Completed. ${aiMessage}${inlineMessage}` : `Completed. Preview is ready.${inlineMessage}`, generatedJob.aiStatus?.fallback ? "error" : "ok");
    await loadJobs();
    const existingIndex = state.jobs.findIndex((job) => job.id === generatedJob.id);
    if (existingIndex >= 0) {
      state.jobs[existingIndex] = { ...state.jobs[existingIndex], ...generatedJob };
    } else {
      state.jobs.unshift(generatedJob);
    }
    renderJobs();
    renderJobSelect();
    selectJob(generatedJob.id);
  } catch (error) {
    if (/Cloudflare Worker exceeded|worker_resource_limit|resource limit|1102/i.test(error.message || "")) {
      try {
        await generateInBrowserFallback(error.message);
      } catch (fallbackError) {
        setStatus(fallbackError.message || error.message, "error");
      }
    } else {
      setStatus(error.message, "error");
    }
  } finally {
    state.busy = false;
    el("runButton").disabled = false;
    setGenerationOverlay(false);
    renderSteps();
  }
}

async function loadJobs() {
  const response = await fetch(apiUrl("/api/jobs"));
  const data = await readJsonResponse(response, "Could not load jobs");
  state.jobs = (data.jobs || []).map(hydrateInlineJob);
  renderJobs();
  renderJobSelect();
  if (!state.activeJob && state.jobs.length) selectJob(state.jobs[0].id);
}

function renderJobs() {
  const rows = state.jobs.map((job) => `
    <tr>
      <td>${job.id}</td>
      <td>${escapeHtml(job.fileName)}</td>
      <td>${job.slides}</td>
      <td>${job.style}</td>
      <td><span class="status-dot"></span>${job.status}</td>
      <td>${renderAiBadge(job)}</td>
      <td>${job.updatedAt}</td>
      <td>
        <button type="button" data-preview="${job.id}">Preview</button>
        <button type="button" data-download="${job.id}">Download ZIP</button>
        <button type="button" data-share="${job.id}">Analyze & Share</button>
      </td>
    </tr>
  `).join("");
  el("jobRows").innerHTML = rows || `<tr><td colspan="8" class="empty-row">No jobs yet</td></tr>`;
  document.querySelectorAll("[data-preview]").forEach((button) => {
    button.addEventListener("click", () => selectJob(button.dataset.preview));
  });
  document.querySelectorAll("[data-download]").forEach((button) => {
    button.addEventListener("click", () => downloadById(button.dataset.download));
  });
  document.querySelectorAll("[data-share]").forEach((button) => {
    button.addEventListener("click", () => analyzeShare(button.dataset.share));
  });
}

function renderJobSelect() {
  el("jobSelect").innerHTML = state.jobs.map((job) => `
    <option value="${job.id}">${job.fileName} (${job.slides} slides)</option>
  `).join("");
}

function formatAiStatus(job) {
  const status = job?.aiStatus;
  if (!status || status.mode === "local") return "";
  if (status.used) {
    const type = status.resultType === "slides" ? "optimized slides" : "HTML";
    return `AI used (${status.provider || status.mode}, ${type}).`;
  }
  if (status.fallback) {
    return `AI fallback: ${status.error || "external API failed"}`;
  }
  return `${status.mode} configured.`;
}

function renderAiBadge(job) {
  const status = job.aiStatus || {};
  if (!status.mode || status.mode === "local") return `<span class="ai-badge local">Local</span>`;
  if (status.used) {
    const label = status.resultType === "slides" ? "AI slides" : "AI HTML";
    return `<span class="ai-badge used" title="${escapeHtml(status.provider || status.mode)}">${label}</span>`;
  }
  if (status.fallback) {
    return `<span class="ai-badge fallback" title="${escapeHtml(status.error || "")}">Fallback</span>`;
  }
  return `<span class="ai-badge configured">${escapeHtml(status.mode)}</span>`;
}

function selectJob(jobId) {
  const job = state.jobs.find((item) => item.id === jobId);
  if (!job) return;
  state.activeJob = job;
  state.activeShare = job.share || null;
  el("jobSelect").value = job.id;
  el("previewFrame").src = job.previewUrl;
  el("previewEmpty").classList.add("hidden");
  renderShare(job.share || null);
  const aiMessage = formatAiStatus(job);
  if (aiMessage) setStatus(aiMessage, job.aiStatus?.fallback ? "error" : "ok");
  updatePreviewEditButton(false);
}

function previewWindow() {
  return el("previewFrame")?.contentWindow || null;
}

function previewDocument() {
  try {
    return el("previewFrame")?.contentDocument || null;
  } catch {
    return null;
  }
}

function ensurePreviewEditorApi() {
  const win = previewWindow();
  const doc = previewDocument();
  if (!win || !doc) return null;
  if (typeof win.toggleEdit === "function" && typeof win.exportEditedHtml === "function") return win;
  const hasEditorSurface = doc.querySelector("#ppt-html-editor-style,.editor-toolbar,.editable-text,.media-box,.editable-image-box");
  if (!hasEditorSurface) return null;
  win.toggleEdit = (force) => {
    const editing = typeof force === "boolean" ? force : !doc.body.classList.contains("editing");
    doc.body.classList.toggle("editing", editing);
    doc.querySelectorAll("h1,.point-card,.chapter,.editable-text,p,li,td,th,.free-textbox").forEach((node) => {
      node.contentEditable = editing ? "true" : "false";
    });
    doc.querySelectorAll("img").forEach((img) => {
      const box = img.closest(".media-box,.editable-image-box");
      if (box) {
        box.style.resize = "both";
        box.style.overflow = "hidden";
        box.style.minWidth = box.style.minWidth || "80px";
        box.style.minHeight = box.style.minHeight || "60px";
      }
    });
  };
  win.exportEditedHtml = async (mode = "paged") => {
    const clone = doc.documentElement.cloneNode(true);
    clone.querySelector(".editor-toolbar")?.remove();
    clone.querySelector("#ppt-html-editor-style")?.remove();
    clone.querySelectorAll("[contenteditable]").forEach((node) => node.removeAttribute("contenteditable"));
    clone.querySelector("body")?.classList.remove("editing");
    if (mode === "scroll") clone.querySelector("body")?.classList.add("scroll-mode");
    else clone.querySelector("body")?.classList.remove("scroll-mode");
    return `<!doctype html>\n${clone.outerHTML}`;
  };
  return win;
}

function hasEditablePreview() {
  const win = ensurePreviewEditorApi();
  return Boolean(win && typeof win.exportEditedHtml === "function" && typeof win.toggleEdit === "function");
}

function isPreviewEditing() {
  return Boolean(previewDocument()?.body?.classList.contains("editing"));
}

function updatePreviewEditButton(editing = isPreviewEditing()) {
  const button = el("editHtml");
  if (button) button.textContent = editing ? "Stop Editing" : "Edit HTML";
}

function versionedUrl(url) {
  if (!url || /^(?:data:|blob:)/i.test(String(url))) return url;
  const separator = String(url || "").includes("?") ? "&" : "?";
  return `${url}${separator}v=${Date.now()}`;
}

function isInlineDownloadUrl(url) {
  return /^(?:data:|blob:)/i.test(String(url || ""));
}

function triggerDownload(url, filename = "optimized-ppt.zip") {
  const link = document.createElement("a");
  link.href = versionedUrl(url);
  link.download = filename;
  link.rel = "noopener";
  document.body.appendChild(link);
  link.click();
  link.remove();
}

function makeScrollHtmlFromPaged(html) {
  let output = String(html || "");
  if (/<body\b[^>]*class="/i.test(output)) {
    return output.replace(/<body\b([^>]*?)class="([^"]*)"/i, (all, before, cls) => `<body${before}class="${cls} scroll-mode"`);
  }
  if (/<body\b/i.test(output)) return output.replace(/<body\b([^>]*)>/i, '<body$1 class="scroll-mode">');
  return output;
}

let crcTable = null;

function getCrcTable() {
  if (crcTable) return crcTable;
  crcTable = new Uint32Array(256);
  for (let i = 0; i < 256; i += 1) {
    let value = i;
    for (let bit = 0; bit < 8; bit += 1) {
      value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
    }
    crcTable[i] = value >>> 0;
  }
  return crcTable;
}

function crc32(bytes) {
  const table = getCrcTable();
  let crc = 0xffffffff;
  for (let i = 0; i < bytes.length; i += 1) crc = table[(crc ^ bytes[i]) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function writeU16(out, value) {
  out.push(value & 0xff, (value >>> 8) & 0xff);
}

function writeU32(out, value) {
  out.push(value & 0xff, (value >>> 8) & 0xff, (value >>> 16) & 0xff, (value >>> 24) & 0xff);
}

function dosTimeDate(date = new Date()) {
  const time = (date.getHours() << 11) | (date.getMinutes() << 5) | Math.floor(date.getSeconds() / 2);
  const dosDate = ((date.getFullYear() - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate();
  return { time, date: dosDate };
}

function bytesFromString(value) {
  return new TextEncoder().encode(String(value ?? ""));
}

function concatBytes(parts) {
  const total = parts.reduce((sum, part) => sum + part.length, 0);
  const output = new Uint8Array(total);
  let offset = 0;
  parts.forEach((part) => {
    output.set(part, offset);
    offset += part.length;
  });
  return output;
}

function makeZipBlob(files) {
  const localParts = [];
  const centralParts = [];
  let offset = 0;
  const now = dosTimeDate();
  files.forEach((file) => {
    const nameBytes = bytesFromString(file.name);
    const dataBytes = typeof file.data === "string" ? bytesFromString(file.data) : file.data;
    const crc = crc32(dataBytes);
    const local = [];
    writeU32(local, 0x04034b50);
    writeU16(local, 20);
    writeU16(local, 0x0800);
    writeU16(local, 0);
    writeU16(local, now.time);
    writeU16(local, now.date);
    writeU32(local, crc);
    writeU32(local, dataBytes.length);
    writeU32(local, dataBytes.length);
    writeU16(local, nameBytes.length);
    writeU16(local, 0);
    const localBytes = concatBytes([new Uint8Array(local), nameBytes, dataBytes]);
    localParts.push(localBytes);

    const central = [];
    writeU32(central, 0x02014b50);
    writeU16(central, 20);
    writeU16(central, 20);
    writeU16(central, 0x0800);
    writeU16(central, 0);
    writeU16(central, now.time);
    writeU16(central, now.date);
    writeU32(central, crc);
    writeU32(central, dataBytes.length);
    writeU32(central, dataBytes.length);
    writeU16(central, nameBytes.length);
    writeU16(central, 0);
    writeU16(central, 0);
    writeU16(central, 0);
    writeU16(central, 0);
    writeU32(central, 0);
    writeU32(central, offset);
    centralParts.push(concatBytes([new Uint8Array(central), nameBytes]));
    offset += localBytes.length;
  });
  const centralSize = centralParts.reduce((sum, part) => sum + part.length, 0);
  const end = [];
  writeU32(end, 0x06054b50);
  writeU16(end, 0);
  writeU16(end, 0);
  writeU16(end, files.length);
  writeU16(end, files.length);
  writeU32(end, centralSize);
  writeU32(end, offset);
  writeU16(end, 0);
  return new Blob([...localParts, ...centralParts, new Uint8Array(end)], { type: "application/zip" });
}

async function fetchTextIfAvailable(url) {
  if (!url) return "";
  const response = await fetch(versionedUrl(url), { cache: "no-store" });
  if (!response.ok) throw new Error(`Could not load generated HTML (${response.status}).`);
  return response.text();
}

async function captureJobHtml(job, preferPreview = true) {
  const win = previewWindow();
  ensurePreviewEditorApi();
  if (preferPreview && state.activeJob?.id === job.id && win && typeof win.exportEditedHtml === "function") {
    return {
      pagedHtml: await win.exportEditedHtml("paged"),
      scrollHtml: await win.exportEditedHtml("scroll"),
    };
  }
  const pagedHtml = job.inlinePreviewHtmlCache || await fetchTextIfAvailable(job.previewUrl);
  const scrollHtml = job.inlineScrollHtmlCache || (job.scrollUrl ? await fetchTextIfAvailable(job.scrollUrl) : makeScrollHtmlFromPaged(pagedHtml));
  return { pagedHtml, scrollHtml };
}

function updateLocalJobHtml(job, pagedHtml, scrollHtml) {
  if (!job) return job;
  job.inlinePreviewHtmlCache = pagedHtml;
  job.inlineScrollHtmlCache = scrollHtml;
  job.previewUrl = createInlineHtmlUrl(pagedHtml);
  job.scrollUrl = createInlineHtmlUrl(scrollHtml);
  job.inlinePreviewAvailable = true;
  job.updatedAt = new Date().toISOString();
  state.jobs = state.jobs.map((item) => item.id === job.id ? job : item);
  if (state.activeJob?.id === job.id) state.activeJob = job;
  return job;
}

async function makeClientZipUrl(job, pagedHtml, scrollHtml) {
  const readme = "Open index.html for paged navigation, or index-scroll.html for continuous scrolling.\nImages are embedded in the HTML, so they will not be lost.\n";
  const blob = makeZipBlob([
    { name: "index.html", data: pagedHtml },
    { name: "index-scroll.html", data: scrollHtml },
    { name: "index-single-file.html", data: pagedHtml },
    { name: "index-scroll-single-file.html", data: scrollHtml },
    { name: "README-open.txt", data: readme },
  ]);
  const url = URL.createObjectURL(blob);
  state.inlineObjectUrls.push(url);
  return url;
}

function setPreviewEditing(force = null) {
  if (!state.activeJob) {
    setStatus("Generate or select a job first.", "error");
    return false;
  }
  if (!hasEditablePreview()) {
    setStatus("This preview was generated before in-place editing was added. Regenerate the PPT, or open the preview and use Download Edited ZIP there.", "error");
    return false;
  }
  const shouldEdit = force === null ? !isPreviewEditing() : Boolean(force);
  if (isPreviewEditing() !== shouldEdit) {
    ensurePreviewEditorApi().toggleEdit();
  }
  updatePreviewEditButton(shouldEdit);
  setStatus(shouldEdit ? "Editing in the preview. Select text, then use style buttons or download ZIP." : "Preview editing stopped.", shouldEdit ? "ok" : "");
  return true;
}

async function savePreviewEditsToServer(job, options = {}) {
  if (!job) return null;
  let captured = null;
  try {
    captured = await captureJobHtml(job, true);
  } catch (error) {
    if (options.requireEditable) {
      throw new Error(error.message || "The current preview cannot export edited HTML. Regenerate this PPT, then edit inside the preview frame.");
    }
    return null;
  }
  const localJob = updateLocalJobHtml(job, captured.pagedHtml, captured.scrollHtml);
  state.activeJob = localJob;
  let data = { job: localJob, share: state.activeShare || localJob.share, localOnly: true };
  try {
    const response = await fetch(apiUrl(`/api/jobs/${job.id}/save-edited`), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pagedHtml: captured.pagedHtml, scrollHtml: captured.scrollHtml }),
    });
    data = await readJsonResponse(response, "Could not save edited HTML");
    const hydrated = hydrateInlineJob({
      ...(data.job || localJob),
      inlinePreviewHtml: captured.pagedHtml,
      inlineScrollHtml: captured.scrollHtml,
    });
    state.activeJob = hydrated;
    state.jobs = state.jobs.map((item) => item.id === job.id ? hydrated : item);
  } catch {
    data = { job: localJob, share: state.activeShare || localJob.share, localOnly: true };
  }
  state.activeShare = hydrateShare(data.share || state.activeShare);
  renderJobs();
  renderJobSelect();
  el("jobSelect").value = state.activeJob.id;
  renderShare(state.activeShare || state.activeJob.share || null);
  setStatus(data.localOnly ? "Edits are saved in this browser. Download ZIP will include the latest edits." : "Edited paged and scroll HTML saved.", "ok");
  return data;
}

async function downloadJobZip(job) {
  if (!job) return;
  const button = el("downloadJob");
  const oldText = button?.textContent;
  try {
    if (button) {
      button.disabled = true;
      button.textContent = "Packaging...";
    }
    setStatus("Packaging current HTML in the browser...");
    const captured = await captureJobHtml(job, true);
    const latestJob = updateLocalJobHtml(job, captured.pagedHtml, captured.scrollHtml);
    const zipUrl = await makeClientZipUrl(latestJob, captured.pagedHtml, captured.scrollHtml);
    setStatus("Downloading ZIP package with the latest edited HTML.", "ok");
    triggerDownload(zipUrl, `${latestJob.id || "optimized-ppt"}.zip`);
  } catch (error) {
    setStatus(error.message || "Could not package the edited HTML.", "error");
  } finally {
    if (button) {
      button.disabled = false;
      button.textContent = oldText || "Download ZIP";
    }
  }
}

function downloadById(jobId) {
  const job = state.jobs.find((item) => item.id === jobId) || state.activeJob;
  if (job) downloadJobZip(job);
}

async function analyzeShare(jobId = null) {
  const job = state.jobs.find((item) => item.id === jobId) || state.activeJob;
  const shareButton = el("shareJob");
  if (!job) {
    setStatus("Generate or select a job first.", "error");
    renderShareMessage("Generate or select a job first, then run Analyze & Share.", "blocked");
    return;
  }
  try {
    setStatus("Analyzing share package...");
    renderShareMessage("Checking image paths and building the share package...", "checking");
    if (shareButton) shareButton.disabled = true;
    const response = await fetch(apiUrl(`/api/jobs/${job.id}/share`), { method: "GET", cache: "no-store" });
    const data = await readJsonResponse(response, "Share analysis failed");
    state.activeJob = hydrateInlineJob(data.job);
    state.activeShare = hydrateShare(data.share);
    state.jobs = state.jobs.map((item) => item.id === data.job.id ? data.job : item);
    renderJobs();
    renderJobSelect();
    el("jobSelect").value = data.job.id;
    renderShare(data.share);
    setStatus(data.share.status === "blocked" ? "Share package has missing images." : "Share package is ready.", data.share.status === "blocked" ? "error" : "ok");
  } catch (error) {
    setStatus(error.message, "error");
    renderShareMessage(error.message || "Share analysis failed.", "blocked");
  } finally {
    if (shareButton) shareButton.disabled = false;
  }
}

function renderShareMessage(message, status = "checking") {
  const panel = el("sharePanel");
  panel.classList.remove("hidden");
  const badgeLabel = {
    checking: "Checking",
    ready: "Ready",
    warning: "Check advised",
    blocked: "Blocked",
  }[status] || "Checking";
  el("shareBadge").textContent = badgeLabel;
  el("shareBadge").className = `share-badge ${status}`;
  el("shareSummary").textContent = message;
  el("shareStats").innerHTML = "";
}

function renderShare(share) {
  const panel = el("sharePanel");
  if (!share) {
    panel.classList.add("hidden");
    return;
  }
  panel.classList.remove("hidden");
  el("shareBadge").textContent = share.status === "ready" ? "Ready" : share.status === "warning" ? "Check advised" : "Blocked";
  el("shareBadge").className = `share-badge ${share.status}`;
  el("shareSummary").textContent = share.recommendation || "";
  el("shareStats").innerHTML = [
    ["Images", share.totalImages ?? 0],
    ["Embedded", share.embeddedImages ?? 0],
    ["Missing", share.missingImages ?? 0],
    ["Risky paths", share.riskyPaths ?? 0],
    ["External", share.externalImages ?? 0],
  ].map(([label, value]) => `<span><strong>${value}</strong>${label}</span>`).join("");
}

function openShareUrl(kind) {
  const share = state.activeShare || state.activeJob?.share;
  if (kind === "zip" && state.activeJob) {
    downloadJobZip(state.activeJob);
    return;
  }
  if (!share) return;
  const url = {
    zip: share.zipPackageUrl || state.activeJob?.downloadUrl,
    single: share.singleFileUrl,
    scrollSingle: share.scrollSingleFileUrl,
    report: share.reportUrl,
  }[kind];
  if (url) window.open(url, "_blank");
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;",
  }[char]));
}

async function loadIntegration() {
  try {
    const response = await fetch(apiUrl("/api/integration"));
    const data = await readJsonResponse(response, "Could not load API settings");
    state.integration = { ...state.integration, ...(data.integration || {}) };
    renderIntegration();
  } catch {
    setApiStatus("Could not load API settings.", "error");
  }
}

function collectIntegration(includeKey = false, options = {}) {
  syncModeFromProvider();
  const mode = el("apiMode").value;
  const payload = {
    mode,
    endpoint: el("apiEndpoint").value.trim(),
    apiKeyHeader: el("apiKeyHeader").value,
    apiKeyPrefix: el("apiKeyPrefix").value,
    customHeaders: el("customHeaders").value.trim(),
    workflowPayload: el("workflowPayload").value,
    model: el("apiModel").value.trim(),
    timeoutSec: Number(el("apiTimeout").value || 90),
    fallbackToLocal: mode === "local" ? true : false,
    clearApiKey: Boolean(options.allowClear && el("clearApiKey").checked),
  };
  const apiKey = el("apiKey").value.trim();
  if (includeKey && apiKey) payload.apiKey = apiKey;
  return payload;
}

function renderIntegration() {
  state.apiProvider = inferApiProvider(state.integration);
  el("apiProvider").value = state.apiProvider;
  el("apiMode").value = state.integration.mode || "local";
  el("apiEndpoint").value = state.integration.endpoint || "";
  el("apiKeyHeader").value = state.integration.apiKeyHeader || "Authorization";
  el("apiKeyPrefix").value = state.integration.apiKeyPrefix ?? "Bearer ";
  el("customHeaders").value = state.integration.customHeaders || "";
  el("workflowPayload").value = state.integration.workflowPayload || "flat";
  el("apiModel").value = state.integration.model || "";
  el("apiTimeout").value = state.integration.timeoutSec || 90;
  el("fallbackToLocal").checked = state.integration.mode === "local";
  el("clearApiKey").checked = false;
  updateProviderUi();
  const isLocalMode = state.integration.mode === "local";
  const modeLabel = isLocalMode ? "Local rules active" : apiProviders[state.apiProvider]?.label || "External API enabled";
  const localKey = localApiKeyForCurrentProvider();
  const keyLabel = !isLocalMode && (localKey || state.integration.hasApiKey) ? ` Key: ${maskedKey(localKey) || state.integration.apiKeyMasked}` : "";
  el("apiKeyNote").textContent = isLocalMode
    ? "Local rules do not need an API key."
    : (localKey || state.integration.hasApiKey)
      ? `Saved key: ${maskedKey(localKey) || state.integration.apiKeyMasked}. Leave the key field blank to keep it.`
      : "No saved key yet. Paste a key once and save.";
  setApiStatus(`${modeLabel}.${keyLabel}`, state.integration.mode === "local" ? "" : "ok");
}

function inferApiProvider(integration) {
  const mode = integration.mode || "local";
  const endpoint = (integration.endpoint || "").toLowerCase();
  if (mode === "local") return "local";
  if (mode === "workflow_api" && integration.workflowPayload === "dify") return "dify";
  if (mode === "workflow_api") return "workflow";
  if (endpoint.includes("api.deepseek.com")) return "deepseek";
  if (endpoint.includes("ark.cn-beijing.volces.com") || endpoint.includes("volces.com/api/v3")) return "doubao_seed";
  if (endpoint.includes("api.openai.com")) return "openai";
  return "custom_ai";
}

function syncModeFromProvider() {
  const provider = el("apiProvider").value;
  const preset = apiProviders[provider] || apiProviders.local;
  el("apiMode").value = preset.mode;
}

function applyProviderPreset(provider, overwrite = true) {
  const preset = apiProviders[provider] || apiProviders.local;
  state.apiProvider = provider;
  el("apiMode").value = preset.mode;
  if (overwrite) {
    if (preset.endpoint) el("apiEndpoint").value = preset.endpoint;
    if (Object.prototype.hasOwnProperty.call(preset, "model")) el("apiModel").value = preset.model || "";
    if (preset.apiKeyHeader) el("apiKeyHeader").value = preset.apiKeyHeader;
    if (Object.prototype.hasOwnProperty.call(preset, "apiKeyPrefix")) el("apiKeyPrefix").value = preset.apiKeyPrefix;
    if (Object.prototype.hasOwnProperty.call(preset, "customHeaders")) el("customHeaders").value = preset.customHeaders || "";
    if (preset.workflowPayload) el("workflowPayload").value = preset.workflowPayload;
    if (preset.timeoutSec) el("apiTimeout").value = preset.timeoutSec;
    el("fallbackToLocal").checked = preset.mode === "local";
  }
  updateProviderUi();
}

function updateProviderUi() {
  const provider = el("apiProvider").value;
  const isLocal = provider === "local";
  const isWorkflow = provider === "workflow" || provider === "dify";
  el("apiEndpointField").classList.toggle("api-hidden", isLocal);
  el("apiModelField").classList.toggle("api-hidden", isLocal || isWorkflow);
  el("apiKey").closest("label").classList.toggle("api-hidden", isLocal);
  if (isLocal) {
    el("apiKeyNote").textContent = "Local rules do not need an API key.";
  } else if (localApiKeyForCurrentProvider() || state.integration.hasApiKey) {
    el("apiKeyNote").textContent = `Saved key: ${maskedKey(localApiKeyForCurrentProvider()) || state.integration.apiKeyMasked}. Leave the key field blank to keep it.`;
  } else {
    el("apiKeyNote").textContent = "Paste the API key once. After saving, it is kept locally and reused.";
  }
}

function setApiStatus(message, kind = "") {
  el("apiStatus").textContent = message;
  el("apiStatus").className = `api-status ${kind}`;
}

async function saveIntegration(showSuccess = true, allowClear = true) {
  const integration = collectIntegration(true, { allowClear });
  const typedKey = el("apiKey").value.trim();
  if (typedKey && integration.mode !== "local") {
    const secret = readLocalApiSecret();
    secret[state.apiProvider] = typedKey;
    if (integration.endpoint) secret[integration.endpoint] = typedKey;
    writeLocalApiSecret(secret);
  }
  if (integration.clearApiKey) {
    const secret = readLocalApiSecret();
    delete secret[state.apiProvider];
    if (integration.endpoint) delete secret[integration.endpoint];
    writeLocalApiSecret(secret);
  }
  if (!integration.apiKey && integration.mode !== "local") {
    integration.apiKey = localApiKeyForCurrentProvider();
  }
  const response = await fetch(apiUrl("/api/integration"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ integration }),
  });
  const data = await readJsonResponse(response, "Could not save API settings");
  state.integration = { ...state.integration, ...(data.integration || {}) };
  state.apiProvider = inferApiProvider(state.integration);
  el("apiKey").value = "";
  el("clearApiKey").checked = false;
  renderIntegration();
  if (showSuccess) setApiStatus("API settings saved.", "ok");
  return state.integration;
}

async function testIntegration() {
  try {
    setApiStatus("Testing API endpoint...");
    await saveIntegration(false, false);
    const response = await fetch(apiUrl("/api/integration/test"), { method: "POST" });
    const data = await readJsonResponse(response, "API test failed");
    if (!data.ok) throw new Error(data.message || data.error || "API test failed");
    setApiStatus(data.message || "API test passed.", "ok");
  } catch (error) {
    setApiStatus(error.message, "error");
  }
}

async function checkHealth() {
  try {
    const response = await fetch("/api/health");
    if (!response.ok) throw new Error("bad");
    let data = await readJsonResponse(response, "Backend health check failed").catch(() => ({}));
    const externalBackend = normalizeBaseUrl(data.externalBackendOrigin || data.publicBackendOrigin || "");
    if (externalBackend) {
      state.apiBaseUrl = externalBackend;
      const externalResponse = await fetch(apiUrl("/api/health"));
      data = await readJsonResponse(externalResponse, "External backend health check failed");
      data.runtime = data.runtime || "external";
      data.usingExternalBackend = true;
    } else {
      state.apiBaseUrl = "";
    }
    state.runtime = data.runtime || "local";
    state.maxRequestBytes = Number(data.maxPayloadBytes || data.maxRequestBytes || 150 * 1024 * 1024);
    if (data.maxRawUploadBytes) {
      state.maxUploadBytes = Number(data.maxRawUploadBytes);
    } else if (data.maxRawUploadMb) {
      state.maxUploadBytes = Number(data.maxRawUploadMb) * 1024 * 1024;
    } else if (state.runtime === "vercel") {
      state.maxUploadBytes = Math.floor(Number(data.maxUploadMb || 4) * 1024 * 1024 * 0.62);
    } else {
      state.maxUploadBytes = Number(data.maxUploadMb || 100) * 1024 * 1024;
    }
    el("health").textContent = "Backend ready";
    el("health").classList.add("ok");
    const uploadLimit = el("uploadLimitText");
    if (uploadLimit) {
      const prefix = data.usingExternalBackend ? `External backend: ${state.apiBaseUrl}. ` : "";
      uploadLimit.textContent = `${prefix}${uploadLimitMessage()}`;
    }
  } catch {
    state.apiBaseUrl = "";
    el("health").textContent = "Backend offline";
    el("health").classList.add("error");
  }
}

async function init() {
  renderSteps();
  renderStyles();
  bindEvents();
  await checkHealth();
  await loadIntegration();
  await loadJobs();
}

function bindEvents() {
  const dropZone = el("dropZone");
  const fileInput = el("fileInput");
  el("helpButton").addEventListener("click", openHelp);
  el("closeHelp").addEventListener("click", closeHelp);
  el("helpOverlay").addEventListener("click", (event) => {
    if (event.target === el("helpOverlay")) closeHelp();
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !el("helpOverlay").classList.contains("hidden")) closeHelp();
  });
  el("settingsButton").addEventListener("click", () => {
    document.querySelector(".api-card")?.scrollIntoView({ behavior: "smooth", block: "start" });
  });
  dropZone.addEventListener("click", (event) => {
    if (event.target.tagName !== "INPUT") fileInput.click();
  });
  fileInput.addEventListener("change", () => handleFile(fileInput.files[0]));
  ["dragenter", "dragover"].forEach((name) => dropZone.addEventListener(name, (event) => {
    event.preventDefault();
    dropZone.classList.add("dragging");
  }));
  ["dragleave", "drop"].forEach((name) => dropZone.addEventListener(name, (event) => {
    event.preventDefault();
    dropZone.classList.remove("dragging");
  }));
  dropZone.addEventListener("drop", (event) => handleFile(event.dataTransfer.files[0]));
  el("clearFile").addEventListener("click", () => {
    state.selectedFile = null;
    fileInput.value = "";
    el("fileCard").classList.add("hidden");
    setStatus("");
  });
  el("runButton").addEventListener("click", generate);
  el("closeGenerationOverlay").addEventListener("click", hideGenerationOverlay);
  el("apiProvider").addEventListener("change", (event) => applyProviderPreset(event.target.value, true));
  el("saveApiSettings").addEventListener("click", async () => {
    try {
      setApiStatus("Saving API settings...");
      await saveIntegration(true, true);
    } catch (error) {
      setApiStatus(error.message, "error");
    }
  });
  el("testApiSettings").addEventListener("click", testIntegration);
  el("refreshJobs").addEventListener("click", loadJobs);
  el("jobSelect").addEventListener("change", (event) => selectJob(event.target.value));
  el("openPreview").addEventListener("click", () => {
    if (state.activeJob) window.open(state.activeJob.previewUrl, "_blank");
  });
  el("previewFrame").addEventListener("load", () => updatePreviewEditButton(false));
  el("editHtml").addEventListener("click", () => setPreviewEditing(null));
  el("saveEditedHtml").addEventListener("click", async () => {
    try {
      await savePreviewEditsToServer(state.activeJob, { requireEditable: true });
    } catch (error) {
      setStatus(error.message || "Could not save edited HTML.", "error");
    }
  });
  el("openScrollHtml").addEventListener("click", () => {
    if (state.activeJob) window.open(state.activeJob.scrollUrl || state.activeJob.previewUrl, "_blank");
  });
  el("shareJob").addEventListener("click", () => analyzeShare());
  el("downloadJob").addEventListener("click", () => downloadJobZip(state.activeJob));
  el("downloadShareZip").addEventListener("click", () => openShareUrl("zip"));
  el("openSingleFile").addEventListener("click", () => openShareUrl("single"));
  el("openScrollSingleFile").addEventListener("click", () => openShareUrl("scrollSingle"));
  el("openShareReport").addEventListener("click", () => openShareUrl("report"));
}

init();
