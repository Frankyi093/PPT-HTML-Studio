# PPT HTML Studio API 配置教程

本文档说明如何在平台中配置外部工作流 API 或 AI API，让 PPT 优化和 HTML 生成过程由外部模型/工作流参与完成。

平台地址：`http://127.0.0.1:5177/`

配置入口：页面中的 **AI connection**

配置保存位置：`D:\workspace\ppt-html-platform\app\data\integration.json`

## 1. 三种 Optimization engine 怎么选

### Local rules

不调用外部接口，使用平台内置规则解析 PPT、优化排版并生成 HTML。

适合：

- 没有 API key；
- 调试本地功能；
- 外部 API 不稳定时备用。

### Workflow API

平台把解析后的 PPT 结构发送给你的工作流接口，由工作流返回完整 HTML。

适合：

- Dify、Coze、FastGPT、n8n、自建工作流；
- 你希望先做内容分析、风格优化，再返回 HTML；
- 需要接入公司内部模型或多步骤流程。

### AI API

平台按 OpenAI-compatible `chat/completions` 格式请求接口。

适合：

- OpenAI-compatible 服务；
- 通义千问、DeepSeek、智谱、Moonshot、OpenRouter、One API 等兼容 `/v1/chat/completions` 的网关；
- 你希望直接让模型返回完整 HTML。

## 2. 最简单的配置方法

新版配置只需要先看明面上的 4 个字段：

1. `Service`
2. `Endpoint`
3. `Model`
4. `API key`

如果选择 `Local rules`，不需要填写 API key。

如果选择 `DeepSeek`，平台会自动填写：

```text
Endpoint: https://api.deepseek.com/v1
Model: deepseek-chat
API key header: Authorization
API key prefix: Bearer 
```

你只需要填：

```text
API key
```

如果选择 `OpenAI compatible`，平台会自动填写：

```text
Endpoint: https://api.openai.com/v1
Model: gpt-4.1-mini
API key header: Authorization
API key prefix: Bearer 
```

你通常只需要改模型名和填 key。

如果选择 `Doubao Seed 2.0`，平台会自动填写：

```text
Endpoint: https://ark.cn-beijing.volces.com/api/v3
Model: doubao-seed-2-0-mini-260428
API key header: Authorization
API key prefix: Bearer 
```

你只需要填火山方舟 API key。平台会把 `/api/v3` 自动补成 `/api/v3/chat/completions`。如果你的火山方舟控制台给的是其他 Seed 2.0 模型 ID，请把 `Model` 改成控制台显示的模型名。

如果你从火山方舟控制台复制的是 Responses API 示例，Endpoint 可能是：

```text
https://ark.cn-beijing.volces.com/api/v3/responses
```

这个地址也可以使用。平台会自动改用 Responses API 的 `input` 请求格式，不会再发送 `messages` 字段。

如果选择 `Workflow API` 或 `Dify workflow`，一般需要填：

```text
Endpoint
API key
```

高级字段已经折叠在 **Advanced connection settings** 里，只有在你的服务商要求特殊 header、payload、timeout 时才需要展开。

## 3. 保存规则

点击 **Save connection** 后，配置会保存到本机：

```text
D:\workspace\ppt-html-platform\app\data\integration.json
```

API key 保存后不会明文显示。之后你再次生成 PPT，即使 key 输入框是空的，系统也会继续使用之前保存的 key。

只有在你展开 **Advanced connection settings**，勾选：

```text
Clear saved API key on save
```

并点击 **Save connection** 时，才会清除保存的 key。

普通生成、测试 API、重新保存 endpoint/model，都不会因为 key 输入框为空而删除原来的 key。

## 4. UI 字段说明

### Endpoint

接口地址。

AI API 示例：

```text
https://api.example.com/v1/chat/completions
```

如果填写的是：

```text
https://api.example.com/v1
```

平台会自动补成：

```text
https://api.example.com/v1/chat/completions
```

Workflow API 示例：

```text
https://your-workflow.example.com/run
```

### Model

AI API 模式会使用该字段，例如：

```text
gpt-4.1-mini
deepseek-chat
qwen-plus
```

Workflow API 通常可以留空，除非你的工作流需要读取 `model`。

### API key

填写你的接口密钥。

保存后会写入本机：

```text
D:\workspace\ppt-html-platform\app\data\integration.json
```

下次打开页面时，密钥不会明文显示。API key 输入框留空表示继续使用已保存的 key。

### API key header

选择密钥放在哪个请求头里。

常见选择：

```text
Authorization
X-API-Key
api-key
No API key header
```

### API key prefix

如果使用 `Authorization`，大多数 OpenAI-compatible API 需要：

```text
Bearer 
```

注意 `Bearer` 后面有一个空格。

