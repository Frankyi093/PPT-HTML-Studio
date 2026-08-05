(function () {
  "use strict";
  const $ = (id) => document.getElementById(id);
  const input = $("fileInput");
  const panel = $("pdfAcademicPanel");
  if (!input || !panel || !window.pdfjsLib) return;

  window.pdfjsLib.GlobalWorkerOptions.workerSrc = "/static/pdf.worker.min.js";
  const DB_NAME = "ppt-html-academic-v1";
  const STORE_PROJECTS = "projects";
  const STORE_ASSETS = "assets";
  const state = { file: null, pdf: null, projectId: "", pages: [], figures: [], source: null, plan: null, html: "", objectUrls: [] };
  const status = $("pdfAcademicStatus");
  const figuresRoot = $("pdfAcademicFigures");
  const options = $("pdfAcademicOptions");
  const generate = $("runPdfAcademic");
  const download = $("downloadPdfAcademic");

  const clean = (value, max = 7000) => String(value || "").replace(/\s+/g, " ").trim().slice(0, max);
  const mode = () => document.querySelector('input[name="pdfMode"]:checked')?.value || "preserve";
  const setStatus = (message, kind = "") => { status.textContent = message; status.dataset.kind = kind; };
  const id = () => `academic-${Date.now().toString(36)}-${crypto.randomUUID().slice(0, 6)}`;
  const assetRef = (_projectId, assetId) => `asset://pdf-academic/${assetId}`;

  function openDb() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, 1);
      request.onupgradeneeded = () => {
        const database = request.result;
        if (!database.objectStoreNames.contains(STORE_PROJECTS)) database.createObjectStore(STORE_PROJECTS, { keyPath: "id" });
        if (!database.objectStoreNames.contains(STORE_ASSETS)) database.createObjectStore(STORE_ASSETS, { keyPath: "id" });
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error || new Error("无法打开学术项目存储。"));
    });
  }
  async function put(store, value) {
    const db = await openDb();
    return new Promise((resolve, reject) => { const tx = db.transaction(store, "readwrite"); tx.objectStore(store).put(value); tx.oncomplete = () => resolve(value); tx.onerror = () => reject(tx.error); });
  }
  async function get(store, key) {
    const db = await openDb();
    return new Promise((resolve, reject) => { const tx = db.transaction(store, "readonly"); const request = tx.objectStore(store).get(key); request.onsuccess = () => resolve(request.result || null); request.onerror = () => reject(request.error); });
  }
  async function saveAsset(blob, name) {
    const assetId = `${state.projectId}:${crypto.randomUUID()}`;
    await put(STORE_ASSETS, { id: assetId, projectId: state.projectId, blob, name, createdAt: new Date().toISOString() });
    return assetRef(state.projectId, assetId);
  }
  async function materializeAssets(html) {
    const refs = Array.from(new Set(String(html || "").match(/asset:\/\/pdf-academic\/[^"'<>\s)]+/g) || []));
    let output = String(html || "");
    for (const ref of refs) {
      const key = ref.split("/").pop();
      const asset = await get(STORE_ASSETS, key);
      if (!asset?.blob) throw new Error(`资源 ${key} 无法读取。`);
      const url = URL.createObjectURL(asset.blob);
      state.objectUrls.push(url);
      output = output.split(ref).join(url);
    }
    return output;
  }
  function revokeUrls() { state.objectUrls.splice(0).forEach((url) => URL.revokeObjectURL(url)); }
  function canvasBlob(canvas, type = "image/png") { return new Promise((resolve) => canvas.toBlob((blob) => resolve(blob), type, .92)); }
  function dataUrl(blob) { return new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(reader.result); reader.onerror = reject; reader.readAsDataURL(blob); }); }

  async function pageRecord(pdf, pageNumber) {
    const page = await pdf.getPage(pageNumber);
    const viewport = page.getViewport({ scale: 1 });
    const content = await page.getTextContent({ normalizeWhitespace: true });
    const items = content.items.map((item) => ({ text: clean(item.str, 500), x: Number(item.transform?.[4] || 0), y: viewport.height - Number(item.transform?.[5] || 0), width: Number(item.width || 0), height: Number(item.height || 0) })).filter((item) => item.text);
    const text = clean(items.sort((a, b) => Math.abs(a.y - b.y) < 4 ? a.x - b.x : a.y - b.y).map((item) => item.text).join(" "), 8000);
    return { page, pageNumber, viewport, items, text, title: clean(text.split(/(?<=[.!?。])\s/)[0] || "", 180) };
  }
  function candidates(record) {
    const hits = [];
    const pattern = /^(?:figure|fig\.|图\s*\d+|table|表\s*\d+)/i;
    record.items.filter((item) => pattern.test(item.text)).forEach((caption, index) => {
      const top = Math.max(0, caption.y - record.viewport.height * .42);
      const bottom = Math.min(record.viewport.height, caption.y + Math.max(28, caption.height * 2));
      hits.push({ id: `fig-${record.pageNumber}-${index + 1}`, page: record.pageNumber, caption: clean(caption.text, 360), crop: { x: 0, y: top, width: record.viewport.width, height: Math.max(80, bottom - top) }, selected: true });
    });
    return hits;
  }
  async function renderCrop(record, crop, scale = 1.2) {
    const viewport = record.page.getViewport({ scale });
    const canvas = document.createElement("canvas");
    canvas.width = Math.ceil(viewport.width); canvas.height = Math.ceil(viewport.height);
    await record.page.render({ canvasContext: canvas.getContext("2d", { alpha: false }), viewport, background: "white" }).promise;
    const factor = viewport.width / record.viewport.width;
    const out = document.createElement("canvas");
    out.width = Math.max(1, Math.floor(crop.width * factor)); out.height = Math.max(1, Math.floor(crop.height * factor));
    out.getContext("2d").drawImage(canvas, Math.floor(crop.x * factor), Math.floor(crop.y * factor), out.width, out.height, 0, 0, out.width, out.height);
    return out;
  }
  async function renderPage(record, scale = 1.35) {
    return renderCrop(record, { x: 0, y: 0, width: record.viewport.width, height: record.viewport.height }, scale);
  }
  async function renderFigureChoices() {
    figuresRoot.innerHTML = "";
    for (const figure of state.figures) {
      const record = state.pages.find((page) => page.pageNumber === figure.page);
      const thumb = await renderCrop(record, figure.crop, .52);
      const blob = await canvasBlob(thumb);
      const label = document.createElement("label"); label.className = "pdf-figure-choice";
      const checkbox = document.createElement("input"); checkbox.type = "checkbox"; checkbox.checked = figure.selected;
      checkbox.addEventListener("change", () => { figure.selected = checkbox.checked; });
      const image = document.createElement("img"); image.src = await dataUrl(blob); image.alt = figure.caption;
      const text = document.createElement("span"); text.textContent = `${figure.caption || figure.id} · p.${figure.page}`;
      label.append(checkbox, image, text); figuresRoot.append(label);
    }
    figuresRoot.hidden = !state.figures.length;
  }
  async function parsePdf(file) {
    setStatus("正在本地解析 PDF 文本与图表位置…");
    const bytes = new Uint8Array(await file.arrayBuffer());
    state.projectId = id(); state.pdf = await window.pdfjsLib.getDocument({ data: bytes, disableRange: true, disableStream: true }).promise;
    state.pages = []; state.figures = [];
    for (let number = 1; number <= state.pdf.numPages; number += 1) {
      const record = await pageRecord(state.pdf, number); state.pages.push(record); state.figures.push(...candidates(record));
      setStatus(`已解析第 ${number}/${state.pdf.numPages} 页；正在识别图表与图注。`);
    }
    if (!state.pages.some((page) => page.text)) { setStatus("扫描型 PDF 未检测到文本层：可使用“原样还原”，学术重构需补充可提取文本。", "warning"); }
    else setStatus(`已解析 ${state.pdf.numPages} 页，发现 ${state.figures.length} 个候选图表。` , "ok");
    await renderFigureChoices();
    await put(STORE_PROJECTS, { id: state.projectId, sourceFile: file.name, createdAt: new Date().toISOString(), kind: "pdf" });
  }
  async function buildSource() {
    const selected = state.figures.filter((figure) => figure.selected);
    const figures = [];
    for (let index = 0; index < selected.length; index += 1) {
      const candidate = selected[index]; const record = state.pages.find((page) => page.pageNumber === candidate.page);
      setStatus(`正在生成已选图表 ${index + 1}/${selected.length} 的高清裁剪。`);
      const crop = await renderCrop(record, candidate.crop, 1.45);
      const ref = await saveAsset(await canvasBlob(crop), `${candidate.id}.png`);
      figures.push({ id: candidate.id, page: candidate.page, caption: candidate.caption, assetRef: ref, kind: "figure" });
    }
    const title = clean(state.pages[0]?.title || state.file.name.replace(/\.pdf$/i, ""), 220);
    state.source = { title, authors: $("pdfAcademicAuthors").value.trim(), institution: $("pdfAcademicInstitution").value.trim(), sourceFile: state.file.name, language: document.documentElement.lang?.startsWith("en") ? "en" : "zh", pages: state.pages.map((page) => ({ page: page.pageNumber, title: page.title, text: page.text })), figures, tables: [], text: state.pages.map((page) => page.text).join("\n") };
    return state.source;
  }
  function integration() { return window.PptAiConfig?.loadAiConfig?.() || {}; }
  async function readSse(endpoint, payload, handler) {
    const response = await fetch(endpoint, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(payload) });
    if (!response.ok) throw new Error((await response.text()) || `HTTP ${response.status}`);
    const reader = response.body.getReader(); const decoder = new TextDecoder(); let buffer = "";
    while (true) { const { done, value } = await reader.read(); if (done) break; buffer += decoder.decode(value, { stream: true }); const chunks = buffer.split("\n\n"); buffer = chunks.pop() || ""; chunks.forEach((chunk) => { const event = chunk.match(/^event:\s*(.+)$/m)?.[1] || "message"; const raw = chunk.match(/^data:\s*(.+)$/m)?.[1] || "{}"; handler(event, JSON.parse(raw)); }); }
  }
  async function preview(html) {
    revokeUrls(); const resolved = await materializeAssets(html); state.html = html;
    const frame = $("previewFrame"); const empty = $("previewEmpty"); const blob = new Blob([resolved], { type: "text/html" }); const url = URL.createObjectURL(blob); state.objectUrls.push(url); frame.src = url; empty?.classList.add("hidden");
    download.disabled = false;
  }
  async function preservePdf() {
    setStatus("正在逐页渲染原样 PDF 页面…");
    const pages = [];
    for (let index = 0; index < state.pages.length; index += 1) { const record = state.pages[index]; const ref = await saveAsset(await canvasBlob(await renderPage(record, 1.35)), `page-${record.pageNumber}.png`); pages.push({ page: record.pageNumber, ref, text: record.text }); setStatus(`正在渲染原样页面 ${index + 1}/${state.pages.length}。`); }
    const first = state.pages[0]?.viewport || { width: 595, height: 842 };
    const html = `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=${Math.round(first.width)},initial-scale=1"><style>html,body{margin:0;background:#20242a;font-family:Arial,sans-serif}.pdf-page{position:relative;width:${Math.round(first.width)}px;min-height:${Math.round(first.height)}px;margin:24px auto;background:#fff;box-shadow:0 8px 30px #0008}.pdf-page img{display:block;width:100%;height:auto}.pdf-text-layer{position:absolute;inset:0;opacity:0;white-space:pre-wrap;user-select:text}</style></head><body>${pages.map((page) => `<section class="pdf-page" data-slide-page="${page.page}"><img src="${page.ref}" alt="PDF page ${page.page}"><div class="pdf-text-layer">${page.text.replace(/[&<>]/g, "")}</div></section>`).join("")}</body></html>`;
    await preview(html); setStatus(`已原样生成 ${pages.length} 页 PDF HTML。`, "ok");
  }
  async function rebuildAcademic() {
    const source = await buildSource();
    if (!source.text.trim()) throw new Error("扫描型 PDF 没有可提取文本，当前不支持 OCR；请使用原样还原。\n");
    const optionsValue = { style: $("pdfAcademicStyle").value, slideCount: Number($("pdfAcademicSlideCount").value) || 8 };
    setStatus("正在建立来源锁定的学术演示结构…");
    await readSse("/api/pdf-academic/plan/stream", { source, options: optionsValue, integration: integration() }, (event, data) => { if (event === "stage") setStatus(data.message); if (event === "error") throw new Error(data.message); if (event === "complete") state.plan = data.plan; });
    if (!state.plan) throw new Error("未收到学术结构。\n");
    setStatus("正在渲染学术页面并执行来源、溢出与图表检查…");
    await readSse("/api/pdf-academic/render/stream", { source, plan: state.plan, options: optionsValue, integration: integration() }, async (event, data) => { if (event === "stage") setStatus(data.message); if (event === "partial_ready") await preview(data.html); if (event === "complete") { await preview(data.html); setStatus(`已生成 ${data.plan.slides.length} 页来源锁定的学术演示。`, "ok"); } if (event === "error") throw new Error(data.message); });
  }
  async function run() { if (!state.file || !state.pdf) throw new Error("请先选择 PDF。\n"); generate.disabled = true; try { if (mode() === "preserve") await preservePdf(); else await rebuildAcademic(); } catch (error) { setStatus(String(error.message || error), "error"); } finally { generate.disabled = false; } }
  function downloadHtml() { if (!state.html) return; const link = document.createElement("a"); link.href = URL.createObjectURL(new Blob([state.html], { type: "text/html;charset=utf-8" })); link.download = `${state.file.name.replace(/\.pdf$/i, "")}-${mode()}.html`; link.click(); setTimeout(() => URL.revokeObjectURL(link.href), 1000); }
  function isPdf(file) { return Boolean(file && (/\.pdf$/i.test(file.name) || file.type === "application/pdf")); }
  function showPdfUi(show) { panel.classList.toggle("hidden", !show); document.body.classList.toggle("pdf-academic-active", show); }

  document.addEventListener("change", async (event) => { const file = event.target?.files?.[0]; if (!isPdf(file)) return; event.stopImmediatePropagation(); state.file = file; showPdfUi(true); try { await parsePdf(file); } catch (error) { setStatus(`PDF 解析失败：${String(error.message || error)}`, "error"); } }, true);
  document.addEventListener("drop", async (event) => { const file = event.dataTransfer?.files?.[0]; if (!isPdf(file)) return; event.preventDefault(); event.stopImmediatePropagation(); input.files = event.dataTransfer.files; state.file = file; showPdfUi(true); try { await parsePdf(file); } catch (error) { setStatus(`PDF 解析失败：${String(error.message || error)}`, "error"); } }, true);
  document.addEventListener("click", (event) => { if (event.target?.id === "runButton" && state.file && isPdf(state.file)) { event.preventDefault(); event.stopImmediatePropagation(); run(); } }, true);
  document.querySelectorAll('input[name="pdfMode"]').forEach((control) => control.addEventListener("change", () => options.classList.toggle("hidden", mode() !== "academic-rebuild")));
  generate.addEventListener("click", run); download.addEventListener("click", downloadHtml);
})();
