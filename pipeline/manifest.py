"""Builds pipeline/manifest.json from the data table on IDOT's stop study page.

Run: .venv/bin/python -m pipeline.manifest
"""
import html
import json
import re
import urllib.request
from pathlib import Path

PAGE = "https://idot.illinois.gov/form-and-reports/crash-reports/illinois-traffic-and-pedestrian-stop-study.html"
SITE = "https://idot.illinois.gov"
# The page loads its report table from this JSON endpoint (found in the page's data-table-api attribute).
TABLE_API = (SITE + "/content/soi/idot/en/form-and-reports/crash-reports/illinois-traffic-and-pedestrian-stop-study/"
             "jcr:content/responsivegrid/container/container/container/accordion/item_1745864094024/"
             "data_table_copy.datatablejson.json")
MANIFEST_PATH = Path(__file__).parent / "manifest.json"


def classify_kind(text: str) -> str:
    t = text.lower()
    # The "data sheet" PDFs on IDOT's page are the blank forms agencies fill in, not data.
    if "data sheet" in t or "data-sheet" in t:
        return "form"
    if "ratio" in t:
        return "ratios"  # multi-year ratio listings; the per-agency reports carry the same figures
    if "press release" in t or "concerns" in t or "response" in t:
        return "other"
    if re.search(r"part[ _-]*(ii|2)\b|ipss_2|tables|detailed|agency reports|statewide and agency", t):
        return "detail-tables"
    if re.search(r"exec(utive)? summary|summary|statewide report|part[ _-]*(i|1)\b|ipss_1", t):
        return "executive-summary"
    # 2004-2012: "Illinois Traffic Stop Study/Report" is the full report with every agency
    if re.search(r"traffic stop (study|report)", t):
        return "detail-tables"
    return "other"


def classify_stop_type(filename: str, title: str) -> str:
    # Titles like "Traffic And Pedestrian Stop Study 2020 Traffic" name both, so the last keyword wins.
    for text in (filename, title):
        found = re.findall(r"traffic|pedestrian|ipss|itss", text.lower())
        if found:
            return "pedestrian" if found[-1] in ("pedestrian", "ipss") else "traffic"
    return "traffic"


def build_entries(rows):
    entries = []
    for link_html, _description, year in rows:
        match = re.search(r"href='([^']+)'[^>]*>(.*?)</a>", link_html)
        path, title = match.group(1), html.unescape(match.group(2)).strip()
        filename = path.rsplit("/", 1)[-1]
        label = f"{title} {filename}"
        entries.append({
            "year": int(year),
            "stopType": classify_stop_type(filename, title),
            "kind": classify_kind(label),
            "title": title,
            "url": SITE + path,
        })
    return sorted(entries, key=lambda e: (e["year"], e["stopType"], e["kind"], e["title"]))


def main():
    with urllib.request.urlopen(TABLE_API, timeout=60) as response:
        rows = json.load(response)["data"]
    entries = build_entries(rows)
    MANIFEST_PATH.write_text(json.dumps({"source": PAGE, "files": entries}, indent=2) + "\n")
    print(f"{len(entries)} files written to {MANIFEST_PATH}")


if __name__ == "__main__":
    main()
