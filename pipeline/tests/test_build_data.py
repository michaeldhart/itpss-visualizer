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


def test_agency_kinds():
    kind = names.agency_kind
    assert kind("Algonquin Police") == "police"
    assert kind("Glencoe Dept. of Public Safety") == "police"      # a city department, not a state one
    assert kind("Pulaski County Sheriff") == "sheriff"
    assert kind("Eastern Illinois University Police") == "campus"
    assert kind("Harper College Police") == "campus"
    assert kind("Forest Preserve District of Will County Police") == "parks"
    assert kind("Canton Park District Police") == "parks"
    assert kind("Union Pacific Railroad Police") == "transit"
    assert kind("Metropolitan Airport Authority") == "transit"
    assert kind("Illinois State Police") == "state"
    assert kind("Secretary of State Police") == "state"
    assert kind("Illinois Department of Natural Resources Police") == "state"
    assert kind("Tri-County Drug Enforcement Narcotics Team") == "other"


def test_ranking_row_keeps_the_counts_and_intervals():
    stats = {"totalBenchmark": 100, "white": {"stops": 5, "benchmark": 50}, "black": {"stops": 2, "benchmark": 20},
             "hispanic": {"stops": 3, "benchmark": 30}, "blackRatioInterval": [1.0, 2.0], "benchmarkMethod": "Crash-based"}
    row = build_data.ranking_row("x-police", "X Police", stats)
    assert row["kind"] == "police" and row["black"] == {"stops": 2, "benchmark": 20}
    assert row["blackRatioInterval"] == [1.0, 2.0] and row["benchmarkMethod"] == "Crash-based"
    assert "hispanicRatioInterval" not in row and "incomplete" not in row


def test_only_departments_with_a_benchmark_by_race_can_be_ranked():
    full = {"totalBenchmark": 100, "white": {"benchmark": 1}, "black": {"benchmark": 1}, "hispanic": {"benchmark": 1}}
    assert build_data.has_benchmark_by_race(full)
    assert not build_data.has_benchmark_by_race({**full, "totalBenchmark": None})
    assert not build_data.has_benchmark_by_race({**full, "black": {"benchmark": None}})
