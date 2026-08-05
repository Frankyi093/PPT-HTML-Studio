(function () {
  const baseStyles = [
    ["news-broadcast", "News Broadcast"],
    ["tech-blueprint", "Tech Blueprint"],
    ["corporate-clean", "Corporate Clean"],
  ];

  const profiles = {
    banana: {
      styleName: "Banana Paper",
      colorPalette: "warm paper, ink navy, banana yellow, orange signal, cool cyan support",
      typography: "friendly bold sans-serif title with highly readable sans-serif body",
      layoutPattern: "centered cover, assertion-led titles, airy two-column evidence pages",
      visualMotifs: "yellow highlight bars, orange section labels, cyan visual modules and thin rules",
      imagePolicy: "use uploaded images as intentional visual anchors and keep them proportional",
      cardStyle: "few warm paper panels with crisp borders and modest radius",
      backgroundStyle: "warm off-white paper with restrained color blocks",
      iconStyle: "small functional line icons and geometric markers",
      spacingRules: "wide safe margins, short line lengths, one clear takeaway per page",
    },
    teaching: {
      styleName: "Teaching Blue",
      colorPalette: "white and pale blue canvas, navy text, clear blue accent lines",
      typography: "bold sans-serif title, readable sans-serif body",
      layoutPattern: "centered cover, title band content slides, one or two balanced columns",
      visualMotifs: "thin blue dividers, small lesson markers, light panels",
      imagePolicy: "reserve modest media zones that support the lesson, never oversized images",
      cardStyle: "light teaching panels only when grouping parallel items",
      backgroundStyle: "clean white or very pale blue with high contrast",
      iconStyle: "minimal educational icons",
      spacingRules: "wide safe margins, readable line length, no crowded corners",
    },
    swiss: {
      styleName: "Swiss Grid",
      colorPalette: "white, black/navy, international blue, sparse signal accent",
      typography: "strict sans-serif, large scale contrast",
      layoutPattern: "strong grid, asymmetric alignment, precise modules",
      visualMotifs: "grid lines, numbered markers, rectangular rules",
      imagePolicy: "images aligned to strict grid columns",
      cardStyle: "rectangular modules only, no rounded cards",
      backgroundStyle: "flat white with visible grid discipline",
      iconStyle: "geometric minimal symbols",
      spacingRules: "mathematical spacing and alignment",
    },
    editorial: {
      styleName: "Editorial",
      colorPalette: "warm white, ink navy, muted accent",
      typography: "magazine serif display title and elegant sans body",
      layoutPattern: "large headline, columns, pull quote or feature image rhythm",
      visualMotifs: "kickers, pull quotes, editorial rules",
      imagePolicy: "intentional crops with generous white space",
      cardStyle: "avoid card grids; use editorial blocks",
      backgroundStyle: "print-like warm white",
      iconStyle: "minimal editorial marks",
      spacingRules: "wide margins and magazine pacing",
    },
    "news-broadcast": {
      styleName: "News Broadcast",
      colorPalette: "white newsroom canvas, black text, broadcast red, dark burgundy lower-third accents",
      typography: "compressed bold sans-serif headlines, clean news body text, all-caps labels only for short broadcast tags",
      layoutPattern: "cover as live title card, content as anchor split, lower-third ticker, data bulletin, image lead, closing recap",
      visualMotifs: "LIVE badge, channel label, red vertical bar, lower-third strip, thin broadcast rules",
      imagePolicy: "use one strong news image, map, still, or generated editorial visual when useful; keep it in a framed broadcast window",
      cardStyle: "flat white panels and red headline strips; no soft rounded classroom cards",
      backgroundStyle: "clean white or very light gray with bold red broadcast accents",
      iconStyle: "minimal news glyphs, warning dots, signal markers",
      spacingRules: "strict safe margins, headline top band, ticker never overlaps body",
    },
    "tech-blueprint": {
      styleName: "Tech Blueprint",
      colorPalette: "deep blueprint navy, cyan grid lines, white text, electric blue highlights",
      typography: "technical sans-serif title, mono-style labels for specs and numbers",
      layoutPattern: "system overview, architecture map, process flow, metric dashboard, comparison matrix, roadmap",
      visualMotifs: "blueprint grid, callout leaders, nodes, diagrams, code/spec chips",
      imagePolicy: "prefer diagrams, UI screenshots, schematic placeholders, or generated abstract technical visuals",
      cardStyle: "thin-line panels with square corners and blueprint labels",
      backgroundStyle: "dark blueprint surface with low-opacity grid, no decorative gradients",
      iconStyle: "line engineering icons and node symbols",
      spacingRules: "use grid placement and keep diagrams readable at 16:9 export size",
    },
    "corporate-clean": {
      styleName: "Corporate Clean",
      colorPalette: "white, graphite text, muted blue primary, restrained green or amber signal accents",
      typography: "modern corporate sans-serif with strong but quiet hierarchy",
      layoutPattern: "executive title, agenda, key message, KPI row, comparison, timeline, recommendation",
      visualMotifs: "thin dividers, KPI chips, concise tables, quiet charts, section labels",
      imagePolicy: "use product, team, industry, or abstract business images only when they clarify the point",
      cardStyle: "flat low-shadow business panels, square or 8px radius at most",
      backgroundStyle: "white or light neutral canvas, never saturated full-slide color except divider pages",
      iconStyle: "simple monochrome business icons",
      spacingRules: "dense but calm, align to rows and columns, avoid marketing hero excess",
    },
  };

  const previewMeta = {
    "news-broadcast": { swatches: ["#ffffff", "#c1121f", "#26070a"], font: "News", sample: "Live", layout: "broadcast" },
    "tech-blueprint": { swatches: ["#071426", "#35d2ff", "#e6f7ff"], font: "Mono", sample: "System", layout: "blueprint" },
    "corporate-clean": { swatches: ["#ffffff", "#1f2937", "#2f6fed"], font: "Inter", sample: "Brief", layout: "business" },
  };

  const layoutFamilies = {
    banana: [
      "banana-cover",
      "takeaway",
      "two-column",
      "comparison",
      "process",
      "summary",
    ],
    "news-broadcast": [
      "broadcast-cover",
      "anchor-split",
      "lead-image",
      "bulletin-stack",
      "data-bulletin",
      "quote-lower-third",
      "recap",
    ],
    "tech-blueprint": [
      "blueprint-cover",
      "architecture-map",
      "process-flow",
      "metric-dashboard",
      "spec-comparison",
      "roadmap",
      "summary",
    ],
    "corporate-clean": [
      "executive-cover",
      "key-message",
      "kpi-row",
      "comparison-table",
      "timeline",
      "recommendation",
      "summary",
    ],
    default: [
      "cover-title",
      "agenda",
      "title-and-body",
      "two-column",
      "text-media-split",
      "comparison",
      "process",
      "summary",
    ],
  };

  function builtinStyles(existing = []) {
    const canonical = window.PptStyleRegistry?.builtinOptions?.() || [];
    if (canonical.length) {
      const seen = new Set(existing.map(([key]) => key));
      return existing.concat(canonical.filter(([key]) => !seen.has(key)));
    }
    const seen = new Set(existing.map(([key]) => key));
    return existing.concat(baseStyles.filter(([key]) => !seen.has(key)));
  }

  function styleLabel(style) {
    const canonical = window.PptStyleRegistry?.get?.(style);
    if (canonical?.name) return canonical.name;
    return (profiles[style] || profiles.teaching).styleName;
  }

  function profileFor(style, customStyle = null) {
    if (customStyle) {
      return {
        styleName: customStyle.name || "Custom Style",
        colorPalette: `background ${customStyle.colors?.background || "#ffffff"}, text ${customStyle.colors?.text || "#111827"}, primary ${customStyle.colors?.primary || "#3f6df6"}, accent ${customStyle.colors?.accent || "#56c7e8"}`,
        typography: `title ${customStyle.typography?.titleFont || "custom title font"}, body ${customStyle.typography?.bodyFont || "custom body font"}`,
        layoutPattern: customStyle.localRules || "reuse the imported PPT style rhythm on title and content pages",
        visualMotifs: customStyle.visualMotifs || "custom visual motifs inferred from the imported style",
        imagePolicy: customStyle.imagePolicy || "preserve image placement rhythm and reserve clear image zones",
        cardStyle: customStyle.cardStyle || "match the imported card style",
        backgroundStyle: customStyle.backgroundStyle || "match the imported background treatment",
        iconStyle: customStyle.iconStyle || "match the imported icon style",
        spacingRules: customStyle.spacingRules || "preserve the imported spacing rhythm with safe margins",
      };
    }
    const canonical = window.PptStyleRegistry?.profileFor?.(style);
    if (canonical) return { ...canonical };
    return { ...(profiles[style] || profiles.teaching) };
  }

  function stylePrompt(style, customStyle = null) {
    const profile = profileFor(style, customStyle);
    return `${profile.styleName}: palette ${profile.colorPalette}; typography ${profile.typography}; layout ${profile.layoutPattern}; motifs ${profile.visualMotifs}; image policy ${profile.imagePolicy}.`;
  }

  function implementationGuide(style, customStyle = null) {
    const profile = profileFor(style, customStyle);
    return `Implementation: bind every slide to ${profile.styleName}. Use ${profile.backgroundStyle}. Components: ${profile.cardStyle}. Icons: ${profile.iconStyle}. Spacing: ${profile.spacingRules}.`;
  }

  function layoutRules(style) {
    const canonical = window.PptStyleRegistry?.layoutRules?.(style);
    if (canonical?.length) return canonical;
    return [...(layoutFamilies[style] || layoutFamilies.default)];
  }

  function promptContract(style, options = {}) {
    const profile = profileFor(style, options.customStyle || null);
    const families = layoutRules(style);
    const source = options.source || "generation";
    const slideCount = options.slideCount ? `exactly ${options.slideCount}` : "the requested number of";
    return [
      "QUALITY CONTRACT",
      `Source: ${source}. Generate ${slideCount} slides using one locked style pack: ${profile.styleName}.`,
      `Allowed layout families only: ${families.join(", ")}.`,
      "Every slide section must include data-layout with one allowed family and data-style-pack with the selected style key.",
      "Use the AI as a planner and stylist, not as an unrestricted webpage author: one 16:9 canvas, one design system, stable editable HTML.",
      "Do not create landing pages, long scroll pages, mobile reflow, old slideshow scripts, fake navigation, or disconnected wrappers.",
      "Every slide must have one clear message, visible hierarchy, safe margins, high contrast, and no overflow.",
      "Every visible text element must be at least 20px on the 1280x720 canvas; titles should normally be at least 44px and body text at least 24px. Reduce copy or split content instead of shrinking type.",
      "Use images intentionally: real uploaded images via data-image-slot; generated or web images only as meaningful visual assets with alt text and no broken src.",
      "Use layout modules instead of random card grids. Agenda/card layouts appear only when the content is naturally parallel.",
      "Before returning, silently audit: exact slide count, complete titles, horizontal text, image slots valid, no overlap, no tiny text, no low contrast.",
    ].join("\n");
  }

  function cssVariant() {
    return `
    body.style-news-broadcast .slide{background:#f7f7f4;color:#111827}
    body.style-news-broadcast .slide-inner{border-left:18px solid #c1121f;border-bottom:54px solid #26070a}
    body.style-news-broadcast h1{font-family:Arial Black,Impact,Arial,sans-serif;text-transform:uppercase;letter-spacing:0;color:#101828}
    body.style-news-broadcast .chapter,.style-news-broadcast .kicker{color:#c1121f;text-transform:uppercase;font-weight:900}
    body.style-news-broadcast .point-card{border-radius:0;border:2px solid #111827;background:#fff}
    body.style-tech-blueprint .slide{background:#071426;color:#e6f7ff}
    body.style-tech-blueprint .slide::before{content:"";position:absolute;inset:0;background-image:linear-gradient(rgba(53,210,255,.08) 1px,transparent 1px),linear-gradient(90deg,rgba(53,210,255,.08) 1px,transparent 1px);background-size:40px 40px;pointer-events:none}
    body.style-tech-blueprint .slide-inner{border:1px solid rgba(53,210,255,.42);background:rgba(7,20,38,.82)}
    body.style-tech-blueprint h1{color:#e6f7ff;font-family:Inter,Arial,sans-serif}
    body.style-tech-blueprint .chapter{color:#35d2ff}
    body.style-tech-blueprint .point-card{background:rgba(8,34,60,.86);border-color:rgba(53,210,255,.55);border-radius:0}
    body.style-corporate-clean .slide{background:#f8fafc;color:#1f2937}
    body.style-corporate-clean .slide-inner{background:#fff;border-top:8px solid #2f6fed}
    body.style-corporate-clean h1{color:#111827;font-family:Inter,Arial,sans-serif}
    body.style-corporate-clean .chapter{color:#2f6fed}
    body.style-corporate-clean .point-card{background:#f8fafc;border-color:#dbe3ef;border-radius:8px}`;
  }

  window.PptQualitySystem = {
    builtinStyles,
    styleLabel,
    previewMeta: (style) => window.PptStyleRegistry?.previewMeta?.(style) || previewMeta[style] || null,
    profileFor,
    stylePrompt,
    implementationGuide,
    layoutRules,
    promptContract,
    cssVariant,
  };
})();
