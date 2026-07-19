import argparse
import base64
import io
import json
import mimetypes
import os
import re
import sys
import tempfile
import traceback
import zipfile
from http import HTTPStatus
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from typing import Any, Dict
from urllib.parse import unquote, urlparse

CURRENT_DIR = Path(__file__).resolve().parent
APP_ROOT = CURRENT_DIR.parent
FRONTEND_DIR = APP_ROOT / "frontend"
DEFAULT_DATA_DIR = APP_ROOT / "data"
VERCEL_DATA_DIR = Path(tempfile.gettempdir()) / "ppt-html-platform-data"
DATA_DIR = Path(os.environ.get("PPT_HTML_DATA_DIR") or (VERCEL_DATA_DIR if os.environ.get("VERCEL") else DEFAULT_DATA_DIR))
JOBS_PATH = DATA_DIR / "jobs.json"
INTEGRATION_PATH = DATA_DIR / "integration.json"

sys.path.insert(0, str(CURRENT_DIR))

from ai_connector import (  # noqa: E402
    build_test_payload,
    load_integration_config,
    normalize_chat_endpoint,
    post_json,
    public_integration_config,
    save_integration_config,
)
from ppt_processor import load_jobs, process_ppt, save_jobs  # noqa: E402


IMG_SRC_PATTERN = re.compile(r'(<img\b[^>]*\bsrc=["\'])([^"\']+)(["\'])', re.IGNORECASE)

DEFAULT_API_GUIDE = """# API Configuration Tutorial

## Quick setup

1. Open Settings or the AI connection panel.
2. Choose a service, such as DeepSeek, Doubao Seed 2.0, OpenAI compatible, Custom AI API, or Workflow API.
3. Paste the API key.
4. Keep the default endpoint and model unless your provider gives you a custom value.
5. Click Save connection.
6. Click Test API before generating HTML.

## Required fields

- Service: selects the provider preset.
- API key: the secret key from your provider.
- Endpoint: required for custom providers and workflow APIs.
- Model: required for AI chat-compatible providers.

## Notes

- API settings are saved on the current deployment storage. On Vercel Serverless, storage is temporary unless you connect persistent storage.
- For large PPT files or persistent job history, use Vercel Blob/KV/database storage or deploy the Python backend to Render, Railway, Fly, or a cloud server.
"""

def mb_to_bytes(value: str, fallback_mb: float) -> int:
    try:
        mb_value = float(value)
        if mb_value <= 0:
            raise ValueError
    except (TypeError, ValueError):
        mb_value = fallback_mb
    return int(mb_value * 1024 * 1024)


VERCEL_MAX_PAYLOAD_BYTES = 4 * 1024 * 1024
VERCEL_SAFE_RAW_UPLOAD_BYTES = int(VERCEL_MAX_PAYLOAD_BYTES * 0.62)
LOCAL_SAFE_RAW_UPLOAD_BYTES = mb_to_bytes(os.environ.get("PPT_HTML_MAX_UPLOAD_MB", ""), 100)
LOCAL_MAX_PAYLOAD_BYTES = mb_to_bytes(
    os.environ.get("PPT_HTML_MAX_PAYLOAD_MB", ""),
    max(150, (LOCAL_SAFE_RAW_UPLOAD_BYTES / 1024 / 1024) * 1.6),
)


def ensure_data_dirs() -> None:
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    (DATA_DIR / "uploads").mkdir(parents=True, exist_ok=True)
    (DATA_DIR / "outputs").mkdir(parents=True, exist_ok=True)


