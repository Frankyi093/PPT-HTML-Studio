const AI_GENERATE_UI_REVISION = "edit-workbench-20260719";
const API_SECRET_STORAGE_KEY = "ppt-html-studio-api-secret-v2";
const THEME_STORAGE_KEY = "ppt-html-studio-theme";
const PREVIEW_DESKTOP_WIDTH = 1280;
const PREVIEW_DESKTOP_HEIGHT = 720;

const styles = [
  ["teaching", "Teaching Blue"],
  ["academic", "Academic Style"],
  ["swiss", "Swiss Grid"],
  ["softlesson", "Soft Lesson"],
  ["clean", "Clean"],
  ["instructional", "Instructional"],
  ["minimal", "Minimal"],
  ["contrast", "High Contrast"],
  ["healing", "Healing Hand-drawn"],
  ["doodle", "Doodle Sketch"],
  ["editorial", "Editorial"],
  ["vivid", "Vivid"],
];

const apiProviders = {
  deepseek: {
    mode: "ai_api",
    endpoint: "https://api.deepseek.com/v1",
    model: "deepseek-chat",
    apiKeyHeader: "Authorization",
    apiKeyPrefix: "Bearer ",
    customHeaders: "",
    workflowPayload: "flat",
    timeoutSec: 300,
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
  },
  openai: {
    mode: "ai_api",
    endpoint: "https://api.openai.com/v1",
    model: "gpt-4.1-mini",
    apiKeyHeader: "Authorization",
    apiKeyPrefix: "Bearer ",
    customHeaders: "",
    workflowPayload: "flat",
    timeoutSec: 300,
  },
  custom_ai: {
    mode: "ai_api",
    endpoint: "",
    model: "gpt-4.1-mini",
    apiKeyHeader: "Authorization",
    apiKeyPrefix: "Bearer ",
    customHeaders: "",
    workflowPayload: "flat",
    timeoutSec: 300,
  },
  workflow: {
    mode: "workflow_api",
    endpoint: "",
    model: "",
    apiKeyHeader: "Authorization",
    apiKeyPrefix: "Bearer ",
    customHeaders: "",
    workflowPayload: "flat",
    timeoutSec: 300,
  },
  dify: {
    mode: "workflow_api",
    endpoint: "",
    model: "",
    apiKeyHeader: "Authorization",
    apiKeyPrefix: "Bearer ",
    customHeaders: "",
    workflowPayload: "dify",
    timeoutSec: 300,
  },
};

const state = {
  integration: {
    mode: "ai_api",
    endpoint: "",
    apiKeyHeader: "Authorization",
    apiKeyPrefix: "Bearer ",
    customHeaders: "",
    workflowPayload: "flat",
    model: "gpt-4.1-mini",
    timeoutSec: 300,
    hasApiKey: false,
    apiKeyMasked: "",
  },
  provider: "openai",
  plan: null,
  job: null,
  objectUrls: [],
  busy: false,
  editing: false,
  theme: localStorage.getItem(THEME_STORAGE_KEY) === "dark" ? "dark" : "light",
  chat: {
    messages: [],
    busy: false,
  },
};

const el = (id) => document.getElementById(id);

function setStatus(message, kind = "") {
  const node = el("statusLine");
  node.textContent = message || "";
  node.className = `status-line ${kind}`;
}

function setChatStatus(message, kind = "") {
  const node = el("chatStatus");
  if (!node) return;
  node.textContent = message || "";
  node.className = kind || "";
}

function updateChatSendState() {
  const button = el("sendChatEdit");
  if (button) button.disabled = state.busy || state.chat.busy || !state.job;
}

function setBusy(value, message = "") {
  state.busy = Boolean(value);
  ["planButton", "generateButton", "saveApi"].forEach((id) => {
    const node = el(id);
    if (node) node.disabled = state.busy || (id === "generateButton" && !state.plan);
  });
  updateChatSendState();
  el("generationOverlay").classList.toggle("hidden", !value);
  if (message) el("generationMessage").textContent = message;
}

function safeJsonParse(text, fallback = null) {
  try {
    return JSON.parse(text);
  } catch {
    return fallback;
  }
}

function readLocalApiSecret() {
  return safeJsonParse(localStorage.getItem(API_SECRET_STORAGE_KEY), {}) || {};
}

function writeLocalApiSecret(secret) {
  localStorage.setItem(API_SECRET_STORAGE_KEY, JSON.stringify(secret || {}));
}

function maskedKey(value) {
  return value ? `${value.slice(0, 4)}...${value.slice(-4)}` : "";
}

function inferApiProvider(integration) {
  const mode = integration.mode || "ai_api";
  const endpoint = String(integration.endpoint || "").toLowerCase();
  if (mode === "workflow_api" && integration.workflowPayload === "dify") return "dify";
  if (mode === "workflow_api") return "workflow";
  if (endpoint.includes("api.deepseek.com")) return "deepseek";
  if (endpoint.includes("ark.cn-beijing.volces.com") || endpoint.includes("volces.com/api/v3")) return "doubao_seed";
  if (endpoint.includes("api.openai.com")) return "openai";
  return "custom_ai";
}

