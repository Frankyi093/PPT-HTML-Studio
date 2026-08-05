import JSZip from "jszip";
import {
  buildPagePrompt,
  buildPlanningPrompt,
  normalizePlan,
  validatePlan,
} from "./ai-engine/open-source-adapter.js";
import {
  generateHtmlAnythingDeck,
  generateHtmlAnythingSingle,
  generateHtmlAnythingChunk,
  extractSlideSections,
  mergeDeck,
  chunkSizeFor,
  skillIdForStyle,
} from "./ai-engine/html-anything-engine.js";
import { animationRuntimeCss, animationRuntimeScript } from "./ai-engine/animation-runtime.js";
import {
  academicPlanPrompt,
  buildReadingMatrix,
  academicPosterPrompt,
  academicPosterTemplates,
  auditAcademicPosterSpec,
  auditAcademicHtml,
  auditPaper2PosterQuality,
  buildPaperAssetLibrary,
  fallbackAcademicPosterSpec,
  fallbackAcademicPlan,
  normalizeAcademicPosterSpec,
  normalizeAcademicPlan,
  normalizePaper2PosterSpec,
  normalizeAcademicSource,
  paper2PosterPrompt,
  renderAcademicDeckHtml,
  renderAcademicPosterHtml,
  renderPaper2PosterHtml,
} from "./ai-engine/academic-engine.js";
import {
  academicPosterV5EvidencePrompt,
  academicPosterV5BriefPrompt,
  academicPosterV5ReviewPrompt,
  auditAcademicPosterV5,
  fallbackAcademicPosterBriefV5,
  normalizeAcademicPosterBriefV5,
  renderAcademicPosterV5Html,
} from "./ai-engine/academic-v5-engine.js";

const jobs = new Map();
const jobList = [];
const CLOUDFLARE_MAX_RAW_UPLOAD_BYTES = 50 * 1024 * 1024;
const CLOUDFLARE_MAX_PAYLOAD_BYTES = 75 * 1024 * 1024;
const MAX_EMBEDDED_IMAGES = 36;
const MAX_EMBEDDED_IMAGE_BYTES = 700 * 1024;
const MAX_TOTAL_EMBEDDED_IMAGE_BYTES = 6 * 1024 * 1024;
let integrationConfig = {
  mode: "local",
  endpoint: "",
  apiKey: "",
  apiKeyHeader: "Authorization",
  apiKeyPrefix: "Bearer ",
  customHeaders: "",
  workflowPayload: "flat",
  model: "gpt-4.1-mini",
  timeoutSec: 0,
  fallbackToLocal: false,
};

const LOCAL_MODE = "local";

const DEFAULT_API_GUIDE = `# API Configuration Tutorial

## Cloudflare-only mode

This deployment runs fully on Cloudflare Workers. It does not use Vercel or a Python backend.

## Required fields

1. Choose a service.
2. Paste the API key.
3. Keep the default endpoint and model unless your provider gives a custom value.
4. Click Save connection.
5. Click Test API.

## Notes

- Local rules need no API key.
- Cloudflare Workers currently support .pptx conversion in this deployment.
- Old binary .ppt files are not supported in Cloudflare-only mode.
- Uploads up to 50MB are enabled in this Cloudflare-only deployment. Very large files are still limited by Cloudflare Worker request and memory limits.
- API keys saved here are kept in the Worker isolate memory and may reset after redeploy or idle periods. For production, store provider keys as Cloudflare Secrets and hide them from the browser.
`;

const APP_SETTINGS_SCRIPT = "";
const HTML_ANYTHING_SKILLS = Object.freeze({"deck-blueprint/SKILL.md":"---\r\nname: deck-blueprint\r\nzh_name: \"蓝图架构 Deck\"\r\nen_name: \"Knowledge Arch Blueprint\"\r\nemoji: \"📐\"\r\ndescription: \"奶油纸 + 锈红 + 蓝图网格 mask + 黑边硬卡片 + pipeline 盒\"\r\ncategory: slides\r\nscenario: engineering\r\naspect_hint: \"16:9\"\r\nfeatured: 29\r\ntags: [\"blueprint\", \"architecture\", \"engineering\"]\r\n---\r\n\r\n【模板: Knowledge Arch Blueprint Deck】\r\n【意图】认真的、印刷友好的架构 / pipeline 讲解 deck。\r\n【布局】\r\n- 奶油 #F0EAE0 底 + 蓝图 48px 网格 mask\r\n- Pipeline 步骤盒 (其中一个抬高)\r\n- 右侧锈红 #B5392A insight callout\r\n- Playfair serif 大字 + SVG 虚线反馈环\r\n【设计细节】\r\n- 零渐变零软阴影\r\n","deck-course-module/SKILL.md":"---\r\nname: deck-course-module\r\nzh_name: \"课程 / 培训 Deck\"\r\nen_name: \"Course Module Deck\"\r\nemoji: \"🎓\"\r\ndescription: \"暖纸背景 + Playfair, 左侧学习目标常驻, 含 MCQ 自测页\"\r\ncategory: slides\r\nscenario: education\r\naspect_hint: \"16:9\"\r\nfeatured: 25\r\ntags: [\"course\", \"workshop\", \"training\", \"教学\"]\r\n---\r\n\r\n【模板: 课程 / 培训模块 Deck】\r\n【意图】教学 / workshop 用 deck, 持续显示学习目标。\r\n【布局】\r\n- Cover (模块名 + 讲师)\r\n- Learning objectives 列表 (左侧持续显示)\r\n- 正文页 (concept + 例子)\r\n- MCQ 自测页\r\n- Wrap-up + 下一模块预告\r\n【设计细节】\r\n- warm paper bg + Playfair serif\r\n","deck-dir-key-nav/SKILL.md":"---\r\nname: deck-dir-key-nav\r\nzh_name: \"极简方向键 Keynote\"\r\nen_name: \"Dir-Key Nav Minimal Deck\"\r\nemoji: \"▶︎\"\r\ndescription: \"8 页单色背景, 160px display + 4px accent + Mono 箭头列表\"\r\ncategory: slides\r\nscenario: personal\r\naspect_hint: \"16:9\"\r\nfeatured: 34\r\ntags: [\"minimal\", \"kbd\", \"monocolor\"]\r\n---\r\n\r\n【模板: 极简方向键 Keynote】\r\n【意图】“有话要说但没什么可看” 的极简 keynote。\r\n【布局】\r\n- 页数由【用户内容】决定 (短内容 8 页起步, 长内容应更多); 每页单色背景, 从下列调色板里循环选取 (靛 / 奶 / 绛 / 翠 / 灰 / 紫 / 白 / 炭), 同色可复用\r\n- 160px display 标题 + 4px 短粗 accent 线\r\n- 箭头 → 前缀的 Mono 列表\r\n- 左下 ← → kbd 提示 + 右下页码\r\n","deck-guizang-editorial/example.html":"<!DOCTYPE html>\r\n<html lang=\"zh-CN\">\r\n<head>\r\n<meta charset=\"UTF-8\" />\r\n<title>贵赞编辑墨水 · 章节封页</title>\r\n<script src=\"https://cdn.tailwindcss.com\"></script>\r\n<link href=\"https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,500;0,700;1,400&family=Inter:wght@400;500;600&family=Noto+Serif+SC:wght@400;500;700&family=Noto+Sans+SC:wght@400;500&display=swap\" rel=\"stylesheet\" />\r\n<style>\r\n  body { font-family: 'Inter','Noto Sans SC',system-ui,sans-serif; background:#0a0a0b; margin:0; }\r\n  .deck { display:grid; gap:24px; padding:24px; }\r\n  .slide { width:100%; aspect-ratio:16/9; max-width:1280px; margin:0 auto; position:relative; overflow:hidden; }\r\n  .paper { background:#f1efea; color:#0a0a0b; }\r\n  .ink { background:#0a0a0b; color:#f1efea; }\r\n  .display { font-family:'Playfair Display','Noto Serif SC',serif; }\r\n  .body-serif { font-family:'Playfair Display','Noto Serif SC',serif; font-style:italic; }\r\n  .kicker { font-size:11px; letter-spacing:0.12em; text-transform:uppercase; font-weight:500; }\r\n  .hairline { border:0; border-top:1px solid currentColor; opacity:0.3; }\r\n  .folio { font-feature-settings:'tnum'; font-variant-numeric:tabular-nums; }\r\n</style>\r\n</head>\r\n<body>\r\n<div class=\"deck\">\r\n\r\n  <!-- L02 Act Divider · ink reverse -->\r\n  <section class=\"slide ink\">\r\n    <div class=\"absolute inset-0 p-12 flex flex-col justify-between\">\r\n      <header class=\"flex items-baseline justify-between kicker opacity-70\">\r\n        <span>OPEN DESIGN — Issue №26</span>\r\n        <span>Act II</span>\r\n        <span class=\"folio\">04 / 12</span>\r\n      </header>\r\n      <div>\r\n        <div class=\"kicker opacity-80\">第二章</div>\r\n        <h1 class=\"display mt-4 leading-[0.95]\" style=\"font-size:clamp(64px,9vw,160px); font-weight:500;\">\r\n          为什么<br/>\r\n          <span class=\"body-serif\">写作者</span>该写 HTML<br/>\r\n          而不是 Markdown。\r\n        </h1>\r\n      </div>\r\n      <footer class=\"flex items-baseline justify-between kicker opacity-60\">\r\n        <span>BY Open Design · 2026 SPRING</span>\r\n        <span class=\"body-serif normal-case tracking-normal\">A magazine for editorial agents.</span>\r\n      </footer>\r\n    </div>\r\n  </section>\r\n\r\n  <!-- L03 Big Numbers Grid · paper -->\r\n  <section class=\"slide paper\">\r\n    <div class=\"absolute inset-0 p-12 flex flex-col justify-between\">\r\n      <header class=\"flex items-baseline justify-between kicker\" style=\"color:#3a382f\">\r\n        <span>OPEN DESIGN — Issue №26</span>\r\n        <span>Numbers</span>\r\n        <span class=\"folio\">05 / 12</span>\r\n      </header>\r\n      <div>\r\n        <div class=\"kicker\" style=\"color:#6b665b\">By the numbers</div>\r\n        <h2 class=\"display mt-2 leading-[1.0]\" style=\"font-size:clamp(36px,5vw,72px); font-weight:500;\">\r\n          四个数字, <span class=\"body-serif\">一条线</span> —— HTML 已经赢了。\r\n        </h2>\r\n      </div>\r\n      <div class=\"grid grid-cols-4 gap-8 mt-4\">\r\n        <article class=\"border-t pt-4\" style=\"border-color:#0a0a0b\">\r\n          <div class=\"kicker\" style=\"color:#6b665b\">现有模板</div>\r\n          <div class=\"display mt-2\" style=\"font-size:84px; font-weight:500; line-height:1;\">75</div>\r\n          <p class=\"mt-3 text-[13px] leading-snug\" style=\"color:#3a382f\"><span class=\"body-serif\">+16</span> in this release; cover slides, docs, frames.</p>\r\n        </article>\r\n        <article class=\"border-t pt-4\" style=\"border-color:#0a0a0b\">\r\n          <div class=\"kicker\" style=\"color:#6b665b\">本地 Agent</div>\r\n          <div class=\"display mt-2\" style=\"font-size:84px; font-weight:500; line-height:1;\">17</div>\r\n          <p class=\"mt-3 text-[13px] leading-snug\" style=\"color:#3a382f\">Claude · Codex · Cursor · Gemini · Copilot, all <span class=\"body-serif\">stdin</span>.</p>\r\n        </article>\r\n        <article class=\"border-t pt-4\" style=\"border-color:#0a0a0b\">\r\n          <div class=\"kicker\" style=\"color:#6b665b\">平均生成</div>\r\n          <div class=\"display mt-2\" style=\"font-size:84px; font-weight:500; line-height:1;\">80<span class=\"body-serif text-[40px]\">s</span></div>\r\n          <p class=\"mt-3 text-[13px] leading-snug\" style=\"color:#3a382f\">一份杂志风 PPT, <span class=\"body-serif\">31KB</span> 自包含 HTML.</p>\r\n        </article>\r\n        <article class=\"border-t pt-4\" style=\"border-color:#0a0a0b\">\r\n          <div class=\"kicker\" style=\"color:#6b665b\">API Keys</div>\r\n          <div class=\"display mt-2\" style=\"font-size:84px; font-weight:500; line-height:1;\">0</div>\r\n          <p class=\"mt-3 text-[13px] leading-snug\" style=\"color:#3a382f\">复用你 <span class=\"body-serif\">已经登录</span>的 CLI session.</p>\r\n        </article>\r\n      </div>\r\n      <footer class=\"flex items-baseline justify-between kicker opacity-70\" style=\"color:#3a382f\">\r\n        <span>Source: HTML-Anything internal · 2026-05</span>\r\n        <span class=\"body-serif normal-case tracking-normal\">Set in Playfair &amp; Inter.</span>\r\n      </footer>\r\n    </div>\r\n  </section>\r\n\r\n</div>\r\n</body>\r\n</html>\r\n","deck-guizang-editorial/example.md":"# 关于「HTML 取代 Markdown」\r\n\r\n> 墨水经典调色板, 双页预览: L02 章节封页 + L03 Big Numbers\r\n\r\n## 主题\r\nClaude Code 团队全面转向 HTML — 我们为什么也该跟上。\r\n\r\n## 关键数据\r\n- 75: HTML Anything 现有模板数\r\n- 17: 已接入的本地 AI agent\r\n- 80s: 平均一次\"杂志风网页 PPT\"生成耗时\r\n- 0: 用户需要的 API key 数量\r\n","deck-guizang-editorial/SKILL.md":"---\r\nname: deck-guizang-editorial\r\nzh_name: \"贵赞编辑墨水 Deck\"\r\nen_name: \"Guizang Editorial E-Ink Deck\"\r\nemoji: \"🖋️\"\r\ndescription: \"电子杂志 × 电子墨水; 10 个版面 + 5 套调色板 (墨水/靛蓝瓷/森林墨/牛皮纸/沙丘)\"\r\ncategory: slides\r\nscenario: marketing\r\naspect_hint: \"16:9 横向翻页\"\r\nfeatured: 49\r\nrecommended: 1\r\ntags: [\"editorial\", \"e-ink\", \"magazine\", \"narrative\", \"guizang\"]\r\nexample_id: sample-guizang-editorial\r\nexample_name: \"贵赞编辑墨水 · 章节封页\"\r\nexample_format: markdown\r\nexample_tagline: \"墨水经典调色板 + 衬线 display\"\r\nexample_desc: \"L02 Act Divider 章节封页 + L03 Big Numbers Grid 数据格, 纸感印刷\"\r\nexample_source_url: \"https://github.com/op7418/guizang-ppt-skill\"\r\nexample_source_label: \"op7418/guizang-ppt-skill\"\r\n---\r\n\r\n【模板: 贵赞编辑墨水 Deck (Editorial × E-Ink)】\r\n【意图】叙事、观点、分享、个人风格表达。墨纸印刷感, 不要科技感。Inspired by op7418/guizang-ppt-skill Style A。\r\n\r\n【调色板 — 5 选 1, 严禁改 hex、严禁混用】\r\n- 🖋 **墨水经典 Monocle** — ink `#0a0a0b`, paper `#f1efea`, paper-tint `#e8e5de`, ink-tint `#18181a`. 默认 / 通用商业 / 科技。\r\n- 🌊 **靛蓝瓷 Indigo Porcelain** — ink `#0a1f3d`, paper `#f1f3f5`, paper-tint `#e4e8ec`, ink-tint `#152a4a`. 科技 / 研究 / 数据。\r\n- 🌿 **森林墨 Forest Ink** — ink `#1a2e1f`, paper `#f5f1e8`, paper-tint `#ece7da`, ink-tint `#253d2c`. 自然 / 可持续 / 文化。\r\n- 🍂 **牛皮纸 Kraft Paper** — ink `#2a1e13`, paper `#eedfc7`, paper-tint `#e0d0b6`, ink-tint `#3a2a1d`. 怀旧 / 人文 / 文学。\r\n- 🌙 **沙丘 Dune** — ink `#1f1a14`, paper `#f0e6d2`, paper-tint `#e3d7bf`, ink-tint `#2d2620`. 艺术 / 设计 / 时尚。\r\n\r\n【布局 — 10 个磁带式版式池, 可复用; **数量由【用户内容】决定**, 完整覆盖每个要点; 短内容 6-12 张起步, 长内容应更多 (同一版式可在不同章节重复使用)】\r\n- **L01 Hero Cover** — 居中大字 hero typography + kicker + subtitle + lead paragraph + 底部元数据 row。\r\n- **L02 Act Divider** — kicker + 8.5-10vw 巨大 headline + 一句引言; 章节切换可反色 (ink ↔ paper)。\r\n- **L03 Big Numbers Grid** — 3×2 数据卡 (label / 大数字 / 注释)。\r\n- **L04 Quote + Image** — 左 kicker + headline + body + callout; 右 16:10 图 (基线对齐 baseline 不是 top)。\r\n- **L05 Image Grid** — 3×2 或 3×1 等高图网格 (26vh 或 22vh); 严格统一高度。\r\n- **L06 Pipeline / Flow** — 横向编号步骤组, 每步: №X + 标题 + 描述; 支持键盘逐步推进。\r\n- **L07 Hero Question** — 7vw 全屏单一问句, 按语义断行, 周围极简。\r\n- **L08 Big Quote** — 5.8vw 巨大衬线引文 + 英文翻译 + 署名 + 日期。\r\n- **L09 Before / After** — 1:1 split; 左列 opacity .55 (旧/before); 右列 full brightness (新/after)。\r\n- **L10 Mixed Media** — 8:4 比例; 左大段文字 (kicker / headline / body / callout) + 右 3:4 竖图作辅助。\r\n\r\n【设计细节】\r\n- **严禁**: 渐变 / drop-shadow / 圆角 / 圆形装饰 / blur / SVG 图标库 / emoji 装饰。\r\n- **字体**: Display 用 `Playfair Display` (英) / `Noto Serif SC` (中); Body 用 `Inter` / `Noto Sans SC`; 编号 / 数字偶尔可用 italic 衬线。\r\n- **杂志感细节**: kicker 用 11px uppercase letterspacing 0.12em; folio 右下角 `01 / 12`; 顶部细 hairline rule + 期刊 logo / topic。\r\n- **不许**: 数据捏造、Lorem ipsum、占位图片 URL。所有图请用纯 CSS / SVG 内联描绘 (色块 + 简笔)。\r\n- 键盘 ← / → 切换; hash 同步; 单文件 HTML。\r\n","deck-ljg-present/example.md":"# AI\r\n\r\n## 为什么说 AI 是一次革命？\r\n\r\n人类革命：能力让渡的层级跃迁\r\n\r\n- 「人之为人」重新定义\r\n- 社会组织重排\r\n- 知识工人的角色被换骨\r\n\r\n## 三件该重做的事\r\n\r\n- 写作的形式\r\n- 阅读的载体\r\n- 表达的速度\r\n\r\n---\r\n\r\n## 你只是一个观众吗？\r\n","deck-ljg-present/SKILL.md":"---\r\nname: deck-ljg-present\r\nzh_name: \"宣言式演讲（Outline-Faithful）\"\r\nen_name: \"Outline-Faithful Manifesto Deck\"\r\nemoji: \"✊\"\r\ndescription: \"把 outline 1:1 铸成色块大字宣言 deck, 原文不动只做美化。三档主题 black / red / yellow\"\r\ncategory: slides\r\nscenario: creator\r\naspect_hint: \"16:9 横向翻页\"\r\ntags: [\"deck\", \"manifesto\", \"slogan\", \"outline\", \"宣言\", \"演讲\", \"色块\", \"大字\", \"ultra-bold\"]\r\nexample_id: sample-ljg-present-ai\r\nexample_name: \"宣言式演讲 · AI 革命\"\r\nexample_format: markdown\r\nexample_tagline: \"Red 宣言 · 错位大字 · 左对齐\"\r\nexample_desc: \"8 页 outline-faithful 演讲, 一级标题封面 + 列表错位 + 分隔符休止页 + 收束反问, 全程不重写原文\"\r\nexample_source_url: \"https://github.com/lijigang/ljg-skills/tree/md/skills/ljg-present\"\r\nexample_source_label: \"lijigang/ljg-skills · ljg-present\"\r\n---\r\n\r\n【模板: 宣言式演讲（Outline-Faithful）】\r\n\r\n【意图】把用户的 outline / markdown 1:1 视觉化为色块大字 manifesto deck。**不抽提、不重写、不重排、不浓缩**——只决定每一行/每一节渲染为哪一页。审美参考：Felipe Franco / BIG STUDIOS 的 manifesto 大字海报。\r\n\r\n【铁律 — 全部违反必须重做】\r\n- 标题不改字, 段落不改字, 列表不改字, 顺序不重排\r\n- 唯一允许的\"动\"是**物理分页**（一段太长拆成多页）\r\n- 不抽 manifesto / 不写新句子 / 不删内容 / 不放图片图标 / 不用过渡动画\r\n- 一篇只用一个主题色（black / red / yellow 三选一）\r\n\r\n【outline → 页面映射】\r\n\r\n| 输入元素 | 输出页 |\r\n|---|---|\r\n| `# 一级标题` | 独占 **emphasis** 封面页（accent 底色, 通常单字/单短词） |\r\n| `## 二级标题` | 独占 **theme** 页（大字标题独占一页） |\r\n| `### 三级标题`+ | 独占 theme 页（字号自动降一档） |\r\n| 段落（≤30字） | 单 theme 页 |\r\n| 段落（30-80字, 多句号） | 每句一页（medium 档） |\r\n| 段落（>80字） | 按 ~30 字一页拆, 末尾加 `⋯` |\r\n| `- 列表项`（≤4） | 一页全展示, indent 按嵌套深度 0/1/2 |\r\n| 列表 5-8 项 | 拆 2 页, 每页 3-4 项, 项数接近 |\r\n| 列表 >8 项 | 拆多页, 每页 4 项 |\r\n| 表格 ≤6 行 | 单页 |\r\n| 表格 >6 行 | 拆多页, 每页保留表头 |\r\n| `**强调**` / `` `code` `` | 自动 `hl: true` |\r\n| `---` 分隔符 | 独立 **emphasis 休止页**（空 emphasis, 纯色块） |\r\n\r\n**首末页自动 emphasis**：文档首段（如已是 `#` 则合并）+ 文档末段 = emphasis 开场 / 收束页。一级标题就是天然的章节断点, 不要为了凑节奏强行加 emphasis。\r\n\r\n【主题色推断 — 一篇只能一个】\r\n\r\n| 文档调性 / 标签 | theme | 默认页 | emphasis 页 | hl 色（仅 theme 页生效） |\r\n|---|---|---|---|---|\r\n| 沉思 / 论证 / 笔记（默认） | **black** | 黑底白字 | 红底白字 | 红 `#E63956` |\r\n| 宣言 / 号召 / 演讲（含 `share` / `manifesto` / `keynote` / `talk` 标签或语气） | **red** | 红底白字 | 黑底白字 | 柔金黄 `#FFE082` |\r\n| 反讽 / 警觉 / 批判（含 `critique` / `warn` / `rant`） | **yellow** | 黄底黑字 | 黑底白字 | 红 `#E63956` |\r\n\r\n显式覆盖：用户写\"用 red / 用 yellow / 用黑底\"即按指令。无任何线索时默认 black。\r\n\r\n【视觉规范 — 数值锁死】\r\n\r\n色板（仅 4 色, 不许改 hex）：\r\n```\r\n--c-black:  #1A1A1A\r\n--c-red:    #E63956\r\n--c-yellow: #FFD400\r\n--c-white:  #FFFFFF\r\n--c-gold:   #FFE082\r\n```\r\n\r\n字体栈（必须用 ultra-bold 900, letter-spacing `-0.05em`）：\r\n```\r\n\"Helvetica Neue\", \"Arial Black\", \"Inter\", \"PingFang SC\", \"Heiti SC\", \"STHeiti\", -apple-system, sans-serif\r\nfont-weight: 900\r\n```\r\n\r\n字号档位（按本页**最长那一行**字符数, CJK 按 1.8 计权, 多行页降一档）：\r\n\r\n| 档位 | 字符数 | font-size |\r\n|---|---|---|\r\n| single | ≤2 | `clamp(320px, 80vmin, 1100px)` |\r\n| short | 3-6 | `clamp(240px, 55vmin, 780px)` |\r\n| medium | 7-14 | `clamp(150px, 35vmin, 480px)` |\r\n| long | 15-26 | `clamp(100px, 22vmin, 320px)` |\r\n| xlong | 27+ | `clamp(64px, 14vmin, 200px)` |\r\n\r\n排版：\r\n- padding `6vmin 7vmin`, 让大字撑满边缘\r\n- `.lines` 块在屏幕内水平居中, 但块内每行 **left-aligned**（消除右侧空白同时保 indent 错位）\r\n- line-height `1.05`, 行间 gap `0.15em`\r\n- 内容垂直居中\r\n- 页脚：左下页码（`01 / 08`）+ 右下副标题, 13px monospace, opacity 0.5, uppercase, letter-spacing `0.12em`\r\n- emphasis 页：背景换 `--acc-bg`, 字色换 `--acc-fg`, 行内 `.hl` 自动 `color: inherit`（emphasis 整页就是高亮）\r\n- indent 档位：0 = `0`, 1 = `7vmin`, 2 = `16vmin`\r\n\r\n【输出契约】\r\n\r\n输出**单文件 HTML**, 完全自包含, inline CSS + inline JS, 直接在 iframe sandbox 里能跑。骨架照下面这个模板, 把 `SLIDES` 数组、`<title>`、`{{SUBTITLE}}`、`body[data-theme]` 填好即可。**不要外链 CDN, 不要外部资源**。\r\n\r\nSLIDES 数组每项形态：\r\n```js\r\n// 默认 theme 页\r\n{ lines: [ { indent: 0, chunks: [ {t: \"前段\"}, {t: \"高亮词\", hl: true}, {t: \"后段\"} ] } ] }\r\n// emphasis 页（accent 底色, inline hl 自动忽略）\r\n{ emphasis: true, lines: [ { indent: 0, chunks: [ {t: \"AI\"} ] } ] }\r\n// 休止页 = emphasis + 空 lines\r\n{ emphasis: true, lines: [] }\r\n```\r\n\r\n完整 HTML 骨架（agent 应**复用 CSS 与 JS 不要改**, 只填 SLIDES / title / subtitle / data-theme）：\r\n\r\n```html\r\n<!DOCTYPE html>\r\n<html lang=\"zh-CN\">\r\n<head>\r\n<meta charset=\"UTF-8\">\r\n<meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\">\r\n<title><!-- 文档标题 --></title>\r\n<style>\r\n  :root {\r\n    --c-black: #1A1A1A; --c-red: #E63956; --c-yellow: #FFD400;\r\n    --c-white: #FFFFFF; --c-gold: #FFE082;\r\n  }\r\n  * { margin: 0; padding: 0; box-sizing: border-box; }\r\n  html, body {\r\n    width: 100%; height: 100%;\r\n    font-family: \"Helvetica Neue\", \"Arial Black\", \"Inter\", \"PingFang SC\", \"Heiti SC\", \"STHeiti\", -apple-system, sans-serif;\r\n    font-weight: 900; overflow: hidden;\r\n    -webkit-font-smoothing: antialiased;\r\n    letter-spacing: -0.05em;\r\n  }\r\n  body[data-theme=\"black\"]  { --bg: var(--c-black);  --fg: var(--c-white); --acc-bg: var(--c-red);   --acc-fg: var(--c-white); --hl: var(--c-red); }\r\n  body[data-theme=\"red\"]    { --bg: var(--c-red);    --fg: var(--c-white); --acc-bg: var(--c-black); --acc-fg: var(--c-white); --hl: var(--c-gold); }\r\n  body[data-theme=\"yellow\"] { --bg: var(--c-yellow); --fg: var(--c-black); --acc-bg: var(--c-black); --acc-fg: var(--c-white); --hl: var(--c-red); }\r\n  body { background: var(--bg); }\r\n  .stage { position: fixed; inset: 0; }\r\n  .slide {\r\n    position: absolute; inset: 0; display: none;\r\n    flex-direction: column; justify-content: center; align-items: center;\r\n    padding: 6vmin 7vmin;\r\n    background: var(--bg); color: var(--fg);\r\n  }\r\n  .slide.active { display: flex; }\r\n  .slide[data-emphasis=\"true\"] { background: var(--acc-bg); color: var(--acc-fg); }\r\n  .slide .hl { color: var(--hl); }\r\n  .slide[data-emphasis=\"true\"] .hl { color: inherit; }\r\n  .lines { display: flex; flex-direction: column; gap: 0.15em; line-height: 1.05; max-width: 100%; align-items: flex-start; }\r\n  .line { white-space: nowrap; text-align: left; }\r\n  .line[data-indent=\"0\"] { padding-left: 0; }\r\n  .line[data-indent=\"1\"] { padding-left: 7vmin; }\r\n  .line[data-indent=\"2\"] { padding-left: 16vmin; }\r\n  .slide[data-len=\"single\"] .lines { font-size: clamp(320px, 80vmin, 1100px); }\r\n  .slide[data-len=\"short\"]  .lines { font-size: clamp(240px, 55vmin, 780px); }\r\n  .slide[data-len=\"medium\"] .lines { font-size: clamp(150px, 35vmin, 480px); }\r\n  .slide[data-len=\"long\"]   .lines { font-size: clamp(100px, 22vmin, 320px); }\r\n  .slide[data-len=\"xlong\"]  .lines { font-size: clamp(64px,  14vmin, 200px); }\r\n  .pager, .subtitle {\r\n    position: fixed; bottom: 2.5vmin;\r\n    font-family: \"Menlo\", \"Monaco\", monospace;\r\n    font-size: 13px; font-weight: 400; letter-spacing: 0.12em;\r\n    user-select: none; z-index: 10; text-transform: uppercase;\r\n    opacity: 0.5; color: var(--fg);\r\n  }\r\n  .pager { left: 3vmin; }\r\n  .subtitle { right: 3vmin; }\r\n  body[data-current=\"emphasis\"] .pager,\r\n  body[data-current=\"emphasis\"] .subtitle { color: var(--acc-fg); }\r\n</style>\r\n</head>\r\n<body data-theme=\"red\"><!-- black|red|yellow -->\r\n<div class=\"stage\" id=\"stage\"></div>\r\n<div class=\"pager\" id=\"pager\">01 / 01</div>\r\n<div class=\"subtitle\" id=\"subtitle\"><!-- 副标题 / 品牌, 可空 --></div>\r\n<script>\r\n  const SLIDES = [ /* 填入按 outline 映射出的 slides 数组 */ ];\r\n  const stage = document.getElementById('stage');\r\n  const pager = document.getElementById('pager');\r\n  const body = document.body;\r\n  function lineCharLen(chunks) {\r\n    const CJK = /[　-〿㐀-䶿一-鿿豈-﫿＀-￯]/;\r\n    return chunks.reduce((acc, c) => {\r\n      let len = 0;\r\n      for (const ch of (c.t || '')) len += CJK.test(ch) ? 1.8 : 1;\r\n      return acc + len;\r\n    }, 0);\r\n  }\r\n  function maxLineLen(lines) { return lines && lines.length ? Math.max(...lines.map(l => lineCharLen(l.chunks || []))) : 0; }\r\n  function lengthTier(maxLen, lineCount) {\r\n    const adj = maxLen + Math.max(0, lineCount - 1) * 4;\r\n    if (adj <= 2)  return 'single';\r\n    if (adj <= 6)  return 'short';\r\n    if (adj <= 14) return 'medium';\r\n    if (adj <= 26) return 'long';\r\n    return 'xlong';\r\n  }\r\n  function escapeHtml(s) {\r\n    return String(s == null ? '' : s)\r\n      .replace(/&/g, '&amp;').replace(/</g, '&lt;')\r\n      .replace(/>/g, '&gt;').replace(/\"/g, '&quot;').replace(/'/g, '&#39;');\r\n  }\r\n  SLIDES.forEach((s) => {\r\n    const el = document.createElement('div');\r\n    el.className = 'slide';\r\n    if (s.emphasis) el.setAttribute('data-emphasis', 'true');\r\n    if (s.lines && s.lines.length) {\r\n      el.setAttribute('data-len', lengthTier(maxLineLen(s.lines), s.lines.length));\r\n      const linesEl = document.createElement('div');\r\n      linesEl.className = 'lines';\r\n      s.lines.forEach(line => {\r\n        const lineEl = document.createElement('div');\r\n        lineEl.className = 'line';\r\n        lineEl.setAttribute('data-indent', String(line.indent || 0));\r\n        lineEl.innerHTML = (line.chunks || []).map(c => {\r\n          const t = escapeHtml(c.t);\r\n          return c.hl ? '<span class=\"hl\">' + t + '</span>' : t;\r\n        }).join('');\r\n        linesEl.appendChild(lineEl);\r\n      });\r\n      el.appendChild(linesEl);\r\n    }\r\n    stage.appendChild(el);\r\n  });\r\n  const slides = stage.querySelectorAll('.slide');\r\n  let idx = 0;\r\n  function show(i) {\r\n    if (i < 0) i = 0; if (i >= slides.length) i = slides.length - 1;\r\n    slides[idx].classList.remove('active');\r\n    idx = i;\r\n    slides[idx].classList.add('active');\r\n    pager.textContent = String(idx + 1).padStart(2, '0') + ' / ' + String(slides.length).padStart(2, '0');\r\n    body.setAttribute('data-current', slides[idx].getAttribute('data-emphasis') === 'true' ? 'emphasis' : 'theme');\r\n  }\r\n  function next() { show(idx + 1); }\r\n  function prev() { show(idx - 1); }\r\n  document.addEventListener('keydown', (e) => {\r\n    switch (e.key) {\r\n      case 'ArrowRight': case ' ': case 'Enter': case 'j': case 'PageDown': e.preventDefault(); next(); break;\r\n      case 'ArrowLeft': case 'k': case 'PageUp': e.preventDefault(); prev(); break;\r\n      case 'Home': e.preventDefault(); show(0); break;\r\n      case 'End': e.preventDefault(); show(slides.length - 1); break;\r\n      case 'f': case 'F': e.preventDefault(); document.fullscreenElement ? document.exitFullscreen?.() : document.documentElement.requestFullscreen?.(); break;\r\n    }\r\n  });\r\n  let touchX = null;\r\n  document.addEventListener('touchstart', (e) => { touchX = e.touches[0].clientX; });\r\n  document.addEventListener('touchend', (e) => {\r\n    if (touchX == null) return;\r\n    const dx = e.changedTouches[0].clientX - touchX;\r\n    if (dx < -40) next(); else if (dx > 40) prev();\r\n    touchX = null;\r\n  });\r\n  document.addEventListener('click', (e) => {\r\n    if (e.target.closest('.pager,.subtitle')) return;\r\n    const mid = window.innerWidth / 2;\r\n    if (e.clientX > mid) next(); else prev();\r\n  });\r\n  show(0);\r\n</script>\r\n</body>\r\n</html>\r\n```\r\n\r\n【调用流程 — agent 内部】\r\n1. 读用户内容（markdown / outline / 纯文本）\r\n2. 按上面表格做 **outline → slides 数组** 映射, 不抽提不重写\r\n3. 推断 theme（标签 > 语气 > 默认 black）\r\n4. 复用骨架, 替换 `<title>` / `data-theme` / `<div id=\"subtitle\">` 内容 / `SLIDES` 数组\r\n5. 一次性输出整个 HTML 文档\r\n\r\n【品味准则】\r\n- outline 是真理, skill 是渲染器\r\n- 一级标题 = emphasis 封面（天然章节断点）\r\n- 二级标题 = 独占 theme 页（给标题应有的重量）\r\n- 列表错位靠 indent 0/1/2 体现嵌套深度\r\n- `**强调**` 自动 hl\r\n- 拆页保持视觉一致性（同源块字号/缩进对齐）\r\n- 左对齐不居中——这是 manifesto 美学的灵魂\r\n\r\n【禁区】\r\n- 不抽 manifesto（不要\"找钉子\", 作者已经写好了 outline）\r\n- 不写新句子、不重组顺序、不删内容\r\n- 不放图片 / 不放图标 / 不加过渡动画\r\n- 不在 emphasis 页用 inline hl（emphasis 整页就是高亮）\r\n- 不混用多个 theme（一篇一个气质）\r\n- 不擅自加 emphasis（只有一级标题 / 首末页 / 分隔符）\r\n\r\n【致谢】\r\n本 skill 改编自 [lijigang/ljg-skills · ljg-present](https://github.com/lijigang/ljg-skills/tree/md/skills/ljg-present)（v3.0.0）。原版输出多主题包含 cyber-hacker 模式与 PNG 投影; html-anything 版只保留 3 主题 + 单文件 HTML 输出。审美灵感继续指向 Felipe Franco / BIG STUDIOS 的 manifesto 字体海报。\r\n","deck-magazine-web/SKILL.md":"---\r\nname: deck-magazine-web\r\nzh_name: \"杂志风网页 PPT\"\r\nen_name: \"Magazine Web Deck\"\r\nemoji: \"📰\"\r\ndescription: \"电子杂志 × 电子墨水风, WebGL 流体背景 + 衬线 display\"\r\ncategory: slides\r\nscenario: marketing\r\naspect_hint: \"16:9 横向翻页\"\r\nfeatured: 9\r\ntags: [\"magazine\", \"editorial\", \"e-ink\", \"horizontal swipe\"]\r\n---\r\n\r\n【模板: 杂志风网页 PPT (magazine-web-ppt)】\r\n【意图】horizontal-swipe HTML deck, 杂志 × e-ink 调。\r\n【布局】\r\n- Cover (衬线 display + WebGL 流体背景)\r\n- 章节幕封页\r\n- 数据大字报页 (一个巨数字 + 一句解释)\r\n- 图片网格页\r\n- 金句页 (Sunday-paper 风)\r\n【设计细节】\r\n- 字体: Playfair / Noto Serif SC display + Inter / 思源 sans body\r\n- 键盘 ← / → 切换; hash 同步\r\n","deck-open-slide-canvas/example.html":"<!DOCTYPE html>\r\n<html lang=\"zh-CN\">\r\n<head>\r\n<meta charset=\"UTF-8\" />\r\n<title>Open-Slide Canvas · 一句问题</title>\r\n<script src=\"https://cdn.tailwindcss.com\"></script>\r\n<link href=\"https://fonts.googleapis.com/css2?family=Inter+Tight:wght@400;500;600;700;800;900&family=Inter:wght@400;500&family=Noto+Sans+SC:wght@400;500;700&family=JetBrains+Mono:wght@400;500&display=swap\" rel=\"stylesheet\" />\r\n<style>\r\n  body { font-family:'Inter Tight','Noto Sans SC',system-ui,sans-serif; background:#020306; margin:0; min-height:100vh; }\r\n  .slide-frame { width:1280px; height:720px; transform:scale(0.78); transform-origin: top left; }\r\n  .canvas { background:#0a0e1a; color:#f5f5f7; }\r\n  .accent { color:#5ac8fa; }\r\n  .mono { font-family:'JetBrains Mono',ui-monospace,monospace; }\r\n  /* hairline diag bg */\r\n  .grain {\r\n    background-image:\r\n      radial-gradient(circle at 20% 80%, rgba(90,200,250,0.10) 0%, transparent 50%),\r\n      radial-gradient(circle at 80% 30%, rgba(124,92,255,0.08) 0%, transparent 55%);\r\n  }\r\n</style>\r\n</head>\r\n<body class=\"p-10 overflow-hidden\">\r\n<div class=\"slide-frame canvas grain relative\">\r\n  <div class=\"absolute inset-0 p-32 flex flex-col justify-between\">\r\n    <header class=\"flex items-baseline justify-between mono text-[11px] uppercase tracking-[0.18em] opacity-60\">\r\n      <span>HTML-ANYTHING · DECK · OPEN-SLIDE CANVAS</span>\r\n      <span>SEA INDIGO</span>\r\n      <span>№05 / 12</span>\r\n    </header>\r\n\r\n    <div>\r\n      <div class=\"mono text-[12px] uppercase tracking-[0.22em] accent\">Question 03</div>\r\n      <h1 class=\"mt-6 font-black leading-[0.95] tracking-[-0.025em]\" style=\"font-size:120px\">\r\n        当生成内容的成本<br/>\r\n        逼近 <span class=\"accent\">零</span>, 留下的<br/>\r\n        只有 <em class=\"not-italic\" style=\"font-family:'Source Serif Pro',serif;font-style:italic;font-weight:500\">品味</em>。\r\n      </h1>\r\n      <p class=\"mt-10 text-[28px] opacity-70 max-w-[820px] leading-snug\">\r\n        你打算在哪一帧上, 让读者停下来?\r\n      </p>\r\n    </div>\r\n\r\n    <footer class=\"flex items-baseline justify-between mono text-[11px] uppercase tracking-[0.18em] opacity-50\">\r\n      <span>1920 × 1080 · CANVAS · KBD ← →</span>\r\n      <span class=\"accent\">github.com/1weiho/open-slide</span>\r\n      <span>00 : 03 : 21</span>\r\n    </footer>\r\n  </div>\r\n</div>\r\n</body>\r\n</html>\r\n","deck-open-slide-canvas/example.md":"# 一句关键问题\r\n\r\n> Sea Indigo 调色, 单页 hero question 风格\r\n\r\n## 问题\r\n当生成内容的成本逼近零, 留下的只有品味 —— 你打算在哪一帧上, 让读者停下来?\r\n","deck-open-slide-canvas/SKILL.md":"---\r\nname: deck-open-slide-canvas\r\nzh_name: \"1920 画布自由 Deck\"\r\nen_name: \"Open-Slide 1920 Canvas Deck\"\r\nemoji: \"🎨\"\r\ndescription: \"锁死 1920×1080 画布, React 组件级自由组合, 不绑模板\"\r\ncategory: slides\r\nscenario: design\r\naspect_hint: \"1920×1080 (16:9)\"\r\nfeatured: 35\r\nrecommended: 9\r\ntags: [\"canvas\", \"open-slide\", \"freeform\", \"1920\", \"react\"]\r\nexample_id: sample-deck-open-slide-canvas\r\nexample_name: \"1920 自由画布 · Sea Indigo\"\r\nexample_format: markdown\r\nexample_tagline: \"锁死 1920×1080 + 自由组合\"\r\nexample_desc: \"Sea Indigo 调色 + 一页大字 question + 角标\"\r\nexample_source_url: \"https://github.com/1weiho/open-slide\"\r\nexample_source_label: \"1weiho/open-slide\"\r\n---\r\n\r\n【模板: 1920 画布自由 Deck】\r\n【意图】不想被模板束缚的场景 (个人作品集、奇特演讲、艺术 / 设计课 deck)。给一个固定 1920×1080 画布 + 极强的类型 / 调色约束, 让 agent 像写 React 组件一样按内容自由排布每一页。Inspired by 1weiho/open-slide。\r\n\r\n【硬性技术规格】\r\n- 画布: 每页严格 `width: 1920px; height: 1080px;` 用 `transform: scale(...)` 适配视窗 (默认 `scale(0.7)` 居中)。\r\n- **绝对禁止 overflow**: 每页内容必须 fit in 1920×1080, 不许滚动条出现。\r\n- 字号 type scale (px): `2xs:18 · xs:22 · sm:28 · md:36 · lg:48 · xl:64 · 2xl:88 · 3xl:120 · 4xl:160 · 5xl:220`。\r\n- 边距 padding: 96 / 128 / 160 三档之一。\r\n- 每页有 `<section class=\"slide\" data-slide-id=\"<n>\">`。\r\n\r\n【调色板 — 每个 deck 选 1 套, 全程不改】\r\n- 🌫 **Ash & Lime** — bg `#f1efea`, ink `#161616`, accent `#c5e803`。\r\n- 🌌 **Sea Indigo** — bg `#0a0e1a`, ink `#f5f5f7`, accent `#5ac8fa`。\r\n- 🧉 **Mate Mocha** — bg `#1a1411`, ink `#f5e9d6`, accent `#d97757`。\r\n- 🌸 **Pearl Rose** — bg `#fdf6f3`, ink `#1a1015`, accent `#ff5d8f`。\r\n\r\n【布局自由度 — 这是核心】\r\n- 不强制模板, 每页根据**内容性质**自选布局: cover / question / quote / image-text / 三列 / 五列 / 列表 / 数据卡 / 满版图。\r\n- 但每页**必须遵守一条规则**: 视觉重心 (visual hierarchy) 只有 1 个 — 一句金句、一个数字、一张图, 不要\"什么都强调\"。\r\n- 不许塞两段平等的文字; 真要并列就上 3 列等权重网格。\r\n\r\n【字体】\r\n- 西文: `Inter Tight` (display) + `Inter` (body); 或 `Source Serif Pro` (editorial 风时)。\r\n- 中文: `Noto Sans SC` (sans 风) 或 `Noto Serif SC` (editorial 风); 不混 sans + serif。\r\n- mono: `JetBrains Mono` 给数据 / 时间戳。\r\n\r\n【设计细节】\r\n- 严禁 emoji 装饰 (内容里的允许); 严禁多色彩虹; accent 只用一个色。\r\n- 严禁 SVG icon 套用 lucide / feather 等通用库 (自己写 inline SVG)。\r\n- 加键盘 ← / → 切换 + hash 同步; 角标固定: 右下 `№N/M`, 左下 deck title。\r\n- 必须用用户的真实内容; 严禁 lorem ipsum。\r\n- 单文件 HTML; Tailwind CDN; 不要外链图片。\r\n","deck-pitch/SKILL.md":"---\r\nname: deck-pitch\r\nzh_name: \"投资人 Pitch Deck\"\r\nen_name: \"Investor Pitch Deck\"\r\nemoji: \"🚀\"\r\ndescription: \"10 页融资 deck, 白底 + 蓝紫渐变 hero, traction 柱状, $X.XM ask\"\r\ncategory: slides\r\nscenario: finance\r\naspect_hint: \"16:9 ×10\"\r\nfeatured: 20\r\ntags: [\"pitch\", \"investor\", \"seed\", \"vc\"]\r\n---\r\n\r\n【模板: Investor Pitch Deck】\r\n【意图】10 页投资人 ready 的 fundraising deck。\r\n【布局】\r\n- Cover (Logo + Tagline + Round/$Ask)\r\n- Problem · Solution · Why Now\r\n- Product (截图占位)\r\n- Market size (TAM/SAM/SOM)\r\n- Traction (柱状图大数字)\r\n- Business model\r\n- Go-to-market\r\n- Team\r\n- Ask: $4.5M-style page\r\n- Thanks / Contact\r\n","deck-presenter-mode/SKILL.md":"---\r\nname: deck-presenter-mode\r\nzh_name: \"演讲者模式 Deck\"\r\nen_name: \"Presenter Mode Deck\"\r\nemoji: \"🎤\"\r\ndescription: \"tokyo-night 默认主题, T 切换 5 主题, S 打开提词器 popup\"\r\ncategory: slides\r\nscenario: engineering\r\naspect_hint: \"16:9\"\r\nfeatured: 26\r\ntags: [\"presenter\", \"notes\", \"提词\", \"teleprompter\"]\r\n---\r\n\r\n【模板: Presenter Mode Deck】\r\n【意图】怕忘词的演讲者专用 deck, 含逐字稿 notes 与 popup teleprompter。\r\n【布局】\r\n- 每页 + `<aside class=\"notes\">` 150-300 字稿\r\n- 右下小 toolbar: T 切主题 / S 打开 popup\r\n- Popup: CURRENT / NEXT / SCRIPT / TIMER 四张磁吸卡\r\n【设计细节】\r\n- 默认 tokyo-night; 共 5 套主题 (含 light)\r\n","deck-product-launch/example.html":"<!DOCTYPE html>\r\n<html lang=\"en\">\r\n<head>\r\n<meta charset=\"utf-8\"><meta name=\"viewport\" content=\"width=device-width,initial-scale=1\">\r\n<title>Halo v2 · Launch</title>\r\n<style>/* html-ppt :: shared webfonts */\r\n@import url('https://fonts.googleapis.com/css2?family=Inter:wght@200;300;400;500;600;700;800;900&display=swap');\r\n@import url('https://fonts.googleapis.com/css2?family=Noto+Sans+SC:wght@200;300;400;500;600;700;900&display=swap');\r\n@import url('https://fonts.googleapis.com/css2?family=Noto+Serif+SC:wght@300;400;600;700&display=swap');\r\n@import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;700&display=swap');\r\n@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,600;0,800;1,400&display=swap');\r\n@import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600;700&display=swap');\r\n@import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@300;400;500;700&display=swap');\r\n@import url('https://fonts.googleapis.com/css2?family=Archivo+Black&display=swap');\r\n\r\n</style>\r\n<style>/* html-ppt :: base.css — reset + shared tokens + layout primitives */\r\n/* Default tokens. Themes in assets/themes/*.css override the :root block. */\r\n:root {\r\n  --bg: #ffffff;\r\n  --bg-soft: #f7f7f8;\r\n  --surface: #ffffff;\r\n  --surface-2: #f2f2f4;\r\n  --border: rgba(0,0,0,.08);\r\n  --border-strong: rgba(0,0,0,.16);\r\n  --text-1: #111216;\r\n  --text-2: #55596a;\r\n  --text-3: #8a8f9e;\r\n  --accent: #3b6cff;\r\n  --accent-2: #7a5cff;\r\n  --accent-3: #ff5c8a;\r\n  --good: #1aaf6c;\r\n  --warn: #f5a524;\r\n  --bad:  #e0445a;\r\n  --grad: linear-gradient(135deg,#3b6cff,#7a5cff 55%,#ff5c8a);\r\n  --grad-soft: linear-gradient(135deg,#eef2ff,#f5ecff 55%,#ffeef5);\r\n  --radius: 18px;\r\n  --radius-sm: 12px;\r\n  --radius-lg: 26px;\r\n  --shadow: 0 10px 30px rgba(18,24,40,.08), 0 2px 6px rgba(18,24,40,.04);\r\n  --shadow-lg: 0 24px 60px rgba(18,24,40,.14), 0 6px 16px rgba(18,24,40,.06);\r\n  --font-sans: 'Inter','Noto Sans SC',-apple-system,BlinkMacSystemFont,Helvetica,Arial,sans-serif;\r\n  --font-serif: 'Playfair Display','Noto Serif SC',Georgia,serif;\r\n  --font-mono: 'JetBrains Mono','IBM Plex Mono',SFMono-Regular,Menlo,monospace;\r\n  --font-display: var(--font-sans);\r\n  --letter-tight: -.03em;\r\n  --letter-normal: -.01em;\r\n  --ease: cubic-bezier(.4,0,.2,1);\r\n}\r\n\r\n*,*::before,*::after{box-sizing:border-box}\r\nhtml,body{margin:0;padding:0;background:var(--bg);color:var(--text-1);\r\n  font-family:var(--font-sans);font-weight:400;line-height:1.6;\r\n  -webkit-font-smoothing:antialiased;-moz-osx-font-smoothing:grayscale;\r\n  letter-spacing:var(--letter-normal)}\r\nimg,svg,video{max-width:100%;display:block}\r\na{color:var(--accent);text-decoration:none}\r\na:hover{text-decoration:underline}\r\ncode,kbd,pre,samp{font-family:var(--font-mono)}\r\n\r\n/* ================= SLIDE SYSTEM ================= */\r\n.deck{position:relative;width:100vw;height:100vh;overflow:hidden;background:var(--bg)}\r\n.slide{\r\n  position:absolute;inset:0;\r\n  display:flex;flex-direction:column;justify-content:center;\r\n  padding:72px 96px;\r\n  box-sizing:border-box;\r\n  opacity:0;pointer-events:none;\r\n  transition:opacity .5s var(--ease), transform .5s var(--ease);\r\n  transform:translateX(30px);\r\n  overflow:hidden;\r\n}\r\n.slide.is-active{opacity:1;pointer-events:auto;transform:translateX(0);z-index:2}\r\n.slide.is-prev{transform:translateX(-30px)}\r\n\r\n/* single-page standalone (used when a layout file is opened directly) */\r\nbody.single .slide{position:relative;width:100vw;height:100vh;opacity:1;transform:none;pointer-events:auto}\r\n\r\n/* ================= TYPOGRAPHY ================= */\r\n.eyebrow{font-size:13px;font-weight:500;letter-spacing:.16em;text-transform:uppercase;color:var(--text-3)}\r\n.kicker{font-size:14px;font-weight:600;color:var(--accent);letter-spacing:.08em;text-transform:uppercase}\r\nh1.title,.h1{font-family:var(--font-display);font-size:72px;line-height:1.05;font-weight:800;letter-spacing:var(--letter-tight);margin:0 0 18px;color:var(--text-1)}\r\nh2.title,.h2{font-family:var(--font-display);font-size:54px;line-height:1.1;font-weight:700;letter-spacing:var(--letter-tight);margin:0 0 14px}\r\nh3,.h3{font-size:32px;line-height:1.2;font-weight:600;letter-spacing:var(--letter-normal);margin:0 0 10px}\r\nh4,.h4{font-size:22px;line-height:1.3;font-weight:600;margin:0 0 8px}\r\n.lede{font-size:22px;line-height:1.55;color:var(--text-2);font-weight:300;max-width:62ch}\r\n.dim{color:var(--text-2)}\r\n.dim2{color:var(--text-3)}\r\n.mono{font-family:var(--font-mono)}\r\n.serif{font-family:var(--font-serif)}\r\n.gradient-text{background:var(--grad);-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent;color:transparent}\r\n\r\n/* ================= LAYOUT PRIMITIVES ================= */\r\n.stack>*+*{margin-top:14px}\r\n.row{display:flex;gap:24px;align-items:center}\r\n.row.wrap{flex-wrap:wrap}\r\n.grid{display:grid;gap:24px}\r\n.g2{grid-template-columns:repeat(2,1fr)}\r\n.g3{grid-template-columns:repeat(3,1fr)}\r\n.g4{grid-template-columns:repeat(4,1fr)}\r\n.center{display:flex;align-items:center;justify-content:center;text-align:center}\r\n.fill{flex:1}\r\n.sp-t{padding-top:24px}.sp-b{padding-bottom:24px}\r\n.mt-s{margin-top:8px}.mt-m{margin-top:18px}.mt-l{margin-top:32px}\r\n.mb-s{margin-bottom:8px}.mb-m{margin-bottom:18px}.mb-l{margin-bottom:32px}\r\n\r\n/* ================= CARDS ================= */\r\n.card{background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);\r\n  padding:26px 28px;box-shadow:var(--shadow);position:relative;overflow:hidden}\r\n.card-soft{background:var(--surface-2);border:1px solid var(--border)}\r\n.card-outline{background:transparent;border:1.5px solid var(--border-strong);box-shadow:none}\r\n.card-accent{background:var(--surface);border-top:3px solid var(--accent)}\r\n.card-hover{transition:transform .3s var(--ease),box-shadow .3s var(--ease)}\r\n.card-hover:hover{transform:translateY(-4px);box-shadow:var(--shadow-lg)}\r\n\r\n.pill{display:inline-block;padding:4px 12px;border-radius:999px;font-size:12px;font-weight:500;\r\n  background:var(--surface-2);color:var(--text-2);border:1px solid var(--border)}\r\n.pill-accent{background:color-mix(in srgb,var(--accent) 12%,transparent);color:var(--accent);border-color:color-mix(in srgb,var(--accent) 28%,transparent)}\r\n\r\n/* ================= BARS / DIVIDERS ================= */\r\n.divider{height:1px;background:var(--border);width:100%}\r\n.divider-accent{height:3px;width:72px;background:var(--accent);border-radius:2px}\r\n\r\n/* ================= CHROME (header/footer/progress) ================= */\r\n.deck-header{position:absolute;top:24px;left:40px;right:40px;display:flex;align-items:center;justify-content:space-between;\r\n  font-size:12px;color:var(--text-3);letter-spacing:.12em;text-transform:uppercase;z-index:10;pointer-events:none}\r\n.deck-footer{position:absolute;bottom:24px;left:40px;right:40px;display:flex;align-items:center;justify-content:space-between;\r\n  font-size:12px;color:var(--text-3);z-index:10;pointer-events:none}\r\n.slide-number::before{content:attr(data-current)}\r\n.slide-number::after{content:\" / \" attr(data-total)}\r\n.progress-bar{position:fixed;left:0;right:0;bottom:0;height:3px;background:transparent;z-index:20}\r\n.progress-bar > span{display:block;height:100%;width:0;background:var(--accent);transition:width .3s var(--ease)}\r\n\r\n/* ================= PRESENTER / OVERVIEW ================= */\r\n.notes{display:none!important}\r\n.notes-overlay{position:fixed;inset:auto 0 0 0;max-height:42vh;background:rgba(20,22,30,.95);color:#e8ebf4;\r\n  padding:20px 32px;font-size:16px;line-height:1.6;border-top:1px solid rgba(255,255,255,.1);transform:translateY(100%);\r\n  transition:transform .3s var(--ease);z-index:40;overflow:auto;font-family:var(--font-sans)}\r\n.notes-overlay.open{transform:translateY(0)}\r\n.overview{position:fixed;inset:0;background:rgba(10,12,18,.92);backdrop-filter:blur(12px);z-index:50;\r\n  display:none;padding:40px;overflow:auto}\r\n.overview.open{display:grid;grid-template-columns:repeat(4,1fr);gap:20px;align-content:start}\r\n.overview .thumb{background:var(--surface);border:1px solid var(--border);border-radius:12px;\r\n  aspect-ratio:16/9;overflow:hidden;cursor:pointer;position:relative;color:var(--text-1);padding:16px;\r\n  font-size:11px;transition:transform .2s var(--ease)}\r\n.overview .thumb:hover{transform:scale(1.04)}\r\n.overview .thumb .n{position:absolute;top:8px;left:10px;font-weight:700;font-size:14px;color:var(--text-3)}\r\n.overview .thumb .t{position:absolute;bottom:10px;left:14px;right:14px;font-weight:600;color:var(--text-1)}\r\n\r\n/* ================= PRESENTER VIEW ================= */\r\n/* Presenter view opens in a separate popup window (S key).\r\n * All presenter styles are self-contained in the popup HTML generated by runtime.js.\r\n * The audience window (this file) is NOT affected — it stays as normal deck view.\r\n * Only the .notes class below is needed to hide speaker notes from audience. */\r\n\r\n/* ================= UTILITY ================= */\r\n.hidden{display:none!important}\r\n.nowrap{white-space:nowrap}\r\n.tr{text-align:right}.tc{text-align:center}.tl{text-align:left}\r\n.uppercase{text-transform:uppercase;letter-spacing:.12em}\r\n\r\n/* ================= PRINT ================= */\r\n@media print{\r\n  .slide{position:relative;opacity:1!important;transform:none!important;page-break-after:always;height:100vh}\r\n  .deck-header,.deck-footer,.progress-bar,.notes-overlay,.overview{display:none!important}\r\n}\r\n\r\n</style>\r\n<style>/* html-ppt :: animations.css\r\n * Apply by adding class=\"anim-<name>\" or data-anim=\"<name>\".\r\n * Durations are deliberately snappy; tweak --anim-dur per element.\r\n */\r\n:root{--anim-dur:.7s;--anim-ease:cubic-bezier(.4,0,.2,1)}\r\n\r\n/* ---------- FADE DIRECTIONALS ---------- */\r\n@keyframes kf-fade-up{from{opacity:0;transform:translateY(32px)}to{opacity:1;transform:none}}\r\n@keyframes kf-fade-down{from{opacity:0;transform:translateY(-32px)}to{opacity:1;transform:none}}\r\n@keyframes kf-fade-left{from{opacity:0;transform:translateX(-40px)}to{opacity:1;transform:none}}\r\n@keyframes kf-fade-right{from{opacity:0;transform:translateX(40px)}to{opacity:1;transform:none}}\r\n.anim-fade-up{animation:kf-fade-up var(--anim-dur) var(--anim-ease) both}\r\n.anim-fade-down{animation:kf-fade-down var(--anim-dur) var(--anim-ease) both}\r\n.anim-fade-left{animation:kf-fade-left var(--anim-dur) var(--anim-ease) both}\r\n.anim-fade-right{animation:kf-fade-right var(--anim-dur) var(--anim-ease) both}\r\n\r\n/* ---------- RISE / DROP / ZOOM / BLUR / GLITCH ---------- */\r\n@keyframes kf-rise{from{opacity:0;transform:translateY(60px) scale(.97);filter:blur(6px)}to{opacity:1;transform:none;filter:none}}\r\n@keyframes kf-drop{from{opacity:0;transform:translateY(-60px) scale(.97)}to{opacity:1;transform:none}}\r\n@keyframes kf-zoom{0%{opacity:0;transform:scale(.6)}60%{transform:scale(1.04)}100%{opacity:1;transform:scale(1)}}\r\n@keyframes kf-blur{from{opacity:0;filter:blur(18px)}to{opacity:1;filter:none}}\r\n@keyframes kf-glitch{0%{opacity:0;transform:translateX(0);clip-path:inset(0 0 0 0)}\r\n  20%{opacity:1;transform:translateX(-6px);clip-path:inset(20% 0 30% 0)}\r\n  40%{transform:translateX(4px);clip-path:inset(50% 0 10% 0)}\r\n  60%{transform:translateX(-3px);clip-path:inset(10% 0 60% 0)}\r\n  80%{transform:translateX(2px);clip-path:inset(0 0 0 0)}\r\n  100%{opacity:1;transform:none}}\r\n.anim-rise-in{animation:kf-rise .9s var(--anim-ease) both}\r\n.anim-drop-in{animation:kf-drop .8s var(--anim-ease) both}\r\n.anim-zoom-pop{animation:kf-zoom .7s cubic-bezier(.22,1.3,.36,1) both}\r\n.anim-blur-in{animation:kf-blur .8s var(--anim-ease) both}\r\n.anim-glitch-in{animation:kf-glitch .8s steps(5,end) both}\r\n\r\n/* ---------- TYPEWRITER ---------- */\r\n.anim-typewriter{display:inline-block;overflow:hidden;white-space:nowrap;border-right:2px solid currentColor;\r\n  width:0;animation:kf-type 2.4s steps(40,end) forwards, kf-caret 1s step-end infinite}\r\n@keyframes kf-type{to{width:100%}}\r\n@keyframes kf-caret{50%{border-color:transparent}}\r\n\r\n/* ---------- GLOW / SHIMMER / GRADIENT-FLOW ---------- */\r\n@keyframes kf-neon{0%,100%{text-shadow:0 0 8px var(--accent),0 0 20px var(--accent)}\r\n  50%{text-shadow:0 0 16px var(--accent),0 0 40px var(--accent),0 0 80px var(--accent)}}\r\n.anim-neon-glow{animation:kf-neon 2s ease-in-out infinite}\r\n\r\n.anim-shimmer-sweep{position:relative;overflow:hidden}\r\n.anim-shimmer-sweep::after{content:\"\";position:absolute;inset:0;\r\n  background:linear-gradient(110deg,transparent 40%,rgba(255,255,255,.55) 50%,transparent 60%);\r\n  transform:translateX(-100%);animation:kf-shimmer 2.4s var(--anim-ease) infinite}\r\n@keyframes kf-shimmer{to{transform:translateX(100%)}}\r\n\r\n.anim-gradient-flow{background:linear-gradient(90deg,var(--accent),var(--accent-2,var(--accent)),var(--accent-3,var(--accent)),var(--accent));\r\n  background-size:300% 100%;-webkit-background-clip:text;background-clip:text;color:transparent;-webkit-text-fill-color:transparent;\r\n  animation:kf-gradflow 4s linear infinite}\r\n@keyframes kf-gradflow{to{background-position:300% 0}}\r\n\r\n/* ---------- STAGGER LIST ---------- */\r\n.anim-stagger-list > *{opacity:0;animation:kf-rise .65s var(--anim-ease) both}\r\n.anim-stagger-list > *:nth-child(1){animation-delay:.05s}\r\n.anim-stagger-list > *:nth-child(2){animation-delay:.15s}\r\n.anim-stagger-list > *:nth-child(3){animation-delay:.25s}\r\n.anim-stagger-list > *:nth-child(4){animation-delay:.35s}\r\n.anim-stagger-list > *:nth-child(5){animation-delay:.45s}\r\n.anim-stagger-list > *:nth-child(6){animation-delay:.55s}\r\n.anim-stagger-list > *:nth-child(7){animation-delay:.65s}\r\n.anim-stagger-list > *:nth-child(8){animation-delay:.75s}\r\n.anim-stagger-list > *:nth-child(n+9){animation-delay:.85s}\r\n\r\n/* ---------- COUNTER-UP (JS-driven, marker class only) ---------- */\r\n.counter{font-variant-numeric:tabular-nums}\r\n\r\n/* ---------- SVG PATH DRAW ---------- */\r\n.anim-path-draw path,.anim-path-draw line,.anim-path-draw polyline,.anim-path-draw circle,.anim-path-draw rect{\r\n  stroke-dasharray:1000;stroke-dashoffset:1000;animation:kf-draw 2s var(--anim-ease) forwards}\r\n@keyframes kf-draw{to{stroke-dashoffset:0}}\r\n\r\n/* ---------- PARALLAX TILT (hover) ---------- */\r\n.anim-parallax-tilt{transform-style:preserve-3d;transition:transform .4s var(--anim-ease)}\r\n.anim-parallax-tilt:hover{transform:perspective(900px) rotateX(6deg) rotateY(-8deg) translateZ(10px)}\r\n\r\n/* ---------- CARD FLIP 3D ---------- */\r\n@keyframes kf-flip{from{transform:perspective(1200px) rotateY(-90deg);opacity:0}\r\n  to{transform:perspective(1200px) rotateY(0);opacity:1}}\r\n.anim-card-flip-3d{animation:kf-flip .9s var(--anim-ease) both;transform-style:preserve-3d;backface-visibility:hidden}\r\n\r\n/* ---------- CUBE ROTATE 3D ---------- */\r\n@keyframes kf-cube{from{transform:perspective(1200px) rotateX(20deg) rotateY(-90deg) translateZ(-200px);opacity:0}\r\n  to{transform:perspective(1200px) rotateX(0) rotateY(0) translateZ(0);opacity:1}}\r\n.anim-cube-rotate-3d{animation:kf-cube 1s var(--anim-ease) both}\r\n\r\n/* ---------- PAGE TURN 3D ---------- */\r\n@keyframes kf-pageturn{from{transform:perspective(1600px) rotateY(-85deg);transform-origin:left center;opacity:0}\r\n  to{transform:perspective(1600px) rotateY(0);opacity:1}}\r\n.anim-page-turn-3d{animation:kf-pageturn 1s var(--anim-ease) both;transform-origin:left center}\r\n\r\n/* ---------- PERSPECTIVE ZOOM ---------- */\r\n@keyframes kf-pzoom{from{opacity:0;transform:perspective(1400px) translateZ(-400px) rotateX(12deg)}\r\n  to{opacity:1;transform:none}}\r\n.anim-perspective-zoom{animation:kf-pzoom 1s var(--anim-ease) both}\r\n\r\n/* ---------- MARQUEE SCROLL ---------- */\r\n.anim-marquee-scroll{display:flex;gap:48px;white-space:nowrap;animation:kf-marquee 20s linear infinite}\r\n@keyframes kf-marquee{from{transform:translateX(0)}to{transform:translateX(-50%)}}\r\n\r\n/* ---------- KEN BURNS ---------- */\r\n@keyframes kf-kenburns{0%{transform:scale(1) translate(0,0)}100%{transform:scale(1.15) translate(-2%,-1%)}}\r\n.anim-kenburns{animation:kf-kenburns 14s ease-in-out infinite alternate}\r\n\r\n/* ---------- CONFETTI BURST (pseudo — pure CSS sparkles) ---------- */\r\n.anim-confetti-burst{position:relative}\r\n.anim-confetti-burst::before,.anim-confetti-burst::after{\r\n  content:\"\";position:absolute;top:50%;left:50%;width:8px;height:8px;border-radius:50%;\r\n  background:var(--accent);box-shadow:\r\n    20px -30px 0 var(--accent-2,var(--accent)),-25px -20px 0 var(--accent-3,var(--accent)),\r\n    30px 20px 0 var(--good,#1aaf6c),-30px 25px 0 var(--warn,#f5a524),\r\n    40px -10px 0 var(--bad,#e0445a),-45px 0 0 var(--accent),\r\n    10px 40px 0 var(--accent-2,var(--accent)),-15px -40px 0 var(--accent-3,var(--accent));\r\n  opacity:0;animation:kf-confetti 1.2s var(--anim-ease) forwards}\r\n.anim-confetti-burst::after{animation-delay:.15s;transform:rotate(45deg)}\r\n@keyframes kf-confetti{0%{opacity:0;transform:scale(.2)}30%{opacity:1}100%{opacity:0;transform:scale(2.2)}}\r\n\r\n/* ---------- SPOTLIGHT ---------- */\r\n@keyframes kf-spot{0%{clip-path:circle(0% at 50% 50%)}100%{clip-path:circle(140% at 50% 50%)}}\r\n.anim-spotlight{animation:kf-spot 1.1s var(--anim-ease) both}\r\n\r\n/* ---------- MORPH SHAPE (SVG) ---------- */\r\n.anim-morph-shape path{animation:kf-morph 6s ease-in-out infinite alternate}\r\n@keyframes kf-morph{0%{d:path(\"M60,120 Q120,20 180,120 T300,120\")}\r\n  100%{d:path(\"M60,120 Q120,220 180,120 T300,120\")}}\r\n\r\n/* ---------- RIPPLE REVEAL ---------- */\r\n@keyframes kf-ripple{0%{clip-path:circle(0% at 20% 80%);opacity:.4}\r\n  100%{clip-path:circle(160% at 20% 80%);opacity:1}}\r\n.anim-ripple-reveal{animation:kf-ripple 1.2s var(--anim-ease) both}\r\n\r\n/* reduced motion */\r\n@media (prefers-reduced-motion: reduce){\r\n  [class*=\"anim-\"]{animation:none!important;transition:none!important}\r\n}\r\n\r\n</style>\r\n<style>/* product-launch — modern announcement deck */\r\n.tpl-product-launch{\r\n  --bg:#ffffff;--bg-soft:#f5f5f7;--surface:#ffffff;--surface-2:#f2f2f6;\r\n  --ink:#0a0a12;--ink-2:#3a3a44;\r\n  --border:rgba(10,10,18,.08);--border-strong:rgba(10,10,18,.18);\r\n  --text-1:#0a0a12;--text-2:#4a4a58;--text-3:#8a8a96;\r\n  --accent:#ff5a36;--accent-2:#ff8c5a;--accent-3:#ffb36b;\r\n  --grad:linear-gradient(120deg,#ff5a36 0%,#ff8c5a 60%,#ffb36b 100%);\r\n  --radius:22px;--radius-lg:32px;\r\n  --shadow:0 20px 60px rgba(10,10,18,.1);\r\n  font-family:'Inter','Noto Sans SC',sans-serif;\r\n}\r\n.tpl-product-launch .slide{padding:80px 112px}\r\n.tpl-product-launch .slide.dark{background:#0a0a12;color:#f5f5f7}\r\n.tpl-product-launch .slide.dark .h1,.tpl-product-launch .slide.dark .h2,.tpl-product-launch .slide.dark h3,.tpl-product-launch .slide.dark h4{color:#fff}\r\n.tpl-product-launch .slide.dark .lede,.tpl-product-launch .slide.dark .dim{color:rgba(245,245,247,.72)}\r\n.tpl-product-launch .slide.dark .card{background:rgba(255,255,255,.06);border-color:rgba(255,255,255,.12);box-shadow:none;backdrop-filter:blur(20px)}\r\n.tpl-product-launch .slide.dark .kicker{color:var(--accent-2)}\r\n.tpl-product-launch .h1{font-size:96px;line-height:.98;font-weight:900;letter-spacing:-.045em}\r\n.tpl-product-launch .h2{font-size:64px;font-weight:800;letter-spacing:-.035em}\r\n.tpl-product-launch .hero-shot{position:absolute;right:-60px;top:50%;transform:translateY(-50%);width:640px;height:640px;border-radius:50%;background:var(--grad);filter:blur(2px);opacity:.85}\r\n.tpl-product-launch .hero-shot::after{content:\"\";position:absolute;inset:80px;border-radius:40px;background:linear-gradient(160deg,rgba(255,255,255,.3),transparent 60%),#1a1a28;box-shadow:inset 0 2px 0 rgba(255,255,255,.2)}\r\n.tpl-product-launch .hero-shot::before{content:\"Halo v2\";position:absolute;inset:80px;display:flex;align-items:center;justify-content:center;color:#fff;font-size:44px;font-weight:900;letter-spacing:-.02em;z-index:2;border-radius:40px}\r\n.tpl-product-launch .brand{font-size:18px;font-weight:800;letter-spacing:-.02em}\r\n.tpl-product-launch .feature-card{padding:40px 36px;border-radius:var(--radius-lg);background:var(--surface);border:1px solid var(--border);position:relative;overflow:hidden}\r\n.tpl-product-launch .feature-card .icon{width:60px;height:60px;border-radius:18px;background:var(--grad);display:flex;align-items:center;justify-content:center;color:#fff;font-size:28px;font-weight:900;margin-bottom:20px}\r\n.tpl-product-launch .step{display:flex;gap:24px;align-items:flex-start}\r\n.tpl-product-launch .step .n{flex:none;width:56px;height:56px;border-radius:50%;background:var(--grad);color:#fff;display:flex;align-items:center;justify-content:center;font-weight:900;font-size:22px}\r\n.tpl-product-launch .price-card{padding:40px 32px;border-radius:var(--radius-lg);border:1.5px solid var(--border);background:var(--surface);text-align:left}\r\n.tpl-product-launch .price-card.pro{background:#0a0a12;color:#fff;border-color:#0a0a12;transform:scale(1.04);box-shadow:0 30px 80px rgba(255,90,54,.25)}\r\n.tpl-product-launch .price-card.pro .dim{color:rgba(255,255,255,.7)}\r\n.tpl-product-launch .price-card h4{font-size:16px;text-transform:uppercase;letter-spacing:.1em;color:var(--accent)}\r\n.tpl-product-launch .price-card.pro h4{color:var(--accent-2)}\r\n.tpl-product-launch .price-card .amount{font-size:64px;font-weight:900;letter-spacing:-.035em;margin:14px 0}\r\n.tpl-product-launch .price-card ul{list-style:none;padding:0;margin:20px 0 0}\r\n.tpl-product-launch .price-card li{padding:8px 0;font-size:15px;color:var(--text-2);border-top:1px solid var(--border)}\r\n.tpl-product-launch .price-card.pro li{color:rgba(255,255,255,.8);border-color:rgba(255,255,255,.12)}\r\n.tpl-product-launch .cta-btn{display:inline-block;padding:20px 40px;border-radius:999px;background:var(--grad);color:#fff;font-weight:700;font-size:20px;box-shadow:0 20px 50px rgba(255,90,54,.4)}\r\n.tpl-product-launch .testimonial{max-width:44ch;font-family:'Playfair Display',serif;font-size:44px;line-height:1.25;font-weight:500;letter-spacing:-.01em}\r\n\r\n</style>\r\n<style>\r\n/* Static-preview fallback (runtime.js is absent — keep every slide visible) */\r\n.deck{height:auto;min-height:100vh;overflow:visible}\r\n.slide{position:relative;inset:auto;opacity:1;pointer-events:auto;transform:none;height:100vh;page-break-after:always}\r\n.deck-header,.deck-footer,.slide-number,.progress-bar,.notes-overlay,.overview{pointer-events:none}\r\n.notes{display:none!important}\r\n</style></head>\r\n<body class=\"tpl-product-launch\">\r\n<div class=\"deck\">\r\n\r\n  <!-- 1. Cover / hero -->\r\n  <section class=\"slide dark\" data-title=\"Cover\">\r\n    <div class=\"hero-shot\"></div>\r\n    <div style=\"position:absolute;top:56px;left:112px\" class=\"brand\">◎ Halo</div>\r\n    <p class=\"kicker\">Launch · April 2026</p>\r\n    <h1 class=\"h1 anim-fade-up\" data-anim=\"fade-up\">Meet Halo v2.<br>Your ears,<br><span style=\"background:var(--grad);-webkit-background-clip:text;background-clip:text;color:transparent\">rewritten.</span></h1>\r\n    <p class=\"lede mt-m\" style=\"max-width:42ch\">Studio-grade spatial audio in the lightest open-ear earbuds ever made.</p>\r\n    <div class=\"deck-footer\"><span>halo.audio</span><span class=\"slide-number\" data-current=\"1\" data-total=\"8\"></span></div>\r\n  </section>\r\n\r\n  <!-- 2. Introducing -->\r\n  <section class=\"slide center tc\" data-title=\"Introducing\">\r\n    <div>\r\n      <p class=\"kicker\">Introducing</p>\r\n      <h1 class=\"h1\" style=\"font-size:140px\">Halo v2</h1>\r\n      <p class=\"lede\" style=\"margin:24px auto;max-width:56ch\">Four years of research. Three generations of silicon. One product you'll forget you're wearing.</p>\r\n    </div>\r\n  </section>\r\n\r\n  <!-- 3. Feature 1 -->\r\n  <section class=\"slide\" data-title=\"Sound\">\r\n    <p class=\"kicker\">01 · The sound</p>\r\n    <h2 class=\"h2\">Hear the room<br>around the music.</h2>\r\n    <div class=\"grid g3 mt-l\">\r\n      <div class=\"feature-card\"><div class=\"icon\">♪</div><h4>Open-ear spatial</h4><p class=\"dim\">16mm titanium drivers angled into the ear canal. You hear the song and the world at once.</p></div>\r\n      <div class=\"feature-card\"><div class=\"icon\">◈</div><h4>Lossless 24-bit</h4><p class=\"dim\">aptX Lossless and Hi-Res LDAC over Bluetooth 5.4. No dongles, no compromises.</p></div>\r\n      <div class=\"feature-card\"><div class=\"icon\">◐</div><h4>Adaptive EQ</h4><p class=\"dim\">Tunes itself to the shape of your ear every 120 seconds.</p></div>\r\n    </div>\r\n  </section>\r\n\r\n  <!-- 4. Feature 2 -->\r\n  <section class=\"slide dark\" data-title=\"Fit\">\r\n    <p class=\"kicker\">02 · The fit</p>\r\n    <h2 class=\"h2\">4.9 grams.<br>All-day forgettable.</h2>\r\n    <div class=\"grid g3 mt-l\">\r\n      <div class=\"card\"><h4>Liquid-silicone hook</h4><p>Wraps behind the ear like a glasses arm. Never falls out on a run.</p></div>\r\n      <div class=\"card\"><h4>IP57 sweat + rain</h4><p>Take them in the ocean. Rinse them under the tap. We dare you.</p></div>\r\n      <div class=\"card\"><h4>14h + 42h case</h4><p>A full workweek of commutes on one charge of the case.</p></div>\r\n    </div>\r\n  </section>\r\n\r\n  <!-- 5. Feature 3 -->\r\n  <section class=\"slide\" data-title=\"Intelligence\">\r\n    <p class=\"kicker\">03 · The intelligence</p>\r\n    <h2 class=\"h2\">An AI that listens<br>so you don't have to.</h2>\r\n    <div class=\"grid g2 mt-l\">\r\n      <div class=\"feature-card\"><div class=\"icon\">✦</div><h4>Live translate</h4><p class=\"dim\">Real-time translation in 41 languages. Whispered directly into your ear, with a 380ms lag.</p></div>\r\n      <div class=\"feature-card\"><div class=\"icon\">✧</div><h4>Meeting recap</h4><p class=\"dim\">Double-tap to record. Walk away with a summary, action items, and a searchable transcript.</p></div>\r\n    </div>\r\n  </section>\r\n\r\n  <!-- 6. How it works -->\r\n  <section class=\"slide\" data-title=\"How it works\">\r\n    <p class=\"kicker\">How it works</p>\r\n    <h2 class=\"h2\">Three taps. You're in.</h2>\r\n    <div class=\"stack mt-l\" style=\"max-width:900px\">\r\n      <div class=\"step\"><div class=\"n\">1</div><div><h4>Open the case near your phone</h4><p class=\"dim\">iOS and Android pair automatically over Bluetooth LE. No app downloads required.</p></div></div>\r\n      <div class=\"step\"><div class=\"n\">2</div><div><h4>Pick your profile</h4><p class=\"dim\">Commute, Focus, Workout, Cinema. Each is a complete audio + transparency recipe.</p></div></div>\r\n      <div class=\"step\"><div class=\"n\">3</div><div><h4>Just listen</h4><p class=\"dim\">Halo adapts to your ear shape, your environment, and your hearing profile — continuously.</p></div></div>\r\n    </div>\r\n  </section>\r\n\r\n  <!-- 7. Pricing -->\r\n  <section class=\"slide\" data-title=\"Pricing\">\r\n    <p class=\"kicker\">Pricing</p>\r\n    <h2 class=\"h2\">Pick your Halo.</h2>\r\n    <div class=\"grid g3 mt-l\" style=\"align-items:start\">\r\n      <div class=\"price-card\">\r\n        <h4>Halo Lite</h4>\r\n        <div class=\"amount\">$179</div>\r\n        <p class=\"dim\">Open-ear audio, IP57, 12h battery.</p>\r\n        <ul><li>AAC + SBC</li><li>Single-tap controls</li><li>USB-C charging</li></ul>\r\n      </div>\r\n      <div class=\"price-card pro\">\r\n        <h4>Halo v2 · Pro</h4>\r\n        <div class=\"amount\">$279</div>\r\n        <p class=\"dim\">Everything, in its best form.</p>\r\n        <ul><li>Hi-Res Lossless</li><li>Live translate · 41 lang</li><li>Wireless + MagSafe charging</li><li>Adaptive EQ</li></ul>\r\n      </div>\r\n      <div class=\"price-card\">\r\n        <h4>Halo Studio</h4>\r\n        <div class=\"amount\">$399</div>\r\n        <p class=\"dim\">For creators and field recorders.</p>\r\n        <ul><li>32-bit binaural capture</li><li>XLR dongle included</li><li>Lifetime firmware</li></ul>\r\n      </div>\r\n    </div>\r\n  </section>\r\n\r\n  <!-- 8. Testimonial + CTA combined? Task says 8 slides w/ testimonial + CTA as separate. Keep 8: testimonial on 7, but we've used 7 already. Re-plan: cover(1) intro(2) f1(3) f2(4) f3(5) how(6) pricing(7) testimonial+CTA(8) -->\r\n  <section class=\"slide dark\" data-title=\"Ship\">\r\n    <p class=\"kicker\">One more thing</p>\r\n    <div class=\"row\" style=\"gap:80px;align-items:center\">\r\n      <div style=\"flex:1\">\r\n        <p class=\"testimonial\">\"I forgot I was wearing them. Then I remembered, and I didn't want to take them off.\"</p>\r\n        <p class=\"dim mt-m\">— Marques Lin, The Verge · early review</p>\r\n      </div>\r\n      <div style=\"flex:0 0 auto;text-align:center\">\r\n        <p class=\"dim mb-m\">Ships May 14 · from</p>\r\n        <div style=\"font-size:96px;font-weight:900;letter-spacing:-.04em\">$279</div>\r\n        <a class=\"cta-btn mt-l\" href=\"#\">Pre-order Halo v2 →</a>\r\n        <p class=\"dim mt-m\" style=\"font-size:13px\">Free shipping · 45-day return · 2-year warranty</p>\r\n      </div>\r\n    </div>\r\n  </section>\r\n\r\n</div>\r\n\r\n</body></html>\r\n","deck-product-launch/SKILL.md":"---\r\nname: deck-product-launch\r\nzh_name: \"产品发布 Keynote\"\r\nen_name: \"Product Launch Deck\"\r\nemoji: \"🎉\"\r\ndescription: \"暗 hero + 亮内容, 橙→桃 accent, 特性卡 + 定价 + CTA\"\r\ncategory: slides\r\nscenario: marketing\r\naspect_hint: \"16:9\"\r\nfeatured: 21\r\ntags: [\"launch\", \"keynote\", \"product\"]\r\n---\r\n\r\n【模板: Product Launch Keynote】\r\n【意图】新产品发布的 Keynote 风 deck。\r\n【布局】\r\n- Cover (暗背景 + 大字主题)\r\n- Why we built this (问题)\r\n- Introducing (产品名 + 1 张 hero shot)\r\n- Feature cards (3-6 个)\r\n- Pricing tiers\r\n- CTA / Available now\r\n【设计细节】\r\n- accent: 暖橙→桃 渐变\r\n","deck-replit/example.md":"# Replit Slides · World Mint 主题\r\n\r\n> 双页预览: Cover + Agenda\r\n\r\n## 主题\r\nReplit Slides 八套主题之一 (helix / holm / vance / bevel / **world-mint** / atlas / bluehouse)\r\n\r\n## Deck 标题\r\nBuilding agents that ship at the edge\r\n\r\n## Agenda\r\n1. The edge moves to your laptop\r\n2. Why local CLI agents win\r\n3. 17 agents · one protocol\r\n4. Live demo · ⌘+Enter\r\n5. Open questions\r\n","deck-replit/SKILL.md":"---\r\nname: deck-replit\r\nzh_name: \"Replit Slides 风 Deck\"\r\nen_name: \"Replit Slides Deck\"\r\nemoji: \"🟣\"\r\ndescription: \"Replit Slides 八套主题 (helix/holm/vance/bevel/world/atlas/bluehouse)\"\r\ncategory: slides\r\nscenario: product\r\naspect_hint: \"16:9\"\r\ntags: [\"replit\", \"themed\", \"memo\"]\r\nexample_id: sample-deck-replit\r\nexample_name: \"Replit Slides · World Mint\"\r\nexample_format: markdown\r\nexample_tagline: \"Replit Slides 八套主题之一\"\r\nexample_desc: \"World Mint 主题封页 + agenda 双页, sans + neon mint accent\"\r\nexample_source_url: \"https://replit.com/slides\"\r\nexample_source_label: \"Replit Slides\"\r\n---\r\n\r\n【模板: Replit Slides Style Deck】\r\n【意图】Replit Slides 风的单文件 horizontal-swipe deck, 选 1 套主题不混用。\r\n【布局】\r\n- Pick one theme: helix / holm / vance / bevel / world-dark / world-mint / atlas / bluehouse\r\n- Cover + agenda + N 个 content + 收尾 (N 由【用户内容】长度决定, 完整覆盖每个要点; 短内容 6-10 起步, 长内容应更多)\r\n【设计细节】\r\n- 每套主题有完整调色板 + 字体 + accent, 不要混用\r\n","deck-safety-alert/SKILL.md":"---\r\nname: deck-safety-alert\r\nzh_name: \"安全 / 风险红色 Deck\"\r\nen_name: \"Testing / Safety Alert Deck\"\r\nemoji: \"⚠️\"\r\ndescription: \"红琥珀警示色 + hazard 条纹 + L1/L2/L3 tier 卡片 + 删除线标题\"\r\ncategory: slides\r\nscenario: engineering\r\naspect_hint: \"16:9\"\r\nfeatured: 32\r\ntags: [\"safety\", \"security\", \"policy\", \"incident\"]\r\n---\r\n\r\n【模板: Safety Alert Deck】\r\n【意图】安全 / 风险 / 事故复盘 / red team / policy-as-code 用 deck。\r\n【布局】\r\n- 顶/底 45° 红黑 hazard 条纹\r\n- 红色删除线否定标题\r\n- L1/L2/L3 绿 / 琥珀 / 红 tier 卡片\r\n- 圆点状态 alert box\r\n- policy-yaml 代码块 (红左边框 + bad 关键词高亮)\r\n- 红绿 checklist + 事故堆叠柱状图\r\n","deck-simple/example.html":"<!doctype html>\r\n<html lang=\"en\">\r\n<head>\r\n  <meta charset=\"utf-8\" />\r\n  <meta name=\"viewport\" content=\"width=device-width, initial-scale=1\" />\r\n  <title>Filebase · Investor deck — Q2 2026</title>\r\n  <style>\r\n    :root {\r\n      --bg: #fafaf9; --fg: #1c1b1a; --muted: #6b6964; --accent: #c96442; --surface: #ffffff;\r\n    }\r\n    * { box-sizing: border-box; }\r\n    html, body { margin: 0; height: 100%; }\r\n    body {\r\n      background: var(--bg);\r\n      color: var(--fg);\r\n      font: 18px/1.5 -apple-system, system-ui, sans-serif;\r\n      display: flex;\r\n      overflow-x: auto;\r\n      overflow-y: hidden;\r\n      scroll-snap-type: x mandatory;\r\n      scroll-behavior: smooth;\r\n    }\r\n    body::-webkit-scrollbar { display: none; }\r\n    .slide {\r\n      flex: 0 0 100vw;\r\n      height: 100vh;\r\n      scroll-snap-align: start;\r\n      padding: 80px 96px;\r\n      display: flex;\r\n      flex-direction: column;\r\n      justify-content: center;\r\n      position: relative;\r\n    }\r\n    .slide.title { background: var(--fg); color: var(--bg); }\r\n    .eyebrow { font-size: 12px; letter-spacing: 0.1em; text-transform: uppercase; color: var(--accent); margin-bottom: 28px; }\r\n    .slide h1 { font-size: clamp(48px, 7vw, 96px); line-height: 1.05; letter-spacing: -0.025em; margin: 0 0 20px; max-width: 16ch; }\r\n    .slide h2 { font-size: clamp(32px, 4vw, 48px); letter-spacing: -0.015em; margin: 0 0 20px; max-width: 20ch; }\r\n    .slide .body { font-size: 22px; color: var(--muted); max-width: 56ch; }\r\n    .slide.title .body { color: rgba(250,250,249,0.7); }\r\n    .slide.big-stat .number { font-size: clamp(120px, 22vw, 280px); line-height: 0.9; letter-spacing: -0.04em; color: var(--accent); margin-bottom: 16px; font-weight: 600; }\r\n    .slide.big-stat .caption { font-size: 24px; color: var(--muted); max-width: 24ch; }\r\n    .quote-mark { font-family: Georgia, serif; font-size: 200px; line-height: 0.7; color: var(--accent); opacity: 0.18; margin-bottom: -40px; }\r\n    .quote-text { font-family: Georgia, serif; font-size: 36px; line-height: 1.3; max-width: 26ch; margin: 0 0 28px; }\r\n    .quote-author { font-size: 14px; color: var(--muted); }\r\n    .grid-3 { display: grid; grid-template-columns: repeat(3, 1fr); gap: 32px; margin-top: 40px; }\r\n    .grid-3 .pt { border-top: 2px solid var(--accent); padding-top: 16px; }\r\n    .grid-3 .pt .h { font-size: 18px; font-weight: 500; margin: 0 0 8px; }\r\n    .grid-3 .pt .p { color: var(--muted); margin: 0; font-size: 16px; }\r\n    .counter { position: fixed; bottom: 24px; right: 32px; font-family: ui-monospace, monospace; font-size: 12px; color: var(--muted); background: var(--surface); padding: 4px 10px; border-radius: 999px; border: 1px solid #e6e4e0; }\r\n    .hint { position: fixed; bottom: 24px; left: 32px; font-size: 11px; color: var(--muted); }\r\n  </style>\r\n</head>\r\n<body>\r\n  <section class=\"slide title\" data-od-id=\"slide-1\">\r\n    <div class=\"eyebrow\" style=\"color:#c96442;\">Filebase · Series B · Q2 2026</div>\r\n    <h1>The bandwidth bill is the bug.</h1>\r\n    <p class=\"body\">A sync engine that ships only what changed. Backed by 3,184 paying teams.</p>\r\n  </section>\r\n  <section class=\"slide\" data-od-id=\"slide-2\">\r\n    <div class=\"eyebrow\">Problem</div>\r\n    <h2>Every other tool re-uploads the whole file.</h2>\r\n    <p class=\"body\">Edit one frame in a 4 GB Final Cut project; today's tools sync all 4 GB. The video, post-production, and design industries are eating multi-thousand-dollar bandwidth bills they shouldn't be.</p>\r\n  </section>\r\n  <section class=\"slide big-stat\" data-od-id=\"slide-3\">\r\n    <div class=\"number\">38×</div>\r\n    <div class=\"caption\">less data moved over the wire vs. naive sync, on real customer workloads.</div>\r\n  </section>\r\n  <section class=\"slide\" data-od-id=\"slide-4\">\r\n    <div class=\"eyebrow\">Why now</div>\r\n    <h2>Three shifts make this market real.</h2>\r\n    <div class=\"grid-3\">\r\n      <div class=\"pt\"><h3 class=\"h\">Remote post-production</h3><p class=\"p\">Editors don't sit in one room any more. Cloud sync went from convenient to load-bearing.</p></div>\r\n      <div class=\"pt\"><h3 class=\"h\">AI workflows</h3><p class=\"p\">Diffusion checkpoints are 7 GB. Engineers iterate on them daily. Existing tools choke.</p></div>\r\n      <div class=\"pt\"><h3 class=\"h\">Bandwidth pricing</h3><p class=\"p\">Egress costs 4× what it did in 2022. Storage is cheap; movement is expensive.</p></div>\r\n    </div>\r\n  </section>\r\n  <section class=\"slide\" data-od-id=\"slide-5\">\r\n    <div class=\"quote-mark\">\"</div>\r\n    <p class=\"quote-text\">Filebase pays for itself in the first month. We were going to hire a dedicated DevOps person to babysit our sync — instead we just switched.</p>\r\n    <p class=\"quote-author\">— Mira Hassan, CTO at Northwind Studios</p>\r\n  </section>\r\n  <section class=\"slide title\" data-od-id=\"slide-6\">\r\n    <div class=\"eyebrow\" style=\"color:#c96442;\">Ask</div>\r\n    <h1>$22M to ship the next sync engine.</h1>\r\n    <p class=\"body\">18-month runway, hire 14, expand to enterprise on-prem.</p>\r\n  </section>\r\n\r\n  <div class=\"counter\" id=\"counter\">1 / 6</div>\r\n  <div class=\"hint\">← / → to navigate</div>\r\n\r\n  <script>\r\n    const slides = document.querySelectorAll('.slide');\r\n    const counter = document.getElementById('counter');\r\n    let active = 0;\r\n\r\n    // Detect the real scroller — when body has `display: flex` + `overflow-x: auto`\r\n    // the scroller can be body OR documentElement depending on the host (in\r\n    // particular, the OD srcdoc iframe). Pick whichever actually overflows.\r\n    function scroller() {\r\n      if (document.body.scrollWidth > document.body.clientWidth + 1) return document.body;\r\n      return document.scrollingElement || document.documentElement;\r\n    }\r\n\r\n    function go(i) {\r\n      const next = Math.max(0, Math.min(slides.length - 1, i));\r\n      active = next;\r\n      counter.textContent = (next + 1) + ' / ' + slides.length;\r\n      scroller().scrollTo({ left: next * window.innerWidth, behavior: 'smooth' });\r\n    }\r\n    function syncFromScroll() {\r\n      const i = Math.round(scroller().scrollLeft / window.innerWidth);\r\n      if (i !== active && i >= 0 && i < slides.length) {\r\n        active = i;\r\n        counter.textContent = (i + 1) + ' / ' + slides.length;\r\n      }\r\n    }\r\n    function onKey(e) {\r\n      if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) return;\r\n      if (e.key === 'ArrowRight' || e.key === ' ' || e.key === 'PageDown') { e.preventDefault(); go(active + 1); }\r\n      else if (e.key === 'ArrowLeft' || e.key === 'PageUp') { e.preventDefault(); go(active - 1); }\r\n      else if (e.key === 'Home') { e.preventDefault(); go(0); }\r\n      else if (e.key === 'End') { e.preventDefault(); go(slides.length - 1); }\r\n    }\r\n    // Listen on both window and document in capture phase so the handler\r\n    // fires regardless of which element holds focus inside the iframe.\r\n    window.addEventListener('keydown', onKey, true);\r\n    document.addEventListener('keydown', onKey, true);\r\n    // And listen for scroll on both surfaces — same reason.\r\n    document.addEventListener('scroll', syncFromScroll, { passive: true, capture: true });\r\n    window.addEventListener('scroll', syncFromScroll, { passive: true });\r\n\r\n    // Auto-focus body so arrow keys work without a click.\r\n    document.body.setAttribute('tabindex', '-1');\r\n    document.body.style.outline = 'none';\r\n    function focusDeck() { try { window.focus(); document.body.focus({ preventScroll: true }); } catch (_) {} }\r\n    document.addEventListener('mousedown', focusDeck);\r\n    window.addEventListener('load', focusDeck);\r\n    focusDeck();\r\n  </script>\r\n</body>\r\n</html>\r\n","deck-simple/SKILL.md":"---\r\nname: deck-simple\r\nzh_name: \"通用 Simple Deck\"\r\nen_name: \"Simple Deck\"\r\nemoji: \"▫️\"\r\ndescription: \"通用 horizontal-swipe HTML deck, 不要 magazine 调\"\r\ncategory: slides\r\nscenario: product\r\naspect_hint: \"16:9\"\r\ntags: [\"deck\", \"simple\", \"swipe\"]\r\n---\r\n\r\n【模板: Simple Deck】\r\n【意图】干净通用的 horizontal-swipe deck (pitch / overview / study)。\r\n【布局】\r\n- Cover + N 个 content 页 + 收尾 (N 由【用户内容】长度决定, 完整覆盖每个要点; 短内容 6-10 起步, 长内容应更多)\r\n- 每页一个核心信息 + 1 张图 / 1 个图表\r\n- 顶部 progress bar\r\n【设计细节】\r\n- 键盘 ← / → 切换 + hash 同步\r\n","deck-swiss-international/example.html":"<!DOCTYPE html>\r\n<html lang=\"en\">\r\n<head>\r\n<meta charset=\"UTF-8\" />\r\n<title>Swiss International · Open Design 2026</title>\r\n<script src=\"https://cdn.tailwindcss.com\"></script>\r\n<link href=\"https://fonts.googleapis.com/css2?family=Inter+Tight:wght@400;500;600;700;800;900&family=Inter:wght@400;500;600&family=Noto+Sans+SC:wght@400;500;700&family=JetBrains+Mono:wght@400;500&display=swap\" rel=\"stylesheet\" />\r\n<style>\r\n  body { font-family: 'Inter Tight','Inter','Noto Sans SC',system-ui,sans-serif; background:#0a0a0a; color:#fafaf8; margin:0; }\r\n  .slide { width:100%; aspect-ratio:16/9; max-width:1280px; margin:0 auto; position:relative; overflow:hidden; }\r\n  .ikb { background:#002FA7; color:#fafaf8; }\r\n  .paper { background:#fafaf8; color:#0a0a0a; }\r\n  .mono { font-family:'JetBrains Mono', ui-monospace, monospace; }\r\n  .hairline-b { border-bottom:1px solid currentColor; }\r\n  .hairline-t { border-top:1px solid currentColor; }\r\n  /* ASCII dot field */\r\n  .ascii { font-family:'JetBrains Mono', monospace; font-size:11px; line-height:1; letter-spacing:6px; opacity:0.2; }\r\n  .bar { width:60px; background:#002FA7; }\r\n  .deck { display:grid; gap:24px; padding:24px; }\r\n</style>\r\n</head>\r\n<body>\r\n<div class=\"deck\">\r\n\r\n  <!-- S01 Cover · Full IKB -->\r\n  <section class=\"slide ikb\">\r\n    <div class=\"absolute inset-0 p-12 flex flex-col justify-between\">\r\n      <header class=\"flex items-baseline justify-between mono text-[11px] uppercase tracking-[0.18em]\">\r\n        <span>OPEN DESIGN — 2026 ROADMAP</span>\r\n        <span>S01 / 22</span>\r\n        <span>2026.05.11</span>\r\n      </header>\r\n      <!-- ascii dot matrix top-right -->\r\n      <pre class=\"absolute top-20 right-12 ascii\">▒▓█▓▒░░▒▓█▓▒\r\n▒▒▓█▓▒░░▒▓█▓▒\r\n░▒▓█▓▒░░▒▓█▓▒\r\n░░▒▓█▓▒░░▒▓█▓\r\n▒░░▒▓█▓▒░░▒▓\r\n▒▒░░▒▓█▓▒░░▒</pre>\r\n      <div>\r\n        <div class=\"mono text-[12px] uppercase tracking-[0.18em] opacity-80\">№01 · A LANDMARK</div>\r\n        <h1 class=\"mt-3 font-black leading-[0.95] tracking-[-0.02em]\" style=\"font-size:clamp(48px,7.5vw,124px)\">\r\n          Designing<br/>intelligence<br/>on warm paper.\r\n        </h1>\r\n        <p class=\"mt-5 max-w-[640px] text-[15px] opacity-90 leading-snug\">\r\n          75 个世界级 HTML 模板 · 17 个本地 AI agent 适配 · 0 API 成本 · 一键发布到任何平台。\r\n        </p>\r\n      </div>\r\n      <footer class=\"flex items-baseline justify-between mono text-[11px] uppercase tracking-[0.18em] opacity-70 hairline-t pt-3\">\r\n        <span>OPEN-DESIGN.STUDIO</span>\r\n        <span>BERLIN · 52.5200° N · 13.4050° E</span>\r\n        <span>VOL. 01</span>\r\n      </footer>\r\n    </div>\r\n  </section>\r\n\r\n  <!-- S06 KPI Tower · paper bg, 4 IKB bars -->\r\n  <section class=\"slide paper\">\r\n    <div class=\"absolute inset-0 p-12 flex flex-col justify-between\">\r\n      <header class=\"flex items-baseline justify-between mono text-[11px] uppercase tracking-[0.18em]\">\r\n        <span>KPI TOWER — Q1-Q4 OUTLOOK</span>\r\n        <span>S06 / 22</span>\r\n        <span>FY 2026</span>\r\n      </header>\r\n      <div>\r\n        <div class=\"mono text-[12px] uppercase tracking-[0.18em]\" style=\"color:#002FA7\">№06 · GROWTH METRICS</div>\r\n        <h2 class=\"mt-2 font-black leading-[1] tracking-[-0.02em]\" style=\"font-size:clamp(36px,4.8vw,80px)\">\r\n          四根柱子, 一个目标 ——<br/>\r\n          做<span style=\"color:#002FA7\">最被信任</span>的 HTML 生产线。\r\n        </h2>\r\n      </div>\r\n      <!-- bars -->\r\n      <div class=\"grid grid-cols-4 gap-10 items-end mt-6\">\r\n        <div class=\"text-center\">\r\n          <div class=\"mb-3 mx-auto\" style=\"height:32px\">\r\n            <svg viewBox=\"0 0 24 24\" class=\"w-7 h-7 mx-auto\" fill=\"#002FA7\"><rect x=\"4\" y=\"4\" width=\"4\" height=\"16\"/><rect x=\"10\" y=\"8\" width=\"4\" height=\"12\"/><rect x=\"16\" y=\"2\" width=\"4\" height=\"18\"/></svg>\r\n          </div>\r\n          <div class=\"bar mx-auto\" style=\"height:60px\"></div>\r\n          <div class=\"mt-3 mono text-[32px] font-bold\" style=\"color:#002FA7\">75</div>\r\n          <div class=\"hairline-t mt-1 pt-1 text-[11px] uppercase tracking-[0.16em] opacity-70\">模板 · 现在</div>\r\n        </div>\r\n        <div class=\"text-center\">\r\n          <div class=\"mb-3 mx-auto\" style=\"height:32px\">\r\n            <svg viewBox=\"0 0 24 24\" class=\"w-7 h-7 mx-auto\" fill=\"#002FA7\"><circle cx=\"12\" cy=\"12\" r=\"9\" fill=\"none\" stroke=\"#002FA7\" stroke-width=\"2\"/><circle cx=\"12\" cy=\"12\" r=\"3\"/></svg>\r\n          </div>\r\n          <div class=\"bar mx-auto\" style=\"height:140px\"></div>\r\n          <div class=\"mt-3 mono text-[32px] font-bold\" style=\"color:#002FA7\">200</div>\r\n          <div class=\"hairline-t mt-1 pt-1 text-[11px] uppercase tracking-[0.16em] opacity-70\">模板 · Q4 目标</div>\r\n        </div>\r\n        <div class=\"text-center\">\r\n          <div class=\"mb-3 mx-auto\" style=\"height:32px\">\r\n            <svg viewBox=\"0 0 24 24\" class=\"w-7 h-7 mx-auto\" fill=\"#002FA7\"><path d=\"M12 2l3 7h7l-5.5 4.5 2 7L12 16l-6.5 4.5 2-7L2 9h7z\"/></svg>\r\n          </div>\r\n          <div class=\"bar mx-auto\" style=\"height:230px\"></div>\r\n          <div class=\"mt-3 mono text-[32px] font-bold\" style=\"color:#002FA7\">25K</div>\r\n          <div class=\"hairline-t mt-1 pt-1 text-[11px] uppercase tracking-[0.16em] opacity-70\">GH Stars · 目标</div>\r\n        </div>\r\n        <div class=\"text-center\">\r\n          <div class=\"mb-3 mx-auto\" style=\"height:32px\">\r\n            <svg viewBox=\"0 0 24 24\" class=\"w-7 h-7 mx-auto\" fill=\"#002FA7\"><path d=\"M5 3l10 9-10 9z\"/></svg>\r\n          </div>\r\n          <div class=\"bar mx-auto\" style=\"height:280px\"></div>\r\n          <div class=\"mt-3 mono text-[32px] font-bold\" style=\"color:#002FA7\">80K</div>\r\n          <div class=\"hairline-t mt-1 pt-1 text-[11px] uppercase tracking-[0.16em] opacity-70\">WAU · 目标</div>\r\n        </div>\r\n      </div>\r\n      <footer class=\"flex items-baseline justify-between mono text-[11px] uppercase tracking-[0.18em] opacity-60 hairline-t pt-3 mt-4\">\r\n        <span>SOURCE — INTERNAL ANALYTICS / 2026-04</span>\r\n        <span>OPEN-DESIGN.STUDIO</span>\r\n        <span>№06 / 22</span>\r\n      </footer>\r\n    </div>\r\n  </section>\r\n\r\n</div>\r\n</body>\r\n</html>\r\n","deck-swiss-international/example.md":"# Open Design · 2026 路线图\r\n\r\n> Klein Blue 主题, 双页预览: S01 Cover + S06 KPI Tower\r\n\r\n## 一句话\r\n打造世界级 AI 写作 / 设计基础设施。\r\n\r\n## Q1-Q4 关键指标\r\n\r\n| 维度 | 数字 |\r\n|---|---|\r\n| 模板数 | 75 → 200 |\r\n| 周活用户 | 12K → 80K |\r\n| Agent 适配 | 17 → 28 |\r\n| GitHub Stars | 4.2K → 25K |\r\n","deck-swiss-international/SKILL.md":"---\r\nname: deck-swiss-international\r\nzh_name: \"瑞士国际主义 Deck\"\r\nen_name: \"Swiss International Deck\"\r\nemoji: \"🟦\"\r\ndescription: \"16 列网格 + 单一饱和 accent + 22 个锁死版面 (Klein Blue / Lemon / Mint / Safety Orange)\"\r\ncategory: slides\r\nscenario: marketing\r\naspect_hint: \"16:9 横向翻页\"\r\nfeatured: 50\r\nrecommended: 2\r\ntags: [\"swiss\", \"grid\", \"international\", \"ikb\", \"editorial\", \"facts\"]\r\nexample_id: sample-swiss-international\r\nexample_name: \"Swiss International · 产品路线\"\r\nexample_format: markdown\r\nexample_tagline: \"Klein Blue IKB + 16 列网格\"\r\nexample_desc: \"S01 Cover + S06 KPI Tower 两页预览, IKB 全屏标题 + 4 柱状 KPI\"\r\nexample_source_url: \"https://github.com/op7418/guizang-ppt-skill\"\r\nexample_source_label: \"op7418/guizang-ppt-skill\"\r\n---\r\n\r\n【模板: 瑞士国际主义 Deck (Swiss International)】\r\n【意图】事实、产品、分析、方法论表达。极度冷静、理性、学院派, 没有任何手绘 / 噪点 / 装饰。Inspired by op7418/guizang-ppt-skill Style B。\r\n\r\n【主题】**只能从下面 4 套二选一, 不许混用、不许改 hex**:\r\n- 🔵 **Klein Blue (IKB)** — accent `#002FA7`, paper `#fafaf8`, ink `#0a0a0a`. 商业 / AI / 设计场景。\r\n- 🟡 **Lemon Yellow** — accent `#FFD500`, paper `#f7f5ee` (淡奶油), ink `#0a0a0a`. 年轻 / 零售 / 体育。文字必须用黑色 (不能白色)。\r\n- 🟢 **Lemon Green / Neon** — accent `#C5E803`, paper `#f7f5ee`, ink `#0a0a0a`. 可持续 / 科技初创 / Gen-Z 品牌。文字必须用黑色。\r\n- 🟠 **Safety Orange** — accent `#FF6B35`, paper `#f7f5ee`, ink `#0a0a0a`. 工业 / 汽车 / 紧急消息。文字用白色 + bold ≥ 600。\r\n\r\n【布局 — 22 个可复用版式池, 不许新增或改造版式; **数量由内容决定**, 把【用户内容】完整覆盖完为止 (短内容 6-10 张起步, 长内容应远超此范围, 同一版式可在不同章节重复使用)】\r\n- **S01 Cover** — 全屏 accent + ASCII 呼吸点阵 + 反白标题 + 元数据 chrome (date / № / topic)。\r\n- **S02 Vertical Timeline** — 左侧虚线轴 + 圆点; 右侧节点 = 年份 + KPI + 描述。\r\n- **S03 Statement** — 9.6vw 居中巨字 + 左侧大段留白 + 底部 hairline + 注释。\r\n- **S04 Six Cells** — 2×3 网格, 每格: icon + 编号 + 短标题 + 单行描述。\r\n- **S05 Three Sub-cards** — 左侧 hero 标题 + 右侧 3 张水平堆叠的灰色卡。\r\n- **S06 KPI Tower** — 4 列变高蓝色柱状; 柱顶 icon; 柱底大数字 + 标签。\r\n- **S07 H-Bar Chart** — 水平排名横条, 宽度反映数据, 末端标数字。\r\n- **S08 Duo Compare** — 垂直分割线; 左 Before / 右 After。\r\n- **S09 Closing Manifesto** — 左 IKB 块 + ASCII 点阵 + 宣言; 右白底 + 3 条要点。\r\n- **S10 Dot Matrix Statement** — 居中宣言 + 角落几何点矩阵 / 圆环矩阵。\r\n- **S11 Horizontal Timeline** — 顶部 headline, 中部 hairline 轴, 等距节点, 节点下方步骤名。\r\n- **S12 Manifesto + Ink Banner** — 上半 headline + 解释; 下半全宽黑色横幅 + 反白小字。\r\n- **S13 Three Forces Cards** — 左 ink hero 块; 右 3 张灰色卡, 每卡: 大数字 + 文本。\r\n- **S14 Loop Diagram** — 左编号步骤; 右 SVG 同心环; 中心 \"LOOP\" 标签。\r\n- **S15 Image Matrix + Hero Stat** — 4×3 等高卡片 (12 项) + 底部 summary 大数字 + 标签。\r\n- **S16 Multi-card Brief** — 3×2 微卡; 主文左上, 注脚右下, 单卡 accent 高亮。\r\n- **S17 System Diagram** — 左 headline + 3 段描述; 右 SVG 三同心圆 + 外部标签。\r\n- **S18 Why Now** — 3 列, 每列: category label + headline + 描述 + 底部数字 (最后一列 accent)。\r\n- **S19 Four Cards** — 顶部 accent hairline + headline + 4 张等宽卡 (元数据 / 标题 / 正文)。\r\n- **S20 Stacked KPI Ledger** — 垂直行 + hairline 分隔; 左大数字 / 中标签 / 右 icon。\r\n- **S21 Tech Spec Sheet** — 左标题块 / 中 3 个 KPI hairline / 右变高柱 / 底数据。\r\n- **S22 Image Hero** — 上 60% 全宽图 + 白色标题块覆盖; 下 40% 解释 + 3 列 KPI。\r\n\r\n【设计细节 — 绝对铁律】\r\n- **只用直角**: 全程 `border-radius: 0`。圆角 = 立刻违反。\r\n- **1px hairline borders**, 黑色或 accent; 严禁阴影 / 渐变 / blur。\r\n- **16 列网格**: `grid-template-columns: repeat(16, 1fr); gap: 0`。\r\n- **字体**: Inter Tight (Latin display) / Inter (body) / Noto Sans SC (中文) / JetBrains Mono (数据); 严禁衬线、严禁装饰字体。\r\n- **字号极端反差**: cover 用 9.6vw display, body 14-16px, label 11px uppercase letterspacing 0.08em。\r\n- **键盘 ← / → 切换 + hash 同步**; 角标固定: `№N/N` 右下, topic 标签左下。\r\n- **不许编造**: 数字必须来自用户输入, 图表柱高 = 真实数据按比例。\r\n- 输出单文件 HTML, 不用任何外部图片 URL; 装饰几何 (ASCII 矩阵 / 同心圆) 用纯 CSS 或内联 SVG。\r\n","deck-tech-sharing/example.html":"<!DOCTYPE html>\r\n<html lang=\"zh-CN\">\r\n<head>\r\n<meta charset=\"utf-8\"><meta name=\"viewport\" content=\"width=device-width,initial-scale=1\">\r\n<title>Rust 异步运行时内部机制 · Tech Sharing</title>\r\n<style>/* html-ppt :: shared webfonts */\r\n@import url('https://fonts.googleapis.com/css2?family=Inter:wght@200;300;400;500;600;700;800;900&display=swap');\r\n@import url('https://fonts.googleapis.com/css2?family=Noto+Sans+SC:wght@200;300;400;500;600;700;900&display=swap');\r\n@import url('https://fonts.googleapis.com/css2?family=Noto+Serif+SC:wght@300;400;600;700&display=swap');\r\n@import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;700&display=swap');\r\n@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,600;0,800;1,400&display=swap');\r\n@import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600;700&display=swap');\r\n@import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@300;400;500;700&display=swap');\r\n@import url('https://fonts.googleapis.com/css2?family=Archivo+Black&display=swap');\r\n\r\n</style>\r\n<style>/* html-ppt :: base.css — reset + shared tokens + layout primitives */\r\n/* Default tokens. Themes in assets/themes/*.css override the :root block. */\r\n:root {\r\n  --bg: #ffffff;\r\n  --bg-soft: #f7f7f8;\r\n  --surface: #ffffff;\r\n  --surface-2: #f2f2f4;\r\n  --border: rgba(0,0,0,.08);\r\n  --border-strong: rgba(0,0,0,.16);\r\n  --text-1: #111216;\r\n  --text-2: #55596a;\r\n  --text-3: #8a8f9e;\r\n  --accent: #3b6cff;\r\n  --accent-2: #7a5cff;\r\n  --accent-3: #ff5c8a;\r\n  --good: #1aaf6c;\r\n  --warn: #f5a524;\r\n  --bad:  #e0445a;\r\n  --grad: linear-gradient(135deg,#3b6cff,#7a5cff 55%,#ff5c8a);\r\n  --grad-soft: linear-gradient(135deg,#eef2ff,#f5ecff 55%,#ffeef5);\r\n  --radius: 18px;\r\n  --radius-sm: 12px;\r\n  --radius-lg: 26px;\r\n  --shadow: 0 10px 30px rgba(18,24,40,.08), 0 2px 6px rgba(18,24,40,.04);\r\n  --shadow-lg: 0 24px 60px rgba(18,24,40,.14), 0 6px 16px rgba(18,24,40,.06);\r\n  --font-sans: 'Inter','Noto Sans SC',-apple-system,BlinkMacSystemFont,Helvetica,Arial,sans-serif;\r\n  --font-serif: 'Playfair Display','Noto Serif SC',Georgia,serif;\r\n  --font-mono: 'JetBrains Mono','IBM Plex Mono',SFMono-Regular,Menlo,monospace;\r\n  --font-display: var(--font-sans);\r\n  --letter-tight: -.03em;\r\n  --letter-normal: -.01em;\r\n  --ease: cubic-bezier(.4,0,.2,1);\r\n}\r\n\r\n*,*::before,*::after{box-sizing:border-box}\r\nhtml,body{margin:0;padding:0;background:var(--bg);color:var(--text-1);\r\n  font-family:var(--font-sans);font-weight:400;line-height:1.6;\r\n  -webkit-font-smoothing:antialiased;-moz-osx-font-smoothing:grayscale;\r\n  letter-spacing:var(--letter-normal)}\r\nimg,svg,video{max-width:100%;display:block}\r\na{color:var(--accent);text-decoration:none}\r\na:hover{text-decoration:underline}\r\ncode,kbd,pre,samp{font-family:var(--font-mono)}\r\n\r\n/* ================= SLIDE SYSTEM ================= */\r\n.deck{position:relative;width:100vw;height:100vh;overflow:hidden;background:var(--bg)}\r\n.slide{\r\n  position:absolute;inset:0;\r\n  display:flex;flex-direction:column;justify-content:center;\r\n  padding:72px 96px;\r\n  box-sizing:border-box;\r\n  opacity:0;pointer-events:none;\r\n  transition:opacity .5s var(--ease), transform .5s var(--ease);\r\n  transform:translateX(30px);\r\n  overflow:hidden;\r\n}\r\n.slide.is-active{opacity:1;pointer-events:auto;transform:translateX(0);z-index:2}\r\n.slide.is-prev{transform:translateX(-30px)}\r\n\r\n/* single-page standalone (used when a layout file is opened directly) */\r\nbody.single .slide{position:relative;width:100vw;height:100vh;opacity:1;transform:none;pointer-events:auto}\r\n\r\n/* ================= TYPOGRAPHY ================= */\r\n.eyebrow{font-size:13px;font-weight:500;letter-spacing:.16em;text-transform:uppercase;color:var(--text-3)}\r\n.kicker{font-size:14px;font-weight:600;color:var(--accent);letter-spacing:.08em;text-transform:uppercase}\r\nh1.title,.h1{font-family:var(--font-display);font-size:72px;line-height:1.05;font-weight:800;letter-spacing:var(--letter-tight);margin:0 0 18px;color:var(--text-1)}\r\nh2.title,.h2{font-family:var(--font-display);font-size:54px;line-height:1.1;font-weight:700;letter-spacing:var(--letter-tight);margin:0 0 14px}\r\nh3,.h3{font-size:32px;line-height:1.2;font-weight:600;letter-spacing:var(--letter-normal);margin:0 0 10px}\r\nh4,.h4{font-size:22px;line-height:1.3;font-weight:600;margin:0 0 8px}\r\n.lede{font-size:22px;line-height:1.55;color:var(--text-2);font-weight:300;max-width:62ch}\r\n.dim{color:var(--text-2)}\r\n.dim2{color:var(--text-3)}\r\n.mono{font-family:var(--font-mono)}\r\n.serif{font-family:var(--font-serif)}\r\n.gradient-text{background:var(--grad);-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent;color:transparent}\r\n\r\n/* ================= LAYOUT PRIMITIVES ================= */\r\n.stack>*+*{margin-top:14px}\r\n.row{display:flex;gap:24px;align-items:center}\r\n.row.wrap{flex-wrap:wrap}\r\n.grid{display:grid;gap:24px}\r\n.g2{grid-template-columns:repeat(2,1fr)}\r\n.g3{grid-template-columns:repeat(3,1fr)}\r\n.g4{grid-template-columns:repeat(4,1fr)}\r\n.center{display:flex;align-items:center;justify-content:center;text-align:center}\r\n.fill{flex:1}\r\n.sp-t{padding-top:24px}.sp-b{padding-bottom:24px}\r\n.mt-s{margin-top:8px}.mt-m{margin-top:18px}.mt-l{margin-top:32px}\r\n.mb-s{margin-bottom:8px}.mb-m{margin-bottom:18px}.mb-l{margin-bottom:32px}\r\n\r\n/* ================= CARDS ================= */\r\n.card{background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);\r\n  padding:26px 28px;box-shadow:var(--shadow);position:relative;overflow:hidden}\r\n.card-soft{background:var(--surface-2);border:1px solid var(--border)}\r\n.card-outline{background:transparent;border:1.5px solid var(--border-strong);box-shadow:none}\r\n.card-accent{background:var(--surface);border-top:3px solid var(--accent)}\r\n.card-hover{transition:transform .3s var(--ease),box-shadow .3s var(--ease)}\r\n.card-hover:hover{transform:translateY(-4px);box-shadow:var(--shadow-lg)}\r\n\r\n.pill{display:inline-block;padding:4px 12px;border-radius:999px;font-size:12px;font-weight:500;\r\n  background:var(--surface-2);color:var(--text-2);border:1px solid var(--border)}\r\n.pill-accent{background:color-mix(in srgb,var(--accent) 12%,transparent);color:var(--accent);border-color:color-mix(in srgb,var(--accent) 28%,transparent)}\r\n\r\n/* ================= BARS / DIVIDERS ================= */\r\n.divider{height:1px;background:var(--border);width:100%}\r\n.divider-accent{height:3px;width:72px;background:var(--accent);border-radius:2px}\r\n\r\n/* ================= CHROME (header/footer/progress) ================= */\r\n.deck-header{position:absolute;top:24px;left:40px;right:40px;display:flex;align-items:center;justify-content:space-between;\r\n  font-size:12px;color:var(--text-3);letter-spacing:.12em;text-transform:uppercase;z-index:10;pointer-events:none}\r\n.deck-footer{position:absolute;bottom:24px;left:40px;right:40px;display:flex;align-items:center;justify-content:space-between;\r\n  font-size:12px;color:var(--text-3);z-index:10;pointer-events:none}\r\n.slide-number::before{content:attr(data-current)}\r\n.slide-number::after{content:\" / \" attr(data-total)}\r\n.progress-bar{position:fixed;left:0;right:0;bottom:0;height:3px;background:transparent;z-index:20}\r\n.progress-bar > span{display:block;height:100%;width:0;background:var(--accent);transition:width .3s var(--ease)}\r\n\r\n/* ================= PRESENTER / OVERVIEW ================= */\r\n.notes{display:none!important}\r\n.notes-overlay{position:fixed;inset:auto 0 0 0;max-height:42vh;background:rgba(20,22,30,.95);color:#e8ebf4;\r\n  padding:20px 32px;font-size:16px;line-height:1.6;border-top:1px solid rgba(255,255,255,.1);transform:translateY(100%);\r\n  transition:transform .3s var(--ease);z-index:40;overflow:auto;font-family:var(--font-sans)}\r\n.notes-overlay.open{transform:translateY(0)}\r\n.overview{position:fixed;inset:0;background:rgba(10,12,18,.92);backdrop-filter:blur(12px);z-index:50;\r\n  display:none;padding:40px;overflow:auto}\r\n.overview.open{display:grid;grid-template-columns:repeat(4,1fr);gap:20px;align-content:start}\r\n.overview .thumb{background:var(--surface);border:1px solid var(--border);border-radius:12px;\r\n  aspect-ratio:16/9;overflow:hidden;cursor:pointer;position:relative;color:var(--text-1);padding:16px;\r\n  font-size:11px;transition:transform .2s var(--ease)}\r\n.overview .thumb:hover{transform:scale(1.04)}\r\n.overview .thumb .n{position:absolute;top:8px;left:10px;font-weight:700;font-size:14px;color:var(--text-3)}\r\n.overview .thumb .t{position:absolute;bottom:10px;left:14px;right:14px;font-weight:600;color:var(--text-1)}\r\n\r\n/* ================= PRESENTER VIEW ================= */\r\n/* Presenter view opens in a separate popup window (S key).\r\n * All presenter styles are self-contained in the popup HTML generated by runtime.js.\r\n * The audience window (this file) is NOT affected — it stays as normal deck view.\r\n * Only the .notes class below is needed to hide speaker notes from audience. */\r\n\r\n/* ================= UTILITY ================= */\r\n.hidden{display:none!important}\r\n.nowrap{white-space:nowrap}\r\n.tr{text-align:right}.tc{text-align:center}.tl{text-align:left}\r\n.uppercase{text-transform:uppercase;letter-spacing:.12em}\r\n\r\n/* ================= PRINT ================= */\r\n@media print{\r\n  .slide{position:relative;opacity:1!important;transform:none!important;page-break-after:always;height:100vh}\r\n  .deck-header,.deck-footer,.progress-bar,.notes-overlay,.overview{display:none!important}\r\n}\r\n\r\n</style>\r\n<style>/* html-ppt :: animations.css\r\n * Apply by adding class=\"anim-<name>\" or data-anim=\"<name>\".\r\n * Durations are deliberately snappy; tweak --anim-dur per element.\r\n */\r\n:root{--anim-dur:.7s;--anim-ease:cubic-bezier(.4,0,.2,1)}\r\n\r\n/* ---------- FADE DIRECTIONALS ---------- */\r\n@keyframes kf-fade-up{from{opacity:0;transform:translateY(32px)}to{opacity:1;transform:none}}\r\n@keyframes kf-fade-down{from{opacity:0;transform:translateY(-32px)}to{opacity:1;transform:none}}\r\n@keyframes kf-fade-left{from{opacity:0;transform:translateX(-40px)}to{opacity:1;transform:none}}\r\n@keyframes kf-fade-right{from{opacity:0;transform:translateX(40px)}to{opacity:1;transform:none}}\r\n.anim-fade-up{animation:kf-fade-up var(--anim-dur) var(--anim-ease) both}\r\n.anim-fade-down{animation:kf-fade-down var(--anim-dur) var(--anim-ease) both}\r\n.anim-fade-left{animation:kf-fade-left var(--anim-dur) var(--anim-ease) both}\r\n.anim-fade-right{animation:kf-fade-right var(--anim-dur) var(--anim-ease) both}\r\n\r\n/* ---------- RISE / DROP / ZOOM / BLUR / GLITCH ---------- */\r\n@keyframes kf-rise{from{opacity:0;transform:translateY(60px) scale(.97);filter:blur(6px)}to{opacity:1;transform:none;filter:none}}\r\n@keyframes kf-drop{from{opacity:0;transform:translateY(-60px) scale(.97)}to{opacity:1;transform:none}}\r\n@keyframes kf-zoom{0%{opacity:0;transform:scale(.6)}60%{transform:scale(1.04)}100%{opacity:1;transform:scale(1)}}\r\n@keyframes kf-blur{from{opacity:0;filter:blur(18px)}to{opacity:1;filter:none}}\r\n@keyframes kf-glitch{0%{opacity:0;transform:translateX(0);clip-path:inset(0 0 0 0)}\r\n  20%{opacity:1;transform:translateX(-6px);clip-path:inset(20% 0 30% 0)}\r\n  40%{transform:translateX(4px);clip-path:inset(50% 0 10% 0)}\r\n  60%{transform:translateX(-3px);clip-path:inset(10% 0 60% 0)}\r\n  80%{transform:translateX(2px);clip-path:inset(0 0 0 0)}\r\n  100%{opacity:1;transform:none}}\r\n.anim-rise-in{animation:kf-rise .9s var(--anim-ease) both}\r\n.anim-drop-in{animation:kf-drop .8s var(--anim-ease) both}\r\n.anim-zoom-pop{animation:kf-zoom .7s cubic-bezier(.22,1.3,.36,1) both}\r\n.anim-blur-in{animation:kf-blur .8s var(--anim-ease) both}\r\n.anim-glitch-in{animation:kf-glitch .8s steps(5,end) both}\r\n\r\n/* ---------- TYPEWRITER ---------- */\r\n.anim-typewriter{display:inline-block;overflow:hidden;white-space:nowrap;border-right:2px solid currentColor;\r\n  width:0;animation:kf-type 2.4s steps(40,end) forwards, kf-caret 1s step-end infinite}\r\n@keyframes kf-type{to{width:100%}}\r\n@keyframes kf-caret{50%{border-color:transparent}}\r\n\r\n/* ---------- GLOW / SHIMMER / GRADIENT-FLOW ---------- */\r\n@keyframes kf-neon{0%,100%{text-shadow:0 0 8px var(--accent),0 0 20px var(--accent)}\r\n  50%{text-shadow:0 0 16px var(--accent),0 0 40px var(--accent),0 0 80px var(--accent)}}\r\n.anim-neon-glow{animation:kf-neon 2s ease-in-out infinite}\r\n\r\n.anim-shimmer-sweep{position:relative;overflow:hidden}\r\n.anim-shimmer-sweep::after{content:\"\";position:absolute;inset:0;\r\n  background:linear-gradient(110deg,transparent 40%,rgba(255,255,255,.55) 50%,transparent 60%);\r\n  transform:translateX(-100%);animation:kf-shimmer 2.4s var(--anim-ease) infinite}\r\n@keyframes kf-shimmer{to{transform:translateX(100%)}}\r\n\r\n.anim-gradient-flow{background:linear-gradient(90deg,var(--accent),var(--accent-2,var(--accent)),var(--accent-3,var(--accent)),var(--accent));\r\n  background-size:300% 100%;-webkit-background-clip:text;background-clip:text;color:transparent;-webkit-text-fill-color:transparent;\r\n  animation:kf-gradflow 4s linear infinite}\r\n@keyframes kf-gradflow{to{background-position:300% 0}}\r\n\r\n/* ---------- STAGGER LIST ---------- */\r\n.anim-stagger-list > *{opacity:0;animation:kf-rise .65s var(--anim-ease) both}\r\n.anim-stagger-list > *:nth-child(1){animation-delay:.05s}\r\n.anim-stagger-list > *:nth-child(2){animation-delay:.15s}\r\n.anim-stagger-list > *:nth-child(3){animation-delay:.25s}\r\n.anim-stagger-list > *:nth-child(4){animation-delay:.35s}\r\n.anim-stagger-list > *:nth-child(5){animation-delay:.45s}\r\n.anim-stagger-list > *:nth-child(6){animation-delay:.55s}\r\n.anim-stagger-list > *:nth-child(7){animation-delay:.65s}\r\n.anim-stagger-list > *:nth-child(8){animation-delay:.75s}\r\n.anim-stagger-list > *:nth-child(n+9){animation-delay:.85s}\r\n\r\n/* ---------- COUNTER-UP (JS-driven, marker class only) ---------- */\r\n.counter{font-variant-numeric:tabular-nums}\r\n\r\n/* ---------- SVG PATH DRAW ---------- */\r\n.anim-path-draw path,.anim-path-draw line,.anim-path-draw polyline,.anim-path-draw circle,.anim-path-draw rect{\r\n  stroke-dasharray:1000;stroke-dashoffset:1000;animation:kf-draw 2s var(--anim-ease) forwards}\r\n@keyframes kf-draw{to{stroke-dashoffset:0}}\r\n\r\n/* ---------- PARALLAX TILT (hover) ---------- */\r\n.anim-parallax-tilt{transform-style:preserve-3d;transition:transform .4s var(--anim-ease)}\r\n.anim-parallax-tilt:hover{transform:perspective(900px) rotateX(6deg) rotateY(-8deg) translateZ(10px)}\r\n\r\n/* ---------- CARD FLIP 3D ---------- */\r\n@keyframes kf-flip{from{transform:perspective(1200px) rotateY(-90deg);opacity:0}\r\n  to{transform:perspective(1200px) rotateY(0);opacity:1}}\r\n.anim-card-flip-3d{animation:kf-flip .9s var(--anim-ease) both;transform-style:preserve-3d;backface-visibility:hidden}\r\n\r\n/* ---------- CUBE ROTATE 3D ---------- */\r\n@keyframes kf-cube{from{transform:perspective(1200px) rotateX(20deg) rotateY(-90deg) translateZ(-200px);opacity:0}\r\n  to{transform:perspective(1200px) rotateX(0) rotateY(0) translateZ(0);opacity:1}}\r\n.anim-cube-rotate-3d{animation:kf-cube 1s var(--anim-ease) both}\r\n\r\n/* ---------- PAGE TURN 3D ---------- */\r\n@keyframes kf-pageturn{from{transform:perspective(1600px) rotateY(-85deg);transform-origin:left center;opacity:0}\r\n  to{transform:perspective(1600px) rotateY(0);opacity:1}}\r\n.anim-page-turn-3d{animation:kf-pageturn 1s var(--anim-ease) both;transform-origin:left center}\r\n\r\n/* ---------- PERSPECTIVE ZOOM ---------- */\r\n@keyframes kf-pzoom{from{opacity:0;transform:perspective(1400px) translateZ(-400px) rotateX(12deg)}\r\n  to{opacity:1;transform:none}}\r\n.anim-perspective-zoom{animation:kf-pzoom 1s var(--anim-ease) both}\r\n\r\n/* ---------- MARQUEE SCROLL ---------- */\r\n.anim-marquee-scroll{display:flex;gap:48px;white-space:nowrap;animation:kf-marquee 20s linear infinite}\r\n@keyframes kf-marquee{from{transform:translateX(0)}to{transform:translateX(-50%)}}\r\n\r\n/* ---------- KEN BURNS ---------- */\r\n@keyframes kf-kenburns{0%{transform:scale(1) translate(0,0)}100%{transform:scale(1.15) translate(-2%,-1%)}}\r\n.anim-kenburns{animation:kf-kenburns 14s ease-in-out infinite alternate}\r\n\r\n/* ---------- CONFETTI BURST (pseudo — pure CSS sparkles) ---------- */\r\n.anim-confetti-burst{position:relative}\r\n.anim-confetti-burst::before,.anim-confetti-burst::after{\r\n  content:\"\";position:absolute;top:50%;left:50%;width:8px;height:8px;border-radius:50%;\r\n  background:var(--accent);box-shadow:\r\n    20px -30px 0 var(--accent-2,var(--accent)),-25px -20px 0 var(--accent-3,var(--accent)),\r\n    30px 20px 0 var(--good,#1aaf6c),-30px 25px 0 var(--warn,#f5a524),\r\n    40px -10px 0 var(--bad,#e0445a),-45px 0 0 var(--accent),\r\n    10px 40px 0 var(--accent-2,var(--accent)),-15px -40px 0 var(--accent-3,var(--accent));\r\n  opacity:0;animation:kf-confetti 1.2s var(--anim-ease) forwards}\r\n.anim-confetti-burst::after{animation-delay:.15s;transform:rotate(45deg)}\r\n@keyframes kf-confetti{0%{opacity:0;transform:scale(.2)}30%{opacity:1}100%{opacity:0;transform:scale(2.2)}}\r\n\r\n/* ---------- SPOTLIGHT ---------- */\r\n@keyframes kf-spot{0%{clip-path:circle(0% at 50% 50%)}100%{clip-path:circle(140% at 50% 50%)}}\r\n.anim-spotlight{animation:kf-spot 1.1s var(--anim-ease) both}\r\n\r\n/* ---------- MORPH SHAPE (SVG) ---------- */\r\n.anim-morph-shape path{animation:kf-morph 6s ease-in-out infinite alternate}\r\n@keyframes kf-morph{0%{d:path(\"M60,120 Q120,20 180,120 T300,120\")}\r\n  100%{d:path(\"M60,120 Q120,220 180,120 T300,120\")}}\r\n\r\n/* ---------- RIPPLE REVEAL ---------- */\r\n@keyframes kf-ripple{0%{clip-path:circle(0% at 20% 80%);opacity:.4}\r\n  100%{clip-path:circle(160% at 20% 80%);opacity:1}}\r\n.anim-ripple-reveal{animation:kf-ripple 1.2s var(--anim-ease) both}\r\n\r\n/* reduced motion */\r\n@media (prefers-reduced-motion: reduce){\r\n  [class*=\"anim-\"]{animation:none!important;transition:none!important}\r\n}\r\n\r\n</style>\r\n<style>/* tech-sharing — 技术分享 dark, code-forward */\r\n.tpl-tech-sharing{\r\n  --bg:#0d1117;--bg-soft:#161b22;--surface:#161b22;--surface-2:#1c2230;\r\n  --border:rgba(139,148,158,.22);--border-strong:rgba(139,148,158,.4);\r\n  --text-1:#e6edf3;--text-2:#8b949e;--text-3:#6e7681;\r\n  --accent:#7ee787;--accent-2:#79c0ff;--accent-3:#ff7b72;\r\n  --grad:linear-gradient(120deg,#7ee787 0%,#79c0ff 60%,#d2a8ff 100%);\r\n  --radius:14px;--radius-lg:20px;\r\n  --shadow:0 20px 60px rgba(0,0,0,.5);\r\n  font-family:'Inter','Noto Sans SC',sans-serif;\r\n}\r\n.tpl-tech-sharing{background:#0d1117;color:var(--text-1)}\r\n.tpl-tech-sharing .slide{padding:72px 96px;background:#0d1117;color:var(--text-1)}\r\n.tpl-tech-sharing .slide::before{content:\"\";position:absolute;inset:0;background:\r\n  radial-gradient(60% 50% at 90% 10%,rgba(121,192,255,.12),transparent 60%),\r\n  radial-gradient(50% 50% at 10% 90%,rgba(126,231,135,.08),transparent 60%);\r\n  pointer-events:none;z-index:0}\r\n.tpl-tech-sharing .slide>*{position:relative;z-index:1}\r\n.tpl-tech-sharing .h1{font-size:78px;line-height:1.03;font-weight:800;letter-spacing:-.03em;color:#fff}\r\n.tpl-tech-sharing .h2{font-size:54px;font-weight:700;letter-spacing:-.025em;color:#fff}\r\n.tpl-tech-sharing h3,.tpl-tech-sharing h4{color:#fff}\r\n.tpl-tech-sharing .kicker{color:var(--accent);font-family:'JetBrains Mono',monospace;font-size:13px;font-weight:600;text-transform:none;letter-spacing:.02em}\r\n.tpl-tech-sharing .kicker::before{content:\"> \"}\r\n.tpl-tech-sharing .mono{font-family:'JetBrains Mono','IBM Plex Mono',monospace}\r\n.tpl-tech-sharing .terminal{background:#010409;border:1px solid var(--border);border-radius:var(--radius);overflow:hidden;box-shadow:0 30px 80px rgba(0,0,0,.6);font-family:'JetBrains Mono',monospace;font-size:15px;line-height:1.65}\r\n.tpl-tech-sharing .terminal .bar{display:flex;align-items:center;gap:8px;padding:12px 16px;background:#161b22;border-bottom:1px solid var(--border);font-size:12px;color:var(--text-3)}\r\n.tpl-tech-sharing .terminal .dot{width:12px;height:12px;border-radius:50%;background:#ff5f56}\r\n.tpl-tech-sharing .terminal .dot:nth-child(2){background:#ffbd2e}\r\n.tpl-tech-sharing .terminal .dot:nth-child(3){background:#27c93f}\r\n.tpl-tech-sharing .terminal pre{margin:0;padding:24px 28px;color:#e6edf3;overflow:auto;max-height:440px}\r\n.tpl-tech-sharing .kw{color:#ff7b72}\r\n.tpl-tech-sharing .fn{color:#d2a8ff}\r\n.tpl-tech-sharing .str{color:#a5d6ff}\r\n.tpl-tech-sharing .cmt{color:#8b949e;font-style:italic}\r\n.tpl-tech-sharing .num{color:#79c0ff}\r\n.tpl-tech-sharing .card{background:var(--surface);border:1px solid var(--border);box-shadow:none}\r\n.tpl-tech-sharing .card-accent{border-top:3px solid var(--accent)}\r\n.tpl-tech-sharing .pill{background:var(--surface-2);color:var(--text-2);border-color:var(--border)}\r\n.tpl-tech-sharing .pill-accent{background:rgba(126,231,135,.12);color:var(--accent);border-color:rgba(126,231,135,.35)}\r\n.tpl-tech-sharing .tag{display:inline-flex;align-items:center;gap:6px;padding:4px 10px;border-radius:6px;font-family:'JetBrains Mono',monospace;font-size:12px;background:var(--surface-2);border:1px solid var(--border);color:var(--text-2)}\r\n.tpl-tech-sharing .agenda-row{display:flex;align-items:baseline;gap:24px;padding:18px 0;border-bottom:1px dashed var(--border);font-family:'JetBrains Mono',monospace}\r\n.tpl-tech-sharing .agenda-row .num{color:var(--accent);flex:none;width:48px}\r\n.tpl-tech-sharing .agenda-row .t{color:#fff;font-size:24px;flex:1;font-family:'Inter',sans-serif;font-weight:600}\r\n.tpl-tech-sharing .agenda-row .d{color:var(--text-3);font-size:13px}\r\n.tpl-tech-sharing .speaker{display:flex;align-items:center;gap:14px;margin-top:28px}\r\n.tpl-tech-sharing .speaker .av{width:56px;height:56px;border-radius:50%;background:var(--grad)}\r\n.tpl-tech-sharing .speaker b{display:block;color:#fff;font-size:18px}\r\n.tpl-tech-sharing .speaker span{color:var(--text-3);font-size:13px;font-family:'JetBrains Mono',monospace}\r\n.tpl-tech-sharing .lede{color:var(--text-2)}\r\n\r\n</style>\r\n<style>\r\n/* Static-preview fallback (runtime.js is absent — keep every slide visible) */\r\n.deck{height:auto;min-height:100vh;overflow:visible}\r\n.slide{position:relative;inset:auto;opacity:1;pointer-events:auto;transform:none;height:100vh;page-break-after:always}\r\n.deck-header,.deck-footer,.slide-number,.progress-bar,.notes-overlay,.overview{pointer-events:none}\r\n.notes{display:none!important}\r\n</style></head>\r\n<body class=\"tpl-tech-sharing\">\r\n<div class=\"deck\">\r\n\r\n  <!-- 1. Cover -->\r\n  <section class=\"slide\" data-title=\"Cover\">\r\n    <p class=\"kicker\">tech-sharing / 2026-04-15</p>\r\n    <h1 class=\"h1 anim-fade-up\" data-anim=\"fade-up\">Rust 异步运行时<br>到底在<span style=\"background:var(--grad);-webkit-background-clip:text;background-clip:text;color:transparent\">调度什么</span>?</h1>\r\n    <p class=\"lede mt-m\">从 <span class=\"mono\">Future::poll</span> 到 tokio 的 work-stealing，一次讲清楚。</p>\r\n    <div class=\"speaker\"><div class=\"av\"></div><div><b>@lewis</b><span>platform infra · 45 min + Q&amp;A</span></div></div>\r\n    <div class=\"deck-footer\"><span class=\"mono\">#async #rust #tokio</span><span class=\"slide-number\" data-current=\"1\" data-total=\"8\"></span></div>\r\n  </section>\r\n\r\n  <!-- 2. Agenda -->\r\n  <section class=\"slide\" data-title=\"Agenda\">\r\n    <p class=\"kicker\">agenda.toml</p>\r\n    <h2 class=\"h2\">今天的路线图</h2>\r\n    <div class=\"stack mt-l\">\r\n      <div class=\"agenda-row\"><span class=\"num\">01</span><span class=\"t\">Context: 为什么需要 async</span><span class=\"d\">~5min</span></div>\r\n      <div class=\"agenda-row\"><span class=\"num\">02</span><span class=\"t\">Deep dive 1: Future &amp; Waker</span><span class=\"d\">~12min</span></div>\r\n      <div class=\"agenda-row\"><span class=\"num\">03</span><span class=\"t\">Deep dive 2: Tokio scheduler</span><span class=\"d\">~15min</span></div>\r\n      <div class=\"agenda-row\"><span class=\"num\">04</span><span class=\"t\">Code: 手写一个 mini-runtime</span><span class=\"d\">~8min</span></div>\r\n      <div class=\"agenda-row\"><span class=\"num\">05</span><span class=\"t\">Takeaways + Q&amp;A</span><span class=\"d\">~5min</span></div>\r\n    </div>\r\n  </section>\r\n\r\n  <!-- 3. Context -->\r\n  <section class=\"slide\" data-title=\"Context\">\r\n    <p class=\"kicker\">// context</p>\r\n    <h2 class=\"h2\">问题：一个线程一个连接，<br>撑不住 10 万并发。</h2>\r\n    <div class=\"grid g3 mt-l\">\r\n      <div class=\"card card-accent\"><h4>Thread-per-conn</h4><p class=\"dim\">每条连接一根 OS 线程，栈 2–8MB。10 万连接 = 几百 GB RAM。</p><span class=\"tag mt-s\">❌ 不现实</span></div>\r\n      <div class=\"card card-accent\"><h4>Event loop (C)</h4><p class=\"dim\">epoll/kqueue + 回调地狱。快，但写起来痛苦且容易出 bug。</p><span class=\"tag mt-s\">😩 callback hell</span></div>\r\n      <div class=\"card card-accent\"><h4>Async / await</h4><p class=\"dim\">看起来像同步代码，编译成状态机。一根线程跑几千任务。</p><span class=\"tag mt-s\">✅ Rust 选这个</span></div>\r\n    </div>\r\n  </section>\r\n\r\n  <!-- 4. Deep dive 1 -->\r\n  <section class=\"slide\" data-title=\"Deep Dive 1\">\r\n    <p class=\"kicker\">deep-dive · 1 / 2</p>\r\n    <h2 class=\"h2\">Future 其实只有一个方法。</h2>\r\n    <div class=\"grid g2 mt-l\" style=\"align-items:start\">\r\n      <div>\r\n        <p class=\"lede\">编译器把 <span class=\"mono\">async fn</span> 变成一个实现了 <span class=\"mono\">Future</span> trait 的匿名状态机。运行时只做一件事：反复 <span class=\"mono\">poll</span> 它，直到返回 <span class=\"mono\">Ready</span>。</p>\r\n        <div class=\"mt-l\">\r\n          <span class=\"tag\">Pending</span> <span class=\"tag\">Ready(T)</span> <span class=\"tag\">Waker.wake()</span>\r\n        </div>\r\n      </div>\r\n      <div class=\"terminal\">\r\n        <div class=\"bar\"><span class=\"dot\"></span><span class=\"dot\"></span><span class=\"dot\"></span><span>future.rs</span></div>\r\n<pre><span class=\"kw\">pub trait</span> <span class=\"fn\">Future</span> {\r\n    <span class=\"kw\">type</span> Output;\r\n    <span class=\"kw\">fn</span> <span class=\"fn\">poll</span>(\r\n        <span class=\"kw\">self</span>: Pin&lt;&amp;<span class=\"kw\">mut Self</span>&gt;,\r\n        cx: &amp;<span class=\"kw\">mut</span> Context&lt;<span class=\"str\">'_</span>&gt;,\r\n    ) -&gt; Poll&lt;<span class=\"kw\">Self</span>::Output&gt;;\r\n}\r\n\r\n<span class=\"cmt\">// Poll::Pending   → 挂起，等 waker 唤醒</span>\r\n<span class=\"cmt\">// Poll::Ready(v)  → 完成，产出 v</span></pre>\r\n      </div>\r\n    </div>\r\n  </section>\r\n\r\n  <!-- 5. Deep dive 2 -->\r\n  <section class=\"slide\" data-title=\"Deep Dive 2\">\r\n    <p class=\"kicker\">deep-dive · 2 / 2</p>\r\n    <h2 class=\"h2\">Tokio 是一个偷任务的小工。</h2>\r\n    <div class=\"grid g2 mt-l\" style=\"align-items:start\">\r\n      <div>\r\n        <p class=\"lede\">Multi-thread runtime = N 个 worker，每个 worker 有自己的本地队列。空闲的 worker 会去别人队列里\"偷\"任务。</p>\r\n        <div class=\"stack mt-m\">\r\n          <div class=\"tag\">✦ local queue · 256 slots</div>\r\n          <div class=\"tag\">✦ global injection queue</div>\r\n          <div class=\"tag\">✦ work-stealing @ 50% steal ratio</div>\r\n          <div class=\"tag\">✦ LIFO slot for cache locality</div>\r\n        </div>\r\n      </div>\r\n      <div class=\"card\" style=\"padding:32px\">\r\n        <h4 class=\"mono\" style=\"color:var(--accent-2)\">scheduler tick loop</h4>\r\n        <div class=\"stack mt-m\" style=\"font-family:'JetBrains Mono',monospace;font-size:14px;line-height:1.9;color:var(--text-2)\">\r\n          <div><span style=\"color:var(--accent)\">1.</span> pop from LIFO slot</div>\r\n          <div><span style=\"color:var(--accent)\">2.</span> else pop from local queue</div>\r\n          <div><span style=\"color:var(--accent)\">3.</span> else drain global queue (every 61 ticks)</div>\r\n          <div><span style=\"color:var(--accent)\">4.</span> else steal from random victim</div>\r\n          <div><span style=\"color:var(--accent)\">5.</span> else park the thread</div>\r\n        </div>\r\n      </div>\r\n    </div>\r\n  </section>\r\n\r\n  <!-- 6. Code example -->\r\n  <section class=\"slide\" data-title=\"Code\">\r\n    <p class=\"kicker\">mini-runtime.rs · ~40 LOC</p>\r\n    <h2 class=\"h2\">手写一个最小 runtime。</h2>\r\n    <div class=\"terminal mt-m\">\r\n      <div class=\"bar\"><span class=\"dot\"></span><span class=\"dot\"></span><span class=\"dot\"></span><span>src/main.rs</span></div>\r\n<pre><span class=\"kw\">use</span> std::collections::VecDeque;\r\n<span class=\"kw\">use</span> std::sync::{Arc, Mutex};\r\n<span class=\"kw\">use</span> std::task::{Context, Poll, Wake, Waker};\r\n\r\n<span class=\"kw\">struct</span> Task(Mutex&lt;Pin&lt;Box&lt;<span class=\"kw\">dyn</span> Future&lt;Output = ()&gt; + Send&gt;&gt;&gt;);\r\n\r\n<span class=\"kw\">impl</span> Wake <span class=\"kw\">for</span> Task {\r\n    <span class=\"kw\">fn</span> <span class=\"fn\">wake</span>(<span class=\"kw\">self</span>: Arc&lt;<span class=\"kw\">Self</span>&gt;) { QUEUE.lock().unwrap().push_back(<span class=\"kw\">self</span>); }\r\n}\r\n\r\n<span class=\"kw\">fn</span> <span class=\"fn\">block_on</span>&lt;F: Future&lt;Output = ()&gt; + Send + <span class=\"str\">'static</span>&gt;(fut: F) {\r\n    <span class=\"fn\">spawn</span>(fut);\r\n    <span class=\"kw\">while let Some</span>(task) = QUEUE.lock().unwrap().pop_front() {\r\n        <span class=\"kw\">let</span> waker = Waker::from(task.clone());\r\n        <span class=\"kw\">let mut</span> cx = Context::from_waker(&amp;waker);\r\n        <span class=\"kw\">let mut</span> fut = task.<span class=\"num\">0</span>.lock().unwrap();\r\n        <span class=\"kw\">let</span> _ = fut.as_mut().<span class=\"fn\">poll</span>(&amp;<span class=\"kw\">mut</span> cx); <span class=\"cmt\">// 就是这一行</span>\r\n    }\r\n}</pre>\r\n    </div>\r\n  </section>\r\n\r\n  <!-- 7. Takeaways -->\r\n  <section class=\"slide\" data-title=\"Takeaways\">\r\n    <p class=\"kicker\">// takeaways</p>\r\n    <h2 class=\"h2\">三件事带回去。</h2>\r\n    <div class=\"grid g3 mt-l\">\r\n      <div class=\"card card-accent\"><h4>1 · async 是零成本抽象</h4><p class=\"dim\">编译成状态机，没有运行时虚表，没有 GC。</p></div>\r\n      <div class=\"card card-accent\"><h4>2 · Waker 是脉搏</h4><p class=\"dim\">Future 不主动做事，运行时靠 waker 决定\"什么时候再 poll\"。</p></div>\r\n      <div class=\"card card-accent\"><h4>3 · 别在 async 里阻塞</h4><p class=\"dim\">一行 <span class=\"mono\">std::fs::read</span> 能让整个 worker 停摆。用 <span class=\"mono\">spawn_blocking</span>。</p></div>\r\n    </div>\r\n    <p class=\"lede mt-l\">延伸阅读：<span class=\"mono\">tokio.rs/blog/2019-10-scheduler</span> · <span class=\"mono\">rust-lang.github.io/async-book</span></p>\r\n  </section>\r\n\r\n  <!-- 8. Q&A -->\r\n  <section class=\"slide center tc\" data-title=\"Q and A\">\r\n    <div>\r\n      <div class=\"mono\" style=\"font-size:120px;color:var(--accent);font-weight:800;letter-spacing:-.04em\">?</div>\r\n      <h2 class=\"h2\">Questions?</h2>\r\n      <p class=\"lede\" style=\"margin:14px auto\">github.com/lewis · @lewis on slack</p>\r\n      <div class=\"row mt-l\" style=\"justify-content:center\">\r\n        <span class=\"tag\">slides: git.co/rt-deck</span>\r\n        <span class=\"tag\">code: git.co/mini-rt</span>\r\n      </div>\r\n    </div>\r\n  </section>\r\n\r\n</div>\r\n\r\n</body></html>\r\n","deck-tech-sharing/SKILL.md":"---\r\nname: deck-tech-sharing\r\nzh_name: \"技术分享 Deck\"\r\nen_name: \"Tech Sharing Deck\"\r\nemoji: \"💻\"\r\ndescription: \"GitHub-dark + JetBrains Mono + 终端代码块, 含 agenda + Q&A\"\r\ncategory: slides\r\nscenario: engineering\r\naspect_hint: \"16:9\"\r\nfeatured: 22\r\ntags: [\"tech talk\", \"conference\", \"engineering\"]\r\n---\r\n\r\n【模板: Tech Sharing Deck】\r\n【意图】工程内部分享 / 会议 talk 的 deck。\r\n【布局】\r\n- Cover (议题 + 讲者 + handle)\r\n- Agenda 页\r\n- 正文页若干 (代码块 + 关键观点)\r\n- Demo 页 (terminal 截图)\r\n- Q&A 页\r\n【设计细节】\r\n- GitHub-dark 配色 + JetBrains Mono\r\n","deck-xhs-pastel/SKILL.md":"---\r\nname: deck-xhs-pastel\r\nzh_name: \"马卡龙慢生活 Deck\"\r\nen_name: \"Pastel Slow-life Deck\"\r\nemoji: \"🍡\"\r\ndescription: \"奶油底 + 柔光 blob + 马卡龙圆角卡片 + Playfair 斜体序号\"\r\ncategory: slides\r\nscenario: personal\r\naspect_hint: \"16:9\"\r\nfeatured: 33\r\ntags: [\"xhs\", \"pastel\", \"lifestyle\", \"lifestyle\"]\r\n---\r\n\r\n【模板: 马卡龙慢生活 Deck】\r\n【意图】生活方式 / 个人成长 / 情绪向内容用 deck。\r\n【布局】\r\n- 奶油 #fef8f1 底 + 三个柔光 blob\r\n- Playfair 斜体衬线 display + sans 正文\r\n- 28px 圆角马卡龙卡片 (桃 / 薄荷 / 天 / 紫 / 柠 / 玫)\r\n- Playfair 斜体 01-04 序号\r\n- SVG donut 图 + chip+page 顶栏\r\n","deck-xhs-post/SKILL.md":"---\r\nname: deck-xhs-post\r\nzh_name: \"小红书图文 Deck\"\r\nen_name: \"Xiaohongshu Post Deck\"\r\nemoji: \"🎀\"\r\ndescription: \"9 页 3:4 竖版图文, 暖 pastel + 虚线 sticker 卡片\"\r\ncategory: slides\r\nscenario: marketing\r\naspect_hint: \"810×1080 ×9\"\r\nfeatured: 24\r\ntags: [\"xhs\", \"instagram\", \"carousel\"]\r\n---\r\n\r\n【模板: 小红书 / Instagram Carousel】\r\n【意图】发小红书 / IG carousel 的 9 页 3:4 竖版图文。\r\n【布局】\r\n- Cover + N 个 content 页 + 收尾 CTA (N 由【用户内容】决定, 完整覆盖每个要点; 短内容 7 页起步, 长内容应更多, 受小红书平台单帖图片数约束建议总数 ≤ 18)\r\n- 暖色 pastel 背景\r\n- 虚线 sticker 卡片 + 底部页码 dots\r\n","deck-xhs-white/SKILL.md":"---\r\nname: deck-xhs-white\r\nzh_name: \"白底杂志风 Deck\"\r\nen_name: \"White Editorial Deck\"\r\nemoji: \"🌈\"\r\ndescription: \"纯白 + 顶部彩虹 bar + 渐变文字 + 马卡龙软卡片 + 黑底 pill\"\r\ncategory: slides\r\nscenario: marketing\r\naspect_hint: \"16:9 / 3:4\"\r\nfeatured: 27\r\ntags: [\"editorial\", \"rainbow\", \"macaron\"]\r\n---\r\n\r\n【模板: 白底杂志风 Deck】\r\n【意图】可同时发小红书图文与横版 PPT 双用的白底杂志风。\r\n【布局】\r\n- 纯白背景 + 顶部 10 色彩虹 bar\r\n- 80-110px display 标题 + 紫→蓝→绿→橙→粉渐变文字\r\n- 马卡龙软卡片组 (粉 / 紫 / 蓝 / 绿 / 橙)\r\n- 黑底白字 .focus pill + 引用大块\r\n"});
const STATIC_ASSETS = Object.freeze({});

function corsHeaders() {
  return {
    "access-control-allow-origin": "*",
    "access-control-allow-methods": "GET, POST, OPTIONS",
    "access-control-allow-headers": "Content-Type, Authorization, X-API-Key, api-key",
    "access-control-expose-headers": "Content-Disposition",
  };
}

function json(payload, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      ...corsHeaders(),
    },
  });
}

function textResponse(text, type = "text/plain; charset=utf-8", status = 200) {
  return new Response(text, {
    status,
    headers: {
      "content-type": type,
      "cache-control": "no-store",
      ...corsHeaders(),
    },
  });
}

function bytesResponse(bytes, type, filename) {
  return new Response(bytes, {
    headers: {
      "content-type": type,
      "content-disposition": `attachment; filename="${filename}"`,
      "cache-control": "no-store",
      ...corsHeaders(),
    },
  });
}

function assetContentType(pathname) {
  if (pathname.endsWith(".html")) return "text/html; charset=utf-8";
  if (pathname.endsWith(".js")) return "text/javascript; charset=utf-8";
  if (pathname.endsWith(".css")) return "text/css; charset=utf-8";
  if (pathname.endsWith(".json")) return "application/json; charset=utf-8";
  return "text/plain; charset=utf-8";
}

async function freshAsset(env, request, pathname) {
  // Production serves the frontend from Cloudflare's static asset binding.
  // Keep the embedded map as a development/rollback fallback, but never make
  // a large HTML/JS asset pass through the Worker when the binding is present.
  if (env?.ASSETS?.fetch) {
    try {
      const target = new URL(pathname, request.url);
      const assetResponse = await env.ASSETS.fetch(new Request(target, request));
      if (assetResponse.status !== 404) return assetResponse;
    } catch {
      // Fall through to the embedded fallback below. This keeps local preview
      // and an older deployment usable while assets are being rolled out.
    }
  }
  const key = pathname.replace(/^\//, "");
  const body = STATIC_ASSETS[key];
  if (body === undefined) return textResponse("not_found", "text/plain; charset=utf-8", 404);
  return new Response(body, {
    status: 200,
    headers: {
      "content-type": assetContentType(pathname),
      "cache-control": "no-store, no-cache, must-revalidate",
      "pragma": "no-cache",
      ...corsHeaders(),
    },
  });
}

function publicIntegration(config = integrationConfig) {
  const { apiKey, ...rest } = config;
  return {
    ...rest,
    hasApiKey: Boolean(apiKey),
    apiKeyMasked: apiKey ? `${apiKey.slice(0, 4)}...${apiKey.slice(-4)}` : "",
  };
}

async function readJson(request) {
  try {
    return await request.json();
  } catch {
    throw new Error("Request body must be JSON.");
  }
}

function decodeDataUrl(dataUrl) {
  const match = String(dataUrl || "").match(/^data:([^;,]+)?(;base64)?,(.*)$/);
  if (!match) throw new Error("Invalid uploaded file payload.");
  const isBase64 = Boolean(match[2]);
  const payload = match[3] || "";
  const binary = isBase64 ? atob(payload) : decodeURIComponent(payload);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function bytesToBase64(bytes) {
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  }[char]));
}

function looksLikeMarkupNoise(text) {
  const value = String(text || "").replace(/\s+/g, " ").trim();
  if (!value) return false;
  if (/<\/?[a-z][\w.-]*:/i.test(value)) return true;
  if (/\bxmlns:[\w-]+\s*=|\buri\s*=\s*["']?\{?[0-9a-f-]{8,}/i.test(value)) return true;
  if (/\b(?:a|p|r|wp|w|mc|v|o|a14|a16):(?:ext|extLst|tbl|tblPr|gridCol|tcPr|ln|solidFill|prstGeom)\b/i.test(value)) return true;
  if (/[<>][\s\S]*[<>]/.test(value) && /\b(?:xml|xmlns|schema|office|drawing|tblPr|gridCol|extLst)\b/i.test(value)) return true;
  if (value.length > 120 && /[<>="{}]/.test(value) && /\b(?:xmlns|uri|val|tblPr|gridCol|extLst|schema)\b/i.test(value)) return true;
  return false;
}

function isUsefulText(text) {
  const value = String(text || "").replace(/\s+/g, " ").trim();
  if (!value) return false;
  if (looksLikeMarkupNoise(value)) return false;
  if (/^[\d\s./\\-]+$/.test(value)) return false;
  if (/^[()[\]{}.,;:!?'"`~_\-–—]+$/.test(value)) return false;
  if (/^slide\s*\d+$/i.test(value)) return false;
  return value.length > 1;
}

function cleanText(text) {
  return String(text || "")
    .replace(/\s+/g, " ")
    .replace(/^[•·\-\s]+/, "")
    .trim();
}

function normalizeTextFragments(texts) {
  const cleaned = (Array.isArray(texts) ? texts : [])
    .map(cleanText)
    .filter(Boolean);
  const merged = [];
  for (const item of cleaned) {
    if (!merged.length) {
      merged.push(item);
      continue;
    }
    const prev = merged[merged.length - 1];
    if (/\s+[A-Za-z]$/.test(prev) && /^[a-z][A-Za-z-]*(?:\s|$)/.test(item)) {
      merged[merged.length - 1] = prev.replace(/\s+([A-Za-z])$/, "$1") + item;
      continue;
    }
    if (/^[A-Za-z]$/.test(prev) && /^[a-z]/.test(item)) {
      merged[merged.length - 1] = prev + item;
      continue;
    }
    merged.push(item);
  }
  return merged.filter(isUsefulText);
}

function titleLooksBroken(title, body = []) {
  const value = cleanText(title);
  if (!value) return true;
  if (/^[A-Za-z]$/.test(value)) return true;
  if (/^.{1,2}$/.test(value) && body.some((item) => cleanText(item).length > 8)) return true;
  if (/^[A-Za-z]{1,2}$/.test(value)) return true;
  if (looksLikeMarkupNoise(value)) return true;
  return false;
}

function slideTitleAndBody(texts) {
  const normalized = normalizeTextFragments(texts);
  if (!normalized.length) return { title: "", body: [] };
  let title = normalized[0];
  let body = normalized.slice(1);
  if (titleLooksBroken(title, body)) {
    const replacementIndex = body.findIndex((item) => !titleLooksBroken(item, []) && cleanText(item).length >= 5);
    if (replacementIndex >= 0) {
      title = body[replacementIndex];
      body = normalized.filter((_, index) => index !== replacementIndex + 1);
    } else {
      title = "";
      body = normalized;
    }
  }
  return { title, body };
}

function xmlDecode(value) {
  return String(value || "")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'");
}

function normalizeZipPath(base, target) {
  const parts = base.split("/");
  parts.pop();
  for (const item of target.split("/")) {
    if (!item || item === ".") continue;
    if (item === "..") parts.pop();
    else parts.push(item);
  }
  return parts.join("/");
}

function sortedSlidePaths(zip) {
  return Object.keys(zip.files)
    .filter((name) => /^ppt\/slides\/slide\d+\.xml$/i.test(name))
    .sort((a, b) => Number(a.match(/slide(\d+)\.xml/i)?.[1] || 0) - Number(b.match(/slide(\d+)\.xml/i)?.[1] || 0));
}

function relationshipMap(relsXml, slidePath) {
  const map = new Map();
  const relPattern = /<Relationship\b([^>]*?)\/?>/g;
  let match;
  while ((match = relPattern.exec(relsXml || ""))) {
    const attrs = match[1] || "";
    const id = attrs.match(/\bId="([^"]+)"/)?.[1];
    const target = attrs.match(/\bTarget="([^"]+)"/)?.[1];
    if (id && target) map.set(id, normalizeZipPath(slidePath, target));
  }
  return map;
}

function extractTexts(slideXml) {
  const texts = [];
  const pattern = /<a:t[^>]*>([\s\S]*?)<\/a:t>/g;
  let match;
  while ((match = pattern.exec(slideXml || ""))) {
    const text = cleanText(xmlDecode(match[1]));
    if (isUsefulText(text)) texts.push(text);
  }
  return texts;
}

async function extractImages(zip, slideXml, rels, slideIndex) {
  const stats = arguments[4] || { embeddedImages: 0, embeddedImageBytes: 0, skippedImages: 0 };
  const images = [];
  const seen = new Set();
  const pattern = /r:embed="([^"]+)"/g;
  let match;
  while ((match = pattern.exec(slideXml || ""))) {
    const relId = match[1];
    if (seen.has(relId)) continue;
    seen.add(relId);
    const path = rels.get(relId);
    const file = path ? zip.file(path) : null;
    if (!file) continue;
    const estimatedSize = Number(file._data?.uncompressedSize || file._data?.compressedSize || 0);
    if (stats.embeddedImages >= MAX_EMBEDDED_IMAGES) {
      stats.skippedImages += 1;
      continue;
    }
    if (estimatedSize && estimatedSize > MAX_EMBEDDED_IMAGE_BYTES) {
      stats.skippedImages += 1;
      continue;
    }
    if (estimatedSize && stats.embeddedImageBytes + estimatedSize > MAX_TOTAL_EMBEDDED_IMAGE_BYTES) {
      stats.skippedImages += 1;
      continue;
    }
    const bytes = await file.async("uint8array");
    if (bytes.length > MAX_EMBEDDED_IMAGE_BYTES || stats.embeddedImageBytes + bytes.length > MAX_TOTAL_EMBEDDED_IMAGE_BYTES) {
      stats.skippedImages += 1;
      continue;
    }
    const ext = path.split(".").pop()?.toLowerCase() || "png";
    const mime = ext === "jpg" || ext === "jpeg" ? "image/jpeg" : ext === "gif" ? "image/gif" : ext === "svg" ? "image/svg+xml" : "image/png";
    stats.embeddedImages += 1;
    stats.embeddedImageBytes += bytes.length;
    images.push({
      src: `data:${mime};base64,${bytesToBase64(bytes)}`,
      name: `slide-${String(slideIndex).padStart(3, "0")}-image-${images.length + 1}.${ext}`,
      mime,
      size: bytes.length,
    });
  }
  return images;
}

async function extractPptx(fileBytes) {
  const zip = await JSZip.loadAsync(fileBytes);
  const slides = [];
  const extractionStats = {
    embeddedImages: 0,
    embeddedImageBytes: 0,
    skippedImages: 0,
    skippedBlankSlides: 0,
  };
  const paths = sortedSlidePaths(zip);
  for (let index = 0; index < paths.length; index += 1) {
    const slidePath = paths[index];
    const slideXml = await zip.file(slidePath).async("string");
    const relsPath = slidePath.replace("ppt/slides/", "ppt/slides/_rels/") + ".rels";
    const relsXml = zip.file(relsPath) ? await zip.file(relsPath).async("string") : "";
    const rels = relationshipMap(relsXml, slidePath);
    const texts = normalizeTextFragments(extractTexts(slideXml));
    const images = await extractImages(zip, slideXml, rels, index + 1, extractionStats);
    const isDefaultOnlySlide = texts.length === 1 && /^slide\s*\d+$/i.test(texts[0]) && !images.length;
    if ((!texts.length && !images.length) || isDefaultOnlySlide) {
      extractionStats.skippedBlankSlides += 1;
      continue;
    }
    const { title, body } = slideTitleAndBody(texts);
    slides.push({
      page: index + 1,
      title,
      body,
      images,
    });
  }
  if (!slides.length) throw new Error("No slides found in this PPTX file.");
  slides.extractionStats = extractionStats;
  return slides;
}

function splitCards(items, max = 10) {
  const seen = new Set();
  return items
    .map(cleanText)
    .filter(isUsefulText)
    .filter((item) => {
      const key = item.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, max);
}

function textBlocks(items, max = 18) {
  const cleaned = splitCards(items, max);
  const shortCount = cleaned.filter((item) => item.length < 34).length;
  const continuationCount = cleaned.filter((item) => /^(and|or|to|of|in|for|with|on|by|as|the|their|our|your|is|are|was|were|communicate|interact|everyday|lives|working)\b/i.test(item)).length;
  const hasQuoteFlow = cleaned.some((item) => /[“"]/.test(item)) && cleaned.some((item) => /[”"]/.test(item));
  const asParagraph = cleaned.length >= 4 && (hasQuoteFlow || shortCount / cleaned.length > 0.55 || continuationCount >= 2);
  if (!asParagraph) return { items: cleaned, paragraphs: cleaned, asParagraph: false };
  const paragraphs = [];
  let current = "";
  const terminal = /[.!?。！？;；:”"]$/;
  const startsContinuation = /^(and|or|to|of|in|for|with|on|by|as|the|their|our|your|is|are|was|were|communicate|interact|everyday|lives|working|\(|,|;|:)/i;
  const hasOpenQuote = (value) => (value.match(/[“"]/g) || []).length > (value.match(/[”"]/g) || []).length;
  for (const item of cleaned) {
    if (!current) {
      current = item;
      continue;
    }
    const join = hasOpenQuote(current) || startsContinuation.test(item) || (!terminal.test(current) && current.length < 180 && item.length < 70);
    if (join) current = `${current} ${item}`;
    else {
      paragraphs.push(current);
      current = item;
    }
  }
  if (current) paragraphs.push(current);
  return { items: cleaned, paragraphs: paragraphs.slice(0, Math.max(1, max / 2)), asParagraph: true };
}

function themeFor(style) {
  const themes = {
    teaching: ["#f8fbff", "#172554", "#3b82f6", "#eef6ff", "Inter, Arial, sans-serif"],
    softlesson: ["#fffaf3", "#23395d", "#82b7d8", "#fff8ec", "Nunito, Inter, Arial, sans-serif"],
    clean: ["#ffffff", "#111827", "#2563eb", "#f8fafc", "Arial, sans-serif"],
    academic: ["#fdfcf8", "#1f2937", "#64748b", "#f4f1ea", "Georgia, 'Times New Roman', serif"],
    instructional: ["#fffdf7", "#1e3a5f", "#0ea5e9", "#edf8ff", "Verdana, Arial, sans-serif"],
    minimal: ["#ffffff", "#111827", "#111827", "#f6f7f9", "Inter, Arial, sans-serif"],
    healing: ["#fff8ec", "#45352e", "#8abed8", "#f7e7c8", "'Segoe Print', 'Comic Sans MS', cursive"],
    doodle: ["#fff6df", "#3c2c2c", "#8ecae6", "#ffe4a8", "'Segoe Print', 'Comic Sans MS', 'Bradley Hand', cursive"],
    swiss: ["#ffffff", "#14213d", "#2563eb", "#eef2ff", "'Arial Narrow', Arial, sans-serif"],
    editorial: ["#fffdf8", "#182033", "#b45309", "#f7efe0", "Georgia, 'Times New Roman', serif"],
    vivid: ["#fff7ed", "#172554", "#f97316", "#e0f2fe"],
    contrast: ["#0f172a", "#ffffff", "#38bdf8", "#1e293b"],
  };
  const [bg, ink, accent, panel, font] = themes[style] || themes.teaching;
  return { bg, ink, accent, panel, font: font || "Inter, Arial, sans-serif" };
}

function slideLayout(slide, index) {
  const blocks = textBlocks(slide.body, 12);
  const items = blocks.paragraphs;
  const title = String(slide.title || "").toLowerCase();
  const hasImages = slide.images.length > 0;
  if (index === 0) return "cover";
  if (/\b(outline|agenda|contents?|today|schedule|syllabus|overview)\b/i.test(title)) return "agenda";
  if (/\b(exercise|quiz|question|practice|activity|discussion|answer|solution|case)\b/i.test(title)) return "workshop";
  if (hasImages && items.length <= 1) return "image-focus";
  if (hasImages) return "image-split";
  if (items.length <= 2) return "statement";
  return "lesson";
}

function renderSlide(slide, index, total, style) {
  const theme = themeFor(style);
  const hasImages = slide.images.length > 0;
  const blocks = textBlocks(slide.body, 18);
  const items = blocks.paragraphs;
  const layout = slideLayout(slide, index);
  const density = items.length >= 10 ? "density-many" : items.length >= 6 ? "density-medium" : "density-light";
  const lead = items[0] || "";
  const agendaHtml = items.slice(0, 12).map((item, itemIndex) => `
    <div class="agenda-item editable-text">
      <span>${String(itemIndex + 1).padStart(2, "0")}</span>
      <p>${escapeHtml(item)}</p>
    </div>`).join("");
  const bulletsHtml = items.slice(lead ? 1 : 0, lead ? 12 : 14).map((item) => `<li class="editable-text">${escapeHtml(item)}</li>`).join("");
  const paragraphHtml = items.map((item) => `<p class="body-paragraph editable-text">${escapeHtml(item)}</p>`).join("");
  const conceptHtml = items.slice(0, 3).map((item) => `<div class="point-card editable-text">${escapeHtml(item)}</div>`).join("");
  const contentHtml = {
    cover: items.length ? `<p class="cover-subtitle editable-text">${escapeHtml(items.slice(0, 2).join(" · "))}</p>` : "",
    agenda: `<div class="agenda-list">${agendaHtml}</div>`,
    workshop: `
      <div class="workshop-prompt">
        ${lead ? `<p class="lead-text editable-text">${escapeHtml(lead)}</p>` : ""}
        ${bulletsHtml ? `<ul class="quiet-list">${bulletsHtml}</ul>` : ""}
        <div class="thinking-space editable-text">Class discussion space</div>
      </div>`,
    statement: `
      <div class="statement-block">
        ${blocks.asParagraph ? paragraphHtml : `${lead ? `<p class="lead-text editable-text">${escapeHtml(lead)}</p>` : ""}${bulletsHtml ? `<ul class="quiet-list">${bulletsHtml}</ul>` : ""}`}
      </div>`,
    lesson: `
      <div class="lesson-block">
        ${blocks.asParagraph ? paragraphHtml : `${lead ? `<p class="lead-text editable-text">${escapeHtml(lead)}</p>` : ""}${items.length > 4 ? `<ul class="quiet-list ${items.length > 8 ? "multi-column" : ""}">${items.slice(1, 14).map((item) => `<li class="editable-text">${escapeHtml(item)}</li>`).join("")}</ul>` : `<div class="concept-row">${conceptHtml}</div>`}`}
      </div>`,
    "image-split": `
      <div class="lesson-block">
        ${blocks.asParagraph ? paragraphHtml : `${lead ? `<p class="lead-text editable-text">${escapeHtml(lead)}</p>` : ""}${bulletsHtml ? `<ul class="quiet-list">${bulletsHtml}</ul>` : ""}`}
      </div>`,
    "image-focus": `
      <div class="lesson-block">
        ${lead ? `<p class="lead-text editable-text">${escapeHtml(lead)}</p>` : ""}
      </div>`,
  }[layout] || "";
  const imageHtml = slide.images.map((image, imageIndex) => `<figure class="media-box original-ppt-image"><img src="${image.src}" alt="Original PPT slide ${slide.page} image ${imageIndex + 1}" /></figure>`).join("");
  return `
    <section class="slide ${layout} ${hasImages ? "has-media" : "text-only"} ${density}" id="slide-${index + 1}" data-slide-page="${slide.page}" style="--bg:${theme.bg};--ink:${theme.ink};--accent:${theme.accent};--panel:${theme.panel};--font:${theme.font}">
      <div class="slide-inner">
        <header>
          ${slide.title ? `<h1 class="editable-text">${escapeHtml(slide.title)}</h1>` : ""}
        </header>
        <main>
          ${contentHtml}
          ${hasImages ? `<div class="media-grid">${imageHtml}</div>` : ""}
        </main>
        <footer>${index + 1} / ${total}</footer>
      </div>
    </section>`;
}

function editorRuntime() {
  return `
    <style id="ppt-html-editor-style">
      html, body { width: 100% !important; min-height: 100% !important; margin: 0 !important; }
      body:not(.scroll-mode) { overflow: hidden !important; display: grid !important; place-items: center !important; background: #eef3fb; }
      body:not(.scroll-mode) :where(section.slide, section[data-slide-page], .slide, .ai-slide, [data-slide-page]) { width: min(100vw, calc(100vh * 16 / 9)) !important; height: min(100vh, calc(100vw * 9 / 16)) !important; max-width: 100vw !important; max-height: 100vh !important; aspect-ratio: 16 / 9 !important; margin: auto !important; box-sizing: border-box !important; overflow: hidden !important; position: relative !important; }
      body.scroll-mode :where(section.slide, section[data-slide-page], .slide, .ai-slide, [data-slide-page]) { width: min(100vw, 1440px) !important; aspect-ratio: 16 / 9 !important; min-height: auto !important; height: auto !important; margin: 22px auto !important; overflow: hidden !important; }
      body:not(.scroll-mode) section:first-of-type, body:not(.scroll-mode) section[data-slide-page]:first-of-type, body:not(.scroll-mode) .slide:first-of-type, body:not(.scroll-mode) .ai-slide:first-of-type { overflow: hidden !important; }
      body:not(.scroll-mode) :where(.slide-inner, .slide-content, .content, .inner, .deck-slide-inner) { max-width: 100% !important; max-height: 100% !important; box-sizing: border-box !important; overflow: hidden !important; }
      section :where(h1,h2,h3,h4,p,li,.editable-text,.lead-text,.body-paragraph,.point-card,.cover-subtitle,.agenda-item), section[data-slide-page] :where(h1,h2,h3,h4,p,li,.editable-text,.lead-text,.body-paragraph,.point-card,.cover-subtitle,.agenda-item), .slide :where(h1,h2,h3,h4,p,li,.editable-text,.lead-text,.body-paragraph,.point-card,.cover-subtitle,.agenda-item), .ai-slide :where(h1,h2,h3,h4,p,li,.editable-text,.lead-text,.body-paragraph,.point-card,.cover-subtitle,.agenda-item) { writing-mode: horizontal-tb !important; text-orientation: mixed !important; white-space: normal !important; word-break: normal !important; overflow-wrap: normal !important; hyphens: none !important; letter-spacing: normal; }
      section :where(p,li,.editable-text,.lead-text,.body-paragraph,.point-card,.cover-subtitle,.agenda-item p), section[data-slide-page] :where(p,li,.editable-text,.lead-text,.body-paragraph,.point-card,.cover-subtitle,.agenda-item p), .slide :where(p,li,.editable-text,.lead-text,.body-paragraph,.point-card,.cover-subtitle,.agenda-item p), .ai-slide :where(p,li,.editable-text,.lead-text,.body-paragraph,.point-card,.cover-subtitle,.agenda-item p) { min-width: min(320px, 82vw) !important; max-width: min(1040px, 88vw) !important; }
      section :where(h1,h2,h3,h4), section[data-slide-page] :where(h1,h2,h3,h4), .slide :where(h1,h2,h3,h4), .ai-slide :where(h1,h2,h3,h4) { min-width: min(520px, 86vw) !important; max-width: min(1120px, 90vw) !important; }
      body:not(.scroll-mode) .ppt-cover-slide.ppt-active-slide { display: flex !important; flex-direction: column !important; justify-content: center !important; align-items: center !important; text-align: center !important; }
      body:not(.scroll-mode) .ppt-cover-slide > :where(.slide-inner, .slide-content, .content, .inner, .deck-slide-inner, main, div:first-child) { height: 100% !important; min-height: 0 !important; display: flex !important; flex-direction: column !important; justify-content: center !important; align-items: center !important; text-align: center !important; padding-top: clamp(44px, 7%, 92px) !important; padding-bottom: clamp(44px, 7%, 92px) !important; }
      body:not(.scroll-mode) .ppt-cover-slide h1 { text-align: center !important; margin: 0 auto !important; max-width: min(1120px, 88%) !important; transform: none !important; }
      body:not(.scroll-mode) .image-split main, body:not(.scroll-mode) .has-media main { grid-template-columns: minmax(0, .9fr) minmax(280px, .74fr) !important; }
      body:not(.scroll-mode) .image-focus main { grid-template-columns: minmax(0, .78fr) minmax(320px, .82fr) !important; }
      body:not(.scroll-mode) :where(.concept-row, .card-grid, .stats-grid) { grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)) !important; }
      body:not(.scroll-mode) :where(.agenda-list, .quiet-list.multi-column) { grid-template-columns: repeat(2, minmax(0, 1fr)) !important; }
      body:not(.scroll-mode) .cover .slide-inner { display: flex !important; flex-direction: column !important; justify-content: center !important; align-items: center !important; gap: clamp(16px, 3vh, 34px) !important; padding-top: clamp(56px, 8vh, 92px) !important; padding-bottom: clamp(56px, 8vh, 92px) !important; }
      body:not(.scroll-mode) .cover main { display: block !important; min-height: auto !important; }
      body:not(.scroll-mode) .cover footer { position: absolute !important; right: clamp(34px, 5vw, 80px) !important; bottom: 28px !important; }
      body:not(.scroll-mode) section:first-of-type > header, body:not(.scroll-mode) section[data-slide-page]:first-of-type > header, body:not(.scroll-mode) .slide:first-of-type > header, body:not(.scroll-mode) .ai-slide:first-of-type > header { text-align: center !important; max-width: min(1120px, 90vw) !important; margin: clamp(18vh, 24vh, 28vh) auto clamp(2vh, 5vh, 7vh) !important; }
      body:not(.scroll-mode) .cover > .slide-inner > header { margin: 0 auto !important; }
      body:not(.scroll-mode) section:first-of-type h1, body:not(.scroll-mode) section[data-slide-page]:first-of-type h1, body:not(.scroll-mode) .slide:first-of-type h1, body:not(.scroll-mode) .ai-slide:first-of-type h1 { text-align: center !important; margin-left: auto !important; margin-right: auto !important; max-width: min(1120px, 90vw) !important; line-height: 1.06 !important; }
      .ppt-original-images, .original-ppt-image { box-sizing: border-box !important; }
      .ppt-original-images { position: relative !important; z-index: 2 !important; display: grid !important; gap: clamp(10px, 1.4vw, 18px) !important; align-content: center !important; justify-items: center !important; width: min(42vw, 620px) !important; max-width: 100% !important; max-height: 46vh !important; margin: clamp(14px, 2vh, 24px) auto 0 !important; overflow: hidden !important; clear: both !important; }
      .ppt-original-images[data-count="2"], .ppt-original-images[data-count="3"], .ppt-original-images[data-count="4"] { grid-template-columns: repeat(2, minmax(0, 1fr)) !important; width: min(52vw, 780px) !important; max-height: 44vh !important; }
      .ppt-original-images figure, figure.original-ppt-image { margin: 0 !important; width: 100% !important; min-width: 0 !important; display: grid !important; place-items: center !important; overflow: hidden !important; }
      .ppt-original-images img, .original-ppt-image img, img[alt^="Original PPT slide"] { display: block !important; width: 100% !important; height: auto !important; max-width: 100% !important; max-height: 44vh !important; object-fit: contain !important; border-radius: 8px !important; }
      :where(section[data-slide-page], .slide, .ai-slide, [data-slide-page]) img { max-width: 100% !important; max-height: 46vh !important; object-fit: contain !important; }
      .editor-toolbar { position: fixed; z-index: 9999; left: 50%; top: 12px; transform: translateX(-50%); display: none; align-items: center; justify-content: center; gap: 8px; width: min(980px, calc(100vw - 32px)); min-height: 50px; padding: 8px 12px; border: 1px solid rgba(134,153,116,.2); border-radius: 18px; background: rgba(245,241,232,.94); box-shadow: 0 14px 36px rgba(93,107,77,.14); font-family: Arial, sans-serif; backdrop-filter: blur(14px); }
      body.editing .editor-toolbar { display: flex; }
      .editor-toolbar:before { content: "Edit"; display: inline-grid; place-items: center; height: 34px; padding: 0 14px; border-radius: 999px; background: #5d6b4d; color: #fff; font: 800 13px/1 Arial, sans-serif; }
      .editor-toolbar button, .editor-toolbar select, .editor-toolbar input[type="number"] { height: 34px; border: 1px solid rgba(134,153,116,.26); border-radius: 12px; background: rgba(255,253,248,.92); color: #314025; font: 800 12px/1 Arial, sans-serif; padding: 0 10px; }
      .editor-toolbar input[type="color"] { width: 32px; height: 30px; padding: 0; border: 1px solid #c7d2fe; border-radius: 8px; background: #fff; }
      body.editing .editable-text, body.editing [contenteditable="true"] { outline: 2px dashed #60a5fa; outline-offset: 3px; cursor: text; }
      body.editing [data-ppt-id] { position: relative; }
      body.editing .ppt-selected-element { outline: 2px solid #5d6b4d !important; outline-offset: 5px !important; box-shadow: 0 0 0 5px rgba(212,228,193,.46) !important; }
      body.editing .media-box, body.editing .editable-image-box { outline: 2px dashed #f59e0b; outline-offset: 4px; overflow: visible; min-width: 80px; min-height: 60px; cursor: default; touch-action: none; }
      body.editing .media-box.selected-image, body.editing .editable-image-box.selected-image { outline-color: #2563eb; z-index: 50; }
      body.editing .media-box img, body.editing .editable-image-box img { width: 100%; height: 100%; object-fit: contain; pointer-events: auto; display: block; user-select: none; -webkit-user-drag: none; }
      .image-drag-handle, .image-resize-handle { display: none; position: absolute; z-index: 60; box-sizing: border-box; }
      body.editing .selected-image > .image-drag-handle, body.editing .selected-image > .image-resize-handle { display: block; }
      .image-drag-handle { left: 18%; right: 18%; top: 18%; bottom: 18%; border: 1px dashed rgba(37,99,235,.55); border-radius: 14px; background: rgba(37,99,235,.07); cursor: move; }
      .image-drag-handle::after { content: "Move"; position: absolute; left: 50%; top: 50%; transform: translate(-50%,-50%); padding: 5px 10px; border-radius: 999px; background: rgba(37,99,235,.88); color: #fff; font: 800 12px/1 Arial, sans-serif; opacity: .9; }
      .image-resize-handle { width: 18px; height: 18px; border: 2px solid #fff; border-radius: 6px; background: #f59e0b; box-shadow: 0 0 0 1px rgba(15,23,42,.28), 0 6px 16px rgba(15,23,42,.16); }
      .image-resize-handle.nw { left: -10px; top: -10px; cursor: nwse-resize; }
      .image-resize-handle.ne { right: -10px; top: -10px; cursor: nesw-resize; }
      .image-resize-handle.sw { left: -10px; bottom: -10px; cursor: nesw-resize; }
      .image-resize-handle.se { right: -10px; bottom: -10px; cursor: nwse-resize; }
      .ppt-runtime-nav { position: fixed; z-index: 9990; left: 50%; bottom: 16px; transform: translateX(-50%); display: flex; gap: 8px; align-items: center; pointer-events: auto; }
      .ppt-runtime-nav button, button[onclick*="nextSlide"], button[onclick*="prevSlide"] { min-width: 46px !important; height: 32px !important; padding: 0 12px !important; border-radius: 8px !important; border: 1px solid rgba(37,99,235,.22) !important; background: rgba(255,255,255,.9) !important; color: #1e3a8a !important; font: 800 14px/1 Arial, sans-serif !important; box-shadow: 0 8px 22px rgba(15,23,42,.12) !important; }
      .ppt-runtime-nav button:last-child { background: #2563eb !important; color: #fff !important; }
      body.scroll-mode .ppt-runtime-nav { display: none; }
      .free-textbox { position: absolute; left: 12%; top: 30%; min-width: 180px; min-height: 54px; padding: 12px 16px; border: 2px dashed #60a5fa; border-radius: 12px; background: rgba(255,255,255,.92); color: #172554; font: 700 30px/1.2 Arial, sans-serif; z-index: 12; resize: both; overflow: auto; }
      .ppt-ve-sidebar, .ppt-ve-inspector, .ppt-ve-ruler-top, .ppt-ve-ruler-left { display: none; }
      body.editing .ppt-ve-sidebar { position: fixed; z-index: 9998; left: 12px; top: 78px; bottom: 16px; width: 154px; display: flex; flex-direction: column; gap: 10px; padding: 12px; border-radius: 22px; background: rgba(245,241,232,.92); box-shadow: 0 16px 40px rgba(93,107,77,.14); overflow: auto; }
      .ppt-ve-thumb { display: grid; gap: 6px; border: 1px solid rgba(134,153,116,.24); border-radius: 14px; padding: 8px; background: rgba(255,253,248,.9); color: #5d6b4d; text-align: left; cursor: pointer; }
      .ppt-ve-thumb.active { background: #d4e4c1; color: #314025; box-shadow: inset 0 0 0 2px rgba(93,107,77,.2); }
      .ppt-ve-thumb strong { font: 900 12px/1 Arial, sans-serif; }
      .ppt-ve-thumb span { overflow: hidden; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; font: 700 11px/1.25 Arial, sans-serif; opacity: .82; }
      body.editing .ppt-ve-inspector { position: fixed; z-index: 9998; right: 12px; top: 78px; display: grid; gap: 10px; width: 242px; padding: 14px; border-radius: 22px; background: rgba(245,241,232,.94); box-shadow: 0 16px 40px rgba(93,107,77,.14); color: #314025; font-family: Arial, sans-serif; }
      .ppt-ve-inspector h3 { margin: 0; font: 900 15px/1.2 Arial, sans-serif; }
      .ppt-ve-inspector small { color: #718062; font-weight: 700; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
      .ppt-ve-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
      .ppt-ve-inspector label { display: grid; gap: 4px; color: #718062; font: 800 11px/1 Arial, sans-serif; }
      .ppt-ve-inspector input, .ppt-ve-inspector select { width: 100%; height: 30px; border: 1px solid rgba(134,153,116,.26); border-radius: 9px; background: rgba(255,253,248,.92); color: #314025; padding: 0 8px; font: 800 12px/1 Arial, sans-serif; }
      .ppt-ve-layer-row { display: grid; grid-template-columns: repeat(4,1fr); gap: 7px; }
      .ppt-ve-layer-row button { min-height: 30px; border: 1px solid rgba(134,153,116,.26); border-radius: 9px; background: #fffdf8; color: #314025; font: 900 11px/1 Arial, sans-serif; }
      body.editing .ppt-ve-ruler-top { position: fixed; z-index: 9997; left: 184px; right: 270px; top: 78px; height: 26px; display: block; border-radius: 8px; background: repeating-linear-gradient(90deg, rgba(134,153,116,.35) 0 1px, transparent 1px 20px), rgba(255,253,248,.82); box-shadow: inset 0 0 0 1px rgba(134,153,116,.18); }
      body.editing .ppt-ve-ruler-left { position: fixed; z-index: 9997; left: 184px; top: 110px; bottom: 20px; width: 26px; display: block; border-radius: 8px; background: repeating-linear-gradient(180deg, rgba(134,153,116,.35) 0 1px, transparent 1px 20px), rgba(255,253,248,.82); box-shadow: inset 0 0 0 1px rgba(134,153,116,.18); }
      @media (max-width: 920px) { body.editing .ppt-ve-sidebar, body.editing .ppt-ve-inspector, body.editing .ppt-ve-ruler-top, body.editing .ppt-ve-ruler-left { display: none; } .editor-toolbar { top: 8px; width: calc(100vw - 16px); flex-wrap: wrap; } }
    </style>
    <script>(() => {
      let currentSlide = 0;
      const slideSelector = 'section.slide, section[data-slide-page], .slide, .ai-slide, [data-slide-page]';
      let slides = [];
      let selectedElement = null;
      let historyStack = [];
      let redoStack = [];
      let pptIdCounter = 1;
      let historyLock = false;
      const editableSelector = 'h1,h2,h3,h4,p,li,td,th,.editable-text,.point-card,.lead-text,.body-paragraph,.agenda-item,.free-textbox,.media-box,.editable-image-box,figure,img';
      function assignStableIds(root = document) {
        const own = root.matches?.(editableSelector) ? [root] : [];
        [...own, ...root.querySelectorAll(editableSelector)].forEach((node) => {
          if (node.closest('.editor-toolbar,.ppt-ve-sidebar,.ppt-ve-inspector,.ppt-runtime-nav')) return;
          if (!node.dataset.pptId) {
            const kind = node.matches('img,.media-box,.editable-image-box,figure') ? 'image' : 'text';
            node.dataset.pptId = kind + '-' + String(pptIdCounter++).padStart(3, '0');
            node.dataset.kind = kind;
          }
        });
      }
      function slideSnapshot() {
        return slides.map((slide) => slide.outerHTML);
      }
      function restoreSnapshot(snapshot) {
        if (!Array.isArray(snapshot) || historyLock) return;
        historyLock = true;
        slides.forEach((slide, index) => {
          if (snapshot[index]) slide.outerHTML = snapshot[index];
        });
        historyLock = false;
        selectedElement = null;
        refreshSlides();
        ensureEditorChrome();
        showSlide(currentSlide);
        if (document.body.classList.contains('editing')) prepareImages();
      }
      function pushHistory() {
        if (historyLock) return;
        historyStack.push(slideSnapshot());
        if (historyStack.length > 60) historyStack.shift();
        redoStack = [];
      }
      function undo() {
        if (!historyStack.length) return;
        redoStack.push(slideSnapshot());
        restoreSnapshot(historyStack.pop());
      }
      function redo() {
        if (!redoStack.length) return;
        historyStack.push(slideSnapshot());
        restoreSnapshot(redoStack.pop());
      }
      function refreshSlides() {
        const candidates = Array.from(document.querySelectorAll(slideSelector)).filter((node) => !node.closest('.editor-toolbar,.ppt-runtime-nav'));
        slides = candidates.filter((node) => !candidates.some((candidate) => candidate !== node && candidate.contains(node)));
        slides.forEach((slide, index) => {
          slide.classList.add('ppt-runtime-slide');
          if (!slide.classList.contains('slide')) slide.classList.add('slide');
          if (!slide.dataset.slidePage) slide.dataset.slidePage = String(index + 1);
          if (!slide.style.position) slide.style.position = 'relative';
          assignStableIds(slide);
        });
        currentSlide = Math.max(0, Math.min(currentSlide, Math.max(0, slides.length - 1)));
      }
      refreshSlides();
      function showSlide(index) {
        if (!slides.length) return;
        currentSlide = Math.max(0, Math.min(index, slides.length - 1));
        slides.forEach((slide, i) => {
          const active = i === currentSlide;
          slide.classList.toggle('active', active);
          slide.classList.toggle('ppt-active-slide', active);
          if (!document.body.classList.contains('scroll-mode')) {
            slide.style.display = active ? (slide.dataset.originalDisplay || 'block') : 'none';
          }
        });
        renderThumbnails();
        updateInspector();
      }
      function nextSlide() { showSlide(currentSlide + 1); }
      function prevSlide() { showSlide(currentSlide - 1); }
      function ensureRuntimeNav() {
        if (document.querySelector('.ppt-runtime-nav')) return;
        const nav = document.createElement('div');
        nav.className = 'ppt-runtime-nav';
        nav.innerHTML = '<button type="button" data-prev>Prev</button><button type="button" data-next>Next</button>';
        nav.querySelector('[data-prev]').addEventListener('click', (event) => { event.preventDefault(); prevSlide(); });
        nav.querySelector('[data-next]').addEventListener('click', (event) => { event.preventDefault(); nextSlide(); });
        document.body.appendChild(nav);
      }
      function ensureToolbar() {
        if (document.querySelector('.editor-toolbar')) return;
        const toolbar = document.createElement('div');
        toolbar.className = 'editor-toolbar';
        toolbar.innerHTML = '<button data-undo title="Undo">Undo</button><button data-redo title="Redo">Redo</button><select data-font><option value="Arial, sans-serif">Arial</option><option value="Inter, Arial, sans-serif">Inter</option><option value="Georgia, serif">Georgia</option><option value="Times New Roman, serif">Times</option><option value="Verdana, sans-serif">Verdana</option><option value="Microsoft YaHei, sans-serif">Microsoft YaHei</option><option value="Segoe Print, Comic Sans MS, cursive">Hand</option></select><input data-size type="number" min="8" max="160" value="30" title="Font size"><input data-color type="color" value="#172554" title="Color"><button data-left>Left</button><button data-center>Center</button><button data-right>Right</button><button data-bold>B</button><button data-italic>I</button><button data-underline>U</button><button data-add-text>Text</button><button data-add-image>Image</button><button data-front>Front</button><button data-back>Back</button><button data-delete>Delete</button><input data-image-file type="file" accept="image/*" style="display:none">';
        document.body.appendChild(toolbar);
        toolbar.querySelector('[data-undo]').addEventListener('click', undo);
        toolbar.querySelector('[data-redo]').addEventListener('click', redo);
        toolbar.querySelector('[data-font]').addEventListener('change', (e) => { pushHistory(); applyStyle('fontFamily', e.target.value); });
        toolbar.querySelector('[data-size]').addEventListener('change', (e) => { pushHistory(); applyStyle('fontSize', e.target.value + 'px'); });
        toolbar.querySelector('[data-color]').addEventListener('input', (e) => applyStyle('color', e.target.value));
        toolbar.querySelector('[data-left]').addEventListener('click', () => { pushHistory(); applyStyle('textAlign', 'left'); });
        toolbar.querySelector('[data-center]').addEventListener('click', () => { pushHistory(); applyStyle('textAlign', 'center'); });
        toolbar.querySelector('[data-right]').addEventListener('click', () => { pushHistory(); applyStyle('textAlign', 'right'); });
        toolbar.querySelector('[data-bold]').addEventListener('click', () => { pushHistory(); document.execCommand('bold'); });
        toolbar.querySelector('[data-italic]').addEventListener('click', () => { pushHistory(); document.execCommand('italic'); });
        toolbar.querySelector('[data-underline]').addEventListener('click', () => { pushHistory(); document.execCommand('underline'); });
        toolbar.querySelector('[data-add-text]').addEventListener('click', addTextBox);
        toolbar.querySelector('[data-add-image]').addEventListener('click', () => toolbar.querySelector('[data-image-file]').click());
        toolbar.querySelector('[data-image-file]').addEventListener('change', addImageFromInput);
        toolbar.querySelector('[data-front]').addEventListener('click', () => layerSelected(1));
        toolbar.querySelector('[data-back]').addEventListener('click', () => layerSelected(-1));
        toolbar.querySelector('[data-delete]').addEventListener('click', deleteSelected);
      }
      function ensureEditorChrome() {
        ensureToolbar();
        if (!document.querySelector('.ppt-ve-sidebar')) {
          const sidebar = document.createElement('div');
          sidebar.className = 'ppt-ve-sidebar';
          document.body.appendChild(sidebar);
        }
        if (!document.querySelector('.ppt-ve-inspector')) {
          const inspector = document.createElement('div');
          inspector.className = 'ppt-ve-inspector';
          inspector.innerHTML = '<h3>Element Inspector</h3><small data-ve-id>No element selected</small><div class="ppt-ve-grid"><label>X<input data-ve-x type="number"></label><label>Y<input data-ve-y type="number"></label><label>W<input data-ve-w type="number"></label><label>H<input data-ve-h type="number"></label><label>Size<input data-ve-size type="number" min="8" max="160"></label><label>Z<input data-ve-z type="number"></label></div><label>Font<select data-ve-font><option value="Arial, sans-serif">Arial</option><option value="Inter, Arial, sans-serif">Inter</option><option value="Georgia, serif">Georgia</option><option value="Times New Roman, serif">Times</option><option value="Verdana, sans-serif">Verdana</option><option value="Microsoft YaHei, sans-serif">Microsoft YaHei</option><option value="Segoe Print, Comic Sans MS, cursive">Hand</option></select></label><div class="ppt-ve-grid"><label>Text<input data-ve-color type="color"></label><label>Fill<input data-ve-bg type="color"></label></div><div class="ppt-ve-layer-row"><button data-ve-front>Up</button><button data-ve-back>Down</button><button data-ve-dup>Copy</button><button data-ve-del>Del</button></div>';
          document.body.appendChild(inspector);
          inspector.querySelector('[data-ve-x]').addEventListener('change', (e) => applyGeometry('left', e.target.value + 'px'));
          inspector.querySelector('[data-ve-y]').addEventListener('change', (e) => applyGeometry('top', e.target.value + 'px'));
          inspector.querySelector('[data-ve-w]').addEventListener('change', (e) => applyGeometry('width', e.target.value + 'px'));
          inspector.querySelector('[data-ve-h]').addEventListener('change', (e) => applyGeometry('height', e.target.value + 'px'));
          inspector.querySelector('[data-ve-z]').addEventListener('change', (e) => applyGeometry('zIndex', e.target.value));
          inspector.querySelector('[data-ve-size]').addEventListener('change', (e) => { pushHistory(); applyStyle('fontSize', e.target.value + 'px'); });
          inspector.querySelector('[data-ve-font]').addEventListener('change', (e) => { pushHistory(); applyStyle('fontFamily', e.target.value); });
          inspector.querySelector('[data-ve-color]').addEventListener('input', (e) => applyStyle('color', e.target.value));
          inspector.querySelector('[data-ve-bg]').addEventListener('input', (e) => applyStyle('backgroundColor', e.target.value));
          inspector.querySelector('[data-ve-front]').addEventListener('click', () => layerSelected(1));
          inspector.querySelector('[data-ve-back]').addEventListener('click', () => layerSelected(-1));
          inspector.querySelector('[data-ve-dup]').addEventListener('click', duplicateSelected);
          inspector.querySelector('[data-ve-del]').addEventListener('click', deleteSelected);
        }
        if (!document.querySelector('.ppt-ve-ruler-top')) {
          const top = document.createElement('div');
          top.className = 'ppt-ve-ruler-top';
          const left = document.createElement('div');
          left.className = 'ppt-ve-ruler-left';
          document.body.appendChild(top);
          document.body.appendChild(left);
        }
        renderThumbnails();
        updateInspector();
      }
      function renderThumbnails() {
        const sidebar = document.querySelector('.ppt-ve-sidebar');
        if (!sidebar) return;
        sidebar.innerHTML = slides.map((slide, index) => '<button type="button" class="ppt-ve-thumb ' + (index === currentSlide ? 'active' : '') + '" data-thumb="' + index + '"><strong>P' + (index + 1) + '</strong><span>' + htmlEscape((slide.innerText || 'Slide').replace(/\\s+/g, ' ').slice(0, 58)) + '</span></button>').join('');
        sidebar.querySelectorAll('[data-thumb]').forEach((button) => button.addEventListener('click', () => showSlide(Number(button.dataset.thumb || 0))));
      }
      function activeSlide() { return slides[currentSlide] || document.querySelector('.slide.active') || document.body; }
      function selectElement(el) {
        selectedElement = el && (el.closest('.media-box,.editable-image-box,.free-textbox,.editable-text,.point-card,h1,h2,h3,h4,p,li,td,th,[contenteditable="true"]') || el);
        document.querySelectorAll('.selected-image').forEach((node) => node.classList.remove('selected-image'));
        document.querySelectorAll('.ppt-selected-element').forEach((node) => node.classList.remove('ppt-selected-element'));
        if (selectedElement?.matches?.('.media-box,.editable-image-box')) selectedElement.classList.add('selected-image');
        if (selectedElement && !selectedElement.closest('.editor-toolbar,.ppt-ve-inspector,.ppt-ve-sidebar')) selectedElement.classList.add('ppt-selected-element');
        if (selectedElement) {
          if (!selectedElement.dataset.pptId) ensureStablePptIds();
          const style = getComputedStyle(selectedElement);
          document.querySelector('[data-size]')?.setAttribute('value', String(Math.round(parseFloat(style.fontSize) || 30)));
        }
        updateInspector();
        window.dispatchEvent(new CustomEvent('ppt-element-selected', {
          detail: { id: selectedElement?.dataset?.pptId || '', kind: selectedElement?.dataset?.kind || '' }
        }));
      }
      function toHexColor(value, fallback = '#ffffff') {
        const ctx = document.createElement('canvas').getContext('2d');
        if (!ctx) return fallback;
        ctx.fillStyle = fallback;
        ctx.fillStyle = value || fallback;
        return ctx.fillStyle.startsWith('#') ? ctx.fillStyle : fallback;
      }
      function numberValue(value, fallback = 0) {
        const number = parseFloat(String(value || '').replace('px', ''));
        return Number.isFinite(number) ? number : fallback;
      }
      function clampValue(value, min, max) {
        return Math.max(min, Math.min(max, value));
      }
      function activeSlideRect() {
        const rect = activeSlide().getBoundingClientRect();
        return { left: rect.left, top: rect.top, width: rect.width || 1280, height: rect.height || 720 };
      }
      function elementGeometry(el) {
        const slideRect = activeSlideRect();
        const rect = el.getBoundingClientRect();
        const style = getComputedStyle(el);
        return {
          left: numberValue(el.style.left, rect.left - slideRect.left),
          top: numberValue(el.style.top, rect.top - slideRect.top),
          width: numberValue(el.style.width, rect.width),
          height: numberValue(el.style.height, rect.height),
          zIndex: style.zIndex === 'auto' ? '' : style.zIndex,
        };
      }
      function clampGeometry(geometry) {
        const slide = activeSlideRect();
        const width = clampValue(numberValue(geometry.width, 120), 24, slide.width);
        const height = clampValue(numberValue(geometry.height, 40), 20, slide.height);
        return {
          left: clampValue(numberValue(geometry.left, 0), 0, Math.max(0, slide.width - width)),
          top: clampValue(numberValue(geometry.top, 0), 0, Math.max(0, slide.height - height)),
          width,
          height,
          zIndex: geometry.zIndex,
        };
      }
      function applyElementGeometry(el, geometry) {
        if (!el) return;
        if (getComputedStyle(el).position === 'static') el.style.position = 'absolute';
        const next = clampGeometry({ ...elementGeometry(el), ...geometry });
        el.style.left = Math.round(next.left) + 'px';
        el.style.top = Math.round(next.top) + 'px';
        el.style.width = Math.round(next.width) + 'px';
        el.style.height = Math.round(next.height) + 'px';
        if (next.zIndex !== undefined && next.zIndex !== '') el.style.zIndex = String(next.zIndex);
      }
      function updateElementGeometry(id, geometry = {}) {
        const target = id ? document.querySelector('[data-ppt-id="' + CSS.escape(String(id)) + '"]') : selectedElement;
        if (!target) return;
        applyElementGeometry(target, geometry);
        updateInspector();
      }
      function updateElementStyle(id, stylePatch = {}) {
        const target = id ? document.querySelector('[data-ppt-id="' + CSS.escape(String(id)) + '"]') : selectedElement;
        if (!target) return;
        Object.assign(target.style, stylePatch);
        updateInspector();
      }
      function syncInspectorFromElement() {
        updateInspector();
      }
      function updateInspector() {
        const inspector = document.querySelector('.ppt-ve-inspector');
        if (!inspector) return;
        const target = selectedElement && !selectedElement.closest('.editor-toolbar,.ppt-ve-inspector,.ppt-ve-sidebar') ? selectedElement : null;
        inspector.querySelector('[data-ve-id]').textContent = target ? (target.dataset.pptId || target.tagName.toLowerCase()) : 'No element selected';
        inspector.querySelectorAll('input,select,button').forEach((node) => node.disabled = !target);
        if (!target) return;
        const geometry = elementGeometry(target);
        const style = getComputedStyle(target);
        inspector.querySelector('[data-ve-x]').value = String(Math.round(geometry.left));
        inspector.querySelector('[data-ve-y]').value = String(Math.round(geometry.top));
        inspector.querySelector('[data-ve-w]').value = String(Math.round(geometry.width));
        inspector.querySelector('[data-ve-h]').value = String(Math.round(geometry.height));
        inspector.querySelector('[data-ve-size]').value = String(Math.round(parseFloat(style.fontSize) || 30));
        inspector.querySelector('[data-ve-z]').value = style.zIndex === 'auto' ? '' : style.zIndex;
        inspector.querySelector('[data-ve-color]').value = toHexColor(style.color, '#172554');
        inspector.querySelector('[data-ve-bg]').value = toHexColor(style.backgroundColor, '#ffffff');
      }
      function applyStyle(prop, value) {
        const target = selectedElement && !selectedElement.matches('.media-box,.editable-image-box,img') ? selectedElement : document.activeElement;
        if (target && target !== document.body) {
          target.style[prop] = value;
          updateInspector();
        }
      }
      function applyGeometry(prop, value) {
        if (!selectedElement || selectedElement === document.body) return;
        pushHistory();
        const geometry = elementGeometry(selectedElement);
        if (prop === 'left') applyElementGeometry(selectedElement, { left: numberValue(value, geometry.left) });
        else if (prop === 'top') applyElementGeometry(selectedElement, { top: numberValue(value, geometry.top) });
        else if (prop === 'width') applyElementGeometry(selectedElement, { width: numberValue(value, geometry.width) });
        else if (prop === 'height') applyElementGeometry(selectedElement, { height: numberValue(value, geometry.height) });
        else if (prop === 'zIndex') selectedElement.style.zIndex = String(value || '');
        else selectedElement.style[prop] = value;
        updateInspector();
      }
      function layerSelected(delta) {
        if (!selectedElement) return;
        pushHistory();
        const value = parseInt(getComputedStyle(selectedElement).zIndex, 10);
        selectedElement.style.zIndex = String((Number.isFinite(value) ? value : 1) + delta);
        updateInspector();
      }
      function duplicateSelected() {
        if (!selectedElement || selectedElement.matches('body,.slide,.slide-inner')) return;
        pushHistory();
        const clone = selectedElement.cloneNode(true);
        clone.dataset.pptId = '';
        clone.classList.remove('ppt-selected-element','selected-image');
        clone.querySelectorAll('[data-ppt-id]').forEach((node) => node.removeAttribute('data-ppt-id'));
        if (getComputedStyle(selectedElement).position === 'static') clone.style.position = 'absolute';
        clone.style.left = (parseFloat(selectedElement.style.left || '40') + 24) + 'px';
        clone.style.top = (parseFloat(selectedElement.style.top || '40') + 24) + 'px';
        activeSlide().appendChild(clone);
        assignStableIds(clone);
        prepareImages();
        selectElement(clone);
      }
      function keepImageInBounds(el) {
        if (!el) return;
        applyElementGeometry(el, elementGeometry(el));
      }
      function startMove(el, event) {
        event.preventDefault();
        event.stopPropagation();
        selectElement(el);
        pushHistory();
        const startX = event.clientX;
        const startY = event.clientY;
        const base = elementGeometry(el);
        applyElementGeometry(el, base);
        el.style.zIndex = '50';
        event.target.setPointerCapture?.(event.pointerId);
        const move = (moveEvent) => {
          applyElementGeometry(el, {
            left: base.left + moveEvent.clientX - startX,
            top: base.top + moveEvent.clientY - startY,
            width: base.width,
            height: base.height,
          });
          updateInspector();
        };
        const up = () => {
          event.target.removeEventListener('pointermove', move);
          event.target.removeEventListener('pointerup', up);
          syncInspectorFromElement();
        };
        event.target.addEventListener('pointermove', move);
        event.target.addEventListener('pointerup', up);
      }
      function startResize(el, corner, event) {
        event.preventDefault();
        event.stopPropagation();
        selectElement(el);
        pushHistory();
        const startX = event.clientX;
        const startY = event.clientY;
        const base = elementGeometry(el);
        const ratio = base.width / Math.max(1, base.height);
        const isImage = Boolean(el.querySelector?.('img')) || el.matches('img,.media-box,.editable-image-box,figure');
        applyElementGeometry(el, base);
        el.style.zIndex = '50';
        event.target.setPointerCapture?.(event.pointerId);
          const move = (moveEvent) => {
          const dx = moveEvent.clientX - startX;
          const dy = moveEvent.clientY - startY;
          let left = base.left;
          let top = base.top;
          let width = base.width + (corner.includes('e') ? dx : -dx);
          let height = base.height + (corner.includes('s') ? dy : -dy);
          if (isImage && !moveEvent.shiftKey) {
            if (Math.abs(dx) >= Math.abs(dy)) height = width / ratio;
            else width = height * ratio;
          }
          if (corner.includes('w')) left = base.left + base.width - width;
          if (corner.includes('n')) top = base.top + base.height - height;
          applyElementGeometry(el, { left, top, width, height });
          updateInspector();
          };
          const up = () => {
          event.target.removeEventListener('pointermove', move);
          event.target.removeEventListener('pointerup', up);
          syncInspectorFromElement();
          };
        event.target.addEventListener('pointermove', move);
        event.target.addEventListener('pointerup', up);
      }
      function makeDraggable(el) {
        if (el.dataset.dragReady) return;
        el.dataset.dragReady = '1';
        if (getComputedStyle(el).position === 'static') el.style.position = 'relative';
        const drag = document.createElement('span');
        drag.className = 'image-drag-handle';
        drag.title = 'Hold and drag the image center to move';
        drag.addEventListener('pointerdown', (event) => startMove(el, event));
        el.appendChild(drag);
        ['nw','ne','sw','se'].forEach((corner) => {
          const handle = document.createElement('span');
          handle.className = 'image-resize-handle ' + corner;
          handle.title = 'Hold and drag corner to resize';
          handle.addEventListener('pointerdown', (event) => startResize(el, corner, event));
          el.appendChild(handle);
        });
        el.addEventListener('pointerdown', (event) => {
          if (!document.body.classList.contains('editing') || event.target.closest('.editor-toolbar,.image-drag-handle,.image-resize-handle')) return;
          selectElement(el);
        });
      }
      function prepareImages() {
        document.querySelectorAll('img').forEach((img) => {
          img.draggable = false;
          img.addEventListener('dragstart', (event) => event.preventDefault());
          if (img.closest('.media-box,.editable-image-box')) {
            makeDraggable(img.closest('.media-box,.editable-image-box'));
            return;
          }
          const box = document.createElement('span');
          box.className = 'editable-image-box';
          img.parentNode.insertBefore(box, img);
          box.appendChild(img);
          makeDraggable(box);
        });
      }
      function toggleEdit(force) {
        const editing = typeof force === 'boolean' ? force : !document.body.classList.contains('editing');
        ensureEditorChrome();
        document.body.classList.toggle('editing', editing);
        document.querySelectorAll('h1,.point-card,.chapter,.editable-text,p,li,td,th,.free-textbox').forEach((node) => node.contentEditable = editing ? 'true' : 'false');
        if (editing) prepareImages();
      }
      function addTextBox() {
        pushHistory();
        const box = document.createElement('div');
        box.className = 'free-textbox editable-text';
        box.textContent = 'New text';
        box.contentEditable = 'true';
        activeSlide().appendChild(box);
        makeDraggable(box);
        selectElement(box);
        box.focus();
      }
      function addImageFromInput(event) {
        const file = event.target.files && event.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = () => {
          const box = document.createElement('figure');
          box.className = 'media-box';
          box.style.position = 'absolute';
          box.style.left = '12%';
          box.style.top = '36%';
          box.style.width = '320px';
          box.style.height = '220px';
          box.innerHTML = '<img alt="Added image">';
          box.querySelector('img').src = reader.result;
          activeSlide().appendChild(box);
          makeDraggable(box);
          assignStableIds(box);
          selectElement(box);
        };
        reader.readAsDataURL(file);
        event.target.value = '';
      }
      function deleteSelected() {
        if (selectedElement && !selectedElement.matches('body,.slide,.slide-inner')) {
          pushHistory();
          selectedElement.remove();
          selectedElement = null;
          updateInspector();
        }
      }
      function htmlEscape(value) {
        return String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
      }
      function compactHtml(node, max = 4000) {
        return node?.outerHTML ? node.outerHTML.replace(/\\s+/g, ' ').slice(0, max) : '';
      }
      function getPptPatchContext(scope = 'current_slide') {
        const slide = activeSlide();
        const selected = selectedElement && selectedElement !== document.body ? selectedElement : null;
        return {
          scope,
          currentSlide: currentSlide + 1,
          slideCount: slides.length,
          currentSlideId: slide?.dataset?.pptId || slide?.id || '',
          currentSlideText: (slide.innerText || '').replace(/\\s+/g, ' ').slice(0, 3200),
          currentSlideHtml: compactHtml(slide, 9000),
          selectedId: selected?.dataset?.pptId || '',
          selectedTag: selected?.tagName || '',
          selectedText: (selected?.innerText || selected?.alt || '').replace(/\\s+/g, ' ').slice(0, 1200),
          selectedHtml: compactHtml(selected, 2600)
        };
      }
      function titleTarget() {
        return activeSlide().querySelector('h1,h2,h3,.title,.slide-title,[data-title]') || activeSlide().querySelector('.editable-text,p,li');
      }
      function textTargets(operation = {}) {
        if (operation.id) {
          const byId = document.querySelector('[data-ppt-id="' + CSS.escape(String(operation.id)) + '"]');
          return byId ? [byId] : [];
        }
        const target = String(operation.target || '').toLowerCase();
        if (target === 'selected' || target === 'selected_element') return selectedElement ? [selectedElement] : [];
        if (target === 'title') return titleTarget() ? [titleTarget()] : [];
        if (operation.selector) return Array.from(activeSlide().querySelectorAll(operation.selector)).slice(0, 12);
        if (target === 'deck') return Array.from(document.querySelectorAll('h1,h2,h3,p,li,.editable-text')).slice(0, 80);
        return [activeSlide()];
      }
      function imageTargets(operation = {}) {
        if (operation.id) {
          const byId = document.querySelector('[data-ppt-id="' + CSS.escape(String(operation.id)) + '"]');
          return byId ? [byId.closest?.('.media-box,.editable-image-box,figure') || byId] : [];
        }
        const target = String(operation.target || '').toLowerCase();
        const slide = activeSlide();
        const boxes = Array.from((target === 'deck' ? document : slide).querySelectorAll('.media-box,.editable-image-box,figure,img')).filter((node) => node.matches('img') || node.querySelector?.('img')).map((node) => node.closest?.('.media-box,.editable-image-box,figure') || node);
        if ((target === 'selected' || target === 'selected_element') && selectedElement) return [selectedElement.closest?.('.media-box,.editable-image-box,figure') || selectedElement].filter(Boolean);
        if (target === 'all_images' || target === 'deck') return Array.from(new Set(boxes));
        const measured = boxes.map((box) => ({ box, area: (box.getBoundingClientRect().width || 0) * (box.getBoundingClientRect().height || 0) })).sort((a, b) => b.area - a.area);
        return measured[0] ? [measured[0].box] : [];
      }
      function sanitizeStyles(styles = {}) {
        const allow = new Set(['color','background','backgroundColor','borderColor','fontSize','fontFamily','fontWeight','fontStyle','textDecoration','textAlign','lineHeight','width','height','maxWidth','maxHeight','left','top','display','gridTemplateColumns','gap','padding','margin']);
        const clean = {};
        Object.entries(styles || {}).forEach(([key, value]) => {
          if (allow.has(key) && typeof value !== 'object') clean[key] = String(value);
        });
        return clean;
      }
      function applyStyles(targets, styles) {
        const clean = sanitizeStyles(styles);
        targets.forEach((target) => Object.assign(target.style, clean));
      }
      function constrainImages(scope = 'current_slide') {
        const root = scope === 'deck' ? document : activeSlide();
        root.querySelectorAll('.media-box,.editable-image-box,figure:has(img)').forEach((box) => {
          box.style.maxWidth = '46%';
          box.style.maxHeight = '54%';
          box.style.overflow = 'hidden';
          box.querySelectorAll('img').forEach((img) => {
            img.style.width = '100%';
            img.style.height = '100%';
            img.style.maxWidth = '100%';
            img.style.maxHeight = '100%';
            img.style.objectFit = 'contain';
          });
        });
      }
      function fixOverflow(scope = 'current_slide') {
        const targets = scope === 'deck' ? slides : [activeSlide()];
        targets.forEach((slide) => {
          slide.style.overflow = 'hidden';
          slide.querySelectorAll('h1,h2,h3,p,li,.editable-text').forEach((node) => {
            node.style.writingMode = 'horizontal-tb';
            node.style.whiteSpace = 'normal';
            node.style.wordBreak = 'normal';
            node.style.overflowWrap = 'normal';
            node.style.maxWidth = '92%';
            if ((node.getBoundingClientRect().width || 0) < 120 && (node.innerText || '').length > 8) node.style.minWidth = '320px';
          });
        });
        constrainImages(scope);
      }
      function splitCurrentSlide(operation = {}) {
        const slide = activeSlide();
        const candidates = Array.from(slide.querySelectorAll('li,.body-paragraph,.point-card,p')).filter((node) => (node.innerText || '').trim().length > 0);
        if (candidates.length < 4) return 0;
        const clone = slide.cloneNode(true);
        clone.id = 'slide-' + (slides.length + 1);
        clone.dataset.slidePage = String(slides.length + 1);
        const cloneCandidates = Array.from(clone.querySelectorAll('li,.body-paragraph,.point-card,p')).filter((node) => (node.innerText || '').trim().length > 0);
        const splitAt = Math.max(2, Math.ceil(candidates.length / 2));
        candidates.slice(splitAt).forEach((node) => node.remove());
        cloneCandidates.slice(0, splitAt).forEach((node) => node.remove());
        const cloneTitle = clone.querySelector('h1,h2,h3,.title,.slide-title');
        if (cloneTitle && operation.newSlideTitle) cloneTitle.textContent = operation.newSlideTitle;
        slide.after(clone);
        refreshSlides();
        showSlide(currentSlide + 1);
        return 1;
      }
      function applyPptPatch(patch = {}) {
        const operations = Array.isArray(patch.operations) ? patch.operations : [];
        let applied = 0;
        operations.forEach((operation) => {
          const type = String(operation.type || '').toLowerCase();
          if (type === 'set_text' || type === 'update_text' || type === 'modify_title') {
            const targets = textTargets({ ...operation, target: operation.target || (type === 'modify_title' ? 'title' : 'selected') });
            targets.slice(0, 1).forEach((target) => { target.textContent = String(operation.value || operation.text || ''); applied += 1; });
          } else if (type === 'set_style' || type === 'update_style' || type === 'change_colors' || type === 'replace_style') {
            if (operation.target === 'deck' || type === 'replace_style') {
              applyStyles(slides, operation.styles || operation.style || operation.palette || {});
              if (operation.palette) {
                Object.entries(operation.palette).forEach(([key, value]) => document.documentElement.style.setProperty('--chat-' + key, String(value)));
              }
            } else {
              applyStyles(textTargets(operation), operation.styles || operation.style || operation.palette || {});
            }
            applied += 1;
          } else if (type === 'resize_image' || type === 'adjust_images' || type === 'move_image') {
            imageTargets(operation).forEach((target) => {
              if (!target.style.position || target.style.position === 'static') target.style.position = 'absolute';
              applyStyles([target], {
                width: operation.width || operation.styles?.width || target.style.width || '38%',
                height: operation.height || operation.styles?.height || target.style.height || 'auto',
                maxWidth: operation.maxWidth || operation.styles?.maxWidth || '46%',
                maxHeight: operation.maxHeight || operation.styles?.maxHeight || '54%',
                left: operation.left || operation.styles?.left || target.style.left,
                top: operation.top || operation.styles?.top || target.style.top,
              });
              target.querySelectorAll?.('img').forEach((img) => { img.style.width = '100%'; img.style.height = '100%'; img.style.objectFit = 'contain'; });
              makeDraggable(target);
              keepImageInBounds(target);
              applied += 1;
            });
          } else if (type === 'fix_overflow') {
            fixOverflow(operation.target === 'deck' ? 'deck' : 'current_slide');
            applied += 1;
          } else if (type === 'split_slide' || type === 'split_crowded_slide') {
            applied += splitCurrentSlide(operation);
          }
        });
        fixOverflow(patch.scope === 'deck' ? 'deck' : 'current_slide');
        return { applied, slideCount: slides.length };
      }
      async function exportEditedHtml(mode = 'paged') {
        const clone = document.documentElement.cloneNode(true);
        clone.querySelector('.editor-toolbar')?.remove();
        clone.querySelector('#ppt-html-editor-style')?.remove();
        clone.querySelectorAll('.image-drag-handle,.image-resize-handle,.ppt-ext-handle,.ppt-runtime-nav,.ppt-ve-sidebar,.ppt-ve-inspector,.ppt-ve-ruler-top,.ppt-ve-ruler-left').forEach((node) => node.remove());
        clone.querySelectorAll('.selected-image,.ppt-active-slide,.ppt-selected-element,.ppt-platform-selected').forEach((node) => node.classList.remove('selected-image','ppt-active-slide','ppt-selected-element','ppt-platform-selected'));
        clone.querySelectorAll('[contenteditable]').forEach((node) => node.removeAttribute('contenteditable'));
        clone.querySelector('body')?.classList.remove('editing');
        if (mode === 'scroll') {
          clone.querySelector('body')?.classList.add('scroll-mode');
          clone.querySelectorAll('section.slide,section[data-slide-page],.slide,.ai-slide,[data-slide-page]').forEach((node) => {
            node.style.display = 'block';
            node.style.visibility = 'visible';
            node.style.opacity = '1';
          });
        } else {
          clone.querySelector('body')?.classList.remove('scroll-mode');
        }
        return '<!doctype html>\\n' + clone.outerHTML;
      }
      window.toggleEdit = toggleEdit;
      window.exportEditedHtml = exportEditedHtml;
      window.getPptPatchContext = getPptPatchContext;
      window.applyPptPatch = applyPptPatch;
      window.showSlide = showSlide;
      window.nextSlide = nextSlide;
      window.prevSlide = prevSlide;
      globalThis.toggleEdit = toggleEdit;
      globalThis.exportEditedHtml = exportEditedHtml;
      globalThis.getPptPatchContext = getPptPatchContext;
      globalThis.applyPptPatch = applyPptPatch;
      globalThis.showSlide = showSlide;
      globalThis.nextSlide = nextSlide;
      globalThis.prevSlide = prevSlide;
      document.documentElement.dataset.pptEditorReady = 'true';
      document.addEventListener('keydown', (event) => {
        if (document.body.classList.contains('editing') && (event.target?.isContentEditable || event.target?.closest?.('.editor-toolbar'))) return;
        if (document.body.classList.contains('editing') && selectedElement && /^Arrow/.test(event.key)) {
          event.preventDefault();
          const step = event.shiftKey ? 10 : 1;
          const geometry = elementGeometry(selectedElement);
          const delta = {
            ArrowLeft: { left: geometry.left - step },
            ArrowRight: { left: geometry.left + step },
            ArrowUp: { top: geometry.top - step },
            ArrowDown: { top: geometry.top + step },
          }[event.key];
          if (delta) {
            applyElementGeometry(selectedElement, delta);
            updateInspector();
            return;
          }
        }
        if (event.key === 'ArrowRight' || event.key === 'PageDown') nextSlide();
        if (event.key === 'ArrowLeft' || event.key === 'PageUp') prevSlide();
      });
      document.addEventListener('click', (event) => {
        if (document.body.classList.contains('editing')) selectElement(event.target);
      }, false);
      ensureToolbar();
      ensureRuntimeNav();
      showSlide(0);
    })();</script>`;
}

function injectEditorRuntime(html) {
  const runtime = editorRuntime();
  const motion = `<style id="ppt-ai-animation-style">${animationRuntimeCss()}</style><script id="ppt-ai-animation-runtime">${animationRuntimeScript()}</script>`;
  let output = String(html || "");
  if (!/<html[\s>]/i.test(output)) {
    output = `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>PPT HTML Studio</title></head><body>${output}</body></html>`;
  }
  if (!/ppt-html-editor-style/.test(output)) {
    output = output.replace(/<\/body>/i, `${motion}${runtime}</body>`);
    if (output === html) output += `${motion}${runtime}`;
  } else if (!/ppt-ai-animation-style/.test(output)) {
    output = output.replace(/<\/head>/i, `${motion}</head>`);
  }
  if (!/function\s+showSlide|let\s+slides\s*=|const\s+slides\s*=/.test(output)) {
    output = output.replace(/<\/body>/i, `<script>window.nextSlide=window.nextSlide||function(){};window.prevSlide=window.prevSlide||function(){};</script></body>`);
  }
  return output;
}

function originalImageStyle() {
  return `<style id="ppt-original-image-style">
    section:has(.ppt-original-images), .slide:has(.ppt-original-images), .ai-slide:has(.ppt-original-images) { overflow: hidden; }
    .ppt-original-images { position: relative; z-index: 2; display: grid; gap: clamp(10px, 1.2vw, 18px); align-content: center; justify-items: center; width: min(36%, 460px); max-width: 36%; max-height: 38%; margin: auto 0 0 auto; overflow: hidden; clear: both; }
    .ppt-original-images figure, figure.original-ppt-image { margin: 0; display: grid; place-items: center; width: 100%; min-width: 0; max-width: 100%; max-height: 100%; overflow: hidden; }
    .ppt-original-images img, .original-ppt-image img, img[alt^="Original PPT slide"] { display: block; width: 100%; height: auto; max-width: 100%; max-height: 100%; aspect-ratio: auto; object-fit: contain; border-radius: 8px; background: #fff; }
    .ppt-original-images[data-count="2"], .ppt-original-images[data-count="3"], .ppt-original-images[data-count="4"] { grid-template-columns: repeat(2, minmax(0, 1fr)); width: min(38%, 500px); max-width: 38%; max-height: 36%; }
  </style>`;
}

function markCoverSlide(html) {
  let marked = false;
  return String(html || "").replace(/<section\b([^>]*)>/i, (match, attrs) => {
    if (marked) return match;
    marked = true;
    if (/class\s*=\s*["']/i.test(attrs)) {
      return `<section${attrs.replace(/class\s*=\s*["']([^"']*)["']/i, (all, cls) => `class="${cls} ppt-cover-slide"`)}>`;
    }
    return `<section class="ppt-cover-slide"${attrs}>`;
  });
}

function originalImageBlock(slide) {
  if (!slide?.images?.length) return "";
  const figures = slide.images.map((image, index) => `<figure class="media-box original-ppt-image"><img src="${image.src}" alt="Original PPT slide ${slide.page} image ${index + 1}" /></figure>`).join("");
  return `<div class="ppt-original-images fallback-media-zone" data-original-images="${slide.page}" data-count="${slide.images.length}" data-image-fallback="true">${figures}</div>`;
}

function originalImageFigure(slide, index = 0) {
  const image = slide?.images?.[Math.max(0, Math.min(Number(index) || 0, (slide.images?.length || 1) - 1))];
  if (!image) return "";
  return `<figure class="media-box original-ppt-image" data-original-image="${slide.page}-${index + 1}"><img src="${image.src}" alt="Original PPT slide ${slide.page} image ${index + 1}" /></figure>`;
}

function parseImageSlotToken(value, fallbackPage = 0) {
  const token = String(value || "").trim().toLowerCase();
  const match = token.match(/(?:slide|page)?[-_\s:]*(\d+)(?:[-_\s:]*(\d+|[a-z]))?/i) || token.match(/^(\d+)([a-z])$/i);
  if (!match) return null;
  const page = Number(match[1] || fallbackPage);
  let index = null;
  if (match[2]) {
    index = /^[a-z]$/i.test(match[2]) ? match[2].toLowerCase().charCodeAt(0) - 97 : Number(match[2]) - 1;
  }
  return { page, index };
}

function replacementForImageSlot(slide, slot, cursor) {
  if (!slide?.images?.length || slot?.page !== slide.page) return null;
  if (Number.isInteger(slot.index)) return originalImageFigure(slide, slot.index);
  if (slide.images.length === 1) return originalImageFigure(slide, 0);
  return originalImageFigure(slide, cursor.value++);
}

function replaceAiImagePlaceholders(section, slide) {
  if (!slide?.images?.length) return section;
  const cursor = { value: 0 };
  let output = String(section || "");
  const applySlot = (match, slotText) => {
    const slot = parseImageSlotToken(slotText, slide.page);
    return replacementForImageSlot(slide, slot, cursor) || match;
  };
  output = output.replace(/<figure\b([^>]*data-image-slot\s*=\s*["']?([^"'\s>]+)["']?[^>]*)>[\s\S]*?<\/figure>/gi, (match, attrs, token) => applySlot(match, token));
  output = output.replace(/<img\b([^>]*(?:alt|title|src)\s*=\s*["'][^"']*(?:page|slide)[-_\s:]*0*\d+[a-z]?[^"']*["'][^>]*)>/gi, (match, attrs) => {
    const token = attrs.match(/(?:page|slide)[-_\s:]*0*\d+[a-z]?/i)?.[0];
    const slot = parseImageSlotToken(token, slide.page);
    const image = slide.images[Math.max(0, Math.min(Number.isInteger(slot?.index) ? slot.index : cursor.value++, slide.images.length - 1))];
    if (!slot || slot.page !== slide.page || !image) return match;
    return `<img src="${image.src}" alt="Original PPT slide ${slide.page} image ${(Number.isInteger(slot.index) ? slot.index : cursor.value - 1) + 1}">`;
  });
  output = output.replace(/<(figure|div)\b((?:(?!>).)*?(?:placeholder|image-slot|image-box|image-card|media-slot|photo-placeholder|visual-placeholder|visual-card|asset-slot)(?:(?!>).)*?)>[\s\S]*?(?:page|slide)[-_\s:]*0*(\d+)([a-z])?[\s\S]*?<\/\1>/gi, (match, tag, attrs, pageText, letter) => {
    const slot = parseImageSlotToken(`${pageText}${letter || ""}`, slide.page);
    return replacementForImageSlot(slide, slot, cursor) || match;
  });
  return output;
}

function countHtmlSlides(html) {
  const output = String(html || "");
  const pageMarkers = output.match(/data-slide-page\s*=/gi);
  if (pageMarkers?.length) return pageMarkers.length;
  const sections = (output.match(/<section\b/gi) || []).length;
  if (sections) return sections;
  return (output.match(/class=["'][^"']*\bslide\b/gi) || []).length;
}

function injectOriginalImages(html, slides) {
  if (!slides.some((slide) => slide.images.length)) return markCoverSlide(html);
  let output = String(html || "");
  const usedPages = new Set();
  const sections = [...output.matchAll(/<section\b[\s\S]*?<\/section>/gi)];
  if (sections.length) {
    let rebuilt = "";
    let cursor = 0;
    sections.forEach((match, index) => {
      const section = match[0];
      const slide = slides[index];
      rebuilt += output.slice(cursor, match.index);
      const replacedSection = slide?.images?.length ? replaceAiImagePlaceholders(section, slide) : section;
      const replacedExisting = replacedSection !== section;
      if (slide?.images?.length && !usedPages.has(slide.page) && !replacedSection.includes("ppt-original-images") && !replacedExisting) {
        rebuilt += replacedSection.replace(/<\/section>\s*$/i, `${originalImageBlock(slide)}</section>`);
        usedPages.add(slide.page);
      } else {
        rebuilt += replacedSection;
        if (replacedExisting) usedPages.add(slide.page);
      }
      cursor = match.index + section.length;
    });
    rebuilt += output.slice(cursor);
    output = rebuilt;
  } else {
    const imageAppendix = slides.map(originalImageBlock).filter(Boolean).join("");
    output = output.replace(/<\/body>/i, `${imageAppendix}</body>`);
  }
  if (!/ppt-original-image-style/.test(output)) {
    output = output.replace(/<\/head>/i, `${originalImageStyle()}</head>`);
    if (!/ppt-original-image-style/.test(output)) output = `${originalImageStyle()}${output}`;
  }
  return markCoverSlide(output);
}

function validateAiHtmlCompleteness(html, slides) {
  const slideCount = countHtmlSlides(html);
  if (slides.length > 2 && slideCount && slideCount !== slides.length) {
    throw new Error(`The AI returned an incomplete deck (${slideCount}/${slides.length} slides). Regenerate or reduce the PPT size.`);
  }
}

function enforceStylePackOnHtml(html, style) {
  const safeStyle = cleanText(style || "teaching").replace(/[^a-z0-9_-]/gi, "") || "teaching";
  let output = String(html || "");
  if (!/<html[\s>]/i.test(output)) {
    output = `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>PPT HTML Studio</title></head><body>${output}</body></html>`;
  }
  if (/<body\b/i.test(output)) {
    output = output.replace(/<body\b([^>]*)>/i, (match, attrs) => {
      let nextAttrs = attrs || "";
      if (/class\s*=\s*["']/i.test(nextAttrs)) {
        nextAttrs = nextAttrs.replace(/class\s*=\s*["']([^"']*)["']/i, (all, classes) => {
          const classSet = new Set(String(classes || "").split(/\s+/).filter(Boolean));
          classSet.add(`style-${safeStyle}`);
          return `class="${Array.from(classSet).join(" ")}"`;
        });
      } else {
        nextAttrs += ` class="style-${safeStyle}"`;
      }
      if (!/data-style-pack\s*=/.test(nextAttrs)) nextAttrs += ` data-style-pack="${safeStyle}"`;
      return `<body${nextAttrs}>`;
    });
  }
  output = output.replace(/<(section|div)\b((?=[^>]*(?:class=["'][^"']*\bslide\b|data-slide-page\b))[^>]*)>/gi, (match, tag, attrs) => {
    let nextAttrs = attrs || "";
    if (!/data-style-pack\s*=/.test(nextAttrs)) nextAttrs += ` data-style-pack="${safeStyle}"`;
    return `<${tag}${nextAttrs}>`;
  });
  if (!/ppt-local-style-variants/.test(output)) {
    output = /<\/head>/i.test(output)
      ? output.replace(/<\/head>/i, `${localStyleVariantCss()}</head>`)
      : `${localStyleVariantCss()}${output}`;
  }
  return output;
}

function makeScrollHtml(html) {
  let output = String(html || "");
  if (/<body\b[^>]*class="/i.test(output)) {
    output = output.replace(/<body\b([^>]*?)class="([^"]*)"/i, (all, before, cls) => `<body${before}class="${cls} scroll-mode"`);
  } else if (/<body\b/i.test(output)) {
    output = output.replace(/<body\b([^>]*)>/i, '<body$1 class="scroll-mode">');
  }
  if (!/ppt-scroll-export-style/.test(output)) {
    const style = `<style id="ppt-scroll-export-style">body.scroll-mode{overflow:auto!important}body.scroll-mode .slide,body.scroll-mode section,body.scroll-mode section[data-slide-page],body.scroll-mode [data-slide-page]{display:block!important;visibility:visible!important;opacity:1!important;min-height:100vh}body.scroll-mode .ppt-runtime-nav,body.scroll-mode .nav{display:none!important}</style>`;
    output = /<\/head>/i.test(output) ? output.replace(/<\/head>/i, `${style}</head>`) : `${style}${output}`;
  }
  output = output.replace(/(<(?:section|div)\b(?=[^>]*(?:class=["'][^"']*\bslide\b|data-slide-page\b))[^>]*\bstyle=["'])([^"']*)(["'][^>]*>)/gi, (match, start, style, end) => {
    const visibleStyle = String(style).replace(/display\s*:\s*none\s*;?/gi, "display:block;");
    return `${start}${visibleStyle}${end}`;
  });
  return output;
}

function localStyleVariantCss() {
  return `<style id="ppt-local-style-variants">
    body.style-banana .slide{background:#fffdf5;color:#27344d}body.style-banana .slide-inner{border-top:10px solid #ffd63b;background:linear-gradient(135deg,rgba(255,255,255,.72),rgba(255,247,212,.34))}body.style-banana h1{color:#27344d}body.style-banana .chapter{color:#df741c}body.style-banana .point-card{background:#fff8df;border-color:#f2c94c;border-radius:10px}body.style-banana .quiet-list li::before{background:#62cde1}
    body.style-teaching .slide{background:#f8fbff;color:#102a43;--deck-bg:#f8fbff;--deck-surface:#e8f2ff;--deck-text:#102a43;--deck-muted:#355a7d;--deck-accent:#155eef}body.style-teaching .slide-inner{border-top:10px solid #155eef}body.style-teaching .point-card{background:#e8f2ff;border-color:#9ec5ff;color:#102a43}body.style-teaching .slide :where(h1,h2,h3,h4,.title,.lead-text,.body-paragraph,.point-card,.agenda-item,.quiet-list li){color:#102a43}body.style-teaching .slide :where(.chapter,.eyebrow,.kicker,.meta,.muted,.dim,.dim2){color:#355a7d}
    body.style-softlesson .slide{background:radial-gradient(circle at 88% 14%,rgba(139,199,247,.2),transparent 28%),#fffaf3}body.style-softlesson .slide-inner{padding-top:clamp(58px,8vh,96px)}body.style-softlesson h1{color:#23395d;text-align:center;margin-inline:auto}body.style-softlesson .point-card{background:#fff8ec;border-color:#d9ecff;border-radius:18px}
    body.style-clean .slide{background:#fff}body.style-clean .chapter{color:#111827;letter-spacing:.18em}body.style-clean .point-card{background:transparent;border-color:#d1d5db;border-radius:0;border-width:0 0 1px 0;padding-left:0}
    body.style-academic .slide{background:#fbfaf6}body.style-academic h1{font-family:Georgia,'Times New Roman',serif;color:#1f2937}body.style-academic header:after{content:"";width:min(760px,70vw);height:2px;background:#8a6f42;opacity:.45}body.style-academic .point-card{background:#f5efe4;border-color:#d6c6a9}
    body.style-instructional .slide{background:#f7fcff}body.style-instructional .agenda-item span{display:grid;place-items:center;width:42px;height:42px;border-radius:10px;background:#0ea5e9;color:#fff}body.style-instructional .thinking-space{background:#f0f9ff;border-style:solid}
    body.style-minimal .slide{background:#fff}body.style-minimal .slide-inner{padding-left:clamp(96px,12vw,190px);padding-right:clamp(96px,12vw,190px)}body.style-minimal .chapter{color:#111827;opacity:.46}body.style-minimal .quiet-list li::before{width:24px;height:2px;border-radius:0;top:.74em;background:#111827}
    body.style-contrast .slide{background:#0f172a;color:#fff}body.style-contrast h1,body.style-contrast .lead-text{color:#fff}body.style-contrast .quiet-list li,body.style-contrast .body-paragraph,body.style-contrast footer{color:rgba(255,255,255,.86)}body.style-contrast .point-card{background:#111827;color:#fff;border-color:rgba(56,189,248,.5)}
    body.style-healing .slide{background:radial-gradient(circle at 12% 18%,rgba(158,208,235,.2),transparent 24%),radial-gradient(circle at 88% 80%,rgba(247,231,200,.45),transparent 24%),#fffaf0}body.style-healing h1{font-family:'Trebuchet MS','Segoe UI',Arial,sans-serif;color:#45352e;text-align:center;margin-inline:auto}body.style-healing .lead-text,body.style-healing .body-paragraph{font-family:'Trebuchet MS','Segoe UI',Arial,sans-serif;color:#5b463a}body.style-healing .point-card{background:rgba(255,255,248,.82);border:1px dashed #9ed0eb;border-radius:18px;color:#4a3b31}body.style-healing .quiet-list li::before{background:#9ed0eb;width:10px;height:10px;opacity:.75}body.style-healing .media-grid img{border:1px solid #ead7ba;border-radius:18px}
    body.style-doodle .slide{background:#fff4d8}body.style-doodle h1,body.style-doodle .body-paragraph,body.style-doodle .point-card,body.style-doodle .lead-text{font-family:'Segoe Print','Comic Sans MS',cursive;color:#3c2c2c}body.style-doodle .point-card,body.style-doodle .media-grid img{border:2px solid #3c2c2c;border-radius:8px;transform:rotate(-.45deg);background:#fff9e8}body.style-doodle .quiet-list li::before{border-radius:2px;transform:rotate(12deg);background:#3c2c2c}
    body.style-swiss .slide-inner{background-image:linear-gradient(rgba(37,99,235,.075) 1px,transparent 1px),linear-gradient(90deg,rgba(37,99,235,.075) 1px,transparent 1px);background-size:46px 46px}body.style-swiss h1{font-family:'Arial Narrow',Arial,sans-serif;text-transform:uppercase;letter-spacing:-.015em}body.style-swiss .point-card{border:0;border-left:7px solid #2563eb;border-radius:0;background:rgba(255,255,255,.86)}
    body.style-editorial .slide{background:#fffdf8}body.style-editorial .slide-inner{padding-left:clamp(92px,11vw,170px)}body.style-editorial h1,body.style-editorial .lead-text{font-family:Georgia,'Times New Roman',serif}body.style-editorial .lead-text{border-left:4px solid #b45309;padding-left:24px}body.style-editorial .point-card{background:#faf2e4;border-color:#e8d2b2}
    body.style-vivid .slide{background:linear-gradient(135deg,#fff7ed 0%,#f8fbff 62%,#eff6ff 100%)}body.style-vivid .chapter{background:#f97316;color:#fff;width:max-content;padding:5px 12px;border-radius:999px}body.style-vivid .point-card{background:#fff7ed;border-color:#fed7aa}
    body.style-academic .media-grid img,body.style-editorial .media-grid img{border:1px solid rgba(31,41,55,.16)}body.style-vivid .media-grid img,body.style-teaching .media-grid img{border:1px solid rgba(37,99,235,.18)}
    ${qualityStyleVariantCss()}
  </style>`;
}

function sanitizeHex(value, fallback) {
  const normalized = String(value || "").trim();
  return /^#[0-9a-f]{6}$/i.test(normalized) ? normalized : fallback;
}

function sanitizeFont(value) {
  return String(value || "Inter, Arial, sans-serif").replace(/[<>{};]/g, "").slice(0, 120);
}

function normalizeCustomStyle(style) {
  if (!style || typeof style !== "object") return null;
  const id = String(style.id || "").replace(/[^a-z0-9_-]/gi, "").slice(0, 48);
  if (!id || !id.startsWith("custom-")) return null;
  const colors = style.colors || {};
  const typography = style.typography || {};
  return {
    id,
    name: cleanText(style.name || "Custom Style").slice(0, 60),
    colors: {
      background: sanitizeHex(colors.background, "#f8fbff"),
      text: sanitizeHex(colors.text, "#10203f"),
      primary: sanitizeHex(colors.primary, "#2563eb"),
      accent: sanitizeHex(colors.accent, "#38bdf8"),
      panel: sanitizeHex(colors.panel, "#ffffff"),
    },
    typography: {
      titleFont: sanitizeFont(typography.titleFont),
      bodyFont: sanitizeFont(typography.bodyFont),
    },
    layout: ["balanced", "centered", "two-column", "image-focus", "minimal"].includes(style.layout) ? style.layout : "balanced",
    promptAddon: cleanText(style.promptAddon || "").slice(0, 1600),
    localRules: cleanText(style.localRules || "").slice(0, 1200),
  };
}

function customStyleCss(customStyle) {
  if (!customStyle) return "";
  const cls = `style-${customStyle.id}`;
  const c = customStyle.colors;
  const t = customStyle.typography;
  const centered = customStyle.layout === "centered" ? `body.${cls} header{text-align:center;margin-inline:auto}body.${cls} h1{text-align:center;margin-inline:auto}` : "";
  const minimal = customStyle.layout === "minimal" ? `body.${cls} .point-card{background:transparent;border-width:0 0 1px 0;border-radius:0}` : "";
  const imageFocus = customStyle.layout === "image-focus" ? `body.${cls} .media-grid{width:min(44vw,660px)}body.${cls} .image-focus .media-grid{width:min(58vw,820px)}` : "";
  return `<style id="ppt-custom-style">${`body.${cls} .slide{background:${c.background};color:${c.text};font-family:${t.bodyFont}}body.${cls} h1{font-family:${t.titleFont};color:${c.text}}body.${cls} .lead-text,body.${cls} .body-paragraph,body.${cls} .quiet-list li,body.${cls} .agenda-item p{font-family:${t.bodyFont};color:${c.text}}body.${cls} .chapter,body.${cls} .agenda-item span{color:${c.primary}}body.${cls} .quiet-list li:before,body.${cls} .quiet-list li::before{background:${c.accent}}body.${cls} .point-card{background:${c.panel};border-color:${c.accent};color:${c.text}}body.${cls} .media-grid img{border:1px solid ${c.accent};border-radius:8px}${centered}${minimal}${imageFocus}`}</style>`;
}

function buildHtml(slides, style, mode = "paged", customStyle = null) {
  const bodyClass = `${mode === "scroll" ? "scroll-mode " : ""}style-${style}`;
  const slideHtml = slides.map((slide, index) => renderSlide(slide, index, slides.length, style)).join("\n");
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>PPT HTML Studio</title>
  <style>
    * { box-sizing: border-box; }
    html, body { margin: 0; min-height: 100%; background: #f6f8fb; color: #17213f; font-family: var(--font, Inter, Arial, sans-serif); }
    body { overflow: hidden; }
    body.scroll-mode { overflow: auto; }
    .slide { width: 100vw; height: 100vh; display: none; background: var(--bg); color: var(--ink); overflow: hidden; font-family: var(--font, Inter, Arial, sans-serif); }
    .slide.active { display: block; }
    body.scroll-mode .slide { display: block; min-height: 100vh; height: auto; page-break-after: always; }
    .slide-inner { width: min(1440px, 100vw); height: 100%; margin: 0 auto; padding: clamp(42px, 6vh, 76px) clamp(72px, 8vw, 132px) 64px; display: grid; grid-template-rows: auto 1fr auto; gap: clamp(28px, 5vh, 58px); position: relative; }
    header { display: grid; gap: 14px; text-align: left; max-width: 1120px; }
    .chapter { color: var(--accent); font-size: clamp(17px, 1.45vw, 24px); font-weight: 800; letter-spacing: .08em; text-transform: uppercase; }
    h1 { margin: 0; font-size: clamp(40px, 4vw, 64px); line-height: 1.05; max-width: 1080px; overflow-wrap: break-word; word-break: normal; hyphens: none; letter-spacing: -0.01em; }
    .cover .slide-inner { display: flex; flex-direction: column; justify-content: center; align-items: center; gap: clamp(16px, 3vh, 34px); padding-top: clamp(56px, 8vh, 92px); padding-bottom: clamp(56px, 8vh, 92px); }
    .cover header { text-align: center; max-width: min(1100px, 90vw); margin: 0 auto; }
    .cover h1 { font-size: clamp(48px, 5.1vw, 78px); }
    .cover-subtitle { margin: 18px auto 0; max-width: 860px; color: #64748b; font-size: clamp(24px, 2vw, 34px); line-height: 1.35; font-weight: 500; }
    .cover main { display: block; min-height: auto; }
    .cover footer { position: absolute; right: clamp(34px, 5vw, 80px); bottom: 28px; }
    main { min-height: 0; display: grid; gap: clamp(28px, 4vh, 48px); align-items: center; }
    .image-split main { grid-template-columns: minmax(0, .96fr) minmax(300px, .74fr); }
    .image-focus main { grid-template-columns: minmax(0, .8fr) minmax(340px, .78fr); }
    .text-only main { grid-template-columns: 1fr; }
    .lead-text { margin: 0; max-width: 980px; font-size: clamp(30px, 2.45vw, 44px); line-height: 1.18; font-weight: 760; letter-spacing: -0.01em; color: var(--ink); }
    .lesson-block, .statement-block, .workshop-prompt { max-width: 1040px; display: grid; gap: 26px; align-content: center; }
    .body-paragraph { margin: 0; max-width: 1120px; font-size: clamp(27px, 2vw, 36px); line-height: 1.28; color: var(--ink); font-weight: 540; overflow-wrap: break-word; word-break: normal; hyphens: none; }
    .density-many .body-paragraph { font-size: clamp(23px, 1.55vw, 30px); line-height: 1.24; }
    .body-paragraph + .body-paragraph { margin-top: 8px; color: #334155; }
    .quiet-list { margin: 0; padding: 0; list-style: none; display: grid; gap: 16px; max-width: 940px; }
    .quiet-list.multi-column { grid-template-columns: repeat(2, minmax(0, 1fr)); max-width: 1120px; column-gap: 34px; }
    .quiet-list li { position: relative; padding-left: 28px; font-size: clamp(24px, 1.85vw, 32px); line-height: 1.34; color: #334155; font-weight: 520; }
    .density-many .quiet-list li { font-size: clamp(21px, 1.45vw, 27px); line-height: 1.22; }
    .density-medium .quiet-list li { font-size: clamp(23px, 1.65vw, 30px); line-height: 1.28; }
    .quiet-list li::before { content: ""; position: absolute; left: 0; top: .58em; width: 8px; height: 8px; border-radius: 50%; background: var(--accent); opacity: .75; }
    .numbered-list { margin: 0; padding: 0; list-style: none; display: grid; gap: 18px; max-width: 980px; }
    .numbered-list li { display: grid; grid-template-columns: 42px 1fr; gap: 18px; align-items: start; font-size: clamp(23px, 1.7vw, 30px); line-height: 1.3; color: #334155; }
    .numbered-list li span { color: var(--accent); font-weight: 800; font-size: .8em; padding-top: .15em; }
    .agenda-list { width: min(980px, 80vw); display: grid; grid-template-columns: repeat(2, minmax(260px, 1fr)); gap: 18px 48px; align-self: center; }
    .agenda-item { display: grid; grid-template-columns: 46px 1fr; gap: 16px; align-items: center; min-height: 54px; border-bottom: 1px solid #dbe5f2; }
    .agenda-item span { color: var(--accent); font-size: 18px; font-weight: 800; letter-spacing: .04em; }
    .agenda-item p { margin: 0; font-size: clamp(24px, 1.85vw, 32px); line-height: 1.15; font-weight: 650; color: var(--ink); }
    .concept-row { display: grid; grid-template-columns: repeat(3, minmax(180px, 1fr)); gap: 18px; max-width: 980px; }
    .point-card { min-width: 0; border-radius: 8px; background: #ffffff; border: 1px solid #d7e3f4; padding: 22px 24px; font-size: clamp(22px, 1.65vw, 30px); line-height: 1.25; font-weight: 650; overflow-wrap: break-word; word-break: normal; hyphens: none; display: flex; align-items: center; box-shadow: none; }
    .thinking-space { width: min(860px, 68vw); min-height: 180px; border: 1px dashed #b7c7dc; border-radius: 8px; color: #94a3b8; display: grid; place-items: center; font-size: 24px; font-weight: 600; }
    .media-grid { min-height: 0; display: grid; gap: 16px; align-content: center; justify-self: center; width: min(38vw, 560px); max-width: 100%; }
    .image-focus .media-grid { justify-self: center; width: min(52vw, 760px); }
    .image-focus .media-grid img { max-height: 52vh; }
    .media-box { margin: 0; display: grid; place-items: center; min-height: 0; }
    .media-grid img { width: 100%; height: auto; max-height: 44vh; object-fit: contain; border-radius: 8px; box-shadow: none; background: #fff; }
    footer { justify-self: end; color: #64748b; font-size: 20px; }
    .nav { position: fixed; z-index: 20; left: 50%; bottom: 18px; transform: translateX(-50%); display: flex; gap: 10px; }
    .nav button { border: 1px solid #d8e2f0; border-radius: 8px; padding: 8px 13px; background: #ffffff; color: #1e3a8a; font-size: 15px; font-weight: 800; cursor: pointer; box-shadow: none; }
    .nav button:last-child { background: #2563eb; color: #fff; border-color: #2563eb; }
    body.scroll-mode .nav { display: none; }
    body.editing [contenteditable="true"] { outline: 3px dashed var(--accent); outline-offset: 4px; }
    body.style-clean .point-card, body.style-minimal .point-card { background: transparent; border-color: #d1d5db; }
    body.style-minimal .chapter { color: var(--ink); opacity: .55; letter-spacing: .16em; }
    body.style-minimal .quiet-list li::before { width: 22px; height: 2px; border-radius: 0; top: .72em; }
    body.style-academic h1, body.style-editorial h1 { font-family: Georgia, 'Times New Roman', serif; font-weight: 700; letter-spacing: 0; }
    body.style-academic .chapter { color: #6b7280; text-transform: none; letter-spacing: .03em; }
    body.style-editorial .slide-inner { padding-left: clamp(84px, 10vw, 160px); }
    body.style-editorial .lead-text { border-left: 4px solid var(--accent); padding-left: 24px; font-family: Georgia, 'Times New Roman', serif; font-weight: 600; }
    body.style-swiss .slide-inner { background-image: linear-gradient(rgba(37,99,235,.055) 1px, transparent 1px), linear-gradient(90deg, rgba(37,99,235,.055) 1px, transparent 1px); background-size: 48px 48px; }
    body.style-swiss h1 { max-width: 900px; text-transform: none; letter-spacing: -.02em; }
    body.style-swiss .point-card { border: 0; border-left: 6px solid var(--accent); border-radius: 0; background: rgba(255,255,255,.82); }
    body.style-healing .slide { background: radial-gradient(circle at 88% 12%, rgba(138,190,216,.18), transparent 28%), var(--bg); }
    body.style-healing .point-card, body.style-healing .thinking-space { background: #fffaf0; border-color: #ead7ba; }
    body.style-doodle .slide { background: linear-gradient(0deg, rgba(255,246,223,.96), rgba(255,246,223,.96)); }
    body.style-doodle h1, body.style-doodle .point-card, body.style-doodle .lead-text { font-family: 'Comic Sans MS', 'Trebuchet MS', Arial, sans-serif; }
    body.style-doodle .point-card, body.style-doodle .media-grid img { border: 2px solid #3c2c2c; border-radius: 8px; transform: rotate(-.25deg); }
    body.style-doodle .quiet-list li::before { border-radius: 2px; transform: rotate(12deg); }
    body.style-contrast .quiet-list li, body.style-contrast footer, body.style-contrast .cover-subtitle { color: rgba(255,255,255,.82); }
    body.style-contrast .point-card { background: #111827; color: #fff; border-color: rgba(56,189,248,.45); }
    body.style-vivid .chapter { background: var(--accent); color: #fff; width: fit-content; padding: 5px 12px; border-radius: 999px; letter-spacing: .04em; }
    body.style-vivid .point-card { background: #fff7ed; border-color: #fed7aa; }
    body.style-instructional .thinking-space { background: #f0f9ff; border-style: solid; }
    body.style-softlesson .point-card, body.style-teaching .point-card { background: var(--panel); }
    @media (max-width: 900px) {
      .slide-inner { padding: 34px 28px 50px; }
      .image-split main { grid-template-columns: 1fr; }
      h1 { font-size: 44px; }
      .agenda-list, .concept-row { grid-template-columns: 1fr; width: 100%; }
      .point-card, .quiet-list li, .agenda-item p { font-size: 26px; }
    }
  </style>
  ${localStyleVariantCss()}
  ${customStyleCss(customStyle)}
</head>
<body class="${bodyClass}">
  ${slideHtml}
  <div class="nav"><button onclick="prevSlide()">Prev</button><button onclick="nextSlide()">Next</button></div>
  ${editorRuntime()}
</body>
</html>`;
}

function mergedIntegrationConfig(override = {}) {
  const merged = { ...integrationConfig, ...(override || {}) };
  if (!override?.apiKey && integrationConfig.apiKey) merged.apiKey = integrationConfig.apiKey;
  return merged;
}

const QUALITY_STYLE_PACKS = {
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
    layouts: ["broadcast-cover", "anchor-split", "lead-image", "bulletin-stack", "data-bulletin", "quote-lower-third", "recap"],
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
    layouts: ["blueprint-cover", "architecture-map", "process-flow", "metric-dashboard", "spec-comparison", "roadmap", "summary"],
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
    layouts: ["executive-cover", "key-message", "kpi-row", "comparison-table", "timeline", "recommendation", "summary"],
  },
};

const DEFAULT_QUALITY_LAYOUTS = ["cover-title", "agenda", "title-and-body", "two-column", "text-media-split", "comparison", "process", "summary"];

function qualityStylePack(style) {
  return QUALITY_STYLE_PACKS[style] || null;
}

function qualityLayoutRules(style) {
  return qualityStylePack(style)?.layouts || DEFAULT_QUALITY_LAYOUTS;
}

function qualityPromptContract(style, slideCount, source = "generation") {
  const pack = qualityStylePack(style);
  const name = pack?.styleName || stylePrompt(style);
  const layouts = qualityLayoutRules(style);
  return [
    "QUALITY CONTRACT",
    `Source: ${source}. Generate exactly ${slideCount} slides using one locked style pack: ${name}.`,
    `Allowed layout families only: ${layouts.join(", ")}.`,
    `Every slide section must include data-style-pack="${style}" and data-layout with one allowed family.`,
    "Use the AI as a planner and stylist, not as an unrestricted webpage author: one 16:9 canvas, one design system, stable editable HTML.",
    "Do not create landing pages, long scroll pages, mobile reflow, old slideshow scripts, fake navigation, or disconnected wrappers.",
    "Every slide must have one clear message, visible hierarchy, safe margins, high contrast, and no overflow.",
    "Use images intentionally: real uploaded images via data-image-slot; generated or web images only as meaningful visual assets with alt text and no broken src.",
    "Use layout modules instead of random card grids. Agenda/card layouts appear only when the content is naturally parallel.",
    "Before returning, silently audit: exact slide count, complete titles, horizontal text, image slots valid, no overlap, no tiny text, no low contrast.",
  ].join("\n");
}

function qualityStyleVariantCss() {
  return `
    body.style-news-broadcast .slide{background:#f7f7f4;color:#111827}body.style-news-broadcast .slide-inner{border-left:18px solid #c1121f;border-bottom:54px solid #26070a}body.style-news-broadcast h1{font-family:Arial Black,Impact,Arial,sans-serif;text-transform:uppercase;letter-spacing:0;color:#101828}body.style-news-broadcast .chapter,.style-news-broadcast .kicker{color:#c1121f;text-transform:uppercase;font-weight:900}body.style-news-broadcast .point-card{border-radius:0;border:2px solid #111827;background:#fff}
    body.style-tech-blueprint .slide{background:#071426;color:#e6f7ff}body.style-tech-blueprint .slide::before{content:"";position:absolute;inset:0;background-image:linear-gradient(rgba(53,210,255,.08) 1px,transparent 1px),linear-gradient(90deg,rgba(53,210,255,.08) 1px,transparent 1px);background-size:40px 40px;pointer-events:none}body.style-tech-blueprint .slide-inner{border:1px solid rgba(53,210,255,.42);background:rgba(7,20,38,.82)}body.style-tech-blueprint h1{color:#e6f7ff;font-family:Inter,Arial,sans-serif}body.style-tech-blueprint .chapter{color:#35d2ff}body.style-tech-blueprint .point-card{background:rgba(8,34,60,.86);border-color:rgba(53,210,255,.55);border-radius:0}
    body.style-corporate-clean .slide{background:#f8fafc;color:#1f2937}body.style-corporate-clean .slide-inner{background:#fff;border-top:8px solid #2f6fed}body.style-corporate-clean h1{color:#111827;font-family:Inter,Arial,sans-serif}body.style-corporate-clean .chapter{color:#2f6fed}body.style-corporate-clean .point-card{background:#f8fafc;border-color:#dbe3ef;border-radius:8px}`;
}

function stylePrompt(style, customStyle = null) {
  if (customStyle) {
    return `Custom style "${customStyle.name}": background ${customStyle.colors.background}, text ${customStyle.colors.text}, primary ${customStyle.colors.primary}, accent ${customStyle.colors.accent}, title font ${customStyle.typography.titleFont}, body font ${customStyle.typography.bodyFont}, layout preference ${customStyle.layout}. ${customStyle.promptAddon || customStyle.localRules || "Use this custom style consistently while preserving readability and images."}`;
  }
  const pack = qualityStylePack(style);
  if (pack) {
    return `${pack.styleName}: palette ${pack.colorPalette}; typography ${pack.typography}; layout ${pack.layoutPattern}; motifs ${pack.visualMotifs}; image policy ${pack.imagePolicy}.`;
  }
  const directions = {
    teaching: "Teaching Blue: modern education-tech interface, deep navy text, clear blue accent rules, calm lecture hierarchy, structured but not box-heavy.",
    softlesson: "Soft Lesson: warm white classroom canvas, gentle sky-blue accents, rounded light panels, soft hierarchy, calm workshop rhythm.",
    clean: "Clean: minimalist black/navy typography, precise alignment, very few components, no decoration except one thin accent line.",
    academic: "Academic: scholarly lecture style, serif title accent, muted ivory/white background, formal spacing, text treated as paragraphs or clean bullets.",
    instructional: "Instructional: classroom-ready teaching layout, step blocks only when content is actually procedural, practice pages leave thinking space.",
    minimal: "Minimal: one strong idea, huge whitespace, no card grids unless the slide is explicitly a comparison or list of parallel items.",
    contrast: "High Contrast: accessible dark/light blocks, bold hierarchy, large readable text, never low-contrast text over similar backgrounds.",
    healing: "Healing Hand-drawn: warm paper, soft pastel accents, gentle hand-drawn dividers, rounded shapes, readable handwritten-title mood.",
    doodle: "Doodle Sketch: playful marker/doodle style, sketchy borders, small hand-drawn arrows/stars, more energetic than Healing but still clean.",
    swiss: "Swiss Grid: strict asymmetric grid, left-aligned precision, strong scale contrast, blue grid/rule accents, no rounded cards.",
    editorial: "Editorial: magazine-like education feature, elegant serif display title, pull quotes, wide margins, editorial image/text rhythm.",
    vivid: "Vivid: bright modern edtech product energy, vivid accent blocks, crisp UI-like sections, controlled color pops without heavy gradients.",
  };
  return directions[style] || directions.teaching;
}

function styleImplementationGuide(style, customStyle = null) {
  if (customStyle) {
    return `Custom style implementation: use title font ${customStyle.typography.titleFont}, body font ${customStyle.typography.bodyFont}, background ${customStyle.colors.background}, text ${customStyle.colors.text}, primary ${customStyle.colors.primary}, accent ${customStyle.colors.accent}. Reuse this palette and typography on every page. For title pages, follow the saved title-page rules; for content pages, preserve the saved content-page rhythm.`;
  }
  const pack = qualityStylePack(style);
  if (pack) {
    return `Implementation: bind every slide to ${pack.styleName}. Use ${pack.backgroundStyle}. Components: ${pack.cardStyle}. Icons: ${pack.iconStyle}. Spacing: ${pack.spacingRules}.`;
  }
  const guides = {
    teaching: "Implementation: light background, navy headings, blue accent line under titles, 1-2 column lecture layouts, restrained panels, clear footer page number.",
    softlesson: "Implementation: warm white/very pale blue canvas, rounded light panels, soft blue dividers, relaxed spacing, no hard black blocks.",
    clean: "Implementation: white canvas, sharp typography, one accent line or dot per page, no decorative cards, no gradients, aligned content blocks.",
    academic: "Implementation: serif display headings, formal paragraph/list treatment, muted ivory or white background, thin rules, no playful icons.",
    instructional: "Implementation: stable title + main teaching block, steps only for procedures, practice pages with one prompt and open thinking space.",
    minimal: "Implementation: one strong headline plus one concise body group, large whitespace, no more than 2 visual elements per slide.",
    contrast: "Implementation: high-contrast sections, dark navy or white surfaces, bold headings, accessible color pairs only.",
    healing: "Implementation: warm paper background, pastel blue/green accents, gentle handwritten title mood, small sketch dividers, soft rounded shapes.",
    doodle: "Implementation: energetic hand-marker headings, sketchy borders/arrows/stars used sparingly, off-grid accents but aligned readable content.",
    swiss: "Implementation: strict grid, left-aligned blocks, large sans-serif title, blue rules/grid marks, rectangular modules, no rounded cards.",
    editorial: "Implementation: magazine editorial rhythm, large serif title, pull quote or deck-style kicker when useful, wide margins, elegant image crop zones.",
    vivid: "Implementation: bright blue/orange/cyan accents, modern product UI blocks, crisp rectangular highlights, energetic but uncluttered layout.",
  };
  return guides[style] || guides.teaching;
}

function styleHardRules(style) {
  const rules = {
    teaching: "Teaching Blue must use a clear education-tech hierarchy with white/pale-blue surfaces, navy text, restrained blue rules, and lecture-friendly title bands.",
    softlesson: "Soft Lesson must use warm white/mist-blue surfaces, gentle rounded light panels, soft dividers, relaxed spacing, and no hard black blocks.",
    clean: "Clean must be stark and minimal: white canvas, black/navy typography, one tiny accent rule/dot, almost no panels, no decorative gradients.",
    academic: "Academic must feel formal and scholarly: serif or serif-like display headings, ivory/white paper tone, thin rules, restrained muted gold/navy accents, no playful UI cards.",
    instructional: "Instructional must feel classroom-ready: objective/steps/practice structure, clear action labels, open space for exercises, and only procedural step blocks when content needs them.",
    minimal: "Minimal must use very large whitespace, one dominant idea per slide, sparse body text, no card grids, and no decorative motifs beyond one quiet accent.",
    contrast: "High Contrast must use bold dark/light block composition, large readable type, accessible contrast pairs, and strong section separation.",
    healing: "Healing Hand-drawn must use warm paper, pastel accents, soft sketch dividers, organic rounded shapes, and a gentle hand-drawn mood without clutter.",
    doodle: "Doodle Sketch must use marker-like headings, sketchy rectangular borders, small arrows/stars/squiggles, energetic accents, and still keep strict readability.",
    swiss: "Swiss Grid must use strict asymmetric grid, left alignment, large sans-serif scale contrast, rectangular modules, visible blue/black rules, and absolutely no rounded card-heavy teaching-blue layout.",
    editorial: "Editorial must use magazine rhythm: elegant serif display type, large headline/caption relationships, pull quotes or kickers, print-like warm white, and varied column compositions.",
    vivid: "Vivid must use bright blue/orange/cyan accents, confident rectangular color blocks, crisp product-like highlights, and energetic but uncluttered layouts.",
  };
  return rules[style] || rules.teaching;
}

function referencePackPrompt(referencePack = null) {
  const pack = referencePack && typeof referencePack === "object" ? referencePack : {};
  const files = (Array.isArray(pack.files) ? pack.files : [])
    .map((file) => `FILE ${cleanText(file.name || "reference")}:\n${String(file.text || file.summary || "").slice(0, 18000)}`)
    .join("\n\n")
    .slice(0, 48000);
  const outline = String(pack.outlineText || "").slice(0, 18000);
  const images = (Array.isArray(pack.images) ? pack.images : [])
    .map((image) => `IMAGE ${cleanText(image.name || "reference image")}: ${cleanText(image.caption || "No caption extracted yet.")} ${cleanText(image.usageHint || "Use as a real visual reference when relevant.")}`)
    .join("\n");
  if (!files && !outline && !images) return "No uploaded reference materials were provided.";
  return `UPLOADED REFERENCE MATERIALS\nTreat these materials as source evidence. Preserve factual wording, names, figures and ordering where applicable. Do not invent facts that contradict them.\n${outline ? `MARKDOWN/OUTLINE SOURCE:\n${outline}\n` : ""}${files ? `TEXT FILES:\n${files}\n` : ""}${images ? `IMAGE REFERENCES:\n${images}` : ""}`;
}

function multimodalUserContent(prompt, referencePack = null, config = null) {
  if (/deepseek/i.test(String(config?.model || "")) || config?.supportsVision === false) return prompt;
  const images = (Array.isArray(referencePack?.images) ? referencePack.images : [])
    .filter((image) => /^data:image\/(png|jpe?g|webp|gif);base64,/i.test(String(image.dataUrl || "")))
    .slice(0, 4);
  if (!images.length) return prompt;
  return [
    { type: "text", text: prompt },
    ...images.map((image) => ({ type: "image_url", image_url: { url: image.dataUrl } })),
  ];
}

function deckPrompt(slides, style, customStyle = null, planContext = null) {
  const styleProfile = normalizeStyleProfile(
    customStyle?.styleProfile || slides.find((slide) => slide?.styleProfile)?.styleProfile,
    style,
    customStyle,
  );
  const qualityContract = qualityPromptContract(style, slides.length, "html-generation");
  const allowedLayouts = qualityLayoutRules(style);
  const contextRules = Array.isArray(planContext?.layoutRules)
    ? planContext.layoutRules.map(cleanText).filter(Boolean).slice(0, 12)
    : [];
  const compactSlides = slides.map((slide) => ({
    page: slide.page,
    title: slide.title,
    body: slide.body.slice(0, 20),
    layout: slide.layout || slide.type || "",
    visualFocus: slide.visualFocus || "",
    speakerNote: slide.speakerNote || slide.speakerNoteOptional || "",
    imageCount: slide.images.length,
    hasImages: slide.images.length > 0,
    styleProfile: slide.styleProfile || styleProfile,
  }));
  const openSourceContract = planContext?.slides?.length
    ? `\nOpen-source plan-first generation contract:\n${buildPagePrompt(planContext, { style, referencePack: planContext.referencePack })}`
    : "";
  return `Generate a complete standalone editable HTML slide deck from this slide JSON.

Style direction:
${stylePrompt(style, customStyle)}
Style implementation guide:
${styleImplementationGuide(style, customStyle)}
${qualityContract}
Allowed layout families for this request: ${allowedLayouts.join(", ")}
${customStyle ? `Custom style local rule summary: ${customStyle.localRules || "Use the saved custom style parameters."}` : ""}
Structured style profile (binding visual contract, not optional advice):
${styleProfilePromptLines(styleProfile)}
${openSourceContract}

Selected style hard rule:
${styleHardRules(style)}

Planning context:
- Deck title: ${cleanText(planContext?.title || "")}
- Deck goal: ${cleanText(planContext?.goal || "")}
- Deck tone: ${cleanText(planContext?.tone || "")}
${contextRules.length ? `- Additional binding rules:\n${contextRules.map((rule) => `  * ${rule}`).join("\n")}` : ""}

${referencePackPrompt(planContext?.referencePack)}

Image policy:
- Chat Creation does not automatically search or generate images.
- Do not create fake image frames, broken image icons, "Generated fallback SVG" badges, asset-* labels, or placeholder text that exposes implementation details.
- Use CSS/SVG diagrams, icon groups, process maps, charts, typographic compositions, rules, grids, and shape systems as visual support unless a real image source is present in the input.

Quality target:
- The result must look at least as stable and readable as a careful deterministic local-rule layout, while expressing the selected style consistently.
- Treat the selected style as a visual contract, not a vague mood. Use one coherent palette, typography system, spacing rhythm, media treatment, and component language across the whole deck.
- Apply the structured style profile as a hard constraint. Do not only change colors; typography, layout rhythm, visual motifs, image policy, card style, background treatment and spacing must all visibly reflect it.
- If style is not "teaching", the deck must not look like Teaching Blue. Change palette, typography, layout rhythm, motifs, background treatment, and component geometry visibly.
- visualFocus fields must become concrete slide regions, CSS/SVG diagrams, callouts, charts, icon groups, or layout decisions. Do not leave them as text-only notes and do not pretend an unavailable image exists.

Non-negotiable output rules:
- Return ONLY complete HTML code. No markdown explanation.
- This must be the AI-designed deck itself; do not ask another system to apply a local template.
- Generate exactly ${slides.length} slide sections, one for every input slide, in the same order.
- Every slide section must include data-slide-page="original page number".
- Every slide section must include data-style-pack="${style}" and data-layout using one allowed layout family.
- Every slide must use the same 16:9 canvas size. Use section dimensions such as width:100vw; height:100vh; box-sizing:border-box, with consistent safe margins.
- The slide canvas must remain 16:9 on every device. Do not use responsive/mobile media queries to change slide layout. If the screen is small, scale the whole 16:9 stage; never reflow it into a phone-shaped page.
- Use one global CSS design system: CSS variables for background/text/primary/accent/panel, one title font, one body font, one spacing scale, one media treatment. Apply it consistently to every slide.
- Slide titles must be visually dominant and complete phrases. Cover/title slides must center the title group both horizontally and vertically. Normal content slide titles should sit in a stable title band with enough top margin, not glued to the edge.
- Use a clean, elegant, modern education/workshop layout: generous whitespace, simple alignment, readable hierarchy, and no crowded corners. Each page should have one clear visual focus.
- Preserve the source content's intent and rough layout type. Do not convert every slide into an outline, numbered list, or card grid.
- Choose slide layouts conservatively:
  * cover/title slide: centered title group, optional subtitle/author.
  * agenda/outline slide: numbered or tiled list only when the title is Agenda, Outline, Contents, Schedule, Syllabus, Today, or Overview.
  * text-only slide: use centered content width or balanced two-column layout; fill the canvas gracefully, not just the left side.
  * image slide: use a stable text/media split or balanced image row; images never dominate unless the original slide is image-dominant.
  * comparison/list slide: use 2-4 light cards only when items are parallel; do not make every sentence a card.
  * exercise/answer slide: leave open space for class discussion; do not fill the page with explanations.
- Only make agenda/outline numbered pages when the original slide title explicitly says Agenda, Outline, Contents, Schedule, Syllabus, Today, or Overview.
- Do not use img tags unless a real source URL/data URI is present in the input. Never use empty src, broken src, asset-slide-* text, or generated fallback image labels.
- Never create placeholder pages titled "Slide 1", "Slide 2", etc.
- Never use a single isolated word, a single letter, XML markup, or a broken word fragment as a slide title. If the extracted title looks broken, use the nearest complete phrase from the slide content.
- Keep words intact. Do not split words across lines by letters, do not create one-letter headings, and do not turn normal sentences into one-word bullet fragments.
- Never use vertical writing, one-character-per-line text, ultra-narrow text columns, CSS writing-mode vertical, word-break: break-all, or overflow-wrap:anywhere for normal text.
- Do not invent repeated labels such as "Chapter 01", "Chapter 02", unless the original slide explicitly contains that chapter text.
- One core idea per slide. Keep pages clean, ordered, airy, modern education/workshop style.
- Avoid stacked gradients, heavy shadows, complex textures, excessive decoration, nested cards, and packed grids.
- Body text must be greater than 30pt. Slide titles must be greater than 45pt and should usually be 52-72pt.
- For dense text, preserve complete sentences and reduce layout complexity: use two columns, shorter line length, and 30-34pt body text. Do not split a sentence into separate one-word bullets.
- Text and background colors must have strong visible contrast. Never use white/light text on cream, pale, or white backgrounds; never use dark text on dark backgrounds.
- No text may overflow the viewport or its box. Do not use scrollable text boxes.
- If a slide has images, reserve clear visual areas for the original PPT images using only empty placeholders. Use <figure data-image-slot="page-number"></figure> for one image, or <figure data-image-slot="page-number-a"></figure>, <figure data-image-slot="page-number-b"></figure> for multiple images. Never create fake image paths, empty <img src=""> tags, or visible labels such as "page-8a".
- If a slide has preparedVisualAssets, place each one as <figure class="media-box visual-asset" data-visual-asset-id="asset-id"></figure> in the intended visual area. Do not add src yourself; the platform will hydrate the real image after generation.
- Never invent external image URLs. Use only prepared visual asset IDs, original PPT data-image-slot placeholders, or designed CSS/SVG modules.
- If visualFocus asks for an image, example, chart, or diagram but no original image exists, create a designed placeholder region or CSS/SVG visual module. Never show a broken image icon.
- Image areas must be proportional to the amount of text. When text is present, image groups should usually occupy 26-40% of the slide width and max 38-44vh total height; multiple images should be smaller, aligned as a balanced row/column, and must never overlap text, footer, or navigation.
- Do not create oversized navigation controls. The platform will inject small working Prev/Next controls automatically.
- Return one canonical editable deck only: <div id="deckStage" class="deck-stage" data-html-deck-editor-stage="preserve" width="1280" height="720"> with every slide as a direct <section class="slide"> child.
- Add data-style-pack="${style}" to the body or deckStage. Do not omit the required data-layout attributes.
- Do not create a separate .presentation-container wrapper, old .navigation controls, currentSlide/updateSlide/nextSlide/prevSlide scripts, or any script that toggles display on .slide elements. The platform editor owns slide navigation.
- Include window.toggleEdit(force) and window.exportEditedHtml(mode) so the platform editor can work.
- Use CSS that keeps all sections visible and self-contained; no content should be clipped or hidden by default.
- Include a final CSS safety layer inside the HTML that prevents overflow: sections overflow:hidden; text boxes max-width:90%; media max-height constraints; no absolute positioning for main text unless required.
- Do not write @media rules that turn split layouts into a single column on small screens. Keep the same 16:9 composition and let the platform scale the stage.
- Before returning, silently audit the HTML: exact slide count, all titles are complete phrases, all body text is horizontal, all images use data-image-slot placeholders, no scrollable text boxes, no low contrast, no content outside the 16:9 canvas.

Slide JSON:
${JSON.stringify({ style, customStyle, styleProfile, slideCount: slides.length, slides: compactSlides }).slice(0, 65000)}`;
}

function integrationHeaders(config) {
  const headers = {
    "content-type": "application/json",
    [config.apiKeyHeader || "Authorization"]: `${config.apiKeyPrefix ?? "Bearer "}${config.apiKey}`,
  };
  for (const line of String(config.customHeaders || "").split(/\r?\n/)) {
    const [key, ...rest] = line.split(":");
    if (key && rest.length) headers[key.trim()] = rest.join(":").trim();
  }
  return headers;
}

async function readApiResponse(response) {
  const text = await response.text();
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch {
    return { text, message: text.replace(/\s+/g, " ").trim() };
  }
}

function isRecoverableAiError(message) {
  return /timeout|timed out|aborted|operation was aborted|insufficient balance|insufficient_balance|insufficient quota|insufficient_quota|quota|billing|余额|欠费|限额|rate limit|too many requests/i.test(String(message || ""));
}

function extractTextFromApiData(data) {
  return data.choices?.[0]?.message?.content
    || data.choices?.[0]?.text
    || data.output_text
    || data.output?.[0]?.content?.[0]?.text
    || data.output?.text
    || data.answer
    || data.data?.answer
    || data.data?.outputs?.html
    || data.data?.outputs?.text
    || data.data?.outputs?.result
    || data.html
    || data.text
    || data.result
    || "";
}

function extractJsonBlock(text) {
  const raw = String(text || "").trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
  const start = raw.indexOf("{");
  if (start < 0) return raw;
  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let index = start; index < raw.length; index += 1) {
    const char = raw[index];
    if (escaped) {
      escaped = false;
      continue;
    }
    if (char === "\\") {
      escaped = true;
      continue;
    }
    if (char === "\"") {
      inString = !inString;
      continue;
    }
    if (inString) continue;
    if (char === "{") depth += 1;
    if (char === "}") {
      depth -= 1;
      if (depth === 0) return raw.slice(start, index + 1);
    }
  }
  return raw.slice(start);
}

function repairJsonBlock(text) {
  let output = extractJsonBlock(text).replace(/,\s*([}\]])/g, "$1").trim();
  if (!output) return output;
  let inString = false;
  let escaped = false;
  const stack = [];
  for (const char of output) {
    if (escaped) {
      escaped = false;
      continue;
    }
    if (char === "\\") {
      escaped = true;
      continue;
    }
    if (char === "\"") {
      inString = !inString;
      continue;
    }
    if (inString) continue;
    if (char === "{") stack.push("}");
    if (char === "[") stack.push("]");
    if ((char === "}" || char === "]") && stack.at(-1) === char) stack.pop();
  }
  if (inString) output += "\"";
  while (stack.length) output += stack.pop();
  return output;
}

function parseAiJson(text) {
  const raw = String(text || "").replace(/^\uFEFF/, "").trim();
  const unfenced = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
  const relaxed = (value) => String(value || "")
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, " ")
    .replace(/,\s*([}\]])/g, "$1")
    .trim();
  const candidates = [raw, unfenced, extractJsonBlock(unfenced), repairJsonBlock(unfenced)]
    .flatMap((candidate) => candidate ? [candidate, relaxed(candidate)] : [])
    .filter(Boolean);
  for (const candidate of candidates) {
    try {
      return JSON.parse(candidate);
    } catch {
      // Try the next candidate.
    }
  }
  throw new Error("AI did not return valid JSON.");
}

function styleProfilePreset(style, customStyle = null) {
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
      iconStyle: customStyle.iconStyle || "match the imported icon or marker style",
      spacingRules: customStyle.spacingRules || "follow imported spacing and safe margins",
    };
  }
  const pack = qualityStylePack(style);
  if (pack) {
    return {
      styleName: pack.styleName,
      colorPalette: pack.colorPalette,
      typography: pack.typography,
      layoutPattern: pack.layoutPattern,
      visualMotifs: pack.visualMotifs,
      imagePolicy: pack.imagePolicy,
      cardStyle: pack.cardStyle,
      backgroundStyle: pack.backgroundStyle,
      iconStyle: pack.iconStyle,
      spacingRules: pack.spacingRules,
    };
  }
  const presets = {
    banana: ["Banana Paper", "warm paper #fffdf5, ink navy #27344d, banana yellow #ffd63b, orange #df741c, cool cyan #62cde1", "friendly bold sans title, highly readable sans body", "centered cover, short assertion titles, airy two-column evidence pages", "yellow highlight bars, orange section labels, cyan visual modules and thin rules"],
    teaching: ["Teaching Blue", "white/pale blue, navy text, blue accents", "bold sans title, readable sans body", "centered cover, title bands, balanced lecture columns", "thin blue dividers and lesson markers"],
    softlesson: ["Soft Lesson", "warm white, mist blue, slate text", "rounded calm sans", "relaxed airy teaching blocks", "soft dividers and pill labels"],
    clean: ["Clean", "white, navy/black, one blue accent", "modern sans hierarchy", "minimal aligned content blocks", "single rule or dot"],
    academic: ["Academic", "ivory/white, dark navy, muted gold", "serif display title, formal body", "formal text/figure layout with thin rules", "academic rules and evidence panels"],
    instructional: ["Instructional", "white, navy, blue/green accents", "clear action-oriented sans", "goals, steps, practice and summary layouts", "step markers only for real procedures"],
    minimal: ["Minimal", "white, deep navy, quiet accent", "large sparse sans", "one headline and one content group", "almost no decoration"],
    contrast: ["High Contrast", "dark navy/white with bright blue", "bold large sans", "strong blocks and accessible contrast", "bold section bands"],
    healing: ["Healing Hand-drawn", "warm paper, pastel blue/green, soft brown", "gentle handwritten title, rounded body", "calm organic layout on stable alignment", "soft sketch dividers and calming shapes"],
    doodle: ["Doodle Sketch", "cream/white, black marker, vivid blue pops", "marker heading, clean body", "playful sketch accents around stable grid", "arrows, stars, squiggles, taped notes"],
    swiss: ["Swiss Grid", "white, navy/black, international blue", "strict sans with scale contrast", "strong asymmetric grid and rectangular modules", "grid lines and numbered markers"],
    editorial: ["Editorial", "warm white, ink navy, muted accent", "magazine serif title, elegant sans body", "large headline, columns, pull quote rhythm", "kickers, pull quotes, editorial rules"],
    vivid: ["Vivid", "bright blue/cyan/orange accents on clean base", "bold modern display, clean body", "large color blocks and product-like sections", "bright blocks and crisp highlights"],
  };
  const [styleName, colorPalette, typography, layoutPattern, visualMotifs] = presets[style] || presets.teaching;
  return {
    styleName,
    colorPalette,
    typography,
    layoutPattern,
    visualMotifs,
    imagePolicy: "use proportional media zones; if no asset exists, create designed placeholder/diagram modules instead of broken images",
    cardStyle: style === "swiss" ? "rectangular modules, no rounded cards" : "few purposeful cards only when grouping parallel items",
    backgroundStyle: style === "healing" || style === "doodle" ? "paper-like clean surface without busy texture" : "clean high-contrast surface",
    iconStyle: style === "healing" || style === "doodle" ? "small hand-drawn markers" : "minimal functional icons",
    spacingRules: "keep safe margins, avoid crowded corners, preserve 16:9 composition",
  };
}

function normalizeStyleProfile(profile, style = "teaching", customStyle = null) {
  const preset = styleProfilePreset(style, customStyle);
  const input = profile && typeof profile === "object" ? profile : {};
  const output = { ...preset };
  for (const [key, value] of Object.entries(input)) {
    if (value === undefined || value === null || value === "") continue;
    output[key] = typeof value === "object" && !Array.isArray(value)
      ? Object.values(value).filter(Boolean).join(", ")
      : cleanText(value);
  }
  return output;
}

function styleProfilePromptLines(profile) {
  return JSON.stringify(profile, null, 2);
}

function normalizeVisualAssetPlan(plan, index = 0) {
  const input = plan && typeof plan === "object" ? plan : {};
  return {
    needImage: Boolean(input.needImage || input.need_image || index === 0),
    priority: cleanText(input.priority || (index === 0 ? "high" : "medium")),
    purpose: cleanText(input.purpose || input.visualPurpose || ""),
    placement: cleanText(input.placement || "single image panel or designed visual module"),
    webQuery: cleanText(input.webQuery || input.web_query || input.query || ""),
    aiPrompt: cleanText(input.aiPrompt || input.ai_prompt || input.prompt || ""),
    fallback: cleanText(input.fallback || "designed SVG or CSS visual module"),
    strategy: cleanText(input.strategy || ""),
  };
}

function normalizeVisualAsset(asset) {
  if (!asset || typeof asset !== "object") return null;
  const src = String(asset.src || "");
  if (!src.startsWith("data:image/")) return null;
  return {
    id: cleanText(asset.id || `asset-${Date.now().toString(36)}`),
    targetSlide: Math.max(1, Number(asset.targetSlide || asset.page || 1)),
    type: cleanText(asset.type || "generated"),
    src,
    alt: cleanText(asset.alt || "Presentation visual"),
    sourceUrl: cleanText(asset.sourceUrl || asset.source_url || ""),
    credit: cleanText(asset.credit || ""),
    placement: cleanText(asset.placement || "image panel"),
  };
}

function normalizeVisualAssets(assets) {
  return (Array.isArray(assets) ? assets : []).map(normalizeVisualAsset).filter(Boolean).slice(0, 8);
}

function normalizeTopicPlan(plan, fallback = {}) {
  const input = plan && typeof plan === "object" ? plan : {};
  const style = cleanText(input.style || fallback.style || "teaching") || "teaching";
  const styleProfile = normalizeStyleProfile(input.styleProfile || input.style_profile || fallback.styleProfile || fallback.style_profile, style, fallback.customStyle || input.customStyle);
  const allowedLayouts = qualityLayoutRules(style);
  const rawSlides = Array.isArray(input.slides) ? input.slides : [];
  const slides = rawSlides.map((slide, index) => {
    const rawBody = Array.isArray(slide?.body) ? slide.body : (slide?.bullets || slide?.body || "");
    const body = (Array.isArray(rawBody) ? rawBody : String(rawBody).split(/\n+/))
      .map(cleanText).filter(isUsefulText).slice(0, 8);
    const takeaway = cleanText(slide?.takeaway || slide?.conclusion || "");
    const orderedBody = takeaway && !body.some((item) => item === takeaway) ? [takeaway, ...body] : body;
    const titleBody = slideTitleAndBody([slide?.title || "", ...orderedBody]);
    return {
      page: index + 1,
      title: titleBody.title || `Key Idea ${index + 1}`,
      body: titleBody.body.length ? titleBody.body : body,
      takeaway: cleanText(titleBody.body[0] || takeaway || ""),
      layout: allowedLayouts.includes(cleanText(slide?.layout || slide?.layoutSpec || ""))
        ? cleanText(slide?.layout || slide?.layoutSpec || "")
        : allowedLayouts[index % Math.max(1, allowedLayouts.length)],
      visualFocus: cleanText(slide?.visualFocus || slide?.visualSpec || slide?.visual || slide?.visualSuggestion || ""),
      layoutSpec: cleanText(slide?.layoutSpec || slide?.layout || ""),
      speakerNote: cleanText(slide?.speakerNote || slide?.speakerNoteOptional || ""),
      images: [],
      styleProfile,
    };
  }).filter((slide) => slide.title || slide.body.length);

  if (!slides.length) {
    throw new Error("The AI plan did not include usable slides.");
  }

  const rawRules = Array.isArray(input.layoutRules)
    ? input.layoutRules.map(cleanText).filter(Boolean).slice(0, 8)
    : [];
  const profileRules = [
    `Allowed layout families: ${allowedLayouts.join(", ")}.`,
    `Style profile is binding: ${styleProfile.styleName}.`,
    `Layout pattern: ${styleProfile.layoutPattern}.`,
    `Visual motifs: ${styleProfile.visualMotifs}.`,
    "Use concrete CSS/SVG layout modules, typography, rules, shapes, icons, charts or diagrams; do not rely on generated/searched images.",
    "Never output broken image placeholders, fallback image labels, or asset-* text.",
  ];
  return {
    title: cleanText(input.title || fallback.topic || "AI Generated Presentation"),
    subtitle: cleanText(input.subtitle || ""),
    audience: cleanText(input.audience || fallback.audience || ""),
    goal: cleanText(input.goal || fallback.requirements || ""),
    tone: cleanText(input.tone || "clear, modern, educational"),
    style,
    styleProfile,
    palette: input.palette && typeof input.palette === "object" ? input.palette : { stylePalette: styleProfile.colorPalette },
    typography: input.typography && typeof input.typography === "object" ? input.typography : { styleTypography: styleProfile.typography },
    layoutRules: [...allowedLayouts, ...rawRules, ...profileRules].filter(Boolean).slice(0, 16),
    slides,
  };
}

function topicPlanningPrompt(args) {
  const style = args.style || "teaching";
  const styleProfile = normalizeStyleProfile(args.styleProfile || args.customStyle?.styleProfile, style, args.customStyle || null);
  const slideCount = Math.max(3, Math.min(30, Number(args.slideCount || 8)));
  const allowedLayouts = qualityLayoutRules(style);
  const outputLanguage = args.outputLanguage === "zh" ? "Simplified Chinese" : "English";
  return `You are an expert presentation planner for PPT HTML Studio.

Create a complete slide-deck plan from the user's topic and requirements.
Return STRICT JSON only. Do not include markdown.

Topic:
${args.topic}

Audience:
${args.audience || "general audience"}

User requirements:
${args.requirements || "No extra requirements."}

${referencePackPrompt(args.referencePack)}

Style:
${stylePrompt(style, args.customStyle || null)}

Structured style profile (binding visual contract, not optional advice):
${styleProfilePromptLines(styleProfile)}

${args.qualityContract || qualityPromptContract(style, slideCount, "topic-planning")}
Allowed layout families: ${allowedLayouts.join(", ")}

Required slide count: ${slideCount}
Output language for generated deck content: ${outputLanguage}

JSON schema:
{
  "title": "complete deck title",
  "subtitle": "optional subtitle",
  "audience": "target audience",
  "goal": "what this deck helps the audience understand or do",
  "tone": "visual and writing tone",
  "style": "${style}",
  "styleProfile": {
    "styleName": "clear name of the deck style",
    "colorPalette": "specific palette and contrast rules",
    "typography": "title/body font direction and hierarchy",
    "layoutPattern": "grid, columns, visual balance and slide composition",
    "visualMotifs": "concrete repeatable visual motifs",
    "imagePolicy": "how to use, place or replace images",
    "cardStyle": "card/border style or no-card rule",
    "backgroundStyle": "background treatment",
    "iconStyle": "icon/diagram direction",
    "spacingRules": "safe margin and spacing rules"
  },
  "palette": {
    "background": "#hex",
    "text": "#hex",
    "primary": "#hex",
    "accent": "#hex",
    "panel": "#hex"
  },
  "typography": {
    "title": "font direction",
    "body": "font direction"
  },
  "layoutRules": [
    "short concrete layout rule"
  ],
  "slides": [
    {
      "title": "complete phrase, never a single word unless it is a proper section title",
      "layout": "one of: ${allowedLayouts.join(" | ")}",
      "visualFocus": "one core visual focus for this slide",
      "takeaway": "one complete conclusion sentence for this page",
      "bullets": ["supporting evidence or example"],
      "visualSpec": "concrete chart, diagram, image zone, comparison, process, or typographic module",
      "layoutSpec": "why this layout best supports the page message",
      "speakerNote": "optional presenter note"
    }
  ]
}

Planning rules:
- The first slide must be a centered cover/title slide.
- Include an agenda slide only when it helps the deck. Do not force a table of contents for very short decks.
- Each slide expresses one core idea.
- Do not split normal sentences into one-word fragments.
- Keep body points short but complete.
- For every content page, the first point must be the takeaway: a complete conclusion sentence, not a topic label. Functional pages may use a short descriptive point.
- Keep page text, visual specification and layout specification separate. Page text is rendered; visual/layout specs guide composition and must not appear as UI chatter.
- Plan layouts with clear 16:9 safe margins, large centered title pages, readable text, and no overflow.
- Every planned slide must choose one allowed layout family. Do not invent new layout names.
- Choose palette colors with strong contrast between text and background.
- Match the selected style; different styles should produce visibly different palette, typography and layout rules.
- Treat the structured style profile as a hard constraint, not a suggestion.
- If the user asks for a style detail, preserve or update styleProfile so the final HTML can implement it.
- Visual suggestions must name concrete renderable modules: image zone, diagram, chart, callout, timeline, comparison block, or designed placeholder.
- If no real image asset is available, plan a designed placeholder, CSS/SVG diagram, or visual module; never plan a broken image icon.`;
}

async function callAiTextApi(prompt, config, system = "Return the requested content only.", referencePack = null) {
  const endpoint = normalizeChatEndpoint(config.endpoint);
  const thinking = config.thinking || { type: "disabled" };
  const response = await fetch(endpoint, {
    method: "POST",
    headers: integrationHeaders(config),
    body: JSON.stringify({
      model: config.model || "gpt-4.1-mini",
      thinking,
      messages: [
        { role: "system", content: system },
        { role: "user", content: multimodalUserContent(prompt, referencePack, config) },
      ],
      temperature: 0.18,
      max_tokens: Number(config.maxTokens || 8000),
    }),
  });
  const data = await readApiResponse(response);
  if (!response.ok) throw new Error(`Provider ${response.status} at ${endpoint}: ${data.message || data.error?.message || "request failed"}`);
  return extractTextFromApiData(data);
}

async function callWorkflowTextApi(prompt, config, extra = {}) {
  const endpoint = String(config.endpoint || "").trim();
  const isDify = config.workflowPayload === "dify" || /\/v1\/workflows\/run|\/workflows\/run/i.test(endpoint);
  const body = isDify
    ? { inputs: { prompt, ...extra }, response_mode: "blocking", user: "ppt-html-studio" }
    : config.workflowPayload === "input"
      ? { input: { prompt, ...extra } }
      : { prompt, ...extra };
  const response = await fetch(endpoint, {
    method: "POST",
    headers: integrationHeaders(config),
    body: JSON.stringify(body),
  });
  const data = await readApiResponse(response);
  if (!response.ok) throw new Error(data.message || data.error?.message || `Workflow HTTP ${response.status}`);
  return extractTextFromApiData(data);
}

function chatEditPatchPrompt(payload = {}) {
  const retryNote = payload.retryReason ? `\nPrevious attempt failed because: ${cleanText(payload.retryReason)}\nReturn one complete valid JSON object now.` : "";
  const scopeLabel = {
    current_slide: "current slide only",
    selected_element: "selected element only",
    deck: "whole deck",
  }[payload.scope] || "current slide only";
  const style = payload.style || "clean";
  const context = payload.context || {};
  return `You are editing an existing editable 16:9 HTML slide deck.

Return exactly one strict JSON object. Do not return markdown fences. Do not return explanation text. Do not return HTML. Do not rewrite the whole page.

User instruction:
${payload.instruction || ""}
${retryNote}

Edit scope:
${scopeLabel}

Selected style:
${style}

Current slide:
${context.currentSlide || 1} / ${context.slideCount || 1}

Current slide stable ID:
${String(context.currentSlideId || "")}

Current slide text:
${String(context.currentSlideText || "").slice(0, 3200)}

Selected element text:
${String(context.selectedText || "").slice(0, 1200)}

Selected element stable ID:
${String(context.selectedId || "")}

Selected element HTML:
${String(context.selectedHtml || "").slice(0, 2200)}

Current slide HTML excerpt:
${String(context.currentSlideHtml || "").slice(0, 7000)}

Patch contract:
{
  "summary": "short user-facing summary",
  "scope": "current_slide | selected_element | deck",
  "operations": [
    {
      "type": "set_text | set_style | resize_image | move_image | adjust_images | fix_overflow | split_slide | replace_style",
      "id": "exact data-ppt-id from the supplied HTML/context when targeting one element",
      "target": "title | selected | current_slide | deck | largest_image | all_images",
      "value": "new text when type is set_text",
      "styles": {
        "color": "#hex",
        "backgroundColor": "#hex",
        "fontSize": "48px",
        "fontFamily": "Arial, sans-serif",
        "textAlign": "center",
        "width": "38%",
        "height": "auto",
        "left": "52%",
        "top": "26%",
        "maxWidth": "46%",
        "maxHeight": "54%"
      },
      "newSlideTitle": "optional title for split_slide"
    }
  ]
}

Rules:
- Return 1 to 8 operations only.
- Never output complete HTML or Markdown.
- Never wrap JSON in \`\`\`json fences.
- Ensure the final JSON is complete and parseable. Do not truncate strings.
- If uncertain, return a small valid patch with one safe operation.
- Prefer the exact stable ID shown in the context for element-level edits. Never invent an ID that is not present in the supplied context.
- For title edits, use target "title" and keep titles as complete phrases.
- For selected element edits, use target "selected"; if no selected element is visible in context, edit current slide instead.
- For images, prefer maxWidth <= 46%, maxHeight <= 54%, object containment, and avoid overlap.
- For overflow, use fix_overflow first; use split_slide if a slide is clearly too crowded.
- For color changes, keep high contrast between text and background.
- For replace_style, include deck-level palette/font styles but preserve all slide content.`;
}

function normalizeChatPatch(raw, payload = {}) {
  const typeAliases = {
    update_text: "set_text",
    update_style: "set_style",
    modify_title: "set_text",
    change_colors: "set_style",
    split_crowded_slide: "split_slide",
  };
  const allowedTypes = new Set(["set_text", "set_style", "resize_image", "move_image", "adjust_images", "fix_overflow", "split_slide", "replace_style"]);
  const allowedTargets = new Set(["title", "selected", "selected_element", "current_slide", "deck", "largest_image", "all_images", "slide"]);
  const allowedStyles = new Set(["color", "background", "backgroundColor", "borderColor", "fontSize", "fontFamily", "fontWeight", "fontStyle", "textDecoration", "textAlign", "lineHeight", "width", "height", "maxWidth", "maxHeight", "left", "top", "display", "gridTemplateColumns", "gap", "padding", "margin", "objectFit"]);
  const source = raw && typeof raw === "object" ? raw : {};
  const operations = (Array.isArray(source.operations) ? source.operations : [])
    .map((operation) => {
      const rawType = String(operation?.type || "").trim();
      const type = typeAliases[rawType] || rawType;
      if (!allowedTypes.has(type)) return null;
      const target = allowedTargets.has(String(operation.target || "")) ? String(operation.target) : (
        type.includes("image") ? "largest_image" : payload.scope === "selected_element" ? "selected" : "current_slide"
      );
      const styles = {};
      Object.entries(operation.styles || operation.palette || {}).forEach(([key, value]) => {
        if (allowedStyles.has(key) && value !== undefined && value !== null && typeof value !== "object") styles[key] = String(value);
      });
      return {
        type,
        id: operation.id !== undefined ? String(operation.id).trim().slice(0, 120) : undefined,
        target,
        value: operation.value !== undefined ? String(operation.value) : undefined,
        text: operation.text !== undefined ? String(operation.text) : undefined,
        styles,
        width: operation.width !== undefined ? String(operation.width) : undefined,
        height: operation.height !== undefined ? String(operation.height) : undefined,
        left: operation.left !== undefined ? String(operation.left) : undefined,
        top: operation.top !== undefined ? String(operation.top) : undefined,
        maxWidth: operation.maxWidth !== undefined ? String(operation.maxWidth) : undefined,
        maxHeight: operation.maxHeight !== undefined ? String(operation.maxHeight) : undefined,
        newSlideTitle: operation.newSlideTitle !== undefined ? String(operation.newSlideTitle) : undefined,
      };
    })
    .filter(Boolean)
    .slice(0, 8);
  if (!operations.length) {
    const instruction = String(payload.instruction || "").toLowerCase();
    if (/split|拆分|拥挤|太满|crowded/.test(instruction)) operations.push({ type: "split_slide", target: "current_slide", styles: {} });
    else if (/image|图片|图像|照片|photo|resize|move|调整|放大|缩小/.test(instruction)) operations.push({ type: "adjust_images", target: payload.scope === "selected_element" ? "selected" : "largest_image", styles: { maxWidth: "42%", maxHeight: "50%", objectFit: "contain" } });
    else if (/contrast|对比|看不清|颜色|color|配色/.test(instruction)) operations.push({ type: "set_style", target: payload.scope === "deck" ? "deck" : "current_slide", styles: { color: "#10203f", backgroundColor: "#ffffff" } });
    else if (/title|标题|居中|center/.test(instruction)) operations.push({ type: "set_style", target: "title", styles: { textAlign: "center" } });
    else operations.push({ type: "fix_overflow", target: payload.scope === "deck" ? "deck" : "current_slide", styles: {} });
  }
  return {
    summary: cleanText(source.summary || "Patch ready."),
    scope: payload.scope || source.scope || "current_slide",
    operations,
  };
}

async function createChatEditPatch(payload) {
  const requestConfig = mergedIntegrationConfig(payload.integration);
  if (!requestConfig || requestConfig.mode === LOCAL_MODE) throw new Error("Chat Edit requires an AI service. Configure an API key first.");
  if (!requestConfig.apiKey) throw new Error("API key is required for Chat Edit.");
  if (!requestConfig.endpoint) throw new Error("API endpoint is required for Chat Edit.");
  let parsed;
  const requestPatch = async (retryReason = "") => {
    const prompt = chatEditPatchPrompt({ ...payload, retryReason });
    const config = {
      ...requestConfig,
      maxTokens: Math.max(3200, Number(requestConfig.maxTokens || 0) || 0),
      timeoutSec: Math.max(180, Number(requestConfig.timeoutSec || 0) || 0),
    };
    const text = requestConfig.mode === "workflow_api"
      ? await callWorkflowTextApi(prompt, config, { task: "chat_edit_patch", scope: payload.scope || "current_slide", retryReason })
      : await callAiTextApi(prompt, config, "You are a patch generator for an HTML slide editor. Return exactly one complete strict JSON object only.");
    return parseAiJson(text);
  };
  try {
    parsed = await requestPatch();
  } catch (firstError) {
    try {
      parsed = await requestPatch(`Invalid or incomplete JSON: ${String(firstError.message || firstError)}`);
    } catch (retryError) {
      return normalizeChatPatch({
        summary: "Used a safe local fallback because the AI patch JSON was invalid.",
        operations: [],
      }, payload);
    }
  }
  return normalizeChatPatch(parsed, payload);
}

async function handleChatEditPatch(request) {
  const payload = await readJson(request);
  const patch = await createChatEditPatch(payload);
  return json({ patch });
}

function outlinePlanFromText(text, payload = {}) {
  const lines = String(text || "").replace(/\uFEFF/g, "").replace(/\r/g, "").split("\n");
  const pages = [];
  let current = null;
  const commit = () => {
    if (!current) return;
    current.body = current.body.filter(Boolean).slice(0, 8);
    current.takeaway = current.body[0] || "";
    if (current.title || current.body.length) pages.push({ ...current, page: pages.length + 1 });
    current = null;
  };
  for (const raw of lines) {
    const line = raw.trim();
    if (!line || /^```/.test(line) || /^---+$/.test(line)) continue;
    const page = line.match(/^##+\s+(.+)$/);
    if (page) {
      commit();
      current = { title: cleanText(page[1]), body: [], layout: pages.length ? "title-and-body" : "cover" };
      continue;
    }
    if (/^#\s+/.test(line)) continue;
    const point = line.match(/^(?:[-*+]\s+|\d+[.)]\s+)(.+)$/);
    if (point) {
      if (!current) current = { title: "", body: [], layout: "title-and-body" };
      current.body.push(cleanText(point[1]));
      continue;
    }
    if (current) current.body.push(cleanText(line.replace(/^>\s*/, "")));
  }
  commit();
  return normalizeTopicPlan({
    title: cleanText(String(text || "").match(/^#\s+(.+)$/m)?.[1] || payload.topic || "Presentation"),
    style: payload.style || "banana",
    audience: payload.audience || "",
    goal: payload.requirements || "",
    slides: pages,
  }, payload);
}

function fallbackTopicPlan(payload = {}) {
  const topic = cleanText(payload.topic || "AI Generated Presentation") || "AI Generated Presentation";
  const count = Math.max(3, Math.min(30, Number(payload.slideCount || 8)));
  const audience = cleanText(payload.audience || "general audience");
  const requirement = cleanText(payload.requirements || "");
  const seed = [
    { title: topic, body: [requirement || `为${audience}建立关于${topic}的清晰认知。`], layout: "cover" },
    { title: "为什么现在值得关注", body: [`${topic}正在改变相关决策、流程或学习方式。`, "先明确背景，再进入方法与行动。"] },
    { title: "核心框架", body: [`把${topic}拆成几个可理解、可执行的部分。`, "每一部分都对应一个具体问题或判断。"] },
    { title: "从理解到行动", body: ["用一个清晰步骤把观点落到实践。", "优先选择低成本、可验证的下一步。"] },
    { title: "总结与讨论", body: [`记住：${topic}的价值来自清晰判断和持续验证。`, "留下一个问题，推动观众继续思考。"] },
  ];
  const slides = Array.from({ length: count }, (_, index) => seed[index] || {
    title: `关键问题 ${index + 1}`,
    body: [`围绕${topic}补充一个关键事实、案例或方法。`, "保持信息单一、结论明确。"],
  });
  return normalizeTopicPlan({ title: topic, audience, goal: requirement, style: payload.style || "banana", slides }, payload);
}

function fitTopicPlanSlideCount(plan, payload = {}) {
  if (payload.generationMode === "outline") return plan;
  const target = Math.max(3, Math.min(30, Number(payload.slideCount || plan?.slides?.length || 8)));
  const slides = Array.isArray(plan?.slides) ? plan.slides.slice(0, target) : [];
  while (slides.length < target) {
    const page = slides.length + 1;
    slides.push({
      page,
      title: `关键问题 ${page}`,
      body: [`围绕${plan?.title || payload.topic || "主题"}补充一个关键事实、案例或方法。`, "保持结论明确，避免堆叠无关信息。"],
      layout: "title-and-body",
    });
  }
  return normalizeTopicPlan({ ...plan, slides }, payload);
}

async function createTopicPlan(payload) {
  try {
    return fitTopicPlanSlideCount(await createTopicPlanFromAi(payload), payload);
  } catch (firstError) {
    try {
      return fitTopicPlanSlideCount(await createTopicPlanFromAi({
        ...payload,
        requirements: `${payload.requirements || ""}\n\nReturn a compact valid JSON object only. Do not use markdown fences. Keep every slide to one takeaway plus two evidence points.`,
        slideCount: Math.min(16, Number(payload.slideCount || 8)),
      }), payload);
    } catch (secondError) {
      throw new Error(`AI planning failed after retry: ${String(secondError.message || firstError.message || secondError)}`);
    }
  }
}

async function createTopicPlanFromAi(payload) {
  const requestConfig = mergedIntegrationConfig(payload.integration);
  if (!requestConfig || requestConfig.mode === LOCAL_MODE) throw new Error("AI topic generation requires an AI service. Configure an API key first.");
  if (!requestConfig.apiKey) throw new Error("API key is required for AI topic generation.");
  if (!requestConfig.endpoint) throw new Error("API endpoint is required for AI topic generation.");
  const style = payload.style || "teaching";
  const customStyle = normalizeCustomStyle(payload.customStyle);
  const styleProfile = normalizeStyleProfile(payload.styleProfile || customStyle?.styleProfile, style, customStyle);
  const targetCount = payload.generationMode === "outline"
    ? Number(payload.slideCount || 0)
    : Math.max(3, Math.min(30, Number(payload.slideCount || 8)));
  const prompt = buildPlanningPrompt({
    ...payload,
    style,
    customStyle,
    styleProfile,
  }, targetCount || 8);
  const text = requestConfig.mode === "workflow_api"
    ? await callWorkflowTextApi(prompt, requestConfig, { task: "topic_plan", style })
    : await callAiTextApi(prompt, requestConfig, "You plan presentation decks and return strict JSON only.", payload.referencePack);
  let parsed;
  try {
    parsed = parseAiJson(text);
  } catch (error) {
    throw new Error(`AI did not return valid planning JSON: ${String(error.message || error)}`);
  }
  const adaptedPlan = normalizePlan(parsed, targetCount);
  validatePlan(adaptedPlan, targetCount || 0);
  return normalizeTopicPlan(adaptedPlan, payload);
}

function chatBriefPrompt(payload = {}) {
  const messages = (Array.isArray(payload.messages) ? payload.messages : []).slice(-10);
  const currentBrief = payload.brief || {};
  const style = payload.style || currentBrief.style || "teaching";
  return `You are the brief-confirmation assistant for PPT HTML Studio.

The user is still clarifying the presentation request. Do NOT generate a slide outline.
Return STRICT JSON only. No markdown.

Conversation so far:
${messages.map((message) => `${message.role || "user"}: ${String(message.content || "").slice(0, 900)}`).join("\n")}

Current brief:
${JSON.stringify(currentBrief).slice(0, 4000)}

${referencePackPrompt(payload.referencePack)}

Selected style:
${stylePrompt(style, null)}

Your job:
1. Extract and update the brief fields.
2. Ask at most 2 missing questions.
3. Set ready=true only when topic, audience, scenario/purpose, slideCount, contentScope, and materials are sufficiently clear.
4. If ready=true, tell the user to click or type "开始规划" / "出大纲" to generate the outline.
5. Do not produce slide-by-slide outline content.

JSON schema:
{
  "assistantText": "short confirmation message",
  "questions": ["at most 2 missing questions"],
  "ready": false,
  "brief": {
    "title": "deck title if known",
    "topic": "topic",
    "audience": "target audience",
    "scenario": "usage scenario",
    "contentScope": "scope of content to cover",
    "slideCount": "number or range",
    "materials": "official assets / uploaded assets / none / public information",
    "style": "${style}",
    "language": "Simplified Chinese | English",
    "missingQuestions": ["missing item"],
    "summary": "concise confirmation summary"
  }
}`;
}

function normalizeChatBrief(raw, payload = {}) {
  const source = raw && typeof raw === "object" ? raw : {};
  const input = source.brief && typeof source.brief === "object" ? source.brief : source;
  const previous = payload.brief && typeof payload.brief === "object" ? payload.brief : {};
  const brief = {
    title: cleanText(input.title || previous.title || ""),
    topic: cleanText(input.topic || previous.topic || ""),
    audience: cleanText(input.audience || previous.audience || ""),
    scenario: cleanText(input.scenario || previous.scenario || ""),
    contentScope: cleanText(input.contentScope || input.content_scope || previous.contentScope || ""),
    slideCount: cleanText(input.slideCount || input.slide_count || previous.slideCount || ""),
    materials: cleanText(input.materials || previous.materials || ""),
    style: cleanText(input.style || payload.style || previous.style || "teaching") || "teaching",
    language: cleanText(input.language || previous.language || "Simplified Chinese"),
    missingQuestions: Array.isArray(input.missingQuestions || input.missing_questions)
      ? (input.missingQuestions || input.missing_questions).map(cleanText).filter(Boolean).slice(0, 3)
      : [],
    summary: cleanText(input.summary || ""),
  };
  const requiredReady = Boolean(
    brief.topic &&
    brief.audience &&
    brief.scenario &&
    brief.contentScope &&
    brief.slideCount &&
    brief.materials,
  );
  const ready = Boolean(source.ready || input.ready || requiredReady) && !brief.missingQuestions.length;
  return {
    assistantText: cleanText(source.assistantText || source.message || (ready ? "信息已齐全。确认无误后点击或输入“开始规划”，我再生成大纲。" : "我已更新需求确认，请继续补充缺失信息。")),
    questions: Array.isArray(source.questions) ? source.questions.map(cleanText).filter(Boolean).slice(0, 2) : brief.missingQuestions.slice(0, 2),
    ready,
    brief: { ...brief, ready },
  };
}

function parseChineseInteger(value) {
  const text = String(value || "").trim();
  if (!text) return 0;
  const digits = {
    零: 0, 〇: 0, 一: 1, 二: 2, 两: 2, 三: 3, 四: 4, 五: 5,
    六: 6, 七: 7, 八: 8, 九: 9,
  };
  if (/^\d+$/.test(text)) return Number(text);
  if (text === "十") return 10;
  const tenMatch = text.match(/^([一二两三四五六七八九])?十([一二两三四五六七八九])?$/);
  if (tenMatch) return (tenMatch[1] ? digits[tenMatch[1]] : 1) * 10 + (tenMatch[2] ? digits[tenMatch[2]] : 0);
  if (text.length === 1 && digits[text] !== undefined) return digits[text];
  return 0;
}

function extractTargetSlideCount(payload = {}, fallback = 8) {
  const messageSources = Array.isArray(payload.messages)
    ? payload.messages.map((message) => message.content).filter(Boolean).reverse()
    : [];
  const sources = [
    ...messageSources,
    payload?.brief?.slideCount,
    payload?.slideCount,
    payload?.outline?.slideCount,
    payload?.requirements,
  ].map((item) => String(item || "")).filter(Boolean);

  for (const source of sources) {
    if (/^\s*\d{1,2}\s*$/.test(source)) return Math.max(1, Math.min(60, Number(source.trim())));
    if (/^\s*[一二两三四五六七八九十]{1,3}\s*$/.test(source)) return Math.max(1, Math.min(60, parseChineseInteger(source) || fallback));
    const range = source.match(/(\d{1,2})\s*[-~—至到]\s*(\d{1,2})\s*(?:页|張|张|slides?|pages?|p\b)/i);
    if (range) return Math.max(1, Math.min(60, Number(range[2])));
    const exactMatches = [...source.matchAll(/(\d{1,2})\s*(?:页|頁|張|张|slides?|pages?|p\b)/gi)];
    if (exactMatches.length) return Math.max(1, Math.min(60, Number(exactMatches.at(-1)[1])));
    const zhRange = source.match(/([一二两三四五六七八九十]{1,3})\s*[-~—至到]\s*([一二两三四五六七八九十]{1,3})\s*(?:页|頁|張|张)/);
    if (zhRange) return Math.max(1, Math.min(60, parseChineseInteger(zhRange[2]) || fallback));
    const zhExact = [...source.matchAll(/([一二两三四五六七八九十]{1,3})\s*(?:页|頁|張|张)/g)];
    if (zhExact.length) return Math.max(1, Math.min(60, parseChineseInteger(zhExact.at(-1)[1]) || fallback));
  }
  const numericFallback = Number(fallback || 8);
  return Math.max(1, Math.min(60, Number.isFinite(numericFallback) ? numericFallback : 8));
}

function inferTripDayCount(text) {
  const source = String(text || "");
  const digit = source.match(/(\d{1,2})\s*(?:天|日)/);
  if (digit) return Math.max(1, Math.min(14, Number(digit[1])));
  const zh = source.match(/([一二两三四五六七八九十]{1,3})\s*(?:天|日)/);
  return zh ? Math.max(1, Math.min(14, parseChineseInteger(zh[1]) || 0)) : 0;
}

function splitBriefTopics(brief = {}) {
  const text = [brief.contentScope, brief.scenario, brief.topic, brief.summary]
    .map((item) => String(item || ""))
    .join("，");
  return text
    .split(/[，,、;；。.\n]+/)
    .map(cleanText)
    .filter((item) => item && item.length <= 28)
    .slice(0, 12);
}

function fallbackSlide(type, title, goal, bullets = [], speakerNoteOptional = "") {
  return { type, title: cleanText(title), goal: cleanText(goal), bullets: bullets.map(cleanText).filter(Boolean).slice(0, 6), speakerNoteOptional };
}

function buildFallbackSlides(payload = {}, targetCount = 8) {
  const brief = payload.brief && typeof payload.brief === "object" ? payload.brief : {};
  const messagesText = Array.isArray(payload.messages) ? payload.messages.map((message) => message.content).join("，") : "";
  const title = cleanText(brief.title || brief.topic || payload.topic || "演示文稿");
  const audience = cleanText(brief.audience || payload.audience || "目标受众");
  const scope = cleanText(brief.contentScope || brief.scenario || payload.requirements || "");
  const dayCount = inferTripDayCount(`${title}，${scope}，${messagesText}`);
  const isTravel = /旅游|旅行|攻略|行程|游玩|景点|美食|住宿|交通/.test(`${title}，${scope}，${messagesText}`);
  const slides = [
    fallbackSlide("Cover", title, "建立主题认知并说明这份内容的使用场景。", [audience, scope || "围绕用户确认的信息组织内容"]),
    fallbackSlide("Agenda", "内容总览", "让读者快速理解整份内容的结构。", ["核心目标", "重点板块", "执行路径", "总结与行动建议"]),
  ];

  if (isTravel) {
    slides.push(
      fallbackSlide("Content", "攻略定位与使用方式", "说明旅行攻略的目标人群、节奏和决策标准。", [audience, "侧重必去景点与美食推荐", "提供可执行的时间安排"]),
      fallbackSlide("Content", "行程总览时间线", "用一页呈现整体路线与每日重点。", [`${dayCount || 4}天行程框架`, "每日主题与核心区域", "预留交通与休息时间"]),
    );
    const days = dayCount || 4;
    for (let day = 1; day <= days; day += 1) {
      slides.push(
        fallbackSlide("Content", `第${day}天：路线主题与时间安排`, `明确第${day}天的游玩节奏和区域选择。`, ["上午核心安排", "下午重点体验", "晚间美食或休闲建议"]),
        fallbackSlide("Content", `第${day}天：必去景点与体验重点`, `筛选第${day}天最值得投入时间的体验。`, ["推荐景点", "适合拍照或停留的位置", "避开拥挤与绕路的提醒"]),
        fallbackSlide("Content", `第${day}天：美食与补给建议`, `安排第${day}天的餐饮、休息和补给。`, ["特色美食选择", "就近用餐区域", "预算与排队时间提示"]),
      );
    }
    slides.push(
      fallbackSlide("Content", "住宿与交通策略", "降低行程中的移动成本和不确定性。", ["住宿区域选择", "市内交通方式", "高峰期替代路线"]),
      fallbackSlide("Content", "预算与预约清单", "把费用、预约和关键准备事项集中管理。", ["门票与预约", "餐饮与交通预算", "证件、天气与装备"]),
      fallbackSlide("Summary", "最终建议与行动清单", "帮助读者把攻略转化为可执行计划。", ["确认同行偏好", "锁定每日优先级", "出发前完成预约与备选方案"]),
    );
  } else {
    const topics = splitBriefTopics(brief);
    const seeds = topics.length ? topics : ["背景与目标", "关键问题", "核心内容", "案例或证据", "实施路径", "风险与建议", "总结"];
    let section = 1;
    while (slides.length < Math.max(3, targetCount - 1)) {
      const seed = seeds[(section - 1) % seeds.length];
      slides.push(fallbackSlide(
        "Content",
        `${section}. ${seed}`,
        `说明“${seed}”这一页的核心观点。`,
        [`${seed}的关键背景`, "需要重点呈现的信息", "可以人工补充数据、案例或结论"],
      ));
      section += 1;
    }
    slides.push(fallbackSlide("Summary", "总结与下一步", "收束主要观点并给出后续行动。", ["核心结论", "后续补充材料", "下一步行动"]));
  }

  while (slides.length < targetCount) {
    const index = slides.length + 1;
    slides.push(fallbackSlide("Content", `补充页面 ${index}`, "补齐用户要求的页数，保留人工编辑空间。", ["补充关键点", "添加案例或数据", "完善讲述逻辑"]));
  }
  return slides.slice(0, targetCount).map((slide, index) => ({ page: index + 1, ...slide }));
}

function buildFallbackChatOutline(payload = {}, reason = "") {
  const brief = payload.brief && typeof payload.brief === "object" ? payload.brief : {};
  const targetCount = extractTargetSlideCount(payload, Number(brief.slideCount || payload.slideCount || 8));
  const style = cleanText(payload.style || brief.style || payload.outline?.style || "teaching") || "teaching";
  const styleProfile = normalizeStyleProfile(payload.styleProfile || payload.outline?.styleProfile, style, null);
  const slides = buildFallbackSlides(payload, targetCount);
  return {
    assistantText: reason
      ? `AI 输出不稳定，已生成${targetCount}页可编辑基础大纲，请在右侧查看并调整。`
      : `已生成${targetCount}页大纲，请在右侧查看并调整。`,
    questions: [],
    ready: true,
    outline: {
      title: cleanText(brief.title || brief.topic || payload.topic || "演示文稿"),
      audience: cleanText(brief.audience || payload.audience || ""),
      language: cleanText(brief.language || payload.outputLanguage || "Simplified Chinese"),
      style,
      styleProfile,
      slideCount: targetCount,
      goal: cleanText(brief.scenario || brief.contentScope || payload.requirements || ""),
      tone: cleanText(payload.outline?.tone || "清晰、实用、结构化"),
      layoutRules: qualityLayoutRules(style),
      slides,
    },
  };
}

function fitSlidesToTarget(slides, payload = {}, outline = {}) {
  const target = extractTargetSlideCount(payload, Number(outline.slideCount || slides.length || 8));
  let output = Array.isArray(slides) ? slides.filter(Boolean) : [];
  if (output.length > target) output = output.slice(0, target);
  if (output.length < target) {
    const fallbackSlides = buildFallbackSlides(payload, target);
    for (let index = output.length; index < target; index += 1) {
      output.push(fallbackSlides[index] || fallbackSlide("Content", `补充页面 ${index + 1}`, "补齐用户要求的页数。", ["补充关键点"]));
    }
  }
  return output.map((slide, index) => ({
    ...slide,
    page: index + 1,
    type: cleanText(slide.type || (index === 0 ? "Cover" : index === 1 ? "Agenda" : "Content")),
    title: cleanText(slide.title || `页面 ${index + 1}`),
    goal: cleanText(slide.goal || ""),
    bullets: (Array.isArray(slide.bullets) ? slide.bullets : []).map(cleanText).filter(Boolean).slice(0, 8),
    speakerNoteOptional: cleanText(slide.speakerNoteOptional || slide.speakerNote || ""),
  }));
}

async function createChatBrief(payload) {
  const requestConfig = mergedIntegrationConfig(payload.integration);
  if (!requestConfig || requestConfig.mode === LOCAL_MODE) throw new Error("Chat Creation requires an AI service. Configure an API key first.");
  if (!requestConfig.apiKey) throw new Error("API key is required for Chat Creation.");
  if (!requestConfig.endpoint) throw new Error("API endpoint is required for Chat Creation.");
  const config = {
    ...requestConfig,
    maxTokens: Math.max(1800, Number(requestConfig.maxTokens || 0) || 0),
    timeoutSec: Math.max(120, Number(requestConfig.timeoutSec || 0) || 0),
  };
  const prompt = chatBriefPrompt(payload);
  const text = requestConfig.mode === "workflow_api"
    ? await callWorkflowTextApi(prompt, config, { task: "chat_brief" })
    : await callAiTextApi(prompt, config, "You confirm a presentation brief. Return strict JSON only.", payload.referencePack);
  let parsed;
  try {
    parsed = parseAiJson(text);
  } catch (error) {
    throw new Error(`AI did not return valid brief JSON: ${String(error.message || error)}`);
  }
  return normalizeChatBrief(parsed, payload);
}

function chatCreationPrompt(payload = {}) {
  const messages = (Array.isArray(payload.messages) ? payload.messages : []).slice(-8);
  const currentOutline = payload.outline || {};
  const brief = payload.brief || {};
  const style = payload.style || currentOutline.style || "teaching";
  const currentStyleProfile = normalizeStyleProfile(currentOutline.styleProfile || payload.styleProfile, style, null);
  const allowedLayouts = qualityLayoutRules(style);
  const targetSlideCount = extractTargetSlideCount(payload, Number(currentOutline.slideCount || 8));
  return `You are the planning assistant for PPT HTML Studio Chat Creation.

The user is building an HTML presentation through a multi-turn conversation.
Return STRICT JSON only. Do not return markdown, prose, code fences, comments, or explanations.
Be fast and concise: assistantText must be no more than 2 short sentences.

Conversation so far:
${messages.map((message) => `${message.role || "user"}: ${String(message.content || "").slice(0, 900)}`).join("\n")}

Confirmed brief:
${JSON.stringify(brief).slice(0, 5000)}

${referencePackPrompt(payload.referencePack)}

Current editable outline, if any:
${JSON.stringify(currentOutline).slice(0, 6000)}

Selected style:
${stylePrompt(style, null)}

Structured style profile to maintain/update:
${styleProfilePromptLines(currentStyleProfile)}

${qualityPromptContract(style, targetSlideCount, "chat-outline")}
Allowed layout families: ${allowedLayouts.join(", ")}
TARGET_SLIDE_COUNT: ${targetSlideCount}

Your job:
1. Generate a complete draft outline from the confirmed brief.
2. The slides array MUST contain exactly ${targetSlideCount} slide objects. Do not return fewer slides to save effort.
3. Ask questions only if the brief is contradictory; otherwise produce the full outline immediately.
4. Maintain a complete draft outline that the UI can render as editable page cards.
5. Set ready=true when the outline is usable.
6. Maintain and update outline.styleProfile when the user mentions aesthetics, layout, typography, motifs, examples, or visual details.

JSON schema:
{
  "assistantText": "short helpful response to the user",
  "questions": ["optional question 1", "optional question 2"],
  "ready": true,
  "outline": {
    "title": "deck title",
    "audience": "target audience",
    "language": "English | Simplified Chinese",
    "style": "${style}",
    "styleProfile": {
      "styleName": "clear name of the deck style",
      "colorPalette": "specific palette and contrast rules",
      "typography": "title/body font direction and hierarchy",
      "layoutPattern": "grid, columns, visual balance and slide composition",
      "visualMotifs": "concrete repeatable visual motifs",
      "imagePolicy": "normally no generated/searched images in Chat Creation; use non-image CSS/SVG modules unless real user materials include images",
      "cardStyle": "card/border style or no-card rule",
      "backgroundStyle": "background treatment",
      "iconStyle": "icon/diagram direction",
      "spacingRules": "safe margin and spacing rules"
    },
    "slideCount": ${targetSlideCount},
    "goal": "presentation goal",
    "tone": "visual and writing tone",
    "layoutRules": ["allowed layout family and concrete implementation rule"],
    "slides": [
      {
        "page": 1,
        "type": "Cover | Agenda | Content | Transition | Summary | Exercise",
        "title": "complete slide title",
        "goal": "core objective of this page",
        "bullets": ["complete concise point"],
        "speakerNoteOptional": "optional note"
      }
    ]
  }
}

Rules:
- Do not show JSON to the user inside assistantText.
- The JSON root must be one object with keys assistantText, questions, ready, outline.
- outline.slides.length MUST equal ${targetSlideCount}. If target is 20, return 20 slide objects.
- Every slide must contain page, type, title, goal, bullets, and speakerNoteOptional.
- Preserve complete phrases. Never create single-letter or broken-word titles.
- The first slide should be a centered cover slide.
- Only add an Agenda slide when it helps the deck.
- Keep each slide focused on one core idea.
- Use strong contrast and fixed 16:9 slide thinking.
- Choose slide types from the allowed layout families. Do not invent new visual systems.
- If the user gives style details, update styleProfile so the final HTML can implement them.
- styleProfile is binding for generation; do not treat it as casual advice.
- If information is missing, ask questions but still draft exactly ${targetSlideCount} editable slides from the best available information.
- Return valid JSON only; no table markdown, no headings, no explanatory paragraphs.`;
}

function normalizeChatOutline(raw, payload = {}) {
  const source = raw && typeof raw === "object" ? raw : {};
  const outline = source.outline && typeof source.outline === "object" ? source.outline : source;
  const brief = payload.brief && typeof payload.brief === "object" ? payload.brief : {};
  const userMessages = Array.isArray(payload.messages) ? payload.messages.filter((message) => message.role === "user") : [];
  const fallbackTopic = cleanText(brief.title || brief.topic || userMessages.slice(-1)[0]?.content || payload.topic || "Presentation");
  const outlineStyle = cleanText(outline.style || payload.style || brief.style || "teaching") || "teaching";
  const styleProfile = normalizeStyleProfile(outline.styleProfile || outline.style_profile || payload.styleProfile, outlineStyle, null);
  const sourceSlides = Array.isArray(outline.slides) && outline.slides.length
    ? outline.slides
    : [
        { type: "Cover", title: outline.title || fallbackTopic, goal: "Introduce the topic and set expectations.", bullets: [] },
        { type: "Agenda", title: "What we will cover", goal: "Preview the structure.", bullets: ["Context and goals", "Key ideas", "Examples or discussion", "Summary and next steps"] },
        { type: "Content", title: "Key idea", goal: "Explain the central concept.", bullets: ["Add the main point here."] },
      ];
  const normalizedPlan = normalizeTopicPlan({
    title: outline.title || brief.title || brief.topic || payload.topic || "Untitled Presentation",
    audience: outline.audience || brief.audience || payload.audience || "",
    goal: outline.goal || brief.scenario || "",
    tone: outline.tone || "",
    palette: outline.palette || {},
    typography: outline.typography || {},
    layoutRules: outline.layoutRules || [],
    style: outlineStyle,
    styleProfile,
    slides: sourceSlides.map((slide) => ({
      title: slide.title,
      layout: slide.type || slide.layout || "Content",
      visualFocus: slide.goal || "",
      body: slide.bullets || slide.body || [],
      speakerNote: slide.speakerNoteOptional || slide.speakerNote || "",
      styleProfile: slide.styleProfile || styleProfile,
    })),
  }, payload);
  const slides = normalizedPlan.slides.map((slide, index) => ({
    page: index + 1,
    type: cleanText(sourceSlides?.[index]?.type || slide.layout || (index === 0 ? "Cover" : "Content")),
    title: slide.title,
    goal: cleanText(sourceSlides?.[index]?.goal || slide.visualFocus || ""),
    bullets: slide.body,
    speakerNoteOptional: slide.speakerNote || "",
  }));
  const fittedSlides = fitSlidesToTarget(slides, payload, outline);
  const originalCount = slides.length;
  const targetCount = fittedSlides.length;
  return {
    assistantText: cleanText(
      originalCount !== targetCount
        ? `已按要求生成${targetCount}页大纲，请在右侧查看并调整。`
        : source.assistantText || `已生成${targetCount}页大纲，请在右侧查看并调整。`,
    ),
    questions: Array.isArray(source.questions) ? source.questions.map(cleanText).filter(Boolean).slice(0, 3) : [],
    ready: Boolean(source.ready || fittedSlides.length >= 1),
    outline: {
      title: normalizedPlan.title,
      audience: normalizedPlan.audience,
      language: cleanText(outline.language || brief.language || payload.outputLanguage || "English"),
      style: outlineStyle,
      styleProfile: normalizedPlan.styleProfile || styleProfile,
      layoutRules: normalizedPlan.layoutRules || qualityLayoutRules(outlineStyle),
      slideCount: fittedSlides.length,
      goal: normalizedPlan.goal,
      tone: normalizedPlan.tone,
      slides: fittedSlides,
    },
  };
}

async function createChatOutline(payload) {
  const requestConfig = mergedIntegrationConfig(payload.integration);
  if (!requestConfig || requestConfig.mode === LOCAL_MODE) throw new Error("Chat Creation requires an AI service. Configure an API key first.");
  if (!requestConfig.apiKey) throw new Error("API key is required for Chat Creation.");
  if (!requestConfig.endpoint) throw new Error("API endpoint is required for Chat Creation.");
  const prompt = chatCreationPrompt(payload);
  const config = {
    ...requestConfig,
    maxTokens: Math.max(4000, Number(requestConfig.maxTokens || 0) || 0),
    timeoutSec: Math.max(180, Number(requestConfig.timeoutSec || 0) || 0),
  };
  const text = requestConfig.mode === "workflow_api"
    ? await callWorkflowTextApi(prompt, config, { task: "chat_creation_outline" })
    : await callAiTextApi(prompt, config, "You are an expert presentation planning assistant. Return strict JSON only.", payload.referencePack);
  let parsed;
  let fallbackReason = "";
  try {
    parsed = parseAiJson(text);
  } catch (error) {
    fallbackReason = String(error.message || error);
    parsed = buildFallbackChatOutline(payload, fallbackReason);
  }
  const result = normalizeChatOutline(parsed, payload);
  if (fallbackReason) {
    result.assistantText = `AI 输出不稳定，已生成${result.outline.slideCount}页可编辑基础大纲，请在右侧查看并调整。`;
    result.warning = "outline_json_fallback";
  }
  return result;
}

async function handleChatCreateOutline(request) {
  const payload = await readJson(request);
  const result = await createChatOutline(payload);
  return json(result);
}

async function handleChatBrief(request) {
  const payload = await readJson(request);
  const result = await createChatBrief(payload);
  return json(result);
}

function selectVisualAssetTargets(plan, strategy = "none", maxAssets = 5) {
  if (strategy === "none") return [];
  const slides = Array.isArray(plan?.slides) ? plan.slides : [];
  return slides
    .map((slide, index) => ({
      slide,
      index,
      page: Number(slide.page || index + 1),
      plan: normalizeVisualAssetPlan(slide.visualAssetPlan, index),
    }))
    .filter((item) => item.plan.needImage)
    .sort((a, b) => {
      const score = { high: 0, medium: 1, low: 2 };
      return (score[a.plan.priority] ?? 1) - (score[b.plan.priority] ?? 1) || a.index - b.index;
    })
    .slice(0, Math.max(0, Math.min(8, Number(maxAssets || 5))));
}

function svgDataUrl(svg) {
  const bytes = new TextEncoder().encode(String(svg || ""));
  return `data:image/svg+xml;base64,${bytesToBase64(bytes)}`;
}

function fallbackSvgAsset(target, type = "ai_generate") {
  const title = cleanText(target.slide?.title || `Slide ${target.page}`) || `Slide ${target.page}`;
  const purpose = cleanText(target.plan?.purpose || target.slide?.visualFocus || title);
  const safeTitle = title.replace(/[<>&]/g, "");
  const safePurpose = purpose.replace(/[<>&]/g, "");
  const hue = (target.page * 47) % 360;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="720" viewBox="0 0 1280 720">
  <defs><linearGradient id="g" x1="0" x2="1" y1="0" y2="1"><stop stop-color="hsl(${hue},70%,92%)"/><stop offset="1" stop-color="hsl(${(hue + 70) % 360},70%,72%)"/></linearGradient></defs>
  <rect width="1280" height="720" fill="url(#g)"/>
  <circle cx="1030" cy="170" r="180" fill="rgba(255,255,255,.35)"/>
  <rect x="92" y="96" width="760" height="420" rx="36" fill="rgba(255,255,255,.72)" stroke="rgba(15,23,42,.16)" stroke-width="4"/>
  <path d="M150 430 C300 260 410 330 520 210 C640 78 760 180 815 120" fill="none" stroke="hsl(${hue},70%,42%)" stroke-width="18" stroke-linecap="round"/>
  <text x="150" y="190" font-family="Inter,Arial,sans-serif" font-size="58" font-weight="800" fill="#111827">${safeTitle.slice(0, 30)}</text>
  <text x="150" y="270" font-family="Inter,Arial,sans-serif" font-size="30" fill="#334155">${safePurpose.slice(0, 60)}</text>
</svg>`;
  return {
    id: `asset-slide-${target.page}`,
    targetSlide: target.page,
    type,
    src: svgDataUrl(svg),
    alt: `${title} visual`,
    sourceUrl: "",
    credit: type === "web_fallback" ? "Generated fallback SVG" : "AI-style generated SVG",
    placement: target.plan.placement,
  };
}

async function fetchWikimediaImage(target) {
  const query = cleanText(target.plan.webQuery || `${target.slide?.title || ""} ${target.plan.purpose || ""}`);
  if (!query) return null;
  const apiUrl = `https://commons.wikimedia.org/w/api.php?action=query&format=json&generator=search&gsrnamespace=6&gsrsearch=${encodeURIComponent(query)}&gsrlimit=8&prop=imageinfo&iiprop=url|mime|size|extmetadata&iiurlwidth=1400`;
  const response = await fetch(apiUrl, { headers: { "user-agent": "PPT HTML Studio visual asset search" } });
  if (!response.ok) return null;
  const data = await response.json();
  const pages = Object.values(data?.query?.pages || {});
  for (const page of pages) {
    const info = page?.imageinfo?.[0];
    const url = info?.thumburl || info?.url || "";
    const mime = info?.mime || "";
    if (!url || !/^image\/(?:jpeg|png|webp|gif)$/i.test(mime)) continue;
    const imageResponse = await fetch(url);
    if (!imageResponse.ok) continue;
    const contentType = imageResponse.headers.get("content-type") || mime || "image/jpeg";
    if (!/^image\//i.test(contentType)) continue;
    const buffer = await imageResponse.arrayBuffer();
    if (buffer.byteLength > 2200000) continue;
    const bytes = new Uint8Array(buffer);
    return {
      id: `asset-slide-${target.page}`,
      targetSlide: target.page,
      type: "web_search",
      src: `data:${contentType.split(";")[0]};base64,${bytesToBase64(bytes)}`,
      alt: cleanText(page.title || target.slide?.title || "Web image").replace(/^File:/i, ""),
      sourceUrl: info?.descriptionurl || info?.url || url,
      credit: cleanText(info?.extmetadata?.Artist?.value || info?.extmetadata?.Credit?.value || "Wikimedia Commons").replace(/<[^>]+>/g, " "),
      placement: target.plan.placement,
    };
  }
  return null;
}

function aiSvgAssetPrompt(targets, plan) {
  return `Generate SVG visual assets for a presentation.
Return STRICT JSON only. Do not include markdown.
Each SVG must be a complete <svg> element, 1280x720, no external images, no script, no embedded raster, no text longer than 4 words.

Deck title: ${plan.title || ""}
Deck style: ${plan.styleProfile?.styleName || plan.style || ""}

Assets to generate:
${targets.map((target) => `- id asset-slide-${target.page}; slide ${target.page}; title: ${target.slide.title}; purpose: ${target.plan.purpose}; prompt: ${target.plan.aiPrompt}`).join("\n")}

JSON schema:
{
  "assets": [
    {"id":"asset-slide-1","targetSlide":1,"alt":"short alt","svg":"<svg ...></svg>"}
  ]
}`;
}

async function generateAiSvgAssets(targets, plan, config) {
  if (!targets.length) return [];
  try {
    const prompt = aiSvgAssetPrompt(targets, plan);
    const text = config.mode === "workflow_api"
      ? await callWorkflowTextApi(prompt, config, { task: "visual_svg_assets" })
      : await callAiTextApi(prompt, config, "You generate safe inline SVG assets and return strict JSON only.");
    const parsed = parseAiJson(text);
    const generated = Array.isArray(parsed.assets) ? parsed.assets : [];
    return generated.map((asset, index) => {
      const target = targets.find((item) => Number(item.page) === Number(asset.targetSlide)) || targets[index];
      const svg = String(asset.svg || "");
      if (!/<svg[\s>]/i.test(svg) || /<script|<image|href=/i.test(svg)) return fallbackSvgAsset(target, "ai_generate");
      return {
        id: cleanText(asset.id || `asset-slide-${target.page}`),
        targetSlide: target.page,
        type: "ai_generate",
        src: svgDataUrl(svg),
        alt: cleanText(asset.alt || `${target.slide.title} visual`),
        sourceUrl: "",
        credit: "AI generated SVG",
        placement: target.plan.placement,
      };
    }).slice(0, targets.length);
  } catch {
    return targets.map((target) => fallbackSvgAsset(target, "ai_generate"));
  }
}

async function prepareVisualAssets(payload = {}) {
  const strategy = cleanText(payload.strategy || payload.visualAssetOptions?.strategy || "none") || "none";
  const maxAssets = Math.max(0, Math.min(8, Number(payload.maxAssets || payload.visualAssetOptions?.maxAssets || 5)));
  const plan = normalizeTopicPlan(payload.plan || {}, payload.plan || {});
  const targets = selectVisualAssetTargets(plan, strategy, maxAssets);
  if (!targets.length || strategy === "none") return { assets: [], assetSourceLog: [] };
  const requestConfig = mergedIntegrationConfig(payload.integration || {});
  const assets = [];
  const log = [];
  if (strategy === "web_search" || strategy === "hybrid") {
    for (const target of targets) {
      const found = await fetchWikimediaImage(target).catch(() => null);
      if (found) {
        assets.push(found);
        log.push({ id: found.id, targetSlide: found.targetSlide, type: found.type, sourceUrl: found.sourceUrl, credit: found.credit });
      } else if (strategy === "web_search") {
        const fallback = fallbackSvgAsset(target, "web_fallback");
        assets.push(fallback);
        log.push({ id: fallback.id, targetSlide: fallback.targetSlide, type: fallback.type, sourceUrl: "", credit: fallback.credit });
      }
    }
  }
  const missingTargets = targets.filter((target) => !assets.some((asset) => asset.targetSlide === target.page));
  if ((strategy === "ai_generate" || strategy === "hybrid") && missingTargets.length) {
    const generated = requestConfig?.apiKey && requestConfig?.endpoint
      ? await generateAiSvgAssets(missingTargets, plan, { ...requestConfig, maxTokens: Math.max(4000, Number(requestConfig.maxTokens || 0) || 0) })
      : missingTargets.map((target) => fallbackSvgAsset(target, "ai_generate"));
    generated.forEach((asset) => {
      assets.push(asset);
      log.push({ id: asset.id, targetSlide: asset.targetSlide, type: asset.type, sourceUrl: asset.sourceUrl, credit: asset.credit });
    });
  }
  return { assets: normalizeVisualAssets(assets), assetSourceLog: log };
}

async function handlePrepareVisualAssets(request) {
  const payload = await readJson(request);
  const result = await prepareVisualAssets(payload);
  return json(result);
}

async function callAiApi(slides, config, style, customStyle = null, planContext = null) {
  const endpoint = normalizeChatEndpoint(config.endpoint);
  const prompt = deckPrompt(slides, style, customStyle, planContext);
  const response = await fetch(endpoint, {
    method: "POST",
    headers: integrationHeaders(config),
    body: JSON.stringify({
      model: config.model || "gpt-4.1-mini",
      messages: [
        { role: "system", content: "You are a senior HTML presentation designer and layout QA reviewer. Build a complete editable 16:9 deck with stable CSS, consistent style, original-image placeholders, no overflow, no broken titles, and no template chatter. Return only valid standalone HTML." },
        { role: "user", content: multimodalUserContent(prompt, planContext?.referencePack, config) },
      ],
      temperature: 0.12,
      max_tokens: Number(config.maxTokens || 20000),
    }),
  });
  const data = await readApiResponse(response);
  if (!response.ok) throw new Error(`Provider ${response.status} at ${endpoint}: ${data.message || data.error?.message || "request failed"}`);
  return extractHtml(extractTextFromApiData(data));
}

async function callWorkflowApi(slides, config, style, customStyle = null, planContext = null) {
  const endpoint = String(config.endpoint || "").trim();
  const prompt = deckPrompt(slides, style, customStyle, planContext);
  const isDify = config.workflowPayload === "dify" || /\/v1\/workflows\/run|\/workflows\/run/i.test(endpoint);
  const body = isDify
    ? {
        inputs: {
          style,
          prompt,
          slides: slides.map((slide) => ({ page: slide.page, title: slide.title, body: slide.body.slice(0, 20), imageCount: slide.images.length, hasImages: slide.images.length > 0 })),
        },
        response_mode: "blocking",
        user: "ppt-html-studio",
      }
    : {
        style,
        prompt,
        slides: slides.map((slide) => ({ page: slide.page, title: slide.title, body: slide.body.slice(0, 20), imageCount: slide.images.length, hasImages: slide.images.length > 0 })),
      };
  const response = await fetch(endpoint, {
    method: "POST",
    headers: integrationHeaders(config),
    body: JSON.stringify(body),
  });
  const data = await readApiResponse(response);
  if (!response.ok) throw new Error(data.message || data.error?.message || `Workflow HTTP ${response.status}`);
  return extractHtml(extractTextFromApiData(data));
}

async function callAiPrompt(prompt, config, referencePack = null) {
  const endpoint = normalizeChatEndpoint(config.endpoint);
  const response = await fetch(endpoint, {
    method: "POST",
    headers: integrationHeaders(config),
    body: JSON.stringify({
      model: config.model || "gpt-4.1-mini",
      messages: [
        {
          role: "system",
          content: "You are the HTML Anything deck agent. Return only a complete standalone HTML document. Treat the supplied skill and page-count contract as binding.",
        },
        { role: "user", content: multimodalUserContent(prompt, referencePack, config) },
      ],
      temperature: 0.12,
      max_tokens: Number(config.maxTokens || 16000),
    }),
  });
  const data = await readApiResponse(response);
  if (!response.ok) throw new Error(data.message || data.error?.message || `API HTTP ${response.status}`);
  return extractTextFromApiData(data);
}

async function callAcademicJson(prompt, config, system, referencePack = null, repairLabel = "academic specification") {
  let raw = "";
  if (config.mode === "workflow_api") {
    raw = await callWorkflowTextApi(prompt, config, { output: repairLabel });
  } else {
    const endpoint = normalizeChatEndpoint(config.endpoint);
    const baseBody = {
      model: config.model || "gpt-4.1-mini",
      thinking: config.thinking || { type: "enabled" },
      messages: [
        { role: "system", content: system },
        { role: "user", content: multimodalUserContent(prompt, referencePack, config) },
      ],
      temperature: 0.1,
      max_tokens: Math.min(Math.max(Number(config.maxTokens || 8000), 5000), 16000),
    };
    let response = await fetch(endpoint, {
      method: "POST",
      headers: integrationHeaders(config),
      body: JSON.stringify({ ...baseBody, response_format: { type: "json_object" } }),
    });
    if (!response.ok && [400, 404, 422].includes(response.status)) {
      response = await fetch(endpoint, { method: "POST", headers: integrationHeaders(config), body: JSON.stringify(baseBody) });
    }
    const data = await readApiResponse(response);
    if (!response.ok) throw new Error(data.message || data.error?.message || `API HTTP ${response.status}`);
    raw = extractTextFromApiData(data);
  }
  try {
    return { value: parseAiJson(raw), repaired: false, rawBytes: raw.length };
  } catch (initialError) {
    const repairPrompt = `Repair only the JSON syntax of the following ${repairLabel}. Preserve every fact, string, ID, page reference and array item. Return one complete strict JSON object without Markdown or explanation.\n\n${String(raw).slice(0, 50000)}`;
    const repairedRaw = config.mode === "workflow_api"
      ? await callWorkflowTextApi(repairPrompt, config, { output: `${repairLabel}-json-repair` })
      : await callAiTextApi(repairPrompt, config, "You repair JSON syntax only. Return one strict JSON object.");
    return { value: parseAiJson(repairedRaw), repaired: true, rawBytes: raw.length, repairBytes: repairedRaw.length };
  }
}

async function callAiPromptStreaming(prompt, config, referencePack = null, onDelta = null) {
  const endpoint = normalizeChatEndpoint(config.endpoint);
  const thinking = config.thinking || { type: "disabled" };
  const response = await fetch(endpoint, {
    method: "POST",
    headers: integrationHeaders(config),
    body: JSON.stringify({
      model: config.model || "gpt-4.1-mini",
      thinking,
      messages: [
        {
          role: "system",
          content: "You are the HTML Anything deck agent. Return only a complete standalone HTML document. Treat the supplied skill and page-count contract as binding.",
        },
        { role: "user", content: multimodalUserContent(prompt, referencePack, config) },
      ],
      temperature: 0.12,
      max_tokens: Math.min(Math.max(Number(config.maxTokens || 20000), 12000), 24000),
      stream: true,
    }),
  });
  if (!response.ok) {
    const data = await readApiResponse(response);
    throw new Error(`Provider ${response.status} at ${endpoint}: ${data.message || data.error?.message || "request failed"}`);
  }
  if (!response.body) {
    const data = await readApiResponse(response);
    const text = extractTextFromApiData(data);
    if (text) return text;
    throw new Error(`Provider stream returned no readable content at ${endpoint}.`);
  }
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let output = "";
  let reasoningBytes = 0;
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split(/\r?\n/);
    buffer = lines.pop() || "";
    for (const line of lines) {
      const dataLine = line.replace(/^data:\s*/, "").trim();
      if (!dataLine || dataLine === "[DONE]") continue;
      try {
        const parsed = JSON.parse(dataLine);
        if (parsed.error) {
          const providerError = parsed.error?.message || parsed.error?.type || "provider stream error";
          throw new Error(`Provider stream error at ${endpoint}: ${providerError}`);
        }
        const delta = parsed.choices?.[0]?.delta?.content || parsed.choices?.[0]?.message?.content || "";
        const reasoning = parsed.choices?.[0]?.delta?.reasoning_content || parsed.choices?.[0]?.message?.reasoning_content || "";
        reasoningBytes += String(reasoning || "").length;
        if (delta) {
          output += delta;
          onDelta?.(delta, output);
        }
      } catch {
        if (!dataLine.startsWith("{")) {
          output += dataLine;
          onDelta?.(dataLine, output);
        }
      }
    }
  }
  buffer += decoder.decode();
  if (buffer.trim()) {
    const dataLine = buffer.replace(/^data:\s*/i, "").trim();
    if (dataLine && dataLine !== "[DONE]") {
      try {
        const parsed = JSON.parse(dataLine);
        if (parsed.error) {
          const providerError = parsed.error?.message || parsed.error?.type || "provider stream error";
          throw new Error(`Provider stream error at ${endpoint}: ${providerError}`);
        }
        const delta = parsed.choices?.[0]?.delta?.content || parsed.choices?.[0]?.message?.content || "";
        if (delta) {
          output += delta;
          onDelta?.(delta, output);
        }
      } catch {
        // Ignore a non-JSON trailing provider marker.
      }
    }
  }
  if (output) return output;
  throw new Error(`Provider returned no visible content (reasoning_bytes=${reasoningBytes}).`);
}

async function callWorkflowPrompt(prompt, config, referencePack = null) {
  const endpoint = String(config.endpoint || "").trim();
  const compactReferencePack = referencePack
    ? {
        outlineText: String(referencePack.outlineText || "").slice(0, 12000),
        files: (Array.isArray(referencePack.files) ? referencePack.files : []).slice(0, 12).map((file) => ({
          name: cleanText(file.name || "reference-file"),
          text: String(file.text || file.content || "").slice(0, 5000),
        })),
        images: (Array.isArray(referencePack.images) ? referencePack.images : []).slice(0, 12).map((image) => ({
          name: cleanText(image.name || image.alt || "reference-image"),
          alt: cleanText(image.alt || ""),
        })),
      }
    : null;
  const isDify = config.workflowPayload === "dify" || /\/v1\/workflows\/run|\/workflows\/run/i.test(endpoint);
  const body = isDify
    ? {
        inputs: { prompt, referencePack: compactReferencePack },
        response_mode: "blocking",
        user: "ppt-html-studio",
      }
    : { prompt, referencePack: compactReferencePack };
  const response = await fetch(endpoint, {
    method: "POST",
    headers: integrationHeaders(config),
    body: JSON.stringify(body),
  });
  const data = await readApiResponse(response);
  if (!response.ok) throw new Error(data.message || data.error?.message || `Workflow HTTP ${response.status}`);
  return extractTextFromApiData(data);
}

async function maybeGenerateAiHtml(slides, config, style, customStyle = null, planContext = null) {
  if (!config || config.mode === LOCAL_MODE) return null;
  if (!config.apiKey) throw new Error("API key is required for AI generation.");
  if (!config.endpoint) throw new Error("API endpoint is required for AI generation.");
  if (config.mode !== "ai_api" && config.mode !== "workflow_api") throw new Error(`Unsupported API mode: ${config.mode}`);
  const html = await generateHtmlAnythingDeck({
    skills: HTML_ANYTHING_SKILLS,
    slides,
    config,
    style,
    customStyle,
    mode: planContext?.generationMode === "outline" ? "quick-create-outline" : planContext?.source || "converter",
    sourceBrief: [
      planContext?.title ? `Deck title: ${planContext.title}` : "",
      planContext?.goal ? `Deck goal: ${planContext.goal}` : "",
      planContext?.tone ? `Tone: ${planContext.tone}` : "",
    ].filter(Boolean).join("\n"),
    referencePack: planContext?.referencePack || null,
    callModel: (prompt, context) => config.mode === "ai_api"
      ? callAiPrompt(prompt, config, context.referencePack)
      : callWorkflowPrompt(prompt, config, context.referencePack),
    extractHtml,
  });
  if (!html) throw new Error("The API responded, but no complete HTML document was found. Ask the model/workflow to return only standalone HTML.");
  return html;
}

function normalizeChatEndpoint(endpoint) {
  const value = String(endpoint || "").trim().replace(/\/+$/, "");
  if (!value) return "";
  if (value.endsWith("/chat/completions")) return value;
  if (value.endsWith("/v1") || value.endsWith("/api/v3")) return `${value}/chat/completions`;
  if (/^https?:\/\/[^/]+$/i.test(value)) return `${value}/chat/completions`;
  return value;
}

function extractHtml(text) {
  const raw = String(text || "").trim();
  const fenced = raw.match(/```(?:html)?\s*([\s\S]*?)```/i)?.[1]?.trim();
  const candidate = fenced || raw;
  if (/<html[\s>]/i.test(candidate) || /<!doctype html/i.test(candidate)) return candidate;
  if (/<body[\s>]/i.test(candidate)) return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>${candidate}</html>`;
  if (/<section[\s>]/i.test(candidate) || /class=["'][^"']*\bslide\b/i.test(candidate)) {
    return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>AI PPT HTML</title></head><body>${candidate}</body></html>`;
  }
  return "";
}

function escapeHtmlAttr(value) {
  return String(value || "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;",
  }[char]));
}

function hydrateVisualAssetsInHtml(html, visualAssets = []) {
  let output = String(html || "");
  const assets = normalizeVisualAssets(visualAssets);
  if (!output || !assets.length) return output;
  for (const asset of assets) {
    const id = asset.id.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const figureHtml = `<figure class="media-box visual-asset" data-visual-asset-id="${escapeHtmlAttr(asset.id)}" data-asset-source="${escapeHtmlAttr(asset.type)}"><img src="${asset.src}" alt="${escapeHtmlAttr(asset.alt)}"><figcaption>${escapeHtmlAttr(asset.credit || asset.sourceUrl || "")}</figcaption></figure>`;
    const figureRegex = new RegExp(`<figure([^>]*data-visual-asset-id=["']${id}["'][^>]*)>[\\s\\S]*?<\\/figure>`, "gi");
    let replaced = false;
    output = output.replace(figureRegex, (match, attrs) => {
      replaced = true;
      return `<figure${attrs} data-asset-source="${escapeHtmlAttr(asset.type)}"><img src="${asset.src}" alt="${escapeHtmlAttr(asset.alt)}"><figcaption>${escapeHtmlAttr(asset.credit || asset.sourceUrl || "")}</figcaption></figure>`;
    });
    if (!replaced) {
      const sectionRegex = new RegExp(`(<section[^>]*(?:data-slide-page=["']${asset.targetSlide}["']|data-html-deck-editor-page=["']?${asset.targetSlide}["']?)[^>]*>)`, "i");
      if (sectionRegex.test(output)) {
        output = output.replace(sectionRegex, `$1${figureHtml}`);
      }
    }
  }
  const assetCss = `<style id="ppt-visual-assets-css">.visual-asset{margin:0;overflow:hidden;border-radius:18px;background:#eef2f7}.visual-asset img{display:block;width:100%;height:100%;object-fit:cover}.visual-asset figcaption{position:absolute;right:12px;bottom:8px;max-width:60%;font:12px/1.2 Arial,sans-serif;color:rgba(15,23,42,.62);background:rgba(255,255,255,.72);padding:4px 7px;border-radius:999px}.slide>.visual-asset:first-child{position:absolute;right:clamp(56px,7vw,110px);bottom:clamp(64px,8vh,108px);width:min(38vw,440px);height:min(35vh,260px);z-index:0}.slide>.visual-asset:first-child+*{position:relative;z-index:1}</style>`;
  return /<\/head>/i.test(output) && !/ppt-visual-assets-css/.test(output)
    ? output.replace(/<\/head>/i, `${assetCss}</head>`)
    : output;
}

async function buildZip(job) {
  const zip = new JSZip();
  zip.file("index.html", job.inlinePreviewHtml);
  zip.file("index-scroll.html", job.inlineScrollHtml);
  zip.file("index-single-file.html", job.inlinePreviewHtml);
  zip.file("index-scroll-single-file.html", job.inlineScrollHtml);
  if (job.assetSourceLog) zip.file("asset-source-log.json", JSON.stringify(job.assetSourceLog, null, 2));
  zip.file("README-open.txt", "Open index.html for paged navigation, or index-scroll.html for continuous scrolling.\nImages are embedded in the HTML, so they will not be lost.\n");
  return zip.generateAsync({ type: "uint8array", compression: "DEFLATE" });
}

function publicJob(job, includeInline = false) {
  if (!job) return job;
  const output = {
    ...job,
    share: job.share ? { ...job.share } : job.share,
  };
  if (!includeInline) {
    delete output.inlinePreviewHtml;
    delete output.inlineScrollHtml;
  }
  return output;
}

function isConverterJob(job) {
  const fileName = String(job?.fileName || "").toLowerCase();
  const status = job?.aiStatus || {};
  if (status.topicGenerated || job?.topicPlan) return false;
  if (fileName.endsWith(".ppt") || fileName.endsWith(".pptx")) return true;
  if (status.browserExtracted || String(job?.id || "").startsWith("LOCAL-")) return true;
  return false;
}

function normalizeSlidesPayload(rawSlides) {
  const slides = (Array.isArray(rawSlides) ? rawSlides : [])
    .map((slide, index) => {
      const sourceText = cleanText(slide?.text || slide?.plainText || "");
      const textLines = sourceText.split(/\r?\n|(?<=[。！？.!?])\s+/).map(cleanText).filter(Boolean);
      const rawTitle = cleanText(slide?.title || textLines[0] || `Slide ${index + 1}`);
      // Word outlines use `points` while Quick/Chat use `body`.  Preserve both
      // contracts (plus the page takeaway) before the shared normalizer; the
      // old Word path silently dropped these fields and sent title-only pages
      // to the model.
      const structuredBody = [
        ...(Array.isArray(slide?.body) ? slide.body : []),
        ...(Array.isArray(slide?.points) ? slide.points : []),
        slide?.takeaway || slide?.coreClaim || "",
      ].filter((value) => String(value || "").trim());
      const rawBody = (structuredBody.length ? structuredBody : textLines.slice(rawTitle === textLines[0] ? 1 : 0))
        .map(cleanText)
        .filter(isUsefulText)
        .slice(0, 18);
      const normalizedText = normalizeTextFragments([rawTitle, ...rawBody]);
      const titleBody = slideTitleAndBody(normalizedText);
      const title = titleBody.title;
      const body = titleBody.body.slice(0, 18);
      const images = (Array.isArray(slide?.images) ? slide.images : [])
        .filter((image) => image?.src && String(image.src).startsWith("data:image/"))
        .slice(0, 4)
        .map((image, imageIndex) => ({
          src: String(image.src),
          name: cleanText(image.name || `image-${imageIndex + 1}`),
          mime: cleanText(image.mime || "image/png"),
          size: Number(image.size || 0),
        }));
      return {
        page: Number(slide?.page || index + 1),
        title,
        body,
        text: normalizedText.join(" "),
        takeaway: cleanText(slide?.takeaway || slide?.coreClaim || ""),
        visualFocus: cleanText(slide?.visualFocus || slide?.layout || ""),
        speakerNote: cleanText(slide?.speakerNote || ""),
        images,
        imageCount: Number(slide?.imageCount || slide?.images?.length || 0),
        sourcePages: Array.isArray(slide?.sourcePages) ? slide.sourcePages.map(Number).filter(Number.isFinite) : [],
      };
    })
    .filter((slide) => {
      if (!slide.title && !slide.body.length && !slide.images.length && !slide.imageCount) return false;
      if (/^slide\s*\d+$/i.test(slide.title) && !slide.body.length && !slide.images.length && !slide.imageCount) return false;
      return true;
    });
  if (!slides.length) throw new Error("No usable slide content was extracted from this PPTX file.");
  return slides;
}

function attachReferenceImages(slides, referencePack) {
  const refs = (Array.isArray(referencePack?.images) ? referencePack.images : [])
    .filter((image) => /^data:image\//i.test(String(image.dataUrl || "")))
    .slice(0, 6)
    .map((image) => ({
      src: String(image.dataUrl),
      name: cleanText(image.name || "reference-image"),
      mime: cleanText(image.type || "image/png"),
      size: Number(image.size || 0),
    }));
  if (!refs.length) return slides;
  return slides.map((slide, index) => ({
    ...slide,
    images: [...(Array.isArray(slide.images) ? slide.images : []), ...(refs[index] ? [refs[index]] : [])].slice(0, 6),
  }));
}

function addCompletedJob(job) {
  jobs.set(job.id, job);
  jobList.unshift(job);
  while (jobList.length > 5) {
    const removed = jobList.pop();
    if (removed) jobs.delete(removed.id);
  }
  return job;
}

function mergeGeneratedChunks(chunks) {
  const ordered = (Array.isArray(chunks) ? chunks : [])
    .filter((chunk) => chunk?.html)
    .sort((a, b) => Number(a.pageStart || 0) - Number(b.pageStart || 0));
  if (!ordered.length) throw new Error("AI generation returned no page chunks.");
  const firstHtml = String(ordered[0].html);
  const sections = ordered.slice(1).flatMap((chunk) => extractSlideSections(chunk.html));
  return mergeDeck(firstHtml, sections);
}

function makeAiJobFromHtml(payload, slides, pagedHtml, aiStatus = {}) {
  validateAiHtmlCompleteness(pagedHtml, slides);
  const extractionStats = {
    embeddedImages: Number(payload.stats?.embeddedImages || slides.reduce((sum, slide) => sum + (slide.images?.length || 0), 0)),
    embeddedImageBytes: Number(payload.stats?.embeddedImageBytes || 0),
    skippedImages: Number(payload.stats?.skippedImages || 0),
  };
  const style = payload.style || "teaching";
  const customStyle = normalizeCustomStyle(payload.customStyle);
  let finalPagedHtml = injectOriginalImages(pagedHtml, slides);
  finalPagedHtml = injectEditorRuntime(finalPagedHtml);
  const scrollHtml = makeScrollHtml(finalPagedHtml);
  const id = `CF-${Date.now().toString(36).toUpperCase()}-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
  const job = {
    id,
    fileName: String(payload.filename || "ai-presentation.html"),
    slides: slides.length,
    style,
    status: "completed",
    updatedAt: new Date().toISOString(),
    previewUrl: `/outputs/${id}/index.html`,
    scrollUrl: `/outputs/${id}/index-scroll.html`,
    downloadUrl: `/api/jobs/${id}/download`,
    inlinePreviewHtml: finalPagedHtml,
    inlineScrollHtml: scrollHtml,
    inlinePreviewMode: "blob",
    aiStatus: { mode: "ai_api", used: true, resultType: "html", ...aiStatus },
    ...(payload.topicPlan ? { topicPlan: payload.topicPlan } : {}),
    share: {
      status: "ready",
      recommendation: extractionStats.skippedImages
        ? `Ready to share. ${extractionStats.embeddedImages} images were embedded. ${extractionStats.skippedImages} oversized images were skipped.`
        : "Ready to share. AI HTML was generated and checked before completion.",
      totalImages: extractionStats.embeddedImages + extractionStats.skippedImages,
      embeddedImages: extractionStats.embeddedImages,
      missingImages: extractionStats.skippedImages,
      riskyPaths: 0,
      externalImages: 0,
      zipPackageUrl: `/api/jobs/${id}/download`,
      singleFileUrl: `/outputs/${id}/index-single-file.html`,
      scrollSingleFileUrl: `/outputs/${id}/index-scroll-single-file.html`,
      reportUrl: `/outputs/${id}/share-report.json`,
    },
  };
  return addCompletedJob(job);
}

async function handleAiGenerationStart(request) {
  const payload = await readJson(request);
  const slides = normalizeSlidesPayload(payload.slides);
  return json({
    generationId: `GEN-${Date.now().toString(36).toUpperCase()}-${crypto.randomUUID().slice(0, 8).toUpperCase()}`,
    totalPages: slides.length,
    chunkSize: chunkSizeFor(slides.length),
    totalChunks: Math.ceil(slides.length / chunkSizeFor(slides.length)),
    progressPolicy: "page-validated-then-finalized",
  });
}

async function handleAiGenerationChunk(request) {
  const payload = await readJson(request);
  const slides = normalizeSlidesPayload(payload.slides);
  const config = mergedIntegrationConfig(payload.integration);
  if (!config.apiKey) throw new Error("API key is required for AI generation.");
  if (!config.endpoint) throw new Error("API endpoint is required for AI generation.");
  const style = payload.style || "teaching";
  const result = await generateHtmlAnythingChunk({
    skills: HTML_ANYTHING_SKILLS,
    slides,
    config,
    style,
    customStyle: normalizeCustomStyle(payload.customStyle),
    mode: payload.mode || payload.source || "quick-create",
    sourceBrief: payload.sourceBrief || "",
    referencePack: payload.referencePack || null,
    totalPages: Number(payload.totalPages || slides.length),
    pageStart: Number(payload.pageStart || slides[0].page || 1),
    pageEnd: Number(payload.pageEnd || slides[slides.length - 1].page || slides.length),
    wordV3: Boolean(payload.wordV3),
    callModel: (prompt, context) => config.mode === "ai_api"
      ? callAiPrompt(prompt, config, context.referencePack)
      : callWorkflowPrompt(prompt, config, context.referencePack),
    extractHtml,
  });
  return json({
    generationId: payload.generationId || "",
    chunkIndex: Number(payload.chunkIndex || 0),
    pageStart: result.pageStart,
    pageEnd: result.pageEnd,
    pageCount: result.pageCount,
    html: result.html,
    skillId: result.skillId,
  });
}

async function handleAiGenerationFinalize(request) {
  const payload = await readJson(request);
  const slides = attachReferenceImages(normalizeSlidesPayload(payload.slides), payload.referencePack);
  const pagedHtml = mergeGeneratedChunks(payload.chunks);
  const job = makeAiJobFromHtml(payload, slides, pagedHtml, {
    mode: mergedIntegrationConfig(payload.integration).mode || "ai_api",
    provider: mergedIntegrationConfig(payload.integration).endpoint,
    generationId: payload.generationId || "",
    chunks: Array.isArray(payload.chunks) ? payload.chunks.length : 0,
    source: payload.source || "ai",
  });
  return json({ job, generationId: payload.generationId || "" });
}

function academicSse(executor) {
  const encoder = new TextEncoder();
  return new Response(new ReadableStream({
    async start(controller) {
      const emit = (event, data = {}) => controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
      try { await executor(emit); } catch (error) { emit("error", { stage: "academic_pipeline", message: String(error?.message || error) }); } finally { controller.close(); }
    },
  }), { headers: { ...corsHeaders(), "content-type": "text/event-stream; charset=utf-8", "cache-control": "no-cache, no-transform" } });
}

function aiGenerationSseResponse(run) {
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (event, data = {}) => controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
      const heartbeat = setInterval(() => send("heartbeat", { phase: "等待模型响应", message: "连接仍然存活；进度只会在真实阶段完成后变化。" }), 15000);
      try {
        await run(send);
      } catch (error) {
        send("error", { message: String(error?.message || error), stage: error?.stage || "html_anything_generation" });
      } finally {
        clearInterval(heartbeat);
        controller.close();
      }
    },
  });
  return new Response(stream, {
    status: 200,
    headers: { ...corsHeaders(), "content-type": "text/event-stream; charset=utf-8", "cache-control": "no-cache, no-transform", connection: "keep-alive" },
  });
}

function imageModelResponse(bytes, type = "image/png") {
  return new Response(bytes, {
    headers: {
      "content-type": type,
      "cache-control": "no-store",
      ...corsHeaders(),
    },
  });
}

function makeHtmlAnythingDirectJob(payload, slides, html, skillId, generationId, modelRequests = 1, generationMode = "html-anything-single-request-stream") {
  const id = `CF-STREAM-${Date.now().toString(36).toUpperCase()}-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
  const imageCount = slides.reduce((sum, slide) => sum + (slide.images?.length || 0), 0);
  return addCompletedJob({
    id,
    fileName: String(payload.filename || "ai-presentation.html"),
    slides: slides.length,
    style: payload.style || "teaching",
    status: "completed",
    updatedAt: new Date().toISOString(),
    previewUrl: `/outputs/${id}/index.html`,
    scrollUrl: `/outputs/${id}/index-scroll.html`,
    downloadUrl: `/api/jobs/${id}/download`,
    inlinePreviewHtml: html,
    inlineScrollHtml: makeScrollHtml(html),
    inlinePreviewMode: "blob",
    aiStatus: { mode: "ai_api", used: true, resultType: "standalone-html", generationMode, skillId, generationId, modelRequests },
    topicPlan: payload.topicPlan || null,
    share: {
      status: "ready",
      recommendation: `HTML Anything ${skillId} generated the standalone document directly.`,
      totalImages: imageCount,
      embeddedImages: imageCount,
      missingImages: 0,
      riskyPaths: 0,
      externalImages: 0,
      zipPackageUrl: `/api/jobs/${id}/download`,
      singleFileUrl: `/outputs/${id}/index-single-file.html`,
      scrollSingleFileUrl: `/outputs/${id}/index-scroll-single-file.html`,
      reportUrl: `/outputs/${id}/share-report.json`,
    },
  });
}

async function handleHtmlAnythingConvertStream(request) {
  const payload = await readJson(request);
  return aiGenerationSseResponse(async (send) => {
    const source = String(payload.source || "").trim().toLowerCase();
    // Word conversion can contain dozens of semantic pages.  It uses the
    // windowed adapter below so the provider only has to satisfy a small,
    // deterministic page contract at a time.  Quick Create and Chat Creation
    // deliberately keep the single-request contract and request count.
    const isWordConverter = source === "word-converter";
    // Original DOCX images are materialized by the browser after the AI
    // layout pass. Do not copy their large data URLs into every Worker call;
    // the model only needs IDs and labels for placement.
    const aiReferencePack = isWordConverter && payload.referencePack
      ? { ...payload.referencePack, images: Array.isArray(payload.referencePack.images) ? payload.referencePack.images.map((image) => ({ id: image.id, name: image.name || image.alt || image.id, alt: image.alt, type: image.type })) : [] }
      : payload.referencePack;
    const rawSlides = attachReferenceImages(normalizeSlidesPayload(payload.slides), aiReferencePack);
    // Word outlines can carry source page labels with gaps (for example after
    // a page-break-free DOCX split).  The AI contract is about output order,
    // so normalize only this route to contiguous output pages.
    const slides = isWordConverter
      ? rawSlides.map((slide, index) => ({ ...slide, page: Number(slide.page) || Number(payload.pageStart || 1) + index }))
      : rawSlides;
    const config = mergedIntegrationConfig(payload.integration);
    if (!config.apiKey || !config.endpoint) throw new Error("AI generation requires an API key and endpoint.");
    const generationId = `GEN-${Date.now().toString(36).toUpperCase()}-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
    const totalPages = slides.length;
    const windowSize = isWordConverter ? chunkSizeFor(totalPages) : totalPages;
    const batches = isWordConverter
      ? Array.from({ length: Math.ceil(totalPages / windowSize) }, (_, index) => slides.slice(index * windowSize, (index + 1) * windowSize))
      : [slides];
    send("accepted", {
      generationId,
      version: isWordConverter ? (payload.wordV3 ? "HTMLAnythingWordSkillShellV2" : "HTMLAnythingWordWindowedV1") : "HTMLAnythingSingleRequestV5",
      totalPages,
      batches: batches.length,
      modelRequests: batches.length,
      source: isWordConverter ? "word-converter" : source || "quick-create",
    });
    send("design_started", { generationId, progress: 5, message: "正在锁定所选 HTML Anything 风格和页面结构。" });
    // Do not retain a full HTML document for every Word window. Keeping both
    // `result.html` and `result.sections` for all windows doubled the peak
    // memory and made large DOCX files prone to Cloudflare 1102 failures.
    let firstHtml = "";
    const additionalSections = [];
    let completedPages = 0;
    const style = payload.style || "teaching";
    const customStyle = normalizeCustomStyle(payload.customStyle);
    send("design_ready", { generationId, skillId: style, progress: 12 });
    for (let index = 0; index < batches.length; index += 1) {
      const batchSlides = batches[index];
      send("batch_started", { generationId, batch: index + 1, batches: batches.length, pages: batchSlides.map((slide) => slide.page), progress: null, phase: "provider_waiting", message: "模型已连接，等待首个正文片段。" });
      let pendingPreview = "";
      let sawProviderDelta = false;
      let firstTokenSent = false;
      // Word windows already carry their page-level summary and image slots.
      // Avoid resending the entire Markdown/asset payload for every window;
      // large DOCX jobs otherwise waste Worker resources before the model
      // returns its first token.
      const windowSourceBrief = isWordConverter
        ? (payload.wordV3
          ? `CONFIRMED MARKDOWN PAGE RECORDS — do not summarise again; compose these exact pages:\n${JSON.stringify(batchSlides.map((slide) => ({ page: slide.page, title: slide.title, takeaway: slide.takeaway, points: slide.points, layout: slide.layout, imageIds: slide.imageIds })))}`
          : `${String(payload.sourceBrief || "").slice(0, 6000)}\n\nCURRENT WORD WINDOW:\n${JSON.stringify(batchSlides.map((slide) => ({ page: slide.page, title: slide.title, takeaway: slide.takeaway, points: slide.points, imageIds: slide.imageIds })))}`)
        : (payload.sourceBrief || payload.topic || "");
      const windowReferencePack = isWordConverter && payload.referencePack
        ? { ...payload.referencePack, outlineText: "", files: Array.isArray(payload.referencePack.files) ? payload.referencePack.files.slice(0, 4) : [], images: Array.isArray(payload.referencePack.images) ? payload.referencePack.images.slice(0, 8).map((image) => ({ name: image.name || image.alt || image.id, alt: image.alt, id: image.id })) : [] }
        : (payload.referencePack || null);
      if (isWordConverter && payload.wordV3 && windowReferencePack) {
        const windowImageIds = new Set(batchSlides.flatMap((slide) => Array.isArray(slide.imageIds) ? slide.imageIds : []));
        windowReferencePack.images = (Array.isArray(payload.referencePack?.images) ? payload.referencePack.images : [])
          .filter((image) => windowImageIds.has(image.id))
          .map((image) => ({ name: image.name || image.alt || image.id, alt: image.alt, id: image.id }));
      }
      const generateWindow = isWordConverter ? generateHtmlAnythingChunk : generateHtmlAnythingSingle;
      const result = await generateWindow({
        skills: HTML_ANYTHING_SKILLS,
        config,
        slides: batchSlides,
        style,
        customStyle,
        mode: payload.mode || payload.source || "quick-create",
        sourceBrief: payload.wordV3 ? "DESIGN SPEC:\\n" + JSON.stringify(payload.designSpec || {}) + "\\n" + windowSourceBrief : windowSourceBrief,
        referencePack: windowReferencePack,
        totalPages,
        pageStart: batchSlides[0].page,
        pageEnd: batchSlides[batchSlides.length - 1].page,
        allowPartial: isWordConverter,
        wordV3: Boolean(payload.wordV3),
        callModel: (prompt, context) => config.mode === "ai_api"
          ? callAiPromptStreaming(prompt, config, context.referencePack, (delta, whole) => {
              sawProviderDelta = true;
              pendingPreview += String(delta || "");
              if (!firstTokenSent) {
                firstTokenSent = true;
                send("provider_first_token", { generationId, batch: index + 1, bytes: whole.length, phase: "provider_streaming" });
              }
              // Send only newly received bytes. The former implementation sent
              // the complete accumulated document every 2 KB, which caused
              // quadratic JSON serialization and Worker CPU exhaustion.
              if (pendingPreview.length >= 2048) {
                const chunk = pendingPreview;
                pendingPreview = "";
                send("html_delta", { generationId, batch: index + 1, html: chunk, delta: true, bytes: chunk.length });
              }
            })
          : callWorkflowPrompt(prompt, config, context.referencePack),
        extractHtml,
      });
      if (pendingPreview) send("html_delta", { generationId, batch: index + 1, html: pendingPreview, delta: true, bytes: pendingPreview.length });
      // Blocking/workflow providers do not invoke the streaming callback. Send
      // their validated document once so the browser can assemble the same
      // inline job without a second request to an isolate-local output URL.
      if (!sawProviderDelta && result.html) send("html_delta", { generationId, batch: index + 1, html: result.html, delta: true, bytes: result.html.length });
      if (!firstHtml) firstHtml = result.html;
      else additionalSections.push(...(result.sections || []));
      completedPages += result.pageCount || batchSlides.length;
      send("pages_ready", { generationId, batch: index + 1, pages: batchSlides.map((slide) => slide.page), completedPages, progress: Math.round(12 + ((index + 1) / batches.length) * 76) });
    }
    const html = isWordConverter ? mergeDeck(firstHtml, additionalSections) : firstHtml;
    const actualPages = extractSlideSections(html).length;
    if (actualPages !== totalPages) throw new Error(`AI returned ${actualPages}/${totalPages} pages after ${isWordConverter ? "Word window merge" : "single-request generation"}.`);
    send("quality_check", { generationId, progress: 96, checks: ["standalone-html", "inline-style", "page-count", "no-external-dependencies", "selected-skill"] });
    const job = payload.wordWindowOnly
      ? { id: generationId, fileName: String(payload.filename || "word-document.docx"), slides: totalPages, status: "window_completed", updatedAt: new Date().toISOString(), inlinePreviewHtml: html }
      : makeHtmlAnythingDirectJob(payload, slides, html, skillIdForStyle(style), generationId, batches.length, isWordConverter ? (payload.wordV3 ? "html-anything-word-skill-shell-v2" : "html-anything-word-windowed-stream") : "html-anything-single-request-stream");
    // Never put the full HTML and the generated scroll document inside the
    // final SSE JSON event. The browser already receives the HTML as deltas;
    // the Worker keeps the complete copy for ZIP/output compatibility.
    send("complete", { generationId, progress: 100, job: publicJob(job) });
  });
}

function normalizeWordV3Text(value, limit = 520) {
  return String(value || "")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, "")
    .replace(/[*_~`]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, limit);
}

function normalizeWordV3Outline(raw, fallbackTitle = "Word 文档摘要") {
  const input = raw && typeof raw === "object" ? raw : {};
  const slides = Array.isArray(input.slides) ? input.slides : [];
  const normalized = slides.map((slide, index) => ({
    pageId: String(slide.pageId || `word-page-${index + 1}`),
    page: index + 1,
    role: String(slide.role || (index === 0 ? "cover" : "content")).slice(0, 40),
    title: normalizeWordV3Text(slide.title || `第 ${index + 1} 页`, 120),
    coreClaim: normalizeWordV3Text(slide.coreClaim || slide.takeaway || "", 360),
    body: (Array.isArray(slide.body) ? slide.body : Array.isArray(slide.points) ? slide.points : [])
      .map((item) => normalizeWordV3Text(item, 240)).filter(Boolean).slice(0, 6),
    sourceBlockIds: (Array.isArray(slide.sourceBlockIds) ? slide.sourceBlockIds : [])
      .map((id) => String(id).slice(0, 80)).filter(Boolean).slice(0, 24),
    imageIds: (Array.isArray(slide.imageIds) ? slide.imageIds : []).map((id) => String(id).slice(0, 100)).filter(Boolean).slice(0, 8),
    layout: normalizeWordV3Text(slide.layout || (index === 0 ? "cover" : "title-and-body"), 60),
  })).filter((slide) => slide.title || slide.coreClaim || slide.body.length);
  return {
    version: "WordDeckOutlineV3",
    title: normalizeWordV3Text(input.title || fallbackTitle, 160) || fallbackTitle,
    summary: normalizeWordV3Text(input.summary || input.abstract || "", 900),
    slides: normalized,
  };
}

function wordV3DesignSpec(style = "teaching", customStyle = null) {
  const profile = styleProfilePreset(style, customStyle);
  return {
    version: "DeckDesignSpecV2",
    style: String(style || "teaching"),
    skillId: skillIdForStyle(style),
    skillCommit: "d0efb1e",
    profile: {
      styleName: profile.styleName,
      colorPalette: profile.colorPalette,
      typography: profile.typography,
      layoutPattern: profile.layoutPattern,
      visualMotifs: profile.visualMotifs,
      spacingRules: profile.spacingRules,
    },
    contract: [
      "Use one shared visual system for every page.",
      "Use a fixed 1280x720 slide canvas and inline CSS.",
      "Attach the selected HTML Anything Skill shell to every rendering window.",
      "Use one clear claim per page and 3-6 concise supporting points.",
      "Never expose Markdown syntax, asset:// URLs, or raw HTML instructions to the audience.",
    ],
  };
}

function wordV3Prompt(payload, phase, designSpec) {
  const blocks = Array.isArray(payload.sourceBlocks) ? payload.sourceBlocks : [];
  const summaries = Array.isArray(payload.summaries) ? payload.summaries : [];
  const title = String(payload.filename || "Word document").replace(/\.docx?$/i, "");
  const styleText = JSON.stringify(designSpec || wordV3DesignSpec(payload.style, payload.customStyle));
  if (phase === "reduce") {
    return `You are the editorial planning stage of a Word-to-presentation pipeline.\n\n`+
      `Read the chunk summaries below and produce a concise presentation outline. Do not copy the document paragraph by paragraph. Preserve facts, numbers, citations and sourceBlockIds, but rewrite each page into one claim plus short supporting points.\n`+
      `Return JSON only: {"title":"...","summary":"...","slides":[{"pageId":"word-page-1","role":"cover|section|content|evidence|conclusion","title":"...","coreClaim":"...","body":["..."],"sourceBlockIds":["block-1"],"imageIds":["word-image-1"],"layout":"cover|title-and-body|two-column|evidence|quote|conclusion"}]}.\n`+
      `Create as many pages as needed to cover the source. Do not invent page numbers or evidence.\n\nDocument title: ${title}\nDesign system (for later rendering only): ${styleText}\nChunk summaries:\n${JSON.stringify(summaries).slice(0, 90000)}`;
  }
  return `You are the source-reading stage of a Word-to-presentation pipeline.\n\n`+
    `Summarize the source blocks; do not reproduce prose. Extract claims, decisions, facts, numbers, citations and image references. Return JSON only: {"summary":"...","items":[{"sourceBlockIds":["block-1"],"claim":"...","points":["..."],"facts":["..."],"imageIds":["word-image-1"]}]}. Keep each claim short and source-grounded. Never output Markdown syntax or asset URLs as visible text.\n\nDocument title: ${title}\nSource blocks:\n${JSON.stringify(blocks).slice(0, 90000)}`;
}

async function handleWordV3OutlineStream(request) {
  const payload = await readJson(request);
  return academicSse(async (emit) => {
    const config = mergedIntegrationConfig(payload.integration);
    if (!config.apiKey || !config.endpoint || config.mode === LOCAL_MODE) throw new Error("Word V3 summary requires a configured AI connection.");
    const phase = payload.phase === "reduce" ? "reduce" : "map";
    const designSpec = wordV3DesignSpec(payload.style || "teaching", normalizeCustomStyle(payload.customStyle));
    const total = Number(payload.totalChunks || 1);
    emit("accepted", { phase, progress: phase === "reduce" ? 70 : Math.min(60, 8 + (Number(payload.chunkIndex || 0) / Math.max(1, total)) * 52), designSpec });
    const prompt = wordV3Prompt(payload, phase, designSpec);
    const raw = config.mode === "workflow_api"
      ? await callWorkflowTextApi(prompt, config, { filename: payload.filename || "word-document.docx", phase })
      : await callAiTextApi(prompt, config, "Return strict JSON only. Do not return Markdown fences or commentary.");
    const parsed = parseAiJson(raw);
    if (phase === "reduce") {
      const outline = normalizeWordV3Outline(parsed, String(payload.filename || "Word 文档").replace(/\.docx?$/i, ""));
      if (!outline.slides.length) throw new Error("Word V3 summary returned no usable slides.");
      emit("outline_ready", { phase, progress: 92, pageCount: outline.slides.length, outline, designSpec });
      emit("complete", { phase, progress: 100, outline, designSpec });
      return;
    }
    const items = Array.isArray(parsed?.items) ? parsed.items : [];
    const summary = {
      chunkIndex: Number(payload.chunkIndex || 0),
      sourceBlockIds: (Array.isArray(payload.sourceBlocks) ? payload.sourceBlocks : []).map((block) => String(block.id || "")).filter(Boolean),
      summary: normalizeWordV3Text(parsed?.summary || "", 1200),
      items: items.map((item) => ({
        sourceBlockIds: (Array.isArray(item.sourceBlockIds) ? item.sourceBlockIds : []).map((id) => String(id).slice(0, 80)).filter(Boolean).slice(0, 24),
        claim: normalizeWordV3Text(item.claim || "", 360),
        points: (Array.isArray(item.points) ? item.points : []).map((value) => normalizeWordV3Text(value, 240)).filter(Boolean).slice(0, 6),
        facts: (Array.isArray(item.facts) ? item.facts : []).map((value) => normalizeWordV3Text(value, 240)).filter(Boolean).slice(0, 8),
        imageIds: (Array.isArray(item.imageIds) ? item.imageIds : []).map((id) => String(id).slice(0, 100)).filter(Boolean).slice(0, 8),
      })).filter((item) => item.claim || item.points.length || item.facts.length),
    };
    emit("summary_ready", { phase, progress: Math.min(65, 12 + ((Number(payload.chunkIndex || 0) + 1) / Math.max(1, total)) * 52), summary });
    emit("complete", { phase, progress: Math.min(65, 12 + ((Number(payload.chunkIndex || 0) + 1) / Math.max(1, total)) * 52), summary, designSpec });
  });
}

async function pdfAiEnhanceStream(request) {
  const payload = await readJson(request);
  return academicSse(async (emit) => {
    const config = mergedIntegrationConfig(payload.integration);
    if (!config.apiKey || !config.endpoint || config.mode === LOCAL_MODE) throw new Error("PDF AI optimization requires a configured AI connection.");
    const pages = Array.isArray(payload.pages) ? payload.pages.slice(0, 80) : [];
    if (!pages.length) throw new Error("PDF AI optimization requires extracted PDF pages.");
    emit("accepted", { progress: 2 });
    emit("parse_ready", { progress: 18, pageCount: pages.length });
    const prompt = `Return JSON only. You are optimizing an imported PDF into editable 16:9 HTML slides. Do not invent facts, numbers, citations, or images. You may only use source page numbers listed below. Return {"patches":[{"page":1,"layoutPreset":"auto","accentColor":"#RRGGBB","titleScale":1,"bodyScale":1,"imageFit":"contain"}]}. Each patch refers to output slide page, not source page. Use the selected style (${payload.style || "source"}) and choose safe, readable layouts.\n\nSource pages:\n${JSON.stringify(pages.map((page) => ({ page: page.page, title: String(page.title || "").slice(0, 220), text: String(page.text || "").slice(0, 2600) })))}\n\nOutput slides:\n${JSON.stringify((payload.slides || []).map((slide) => ({ page: slide.page, sourcePages: slide.sourcePages, text: String(slide.text || "").slice(0, 700) })))} `;
    emit("structure_ready", { progress: 38, message: "AI is analyzing PDF sections and source-page evidence." });
    const raw = config.mode === "workflow_api" ? await callWorkflowTextApi(prompt, config, { filename: payload.filename || "document.pdf" }) : await callAiTextApi(prompt, config, "Return only strict JSON. Source evidence is immutable.");
    const parsed = parseAiJson(raw);
    const allowed = new Set((payload.slides || []).map((slide, index) => Number(slide.page || index + 1)));
    const patches = (Array.isArray(parsed?.patches) ? parsed.patches : []).filter((patch) => allowed.has(Number(patch.page))).map((patch) => ({ page: Number(patch.page), layoutPreset: String(patch.layoutPreset || "auto"), accentColor: /^#[0-9a-f]{6}$/i.test(String(patch.accentColor || "")) ? patch.accentColor : undefined, titleScale: Math.max(.92, Math.min(1.08, Number(patch.titleScale || 1))), bodyScale: Math.max(.92, Math.min(1.08, Number(patch.bodyScale || 1))), imageFit: patch.imageFit === "cover" ? "cover" : "contain" }));
    emit("page_plan_ready", { progress: 76, pageCount: patches.length });
    emit("quality_check", { progress: 92, report: { outputSlides: allowed.size, patches: patches.length, sourcePages: pages.length } });
    emit("complete", { progress: 100, plan: { version: "PdfEnhancementPlanV1", patches } });
  });
}

// PDF report generation follows the pdf2ppt_skill workflow: source extraction
// -> reading matrix -> figure/table evidence mapping -> page specifications.
// The browser owns PDF.js and binary assets; this Worker only plans source-locked
// layouts and returns deterministic patches for the shared PPT renderer.
async function pdfPresentationPlanStream(request, protocol = "pdf2ppt-skill-v1") {
  const payload = await readJson(request);
  return academicSse(async (emit) => {
    const generationId = `PDF-PRESENTATION-${Date.now().toString(36).toUpperCase()}-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
    const config = mergedIntegrationConfig(payload.integration);
    if (!config.apiKey || !config.endpoint || config.mode === LOCAL_MODE) {
      throw new Error("PDF 学术汇报需要已配置的 AI 连接；原样还原模式无需 AI。");
    }
    const source = normalizeAcademicSource(payload.source || {});
    if (!source.textExtracted) throw new Error("PDF 未提取到可用文本；扫描型 PDF 当前请先使用原样还原模式。");
    const options = { ...(payload.options || {}), style: payload.style || payload.options?.style || "academic", slideCount: payload.slideCount || payload.options?.slideCount || 8 };
    emit("accepted", { generationId, protocol, progress: 2, pageCount: source.pages.length });
    emit("parse_ready", { generationId, progress: 20, pageCount: source.pages.length, textLength: source.text.length });
    const readingMatrix = buildReadingMatrix(source);
    emit("reading_matrix_ready", { generationId, progress: 34, evidenceCount: source.figures.length + source.tables.length, readingMatrix });
    const prompt = academicPlanPrompt(source, options);
    emit("evidence_mapped", { generationId, progress: 46, figures: source.figures.length, tables: source.tables.length });
    const parsed = await callAcademicJson(prompt, config, "Return only strict JSON. Use only the supplied source pages and evidence IDs. Do not invent facts, numbers, citations, or assets.", payload.referencePack || null, "PdfAcademicDeckPlanV1");
    const plan = normalizeAcademicPlan(parsed.value, source, options);
    const layoutMap = { cover: "cover-title", context: "columns", method: "process", evidence: "image-led", results: "image-led", discussion: "focus", closing: "qa-closing" };
    const patches = plan.slides.map((slide, index) => ({
      page: index + 1,
      layoutPreset: layoutMap[slide.layoutFamily] || "auto",
      density: slide.layoutFamily === "cover" ? "airy" : "balanced",
      imageFit: "contain",
      sourceRefs: slide.sourceRefs,
      evidence: slide.evidence,
    }));
    emit("page_plan_ready", { generationId, progress: 72, pageCount: plan.slides.length, jsonRepaired: parsed.repaired });
    const quality = {
      sourcePages: source.pages.length,
      outputPages: plan.slides.length,
      figures: source.figures.length,
      tables: source.tables.length,
      evidenceLinkedPages: plan.slides.filter((slide) => Array.isArray(slide.evidence) && slide.evidence.length).length,
      sourceLocked: true,
    };
    emit("quality_check", { generationId, progress: 92, report: quality });
    emit("complete", { generationId, progress: 100, plan: { version: protocol === "pdf-academic-narrative-v2" ? "PdfAcademicNarrativePlanV2" : "PdfAcademicDeckPlanV1", protocol, ...plan, patches, readingMatrix }, source: { ...source, figures: source.figures.map(({ assetRef, thumbnail, ...figure }) => figure), tables: source.tables } });
  });
}

async function pdfPresentationNarrativeV2Stream(request) {
  return pdfPresentationPlanStream(request, "pdf-academic-narrative-v2");
}

// PDF Research V3 is a deliberately separate, two-pass path.  The first pass
// turns the browser-extracted source into a compact Markdown/outline contract;
// the second pass composes slides from that contract and the source-locked
// figure/table inventory.  It never receives full-page PDF screenshots.
function pdfResearchInventory(source) {
  return (source.figures || []).map((item) => ({ id: item.id, kind: item.kind || "figure", page: item.page, caption: item.caption, context: item.context, bbox: item.bbox, width: item.width, height: item.height }))
    .concat((source.tables || []).map((item) => ({ id: item.id, kind: "table", page: item.page, caption: item.caption, context: item.context, headers: item.headers, rows: item.rows })));
}

function normalizePdfResearchOutline(value, source, markdown) {
  const pageSet = new Set((source.pages || []).map((page) => Number(page.page)));
  const evidenceSet = new Set(pdfResearchInventory(source).map((item) => item.id));
  const raw = Array.isArray(value?.outline) ? value.outline : [];
  const outline = raw.slice(0, 14).map((item, index) => ({
    page: index + 1,
    role: ["cover", "context", "method", "evidence", "results", "discussion", "closing"].includes(item?.role) ? item.role : (index === 0 ? "cover" : "context"),
    title: String(item?.title || `Section ${index + 1}`).replace(/\s+/g, " ").trim().slice(0, 180),
    coreClaim: String(item?.coreClaim || item?.claim || "").replace(/\s+/g, " ").trim().slice(0, 420),
    body: (Array.isArray(item?.body) ? item.body : []).map((line) => String(line).replace(/\s+/g, " ").trim().slice(0, 155)).filter(Boolean).slice(0, 4),
    visualPolicy: ["cover", "closing", "discussion"].includes(item?.role) ? "none" : (item?.visualPolicy === "required" ? "required" : "optional"),
    evidenceNeed: item?.evidenceNeed === "required" ? "required" : item?.evidenceNeed === "none" ? "none" : "optional",
    evidenceIds: (["cover", "closing", "discussion"].includes(item?.role) || item?.visualPolicy === "none") ? [] : (Array.isArray(item?.evidenceIds) ? item.evidenceIds : []).map(String).filter((id) => evidenceSet.has(id)).slice(0, 2),
    sourceRefs: Array.from(new Set((Array.isArray(item?.sourceRefs) ? item.sourceRefs : []).map(String).filter((ref) => /^p\.\d+$/i.test(ref) && pageSet.has(Number(ref.slice(2)))))).slice(0, 6),
    speakerNotes: String(item?.speakerNotes || "").replace(/\s+/g, " ").trim().slice(0, 900),
  })).filter((item) => item.title || item.coreClaim || item.body.length);
  const matrix = value?.readingMatrix && typeof value.readingMatrix === "object" ? {
    researchQuestion: String(value.readingMatrix.researchQuestion || "").slice(0, 600),
    gap: String(value.readingMatrix.gap || "").slice(0, 600),
    method: String(value.readingMatrix.method || "").slice(0, 600),
    evidenceIds: (Array.isArray(value.readingMatrix.evidenceIds) ? value.readingMatrix.evidenceIds : []).map(String).filter((id) => evidenceSet.has(id)).slice(0, 20),
    result: String(value.readingMatrix.result || "").slice(0, 600),
    limitations: String(value.readingMatrix.limitations || "").slice(0, 600),
  } : buildReadingMatrix(source);
  return { version: "PdfResearchOutlineV4", title: String(value?.title || source.title || "PDF presentation").slice(0, 260), language: source.language === "en" ? "en" : "zh", readingMatrix: matrix, outline, researchMarkdown: String(markdown || "").slice(0, 140000), sourceLocked: true };
}

async function pdfResearchOutlineStream(request) {
  const payload = await readJson(request);
  return academicSse(async (emit) => {
    const v5 = String(request.url || "").includes("/v5/");
    const generationId = `PDF-RESEARCH-OUTLINE-${Date.now().toString(36).toUpperCase()}-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
    const config = mergedIntegrationConfig(payload.integration);
    if (!config.apiKey || !config.endpoint || config.mode === LOCAL_MODE) throw new Error("PDF 研究大纲需要已配置的 AI 连接。");
    const source = normalizeAcademicSource(payload.source || {});
    if (!source.textExtracted) throw new Error("PDF 没有可提取文本，无法生成研究大纲；请切换原样还原模式。");
    const markdown = String(payload.researchMarkdown || "").slice(0, 140000);
    const inventory = pdfResearchInventory(source);
    emit("accepted", { generationId, progress: 2, pageCount: source.pages.length });
    emit("markdown_ready", { generationId, progress: 26, pageCount: source.pages.length, completedPages: source.pages.length, markdownBytes: markdown.length, assetCount: inventory.length });
    const outputLanguage = source.language === "en" ? "English" : "Simplified Chinese";
    const prompt = `Return one strict JSON object only. Read the supplied source Markdown and evidence inventory, then produce a concise presentation outline. Summarize and paraphrase; never copy full paragraphs. Every claim must be supported by source page references or an evidence ID. Do not invent facts, numbers, citations, institutions, or images.
Schema: {"title":"...","readingMatrix":{"researchQuestion":"","gap":"","method":"","evidenceIds":[],"result":"","limitations":""},"outline":[{"page":1,"role":"cover|context|method|evidence|results|discussion|closing","title":"","coreClaim":"","body":["<=155 chars"],"visualPolicy":"none|optional|required","evidenceNeed":"none|optional|required","evidenceIds":["id"],"sourceRefs":["p.1"],"speakerNotes":""}]}
Rules: output all human-readable text in ${outputLanguage}; do not translate model names, formulas, numbers, citations, evidence IDs, or source page references. Cover, agenda, section-divider, discussion and closing pages must use visualPolicy=none. A visual is optional by default; do not add one only to fill a column. Use 8-14 pages when the source is long; cover, research question/gap, method, data/experiment, results, limitations, and conclusion must be represented when supported by the source. One core claim per page; at most 4 body lines per page; select a figure/table only when its caption, geometry and context support the page claim; include sourceRefs for every page. Never use a full-page PDF screenshot or a crop of ordinary paragraphs. Keep the selected style ${payload.style || "conference-paper-light"} in mind. Different page roles must use different compositions.
SOURCE MARKDOWN:
${markdown}
EVIDENCE INVENTORY:
${JSON.stringify(inventory)}`;
    emit("outline_started", { generationId, progress: 38, pageCount: source.pages.length, completedPages: source.pages.length, message: "AI is reading the Markdown outline and evidence inventory." });
    const parsed = await callAcademicJson(prompt, config, "Return only strict JSON. The source and evidence inventory are immutable.", payload.referencePack || null, "PdfResearchOutlineV3");
    const outline = normalizePdfResearchOutline(parsed.value, source, markdown);
    const { researchMarkdown: _researchMarkdown, ...outlineForClient } = outline;
    emit("outline_ready", { generationId, progress: 84, pageCount: source.pages.length, completedPages: source.pages.length, outline: outlineForClient, jsonRepaired: parsed.repaired });
    emit("quality_check", { generationId, progress: 96, pageCount: source.pages.length, completedPages: source.pages.length, report: { pages: outline.outline.length, evidenceLinkedPages: outline.outline.filter((item) => item.evidenceIds.length).length, sourceLocked: true } });
    // Markdown and the full asset inventory are already available to the
    // browser from the parsed source bundle. Keep the terminal SSE frame
    // small so the final complete event cannot be lost behind a large body.
    emit("complete", { generationId, progress: 100, pageCount: source.pages.length, completedPages: source.pages.length, protocol: v5 ? "pdf-research-v5" : "pdf-research-v3", outline: outlineForClient });
  });
}

function normalizePdfResearchDeck(value, source, outline, style) {
  const allowedLayouts = new Set(["cover", "context", "method", "evidence", "results", "discussion", "closing"]);
  const evidenceSet = new Set(pdfResearchInventory(source).map((item) => item.id));
  const slides = (Array.isArray(value?.slides) ? value.slides : outline?.outline || []).slice(0, 14).map((item, index) => {
    const locked = Array.isArray(outline?.slides) ? outline.slides[index] : Array.isArray(outline?.outline) ? outline.outline[index] : null;
    const sourceItem = locked || item;
    const layoutFamily = allowedLayouts.has(item?.layoutFamily || sourceItem?.layoutFamily || sourceItem?.role) ? (item?.layoutFamily || sourceItem?.layoutFamily || sourceItem?.role) : (index === 0 ? "cover" : "context");
    const visualPolicy = ["cover", "closing", "discussion"].includes(layoutFamily) || sourceItem?.visualPolicy === "none" ? "none" : (sourceItem?.visualPolicy === "required" ? "required" : "optional");
    return {
    page: index + 1,
    title: String(sourceItem?.title || `Page ${index + 1}`).replace(/\s+/g, " ").trim().slice(0, 180),
    coreClaim: String(sourceItem?.coreClaim || sourceItem?.claim || "").replace(/\s+/g, " ").trim().slice(0, 420),
    layoutFamily,
    visualPolicy,
    evidence: visualPolicy === "none" ? [] : (Array.isArray(item?.evidence) ? item.evidence : (Array.isArray(sourceItem?.evidence) ? sourceItem.evidence : Array.isArray(sourceItem?.evidenceIds) ? sourceItem.evidenceIds.map((id) => ({ id })) : [])).map((entry) => ({ id: String(entry?.id || "") })).filter((entry) => evidenceSet.has(entry.id)).slice(0, 2),
    sourceRefs: Array.from(new Set((Array.isArray(sourceItem?.sourceRefs) ? sourceItem.sourceRefs : []).map(String).filter((ref) => /^p\.\d+$/i.test(ref)))).slice(0, 6),
    body: (Array.isArray(sourceItem?.body) ? sourceItem.body : []).map((line) => String(line).replace(/\s+/g, " ").trim().slice(0, 155)).filter(Boolean).slice(0, 6),
    speakerNotes: String(item?.speakerNotes || sourceItem?.speakerNotes || "").replace(/\s+/g, " ").trim().slice(0, 900),
  };
  });
  return { version: "PdfAcademicDeckSpecV3", title: String(value?.title || outline?.title || source.title).slice(0, 260), style: style || value?.style || "conference-paper-light", slides, sourceLocked: true };
}

async function pdfResearchDeckStream(request) {
  const payload = await readJson(request);
  return academicSse(async (emit) => {
    const v5 = String(request.url || "").includes("/v5/");
    const generationId = `PDF-RESEARCH-DECK-${Date.now().toString(36).toUpperCase()}-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
    const config = mergedIntegrationConfig(payload.integration);
    if (!config.apiKey || !config.endpoint || config.mode === LOCAL_MODE) throw new Error("PDF 页面构图需要已配置的 AI 连接。");
    const source = normalizeAcademicSource(payload.source || {});
    const outline = payload.outline || {};
    const inventory = pdfResearchInventory(source);
    emit("accepted", { generationId, progress: 2, pageCount: source.pages.length, completedPages: source.pages.length });
    emit("outline_ready", { generationId, progress: 22, pageCount: source.pages.length, completedPages: source.pages.length, pages: Array.isArray(outline.outline) ? outline.outline.length : 0 });
    const outputLanguage = source.language === "en" ? "English" : "Simplified Chinese";
    const prompt = `Return one strict JSON object only. Compose an editable academic presentation from the supplied outline and source-locked evidence inventory. Summarize; do not paste the PDF, do not use page screenshots, and do not invent facts. Select evidence by ID only.
Schema: {"title":"...","style":"${payload.style || "conference-paper-light"}","slides":[{"title":"","coreClaim":"","layoutFamily":"cover|context|method|evidence|results|discussion|closing","visualPolicy":"none|optional|required","evidence":[{"id":"..."}],"sourceRefs":["p.1"],"body":["<=155 chars"],"speakerNotes":""}]}
Rules: output all human-readable text in ${outputLanguage}; preserve user-edited outline page order and wording unless a layout-only adjustment is required; never translate numbers or source refs. Cover, agenda, section-divider, discussion and closing have visualPolicy=none and no evidence. A page may be text-only; do not add a placeholder visual. Use at most two relevant evidence IDs per slide, only when the source asset is a validated figure/table/diagram and it supports the claim. Never crop or embed a full PDF page. All IDs and refs must come from the inventory/outline; keep the selected style visually distinct.
OUTLINE:
${JSON.stringify(outline)}
EVIDENCE INVENTORY:
${JSON.stringify(inventory)}`;
    emit("composition_started", { generationId, progress: 42, pageCount: source.pages.length, completedPages: source.pages.length, message: "AI is mapping claims to selected figure/table assets." });
    const parsed = await callAcademicJson(prompt, config, "Return only strict JSON. Never alter source facts or evidence IDs.", payload.referencePack || null, "PdfAcademicDeckSpecV3");
    const plan = normalizePdfResearchDeck(parsed.value, source, outline, payload.style);
    emit("composition_ready", { generationId, progress: 84, pageCount: plan.slides.length, completedPages: plan.slides.length, jsonRepaired: parsed.repaired });
    emit("quality_check", { generationId, progress: 96, pageCount: plan.slides.length, completedPages: plan.slides.length, report: { pageCount: plan.slides.length, evidenceLinkedPages: plan.slides.filter((slide) => slide.evidence.length).length, sourceLocked: true } });
    emit("complete", { generationId, progress: 100, pageCount: plan.slides.length, completedPages: plan.slides.length, protocol: v5 ? "pdf-research-v5" : "pdf-research-v4", plan: { ...plan, version: v5 ? "PdfAcademicDeckSpecV5" : "PdfAcademicDeckSpecV4", language: source.language === "en" ? "en" : "zh" } });
  });
}

// V4 is the public PDF Research contract.  Keep V3 handlers available for
// old saved jobs, while new clients use the explicit V4 routes.
async function pdfResearchOutlineV4Stream(request) { return pdfResearchOutlineStream(request); }
async function pdfResearchDeckV4Stream(request) { return pdfResearchDeckStream(request); }
async function pdfResearchOutlineV5Stream(request) { return pdfResearchOutlineStream(request); }
async function pdfResearchDeckV5Stream(request) { return pdfResearchDeckStream(request); }

function normalizePptEnhancementPatches(value, slides = []) {
  const allowedPages = new Set((Array.isArray(slides) ? slides : []).map((slide, index) => Number(slide.page || index + 1)));
  const raw = Array.isArray(value?.patches) ? value.patches : [];
  const presets = new Set(["auto", "source", "cover-title", "section-divider", "text-focus", "image-led", "comparison", "process", "qa-closing"]);
  const densities = new Set(["airy", "balanced", "compact"]);
  return raw.map((patch) => {
    const page = Number(patch?.page);
    if (!allowedPages.has(page)) return null;
    const layoutPreset = String(patch?.layoutPreset || "auto").trim().toLowerCase();
    return {
      page,
      layoutPreset: presets.has(layoutPreset) ? layoutPreset : "auto",
      density: densities.has(patch?.density) ? patch.density : "balanced",
      imageFit: patch?.imageFit === "cover" ? "cover" : "contain",
      titleScale: Math.max(0.92, Math.min(1.08, Number(patch?.titleScale || 1))),
      bodyScale: Math.max(0.92, Math.min(1.08, Number(patch?.bodyScale || 1))),
      accentColor: /^#[0-9a-f]{6}$/i.test(String(patch?.accentColor || "")) ? String(patch.accentColor) : undefined,
    };
  }).filter(Boolean);
}

async function handlePptAiEnhance(request) {
  const payload = await readJson(request);
  const config = mergedIntegrationConfig(payload.integration);
  if (!config.apiKey || !config.endpoint || config.mode === LOCAL_MODE) {
    return json({ error: "ai_config_required", message: "PPT AI 优化需要已配置的 AI API。" }, 400);
  }
  const slides = normalizeSlidesPayload(payload.slides);
  if (!slides.length) return json({ error: "slides_required", message: "没有可优化的 PPT 页面。" }, 400);
  const generationId = `PPT-AI-${Date.now().toString(36).toUpperCase()}-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
  const source = slides.map((slide, index) => ({
    page: Number(slide.page || index + 1),
    text: String(slide.text || "").slice(0, 1600),
    imageCount: Number(slide.imageCount || slide.images?.length || 0),
    elements: Array.isArray(slide.elements) ? slide.elements.slice(0, 20).map((element) => ({ type: element.type, text: String(element.text || "").slice(0, 280) })) : [],
  }));
  const style = String(payload.style || payload.stylePack?.id || "teaching");
  const prompt = `Return one strict JSON object only. Optimize the existing PPT layout without changing its text, numbers, images, or page count.\nSelected style: ${style}\nPages:\n${JSON.stringify(source)}\nSchema: {"patches":[{"page":1,"layoutPreset":"auto","density":"balanced","imageFit":"contain","titleScale":1,"bodyScale":1,"accentColor":"#2563eb"}]}\nRules: include at most one patch per input page; page must be an input page number; use only safe layoutPreset values auto, source, cover-title, section-divider, text-focus, image-led, comparison, process, qa-closing; never invent content.`;
  let raw;
  try {
    raw = config.mode === "workflow_api"
      ? await callWorkflowTextApi(prompt, config, { task: "ppt_layout_enhancement", generationId })
      : await callAiTextApi(prompt, config, "You are a PPT layout optimizer. Return strict JSON only.");
  } catch (error) {
    return json({ error: "ppt_ai_provider_error", generationId, message: String(error?.message || error) }, 502);
  }
  let parsed;
  try {
    parsed = parseAiJson(raw);
  } catch {
    try {
      const repairPrompt = `Convert the following model output into the exact JSON schema {"patches":[{"page":1,"layoutPreset":"auto","density":"balanced","imageFit":"contain","titleScale":1,"bodyScale":1,"accentColor":"#2563eb"}]}. Preserve only valid page numbers from ${JSON.stringify(source.map((slide) => slide.page))}. Return JSON only.\nMODEL OUTPUT:\n${String(raw || "").slice(0, 24000)}`;
      const repaired = config.mode === "workflow_api"
        ? await callWorkflowTextApi(repairPrompt, config, { task: "ppt_layout_json_repair", generationId })
        : await callAiTextApi(repairPrompt, config, "Return strict JSON only.");
      parsed = parseAiJson(repaired);
    } catch (error) {
      return json({ error: "ppt_ai_invalid_json", generationId, message: "AI 返回的 PPT 布局不是有效 JSON。" }, 502);
    }
  }
  const patches = normalizePptEnhancementPatches(parsed, slides);
  return json({ generationId, protocol: "ppt-layout-optimization-v4", patches, warnings: patches.length ? [] : ["AI 未返回可应用的布局补丁，保留源布局。"] });
}

async function academicPlanStream(request, output) {
  const payload = await readJson(request);
  return academicSse(async (emit) => {
    const generationId = `ACADEMIC-${Date.now().toString(36).toUpperCase()}-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
    emit("accepted", { generationId, output, progress: 2 });
    const source = normalizeAcademicSource(payload.source);
    if (!source.textExtracted) throw new Error("未检测到可提取文本。扫描型 PDF 当前不支持 OCR；请改用原样还原或补充研究大纲。");
    emit("stage", { stage: "source_validation", progress: 22, message: `已验证 ${source.pages.length} 页文本、${source.figures.length} 个图表。` });
    const options = payload.options || {};
    const config = mergedIntegrationConfig(payload.integration);
    let plan = output === "poster" ? fallbackAcademicPosterSpec(source, options) : fallbackAcademicPlan(source, options);
    let planningMode = "deterministic";
    if (output === "poster" && (!config.apiKey || !config.endpoint || config.mode === LOCAL_MODE)) {
      throw new Error("Academic poster generation requires a configured AI connection. Configure AI before generating.");
    }
    if (config.apiKey && config.endpoint && config.mode !== LOCAL_MODE) {
      emit("stage", { stage: "source_plan", progress: 46, message: "正在依据论文原文规划研究叙事与证据页面…", mode: "ai" });
      try {
        const prompt = output === "poster" ? academicPosterPrompt(source, options) : academicPlanPrompt(source, options);
        const parsed = await callAcademicJson(
          prompt,
          config,
          "Return only valid JSON. Preserve all paper facts, evidence IDs and page references exactly.",
          payload.referencePack || null,
          output === "poster" ? "AcademicPosterSpecV3" : "AcademicDeckPlanV1",
        );
        plan = output === "poster"
          ? normalizeAcademicPosterSpec(parsed.value, source, options)
          : normalizeAcademicPlan(parsed.value, source, options);
        if (output === "poster") {
          const specQuality = auditAcademicPosterSpec(plan, source);
          if (!specQuality.ok) throw new Error(`学术海报证据质量检查未通过：${specQuality.warnings.join(", ")}`);
        }
        planningMode = "ai-source-locked";
        emit("stage", { stage: "json_validated", progress: 58, message: parsed.repaired ? "AI 规划 JSON 已完成格式修复与来源校验。" : "AI 规划 JSON 已通过结构与来源校验。", jsonRepaired: parsed.repaired });
      } catch (error) {
        if (output === "poster") throw error;
        emit("stage", { stage: "source_plan_fallback", progress: 57, message: `AI 规划不可用，已切换为来源锁定保底结构：${String(error?.message || error)}`, mode: "deterministic" });
      }
    }
    if (output === "poster" && planningMode !== "ai-source-locked") throw new Error("Academic poster AI planning did not complete.");
    emit("stage", { stage: "source_plan", progress: 64, message: "已建立来源锁定的研究问题、方法、证据和结果结构。", mode: planningMode });
    const report = output === "poster"
      ? auditAcademicPosterSpec(plan, source)
      : { sourcePages: source.pages.length, figures: source.figures.length, planPages: plan.slides.length };
    emit("quality_check", { generationId, progress: 88, report });
    emit("complete", { generationId, progress: 100, source, plan, templates: output === "poster" ? academicPosterTemplates() : undefined });
  });
}

async function academicRenderStream(request, output) {
  const payload = await readJson(request);
  return academicSse(async (emit) => {
    emit("accepted", { output, progress: 2 });
    const source = normalizeAcademicSource(payload.source);
    if (!source.textExtracted) throw new Error("未检测到可提取文本。扫描型 PDF 当前不支持 OCR。");
    const plan = output === "poster"
      ? normalizeAcademicPosterSpec(payload.plan, source, payload.options || {})
      : normalizeAcademicPlan(payload.plan, source, payload.options || {});
    if (output === "poster") {
      const specQuality = auditAcademicPosterSpec(plan, source);
      if (!specQuality.ok) throw new Error(`学术海报证据质量检查未通过：${specQuality.warnings.join(", ")}`);
    }
    emit("stage", { stage: "evidence_mapping", progress: 28, message: "正在绑定原始图表、表格与论文页码。" });
    const html = output === "poster" ? renderAcademicPosterHtml(plan, source, payload.options || {}) : renderAcademicDeckHtml(plan, source, payload.options || {});
    emit("partial_ready", { stage: "rendered", progress: 72, html, plan });
    const quality = auditAcademicHtml(html, source, output);
    emit("quality_check", { progress: 92, report: quality });
    if (!quality.ok) throw new Error(`学术质量检查未通过：${quality.warnings.join(", ")}`);
    emit("complete", { progress: 100, html, plan, quality });
  });
}

async function academicPosterReviewStream(request) {
  const payload = await readJson(request);
  return academicSse(async (emit) => {
    const config = mergedIntegrationConfig(payload.integration);
    if (!config.apiKey || !config.endpoint || config.mode === LOCAL_MODE) throw new Error("Academic poster review requires a configured AI connection.");
    const source = normalizeAcademicSource(payload.source);
    const plan = normalizeAcademicPosterSpec(payload.plan, source, payload.options || {});
    const deterministic = auditAcademicPosterSpec(plan, source);
    if (!deterministic.ok) throw new Error(`学术海报不得进入 AI 审查：${deterministic.warnings.join(", ")}`);
    emit("accepted", { progress: 2 });
    const prompt = `Return JSON only: {"approved":true,"notes":["..."],"layoutFixes":[{"sectionId":"results","instruction":"short layout-only instruction"}]}. Review this source-locked AcademicPosterSpecV3 for evidence coverage, title hierarchy, method/result balance, content density and source-page citations. Do not invent or rewrite data. Reject it if it uses unsupported evidence or empty evidence while the source contains figures.\n${JSON.stringify({ sourcePages: source.pages.length, evidence: source.figures.concat(source.tables).map((f) => ({ id: f.id, page: f.page, caption: f.caption })), sections: plan.sections })}`;
    emit("stage", { stage: "ai_review", progress: 48, message: "AI is reviewing evidence density and academic hierarchy." });
    const parsed = await callAcademicJson(prompt, config, "Return only strict JSON. Review layout and evidence without changing facts.", payload.referencePack || null, "AcademicPosterReviewV2");
    const result = parsed.value;
    if (result.approved !== true) throw new Error(`AI poster review rejected the draft: ${(result.notes || []).join("; ") || "no reason returned"}`);
    emit("quality_check", { progress: 90, report: { approved: true, notes: result.notes || [], deterministic, jsonRepaired: parsed.repaired } });
    emit("complete", { progress: 100, review: result });
  });
}

async function paper2PosterPlanStream(request) {
  const payload = await readJson(request);
  return academicSse(async (emit) => {
    const generationId = `PAPER2POSTER-${Date.now().toString(36).toUpperCase()}-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
    emit("accepted", { generationId, protocol: "paper2poster-v4", progress: 2 });
    const source = normalizeAcademicSource(payload.source);
    if (!source.textExtracted) throw new Error("No extractable paper text was found. Please upload a text-based PDF or DOCX.");
    const options = payload.options || {};
    const library = buildPaperAssetLibrary(source);
    emit("stage", { stage: "asset_library", progress: 18, message: `已锁定 ${source.pages.length} 页论文文本和 ${library.evidenceCount} 项原始证据资产。`, assetLibrary: library });
    const config = mergedIntegrationConfig(payload.integration);
    if (!config.apiKey || !config.endpoint || config.mode === LOCAL_MODE) throw new Error("Academic poster generation requires the existing shared AI configuration.");
    emit("stage", { stage: "narrative_plan", progress: 42, message: "正在从论文证据构建研究问题、方法、结果与启示的叙事结构。" });
    const parsed = await callAcademicJson(
      paper2PosterPrompt(source, options),
      config,
      "Return strict JSON only. Preserve facts, asset IDs and page references. Never generate decorative images or unsupported evidence.",
      payload.referencePack || null,
      "AcademicPosterSpecV4",
    );
    const plan = normalizePaper2PosterSpec(parsed.value, source, options);
    const quality = auditPaper2PosterQuality(plan, source);
    if (!quality.ok) throw new Error(`Academic poster source quality failed: ${quality.warnings.join(", ")}`);
    emit("quality_check", { generationId, progress: 86, report: quality });
    emit("complete", { generationId, progress: 100, protocol: "paper2poster-v4", source, plan, assetLibrary: library, templates: academicPosterTemplates(), jsonRepaired: parsed.repaired });
  });
}

async function paper2PosterRenderStream(request) {
  const payload = await readJson(request);
  return academicSse(async (emit) => {
    emit("accepted", { protocol: "paper2poster-v4", progress: 2 });
    const source = normalizeAcademicSource(payload.source);
    if (!source.textExtracted) throw new Error("No extractable paper text was found.");
    const options = payload.options || {};
    const plan = normalizePaper2PosterSpec(payload.plan, source, options);
    const preflight = auditPaper2PosterQuality(plan, source);
    if (!preflight.ok) throw new Error(`Academic poster preflight failed: ${preflight.warnings.join(", ")}`);
    emit("stage", { stage: "editable_render", progress: 36, message: "正在生成可编辑 HTML，并保留论文图表、表格和页码引用。" });
    const html = renderPaper2PosterHtml(plan, source, options);
    const quality = auditPaper2PosterQuality(plan, source, html);
    emit("quality_check", { progress: 88, report: quality });
    if (!quality.ok) throw new Error(`Academic poster render quality failed: ${quality.warnings.join(", ")}`);
    emit("complete", { progress: 100, protocol: "paper2poster-v4", html, plan, quality });
  });
}

async function paper2PosterReviewStream(request) {
  const payload = await readJson(request);
  return academicSse(async (emit) => {
    const source = normalizeAcademicSource(payload.source);
    const plan = normalizePaper2PosterSpec(payload.plan, source, payload.options || {});
    const deterministic = auditPaper2PosterQuality(plan, source, payload.html || "");
    emit("accepted", { protocol: "paper2poster-v4", progress: 2 });
    if (!deterministic.ok) throw new Error(`Academic poster quality failed: ${deterministic.warnings.join(", ")}`);
    // A deterministic source-and-layout audit is always available.  The
    // optional model reviewer only comments; it never rewrites paper facts.
    const config = mergedIntegrationConfig(payload.integration);
    let review = { approved: true, notes: ["Source, evidence and editable-layout checks passed."], layoutFixes: [] };
    if (config.apiKey && config.endpoint && config.mode !== LOCAL_MODE) {
      emit("stage", { stage: "commenter", progress: 48, message: "正在进行只读的层级、可读性与证据密度审校。" });
      const prompt = `Return JSON only: {"approved":true,"notes":["..."],"layoutFixes":[{"sectionId":"results","instruction":"layout-only instruction"}]}. Review AcademicPosterSpecV4. Do not alter or invent paper facts. Approve when citations, source assets and readable hierarchy are present.\n${JSON.stringify({ quality: deterministic, sections: plan.sections, assets: plan.assetLibrary.assets })}`;
      const parsed = await callAcademicJson(prompt, config, "Return strict JSON only. You are a non-destructive academic poster commenter.", payload.referencePack || null, "AcademicPosterReviewV4");
      review = { approved: parsed.value?.approved !== false, notes: Array.isArray(parsed.value?.notes) ? parsed.value.notes.slice(0, 8) : review.notes, layoutFixes: Array.isArray(parsed.value?.layoutFixes) ? parsed.value.layoutFixes.slice(0, 8) : [] };
    }
    emit("quality_check", { progress: 90, report: { ...deterministic, review } });
    emit("complete", { progress: 100, protocol: "paper2poster-v4", review, quality: deterministic });
  });
}

async function paper2PosterRepairStream(request) {
  const payload = await readJson(request);
  return academicSse(async (emit) => {
    const source = normalizeAcademicSource(payload.source);
    const options = payload.options || {};
    emit("accepted", { protocol: "paper2poster-v4", progress: 2 });
    const repairedPlan = normalizePaper2PosterSpec(payload.plan, source, options);
    const before = auditPaper2PosterQuality(repairedPlan, source);
    if (!before.ok) throw new Error(`Cannot repair unsupported paper content: ${before.warnings.join(", ")}`);
    emit("stage", { stage: "layout_repair", progress: 48, message: "正在应用仅影响版式的修复，并保持论文文案、图表与引用不变。" });
    const html = renderPaper2PosterHtml(repairedPlan, source, options);
    const quality = auditPaper2PosterQuality(repairedPlan, source, html);
    if (!quality.ok) throw new Error(`Academic poster repair quality failed: ${quality.warnings.join(", ")}`);
    emit("complete", { progress: 100, protocol: "paper2poster-v4", plan: repairedPlan, html, quality });
  });
}

// V5 keeps V4 intact as a deterministic rollback path. It adds a Paper2Poster-
// inspired content brief and an optional image-model visual layer, while exact
// paper text and source figures remain HTML-rendered and source-locked.
async function academicPosterV5AnalyzeStream(request) {
  const payload = await readJson(request);
  return academicSse(async (emit) => {
    const source = normalizeAcademicSource(payload.source);
    if (!source.textExtracted) throw new Error("No extractable paper text was found. Please upload a text-based PDF or DOCX.");
    const library = buildPaperAssetLibrary(source);
    const draft = fallbackAcademicPosterBriefV5(source, payload.options || {});
    emit("accepted", { protocol: "academic-poster-v5", progress: 2 });
    emit("stage", { stage: "evidence_inventory", progress: 45, message: `已解析 ${source.pages.length} 个论文内容块与 ${library.evidenceCount} 个原始证据资产。`, assetLibrary: library });
    emit("complete", { progress: 100, protocol: "academic-poster-v5", source, assetLibrary: library, draft, quality: auditAcademicPosterV5(draft, source) });
  });
}

async function academicPosterV5BriefStream(request) {
  const payload = await readJson(request);
  return academicSse(async (emit) => {
    const source = normalizeAcademicSource(payload.source);
    if (!source.textExtracted) throw new Error("No extractable paper text was found. Please upload a text-based PDF or DOCX.");
    const options = payload.options || {};
    const config = mergedIntegrationConfig(payload.integration);
    const fallback = fallbackAcademicPosterBriefV5(source, options);
    emit("accepted", { protocol: "academic-poster-v5", progress: 2 });
    emit("stage", { stage: "dynamic_section_planning", progress: 24, message: "正在依据论文结构、证据数量和信息密度动态规划板块。" });
    let brief = fallback;
    let jsonRepaired = false;
    let fallbackUsed = true;
    if (config.apiKey && config.endpoint && config.mode !== LOCAL_MODE) {
      let extractedEvidence = null;
      emit("stage", { stage: "evidence_extraction", progress: 14, message: "正在先提取论文事实、章节和原始证据映射。" });
      try {
        const extracted = await callAcademicJson(academicPosterV5EvidencePrompt(source), config, "Return strict JSON only. Extract source-grounded claims and evidence links without repetition.", payload.referencePack || null, "AcademicPosterEvidenceV5");
        extractedEvidence = extracted.value;
      } catch (extractionError) {
        emit("stage", { stage: "evidence_extraction_warning", progress: 18, message: "证据提取模型暂不可用，继续使用本地结构化来源块。" });
      }
      emit("stage", { stage: "copy_and_visual_brief", progress: 52, message: "正在生成每个板块的来源锁定文案、视觉描述和生图提示词。" });
      const parsed = await callAcademicJson(academicPosterV5BriefPrompt(source, options, extractedEvidence), config, "Return strict JSON only. Be source-grounded. Do not invent claims, numbers, assets or citations.", payload.referencePack || null, "AcademicPosterBriefV5");
      brief = normalizeAcademicPosterBriefV5(parsed.value, source, options);
      jsonRepaired = Boolean(parsed.repaired);
      fallbackUsed = false;
      let candidateQuality = auditAcademicPosterV5(brief, source);
      if (!candidateQuality.ok) {
        emit("stage", { stage: "semantic_repair", progress: 72, message: `初版方案未通过语义质检，正在修复：${candidateQuality.warnings.slice(0, 4).join("、")}` });
        const repairPrompt = `${academicPosterV5BriefPrompt(source, options, extractedEvidence)}\n\nThe previous candidate failed these checks: ${candidateQuality.warnings.join(", ")}. Rebuild every affected panel from its own source block. Do not repeat headings, takeaways, roles, visual descriptions or evidenceIds. Do not use Section 1 as a placeholder.`;
        let repairedQuality = { ok: false, warnings: ["repair_call_failed"] };
        try {
          const repaired = await callAcademicJson(repairPrompt, config, "Return strict JSON only. Repair repeated or unsupported panels and preserve source references.", payload.referencePack || null, "AcademicPosterBriefV5Repair");
          const repairedBrief = normalizeAcademicPosterBriefV5(repaired.value, source, options);
          repairedQuality = auditAcademicPosterV5(repairedBrief, source);
          if (repairedQuality.ok) { brief = repairedBrief; candidateQuality = repairedQuality; jsonRepaired = true; }
        } catch (repairError) {
          repairedQuality = { ok: false, warnings: [`repair_call_failed:${String(repairError?.message || repairError).slice(0, 120)}`] };
        }
        if (!repairedQuality.ok) {
          const fallbackQuality = auditAcademicPosterV5(fallback, source);
          if (!fallbackQuality.ok) throw new Error(`Academic V5 brief quality failed after repair: ${repairedQuality.warnings.slice(0, 8).join(", ")}`);
          brief = fallback;
          fallbackUsed = true;
          candidateQuality = fallbackQuality;
        }
      }
    }
    const quality = auditAcademicPosterV5(brief, source);
    if (!quality.ok) throw new Error(`Academic V5 brief quality failed: ${quality.warnings.join(", ")}`);
    emit("quality_check", { progress: 88, report: quality });
    emit("complete", { progress: 100, protocol: "academic-poster-v5", source, brief, assetLibrary: buildPaperAssetLibrary(source), quality, jsonRepaired, fallbackUsed });
  });
}

async function academicPosterV5ComposeStream(request) {
  const payload = await readJson(request);
  return academicSse(async (emit) => {
    const source = normalizeAcademicSource(payload.source);
    if (!source.textExtracted) throw new Error("No extractable paper text was found.");
    const brief = normalizeAcademicPosterBriefV5(payload.brief, source, payload.options || {});
    const preflight = auditAcademicPosterV5(brief, source);
    if (!preflight.ok) throw new Error(`Academic V5 preflight failed: ${preflight.warnings.join(", ")}`);
    emit("accepted", { protocol: "academic-poster-v5", progress: 2 });
    emit("stage", { stage: "deterministic_composition", progress: 48, message: "正在叠加准确文案、来源图表、页码引用和 AI 视觉层。" });
    const html = renderAcademicPosterV5Html(brief, source, { ...(payload.options || {}), visualDataUrl: payload.visualDataUrl || "" });
    const quality = auditAcademicPosterV5(brief, source, html);
    if (!quality.ok) throw new Error(`Academic V5 render quality failed: ${quality.warnings.join(", ")}`);
    emit("quality_check", { progress: 88, report: quality });
    emit("complete", { progress: 100, protocol: "academic-poster-v5", html, brief, quality });
  });
}

async function academicPosterV5ReviewStream(request) {
  const payload = await readJson(request);
  return academicSse(async (emit) => {
    const source = normalizeAcademicSource(payload.source);
    const brief = normalizeAcademicPosterBriefV5(payload.brief, source, payload.options || {});
    const deterministic = auditAcademicPosterV5(brief, source, payload.html || "");
    if (!deterministic.ok) throw new Error(`Academic V5 quality failed: ${deterministic.warnings.join(", ")}`);
    emit("accepted", { protocol: "academic-poster-v5", progress: 2 });
    let review = { approved: true, notes: ["Source references, original evidence and deterministic text layers passed preflight."], layoutFixes: [], regenerateVisualPanelIds: [] };
    const config = mergedIntegrationConfig(payload.integration);
    if (config.apiKey && config.endpoint && config.mode !== LOCAL_MODE) {
      emit("stage", { stage: "visual_commenter", progress: 50, message: "正在复核证据映射、板块层级、空白风险和视觉平衡。" });
      const parsed = await callAcademicJson(academicPosterV5ReviewPrompt(brief, source), config, "Return strict JSON only. Do not rewrite paper facts.", payload.referencePack || null, "AcademicPosterReviewV5");
      review = { approved: parsed.value?.approved !== false, notes: Array.isArray(parsed.value?.notes) ? parsed.value.notes.slice(0, 10) : review.notes, layoutFixes: Array.isArray(parsed.value?.layoutFixes) ? parsed.value.layoutFixes.slice(0, 10) : [], regenerateVisualPanelIds: Array.isArray(parsed.value?.regenerateVisualPanelIds) ? parsed.value.regenerateVisualPanelIds.slice(0, 6) : [] };
    }
    emit("complete", { progress: 100, protocol: "academic-poster-v5", review, quality: deterministic });
  });
}

async function academicPosterV5RepairStream(request) {
  const payload = await readJson(request);
  return academicSse(async (emit) => {
    const source = normalizeAcademicSource(payload.source);
    const brief = normalizeAcademicPosterBriefV5(payload.brief, source, payload.options || {});
    const quality = auditAcademicPosterV5(brief, source);
    if (!quality.ok) throw new Error(`Academic V5 repair preflight failed: ${quality.warnings.join(", ")}`);
    emit("accepted", { protocol: "academic-poster-v5", progress: 2 });
    emit("stage", { stage: "layout_repair", progress: 50, message: "正在保留论文事实与原图的前提下重新合成版面。" });
    const html = renderAcademicPosterV5Html(brief, source, { ...(payload.options || {}), visualDataUrl: payload.visualDataUrl || "" });
    emit("complete", { progress: 100, protocol: "academic-poster-v5", brief, html, quality: auditAcademicPosterV5(brief, source, html) });
  });
}

function academicPosterCopySpec(payload = {}) {
  const source = payload.copy || payload;
  const body = Array.isArray(source.body) ? source.body : String(source.body || "").split(/\n+/).map((item) => item.trim()).filter(Boolean);
  return {
    title: String(source.title || "AI Poster").slice(0, 140),
    subtitle: String(source.subtitle || "").slice(0, 220),
    body: body.slice(0, 10).map((item) => String(item).slice(0, 240)),
    cta: String(source.cta || "").slice(0, 80),
  };
}

function academicPosterCopyPrompt(copy = {}) {
  return `Rewrite only the poster copy into one JSON object. Preserve every fact, number, name and call-to-action intent. Do not invent claims. Keep the source language. Return exactly {"title":string,"subtitle":string,"body":string[],"cta":string}. Keep title concise, subtitle one sentence, and body at most 8 short points.\n\nInput:\n${JSON.stringify(copy)}`;
}

async function handleAcademicPosterCopyStream(request) {
  const payload = await readJson(request);
  const config = mergedIntegrationConfig(payload.integration || {});
  if (!payload.rewriteCopy) {
    return aiGenerationSseResponse(async (send) => { const copy = academicPosterCopySpec(payload); send("accepted", { generationId: `ACADEMIC-COPY-${Date.now().toString(36)}` }); send("copy_ready", { copy }); send("complete", { copy }); });
  }
  if (!config.apiKey && config.mode !== "workflow_api") throw new Error("文案模型未配置，请在系统 AI 设置中配置文本 API。");
  return aiGenerationSseResponse(async (send) => {
    const generationId = `ACADEMIC-COPY-${Date.now().toString(36).toUpperCase()}-${crypto.randomUUID().slice(0, 8)}`;
    send("accepted", { generationId });
    const result = await callAcademicJson(academicPosterCopyPrompt(payload.copy || payload), config, "You are a precise academic poster copy editor. Return strict JSON only; preserve facts and source language.", null, "AcademicPosterCopySpecV1");
    const copy = academicPosterCopySpec(result.value);
    send("copy_ready", { generationId, copy, jsonRepaired: Boolean(result.repaired) });
    send("complete", { generationId, copy });
  });
}

function imageBase64Bytes(value) {
  const raw = String(value || "").replace(/^data:[^;]+;base64,/, "");
  const binary = atob(raw); const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return bytes;
}

function imageDimensions(payload = {}) {
  const width = Math.min(1920, Math.max(256, Number(payload.width) || 1080));
  const height = Math.min(1920, Math.max(256, Number(payload.height) || 1350));
  return { width, height };
}

function normalizeImageEndpoint(value) {
  const endpoint = String(value || "").trim().replace(/\/+$/, "");
  if (!endpoint) return "";
  if (/\/images\/generations$/i.test(endpoint)) return endpoint;
  return `${endpoint}/images/generations`;
}

function imageRequestHeaders(config = {}) {
  const headers = { "content-type": "application/json" };
  const headerName = String(config.apiKeyHeader || "Authorization").trim();
  const key = String(config.apiKey || "").trim();
  if (key && headerName) headers[headerName] = `${config.apiKeyPrefix === undefined ? "Bearer " : String(config.apiKeyPrefix)}${key}`;
  try {
    const extra = typeof config.customHeaders === "string" ? JSON.parse(config.customHeaders || "{}") : (config.customHeaders || {});
    if (extra && typeof extra === "object" && !Array.isArray(extra)) Object.entries(extra).forEach(([name, value]) => { if (name && value != null && name.toLowerCase() !== "authorization") headers[name] = String(value); });
  } catch { /* optional headers are ignored when malformed */ }
  return headers;
}

async function generateConfiguredImage(payload, env) {
  const config = { ...(payload.imageConfig || {}) }; const { width, height } = imageDimensions(payload);
  const prompt = String(payload.prompt || "Sparse aged-paper image, no readable text").slice(0, 5000);
  if ((config.provider || "cloudflare-workers-ai") === "cloudflare-workers-ai") {
    if (!env?.AI?.run) return json({ error: "image_model_unavailable", message: "Cloudflare Workers AI 尚未绑定。请在 wrangler 中配置 AI binding，或选择 OpenAI-compatible 图像服务。" }, 503);
    const model = String(config.model || "@cf/black-forest-labs/flux-2-klein-9b");
    const form = new FormData(); form.append("prompt", prompt); form.append("width", String(width)); form.append("height", String(height));
    const formResponse = new Response(form); const result = await env.AI.run(model, { multipart: { body: formResponse.body, contentType: formResponse.headers.get("content-type") } });
    const encoded = result?.image || result?.images?.[0] || result?.data?.[0];
    if (!encoded) throw new Error("Workers AI 未返回图像数据。");
    return imageModelResponse(imageBase64Bytes(encoded), "image/png");
  }
  const endpoint = normalizeImageEndpoint(config.endpoint); const key = String(config.apiKey || "").trim();
  if (!endpoint || !key) return json({ error: "image_model_config_missing", message: "OpenAI-compatible 图像服务需要 API 端点和 API Key。" }, 400);
  const imageSize = config.profile === "gpt-image-2"
    ? (width > height * 1.15 ? "1536x1024" : height > width * 1.15 ? "1024x1536" : "1024x1024")
    : `${width}x${height}`;
  const body = { model: config.model || "gpt-image-2", prompt, size: imageSize };
  if (config.responseFormat) body.response_format = String(config.responseFormat);
  const response = await fetch(endpoint, { method: "POST", headers: imageRequestHeaders(config), body: JSON.stringify(body) });
  const contentType = response.headers.get("content-type") || "";
  if (!response.ok) { const detail = await response.text().catch(() => ""); return json({ error: "image_model_provider_error", message: `图像服务 HTTP ${response.status}${detail ? `：${detail.slice(0, 220)}` : ""}` }, 502); }
  if (contentType.startsWith("image/")) return imageModelResponse(new Uint8Array(await response.arrayBuffer()), contentType.split(";")[0]);
  const data = await response.json(); const item = data?.data?.[0] || data?.images?.[0] || data?.output?.[0];
  if (item?.b64_json) return imageModelResponse(imageBase64Bytes(item.b64_json), "image/png");
  if (item?.url) { const image = await fetch(item.url); if (!image.ok) throw new Error("图像服务返回的图片地址不可用。"); return imageModelResponse(new Uint8Array(await image.arrayBuffer()), image.headers.get("content-type") || "image/png"); }
  throw new Error("图像服务未返回可用图像。");
}

async function handleImageModelGenerate(request, env) { return generateConfiguredImage(await readJson(request), env); }

async function handleImageModelTest(request, env) {
  const response = await handleImageModelGenerate(request, env); if (!response.ok) return response;
  await response.arrayBuffer();
  return json({ ok: true, contentType: response.headers.get("content-type") || "image/png" });
}

function academicPosterImagePayload(payload = {}) {
  const source = { ...payload };
  const { width, height } = imageDimensions(payload);
  const ratio = width / Math.max(1, height);
  // Keep the final HTML canvas independent from provider-specific limits.
  // Academic V5 asks the model for a native-size background and composites it
  // deterministically afterwards.
  const nativeSize = ratio > 1.15 ? { width: 1536, height: 1024 } : ratio < 0.87 ? { width: 1024, height: 1536 } : { width: 1024, height: 1024 };
  const negative = String(payload.negativePrompt || "").trim();
  const prompt = String(payload.prompt || "").slice(0, 5000);
  return { ...source, ...nativeSize, prompt: negative ? `${prompt}\n\nNegative constraints: ${negative.slice(0, 1600)}` : prompt };
}

async function handleAcademicPosterImage(request, env) {
  const traceId = crypto.randomUUID();
  try {
    const normalized = academicPosterImagePayload(await readJson(request));
    let response = await generateConfiguredImage(normalized, env);
    if (!response.ok && (response.status >= 500 || response.status === 429)) response = await generateConfiguredImage({ ...normalized, prompt: `${normalized.prompt}\nRetry once with the same composition and no readable text.` }, env);
    if (!response.ok) {
      const detail = await response.json().catch(() => ({}));
      return json({ ...detail, traceId, retryable: response.status >= 500 || response.status === 429, stage: "academic-poster-v5-image" }, response.status);
    }
    return response;
  } catch (error) {
    return json({ error: "academic_image_generation_failed", message: String(error?.message || error), traceId, retryable: true, stage: "academic-poster-v5-image" }, 502);
  }
}

const ZINE_LAYOUTS = ["center-fragment", "lower-left-float", "upper-right-block", "dual-panel", "irregular-cutout", "type-led", "dot-orbit", "single-specimen"];
const ZINE_ANCHORS = ["tiny-faded-photo", "torn-paper-clipping", "flat-silhouette", "solid-color-block", "old-printed-illustration", "object-specimen", "translucent-overlay", "texture-window"];
const ZINE_TYPOGRAPHY = ["fragmented-floating-letters", "phrase-on-image-edge", "archive-microtext", "diagonal-scattered-words", "ghost-text", "headline-as-object", "text-inside-color-block", "tiny-caption"];
const ZINE_TEXTURES = ["xerox-softness", "risograph-grain", "letterpress-bleed", "halftone-degradation", "film-grain", "scan-noise", "aged-paper"];
const ZINE_MOODS = ["quiet", "summer", "solitude", "childhood", "seaside", "afternoon", "night", "memory", "slight-surrealism"];
const ZINE_ACCENTS = ["cobalt", "cyan", "violet", "magenta", "lemon", "pear-green", "orange", "tomato"];

function zineChoice(value, allowed, fallback) { const clean = String(value || "").trim(); return allowed.includes(clean) ? clean : fallback; }
function zineText(value, limit) { return String(value || "").replace(/[<>]/g, "").replace(/\s+/g, " ").trim().slice(0, limit); }
function normalizeMinimalZineSpec(raw, source = {}) {
  const value = raw && typeof raw === "object" ? raw : {};
  const content = value.content && typeof value.content === "object" ? value.content : {};
  const recipe = value.recipe && typeof value.recipe === "object" ? value.recipe : {};
  const exactPhrase = zineText(source.exactPhrase || content.exactPhrase || value.exactPhrase || "", 70);
  return {
    version: "MinimalZinePosterSpecV1",
    canvas: { ratio: "3:5", width: 1200, height: 2000, paperTone: zineText(value.canvas?.paperTone || "warm-aged", 40) || "warm-aged" },
    content: { theme: zineText(source.theme || content.theme || value.theme || "quiet paper memory", 1800), exactPhrase, editorialText: zineText(content.editorialText || value.editorialText || "", 260), microtext: zineText(content.microtext || value.microtext || "", 100), referenceImageRole: source.hasReferenceImage ? "photo-crop" : "none" },
    recipe: {
      layoutFamily: zineChoice(recipe.layoutFamily || value.layoutFamily, ZINE_LAYOUTS, "center-fragment"),
      anchorType: zineChoice(recipe.anchorType || value.anchorType, ZINE_ANCHORS, source.hasReferenceImage ? "tiny-faded-photo" : "object-specimen"),
      typographyMode: zineChoice(recipe.typographyMode || value.typographyMode, ZINE_TYPOGRAPHY, "archive-microtext"),
      accentHue: zineChoice(recipe.accentHue || value.accentHue, ZINE_ACCENTS, "cobalt"),
      textureMode: zineChoice(recipe.textureMode || value.textureMode, ZINE_TEXTURES, "risograph-grain"),
      moodMode: zineChoice(recipe.moodMode || value.moodMode, ZINE_MOODS, "quiet"),
    },
    geometry: { negativeSpacePct: Math.max(58, Math.min(78, Number(value.geometry?.negativeSpacePct || 66))), clusterPct: Math.max(18, Math.min(34, Number(value.geometry?.clusterPct || 26))), accentPct: Math.max(1, Math.min(4, Number(value.geometry?.accentPct || 2.2))), position: zineChoice(value.geometry?.position || recipe.layoutFamily, ZINE_LAYOUTS, "center-fragment") },
    prompt: "", negativePrompt: "",
  };
}

function minimalZinePrompt(spec) {
  const r = spec.recipe; const c = spec.content; const g = spec.geometry;
  return [
    `Tall vertical 3:5 paper poster, full-frame ${spec.canvas.paperTone} aged paper, ${g.negativeSpacePct}% calm breathing room, one editorial ${r.layoutFamily} visual cluster occupying about ${g.clusterPct}% of the canvas; the cluster must feel present and legible at poster scale, not lost at the edge. No border and no mockup.`,
    `One imageable metaphor for: ${c.theme}. Use a ${r.anchorType} treated with paper-cut edges, photocopy softness, halftone, scan wear, and restrained grayscale. ${c.referenceImageRole === "photo-crop" ? "Leave a quiet small area for a separate documentary photo crop." : ""}`,
    `Sparse ${r.typographyMode}; do not render readable words. One unmistakably saturated ${r.accentHue} ink anchor occupies about ${g.accentPct}% of the canvas or a substantial part of the small visual cluster. Use ${r.textureMode}, subtle misregistration, matte absorbent paper, serif/typewriter/monospaced editorial marks.`,
    `Flat scanned-paper reproduction, diffuse light, no depth, quiet ${r.moodMode} Japanese/Korean indie zine mood. Avoid commercial headline hierarchy, product ads, CTA, logos, glossy mockups, clean digital UI, full-bleed scenes, cinematic lighting, 3D, neon, cartoons, dense scrapbook layouts, many colors, long readable text, watermark.`
  ].join("\n\n");
}

function minimalZineCompilePrompt(payload) {
  return `You are a visual editor creating one quiet but present Minimal Zine poster concept. Return strict JSON only, no Markdown. Extract one imageable metaphor from the theme; do not summarize it as an ad.\n\nTheme: ${zineText(payload.theme, 1800)}\nExact phrase, if supplied: ${zineText(payload.exactPhrase, 70) || "none"}\nReference photo supplied: ${payload.hasReferenceImage ? "yes" : "no"}\n\nReturn {"content":{"theme":"...","exactPhrase":"a confident short headline, max 18 Chinese characters or 8 English words","editorialText":"an evocative 2-4 line expansion of the theme, 45-100 Chinese characters or 20-55 English words; useful, specific and readable as an editorial note","microtext":"a compact source/category label, max 40 characters"},"recipe":{"layoutFamily":"${ZINE_LAYOUTS.join("|")}","anchorType":"${ZINE_ANCHORS.join("|")}","typographyMode":"${ZINE_TYPOGRAPHY.join("|")}","accentHue":"${ZINE_ACCENTS.join("|")}","textureMode":"${ZINE_TEXTURES.join("|")}","moodMode":"${ZINE_MOODS.join("|")}"},"geometry":{"negativeSpacePct":66,"clusterPct":26,"accentPct":2.2,"position":"layoutFamily"}}. Requirements: retain 58-78% paper breathing room, make the visual cluster 18-34% of the composition, one saturated accent only, no commercial or glossy style. The HTML layer will typeset the headline and editorial text exactly.`;
}

async function handleMinimalZineCompileStream(request) {
  const payload = await readJson(request); const config = mergedIntegrationConfig(payload.integration || {});
  if (!config.apiKey || !config.endpoint || config.mode === LOCAL_MODE) throw new Error("Minimal Zine 海报需要已配置的文本 AI。 ");
  return aiGenerationSseResponse(async (send) => {
    const generationId = `ZINE-${Date.now().toString(36).toUpperCase()}-${crypto.randomUUID().slice(0, 8)}`;
    send("accepted", { generationId, progress: 8 });
    const result = await callAcademicJson(minimalZineCompilePrompt(payload), config, "Return only strict JSON. Select one visual metaphor and never produce a commercial advertisement.", null, "MinimalZinePosterSpecV1");
    const spec = normalizeMinimalZineSpec(result.value, payload); spec.prompt = minimalZinePrompt(spec); spec.negativePrompt = "full-bleed scene, commercial headline, product ad, CTA, logo, glossy mockup, clean UI, cinematic lighting, 3D, neon, cartoon, dense scrapbook, many colors, readable text, watermark";
    send("compiled", { generationId, progress: 92, spec, jsonRepaired: Boolean(result.repaired) });
    send("complete", { generationId, progress: 100, spec });
  });
}

async function handleMinimalZineRender(request, env) {
  const payload = await readJson(request); const spec = normalizeMinimalZineSpec(payload.spec || {}, payload.spec?.content || {});
  const prompt = zineText(payload.spec?.prompt || payload.prompt || minimalZinePrompt(spec), 5000);
  return generateConfiguredImage({ imageConfig: payload.imageConfig, width: 1024, height: 1536, prompt: `${prompt}\n\nNegative constraints: ${zineText(payload.spec?.negativePrompt || "", 1000)}` }, env);
}

const QUIET_HUMANIST_LAYOUTS = ["editorial-split", "monumental-anchor", "staged-process", "active-interaction", "printed-sequence", "type-anchor-lockup", "isolated-image-fable", "uneven-title-field"];
const QUIET_HUMANIST_IMAGE_LANGUAGES = ["hand-drawn-editorial", "constructed-physical-scene", "tactile-collage", "printed-diagram", "cinematic-staging", "halftone-drawn-intervention"];
const QUIET_HUMANIST_RELATIONSHIPS = ["counterweight", "overlap", "carry", "point", "reveal", "measure", "transform", "frame"];

function quietHumanistChoice(value, allowed, fallback) { const clean = String(value || "").trim(); return allowed.includes(clean) ? clean : fallback; }
function quietHumanistDirection(raw, index, theme) {
  const item = raw && typeof raw === "object" ? raw : {};
  const fallbackLayouts = ["editorial-split", "staged-process", "type-anchor-lockup"];
  const fallbackLanguages = ["hand-drawn-editorial", "printed-diagram", "tactile-collage"];
  const fallbackRelationships = ["counterweight", "transform", "carry"];
  const anchor = zineText(item.anchor || "a content-specific subject", 180);
  const action = zineText(item.action || "changes the selected material", 180);
  const evidence = zineText(item.visibleEvidence || "a visible trace of the change", 180);
  return {
    id: zineText(item.id || `direction-${index + 1}`, 48) || `direction-${index + 1}`,
    title: zineText(item.title || ["Editorial Split", "Staged Process", "Type and Anchor"][index] || `Direction ${index + 1}`, 80),
    rationale: zineText(item.rationale || `让${anchor}通过${action}留下${evidence}。`, 220),
    anchor, action, supportingClue: zineText(item.supportingClue || "one relevant material clue", 180), visibleEvidence: evidence,
    layoutFamily: quietHumanistChoice(item.layoutFamily, QUIET_HUMANIST_LAYOUTS, fallbackLayouts[index] || "editorial-split"),
    imageLanguage: quietHumanistChoice(item.imageLanguage, QUIET_HUMANIST_IMAGE_LANGUAGES, fallbackLanguages[index] || "hand-drawn-editorial"),
    imageTypeRelationship: quietHumanistChoice(item.imageTypeRelationship, QUIET_HUMANIST_RELATIONSHIPS, fallbackRelationships[index] || "counterweight"),
    authoredDisruption: zineText(item.authoredDisruption || "one deliberate scale or crop interruption", 220),
    palette: zineText(item.palette || "two quiet neutrals and one restrained signal pigment", 160),
    prompt: zineText(item.prompt || `Create a content-specific ${fallbackLanguages[index] || "hand-drawn editorial"} illustration about ${theme}. Show ${anchor} ${action} with ${evidence}.`, 5000),
    negativePrompt: zineText(item.negativePrompt || "large clean marketing headline beside a generic object, stock photography, glossy 3D, glassmorphism, neon gradient, random icons, unrelated props, readable text, logo, watermark, uniform sepia filter", 1200),
  };
}

function normalizeQuietHumanistSpec(raw, source = {}) {
  const value = raw && typeof raw === "object" ? raw : {};
  const sourceTheme = zineText(source.theme || value.contentModel?.theme || value.theme || "", 1800);
  const contentModel = value.contentModel && typeof value.contentModel === "object" ? value.contentModel : {};
  const sourceCopy = value.copy && typeof value.copy === "object" ? value.copy : {};
  const directions = Array.isArray(value.directions) ? value.directions.slice(0, 3) : [];
  while (directions.length < 3) directions.push({});
  const copy = {
    kicker: zineText(sourceCopy.kicker || "EDITORIAL POSTER", 80),
    headline: zineText(source.exactPhrase || sourceCopy.headline || value.exactPhrase || sourceTheme.slice(0, 32), 100),
    supportLine: zineText(source.supportLine || sourceCopy.supportLine || "", 420),
    identity: zineText(source.identity || sourceCopy.identity || "", 220),
    metadata: zineText(source.metadata || sourceCopy.metadata || "", 220),
    humanNote: zineText(sourceCopy.humanNote || sourceCopy.editorialText || "", 260),
  };
  return {
    version: "QuietHumanistPosterSpecV1",
    styleId: "quiet-humanist",
    contentModel: {
      theme: sourceTheme,
      whatItIs: zineText(contentModel.whatItIs || "", 300), input: zineText(contentModel.input || "", 300), action: zineText(contentModel.action || "", 300),
      result: zineText(contentModel.result || "", 300), evidence: zineText(contentModel.evidence || "", 300), whyItMatters: zineText(contentModel.whyItMatters || "", 300),
    },
    copy,
    directions: directions.map((item, index) => quietHumanistDirection(item, index, sourceTheme)),
    selectedDirectionId: zineText(value.selectedDirectionId || "direction-1", 48) || "direction-1",
  };
}

function quietHumanistCompilePrompt(payload) {
  return `You are a content-first editorial designer. Return strict JSON only, no Markdown. Do not begin with a style filter. First understand the subject, its mechanism, the user's action, and the visible result. Then produce three genuinely different poster directions. Keep all final copy exact and editable outside the image model.\n\nTheme: ${zineText(payload.theme, 1800)}\nUser supplied exact headline: ${zineText(payload.exactPhrase, 100) || "none; propose one"}\nUser supplied support line: ${zineText(payload.supportLine, 420) || "none; write one plain sentence"}\nIdentity: ${zineText(payload.identity, 220) || "none"}\nMetadata: ${zineText(payload.metadata, 220) || "none"}\nReference photo supplied: ${payload.hasReferenceImage ? "yes" : "no"}\n\nReturn JSON with this shape: {"contentModel":{"theme":"...","whatItIs":"...","input":"...","action":"...","result":"...","evidence":"...","whyItMatters":"..."},"copy":{"kicker":"...","headline":"...","supportLine":"one plain functional sentence","identity":"...","metadata":"...","humanNote":"one short human observation"},"directions":[{"id":"direction-1","title":"...","rationale":"...","anchor":"recognizable content-specific subject","action":"specific visible verb","supportingClue":"one relevant clue","visibleEvidence":"what the action leaves behind","layoutFamily":"${QUIET_HUMANIST_LAYOUTS.join("|")}","imageLanguage":"${QUIET_HUMANIST_IMAGE_LANGUAGES.join("|")}","imageTypeRelationship":"${QUIET_HUMANIST_RELATIONSHIPS.join("|")}","authoredDisruption":"one deliberate spatial/material/typographic surprise","palette":"...","prompt":"illustration-only prompt, no essential text","negativePrompt":"..."},{"id":"direction-2"},{"id":"direction-3"}]}\n\nRequirements: each direction must change semantic route, action, composition and image language; include one primary anchor, one action, one supporting clue and one visible consequence; avoid generic advertising, generic icons, attractive object plus pasted copy, glossy 3D and unreadable generated typography.`;
}

async function handleQuietHumanistCompileStream(request) {
  const payload = await readJson(request); const config = mergedIntegrationConfig(payload.integration || {});
  if (!config.apiKey || !config.endpoint || config.mode === LOCAL_MODE) throw new Error("Quiet Humanist 海报需要已配置的文本 AI。 ");
  return aiGenerationSseResponse(async (send) => {
    const generationId = `HUMANIST-${Date.now().toString(36).toUpperCase()}-${crypto.randomUUID().slice(0, 8)}`;
    send("accepted", { generationId, progress: 8 });
    const result = await callAcademicJson(quietHumanistCompilePrompt(payload), config, "Return only strict JSON with a content model, copy deck and exactly three distinct directions.", null, "QuietHumanistPosterSpecV1");
    const spec = normalizeQuietHumanistSpec(result.value, payload);
    send("compiled", { generationId, progress: 92, spec, jsonRepaired: Boolean(result.repaired) });
    send("complete", { generationId, progress: 100, spec });
  });
}

async function handleQuietHumanistRender(request, env) {
  const payload = await readJson(request); const spec = normalizeQuietHumanistSpec(payload.spec || {}, payload.spec?.contentModel || {});
  const selected = spec.directions.find((item) => item.id === payload.selectedDirectionId) || spec.directions[0];
  const prompt = zineText(selected.prompt, 5000);
  return generateConfiguredImage({ imageConfig: payload.imageConfig, width: 1024, height: 1536, prompt: `${prompt}\n\nThe final HTML will typeset the exact headline and support copy. Do not render essential words, letters, logos or watermarks.\n\nNegative constraints: ${zineText(selected.negativePrompt, 1200)}` }, env);
}

const ACID_SWISS_LAYOUTS = ["monumental-specimen", "diagonal-crop", "geometric-pedestal", "split-grid"];
const ACID_SWISS_PALETTES = ["navy-yellow-wine", "cobalt-orange-cream", "forest-coral-cream"];

function acidSwissChoice(value, allowed, fallback) { const clean = String(value || "").trim(); return allowed.includes(clean) ? clean : fallback; }
function normalizeAcidSwissSpec(raw, source = {}) {
  const value = raw && typeof raw === "object" ? raw : {}; const sourceTheme = zineText(source.theme || value.contentModel?.theme || value.theme || "", 1800); const sourceCopy = value.copy && typeof value.copy === "object" ? value.copy : {}; const sourceVisual = value.visual && typeof value.visual === "object" ? value.visual : {}; const sourceLayout = value.layout && typeof value.layout === "object" ? value.layout : {};
  const copy = { kicker: zineText(sourceCopy.kicker || "RETRO EDITORIAL", 80), headline: zineText(source.exactPhrase || sourceCopy.headline || value.exactPhrase || sourceTheme.slice(0, 42), 110), supportLine: zineText(sourceCopy.supportLine || source.supportLine || "", 360), footerText: zineText(sourceCopy.footerText || sourceCopy.editorialText || sourceTheme, 420), verticalPrimary: zineText(sourceCopy.verticalPrimary || "PLAY LOUD", 40), verticalSecondary: zineText(sourceCopy.verticalSecondary || "SOUND FLOW", 40), seriesNumber: zineText(source.seriesNumber || sourceCopy.seriesNumber || "008", 16), year: zineText(source.year || sourceCopy.year || "IN 2026", 30), seriesName: zineText(source.seriesName || sourceCopy.seriesName || "POSTER SERIES", 80) };
  const visual = { primarySubject: zineText(sourceVisual.primarySubject || sourceTheme || "a recognizable subject", 300), subjectStructure: zineText(sourceVisual.subjectStructure || "one monumental subject with a tactile printed surface", 300), backgroundGrid: zineText(sourceVisual.backgroundGrid || "wine grid with cobalt rhythm lines", 220), palette: acidSwissChoice(source.palette || sourceVisual.palette, ACID_SWISS_PALETTES, "navy-yellow-wine"), halftone: zineText(sourceVisual.halftone || "uniform vintage halftone dots", 180) };
  const layout = { family: acidSwissChoice(sourceLayout.family || source.layout, ACID_SWISS_LAYOUTS, "monumental-specimen"), rationale: zineText(sourceLayout.rationale || "a strong central subject balanced by grid and footer information", 240) };
  return { version: "AcidSwissPosterSpecV1", styleId: "acid-swiss-pop", contentModel: { theme: sourceTheme, subject: zineText(value.contentModel?.subject || "", 260), context: zineText(value.contentModel?.context || "", 260), signal: zineText(value.contentModel?.signal || "", 260) }, copy, visual, layout, prompt: zineText(value.prompt || "", 5000), negativePrompt: zineText(value.negativePrompt || "", 1200) };
}
function acidSwissPrompt(spec) { const c = spec.copy || {}; const v = spec.visual || {}; const l = spec.layout || {}; return [`8K detailed vertical 3:5 editorial poster illustration about ${v.primarySubject}. Use ${l.family} composition with one recognizable, non-circular subject occupying 42-62% of the frame; make the subject a lemon, flower, jellyfish, cactus, fruit, coffee cup, moon lamp, food object or another theme-specific specimen, never a record.`, `Retro acid Swiss design grammar: strict internationalist grid, ${v.halftone}, matte warm paper, deep blue-black with bright yellow, wine red and milk white; add ${v.backgroundGrid}, a large geometric pedestal or semicircle, side-column symbols, stars, arrows and measured rhythm lines.`, `Absolutely do not include a vinyl record, phonograph, turntable, CD, black disc, circular record, concentric black disk, music label, or any large black circular object. Do not replace the subject with an abstract circle. The HTML layer will typeset the exact title ${c.headline || ""} and all readable copy, so do not render essential words, letters, logos or watermarks in the image.`, `Clean, sharp, high-contrast printed magazine cover with an illustrated/halftone subject and visible paper grain; no glossy product ad, no UI screenshot, no random objects, no photorealistic text, no watermark.`].join("\n\n"); }
function acidSwissFallbackPrompt(spec) { const c = spec.contentModel || {}; const v = spec.visual || {}; const l = spec.layout || {}; const subject = zineText(v.primarySubject || c.subject || c.theme || "a theme-specific specimen", 220); return [`Vertical 3:5 editorial poster image, one large recognizable ${subject} as the only central subject. Use a clean ${l.family || "monumental specimen"} composition with the subject occupying the middle of the frame and generous clear space around it.`, `Warm matte cream paper, strict blue grid, navy-black shadows, bright yellow pedestal, restrained wine-red accents, crisp screen-print texture and subtle paper grain. Keep the subject readable, centered and uncluttered; no collage and no random objects.`, `Do not draw any words, letters, numbers, logo, watermark or barcode because the browser will add the exact typography. Do not create a vinyl record, phonograph, turntable, CD, black disc, concentric disk or large abstract circle. Avoid dark studio lighting, muddy shadows and photorealistic text.`].join("\n\n"); }
async function acidSwissImageAttempt(payload, env) { try { return await generateConfiguredImage(payload, env); } catch (error) { return json({ error: "image_model_provider_error", message: String(error?.message || error) }, 502); } }
function acidSwissCompilePrompt(payload) { return `You are a content-first poster editor. Return strict JSON only, no Markdown. Derive a reusable subject-specific Retro Acid Swiss / Swiss Internationalist pop poster from the theme: oversized condensed title, warm paper, grid field, halftone specimen, side labels, barcode, symbols, pedestal and explanatory footer. Do not copy any reference image. Never select or suggest a vinyl record, phonograph, turntable, CD, black disc, circular record or large black circular object as the central subject, even when the theme is music. Choose a concrete non-circular subject-specific specimen instead. Keep readable copy editable outside the image model.\n\nTheme: ${zineText(payload.theme, 1800)}\nExact headline, if supplied: ${zineText(payload.exactPhrase, 100) || "propose one"}\nSeries number/year/name: ${zineText(payload.seriesNumber, 16) || "008"} / ${zineText(payload.year, 30) || "IN 2026"} / ${zineText(payload.seriesName, 80) || "POSTER SERIES"}\nPalette preference: ${zineText(payload.palette, 40) || "AI choose"}\n\nReturn {"contentModel":{"theme":"...","subject":"recognizable non-circular central subject","context":"why this subject fits","signal":"one memorable visual signal"},"copy":{"kicker":"RETRO EDITORIAL","headline":"max 8 English words or 18 Chinese characters","supportLine":"one short auxiliary line","footerText":"specific 2-3 sentence explanatory editorial copy","verticalPrimary":"short vertical label","verticalSecondary":"short footer label","seriesNumber":"...","year":"...","seriesName":"..."},"visual":{"primarySubject":"...","subjectStructure":"...","backgroundGrid":"...","palette":"${ACID_SWISS_PALETTES.join("|")}","halftone":"..."},"layout":{"family":"${ACID_SWISS_LAYOUTS.join("|")}","rationale":"..."}}. Requirements: subject-first, strict grid hierarchy, large type-friendly areas, no commercial CTA, no record/disc imagery, and no essential text inside the image prompt.`; }
async function handleAcidSwissCompileStream(request) { const payload = await readJson(request); const config = mergedIntegrationConfig(payload.integration || {}); if (!config.apiKey || !config.endpoint || config.mode === LOCAL_MODE) throw new Error("Retro Acid Swiss 海报需要已配置的文本 AI。"); return aiGenerationSseResponse(async (send) => { const generationId = `ACID-${Date.now().toString(36).toUpperCase()}-${crypto.randomUUID().slice(0, 8)}`; send("accepted", { generationId, progress: 8 }); const result = await callAcademicJson(acidSwissCompilePrompt(payload), config, "Return only strict JSON with subject-specific copy, visual grammar and one layout.", null, "AcidSwissPosterSpecV1"); const spec = normalizeAcidSwissSpec(result.value, payload); spec.prompt = acidSwissPrompt(spec); spec.negativePrompt = "vinyl record, phonograph, turntable, CD, black disc, circular record, concentric black disk, music label, large black circular object, readable text, letters, logos, watermark, glossy product ad, UI screenshot, stock collage, tiny subject, random objects"; send("compiled", { generationId, progress: 92, spec, jsonRepaired: Boolean(result.repaired) }); send("complete", { generationId, progress: 100, spec }); }); }
async function handleAcidSwissRender(request, env) { const payload = await readJson(request); const spec = normalizeAcidSwissSpec(payload.spec || {}, payload.spec || {}); const imageConfig = payload.imageConfig || {}; const negative = zineText(spec.negativePrompt, 1200); const primary = { imageConfig, width: 1024, height: 1536, prompt: `${zineText(spec.prompt || acidSwissPrompt(spec), 5000)}\n\nNegative constraints: ${negative}` }; const first = await acidSwissImageAttempt(primary, env); if (first.ok || first.status < 500) return first; const compact = { ...primary, prompt: `${acidSwissFallbackPrompt(spec)}\n\nNegative constraints: ${negative}` }; const second = await acidSwissImageAttempt(compact, env); if (second.ok || second.status < 500) return second; return acidSwissImageAttempt({ ...compact, width: 1024, height: 1024 }, env); }

const QIAOMU_MONDO_TYPES = ["film", "music", "book", "event", "concept"];
const QIAOMU_MONDO_COMPOSITIONS = ["single-symbol", "negative-space-dual", "geometric-frame", "layered-atmosphere", "silhouette-scale"];
const QIAOMU_MONDO_ASPECTS = ["3:5", "2:3", "4:5"];
const QIAOMU_MONDO_ERAS = ["1960s", "1970s", "1980s"];
function qiaomuMondoChoice(value, allowed, fallback) { const clean = String(value || "").trim(); return allowed.includes(clean) ? clean : fallback; }
function normalizeQiaomuMondoSpec(raw, source = {}) {
  const value = raw && typeof raw === "object" ? raw : {}; const sourceCopy = value.copy && typeof value.copy === "object" ? value.copy : {}; const sourceVisual = value.visual && typeof value.visual === "object" ? value.visual : {}; const sourceLayout = value.layout && typeof value.layout === "object" ? value.layout : {}; const theme = zineText(source.theme || value.contentModel?.theme || value.theme || "", 1800);
  const type = qiaomuMondoChoice(source.type || value.type, QIAOMU_MONDO_TYPES, "concept");
  const copy = { kicker: zineText(sourceCopy.kicker || "MONDO EDITION", 80), headline: zineText(source.exactPhrase || sourceCopy.headline || value.exactPhrase || theme.slice(0, 56) || "SAY LESS", 110), supportLine: zineText(sourceCopy.supportLine || "A symbolic screen-print study", 240), footerText: zineText(sourceCopy.footerText || sourceCopy.editorialText || theme, 420), sideLabel: zineText(sourceCopy.sideLabel || "VISUAL METAPHOR", 80), issue: zineText(sourceCopy.issue || "05", 12) };
  const visual = { symbol: zineText(sourceVisual.symbol || value.contentModel?.symbol || theme || "one symbolic subject", 220), hiddenMeaning: zineText(sourceVisual.hiddenMeaning || value.contentModel?.meaning || "one visual reversal that reveals a second idea", 360), palette: zineText(source.palette || sourceVisual.palette || "two to four screen-print inks: deep navy, rust orange, warm cream", 140), era: qiaomuMondoChoice(sourceVisual.era || value.era, QIAOMU_MONDO_ERAS, "1970s"), texture: zineText(sourceVisual.texture || "subtle silkscreen ink variation and aged paper grain", 180) };
  const layout = { composition: qiaomuMondoChoice(source.composition || sourceLayout.composition, QIAOMU_MONDO_COMPOSITIONS, "single-symbol"), aspect: qiaomuMondoChoice(source.aspect || sourceLayout.aspect, QIAOMU_MONDO_ASPECTS, "3:5"), rationale: zineText(sourceLayout.rationale || "one dominant symbolic image supported by graphic fields and editable type", 260) };
  return { version: "QiaomuMondoPosterSpecV1", styleId: "qiaomu-mondo", type, contentModel: { theme, symbol: visual.symbol, meaning: visual.hiddenMeaning }, copy, visual, layout, prompt: zineText(value.prompt || "", 5000), negativePrompt: zineText(value.negativePrompt || "", 1500) };
}
function qiaomuMondoPrompt(spec) { const c = spec.copy || {}; const v = spec.visual || {}; const l = spec.layout || {}; return [`Create a vertical ${l.aspect || "3:5"} cinematic Mondo-inspired screen-print poster image about ${v.symbol}. Build one strong conceptual visual metaphor: ${v.hiddenMeaning}. The image must contain a single recognizable symbolic focal object or silhouette, not a collage of unrelated objects.`, `Use a ${l.composition || "single-symbol"} composition with large intentional negative space, crisp flat graphic shapes, ${v.palette || "two to four limited inks"}, ${v.texture || "silkscreen texture"}, and a ${v.era || "1970s"} vintage print sensibility. Make it evocative and hand-pulled, with dramatic scale and simple visual storytelling.`, `The browser will accurately typeset the title ${c.headline || ""} and all editorial copy. Do not render any readable words, letters, numbers, logos, badges, barcodes, watermarks, or poster typography inside the generated image. Keep text-safe areas and do not imitate a specific artist or existing poster.`, `Avoid glossy advertising, photorealistic product photography, 3D render, UI screenshot, generic stock montage, excessive tiny details, gradients, neon, and random decorative symbols.`].join("\n\n"); }
function qiaomuMondoFallbackPrompt(spec) { const v = spec.visual || {}; const l = spec.layout || {}; return [`Vertical ${l.aspect || "3:5"} limited-color screen-print image with one large clear symbolic ${v.symbol || "subject"}. Show ${v.hiddenMeaning || "a single visual reversal"} using clean negative space and one bold geometric field.`, `Use only two to four inks on warm paper: ${v.palette || "navy, rust orange and cream"}. Keep an uncluttered, vintage 1960s-1980s print feeling and allow generous open areas for later browser typography.`, `No text, no letters, no numbers, no logos, no watermark, no barcode, no UI, no collage, no 3D render, no photo mockup, no gradients, no random icon set.`].join("\n\n"); }
async function qiaomuMondoImageAttempt(payload, env) { try { return await generateConfiguredImage(payload, env); } catch (error) { return json({ error: "image_model_provider_error", message: String(error?.message || error) }, 502); } }
function qiaomuMondoCompilePrompt(payload) { return `You are a content-first Mondo poster art director. Return strict JSON only, no Markdown. Convert the theme into a single memorable conceptual image; seek a visual pun, negative-space reveal, scale shift, silhouette, or geometric reframing that communicates the theme without relying on literal copy. Use only general vintage screen-print principles, never copy an existing poster or artist. All exact typography remains editable outside the image model.\n\nTheme: ${zineText(payload.theme, 1800)}\nExact headline, if supplied: ${zineText(payload.exactPhrase, 100) || "propose one"}\nPoster type preference: ${zineText(payload.type, 40) || "AI choose"}\nComposition preference: ${zineText(payload.composition, 60) || "AI choose"}\nAspect preference: ${zineText(payload.aspect, 12) || "3:5"}\nPalette preference: ${zineText(payload.palette, 140) || "AI choose 2-4 inks"}\n\nReturn {"type":"${QIAOMU_MONDO_TYPES.join("|")}","contentModel":{"theme":"...","symbol":"single recognizable symbolic focal point","meaning":"one hidden or reversed second meaning"},"copy":{"kicker":"...","headline":"max 7 English words or 18 Chinese characters","supportLine":"short editorial line","footerText":"specific 2-3 sentence editorial note","sideLabel":"short label","issue":"two digits"},"visual":{"symbol":"...","hiddenMeaning":"...","palette":"2-4 named inks only","era":"${QIAOMU_MONDO_ERAS.join("|")}","texture":"..."},"layout":{"composition":"${QIAOMU_MONDO_COMPOSITIONS.join("|")}","aspect":"${QIAOMU_MONDO_ASPECTS.join("|")}","rationale":"..."}}. Requirements: one conceptual focal point, limited palette, graphic negative space, print texture, no exact text in the image prompt, no copied title treatment, no logo.`; }
async function handleQiaomuMondoCompileStream(request) { const payload = await readJson(request); const config = mergedIntegrationConfig(payload.integration || {}); if (!config.apiKey || !config.endpoint || config.mode === LOCAL_MODE) throw new Error("Qiaomu Mondo 海报需要已配置的文本 AI。"); return aiGenerationSseResponse(async (send) => { const generationId = `MONDO-${Date.now().toString(36).toUpperCase()}-${crypto.randomUUID().slice(0, 8)}`; send("accepted", { generationId, progress: 8 }); const result = await callAcademicJson(qiaomuMondoCompilePrompt(payload), config, "Return only strict JSON with one conceptual symbol and editable copy.", null, "QiaomuMondoPosterSpecV1"); const spec = normalizeQiaomuMondoSpec(result.value, payload); spec.prompt = qiaomuMondoPrompt(spec); spec.negativePrompt = "readable text, letters, numbers, logo, watermark, barcode, QR code, existing poster, artist signature, photorealistic product ad, stock collage, 3D render, glossy mockup, UI screenshot, gradients, neon, random icons, clutter"; send("compiled", { generationId, progress: 92, spec, jsonRepaired: Boolean(result.repaired) }); send("complete", { generationId, progress: 100, spec }); }); }
async function handleQiaomuMondoRender(request, env) { const payload = await readJson(request); const spec = normalizeQiaomuMondoSpec(payload.spec || {}, payload.spec || {}); const sizes = spec.layout?.aspect === "4:5" ? { width: 1024, height: 1280 } : { width: 1024, height: 1536 }; const negative = zineText(spec.negativePrompt, 1500); const primary = { imageConfig: payload.imageConfig || {}, ...sizes, prompt: `${zineText(spec.prompt || qiaomuMondoPrompt(spec), 5000)}\n\nNegative constraints: ${negative}` }; const first = await qiaomuMondoImageAttempt(primary, env); if (first.ok || first.status < 500) return first; const compact = { ...primary, prompt: `${qiaomuMondoFallbackPrompt(spec)}\n\nNegative constraints: ${negative}` }; const second = await qiaomuMondoImageAttempt(compact, env); if (second.ok || second.status < 500) return second; return qiaomuMondoImageAttempt({ ...compact, width: 1024, height: 1024 }, env); }

const EDITORIAL_ACTION_ASPECTS = ["3:5", "4:5", "2:3", "9:16"];
function editorialActionChoice(value, allowed, fallback) { const clean = String(value || "").trim(); return allowed.includes(clean) ? clean : fallback; }
function normalizeEditorialActionSpec(raw, source = {}) {
  const value = raw && typeof raw === "object" ? raw : {}; const sourceInput = source.input && typeof source.input === "object" ? source.input : source; const sourceConstraints = source.constraints && typeof source.constraints === "object" ? source.constraints : sourceInput.constraints && typeof sourceInput.constraints === "object" ? sourceInput.constraints : {}; const sourceLocks = source.locks && typeof source.locks === "object" ? source.locks : sourceInput.locks && typeof sourceInput.locks === "object" ? sourceInput.locks : {}; const modelContent = value.content && typeof value.content === "object" ? value.content : {}; const sourceContent = source.content && typeof source.content === "object" ? source.content : {};
  const choose = (key, fallback = "") => { const locked = Boolean(sourceLocks[key]); const userValue = zineText(sourceConstraints[key] || sourceContent[key] || "", 220); return zineText(locked && userValue ? userValue : modelContent[key] || userValue || fallback, 220); };
  const content = { theme: zineText(source.theme || sourceInput.theme || value.contentModel?.theme || value.theme || "", 1800), subject: choose("subject", "a determined outdoor protagonist"), subjectRole: zineText(modelContent.subjectRole || "the visible hero of the story", 160), action: choose("action", "moves decisively toward the camera"), location: choose("location", "a bright open-air urban setting"), productOrProp: choose("productOrProp", "one theme-specific hero prop"), backgroundElements: zineText(modelContent.backgroundElements || "open sky, clean horizon, distant environmental cues", 240), wardrobe: zineText(modelContent.wardrobe || "functional contemporary outdoor wardrobe with one saturated accent", 220) };
  const sourceCopy = value.copy && typeof value.copy === "object" ? value.copy : {}; const copy = { kicker: zineText(sourceCopy.kicker || "EDITORIAL ACTION", 80), mainText: zineText(sourceCopy.mainText || source.exactPhrase || content.theme.slice(0, 36) || "MOVE WITH PURPOSE", 80), secondaryText: zineText(sourceCopy.secondaryText || `${content.action} / ${content.location}`, 220), sideWords: Array.isArray(sourceCopy.sideWords) ? sourceCopy.sideWords.slice(0, 5).map((item) => zineText(item, 40)) : ["SPEED", "POWER", "PRECISION"], largeNumber: zineText(sourceCopy.largeNumber || "01", 12), microCopy: Array.isArray(sourceCopy.microCopy) ? sourceCopy.microCopy.slice(0, 6).map((item) => zineText(item, 80)) : [], bottomClusters: Array.isArray(sourceCopy.bottomClusters) ? sourceCopy.bottomClusters.slice(0, 4).map((item) => zineText(item, 120)) : [], footerText: zineText(sourceCopy.footerText || `A close-range study of ${content.subject} and ${content.action}.`, 420) };
  const modelVisual = value.visual && typeof value.visual === "object" ? value.visual : {}; const visual = { aspectRatio: editorialActionChoice(modelVisual.aspectRatio, EDITORIAL_ACTION_ASPECTS, "3:5"), accentColor: zineText(modelVisual.accentColor || "saturated orange", 80), camera: zineText(modelVisual.camera || "extreme-low-wide-angle", 120), actionDirection: zineText(modelVisual.actionDirection || "a strong lower-left to upper-right diagonal", 180), edgeCrop: zineText(modelVisual.edgeCrop || "the hero prop and one limb touch the canvas edge", 180), skyShare: Math.max(30, Math.min(65, Number(modelVisual.skyShare) || 45)), subjectShare: Math.max(50, Math.min(85, Number(modelVisual.subjectShare) || 72)), lighting: zineText(modelVisual.lighting || "hard midday sun with crisp shadows", 160) };
  return { version: "EditorialActionPosterSpecV1", styleId: "editorial-action", input: { theme: content.theme, constraints: { subject: zineText(sourceConstraints.subject || "", 220), action: zineText(sourceConstraints.action || "", 220), location: zineText(sourceConstraints.location || "", 220), productOrProp: zineText(sourceConstraints.productOrProp || "", 220) }, locks: { subject: Boolean(sourceLocks.subject), action: Boolean(sourceLocks.action), location: Boolean(sourceLocks.location), productOrProp: Boolean(sourceLocks.productOrProp) } }, content, copy, visual, fieldSources: { subject: sourceLocks.subject ? "user" : "ai", action: sourceLocks.action ? "user" : "ai", location: sourceLocks.location ? "user" : "ai", productOrProp: sourceLocks.productOrProp ? "user" : "ai" }, prompt: zineText(value.prompt || "", 5000), negativePrompt: zineText(value.negativePrompt || "", 1600) };
}
function editorialActionPrompt(spec) { const c = spec.content || {}; const v = spec.visual || {}; return [`Bright, high-key full-frame ${v.aspectRatio || "3:5"} outdoor editorial action photograph about ${c.theme || c.subject}. Show ${c.subject}, ${c.action}, in ${c.location}, with ${c.productOrProp}. ${c.backgroundElements}.`, `A clean vivid cyan-blue open sky occupies about ${v.skyShare || 45}% of the frame. Use ${v.camera || "an extreme-low 18-24mm wide-angle"}, a huge close foreground, decisive frozen movement, ${v.actionDirection}, and ${v.edgeCrop}. The subject occupies about ${v.subjectShare || 72}% of the frame. Keep the face, hands, wardrobe and hero prop readable and sharply exposed.`, `Use neutral daylight white balance, bright skin tones, clean highlights, open readable shadows, crisp edges and preserved detail in dark clothing. Hard direct noon sunlight with gentle fill, premium commercial realism, neutral sky-blue environment, one saturated ${v.accentColor} hero detail, subtle fine print grain. No illustration, no 3D render, no text, no logos, no watermark. The HTML layer will typeset the exact title and editorial copy.`, `Absolutely avoid underexposure, low-key lighting, night, dusk, dark blue cast, teal color grading, cyan skin, crushed blacks, muddy shadows, heavy vignette, silhouette, distant tiny subjects, static poses, studio scenes, soft pastel lighting, cinematic darkness, duplicated people, malformed anatomy, extra limbs, fake brands, QR codes and readable letters.`].join("\n\n"); }
function editorialActionCompilePrompt(payload) { const constraints = payload.constraints && typeof payload.constraints === "object" ? payload.constraints : {}; const locks = payload.locks && typeof payload.locks === "object" ? payload.locks : {}; return `You are a senior editorial action-poster director. Return strict JSON only, no Markdown. Build a bright high-key outdoor action campaign with a clean cyan-blue sky, clear daylight exposure, giant warm-cream condensed typography and compact editorial information. User-locked fields are immutable: never replace, weaken, generalize or contradict them. Fill only blank or unlocked fields. Do not use real brand logos.\n\nTheme: ${zineText(payload.theme, 1800)}\nUser subject: ${zineText(constraints.subject, 220) || "blank"} [locked=${Boolean(locks.subject)}]\nUser action: ${zineText(constraints.action, 220) || "blank"} [locked=${Boolean(locks.action)}]\nUser location: ${zineText(constraints.location, 220) || "blank"} [locked=${Boolean(locks.location)}]\nUser product/prop: ${zineText(constraints.productOrProp, 220) || "blank"} [locked=${Boolean(locks.productOrProp)}]\nExact phrase, if supplied: ${zineText(payload.exactPhrase, 80) || "blank; propose a short title"}\n\nReturn {"content":{"subject":"...","subjectRole":"...","action":"...","location":"...","productOrProp":"...","backgroundElements":"...","wardrobe":"..."},"copy":{"kicker":"EDITORIAL ACTION","mainText":"1-3 English words or 2-6 Chinese characters; short enough for a giant title","secondaryText":"...","sideWords":["SPEED","POWER","PRECISION"],"largeNumber":"01","microCopy":["..."],"bottomClusters":["..."],"footerText":"..."},"visual":{"aspectRatio":"${EDITORIAL_ACTION_ASPECTS.join("|")}","accentColor":"...","camera":"extreme-low 18-24mm wide-angle","actionDirection":"...","edgeCrop":"...","skyShare":45,"subjectShare":72,"lighting":"bright hard midday sunlight with open shadows"}}. Requirements: mainText must be max two lines, contain no HTML or <br>, sideWords must be plain strings with no markup, preserve face and action readability, use high-key exposure and neutral daylight, action dominates, typography second, microcopy third, no essential readable text in the image prompt.`; }
async function handleEditorialActionCompileStream(request) { const payload = await readJson(request); const config = mergedIntegrationConfig(payload.integration || {}); if (!config.apiKey || !config.endpoint || config.mode === LOCAL_MODE) throw new Error("Editorial Action 海报需要已配置的文本 AI。"); return aiGenerationSseResponse(async (send) => { const generationId = `ACTION-${Date.now().toString(36).toUpperCase()}-${crypto.randomUUID().slice(0, 8)}`; send("accepted", { generationId, progress: 8 }); const result = await callAcademicJson(editorialActionCompilePrompt(payload), config, "Return only strict JSON and preserve every locked user field.", null, "EditorialActionPosterSpecV1"); const spec = normalizeEditorialActionSpec(result.value, payload); spec.prompt = editorialActionPrompt(spec); spec.negativePrompt = "underexposed, low-key lighting, night, dusk, dark blue cast, teal color grading, cyan skin, crushed blacks, muddy shadows, heavy vignette, silhouette, readable text, letters, logos, watermark, QR code, real brand marks, illustration, comic, halftone, 3D render, dark studio, soft pastel colors, distant tiny subject, static pose, duplicated person, malformed hands, malformed limbs"; send("compiled", { generationId, progress: 92, spec, jsonRepaired: Boolean(result.repaired) }); send("complete", { generationId, progress: 100, spec }); }); }
async function handleEditorialActionRender(request, env) { const payload = await readJson(request); const spec = normalizeEditorialActionSpec(payload.spec || {}, payload.spec || {}); const prompt = zineText(spec.prompt || editorialActionPrompt(spec), 5000); return generateConfiguredImage({ imageConfig: payload.imageConfig, width: 1024, height: 1536, prompt: `${prompt}\n\nNegative constraints: ${zineText(spec.negativePrompt, 1600)}` }, env); }

async function handleImageModelConfig(request) {
  return json({ text: publicIntegration(), image: { providers: ["cloudflare-workers-ai", "openai-images-compatible"], defaultProvider: "cloudflare-workers-ai", defaultModel: "@cf/black-forest-labs/flux-2-klein-9b" } });
}

async function createJob(payload) {
  const filename = String(payload.filename || "presentation.pptx");
  if (!filename.toLowerCase().endsWith(".pptx")) {
    throw new Error("Cloudflare-only deployment supports .pptx files. Old .ppt files require the local Python backend.");
  }
  const fileBytes = decodeDataUrl(payload.fileBase64);
  const slides = attachReferenceImages(await extractPptx(fileBytes), payload.referencePack);
  const extractionStats = slides.extractionStats || { embeddedImages: 0, skippedImages: 0, embeddedImageBytes: 0 };
  const style = payload.style || "teaching";
  const customStyle = normalizeCustomStyle(payload.customStyle);
  const requestConfig = mergedIntegrationConfig(payload.integration);
  let aiStatus = { mode: requestConfig.mode || "local", used: false };
  let pagedHtml = "";
  if (requestConfig.mode && requestConfig.mode !== LOCAL_MODE) {
    try {
      pagedHtml = await maybeGenerateAiHtml(slides, requestConfig, style, customStyle, { referencePack: payload.referencePack });
      aiStatus = { mode: requestConfig.mode, provider: requestConfig.endpoint, used: true, resultType: "html" };
    } catch (error) {
      const message = String(error.message || error);
      const allowLocalFallback = requestConfig.mode === LOCAL_MODE || requestConfig.fallbackToLocal === true;
      aiStatus = { mode: requestConfig.mode, used: false, fallback: false, error: message };
      if (!allowLocalFallback) throw new Error(`AI generation failed: ${aiStatus.error}`);
    }
  }
  let scrollHtml = "";
  if (pagedHtml) {
    validateAiHtmlCompleteness(pagedHtml, slides);
    pagedHtml = injectOriginalImages(pagedHtml, slides);
    pagedHtml = injectEditorRuntime(pagedHtml);
    scrollHtml = makeScrollHtml(pagedHtml);
  } else {
    pagedHtml = buildHtml(slides, style, "paged", customStyle);
    scrollHtml = buildHtml(slides, style, "scroll", customStyle);
  }
  const id = `CF-${Date.now().toString(36).toUpperCase()}-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
  const job = {
    id,
    fileName: filename,
    slides: slides.length,
    style,
    status: "completed",
    updatedAt: new Date().toISOString(),
    previewUrl: `/outputs/${id}/index.html`,
    scrollUrl: `/outputs/${id}/index-scroll.html`,
    downloadUrl: `/api/jobs/${id}/download`,
    inlinePreviewHtml: pagedHtml,
    inlineScrollHtml: scrollHtml,
    inlinePreviewMode: "blob",
    aiStatus,
    share: {
      status: "ready",
      recommendation: extractionStats.skippedImages
        ? `Ready to share. ${extractionStats.embeddedImages} images were embedded. ${extractionStats.skippedImages} oversized images were skipped to avoid Cloudflare Worker resource limits.`
        : "Ready to share. Images are embedded in the HTML and included in the ZIP package.",
      totalImages: extractionStats.embeddedImages + extractionStats.skippedImages,
      embeddedImages: extractionStats.embeddedImages,
      missingImages: extractionStats.skippedImages,
      riskyPaths: 0,
      externalImages: 0,
      zipPackageUrl: `/api/jobs/${id}/download`,
      singleFileUrl: `/outputs/${id}/index-single-file.html`,
      scrollSingleFileUrl: `/outputs/${id}/index-scroll-single-file.html`,
      reportUrl: `/outputs/${id}/share-report.json`,
    },
  };
  jobs.set(id, job);
  jobList.unshift(job);
  while (jobList.length > 5) {
    const removed = jobList.pop();
    if (removed) jobs.delete(removed.id);
  }
  return job;
}

async function createJobFromSlides(payload) {
  const filename = String(payload.filename || "presentation.pptx");
  const slides = attachReferenceImages(normalizeSlidesPayload(payload.slides), payload.referencePack);
  const extractionStats = {
    embeddedImages: Number(payload.stats?.embeddedImages || 0),
    embeddedImageBytes: Number(payload.stats?.embeddedImageBytes || 0),
    skippedImages: Number(payload.stats?.skippedImages || 0),
    skippedBlankSlides: Number(payload.stats?.skippedBlankSlides || 0),
  };
  const style = payload.style || "teaching";
  const customStyle = normalizeCustomStyle(payload.customStyle);
  const requestConfig = mergedIntegrationConfig(payload.integration);
  let aiStatus = { mode: requestConfig.mode || "local", used: false, browserExtracted: true };
  let pagedHtml = "";
  if (requestConfig.mode && requestConfig.mode !== LOCAL_MODE) {
    try {
      pagedHtml = await maybeGenerateAiHtml(slides, requestConfig, style, customStyle, { referencePack: payload.referencePack });
      aiStatus = { mode: requestConfig.mode, provider: requestConfig.endpoint, used: true, resultType: "html", browserExtracted: true };
    } catch (error) {
      const message = String(error.message || error);
      const allowLocalFallback = requestConfig.mode === LOCAL_MODE || requestConfig.fallbackToLocal === true;
      aiStatus = { mode: requestConfig.mode, used: false, fallback: false, browserExtracted: true, error: message };
      if (!allowLocalFallback) throw new Error(`AI generation failed: ${aiStatus.error}`);
    }
  }
  let scrollHtml = "";
  if (pagedHtml) {
    validateAiHtmlCompleteness(pagedHtml, slides);
    pagedHtml = injectOriginalImages(pagedHtml, slides);
    pagedHtml = injectEditorRuntime(pagedHtml);
    scrollHtml = makeScrollHtml(pagedHtml);
  } else {
    pagedHtml = buildHtml(slides, style, "paged", customStyle);
    scrollHtml = buildHtml(slides, style, "scroll", customStyle);
  }
  const id = `CF-${Date.now().toString(36).toUpperCase()}-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
  const job = {
    id,
    fileName: filename,
    slides: slides.length,
    style,
    status: "completed",
    updatedAt: new Date().toISOString(),
    previewUrl: `/outputs/${id}/index.html`,
    scrollUrl: `/outputs/${id}/index-scroll.html`,
    downloadUrl: `/api/jobs/${id}/download`,
    inlinePreviewHtml: pagedHtml,
    inlineScrollHtml: scrollHtml,
    inlinePreviewMode: "blob",
    aiStatus,
    share: {
      status: "ready",
      recommendation: extractionStats.skippedImages
        ? `Ready to share. ${extractionStats.embeddedImages} images were embedded. ${extractionStats.skippedImages} oversized images were skipped while avoiding Cloudflare file-processing limits.`
        : "Ready to share. The PPT was extracted in the browser to avoid Cloudflare file-processing limits.",
      totalImages: extractionStats.embeddedImages + extractionStats.skippedImages,
      embeddedImages: extractionStats.embeddedImages,
      missingImages: extractionStats.skippedImages,
      riskyPaths: 0,
      externalImages: 0,
      zipPackageUrl: `/api/jobs/${id}/download`,
      singleFileUrl: `/outputs/${id}/index-single-file.html`,
      scrollSingleFileUrl: `/outputs/${id}/index-scroll-single-file.html`,
      reportUrl: `/outputs/${id}/share-report.json`,
    },
  };
  jobs.set(id, job);
  jobList.unshift(job);
  while (jobList.length > 5) {
    const removed = jobList.pop();
    if (removed) jobs.delete(removed.id);
  }
  return job;
}

function outlineEnrichmentPrompt(plan, payload = {}) {
  return `You are the structured content and layout assistant in a Banana Slides-style presentation pipeline.
Return one strict JSON object only. Do not return markdown or HTML.
Preserve every supplied slide title and bullet point exactly. Do not add facts or rewrite user content.
You may add only concise layout, visual focus, takeaway and speaker-note metadata.
The output must contain exactly ${plan.slides.length} slides in the same order.

Selected style: ${payload.style || plan.style || "banana"}
Input outline JSON:
${JSON.stringify({ title: plan.title, slides: plan.slides.map((slide) => ({ title: slide.title, body: slide.body, takeaway: slide.takeaway })) }).slice(0, 36000)}

Schema:
{
  "title": "deck title",
  "style": "selected style",
  "slides": [
    { "title": "same title", "body": ["same points"], "takeaway": "same first point", "visualFocus": "one concrete CSS/SVG visual module", "layoutSpec": "short layout instruction", "speakerNote": "optional" }
  ]
}`;
}

async function enrichOutlinePlanWithAi(plan, payload, requestConfig) {
  if (!requestConfig?.apiKey || !requestConfig?.endpoint) return null;
  const prompt = outlineEnrichmentPrompt(plan, payload);
  const text = requestConfig.mode === "workflow_api"
    ? await callWorkflowTextApi(prompt, requestConfig, { task: "outline_enrichment", style: payload.style || plan.style || "banana" })
    : await callAiTextApi(prompt, requestConfig, "You enrich presentation outlines. Return strict JSON only.");
  const parsed = parseAiJson(text);
  const aiSlides = Array.isArray(parsed?.slides) ? parsed.slides : [];
  if (aiSlides.length !== plan.slides.length) throw new Error("Outline enrichment returned the wrong slide count.");
  return normalizeTopicPlan({
    ...plan,
    style: payload.style || plan.style,
    slides: plan.slides.map((source, index) => ({
      ...source,
      title: source.title,
      body: source.body,
      takeaway: source.takeaway || aiSlides[index]?.takeaway || source.body?.[0] || "",
      visualFocus: cleanText(aiSlides[index]?.visualFocus || source.visualFocus || ""),
      layoutSpec: cleanText(aiSlides[index]?.layoutSpec || source.layoutSpec || ""),
      speakerNote: cleanText(aiSlides[index]?.speakerNote || source.speakerNote || ""),
    })),
  }, payload);
}

function directTopicPlan(payload = {}) {
  const title = cleanText(payload.topic || "AI Generated Presentation") || "AI Generated Presentation";
  const count = Math.max(3, Math.min(30, Number(payload.slideCount || 8)));
  return normalizeTopicPlan({
    title,
    audience: payload.audience || "",
    goal: payload.requirements || "",
    style: payload.style || "teaching",
    tone: "clear, visual, audience-first",
    slides: Array.from({ length: count }, (_, index) => ({
      page: index + 1,
      title: `Page ${index + 1}`,
      body: [],
      layout: index === 0 ? "cover" : "title-and-body",
    })),
  }, payload);
}

async function createJobFromTopic(payload) {
  const requestedStyle = payload.style || "teaching";
  const customStyle = normalizeCustomStyle(payload.customStyle);
  const requestConfig = mergedIntegrationConfig(payload.integration);
  const providedPlan = payload.plan || (payload.generationMode === "outline" && payload.outlineText
    ? outlinePlanFromText(payload.outlineText, payload)
    : null);
  // One-line mode goes directly to the HTML Anything page pass. It does not
  // make a separate outline request; the page records below are only stable
  // slots used to enforce the requested page count during chunked generation.
  const directOneLine = payload.generationMode === "one-line" && !providedPlan;
  let plan = normalizeTopicPlan(providedPlan || (directOneLine ? directTopicPlan(payload) : await createTopicPlan(payload)), payload);
  let outlineAiUsed = false;
  if (payload.generationMode === "outline" && providedPlan) {
    const enrichedPlan = await enrichOutlinePlanWithAi(plan, payload, requestConfig);
    if (enrichedPlan) {
      plan = enrichedPlan;
      outlineAiUsed = true;
    }
  }
  const style = plan.style || requestedStyle;
  const slides = attachReferenceImages(plan.slides.map((slide, index) => ({
    page: index + 1,
    title: cleanText(slide.title || `Key Idea ${index + 1}`),
    body: (Array.isArray(slide.body) ? slide.body : [])
      .map(cleanText)
      .filter(isUsefulText)
      .slice(0, 10),
    images: [],
    layout: cleanText(slide.layout || "balanced"),
    visualFocus: cleanText(slide.visualFocus || ""),
  })), payload.referencePack);
  let aiStatus = { mode: requestConfig.mode || "local", used: false, topicGenerated: true, planned: true };
  if (!requestConfig || requestConfig.mode === LOCAL_MODE) {
    throw new Error("AI intelligent generation requires an AI service. Configure an API key first.");
  }
  if (!requestConfig.apiKey) throw new Error("API key is required for AI intelligent generation.");
  if (!requestConfig.endpoint) throw new Error("API endpoint is required for AI intelligent generation.");

  let pagedHtml = "";
  const structuredQuickCreate = payload.generationMode === "one-line" || payload.generationMode === "outline";
  if (structuredQuickCreate) {
    try {
      // Banana Slides-style outline semantics feed an Oh My PPT-style page pass.
      // The local renderer is intentionally not used for an AI request.
      pagedHtml = await maybeGenerateAiHtml(slides, requestConfig, style, customStyle, { ...plan, source: payload.source || "quick-create", generationMode: payload.generationMode, referencePack: payload.referencePack });
      aiStatus = {
        mode: requestConfig.mode,
        provider: requestConfig.endpoint,
        used: true,
        resultType: "ai-html",
        topicGenerated: true,
        planned: Boolean(providedPlan) || outlineAiUsed,
        direct: payload.generationMode === "one-line",
      };
    } catch (error) {
      throw new Error(`AI intelligent generation failed: ${String(error.message || error)}`);
    }
  } else {
    try {
      pagedHtml = await maybeGenerateAiHtml(slides, requestConfig, style, customStyle, { ...plan, source: payload.source || "quick-create", generationMode: payload.generationMode, referencePack: payload.referencePack });
      aiStatus = {
        mode: requestConfig.mode,
        provider: requestConfig.endpoint,
        used: true,
        resultType: "html",
        topicGenerated: true,
        planned: true,
      };
    } catch (error) {
      throw new Error(`AI intelligent generation failed: ${String(error.message || error)}`);
    }
  }

  validateAiHtmlCompleteness(pagedHtml, slides);
  pagedHtml = injectOriginalImages(pagedHtml, slides);
  pagedHtml = enforceStylePackOnHtml(pagedHtml, style);
  pagedHtml = injectEditorRuntime(markCoverSlide(pagedHtml));
  const scrollHtml = makeScrollHtml(pagedHtml);
  const safeTitle = cleanText(plan.title || payload.topic || "AI Generated Presentation").slice(0, 80) || "AI Generated Presentation";
  const id = `AI-${Date.now().toString(36).toUpperCase()}-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
  const job = {
    id,
    fileName: `${safeTitle}.html`,
    slides: slides.length,
    style,
    status: "completed",
    updatedAt: new Date().toISOString(),
    previewUrl: `/outputs/${id}/index.html`,
    scrollUrl: `/outputs/${id}/index-scroll.html`,
    downloadUrl: `/api/jobs/${id}/download`,
    inlinePreviewHtml: pagedHtml,
    inlineScrollHtml: scrollHtml,
    inlinePreviewMode: "blob",
    aiStatus,
    topicPlan: plan,
    share: {
      status: "ready",
      recommendation: "Ready to share. This deck was generated from a topic and is packaged as self-contained HTML.",
      totalImages: slides.reduce((total, slide) => total + (slide.images?.length || 0), 0),
      embeddedImages: slides.reduce((total, slide) => total + (slide.images?.length || 0), 0),
      missingImages: 0,
      riskyPaths: 0,
      externalImages: 0,
      zipPackageUrl: `/api/jobs/${id}/download`,
      singleFileUrl: `/outputs/${id}/index-single-file.html`,
      scrollSingleFileUrl: `/outputs/${id}/index-scroll-single-file.html`,
      reportUrl: `/outputs/${id}/share-report.json`,
    },
  };
  jobs.set(id, job);
  jobList.unshift(job);
  while (jobList.length > 5) {
    const removed = jobList.pop();
    if (removed) jobs.delete(removed.id);
  }
  return job;
}

async function handleGenerate(request) {
  const payload = await readJson(request);
  const job = await createJob(payload);
  return json({ job });
}

async function handleGenerateFromSlides(request) {
  const payload = await readJson(request);
  const job = await createJobFromSlides(payload);
  return json({ job });
}

async function handleTopicPlan(request) {
  const payload = await readJson(request);
  const plan = await createTopicPlan(payload);
  return json({ plan });
}

async function handleGenerateFromTopic(request) {
  const payload = await readJson(request);
  const job = await createJobFromTopic(payload);
  return json({ job });
}

async function saveEdited(request, id) {
  const job = jobs.get(id);
  if (!job) return json({ error: "job_not_found", message: "This Cloudflare Worker instance no longer has the job. Regenerate the PPT and download immediately." }, 404);
  const payload = await readJson(request);
  if (payload.pagedHtml) job.inlinePreviewHtml = String(payload.pagedHtml);
  if (payload.scrollHtml) job.inlineScrollHtml = String(payload.scrollHtml);
  job.updatedAt = new Date().toISOString();
  return json({ job: publicJob(job), share: job.share });
}

async function testIntegration() {
  if (integrationConfig.mode === "local") return json({ ok: true, message: "Local Cloudflare rules are ready." });
  if (!integrationConfig.apiKey) return json({ ok: false, message: "API key is required." }, 400);
  try {
    const html = await maybeGenerateAiHtml([{ title: "API Test", body: ["Return a tiny valid HTML slide."], images: [] }], integrationConfig, "clean");
    return json({ ok: Boolean(html), message: html ? "API test passed." : "API responded but did not return HTML." });
  } catch (error) {
    return json({ ok: false, error: "integration_test_failed", message: String(error.message || error) }, 502);
  }
}

function routeOutput(path) {
  const match = path.match(/^\/outputs\/([^/]+)\/(.+)$/);
  if (!match) return null;
  const job = jobs.get(match[1]);
  if (!job) return json({ error: "job_not_found", message: "This generated file is no longer in Worker memory. Regenerate and download the ZIP." }, 404);
  const file = match[2];
  if (file === "index.html" || file === "index-single-file.html") return textResponse(job.inlinePreviewHtml, "text/html; charset=utf-8");
  if (file === "index-scroll.html" || file === "index-scroll-single-file.html") return textResponse(job.inlineScrollHtml, "text/html; charset=utf-8");
  if (file === "share-report.json") return json(job.share);
  return null;
}

async function handleApi(request, env) {
  const url = new URL(request.url);
  const path = url.pathname;
  if (request.method === "GET" && path === "/api/health") {
    return json({
      status: "ok",
      runtime: "cloudflare-worker-only",
      supportedFormats: [".pptx", ".docx (browser-local Markdown and AI HTML)"],
      maxUploadMb: Math.round(CLOUDFLARE_MAX_RAW_UPLOAD_BYTES / 1024 / 1024),
      maxRawUploadMb: Math.round(CLOUDFLARE_MAX_RAW_UPLOAD_BYTES / 1024 / 1024),
      maxRawUploadBytes: CLOUDFLARE_MAX_RAW_UPLOAD_BYTES,
      maxPayloadBytes: CLOUDFLARE_MAX_PAYLOAD_BYTES,
      message: "Cloudflare-only backend ready. PPTX conversion and browser-local Word Markdown conversion are available; no Vercel or Python backend is used.",
    });
  }
  if (request.method === "GET" && path === "/api/capabilities") {
    return json({
      appVersion: "recovery-v1",
      apiVersion: "2026-08-01",
      routes: {
        htmlAnything: "/api/html-anything/convert/stream",
        wordWindow: "/api/word-deck/v2/window/stream",
        wordOutlineV3: "/api/word-deck/v3/outline/stream",
        wordRenderV3: "/api/word-deck/v3/render/window/stream",
        pptAiEnhance: "/api/ppt-ai-enhance",
        pdfAiEnhance: "/api/pdf-ai-enhance/stream",
        pdfPresentationPlan: "/api/pdf-presentation/v1/plan/stream",
        pdfPresentationPlanV2: "/api/pdf-presentation/v2/plan/stream",
        pdfResearchOutline: "/api/pdf-research/v4/outline/stream",
        pdfResearchDeck: "/api/pdf-research/v4/deck/stream",
        pdfResearchOutlineV5: "/api/pdf-research/v5/outline/stream",
        pdfResearchDeckV5: "/api/pdf-research/v5/deck/stream",
        imageModelConfig: "/api/image-model/config",
        imageModelTest: "/api/image-model/test",
        minimalZineCompile: "/api/minimal-zine-poster/v1/compile/stream",
        minimalZineRender: "/api/minimal-zine-poster/v1/render",
        quietHumanistCompile: "/api/quiet-humanist-poster/v1/compile/stream",
        quietHumanistRender: "/api/quiet-humanist-poster/v1/render",
        acidSwissCompile: "/api/acid-swiss-poster/v1/compile/stream",
        acidSwissRender: "/api/acid-swiss-poster/v1/render",
        editorialActionCompile: "/api/editorial-action-poster/v1/compile/stream",
        editorialActionRender: "/api/editorial-action-poster/v1/render",
        qiaomuMondoCompile: "/api/qiaomu-mondo-poster/v1/compile/stream",
        qiaomuMondoRender: "/api/qiaomu-mondo-poster/v1/render",
        academicPosterCopy: "/api/academic-poster/copy/stream",
        academicPosterImage: "/api/academic-poster/image",
        academicPosterPlan: "/api/academic-poster/plan/stream",
        academicPosterRender: "/api/academic-poster/render/stream",
        academicPosterReview: "/api/academic-poster/review/stream",
        academicPosterV4Plan: "/api/academic-poster/v4/plan/stream",
        academicPosterV4Render: "/api/academic-poster/v4/render/stream",
        academicPosterV4Review: "/api/academic-poster/v4/review/stream",
        academicPosterV4Repair: "/api/academic-poster/v4/repair/stream",
        academicPosterV5Analyze: "/api/academic-poster/v5/analyze/stream",
        academicPosterV5Brief: "/api/academic-poster/v5/brief/stream",
        academicPosterV5Generate: "/api/academic-poster/v5/generate",
        academicPosterV5Compose: "/api/academic-poster/v5/compose/stream",
        academicPosterV5Review: "/api/academic-poster/v5/review/stream",
        academicPosterV5Repair: "/api/academic-poster/v5/repair/stream",
      },
    });
  }
  if (request.method === "GET" && path === "/api/help/api-guide") return json({ markdown: DEFAULT_API_GUIDE });
  if (request.method === "GET" && path === "/api/jobs") {
    const source = url.searchParams.get("source") || "";
    const list = source === "converter" ? jobList.filter(isConverterJob) : jobList;
    return json({ jobs: list.map((job) => publicJob(job)) });
  }
  if (request.method === "GET" && path === "/api/integration") return json({ integration: publicIntegration() });
  if (request.method === "POST" && path === "/api/integration") {
    const payload = await readJson(request);
    const patch = payload.integration || payload;
    integrationConfig = { ...integrationConfig, ...patch };
    if (!patch.apiKey && integrationConfig.apiKey && !patch.clearApiKey) {
      integrationConfig.apiKey = integrationConfig.apiKey;
    }
    if (patch.clearApiKey) integrationConfig.apiKey = "";
    return json({ integration: publicIntegration() });
  }
  if (request.method === "POST" && path === "/api/integration/test") return testIntegration();
  if (request.method === "POST" && path === "/api/html-anything/convert/stream") return handleHtmlAnythingConvertStream(request);
  if (request.method === "POST" && path === "/api/word-deck/v3/outline/stream") return handleWordV3OutlineStream(request);
  if (request.method === "POST" && path === "/api/word-deck/v3/render/window/stream") return handleHtmlAnythingConvertStream(request);
  // Word conversion is orchestrated by the browser one page window at a time.
  // Reuse the exact HTML Anything prompt/validator for each window so the
  // existing quick/chat contract and quality rules remain unchanged.
  if (request.method === "POST" && path === "/api/word-deck/v2/window/stream") return handleHtmlAnythingConvertStream(request);
  if (request.method === "POST" && path === "/api/ppt-ai-enhance") return handlePptAiEnhance(request);
  if (request.method === "POST" && path === "/api/ppt-ai-enhance/stream") return handlePptAiEnhance(request);
  if (request.method === "POST" && path === "/api/ai-generation/start") return handleAiGenerationStart(request);
  if (request.method === "POST" && path === "/api/ai-generation/chunk") return handleAiGenerationChunk(request);
  if (request.method === "POST" && path === "/api/ai-generation/finalize") return handleAiGenerationFinalize(request);
  if (request.method === "POST" && path === "/api/generate") return handleGenerate(request);
  if (request.method === "POST" && path === "/api/generate-ai-from-slides") return handleGenerateFromSlides(request);
  if (request.method === "POST" && path === "/api/ai-topic-plan") return handleTopicPlan(request);
  if (request.method === "POST" && path === "/api/chat-brief") return handleChatBrief(request);
  if (request.method === "POST" && path === "/api/chat-create-outline") return handleChatCreateOutline(request);
  if (request.method === "POST" && path === "/api/generate-from-topic") return handleGenerateFromTopic(request);
  if (request.method === "POST" && path === "/api/chat-edit-patch") return handleChatEditPatch(request);
  if (request.method === "POST" && path === "/api/pdf-ai-enhance/stream") return pdfAiEnhanceStream(request);
  if (request.method === "POST" && path === "/api/pdf-presentation/v1/plan/stream") return pdfPresentationPlanStream(request);
  if (request.method === "POST" && path === "/api/pdf-presentation/v2/plan/stream") return pdfPresentationNarrativeV2Stream(request);
  if (request.method === "POST" && path === "/api/pdf-research/v3/outline/stream") return pdfResearchOutlineStream(request);
  if (request.method === "POST" && path === "/api/pdf-research/v3/deck/stream") return pdfResearchDeckStream(request);
  if (request.method === "POST" && path === "/api/pdf-research/v4/outline/stream") return pdfResearchOutlineV4Stream(request);
  if (request.method === "POST" && path === "/api/pdf-research/v4/deck/stream") return pdfResearchDeckV4Stream(request);
  if (request.method === "POST" && path === "/api/pdf-research/v5/outline/stream") return pdfResearchOutlineV5Stream(request);
  if (request.method === "POST" && path === "/api/pdf-research/v5/deck/stream") return pdfResearchDeckV5Stream(request);
  // Poster types use independent contracts: Minimal Zine owns its visual
  // compiler; Academic Poster retains its source-locked workflow.
  if (request.method === "GET" && path === "/api/image-model/config") return handleImageModelConfig(request);
  if (request.method === "POST" && path === "/api/image-model/test") return handleImageModelTest(request, env);
  if (request.method === "POST" && path === "/api/minimal-zine-poster/v1/compile/stream") return handleMinimalZineCompileStream(request);
  if (request.method === "POST" && path === "/api/minimal-zine-poster/v1/render") return handleMinimalZineRender(request, env);
  if (request.method === "POST" && path === "/api/quiet-humanist-poster/v1/compile/stream") return handleQuietHumanistCompileStream(request);
  if (request.method === "POST" && path === "/api/quiet-humanist-poster/v1/render") return handleQuietHumanistRender(request, env);
  if (request.method === "POST" && path === "/api/acid-swiss-poster/v1/compile/stream") return handleAcidSwissCompileStream(request);
  if (request.method === "POST" && path === "/api/acid-swiss-poster/v1/render") return handleAcidSwissRender(request, env);
  if (request.method === "POST" && path === "/api/editorial-action-poster/v1/compile/stream") return handleEditorialActionCompileStream(request);
  if (request.method === "POST" && path === "/api/editorial-action-poster/v1/render") return handleEditorialActionRender(request, env);
  if (request.method === "POST" && path === "/api/qiaomu-mondo-poster/v1/compile/stream") return handleQiaomuMondoCompileStream(request);
  if (request.method === "POST" && path === "/api/qiaomu-mondo-poster/v1/render") return handleQiaomuMondoRender(request, env);
  if (request.method === "POST" && path === "/api/academic-poster/copy/stream") return handleAcademicPosterCopyStream(request);
  if (request.method === "POST" && path === "/api/academic-poster/image") return handleAcademicPosterImage(request, env);
  if (request.method === "POST" && (path === "/api/pdf-academic/plan/stream" || path === "/api/pdf-academic/render/stream")) return json({ error: "pdf_route_migrated", message: "PDF conversion now uses the shared converter flow and /api/pdf-ai-enhance/stream." }, 410);
  if (request.method === "POST" && path === "/api/academic-poster/plan/stream") return academicPlanStream(request, "poster");
  if (request.method === "POST" && path === "/api/academic-poster/render/stream") return academicRenderStream(request, "poster");
  if (request.method === "POST" && path === "/api/academic-poster/review/stream") return academicPosterReviewStream(request);
  if (request.method === "POST" && path === "/api/academic-poster/v4/plan/stream") return paper2PosterPlanStream(request);
  if (request.method === "POST" && path === "/api/academic-poster/v4/render/stream") return paper2PosterRenderStream(request);
  if (request.method === "POST" && path === "/api/academic-poster/v4/review/stream") return paper2PosterReviewStream(request);
  if (request.method === "POST" && path === "/api/academic-poster/v4/repair/stream") return paper2PosterRepairStream(request);
  if (request.method === "POST" && path === "/api/academic-poster/v5/analyze/stream") return academicPosterV5AnalyzeStream(request);
  if (request.method === "POST" && path === "/api/academic-poster/v5/brief/stream") return academicPosterV5BriefStream(request);
  if (request.method === "POST" && path === "/api/academic-poster/v5/generate") return handleAcademicPosterImage(request, env);
  if (request.method === "POST" && path === "/api/academic-poster/v5/compose/stream") return academicPosterV5ComposeStream(request);
  if (request.method === "POST" && path === "/api/academic-poster/v5/review/stream") return academicPosterV5ReviewStream(request);
  if (request.method === "POST" && path === "/api/academic-poster/v5/repair/stream") return academicPosterV5RepairStream(request);
  const saveMatch = path.match(/^\/api\/jobs\/([^/]+)\/save-edited$/);
  if (request.method === "POST" && saveMatch) return saveEdited(request, saveMatch[1]);
  const shareMatch = path.match(/^\/api\/jobs\/([^/]+)\/share$/);
  if (request.method === "GET" && shareMatch) {
    const job = jobs.get(shareMatch[1]);
    if (!job) return json({ error: "job_not_found" }, 404);
    return json({ job: publicJob(job), share: job.share });
  }
  const downloadMatch = path.match(/^\/api\/jobs\/([^/]+)\/download$/);
  if (request.method === "GET" && downloadMatch) {
    const job = jobs.get(downloadMatch[1]);
    if (!job) return json({ error: "job_not_found", message: "Regenerate this PPT and download immediately. Worker memory is temporary without KV/R2." }, 404);
    const zipBytes = await buildZip(job);
    return bytesResponse(zipBytes, "application/zip", `${job.id}.zip`);
  }
  return null;
}

export default {
  async fetch(request, env) {
    try {
      const url = new URL(request.url);
      if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders() });
      if (url.pathname.startsWith("/api/")) {
        const response = await handleApi(request, env);
        if (response) return response;
      }
      if (url.pathname.startsWith("/outputs/")) {
        const response = routeOutput(url.pathname);
        if (response) return response;
      }
      if (url.pathname === "/") {
        return freshAsset(env, request, "/index-current.html");
      }
      if (url.pathname === "/ai-generate.html" || url.pathname === "/ai-generate" || url.pathname === "/ai-create.html" || url.pathname === "/ai-create") {
        return freshAsset(env, request, "/quick-create-current.html");
      }
      if (url.pathname === "/converter" || url.pathname === "/converter.html") {
        return freshAsset(env, request, "/converter-current.html");
      }
      if (url.pathname === "/chat-create" || url.pathname === "/chat-create.html") {
        return freshAsset(env, request, "/chat-create-current.html");
      }
      if (url.pathname === "/poster" || url.pathname === "/poster.html") {
        // Cloudflare Assets canonicalizes .html assets to their extensionless
        // route. Fetching /poster.html here makes both /poster and /poster.html
        // redirect back to /poster, which the Worker then repeats forever.
        return freshAsset(env, request, "/poster");
      }
      if (url.pathname === "/poster-ai-settings" || url.pathname === "/poster-ai-settings.html") {
        // Assets canonicalizes the HTML file to the extensionless key. Fetching
        // the .html key here would redirect back into this branch forever.
        return freshAsset(env, request, "/poster-ai-settings");
      }
      if (url.pathname === "/ai-settings" || url.pathname === "/ai-settings.html" || url.pathname === "/settings" || url.pathname === "/settings.html") {
        return freshAsset(env, request, "/settings-current.html");
      }
      if (["/editor", "/editor.html", "/import-html", "/import-html.html", "/html-import", "/html-import.html", "/html-editor", "/html-editor.html"].includes(url.pathname)) {
        // Cloudflare Pages Assets canonicalizes *.html to the extensionless
        // pathname. Fetch the canonical key here; fetching editor.html from
        // the Worker would redirect back to /editor and loop forever.
        return freshAsset(env, request, "/editor");
      }
      if (url.pathname === "/static/ai-generate.js") {
        return freshAsset(env, request, "/static/ai-generate-live.js");
      }
      if (url.pathname === "/static/ai-generate.css") {
        return freshAsset(env, request, "/static/ai-generate-live.css");
      }
      if (url.pathname === "/static/app-settings.js" || url.pathname === "/static/studio-settings.js") {
        return freshAsset(env, request, url.pathname);
      }
      if (
        url.pathname === "/static/home.css" ||
        url.pathname === "/static/styles.css" ||
        url.pathname === "/static/chat-create.css" ||
        url.pathname === "/static/ai-settings.css" ||
        url.pathname === "/static/ai-settings.js"
      ) {
        return freshAsset(env, request, url.pathname);
      }
      return freshAsset(env, request, url.pathname);
    } catch (error) {
      return json({ error: "worker_error", message: String(error.message || error) }, 500);
    }
  },
};
