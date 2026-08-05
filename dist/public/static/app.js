const steps = [
  ["Upload File", "Add your PPT file"],
  ["Choose Style", "Pick a visual style"],
  ["Choose Method", "Local rules or AI"],
  ["Edit", "Review and refine HTML"],
];

const styles = window.PptStyleRegistry?.builtinOptions?.() || (window.PptQualitySystem?.builtinStyles || ((items) => items))([
  ["source", "Original PPT"],
  ["teaching", "Teaching Blue"],
  ["academic", "Academic Style"],
  ["swiss", "Swiss Grid"],
  ["softlesson", "Soft Lesson"],
  ["clean", "Clean"],
  ["instructional", "Instructional"],
  ["minimal", "Minimal"],
  ["contrast", "High Contrast"],
  ["healing", "Healing Hand-drawn"],
  ["doodle", "Doodle Sketch"],
  ["editorial", "Editorial"],
  ["vivid", "Vivid"],
]);

const LANGUAGE_STORAGE_KEY = "ppt-html-studio-language";
const THEME_STORAGE_KEY = "ppt-html-studio-theme";
const PREVIEW_DESKTOP_WIDTH = 1280;
const PREVIEW_DESKTOP_HEIGHT = 720;
const CUSTOM_STYLE_STORAGE_KEY = "ppt-html-studio-custom-styles-v1";
const PPT_FAST_AI_MAX_SLIDES = 16;
const QUICK_FIX_BUTTONS = {
  overflow: "fixOverflow",
  images: "fixImages",
  contrast: "fixContrast",
  missing: "fixMissingImages",
  crowded: "fixCrowded",
  ai: "fixAi",
};
const i18n = {
  en: {
    help: "Help",
    settings: "Settings",
    language: "Language",
    appearance: "Appearance",
    lightMode: "Light mode",
    darkMode: "Dark mode",
    beigeMode: "Beige mode",
    interfaceLanguage: "Interface language",
    languageHint: "This only changes the platform interface. Generated PPT/HTML content stays unchanged.",
    english: "English",
    chinese: "\u4e2d\u6587",
    close: "Close",
    apply: "Apply",
    workflowTip: "Workflow tip",
    workflowTipBody: "Follow the steps from top to bottom. Download exports a ZIP with HTML and images.",
    stepUpload: "Upload File",
    stepUploadDesc: "Add a PPT or PDF file",
    stepStyle: "Choose Style",
    stepStyleDesc: "Pick a visual style",
    stepMethod: "Choose Method",
    stepMethodDesc: "Local rules or AI",
    stepEdit: "Edit",
    stepEditDesc: "Review and refine HTML",
    uploadPpt: "Upload PPT / PDF",
    checkingBackend: "Checking backend",
    backendReady: "Backend ready",
    backendOffline: "Backend offline",
    dragDrop: "Drag & drop your PPT or PDF file here",
    or: "or",
    checkingUploadLimit: "Checking upload limit...",
    selected: "selected",
    style: "Style",
    customStyle: "Custom style",
    importPptStyle: "Import PPT style",
    customStyleKicker: "Custom style",
    customStyleTitle: "Create a reusable style",
    customStyleName: "Style name",
    customStyleTitleFont: "Title font",
    customStyleBodyFont: "Body font",
    customStyleLayout: "Layout preference",
    customStyleBg: "Background",
    customStyleText: "Text",
    customStylePrimary: "Primary",
    customStyleAccent: "Accent",
    customStylePrompt: "AI prompt addon",
    customStyleLocalRules: "Local rule summary",
    saveCustomStyle: "Save style",
    deleteCustomStyle: "Delete",
    customStyleSaved: "Custom style saved on this browser.",
    customStyleDeleted: "Custom style deleted.",
    customStyleImported: "Imported a style draft from the PPT. Review and save it.",
    customStyleNeedName: "Please enter a style name.",
    customStyleNoDelete: "This style has not been saved yet.",
    customStyleConfirmDelete: "Delete this custom style?",
    customStyleImportPptxOnly: "Please import a .pptx file.",
    customStyleAnalyzing: "Analyzing PPT style...",
    keepText: "Keep text unchanged",
    keepTextDesc: "Do not modify wording",
    readable: "Readable 16px+",
    readableDesc: "Ensure text is easy to read",
    imagesIntact: "Images intact",
    imagesIntactDesc: "Keep original images visible",
    aiConnection: "AI connection",
    aiIntro: "Pick a service, paste the key, then save. Your saved API settings stay on this machine and are reused for every generation.",
    service: "Service",
    endpoint: "Endpoint",
    model: "Model",
    apiKey: "API key",
    apiKeyPlaceholder: "Paste key once, then leave blank",
    noSavedKey: "No saved key yet.",
    advancedConnection: "Advanced connection settings",
    apiKeyHeader: "API key header",
    apiKeyPrefix: "API key prefix",
    workflowPayload: "Workflow payload",
    timeoutSec: "Timeout (sec)",
    customHeaders: "Custom headers",
    fallbackLocal: "Fallback to local rules if API fails",
    clearSavedKey: "Clear saved API key on save",
    saveConnection: "Save connection",
    testApi: "Test API",
    localRulesActive: "Local rules active",
    generateHtml: "Generate HTML",
    preview: "Preview",
    analyzeShare: "Analyze & Share",
    downloadZip: "Download ZIP",
    noGenerated: "No generated HTML yet",
    noGeneratedDesc: "Upload a PPT or PDF and run the workflow to see the first page here.",
    fit: "Fit",
    editHtml: "Edit HTML",
    stopEditing: "Stop Editing",
    saveEdits: "Save Edits",
    openScrollHtml: "Open Scroll HTML",
    quickFixTitle: "One-click result repair",
    quickFixNone: "No layout issues detected.",
    quickFixDetected: "{count} issue groups detected.",
    quickFixApplied: "Quick fix applied. Save edits or download ZIP to keep it.",
    fixOverflow: "Fix overflow",
    fixImages: "Re-layout images",
    fixContrast: "Improve contrast",
    fixMissingImages: "Restore missing images",
    fixCrowded: "Split crowded slide",
    fixAi: "AI repair layout",
    quickFixAiRunning: "AI is repairing the current layout...",
    quickFixAiNoConfig: "Choose an AI service and save an API key before using AI repair.",
    quickFixAiApplied: "AI layout repair applied. Save edits or download ZIP to keep it.",
    shareReadiness: "Share readiness",
    notChecked: "Not checked",
    downloadZipPackage: "Download ZIP package",
    openSingleFile: "Open single-file HTML",
    openScrollSingleFile: "Open scroll single-file HTML",
    openReport: "Open report",
    jobHistory: "Job History",
    refresh: "Refresh",
    id: "ID",
    fileName: "File Name",
    slides: "Slides",
    status: "Status",
    ai: "AI",
    updatedAt: "Updated At",
    actions: "Actions",
    noJobs: "No jobs yet",
    guide: "Guide",
    apiTutorial: "API Configuration Tutorial",
    loadingApiGuide: "Loading API configuration tutorial...",
    generationTitle: "Generating HTML",
    generationMessage: "AI is arranging content, images, and layout...",
    hideGeneration: "Hide generation animation",
    clearFile: "Clear file",
    uploadLimitCloudflare: "Cloudflare-only mode supports .pptx and .docx files up to about {size}. Old .ppt files require the local Python backend.",
    uploadLimitServerless: "Serverless mode supports PPT and Word files up to about {size}. Larger files need local running or dedicated storage.",
    uploadLimitDefault: "Supports .ppt, .pptx and .docx up to {size}",
    fileTooLarge: "{name} is {fileSize}, which is larger than this deployment can safely upload ({limit}). Run the app locally for larger files.",
    readyGenerate: "Ready to generate.",
    uploadFirst: "Upload a PPT or PDF first.",
    labelsUploading: "Uploading",
    labelsExtracting: "Extracting",
    labelsOptimizing: "Optimizing",
    labelsConverting: "Converting",
    labelsPreparing: "Preparing editor",
    preparingPpt: "Preparing the PPT for AI layout generation...",
    completedBrowserAi: "Completed. AI generated directly in the browser to avoid Cloudflare timeout.",
    localFallbackDone: "Generated with local rules because AI was unavailable or too slow. {extra}",
    oversizedSkipped: "Some oversized images were skipped.",
    generateOrSelect: "Generate or select a job first.",
    packaging: "Packaging...",
    packagingStatus: "Packaging current HTML in the browser...",
    downloadingLatest: "Downloading ZIP package with the latest edited HTML.",
    saveBrowserOnly: "Edits are saved in this browser. Download ZIP will include the latest edits.",
    savedEdited: "Edited paged and scroll HTML saved.",
    couldNotSaveEdited: "Could not save edited HTML.",
    analyzingShare: "Analyzing share package...",
    checkingShare: "Checking image paths and building the share package...",
    shareMissing: "Share package has missing images.",
    shareReady: "Share package is ready.",
    shareFirst: "Generate or select a job first, then run Analyze & Share.",
    checking: "Checking",
    ready: "Ready",
    warning: "Check advised",
    blocked: "Blocked",
    images: "Images",
    embedded: "Embedded",
    missing: "Missing",
    riskyPaths: "Risky paths",
    external: "External",
    localRulesNoKey: "Local rules do not need an API key.",
    savedKey: "Saved key: {key}. Leave the key field blank to keep it.",
    pasteKeyOnce: "Paste the API key once. After saving, it is kept locally and reused.",
    noSavedKeyPaste: "No saved key yet. Paste a key once and save.",
    externalApiEnabled: "External API enabled",
    apiSettingsSaved: "API settings saved.",
    savingApiSettings: "Saving API settings...",
    testingApi: "Testing API endpoint...",
    apiTestPassed: "API test passed.",
    couldNotLoadApi: "Could not load API settings.",
    couldNotSaveApi: "Could not save API settings",
    apiTestFailed: "API test failed",
    backendHealthFailed: "Backend health check failed",
    externalBackendHealthFailed: "External backend health check failed",
    openaiReady: "OpenAI-compatible ready",
    deepseekReady: "DeepSeek ready",
    doubaoReady: "Doubao Seed 2.0 ready",
    customAiReady: "Custom AI API ready",
    workflowReady: "Workflow API ready",
    difyReady: "Dify workflow ready",
    aiUsed: "AI used ({provider}, {type}).",
    aiOptimizedSlides: "optimized slides",
    aiHtml: "HTML",
    aiFallback: "AI fallback: {error}",
    externalApiFailed: "external API failed",
    configured: "{mode} configured.",
    local: "Local",
    aiSlides: "AI slides",
    fallback: "Fallback",
    previewButton: "Preview",
    selectGeneratedJob: "Select generated job",
    jobsSlides: "{count} slides",
    clear: "x",
    providerLocal: "Local rules",
    providerDeepseek: "DeepSeek",
    providerDoubao: "Doubao Seed 2.0",
    providerOpenai: "OpenAI compatible",
    providerCustomAi: "Custom AI API",
    providerWorkflow: "Workflow API",
    providerDify: "Dify workflow",
    noApiKeyHeader: "No API key header",
    flatJson: "Flat JSON",
    inputJson: "{ \"input\": ... }",
    difyBlocking: "Dify blocking",
  },
  zh: {
    help: "\u5e2e\u52a9",
    settings: "\u8bbe\u7f6e",
    language: "\u8bed\u8a00",
    appearance: "\u5916\u89c2",
    lightMode: "\u6d45\u8272\u6a21\u5f0f",
    darkMode: "\u6df1\u8272\u6a21\u5f0f",
    beigeMode: "\u7c73\u8272\u6a21\u5f0f",
    interfaceLanguage: "\u754c\u9762\u8bed\u8a00",
    languageHint: "\u8fd9\u91cc\u53ea\u5207\u6362\u5e73\u53f0\u754c\u9762\u8bed\u8a00\uff0c\u4e0d\u4f1a\u6539\u53d8\u751f\u6210\u7684 PPT/HTML \u5185\u5bb9\u3002",
    english: "English",
    chinese: "\u4e2d\u6587",
    close: "\u5173\u95ed",
    apply: "\u5e94\u7528",
    workflowTip: "\u5de5\u4f5c\u6d41\u63d0\u793a",
    workflowTipBody: "\u6309\u4ece\u4e0a\u5230\u4e0b\u7684\u6b65\u9aa4\u64cd\u4f5c\u3002\u4e0b\u8f7d\u4f1a\u5bfc\u51fa\u5305\u542b HTML \u548c\u56fe\u7247\u7684 ZIP \u5305\u3002",
    stepUpload: "\u4e0a\u4f20\u6587\u4ef6",
    stepUploadDesc: "\u6dfb\u52a0 PPT \u6216 PDF \u6587\u4ef6",
    stepStyle: "\u9009\u62e9\u98ce\u683c",
    stepStyleDesc: "\u9009\u62e9\u89c6\u89c9\u6837\u5f0f",
    stepMethod: "\u9009\u62e9\u4f18\u5316\u65b9\u5f0f",
    stepMethodDesc: "\u672c\u5730\u89c4\u5219\u6216 AI",
    stepEdit: "\u7f16\u8f91",
    stepEditDesc: "\u68c0\u67e5\u5e76\u5fae\u8c03 HTML",
    uploadPpt: "\u4e0a\u4f20 PPT / PDF",
    checkingBackend: "\u6b63\u5728\u68c0\u67e5\u540e\u7aef",
    backendReady: "\u540e\u7aef\u5df2\u5c31\u7eea",
    backendOffline: "\u540e\u7aef\u79bb\u7ebf",
    dragDrop: "\u5c06 PPT \u6216 PDF \u6587\u4ef6\u62d6\u5230\u8fd9\u91cc",
    or: "\u6216",
    checkingUploadLimit: "\u6b63\u5728\u68c0\u67e5\u4e0a\u4f20\u9650\u5236...",
    selected: "\u5df2\u9009\u62e9",
    style: "\u98ce\u683c",
    customStyle: "\u81ea\u5b9a\u4e49\u98ce\u683c",
    importPptStyle: "\u5bfc\u5165 PPT \u98ce\u683c",
    customStyleKicker: "\u81ea\u5b9a\u4e49\u98ce\u683c",
    customStyleTitle: "\u521b\u5efa\u53ef\u590d\u7528\u98ce\u683c",
    customStyleName: "\u98ce\u683c\u540d\u79f0",
    customStyleTitleFont: "\u6807\u9898\u5b57\u4f53",
    customStyleBodyFont: "\u6b63\u6587\u5b57\u4f53",
    customStyleLayout: "\u7248\u5f0f\u504f\u597d",
    customStyleBg: "\u80cc\u666f\u8272",
    customStyleText: "\u6587\u5b57\u8272",
    customStylePrimary: "\u4e3b\u8272",
    customStyleAccent: "\u5f3a\u8c03\u8272",
    customStylePrompt: "AI \u63d0\u793a\u8bcd\u8865\u5145",
    customStyleLocalRules: "\u672c\u5730\u89c4\u5219\u6458\u8981",
    saveCustomStyle: "\u4fdd\u5b58\u98ce\u683c",
    deleteCustomStyle: "\u5220\u9664",
    customStyleSaved: "\u81ea\u5b9a\u4e49\u98ce\u683c\u5df2\u4fdd\u5b58\u5728\u672c\u6d4f\u89c8\u5668\u3002",
    customStyleDeleted: "\u81ea\u5b9a\u4e49\u98ce\u683c\u5df2\u5220\u9664\u3002",
    customStyleImported: "\u5df2\u4ece PPT \u751f\u6210\u98ce\u683c\u8349\u7a3f\uff0c\u68c0\u67e5\u540e\u4fdd\u5b58\u5373\u53ef\u4f7f\u7528\u3002",
    customStyleNeedName: "\u8bf7\u8f93\u5165\u98ce\u683c\u540d\u79f0\u3002",
    customStyleNoDelete: "\u8fd9\u4e2a\u98ce\u683c\u5c1a\u672a\u4fdd\u5b58\u3002",
    customStyleConfirmDelete: "\u786e\u5b9a\u5220\u9664\u8fd9\u4e2a\u81ea\u5b9a\u4e49\u98ce\u683c\u5417\uff1f",
    customStyleImportPptxOnly: "\u8bf7\u5bfc\u5165 .pptx \u6587\u4ef6\u3002",
    customStyleAnalyzing: "\u6b63\u5728\u5206\u6790 PPT \u98ce\u683c...",
    keepText: "\u4fdd\u6301\u6587\u5b57\u4e0d\u53d8",
    keepTextDesc: "\u4e0d\u4fee\u6539\u539f\u6587\u63aa\u8f9e",
    readable: "\u53ef\u8bfb 16px+",
    readableDesc: "\u786e\u4fdd\u6587\u5b57\u6e05\u6670\u6613\u8bfb",
    imagesIntact: "\u4fdd\u7559\u56fe\u7247",
    imagesIntactDesc: "\u4fdd\u6301\u539f\u56fe\u53ef\u89c1",
    aiConnection: "AI \u8fde\u63a5",
    aiIntro: "\u9009\u62e9\u670d\u52a1\uff0c\u7c98\u8d34\u5bc6\u94a5\u540e\u4fdd\u5b58\u3002API \u8bbe\u7f6e\u4f1a\u4fdd\u5b58\u5728\u672c\u673a\uff0c\u5e76\u5728\u6bcf\u6b21\u751f\u6210\u65f6\u590d\u7528\u3002",
    service: "\u670d\u52a1",
    endpoint: "\u517c\u5bb9\u5730\u5740",
    model: "\u6a21\u578b",
    apiKey: "API \u5bc6\u94a5",
    apiKeyPlaceholder: "\u7c98\u8d34\u4e00\u6b21\u5bc6\u94a5\uff0c\u4e4b\u540e\u53ef\u7559\u7a7a",
    noSavedKey: "\u5c1a\u672a\u4fdd\u5b58\u5bc6\u94a5\u3002",
    advancedConnection: "\u9ad8\u7ea7\u8fde\u63a5\u8bbe\u7f6e",
    apiKeyHeader: "API \u5bc6\u94a5 Header",
    apiKeyPrefix: "API \u5bc6\u94a5\u524d\u7f00",
    workflowPayload: "\u5de5\u4f5c\u6d41\u53c2\u6570\u683c\u5f0f",
    timeoutSec: "\u8d85\u65f6\u65f6\u95f4\uff08\u79d2\uff09",
    customHeaders: "\u81ea\u5b9a\u4e49 Headers",
    fallbackLocal: "API \u5931\u8d25\u65f6\u56de\u9000\u5230\u672c\u5730\u89c4\u5219",
    clearSavedKey: "\u4fdd\u5b58\u65f6\u6e05\u9664\u5df2\u4fdd\u5b58\u5bc6\u94a5",
    saveConnection: "\u4fdd\u5b58\u8fde\u63a5",
    testApi: "\u6d4b\u8bd5 API",
    localRulesActive: "\u672c\u5730\u89c4\u5219\u5df2\u542f\u7528",
    generateHtml: "\u751f\u6210 HTML",
    preview: "\u9884\u89c8",
    analyzeShare: "\u5206\u6790\u4e0e\u5206\u4eab",
    downloadZip: "\u4e0b\u8f7d ZIP",
    noGenerated: "\u6682\u65e0\u751f\u6210\u7684 HTML",
    noGeneratedDesc: "\u4e0a\u4f20 PPT \u6216 PDF \u5e76\u8fd0\u884c\u5de5\u4f5c\u6d41\u540e\uff0c\u8fd9\u91cc\u4f1a\u663e\u793a\u7b2c\u4e00\u9875\u9884\u89c8\u3002",
    fit: "\u9002\u914d",
    editHtml: "\u7f16\u8f91 HTML",
    stopEditing: "\u505c\u6b62\u7f16\u8f91",
    saveEdits: "\u4fdd\u5b58\u4fee\u6539",
    openScrollHtml: "\u6253\u5f00\u6ed1\u52a8\u7248 HTML",
    quickFixTitle: "\u4e00\u952e\u4fee\u590d\u751f\u6210\u7ed3\u679c",
    quickFixNone: "\u672a\u68c0\u6d4b\u5230\u660e\u663e\u6392\u7248\u95ee\u9898\u3002",
    quickFixDetected: "\u68c0\u6d4b\u5230 {count} \u7c7b\u95ee\u9898\u3002",
    quickFixApplied: "\u5df2\u5e94\u7528\u4e00\u952e\u4fee\u590d\u3002\u70b9\u51fb\u4fdd\u5b58\u4fee\u6539\u6216\u4e0b\u8f7d ZIP \u53ef\u4fdd\u7559\u7ed3\u679c\u3002",
    fixOverflow: "\u4fee\u590d\u6ea2\u51fa",
    fixImages: "\u91cd\u65b0\u6392\u7248\u56fe\u7247",
    fixContrast: "\u63d0\u5347\u5bf9\u6bd4\u5ea6",
    fixMissingImages: "\u6062\u590d\u7f3a\u5931\u56fe\u7247",
    fixCrowded: "\u62c6\u5206\u62e5\u6324\u9875",
    fixAi: "AI \u4fee\u590d\u7248\u5f0f",
    quickFixAiRunning: "AI \u6b63\u5728\u4fee\u590d\u5f53\u524d\u7248\u5f0f...",
    quickFixAiNoConfig: "\u8bf7\u5148\u9009\u62e9 AI \u670d\u52a1\u5e76\u4fdd\u5b58 API \u5bc6\u94a5\uff0c\u518d\u4f7f\u7528 AI \u4fee\u590d\u3002",
    quickFixAiApplied: "AI \u7248\u5f0f\u4fee\u590d\u5df2\u5e94\u7528\u3002\u70b9\u51fb\u4fdd\u5b58\u4fee\u6539\u6216\u4e0b\u8f7d ZIP \u53ef\u4fdd\u7559\u7ed3\u679c\u3002",
    shareReadiness: "\u5206\u4eab\u68c0\u67e5",
    notChecked: "\u672a\u68c0\u67e5",
    downloadZipPackage: "\u4e0b\u8f7d ZIP \u5305",
    openSingleFile: "\u6253\u5f00\u5355\u6587\u4ef6 HTML",
    openScrollSingleFile: "\u6253\u5f00\u6ed1\u52a8\u5355\u6587\u4ef6 HTML",
    openReport: "\u6253\u5f00\u62a5\u544a",
    jobHistory: "\u751f\u6210\u5386\u53f2",
    refresh: "\u5237\u65b0",
    id: "ID",
    fileName: "\u6587\u4ef6\u540d",
    slides: "\u9875\u6570",
    status: "\u72b6\u6001",
    ai: "AI",
    updatedAt: "\u66f4\u65b0\u65f6\u95f4",
    actions: "\u64cd\u4f5c",
    noJobs: "\u6682\u65e0\u4efb\u52a1",
    guide: "\u6559\u7a0b",
    apiTutorial: "API \u914d\u7f6e\u6559\u7a0b",
    loadingApiGuide: "\u6b63\u5728\u52a0\u8f7d API \u914d\u7f6e\u6559\u7a0b...",
    generationTitle: "\u6b63\u5728\u751f\u6210 HTML",
    generationMessage: "AI \u6b63\u5728\u5b89\u6392\u5185\u5bb9\u3001\u56fe\u7247\u548c\u7248\u5f0f...",
    hideGeneration: "\u9690\u85cf\u751f\u6210\u52a8\u753b",
    clearFile: "\u6e05\u9664\u6587\u4ef6",
    uploadLimitCloudflare: "Cloudflare-only \u6a21\u5f0f\u652f\u6301\u7ea6 {size} \u4ee5\u5185\u7684 .pptx \u548c .pdf \u6587\u4ef6\u3002\u65e7 .ppt \u6587\u4ef6\u9700\u8981\u4f7f\u7528\u672c\u5730 Python \u540e\u7aef\u3002",
    uploadLimitServerless: "Serverless \u6a21\u5f0f\u652f\u6301\u7ea6 {size} \u4ee5\u5185\u7684 PPT \u548c PDF \u6587\u4ef6\u3002\u66f4\u5927\u7684\u6587\u4ef6\u9700\u8981\u672c\u5730\u8fd0\u884c\u6216\u4e13\u7528\u5b58\u50a8\u3002",
    uploadLimitDefault: "\u652f\u6301 .ppt\u3001.pptx \u548c .pdf\uff0c\u6700\u5927 {size}",
    fileTooLarge: "{name} \u5927\u5c0f\u4e3a {fileSize}\uff0c\u8d85\u8fc7\u5f53\u524d\u90e8\u7f72\u53ef\u5b89\u5168\u4e0a\u4f20\u7684\u9650\u5236\uff08{limit}\uff09\u3002\u66f4\u5927\u7684\u6587\u4ef6\u8bf7\u5728\u672c\u5730\u8fd0\u884c\u3002",
    readyGenerate: "\u5df2\u51c6\u5907\u751f\u6210\u3002",
    uploadFirst: "\u8bf7\u5148\u4e0a\u4f20 PPT \u6216 PDF\u3002",
    labelsUploading: "\u4e0a\u4f20\u4e2d",
    labelsExtracting: "\u63d0\u53d6\u4e2d",
    labelsOptimizing: "\u4f18\u5316\u4e2d",
    labelsConverting: "\u8f6c\u6362\u4e2d",
    labelsPreparing: "\u51c6\u5907\u7f16\u8f91\u5668",
    preparingPpt: "\u6b63\u5728\u51c6\u5907 PPT \u4ee5\u751f\u6210 AI \u7248\u5f0f...",
    completedBrowserAi: "\u5df2\u5b8c\u6210\u3002\u4e3a\u907f\u514d Cloudflare \u8d85\u65f6\uff0cAI \u5df2\u5728\u6d4f\u89c8\u5668\u4e2d\u76f4\u63a5\u751f\u6210\u3002",
    localFallbackDone: "\u7531\u4e8e AI \u4e0d\u53ef\u7528\u6216\u54cd\u5e94\u8fc7\u6162\uff0c\u5df2\u4f7f\u7528\u672c\u5730\u89c4\u5219\u751f\u6210\u3002{extra}",
    oversizedSkipped: "\u90e8\u5206\u8fc7\u5927\u7684\u56fe\u7247\u5df2\u8df3\u8fc7\u3002",
    generateOrSelect: "\u8bf7\u5148\u751f\u6210\u6216\u9009\u62e9\u4e00\u4e2a\u4efb\u52a1\u3002",
    packaging: "\u6b63\u5728\u6253\u5305...",
    packagingStatus: "\u6b63\u5728\u6d4f\u89c8\u5668\u4e2d\u6253\u5305\u5f53\u524d HTML...",
    downloadingLatest: "\u6b63\u5728\u4e0b\u8f7d\u5305\u542b\u6700\u65b0\u7f16\u8f91\u5185\u5bb9\u7684 ZIP \u5305\u3002",
    saveBrowserOnly: "\u4fee\u6539\u5df2\u4fdd\u5b58\u5728\u6d4f\u89c8\u5668\u4e2d\u3002\u4e0b\u8f7d ZIP \u4f1a\u5305\u542b\u6700\u65b0\u4fee\u6539\u3002",
    savedEdited: "\u5df2\u4fdd\u5b58\u5206\u9875\u7248\u548c\u6ed1\u52a8\u7248 HTML \u4fee\u6539\u3002",
    couldNotSaveEdited: "\u65e0\u6cd5\u4fdd\u5b58\u4fee\u6539\u540e\u7684 HTML\u3002",
    analyzingShare: "\u6b63\u5728\u5206\u6790\u5206\u4eab\u5305...",
    checkingShare: "\u6b63\u5728\u68c0\u67e5\u56fe\u7247\u8def\u5f84\u5e76\u6784\u5efa\u5206\u4eab\u5305...",
    shareMissing: "\u5206\u4eab\u5305\u5b58\u5728\u7f3a\u5931\u56fe\u7247\u3002",
    shareReady: "\u5206\u4eab\u5305\u5df2\u51c6\u5907\u597d\u3002",
    shareFirst: "\u8bf7\u5148\u751f\u6210\u6216\u9009\u62e9\u4efb\u52a1\uff0c\u7136\u540e\u8fd0\u884c\u5206\u6790\u4e0e\u5206\u4eab\u3002",
    checking: "\u68c0\u67e5\u4e2d",
    ready: "\u5c31\u7eea",
    warning: "\u5efa\u8bae\u68c0\u67e5",
    blocked: "\u963b\u585e",
    images: "\u56fe\u7247",
    embedded: "\u5df2\u5d4c\u5165",
    missing: "\u7f3a\u5931",
    riskyPaths: "\u98ce\u9669\u8def\u5f84",
    external: "\u5916\u90e8\u8d44\u6e90",
    localRulesNoKey: "\u672c\u5730\u89c4\u5219\u4e0d\u9700\u8981 API \u5bc6\u94a5\u3002",
    savedKey: "\u5df2\u4fdd\u5b58\u5bc6\u94a5\uff1a{key}\u3002\u5bc6\u94a5\u8f93\u5165\u6846\u7559\u7a7a\u5373\u53ef\u7ee7\u7eed\u4f7f\u7528\u3002",
    pasteKeyOnce: "\u7c98\u8d34\u4e00\u6b21 API \u5bc6\u94a5\u3002\u4fdd\u5b58\u540e\u4f1a\u4fdd\u5b58\u5728\u672c\u673a\u5e76\u81ea\u52a8\u590d\u7528\u3002",
    noSavedKeyPaste: "\u5c1a\u672a\u4fdd\u5b58\u5bc6\u94a5\u3002\u7c98\u8d34\u4e00\u6b21\u5bc6\u94a5\u5e76\u4fdd\u5b58\u5373\u53ef\u3002",
    externalApiEnabled: "\u5916\u90e8 API \u5df2\u542f\u7528",
    apiSettingsSaved: "API \u8bbe\u7f6e\u5df2\u4fdd\u5b58\u3002",
    savingApiSettings: "\u6b63\u5728\u4fdd\u5b58 API \u8bbe\u7f6e...",
    testingApi: "\u6b63\u5728\u6d4b\u8bd5 API \u5730\u5740...",
    apiTestPassed: "API \u6d4b\u8bd5\u901a\u8fc7\u3002",
    couldNotLoadApi: "\u65e0\u6cd5\u52a0\u8f7d API \u8bbe\u7f6e\u3002",
    couldNotSaveApi: "\u65e0\u6cd5\u4fdd\u5b58 API \u8bbe\u7f6e",
    apiTestFailed: "API \u6d4b\u8bd5\u5931\u8d25",
    backendHealthFailed: "\u540e\u7aef\u5065\u5eb7\u68c0\u67e5\u5931\u8d25",
    externalBackendHealthFailed: "\u5916\u90e8\u540e\u7aef\u5065\u5eb7\u68c0\u67e5\u5931\u8d25",
    openaiReady: "OpenAI \u517c\u5bb9\u63a5\u53e3\u5df2\u5c31\u7eea",
    deepseekReady: "DeepSeek \u5df2\u5c31\u7eea",
    doubaoReady: "Doubao Seed 2.0 \u5df2\u5c31\u7eea",
    customAiReady: "\u81ea\u5b9a\u4e49 AI API \u5df2\u5c31\u7eea",
    workflowReady: "\u5de5\u4f5c\u6d41 API \u5df2\u5c31\u7eea",
    difyReady: "Dify \u5de5\u4f5c\u6d41\u5df2\u5c31\u7eea",
    aiUsed: "\u5df2\u4f7f\u7528 AI\uff08{provider}\uff0c{type}\uff09\u3002",
    aiOptimizedSlides: "\u4f18\u5316\u540e\u7684\u5e7b\u706f\u7247",
    aiHtml: "HTML",
    aiFallback: "AI \u56de\u9000\uff1a{error}",
    externalApiFailed: "\u5916\u90e8 API \u5931\u8d25",
    configured: "{mode} \u5df2\u914d\u7f6e\u3002",
    local: "\u672c\u5730",
    aiSlides: "AI \u5e7b\u706f\u7247",
    fallback: "\u56de\u9000",
    previewButton: "\u9884\u89c8",
    selectGeneratedJob: "\u9009\u62e9\u751f\u6210\u4efb\u52a1",
    jobsSlides: "{count} \u9875",
    clear: "x",
    providerLocal: "\u672c\u5730\u89c4\u5219",
    providerDeepseek: "DeepSeek",
    providerDoubao: "Doubao Seed 2.0",
    providerOpenai: "OpenAI \u517c\u5bb9\u63a5\u53e3",
    providerCustomAi: "\u81ea\u5b9a\u4e49 AI API",
    providerWorkflow: "\u5de5\u4f5c\u6d41 API",
    providerDify: "Dify \u5de5\u4f5c\u6d41",
    noApiKeyHeader: "\u4e0d\u53d1\u9001 API \u5bc6\u94a5 Header",
    flatJson: "\u6241\u5e73 JSON",
    inputJson: "{ \"input\": ... }",
    difyBlocking: "Dify \u963b\u585e\u6a21\u5f0f",
  },
};

const stepKeys = [
  ["stepUpload", "stepUploadDesc"],
  ["stepStyle", "stepStyleDesc"],
  ["stepMethod", "stepMethodDesc"],
  ["stepEdit", "stepEditDesc"],
];