def build_share_outputs(job: Dict[str, Any]) -> Dict[str, Any]:
    html_path = Path(job["outputPath"]).resolve()
    if not html_path.exists():
        raise FileNotFoundError("output HTML is missing")

    output_dir = html_path.parent.resolve()
    outputs_root = (DATA_DIR / "outputs").resolve()
    if not PlatformHandler.is_safe_child(output_dir, outputs_root):
        raise ValueError("unsafe output path")

    single_path = output_dir / "index-single-file.html"
    scroll_path = output_dir / "index-scroll.html"
    scroll_single_path = output_dir / "index-scroll-single-file.html"
    report_path = output_dir / "share-report.json"
    readme_path = output_dir / "README-open.txt"

    html_text = html_path.read_text(encoding="utf-8-sig")
    image_items = analyze_image_sources(html_text, output_dir, job["id"])
    single_html, embedded_count = build_single_file_html(html_text, image_items, output_dir)
    single_path.write_text(single_html, encoding="utf-8-sig")

    scroll_image_items: list[Dict[str, Any]] = []
    scroll_embedded_count = 0
    if scroll_path.exists():
        scroll_html_text = scroll_path.read_text(encoding="utf-8-sig")
        scroll_image_items = analyze_image_sources(scroll_html_text, output_dir, job["id"])
        scroll_single_html, scroll_embedded_count = build_single_file_html(
            scroll_html_text,
            scroll_image_items,
            output_dir,
        )
        scroll_single_path.write_text(scroll_single_html, encoding="utf-8-sig")

    all_image_items = image_items + scroll_image_items
    missing = [item for item in all_image_items if item["status"] == "missing"]
    risky = [
        item
        for item in all_image_items
        if item["kind"] in {"absolute_local", "output_route", "root_relative", "unknown"}
    ]
    external = [item for item in all_image_items if item["kind"] == "external"]
    local_images = [
        item
        for item in all_image_items
        if item["status"] == "ok" and item["kind"] in {"relative", "absolute_local", "output_route"}
    ]
    status = "ready" if not missing else "blocked"
    if not missing and (risky or external):
        status = "warning"

    report = {
        "status": status,
        "jobId": job["id"],
        "fileName": job.get("fileName"),
        "generatedAt": time_string(),
        "totalImages": len(all_image_items),
        "localImages": len(local_images),
        "embeddedImages": embedded_count + scroll_embedded_count,
        "pagedEmbeddedImages": embedded_count,
        "scrollEmbeddedImages": scroll_embedded_count,
        "missingImages": len(missing),
        "riskyPaths": len(risky),
        "externalImages": len(external),
        "images": image_items,
        "scrollImages": scroll_image_items,
        "recommendation": share_recommendation(status, missing, risky, external),
        "zipPackageUrl": job.get("downloadUrl"),
        "singleFileUrl": f"/outputs/{job['id']}/index-single-file.html",
        "scrollSingleFileUrl": f"/outputs/{job['id']}/index-scroll-single-file.html" if scroll_path.exists() else "",
        "reportUrl": f"/outputs/{job['id']}/share-report.json",
        "readmeUrl": f"/outputs/{job['id']}/README-open.txt",
    }

    report_path.write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8-sig")
    readme_path.write_text(build_share_readme(job, report), encoding="utf-8-sig")
    return report


def build_inline_preview_payload(job: Dict[str, Any]) -> Dict[str, Any]:
    html_path = Path(job["outputPath"]).resolve()
    if not html_path.exists():
        return {"inlinePreviewError": "output_missing"}

    output_dir = html_path.parent.resolve()
    outputs_root = (DATA_DIR / "outputs").resolve()
    if not PlatformHandler.is_safe_child(output_dir, outputs_root):
        return {"inlinePreviewError": "unsafe_output_path"}

    max_chars = int(os.environ.get("PPT_HTML_INLINE_PREVIEW_MAX_CHARS", str(2_200_000)))
    payload: Dict[str, Any] = {"inlinePreviewMode": "blob"}

    html_text = html_path.read_text(encoding="utf-8-sig")
    image_items = analyze_image_sources(html_text, output_dir, str(job.get("id") or ""))
    single_html, _ = build_single_file_html(html_text, image_items, output_dir)
    if len(single_html) <= max_chars:
        payload["inlinePreviewHtml"] = single_html
    else:
        payload["inlinePreviewSkipped"] = f"paged HTML is too large for inline Vercel preview ({len(single_html)} chars)"

    scroll_path = output_dir / "index-scroll.html"
    if scroll_path.exists():
        scroll_html_text = scroll_path.read_text(encoding="utf-8-sig")
        scroll_image_items = analyze_image_sources(scroll_html_text, output_dir, str(job.get("id") or ""))
        scroll_single_html, _ = build_single_file_html(scroll_html_text, scroll_image_items, output_dir)
        if len(scroll_single_html) <= max_chars:
            payload["inlineScrollHtml"] = scroll_single_html
        else:
            payload["inlineScrollSkipped"] = f"scroll HTML is too large for inline Vercel preview ({len(scroll_single_html)} chars)"

    return payload


