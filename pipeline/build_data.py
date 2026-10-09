"""Parses the cached PDFs and writes the JSON the site reads into public/data/.

Run: .venv/bin/python -m pipeline.build_data [--years 2019-2025]
"""
import argparse
import json
import re
import shutil
import sys
from collections import Counter, defaultdict
from pathlib import Path

from . import names, parse_legacy, parse_tables, sources

PUBLIC_DATA = Path(__file__).parent.parent / "public" / "data"
STATEWIDE_ID = "illinois-statewide"
FIRST_DETAIL_TABLES_YEAR = 2019  # earlier reports are per-agency pages with a different layout
WARNINGS_PATH = Path(__file__).parent / "data_warnings.txt"
STOP_TYPES = ("traffic", "pedestrian")


def is_statewide(raw_name: str) -> bool:
    return re.sub(r"\s+", "", raw_name).upper() in ("ILLINOISSTATEWIDE", "ILLINOISSTATEWIDERESULTS")


def year_stats(record: dict, incomplete: bool) -> dict:
    groups = record["groups"]
    stats = {
        "totalStops": record["totalStops"],
        "totalBenchmark": record["totalBenchmark"],
        **{g: groups[g] for g in ("white", "black", "hispanic")},
        **{g: groups[g] for g in ("asian", "americanIndian", "pacificIslander") if g in groups},
    }
    if record.get("notStated"):
        stats["notStated"] = {"stops": record["notStated"], "benchmark": None}
    if "minorityBenchmarkPercent" in record:
        stats["minorityBenchmarkPercent"] = record["minorityBenchmarkPercent"]
    if record["benchmarkMethod"]:
        stats["benchmarkMethod"] = record["benchmarkMethod"]
    if incomplete:
        stats["incomplete"] = True
    return stats


def resolve_agency_id(name: str, aliases: dict) -> str:
    """The id an agency is stored under: its slug, unless it has been aliased to another agency."""
    if is_statewide(name):
        return STATEWIDE_ID
    slug = names.slug(name)
    return aliases.get(slug, slug)


def check_aliases(aliases: dict, seen_slugs: set) -> list:
    """Problems with the alias file: ids that appear nowhere in the data (typos, stale entries) or chains."""
    problems = []
    for alias, target in aliases.items():
        for kind, slug in (("alias", alias), ("target", target)):
            if slug not in seen_slugs:
                problems.append(f"agency_aliases.json: {kind} {slug!r} matches no agency in the data")
        if target in aliases:
            problems.append(f"agency_aliases.json: {alias!r} points at {target!r}, which is itself aliased")
    return problems


def display_source(entries: list, agency_id: str) -> str:
    """The raw name to show for a merged agency: its canonical spelling's latest name, so a typo or
    garbled variant never becomes the label. entries are (year, raw name, slug)."""
    own = [e for e in entries if e[2] == agency_id] or entries
    return max(own)[1]


def parse_report(entry, stop_type, year):
    if year >= FIRST_DETAIL_TABLES_YEAR:
        return parse_tables.parse_pages(sources.page_texts(entry), stop_type, year)
    return parse_legacy.parse_pages(sources.page_texts(entry, sort=True))


def collect(years):
    """Returns ({agency id: {"names": {year: name}, "traffic": {year: stats}, "pedestrian": {...}}}, problems, warnings).

    Agencies are keyed by the slug of their name, so spelling variants across years ("AVIATION POLICE ORD",
    "AVIATION POLICE - ORD") become one agency."""
    agencies = defaultdict(lambda: {"names": [], **{t: {} for t in STOP_TYPES}})
    seen_slugs = set()
    problems, warnings = [], []
    for year in years:
        for stop_type in STOP_TYPES:
            for entry in sources.select(year, stop_type):
                for record in parse_report(entry, stop_type, year):
                    label = f"{year} {stop_type} p.{record['page']} {record['agency']}"
                    problems += [f"{label}: {p}" for p in record["problems"]]
                    warnings += [f"{label}: {w}" for w in record.get("warnings", [])]
                    if record["problems"]:
                        continue
                    if record["year"] != year or record["stopType"] != stop_type:
                        problems.append(f"{label}: page says {record['stopType']} {record['year']}")
                        continue
                    if is_statewide(record["agency"]):
                        name, incomplete = "Illinois Statewide", False
                    else:
                        name, incomplete = names.split_incomplete(record["agency"])
                    seen_slugs.add(names.slug(name))
                    agency = agencies[resolve_agency_id(name, names.ALIASES)]
                    if str(year) in agency[stop_type]:
                        problems.append(f"{label}: duplicate entry for {name}")
                        continue
                    agency["names"].append((year, name, names.slug(name)))
                    agency[stop_type][str(year)] = year_stats(record, incomplete)
    problems += check_aliases(names.ALIASES, seen_slugs)
    return agencies, problems, warnings