const styleLabelKeys = {
  source: { en: "Original PPT", zh: "保留原 PPT 样式" },
  teaching: { en: "Teaching Blue", zh: "\u6559\u5b66\u84dd" },
  softlesson: { en: "Soft Lesson", zh: "\u67d4\u548c\u8bfe\u5802" },
  clean: { en: "Clean", zh: "\u6e05\u723d" },
  academic: { en: "Academic Style", zh: "\u5b66\u672f\u98ce" },
  instructional: { en: "Instructional", zh: "\u6559\u5b66\u8bf4\u660e" },
  minimal: { en: "Minimal", zh: "\u6781\u7b80" },
  contrast: { en: "High Contrast", zh: "\u9ad8\u5bf9\u6bd4" },
  healing: { en: "Healing Hand-drawn", zh: "\u6cbb\u6108\u624b\u7ed8" },
  doodle: { en: "Doodle Sketch", zh: "\u624b\u7ed8\u6d82\u9e26" },
  swiss: { en: "Swiss Grid", zh: "\u745e\u58eb\u7f51\u683c" },
  editorial: { en: "Editorial", zh: "\u6742\u5fd7\u7f16\u8f91" },
  vivid: { en: "Vivid", zh: "\u9c9c\u660e\u6d3b\u529b" },
  "news-broadcast": { en: "News Broadcast", zh: "\u65b0\u95fb\u64ad\u62a5" },
  "tech-blueprint": { en: "Tech Blueprint", zh: "\u6280\u672f\u84dd\u56fe" },
  "corporate-clean": { en: "Corporate Clean", zh: "\u4f01\u4e1a\u6e05\u723d" },
};

const stylePreviewMeta = {
  source: { swatches: ["#ffffff", "#111111", "#808080"], font: "Source", sample: "Original", layout: "source" },
  teaching: { swatches: ["#17356f", "#4fbfff", "#edf6ff"], font: "Inter", sample: "Lesson", layout: "bar" },
  softlesson: { swatches: ["#f9fbff", "#8bc7f7", "#dbeafe"], font: "Rounded", sample: "Calm", layout: "soft" },
  clean: { swatches: ["#ffffff", "#111827", "#2563eb"], font: "Arial", sample: "Clean", layout: "line" },
  academic: { swatches: ["#fdfcf8", "#1f2937", "#8a6f42"], font: "Georgia", sample: "Research", layout: "paper" },
  instructional: { swatches: ["#fffdf7", "#0ea5e9", "#edf8ff"], font: "Verdana", sample: "Step", layout: "steps" },
  minimal: { swatches: ["#ffffff", "#111827", "#f6f7f9"], font: "Inter", sample: "Less", layout: "minimal" },
  contrast: { swatches: ["#0f172a", "#ffffff", "#38bdf8"], font: "Bold", sample: "Focus", layout: "contrast" },
  healing: { swatches: ["#fff6df", "#3f3128", "#9ed0eb"], font: "Hand", sample: "Sketch", layout: "doodle" },
  doodle: { swatches: ["#fff4d8", "#3c2c2c", "#8bd3ff"], font: "Marker", sample: "Doodle", layout: "scribble" },
  swiss: { swatches: ["#ffffff", "#2563eb", "#111827"], font: "Grid", sample: "Swiss", layout: "grid" },
  editorial: { swatches: ["#fbfaf7", "#111827", "#b08a57"], font: "Serif", sample: "Editorial", layout: "magazine" },
  vivid: { swatches: ["#fff7ed", "#f97316", "#2563eb"], font: "Product", sample: "Vivid", layout: "blocks" },
};

function stylePreview(key) {
  return window.PptQualitySystem?.previewMeta?.(key) || stylePreviewMeta[key] || stylePreviewMeta.teaching;
}
const apiProviders = {
  local: {
    mode: "local",
    label: "Local rules active",
  },
  deepseek: {
    mode: "ai_api",
    endpoint: "https://api.deepseek.com/v1",
    model: "deepseek-chat",
    apiKeyHeader: "Authorization",
    apiKeyPrefix: "Bearer ",
    customHeaders: "",
    workflowPayload: "flat",
    label: "DeepSeek ready",
  },
  doubao_seed: {
    mode: "ai_api",
    endpoint: "https://ark.cn-beijing.volces.com/api/v3",
    model: "doubao-seed-2-0-lite-260428",
    apiKeyHeader: "Authorization",
    apiKeyPrefix: "Bearer ",
    customHeaders: "",
    workflowPayload: "flat",
    timeoutSec: 0,
    label: "Doubao Seed 2.0 ready",
  },
  openai: {
    mode: "ai_api",
    endpoint: "https://api.openai.com/v1",
    model: "gpt-4.1-mini",
    apiKeyHeader: "Authorization",
    apiKeyPrefix: "Bearer ",
    customHeaders: "",
    workflowPayload: "flat",
    label: "OpenAI-compatible ready",
  },
  custom_ai: {
    mode: "ai_api",
    model: "gpt-4.1-mini",
    apiKeyHeader: "Authorization",
    apiKeyPrefix: "Bearer ",
    workflowPayload: "flat",
    label: "Custom AI API ready",
  },
  workflow: {
    mode: "workflow_api",
    apiKeyHeader: "Authorization",
    apiKeyPrefix: "Bearer ",
    workflowPayload: "flat",
    label: "Workflow API ready",
  },
  dify: {
    mode: "workflow_api",
    apiKeyHeader: "Authorization",
    apiKeyPrefix: "Bearer ",
    workflowPayload: "dify",
    label: "Dify workflow ready",
  },
};

function safeJsonParse(value, fallback) {
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function normalizeCustomStyle(style = {}) {
  const id = String(style.id || `custom-${Date.now().toString(36)}`).replace(/[^a-z0-9_-]/gi, "").slice(0, 48);
  const name = String(style.name || "Custom Style").trim().slice(0, 60);
  const colors = style.colors || {};
  const typography = style.typography || {};
  return {
    id: id.startsWith("custom-") ? id : `custom-${id}`,
    name,
    source: style.source || "manual",
    colors: {
      background: sanitizeHex(colors.background, "#f8fbff"),
      text: sanitizeHex(colors.text, "#10203f"),
      primary: sanitizeHex(colors.primary, "#2563eb"),
      accent: sanitizeHex(colors.accent, "#38bdf8"),
      panel: sanitizeHex(colors.panel, "#ffffff"),
    },
    typography: {
      titleFont: sanitizeFont(typography.titleFont || "Inter, Arial, sans-serif"),
      bodyFont: sanitizeFont(typography.bodyFont || "Inter, Arial, sans-serif"),
    },
    layout: ["balanced", "centered", "two-column", "image-focus", "minimal"].includes(style.layout) ? style.layout : "balanced",
    promptAddon: String(style.promptAddon || "").trim().slice(0, 1600),
    localRules: String(style.localRules || "").trim().slice(0, 1200),
    createdAt: style.createdAt || new Date().toISOString(),
    updatedAt: style.updatedAt || new Date().toISOString(),
  };
}

function loadCustomStyles() {
  const raw = safeJsonParse(localStorage.getItem(CUSTOM_STYLE_STORAGE_KEY), []);
  return (Array.isArray(raw) ? raw : []).map(normalizeCustomStyle).slice(0, 24);
}

function persistCustomStyles() {
  try {
    localStorage.setItem(CUSTOM_STYLE_STORAGE_KEY, JSON.stringify(state.customStyles));
  } catch {
    setStatus("Could not save custom styles in this browser.", "error");
  }
}

function sanitizeHex(value, fallback) {
  const normalized = String(value || "").trim();
  return /^#[0-9a-f]{6}$/i.test(normalized) ? normalized : fallback;
}

function sanitizeFont(value) {
  return String(value || "Inter, Arial, sans-serif").replace(/[<>{};]/g, "").slice(0, 120);
}

const state = {
  selectedFile: null,
  sourceMode: "ppt",
  selectedStyle: "source",
  stylesExpanded: false,
  customStyles: loadCustomStyles(),
  editingCustomStyleId: null,
  language: localStorage.getItem(LANGUAGE_STORAGE_KEY) === "zh" ? "zh" : "en",
  theme: ["light", "dark", "beige"].includes(localStorage.getItem(THEME_STORAGE_KEY)) ? localStorage.getItem(THEME_STORAGE_KEY) : "light",
  apiProvider: "local",
  apiBaseUrl: "",
  runtime: "local",
  maxUploadBytes: 100 * 1024 * 1024,
  maxRequestBytes: 150 * 1024 * 1024,
  jobs: [],
  activeJob: null,
  activeShare: null,
  activeStep: 0,
  busy: false,
  generationOverlayDismissed: false,
  pdfResearchOutline: null,
  wordDocument: null,
  wordOutline: null,
  wordDesignSpec: null,
  inlineObjectUrls: [],
  referencePack: window.PptReferencePack?.empty?.() || { files: [], images: [], outlineText: "", outline: [] },
  integration: {
    mode: "local",
    endpoint: "",
    apiKeyHeader: "Authorization",
    apiKeyPrefix: "Bearer ",
    customHeaders: "",
    workflowPayload: "flat",
    model: "gpt-4.1-mini",
    timeoutSec: 0,
    fallbackToLocal: false,
    hasApiKey: false,
    apiKeyMasked: "",
  },
};

const el = (id) => document.getElementById(id);
const API_SECRET_STORAGE_KEY = "ppt-html-studio-api-secret-v2";

function t(key, vars = {}) {
  const bundle = i18n[state.language] || i18n.en;
  let value = bundle[key] ?? i18n.en[key] ?? key;
  Object.entries(vars).forEach(([name, replacement]) => {
    value = value.replaceAll(`{${name}}`, String(replacement ?? ""));
  });
  return value;
}

function styleLabel(key, fallback = "") {
  const custom = state.customStyles?.find((style) => style.id === key);
  if (custom) return custom.name;
  return styleLabelKeys[key]?.[state.language] || styleLabelKeys[key]?.en || fallback || key;
}

function providerLabel(provider) {
  const map = {
    local: "localRulesActive",
    deepseek: "deepseekReady",
    doubao_seed: "doubaoReady",
    openai: "openaiReady",
    custom_ai: "customAiReady",
    workflow: "workflowReady",
    dify: "difyReady",
  };
  return t(map[provider] || "externalApiEnabled");
}

function applyLanguage(language) {
  state.language = language === "zh" ? "zh" : "en";
  try {
    localStorage.setItem(LANGUAGE_STORAGE_KEY, state.language);
  } catch {
    // Non-critical: language will still apply for this session.
  }
  document.documentElement.lang = state.language === "zh" ? "zh-CN" : "en";
  translateStaticUi();
  renderSteps();
  renderStyles();
  renderJobs();
  renderJobSelect();
  renderShare(state.activeShare || state.activeJob?.share || null);
  renderIntegration();
  updatePreviewEditButton();
  const uploadLimit = el("uploadLimitText");
  if (uploadLimit) uploadLimit.textContent = uploadLimitMessage();
}

function applyTheme(theme) {
  state.theme = ["light", "dark", "beige"].includes(theme) ? theme : "light";
  try {
    localStorage.setItem(THEME_STORAGE_KEY, state.theme);
  } catch {
    // Non-critical: theme still applies for this session.
  }
  document.documentElement.dataset.theme = state.theme;
  const themeSelect = el("themeSelect");
  if (themeSelect) themeSelect.value = state.theme;
}

function setText(id, key, vars = {}) {
  const node = el(id);
  if (node) node.textContent = t(key, vars);
}

function translateStaticUi() {
  document.title = "PPT HTML Studio";
  setText("helpButton", "help");
  setText("settingsButton", "settings");
  setText("settingsTitle", "settings");
  setText("settingsKicker", "interfaceLanguage");
  setText("settingsHint", "languageHint");
  setText("closeSettings", "close");
  setText("settingsLanguageLabel", "language");
  setText("settingsThemeLabel", "appearance");
  setText("generationTitle", "generationTitle");
  setText("generationMessage", "generationMessage");
  setText("helpTitle", "apiTutorial");
  setText("helpKicker", "guide");
  setText("closeHelp", "close");
  setText("shareTitle", "shareReadiness");
  setText("shareBadge", "notChecked");
  setText("health", el("health")?.classList.contains("ok") ? "backendReady" : el("health")?.classList.contains("error") ? "backendOffline" : "checkingBackend");
  const languageSelect = el("languageSelect");
  if (languageSelect) languageSelect.value = state.language;
  const themeSelect = el("themeSelect");
  if (themeSelect) themeSelect.value = state.theme;
  const optionText = {
    apiProvider: {
      local: t("providerLocal"),
      deepseek: t("providerDeepseek"),
      doubao_seed: t("providerDoubao"),
      openai: t("providerOpenai"),
      custom_ai: t("providerCustomAi"),
      workflow: t("providerWorkflow"),
      dify: t("providerDify"),
    },
    apiKeyHeader: {
      Authorization: "Authorization",
      "X-API-Key": "X-API-Key",
      "api-key": "api-key",
      none: t("noApiKeyHeader"),
    },
    workflowPayload: {
      flat: t("flatJson"),
      input: t("inputJson"),
      dify: t("difyBlocking"),
    },
    themeSelect: {
      light: t("lightMode"),
      dark: t("darkMode"),
      beige: t("beigeMode"),
    },
  };
  Object.entries(optionText).forEach(([selectId, labels]) => {
    const select = el(selectId);
    if (!select) return;
    [...select.options].forEach((option) => {
      option.textContent = labels[option.value] || option.textContent;
    });
  });
  const pairs = [
    ["uploadTitle", "uploadPpt"],
    ["dropStrong", "dragDrop"],
    ["dropOr", "or"],
    ["dropButton", "uploadPpt"],
    ["styleTitle", "style"],
    ["newCustomStyle", "customStyle"],
    ["importStylePpt", "importPptStyle"],
    ["customStyleKicker", "customStyleKicker"],
    ["customStyleTitle", "customStyleTitle"],
    ["closeCustomStyle", "close"],
    ["customStyleNameLabel", "customStyleName"],
    ["customStyleTitleFontLabel", "customStyleTitleFont"],
    ["customStyleBodyFontLabel", "customStyleBodyFont"],
    ["customStyleLayoutLabel", "customStyleLayout"],
    ["customStyleBgLabel", "customStyleBg"],
    ["customStyleTextLabel", "customStyleText"],
    ["customStylePrimaryLabel", "customStylePrimary"],
    ["customStyleAccentLabel", "customStyleAccent"],
    ["customStylePromptLabel", "customStylePrompt"],
    ["customStyleLocalLabel", "customStyleLocalRules"],
    ["saveCustomStyle", "saveCustomStyle"],
    ["deleteCustomStyle", "deleteCustomStyle"],
    ["keepTextLabel", "keepText"],
    ["keepTextSmall", "keepTextDesc"],
    ["readableTextLabel", "readable"],
    ["readableTextSmall", "readableDesc"],
    ["imagesIntactLabel", "imagesIntact"],
    ["imagesIntactSmall", "imagesIntactDesc"],
    ["apiSummary", "aiConnection"],
    ["apiIntro", "aiIntro"],
    ["apiProviderLabel", "service"],
    ["apiEndpointLabel", "endpoint"],
    ["apiModelLabel", "model"],
    ["apiKeyLabel", "apiKey"],
    ["apiAdvancedSummary", "advancedConnection"],
    ["apiKeyHeaderLabel", "apiKeyHeader"],
    ["apiKeyPrefixLabel", "apiKeyPrefix"],
    ["workflowPayloadLabel", "workflowPayload"],
    ["apiTimeoutLabel", "timeoutSec"],
    ["customHeadersLabel", "customHeaders"],
    ["fallbackToLocalLabel", "fallbackLocal"],
    ["clearApiKeyLabel", "clearSavedKey"],
    ["saveApiSettings", "saveConnection"],
    ["testApiSettings", "testApi"],
    ["runButton", "generateHtml"],
    ["previewTitle", "preview"],
    ["openPreview", "preview"],
    ["shareJob", "analyzeShare"],
    ["downloadJob", "downloadZip"],
    ["previewEmptyTitle", "noGenerated"],
    ["previewEmptyDesc", "noGeneratedDesc"],
    ["fitButton", "fit"],
    ["saveEditedHtml", "saveEdits"],
    ["openScrollHtml", "openScrollHtml"],
    ["quickFixTitle", "quickFixTitle"],
    ["fixOverflow", "fixOverflow"],
    ["fixImages", "fixImages"],
    ["fixContrast", "fixContrast"],
    ["fixMissingImages", "fixMissingImages"],
    ["fixCrowded", "fixCrowded"],
    ["fixAi", "fixAi"],
    ["downloadShareZip", "downloadZipPackage"],
    ["openSingleFile", "openSingleFile"],
    ["openScrollSingleFile", "openScrollSingleFile"],
    ["openShareReport", "openReport"],
    ["historyTitle", "jobHistory"],
    ["refreshJobs", "refresh"],
    ["tipTitle", "workflowTip"],
    ["tipBody", "workflowTipBody"],
  ];
  pairs.forEach(([id, key]) => setText(id, key));
  const placeholders = [
    ["apiKey", "apiKeyPlaceholder"],
  ];
  placeholders.forEach(([id, key]) => {
    const node = el(id);
    if (node) node.placeholder = t(key);
  });
  const jobSelect = el("jobSelect");
  if (jobSelect) jobSelect.setAttribute("aria-label", t("selectGeneratedJob"));
  const clearFile = el("clearFile");
  if (clearFile) clearFile.setAttribute("aria-label", t("clearFile"));
  const closeGeneration = el("closeGenerationOverlay");
  if (closeGeneration) closeGeneration.setAttribute("aria-label", t("hideGeneration"));
  document.querySelectorAll("[data-i18n]").forEach((node) => {
    node.textContent = t(node.dataset.i18n);
  });
}

function readLocalApiSecret() {
  try {
    return JSON.parse(localStorage.getItem(API_SECRET_STORAGE_KEY) || "{}");
  } catch {
    return {};
  }
}

function writeLocalApiSecret(secret) {
  try {
    localStorage.setItem(API_SECRET_STORAGE_KEY, JSON.stringify(secret || {}));
  } catch {
    // localStorage can be disabled in strict browser modes; generation will still work when a key is typed.
  }
}

function localApiKeyForCurrentProvider() {
  const secret = readLocalApiSecret();
  const provider = state.apiProvider || inferApiProvider(state.integration);
  return secret[provider] || secret[state.integration.endpoint || ""] || "";
}

function maskedKey(value) {
  return value ? `${value.slice(0, 4)}...${value.slice(-4)}` : "";
}

function integrationForGeneration() {
  const optimizationMode = document.getElementById("optimizationMode")?.value || "local";
  if (optimizationMode !== "ai") {
    state.integration = { ...state.integration, mode: "local", fallbackToLocal: true };
    state.apiProvider = "local";
    return { mode: "local", fallbackToLocal: true };
  }
  if (window.PptAiConfig) {
    const shared = window.PptAiConfig.loadAiConfig();
    if (!window.PptAiConfig.hasValidAiConfig(shared)) {
      throw new Error(state.language === "zh" ? "请先前往 AI 配置页面设置 API。" : "Please configure AI in AI Settings first.");
    }
    syncLegacyAiFields(shared);
    return { ...shared, fallbackToLocal: false, timeoutSec: 0 };
  }
  const integration = collectIntegration(false, { allowClear: false });
  const savedKey = localApiKeyForCurrentProvider();
  if (integration.mode !== "local") {
    integration.apiKey = el("apiKey").value.trim() || savedKey;
    integration.timeoutSec = 0;
    integration.fallbackToLocal = false;
  }
  return integration;
}

function syncLegacyAiFields(config = {}) {
  const provider = window.PptAiConfig?.providerFromConfig?.(config) || config.provider || "custom_ai";
  const preset = window.PptAiConfig?.PROVIDERS?.[provider] || {};
  state.apiProvider = provider;
  state.integration = { ...state.integration, ...preset, ...config, provider };
  if (el("apiProvider")) el("apiProvider").value = provider === "dify" ? "dify" : provider;
  if (el("apiMode")) el("apiMode").value = config.mode || preset.mode || "ai_api";
  if (el("apiEndpoint")) el("apiEndpoint").value = config.endpoint || preset.endpoint || "";
  if (el("apiModel")) el("apiModel").value = config.model || preset.model || "";
  if (el("apiKeyHeader")) el("apiKeyHeader").value = config.apiKeyHeader || preset.apiKeyHeader || "Authorization";
  if (el("apiKeyPrefix")) el("apiKeyPrefix").value = config.apiKeyPrefix ?? preset.apiKeyPrefix ?? "Bearer ";
  if (el("customHeaders")) el("customHeaders").value = config.customHeaders || "";
  if (el("workflowPayload")) el("workflowPayload").value = config.workflowPayload || preset.workflowPayload || "flat";
  if (el("apiTimeout")) el("apiTimeout").value = 0;
}

function refreshSharedAiStatus() {
  const status = document.getElementById("sharedAiStatus");
  const mode = document.getElementById("optimizationMode")?.value || "local";
  if (!status || !window.PptAiConfig) return;
  if (mode === "local") {
    status.textContent = state.language === "zh" ? "当前使用本地规则生成。" : "Local rules are active.";
    status.className = "shared-ai-status";
    return;
  }
  const config = window.PptAiConfig.loadAiConfig();
  const valid = window.PptAiConfig.hasValidAiConfig(config);
  status.textContent = valid
    ? `${state.language === "zh" ? "AI 已配置：" : "AI configured: "}${window.PptAiConfig.getAiConfigSummary(config)}`
    : (state.language === "zh" ? "请先前往 AI 配置页面设置 API。" : "Please configure AI in AI Settings first.");
  status.className = `shared-ai-status ${valid ? "ok" : "error"}`;
}

function isAiRecoverableError(message) {
  return /timeout|timed out|aborted|operation was aborted|insufficient balance|insufficient_balance|insufficient quota|insufficient_quota|quota|billing|\u4f59\u989d|\u6b20\u8d39|\u9650\u989d|rate limit|too many requests/i.test(String(message || ""));
}

function shouldSkipFullDeckAi(slides = []) {
  // AI mode must still call the configured model for long decks. A local rule
  // result is reserved for an actual provider failure after the AI attempt.
  return false;
}

function fetchWithTimeout(url, options = {}) {
  // The provider or server owns its request lifetime. The browser must not
  // turn a slow but valid AI generation into an accidental local conversion.
  return fetch(url, options);
}

function normalizeChatEndpoint(endpoint) {
  const value = String(endpoint || "").trim().replace(/\/+$/, "");
  if (!value) return "";
  if (value.endsWith("/chat/completions")) return value;
  if (value.endsWith("/v1") || value.endsWith("/api/v3")) return `${value}/chat/completions`;
  return value;
}

function apiHeaders(config) {
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

function clientStylePrompt(style) {
  const custom = state.customStyles.find((item) => item.id === style);
  if (window.PptQualitySystem?.stylePrompt) {
    return window.PptQualitySystem.stylePrompt(style, custom || null);
  }
  if (custom) {
    return `Custom style "${custom.name}": background ${custom.colors.background}, text ${custom.colors.text}, primary ${custom.colors.primary}, accent ${custom.colors.accent}, title font ${custom.typography.titleFont}, body font ${custom.typography.bodyFont}, layout preference ${custom.layout}. ${custom.promptAddon || custom.localRules || "Use this style consistently while preserving readability and images."}`;
  }
  const map = {
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
  return map[style] || map.teaching;
}

function clientStyleImplementationGuide(style) {
  const custom = state.customStyles.find((item) => item.id === style);
  if (window.PptQualitySystem?.implementationGuide) {
    return window.PptQualitySystem.implementationGuide(style, custom || null);
  }
  if (custom) {
    return `Custom style implementation: use title font ${custom.typography.titleFont}, body font ${custom.typography.bodyFont}, background ${custom.colors.background}, text ${custom.colors.text}, primary ${custom.colors.primary}, accent ${custom.colors.accent}. Reuse this palette and typography on every page. For title pages, follow the saved title-page rules; for content pages, preserve the saved content-page rhythm.`;
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

function extractAiText(data) {
  return data.choices?.[0]?.message?.content
    || data.choices?.[0]?.text
    || data.output_text
    || data.output?.[0]?.content?.[0]?.text
    || data.answer
    || data.data?.answer
    || data.data?.outputs?.html
    || data.data?.outputs?.text
    || data.html
    || data.text
    || data.result
    || "";
}

function normalizeBaseUrl(value) {
  return String(value || "").trim().replace(/\/+$/, "");
}

function apiUrl(path) {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${state.apiBaseUrl}${normalizedPath}`;
}

let platformCapabilitiesPromise = null;
async function ensurePlatformRoute(route) {
  if (!platformCapabilitiesPromise) {
    platformCapabilitiesPromise = fetch(apiUrl("/api/capabilities"), { headers: { accept: "application/json" } })
      .then(async (response) => {
        if (!response.ok) throw new Error(`平台能力接口不可用（HTTP ${response.status}）`);
        return response.json();
      })
      .catch((error) => {
        platformCapabilitiesPromise = null;
        throw error;
      });
  }
  const capabilities = await platformCapabilitiesPromise;
  const routes = capabilities?.routes || {};
  if (!Object.values(routes).includes(route)) throw new Error(`平台未部署所需路由：${route}`);
  return capabilities;
}

function absoluteRuntimeUrl(url) {
  if (!url || /^(?:blob:|data:|https?:\/\/)/i.test(url)) return url;
  return apiUrl(url);
}

function escapeHelpHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  }[char]));
}

function inlineMarkdown(value) {
  return escapeHelpHtml(value)
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
}

function renderHelpMarkdown(markdown) {
  const lines = String(markdown || "").replace(/\r\n/g, "\n").split("\n");
  const parts = [];
  let inCode = false;
  let codeLines = [];
  let inList = false;

  const closeList = () => {
    if (inList) {
      parts.push("</ul>");
      inList = false;
    }
  };

  lines.forEach((rawLine) => {
    const line = rawLine.trimEnd();
    if (line.trim().startsWith("```")) {
      if (inCode) {
        parts.push(`<pre><code>${escapeHelpHtml(codeLines.join("\n"))}</code></pre>`);
        codeLines = [];
        inCode = false;
      } else {
        closeList();
        inCode = true;
      }
      return;
    }
    if (inCode) {
      codeLines.push(rawLine);
      return;
    }
    if (!line.trim()) {
      closeList();
      return;
    }
    const heading = line.match(/^(#{1,4})\s+(.+)$/);
    if (heading) {
      closeList();
      const level = Math.min(heading[1].length + 1, 5);
      parts.push(`<h${level}>${inlineMarkdown(heading[2])}</h${level}>`);
      return;
    }
    const bullet = line.match(/^\s*(?:[-*]|\d+[.)])\s+(.+)$/);
    if (bullet) {
      if (!inList) {
        parts.push("<ul>");
        inList = true;
      }
      parts.push(`<li>${inlineMarkdown(bullet[1])}</li>`);
      return;
    }
    closeList();
    parts.push(`<p>${inlineMarkdown(line.trim())}</p>`);
  });
  closeList();
  if (inCode) parts.push(`<pre><code>${escapeHelpHtml(codeLines.join("\n"))}</code></pre>`);
  return parts.join("");
}

async function openHelp() {
  const overlay = el("helpOverlay");
  const content = el("helpContent");
  overlay.classList.remove("hidden");
  content.innerHTML = `<p>${escapeHelpHtml(t("loadingApiGuide"))}</p>`;
  try {
    const response = await fetch(apiUrl("/api/help/api-guide"));
    const data = await readJsonResponse(response, t("loadingApiGuide"));
    content.innerHTML = renderHelpMarkdown(data.markdown || "");
  } catch (error) {
    content.innerHTML = `<p class="help-error">${escapeHelpHtml(error.message || t("loadingApiGuide"))}</p>`;
  }
}

function closeHelp() {
  el("helpOverlay").classList.add("hidden");
}

function openSettings() {
  el("settingsOverlay").classList.remove("hidden");
  const select = el("languageSelect");
  if (select) select.value = state.language;
  const themeSelect = el("themeSelect");
  if (themeSelect) themeSelect.value = state.theme;
}

function closeSettings() {
  el("settingsOverlay").classList.add("hidden");
}

function activeCustomStyle() {
  const styles = Array.isArray(state.customStyles) ? state.customStyles : [];
  return styles.find((style) => style.id === state.selectedStyle) || null;
}

function customStylePreviewMeta(custom) {
  const swatches = [
    custom.colors?.background || "#f8fbff",
    custom.colors?.primary || "#2563eb",
    custom.colors?.accent || "#38bdf8",
  ];
  const layoutMap = {
    centered: "soft",
    "two-column": "line",
    "image-focus": "blocks",
    minimal: "minimal",
    balanced: "bar",
  };
  return {
    swatches,
    font: custom.typography?.titleFont?.split(",")[0]?.replace(/['"]/g, "") || "Custom",
    sample: custom.layout || "Custom",
    layout: layoutMap[custom.layout] || "bar",
  };
}

function renderSteps() {
  el("steps").innerHTML = stepKeys.map(([titleKey, descKey], index) => `
    <li class="${index <= state.activeStep ? "active" : ""}">
      <span>${index + 1}</span>
      <div><strong>${t(titleKey)}</strong><small>${t(descKey)}</small></div>
    </li>
  `).join("");
}

function renderStyles() {
  const toggle = el("toggleStyles");
  if (toggle) {
    toggle.textContent = state.stylesExpanded
      ? (state.language === "zh" ? "\u6536\u8d77\u98ce\u683c" : "Collapse")
      : (state.language === "zh" ? "\u5c55\u5f00\u5168\u90e8" : "Show all");
    toggle.setAttribute("aria-expanded", String(state.stylesExpanded));
  }
  const tabs = el("styleTabs");
  tabs.classList.toggle("is-collapsed", !state.stylesExpanded);
  const allStyles = [
    ...styles.map(([key, label]) => ({ key, label, custom: false, preview: stylePreview(key) })),
    ...state.customStyles.map((custom) => ({
      key: custom.id,
      label: custom.name,
      custom: true,
      preview: customStylePreviewMeta(custom),
    })),
  ];
  tabs.innerHTML = allStyles.map(({ key, label, custom, preview }) => {
    const swatches = preview.swatches.map((color) => `<span style="--swatch:${color}"></span>`).join("");
    const previewVars = `--preview-a:${preview.swatches[0] || "#ffffff"};--preview-b:${preview.swatches[1] || "#2563eb"};--preview-c:${preview.swatches[2] || "#edf6ff"};`;
    return `
    <button type="button" class="style-card ${custom ? "custom-style-card" : ""} ${state.selectedStyle === key ? "selected" : ""}" data-style="${key}" aria-label="${styleLabel(key, label)}">
      ${custom ? `<span class="custom-style-delete" role="button" tabindex="0" data-delete-style="${key}" aria-label="${t("deleteCustomStyle")}">x</span>` : ""}
      <span class="style-preview style-preview-${preview.layout}" style="${previewVars}" aria-hidden="true">
        <span class="style-preview-title"></span>
        <span class="style-preview-lines"><i></i><i></i><i></i></span>
        <span class="style-preview-blocks"><i></i><i></i></span>
      </span>
      <span class="style-preview-trigger" data-preview-style="${key}" role="button" tabindex="0">${state.language === "zh" ? "预览" : "Preview"}</span>
      <span class="style-card-body">
        <span class="style-card-name">${styleLabel(key, label)}</span>
        <span class="style-card-sample" data-font="${preview.font}">${preview.sample}</span>
      </span>
      <span class="style-swatches" aria-hidden="true">${swatches}</span>
    </button>`;
  }).join("");
  document.querySelectorAll("[data-delete-style]").forEach((control) => {
    const runDelete = (event) => {
      event.preventDefault();
      event.stopPropagation();
      deleteCustomStyleById(control.dataset.deleteStyle, true);
    };
    control.addEventListener("click", runDelete);
    control.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") runDelete(event);
    });
  });
  document.querySelectorAll("[data-style]").forEach((button) => {
    button.addEventListener("click", () => {
      state.selectedStyle = button.dataset.style;
      state.activeStep = Math.max(state.activeStep, 1);
      renderStyles();
      renderSteps();
    });
  });
  document.querySelectorAll("[data-preview-style]").forEach((control) => {
    const preview = (event) => {
      event.preventDefault();
      event.stopPropagation();
      window.PptStyleRegistry?.openPreview?.(control.dataset.previewStyle, state.customStyles);
    };
    control.addEventListener("click", preview);
    control.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") preview(event);
    });
  });
}

function openCustomStyle(style = null) {
  const saved = style?.id && state.customStyles.some((item) => item.id === style.id);
  const custom = style ? normalizeCustomStyle(style) : normalizeCustomStyle({
    name: "",
    colors: { background: "#f8fbff", text: "#10203f", primary: "#2563eb", accent: "#38bdf8", panel: "#ffffff" },
    typography: { titleFont: "Inter, Arial, sans-serif", bodyFont: "Inter, Arial, sans-serif" },
    layout: "balanced",
    promptAddon: "",
    localRules: "",
  });
  state.editingCustomStyleId = saved ? style.id : null;
  el("customStyleName").value = style?.name || "";
  el("customStyleTitleFont").value = custom.typography.titleFont;
  el("customStyleBodyFont").value = custom.typography.bodyFont;
  el("customStyleLayout").value = custom.layout;
  el("customStyleBg").value = custom.colors.background;
  el("customStyleText").value = custom.colors.text;
  el("customStylePrimary").value = custom.colors.primary;
  el("customStyleAccent").value = custom.colors.accent;
  el("customStylePrompt").value = custom.promptAddon;
  el("customStyleLocalRules").value = custom.localRules;
  el("customStyleStatus").textContent = "";
  el("deleteCustomStyle").disabled = !saved;
  updateCustomStylePreview();
  el("customStyleOverlay").classList.remove("hidden");
}

function closeCustomStyle() {
  el("customStyleOverlay").classList.add("hidden");
}

function customStyleFromForm() {
  const existing = state.customStyles.find((style) => style.id === state.editingCustomStyleId);
  return normalizeCustomStyle({
    id: existing?.id || `custom-${Date.now().toString(36)}`,
    name: el("customStyleName").value.trim(),
    colors: {
      background: el("customStyleBg").value,
      text: el("customStyleText").value,
      primary: el("customStylePrimary").value,
      accent: el("customStyleAccent").value,
      panel: "#ffffff",
    },
    typography: {
      titleFont: el("customStyleTitleFont").value,
      bodyFont: el("customStyleBodyFont").value,
    },
    layout: el("customStyleLayout").value,
    promptAddon: el("customStylePrompt").value,
    localRules: el("customStyleLocalRules").value,
    source: existing?.source || "manual",
    createdAt: existing?.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });
}

function updateCustomStylePreview() {
  const preview = el("customStylePreview");
  if (!preview) return;
  const style = customStyleFromForm();
  preview.style.setProperty("--custom-preview-bg", style.colors.background);
  preview.style.setProperty("--custom-preview-text", style.colors.text);
  preview.style.setProperty("--custom-preview-primary", style.colors.primary);
  preview.style.setProperty("--custom-preview-accent", style.colors.accent);
  preview.style.setProperty("--custom-preview-title-font", style.typography.titleFont);
  preview.style.setProperty("--custom-preview-body-font", style.typography.bodyFont);
}

function saveCustomStyleFromForm() {
  if (!el("customStyleName").value.trim()) {
    el("customStyleStatus").textContent = t("customStyleNeedName");
    return;
  }
  const style = customStyleFromForm();
  const index = state.customStyles.findIndex((item) => item.id === style.id);
  if (index >= 0) state.customStyles[index] = style;
  else state.customStyles.push(style);
  state.selectedStyle = style.id;
  state.stylesExpanded = true;
  persistCustomStyles();
  renderStyles();
  renderSteps();
  el("customStyleStatus").textContent = t("customStyleSaved");
}

function deleteCustomStyleFromForm() {
  if (!state.editingCustomStyleId) {
    el("customStyleStatus").textContent = t("customStyleNoDelete");
    return;
  }
  deleteCustomStyleById(state.editingCustomStyleId, false);
}

function deleteCustomStyleById(styleId, ask = true) {
  const style = state.customStyles.find((item) => item.id === styleId);
  if (!style) return;
  if (ask && !window.confirm(t("customStyleConfirmDelete"))) return;
  state.customStyles = state.customStyles.filter((item) => item.id !== styleId);
  if (state.selectedStyle === styleId) state.selectedStyle = "teaching";
  if (state.editingCustomStyleId === styleId) {
    state.editingCustomStyleId = null;
    closeCustomStyle();
  }
  persistCustomStyles();
  renderStyles();
  renderSteps();
  setStatus(t("customStyleDeleted"), "ok");
}

function setStatus(message, kind = "") {
  el("statusLine").textContent = message;
  el("statusLine").className = `status-line ${kind}`;
}

function setGenerationOverlay(visible, message = "") {
  const overlay = el("generationOverlay");
  if (!overlay) return;
  if (message) el("generationMessage").textContent = message;
  overlay.classList.toggle("hidden", !visible || state.generationOverlayDismissed);
}

function hideGenerationOverlay() {
  state.generationOverlayDismissed = true;
  setGenerationOverlay(false);
}

function normalizeDeckHtmlForEditor(html) {
  return window.PptDeckWorkbench?.normalizeHtml
    ? window.PptDeckWorkbench.normalizeHtml(html)
    : String(html || "");
}

function makePagedHtmlPlayable(html) {
  return window.PptDeckWorkbench?.makePagedHtmlPlayable
    ? window.PptDeckWorkbench.makePagedHtmlPlayable(html)
    : String(html || "");
}

function makePreviewHtml(html) {
  return window.PptDeckWorkbench?.makePreviewHtml
    ? window.PptDeckWorkbench.makePreviewHtml(html)
    : makePagedHtmlPlayable(html);
}

function inspectDeckHtml(html, expectedSlides = 0) {
  return window.PptDeckWorkbench?.inspectDeckHtml
    ? window.PptDeckWorkbench.inspectDeckHtml(html, expectedSlides)
    : { ok: Boolean(html), slideCount: 0, textLength: String(html || "").trim().length, reason: html ? "ok" : "empty-html" };
}

function validateConverterDeckHtml(html, expectedSlides = 0) {
  const normalized = normalizeDeckHtmlForEditor(html);
  const playable = makePagedHtmlPlayable(normalized);
  const report = inspectDeckHtml(playable, expectedSlides);
  if (!report.ok) return report;
  const bodyText = String(playable || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  if (/Generated fallback SVG|asset-slide-\d+|image placeholder|visual placeholder/i.test(bodyText)) {
    return { ...report, ok: false, reason: "visible-placeholder-artifacts" };
  }
  return report;
}

function normalizeWordGeneratedHtml(html) {
  const source = String(html || "");
  if (!source.trim() || typeof DOMParser === "undefined") return source;
  try {
    const doc = new DOMParser().parseFromString(source, "text/html");
    const slides = [...doc.querySelectorAll('section.slide, [data-slide-page]')].filter((node, index, all) => all.indexOf(node) === index);
    slides.forEach((slide, index) => {
      const page = String(index + 1);
      slide.setAttribute("data-slide-page", page);
      slide.setAttribute("data-source-page", page);
    });
    return doc.documentElement?.outerHTML || source;
  } catch {
    return source;
  }
}

// Word generation is deliberately best-effort.  A provider may return an
// error page, a markdown wrapper, or an incomplete window; none of those
// should erase the pages that were already parsed locally.  Keep this check
// small and deterministic so it can be used before the generic deck gate.
function wordHtmlHasUsableSlides(html) {
  const source = String(html || "");
  if (!source.trim() || /Worker exceeded resource limits|<title>.*(?:not_found|error)/i.test(source)) return false;
  if (typeof DOMParser === "undefined") return /<section\b[^>]*\bslide\b/i.test(source);
  try {
    const doc = new DOMParser().parseFromString(source, "text/html");
    return doc.querySelectorAll("section.slide, [data-slide-page]").length > 0;
  } catch { return false; }
}

function isWordGeneratedJob(job) {
  const mode = String(job?.aiStatus?.generationMode || "").toLowerCase();
  return mode === "word_markdown_ai" || mode === "word_markdown_local" || mode === "word-windowed-v2" || mode.includes("word-windowed");
}

function acceptRecoverableWordQuality(report) {
  if (!report || report.ok) return report;
  const reason = String(report.reason || "");
  // A Word page can be visually usable even when a provider omitted optional
  // metadata or a navigation helper.  Keep those pages and let the editor
  // repair them instead of discarding an otherwise complete document.
  const recoverable = /^(slide-order-mismatch|empty-slide-|too-little-visible-text|missing-navigation-runtime|full-canvas-text-boxes-|duplicate-element-id-)/i.test(reason);
  return recoverable ? { ...report, ok: true, reason: `word-best-effort:${reason}` } : report;
}

function assertUsableConverterDeck(html, expectedSlides = 0, label = "AI deck") {
  const report = validateConverterDeckHtml(html, expectedSlides);
  if (!report.ok) {
    throw new Error(`${label} failed quality gate: ${report.reason || "invalid deck"}.`);
  }
  return report;
}

function hardenGeneratedConverterJob(job, expectedSlides = 0) {
  if (!job) return job;
  const html = job.inlinePreviewHtmlCache || job.inlinePreviewHtml || "";
  if (!html) return job;
  const wordJob = isWordGeneratedJob(job);
  const candidate = wordJob ? normalizeWordGeneratedHtml(html) : html;
  // Word pages are recovered window-by-window.  Do not turn a late provider
  // window failure into a fatal whole-document error; the caller may already
  // have a complete local outline to render.  Generic PPT/PDF jobs retain the
  // existing strict structural gate.
  let report = validateConverterDeckHtml(candidate, wordJob ? 0 : (expectedSlides || Number(job.slides || 0)));
  if (wordJob) report = acceptRecoverableWordQuality(report);
  if (!report.ok && wordJob && wordHtmlHasUsableSlides(candidate)) {
    report = { ...report, ok: true, reason: `word-best-effort:${report.reason || "layout-warning"}` };
  }
  if (!report.ok) throw new Error(`Generated converter HTML failed quality gate: ${report.reason || "invalid deck"}.`);
  const normalized = normalizeDeckHtmlForEditor(candidate);
  job.inlinePreviewHtmlCache = normalized;
  job.inlinePreviewAvailable = true;
  job.previewUrl = createPreviewHtmlUrl(normalized);
  job.inlineScrollHtmlCache = makeScrollHtmlFromPaged(makePagedHtmlPlayable(normalized));
  job.scrollUrl = createInlineHtmlUrl(job.inlineScrollHtmlCache);
  delete job.inlinePreviewHtml;
  delete job.inlineScrollHtml;
  return job;
}

function createPreviewHtmlUrl(html) {
  return createInlineHtmlUrl(makePreviewHtml(html));
}

function createInlineHtmlUrl(html) {
  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  state.inlineObjectUrls.push(url);
  return url;
}

function loadPreviewFrame(job) {
  const frame = el("previewFrame");
  if (!frame || !job) return;
  const inlineHtml = job.inlinePreviewHtmlCache || "";
  if (inlineHtml) {
    const normalizedHtml = normalizeDeckHtmlForEditor(inlineHtml);
    if (normalizedHtml && normalizedHtml !== inlineHtml) {
      job.inlinePreviewHtmlCache = normalizedHtml;
      job.previewUrl = createPreviewHtmlUrl(normalizedHtml);
    }
    frame.removeAttribute("src");
    frame.srcdoc = makePreviewHtml(normalizedHtml);
    return;
  }
  frame.removeAttribute("srcdoc");
  frame.src = job.previewUrl || "about:blank";
}

function hydrateShare(share) {
  if (!share) return share;
  return {
    ...share,
    zipPackageUrl: absoluteRuntimeUrl(share.zipPackageUrl),
    singleFileUrl: absoluteRuntimeUrl(share.singleFileUrl),
    scrollSingleFileUrl: absoluteRuntimeUrl(share.scrollSingleFileUrl),
    reportUrl: absoluteRuntimeUrl(share.reportUrl),
  };
}

function hydrateInlineJob(job) {
  if (!job) return job;
  const hydrated = { ...job };
  if (hydrated.inlinePreviewHtml) {
    hydrated.inlinePreviewHtmlCache = normalizeDeckHtmlForEditor(hydrated.inlinePreviewHtml);
    hydrated.previewUrl = createPreviewHtmlUrl(hydrated.inlinePreviewHtmlCache);
    hydrated.inlinePreviewAvailable = true;
    delete hydrated.inlinePreviewHtml;
  }
  if (hydrated.inlineScrollHtml) {
    hydrated.inlineScrollHtmlCache = hydrated.inlineScrollHtml;
    hydrated.scrollUrl = createInlineHtmlUrl(hydrated.inlineScrollHtmlCache);
    hydrated.inlinePreviewAvailable = true;
    delete hydrated.inlineScrollHtml;
  }
  hydrated.previewUrl = absoluteRuntimeUrl(hydrated.previewUrl);
  hydrated.scrollUrl = absoluteRuntimeUrl(hydrated.scrollUrl);
  hydrated.downloadUrl = absoluteRuntimeUrl(hydrated.downloadUrl);
  hydrated.share = hydrateShare(hydrated.share);
  return hydrated;
}

function formatBytes(size) {
  if (!size) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const power = Math.min(Math.floor(Math.log(size) / Math.log(1024)), units.length - 1);
  return `${(size / Math.pow(1024, power)).toFixed(power ? 1 : 0)} ${units[power]}`;
}

function uploadLimitMessage() {
  if (state.runtime === "cloudflare-worker-only") {
    return t("uploadLimitCloudflare", { size: formatBytes(state.maxUploadBytes) });
  }
  if (state.runtime === "vercel") {
    return t("uploadLimitServerless", { size: formatBytes(state.maxUploadBytes) });
  }
  return t("uploadLimitDefault", { size: formatBytes(state.maxUploadBytes) });
}

function fileTooLargeMessage(file) {
  return t("fileTooLarge", { name: file.name, fileSize: formatBytes(file.size), limit: formatBytes(state.maxUploadBytes) });
}

function enforceUploadLimit(file) {
  if (!file || file.size <= state.maxUploadBytes) return true;
  setStatus(fileTooLargeMessage(file), "error");
  return false;
}

async function readJsonResponse(response, fallbackMessage = "Request failed") {
  const text = await response.text();
  let data = {};
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      const plain = text.replace(/\s+/g, " ").trim();
      const isWorkerLimit = /Worker exceeded resource limits|cf-error-code"?\s*>?\s*1102|Error<\/span>\s*<span[^>]*>\s*1102/i.test(text);
      data = {
        error: isWorkerLimit ? "worker_resource_limit" : "non_json_response",
        message: isWorkerLimit
          ? "Cloudflare Worker exceeded its CPU or memory limit while processing this PPT. Try a smaller PPT, compress oversized images, or use fewer image-heavy slides. The platform now skips oversized embedded images automatically; refresh and try again."
          : plain || fallbackMessage,
      };
    }
  }
  if (!response.ok) {
    let message = data.message || data.error || response.statusText || fallbackMessage;
    if (response.status === 413 || /request entity too large|payload too large/i.test(message)) {
      message = `The PPT is too large for this deployment. Please use a file up to about ${formatBytes(state.maxUploadBytes)}, or run the app locally for larger files.`;
    }
    throw new Error(message);
  }
  return data;
}