function savedKeyForProvider() {
  const shared = window.PptAiConfig?.loadAiConfig?.();
  if (shared?.apiKey) return shared.apiKey;
  const secret = readLocalApiSecret();
  return secret[state.provider] || secret[state.integration.endpoint || ""] || "";
}

function collectIntegration() {
  const shared = window.PptAiConfig?.loadAiConfig?.();
  if (shared) return { ...shared, fallbackToLocal: false, timeoutSec: Math.max(300, Number(shared.timeoutSec || 300)) };
  return { ...state.integration, apiKey: savedKeyForProvider(), fallbackToLocal: false };
}

function applyProvider(provider, overwrite = true) {
  const preset = window.PptAiConfig?.PROVIDERS?.[provider] || apiProviders[provider] || apiProviders.openai;
  state.provider = provider;
  const note = el("apiNote");
  if (!note) return;
  const config = window.PptAiConfig?.loadAiConfig?.() || state.integration;
  note.textContent = window.PptAiConfig?.hasValidAiConfig?.(config)
    ? `AI configured: ${window.PptAiConfig.getAiConfigSummary(config)}`
    : "AI not configured. Open AI Settings and save a provider, model, and key first.";
  note.className = `api-note ${window.PptAiConfig?.hasValidAiConfig?.(config) ? "ok" : "error"}`;
}

async function loadIntegration() {
  const config = await window.PptAiConfig.loadRemoteAiConfig();
  state.integration = { ...state.integration, ...config };
  state.provider = window.PptAiConfig.providerFromConfig(config);
  applyProvider(state.provider, false);
}

async function saveIntegration() {
  const integration = collectIntegration();
  if (!window.PptAiConfig.hasValidAiConfig(integration)) {
    applyProvider(state.provider, false);
    throw new Error("Please configure AI in AI Settings first.");
  }
  try {
    await window.PptAiConfig.syncAiConfig(integration);
  } catch {
    // Requests include the shared config, so generation can continue if backend sync is unavailable.
  }
  state.integration = { ...state.integration, ...integration };
  applyProvider(window.PptAiConfig.providerFromConfig(integration), false);
  return integration;
}

function currentTopicPayload() {
  return {
    topic: el("topic").value.trim(),
    audience: el("audience").value.trim(),
    slideCount: Number(el("slideCount").value || 8),
    outputLanguage: el("outputLanguage").value,
    requirements: el("requirements").value.trim(),
    style: el("styleSelect").value,
    integration: collectIntegration(),
  };
}

async function readJsonResponse(response) {
  const text = await response.text();
  const data = safeJsonParse(text, null);
  if (data) return data;
  const plain = text.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  return {
    error: response.ok ? "invalid_json" : "request_failed",
    message: plain
      ? plain.slice(0, 220)
      : `Request failed with HTTP ${response.status}. Please check the Cloudflare deployment and API settings.`,
  };
}

function listToLines(items, prefix = "- ") {
  return (Array.isArray(items) ? items : [])
    .filter(Boolean)
    .map((item) => `${prefix}${String(item).trim()}`)
    .join("\n");
}

function paletteToText(palette = {}) {
  const fields = ["background", "text", "primary", "accent", "panel"];
  const parts = fields
    .map((key) => palette?.[key] ? `${key}: ${palette[key]}` : "")
    .filter(Boolean);
  return parts.length ? parts.join("; ") : "background: #ffffff; text: #172554; primary: #3b82f6; accent: #5fd4ff; panel: #f8fbff";
}

function typographyToText(typography = {}) {
  const title = typography?.title || "large, centered, readable title font";
  const body = typography?.body || "clean sans-serif body font";
  return `title: ${title}; body: ${body}`;
}

function planToEditableText(plan) {
  if (!plan) return "";
  const slides = Array.isArray(plan.slides) ? plan.slides : [];
  return [
    `Deck title: ${plan.title || ""}`,
    `Subtitle: ${plan.subtitle || ""}`,
    `Audience: ${plan.audience || ""}`,
    `Goal: ${plan.goal || ""}`,
    `Tone: ${plan.tone || ""}`,
    `Palette: ${paletteToText(plan.palette)}`,
    `Typography: ${typographyToText(plan.typography)}`,
    "",
    "Layout rules:",
    listToLines(plan.layoutRules?.length ? plan.layoutRules : [
      "Keep every slide in a fixed 16:9 canvas.",
      "Use large readable titles and balanced safe margins.",
      "Avoid text, images, and controls overflowing the page.",
    ]),
    "",
    "Slides:",
    slides.map((slide, index) => [
      `${index + 1}. ${slide.title || `Slide ${index + 1}`}`,
      `Layout: ${slide.layout || "balanced"}`,
      `Visual focus: ${slide.visualFocus || ""}`,
      "Body:",
      listToLines(slide.body || []),
      slide.speakerNote ? `Speaker note: ${slide.speakerNote}` : "Speaker note:",
    ].join("\n")).join("\n\n"),
  ].join("\n");
}

