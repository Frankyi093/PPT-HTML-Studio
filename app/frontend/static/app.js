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
    model: "doubao-seed-2-0-mini-260428",
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
    hydrated.previewUrl = createInlineHtmlUrl(hydrated.inlinePreviewHtml);
    hydrated.inlinePreviewAvailable = true;
    delete hydrated.inlinePreviewHtml;
  }
  if (hydrated.inlineScrollHtml) {
    hydrated.scrollUrl = createInlineHtmlUrl(hydrated.inlineScrollHtml);
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
      data = {
        error: "non_json_response",
        message: plain || fallbackMessage,
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
    setStatus(error.message, "error");
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

function hasEditablePreview() {
  const win = previewWindow();
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
    previewWindow().toggleEdit();
  }
  updatePreviewEditButton(shouldEdit);
  setStatus(shouldEdit ? "Editing in the preview. Select text, then use style buttons or download ZIP." : "Preview editing stopped.", shouldEdit ? "ok" : "");
  return true;
}

async function savePreviewEditsToServer(job, options = {}) {
  if (!job) return null;
  const win = previewWindow();
  if (!win || typeof win.exportEditedHtml !== "function") {
    if (options.requireEditable) {
      throw new Error("The current preview cannot export edited HTML. Regenerate this PPT, then edit inside the preview frame.");
    }
    return null;
  }
  const pagedHtml = await win.exportEditedHtml("paged");
  const scrollHtml = await win.exportEditedHtml("scroll");
  const response = await fetch(apiUrl(`/api/jobs/${job.id}/save-edited`), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ pagedHtml, scrollHtml }),
  });
  const data = await readJsonResponse(response, "Could not save edited HTML");
  state.activeJob = hydrateInlineJob(data.job || job);
  state.activeShare = hydrateShare(data.share || state.activeShare);
  state.jobs = state.jobs.map((item) => item.id === job.id ? state.activeJob : item);
  renderJobs();
  renderJobSelect();
  el("jobSelect").value = state.activeJob.id;
  renderShare(state.activeShare || state.activeJob.share || null);
  setStatus("Edited paged and scroll HTML saved to the package.", "ok");
  return data;
}

async function downloadJobZip(job) {
  if (!job) return;
  const button = el("downloadJob");
  const oldText = button?.textContent;
  const fallbackJob = state.jobs.find((item) => item.id === job.id) || state.activeJob || job;
  try {
    if (button) {
      button.disabled = true;
      button.textContent = "Saving edits...";
    }
    setStatus("Saving current edited HTML before packaging...");
    let saved = null;
    try {
      saved = await savePreviewEditsToServer(job);
    } catch (saveError) {
      const fallbackUrl = fallbackJob.downloadUrl || fallbackJob.share?.zipPackageUrl;
      if (!isInlineDownloadUrl(fallbackUrl)) throw saveError;
      setStatus("Could not sync edits back to the Worker instance, so downloading the latest self-contained package stored in this page.", "error");
      triggerDownload(fallbackUrl, `${fallbackJob.id || "optimized-ppt"}.zip`);
      return;
    }
    const latestJob = state.jobs.find((item) => item.id === job.id) || state.activeJob || job;
    setStatus(saved ? "Downloading ZIP package with latest edits." : "Downloading ZIP package. Regenerate old jobs to enable edit syncing.", saved ? "ok" : "");
    triggerDownload(latestJob.downloadUrl || latestJob.share?.zipPackageUrl, `${latestJob.id || "optimized-ppt"}.zip`);
  } catch (error) {
    setStatus(error.message || "Could not save edited HTML before download.", "error");
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
  const payload = {
    mode: el("apiMode").value,
    endpoint: el("apiEndpoint").value.trim(),
    apiKeyHeader: el("apiKeyHeader").value,
    apiKeyPrefix: el("apiKeyPrefix").value,
    customHeaders: el("customHeaders").value.trim(),
    workflowPayload: el("workflowPayload").value,
    model: el("apiModel").value.trim(),
    timeoutSec: Number(el("apiTimeout").value || 90),
    fallbackToLocal: el("fallbackToLocal").checked,
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
  el("fallbackToLocal").checked = state.integration.fallbackToLocal !== false;
  el("clearApiKey").checked = false;
  updateProviderUi();
  const isLocalMode = state.integration.mode === "local";
  const modeLabel = isLocalMode ? "Local rules active" : apiProviders[state.apiProvider]?.label || "External API enabled";
  const keyLabel = !isLocalMode && state.integration.hasApiKey ? ` Key: ${state.integration.apiKeyMasked}` : "";
  el("apiKeyNote").textContent = isLocalMode
    ? "Local rules do not need an API key."
    : state.integration.hasApiKey
      ? `Saved key: ${state.integration.apiKeyMasked}. Leave the key field blank to keep it.`
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
  } else if (state.integration.hasApiKey) {
    el("apiKeyNote").textContent = `Saved key: ${state.integration.apiKeyMasked}. Leave the key field blank to keep it.`;
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
