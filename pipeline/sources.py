"""Downloading source PDFs and extracting their text.

PDFs and extracted text are cached under pipeline/cache/ (not committed). Checksums of the
downloaded PDFs are recorded in pipeline/manifest.lock.json so a re-download can be verified.
"""
import hashlib
import json
import urllib.parse
import urllib.request
from pathlib import Path

import fitz  # PyMuPDF

ROOT = Path(__file__).parent
CACHE = ROOT / "cache"
LOCK_PATH = ROOT / "manifest.lock.json"


def load_manifest():
    return json.loads((ROOT / "manifest.json").read_text())["files"]


def select(year=None, stop_type=None, kind="detail-tables"):
    return [e for e in load_manifest()
            if (year is None or e["year"] == year)
            and (stop_type is None or e["stopType"] == stop_type)
            and (kind is None or e["kind"] == kind)]


def pdf_path(entry) -> Path:
    name = urllib.parse.unquote(entry["url"].rsplit("/", 1)[-1])
    return CACHE / "pdf" / f"{entry['year']}-{entry['stopType']}-{entry['kind']}-{name}"


def download(entry) -> Path:
    path = pdf_path(entry)
    if not path.exists():
        path.parent.mkdir(parents=True, exist_ok=True)
        url = urllib.parse.quote(entry["url"], safe=":/")
        with urllib.request.urlopen(url, timeout=300) as response:
            path.write_bytes(response.read())
    lock = json.loads(LOCK_PATH.read_text()) if LOCK_PATH.exists() else {}
    sha = hashlib.sha256(path.read_bytes()).hexdigest()
    if lock.get(entry["url"], {}).get("sha256") not in (None, sha):
        print(f"WARNING: {entry['url']} changed since it was last downloaded")
    lock[entry["url"]] = {"sha256": sha, "bytes": path.stat().st_size}
    LOCK_PATH.write_text(json.dumps(lock, indent=2, sort_keys=True) + "\n")
    return path


def page_texts(entry, sort=False) -> list:
    """Text of every page of the entry's PDF, cached after the first extraction.

    sort=True orders text blocks by position on the page, which keeps table rows together
    for the older reports whose content streams are stored column by column.
    """
    cached = CACHE / ("text-sorted" if sort else "text") / (pdf_path(entry).stem + ".json")
    if cached.exists():
        return json.loads(cached.read_text())
    with fitz.open(download(entry)) as doc:
        pages = [page.get_text(sort=sort) for page in doc]
    cached.parent.mkdir(parents=True, exist_ok=True)
    cached.write_text(json.dumps(pages))
    return pages
