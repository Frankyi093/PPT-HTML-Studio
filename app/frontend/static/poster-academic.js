(function () {
  "use strict";
  const $ = (id) => document.getElementById(id);
  const academicForm = $("academicPosterForm");
  if (!academicForm || !window.pdfjsLib) return;
  window.pdfjsLib.GlobalWorkerOptions.workerSrc = "/static/pdf.worker.min.js";

  const standardForm = $("posterForm");
  const status = $("academicPosterStatus");
  const figuresRoot = $("academicPosterFigures");
  const submitButton = academicForm.querySelector('button[type="submit"]');
  const state = { projectId: "", file: null, pdf: null, pages: [], figures: [], source: null, plan: null, html: "", generationId: "" };
  const DB_NAME = "ppt-html-academic-v1";
  const ASSETS = "assets";
  const clean = (value, limit = 7000) => String(value || "").replace(/\s+/g, " ").trim().slice(0, limit);
  const setStatus = (message, kind = "") => { status.textContent = message; status.dataset.kind = kind; };
  const assetRef = (assetId) => `asset://pdf-academic/${assetId}`;
  const projectId = () => `poster-${Date.now().toString(36)}-${crypto.randomUUID().slice(0, 6)}`;

  function openDb() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, 1);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains("projects")) db.createObjectStore("projects", { keyPath: "id" });
        if (!db.objectStoreNames.contains(ASSETS)) db.createObjectStore(ASSETS, { keyPath: "id" });
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async function putAsset(blobValue, name) {
    const db = await openDb();
    const id = `${state.projectId}:${crypto.randomUUID()}`;
    return new Promise((resolve, reject) => {
      const tx = db.transaction(ASSETS, "readwrite");
      tx.objectStore(ASSETS).put({ id, projectId: state.projectId, blob: blobValue, name });
      tx.oncomplete = () => resolve(assetRef(id));
      tx.onerror = () => reject(tx.error);
    });
  }

  async function getAsset(id) {
    const db = await openDb();
    return new Promise((resolve, reject) => {
      const request = db.transaction(ASSETS, "readonly").objectStore(ASSETS).get(id);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  const canvasBlob = (canvas) => new Promise((resolve, reject) => canvas.toBlob((value) => value ? resolve(value) : reject(new Error("图表裁剪失败。")), "image/png", .94));
  const dataUrl = (blobValue) => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blobValue);
  });
  const activeTemplate = () => document.querySelector('input[name="academicPosterTemplate"]:checked')?.value || "conference_paper_board";
  const integration = () => window.PptAiConfig?.loadAiConfig?.() || {};
  const sourceTitle = () => $("academicPosterTitle").value.trim() || state.pages[0]?.title || state.file.name.replace(/\.pdf$/i, "");

  function orderedItems(items, viewport) {
    const usable = items.filter((item) => item.y > viewport.height * .04 && item.y < viewport.height * .96);
    const left = usable.filter((item) => item.x < viewport.width * .48);
    const right = usable.filter((item) => item.x >= viewport.width * .48);
    const columnLike = left.length > 10 && right.length > 10;
    const sorter = (a, b) => Math.abs(a.y - b.y) < 4 ? a.x - b.x : a.y - b.y;
    return columnLike ? left.sort(sorter).concat(right.sort(sorter)) : usable.sort(sorter);
  }

  async function pageInfo(number) {
    const page = await state.pdf.getPage(number);
    const viewport = page.getViewport({ scale: 1 });
    const content = await page.getTextContent({ normalizeWhitespace: true });
    const items = content.items.map((item) => ({
      text: clean(item.str, 500),
      x: +item.transform?.[4] || 0,
      y: viewport.height - (+item.transform?.[5] || 0),
      width: +item.width || 0,
      height: Math.max(6, +item.height || 0),
    })).filter((item) => item.text);
    const ordered = orderedItems(items, viewport);
    const text = clean(ordered.map((item) => item.text).join(" "), 10000);
    const titleItems = items.filter((item) => item.y < viewport.height * .22).sort((a, b) => b.height - a.height);
    let imageOps = 0;
    try {
      const operatorList = await page.getOperatorList();
      const ops = window.pdfjsLib.OPS || {};
      const imageFunctions = new Set([ops.paintImageXObject, ops.paintImageMaskXObject, ops.paintSolidColorImageMask].filter(Number.isFinite));
      imageOps = operatorList.fnArray.filter((fn) => imageFunctions.has(fn)).length;
    } catch {
      imageOps = 0;
    }
    return { page, number, viewport, items, ordered, text, imageOps, title: clean(titleItems[0]?.text || text.split(/(?<=[.!?。])\s/)[0], 220) };
  }

  function contextNear(info, target) {
    return clean(info.items.filter((item) => Math.abs(item.y - target.y) < info.viewport.height * .12).sort((a, b) => a.y - b.y || a.x - b.x).map((item) => item.text).join(" "), 900);
  }

  function detectFigures(info) {
    const result = [];
    const captionPattern = /^(?:figure|fig(?:ure)?\.?|图|图示|table|tab(?:le)?\.?|表|equation|eq(?:uation)?\.?|公式)\s*[-.:：]?\s*(?:[A-Za-z]?\d+|[IVX]+|[一二三四五六七八九十]+)\b/i;
    const lineGroups = [];
    info.items.slice().sort((a, b) => a.y - b.y || a.x - b.x).forEach((item) => {
      const group = lineGroups.find((candidate) => Math.abs(candidate.y - item.y) < Math.max(3, item.height * .7));
      if (group) {
        group.items.push(item);
        group.text = `${group.text} ${item.text}`.trim();
      } else {
        lineGroups.push({ y: item.y, items: [item], text: item.text });
      }
    });
    lineGroups.filter((line) => captionPattern.test(line.text)).forEach((line, index) => {
      const item = line.items[0];
      const kind = /^(?:table|tab\.?|表)/i.test(item.text) ? "table" : /^(?:equation|eq\.?|公式)/i.test(item.text) ? "formula" : "figure";
      const columnWidth = item.x < info.viewport.width * .46 || item.x > info.viewport.width * .54 ? info.viewport.width * .5 : info.viewport.width;
      const x = columnWidth < info.viewport.width ? (item.x > info.viewport.width * .5 ? info.viewport.width * .5 : 0) : 0;
      const top = Math.max(info.viewport.height * .05, item.y - info.viewport.height * (kind === "table" ? .36 : .43));
      const bottom = Math.min(info.viewport.height * .94, item.y + 34);
      result.push({
        id: `poster-${kind}-${info.number}-${index + 1}`,
        page: info.number,
        kind,
        caption: clean(line.text, 420),
        context: contextNear(info, item),
        crop: { x, y: top, width: columnWidth, height: Math.max(90, bottom - top) },
        selected: true,
      });
    });
    if (!result.length && info.imageOps > 0) {
      result.push({
        id: `poster-visual-${info.number}-1`,
        page: info.number,
        kind: "figure",
        caption: `Uncaptioned visual region on page ${info.number}`,
        context: info.text.slice(0, 900),
        crop: { x: info.viewport.width * .05, y: info.viewport.height * .24, width: info.viewport.width * .9, height: info.viewport.height * .58 },
        selected: true,
      });
    }
    if (info.number === 1) {
      result.push({ id: "poster-logo-band-1", page: 1, kind: "logo", caption: "Paper title and institution logo band", context: info.title, crop: { x: 0, y: 0, width: info.viewport.width, height: info.viewport.height * .18 }, selected: false });
    }
    return result.filter((candidate, index, all) => all.findIndex((other) => other.page === candidate.page && Math.abs(other.crop.y - candidate.crop.y) < 12 && other.kind === candidate.kind) === index);
  }

  async function crop(info, spec, scale) {
    const viewport = info.page.getViewport({ scale });
    const pageCanvas = document.createElement("canvas");
    pageCanvas.width = Math.ceil(viewport.width);
    pageCanvas.height = Math.ceil(viewport.height);
    const context = pageCanvas.getContext("2d", { alpha: false });
    if (!context) throw new Error(`PDF 第 ${info.number} 页图像解码失败：无法创建画布。`);
    try {
      await info.page.render({ canvasContext: context, viewport, background: "white" }).promise;
    } catch (error) {
      throw new Error(`PDF 第 ${info.number} 页图像解码失败：${error?.message || error}`);
    }
    const factor = viewport.width / info.viewport.width;
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.floor(spec.width * factor));
    canvas.height = Math.max(1, Math.floor(spec.height * factor));
    canvas.getContext("2d").drawImage(pageCanvas, Math.floor(spec.x * factor), Math.floor(spec.y * factor), canvas.width, canvas.height, 0, 0, canvas.width, canvas.height);
    return canvas;
  }

  async function renderFigures() {
    figuresRoot.innerHTML = "";
    for (const figure of state.figures) {
      const info = state.pages.find((page) => page.number === figure.page);
      const thumbnail = await crop(info, figure.crop, .5);
      figure.thumbnail = await dataUrl(await canvasBlob(thumbnail));
      const label = document.createElement("label");
      label.className = "academic-poster-figure";
      const check = document.createElement("input");
      check.type = "checkbox";
      check.checked = figure.selected;
      check.addEventListener("change", () => { figure.selected = check.checked; });
      const image = document.createElement("img");
      image.src = figure.thumbnail;
      const caption = document.createElement("span");
      caption.textContent = `${figure.kind.toUpperCase()} · ${figure.caption} · p.${figure.page}`;
      label.append(check, image, caption);
      figuresRoot.append(label);
    }
    figuresRoot.hidden = !state.figures.length;
  }

  async function parsePdf(file) {
    setStatus("正在本地读取论文文本、图表、表格和公式候选区…");
    state.projectId = projectId();
    state.pdf = await window.pdfjsLib.getDocument({ data: new Uint8Array(await file.arrayBuffer()), disableRange: true, disableStream: true }).promise;
    state.pages = [];
    state.figures = [];
    for (let number = 1; number <= state.pdf.numPages; number += 1) {
      const info = await pageInfo(number);
      state.pages.push(info);
      state.figures.push(...detectFigures(info));
      setStatus(`已读取第 ${number}/${state.pdf.numPages} 页。`);
    }
    if (!state.pages.some((page) => page.text)) {
      setStatus("扫描型 PDF 未检测到文本层；当前不支持 OCR，无法生成来源锁定学术海报。", "error");
      return;
    }
    await renderFigures();
    setStatus(`已读取 ${state.pdf.numPages} 页，发现 ${state.figures.filter((item) => item.kind === "figure").length} 个图形、${state.figures.filter((item) => item.kind === "table").length} 个表格和 ${state.figures.filter((item) => item.kind === "formula").length} 个公式候选区。`, "ok");
  }

  async function buildSource() {
    const figures = [];
    const tables = [];
    const selected = state.figures.filter((figure) => figure.selected);
    for (let index = 0; index < selected.length; index += 1) {
      const figure = selected[index];
      const info = state.pages.find((page) => page.number === figure.page);
      setStatus(`正在生成证据高清裁剪 ${index + 1}/${selected.length}。`);
      const highResolution = await crop(info, figure.crop, 1.7);
      const record = {
        id: figure.id,
        page: figure.page,
        kind: figure.kind,
        caption: figure.caption,
        context: figure.context,
        width: highResolution.width,
        height: highResolution.height,
        thumbnail: figure.thumbnail,
        assetRef: await putAsset(await canvasBlob(highResolution), `${figure.id}.png`),
      };
      if (figure.kind === "table") tables.push(record);
      else figures.push(record);
    }
    state.source = {
      title: sourceTitle(),
      authors: $("academicPosterAuthors").value.trim(),
      institution: $("academicPosterInstitution").value.trim(),
      sourceFile: state.file.name,
      language: "zh",
      pages: state.pages.map((page) => ({ page: page.number, title: page.title, text: page.text })),
      figures,
      tables,
      text: state.pages.map((page) => page.text).join("\n"),
    };
    return state.source;
  }

  function referencePack(source) {
    return {
      outlineText: source.pages.map((page) => `p.${page.page} ${page.title}`).join("\n"),
      images: source.figures.concat(source.tables).filter((item) => item.thumbnail).slice(0, 12).map((item) => ({ name: item.id, alt: `${item.caption} p.${item.page}`, dataUrl: item.thumbnail, src: item.thumbnail, mime: "image/png" })),
    };
  }

  async function readSse(endpoint, payload, callback) {
    const response = await fetch(endpoint, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(payload) });
    if (!response.ok) throw new Error((await response.text()) || `HTTP ${response.status}`);
    const reader = response.body?.getReader();
    if (!reader) throw new Error(`${endpoint} 未返回流式响应。`);
    const decoder = new TextDecoder();
    let buffer = "";
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const records = buffer.split(/\r?\n\r?\n/);
      buffer = records.pop() || "";
      for (const record of records) {
        const event = record.match(/^event:\s*(.+)$/m)?.[1] || "message";
        const raw = record.match(/^data:\s*(.+)$/m)?.[1] || "{}";
        await callback(event, JSON.parse(raw));
      }
    }
  }

  async function resolveAssets(html) {
    const refs = Array.from(new Set(String(html).match(/asset:\/\/pdf-academic\/[^"'<>\s)]+/g) || []));
    let output = String(html);
    for (const ref of refs) {
      const asset = await getAsset(ref.split("/").pop());
      if (!asset?.blob) throw new Error(`图表资源无法读取：${ref}`);
      output = output.split(ref).join(await dataUrl(asset.blob));
    }
    return output;
  }

  async function validateRenderedPoster(html, source) {
    const resolved = await resolveAssets(html);
    const iframe = document.createElement("iframe");
    iframe.setAttribute("aria-hidden", "true");
    Object.assign(iframe.style, { position: "fixed", left: "-100000px", top: "0", border: "0", visibility: "hidden" });
    document.body.appendChild(iframe);
    try {
      await new Promise((resolve, reject) => {
        iframe.onload = resolve;
        iframe.onerror = () => reject(new Error("学术海报质量检查画布加载失败。"));
        iframe.srcdoc = resolved;
      });
      const doc = iframe.contentDocument;
      const poster = doc?.querySelector(".academic-poster");
      if (!poster) throw new Error("学术海报渲染结果缺少固定画布。");
      iframe.style.width = `${poster.offsetWidth}px`;
      iframe.style.height = `${poster.offsetHeight}px`;
      const overflowing = [...doc.querySelectorAll(".research-section,.poster-header,.poster-content")].filter((node) => node.scrollWidth > node.clientWidth + 2 || node.scrollHeight > node.clientHeight + 2);
      const evidenceCount = doc.querySelectorAll("[data-evidence-id]").length;
      const requiredEvidence = Math.min(3, source.figures.length + source.tables.length);
      const tinyText = [...doc.querySelectorAll(".section-summary,.research-section li")].some((node) => Number.parseFloat(getComputedStyle(node).fontSize) < 10);
      const warnings = [];
      if (overflowing.length) warnings.push(`overflow:${overflowing.length}`);
      if (evidenceCount < requiredEvidence) warnings.push(`evidence:${evidenceCount}/${requiredEvidence}`);
      if (tinyText) warnings.push("minimum-font-size");
      if (warnings.length) throw new Error(`学术海报浏览器质量检查未通过：${warnings.join(", ")}`);
      return { version: "BrowserPosterQualityV1", ok: true, evidenceCount, requiredEvidence, sections: doc.querySelectorAll(".research-section").length };
    } finally {
      iframe.remove();
    }
  }

  function validatePlanEvidence(plan, source) {
    const inventory = new Set([...(source.figures || []), ...(source.tables || [])].map((item) => String(item.id || "")));
    const sections = Array.isArray(plan?.sections) ? plan.sections : [];
    if (sections.length < 5) throw new Error("AI 学术海报规划缺少必要的研究层级。请重试生成。");
    const invalid = sections.flatMap((section) => (Array.isArray(section.evidenceIds) ? section.evidenceIds : [])).filter((id) => !inventory.has(String(id)));
    if (invalid.length) throw new Error(`AI 学术海报引用了不存在的证据资产：${invalid.slice(0, 3).join(", ")}`);
    if (inventory.size && ["method", "data", "evaluation", "results"].some((id) => {
      const section = sections.find((item) => item.id === id);
      return section && (!Array.isArray(section.evidenceIds) || section.evidenceIds.length === 0);
    })) throw new Error("AI 学术海报未为方法、实验或结果绑定原论文图表。请重试生成。");
    if (inventory.size >= 3) {
      const used = new Set(sections.flatMap((section) => Array.isArray(section.evidenceIds) ? section.evidenceIds : []));
      if (used.size < 3) throw new Error("AI 学术海报使用的原论文证据不足三项，未进入渲染。");
    }
  }

  async function submit(event) {
    event.preventDefault();
    if (!state.file || !state.pdf) throw new Error("请先上传论文 PDF。");
    if (!state.pages.some((page) => page.text)) throw new Error("扫描型 PDF 当前不能进行学术重构。");
    const config = integration();
    if (!config.apiKey || !config.endpoint || config.mode === "local") throw new Error("学术海报必须使用已配置的 AI。请先在设置中保存并测试 AI 连接。");
    submitButton.disabled = true;
    try {
      const source = await buildSource();
      const options = {
        templateId: activeTemplate(),
        title: source.title,
        authors: source.authors,
        institution: source.institution,
        conference: $("academicPosterInstitution").value.trim(),
        requirements: $("academicPosterRequirements").value.trim(),
        style: "conference-paper-light",
      };
      const refs = referencePack(source);
      state.plan = null;
      setStatus("AI 正在建立 AcademicPosterSpecV3 来源锁定结构…");
      await readSse("/api/academic-poster/plan/stream", { source, options, referencePack: refs, integration: config }, async (eventName, data) => {
        if (eventName === "accepted") state.generationId = data.generationId || "";
        if (eventName === "stage") setStatus(data.message);
        if (eventName === "complete") state.plan = data.plan;
        if (eventName === "error") throw new Error(data.message);
      });
      if (!state.plan) throw new Error("未收到 AcademicPosterSpecV3 学术海报规划。");
      validatePlanEvidence(state.plan, source);
      setStatus("正在渲染高密度论文展板并执行来源检查…");
      await readSse("/api/academic-poster/render/stream", { source, plan: state.plan, options, integration: config }, async (eventName, data) => {
        if (eventName === "stage") setStatus(data.message);
        if (eventName === "complete") state.html = data.html;
        if (eventName === "error") throw new Error(data.message);
      });
      if (!state.html) throw new Error("学术海报渲染器没有返回最终 HTML。");
      const browserQuality = await validateRenderedPoster(state.html, source);
      setStatus("AI 正在审查证据密度、研究层级与来源页…");
      let review = null;
      await readSse("/api/academic-poster/review/stream", { source, plan: state.plan, options, referencePack: refs, browserQuality, integration: config }, async (eventName, data) => {
        if (eventName === "stage") setStatus(data.message);
        if (eventName === "complete") review = data.review;
        if (eventName === "error") throw new Error(data.message);
      });
      if (!review?.approved) throw new Error("学术海报没有通过 AI 审查。");
      const resolved = await resolveAssets(state.html);
      if (!window.PosterStudio?.mountExternal) throw new Error("共享海报预览与编辑器运行时未加载。");
      await window.PosterStudio.mountExternal({
        html: resolved,
        title: source.title,
        style: options.templateId,
        job: { aiStatus: { used: true, planningUsed: true, generationId: state.generationId }, quality: browserQuality },
        metadata: { sourceFile: source.sourceFile, templateId: options.templateId, quality: browserQuality, review },
      });
      $("posterEmpty").hidden = true;
      setStatus(`学术海报已通过来源、浏览器和 AI 三层检查。${(review.notes || []).join(" ")}`, "ok");
    } finally {
      submitButton.disabled = false;
    }
  }

  document.querySelectorAll("[data-poster-mode]").forEach((button) => button.addEventListener("click", () => {
    const academic = button.dataset.posterMode === "academic";
    document.querySelectorAll("[data-poster-mode]").forEach((item) => {
      const on = item === button;
      item.classList.toggle("active", on);
      item.setAttribute("aria-selected", String(on));
    });
    standardForm.hidden = academic;
    academicForm.hidden = !academic;
  }));

  $("academicPosterPdf").addEventListener("change", async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    state.file = file;
    try { await parsePdf(file); } catch (error) { setStatus(`PDF 解析失败：${String(error.message || error)}`, "error"); }
  });
  document.querySelectorAll('input[name="academicPosterTemplate"]').forEach((input) => input.addEventListener("change", () => {
    document.querySelectorAll(".academic-template").forEach((label) => label.classList.toggle("active", label.querySelector("input")?.checked));
  }));
  academicForm.addEventListener("submit", (event) => submit(event).catch((error) => setStatus(String(error.message || error), "error")));
})();
