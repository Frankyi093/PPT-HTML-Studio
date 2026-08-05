(function () {
  "use strict";

  const $ = (id) => document.getElementById(id);
  const state = { spec: null, busy: false };
  const IMAGE_KEY = "ppt-poster-ai-v3";
  const types = new Set(["film", "music", "book", "event", "concept"]);
  const compositions = new Set(["single-symbol", "negative-space-dual", "geometric-frame", "layered-atmosphere", "silhouette-scale"]);
  const aspects = new Set(["3:5", "2:3", "4:5"]);
  const eras = new Set(["1960s", "1970s", "1980s"]);

  function setStatus(message) { window.PosterStudio?.setStatus?.(message); }
  function integration() { return window.PptAiConfig?.loadAiConfig?.() || { mode: "local" }; }
  function imageConfig() { try { return { provider: "cloudflare-workers-ai", model: "@cf/black-forest-labs/flux-2-klein-9b", outputFormat: "png", ...JSON.parse(localStorage.getItem(IMAGE_KEY) || "{}") }; } catch { return { provider: "cloudflare-workers-ai", model: "@cf/black-forest-labs/flux-2-klein-9b", outputFormat: "png" }; } }
  function esc(value) { return String(value || "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])); }
  function text(id) { return $(id)?.value.trim() || ""; }
  function select(id, allowed, fallback) { const value = text(id); return allowed.has(value) ? value : fallback; }
  function setBusy(value, label) { state.busy = Boolean(value); const button = $("compileZinePoster"); if (button) button.disabled = state.busy; const progress = $("posterProgress"); if (progress) progress.hidden = !state.busy; if (label && progress?.querySelector("strong")) progress.querySelector("strong").textContent = label; }

  async function readSse(response) {
    if (!response.ok || !response.body) throw new Error((await response.text().catch(() => "")) || `HTTP ${response.status}`);
    const reader = response.body.getReader(); const decoder = new TextDecoder(); let buffer = ""; let result = null;
    while (true) { const { done, value } = await reader.read(); if (done) break; buffer += decoder.decode(value, { stream: true }); const records = buffer.split(/\r?\n\r?\n/); buffer = records.pop() || ""; for (const record of records) { const event = record.match(/^event:\s*(.+)$/m)?.[1] || "message"; const raw = record.split(/\r?\n/).filter((line) => /^data\s*:/.test(line)).map((line) => line.replace(/^data\s*:\s?/, "")).join("\n"); if (!raw) continue; const data = JSON.parse(raw); if (event === "error") throw new Error(data.message || "视觉方案生成失败"); if (event === "compiled" || event === "complete") result = data.spec || result; } }
    return result;
  }

  function syncReview(spec) {
    const copy = spec.copy || {}; const visual = spec.visual || {}; const layout = spec.layout || {};
    $("zineBriefPhrase").value = copy.headline || "";
    $("zineBriefEditorialText").value = copy.footerText || copy.supportLine || "";
    $("mondoBriefType").value = types.has(spec.type) ? spec.type : "concept";
    $("mondoBriefComposition").value = compositions.has(layout.composition) ? layout.composition : "single-symbol";
    $("mondoBriefAspect").value = aspects.has(layout.aspect) ? layout.aspect : "3:5";
    $("mondoBriefPalette").value = visual.palette || "";
    $("mondoBriefSymbol").value = visual.symbol || "";
    $("mondoBriefMeaning").value = visual.hiddenMeaning || "";
    $("mondoBriefEra").value = eras.has(visual.era) ? visual.era : "1970s";
    $("zinePrompt").value = spec.prompt || "";
    $("zineNegativePrompt").value = spec.negativePrompt || "readable text, letters, logos, watermark, photorealistic product mockup";
    $("zineRecipeMeta").textContent = `Qiaomu Mondo · ${visual.symbol || "symbolic subject"} · ${layout.composition || "single-symbol"}`;
  }

  function currentSpec() {
    const base = state.spec || {}; const copy = { ...(base.copy || {}), headline: text("zineBriefPhrase"), footerText: text("zineBriefEditorialText") };
    const visual = { ...(base.visual || {}), palette: text("mondoBriefPalette"), symbol: text("mondoBriefSymbol"), hiddenMeaning: text("mondoBriefMeaning"), era: select("mondoBriefEra", eras, "1970s") };
    const layout = { ...(base.layout || {}), composition: select("mondoBriefComposition", compositions, "single-symbol"), aspect: select("mondoBriefAspect", aspects, "3:5") };
    return { ...base, type: select("mondoBriefType", types, "concept"), copy, visual, layout, prompt: text("zinePrompt"), negativePrompt: text("zineNegativePrompt") };
  }

  async function compile(event) {
    event.preventDefault(); if (state.busy) return;
    const theme = text("zineTheme"); if (!theme) return setStatus("请先输入主题或内容简报。");
    const config = integration(); if (!config.apiKey || !config.endpoint || config.mode === "local") return setStatus("请先在 AI 设置中配置可用的文本模型。");
    setBusy(true, "正在提炼主题并编译 Mondo 概念方案"); setStatus("AI 正在选择象征主体、视觉反转、限色色板与可编辑文案。");
    try {
      const response = await fetch("/api/qiaomu-mondo-poster/v1/compile/stream", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ theme, exactPhrase: text("zineExactPhrase"), type: text("mondoType"), composition: text("mondoComposition"), aspect: text("mondoAspect"), palette: text("mondoPalette"), integration: config }) });
      const spec = await readSse(response); if (!spec) throw new Error("AI 没有返回可用的 Qiaomu Mondo 视觉方案。"); state.spec = spec; syncReview(spec); $("zineBriefStage").hidden = false; setStatus("概念方案已生成。确认后才会调用生图模型。");
    } catch (error) { setStatus(String(error.message || error)); } finally { setBusy(false); }
  }

  function dataUrl(blob) { return new Promise((resolve, reject) => { const reader = new FileReader(); reader.onerror = () => reject(new Error("图片读取失败")); reader.onload = () => resolve(String(reader.result || "")); reader.readAsDataURL(blob); }); }
  function loadImage(src) { return new Promise((resolve, reject) => { const image = new Image(); image.onload = () => resolve(image); image.onerror = () => reject(new Error("生图模型返回的图片无法解码")); image.src = src; }); }

  function composeHtml(spec, image, quality) {
    const copy = spec.copy || {}; const visual = spec.visual || {}; const layout = spec.layout || {}; const composition = compositions.has(layout.composition) ? layout.composition : "single-symbol";
    return `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(copy.headline || "Qiaomu Mondo Poster")}</title><style>*{box-sizing:border-box}html,body{margin:0;background:#d8d0bd}body{display:grid;place-items:center;font-family:Impact,"Arial Narrow",Arial,"Microsoft YaHei",sans-serif}.mondo-poster{position:relative;width:1200px;height:2000px;overflow:hidden;isolation:isolate;background:#e9dfca;color:#19243a}.mondo-poster:before{content:"";position:absolute;inset:0;opacity:.17;background-image:radial-gradient(rgba(31,35,43,.55) .8px,transparent .9px),linear-gradient(102deg,rgba(255,255,255,.34),transparent 45%);background-size:5px 5px,100% 100%;mix-blend-mode:multiply}.mondo-sun{position:absolute;z-index:1;left:-200px;top:720px;width:940px;height:940px;border-radius:50%;background:#db6d32}.mondo-field{position:absolute;z-index:1;right:-100px;bottom:0;width:780px;height:930px;background:#214c64;clip-path:polygon(28% 0,100% 10%,100% 100%,0 100%)}.mondo-art{position:absolute;z-index:2;left:100px;top:420px;width:1000px;height:1100px;object-fit:cover;filter:contrast(1.12) saturate(.82) sepia(.18);mix-blend-mode:multiply;clip-path:polygon(8% 0,100% 7%,92% 95%,0 100%)}.mondo-mask{position:absolute;z-index:3;left:690px;top:500px;width:350px;height:920px;background:#e9dfca;mix-blend-mode:screen;opacity:.72;clip-path:polygon(0 0,100% 11%,73% 46%,100% 100%,0 92%,21% 51%)}.mondo-kicker,.mondo-type,.mondo-footer,.mondo-meta,.mondo-number{position:absolute;z-index:6;margin:0}.mondo-kicker{left:72px;top:74px;font:700 19px/1.2 Arial,sans-serif;letter-spacing:.2em}.mondo-type{left:64px;top:128px;right:40px;font:900 160px/.78 Impact,"Arial Narrow",Arial,sans-serif;letter-spacing:-.045em;text-transform:uppercase;color:#18233a;word-break:break-word}.mondo-type span{display:inline-block;padding:4px 18px;background:#d4a22d;color:#172238}.mondo-meta{right:66px;top:82px;width:190px;font:700 15px/1.38 Arial,sans-serif;letter-spacing:.1em;text-align:right}.mondo-meta:before{content:"";display:block;width:88px;border-top:5px solid #19243a;margin:0 0 13px auto}.mondo-number{right:68px;bottom:92px;font:900 168px/.7 Impact,"Arial Narrow",Arial,sans-serif;color:#e9dfca}.mondo-footer{left:72px;right:270px;bottom:94px;font:700 19px/1.38 Arial,"Microsoft YaHei",sans-serif;letter-spacing:.035em}.mondo-side{position:absolute;z-index:6;left:44px;top:700px;font:700 18px/1 Arial,sans-serif;letter-spacing:.13em;writing-mode:vertical-rl;transform:rotate(180deg)}.mondo-rule{position:absolute;z-index:6;left:70px;right:70px;bottom:328px;border-top:4px solid #19243a}.mondo-mark{position:absolute;z-index:6;right:72px;top:360px;width:76px;height:76px;border:7px solid #19243a;transform:rotate(45deg)}.mondo-mark:after{content:"";position:absolute;inset:18px;background:#db6d32}.mondo-poster.composition-negative-space-dual .mondo-mask{left:420px;top:400px;width:490px;height:1080px}.mondo-poster.composition-geometric-frame .mondo-art{clip-path:polygon(0 8%,78% 0,100% 82%,28% 100%)}.mondo-poster.composition-layered-atmosphere .mondo-art{opacity:.88;transform:rotate(-4deg) scale(1.06)}.mondo-poster.composition-silhouette-scale .mondo-art{left:210px;width:870px;clip-path:polygon(0 0,100% 0,78% 100%,0 82%)}.mondo-poster:after{content:"";position:absolute;z-index:9;inset:28px;border:3px solid rgba(25,36,58,.72);pointer-events:none}</style></head><body><main class="mondo-poster composition-${esc(composition)}" data-poster-slide="qiaomu-mondo" data-qiaomu-mondo-quality="${esc(JSON.stringify(quality))}"><div class="mondo-sun"></div><div class="mondo-field"></div><img class="mondo-art" src="${esc(image)}" alt="generated symbolic subject"><div class="mondo-mask"></div><p class="mondo-kicker editor-layer" data-editable>${esc(copy.kicker || "MONDO EDITION")}</p><h1 class="mondo-type editor-layer" data-editable>${esc(copy.headline || "SAY LESS")}</h1><p class="mondo-meta editor-layer" data-editable>${esc(copy.supportLine || visual.hiddenMeaning || "A SYMBOLIC POSTER STUDY")}<br><br>${esc(visual.era || "1970s")} · ${esc(spec.type || "CONCEPT")}</p><p class="mondo-side editor-layer" data-editable>${esc(copy.sideLabel || visual.symbol || "VISUAL METAPHOR")}</p><div class="mondo-mark"></div><div class="mondo-rule"></div><p class="mondo-footer editor-layer" data-editable>${esc(copy.footerText || "One image, one idea, and a print-like visual reversal.")}</p><p class="mondo-number editor-layer" data-editable>${esc(copy.issue || "05")}</p></main></body></html>`;
  }

  async function generate() {
    if (!state.spec || state.busy) return; const spec = currentSpec(); if (!spec.prompt) return setStatus("画面提示词不能为空。");
    setBusy(true, "正在生成 Mondo 象征主体"); setStatus("生图模型只绘制象征主体与印刷空间，文字将由编辑器准确排版。");
    try { const response = await fetch("/api/qiaomu-mondo-poster/v1/render", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ spec, imageConfig: imageConfig() }) }); if (!response.ok) { const detail = await response.json().catch(() => ({})); throw new Error(detail.message || `生图模型 HTTP ${response.status}`); } const image = await dataUrl(await response.blob()); await loadImage(image); const quality = { version: "QiaomuMondoPosterQualityV1", ok: Boolean(spec.copy?.headline && spec.visual?.symbol), warning: "" }; const html = composeHtml(spec, image, quality); await window.PosterStudio?.mount?.(html, { version: "QiaomuMondoPosterV1", kind: "qiaomu-mondo", source: "qiaomu-mondo-poster", mode: "ai_image", style: "qiaomu-mondo", title: spec.copy?.headline || "Qiaomu Mondo Poster", spec, quality, label: `Qiaomu Mondo · ${quality.ok ? "概念与文字层级已通过" : "保留生成结果，请人工检查"}` }); $("zineBriefStage").hidden = true; setStatus("Qiaomu Mondo 海报已生成，可编辑并导出。");
    } catch (error) { setStatus(String(error.message || error)); } finally { setBusy(false); }
  }

  window.PosterStyleAdapters = window.PosterStyleAdapters || {};
  window.PosterStyleAdapters["qiaomu-mondo"] = { compile, generate, cancel: () => { $("zineBriefStage").hidden = true; setStatus("请修改主题后重新生成概念方案。"); }, getState: () => ({ ...state }) };
})();
