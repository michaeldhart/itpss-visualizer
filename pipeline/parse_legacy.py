"""Parser for the 2004-2018 per-agency reports (position-sorted page text).

Traffic pages have a "Key Indicators" table of stops by race and an estimated minority driving
population percentage, but no benchmark by race. Pedestrian pages (2016-2018) add "Community
Demographics", a population count by race.
"""
import re
from typing import Dict, List, Optional

from .parse_tables import to_number

TITLE = re.compile(r"ILLINOIS (TRAFFIC|PEDESTRIAN) STOP STUDY[,\s]*(\d{4})", re.I)
# 2007's pages have a stray character glued to the label ("RAgency: ALBERS POLICE")
AGENCY = re.compile(r"^\s*[A-Za-z]?Agency:?\s+(\S.*?)\s*$", re.M)
MINORITY_POPULATION = re.compile(r"Estimated Minority Driving Population\s+([\d.]+)")
NUMBER = re.compile(r"(?<![\w.])\d[\d,]*(?:\.\d+)?(?![\w.])")

# Column headings in the Key Indicators tables, which vary by year. Wrapped headings leave only
# their last word on the heading row ("African / American", "Am. / Indian"), so single words
# map too.
COLUMN = re.compile(
    r"African American|American Indian|Am\. Indian|Total|Caucasian|White|WH|Black|AA|AI|Hispanic|HIS|Asian|Asia|ASN|NH|N/S|American|Americ|Indian|(?<!\w)n(?!\w)",
    re.I)
COLUMN_GROUP = {
    "total": "total", "caucasian": "white", "white": "white", "wh": "white",
    "african american": "black", "american": "black", "black": "black", "aa": "black",
    "n": "black", "americ": "black",  # wrapped 2008 headings: "Africa/n", "Americ"
    "american indian": "americanIndian", "am. indian": "americanIndian", "indian": "americanIndian", "ai": "americanIndian",
    "hispanic": "hispanic", "his": "hispanic", "asian": "asian", "asia": "asian", "asn": "asian",
    "nh": "pacificIslander", "n/s": "notStated",
}


def numbers(line: str) -> List[float]:
    return [to_number(n) for n in NUMBER.findall(line)]


# 2004-2007 split the African American and American Indian headings onto neighbouring lines, leaving
# five names on the heading row. Where those two columns sit differs by year, confirmed against
# the statewide race shares.
SPLIT_HEADING = ["total", "white", "hispanic", "asian", "notStated"]
SPLIT_HEADING_ORDER = {
    "early": ["total", "white", "black", "hispanic", "asian", "americanIndian", "notStated"],  # 2004-2006
    "2007": ["total", "white", "black", "americanIndian", "hispanic", "asian", "notStated"],
}


def key_indicator_columns(text: str, label: str, year: int) -> Optional[Dict[str, float]]:
    """Maps group -> value from the row labelled `label` ("Stops"/"Total Stops") under Key Indicators."""
    lines = text.split("\n")
    header = next((i for i, l in enumerate(lines) if "Key Indicators" in l), None)
    if header is None:
        return None
    columns = [COLUMN_GROUP[m.group(0).lower()] for m in COLUMN.finditer(lines[header])]
    row = next((l for l in lines[header + 1:] if re.match(rf"^\s*{label}\s+\d", l)), None)
    if row is None:
        return None
    values = numbers(row)
    if columns == SPLIT_HEADING and len(values) == 7 and year <= 2007:
        columns = SPLIT_HEADING_ORDER["2007" if year == 2007 else "early"]
    if len(values) != len(columns):
        return {"_mismatch": (columns, values)}
    return dict(zip(columns, values))


# Some pages (mostly 2013, a few 2014) print a stray character where every space should be,
# and which character varies by page. The page's own labels give it away.
GARBLED = re.compile(r"ILLINOIS(\S)(?:TRAFFIC|PEDESTRIAN)\1STOP|Key(\S)Indicators|Estimated(\S)Minority")


