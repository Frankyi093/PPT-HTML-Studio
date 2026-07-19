const CHAT_HISTORY_KEY = "ppt-html-studio-chat-create-history-v1";
const PREVIEW_WIDTH = 1280;
const PREVIEW_HEIGHT = 720;

const state = {
  messages: [],
  outline: null,
  job: null,
  editing: false,
  busy: false,
  objectUrls: [],
};

const el = (id) => document.getElementById(id);

function escapeHtml(value) {
  return String(value || "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;",
  }[char]));
}

function safeJsonParse(text, fallback) {
  try {
    return JSON.parse(text);
  } catch {
    return fallback;
  }
}

function setStatus(message, kind = "") {
  const node = el("statusLine");
  node.textContent = message || "";
  node.className = `status-line ${kind}`;
}

function setBusy(value, message = "") {
  state.busy = Boolean(value);
  el("sendButton").disabled = state.busy || !hasAi();
  el("confirmGenerate").disabled = state.busy || !hasAi() || !state.outline?.slides?.length;
  el("generationOverlay").classList.toggle("hidden", !state.busy);
  if (message) el("generationMessage").textContent = message;
}

function hasAi() {
  return Boolean(window.PptAiConfig?.hasValidAiConfig?.());
}

function refreshAiStatus() {
  const node = el("aiConfigBanner");
  if (!window.PptAiConfig) {
    node.textContent = "AI settings module unavailable.";
    node.className = "ai-config-banner error";
    return;
  }
  if (hasAi()) {
    node.textContent = `AI configured: ${window.PptAiConfig.getAiConfigSummary()}`;
    node.className = "ai-config-banner";
  } else {
    node.innerHTML = 'AI not configured. <a href="/ai-settings.html">Open AI Settings</a> first.';
    node.className = "ai-config-banner error";
  }
  el("sendButton").disabled = state.busy || !hasAi();
  el("confirmGenerate").disabled = state.busy || !hasAi() || !state.outline?.slides?.length;
}

function pushMessage(role, content) {
  state.messages.push({ role, content, at: new Date().toISOString() });
  renderMessages();
  saveHistory();
}

function renderMessages() {
  const box = el("messages");
  if (!state.messages.length) {
    box.innerHTML = "";
    return;
  }
  box.innerHTML = state.messages
    .map((message) => `<div class="message ${message.role}">${escapeHtml(message.content)}</div>`)
    .join("");
  box.scrollTop = box.scrollHeight;
}

function defaultOutline() {
  return {
    title: "",
    audience: "",
    language: "English",
    style: "teaching",
    slideCount: 0,
    goal: "",
    tone: "clear, modern, educational",
    slides: [],
  };
}

function syncOutlineFromForm() {
  const outline = state.outline || defaultOutline();
  outline.title = el("deckTitle").value.trim();
  outline.audience = el("deckAudience").value.trim();
  outline.style = el("deckStyle").value;
  outline.slides = [...document.querySelectorAll(".outline-card")].map((card, index) => ({
    page: index + 1,
    type: card.querySelector("[data-field='type']").value,
    title: card.querySelector("[data-field='title']").value.trim(),
    goal: card.querySelector("[data-field='goal']").value.trim(),
    bullets: card.querySelector("[data-field='bullets']").value.split(/\n+/).map((item) => item.trim()).filter(Boolean),
    visualSuggestion: card.querySelector("[data-field='visual']").value.trim(),
    speakerNoteOptional: card.querySelector("[data-field='note']").value.trim(),
  })).filter((slide) => slide.title || slide.bullets.length || slide.goal);
  outline.slideCount = outline.slides.length;
  state.outline = outline;
  el("confirmGenerate").disabled = state.busy || !hasAi() || !outline.slides.length;
  saveHistory();
}

