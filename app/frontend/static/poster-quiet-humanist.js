(function () {
  "use strict";

  const $ = (id) => document.getElementById(id);
  const state = { spec: null, referenceImage: "", busy: false };
  const IMAGE_KEY = "ppt-poster-ai-v3";
  const layouts = new Set(["editorial-split", "monumental-anchor", "staged-process", "active-interaction", "printed-sequence", "type-anchor-lockup", "isolated-image-fable", "uneven-title-field"]);

  function setStatus(message) { window.PosterStudio?.setStatus?.(message); }
  function config() { return window.PptAiConfig?.loadAiConfig?.() || { mode: "local" }; }
  function imageConfig() {
    try { return { provider: "cloudflare-workers-ai", model: "@cf/black-forest-labs/flux-2-klein-9b", outputFormat: "png", ...JSON.parse(localStorage.getItem(IMAGE_KEY) || "{}") }; }
    catch { return { provider: "cloudflare-workers-ai", model: "@cf/black-forest-labs/flux-2-klein-9b", outputFormat: "png" }; }
  }
  function escapeHtml(value) { return String(value || "").replace(/[&<>"']/g, (char) => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", "\"":"&quot;", "'":"&#39;" }[char])); }
  function setBusy(value, message) { state.busy = Boolean(value); const button = $("compileZinePoster"); if (button) button.disabled = state.busy; const progress = $("posterProgress"); if (progress) progress.hidden = !state.busy; if (message) { const label = progress?.querySelector("strong"); if (label) label.textContent = message; } }

  async function readSse(response, onEvent) {
    if (!response.ok || !response.body) throw new Error((await response.text().catch(() => "")) || `HTTP ${response.status}`);
    const reader = response.body.getReader(); const decoder = new TextDecoder(); let buffer = "";
    while (true) {
      const { done, value } = await reader.read(); if (done) break;
      buffer += decoder.decode(value, { stream: true }); const records = buffer.split(/\r?\n\r?\n/); buffer = records.pop() || "";
      for (const record of records) {
        const eventName = record.match(/^event:\s*(.+)$/m)?.[1] || "message";
        const raw = record.split(/\r?\n/).filter((line) => /^data\s*:/.test(line)).map((line) => line.replace(/^data\s*:\s?/, "")).join("\n");
        if (!raw) continue; const data = JSON.parse(raw); if (eventName === "error") throw new Error(data.message || "视觉方案生成失败。"); await onEvent(eventName, data);
      }
    }
  }

  function selectedDirection() {
    const id = $("humanistDirection")?.value; return state.spec?.directions?.find((item) => item.id === id) || state.spec?.directions?.[0] || {};
  }

  function syncReview(spec) {
    const copy = spec.copy || {}; const first = spec.directions?.[0] || {};
    const select = $("humanistDirection"); if (select) { select.replaceChildren(); (spec.directions || []).forEach((direction, index) => { const option = document.createElement("option"); option.value = direction.id || `direction-${index + 1}`; option.textContent = `${index + 1}. ${direction.title || direction.layoutFamily || "视觉方向"} · ${direction.rationale || ""}`.slice(0, 120); select.appendChild(option); }); }
    $("zineBriefPhrase").value = copy.headline || "";
    $("zineBriefEditorialText").value = copy.humanNote || copy.supportLine || "";
    $("humanistBriefSupportLine").value = copy.supportLine || "";
    $("humanistBriefIdentity").value = copy.identity || "";
    $("humanistBriefMetadata").value = copy.metadata || "";
    $("zinePrompt").value = first.prompt || "";
    $("zineNegativePrompt").value = first.negativePrompt || "";
    $("zineRecipeMeta").textContent = `Quiet Humanist · ${spec.directions?.length || 0} 个方向 · 先选语义，再生成图像`;
  }

  function currentSpec() {
    const base = state.spec || {}; const copy = { ...(base.copy || {}) }; const direction = selectedDirection();
    copy.headline = $("zineBriefPhrase").value.trim(); copy.humanNote = $("zineBriefEditorialText").value.trim(); copy.supportLine = $("humanistBriefSupportLine").value.trim(); copy.identity = $("humanistBriefIdentity").value.trim(); copy.metadata = $("humanistBriefMetadata").value.trim();
    const directions = (base.directions || []).map((item) => item.id === direction.id ? { ...item, prompt: $("zinePrompt").value.trim(), negativePrompt: $("zineNegativePrompt").value.trim() } : item);
    return { ...base, copy, directions, selectedDirectionId: direction.id };
  }

  async function compile(event) {
    event.preventDefault(); if (state.busy) return;
    const theme = $("zineTheme").value.trim(); if (!theme) return setStatus("请先输入主题或内容简报。");
    const integration = config(); if (!integration.apiKey || !integration.endpoint || integration.mode === "local") return setStatus("请先在系统 AI 设置中配置可用的文本模型。");
    setBusy(true, "正在理解主题并组织三个视觉方向"); setStatus("AI 正在提取内容主体、动作、结果与准确文案…");
    try {
      const response = await fetch("/api/quiet-humanist-poster/v1/compile/stream", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ theme, exactPhrase: $("zineExactPhrase").value.trim(), supportLine: $("humanistSupportLine").value.trim(), identity: $("humanistIdentity").value.trim(), metadata: $("humanistMetadata").value.trim(), hasReferenceImage: Boolean(state.referenceImage), integration }) });
      let compiled = null; await readSse(response, (eventName, data) => { if (eventName === "compiled" || eventName === "complete") compiled = data.spec || compiled; });
      if (!compiled) throw new Error("AI 没有返回可用的 Quiet Humanist 视觉方案。");
      state.spec = compiled; syncReview(compiled); $("zineBriefStage").hidden = false; setStatus("三个视觉方向已生成。请选择一个方向，确认文案后再调用生图模型。");
    } catch (error) { setStatus(String(error.message || error)); }
    finally { setBusy(false); }
  }

  function blobToDataUrl(blob) { return new Promise((resolve, reject) => { const reader = new FileReader(); reader.onerror = () => reject(new Error("图片读取失败。")); reader.onload = () => resolve(String(reader.result || "")); reader.readAsDataURL(blob); }); }
  function loadImage(src) { return new Promise((resolve, reject) => { const image = new Image(); image.onload = () => resolve(image); image.onerror = () => reject(new Error("图像模型返回的图片无法解码。")); image.src = src; }); }

  function composeHtml(spec, imageDataUrl, quality) {
    const direction = selectedDirection(); const copy = spec.copy || {}; const layout = layouts.has(direction.layoutFamily) ? direction.layoutFamily : "editorial-split";
    const reference = state.referenceImage ? `<figure class="humanist-reference editor-layer" data-editable-media><img src="${escapeHtml(state.referenceImage)}" alt="参考照片"><figcaption>REFERENCE / ${escapeHtml(direction.anchor || "content anchor")}</figcaption></figure>` : "";
    return `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(copy.headline || "Quiet Humanist Poster")}</title><style>
      *{box-sizing:border-box}html,body{margin:0;min-height:100%;background:#dfe2df}body{display:grid;place-items:center;font-family:Georgia,"Songti SC","Noto Serif SC",serif}.quiet-humanist-poster{position:relative;width:1200px;height:2000px;overflow:hidden;background:#f3f0e8;color:#202320;isolation:isolate}.humanist-image{position:absolute;z-index:1;object-fit:cover;filter:saturate(.82) contrast(.96);mix-blend-mode:multiply}.humanist-wash{position:absolute;inset:0;z-index:2;pointer-events:none;background:linear-gradient(120deg,rgba(255,255,255,.2),transparent 42%,rgba(23,36,31,.08));mix-blend-mode:multiply}.humanist-kicker,.humanist-meta,.humanist-identity,.humanist-note,.humanist-support,.humanist-headline{position:absolute;z-index:5;margin:0}.humanist-kicker{left:68px;top:62px;color:#4c5a4b;font:700 18px/1 ui-monospace,SFMono-Regular,Consolas,monospace;letter-spacing:.13em;text-transform:uppercase}.humanist-meta{right:68px;top:68px;color:#596259;font:600 16px/1.2 ui-monospace,SFMono-Regular,Consolas,monospace;letter-spacing:.08em;text-align:right}.humanist-headline{left:68px;bottom:118px;max-width:840px;color:#1f2722;font:800 88px/.9 Georgia,"Songti SC","Noto Serif SC",serif;letter-spacing:-.065em;text-wrap:balance}.humanist-support{left:72px;top:186px;max-width:410px;color:#2f3d32;font:600 29px/1.25 Georgia,"Songti SC","Noto Serif SC",serif}.humanist-note{left:72px;bottom:70px;max-width:570px;color:#586157;font:600 17px/1.35 ui-monospace,SFMono-Regular,Consolas,monospace;letter-spacing:.035em}.humanist-identity{right:68px;bottom:68px;max-width:340px;color:#4b564c;font:600 16px/1.35 ui-monospace,SFMono-Regular,Consolas,monospace;text-align:right}.humanist-reference{position:absolute;z-index:6;left:72px;top:930px;width:220px;margin:0;transform:rotate(-2deg)}.humanist-reference img{display:block;width:100%;height:270px;object-fit:cover;filter:grayscale(.72) contrast(.9);border:1px solid rgba(28,34,29,.5);box-shadow:4px 5px 0 rgba(28,34,29,.13)}.humanist-reference figcaption{margin-top:8px;color:#4d594e;font:600 12px/1.2 ui-monospace,SFMono-Regular,Consolas,monospace;letter-spacing:.08em}.humanist-stage .humanist-image{left:430px;top:430px;width:690px;height:980px}.humanist-monumental .humanist-image{left:165px;top:380px;width:900px;height:1100px}.humanist-process .humanist-image{left:100px;top:470px;width:1000px;height:730px}.humanist-lockup .humanist-image{left:350px;top:240px;width:720px;height:980px}.humanist-fable .humanist-image{left:300px;top:560px;width:610px;height:720px}.humanist-uneven .humanist-image{left:210px;top:340px;width:850px;height:1050px}.humanist-poster:not(.humanist-stage):not(.humanist-monumental):not(.humanist-process):not(.humanist-lockup):not(.humanist-fable):not(.humanist-uneven) .humanist-image{left:430px;top:380px;width:690px;height:990px}.humanist-accent{position:absolute;z-index:4;left:56%;top:55%;width:58px;height:58px;background:#d05d38;transform:rotate(-8deg);clip-path:polygon(7% 12%,94% 0,100% 86%,18% 100%);mix-blend-mode:multiply}
    </style></head><body><main class="quiet-humanist-poster humanist-${escapeHtml(layout)}" data-poster-slide="quiet-humanist" data-humanist-quality="${escapeHtml(JSON.stringify(quality))}"><img class="humanist-image" src="${escapeHtml(imageDataUrl)}" alt="Quiet Humanist 内容视觉"><div class="humanist-wash"></div><div class="humanist-accent editor-layer" data-editable-box aria-label="色彩标记"></div><p class="humanist-kicker editor-layer" data-editable>${escapeHtml(copy.kicker || "EDITORIAL POSTER")}</p><p class="humanist-meta editor-layer" data-editable>${escapeHtml(copy.metadata || "")}</p><h1 class="humanist-headline editor-layer" data-editable>${escapeHtml(copy.headline || "")}</h1><p class="humanist-support editor-layer" data-editable>${escapeHtml(copy.supportLine || "")}</p><p class="humanist-note editor-layer" data-editable>${escapeHtml(copy.humanNote || "")}</p><p class="humanist-identity editor-layer" data-editable>${escapeHtml(copy.identity || "")}</p>${reference}</main></body></html>`;
  }

  async function generate() {
    if (!state.spec || state.busy) return; const spec = currentSpec(); const direction = selectedDirection(); if (!direction.prompt) return setStatus("视觉提示词不能为空。");
    setBusy(true, "正在生成内容相关的插图层"); setStatus("图像模型正在表现主体、动作和可见结果…");
    try {
      const response = await fetch("/api/quiet-humanist-poster/v1/render", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ spec, selectedDirectionId: direction.id, imageConfig: imageConfig() }) });
      if (!response.ok) { const detail = await response.json().catch(() => ({})); throw new Error(detail.message || `图像模型 HTTP ${response.status}`); }
      const imageDataUrl = await blobToDataUrl(await response.blob()); await loadImage(imageDataUrl);
      const quality = { version: "QuietHumanistPosterQualityV1", ok: Boolean(spec.copy?.headline && spec.copy?.supportLine && direction.anchor && direction.action), direction: direction.id, warning: "" };
      const html = composeHtml(spec, imageDataUrl, quality);
      await window.PosterStudio?.mount?.(html, { version: "QuietHumanistPosterV1", kind: "quiet-humanist", source: "quiet-humanist-poster", mode: "ai_image", style: "quiet-humanist", title: spec.copy?.headline || "Quiet Humanist Poster", spec, quality, label: `${direction.title || direction.layoutFamily || "Quiet Humanist"} · ${quality.ok ? "文案与视觉关系已通过" : "保留生成结果：请人工检查文案"}` });
      $("zineBriefStage").hidden = true; setStatus(quality.ok ? "Quiet Humanist 海报已生成：可编辑标题、功能说明和身份信息。" : "海报已生成，但建议人工检查文案与主体关系。结果已保留。");
    } catch (error) { setStatus(String(error.message || error)); }
    finally { setBusy(false); }
  }

  $("zineReferenceImage")?.addEventListener("change", (event) => {
    const file = event.target.files?.[0]; if (!file) { state.referenceImage = ""; return; }
    if (file.size > 5 * 1024 * 1024) { event.target.value = ""; return setStatus("参考照片不能超过 5 MB。"); }
    const reader = new FileReader(); reader.onload = () => { state.referenceImage = String(reader.result || ""); }; reader.readAsDataURL(file);
  });
  $("humanistDirection")?.addEventListener("change", () => { const direction = selectedDirection(); $("zinePrompt").value = direction.prompt || ""; $("zineNegativePrompt").value = direction.negativePrompt || ""; });
  window.PosterStyleAdapters = window.PosterStyleAdapters || {};
  window.PosterStyleAdapters["quiet-humanist"] = { compile, generate, cancel: () => { $("zineBriefStage").hidden = true; setStatus("请修改主题后重新生成方案。"); }, getState: () => ({ ...state }) };
})();
