"""Normalizing agency names so the same department lines up across years."""
import json
import re
import unicodedata
from pathlib import Path

# Suffixes IDOT appends to an agency's name in some years to flag data quality.
INCOMPLETE = re.compile(r"\s*-\s*INCOMPLETE (?:DATA STOPS|STOPS DATA) SUBMITTED$")

LOWERCASE_WORDS = {"of", "and", "the", "at", "for", "in"}
ORDINAL = re.compile(r"^(\d+)(ST|ND|RD|TH)$")
# Exact display forms for names plain title-casing gets wrong (acronyms, internal capitals).
OVERRIDES = {k.upper(): v for k, v in json.loads((Path(__file__).parent / "name_overrides.json").read_text()).items()}


# Confirmed same-department spellings, as {agency id: id to merge it into}; see rename_candidates.md.
ALIASES = {k: v for k, v in json.loads((Path(__file__).parent / "agency_aliases.json").read_text()).items()
           if not k.startswith("_")}


def clean(raw: str) -> str:
    text = unicodedata.normalize("NFKC", raw).replace("‐", "-").replace("‑", "-")
    return re.sub(r"\s+", " ", text).strip()


def split_incomplete(raw: str):
    """Returns (name without any data-quality suffix, whether the suffix was present)."""
    name = clean(raw)
    stripped = INCOMPLETE.sub("", name)
    return stripped, stripped != name


def slug(name: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-")


def display_name(name: str) -> str:
    def word(match):
        token = match.group(0).upper()
        if token in OVERRIDES:
            return OVERRIDES[token]
        ordinal = ORDINAL.match(token)
        if ordinal:
            return ordinal.group(1) + ordinal.group(2).lower()
        if re.match(r"^MC[A-Z]{2,}", token):
            return "Mc" + token[2:].capitalize()
        return token.capitalize()

    titled = re.sub(r"[A-Za-z0-9]+", word, name)
    # lowercase small words except at the start
    return re.sub(r"(?<=\s)(" + "|".join(w.capitalize() for w in LOWERCASE_WORDS) + r")(?=\s)",
                  lambda m: m.group(1).lower(), titled)


# What kind of department an agency is, so a ranking can say that a university or a highway sheriff is not comparable
# to a city police department. Checked in this order; anything else is a city or village police department.
KINDS = [
    ("sheriff", re.compile(r"\bSHERIFF")),
    ("campus", re.compile(r"\b(UNIVERSITY|COLLEGE)\b")),
    ("parks", re.compile(r"PARK DISTRICT|FOREST PRESERVE|CONSERVATION")),
    ("transit", re.compile(r"RAILROAD|RAILWAY|\bMETRA\b|AIRPORT|TRANSIT|\bAVIATION\b|TERMINAL RAILROAD")),
    ("state", re.compile(r"^(ILLINOIS (STATE POLICE|DEPARTMENT|DEPT|COMMERCE)|SECRETARY OF STATE|UNITED STATES|US VETERANS)|\bVA\b|VETERANS")),
    ("other", re.compile(r"TASK FORCE|NARCOTICS|ENFORCEMENT TEAM|WATER RECLAMATION|HOSPITAL|AUTHORITY|ASSOCIATION|\bSAFE\b")),
]


def agency_kind(name: str) -> str:
    upper = name.upper()
    return next((kind for kind, pattern in KINDS if pattern.search(upper)), "police")
