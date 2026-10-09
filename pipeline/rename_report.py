"""Suggests agencies that are probably the same department under different names in different years.

Reads the generated public/data and writes pipeline/rename_candidates.md. Two agencies are only
considered when their years never overlap (a department can't report twice in a year). Related names
are grouped into clusters, each with a proposed canonical name and a stop-volume check where one name
ends and the next begins. Confident clusters come with a ready-to-use pipeline/agency_aliases.json.

Run: .venv/bin/python -m pipeline.rename_report
"""
import json
import re
from collections import defaultdict
from difflib import SequenceMatcher
from pathlib import Path

PUBLIC_DATA = Path(__file__).parent.parent / "public" / "data"
REPORT_PATH = Path(__file__).parent / "rename_candidates.md"
STOP_TYPES = ("traffic", "pedestrian")

# Words that differ between spellings of the same agency without meaning anything.
GENERIC = {"police", "department", "dept", "the", "of", "and", "city", "village", "town"}
SYNONYMS = {"sheriffs": "sheriff", "univ": "university", "mt": "mount", "st": "saint", "ft": "fort"}

# Names count as the same when they match after normalizing, or are this close (typos like "Poliuce").
TYPO_SIMILARITY = 0.9


def words(name: str) -> list:
    tokens = re.sub(r"[^a-z0-9]+", " ", name.lower()).split()
    return [SYNONYMS.get(w, w) for w in tokens if w not in GENERIC]


def link(a: str, b: str):
    """Returns "same" (spelling variants), "extends" (one name continues the other) or None for a pair of names."""
    wa, wb = words(a), words(b)
    if not wa or not wb:
        return None
    ca, cb = "".join(wa), "".join(wb)  # joined, so "de kalb" and "dekalb" compare equal
    if wa == wb or ca == cb or SequenceMatcher(None, ca, cb).ratio() >= TYPO_SIMILARITY:
        return "same"
    # "Washington County" / "Washington County Sheriff": the shorter name's words begin the longer one's.
    # Whole words, so "Augusta" doesn't match "Augustana College".
    shorter, longer = sorted((wa, wb), key=lambda w: len("".join(w)))
    if len(shorter) < len(longer) and longer[:len(shorter)] == shorter and len(ca if wa == shorter else cb) >= 5:
        return "extends"
    # joined, to catch a space dropped inside the name ("John Wood" / "Johnwood Community College")
    short_joined, long_joined = sorted((ca, cb), key=len)
    if len(short_joined) >= 8 and long_joined.startswith(short_joined):
        return "extends"
    return None


def years_of(agency: dict) -> set:
    return {int(y) for t in STOP_TYPES for y in agency[t]}


def span(years) -> str:
    out, start, prev = [], None, None
    for y in sorted(years):
        if start is None:
            start = prev = y
        elif y == prev + 1:
            prev = y
        else:
            out.append(f"{start}-{prev}" if start != prev else str(start))
            start = prev = y
    if start is not None:
        out.append(f"{start}-{prev}" if start != prev else str(start))
    return ", ".join(out)


def disjoint_pairs(agencies: list):
    candidates = [a for a in agencies if a["id"] != "illinois-statewide"]
    for i, a in enumerate(candidates):
        for b in candidates[i + 1:]:
            if not years_of(a) & years_of(b):
                kind = link(a["name"], b["name"])
                if kind:
                    yield a, b, kind


def clusters(agencies: list) -> list:
    """Groups of agencies whose names are spelling variants of each other (and never overlap in years)."""
    parent = {a["id"]: a["id"] for a in agencies}

    def find(x):
        while parent[x] != x:
            parent[x] = parent[parent[x]]
            x = parent[x]
        return x

    for a, b, kind in disjoint_pairs(agencies):
        if kind == "same":
            parent[find(a["id"])] = find(b["id"])

    groups = defaultdict(list)
    for a in agencies:
        groups[find(a["id"])].append(a)
    return sorted(([m for m in members] for members in groups.values() if len(members) > 1),
                  key=lambda members: min(m["name"] for m in members))


