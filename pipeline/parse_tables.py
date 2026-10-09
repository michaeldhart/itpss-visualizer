"""Parser for the "Part II detailed tables" reports (each agency has a Panel 1 summarizing
stops and the population benchmark by race)."""
import json
import re
from pathlib import Path
from typing import List, Optional

PAGE_OVERRIDES = {k: v for k, v in json.loads((Path(__file__).parent / "page_overrides.json").read_text()).items()
                  if not k.startswith("_")}

# Column order of the race groups in every table.
GROUPS = ["white", "black", "hispanic", "asian", "americanIndian", "pacificIslander"]

STATEWIDE = "ILLINOIS STATEWIDE RESULTS"

# The benchmark description after the agency name varies by year ("Population Benchmark: Crash-based*",
# "Benchmark - County: Kane, McHenry"), and is absent in 2019.
TITLE = re.compile(
    r"Summary of (Traffic|Pedestrian) Stops for (\d{4}) [-–] (.+?)(?:\s+(?:Population )?Benchmark\s*[:-]\s*([^\n]*?))?\s*\n")
TOTALS = re.compile(r"Total stops:\s*([\d,]+)\.\s*Total (?:population )?benchmark(?: population)?:\s*([\d,]+)")
# Table rows list one value per line, optionally followed by a percentage: "1,025,876 (50%)"
VALUE_AT_LINE_START = re.compile(r"^\s*(\d[\d,]*(?:\.\d+)?)", re.M)
STOPS_LABEL = re.compile(r"^Stops(?: \(% of Total\))?\s*$", re.M)
BENCHMARK_LABEL = re.compile(r"^(?:Population )?Benchmark(?: \(% of Total\))?\s*$", re.M)
RATE_LABEL = re.compile(r"^(?:Population )?Stop Rate\s*$", re.M)


def to_number(text: str) -> float:
    value = float(text.replace(",", ""))
    return int(value) if value == int(value) else value


def values_between(panel: str, start: re.Pattern, end: re.Pattern) -> List[float]:
    begin = start.search(panel)
    if not begin:
        return []
    finish = end.search(panel, begin.end())
    segment = panel[begin.end():finish.start() if finish else len(panel)]
    return [to_number(v) for v in VALUE_AT_LINE_START.findall(segment)]


BENCHMARK_TYPE = re.compile(r"Benchmark Type:\s*([^.\n(]+)")


def parse_page(text: str, override_agency: Optional[str] = None, context: str = "") -> Optional[dict]:
    """Parses a page that starts an agency's tables (contains Panel 1), otherwise returns None.

    override_agency supplies the header for a page whose header line is missing; context is the
    "{stop type} {year}" it belongs to.
    """
    if "Panel: 1" not in text:
        return None
    if override_agency:
        panel_type, _, year = context.partition(" ")
        text = f"Summary of {panel_type.capitalize()} Stops for {year} - {override_agency}\n" + text
    title = TITLE.search(text)
    if not title:
        # never skip a table silently
        return {"agency": text[:60].replace("\n", " "), "problems": ["unrecognized page header"]}

    panel = text[text.index("Panel: 1"):]
    panel = panel[:panel.index("Panel: 2")] if "Panel: 2" in panel else panel
    totals = TOTALS.search(panel)
    stops = values_between(panel, STOPS_LABEL, BENCHMARK_LABEL)
    benchmark = values_between(panel, BENCHMARK_LABEL, RATE_LABEL)

    method = re.sub(r"[\s*]+", " ", title.group(4)).strip() if title.group(4) else None
    if method is None and BENCHMARK_TYPE.search(text):
        method = BENCHMARK_TYPE.search(text).group(1).strip()
    # A few agencies (e.g. multi-agency task forces) have no benchmark; keep their stop counts.
    no_benchmark = method is not None and method.startswith("None") and not benchmark

    problems = []
    if not totals:
        problems.append("missing totals line")
    if len(stops) != len(GROUPS) or (len(benchmark) != len(GROUPS) and not no_benchmark):
        problems.append(f"expected {len(GROUPS)} groups, got {len(stops)} stops / {len(benchmark)} benchmark values")

    record = {
        "stopType": title.group(1).lower(),
        "year": int(title.group(2)),
        "agency": re.sub(r"\s+", " ", title.group(3)).strip(),
        "benchmarkMethod": method,
        "problems": problems,
    }
    if not problems:
        record["totalStops"] = to_number(totals.group(1))
        record["totalBenchmark"] = None if no_benchmark else to_number(totals.group(2))
        record["groups"] = {g: {"stops": int(s), "benchmark": None if no_benchmark else b}
                            for g, s, b in zip(GROUPS, stops, benchmark or [None] * len(GROUPS))}
        if sum(stops) != record["totalStops"]:
            problems.append(f"stops sum {sum(stops)} != stated total {record['totalStops']}")
        if not no_benchmark and round(sum(benchmark)) != record["totalBenchmark"]:
            problems.append(f"benchmark sum {round(sum(benchmark))} != stated total {record['totalBenchmark']}")
    return record


def parse_pages(pages: List[str], stop_type: str = "", year: int = 0) -> List[dict]:
    records = []
    for number, text in enumerate(pages, start=1):
        override = PAGE_OVERRIDES.get(f"{year}/{stop_type}/{number}")
        record = parse_page(text, override, f"{stop_type} {year}")
        if record:
            record["page"] = number
            records.append(record)
    return records
