/*
 * Academic Poster V5
 *
 * This module keeps the paper as the source of truth while allowing an image
 * model to contribute a visual layer. Exact research copy, numbers, citations
 * and source charts are still rendered deterministically in HTML.
 */

const clean = (value, limit = 1800) => String(value ?? "").replace(/\s+/g, " ").trim().slice(0, limit);
const list = (value) => Array.isArray(value) ? value : [];
const esc = (value) => String(value ?? "").replace(/[&<>\"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char]));
const pageRef = (page) => `p.${Math.max(1, Number(page) || 1)}`;

function sourcePages(source) {
  return list(source?.pages).filter((page) => page?.text || page?.title);
}

function evidenceInventory(source) {
  return list(source?.figures).concat(list(source?.tables)).filter((asset) => asset?.id);
}

function usefulHeading(value) {
  const text = clean(value, 150);
  return text && !/^source overview$/i.test(text) && text.length > 3 ? text : "";
}

function sourceTitle(source) {
  const explicit = clean(source?.title, 260);
  if (usefulHeading(explicit) && !/^pdf page \d+$/i.test(explicit)) return explicit;
  const heading = sourcePages(source).map((page) => usefulHeading(page.title)).find(Boolean);
  return heading || clean(source?.sourceFile, 180).replace(/\.(pdf|docx)$/i, "") || "Academic Poster";
}

function sentences(text, maximum = 4) {
  return clean(text, 4200).split(/(?<=[。！？.!?])\s*/).map((item) => clean(item, 300)).filter((item) => item.length > 14).slice(0, maximum);
}

function classifyPage(page, index) {
  const haystack = `${page.title || ""} ${page.section || ""} ${page.text || ""}`.toLowerCase();
  if (/abstract|摘要|introduction|引言|background|背景|motivation|动机/.test(haystack)) return "motivation";
  if (/related work|literature|相关工作/.test(haystack)) return "related";
  if (/method|methodology|approach|framework|模型|方法|系统|算法/.test(haystack)) return "method";
  if (/data|dataset|sample|数据集|样本|材料/.test(haystack)) return "data";
  if (/experiment|evaluation|metric|评估|实验|指标/.test(haystack)) return "evaluation";
  if (/result|finding|结果|发现|analysis|分析/.test(haystack)) return "results";
  if (/discussion|limitation|future work|讨论|局限|未来/.test(haystack)) return "discussion";
  if (/conclusion|结论/.test(haystack)) return "conclusion";
  return index === 0 ? "motivation" : "evidence";
}

function sectionTitle(kind, page, index) {
  const map = {
    motivation: "Research question", related: "Prior context", method: "Method", data: "Data & setup",
    evaluation: "Evaluation", results: "Key results", discussion: "Discussion", conclusion: "Takeaway", evidence: "Evidence",
  };
  return usefulHeading(page?.title) || map[kind] || `Evidence ${index + 1}`;
}

function matchingAssets(source, page, kind) {
  const inventory = evidenceInventory(source);
  const exact = inventory.filter((asset) => Number(asset.page) === Number(page?.page));
  const byContext = inventory.filter((asset) => new RegExp(kind === "method" ? "method|framework|flow|方法" : kind === "results" ? "result|result|chart|结果" : kind, "i").test(`${asset.caption || ""} ${asset.context || ""}`));
  return [...exact, ...byContext, ...inventory].filter((asset, index, all) => all.findIndex((entry) => entry.id === asset.id) === index).slice(0, kind === "results" ? 2 : 1);
}

export function fallbackAcademicPosterBriefV5(source = {}, options = {}) {
  const pages = sourcePages(source);
  const prepared = pages.slice(0, 14).map((page, index) => ({ page, index, kind: classifyPage(page, index) }));
  const sections = prepared.map(({ page, index, kind }) => {
    const copy = sentences(page.text, kind === "results" ? 4 : 3);
    const assets = matchingAssets(source, page, kind);
    return {
      id: `${kind}-${index + 1}`,
      role: kind,
      heading: sectionTitle(kind, page, index),
      takeaway: copy[0] || clean(page.text || page.title, 280),
      bullets: copy.slice(1, 4),
      metrics: [],
      sourceRefs: [pageRef(page.page)],
      evidenceIds: assets.map((asset) => asset.id),
      visualType: assets.length ? "source-figure" : (kind === "method" ? "generated-method-diagram" : "text-only"),
      visualDescription: assets.length ? `Use the source ${assets[0].caption || "research figure"} as visual evidence.` : `A restrained academic visual explaining ${sectionTitle(kind, page, index)} without text or numerical claims.`,
      imagePrompt: assets.length ? "" : `Academic editorial visual for ${sectionTitle(kind, page, index)}, clean structured scientific composition, no text, no numbers, no logo.`,
      negativePrompt: "text, letters, fake chart, invented numbers, logo, watermark, QR code",
      layoutHint: kind === "results" ? "prominent evidence panel" : kind === "method" ? "process panel" : "supporting panel",
      priority: kind === "results" ? 5 : kind === "method" ? 4 : kind === "motivation" || kind === "conclusion" ? 3 : 2,
      wordBudget: kind === "results" ? 105 : 75,
    };
  });
  const nonEmpty = sections.filter((section) => section.takeaway);
  const used = nonEmpty.length ? nonEmpty : [{ id: "overview-1", role: "overview", heading: "Overview", takeaway: clean(source?.text, 300), bullets: [], metrics: [], sourceRefs: ["p.1"], evidenceIds: [], visualType: "text-only", visualDescription: "Clean editorial research field.", imagePrompt: "", negativePrompt: "", layoutHint: "lead", priority: 5, wordBudget: 100 }];
  const hero = used.find((section) => section.role === "results" && section.evidenceIds.length) || used.find((section) => section.evidenceIds.length) || used[0];
  const templateId = ["conference_paper_board", "landscape", "portrait", "teaser", "graphical_abstract"].includes(options.templateId) ? options.templateId : "conference_paper_board";
  const title = clean(usefulHeading(options.title) || sourceTitle(source), 260);
  return {
    version: "AcademicPosterBriefV5",
    metadata: { title, subtitle: clean(hero.takeaway, 260), authors: clean(options.authors || source?.authors, 320), institution: clean(options.institution || source?.institution, 320), conference: clean(options.conference, 180), language: source?.language === "en" ? "en" : "zh", sourceFile: clean(source?.sourceFile, 260) },
    coreNarrative: { problem: clean(used[0]?.takeaway, 320), approach: clean(used.find((section) => section.role === "method")?.takeaway, 320), mainFinding: clean(hero.takeaway, 320), contribution: clean(used.find((section) => section.role === "conclusion")?.takeaway || hero.takeaway, 320), takeaway: clean(hero.takeaway, 320) },
    sectionPlanning: { candidateCount: pages.length, finalCount: used.length, planningReason: "Sections are derived from the uploaded paper structure and are not capped at a fixed number.", mergedSections: [], splitSections: [], omittedSections: [] },
    globalVisual: { templateId, aspectRatio: templateId === "landscape" || templateId === "teaser" ? "16:9" : templateId === "graphical_abstract" ? "1:1" : "2:3", layoutMode: used.length > 8 ? "dense-adaptive-grid" : "editorial-evidence-grid", palette: ["deep navy", "warm paper", "academic blue"], typography: "serif research title with precise sans-serif annotation", visualTone: "bright, modern, credible, evidence-led academic editorial", heroPanelId: hero.id, generationPrompt: `Bright academic editorial poster visual layer for the research topic “${title}”. Create a structured warm-paper and deep-navy scientific composition with a calm, modern conceptual hero area. No readable text, no data charts, no numeric claims, no logos or watermarks; leave clean regions for exact HTML typography and original paper figures.`, negativePrompt: "readable text, letters, fake citations, fabricated charts, invented data, logo, watermark, QR code, low contrast, dark background, empty placeholder panels" },
    panels: used,
    footer: { finalTakeaway: clean(used.find((section) => section.role === "conclusion")?.takeaway || hero.takeaway, 300), contact: "", qrContent: "", acknowledgements: "" },
    provenance: { sourceLocked: true, renderer: "hybrid-image-plus-deterministic-html", generatedImages: true },
  };
}

function validRef(value) { return /^p\.\d+$/i.test(clean(value, 30)); }

export function normalizeAcademicPosterBriefV5(candidate = {}, source = {}, options = {}) {
  const fallback = fallbackAcademicPosterBriefV5(source, options);
  const sourceAssets = new Map(evidenceInventory(source).map((asset) => [asset.id, asset]));
  const raw = list(candidate.panels || candidate.sections).slice(0, 14);
  const panels = raw.map((panel, index) => {
    const base = fallback.panels[Math.min(index, fallback.panels.length - 1)] || fallback.panels[0];
    const evidenceIds = [...new Set(list(panel.evidenceIds).map((item) => clean(item, 80)).filter((id) => sourceAssets.has(id)))].slice(0, 3);
    const sourceRefs = [...new Set(list(panel.sourceRefs).map((item) => clean(item, 30)).filter(validRef))];
    const visualType = ["source-figure", "source-table", "generated-method-diagram", "generated-concept-visual", "text-only"].includes(panel.visualType) ? panel.visualType : (evidenceIds.length ? "source-figure" : base.visualType);
    return {
      id: clean(panel.id || base.id || `panel-${index + 1}`, 80).replace(/[^a-zA-Z0-9_-]/g, "-") || `panel-${index + 1}`,
      role: clean(panel.role || base.role, 60), heading: clean(panel.heading || base.heading, 120), takeaway: clean(panel.takeaway || panel.summary || base.takeaway, 380),
      bullets: list(panel.bullets || panel.points).map((item) => clean(item, 260)).filter(Boolean).slice(0, 5),
      metrics: list(panel.metrics).map((metric) => ({ value: clean(metric?.value, 80), label: clean(metric?.label, 120), sourceRef: validRef(metric?.sourceRef) ? clean(metric.sourceRef, 30) : "" })).filter((metric) => metric.value || metric.label).slice(0, 4),
      sourceRefs: sourceRefs.length ? sourceRefs : base.sourceRefs.slice(0, 3), evidenceIds: evidenceIds.length ? evidenceIds : base.evidenceIds.slice(0, 3), visualType,
      visualDescription: clean(panel.visualDescription || base.visualDescription, 540), imagePrompt: clean(panel.imagePrompt || base.imagePrompt, 1200), negativePrompt: clean(panel.negativePrompt || base.negativePrompt, 600), layoutHint: clean(panel.layoutHint || base.layoutHint, 120), priority: Math.max(1, Math.min(5, Number(panel.priority) || base.priority)), wordBudget: Math.max(35, Math.min(220, Number(panel.wordBudget) || base.wordBudget)), locked: Boolean(panel.locked),
    };
  }).filter((panel) => panel.takeaway);
  const finalPanels = panels.length ? panels : fallback.panels;
  const meta = candidate.metadata || candidate;
  const global = candidate.globalVisual || {};
  const hero = finalPanels.find((panel) => panel.id === global.heroPanelId) || finalPanels.slice().sort((a, b) => b.priority - a.priority)[0];
  return {
    ...fallback,
    metadata: { ...fallback.metadata, title: clean(usefulHeading(options.title) || usefulHeading(meta.title) || fallback.metadata.title, 260), subtitle: clean(meta.subtitle || fallback.metadata.subtitle, 280), authors: clean(options.authors || meta.authors || fallback.metadata.authors, 320), institution: clean(options.institution || meta.institution || fallback.metadata.institution, 320), conference: clean(options.conference || meta.conference || fallback.metadata.conference, 180) },
    coreNarrative: { ...fallback.coreNarrative, ...(candidate.coreNarrative || {}) },
    sectionPlanning: { ...fallback.sectionPlanning, ...(candidate.sectionPlanning || {}), finalCount: finalPanels.length },
    globalVisual: { ...fallback.globalVisual, ...global, heroPanelId: hero.id, generationPrompt: clean(global.generationPrompt || fallback.globalVisual.generationPrompt, 2400), negativePrompt: clean(global.negativePrompt || fallback.globalVisual.negativePrompt, 900) },
    panels: finalPanels,
    footer: { ...fallback.footer, ...(candidate.footer || {}) },
    provenance: { sourceLocked: true, renderer: "hybrid-image-plus-deterministic-html", generatedImages: true },
  };
}

export function academicPosterV5BriefPrompt(source = {}, options = {}) {
  const assets = evidenceInventory(source).map((asset) => ({ id: asset.id, page: asset.page, caption: asset.caption, context: clean(asset.context, 500), type: asset.kind || "figure" }));
  const pages = sourcePages(source).map((page) => ({ page: page.page, title: page.title, section: page.section, text: clean(page.text, 3000) }));
  return `Return one strict JSON object matching AcademicPosterBriefV5. You are a source-grounded academic poster planner influenced by a Parser -> Planner -> Painter -> Commenter workflow. Do not invent facts, values, authors, institutions, citations, figures or tables.\n\nPlan a readable poster from the uploaded paper. Determine the number of panels dynamically from the actual paper structure, information density, contribution count and evidence inventory. There is NO fixed panel limit. Merge tightly related content and split independent methods, experiments or findings when each has real evidence. Do not mechanically mirror the paper table of contents.\n\nRequired JSON keys: metadata, coreNarrative, sectionPlanning, globalVisual, panels, footer. Each panel must have id, role, heading, takeaway, bullets, metrics, sourceRefs, evidenceIds, visualType, visualDescription, imagePrompt, negativePrompt, layoutHint, priority and wordBudget.\n\nRules:\n- Every panel claim and metric must have one or more sourceRefs such as p.3.\n- Use evidenceIds only from the inventory and never reuse a source figure unless it is explicitly necessary.\n- visualType source-figure/source-table means retain the original uploaded evidence. Use generated-method-diagram or generated-concept-visual only for non-data supporting visuals.\n- The image model must never be asked to draw text, author names, citations, data charts, numerical results, logos or QR codes.\n- Select a single heroPanelId based on the strongest result or source visual.\n- Keep panel copy concise and scannable; use short bullets rather than paper paragraphs.\n- Respect the selected template ${options.templateId || "conference_paper_board"} and requirements: ${clean(options.requirements, 900) || "none"}.\n\nPaper metadata: ${JSON.stringify({ title: sourceTitle(source), authors: source.authors || "", institution: source.institution || "" })}\nEvidence inventory: ${JSON.stringify(assets)}\nSource pages: ${JSON.stringify(pages).slice(0, 44000)}`;
}

function assetById(source, id) { return evidenceInventory(source).find((asset) => asset.id === id) || null; }

function panelMarkup(panel, source) {
  const assets = panel.evidenceIds.map((id) => assetById(source, id)).filter(Boolean);
  const evidence = assets.length ? `<div class="v5-evidence">${assets.map((asset) => asset.assetRef ? `<figure data-evidence-id="${esc(asset.id)}"><img src="${esc(asset.assetRef)}" alt="${esc(asset.caption)}"><figcaption>${esc(asset.caption)} · ${pageRef(asset.page)}</figcaption></figure>` : `<div class="v5-table" data-evidence-id="${esc(asset.id)}">${esc(asset.caption)} · ${pageRef(asset.page)}</div>`).join("")}</div>` : "";
  const bullets = panel.bullets.length ? `<ul>${panel.bullets.map((item) => `<li>${esc(item)}</li>`).join("")}</ul>` : "";
  const metrics = panel.metrics.length ? `<div class="v5-metrics">${panel.metrics.map((metric) => `<span><strong>${esc(metric.value)}</strong>${esc(metric.label)}${metric.sourceRef ? `<em>${esc(metric.sourceRef)}</em>` : ""}</span>`).join("")}</div>` : "";
  return `<section class="v5-panel priority-${panel.priority}" data-panel-id="${esc(panel.id)}" data-visual-type="${esc(panel.visualType)}"><div class="v5-panel-head"><span>${esc(panel.role)}</span><h2>${esc(panel.heading)}</h2></div><p class="v5-takeaway">${esc(panel.takeaway)}</p>${metrics}${bullets}${evidence}<footer>${panel.sourceRefs.map((ref) => `<b>${esc(ref)}</b>`).join("")}</footer></section>`;
}

export function renderAcademicPosterV5Html(briefInput = {}, source = {}, options = {}) {
  const brief = normalizeAcademicPosterBriefV5(briefInput, source, options);
  const templateId = brief.globalVisual.templateId || "conference_paper_board";
  const dimensions = templateId === "landscape" || templateId === "teaser" ? [1920, 1080] : templateId === "graphical_abstract" ? [1200, 1200] : templateId === "portrait" ? [1080, 1440] : [1200, 1800];
  const [width, height] = dimensions;
  const visual = clean(options.visualDataUrl, 12000000);
  const hero = brief.panels.find((panel) => panel.id === brief.globalVisual.heroPanelId) || brief.panels[0];
  const allPanels = brief.panels.map((panel) => panelMarkup(panel, source)).join("");
  const background = visual ? `<img class="v5-visual-layer" src="${esc(visual)}" alt="" aria-hidden="true">` : "";
  const css = `:root{--paper:#f7f1e5;--ink:#15243a;--navy:#183b63;--accent:#b44952;--line:#b9c6cd;--soft:#ffffffde}*{box-sizing:border-box}html,body{margin:0;background:#111;font-family:Inter,Arial,"Microsoft YaHei",sans-serif}#deckStage{width:${width}px;height:${height}px;overflow:hidden}.academic-v5{position:relative;isolation:isolate;width:100%;height:100%;overflow:hidden;background:var(--paper);padding:42px 48px 34px;color:var(--ink);display:grid;grid-template-rows:auto auto 1fr auto;gap:16px}.v5-visual-layer{position:absolute;inset:0;z-index:-3;width:100%;height:100%;object-fit:cover;opacity:${visual ? ".18" : "0"};filter:saturate(.72) contrast(1.04)}.academic-v5:before{content:"";position:absolute;inset:0;z-index:-2;background:linear-gradient(135deg,#f7f1e5ed 0%,#f7f1e5d9 48%,#e9efe9d0 100%)}.v5-header{display:grid;grid-template-columns:130px 1fr 130px;align-items:start;gap:20px;border-top:12px solid var(--navy);padding-top:18px}.v5-source{font-size:10px;font-weight:800;letter-spacing:.1em;color:var(--navy);line-height:1.25;text-transform:uppercase}.v5-header h1{margin:0;text-align:center;font-family:Georgia,"Noto Serif SC",serif;font-size:clamp(34px,4.1vw,70px);line-height:1.02;letter-spacing:-.045em}.v5-meta{margin:8px 0 0;text-align:center;color:#536879;font-size:13px}.v5-tagline{margin:0;max-width:82%;padding:10px 14px;border-left:6px solid var(--accent);background:var(--soft);font-weight:800;font-size:16px;line-height:1.32}.v5-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px 18px;align-content:start;min-height:0}.v5-panel{min-width:0;overflow:hidden;border-top:2px solid var(--navy);padding:8px 2px 6px;background:linear-gradient(90deg,#ffffffad,#ffffff2e)}.v5-panel.priority-5{grid-column:span 2;background:#fffffff0;padding:13px 15px;border:1px solid var(--line);border-top:5px solid var(--accent)}.v5-panel-head{display:flex;align-items:baseline;gap:10px}.v5-panel-head span{font-size:10px;font-weight:900;letter-spacing:.12em;color:var(--accent);text-transform:uppercase}.v5-panel h2{margin:0;font-size:22px;line-height:1.08;color:var(--navy)}.v5-takeaway{margin:8px 0;font-size:14px;line-height:1.35;font-weight:750}.v5-panel ul{padding-left:18px;margin:7px 0;font-size:12px;line-height:1.34}.v5-panel li{margin:4px 0}.v5-evidence{display:grid;grid-template-columns:repeat(auto-fit,minmax(0,1fr));gap:8px;margin-top:9px}.v5-evidence figure{margin:0;padding:5px;background:#fff;border:1px solid var(--line)}.v5-evidence img{display:block;width:100%;height:clamp(120px,16vh,230px);object-fit:contain;background:#fff}.v5-evidence figcaption,.v5-table{font-size:9px;line-height:1.25;color:#596b77;margin-top:4px}.v5-table{min-height:110px;display:grid;place-items:center;border:1px dashed var(--line);background:#fff;padding:12px}.v5-metrics{display:flex;gap:8px;flex-wrap:wrap;margin:7px 0}.v5-metrics span{display:grid;gap:1px;min-width:88px;padding:6px 8px;background:#e8eef1;font-size:10px}.v5-metrics strong{font-size:18px;color:var(--accent)}.v5-metrics em{font-size:9px;color:#657789;font-style:normal}.v5-panel footer{margin-top:7px;display:flex;gap:6px;font-size:9px;color:var(--accent)}.v5-footer{display:flex;justify-content:space-between;gap:16px;border-top:1px solid var(--line);padding-top:8px;font-size:10px;color:#526979}.v5-footer strong{color:var(--navy)}${templateId === "landscape" || templateId === "teaser" ? `.academic-v5{padding:38px 50px 28px}.v5-grid{grid-template-columns:repeat(3,minmax(0,1fr))}.v5-panel.priority-5{grid-column:span 2}.v5-header h1{font-size:56px}` : ""}${templateId === "portrait" ? `.v5-grid{grid-template-columns:1fr}.v5-panel.priority-5{grid-column:auto}.v5-header{grid-template-columns:90px 1fr 90px}` : ""}${templateId === "graphical_abstract" ? `.academic-v5{padding:32px}.v5-header{grid-template-columns:1fr}.v5-source{display:none}.v5-header h1{text-align:left;font-size:48px}.v5-meta{text-align:left}.v5-grid{grid-template-columns:1fr}.v5-panel{display:none}.v5-panel.priority-5{display:block}.v5-tagline{max-width:100%}` : ""}`;
  return `<!doctype html><html lang="${brief.metadata.language === "en" ? "en" : "zh-CN"}"><head><meta charset="utf-8"><meta name="viewport" content="width=${width},initial-scale=1"><title>${esc(brief.metadata.title)} poster</title><style>${css}</style></head><body data-academic-poster="${esc(templateId)}" data-poster-spec="AcademicPosterBriefV5"><div id="deckStage"><main class="academic-v5 slide poster-slide active">${background}<header class="v5-header"><div class="v5-source">SOURCE<br>${esc(brief.metadata.sourceFile)}</div><div><h1>${esc(brief.metadata.title)}</h1><p class="v5-meta">${esc([brief.metadata.authors, brief.metadata.institution, brief.metadata.conference].filter(Boolean).join(" · "))}</p></div><div class="v5-source" style="text-align:right">PAPER<br>V5</div></header><p class="v5-tagline">${esc(brief.metadata.subtitle || hero?.takeaway || "")}</p><div class="v5-grid">${allPanels}</div><footer class="v5-footer"><strong>${esc(brief.footer.finalTakeaway || hero?.takeaway || "")}</strong><span>Source-linked research poster · ${esc(templateId)}</span></footer></main></div></body></html>`;
}

export function auditAcademicPosterV5(briefInput = {}, source = {}, html = "") {
  const brief = normalizeAcademicPosterBriefV5(briefInput, source);
  const assets = new Set(evidenceInventory(source).map((asset) => asset.id));
  const warnings = [];
  if (!brief.metadata.title || /^source overview$/i.test(brief.metadata.title)) warnings.push("invalid_or_missing_title");
  if (brief.panels.some((panel) => !panel.takeaway || !panel.sourceRefs.length)) warnings.push("panel_missing_copy_or_source_ref");
  if (brief.panels.some((panel) => panel.evidenceIds.some((id) => !assets.has(id)))) warnings.push("unsupported_evidence_id");
  if (brief.panels.some((panel) => ["source-figure", "source-table"].includes(panel.visualType) && !panel.evidenceIds.length)) warnings.push("source_visual_without_evidence");
  if (html && !/data-poster-spec="AcademicPosterBriefV5"/.test(html)) warnings.push("wrong_render_protocol");
  if (html && !/overflow:hidden/.test(html)) warnings.push("canvas_overflow_guard_missing");
  if (html && evidenceInventory(source).length && !/<img[^>]+src="data:image\//.test(html)) warnings.push("source_assets_not_rendered");
  return { version: "AcademicPosterQualityV5", ok: warnings.length === 0, warnings, panels: brief.panels.length, sourceAssets: assets.size, citedPanels: brief.panels.filter((panel) => panel.sourceRefs.length).length, heroPanelId: brief.globalVisual.heroPanelId };
}

export function academicPosterV5ReviewPrompt(briefInput = {}, source = {}) {
  const brief = normalizeAcademicPosterBriefV5(briefInput, source);
  return `Return JSON only: {"approved":true,"notes":["..."],"layoutFixes":[{"panelId":"...","instruction":"short layout-only instruction"}],"regenerateVisualPanelIds":["..."]}. You are a non-destructive academic poster commenter. Review only factual coverage, evidence mapping, section hierarchy, visual balance, empty-panel risk and readability. Do not change facts, numbers, names, citations or source assets. Reject if a source visual has no matching evidence ID.\n\n${JSON.stringify({ title: brief.metadata.title, sectionPlanning: brief.sectionPlanning, hero: brief.globalVisual.heroPanelId, panels: brief.panels.map((panel) => ({ id: panel.id, heading: panel.heading, refs: panel.sourceRefs, evidence: panel.evidenceIds, visualType: panel.visualType, priority: panel.priority })) })}`;
}