function handleFile(file) {
  if (!file) return;
  const word = /\.docx$/i.test(file.name) || file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  const pdf = /\.pdf$/i.test(file.name) || file.type === "application/pdf";
  if (pdf) {
    setStatus("PDF 转 HTML 已移除，请先将文档另存为 .docx 后再导入。", "error");
    return;
  }
  setSourceMode(word ? "word" : "ppt", false);
  if (state.runtime === "cloudflare-worker-only" && !/\.pptx$/i.test(file.name) && !word) {
    setStatus("Cloudflare-only deployment supports .pptx files. Please convert old .ppt files to .pptx first.", "error");
    return;
  }
  if (!/\.(ppt|pptx|docx)$/i.test(file.name)) {
    setStatus("请选择 .ppt、.pptx 或 .docx 文件。", "error");
    return;
  }
  if (!enforceUploadLimit(file)) {
    state.selectedFile = null;
    el("fileCard").classList.add("hidden");
    el("fileInput").value = "";
    return;
  }
  state.selectedFile = file;
  state.activeStep = Math.max(state.activeStep, 1);
  el("fileCard").classList.remove("hidden");
  el("fileName").textContent = file.name;
  el("fileMeta").textContent = `${formatBytes(file.size)} ${t("selected")}${word ? " · Word" : ""}`;
  setStatus(t("readyGenerate"), "ok");
  renderSteps();
}

function setSourceMode(mode, clearSelection = true) {
  const next = mode === "word" ? "word" : "ppt";
  state.sourceMode = next;
  document.querySelectorAll("[data-source-mode]").forEach((button) => {
    const active = button.dataset.sourceMode === next;
    button.classList.toggle("active", active);
    button.setAttribute("aria-selected", String(active));
  });
  const title = el("uploadTitle");
  if (title) title.textContent = next === "word" ? "Word / DOCX 转 HTML · Markdown 汇报" : "PPT / PPTX 转 HTML";
  const strong = el("dropStrong");
  if (strong) strong.textContent = next === "word" ? "拖拽 Word / DOCX 文件到这里" : "拖拽 PPT / PPTX 文件到这里";
  const button = el("dropButton");
  if (button) button.textContent = next === "word" ? "上传 Word / DOCX" : "上传 PPT / PPTX";
  const input = el("fileInput");
  if (input) input.setAttribute("accept", next === "word" ? ".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document" : ".ppt,.pptx");
  const optimization = el("optimizationMode");
  if (optimization && next === "word") {
    const localOption = optimization.querySelector('option[value="local"]');
    const aiOption = optimization.querySelector('option[value="ai"]');
    if (localOption) localOption.textContent = "原样还原（本地）";
    if (aiOption) aiOption.textContent = "AI 汇报排版（先生成 Markdown/大纲）";
    if (optimization.dataset.sourceMode !== "word") {
      const configuredConfig = window.PptAiConfig?.loadAiConfig?.() || state.integration || {};
      const configured = Boolean(configuredConfig.endpoint && (configuredConfig.apiKey || configuredConfig.mode === "workflow_api"));
      optimization.value = configured ? "ai" : "local";
    }
    optimization.dataset.sourceMode = "word";
  } else if (optimization) {
    const localOption = optimization.querySelector('option[value="local"]');
    const aiOption = optimization.querySelector('option[value="ai"]');
    if (localOption) localOption.textContent = "Local rules";
    if (aiOption) aiOption.textContent = "AI optimization";
    optimization.dataset.sourceMode = "ppt";
  }
  el("wordOutlineStage")?.classList.add("hidden");
  if (clearSelection && state.selectedFile) {
    const isWord = /\.docx$/i.test(state.selectedFile.name || "");
    if ((next === "word") !== isWord) {
      state.selectedFile = null;
      if (input) input.value = "";
      el("fileCard")?.classList.add("hidden");
      setStatus("");
      state.activeStep = 0;
      renderSteps();
    }
  }
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

async function loadClientZipRuntime() {
  if (window.JSZip) return window.JSZip;
  const loadScript = (src) => new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = src;
    script.onload = resolve;
    script.onerror = reject;
    document.head.appendChild(script);
  });
  await loadScript("/static/jszip.min.js").catch(() => loadScript("https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js"));
  if (!window.JSZip) throw new Error("Browser PPT parser did not initialize.");
  return window.JSZip;
}

function clientXmlDecode(value) {
  return String(value || "")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'");
}

function clientCleanText(text) {
  return String(text || "").replace(/\s+/g, " ").replace(/^[\u2022\u00b7\-\s]+/, "").trim();
}

