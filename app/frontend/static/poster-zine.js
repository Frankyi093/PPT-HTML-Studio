(function () {
  "use strict";

  const $ = (id) => document.getElementById(id);
  const state = { spec: null, referenceImage: "", busy: false };
  const IMAGE_KEY = "ppt-poster-ai-v3";
  const ACCENTS = { cobalt: "#1d4ed8", cyan: "#00a8c6", violet: "#7045c7", magenta: "#d72d78", lemon: "#e3bd00", "pear-green": "#53a63c", orange: "#e56a19", tomato: "#d84632" };
  const POSITIONS = { "center-fragment": ["50%", "52%"], "lower-left-float": ["29%", "69%"], "upper-right-block": ["72%", "27%"], "dual-panel": ["52%", "54%"], "irregular-cutout": ["62%", "58%"], "type-led": ["51%", "57%"], "dot-orbit": ["49%", "54%"], "single-specimen": ["50%", "54%"] };

  function setStatus(message) { window.PosterStudio?.setStatus?.(message); }
  function config() { return window.PptAiConfig?.loadAiConfig?.() || { mode: "local" }; }
  function imageConfig() { try { return { provider: "cloudflare-workers-ai", model: "@cf/black-forest-labs/flux-2-klein-9b", outputFormat: "png", ...JSON.parse(localStorage.getItem(IMAGE_KEY) || "{}") }; } catch { return { provider: "cloudflare-workers-ai", model: "@cf/black-forest-labs/flux-2-klein-9b", outputFormat: "png" }; } }
  function escapeHtml(value) { return String(value || "").replace(/[&<>\"']/g, (char) => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", "\"":"&quot;", "'":"&#39;" }[char])); }
  function setBusy(value, message) { state.busy = Boolean(value); const button = $("compileZinePoster"); if (button) button.disabled = state.busy; const progress = $("posterProgress"); if (progress) progress.hidden = !state.busy; if (message) { const label = progress?.querySelector("strong"); if (label) label.textContent = message; } }
  function selectValue(id, value) { const node = $(id); if (node && [...node.options].some((option) => option.value === value)) node.value = value; }

  async function readSse(response, onEvent) {
    if (!response.ok || !response.body) throw new Error((await response.text().catch(() => "")) || `HTTP ${response.status}`);
    const reader = response.body.getReader(); const decoder = new TextDecoder(); let buffer = "";
    while (true) {
      const { done, value } = await reader.read(); if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const records = buffer.split(/\r?\n\r?\n/); buffer = records.pop() || "";
      for (const record of records) {
        const event = record.match(/^event:\s*(.+)$/m)?.[1] || "message";
        const raw = record.split(/\r?\n/).filter((line) => /^data\s*:/.test(line)).map((line) => line.replace(/^data\s*:\s?/, "")).join("\n");
        if (!raw) continue;
        const data = JSON.parse(raw);
        if (event === "error") throw new Error(data.message || "视觉方案生成失败。");
        await onEvent(event, data);
      }
    }
  }

  function syncRecipe(spec) {
    const recipe = spec.recipe || {};
    selectValue("zineLayout", recipe.layoutFamily); selectValue("zineAccent", recipe.accentHue);
    selectValue("zineAnchor", recipe.anchorType); selectValue("zineTexture", recipe.textureMode);
    $("zineBriefPhrase").value = spec.content?.exactPhrase || "";
    $("zineBriefEditorialText").value = spec.content?.editorialText || "";
    $("zinePrompt").value = spec.prompt || "";
    $("zineNegativePrompt").value = spec.negativePrompt || "";
    $("zineRecipeMeta").textContent = `${recipe.layoutFamily || "center-fragment"} · ${recipe.anchorType || "object-specimen"} · ${recipe.typographyMode || "archive-microtext"} · ${recipe.textureMode || "risograph-grain"} · ${recipe.moodMode || "quiet"}`;
  }

  function currentSpec() {
    const base = state.spec || {}; const recipe = { ...(base.recipe || {}) };
    recipe.layoutFamily = $("zineLayout").value; recipe.accentHue = $("zineAccent").value;
    recipe.anchorType = $("zineAnchor").value; recipe.textureMode = $("zineTexture").value;
    return { ...base, recipe, content: { ...(base.content || {}), exactPhrase: $("zineBriefPhrase").value.trim(), editorialText: $("zineBriefEditorialText").value.trim() }, prompt: $("zinePrompt").value.trim(), negativePrompt: $("zineNegativePrompt").value.trim() };
  }

  async function compile(event) {
    event.preventDefault(); if (state.busy) return;
    const theme = $("zineTheme").value.trim(); if (!theme) return setStatus("请先输入主题或内容简报。");
    const integration = config();
    if (!integration.apiKey || !integration.endpoint || integration.mode === "local") return setStatus("请先在系统 AI 设置中配置可用的文本模型。");
    setBusy(true, "正在提炼视觉隐喻与纸张构图"); setStatus("AI 正在选择视觉主体、构图、色彩锚点和印刷质感…");
    try {
      const response = await fetch("/api/minimal-zine-poster/v1/compile/stream", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ theme, exactPhrase: $("zineExactPhrase").value.trim(), hasReferenceImage: Boolean(state.referenceImage), integration }) });
      let compiled = null;
      await readSse(response, (eventName, data) => { if (eventName === "compiled" || eventName === "complete") compiled = data.spec || compiled; });
      if (!compiled) throw new Error("AI 没有返回可用的视觉方案。");
      state.spec = compiled; syncRecipe(compiled); $("zineBriefStage").hidden = false;
      setStatus("视觉方案已生成。可修改短句、构图、色彩、主体和提示词后再确认。");
    } catch (error) { setStatus(String(error.message || error)); }
    finally { setBusy(false); }
  }

  function blobToDataUrl(blob) { return new Promise((resolve, reject) => { const reader = new FileReader(); reader.onerror = () => reject(new Error("图片读取失败。")); reader.onload = () => resolve(String(reader.result || "")); reader.readAsDataURL(blob); }); }
  function loadImage(src) { return new Promise((resolve, reject) => { const image = new Image(); image.onload = () => resolve(image); image.onerror = () => reject(new Error("图像模型返回的图片无法解码。")); image.src = src; }); }

  async function auditImage(dataUrl, spec) {
    const image = await loadImage(dataUrl); const canvas = document.createElement("canvas"); canvas.width = 80; canvas.height = 134;
    const context = canvas.getContext("2d", { willReadFrequently: true }); context.drawImage(image, 0, 0, canvas.width, canvas.height);
    const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data; let saturated = 0; let edges = 0; let total = 0;
    for (let y = 0; y < canvas.height; y += 1) for (let x = 0; x < canvas.width; x += 1) {
      const index = (y * canvas.width + x) * 4; const r = pixels[index], g = pixels[index + 1], b = pixels[index + 2]; const max = Math.max(r, g, b), min = Math.min(r, g, b); total += 1;
      if (max > 115 && max - min > 70) saturated += 1;
      if (x && Math.abs(r - pixels[index - 4]) + Math.abs(g - pixels[index - 3]) + Math.abs(b - pixels[index - 2]) > 110) edges += 1;
    }
    const saturationRatio = saturated / total; const edgeRatio = edges / total;
    return { version: "MinimalZinePosterQualityV1", ok: saturationRatio >= .003, saturationRatio: Number(saturationRatio.toFixed(4)), edgeRatio: Number(edgeRatio.toFixed(4)), negativeSpacePct: spec.geometry?.negativeSpacePct || 80, clusterPct: spec.geometry?.clusterPct || 16, accentPct: spec.geometry?.accentPct || 1.5, warning: saturationRatio < .003 ? "accent-anchor-not-detected" : "" };
  }

  function zineHtml(spec, imageDataUrl, quality) {
    const recipe = spec.recipe || {}; const [left, top] = POSITIONS[recipe.layoutFamily] || POSITIONS["center-fragment"]; const accent = ACCENTS[recipe.accentHue] || ACCENTS.cobalt;
    const phrase = spec.content?.exactPhrase || ""; const theme = spec.content?.theme || ""; const editorialText = spec.content?.editorialText || theme.slice(0, 120); const microtext = spec.content?.microtext || theme.slice(0, 72); const anchorLabel = recipe.anchorType?.replace(/-/g, " · ") || "paper specimen";
    const reference = state.referenceImage ? `<figure class="zine-reference editor-layer" data-editable-media><img src="${escapeHtml(state.referenceImage)}" alt="参考照片锚点"><figcaption>${escapeHtml(anchorLabel)}</figcaption></figure>` : "";
    return `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(phrase || "Minimal Zine Poster")}</title><style>
      *{box-sizing:border-box}html,body{margin:0;min-height:100%;background:#d9ddd8}body{display:grid;place-items:center;font-family:Georgia,"Songti SC","Noto Serif SC",serif}.minimal-zine-poster{position:relative;width:1200px;height:2000px;overflow:hidden;background:#eee8d9;color:#1d1c19;isolation:isolate}.zine-base{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;filter:saturate(.86) contrast(.94);mix-blend-mode:multiply;opacity:.96}.paper-grain{position:absolute;inset:0;z-index:2;opacity:.38;pointer-events:none;background-image:radial-gradient(rgba(35,31,24,.14) .55px,transparent .72px),linear-gradient(102deg,rgba(255,255,255,.16),transparent 39%,rgba(64,54,36,.1));background-size:5px 5px,100% 100%;mix-blend-mode:multiply}.zine-folio{position:absolute;z-index:5;left:68px;top:62px;color:#5f5a50;font:600 18px/1 ui-monospace,SFMono-Regular,Consolas,monospace;letter-spacing:.13em;text-transform:uppercase}.zine-stamp{position:absolute;z-index:5;right:68px;bottom:62px;color:#595348;font:600 15px/1 ui-monospace,SFMono-Regular,Consolas,monospace;letter-spacing:.12em}.zine-accent{position:absolute;z-index:4;left:${left};top:${top};width:31px;height:31px;background:${accent};transform:translate(-50%,-50%) rotate(-7deg);clip-path:polygon(8% 14%,93% 0,100% 84%,18% 100%);mix-blend-mode:multiply}.zine-phrase{position:absolute;z-index:6;left:70px;bottom:112px;max-width:730px;margin:0;color:#1c1b17;font:700 56px/.98 Georgia,"Songti SC","Noto Serif SC",serif;letter-spacing:-.055em;text-wrap:balance}.zine-theme{position:absolute;z-index:5;left:72px;top:108px;max-width:410px;color:#4c4840;font:500 16px/1.45 ui-monospace,SFMono-Regular,Consolas,monospace;letter-spacing:.04em}.zine-reference{position:absolute;z-index:5;left:calc(${left} - 110px);top:calc(${top} - 135px);width:220px;margin:0;transform:rotate(-2deg)}.zine-reference img{display:block;width:100%;height:270px;object-fit:cover;filter:grayscale(.8) contrast(.86);border:1px solid rgba(25,24,20,.5);box-shadow:3px 4px 0 rgba(27,24,18,.15)}.zine-reference figcaption{margin-top:8px;color:#514c45;font:600 12px/1.2 ui-monospace,SFMono-Regular,Consolas,monospace;letter-spacing:.09em;text-transform:uppercase}.zine-ghost{position:absolute;z-index:3;left:72px;top:56%;width:68%;color:rgba(42,39,33,.24);font:500 20px/1.25 ui-monospace,SFMono-Regular,Consolas,monospace;letter-spacing:.22em;word-break:break-all}.zine-tag{position:absolute;z-index:6;right:66px;top:72px;color:${accent};font:800 15px/1 ui-monospace,SFMono-Regular,Consolas,monospace;letter-spacing:.15em;text-transform:uppercase}
    </style></head><body><main class="minimal-zine-poster" data-poster-slide="minimal-zine" data-layout="${escapeHtml(recipe.layoutFamily || "center-fragment")}" data-zine-quality="${escapeHtml(JSON.stringify(quality))}"><img class="zine-base" src="${escapeHtml(imageDataUrl)}" alt="AI 生成的纸张视觉底图"><div class="paper-grain"></div><p class="zine-folio editor-layer" data-editable>NO. 03 / 05</p><p class="zine-tag editor-layer" data-editable>${escapeHtml(recipe.textureMode || "risograph-grain")}</p><p class="zine-theme editor-layer" data-editable>${escapeHtml(theme.slice(0, 150))}</p><div class="zine-accent editor-layer" data-editable-box aria-label="色彩锚点"></div><p class="zine-ghost" aria-hidden="true">${escapeHtml((recipe.moodMode || "quiet memory").toUpperCase())}</p>${reference}${phrase ? `<h1 class="zine-phrase editor-layer" data-editable>${escapeHtml(phrase)}</h1>` : ""}<p class="zine-stamp editor-layer" data-editable>SCANNED PAPER / ${escapeHtml(recipe.accentHue || "cobalt")}</p></main></body></html>`;
  }

  function zineHtmlDense(spec, imageDataUrl, quality) {
    const recipe = spec.recipe || {}; const [left, top] = POSITIONS[recipe.layoutFamily] || POSITIONS["center-fragment"]; const accent = ACCENTS[recipe.accentHue] || ACCENTS.cobalt;
    const phrase = spec.content?.exactPhrase || ""; const theme = spec.content?.theme || ""; const editorialText = spec.content?.editorialText || theme.slice(0, 120); const microtext = spec.content?.microtext || theme.slice(0, 72); const anchorLabel = recipe.anchorType?.replace(/-/g, " · ") || "paper specimen";
    const reference = state.referenceImage ? `<figure class="zine-reference editor-layer" data-editable-media><img src="${escapeHtml(state.referenceImage)}" alt="参考照片锚点"><figcaption>${escapeHtml(anchorLabel)}</figcaption></figure>` : "";
    return `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(phrase || "Minimal Zine Poster")}</title><style>
      *{box-sizing:border-box}html,body{margin:0;min-height:100%;background:#d9ddd8}body{display:grid;place-items:center;font-family:Georgia,"Songti SC","Noto Serif SC",serif}.minimal-zine-poster{position:relative;width:1200px;height:2000px;overflow:hidden;background:#eee8d9;color:#1d1c19;isolation:isolate}.zine-base{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;filter:saturate(.86) contrast(.94);mix-blend-mode:multiply;opacity:.96}.paper-grain{position:absolute;inset:0;z-index:2;opacity:.38;pointer-events:none;background-image:radial-gradient(rgba(35,31,24,.14) .55px,transparent .72px),linear-gradient(102deg,rgba(255,255,255,.16),transparent 39%,rgba(64,54,36,.1));background-size:5px 5px,100% 100%;mix-blend-mode:multiply}.zine-folio{position:absolute;z-index:5;left:68px;top:62px;color:#5f5a50;font:700 21px/1 ui-monospace,SFMono-Regular,Consolas,monospace;letter-spacing:.13em;text-transform:uppercase}.zine-stamp{position:absolute;z-index:5;right:68px;bottom:62px;color:#595348;font:700 17px/1 ui-monospace,SFMono-Regular,Consolas,monospace;letter-spacing:.12em}.zine-accent{position:absolute;z-index:4;left:${left};top:${top};width:44px;height:44px;background:${accent};transform:translate(-50%,-50%) rotate(-7deg);clip-path:polygon(8% 14%,93% 0,100% 84%,18% 100%);mix-blend-mode:multiply}.zine-phrase{position:absolute;z-index:6;left:68px;bottom:112px;max-width:870px;margin:0;color:#1c1b17;font:700 78px/.94 Georgia,"Songti SC","Noto Serif SC",serif;letter-spacing:-.06em;text-wrap:balance}.zine-microtext{position:absolute;z-index:5;left:72px;top:116px;max-width:820px;color:#48433b;font:650 20px/1.4 ui-monospace,SFMono-Regular,Consolas,monospace;letter-spacing:.035em}.zine-editorial{position:absolute;z-index:5;left:72px;top:176px;max-width:790px;margin:0;color:#343129;font:600 31px/1.32 Georgia,"Songti SC","Noto Serif SC",serif;letter-spacing:-.025em;text-wrap:pretty}.zine-reference{position:absolute;z-index:5;left:calc(${left} - 126px);top:calc(${top} - 148px);width:252px;margin:0;transform:rotate(-2deg)}.zine-reference img{display:block;width:100%;height:306px;object-fit:cover;filter:grayscale(.8) contrast(.86);border:1px solid rgba(25,24,20,.5);box-shadow:3px 4px 0 rgba(27,24,18,.15)}.zine-reference figcaption{margin-top:8px;color:#514c45;font:700 14px/1.2 ui-monospace,SFMono-Regular,Consolas,monospace;letter-spacing:.09em;text-transform:uppercase}.zine-ghost{position:absolute;z-index:3;left:72px;top:54%;width:73%;color:rgba(42,39,33,.24);font:600 25px/1.25 ui-monospace,SFMono-Regular,Consolas,monospace;letter-spacing:.22em;word-break:break-all}.zine-tag{position:absolute;z-index:6;right:66px;top:72px;color:${accent};font:800 17px/1 ui-monospace,SFMono-Regular,Consolas,monospace;letter-spacing:.15em;text-transform:uppercase}
    </style></head><body><main class="minimal-zine-poster" data-poster-slide="minimal-zine" data-layout="${escapeHtml(recipe.layoutFamily || "center-fragment")}" data-zine-quality="${escapeHtml(JSON.stringify(quality))}"><img class="zine-base" src="${escapeHtml(imageDataUrl)}" alt="AI 生成的纸张视觉底图"><div class="paper-grain"></div><p class="zine-folio editor-layer" data-editable>NO. 03 / 05</p><p class="zine-tag editor-layer" data-editable>${escapeHtml(recipe.textureMode || "risograph-grain")}</p><p class="zine-microtext editor-layer" data-editable>${escapeHtml(microtext)}</p><p class="zine-editorial editor-layer" data-editable>${escapeHtml(editorialText)}</p><div class="zine-accent editor-layer" data-editable-box aria-label="色彩锚点"></div><p class="zine-ghost" aria-hidden="true">${escapeHtml((recipe.moodMode || "quiet memory").toUpperCase())}</p>${reference}${phrase ? `<h1 class="zine-phrase editor-layer" data-editable>${escapeHtml(phrase)}</h1>` : ""}<p class="zine-stamp editor-layer" data-editable>SCANNED PAPER / ${escapeHtml(recipe.accentHue || "cobalt")}</p></main></body></html>`;
  }

  async function requestImage(spec, strengthen = false) {
    const prompt = strengthen ? `${spec.prompt}\n\nMake the single ${spec.recipe?.accentHue || "cobalt"} color anchor clearly visible at thumbnail scale; keep all other colors subdued.` : spec.prompt;
    const response = await fetch("/api/minimal-zine-poster/v1/render", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ spec: { ...spec, prompt }, imageConfig: imageConfig() }) });
    if (!response.ok) { const detail = await response.json().catch(() => ({})); throw new Error(detail.message || `图像模型 HTTP ${response.status}`); }
    return blobToDataUrl(await response.blob());
  }

  async function generate() {
    if (!state.spec || state.busy) return;
    const spec = currentSpec(); if (!spec.prompt) return setStatus("画面提示词不能为空。");
    setBusy(true, "正在生成纸张视觉底图"); setStatus("图像模型正在生成仿旧纸张与单一视觉主体…");
    try {
      let imageDataUrl = await requestImage(spec); let quality = await auditImage(imageDataUrl, spec);
      if (!quality.ok) { setStatus("未检测到清晰色彩锚点，正在进行一次受控重试…"); imageDataUrl = await requestImage(spec, true); quality = await auditImage(imageDataUrl, spec); }
      const html = zineHtmlDense(spec, imageDataUrl, quality);
      await window.PosterStudio?.mount?.(html, { version: "MinimalZinePosterV1", kind: "minimal-zine", source: "minimal-zine-poster", mode: "ai_image", style: "minimal-zine", title: spec.content?.exactPhrase || spec.content?.theme?.slice(0, 48) || "Minimal Zine Poster", spec, recipe: spec.recipe, prompt: spec.prompt, quality, label: `${spec.recipe?.layoutFamily || "center-fragment"} · ${spec.recipe?.accentHue || "cobalt"} · ${quality.ok ? "视觉质量已通过" : "保留生成结果：色彩锚点待人工确认"}` });
      $("zineBriefStage").hidden = true; setStatus(quality.ok ? "海报已生成：可编辑短句、纸张标签和参考照片锚点。" : "海报已生成，但色彩锚点需要人工确认。结果已保留。");
    } catch (error) { setStatus(String(error.message || error)); }
    finally { setBusy(false); }
  }

  $("zineReferenceImage")?.addEventListener("change", (event) => {
    const file = event.target.files?.[0]; if (!file) { state.referenceImage = ""; return; }
    if (file.size > 5 * 1024 * 1024) { event.target.value = ""; return setStatus("参考照片不能超过 5 MB。"); }
    const reader = new FileReader(); reader.onload = () => { state.referenceImage = String(reader.result || ""); setStatus("参考照片已加载；生成时会作为可编辑的小型锚点保留。"); }; reader.readAsDataURL(file);
  });
  window.PosterStyleAdapters = window.PosterStyleAdapters || {};
  window.PosterStyleAdapters["minimal-zine"] = {
    compile,
    generate,
    cancel: () => { $("zineBriefStage").hidden = true; setStatus("请修改主题后重新生成视觉方案。"); },
    getState: () => ({ ...state }),
  };
})();
