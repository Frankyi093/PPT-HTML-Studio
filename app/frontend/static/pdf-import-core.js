(function () {
  "use strict";

  const clean = (value, limit = 8000) => String(value ?? "").replace(/\s+/g, " ").trim().slice(0, limit);
  const clamp = (value, min, max) => Math.max(min, Math.min(max, Number(value) || min));
  const escapeHtml = (value) => String(value ?? "").replace(/[&<>\"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const SIZE = { cx: 1280000, cy: 720000 };
  const body = { marginTop: 10, marginRight: 12, marginBottom: 10, marginLeft: 12, vertical: "top", wrap: true };
  const transform = (x, y, cx, cy) => ({ x, y, cx, cy });
  const paragraph = (text, fontSize, bold = false) => ({ runs: [{ text: clean(text), style: { fontFamily: "Arial", fontSize, bold, color: "#172433" } }], align: "left", bullet: "", marginLeft: 0, textIndent: 0, lineHeight: 1.25 });

  const pageImage = async (page, scale = 1.8) => {
    const viewport = page.getViewport({ scale });
    const canvas = document.createElement("canvas");
    canvas.width = Math.ceil(viewport.width); canvas.height = Math.ceil(viewport.height);
    await page.render({ canvasContext: canvas.getContext("2d", { alpha: false }), viewport, background: "white" }).promise;
    return canvas.toDataURL("image/jpeg", 0.94);
  };

  const cropImageDataUrl = async (dataUrl, crop, pageWidth, pageHeight) => {
    if (!dataUrl || !crop || typeof Image === "undefined") return "";
    try {
      const image = new Image(); image.src = dataUrl;
      if (image.decode) await image.decode(); else await new Promise((resolve, reject) => { image.onload = resolve; image.onerror = reject; });
      const sx = clamp((crop.x / pageWidth) * image.width, 0, Math.max(0, image.width - 1));
      const sy = clamp((crop.y / pageHeight) * image.height, 0, Math.max(0, image.height - 1));
      const sw = clamp((crop.w / pageWidth) * image.width, 1, image.width - sx);
      const sh = clamp((crop.h / pageHeight) * image.height, 1, image.height - sy);
      const output = document.createElement("canvas");
      const scale = Math.min(3.2, Math.max(1.35, 1800 / Math.max(sw, sh)));
      output.width = Math.max(1, Math.round(sw * scale)); output.height = Math.max(1, Math.round(sh * scale));
      const context = output.getContext("2d", { alpha: false });
      context.fillStyle = "#ffffff"; context.fillRect(0, 0, output.width, output.height);
      context.drawImage(image, sx, sy, sw, sh, 0, 0, output.width, output.height);
      return output.toDataURL("image/jpeg", 0.96);
    } catch (_) { return ""; }
  };

  const linesForPage = async (page) => {
    const viewport = page.getViewport({ scale: 1 });
    const content = await page.getTextContent({ normalizeWhitespace: true });
    const raw = content.items.map((item) => ({
      text: clean(item.str, 600), x: Number(item.transform?.[4] || 0),
      y: viewport.height - Number(item.transform?.[5] || 0), width: Number(item.width || 0), height: Math.max(5, Number(item.height || 9)),
    })).filter((item) => item.text);
    const rows = [];
    raw.sort((a, b) => Math.abs(a.y - b.y) < 4 ? a.x - b.x : a.y - b.y).forEach((item) => {
      const row = rows.find((candidate) => Math.abs(candidate.y - item.y) < Math.max(3, item.height * 0.42));
      if (row) row.items.push(item); else rows.push({ y: item.y, items: [item] });
    });
    return rows.map((row) => {
      const items = row.items.sort((a, b) => a.x - b.x); const x = Math.min(...items.map((item) => item.x));
      const right = Math.max(...items.map((item) => item.x + Math.max(8, item.width)));
      return { text: clean(items.map((item) => item.text).join(" "), 1600), x, y: row.y, width: Math.max(8, right - x), size: Math.max(...items.map((item) => item.height)) };
    }).filter((line) => line.text);
  };

  const multiplyMatrix = (left, right) => [
    left[0] * right[0] + left[2] * right[1], left[1] * right[0] + left[3] * right[1],
    left[0] * right[2] + left[2] * right[3], left[1] * right[2] + left[3] * right[3],
    left[0] * right[4] + left[2] * right[5] + left[4], left[1] * right[4] + left[3] * right[5] + left[5],
  ];
  const transformedBox = (matrix, width, height, viewport) => {
    const points = [[0, 0], [width, 0], [0, height], [width, height]].map(([x, y]) => ({ x: matrix[0] * x + matrix[2] * y + matrix[4], y: matrix[1] * x + matrix[3] * y + matrix[5] }));
    const left = Math.max(0, Math.min(...points.map((point) => point.x))); const right = Math.min(viewport.width, Math.max(...points.map((point) => point.x)));
    const top = Math.max(0, viewport.height - Math.max(...points.map((point) => point.y))); const bottom = Math.min(viewport.height, viewport.height - Math.min(...points.map((point) => point.y)));
    return { x: left, y: top, w: Math.max(0, right - left), h: Math.max(0, bottom - top) };
  };

  // Use PDF.js operator transforms for actual embedded images. This avoids
  // the old page-wide caption crop and keeps tables/figures at source bounds.
  const graphicObjectsForPage = async (page, viewport) => {
    try {
      const list = await page.getOperatorList(); const ops = window.pdfjsLib.OPS || {};
      const imageOps = new Set([ops.paintImageMaskXObject, ops.paintImageXObject, ops.paintJpegXObject, ops.paintInlineImageXObject, ops.paintImageXObjectRepeat].filter(Number.isFinite));
      let matrix = [1, 0, 0, 1, 0, 0]; const stack = []; const boxes = [];
      list.fnArray.forEach((fn, index) => {
        const args = list.argsArray[index] || [];
        if (fn === ops.save) stack.push(matrix.slice());
        else if (fn === ops.restore) matrix = stack.pop() || matrix;
        else if (fn === ops.transform && args.length >= 6) matrix = multiplyMatrix(matrix, args.slice(0, 6).map(Number));
        else if (imageOps.has(fn)) {
          // Image operators paint a unit square; the CTM carries the real
          // pixel placement. Do not interpret object IDs as dimensions.
          const box = transformedBox(matrix, 1, 1, viewport);
          const area = (box.w * box.h) / Math.max(1, viewport.width * viewport.height);
          if (box.w >= 48 && box.h >= 32 && area < 0.92) boxes.push({ ...box, kind: "image", area });
        }
      });
      return boxes;
    } catch (_) { return []; }
  };

  const captionMatch = (text) => String(text || "").match(/^(fig(?:ure)?|fig\.?|table|\u56fe|\u8868)\s*([A-Za-z]?\d+(?:[.-]\d+)?)?\s*[:：.)）]?\s*(.*)$/iu);
  const detectSemanticAssets = (lines, page, renderedImage, viewport, graphicObjects) => {
    const figures = []; const tables = []; const pageWidth = viewport.width || 1000; const pageHeight = viewport.height || 1400;
    lines.forEach((line, index) => {
      const match = captionMatch(line.text); if (!match) return;
      const isTable = /^(?:table|\u8868)/iu.test(line.text); const kind = isTable ? "table" : "figure";
      const nearestGraphic = (graphicObjects || []).filter((box) => box.y + box.h <= line.y + Math.max(24, line.size * 2) && box.y + box.h >= line.y - pageHeight * 0.72).sort((a, b) => Math.abs(a.y + a.h - line.y) - Math.abs(b.y + b.h - line.y))[0];
      let bbox = nearestGraphic ? { x: nearestGraphic.x - 8, y: nearestGraphic.y - 8, w: nearestGraphic.w + 16, h: nearestGraphic.h + 16 } : null;
      let confidence = nearestGraphic ? 0.96 : 0;
      if (!bbox && isTable) {
        // Text-only tables require column-like rows. Numeric paragraphs alone
        // never become evidence assets.
        const following = lines.slice(index + 1, Math.min(lines.length, index + 15)).filter((item) => item.y > line.y && item.text.length >= 2 && item.text.length < 160);
        const numericRatio = following.length ? following.filter((item) => /\d|%/.test(item.text)).length / following.length : 0;
        const xColumns = new Set(following.map((item) => Math.round(item.x / 8))).size;
        const shortRows = following.length >= 4 && following.filter((item) => item.width < pageWidth * 0.72).length / following.length > 0.72;
        if (following.length >= 4 && numericRatio >= 0.55 && xColumns >= 3 && shortRows) {
          const left = Math.max(0, Math.min(line.x, ...following.map((item) => item.x)) - 12); const right = Math.min(pageWidth, Math.max(line.x + line.width, ...following.map((item) => item.x + item.width)) + 12);
          const bottom = Math.min(pageHeight, Math.max(...following.map((item) => item.y + item.size * 1.8)) + 14);
          bbox = { x: left, y: line.y + line.size, w: Math.max(120, right - left), h: Math.max(80, bottom - line.y) }; confidence = 0.72;
        }
      }
      if (!bbox || bbox.w > pageWidth * 0.96 || bbox.h > pageHeight * 0.88 || !renderedImage) return;
      const label = match[2] ? `${kind === "table" ? "Table" : "Figure"} ${match[2]} ` : "";
      const asset = { id: `${kind === "table" ? "table" : "fig"}-${page}-${figures.length + tables.length + 1}`, page, caption: clean(label + (match[3] || line.text), 460), context: clean(lines.slice(Math.max(0, index - 2), Math.min(lines.length, index + 5)).map((item) => item.text).join(" "), 900), kind, bbox, assetRef: "", thumbnail: "", width: bbox.w, height: bbox.h, source: `PDF p.${page}`, confidence, selectionPolicy: confidence >= 0.9 ? "preferred" : "review" };
      if (kind === "table") tables.push(asset); else figures.push(asset);
    });
    return { figures, tables };
  };

  const chunks = (text, maximum = 920) => {
    const sentences = String(text || "").split(/(?<=[.!?\u3002\uFF01\uFF1F])\s*/).filter(Boolean); const output = []; let current = "";
    sentences.forEach((sentence) => { if ((current + " " + sentence).length > maximum && current) { output.push(current); current = sentence; } else current = `${current} ${sentence}`.trim(); });
    return output.length ? output : [clean(text, maximum)];
  };
  const sectionForLines = (lines) => clean(lines.find((line) => /^(?:abstract|\u6458\u8981|introduction|background|method|\u65b9\u6cd5|experiment|\u5b9e\u9a8c|results?|\u7ed3\u679c|discussion|\u8ba8\u8bba|conclusion|\u7ed3\u8bba|references?|\u53c2\u8003\u6587\u732e)/iu.test(line.text) || (line.size >= 15 && line.text.length < 120))?.text || "", 160);
  const sourceSlide = (number, image, text) => ({ page: number, background: "#20242a", transition: "fade", plainText: text, images: { source: image }, shapes: [{ id: `pdf-page-${number}`, type: "image", pdfPage: true, imageRelId: "source", transform: transform(160000, 0, 960000, 720000), line: { color: "transparent", width: 0, dash: "solid" }, body }] });
  const styledSlide = (number, index, title, content) => ({ page: number, background: "#ffffff", transition: "fade", plainText: content, images: {}, shapes: [
    { id: `pdf-title-${number}-${index}`, type: "rect", fill: "transparent", line: { color: "transparent", width: 0, dash: "solid" }, placeholder: { type: "title" }, paragraphs: [paragraph(title, 36, true)], transform: transform(80000, 60000, 1060000, 90000), body },
    { id: `pdf-body-${number}-${index}`, type: "rect", fill: "transparent", line: { color: "transparent", width: 0, dash: "solid" }, paragraphs: chunks(content, 820).map((line) => paragraph(line, 18)), transform: transform(80000, 165000, 1060000, 470000), body },
    { id: `pdf-source-${number}-${index}`, type: "rect", fill: "transparent", line: { color: "transparent", width: 0, dash: "solid" }, paragraphs: [paragraph(`SOURCE · PDF p.${number}`, 12, true)], transform: transform(80000, 660000, 400000, 30000), body },
  ] });

  async function convertPdf(file, { preserveSource = false, onProgress = () => {} } = {}) {
    if (!window.pdfjsLib) throw new Error("PDF parser did not load.");
    window.pdfjsLib.GlobalWorkerOptions.workerSrc = "/static/pdf.worker.min.js";
    const pdf = await window.pdfjsLib.getDocument({ data: new Uint8Array(await file.arrayBuffer()), disableRange: true, disableStream: true }).promise;
    const slides = []; const sourcePages = []; const figures = []; const tables = []; let textLength = 0;
    for (let number = 1; number <= pdf.numPages; number += 1) {
      const page = await pdf.getPage(number); const viewport = page.getViewport({ scale: 1 }); const lines = await linesForPage(page);
      const text = clean(lines.map((line) => line.text).join(" ")); const title = clean(lines.slice().sort((a, b) => b.size - a.size)[0]?.text || `PDF page ${number}`, 180); const section = sectionForLines(lines);
      const graphics = await graphicObjectsForPage(page, viewport); const rendered = (graphics.length || preserveSource) ? await pageImage(page) : "";
      const detected = detectSemanticAssets(lines, number, rendered, viewport, graphics);
      for (const asset of detected.figures.concat(detected.tables)) { const crop = await cropImageDataUrl(rendered, asset.bbox, viewport.width, viewport.height); asset.assetRef = crop; asset.thumbnail = crop; }
      figures.push(...detected.figures); tables.push(...detected.tables); sourcePages.push({ page: number, title, section, text }); textLength += text.length;
      if (preserveSource) slides.push(sourceSlide(number, rendered || await pageImage(page), text));
      else if (!text) slides.push(styledSlide(number, 1, title, "此页未提取到可搜索文本。请切换到“保留源样式”查看扫描页；当前 AI 汇报不使用整页 PDF 截图或伪造正文。"));
      else chunks(text).forEach((chunk, index) => slides.push(styledSlide(number, index + 1, index ? `${title} · continued` : title, chunk)));
      onProgress({ percent: Math.round(number / pdf.numPages * 100), phase: "pdf", page: number, totalPages: pdf.numPages, message: `Parsed PDF page ${number} of ${pdf.numPages}` });
    }
    const deck = { version: 2, fileName: file.name, size: SIZE, theme: { colors: { accent1: "#1d5bd7", lt1: "#ffffff", dk1: "#172433" } }, slides };
    const paper = { version: "PaperSourceDocumentV2", sourceFile: file.name, title: sourcePages[0]?.title || file.name.replace(/\.pdf$/i, ""), language: /[\u4e00-\u9fff]/.test(sourcePages.map((page) => page.text).join(" ")) ? "zh" : "en", pages: sourcePages, figures, tables, text: sourcePages.map((page) => `${page.title}\n${page.text}`).join("\n") };
    return { deck, slides: slides.map((slide, index) => ({ page: index + 1, sourcePages: [slide.page], text: slide.plainText, shapeCount: slide.shapes.length, imageCount: Object.keys(slide.images || {}).length, elements: slide.shapes.map((shape) => ({ id: shape.id, type: shape.type, textLength: shape.paragraphs?.map((p) => p.runs.map((run) => run.text).join("")).join("").length || 0, hasImage: shape.type === "image", role: shape.placeholder?.type || (shape.type === "image" ? "visual" : "body"), rect: null, units: [] })) })), stats: { slideCount: slides.length, imageCount: figures.length + tables.length, textLength, conversionMs: 0, parser: "pdf-import-core-v5", sourcePages, figureCount: figures.length, tableCount: tables.length }, sourcePages, paper };
  }

  const themes = {
    "conference-paper-light": { paper: "#f7f2e8", ink: "#172433", navy: "#234c68", accent: "#bd7042", muted: "#637485" },
    "conference-blue": { paper: "#f4f8fb", ink: "#12263a", navy: "#0b4f7b", accent: "#d27f2e", muted: "#567188" },
    "result-first": { paper: "#fbfbf7", ink: "#111827", navy: "#503c9e", accent: "#ed8e3a", muted: "#5c6470" },
    "academic-defense-blue": { paper: "#ffffff", ink: "#17233d", navy: "#24467f", accent: "#3969b5", muted: "#65748c" },
  };
  const evidenceMarkup = (entry, paper) => {
    const id = typeof entry === "string" ? entry : entry?.id; const evidence = [...(paper?.figures || []), ...(paper?.tables || [])].find((item) => item.id === id);
    if (!evidence?.assetRef) return "";
    return `<figure class="academic-evidence"><img src="${escapeHtml(evidence.assetRef)}" alt="${escapeHtml(evidence.caption)}"><figcaption>${escapeHtml(evidence.caption)} <span>p.${Number(evidence.page) || "?"}</span></figcaption></figure>`;
  };
  const bodyMarkup = (slide) => (Array.isArray(slide.body) ? slide.body : []).filter(Boolean).slice(0, 5).map((line) => `<p>${escapeHtml(clean(line, 190))}</p>`).join("");

  function renderAcademicDeckV2(plan, paper, options = {}) {
    const theme = themes[options.style || plan?.style || "academic-defense-blue"] || themes["academic-defense-blue"];
    const slides = Array.isArray(plan?.slides) && plan.slides.length ? plan.slides : [{ title: paper?.title || "Academic presentation", coreClaim: "", layoutFamily: "cover", body: [], sourceRefs: [] }];
    const slideMarkup = slides.map((slide, index) => {
      const role = String(slide.layoutFamily || slide.role || "context").toLowerCase(); const cover = index === 0 || role === "cover"; const closing = role === "closing" || role === "discussion";
      const evidence = (Array.isArray(slide.evidence) ? slide.evidence : Array.isArray(slide.evidenceIds) ? slide.evidenceIds : []).slice(0, 2).map((entry) => evidenceMarkup(entry, paper)).filter(Boolean).join("");
      const bodyText = bodyMarkup(slide); const refs = Array.from(new Set((slide.sourceRefs || []).filter(Boolean))).slice(0, 6).map((ref) => `<span>${escapeHtml(ref)}</span>`).join("");
      if (cover) return `<section class="slide defense-slide cover" data-slide-page="${index + 1}"><div class="defense-nav">ACADEMIC PRESENTATION <span>${String(index + 1).padStart(2, "0")}/${slides.length}</span></div><div class="cover-block"><p class="section-kicker">${escapeHtml(paper?.sourceFile || "PDF RESEARCH")}</p><h1>${escapeHtml(clean(slide.title || plan?.title || paper?.title, 150))}</h1><p class="lead">${escapeHtml(clean(slide.coreClaim || "", 260))}</p><p class="metadata">${escapeHtml([paper?.authors, paper?.institution].filter(Boolean).join(" · "))}</p></div><footer>${refs}</footer></section>`;
      return `<section class="slide defense-slide role-${escapeHtml(role)} ${closing ? "closing" : ""}" data-slide-page="${index + 1}"><div class="defense-nav"><span>${escapeHtml(role.toUpperCase())}</span><span>${String(index + 1).padStart(2, "0")}/${slides.length}</span></div><header><p class="section-kicker">${escapeHtml(role)}</p><h2>${escapeHtml(clean(slide.title, 120))}</h2><p class="claim">${escapeHtml(clean(slide.coreClaim, 230))}</p></header><div class="content-zone ${evidence ? "has-evidence" : "text-only"}"><div class="copy">${bodyText || `<p>${escapeHtml(clean(slide.coreClaim, 190))}</p>`}</div>${evidence ? `<div class="evidence-zone">${evidence}</div>` : ""}</div><footer>${refs || `<span>source-locked · ${escapeHtml(paper?.sourceFile || "PDF")}</span>`}</footer></section>`;
    }).join("");
    const css = `:root{--paper:${theme.paper};--ink:${theme.ink};--navy:${theme.navy};--accent:${theme.accent};--muted:${theme.muted}}*{box-sizing:border-box}html,body{margin:0;background:#e5e9ef;color:var(--ink);font-family:Arial,"Microsoft YaHei",sans-serif}.slide{display:none;position:relative;width:1280px;height:720px;overflow:hidden;background:var(--paper);padding:34px 58px 42px}.slide:first-child,.slide.active{display:block}.defense-slide:before{content:"";position:absolute;inset:0;border-top:10px solid var(--navy);pointer-events:none}.defense-nav{position:relative;display:flex;justify-content:space-between;align-items:center;color:var(--navy);font-size:13px;letter-spacing:.12em;font-weight:800;border-bottom:2px solid #d8dee8;padding-bottom:10px}.section-kicker{margin:0;color:var(--accent);font-size:14px;font-weight:800;letter-spacing:.13em;text-transform:uppercase}.cover-block{height:calc(100% - 62px);display:flex;flex-direction:column;justify-content:center;max-width:1030px}.cover h1{margin:16px 0 22px;font-family:Georgia,"Songti SC",serif;font-size:64px;line-height:1.08;letter-spacing:-.04em;color:var(--navy)}.lead{font-size:25px;line-height:1.4;color:var(--muted);max-width:900px}.metadata{margin-top:24px;color:var(--ink);font-size:17px}.defense-slide header{padding-top:28px}.defense-slide h2{margin:9px 0 10px;font-size:42px;line-height:1.08;letter-spacing:-.03em;color:var(--navy)}.claim{margin:0;color:var(--ink);font-size:23px;line-height:1.3;font-weight:750;max-width:980px}.content-zone{display:grid;gap:30px;align-items:start;margin-top:28px;height:420px}.content-zone.has-evidence{grid-template-columns:minmax(0,.88fr) minmax(0,1.12fr)}.content-zone.text-only{grid-template-columns:minmax(0,1fr);max-width:1030px}.copy{font-size:20px;line-height:1.48;overflow:hidden}.copy p{margin:0 0 14px}.evidence-zone{display:grid;grid-template-columns:repeat(auto-fit,minmax(0,1fr));gap:14px;align-items:start}.academic-evidence{margin:0;background:#fff;border:1px solid #ccd5e1;padding:10px;min-width:0}.academic-evidence img{display:block;width:100%;height:300px;object-fit:contain}.academic-evidence figcaption{margin-top:8px;color:var(--muted);font-size:13px;line-height:1.3}.academic-evidence figcaption span{float:right;color:var(--accent);font-weight:800}.defense-slide footer{position:absolute;left:58px;right:58px;bottom:18px;display:flex;gap:12px;border-top:1px solid #cbd4df;padding-top:7px;color:var(--muted);font-size:12px}.role-results h2,.role-evidence h2{color:var(--accent)}.role-results .content-zone.has-evidence,.role-evidence .content-zone.has-evidence{grid-template-columns:minmax(0,.65fr) minmax(0,1.35fr)}.role-results .academic-evidence img,.role-evidence .academic-evidence img{height:360px}.closing .content-zone{margin-top:54px}.closing .copy{font-size:24px;color:var(--navy)}`;
    const runtime = `<script>(()=>{let i=Math.max(0,(Number(location.hash.slice(1))||1)-1);const s=[...document.querySelectorAll('.slide')];const show=n=>{i=Math.max(0,Math.min(s.length-1,n));s.forEach((x,k)=>x.classList.toggle('active',k===i));location.hash='#'+(i+1)};addEventListener('keydown',e=>{if(e.key==='ArrowRight'||e.key===' '){e.preventDefault();show(i+1)}if(e.key==='ArrowLeft'){e.preventDefault();show(i-1)}});show(i)})();</script>`;
    return `<!doctype html><html lang="${paper?.language === "en" ? "en" : "zh-CN"}"><head><meta charset="utf-8"><meta name="viewport" content="width=1280,initial-scale=1"><title>${escapeHtml(plan?.title || paper?.title || "Academic presentation")}</title><style>${css}</style></head><body data-academic-project="v5">${slideMarkup}${runtime}</body></html>`;
  }

  window.PdfImportCoreV2 = Object.freeze({ convertPdf, renderAcademicDeckV2 });
})();