function parseKeyValueLine(line, key) {
  const match = String(line || "").match(new RegExp(`^${key}\\s*:\\s*(.*)$`, "i"));
  return match ? match[1].trim() : "";
}

function parseInlinePairs(text) {
  const result = {};
  String(text || "").split(";").forEach((part) => {
    const match = part.match(/^\s*([^:]+)\s*:\s*(.+?)\s*$/);
    if (match) result[match[1].trim()] = match[2].trim();
  });
  return result;
}

function editableTextToPlan(text, fallbackPlan = null) {
  const fallback = fallbackPlan || {};
  const lines = String(text || "").split(/\r?\n/);
  const plan = {
    title: fallback.title || "",
    subtitle: fallback.subtitle || "",
    audience: fallback.audience || "",
    goal: fallback.goal || "",
    tone: fallback.tone || "clear, modern, educational",
    palette: { ...(fallback.palette || {}) },
    typography: { ...(fallback.typography || {}) },
    layoutRules: [],
    slides: [],
  };
  let mode = "";
  let currentSlide = null;
  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;
    const lower = line.toLowerCase();
    if (lower === "layout rules:") {
      mode = "rules";
      continue;
    }
    if (lower === "slides:") {
      mode = "slides";
      continue;
    }
    const deckTitle = parseKeyValueLine(line, "Deck title");
    if (deckTitle) { plan.title = deckTitle; continue; }
    const subtitle = parseKeyValueLine(line, "Subtitle");
    if (subtitle || /^subtitle\s*:/i.test(line)) { plan.subtitle = subtitle; continue; }
    const audience = parseKeyValueLine(line, "Audience");
    if (audience) { plan.audience = audience; continue; }
    const goal = parseKeyValueLine(line, "Goal");
    if (goal) { plan.goal = goal; continue; }
    const tone = parseKeyValueLine(line, "Tone");
    if (tone) { plan.tone = tone; continue; }
    const palette = parseKeyValueLine(line, "Palette");
    if (palette) { plan.palette = { ...plan.palette, ...parseInlinePairs(palette) }; continue; }
    const typography = parseKeyValueLine(line, "Typography");
    if (typography) { plan.typography = { ...plan.typography, ...parseInlinePairs(typography) }; continue; }
    const slideMatch = line.match(/^(\d+)[.)]\s+(.+)$/);
    if (mode === "slides" && slideMatch) {
      currentSlide = {
        page: plan.slides.length + 1,
        title: slideMatch[2].trim(),
        layout: "balanced",
        visualFocus: "",
        body: [],
        speakerNote: "",
        images: [],
      };
      plan.slides.push(currentSlide);
      continue;
    }
    if (mode === "rules" && /^[-*]\s+/.test(line)) {
      plan.layoutRules.push(line.replace(/^[-*]\s+/, "").trim());
      continue;
    }
    if (mode === "slides" && currentSlide) {
      const layout = parseKeyValueLine(line, "Layout");
      if (layout) { currentSlide.layout = layout; continue; }
      const visualFocus = parseKeyValueLine(line, "Visual focus");
      if (visualFocus || /^visual focus\s*:/i.test(line)) { currentSlide.visualFocus = visualFocus; continue; }
      const speakerNote = parseKeyValueLine(line, "Speaker note");
      if (speakerNote || /^speaker note\s*:/i.test(line)) { currentSlide.speakerNote = speakerNote; continue; }
      if (/^body\s*:/i.test(line)) continue;
      if (/^[-*]\s+/.test(line)) {
        currentSlide.body.push(line.replace(/^[-*]\s+/, "").trim());
      }
    }
  }
  if (!plan.layoutRules.length) plan.layoutRules = [...(fallback.layoutRules || [])];
  if (!plan.slides.length) plan.slides = Array.isArray(fallback.slides) ? fallback.slides : [];
  plan.slides = plan.slides.map((slide, index) => ({
    ...slide,
    page: index + 1,
    title: slide.title || `Key Idea ${index + 1}`,
    body: Array.isArray(slide.body) ? slide.body.filter(Boolean) : [],
  }));
  return plan;
}

function renderPlan(plan) {
  state.plan = plan;
  el("planText").value = planToEditableText(plan);
  el("generateButton").disabled = false;
}

