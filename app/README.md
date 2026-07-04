# PPT HTML Studio

Local platform for optimizing PowerPoint files into editable HTML slide decks.

## What It Uses From The Source Workflow

The original workflow is a five-step LangGraph pipeline:

1. `extract_ppt`
2. `optimize_style`
3. `html_convert`
4. `generate_html`
5. `manual_edit`

This platform keeps the same product flow, but replaces cloud-only Coze runtime calls with local processing so it can run on this machine.

## Run

```powershell
D:\workspace\ppt-html-platform\app\run-platform.ps1
```

Then open:

```text
http://127.0.0.1:5177
```

## Outputs

- Uploaded PPT files: `D:\workspace\ppt-html-platform\app\data\uploads`
- Generated HTML package folder: `D:\workspace\ppt-html-platform\app\data\outputs\<job-id>\index.html`
- Original PPT images for the generated deck: `D:\workspace\ppt-html-platform\app\data\outputs\<job-id>\assets`
- Job history: `D:\workspace\ppt-html-platform\app\data\jobs.json`

## Notes

- Requires Python with `python-pptx` installed.
- No FastAPI, Node, or external object storage is required.
- The main **Download** action returns a ZIP package containing `index.html`, `index-scroll.html`, `index-single-file.html`, `index-scroll-single-file.html`, and `assets/`, so local HTML previews keep their images. `index.html` is the paged previous/next version; `index-scroll.html` is the continuous vertical webpage version. Current browser edits are saved back to the job before packaging when the page supports editable export.
- Generated HTML supports keyboard slide navigation, embedded preview mode, manual text editing, bold/italic/underline, left/center/right alignment, font size/family/color changes, image resizing, image deletion, image insertion, added text-box moving/resizing, and edited HTML download. Text-only slides use the full slide canvas and automatically distribute cards across the available width.
- Generated slide body text no longer uses scrollable text boxes. Dense text is split earlier, arranged into cards/columns, and auto-fitted on slide load/export so titles and body copy do not get clipped or spill outside the 16:9 canvas.
- Built-in styles include Teaching Blue, Soft Lesson, Academic Webpage, Clean, Academic, Instructional, Minimal, High Contrast, Healing Hand-drawn, Doodle Sketch, Swiss Grid, Editorial, and Vivid. Teaching Blue is the default template and follows the attached reference page style: blue-white background, centered title treatment, 24px body text, structured cards, clean geometric focus anchors, agenda/transition pages, subtle shadow, and vertical webpage export.
- Local generation assigns per-slide layout classes from content density, image count, and original image position instead of forcing every image into the same fixed slot. Very dense text is split into continuation slides and arranged as columns/cards where possible instead of relying on one large scrollable text box.
- **Analyze & Share** checks every image reference, flags missing/risky paths, creates `index-single-file.html` and `index-scroll-single-file.html` with local images embedded, writes `share-report.json`, and includes `README-open.txt` in the ZIP package.

## Share Without Losing Images

After generating a deck, click **Analyze & Share**. The platform will:

- scan every `<img src="">` in `index.html` and `index-scroll.html`;
- verify relative `assets/...` files exist;
- flag absolute local paths, root-relative paths, external links, and missing images;
- generate `index-single-file.html` for one-file paged sharing;
- generate `index-scroll-single-file.html` for one-file vertical scrolling sharing;
- generate `share-report.json` and `README-open.txt`;
- keep the normal ZIP package as the safest editable sharing package.

Recommended sharing choices:

- send the ZIP package when recipients can unzip a folder;
- send `index-single-file.html` when recipients need exactly one paged file;
- send `index-scroll-single-file.html` when recipients need exactly one vertical scrolling file;
- avoid sending only `index.html` without the `assets/` folder.
- use **Edit HTML** in the platform preview for the safest workflow; after entering edit mode, the generated HTML editor toolbar includes **Bold**, **Italic**, and **Underline**. **Save Edits** and **Download ZIP** save the edited preview before packaging.
- if you open the generated HTML in a separate tab, use **Save Edits** or **Download Edited ZIP** inside that tab before downloading the package from the platform.
- Advanced Options can connect either a generic workflow API or an OpenAI-compatible chat completions API. Settings are stored in `D:\workspace\ppt-html-platform\app\data\integration.json`; leave the API key field blank to keep the saved key.
- When an AI API returns `html_code`, the platform now uses that code directly as the final page. It only normalizes local image paths and creates sharing files; it does not force the AI result through the built-in slide template. `optimized_slides` remains available as a fallback when the AI cannot return full HTML.
- Direct AI `html_code` pages still receive a lightweight editing bridge. The bridge is a fixed overlay toolbar that appears only in edit mode, so the AI-generated layout is not rewritten, but the platform can still run **Edit HTML**, save both the paged and vertical-scroll versions, and download an edited ZIP.
- AI direct-HTML previous/next navigation controls are treated as UI chrome and are compacted automatically so they do not inherit the large slide-content font rules.
- In AI direct-HTML mode, generated body text is guarded to stay larger than 26pt, and AI prompts require slide titles or section headings to be larger than 45pt. Previous/next navigation controls are treated as small UI chrome. If content is dense, the AI should split it into more pages/cards/columns instead of shrinking the font. Manual editing can still set any font size.

## Deploy To Vercel

The repository root now includes the files Vercel needs:

- `vercel.json`: routes `/` to `app/frontend/index.html`, `/static/*` to frontend assets, and `/api/*` plus `/outputs/*` to the Python Serverless handler.
- `api/index.py`: Vercel Python Serverless entry point that reuses the existing backend handler.
- `requirements.txt`: Python dependencies for PPT parsing.

In Vercel, import the GitHub repository and keep these settings:

```text
Framework Preset: Other
Root Directory: ./
Build Command: empty
Output Directory: empty
Install Command: empty or pip install -r requirements.txt
```

Important Vercel limits:

- Vercel Serverless file storage is temporary. Generated jobs and saved API settings live in `/tmp` and may disappear after the function sleeps or moves to another instance.
- Serverless request bodies are small compared with local mode. This deployment is suitable for small PPT files only. Large 10MB-100MB PPT files need Vercel Blob/direct upload or a long-running Python host such as Render, Railway, Fly.io, or a cloud server.
- Long AI calls can hit Vercel function timeouts. For large decks and slow AI models, a long-running backend host is still the more reliable option.

## Deploy Frontend To Cloudflare Pages

Cloudflare Pages can host the frontend, but it cannot run this Python `python-pptx` backend directly. The repository includes a Cloudflare build:

```text
Build command: npm run build
Build output directory: dist
```

The build copies `app/frontend` into `dist`. Pages Functions under `functions/api` and `functions/outputs` proxy API/output requests to a real backend when you set:

```text
BACKEND_ORIGIN=https://your-python-backend.example.com
```

Without `BACKEND_ORIGIN`, the Cloudflare site opens as a frontend-only deployment and API calls return a clear backend-not-configured message.


## AI / Workflow API Integration

Open **Advanced Options** in the web UI and choose one of these engines:

- `Local rules`: no external call; uses the built-in generator.
- `Doubao Seed 2.0`: uses Volcengine Ark's OpenAI-compatible API; paste the Ark API key and keep the default endpoint/model unless your console shows a different model ID.
- `Workflow API`: posts extracted PPT structure to your workflow endpoint.
- `AI API`: posts an OpenAI-compatible `chat/completions` request to the configured endpoint.

### Workflow API Request

The platform sends JSON like this:

```json
{
  "title": "source file name",
  "selected_style": "clean",
  "style_preset": { "primary": "#12356b" },
  "options": { "keepText": true, "readableText": true, "imagesIntact": true },
  "ppt_content": [
    { "page": 1, "texts": [{ "content": "..." }], "images": [] }
  ],
  "page_count": 1,
  "expected_output": "Return JSON with html_code containing a complete editable HTML deck."
}
```

