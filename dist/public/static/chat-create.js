const CHAT_HISTORY_KEY = "ppt-html-studio-chat-create-history-v1";
const PREVIEW_WIDTH = 1280;
const PREVIEW_HEIGHT = 720;

const CHAT_STYLE_OPTIONS = window.PptStyleRegistry?.builtinOptions?.() || (window.PptQualitySystem?.builtinStyles || ((items) => items))([
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
]);

const state = {
  messages: [],
  brief: null,
  outline: null,
  job: null,
  editing: false,
  busy: false,
  objectUrls: [],
  referencePack: window.PptReferencePack?.empty?.() || { files: [], images: [], outlineText: "", outline: [] },
  customStyles: window.PptStyleRegistry?.loadCustomStyles?.() || [],
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

const STYLE_PROFILE_PRESETS = {
  teaching: {
    styleName: "Teaching Blue",
    colorPalette: "white and pale blue canvas, navy text, clear blue accent lines",
    typography: "bold sans-serif title, readable sans-serif body",
    layoutPattern: "centered cover, title band content slides, one or two balanced columns",
    visualMotifs: "thin blue dividers, small lesson markers, light panels",
    imagePolicy: "reserve modest media zones that support the lesson, never oversized images",
    cardStyle: "light rounded teaching panels only when grouping parallel items",
    backgroundStyle: "clean white or very pale blue with high contrast",
    iconStyle: "minimal educational icons",
    spacingRules: "wide safe margins, readable line length, no crowded corners",
  },
  softlesson: {
    styleName: "Soft Lesson",
    colorPalette: "warm white, mist blue, soft slate text, gentle accent blue",
    typography: "rounded sans-serif with calm hierarchy",
    layoutPattern: "relaxed centered cover and airy content blocks",
    visualMotifs: "soft dividers, pill labels, calm blocks",
    imagePolicy: "small-to-medium images with soft crops",
    cardStyle: "very light rounded panels",
    backgroundStyle: "warm white or pale blue, no harsh contrast blocks",
    iconStyle: "simple line icons",
    spacingRules: "extra breathing room between elements",
  },
  clean: {
    styleName: "Clean",
    colorPalette: "white, black/navy text, one crisp blue accent",
    typography: "modern sans-serif with strong hierarchy",
    layoutPattern: "minimal title, precise aligned content, no decoration",
    visualMotifs: "single rule, dot, or marker per slide",
    imagePolicy: "precise image crop aligned to grid",
    cardStyle: "avoid cards unless necessary",
    backgroundStyle: "flat white with high contrast",
    iconStyle: "none or tiny monochrome icons",
    spacingRules: "tight alignment with generous whitespace",
  },
  academic: {
    styleName: "Academic",
    colorPalette: "ivory or white, dark navy, muted gold accent",
    typography: "serif title, formal readable body",
    layoutPattern: "formal title, paragraphs/lists with thin rules",
    visualMotifs: "thin academic rules, citation-like emphasis",
    imagePolicy: "figures kept proportional with captions when useful",
    cardStyle: "flat bordered evidence panels sparingly",
    backgroundStyle: "quiet ivory/white with strong dark text",
    iconStyle: "minimal or none",
    spacingRules: "structured margins and clear reading columns",
  },
  instructional: {
    styleName: "Instructional",
    colorPalette: "white, navy, instructional blue/green accents",
    typography: "clear sans-serif with action-oriented labels",
    layoutPattern: "goal, steps, practice prompt, summary",
    visualMotifs: "step markers only for real procedures",
    imagePolicy: "images explain a step or example",
    cardStyle: "process blocks for procedures",
    backgroundStyle: "clean teaching surface",
    iconStyle: "small cue icons for action",
    spacingRules: "leave room on exercise slides",
  },
  minimal: {
    styleName: "Minimal",
    colorPalette: "white, deep navy, one quiet accent",
    typography: "large concise sans-serif title, sparse body",
    layoutPattern: "one headline and one content group",
    visualMotifs: "almost none",
    imagePolicy: "one strong image or none",
    cardStyle: "no card grids",
    backgroundStyle: "plain white",
    iconStyle: "none",
    spacingRules: "large whitespace and few elements",
  },
  contrast: {
    styleName: "High Contrast",
    colorPalette: "dark navy and white with bright blue accent",
    typography: "bold sans-serif title and large body",
    layoutPattern: "strong blocks, high hierarchy, accessible contrast",
    visualMotifs: "bold section bands and clear separation",
    imagePolicy: "images framed with strong contrast boundaries",
    cardStyle: "dark/light contrast panels",
    backgroundStyle: "high contrast surfaces only",
    iconStyle: "simple high-contrast glyphs",
    spacingRules: "avoid dense text in dark areas",
  },
  healing: {
    styleName: "Healing Hand-drawn",
    colorPalette: "warm paper, pastel blue/green, soft brown text",
    typography: "gentle handwritten title, rounded readable body",
    layoutPattern: "calm centered cover, organic but aligned content",
    visualMotifs: "soft sketch dividers, light hand-drawn marks, calming shapes",
    imagePolicy: "small gentle image areas with rounded paper-like framing",
    cardStyle: "soft uneven rounded paper notes",
    backgroundStyle: "warm paper texture impression without busy patterns",
    iconStyle: "small hand-drawn calming icons",
    spacingRules: "quiet open space; never energetic doodle clutter",
  },
  doodle: {
    styleName: "Doodle Sketch",
    colorPalette: "cream/white, black marker, vivid blue accent and small color pops",
    typography: "marker-style bold headings, clean body for readability",
    layoutPattern: "playful sketch accents around a stable grid",
    visualMotifs: "arrows, stars, squiggles, hand-drawn borders used sparingly",
    imagePolicy: "images can be taped/pinned with doodle annotations",
    cardStyle: "sketchy rectangular notes, intentionally more energetic than healing",
    backgroundStyle: "clean paper with light doodle energy",
    iconStyle: "marker doodle icons",
    spacingRules: "playful but readable; no dense decoration",
  },
  swiss: {
    styleName: "Swiss Grid",
    colorPalette: "white, black/navy, international blue, sparse signal accent",
    typography: "strict sans-serif, large scale contrast",
    layoutPattern: "strong grid, asymmetric alignment, precise modules",
    visualMotifs: "grid lines, numbered markers, rectangular rules",
    imagePolicy: "images aligned to strict grid columns",
    cardStyle: "rectangular modules only, no rounded cards",
    backgroundStyle: "flat white with visible grid discipline",
    iconStyle: "geometric minimal symbols",
    spacingRules: "mathematical spacing and alignment",
  },
  editorial: {
    styleName: "Editorial",
    colorPalette: "warm white, ink navy, muted accent",
    typography: "magazine serif display title and elegant sans body",
    layoutPattern: "large headline, columns, pull quote or feature image rhythm",
    visualMotifs: "kickers, pull quotes, editorial rules",
    imagePolicy: "intentional crops with generous white space",
    cardStyle: "avoid card grids; use editorial blocks",
    backgroundStyle: "print-like warm white",
    iconStyle: "minimal editorial marks",
    spacingRules: "wide margins and magazine pacing",
  },
  vivid: {
    styleName: "Vivid",
    colorPalette: "bright blue/cyan/orange accents, dark readable text, clean base",
    typography: "bold modern display and clean body",
    layoutPattern: "large color blocks, energetic visual focus, product-like sections",
    visualMotifs: "bright blocks, strong labels, crisp highlights",
    imagePolicy: "images in confident blocks without overlap",
    cardStyle: "bold but few cards",
    backgroundStyle: "clean base with vivid accents, no heavy gradients",
    iconStyle: "simple bright icons",
    spacingRules: "energetic but uncluttered",
  },
};

function styleProfileFor(style) {
  if (window.PptQualitySystem?.profileFor) {
    const custom = Array.isArray(state.customStyles) ? state.customStyles.find((item) => item.id === style) : null;
    return window.PptQualitySystem.profileFor(style, custom || null);
  }
  return { ...(STYLE_PROFILE_PRESETS[style] || STYLE_PROFILE_PRESETS.teaching) };
}

function mergeStyleProfile(base, incoming = {}) {
  const output = { ...base };
  Object.entries(incoming || {}).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") return;
    output[key] = typeof value === "object" && !Array.isArray(value)
      ? Object.values(value).filter(Boolean).join(", ")
      : String(value);
  });
  return output;
}

