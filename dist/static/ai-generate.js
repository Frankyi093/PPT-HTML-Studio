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
  const secret = readLocalApiSecret();
  return secret[state.provider] || secret[el("apiEndpoint").value.trim()] || "";
}

function collectIntegration() {
  const provider = el("apiProvider").value;
  const preset = apiProviders[provider] || apiProviders.openai;
  return {
    mode: preset.mode,
    endpoint: el("apiEndpoint").value.trim(),
    model: el("apiModel").value.trim(),
    apiKey: el("apiKey").value.trim() || savedKeyForProvider(),
    apiKeyHeader: el("apiKeyHeader").value,
    apiKeyPrefix: el("apiKeyPrefix").value,
    customHeaders: el("customHeaders").value,
    workflowPayload: el("workflowPayload").value,
    timeoutSec: Math.max(300, Number(el("apiTimeout").value || 300)),
    fallbackToLocal: false,
  };
}

function applyProvider(provider, overwrite = true) {
  const preset = apiProviders[provider] || apiProviders.openai;
  state.provider = provider;
  el("apiProvider").value = provider;
  if (overwrite) {
    el("apiEndpoint").value = preset.endpoint || "";
    el("apiModel").value = preset.model || "";
    el("apiKeyHeader").value = preset.apiKeyHeader || "Authorization";
    el("apiKeyPrefix").value = preset.apiKeyPrefix ?? "Bearer ";
    el("customHeaders").value = preset.customHeaders || "";
    el("workflowPayload").value = preset.workflowPayload || "flat";
    el("apiTimeout").value = preset.timeoutSec || 300;
  }
  const isWorkflow = preset.mode === "workflow_api";
  el("apiModel").closest("label").style.display = isWorkflow ? "none" : "";
  const saved = savedKeyForProvider();
  el("apiNote").textContent = saved || state.integration.hasApiKey
    ? `Saved key: ${maskedKey(saved) || state.integration.apiKeyMasked}. Leave the key field blank to keep it.`
    : "Paste the API key once, then click Save. The key is reused on this browser.";
}

async function loadIntegration() {
  try {
    const response = await fetch("/api/integration", { cache: "no-store" });
    const data = await response.json();
    state.integration = { ...state.integration, ...(data.integration || {}) };
    const provider = inferApiProvider(state.integration);
    applyProvider(provider, false);
    el("apiEndpoint").value = state.integration.endpoint || apiProviders[provider]?.endpoint || "";
    el("apiModel").value = state.integration.model || apiProviders[provider]?.model || "";
    el("apiKeyHeader").value = state.integration.apiKeyHeader || "Authorization";
    el("apiKeyPrefix").value = state.integration.apiKeyPrefix ?? "Bearer ";
    el("customHeaders").value = state.integration.customHeaders || "";
    el("workflowPayload").value = state.integration.workflowPayload || apiProviders[provider]?.workflowPayload || "flat";
    el("apiTimeout").value = Math.max(300, Number(state.integration.timeoutSec || 300));
    applyProvider(provider, false);
  } catch (error) {
    setStatus(`Could not load API settings: ${error.message}`, "error");
  }
}

async function saveIntegration() {
  const integration = collectIntegration();
  const typedKey = el("apiKey").value.trim();
  if (typedKey) {
    const secret = readLocalApiSecret();
    secret[state.provider] = typedKey;
    if (integration.endpoint) secret[integration.endpoint] = typedKey;
    writeLocalApiSecret(secret);
  }
  if (!integration.apiKey) integration.apiKey = savedKeyForProvider();
  const response = await fetch("/api/integration", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ integration }),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.message || data.error || "Could not save API settings.");
  state.integration = { ...state.integration, ...(data.integration || {}) };
  el("apiKey").value = "";
  applyProvider(state.provider, false);
  setStatus("API settings saved.", "ok");
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

async function captureEditedHtml() {
  const win = previewWindow();
  if (!win?.exportEditedHtml) throw new Error("The current preview is not editable yet.");
  return {
    pagedHtml: await win.exportEditedHtml("paged"),
    scrollHtml: await win.exportEditedHtml("scroll"),
  };
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
  el("saveApi").addEventListener("click", () => saveIntegration().catch((error) => setStatus(error.message, "error")));
  el("apiProvider").addEventListener("change", (event) => applyProvider(event.target.value, true));
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
