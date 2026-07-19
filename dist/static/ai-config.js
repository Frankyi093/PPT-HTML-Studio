(function () {
  const CONFIG_KEY = "ppt-html-studio-ai-config-v1";
  const SECRET_KEY = "ppt-html-studio-api-secret-v2";

  const PROVIDERS = {
    openai: {
      label: "OpenAI Compatible",
      mode: "ai_api",
      endpoint: "https://api.openai.com/v1",
      model: "gpt-4.1-mini",
      apiKeyHeader: "Authorization",
      apiKeyPrefix: "Bearer ",
      workflowPayload: "flat",
      timeoutSec: 300,
    },
    deepseek: {
      label: "DeepSeek",
      mode: "ai_api",
      endpoint: "https://api.deepseek.com/v1",
      model: "deepseek-chat",
      apiKeyHeader: "Authorization",
      apiKeyPrefix: "Bearer ",
      workflowPayload: "flat",
      timeoutSec: 300,
    },
    doubao_seed: {
      label: "Doubao Seed",
      mode: "ai_api",
      endpoint: "https://ark.cn-beijing.volces.com/api/v3",
      model: "doubao-seed-2-0-lite-260428",
      apiKeyHeader: "Authorization",
      apiKeyPrefix: "Bearer ",
      workflowPayload: "flat",
      timeoutSec: 300,
    },
    custom_ai: {
      label: "Custom AI API",
      mode: "ai_api",
      endpoint: "",
      model: "gpt-4.1-mini",
      apiKeyHeader: "Authorization",
      apiKeyPrefix: "Bearer ",
      workflowPayload: "flat",
      timeoutSec: 300,
    },
    workflow: {
      label: "Custom Workflow",
      mode: "workflow_api",
      endpoint: "",
      model: "",
      apiKeyHeader: "Authorization",
      apiKeyPrefix: "Bearer ",
      workflowPayload: "flat",
      timeoutSec: 300,
    },
    dify: {
      label: "Dify Workflow",
      mode: "workflow_api",
      endpoint: "",
      model: "",
      apiKeyHeader: "Authorization",
      apiKeyPrefix: "Bearer ",
      workflowPayload: "dify",
      timeoutSec: 300,
    },
  };

  function safeJsonParse(value, fallback) {
    try {
      return JSON.parse(value);
    } catch {
      return fallback;
    }
  }

  function readSecret() {
    return safeJsonParse(localStorage.getItem(SECRET_KEY) || "{}", {}) || {};
  }

  function writeSecret(secret) {
    localStorage.setItem(SECRET_KEY, JSON.stringify(secret || {}));
  }

  function maskedKey(value) {
    const key = String(value || "");
    if (!key) return "";
    if (key.length <= 8) return `${key.slice(0, 2)}...${key.slice(-2)}`;
    return `${key.slice(0, 4)}...${key.slice(-4)}`;
  }

  function providerFromConfig(config = {}) {
    if (config.provider && PROVIDERS[config.provider]) return config.provider;
    const endpoint = String(config.endpoint || "").toLowerCase();
    if ((config.mode || "") === "workflow_api" && config.workflowPayload === "dify") return "dify";
    if ((config.mode || "") === "workflow_api") return "workflow";
    if (endpoint.includes("api.deepseek.com")) return "deepseek";
    if (endpoint.includes("volces.com") || endpoint.includes("ark.cn-beijing")) return "doubao_seed";
    if (endpoint.includes("api.openai.com")) return "openai";
    return "custom_ai";
  }

  function normalize(config = {}) {
    const provider = providerFromConfig(config);
    const preset = PROVIDERS[provider] || PROVIDERS.openai;
    const merged = {
      provider,
      ...preset,
      ...config,
      timeoutSec: Math.max(60, Number(config.timeoutSec || preset.timeoutSec || 300)),
    };
    const secret = readSecret();
    const savedKey = secret[provider] || secret[merged.endpoint] || "";
    merged.apiKey = String(config.apiKey || savedKey || "");
    merged.hasApiKey = Boolean(merged.apiKey || config.hasApiKey);
    merged.apiKeyMasked = merged.apiKey ? maskedKey(merged.apiKey) : (config.apiKeyMasked || "");
    return merged;
  }

  function loadAiConfig() {
    const local = safeJsonParse(localStorage.getItem(CONFIG_KEY) || "{}", {}) || {};
    return normalize(local);
  }

  async function loadRemoteAiConfig() {
    try {
      const response = await fetch("/api/integration", { cache: "no-store" });
      const data = await response.json();
      if (response.ok && data.integration) {
        const local = loadAiConfig();
        return normalize({ ...data.integration, ...local });
      }
    } catch {
      // Local configuration is enough for browser-side pages.
    }
    return loadAiConfig();
  }

  function saveAiConfig(config = {}) {
    const normalized = normalize(config);
    const secret = readSecret();
    if (config.apiKey) {
      secret[normalized.provider] = String(config.apiKey);
      if (normalized.endpoint) secret[normalized.endpoint] = String(config.apiKey);
      writeSecret(secret);
    }
    const publicConfig = { ...normalized };
    delete publicConfig.apiKey;
    publicConfig.hasApiKey = Boolean(config.apiKey || normalized.hasApiKey);
    publicConfig.apiKeyMasked = config.apiKey ? maskedKey(config.apiKey) : normalized.apiKeyMasked;
    localStorage.setItem(CONFIG_KEY, JSON.stringify(publicConfig));
    return normalize(publicConfig);
  }

  async function syncAiConfig(config = loadAiConfig()) {
    const payload = normalize(config);
    const response = await fetch("/api/integration", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ integration: payload }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.message || data.error || "Could not sync AI settings.");
    return data.integration || payload;
  }

  function hasValidAiConfig(config = loadAiConfig()) {
    const normalized = normalize(config);
    if (!normalized.mode || normalized.mode === "local") return false;
    if (!normalized.endpoint) return false;
    if (!normalized.apiKey && !normalized.hasApiKey) return false;
    if (normalized.mode === "ai_api" && !normalized.model) return false;
    return true;
  }

  function getAiConfigSummary(config = loadAiConfig()) {
    const normalized = normalize(config);
    const provider = PROVIDERS[normalized.provider] || PROVIDERS.custom_ai;
    if (!hasValidAiConfig(normalized)) return "AI not configured";
    const model = normalized.mode === "workflow_api" ? "Workflow" : normalized.model;
    return `${provider.label} / ${model} / ${normalized.apiKeyMasked || "saved key"}`;
  }

  function buildAiRequestPayload(messages, options = {}) {
    const config = normalize(options.config || loadAiConfig());
    return {
      integration: config,
      messages: Array.isArray(messages) ? messages : [],
      options,
    };
  }

  async function testAiConfig(config = loadAiConfig()) {
    const saved = saveAiConfig(config);
    await syncAiConfig(saved);
    const response = await fetch("/api/integration/test", { method: "POST" });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || data.ok === false) throw new Error(data.message || data.error || "API test failed.");
    return data;
  }

  window.PptAiConfig = {
    CONFIG_KEY,
    SECRET_KEY,
    PROVIDERS,
    maskedKey,
    normalize,
    providerFromConfig,
    loadAiConfig,
    loadRemoteAiConfig,
    saveAiConfig,
    syncAiConfig,
    hasValidAiConfig,
    getAiConfigSummary,
    testAiConfig,
    buildAiRequestPayload,
  };
})();