function renderOutline(outline = state.outline || defaultOutline()) {
  state.outline = outline;
  el("deckTitle").value = outline.title || "";
  el("deckAudience").value = outline.audience || "";
  el("deckStyle").value = outline.style || "teaching";
  const cards = el("outlineCards");
  const slides = Array.isArray(outline.slides) ? outline.slides : [];
  cards.innerHTML = slides.map((slide, index) => `
    <article class="outline-card" data-index="${index}">
      <div class="outline-card-top">
        <span class="page-number">${index + 1}</span>
        <select data-field="type">
          ${["Cover", "Agenda", "Content", "Transition", "Summary", "Exercise"].map((type) => `<option value="${type}" ${String(slide.type || "").toLowerCase() === type.toLowerCase() ? "selected" : ""}>${type}</option>`).join("")}
        </select>
        <button class="icon-mini" type="button" data-move="-1">Up</button>
        <button class="icon-mini" type="button" data-move="1">Down</button>
      </div>
      <label>Title <input data-field="title" type="text" value="${escapeHtml(slide.title || "")}"></label>
      <label>Page goal <input data-field="goal" type="text" value="${escapeHtml(slide.goal || "")}"></label>
      <label>Key points <textarea data-field="bullets" rows="4">${escapeHtml((slide.bullets || []).join("\n"))}</textarea></label>
      <label>Visual suggestion <input data-field="visual" type="text" value="${escapeHtml(slide.visualSuggestion || "")}"></label>
      <label>Speaker note <textarea data-field="note" rows="2">${escapeHtml(slide.speakerNoteOptional || "")}</textarea></label>
      <button class="icon-mini" type="button" data-delete>Delete page</button>
    </article>
  `).join("") || '<div class="outline-card">The outline will appear here after the first AI response.</div>';
  cards.querySelectorAll("input,textarea,select").forEach((node) => node.addEventListener("input", syncOutlineFromForm));
  cards.querySelectorAll("[data-delete]").forEach((button) => button.addEventListener("click", () => {
    const index = Number(button.closest(".outline-card").dataset.index);
    state.outline.slides.splice(index, 1);
    renderOutline(state.outline);
  }));
  cards.querySelectorAll("[data-move]").forEach((button) => button.addEventListener("click", () => {
    const index = Number(button.closest(".outline-card").dataset.index);
    const next = index + Number(button.dataset.move);
    if (next < 0 || next >= state.outline.slides.length) return;
    const [slide] = state.outline.slides.splice(index, 1);
    state.outline.slides.splice(next, 0, slide);
    renderOutline(state.outline);
  }));
  el("confirmGenerate").disabled = state.busy || !hasAi() || !slides.length;
}

async function readJsonResponse(response) {
  const text = await response.text();
  const data = safeJsonParse(text, null);
  if (data) return data;
  return { message: text.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim() || `HTTP ${response.status}` };
}

async function sendMessage(event) {
  event.preventDefault();
  if (!hasAi()) {
    setStatus("Please configure AI first.", "error");
    return;
  }
  const content = el("chatInput").value.trim();
  if (!content) return;
  pushMessage("user", content);
  el("chatInput").value = "";
  try {
    setBusy(true, "AI is clarifying the brief and updating the outline...");
    setStatus("Updating outline...");
    const integration = window.PptAiConfig.loadAiConfig();
    await window.PptAiConfig.syncAiConfig(integration).catch(() => {});
    const response = await fetch("/api/chat-create-outline", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        messages: state.messages,
        outline: state.outline,
        style: el("deckStyle").value,
        integration,
      }),
    });
    const data = await readJsonResponse(response);
    if (!response.ok) throw new Error(data.message || data.error || "Chat planning failed.");
    const assistantText = [data.assistantText, ...(data.questions || []).map((q, i) => `${i + 1}. ${q}`)].filter(Boolean).join("\n\n");
    pushMessage("assistant", assistantText || "I updated the outline on the right.");
    renderOutline(data.outline);
    setStatus(data.ready ? "Outline is ready. Review it, then confirm and generate." : "Outline updated. Keep chatting or edit the cards.", "ok");
  } catch (error) {
    pushMessage("assistant", `I could not update the outline: ${error.message || error}`);
    setStatus(error.message || "Chat planning failed.", "error");
  } finally {
    setBusy(false);
  }
}

function outlineToTopicPlan(outline) {
  return {
    title: outline.title || "Chat Created Presentation",
    audience: outline.audience || "",
    goal: outline.goal || "",
    tone: outline.tone || "clear, modern, educational",
    palette: outline.palette || {},
    typography: outline.typography || {},
    layoutRules: [
      "Keep every slide in a fixed 16:9 canvas.",
      "Center cover/title slide titles both horizontally and vertically.",
      "Use strong text/background contrast and keep every element inside safe margins.",
    ],
    slides: (outline.slides || []).map((slide, index) => ({
      page: index + 1,
      title: slide.title,
      layout: slide.type || "Content",
      visualFocus: slide.visualSuggestion || slide.goal || "",
      body: slide.bullets || [],
      speakerNote: slide.speakerNoteOptional || "",
    })),
  };
}

function createObjectUrl(html) {
  const url = URL.createObjectURL(new Blob([html], { type: "text/html;charset=utf-8" }));
  state.objectUrls.push(url);
  return url;
}

