(function () {
  "use strict";
  const $ = (id) => document.getElementById(id);
  const form = $("academicPosterForm");
  if (!form || !window.mammoth || !window.TurndownService) return;
  const state = { file: null, markdown: "", assets: [], copy: null, canvas: null, visualUrl: "", busy: false };
  const IMAGE_KEY = "ppt-poster-ai-v3";
  const dimensions = () => ({ width: 1200, height: 1600 });
  const setStatus = (message, kind = "") => { const node = $("academicPosterStatus"); if (node) { node.textContent = String(message || ""); node.dataset.kind = kind; } };
  const sharedConfig = () => window.PptAiConfig?.loadAiConfig?.() || {};
  const imageConfig = () => { try { return { provider: "cloudflare-workers-ai", model: "@cf/black-forest-labs/flux-2-klein-9b", outputFormat: "png", ...JSON.parse(localStorage.getItem(IMAGE_KEY) || "{}") }; } catch { return { provider: "cloudflare-workers-ai", model: "@cf/black-forest-labs/flux-2-klein-9b", outputFormat: "png" }; } };
  const escape = (value) => String(value || "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char]));
  const safeName = (value, ext) => String(value || "academic-poster").replace(/[\\/:*?"<>|]+/g, "-").replace(/\s+/g, "-").slice(0, 70) + ext;
  const sourceTitle = () => $("academicPosterTitle")?.value.trim() || state.file?.name.replace(/\.docx$/i, "") || "学术论文展板";

  function wrap(ctx, text, x, y, maxWidth, lineHeight, maxLines = 8) {
    const chars = Array.from(String(text || "")); const lines = []; let line = "";
    chars.forEach((char) => { const next = line + char; if (ctx.measureText(next).width > maxWidth && line) { lines.push(line); line = char; } else line = next; });
    if (line) lines.push(line);
    const visible = lines.slice(0, maxLines);
    if (lines.length > maxLines) visible[maxLines - 1] = visible[maxLines - 1].replace(/.$/, "…");
    visible.forEach((item, index) => ctx.fillText(item, x, y + index * lineHeight));
    return y + visible.length * lineHeight;
  }
  function roundRect(ctx, x, y, width, height, radius) { ctx.beginPath(); if (ctx.roundRect) ctx.roundRect(x, y, width, height, radius); else ctx.rect(x, y, width, height); }
  function drawImageContain(ctx, image, x, y, width, height) {
    const scale = Math.min(width / image.width, height / image.height); const dw = image.width * scale; const dh = image.height * scale;
    ctx.drawImage(image, x + (width - dw) / 2, y + (height - dh) / 2, dw, dh);
  }
  function loadImage(src) { return new Promise((resolve, reject) => { const image = new Image(); image.onload = () => resolve(image); image.onerror = reject; image.src = src; }); }
  async function parseWord(file) {
    setStatus("正在读取 Word 文本和原始图片…");
    const converted = await window.mammoth.convertToHtml({ arrayBuffer: await file.arrayBuffer() }, {
      includeDefaultStyleMap: true,
      convertImage: window.mammoth.images.imgElement((image) => image.readAsBase64String().then((base64) => ({ src: `data:${image.contentType};base64,${base64}` }))),
    });
    const doc = new DOMParser().parseFromString(converted.value, "text/html");
    const assets = [];
    doc.querySelectorAll("img[src^='data:image/']").forEach((node, index) => {
      const src = node.getAttribute("src"); if (!src) return;
      const id = `word-figure-${index + 1}`; node.setAttribute("data-word-asset-id", id); node.setAttribute("src", `asset://${id}`);
      assets.push({ id, src, alt: node.getAttribute("alt") || `原文图表 ${index + 1}` });
    });
    const turndown = new window.TurndownService({ headingStyle: "atx", bulletListMarker: "-" });
    turndown.addRule("wordFigure", { filter: (node) => node.nodeName === "IMG" && node.getAttribute("data-word-asset-id"), replacement: (_content, node) => `![${node.getAttribute("alt") || "原文图表"}](asset://${node.getAttribute("data-word-asset-id")})` });
    const markdown = turndown.turndown(doc.body.innerHTML).replace(/\n{3,}/g, "\n\n").trim();
    state.file = file; state.assets = assets; state.markdown = markdown;
    setStatus(`已读取 Word：${markdown.length.toLocaleString()} 字符，提取 ${assets.length} 张原始图片。`, "ok");
  }
  function readSse(response, onEvent) {
    return (async () => { const reader = response.body?.getReader(); if (!reader) throw new Error("AI 文案接口未返回流式响应。"); const decoder = new TextDecoder(); let buffer = ""; while (true) { const { done, value } = await reader.read(); if (done) break; buffer += decoder.decode(value, { stream: true }); const records = buffer.split(/\r?\n\r?\n/); buffer = records.pop() || ""; records.forEach((record) => { const event = record.match(/^event:\s*(.+)$/m)?.[1]; const raw = record.match(/^data:\s*(.+)$/m)?.[1]; if (event && raw) onEvent(event, JSON.parse(raw)); }); } })();
  }
  async function generateCopy() {
    const config = sharedConfig(); if (!config.apiKey || !config.endpoint || config.mode === "local") throw new Error("学术海报需要先在统一 AI 设置中配置可用的文案模型。");
    const response = await fetch("/api/academic-poster/copy/stream", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ rewriteCopy: true, integration: config, copy: { academic: true, title: sourceTitle(), subtitle: $("academicPosterAuthors")?.value.trim() || "", body: state.markdown.slice(0, 30000), cta: $("academicPosterInstitution")?.value.trim() || "", requirements: $("academicPosterRequirements")?.value.trim() || "" } }) });
    if (!response.ok) throw new Error((await response.text()) || `文案模型 HTTP ${response.status}`);
    let copy = null; await readSse(response, (event, data) => { if (event === "copy_ready" || event === "complete") copy = data.copy || copy; if (event === "error") throw new Error(data.message || "文案模型生成失败"); });
    if (!copy) throw new Error("文案模型未返回可用的学术摘要。");
    return copy;
  }
  async function generateVisual(copy) {
    const config = imageConfig();
    const response = await fetch("/api/academic-poster/image", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ imageConfig: config, width: 1024, height: 1024, prompt: `Academic research poster visual background, restrained navy and warm paper palette, abstract method and data visualization motifs, no text, no logos. Topic: ${copy.title}`, negativePrompt: "text, letters, logos, watermark, fake numbers" }) });
    if (!response.ok) { const data = await response.json().catch(() => ({})); throw new Error(data.message || `图像模型 HTTP ${response.status}`); }
    return URL.createObjectURL(await response.blob());
  }
  async function compose(copy, visualUrl) {
    const { width, height } = dimensions(); const canvas = document.createElement("canvas"); canvas.width = width; canvas.height = height; canvas.id = "posterImageCanvas"; canvas.className = "poster-image-canvas"; const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#f7f4eb"; ctx.fillRect(0, 0, width, height); ctx.fillStyle = "#24467f"; ctx.fillRect(0, 0, width, 238); ctx.fillStyle = "#fff"; ctx.font = "800 46px Inter, Arial, Microsoft YaHei, sans-serif"; wrap(ctx, copy.title || sourceTitle(), 58, 54, width - 116, 58, 3); ctx.font = "500 22px Inter, Arial, Microsoft YaHei, sans-serif"; wrap(ctx, [$("academicPosterAuthors")?.value.trim(), $("academicPosterInstitution")?.value.trim()].filter(Boolean).join(" · "), 60, 190, width - 120, 30, 2);
    const image = visualUrl ? await loadImage(visualUrl).catch(() => null) : null; if (image) { ctx.globalAlpha = .2; drawImageContain(ctx, image, width - 390, 24, 330, 190); ctx.globalAlpha = 1; }
    const sections = [{ label: "摘要与问题", text: copy.subtitle || "研究问题与核心背景" }, { label: "方法与数据", text: (copy.body || [])[0] || "研究方法与数据来源" }, { label: "主要发现", text: (copy.body || []).slice(1, 4).join(" ") || "主要实验结果与结论" }, { label: "结论与贡献", text: (copy.body || []).slice(4, 7).join(" ") || "研究贡献、局限与后续工作" }];
    let y = 284; ctx.font = "700 30px Inter, Arial, Microsoft YaHei, sans-serif"; sections.forEach((section, index) => { const x = index % 2 ? 624 : 58; if (index % 2 === 0 && index > 0) y += 270; const boxY = index < 2 ? 284 : y; roundRect(ctx, x, boxY, 518, 228, 18); ctx.fillStyle = index === 2 ? "#e8eef7" : "#fffdf8"; ctx.fill(); ctx.strokeStyle = "#d1d9e4"; ctx.stroke(); ctx.fillStyle = "#24467f"; ctx.fillText(section.label, x + 24, boxY + 28); ctx.fillStyle = "#172033"; ctx.font = "500 22px Inter, Arial, Microsoft YaHei, sans-serif"; wrap(ctx, section.text, x + 24, boxY + 82, 470, 31, 5); });
    const figures = await Promise.all(state.assets.slice(0, 4).map((asset) => loadImage(asset.src).then((image) => ({ asset, image })).catch(() => null))); const usable = figures.filter(Boolean); const figY = 930; ctx.fillStyle = "#24467f"; ctx.font = "700 28px Inter, Arial, Microsoft YaHei, sans-serif"; ctx.fillText("原文证据图表", 58, figY); usable.forEach(({ asset, image }, index) => { const x = 58 + (index % 2) * 550; const yy = figY + 36 + Math.floor(index / 2) * 230; ctx.fillStyle = "#fff"; ctx.fillRect(x, yy, 500, 190); drawImageContain(ctx, image, x + 12, yy + 12, 476, 150); ctx.fillStyle = "#5b6b80"; ctx.font = "500 16px Inter, Arial, Microsoft YaHei, sans-serif"; ctx.fillText(`${asset.alt} · 原文图表`, x + 14, yy + 176); });
    ctx.fillStyle = "#5b6b80"; ctx.font = "500 16px Inter, Arial, Microsoft YaHei, sans-serif"; ctx.fillText(`SOURCE: ${state.file?.name || "Word document"} · AI summary + original figures`, 58, height - 34); return canvas;
  }
  async function saveHistory(copy, canvas, visualUrl) { if (!window.PptHistory?.saveRecord) return; await window.PptHistory.saveRecord({ id: `POSTER-ACADEMIC-${Date.now().toString(36).toUpperCase()}`, title: copy.title || sourceTitle(), source: "poster-academic-word", mode: "ai_image", style: "academic", slideCount: 1, fileName: safeName(copy.title || sourceTitle(), ".png"), html: "", editedHtml: "", thumbnail: canvas.toDataURL("image/jpeg", .65), thumbnailKind: "image", metadata: { posterV2: { copy, visualUrl, imageDataUrl: canvas.toDataURL("image/png"), width: canvas.width, height: canvas.height } } }); }
  async function submit(event) { event.preventDefault(); event.stopImmediatePropagation(); if (state.busy) return; if (!state.file) throw new Error("请先上传 Word 文档。"); state.busy = true; const button = form.querySelector('button[type="submit"]'); if (button) button.disabled = true; try { setStatus("共享文案模型正在总结论文…"); state.copy = await generateCopy(); setStatus("独立图像模型正在生成学术视觉…"); state.visualUrl = await generateVisual(state.copy); const canvas = await compose(state.copy, state.visualUrl); state.canvas = canvas; const shell = $("posterPreviewShell"); shell?.classList.add("image-mode"); $("posterPreviewFrame")?.setAttribute("hidden", "hidden"); $("posterEmpty")?.setAttribute("hidden", "hidden"); shell?.querySelector("#posterImageCanvas")?.remove(); shell?.appendChild(canvas); $("downloadPng")?.removeAttribute("disabled"); $("downloadWebp")?.removeAttribute("disabled"); await saveHistory(state.copy, canvas, state.visualUrl); setStatus("学术海报已生成。已使用共享文案模型、图像模型和 Word 原始图表。", "ok"); } finally { state.busy = false; if (button) button.disabled = false; } }
  $("academicPosterWord")?.addEventListener("change", async (event) => { const file = event.target.files?.[0]; if (!file) return; try { await parseWord(file); } catch (error) { setStatus(`Word 解析失败：${error.message || error}`, "error"); } });
  // Capture the academic form before the legacy submit listener.  The first
  // stage only asks the shared text model for editable copy; image generation
  // starts only after the user confirms the brief in the common panel.
  form.addEventListener("submit", (event) => {
    event.preventDefault(); event.stopImmediatePropagation(); if (state.busy) return;
    if (!state.file) return setStatus("请先上传 Word 文档。", "error");
    state.busy = true; const button = form.querySelector('button[type="submit"]'); if (button) button.disabled = true;
    generateCopy().then((copy) => {
      state.copy = copy; const stage = $("#posterBriefStage"); if (!stage) throw new Error("文案确认面板未加载");
      $("#posterBriefTitle").value = copy.title || sourceTitle(); $("#posterBriefSubtitle").value = copy.subtitle || ""; $("#posterBriefBody").value = Array.isArray(copy.body) ? copy.body.join("\n") : String(copy.body || ""); $("#posterBriefVisualPrompt").value = `Academic research poster visual, restrained academic palette, method and data evidence, no text. Topic: ${copy.title || sourceTitle()}`; stage.hidden = false;
      window.PptPosterBrief = { read: () => ({ title: $("#posterBriefTitle").value.trim(), subtitle: $("#posterBriefSubtitle").value.trim(), body: $("#posterBriefBody").value.split(/\r?\n/).map((x) => x.trim()).filter(Boolean), visualPrompt: $("#posterBriefVisualPrompt").value.trim(), negativePrompt: $("#posterBriefNegativePrompt").value.trim() }), close: () => { stage.hidden = true; window.PptPosterBrief = null; }, confirm: async (brief, prompt) => { state.copy = { ...state.copy, ...brief }; setStatus("确认后正在调用独立图像模型…"); state.visualUrl = await generateVisual(state.copy); const canvas = await compose(state.copy, state.visualUrl); state.canvas = canvas; const shell = $("#posterPreviewShell"); shell?.classList.add("image-mode"); $("#posterPreviewFrame")?.setAttribute("hidden", "hidden"); $("#posterEmpty")?.setAttribute("hidden", "hidden"); shell?.querySelector("#posterImageCanvas")?.remove(); shell?.appendChild(canvas); $("#downloadPng")?.removeAttribute("disabled"); $("#downloadWebp")?.removeAttribute("disabled"); await saveHistory(state.copy, canvas, state.visualUrl); setStatus("学术海报已生成。", "ok"); } };
    }).catch((error) => setStatus(String(error.message || error), "error")).finally(() => { state.busy = false; if (button) button.disabled = false; });
  }, true);
  $("#posterBriefConfirm")?.addEventListener("click", async () => { const brief = window.PptPosterBrief; if (!brief) return; const value = brief.read(); brief.close(); try { await brief.confirm(value, value.visualPrompt, value.negativePrompt); } catch (error) { setStatus(String(error.message || error), "error"); } });
  $("#posterBriefCancel")?.addEventListener("click", () => { window.PptPosterBrief?.close?.(); setStatus("请修改输入后重新生成文案。", ""); });
})();