async function generatePlan(event) {
  event.preventDefault();
  if (!el("topic").value.trim()) {
    setStatus("Please enter a topic first.", "error");
    return;
  }
  const payload = currentTopicPayload();
  if (!payload.integration.endpoint) {
    setStatus("Please choose an AI service or enter an OpenAI-compatible endpoint first.", "error");
    return;
  }
  if (!payload.integration.apiKey) {
    setStatus("Please paste and save your AI API key first. The key will be reused on this browser.", "error");
    return;
  }
  try {
    await saveIntegration();
    setBusy(true, "AI is planning outline, palette, typography and layout rules...");
    setStatus("Generating AI plan...");
    const response = await fetch("/api/ai-topic-plan", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await readJsonResponse(response);
    if (!response.ok) throw new Error(data.message || data.error || "AI planning failed.");
    renderPlan(data.plan);
    setStatus("Plan ready. Edit the readable outline, then generate HTML.", "ok");
  } catch (error) {
    setStatus(error.message || "AI planning failed.", "error");
  } finally {
    setBusy(false);
  }
}

function createInlineHtmlUrl(html) {
  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  state.objectUrls.push(url);
  return url;
}

function syncPreviewScale() {
  const frame = el("previewFrame");
  const shell = frame?.closest(".preview-frame");
  if (!frame || !shell) return;
  const rect = shell.getBoundingClientRect();
  if (!rect.width || !rect.height) return;
  const scale = Math.min(rect.width / PREVIEW_DESKTOP_WIDTH, rect.height / PREVIEW_DESKTOP_HEIGHT, 1);
  shell.style.setProperty("--preview-scale", String(Math.max(0.18, scale)));
}

function triggerBlobDownload(blob, filename) {
  const url = URL.createObjectURL(blob);
  state.objectUrls.push(url);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.rel = "noopener";
  document.body.appendChild(link);
  link.click();
  link.remove();
}

function refreshJobHtmlUrls(pagedHtml, scrollHtml, reloadPreview = false) {
  if (!state.job) return;
  state.job.inlinePreviewHtmlCache = pagedHtml;
  state.job.inlineScrollHtmlCache = scrollHtml;
  state.job.previewUrl = createInlineHtmlUrl(pagedHtml);
  state.job.scrollUrl = createInlineHtmlUrl(scrollHtml);
  if (reloadPreview) {
    el("previewFrame").src = state.job.previewUrl;
    el("previewEmpty").classList.add("hidden");
  }
}

function hydrateJob(job) {
  const output = { ...job };
  if (output.inlinePreviewHtml) {
    output.inlinePreviewHtmlCache = output.inlinePreviewHtml;
    output.previewUrl = createInlineHtmlUrl(output.inlinePreviewHtml);
    delete output.inlinePreviewHtml;
  }
  if (output.inlineScrollHtml) {
    output.inlineScrollHtmlCache = output.inlineScrollHtml;
    output.scrollUrl = createInlineHtmlUrl(output.inlineScrollHtml);
    delete output.inlineScrollHtml;
  }
  return output;
}

function renderJob(job) {
  state.job = hydrateJob(job);
  state.editing = false;
  platformEditorSelected = null;
  document.querySelector(".topic-preview")?.classList.remove("editor-active");
  el("previewFrame").src = state.job.previewUrl;
  el("previewEmpty").classList.add("hidden");
  ["openPreviewHtml", "editHtml", "saveEditedHtml", "openScrollHtml", "downloadZip"].forEach((id) => {
    el(id).disabled = false;
  });
  el("editHtml").textContent = "Edit HTML";
  requestAnimationFrame(syncPreviewScale);
  updateChatSendState();
  setChatStatus("Ready. Choose a scope and describe an edit.", "ok");
}

async function generateHtml() {
  const plan = editableTextToPlan(el("planText").value, state.plan);
  if (!plan?.slides?.length) {
    setStatus("The plan has no usable slides. Generate or edit the outline first.", "error");
    return;
  }
  state.plan = plan;
  try {
    await saveIntegration();
    setBusy(true, "AI is generating the editable 16:9 HTML deck...");
    setStatus("Generating HTML deck...");
    const response = await fetch("/api/generate-from-topic", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ ...currentTopicPayload(), plan }),
    });
    const data = await readJsonResponse(response);
    if (!response.ok) throw new Error(data.message || data.error || "AI HTML generation failed.");
    renderJob(data.job);
    setStatus("HTML generated. You can preview, edit, save and download ZIP.", "ok");
  } catch (error) {
    setStatus(error.message || "AI HTML generation failed.", "error");
  } finally {
    setBusy(false);
  }
}

function previewWindow() {
  return el("previewFrame").contentWindow;
}

function previewDocument() {
  try {
    return el("previewFrame").contentDocument;
  } catch {
    return null;
  }
}

let platformEditorSelected = null;

function activePreviewSlide(doc = previewDocument()) {
  if (!doc) return null;
  const slides = [...doc.querySelectorAll(".ppt-runtime-slide,.slide,section[data-slide-page],.ai-slide,[data-slide-page]")]
    .filter((node) => !node.closest(".editor-toolbar,.ppt-runtime-nav,.nav,.runtime-controls,.ppt-ve-sidebar,.ppt-ve-inspector"));
  return slides.find((node) => node.classList.contains("ppt-active-slide") || node.classList.contains("active") || getComputedStyle(node).display !== "none") || slides[0] || doc.body;
}

function platformEditorCandidate(target) {
  return target?.closest?.(".media-box,.editable-image-box,figure,.free-textbox,.editable-text,.point-card,h1,h2,h3,h4,p,li,td,th,[contenteditable=true]");
}