def analyze_image_sources(html_text: str, output_dir: Path, job_id: str) -> list[Dict[str, Any]]:
    items: list[Dict[str, Any]] = []
    for index, match in enumerate(IMG_SRC_PATTERN.finditer(html_text), start=1):
        src = match.group(2).strip()
        kind = classify_src(src, job_id)
        resolved = resolve_image_source(src, output_dir, job_id)
        status = "ok"
        size = None
        if kind == "data":
            status = "embedded"
        elif kind == "external":
            status = "external"
        elif not resolved or not resolved.exists() or not resolved.is_file():
            status = "missing"
        else:
            size = resolved.stat().st_size
        items.append(
            {
                "index": index,
                "src": src,
                "kind": kind,
                "status": status,
                "sizeBytes": size,
                "resolvedRelative": resolved.relative_to(output_dir).as_posix()
                if resolved and PlatformHandler.is_safe_child(resolved, output_dir)
                else "",
            }
        )
    return items


def classify_src(src: str, job_id: str) -> str:
    if src.startswith("data:"):
        return "data"
    if re.match(r"^https?://", src, re.IGNORECASE):
        if re.match(rf"^https?://(?:127\.0\.0\.1|localhost):\d+/outputs/{re.escape(job_id)}/", src, re.IGNORECASE):
            return "output_route"
        return "external"
    if src.startswith("file://") or re.match(r"^[A-Za-z]:[\\/]", src):
        return "absolute_local"
    if src.startswith(f"/outputs/{job_id}/"):
        return "output_route"
    if src.startswith("/"):
        return "root_relative"
    if src:
        return "relative"
    return "unknown"


def resolve_image_source(src: str, output_dir: Path, job_id: str) -> Path | None:
    clean = src.split("#", 1)[0].split("?", 1)[0]
    if not clean or clean.startswith("data:"):
        return None
    if re.match(r"^https?://", clean, re.IGNORECASE):
        route = re.sub(
            rf"^https?://(?:127\.0\.0\.1|localhost):\d+/outputs/{re.escape(job_id)}/",
            "",
            clean,
            flags=re.IGNORECASE,
        )
        if route != clean:
            return safe_output_path(output_dir, route)
        return None
    if clean.startswith("file:///"):
        return Path(clean.replace("file:///", "", 1).replace("/", "\\")).resolve()
    if re.match(r"^[A-Za-z]:[\\/]", clean):
        return Path(clean).resolve()
    if clean.startswith(f"/outputs/{job_id}/"):
        return safe_output_path(output_dir, clean.removeprefix(f"/outputs/{job_id}/"))
    if clean.startswith("/"):
        return None
    return safe_output_path(output_dir, clean)


def safe_output_path(output_dir: Path, relative: str) -> Path | None:
    candidate = (output_dir / relative).resolve()
    if PlatformHandler.is_safe_child(candidate, output_dir):
        return candidate
    return None


def build_single_file_html(
    html_text: str,
    image_items: list[Dict[str, Any]],
    output_dir: Path,
) -> tuple[str, int]:
    by_src = {item["src"]: item for item in image_items}
    embedded_count = 0

    def replace(match: re.Match[str]) -> str:
        nonlocal embedded_count
        prefix, src, suffix = match.group(1), match.group(2).strip(), match.group(3)
        item = by_src.get(src)
        if not item or item["status"] != "ok" or not item.get("resolvedRelative"):
            return match.group(0)
        source_path = (output_dir / str(item["resolvedRelative"])).resolve()
        if not PlatformHandler.is_safe_child(source_path, output_dir):
            return match.group(0)
        data_url = file_to_data_url(source_path)
        if not data_url:
            return match.group(0)
        embedded_count += 1
        return f"{prefix}{data_url}{suffix}"

    return IMG_SRC_PATTERN.sub(replace, html_text), embedded_count


def file_to_data_url(path: Path) -> str:
    if not path.exists() or not path.is_file():
        return ""
    content_type, _ = mimetypes.guess_type(str(path))
    content_type = content_type or "application/octet-stream"
    data = base64.b64encode(path.read_bytes()).decode("ascii")
    return f"data:{content_type};base64,{data}"


