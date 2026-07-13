const steps = [
  ["Upload File", "Add your PPT file"],
  ["Choose Style", "Pick a visual style"],
  ["Choose Method", "Local rules or AI"],
  ["Edit", "Review and refine HTML"],
];

const styles = [
  ["teaching", "Teaching Blue"],
  ["softlesson", "Soft Lesson"],
  ["clean", "Clean"],
  ["academic", "Academic Style"],
  ["instructional", "Instructional"],
  ["minimal", "Minimal"],
  ["contrast", "High Contrast"],
  ["healing", "Healing Hand-drawn"],
  ["doodle", "Doodle Sketch"],
  ["swiss", "Swiss Grid"],
  ["editorial", "Editorial"],
  ["vivid", "Vivid"],
];

const LANGUAGE_STORAGE_KEY = "ppt-html-studio-language";
const i18n = {
  en: {
    help: "Help",
    settings: "Settings",
    language: "Language",
    interfaceLanguage: "Interface language",
    languageHint: "This only changes the platform interface. Generated PPT/HTML content stays unchanged.",
    english: "English",
    chinese: "\u4e2d\u6587",
    close: "Close",
    apply: "Apply",
    workflowTip: "Workflow tip",
    workflowTipBody: "Follow the steps from top to bottom. Download exports a ZIP with HTML and images.",
    stepUpload: "Upload File",
    stepUploadDesc: "Add your PPT file",
    stepStyle: "Choose Style",
    stepStyleDesc: "Pick a visual style",
    stepMethod: "Choose Method",
    stepMethodDesc: "Local rules or AI",
    stepEdit: "Edit",
    stepEditDesc: "Review and refine HTML",
    uploadPpt: "Upload PPT",
    checkingBackend: "Checking backend",
    backendReady: "Backend ready",
    backendOffline: "Backend offline",
    dragDrop: "Drag & drop your PPT file here",
    or: "or",
    checkingUploadLimit: "Checking upload limit...",
    selected: "selected",
    style: "Style",
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
    noGeneratedDesc: "Upload a PPT and run the workflow to see the first slide here.",
    fit: "Fit",
    editHtml: "Edit HTML",
    stopEditing: "Stop Editing",
    saveEdits: "Save Edits",
    openScrollHtml: "Open Scroll HTML",
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
    uploadLimitCloudflare: "Cloudflare-only mode supports .pptx files up to about {size}. Old .ppt files require the local Python backend.",
    uploadLimitServerless: "Serverless mode supports PPT files up to about {size}. Larger files need local running or dedicated storage.",
    uploadLimitDefault: "Supports .ppt and .pptx up to {size}",
    fileTooLarge: "{name} is {fileSize}, which is larger than this deployment can safely upload ({limit}). Run the app locally for larger PPT files.",
    readyGenerate: "Ready to generate.",
    uploadFirst: "Upload PPT first.",
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
    interfaceLanguage: "\u754c\u9762\u8bed\u8a00",
    languageHint: "\u8fd9\u91cc\u53ea\u5207\u6362\u5e73\u53f0\u754c\u9762\u8bed\u8a00\uff0c\u4e0d\u4f1a\u6539\u53d8\u751f\u6210\u7684 PPT/HTML \u5185\u5bb9\u3002",
    english: "English",
    chinese: "\u4e2d\u6587",
    close: "\u5173\u95ed",
    apply: "\u5e94\u7528",
    workflowTip: "\u5de5\u4f5c\u6d41\u63d0\u793a",
    workflowTipBody: "\u6309\u4ece\u4e0a\u5230\u4e0b\u7684\u6b65\u9aa4\u64cd\u4f5c\u3002\u4e0b\u8f7d\u4f1a\u5bfc\u51fa\u5305\u542b HTML \u548c\u56fe\u7247\u7684 ZIP \u5305\u3002",
    stepUpload: "\u4e0a\u4f20\u6587\u4ef6",
    stepUploadDesc: "\u6dfb\u52a0 PPT \u6587\u4ef6",
    stepStyle: "\u9009\u62e9\u98ce\u683c",
    stepStyleDesc: "\u9009\u62e9\u89c6\u89c9\u6837\u5f0f",
    stepMethod: "\u9009\u62e9\u4f18\u5316\u65b9\u5f0f",
    stepMethodDesc: "\u672c\u5730\u89c4\u5219\u6216 AI",
    stepEdit: "\u7f16\u8f91",
    stepEditDesc: "\u68c0\u67e5\u5e76\u5fae\u8c03 HTML",
    uploadPpt: "\u4e0a\u4f20 PPT",
    checkingBackend: "\u6b63\u5728\u68c0\u67e5\u540e\u7aef",
    backendReady: "\u540e\u7aef\u5df2\u5c31\u7eea",
    backendOffline: "\u540e\u7aef\u79bb\u7ebf",
    dragDrop: "\u5c06 PPT \u6587\u4ef6\u62d6\u5230\u8fd9\u91cc",
    or: "\u6216",
    checkingUploadLimit: "\u6b63\u5728\u68c0\u67e5\u4e0a\u4f20\u9650\u5236...",
    selected: "\u5df2\u9009\u62e9",
    style: "\u98ce\u683c",
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
    noGeneratedDesc: "\u4e0a\u4f20 PPT \u5e76\u8fd0\u884c\u5de5\u4f5c\u6d41\u540e\uff0c\u8fd9\u91cc\u4f1a\u663e\u793a\u7b2c\u4e00\u9875\u9884\u89c8\u3002",
    fit: "\u9002\u914d",
    editHtml: "\u7f16\u8f91 HTML",
    stopEditing: "\u505c\u6b62\u7f16\u8f91",
    saveEdits: "\u4fdd\u5b58\u4fee\u6539",
    openScrollHtml: "\u6253\u5f00\u6ed1\u52a8\u7248 HTML",
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
    uploadLimitCloudflare: "Cloudflare-only \u6a21\u5f0f\u652f\u6301\u7ea6 {size} \u4ee5\u5185\u7684 .pptx \u6587\u4ef6\u3002\u65e7 .ppt \u6587\u4ef6\u9700\u8981\u4f7f\u7528\u672c\u5730 Python \u540e\u7aef\u3002",
    uploadLimitServerless: "Serverless \u6a21\u5f0f\u652f\u6301\u7ea6 {size} \u4ee5\u5185\u7684 PPT \u6587\u4ef6\u3002\u66f4\u5927\u7684\u6587\u4ef6\u9700\u8981\u672c\u5730\u8fd0\u884c\u6216\u4e13\u7528\u5b58\u50a8\u3002",
    uploadLimitDefault: "\u652f\u6301 .ppt \u548c .pptx\uff0c\u6700\u5927 {size}",
    fileTooLarge: "{name} \u5927\u5c0f\u4e3a {fileSize}\uff0c\u8d85\u8fc7\u5f53\u524d\u90e8\u7f72\u53ef\u5b89\u5168\u4e0a\u4f20\u7684\u9650\u5236\uff08{limit}\uff09\u3002\u66f4\u5927\u7684 PPT \u8bf7\u5728\u672c\u5730\u8fd0\u884c\u3002",
    readyGenerate: "\u5df2\u51c6\u5907\u751f\u6210\u3002",
    uploadFirst: "\u8bf7\u5148\u4e0a\u4f20 PPT\u3002",
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
};

const stylePreviewMeta = {
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
  return stylePreviewMeta[key] || stylePreviewMeta.teaching;
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
    timeoutSec: 300,
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

const state = {
  selectedFile: null,
  selectedStyle: "teaching",
  language: localStorage.getItem(LANGUAGE_STORAGE_KEY) === "zh" ? "zh" : "en",
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
  inlineObjectUrls: [],
  integration: {
    mode: "local",
    endpoint: "",
    apiKeyHeader: "Authorization",
    apiKeyPrefix: "Bearer ",
    customHeaders: "",
    workflowPayload: "flat",
    model: "gpt-4.1-mini",
    timeoutSec: 300,
    fallbackToLocal: true,
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
  const integration = collectIntegration(false, { allowClear: false });
  const savedKey = localApiKeyForCurrentProvider();
  if (integration.mode !== "local") {
    integration.apiKey = el("apiKey").value.trim() || savedKey;
    integration.timeoutSec = Math.max(300, Number(integration.timeoutSec || 300));
    integration.fallbackToLocal = true;
  }
  return integration;
}

function isAiRecoverableError(message) {
  return /timeout|timed out|aborted|operation was aborted|insufficient balance|insufficient_balance|insufficient quota|insufficient_quota|quota|billing|\u4f59\u989d|\u6b20\u8d39|\u9650\u989d|rate limit|too many requests/i.test(String(message || ""));
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
  const map = {
    teaching: "Teaching Blue: calm education technology, navy text, blue accents, lecture-friendly hierarchy.",
    softlesson: "Soft Lesson: warm white background, gentle blue accents, quiet workshop feeling.",
    healing: "Healing Hand-drawn: soft hand-drawn workshop style, warm paper feeling, sketch-like but readable.",
    doodle: "Doodle Sketch: playful marker style, hand-drawn typography, sparse doodle accents, clean classroom layout.",
    swiss: "Swiss Grid: strict grid, strong typography, blue rules, no decoration.",
    editorial: "Editorial: magazine-like, elegant serif titles, large whitespace, pull-quote rhythm.",
    academic: "Academic: scholarly, formal, serif title accents, clear lecture structure.",
    minimal: "Minimal: few elements, simple typography, high whitespace.",
    vivid: "Vivid: bright education product energy, controlled accent blocks.",
    contrast: "High Contrast: accessible dark/light contrast and bold hierarchy.",
  };
  return map[style] || map.teaching;
}

function clientAiPrompt(slides, style) {
  const compactSlides = slides.map((slide) => ({
    page: slide.page,
    title: slide.title,
    body: slide.body.slice(0, 20),
    imageCount: slide.images.length,
    hasImages: slide.images.length > 0,
  }));
  return `Generate a complete standalone editable HTML slide deck in English.
Style: ${clientStylePrompt(style)}
Rules:
- Return only HTML.
- Generate exactly ${slides.length} slide sections in the same order.
- Every section must include data-slide-page="original page number".
- Every slide must use the same 16:9 canvas size. Use section dimensions such as width:100vw; height:100vh; box-sizing:border-box, with consistent safe margins.
- Slide titles must be visually dominant, horizontally centered, and placed in a balanced central title area. The first/cover slide must center the title group both horizontally and vertically, not near the top edge.
- Use a clean, elegant, modern education/workshop layout: generous whitespace, simple alignment, readable hierarchy, and no crowded corners.
- Preserve the original PPT's rough layout type; do not turn every page into an outline, card grid, or numbered list.
- Never use a single isolated word, a single letter, XML markup, or a broken word fragment as a slide title. If the extracted title looks broken, use the nearest complete phrase from the slide content.
- Keep words intact. Do not split words across lines by letters, do not create one-letter headings, and do not turn normal sentences into one-word bullet fragments.
- Never use vertical writing, one-character-per-line text, ultra-narrow text columns, CSS writing-mode vertical, word-break: break-all, or overflow-wrap:anywhere for normal text.
- Do not invent repeated labels such as "Chapter 01", "Chapter 02", unless the original slide explicitly contains that chapter text.
- Body text > 30pt, titles > 45pt and usually 52-72pt, no scrollable text boxes, no overflow.
- Text and background colors must have strong visible contrast. Never use white/light text on cream, pale, or white backgrounds; never use dark text on dark backgrounds.
- If a slide has images, reserve clear visual areas for the original PPT images using only empty placeholders. Use <figure data-image-slot="page-number"></figure> for one image, or <figure data-image-slot="page-number-a"></figure>, <figure data-image-slot="page-number-b"></figure> for multiple images. Never create fake image paths, empty <img src=""> tags, or visible labels such as "page-8a".
- Image areas must be proportional to the amount of text. Images should usually occupy 28-42% of the slide width, max 44vh tall when text is present, and must never overlap text or navigation.
- Do not create oversized navigation controls. The platform will inject small working Prev/Next controls automatically. Include window.toggleEdit(force), window.exportEditedHtml(mode).
PPT JSON:
${JSON.stringify({ style, slideCount: slides.length, slides: compactSlides }).slice(0, 65000)}`;
}

function extractHtmlFromAiText(text) {
  const raw = String(text || "").trim();
  const fenced = raw.match(/```(?:html)?\s*([\s\S]*?)```/i)?.[1]?.trim();
  const candidate = fenced || raw;
  if (/<html[\s>]/i.test(candidate) || /<!doctype html/i.test(candidate)) return candidate;
  if (/<body[\s>]/i.test(candidate)) return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>${candidate}</html>`;
  if (/<section[\s>]/i.test(candidate) || /class=["'][^"']*\bslide\b/i.test(candidate)) return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>AI PPT HTML</title></head><body>${candidate}</body></html>`;
  return "";
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

function clientImageBlock(slide) {
  if (!slide?.images?.length) return "";
  return `<div class="ppt-original-images" data-original-images="${slide.page}" data-count="${slide.images.length}">${slide.images.map((image, index) => `<figure class="media-box original-ppt-image"><img src="${image.src}" alt="Original PPT slide ${slide.page} image ${index + 1}"></figure>`).join("")}</div>`;
}

function clientInjectedDeckSafetyStyle() {
  return `<style id="ppt-layout-safety-style">
    body:not(.scroll-mode) section[data-slide-page]:first-of-type, body:not(.scroll-mode) .slide:first-of-type, body:not(.scroll-mode) .ai-slide:first-of-type { overflow: hidden !important; }
    section[data-slide-page] :where(h1,h2,h3,h4,p,li,.editable-text,.lead-text,.body-paragraph,.point-card,.cover-subtitle,.agenda-item), .slide :where(h1,h2,h3,h4,p,li,.editable-text,.lead-text,.body-paragraph,.point-card,.cover-subtitle,.agenda-item), .ai-slide :where(h1,h2,h3,h4,p,li,.editable-text,.lead-text,.body-paragraph,.point-card,.cover-subtitle,.agenda-item) { writing-mode: horizontal-tb !important; text-orientation: mixed !important; white-space: normal !important; word-break: normal !important; overflow-wrap: normal !important; hyphens: none !important; letter-spacing: normal; }
    section[data-slide-page] :where(p,li,.editable-text,.lead-text,.body-paragraph,.point-card,.cover-subtitle,.agenda-item p), .slide :where(p,li,.editable-text,.lead-text,.body-paragraph,.point-card,.cover-subtitle,.agenda-item p), .ai-slide :where(p,li,.editable-text,.lead-text,.body-paragraph,.point-card,.cover-subtitle,.agenda-item p) { min-width: min(320px, 82vw) !important; max-width: min(1040px, 88vw) !important; }
    section[data-slide-page] :where(h1,h2,h3,h4), .slide :where(h1,h2,h3,h4), .ai-slide :where(h1,h2,h3,h4) { min-width: min(520px, 86vw) !important; max-width: min(1120px, 90vw) !important; }
    body:not(.scroll-mode) .cover .slide-inner { display: flex !important; flex-direction: column !important; justify-content: center !important; align-items: center !important; gap: clamp(16px, 3vh, 34px) !important; padding-top: clamp(56px, 8vh, 92px) !important; padding-bottom: clamp(56px, 8vh, 92px) !important; }
    body:not(.scroll-mode) .cover main { display: block !important; min-height: auto !important; }
    body:not(.scroll-mode) .cover footer { position: absolute !important; right: clamp(34px, 5vw, 80px) !important; bottom: 28px !important; }
    body:not(.scroll-mode) section[data-slide-page]:first-of-type > header, body:not(.scroll-mode) .slide:first-of-type > header, body:not(.scroll-mode) .ai-slide:first-of-type > header { text-align: center !important; max-width: min(1120px, 90vw) !important; margin: clamp(18vh, 24vh, 28vh) auto clamp(2vh, 5vh, 7vh) !important; }
    body:not(.scroll-mode) .cover > .slide-inner > header { margin: 0 auto !important; }
    body:not(.scroll-mode) section[data-slide-page]:first-of-type h1, body:not(.scroll-mode) .slide:first-of-type h1, body:not(.scroll-mode) .ai-slide:first-of-type h1 { text-align: center !important; margin-left: auto !important; margin-right: auto !important; max-width: min(1120px, 90vw) !important; line-height: 1.06 !important; }
    .ppt-original-images, .original-ppt-image { box-sizing: border-box !important; }
    .ppt-original-images { position: relative !important; z-index: 2 !important; display: grid !important; gap: clamp(10px, 1.4vw, 18px) !important; align-content: center !important; justify-items: center !important; width: min(42vw, 620px) !important; max-width: 100% !important; max-height: 46vh !important; margin: clamp(14px, 2vh, 24px) auto 0 !important; overflow: hidden !important; clear: both !important; }
    .ppt-original-images[data-count="2"], .ppt-original-images[data-count="3"], .ppt-original-images[data-count="4"] { grid-template-columns: repeat(2, minmax(0, 1fr)) !important; width: min(52vw, 780px) !important; max-height: 44vh !important; }
    .ppt-original-images figure, figure.original-ppt-image { margin: 0 !important; width: 100% !important; min-width: 0 !important; display: grid !important; place-items: center !important; overflow: hidden !important; }
    .ppt-original-images img, .original-ppt-image img, img[alt^="Original PPT slide"] { display: block !important; width: 100% !important; height: auto !important; max-width: 100% !important; max-height: 44vh !important; object-fit: contain !important; border-radius: 8px !important; }
  </style>`;
}

function clientImageFigure(slide, index = 0) {
  const image = slide?.images?.[Math.max(0, Math.min(Number(index) || 0, (slide.images?.length || 1) - 1))];
  if (!image) return "";
  return `<figure class="media-box original-ppt-image" data-original-image="${slide.page}-${index + 1}"><img src="${image.src}" alt="Original PPT slide ${slide.page} image ${index + 1}"></figure>`;
}

function clientParseImageSlotToken(value, fallbackPage = 0) {
  const token = String(value || "").trim().toLowerCase();
  const match = token.match(/(?:slide|page)?[-_\s:]*(\d+)(?:[-_\s:]*(\d+|[a-z]))?/i) || token.match(/^(\d+)([a-z])$/i);
  if (!match) return null;
  const page = Number(match[1] || fallbackPage);
  let index = null;
  if (match[2]) index = /^[a-z]$/i.test(match[2]) ? match[2].toLowerCase().charCodeAt(0) - 97 : Number(match[2]) - 1;
  return { page, index };
}

function clientReplacementForImageSlot(slide, slot, cursor) {
  if (!slide?.images?.length || slot?.page !== slide.page) return null;
  if (Number.isInteger(slot.index)) return clientImageFigure(slide, slot.index);
  if (slide.images.length === 1) return clientImageFigure(slide, 0);
  return clientImageFigure(slide, cursor.value++);
}

function replaceClientAiImagePlaceholders(section, slide) {
  if (!slide?.images?.length) return section;
  const cursor = { value: 0 };
  let output = String(section || "");
  const applySlot = (match, slotText) => {
    const slot = clientParseImageSlotToken(slotText, slide.page);
    return clientReplacementForImageSlot(slide, slot, cursor) || match;
  };
  output = output.replace(/<figure\b([^>]*data-image-slot\s*=\s*["']?([^"'\s>]+)["']?[^>]*)>[\s\S]*?<\/figure>/gi, (match, attrs, token) => applySlot(match, token));
  output = output.replace(/<img\b([^>]*(?:alt|title|src)\s*=\s*["'][^"']*(?:page|slide)[-_\s:]*0*\d+[a-z]?[^"']*["'][^>]*)>/gi, (match, attrs) => {
    const token = attrs.match(/(?:page|slide)[-_\s:]*0*\d+[a-z]?/i)?.[0];
    const slot = clientParseImageSlotToken(token, slide.page);
    const imageIndex = Math.max(0, Math.min(Number.isInteger(slot?.index) ? slot.index : cursor.value++, slide.images.length - 1));
    const image = slide.images[imageIndex];
    if (!slot || slot.page !== slide.page || !image) return match;
    return `<img src="${image.src}" alt="Original PPT slide ${slide.page} image ${imageIndex + 1}">`;
  });
  output = output.replace(/<(figure|div)\b((?:(?!>).)*?(?:placeholder|image-slot|image-box|image-card|media-slot|photo-placeholder|visual-placeholder|visual-card|asset-slot)(?:(?!>).)*?)>[\s\S]*?(?:page|slide)[-_\s:]*0*(\d+)([a-z])?[\s\S]*?<\/\1>/gi, (match, tag, attrs, pageText, letter) => {
    const slot = clientParseImageSlotToken(`${pageText}${letter || ""}`, slide.page);
    return clientReplacementForImageSlot(slide, slot, cursor) || match;
  });
  return output;
}

function injectClientOriginalImages(html, slides) {
  let output = String(html || "");
  const style = clientInjectedDeckSafetyStyle();
  const used = new Set();
  const sections = [...output.matchAll(/<section\b[\s\S]*?<\/section>/gi)];
  if (sections.length) {
    let rebuilt = "";
    let cursor = 0;
    sections.forEach((match, index) => {
      const section = match[0];
      const slide = slides[index];
      rebuilt += output.slice(cursor, match.index);
      const replacedSection = slide?.images?.length ? replaceClientAiImagePlaceholders(section, slide) : section;
      const replacedExisting = replacedSection !== section;
      rebuilt += slide?.images?.length && !used.has(slide.page) && !replacedSection.includes("ppt-original-images") && !replacedExisting
        ? replacedSection.replace(/<\/section>\s*$/i, `${clientImageBlock(slide)}</section>`)
        : replacedSection;
      if (replacedExisting) used.add(slide.page);
      cursor = match.index + section.length;
    });
    rebuilt += output.slice(cursor);
    output = rebuilt;
  }
  if (!output.includes("ppt-layout-safety-style")) output = output.replace(/<\/head>/i, `${style}</head>`);
  return output;
}

function normalizeBaseUrl(value) {
  return String(value || "").trim().replace(/\/+$/, "");
}

function apiUrl(path) {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${state.apiBaseUrl}${normalizedPath}`;
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
}

function closeSettings() {
  el("settingsOverlay").classList.add("hidden");
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
  el("styleTabs").innerHTML = styles.map(([key, label]) => {
    const preview = stylePreview(key);
    const swatches = preview.swatches.map((color) => `<span style="--swatch:${color}"></span>`).join("");
    return `
    <button type="button" class="style-card ${state.selectedStyle === key ? "selected" : ""}" data-style="${key}" aria-label="${styleLabel(key, label)}">
      <span class="style-preview style-preview-${preview.layout}" aria-hidden="true">
        <span class="style-preview-title"></span>
        <span class="style-preview-lines"><i></i><i></i><i></i></span>
        <span class="style-preview-blocks"><i></i><i></i></span>
      </span>
      <span class="style-card-body">
        <span class="style-card-name">${styleLabel(key, label)}</span>
        <span class="style-card-sample" data-font="${preview.font}">${preview.sample}</span>
      </span>
      <span class="style-swatches" aria-hidden="true">${swatches}</span>
    </button>`;
  }).join("");
  document.querySelectorAll("[data-style]").forEach((button) => {
    button.addEventListener("click", () => {
      state.selectedStyle = button.dataset.style;
      state.activeStep = Math.max(state.activeStep, 1);
      renderStyles();
      renderSteps();
    });
  });
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

function createInlineHtmlUrl(html) {
  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  state.inlineObjectUrls.push(url);
  return url;
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
    hydrated.inlinePreviewHtmlCache = hydrated.inlinePreviewHtml;
    hydrated.previewUrl = createInlineHtmlUrl(hydrated.inlinePreviewHtmlCache);
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
  if (state.runtime === "cloudflare-worker-only" && !/\.pptx$/i.test(file.name)) {
    setStatus("Cloudflare-only deployment supports .pptx files. Please convert old .ppt files to .pptx first.", "error");
    return;
  }
  if (!/\.(ppt|pptx)$/i.test(file.name)) {
    setStatus("Please choose a .ppt or .pptx file.", "error");
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
  el("fileMeta").textContent = `${formatBytes(file.size)} ${t("selected")}`;
  setStatus(t("readyGenerate"), "ok");
  renderSteps();
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

async function clientExtractImages(zip, slideXml, rels, slideIndex, stats) {
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
    if (stats.embeddedImages >= 36 || (estimatedSize && estimatedSize > 700 * 1024) || (estimatedSize && stats.embeddedImageBytes + estimatedSize > 6 * 1024 * 1024)) {
      stats.skippedImages += 1;
      continue;
    }
    const base64 = await file.async("base64");
    const bytes = Math.ceil(base64.length * 0.75);
    if (bytes > 700 * 1024 || stats.embeddedImageBytes + bytes > 6 * 1024 * 1024) {
      stats.skippedImages += 1;
      continue;
    }
    const ext = path.split(".").pop()?.toLowerCase() || "png";
    const mime = ext === "jpg" || ext === "jpeg" ? "image/jpeg" : ext === "gif" ? "image/gif" : ext === "svg" ? "image/svg+xml" : "image/png";
    stats.embeddedImages += 1;
    stats.embeddedImageBytes += bytes;
    images.push({ src: `data:${mime};base64,${base64}`, size: bytes, name: `slide-${slideIndex}-image-${images.length + 1}.${ext}` });
  }
  return images;
}

async function extractPptxInBrowser(file) {
  const JSZipRuntime = await loadClientZipRuntime();
  const zip = await JSZipRuntime.loadAsync(await file.arrayBuffer());
  const paths = Object.keys(zip.files)
    .filter((name) => /^ppt\/slides\/slide\d+\.xml$/i.test(name))
    .sort((a, b) => Number(a.match(/slide(\d+)\.xml/i)?.[1] || 0) - Number(b.match(/slide(\d+)\.xml/i)?.[1] || 0));
  const stats = { embeddedImages: 0, embeddedImageBytes: 0, skippedImages: 0, skippedBlankSlides: 0 };
  const slides = [];
  for (let index = 0; index < paths.length; index += 1) {
    const slidePath = paths[index];
    const slideXml = await zip.file(slidePath).async("string");
    const relsPath = slidePath.replace("ppt/slides/", "ppt/slides/_rels/") + ".rels";
    const relsXml = zip.file(relsPath) ? await zip.file(relsPath).async("string") : "";
    const rels = clientRelationshipMap(relsXml, slidePath);
    const texts = clientNormalizeTextFragments(clientExtractTexts(slideXml));
    const images = await clientExtractImages(zip, slideXml, rels, index + 1, stats);
    const isDefaultOnlySlide = texts.length === 1 && /^slide\s*\d+$/i.test(texts[0]) && !images.length;
    if ((!texts.length && !images.length) || isDefaultOnlySlide) {
      stats.skippedBlankSlides += 1;
      continue;
    }
    const titleBody = clientSlideTitleAndBody(texts);
    slides.push({ page: index + 1, title: titleBody.title, body: titleBody.body, images });
  }
  if (!slides.length) throw new Error("No slides found in this PPTX file.");
  return { slides, stats };
}

function clientEditorRuntime() {
  return `${clientInjectedDeckSafetyStyle()}<style id="ppt-html-editor-style">.editor-toolbar{position:fixed;z-index:9999;top:14px;right:14px;display:none;gap:6px;padding:8px;border:1px solid #c7d2fe;border-radius:12px;background:#fff;box-shadow:0 12px 30px rgba(15,23,42,.16);font-family:Arial,sans-serif}body.editing .editor-toolbar{display:flex}.editor-toolbar button,.editor-toolbar select,.editor-toolbar input{height:30px;border:1px solid #c7d2fe;border-radius:8px;background:#fff;color:#1e3a8a;font:700 12px Arial;padding:0 8px}body.editing .editable-text,body.editing [contenteditable=true]{outline:2px dashed #60a5fa;outline-offset:3px}.media-box,.editable-image-box{position:relative;overflow:visible;min-width:80px;min-height:60px}.media-box img,.editable-image-box img{width:100%;height:100%;object-fit:contain;display:block}body.editing .selected-image{outline:2px dashed #2563eb;outline-offset:4px;z-index:50}.image-drag-handle,.image-resize-handle{display:none;position:absolute;z-index:60}.selected-image>.image-drag-handle,.selected-image>.image-resize-handle{display:block}.image-drag-handle{left:50%;top:-18px;transform:translateX(-50%);width:42px;height:14px;border-radius:999px;background:#2563eb;cursor:grab}.image-resize-handle{width:13px;height:13px;border:2px solid #fff;border-radius:4px;background:#f59e0b;box-shadow:0 0 0 1px rgba(15,23,42,.24)}.image-resize-handle.nw{left:-8px;top:-8px;cursor:nwse-resize}.image-resize-handle.ne{right:-8px;top:-8px;cursor:nesw-resize}.image-resize-handle.sw{left:-8px;bottom:-8px;cursor:nesw-resize}.image-resize-handle.se{right:-8px;bottom:-8px;cursor:nwse-resize}.ppt-runtime-nav{position:fixed;z-index:9990;left:50%;bottom:16px;transform:translateX(-50%);display:flex;gap:8px}.ppt-runtime-nav button,button[onclick*="nextSlide"],button[onclick*="prevSlide"]{min-width:46px!important;height:32px!important;padding:0 12px!important;border-radius:8px!important;border:1px solid rgba(37,99,235,.22)!important;background:rgba(255,255,255,.9)!important;color:#1e3a8a!important;font:800 14px/1 Arial,sans-serif!important;box-shadow:0 8px 22px rgba(15,23,42,.12)!important}.ppt-runtime-nav button:last-child{background:#2563eb!important;color:#fff!important}body.scroll-mode .ppt-runtime-nav{display:none}</style><script>(()=>{let i=0;const slides=[...document.querySelectorAll('.slide,section[data-slide-page],.ai-slide,[data-slide-page]')].filter(n=>!n.closest('.editor-toolbar,.ppt-runtime-nav'));let selected=null;slides.forEach(s=>{s.classList.add('ppt-runtime-slide');if(!s.style.position)s.style.position='relative'});function show(n){if(!slides.length)return;i=Math.max(0,Math.min(n,slides.length-1));slides.forEach((s,k)=>{const a=k===i;s.classList.toggle('active',a);s.classList.toggle('ppt-active-slide',a);if(!document.body.classList.contains('scroll-mode'))s.style.display=a?(s.dataset.originalDisplay||'block'):'none'})}function next(){show(i+1)}function prev(){show(i-1)}function nav(){if(document.querySelector('.ppt-runtime-nav'))return;const n=document.createElement('div');n.className='ppt-runtime-nav';n.innerHTML='<button type="button">Prev</button><button type="button">Next</button>';n.children[0].onclick=e=>{e.preventDefault();prev()};n.children[1].onclick=e=>{e.preventDefault();next()};document.body.appendChild(n)}function apply(p,v){const t=selected&&!selected.matches('.media-box,.editable-image-box,img')?selected:document.activeElement;if(t&&t!==document.body)t.style[p]=v}function toolbar(){if(document.querySelector('.editor-toolbar'))return;const t=document.createElement('div');t.className='editor-toolbar';t.innerHTML='<select data-font><option value="Arial,sans-serif">Arial</option><option value="Georgia,serif">Georgia</option><option value="Times New Roman,serif">Times</option><option value="Verdana,sans-serif">Verdana</option><option value="Microsoft YaHei,sans-serif">Microsoft YaHei</option></select><input data-size type="number" min="12" max="120" value="30"><input data-color type="color" value="#172554"><button data-bold>B</button><button data-italic>I</button><button data-underline>U</button>';document.body.appendChild(t);t.querySelector('[data-font]').onchange=e=>apply('fontFamily',e.target.value);t.querySelector('[data-size]').onchange=e=>apply('fontSize',e.target.value+'px');t.querySelector('[data-color]').oninput=e=>apply('color',e.target.value);t.querySelector('[data-bold]').onclick=()=>document.execCommand('bold');t.querySelector('[data-italic]').onclick=()=>document.execCommand('italic');t.querySelector('[data-underline]').onclick=()=>document.execCommand('underline')}function sel(el){selected=el&&el.closest('.media-box,.editable-image-box,.editable-text,.point-card,h1,.chapter,[contenteditable=true]');document.querySelectorAll('.selected-image').forEach(n=>n.classList.remove('selected-image'));if(selected?.matches?.('.media-box,.editable-image-box'))selected.classList.add('selected-image')}function move(el,e){e.preventDefault();e.stopPropagation();sel(el);const r=el.getBoundingClientRect(),p=(slides[i]||document.body).getBoundingClientRect(),sx=e.clientX,sy=e.clientY,bl=r.left-p.left,bt=r.top-p.top;el.style.position='absolute';el.style.left=bl+'px';el.style.top=bt+'px';el.style.width=r.width+'px';el.style.height=r.height+'px';const mm=m=>{el.style.left=Math.max(0,Math.min(bl+m.clientX-sx,p.width-r.width))+'px';el.style.top=Math.max(0,Math.min(bt+m.clientY-sy,p.height-r.height))+'px'};const up=()=>{e.target.removeEventListener('pointermove',mm);e.target.removeEventListener('pointerup',up)};e.target.addEventListener('pointermove',mm);e.target.addEventListener('pointerup',up)}function resize(el,c,e){e.preventDefault();e.stopPropagation();sel(el);const r=el.getBoundingClientRect(),p=(slides[i]||document.body).getBoundingClientRect(),sx=e.clientX,sy=e.clientY,bl=r.left-p.left,bt=r.top-p.top;el.style.position='absolute';const mm=m=>{const dx=m.clientX-sx,dy=m.clientY-sy;let w=r.width+(c.includes('e')?dx:-dx),h=r.height+(c.includes('s')?dy:-dy),l=c.includes('w')?bl+dx:bl,t=c.includes('n')?bt+dy:bt;w=Math.max(80,Math.min(w,p.width));h=Math.max(60,Math.min(h,p.height));l=Math.max(0,Math.min(l,p.width-w));t=Math.max(0,Math.min(t,p.height-h));Object.assign(el.style,{left:l+'px',top:t+'px',width:w+'px',height:h+'px'})};const up=()=>{e.target.removeEventListener('pointermove',mm);e.target.removeEventListener('pointerup',up)};e.target.addEventListener('pointermove',mm);e.target.addEventListener('pointerup',up)}function prep(){document.querySelectorAll('img').forEach(img=>{img.draggable=false;img.ondragstart=e=>e.preventDefault();let box=img.closest('.media-box,.editable-image-box');if(!box){box=document.createElement('span');box.className='editable-image-box';img.parentNode.insertBefore(box,img);box.appendChild(img)}if(box.dataset.dragReady)return;if(getComputedStyle(box).position==='static')box.style.position='relative';box.dataset.dragReady='1';const d=document.createElement('span');d.className='image-drag-handle';d.onpointerdown=e=>move(box,e);box.appendChild(d);['nw','ne','sw','se'].forEach(c=>{const h=document.createElement('span');h.className='image-resize-handle '+c;h.onpointerdown=e=>resize(box,c,e);box.appendChild(h)});box.onpointerdown=e=>{if(document.body.classList.contains('editing')&&!e.target.closest('.image-drag-handle,.image-resize-handle'))sel(box)}})}window.toggleEdit=force=>{const editing=typeof force==='boolean'?force:!document.body.classList.contains('editing');toolbar();document.body.classList.toggle('editing',editing);document.querySelectorAll('h1,.chapter,.point-card,.editable-text,p,li').forEach(n=>n.contentEditable=editing?'true':'false');if(editing)prep()};window.exportEditedHtml=async(mode='paged')=>{const c=document.documentElement.cloneNode(true);c.querySelector('.editor-toolbar')?.remove();c.querySelector('#ppt-html-editor-style')?.remove();c.querySelectorAll('.image-drag-handle,.image-resize-handle,.ppt-runtime-nav').forEach(n=>n.remove());c.querySelectorAll('[contenteditable]').forEach(n=>n.removeAttribute('contenteditable'));c.querySelector('body')?.classList.remove('editing');if(mode==='scroll'){c.querySelector('body')?.classList.add('scroll-mode');c.querySelectorAll('.slide,section[data-slide-page],[data-slide-page]').forEach(n=>{n.style.display='block';n.style.visibility='visible';n.style.opacity='1'})}else c.querySelector('body')?.classList.remove('scroll-mode');return '<!doctype html>\\n'+c.outerHTML};window.nextSlide=next;window.prevSlide=prev;window.showSlide=show;document.addEventListener('click',e=>{if(document.body.classList.contains('editing'))sel(e.target)},false);nav();show(0)})();</script>`;
}

function clientSlideLayout(slide, index, items) {
  const title = String(slide.title || "").toLowerCase();
  if (index === 0) return "cover";
  if (/\b(outline|agenda|contents?|today|schedule|syllabus|overview)\b/i.test(title)) return "agenda";
  if (/\b(exercise|quiz|question|practice|activity|discussion|answer|solution|case)\b/i.test(title)) return "workshop";
  if (slide.images.length && items.length <= 1) return "image-focus";
  if (slide.images.length) return "image-split";
  if (items.length <= 2) return "statement";
  return "lesson";
}

function clientTextBlocks(items, max = 18) {
  const cleaned = items.filter(clientUsefulText).slice(0, max);
  const shortCount = cleaned.filter((item) => item.length < 34).length;
  const continuationCount = cleaned.filter((item) => /^(and|or|to|of|in|for|with|on|by|as|the|their|our|your|is|are|was|were|communicate|interact|everyday|lives|working)\b/i.test(item)).length;
  const hasQuoteFlow = cleaned.some((item) => /[\u201c"]/.test(item)) && cleaned.some((item) => /[\u201d"]/.test(item));
  const asParagraph = cleaned.length >= 4 && (hasQuoteFlow || shortCount / cleaned.length > 0.55 || continuationCount >= 2);
  if (!asParagraph) return { items: cleaned, paragraphs: cleaned, asParagraph: false };
  const paragraphs = [];
  let current = "";
  const terminal = /[.!?\u3002\uff01\uff1f;\uff1b:\u201d"]$/;
  const startsContinuation = /^(and|or|to|of|in|for|with|on|by|as|the|their|our|your|is|are|was|were|communicate|interact|everyday|lives|working|\(|,|;|:)/i;
  const hasOpenQuote = (value) => (value.match(/[\u201c"]/g) || []).length > (value.match(/[\u201d"]/g) || []).length;
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

function buildBrowserFallbackHtml(slides, style, mode = "paged") {
  const bodyClass = `${mode === "scroll" ? "scroll-mode " : ""}style-${style}`;
  const slideHtml = slides.map((slide, index) => {
    const blocks = clientTextBlocks(slide.body, 18);
    const items = blocks.paragraphs;
    const hasImages = slide.images.length > 0;
    const layout = clientSlideLayout(slide, index, items);
    const lead = items[0] || "";
    const agendaHtml = items.slice(0, 12).map((item, itemIndex) => `<div class="agenda-item editable-text"><span>${String(itemIndex + 1).padStart(2, "0")}</span><p>${escapeHtml(item)}</p></div>`).join("");
    const bulletsHtml = items.slice(lead ? 1 : 0, lead ? 12 : 14).map((item) => `<li class="editable-text">${escapeHtml(item)}</li>`).join("");
    const paragraphHtml = items.map((item) => `<p class="body-paragraph editable-text">${escapeHtml(item)}</p>`).join("");
    const conceptHtml = items.slice(0, 3).map((item) => `<div class="point-card editable-text">${escapeHtml(item)}</div>`).join("");
    const contentHtml = {
      cover: items.length ? `<p class="cover-subtitle editable-text">${escapeHtml(items.slice(0, 2).join(" \u00b7 "))}</p>` : "",
      agenda: `<div class="agenda-list">${agendaHtml}</div>`,
      workshop: `<div class="workshop-prompt">${lead ? `<p class="lead-text editable-text">${escapeHtml(lead)}</p>` : ""}${bulletsHtml ? `<ul class="quiet-list">${bulletsHtml}</ul>` : ""}<div class="thinking-space editable-text">Class discussion space</div></div>`,
      statement: `<div class="statement-block">${blocks.asParagraph ? paragraphHtml : `${lead ? `<p class="lead-text editable-text">${escapeHtml(lead)}</p>` : ""}${bulletsHtml ? `<ul class="quiet-list">${bulletsHtml}</ul>` : ""}`}</div>`,
      lesson: `<div class="lesson-block">${blocks.asParagraph ? paragraphHtml : `${lead ? `<p class="lead-text editable-text">${escapeHtml(lead)}</p>` : ""}${items.length > 4 ? `<ul class="quiet-list ${items.length > 8 ? "multi-column" : ""}">${items.slice(1, 14).map((item) => `<li class="editable-text">${escapeHtml(item)}</li>`).join("")}</ul>` : `<div class="concept-row">${conceptHtml}</div>`}`}</div>`,
      "image-split": `<div class="lesson-block">${blocks.asParagraph ? paragraphHtml : `${lead ? `<p class="lead-text editable-text">${escapeHtml(lead)}</p>` : ""}${bulletsHtml ? `<ul class="quiet-list">${bulletsHtml}</ul>` : ""}`}</div>`,
      "image-focus": `<div class="lesson-block">${lead ? `<p class="lead-text editable-text">${escapeHtml(lead)}</p>` : ""}</div>`,
    }[layout] || "";
    const imageHtml = slide.images.map((image, imageIndex) => `<figure class="media-box original-ppt-image"><img src="${image.src}" alt="Original PPT slide ${slide.page} image ${imageIndex + 1}"></figure>`).join("");
    return `<section class="slide ${layout} ${hasImages ? "has-media" : "text-only"} ${items.length >= 10 ? "density-many" : items.length >= 6 ? "density-medium" : "density-light"} ${index === 0 ? "active" : ""}" data-slide-page="${slide.page}"><div class="slide-inner"><header>${slide.title ? `<h1 class="editable-text">${escapeHtml(slide.title)}</h1>` : ""}</header><main>${contentHtml}${hasImages ? `<div class="media-grid">${imageHtml}</div>` : ""}</main><footer>${index + 1} / ${slides.length}</footer></div></section>`;
  }).join("");
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>PPT HTML Studio</title><style>*{box-sizing:border-box}html,body{margin:0;min-height:100%;background:#f6f8fb;color:#17213f;font-family:Inter,Arial,sans-serif}body{overflow:hidden}body.scroll-mode{overflow:auto}.slide{width:100vw;height:100vh;display:none;background:#fff;overflow:hidden}.slide.active{display:block}body.scroll-mode .slide{display:block;min-height:100vh;height:auto}.slide-inner{width:min(1440px,100vw);height:100%;margin:0 auto;padding:clamp(42px,6vh,76px) clamp(72px,8vw,132px) 64px;display:grid;grid-template-rows:auto 1fr auto;gap:clamp(28px,5vh,58px)}header{display:grid;gap:14px;max-width:1120px}.chapter{color:#2563eb;font-size:clamp(17px,1.45vw,24px);font-weight:800;letter-spacing:.08em;text-transform:uppercase}h1{margin:0;font-size:clamp(40px,4vw,64px);line-height:1.05;max-width:1080px;overflow-wrap:break-word;word-break:normal;hyphens:none}.cover header{align-self:center;text-align:center;max-width:1100px;margin:0 auto}.cover h1{font-size:clamp(48px,5.1vw,78px)}.cover-subtitle{margin:18px auto 0;max-width:860px;color:#64748b;font-size:clamp(24px,2vw,34px);line-height:1.35;font-weight:500}main{min-height:0;display:grid;gap:clamp(28px,4vh,48px);align-items:center}.image-split main{grid-template-columns:minmax(0,.82fr) minmax(360px,.9fr)}.lead-text{margin:0;max-width:980px;font-size:clamp(30px,2.45vw,44px);line-height:1.18;font-weight:760;color:#17213f}.lesson-block,.statement-block,.workshop-prompt{max-width:1040px;display:grid;gap:26px}.body-paragraph{margin:0;max-width:1120px;font-size:clamp(27px,2vw,36px);line-height:1.28;color:#17213f;font-weight:540}.density-many .body-paragraph{font-size:clamp(23px,1.55vw,30px);line-height:1.24}.quiet-list,.numbered-list{margin:0;padding:0;list-style:none;display:grid;gap:16px;max-width:940px}.quiet-list.multi-column{grid-template-columns:repeat(2,minmax(0,1fr));max-width:1120px;column-gap:34px}.quiet-list li{position:relative;padding-left:28px;font-size:clamp(24px,1.85vw,32px);line-height:1.34;color:#334155}.quiet-list li:before{content:"";position:absolute;left:0;top:.58em;width:8px;height:8px;border-radius:50%;background:#2563eb}.density-many .quiet-list li{font-size:clamp(21px,1.45vw,27px);line-height:1.22}.numbered-list li{display:grid;grid-template-columns:42px 1fr;gap:18px;font-size:clamp(23px,1.7vw,30px);line-height:1.3;color:#334155}.numbered-list li span{color:#2563eb;font-weight:800}.agenda-list{width:min(980px,80vw);display:grid;grid-template-columns:repeat(2,minmax(260px,1fr));gap:18px 48px}.agenda-item{display:grid;grid-template-columns:46px 1fr;gap:16px;align-items:center;min-height:54px;border-bottom:1px solid #dbe5f2}.agenda-item span{color:#2563eb;font-size:18px;font-weight:800}.agenda-item p{margin:0;font-size:clamp(24px,1.85vw,32px);line-height:1.15;font-weight:650;color:#17213f}.concept-row{display:grid;grid-template-columns:repeat(3,minmax(180px,1fr));gap:18px;max-width:980px}.point-card{border-radius:8px;background:#fff;border:1px solid #d7e3f4;padding:22px 24px;font-size:clamp(22px,1.65vw,30px);line-height:1.25;font-weight:650;box-shadow:none}.thinking-space{width:min(860px,68vw);min-height:180px;border:1px dashed #b7c7dc;border-radius:8px;color:#94a3b8;display:grid;place-items:center;font-size:24px;font-weight:600}.media-grid{display:grid;gap:18px;align-content:center}.media-box{margin:0;display:grid;place-items:center}.media-box img{width:100%;max-height:54vh;object-fit:contain;border-radius:8px;box-shadow:none}footer{justify-self:end;font-size:20px;color:#64748b}.nav{position:fixed;z-index:20;left:50%;bottom:18px;transform:translateX(-50%);display:flex;gap:10px}.nav button{border:1px solid #d8e2f0;border-radius:8px;padding:8px 13px;background:#fff;color:#1e3a8a;font-size:15px;font-weight:800}.nav button:last-child{background:#2563eb;color:#fff;border-color:#2563eb}body.scroll-mode .nav{display:none}body.style-doodle .slide,body.style-healing .slide{background:#fff6df}body.style-doodle h1,body.style-doodle .body-paragraph,body.style-doodle .point-card,body.style-healing h1{font-family:'Segoe Print','Comic Sans MS',cursive}body.style-doodle .point-card,body.style-doodle .media-box img{border:2px solid #3c2c2c;transform:rotate(-.25deg)}body.style-swiss .slide-inner{background-image:linear-gradient(rgba(37,99,235,.055) 1px,transparent 1px),linear-gradient(90deg,rgba(37,99,235,.055) 1px,transparent 1px);background-size:48px 48px}body.style-swiss .point-card{border:0;border-left:6px solid #2563eb;border-radius:0}body.style-academic h1,body.style-editorial h1{font-family:Georgia,'Times New Roman',serif}body.style-minimal .point-card{background:transparent;border-color:#d1d5db}body.style-contrast .slide{background:#0f172a;color:#fff}body.style-contrast .quiet-list li,body.style-contrast .body-paragraph{color:rgba(255,255,255,.86)}body.style-vivid .chapter{background:#f97316;color:#fff;width:fit-content;padding:5px 12px;border-radius:999px}@media(max-width:900px){.slide-inner{padding:34px 28px 50px}.image-split main{grid-template-columns:1fr}.agenda-list,.concept-row,.quiet-list.multi-column{grid-template-columns:1fr;width:100%}h1{font-size:44px}.point-card,.quiet-list li,.agenda-item p{font-size:26px}}</style></head><body class="${bodyClass}">${slideHtml}<div class="nav"><button onclick="prevSlide()">Prev</button><button onclick="nextSlide()">Next</button></div>${clientEditorRuntime()}</body></html>`;
}

async function generateAiDirectlyInBrowser(slides, stats, previousError) {
  const config = integrationForGeneration();
  if (config.mode !== "ai_api") throw new Error(previousError || "Browser direct AI is only available for AI chat APIs.");
  if (!config.apiKey) throw new Error("API key is required for AI generation.");
  const controller = new AbortController();
  const timeoutMs = Math.max(120, Number(config.timeoutSec || 300)) * 1000;
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  const response = await fetch(normalizeChatEndpoint(config.endpoint), {
    method: "POST",
    headers: apiHeaders(config),
    signal: controller.signal,
    body: JSON.stringify({
      model: config.model || "gpt-4.1-mini",
      messages: [
        { role: "system", content: "You are an expert HTML presentation designer. Return only valid standalone HTML." },
        { role: "user", content: clientAiPrompt(slides, state.selectedStyle) },
      ],
      temperature: 0.2,
      max_tokens: 20000,
    }),
  }).finally(() => clearTimeout(timeoutId));
  const text = await response.text();
  let data = {};
  try { data = text ? JSON.parse(text) : {}; } catch { data = { text }; }
  if (!response.ok) throw new Error(data.message || data.error?.message || `Direct AI HTTP ${response.status}`);
  let html = extractHtmlFromAiText(extractAiText(data));
  if (!html) throw new Error("The AI responded, but no complete HTML was found.");
  html = injectClientOriginalImages(html, slides);
  if (!html.includes("ppt-html-editor-style")) html = html.replace(/<\/body>/i, `${clientEditorRuntime()}</body>`);
  const scrollHtml = makeScrollHtmlFromPaged(html);
  const id = `AI-${Date.now().toString(36).toUpperCase()}`;
  const job = hydrateInlineJob({
    id,
    fileName: state.selectedFile.name,
    slides: slides.length,
    style: state.selectedStyle,
    status: "completed",
    updatedAt: new Date().toISOString(),
    previewUrl: "",
    scrollUrl: "",
    downloadUrl: "",
    inlinePreviewHtml: html,
    inlineScrollHtml: scrollHtml,
    inlinePreviewMode: "blob",
    aiStatus: { mode: config.mode, provider: config.endpoint, used: true, resultType: "html", browserDirect: true },
    share: {
      status: "ready",
      recommendation: stats.skippedImages ? `${stats.embeddedImages} images were embedded. ${stats.skippedImages} oversized images were skipped.` : "AI generated in the browser and original PPT images were embedded.",
      totalImages: stats.embeddedImages + stats.skippedImages,
      embeddedImages: stats.embeddedImages,
      missingImages: stats.skippedImages,
      riskyPaths: 0,
      externalImages: 0,
    },
  });
  state.activeJob = job;
  state.jobs.unshift(job);
  renderJobs();
  renderJobSelect();
  selectJob(job.id);
  setStatus(t("completedBrowserAi"), "ok");
  return job;
}

async function generateInBrowserFallback(reason) {
  setGenerationOverlay(true, state.language === "zh" ? "\u6b63\u5728\u6d4f\u89c8\u5668\u4e2d\u672c\u5730\u63d0\u53d6 PPT\uff0c\u4ee5\u52a0\u5feb\u751f\u6210..." : "Extracting the PPT locally in this browser for faster generation...");
  const { slides, stats } = await extractPptxInBrowser(state.selectedFile);
  const fallbackIntegration = integrationForGeneration();
  let fallbackReason = reason;
  if (fallbackIntegration.mode === "ai_api") {
    try {
      setGenerationOverlay(true, state.language === "zh" ? "\u5df2\u5728\u672c\u5730\u63d0\u53d6 PPT\uff0c\u6b63\u5728\u4ece\u6d4f\u89c8\u5668\u76f4\u63a5\u8bf7\u6c42 AI..." : "Extracted PPT locally. Asking AI directly from this browser...");
      return await generateAiDirectlyInBrowser(slides, stats, reason);
    } catch (directAiError) {
      fallbackReason = directAiError.message || reason;
      console.warn("Direct browser AI generation failed", directAiError);
      if (isAiRecoverableError(fallbackReason)) {
        setGenerationOverlay(true, state.language === "zh" ? "AI \u8d85\u65f6\u6216\u4f59\u989d\u4e0d\u8db3\uff0c\u6b63\u5728\u6539\u7528\u672c\u5730\u89c4\u5219\u751f\u6210..." : "AI timed out or has insufficient balance. Generating with local rules instead...");
      } else {
        setGenerationOverlay(true, state.language === "zh" ? "\u6d4f\u89c8\u5668\u76f4\u8fde AI \u5931\u8d25\uff0c\u6b63\u5728\u5c1d\u8bd5 Cloudflare AI \u4ee3\u7406..." : "Direct AI call failed. Trying Cloudflare AI proxy...");
        try {
          const response = await fetch(apiUrl("/api/generate-ai-from-slides"), {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
              filename: state.selectedFile.name,
              style: state.selectedStyle,
              integration: fallbackIntegration,
              slides,
              stats,
              fallbackReason: reason,
            }),
          });
          const data = await readJsonResponse(response, state.language === "zh" ? "AI \u751f\u6210\u5931\u8d25" : "AI generation failed");
          const generatedJob = hydrateInlineJob(data.job);
          state.activeJob = generatedJob;
          state.jobs.unshift(generatedJob);
          renderJobs();
          renderJobSelect();
          selectJob(generatedJob.id);
          const aiMessage = formatAiStatus(generatedJob);
          setStatus(aiMessage ? `${state.language === "zh" ? "\u5df2\u5b8c\u6210\u3002" : "Completed. "}${aiMessage}` : (state.language === "zh" ? "\u5df2\u5b8c\u6210\uff0cAI \u9884\u89c8\u5df2\u51c6\u5907\u597d\u3002" : "Completed. AI preview is ready."), generatedJob.aiStatus?.fallback ? "error" : "ok");
          return generatedJob;
        } catch (workerAiError) {
          fallbackReason = workerAiError.message || fallbackReason;
          console.warn("Cloudflare AI proxy generation failed", workerAiError);
          setGenerationOverlay(true, state.language === "zh" ? "AI \u8bf7\u6c42\u5931\u8d25\uff0c\u6b63\u5728\u6539\u7528\u672c\u5730\u89c4\u5219\u751f\u6210..." : "AI request failed. Generating with local rules instead...");
        }
      }
    }
  } else if (fallbackIntegration.mode !== "local") {
    try {
      setGenerationOverlay(true, state.language === "zh" ? "\u5df2\u5728\u672c\u5730\u63d0\u53d6 PPT\uff0c\u6b63\u5728\u8bf7\u6c42\u5de5\u4f5c\u6d41 API \u8bbe\u8ba1 HTML..." : "Extracted PPT locally. Asking workflow API to design the HTML...");
      const response = await fetch(apiUrl("/api/generate-ai-from-slides"), {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          filename: state.selectedFile.name,
          style: state.selectedStyle,
          integration: integrationForGeneration(),
          slides,
          stats,
          fallbackReason: reason,
        }),
      });
      const data = await readJsonResponse(response, state.language === "zh" ? "AI \u751f\u6210\u5931\u8d25" : "AI generation failed");
      const generatedJob = hydrateInlineJob(data.job);
      state.activeJob = generatedJob;
      state.jobs.unshift(generatedJob);
      renderJobs();
      renderJobSelect();
      selectJob(generatedJob.id);
      const aiMessage = formatAiStatus(generatedJob);
      setStatus(aiMessage ? `${state.language === "zh" ? "\u5df2\u5b8c\u6210\u3002" : "Completed. "}${aiMessage}` : (state.language === "zh" ? "\u5df2\u5b8c\u6210\uff0cAI \u9884\u89c8\u5df2\u51c6\u5907\u597d\u3002" : "Completed. AI preview is ready."), generatedJob.aiStatus?.fallback ? "error" : "ok");
      return generatedJob;
    } catch (workflowError) {
      fallbackReason = workflowError.message || reason;
      console.warn("Workflow generation after browser extraction failed", workflowError);
      setGenerationOverlay(true, state.language === "zh" ? "\u5de5\u4f5c\u6d41\u8bf7\u6c42\u5931\u8d25\uff0c\u6b63\u5728\u6539\u7528\u672c\u5730\u89c4\u5219\u751f\u6210..." : "Workflow request failed. Generating with local rules instead...");
    }
  }
  const pagedHtml = buildBrowserFallbackHtml(slides, state.selectedStyle, "paged");
  const scrollHtml = buildBrowserFallbackHtml(slides, state.selectedStyle, "scroll");
  const id = `LOCAL-${Date.now().toString(36).toUpperCase()}`;
  const job = hydrateInlineJob({
    id,
    fileName: state.selectedFile.name,
    slides: slides.length,
    style: state.selectedStyle,
    status: "completed",
    updatedAt: new Date().toISOString(),
    previewUrl: "",
    scrollUrl: "",
    downloadUrl: "",
    inlinePreviewHtml: pagedHtml,
    inlineScrollHtml: scrollHtml,
    inlinePreviewMode: "blob",
    aiStatus: { mode: state.integration.mode || "local", fallback: true, error: fallbackReason },
    share: {
      status: "ready",
      recommendation: stats.skippedImages ? `${stats.embeddedImages} images were embedded. ${stats.skippedImages} oversized images were skipped in browser fallback mode.` : "Browser fallback generated successfully.",
      totalImages: stats.embeddedImages + stats.skippedImages,
      embeddedImages: stats.embeddedImages,
      missingImages: stats.skippedImages,
      riskyPaths: 0,
      externalImages: 0,
    },
  });
  state.activeJob = job;
  state.jobs.unshift(job);
  renderJobs();
  renderJobSelect();
  selectJob(job.id);
  setStatus(t("localFallbackDone", { extra: stats.skippedImages ? t("oversizedSkipped") : "" }), "ok");
  return job;
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
  const labels = [t("labelsUploading"), t("labelsExtracting"), t("labelsOptimizing"), t("labelsConverting"), t("labelsPreparing")];
  try {
    setGenerationOverlay(true, t("preparingPpt"));
    for (let i = 0; i < labels.length; i += 1) {
      state.activeStep = Math.min(i, stepKeys.length - 1);
      renderSteps();
      setStatus(`${labels[i]}...`);
      setGenerationOverlay(true, `${labels[i]}...`);
      await new Promise((resolve) => setTimeout(resolve, 160));
    }
    await saveIntegration(false, false);
    if (state.runtime === "cloudflare-worker-only" && /\.pptx$/i.test(state.selectedFile.name)) {
      await generateInBrowserFallback("Cloudflare-only fast path: PPT extracted in the browser to avoid Worker timeout.");
      return;
    }
    setGenerationOverlay(true, t("generationMessage"));
    const fileBase64 = await fileToBase64(state.selectedFile);
    const response = await fetch(apiUrl("/api/generate"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        filename: state.selectedFile.name,
        fileBase64,
        style: state.selectedStyle,
        integration: integrationForGeneration(),
        options: {
          keepText: el("keepText").checked,
          readableText: el("readableText").checked,
          imagesIntact: el("imagesIntact").checked,
        },
      }),
    });
    const data = await readJsonResponse(response, state.language === "zh" ? "\u751f\u6210\u5931\u8d25" : "Generation failed");
    state.activeStep = 3;
    const generatedJob = hydrateInlineJob(data.job);
    state.activeJob = generatedJob;
    const aiMessage = formatAiStatus(generatedJob);
    const inlineMessage = generatedJob.inlinePreviewAvailable ? (state.language === "zh" ? " \u5185\u8054\u9884\u89c8\u5df2\u51c6\u5907\u597d\u3002" : " Inline preview is ready.") : "";
    setStatus(aiMessage ? `${state.language === "zh" ? "\u5df2\u5b8c\u6210\u3002" : "Completed. "}${aiMessage}${inlineMessage}` : `${state.language === "zh" ? "\u5df2\u5b8c\u6210\uff0c\u9884\u89c8\u5df2\u51c6\u5907\u597d\u3002" : "Completed. Preview is ready."}${inlineMessage}`, generatedJob.aiStatus?.fallback ? "error" : "ok");
    await loadJobs();
    const existingIndex = state.jobs.findIndex((job) => job.id === generatedJob.id);
    if (existingIndex >= 0) {
      state.jobs[existingIndex] = { ...state.jobs[existingIndex], ...generatedJob };
    } else {
      state.jobs.unshift(generatedJob);
    }
    renderJobs();
    renderJobSelect();
    selectJob(generatedJob.id);
  } catch (error) {
    if (/Cloudflare Worker exceeded|worker_resource_limit|resource limit|1102/i.test(error.message || "")) {
      try {
        await generateInBrowserFallback(error.message);
      } catch (fallbackError) {
        setStatus(fallbackError.message || error.message, "error");
      }
    } else {
      setStatus(error.message, "error");
    }
  } finally {
    state.busy = false;
    el("runButton").disabled = false;
    setGenerationOverlay(false);
    renderSteps();
  }
}

async function loadJobs() {
  const response = await fetch(apiUrl("/api/jobs"));
  const data = await readJsonResponse(response, state.language === "zh" ? "\u65e0\u6cd5\u52a0\u8f7d\u4efb\u52a1" : "Could not load jobs");
  state.jobs = (data.jobs || []).map(hydrateInlineJob);
  renderJobs();
  renderJobSelect();
  if (!state.activeJob && state.jobs.length) selectJob(state.jobs[0].id);
}

function renderJobs() {
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
  el("previewFrame").src = job.previewUrl;
  el("previewEmpty").classList.add("hidden");
  renderShare(job.share || null);
  const aiMessage = formatAiStatus(job);
  if (aiMessage) setStatus(aiMessage, job.aiStatus?.fallback ? "error" : "ok");
  updatePreviewEditButton(false);
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
  let output = String(html || "");
  if (/<body\b[^>]*class="/i.test(output)) {
    output = output.replace(/<body\b([^>]*?)class="([^"]*)"/i, (all, before, cls) => `<body${before}class="${cls} scroll-mode"`);
  } else if (/<body\b/i.test(output)) {
    output = output.replace(/<body\b([^>]*)>/i, '<body$1 class="scroll-mode">');
  }
  if (!/ppt-scroll-export-style/.test(output)) {
    const style = `<style id="ppt-scroll-export-style">body.scroll-mode{overflow:auto!important}body.scroll-mode .slide,body.scroll-mode section[data-slide-page],body.scroll-mode [data-slide-page]{display:block!important;visibility:visible!important;opacity:1!important;min-height:100vh}body.scroll-mode .ppt-runtime-nav,body.scroll-mode .nav{display:none!important}</style>`;
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
    return {
      pagedHtml: await win.exportEditedHtml("paged"),
      scrollHtml: await win.exportEditedHtml("scroll"),
    };
  }
  const pagedHtml = job.inlinePreviewHtmlCache || await fetchTextIfAvailable(job.previewUrl);
  const scrollHtml = job.inlineScrollHtmlCache || (job.scrollUrl ? await fetchTextIfAvailable(job.scrollUrl) : makeScrollHtmlFromPaged(pagedHtml));
  return { pagedHtml, scrollHtml };
}

function updateLocalJobHtml(job, pagedHtml, scrollHtml) {
  if (!job) return job;
  job.inlinePreviewHtmlCache = pagedHtml;
  job.inlineScrollHtmlCache = scrollHtml;
  job.previewUrl = createInlineHtmlUrl(pagedHtml);
  job.scrollUrl = createInlineHtmlUrl(scrollHtml);
  job.inlinePreviewAvailable = true;
  job.updatedAt = new Date().toISOString();
  state.jobs = state.jobs.map((item) => item.id === job.id ? job : item);
  if (state.activeJob?.id === job.id) state.activeJob = job;
  return job;
}

async function makeClientZipUrl(job, pagedHtml, scrollHtml) {
  const readme = "Open index.html for paged navigation, or index-scroll.html for continuous scrolling.\nImages are embedded in the HTML, so they will not be lost.\n";
  const blob = makeZipBlob([
    { name: "index.html", data: pagedHtml },
    { name: "index-scroll.html", data: scrollHtml },
    { name: "index-single-file.html", data: pagedHtml },
    { name: "index-scroll-single-file.html", data: scrollHtml },
    { name: "README-open.txt", data: readme },
  ]);
  const url = URL.createObjectURL(blob);
  state.inlineObjectUrls.push(url);
  return url;
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
  updatePreviewEditButton(shouldEdit);
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
    timeoutSec: Math.max(300, Number(el("apiTimeout").value || 300)),
    fallbackToLocal: true,
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
  el("apiTimeout").value = Math.max(300, Number(state.integration.timeoutSec || 300));
  el("fallbackToLocal").checked = true;
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
    el("fallbackToLocal").checked = true;
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
  translateStaticUi();
  renderSteps();
  renderStyles();
  bindEvents();
  await checkHealth();
  await loadIntegration();
  await loadJobs();
}

function bindEvents() {
  const dropZone = el("dropZone");
  const fileInput = el("fileInput");
  el("helpButton").addEventListener("click", openHelp);
  el("closeHelp").addEventListener("click", closeHelp);
  el("helpOverlay").addEventListener("click", (event) => {
    if (event.target === el("helpOverlay")) closeHelp();
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !el("helpOverlay").classList.contains("hidden")) closeHelp();
    if (event.key === "Escape" && !el("settingsOverlay").classList.contains("hidden")) closeSettings();
  });
  el("settingsButton").addEventListener("click", openSettings);
  el("closeSettings").addEventListener("click", closeSettings);
  el("settingsOverlay").addEventListener("click", (event) => {
    if (event.target === el("settingsOverlay")) closeSettings();
  });
  el("languageSelect").addEventListener("change", (event) => {
    applyLanguage(event.target.value);
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
    if (state.activeJob) window.open(state.activeJob.previewUrl, "_blank");
  });
  el("previewFrame").addEventListener("load", () => updatePreviewEditButton(false));
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
  el("shareJob").addEventListener("click", () => analyzeShare());
  el("downloadJob").addEventListener("click", () => downloadJobZip(state.activeJob));
  el("downloadShareZip").addEventListener("click", () => openShareUrl("zip"));
  el("openSingleFile").addEventListener("click", () => openShareUrl("single"));
  el("openScrollSingleFile").addEventListener("click", () => openShareUrl("scrollSingle"));
  el("openShareReport").addEventListener("click", () => openShareUrl("report"));
}

init();