如果使用 `X-API-Key` 或 `api-key`，一般可以留空，表示直接发送原始 key。

### Workflow payload

只影响 Workflow API 模式。

#### Flat JSON

平台直接发送 PPT 数据：

```json
{
  "title": "demo.pptx",
  "selected_style": "clean",
  "ppt_content": []
}
```

适合自建接口、n8n、普通后端。

#### `{ "input": ... }`

平台会包一层：

```json
{
  "input": {
    "title": "demo.pptx",
    "selected_style": "clean",
    "ppt_content": []
  }
}
```

适合部分工作流平台。

#### Dify blocking

平台会发送：

```json
{
  "inputs": {
    "title": "demo.pptx",
    "selected_style": "clean",
    "ppt_content": []
  },
  "response_mode": "blocking",
  "user": "ppt-html-studio"
}
```

适合 Dify Workflow 的阻塞调用。

### Timeout (sec)

接口超时时间。建议：

- 普通 AI API：`90`
- Doubao Seed 2.0 / 火山方舟：建议 `300`
- 大 PPT 或复杂工作流：`300` 到 `600`

### Custom headers

支持 JSON：

```json
{"X-Workflow-Token":"your-token"}
```

也支持逐行格式：

```text
X-Workflow-Token: your-token
X-Project-ID: ppt-html
```

### Fallback to local rules if API fails

建议先勾选。

勾选后，如果外部 API 失败，平台会自动回退到本地规则生成 HTML，并在任务记录里保存错误信息。

如果取消勾选，外部 API 失败时，本次生成会直接报错。调试接口时可以取消勾选，这样问题更明显。

### Clear saved API key on save

勾选后点击 **Save API Settings**，会清除本地保存的 API key。

## 5. 配置 AI API 的推荐步骤

1. 打开 `http://127.0.0.1:5177/`。
2. 展开 **Advanced Options**。
3. `Optimization engine` 选择 `AI API`。
4. `Endpoint` 填写兼容地址，例如：

```text
https://api.example.com/v1/chat/completions
```

5. `Model` 填写模型名，例如：

```text
gpt-4.1-mini
```

6. `API key` 填写密钥。
7. `API key header` 选择 `Authorization`。
8. `API key prefix` 填写：

```text
Bearer 
```

9. 勾选 `Fallback to local rules if API fails`。
10. 点击 **Save API Settings**。
11. 点击 **Test API**。
12. 测试通过后上传 PPT，点击 **Generate HTML**。

## 6. 配置 Workflow API 的推荐步骤

1. 打开 `http://127.0.0.1:5177/`。
2. 展开 **Advanced Options**。
3. `Optimization engine` 选择 `Workflow API`。
4. `Endpoint` 填写你的工作流调用地址。
5. 按你的平台要求选择 `API key header` 和 `API key prefix`。
6. 按工作流平台要求选择 `Workflow payload`。
7. 如果还需要额外鉴权，在 `Custom headers` 中填写。
8. 点击 **Save API Settings**。
9. 点击 **Test API**。
10. 测试通过后上传 PPT，点击 **Generate HTML**。

## 7. Workflow API 会收到什么

平台会把 PPT 解析成结构化 JSON，核心字段如下：

```json
{
  "title": "source.pptx",
  "selected_style": "doodle",
  "style_preset": {
    "primary": "#3b2925",
    "accent": "#9bd0e8"
  },
  "options": {
    "keepText": true,
    "readableText": true,
    "imagesIntact": true
  },
  "ppt_content": [
    {
      "page": 1,
      "texts": [
        {
          "content": "标题或正文"
        }
      ],
      "images": [
        {
          "src": "assets/slide-001-image-1.png"
        }
      ]
    }
  ],
  "page_count": 1,
  "expected_output": "Return JSON with html_code containing a complete editable HTML deck."
}
```

工作流必须保留图片路径，例如：

```html
<img src="assets/slide-001-image-1.png" alt="">
```

不要返回 `D:\...`、`file:///...` 或网络占位图路径。

## 8. Workflow API 应该返回什么

推荐返回两种格式之一。第一种是直接返回完整 HTML，也是 AI API 的首选方式：

```json
{
  "html_code": "<!DOCTYPE html><html>...</html>"
}
```

也可以返回：

```json
{
  "html": "<!DOCTYPE html><html>...</html>"
}
```

当返回 `html_code` 或 `html` 时，平台会直接把这段代码写成最终页面，只做必要的图片相对路径修正和分享文件生成，不会再强制套用本地固定模板。也就是说，你可以通过提示词让 AI 自己生成完整的页面结构、CSS、动画、翻页逻辑或上下滑动网页。