def write(agencies):
    out = PUBLIC_DATA / "agency"
    if out.exists():
        shutil.rmtree(out)
    out.mkdir(parents=True)

    index = []
    for agency_id in sorted(agencies, key=lambda i: (i != STATEWIDE_ID, i)):
        agency = agencies[agency_id]
        latest_name = display_source(agency["names"], agency_id)
        shown = latest_name if agency_id == STATEWIDE_ID else names.display_name(latest_name)
        data = {t: agency[t] for t in STOP_TYPES}
        (out / f"{agency_id}.json").write_text(json.dumps({"id": agency_id, "name": shown, **data}, separators=(",", ":")) + "\n")
        index.append({"id": agency_id, "name": shown,
                      "years": {t: sorted(int(y) for y in data[t]) for t in STOP_TYPES}})
    (PUBLIC_DATA / "agencies.json").write_text(json.dumps(index, separators=(",", ":")) + "\n")
    return index


# Chicago PD reports a total and also one entry per district, so the districts are left out of sums.
CHICAGO_DISTRICT = re.compile(r"^CHICAGO POLICE \(\d")


def cross_check(agencies, years):
    """Compares the sum of all agencies' stops to the statewide totals (informational)."""
    lines = []
    for stop_type in STOP_TYPES:
        for year in years:
            state = agencies[STATEWIDE_ID][stop_type].get(str(year))
            total = sum(d[stop_type][str(year)]["totalStops"] for i, d in agencies.items()
                        if i != STATEWIDE_ID and not CHICAGO_DISTRICT.match(max(d["names"])[1])
                        and str(year) in d[stop_type])
            if state:
                lines.append(f"{year} {stop_type:10} statewide {state['totalStops']:>10,}  agencies {total:>10,}  diff {total - state['totalStops']:+,}")
    return lines


def check_statewide_columns(agencies):
    """Guards the older parser's column order: a swapped column would still sum correctly, but
    statewide Hispanic stops always dwarf American Indian ones, and Asian ones sit in between."""
    problems = []
    for stop_type in STOP_TYPES:
        for year, stats in agencies[STATEWIDE_ID][stop_type].items():
            asian = stats.get("asian", {"stops": 0})["stops"]
            if not stats["hispanic"]["stops"] > asian > stats.get("americanIndian", {"stops": 0})["stops"]:
                problems.append(f"{year} {stop_type}: statewide hispanic/asian/americanIndian stops look out of order")
    return problems


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--years", default="2004-2025")
    first, last = (int(y) for y in parser.parse_args().years.split("-"))
    years = range(first, last + 1)

    agencies, problems, warnings = collect(years)
    problems += check_statewide_columns(agencies)
    for line in problems:
        print("PROBLEM", line)
    if problems:
        sys.exit(f"{len(problems)} problems; data not written")

    index = write(agencies)
    report = ["Tolerated discrepancies in IDOT's reports (parsed values kept as printed).", "",
              *sorted(warnings), "",
              "Sum of agency stops vs the report's statewide total (agencies IDOT lists separately may be missing from the body):",
              *cross_check(agencies, years)]
    WARNINGS_PATH.write_text("\n".join(report) + "\n")
    print(f"{len(warnings)} warnings written to {WARNINGS_PATH.name}")
    print(f"wrote {len(index)} agencies")
    counts = Counter((t, y) for a in index for t in STOP_TYPES for y in a["years"][t])
    for (t, y), n in sorted(counts.items()):
        print(f"{y} {t:10} {n} agencies")


if __name__ == "__main__":
    main()