def repair(text: str) -> str:
    """Undoes the stray-space characters. Digits only stand in for a space when they follow a
    letter or punctuation, so numbers are left alone."""
    # one page can use more than one stray character (a "/" in the title and a "4" in the body)
    chars = {g for match in GARBLED.finditer(text) for g in match.groups() if g}
    if not chars:
        return text
    text = text.replace("N/S", "N\x00S")
    for char in sorted(chars, key=lambda c: not c.isdigit()):  # digits first, so ",0" in a title is read before "," goes
        if char.isdigit():
            text = re.sub(rf"(?<=[A-Za-z:,.)]){char}", " ", text)
        else:
            text = text.replace(char, " ")
    return text.replace("N\x00S", "N/S")


def parse_page(text: str) -> Optional[dict]:
    """Parses a page that starts with an agency's results, otherwise returns None."""
    text = repair(text)
    title, agency = TITLE.search(text), AGENCY.search(text)
    if not title or not agency or "Key Indicators" not in text:
        return None
    stop_type = title.group(1).lower()
    label = "Stops" if stop_type == "traffic" else "Total Stops"
    year = int(title.group(2))
    row = key_indicator_columns(text, label, year)

    record = {"stopType": stop_type, "year": year, "agency": agency.group(1), "benchmarkMethod": None,
              "problems": [], "warnings": []}
    problems, warnings = record["problems"], record["warnings"]
    if row is None:
        problems.append("no stops row in Key Indicators")
        return record
    if "_mismatch" in row:
        columns, values = row["_mismatch"]
        problems.append(f"{len(columns)} columns but {len(values)} values")
        return record

    total = row.pop("total", None)
    not_stated = row.pop("notStated", 0)
    named = sum(row.values())
    if total is None or named + not_stated != total:
        # 2005's reports sometimes leave N/S stops out of the printed total
        if total is not None and named == total:
            warnings.append(f"total stops excludes {int(not_stated)} N/S stops")
        else:
            problems.append(f"stops by race sum to {named + not_stated}, total is {total}")
            return record

    benchmark = community_demographics(text, warnings) if stop_type == "pedestrian" else None
    if stop_type == "pedestrian" and "Community Demographics" in text and not benchmark:
        warnings.append("community demographics are inconsistent in the report; benchmark omitted")
    groups = {g: {"stops": int(s), "benchmark": benchmark["groups"].get(g) if benchmark else None} for g, s in row.items()}
    record.update({
        "totalStops": int(total),
        "totalBenchmark": benchmark["total"] if benchmark else None,
        "groups": groups,
        "notStated": int(not_stated),
    })
    if benchmark:
        record["benchmarkMethod"] = "Community demographics"

    minority = MINORITY_POPULATION.search(text)
    if minority:
        record["minorityBenchmarkPercent"] = float(minority.group(1))
    return record


# Community Demographics lists the six groups on one line and the total on the line below.
DEMOGRAPHIC_GROUPS = ["white", "black", "americanIndian", "hispanic", "asian", "pacificIslander"]


def community_demographics(text: str, warnings: List[str]) -> Optional[dict]:
    lines = text.split("\n")
    start = next((i for i, l in enumerate(lines) if "Community Demographics" in l), None)
    if start is None:
        return None
    counts = numbers(lines[start].split("Community Demographics", 1)[1])
    following = next((l for l in lines[start + 1:] if l.strip()), "")
    total = numbers(following)
    if len(counts) != len(DEMOGRAPHIC_GROUPS) or len(total) != 1:
        return None
    gap = abs(sum(counts) - total[0])
    if gap > max(2, total[0] * 0.0005):
        return None
    if gap:
        # a few agencies' printed totals are slightly off from their parts (IDOT's own inconsistency)
        warnings.append(f"community demographics sum to {int(sum(counts))}, printed total is {int(total[0])}")
    return {"total": int(total[0]), "groups": {g: int(c) for g, c in zip(DEMOGRAPHIC_GROUPS, counts)}}


def parse_pages(pages: List[str]) -> List[dict]:
    records = []
    for number, text in enumerate(pages, start=1):
        record = parse_page(text)
        if not record and re.search(r"Key.?Indicators", text):
            # never skip an agency's results silently
            record = {"agency": text.strip()[:60].replace("\n", " "), "problems": ["unrecognized agency page"], "warnings": []}
        if record:
            record["page"] = number
            records.append(record)
    return records
