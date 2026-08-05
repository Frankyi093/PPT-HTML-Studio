(function () {
  "use strict";

  let activeController = null;
  let lastPercent = 0;
  let dismissed = false;

  function node(id) { return document.getElementById(id); }

  function ensureReopen() {
    let button = node("generationReopen");
    if (!button) {
      button = document.createElement("button");
      button.type = "button";
      button.id = "generationReopen";
      button.className = "generation-reopen hidden";
      button.textContent = "生成中 · 查看进度";
      button.addEventListener("click", () => {
        dismissed = false;
        ensureOverlay().classList.remove("hidden");
        button.classList.add("hidden");
      });
      document.body.appendChild(button);
    }
    return button;
  }

  function ensureOverlay() {
    let overlay = node("generationOverlay");
    if (!overlay) {
      overlay = document.createElement("div");
      overlay.id = "generationOverlay";
      overlay.className = "generation-overlay hidden";
      document.body.appendChild(overlay);
    }
    const card = overlay.querySelector(".generation-card") || overlay;
    if (!card.querySelector("#generationTitle")) {
      const title = document.createElement("strong");
      title.id = "generationTitle";
      title.textContent = "正在生成 HTML 演示";
      card.appendChild(title);
    }
    if (!card.querySelector("#generationMessage")) {
      const message = document.createElement("p");
      message.id = "generationMessage";
      message.textContent = "准备生成任务";
      card.appendChild(message);
    }
    if (!card.querySelector("#aiProgressPhase")) {
      const meta = document.createElement("div");
      meta.className = "ai-progress-meta";
      meta.innerHTML = '<span id="aiProgressPhase">准备中</span><strong id="aiProgressPercent">0%</strong>';
      card.appendChild(meta);
    }
    if (!card.querySelector("#aiProgressPages")) {
      const pages = document.createElement("p");
      pages.className = "ai-progress-pages";
      pages.id = "aiProgressPages";
      pages.textContent = "已完成 0 / 0 页";
      card.appendChild(pages);
    }
    const legacyTrack = card.querySelector(".generation-progress");
    if (legacyTrack) {
      legacyTrack.id = "aiProgressTrack";
      legacyTrack.setAttribute("role", "progressbar");
      legacyTrack.setAttribute("aria-valuemin", "0");
      legacyTrack.setAttribute("aria-valuemax", "100");
      legacyTrack.querySelector("span")?.setAttribute("id", "aiProgressBar");
    } else if (!card.querySelector("#aiProgressTrack")) {
      const track = document.createElement("div");
      track.className = "ai-progress-track";
      track.id = "aiProgressTrack";
      track.setAttribute("role", "progressbar");
      track.innerHTML = '<span id="aiProgressBar"></span>';
      card.appendChild(track);
    }
    if (!card.dataset.progressWired) {
      card.dataset.progressWired = "1";
      const close = card.querySelector("#generationClose, #closeGenerationOverlay");
      close?.addEventListener("click", () => {
        dismissed = true;
        overlay.classList.add("hidden");
        ensureReopen().classList.remove("hidden");
      });
      card.querySelector("#generationStop")?.addEventListener("click", () => {
        if (window.confirm("确认停止生成？已经完成的页面会保留。")) activeController?.abort("user_cancelled");
      });
    }
    return overlay;
  }

  function updateProgress({ percent = 0, phase = "生成中", message = "", completedPages = 0, totalPages = 0, title = "", indeterminate = false } = {}) {
    const overlay = ensureOverlay();
    if (!dismissed) overlay.classList.remove("hidden");
    const value = Math.max(lastPercent, Math.min(100, Math.round(Number(percent) || 0)));
    lastPercent = value;
    const set = (id, text) => { const target = node(id); if (target) target.textContent = text; };
    set("generationTitle", title || "正在生成 HTML 演示");
    set("generationMessage", message);
    set("aiProgressPhase", phase);
    set("aiProgressPercent", indeterminate ? "—" : `${value}%`);
    set("aiProgressPages", `已完成 ${completedPages} / ${totalPages} 页`);
    const bar = node("aiProgressBar");
    if (bar) bar.style.width = indeterminate ? "100%" : `${value}%`;
    const track = node("aiProgressTrack");
    if (track) {
      track.setAttribute("aria-valuenow", String(value));
      track.toggleAttribute("data-indeterminate", indeterminate);
    }
  }

  function resetProgress() {
    lastPercent = 0;
    dismissed = false;
    ensureReopen().classList.add("hidden");
  }

  function parseSse(buffer, onEvent, flush = false) {
    const blocks = String(buffer || "").split(/\r?\n\r?\n/);
    const rest = flush ? "" : (blocks.pop() || "");
    for (const block of blocks) {
      if (!block.trim()) continue;
      const event = block.match(/^event:\s*(.+)$/m)?.[1]?.trim() || "message";
      const data = block.split(/\r?\n/).filter((line) => /^data\s*:/.test(line))
        .map((line) => line.replace(/^data\s*:\s?/, "")).join("\n").trim();
      if (!data) continue;
      try { onEvent(event, JSON.parse(data)); }
      catch (error) { if (event === "error" || event === "complete") throw error; }
    }
    return rest;
  }

  function previewHtml(streamed) {
    const source = String(streamed || "");
    const start = source.search(/<!doctype\s+html|<html[\s>]/i);
    if (start < 0) return "";
    const html = source.slice(start);
    return /<\/html>/i.test(html) ? html : `${html}\n</body>\n</html>`;
  }

  function makeScrollHtml(html) {
    let output = String(html || "");
    if (/<body\b[^>]*class="/i.test(output)) output = output.replace(/<body\b([^>]*?)class="([^"]*)"/i, (all, before, cls) => `<body${before}class="${cls} scroll-mode"`);
    else if (/<body\b/i.test(output)) output = output.replace(/<body\b([^>]*)>/i, '<body$1 class="scroll-mode">');
    const style = '<style id="ppt-scroll-export-style">body.scroll-mode{overflow:auto!important}body.scroll-mode .slide,body.scroll-mode section,body.scroll-mode section[data-slide-page],body.scroll-mode [data-slide-page]{display:block!important;visibility:visible!important;opacity:1!important;min-height:100vh}body.scroll-mode .ppt-runtime-nav,body.scroll-mode .nav{display:none!important}</style>';
    return /ppt-scroll-export-style/i.test(output) ? output : (/<\/head>/i.test(output) ? output.replace(/<\/head>/i, `${style}</head>`) : `${style}${output}`);
  }

  async function responseError(response) {
    let raw = "";
    try { raw = await response.text(); } catch { /* ignore */ }
    if (response.status === 1102 || /Worker exceeded resource limits|error\s*1102/i.test(raw)) {
      const error = new Error("Cloudflare Worker 达到资源上限（1102）。本次请求未完成，已避免重复提交；请稍后重试。");
      error.code = "worker_resource_limit";
      return error;
    }
    if (/<html[\s>]/i.test(raw) && /cloudflare/i.test(raw)) {
      const error = new Error(`生成服务返回了 Cloudflare 错误（HTTP ${response.status}），请重试。`);
      error.code = "cloudflare_error";
      return error;
    }
    let message = raw;
    try { message = JSON.parse(raw)?.message || JSON.parse(raw)?.error || raw; } catch { /* plain text */ }
    const error = new Error(String(message || `AI 请求失败（HTTP ${response.status}）`).slice(0, 1200));
    error.code = "ai_http_error";
    return error;
  }

  async function hydrateFromOutput(job, base, signal) {
    if (!job || job.inlinePreviewHtml || !job.previewUrl) return job;
    const absolute = new URL(job.previewUrl, base || window.location.href).href;
    const response = await fetch(absolute, { signal, cache: "no-store" });
    if (!response.ok) return job;
    job.inlinePreviewHtml = await response.text();
    if (!job.inlineScrollHtml && job.scrollUrl) {
      const scroll = await fetch(new URL(job.scrollUrl, base || window.location.href).href, { signal, cache: "no-store" });
      if (scroll.ok) job.inlineScrollHtml = await scroll.text();
    }
    return job;
  }

  async function run(options = {}) {
    const slides = Array.isArray(options.slides) ? options.slides : [];
    if (!slides.length) throw new Error("没有可生成的页面内容。");
    const controller = new AbortController();
    activeController = controller;
    resetProgress();
    updateProgress({ percent: 1, phase: "准备中", message: "正在连接 HTML Anything 流式生成", totalPages: slides.length, title: options.title || "正在生成 HTML 演示" });
    const base = String(options.apiBaseUrl || window.location.origin).replace(/\/+$/, "");
    const url = `${base}/api/html-anything/convert/stream`;
    let result = null;
    let streamedHtml = "";
    let buffer = "";
    let completed = 0;
    const handle = (event, data) => {
      const pages = Array.isArray(data.pages) ? data.pages.length : 0;
      if (event === "accepted") updateProgress({ percent: 2, phase: "已接收", message: `已接收 ${data.totalPages || slides.length} 页，等待设计阶段完成。`, totalPages: slides.length });
      if (event === "design_started") updateProgress({ percent: 5, phase: "设计中", message: data.message || "正在锁定风格和页面结构。", totalPages: slides.length });
      if (event === "design_ready") updateProgress({ percent: 10, indeterminate: true, phase: "设计规范已完成", message: "已锁定风格与页面规则，等待模型正文。", totalPages: slides.length });
      if (event === "batch_started") updateProgress({ percent: Number(data.progress) || lastPercent, indeterminate: data.phase === "provider_waiting", phase: data.phase === "provider_waiting" ? "等待模型响应" : "生成页面", message: data.message || `正在生成第 ${data.batch || ""} 批页面`, completedPages: completed, totalPages: slides.length });
      if (event === "provider_first_token") updateProgress({ percent: Math.max(lastPercent, 12), indeterminate: true, phase: "模型正在输出", message: "已收到模型正文，正在组装页面。", completedPages: completed, totalPages: slides.length });
      if (event === "html_delta") {
        const chunk = String(data.html || "");
        streamedHtml = data.delta ? streamedHtml + chunk : chunk;
        const partial = previewHtml(streamedHtml);
        if (partial && typeof options.onPartialHtml === "function") options.onPartialHtml(partial);
      }
      if (event === "pages_ready") {
        completed = Math.max(completed, Number(data.completedPages || 0), completed + pages);
        updateProgress({ percent: data.progress || Math.round(12 + (completed / Math.max(1, slides.length)) * 76), phase: "页面完成", message: "页面已通过单页验证。", completedPages: completed, totalPages: slides.length });
      }
      if (event === "quality_check") updateProgress({ percent: data.progress || 96, phase: "质量检查", message: data.message || "正在检查独立 HTML、页面数和资源。", completedPages: completed, totalPages: slides.length });
      if (event === "heartbeat") updateProgress({ percent: lastPercent, indeterminate: true, phase: data.phase || "等待模型响应", message: data.message || "连接仍然存活，等待真实阶段事件。", completedPages: completed, totalPages: slides.length });
      if (event === "complete") {
        result = data;
        updateProgress({ percent: 100, phase: "完成", message: "生成与质量检查已完成。", completedPages: slides.length, totalPages: slides.length });
      }
      if (event === "error") {
        const error = new Error(data.message || "AI 生成失败");
        error.code = data.code || "ai_generation_error";
        throw error;
      }
    };
    try {
      const response = await fetch(url, {
        method: "POST",
        headers: { "content-type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({ ...options, slides, integration: options.integration || {}, sourceBrief: options.sourceBrief || options.topic || "" }),
      });
      if (!response.ok) throw await responseError(response);
      const reader = response.body?.getReader();
      if (!reader) throw new Error("浏览器不支持流式生成。");
      const decoder = new TextDecoder();
      while (true) {
        const part = await reader.read();
        if (part.done) break;
        buffer += decoder.decode(part.value, { stream: true });
        buffer = parseSse(buffer, handle);
      }
      buffer += decoder.decode();
      if (buffer.trim()) parseSse(`${buffer}\n\n`, handle, true);
      if (!result?.job) throw new Error("流式响应未返回可用任务；生成内容已保留，请重试。");
      const job = { ...result.job };
      if (!job.inlinePreviewHtml && streamedHtml) job.inlinePreviewHtml = previewHtml(streamedHtml);
      if (!job.inlineScrollHtml && job.inlinePreviewHtml) job.inlineScrollHtml = makeScrollHtml(job.inlinePreviewHtml);
      result.job = await hydrateFromOutput(job, base, controller.signal);
      return result;
    } catch (error) {
      if (error?.name === "AbortError" || error?.message === "user_cancelled" || controller.signal.aborted) {
        const cancelled = new Error("已停止生成");
        cancelled.code = "generation_cancelled";
        throw cancelled;
      }
      throw error;
    } finally {
      if (activeController === controller) activeController = null;
      node("generationOverlay")?.classList.add("hidden");
      ensureReopen().classList.add("hidden");
    }
  }

  // Word documents are parsed in the browser and can contain dozens of
  // semantic pages. Keep the existing quick/chat single-request contract
  // untouched; Word alone uses one provider request per bounded page window.
  function extractWordSections(html) {
    const source = String(html || "");
    const matches = source.match(/<section\b[^>]*class=["'][^"']*\bslide\b[^"']*["'][\s\S]*?<\/section>/gi);
    return matches || [];
  }

  function escapeWordHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  const wordRecoveryStyle = `<style id="ppt-html-anything-word-recovery">
    section.html-anything-skill-fallback{width:1280px;height:720px;box-sizing:border-box;overflow:hidden;padding:54px 62px;display:grid;grid-template-rows:auto 1fr auto;gap:22px;background:var(--word-recovery-bg);color:var(--word-recovery-text);font-family:var(--word-recovery-font)}
    .word-recovery-meta{display:flex;justify-content:space-between;gap:18px;border-bottom:1px solid currentColor;padding-bottom:13px;font-size:18px;letter-spacing:.12em;text-transform:uppercase;font-weight:700;opacity:.72}.word-recovery-shell{align-self:center;display:grid;gap:22px;max-width:1080px}.word-recovery-shell h2{font-size:64px;line-height:1.03;letter-spacing:-.045em;margin:0}.word-recovery-shell p{font-size:28px;line-height:1.3;margin:0}.word-recovery-shell ul{padding:0;margin:0;list-style:none;display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px 36px;font-size:24px;line-height:1.32}.word-recovery-shell li{padding-top:12px;border-top:2px solid var(--word-recovery-primary)}.word-recovery-folio{font-size:18px;letter-spacing:.1em;opacity:.68}
    .ha-skill-swiss{background-image:linear-gradient(rgba(0,47,167,.08) 1px,transparent 1px),linear-gradient(90deg,rgba(0,47,167,.08) 1px,transparent 1px);background-size:80px 80px}.ha-skill-swiss .word-recovery-shell{border-left:18px solid var(--word-recovery-primary);padding-left:82px}.ha-skill-swiss .word-recovery-shell h2{text-transform:uppercase;font-size:76px}.ha-skill-swiss *{border-radius:0!important;box-shadow:none!important}
    .ha-skill-guizang .word-recovery-shell h2{font-family:'Playfair Display','Noto Serif SC',Georgia,serif;font-size:72px;font-weight:500}.ha-skill-guizang.ha-act-divider{--word-recovery-bg:#0a0a0b;--word-recovery-text:#f1efea;--word-recovery-primary:#e8e5de}.ha-skill-blueprint{background-image:linear-gradient(rgba(53,210,255,.13) 1px,transparent 1px),linear-gradient(90deg,rgba(53,210,255,.13) 1px,transparent 1px);background-size:48px 48px}.ha-skill-blueprint .word-recovery-shell{padding:36px;border:1px solid var(--word-recovery-primary)}.ha-skill-course .word-recovery-shell{padding:34px 40px;border:2px solid var(--word-recovery-primary);background:#fff}.ha-skill-course .word-recovery-shell li{padding:16px 18px;border:0;background:#eef4ff}
  </style>`;

  function safeWordColor(value, fallback) {
    return /^#[0-9a-f]{6}$/i.test(String(value || "")) ? String(value) : fallback;
  }

  function fallbackWordSection(slide, pageNumber, designSpec = null) {
    const title = escapeWordHtml(slide?.title || `Word page ${pageNumber}`);
    const points = (Array.isArray(slide?.body) ? slide.body : [])
      .concat(slide?.takeaway ? [slide.takeaway] : [])
      .map((value) => String(value || "").trim())
      .filter(Boolean)
      .slice(0, 6);
    const bullets = points.length ? points : [String(slide?.visualFocus || "该页内容已依据已确认大纲保留，可继续编辑。")];
    const tokens = designSpec?.tokens || designSpec?.colors || {};
    const skillId = String(designSpec?.skillId || "deck-open-slide-canvas");
    const presets = {
      "deck-swiss-international": ["swiss", "#f7f7f3", "#0a0a0a", "#002fa7", "'Inter Tight','Noto Sans SC','Microsoft YaHei',Arial,sans-serif", ["grid-cover", "asymmetric-grid", "number-grid"]],
      "deck-guizang-editorial": ["guizang", "#f1efea", "#0a0a0b", "#6b665b", "'Playfair Display','Noto Serif SC',Georgia,serif", ["L01-hero-cover", "L02-act-divider", "L03-big-numbers"]],
      "deck-blueprint": ["blueprint", "#071426", "#e6f7ff", "#35d2ff", "'JetBrains Mono','Noto Sans SC','Microsoft YaHei',monospace", ["blueprint-cover", "architecture-map", "process-flow"]],
      "deck-course-module": ["course", "#f8fbff", "#102a43", "#155eef", "'Inter','Noto Sans SC','Microsoft YaHei',Arial,sans-serif", ["lesson-cover", "step-grid", "recap"]],
    }[skillId] || ["canvas", safeWordColor(tokens.background, "#0a0e1a"), safeWordColor(tokens.text, "#f5f5f7"), safeWordColor(tokens.primary, "#5ac8fa"), "'Inter Tight','Noto Sans SC','Microsoft YaHei',Arial,sans-serif", ["canvas-cover", "claim", "split"]];
    const [profile, background, text, primary, font, layouts] = presets;
    const layout = pageNumber === 1 ? layouts[0] : layouts[(pageNumber - 1) % layouts.length];
    const style = `--word-recovery-bg:${background};--word-recovery-text:${text};--word-recovery-primary:${primary};--word-recovery-font:${font};`;
    const modifier = profile === "guizang" && pageNumber % 5 === 0 ? " ha-act-divider" : "";
    return `<section class="slide html-anything-skill-fallback ha-skill-${profile}${modifier}" style="${style}" data-html-anything-skill="${escapeWordHtml(skillId)}" data-layout-id="${escapeWordHtml(layout)}" data-slide-page="${pageNumber}" data-source-page="${pageNumber}"><header class="word-recovery-meta"><span>${escapeWordHtml(skillId.replace(/^deck-/, ""))}</span><span>${escapeWordHtml(layout)}</span></header><div class="word-recovery-shell"><h2>${title}</h2>${slide?.takeaway ? `<p>${escapeWordHtml(slide.takeaway)}</p>` : ""}<ul>${bullets.map((item) => `<li>${escapeWordHtml(item)}</li>`).join("")}</ul></div><footer class="word-recovery-folio">${String(pageNumber).padStart(2, "0")} / SOURCE-GROUNDED</footer></section>`;
  }

  function normalizeWordSection(section, pageNumber) {
    const opening = String(section || "").match(/^<section\b[^>]*>/i)?.[0];
    if (!opening) return String(section || "");
    const cleaned = opening
      .replace(/\sdata-slide-index\s*=\s*["'][^"']*["']/gi, "")
      .replace(/\sdata-slide-page\s*=\s*["'][^"']*["']/gi, "")
      .replace(/\sdata-source-page\s*=\s*["'][^"']*["']/gi, "");
    return String(section).replace(opening, cleaned.replace(/>\s*$/i, ` data-slide-page="${pageNumber}" data-source-page="${pageNumber}">`));
  }

  function recoverWordWindow(html, pages, pageStart, designSpec = null) {
    const source = String(html || "");
    const expected = Array.isArray(pages) ? pages.length : 0;
    let sections = extractWordSections(source).slice(0, expected).map((section, index) => /word-partial-recovery/i.test(section)
      ? fallbackWordSection(pages[index] || {}, pageStart + index, designSpec)
      : normalizeWordSection(section, pageStart + index));
    const missing = [];
    for (let index = sections.length; index < expected; index += 1) missing.push(fallbackWordSection(pages[index] || {}, pageStart + index, designSpec));
    let normalizedSource = source;
    let cursor = 0;
    if (sections.length) normalizedSource = source.replace(/<section\b[^>]*class=["'][^"']*\bslide\b[^"']*["'][\s\S]*?<\/section>/gi, (section) => cursor < sections.length ? sections[cursor++] : "");
    if (missing.length) normalizedSource = mergeWordWindow(normalizedSource, missing);
    if (!normalizedSource.trim()) normalizedSource = `<!doctype html><html><head>${wordRecoveryStyle}</head><body>${missing.join("\n")}</body></html>`;
    else if (missing.length && !normalizedSource.includes('id="ppt-html-anything-word-recovery"')) normalizedSource = normalizedSource.replace(/<\/head\s*>/i, `${wordRecoveryStyle}</head>`);
    return { html: normalizedSource, sections: [...sections, ...missing], recovered: missing.length > 0 };
  }

  function mergeWordWindow(firstHtml, sections, additionalHtml = "") {
    const source = String(firstHtml || "");
    const existingPages = new Set([...source.matchAll(/data-slide-page=["'](\d+)["']/gi)].map((match) => match[1]));
    const uniqueSections = (Array.isArray(sections) ? sections : []).filter((section) => {
      const page = String(section || "").match(/data-slide-page=["'](\d+)["']/i)?.[1] || "";
      if (!page || existingPages.has(page)) return false;
      existingPages.add(page);
      return true;
    });
    let merged = source;
    const styles = [...String(additionalHtml || "").matchAll(/<style\b[^>]*>[\s\S]*?<\/style>/gi)].map((match) => match[0]);
    if (styles.length) {
      const uniqueStyles = styles.filter((style) => !merged.includes(style));
      if (uniqueStyles.length) {
        if (/<\/head\s*>/i.test(merged)) merged = merged.replace(/<\/head\s*>/i, `${uniqueStyles.join("\n")}\n</head>`);
        else merged = `${uniqueStyles.join("\n")}\n${merged}`;
      }
    }
    if (!uniqueSections.length) return merged;
    const insertion = `\n${uniqueSections.join("\n")}\n`;
    if (/<\/main\s*>/i.test(merged)) return merged.replace(/<\/main\s*>/i, `${insertion}</main>`);
    if (/<\/body\s*>/i.test(merged)) return merged.replace(/<\/body\s*>/i, `${insertion}</body>`);
    return `${merged}${insertion}`;
  }

  function openWordCheckpointDb() {
    if (!window.indexedDB) return Promise.resolve(null);
    return new Promise((resolve) => {
      const request = indexedDB.open("ppt-html-word-v2", 1);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains("windows")) db.createObjectStore("windows", { keyPath: "key" });
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => resolve(null);
    });
  }

  async function saveWordCheckpoint(record) {
    const db = await openWordCheckpointDb();
    if (!db) return;
    await new Promise((resolve) => {
      const tx = db.transaction("windows", "readwrite");
      tx.objectStore("windows").put(record);
      tx.oncomplete = resolve;
      tx.onerror = resolve;
    });
    db.close();
  }

  async function runWord(options = {}) {
    const slides = Array.isArray(options.slides) ? options.slides : [];
    if (!slides.length) throw new Error("没有可生成的 Word 页面内容。");
    const controller = new AbortController();
    activeController = controller;
    resetProgress();
    const totalPages = slides.length;
    const windowSize = Number(options.windowSize) > 0 ? Number(options.windowSize) : (totalPages > 36 ? 5 : totalPages > 16 ? 4 : 3);
    const windows = [];
    for (let start = 0; start < totalPages; start += windowSize) windows.push({ start, pages: slides.slice(start, start + windowSize) });
    const base = String(options.apiBaseUrl || window.location.origin).replace(/\/+$/, "");
    const generationId = options.generationId || `WORD-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
    const completedWindows = [];
    let firstHtml = "";
    let merged = "";
    updateProgress({ percent: 1, phase: "准备 Word 汇报", message: `按 ${windows.length} 个页面窗口生成，不改变内容和风格规则。`, totalPages, title: options.title || "正在生成 Word HTML 演示" });
    try {
      for (let index = 0; index < windows.length; index += 1) {
        const windowInfo = windows[index];
        const pageStart = windowInfo.pages[0]?.page || windowInfo.start + 1;
        const pageEnd = windowInfo.pages[windowInfo.pages.length - 1]?.page || pageStart + windowInfo.pages.length - 1;
        updateProgress({ percent: Math.round((windowInfo.start / totalPages) * 92), phase: "等待模型响应", message: `正在生成第 ${pageStart}-${pageEnd} 页`, completedPages: windowInfo.start, totalPages, indeterminate: true, title: options.title || "正在生成 Word HTML 演示" });
        let result = null;
        let streamed = "";
        let buffer = "";
        const handle = (event, data) => {
          if (event === "accepted") updateProgress({ percent: Math.max(lastPercent, 2), phase: "已接受", message: `窗口 ${index + 1}/${windows.length} 已开始`, completedPages: windowInfo.start, totalPages });
          if (event === "provider_first_token") updateProgress({ percent: Math.max(lastPercent, 4), phase: "模型正在输出", message: `窗口 ${index + 1}/${windows.length} 正在排版`, completedPages: windowInfo.start, totalPages, indeterminate: true });
          if (event === "html_delta") {
            const chunk = String(data.html || "");
            streamed = data.delta ? streamed + chunk : chunk;
            const partial = previewHtml(streamed);
            if (partial && typeof options.onPartialHtml === "function") options.onPartialHtml(partial);
          }
          if (event === "pages_ready") updateProgress({ percent: Math.round(((windowInfo.start + windowInfo.pages.length) / totalPages) * 92), phase: "窗口完成", message: `已完成 ${windowInfo.start + windowInfo.pages.length}/${totalPages} 页`, completedPages: windowInfo.start + windowInfo.pages.length, totalPages });
          if (event === "complete") result = data;
          if (event === "error") { const error = new Error(data.message || "Word 窗口生成失败"); error.code = data.code || "word_window_error"; throw error; }
        };
        const response = await fetch(`${base}/api/word-deck/v3/render/window/stream`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          signal: controller.signal,
          body: JSON.stringify({ ...options, source: "word-converter", wordWindowOnly: true, wordV3: true, slides: windowInfo.pages, pageStart, pageEnd, totalPages, generationId, windowIndex: index }),
        });
        if (!response.ok) throw await responseError(response);
        const reader = response.body?.getReader();
        if (!reader) throw new Error("浏览器不支持 Word 流式生成。");
        const decoder = new TextDecoder();
        while (true) {
          const part = await reader.read();
          if (part.done) break;
          buffer += decoder.decode(part.value, { stream: true });
          buffer = parseSse(buffer, handle);
        }
        buffer += decoder.decode();
        if (buffer.trim()) parseSse(`${buffer}\n\n`, handle, true);
        const rawHtml = streamed || result?.job?.inlinePreviewHtml || "";
        const recovered = recoverWordWindow(rawHtml, windowInfo.pages, pageStart, options.designSpec);
        let html = recovered.html;
        let sections = recovered.sections;
        // recoverWordWindow always supplies deterministic fallback sections for
        // missing provider pages.  Keep the completed window and continue;
        // never discard an otherwise usable Word document because a late
        // provider response was empty or partial.
        if (!sections.length && windowInfo.pages.length) {
          const fallback = windowInfo.pages.map((page, offset) => fallbackWordSection(page || {}, pageStart + offset, options.designSpec));
          html = mergeWordWindow(html, fallback, html); sections = fallback;
        }
        if (!firstHtml) { firstHtml = html; merged = html; }
        else merged = mergeWordWindow(merged, sections, html);
        const checkpoint = { key: `${generationId}:${index}`, generationId, windowIndex: index, pageStart, pageEnd, html, sections, recovered: recovered.recovered, savedAt: Date.now() };
        completedWindows.push(checkpoint);
        await saveWordCheckpoint(checkpoint);
        if (typeof options.onPartialHtml === "function") options.onPartialHtml(merged);
      }
      updateProgress({ percent: 96, phase: "质量检查", message: "正在检查页面数量与独立 HTML 结构", completedPages: totalPages, totalPages });
      const actualPages = extractWordSections(merged).length;
      // Page-count diagnostics must not discard a mostly completed Word job.
      // Each window has already been recovered independently; if a provider
      // adds/removes a wrapper section, keep the usable document and expose a
      // non-blocking diagnostic instead of turning the whole job into an error.
      if (actualPages !== totalPages) {
        updateProgress({ percent: 98, phase: "已保留可用页面", message: `页面检查提示：已收到 ${actualPages}/${totalPages} 页，保留已生成内容。`, completedPages: Math.min(actualPages, totalPages), totalPages, warning: "word-page-count" });
      }
      const job = { id: generationId, fileName: options.filename || "word-document.docx", slides: totalPages, source: "converter", mode: "converter", status: "completed", inlinePreviewHtml: merged, inlineScrollHtml: makeScrollHtml(merged), previewMode: "blob", aiStatus: { used: true, generationMode: "word-windowed-v4-html-anything-skill", windows: completedWindows.length, degradedPages: Math.max(0, totalPages - actualPages), designSpecVersion: options.designSpec?.version || "DeckDesignSpecV2", skillId: options.designSpec?.skillId || "deck-open-slide-canvas" } };
      updateProgress({ percent: 100, phase: "完成", message: "Word 汇报已生成", completedPages: totalPages, totalPages });
      return { job };
    } catch (error) {
      error.completedWindows = completedWindows.length;
      error.generationId = generationId;
      throw error;
    } finally {
      if (activeController === controller) activeController = null;
      node("generationOverlay")?.classList.add("hidden");
      ensureReopen().classList.add("hidden");
    }
  }

  window.PptAiProgress = {
    run,
    runWord,
    updateProgress,
    resetProgress,
    ensureOverlay,
    previewHtml,
    cancel: () => activeController?.abort("user_cancelled"),
  };
})();
