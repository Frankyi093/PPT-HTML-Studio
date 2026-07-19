(function () {
  const THEME_KEY = "ppt-html-studio-theme";
  const LANGUAGE_KEY = "ppt-html-studio-language";
  const themes = new Set(["light", "dark", "beige"]);
  const languages = new Set(["zh", "en"]);

  const text = {
    zh: {
      home: "首页",
      converter: "PPT 转 HTML",
      quickCreate: "快速创建",
      chatCreation: "对话创作",
      aiSettings: "AI 配置",
      settings: "设置",
      backHome: "返回主页",
      productName: "PPT HTML Studio",
      workbench: "AI PRESENTATION WORKBENCH",
      heroTitle: "开始创建演示文稿",
      heroSubtitle: "导入 PPT、输入主题，或通过对话逐步构建你的演示内容。",
      enterConverter: "进入转换",
      startCreate: "开始生成",
      startChat: "开始对话",
      converterDesc: "上传现有 PPT，转为可编辑、可分享、可下载的 HTML 演示。",
      quickCreateDesc: "输入主题和需求，AI 自动规划大纲、风格和页面布局。",
      chatDesc: "先和 AI 聊清楚需求，逐步确认大纲，再一键生成 PPT。",
      sharedAi: "统一 AI 配置",
      sharedAiDesc: "三个功能共用同一份 API 设置，只需要配置一次。",
      configureAi: "配置 AI",
      settingsTitle: "设置",
      settingsSubtitle: "选择界面语言和主题，也可以在同一页配置三个功能共用的 AI。",
      interfaceSettings: "界面设置",
      themeMode: "主题模式",
      language: "界面语言",
      lightMode: "浅色模式",
      darkMode: "深色模式",
      beigeMode: "米色模式",
      chinese: "中文",
      english: "English",
      settingsSaved: "设置已保存。",
      chatTitle: "对话创作",
      chatSubtitle: "先用对话梳理需求、内容和页面结构，再一键生成可编辑 HTML PPT。",
      history: "历史记录",
      newChat: "新建对话",
      loadingAi: "正在读取 AI 设置...",
      chatPlaceholder: "描述你想呈现的主题和内容...",
      send: "发送",
      liveStructure: "实时结构",
      outline: "页面大纲",
      addPage: "新增页",
      title: "标题",
      audience: "受众",
      style: "风格",
      confirmGenerate: "确认并生成",
      preview: "预览",
      editHtml: "Edit HTML",
      saveEdits: "保存修改",
      openScroll: "打开滑动版 HTML",
      downloadZip: "下载 ZIP",
      noHtmlYet: "暂无生成的 HTML",
      noHtmlHint: "确认大纲后，生成一份 16:9 HTML PPT。",
      aiCreating: "AI 正在创建演示文稿",
      aiCreatingHint: "正在规划内容、风格和 16:9 页面...",
      quickCreateTitle: "快速创建",
      quickCreateHero: "从主题快速生成完整 HTML 演示。",
      topicRequirements: "主题和需求",
      editablePlan: "可编辑 AI 方案",
    },
    en: {
      home: "Home",
      converter: "PPT to HTML",
      quickCreate: "Quick Create",
      chatCreation: "Chat Creation",
      aiSettings: "AI Settings",
      settings: "Settings",
      backHome: "Back home",
      productName: "PPT HTML Studio",
      workbench: "AI PRESENTATION WORKBENCH",
      heroTitle: "Start creating presentations",
      heroSubtitle: "Import a PPT, enter a topic, or build your deck step by step through conversation.",
      enterConverter: "Enter converter",
      startCreate: "Start creating",
      startChat: "Start chat",
      converterDesc: "Upload an existing PPT and turn it into editable, shareable, downloadable HTML slides.",
      quickCreateDesc: "Enter a topic and requirements. AI plans the outline, style, and layouts.",
      chatDesc: "Clarify the brief with AI, confirm the outline, then generate the PPT in one click.",
      sharedAi: "Shared AI settings",
      sharedAiDesc: "All three features reuse one API configuration. Set it up once.",
      configureAi: "Configure AI",
      settingsTitle: "Settings",
      settingsSubtitle: "Choose interface language and theme, and configure the shared AI connection.",
      interfaceSettings: "Interface settings",
      themeMode: "Theme",
      language: "Language",
      lightMode: "Light mode",
      darkMode: "Dark mode",
      beigeMode: "Beige mode",
      chinese: "中文",
      english: "English",
      settingsSaved: "Settings saved.",
      chatTitle: "Chat Creation",
      chatSubtitle: "Clarify needs, content, and page structure through conversation, then generate editable HTML slides.",
      history: "History",
      newChat: "New chat",
      loadingAi: "Loading AI settings...",
      chatPlaceholder: "Describe the topic and content you want to present...",
      send: "Send",
      liveStructure: "Live structure",
      outline: "Page outline",
      addPage: "Add page",
      title: "Title",
      audience: "Audience",
      style: "Style",
      confirmGenerate: "Confirm and generate",
      preview: "Preview",
      editHtml: "Edit HTML",
      saveEdits: "Save Edits",
      openScroll: "Open Scroll HTML",
      downloadZip: "Download ZIP",
      noHtmlYet: "No generated HTML yet",
      noHtmlHint: "Confirm the outline, then generate a 16:9 HTML PPT.",
      aiCreating: "AI is creating your deck",
      aiCreatingHint: "Planning content, style and 16:9 pages...",
      quickCreateTitle: "Quick Create",
      quickCreateHero: "Create a complete HTML slide deck from a topic.",
      topicRequirements: "Topic and requirements",
      editablePlan: "Editable AI plan",
    },
  };

  function readTheme() {
    const value = localStorage.getItem(THEME_KEY);
    return themes.has(value) ? value : "light";
  }

  function readLanguage() {
    const value = localStorage.getItem(LANGUAGE_KEY);
    return languages.has(value) ? value : "zh";
  }

  function applyTheme(theme) {
    const next = themes.has(theme) ? theme : "light";
    document.documentElement.dataset.theme = next;
    document.documentElement.style.colorScheme = next === "dark" ? "dark" : "light";
    try {
      localStorage.setItem(THEME_KEY, next);
    } catch {
      // Ignore storage failures; the theme still applies for this session.
    }
    document.querySelectorAll("[data-theme-select]").forEach((node) => {
      node.value = next;
    });
    return next;
  }

  function translate(language) {
    const next = languages.has(language) ? language : "zh";
    const bundle = text[next] || text.zh;
    document.documentElement.lang = next === "zh" ? "zh-CN" : "en";
    document.querySelectorAll("[data-i18n]").forEach((node) => {
      const key = node.dataset.i18n;
      if (bundle[key]) node.textContent = bundle[key];
    });
    document.querySelectorAll("[data-i18n-placeholder]").forEach((node) => {
      const key = node.dataset.i18nPlaceholder;
      if (bundle[key]) node.setAttribute("placeholder", bundle[key]);
    });
    document.querySelectorAll("[data-language-select]").forEach((node) => {
      node.value = next;
    });
    try {
      localStorage.setItem(LANGUAGE_KEY, next);
    } catch {
      // Ignore storage failures; the language still applies for this session.
    }
    return next;
  }

  function init() {
    const theme = applyTheme(readTheme());
    const runTranslation = () => {
      const language = translate(readLanguage());
      document.dispatchEvent(new CustomEvent("ppt-settings-ready", { detail: { theme, language } }));
    };
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", runTranslation, { once: true });
    } else {
      runTranslation();
    }
  }

  window.PptAppSettings = {
    THEME_KEY,
    LANGUAGE_KEY,
    themes: Array.from(themes),
    languages: Array.from(languages),
    text,
    readTheme,
    readLanguage,
    applyTheme,
    translate,
    init,
  };

  init();
})();
