const el = (id) => document.getElementById(id);

function setStatus(message, kind = "") {
  const node = el("settingsStatus");
  node.textContent = message || "";
  node.className = `status-line ${kind}`;
}

function applyPreset(provider, overwrite = true) {
  const preset = window.PptAiConfig.PROVIDERS[provider] || window.PptAiConfig.PROVIDERS.openai;
  if (overwrite) {
    el("endpoint").value = preset.endpoint || "";
    el("model").value = preset.model || "";
    el("apiKeyHeader").value = preset.apiKeyHeader || "Authorization";
    el("apiKeyPrefix").value = preset.apiKeyPrefix ?? "Bearer ";
    el("workflowPayload").value = preset.workflowPayload || "flat";
    el("timeoutSec").value = preset.timeoutSec || 300;
    el("customHeaders").value = preset.customHeaders || "";
  }
  el("model").closest("label").style.display = preset.mode === "workflow_api" ? "none" : "";
}

function formConfig() {
  const provider = el("provider").value;
  const preset = window.PptAiConfig.PROVIDERS[provider] || window.PptAiConfig.PROVIDERS.openai;
  return {
    provider,
    mode: preset.mode,
    endpoint: el("endpoint").value.trim(),
    model: el("model").value.trim(),
    apiKey: el("apiKey").value.trim(),
    apiKeyHeader: el("apiKeyHeader").value,
    apiKeyPrefix: el("apiKeyPrefix").value,
    customHeaders: el("customHeaders").value.trim(),
    workflowPayload: el("workflowPayload").value,
    timeoutSec: Number(el("timeoutSec").value || 300),
    fallbackToLocal: true,
  };
}

function renderConfig(config) {
  const provider = window.PptAiConfig.providerFromConfig(config);
  el("provider").value = provider;
  applyPreset(provider, false);
  el("endpoint").value = config.endpoint || window.PptAiConfig.PROVIDERS[provider]?.endpoint || "";
  el("model").value = config.model || window.PptAiConfig.PROVIDERS[provider]?.model || "";
  el("apiKeyHeader").value = config.apiKeyHeader || "Authorization";
  el("apiKeyPrefix").value = config.apiKeyPrefix ?? "Bearer ";
  el("customHeaders").value = config.customHeaders || "";
  el("workflowPayload").value = config.workflowPayload || window.PptAiConfig.PROVIDERS[provider]?.workflowPayload || "flat";
  el("timeoutSec").value = Math.max(60, Number(config.timeoutSec || 300));
  el("apiKey").value = "";
  el("keyStatus").textContent = config.hasApiKey || config.apiKey
    ? `Saved key: ${config.apiKeyMasked || window.PptAiConfig.maskedKey(config.apiKey)}. Leave the field blank to keep it.`
    : "No saved key yet.";
}

async function save() {
  const saved = window.PptAiConfig.saveAiConfig(formConfig());
  try {
    await window.PptAiConfig.syncAiConfig(saved);
  } catch {
    // Local storage is the source of truth; backend sync is best effort.
  }
  renderConfig(saved);
  setStatus("AI settings saved. The three creation modes will reuse this configuration.", "ok");
}

async function test() {
  try {
    setStatus("Testing API...");
    await window.PptAiConfig.testAiConfig(formConfig());
    renderConfig(window.PptAiConfig.loadAiConfig());
    setStatus("API test passed.", "ok");
  } catch (error) {
    setStatus(error.message || "API test failed.", "error");
  }
}

async function init() {
  const config = await window.PptAiConfig.loadRemoteAiConfig();
  renderConfig(config);
  el("provider").addEventListener("change", (event) => applyPreset(event.target.value, true));
  el("aiSettingsForm").addEventListener("submit", (event) => {
    event.preventDefault();
    save().catch((error) => setStatus(error.message, "error"));
  });
  el("testApi").addEventListener("click", test);
}

document.addEventListener("DOMContentLoaded", init);
