from pipeline import names, parse_tables

HEADER_GROUPS = "White \nBlack or \nAfrican American \nHispanic or Latino \nAsian \nAmerican Indian or \nAlaska Native \nNative Hawaiian or \nOther Pacific Islander \n"

# 2019 layout: no benchmark description in the title, no percentages beside the counts
PAGE_2019 = ("Summary of Traffic Stops for 2019 - ALGONQUIN POLICE \n  \n" + HEADER_GROUPS +
             "Panel: 1 Summary of Traffic Stops, Rates, and Rate Ratios with 95% Confidence Intervals. "
             "Total stops: 3,785. Total benchmark population: 589,331. \n"
             "Stops \n2,877 \n203 \n550 \n136 \n18 \n1 \n"
             "Benchmark \n411,768 \n22,557 \n132,538 \n21,763 \n571 \n134 \n"
             "Stop Rate \n(95% Confidence Interval) \n0.007 (0.0067 - 0.0072) \n"
             "Panel: 2 Summary of Reason for Stop\n")

# 2025 layout: benchmark description in the title, percentages beside the counts
PAGE_2025 = ("Summary of Traffic Stops for 2025 - GLENWOOD POLICE                    Population Benchmark: Distance-based* \n  \n" + HEADER_GROUPS +
             "Panel: 1 Summary of Stops, Rates, and Rate Ratios with 95% Confidence Intervals. "
             "Total stops: 806. Total population benchmark: 101,704. Total mileage benchmark: 77,517. \n"
             "Stops (% of Total) \n87 (11%) \n620 (77%) \n90 (11%) \n4 (0.5%) \n4 (0.5%) \n1 (0.1%) \n"
             "Population Benchmark \n(% of Total) \n31,903 (31%) \n50,493 (50%) \n16,896 (17%) \n1,942 (1.9%) \n396 (0.4%) \n"
             "74 (0.07%) \nPopulation Stop Rate \n(95% Confidence Interval) \n0.0027 (0.0022 - 0.0034) \n"
             "Panel: 2 Summary of Reason for Stop\n")


def test_2019_layout():
    record = parse_tables.parse_page(PAGE_2019)
    assert record["problems"] == []
    assert (record["agency"], record["year"], record["stopType"]) == ("ALGONQUIN POLICE", 2019, "traffic")
    assert record["benchmarkMethod"] is None
    assert record["totalStops"] == 3785 and record["totalBenchmark"] == 589331
    assert record["groups"]["black"] == {"stops": 203, "benchmark": 22557}


def test_2025_layout_and_title_on_separate_line():
    record = parse_tables.parse_page(PAGE_2025)
    assert record["problems"] == []
    assert record["benchmarkMethod"] == "Distance-based"
    assert record["groups"]["hispanic"] == {"stops": 90, "benchmark": 16896}

    wrapped = PAGE_2025.replace("POLICE                    Population", "POLICE\nPopulation")
    assert parse_tables.parse_page(wrapped)["benchmarkMethod"] == "Distance-based"


def test_sum_mismatch_is_reported():
    record = parse_tables.parse_page(PAGE_2019.replace("2,877", "2,876"))
    assert any("stops sum" in p for p in record["problems"])


def test_agency_without_benchmark_keeps_stops():
    page = PAGE_2025.replace("Distance-based", "None available")
    page = page.replace("Population Benchmark \n(% of Total) \n31,903 (31%) \n50,493 (50%) \n16,896 (17%) \n1,942 (1.9%) \n396 (0.4%) \n74 (0.07%) \n", "Population Benchmark \n(% of Total) \n")
    record = parse_tables.parse_page(page)
    assert record["problems"] == []
    assert record["totalBenchmark"] is None
    assert record["groups"]["white"] == {"stops": 87, "benchmark": None}


def test_unrecognized_header_is_a_problem():
    assert parse_tables.parse_page("Panel: 1 something unexpected")["problems"] == ["unrecognized page header"]


def test_pages_without_panel_one_are_ignored():
    assert parse_tables.parse_page("Panel: 4 Summary of Vehicle Search Events") is None


def test_incomplete_suffix_is_split_off():
    assert names.split_incomplete("BUDA POLICE - INCOMPLETE DATA STOPS SUBMITTED") == ("BUDA POLICE", True)
    assert names.split_incomplete("WEST CITY POLICE - INCOMPLETE STOPS DATA SUBMITTED") == ("WEST CITY POLICE", True)
    assert names.split_incomplete("ALGONQUIN POLICE") == ("ALGONQUIN POLICE", False)


