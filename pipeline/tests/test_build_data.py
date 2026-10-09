from pipeline import build_data, names


def test_alias_resolves_to_target_and_statewide_is_special():
    aliases = {"abingdon-police-department": "abingdon-police"}
    assert build_data.resolve_agency_id("ABINGDON POLICE DEPARTMENT", aliases) == "abingdon-police"
    assert build_data.resolve_agency_id("ABINGDON POLICE", aliases) == "abingdon-police"
    assert build_data.resolve_agency_id("ILLINOIS STATE WIDE", aliases) == build_data.STATEWIDE_ID


def test_alias_problems_are_reported():
    seen = {"a-police", "a-police-department"}
    assert build_data.check_aliases({"a-police-department": "a-police"}, seen) == []
    assert "matches no agency" in build_data.check_aliases({"a-polcie": "a-police"}, seen)[0]
    assert "matches no agency" in build_data.check_aliases({"a-police-department": "b-police"}, seen)[0]
    chain = build_data.check_aliases({"a": "b", "b": "c"}, {"a", "b", "c"})
    assert any("itself aliased" in p for p in chain)


def test_display_name_comes_from_the_canonical_spelling():
    entries = [(2012, "BUFFALO-MECHANICSBURG POLICE", "buffalo-mechanicsburg-police"),
               (2013, "BUFFALOPMECHANICSBURG POLICE", "buffalopmechanicsburg-police")]
    assert build_data.display_source(entries, "buffalo-mechanicsburg-police") == "BUFFALO-MECHANICSBURG POLICE"
    # if the canonical spelling never appears, fall back to the latest name
    assert build_data.display_source(entries[1:], "buffalo-mechanicsburg-police") == "BUFFALOPMECHANICSBURG POLICE"


def test_checked_in_alias_file_is_well_formed():
    assert all(isinstance(k, str) and isinstance(v, str) for k, v in names.ALIASES.items())