function setPlatformEditorSelected(target) {
  const doc = previewDocument();
  doc?.querySelectorAll(".ppt-platform-selected").forEach((node) => node.classList.remove("ppt-platform-selected"));
  platformEditorSelected = target && !target.closest?.(".editor-toolbar,.ppt-ve-sidebar,.ppt-ve-inspector,.ppt-runtime-nav") ? target : null;
  if (platformEditorSelected) platformEditorSelected.classList.add("ppt-platform-selected");
  updatePlatformEditorInspector();
}

function ensurePlatformEditorDock() {
  const panel = document.querySelector(".topic-preview");
  if (!panel || panel.querySelector(".platform-editor-dock")) return;
  const dock = document.createElement("div");
  dock.className = "platform-editor-dock";
  dock.innerHTML = `
    <div class="platform-editor-toolbar">
      <span class="platform-editor-meta">Edit tools</span>
      <select data-platform-font>
        <option value="Arial, sans-serif">Arial</option>
        <option value="Inter, Arial, sans-serif">Inter</option>
        <option value="Georgia, serif">Georgia</option>
        <option value="Times New Roman, serif">Times</option>
        <option value="Verdana, sans-serif">Verdana</option>
        <option value="Microsoft YaHei, sans-serif">Microsoft YaHei</option>
        <option value="Segoe Print, Comic Sans MS, cursive">Hand</option>
      </select>
      <input data-platform-size type="number" min="8" max="160" value="30" title="Font size">
      <input data-platform-color type="color" value="#172554" title="Text color">
      <button type="button" data-platform-align="left">Left</button>
      <button type="button" data-platform-align="center">Center</button>
      <button type="button" data-platform-align="right">Right</button>
      <button type="button" data-platform-bold>B</button>
      <button type="button" data-platform-italic>I</button>
      <button type="button" data-platform-underline>U</button>
      <button type="button" data-platform-text>Text</button>
      <button type="button" data-platform-image>Image</button>
      <input data-platform-image-file type="file" accept="image/*" hidden>
    </div>
    <div class="platform-editor-inspector">
      <span class="platform-editor-meta" data-platform-selected>No element selected</span>
      <input data-platform-x type="number" title="X">
      <input data-platform-y type="number" title="Y">
      <input data-platform-w type="number" title="Width">
      <input data-platform-h type="number" title="Height">
      <button type="button" data-platform-front>Front</button>
      <button type="button" data-platform-back>Back</button>
      <button type="button" data-platform-delete>Delete</button>
    </div>`;
  panel.querySelector(".preview-frame")?.before(dock);
  dock.querySelector("[data-platform-font]").addEventListener("change", (event) => applyPlatformStyle("fontFamily", event.target.value));
  dock.querySelector("[data-platform-size]").addEventListener("change", (event) => applyPlatformStyle("fontSize", `${event.target.value}px`));
  dock.querySelector("[data-platform-color]").addEventListener("input", (event) => applyPlatformStyle("color", event.target.value));
  dock.querySelectorAll("[data-platform-align]").forEach((button) => button.addEventListener("click", () => applyPlatformStyle("textAlign", button.dataset.platformAlign)));
  dock.querySelector("[data-platform-bold]").addEventListener("click", () => applyPlatformStyle("fontWeight", "800"));
  dock.querySelector("[data-platform-italic]").addEventListener("click", () => applyPlatformStyle("fontStyle", "italic"));
  dock.querySelector("[data-platform-underline]").addEventListener("click", () => applyPlatformStyle("textDecoration", "underline"));
  dock.querySelector("[data-platform-text]").addEventListener("click", addPlatformTextBox);
  dock.querySelector("[data-platform-image]").addEventListener("click", () => dock.querySelector("[data-platform-image-file]").click());
  dock.querySelector("[data-platform-image-file]").addEventListener("change", addPlatformImage);
  dock.querySelector("[data-platform-front]").addEventListener("click", () => layerPlatformSelected(1));
  dock.querySelector("[data-platform-back]").addEventListener("click", () => layerPlatformSelected(-1));
  dock.querySelector("[data-platform-delete]").addEventListener("click", deletePlatformSelected);
  ["x", "y", "w", "h"].forEach((key) => dock.querySelector(`[data-platform-${key}]`).addEventListener("change", (event) => applyPlatformGeometry(key, event.target.value)));
}

function installPlatformEditorSurface() {
  const doc = previewDocument();
  if (!doc?.body) return;
  ensurePlatformEditorDock();
  if (!doc.getElementById("ppt-platform-editor-style")) {
    const style = doc.createElement("style");
    style.id = "ppt-platform-editor-style";
    style.textContent = `body.editing .editor-toolbar,body.editing .ppt-ve-sidebar,body.editing .ppt-ve-inspector,body.editing .ppt-ve-ruler-top,body.editing .ppt-ve-ruler-left{display:none!important}.ppt-platform-selected{outline:2px solid #5b7eff!important;outline-offset:4px!important}`;
    doc.head.appendChild(style);
  }
  if (!doc.body.dataset.platformEditorBound) {
    doc.body.dataset.platformEditorBound = "1";
    doc.addEventListener("click", (event) => {
      if (!doc.body.classList.contains("editing")) return;
      setPlatformEditorSelected(platformEditorCandidate(event.target));
    }, true);
  }
}

