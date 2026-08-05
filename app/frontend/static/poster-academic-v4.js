(function () {
  "use strict";
  const $ = (id) => document.getElementById(id);
  const form = $("academicPosterForm");
  if (!form || !window.mammoth || !window.TurndownService) return;

  const state = { file: null, source: null, plan: null, html: "", assets: [], busy: false };
  const clean = (value, limit = 5000) => String(value || "").replace(/\s+/g, " ").trim().slice(0, limit);
  const status = (message, kind = "") => { const node = $("academicPosterStatus"); if (node) { node.textContent = message; node.dataset.kind = kind; } };
  const integration = () => window.PptAiConfig?.loadAiConfig?.() || {};
  const templateId = () => document.querySelector('input[name="academicPosterTemplate"]:checked')?.value || "conference_paper_board";
  const title = () => $("academicPosterTitle")?.value.trim() || state.source?.title || state.file?.name.replace(/\.docx$/i, "") || "Academic poster";
  const assetRef = (asset) => asset.dataUrl || "";

  async function compactImage(src, maximum = 1400) {
    const image = await new Promise((resolve, reject) => { const node = new Image(); node.onload = () => resolve(node); node.onerror = reject; node.src = src; });
    const scale = Math.min(1, maximum / Math.max(image.width || maximum, image.height || maximum));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round((image.width || maximum) * scale));
    canvas.height = Math.max(1, Math.round((image.height || maximum) * scale));
    canvas.getContext("2d", { alpha: false }).drawImage(image, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL("image/png", .9);
  }

  function buildSourceFromWord(documentNode, sourceFile, assets) {
    const blocks = [];
    let current = { page: 1, title: "Source overview", section: "Overview", text: [] };
    documentNode.body.querySelectorAll("h1,h2,h3,p,li").forEach((node) => {
      const value = clean(node.textContent, 1800);
      if (!value) return;
      if (/^H[1-3]$/.test(node.tagName) && current.text.length) {
        blocks.push(current);
        current = { page: blocks.length + 1, title: value.slice(0, 220), section: value.slice(0, 120), text: [] };
      } else if (/^H[1-3]$/.test(node.tagName)) {
        current.title = value.slice(0, 220); current.section = value.slice(0, 120);
      } else current.text.push(value);
    });
    if (current.text.length || !blocks.length) blocks.push(current);
    const pages = blocks.slice(0, 16).map((block, index) => ({ page: index + 1, title: block.title, section: block.section, text: clean(block.text.join(" "), 7000) }));
    const source = {
      title: $("academicPosterTitle")?.value.trim() || pages[0]?.title || sourceFile.replace(/\.docx$/i, ""),
      authors: $("academicPosterAuthors")?.value.trim() || "",
      institution: $("academicPosterInstitution")?.value.trim() || "",
      sourceFile,
      language: /[\u4e00-\u9fff]/.test(pages.map((page) => page.text).join(" ")) ? "zh" : "en",
      pages,
      figures: assets.filter((asset) => asset.selected).map((asset) => ({ id: asset.id, assetRef: assetRef(asset), page: asset.page, caption: asset.caption, kind: "figure", context: asset.context, width: asset.width, height: asset.height })),
      tables: [],
      text: pages.map((page) => page.text).join("\n"),
    };
    return source;
  }

  async function parseWord(file) {
    status("正在提取论文正文、章节结构和嵌入图表…");
    const converted = await window.mammoth.convertToHtml({ arrayBuffer: await file.arrayBuffer() }, {
      includeDefaultStyleMap: true,
      convertImage: window.mammoth.images.imgElement((image) => image.readAsBase64String().then((base64) => ({ src: `data:${image.contentType};base64,${base64}` }))),
    });
    const doc = new DOMParser().parseFromString(converted.value, "text/html");
    const images = Array.from(doc.querySelectorAll("img[src^='data:image/']")).slice(0, 16);
    const assets = [];
    for (let index = 0; index < images.length; index += 1) {
      const node = images[index];
      try {
        const dataUrl = await compactImage(node.src);
        assets.push({ id: `word-figure-${index + 1}`, page: 1, caption: clean(node.alt || `原文图表 ${index + 1}`, 320), context: "Embedded Word figure", dataUrl, width: node.naturalWidth || 0, height: node.naturalHeight || 0, selected: true });
      } catch { /* An unreadable embedded image simply remains out of the evidence inventory. */ }
    }
    state.file = file;
    state.assets = assets;
    state.source = buildSourceFromWord(doc, file.name, assets);
    renderAssets();
    status(`已锁定 ${state.source.pages.length} 个论文内容块和 ${assets.length} 张原始图表；生成时不会调用学术背景生图。`, "ok");
  }

  async function pdfPageImage(page, scale = 1.25) {
    const viewport = page.getViewport({ scale });
    const canvas = document.createElement("canvas");
    canvas.width = Math.ceil(viewport.width); canvas.height = Math.ceil(viewport.height);
    const context = canvas.getContext("2d", { alpha: false });
    await page.render({ canvasContext: context, viewport, background: "white" }).promise;
    return canvas.toDataURL("image/jpeg", .86);
  }

  async function parsePdf(file) {
    if (!window.pdfjsLib) throw new Error("PDF 解析器尚未加载，请刷新页面后重试。");
    status("正在本地读取 PDF 的正文、章节和原始证据页…");
    window.pdfjsLib.GlobalWorkerOptions.workerSrc = "/static/pdf.worker.min.js";
    const pdf = await window.pdfjsLib.getDocument({ data: new Uint8Array(await file.arrayBuffer()), disableRange: true, disableStream: true }).promise;
    const pages = []; const assets = [];
    for (let pageNumber = 1; pageNumber <= Math.min(pdf.numPages, 24); pageNumber += 1) {
      const page = await pdf.getPage(pageNumber);
      const content = await page.getTextContent({ normalizeWhitespace: true });
      const text = clean(content.items.map((item) => item.str).join(" "), 7000);
      const heading = clean(content.items.slice(0, 18).map((item) => item.str).join(" "), 220) || `PDF page ${pageNumber}`;
      pages.push({ page: pageNumber, title: heading, section: heading, text });
      // A complete source-page capture is safer than a reconstructed chart.
      // Prefer pages that expose labelled evidence; retain a small inventory so
      // the request body stays bounded for browser-only processing.
      if (assets.length < 8 && (/(?:figure|fig\.|table|results?|method|图|表|结果|方法)/i.test(text) || pageNumber === 1)) {
        const dataUrl = await pdfPageImage(page);
        assets.push({ id: `pdf-page-${pageNumber}`, page: pageNumber, caption: `Original PDF evidence page ${pageNumber}`, context: text.slice(0, 800), dataUrl, width: 0, height: 0, selected: pageNumber !== 1 || pdf.numPages === 1 });
      }
      status(`已读取第 ${pageNumber}/${Math.min(pdf.numPages, 24)} 页论文内容。`);
    }
    if (!pages.some((page) => page.text)) throw new Error("该 PDF 没有可提取的文本层；当前来源锁定流程不会用 OCR 猜测论文内容。");
    state.file = file; state.assets = assets;
    state.source = {
      title: $("academicPosterTitle")?.value.trim() || pages[0]?.title || file.name.replace(/\.pdf$/i, ""),
      authors: $("academicPosterAuthors")?.value.trim() || "", institution: $("academicPosterInstitution")?.value.trim() || "",
      sourceFile: file.name, language: /[\u4e00-\u9fff]/.test(pages.map((page) => page.text).join(" ")) ? "zh" : "en",
      pages, figures: assets.filter((asset) => asset.selected).map((asset) => ({ id: asset.id, assetRef: asset.dataUrl, page: asset.page, caption: asset.caption, kind: "figure", context: asset.context })), tables: [], text: pages.map((page) => page.text).join("\n"),
    };
    renderAssets();
    status(`已锁定 ${pages.length} 页 PDF 文本和 ${assets.length} 个原始证据页；不会重绘图表或调用学术背景生图。`, "ok");
  }

  function renderAssets() {
    const root = $("academicPosterFigures");
    if (!root) return;
    root.innerHTML = state.assets.map((asset, index) => `<label class="academic-poster-figure"><input type="checkbox" data-asset-index="${index}" ${asset.selected ? "checked" : ""}><img src="${asset.dataUrl}" alt="${escapeHtml(asset.caption)}"><span>原始图表 · ${escapeHtml(asset.caption)} · 来源块 ${asset.page}</span></label>`).join("");
    root.hidden = !state.assets.length;
    root.querySelectorAll("[data-asset-index]").forEach((input) => input.addEventListener("change", () => {
      const asset = state.assets[Number(input.dataset.assetIndex)];
      if (asset) asset.selected = input.checked;
    }));
  }

  const escapeHtml = (value) => String(value || "").replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&quot;", "'": "&#39;" }[character]));

  async function readSse(endpoint, payload, callback) {
    const response = await fetch(endpoint, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(payload) });
    if (!response.ok) throw new Error((await response.text()) || `HTTP ${response.status}`);
    const reader = response.body?.getReader();
    if (!reader) throw new Error("学术海报服务未返回流式响应。");
    const decoder = new TextDecoder(); let buffer = "";
    while (true) {
      const { done, value } = await reader.read(); if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const records = buffer.split(/\r?\n\r?\n/); buffer = records.pop() || "";
      for (const record of records) {
        const name = record.match(/^event:\s*(.+)$/m)?.[1] || "message";
        const raw = record.match(/^data:\s*(.+)$/m)?.[1] || "{}";
        await callback(name, JSON.parse(raw));
      }
    }
  }

  const references = (source) => ({
    outlineText: source.pages.map((page) => `source-block ${page.page}: ${page.title}`).join("\n"),
    images: source.figures.slice(0, 12).map((figure) => ({ name: figure.id, alt: `${figure.caption} source-block ${figure.page}`, dataUrl: figure.assetRef, src: figure.assetRef, mime: "image/png" })),
  });

  async function verifyHtml(html, source) {
    const frame = document.createElement("iframe");
    Object.assign(frame.style, { position: "fixed", left: "-100000px", top: "0", width: "1px", height: "1px", visibility: "hidden" });
    document.body.append(frame);
    try {
      await new Promise((resolve, reject) => { frame.onload = resolve; frame.onerror = () => reject(new Error("学术海报预览加载失败。")); frame.srcdoc = html; });
      const doc = frame.contentDocument; const poster = doc?.querySelector(".academic-poster");
      if (!poster) throw new Error("渲染结果缺少学术海报画布。");
      const evidence = doc.querySelectorAll("[data-evidence-id]").length;
      const citations = (doc.body.textContent.match(/p\.\d+/g) || []).length;
      const overflow = [...doc.querySelectorAll(".poster-header,.poster-content,.research-section")].some((node) => node.scrollWidth > node.clientWidth + 2 || node.scrollHeight > node.clientHeight + 2);
      if (overflow) throw new Error("可编辑排版出现溢出，已阻止输出。");
      return { version: "BrowserPosterQualityV4", ok: true, evidence, citations, sourceAssets: source.figures.length };
    } finally { frame.remove(); }
  }

  async function submit(event) {
    event.preventDefault();
    if (state.busy) return;
    if (!state.file || !state.source?.text) throw new Error("请先上传包含可提取正文的 .docx 论文。");
    const config = integration();
    if (!config.apiKey || !config.endpoint || config.mode === "local") throw new Error("请先在统一 AI 设置中配置可用的文本模型；学术海报不会改动现有 AI 配置。");
    state.busy = true; const button = form.querySelector('button[type="submit"]'); if (button) button.disabled = true;
    try {
      state.source = { ...state.source, title: title(), authors: $("academicPosterAuthors")?.value.trim() || "", institution: $("academicPosterInstitution")?.value.trim() || "", figures: state.assets.filter((asset) => asset.selected).map((asset) => ({ id: asset.id, assetRef: asset.dataUrl, page: asset.page, caption: asset.caption, kind: "figure", context: asset.context })) };
      const options = { templateId: templateId(), title: state.source.title, authors: state.source.authors, institution: state.source.institution, conference: state.source.institution, requirements: $("academicPosterRequirements")?.value.trim() || "" };
      const referencePack = references(state.source);
      status("正在建立论文资产库与来源锁定叙事…");
      await readSse("/api/academic-poster/v4/plan/stream", { source: state.source, options, referencePack, integration: config }, async (name, data) => {
        if (name === "stage") status(data.message || "正在规划论文海报。");
        if (name === "complete") state.plan = data.plan;
        if (name === "error") throw new Error(data.message || "学术海报规划失败。");
      });
      if (!state.plan) throw new Error("未收到可用的学术海报规划。");
      status("正在用原始图表和可编辑文字层排版…");
      await readSse("/api/academic-poster/v4/render/stream", { source: state.source, plan: state.plan, options, integration: config }, async (name, data) => {
        if (name === "stage") status(data.message || "正在渲染可编辑海报。");
        if (name === "complete") state.html = data.html;
        if (name === "error") throw new Error(data.message || "学术海报渲染失败。");
      });
      if (!state.html) throw new Error("未收到可编辑海报 HTML。");
      const browserQuality = await verifyHtml(state.html, state.source);
      status("正在审校证据覆盖、可读性与页码引用…");
      let review = null;
      await readSse("/api/academic-poster/v4/review/stream", { source: state.source, plan: state.plan, html: state.html, options, referencePack, integration: config, browserQuality }, async (name, data) => {
        if (name === "stage") status(data.message || "正在审校学术海报。");
        if (name === "complete") review = data.review;
        if (name === "error") throw new Error(data.message || "学术海报审校失败。");
      });
      if (review?.approved === false) throw new Error((review.notes || ["学术海报未通过审校。"]).join(" "));
      if (!window.PosterStudio?.mountExternal) throw new Error("共享预览与编辑器未加载。");
      await window.PosterStudio.mountExternal({ html: state.html, title: state.source.title, style: options.templateId, job: { aiStatus: { used: true, planningUsed: true }, quality: browserQuality }, metadata: { protocol: "paper2poster-v4", sourceFile: state.source.sourceFile, sourceLocked: true, review, quality: browserQuality } });
      $("posterEmpty") && ($("posterEmpty").hidden = true);
      status(`已生成来源锁定的可编辑学术海报。${(review?.notes || []).join(" ")}`, "ok");
    } finally { state.busy = false; if (button) button.disabled = false; }
  }

  $("academicPosterWord")?.addEventListener("change", (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const parser = /\.pdf$/i.test(file.name) || file.type === "application/pdf" ? parsePdf : parseWord;
    parser(file).catch((error) => status(`论文解析失败：${error.message || error}`, "error"));
  });
  document.querySelectorAll('input[name="academicPosterTemplate"]').forEach((input) => input.addEventListener("change", () => document.querySelectorAll(".academic-template").forEach((label) => label.classList.toggle("active", label.querySelector("input")?.checked))));
  document.querySelectorAll("[data-poster-mode]").forEach((button) => button.addEventListener("click", () => {
    const academic = button.dataset.posterMode === "academic";
    document.querySelectorAll("[data-poster-mode]").forEach((item) => { item.classList.toggle("active", item === button); item.setAttribute("aria-selected", String(item === button)); });
    const standard = $("zinePosterForm"); if (standard) standard.hidden = academic;
    form.hidden = !academic;
  }));
  form.addEventListener("submit", (event) => submit(event).catch((error) => status(String(error.message || error), "error")));
})();
