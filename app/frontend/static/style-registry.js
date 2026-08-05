(function () {
  const STORAGE_KEY = "ppt-html-studio-custom-styles-v1";
  // Shared with worker/ai-engine/html-anything-engine.js. This identifier is
  // carried in the Word DesignSpec so every render window mounts one Skill.
  const htmlAnythingSkillIds = Object.freeze({
    source: "deck-simple", banana: "deck-replit", teaching: "deck-course-module", academic: "deck-magazine-web",
    "conference-paper-light": "deck-magazine-web", "conference-blue": "deck-swiss-international", "result-first": "deck-open-slide-canvas",
    swiss: "deck-swiss-international", softlesson: "deck-xhs-pastel", clean: "deck-open-slide-canvas", instructional: "deck-presenter-mode",
    minimal: "deck-dir-key-nav", contrast: "deck-safety-alert", healing: "deck-xhs-white", doodle: "deck-xhs-post",
    editorial: "deck-guizang-editorial", vivid: "deck-product-launch", "news-broadcast": "deck-ljg-present", "tech-blueprint": "deck-blueprint", "corporate-clean": "deck-pitch",
  });
  function skillIdFor(id) { return htmlAnythingSkillIds[String(id || "").toLowerCase()] || "deck-open-slide-canvas"; }

  const definitions = {
    source: { name: "Original PPT", colors: ["#ffffff", "#111111", "#808080"], font: "Source fonts", layout: "source-preserving", preserveSource: true, profile: { styleName: "Original PPT", colorPalette: "preserve every source theme color", typography: "preserve every source font, size and emphasis", layoutPattern: "preserve source geometry and z-order", visualMotifs: "preserve source shapes, lines and decorations", imagePolicy: "preserve original images and crops", cardStyle: "preserve source surfaces", backgroundStyle: "preserve source backgrounds", iconStyle: "preserve source icons", spacingRules: "preserve source spacing exactly" }, layouts: ["source-preserving"] },
    banana: { name: "Banana Paper", colors: ["#fffaf0", "#172554", "#facc15"], font: "Inter", layout: "warm-paper", profile: { styleName: "Banana Paper", colorPalette: "warm paper #fffaf0, ink navy #172554, banana yellow #facc15, orange signal #f97316", typography: "friendly bold sans-serif titles with highly readable sans-serif body", layoutPattern: "centered cover, assertion-led titles, airy two-column evidence pages", visualMotifs: "yellow highlight bars, orange section labels, cyan visual modules and thin rules", imagePolicy: "use uploaded images as intentional visual anchors and keep them proportional", cardStyle: "few warm paper panels with crisp borders and modest radius", backgroundStyle: "warm off-white paper with restrained color blocks", iconStyle: "small functional line icons and geometric markers", spacingRules: "wide safe margins, short line lengths, one clear takeaway per page" }, layouts: ["banana-cover", "takeaway", "two-column", "comparison", "process", "summary"] },
    teaching: { name: "Teaching Blue", colors: ["#f8fbff", "#102a43", "#155eef"], font: "Inter", layout: "lesson-grid", profile: { styleName: "Teaching Blue", colorPalette: "white #ffffff and pale blue #f8fbff canvas, navy #102a43 text, blue #155eef structural accents", typography: "bold sans-serif title, readable sans-serif body, large lesson labels", layoutPattern: "centered cover, title band content slides, one or two balanced columns", visualMotifs: "blue rule bars, lesson markers, flat learning panels and step numbers", imagePolicy: "reserve modest media zones that support the lesson, never oversized images", cardStyle: "flat light-blue teaching panels with strong navy text", backgroundStyle: "clean white or very pale blue with high contrast", iconStyle: "minimal educational icons", spacingRules: "wide safe margins, readable line length, no crowded corners" }, layouts: ["lesson-cover", "lesson-objective", "step-grid", "example-callout", "practice", "recap"] },
    academic: { name: "Academic Style", colors: ["#fdfcf8", "#172033", "#8a6f42"], font: "Georgia", layout: "academic-paper", profile: { styleName: "Academic Style", colorPalette: "ivory #fdfcf8, dark navy #172033, muted gold #8a6f42", typography: "serif display titles with formal readable sans-serif body", layoutPattern: "formal title, evidence columns, quotations, figures with captions and footers", visualMotifs: "thin rules, citation markers, section folios and figure captions", imagePolicy: "figures kept proportional with captions when useful", cardStyle: "flat bordered evidence panels used sparingly", backgroundStyle: "quiet ivory paper with strong dark text", iconStyle: "minimal or none", spacingRules: "structured margins and clear reading columns" }, layouts: ["academic-cover", "thesis", "evidence-grid", "figure-caption", "quote", "conclusion"] },
    "conference-paper-light": { name: "Conference Paper Light", colors: ["#f7f2e8", "#172433", "#bd7042"], font: "Georgia", layout: "conference-paper", profile: { styleName: "Conference Paper Light", colorPalette: "warm paper #f7f2e8, ink navy #172433, academic blue #234c68, restrained terracotta #bd7042", typography: "serif research title with compact sans-serif body and caption scale", layoutPattern: "paper cover, research question, method, evidence figure, results interpretation, limitations and conclusion", visualMotifs: "source page markers, figure captions, hairline rules and folios", imagePolicy: "prefer original charts, tables and method diagrams with page citations", cardStyle: "no generic card grids; use paper evidence surfaces only when a figure needs framing", backgroundStyle: "warm conference-paper field with restrained structural bands", iconStyle: "none unless a method diagram needs a small functional mark", spacingRules: "dense scholarly hierarchy, one claim per slide and readable source captions" }, layouts: ["academic-cover", "research-question", "method", "evidence", "results", "discussion", "conclusion"] },
    "academic-defense-blue": { name: "Academic Defense Blue", colors: ["#ffffff", "#17233d", "#3969b5"], font: "Microsoft YaHei", layout: "academic-defense-blue", profile: { styleName: "Academic Defense Blue", colorPalette: "white #ffffff, defense navy #24467f, academic blue #3969b5 and slate #65748c", typography: "compact Chinese defense headings with readable body and source captions", layoutPattern: "cover, agenda, section navigation, research question, method pipeline, evidence result and conclusion", visualMotifs: "blue chapter bands, top navigation tabs, source folios and restrained rules", imagePolicy: "only validated source figures/tables; evidence is optional by page role", cardStyle: "flat evidence frames only around real source visuals", backgroundStyle: "white academic canvas with blue structural bands", iconStyle: "none unless a source method diagram contains one", spacingRules: "defense-style density with a clear single claim per page" }, layouts: ["defense-cover", "agenda", "section-divider", "research-question", "method-pipeline", "result-evidence", "conclusion"] },
    "conference-blue": { name: "Conference Blue", colors: ["#f4f8fb", "#12263a", "#0b4f7b"], font: "Inter", layout: "conference-blue", profile: { styleName: "Conference Blue", colorPalette: "pale blue paper #f4f8fb, deep navy #12263a, conference blue #0b4f7b, restrained amber signal", typography: "formal sans-serif hierarchy with mono-sized data and references", layoutPattern: "title band, rigorous grid, method/evidence split and compact results comparison", visualMotifs: "precise rules, page citations, data labels and formal section markers", imagePolicy: "use source figures as the main visual evidence; never decorate with unrelated stock imagery", cardStyle: "square evidence panels only for genuine parallel results", backgroundStyle: "formal pale blue conference canvas", iconStyle: "small geometric method markers only", spacingRules: "strict grid and small but readable references" }, layouts: ["conference-cover", "context-grid", "method-flow", "evidence-split", "result-comparison", "limitations", "conclusion"] },
    "result-first": { name: "Result First", colors: ["#fbfbf7", "#111827", "#503c9e"], font: "Inter", layout: "result-first", profile: { styleName: "Result First", colorPalette: "near-white #fbfbf7, graphite #111827, indigo #503c9e, warm orange result signal", typography: "large evidence-led claim with concise support text", layoutPattern: "one key finding, large source chart, interpretation, method proof and conclusion", visualMotifs: "result labels, quantitative emphasis and tight evidence captions", imagePolicy: "one original paper figure or table should dominate each results page", cardStyle: "avoid card stacks; use a single focused evidence frame", backgroundStyle: "quiet white field that keeps data dominant", iconStyle: "none", spacingRules: "large data visual, compact explanation and visible source page" }, layouts: ["result-cover", "key-finding", "figure-focus", "method-proof", "comparison", "implication", "closing"] },
    swiss: { name: "Swiss Grid", colors: ["#ffffff", "#101828", "#155eef"], font: "Helvetica", layout: "strict-grid", profile: { styleName: "Swiss Grid", colorPalette: "white #ffffff, near-black #101828, international blue #155eef with sparse signal red", typography: "strict geometric sans-serif with large scale contrast", layoutPattern: "asymmetric 12-column grid, precise modules, visible alignment", visualMotifs: "grid lines, numbered markers, rectangular rules and hard edges", imagePolicy: "images aligned to strict grid columns", cardStyle: "rectangular modules only, no rounded cards", backgroundStyle: "flat white with visible grid discipline", iconStyle: "geometric minimal symbols", spacingRules: "mathematical spacing and alignment" }, layouts: ["grid-cover", "asymmetric-grid", "number-grid", "split-grid", "sequence", "grid-summary"] },
    softlesson: { name: "Soft Lesson", colors: ["#fbfdff", "#243b53", "#60a5fa"], font: "Inter", layout: "soft-lesson", profile: { styleName: "Soft Lesson", colorPalette: "warm white #fbfdff, slate #243b53, mist blue #dbeafe and clear blue #60a5fa", typography: "rounded sans-serif with calm hierarchy", layoutPattern: "relaxed centered cover and airy content blocks", visualMotifs: "soft dividers, calm labels and low-noise blocks", imagePolicy: "small-to-medium images with soft crops", cardStyle: "light panels with restrained radius", backgroundStyle: "warm white or pale blue, no washed-out text", iconStyle: "simple line icons", spacingRules: "extra breathing room between elements" }, layouts: ["soft-cover", "calm-list", "soft-two-column", "reflection", "practice", "soft-summary"] },
    clean: { name: "Clean", colors: ["#ffffff", "#111827", "#2563eb"], font: "Arial", layout: "minimal-line", profile: { styleName: "Clean", colorPalette: "white #ffffff, black navy #111827, one crisp blue #2563eb accent", typography: "modern sans-serif with strong hierarchy", layoutPattern: "minimal title, precise aligned content, no decoration", visualMotifs: "single rule, dot or marker per slide", imagePolicy: "precise image crop aligned to grid", cardStyle: "avoid cards unless necessary", backgroundStyle: "flat white with high contrast", iconStyle: "none or tiny monochrome icons", spacingRules: "tight alignment with generous whitespace" }, layouts: ["clean-cover", "single-message", "clean-columns", "clean-data", "clean-image", "clean-close"] },
    instructional: { name: "Instructional", colors: ["#fffdf7", "#17324d", "#0f766e"], font: "Verdana", layout: "step-system", profile: { styleName: "Instructional", colorPalette: "white #fffdf7, navy #17324d, instructional teal #0f766e and blue #0ea5e9", typography: "clear sans-serif with action-oriented labels", layoutPattern: "goal, steps, example, practice prompt and summary", visualMotifs: "step markers only for real procedures, check points and action bands", imagePolicy: "images explain a step or example", cardStyle: "process blocks for procedures", backgroundStyle: "clean teaching surface", iconStyle: "small cue icons for action", spacingRules: "leave room on exercise slides" }, layouts: ["instruction-cover", "goal", "step-flow", "example", "exercise", "instruction-summary"] },
    minimal: { name: "Minimal", colors: ["#ffffff", "#111827", "#64748b"], font: "Inter", layout: "one-message", profile: { styleName: "Minimal", colorPalette: "plain white #ffffff, deep navy #111827, one quiet slate accent #64748b", typography: "large concise sans-serif title and sparse body", layoutPattern: "one headline and one content group", visualMotifs: "almost none; one quiet rule at most", imagePolicy: "one strong image or none", cardStyle: "no card grids", backgroundStyle: "plain white", iconStyle: "none", spacingRules: "large whitespace and few elements" }, layouts: ["minimal-cover", "statement", "minimal-list", "minimal-image", "minimal-quote", "minimal-close"] },
    contrast: { name: "High Contrast", colors: ["#0f172a", "#ffffff", "#38bdf8"], font: "Arial Black", layout: "contrast-blocks", profile: { styleName: "High Contrast", colorPalette: "dark navy #0f172a, white #ffffff and bright cyan #38bdf8", typography: "bold sans-serif title and large body", layoutPattern: "strong blocks, high hierarchy and accessible contrast", visualMotifs: "bold section bands and clear separation", imagePolicy: "images framed with strong contrast boundaries", cardStyle: "dark and light contrast panels", backgroundStyle: "high contrast surfaces only", iconStyle: "simple high-contrast glyphs", spacingRules: "avoid dense text in dark areas" }, layouts: ["contrast-cover", "contrast-statement", "contrast-split", "contrast-data", "contrast-quote", "contrast-close"] },
    healing: { name: "Healing Hand-drawn", colors: ["#fff6df", "#3f3128", "#9ed0eb"], font: "Segoe Print", layout: "paper-notes", profile: { styleName: "Healing Hand-drawn", colorPalette: "warm paper #fff6df, soft brown #3f3128, pastel blue #9ed0eb and sage #a7c7a0", typography: "gentle handwritten title with rounded readable body", layoutPattern: "calm centered cover and organic but aligned content", visualMotifs: "soft sketch dividers and calming paper marks", imagePolicy: "small gentle image areas with paper-like framing", cardStyle: "soft uneven paper notes", backgroundStyle: "warm paper texture impression without busy patterns", iconStyle: "small hand-drawn calming icons", spacingRules: "quiet open space; never energetic doodle clutter" }, layouts: ["healing-cover", "note-stack", "calm-grid", "healing-quote", "healing-image", "healing-close"] },
    doodle: { name: "Doodle Sketch", colors: ["#fff4d8", "#3c2c2c", "#2563eb"], font: "Comic Sans MS", layout: "sketch-grid", profile: { styleName: "Doodle Sketch", colorPalette: "cream paper #fff4d8, black marker #3c2c2c, vivid blue #2563eb and small color pops", typography: "marker-style bold headings with clean body for readability", layoutPattern: "playful sketch accents around a stable grid", visualMotifs: "arrows, stars, squiggles and hand-drawn borders used sparingly", imagePolicy: "images can be taped or pinned with doodle annotations", cardStyle: "sketchy rectangular notes, more energetic than healing", backgroundStyle: "clean paper with light doodle energy", iconStyle: "marker doodle icons", spacingRules: "playful but readable; no dense decoration" }, layouts: ["doodle-cover", "sketch-list", "doodle-map", "doodle-callout", "doodle-image", "doodle-close"] },
    editorial: { name: "Editorial", colors: ["#fbfaf7", "#111827", "#b08a57"], font: "Georgia", layout: "magazine", profile: { styleName: "Editorial", colorPalette: "warm white #fbfaf7, ink navy #111827, muted brass #b08a57", typography: "magazine serif display title and elegant sans body", layoutPattern: "large headline, columns, pull quote and feature image rhythm", visualMotifs: "kickers, pull quotes, editorial rules and folios", imagePolicy: "intentional crops with generous white space", cardStyle: "avoid card grids; use editorial blocks", backgroundStyle: "print-like warm white", iconStyle: "minimal editorial marks", spacingRules: "wide margins and magazine pacing" }, layouts: ["editorial-cover", "feature", "pull-quote", "image-essay", "column-story", "editorial-close"] },
    vivid: { name: "Vivid", colors: ["#fff7ed", "#17213f", "#f97316"], font: "Inter", layout: "color-blocks", profile: { styleName: "Vivid", colorPalette: "clean warm base #fff7ed, dark readable text #17213f, orange #f97316, blue #2563eb and cyan #06b6d4", typography: "bold modern display and clean body", layoutPattern: "large color blocks, energetic visual focus and product-like sections", visualMotifs: "bright blocks, strong labels and crisp highlights", imagePolicy: "images in confident blocks without overlap", cardStyle: "bold but few cards", backgroundStyle: "clean base with vivid accents, no heavy gradients", iconStyle: "simple bright icons", spacingRules: "energetic but uncluttered" }, layouts: ["vivid-cover", "color-statement", "vivid-grid", "vivid-image", "vivid-process", "vivid-close"] },
    "news-broadcast": { name: "News Broadcast", colors: ["#f7f7f4", "#101828", "#c1121f"], font: "Arial Black", layout: "broadcast", profile: { styleName: "News Broadcast", colorPalette: "white newsroom #f7f7f4, black text #101828, broadcast red #c1121f and burgundy #26070a", typography: "compressed bold sans-serif headlines and clean news body", layoutPattern: "live title card, anchor split, lower-third ticker, data bulletin and recap", visualMotifs: "LIVE badge, channel label, red vertical bar, lower-third strip and rules", imagePolicy: "one strong news image or map in a framed broadcast window", cardStyle: "flat white panels and red headline strips", backgroundStyle: "clean white or light gray with bold red accents", iconStyle: "minimal news glyphs and signal markers", spacingRules: "headline top band, ticker never overlaps body" }, layouts: ["broadcast-cover", "anchor-split", "lead-image", "bulletin-stack", "data-bulletin", "recap"] },
    "tech-blueprint": { name: "Tech Blueprint", colors: ["#071426", "#e6f7ff", "#35d2ff"], font: "JetBrains Mono", layout: "blueprint", profile: { styleName: "Tech Blueprint", colorPalette: "deep blueprint navy #071426, cyan grid #35d2ff, white text #e6f7ff and electric blue", typography: "technical sans-serif title with mono labels for specs and numbers", layoutPattern: "system overview, architecture map, process flow, metric dashboard and roadmap", visualMotifs: "blueprint grid, callout leaders, nodes, diagrams and spec chips", imagePolicy: "prefer diagrams, UI screenshots or schematic technical visuals", cardStyle: "thin-line panels with square corners and blueprint labels", backgroundStyle: "dark blueprint surface with low-opacity grid", iconStyle: "line engineering icons and node symbols", spacingRules: "use grid placement and keep diagrams readable at 16:9" }, layouts: ["blueprint-cover", "architecture-map", "process-flow", "metric-dashboard", "spec-comparison", "roadmap"] },
    "corporate-clean": { name: "Corporate Clean", colors: ["#f8fafc", "#1f2937", "#2f6fed"], font: "Inter", layout: "business", profile: { styleName: "Corporate Clean", colorPalette: "white #ffffff, graphite #1f2937, muted blue #2f6fed with restrained green or amber", typography: "modern corporate sans-serif with strong but quiet hierarchy", layoutPattern: "executive title, agenda, key message, KPI row, comparison, timeline and recommendation", visualMotifs: "thin dividers, KPI chips, concise tables and quiet charts", imagePolicy: "use product, team or industry images only when they clarify the point", cardStyle: "flat low-shadow business panels with square or small radius", backgroundStyle: "white or light neutral canvas", iconStyle: "simple monochrome business icons", spacingRules: "dense but calm, aligned rows and columns" }, layouts: ["executive-cover", "key-message", "kpi-row", "comparison-table", "timeline", "recommendation"] },
  };

  function sanitizeHex(value, fallback) {
    return /^#[0-9a-f]{6}$/i.test(String(value || "").trim()) ? String(value).trim() : fallback;
  }

  function sanitizeFont(value) {
    return String(value || "Inter, Arial, sans-serif").replace(/[<>{};]/g, "").slice(0, 120);
  }

  function normalizeCustomStyle(style = {}) {
    const id = String(style.id || `custom-${Date.now().toString(36)}`).replace(/[^a-z0-9_-]/gi, "").slice(0, 48);
    const colors = style.colors || {};
    const typography = style.typography || {};
    return {
      id: id.startsWith("custom-") ? id : `custom-${id}`,
      name: String(style.name || "Custom Style").trim().slice(0, 60),
      source: style.source || "manual",
      colors: {
        background: sanitizeHex(colors.background, "#f8fbff"),
        text: sanitizeHex(colors.text, "#10203f"),
        primary: sanitizeHex(colors.primary, "#2563eb"),
        accent: sanitizeHex(colors.accent, "#38bdf8"),
        panel: sanitizeHex(colors.panel, "#ffffff"),
      },
      typography: { titleFont: sanitizeFont(typography.titleFont), bodyFont: sanitizeFont(typography.bodyFont) },
      layout: ["balanced", "centered", "two-column", "image-focus", "minimal"].includes(style.layout) ? style.layout : "balanced",
      promptAddon: String(style.promptAddon || "").trim().slice(0, 1600),
      localRules: String(style.localRules || "").trim().slice(0, 1200),
      visualMotifs: String(style.visualMotifs || "").trim().slice(0, 600),
      createdAt: style.createdAt || new Date().toISOString(),
      updatedAt: style.updatedAt || new Date().toISOString(),
    };
  }

  function loadCustomStyles() {
    try {
      const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
      return (Array.isArray(raw) ? raw : []).map(normalizeCustomStyle).slice(0, 24);
    } catch {
      return [];
    }
  }

  function builtinOptions() {
    return Object.entries(definitions).map(([id, definition]) => [id, definition.name]);
  }

  function allOptions(customStyles = loadCustomStyles()) {
    return [...builtinOptions(), ...customStyles.map((style) => [style.id, style.name])];
  }

  function get(id, customStyles = loadCustomStyles()) {
    if (definitions[id]) return { id, ...definitions[id], builtin: true };
    const custom = customStyles.find((style) => style.id === id);
    return custom ? { ...normalizeCustomStyle(custom), builtin: false } : null;
  }

  function profileFor(id, customStyles = loadCustomStyles()) {
    const style = get(id, customStyles);
    if (style?.profile) return { ...style.profile };
    if (!style) return { ...definitions.teaching.profile };
    return {
      styleName: style.name,
      colorPalette: `background ${style.colors.background}, text ${style.colors.text}, primary ${style.colors.primary}, accent ${style.colors.accent}`,
      typography: `title ${style.typography.titleFont}, body ${style.typography.bodyFont}`,
      layoutPattern: style.localRules || `${style.layout} composition with clear visual hierarchy`,
      visualMotifs: style.visualMotifs || "custom visual motifs from the imported style",
      imagePolicy: "preserve image placement rhythm and reserve clear image zones",
      cardStyle: "match the imported card style",
      backgroundStyle: `use ${style.colors.background} as the background and ${style.colors.panel} for surfaces`,
      iconStyle: "match the imported icon style",
      spacingRules: "preserve the imported spacing rhythm with safe margins",
    };
  }

  function layoutRules(id) {
    return [...(get(id)?.layouts || definitions.teaching.layouts)];
  }

  function previewMeta(id, customStyles = loadCustomStyles()) {
    const style = get(id, customStyles);
    if (!style) return { swatches: definitions.teaching.colors, font: "Inter", sample: "Lesson", layout: "lesson-grid" };
    const swatches = Array.isArray(style.colors)
      ? style.colors
      : [style.colors?.background, style.colors?.primary, style.colors?.accent].filter(Boolean);
    return { swatches, font: style.font || style.typography?.titleFont?.split(",")[0] || "Inter", sample: style.name, layout: style.layout };
  }

  function stylePackFor(id, customStyles = loadCustomStyles()) {
    const style = get(id, customStyles) || get("teaching");
    const rawColors = style?.colors || [];
    const background = rawColors.background || rawColors[0] || "#f8fbff";
    const text = rawColors.text || rawColors[1] || "#102a43";
    const primary = rawColors.primary || rawColors[2] || "#155eef";
    const panel = rawColors.panel || (style?.builtin ? "rgba(255,255,255,.78)" : "#ffffff");
    const profile = style?.profile || {};
    return {
      id: String(id || "teaching"),
      version: "1.0",
      skillId: skillIdFor(id),
      name: style?.name || "Teaching Blue",
      builtin: Boolean(style?.builtin),
      preserveSource: Boolean(style?.preserveSource || id === "source"),
      colors: { background, text, primary, panel },
      typography: {
        titleFont: style?.typography?.titleFont || style?.font || "Inter, Arial, sans-serif",
        bodyFont: style?.typography?.bodyFont || style?.font || "Inter, Arial, sans-serif",
        titleMinPx: 44,
        bodyMinPx: 20,
      },
      layout: style?.layout || "lesson-grid",
      previewLayout: style?.layout || "lesson-grid",
      layouts: [...(style?.layouts || [])],
      motifs: profile.visualMotifs || "clear rules, intentional spacing, and one visual priority per page",
      profile,
    };
  }

  const chineseNames = {
    banana: "香蕉纸", teaching: "教学蓝", academic: "学术风", swiss: "瑞士网格", softlesson: "柔和课堂", clean: "清爽",
    instructional: "教学说明", minimal: "极简", contrast: "高对比", healing: "治愈手绘", doodle: "手绘涂鸦",
    editorial: "杂志编辑", vivid: "鲜明活力", "news-broadcast": "新闻播报", "tech-blueprint": "技术蓝图", "corporate-clean": "企业清爽",
  };

  function styleCardMarkup(id, { selected = false, customStyles = loadCustomStyles() } = {}) {
    const style = get(id, customStyles);
    if (!style) return "";
    const meta = previewMeta(id, customStyles);
    const colors = (meta.swatches || []).slice(0, 3).map((color) => `<i style="--style-swatch:${escapeHtml(color)}"></i>`).join("");
    const chinese = chineseNames[id] || style.name;
    return `<article class="style-library-card ${selected ? "is-selected" : ""}" data-style-card="${escapeHtml(id)}">
      <div class="style-library-art" style="--style-bg:${escapeHtml(meta.swatches?.[0] || "#f8fbff")};--style-ink:${escapeHtml(meta.swatches?.[1] || "#17213f")};--style-accent:${escapeHtml(meta.swatches?.[2] || "#2563eb")}"><b></b><span></span><i></i></div>
      <strong>${escapeHtml(chinese)}</strong><small>${escapeHtml(style.name)}</small>
      <div class="style-library-footer"><span class="style-library-swatches">${colors}</span><button type="button" data-preview-style="${escapeHtml(id)}">预览</button></div>
    </article>`;
  }

  function escapeHtml(value) {
    return String(value || "").replace(/[&<>\"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char]));
  }

  function previewHtml(id, customStyles = loadCustomStyles()) {
    const style = get(id, customStyles) || get("teaching");
    const pack = stylePackFor(id, customStyles);
    const colors = pack.colors;
    const bg = colors.background;
    const text = colors.text;
    const accent = colors.primary;
    const panel = colors.panel;
    const name = escapeHtml(style.name);
    const font = pack.typography.titleFont;
    const bodyFont = pack.typography.bodyFont;
    const layout = pack.layout || "balanced";
    const special = ["strict-grid", "blueprint"].includes(layout) ? `body{background:${bg}} .slide{border-radius:0}.slide:before{content:"";position:absolute;inset:0;background-image:linear-gradient(rgba(127,180,255,.12) 1px,transparent 1px),linear-gradient(90deg,rgba(127,180,255,.12) 1px,transparent 1px);background-size:32px 32px;pointer-events:none}` : ["magazine", "academic-paper"].includes(layout) ? `.headline{font-family:${font};font-weight:600}` : ["sketch-grid", "paper-notes"].includes(layout) ? `.slide{border:2px solid ${text};transform:rotate(-.25deg)}` : `.headline{font-family:${font};font-weight:800}`;
    return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>*{box-sizing:border-box}html,body{margin:0;background:#e8edf5;font-family:${bodyFont};color:${text}}body{display:grid;place-items:center;min-height:100vh;padding:18px}.slide{position:relative;overflow:hidden;width:min(92vw,960px);aspect-ratio:16/9;padding:7%;background:${bg};color:${text};border-radius:${["strict-grid", "blueprint"].includes(layout) ? "0" : "14px"};box-shadow:0 18px 40px rgba(16,24,40,.14);display:flex;flex-direction:column;justify-content:space-between}.eyebrow{font:700 20px/1.2 ${bodyFont};letter-spacing:.12em;text-transform:uppercase;color:${accent}}.headline{margin:0;max-width:80%;font-size:clamp(36px,5vw,64px);line-height:1.02;letter-spacing:-.02em}.copy{max-width:64%;font-size:clamp(20px,2.1vw,26px);line-height:1.35}.panel{display:grid;grid-template-columns:1fr 1fr;gap:16px}.panel>div{padding:16px;background:${panel};border:1px solid color-mix(in srgb, ${accent} 35%, transparent);font-size:clamp(20px,1.6vw,22px);font-weight:700}.accent{color:${accent}}${special}</style></head><body class="style-${escapeHtml(pack.id)}" data-style-pack="${escapeHtml(pack.id)}" data-style-version="${escapeHtml(pack.version)}"><section class="slide" data-style-pack="${escapeHtml(pack.id)}" data-layout="${escapeHtml(pack.previewLayout)}"><div class="eyebrow">${name} / STYLE PREVIEW</div><div><h1 class="headline">Make the message<br><span class="accent">visible.</span></h1><p class="copy">This preview uses the same palette, type hierarchy and layout grammar that AI will use for generated HTML.</p></div><div class="panel"><div>One clear takeaway</div><div>16:9 safe canvas</div></div></section></body></html>`;
  }

  function ensurePreviewOverlay() {
    let overlay = document.getElementById("ppt-style-preview-overlay");
    if (overlay) return overlay;
    overlay = document.createElement("div");
    overlay.id = "ppt-style-preview-overlay";
    overlay.hidden = true;
    overlay.innerHTML = `<div class="ppt-style-preview-dialog" role="dialog" aria-modal="true" aria-labelledby="ppt-style-preview-title"><button type="button" class="ppt-style-preview-close" aria-label="Close style preview">×</button><div class="ppt-style-preview-heading"><span>STYLE PREVIEW</span><h2 id="ppt-style-preview-title"></h2></div><iframe title="Style preview"></iframe></div>`;
    const style = document.createElement("style");
    style.textContent = `#ppt-style-preview-overlay{position:fixed;inset:0;z-index:2147483000;display:grid;place-items:center;padding:24px;background:rgba(15,23,42,.58)}#ppt-style-preview-overlay[hidden]{display:none}.ppt-style-preview-dialog{width:min(1100px,96vw);background:#fff;border-radius:18px;padding:18px;box-shadow:0 24px 70px rgba(15,23,42,.28);position:relative}.ppt-style-preview-heading{padding:0 8px 12px}.ppt-style-preview-heading span{font:700 11px/1 Inter,Arial,sans-serif;letter-spacing:.14em;color:#2563eb}.ppt-style-preview-heading h2{margin:6px 0 0;font:800 22px/1.2 Inter,Arial,sans-serif;color:#17213f}.ppt-style-preview-dialog iframe{display:block;width:100%;aspect-ratio:16/9;border:0;border-radius:12px;background:#e8edf5}.ppt-style-preview-close{position:absolute;right:14px;top:12px;width:34px;height:34px;border:0;border-radius:50%;background:#eef2f7;color:#17213f;font-size:24px;line-height:1;cursor:pointer}`;
    document.head.appendChild(style);
    document.body.appendChild(overlay);
    overlay.querySelector(".ppt-style-preview-close").addEventListener("click", () => { overlay.hidden = true; });
    overlay.addEventListener("click", (event) => { if (event.target === overlay) overlay.hidden = true; });
    return overlay;
  }

  function openPreview(id, customStyles = loadCustomStyles()) {
    const style = get(id, customStyles);
    if (!style) return;
    const overlay = ensurePreviewOverlay();
    overlay.querySelector("h2").textContent = style.name;
    overlay.querySelector("iframe").srcdoc = previewHtml(id, customStyles);
    overlay.hidden = false;
  }

  function ensurePickerOverlay() {
    let overlay = document.getElementById("ppt-style-picker-overlay");
    if (overlay) return overlay;
    overlay = document.createElement("div");
    overlay.id = "ppt-style-picker-overlay";
    overlay.hidden = true;
    overlay.innerHTML = `<section class="ppt-style-picker-dialog" role="dialog" aria-modal="true" aria-labelledby="ppt-style-picker-title"><header><div><span>STYLE LIBRARY</span><h2 id="ppt-style-picker-title">选择风格</h2></div><div><a href="/converter.html?manageStyles=1">管理风格</a><button type="button" aria-label="Close">x</button></div></header><div class="ppt-style-picker-grid"></div></section>`;
    const style = document.createElement("style");
    style.textContent = `#ppt-style-picker-overlay{position:fixed;inset:0;z-index:2147483001;overflow:auto;padding:36px;background:rgba(15,23,42,.55)}#ppt-style-picker-overlay[hidden]{display:none}.ppt-style-picker-dialog{width:min(1120px,100%);margin:auto;background:#f8fbff;border-radius:10px;padding:28px;box-shadow:0 28px 90px rgba(15,23,42,.3)}.ppt-style-picker-dialog header{display:flex;justify-content:space-between;align-items:center;margin-bottom:24px}.ppt-style-picker-dialog header>div{display:flex;align-items:center;gap:18px}.ppt-style-picker-dialog header span{font:700 12px/1 Inter,Arial,sans-serif;letter-spacing:.12em;color:#4f6ee8}.ppt-style-picker-dialog h2{margin:5px 0 0;font:800 30px/1.1 Inter,Arial,sans-serif;color:#17213f}.ppt-style-picker-dialog a,.ppt-style-picker-dialog button{border:0;background:#fff;color:#4565d8;border-radius:7px;padding:10px 13px;font:700 15px/1 Inter,Arial,sans-serif;text-decoration:none;cursor:pointer}.ppt-style-picker-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:18px}.ppt-style-picker-grid .style-library-card{padding:16px;border:1px solid #e2e8f5;border-radius:8px;background:#fff;color:#17213f;cursor:pointer}.ppt-style-picker-grid .style-library-card.is-selected{border-color:#7390ff;box-shadow:0 0 0 2px rgba(79,110,232,.13)}.ppt-style-picker-grid .style-library-art{position:relative;height:74px;overflow:hidden;border-radius:7px;background:var(--style-bg);margin-bottom:13px}.ppt-style-picker-grid .style-library-art b,.ppt-style-picker-grid .style-library-art span,.ppt-style-picker-grid .style-library-art i{position:absolute;display:block;border-radius:4px;background:var(--style-ink)}.ppt-style-picker-grid .style-library-art b{left:10%;top:25%;width:42%;height:10px}.ppt-style-picker-grid .style-library-art span{left:10%;bottom:25%;width:58%;height:7px;opacity:.48}.ppt-style-picker-grid .style-library-art i{right:10%;top:22%;width:20%;height:56%;background:var(--style-accent)}.ppt-style-picker-grid .style-library-card strong,.ppt-style-picker-grid .style-library-card small{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.ppt-style-picker-grid .style-library-card strong{font:800 17px/1.2 Inter,Arial,sans-serif}.ppt-style-picker-grid .style-library-card small{margin-top:4px;color:#70809d;font:500 15px/1.2 Inter,Arial,sans-serif}.ppt-style-picker-grid .style-library-footer{display:flex;justify-content:space-between;align-items:center;margin-top:12px}.ppt-style-picker-grid .style-library-swatches{display:flex;gap:5px}.ppt-style-picker-grid .style-library-swatches i{width:18px;height:9px;border-radius:99px;background:var(--style-swatch);border:1px solid rgba(15,23,42,.1)}.ppt-style-picker-grid .style-library-footer button{border:1px solid #c9d5ff;padding:5px 9px;background:#fff}@media(max-width:760px){#ppt-style-picker-overlay{padding:16px}.ppt-style-picker-dialog{padding:18px}.ppt-style-picker-grid{grid-template-columns:1fr}.ppt-style-picker-dialog h2{font-size:24px}}`;
    document.head.appendChild(style);
    document.body.appendChild(overlay);
    overlay.querySelector("header button").addEventListener("click", () => { overlay.hidden = true; });
    overlay.addEventListener("click", (event) => { if (event.target === overlay) overlay.hidden = true; });
    return overlay;
  }

  function openPicker({ selected = "teaching", customStyles = loadCustomStyles(), onSelect } = {}) {
    const overlay = ensurePickerOverlay();
    const grid = overlay.querySelector(".ppt-style-picker-grid");
    grid.innerHTML = allOptions(customStyles).map(([id]) => styleCardMarkup(id, { selected: id === selected, customStyles })).join("");
    grid.querySelectorAll("[data-style-card]").forEach((card) => card.addEventListener("click", (event) => {
      if (event?.target?.closest?.("[data-preview-style]")) return;
      overlay.hidden = true;
      onSelect?.(card.dataset.styleCard);
    }));
    grid.querySelectorAll("[data-preview-style]").forEach((button) => button.addEventListener("click", (event) => {
      event.stopPropagation();
      openPreview(button.dataset.previewStyle, customStyles);
    }));
    overlay.hidden = false;
  }

  window.PptStyleRegistry = { STORAGE_KEY, definitions, htmlAnythingSkillIds, skillIdFor, builtinOptions, allOptions, get, profileFor, layoutRules, previewMeta, stylePackFor, previewHtml, styleCardMarkup, normalizeCustomStyle, loadCustomStyles, openPreview, openPicker };
})();