function hydrateJob(job) {
  const output = { ...job };
  if (output.inlinePreviewHtml) {
    output.inlinePreviewHtmlCache = output.inlinePreviewHtml;
    output.previewUrl = createObjectUrl(output.inlinePreviewHtml);
    delete output.inlinePreviewHtml;
  }
  if (output.inlineScrollHtml) {
    output.inlineScrollHtmlCache = output.inlineScrollHtml;
    output.scrollUrl = createObjectUrl(output.inlineScrollHtml);
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
}

async function generateHtml() {
  syncOutlineFromForm();
  if (!state.outline?.slides?.length) {
    setStatus("Please create or edit the outline first.", "error");
    return;
  }
  if (!hasAi()) {
    setStatus("Please configure AI first.", "error");
    return;
  }
  try {
    setBusy(true, "AI is generating the final editable HTML PPT...");
    setStatus("Generating HTML deck...");
    const integration = window.PptAiConfig.loadAiConfig();
    await window.PptAiConfig.syncAiConfig(integration).catch(() => {});
    const plan = outlineToTopicPlan(state.outline);
    const response = await fetch("/api/generate-from-topic", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        topic: state.outline.title,
        audience: state.outline.audience,
        requirements: state.messages.map((m) => `${m.role}: ${m.content}`).join("\n").slice(0, 12000),
        slideCount: plan.slides.length,
        outputLanguage: /^zh|chinese|simplified/i.test(state.outline.language || "") ? "zh" : "en",
        style: state.outline.style || el("deckStyle").value,
        plan,
        integration,
      }),
    });
    const data = await readJsonResponse(response);
    if (!response.ok) throw new Error(data.message || data.error || "HTML generation failed.");
    renderJob(data.job);
    setStatus("HTML generated. You can preview, edit, save, and download ZIP.", "ok");
    saveHistory();
  } catch (error) {
    setStatus(error.message || "HTML generation failed.", "error");
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

function toggleEdit() {
  if (!state.job) return;
  const win = previewWindow();
  if (!win?.toggleEdit) {
    setStatus("The current preview is not editable yet.", "error");
    return;
  }
  state.editing = !state.editing;
  win.toggleEdit(state.editing);
  el("editHtml").textContent = state.editing ? "Stop Editing" : "Edit HTML";
}

async function captureEditedHtml() {
  const win = previewWindow();
  if (win?.exportEditedHtml) {
    return {
      pagedHtml: await win.exportEditedHtml("paged"),
      scrollHtml: await win.exportEditedHtml("scroll"),
    };
  }
  const doc = previewDocument();
  if (!doc) throw new Error("Preview is not ready.");
  const html = `<!doctype html>${doc.documentElement.outerHTML}`;
  return { pagedHtml: html, scrollHtml: html };
}

async function persistEditedHtml() {
  if (!state.job) return null;
  const captured = await captureEditedHtml();
  state.job.inlinePreviewHtmlCache = captured.pagedHtml;
  state.job.inlineScrollHtmlCache = captured.scrollHtml;
  state.job.previewUrl = createObjectUrl(captured.pagedHtml);
  state.job.scrollUrl = createObjectUrl(captured.scrollHtml);
  try {
    await fetch(`/api/jobs/${state.job.id}/save-edited`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(captured),
    });
  } catch {
    // Worker memory is temporary; local ZIP still uses captured HTML.
  }
  return captured;
}