The workflow should return one of these shapes:

```json
{ "html_code": "<!DOCTYPE html>..." }
```

or:

```json
{ "html": "<!DOCTYPE html>..." }
```

It can also return structured slide updates, which are merged back into the local editable renderer:

```json
{
  "optimized_slides": [
    {
      "page": 1,
      "texts": [
        { "content": "Improved title", "isTitle": true },
        { "content": "Regrouped body copy" }
      ],
      "images": [{ "src": "assets/slide-001-image-1.png" }],
      "layout_hints": ["image-right", "density-short"]
    }
  ]
}
```

For AI/API generated code, `html_code` is preferred. A full HTML document is best, but a fenced HTML fragment such as `<style>...</style><main>...</main>` is also accepted and wrapped into a complete page. This path is not constrained by the built-in template.

The job history table shows whether a job used `AI HTML`, `AI slides`, `Fallback`, or `Local`, so external API failures are visible instead of looking like a normal local generation.

### AI API Request

Use an OpenAI-compatible chat completions endpoint, for example:

```text
https://api.example.com/v1/chat/completions
```

If you enter a base `/v1` endpoint, the platform appends `/chat/completions` automatically. The API key is sent as `Authorization: Bearer <key>`.

For Doubao Seed 2.0, choose **Doubao Seed 2.0** in `Service`. The UI fills:

```text
Endpoint: https://ark.cn-beijing.volces.com/api/v3
Model: doubao-seed-2-0-mini-260428
API key header: Authorization
API key prefix: Bearer 
```

The backend automatically expands the Ark `/api/v3` base URL to `/api/v3/chat/completions`. If your Volcengine Ark console exposes a different Seed 2.0 model ID, replace the `Model` field with that value and save.

If you paste an Ark Responses API endpoint such as:

```text
https://ark.cn-beijing.volces.com/api/v3/responses
```

the backend now sends the Responses API `input` payload instead of a Chat Completions `messages` payload. This fixes Doubao errors such as `json: unknown field "messages"`.

### Failure Behavior

If `Fallback to local rules if API fails` is checked, generation continues with the local renderer and records the external error in `job.aiStatus`. If unchecked, the generation request fails so the API issue is visible immediately.

API keys are stored locally in `data/integration.json` on this machine. Leave the key field blank in the UI to keep an existing saved key.

Doubao/Ark requests can take longer for large decks. The **Doubao Seed 2.0** preset sets `Timeout (sec)` to `300`, and the backend will wait at least 300 seconds for Volcengine endpoints. You can raise the UI timeout to `600` in Advanced connection settings for very large PPT files.

### API Settings

- `API key header`: choose `Authorization`, `X-API-Key`, `api-key`, or no key header.
- `API key prefix`: use `Bearer ` for OpenAI-compatible APIs, or leave empty for raw key headers.
- `Workflow payload`: choose flat JSON, `{ "input": ... }`, or Dify blocking payload.
- `Custom headers`: accepts either JSON such as `{ "X-Token": "..." }` or line format such as `X-Token: ...`.
- `Clear saved API key on save`: removes the locally stored key from `data/integration.json`.

### HTML Editing

Open a generated deck and click **Edit HTML**. The editor toolbar supports:

- text font size, font family, and color changes for selected text;
- image width changes after selecting an image;
- deleting the selected image;
- adding an image from a URL or a local file;
- dragging images freely on the current slide without changing their size;
- resizing free-positioned images by dragging their corner handles;
- undoing image/table/text-box edit operations with **Undo** or `Ctrl+Z` when focus is not inside text editing;
- adding movable, editable text boxes;
- adding a table manually;
- converting selected pipe/tab/comma-separated multi-line data into a table with **Auto Table**.
- downloading either **Paged HTML** with previous/next navigation or **Scroll HTML** as a continuous vertical webpage.

PPT native tables are rendered as HTML tables automatically. Multi-line body text that looks like structured data, for example `Name | Score` followed by matching rows, is also converted into a table during generation.