function platformTextTarget() {
  const target = platformEditorSelected || previewDocument()?.activeElement;
  if (!target || target === previewDocument()?.body) return null;
  return target.matches?.(".media-box,.editable-image-box,figure,img") ? null : target;
}

function applyPlatformStyle(prop, value) {
  const target = platformTextTarget();
  if (!target) return;
  target.style[prop] = value;
  updatePlatformEditorInspector();
}

function slideRelativeRect(target) {
  const slide = activePreviewSlide();
  if (!target || !slide) return null;
  const rect = target.getBoundingClientRect();
  const slideRect = slide.getBoundingClientRect();
  return { rect, slideRect, x: rect.left - slideRect.left, y: rect.top - slideRect.top };
}

function updatePlatformEditorInspector() {
  const dock = document.querySelector(".topic-preview .platform-editor-dock");
  if (!dock) return;
  const target = platformEditorSelected;
  dock.querySelector("[data-platform-selected]").textContent = target ? (target.dataset.pptId || target.tagName.toLowerCase()) : "No element selected";
  dock.querySelectorAll(".platform-editor-inspector input,.platform-editor-inspector button").forEach((node) => node.disabled = !target);
  if (!target) return;
  const rel = slideRelativeRect(target);
  const style = getComputedStyle(target);
  if (rel) {
    dock.querySelector("[data-platform-x]").value = Math.round(rel.x);
    dock.querySelector("[data-platform-y]").value = Math.round(rel.y);
    dock.querySelector("[data-platform-w]").value = Math.round(rel.rect.width);
    dock.querySelector("[data-platform-h]").value = Math.round(rel.rect.height);
  }
  dock.querySelector("[data-platform-size]").value = Math.round(parseFloat(style.fontSize) || 30);
}

function applyPlatformGeometry(key, value) {
  const target = platformEditorSelected;
  const slide = activePreviewSlide();
  if (!target || !slide) return;
  const prop = { x: "left", y: "top", w: "width", h: "height" }[key];
  if (!prop) return;
  if (getComputedStyle(target).position === "static") {
    const rel = slideRelativeRect(target);
    target.style.position = "absolute";
    if (rel) {
      target.style.left = `${Math.max(0, rel.x)}px`;
      target.style.top = `${Math.max(0, rel.y)}px`;
    }
  }
  target.style[prop] = `${Math.max(0, Number(value) || 0)}px`;
  updatePlatformEditorInspector();
}

function layerPlatformSelected(delta) {
  if (!platformEditorSelected) return;
  const z = parseInt(getComputedStyle(platformEditorSelected).zIndex, 10);
  platformEditorSelected.style.zIndex = String((Number.isFinite(z) ? z : 1) + delta);
  updatePlatformEditorInspector();
}

function deletePlatformSelected() {
  if (!platformEditorSelected) return;
  platformEditorSelected.remove();
  platformEditorSelected = null;
  updatePlatformEditorInspector();
}

function addPlatformTextBox() {
  const doc = previewDocument();
  const slide = activePreviewSlide(doc);
  if (!doc || !slide) return;
  const box = doc.createElement("div");
  box.className = "free-textbox editable-text";
  box.textContent = "New text";
  box.contentEditable = "true";
  Object.assign(box.style, { position: "absolute", left: "96px", top: "110px", width: "360px", minHeight: "58px", fontSize: "32px", color: "#172554", zIndex: "60" });
  slide.appendChild(box);
  setPlatformEditorSelected(box);
  box.focus();
}

function addPlatformImage(event) {
  const file = event.target.files?.[0];
  const doc = previewDocument();
  const slide = activePreviewSlide(doc);
  if (!file || !doc || !slide) return;
  const reader = new FileReader();
  reader.onload = () => {
    const box = doc.createElement("figure");
    box.className = "media-box editable-image-box";
    Object.assign(box.style, { position: "absolute", left: "55%", top: "28%", width: "320px", height: "220px", zIndex: "55" });
    box.innerHTML = '<img alt="Added image" style="width:100%;height:100%;object-fit:contain;display:block">';
    box.querySelector("img").src = reader.result;
    slide.appendChild(box);
    previewWindow()?.toggleEdit?.(true);
    installPlatformEditorSurface();
    setPlatformEditorSelected(box);
  };
  reader.readAsDataURL(file);
  event.target.value = "";
}

function cleanupPlatformEditorArtifacts() {
  const doc = previewDocument();
  if (!doc) return;
  doc.querySelectorAll(".ppt-platform-selected").forEach((node) => node.classList.remove("ppt-platform-selected"));
  doc.getElementById("ppt-platform-editor-style")?.remove();
}

async function captureEditedHtml() {
  const win = previewWindow();
  if (!win?.exportEditedHtml) throw new Error("The current preview is not editable yet.");
  const wasEditing = Boolean(previewDocument()?.body?.classList.contains("editing"));
  cleanupPlatformEditorArtifacts();
  const output = {
    pagedHtml: await win.exportEditedHtml("paged"),
    scrollHtml: await win.exportEditedHtml("scroll"),
  };
  if (wasEditing) installPlatformEditorSurface();
  return output;
}