function clientLooksLikeMarkupNoise(text) {
  const value = String(text || "").replace(/\s+/g, " ").trim();
  if (!value) return false;
  if (/<\/?[a-z][\w.-]*:/i.test(value)) return true;
  if (/\bxmlns:[\w-]+\s*=|\buri\s*=\s*["']?\{?[0-9a-f-]{8,}/i.test(value)) return true;
  if (/\b(?:a|p|r|wp|w|mc|v|o|a14|a16):(?:ext|extLst|tbl|tblPr|gridCol|tcPr|ln|solidFill|prstGeom)\b/i.test(value)) return true;
  if (/[<>][\s\S]*[<>]/.test(value) && /\b(?:xml|xmlns|schema|office|drawing|tblPr|gridCol|extLst)\b/i.test(value)) return true;
  if (value.length > 120 && /[<>="{}]/.test(value) && /\b(?:xmlns|uri|val|tblPr|gridCol|extLst|schema)\b/i.test(value)) return true;
  return false;
}

function clientUsefulText(text) {
  const value = clientCleanText(text);
  if (!value) return false;
  if (clientLooksLikeMarkupNoise(value)) return false;
  if (/^[\d\s./\\-]+$/.test(value)) return false;
  if (/^[()[\]{}.,;:!?'"`~_\-]+$/.test(value)) return false;
  return value.length > 1;
}

function clientNormalizeTextFragments(texts) {
  const cleaned = (Array.isArray(texts) ? texts : [])
    .map(clientCleanText)
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
  return merged.filter(clientUsefulText);
}

function clientTitleLooksBroken(title, body = []) {
  const value = clientCleanText(title);
  if (!value) return true;
  if (/^[A-Za-z]$/.test(value)) return true;
  if (/^.{1,2}$/.test(value) && body.some((item) => clientCleanText(item).length > 8)) return true;
  if (/^[A-Za-z]{1,2}$/.test(value)) return true;
  if (clientLooksLikeMarkupNoise(value)) return true;
  return false;
}

function clientSlideTitleAndBody(texts) {
  const normalized = clientNormalizeTextFragments(texts);
  if (!normalized.length) return { title: "", body: [] };
  let title = normalized[0];
  let body = normalized.slice(1);
  if (clientTitleLooksBroken(title, body)) {
    const replacementIndex = body.findIndex((item) => !clientTitleLooksBroken(item, []) && clientCleanText(item).length >= 5);
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

function clientNormalizeZipPath(base, target) {
  const parts = base.split("/");
  parts.pop();
  target.split("/").forEach((item) => {
    if (!item || item === ".") return;
    if (item === "..") parts.pop();
    else parts.push(item);
  });
  return parts.join("/");
}

function clientRelationshipMap(relsXml, slidePath) {
  const map = new Map();
  const relPattern = /<Relationship\b([^>]*?)\/?>/g;
  let match;
  while ((match = relPattern.exec(relsXml || ""))) {
    const attrs = match[1] || "";
    const id = attrs.match(/\bId="([^"]+)"/)?.[1];
    const target = attrs.match(/\bTarget="([^"]+)"/)?.[1];
    if (id && target) map.set(id, clientNormalizeZipPath(slidePath, target));
  }
  return map;
}

function clientExtractTexts(slideXml) {
  const texts = [];
  const pattern = /<a:t[^>]*>([\s\S]*?)<\/a:t>/g;
  let match;
  while ((match = pattern.exec(slideXml || ""))) {
    const text = clientCleanText(clientXmlDecode(match[1]));
    if (clientUsefulText(text)) texts.push(text);
  }
  return texts;
}

function topFrequency(values, fallback) {
  const counts = new Map();
  values.filter(Boolean).forEach((value) => counts.set(value, (counts.get(value) || 0) + 1));
  return [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] || fallback;
}

function readableTextColor(background) {
  const hex = sanitizeHex(background, "#ffffff").slice(1);
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.62 ? "#10203f" : "#f8fbff";
}

function clientExtractSlideStyleProfile(slideXml, index) {
  const texts = clientNormalizeTextFragments(clientExtractTexts(slideXml));
  const colors = [...slideXml.matchAll(/<a:srgbClr\b[^>]*\bval="([0-9A-Fa-f]{6})"/g)].map((match) => `#${match[1].toLowerCase()}`);
  const fonts = [...slideXml.matchAll(/\btypeface="([^"]+)"/g)]
    .map((match) => clientXmlDecode(match[1]).trim())
    .filter((font) => font && !/^\+/.test(font));
  const hasImages = /<p:pic\b|r:embed="/i.test(slideXml);
  const graphicBlocks = [...slideXml.matchAll(/<p:(sp|graphicFrame|cxnSp)\b[\s\S]*?<\/p:\1>/gi)]
    .map((match) => match[0])
    .filter((block) => !/<p:ph\b/i.test(block) && !/<a:t\b/i.test(block));
  const graphicCount = graphicBlocks.length + (slideXml.match(/<p:pic\b/gi) || []).length;
  const textBoxes = [...slideXml.matchAll(/<p:sp\b[\s\S]*?<\/p:sp>/g)].map((match) => {
    const block = match[0];
    const text = clientCleanText(clientExtractTexts(block).join(" "));
    const off = block.match(/<a:off\b[^>]*\bx="(-?\d+)"[^>]*\by="(-?\d+)"/);
    const ext = block.match(/<a:ext\b[^>]*\bcx="(\d+)"[^>]*\bcy="(\d+)"/);
    return {
      text,
      x: Number(off?.[1] || 0),
      y: Number(off?.[2] || 0),
      cx: Number(ext?.[1] || 0),
      cy: Number(ext?.[2] || 0),
    };
  }).filter((box) => box.text);
  const firstBox = textBoxes[0] || {};
  const isTitleLike = index === 0 || (texts.length <= 3 && !hasImages) || (texts.length <= 4 && firstBox.y > 900000 && firstBox.y < 3000000);
  const titlePlacement = firstBox.x && firstBox.cx
    ? ((firstBox.x + firstBox.cx / 2) > 5000000 && (firstBox.x + firstBox.cx / 2) < 7200000 ? "centered" : firstBox.x < 2200000 ? "left" : "right")
    : "unknown";
  return {
    index,
    texts,
    textCount: texts.length,
    colors,
    fonts,
    hasImages,
    imageCount: (slideXml.match(/<p:pic\b|r:embed="/gi) || []).length,
    graphicCount,
    isTitleLike,
    titlePlacement,
    boxCount: textBoxes.length,
    textBoxes: textBoxes.slice(0, 32).map((box, boxIndex) => ({
      id: `text-${index + 1}-${boxIndex + 1}`,
      text: box.text.slice(0, 1000),
      x: Number((box.x / 914400 * 96).toFixed(2)),
      y: Number((box.y / 914400 * 96).toFixed(2)),
      width: Number((box.cx / 914400 * 96).toFixed(2)),
      height: Number((box.cy / 914400 * 96).toFixed(2)),
    })),
  };
}

function summarizeImportedProfiles(profiles) {
  const titleProfiles = profiles.filter((profile) => profile.isTitleLike);
  const contentProfiles = profiles.filter((profile) => !profile.isTitleLike);
  const source = contentProfiles.length ? contentProfiles : profiles;
  const titlePlacement = topFrequency(titleProfiles.map((profile) => profile.titlePlacement).filter((value) => value !== "unknown"), "centered");
  const imageRatio = source.length ? source.filter((profile) => profile.hasImages).length / source.length : 0;
  const avgContentText = source.length ? source.reduce((sum, profile) => sum + profile.textCount, 0) / source.length : 0;
  const avgContentImages = source.length ? source.reduce((sum, profile) => sum + profile.imageCount, 0) / source.length : 0;
  const layout = imageRatio > 0.48 ? "image-focus" : avgContentText > 16 ? "two-column" : avgContentText < 6 ? "minimal" : titlePlacement === "centered" ? "centered" : "balanced";
  return {
    titlePage: {
      count: titleProfiles.length,
      placement: titlePlacement,
      font: topFrequency(titleProfiles.flatMap((profile) => profile.fonts), ""),
      colors: titleProfiles.flatMap((profile) => profile.colors).slice(0, 30),
    },
    contentPage: {
      count: contentProfiles.length,
      avgText: Number(avgContentText.toFixed(1)),
      avgImages: Number(avgContentImages.toFixed(1)),
      imageRatio: Number(imageRatio.toFixed(2)),
      layout,
      font: topFrequency(contentProfiles.flatMap((profile) => profile.fonts), ""),
      colors: contentProfiles.flatMap((profile) => profile.colors).slice(0, 60),
    },
  };
}

async function analyzeStylePptx(file) {
  if (!/\.pptx$/i.test(file?.name || "")) throw new Error(t("customStyleImportPptxOnly"));
  const JSZipRuntime = await loadClientZipRuntime();
  const zip = await JSZipRuntime.loadAsync(await file.arrayBuffer());
  const xmlPaths = Object.keys(zip.files).filter((name) => /^ppt\/(theme|slides)\//i.test(name) && /\.xml$/i.test(name));
  const colors = [];
  const fonts = [];
  const slideProfiles = [];
  let imageSlides = 0;
  let totalSlides = 0;
  let textRuns = 0;
  for (const path of xmlPaths) {
    const xml = await zip.file(path).async("string");
    [...xml.matchAll(/<a:srgbClr\b[^>]*\bval="([0-9A-Fa-f]{6})"/g)].forEach((match) => colors.push(`#${match[1].toLowerCase()}`));
    [...xml.matchAll(/\btypeface="([^"]+)"/g)].forEach((match) => {
      const font = clientXmlDecode(match[1]).trim();
      if (font && !/^\+/.test(font)) fonts.push(font);
    });
    if (/^ppt\/slides\/slide\d+\.xml$/i.test(path)) {
      const slideIndex = Number(path.match(/slide(\d+)\.xml/i)?.[1] || totalSlides + 1);
      const profile = clientExtractSlideStyleProfile(xml, slideIndex - 1);
      slideProfiles.push(profile);
      totalSlides += 1;
      if (/<p:pic\b|r:embed="/i.test(xml)) imageSlides += 1;
      textRuns += (xml.match(/<a:t\b/g) || []).length;
    }
  }
  const summary = summarizeImportedProfiles(slideProfiles);
  const titleColors = summary.titlePage.colors;
  const contentColors = summary.contentPage.colors;
  const mergedColors = [...contentColors, ...titleColors, ...colors].filter((color) => !["#000000", "#ffffff"].includes(color));
  const bg = topFrequency(mergedColors, "#f8fbff");
  const primary = topFrequency([...titleColors, ...mergedColors].filter((color) => color !== bg && color !== "#ffffff"), "#2563eb");
  const accent = topFrequency([...contentColors, ...mergedColors].filter((color) => color !== bg && color !== primary), "#38bdf8");
  const titleFont = summary.titlePage.font || topFrequency(fonts, "Inter");
  const bodyFont = summary.contentPage.font || topFrequency(fonts.filter((font) => font !== titleFont), titleFont || "Arial");
  const imageRatio = totalSlides ? imageSlides / totalSlides : 0;
  const avgTextRuns = totalSlides ? textRuns / totalSlides : 0;
  const layout = summary.contentPage.layout || (imageRatio > 0.45 ? "image-focus" : avgTextRuns > 18 ? "two-column" : avgTextRuns < 7 ? "minimal" : "balanced");
  const nameBase = file.name.replace(/\.pptx$/i, "").replace(/[_-]+/g, " ").trim().slice(0, 34) || "Imported PPT";
  return normalizeCustomStyle({
    id: `custom-${Date.now().toString(36)}`,
    name: `${nameBase} Style`,
    source: "imported-ppt",
    colors: {
      background: bg,
      text: readableTextColor(bg),
      primary,
      accent,
      panel: "#ffffff",
    },
    typography: {
      titleFont: `${titleFont}, Arial, sans-serif`,
      bodyFont: `${bodyFont}, Arial, sans-serif`,
    },
    layout,
    promptAddon: `Use the imported PPT visual language from all ${totalSlides} slides, not only the first page. Recreate title/cover pages with ${summary.titlePage.placement} title placement, title font mood "${titleFont}", background ${bg}, primary ${primary}. Recreate content pages with ${layout} rhythm, body font mood "${bodyFont}", image ratio about ${summary.contentPage.imageRatio}, average text density ${summary.contentPage.avgText}. Preserve original images, avoid overlap, keep strong contrast, and keep slides airy.`,
    localRules: `Imported from ${file.name}. Title pages: ${summary.titlePage.placement} titles, ${summary.titlePage.count} title-like pages sampled, use ${titleFont} and strong primary accents. Content pages: ${summary.contentPage.count} pages sampled, layout=${layout}, avgText=${summary.contentPage.avgText}, avgImages=${summary.contentPage.avgImages}; ${imageRatio > 0.35 ? "reserve medium image areas" : "favor text-first structure"}; colors ${bg}, ${primary}, ${accent}.`,
  });
}

function extractJsonObject(text) {
  const raw = String(text || "").trim();
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/i)?.[1]?.trim();
  const candidate = fenced || raw;
  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");
  if (start < 0 || end <= start) return null;
  return safeJsonParse(candidate.slice(start, end + 1), null);
}

async function refineImportedStyleWithAi(draft) {
  const config = integrationForGeneration();
  if (config.mode !== "ai_api" || !config.apiKey || !config.endpoint) return draft;
  try {
    const response = await fetch(normalizeChatEndpoint(config.endpoint), {
      method: "POST",
      headers: apiHeaders(config),
      body: JSON.stringify({
        model: config.model || "gpt-4.1-mini",
        messages: [
          { role: "system", content: "You summarize PPT visual style into reusable design rules. Return only JSON." },
          { role: "user", content: `Improve this imported PPT style JSON. Keep the same schema. Make localRules practical for deterministic HTML generation and promptAddon useful for AI slide generation. The style must restore both title/cover pages and normal content pages from the whole deck, not just the first slide. In localRules and promptAddon, explicitly describe title page rules and content page rules. Preserve colors and fonts unless contrast is unsafe.\n${JSON.stringify(draft)}` },
        ],
        temperature: 0.15,
        max_tokens: 1800,
      }),
    });
    const text = await response.text();
    const data = safeJsonParse(text, { text });
    if (!response.ok) return draft;
    const refined = extractJsonObject(extractAiText(data)) || extractJsonObject(text);
    return refined ? normalizeCustomStyle({ ...draft, ...refined, id: draft.id, source: "imported-ppt-ai" }) : draft;
  } catch {
    return draft;
  }
}

async function importCustomStyleFromPpt(file) {
  try {
    setStatus(t("customStyleAnalyzing"));
    const draft = await analyzeStylePptx(file);
    const style = await refineImportedStyleWithAi(draft);
    openCustomStyle(style);
    el("customStyleStatus").textContent = t("customStyleImported");
    setStatus(t("customStyleImported"), "ok");
  } catch (error) {
    setStatus(error.message || t("customStyleImportPptxOnly"), "error");
  } finally {
    el("styleImportInput").value = "";
  }
}

function isAiConverterMode() {
  return (document.getElementById("optimizationMode")?.value || "local") === "ai";
}

function storeGeneratedConverterJob(rawJob, generationMode) {
  const generatedJob = hardenGeneratedConverterJob(hydrateInlineJob(rawJob), Number(rawJob?.slides || 0));
  state.activeJob = generatedJob;
  const aiMessage = formatAiStatus(generatedJob);
  const inlineMessage = generatedJob.inlinePreviewAvailable ? (state.language === "zh" ? " 内联预览已准备好。" : " Inline preview is ready.") : "";
  setStatus(aiMessage ? `${state.language === "zh" ? "已完成。" : "Completed. "}${aiMessage}${inlineMessage}` : `${state.language === "zh" ? "已完成，预览已准备好。" : "Completed. Preview is ready."}${inlineMessage}`, "ok");
  const existingIndex = state.jobs.findIndex((job) => job.id === generatedJob.id);
  if (existingIndex >= 0) state.jobs[existingIndex] = { ...state.jobs[existingIndex], ...generatedJob };
  else state.jobs.unshift(generatedJob);
  renderJobs();
  renderJobSelect();
  selectJob(generatedJob.id);
  return saveConverterHistoryRecord(generatedJob, generationMode);
}

function updatePptxWorkerProgress(progress = {}, mode = "local") {
  const totalPages = Number(progress.totalPages || 0);
  const completedPages = Number(progress.page || 0);
  const percent = Math.max(1, Math.min(100, Number(progress.percent || 1)));
  const local = mode === "local";
  const word = /\.docx$/i.test(state.selectedFile?.name || "");
  const title = local
    ? (state.language === "zh" ? `正在本地转换 ${word ? "Word" : "PPT"}` : `Converting ${word ? "Word" : "PPT"} locally`)
    : (state.language === "zh" ? "AI 正在优化排版" : "AI is optimizing slide layouts");
  const phaseNames = state.language === "zh"
    ? { unzip: "解析文件", slides: "还原页面", word: "读取 Word 内容", complete: "本地转换完成" }
    : { unzip: "Opening file", slides: "Restoring slides", complete: "Local conversion complete" };
  const message = progress.phase === "slides" && totalPages
    ? (state.language === "zh" ? `正在还原第 ${completedPages} / ${totalPages} 页...` : `Restoring slide ${completedPages} of ${totalPages}...`)
    : (phaseNames[progress.phase] || progress.message || title);
  setGenerationOverlay(true, message);
  window.PptAiProgress?.updateProgress?.({
    percent,
    title,
    phase: phaseNames[progress.phase] || progress.phase || "",
    message,
    completedPages,
    totalPages,
  });
  setStatus(`${message} ${Math.round(percent)}%`);
}

async function runPptxLocalWorker(file, onProgress, stylePack = null) {
  if (!file?.arrayBuffer) throw new Error("A PPTX file is required.");
  const arrayBuffer = await file.arrayBuffer();
  const runOnMainThread = async (reason = "") => {
    if (!window.PptxLocalCore || !window.JSZip) throw new Error("The local PPT converter is unavailable in this browser.");
    const result = await window.PptxLocalCore.convertPptx(arrayBuffer, window.JSZip, onProgress);
    result.deck.fileName = file.name;
    result.html = window.PptxLocalCore.renderDeck(result.deck, [], stylePack);
    result.stats = { ...(result.stats || {}), workerFallback: Boolean(reason), workerFallbackReason: reason };
    return result;
  };
  if (!window.Worker) return runOnMainThread("Web Worker is unavailable.");
  return new Promise((resolve, reject) => {
    let worker;
    try {
      worker = new Worker("/static/pptx-local-worker.js?v=20260802-fixed-stage-v2");
    } catch (error) {
      runOnMainThread(`Worker could not start: ${error?.message || error}`).then(resolve, reject);
      return;
    }
    let settled = false;
    const finish = (callback, value) => {
      if (settled) return;
      settled = true;
      worker.terminate();
      callback(value);
    };
    const fallback = (message) => {
      if (settled) return;
      settled = true;
      worker.terminate();
      runOnMainThread(message).then(resolve, reject);
    };
    worker.onerror = (event) => fallback(`Worker resource failed: ${event.message || "/static/pptx-local-worker.js"}`);
    worker.onmessage = (event) => {
      const payload = event.data || {};
      if (payload.type === "progress") {
        onProgress?.(payload);
        return;
      }
      if (payload.type === "error") finish(reject, new Error(payload.message || "Local PPT conversion failed."));
      if (payload.type === "result") finish(resolve, payload);
    };
    const transferable = arrayBuffer.slice(0);
    worker.postMessage({ type: "convert", fileName: file.name, arrayBuffer: transferable, stylePack }, [transferable]);
  });
}

async function renderPptxDeckWithPatches(deck, patches = [], stylePack = null) {
  if (window.PptxLocalCore) return window.PptxLocalCore.renderDeck(deck, patches, stylePack);
  if (!window.Worker) throw new Error("本地增强渲染器未加载：PptxLocalCore 和 Web Worker 均不可用。");
  return new Promise((resolve, reject) => {
    let worker;
    try {
      worker = new Worker("/static/pptx-local-worker.js?v=20260802-fixed-stage-v2");
    } catch (error) {
      reject(new Error(`本地增强渲染器启动失败：${error?.message || error}`));
      return;
    }
    let settled = false;
    const finish = (callback, value) => {
      if (settled) return;
      settled = true;
      worker.terminate();
      callback(value);
    };
    worker.onerror = (event) => finish(reject, new Error(`本地增强渲染器资源失败：${event.message || "/static/pptx-local-worker.js"}`));
    worker.onmessage = (event) => {
      const payload = event.data || {};
      if (payload.type === "error") finish(reject, new Error(`本地增强渲染失败：${payload.message || "unknown renderer error"}`));
      if (payload.type === "result") finish(resolve, payload.html || "");
    };
    worker.postMessage({ type: "render", deck, patches, stylePack });
  });
}

function ensureAiLayoutPatches(patches = [], slides = []) {
  const aliases = {
    "title-cover": "cover-title",
    "text-focus": "focus",
    "text-only": "focus",
    "two-column": "columns",
    "image-focus": "image-led",
  };
  const supported = new Set([
    "source", "auto", "cover-title", "editorial-cover", "section-divider", "qa-closing",
    "image-led", "resource-gallery", "contact-feature", "structured-bio", "profile-split",
    "split", "gallery", "columns", "focus", "stack", "numbered-card-grid", "metric-triptych",
    "outcome-strips", "dual-syllabus", "rubric-matrix", "comparison-panels", "do-dont-columns",
    "schedule-timeline", "assessment-overview", "data-dashboard",
  ]);
  const byPage = new Map((Array.isArray(patches) ? patches : []).map((patch) => [Number(patch.page), { ...patch }]));
  (Array.isArray(slides) ? slides : []).forEach((slide, index) => {
    const page = Number(slide.page || index + 1);
    const hasContent = String(slide.text || "").trim().length > 0
      || Number(slide.imageCount || 0) > 0
      || (Array.isArray(slide.elements) && slide.elements.some((element) => element.type === "table" || element.type === "graphic"));
    if (!hasContent) return;
    const patch = byPage.get(page) || { page };
    const requested = String(patch.layoutPreset || "").trim().toLowerCase();
    patch.layoutPreset = aliases[requested] || (supported.has(requested) ? requested : "auto");
    if (patch.layoutPreset === "source") patch.layoutPreset = "auto";
    byPage.set(page, patch);
  });
  return [...byPage.values()].sort((a, b) => a.page - b.page);
}

function contentLockFailurePage(error, totalPages) {
  const message = String(error?.message || error || "");
  const match = message.match(/(?:page-|missing-slide-)(\d+)/i) || message.match(/(?:^|-)s(\d+)(?:-|$)/i);
  const page = Number(match?.[1]);
  return Number.isInteger(page) && page >= 1 && page <= totalPages ? page : 0;
}

function restoreSourceLayoutForPage(patches, page) {
  const next = (Array.isArray(patches) ? patches : []).filter((patch) => Number(patch.page) !== page);
  next.push({ page, layoutPreset: "source", density: "balanced", imageFit: "contain" });
  return next.sort((a, b) => Number(a.page) - Number(b.page));
}

function assertPptPageContentLocks(html, deck) {
  if (!window.DOMParser || !deck?.slides?.length) return { checkedSlides: 0, checkedElements: 0, checkedImages: 0 };
  const doc = new DOMParser().parseFromString(String(html || ""), "text/html");
  const normalize = (value) => String(value || "").replace(/\s+/g, "").trim();
  const sourceText = (shape) => [
    ...(shape.paragraphs || []),
    ...(shape.table?.rows || []).flatMap((row) => row.cells || []).flatMap((cell) => cell.paragraphs || []),
  ].flatMap((paragraph) => paragraph.runs || []).map((run) => run.text).join(" ");
  let checkedElements = 0;
  let checkedImages = 0;
  deck.slides.forEach((slide, index) => {
    const section = doc.querySelector(`.slide[data-source-page="${index + 1}"]`);
    if (!section) throw new Error(`AI layout content lock failed: missing-slide-${index + 1}.`);
    slide.shapes.filter((shape) => !shape.decorative).forEach((shape) => {
      const expected = normalize(sourceText(shape));
      const node = section.querySelector(`[data-source-element-id="${CSS.escape(shape.id)}"]`);
      if (!node && (expected || shape.type === "image")) throw new Error(`AI layout content lock failed: missing-element-${shape.id}.`);
      if (expected && node) {
        const clone = node.cloneNode(true);
        clone.querySelectorAll('[aria-hidden="true"],.ppt-bullet').forEach((item) => item.remove());
        const actual = normalize(clone.textContent);
        if (actual !== expected) throw new Error(`AI layout content lock failed: text-mismatch-page-${index + 1}-${shape.id}.`);
        checkedElements += 1;
      }
      if (shape.type === "image" && slide.images?.[shape.imageRelId]) checkedImages += 1;
    });
    const expectedImages = slide.shapes.filter((shape) => shape.type === "image" && slide.images?.[shape.imageRelId]).length;
    const actualImages = section.querySelectorAll('img[data-source-element-id]').length;
    if (actualImages !== expectedImages) throw new Error(`AI layout content lock failed: image-count-page-${index + 1}.`);
  });
  return { checkedSlides: deck.slides.length, checkedElements, checkedImages };
}

function assertPdfResearchContentLocks(html, result) {
  if (!window.DOMParser) return { checkedSlides: 0, checkedEvidence: 0, checkedSources: 0, protocol: "pdf-research-lock" };
  const planSlides = Array.isArray(result?.pdfResearchPlan?.slides) ? result.pdfResearchPlan.slides : [];
  if (!planSlides.length) throw new Error("PDF research content lock failed: empty-page-plan.");
  const sourcePages = Array.isArray(result?.paper?.pages) ? result.paper.pages : [];
  const pageCount = sourcePages.length || Number(result?.stats?.sourcePages?.length || 0);
  const evidenceIds = new Set([
    ...(result?.paper?.figures || []),
    ...(result?.paper?.tables || []),
  ].map((item) => String(item?.id || "")).filter(Boolean));
  const doc = new DOMParser().parseFromString(String(html || ""), "text/html");
  const sections = [...doc.querySelectorAll(".slide[data-slide-page],section[data-slide-page]")]
    .filter((section) => !section.closest(".ppt-runtime-nav,.ppt-paged-player-nav,[data-html-deck-editor-ui]"));
  if (sections.length !== planSlides.length) {
    throw new Error(`PDF research content lock failed: page-count-${sections.length}-expected-${planSlides.length}.`);
  }
  let checkedEvidence = 0;
  let checkedSources = 0;
  planSlides.forEach((slide, index) => {
    const page = index + 1;
    const section = sections.find((node) => Number(node.dataset.slidePage || 0) === page) || sections[index];
    if (!section) throw new Error(`PDF research content lock failed: missing-slide-${page}.`);
    const expectedId = `pdf-v3-slide-${page}`;
    if (section.dataset.pdfSlideId && section.dataset.pdfSlideId !== expectedId) {
      throw new Error(`PDF research content lock failed: invalid-slide-id-${page}.`);
    }
    const text = String(section.textContent || "").replace(/\s+/g, " ").trim();
    if (text.length < 12) throw new Error(`PDF research content lock failed: empty-slide-${page}.`);
    const refs = Array.isArray(slide?.sourceRefs) ? slide.sourceRefs : [];
    refs.forEach((ref) => {
      const match = String(ref).match(/(?:p\.?\s*)(\d+)/i);
      if (!match) return;
      const sourcePage = Number(match[1]);
      if (pageCount && (sourcePage < 1 || sourcePage > pageCount)) {
        throw new Error(`PDF research content lock failed: invalid-source-page-${page}-${sourcePage}.`);
      }
      checkedSources += 1;
    });
    const plannedEvidence = (Array.isArray(slide?.evidence) ? slide.evidence : [])
      .map((entry) => String(typeof entry === "string" ? entry : entry?.id || ""))
      .filter(Boolean);
    const renderedEvidence = new Set([...section.querySelectorAll("[data-evidence-id]")].map((node) => String(node.dataset.evidenceId || "")));
    let hasValidRenderedEvidence = false;
    plannedEvidence.forEach((id) => {
      if (!id) return;
      if (evidenceIds.size && !evidenceIds.has(id)) throw new Error(`PDF research content lock failed: invalid-evidence-${id}.`);
      if (renderedEvidence.has(id)) {
        checkedEvidence += 1;
        hasValidRenderedEvidence = true;
      }
    });
    if (plannedEvidence.length && !hasValidRenderedEvidence) {
      throw new Error(`PDF research content lock failed: missing-evidence-${plannedEvidence[0]}.`);
    }
  });
  return { checkedSlides: sections.length, checkedEvidence, checkedSources, protocol: "pdf-research-lock" };
}

function makeBrowserConverterJob(result, mode, aiStatus, contentPolicy = "ppt-source-lock") {
  const html = makePagedHtmlPlayable(result.html);
  const contentLock = mode === "ai"
    ? (contentPolicy === "pdf-research-lock" ? assertPdfResearchContentLocks(html, result) : assertPptPageContentLocks(html, result.deck))
    : null;
  assertUsableConverterDeck(html, result.stats.slideCount, mode === "ai" ? "AI-enhanced converter HTML" : "Local converter HTML");
  const id = `${mode === "ai" ? "AI" : "LOCAL"}-${Date.now().toString(36).toUpperCase()}`;
  return {
    id,
    fileName: state.selectedFile.name,
    slides: result.stats.slideCount,
    style: state.selectedStyle,
    status: "completed",
    updatedAt: new Date().toISOString(),
    previewUrl: "",
    scrollUrl: "",
    downloadUrl: "",
    inlinePreviewHtml: html,
    inlineScrollHtml: makeScrollHtmlFromPaged(html),
    inlinePreviewMode: "blob",
    aiStatus,
    contentPolicy,
    share: {
      status: "ready",
      recommendation: mode === "ai" ? "AI selected a safe layout for each source page; deterministic rendering preserved all page content and prevented overflow." : "Converted entirely in this browser without an AI or upload API.",
      totalImages: Number(result.stats.imageCount || 0),
      embeddedImages: Number(result.stats.imageCount || 0),
      missingImages: 0,
      riskyPaths: 0,
      externalImages: 0,
      conversionMs: Number(result.stats.conversionMs || 0),
      unresolvedTransforms: Number(result.stats.unresolvedTransforms || 0),
      contentLock,
    },
  };
}

function isWordFile(file = state.selectedFile) {
  return Boolean(file && (/\.docx$/i.test(file.name || "") || file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document"));
}

function sanitizeWordHtml(source) {
  if (!window.DOMParser) return String(source || "");
  const doc = new DOMParser().parseFromString(String(source || ""), "text/html");
  const allowed = new Set(["H1", "H2", "H3", "H4", "H5", "H6", "P", "UL", "OL", "LI", "TABLE", "THEAD", "TBODY", "TFOOT", "TR", "TH", "TD", "STRONG", "EM", "B", "I", "U", "S", "A", "IMG", "BLOCKQUOTE", "PRE", "CODE", "BR", "HR", "SUB", "SUP", "DIV", "SPAN"]);
  doc.querySelectorAll("script,style,iframe,object,embed,svg,form,link,meta").forEach((node) => node.remove());
  doc.body.querySelectorAll("*").forEach((node) => {
    if (!allowed.has(node.tagName)) { node.replaceWith(...node.childNodes); return; }
    [...node.attributes].forEach((attribute) => {
      const name = attribute.name.toLowerCase();
      if (name.startsWith("on") || ["style", "class", "id", "width", "height"].includes(name)) node.removeAttribute(attribute.name);
      if (name === "href" && !/^(https?:|mailto:|#)/i.test(attribute.value)) node.removeAttribute(attribute.name);
      if (name === "src" && !/^data:image\//i.test(attribute.value)) node.removeAttribute(attribute.name);
    });
  });
  return doc.body.innerHTML.trim();
}

function wordDataUriAssets(html) {
  const assets = [];
  const seen = new Map();
  const doc = new DOMParser().parseFromString(`<body>${html}</body>`, "text/html");
  doc.querySelectorAll("img[src^='data:image/']").forEach((image, index) => {
    const src = image.getAttribute("src");
    if (!src) return;
    let asset = seen.get(src);
    if (!asset) {
      const mime = src.match(/^data:([^;]+);/i)?.[1] || "image/png";
      asset = { id: `word-image-${assets.length + 1}`, src, mime, alt: image.getAttribute("alt") || `Word image ${index + 1}` };
      assets.push(asset); seen.set(src, asset);
    }
    image.setAttribute("data-word-asset-id", asset.id);
    image.setAttribute("src", `asset://${asset.id}`);
  });
  return { html: doc.body.innerHTML, assets };
}

async function classifyWordAssets(assets = []) {
  if (!window.Image) return assets;
  return Promise.all((Array.isArray(assets) ? assets : []).map(async (asset) => {
    try {
      const image = new Image();
      image.src = asset.src;
      await (image.decode ? image.decode() : new Promise((resolve) => { image.onload = resolve; image.onerror = resolve; }));
      const canvas = document.createElement("canvas"); canvas.width = 48; canvas.height = 48;
      const context = canvas.getContext("2d", { willReadFrequently: true });
      if (!context) return { ...asset, kind: "visual", renderable: true };
      context.drawImage(image, 0, 0, 48, 48);
      const pixels = context.getImageData(0, 0, 48, 48).data;
      let ink = 0; let chroma = 0; let visible = 0;
      for (let index = 0; index < pixels.length; index += 4) {
        const alpha = pixels[index + 3];
        if (alpha < 12) continue;
        visible += 1;
        const brightness = (pixels[index] + pixels[index + 1] + pixels[index + 2]) / 3;
        if (brightness < 238) ink += 1;
        if (Math.max(pixels[index], pixels[index + 1], pixels[index + 2]) - Math.min(pixels[index], pixels[index + 1], pixels[index + 2]) > 10) chroma += 1;
      }
      const blank = visible < 32 || (ink / Math.max(1, visible) < 0.006 && chroma / Math.max(1, visible) < 0.012);
      return { ...asset, kind: blank ? "background-or-empty" : "visual", renderable: !blank };
    } catch {
      return { ...asset, kind: "visual", renderable: true };
    }
  }));
}

function removeWordAssetsFromHtml(html, assetIds = []) {
  if (!assetIds.length || !window.DOMParser) return html;
  const doc = new DOMParser().parseFromString(`<body>${html}</body>`, "text/html");
  const ids = new Set(assetIds);
  doc.querySelectorAll("img[data-word-asset-id]").forEach((node) => {
    if (ids.has(node.dataset.wordAssetId)) node.remove();
  });
  return doc.body.innerHTML;
}

function wordHtmlToMarkdown(html, assets) {
  const turndown = window.TurndownService ? new window.TurndownService({ headingStyle: "atx", bulletListMarker: "-", codeBlockStyle: "fenced" }) : null;
  if (!turndown) throw new Error("Word Markdown converter did not load.");
  turndown.addRule("wordAssetImage", {
    filter: (node) => node.nodeName === "IMG" && node.getAttribute("data-word-asset-id"),
    replacement: (_content, node) => `![${node.getAttribute("alt") || "image"}](asset://${node.getAttribute("data-word-asset-id")})`,
  });
  return turndown.turndown(html).replace(/\n{3,}/g, "\n\n").trim();
}

function assignWordAssetsToOutline(outline, assets = [], markdown = "") {
  const list = Array.isArray(assets) ? assets.filter((asset) => asset?.id && asset?.src) : [];
  const orderedIds = [...String(markdown || "").matchAll(/asset:\/\/(word-image-[\w-]+)/gi)].map((match) => match[1]);
  const ids = [...new Set([...orderedIds, ...list.map((asset) => asset.id)])].filter((id) => list.some((asset) => asset.id === id));
  const slides = Array.isArray(outline) ? outline : [];
  if (!slides.length || !ids.length) return slides.map((slide) => ({ ...slide, imageIds: [] }));
  const targetPages = slides.length > 1 ? slides.slice(1) : slides;
  const assignments = new Map(slides.map((slide) => [Number(slide.page), []]));
  ids.forEach((id, assetIndex) => {
    const target = targetPages[Math.min(targetPages.length - 1, Math.floor((assetIndex * targetPages.length) / ids.length))] || slides[0];
    assignments.get(Number(target.page))?.push(id);
  });
  return slides.map((slide) => ({ ...slide, imageIds: assignments.get(Number(slide.page)) || [] }));
}

function wordSemanticBlocks(markdown) {
  // Mammoth/Turndown can emit a DOCX without explicit page numbers as one
  // long paragraph stream. Split on both Markdown paragraph boundaries and
  // single-line heading/list boundaries so pagination does not collapse to a
  // single page.
  const source = String(markdown || "").replace(/\r/g, "").replace(/\n(?=\s*(?:#{1,6}\s+|[-*+]\s+|\d+[.)]\s+))/g, "\n\n");
  return source.split(/\n{2,}/).map((raw) => String(raw || "").trim()).filter(Boolean).map((raw) => {
    const lines = raw.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
    const headingLine = lines.find((line) => /^#{1,6}\s+/.test(line));
    const title = (headingLine || lines[0] || "").replace(/^#{1,6}\s+/, "").replace(/^[-*+]\s+/, "").trim().slice(0, 100);
    const imageIds = [...new Set([...raw.matchAll(/asset:\/\/(word-image-[\w-]+)/gi)].map((match) => match[1]))];
    const textLines = lines.filter((line) => !/!\[[^\]]*\]\(asset:\/\/[^)]+\)/i.test(line)).map((line) => line.replace(/^#{1,6}\s+/, "").replace(/^[-*+]\s+/, "").replace(/^\d+[.)]\s+/, "").trim()).filter(Boolean);
    const text = textLines.join(" ").replace(/\s+/g, " ").trim();
    const sentences = text.split(/(?<=[。！？.!?；;])\s+|\n+/).map((part) => part.trim()).filter(Boolean);
    return { raw, title: title || "Word 内容", text, sentences, imageIds, chars: text.replace(/\s/g, "").length };
  });
}

function wordMarkdownOutline(markdown, fileName, assets = []) {
  const blocks = wordSemanticBlocks(markdown);
  if (!blocks.length) return [{ page: 1, role: "content", title: fileName.replace(/\.docx$/i, ""), coreClaim: "Word 文档内容", body: ["文档中未识别到可分页的段落。"], sourceRefs: [fileName], evidence: [], imageIds: [] }];
  const pages = [];
  let current = null;
  const flush = () => {
    if (!current) return;
    const body = [...new Set(current.sentences)].filter(Boolean).slice(0, 8);
    pages.push({
      page: pages.length + 1,
      role: pages.length ? (current.imageIds.length ? "evidence" : "content") : "cover",
      title: current.title || `第 ${pages.length + 1} 页`,
      coreClaim: body[0] || current.title || "Word 文档内容",
      body: body.slice(1),
      sourceRefs: [fileName],
      evidence: [],
      imageIds: [...new Set(current.imageIds)],
    });
    current = null;
  };
  blocks.forEach((block) => {
    const hasEnough = current && current.chars >= 430;
    const hasSectionBreak = current && /^#{1,6}\s+/.test(block.raw) && current.chars >= 220;
    const hasVisualBreak = current && block.imageIds.length && current.imageIds.length && current.chars >= 280;
    if (hasEnough || hasSectionBreak || hasVisualBreak) flush();
    if (!current) current = { title: block.title, sentences: [], imageIds: [], chars: 0 };
    if (current.title === "Word 内容" && block.title) current.title = block.title;
    const sentences = block.sentences.length ? block.sentences : [block.text];
    current.sentences.push(...sentences);
    current.imageIds.push(...block.imageIds);
    current.chars += block.chars;
  });
  flush();
  // A long document without headings or page numbers must still paginate.
  // Split every oversized page by a conservative sentence budget, not only
  // the one-page case. This preserves content instead of silently dropping
  // paragraphs when a DOCX has no explicit page breaks.
  const splitPages = [];
  pages.forEach((source) => {
    const sentences = [source.coreClaim, ...(source.body || [])].filter(Boolean);
    const chunks = [];
    let chunkItems = [];
    let count = 0;
    sentences.forEach((sentence) => {
      const size = String(sentence).replace(/\s/g, "").length;
      if (chunkItems.length && count + size > 480) { chunks.push(chunkItems); chunkItems = []; count = 0; }
      chunkItems.push(sentence); count += size;
    });
    if (chunkItems.length) chunks.push(chunkItems);
    const shouldSplit = chunks.length > 1 || (source.imageIds || []).length > 1;
    (shouldSplit ? chunks : [sentences]).forEach((items, index) => splitPages.push({
      ...source,
      page: splitPages.length + 1,
      role: splitPages.length ? (source.imageIds?.length ? "evidence" : "content") : "cover",
      title: index ? `${source.title}（${index + 1}）` : source.title,
      coreClaim: items[0] || source.coreClaim,
      body: items.slice(1),
      imageIds: index === 0 ? (source.imageIds || []) : [],
    }));
  });
  return assignWordAssetsToOutline(splitPages, assets, markdown);
}

function wordV3BlocksFromModel(model) {
  const output = [];
  wordSemanticBlocks(model?.markdown || "").forEach((block, blockIndex) => {
    const title = String(block.title || "").replace(/^\*+|\*+$/g, "").trim().slice(0, 160);
    const text = String(block.text || "").replace(/!\[[^\]]*\]\([^)]*\)/g, "").replace(/[*_~`]/g, "").replace(/\s+/g, " ").trim();
    const parts = text ? Array.from({ length: Math.ceil(text.length / 1800) }, (_, partIndex) => text.slice(partIndex * 1800, (partIndex + 1) * 1800).trim()).filter(Boolean) : [""];
    parts.forEach((part, partIndex) => output.push({
      id: `block-${blockIndex + 1}-${partIndex + 1}`,
      title: partIndex === 0 ? title : `${title}（续）`,
      text: part,
      imageIds: partIndex === 0 && Array.isArray(block.imageIds) ? block.imageIds : [],
      chars: part.replace(/\s/g, "").length,
    }));
  });
  return output.filter((block) => block.text || block.title || block.imageIds.length);
}

function wordV3DesignSpec(stylePack) {
  const colors = stylePack?.colors || {};
  const typography = stylePack?.typography || {};
  return {
    version: "DeckDesignSpecV2",
    style: stylePack?.id || "teaching",
    skillId: stylePack?.skillId || window.PptStyleRegistry?.skillIdFor?.(stylePack?.id) || "deck-open-slide-canvas",
    skillCommit: "d0efb1e",
    tokens: {
      background: colors.background || "#f8fbff",
      text: colors.text || "#102a43",
      primary: colors.primary || "#155eef",
      panel: colors.panel || "#ffffff",
      titleFont: typography.titleFont || "Inter, Arial, sans-serif",
      bodyFont: typography.bodyFont || "Inter, Arial, sans-serif",
    },
    layout: stylePack?.layout || stylePack?.previewLayout || "lesson-grid",
    layoutPool: Array.isArray(stylePack?.layouts) ? stylePack.layouts : [],
    profile: stylePack?.profile || {},
    contract: ["one shared HTML Anything Skill shell", "fixed 1280x720 canvas", "one claim per page", "confirmed Markdown is not summarised again", "no Markdown syntax in audience text"],
  };
}

function wordV3OutlineMarkdown(outline) {
  const plan = outline || {};
  return [
    `# ${String(plan.title || "Word 文档摘要").trim()}`,
    plan.summary ? `\n> ${String(plan.summary).trim()}` : "",
    ...(Array.isArray(plan.slides) ? plan.slides : []).map((slide, index) => [
      `\n## ${index + 1}. ${String(slide.title || `第 ${index + 1} 页`).trim()}`,
      slide.coreClaim ? `- 核心结论：${String(slide.coreClaim).trim()}` : "",
      ...(Array.isArray(slide.body) ? slide.body : []).map((item) => `- ${String(item).trim()}`),
    ].filter(Boolean).join("\n")),
  ].filter(Boolean).join("\n").replace(/\n{3,}/g, "\n\n").trim();
}

async function readWordV3Stream(phase, payload, options = {}) {
  const endpoint = "/api/word-deck/v3/outline/stream";
  await ensurePlatformRoute(endpoint);
  const response = await fetch(apiUrl(endpoint), { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...payload, phase }) });
  if (!response.ok) throw new Error((await response.text()) || `Word V3 request failed (${response.status}).`);
  const reader = response.body?.getReader();
  if (!reader) throw new Error("Word V3 endpoint did not return a stream.");
  const decoder = new TextDecoder(); let buffer = ""; let complete = null;
  const handleRecord = (record) => {
    const event = record.match(/^event:\s*(.+)$/m)?.[1]?.trim() || "message";
    const raw = record.split(/\r?\n/).filter((line) => /^data\s*:/.test(line)).map((line) => line.replace(/^data\s*:\s?/, "")).join("\n").trim();
    if (!raw) return;
    let data; try { data = JSON.parse(raw); } catch { if (event === "error" || event === "complete") throw new Error("Word V3 returned malformed event data."); return; }
    if (["accepted", "summary_ready", "outline_ready"].includes(event)) {
      options.onEvent?.(event, data);
      window.PptAiProgress?.updateProgress?.({ percent: Number(data.progress || 1), phase: event, message: data.message || (phase === "reduce" ? "正在汇总 Word 大纲" : "正在阅读 Word 内容"), completedPages: Number(data.completedPages || 0), totalPages: Number(data.pageCount || payload.totalChunks || 1) });
    }
    if (event === "complete") complete = data;
    if (event === "error") throw new Error(data.message || "Word V3 summary failed.");
  };
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const records = buffer.split(/\r?\n\r?\n/); buffer = records.pop() || ""; records.forEach(handleRecord);
  }
  buffer += decoder.decode(); if (buffer.trim()) handleRecord(buffer);
  if (!complete) throw new Error("Word V3 did not return a complete result.");
  return complete;
}

function openWordV3SummaryDb() {
  if (!window.indexedDB) return Promise.resolve(null);
  return new Promise((resolve) => {
    const request = indexedDB.open("ppt-html-word-v3", 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains("summaries")) db.createObjectStore("summaries", { keyPath: "key" });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => resolve(null);
  });
}

async function readWordV3Summary(key) {
  const db = await openWordV3SummaryDb();
  if (!db) return null;
  return await new Promise((resolve) => {
    const request = db.transaction("summaries", "readonly").objectStore("summaries").get(key);
    request.onsuccess = () => resolve(request.result?.summary || null);
    request.onerror = () => resolve(null);
    db.close();
  });
}

async function saveWordV3Summary(key, summary) {
  const db = await openWordV3SummaryDb();
  if (!db) return;
  await new Promise((resolve) => {
    const tx = db.transaction("summaries", "readwrite");
    tx.objectStore("summaries").put({ key, summary, savedAt: Date.now() });
    tx.oncomplete = resolve;
    tx.onerror = resolve;
  });
  db.close();
}

async function generateWordV3Outline(model, stylePack, integration) {
  const blocks = wordV3BlocksFromModel(model);
  if (!blocks.length) throw new Error("Word 文档没有可总结的正文内容。");
  const chunks = []; let current = []; let chars = 0;
  blocks.forEach((block) => {
    const size = Math.max(1, Number(block.text?.length || block.chars || 0));
    if (current.length && (chars + size > 12000 || current.length >= 24)) { chunks.push(current); current = []; chars = 0; }
    current.push(block); chars += size;
  });
  if (current.length) chunks.push(current);
  const base = { filename: state.selectedFile?.name || "word-document.docx", style: stylePack?.id || state.selectedStyle, customStyle: activeCustomStyle(), integration, totalChunks: chunks.length };
  const checkpointPrefix = `word-v3:${state.selectedFile?.name || "document"}:${state.selectedFile?.size || 0}:${state.selectedFile?.lastModified || 0}`;
  const summaries = [];
  for (let index = 0; index < chunks.length; index += 1) {
    const checkpointKey = `${checkpointPrefix}:map:${index}`;
    const cached = await readWordV3Summary(checkpointKey);
    if (cached) {
      summaries.push(cached);
      setStatus(`已恢复 Word 摘要窗口（${index + 1}/${chunks.length}）`);
      continue;
    }
    const result = await readWordV3Stream("map", { ...base, chunkIndex: index, sourceBlocks: chunks[index] }, { onEvent: (_event, data) => setStatus(`AI 正在阅读 Word 内容（${index + 1}/${chunks.length}） ${Math.round(Number(data.progress || 1))}%`) });
    if (result.summary) {
      summaries.push(result.summary);
      await saveWordV3Summary(checkpointKey, result.summary);
    }
  }
  let reduceInput = summaries;
  while (reduceInput.length > 8) {
    const next = [];
    for (let index = 0; index < reduceInput.length; index += 8) {
      const result = await readWordV3Stream("reduce", { ...base, summaries: reduceInput.slice(index, index + 8), totalChunks: Math.ceil(reduceInput.length / 8) });
      if (result.outline) next.push({ summary: result.outline.summary, slides: result.outline.slides });
    }
    reduceInput = next;
  }
  const final = await readWordV3Stream("reduce", { ...base, summaries: reduceInput, totalChunks: reduceInput.length || 1 });
  const outline = final.outline || {};
  const sourceById = new Map(blocks.map((block) => [block.id, block]));
  outline.slides = (Array.isArray(outline.slides) ? outline.slides : []).map((slide, index) => {
    const imageIds = [...new Set((Array.isArray(slide.imageIds) ? slide.imageIds : []).concat((slide.sourceBlockIds || []).flatMap((id) => sourceById.get(id)?.imageIds || [])))];
    return { ...slide, page: index + 1, pageId: slide.pageId || `word-page-${index + 1}`, imageIds };
  });
  if (!outline.slides.length) throw new Error("AI 未返回可编辑的 Word 大纲。");
  const distributed = assignWordAssetsToOutline(outline.slides, model.assets, model.markdown);
  const explicitByPage = new Map(outline.slides.map((slide) => [Number(slide.page), Array.isArray(slide.imageIds) ? slide.imageIds : []]));
  const finalSlides = distributed.map((slide) => ({ ...slide, imageIds: [...new Set([...(explicitByPage.get(Number(slide.page)) || []), ...(slide.imageIds || [])])] }));
  return { ...model, markdown: wordV3OutlineMarkdown(outline), outline: finalSlides, wordV3: { outline: { ...outline, slides: finalSlides }, designSpec: wordV3DesignSpec(stylePack), sourceBlockCount: blocks.length, summaryChunkCount: chunks.length } };
}

async function convertWordToMarkdown(file, onProgress = () => {}) {
  if (!window.mammoth || !window.TurndownService) throw new Error("Word 转 Markdown 运行时未加载，请刷新后重试。");
  const started = Date.now(); onProgress({ percent: 8, phase: "word", page: 0, totalPages: 1 });
  const arrayBuffer = await file.arrayBuffer();
  const converted = await window.mammoth.convertToHtml({ arrayBuffer }, {
    includeDefaultStyleMap: true,
    convertImage: window.mammoth.images.imgElement((image) => image.readAsBase64String().then((base64) => ({ src: `data:${image.contentType};base64,${base64}` }))),
  });
  const sanitized = sanitizeWordHtml(converted.value);
  const withAssets = wordDataUriAssets(sanitized);
  const classifiedAssets = await classifyWordAssets(withAssets.assets);
  const usableAssets = classifiedAssets.filter((asset) => asset.renderable !== false);
  const removedAssetIds = classifiedAssets.filter((asset) => asset.renderable === false).map((asset) => asset.id);
  const filteredHtml = removeWordAssetsFromHtml(withAssets.html, removedAssetIds);
  const markdown = wordHtmlToMarkdown(filteredHtml, usableAssets);
  const outline = wordMarkdownOutline(markdown, file.name, usableAssets);
  onProgress({ percent: 100, phase: "complete", page: 1, totalPages: 1 });
  return { html: filteredHtml, markdown, outline, assets: usableAssets, messages: converted.messages || [], stats: { parser: "mammoth+turndown", conversionMs: Date.now() - started, imageCount: usableAssets.length, removedImageCount: removedAssetIds.length, slideCount: outline.length } };
}

function wordAssetsForSlide(documentModel, slide, index) {
  const assets = Array.isArray(documentModel?.assets) ? documentModel.assets : [];
  const ids = Array.isArray(slide?.imageIds) ? slide.imageIds : [];
  const selected = ids.map((id) => assets.find((asset) => asset.id === id)).filter(Boolean);
  return selected.filter((asset, assetIndex, list) => list.findIndex((item) => item.id === asset.id) === assetIndex);
}

function injectWordImagesIntoHtml(sourceHtml, documentModel) {
  const source = String(sourceHtml || "");
  if (!source || !window.DOMParser) return source;
  const doc = new DOMParser().parseFromString(source, "text/html");
  const assets = Array.isArray(documentModel?.assets) ? documentModel.assets.filter((asset) => asset?.id && asset?.src) : [];
  if (!assets.length) return source;
  const slides = [...new Set([
    ...doc.querySelectorAll(".slide[data-slide-page], section[data-slide-page], .ai-slide[data-slide-page], [data-slide-page]"),
  ])].filter((slide) => !slide.closest(".ppt-runtime-nav,.ppt-paged-player-nav,[data-html-deck-editor-ui]") && !slide.parentElement?.closest("[data-slide-page]"));
  if (!slides.length) return source;
  const slidePlan = Array.isArray(documentModel?.outline) ? documentModel.outline : [];
  const used = new Set();
  const style = doc.createElement("style");
  style.id = "word-asset-evidence-style";
  style.textContent = `.word-image-host{position:relative!important}.word-evidence-rail{position:absolute;right:4%;bottom:5%;width:34%;max-height:30%;display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;z-index:8;pointer-events:auto}.word-evidence-card{min-width:0;min-height:0;margin:0;padding:5px;background:#fff;border:1px solid rgba(21,33,59,.16);border-radius:8px;box-shadow:0 3px 12px rgba(21,33,59,.12);display:flex;flex-direction:column;align-items:stretch}.word-evidence-card img{display:block;width:100%;height:100%;max-height:calc(30vh - 38px);min-height:42px;object-fit:contain;background:#fff}.word-evidence-card figcaption{font-size:10px;line-height:1.2;color:#4d5c72;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-top:3px}.word-evidence-slot{overflow:hidden}.word-evidence-slot img{display:block;width:100%;height:100%;max-height:100%;object-fit:contain}.word-evidence-slot figcaption{font-size:11px;line-height:1.2;color:#4d5c72}`;
  doc.head?.appendChild(style);
  const setImage = (container, asset) => {
    if (!container || !asset) return;
    container.classList.add("word-evidence-slot");
    container.dataset.wordAssetId = asset.id;
    container.innerHTML = `<img data-word-asset-id="${escapeHtml(asset.id)}" src="${escapeHtml(asset.src)}" alt="${escapeHtml(asset.alt || asset.id)}"><figcaption>${escapeHtml(asset.alt || asset.id)}</figcaption>`;
    used.add(asset.id);
  };
  slides.forEach((slideNode, index) => {
    slideNode.classList.add("word-image-host");
    const planned = wordAssetsForSlide(documentModel, slidePlan[index], index);
    const already = new Set([...slideNode.querySelectorAll("img[data-word-asset-id]")].map((node) => String(node.dataset.wordAssetId || "")).filter(Boolean));
    already.forEach((id) => used.add(id));
    const slots = [...slideNode.querySelectorAll("[data-image-slot]")];
    planned.forEach((asset, assetIndex) => {
      if (already.has(asset.id)) return;
      const slot = slots[assetIndex];
      if (slot) setImage(slot, asset);
    });
    const remaining = planned.filter((asset) => !already.has(asset.id) && !slots.slice(0, planned.indexOf(asset) + 1).some((slot) => slot.dataset.wordAssetId === asset.id));
    if (!remaining.length) return;
    let rail = slideNode.querySelector("[data-word-evidence-rail]");
    if (!rail) {
      rail = doc.createElement("div");
      rail.className = "word-evidence-rail";
      rail.dataset.wordEvidenceRail = "true";
      slideNode.appendChild(rail);
    }
    remaining.forEach((asset) => {
      if (rail.querySelector(`[data-word-asset-id="${asset.id}"]`)) return;
      const figure = doc.createElement("figure");
      figure.className = "word-evidence-card";
      figure.dataset.wordAssetId = asset.id;
      figure.innerHTML = `<img data-word-asset-id="${escapeHtml(asset.id)}" src="${escapeHtml(asset.src)}" alt="${escapeHtml(asset.alt || asset.id)}"><figcaption>${escapeHtml(asset.alt || asset.id)}</figcaption>`;
      rail.appendChild(figure);
      used.add(asset.id);
    });
  });
  return doc.documentElement.outerHTML;
}

function buildWordLocalHtml(documentModel, stylePack) {
  const colors = stylePack?.colors || {};
  const bg = colors.background || "#f7f3e8"; const ink = colors.ink || "#15213b"; const accent = colors.accent || "#3f64d9";
  const styleId = String(stylePack?.id || "source").toLowerCase();
  const clean = (value) => String(value || "")
    .replace(/```[\s\S]*?```/g, "")
    .replace(/(^|\s)([*_~]{1,3})(?=\S)/g, "$1")
    .replace(/(?<=\S)([*_~]{1,3})(?=\s|$)/g, "")
    .replace(/^\s*[-*+]\s+/g, "")
    .replace(/\s+/g, " ")
    .trim();
  const layout = /academic|research|paper/.test(styleId) ? "word-layout-academic" : /swiss|grid/.test(styleId) ? "word-layout-swiss" : /technology|tech/.test(styleId) ? "word-layout-tech" : "word-layout-editorial";
  const sourceSlides = Array.isArray(documentModel?.outline) && documentModel.outline.length
    ? documentModel.outline
    : [{ page: 1, role: "content", title: "Word 文档摘要", coreClaim: "已提取文档内容，可继续编辑。", body: String(documentModel?.markdown || "").split(/\r?\n/).map((line) => line.trim()).filter(Boolean).slice(0, 8), sourceRefs: [] }];
  const slides = sourceSlides.map((slide, index) => {
    const assets = wordAssetsForSlide(documentModel, slide, index);
    const visual = assets.length ? `<div class="word-evidence-rail">${assets.map((asset) => `<figure class="word-evidence-card" data-word-asset-id="${escapeHtml(asset.id)}"><img class="word-asset" data-word-asset-id="${escapeHtml(asset.id)}" src="${escapeHtml(asset.src)}" alt="${escapeHtml(asset.alt || "Word image")}"><figcaption>${escapeHtml(asset.alt || asset.id)}</figcaption></figure>`).join("")}</div>` : "";
    return `<section class="slide word-image-host ${layout}" data-slide-page="${index + 1}" data-source-page="${index + 1}"><div class="word-kicker">${escapeHtml(clean(slide.role || "CONTENT"))} · ${String(index + 1).padStart(2, "0")}</div><div class="word-copy"><h1>${escapeHtml(clean(slide.title || "Word 汇报"))}</h1><p class="word-claim">${escapeHtml(clean(slide.coreClaim || ""))}</p><ul>${(slide.body || []).map((item) => `<li>${escapeHtml(clean(item))}</li>`).filter((item) => item !== "<li></li>").join("")}</ul></div>${visual}<div class="word-source">Source: ${escapeHtml((slide.sourceRefs || []).join(" · "))}</div></section>`;
  }).join("");
  return `<!doctype html><html><head><meta charset="utf-8"><style>*{box-sizing:border-box}html,body{margin:0;background:#e9edf3;color:${ink};font-family:Inter,Arial,"Microsoft YaHei",sans-serif}.deck-stage{width:1280px;margin:0 auto}.slide{width:1280px;height:720px;padding:72px 92px;position:relative;overflow:hidden;background:${bg};border-top:12px solid ${accent};page-break-after:always}.word-kicker{font-size:18px;letter-spacing:.16em;text-transform:uppercase;color:${accent};font-weight:700}.word-copy{max-width:790px;position:relative;z-index:2}.slide h1{font-size:58px;line-height:1.08;margin:42px 0 20px;max-width:1000px}.word-claim{font-size:27px;line-height:1.35;max-width:780px}.slide ul{font-size:23px;line-height:1.42;max-width:790px;padding-left:28px}.slide li{margin:9px 0}.word-image-host{position:relative}.word-layout-academic{background:linear-gradient(135deg,${bg},#fff);border-top-width:18px}.word-layout-academic h1{color:${ink};font-weight:800}.word-layout-academic .word-claim{border-left:6px solid ${accent};padding-left:18px}.word-layout-swiss{background:${bg};border-top:0;border-left:18px solid ${accent}}.word-layout-swiss h1{font-size:62px;letter-spacing:-.02em}.word-layout-tech{background:linear-gradient(160deg,#101a2b,#172d46);color:#f8fbff;border-top:0}.word-layout-tech .word-kicker,.word-layout-tech .word-source{color:#67e8f9}.word-layout-tech .word-claim{color:#d5e5f3}.word-layout-editorial{background:${bg};box-shadow:inset 0 -16px 0 ${accent}}.word-evidence-rail{position:absolute;right:4%;bottom:8%;width:34%;max-height:38%;display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;z-index:8}.word-evidence-card{min-width:0;min-height:0;margin:0;padding:5px;background:#fff;border:1px solid rgba(21,33,59,.16);border-radius:8px;display:flex;flex-direction:column;align-items:stretch}.word-asset{display:block;width:100%;height:100%;max-height:180px;min-height:48px;object-fit:contain;background:#fff}.word-evidence-card figcaption{font-size:10px;line-height:1.2;color:#4d5c72;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-top:3px}.word-source{position:absolute;left:92px;bottom:34px;font-size:14px;color:#61708d}</style></head><body><main class="deck-stage">${slides}</main></body></html>`;
}

async function generateLocalWordConverter() {
  const stylePack = window.PptStyleRegistry?.stylePackFor?.(state.selectedStyle, state.customStyles) || null;
  window.PptAiProgress?.resetProgress?.(); state.activeStep = 1; renderSteps();
  const model = await convertWordToMarkdown(state.selectedFile, (progress) => updatePptxWorkerProgress(progress, "local"));
  state.wordDocument = model; state.wordOutline = { version: "WordOutlineV1", slides: model.outline };
  const html = buildWordLocalHtml(model, stylePack);
  const localOutline = model.outline.length ? model.outline : [{ title: "Word 文档摘要", coreClaim: "已提取文档内容，可继续编辑。", body: String(model.markdown || "").split(/\r?\n/).map((line) => line.trim()).filter(Boolean).slice(0, 8) }];
  const result = { html, slides: localOutline.map((slide, index) => ({ page: index + 1, text: [slide.title, slide.coreClaim, ...(slide.body || [])].join(" "), imageCount: 0 })), stats: { ...model.stats, slideCount: localOutline.length, imageCount: model.assets.length } };
  showWordOutlineStage(model, false);
  const job = makeBrowserConverterJob(result, "local", { mode: "local", used: false, browserExtracted: true, generationMode: "word_markdown_local", parser: model.stats.parser, stylePackId: stylePack?.id || "source" });
  state.activeStep = stepKeys.length - 1; renderSteps(); await storeGeneratedConverterJob(job, "word_markdown_local");
}

async function generateAiWordConverter() {
  const stylePack = window.PptStyleRegistry?.stylePackFor?.(state.selectedStyle, state.customStyles) || null;
  const integration = integrationForGeneration();
  if (integration.mode === "local") throw new Error("AI 模式需要先配置可用的 AI 服务。");
  window.PptAiProgress?.resetProgress?.(); state.activeStep = 1; renderSteps();
  const model = await convertWordToMarkdown(state.selectedFile, (progress) => updatePptxWorkerProgress(progress, "local"));
  let summarized;
  try {
    summarized = await generateWordV3Outline(model, stylePack, integration);
  } catch (error) {
    // Keep a deterministic, source-grounded outline available when the provider
    // is temporarily unavailable. The UI marks this as local recovery instead
    // of pretending that an AI summary was completed.
    summarized = { ...model, wordV3: { summaryFallback: true, error: String(error?.message || error), designSpec: wordV3DesignSpec(stylePack) } };
    setStatus(`AI 摘要暂时不可用，已生成可编辑本地大纲：${error?.message || "unknown error"}`, "warning");
  }
  state.wordDocument = summarized;
  state.wordOutline = { version: "WordDeckOutlineV3", slides: summarized.outline || [] };
  state.wordDesignSpec = summarized.wordV3?.designSpec || wordV3DesignSpec(stylePack);
  showWordOutlineStage(summarized, true);
  state.activeStep = Math.min(stepKeys.length - 2, 2); renderSteps();
  setStatus(summarized.wordV3?.summaryFallback ? "已生成本地可编辑大纲，请检查后继续。" : "AI 已完成 Word 总结，请编辑并确认大纲后继续。", summarized.wordV3?.summaryFallback ? "warning" : "ok");
}

async function renderAiWordFromConfirmedOutline() {
  const stylePack = window.PptStyleRegistry?.stylePackFor?.(state.selectedStyle, state.customStyles) || null;
  const integration = integrationForGeneration();
  const model = state.wordDocument;
  const confirmedSlides = Array.isArray(state.wordOutline?.slides) ? state.wordOutline.slides : [];
  if (!model || !confirmedSlides.length) throw new Error("请先生成并确认 Word 汇报大纲。");
  const slides = confirmedSlides.map((slide, index) => ({
    page: index + 1,
    pageId: slide.pageId || `word-page-${index + 1}`,
    title: slide.title,
    takeaway: slide.coreClaim,
    points: slide.body,
    layout: slide.layout || (index === 0 ? "cover" : "title-and-body"),
    visualFocus: slide.layout || "Word summary",
    sourceBlockIds: slide.sourceBlockIds || [],
    imageIds: slide.imageIds || [],
    imageCount: (slide.imageIds || []).length,
  }));
  const designSpec = state.wordDesignSpec || wordV3DesignSpec(stylePack);
  const manifest = model.assets.map(({ id, alt }, index) => `${id}: ${alt || `Word image ${index + 1}`}`).join("\n");
  const outlineText = wordV3OutlineMarkdown({ title: state.selectedFile.name.replace(/\.docx$/i, ""), slides: confirmedSlides });
  const sourceBrief = [
    `将 DOCX《${state.selectedFile.name}》转换为可编辑 HTML 汇报。`,
    "以下是经过 AI 总结并由用户确认的页面大纲。请严格保留页面顺序、事实、数字和来源引用，不要逐段抄录 Word 原文。",
    `统一 DesignSpec（所有窗口必须复用，不得另造 CSS）：${JSON.stringify(designSpec)}`,
    `原始图片资产只能通过 imageIds 放入明确的视觉槽位，不能重绘或编造：\n${manifest || "（无图片）"}`,
    `已确认 Markdown 大纲：\n${outlineText}`,
  ].join("\n\n");
  const wordImages = model.assets.map(({ id, src, alt }) => ({ id, alt, ...(String(src || "").length <= 260000 ? { src } : {}) }));
  const data = await (window.PptAiProgress.runWord || window.PptAiProgress.run)({
    filename: state.selectedFile.name,
    slides,
    style: state.selectedStyle,
    stylePack,
    designSpec,
    integration,
    source: "word-converter",
    mode: "converter",
    sourceBrief,
    outlineText,
    topicPlan: { title: state.selectedFile.name.replace(/\.docx$/i, ""), slides },
    referencePack: { ...(window.PptReferencePack?.apiPayload?.(state.referencePack) || {}), outlineText, images: wordImages },
  });
  if (!data?.job) throw new Error("AI 未返回可用的 Word 汇报结果。");
  const rawJob = { ...data.job };
  let generatedHtml = rawJob.inlinePreviewHtml || rawJob.inlinePreviewHtmlCache || "";
  if (!generatedHtml && rawJob.previewUrl) {
    try { generatedHtml = await fetchTextIfAvailable(rawJob.previewUrl); } catch { generatedHtml = ""; }
  }
  // A provider can finish a window with no parseable HTML (or return a
  // Cloudflare error document).  The Word source and outline are already
  // available locally, so use the selected style's deterministic renderer as
  // a non-blocking recovery page set instead of discarding the whole result.
  if (!wordHtmlHasUsableSlides(generatedHtml)) {
    generatedHtml = buildWordLocalHtml(model, stylePack);
    rawJob.wordRecovery = "local-style-render-after-empty-or-invalid-ai-window";
  }
  // HTML Anything only receives image metadata/slots. Materialize the original DOCX
  // images here so charts and data figures survive AI layout without being redrawn.
  rawJob.inlinePreviewHtml = injectWordImagesIntoHtml(generatedHtml, model);
  delete rawJob.inlinePreviewHtmlCache;
  const job = { ...rawJob, fileName: state.selectedFile.name, slides: Number(rawJob.slides || slides.length), wordAssetManifest: model.assets.map(({ id, alt }) => ({ id, alt })), aiStatus: { ...(rawJob.aiStatus || {}), used: true, browserExtracted: true, generationMode: "word_v3_summary_designspec", parser: model.stats.parser, sourceLanguageLocked: true, markdownChars: model.markdown.length, sourceImageCount: model.assets.length, materializedSourceImages: model.assets.length, summaryFallback: Boolean(model.wordV3?.summaryFallback), designSpecVersion: designSpec.version } };
  state.activeStep = stepKeys.length - 1; renderSteps(); await storeGeneratedConverterJob(job, "word_markdown_ai");
}

function showWordOutlineStage(model, editable = true) {
  const stage = el("wordOutlineStage"); if (!stage) return;
  stage.classList.remove("hidden");
  const details = el("wordOutlineDetails");
  if (details) { details.open = false; if (editable) details.open = true; }
  if (el("wordOutlineStatus")) el("wordOutlineStatus").textContent = editable ? "大纲已总结，可编辑并确认" : "已从 Word 生成 Markdown 与本地大纲";
  if (el("wordMarkdownPreview")) el("wordMarkdownPreview").value = model.markdown || "";
  state.wordOutline = { version: model.wordV3 ? "WordDeckOutlineV3" : "WordOutlineV1", slides: model.outline || [] };
  const target = el("wordOutlineCards"); if (!target) return;
  target.innerHTML = (model.outline || []).map((slide, index) => `<article class="pdf-research-outline-card" data-word-outline-index="${index}"><div class="pdf-research-outline-card-head"><span class="pdf-research-page">${String(index + 1).padStart(2, "0")}</span><span class="pdf-research-role">${escapeHtml(slide.role || "content")}</span></div><input data-word-title value="${escapeHtml(slide.title || "")}" aria-label="页面标题"><textarea data-word-claim aria-label="核心论点">${escapeHtml(slide.coreClaim || "")}</textarea><textarea data-word-body aria-label="页面要点">${escapeHtml((slide.body || []).join("\n"))}</textarea></article>`).join("");
  const button = el("wordOutlineContinueButton"); if (button) {
    button.hidden = !editable;
    button.disabled = false;
    button.textContent = editable ? "确认大纲并生成 HTML" : "应用修改并生成 HTML";
    button.onclick = async () => {
      if (button.disabled) return;
      state.wordOutline.slides = [...document.querySelectorAll("#wordOutlineCards [data-word-outline-index]")].map((card, i) => ({
        ...state.wordOutline.slides[i],
        page: i + 1,
        pageId: state.wordOutline.slides[i]?.pageId || `word-page-${i + 1}`,
        title: card.querySelector("[data-word-title]")?.value.trim() || `第 ${i + 1} 页`,
        coreClaim: card.querySelector("[data-word-claim]")?.value.trim() || "",
        body: String(card.querySelector("[data-word-body]")?.value || "").split(/\r?\n/).map((x) => x.trim()).filter(Boolean),
      }));
      state.wordDocument.outline = state.wordOutline.slides;
      state.wordDocument.markdown = wordV3OutlineMarkdown({ title: state.selectedFile.name.replace(/\.docx$/i, ""), slides: state.wordOutline.slides });
      button.disabled = true;
      try {
        setStatus("已确认大纲，正在生成统一风格 HTML…");
        await renderAiWordFromConfirmedOutline();
      } catch (error) {
        button.disabled = false;
        setStatus(error.message || "Word HTML generation failed.", "error");
      }
    };
  }
}

async function generateLocalConverter() {
  if (isWordFile()) return generateLocalWordConverter();
  const visibleSince = Date.now();
  window.PptAiProgress?.resetProgress?.();
  updatePptxWorkerProgress({ percent: 1, phase: "unzip", page: 0, totalPages: 0 }, "local");
  state.activeStep = 1;
  renderSteps();
  const stylePack = window.PptStyleRegistry?.stylePackFor?.(state.selectedStyle, state.customStyles) || null;
  const result = await runPptxLocalWorker(state.selectedFile, (progress) => updatePptxWorkerProgress(progress, "local"), stylePack);
  const job = makeBrowserConverterJob(result, "local", {
    mode: "local",
    used: false,
    browserExtracted: true,
    browserWorker: true,
    generationMode: "local_rules",
    parser: result.stats.parser,
    conversionMs: result.stats.conversionMs,
    stylePackId: stylePack?.id || "source",
    preservesSourceStyle: Boolean(stylePack?.preserveSource),
  });
  const remainingOverlayTime = 550 - (Date.now() - visibleSince);
  if (remainingOverlayTime > 0) await new Promise((resolve) => window.setTimeout(resolve, remainingOverlayTime));
  state.activeStep = stepKeys.length - 1;
  renderSteps();
  await storeGeneratedConverterJob(job, "local_rules");
}

async function runPdfImport(stylePack, onProgress, options = {}) {
  if (!window.PdfImportCoreV2) throw new Error("PDF import runtime did not load.");
  const started = Date.now();
  const result = await window.PdfImportCoreV2.convertPdf(state.selectedFile, { preserveSource: Boolean(stylePack?.preserveSource), onProgress });
  // AI PDF research renders from its source-locked plan later. Rendering the
  // intermediate extracted deck here blocks the main thread and then gets
  // discarded, which made the UI appear frozen at the 30% parse milestone.
  if (options.renderPreview !== false) {
    result.html = window.PptxLocalCore.renderDeck(result.deck, [], stylePack);
  }
  result.stats.conversionMs = Date.now() - started;
  return result;
}

async function generateLocalPdfConverter() {
  const stylePack = window.PptStyleRegistry?.stylePackFor?.(state.selectedStyle, state.customStyles) || null;
  window.PptAiProgress?.resetProgress?.();
  updatePptxWorkerProgress({ percent: 1, phase: "pdf", page: 0, totalPages: 0 }, "local");
  state.activeStep = 1; renderSteps();
  const result = await runPdfImport(stylePack, (progress) => updatePptxWorkerProgress(progress, "local"));
  const job = makeBrowserConverterJob(result, "local", { mode: "local", used: false, browserExtracted: true, generationMode: "local_pdf_import", parser: result.stats.parser, stylePackId: stylePack?.id || "source", preservesSourceStyle: Boolean(stylePack?.preserveSource), sourcePages: result.sourcePages.length });
  state.activeStep = stepKeys.length - 1; renderSteps();
  await storeGeneratedConverterJob(job, "local_pdf_import");
}

async function readPdfPlanStream(payload) {
  await ensurePlatformRoute("/api/pdf-presentation/v2/plan/stream");
  const response = await fetch(apiUrl("/api/pdf-presentation/v2/plan/stream"), { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
  if (!response.ok) throw new Error((await response.text()) || "PDF AI presentation planning failed.");
  const reader = response.body?.getReader();
  if (!reader) throw new Error("PDF AI presentation endpoint did not return a stream.");
  const decoder = new TextDecoder(); let buffer = ""; let plan = null;
  const handleRecord = (record) => {
    const event = record.match(/^event:\s*(.+)$/m)?.[1]?.trim() || "message";
    const raw = record.split(/\r?\n/).filter((line) => /^data\s*:/.test(line)).map((line) => line.replace(/^data\s*:\s?/, "")).join("\n").trim();
    if (!raw) return;
    let data; try { data = JSON.parse(raw); } catch { if (event === "error" || event === "complete") throw new Error("PDF AI returned malformed event data."); return; }
    if (["accepted", "parse_ready", "reading_matrix_ready", "evidence_mapped", "page_plan_ready", "quality_check"].includes(event)) {
      window.PptAiProgress?.updateProgress?.({ percent: Number(data.progress || 0), phase: data.stage || event, message: data.message || `PDF academic stage: ${event}`, completedPages: Number(data.completedPages || 0), totalPages: Number(data.pageCount || payload.source?.pages?.length || 0) });
    }
    if (event === "complete") plan = data.plan;
    if (event === "error") throw new Error(data.message || "PDF AI presentation planning failed.");
  };
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const records = buffer.split(/\r?\n\r?\n/); buffer = records.pop() || "";
    records.forEach(handleRecord);
  }
  buffer += decoder.decode();
  if (buffer.trim()) handleRecord(buffer);
  if (!plan) throw new Error("PDF AI did not return an academic presentation plan.");
  return plan;
}

async function readPdfResearchStream(endpoint, payload, options = {}) {
  await ensurePlatformRoute(endpoint);
  const response = await fetch(apiUrl(endpoint), { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
  if (!response.ok) throw new Error((await response.text()) || `PDF research request failed (${response.status}).`);
  const reader = response.body?.getReader();
  if (!reader) throw new Error("PDF research endpoint did not return a stream.");
  const decoder = new TextDecoder(); let buffer = ""; let complete = null;
  const totalPagesFromSource = Number(payload.source?.pages?.length || 0);
  let completedPages = Math.max(0, Number(options.initialCompletedPages || 0));
  let lastEvent = "";
  const handleRecord = (record) => {
    const event = record.match(/^event:\s*(.+)$/m)?.[1]?.trim() || "message";
    const raw = record.split(/\r?\n/).filter((line) => /^data\s*:/.test(line)).map((line) => line.replace(/^data\s*:\s?/, "")).join("\n").trim();
    if (!raw) return;
    let data; try { data = JSON.parse(raw); } catch { if (event === "error" || event === "complete") throw new Error("PDF research returned malformed event data."); return; }
    const stage = options.stageLabel || "PDF research";
    lastEvent = event;
    if (Number.isFinite(Number(data.completedPages))) completedPages = Math.max(completedPages, Number(data.completedPages));
    if (["accepted", "markdown_ready", "outline_started", "outline_ready", "composition_started", "composition_ready", "quality_check"].includes(event)) {
      window.PptAiProgress?.updateProgress?.({ percent: Number(data.progress || 0), phase: event, message: data.message || `${stage}: ${event}`, completedPages, totalPages: Number(data.pageCount || totalPagesFromSource) });
    }
    if (event === "complete") complete = data;
    if (event === "error") throw new Error(data.message || `${stage} failed.`);
    options.onEvent?.(event, data);
  };
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const records = buffer.split(/\r?\n\r?\n/); buffer = records.pop() || "";
    records.forEach(handleRecord);
  }
  buffer += decoder.decode(); if (buffer.trim()) handleRecord(buffer);
  if (!complete) {
    const suffix = lastEvent === "quality_check" ? "（质量检查已完成，但未收到最终完成事件；已保留解析结果，请重新执行此阶段。）" : "";
    throw new Error(`${options.stageLabel || "PDF research"} did not return a complete result.${suffix}`);
  }
  return complete;
}

function showPdfResearchStage() {
  const stage = el("pdfResearchStage");
  if (!stage) return;
  stage.classList.remove("hidden");
  const status = el("pdfResearchStatus");
  if (status) status.textContent = "正在阅读 PDF，生成来源 Markdown 与图表清单…";
  const markdown = el("pdfResearchMarkdown"); if (markdown) markdown.value = "";
  const outline = el("pdfResearchOutline"); if (outline) outline.value = "";
  const outlineCards = el("pdfResearchOutlineCards"); if (outlineCards) outlineCards.innerHTML = "<p class=\"pdf-research-empty\">等待 AI 大纲…</p>";
  const assets = el("pdfResearchAssets"); if (assets) assets.textContent = "等待解析图表…";
  const continueButton = el("pdfResearchContinueButton"); if (continueButton) continueButton.hidden = true;
  state.pdfResearchOutline = null;
}

function renderPdfResearchOutline(outline) {
  const target = el("pdfResearchOutlineCards");
  if (!target) return;
  const slides = Array.isArray(outline?.slides) ? outline.slides : Array.isArray(outline) ? outline : [];
  state.pdfResearchOutline = { ...(outline && !Array.isArray(outline) ? outline : {}), slides: slides.map((slide, index) => ({
    ...slide,
    page: index + 1,
    body: Array.isArray(slide.body) ? slide.body.slice(0, 6) : [],
    sourceRefs: Array.isArray(slide.sourceRefs) ? slide.sourceRefs.slice(0, 8) : [],
    evidence: Array.isArray(slide.evidence) ? slide.evidence.slice(0, 4) : [],
    evidenceIds: Array.isArray(slide.evidenceIds) ? slide.evidenceIds.slice(0, 4) : [],
  })) };
  target.innerHTML = slides.length
    ? slides.map((slide, index) => {
      const role = String(slide.layoutFamily || slide.role || (index === 0 ? "cover" : "evidence"));
      const body = (Array.isArray(slide.body) ? slide.body : Array.isArray(slide.points) ? slide.points : []).filter(Boolean).slice(0, 4);
      const refs = (Array.isArray(slide.sourceRefs) ? slide.sourceRefs : []).filter(Boolean).slice(0, 6);
      const evidence = (Array.isArray(slide.evidence) ? slide.evidence : Array.isArray(slide.evidenceIds) ? slide.evidenceIds : []).map((item) => typeof item === "string" ? item : item?.id).filter(Boolean).slice(0, 4);
      return `<article class="pdf-research-outline-card" data-outline-index="${index}"><div class="pdf-research-outline-card-head"><span class="pdf-research-page">${String(index + 1).padStart(2, "0")}</span><span class="pdf-research-role">${escapeHtml(role)}</span></div><input data-outline-title value="${escapeHtml(slide.title || `第 ${index + 1} 页`)}" aria-label="页面标题"><textarea data-outline-claim aria-label="核心论点" placeholder="核心论点">${escapeHtml(slide.coreClaim || slide.claim || slide.summary || "")}</textarea><textarea class="pdf-research-body-editor" data-outline-body aria-label="页面要点" placeholder="每行一个要点">${escapeHtml(body.join("\n"))}</textarea><div class="pdf-research-chip-row">${refs.map((ref) => `<span class="pdf-research-chip source">${escapeHtml(ref)}</span>`).join("")}${evidence.map((id) => `<span class="pdf-research-chip evidence">${escapeHtml(id)}</span>`).join("")}</div></article>`;
    }).join("")
    : "<p class=\"pdf-research-empty\">AI 未返回可用的大纲页。</p>";
  const button = el("pdfResearchContinueButton"); if (button) button.hidden = !slides.length;
}

function readEditablePdfResearchOutline() {
  const base = state.pdfResearchOutline || { version: "PdfResearchOutlineV4", slides: [] };
  const cards = [...document.querySelectorAll("#pdfResearchOutlineCards [data-outline-index]")];
  const slides = cards.map((card, index) => {
    const original = base.slides?.[index] || {};
    const title = card.querySelector("[data-outline-title]")?.value?.trim() || original.title || `第 ${index + 1} 页`;
    const coreClaim = card.querySelector("[data-outline-claim]")?.value?.trim() || original.coreClaim || "";
    const body = String(card.querySelector("[data-outline-body]")?.value || "").split(/\r?\n/).map((line) => line.trim()).filter(Boolean).slice(0, 6);
    return { ...original, page: index + 1, title, coreClaim, body };
  });
  return { ...base, version: "PdfResearchOutlineV4", slides };
}

function waitForPdfResearchOutlineConfirmation() {
  const button = el("pdfResearchContinueButton");
  if (!button) return Promise.resolve(readEditablePdfResearchOutline());
  return new Promise((resolve) => {
    const handler = () => { button.removeEventListener("click", handler); button.disabled = true; resolve(readEditablePdfResearchOutline()); };
    button.disabled = false; button.hidden = false; button.addEventListener("click", handler, { once: true });
  });
}

function renderPdfResearchAssets(items) {
  const target = el("pdfResearchAssets");
  if (!target) return;
  const assets = Array.isArray(items) ? items : [];
  target.innerHTML = assets.length
    ? assets.map((item) => `<article class="pdf-research-asset"><div class="pdf-research-asset-head"><code>${escapeHtml(item.id)}</code><span>p.${Number(item.page) || "?"}</span></div><strong>${escapeHtml(item.caption || item.kind || "evidence")}</strong><small>${escapeHtml(item.type || item.kind || "原始证据")}</small></article>`).join("")
    : "未识别到可验证图表；将生成文本型学术汇报，不会伪造图表。";
}

async function generateAiPdfConverter() {
  // PDF research uses the bundled academic-defense style by default. PPT and
  // the quick/chat generators keep their existing source style untouched.
  const pdfStyle = state.selectedStyle === "source" ? "academic-defense-blue" : state.selectedStyle;
  const stylePack = window.PptStyleRegistry?.stylePackFor?.(pdfStyle, state.customStyles) || null;
  const integration = integrationForGeneration(); if (integration.mode === "local") throw new Error("AI mode requires a valid AI configuration.");
  window.PptAiProgress?.resetProgress?.(); state.activeStep = 1; renderSteps();
  showPdfResearchStage();
  const result = await runPdfImport(stylePack, (progress) => updatePptxWorkerProgress({ ...progress, percent: Math.max(1, Math.round(progress.percent * .30)) }, "ai"), { renderPreview: false });
  const paper = result.paper || { version: "PaperSourceDocumentV1", sourceFile: state.selectedFile.name, title: result.sourcePages[0]?.title || state.selectedFile.name, pages: result.sourcePages.map(({ page, title, section, text }) => ({ page, title, section, text })), figures: [], tables: [], text: result.sourcePages.map((page) => page.text).join("\n") };
  const source = {
    ...paper,
    figures: (paper.figures || []).map(({ assetRef, thumbnail, ...figure }) => ({ ...figure, assetRef: assetRef ? `asset://pdf/${figure.id}` : `asset://pdf/page-${figure.page}` })),
    // Keep the Worker payload source-locked but small: high-resolution table
    // crops stay in the browser/asset store and are referenced by id.
    tables: (paper.tables || []).map(({ assetRef, thumbnail, ...table }) => ({
      ...table,
      assetRef: assetRef ? `asset://pdf/${table.id}` : undefined,
    })),
  };
  const researchBundle = window.PdfResearchCoreV3?.buildBundle?.(paper);
  if (!researchBundle) throw new Error("PDF research parser did not initialize.");
  const researchStatus = el("pdfResearchStatus");
  if (researchStatus) researchStatus.textContent = "已完成来源解析，正在请求 AI 生成研究大纲…";
  const outlineResult = await readPdfResearchStream("/api/pdf-research/v5/outline/stream", {
    filename: state.selectedFile.name,
    source,
    researchMarkdown: researchBundle.markdown,
    style: pdfStyle,
    integration,
  }, {
    stageLabel: "PDF 研究大纲",
    initialCompletedPages: source.pages.length,
    onEvent: (event, data) => {
      if (event === "complete") {
        if (el("pdfResearchMarkdown")) el("pdfResearchMarkdown").value = data.researchMarkdown || researchBundle.markdown;
        const outlineValue = data.outline?.outline || data.outline || [];
        if (el("pdfResearchOutline")) el("pdfResearchOutline").value = JSON.stringify(outlineValue, null, 2);
        renderPdfResearchOutline(outlineValue);
        renderPdfResearchAssets(data.assets || researchBundle.assets);
        if (researchStatus) researchStatus.textContent = "大纲已完成。请检查并修改页面内容，然后点击“应用修改并生成 HTML”。";
        // The outline is an explicit user-confirmation checkpoint. Do not
        // keep the generation modal over the editable outline while waiting
        // for the user's click.
        setGenerationOverlay(false);
      }
    },
  });
  const editableOutline = await waitForPdfResearchOutlineConfirmation();
  // Start a fresh progress phase only after the user confirms the editable
  // outline, so the modal never blocks that confirmation step.
  state.generationOverlayDismissed = false;
  window.PptAiProgress?.resetProgress?.();
  window.PptAiProgress?.updateProgress?.({ percent: 1, phase: "outline_confirmed", message: "大纲已确认，正在按来源证据排版…", completedPages: 0, totalPages: editableOutline.slides?.length || 0, title: "正在生成 HTML 演示" });
  setGenerationOverlay(true);
  if (el("pdfResearchOutline")) el("pdfResearchOutline").value = JSON.stringify(editableOutline, null, 2);
  if (researchStatus) researchStatus.textContent = "正在按修改后的大纲分配证据并智能排版…";
  const deckResult = await readPdfResearchStream("/api/pdf-research/v5/deck/stream", {
    filename: state.selectedFile.name,
    source,
    researchMarkdown: researchBundle.markdown,
    outline: editableOutline,
    style: pdfStyle,
    stylePack,
    integration,
  }, { stageLabel: "PDF 学术页面构图" });
  const plan = deckResult.plan;
  if (!window.PdfImportCoreV2?.renderAcademicDeckV2) throw new Error("PDF academic narrative renderer is unavailable.");
  result.html = window.PdfImportCoreV2.renderAcademicDeckV2(plan, paper, { style: pdfStyle, stylePack });
  result.pdfResearchPlan = plan;
  result.paper = paper;
  result.slides = (plan.slides || []).map((slide, index) => ({ page: index + 1, sourcePages: slide.sourceRefs || [], text: [slide.title, slide.coreClaim, ...(slide.body || [])].filter(Boolean).join(" "), shapeCount: 1, imageCount: (slide.evidence || []).length }));
  result.stats.slideCount = result.slides.length;
  result.stats.imageCount = result.slides.reduce((count, slide) => count + Number(slide.imageCount || 0), 0);
  if (researchStatus) researchStatus.textContent = `已完成 ${result.slides.length} 页 AI 学术汇报，已使用 ${result.stats.imageCount || 0} 个原始证据资产。`;
  const job = makeBrowserConverterJob(result, "ai", { mode: integration.mode, provider: integration.endpoint, used: true, browserExtracted: true, deterministicRenderer: true, generationMode: "ai_pdf_research_v5", parser: result.stats.parser, patchCount: 0, sourcePages: (source.pages || []).length, protocol: "pdf-research-v5", researchMarkdown: researchBundle.markdown, researchOutline: editableOutline, stylePackId: stylePack?.id || pdfStyle }, "pdf-research-lock");
  state.activeStep = stepKeys.length - 1; renderSteps(); await storeGeneratedConverterJob(job, "ai_pdf_academic_v2");
}

async function generateAiConverter() {
  if (isWordFile()) return generateAiWordConverter();
  window.PptAiProgress?.resetProgress?.();
  window.PptAiProgress?.updateProgress?.({
    percent: 1,
    title: state.language === "zh" ? "AI 正在优化排版" : "AI is optimizing slide layouts",
    phase: state.language === "zh" ? "本地还原 PPT" : "Restoring PPT locally",
    message: state.language === "zh" ? "先在浏览器中完整还原原始课件..." : "First restoring the original deck in this browser...",
    completedPages: 0,
    totalPages: 0,
  });
  state.activeStep = 1;
  renderSteps();
  const stylePack = window.PptStyleRegistry?.stylePackFor?.(state.selectedStyle, state.customStyles) || null;
  const integration = integrationForGeneration();
  if (integration.mode === "local") throw new Error("AI mode requires a valid AI configuration.");
  const result = await runPptxLocalWorker(state.selectedFile, (progress) => updatePptxWorkerProgress({ ...progress, percent: Math.max(1, Math.round(Number(progress.percent || 0) * 0.35)) }, "ai"), stylePack);
  window.PptAiProgress?.updateProgress?.({
    percent: 38,
    title: state.language === "zh" ? "AI 正在优化排版" : "AI is optimizing slide layouts",
    phase: state.language === "zh" ? "分析页面角色" : "Analyzing slide roles",
    message: state.language === "zh" ? `已还原 ${result.stats.slideCount} 页，AI 正在逐页选择安全优化版式。` : `${result.stats.slideCount} slides restored. AI is selecting a safe layout for each page.`,
    completedPages: 0,
    totalPages: result.stats.slideCount,
  });
  await saveIntegration(false, false);
  await ensurePlatformRoute("/api/ppt-ai-enhance");
  const response = await fetch(apiUrl("/api/ppt-ai-enhance"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      filename: state.selectedFile.name,
      slides: result.slides,
      theme: result.deck.theme,
      style: state.selectedStyle,
      stylePack,
      customStyle: activeCustomStyle(),
      integration,
      referencePack: window.PptReferencePack?.apiPayload?.(state.referencePack) || null,
    }),
  });
  const enhancement = await readJsonResponse(response, state.language === "zh" ? "AI 排版优化失败" : "AI layout optimization failed");
  let layoutPatches = ensureAiLayoutPatches(enhancement.patches || [], result.slides);
  const sourceHtml = result.html;
  const repairedPages = [];
  window.PptAiProgress?.updateProgress?.({ percent: 82, phase: state.language === "zh" ? "应用安全补丁" : "Applying safe patches", message: state.language === "zh" ? "正在用确定性渲染器应用并复核补丁..." : "Applying and validating patches with the deterministic renderer...", completedPages: 0, totalPages: result.stats.slideCount });
  const makeAiStatus = (extra = {}) => ({
    mode: integration.mode,
    provider: integration.endpoint,
    used: !enhancement.degraded || (enhancement.patches || []).length > 0,
    fallback: Boolean(enhancement.degraded || repairedPages.length || extra.fallback),
    resultType: stylePack?.preserveSource ? "source_style_optimized_layout" : "target_style_optimized_layout",
    browserExtracted: true,
    deterministicRenderer: true,
    patchCount: layoutPatches.length,
    protocol: enhancement.protocol || "ppt-layout-optimization-v3",
    stylePackId: stylePack?.id || "source",
    preservesSourceStyle: Boolean(stylePack?.preserveSource),
    layoutOptimized: !extra.fullLocalFallback,
    repairedPages: [...repairedPages],
    warnings: enhancement.warnings || [],
    ...extra,
  });
  let job = null;
  const maxPageRepairs = Math.min(12, result.stats.slideCount);
  for (let attempt = 0; attempt <= maxPageRepairs; attempt += 1) {
    result.html = await renderPptxDeckWithPatches(result.deck, layoutPatches, stylePack);
    try {
      job = makeBrowserConverterJob(result, "ai", makeAiStatus());
      break;
    } catch (error) {
      const page = contentLockFailurePage(error, result.stats.slideCount);
      if (!page || repairedPages.includes(page) || repairedPages.length >= maxPageRepairs) {
        result.html = sourceHtml;
        try {
          job = makeBrowserConverterJob(result, "ai", makeAiStatus({ fallback: true, fullLocalFallback: true, fallbackReason: String(error?.message || error) }));
        } catch {
          job = makeBrowserConverterJob(result, "local", makeAiStatus({ fallback: true, fullLocalFallback: true, fallbackReason: String(error?.message || error) }));
        }
        break;
      }
      repairedPages.push(page);
      layoutPatches = restoreSourceLayoutForPage(layoutPatches, page);
    }
  }
  if (!job) {
    result.html = sourceHtml;
    job = makeBrowserConverterJob(result, "local", makeAiStatus({ fallback: true, fullLocalFallback: true, fallbackReason: "AI layout validation did not converge." }));
  }
  window.PptAiProgress?.updateProgress?.({
    percent: 100,
    phase: state.language === "zh" ? "已完成" : "Completed",
    message: state.language === "zh" ? "逐页内容、页面数量和溢出状态已复核，预览已准备好。" : "Page content, slide count and overflow checks passed. Preview is ready.",
    completedPages: result.stats.slideCount,
    totalPages: result.stats.slideCount,
  });
  state.activeStep = stepKeys.length - 1;
  renderSteps();
  await storeGeneratedConverterJob(job, "ai_layout_optimized");
}

async function generate() {
  if (state.busy) return;
  if (!state.selectedFile) {
    setStatus(t("uploadFirst"), "error");
    return;
  }
  if (!enforceUploadLimit(state.selectedFile)) return;
  state.busy = true;
  state.generationOverlayDismissed = false;
  el("runButton").disabled = true;
  try {
    if (isAiConverterMode()) await generateAiConverter();
    else await generateLocalConverter();
  } catch (error) {
    setStatus(error.message, "error");
  } finally {
    state.busy = false;
    el("runButton").disabled = false;
    setGenerationOverlay(false);
    renderSteps();
  }
}

async function loadJobs() {
  const response = await fetch(apiUrl("/api/jobs?source=converter"));
  const data = await readJsonResponse(response, state.language === "zh" ? "\u65e0\u6cd5\u52a0\u8f7d\u4efb\u52a1" : "Could not load jobs");
  state.jobs = (data.jobs || []).map(hydrateInlineJob).filter(isConverterHistoryJob);
  if (state.activeJob && !state.jobs.some((job) => job.id === state.activeJob.id)) {
    state.activeJob = null;
  }
  renderJobs();
  renderJobSelect();
  if (!state.activeJob && state.jobs.length) selectJob(state.jobs[0].id);
}

function isConverterHistoryJob(job) {
  const fileName = String(job?.fileName || "").toLowerCase();
  const status = job?.aiStatus || {};
  if (status.topicGenerated || job?.topicPlan) return false;
  if (fileName.endsWith(".ppt") || fileName.endsWith(".pptx") || fileName.endsWith(".docx")) return true;
  if (status.browserExtracted || String(job?.id || "").startsWith("LOCAL-")) return true;
  return false;
}

function renderJobs() {
  const cards = state.jobs.map((job) => {
    const mode = job.aiStatus?.used
      ? (job.aiStatus?.resultType === "html" ? "AI HTML" : t("aiSlides"))
      : job.aiStatus?.fallback
        ? t("fallback")
        : t("local");
    const previewSrc = job.previewUrl || "";
    return `
      <article class="job-card ${state.activeJob?.id === job.id ? "active" : ""}">
        <button class="job-thumb" type="button" data-preview="${job.id}" aria-label="${t("preview")} ${escapeHtml(job.fileName)}">
          ${previewSrc ? `<iframe src="${previewSrc}" title="${escapeHtml(job.fileName)} thumbnail" loading="lazy"></iframe>` : `<span>${escapeHtml(styleLabel(job.style, job.style))}</span>`}
        </button>
        <div class="job-card-body">
          <div class="job-card-title">
            <strong>${escapeHtml(job.fileName)}</strong>
            <span>${escapeHtml(styleLabel(job.style, job.style))}</span>
          </div>
          <div class="job-meta">
            <span>${t("jobsSlides", { count: job.slides })}</span>
            <span>${mode}</span>
            <span>${escapeHtml(job.status || "")}</span>
          </div>
          <div class="job-card-actions">
            <button type="button" data-preview="${job.id}">${t("preview")}</button>
            <button type="button" data-download="${job.id}">${t("downloadZip")}</button>
            <button type="button" data-share="${job.id}">${t("analyzeShare")}</button>
          </div>
        </div>
      </article>`;
  }).join("");
  const cardRoot = el("jobCards");
  if (cardRoot) cardRoot.innerHTML = cards || `<div class="empty-job-card">${t("noJobs")}</div>`;
  const rows = state.jobs.map((job) => `
    <tr>
      <td>${job.id}</td>
      <td>${escapeHtml(job.fileName)}</td>
      <td>${job.slides}</td>
      <td>${job.style}</td>
      <td><span class="status-dot"></span>${job.status}</td>
      <td>${renderAiBadge(job)}</td>
      <td>${job.updatedAt}</td>
      <td>
        <button type="button" data-preview="${job.id}">${t("preview")}</button>
        <button type="button" data-download="${job.id}">${t("downloadZip")}</button>
        <button type="button" data-share="${job.id}">${t("analyzeShare")}</button>
      </td>
    </tr>
  `).join("");
  el("jobRows").innerHTML = rows || `<tr><td colspan="8" class="empty-row">${t("noJobs")}</td></tr>`;
  document.querySelectorAll("[data-preview]").forEach((button) => {
    button.addEventListener("click", () => selectJob(button.dataset.preview));
  });
  document.querySelectorAll("[data-download]").forEach((button) => {
    button.addEventListener("click", () => downloadById(button.dataset.download));
  });
  document.querySelectorAll("[data-share]").forEach((button) => {
    button.addEventListener("click", () => analyzeShare(button.dataset.share));
  });
}

function renderJobSelect() {
  el("jobSelect").innerHTML = state.jobs.map((job) => `
    <option value="${job.id}">${job.fileName} (${t("jobsSlides", { count: job.slides })})</option>
  `).join("");
}

function formatAiStatus(job) {
  const status = job?.aiStatus;
  if (!status || status.mode === "local") return "";
  if (status.used) {
    const type = status.resultType === "slides" ? t("aiOptimizedSlides") : t("aiHtml");
    return t("aiUsed", { provider: status.provider || status.mode, type });
  }
  if (status.fallback) {
    return t("aiFallback", { error: status.error || t("externalApiFailed") });
  }
  return t("configured", { mode: status.mode });
}

function renderAiBadge(job) {
  const status = job.aiStatus || {};
  if (!status.mode || status.mode === "local") return `<span class="ai-badge local">${t("local")}</span>`;
  if (status.used) {
    const label = status.resultType === "slides" ? t("aiSlides") : "AI HTML";
    return `<span class="ai-badge used" title="${escapeHtml(status.provider || status.mode)}">${label}</span>`;
  }
  if (status.fallback) {
    return `<span class="ai-badge fallback" title="${escapeHtml(status.error || "")}">${t("fallback")}</span>`;
  }
  return `<span class="ai-badge configured">${escapeHtml(status.mode)}</span>`;
}

function selectJob(jobId) {
  const job = state.jobs.find((item) => item.id === jobId);
  if (!job) return;
  state.activeJob = job;
  state.activeShare = job.share || null;
  el("jobSelect").value = job.id;
  loadPreviewFrame(job);
  el("previewEmpty").classList.add("hidden");
  el("quickFixPanel")?.classList.add("hidden");
  renderShare(job.share || null);
  const aiMessage = formatAiStatus(job);
  if (aiMessage) setStatus(aiMessage, job.aiStatus?.fallback ? "error" : "ok");
  document.querySelectorAll(".job-card").forEach((card) => {
    const trigger = card.querySelector("[data-preview]");
    card.classList.toggle("active", trigger?.dataset.preview === job.id);
  });
  document.body.classList.remove("preview-editor-active");
  document.querySelector(".preview-panel")?.classList.remove("editor-active");
  platformEditorSelected = null;
  updatePreviewEditButton(false);
  syncPreviewScale();
}

function syncPreviewScale() {
  const frame = el("previewFrame");
  const shell = frame?.closest(".preview-frame");
  if (!frame || !shell) return;
  const rect = shell.getBoundingClientRect();
  const scale = Math.min(rect.width / PREVIEW_DESKTOP_WIDTH, rect.height / PREVIEW_DESKTOP_HEIGHT);
  shell.style.setProperty("--preview-scale", String(Math.max(0.1, Math.min(1, scale || 1))));
}

function previewWindow() {
  return el("previewFrame")?.contentWindow || null;
}

function previewDocument() {
  try {
    return el("previewFrame")?.contentDocument || null;
  } catch {
    return null;
  }
}

let platformEditorSelected = null;

function activePreviewSlide(doc = previewDocument()) {
  if (!doc) return null;
  const slides = [...doc.querySelectorAll(".ppt-runtime-slide,.slide,section[data-slide-page],.ai-slide,[data-slide-page]")]
    .filter((node) => !node.closest(".editor-toolbar,.ppt-runtime-nav,.nav,.runtime-controls,.ppt-ve-sidebar,.ppt-ve-inspector"));
  return slides.find((node) => node.classList.contains("ppt-active-slide") || node.classList.contains("active") || getComputedStyle(node).display !== "none") || slides[0] || doc.body;
}

function platformEditorCandidate(target) {
  return target?.closest?.(".media-box,.editable-image-box,figure,.free-textbox,.editable-text,.point-card,h1,h2,h3,h4,p,li,td,th,[contenteditable=true]");
}

function setPlatformEditorSelected(target) {
  const doc = previewDocument();
  doc?.querySelectorAll(".ppt-platform-selected").forEach((node) => node.classList.remove("ppt-platform-selected"));
  platformEditorSelected = target && !target.closest?.(".editor-toolbar,.ppt-ve-sidebar,.ppt-ve-inspector,.ppt-runtime-nav") ? target : null;
  if (platformEditorSelected) platformEditorSelected.classList.add("ppt-platform-selected");
  updatePlatformEditorInspector();
}

function ensurePlatformEditorDock() {
  if (state.workbench) return;
  const panel = document.querySelector(".preview-panel");
  if (!panel || panel.querySelector(".platform-editor-dock")) return;
  const dock = document.createElement("div");
  dock.className = "platform-editor-dock";
  dock.innerHTML = `
    <div class="platform-editor-toolbar">
      <span class="platform-editor-meta">Edit tools</span>
      <select data-platform-font>
        <option value="Arial, sans-serif">Arial</option>
        <option value="Inter, Arial, sans-serif">Inter</option>
        <option value="Georgia, serif">Georgia</option>
        <option value="Times New Roman, serif">Times</option>
        <option value="Verdana, sans-serif">Verdana</option>
        <option value="Microsoft YaHei, sans-serif">Microsoft YaHei</option>
        <option value="Segoe Print, Comic Sans MS, cursive">Hand</option>
      </select>
      <input data-platform-size type="number" min="8" max="160" value="30" title="Font size">
      <input data-platform-color type="color" value="#172554" title="Text color">
      <button type="button" data-platform-align="left">Left</button>
      <button type="button" data-platform-align="center">Center</button>
      <button type="button" data-platform-align="right">Right</button>
      <button type="button" data-platform-bold>B</button>
      <button type="button" data-platform-italic>I</button>
      <button type="button" data-platform-underline>U</button>
      <button type="button" data-platform-text>Text</button>
      <button type="button" data-platform-image>Image</button>
      <input data-platform-image-file type="file" accept="image/*" hidden>
    </div>
    <div class="platform-editor-inspector">
      <span class="platform-editor-meta" data-platform-selected>No element selected</span>
      <input data-platform-x type="number" title="X">
      <input data-platform-y type="number" title="Y">
      <input data-platform-w type="number" title="Width">
      <input data-platform-h type="number" title="Height">
      <button type="button" data-platform-front>Front</button>
      <button type="button" data-platform-back>Back</button>
      <button type="button" data-platform-delete>Delete</button>
    </div>`;
  panel.querySelector(".preview-frame")?.before(dock);
  dock.querySelector("[data-platform-font]").addEventListener("change", (event) => applyPlatformStyle("fontFamily", event.target.value));
  dock.querySelector("[data-platform-size]").addEventListener("change", (event) => applyPlatformStyle("fontSize", `${event.target.value}px`));
  dock.querySelector("[data-platform-color]").addEventListener("input", (event) => applyPlatformStyle("color", event.target.value));
  dock.querySelectorAll("[data-platform-align]").forEach((button) => button.addEventListener("click", () => applyPlatformStyle("textAlign", button.dataset.platformAlign)));
  dock.querySelector("[data-platform-bold]").addEventListener("click", () => applyPlatformStyle("fontWeight", "800"));
  dock.querySelector("[data-platform-italic]").addEventListener("click", () => applyPlatformStyle("fontStyle", "italic"));
  dock.querySelector("[data-platform-underline]").addEventListener("click", () => applyPlatformStyle("textDecoration", "underline"));
  dock.querySelector("[data-platform-text]").addEventListener("click", addPlatformTextBox);
  dock.querySelector("[data-platform-image]").addEventListener("click", () => dock.querySelector("[data-platform-image-file]").click());
  dock.querySelector("[data-platform-image-file]").addEventListener("change", addPlatformImage);
  dock.querySelector("[data-platform-front]").addEventListener("click", () => layerPlatformSelected(1));
  dock.querySelector("[data-platform-back]").addEventListener("click", () => layerPlatformSelected(-1));
  dock.querySelector("[data-platform-delete]").addEventListener("click", deletePlatformSelected);
  ["x", "y", "w", "h"].forEach((key) => {
    dock.querySelector(`[data-platform-${key}]`).addEventListener("change", (event) => applyPlatformGeometry(key, event.target.value));
  });
}

function installPlatformEditorSurface() {
  if (state.workbench) return;
  const doc = previewDocument();
  if (!doc?.body) return;
  ensurePlatformEditorDock();
  if (!doc.getElementById("ppt-platform-editor-style")) {
    const style = doc.createElement("style");
    style.id = "ppt-platform-editor-style";
    style.textContent = `body.editing .editor-toolbar,body.editing .ppt-ve-sidebar,body.editing .ppt-ve-inspector,body.editing .ppt-ve-ruler-top,body.editing .ppt-ve-ruler-left{display:none!important}.ppt-platform-selected{outline:2px solid #5b7eff!important;outline-offset:4px!important}`;
    doc.head.appendChild(style);
  }
  if (!doc.body.dataset.platformEditorBound) {
    doc.body.dataset.platformEditorBound = "1";
    doc.addEventListener("click", (event) => {
      if (!doc.body.classList.contains("editing")) return;
      setPlatformEditorSelected(platformEditorCandidate(event.target));
    }, true);
  }
}

function platformTextTarget() {
  const target = platformEditorSelected || previewDocument()?.activeElement;
  if (!target || target === previewDocument()?.body) return null;
  return target.matches?.(".media-box,.editable-image-box,figure,img") ? null : target;
}

function applyPlatformStyle(prop, value) {
  const target = platformTextTarget();
  if (!target) return;
  target.style[prop] = value;
  updatePlatformEditorInspector();
}

function slideRelativeRect(target) {
  const slide = activePreviewSlide();
  if (!target || !slide) return null;
  const rect = target.getBoundingClientRect();
  const slideRect = slide.getBoundingClientRect();
  return { rect, slideRect, x: rect.left - slideRect.left, y: rect.top - slideRect.top };
}

function updatePlatformEditorInspector() {
  const dock = document.querySelector(".preview-panel .platform-editor-dock");
  if (!dock) return;
  const target = platformEditorSelected;
  dock.querySelector("[data-platform-selected]").textContent = target ? (target.dataset.pptId || target.tagName.toLowerCase()) : "No element selected";
  dock.querySelectorAll(".platform-editor-inspector input,.platform-editor-inspector button").forEach((node) => node.disabled = !target);
  if (!target) return;
  const rel = slideRelativeRect(target);
  const style = getComputedStyle(target);
  if (rel) {
    dock.querySelector("[data-platform-x]").value = Math.round(rel.x);
    dock.querySelector("[data-platform-y]").value = Math.round(rel.y);
    dock.querySelector("[data-platform-w]").value = Math.round(rel.rect.width);
    dock.querySelector("[data-platform-h]").value = Math.round(rel.rect.height);
  }
  dock.querySelector("[data-platform-size]").value = Math.round(parseFloat(style.fontSize) || 30);
}

function applyPlatformGeometry(key, value) {
  const target = platformEditorSelected;
  const slide = activePreviewSlide();
  if (!target || !slide) return;
  const prop = { x: "left", y: "top", w: "width", h: "height" }[key];
  if (!prop) return;
  if (getComputedStyle(target).position === "static") {
    const rel = slideRelativeRect(target);
    target.style.position = "absolute";
    if (rel) {
      target.style.left = `${Math.max(0, rel.x)}px`;
      target.style.top = `${Math.max(0, rel.y)}px`;
    }
  }
  target.style[prop] = `${Math.max(0, Number(value) || 0)}px`;
  updatePlatformEditorInspector();
}

function layerPlatformSelected(delta) {
  if (!platformEditorSelected) return;
  const z = parseInt(getComputedStyle(platformEditorSelected).zIndex, 10);
  platformEditorSelected.style.zIndex = String((Number.isFinite(z) ? z : 1) + delta);
  updatePlatformEditorInspector();
}

function deletePlatformSelected() {
  if (!platformEditorSelected) return;
  platformEditorSelected.remove();
  platformEditorSelected = null;
  updatePlatformEditorInspector();
}

function addPlatformTextBox() {
  const doc = previewDocument();
  const slide = activePreviewSlide(doc);
  if (!doc || !slide) return;
  const box = doc.createElement("div");
  box.className = "free-textbox editable-text";
  box.textContent = "New text";
  box.contentEditable = "true";
  Object.assign(box.style, { position: "absolute", left: "96px", top: "110px", width: "360px", minHeight: "58px", fontSize: "32px", color: "#172554", zIndex: "60" });
  slide.appendChild(box);
  setPlatformEditorSelected(box);
  box.focus();
}

function addPlatformImage(event) {
  const file = event.target.files?.[0];
  const doc = previewDocument();
  const slide = activePreviewSlide(doc);
  if (!file || !doc || !slide) return;
  const reader = new FileReader();
  reader.onload = () => {
    const box = doc.createElement("figure");
    box.className = "media-box editable-image-box";
    Object.assign(box.style, { position: "absolute", left: "55%", top: "28%", width: "320px", height: "220px", zIndex: "55" });
    box.innerHTML = '<img alt="Added image" style="width:100%;height:100%;object-fit:contain;display:block">';
    box.querySelector("img").src = reader.result;
    slide.appendChild(box);
    previewWindow()?.toggleEdit?.(true);
    installPlatformEditorSurface();
    setPlatformEditorSelected(box);
  };
  reader.readAsDataURL(file);
  event.target.value = "";
}

function cleanupPlatformEditorArtifacts() {
  const doc = previewDocument();
  if (!doc) return;
  doc.querySelectorAll(".ppt-platform-selected").forEach((node) => node.classList.remove("ppt-platform-selected"));
  doc.getElementById("ppt-platform-editor-style")?.remove();
}

function ensurePreviewEditorApi() {
  const win = previewWindow();
  const doc = previewDocument();
  if (!win || !doc) return null;
  if (typeof win.toggleEdit === "function" && typeof win.exportEditedHtml === "function") return win;
  const hasEditorSurface = doc.querySelector("#ppt-html-editor-style,.editor-toolbar,.editable-text,.media-box,.editable-image-box");
  if (!hasEditorSurface) return null;
  win.toggleEdit = (force) => {
    const editing = typeof force === "boolean" ? force : !doc.body.classList.contains("editing");
    doc.body.classList.toggle("editing", editing);
    doc.querySelectorAll("h1,.point-card,.chapter,.editable-text,p,li,td,th,.free-textbox").forEach((node) => {
      node.contentEditable = editing ? "true" : "false";
    });
    doc.querySelectorAll("img").forEach((img) => {
      const box = img.closest(".media-box,.editable-image-box");
      if (box) {
        box.style.resize = "both";
        box.style.overflow = "hidden";
        box.style.minWidth = box.style.minWidth || "80px";
        box.style.minHeight = box.style.minHeight || "60px";
      }
    });
  };
  win.exportEditedHtml = async (mode = "paged") => {
    const clone = doc.documentElement.cloneNode(true);
    clone.querySelector(".editor-toolbar")?.remove();
    clone.querySelector("#ppt-html-editor-style")?.remove();
    clone.querySelectorAll("[contenteditable]").forEach((node) => node.removeAttribute("contenteditable"));
    clone.querySelector("body")?.classList.remove("editing");
    if (mode === "scroll") {
      clone.querySelector("body")?.classList.add("scroll-mode");
      clone.querySelectorAll(".slide,section[data-slide-page],[data-slide-page]").forEach((node) => {
        node.style.display = "block";
        node.style.visibility = "visible";
        node.style.opacity = "1";
      });
    } else {
      clone.querySelector("body")?.classList.remove("scroll-mode");
    }
    return `<!doctype html>\n${clone.outerHTML}`;
  };
  return win;
}

function quickFixSlides(doc) {
  if (!doc) return [];
  const slides = [...doc.querySelectorAll(".slide, section[data-slide-page], [data-slide-page], .ai-slide")];
  return slides.filter((slide, index, all) => {
    if (slide.closest(".editor-toolbar,.ppt-runtime-nav,.nav,.runtime-controls")) return false;
    return all.findIndex((item) => item === slide || item.contains(slide)) === index;
  });
}

function visibleRect(node) {
  const rect = node?.getBoundingClientRect?.();
  if (!rect || rect.width <= 1 || rect.height <= 1) return null;
  return rect;
}

function quickFixActiveSlides(doc) {
  const slides = quickFixSlides(doc);
  const visible = slides.filter((slide) => visibleRect(slide));
  return visible.length ? visible : slides.slice(0, 1);
}

function quickFixTextNodes(slide) {
  if (!slide) return [];
  const selector = "h1,h2,h3,h4,p,li,td,th,.editable-text,.free-textbox,.free-text-box,.point-card,.body-card,.card,.agenda-item,.lead-text,.body-paragraph";
  return [...slide.querySelectorAll(selector)].filter((node) => {
    const text = node.textContent.trim();
    if (!text || node.closest("script,style,.ppt-runtime-nav,.nav,.editor-toolbar")) return false;
    return visibleRect(node);
  });
}

function quickFixImageEntries(slide) {
  if (!slide) return [];
  const imageBoxSelector = ".media-box,.editable-image-box,figure,.image-area,.image-wrap,.visual,.media,.image-card,.photo-card";
  return [...slide.querySelectorAll("img")]
    .map((img) => {
      const imageRect = visibleRect(img);
      const box = img.closest(imageBoxSelector) || img.parentElement || img;
      const rect = visibleRect(box) || imageRect;
      return { img, box, rect, imageRect };
    })
    .filter((entry) => entry.rect || entry.imageRect);
}

function rectsOverlap(a, b, padding = 6) {
  if (!a || !b) return false;
  return a.left < b.right - padding && a.right > b.left + padding && a.top < b.bottom - padding && a.bottom > b.top + padding;
}

function nodeOverflowsSlide(node, slide) {
  const nodeRect = visibleRect(node);
  const slideRect = visibleRect(slide);
  if (!nodeRect || !slideRect) return false;
  const internalOverflow = node.scrollWidth > node.clientWidth + 3 || node.scrollHeight > node.clientHeight + 3;
  const outside = nodeRect.left < slideRect.left - 3 || nodeRect.top < slideRect.top - 3 || nodeRect.right > slideRect.right + 3 || nodeRect.bottom > slideRect.bottom + 3;
  const text = node.textContent.trim();
  const style = slide.ownerDocument.defaultView.getComputedStyle(node);
  const fontSize = Number.parseFloat(style.fontSize || "16") || 16;
  const verticalCrush = text.length > 6 && nodeRect.width < Math.max(42, fontSize * 2.2) && nodeRect.height > fontSize * 4;
  return internalOverflow || outside || verticalCrush;
}

function normalizeCssColor(value, doc) {
  if (!value || value === "transparent" || value === "rgba(0, 0, 0, 0)") return null;
  const scratch = doc.createElement("span");
  scratch.style.color = value;
  doc.body.appendChild(scratch);
  const color = doc.defaultView.getComputedStyle(scratch).color;
  scratch.remove();
  const match = color.match(/rgba?\(([\d.]+),\s*([\d.]+),\s*([\d.]+)(?:,\s*([\d.]+))?\)/i);
  if (!match) return null;
  const alpha = match[4] === undefined ? 1 : Number.parseFloat(match[4]);
  if (alpha <= 0.05) return null;
  return [Number(match[1]), Number(match[2]), Number(match[3])];
}

function relativeLuminance(rgb) {
  const values = rgb.map((value) => {
    const channel = value / 255;
    return channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * values[0] + 0.7152 * values[1] + 0.0722 * values[2];
}

function contrastRatio(a, b) {
  const l1 = relativeLuminance(a);
  const l2 = relativeLuminance(b);
  const light = Math.max(l1, l2);
  const dark = Math.min(l1, l2);
  return (light + 0.05) / (dark + 0.05);
}

function effectiveBackgroundColor(node) {
  const doc = node.ownerDocument;
  const view = doc.defaultView;
  let current = node;
  while (current && current.nodeType === 1) {
    const rgb = normalizeCssColor(view.getComputedStyle(current).backgroundColor, doc);
    if (rgb) return rgb;
    current = current.parentElement;
  }
  return normalizeCssColor(view.getComputedStyle(doc.body).backgroundColor, doc) || [255, 255, 255];
}

function detectQuickFixIssues() {
  const doc = previewDocument();
  const panel = el("quickFixPanel");
  if (!state.activeJob || !doc || !panel) {
    panel?.classList.add("hidden");
    return null;
  }
  const issues = { overflow: false, images: false, contrast: false, missing: false, crowded: false };
  const slides = quickFixActiveSlides(doc);
  slides.forEach((slide) => {
    const slideRect = visibleRect(slide);
    const textNodes = quickFixTextNodes(slide);
    const imageEntries = quickFixImageEntries(slide);
    const navRects = [...doc.querySelectorAll(".ppt-runtime-nav,.nav,.runtime-controls")]
      .map((node) => visibleRect(node))
      .filter(Boolean);
    const textLength = textNodes.reduce((sum, node) => sum + node.textContent.trim().length, 0);
    issues.overflow = issues.overflow || textNodes.some((node) => nodeOverflowsSlide(node, slide));
    issues.crowded = issues.crowded || textNodes.length > 10 || textLength > 760;
    const slideArea = slideRect ? slideRect.width * slideRect.height : 0;
    const imageArea = imageEntries.reduce((sum, entry) => {
      const rect = entry.rect || entry.imageRect;
      return sum + (rect ? rect.width * rect.height : 0);
    }, 0);
    if (slideRect && imageEntries.length > 1 && imageArea > slideArea * 0.36) issues.images = true;
    imageEntries.forEach(({ img, rect, imageRect }, index) => {
      if (!img.complete || img.naturalWidth === 0 || !img.getAttribute("src")) issues.missing = true;
      const checkRect = rect || imageRect;
      if (slideRect && checkRect) {
        const maxWidth = imageEntries.length > 1 ? 0.48 : (textLength > 120 ? 0.54 : 0.62);
        const maxHeight = imageEntries.length > 1 ? 0.38 : (textLength > 120 ? 0.54 : 0.62);
        if (checkRect.width > slideRect.width * maxWidth || checkRect.height > slideRect.height * maxHeight) issues.images = true;
        if (textLength > 80 && checkRect.width * checkRect.height > slideArea * (imageEntries.length > 1 ? 0.18 : 0.34)) issues.images = true;
        if (checkRect.left < slideRect.left - 4 || checkRect.right > slideRect.right + 4 || checkRect.top < slideRect.top - 4 || checkRect.bottom > slideRect.bottom + 4) issues.images = true;
        if (checkRect.bottom > slideRect.bottom - Math.max(38, slideRect.height * 0.055)) issues.images = true;
      }
      imageEntries.slice(index + 1).forEach((other) => {
        if (rectsOverlap(checkRect, other.rect || other.imageRect, 8)) issues.images = true;
      });
      textNodes.forEach((node) => {
        if (rectsOverlap(checkRect, visibleRect(node), 10)) issues.images = true;
      });
      navRects.forEach((navRect) => {
        if (rectsOverlap(checkRect, navRect, 2)) issues.images = true;
      });
    });
    if (slide.querySelector(".ppt-missing-image,.image-placeholder,[data-image-slot]:empty")) issues.missing = true;
    textNodes.forEach((node) => {
      const style = doc.defaultView.getComputedStyle(node);
      const fg = normalizeCssColor(style.color, doc);
      const bg = effectiveBackgroundColor(node);
      if (fg && bg && contrastRatio(fg, bg) < 3.8) issues.contrast = true;
    });
  });
  const count = Object.values(issues).filter(Boolean).length;
  panel.classList.remove("hidden");
  setText("quickFixSummary", count ? "quickFixDetected" : "quickFixNone", { count });
  Object.entries(QUICK_FIX_BUTTONS).forEach(([key, id]) => {
    const button = el(id);
    if (!button) return;
    button.classList.remove("hidden");
    button.classList.toggle("suggested", Boolean(issues[key]));
  });
  return issues;
}

function ensureQuickFixRuntimeStyle(doc) {
  if (doc.getElementById("ppt-quick-fix-style")) return;
  const style = doc.createElement("style");
  style.id = "ppt-quick-fix-style";
  style.textContent = `
.ppt-qf-fixed-text{white-space:normal!important;word-break:normal!important;overflow-wrap:break-word!important;text-wrap:pretty;writing-mode:horizontal-tb!important;text-orientation:mixed!important;max-width:100%!important;box-sizing:border-box!important}
.ppt-qf-compact-slide{overflow:hidden!important}
.ppt-qf-image-box{position:relative!important;inset:auto!important;left:auto!important;top:auto!important;right:auto!important;bottom:auto!important;transform:none!important;float:none!important;z-index:1!important;box-sizing:border-box!important}
.ppt-qf-image{display:block!important;width:100%!important;height:100%!important;max-width:100%!important;max-height:100%!important;object-fit:contain!important}
.ppt-qf-missing{display:grid!important;place-items:center!important;min-height:110px!important;border:1px dashed rgba(92,116,160,.45)!important;border-radius:12px!important;background:rgba(240,244,252,.72)!important;color:#60708f!important;font:600 16px/1.3 system-ui,sans-serif!important}
`;
  doc.head.appendChild(style);
}

function fixOverflowInPreview(doc) {
  ensureQuickFixRuntimeStyle(doc);
  let changed = 0;
  quickFixActiveSlides(doc).forEach((slide) => {
    const slideRect = visibleRect(slide);
    quickFixTextNodes(slide).forEach((node) => {
      const rect = visibleRect(node);
      if (!rect || !nodeOverflowsSlide(node, slide)) return;
      node.classList.add("ppt-qf-fixed-text");
      const style = doc.defaultView.getComputedStyle(node);
      const fontSize = Number.parseFloat(style.fontSize || "24") || 24;
      const nextSize = Math.max(20, Math.min(fontSize, fontSize * 0.88));
      node.style.fontSize = `${nextSize}px`;
      node.style.lineHeight = fontSize > 38 ? "1.06" : "1.14";
      node.style.letterSpacing = "0";
      node.style.overflow = "visible";
      node.style.minWidth = slideRect ? `${Math.min(Math.max(260, slideRect.width * 0.28), slideRect.width * 0.82)}px` : "260px";
      if (rect.right > (slideRect?.right || rect.right) || rect.left < (slideRect?.left || rect.left)) {
        node.style.maxWidth = slideRect ? `${Math.max(280, slideRect.width * 0.82)}px` : "100%";
      }
      changed += 1;
    });
    if (changed) {
      slide.classList.add("ppt-qf-compact-slide");
      slide.style.gap = slide.style.gap || "clamp(12px, 2vw, 28px)";
    }
  });
  return changed;
}

function relayoutImagesInPreview(doc) {
  ensureQuickFixRuntimeStyle(doc);
  let changed = 0;
  quickFixActiveSlides(doc).forEach((slide) => {
    const slideRect = visibleRect(slide);
    const imageEntries = quickFixImageEntries(slide);
    const images = imageEntries.map((entry) => entry.img);
    if (!imageEntries.length) return;
    const hasText = quickFixTextNodes(slide).length > 0;
    imageEntries.forEach(({ img, box }, index) => {
      if (box && box !== slide) {
        box.classList.add("ppt-qf-image-box");
        const widthRatio = images.length > 1 ? (hasText ? 0.28 : 0.32) : (hasText ? 0.38 : 0.46);
        const heightRatio = images.length > 1 ? (hasText ? 0.22 : 0.27) : (hasText ? 0.36 : 0.46);
        box.style.width = `${Math.max(160, Math.min(slideRect ? slideRect.width * widthRatio : 360, images.length > 1 ? 390 : 500))}px`;
        box.style.height = `${Math.max(110, Math.min(slideRect ? slideRect.height * heightRatio : 260, images.length > 1 ? 260 : 330))}px`;
        box.style.maxWidth = images.length > 1 ? "38vw" : "48vw";
        box.style.maxHeight = images.length > 1 ? "28vh" : "42vh";
        box.style.margin = images.length > 1 ? "6px" : "12px auto";
      }
      img.classList.add("ppt-qf-image");
      img.style.objectFit = "contain";
      if (!img.parentElement?.classList.contains("ppt-qf-image-row") && images.length > 1 && index === 0) {
        const row = doc.createElement("div");
        row.className = "ppt-qf-image-row";
        row.style.cssText = "display:flex;flex-wrap:wrap;gap:12px;align-items:center;justify-content:center;max-width:84%;margin:10px auto 0;";
        const firstBox = imageEntries[0].box || images[0];
        firstBox.parentElement?.insertBefore(row, firstBox);
        imageEntries.forEach((entry) => {
          const itemBox = entry.box || entry.img;
          row.appendChild(itemBox);
        });
      }
      changed += 1;
    });
  });
  return changed;
}

function improveContrastInPreview(doc) {
  ensureQuickFixRuntimeStyle(doc);
  let changed = 0;
  quickFixActiveSlides(doc).forEach((slide) => {
    quickFixTextNodes(slide).forEach((node) => {
      const style = doc.defaultView.getComputedStyle(node);
      const fg = normalizeCssColor(style.color, doc);
      const bg = effectiveBackgroundColor(node);
      if (!fg || !bg || contrastRatio(fg, bg) >= 4.5) return;
      node.style.color = relativeLuminance(bg) > 0.48 ? "#102044" : "#f8fbff";
      node.style.textShadow = "none";
      changed += 1;
    });
  });
  return changed;
}

function restoreMissingImagesInPreview(doc) {
  ensureQuickFixRuntimeStyle(doc);
  const availableImages = [...doc.querySelectorAll("img")]
    .filter((img) => img.complete && img.naturalWidth > 0 && /^data:image\//i.test(img.currentSrc || img.src))
    .map((img) => img.currentSrc || img.src);
  let cursor = 0;
  let changed = 0;
  [...doc.querySelectorAll("img")].forEach((img) => {
    if (img.complete && img.naturalWidth > 0 && img.getAttribute("src")) return;
    const replacement = availableImages[cursor];
    if (replacement) {
      img.src = replacement;
      cursor = (cursor + 1) % availableImages.length;
      img.classList.add("ppt-qf-image");
    } else {
      const placeholder = doc.createElement("div");
      placeholder.className = "ppt-qf-missing";
      placeholder.textContent = "Image unavailable";
      img.replaceWith(placeholder);
    }
    changed += 1;
  });
  [...doc.querySelectorAll(".ppt-missing-image,.image-placeholder,[data-image-slot]:empty")].forEach((node) => {
    const replacement = availableImages[cursor];
    if (replacement) {
      const img = doc.createElement("img");
      img.src = replacement;
      img.alt = "Restored image";
      img.className = "ppt-qf-image";
      node.replaceWith(img);
      cursor = (cursor + 1) % availableImages.length;
    } else {
      node.classList.add("ppt-qf-missing");
      node.textContent = node.textContent.trim() || "Image unavailable";
    }
    changed += 1;
  });
  return changed;
}

function activeSlideSnapshotForAi(doc) {
  const slide = quickFixActiveSlides(doc)[0];
  if (!slide) return "";
  const clone = slide.cloneNode(true);
  clone.querySelectorAll("script,style,.editor-toolbar,.ppt-runtime-nav,.nav,.image-drag-handle,.image-resize-handle").forEach((node) => node.remove());
  clone.querySelectorAll("img").forEach((img, index) => {
    const src = img.getAttribute("src") || "";
    if (/^data:image\//i.test(src)) img.setAttribute("src", `[embedded-original-image-${index + 1}]`);
  });
  return clone.outerHTML.replace(/\s{2,}/g, " ").slice(0, 42000);
}

function cssPatchFromAiText(text) {
  const raw = String(text || "").trim();
  const jsonText = raw.match(/```json\s*([\s\S]*?)```/i)?.[1]?.trim() || raw;
  try {
    const parsed = JSON.parse(jsonText);
    if (parsed?.css) return String(parsed.css);
  } catch {
    // The model may return fenced CSS or plain CSS.
  }
  const fencedCss = raw.match(/```css\s*([\s\S]*?)```/i)?.[1]?.trim();
  const css = fencedCss || raw.replace(/```/g, "").trim();
  return css.replace(/<\/?style[^>]*>/gi, "").replace(/<script[\s\S]*?<\/script>/gi, "").trim();
}

function aiQuickFixPrompt(slideHtml, issues) {
  const issueList = Object.entries(issues || {})
    .filter(([, value]) => value)
    .map(([key]) => key)
    .join(", ") || "general polish";
  return `Return JSON only: {"css":"..."}.
You are repairing the currently visible HTML slide in PPT HTML Studio.
Detected issue groups: ${issueList}.
Goal: make this slide clean, readable, non-overflowing, balanced, and visually polished without changing generated content.
Rules:
- Return only a CSS patch in JSON. No markdown.
- Do not rewrite HTML, do not create image URLs, do not hide original content, and do not use scrollable text boxes.
- Preserve original images and image containers. Reposition and resize them with CSS only.
- Keep all text horizontal. Never use vertical writing, one-letter columns, word-break: break-all, overflow-wrap:anywhere, or hidden overflow that cuts text.
- Use safe margins, strong contrast, and balanced image/text spacing.
- Scope selectors to the provided slide whenever possible using its classes or data-slide-page.
- If text is too dense, use columns, smaller gaps, and slightly smaller font, but keep body text readable.
Current slide HTML:
${slideHtml}`;
}

async function aiRepairLayoutInPreview(doc, issues) {
  const config = integrationForGeneration();
  if (config.mode !== "ai_api" || !config.apiKey) {
    throw new Error(t("quickFixAiNoConfig"));
  }
  const slideHtml = activeSlideSnapshotForAi(doc);
  if (!slideHtml) return 0;
  setStatus(t("quickFixAiRunning"));
  const response = await fetch(normalizeChatEndpoint(config.endpoint), {
    method: "POST",
    headers: apiHeaders(config),
    body: JSON.stringify({
      model: config.model || "gpt-4.1-mini",
      messages: [
        { role: "system", content: "You repair HTML slide layouts by returning a small CSS patch as strict JSON only." },
        { role: "user", content: aiQuickFixPrompt(slideHtml, issues) },
      ],
      temperature: 0.1,
      max_tokens: 5000,
    }),
  });
  const text = await response.text();
  let data = {};
  try { data = text ? JSON.parse(text) : {}; } catch { data = { text }; }
  if (!response.ok) throw new Error(data.message || data.error?.message || `AI repair HTTP ${response.status}`);
  const css = cssPatchFromAiText(extractAiText(data) || data.css || data.result || data.output || text);
  if (!css || css.length < 12) throw new Error("AI did not return a usable CSS repair patch.");
  let style = doc.getElementById("ppt-ai-quick-fix-style");
  if (!style) {
    style = doc.createElement("style");
    style.id = "ppt-ai-quick-fix-style";
    doc.head.appendChild(style);
  }
  style.textContent = `${style.textContent || ""}\n/* AI quick layout repair */\n${css}\n`;
  return 1;
}

function splitCrowdedSlidesInPreview(doc) {
  ensureQuickFixRuntimeStyle(doc);
  let created = 0;
  quickFixActiveSlides(doc).forEach((slide) => {
    const items = [...slide.querySelectorAll("p,li,.editable-text,.body-paragraph,.point-card,.body-card,.card,.agenda-item")]
      .filter((node) => node.textContent.trim() && !node.closest("h1,h2,h3,h4,.ppt-runtime-nav,.nav,.editor-toolbar") && visibleRect(node));
    const totalText = items.reduce((sum, node) => sum + node.textContent.trim().length, 0);
    if (items.length < 8 && totalText < 680) return;
    const splitAt = Math.max(3, Math.ceil(items.length / 2));
    const clone = slide.cloneNode(true);
    clone.classList.remove("active", "is-active", "current", "present");
    const originalItems = [...slide.querySelectorAll("p,li,.editable-text,.body-paragraph,.point-card,.body-card,.card,.agenda-item")]
      .filter((node) => node.textContent.trim() && !node.closest("h1,h2,h3,h4,.ppt-runtime-nav,.nav,.editor-toolbar"));
    const cloneItems = [...clone.querySelectorAll("p,li,.editable-text,.body-paragraph,.point-card,.body-card,.card,.agenda-item")]
      .filter((node) => node.textContent.trim() && !node.closest("h1,h2,h3,h4,.ppt-runtime-nav,.nav,.editor-toolbar"));
    originalItems.forEach((node, index) => {
      if (index >= splitAt) node.remove();
    });
    cloneItems.forEach((node, index) => {
      if (index < splitAt) node.remove();
    });
    const title = clone.querySelector("h1,h2,.title");
    if (title && !/\bcontinued\b/i.test(title.textContent)) title.textContent = `${title.textContent.trim()} · continued`;
    slide.after(clone);
    created += 1;
  });
  return created;
}

async function persistQuickFixPreview({ reload = false } = {}) {
  if (!state.activeJob) return;
  const win = previewWindow();
  ensurePreviewEditorApi();
  if (!win || typeof win.exportEditedHtml !== "function") return;
  const pagedHtml = await win.exportEditedHtml("paged");
  const scrollHtml = await win.exportEditedHtml("scroll");
  const job = updateLocalJobHtml(state.activeJob, pagedHtml, scrollHtml);
  renderJobs();
  renderJobSelect();
  el("jobSelect").value = job.id;
  if (reload) {
    loadPreviewFrame(job);
  }
}

async function applyQuickFix(kind) {
  const doc = previewDocument();
  if (!state.activeJob || !doc) {
    setStatus(t("generateOrSelect"), "error");
    return;
  }
  ensurePreviewEditorApi();
  const issues = detectQuickFixIssues() || {};
  let changed = 0;
  if (kind === "overflow") changed = fixOverflowInPreview(doc);
  if (kind === "images") changed = relayoutImagesInPreview(doc);
  if (kind === "contrast") changed = improveContrastInPreview(doc);
  if (kind === "missing") changed = restoreMissingImagesInPreview(doc);
  if (kind === "crowded") changed = splitCrowdedSlidesInPreview(doc);
  if (kind === "ai") changed = await aiRepairLayoutInPreview(doc, issues);
  if (changed) {
    await persistQuickFixPreview({ reload: kind === "crowded" });
    setStatus(kind === "ai" ? t("quickFixAiApplied") : t("quickFixApplied"), "ok");
    setTimeout(detectQuickFixIssues, kind === "crowded" ? 650 : 80);
  } else {
    detectQuickFixIssues();
    setStatus(t("quickFixNone"), "ok");
  }
}

function hasEditablePreview() {
  const win = ensurePreviewEditorApi();
  return Boolean(win && typeof win.exportEditedHtml === "function" && typeof win.toggleEdit === "function");
}

function isPreviewEditing() {
  return Boolean(previewDocument()?.body?.classList.contains("editing"));
}

function updatePreviewEditButton(editing = isPreviewEditing()) {
  const button = el("editHtml");
  if (button) button.textContent = editing ? t("stopEditing") : t("editHtml");
}

function versionedUrl(url) {
  if (!url || /^(?:data:|blob:)/i.test(String(url))) return url;
  const separator = String(url || "").includes("?") ? "&" : "?";
  return `${url}${separator}v=${Date.now()}`;
}

function isInlineDownloadUrl(url) {
  return /^(?:data:|blob:)/i.test(String(url || ""));
}

function triggerDownload(url, filename = "optimized-ppt.zip") {
  const link = document.createElement("a");
  link.href = versionedUrl(url);
  link.download = filename;
  link.rel = "noopener";
  document.body.appendChild(link);
  link.click();
  link.remove();
}

function makeScrollHtmlFromPaged(html) {
  if (window.PptDeckWorkbench?.makeScrollHtmlFromPaged) {
    return window.PptDeckWorkbench.makeScrollHtmlFromPaged(html);
  }
  let output = String(html || "");
  if (/<body\b[^>]*class="/i.test(output)) {
    output = output.replace(/<body\b([^>]*?)class="([^"]*)"/i, (all, before, cls) => `<body${before}class="${cls} scroll-mode"`);
  } else if (/<body\b/i.test(output)) {
    output = output.replace(/<body\b([^>]*)>/i, '<body$1 class="scroll-mode">');
  }
  if (!/ppt-scroll-export-style/.test(output)) {
    const style = `<style id="ppt-scroll-export-style">body.scroll-mode{overflow:auto!important;height:auto!important}body.scroll-mode .deck{height:auto!important;display:grid!important;gap:24px!important;padding:24px 0!important}body.scroll-mode .slide,body.scroll-mode section[data-slide-page],body.scroll-mode [data-slide-page]{display:block!important;visibility:visible!important;opacity:1!important;position:relative!important;left:auto!important;top:auto!important;transform:none!important;margin:0 auto!important;min-height:720px}body.scroll-mode .ppt-runtime-nav,body.scroll-mode .nav{display:none!important}</style>`;
    output = /<\/head>/i.test(output) ? output.replace(/<\/head>/i, `${style}</head>`) : `${style}${output}`;
  }
  output = output.replace(/(<(?:section|div)\b(?=[^>]*(?:class=["'][^"']*\bslide\b|data-slide-page\b))[^>]*\bstyle=["'])([^"']*)(["'][^>]*>)/gi, (match, start, style, end) => {
    const visibleStyle = String(style).replace(/display\s*:\s*none\s*;?/gi, "display:block;");
    return `${start}${visibleStyle}${end}`;
  });
  return output;
}

let crcTable = null;

function getCrcTable() {
  if (crcTable) return crcTable;
  crcTable = new Uint32Array(256);
  for (let i = 0; i < 256; i += 1) {
    let value = i;
    for (let bit = 0; bit < 8; bit += 1) {
      value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
    }
    crcTable[i] = value >>> 0;
  }
  return crcTable;
}

function crc32(bytes) {
  const table = getCrcTable();
  let crc = 0xffffffff;
  for (let i = 0; i < bytes.length; i += 1) crc = table[(crc ^ bytes[i]) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function writeU16(out, value) {
  out.push(value & 0xff, (value >>> 8) & 0xff);
}

function writeU32(out, value) {
  out.push(value & 0xff, (value >>> 8) & 0xff, (value >>> 16) & 0xff, (value >>> 24) & 0xff);
}

function dosTimeDate(date = new Date()) {
  const time = (date.getHours() << 11) | (date.getMinutes() << 5) | Math.floor(date.getSeconds() / 2);
  const dosDate = ((date.getFullYear() - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate();
  return { time, date: dosDate };
}

function bytesFromString(value) {
  return new TextEncoder().encode(String(value ?? ""));
}

function concatBytes(parts) {
  const total = parts.reduce((sum, part) => sum + part.length, 0);
  const output = new Uint8Array(total);
  let offset = 0;
  parts.forEach((part) => {
    output.set(part, offset);
    offset += part.length;
  });
  return output;
}

function makeZipBlob(files) {
  const localParts = [];
  const centralParts = [];
  let offset = 0;
  const now = dosTimeDate();
  files.forEach((file) => {
    const nameBytes = bytesFromString(file.name);
    const dataBytes = typeof file.data === "string" ? bytesFromString(file.data) : file.data;
    const crc = crc32(dataBytes);
    const local = [];
    writeU32(local, 0x04034b50);
    writeU16(local, 20);
    writeU16(local, 0x0800);
    writeU16(local, 0);
    writeU16(local, now.time);
    writeU16(local, now.date);
    writeU32(local, crc);
    writeU32(local, dataBytes.length);
    writeU32(local, dataBytes.length);
    writeU16(local, nameBytes.length);
    writeU16(local, 0);
    const localBytes = concatBytes([new Uint8Array(local), nameBytes, dataBytes]);
    localParts.push(localBytes);

    const central = [];
    writeU32(central, 0x02014b50);
    writeU16(central, 20);
    writeU16(central, 20);
    writeU16(central, 0x0800);
    writeU16(central, 0);
    writeU16(central, now.time);
    writeU16(central, now.date);
    writeU32(central, crc);
    writeU32(central, dataBytes.length);
    writeU32(central, dataBytes.length);
    writeU16(central, nameBytes.length);
    writeU16(central, 0);
    writeU16(central, 0);
    writeU16(central, 0);
    writeU16(central, 0);
    writeU32(central, 0);
    writeU32(central, offset);
    centralParts.push(concatBytes([new Uint8Array(central), nameBytes]));
    offset += localBytes.length;
  });
  const centralSize = centralParts.reduce((sum, part) => sum + part.length, 0);
  const end = [];
  writeU32(end, 0x06054b50);
  writeU16(end, 0);
  writeU16(end, 0);
  writeU16(end, files.length);
  writeU16(end, files.length);
  writeU32(end, centralSize);
  writeU32(end, offset);
  writeU16(end, 0);
  return new Blob([...localParts, ...centralParts, new Uint8Array(end)], { type: "application/zip" });
}

async function fetchTextIfAvailable(url) {
  if (!url) return "";
  const response = await fetch(versionedUrl(url), { cache: "no-store" });
  if (!response.ok) throw new Error(`Could not load generated HTML (${response.status}).`);
  return response.text();
}

async function captureJobHtml(job, preferPreview = true) {
  const win = previewWindow();
  ensurePreviewEditorApi();
  if (preferPreview && state.activeJob?.id === job.id && win && typeof win.exportEditedHtml === "function") {
    const wasEditing = isPreviewEditing();
    state.workbench?.prepareExport?.();
    cleanupPlatformEditorArtifacts();
    const output = {
      pagedHtml: await win.exportEditedHtml("paged"),
      scrollHtml: await win.exportEditedHtml("scroll"),
    };
    output.pagedHtml = makePagedHtmlPlayable(output.pagedHtml);
    output.scrollHtml = makeScrollHtmlFromPaged(output.pagedHtml);
    if (wasEditing) {
      state.workbench?.restoreAfterExport?.();
      installPlatformEditorSurface();
    }
    return output;
  }
  const sourcePagedHtml = job.inlinePreviewHtmlCache || await fetchTextIfAvailable(job.previewUrl);
  const pagedHtml = makePagedHtmlPlayable(sourcePagedHtml);
  const scrollHtml = makeScrollHtmlFromPaged(pagedHtml || job.inlineScrollHtmlCache || (job.scrollUrl ? await fetchTextIfAvailable(job.scrollUrl) : ""));
  return { pagedHtml, scrollHtml };
}

function updateLocalJobHtml(job, pagedHtml, scrollHtml) {
  if (!job) return job;
  const normalizedPaged = normalizeDeckHtmlForEditor(pagedHtml);
  const playablePaged = makePagedHtmlPlayable(normalizedPaged);
  const normalizedScroll = makeScrollHtmlFromPaged(playablePaged || scrollHtml);
  job.inlinePreviewHtmlCache = normalizedPaged;
  job.inlineScrollHtmlCache = normalizedScroll;
  job.previewUrl = createPreviewHtmlUrl(normalizedPaged);
  job.scrollUrl = createInlineHtmlUrl(normalizedScroll);
  job.inlinePreviewAvailable = true;
  job.updatedAt = new Date().toISOString();
  state.jobs = state.jobs.map((item) => item.id === job.id ? job : item);
  if (state.activeJob?.id === job.id) state.activeJob = job;
  return job;
}

async function makeClientZipUrl(job, pagedHtml, scrollHtml) {
  const playablePaged = makePagedHtmlPlayable(pagedHtml);
  const stableScroll = scrollHtml || makeScrollHtmlFromPaged(playablePaged);
  const readme = "Open index.html for paged navigation, or index-scroll.html for continuous scrolling.\nImages are embedded in the HTML, so they will not be lost.\n";
  const blob = makeZipBlob([
    { name: "index.html", data: playablePaged },
    { name: "index-scroll.html", data: stableScroll },
    { name: "index-single-file.html", data: playablePaged },
    { name: "index-scroll-single-file.html", data: stableScroll },
    { name: "README-open.txt", data: readme },
  ]);
  const url = URL.createObjectURL(blob);
  state.inlineObjectUrls.push(url);
  return url;
}

async function openPlayableJobPreview(job) {
  if (!job) return;
  try {
    const captured = await captureJobHtml(job, true);
    const url = createInlineHtmlUrl(makePagedHtmlPlayable(captured.pagedHtml));
    window.open(url, "_blank", "noopener,noreferrer");
  } catch (error) {
    console.warn("Could not build playable preview; opening cached preview.", error);
    if (job.previewUrl) window.open(job.previewUrl, "_blank", "noopener,noreferrer");
  }
}

function historyRecordIdFromUrl() {
  const params = new URLSearchParams(window.location.search);
  return params.get("history") || sessionStorage.getItem("ppt-html-studio-open-history-id") || "";
}

function shouldOpenHistoryInEditMode() {
  const params = new URLSearchParams(window.location.search);
  return params.get("edit") === "1" || sessionStorage.getItem("ppt-html-studio-open-history-edit") === "1";
}

async function captureJobHtmlForHistory(job) {
  if (!job) return { pagedHtml: "", scrollHtml: "" };
  let pagedHtml = job.inlinePreviewHtmlCache || "";
  let scrollHtml = job.inlineScrollHtmlCache || "";
  if (!pagedHtml && job.previewUrl) {
    try { pagedHtml = await fetchTextIfAvailable(job.previewUrl); } catch { pagedHtml = ""; }
  }
  if (!scrollHtml && job.scrollUrl) {
    try { scrollHtml = await fetchTextIfAvailable(job.scrollUrl); } catch { scrollHtml = ""; }
  }
  if (pagedHtml) pagedHtml = makePagedHtmlPlayable(pagedHtml);
  scrollHtml = pagedHtml ? makeScrollHtmlFromPaged(pagedHtml) : scrollHtml;
  return { pagedHtml, scrollHtml };
}

async function saveConverterHistoryRecord(job, mode = "local_rules") {
  if (!window.PptHistory || !job) return null;
  try {
    const { pagedHtml, scrollHtml } = await captureJobHtmlForHistory(job);
    if (!pagedHtml) return null;
    const title = job.fileName || state.selectedFile?.name || window.PptHistory.titleFromHtml(pagedHtml) || "PPT HTML deck";
    const record = await window.PptHistory.saveRecord({
      id: job.historyRecordId || "",
      title,
      source: "converter",
      mode,
      style: job.style || state.selectedStyle,
      slideCount: Number(job.slides || window.PptHistory.detectSlideCount(pagedHtml) || 0),
      thumbnail: job.thumbnail || window.PptHistory.thumbnailFromHtml?.(pagedHtml, title, "converter", job.style || state.selectedStyle) || window.PptHistory.createThumbnail(title, "converter", job.style || state.selectedStyle),
      html: pagedHtml,
      scrollHtml: scrollHtml || pagedHtml,
      fileName: job.fileName || state.selectedFile?.name || title,
      status: "ready",
      metadata: {
        jobId: job.id,
        aiStatus: job.aiStatus || null,
        share: job.share || null,
      },
    });
    job.historyRecordId = record.id;
    state.jobs = state.jobs.map((item) => item.id === job.id ? { ...item, historyRecordId: record.id } : item);
    if (state.activeJob?.id === job.id) state.activeJob.historyRecordId = record.id;
    return record;
  } catch (error) {
    console.warn("Could not save converter history", error);
    return null;
  }
}

function converterJobFromHistoryRecord(record) {
  const html = record.editedHtml || record.html || "";
  const scrollHtml = record.scrollHtml || makeScrollHtmlFromPaged(html);
  return hydrateInlineJob({
    id: `HISTORY-${record.id}`,
    historyRecordId: record.id,
    fileName: record.fileName || record.title || "Local history deck",
    slides: record.slideCount || window.PptHistory?.detectSlideCount?.(html) || 0,
    style: record.style || state.selectedStyle,
    status: record.status || "ready",
    updatedAt: new Date(record.updatedAt || Date.now()).toISOString(),
    previewUrl: "",
    scrollUrl: "",
    downloadUrl: "",
    inlinePreviewHtml: html,
    inlineScrollHtml: scrollHtml,
    inlinePreviewMode: "blob",
    aiStatus: {
      mode: record.mode || "local_history",
      used: record.mode !== "local_rules",
      localHistory: true,
    },
    share: {
      status: "ready",
      recommendation: state.language === "zh" ? "已从本地历史记录载入。" : "Loaded from local history.",
      totalImages: 0,
      embeddedImages: 0,
      missingImages: 0,
      riskyPaths: 0,
      externalImages: 0,
    },
  });
}

async function restoreConverterHistoryFromUrl() {
  const historyId = historyRecordIdFromUrl();
  if (!historyId || !window.PptHistory) return;
  try {
    await window.PptHistory.init();
    const record = await window.PptHistory.getRecord(historyId);
    if (!record) throw new Error("History record not found.");
    const job = converterJobFromHistoryRecord(record);
    state.activeJob = job;
    state.jobs = [job, ...state.jobs.filter((item) => item.id !== job.id)];
    renderJobs();
    renderJobSelect();
    selectJob(job.id);
    if (shouldOpenHistoryInEditMode()) {
      setTimeout(() => setPreviewEditing(true), 500);
    }
    sessionStorage.removeItem("ppt-html-studio-open-history-id");
    sessionStorage.removeItem("ppt-html-studio-open-history-edit");
    setStatus(state.language === "zh" ? "已打开本地历史记录。" : "Local history record opened.", "ok");
  } catch (error) {
    setStatus(error.message || (state.language === "zh" ? "无法打开本地历史记录。" : "Could not open local history."), "error");
  }
}

function setPreviewEditing(force = null) {
  if (!state.activeJob) {
    setStatus(t("generateOrSelect"), "error");
    return false;
  }
  if (!hasEditablePreview()) {
    setStatus("This preview was generated before in-place editing was added. Regenerate the PPT, or open the preview and use Download Edited ZIP there.", "error");
    return false;
  }
  const shouldEdit = force === null ? !isPreviewEditing() : Boolean(force);
  if (isPreviewEditing() !== shouldEdit) {
    ensurePreviewEditorApi().toggleEdit();
  }
  document.body.classList.toggle("preview-editor-active", shouldEdit);
  document.querySelector(".preview-panel")?.classList.toggle("editor-active", shouldEdit);
  if (shouldEdit) {
    if (state.workbench) state.workbench.setMode("ai", true);
    else installPlatformEditorSurface();
  } else {
    state.workbench?.setMode("preview", true);
    setPlatformEditorSelected(null);
  }
  updatePreviewEditButton(shouldEdit);
  syncPreviewScale();
  setStatus(shouldEdit ? (state.language === "zh" ? "\u6b63\u5728\u9884\u89c8\u4e2d\u7f16\u8f91\u3002\u9009\u62e9\u6587\u5b57\u540e\u53ef\u8c03\u6574\u6837\u5f0f\u6216\u4e0b\u8f7d ZIP\u3002" : "Editing in the preview. Select text, then use style buttons or download ZIP.") : (state.language === "zh" ? "\u5df2\u505c\u6b62\u9884\u89c8\u7f16\u8f91\u3002" : "Preview editing stopped."), shouldEdit ? "ok" : "");
  return true;
}

async function savePreviewEditsToServer(job, options = {}) {
  if (!job) return null;
  let captured = null;
  try {
    captured = await captureJobHtml(job, true);
  } catch (error) {
    if (options.requireEditable) {
      throw new Error(error.message || "The current preview cannot export edited HTML. Regenerate this PPT, then edit inside the preview frame.");
    }
    return null;
  }
  const localJob = updateLocalJobHtml(job, captured.pagedHtml, captured.scrollHtml);
  state.activeJob = localJob;
  let data = { job: localJob, share: state.activeShare || localJob.share, localOnly: true };
  try {
    const response = await fetch(apiUrl(`/api/jobs/${job.id}/save-edited`), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pagedHtml: captured.pagedHtml, scrollHtml: captured.scrollHtml }),
    });
    data = await readJsonResponse(response, "Could not save edited HTML");
    const hydrated = hydrateInlineJob({
      ...(data.job || localJob),
      historyRecordId: job.historyRecordId || localJob.historyRecordId,
      inlinePreviewHtml: captured.pagedHtml,
      inlineScrollHtml: captured.scrollHtml,
    });
    state.activeJob = hydrated;
    state.jobs = state.jobs.map((item) => item.id === job.id ? hydrated : item);
  } catch {
    data = { job: localJob, share: state.activeShare || localJob.share, localOnly: true };
  }
  state.activeShare = hydrateShare(data.share || state.activeShare);
  renderJobs();
  renderJobSelect();
  el("jobSelect").value = state.activeJob.id;
  renderShare(state.activeShare || state.activeJob.share || null);
  if (state.activeJob?.historyRecordId && window.PptHistory) {
    try {
      await window.PptHistory.saveEditedHtml(state.activeJob.historyRecordId, captured.pagedHtml, captured.scrollHtml);
    } catch (error) {
      console.warn("Could not update converter history edited HTML", error);
    }
  }
  setStatus(data.localOnly ? t("saveBrowserOnly") : t("savedEdited"), "ok");
  return data;
}

async function downloadJobZip(job) {
  if (!job) return;
  const button = el("downloadJob");
  const oldText = button?.textContent;
  try {
    if (button) {
      button.disabled = true;
      button.textContent = t("packaging");
    }
    setStatus(t("packagingStatus"));
    const captured = await captureJobHtml(job, true);
    const latestJob = updateLocalJobHtml(job, captured.pagedHtml, captured.scrollHtml);
    if (latestJob.historyRecordId && window.PptHistory) {
      try {
        await window.PptHistory.saveEditedHtml(latestJob.historyRecordId, captured.pagedHtml, captured.scrollHtml);
      } catch (error) {
        console.warn("Could not update converter history before download", error);
      }
    }
    const zipUrl = await makeClientZipUrl(latestJob, captured.pagedHtml, captured.scrollHtml);
    setStatus(t("downloadingLatest"), "ok");
    triggerDownload(zipUrl, `${latestJob.id || "optimized-ppt"}.zip`);
  } catch (error) {
    setStatus(error.message || (state.language === "zh" ? "\u65e0\u6cd5\u6253\u5305\u4fee\u6539\u540e\u7684 HTML\u3002" : "Could not package the edited HTML."), "error");
  } finally {
    if (button) {
      button.disabled = false;
      button.textContent = oldText || t("downloadZip");
    }
  }
}

function downloadById(jobId) {
  const job = state.jobs.find((item) => item.id === jobId) || state.activeJob;
  if (job) downloadJobZip(job);
}

async function analyzeShare(jobId = null) {
  const job = state.jobs.find((item) => item.id === jobId) || state.activeJob;
  const shareButton = el("shareJob");
  if (!job) {
    setStatus(t("generateOrSelect"), "error");
    renderShareMessage(t("shareFirst"), "blocked");
    return;
  }
  try {
    setStatus(t("analyzingShare"));
    renderShareMessage(t("checkingShare"), "checking");
    if (shareButton) shareButton.disabled = true;
    const response = await fetch(apiUrl(`/api/jobs/${job.id}/share`), { method: "GET", cache: "no-store" });
    const data = await readJsonResponse(response, "Share analysis failed");
    state.activeJob = hydrateInlineJob(data.job);
    state.activeShare = hydrateShare(data.share);
    state.jobs = state.jobs.map((item) => item.id === data.job.id ? data.job : item);
    renderJobs();
    renderJobSelect();
    el("jobSelect").value = data.job.id;
    renderShare(data.share);
    setStatus(data.share.status === "blocked" ? t("shareMissing") : t("shareReady"), data.share.status === "blocked" ? "error" : "ok");
  } catch (error) {
    setStatus(error.message, "error");
    renderShareMessage(error.message || "Share analysis failed.", "blocked");
  } finally {
    if (shareButton) shareButton.disabled = false;
  }
}

function renderShareMessage(message, status = "checking") {
  const panel = el("sharePanel");
  panel.classList.remove("hidden");
  const badgeLabel = {
    checking: t("checking"),
    ready: t("ready"),
    warning: t("warning"),
    blocked: t("blocked"),
  }[status] || t("checking");
  el("shareBadge").textContent = badgeLabel;
  el("shareBadge").className = `share-badge ${status}`;
  el("shareSummary").textContent = message;
  el("shareStats").innerHTML = "";
}

function renderShare(share) {
  const panel = el("sharePanel");
  if (!share) {
    panel.classList.add("hidden");
    return;
  }
  panel.classList.remove("hidden");
  el("shareBadge").textContent = share.status === "ready" ? t("ready") : share.status === "warning" ? t("warning") : t("blocked");
  el("shareBadge").className = `share-badge ${share.status}`;
  el("shareSummary").textContent = share.recommendation || "";
  el("shareStats").innerHTML = [
    [t("images"), share.totalImages ?? 0],
    [t("embedded"), share.embeddedImages ?? 0],
    [t("missing"), share.missingImages ?? 0],
    [t("riskyPaths"), share.riskyPaths ?? 0],
    [t("external"), share.externalImages ?? 0],
  ].map(([label, value]) => `<span><strong>${value}</strong>${label}</span>`).join("");
}

function openShareUrl(kind) {
  const share = state.activeShare || state.activeJob?.share;
  if (kind === "zip" && state.activeJob) {
    downloadJobZip(state.activeJob);
    return;
  }
  if (!share) return;
  const url = {
    zip: share.zipPackageUrl || state.activeJob?.downloadUrl,
    single: share.singleFileUrl,
    scrollSingle: share.scrollSingleFileUrl,
    report: share.reportUrl,
  }[kind];
  if (url) window.open(url, "_blank");
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;",
  }[char]));
}

async function loadIntegration() {
  try {
    const response = await fetch(apiUrl("/api/integration"));
    const data = await readJsonResponse(response, t("couldNotLoadApi"));
    state.integration = { ...state.integration, ...(data.integration || {}) };
    renderIntegration();
  } catch {
    setApiStatus(t("couldNotLoadApi"), "error");
  }
}

function collectIntegration(includeKey = false, options = {}) {
  syncModeFromProvider();
  const mode = el("apiMode").value;
  const payload = {
    mode,
    endpoint: el("apiEndpoint").value.trim(),
    apiKeyHeader: el("apiKeyHeader").value,
    apiKeyPrefix: el("apiKeyPrefix").value,
    customHeaders: el("customHeaders").value.trim(),
    workflowPayload: el("workflowPayload").value,
    model: el("apiModel").value.trim(),
    timeoutSec: 0,
    fallbackToLocal: mode === "local",
    clearApiKey: Boolean(options.allowClear && el("clearApiKey").checked),
  };
  const apiKey = el("apiKey").value.trim();
  if (includeKey && apiKey) payload.apiKey = apiKey;
  return payload;
}

function renderIntegration() {
  state.apiProvider = inferApiProvider(state.integration);
  el("apiProvider").value = state.apiProvider;
  el("apiMode").value = state.integration.mode || "local";
  el("apiEndpoint").value = state.integration.endpoint || "";
  el("apiKeyHeader").value = state.integration.apiKeyHeader || "Authorization";
  el("apiKeyPrefix").value = state.integration.apiKeyPrefix ?? "Bearer ";
  el("customHeaders").value = state.integration.customHeaders || "";
  el("workflowPayload").value = state.integration.workflowPayload || "flat";
  el("apiModel").value = state.integration.model || "";
  el("apiTimeout").value = 0;
  el("fallbackToLocal").checked = state.integration.mode === "local";
  el("clearApiKey").checked = false;
  updateProviderUi();
  const isLocalMode = state.integration.mode === "local";
  const modeLabel = isLocalMode ? t("localRulesActive") : providerLabel(state.apiProvider);
  const localKey = localApiKeyForCurrentProvider();
  const keyLabel = !isLocalMode && (localKey || state.integration.hasApiKey) ? ` Key: ${maskedKey(localKey) || state.integration.apiKeyMasked}` : "";
  el("apiKeyNote").textContent = isLocalMode
    ? t("localRulesNoKey")
    : (localKey || state.integration.hasApiKey)
      ? t("savedKey", { key: maskedKey(localKey) || state.integration.apiKeyMasked })
      : t("noSavedKeyPaste");
  setApiStatus(`${modeLabel}.${keyLabel}`, state.integration.mode === "local" ? "" : "ok");
  refreshSharedAiStatus();
}

function inferApiProvider(integration) {
  const mode = integration.mode || "local";
  const endpoint = (integration.endpoint || "").toLowerCase();
  if (mode === "local") return "local";
  if (mode === "workflow_api" && integration.workflowPayload === "dify") return "dify";
  if (mode === "workflow_api") return "workflow";
  if (endpoint.includes("api.deepseek.com")) return "deepseek";
  if (endpoint.includes("ark.cn-beijing.volces.com") || endpoint.includes("volces.com/api/v3")) return "doubao_seed";
  if (endpoint.includes("api.openai.com")) return "openai";
  return "custom_ai";
}

function syncModeFromProvider() {
  const provider = el("apiProvider").value;
  const preset = apiProviders[provider] || apiProviders.local;
  el("apiMode").value = preset.mode;
}

function applyProviderPreset(provider, overwrite = true) {
  const preset = apiProviders[provider] || apiProviders.local;
  state.apiProvider = provider;
  el("apiMode").value = preset.mode;
  if (overwrite) {
    if (preset.endpoint) el("apiEndpoint").value = preset.endpoint;
    if (Object.prototype.hasOwnProperty.call(preset, "model")) el("apiModel").value = preset.model || "";
    if (preset.apiKeyHeader) el("apiKeyHeader").value = preset.apiKeyHeader;
    if (Object.prototype.hasOwnProperty.call(preset, "apiKeyPrefix")) el("apiKeyPrefix").value = preset.apiKeyPrefix;
    if (Object.prototype.hasOwnProperty.call(preset, "customHeaders")) el("customHeaders").value = preset.customHeaders || "";
    if (preset.workflowPayload) el("workflowPayload").value = preset.workflowPayload;
    if (preset.timeoutSec) el("apiTimeout").value = preset.timeoutSec;
    el("fallbackToLocal").checked = preset.mode === "local";
  }
  updateProviderUi();
}

function updateProviderUi() {
  const provider = el("apiProvider").value;
  const isLocal = provider === "local";
  const isWorkflow = provider === "workflow" || provider === "dify";
  el("apiEndpointField").classList.toggle("api-hidden", isLocal);
  el("apiModelField").classList.toggle("api-hidden", isLocal || isWorkflow);
  el("apiKey").closest("label").classList.toggle("api-hidden", isLocal);
  if (isLocal) {
    el("apiKeyNote").textContent = t("localRulesNoKey");
  } else if (localApiKeyForCurrentProvider() || state.integration.hasApiKey) {
    el("apiKeyNote").textContent = t("savedKey", { key: maskedKey(localApiKeyForCurrentProvider()) || state.integration.apiKeyMasked });
  } else {
    el("apiKeyNote").textContent = t("pasteKeyOnce");
  }
}

function setApiStatus(message, kind = "") {
  el("apiStatus").textContent = message;
  el("apiStatus").className = `api-status ${kind}`;
}

async function saveIntegration(showSuccess = true, allowClear = true) {
  const optimizationMode = document.getElementById("optimizationMode")?.value || "local";
  if (optimizationMode !== "ai") {
    state.integration = { ...state.integration, mode: "local", fallbackToLocal: true };
    state.apiProvider = "local";
    refreshSharedAiStatus();
    if (showSuccess && document.getElementById("apiStatus")) {
      setApiStatus(t("localRulesActive"), "ok");
    }
    return { mode: "local", fallbackToLocal: true };
  }
  if (window.PptAiConfig) {
    const shared = window.PptAiConfig.loadAiConfig();
    if (!window.PptAiConfig.hasValidAiConfig(shared)) {
      refreshSharedAiStatus();
      throw new Error(state.language === "zh" ? "请先前往 AI 配置页面设置 API。" : "Please configure AI in AI Settings first.");
    }
    syncLegacyAiFields(shared);
    try {
      await window.PptAiConfig.syncAiConfig(shared);
    } catch {
      // The browser request still carries the config, so generation can continue.
    }
    refreshSharedAiStatus();
    if (showSuccess) setApiStatus(state.language === "zh" ? "已使用统一 AI 配置。" : "Using shared AI settings.", "ok");
    return state.integration;
  }
  const integration = collectIntegration(true, { allowClear });
  const typedKey = el("apiKey").value.trim();
  if (typedKey && integration.mode !== "local") {
    const secret = readLocalApiSecret();
    secret[state.apiProvider] = typedKey;
    if (integration.endpoint) secret[integration.endpoint] = typedKey;
    writeLocalApiSecret(secret);
  }
  if (integration.clearApiKey) {
    const secret = readLocalApiSecret();
    delete secret[state.apiProvider];
    if (integration.endpoint) delete secret[integration.endpoint];
    writeLocalApiSecret(secret);
  }
  if (!integration.apiKey && integration.mode !== "local") {
    integration.apiKey = localApiKeyForCurrentProvider();
  }
  const response = await fetch(apiUrl("/api/integration"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ integration }),
  });
  const data = await readJsonResponse(response, t("couldNotSaveApi"));
  state.integration = { ...state.integration, ...(data.integration || {}) };
  state.apiProvider = inferApiProvider(state.integration);
  el("apiKey").value = "";
  el("clearApiKey").checked = false;
  renderIntegration();
  if (showSuccess) setApiStatus(t("apiSettingsSaved"), "ok");
  return state.integration;
}

async function testIntegration() {
  try {
    setApiStatus(t("testingApi"));
    await saveIntegration(false, false);
    const response = await fetch(apiUrl("/api/integration/test"), { method: "POST" });
    const data = await readJsonResponse(response, t("apiTestFailed"));
    if (!data.ok) throw new Error(data.message || data.error || t("apiTestFailed"));
    setApiStatus(data.message || t("apiTestPassed"), "ok");
  } catch (error) {
    setApiStatus(error.message, "error");
  }
}

async function checkHealth() {
  try {
    const response = await fetch("/api/health");
    if (!response.ok) throw new Error("bad");
    let data = await readJsonResponse(response, t("backendHealthFailed")).catch(() => ({}));
    const externalBackend = normalizeBaseUrl(data.externalBackendOrigin || data.publicBackendOrigin || "");
    if (externalBackend) {
      state.apiBaseUrl = externalBackend;
      const externalResponse = await fetch(apiUrl("/api/health"));
      data = await readJsonResponse(externalResponse, t("externalBackendHealthFailed"));
      data.runtime = data.runtime || "external";
      data.usingExternalBackend = true;
    } else {
      state.apiBaseUrl = "";
    }
    state.runtime = data.runtime || "local";
    state.maxRequestBytes = Number(data.maxPayloadBytes || data.maxRequestBytes || 150 * 1024 * 1024);
    if (data.maxRawUploadBytes) {
      state.maxUploadBytes = Number(data.maxRawUploadBytes);
    } else if (data.maxRawUploadMb) {
      state.maxUploadBytes = Number(data.maxRawUploadMb) * 1024 * 1024;
    } else if (state.runtime === "vercel") {
      state.maxUploadBytes = Math.floor(Number(data.maxUploadMb || 4) * 1024 * 1024 * 0.62);
    } else {
      state.maxUploadBytes = Number(data.maxUploadMb || 100) * 1024 * 1024;
    }
    el("health").textContent = t("backendReady");
    el("health").classList.add("ok");
    const uploadLimit = el("uploadLimitText");
    if (uploadLimit) {
      const prefix = data.usingExternalBackend ? `External backend: ${state.apiBaseUrl}. ` : "";
      uploadLimit.textContent = `${prefix}${uploadLimitMessage()}`;
    }
  } catch {
    state.apiBaseUrl = "";
    el("health").textContent = t("backendOffline");
    el("health").classList.add("error");
  }
}

async function init() {
  applyTheme(state.theme);
  translateStaticUi();
  setSourceMode(state.sourceMode, false);
  renderSteps();
  renderStyles();
  bindEvents();
  if (new URLSearchParams(window.location.search).get("manageStyles") === "1") {
    state.stylesExpanded = true;
    renderStyles();
    requestAnimationFrame(() => document.querySelector(".style-section")?.scrollIntoView({ behavior: "smooth", block: "start" }));
  }
  syncPreviewScale();
  await checkHealth();
  await loadIntegration();
  await loadJobs();
  state.workbench = window.PptDeckWorkbench?.create({
    iframe: "#previewFrame",
    section: ".preview-panel",
    editButton: "#editHtml",
    chatAfterLoad: false,
    editMode: "ai",
  });
  await restoreConverterHistoryFromUrl();
}

function bindEvents() {
  const dropZone = el("dropZone");
  const fileInput = el("fileInput");
  document.querySelectorAll("[data-source-mode]").forEach((button) => {
    button.addEventListener("click", () => setSourceMode(button.dataset.sourceMode));
  });
  const referenceInput = el("referenceInput");
  if (window.PptReferencePack && referenceInput) {
    state.referencePackController = window.PptReferencePack.attach({
      input: referenceInput,
      list: el("referenceFiles"),
      initial: state.referencePack,
      onChange: (pack, error) => {
        if (error) {
          const list = el("referenceFiles");
          if (list) list.insertAdjacentHTML("beforeend", `<span class="reference-error">${escapeHtml(error.message || error)}</span>`);
          return;
        }
        state.referencePack = pack;
      },
    });
  }
  el("helpButton").addEventListener("click", openHelp);
  el("closeHelp").addEventListener("click", closeHelp);
  el("helpOverlay").addEventListener("click", (event) => {
    if (event.target === el("helpOverlay")) closeHelp();
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !el("helpOverlay").classList.contains("hidden")) closeHelp();
    if (event.key === "Escape" && !el("settingsOverlay").classList.contains("hidden")) closeSettings();
    if (event.key === "Escape" && !el("customStyleOverlay").classList.contains("hidden")) closeCustomStyle();
  });
  el("settingsButton").addEventListener("click", openSettings);
  el("closeSettings").addEventListener("click", closeSettings);
  el("settingsOverlay").addEventListener("click", (event) => {
    if (event.target === el("settingsOverlay")) closeSettings();
  });
  el("languageSelect").addEventListener("change", (event) => {
    applyLanguage(event.target.value);
  });
  el("themeSelect")?.addEventListener("change", (event) => {
    applyTheme(event.target.value);
  });
  el("newCustomStyle")?.addEventListener("click", () => openCustomStyle(activeCustomStyle()));
  el("importStylePpt")?.addEventListener("click", () => el("styleImportInput")?.click());
  el("styleImportInput")?.addEventListener("change", (event) => importCustomStyleFromPpt(event.target.files?.[0]));
  el("closeCustomStyle")?.addEventListener("click", closeCustomStyle);
  el("customStyleOverlay")?.addEventListener("click", (event) => {
    if (event.target === el("customStyleOverlay")) closeCustomStyle();
  });
  el("saveCustomStyle")?.addEventListener("click", saveCustomStyleFromForm);
  el("deleteCustomStyle")?.addEventListener("click", deleteCustomStyleFromForm);
  ["customStyleName", "customStyleTitleFont", "customStyleBodyFont", "customStyleLayout", "customStyleBg", "customStyleText", "customStylePrimary", "customStyleAccent", "customStylePrompt", "customStyleLocalRules"].forEach((id) => {
    el(id)?.addEventListener("input", updateCustomStylePreview);
    el(id)?.addEventListener("change", updateCustomStylePreview);
  });
  el("toggleStyles")?.addEventListener("click", () => {
    state.stylesExpanded = !state.stylesExpanded;
    renderStyles();
  });
  el("optimizationMode")?.addEventListener("change", () => {
    refreshSharedAiStatus();
    state.activeStep = Math.max(state.activeStep, 2);
    renderSteps();
  });
  dropZone.addEventListener("click", (event) => {
    if (event.target.tagName !== "INPUT") fileInput.click();
  });
  fileInput.addEventListener("change", () => handleFile(fileInput.files[0]));
  ["dragenter", "dragover"].forEach((name) => dropZone.addEventListener(name, (event) => {
    event.preventDefault();
    dropZone.classList.add("dragging");
  }));
  ["dragleave", "drop"].forEach((name) => dropZone.addEventListener(name, (event) => {
    event.preventDefault();
    dropZone.classList.remove("dragging");
  }));
  dropZone.addEventListener("drop", (event) => handleFile(event.dataTransfer.files[0]));
  el("clearFile").addEventListener("click", () => {
    state.selectedFile = null;
    state.activeStep = 0;
    fileInput.value = "";
    el("fileCard").classList.add("hidden");
    setStatus("");
    renderSteps();
  });
  el("runButton").addEventListener("click", generate);
  el("closeGenerationOverlay").addEventListener("click", hideGenerationOverlay);
  el("apiProvider").addEventListener("change", (event) => {
    applyProviderPreset(event.target.value, true);
    state.activeStep = Math.max(state.activeStep, 2);
    renderSteps();
  });
  el("saveApiSettings").addEventListener("click", async () => {
    try {
      setApiStatus(t("savingApiSettings"));
      await saveIntegration(true, true);
    } catch (error) {
      setApiStatus(error.message, "error");
    }
  });
  el("testApiSettings").addEventListener("click", testIntegration);
  el("refreshJobs").addEventListener("click", loadJobs);
  el("jobSelect").addEventListener("change", (event) => selectJob(event.target.value));
  el("openPreview").addEventListener("click", () => {
    if (state.activeJob) openPlayableJobPreview(state.activeJob);
  });
  el("previewFrame").addEventListener("load", () => {
    try {
      el("previewFrame").contentWindow?.scrollTo?.(0, 0);
      const doc = el("previewFrame").contentDocument;
      if (doc) {
        doc.documentElement.scrollTop = 0;
        doc.body.scrollTop = 0;
      }
    } catch {}
    updatePreviewEditButton(false);
    syncPreviewScale();
    setTimeout(detectQuickFixIssues, 120);
  });
  el("fitButton")?.addEventListener("click", () => {
    syncPreviewScale();
    el("previewFrame")?.closest(".preview-frame")?.scrollIntoView({ behavior: "smooth", block: "center" });
  });
  window.addEventListener("resize", syncPreviewScale);
  window.addEventListener("orientationchange", syncPreviewScale);
  if ("ResizeObserver" in window) {
    const previewResizeObserver = new ResizeObserver(syncPreviewScale);
    previewResizeObserver.observe(el("previewFrame").closest(".preview-frame"));
  }
  el("editHtml").addEventListener("click", () => setPreviewEditing(null));
  el("saveEditedHtml").addEventListener("click", async () => {
    try {
      await savePreviewEditsToServer(state.activeJob, { requireEditable: true });
    } catch (error) {
      setStatus(error.message || "Could not save edited HTML.", "error");
    }
  });
  el("openScrollHtml").addEventListener("click", () => {
    if (state.activeJob) window.open(state.activeJob.scrollUrl || state.activeJob.previewUrl, "_blank");
  });
  Object.entries(QUICK_FIX_BUTTONS).forEach(([kind, id]) => {
    el(id)?.addEventListener("click", async () => {
      try {
        await applyQuickFix(kind);
      } catch (error) {
        setStatus(error.message || "Quick fix failed.", "error");
      }
    });
  });
  el("shareJob").addEventListener("click", () => analyzeShare());
  el("downloadJob").addEventListener("click", () => downloadJobZip(state.activeJob));
  el("downloadShareZip").addEventListener("click", () => openShareUrl("zip"));
  el("openSingleFile").addEventListener("click", () => openShareUrl("single"));
  el("openScrollSingleFile").addEventListener("click", () => openShareUrl("scrollSingle"));
  el("openShareReport").addEventListener("click", () => openShareUrl("report"));
}

init();