def extensions(agencies: list, grouped: list) -> list:
    """Pairs where one name extends the other, excluding pairs that can't be one department.

    A pair is dropped when the two agencies' spelling families (each with its spelling variants) report in
    the same year, e.g. "Lagrange Police" (La Grange) vs "La Grange Park Police": both exist in 2019.
    """
    family = {a["id"]: [a] for a in agencies}
    for members in grouped:
        for m in members:
            family[m["id"]] = members

    def family_years(agency):
        return set().union(*(years_of(m) for m in family[agency["id"]]))

    return [(a, b) for a, b, kind in disjoint_pairs(agencies)
            if kind == "extends" and family[a["id"]] is not family[b["id"]] and not family_years(a) & family_years(b)]


def canonical(members: list) -> dict:
    """The spelling to keep: the most recent one, unless it appears in only a year or two (a typo or
    one-off variant like "Tilden Poliuce") and another spelling was used for longer."""
    established = [m for m in members if len(years_of(m)) > 2] or members
    return max(established, key=lambda m: (max(years_of(m)), len(years_of(m))))


def handover(members: list) -> list:
    """Stop volumes where one name ends and the next begins, as 'N in YEAR -> M in YEAR' notes."""
    notes = []
    ordered = sorted(members, key=lambda m: min(years_of(m)))
    for earlier, later in zip(ordered, ordered[1:]):
        for stop_type in STOP_TYPES:
            if not earlier[stop_type] or not later[stop_type]:
                continue
            last = max(earlier[stop_type], key=int)
            nxt = min(later[stop_type], key=int)
            if int(nxt) > int(last):
                before, after = earlier[stop_type][last]["totalStops"], later[stop_type][nxt]["totalStops"]
                notes.append(f"{stop_type}: {before:,} in {last} -> {after:,} in {nxt}")
                break
    return notes


def describe(members: list) -> list:
    keep = canonical(members)
    lines = [f"- **{keep['name']}** (`{keep['id']}`), {span(years_of(keep))}"]
    for m in sorted(members, key=lambda m: min(years_of(m))):
        if m is not keep:
            lines.append(f"  - {m['name']} (`{m['id']}`), {span(years_of(m))}")
    notes = handover(members)
    if notes:
        lines.append(f"  - stops at the handover: {'; '.join(notes)}")
    return lines


def describe_extension(pair) -> list:
    earlier, later = sorted(pair, key=lambda m: min(years_of(m)))
    lines = [f"- {earlier['name']} (`{earlier['id']}`), {span(years_of(earlier))}  ->  {later['name']} (`{later['id']}`), {span(years_of(later))}"]
    notes = handover([earlier, later])
    if notes:
        lines.append(f"  - stops at the handover: {'; '.join(notes)}")
    return lines


def main():
    index = json.loads((PUBLIC_DATA / "agencies.json").read_text())
    agencies = [json.loads((PUBLIC_DATA / "agency" / f"{e['id']}.json").read_text()) for e in index]
    grouped = clusters(agencies)
    extended = extensions(agencies, grouped)

    aliases = {m["id"]: canonical(members)["id"] for members in grouped for m in members if m is not canonical(members)}
    lines = ["# Possible renames across years", "",
             "Agencies whose years never overlap and whose names look alike. Generated by `pipeline.rename_report`; "
             "nothing is merged until it is listed in `pipeline/agency_aliases.json`.", "",
             f"## Spelling variants of one department ({len(grouped)} groups)", "",
             "Names that match after ignoring words like \"Police\"/\"Department\", or differ only by a typo or spacing. "
             "The most recent spelling is kept, unless it appears in only a year or two.", "",
             *[line for members in grouped for line in describe(members)], "",
             "Proposed `pipeline/agency_aliases.json` for the groups above (remove any you disagree with):", "",
             "```json", json.dumps(dict(sorted(aliases.items())), indent=2), "```", "",
             f"## One name extends another ({len(extended)} pairs)", "",
             "These could be the same department after a rename or reorganization (Cahokia -> Cahokia Heights), "
             "or a generic name standing in for several (\"Southern Illinois University\" for each campus). "
             "Judge by the stops at the handover and by what you know of the department; none are proposed above.", "",
             *[line for pair in extended for line in describe_extension(pair)], ""]
    REPORT_PATH.write_text("\n".join(lines))
    print(f"{len(grouped)} spelling-variant groups ({len(aliases)} aliases), {len(extended)} extension pairs -> {REPORT_PATH}")


if __name__ == "__main__":
    main()