async function persistEditedHtml({ reloadPreview = false } = {}) {
  if (!state.job) return;
  const captured = await captureEditedHtml();
  refreshJobHtmlUrls(captured.pagedHtml, captured.scrollHtml, reloadPreview);
  try {
    const response = await fetch(`/api/jobs/${state.job.id}/save-edited`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(captured),
    });
    if (response.ok) return { ...captured, savedRemote: true };
  } catch {
    // Browser-side edited HTML is still kept and can be downloaded.
  }
  return { ...captured, savedRemote: false };
}

async function saveEditedHtml() {
  if (!state.job) return;
  const captured = await persistEditedHtml();
  setStatus("Edits saved. Download ZIP will include the latest HTML.", "ok");
  return captured;
}

async function downloadZip() {
  if (!state.job) return;
  try {
    const captured = await persistEditedHtml();
    if (window.JSZip) {
      const zip = new window.JSZip();
      zip.file("index.html", captured.pagedHtml);
      zip.file("index-scroll.html", captured.scrollHtml);
      zip.file("index-single-file.html", captured.pagedHtml);
      zip.file("index-scroll-single-file.html", captured.scrollHtml);
      zip.file("README-open.txt", "Open index.html for paged navigation, or index-scroll.html for continuous scrolling.\nImages are embedded in the HTML when available, so edited downloads keep the latest content.\n");
      const blob = await zip.generateAsync({ type: "blob" });
      triggerBlobDownload(blob, `${state.job.id || "ai-ppt-html"}.zip`);
      setStatus("Downloaded ZIP with the latest edited HTML.", "ok");
      return;
    }
    triggerBlobDownload(new Blob([captured.pagedHtml], { type: "text/html;charset=utf-8" }), "index.html");
    setStatus("Downloaded the latest edited HTML. ZIP runtime was unavailable.", "ok");
  } catch (error) {
    setStatus(error.message || "Could not download ZIP.", "error");
  }
}

function toggleEdit() {
  const win = previewWindow();
  if (!win?.toggleEdit) {
    setStatus("The current preview is not editable yet.", "error");
    return;
  }
  state.editing = !state.editing;
  win.toggleEdit(state.editing);
  document.querySelector(".topic-preview")?.classList.toggle("editor-active", state.editing);
  if (state.editing) installPlatformEditorSurface();
  else setPlatformEditorSelected(null);
  el("editHtml").textContent = state.editing ? "Stop Editing" : "Edit HTML";
  requestAnimationFrame(syncPreviewScale);
}

function openPreview() {
  if (!state.job?.previewUrl) return;
  window.open(state.job.previewUrl, "_blank", "noopener,noreferrer");
}

function openScroll() {
  if (!state.job?.scrollUrl) return;
  window.open(state.job.scrollUrl, "_blank", "noopener,noreferrer");
}

function renderChatMessages() {
  const box = el("chatMessages");
  if (!box) return;
  if (!state.chat.messages.length) {
    box.innerHTML = '<div class="chat-empty">No chat messages yet. Describe the edit you want, then apply the patch.</div>';
    return;
  }
  box.innerHTML = state.chat.messages
    .map((message) => `<div class="chat-message ${message.role}">${String(message.content || "").replace(/[&<>"']/g, (char) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    }[char]))}</div>`)
    .join("");
  box.scrollTop = box.scrollHeight;
}

function pushChatMessage(role, content) {
  state.chat.messages.push({ role, content });
  renderChatMessages();
}

function currentPreviewContext(scope) {
  const win = previewWindow();
  if (!win) throw new Error("Preview is not ready yet.");
  if (typeof win.getPptPatchContext === "function") {
    return win.getPptPatchContext(scope);
  }
  const doc = win.document;
  const slides = Array.from(doc.querySelectorAll(".slide, section, .ai-slide, [data-slide-page]"));
  const active = doc.querySelector(".ppt-active-slide, .slide.active") || slides[0] || doc.body;
  const selected = doc.querySelector(".selected-image") || doc.activeElement;
  return {
    scope,
    currentSlide: Math.max(1, slides.indexOf(active) + 1),
    slideCount: slides.length || 1,
    currentSlideText: active.innerText?.slice(0, 2800) || "",
    currentSlideHtml: active.outerHTML?.slice(0, 8000) || "",
    selectedText: selected && selected !== doc.body ? selected.innerText?.slice(0, 1000) || "" : "",
    selectedHtml: selected && selected !== doc.body ? selected.outerHTML?.slice(0, 2200) || "" : "",
  };
}

function patchOperationSummary(patch) {
  const operations = Array.isArray(patch?.operations) ? patch.operations : [];
  const names = operations.map((operation) => operation.type).filter(Boolean);
  if (!names.length) return patch?.summary || "Patch applied.";
  return `${patch?.summary || "Patch applied."}\nOperations: ${names.join(", ")}`;
}

