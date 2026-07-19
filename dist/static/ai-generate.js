const API_SECRET_STORAGE_KEY = "ppt-html-studio-api-secret-v2";
const THEME_STORAGE_KEY = "ppt-html-studio-theme";

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
};

const el = (id) => document.getElementById(id);

function setStatus(message, kind = "") {
  const node = el("statusLine");
  node.textContent = message || "";
  node.className = `status-line ${kind}`;
}

function setBusy(value, message = "") {
  state.busy = Boolean(value);
  ["planButton", "generateButton", "saveApi"].forEach((id) => {
    const node = el(id);
    if (node) node.disabled = state.busy || (id === "generateButton" && !state.plan);
  });
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

function renderPlan(plan) {
  state.plan = plan;
  el("planJson").value = JSON.stringify(plan, null, 2);
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
    setStatus("Plan ready. You can edit the JSON, then generate HTML.", "ok");
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
  el("previewFrame").src = state.job.previewUrl;
  el("previewEmpty").classList.add("hidden");
  ["editHtml", "saveEditedHtml", "openScrollHtml", "downloadZip"].forEach((id) => {
    el(id).disabled = false;
  });
}

async function generateHtml() {
  const plan = safeJsonParse(el("planJson").value);
  if (!plan) {
    setStatus("The plan JSON is invalid. Fix it before generating HTML.", "error");
    return;
  }
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

async function saveEditedHtml() {
  if (!state.job) return;
  const captured = await captureEditedHtml();
  const response = await fetch(`/api/jobs/${state.job.id}/save-edited`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(captured),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.message || data.error || "Could not save edited HTML.");
  state.job.inlinePreviewHtmlCache = captured.pagedHtml;
  state.job.inlineScrollHtmlCache = captured.scrollHtml;
  setStatus("Edits saved. Download ZIP will include the latest HTML.", "ok");
}

async function downloadZip() {
  if (!state.job) return;
  try {
    await saveEditedHtml().catch(() => {});
    const link = document.createElement("a");
    link.href = `/api/jobs/${state.job.id}/download`;
    link.download = `${state.job.id}.zip`;
    document.body.appendChild(link);
    link.click();
    link.remove();
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
}

function openScroll() {
  if (!state.job?.scrollUrl) return;
  window.open(state.job.scrollUrl, "_blank", "noopener,noreferrer");
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
    const plan = safeJsonParse(el("planJson").value);
    if (!plan) {
      setStatus("Plan JSON is invalid.", "error");
      return;
    }
    renderPlan(plan);
  });
  el("editHtml").addEventListener("click", toggleEdit);
  el("saveEditedHtml").addEventListener("click", () => saveEditedHtml().catch((error) => setStatus(error.message, "error")));
  el("downloadZip").addEventListener("click", downloadZip);
  el("openScrollHtml").addEventListener("click", openScroll);
  el("themeToggle").addEventListener("click", () => applyTheme(state.theme === "dark" ? "light" : "dark"));
  el("loadSample").addEventListener("click", loadSample);
  el("closeGenerationOverlay").addEventListener("click", () => el("generationOverlay").classList.add("hidden"));
}

document.addEventListener("DOMContentLoaded", init);
