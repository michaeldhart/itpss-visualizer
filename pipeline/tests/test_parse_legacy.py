from pipeline import parse_legacy

TRAFFIC_HEAD = ("                ILLINOIS TRAFFIC STOP STUDY, {year}\\n"
                "      Agency:                  ADDISON POLICE\\n\\n"
                "   Estimated Minority Driving Population        46.42\\n   Ratio       0.85\\n\\n").replace("\\n", "\n")


def traffic_page(year, header, values, agency="ADDISON POLICE", garble=None):
    text = (TRAFFIC_HEAD.format(year=year).replace("ADDISON POLICE", agency) +
            f"      Key Indicators        {header}\n         Stops      {values}\n         Moving     1 1 0 0 0 0 0\n")
    if garble:  # a page whose spaces were replaced by a stray character
        text = text.replace("ILLINOIS TRAFFIC STOP STUDY,", f"ILLINOIS{garble}TRAFFIC{garble}STOP{garble}STUDY,{garble}")
        text = text.replace("Key Indicators", f"Key{garble}Indicators").replace("Estimated Minority", f"Estimated{garble}Minority")
        text = text.replace("ADDISON POLICE", f"ADDISON{garble}POLICE")
    return text


def test_modern_headings():
    record = parse_legacy.parse_page(traffic_page(
        2012, "Total  WH  AA  AI  HIS  ASN  NH  N/S", "5843  3526  525  20  1569  163  40  0"))
    assert record["problems"] == []
    assert record["groups"]["black"] == {"stops": 525, "benchmark": None}
    assert record["groups"]["americanIndian"]["stops"] == 20 and record["groups"]["hispanic"]["stops"] == 1569
    assert record["groups"]["pacificIslander"]["stops"] == 40
    assert record["totalBenchmark"] is None and record["minorityBenchmarkPercent"] == 46.42


def test_2008_headings_with_wrapped_names():
    record = parse_legacy.parse_page(traffic_page(
        2008, "Total  Caucasian  American  Indian  Hispanic  Asian  N/S", "9516  6052  828  28  2262  346  0"))
    assert record["problems"] == []
    assert record["groups"]["americanIndian"]["stops"] == 28 and record["groups"]["hispanic"]["stops"] == 2262


def test_split_heading_column_order_depends_on_year():
    header, values = "Total  Caucasian  Hispanic  Asia  N/S", "2450986  1682594  419021  4820  272964  70949  638"
    seven = parse_legacy.parse_page(traffic_page(2007, header, values))
    assert (seven["groups"]["americanIndian"]["stops"], seven["groups"]["hispanic"]["stops"]) == (4820, 272964)
    early = parse_legacy.parse_page(traffic_page(2004, header, "2495099  1676043  437554  303401  71477  5212  1412"))
    assert (early["groups"]["hispanic"]["stops"], early["groups"]["americanIndian"]["stops"]) == (303401, 5212)
    assert early["notStated"] == 1412


def test_stray_character_for_spaces_is_repaired():
    for char in ("3", "0", "/", ","):
        record = parse_legacy.parse_page(traffic_page(
            2013, "Total  WH  AA  AI  HIS  ASN  NH  N/S", "14  11  2  0  1  0  0  0", garble=char))
        assert record is not None and record["problems"] == [], char
        assert record["agency"] == "ADDISON POLICE" and record["year"] == 2013
        assert record["minorityBenchmarkPercent"] == 46.42
        assert record["groups"]["white"]["stops"] == 11


def test_stray_character_in_front_of_agency_label():
    page = traffic_page(2007, "Total  WH  AA  AI  HIS  ASN  NH  N/S", "14  11  2  0  1  0  0  0").replace("Agency:", "RAgency:")
    assert parse_legacy.parse_page(page)["agency"] == "ADDISON POLICE"


def test_total_that_leaves_out_not_stated_stops_is_a_warning():
    record = parse_legacy.parse_page(traffic_page(
        2005, "Total  Caucasian  Hispanic  Asia  N/S", "109  90  8  8  3  0  1"))
    assert record["problems"] == []
    assert record["totalStops"] == 109 and "excludes 1" in record["warnings"][0]


def test_sum_mismatch_is_a_problem():
    record = parse_legacy.parse_page(traffic_page(2012, "Total  WH  AA  AI  HIS  ASN  NH  N/S", "50  3  2  0  1  0  0  0"))
    assert "sum to" in record["problems"][0]


def pedestrian_page(demographics):
    return ("      ILLINOIS PEDESTRIAN STOP STUDY, 2016\n\nAgency      ADDISON POLICE\n\n"
            "      Total  White  Black  AI  Hispanic  Asian  NH\n" + demographics +
            "\n\n   Key Indicators      Total   White   Black   AI   Hispanic   Asian   NH   N/S\n"
            "     Total Stops      76   14   18   0   43   0   1   0\n")


def test_pedestrian_community_demographics_become_the_benchmark():
    record = parse_legacy.parse_page(pedestrian_page(
        "  Community Demographics      15255  883  41  10093  2195  3\n      28470\n"))
    assert record["problems"] == [] and record["totalBenchmark"] == 28470
    assert record["groups"]["hispanic"] == {"stops": 43, "benchmark": 10093}
    assert record["benchmarkMethod"] == "Community demographics"


def test_inconsistent_demographics_omit_the_benchmark_with_a_warning():
    record = parse_legacy.parse_page(pedestrian_page(
        "  Community Demographics      6817912  1420958  15273  1414507  471075  2531\n      6817912\n"))
    assert record["problems"] == [] and record["totalBenchmark"] is None
    assert "inconsistent" in record["warnings"][0]


def test_small_demographics_gap_is_tolerated_with_a_warning():
    record = parse_legacy.parse_page(pedestrian_page(
        "  Community Demographics      766398  690289  3379  564142  126213  495\n      2150966\n"))
    assert record["totalBenchmark"] == 2150966 and "sum to 2150916" in record["warnings"][0]


def test_unrecognized_agency_page_is_a_problem():
    pages = ["Key Indicators but nothing else on this page"]
    assert parse_legacy.parse_pages(pages)[0]["problems"] == ["unrecognized agency page"]
