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
