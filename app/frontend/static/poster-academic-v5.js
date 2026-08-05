(function () {
  "use strict";
  var $ = function (id) { return document.getElementById(id); };
  var form = $("academicPosterForm");
  if (!form || !window.mammoth || !window.TurndownService) return;

  var state = { file: null, source: null, assets: [], brief: null, html: "", busy: false };
  var clean = function (value, limit) { return String(value || "").replace(/\s+/g, " ").trim().slice(0, limit || 5000); };
  var esc = function (value) { return String(value || "").replace(/[&<>"']/g, function (c) { return ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]; }); };
  var status = function (message, kind) { var node = $("academicPosterStatus"); if (node) { node.textContent = message; node.dataset.kind = kind || ""; } };
  var textConfig = function () { return window.PptAiConfig && window.PptAiConfig.loadAiConfig ? window.PptAiConfig.loadAiConfig() : { mode: "local" }; };
  var imageConfig = function () { try { return Object.assign({ provider: "cloudflare-workers-ai", model: "@cf/black-forest-labs/flux-2-klein-9b" }, JSON.parse(localStorage.getItem("ppt-poster-ai-v3") || "{}")); } catch (_) { return { provider: "cloudflare-workers-ai", model: "@cf/black-forest-labs/flux-2-klein-9b" }; } };
  var templateId = function () { var item = document.querySelector('input[name="academicPosterTemplate"]:checked'); return item ? item.value : "conference_paper_board"; };
  var dimensions = function () { var value = templateId(); if (value === "landscape" || value === "teaser") return [1920, 1080]; if (value === "graphical_abstract") return [1200, 1200]; if (value === "portrait") return [1080, 1440]; return [1200, 1800]; };
  var usefulTitle = function (value) { var title = clean(value, 260); return title && !/^source overview$/i.test(title) && !/^pdf page \d+$/i.test(title) ? title : ""; };
  var titleFor = function (pages, file) { return usefulTitle($("academicPosterTitle") && $("academicPosterTitle").value) || (pages || []).map(function (page) { return usefulTitle(page.title); }).find(Boolean) || String((file && file.name) || "Academic Poster").replace(/\.(pdf|docx)$/i, ""); };

  function setBusy(value, message) {
    state.busy = Boolean(value);
    form.querySelectorAll("button").forEach(function (button) { button.disabled = state.busy; });
    var progress = $("posterProgress"); if (progress) progress.hidden = !state.busy;
    if (message && progress && progress.querySelector("strong")) progress.querySelector("strong").textContent = message;
  }

  function dataUrl(blob) { return new Promise(function (resolve, reject) { var reader = new FileReader(); reader.onload = function () { resolve(String(reader.result || "")); }; reader.onerror = function () { reject(new Error("图像读取失败。")); }; reader.readAsDataURL(blob); }); }
  async function compactImage(src) {
    var image = await new Promise(function (resolve, reject) { var node = new Image(); node.onload = function () { resolve(node); }; node.onerror = reject; node.src = src; });
    var scale = Math.min(1, 1300 / Math.max(image.width || 1300, image.height || 1300)); var canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round((image.width || 1300) * scale)); canvas.height = Math.max(1, Math.round((image.height || 1300) * scale));
    canvas.getContext("2d", { alpha: false }).drawImage(image, 0, 0, canvas.width, canvas.height); return canvas.toDataURL("image/png", .9);
  }

  function buildWordSource(doc, fileName, assets) {
    var blocks = [], current = { page: 1, title: "", section: "", text: [] };
    doc.body.querySelectorAll("h1,h2,h3,p,li").forEach(function (node) {
      var value = clean(node.textContent, 1800); if (!value) return;
      if (/^H[1-3]$/.test(node.tagName)) { if (current.text.length) blocks.push(current); current = { page: blocks.length + 1, title: value, section: value, text: [] }; } else current.text.push(value);
    });
    if (current.text.length || !blocks.length) blocks.push(current);
    var pages = blocks.slice(0, 18).map(function (block, index) { return { page: index + 1, title: block.title || ("Section " + (index + 1)), section: block.section || "", text: clean(block.text.join(" "), 7000) }; });
    return { title: titleFor(pages, { name: fileName }), authors: clean($("academicPosterAuthors") && $("academicPosterAuthors").value, 300), institution: clean($("academicPosterInstitution") && $("academicPosterInstitution").value, 300), sourceFile: fileName, language: /[\u4e00-\u9fff]/.test(pages.map(function (page) { return page.text; }).join(" ")) ? "zh" : "en", pages: pages, figures: assets.filter(function (asset) { return asset.selected; }).map(function (asset) { return { id: asset.id, assetRef: asset.dataUrl, page: asset.page, caption: asset.caption, kind: "figure", context: asset.context }; }), tables: [], text: pages.map(function (page) { return page.text; }).join("\n") };
  }

  async function parseWord(file) {
    status("正在提取论文正文、章节结构与嵌入图表。");
    var converted = await window.mammoth.convertToHtml({ arrayBuffer: await file.arrayBuffer() }, { includeDefaultStyleMap: true, convertImage: window.mammoth.images.imgElement(function (image) { return image.readAsBase64String().then(function (base64) { return { src: "data:" + image.contentType + ";base64," + base64 }; }); }) });
    var doc = new DOMParser().parseFromString(converted.value, "text/html"), assets = [], images = Array.from(doc.querySelectorAll("img[src^='data:image/']")).slice(0, 16);
    for (var index = 0; index < images.length; index += 1) { try { assets.push({ id: "word-figure-" + (index + 1), page: 1, caption: clean(images[index].alt || ("Original paper figure " + (index + 1)), 320), context: "Embedded Word figure", dataUrl: await compactImage(images[index].src), selected: true }); } catch (_) {} }
    state.file = file; state.assets = assets; state.source = buildWordSource(doc, file.name, assets); renderAssets(); status("已解析 " + state.source.pages.length + " 个内容块和 " + assets.length + " 个原始图表。下一步将生成可确认的内容与视觉方案。", "ok");
  }

  async function parsePdf(file) {
    if (!window.pdfjsLib) throw new Error("PDF 解析器尚未加载，请刷新页面后重试。");
    status("正在本地读取 PDF 正文、章节和原始证据页。"); window.pdfjsLib.GlobalWorkerOptions.workerSrc = "/static/pdf.worker.min.js";
    var pdf = await window.pdfjsLib.getDocument({ data: new Uint8Array(await file.arrayBuffer()), disableRange: true, disableStream: true }).promise, pages = [], assets = [];
    for (var pageNumber = 1; pageNumber <= Math.min(pdf.numPages, 24); pageNumber += 1) {
      var page = await pdf.getPage(pageNumber), content = await page.getTextContent({ normalizeWhitespace: true }), text = clean(content.items.map(function (item) { return item.str; }).join(" "), 7000), heading = clean(content.items.slice(0, 20).map(function (item) { return item.str; }).join(" "), 220);
      pages.push({ page: pageNumber, title: heading || ("PDF page " + pageNumber), section: heading, text: text });
      if (assets.length < 9 && (/(?:figure|fig\.|table|results?|method|结果|方法|图|表)/i.test(text) || pageNumber === 1)) {
        var viewport = page.getViewport({ scale: 1.15 }), canvas = document.createElement("canvas"); canvas.width = Math.ceil(viewport.width); canvas.height = Math.ceil(viewport.height); await page.render({ canvasContext: canvas.getContext("2d", { alpha: false }), viewport: viewport, background: "white" }).promise;
        assets.push({ id: "pdf-page-" + pageNumber, page: pageNumber, caption: "Original PDF evidence page " + pageNumber, context: text.slice(0, 800), dataUrl: canvas.toDataURL("image/jpeg", .84), selected: pageNumber !== 1 || pdf.numPages === 1 });
      }
      status("正在读取第 " + pageNumber + "/" + Math.min(pdf.numPages, 24) + " 页论文内容。");
    }
    if (!pages.some(function (page) { return page.text; })) throw new Error("该 PDF 没有可提取的文本层；请上传文本型 PDF 或 DOCX。");
    state.file = file; state.assets = assets; state.source = { title: titleFor(pages, file), authors: clean($("academicPosterAuthors") && $("academicPosterAuthors").value, 300), institution: clean($("academicPosterInstitution") && $("academicPosterInstitution").value, 300), sourceFile: file.name, language: /[\u4e00-\u9fff]/.test(pages.map(function (page) { return page.text; }).join(" ")) ? "zh" : "en", pages: pages, figures: assets.filter(function (asset) { return asset.selected; }).map(function (asset) { return { id: asset.id, assetRef: asset.dataUrl, page: asset.page, caption: asset.caption, kind: "figure", context: asset.context }; }), tables: [], text: pages.map(function (page) { return page.text; }).join("\n") };
    renderAssets(); status("已解析 " + pages.length + " 页 PDF 文本和 " + assets.length + " 个原始证据资产。下一步将生成可确认的内容与视觉方案。", "ok");
  }

  function renderAssets() {
    var root = $("academicPosterFigures"); if (!root) return;
    root.innerHTML = state.assets.map(function (asset, index) { return '<label class="academic-poster-figure"><input type="checkbox" data-asset-index="' + index + '" ' + (asset.selected ? "checked" : "") + '><img src="' + asset.dataUrl + '" alt="' + esc(asset.caption) + '"><span>原始证据 · ' + esc(asset.caption) + ' · 来源页 ' + asset.page + "</span></label>"; }).join("");
    root.hidden = !state.assets.length; root.querySelectorAll("[data-asset-index]").forEach(function (input) { input.addEventListener("change", function () { var asset = state.assets[Number(input.dataset.assetIndex)]; if (asset) asset.selected = input.checked; }); });
  }

  function requestSource() {
    var base = state.source || {}, figures = state.assets.filter(function (asset) { return asset.selected; }).map(function (asset) { return { id: asset.id, assetRef: asset.dataUrl, page: asset.page, caption: asset.caption, kind: "figure", context: asset.context }; });
    return Object.assign({}, base, { title: usefulTitle($("academicPosterTitle") && $("academicPosterTitle").value) || titleFor(base.pages || [], state.file), authors: clean($("academicPosterAuthors") && $("academicPosterAuthors").value, 300), institution: clean($("academicPosterInstitution") && $("academicPosterInstitution").value, 300), figures: figures });
  }
  function options() { var source = requestSource(); return { templateId: templateId(), title: source.title, authors: source.authors, institution: source.institution, conference: source.institution, requirements: clean($("academicPosterRequirements") && $("academicPosterRequirements").value, 900) }; }
  function referencePack(source) { return { outlineText: source.pages.map(function (page) { return "source-block " + page.page + ": " + page.title; }).join("\n"), images: source.figures.slice(0, 12).map(function (figure) { return { name: figure.id, alt: figure.caption + " source-block " + figure.page, dataUrl: figure.assetRef, src: figure.assetRef, mime: "image/png" }; }) }; }

  async function readSse(endpoint, payload, callback) {
    var response = await fetch(endpoint, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(payload) });
    if (!response.ok || !response.body) throw new Error((await response.text().catch(function () { return ""; })) || ("HTTP " + response.status));
    var reader = response.body.getReader(), decoder = new TextDecoder(), buffer = "";
    while (true) { var chunk = await reader.read(); if (chunk.done) break; buffer += decoder.decode(chunk.value, { stream: true }); var records = buffer.split(/\r?\n\r?\n/); buffer = records.pop() || ""; for (var i = 0; i < records.length; i += 1) { var name = (records[i].match(/^event:\s*(.+)$/m) || [])[1] || "message", raw = (records[i].match(/^data:\s*(.+)$/m) || [])[1] || "{}"; var data = JSON.parse(raw); if (name === "error") throw new Error(data.message || "学术海报服务失败。"); await callback(name, data); } }
  }

  function renderBrief(brief) {
    $("academicBriefTitle").value = brief.metadata && brief.metadata.title || ""; $("academicBriefSubtitle").value = brief.metadata && brief.metadata.subtitle || ""; $("academicBriefVisualPrompt").value = brief.globalVisual && brief.globalVisual.generationPrompt || ""; $("academicBriefNegativePrompt").value = brief.globalVisual && brief.globalVisual.negativePrompt || "";
    $("academicBriefNarrative").textContent = "核心叙事：" + ((brief.coreNarrative && brief.coreNarrative.problem) || "") + " → " + ((brief.coreNarrative && brief.coreNarrative.approach) || "") + " → " + ((brief.coreNarrative && brief.coreNarrative.mainFinding) || "");
    $("academicBriefPanelMeta").textContent = (brief.sectionPlanning && brief.sectionPlanning.finalCount || brief.panels.length) + " 个板块 · " + (brief.sectionPlanning && brief.sectionPlanning.planningReason || "根据论文结构动态生成");
    $("academicBriefPanels").innerHTML = brief.panels.map(function (panel, index) { return '<article class="academic-brief-panel" data-panel-index="' + index + '"><header><strong>' + String(index + 1).padStart(2, "0") + " · " + esc(panel.heading) + '</strong><span>' + esc(panel.visualType) + '</span></header><div class="academic-brief-panel-grid"><label>板块标题<input data-field="heading" value="' + esc(panel.heading) + '"></label><label>优先级<input data-field="priority" type="number" min="1" max="5" value="' + (Number(panel.priority) || 3) + '"></label><label class="academic-brief-wide">核心结论<textarea data-field="takeaway" rows="2">' + esc(panel.takeaway) + '</textarea></label><label class="academic-brief-wide">要点（每行一条）<textarea data-field="bullets" rows="3">' + esc((panel.bullets || []).join("\n")) + '</textarea></label><label class="academic-brief-wide">视觉描述<textarea data-field="visualDescription" rows="2">' + esc(panel.visualDescription) + '</textarea></label><label class="academic-brief-wide">证据资产 ID（逗号分隔）<input data-field="evidenceIds" value="' + esc((panel.evidenceIds || []).join(", ")) + '"></label><label class="academic-brief-lock"><input data-field="locked" type="checkbox" ' + (panel.locked ? "checked" : "") + ">锁定此板块文案</label></div><p class=\"academic-brief-evidence\"><b>来源：</b>" + esc((panel.sourceRefs || []).join(" · ")) + "　<b>版式：</b>" + esc(panel.layoutHint || "") + "</p></article>"; }).join("");
    $("academicPosterBriefStage").hidden = false;
  }

  function currentBrief() {
    var base = state.brief || {}, panels = (base.panels || []).map(function (panel, index) { var root = document.querySelector('[data-panel-index="' + index + '"]'); if (!root) return panel; var field = function (name) { return root.querySelector('[data-field="' + name + '"]'); }; return Object.assign({}, panel, { heading: clean(field("heading").value, 120), takeaway: clean(field("takeaway").value, 380), bullets: String(field("bullets").value || "").split(/\n+/).map(function (item) { return clean(item, 260); }).filter(Boolean).slice(0, 5), visualDescription: clean(field("visualDescription").value, 540), evidenceIds: String(field("evidenceIds").value || "").split(",").map(function (item) { return clean(item, 80); }).filter(Boolean).slice(0, 3), priority: Math.max(1, Math.min(5, Number(field("priority").value) || 3)), locked: Boolean(field("locked").checked) }); });
    return Object.assign({}, base, { metadata: Object.assign({}, base.metadata || {}, { title: clean($("academicBriefTitle").value, 260), subtitle: clean($("academicBriefSubtitle").value, 280) }), globalVisual: Object.assign({}, base.globalVisual || {}, { generationPrompt: clean($("academicBriefVisualPrompt").value, 2400), negativePrompt: clean($("academicBriefNegativePrompt").value, 900) }), panels: panels, sectionPlanning: Object.assign({}, base.sectionPlanning || {}, { finalCount: panels.length }) });
  }

  async function createBrief(event) {
    event.preventDefault(); if (state.busy) return; if (!state.file || !state.source || !state.source.text) throw new Error("请先上传包含可提取正文的 PDF 或 DOCX。");
    setBusy(true, "正在识别论文结构、证据与视觉关系");
    try {
      var source = requestSource(), config = textConfig(), opts = options(), pack = referencePack(source), brief = null;
      status("正在建立论文证据资产库。"); await readSse("/api/academic-poster/v5/analyze/stream", { source: source, options: opts }, async function (name, data) { if (name === "stage") status(data.message || "正在分析论文。"); });
      status("正在生成可确认的动态板块、来源锁定文案和视觉描述。"); await readSse("/api/academic-poster/v5/brief/stream", { source: source, options: opts, referencePack: pack, integration: config }, async function (name, data) { if (name === "stage") status(data.message || "正在生成海报方案。"); if (name === "complete") brief = data.brief; });
      if (!brief) throw new Error("未收到可用的学术海报方案。"); state.source = source; state.brief = brief; renderBrief(brief); status("方案已生成。请确认或修改板块文案、视觉描述和证据选择，然后再生成海报。", "ok");
    } finally { setBusy(false); }
  }

  async function generateVisual(brief) {
    var config = imageConfig(), size = dimensions(), enabled = config.provider === "cloudflare-workers-ai" || (config.endpoint && config.apiKey); if (!enabled) return "";
    var generated = (brief.panels || []).filter(function (panel) { return /^generated/.test(panel.visualType || ""); }).map(function (panel) { return panel.visualDescription; }).join(" | ");
    var prompt = (brief.globalVisual && brief.globalVisual.generationPrompt || "") + "\nTopic: " + (brief.metadata && brief.metadata.title || "") + "\nSupporting visual concepts: " + (generated || "structured academic background") + "\nNo readable text, author names, citations, data charts, numerical results, logos, watermarks, QR codes or empty white frames.";
    var response = await fetch("/api/academic-poster/v5/generate", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ imageConfig: config, width: size[0], height: size[1], prompt: prompt, negativePrompt: brief.globalVisual && brief.globalVisual.negativePrompt || "" }) });
    if (!response.ok) { var detail = await response.json().catch(function () { return {}; }); throw new Error(detail.message || ("图像服务 HTTP " + response.status)); } return dataUrl(await response.blob());
  }

  async function confirmAndGenerate() {
    if (state.busy || !state.brief) return; setBusy(true, "正在生成学术视觉层并合成准确内容");
    try {
      var brief = currentBrief(), source = requestSource(), opts = options(), visualDataUrl = "", html = "", review = null;
      status("正在生成不含文字和数据的学术视觉层。"); try { visualDataUrl = await generateVisual(brief); } catch (error) { status("视觉层生成失败，已回退为来源锁定版面：" + (error.message || error), "error"); }
      status("正在叠加论文原图、准确标题、数字、引用和可编辑文案。"); await readSse("/api/academic-poster/v5/compose/stream", { source: source, brief: brief, options: opts, visualDataUrl: visualDataUrl }, async function (name, data) { if (name === "stage") status(data.message || "正在合成海报。"); if (name === "complete") { html = data.html; state.brief = data.brief || brief; } });
      if (!html) throw new Error("未收到可编辑学术海报。");
      await readSse("/api/academic-poster/v5/review/stream", { source: source, brief: state.brief, html: html, options: opts, integration: textConfig(), referencePack: referencePack(source) }, async function (name, data) { if (name === "stage") status(data.message || "正在复核海报。"); if (name === "complete") review = data.review; });
      if (review && review.approved === false) throw new Error((review.notes || ["学术海报未通过复核。"]).join(" "));
      if (!window.PosterStudio || !window.PosterStudio.mountExternal) throw new Error("共享预览与编辑器尚未加载。");
      await window.PosterStudio.mountExternal({ html: html, title: state.brief.metadata && state.brief.metadata.title || source.title, style: opts.templateId, job: { aiStatus: { used: true, planningUsed: true }, quality: { protocol: "AcademicPosterV5", visualLayer: Boolean(visualDataUrl) } }, metadata: { protocol: "academic-poster-v5", sourceLocked: true, visualLayer: Boolean(visualDataUrl), review: review, brief: state.brief } });
      $("posterEmpty") && ($("posterEmpty").hidden = true); $("academicPosterBriefStage").hidden = true; status(visualDataUrl ? "学术海报已生成：视觉层由生图模型完成，论文事实、图表和文字保持可编辑且可追溯。" : "学术海报已生成：当前未使用图像视觉层，已保留来源锁定的可编辑版面。", "ok");
    } finally { setBusy(false); }
  }

  $("academicPosterWord").addEventListener("change", function (event) { var file = event.target.files && event.target.files[0]; if (!file) return; (/\.(pdf)$/i.test(file.name) || file.type === "application/pdf" ? parsePdf : parseWord)(file).catch(function (error) { status("论文解析失败：" + (error.message || error), "error"); }); });
  $("academicBriefCancel").addEventListener("click", function () { $("academicPosterBriefStage").hidden = true; status("可修改论文信息、模板或证据选择后重新生成方案。"); });
  $("academicBriefConfirm").addEventListener("click", function () { confirmAndGenerate().catch(function (error) { status(String(error.message || error), "error"); }); });
  document.querySelectorAll('input[name="academicPosterTemplate"]').forEach(function (input) { input.addEventListener("change", function () { document.querySelectorAll(".academic-template").forEach(function (label) { label.classList.toggle("active", Boolean(label.querySelector("input") && label.querySelector("input").checked)); }); }); });
  document.querySelectorAll("[data-poster-mode]").forEach(function (button) { button.addEventListener("click", function () { if (button.dataset.posterMode !== "academic") $("academicPosterBriefStage").hidden = true; }); });
  form.addEventListener("submit", function (event) { createBrief(event).catch(function (error) { status(String(error.message || error), "error"); }); });
})();
