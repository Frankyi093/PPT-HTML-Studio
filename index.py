import os
import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
BACKEND_DIR = ROOT / "app" / "backend"

os.environ.setdefault("PPT_HTML_DATA_DIR", "/tmp/ppt-html-platform-data")

sys.path.insert(0, str(BACKEND_DIR))

from server import PlatformHandler, ensure_data_dirs  # noqa: E402


class handler(PlatformHandler):
    def do_GET(self) -> None:
        ensure_data_dirs()
        super().do_GET()

    def do_POST(self) -> None:
        ensure_data_dirs()
        super().do_POST()
