(function () {
  "use strict";

  const $ = (selector) => document.querySelector(selector);
  const state = { html: "", historyId: "", metadata: null, workbench: null, editing: false };
  const frame = $("#posterPreviewFrame");
  const shell = $("#posterPreviewShell");
  const empty = $("#posterEmpty");
  const status = $("#aiStatus");
  const resultButtons = ["toggleEdit", "savePoster", "downloadHtml", "downloadPng", "downloadWebp", "downloadPdf"];

  async function removeLegacyOrdinaryPosterHistory() {
    if (!window.PptHistory?.listRecords || !window.PptHistory?.deleteRecords) return;
    await window.PptHistory.init?.();
    const legacy = await window.PptHistory.listRecords({ source: "poster" });
    if (legacy.length) await window.PptHistory.deleteRecords(legacy.map((record) => record.id));
  }

  function safeName(value, extension) {
    const stem = String(value || "minimal-zine-poster").replace(/[\\/:*?\"<>|]+/g, "-").replace(/\s+/g, "-").slice(0, 72) || "minimal-zine-poster";
    return `${stem}.${extension}`;
  }

  function setStatus(message) { if (status) status.textContent = String(message || ""); }
  function setResultEnabled(active) { resultButtons.forEach((id) => { const button = $("#" + id); if (button) button.disabled = !active; }); }

  function download(blob, filename) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url; link.download = filename; document.body.appendChild(link); link.click(); link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1500);
  }

  function cleanExport(html) {
    try {
      const doc = new DOMParser().parseFromString(String(html || ""), "text/html");
      doc.querySelectorAll(".ppt-paged-player-nav,#ppt-paged-player-style,#ppt-paged-player-script,[data-html-deck-editor-ui]").forEach((node) => node.remove());
      doc.body.classList.remove("editing", "editor-on", "scroll-mode");
      doc.querySelectorAll("[contenteditable]").forEach((node) => node.removeAttribute("contenteditable"));
      doc.querySelectorAll(".editor-selected,.html-deck-editor-edit-visible").forEach((node) => node.classList.remove("editor-selected", "html-deck-editor-edit-visible"));
      return `<!doctype html>\n${doc.documentElement.outerHTML}`;
    } catch { return String(html || ""); }
  }

  async function currentHtml() {
    let html = state.html;
    const editor = await state.workbench?.installPromise?.catch(() => null);
    if (editor?.buildExportHtml) html = editor.buildExportHtml();
    else if (frame?.contentDocument?.documentElement) html = `<!doctype html>\n${frame.contentDocument.documentElement.outerHTML}`;
    state.html = cleanExport(html);
    return state.html;
  }

  function historyPayload() {
    const meta = state.metadata || {};
    return {
      poster: {
        version: meta.version || "MinimalZinePosterV1",
        kind: meta.kind || "minimal-zine",
        spec: meta.spec || null,
        recipe: meta.recipe || null,
        prompt: meta.prompt || "",
        quality: meta.quality || null,
        academic: meta.academic || null,
      },
    };
  }

  async function saveHistory(edited = false) {
    if (!window.PptHistory?.saveRecord || !state.html) return null;
    const meta = state.metadata || {};
    const title = meta.title || "Minimal Zine Poster";
    const record = await window.PptHistory.saveRecord({
      id: state.historyId,
      title,
      source: meta.source || "minimal-zine-poster",
      mode: meta.mode || "ai_image",
      style: meta.style || "minimal-zine",
      slideCount: 1,
      html: state.html,
      editedHtml: edited ? state.html : "",
      fileName: safeName(title, "html"),
      status: "ready",
      metadata: historyPayload(),
    });
    if (record?.id) state.historyId = record.id;
    return record;
  }

  function mount(html, metadata = {}) {
    if (!html) throw new Error("没有可预览的海报 HTML。");
    state.html = cleanExport(html);
    state.metadata = metadata;
    state.editing = false;
    if (frame) frame.srcdoc = state.html;
    if (empty) empty.hidden = true;
    shell?.classList.remove("image-mode");
    setResultEnabled(true);
    if ($("#toggleEdit")) $("#toggleEdit").textContent = "编辑";
    if ($("#posterMode")) $("#posterMode").textContent = "可编辑预览";
    if ($("#posterResultMeta")) $("#posterResultMeta").textContent = metadata.label || "Minimal Zine · 3:5 纸张";
    return saveHistory(false).catch((error) => console.warn("Could not save poster history", error));
  }

  async function mountExternal({ html, title = "学术海报", style = "conference-paper-board", job = null, metadata = null } = {}) {
    await mount(html, {
      version: "AcademicPosterV1",
      kind: "academic",
      source: "poster-academic",
      mode: job?.aiStatus?.used ? "ai_api" : "academic",
      style,
      title,
      academic: metadata || null,
      label: `${style} · 来源锁定 AI 规划 · 学术质量门`,
    });
  }

  async function setEditing(active) {
    if (!state.html) return;
    state.editing = Boolean(active);
    state.workbench?.setMode(state.editing ? "edit" : "preview", false);
    if ($("#toggleEdit")) $("#toggleEdit").textContent = state.editing ? "完成" : "编辑";
    if ($("#posterMode")) $("#posterMode").textContent = state.editing ? "正在编辑海报图层" : "可编辑预览";
  }

  async function posterNodeForExport() {
    if (!frame?.contentDocument) throw new Error("海报预览未加载。");
    const doc = frame.contentDocument;
    const node = doc.querySelector(".minimal-zine-poster,.academic-poster,.poster-slide,[data-poster-slide]") || doc.body;
    await new Promise((resolve) => window.setTimeout(resolve, 60));
    return node;
  }

  async function exportImage(format) {
    if (!window.htmlToImage) throw new Error("图片导出组件未加载。");
    const node = await posterNodeForExport();
    const blob = await window.htmlToImage.toBlob(node, { pixelRatio: 1, cacheBust: true, backgroundColor: "#f1ecdf" });
    if (!blob) throw new Error("图片导出为空。");
    download(blob, safeName(state.metadata?.title, format === "webp" ? "webp" : "png"));
  }

  async function exportPdf() {
    if (!window.htmlToImage || !window.jspdf?.jsPDF) throw new Error("PDF 导出组件未加载。");
    const node = await posterNodeForExport();
    const canvas = await window.htmlToImage.toCanvas(node, { pixelRatio: 1, cacheBust: true, backgroundColor: "#f1ecdf" });
    const pdf = new window.jspdf.jsPDF({ orientation: canvas.width >= canvas.height ? "landscape" : "portrait", unit: "px", format: [canvas.width, canvas.height] });
    pdf.addImage(canvas.toDataURL("image/png"), "PNG", 0, 0, canvas.width, canvas.height);
    pdf.save(safeName(state.metadata?.title, "pdf"));
  }

  $("#togglePosterControls")?.addEventListener("click", () => {
    const collapsed = document.body.classList.toggle("poster-controls-collapsed");
    const button = $("#togglePosterControls");
    if (button) { button.textContent = collapsed ? "▶" : "◀"; button.title = collapsed ? "展开设置栏" : "收起设置栏"; }
    requestAnimationFrame(() => state.workbench?.syncScale?.());
  });
  $("#toggleEdit")?.addEventListener("click", () => setEditing(!state.editing).catch((error) => setStatus(error.message || error)));
  $("#savePoster")?.addEventListener("click", async () => { await currentHtml(); await saveHistory(true); setStatus("海报修改已保存到首页历史记录。"); });
  $("#downloadHtml")?.addEventListener("click", async () => download(new Blob([await currentHtml()], { type: "text/html;charset=utf-8" }), safeName(state.metadata?.title, "html")));
  $("#downloadPng")?.addEventListener("click", () => { if (state.html) exportImage("png").catch((error) => setStatus(`PNG 导出失败：${error.message || error}`)); });
  $("#downloadWebp")?.addEventListener("click", () => { if (state.html) exportImage("webp").catch((error) => setStatus(`WebP 导出失败：${error.message || error}`)); });
  $("#downloadPdf")?.addEventListener("click", () => { if (state.html) exportPdf().catch((error) => setStatus(`PDF 导出失败：${error.message || error}`)); });
  frame?.addEventListener("load", () => { requestAnimationFrame(() => state.workbench?.syncScale?.()); window.setTimeout(() => state.workbench?.syncScale?.(), 100); });
  window.addEventListener("resize", () => state.workbench?.syncScale?.());
  if (window.ResizeObserver && shell) new ResizeObserver(() => state.workbench?.syncScale?.()).observe(shell);
  state.workbench = window.PptDeckWorkbench?.create({ iframe: frame, section: ".poster-preview-shell", editButton: "#toggleEdit", chatPanel: null, chatAfterLoad: false, preserveCanvasSize: true });
  setResultEnabled(false);
  removeLegacyOrdinaryPosterHistory().catch((error) => console.warn("Could not remove legacy ordinary-poster history", error));
  window.PosterStudio = { mount, mountExternal, currentHtml, setEditing, saveHistory, setStatus, getState: () => ({ ...state }) };
})();