async function sendChatEdit() {
  if (!state.job) {
    setChatStatus("Generate HTML first, then use Chat Edit.", "error");
    return;
  }
  const instruction = el("chatInput").value.trim();
  if (!instruction) {
    setChatStatus("Please describe what to change.", "error");
    return;
  }
  const scope = el("chatScope").value;
  let context;
  try {
    context = currentPreviewContext(scope);
  } catch (error) {
    setChatStatus(error.message || "Could not read preview context.", "error");
    return;
  }
  try {
    state.chat.busy = true;
    updateChatSendState();
    setChatStatus("Asking AI for a patch...");
    pushChatMessage("user", instruction);
    el("chatInput").value = "";
    const integration = await saveIntegration();
    const response = await fetch("/api/chat-edit-patch", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        instruction,
        scope,
        style: el("styleSelect").value,
        plan: editableTextToPlan(el("planText").value, state.plan),
        context,
        integration,
      }),
    });
    const data = await readJsonResponse(response);
    if (!response.ok) throw new Error(data.message || data.error || "Chat Edit failed.");
    const patch = data.patch || data;
    const win = previewWindow();
    if (!win?.applyPptPatch) throw new Error("The preview runtime cannot apply patches yet.");
    const result = win.applyPptPatch(patch);
    pushChatMessage("assistant", patchOperationSummary(patch));
    setChatStatus(`Applied ${result?.applied ?? patch.operations?.length ?? 0} patch operation(s).`, "ok");
    await saveEditedHtml().catch(() => {});
  } catch (error) {
    pushChatMessage("assistant", `Could not apply the edit: ${error.message || error}`);
    setChatStatus(error.message || "Chat Edit failed.", "error");
  } finally {
    state.chat.busy = false;
    updateChatSendState();
  }
}

function applyTheme(theme) {
  state.theme = theme === "dark" ? "dark" : "light";
  document.documentElement.dataset.theme = state.theme;
  localStorage.setItem(THEME_STORAGE_KEY, state.theme);
  el("themeToggle").textContent = state.theme === "dark" ? "Light mode" : "Dark mode";
}

function initStyles() {
  el("styleSelect").innerHTML = styles
    .map(([value, label]) => `<option value="${value}">${label}</option>`)
    .join("");
}

function loadSample() {
  el("topic").value = "Human-computer interaction usability testing workshop";
  el("audience").value = "Undergraduate students";
  el("slideCount").value = "8";
  el("styleSelect").value = "teaching";
  el("requirements").value = "Create a concise classroom deck. Include consent, task design, observation, metrics, analysis, and a final discussion slide. Keep the tone modern, clean, and readable.";
}

function init() {
  initStyles();
  applyTheme(state.theme);
  loadIntegration();
  el("topicForm").addEventListener("submit", generatePlan);
  el("generateButton").addEventListener("click", generateHtml);
  el("saveApi")?.addEventListener("click", () => saveIntegration().catch((error) => setStatus(error.message, "error")));
  el("apiProvider")?.addEventListener("change", (event) => applyProvider(event.target.value, true));
  el("formatPlan").addEventListener("click", () => {
    if (!state.plan) {
      setStatus("Generate a plan first.", "error");
      return;
    }
    const plan = editableTextToPlan(el("planText").value, state.plan);
    renderPlan(plan);
    setStatus("Readable plan refreshed.", "ok");
  });
  el("editHtml").addEventListener("click", toggleEdit);
  el("saveEditedHtml").addEventListener("click", () => saveEditedHtml().catch((error) => setStatus(error.message, "error")));
  el("downloadZip").addEventListener("click", downloadZip);
  el("openPreviewHtml").addEventListener("click", openPreview);
  el("openScrollHtml").addEventListener("click", openScroll);
  el("previewFrame").addEventListener("load", () => {
    requestAnimationFrame(syncPreviewScale);
    setTimeout(syncPreviewScale, 80);
  });
  window.addEventListener("resize", syncPreviewScale);
  if (window.ResizeObserver) {
    const shell = el("previewFrame").closest(".preview-frame");
    if (shell) new ResizeObserver(syncPreviewScale).observe(shell);
  }
  el("sendChatEdit").addEventListener("click", sendChatEdit);
  el("chatScope").addEventListener("change", (event) => setChatStatus(`${event.target.options[event.target.selectedIndex].text} mode`));
  el("chatInput").addEventListener("keydown", (event) => {
    if ((event.ctrlKey || event.metaKey) && event.key === "Enter") sendChatEdit();
  });
  document.querySelectorAll("[data-chat-prompt]").forEach((button) => {
    button.addEventListener("click", () => {
      el("chatInput").value = button.dataset.chatPrompt || "";
      el("chatInput").focus();
    });
  });
  el("themeToggle").addEventListener("click", () => applyTheme(state.theme === "dark" ? "light" : "dark"));
  el("loadSample").addEventListener("click", loadSample);
  el("closeGenerationOverlay").addEventListener("click", () => el("generationOverlay").classList.add("hidden"));
  updateChatSendState();
}

document.addEventListener("DOMContentLoaded", init);