def share_recommendation(status: str, missing: list[Dict[str, Any]], risky: list[Dict[str, Any]], external: list[Dict[str, Any]]) -> str:
    if missing:
        return "Some referenced images are missing. Regenerate the deck or restore the missing assets before sharing."
    if external:
        return "Images are present, but external links may fail offline. Prefer the single-file HTML or ZIP package."
    if risky:
        return "Some paths needed normalization. Use the ZIP package or single-file HTML generated by this tool."
    return "Ready to share. Use the ZIP package for editable assets, or the single-file HTML when sending one file."


def build_share_readme(job: Dict[str, Any], report: Dict[str, Any]) -> str:
    return (
        "PPT HTML Studio share package\n"
        "================================\n\n"
        f"Source file: {job.get('fileName', '')}\n"
        f"Job: {job.get('id', '')}\n"
        f"Share status: {report['status']}\n"
        f"Images checked: {report['totalImages']}\n"
        f"Missing images: {report['missingImages']}\n\n"
        "How to share:\n"
        "1. Send the ZIP package when you want to keep index.html and the assets folder together.\n"
        "2. Send index-single-file.html when you need one standalone paged file.\n"
        "3. Send index-scroll-single-file.html when you need one standalone vertical scrolling file.\n"
        "4. Keep index.html or index-scroll.html and assets/ in the same folder if you move files manually.\n\n"
        f"Recommendation: {report['recommendation']}\n"
    )


def time_string() -> str:
    from datetime import datetime

    return datetime.now().strftime("%Y-%m-%d %H:%M:%S")


