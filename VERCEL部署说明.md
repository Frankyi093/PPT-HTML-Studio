# PPT HTML Studio Vercel Deployment

## Vercel Project Settings

When importing the GitHub repository into Vercel, use:

- Framework Preset: Other
- Root Directory: empty, use the repository root
- Build Command: empty or Vercel default
- Output Directory: empty
- Install Command: empty or Vercel default

The root `vercel.json` already routes:

- `/` to `app/frontend/index.html`
- `/static/*` to frontend static files
- `/api/*` to `api/index.py`
- `/outputs/*` to `api/index.py`

The Python function package explicitly includes `app/**` and the API guide markdown file in the repository root.

## Required Files For GitHub

Root files:

- `.gitignore`
- `.vercelignore`
- `vercel.json`
- `requirements.txt`
- `package.json`
- API guide markdown file in the repository root
- public deployment guide markdown file in the repository root
- this Vercel deployment guide markdown file

Application files:

- `api/index.py`
- `app/backend/**`
- `app/frontend/**`
- `app/scripts/**`
- `app/run-platform.ps1`
- `app/README.md`
- `scripts/build-cloudflare.mjs`

Optional files:

- `wrangler.toml`
- `functions/**`
- `projects/README.md`
- `design/**`

## Do Not Upload

- `app/data/**`
- `dist/**`
- `node_modules/**`
- `.vercel/**`
- `.wrangler/**`
- `qa/**`
- `qa_tmp/**`
- `__pycache__/**`
- `.ppt`, `.pptx`, `.zip`, `.log`
- `.db`, `.sqlite`, `.sqlite-wal`, `.sqlite-shm`

## Important Limits

This Vercel version uses a Python Serverless Function. It can open the website, save API settings, upload small PPT files, and generate HTML.

Because Vercel's filesystem is temporary, generated previews use a browser Blob inline preview when running on Vercel. This makes the page opened immediately after generation reliable even if `/tmp/outputs` is not reused by another Serverless invocation.

For large PPT files, persistent job history, multi-user downloads, and long-term ZIP storage, add Vercel Blob/KV/database storage or deploy the Python backend to Render, Railway, Fly, or a cloud server.