function ensureStyleProfile(outline) {
  const style = outline?.style || "teaching";
  outline.styleProfile = mergeStyleProfile(styleProfileFor(style), outline?.styleProfile || outline?.style_profile || {});
  outline.layoutRules = Array.from(new Set([
    ...(window.PptQualitySystem?.layoutRules?.(style) || []),
    ...((outline.layoutRules || []).filter(Boolean)),
  ]));
  return outline;
}

function styleProfileSummary(profile) {
  return [
    ["Palette", profile.colorPalette],
    ["Typography", profile.typography],
    ["Layout", profile.layoutPattern],
    ["Motifs", profile.visualMotifs],
    ["Images", profile.imagePolicy],
    ["Spacing", profile.spacingRules],
  ];
}

function defaultBrief() {
  return {
    title: "",
    topic: "",
    audience: "",
    scenario: "",
    contentScope: "",
    slideCount: "",
    materials: "",
    style: "teaching",
    language: "Simplified Chinese",
    missingQuestions: [],
    ready: false,
    summary: "",
  };
}

function briefLine(label, value) {
  const text = String(value || "").trim();
  return text ? `${label}: ${text}` : "";
}

function briefSummaryText(brief = state.brief || defaultBrief()) {
  const lines = [
    briefLine("主题", brief.title || brief.topic),
    briefLine("受众", brief.audience),
    briefLine("场景", brief.scenario),
    briefLine("内容", brief.contentScope),
    briefLine("页数", brief.slideCount),
    briefLine("素材", brief.materials),
  ].filter(Boolean);
  if (brief.summary) lines.unshift(brief.summary);
  if (Array.isArray(brief.missingQuestions) && brief.missingQuestions.length) {
    lines.push(`待确认: ${brief.missingQuestions.join("；")}`);
  }
  return lines.join("\n") || "先通过对话确认主题、受众、页数、素材和风格。信息齐全后再生成大纲。";
}

function renderBrief(brief = state.brief || defaultBrief()) {
  state.brief = { ...defaultBrief(), ...(brief || {}) };
  const panel = el("briefSummaryPanel");
  if (!panel) return;
  const ready = Boolean(state.brief.ready);
  el("briefReadyLabel").textContent = ready ? "信息已齐全" : "继续确认需求";
  el("briefSummaryText").textContent = briefSummaryText(state.brief);
  el("startPlanning").disabled = state.busy || !hasAi() || !ready;
  if (!state.outline?.slides?.length) {
    if (state.brief.title || state.brief.topic) el("deckTitle").value = state.brief.title || state.brief.topic;
    if (state.brief.audience) el("deckAudience").value = state.brief.audience;
    if (state.brief.style && el("deckStyle").querySelector(`[value="${state.brief.style}"]`)) {
      el("deckStyle").value = state.brief.style;
    }
  }
}

function isPlanningIntent(text) {
  return /^(开始规划|出大纲|生成大纲|规划大纲|开始生成大纲|start planning|make outline|generate outline)\s*$/i.test(String(text || "").trim());
}

function setStatus(message, kind = "") {
  const node = el("statusLine");
  node.textContent = message || "";
  node.className = `status-line ${kind}`;
}