class PlatformHandler(BaseHTTPRequestHandler):
    server_version = "PPTHTMLStudio/1.0"

    def do_OPTIONS(self) -> None:
        self.send_response(HTTPStatus.NO_CONTENT)
        self.send_cors_headers()
        self.send_header("Access-Control-Max-Age", "86400")
        self.end_headers()

    def send_cors_headers(self) -> None:
        self.send_header("Access-Control-Allow-Origin", os.environ.get("CORS_ALLOW_ORIGIN", "*"))
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, Authorization, X-API-Key, api-key")
        self.send_header("Access-Control-Expose-Headers", "Content-Disposition")

    def do_GET(self) -> None:
        parsed = urlparse(self.path)
        path = unquote(parsed.path)

        if path == "/api/health":
            is_vercel = bool(os.environ.get("VERCEL"))
            max_payload = VERCEL_MAX_PAYLOAD_BYTES if is_vercel else LOCAL_MAX_PAYLOAD_BYTES
            max_raw_upload = VERCEL_SAFE_RAW_UPLOAD_BYTES if is_vercel else LOCAL_SAFE_RAW_UPLOAD_BYTES
            external_backend = (os.environ.get("PUBLIC_BACKEND_ORIGIN") or os.environ.get("BACKEND_ORIGIN") or "").rstrip("/")
            self.write_json(
                {
                    "status": "ok",
                    "appRoot": str(APP_ROOT),
                    "dataRoot": str(DATA_DIR),
                    "runtime": "vercel" if is_vercel else "local",
                    "maxUploadMb": round(max_raw_upload / 1024 / 1024, 2),
                    "maxRawUploadMb": round(max_raw_upload / 1024 / 1024, 2),
                    "maxRawUploadBytes": max_raw_upload,
                    "maxPayloadMb": round(max_payload / 1024 / 1024, 2),
                    "maxPayloadBytes": max_payload,
                    "externalBackendOrigin": external_backend,
                    "largeUploadRecommendation": (
                        "Use Vercel Blob client uploads or deploy the Python backend to Render/Railway/Fly/cloud server for large PPT files."
                        if is_vercel
                        else "Local backend can accept large PPT files."
                    ),
                }
            )
            return

        if path == "/api/jobs":
            jobs = load_jobs(JOBS_PATH)
            self.write_json({"jobs": jobs})
            return

        if path == "/api/integration":
            config = load_integration_config(INTEGRATION_PATH)
            self.write_json({"integration": public_integration_config(config)})
            return

        if path == "/api/help/api-guide":
            guide_path = (APP_ROOT.parent / "API配置教程.md").resolve()
            project_root = APP_ROOT.parent.resolve()
            if self.is_safe_child(guide_path, project_root) and guide_path.exists():
                markdown = guide_path.read_text(encoding="utf-8-sig")
            else:
                markdown = DEFAULT_API_GUIDE
            self.write_json({"title": "API Configuration Tutorial", "markdown": markdown})
            return

        if path.startswith("/api/jobs/") and path.endswith("/download"):
            self.download_job(path)
            return

        if path.startswith("/api/jobs/") and path.endswith("/share"):
            self.handle_share_job(path)
            return

        if path.startswith("/api/jobs/"):
            job_id = path.strip("/").split("/")[2]
            job = next((item for item in load_jobs(JOBS_PATH) if item["id"] == job_id), None)
            if not job:
                self.write_json({"error": "job_not_found"}, HTTPStatus.NOT_FOUND)
                return
            self.write_json({"job": job})
            return

        if path.startswith("/outputs/"):
            self.serve_output_file(path)
            return

        if path == "/":
            self.serve_file(FRONTEND_DIR / "index.html")
            return

        page_aliases = {
            "/settings": "ai-settings.html",
            "/settings.html": "ai-settings.html",
            "/ai-settings": "ai-settings.html",
            "/ai-settings.html": "ai-settings.html",
            "/converter": "converter.html",
            "/ai-generate": "ai-generate.html",
            "/ai-create": "ai-generate.html",
            "/ai-create.html": "ai-generate.html",
            "/quick-create": "ai-generate.html",
            "/quick-create.html": "ai-generate.html",
            "/chat-create": "chat-create.html",
        }
        if path in page_aliases:
            self.serve_file(FRONTEND_DIR / page_aliases[path])
            return

        frontend_path = (FRONTEND_DIR / path.lstrip("/")).resolve()
        if self.is_safe_child(frontend_path, FRONTEND_DIR) and frontend_path.exists():
            self.serve_file(frontend_path)
            return

        self.write_json({"error": "not_found", "path": path}, HTTPStatus.NOT_FOUND)

    def do_POST(self) -> None:
        parsed = urlparse(self.path)
        path = unquote(parsed.path)

        if path == "/api/generate":
            self.handle_generate()
            return

        if path == "/api/integration":
            self.handle_save_integration()
            return

        if path == "/api/integration/test":
            self.handle_test_integration()
            return

        if path.startswith("/api/jobs/") and path.endswith("/save-edited"):
            self.handle_save_edited_job(path)
            return

        self.write_json({"error": "not_found", "path": path}, HTTPStatus.NOT_FOUND)

    def read_json_body(self, max_bytes: int = 2 * 1024 * 1024) -> Dict[str, Any]:
        content_length = int(self.headers.get("Content-Length", "0"))
        if content_length <= 0:
            return {}
        if content_length > max_bytes:
            raise ValueError("request body is too large")
        return json.loads(self.rfile.read(content_length).decode("utf-8"))

    def handle_save_integration(self) -> None:
        try:
            payload = self.read_json_body()
            config = save_integration_config(INTEGRATION_PATH, payload.get("integration") or payload)
            self.write_json({"integration": public_integration_config(config)})
        except Exception as exc:
            self.write_json(
                {"error": "integration_save_failed", "message": str(exc)},
                HTTPStatus.BAD_REQUEST,
            )

    def handle_test_integration(self) -> None:
        try:
            posted = self.read_json_body()
            if posted:
                config = save_integration_config(INTEGRATION_PATH, posted.get("integration") or posted)
            else:
                config = load_integration_config(INTEGRATION_PATH)
            if config.get("mode") == "local":
                self.write_json({"ok": True, "mode": "local", "message": "Local generation is ready."})
                return
            if config.get("mode") == "ai_api":
                config = dict(config)
                config["endpoint"] = normalize_chat_endpoint(str(config.get("endpoint") or ""))
            response = post_json(config, build_test_payload(config))
            self.write_json(
                {
                    "ok": True,
                    "mode": config.get("mode"),
                    "message": "API endpoint responded successfully.",
                    "responseKeys": list(response.keys())[:20] if isinstance(response, dict) else [],
                }
            )
        except Exception as exc:
            self.write_json(
                {"ok": False, "error": "integration_test_failed", "message": str(exc)},
                HTTPStatus.BAD_GATEWAY,
            )

    def handle_generate(self) -> None:
        try:
            content_length = int(self.headers.get("Content-Length", "0"))
            if content_length <= 0:
                self.write_json({"error": "empty_body"}, HTTPStatus.BAD_REQUEST)
                return
            max_payload = VERCEL_MAX_PAYLOAD_BYTES if os.environ.get("VERCEL") else LOCAL_MAX_PAYLOAD_BYTES
            if content_length > max_payload:
                message = (
                    "This Vercel deployment only supports small direct PPT uploads because Vercel Function request bodies are limited. "
                    f"Use a PPT up to about {VERCEL_SAFE_RAW_UPLOAD_BYTES / 1024 / 1024:.1f}MB, run the app locally, deploy the Python service to Render/Railway/Fly, or add Vercel Blob direct upload."
                    if os.environ.get("VERCEL")
                    else "request payload is too large"
                )
                self.write_json(
                    {
                        "error": "payload_too_large",
                        "message": message,
                        "maxPayloadBytes": max_payload,
                        "maxRawUploadBytes": VERCEL_SAFE_RAW_UPLOAD_BYTES if os.environ.get("VERCEL") else LOCAL_SAFE_RAW_UPLOAD_BYTES,
                    },
                    HTTPStatus.REQUEST_ENTITY_TOO_LARGE,
                )
                return

            body = self.rfile.read(content_length).decode("utf-8")
            payload = json.loads(body)
            filename = payload.get("filename") or "presentation.pptx"
            file_b64 = payload.get("fileBase64")
            style = payload.get("style") or "clean"
            options = payload.get("options") or {}
            options["integrationConfig"] = load_integration_config(INTEGRATION_PATH)
            options["dataRoot"] = str(DATA_DIR)
            if not file_b64:
                self.write_json({"error": "file_required"}, HTTPStatus.BAD_REQUEST)
                return

            result = process_ppt(filename, file_b64, style, APP_ROOT, options)
            jobs = load_jobs(JOBS_PATH)
            jobs.insert(0, result.job)
            save_jobs(JOBS_PATH, jobs[:50])
            response_job = dict(result.job)
            if os.environ.get("VERCEL"):
                response_job.update(build_inline_preview_payload(result.job))
            self.write_json({"job": response_job})
        except Exception as exc:
            self.write_json(
                {
                    "error": "generation_failed",
                    "message": str(exc),
                    "trace": traceback.format_exc(limit=6),
                },
                HTTPStatus.INTERNAL_SERVER_ERROR,
            )

    def handle_share_job(self, path: str) -> None:
        job_id = path.strip("/").split("/")[2]
        jobs = load_jobs(JOBS_PATH)
        job = next((item for item in jobs if item["id"] == job_id), None)
        if not job:
            self.write_json({"error": "job_not_found"}, HTTPStatus.NOT_FOUND)
            return
        try:
            share = build_share_outputs(job)
            job["share"] = share
            save_jobs(JOBS_PATH, jobs[:50])
            self.write_json({"share": share, "job": job})
        except Exception as exc:
            self.write_json(
                {
                    "error": "share_analysis_failed",
                    "message": str(exc),
                    "trace": traceback.format_exc(limit=6),
                },
                HTTPStatus.INTERNAL_SERVER_ERROR,
            )

    def handle_save_edited_job(self, path: str) -> None:
        job_id = path.strip("/").split("/")[2]
        jobs = load_jobs(JOBS_PATH)
        job = next((item for item in jobs if item["id"] == job_id), None)
        if not job:
            self.write_json({"error": "job_not_found"}, HTTPStatus.NOT_FOUND)
            return
        try:
            payload = self.read_json_body(max_bytes=80 * 1024 * 1024)
            html_path = Path(job["outputPath"]).resolve()
            output_dir = html_path.parent.resolve()
            outputs_root = (DATA_DIR / "outputs").resolve()
            if not self.is_safe_child(output_dir, outputs_root):
                self.write_json({"error": "unsafe_output_path"}, HTTPStatus.BAD_REQUEST)
                return
            paged_html = str(payload.get("pagedHtml") or "")
            scroll_html = str(payload.get("scrollHtml") or "")
            if paged_html:
                (output_dir / "index.html").write_text(paged_html, encoding="utf-8-sig")
            if scroll_html:
                (output_dir / "index-scroll.html").write_text(scroll_html, encoding="utf-8-sig")
            job["editedAt"] = time_string()
            job["share"] = build_share_outputs(job)
            save_jobs(JOBS_PATH, jobs[:50])
            self.write_json({"job": job, "share": job["share"]})
        except Exception as exc:
            self.write_json(
                {
                    "error": "save_edited_failed",
                    "message": str(exc),
                    "trace": traceback.format_exc(limit=6),
                },
                HTTPStatus.INTERNAL_SERVER_ERROR,
            )

    def download_job(self, path: str) -> None:
        job_id = path.strip("/").split("/")[2]
        jobs = load_jobs(JOBS_PATH)
        job = next((item for item in jobs if item["id"] == job_id), None)
        if not job:
            self.write_json({"error": "job_not_found"}, HTTPStatus.NOT_FOUND)
            return
        html_path = Path(job["outputPath"]).resolve()
        if not html_path.exists():
            self.write_json({"error": "output_missing"}, HTTPStatus.NOT_FOUND)
            return
        output_dir = html_path.parent.resolve()
        outputs_root = (DATA_DIR / "outputs").resolve()
        if not self.is_safe_child(output_dir, outputs_root):
            self.write_json({"error": "unsafe_output_path"}, HTTPStatus.BAD_REQUEST)
            return
        try:
            job["share"] = build_share_outputs(job)
            save_jobs(JOBS_PATH, jobs[:50])
        except Exception as exc:
            self.write_json(
                {
                    "error": "share_package_failed",
                    "message": str(exc),
                    "trace": traceback.format_exc(limit=6),
                },
                HTTPStatus.INTERNAL_SERVER_ERROR,
            )
            return
        archive = io.BytesIO()
        with zipfile.ZipFile(archive, "w", zipfile.ZIP_DEFLATED) as package:
            for item in sorted(output_dir.rglob("*")):
                if item.is_file():
                    package.write(item, item.relative_to(output_dir).as_posix())
        data = archive.getvalue()
        self.send_response(HTTPStatus.OK)
        self.send_cors_headers()
        self.send_header("Content-Type", "application/zip")
        self.send_header("Content-Disposition", f"attachment; filename=\"{job_id}-html-package.zip\"")
        self.send_header("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0")
        self.send_header("Pragma", "no-cache")
        self.send_header("Expires", "0")
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        self.wfile.write(data)

    def serve_output_file(self, path: str) -> None:
        relative = path.removeprefix("/outputs/")
        target = (DATA_DIR / "outputs" / relative).resolve()
        outputs_root = (DATA_DIR / "outputs").resolve()
        if not self.is_safe_child(target, outputs_root) or not target.exists() or not target.is_file():
            self.write_json({"error": "output_not_found"}, HTTPStatus.NOT_FOUND)
            return
        self.serve_file(target)

    def serve_file(self, target: Path) -> None:
        target = target.resolve()
        if not target.exists() or not target.is_file():
            self.write_json({"error": "file_not_found"}, HTTPStatus.NOT_FOUND)
            return
        content_type, _ = mimetypes.guess_type(str(target))
        if target.suffix.lower() in {".html", ".css", ".js", ".json"}:
            content_type = {
                ".html": "text/html; charset=utf-8",
                ".css": "text/css; charset=utf-8",
                ".js": "application/javascript; charset=utf-8",
                ".json": "application/json; charset=utf-8",
            }[target.suffix.lower()]
        content_type = content_type or "application/octet-stream"
        data = target.read_bytes()
        self.send_response(HTTPStatus.OK)
        self.send_cors_headers()
        self.send_header("Content-Type", content_type)
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        self.wfile.write(data)

    def write_json(self, payload: dict, status: HTTPStatus = HTTPStatus.OK) -> None:
        data = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_cors_headers()
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Cache-Control", "no-store")
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        self.wfile.write(data)

    @staticmethod
    def is_safe_child(path: Path, root: Path) -> bool:
        try:
            path.resolve().relative_to(root.resolve())
            return True
        except ValueError:
            return False

    def log_message(self, fmt: str, *args: object) -> None:
        sys.stderr.write("[%s] %s\n" % (self.log_date_time_string(), fmt % args))


def main() -> None:
    parser = argparse.ArgumentParser(description="Run PPT HTML Studio")
    parser.add_argument("--host", default="127.0.0.1")
    parser.add_argument("--port", type=int, default=5177)
    args = parser.parse_args()

    ensure_data_dirs()

    server = ThreadingHTTPServer((args.host, args.port), PlatformHandler)
    print(f"PPT HTML Studio is running at http://{args.host}:{args.port}")
    print(f"Workspace: {APP_ROOT}")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nShutting down")
    finally:
        server.server_close()


if __name__ == "__main__":
    main()
