/* Academic Poster V5 — source-locked Paper2Poster pipeline.
 * The image model contributes atmosphere and non-data visuals only. All paper
 * facts, figures, citations and editable copy remain deterministic HTML.
 */

const asText = (value, limit = 1800) => String(value ?? "").replace(/\s+/g, " ").trim().slice(0, limit);
const asList = (value) => Array.isArray(value) ? value : [];
const unique = (values) => [...new Set(values)];
const escapeHtml = (value) => String(value ?? "").replace(/[&<>\"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const ref = (page) => `p.${Math.max(1, Number(page) || 1)}`;

function pagesOf(source) { return asList(source?.pages).filter((page) => page?.text || page?.title); }
function assetsOf(source) { return asList(source?.figures).concat(asList(source?.tables)).filter((asset) => asset?.id); }
function meaningfulTitle(value) {
  const title = asText(value, 260);
  return title && !/^source\s+overview$/i.test(title) && !/^pdf\s+page\s+\d+$/i.test(title) && !/^section\s+\d+$/i.test(title) && !/^evidence\s+block\s+\d+$/i.test(title) && title.length > 3 ? title : "";
}
function paperTitle(source, options = {}) {
  const supplied = meaningfulTitle(options.title);
  if (supplied) return supplied;
  const sourceValue = meaningfulTitle(source?.title);
  if (sourceValue) return sourceValue;
  const pageTitle = pagesOf(source).map((page) => meaningfulTitle(page.title)).find(Boolean);
  if (pageTitle) return pageTitle;
  return asText(source?.sourceFile, 220).replace(/\.(pdf|docx|txt)$/i, "") || "Academic Poster";
}
function sentences(text, count = 4) {
  return asText(text, 9000).split(/(?<=[。！？.!?；;])\s+/).map((item) => asText(item, 420)).filter((item) => item.length > 12).slice(0, count);
}
function kindFor(page, index) {
  const text = `${page?.title || ""} ${page?.section || ""} ${page?.text || ""}`.toLowerCase();
  if (/abstract|摘要|introduction|background|motivation|引言|背景|动机/.test(text)) return "motivation";
  if (/related work|literature|相关工作|文献综述/.test(text)) return "context";
  if (/method|methodology|approach|framework|algorithm|方法|模型|系统|算法/.test(text)) return "method";
  if (/dataset|data|sample|数据集|数据|样本/.test(text)) return "data";
  if (/experiment|evaluation|benchmark|metric|实验|评估|指标/.test(text)) return "evaluation";
  if (/result|finding|analysis|结果|发现|分析/.test(text)) return "results";
  if (/discussion|limitation|future|讨论|局限|未来/.test(text)) return "discussion";
  if (/conclusion|结论|总结/.test(text)) return "conclusion";
  return index === 0 ? "motivation" : "evidence";
}
const sectionNames = { motivation: "Research question", context: "Prior context", method: "Method", data: "Data & setup", evaluation: "Evaluation", results: "Key results", discussion: "Discussion", conclusion: "Takeaway", evidence: "Evidence" };
function headingFor(page, kind, index) { const title = meaningfulTitle(page?.title); return title || `${sectionNames[kind] || "Evidence"} ${index + 1}`; }
function matchingAssets(source, page, kind, used) {
  const inventory = assetsOf(source);
  const anchored = inventory.filter((asset) => asset.anchorBlockId && page?.sourceBlockId && asset.anchorBlockId === page.sourceBlockId);
  const exact = inventory.filter((asset) => Number(asset.page) === Number(page?.page));
  const words = kind === "method" ? /method|framework|flow|方法|系统|算法/i : kind === "results" || kind === "evaluation" ? /result|evaluation|chart|table|结果|评估|图表/i : new RegExp(kind, "i");
  const contextual = inventory.filter((asset) => words.test(`${asset.caption || ""} ${asset.context || ""}`));
  return [...anchored, ...exact, ...contextual, ...inventory].filter((asset) => !used.has(asset.id)).slice(0, kind === "results" || kind === "evaluation" ? 2 : 1);
}

function panelFromPage(source, page, index, used) {
  const kind = kindFor(page, index);
  const copy = sentences(page.text || page.title, kind === "results" || kind === "evaluation" ? 5 : 4);
  const selected = matchingAssets(source, page, kind, used);
  selected.forEach((asset) => used.add(asset.id));
  const evidenceIds = selected.map((asset) => asset.id);
  return {
    id: `${kind}-${index + 1}`,
    role: kind,
    heading: headingFor(page, kind, index),
    takeaway: copy[0] || asText(page.text || page.title, 360),
    bullets: copy.slice(1, 5),
    metrics: [],
    sourceRefs: [ref(page.page)],
    evidenceIds,
    visualType: evidenceIds.length ? (selected.some((asset) => /table/i.test(asset.kind || asset.id)) ? "source-table" : "source-figure") : (kind === "method" || kind === "data" ? "generated-method-diagram" : "text-only"),
    visualDescription: evidenceIds.length ? `Retain the uploaded ${selected[0].caption || "source evidence"} without redrawing its data.` : `A restrained, non-data academic visual explaining ${headingFor(page, kind, index)}.` ,
    imagePrompt: evidenceIds.length ? "" : `Clean academic concept visual for ${headingFor(page, kind, index)}; structured composition, no text, no numbers, no charts, no logos.`,
    negativePrompt: "readable text, letters, fake chart, invented numbers, citations, logo, watermark, QR code, empty placeholder frame",
    layoutHint: kind === "results" || kind === "evaluation" ? "prominent evidence panel" : kind === "method" ? "process panel" : "supporting panel",
    priority: kind === "results" ? 5 : kind === "method" ? 4 : kind === "motivation" || kind === "conclusion" ? 3 : 2,
    wordBudget: kind === "results" ? 130 : 90,
    locked: false,
  };
}

export function fallbackAcademicPosterBriefV5(source = {}, options = {}) {
  const pages = pagesOf(source);
  const usedAssets = new Set();
  const panels = pages.map((page, index) => panelFromPage(source, page, index, usedAssets)).filter((panel) => panel.takeaway);
  const usable = panels.length ? panels : [{ id: "overview-1", role: "overview", heading: "Overview", takeaway: asText(source.text, 360) || "Uploaded paper overview", bullets: [], metrics: [], sourceRefs: ["p.1"], evidenceIds: [], visualType: "text-only", visualDescription: "Clean academic overview.", imagePrompt: "", negativePrompt: "text, fake data, logo, watermark", layoutHint: "lead", priority: 5, wordBudget: 120, locked: false }];
  const hero = usable.find((panel) => panel.role === "results" && panel.evidenceIds.length) || usable.find((panel) => panel.evidenceIds.length) || usable[0];
  const templateId = ["conference_paper_board", "landscape", "portrait", "teaser", "graphical_abstract"].includes(options.templateId) ? options.templateId : "conference_paper_board";
  const title = paperTitle(source, options);
  return {
    version: "AcademicPosterBriefV5",
    metadata: { title, subtitle: asText(hero.takeaway, 280), authors: asText(options.authors || source.authors, 360), institutions: asList(source.institutions).map((item) => asText(item, 200)).filter(Boolean), institution: asText(options.institution || source.institution, 360), venue: asText(options.venue || options.conference, 180), language: source.language === "en" ? "en" : "zh-CN", sourceFile: asText(source.sourceFile, 260) },
    coreNarrative: { problem: asText(usable[0].takeaway, 360), approach: asText(usable.find((panel) => panel.role === "method")?.takeaway, 360), mainFinding: asText(hero.takeaway, 360), contribution: asText(usable.find((panel) => panel.role === "conclusion")?.takeaway || hero.takeaway, 360), takeaway: asText(hero.takeaway, 360) },
    sectionPlanning: { candidateCount: pages.length, finalCount: usable.length, planningReason: "Panels are derived from the uploaded paper structure, evidence density, independent contributions and available poster area; there is no fixed panel-count limit.", mergedSections: [], splitSections: [], omittedSections: [] },
    globalVisual: { templateId, aspectRatio: templateId === "landscape" || templateId === "teaser" ? "16:9" : templateId === "graphical_abstract" ? "1:1" : templateId === "portrait" ? "3:4" : "4:3", dimensions: templateId === "portrait" ? "36x48in" : "48x36in", layoutMode: usable.length > 10 ? "dense-adaptive-grid" : "editorial-evidence-grid", palette: ["warm paper", "deep navy", "academic blue", "signal red"], typography: { title: "serif display", body: "sans-serif", caption: "monospace" }, visualTone: "bright, modern, credible, evidence-led academic editorial", heroPanelId: hero.id, generationPrompt: `Create a bright academic editorial visual background for the research topic “${title}”. Use a clear hierarchy, warm paper and deep navy with a restrained accent, one strong conceptual hero area and generous clean regions for deterministic HTML. Do not draw readable text, authors, citations, data charts, numerical results, logos, watermarks, QR codes or empty white placeholder boxes.`, negativePrompt: "readable text, letters, fake citations, fabricated charts, invented data, logos, watermarks, QR codes, dark low-contrast background, empty white frames, clutter" },
    panels: usable,
    footer: { finalTakeaway: asText(usable.find((panel) => panel.role === "conclusion")?.takeaway || hero.takeaway, 360), contact: asText(options.contact, 240), qrContent: asText(options.qrContent, 600), acknowledgements: asText(options.acknowledgements, 600) },
    provenance: { sourceLocked: true, renderer: "hybrid-image-plus-deterministic-html", generatedImages: true },
  };
}

function validRef(value) { return /^p\.\d+$/i.test(asText(value, 30)); }
function normalizeMetrics(value) { return asList(value).map((metric) => ({ value: asText(metric?.value, 80), label: asText(metric?.label, 120), sourceRef: validRef(metric?.sourceRef) ? asText(metric.sourceRef, 30) : "" })).filter((metric) => metric.value || metric.label).slice(0, 6); }

export function normalizeAcademicPosterBriefV5(candidate = {}, source = {}, options = {}) {
  const fallback = fallbackAcademicPosterBriefV5(source, options);
  const validAssets = new Set(assetsOf(source).map((asset) => asset.id));
  const rawPanels = asList(candidate.panels || candidate.sections);
  // A missing AI field may only fall back to the source-derived panel at the
  // same index. Never copy the last fallback panel into every section.
  const panels = rawPanels.slice(0, Math.max(fallback.panels.length, 1)).map((panel, index) => {
    const base = fallback.panels[index] || { id: `panel-${index + 1}`, role: "evidence", heading: `Evidence ${index + 1}`, takeaway: "", bullets: [], metrics: [], sourceRefs: [], evidenceIds: [], visualType: "text-only", visualDescription: "", imagePrompt: "", negativePrompt: "readable text, fabricated data, logo, watermark", layoutHint: "supporting panel", priority: 2, wordBudget: 90 };
    const evidenceIds = unique(asList(panel.evidenceIds).map((item) => asText(item, 80)).filter((id) => validAssets.has(id))).slice(0, 6);
    const sourceRefs = unique(asList(panel.sourceRefs).map((item) => asText(item, 30)).filter(validRef));
    const visualType = ["source-figure", "source-table", "generated-method-diagram", "generated-concept-visual", "text-only"].includes(panel.visualType) ? panel.visualType : (evidenceIds.length ? "source-figure" : base.visualType);
    return { id: asText(panel.id || base.id || `panel-${index + 1}`, 80).replace(/[^a-zA-Z0-9_-]/g, "-") || `panel-${index + 1}`, role: asText(panel.role || base.role, 80), heading: asText(panel.heading || base.heading, 160), takeaway: asText(panel.takeaway || panel.summary || base.takeaway, 520), bullets: asList(panel.bullets || panel.points).map((item) => asText(item, 300)).filter(Boolean).slice(0, 8), metrics: normalizeMetrics(panel.metrics), sourceRefs: sourceRefs.length ? sourceRefs : base.sourceRefs.slice(0, 4), evidenceIds: evidenceIds.length ? evidenceIds : base.evidenceIds.slice(0, 6), visualType, visualDescription: asText(panel.visualDescription || base.visualDescription, 760), imagePrompt: asText(panel.imagePrompt || base.imagePrompt, 1600), negativePrompt: asText(panel.negativePrompt || base.negativePrompt, 900), layoutHint: asText(panel.layoutHint || base.layoutHint, 140), priority: Math.max(1, Math.min(5, Number(panel.priority) || base.priority)), wordBudget: Math.max(35, Math.min(240, Number(panel.wordBudget) || base.wordBudget)), locked: Boolean(panel.locked) };
  }).filter((panel) => panel.takeaway);
  const finalPanels = panels.length ? panels : fallback.panels;
  const meta = candidate.metadata || {};
  const global = candidate.globalVisual || {};
  const hero = finalPanels.find((panel) => panel.id === global.heroPanelId) || finalPanels.slice().sort((a, b) => b.priority - a.priority)[0];
  const narrative = candidate.coreNarrative || {};
  const narrativeValue = (key) => asText(narrative[key] || fallback.coreNarrative[key], 520);
  const requestedPanelCount = Number(candidate.sectionPlanning?.finalCount);
  return { ...fallback, metadata: { ...fallback.metadata, ...meta, title: paperTitle(source, { ...options, title: meta.title }), subtitle: asText(meta.subtitle || fallback.metadata.subtitle, 300), authors: asText(options.authors || meta.authors || fallback.metadata.authors, 360), institution: asText(options.institution || meta.institution || fallback.metadata.institution, 360) }, coreNarrative: { problem: narrativeValue("problem"), approach: narrativeValue("approach"), mainFinding: narrativeValue("mainFinding"), contribution: narrativeValue("contribution"), takeaway: narrativeValue("takeaway") }, sectionPlanning: { ...fallback.sectionPlanning, ...(candidate.sectionPlanning || {}), requestedFinalCount: Number.isFinite(requestedPanelCount) ? requestedPanelCount : finalPanels.length, finalCount: finalPanels.length }, globalVisual: { ...fallback.globalVisual, ...global, heroPanelId: hero.id, generationPrompt: asText(global.generationPrompt || fallback.globalVisual.generationPrompt, 3000), negativePrompt: asText(global.negativePrompt || fallback.globalVisual.negativePrompt, 1200) }, panels: finalPanels, footer: { ...fallback.footer, ...(candidate.footer || {}) }, provenance: { sourceLocked: true, renderer: "hybrid-image-plus-deterministic-html", generatedImages: true } };
}

export function academicPosterV5EvidencePrompt(source = {}) {
  const pages = pagesOf(source).map((page) => ({ page: page.page, sourceBlockId: page.sourceBlockId || `source-block-${page.page}`, title: page.title, text: asText(page.text, 7000) }));
  const evidence = assetsOf(source).map((asset) => ({ id: asset.id, page: asset.page, anchorBlockId: asset.anchorBlockId || "", caption: asset.caption, context: asText(asset.context, 700), type: asset.kind || "figure" }));
  return `Return strict JSON only with this shape: {"sourceTitle":"...","blocks":[{"sourceBlockId":"...","role":"motivation|context|method|data|evaluation|results|discussion|conclusion|other","claim":"one source-grounded claim","supportingPoints":["..."],"sourceRefs":["p.1"]}],"evidenceLinks":[{"assetId":"...","sourceBlockId":"...","reason":"..."}]}. Extract facts from the supplied source only. Do not summarize every block with the same sentence, do not invent claims, and preserve the sourceBlockId and evidence IDs exactly.\n\nSource pages:\n${JSON.stringify(pages)}\n\nEvidence inventory:\n${JSON.stringify(evidence)}`;
}

export function academicPosterV5BriefPrompt(source = {}, options = {}, extractedEvidence = null) {
  const evidence = assetsOf(source).map((asset) => ({ id: asset.id, page: asset.page, anchorBlockId: asset.anchorBlockId || "", caption: asset.caption, context: asText(asset.context, 700), type: asset.kind || "figure" }));
  const pages = pagesOf(source).map((page) => ({ page: page.page, sourceBlockId: page.sourceBlockId || `source-block-${page.page}`, title: page.title, section: page.section, text: asText(page.text, 7000), sentences: asList(page.sentences).slice(0, 8) }));
  return `Return one strict JSON object matching AcademicPosterBriefV5. Act as Content Planner, Visual Mapper and Layout Planner for a source-locked academic poster. Determine panel count dynamically from the actual paper; NO fixed panel limit. Merge redundant sections and split independent methods, experiments or findings only when each has independent evidence and value. Do not mechanically copy the table of contents.\n\nEvery claim, number and conclusion must include sourceRefs such as p.7. evidenceIds must come only from the inventory. Keep original figures/tables as source evidence. generated-method-diagram and generated-concept-visual are allowed only for non-data visuals. The image model must not draw readable text, authors, citations, numbers, charts, logos or QR codes. Leave clean regions for deterministic HTML. Return keys metadata, coreNarrative, sectionPlanning, globalVisual, panels, footer. Every panel must have a distinct heading, takeaway, role, sourceRefs and visual purpose. Never output repeated Section 1 placeholders, repeated takeaways, or the same evidenceIds for every panel.\n\nSelected template: ${asText(options.templateId || "conference_paper_board", 80)}. User requirements: ${asText(options.requirements || "none", 1200)}\n\nEvidence extraction (treat as source hints, verify against pages):\n${JSON.stringify(extractedEvidence || {})}\n\nEvidence inventory:\n${JSON.stringify(evidence)}\n\nSource pages:\n${JSON.stringify(pages)}`;
}

export function academicPosterV5ReviewPrompt(brief, source) {
  return `Return strict JSON {"approved":true,"notes":[],"layoutFixes":[],"regenerateVisualPanelIds":[]}. Review this source-locked AcademicPosterBriefV5. Check title identity, source refs, evidence mapping, dynamic panel usefulness, text density, visual hierarchy, original-asset preservation and image-model restrictions. Reject repeated headings, repeated takeaways, repeated visual descriptions, flat role/priority assignments, placeholder Section 1 text, section-count mismatch, all-panels-same-source references and poor evidence coverage. Do not rewrite facts or invent data.\n${JSON.stringify({ brief, sourcePages: pagesOf(source).length, assets: assetsOf(source).map((asset) => ({ id: asset.id, page: asset.page, caption: asset.caption })) })}`;
}

function asset(source, id) { return assetsOf(source).find((item) => item.id === id); }
function panelHtml(panel, source) {
  const evidence = panel.evidenceIds.map((id) => asset(source, id)).filter(Boolean).map((item) => item.assetRef ? `<figure data-evidence-id="${escapeHtml(item.id)}"><img src="${escapeHtml(item.assetRef)}" alt="${escapeHtml(item.caption)}"><figcaption>${escapeHtml(item.caption)} · ${ref(item.page)}</figcaption></figure>` : `<div class="v5-table" data-evidence-id="${escapeHtml(item.id)}">${escapeHtml(item.caption)} · ${ref(item.page)}</div>`).join("");
  const bullets = panel.bullets.length ? `<ul>${panel.bullets.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>` : "";
  const metrics = panel.metrics.length ? `<div class="v5-metrics">${panel.metrics.map((item) => `<span><strong>${escapeHtml(item.value)}</strong>${escapeHtml(item.label)}${item.sourceRef ? `<em>${escapeHtml(item.sourceRef)}</em>` : ""}</span>`).join("")}</div>` : "";
  return `<section class="v5-panel priority-${panel.priority}" data-panel-id="${escapeHtml(panel.id)}" data-visual-type="${escapeHtml(panel.visualType)}"><div class="v5-panel-head"><span>${escapeHtml(panel.role)}</span><h2>${escapeHtml(panel.heading)}</h2></div><p class="v5-takeaway">${escapeHtml(panel.takeaway)}</p>${metrics}${bullets}${evidence ? `<div class="v5-evidence">${evidence}</div>` : ""}<footer>${panel.sourceRefs.map((item) => `<b>${escapeHtml(item)}</b>`).join("")}</footer></section>`;
}

export function renderAcademicPosterV5Html(input = {}, source = {}, options = {}) {
  const brief = normalizeAcademicPosterBriefV5(input, source, options);
  const template = brief.globalVisual.templateId || "conference_paper_board";
  const [width, height] = template === "landscape" || template === "teaser" ? [1920, 1080] : template === "graphical_abstract" ? [1400, 1400] : template === "portrait" ? [1200, 1600] : [1600, 1200];
  const visual = asText(options.visualDataUrl, 12000000);
  const panels = brief.panels.map((panel) => panelHtml(panel, source)).join("");
  const hero = brief.panels.find((panel) => panel.id === brief.globalVisual.heroPanelId) || brief.panels[0];
  const institution = brief.metadata.institution || asList(brief.metadata.institutions).join(" · ");
  const css = `:root{--paper:#f6f1e7;--ink:#14253a;--navy:#173f62;--accent:#b34b4b;--line:#aabcc8}*{box-sizing:border-box}html,body{margin:0;background:#111;font-family:Inter,Arial,"Microsoft YaHei",sans-serif}#deckStage{width:${width}px;height:${height}px;overflow:hidden}.academic-v5{position:relative;isolation:isolate;width:100%;height:100%;overflow:hidden;background:var(--paper);color:var(--ink);padding:44px 54px 38px;display:grid;grid-template-rows:auto auto 1fr auto;gap:18px}.v5-visual-layer{position:absolute;inset:0;z-index:-3;width:100%;height:100%;object-fit:cover;opacity:${visual ? ".2" : "0"};filter:saturate(.7) contrast(1.04)}.academic-v5:before{content:"";position:absolute;inset:0;z-index:-2;background:linear-gradient(135deg,#f6f1e7ee,#f6f1e7d8 55%,#eaf0efd9)}.v5-header{display:grid;grid-template-columns:180px 1fr 180px;align-items:start;gap:20px;border-top:12px solid var(--navy);padding-top:18px}.v5-source{font-size:12px;font-weight:800;letter-spacing:.09em;color:var(--navy);line-height:1.25;text-transform:uppercase}.v5-header h1{margin:0;text-align:center;font-family:Georgia,"Noto Serif SC",serif;font-size:clamp(42px,5vw,82px);line-height:1.02;letter-spacing:-.045em}.v5-meta{margin:10px 0 0;text-align:center;color:#536879;font-size:16px}.v5-tagline{margin:0;max-width:82%;padding:12px 16px;border-left:7px solid var(--accent);background:#ffffffdd;font-size:20px;line-height:1.35;font-weight:800}.v5-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:18px 22px;align-content:start;min-height:0}.v5-panel{min-width:0;overflow:hidden;border-top:3px solid var(--navy);padding:11px 4px 8px;background:#ffffff83}.v5-panel.priority-5{grid-column:span 2;background:#fffffff1;padding:16px 18px;border:1px solid var(--line);border-top:7px solid var(--accent)}.v5-panel-head{display:flex;align-items:baseline;gap:12px}.v5-panel-head span{font-size:12px;font-weight:900;letter-spacing:.12em;color:var(--accent);text-transform:uppercase}.v5-panel h2{margin:0;font-size:28px;line-height:1.08;color:var(--navy)}.v5-takeaway{margin:10px 0;font-size:18px;line-height:1.35;font-weight:750}.v5-panel ul{padding-left:22px;margin:8px 0;font-size:15px;line-height:1.38}.v5-panel li{margin:5px 0}.v5-evidence{display:grid;grid-template-columns:repeat(auto-fit,minmax(0,1fr));gap:10px;margin-top:11px}.v5-evidence figure{margin:0;min-width:0}.v5-evidence img{display:block;width:100%;max-height:260px;object-fit:contain;background:#fff;border:1px solid #c5d0d5}.v5-evidence figcaption,.v5-table{margin-top:4px;font-size:11px;color:#536879}.v5-metrics{display:flex;flex-wrap:wrap;gap:8px;margin:8px 0}.v5-metrics span{padding:8px 10px;background:#e8f0f2;color:var(--navy);font-size:12px}.v5-metrics strong{display:block;font-size:24px}.v5-metrics em{display:block;font-style:normal;font-size:10px;color:#a34d4d}.v5-panel footer{display:flex;gap:6px;flex-wrap:wrap;margin-top:9px;color:#a34d4d;font-size:11px}.v5-footer{display:flex;justify-content:space-between;gap:30px;border-top:2px solid var(--navy);padding-top:12px;font-size:13px}.v5-footer strong{font-size:16px}@media(max-width:900px){.v5-grid{grid-template-columns:1fr}.v5-panel.priority-5{grid-column:auto}}`;
  return `<!doctype html><html><head><meta charset="utf-8"><style>${css}</style></head><body><main id="deckStage"><article class="academic-v5" data-poster-spec="AcademicPosterBriefV5" data-source-locked="true" data-generated-visual="${visual ? "true" : "false"}">${visual ? `<img class="v5-visual-layer" src="${escapeHtml(visual)}" alt="" aria-hidden="true">` : ""}<header class="v5-header"><div class="v5-source">SOURCE-LOCKED<br>${escapeHtml(brief.metadata.sourceFile || "PAPER")}</div><div><h1>${escapeHtml(brief.metadata.title)}</h1><p class="v5-meta">${escapeHtml(brief.metadata.authors)}${institution ? ` · ${escapeHtml(institution)}` : ""}${brief.metadata.venue ? ` · ${escapeHtml(brief.metadata.venue)}` : ""}</p></div><div class="v5-source" style="text-align:right">${escapeHtml(brief.sectionPlanning.finalCount)} PANELS<br>V5</div></header><p class="v5-tagline">${escapeHtml(hero?.takeaway || brief.coreNarrative.takeaway)}</p><div class="v5-grid">${panels}</div><footer class="v5-footer"><strong>${escapeHtml(brief.footer.finalTakeaway)}</strong><span>${escapeHtml(brief.footer.contact || brief.footer.acknowledgements)}</span></footer></article></main></body></html>`;
}

export function auditAcademicPosterV5(input = {}, source = {}, html = "") {
  const brief = normalizeAcademicPosterBriefV5(input, source);
  const available = new Set(assetsOf(source).map((asset) => asset.id));
  const warnings = [];
  if (!brief.metadata.title || /^source\s+overview$/i.test(brief.metadata.title)) warnings.push("title_missing_or_placeholder");
  if (!brief.panels.length) warnings.push("no_panels");
  const ids = new Set();
  const comparable = (value) => asText(value, 1200).toLowerCase().replace(/[\s\p{P}\p{S}]+/gu, "");
  const counts = { heading: new Map(), takeaway: new Map(), role: new Map(), priority: new Map(), visual: new Map() };
  let citations = 0;
  brief.panels.forEach((panel) => {
    if (ids.has(panel.id)) warnings.push(`duplicate_panel:${panel.id}`);
    ids.add(panel.id);
    if (!panel.takeaway) warnings.push(`empty_panel:${panel.id}`);
    if (!panel.sourceRefs.length) warnings.push(`missing_source_ref:${panel.id}`);
    citations += panel.sourceRefs.length;
    panel.evidenceIds.forEach((id) => { if (!available.has(id)) warnings.push(`unknown_evidence:${id}`); });
    if ((panel.visualType === "source-figure" || panel.visualType === "source-table") && !panel.evidenceIds.length) warnings.push(`empty_source_visual:${panel.id}`);
    [["heading", panel.heading], ["takeaway", panel.takeaway], ["role", panel.role], ["priority", panel.priority], ["visual", panel.visualDescription]].forEach(([key, value]) => { const token = comparable(value); if (token) counts[key].set(token, (counts[key].get(token) || 0) + 1); });
  });
  if (brief.panels.length > 1) {
    const duplicateThreshold = Math.max(2, Math.ceil(brief.panels.length * 0.8));
    if ([...counts.heading.values()].some((count) => count >= duplicateThreshold)) warnings.push("repeated_panel_headings");
    if ([...counts.takeaway.values()].some((count) => count >= duplicateThreshold)) warnings.push("repeated_panel_takeaways");
    if ([...counts.visual.values()].some((count) => count >= duplicateThreshold)) warnings.push("repeated_visual_descriptions");
    if ([...counts.role.values()].some((count) => count >= duplicateThreshold) && [...counts.priority.values()].some((count) => count >= duplicateThreshold)) warnings.push("flat_panel_hierarchy");
    if (pagesOf(source).length > 1 && new Set(brief.panels.flatMap((panel) => panel.sourceRefs)).size === 1) warnings.push("all_panels_same_source_ref");
    if (assetsOf(source).length >= 2 && unique(brief.panels.flatMap((panel) => panel.evidenceIds)).length < Math.min(3, assetsOf(source).length)) warnings.push("evidence_coverage_too_low");
    const narrativeValues = Object.values(brief.coreNarrative || {}).map(comparable).filter(Boolean);
    if (narrativeValues.length >= 4 && new Set(narrativeValues).size === 1) warnings.push("repeated_core_narrative");
  }
  if (brief.panels.some((panel) => /^section\s+\d+$/i.test(panel.heading))) warnings.push("placeholder_section_heading");
  if (Number.isFinite(Number(brief.sectionPlanning.requestedFinalCount)) && Number(brief.sectionPlanning.requestedFinalCount) !== brief.panels.length) warnings.push("section_count_mismatch");
  if (html) { if (/<figure[^>]*>\s*<\/figure>/i.test(html)) warnings.push("empty_figure"); if (/placeholder|fake chart|invented data/i.test(html)) warnings.push("unsafe_visual_copy"); if (!html.includes("data-source-locked=\"true\"")) warnings.push("source_lock_missing"); }
  return { version: "AcademicPosterQualityV5", ok: warnings.length === 0, warnings: unique(warnings), panelCount: brief.panels.length, sourcePages: pagesOf(source).length, sourceAssets: assetsOf(source).length, citations, usedEvidence: unique(brief.panels.flatMap((panel) => panel.evidenceIds)).length };
}