function setBusy(value, message = "", options = {}) {
  const showOverlay = options.overlay !== false;
  state.busy = Boolean(value);
  el("sendButton").disabled = state.busy || !hasAi();
  el("confirmGenerate").disabled = state.busy || !hasAi() || !state.outline?.slides?.length;
  if (el("startPlanning")) el("startPlanning").disabled = state.busy || !hasAi() || !state.brief?.ready;
  el("generationOverlay").classList.toggle("hidden", !(state.busy && showOverlay));
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
    node.innerHTML = 'AI not configured. <a href="/settings.html">Open AI Settings</a> first.';
    node.className = "ai-config-banner error";
  }
  el("sendButton").disabled = state.busy || !hasAi();
  el("confirmGenerate").disabled = state.busy || !hasAi() || !state.outline?.slides?.length;
  if (el("startPlanning")) el("startPlanning").disabled = state.busy || !hasAi() || !state.brief?.ready;
}

function pushMessage(role, content, options = {}) {
  state.messages.push({
    id: options.id || `MSG-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
    role,
    content,
    at: new Date().toISOString(),
    thinking: Boolean(options.thinking),
  });
  renderMessages();
  if (!options.transient) saveHistory();
}

function removeMessage(id) {
  state.messages = state.messages.filter((message) => message.id !== id);
  renderMessages();
}

function visibleMessagesForApi() {
  return state.messages
    .filter((message) => !message.thinking)
    .slice(-8)
    .map((message) => ({
      role: message.role,
      content: String(message.content || "").slice(0, 1200),
    }));
}

function renderMessages() {
  const box = el("messages");
  if (!state.messages.length) {
    box.innerHTML = "";
    return;
  }
  box.innerHTML = state.messages
    .map((message) => {
      const role = message.role === "user" ? "user" : "assistant";
      const label = role === "user" ? "U" : "AI";
      const thinking = message.thinking ? '<span class="thinking-dots" aria-hidden="true"><i></i><i></i><i></i></span>' : "";
      return `
        <div class="message-row ${role}${message.thinking ? " thinking" : ""}">
          <div class="message-avatar ${role}" aria-hidden="true">${label}</div>
          <div class="message ${role}">${escapeHtml(message.content)}${thinking}</div>
        </div>
      `;
    })
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
    styleProfile: styleProfileFor("teaching"),
    layoutRules: window.PptQualitySystem?.layoutRules?.("teaching") || [],
    slides: [],
  };
}

function syncOutlineFromForm() {
  const outline = state.outline || defaultOutline();
  const previousStyle = outline.style || "teaching";
  outline.title = el("deckTitle").value.trim();
  outline.audience = el("deckAudience").value.trim();
  outline.style = el("deckStyle").value;
  outline.styleProfile = mergeStyleProfile(
    outline.style !== previousStyle ? styleProfileFor(outline.style) : styleProfileFor(outline.style),
    outline.style !== previousStyle ? {} : outline.styleProfile,
  );
  outline.slides = [...document.querySelectorAll(".outline-card[data-index]")].map((card, index) => ({
    page: index + 1,
    type: card.querySelector("[data-field='type']").value,
    title: card.querySelector("[data-field='title']").value.trim(),
    goal: card.querySelector("[data-field='goal']").value.trim(),
    bullets: card.querySelector("[data-field='bullets']").value.split(/\n+/).map((item) => item.trim()).filter(Boolean),
    speakerNoteOptional: card.querySelector("[data-field='note']").value.trim(),
  })).filter((slide) => slide.title || slide.bullets.length || slide.goal);
  outline.slideCount = outline.slides.length;
  state.outline = outline;
  el("confirmGenerate").disabled = state.busy || !hasAi() || !outline.slides.length;
  saveHistory();
}

function remapOutlineForStyle(style) {
  const outline = state.outline || defaultOutline();
  const layouts = window.PptStyleRegistry?.layoutRules?.(style) || ["cover", "content", "summary"];
  const roleIndex = (slide, index, total) => {
    const role = String(slide.type || "").toLowerCase();
    if (index === 0 || /cover|title/.test(role)) return 0;
    if (index === total - 1 || /summary|close|conclusion/.test(role)) return layouts.length - 1;
    if (/agenda|transition/.test(role)) return Math.min(1, layouts.length - 1);
    if (/exercise|practice/.test(role)) return Math.min(layouts.length - 2, layouts.length - 1);
    return Math.min(2 + ((index - 1) % Math.max(1, layouts.length - 3)), layouts.length - 2);
  };
  outline.style = style;
  outline.styleProfile = styleProfileFor(style);
  outline.layoutRules = [...layouts];
  outline.slides = (outline.slides || []).map((slide, index, slides) => ({
    ...slide,
    type: layouts[Math.max(0, roleIndex(slide, index, slides.length))] || layouts[0],
  }));
  state.outline = outline;
  state.job = state.job ? { ...state.job, styleStale: true } : state.job;
  renderOutline(outline);
  setStatus(`已按 ${window.PptStyleRegistry?.get?.(style, state.customStyles)?.name || style} 重映射大纲版式；重新生成将直接使用该风格。`, "success");
}

function renderOutline(outline = state.outline || defaultOutline()) {
  state.outline = ensureStyleProfile(outline);
  outline = state.outline;
  el("deckTitle").value = outline.title || "";
  el("deckAudience").value = outline.audience || "";
  el("deckStyle").value = outline.style || "teaching";
  renderChatStyleSwatches();
  const cards = el("outlineCards");
  const slides = Array.isArray(outline.slides) ? outline.slides : [];
  document.querySelector(".outline-panel")?.classList.toggle("has-outline", slides.length > 0);
  document.querySelector(".outline-panel")?.style.setProperty("--outline-count", `"${slides.length} 页"`);
  const slideCards = slides.map((slide, index) => `
    <article class="outline-card" data-index="${index}">
      <div class="outline-card-top">
        <span class="page-number">${index + 1}</span>
        <select data-field="type">
          ${["Cover", "Agenda", "Content", "Transition", "Summary", "Exercise"].map((type) => `<option value="${type}" ${String(slide.type || "").toLowerCase() === type.toLowerCase() ? "selected" : ""}>${type}</option>`).join("")}
        </select>
        <button class="icon-mini" type="button" data-move="-1">Up</button>
        <button class="icon-mini" type="button" data-move="1">Down</button>
      </div>
      <label>页面标题 <input data-field="title" type="text" value="${escapeHtml(slide.title || "")}"></label>
      <label>页面目标 <textarea data-field="goal" rows="2">${escapeHtml(slide.goal || "")}</textarea></label>
      <label>关键要点 <textarea data-field="bullets" rows="5">${escapeHtml((slide.bullets || []).join("\n"))}</textarea></label>
      <label>讲稿备注 <textarea data-field="note" rows="2">${escapeHtml(slide.speakerNoteOptional || "")}</textarea></label>
      <button class="icon-mini" type="button" data-delete>Delete page</button>
    </article>
  `).join("") || '<div class="outline-empty">点击“开始规划”后，这里会显示可编辑的每页大纲卡片。</div>';
  cards.innerHTML = slideCards;
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
  renderBrief();
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
  if (isPlanningIntent(content)) {
    await startPlanningFromBrief();
    return;
  }
  const thinkingId = `THINK-${Date.now().toString(36)}`;
  try {
    setBusy(true, "", { overlay: false });
    pushMessage("assistant", "AI 思考中...", { id: thinkingId, thinking: true, transient: true });
    setStatus("AI 思考中...");
    const integration = window.PptAiConfig.loadAiConfig();
    await window.PptAiConfig.syncAiConfig(integration).catch(() => {});
    const response = await fetch("/api/chat-brief", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        messages: visibleMessagesForApi(),
        brief: state.brief,
        style: el("deckStyle").value,
        referencePack: window.PptReferencePack?.apiPayload?.(state.referencePack) || null,
        integration,
      }),
    });
    const data = await readJsonResponse(response);
    if (!response.ok) throw new Error(data.message || data.error || "Brief confirmation failed.");
    const assistantText = [data.assistantText, ...(data.questions || []).map((q, i) => `${i + 1}. ${q}`)].filter(Boolean).join("\n\n");
    removeMessage(thinkingId);
    state.brief = data.brief || state.brief || defaultBrief();
    pushMessage("assistant", assistantText || briefSummaryText(state.brief));
    renderBrief(state.brief);
    setStatus(data.ready ? "Brief ready. Click Start Planning to generate the outline." : "Brief updated. Keep chatting to confirm missing information.", "ok");
    saveHistory();
  } catch (error) {
    removeMessage(thinkingId);
    pushMessage("assistant", `I could not confirm the brief: ${error.message || error}`);
    setStatus(error.message || "Brief confirmation failed.", "error");
  } finally {
    setBusy(false);
  }
}

async function startPlanningFromBrief() {
  if (!hasAi()) {
    setStatus("Please configure AI first.", "error");
    return;
  }
  if (!state.brief?.ready) {
    pushMessage("assistant", "信息还没有确认完整。请先补充页数、素材、受众或使用场景，再开始规划。");
    renderBrief();
    return;
  }
  const thinkingId = `PLAN-${Date.now().toString(36)}`;
  try {
    setBusy(true, "AI is generating the editable outline...", { overlay: false });
    pushMessage("assistant", "AI 思考中...", { id: thinkingId, thinking: true, transient: true });
    setStatus("AI 思考中...");
    const integration = window.PptAiConfig.loadAiConfig();
    await window.PptAiConfig.syncAiConfig(integration).catch(() => {});
    const response = await fetch("/api/chat-create-outline", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        messages: visibleMessagesForApi(),
        brief: state.brief,
        outline: state.outline,
        style: el("deckStyle").value,
        referencePack: window.PptReferencePack?.apiPayload?.(state.referencePack) || null,
        integration,
        mode: "generate_outline",
      }),
    });
    const data = await readJsonResponse(response);
    if (!response.ok) throw new Error(data.message || data.error || "Outline generation failed.");
    removeMessage(thinkingId);
    const assistantText = [data.assistantText, ...(data.questions || []).map((q, i) => `${i + 1}. ${q}`)].filter(Boolean).join("\n\n");
    pushMessage("assistant", assistantText || "大纲已生成。你可以编辑右侧页面卡片，然后确认生成。");
    if (!data.outline?.slides?.length) throw new Error("outline_empty");
    renderOutline(data.outline);
    setStatus("Outline ready. Edit the cards if needed, then generate HTML.", "ok");
    saveHistory();
  } catch (error) {
    removeMessage(thinkingId);
    pushMessage("assistant", "大纲生成遇到接口异常，请再次点击“开始规划”。如果仍失败，请先减少要求或检查 AI 配置。");
    setStatus("大纲生成失败，请重试。", "error");
  } finally {
    setBusy(false);
  }
}

function outlineToTopicPlan(outline) {
  outline = ensureStyleProfile(outline || defaultOutline());
  const style = outline.style || "teaching";
  const customStyle = Array.isArray(state.customStyles) ? state.customStyles.find((item) => item.id === style) || null : null;
  const styleLayoutRules = window.PptQualitySystem?.layoutRules?.(style) || [];
  return {
    title: outline.title || "Chat Created Presentation",
    audience: outline.audience || "",
    goal: outline.goal || "",
    tone: outline.tone || "clear, modern, educational",
    palette: outline.palette || {},
    typography: outline.typography || {},
    style,
    styleProfile: outline.styleProfile,
    qualityContract: window.PptQualitySystem?.promptContract?.(style, {
      source: "chat-create",
      slideCount: outline.slides?.length || 0,
      customStyle,
    }) || "",
    layoutRules: [
      ...styleLayoutRules,
      "Keep every slide in a fixed 16:9 canvas.",
      "Center cover/title slide titles both horizontally and vertically.",
      "Use strong text/background contrast and keep every element inside safe margins.",
      "The structured style profile is binding: translate palette, typography, layout pattern, motifs and image policy into visible CSS/layout.",
      "Do not ask for images or create image placeholders in chat-created decks unless the user's provided content explicitly includes real image assets.",
    ],
    slides: (outline.slides || []).map((slide, index) => ({
      page: index + 1,
      title: slide.title,
      layout: slide.type || styleLayoutRules[index % Math.max(1, styleLayoutRules.length)] || "Content",
      visualFocus: slide.goal || "",
      body: slide.bullets || [],
      speakerNote: slide.speakerNoteOptional || "",
      styleProfile: outline.styleProfile,
    })),
  };
}

function createObjectUrl(html) {
  const url = URL.createObjectURL(new Blob([html], { type: "text/html;charset=utf-8" }));
  state.objectUrls.push(url);
  return url;
}

function normalizeDeckHtmlForEditor(html) {
  return window.PptDeckWorkbench?.normalizeHtml
    ? window.PptDeckWorkbench.normalizeHtml(html)
    : String(html || "");
}

function makePagedHtmlPlayable(html) {
  return window.PptDeckWorkbench?.makePagedHtmlPlayable
    ? window.PptDeckWorkbench.makePagedHtmlPlayable(html)
    : String(html || "");
}

function ensureDownloadablePagedHtml(html) {
  const firstPass = makePagedHtmlPlayable(html);
  if (/id=["']ppt-paged-player-script["']/.test(firstPass)) return firstPass;
  const retry = makePagedHtmlPlayable(normalizeDeckHtmlForEditor(firstPass));
  if (/id=["']ppt-paged-player-script["']/.test(retry)) return retry;
  throw new Error("Could not add the standalone page navigation runtime to the exported HTML.");
}

function makePreviewHtml(html) {
  return window.PptDeckWorkbench?.makePreviewHtml
    ? window.PptDeckWorkbench.makePreviewHtml(html)
    : makePagedHtmlPlayable(html);
}

function createPreviewObjectUrl(html) {
  return createObjectUrl(makePreviewHtml(html));
}

function loadPreviewFrame(job) {
  const frame = el("previewFrame");
  if (!frame || !job) return;
  const inlineHtml = job.inlinePreviewHtmlCache || "";
  if (inlineHtml) {
    const normalizedHtml = normalizeDeckHtmlForEditor(inlineHtml);
    if (normalizedHtml && normalizedHtml !== inlineHtml) {
      job.inlinePreviewHtmlCache = normalizedHtml;
      job.previewUrl = createPreviewObjectUrl(normalizedHtml);
    }
    frame.removeAttribute("src");
    frame.srcdoc = makePreviewHtml(normalizedHtml);
    return;
  }
  frame.removeAttribute("srcdoc");
  frame.src = job.previewUrl || "about:blank";
}

function hydrateJob(job) {
  const output = { ...job };
  if (output.inlinePreviewHtml) {
    output.inlinePreviewHtmlCache = normalizeDeckHtmlForEditor(output.inlinePreviewHtml);
    output.previewUrl = createPreviewObjectUrl(output.inlinePreviewHtmlCache);
    delete output.inlinePreviewHtml;
  }
  if (output.inlineScrollHtml) {
    output.inlineScrollHtmlCache = output.inlineScrollHtml;
    output.scrollUrl = createObjectUrl(output.inlineScrollHtml);
    delete output.inlineScrollHtml;
  }
  return output;
}

function makeScrollHtmlFromPaged(html) {
  if (window.PptDeckWorkbench?.makeScrollHtmlFromPaged) {
    return window.PptDeckWorkbench.makeScrollHtmlFromPaged(html);
  }
  if (!html) return "";
  let output = String(html);
  if (/<body\b/i.test(output)) {
    output = output.replace(/<body([^>]*)>/i, (match, attrs) => {
      if (/class\s*=/.test(attrs)) {
        return `<body${attrs.replace(/class\s*=\s*["']([^"']*)["']/i, (classMatch, classes) => `class="${classes} scroll-mode"`)}>`;
      }
      return `<body${attrs} class="scroll-mode">`;
    });
  }
  return output.replace(/<\/head>/i, `<style>body.scroll-mode{overflow:auto!important}.scroll-mode .slide{display:block!important;position:relative!important;opacity:1!important;visibility:visible!important;margin:0 auto 24px!important}.scroll-mode .nav,.scroll-mode .deck-nav{display:none!important}</style></head>`);
}

function renderJob(job) {
  state.job = hydrateJob(job);
  state.editing = false;
  loadPreviewFrame(state.job);
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
    if (!window.PptAiProgress?.run) throw new Error("AI progress runner is not available. Refresh the page and try again.");
    const style = state.outline.style || el("deckStyle").value;
    const customStyle = Array.isArray(state.customStyles) ? state.customStyles.find((item) => item.id === style) || null : null;
    const stylePrompt = window.PptQualitySystem?.stylePrompt?.(style, customStyle) || "";
    const implementationGuide = window.PptQualitySystem?.implementationGuide?.(style, customStyle) || "";
    const stylePack = window.PptStyleRegistry?.stylePackFor?.(style, customStyle) || null;
    const data = await window.PptAiProgress.run({
      filename: `${state.outline.title || "chat-presentation"}.html`,
      slides: plan.slides,
      style,
      stylePack,
      customStyle,
      integration,
      source: "chat-create",
      mode: "chat-create",
      sourceBrief: [
        `Create a polished presentation titled ${state.outline.title}.`,
        `Audience: ${state.outline.audience || "general audience"}.`,
        `Selected style contract: ${stylePrompt}`,
        `Selected style implementation: ${implementationGuide}`,
        `Conversation brief:\n${state.messages.map((m) => `${m.role}: ${m.content}`).join("\n").slice(0, 12000)}`,
        "Use the confirmed conversation outline as the content source and keep its order and facts.",
      ].join("\n"),
      referencePack: window.PptReferencePack?.apiPayload?.(state.referencePack) || null,
      topicPlan: plan,
      onProgress: (progress) => setStatus(`${progress.message || "AI is generating HTML..."} ${Math.round(progress.percent)}%`),
    });
    if (!data.job) throw new Error("AI 已返回内容，但预览 Job 尚未创建完成。");
    renderJob(data.job);
    window.PptAiProgress?.updateProgress({ percent: 100, phase: "已完成", message: "HTML 已生成，预览结果已准备好。", completedPages: plan.slides.length, totalPages: plan.slides.length });
    await saveChatDeckHistoryRecord(state.job);
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
  state.workbench?.setMode(state.editing ? "edit" : "preview", true);
  el("editHtml").textContent = state.editing ? "Stop Editing" : "Edit HTML";
}

async function captureEditedHtml() {
  state.workbench?.prepareExport?.();
  const win = previewWindow();
  if (win?.exportEditedHtml) {
    const wasEditing = Boolean(previewDocument()?.body?.classList.contains("editing"));
    const output = {
      pagedHtml: ensureDownloadablePagedHtml(await win.exportEditedHtml("paged")),
      scrollHtml: "",
    };
    output.scrollHtml = makeScrollHtmlFromPaged(output.pagedHtml);
    if (wasEditing) state.workbench?.restoreAfterExport?.();
    return output;
  }
  const doc = previewDocument();
  if (!doc) throw new Error("Preview is not ready.");
  const html = `<!doctype html>${doc.documentElement.outerHTML}`;
  const pagedHtml = ensureDownloadablePagedHtml(html);
  return { pagedHtml, scrollHtml: makeScrollHtmlFromPaged(pagedHtml) };
}

async function persistEditedHtml() {
  if (!state.job) return null;
  const captured = await captureEditedHtml();
  const normalizedPaged = normalizeDeckHtmlForEditor(captured.pagedHtml);
  const playablePaged = makePagedHtmlPlayable(normalizedPaged);
  const scrollHtml = makeScrollHtmlFromPaged(playablePaged);
  state.job.inlinePreviewHtmlCache = normalizedPaged;
  state.job.inlineScrollHtmlCache = scrollHtml;
  state.job.previewUrl = createPreviewObjectUrl(normalizedPaged);
  state.job.scrollUrl = createObjectUrl(scrollHtml);
  if (state.job.historyRecordId && window.PptHistory) {
    try {
      await window.PptHistory.saveEditedHtml(state.job.historyRecordId, captured.pagedHtml, captured.scrollHtml);
    } catch (error) {
      console.warn("Could not update chat create history", error);
    }
  }
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
    const pagedHtml = makePagedHtmlPlayable(captured.pagedHtml);
    const scrollHtml = makeScrollHtmlFromPaged(pagedHtml);
    const zip = new window.JSZip();
    zip.file("index.html", pagedHtml);
    zip.file("index-scroll.html", scrollHtml);
    zip.file("index-single-file.html", pagedHtml);
    zip.file("index-scroll-single-file.html", scrollHtml);
    zip.file("README-open.txt", "Open index.html for paged navigation, or index-scroll.html for continuous scrolling.\nThis ZIP contains the latest edited HTML.\n");
    const blob = await zip.generateAsync({ type: "blob" });
    triggerBlobDownload(blob, `${state.job.id || "chat-created-ppt"}.zip`);
  } else {
    triggerBlobDownload(new Blob([captured.pagedHtml], { type: "text/html;charset=utf-8" }), "index.html");
  }
  setStatus("Downloaded ZIP with the latest edited content.", "ok");
}

function historyRecordIdFromUrl() {
  const params = new URLSearchParams(window.location.search);
  return params.get("history") || sessionStorage.getItem("ppt-html-studio-open-history-id") || "";
}

function shouldOpenHistoryInEditMode() {
  const params = new URLSearchParams(window.location.search);
  return params.get("edit") === "1" || sessionStorage.getItem("ppt-html-studio-open-history-edit") === "1";
}

async function saveChatDeckHistoryRecord(job) {
  if (!window.PptHistory || !job) return null;
  try {
    const pagedHtml = job.inlinePreviewHtmlCache || "";
    const scrollHtml = job.inlineScrollHtmlCache || (pagedHtml ? makeScrollHtmlFromPaged(pagedHtml) : "");
    if (!pagedHtml) return null;
    const title = state.outline?.title || window.PptHistory.titleFromHtml(pagedHtml) || job.fileName || "Chat-created deck";
    const record = await window.PptHistory.saveRecord({
      id: job.historyRecordId || "",
      title,
      source: "chat_create",
      mode: "chat_ai",
      style: state.outline?.style || el("deckStyle")?.value || "chat",
      slideCount: Number(state.outline?.slides?.length || job.slides || window.PptHistory.detectSlideCount(pagedHtml) || 0),
      thumbnail: window.PptHistory.thumbnailFromHtml?.(pagedHtml, title, "chat_create", state.outline?.style || "chat") || window.PptHistory.createThumbnail(title, "chat_create", state.outline?.style || "chat"),
      html: pagedHtml,
      scrollHtml: scrollHtml || pagedHtml,
      fileName: job.fileName || `${title}.html`,
      status: "ready",
      metadata: {
        outline: state.outline || null,
        messageCount: state.messages.length,
        summary: state.messages.slice(-8),
      },
    });
    state.job.historyRecordId = record.id;
    return record;
  } catch (error) {
    console.warn("Could not save chat create history", error);
    return null;
  }
}

function chatJobFromHistoryRecord(record) {
  const html = record.editedHtml || record.html || "";
  return hydrateJob({
    id: `HISTORY-${record.id}`,
    historyRecordId: record.id,
    fileName: record.fileName || record.title || "Chat history deck",
    slides: record.slideCount || window.PptHistory?.detectSlideCount?.(html) || 0,
    style: record.style || "chat",
    status: record.status || "ready",
    updatedAt: new Date(record.updatedAt || Date.now()).toISOString(),
    previewUrl: "",
    scrollUrl: "",
    downloadUrl: "",
    inlinePreviewHtml: html,
    inlineScrollHtml: record.scrollHtml || makeScrollHtmlFromPaged(html),
  });
}

async function restoreChatDeckHistoryFromUrl() {
  const historyId = historyRecordIdFromUrl();
  if (!historyId || !window.PptHistory) return;
  try {
    await window.PptHistory.init();
    const record = await window.PptHistory.getRecord(historyId);
    if (!record) throw new Error("History record not found.");
    renderJob(chatJobFromHistoryRecord(record));
    if (record.metadata?.outline) {
      state.outline = record.metadata.outline;
      renderOutline(state.outline);
    }
    if (shouldOpenHistoryInEditMode()) {
      setTimeout(() => {
        if (!state.editing) toggleEdit();
      }, 500);
    }
    sessionStorage.removeItem("ppt-html-studio-open-history-id");
    sessionStorage.removeItem("ppt-html-studio-open-history-edit");
    setStatus("Local history record opened.", "ok");
  } catch (error) {
    setStatus(error.message || "Could not open local history.", "error");
  }
}

function syncPreviewScale() {
  const frame = el("previewFrame");
  const shell = frame?.closest(".preview-frame");
  if (!frame || !shell) return;
  if (state.workbench?.syncScale) {
    state.workbench.syncScale();
    return;
  }
  if (window.PptDeckWorkbench?.fitSlideToViewport) {
    window.PptDeckWorkbench.fitSlideToViewport(shell, shell, PREVIEW_WIDTH, PREVIEW_HEIGHT);
    return;
  }
  const rect = shell.getBoundingClientRect();
  const scale = Math.min(rect.width / PREVIEW_WIDTH, rect.height / PREVIEW_HEIGHT, 1);
  shell.style.setProperty("--preview-scale", String(Math.max(.22, scale)));
}

function loadHistory() {
  return safeJsonParse(localStorage.getItem(CHAT_HISTORY_KEY) || "[]", []) || [];
}

function isSubstantiveMessage(message) {
  if (!message || message.thinking || message.role !== "user") return false;
  return String(message.content || "").trim().length >= 2;
}

function isMeaningfulText(value) {
  const text = String(value || "").trim();
  if (!text) return false;
  return !new Set(["presentation title", "new key idea", "deck title"]).has(text.toLowerCase());
}

function hasSubstantiveOutline(outline) {
  if (!outline) return false;
  if (isMeaningfulText(outline.title) || isMeaningfulText(outline.audience) || isMeaningfulText(outline.goal)) return true;
  return (outline.slides || []).some((slide) =>
    isMeaningfulText(slide.title) ||
    isMeaningfulText(slide.goal) ||
    (slide.bullets || []).some(isMeaningfulText),
  );
}

function hasSubstantiveSession() {
  return Boolean(
    state.job ||
    state.messages.some(isSubstantiveMessage) ||
    hasSubstantiveOutline(state.outline),
  );
}

function isSubstantiveHistoryItem(item) {
  return Boolean(
    item?.job ||
    (item?.messages || []).some(isSubstantiveMessage) ||
    hasSubstantiveOutline(item?.outline),
  );
}

function saveHistory() {
  const history = loadHistory()
    .filter((item) => item.id !== state.sessionId)
    .filter(isSubstantiveHistoryItem);
  if (!hasSubstantiveSession()) {
    localStorage.setItem(CHAT_HISTORY_KEY, JSON.stringify(history.slice(0, 12)));
    return;
  }
  history.unshift({
    id: state.sessionId,
    title: state.outline?.title || state.messages.find((m) => m.role === "user")?.content?.slice(0, 60) || "New chat",
    updatedAt: new Date().toISOString(),
    messages: state.messages,
    brief: state.brief,
    outline: state.outline,
  });
  localStorage.setItem(CHAT_HISTORY_KEY, JSON.stringify(history.slice(0, 12)));
}

function renderHistory() {
  const list = el("historyList");
  const history = loadHistory().filter(isSubstantiveHistoryItem);
  localStorage.setItem(CHAT_HISTORY_KEY, JSON.stringify(history.slice(0, 12)));
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
    state.brief = item.brief || defaultBrief();
    state.outline = item.outline || defaultOutline();
    renderMessages();
    renderOutline(state.outline);
    renderBrief(state.brief);
    list.classList.add("hidden");
  }));
}

function newChat() {
  state.sessionId = `CHAT-${Date.now().toString(36).toUpperCase()}`;
  state.messages = [{
    role: "assistant",
    content: "先告诉我主题、受众、使用场景、页数、素材和风格偏好。我会先确认信息，等你说“开始规划”后再生成大纲。",
    at: new Date().toISOString(),
  }];
  state.brief = defaultBrief();
  state.outline = defaultOutline();
  renderMessages();
  renderOutline(state.outline);
  renderBrief(state.brief);
  renderHistory();
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
    speakerNoteOptional: "",
  });
  renderOutline(state.outline);
}

function initDeckStyleOptions() {
  const select = el("deckStyle");
  if (!select) return;
  const current = select.value || "teaching";
  const options = window.PptStyleRegistry?.allOptions?.(state.customStyles) || CHAT_STYLE_OPTIONS;
  select.innerHTML = options
    .map(([value, label]) => `<option value="${value}">${label}</option>`)
    .join("");
  select.value = options.some(([value]) => value === current) ? current : "teaching";
  renderChatStyleSwatches();
}

function renderChatStyleSwatches() {
  const root = el("chatStyleSwatches");
  const select = el("deckStyle");
  if (!root || !select) return;
  const current = window.PptStyleRegistry?.get?.(select.value, state.customStyles);
  const meta = window.PptStyleRegistry?.previewMeta?.(select.value, state.customStyles) || {};
  root.innerHTML = `<button type="button" class="compact-style-current" data-preview-current style="--style-bg:${meta.swatches?.[0] || "#f8fbff"};--style-ink:${meta.swatches?.[1] || "#17213f"};--style-accent:${meta.swatches?.[2] || "#2563eb"}"><span class="compact-style-art"><i></i><b></b></span><span><strong>${current?.name || select.value}</strong><small>预览当前风格</small></span></button><button type="button" class="compact-style-change" data-open-style-picker>选择风格</button>`;
  root.querySelector("[data-preview-current]")?.addEventListener("click", () => window.PptStyleRegistry?.openPreview?.(select.value, state.customStyles));
  root.querySelector("[data-open-style-picker]")?.addEventListener("click", () => window.PptStyleRegistry?.openPicker?.({
    selected: select.value,
    customStyles: state.customStyles,
    onSelect: (nextStyle) => {
      if (nextStyle === select.value) return;
      select.value = nextStyle;
      remapOutlineForStyle(nextStyle);
    },
  }));
}

function init() {
  initDeckStyleOptions();
  if (window.PptReferencePack) {
    state.referencePackController = window.PptReferencePack.attach({
      input: el("referenceInput"),
      list: el("referenceFiles"),
      initial: state.referencePack,
      onChange: (pack, error) => {
        if (error) {
          setStatus(error.message || "Could not read reference material.", "error");
          return;
        }
        state.referencePack = pack;
        if (pack.outlineText && !state.messages.some((message) => message.content === `已上传大纲素材：${pack.outlineText.slice(0, 80)}`)) {
          pushMessage("user", `已上传大纲素材：${pack.outlineText.slice(0, 80)}`);
        }
      },
    });
  }
  newChat();
  refreshAiStatus();
  el("chatForm").addEventListener("submit", sendMessage);
  el("confirmGenerate").addEventListener("click", generateHtml);
  el("startPlanning").addEventListener("click", startPlanningFromBrief);
  el("addSlide").addEventListener("click", addSlide);
  el("deckTitle").addEventListener("input", syncOutlineFromForm);
  el("deckAudience").addEventListener("input", syncOutlineFromForm);
  el("deckStyle").addEventListener("change", () => remapOutlineForStyle(el("deckStyle").value));
  el("newChatButton").addEventListener("click", newChat);
  el("historyButton").addEventListener("click", () => {
    renderHistory();
    el("historyList").classList.toggle("hidden");
  });
  document.addEventListener("click", (event) => {
    if (!event.target.closest(".chat-history-menu")) {
      el("historyList")?.classList.add("hidden");
    }
  });
  el("closeGenerationOverlay").addEventListener("click", () => el("generationOverlay").classList.add("hidden"));
  el("editHtml").addEventListener("click", toggleEdit);
  el("saveEditedHtml").addEventListener("click", () => saveEditedHtml().catch((error) => setStatus(error.message, "error")));
  el("downloadZip").addEventListener("click", () => downloadZip().catch((error) => setStatus(error.message, "error")));
  el("openPreviewHtml").addEventListener("click", () => {
    if (!state.job) return;
    captureEditedHtml()
      .then((captured) => window.open(createObjectUrl(window.PptDeckWorkbench?.buildStandalonePreviewHtml ? window.PptDeckWorkbench.buildStandalonePreviewHtml(captured.pagedHtml) : makePreviewHtml(captured.pagedHtml)), "_blank", "noopener,noreferrer"))
      .catch((error) => {
        console.warn("Could not build playable preview; opening cached preview.", error);
        if (state.job?.previewUrl) window.open(state.job.previewUrl, "_blank", "noopener,noreferrer");
      });
  });
  el("openScrollHtml").addEventListener("click", () => state.job?.scrollUrl && window.open(state.job.scrollUrl, "_blank", "noopener,noreferrer"));
  el("previewFrame").addEventListener("load", () => {
    try {
      el("previewFrame").contentWindow?.scrollTo?.(0, 0);
      const doc = el("previewFrame").contentDocument;
      if (doc) {
        doc.documentElement.scrollTop = 0;
        doc.body.scrollTop = 0;
      }
    } catch {}
    requestAnimationFrame(syncPreviewScale);
    setTimeout(syncPreviewScale, 100);
  });
  window.addEventListener("resize", syncPreviewScale);
  if (window.ResizeObserver) {
    const shell = el("previewFrame").closest(".preview-frame");
    if (shell) new ResizeObserver(syncPreviewScale).observe(shell);
  }
  state.workbench = window.PptDeckWorkbench?.create({
    iframe: "#previewFrame",
    section: ".chat-workbench",
    editButton: "#editHtml",
    chatAfterLoad: true,
  });
  restoreChatDeckHistoryFromUrl().catch((error) => console.warn("Could not restore chat deck history", error));
}

document.addEventListener("DOMContentLoaded", init);

