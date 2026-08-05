(function () {
  const INSTANCES = new WeakMap();
  const RUNTIME_BASE = "/static/anchor-deck/";
  // Keep the runtime URL content-addressed enough to avoid serving the old
  // double-layout editor from a browser cache after a geometry fix.
  const RUNTIME_VERSION = "20260802-fixed-stage-v2";
  const SLIDE_SELECTOR = ".ppt-runtime-slide, .slide, section[data-slide-page], .ai-slide, [data-slide-page], .reveal .slides > section";
  const STAGE_SELECTOR = "deck-stage#deckStage,#deckStage,[data-html-deck-editor-stage],.deck-stage,#deck,.presentation-container,#presentation,.presentation,.slides-container,.slides-wrapper";
  const DEFAULT_WIDTH = 1280;
  const DEFAULT_HEIGHT = 720;

  const RUNTIME_STYLES = [
    "vanilla-picker.css",
    "html-deck-editor.css",
  ];

  const RUNTIME_SCRIPTS = [
    "deck-stage.js",
    "vanilla-picker.js",
    "html-to-image.js",
    "jspdf.umd.min.js",
    "jszip.min.js",
    "html-deck-editor.js",
  ];

  function computeSlideScale(containerWidth, containerHeight, slideWidth = DEFAULT_WIDTH, slideHeight = DEFAULT_HEIGHT) {
    if (!containerWidth || !containerHeight) return 1;
    return Math.max(0.12, Math.min(containerWidth / slideWidth, containerHeight / slideHeight, 1));
  }

  function fitSlideToViewport(container, shell, slideWidth = DEFAULT_WIDTH, slideHeight = DEFAULT_HEIGHT) {
    const rect = (container || shell)?.getBoundingClientRect?.();
    if (!rect?.width || !rect?.height || !shell) return 1;
    const scale = computeSlideScale(rect.width, rect.height, slideWidth, slideHeight);
    shell.style.setProperty("--deck-stage-width", `${Math.round(slideWidth)}px`);
    shell.style.setProperty("--deck-stage-height", `${Math.round(slideHeight)}px`);
    shell.style.setProperty("--preview-scale", String(scale));
    return scale;
  }

  function isEditingMode(mode) {
    return mode === "edit" || mode === "style" || mode === "ai";
  }

  function textOf(node) {
    return String(node?.textContent || "").replace(/\s+/g, " ").trim();
  }

  function escapeCssText(value) {
    return String(value ?? "").replace(/\\/g, "\\\\").replace(/\*\//g, "*\\/");
  }

  function numberFromCss(value) {
    const match = String(value || "").match(/(-?\d+(?:\.\d+)?)\s*px/i);
    const number = match ? Number.parseFloat(match[1]) : Number.NaN;
    return Number.isFinite(number) && number > 0 ? number : 0;
  }

  function parseCssBlocks(doc) {
    const blocks = [];
    const styleText = [...doc.querySelectorAll("style")]
      .map((node) => node.textContent || "")
      .join("\n");
    const regex = /([^{}]+)\{([^{}]+)\}/g;
    let match;
    while ((match = regex.exec(styleText))) {
      blocks.push({ selector: match[1].trim(), body: match[2] });
    }
    return blocks;
  }

  function cssSizeForSelector(blocks, selectorText) {
    const selectors = selectorText.split(",").map((item) => item.trim()).filter(Boolean);
    for (let index = blocks.length - 1; index >= 0; index -= 1) {
      const block = blocks[index];
      if (!selectors.some((selector) => block.selector.split(",").map((item) => item.trim()).includes(selector))) continue;
      const width = numberFromCss(block.body.match(/\bwidth\s*:\s*([^;]+)/i)?.[1] || "");
      const height = numberFromCss(block.body.match(/\bheight\s*:\s*([^;]+)/i)?.[1] || "");
      if (width || height) return { width, height };
    }
    return { width: 0, height: 0 };
  }

  function inlineElementSize(element) {
    if (!element) return { width: 0, height: 0 };
    const widthAttr = Number.parseFloat(element.getAttribute?.("width") || "");
    const heightAttr = Number.parseFloat(element.getAttribute?.("height") || "");
    const style = element.getAttribute?.("style") || "";
    return {
      width: (Number.isFinite(widthAttr) && widthAttr > 0 ? widthAttr : 0) || numberFromCss(style.match(/\bwidth\s*:\s*([^;]+)/i)?.[1] || ""),
      height: (Number.isFinite(heightAttr) && heightAttr > 0 ? heightAttr : 0) || numberFromCss(style.match(/\bheight\s*:\s*([^;]+)/i)?.[1] || ""),
    };
  }

  function detectDeckSize(doc, stage, slides) {
    const blocks = parseCssBlocks(doc);
    const stageInline = inlineElementSize(stage);
    const firstSlideInline = inlineElementSize(slides?.[0]);
    const stageCss = cssSizeForSelector(blocks, ".presentation-container,#deckStage,.deck-stage,#deck");
    const slideCss = cssSizeForSelector(blocks, ".slide,section.slide,div.slide,[data-slide-page]");
    const width = stageInline.width || firstSlideInline.width || stageCss.width || slideCss.width || DEFAULT_WIDTH;
    const height = stageInline.height || firstSlideInline.height || stageCss.height || slideCss.height || DEFAULT_HEIGHT;
    return {
      width: Math.round(width || DEFAULT_WIDTH),
      height: Math.round(height || DEFAULT_HEIGHT),
    };
  }

  function isEditorOrChromeNode(node) {
    return Boolean(node?.closest?.("[data-html-deck-editor-ui],.editor-toolbar,.ppt-runtime-nav,.ppt-ve-sidebar,.ppt-ve-inspector,.nav,.navigation,.deck-nav"));
  }

  function isSlideLike(node) {
    return Boolean(node?.matches?.(SLIDE_SELECTOR));
  }

  function uniqueTopLevelSlides(slides) {
    return slides.filter((node, index) => !slides.some((candidate, other) => other !== index && candidate.contains(node)));
  }

  function findStageCandidate(doc) {
    const preferred = doc.querySelector("[data-html-deck-editor-stage],deck-stage#deckStage,#deckStage,.deck-stage,#deck,.presentation-container,#presentation,.presentation,.slides-container,.slides-wrapper");
    if (preferred) return preferred;
    const revealSlides = doc.querySelector(".reveal .slides");
    if (revealSlides) return revealSlides;
    return null;
  }

  function findDeckSlides(doc, stage = findStageCandidate(doc)) {
    if (stage) {
      const direct = [...stage.children].filter((node) => isSlideLike(node) || node.matches?.("section,article,div"));
      const slideDirect = direct.filter((node) => isSlideLike(node));
      if (slideDirect.length) return slideDirect.filter((node) => !isEditorOrChromeNode(node));
      if (direct.length > 1 && direct.every((node) => !isEditorOrChromeNode(node))) return direct;
    }
    const all = [...doc.querySelectorAll(SLIDE_SELECTOR)].filter((node) => !isEditorOrChromeNode(node));
    return uniqueTopLevelSlides(all);
  }

  function removeLegacySlideScripts(doc) {
    doc.querySelectorAll("script").forEach((script) => {
      const type = (script.getAttribute("type") || "").trim().toLowerCase();
      if (type && !/^(?:text|application)\/(?:javascript|ecmascript)$|^module$/.test(type)) return;
      const src = script.getAttribute("src") || "";
      const code = script.textContent || "";
      const combined = `${src}\n${code}`;
      const looksLikeDeckRuntime = /deck-stage|html-deck-editor|ppt-anchor-runtime|ppt-platform-editor|ppt-runtime-nav/i.test(combined);
      const looksLikeHostNavigation = /currentSlide|updateSlide|showSlide|nextSlide|prevSlide|slideIndicator|querySelectorAll\(['"]\.slide/i.test(combined);
      if (looksLikeDeckRuntime || looksLikeHostNavigation) script.remove();
    });
  }

  function removeLegacyNavigation(doc) {
    doc.querySelectorAll(".navigation,.deck-nav,.ppt-runtime-nav,.nav-controls,.controls,.slide-controls").forEach((node) => {
      const text = textOf(node).toLowerCase();
      if (/prev|next|previous|slide|\d+\s*\/\s*\d+/.test(text) || node.querySelector?.("button,a")) node.remove();
    });
    doc.querySelectorAll("button,a").forEach((node) => {
      const onclick = node.getAttribute("onclick") || "";
      if (/\b(?:nextSlide|prevSlide|showSlide|updateSlide)\b/i.test(onclick)) node.remove();
    });
  }

  function normalizeSlideElement(doc, slide, index) {
    const section = slide.tagName?.toLowerCase() === "section" ? slide : doc.createElement("section");
    if (section !== slide) {
      [...slide.attributes].forEach((attr) => section.setAttribute(attr.name, attr.value));
      while (slide.firstChild) section.appendChild(slide.firstChild);
    }
    section.classList.add("slide");
    section.classList.toggle("active", index === 0);
    section.classList.toggle("visible", index === 0);
    section.toggleAttribute("data-deck-active", index === 0);
    section.toggleAttribute("data-html-deck-editor-current", index === 0);
    section.setAttribute("data-html-deck-editor-page", "");
    if (!section.dataset.slidePage) section.dataset.slidePage = String(index + 1);
    if (!section.dataset.title) {
      const title = textOf(section.querySelector("h1,h2,h3,.slide-title,.title,[data-title]")) || `Slide ${index + 1}`;
      section.dataset.title = title.slice(0, 100);
    }
    section.removeAttribute("hidden");
    section.removeAttribute("aria-hidden");
    section.style.removeProperty("display");
    section.style.removeProperty("visibility");
    section.style.removeProperty("opacity");
    section.style.removeProperty("transform");
    return section;
  }

  function markEditableContent(slides) {
    slides.forEach((slide, slideIndex) => {
      const page = String(slide.dataset.slidePage || slideIndex + 1);
      const ensureElementId = (element, kind, index) => {
        if (!element.dataset.elementId) element.dataset.elementId = `slide-${page}-${kind}-${index + 1}`;
      };
      slide.querySelectorAll("h1,h2,h3,h4,h5,h6,p,li,blockquote,figcaption,caption,td,th,button,a,label").forEach((element, index) => {
        if (element.closest("[data-html-deck-editor-ui],script,style,template,.nav,.deck-nav,.ppt-runtime-nav,.deck-controls")) return;
        if (!element.textContent?.replace(/\s+/g, "").length) return;
        if (element.querySelector("h1,h2,h3,h4,h5,h6,p,li,blockquote,figcaption,caption,td,th")) return;
        element.setAttribute("data-editable", "");
        element.setAttribute("data-editor-kind", "text");
        ensureElementId(element, "text", index);
      });
      slide.querySelectorAll("img,picture,video,canvas,iframe,object,embed").forEach((element, index) => {
        if (element.closest("[data-html-deck-editor-ui],script,style,template,.nav,.deck-nav,.ppt-runtime-nav,.deck-controls")) return;
        element.setAttribute("data-editable-media", "");
        element.setAttribute("data-editor-kind", "media");
        ensureElementId(element, "media", index);
      });
      slide.querySelectorAll("*").forEach((element, index) => {
        if (element.closest("[data-html-deck-editor-ui],script,style,template,.nav,.deck-nav,.ppt-runtime-nav,.deck-controls")) return;
        const inlineBackground = element.style?.backgroundImage || "";
        if (!/url\(/i.test(inlineBackground)) return;
        element.setAttribute("data-editable-media", "");
        element.setAttribute("data-editor-kind", "media");
        ensureElementId(element, "background-media", index);
      });
      slide.querySelectorAll(".media-box,.editable-image-box,.point-card,.shape-layer,.image-layer,[data-shape]").forEach((element, index) => {
        if (element.closest("[data-html-deck-editor-ui],.nav,.deck-nav,.ppt-runtime-nav,.deck-controls")) return;
        if (!element.matches("[data-editor-kind='media']")) {
          const hasText = Boolean(element.textContent?.replace(/\s+/g, ""));
          const hasMedia = Boolean(element.querySelector("img,picture,video,canvas,iframe,object,embed"));
          element.setAttribute("data-editor-kind", hasText && !hasMedia ? "text" : "box");
        }
        if (element.dataset.editorKind === "text") {
          element.setAttribute("data-editable", "");
          element.removeAttribute("data-editable-box");
        } else if (element.dataset.editorKind === "box") {
          element.setAttribute("data-editable-box", "");
        }
        ensureElementId(element, element.dataset.editorKind === "text" ? "text-shape" : "box", index);
      });
      slide.querySelectorAll("svg,[data-source-element],.diagram,.visual-module,.shape,.decorative-shape").forEach((element, index) => {
        if (element === slide || element.closest("[data-html-deck-editor-ui],script,style,template,.nav,.deck-nav,.ppt-runtime-nav,.deck-controls")) return;
        if (element.matches("svg") || element.hasAttribute("data-source-element")) {
          if (element.matches("[data-editor-kind='text'],[data-editable]")) {
            element.setAttribute("data-editor-kind", "text");
            element.removeAttribute("data-editable-box");
            return;
          }
          if (element.matches("[data-editor-kind='media'],[data-editable-media]")) {
            element.setAttribute("data-editor-kind", "media");
            element.removeAttribute("data-editable-box");
            return;
          }
          element.setAttribute("data-editable-box", "");
          element.setAttribute("data-editor-kind", "box");
          ensureElementId(element, "box", index);
        }
      });
    });
  }

  // AI-generated decks frequently contain anonymous geometric layers. They
  // are visual decoration unless they carry readable content or a real data
  // visual. Classify them before mounting the editor so they cannot sit above
  // the content layer or receive pointer events. This is deterministic and
  // does not add another model request.
  function containGeneratedDecorations(slides) {
    const decorationClass = /(?:decor|background|bg[-_]|shape[-_]layer|wave|curve|ribbon|confetti|squiggle|ornament|pattern|blob|accent|line[-_]art|geometry)/i;
    const contentClass = /(?:diagram|chart|plot|graph|figure|table|visual|media|image|evidence|pipeline|flow|method|result)/i;
    const mediaSelector = "img,picture,video,iframe,object,embed,table,figure,[data-visual],[data-image-slot],[data-chart],[data-figure],[role='img'],svg[aria-label]";
    const hasMeaningfulText = (element) => Boolean(textOf(element).replace(/\s+/g, "").length);
    const hasContentVisual = (element) => Boolean(element.matches?.(mediaSelector) || element.querySelector?.(mediaSelector));
    const isContentLayer = (element) => {
      const className = typeof element.className === "string" ? element.className : "";
      const role = `${className} ${element.getAttribute?.("role") || ""} ${element.dataset?.editorKind || ""}`;
      const explicitVisual = element.matches?.("[data-visual],[data-image-slot],[data-chart],[data-figure],figure,table,img,picture,video,iframe,object,embed,svg[aria-label]");
      const sourceBackedVisual = element.matches?.("[data-source-element]") && (hasMeaningfulText(element) || element.hasAttribute("data-visual-kind") || element.hasAttribute("data-chart"));
      return hasMeaningfulText(element) || explicitVisual || sourceBackedVisual || contentClass.test(role);
    };
    const isDecorationCandidate = (element) => {
      if (!element || element === element.closest?.(".slide")) return false;
      if (element.closest?.("[data-html-deck-editor-ui],script,style,template,.nav,.deck-nav,.ppt-runtime-nav,.deck-controls")) return false;
      if (isContentLayer(element)) return false;
      const className = typeof element.className === "string" ? element.className : "";
      const role = `${className} ${element.getAttribute?.("role") || ""} ${element.dataset?.editorKind || ""}`;
      const geometryOnly = element.matches?.("svg,[data-decoration],[data-source-element],[data-editor-kind='box'],.shape,.line,.shape-layer,.decorative-shape") || decorationClass.test(role);
      return geometryOnly;
    };
    slides.forEach((slide) => {
      slide.setAttribute("data-geometry-clip", "true");
      slide.querySelectorAll("*").forEach((element) => {
        if (isDecorationCandidate(element)) {
          element.setAttribute("data-decoration", "true");
          element.classList.add("ppt-auto-decoration");
          element.setAttribute("aria-hidden", "true");
          if (!element.hasAttribute("data-editable") && !element.hasAttribute("data-editable-media")) {
            element.setAttribute("data-editable-box", "");
            element.setAttribute("data-editor-kind", "box");
          }
          element.style.setProperty("pointer-events", "none", "important");
          element.style.setProperty("z-index", "0", "important");
        }
      });
      const contentRoots = new Set();
      slide.querySelectorAll("[data-editable],[data-editable-media],[data-editable-box],[data-editor-kind='text'],[data-editor-kind='media'],[data-source-element],figure,table,img,video,canvas").forEach((element) => {
        let root = element;
        while (root.parentElement && root.parentElement !== slide && !root.parentElement.matches?.(".slide-inner")) root = root.parentElement;
        if (root !== slide) contentRoots.add(root);
      });
      contentRoots.forEach((root) => {
        root.setAttribute("data-content-layer", "true");
        root.style.setProperty("position", "relative", "important");
        root.style.setProperty("z-index", "10", "important");
      });
    });
  }

  // HTML Anything can emit a large anonymous div/img or a pseudo-element as a
  // background even when the prompt asks it to mark decorations.  Those
  // layers are not source content and may sit above the text layer.  Repair
  // them locally after layout; this is deliberately non-blocking and does not
  // trigger another model request.
  function repairAiOccludingLayers(doc, stage) {
    if (!isAiGeneratedDocument(doc) || !stage) return;
    const view = doc.defaultView;
    const stageRect = stage.getBoundingClientRect?.();
    const stageArea = stageRect?.width && stageRect?.height ? stageRect.width * stageRect.height : 0;
    const styleId = "ppt-ai-occlusion-repair-runtime";
    if (!doc.getElementById(styleId)) {
      const style = doc.createElement("style");
      style.id = styleId;
      style.textContent = `.ai-occlusion-pseudo-repaired::before,.ai-occlusion-pseudo-repaired::after{content:none!important;background:none!important;display:none!important}.ai-occlusion-repaired{pointer-events:none!important;z-index:0!important;opacity:0!important;visibility:hidden!important}.ai-occlusion-demoted{pointer-events:none!important;z-index:0!important;opacity:.08!important}`;
      doc.head?.appendChild(style);
    }
    const isMeaningfulText = (node) => Boolean(textOf(node).replace(/\s+/g, "").length >= 3);
    const isProtectedMedia = (node) => {
      if (!node?.matches) return false;
      if (node.matches("figure")) {
        // A bare figure can be a model-generated placeholder.  Protect only
        // source-backed figures or figures with a real caption/asset.
        return Boolean(node.matches("[data-source-element],[data-visual],[data-chart],[data-figure]")
          || node.querySelector?.("[data-word-asset-id],[data-source-element],[data-visual],[data-chart],[data-figure],table,svg[aria-label],figcaption")
          || textOf(node.querySelector?.("figcaption") || node).replace(/\s+/g, "").length >= 8);
      }
      if (node.matches("table,svg[aria-label],[data-word-asset-id],[data-source-element],[data-visual],[data-chart],[data-figure]")) return true;
      const parentFigure = node.closest?.("figure");
      if (parentFigure) return isProtectedMedia(parentFigure);
      return Boolean(node.closest?.("[data-word-asset-id],[data-source-element],[data-visual],[data-chart],[data-figure],table"));
    };
    const rectFor = (node) => {
      const rect = node.getBoundingClientRect?.();
      if (!rect || !rect.width || !rect.height || !stageRect) return null;
      return { left: rect.left - stageRect.left, top: rect.top - stageRect.top, right: rect.right - stageRect.left, bottom: rect.bottom - stageRect.top, width: rect.width, height: rect.height };
    };
    const area = (rect) => rect ? Math.max(0, rect.width) * Math.max(0, rect.height) : 0;
    const overlap = (a, b) => {
      if (!a || !b) return 0;
      const value = Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left)) * Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top));
      return value;
    };
    const imageLooksBlank = (image) => {
      if (!image || isProtectedMedia(image)) return false;
      if (!image.complete || !image.naturalWidth || !image.naturalHeight) return false;
      try {
        const canvas = doc.createElement("canvas"); canvas.width = 48; canvas.height = 48;
        const context = canvas.getContext("2d", { willReadFrequently: true });
        if (!context) return false;
        context.drawImage(image, 0, 0, 48, 48);
        const pixels = context.getImageData(0, 0, 48, 48).data;
        let visible = 0; let varied = 0;
        for (let index = 0; index < pixels.length; index += 4) {
          const alpha = pixels[index + 3];
          const brightness = (pixels[index] + pixels[index + 1] + pixels[index + 2]) / 3;
          if (alpha > 12) visible += 1;
          if (alpha > 12 && brightness < 242 && Math.max(pixels[index], pixels[index + 1], pixels[index + 2]) - Math.min(pixels[index], pixels[index + 1], pixels[index + 2]) > 8) varied += 1;
        }
        return visible < 32 || (visible > 0 && varied / visible < 0.006);
      } catch {
        return false;
      }
    };
    const contentRects = [...stage.querySelectorAll(".slide h1,.slide h2,.slide h3,.slide h4,.slide h5,.slide h6,.slide p,.slide li,.slide blockquote,.slide table,.slide figure,.slide img[data-word-asset-id],[data-content-layer='true']")]
      .filter((node) => !node.closest?.('[data-decoration="true"],.ppt-auto-decoration,[aria-hidden="true"]'))
      .map(rectFor).filter(Boolean);
    [...stage.querySelectorAll(".slide, .slide *")].forEach((element) => {
      if (element.closest?.("[data-html-deck-editor-ui],script,style,template,.ppt-runtime-nav,.deck-nav")) return;
      const computed = view?.getComputedStyle?.(element);
      const text = isMeaningfulText(element);
      const protectedMedia = isProtectedMedia(element);
      const rect = rectFor(element);
      const areaRatio = stageArea ? area(rect) / stageArea : 0;
      const overlapRatio = contentRects.length && rect ? Math.max(...contentRects.map((contentRect) => overlap(rect, contentRect) / Math.max(1, area(contentRect)))) : 0;
      const position = computed?.position || element.style?.position || "";
      const zIndex = Number.parseInt(computed?.zIndex || element.style?.zIndex || "0", 10) || 0;
      const hasBackground = Boolean(computed && ((computed.backgroundImage && computed.backgroundImage !== "none") || (computed.backgroundColor && !/^rgba?\([^,]+,[^,]+,[^,]+,\s*0\s*\)$/i.test(computed.backgroundColor) && computed.backgroundColor !== "transparent")));
      const blankImage = element.matches?.("img") && imageLooksBlank(element);
      const parentFigure = element.closest?.("figure");
      const semanticParentFigure = parentFigure && isProtectedMedia(parentFigure);
      const anonymousImageOccluder = element.matches?.("img") && !protectedMedia && !semanticParentFigure && !element.closest?.("[data-image-slot],[data-visual],[data-chart],[data-source-element]") && areaRatio >= 0.18 && overlapRatio >= 0.45;
      const emptyOverlay = !text && !protectedMedia && hasBackground && (position === "absolute" || position === "fixed" || zIndex >= 5) && (areaRatio >= 0.16 || overlapRatio >= 0.25);
      if (blankImage) {
        element.dataset.aiOcclusionRepaired = "blank-raster-removed";
        element.classList.add("ai-occlusion-repaired");
        return;
      }
      if (emptyOverlay) {
        element.dataset.aiOcclusionRepaired = "anonymous-overlay-demoted";
        element.classList.add(overlapRatio >= 0.4 || areaRatio >= 0.42 ? "ai-occlusion-repaired" : "ai-occlusion-demoted");
      } else if (anonymousImageOccluder) {
        element.dataset.aiOcclusionRepaired = "anonymous-image-occluder-removed";
        element.classList.add("ai-occlusion-repaired");
      }
    });
    // Suppress oversized pseudo-elements that are positioned as independent
    // layers. Text-bearing parents remain intact; only the pseudo decoration
    // is disabled.
    [...stage.querySelectorAll(".slide, .slide *")].forEach((element) => {
      if (element.closest?.('[data-decoration="true"],.ppt-auto-decoration,[aria-hidden="true"]')) return;
      const computed = view?.getComputedStyle?.bind(view);
      if (!computed) return;
      const before = computed(element, "::before");
      const after = computed(element, "::after");
      const pseudoLooksLikeOverlay = (pseudo) => {
        if (!pseudo || pseudo.content === "none" || pseudo.content === "normal") return false;
        const position = pseudo.position || "";
        const background = (pseudo.backgroundImage && pseudo.backgroundImage !== "none") || (pseudo.backgroundColor && pseudo.backgroundColor !== "transparent");
        const width = Number.parseFloat(pseudo.width || "0");
        const height = Number.parseFloat(pseudo.height || "0");
        return background && (position === "absolute" || position === "fixed") && (pseudo.inset !== "auto" || width > 500 || height > 300 || Number.parseInt(pseudo.zIndex || "0", 10) >= 5);
      };
      if (pseudoLooksLikeOverlay(before) || pseudoLooksLikeOverlay(after)) element.classList.add("ai-occlusion-pseudo-repaired");
    });
  }

  function setDecorationInteraction(doc, active) {
    if (!doc?.querySelectorAll) return;
    doc.querySelectorAll('[data-decoration="true"],.ppt-auto-decoration').forEach((element) => {
      if (active) {
        element.style.setProperty("pointer-events", "auto", "important");
        element.style.setProperty("z-index", "1", "important");
        if (element.dataset.aiSuppressedVisual === "oversized-decoration") {
          element.style.setProperty("opacity", "0.08", "important");
        }
      } else {
        element.style.setProperty("pointer-events", "none", "important");
        element.style.setProperty("z-index", "0", "important");
        if (element.dataset.aiSuppressedVisual === "oversized-decoration") {
          element.style.setProperty("opacity", "0", "important");
        }
      }
    });
  }

  function elementRectInStage(element, stage) {
    if (!element?.getBoundingClientRect || !stage?.getBoundingClientRect) return null;
    const rect = element.getBoundingClientRect();
    const stageRect = stage.getBoundingClientRect();
    if (!rect.width || !rect.height || !stageRect.width || !stageRect.height) return null;
    return {
      left: Math.max(0, rect.left - stageRect.left),
      top: Math.max(0, rect.top - stageRect.top),
      right: Math.min(stageRect.width, rect.right - stageRect.left),
      bottom: Math.min(stageRect.height, rect.bottom - stageRect.top),
    };
  }

  function rectArea(rect) {
    return rect && rect.right > rect.left && rect.bottom > rect.top ? (rect.right - rect.left) * (rect.bottom - rect.top) : 0;
  }

  function rectIntersectionArea(a, b) {
    if (!a || !b) return 0;
    return rectArea({
      left: Math.max(a.left, b.left),
      top: Math.max(a.top, b.top),
      right: Math.min(a.right, b.right),
      bottom: Math.min(a.bottom, b.bottom),
    });
  }

  function containOversizedGeneratedVisuals(doc, stage) {
    if (!isAiGeneratedDocument(doc) || !stage) return;
    const stageRect = stage.getBoundingClientRect?.();
    const stageArea = stageRect ? stageRect.width * stageRect.height : 0;
    if (!stageArea) return;
    [...stage.children].filter((node) => node.matches?.(".slide,[data-html-deck-editor-page]")).forEach((slide) => {
      const content = [...slide.querySelectorAll("[data-content-layer='true'],[data-editable],[data-editable-media],h1,h2,h3,h4,h5,h6,p,li,blockquote,table,figure,img,video,canvas")]
        .filter((element) => !element.closest?.('[data-decoration="true"],.ppt-auto-decoration,[aria-hidden="true"]'));
      const contentRects = content.map((element) => elementRectInStage(element, stage)).filter(Boolean);
      slide.querySelectorAll("svg,[data-editor-kind='box'],[data-source-element],.shape,.line,.shape-layer,.decorative-shape").forEach((element) => {
        if (element.matches?.("[data-content-layer='true'],[data-visual],[data-chart],[data-figure],figure,table,img,video,canvas")) return;
        if (element.querySelector?.("text,foreignObject,img,table,figcaption,[data-chart],[data-visual]")) return;
        const rect = elementRectInStage(element, stage);
        const areaRatio = rectArea(rect) / stageArea;
        const overlapRatio = contentRects.length
          ? Math.max(...contentRects.map((contentRect) => rectIntersectionArea(rect, contentRect) / Math.max(1, rectArea(contentRect))))
          : 0;
        if (areaRatio < 0.22 && overlapRatio < 0.18) return;
        element.setAttribute("data-decoration", "true");
        element.classList.add("ppt-auto-decoration");
        element.setAttribute("aria-hidden", "true");
        if (!element.hasAttribute("data-editable") && !element.hasAttribute("data-editable-media")) {
          element.setAttribute("data-editable-box", "");
          element.setAttribute("data-editor-kind", "box");
        }
        element.dataset.aiSuppressedVisual = "oversized-decoration";
        element.style.setProperty("pointer-events", "none", "important");
        element.style.setProperty("z-index", "0", "important");
        element.style.setProperty("opacity", "0", "important");
      });
    });
  }

  function normalizeSixteenNineSize(size) {
    // The editor has one canonical coordinate system. Source dimensions are
    // metadata only; preserving them here would make the iframe scale twice.
    const width = Number(size?.width) || DEFAULT_WIDTH;
    const height = Number(size?.height) || DEFAULT_HEIGHT;
    const ratio = width / Math.max(1, height);
    if (Math.abs(ratio - (16 / 9)) <= 0.06) return { width: DEFAULT_WIDTH, height: DEFAULT_HEIGHT };
    return { width: DEFAULT_WIDTH, height: DEFAULT_HEIGHT };
  }

  function isAiGeneratedDocument(doc) {
    return Boolean(doc?.querySelector?.('meta[name="ppt-ai-generated"][content="html-anything-v5"]') || doc?.body?.dataset?.pptAiGenerated === "html-anything-v5");
  }

  function enforceMinimumTypography(doc, slides, options = {}) {
    const view = doc.defaultView;
    if (!view?.getComputedStyle) return;
    const aiOnly = options.aiOnly === true;
    slides.forEach((slide) => {
      const candidates = new Set(slide.querySelectorAll("h1,h2,h3,h4,h5,h6,p,li,blockquote,figcaption,caption,td,th,[data-editor-kind='text'],[data-editable]"));
      if (aiOnly) {
        slide.querySelectorAll("div,span,strong,em").forEach((element) => {
          if (element.closest("[data-decoration='true'],[data-html-deck-editor-ui],script,style,template")) return;
          if (!element.textContent?.trim() || element.children.length) return;
          candidates.add(element);
        });
      }
      candidates.forEach((element) => {
        if (!element.textContent?.replace(/\s+/g, "").length) return;
        if (element.closest("[data-decoration='true'],[aria-hidden='true']")) return;
        const size = Number.parseFloat(view.getComputedStyle(element).fontSize || "0");
        const isHeading = element.matches("h1,h2,h3,h4,h5,h6,.slide-title,.cover-title") || /(?:title|heading|kicker)/i.test(element.className || "");
        const isBody = element.matches("p,li,blockquote,td,th") || element.dataset.editorKind === "text";
        const floor = isHeading ? 40 : isBody ? 20 : 18;
        if (size > 0 && size < floor) {
          element.style.setProperty("font-size", `${floor}px`, "important");
          element.style.setProperty("line-height", isHeading ? "1.12" : "1.28", "important");
          element.dataset.typographyRepaired = `minimum-${floor}px`;
        }
      });
    });
  }

  function hasMeaningfulAiSlideContent(slide) {
    if (!slide) return false;
    const clone = slide.cloneNode(true);
    clone.querySelectorAll("[data-decoration='true'],.ppt-auto-decoration,[aria-hidden='true'],script,style,template").forEach((node) => node.remove());
    const text = (clone.textContent || "").replace(/\s+/g, "").trim();
    if (text.length >= 10) return true;
    const hasImage = [...slide.querySelectorAll("img")].some((image) => Boolean(image.getAttribute("src") || image.getAttribute("data-inline-image")) && !image.closest("[data-decoration='true'],.ppt-auto-decoration,[aria-hidden='true']"));
    if (hasImage) return true;
    const hasTableData = [...slide.querySelectorAll("td,th")].some((cell) => Boolean(cell.textContent?.replace(/\s+/g, "").length) && !cell.closest("[data-decoration='true'],.ppt-auto-decoration,[aria-hidden='true']"));
    if (hasTableData) return true;
    const hasSvgText = [...slide.querySelectorAll("svg text,svg foreignObject")].some((node) => Boolean(node.textContent?.replace(/\s+/g, "").length) && !node.closest("[data-decoration='true'],.ppt-auto-decoration,[aria-hidden='true']"));
    return hasSvgText;
  }

  function repairAiEmptySlides(doc, stage) {
    if (!isAiGeneratedDocument(doc)) return;
    const styleId = "ppt-ai-empty-slide-repair-runtime";
    if (!doc.getElementById(styleId)) {
      const style = doc.createElement("style");
      style.id = styleId;
      style.textContent = `
        .ai-repaired-slide{width:1280px!important;height:720px!important;box-sizing:border-box!important;overflow:hidden!important;padding:56px 72px!important;background:var(--deck-bg,#f7f3e8)!important;color:var(--deck-text,#172554)!important}
        .ai-repaired-slide .ai-repair-shell{height:100%;display:flex;flex-direction:column;justify-content:center;max-width:1080px;box-sizing:border-box}
        .ai-repaired-slide .ai-repair-kicker{font-size:20px;line-height:1.2;letter-spacing:.12em;text-transform:uppercase;color:var(--deck-accent,#2563eb);font-weight:700;margin-bottom:18px}
        .ai-repaired-slide h2{font-size:48px;line-height:1.1;margin:0 0 30px;font-weight:800}
        .ai-repaired-slide ul{margin:0;padding-left:30px;display:grid;gap:16px;font-size:26px;line-height:1.3}
      `;
      doc.head.appendChild(style);
    }
    [...stage.children].filter((node) => node.matches?.(".slide,[data-html-deck-editor-page]")).forEach((slide, index) => {
      if (hasMeaningfulAiSlideContent(slide)) return;
      const title = slide.dataset.title || `Slide ${index + 1}`;
      const shell = doc.createElement("div");
      shell.className = "ai-repair-shell";
      shell.setAttribute("data-content-layer", "true");
      const kicker = doc.createElement("div");
      kicker.className = "ai-repair-kicker";
      kicker.textContent = `${String(index + 1).padStart(2, "0")} / HTML PRESENTATION`;
      const heading = doc.createElement("h2");
      heading.textContent = title;
      const list = doc.createElement("ul");
      const item = doc.createElement("li");
      item.textContent = "本页核心内容";
      list.appendChild(item);
      shell.append(kicker, heading, list);
      slide.replaceChildren(shell);
      slide.classList.add("ai-repaired-slide");
      slide.dataset.aiRepaired = "empty-slide-runtime";
    });
  }

  function fitDeckTextContent(doc, stage) {
    const slides = [...stage.children].filter((node) => node.matches?.(".slide,[data-html-deck-editor-page]"));
    slides.forEach((slide) => {
      const previous = {
        display: slide.style.getPropertyValue("display"),
        visibility: slide.style.getPropertyValue("visibility"),
        position: slide.style.getPropertyValue("position"),
      };
      slide.style.setProperty("display", "block", "important");
      slide.style.setProperty("visibility", "hidden", "important");
      slide.style.setProperty("position", "absolute", "important");
      slide.querySelectorAll("h1,h2,h3,h4,h5,h6,p,li,blockquote,figcaption,caption,td,th,[data-editor-kind='text']").forEach((element) => {
        if (!element.textContent?.trim() || element.clientWidth < 1 || element.clientHeight < 1) return;
        const computed = doc.defaultView?.getComputedStyle(element);
        const explicitHeight = Boolean(element.style.height || element.style.maxHeight) ||
          /^(absolute|fixed)$/.test(computed?.position || "") ||
          element.hasAttribute("data-ppt-text-box");
        // Flow content grows with its copy. Shrinking an auto-height heading to
        // satisfy scrollWidth/scrollHeight turns healthy 50px titles into 14px
        // labels without solving a real geometry constraint.
        if (!explicitHeight) {
          element.dataset.contentFits = "true";
          return;
        }
        // Apply a small, local repair only to a fixed-height text box. This
        // keeps readable content inside the artboard without globally
        // shrinking the skill typography or issuing another AI request.
        const isHeading = element.matches("h1,h2,h3,h4,h5,h6,.slide-title,.cover-title");
        const floor = isHeading ? 40 : 18;
        let size = Number.parseFloat(computed?.fontSize || "0");
        let fits = element.scrollHeight <= element.clientHeight + 1 && element.scrollWidth <= element.clientWidth + 1;
        let attempts = 0;
        while (!fits && Number.isFinite(size) && size > floor && attempts < 6) {
          size = Math.max(floor, size - 1.5);
          element.style.setProperty("font-size", `${size}px`, "important");
          element.style.setProperty("overflow-wrap", "anywhere", "important");
          element.style.setProperty("word-break", "break-word", "important");
          attempts += 1;
          fits = element.scrollHeight <= element.clientHeight + 1 && element.scrollWidth <= element.clientWidth + 1;
        }
        element.dataset.contentFits = String(fits);
        if (attempts) element.dataset.geometryRepair = "bounded-text-fit";
        if (!fits) element.dataset.geometryWarning = "text-overflow";
      });
      Object.entries(previous).forEach(([name, value]) => value ? slide.style.setProperty(name, value) : slide.style.removeProperty(name));
    });
    const warnings = [...stage.querySelectorAll('[data-content-fits="false"],[data-geometry-warning]')]
      .map((element) => element.dataset.elementId || element.tagName.toLowerCase());
    stage.dataset.geometryGate = warnings.length ? "warn" : "pass";
    stage.dataset.geometryWarnings = warnings.slice(0, 20).join(",");
  }

  function canonicalDeckStyle(width, height, preserveCanvasSize = false) {
    const aspectRatio = preserveCanvasSize ? `${width}/${height}` : "16/9";
    return `
      html,body{margin:0!important;width:100%;height:100%!important;min-height:100%;overflow:hidden}
      body{min-height:100vh!important;padding:0!important;background:#eef2f7!important}
      body:not(.editing):not(.scroll-mode){display:grid!important;place-items:center!important}
      #deckStage[data-ppt-normalized-stage="1"]{position:relative;width:${width}px!important;height:${height}px!important;aspect-ratio:${aspectRatio};max-width:none;max-height:none;margin:0 auto;overflow:hidden;box-sizing:border-box;transform:none}
      #deckStage[data-ppt-normalized-stage="1"]>.slide{position:absolute!important;inset:0!important;width:100%!important;height:100%!important;box-sizing:border-box!important;overflow:hidden;display:none;visibility:hidden;opacity:0;pointer-events:none}
      #deckStage[data-ppt-normalized-stage="1"]>.slide.active,
      #deckStage[data-ppt-normalized-stage="1"]>.slide.visible,
      #deckStage[data-ppt-normalized-stage="1"]>.slide[data-deck-active],
      #deckStage[data-ppt-normalized-stage="1"]>.slide[data-html-deck-editor-current]{display:block!important;visibility:visible!important;opacity:1!important;pointer-events:auto}
      /* The editor marks every page with data-html-deck-editor-page. Showing
         that marker unconditionally made every slide participate in the same
         1280x720 canvas, so content from later pages looked like overflow.
         The current-page selector above is the only visibility authority. */
      body.editing #deckStage[data-ppt-normalized-stage="1"],
      body.editing #deckStage[data-ppt-normalized-stage="1"]>.slide[data-html-deck-editor-current]{overflow:hidden!important}
      body.editing #deckStage[data-ppt-normalized-stage="1"]>.slide[data-html-deck-editor-current] > *{max-width:100%}
      #deckStage[data-ppt-normalized-stage="1"] [data-decoration="true"],
      #deckStage[data-ppt-normalized-stage="1"] .ppt-auto-decoration{pointer-events:none!important;z-index:0!important}
      #deckStage[data-ppt-normalized-stage="1"] [data-content-layer="true"]{position:relative!important;z-index:10!important}
      #deckStage[data-ppt-normalized-stage="1"]>.slide.ai-repaired-slide{width:${width}px!important;height:${height}px!important;box-sizing:border-box!important;overflow:hidden!important;padding:56px 72px!important}
      #deckStage[data-ppt-normalized-stage="1"]>.slide > *{box-sizing:border-box;max-width:100%}
      #deckStage[data-ppt-normalized-stage="1"]>.slide img,
      #deckStage[data-ppt-normalized-stage="1"]>.slide video,
      #deckStage[data-ppt-normalized-stage="1"]>.slide canvas,
      #deckStage[data-ppt-normalized-stage="1"]>.slide svg,
      #deckStage[data-ppt-normalized-stage="1"]>.slide figure{max-width:100%;max-height:100%;box-sizing:border-box}
      #deckStage[data-ppt-normalized-stage="1"]>.slide img,
      #deckStage[data-ppt-normalized-stage="1"]>.slide video,
      #deckStage[data-ppt-normalized-stage="1"]>.slide canvas{object-fit:contain}
      [data-ppt-normalized-hidden]{display:none!important}
      @media print{
        html,body{overflow:visible!important;background:#fff!important}
        #deckStage[data-ppt-normalized-stage="1"]{display:block!important;width:${width}px!important;height:auto!important;margin:0!important;overflow:visible!important}
        #deckStage[data-ppt-normalized-stage="1"]>.slide{position:relative!important;display:block!important;visibility:visible!important;opacity:1!important;page-break-after:always}
      }
    `;
  }

  function normalizeFrameDocument(doc, options = {}) {
    if (!doc?.body || !doc?.head) return null;
    upgradeRuntimeStyles(doc);
    const existingStage = doc.querySelector("#deckStage[data-ppt-normalized-stage='1']");
    if (existingStage && doc.body.dataset.pptNormalizedDeck === "1") {
      // Canonical HTML is already normalized. Rebuilding the stage on every
      // preview/edit/history pass caused coordinate drift and lost editor
      // metadata, especially for AI decks.
      markEditableContent([...existingStage.children].filter((node) => node.matches?.(".slide,[data-html-deck-editor-page]")));
      if (isAiGeneratedDocument(doc)) {
        containGeneratedDecorations([...existingStage.children].filter((node) => node.matches?.(".slide,[data-html-deck-editor-page]")));
        repairAiOccludingLayers(doc, existingStage);
      }
      return existingStage;
    }
    const stageCandidate = findStageCandidate(doc);
    const sourceSlides = findDeckSlides(doc, stageCandidate);
    if (!sourceSlides.length) return findStageCandidate(doc);

    const detectedSize = detectDeckSize(doc, stageCandidate, sourceSlides);
    const size = options.preserveCanvasSize ? detectedSize : normalizeSixteenNineSize(detectedSize);
    removeLegacySlideScripts(doc);
    removeLegacyNavigation(doc);

    const stage = doc.createElement("div");
    stage.id = "deckStage";
    stage.className = "deck-stage";
    if (stageCandidate?.classList?.contains("presentation-container")) stage.classList.add("presentation-container");
    stage.setAttribute("role", "region");
    stage.setAttribute("aria-label", "Presentation");
    stage.setAttribute("width", String(size.width));
    stage.setAttribute("height", String(size.height));
    stage.setAttribute("data-ppt-aspect", options.preserveCanvasSize ? `${size.width}:${size.height}` : "16:9");
    stage.setAttribute("data-html-deck-editor-stage", "preserve");
    stage.setAttribute("data-ppt-normalized-stage", "1");

    sourceSlides.forEach((slide, index) => {
      const normalized = normalizeSlideElement(doc, slide, index);
      stage.appendChild(normalized);
    });
    markEditableContent([...stage.children]);
    if (isAiGeneratedDocument(doc)) {
      containGeneratedDecorations([...stage.children]);
      repairAiOccludingLayers(doc, stage);
    }

    const notes = doc.getElementById("speaker-notes");
    doc.body.innerHTML = "";
    doc.body.dataset.pptNormalizedDeck = "1";
    doc.body.appendChild(stage);
    if (notes) doc.body.appendChild(notes);

    let style = doc.getElementById("ppt-deck-format-normalizer");
    if (!style) {
      style = doc.createElement("style");
      style.id = "ppt-deck-format-normalizer";
      doc.head.appendChild(style);
    }
    style.textContent = canonicalDeckStyle(size.width, size.height, options.preserveCanvasSize === true);
    stage.dataset.geometryGate = "pending";

    const meta = doc.querySelector('meta[name="viewport"]') || doc.createElement("meta");
    meta.setAttribute("name", "viewport");
    meta.setAttribute("content", "width=device-width, initial-scale=1.0");
    if (!meta.parentNode) doc.head.prepend(meta);
    return stage;
  }

  function normalizeHtml(html) {
    const source = String(html || "");
    if (!source.trim() || !/<html|<body|<section|class\s*=\s*["'][^"']*slide/i.test(source)) return source;
    try {
      const doc = new DOMParser().parseFromString(source, "text/html");
      normalizeFrameDocument(doc);
      return `<!doctype html>\n${doc.documentElement.outerHTML}`;
    } catch (error) {
      console.warn("Could not normalize deck HTML.", error);
      return source;
    }
  }

  function safeScriptUrl(name) {
    return `${RUNTIME_BASE}${encodeURIComponent(name).replace(/%2F/gi, "/")}?v=${RUNTIME_VERSION}`;
  }

  function upgradeRuntimeStyles(doc) {
    if (!doc?.documentElement || doc.documentElement.dataset.pptRuntimeUpgraded === RUNTIME_VERSION) return;
    RUNTIME_STYLES.forEach((name) => {
      doc.querySelectorAll(`link[data-ppt-anchor-runtime="${name}"],link[href*="/static/anchor-deck/${name}"]`).forEach((link) => link.remove());
      loadStyle(doc, name);
    });
    doc.documentElement.dataset.pptRuntimeUpgraded = RUNTIME_VERSION;
  }

  function loadStyle(doc, name) {
    const href = safeScriptUrl(name);
    if (doc.querySelector(`link[data-ppt-anchor-runtime="${name}"]`)) return;
    const link = doc.createElement("link");
    link.rel = "stylesheet";
    link.href = href;
    link.dataset.pptAnchorRuntime = name;
    doc.head.appendChild(link);
  }

  function loadScript(doc, name) {
    const existing = doc.querySelector(`script[data-ppt-anchor-runtime="${name}"]`);
    if (existing?.dataset.loaded === "1") return Promise.resolve();
    if (existing?.dataset.loading === "1") {
      return new Promise((resolve, reject) => {
        existing.addEventListener("load", () => resolve(), { once: true });
        existing.addEventListener("error", () => reject(new Error(`Could not load ${name}`)), { once: true });
      });
    }
    return new Promise((resolve, reject) => {
      const script = doc.createElement("script");
      script.src = safeScriptUrl(name);
      script.dataset.pptAnchorRuntime = name;
      script.dataset.loading = "1";
      script.onload = () => {
        script.dataset.loaded = "1";
        script.dataset.loading = "0";
        resolve();
      };
      script.onerror = () => reject(new Error(`Could not load ${name}`));
      doc.body.appendChild(script);
    });
  }

  function waitForFrameDocument(iframe) {
    return new Promise((resolve, reject) => {
      const startedAt = Date.now();
      const tick = () => {
        let doc = null;
        try {
          doc = iframe?.contentDocument || null;
        } catch {
          reject(new Error("Preview frame is not accessible."));
          return;
        }
        if (doc?.body && doc?.head) {
          resolve(doc);
          return;
        }
        if (Date.now() - startedAt > 8000) {
          reject(new Error("Preview frame did not become ready."));
          return;
        }
        setTimeout(tick, 80);
      };
      tick();
    });
  }

  function directSlides(doc) {
    const all = [...doc.querySelectorAll(SLIDE_SELECTOR)].filter((node) => !isEditorOrChromeNode(node));
    return uniqueTopLevelSlides(all);
  }

  function ensureStage(doc, options = {}) {
    const normalizedStage = normalizeFrameDocument(doc, options);
    if (normalizedStage) return normalizedStage;
    let stage = doc.querySelector(STAGE_SELECTOR);
    const slides = directSlides(doc);
    if (!stage) {
      stage = doc.createElement("div");
      stage.id = "deckStage";
      stage.className = "deck-stage";
      stage.setAttribute("data-html-deck-editor-stage", "preserve");
      stage.setAttribute("aria-label", "Presentation");
      const firstSlide = slides[0];
      if (firstSlide?.parentNode) firstSlide.parentNode.insertBefore(stage, firstSlide);
      else doc.body.appendChild(stage);
      slides.forEach((slide) => stage.appendChild(slide));
    } else {
      if (!stage.id) stage.id = "deckStage";
      if (!stage.classList.contains("deck-stage") && stage.tagName.toLowerCase() !== "deck-stage") stage.classList.add("deck-stage");
      stage.setAttribute("data-html-deck-editor-stage", stage.getAttribute("data-html-deck-editor-stage") || "preserve");
      if (!stage.getAttribute("aria-label")) stage.setAttribute("aria-label", "Presentation");
      const outsideSlides = slides.filter((slide) => !stage.contains(slide));
      outsideSlides.forEach((slide) => stage.appendChild(slide));
    }

    const stageSlides = [...stage.children].filter((node) => node.matches?.(SLIDE_SELECTOR) || node.matches?.("section,article,div"));
    stageSlides.forEach((slide, index) => {
      slide.classList.add("slide");
      slide.setAttribute("data-html-deck-editor-page", "");
      if (!slide.dataset.title) {
        const title = textOf(slide.querySelector("h1,h2,h3,.slide-title,.title")) || `Slide ${index + 1}`;
        slide.dataset.title = title.slice(0, 100);
      }
      if (!slide.dataset.slidePage) slide.dataset.slidePage = String(index + 1);
      if (index === 0 && !stageSlides.some((item) => item.classList.contains("active") || item.hasAttribute("data-deck-active"))) {
        slide.classList.add("active", "visible");
      }
    });
    markEditableContent(stageSlides);
    if (isAiGeneratedDocument(doc)) {
      containGeneratedDecorations(stageSlides);
      repairAiOccludingLayers(doc, stage);
    }
    if (!stage.getAttribute("width")) stage.setAttribute("width", String(DEFAULT_WIDTH));
    if (!stage.getAttribute("height")) stage.setAttribute("height", String(DEFAULT_HEIGHT));
    const stageWidth = Number.parseFloat(stage.getAttribute("width") || "") || DEFAULT_WIDTH;
    const stageHeight = Number.parseFloat(stage.getAttribute("height") || "") || DEFAULT_HEIGHT;
    stage.setAttribute("data-ppt-aspect", options.preserveCanvasSize ? `${stageWidth}:${stageHeight}` : "16:9");
    return stage;
  }

  function hideLegacyEditorChrome(doc) {
    if (doc.getElementById("ppt-anchor-legacy-editor-guard")) return;
    const style = doc.createElement("style");
    style.id = "ppt-anchor-legacy-editor-guard";
    style.textContent = `
      body.editor-on > .editor-toolbar,
      body.editor-on .ppt-ve-sidebar,
      body.editor-on .ppt-ve-inspector,
      body.editor-on .ppt-ve-ruler-top,
      body.editor-on .ppt-ve-ruler-left,
      body.editor-on .image-drag-handle,
      body.editor-on .image-resize-handle,
      body.editor-on .ppt-platform-selected,
      body.editor-on .ppt-ext-handle,
      body.editor-on .ppt-ext-move-handle {
        display: none !important;
      }
    `;
    doc.head.appendChild(style);
  }

  function cleanPlatformArtifacts(doc) {
    if (!doc?.querySelectorAll) return;
    doc.querySelectorAll(".ppt-platform-selected,.selected-image,.ppt-selected-element").forEach((node) => {
      node.classList.remove("ppt-platform-selected", "selected-image", "ppt-selected-element");
    });
    doc.querySelectorAll(".ppt-ext-handle,.ppt-ext-move-handle,.image-drag-handle,.image-resize-handle").forEach((node) => node.remove());
    doc.querySelectorAll("#ppt-external-workbench-style,#ppt-platform-editor-style").forEach((node) => node.remove());
  }

  function makeScrollHtmlFromPaged(html) {
    const source = String(html || "");
    if (!source.trim()) return source;
    try {
      const doc = new DOMParser().parseFromString(source, "text/html");
      doc.querySelectorAll("#ppt-paged-player-style,#ppt-paged-player-script,.ppt-paged-player-nav").forEach((node) => node.remove());
      doc.body.classList.remove("editing", "editor-on");
      doc.body.classList.add("scroll-mode");
      const style = doc.createElement("style");
      style.id = "ppt-anchor-scroll-export-style";
      style.textContent = `
        body.scroll-mode{overflow:auto!important;background:#f6f8fb!important}
        body.scroll-mode deck-stage,body.scroll-mode #deckStage,body.scroll-mode .deck-stage{position:static!important;display:block!important;width:100%!important;height:auto!important;transform:none!important;background:transparent!important}
        body.scroll-mode .slide,body.scroll-mode section[data-slide-page],body.scroll-mode [data-slide-page]{position:relative!important;display:block!important;visibility:visible!important;opacity:1!important;pointer-events:auto!important;margin:24px auto!important;transform:none!important}
        body.scroll-mode [data-html-deck-editor-ui],body.scroll-mode .ppt-runtime-nav,body.scroll-mode .nav{display:none!important}
      `;
      doc.head.appendChild(style);
      return `<!doctype html>\n${doc.documentElement.outerHTML}`;
    } catch {
      return source;
    }
  }

  function pagedPlayerStyle() {
    return `
      html,body{margin:0!important;width:100%;min-height:100%;overflow:hidden}
      body:not(.scroll-mode){background:#eef2f7!important}
      /* This is deliberately appended after generated template CSS. Some
         templates ship responsive .slide/stage transforms which are useful in
         their original document but make a fixed deck drift left after a
         refresh. Keep the authored slide internals intact and stabilize only
         the outer 16:9 viewport. */
      body:not(.scroll-mode){display:grid!important;place-items:center!important;padding:0!important}
      body:not(.scroll-mode) #deckStage,
      body:not(.scroll-mode) .deck-stage,
      body:not(.scroll-mode) deck-stage{position:relative!important;width:1280px!important;height:720px!important;min-width:1280px!important;min-height:720px!important;max-width:none!important;max-height:none!important;margin:0!important;left:auto!important;right:auto!important;top:auto!important;bottom:auto!important;transform:none!important;transform-origin:center center!important;overflow:hidden!important;box-sizing:border-box!important;flex:none!important}
      body:not(.scroll-mode) #deckStage>.slide,
      body:not(.scroll-mode) .deck-stage>.slide,
      body:not(.scroll-mode) deck-stage>.slide,
      body:not(.scroll-mode) .ppt-runtime-slide{display:none;visibility:hidden;opacity:0;pointer-events:none}
      body:not(.scroll-mode) #deckStage>.slide.active,
      body:not(.scroll-mode) #deckStage>.slide.visible,
      body:not(.scroll-mode) #deckStage>.slide[data-deck-active],
      body:not(.scroll-mode) .deck-stage>.slide.active,
      body:not(.scroll-mode) .deck-stage>.slide.visible,
      body:not(.scroll-mode) .deck-stage>.slide[data-deck-active],
      body:not(.scroll-mode) deck-stage>.slide.active,
      body:not(.scroll-mode) deck-stage>.slide.visible,
      body:not(.scroll-mode) deck-stage>.slide[data-deck-active],
      body:not(.scroll-mode) .ppt-runtime-slide.active,
      body:not(.scroll-mode) .ppt-runtime-slide.visible,
      body:not(.scroll-mode) .ppt-runtime-slide[data-deck-active]{display:block!important;visibility:visible!important;opacity:1!important;pointer-events:auto!important}
      .ppt-paged-player-nav{position:fixed;z-index:2147483000;left:50%;bottom:18px;transform:translateX(-50%);display:flex;align-items:center;gap:10px;padding:8px 10px;border:1px solid rgba(15,23,42,.12);border-radius:999px;background:rgba(255,255,255,.92);box-shadow:0 14px 34px rgba(15,23,42,.18);font:700 13px/1.2 Arial,sans-serif;color:#172033;backdrop-filter:blur(10px)}
      .ppt-paged-player-nav button{appearance:none;border:0;border-radius:999px;background:#111827;color:#fff;min-width:74px;height:34px;padding:0 14px;font:800 13px/1 Arial,sans-serif;cursor:pointer}
      .ppt-paged-player-nav button:disabled{opacity:.38;cursor:default}
      .ppt-paged-player-counter{min-width:72px;text-align:center;color:#475569}
      @media print{html,body{overflow:visible!important;background:#fff!important}.ppt-paged-player-nav{display:none!important}#deckStage,.deck-stage,deck-stage{display:block!important;width:auto!important;height:auto!important;overflow:visible!important}.slide,[data-slide-page]{position:relative!important;display:block!important;visibility:visible!important;opacity:1!important;page-break-after:always!important}}
    `;
  }

  function pagedPlayerScript() {
    return `(() => {
  if (window.__pptPagedPlayerInstalled) return;
  window.__pptPagedPlayerInstalled = true;
  const selector = "#deckStage > .slide, .deck-stage > .slide, deck-stage > .slide, .slide, section[data-slide-page], [data-slide-page]";
  const ignored = ".editor-toolbar,.ppt-runtime-nav,.ppt-paged-player-nav,.ppt-ve-sidebar,.ppt-ve-inspector,[data-html-deck-editor-ui]";
  let slides = [];
  let current = 0;
  const uniqueTopLevel = (items) => items.filter((node, index) => !items.some((candidate, other) => other !== index && candidate.contains(node)));
  function collectSlides() {
    slides = uniqueTopLevel([...document.querySelectorAll(selector)].filter((node) => !node.closest(ignored)));
    slides.forEach((slide, index) => {
      slide.classList.add("ppt-runtime-slide", "slide");
      if (!slide.dataset.slidePage) slide.dataset.slidePage = String(index + 1);
      slide.removeAttribute("hidden");
    });
    return slides;
  }
  function counter() {
    const node = document.querySelector(".ppt-paged-player-counter");
    if (node) node.textContent = slides.length ? String(current + 1) + " / " + String(slides.length) : "0 / 0";
    const prev = document.querySelector("[data-ppt-player-prev]");
    const next = document.querySelector("[data-ppt-player-next]");
    if (prev) prev.disabled = current <= 0;
    if (next) next.disabled = current >= slides.length - 1;
  }
  function showSlide(index) {
    collectSlides();
    if (!slides.length) return 0;
    current = Math.max(0, Math.min(Number(index) || 0, slides.length - 1));
    slides.forEach((slide, slideIndex) => {
      const active = slideIndex === current;
      slide.classList.toggle("active", active);
      slide.classList.toggle("visible", active);
      slide.classList.toggle("ppt-active-slide", active);
      slide.toggleAttribute("data-deck-active", active);
      slide.setAttribute("aria-hidden", active ? "false" : "true");
      if (!document.body.classList.contains("scroll-mode")) {
        slide.style.setProperty("display", active ? "block" : "none", "important");
        slide.style.setProperty("visibility", active ? "visible" : "hidden", "important");
        slide.style.setProperty("opacity", active ? "1" : "0", "important");
        slide.style.setProperty("pointer-events", active ? "auto" : "none", "important");
      }
    });
    counter();
    return current;
  }
  function nextSlide() { return showSlide(current + 1); }
  function prevSlide() { return showSlide(current - 1); }
  function ensureNav() {
    if (document.querySelector(".ppt-paged-player-nav")) return;
    const nav = document.createElement("nav");
    nav.className = "ppt-paged-player-nav";
    nav.setAttribute("aria-label", "Slide navigation");
    nav.innerHTML = '<button type="button" data-ppt-player-prev>Prev</button><span class="ppt-paged-player-counter">1 / 1</span><button type="button" data-ppt-player-next>Next</button>';
    nav.querySelector("[data-ppt-player-prev]").addEventListener("click", (event) => { event.preventDefault(); prevSlide(); });
    nav.querySelector("[data-ppt-player-next]").addEventListener("click", (event) => { event.preventDefault(); nextSlide(); });
    document.body.appendChild(nav);
  }
  window.showSlide = showSlide;
  window.nextSlide = nextSlide;
  window.prevSlide = prevSlide;
  document.addEventListener("keydown", (event) => {
    const tag = event.target?.tagName?.toLowerCase();
    if (event.target?.isContentEditable || tag === "input" || tag === "textarea" || tag === "select") return;
    if (["ArrowRight", "PageDown", " "].includes(event.key)) { event.preventDefault(); nextSlide(); }
    if (["ArrowLeft", "PageUp", "Backspace"].includes(event.key)) { event.preventDefault(); prevSlide(); }
    if (event.key === "Home") { event.preventDefault(); showSlide(0); }
    if (event.key === "End") { event.preventDefault(); showSlide(slides.length - 1); }
  });
  ensureNav();
  collectSlides();
  const initial = slides.findIndex((slide) => slide.classList.contains("active") || slide.hasAttribute("data-deck-active"));
  showSlide(initial >= 0 ? initial : 0);
})();`;
  }

  function makePagedHtmlPlayable(html) {
    const source = String(html || "");
    if (!source.trim()) return source;
    try {
      const doc = new DOMParser().parseFromString(source, "text/html");
      if (!doc?.body || !doc?.head) return source;
      normalizeFrameDocument(doc);
      cleanPlatformArtifacts(doc);
      doc.querySelectorAll("#ppt-paged-player-style,#ppt-paged-player-script,.ppt-paged-player-nav").forEach((node) => node.remove());
      doc.body.classList.remove("editing", "editor-on", "scroll-mode");
      const stage = findStageCandidate(doc);
      const slides = findDeckSlides(doc, stage);
      slides.forEach((slide, index) => {
        slide.classList.add("slide", "ppt-runtime-slide");
        slide.classList.toggle("active", index === 0);
        slide.classList.toggle("visible", index === 0);
        slide.toggleAttribute("data-deck-active", index === 0);
        slide.removeAttribute("data-html-deck-editor-current");
        slide.removeAttribute("hidden");
        slide.setAttribute("aria-hidden", index === 0 ? "false" : "true");
        slide.style.removeProperty("display");
        slide.style.removeProperty("visibility");
        slide.style.removeProperty("opacity");
        slide.style.removeProperty("pointer-events");
      });
      if (!slides.length) return source;
      const style = doc.createElement("style");
      style.id = "ppt-paged-player-style";
      style.textContent = pagedPlayerStyle();
      doc.head.appendChild(style);
      const script = doc.createElement("script");
      script.id = "ppt-paged-player-script";
      script.textContent = pagedPlayerScript();
      doc.body.appendChild(script);
      return `<!doctype html>\n${doc.documentElement.outerHTML}`;
    } catch (error) {
      console.warn("Could not create playable paged HTML.", error);
      return source;
    }
  }

  function makePreviewHtml(html) {
    const source = makePagedHtmlPlayable(html);
    if (!source.trim()) return source;
    try {
      const doc = new DOMParser().parseFromString(source, "text/html");
      if (!doc?.body || !doc?.head) return source;
      doc.body.classList.remove("editing", "editor-on", "scroll-mode");
      doc.documentElement.scrollTop = 0;
      doc.body.scrollTop = 0;
      let style = doc.getElementById("ppt-stable-preview-style");
      if (!style) {
        style = doc.createElement("style");
        style.id = "ppt-stable-preview-style";
        doc.head.appendChild(style);
      }
      style.textContent = `
        html,body{margin:0!important;width:100%!important;height:100%!important;min-height:100%!important;overflow:hidden!important}
        body:not(.scroll-mode){display:grid!important;place-items:center!important;padding:0!important}
        body:not(.scroll-mode) #deckStage,
        body:not(.scroll-mode) .deck-stage,
        body:not(.scroll-mode) deck-stage{margin:0!important;transform:none!important}
        body:not(.scroll-mode) .ppt-paged-player-nav{bottom:10px!important}
      `;
      const resetScript = doc.createElement("script");
      resetScript.id = "ppt-stable-preview-reset";
      resetScript.textContent = "window.addEventListener('load',()=>{try{window.scrollTo(0,0);document.documentElement.scrollTop=0;document.body.scrollTop=0;window.showSlide&&window.showSlide(0)}catch{}});";
      doc.body.appendChild(resetScript);
      return `<!doctype html>\n${doc.documentElement.outerHTML}`;
    } catch (error) {
      console.warn("Could not create stable preview HTML.", error);
      return source;
    }
  }

  // Single source of truth for any standalone/new-window preview.  The editor
  // iframe already uses makePreviewHtml(); keeping the exact same wrapper here
  // prevents the historical left-offset caused by opening raw paged HTML.
  function buildStandalonePreviewHtml(html) {
    const source = makePreviewHtml(html);
    if (!source.trim()) return source;
    try {
      const doc = new DOMParser().parseFromString(source, "text/html");
      if (!doc?.body || !doc?.head) return source;
      let style = doc.getElementById("ppt-standalone-preview-style");
      if (!style) {
        style = doc.createElement("style");
        style.id = "ppt-standalone-preview-style";
        doc.head.appendChild(style);
      }
      style.textContent = `${style.textContent || ""}\n
        html,body{margin:0!important;width:100vw!important;height:100vh!important;min-width:0!important;min-height:0!important;overflow:hidden!important}
        body:not(.scroll-mode){display:flex!important;align-items:center!important;justify-content:center!important;padding:0!important;position:relative!important}
        body:not(.scroll-mode) #deckStage,body:not(.scroll-mode) .deck-stage,body:not(.scroll-mode) deck-stage{flex:0 0 auto!important;margin:0!important;left:auto!important;right:auto!important;top:auto!important;bottom:auto!important;transform-origin:center center!important}
        body:not(.scroll-mode) .ppt-paged-player-nav{position:fixed!important;left:50%!important;right:auto!important;bottom:14px!important;transform:translateX(-50%)!important}
      `;
      const script = doc.createElement("script");
      script.id = "ppt-standalone-preview-script";
      script.textContent = `(() => {
        const fit = () => {
          const stage = document.querySelector("#deckStage,.deck-stage,deck-stage");
          if (!stage || document.body.classList.contains("scroll-mode")) return;
          const width = Number.parseFloat(stage.getAttribute("width")) || 1280;
          const height = Number.parseFloat(stage.getAttribute("height")) || 720;
          const scale = Math.min((window.innerWidth - 24) / width, (window.innerHeight - 78) / height, 1);
          stage.style.setProperty("--ppt-standalone-scale", String(Math.max(0.1, scale)));
          stage.style.transform = \`scale(\${Math.max(0.1, scale)})\`;
          stage.style.transformOrigin = "center center";
        };
        window.addEventListener("resize", fit, { passive: true });
        window.addEventListener("load", fit, { once: true });
        if (document.fonts?.ready) document.fonts.ready.then(fit).catch(() => {});
        fit();
      })();`;
      doc.body.appendChild(script);
      return `<!doctype html>\n${doc.documentElement.outerHTML}`;
    } catch {
      return source;
    }
  }

  function inspectDeckHtml(html, expectedSlides = 0) {
    const result = { ok: false, slideCount: 0, textLength: 0, slideDiagnostics: [], duplicateElementIds: [], fullCanvasTextBoxes: 0, reason: "" };
    const source = String(html || "");
    if (!source.trim()) {
      result.reason = "empty-html";
      return result;
    }
    try {
      const doc = new DOMParser().parseFromString(source, "text/html");
      const slides = findDeckSlides(doc, findStageCandidate(doc));
      result.slideCount = slides.length;
      result.textLength = textOf(doc.body).length;
      const elementIds = [...doc.querySelectorAll("[data-element-id]")].map((node) => node.getAttribute("data-element-id")).filter(Boolean);
      result.duplicateElementIds = [...new Set(elementIds.filter((id, index) => elementIds.indexOf(id) !== index))];
      result.fullCanvasTextBoxes = [...doc.querySelectorAll('[data-editor-kind="text"]')].filter((node) => {
        const left = Number.parseFloat(node.style.left || "0");
        const top = Number.parseFloat(node.style.top || "0");
        const width = Number.parseFloat(node.style.width || "0");
        const height = Number.parseFloat(node.style.height || "0");
        return left <= 1 && top <= 1 && width >= 1270 && height >= 710 && textOf(node).length > 0;
      }).length;
      result.slideDiagnostics = slides.map((slide, index) => {
        const text = textOf(slide);
        const images = slide.querySelectorAll("img,video,canvas,svg").length;
        const sourceElements = slide.querySelectorAll("[data-element-id]").length;
        const sourceEmpty = slide.hasAttribute("data-source-empty") || slide.dataset.sourceEmpty === "true";
        const sourceBacked = slide.hasAttribute("data-source-page");
        const deckPage = Number(slide.dataset.slidePage || index + 1) || index + 1;
        const sourcePage = Number(slide.dataset.sourcePage || deckPage) || deckPage;
        return {
          page: String(deckPage),
          deckPage,
          sourcePage,
          textLength: text.length,
          mediaCount: images,
          sourceElements,
          sourceEmpty,
          usable: sourceEmpty || text.length >= 12 || images > 0 || (sourceBacked && (text.length > 0 || sourceElements > 0)),
        };
      });
      if (!slides.length) result.reason = "no-slides";
      else if (expectedSlides && slides.length !== expectedSlides) result.reason = `slide-count-${slides.length}-expected-${expectedSlides}`;
      else if (result.slideDiagnostics.some((item, index) => item.sourcePage !== index + 1 || item.deckPage !== item.sourcePage)) result.reason = "slide-order-mismatch";
      else if (result.duplicateElementIds.length) result.reason = `duplicate-element-id-${result.duplicateElementIds[0]}`;
      else if (result.fullCanvasTextBoxes) result.reason = `full-canvas-text-boxes-${result.fullCanvasTextBoxes}`;
      else if (/Develop the supplied topic with one clear visual takeaway|Generated fallback SVG|image placeholder|visual placeholder/i.test(textOf(doc.body))) result.reason = "visible-placeholder-artifacts";
      else if (slides.length > 1 && !/showSlide|nextSlide|ppt-paged-player-script/i.test(source)) result.reason = "missing-navigation-runtime";
      else if (result.slideDiagnostics.some((item) => !item.usable)) result.reason = `empty-slide-${result.slideDiagnostics.find((item) => !item.usable)?.page || "unknown"}`;
      else if (result.textLength < Math.max(24, slides.length * 8)) result.reason = "too-little-visible-text";
      else {
        result.ok = true;
        result.reason = "ok";
      }
      return result;
    } catch (error) {
      result.reason = error.message || "parse-failed";
      return result;
    }
  }

  class AnchorDeckWorkbench {
    constructor(options = {}) {
      this.options = options;
      this.iframe = typeof options.iframe === "string" ? document.querySelector(options.iframe) : options.iframe;
      this.section = typeof options.section === "string" ? document.querySelector(options.section) : options.section;
      this.frameShell = this.iframe?.closest(".preview-frame");
      this.mode = "preview";
      this.installPromise = null;
      this.lastError = null;
      if (!this.iframe) return;
      INSTANCES.set(this.iframe, this);
      this.handleFrameLoad = () => this.install();
      this.iframe.addEventListener("load", this.handleFrameLoad);
      this.install();
    }

    setFrameEditing(active) {
      this.frameShell?.classList.toggle("deck-workbench-preview-editing", Boolean(active));
      this.frameShell?.toggleAttribute("data-deck-workbench-editing", Boolean(active));
      this.iframe?.toggleAttribute("data-deck-workbench-editing", Boolean(active));
      const doc = this.doc();
      if (doc?.body) {
        doc.body.toggleAttribute("data-ppt-workbench-contained-editor", Boolean(active));
        setDecorationInteraction(doc, Boolean(active));
      }
    }

    win() {
      return this.iframe?.contentWindow || null;
    }

    doc() {
      try {
        return this.iframe?.contentDocument || null;
      } catch {
        return null;
      }
    }

    async install() {
      if (!this.iframe) return null;
      this.installPromise = this.installRuntime().catch((error) => {
        this.lastError = error;
        console.error("Anchor Deck editor failed to install.", error);
        return null;
      });
      return this.installPromise;
    }

    async installRuntime() {
      const doc = await waitForFrameDocument(this.iframe);
      const win = this.win();
      if (!win) return null;
      this.bridgePendingHostApis(win);
      cleanPlatformArtifacts(doc);
      if (this.options.allowGenericElements && doc.body) {
        // Imported HTML is not required to use the generator's data-* schema.
        // Mark the document so the editor can opt into conservative generic
        // text/image discovery without changing generated deck behavior.
        doc.body.setAttribute("data-html-deck-editor-generic", "true");
      }
      upgradeRuntimeStyles(doc);
      const stage = ensureStage(doc, this.options);
      fitDeckTextContent(doc, stage);
      hideLegacyEditorChrome(doc);
      RUNTIME_STYLES.forEach((name) => loadStyle(doc, name));
      for (const name of RUNTIME_SCRIPTS) await loadScript(doc, name);
      if (isAiGeneratedDocument(doc)) {
        containOversizedGeneratedVisuals(doc, stage);
        repairAiOccludingLayers(doc, stage);
        repairAiEmptySlides(doc, stage);
        enforceMinimumTypography(doc, [...stage.children].filter((node) => node.matches?.(".slide,[data-html-deck-editor-page]")), { aiOnly: true });
        fitDeckTextContent(doc, stage);
      }
      setDecorationInteraction(doc, this.mode !== "preview");
      if (!win.HtmlDeckEditor?.mount) throw new Error("HtmlDeckEditor runtime is unavailable.");
      const editor = win.__pptAnchorDeckEditor || win.HtmlDeckEditor.mount();
      win.__pptAnchorDeckEditor = editor;
      this.editor = editor;
      this.bridgeHostApis(win, editor);
      this.syncScale();
      if (this.mode !== "preview") this.setMode(this.mode, false);
      return editor;
    }

    bridgePendingHostApis(win) {
      const workbench = this;
      win.toggleEdit = function toggleEdit(force) {
        const active = typeof force === "boolean" ? force : workbench.mode === "preview";
        workbench.mode = active ? "edit" : "preview";
        workbench.setFrameEditing(active);
        workbench.installPromise?.then((editor) => {
          if (editor && editor.isActive !== active) editor.toggleEditMode(active);
          workbench.syncScale();
        });
        return active;
      };
      win.exportEditedHtml = async function exportEditedHtml(mode = "paged") {
        const editor = await workbench.installPromise;
        if (!editor) throw new Error("Anchor Deck editor is still loading.");
        cleanPlatformArtifacts(win.document);
        const html = typeof editor.buildExportHtml === "function"
          ? editor.buildExportHtml()
          : `<!doctype html>\n${win.document.documentElement.outerHTML}`;
        return mode === "scroll" ? makeScrollHtmlFromPaged(html) : makePagedHtmlPlayable(html);
      };
    }

    bridgeHostApis(win, editor) {
      const workbench = this;
      win.toggleEdit = function toggleEdit(force) {
        const active = typeof force === "boolean" ? force : !editor.isActive;
        workbench.setFrameEditing(active);
        editor.toggleEditMode(active);
        workbench.mode = active ? "edit" : "preview";
        workbench.syncScale();
        return active;
      };
      win.exportEditedHtml = async function exportEditedHtml(mode = "paged") {
        cleanPlatformArtifacts(win.document);
        const html = typeof editor.buildExportHtml === "function"
          ? editor.buildExportHtml()
          : `<!doctype html>\n${win.document.documentElement.outerHTML}`;
        return mode === "scroll" ? makeScrollHtmlFromPaged(html) : makePagedHtmlPlayable(html);
      };
      win.getPptPatchContext = function getPptPatchContext(scope = "current_slide") {
        const selected = editor.selected || null;
        const slide = editor.activeSlide?.() || null;
        return {
          scope,
          currentSlideId: slide?.dataset?.title || slide?.dataset?.slidePage || "",
          currentSlideHtml: slide?.outerHTML || "",
          selectedId: selected?.dataset?.aiAnchor || selected?.dataset?.editorKind || "",
          selectedKind: selected?.dataset?.editorKind || "",
          selectedHtml: selected?.outerHTML || "",
        };
      };
      win.applyPptPatch = function applyPptPatch(patch = {}) {
        const operations = Array.isArray(patch.operations) ? patch.operations : [];
        const slides = [...win.document.querySelectorAll("#deckStage > .slide, [data-ppt-normalized-stage='1'] > .slide")];
        const currentSlide = editor.activeSlide?.() || slides[0] || null;
        const resolveTargets = (operation) => {
          if (operation.id) {
            const escaped = win.CSS?.escape ? win.CSS.escape(operation.id) : operation.id.replace(/["\\]/g, "\\$&");
            const exact = win.document.querySelector(`[data-element-id="${escaped}"],[data-ai-anchor="${escaped}"],[id="${escaped}"]`);
            if (exact) return [exact];
          }
          if (["selected", "selected_element"].includes(operation.target)) return editor.selected ? [editor.selected] : [];
          if (operation.target === "deck") return slides;
          if (operation.target === "title") return currentSlide ? [currentSlide.querySelector("h1,h2,h3,.slide-title,[data-title]")].filter(Boolean) : [];
          if (["largest_image", "all_images"].includes(operation.target)) {
            const images = [...(operation.target === "all_images" ? win.document : currentSlide || win.document).querySelectorAll("img,picture,video")];
            return operation.target === "all_images" ? images : images.sort((a, b) => b.getBoundingClientRect().width * b.getBoundingClientRect().height - a.getBoundingClientRect().width * a.getBoundingClientRect().height).slice(0, 1);
          }
          return currentSlide ? [currentSlide] : [];
        };
        let applied = 0;
        editor.pushUndoState?.();
        operations.forEach((operation) => {
          const targets = resolveTargets(operation);
          targets.forEach((target) => {
            if (!target) return;
            if (operation.type === "set_text") {
              target.textContent = operation.text ?? operation.value ?? target.textContent;
            } else if (["set_style", "replace_style", "resize_image", "move_image", "adjust_images"].includes(operation.type)) {
              Object.entries(operation.styles || {}).forEach(([name, value]) => target.style.setProperty(name.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`), value));
              ["width", "height", "left", "top", "maxWidth", "maxHeight"].forEach((name) => {
                if (operation[name] !== undefined) target.style[name] = operation[name];
              });
            } else if (operation.type === "fix_overflow") {
              target.querySelectorAll?.("h1,h2,h3,h4,h5,h6,p,li,[data-editor-kind='text']").forEach((textNode) => {
                let size = Number.parseFloat(win.getComputedStyle(textNode).fontSize || "20");
                const minimum = textNode.matches("h1,.cover-title") ? 40 : textNode.matches("h2,h3,.slide-title") ? 32 : 20;
                while ((textNode.scrollHeight > textNode.clientHeight + 1 || textNode.scrollWidth > textNode.clientWidth + 1) && size > minimum) {
                  size -= 1;
                  textNode.style.fontSize = `${size}px`;
                }
                const fits = textNode.scrollHeight <= textNode.clientHeight + 1 && textNode.scrollWidth <= textNode.clientWidth + 1;
                textNode.dataset.contentFits = String(fits);
                if (!fits) textNode.dataset.geometryWarning = "targeted-overflow-repair-needed";
              });
            }
            applied += 1;
          });
        });
        editor.refreshEditableElements?.();
        editor.updateInspector?.();
        editor.updateFrame?.();
        editor.saveDraft?.(false);
        return { applied, message: patch.summary || "Patch applied." };
      };
    }

    setMode(mode = "preview", syncOnly = false) {
      this.mode = mode;
      const shouldEdit = isEditingMode(mode);
      this.setFrameEditing(shouldEdit);
      const apply = (editor) => {
        if (!editor) return;
        if (!syncOnly && editor.isActive !== shouldEdit) editor.toggleEditMode(shouldEdit);
        this.syncScale();
      };
      if (this.editor) apply(this.editor);
      else this.installPromise?.then(apply);
    }

    setSide() {}

    renderPages() {}

    updateInspector() {}

    prepareExport() {
      const doc = this.doc();
      if (doc) cleanPlatformArtifacts(doc);
    }

    restoreAfterExport() {
      this.syncScale();
    }

    syncScale() {
      const doc = this.doc();
      const stage = doc?.querySelector(STAGE_SELECTOR);
      const width = Number.parseFloat(stage?.getAttribute?.("width") || stage?.style?.width || "") || DEFAULT_WIDTH;
      const height = Number.parseFloat(stage?.getAttribute?.("height") || stage?.style?.height || "") || DEFAULT_HEIGHT;
      if (isEditingMode(this.mode)) {
        this.setFrameEditing(true);
        this.frameShell?.style.setProperty("--deck-stage-width", `${Math.round(width)}px`);
        this.frameShell?.style.setProperty("--deck-stage-height", `${Math.round(height)}px`);
        const scale = fitSlideToViewport(this.section || this.frameShell, this.frameShell, width, height);
        this.frameShell?.style.setProperty("--preview-scale", String(scale));
        this.editor?.refreshEditorLayoutSoon?.();
        return scale;
      }
      this.setFrameEditing(false);
      fitSlideToViewport(this.section || this.frameShell, this.frameShell, width, height);
    }
  }

  window.PptDeckWorkbench = {
    computeSlideScale,
    fitSlideToViewport,
    normalizeHtml,
    makePagedHtmlPlayable,
    makePreviewHtml,
    buildStandalonePreviewHtml,
    makeScrollHtmlFromPaged,
    inspectDeckHtml,
    create(options) {
      return new AnchorDeckWorkbench(options);
    },
    get(iframe) {
      return INSTANCES.get(typeof iframe === "string" ? document.querySelector(iframe) : iframe);
    },
  };
})();