async function saveEditedHtml() {
  await persistEditedHtml();
  setStatus("Edits saved. Download ZIP will use the latest edited HTML.", "ok");
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

async function downloadZip() {
  if (!state.job) return;
  const captured = await persistEditedHtml();
  if (window.JSZip) {
    const zip = new window.JSZip();
    zip.file("index.html", captured.pagedHtml);
    zip.file("index-scroll.html", captured.scrollHtml);
    zip.file("index-single-file.html", captured.pagedHtml);
    zip.file("index-scroll-single-file.html", captured.scrollHtml);
    zip.file("README-open.txt", "Open index.html for paged navigation, or index-scroll.html for continuous scrolling.\nThis ZIP contains the latest edited HTML.\n");
    const blob = await zip.generateAsync({ type: "blob" });
    triggerBlobDownload(blob, `${state.job.id || "chat-created-ppt"}.zip`);
  } else {
    triggerBlobDownload(new Blob([captured.pagedHtml], { type: "text/html;charset=utf-8" }), "index.html");
  }
  setStatus("Downloaded ZIP with the latest edited content.", "ok");
}

function syncPreviewScale() {
  const frame = el("previewFrame");
  const shell = frame?.closest(".preview-frame");
  if (!frame || !shell) return;
  const rect = shell.getBoundingClientRect();
  const scale = Math.min(rect.width / PREVIEW_WIDTH, rect.height / PREVIEW_HEIGHT, 1);
  shell.style.setProperty("--preview-scale", String(Math.max(.22, scale)));
}

function loadHistory() {
  return safeJsonParse(localStorage.getItem(CHAT_HISTORY_KEY) || "[]", []) || [];
}

function saveHistory() {
  const history = loadHistory().filter((item) => item.id !== state.sessionId);
  history.unshift({
    id: state.sessionId,
    title: state.outline?.title || state.messages.find((m) => m.role === "user")?.content?.slice(0, 60) || "New chat",
    updatedAt: new Date().toISOString(),
    messages: state.messages,
    outline: state.outline,
  });
  localStorage.setItem(CHAT_HISTORY_KEY, JSON.stringify(history.slice(0, 12)));
}

function renderHistory() {
  const list = el("historyList");
  const history = loadHistory();
  list.innerHTML = history.map((item) => `
    <button class="history-item" type="button" data-id="${item.id}">
      <span>${escapeHtml(item.title)}</span>
      <small>${new Date(item.updatedAt).toLocaleString()}</small>
    </button>
  `).join("") || '<div class="history-item">No history yet.</div>';
  list.querySelectorAll("[data-id]").forEach((button) => button.addEventListener("click", () => {
    const item = loadHistory().find((entry) => entry.id === button.dataset.id);
    if (!item) return;
    state.sessionId = item.id;
    state.messages = item.messages || [];
    state.outline = item.outline || defaultOutline();
    renderMessages();
    renderOutline(state.outline);
    list.classList.add("hidden");
  }));
}

function newChat() {
  state.sessionId = `CHAT-${Date.now().toString(36).toUpperCase()}`;
  state.messages = [{
    role: "assistant",
    content: "Tell me the topic, audience, approximate slide count, usage scenario, and any style preference. I will turn the conversation into an editable outline on the right.",
    at: new Date().toISOString(),
  }];
  state.outline = defaultOutline();
  renderMessages();
  renderOutline(state.outline);
  saveHistory();
  setStatus("");
}

function addSlide() {
  syncOutlineFromForm();
  state.outline.slides.push({
    page: state.outline.slides.length + 1,
    type: state.outline.slides.length ? "Content" : "Cover",
    title: state.outline.slides.length ? "New key idea" : "Presentation title",
    goal: "",
    bullets: [],
    visualSuggestion: "",
    speakerNoteOptional: "",
  });
  renderOutline(state.outline);
}

function init() {
  newChat();
  refreshAiStatus();
  el("chatForm").addEventListener("submit", sendMessage);
  el("confirmGenerate").addEventListener("click", generateHtml);
  el("addSlide").addEventListener("click", addSlide);
  el("deckTitle").addEventListener("input", syncOutlineFromForm);
  el("deckAudience").addEventListener("input", syncOutlineFromForm);
  el("deckStyle").addEventListener("change", syncOutlineFromForm);
  el("newChatButton").addEventListener("click", newChat);
  el("historyButton").addEventListener("click", () => {
    renderHistory();
    el("historyList").classList.toggle("hidden");
  });
  el("closeGenerationOverlay").addEventListener("click", () => el("generationOverlay").classList.add("hidden"));
  el("editHtml").addEventListener("click", toggleEdit);
  el("saveEditedHtml").addEventListener("click", () => saveEditedHtml().catch((error) => setStatus(error.message, "error")));
  el("downloadZip").addEventListener("click", () => downloadZip().catch((error) => setStatus(error.message, "error")));
  el("openPreviewHtml").addEventListener("click", () => state.job?.previewUrl && window.open(state.job.previewUrl, "_blank", "noopener,noreferrer"));
  el("openScrollHtml").addEventListener("click", () => state.job?.scrollUrl && window.open(state.job.scrollUrl, "_blank", "noopener,noreferrer"));
  el("previewFrame").addEventListener("load", () => {
    requestAnimationFrame(syncPreviewScale);
    setTimeout(syncPreviewScale, 100);
  });
  window.addEventListener("resize", syncPreviewScale);
  if (window.ResizeObserver) {
    const shell = el("previewFrame").closest(".preview-frame");
    if (shell) new ResizeObserver(syncPreviewScale).observe(shell);
  }
}

document.addEventListener("DOMContentLoaded", init);
