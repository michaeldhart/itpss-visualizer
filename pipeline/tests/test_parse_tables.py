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