def test_unicode_hyphen_is_normalized():
    assert names.clean("AVIATION POLICE‐-MDW") == "AVIATION POLICE--MDW"


def test_display_names():
    assert names.display_name("MCHENRY COUNTY SHERIFF") == "McHenry County Sheriff"
    assert names.display_name("DUPAGE COUNTY SHERIFF") == "DuPage County Sheriff"
    assert names.display_name("CHICAGO POLICE (1ST DISTRICT - CENTRAL)") == "Chicago Police (1st District - Central)"
    assert names.display_name("UNIVERSITY OF ILLINOIS POLICE") == "University of Illinois Police"


def test_page_override_supplies_missing_header():
    headerless = PAGE_2025.split("\n", 1)[1]
    record = parse_tables.parse_page(headerless, "ROUND LAKE POLICE", "traffic 2025")
    assert record["problems"] == [] and record["agency"] == "ROUND LAKE POLICE"
    assert record["benchmarkMethod"] is None


# --- printed rate ratios and their 95% intervals ---

RATIO_ROWS_2025 = ("Population R. Ratio vs Wh. \n(95% Confidence Interval) \n1.0 \n1.37 (1.36 - 1.39) \n0.972 (0.965 - 0.979) \n"
                   "0.686 (0.679 - 0.692) \nNA \n4.2 (<0.5 - 8,900) \nMileage Benchmark \n")
RATIO_ROWS_2022 = "Stop Rate Ratio vs White \n(95% Confidence Interval) \n1.0 \n2.3 (0.78 - 5.8) \n2.3 (0.89 - 5.2) \n0.16 (0.0039 - 0.88) \n0.44 (0.0074 - 8.6) \n9.7 (0.24 - 56) \nPanel: 2"


def test_printed_ratios_are_read_in_group_order_with_their_intervals():
    printed = parse_tables.printed_ratios(RATIO_ROWS_2025)
    assert printed["white"]["ratio"] == 1.0 and printed["white"]["interval"] is None
    assert printed["black"] == {"text": "1.37", "ratio": 1.37, "interval": [1.36, 1.39]}
    assert printed["hispanic"]["interval"] == [0.965, 0.979]
    assert printed["americanIndian"] is None  # NA keeps its place, so later groups don't shift up
    assert printed["pacificIslander"] == {"text": "4.2", "ratio": 4.2, "interval": [0.5, 8900]}  # "<" and commas


def test_older_label_wording_is_read_too():
    printed = parse_tables.printed_ratios(RATIO_ROWS_2022)
    assert printed["black"]["interval"] == [0.78, 5.8] and printed["pacificIslander"]["ratio"] == 9.7


def test_unexpected_layout_is_not_guessed_at():
    assert parse_tables.printed_ratios("nothing here") is None
    assert parse_tables.printed_ratios("Stop Rate Ratio vs White \n1.0 \n2.3 (0.78 -\n5.8) \n") is None  # wrapped interval


GROUPS_FOR_CHECK = {"white": {"stops": 414, "benchmark": 7906}, "black": {"stops": 6, "benchmark": 45},
                    "hispanic": {"stops": 7, "benchmark": 61}}


def printed(black, hispanic):
    return {"black": {"text": black, "ratio": float(black)}, "hispanic": {"text": hispanic, "ratio": float(hispanic)}}


def test_printed_ratio_check_accepts_rounding():
    # computed: black 2.546, hispanic 2.191
    assert parse_tables.check_printed_ratios(GROUPS_FOR_CHECK, printed("2.5", "2.2")) == ([], [])


def test_printed_ratio_check_warns_on_a_modest_disagreement():
    problems, warnings = parse_tables.check_printed_ratios(GROUPS_FOR_CHECK, printed("2.3", "2.2"))  # Pana Police, 2022
    assert problems == [] and "black rate ratio" in warnings[0]


def test_printed_ratio_check_fails_on_a_large_disagreement():
    problems, _ = parse_tables.check_printed_ratios(GROUPS_FOR_CHECK, printed("0.5", "2.2"))
    assert "black rate ratio" in problems[0]


def test_printed_ratio_check_skips_groups_it_cannot_compute():
    no_white = {**GROUPS_FOR_CHECK, "white": {"stops": 0, "benchmark": 7906}}
    assert parse_tables.check_printed_ratios(no_white, printed("9.9", "9.9")) == ([], [])
