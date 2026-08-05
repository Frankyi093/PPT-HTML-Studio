(function (root) {
  "use strict";

  const NS = Object.freeze({ A: "a", P: "p", R: "r" });
  const DEFAULT_SIZE = Object.freeze({ cx: 12192000, cy: 6858000 });
  const MIME = Object.freeze({ png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg", gif: "image/gif", svg: "image/svg+xml", webp: "image/webp" });
  const FALLBACK_COLORS = Object.freeze({
    dk1: "#000000", lt1: "#ffffff", dk2: "#44546a", lt2: "#e7e6e6",
    accent1: "#4472c4", accent2: "#ed7d31", accent3: "#a5a5a5",
    accent4: "#ffc000", accent5: "#5b9bd5", accent6: "#70ad47",
    hlink: "#0563c1", folHlink: "#954f72",
  });

  function clean(value) { return String(value == null ? "" : value).replace(/\uFEFF/g, ""); }
  function xmlDecode(value) {
    return clean(value).replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, "&");
  }
  function escapeHtml(value) {
    return clean(value).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }
  function attrText(source) {
    const attrs = Object.create(null);
    clean(source).replace(/([^\s=]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g, (_, key, d, s) => {
      attrs[key] = xmlDecode(d == null ? s : d);
      return "";
    });
    return attrs;
  }
  function parseXml(xml) {
    const documentNode = { name: "#document", attrs: {}, children: [], text: "", parent: null };
    const stack = [documentNode];
    const source = clean(xml).replace(/<!--[\s\S]*?-->/g, "").replace(/<\?[^>]*\?>/g, "");
    const token = /<([^>]+)>|([^<]+)/g;
    let match;
    while ((match = token.exec(source))) {
      if (match[2] != null) {
        const value = xmlDecode(match[2]);
        if (value) stack[stack.length - 1].text += value;
        continue;
      }
      let tag = match[1].trim();
      if (!tag || tag[0] === "!") continue;
      if (tag[0] === "/") { if (stack.length > 1) stack.pop(); continue; }
      const selfClosing = /\/$/.test(tag);
      if (selfClosing) tag = tag.slice(0, -1).trim();
      const space = tag.search(/\s/);
      const name = space < 0 ? tag : tag.slice(0, space);
      const node = { name, attrs: attrText(space < 0 ? "" : tag.slice(space + 1)), children: [], text: "", parent: stack[stack.length - 1] };
      stack[stack.length - 1].children.push(node);
      if (!selfClosing) stack.push(node);
    }
    return documentNode.children[0] || documentNode;
  }
  function localName(node) { return clean(node?.name).split(":").pop(); }
  function children(node, name) { return (node?.children || []).filter((item) => !name || localName(item) === name); }
  function child(node, name) { return children(node, name)[0] || null; }
  function descendants(node, name, output = []) {
    for (const item of node?.children || []) {
      if (!name || localName(item) === name) output.push(item);
      descendants(item, name, output);
    }
    return output;
  }
  function firstDesc(node, name) { return descendants(node, name, [])[0] || null; }
  function nodeText(node) { return clean(node?.text) + (node?.children || []).map(nodeText).join(""); }
  function number(value, fallback = 0) { const n = Number(value); return Number.isFinite(n) ? n : fallback; }
  function clamp(value, min, max) { return Math.max(min, Math.min(max, value)); }
  function pathDir(path) { return clean(path).replace(/\\/g, "/").replace(/\/[^/]*$/, ""); }
  function normalizePath(path) {
    const parts = [];
    clean(path).replace(/\\/g, "/").split("/").forEach((part) => {
      if (!part || part === ".") return;
      if (part === "..") parts.pop(); else parts.push(part);
    });
    return parts.join("/");
  }
  function resolvePath(baseFile, target) {
    if (!target) return "";
    return normalizePath(target[0] === "/" ? target.slice(1) : `${pathDir(baseFile)}/${target}`);
  }
  function relsPath(path) { return `${pathDir(path)}/_rels/${path.split("/").pop()}.rels`; }
  function parseRelationships(xml, ownerPath) {
    const map = Object.create(null);
    if (!xml) return map;
    for (const rel of descendants(parseXml(xml), "Relationship")) {
      if (rel.attrs.TargetMode === "External") continue;
      map[rel.attrs.Id] = { path: resolvePath(ownerPath, rel.attrs.Target), type: clean(rel.attrs.Type).split("/").pop() };
    }
    return map;
  }
  async function zipText(zip, path) { const entry = path && zip.file(path); return entry ? entry.async("string") : ""; }
  async function zipDataUrl(zip, path) {
    const entry = path && zip.file(path);
    if (!entry) return "";
    const ext = path.split(".").pop().toLowerCase();
    const data = await entry.async("base64");
    return `data:${MIME[ext] || "application/octet-stream"};base64,${data}`;
  }
  function attr(node, name, fallback = "") { return node?.attrs?.[name] ?? node?.attrs?.[`${NS.R}:${name}`] ?? fallback; }

  function hexColor(value) {
    const raw = clean(value).replace(/^#/, "");
    if (/^[0-9a-f]{6}$/i.test(raw)) return `#${raw.toLowerCase()}`;
    if (/^[0-9a-f]{8}$/i.test(raw)) return `#${raw.slice(2).toLowerCase()}`;
    return "";
  }
  function applyColorTransform(color, node) {
    if (!color || !node) return color;
    const rgb = color.slice(1).match(/../g).map((part) => parseInt(part, 16));
    const lumMod = number(child(node, "lumMod")?.attrs?.val, 100000) / 100000;
    const lumOff = number(child(node, "lumOff")?.attrs?.val, 0) / 100000;
    const tint = number(child(node, "tint")?.attrs?.val, 0) / 100000;
    const shade = number(child(node, "shade")?.attrs?.val, 100000) / 100000;
    const out = rgb.map((channel) => {
      let result = channel * lumMod + 255 * lumOff;
      if (tint) result += (255 - result) * tint;
      result *= shade;
      return clamp(Math.round(result), 0, 255).toString(16).padStart(2, "0");
    });
    return `#${out.join("")}`;
  }
  function colorFromNode(node, theme, colorMap = {}) {
    if (!node) return "";
    const srgb = child(node, "srgbClr") || (localName(node) === "srgbClr" ? node : null);
    const sys = child(node, "sysClr") || (localName(node) === "sysClr" ? node : null);
    const scheme = child(node, "schemeClr") || (localName(node) === "schemeClr" ? node : null);
    const preset = child(node, "prstClr") || (localName(node) === "prstClr" ? node : null);
    if (srgb) return applyColorTransform(hexColor(attr(srgb, "val")), srgb);
    if (sys) return applyColorTransform(hexColor(attr(sys, "lastClr")) || "#000000", sys);
    if (scheme) {
      const key = colorMap[attr(scheme, "val")] || attr(scheme, "val");
      return applyColorTransform(theme.colors[key] || FALLBACK_COLORS[key] || "#000000", scheme);
    }
    const presets = { black: "#000000", white: "#ffffff", red: "#ff0000", yellow: "#ffff00", blue: "#0000ff", green: "#008000", gray: "#808080" };
    return preset ? (presets[attr(preset, "val")] || "#000000") : "";
  }
  function parseTheme(rootNode) {
    const colors = { ...FALLBACK_COLORS };
    const clrScheme = firstDesc(rootNode, "clrScheme");
    for (const slot of clrScheme?.children || []) {
      const value = colorFromNode(slot, { colors }, {});
      if (value) colors[localName(slot)] = value;
    }
    const major = firstDesc(firstDesc(rootNode, "majorFont"), "latin")?.attrs?.typeface || "Arial";
    const minor = firstDesc(firstDesc(rootNode, "minorFont"), "latin")?.attrs?.typeface || major || "Arial";
    return { colors, majorFont: major, minorFont: minor };
  }
  function parseColorMap(rootNode) {
    const node = firstDesc(rootNode, "clrMap") || firstDesc(rootNode, "clrMapOvr");
    const defaults = { tx1: "dk1", tx2: "dk2", bg1: "lt1", bg2: "lt2", accent1: "accent1", accent2: "accent2", accent3: "accent3", accent4: "accent4", accent5: "accent5", accent6: "accent6", hlink: "hlink", folHlink: "folHlink" };
    return { ...defaults, ...(node?.attrs || {}) };
  }
  function parseFill(node, theme, colorMap) {
    if (!node) return "";
    const backgroundProperties = child(node, "bgPr");
    if (backgroundProperties) return parseFill(backgroundProperties, theme, colorMap);
    const noFill = child(node, "noFill") || (localName(node) === "noFill" ? node : null);
    if (noFill) return "transparent";
    const solid = child(node, "solidFill") || (localName(node) === "solidFill" ? node : null);
    if (solid) return colorFromNode(solid, theme, colorMap);
    const fillRef = child(node, "fillRef") || child(node, "bgRef") || (localName(node) === "fillRef" || localName(node) === "bgRef" ? node : null);
    if (fillRef) return colorFromNode(fillRef, theme, colorMap);
    const gradient = child(node, "gradFill") || (localName(node) === "gradFill" ? node : null);
    if (gradient) {
      const stops = descendants(gradient, "gs").map((stop) => ({ pos: number(attr(stop, "pos"), 0) / 1000, color: colorFromNode(stop, theme, colorMap) })).filter((item) => item.color);
      if (stops.length) return `linear-gradient(135deg, ${stops.map((item) => `${item.color} ${item.pos}%`).join(", ")})`;
    }
    return "";
  }
  function parseLine(spPr, style, theme, colorMap) {
    const line = child(spPr, "ln") || child(style, "lnRef");
    if (!line) return { color: "transparent", width: 0, dash: "solid" };
    const color = parseFill(line, theme, colorMap) || colorFromNode(line, theme, colorMap) || "transparent";
    const dashNode = child(line, "prstDash");
    const dash = /dash|dot/i.test(attr(dashNode, "val")) ? "dashed" : "solid";
    return { color, width: Math.max(0, number(attr(line, "w"), 12700) / 12700), dash };
  }
  function parseXfrm(container) {
    const xfrm = firstDesc(container, "xfrm");
    if (!xfrm) return null;
    const off = child(xfrm, "off");
    const ext = child(xfrm, "ext");
    if (!off || !ext) return null;
    return { x: number(attr(off, "x")), y: number(attr(off, "y")), cx: number(attr(ext, "cx")), cy: number(attr(ext, "cy")), rot: number(attr(xfrm, "rot")) / 60000, flipH: attr(xfrm, "flipH") === "1", flipV: attr(xfrm, "flipV") === "1" };
  }
  function placeholder(node) {
    const ph = firstDesc(child(node, "nvSpPr") || child(node, "nvPicPr") || child(node, "nvGraphicFramePr"), "ph");
    return ph ? { type: attr(ph, "type", "body"), idx: attr(ph, "idx", "0") } : null;
  }
  function placeholderKey(ph) { return ph ? `${ph.type || "body"}:${ph.idx || "0"}` : ""; }
  function shapeId(node, fallback) {
    const cNvPr = firstDesc(node, "cNvPr");
    return clean(attr(cNvPr, "id", fallback)).replace(/[^a-zA-Z0-9_-]/g, "-");
  }
  function parseRunProperties(node, theme, colorMap, fallback = {}) {
    if (!node) return { ...fallback };
    const fontSize = number(attr(node, "sz"), 0) / 100;
    const latin = child(node, "latin") || child(node, "ea") || child(node, "cs");
    let fontFamily = attr(latin, "typeface", fallback.fontFamily || theme.minorFont);
    if (fontFamily === "+mj-lt") fontFamily = theme.majorFont;
    if (fontFamily === "+mn-lt") fontFamily = theme.minorFont;
    const boldAttr = attr(node, "b", "");
    const italicAttr = attr(node, "i", "");
    const underlineAttr = attr(node, "u", "");
    return {
      ...fallback,
      fontFamily,
      fontSize: fontSize ? fontSize * (96 / 72) : (fallback.fontSize || 24),
      bold: boldAttr ? boldAttr === "1" : Boolean(fallback.bold),
      italic: italicAttr ? italicAttr === "1" : Boolean(fallback.italic),
      underline: underlineAttr ? underlineAttr !== "none" : Boolean(fallback.underline),
      color: parseFill(node, theme, colorMap) || colorFromNode(node, theme, colorMap) || fallback.color || theme.colors.dk1,
    };
  }
  function paragraphDefault(node, level, theme, colorMap, fallbackRun = {}) {
    const txBody = child(node, "txBody");
    const lstStyle = /Style$/.test(localName(node)) ? node : child(txBody, "lstStyle");
    const levelNode = child(lstStyle, `lvl${level + 1}pPr`) || child(lstStyle, "lvl1pPr");
    const defRPr = child(levelNode, "defRPr");
    return { pPr: levelNode, run: parseRunProperties(defRPr, theme, colorMap, fallbackRun) };
  }
  function parseParagraphs(node, inheritedNode, theme, colorMap, fallbackNode = null, textStyleNode = null) {
    const txBody = child(node, "txBody");
    if (!txBody) return [];
    const paragraphs = [];
    for (const p of children(txBody, "p")) {
      const pPr = child(p, "pPr");
      const level = clamp(number(attr(pPr, "lvl"), 0), 0, 8);
      const themeDefault = paragraphDefault(textStyleNode, level, theme, colorMap);
      const masterDefault = paragraphDefault(fallbackNode, level, theme, colorMap, themeDefault.run);
      const layoutDefault = paragraphDefault(inheritedNode || node, level, theme, colorMap, masterDefault.run);
      const inherited = {
        pPr: layoutDefault.pPr || masterDefault.pPr || themeDefault.pPr,
        run: layoutDefault.run,
      };
      const pPrLayers = [layoutDefault.pPr, masterDefault.pPr, themeDefault.pPr].filter(Boolean);
      const inheritedChild = (name) => pPrLayers.map((item) => child(item, name)).find(Boolean) || null;
      const inheritedAttr = (name, fallback = "") => {
        for (const item of pPrLayers) if (item.attrs?.[name] != null) return item.attrs[name];
        return fallback;
      };
      const paragraphRunDefault = parseRunProperties(child(pPr, "defRPr") || child(p, "endParaRPr"), theme, colorMap, inherited.run);
      const runs = [];
      for (const item of p.children || []) {
        const kind = localName(item);
        if (kind === "r" || kind === "fld") {
          const textNode = child(item, "t");
          const text = nodeText(textNode);
          if (text) runs.push({ text, style: parseRunProperties(child(item, "rPr"), theme, colorMap, paragraphRunDefault) });
        } else if (kind === "br") runs.push({ text: "\n", style: paragraphRunDefault });
      }
      if (!runs.length) {
        const raw = children(p, "t").map(nodeText).join("");
        if (raw) runs.push({ text: raw, style: paragraphRunDefault });
      }
      const bulletNode = child(pPr, "buChar") || inheritedChild("buChar");
      const bulletNone = child(pPr, "buNone");
      const alignRaw = attr(pPr, "algn", inheritedAttr("algn", "l"));
      const alignMap = { l: "left", ctr: "center", r: "right", just: "justify" };
      const marL = number(attr(pPr, "marL", inheritedAttr("marL", 0)));
      const indent = number(attr(pPr, "indent", inheritedAttr("indent", 0)));
      const spacingNode = child(pPr, "lnSpc") || inheritedChild("lnSpc");
      const spacingPct = number(firstDesc(spacingNode, "spcPct")?.attrs?.val, 100000) / 100000;
      paragraphs.push({ runs, level, align: alignMap[alignRaw] || "left", bullet: bulletNone ? "" : attr(bulletNode, "char", ""), marginLeft: marL / 12700, textIndent: indent / 12700, lineHeight: clamp(spacingPct || 1, 0.8, 2.2) });
    }
    return paragraphs;
  }
  function parseBodyProps(node, inheritedNode, fallbackNode = null) {
    const body = firstDesc(child(node, "txBody"), "bodyPr");
    const inherited = firstDesc(child(inheritedNode, "txBody"), "bodyPr");
    const fallback = firstDesc(child(fallbackNode, "txBody"), "bodyPr");
    const source = body || inherited || fallback;
    const anchorMap = { t: "flex-start", ctr: "center", b: "flex-end" };
    return {
      marginLeft: number(attr(source, "lIns", 91440)) / 12700,
      marginRight: number(attr(source, "rIns", 91440)) / 12700,
      marginTop: number(attr(source, "tIns", 45720)) / 12700,
      marginBottom: number(attr(source, "bIns", 45720)) / 12700,
      vertical: anchorMap[attr(source, "anchor", "t")] || "flex-start",
      wrap: attr(source, "wrap", "square") !== "none",
    };
  }
  function shapeType(node) {
    const tag = localName(node);
    if (tag === "pic") return "image";
    if (tag === "graphicFrame") return firstDesc(node, "tbl") ? "table" : "graphic";
    const geom = firstDesc(node, "prstGeom");
    return attr(geom, "prst", "rect");
  }
  function parseShape(node, inheritedNode, context, index, fallbackNode = null) {
    const spPr = child(node, "spPr") || node;
    const inheritedSpPr = child(inheritedNode, "spPr") || inheritedNode;
    const fallbackSpPr = child(fallbackNode, "spPr") || fallbackNode;
    const style = child(node, "style") || child(inheritedNode, "style") || child(fallbackNode, "style");
    const ph = placeholder(node);
    const transform = parseXfrm(spPr) || parseXfrm(node) || parseXfrm(inheritedSpPr) || parseXfrm(inheritedNode) || parseXfrm(fallbackSpPr) || parseXfrm(fallbackNode);
    const fill = parseFill(spPr, context.theme, context.colorMap) || parseFill(style, context.theme, context.colorMap) || parseFill(inheritedSpPr, context.theme, context.colorMap) || parseFill(fallbackSpPr, context.theme, context.colorMap) || "transparent";
    const line = parseLine(spPr, style, context.theme, context.colorMap);
    const styleKind = ["title", "ctrTitle"].includes(ph?.type) ? "titleStyle" : (["body", "obj", "subTitle"].includes(ph?.type) ? "bodyStyle" : "otherStyle");
    const textStyleNode = child(context.masterTextStyles, styleKind);
    const paragraphs = parseParagraphs(node, inheritedNode, context.theme, context.colorMap, fallbackNode, textStyleNode);
    const body = parseBodyProps(node, inheritedNode, fallbackNode);
    const type = shapeType(node);
    return {
      id: `s${context.page}-e${shapeId(node, index + 1)}-${index + 1}`,
      type, placeholder: ph, transform, fill, line, paragraphs, body,
      rotation: transform?.rot || 0, flipH: transform?.flipH || false, flipV: transform?.flipV || false,
      imageRelId: attr(firstDesc(node, "blip"), "embed"),
      crop: (() => { const src = firstDesc(node, "srcRect"); return src ? { l: number(attr(src, "l")) / 1000, t: number(attr(src, "t")) / 1000, r: number(attr(src, "r")) / 1000, b: number(attr(src, "b")) / 1000 } : null; })(),
      table: type === "table" ? parseTable(firstDesc(node, "tbl"), context) : null,
      name: attr(firstDesc(node, "cNvPr"), "name", ""),
    };
  }
  function parseTable(table, context) {
    if (!table) return null;
    const widths = children(child(table, "tblGrid"), "gridCol").map((col) => number(attr(col, "w")));
    const rows = children(table, "tr").map((row) => ({
      height: number(attr(row, "h")),
      cells: children(row, "tc").map((cell) => ({
        paragraphs: parseParagraphs(cell, null, context.theme, context.colorMap),
        fill: parseFill(child(cell, "tcPr"), context.theme, context.colorMap) || "transparent",
      })),
    }));
    return { widths, rows };
  }
  function shapeNodes(rootNode) {
    const tree = firstDesc(rootNode, "spTree");
    return (tree?.children || []).filter((node) => ["sp", "pic", "graphicFrame", "cxnSp"].includes(localName(node)));
  }
  function mapPlaceholders(nodes) {
    const map = Object.create(null);
    for (const node of nodes) { const ph = placeholder(node); if (ph) { map[placeholderKey(ph)] = node; if (!map[`${ph.type}:*`]) map[`${ph.type}:*`] = node; } }
    return map;
  }
  function resolvePlaceholderNode(node, layoutMap, masterMap) {
    const ph = placeholder(node);
    if (!ph) return null;
    return layoutMap[placeholderKey(ph)] || layoutMap[`${ph.type}:*`] || masterMap[placeholderKey(ph)] || masterMap[`${ph.type}:*`] || null;
  }
  function background(rootNode, theme, colorMap, fallback) {
    const bg = firstDesc(rootNode, "bg");
    if (!bg) return fallback;
    return parseFill(bg, theme, colorMap) || colorFromNode(bg, theme, colorMap) || fallback;
  }
  function transition(rootNode) {
    const trans = firstDesc(rootNode, "transition");
    if (!trans) return "none";
    const kind = (trans.children || []).map(localName).find((name) => name !== "sndAc") || "fade";
    return ["fade", "push", "wipe", "split", "cover", "uncover", "zoom"].includes(kind) ? kind : "fade";
  }
  function pctRect(transform, size) {
    if (!transform) return null;
    return { x: transform.x / size.cx * 1280, y: transform.y / size.cy * 720, w: transform.cx / size.cx * 1280, h: transform.cy / size.cy * 720 };
  }
  function cssColor(value, fallback = "transparent") { return /^#|^rgb|^hsl|^linear-gradient|^transparent/.test(clean(value)) ? value : fallback; }
  function colorLuminance(value) {
    const hex = hexColor(value);
    if (!hex) return 1;
    const channels = hex.slice(1).match(/../g).map((part) => {
      const raw = parseInt(part, 16) / 255;
      return raw <= 0.03928 ? raw / 12.92 : ((raw + 0.055) / 1.055) ** 2.4;
    });
    return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
  }
  function contrastText(background) { return colorLuminance(background) < 0.36 ? "#ffffff" : "#111827"; }
  function sourceThemeRole(color, deck) {
    const value = clean(color).toLowerCase();
    const entries = Object.entries(deck.theme.colors || {});
    return entries.find(([, themeColor]) => clean(themeColor).toLowerCase() === value)?.[0] || "";
  }
  function slideStyleContext(deck, slide, stylePack = null, patch = {}) {
    const preserve = !stylePack || stylePack.preserveSource || stylePack.id === "source";
    if (preserve) return { preserve: true, id: "source", layout: "source-preserving", background: slide.background || "#fff", text: "", primary: deck.theme.colors.accent1, panel: "", titleFont: "", bodyFont: "" };
    const colors = stylePack.colors || {};
    const background = hexColor(colors.background) || "#ffffff";
    const primary = hexColor(patch.accentColor) || hexColor(colors.primary) || "#2563eb";
    const sourceBackgroundRole = sourceThemeRole(slide.background, deck);
    const sourceBackgroundDark = colorLuminance(slide.background) < 0.18;
    const strongSourceBackground = sourceBackgroundDark || /^accent/.test(sourceBackgroundRole);
    const effectiveBackground = strongSourceBackground && colorLuminance(background) >= 0.18 ? primary : background;
    return {
      preserve: false,
      id: clean(stylePack.id || "restyled").replace(/[^a-z0-9_-]/gi, "-"),
      layout: clean(stylePack.layout || "restyled").replace(/[^a-z0-9_-]/gi, "-"),
      background: effectiveBackground,
      text: strongSourceBackground ? contrastText(effectiveBackground) : (hexColor(colors.text) || "#111827"),
      primary,
      panel: hexColor(colors.panel) || background,
      titleFont: clean(stylePack.typography?.titleFont || "Arial, sans-serif"),
      bodyFont: clean(stylePack.typography?.bodyFont || "Arial, sans-serif"),
    };
  }
  function restyledColor(color, role, deck, style) {
    if (style.preserve || !color || color === "transparent" || /^linear-gradient/.test(color)) return color;
    const themeRole = sourceThemeRole(color, deck);
    if (role === "text") return style.text;
    if (/^accent/.test(themeRole) || role === "line") return style.background === style.primary ? style.text : style.primary;
    if (["dk1", "dk2", "tx1", "tx2"].includes(themeRole)) return style.text;
    if (["lt1", "lt2", "bg1", "bg2"].includes(themeRole)) return role === "fill" ? style.panel : style.background;
    return role === "fill" ? style.panel : style.primary;
  }
  function textHtml(paragraphs, options = {}) {
    const fontScale = number(options.fontScale, 1);
    const bulletPolicy = options.bulletPolicy || "source";
    const semanticBullet = (value) => {
      const bullet = clean(value);
      if (!bullet || /[➔→⇾➜➤⟶]/u.test(bullet) || bullet === "ü") return "";
      if (/^[•◦▪‣*-]$/u.test(bullet) || /^\d+[.)]$/u.test(bullet)) return bullet;
      return "";
    };
    return (paragraphs || []).map((paragraph) => {
      const runs = paragraph.runs.map((run) => {
        const style = run.style || {};
        const fontFamily = options.fontFamily || style.fontFamily || "Arial";
        const color = options.color || style.color || "#111";
        const fontSize = clamp(number(style.fontSize, 18) * fontScale, 5, 120);
        const css = [`font-family:${escapeHtml(fontFamily)}`, `font-size:calc(${fontSize}px * var(--ppt-fit-scale,1))`, `font-weight:${style.bold ? 700 : 400}`, `font-style:${style.italic ? "italic" : "normal"}`, `text-decoration:${style.underline ? "underline" : "none"}`, `color:${cssColor(color, "#111")}`].join(";");
        return `<span style="${css}">${escapeHtml(run.text).replace(/\n/g, "<br>")}</span>`;
      }).join("");
      const bulletValue = bulletPolicy === "none" ? ""
        : bulletPolicy === "semantic" ? semanticBullet(paragraph.bullet)
          : clean(paragraph.bullet);
      const bullet = bulletValue ? `<span class="ppt-bullet">${escapeHtml(bulletValue)}</span>` : "";
      return `<p style="text-align:${paragraph.align};margin-left:${paragraph.marginLeft}px;text-indent:${paragraph.textIndent}px;line-height:${paragraph.lineHeight}">${bullet}${runs || "<br>"}</p>`;
    }).join("");
  }
  function renderTable(table, deck, style) {
    if (!table) return "";
    const total = table.widths.reduce((sum, value) => sum + value, 0) || 1;
    return `<table class="ppt-table"><colgroup>${table.widths.map((width) => `<col style="width:${width / total * 100}%">`).join("")}</colgroup><tbody>${table.rows.map((row) => `<tr>${row.cells.map((cell) => `<td style="background:${cssColor(restyledColor(cell.fill, "fill", deck, style))}">${textHtml(cell.paragraphs, { fontFamily: style.preserve ? "" : style.bodyFont, color: style.preserve ? "" : style.text, bulletPolicy: style.preserve ? "source" : "semantic" })}</td>`).join("")}</tr>`).join("")}</tbody></table>`;
  }
  function shapeTextValue(shape) {
    return [
      ...(shape.paragraphs || []),
      ...(shape.table?.rows || []).flatMap((row) => row.cells || []).flatMap((cell) => cell.paragraphs || []),
    ].flatMap((paragraph) => paragraph.runs || []).map((run) => run.text).join(" ").trim();
  }
  function maxShapeFont(shape) {
    return Math.max(0, ...(shape.paragraphs || []).flatMap((paragraph) => paragraph.runs || []).map((run) => number(run.style?.fontSize, 0)));
  }
  function paragraphText(paragraph) {
    return (paragraph?.runs || []).map((run) => run.text).join("").trim();
  }
  function nonEmptyParagraphs(shape) {
    return (shape.paragraphs || []).filter((paragraph) => paragraphText(paragraph));
  }
  const SEMANTIC_PRESETS = new Set([
    "editorial-cover", "contact-feature",
    "profile-split", "structured-bio", "numbered-card-grid", "metric-triptych",
    "outcome-strips", "dual-syllabus", "rubric-matrix", "comparison-panels", "do-dont-columns",
    "schedule-timeline", "assessment-overview", "data-dashboard",
  ]);
  function inferSemanticPreset(slide, textShapes, visuals) {
    const titleText = textShapes.filter((shape) => ["title", "ctrTitle"].includes(shape.placeholder?.type)).map(shapeTextValue).join(" ").toLowerCase();
    const bodyShapes = textShapes.filter((shape) => !["title", "ctrTitle", "subTitle"].includes(shape.placeholder?.type));
    const paragraphs = bodyShapes.flatMap(nonEmptyParagraphs);
    const texts = paragraphs.map(paragraphText);
    if (/dos?\s+and\s+don(?:'|’)?ts?/.test(titleText) && bodyShapes.length >= 2) return "do-dont-columns";
    if (/any questions?|q\s*&\s*a|thank you/.test(titleText)) return "qa-closing";
    if (/textbooks?|references?|resources?/.test(titleText) && visuals.length >= 2) return "resource-gallery";
    if (/assessment|report|presentation/.test(titleText) && /%|marks?|deadline|week/i.test(texts.join(" "))) return "assessment-overview";
    if (/schedule|timeline|mode of delivery|teaching weeks?/.test(titleText)) return "schedule-timeline";
    if (/overview|outcomes?|metrics?|results?/.test(titleText) && texts.filter((text) => /\d/.test(text)).length >= 3) return "data-dashboard";
    if (/\bcontact\b/.test(titleText) && visuals.length) return "contact-feature";
    if (/syllabus|agenda|curriculum/.test(titleText) && bodyShapes.length >= 2) return "dual-syllabus";
    if (texts.filter((text) => /\bv\.?s\.?\b/i.test(text)).length >= 2) return "comparison-panels";
    if (texts.filter((text) => /\b\d+\s*marks?\b/i.test(text)).length >= 3) return "rubric-matrix";
    if (texts.filter((text) => /\b\d+\s*%/.test(text)).length >= 2 && paragraphs.length <= 5) return "metric-triptych";
    const labelValuePairs = paragraphs.filter((paragraph, index) => paragraph.level === 0 && paragraphs[index + 1]?.level > paragraph.level).length;
    if (labelValuePairs >= 2 && labelValuePairs <= 4) return "metric-triptych";
    if (visuals.length && paragraphs.length >= 8) return "structured-bio";
    if (visuals.length >= 3 && paragraphs.length <= 5) return "resource-gallery";
    if (visuals.length === 1 && paragraphs.length <= 3) return "image-led";
    if (visuals.length === 1 && paragraphs.length >= 3 && paragraphs.length <= 7) return "profile-split";
    if (paragraphs.length >= 6 && paragraphs.length <= 10 && !visuals.length) return "numbered-card-grid";
    if (paragraphs.length >= 2 && paragraphs.length <= 5 && !visuals.length) return "outcome-strips";
    return "";
  }
  function assignGrid(map, items, area, columns = 1) {
    if (!items.length || area.h <= 0) return;
    const gap = 24;
    const cols = Math.max(1, Math.min(columns, items.length));
    const rows = Math.ceil(items.length / cols);
    const width = (area.w - gap * (cols - 1)) / cols;
    const height = (area.h - gap * (rows - 1)) / rows;
    items.forEach((shape, index) => map.set(shape.id, {
      x: area.x + (index % cols) * (width + gap),
      y: area.y + Math.floor(index / cols) * (height + gap),
      w: width,
      h: height,
    }));
  }
  function optimizedLayout(slide, deck, patch = {}) {
    const requestedRaw = clean(patch.layoutPreset || "").toLowerCase();
    const presetAliases = {
      "cover-title": "cover-title",
      "title-cover": "cover-title",
      "text-focus": "focus",
      "text-only": "focus",
      "two-column": "columns",
      "image-focus": "image-led",
    };
    const knownPresets = new Set([
      "source", "auto", "cover-title", "editorial-cover", "section-divider", "qa-closing",
      "image-led", "resource-gallery", "contact-feature", "structured-bio", "profile-split",
      "split", "gallery", "columns", "focus", "stack", ...SEMANTIC_PRESETS,
    ]);
    const requested = presetAliases[requestedRaw] || (knownPresets.has(requestedRaw) ? requestedRaw : "auto");
    if (!requested || requested === "source") return { preset: "source", rects: new Map(), headingIds: new Set() };
    const isFooterLike = (shape) => {
      const placeholderType = shape.placeholder?.type || "";
      if (["sldNum", "dt", "ftr", "hdr"].includes(placeholderType)) return true;
      const text = shapeTextValue(shape);
      const rect = pctRect(shape.transform, deck.size);
      return text.length <= 6 && rect && rect.y > 610;
    };
    const candidates = slide.shapes.filter((shape) => !shape.decorative && !isFooterLike(shape) && shape.transform && (shapeTextValue(shape) || ["image", "table", "graphic"].includes(shape.type)));
    if (!candidates.length) return { preset: requested, rects: new Map(), headingIds: new Set() };
    const textShapes = candidates.filter((shape) => shapeTextValue(shape));
    const largestFont = Math.max(0, ...textShapes.map(maxShapeFont));
    const explicitHeadings = textShapes.filter((shape) => ["title", "ctrTitle"].includes(shape.placeholder?.type));
    let headings = explicitHeadings.length
      ? textShapes.filter((shape) => ["title", "ctrTitle", "subTitle"].includes(shape.placeholder?.type))
      : textShapes.filter((shape) => {
        const rect = pctRect(shape.transform, deck.size);
        return largestFont > 0 && maxShapeFont(shape) >= largestFont * 0.72 && rect && rect.y < 390;
      });
    if (!headings.length && textShapes.length) headings = [[...textShapes].sort((a, b) => maxShapeFont(b) - maxShapeFont(a) || number(a.transform?.y) - number(b.transform?.y))[0]];
    headings = headings.slice(0, 3);
    const content = candidates.filter((shape) => !headings.includes(shape));
    const visuals = content.filter((shape) => ["image", "table", "graphic"].includes(shape.type));
    const copy = content.filter((shape) => !visuals.includes(shape));
    let preset = requested;
    if (preset === "auto") {
      const hasCenteredTitle = textShapes.some((shape) => shape.placeholder?.type === "ctrTitle");
      const isCover = slide.page === 1 && hasCenteredTitle && textShapes.length <= 3 && visuals.length === 0;
      preset = isCover ? "editorial-cover" : inferSemanticPreset(slide, textShapes, visuals);
      if (preset) {
        // Semantic reconstruction takes precedence over generic geometry presets.
      } else if (visuals.length >= 2) preset = "gallery";
      else if (visuals.length && copy.length) preset = "split";
      else if (content.length > 4) preset = "columns";
      else if (content.length <= 2) preset = "focus";
      else preset = "stack";
    }
    const rects = new Map();
    const headingIds = new Set(headings.map((shape) => shape.id));
    const margin = 72;
    if (preset === "cover-title") {
      // Title pages are not ordinary grids: the title needs a wide, tall
      // reading zone and metadata belongs below it. The previous generic
      // grid gave two headings ~63px each, clipping large titles.
      const title = headings[0];
      const secondary = headings.slice(1);
      if (title) rects.set(title.id, { x: 72, y: 84, w: 1136, h: 270 });
      assignGrid(rects, secondary, { x: 84, y: 382, w: 860, h: 84 }, 1);
      assignGrid(rects, content, { x: 84, y: 500, w: 860, h: 128 }, 1);
      return { preset, rects, headingIds };
    }
    if (preset === "editorial-cover") {
      assignGrid(rects, headings, { x: 78, y: 156, w: 760, h: 330 }, 1);
      assignGrid(rects, content, { x: 82, y: 510, w: 700, h: 100 }, 1);
      return { preset, rects, headingIds };
    }
    if (preset === "section-divider" || preset === "qa-closing") {
      assignGrid(rects, headings, { x: 112, y: 188, w: 1056, h: 210 }, 1);
      assignGrid(rects, content, { x: 220, y: 430, w: 840, h: 150 }, 1);
      return { preset, rects, headingIds };
    }
    if (preset === "image-led") {
      assignGrid(rects, visuals, { x: 0, y: 0, w: 720, h: 720 }, 1);
      assignGrid(rects, headings, { x: 770, y: 92, w: 430, h: 190 }, 1);
      assignGrid(rects, copy, { x: 770, y: 320, w: 410, h: 290 }, 1);
      return { preset, rects, headingIds };
    }
    if (preset === "resource-gallery") {
      assignGrid(rects, headings, { x: 72, y: 44, w: 1136, h: 112 }, 1);
      assignGrid(rects, visuals, { x: 92, y: 190, w: 1096, h: 410 }, Math.min(3, visuals.length));
      assignGrid(rects, copy, { x: 130, y: 620, w: 1020, h: 58 }, Math.min(2, copy.length));
      return { preset, rects, headingIds };
    }
    if (preset === "contact-feature") {
      const body = copy.filter((shape) => !headingIds.has(shape.id));
      assignGrid(rects, headings, { x: 72, y: 64, w: 560, h: 126 }, 1);
      assignGrid(rects, visuals, { x: 72, y: 224, w: 430, h: 386 }, 1);
      assignGrid(rects, body, { x: 558, y: 220, w: 650, h: 390 }, 1);
      return { preset, rects, headingIds };
    }
    if (preset === "structured-bio") {
      const body = copy.filter((shape) => !headingIds.has(shape.id));
      assignGrid(rects, visuals, { x: 48, y: 54, w: 270, h: 180 }, Math.min(2, visuals.length));
      assignGrid(rects, headings, { x: 48, y: 258, w: 270, h: 220 }, 1);
      assignGrid(rects, body, { x: 352, y: 48, w: 872, h: 624 }, 1);
      return { preset, rects, headingIds };
    }
    if (preset === "profile-split") {
      const body = copy.filter((shape) => !headingIds.has(shape.id));
      assignGrid(rects, headings, { x: 68, y: 76, w: 600, h: 130 }, 1);
      assignGrid(rects, body, { x: 68, y: 228, w: 610, h: 420 }, 1);
      assignGrid(rects, visuals, { x: 760, y: 105, w: 430, h: 510 }, 1);
      return { preset, rects, headingIds };
    }
    const titleHeight = headings.length ? (preset === "focus" ? Math.min(220, 108 + headings.length * 50) : Math.min(150, 74 + headings.length * 38)) : 0;
    if (headings.length) assignGrid(rects, headings, preset === "focus"
      ? { x: 112, y: content.length ? 72 : 210, w: 1056, h: titleHeight }
      : { x: margin, y: 38, w: 1136, h: titleHeight }, 1);
    const areaTop = headings.length ? (preset === "focus" ? 72 : 38) + titleHeight + 28 : 64;
    const area = { x: margin, y: areaTop, w: 1136, h: 720 - areaTop - 58 };
    if (!content.length) return { preset, rects, headingIds };
    if (SEMANTIC_PRESETS.has(preset)) {
      const body = copy.filter((shape) => !headingIds.has(shape.id));
      const columns = ["dual-syllabus", "do-dont-columns"].includes(preset) ? 2 : 1;
      assignGrid(rects, body, area, columns);
      assignGrid(rects, visuals, area, Math.min(2, visuals.length));
    } else if (preset === "split" && visuals.length && copy.length) {
      assignGrid(rects, copy, { x: area.x, y: area.y, w: area.w * 0.46, h: area.h }, 1);
      assignGrid(rects, visuals, { x: area.x + area.w * 0.52, y: area.y, w: area.w * 0.48, h: area.h }, visuals.length > 2 ? 2 : 1);
    } else if (preset === "gallery" && visuals.length) {
      const copyHeight = copy.length ? Math.min(150, area.h * 0.3) : 0;
      assignGrid(rects, copy, { x: area.x, y: area.y, w: area.w, h: copyHeight }, Math.min(2, copy.length));
      const visualColumns = visuals.length === 4 ? 2 : Math.min(3, visuals.length);
      assignGrid(rects, visuals, { x: area.x, y: area.y + copyHeight + (copy.length ? 22 : 0), w: area.w, h: area.h - copyHeight - (copy.length ? 22 : 0) }, visualColumns);
    } else if (preset === "columns") {
      assignGrid(rects, content, area, 2);
    } else if (preset === "focus") {
      assignGrid(rects, content, { x: 170, y: area.y, w: 940, h: area.h }, content.length > 2 ? 2 : 1);
    } else {
      assignGrid(rects, content, area, 1);
    }
    return { preset, rects, headingIds };
  }
  function semanticParagraphHtml(paragraph, style, extraClass = "") {
    const cleanParagraph = { ...paragraph, bullet: "", marginLeft: 0, textIndent: 0 };
    return `<div class="semantic-unit ${extraClass}" data-source-unit-index="${number(paragraph?._sourceIndex, 0)}">${textHtml([cleanParagraph], { fontFamily: style.preserve ? "" : style.bodyFont, color: style.preserve ? "" : style.text })}</div>`;
  }
  function semanticInnerHtml(shape, preset, style) {
    const paragraphs = nonEmptyParagraphs(shape).map((paragraph, index) => ({ ...paragraph, _sourceIndex: index }));
    if (!paragraphs.length) return "";
    if (preset === "data-dashboard") return semanticInnerHtml(shape, "metric-triptych", style);
    if (preset === "schedule-timeline") return semanticInnerHtml(shape, "outcome-strips", style);
    if (preset === "assessment-overview") return semanticInnerHtml(shape, "rubric-matrix", style);
    if (preset === "metric-triptych") {
      const intro = [];
      const pairs = [];
      for (let index = 0; index < paragraphs.length; index += 1) {
        const current = paragraphs[index];
        const next = paragraphs[index + 1];
        if (current.level === 0 && next?.level > current.level) {
          pairs.push([current, next]);
          index += 1;
        } else intro.push(current);
      }
      return `<div class="semantic-intro">${intro.map((paragraph) => semanticParagraphHtml(paragraph, style)).join("")}</div><div class="semantic-metrics">${pairs.map(([label, value]) => `<section>${semanticParagraphHtml(label, style, "semantic-label")}${semanticParagraphHtml(value, style, "semantic-value")}</section>`).join("")}</div>`;
    }
    if (preset === "structured-bio") {
      const groups = [];
      for (let index = 0; index < paragraphs.length; index += 1) {
        const primary = paragraphs[index];
        const secondary = paragraphs[index + 1]?.level > primary.level ? paragraphs[++index] : null;
        groups.push([primary, secondary]);
      }
      return `<div class="semantic-bio">${groups.map(([primary, secondary]) => `<section>${semanticParagraphHtml(primary, style, "semantic-label")}${secondary ? semanticParagraphHtml(secondary, style, "semantic-secondary") : ""}</section>`).join("")}</div>`;
    }
    if (preset === "numbered-card-grid") {
      return `<div class="semantic-card-grid">${paragraphs.map((paragraph, index) => `<section><b aria-hidden="true">${index + 1}</b>${semanticParagraphHtml(paragraph, style)}</section>`).join("")}</div>`;
    }
    if (preset === "outcome-strips") {
      return `<div class="semantic-strips">${paragraphs.map((paragraph, index) => `<section><b aria-hidden="true">${index + 1}</b>${semanticParagraphHtml(paragraph, style)}</section>`).join("")}</div>`;
    }
    if (preset === "dual-syllabus") {
      return `<section class="semantic-list-panel">${semanticParagraphHtml(paragraphs[0], style, "semantic-panel-title")}<div>${paragraphs.slice(1).map((paragraph, index) => `<div class="semantic-list-row"><b aria-hidden="true">${index + 1}</b>${semanticParagraphHtml(paragraph, style)}</div>`).join("")}</div></section>`;
    }
    if (preset === "rubric-matrix") {
      const intro = paragraphs[0];
      return `${semanticParagraphHtml(intro, style, "semantic-rubric-intro")}<div class="semantic-rubric">${paragraphs.slice(1).map((paragraph, index) => {
        const raw = paragraphText(paragraph);
        const parts = raw.split(/\t+/).map((part) => part.trim()).filter(Boolean);
        const label = parts.length > 1 ? parts.slice(0, -1).join(" ") : raw;
        const value = parts.length > 1 ? parts.at(-1) : "";
        return `<section data-source-unit-index="${paragraph._sourceIndex}"><b aria-hidden="true">${index + 1}</b><span>${escapeHtml(label)}</span>${value ? `<strong>${escapeHtml(value)}</strong>` : ""}</section>`;
      }).join("")}</div>`;
    }
    if (preset === "comparison-panels") {
      return `<div class="semantic-comparison">${paragraphs.map((paragraph) => {
        const raw = paragraphText(paragraph);
        const colon = raw.indexOf(":");
        const label = colon >= 0 ? raw.slice(0, colon + 1) : "";
        const value = colon >= 0 ? raw.slice(colon + 1).trim() : raw;
        const sides = value.split(/\s+v\.?s\.?\s+/i);
        return `<section data-source-unit-index="${paragraph._sourceIndex}"><b>${escapeHtml(label)}</b><span>${escapeHtml(sides[0] || value)}</span>${sides.length > 1 ? `<i>v.s.</i><span>${escapeHtml(sides.slice(1).join(" "))}</span>` : ""}</section>`;
      }).join("")}</div>`;
    }
    if (preset === "do-dont-columns") {
      return `<section class="semantic-list-panel semantic-do-dont">${paragraphs.map((paragraph) => `<div class="semantic-list-row"><i aria-hidden="true"></i>${semanticParagraphHtml(paragraph, style)}</div>`).join("")}</section>`;
    }
    if (preset === "profile-split") {
      return `<div class="semantic-profile-list">${paragraphs.map((paragraph) => `<div>${semanticParagraphHtml(paragraph, style)}</div>`).join("")}</div>`;
    }
    return "";
  }
  function renderShape(shape, deck, slide, patch = {}, stylePack = null, layoutPlan = null) {
    const optimizedRect = layoutPlan?.rects?.get(shape.id);
    const rect = optimizedRect || pctRect(shape.transform, deck.size);
    if (!rect || rect.w <= 0 || rect.h <= 0) return "";
    const transform = `rotate(${shape.rotation || 0}deg) scaleX(${shape.flipH ? -1 : 1}) scaleY(${shape.flipV ? -1 : 1})`;
    const optimized = Boolean(optimizedRect);
    const common = `left:${rect.x}px;top:${rect.y}px;width:${rect.w}px;height:${rect.h}px;transform:${transform};${optimized ? "--ppt-fit-scale:1;" : ""}${shape.decorative ? "z-index:0;pointer-events:none;" : "z-index:2;"}`;
    const optimizedAttrs = optimized ? ' data-layout-optimized="true"' : "";
    const decorationAttrs = shape.decorative ? ' data-decoration="true"' : "";
    const isTitle = ["title", "ctrTitle", "subTitle"].includes(shape.placeholder?.type);
    const style = slideStyleContext(deck, slide, stylePack, patch);
    const fontScale = clamp(number(isTitle ? patch.titleScale : patch.bodyScale, 1), 0.92, 1.08);
    const accent = /^#[0-9a-f]{6}$/i.test(patch.accentColor || "") ? patch.accentColor.toLowerCase() : "";
    const sourceAccent = clean(deck.theme.colors.accent1).toLowerCase();
    const patchedFill = accent && clean(shape.fill).toLowerCase() === sourceAccent ? accent : shape.fill;
    const patchedLine = accent && clean(shape.line.color).toLowerCase() === sourceAccent ? accent : shape.line.color;
    const shapeFill = restyledColor(patchedFill, "fill", deck, style);
    const lineColor = restyledColor(patchedLine, "line", deck, style);
    const editable = shape.type !== "image" && shape.type !== "graphic";
    if (shape.type === "image") {
      const src = slide.images?.[shape.imageRelId] || "";
      if (!src) return "";
      const crop = shape.crop;
      const objectPosition = crop ? `${clamp(50 + (crop.l - crop.r) / 2, 0, 100)}% ${clamp(50 + (crop.t - crop.b) / 2, 0, 100)}%` : "50% 50%";
      const optimizedFit = patch.imageFit === "cover" ? "cover" : "contain";
      return `<img class="ppt-element ppt-image" data-element-id="${shape.id}" data-source-element-id="${shape.id}" data-editor-kind="media" data-editable-media=""${decorationAttrs}${optimizedAttrs} src="${src}" alt="" style="${common}object-position:${objectPosition};object-fit:${optimized ? optimizedFit : (shape.pdfPage ? "contain" : "cover")}">`;
    }
    if (shape.type === "table") return `<div class="ppt-element ppt-table-wrap" data-element-id="${shape.id}" data-source-element-id="${shape.id}" data-editor-kind="box" data-editable-box=""${decorationAttrs}${optimizedAttrs} style="${common}">${renderTable(shape.table, deck, style)}</div>`;
    const isLine = /line|connector/i.test(shape.type);
    if (isLine) return `<div class="ppt-element ppt-line" data-element-id="${shape.id}" data-source-element-id="${shape.id}" data-editor-kind="box" data-editable-box=""${decorationAttrs}${optimizedAttrs} style="${common}height:0;border-top:${Math.max(1, shape.line.width)}px ${shape.line.dash} ${cssColor(lineColor, "#000")};transform-origin:left center"></div>`;
    const styledRadius = /soft|paper|lesson|warm|contrast-blocks/i.test(style.layout) ? "8px" : "0";
    const radius = /ellipse|round/i.test(shape.type) ? (shape.type === "ellipse" ? "50%" : "10px") : styledRadius;
    const text = textHtml(shape.paragraphs, {
      fontScale,
      fontFamily: style.preserve ? "" : (isTitle ? style.titleFont : style.bodyFont),
      color: style.preserve ? "" : style.text,
      bulletPolicy: style.preserve ? "source" : (patch.bulletPolicy || "semantic"),
    });
    const semantic = optimized && SEMANTIC_PRESETS.has(layoutPlan?.preset) && !layoutPlan.headingIds?.has(shape.id) ? semanticInnerHtml(shape, layoutPlan.preset, style) : "";
    return `<div class="ppt-element ppt-shape${semantic ? " ppt-semantic" : ""}" data-element-id="${shape.id}" data-source-element-id="${shape.id}" data-editor-kind="${text ? "text" : "box"}"${editable && text ? ' data-editable="true"' : (editable ? ' data-editable-box=""' : "")}${decorationAttrs}${optimizedAttrs} style="${common}background:${semantic ? "transparent" : cssColor(shapeFill)};border:${semantic ? "0" : `${shape.line.width}px ${shape.line.dash} ${cssColor(lineColor)}`};border-radius:${radius}"><div class="ppt-text${semantic ? " ppt-semantic-content" : ""}" style="padding:${semantic ? "0" : `${shape.body.marginTop}px ${shape.body.marginRight}px ${shape.body.marginBottom}px ${shape.body.marginLeft}px`};justify-content:${shape.body.vertical};white-space:${optimized ? "normal" : (shape.body.wrap ? "normal" : "nowrap")}">${semantic || text}</div></div>`;
  }
  function renderDeck(deck, patches = [], stylePack = null) {
    const patchMap = Object.fromEntries((patches || []).map((item) => [Number(item.page), item]));
    const sections = deck.slides.map((slide, index) => {
      const patch = patchMap[index + 1] || {};
      const style = slideStyleContext(deck, slide, stylePack, patch);
      const layoutPlan = optimizedLayout(slide, deck, patch);
      const backgroundColor = style.preserve ? (patch.backgroundColor || slide.background || "#fff") : style.background;
      const accent = style.preserve ? (patch.accentColor || deck.theme.colors.accent1) : style.primary;
      const transitionName = ["none", "fade", "push", "wipe"].includes(patch.transition) ? patch.transition : slide.transition;
      const sourceEmpty = !slide.plainText && !slide.shapes.some((shape) => !shape.decorative && ["image", "table", "graphic"].includes(shape.type));
      const density = ["airy", "balanced", "compact"].includes(patch.density) ? patch.density : "balanced";
      return `<section class="slide ppt-slide transition-${transitionName} style-${style.id} layout-${style.layout} density-${density}${layoutPlan.preset !== "source" ? " layout-optimized" : ""}" data-slide-page="${index + 1}" data-source-page="${index + 1}"${sourceEmpty ? ' data-source-empty="true"' : ""} data-style-pack="${style.id}" data-layout-preset="${layoutPlan.preset}" style="--ppt-accent:${cssColor(accent, "#f2c94c")};--ppt-text:${cssColor(style.text, "#111827")};--ppt-panel:${cssColor(style.panel, "#ffffff")};background:${cssColor(backgroundColor, "#fff")}"><div class="slide-inner">${slide.shapes.map((shape) => renderShape(shape, deck, slide, patch, stylePack, layoutPlan)).join("")}</div></section>`;
    }).join("\n");
    const title = escapeHtml(deck.fileName?.replace(/\.pptx?$/i, "") || "Presentation");
    return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title><style>
.layout-optimized .ppt-text p{margin-left:0!important;text-indent:0!important;overflow-wrap:anywhere}.layout-optimized [data-layout-optimized="true"]{max-width:calc(100% - 1px);max-height:calc(100% - 1px)}
.ppt-semantic-content{display:block!important;padding:0!important}.semantic-unit p{margin:0!important}.semantic-intro{margin:0 0 22px}.semantic-metrics{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:28px;height:calc(100% - 60px)}.semantic-metrics section{display:flex;flex-direction:column;justify-content:center;gap:18px;padding:28px;background:var(--ppt-panel);border-top:7px solid var(--ppt-accent);border-radius:8px;box-shadow:0 10px 22px rgba(15,23,42,.1);text-align:center}.semantic-label{opacity:.72;text-transform:uppercase}.semantic-value span{font-weight:700!important}.semantic-bio{display:grid;grid-template-columns:1fr;gap:14px;height:100%;overflow:hidden}.semantic-bio section{padding:16px 20px;background:var(--ppt-panel);border-left:6px solid var(--ppt-accent);border-radius:6px}.semantic-bio .semantic-label span{font-weight:700!important}.semantic-secondary{margin-top:8px;opacity:.72}.semantic-card-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:18px;height:100%}.semantic-card-grid section{position:relative;padding:18px 20px 16px 58px;background:var(--ppt-panel);border-left:5px solid var(--ppt-accent);border-radius:7px;box-shadow:0 8px 16px rgba(15,23,42,.08)}.semantic-card-grid section>b,.semantic-strips section>b,.semantic-rubric section>b{position:absolute;left:16px;top:16px;display:grid;place-items:center;width:30px;height:30px;border-radius:50%;background:var(--ppt-accent);color:#fff;font:700 16px Arial}.semantic-strips{display:grid;grid-template-columns:1fr;gap:18px;height:100%}.semantic-strips section{position:relative;display:flex;align-items:center;padding:18px 24px 18px 66px;background:color-mix(in srgb,var(--ppt-panel) 82%,var(--ppt-accent));border-left:5px solid var(--ppt-accent);border-radius:6px}.semantic-list-panel{height:100%;padding:26px 28px;background:var(--ppt-panel);border-top:7px solid var(--ppt-accent);border-radius:8px;box-shadow:0 10px 22px rgba(15,23,42,.1)}.semantic-panel-title{margin-bottom:18px}.semantic-panel-title span{font-weight:700!important}.semantic-list-row{position:relative;display:flex;align-items:flex-start;gap:12px;margin:8px 0}.semantic-list-row>b{flex:0 0 26px;display:grid;place-items:center;width:26px;height:26px;border-radius:50%;background:var(--ppt-accent);color:#fff;font:700 14px Arial}.semantic-list-row>.semantic-unit{flex:1}.semantic-rubric-intro{margin:0 0 24px}.semantic-rubric{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px 24px}.semantic-rubric section{position:relative;display:grid;grid-template-columns:34px 1fr auto;align-items:center;gap:12px;padding:16px 20px 16px 56px;background:color-mix(in srgb,var(--ppt-panel) 84%,var(--ppt-accent));border-left:5px solid var(--ppt-accent);border-radius:6px}.semantic-rubric section>b{top:50%;transform:translateY(-50%)}.semantic-rubric section strong{color:var(--ppt-accent)}.semantic-comparison{display:grid;grid-template-columns:1fr;gap:20px;height:100%}.semantic-comparison section{display:grid;grid-template-columns:190px 1fr 52px 1fr;align-items:center;gap:18px;padding:22px 28px;background:var(--ppt-panel);border-radius:7px;box-shadow:0 8px 16px rgba(15,23,42,.08)}.semantic-comparison section>b{color:var(--ppt-accent)}.semantic-comparison section>i{text-align:center;color:var(--ppt-accent);font-style:normal;font-weight:700}.semantic-do-dont{padding-top:42px}.semantic-do-dont .semantic-list-row{margin:24px 0}.semantic-do-dont .semantic-list-row>i{width:10px;height:10px;margin-top:9px;background:var(--ppt-accent);transform:rotate(45deg)}.semantic-profile-list{display:grid;gap:16px}.semantic-profile-list>div{padding:12px 18px;border-left:5px solid var(--ppt-accent);background:color-mix(in srgb,var(--ppt-panel) 86%,transparent);border-radius:5px}
.layout-optimized[data-layout-preset="editorial-cover"] .slide-inner:after{content:"";position:absolute;right:-90px;top:-70px;width:470px;height:860px;background:var(--ppt-accent);clip-path:polygon(30% 0,100% 0,100% 100%,0 100%);opacity:.92;z-index:0}.layout-optimized[data-layout-preset="editorial-cover"] .ppt-element{z-index:1}.layout-optimized[data-layout-preset="contact-feature"] .ppt-image{border-radius:8px;box-shadow:18px 18px 0 color-mix(in srgb,var(--ppt-accent) 30%,transparent)}[data-layout-preset="dual-syllabus"] .semantic-list-panel{padding:16px 20px}[data-layout-preset="dual-syllabus"] .semantic-panel-title{margin-bottom:10px}[data-layout-preset="dual-syllabus"] .semantic-list-row{align-items:center;gap:8px;margin:2px 0}[data-layout-preset="dual-syllabus"] .semantic-list-row>b{flex-basis:20px;width:20px;height:20px;font-size:11px}.ppt-compact .semantic-card-grid,.ppt-compact .semantic-strips,.ppt-compact .semantic-bio{gap:8px}.ppt-compact .semantic-card-grid section,.ppt-compact .semantic-bio section{padding-top:9px;padding-bottom:9px}.ppt-compact .semantic-list-panel{padding:14px 18px}.ppt-compact .semantic-list-row{margin:3px 0}
.layout-optimized[data-layout-preset="section-divider"] .slide-inner:before,.layout-optimized[data-layout-preset="qa-closing"] .slide-inner:before{content:"";position:absolute;left:0;top:0;width:24px;height:100%;background:var(--ppt-accent)}.layout-optimized[data-layout-preset="image-led"] .ppt-image{border-radius:0}.layout-optimized[data-layout-preset="resource-gallery"] .ppt-image{border-radius:7px;box-shadow:0 14px 28px rgba(15,23,42,.14)}.density-compact .semantic-card-grid,.density-compact .semantic-strips,.density-compact .semantic-bio{gap:8px}.density-compact .semantic-card-grid section,.density-compact .semantic-bio section{padding-top:9px;padding-bottom:9px}.density-compact .semantic-list-panel{padding:14px 18px}.density-compact .semantic-list-row{margin:3px 0}.density-airy .semantic-card-grid,.density-airy .semantic-strips,.density-airy .semantic-bio{gap:24px}
*{box-sizing:border-box}html,body{margin:0;width:100%;height:100%;overflow:hidden;background:#e8ebef;font-family:Arial,sans-serif;letter-spacing:0}.deck{position:relative;width:100%;height:100%}.slide{display:none;position:absolute;left:50%;top:50%;width:1280px;height:720px;overflow:hidden;transform-origin:center center;box-shadow:0 12px 38px rgba(0,0,0,.18)}.slide.active{display:block}.slide-inner{position:absolute;inset:0;overflow:hidden}.layout-strict-grid .slide-inner{background-image:linear-gradient(rgba(21,94,239,.08) 1px,transparent 1px),linear-gradient(90deg,rgba(21,94,239,.08) 1px,transparent 1px);background-size:48px 48px}.layout-academic-paper .slide-inner:before,.layout-magazine .slide-inner:before{content:"";position:absolute;left:6%;right:6%;top:5%;height:2px;background:var(--ppt-accent);z-index:0}.layout-blueprint .slide-inner{background-image:linear-gradient(rgba(255,255,255,.1) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.1) 1px,transparent 1px);background-size:36px 36px}.ppt-element{position:absolute;overflow:hidden;transform-origin:center center}.ppt-shape{display:block}.ppt-text{width:100%;height:100%;display:flex;flex-direction:column;overflow:hidden}.ppt-text p{padding:0;margin-top:0;margin-bottom:0;letter-spacing:0;overflow-wrap:break-word}.ppt-bullet{display:inline-block;margin-right:.35em;color:var(--ppt-accent)}.ppt-image{object-fit:cover}.ppt-table-wrap{background:transparent}.ppt-table{width:100%;height:100%;border-collapse:collapse;table-layout:fixed}.ppt-table td{border:1px solid color-mix(in srgb,var(--ppt-accent) 35%,transparent);vertical-align:middle;padding:4px;overflow:hidden}.nav{position:fixed;left:50%;bottom:12px;z-index:100;display:flex;align-items:center;gap:14px;transform:translateX(-50%);padding:7px 10px;background:rgba(20,24,31,.88);border-radius:8px;color:#fff}.nav button{width:38px;height:32px;border:0;border-radius:5px;background:#fff;color:#111;font-size:20px;cursor:pointer}.nav output{min-width:72px;text-align:center;font-size:13px}.slide.active.transition-fade{animation:pptFade .28s ease}.slide.active.transition-push,.slide.active.transition-wipe{animation:pptPush .32s ease}@keyframes pptFade{from{opacity:.2}to{opacity:1}}@keyframes pptPush{from{opacity:.4;clip-path:inset(0 100% 0 0)}to{opacity:1;clip-path:inset(0)}}
</style></head><body><main class="deck">${sections}</main><nav class="nav" aria-label="Slide navigation"><button type="button" data-prev aria-label="Previous">&#8249;</button><output>1 / ${deck.slides.length}</output><button type="button" data-next aria-label="Next">&#8250;</button></nav><script>
(function(){var slides=[].slice.call(document.querySelectorAll('.slide')),index=0,out=document.querySelector('.nav output');function fitText(){document.querySelectorAll('.slide.active .ppt-text').forEach(function(node){var host=node.parentElement,scale=1,minScale=.08;node.style.overflow='visible';host.style.setProperty('--ppt-fit-scale',scale);while((node.scrollHeight>node.clientHeight+1||node.scrollWidth>node.clientWidth+1)&&scale>minScale){scale-=.02;host.style.setProperty('--ppt-fit-scale',Math.max(minScale,scale).toFixed(3))}var fits=node.scrollHeight<=node.clientHeight+1&&node.scrollWidth<=node.clientWidth+1;host.dataset.contentFits=String(fits)})}function fit(){var scale=Math.min(innerWidth/1280,innerHeight/720);slides.forEach(function(s){s.style.transform='translate(-50%,-50%) scale('+scale+')'})}function show(n){index=(n+slides.length)%slides.length;slides.forEach(function(s,i){s.classList.toggle('active',i===index)});out.textContent=(index+1)+' / '+slides.length;requestAnimationFrame(fitText)}window.showSlide=show;window.nextSlide=function(){show(index+1)};window.prevSlide=function(){show(index-1)};document.querySelector('[data-next]').onclick=window.nextSlide;document.querySelector('[data-prev]').onclick=window.prevSlide;addEventListener('resize',function(){fit();fitText()});addEventListener('keydown',function(e){if(['ArrowRight','PageDown',' '].includes(e.key))window.nextSlide();if(['ArrowLeft','PageUp'].includes(e.key))window.prevSlide()});var requested=Number(new URLSearchParams(location.search).get('slide')||location.hash.replace('#',''))||1;fit();show(requested-1)})();
</script></body></html>`;
  }

  async function convertPptx(arrayBuffer, JSZip, onProgress = () => {}) {
    const startedAt = Date.now();
    if (!JSZip?.loadAsync) throw new Error("JSZip runtime is unavailable.");
    onProgress({ percent: 2, phase: "unzip", message: "Opening PPTX package" });
    const zip = await JSZip.loadAsync(arrayBuffer);
    const presentationPath = "ppt/presentation.xml";
    const presentationRoot = parseXml(await zipText(zip, presentationPath));
    const presentationRels = parseRelationships(await zipText(zip, relsPath(presentationPath)), presentationPath);
    const sldSz = firstDesc(presentationRoot, "sldSz");
    const size = { cx: number(attr(sldSz, "cx"), DEFAULT_SIZE.cx), cy: number(attr(sldSz, "cy"), DEFAULT_SIZE.cy) };
    const slideIds = descendants(presentationRoot, "sldId").map((node) => node.attrs?.[`${NS.R}:id`] || "").filter(Boolean);
    const slidePaths = slideIds.map((id) => presentationRels[id]?.path).filter(Boolean);
    if (!slidePaths.length) throw new Error("The PPTX package does not contain slides.");
    const themePath = Object.values(presentationRels).find((rel) => rel.type === "theme")?.path || "ppt/theme/theme1.xml";
    const theme = parseTheme(parseXml(await zipText(zip, themePath)));
    const slides = [];
    let unresolvedTransforms = 0;
    let imageCount = 0;
    let textLength = 0;
    const cache = new Map();
    const loadPart = async (path) => {
      if (!path) return { root: null, rels: {} };
      if (!cache.has(path)) cache.set(path, Promise.all([zipText(zip, path), zipText(zip, relsPath(path))]).then(([xml, rels]) => ({ root: parseXml(xml), rels: parseRelationships(rels, path) })));
      return cache.get(path);
    };
    for (let pageIndex = 0; pageIndex < slidePaths.length; pageIndex += 1) {
      const page = pageIndex + 1;
      const slidePath = slidePaths[pageIndex];
      const slidePart = await loadPart(slidePath);
      const layoutPath = Object.values(slidePart.rels).find((rel) => rel.type === "slideLayout")?.path;
      const layoutPart = await loadPart(layoutPath);
      const masterPath = Object.values(layoutPart.rels).find((rel) => rel.type === "slideMaster")?.path;
      const masterPart = await loadPart(masterPath);
      const colorMap = { ...parseColorMap(masterPart.root), ...parseColorMap(slidePart.root) };
      const context = { page, theme, colorMap, masterTextStyles: firstDesc(masterPart.root, "txStyles") };
      const masterNodes = shapeNodes(masterPart.root);
      const layoutNodes = shapeNodes(layoutPart.root);
      const slideNodes = shapeNodes(slidePart.root);
      const masterMap = mapPlaceholders(masterNodes);
      const layoutMap = mapPlaceholders(layoutNodes);
      const decorative = [];
      const decorativeKeys = new Set();
      const addDecorative = (node) => {
        if (placeholder(node)) return;
        const shape = parseShape(node, null, context, decorative.length);
        shape.decorative = true;
        const t = shape.transform;
        const key = t ? [shape.type, t.x, t.y, t.cx, t.cy, shape.fill, shape.line.color].join(":") : "";
        if (key && decorativeKeys.has(key)) return;
        if (key) decorativeKeys.add(key);
        decorative.push(shape);
      };
      masterNodes.forEach(addDecorative);
      layoutNodes.forEach(addDecorative);
      const content = slideNodes.map((node, index) => {
        const ph = placeholder(node);
        const layoutNode = ph ? (layoutMap[placeholderKey(ph)] || layoutMap[`${ph.type}:*`] || null) : null;
        const masterNode = ph ? (masterMap[placeholderKey(ph)] || masterMap[`${ph.type}:*`] || null) : null;
        const shape = parseShape(node, layoutNode || masterNode, context, decorative.length + index, layoutNode ? masterNode : null);
        shape.decorative = false;
        return shape;
      });
      const shapes = [...decorative, ...content];
      unresolvedTransforms += shapes.filter((shape) => !shape.transform).length;
      const images = Object.create(null);
      for (const shape of shapes.filter((item) => item.imageRelId)) {
        const rel = slidePart.rels[shape.imageRelId] || layoutPart.rels[shape.imageRelId] || masterPart.rels[shape.imageRelId];
        if (rel?.path && !images[shape.imageRelId]) { images[shape.imageRelId] = await zipDataUrl(zip, rel.path); if (images[shape.imageRelId]) imageCount += 1; }
      }
      const slideBackground = background(slidePart.root, theme, colorMap, background(layoutPart.root, theme, colorMap, background(masterPart.root, theme, colorMap, theme.colors.lt1)));
      const shapeText = (shape) => [
        ...(shape.paragraphs || []),
        ...(shape.table?.rows || []).flatMap((row) => row.cells || []).flatMap((cell) => cell.paragraphs || []),
      ].flatMap((p) => p.runs || []).map((run) => run.text).join(" ");
      const plainText = content.map(shapeText).join(" ").trim();
      textLength += plainText.length;
      slides.push({ page, path: slidePath, background: slideBackground, transition: transition(slidePart.root), shapes: shapes.filter((shape) => shape.transform), images, plainText });
      onProgress({ percent: 5 + Math.round(page / slidePaths.length * 88), phase: "slides", page, totalPages: slidePaths.length, message: `Rendering slide ${page} of ${slidePaths.length}` });
    }
    const deck = { version: 1, fileName: "Presentation.pptx", size, theme, slides };
    const html = renderDeck(deck);
    const stats = { slideCount: slides.length, imageCount, textLength, unresolvedTransforms, conversionMs: Date.now() - startedAt, localOnly: true, parser: "pptx-local-core-v1" };
    onProgress({ percent: 100, phase: "complete", page: slides.length, totalPages: slides.length, message: "Local conversion complete" });
    return { html, deck, stats, slides: slides.map((slide) => ({
      page: slide.page,
      text: slide.plainText,
      shapeCount: slide.shapes.length,
      imageCount: Object.keys(slide.images).length,
      elements: slide.shapes.filter((shape) => !shape.decorative).map((shape) => ({
        id: shape.id,
        type: shape.type,
        placeholder: shape.placeholder?.type || "",
        textLength: shapeTextValue(shape).length,
        hasImage: shape.type === "image",
        role: shape.placeholder?.type || (shape.type === "image" ? "visual" : maxShapeFont(shape) >= 28 ? "heading" : "body"),
        maxFont: maxShapeFont(shape),
        rect: (() => {
          const rect = pctRect(shape.transform, size);
          return rect ? {
            x: Number(rect.x.toFixed(1)), y: Number(rect.y.toFixed(1)),
            w: Number(rect.w.toFixed(1)), h: Number(rect.h.toFixed(1)),
          } : null;
        })(),
        units: nonEmptyParagraphs(shape).slice(0, 40).map((paragraph, index) => ({
          id: `${shape.id}-p${index + 1}`,
          level: number(paragraph.level, 0),
          bullet: clean(paragraph.bullet).slice(0, 8),
          text: paragraphText(paragraph).slice(0, 280),
        })),
      })),
    })) };
  }

  root.PptxLocalCore = Object.freeze({ convertPptx, renderDeck, parseXml, parseRelationships });
})(typeof self !== "undefined" ? self : globalThis);
