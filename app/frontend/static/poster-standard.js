(function () {
  "use strict";

  const $ = (id) => document.getElementById(id);
  const state = { style: "minimal-zine", mode: "standard" };
  const styleCopy = {
    "minimal-zine": { intro: "3:5 仿旧纸张、充足留白、一个小型主体、一种清晰色彩锚点。重要文字由编辑器准确排版。", status: "输入主题，AI 会先编译成可确认的 Minimal Zine 视觉方案。", confirm: "确认并生成海报" },
    "quiet-humanist": { intro: "先理解主题，再生成具体主体、动作和结果痕迹。三个视觉方向会在确认后只生成一次图片。", status: "输入主题，AI 会先编译成可确认的 Quiet Humanist 视觉方向。", confirm: "确认方向并生成海报" },
    "acid-swiss-pop": { intro: "复古酸性设计、瑞士网格、半色调印刷与高饱和撞色。AI 会先生成可编辑的标题、标签和视觉构图，再按确认方案生成主体图像。", status: "输入主题，AI 会先编译成可确认的 Retro Acid Swiss 视觉方案。", confirm: "确认视觉方案并生成海报" },
    "editorial-action": { intro: "明亮户外动作摄影、低角度广角、巨大奶油色标题和紧凑社论信息层级。人物、动作、地点和产品可由你指定，也可留空交给 AI。", status: "输入主题，AI 会自动补全人物、动作、地点、产品和动作海报视觉方案。", confirm: "确认动作方案并生成海报" },
    "qiaomu-mondo": { intro: "以一个主题象征物讲述故事：2–4 色丝网印刷、纸张颗粒、负形和视觉反转。AI 先生成可编辑的文案与构图说明，再单独绘制无文字的主体图像。", status: "输入主题，AI 会先编译成可确认的 Qiaomu Mondo 概念海报方案。", confirm: "确认概念方案并生成海报" },
  };

  function setStatus(message) { window.PosterStudio?.setStatus?.(message); }
  function adapter() { return window.PosterStyleAdapters?.[state.style]; }
  function selectStyle(style, announce = true) {
    if (!styleCopy[style]) return;
    state.style = style;
    document.querySelectorAll("[data-poster-style]").forEach((button) => { const active = button.dataset.posterStyle === style; button.classList.toggle("active", active); button.setAttribute("aria-selected", String(active)); });
    const copy = styleCopy[style];
    if ($("humanistInputFields")) $("humanistInputFields").hidden = style !== "quiet-humanist";
    if ($("humanistBriefFields")) $("humanistBriefFields").hidden = style !== "quiet-humanist";
    if ($("acidInputFields")) $("acidInputFields").hidden = style !== "acid-swiss-pop";
    if ($("acidBriefFields")) $("acidBriefFields").hidden = style !== "acid-swiss-pop";
    if ($("actionInputFields")) $("actionInputFields").hidden = style !== "editorial-action";
    if ($("actionBriefFields")) $("actionBriefFields").hidden = style !== "editorial-action";
    if ($("mondoInputFields")) $("mondoInputFields").hidden = style !== "qiaomu-mondo";
    if ($("mondoBriefFields")) $("mondoBriefFields").hidden = style !== "qiaomu-mondo";
    if ($("zineVisualFields")) $("zineVisualFields").hidden = style !== "minimal-zine";
    if ($("posterStyleIntro")) $("posterStyleIntro").textContent = copy.intro;
    if ($("zineBriefConfirm")) $("zineBriefConfirm").textContent = copy.confirm;
    if (announce) { $("zineBriefStage").hidden = true; setStatus(copy.status); }
  }

  function selectMode(mode) {
    state.mode = mode;
    document.querySelectorAll("[data-poster-mode]").forEach((button) => { const active = button.dataset.posterMode === mode; button.classList.toggle("active", active); button.setAttribute("aria-selected", String(active)); });
    const academic = mode === "academic";
    $("zinePosterForm").hidden = academic; $("zineBriefStage").hidden = true; $("academicPosterForm").hidden = !academic; $("posterBriefStage").hidden = true;
    setStatus(academic ? "学术海报保留来源锁定的 Word 工作流。" : styleCopy[state.style].status);
  }

  const acidButton = document.querySelector("#posterStyleSwitcherAcid [data-poster-style=acid-swiss-pop]");
  if (acidButton && $("posterStyleSwitcher")) { $("posterStyleSwitcher").appendChild(acidButton); $("posterStyleSwitcherAcid")?.remove(); }
  const actionButton = document.querySelector("#posterStyleSwitcherAction [data-poster-style=editorial-action]");
  if (actionButton && $("posterStyleSwitcher")) { $("posterStyleSwitcher").appendChild(actionButton); $("posterStyleSwitcherAction")?.remove(); }
  const mondoButton = document.querySelector("#posterStyleSwitcherMondo [data-poster-style=qiaomu-mondo]");
  if (mondoButton && $("posterStyleSwitcher")) { $("posterStyleSwitcher").appendChild(mondoButton); $("posterStyleSwitcherMondo")?.remove(); }

  $("zinePosterForm")?.addEventListener("submit", (event) => {
    if (state.mode !== "standard") return;
    const current = adapter(); if (!current?.compile) { event.preventDefault(); return setStatus("海报风格模块尚未加载，请刷新页面重试。"); }
    current.compile(event);
  });
  $("zineBriefConfirm")?.addEventListener("click", () => adapter()?.generate?.());
  $("zineBriefCancel")?.addEventListener("click", () => adapter()?.cancel?.());
  document.querySelectorAll("[data-poster-style]").forEach((button) => button.addEventListener("click", () => selectStyle(button.dataset.posterStyle)));
  document.querySelectorAll("[data-poster-mode]").forEach((button) => button.addEventListener("click", () => selectMode(button.dataset.posterMode)));
  selectStyle("minimal-zine", false); selectMode("standard");
})();