同时，平台会给 AI 直出的 HTML 自动注入一个轻量编辑桥接层。这个桥接层默认只是固定悬浮按钮/工具栏，不会重写 AI 生成的页面结构；进入 **Edit HTML** 后才会开启文字、图片、文本框等修改功能，并支持同时保存翻页版 `index.html` 和上下滑动版 `index-scroll.html`，下载编辑后的 ZIP 时也会包含两种查看方式。

AI 直出 HTML 的 Previous / Next / 上一页 / 下一页 等翻页按钮会被当作界面控件处理，平台会自动压小这类按钮，避免它们继承正文大字号并遮挡页面。

AI 直出 HTML 的正文字号会被严格限制为大于 `26pt`，标题或章节主标题必须大于 `45pt`。Previous / Next 等翻页控件会被当成小型界面控件处理，不跟随正文大字号。如果内容很多，应让 AI 拆成更多页面、卡片、分栏或表格，不要通过小字号硬塞。进入编辑模式后，手动编辑的字号不受这个限制，可以按需要自由设置。

如果模型返回的是 fenced HTML 片段，例如：

```html
<style>...</style>
<main>...</main>
```

平台也会把它包装成完整 HTML 页面使用。

第二种是返回优化后的 slides。这个更适合 DeepSeek 或普通工作流，因为不需要模型一次写完整网页：

```json
{
  "optimized_slides": [
    {
      "page": 1,
      "texts": [
        { "content": "优化后的标题", "isTitle": true },
        { "content": "重新组织后的正文要点" }
      ],
      "images": [
        { "src": "assets/slide-001-image-1.png", "alt": "原 PPT 图片" }
      ],
      "layout_hints": ["image-right", "density-short"]
    }
  ]
}
```

平台会把 `optimized_slides` 合并回原 PPT 数据，并用本地可编辑 HTML 模板重新渲染。注意：这种方式会受到本地模板约束。如果希望 AI 生成的 code 直接转化为页面，不受固定模板限制，请优先返回 `html_code`。

平台也能从这些字段里尽量提取 HTML 或 slides：

```text
html_code, html, optimized_slides, slides, content, result, data, output, outputs, answer, text, body
```

但最推荐、最自由的是 `html_code`。

## 9. 给工作流或模型的关键要求

建议在你的工作流提示词里强调：

```text
你需要返回完整 HTML 文档，从 <!DOCTYPE html> 开始。
必须保留原 PPT 文字。
必须使用 ppt_content.images[].src 里的相对图片路径。
图片路径必须是 assets/...，不能使用 file:///、D:\... 或外部占位图。
不要生成 “Optimized slide layout” 或 “Images intact when present” 之类占位文案。
不要在正文里加入 Slide 1 / Slide 2 页码，只保留右下角页码。
根据文字量、图片数量和原始图片位置调整排版，不要所有页面固定同一种布局。
文字排版要放在每页视觉安全区的中间区域，整体居中、均衡，不要全部堆在左上角。
正文正常文字字号必须大于 26pt，密集内容应拆成卡片、分栏或表格，不能用很小的字硬塞。
AI 模式下正文、表格、脚注和标签等正常内容字号必须大于 26pt；标题或章节主标题必须大于 45pt，且不能遮挡或溢出。
Previous / Next / 上一页 / 下一页 等翻页按钮属于界面控件，不属于正文内容，应保持很小尺寸，大约 7pt-9pt，不能喧宾夺主。
保存或导出时必须同时支持两种查看方式：翻页按钮切换的 paged 版本，以及从上到下连续滑动查看全部内容的 scroll 版本。
生成的 HTML 应支持编辑文字、拖动图片、四角缩放图片、增加文本框。
```

## 10. 常见配置示例

### OpenAI-compatible

```text
Optimization engine: AI API
Endpoint: https://api.example.com/v1/chat/completions
Model: gpt-4.1-mini
API key header: Authorization
API key prefix: Bearer 
Workflow payload: 可忽略
Timeout (sec): 300
```

### Doubao Seed 2.0 / 火山方舟

```text
Service: Doubao Seed 2.0
Endpoint: https://ark.cn-beijing.volces.com/api/v3
Model: doubao-seed-2-0-mini-260428
API key header: Authorization
API key prefix: Bearer 
Workflow payload: 可忽略
```

最简单做法是在页面的 `Service` 里选择 `Doubao Seed 2.0`，然后只粘贴 API key 并保存。若测试时提示模型不存在，通常说明账号可用的模型 ID 与默认值不同，需要在火山方舟控制台复制实际模型 ID 到 `Model`。

如果你手动填写 Endpoint，有两种可用写法：

```text
https://ark.cn-beijing.volces.com/api/v3
```

平台会自动调用：

```text
https://ark.cn-beijing.volces.com/api/v3/chat/completions
```

也可以直接填写：

```text
https://ark.cn-beijing.volces.com/api/v3/responses
```

