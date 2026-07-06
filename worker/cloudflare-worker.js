import JSZip from "jszip";

const jobs = new Map();
const jobList = [];
const CLOUDFLARE_MAX_RAW_UPLOAD_BYTES = 50 * 1024 * 1024;
const CLOUDFLARE_MAX_PAYLOAD_BYTES = 75 * 1024 * 1024;
const MAX_EMBEDDED_IMAGES = 36;
const MAX_EMBEDDED_IMAGE_BYTES = 700 * 1024;
const MAX_TOTAL_EMBEDDED_IMAGE_BYTES = 6 * 1024 * 1024;
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

const LOCAL_MODE = "local";

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
- Uploads up to 50MB are enabled in this Cloudflare-only deployment. Very large files are still limited by Cloudflare Worker request and memory limits.
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

function isUsefulText(text) {
  const value = String(text || "").replace(/\s+/g, " ").trim();
  if (!value) return false;
  if (/^[\d\s./\\-]+$/.test(value)) return false;
  if (/^[()[\]{}.,;:!?'"`~_\-–—]+$/.test(value)) return false;
  if (/^slide\s*\d+$/i.test(value)) return false;
  return value.length > 1;
}

function cleanText(text) {
  return String(text || "")
    .replace(/\s+/g, " ")
    .replace(/^[•·\-\s]+/, "")
    .trim();
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
    const text = cleanText(xmlDecode(match[1]));
    if (isUsefulText(text)) texts.push(text);
  }
  return texts;
}

async function extractImages(zip, slideXml, rels, slideIndex) {
  const stats = arguments[4] || { embeddedImages: 0, embeddedImageBytes: 0, skippedImages: 0 };
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
    if (stats.embeddedImages >= MAX_EMBEDDED_IMAGES) {
      stats.skippedImages += 1;
      continue;
    }
    if (estimatedSize && estimatedSize > MAX_EMBEDDED_IMAGE_BYTES) {
      stats.skippedImages += 1;
      continue;
    }
    if (estimatedSize && stats.embeddedImageBytes + estimatedSize > MAX_TOTAL_EMBEDDED_IMAGE_BYTES) {
      stats.skippedImages += 1;
      continue;
    }
    const bytes = await file.async("uint8array");
    if (bytes.length > MAX_EMBEDDED_IMAGE_BYTES || stats.embeddedImageBytes + bytes.length > MAX_TOTAL_EMBEDDED_IMAGE_BYTES) {
      stats.skippedImages += 1;
      continue;
    }
    const ext = path.split(".").pop()?.toLowerCase() || "png";
    const mime = ext === "jpg" || ext === "jpeg" ? "image/jpeg" : ext === "gif" ? "image/gif" : ext === "svg" ? "image/svg+xml" : "image/png";
    stats.embeddedImages += 1;
    stats.embeddedImageBytes += bytes.length;
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
  const extractionStats = {
    embeddedImages: 0,
    embeddedImageBytes: 0,
    skippedImages: 0,
    skippedBlankSlides: 0,
  };
  const paths = sortedSlidePaths(zip);
  for (let index = 0; index < paths.length; index += 1) {
    const slidePath = paths[index];
    const slideXml = await zip.file(slidePath).async("string");
    const relsPath = slidePath.replace("ppt/slides/", "ppt/slides/_rels/") + ".rels";
    const relsXml = zip.file(relsPath) ? await zip.file(relsPath).async("string") : "";
    const rels = relationshipMap(relsXml, slidePath);
    const texts = extractTexts(slideXml);
    const images = await extractImages(zip, slideXml, rels, index + 1, extractionStats);
    const isDefaultOnlySlide = texts.length === 1 && /^slide\s*\d+$/i.test(texts[0]) && !images.length;
    if ((!texts.length && !images.length) || isDefaultOnlySlide) {
      extractionStats.skippedBlankSlides += 1;
      continue;
    }
    const title = texts[0] || "";
    slides.push({
      page: index + 1,
      title,
      body: texts.slice(1),
      images,
    });
  }
  if (!slides.length) throw new Error("No slides found in this PPTX file.");
  slides.extractionStats = extractionStats;
  return slides;
}

function splitCards(items, max = 10) {
  const seen = new Set();
  return items
    .map(cleanText)
    .filter(isUsefulText)
    .filter((item) => {
      const key = item.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, max);
}

function textBlocks(items, max = 18) {
  const cleaned = splitCards(items, max);
  const shortCount = cleaned.filter((item) => item.length < 34).length;
  const continuationCount = cleaned.filter((item) => /^(and|or|to|of|in|for|with|on|by|as|the|their|our|your|is|are|was|were|communicate|interact|everyday|lives|working)\b/i.test(item)).length;
  const hasQuoteFlow = cleaned.some((item) => /[“"]/.test(item)) && cleaned.some((item) => /[”"]/.test(item));
  const asParagraph = cleaned.length >= 4 && (hasQuoteFlow || shortCount / cleaned.length > 0.55 || continuationCount >= 2);
  if (!asParagraph) return { items: cleaned, paragraphs: cleaned, asParagraph: false };
  const paragraphs = [];
  let current = "";
  const terminal = /[.!?。！？;；:”"]$/;
  const startsContinuation = /^(and|or|to|of|in|for|with|on|by|as|the|their|our|your|is|are|was|were|communicate|interact|everyday|lives|working|\(|,|;|:)/i;
  const hasOpenQuote = (value) => (value.match(/[“"]/g) || []).length > (value.match(/[”"]/g) || []).length;
  for (const item of cleaned) {
    if (!current) {
      current = item;
      continue;
    }
    const join = hasOpenQuote(current) || startsContinuation.test(item) || (!terminal.test(current) && current.length < 180 && item.length < 70);
    if (join) current = `${current} ${item}`;
    else {
      paragraphs.push(current);
      current = item;
    }
  }
  if (current) paragraphs.push(current);
  return { items: cleaned, paragraphs: paragraphs.slice(0, Math.max(1, max / 2)), asParagraph: true };
}

function themeFor(style) {
  const themes = {
    teaching: ["#f8fbff", "#172554", "#3b82f6", "#eef6ff", "Inter, Arial, sans-serif"],
    softlesson: ["#f8fbff", "#1f3b67", "#477fb2", "#eaf4ff"],
    webacademic: ["#ffffff", "#1e293b", "#2563eb", "#f1f5f9", "Inter, Arial, sans-serif"],
    clean: ["#ffffff", "#111827", "#2563eb", "#f8fafc", "Arial, sans-serif"],
    academic: ["#fdfcf8", "#1f2937", "#64748b", "#f4f1ea", "Georgia, 'Times New Roman', serif"],
    instructional: ["#fffdf7", "#1e3a5f", "#0ea5e9", "#edf8ff", "Verdana, Arial, sans-serif"],
    minimal: ["#ffffff", "#111827", "#111827", "#f6f7f9", "Inter, Arial, sans-serif"],
    healing: ["#fff8ec", "#45352e", "#8abed8", "#f7e7c8", "'Segoe Print', 'Comic Sans MS', cursive"],
    doodle: ["#fff6df", "#3c2c2c", "#8ecae6", "#ffe4a8", "'Segoe Print', 'Comic Sans MS', 'Bradley Hand', cursive"],
    swiss: ["#ffffff", "#14213d", "#2563eb", "#eef2ff"],
    editorial: ["#fffdf8", "#182033", "#b45309", "#f7efe0", "Georgia, 'Times New Roman', serif"],
    vivid: ["#fff7ed", "#172554", "#f97316", "#e0f2fe"],
    contrast: ["#0f172a", "#ffffff", "#38bdf8", "#1e293b"],
  };
  const [bg, ink, accent, panel, font] = themes[style] || themes.teaching;
  return { bg, ink, accent, panel, font: font || "Inter, Arial, sans-serif" };
}

function slideLayout(slide, index) {
  const blocks = textBlocks(slide.body, 12);
  const items = blocks.paragraphs;
  const title = String(slide.title || "").toLowerCase();
  const hasImages = slide.images.length > 0;
  if (index === 0) return "cover";
  if (/\b(outline|agenda|contents?|today|schedule|syllabus|overview)\b/i.test(title)) return "agenda";
  if (/\b(exercise|quiz|question|practice|activity|discussion|answer|solution|case)\b/i.test(title)) return "workshop";
  if (hasImages && items.length <= 1) return "image-focus";
  if (hasImages) return "image-split";
  if (items.length <= 2) return "statement";
  return "lesson";
}

function renderSlide(slide, index, total, style) {
  const theme = themeFor(style);
  const hasImages = slide.images.length > 0;
  const blocks = textBlocks(slide.body, 18);
  const items = blocks.paragraphs;
  const layout = slideLayout(slide, index);
  const density = items.length >= 10 ? "density-many" : items.length >= 6 ? "density-medium" : "density-light";
  const lead = items[0] || "";
  const agendaHtml = items.slice(0, 12).map((item, itemIndex) => `
    <div class="agenda-item editable-text">
      <span>${String(itemIndex + 1).padStart(2, "0")}</span>
      <p>${escapeHtml(item)}</p>
    </div>`).join("");
  const bulletsHtml = items.slice(lead ? 1 : 0, lead ? 12 : 14).map((item) => `<li class="editable-text">${escapeHtml(item)}</li>`).join("");
  const paragraphHtml = items.map((item) => `<p class="body-paragraph editable-text">${escapeHtml(item)}</p>`).join("");
  const conceptHtml = items.slice(0, 3).map((item) => `<div class="point-card editable-text">${escapeHtml(item)}</div>`).join("");
  const contentHtml = {
    cover: items.length ? `<p class="cover-subtitle editable-text">${escapeHtml(items.slice(0, 2).join(" · "))}</p>` : "",
    agenda: `<div class="agenda-list">${agendaHtml}</div>`,
    workshop: `
      <div class="workshop-prompt">
        ${lead ? `<p class="lead-text editable-text">${escapeHtml(lead)}</p>` : ""}
        ${bulletsHtml ? `<ul class="quiet-list">${bulletsHtml}</ul>` : ""}
        <div class="thinking-space editable-text">Class discussion space</div>
      </div>`,
    statement: `
      <div class="statement-block">
        ${blocks.asParagraph ? paragraphHtml : `${lead ? `<p class="lead-text editable-text">${escapeHtml(lead)}</p>` : ""}${bulletsHtml ? `<ul class="quiet-list">${bulletsHtml}</ul>` : ""}`}
      </div>`,
    lesson: `
      <div class="lesson-block">
        ${blocks.asParagraph ? paragraphHtml : `${lead ? `<p class="lead-text editable-text">${escapeHtml(lead)}</p>` : ""}${items.length > 4 ? `<ul class="quiet-list ${items.length > 8 ? "multi-column" : ""}">${items.slice(1, 14).map((item) => `<li class="editable-text">${escapeHtml(item)}</li>`).join("")}</ul>` : `<div class="concept-row">${conceptHtml}</div>`}`}
      </div>`,
    "image-split": `
      <div class="lesson-block">
        ${blocks.asParagraph ? paragraphHtml : `${lead ? `<p class="lead-text editable-text">${escapeHtml(lead)}</p>` : ""}${bulletsHtml ? `<ul class="quiet-list">${bulletsHtml}</ul>` : ""}`}
      </div>`,
    "image-focus": `
      <div class="lesson-block">
        ${lead ? `<p class="lead-text editable-text">${escapeHtml(lead)}</p>` : ""}
      </div>`,
  }[layout] || "";
  const imageHtml = slide.images.map((image) => `<figure class="media-box"><img src="${image.src}" alt="Slide ${slide.page} image" /></figure>`).join("");
  return `
    <section class="slide ${layout} ${hasImages ? "has-media" : "text-only"} ${density}" id="slide-${index + 1}" data-slide-page="${slide.page}" style="--bg:${theme.bg};--ink:${theme.ink};--accent:${theme.accent};--panel:${theme.panel};--font:${theme.font}">
      <div class="slide-inner">
        <header>
          <span class="chapter editable-text">Chapter ${String(index + 1).padStart(2, "0")}</span>
          ${slide.title ? `<h1 class="editable-text">${escapeHtml(slide.title)}</h1>` : ""}
        </header>
        <main>
          ${contentHtml}
          ${hasImages ? `<div class="media-grid">${imageHtml}</div>` : ""}
        </main>
        <footer>${index + 1} / ${total}</footer>
      </div>
    </section>`;
}

function editorRuntime() {
  return `
    <style id="ppt-html-editor-style">
      .editor-toolbar { position: fixed; z-index: 9999; top: 14px; right: 14px; display: none; align-items: center; gap: 6px; padding: 8px; border: 1px solid rgba(37,99,235,.22); border-radius: 12px; background: rgba(255,255,255,.96); box-shadow: 0 12px 32px rgba(15,23,42,.14); font-family: Arial, sans-serif; }
      body.editing .editor-toolbar { display: flex; }
      .editor-toolbar button, .editor-toolbar select, .editor-toolbar input[type="number"] { height: 30px; border: 1px solid #c7d2fe; border-radius: 8px; background: #fff; color: #1e3a8a; font: 700 12px/1 Arial, sans-serif; padding: 0 8px; }
      .editor-toolbar input[type="color"] { width: 32px; height: 30px; padding: 0; border: 1px solid #c7d2fe; border-radius: 8px; background: #fff; }
      body.editing .editable-text, body.editing [contenteditable="true"] { outline: 2px dashed #60a5fa; outline-offset: 3px; cursor: text; }
      body.editing .media-box, body.editing .editable-image-box { outline: 2px dashed #f59e0b; outline-offset: 4px; resize: both; overflow: hidden; min-width: 80px; min-height: 60px; cursor: move; }
      body.editing .media-box img, body.editing .editable-image-box img { width: 100%; height: 100%; object-fit: contain; pointer-events: auto; }
      .free-textbox { position: absolute; left: 12%; top: 30%; min-width: 180px; min-height: 54px; padding: 12px 16px; border: 2px dashed #60a5fa; border-radius: 12px; background: rgba(255,255,255,.92); color: #172554; font: 700 30px/1.2 Arial, sans-serif; z-index: 12; resize: both; overflow: auto; }
    </style>
    <script>(() => {
      let currentSlide = 0;
      const slides = Array.from(document.querySelectorAll('.slide'));
      let selectedElement = null;
      function showSlide(index) {
        currentSlide = Math.max(0, Math.min(index, slides.length - 1));
        slides.forEach((slide, i) => slide.classList.toggle('active', i === currentSlide));
      }
      function nextSlide() { showSlide(currentSlide + 1); }
      function prevSlide() { showSlide(currentSlide - 1); }
      function ensureToolbar() {
        if (document.querySelector('.editor-toolbar')) return;
        const toolbar = document.createElement('div');
        toolbar.className = 'editor-toolbar';
        toolbar.innerHTML = '<select data-font><option value="Arial, sans-serif">Arial</option><option value="Inter, Arial, sans-serif">Inter</option><option value="Georgia, serif">Georgia</option><option value="Times New Roman, serif">Times</option><option value="Verdana, sans-serif">Verdana</option><option value="Microsoft YaHei, sans-serif">Microsoft YaHei</option></select><input data-size type="number" min="12" max="120" value="30" title="Font size"><input data-color type="color" value="#172554" title="Color"><button data-bold>B</button><button data-italic>I</button><button data-underline>U</button><button data-add-text>Text</button><button data-add-image>Image</button><button data-delete>Delete</button><input data-image-file type="file" accept="image/*" style="display:none">';
        document.body.appendChild(toolbar);
        toolbar.querySelector('[data-font]').addEventListener('change', (e) => applyStyle('fontFamily', e.target.value));
        toolbar.querySelector('[data-size]').addEventListener('change', (e) => applyStyle('fontSize', e.target.value + 'px'));
        toolbar.querySelector('[data-color]').addEventListener('input', (e) => applyStyle('color', e.target.value));
        toolbar.querySelector('[data-bold]').addEventListener('click', () => document.execCommand('bold'));
        toolbar.querySelector('[data-italic]').addEventListener('click', () => document.execCommand('italic'));
        toolbar.querySelector('[data-underline]').addEventListener('click', () => document.execCommand('underline'));
        toolbar.querySelector('[data-add-text]').addEventListener('click', addTextBox);
        toolbar.querySelector('[data-add-image]').addEventListener('click', () => toolbar.querySelector('[data-image-file]').click());
        toolbar.querySelector('[data-image-file]').addEventListener('change', addImageFromInput);
        toolbar.querySelector('[data-delete]').addEventListener('click', deleteSelected);
      }
      function activeSlide() { return slides[currentSlide] || document.querySelector('.slide.active') || document.body; }
      function selectElement(el) {
        selectedElement = el && (el.closest('.media-box,.editable-image-box,.free-textbox,.editable-text,[contenteditable="true"]') || el);
        if (selectedElement) {
          const style = getComputedStyle(selectedElement);
          document.querySelector('[data-size]')?.setAttribute('value', String(Math.round(parseFloat(style.fontSize) || 30)));
        }
      }
      function applyStyle(prop, value) {
        const target = selectedElement && !selectedElement.matches('.media-box,.editable-image-box,img') ? selectedElement : document.activeElement;
        if (target && target !== document.body) target.style[prop] = value;
      }
      function makeDraggable(el) {
        if (el.dataset.dragReady) return;
        el.dataset.dragReady = '1';
        el.addEventListener('pointerdown', (event) => {
          if (!document.body.classList.contains('editing') || event.target.closest('.editor-toolbar')) return;
          if (event.target.matches('[contenteditable="true"],.editable-text')) return;
          selectElement(el);
          const rect = el.getBoundingClientRect();
          const parentRect = activeSlide().getBoundingClientRect();
          const startX = event.clientX;
          const startY = event.clientY;
          const baseLeft = rect.left - parentRect.left;
          const baseTop = rect.top - parentRect.top;
          el.style.position = 'absolute';
          el.style.left = baseLeft + 'px';
          el.style.top = baseTop + 'px';
          el.style.zIndex = '20';
          el.setPointerCapture?.(event.pointerId);
          const move = (moveEvent) => {
            el.style.left = Math.max(0, baseLeft + moveEvent.clientX - startX) + 'px';
            el.style.top = Math.max(0, baseTop + moveEvent.clientY - startY) + 'px';
          };
          const up = () => {
            el.removeEventListener('pointermove', move);
            el.removeEventListener('pointerup', up);
          };
          el.addEventListener('pointermove', move);
          el.addEventListener('pointerup', up);
        });
      }
      function prepareImages() {
        document.querySelectorAll('img').forEach((img) => {
          if (img.closest('.media-box,.editable-image-box')) {
            makeDraggable(img.closest('.media-box,.editable-image-box'));
            return;
          }
          const box = document.createElement('span');
          box.className = 'editable-image-box';
          img.parentNode.insertBefore(box, img);
          box.appendChild(img);
          makeDraggable(box);
        });
      }
      function toggleEdit(force) {
        const editing = typeof force === 'boolean' ? force : !document.body.classList.contains('editing');
        ensureToolbar();
        document.body.classList.toggle('editing', editing);
        document.querySelectorAll('h1,.point-card,.chapter,.editable-text,p,li,td,th,.free-textbox').forEach((node) => node.contentEditable = editing ? 'true' : 'false');
        if (editing) prepareImages();
      }
      function addTextBox() {
        const box = document.createElement('div');
        box.className = 'free-textbox editable-text';
        box.textContent = 'New text';
        box.contentEditable = 'true';
        activeSlide().appendChild(box);
        makeDraggable(box);
        selectElement(box);
        box.focus();
      }
      function addImageFromInput(event) {
        const file = event.target.files && event.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = () => {
          const box = document.createElement('figure');
          box.className = 'media-box';
          box.style.position = 'absolute';
          box.style.left = '12%';
          box.style.top = '36%';
          box.style.width = '320px';
          box.style.height = '220px';
          box.innerHTML = '<img alt="Added image">';
          box.querySelector('img').src = reader.result;
          activeSlide().appendChild(box);
          makeDraggable(box);
          selectElement(box);
        };
        reader.readAsDataURL(file);
        event.target.value = '';
      }
      function deleteSelected() {
        if (selectedElement && !selectedElement.matches('body,.slide,.slide-inner')) {
          selectedElement.remove();
          selectedElement = null;
        }
      }
      async function exportEditedHtml(mode = 'paged') {
        const clone = document.documentElement.cloneNode(true);
        clone.querySelector('.editor-toolbar')?.remove();
        clone.querySelector('#ppt-html-editor-style')?.remove();
        clone.querySelectorAll('[contenteditable]').forEach((node) => node.removeAttribute('contenteditable'));
        clone.querySelector('body')?.classList.remove('editing');
        if (mode === 'scroll') clone.querySelector('body')?.classList.add('scroll-mode');
        else clone.querySelector('body')?.classList.remove('scroll-mode');
        return '<!doctype html>\\n' + clone.outerHTML;
      }
      window.toggleEdit = toggleEdit;
      window.exportEditedHtml = exportEditedHtml;
      window.showSlide = showSlide;
      window.nextSlide = nextSlide;
      window.prevSlide = prevSlide;
      globalThis.toggleEdit = toggleEdit;
      globalThis.exportEditedHtml = exportEditedHtml;
      globalThis.showSlide = showSlide;
      globalThis.nextSlide = nextSlide;
      globalThis.prevSlide = prevSlide;
      document.documentElement.dataset.pptEditorReady = 'true';
      document.addEventListener('keydown', (event) => {
        if (document.body.classList.contains('editing') && (event.target?.isContentEditable || event.target?.closest?.('.editor-toolbar'))) return;
        if (event.key === 'ArrowRight' || event.key === 'PageDown') nextSlide();
        if (event.key === 'ArrowLeft' || event.key === 'PageUp') prevSlide();
      });
      document.addEventListener('click', (event) => selectElement(event.target), true);
      ensureToolbar();
      showSlide(0);
    })();</script>`;
}

function injectEditorRuntime(html) {
  const runtime = editorRuntime();
  let output = String(html || "");
  if (!/<html[\s>]/i.test(output)) {
    output = `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>PPT HTML Studio</title></head><body>${output}</body></html>`;
  }
  if (!/ppt-html-editor-style/.test(output)) {
    output = output.replace(/<\/body>/i, `${runtime}</body>`);
    if (output === html) output += runtime;
  }
  if (!/function\s+showSlide|const\s+slides\s*=/.test(output)) {
    output = output.replace(/<\/body>/i, `<script>window.nextSlide=window.nextSlide||function(){};window.prevSlide=window.prevSlide||function(){};</script></body>`);
  }
  return output;
}

function originalImageStyle() {
  return `<style id="ppt-original-image-style">
    .ppt-original-images { display: grid; gap: 14px; align-content: center; justify-items: center; min-width: 260px; max-width: min(48vw, 680px); margin: 0 auto; }
    .ppt-original-images figure { margin: 0; display: grid; place-items: center; width: 100%; }
    .ppt-original-images img { width: 100%; max-height: 56vh; object-fit: contain; border-radius: 8px; background: #fff; }
    .ppt-original-images[data-count="2"] { grid-template-columns: repeat(2, minmax(0, 1fr)); max-width: min(58vw, 820px); }
    .ppt-original-images[data-count="3"], .ppt-original-images[data-count="4"] { grid-template-columns: repeat(2, minmax(0, 1fr)); max-width: min(60vw, 900px); }
  </style>`;
}

function originalImageBlock(slide) {
  if (!slide?.images?.length) return "";
  const figures = slide.images.map((image, index) => `<figure class="media-box original-ppt-image"><img src="${image.src}" alt="Original PPT slide ${slide.page} image ${index + 1}" /></figure>`).join("");
  return `<div class="ppt-original-images" data-original-images="${slide.page}" data-count="${slide.images.length}">${figures}</div>`;
}

function countHtmlSlides(html) {
  const output = String(html || "");
  const pageMarkers = output.match(/data-slide-page\s*=/gi);
  if (pageMarkers?.length) return pageMarkers.length;
  const sections = (output.match(/<section\b/gi) || []).length;
  if (sections) return sections;
  return (output.match(/class=["'][^"']*\bslide\b/gi) || []).length;
}

function injectOriginalImages(html, slides) {
  if (!slides.some((slide) => slide.images.length)) return html;
  let output = String(html || "");
  const usedPages = new Set();
  output = output.replace(/<figure\b([^>]*data-image-slot\s*=\s*["']?(\d+)["']?[^>]*)>[\s\S]*?<\/figure>/gi, (match, attrs, pageText) => {
    const page = Number(pageText);
    const slide = slides.find((item) => item.page === page);
    if (!slide?.images?.length) return match;
    usedPages.add(page);
    return originalImageBlock(slide);
  });
  const sections = [...output.matchAll(/<section\b[\s\S]*?<\/section>/gi)];
  if (sections.length) {
    let rebuilt = "";
    let cursor = 0;
    sections.forEach((match, index) => {
      const section = match[0];
      const slide = slides[index];
      rebuilt += output.slice(cursor, match.index);
      if (slide?.images?.length && !usedPages.has(slide.page) && !section.includes("ppt-original-images")) {
        rebuilt += section.replace(/<\/section>\s*$/i, `${originalImageBlock(slide)}</section>`);
        usedPages.add(slide.page);
      } else {
        rebuilt += section;
      }
      cursor = match.index + section.length;
    });
    rebuilt += output.slice(cursor);
    output = rebuilt;
  } else {
    const imageAppendix = slides.map(originalImageBlock).filter(Boolean).join("");
    output = output.replace(/<\/body>/i, `${imageAppendix}</body>`);
  }
  if (!/ppt-original-image-style/.test(output)) {
    output = output.replace(/<\/head>/i, `${originalImageStyle()}</head>`);
    if (!/ppt-original-image-style/.test(output)) output = `${originalImageStyle()}${output}`;
  }
  return output;
}

function validateAiHtmlCompleteness(html, slides) {
  const slideCount = countHtmlSlides(html);
  if (slides.length > 2 && slideCount && slideCount < Math.ceil(slides.length * 0.85)) {
    throw new Error(`The AI returned an incomplete deck (${slideCount}/${slides.length} slides). Regenerate or reduce the PPT size.`);
  }
}

function makeScrollHtml(html) {
  let output = String(html || "");
  if (/<body\b[^>]*class="/i.test(output)) {
    output = output.replace(/<body\b([^>]*?)class="([^"]*)"/i, (all, before, cls) => `<body${before}class="${cls} scroll-mode"`);
  } else if (/<body\b/i.test(output)) {
    output = output.replace(/<body\b([^>]*)>/i, '<body$1 class="scroll-mode">');
  }
  return output;
}

function buildHtml(slides, style, mode = "paged") {
  const bodyClass = `${mode === "scroll" ? "scroll-mode " : ""}style-${style}`;
  const slideHtml = slides.map((slide, index) => renderSlide(slide, index, slides.length, style)).join("\n");
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>PPT HTML Studio</title>
  <style>
    * { box-sizing: border-box; }
    html, body { margin: 0; min-height: 100%; background: #f6f8fb; color: #17213f; font-family: var(--font, Inter, Arial, sans-serif); }
    body { overflow: hidden; }
    body.scroll-mode { overflow: auto; }
    .slide { width: 100vw; height: 100vh; display: none; background: var(--bg); color: var(--ink); overflow: hidden; font-family: var(--font, Inter, Arial, sans-serif); }
    .slide.active { display: block; }
    body.scroll-mode .slide { display: block; min-height: 100vh; height: auto; page-break-after: always; }
    .slide-inner { width: min(1440px, 100vw); height: 100%; margin: 0 auto; padding: clamp(42px, 6vh, 76px) clamp(72px, 8vw, 132px) 64px; display: grid; grid-template-rows: auto 1fr auto; gap: clamp(28px, 5vh, 58px); position: relative; }
    header { display: grid; gap: 14px; text-align: left; max-width: 1120px; }
    .chapter { color: var(--accent); font-size: clamp(17px, 1.45vw, 24px); font-weight: 800; letter-spacing: .08em; text-transform: uppercase; }
    h1 { margin: 0; font-size: clamp(40px, 4vw, 64px); line-height: 1.05; max-width: 1080px; overflow-wrap: anywhere; letter-spacing: -0.01em; }
    .cover header { align-self: center; text-align: center; max-width: 1100px; margin: 0 auto; }
    .cover h1 { font-size: clamp(48px, 5.1vw, 78px); }
    .cover-subtitle { margin: 18px auto 0; max-width: 860px; color: #64748b; font-size: clamp(24px, 2vw, 34px); line-height: 1.35; font-weight: 500; }
    main { min-height: 0; display: grid; gap: clamp(28px, 4vh, 48px); align-items: center; }
    .image-split main { grid-template-columns: minmax(0, .82fr) minmax(360px, .9fr); }
    .image-focus main { grid-template-columns: minmax(0, .8fr) minmax(420px, 1fr); }
    .text-only main { grid-template-columns: 1fr; }
    .lead-text { margin: 0; max-width: 980px; font-size: clamp(30px, 2.45vw, 44px); line-height: 1.18; font-weight: 760; letter-spacing: -0.01em; color: var(--ink); }
    .lesson-block, .statement-block, .workshop-prompt { max-width: 1040px; display: grid; gap: 26px; align-content: center; }
    .body-paragraph { margin: 0; max-width: 1120px; font-size: clamp(27px, 2vw, 36px); line-height: 1.28; color: var(--ink); font-weight: 540; overflow-wrap: anywhere; }
    .density-many .body-paragraph { font-size: clamp(23px, 1.55vw, 30px); line-height: 1.24; }
    .body-paragraph + .body-paragraph { margin-top: 8px; color: #334155; }
    .quiet-list { margin: 0; padding: 0; list-style: none; display: grid; gap: 16px; max-width: 940px; }
    .quiet-list.multi-column { grid-template-columns: repeat(2, minmax(0, 1fr)); max-width: 1120px; column-gap: 34px; }
    .quiet-list li { position: relative; padding-left: 28px; font-size: clamp(24px, 1.85vw, 32px); line-height: 1.34; color: #334155; font-weight: 520; }
    .density-many .quiet-list li { font-size: clamp(21px, 1.45vw, 27px); line-height: 1.22; }
    .density-medium .quiet-list li { font-size: clamp(23px, 1.65vw, 30px); line-height: 1.28; }
    .quiet-list li::before { content: ""; position: absolute; left: 0; top: .58em; width: 8px; height: 8px; border-radius: 50%; background: var(--accent); opacity: .75; }
    .numbered-list { margin: 0; padding: 0; list-style: none; display: grid; gap: 18px; max-width: 980px; }
    .numbered-list li { display: grid; grid-template-columns: 42px 1fr; gap: 18px; align-items: start; font-size: clamp(23px, 1.7vw, 30px); line-height: 1.3; color: #334155; }
    .numbered-list li span { color: var(--accent); font-weight: 800; font-size: .8em; padding-top: .15em; }
    .agenda-list { width: min(980px, 80vw); display: grid; grid-template-columns: repeat(2, minmax(260px, 1fr)); gap: 18px 48px; align-self: center; }
    .agenda-item { display: grid; grid-template-columns: 46px 1fr; gap: 16px; align-items: center; min-height: 54px; border-bottom: 1px solid #dbe5f2; }
    .agenda-item span { color: var(--accent); font-size: 18px; font-weight: 800; letter-spacing: .04em; }
    .agenda-item p { margin: 0; font-size: clamp(24px, 1.85vw, 32px); line-height: 1.15; font-weight: 650; color: var(--ink); }
    .concept-row { display: grid; grid-template-columns: repeat(3, minmax(180px, 1fr)); gap: 18px; max-width: 980px; }
    .point-card { min-width: 0; border-radius: 8px; background: #ffffff; border: 1px solid #d7e3f4; padding: 22px 24px; font-size: clamp(22px, 1.65vw, 30px); line-height: 1.25; font-weight: 650; overflow-wrap: anywhere; display: flex; align-items: center; box-shadow: none; }
    .thinking-space { width: min(860px, 68vw); min-height: 180px; border: 1px dashed #b7c7dc; border-radius: 8px; color: #94a3b8; display: grid; place-items: center; font-size: 24px; font-weight: 600; }
    .media-grid { min-height: 0; display: grid; gap: 18px; align-content: center; }
    .image-focus .media-grid { justify-self: center; width: min(72vw, 980px); }
    .image-focus .media-grid img { max-height: 66vh; }
    .media-box { margin: 0; display: grid; place-items: center; min-height: 0; }
    .media-grid img { width: 100%; max-height: 54vh; object-fit: contain; border-radius: 8px; box-shadow: none; background: #fff; }
    footer { justify-self: end; color: #64748b; font-size: 20px; }
    .nav { position: fixed; z-index: 20; left: 50%; bottom: 18px; transform: translateX(-50%); display: flex; gap: 10px; }
    .nav button { border: 1px solid #d8e2f0; border-radius: 8px; padding: 8px 13px; background: #ffffff; color: #1e3a8a; font-size: 15px; font-weight: 800; cursor: pointer; box-shadow: none; }
    .nav button:last-child { background: #2563eb; color: #fff; border-color: #2563eb; }
    body.scroll-mode .nav { display: none; }
    body.editing [contenteditable="true"] { outline: 3px dashed var(--accent); outline-offset: 4px; }
    body.style-clean .point-card, body.style-minimal .point-card { background: transparent; border-color: #d1d5db; }
    body.style-minimal .chapter { color: var(--ink); opacity: .55; letter-spacing: .16em; }
    body.style-minimal .quiet-list li::before { width: 22px; height: 2px; border-radius: 0; top: .72em; }
    body.style-academic h1, body.style-editorial h1 { font-family: Georgia, 'Times New Roman', serif; font-weight: 700; letter-spacing: 0; }
    body.style-academic .chapter { color: #6b7280; text-transform: none; letter-spacing: .03em; }
    body.style-editorial .slide-inner { padding-left: clamp(84px, 10vw, 160px); }
    body.style-editorial .lead-text { border-left: 4px solid var(--accent); padding-left: 24px; font-family: Georgia, 'Times New Roman', serif; font-weight: 600; }
    body.style-swiss .slide-inner { background-image: linear-gradient(rgba(37,99,235,.055) 1px, transparent 1px), linear-gradient(90deg, rgba(37,99,235,.055) 1px, transparent 1px); background-size: 48px 48px; }
    body.style-swiss h1 { max-width: 900px; text-transform: none; letter-spacing: -.02em; }
    body.style-swiss .point-card { border: 0; border-left: 6px solid var(--accent); border-radius: 0; background: rgba(255,255,255,.82); }
    body.style-healing .slide { background: radial-gradient(circle at 88% 12%, rgba(138,190,216,.18), transparent 28%), var(--bg); }
    body.style-healing .point-card, body.style-healing .thinking-space { background: #fffaf0; border-color: #ead7ba; }
    body.style-doodle .slide { background: linear-gradient(0deg, rgba(255,246,223,.96), rgba(255,246,223,.96)); }
    body.style-doodle h1, body.style-doodle .point-card, body.style-doodle .lead-text { font-family: 'Comic Sans MS', 'Trebuchet MS', Arial, sans-serif; }
    body.style-doodle .point-card, body.style-doodle .media-grid img { border: 2px solid #3c2c2c; border-radius: 8px; transform: rotate(-.25deg); }
    body.style-doodle .quiet-list li::before { border-radius: 2px; transform: rotate(12deg); }
    body.style-contrast .quiet-list li, body.style-contrast footer, body.style-contrast .cover-subtitle { color: rgba(255,255,255,.82); }
    body.style-contrast .point-card { background: #111827; color: #fff; border-color: rgba(56,189,248,.45); }
    body.style-vivid .chapter { background: var(--accent); color: #fff; width: fit-content; padding: 5px 12px; border-radius: 999px; letter-spacing: .04em; }
    body.style-vivid .point-card { background: #fff7ed; border-color: #fed7aa; }
    body.style-instructional .thinking-space { background: #f0f9ff; border-style: solid; }
    body.style-webacademic .slide-inner { max-width: 1320px; }
    body.style-webacademic .lead-text { max-width: 1120px; font-weight: 650; }
    body.style-softlesson .point-card, body.style-teaching .point-card { background: var(--panel); }
    @media (max-width: 900px) {
      .slide-inner { padding: 34px 28px 50px; }
      .image-split main { grid-template-columns: 1fr; }
      h1 { font-size: 44px; }
      .agenda-list, .concept-row { grid-template-columns: 1fr; width: 100%; }
      .point-card, .quiet-list li, .agenda-item p { font-size: 26px; }
    }
  </style>
</head>
<body class="${bodyClass}">
  ${slideHtml}
  <div class="nav"><button onclick="prevSlide()">Prev</button><button onclick="nextSlide()">Next</button></div>
  ${editorRuntime()}
</body>
</html>`;
}

function mergedIntegrationConfig(override = {}) {
  const merged = { ...integrationConfig, ...(override || {}) };
  if (!override?.apiKey && integrationConfig.apiKey) merged.apiKey = integrationConfig.apiKey;
  return merged;
}

function stylePrompt(style) {
  const directions = {
    teaching: "Teaching Blue: calm education technology, navy text, blue accents, lecture-friendly hierarchy, concise academic wording.",
    softlesson: "Soft Lesson: warm white background, gentle blue accents, quiet workshop feeling, large readable text and spacious examples.",
    webacademic: "Academic Webpage: polished long-form web presentation, section rhythm, editorial spacing, restrained cards only when useful.",
    clean: "Clean: minimalist black and blue, strong typographic hierarchy, almost no decoration, generous margins.",
    academic: "Academic: scholarly, serif title accents allowed, formal structure, no playful decoration, focus on clarity.",
    instructional: "Instructional: classroom-ready, clear steps, practice prompts, visual anchors, leave space for teacher explanation.",
    minimal: "Minimal: few elements, high whitespace, one idea per page, simple lines and no card grids unless essential.",
    contrast: "High Contrast: dark/light contrast, bold but not crowded, accessible colors, no low-contrast text.",
    healing: "Healing Hand-drawn: soft hand-drawn workshop feeling, gentle paper-like warmth, light sketch accents only, no clutter.",
    doodle: "Doodle Sketch: playful but clean marker style, sparse doodle accents, hand-sketched dividers, readable classroom layout.",
    swiss: "Swiss Grid: strict grid, left-aligned precision, strong scale contrast, blue accent rules, no decorative cards.",
    editorial: "Editorial: magazine-like education feature, elegant title scale, thoughtful pull quotes, airy composition.",
    vivid: "Vivid: bright education product energy, controlled accent blocks, crisp modern UI feeling, no heavy gradients.",
  };
  return directions[style] || directions.teaching;
}

function deckPrompt(slides, style) {
  const compactSlides = slides.map((slide) => ({
    page: slide.page,
    title: slide.title,
    body: slide.body.slice(0, 20),
    imageCount: slide.images.length,
    hasImages: slide.images.length > 0,
  }));
  return `Generate a complete standalone editable HTML slide deck in English from this PPT JSON.

Style direction:
${stylePrompt(style)}

Non-negotiable output rules:
- Return ONLY complete HTML code. No markdown explanation.
- This must be the AI-designed deck itself; do not ask another system to apply a local template.
- Generate exactly ${slides.length} slide sections, one for every input slide, in the same order.
- Every slide section must include data-slide-page="original page number".
- Preserve the original PPT's intent and rough layout type. Do not convert every slide into an outline, numbered list, or card grid.
- Only make agenda/outline numbered pages when the original slide title explicitly says Agenda, Outline, Contents, Schedule, Syllabus, Today, or Overview.
- Never create placeholder pages titled "Slide 1", "Slide 2", etc.
- One core idea per slide. Keep pages clean, ordered, airy, modern education/workshop style.
- Avoid stacked gradients, heavy shadows, complex textures, excessive decoration, nested cards, and packed grids.
- Body text must be greater than 30pt. Slide titles must be greater than 45pt.
- No text may overflow the viewport or its box. Do not use scrollable text boxes.
- If a slide has images, reserve a clear visual area for the original image using exactly <figure data-image-slot="page-number"></figure>. The platform will replace that placeholder with the original PPT image.
- Include small Prev/Next buttons that stay away from editing controls.
- Include window.toggleEdit(force) and window.exportEditedHtml(mode) so the platform editor can work.
- Use CSS that keeps all sections visible and self-contained; no content should be clipped or hidden by default.

PPT JSON:
${JSON.stringify({ style, slideCount: slides.length, slides: compactSlides }).slice(0, 65000)}`;
}

function integrationHeaders(config) {
  const headers = {
    "content-type": "application/json",
    [config.apiKeyHeader || "Authorization"]: `${config.apiKeyPrefix ?? "Bearer "}${config.apiKey}`,
  };
  for (const line of String(config.customHeaders || "").split(/\r?\n/)) {
    const [key, ...rest] = line.split(":");
    if (key && rest.length) headers[key.trim()] = rest.join(":").trim();
  }
  return headers;
}

async function readApiResponse(response) {
  const text = await response.text();
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch {
    return { text, message: text.replace(/\s+/g, " ").trim() };
  }
}

function extractTextFromApiData(data) {
  return data.choices?.[0]?.message?.content
    || data.choices?.[0]?.text
    || data.output_text
    || data.output?.[0]?.content?.[0]?.text
    || data.output?.text
    || data.answer
    || data.data?.answer
    || data.data?.outputs?.html
    || data.data?.outputs?.text
    || data.data?.outputs?.result
    || data.html
    || data.text
    || data.result
    || "";
}

async function callAiApi(slides, config, style) {
  const endpoint = normalizeChatEndpoint(config.endpoint);
  const prompt = deckPrompt(slides, style);
  const response = await fetch(endpoint, {
    method: "POST",
    headers: integrationHeaders(config),
    signal: AbortSignal.timeout(Math.max(30, Number(config.timeoutSec || 180)) * 1000),
    body: JSON.stringify({
      model: config.model || "gpt-4.1-mini",
      messages: [
        { role: "system", content: "You are an expert HTML presentation designer. Return only valid standalone HTML." },
        { role: "user", content: prompt },
      ],
      temperature: 0.2,
      max_tokens: Number(config.maxTokens || 20000),
    }),
  });
  const data = await readApiResponse(response);
  if (!response.ok) throw new Error(data.message || data.error?.message || `API HTTP ${response.status}`);
  return extractHtml(extractTextFromApiData(data));
}

async function callWorkflowApi(slides, config, style) {
  const endpoint = String(config.endpoint || "").trim();
  const prompt = deckPrompt(slides, style);
  const isDify = config.workflowPayload === "dify" || /\/v1\/workflows\/run|\/workflows\/run/i.test(endpoint);
  const body = isDify
    ? {
        inputs: {
          style,
          prompt,
          slides: slides.map((slide) => ({ page: slide.page, title: slide.title, body: slide.body.slice(0, 20), imageCount: slide.images.length, hasImages: slide.images.length > 0 })),
        },
        response_mode: "blocking",
        user: "ppt-html-studio",
      }
    : {
        style,
        prompt,
        slides: slides.map((slide) => ({ page: slide.page, title: slide.title, body: slide.body.slice(0, 20), imageCount: slide.images.length, hasImages: slide.images.length > 0 })),
      };
  const response = await fetch(endpoint, {
    method: "POST",
    headers: integrationHeaders(config),
    signal: AbortSignal.timeout(Math.max(30, Number(config.timeoutSec || 180)) * 1000),
    body: JSON.stringify(body),
  });
  const data = await readApiResponse(response);
  if (!response.ok) throw new Error(data.message || data.error?.message || `Workflow HTTP ${response.status}`);
  return extractHtml(extractTextFromApiData(data));
}

async function maybeGenerateAiHtml(slides, config, style) {
  if (!config || config.mode === LOCAL_MODE) return null;
  if (!config.apiKey) throw new Error("API key is required for AI generation.");
  if (!config.endpoint) throw new Error("API endpoint is required for AI generation.");
  let html = null;
  if (config.mode === "ai_api") html = await callAiApi(slides, config, style);
  else if (config.mode === "workflow_api") html = await callWorkflowApi(slides, config, style);
  else throw new Error(`Unsupported API mode: ${config.mode}`);
  if (!html) throw new Error("The API responded, but no complete HTML document was found. Ask the model/workflow to return only standalone HTML.");
  return html;
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
  if (/<body[\s>]/i.test(candidate)) return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>${candidate}</html>`;
  if (/<section[\s>]/i.test(candidate) || /class=["'][^"']*\bslide\b/i.test(candidate)) {
    return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>AI PPT HTML</title></head><body>${candidate}</body></html>`;
  }
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

function publicJob(job, includeInline = false) {
  if (!job) return job;
  const output = {
    ...job,
    share: job.share ? { ...job.share } : job.share,
  };
  if (!includeInline) {
    delete output.inlinePreviewHtml;
    delete output.inlineScrollHtml;
  }
  return output;
}

function normalizeSlidesPayload(rawSlides) {
  const slides = (Array.isArray(rawSlides) ? rawSlides : [])
    .map((slide, index) => {
      const title = cleanText(slide?.title || "");
      const body = (Array.isArray(slide?.body) ? slide.body : [])
        .map(cleanText)
        .filter(isUsefulText)
        .slice(0, 18);
      const images = (Array.isArray(slide?.images) ? slide.images : [])
        .filter((image) => image?.src && String(image.src).startsWith("data:image/"))
        .slice(0, 4)
        .map((image, imageIndex) => ({
          src: String(image.src),
          name: cleanText(image.name || `image-${imageIndex + 1}`),
          mime: cleanText(image.mime || "image/png"),
          size: Number(image.size || 0),
        }));
      return {
        page: Number(slide?.page || index + 1),
        title,
        body,
        images,
      };
    })
    .filter((slide) => {
      if (!slide.title && !slide.body.length && !slide.images.length) return false;
      if (/^slide\s*\d+$/i.test(slide.title) && !slide.body.length && !slide.images.length) return false;
      return true;
    });
  if (!slides.length) throw new Error("No usable slide content was extracted from this PPTX file.");
  return slides;
}

async function createJob(payload) {
  const filename = String(payload.filename || "presentation.pptx");
  if (!filename.toLowerCase().endsWith(".pptx")) {
    throw new Error("Cloudflare-only deployment supports .pptx files. Old .ppt files require the local Python backend.");
  }
  const fileBytes = decodeDataUrl(payload.fileBase64);
  const slides = await extractPptx(fileBytes);
  const extractionStats = slides.extractionStats || { embeddedImages: 0, skippedImages: 0, embeddedImageBytes: 0 };
  const style = payload.style || "teaching";
  const requestConfig = mergedIntegrationConfig(payload.integration);
  let aiStatus = { mode: requestConfig.mode || "local", used: false };
  let pagedHtml = "";
  if (requestConfig.mode && requestConfig.mode !== LOCAL_MODE) {
    try {
      pagedHtml = await maybeGenerateAiHtml(slides, requestConfig, style);
      aiStatus = { mode: requestConfig.mode, provider: requestConfig.endpoint, used: true, resultType: "html" };
    } catch (error) {
      aiStatus = { mode: requestConfig.mode, used: false, fallback: false, error: String(error.message || error) };
      throw new Error(`AI generation failed: ${aiStatus.error}`);
    }
  }
  let scrollHtml = "";
  if (pagedHtml) {
    validateAiHtmlCompleteness(pagedHtml, slides);
    pagedHtml = injectOriginalImages(pagedHtml, slides);
    pagedHtml = injectEditorRuntime(pagedHtml);
    scrollHtml = makeScrollHtml(pagedHtml);
  } else {
    pagedHtml = buildHtml(slides, style, "paged");
    scrollHtml = buildHtml(slides, style, "scroll");
  }
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
      recommendation: extractionStats.skippedImages
        ? `Ready to share. ${extractionStats.embeddedImages} images were embedded. ${extractionStats.skippedImages} oversized images were skipped to avoid Cloudflare Worker resource limits.`
        : "Ready to share. Images are embedded in the HTML and included in the ZIP package.",
      totalImages: extractionStats.embeddedImages + extractionStats.skippedImages,
      embeddedImages: extractionStats.embeddedImages,
      missingImages: extractionStats.skippedImages,
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
  while (jobList.length > 5) {
    const removed = jobList.pop();
    if (removed) jobs.delete(removed.id);
  }
  return job;
}

async function createJobFromSlides(payload) {
  const filename = String(payload.filename || "presentation.pptx");
  const slides = normalizeSlidesPayload(payload.slides);
  const extractionStats = {
    embeddedImages: Number(payload.stats?.embeddedImages || 0),
    embeddedImageBytes: Number(payload.stats?.embeddedImageBytes || 0),
    skippedImages: Number(payload.stats?.skippedImages || 0),
    skippedBlankSlides: Number(payload.stats?.skippedBlankSlides || 0),
  };
  const style = payload.style || "teaching";
  const requestConfig = mergedIntegrationConfig(payload.integration);
  let aiStatus = { mode: requestConfig.mode || "local", used: false, browserExtracted: true };
  let pagedHtml = "";
  if (requestConfig.mode && requestConfig.mode !== LOCAL_MODE) {
    try {
      pagedHtml = await maybeGenerateAiHtml(slides, requestConfig, style);
      aiStatus = { mode: requestConfig.mode, provider: requestConfig.endpoint, used: true, resultType: "html", browserExtracted: true };
    } catch (error) {
      aiStatus = { mode: requestConfig.mode, used: false, fallback: false, browserExtracted: true, error: String(error.message || error) };
      throw new Error(`AI generation failed: ${aiStatus.error}`);
    }
  }
  let scrollHtml = "";
  if (pagedHtml) {
    validateAiHtmlCompleteness(pagedHtml, slides);
    pagedHtml = injectOriginalImages(pagedHtml, slides);
    pagedHtml = injectEditorRuntime(pagedHtml);
    scrollHtml = makeScrollHtml(pagedHtml);
  } else {
    pagedHtml = buildHtml(slides, style, "paged");
    scrollHtml = buildHtml(slides, style, "scroll");
  }
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
      recommendation: extractionStats.skippedImages
        ? `Ready to share. ${extractionStats.embeddedImages} images were embedded. ${extractionStats.skippedImages} oversized images were skipped while avoiding Cloudflare file-processing limits.`
        : "Ready to share. The PPT was extracted in the browser to avoid Cloudflare file-processing limits.",
      totalImages: extractionStats.embeddedImages + extractionStats.skippedImages,
      embeddedImages: extractionStats.embeddedImages,
      missingImages: extractionStats.skippedImages,
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
  while (jobList.length > 5) {
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

async function handleGenerateFromSlides(request) {
  const payload = await readJson(request);
  const job = await createJobFromSlides(payload);
  return json({ job });
}

async function saveEdited(request, id) {
  const job = jobs.get(id);
  if (!job) return json({ error: "job_not_found", message: "This Cloudflare Worker instance no longer has the job. Regenerate the PPT and download immediately." }, 404);
  const payload = await readJson(request);
  if (payload.pagedHtml) job.inlinePreviewHtml = String(payload.pagedHtml);
  if (payload.scrollHtml) job.inlineScrollHtml = String(payload.scrollHtml);
  job.updatedAt = new Date().toISOString();
  return json({ job: publicJob(job), share: job.share });
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
      maxUploadMb: Math.round(CLOUDFLARE_MAX_RAW_UPLOAD_BYTES / 1024 / 1024),
      maxRawUploadMb: Math.round(CLOUDFLARE_MAX_RAW_UPLOAD_BYTES / 1024 / 1024),
      maxRawUploadBytes: CLOUDFLARE_MAX_RAW_UPLOAD_BYTES,
      maxPayloadBytes: CLOUDFLARE_MAX_PAYLOAD_BYTES,
      message: "Cloudflare-only backend ready. No Vercel or Python backend is used.",
    });
  }
  if (request.method === "GET" && path === "/api/help/api-guide") return json({ markdown: DEFAULT_API_GUIDE });
  if (request.method === "GET" && path === "/api/jobs") return json({ jobs: jobList.map((job) => publicJob(job)) });
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
  if (request.method === "POST" && path === "/api/generate-ai-from-slides") return handleGenerateFromSlides(request);
  const saveMatch = path.match(/^\/api\/jobs\/([^/]+)\/save-edited$/);
  if (request.method === "POST" && saveMatch) return saveEdited(request, saveMatch[1]);
  const shareMatch = path.match(/^\/api\/jobs\/([^/]+)\/share$/);
  if (request.method === "GET" && shareMatch) {
    const job = jobs.get(shareMatch[1]);
    if (!job) return json({ error: "job_not_found" }, 404);
    return json({ job: publicJob(job), share: job.share });
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