这时平台会发送 Responses API 格式的 `input` 字段。不要把 curl 命令整段粘到 `Custom headers`，只需要在 `API key` 里粘贴 key。

Doubao 处理较大的 PPT 可能需要几分钟。选择 `Doubao Seed 2.0` 时平台会自动把 `Timeout (sec)` 设为 `300`；如果 PPT 很大，可以在 **Advanced connection settings** 中把它调到 `600`。

### X-API-Key 类型服务

```text
Optimization engine: AI API 或 Workflow API
Endpoint: https://api.example.com/run
API key header: X-API-Key
API key prefix: 留空
```

### Dify Workflow

```text
Optimization engine: Workflow API
Endpoint: https://your-dify-domain/v1/workflows/run
API key header: Authorization
API key prefix: Bearer 
Workflow payload: Dify blocking
```

## 11. 测试 API 按钮的作用

点击 **Test API** 时：

- AI API 会发送一个很小的 chat/completions 测试请求；
- Workflow API 会发送一个 `type=health_check` 的测试 payload；
- 如果接口返回 JSON 或文本，平台会认为接口可达；
- 如果鉴权、地址、超时或证书有问题，会在页面上显示错误。

## 12. 生成失败时怎么排查

### 显示 `API endpoint is empty`

Endpoint 没填。

### 显示 `API HTTP 401` 或 `403`

通常是 API key、header 或 prefix 不对。

检查：

- `Authorization` 是否需要 `Bearer `;
- `Bearer` 后面是否有空格；
- 是否应该改用 `X-API-Key` 或 `api-key`。

### Doubao 显示 `unknown field "messages"`

这是因为 Endpoint 使用了火山方舟 Responses API：

```text
https://ark.cn-beijing.volces.com/api/v3/responses
```

但请求体却按 Chat Completions API 发送了 `messages` 字段。平台已兼容这个情况：Endpoint 以 `/responses` 结尾时会自动发送 `input` 字段；Endpoint 为 `/api/v3` 或 `/chat/completions` 时才发送 `messages` 字段。

### 显示 `API request failed`

通常是网络、域名、代理或接口地址不可访问。

先在浏览器或 Postman 里确认 endpoint 可以访问。

### Doubao 显示 `The read operation timed out`

这表示平台已经连上接口，但 Doubao 在当前 timeout 内还没有返回结果，常见于 PPT 页数多、图片多或模型响应慢。

处理方式：

- 重新选择一次 `Service: Doubao Seed 2.0`，让平台自动把 `Timeout (sec)` 设为 `300`；
- 如果 PPT 很大，把 `Timeout (sec)` 调到 `600`；
- 先用页数较少的 PPT 测试 key 和模型是否可用；
- 勾选 `Fallback to local rules if API fails`，避免超时时完全没有结果。

### 显示 `WinError 10061` 或“目标计算机积极拒绝”

这通常不是 API key 错误，而是当前 Windows 系统代理指向了本机某个端口，例如：

```text
127.0.0.1:10090
```

但该代理软件没有启动，导致 Python 请求先连本地代理时被拒绝。

平台现在会做两层处理：

- 远程 AI API：如果发现本机代理拒绝连接，会自动绕过代理直连重试；
- 本地 Workflow API：`localhost` / `127.0.0.1` 地址会强制直连，不再被系统代理截走。

如果仍然报错：

- 使用 DeepSeek 时，确认 Endpoint 是 `https://api.deepseek.com/v1`；
- 使用工作流时，确认你的工作流服务已经启动，且 Endpoint 端口正确；
- 如果必须走代理，请启动对应代理软件，或在 Windows 网络设置里关闭无效代理。

### 显示 `AI API response did not contain valid HTML`

AI 返回的内容里没有完整 HTML。

解决方式：

- 强化提示词，要求从 `<!DOCTYPE html>` 开始返回完整 HTML；
- 如果走工作流，返回字段用 `html_code`；
- 确保不要只返回摘要或 Markdown 说明。

### 生成完成但图片丢失

检查 AI/工作流返回的 HTML 里图片是否仍是：

```text
assets/...
```

不要把图片路径改成绝对路径或不存在的 URL。

生成后建议点击 **Analyze & Share**，如果状态是 `Ready`，再下载 ZIP 或单文件 HTML。

## 13. 推荐工作流

稳定使用时建议按这个顺序：

1. 先用 `Local rules` 确认 PPT 能正常解析。
2. 再配置外部 API，并勾选 `Fallback to local rules if API fails`。
3. 点击 **Test API**。
4. 上传小 PPT 测试生成。
5. 生成后点击 **Analyze & Share** 检查图片是否安全。
6. 对外传播时优先下载 ZIP；如果只想发一个文件，用 `index-single-file.html`。
