import "./styles.scss";
import { loadAgency, loadAgencyIndex } from "./data";
import { getEraNotice } from "./eras";
import { AgencyFile, AgencyIndexEntry, LocalityStatisticSet, StopType, StopTypes, YearStats } from "./types";
import { AgencyCombobox } from "./agencyCombobox";
import { fillDotLegend, insertLegendDot } from "./legend";
import { GeneralPopulationChartMaker } from "./generalPopulationChartMaker";
import { drawTrendChart, niceAxis, TrendPoint, TrendSeries } from "./trendChart";
import { benchmarkPeriods, buildTrend, describePeriod, smallSampleStops as trendSmallSample, YearTrend } from "./trends";
import { benchmarkShares, Colors, getRateRatioVsWhite, MinorityComparison, RaceCategory, stopShares, toMinorityComparison, toStatisticSet } from "./utils";
import { NoBiasChartMaker } from "./noBiasChartMaker";
import { BiasChartMaker } from "./biasChartMaker";
import { ProjectedPopulationChartMaker } from "./projectedPopulationChartMaker";

const sampleSize = 250;
const genPopHeight = 400;
const noBiasHeight = 50;
const minStopCount = 10;
// Fewer recorded stops than this and percentages can swing widely
const smallSampleStops = 30;

// Benchmark-based sections, hidden for years whose reports don't publish population benchmarks
const benchmarkSections = ["population-map", "no-bias", "actual-results", "conclusion"];

interface Selection {
    agencyId: string;
    stopType: StopType;
    year: number | null;
}

let agencies: AgencyIndexEntry[] = [];
let selection: Selection;
let resizeTimeout: ReturnType<typeof setTimeout>;

let agencyCombobox: AgencyCombobox;
const stopTypeSelect = () => document.getElementById("stop-type-select") as HTMLSelectElement;
const yearSelect = () => document.getElementById("year-select") as HTMLSelectElement;

async function main() {
    agencies = await loadAgencyIndex();

    if (agencies.length === 0) {
        document.getElementById("selectors")!.hidden = true;
        document.getElementById("visualization")!.hidden = true;
        setMessageText("No stop study data has been loaded yet.");
        return;
    }

    agencyCombobox = new AgencyCombobox(agencies, agencyId => select({ agencyId, stopType: selection.stopType, year: selection.year }));
    stopTypeSelect().onchange = () => select({ agencyId: selection.agencyId, stopType: stopTypeSelect().value as StopType, year: selection.year });
    yearSelect().onchange = () => select({ ...selection, year: Number(yearSelect().value) });

    window.onhashchange = () => select(parseHash(), false);
    window.onresize = () => {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(render, 250);
    };

    select(parseHash(), false);
}

// Routes look like #/traffic/belvidere-police-department/2019
function parseHash(): Selection {
    const [stopType, agencyId, year] = window.location.hash.replace(/^#\/?/, "").split("/");
    const validStopType = StopTypes.includes(stopType as StopType) ? stopType as StopType : "traffic";
    const agency = agencies.find(a => a.id === agencyId) ?? agencies[0];

    return { agencyId: agency.id, stopType: validStopType, year: year ? Number(year) : null };
}

function select(requested: Selection, updateHash = true) {
    const agency = agencies.find(a => a.id === requested.agencyId)!;
    const years = agency.years[requested.stopType];

    // Keep the chosen year when the new agency or stop type has it, otherwise use that one's latest
    const year = years.includes(requested.year!) ? requested.year : years[years.length - 1] ?? null;

    selection = { agencyId: agency.id, stopType: requested.stopType, year };

    agencyCombobox.setSelected(selection.agencyId);
    stopTypeSelect().value = selection.stopType;

    const yearSelectEl = yearSelect();
    yearSelectEl.innerHTML = "";
    years.slice().reverse().forEach(y => yearSelectEl.add(new Option(y.toString(), y.toString())));
    yearSelectEl.disabled = years.length === 0;
    if (year !== null) {
        yearSelectEl.value = year.toString();
    }

    if (updateHash) {
        history.replaceState(null, "", `#/${selection.stopType}/${selection.agencyId}${year === null ? "" : `/${year}`}`);
    }

    render();
}

async function render() {
    const current = selection;
    const agency = await loadAgency(current.agencyId);

    // ignore a slow response if the user has already picked something else
    if (current !== selection) {
        return;
    }

    const stats = current.year === null ? undefined : agency[current.stopType][current.year];

    setMessage(current, stats);

    document.getElementById("visualization")!.hidden = !stats;

    if (!stats) {
        document.getElementById("trends")!.hidden = true;
        return;
    }

    renderVisualization(agency, current, stats);
}

function setMessage(current: Selection, stats?: YearStats) {
    const messages: string[] = [];

    if (current.year === null) {
        messages.push(`No ${current.stopType} stop data has been added for this department yet.`);
    } else {
        const eraNotice = getEraNotice(current.year, current.stopType);

        if (eraNotice) {
            messages.push(eraNotice);
        }
    }

    if (stats?.incomplete) {
        messages.push(`IDOT flagged this department as having submitted incomplete stop data for ${current.year}, so these figures may not reflect all of its stops.`);
    }

    // the era notice already explains a missing benchmark for the older reports
    if (stats && stats.totalBenchmark === null && messages.length === 0) {
        messages.push(`IDOT's report for this department doesn't include a population benchmark, so only the stops by race are shown.`);
    }

    setMessageText(...messages);

    const benchmarkMethod = stats && stats.totalBenchmark !== null ? stats.benchmarkMethod : undefined;
    const method = document.getElementById("benchmark-method")!;
    method.textContent = benchmarkMethod ? `Population benchmark for this report: ${benchmarkMethod}` : "";
    method.hidden = !benchmarkMethod;
}

function setMessageText(...messages: string[]) {
    const element = document.getElementById("data-message")!;
    element.innerHTML = messages.join("<br />");
    element.hidden = messages.length === 0;
}

function renderVisualization(agency: AgencyFile, current: Selection, stats: YearStats) {
    const statistics = toStatisticSet(agency.name, stats);
    const width = document.getElementById("selectors")!.clientWidth;

    document.querySelectorAll(".selected-year").forEach(e => e.innerHTML = `${current.year}`);
    document.querySelectorAll(".stop-type-label").forEach(e => e.innerHTML = current.stopType);
    document.querySelectorAll(".sample-size").forEach(e => e.innerHTML = `${sampleSize}`);

    // Three views: the full comparison by race (a benchmark by race), White vs. minority (older traffic
    // reports), or just the stops by race
    const minority = statistics ? null : toMinorityComparison(stats);

    benchmarkSections.forEach(id => document.getElementById(id)!.hidden = !statistics);
    document.getElementById("minority-view")!.hidden = !minority;
    document.getElementById("dot-maps")!.hidden = !!minority;

    // The two big maps sit side by side, so each is as wide as its own column. That is measured here, after
    // the sections above are shown (a hidden element has no width).
    if (statistics) {
        renderGeneralPopulation(genPopHeight, statistics);
        renderNoBias(width, noBiasHeight, statistics);
        renderBias(width, noBiasHeight, statistics);
        fillDotLegend("no-bias-legend", raceLegend);
        fillDotLegend("actual-legend", raceLegend);
    }

    if (minority) {
        renderMinorityComparison(minority);
    } else {
        renderProjectedPopulation(stats);
    }

    renderTrends(agency, current, width);
}

const percent = (fraction: number) => `${Math.round(fraction * 100)}%`;
const trendHeight = 280;
// Rate ratios above this are drawn on the top edge of the chart, so one extreme year can't flatten the rest
const maxRateRatioAxis = 10;

function jumpToYear(year: number) {
    select({ ...selection, year });
    document.getElementById("selectors")!.scrollIntoView({ behavior: "smooth" });
}

function renderTrends(agency: AgencyFile, current: Selection, width: number) {
    const trend = buildTrend(agency[current.stopType]);
    const section = document.getElementById("trends")!;

    section.hidden = trend.length < 2;

    if (trend.length < 2) {
        return;
    }

    const firstYear = trend[0].year;
    const lastYear = trend[trend.length - 1].year;
    const periods = benchmarkPeriods(trend);
    // where the benchmark changes, halfway between the last year of one period and the first of the next
    const breaks = periods.slice(1).map((period, i) => ({
        at: (periods[i].lastYear + period.firstYear) / 2,
        label: `The population benchmark changes here: ${describePeriod(period, current.stopType)} from ${period.firstYear}`
    }));
    const common = {
        width, height: trendHeight, firstYear, lastYear, breaks, selectedYear: current.year,
        hrefForYear: (year: number) => `#/${current.stopType}/${agency.id}/${year}`,
        onSelectYear: jumpToYear
    };

    section.querySelectorAll(".agency-name").forEach(e => e.textContent = agency.name);
    document.getElementById("trend-first-year")!.textContent = `${firstYear}`;
    document.getElementById("trend-last-year")!.textContent = `${lastYear}`;
    document.getElementById("trend-small-sample")!.textContent = `${trendSmallSample}`;

    // minority share of stops vs. of the population
    const stopShares: TrendPoint[] = [];
    const populationShares: TrendPoint[] = [];
    trend.forEach(t => {
        stopShares.push({
            year: t.year, value: t.minorityStopShare, hollow: t.knownStops < trendSmallSample,
            tooltip: t.minorityStopShare === null ? `${t.year}: no stops with a recorded race`
                : `${t.year}: ${percent(t.minorityStopShare)} of ${t.knownStops.toLocaleString()} stops were minority drivers`
        });
        populationShares.push({
            year: t.year, value: t.minorityPopulationShare, hollow: false,
            tooltip: t.minorityPopulationShare === null ? "" : `${t.year}: minority share of the population ${percent(t.minorityPopulationShare)} (${describePeriod({ family: t.benchmarkFamily, firstYear: t.year, lastYear: t.year, methods: t.benchmarkMethod ? [t.benchmarkMethod] : [] }, current.stopType)})`
        });
    });
    const shareSeries: TrendSeries[] = [
        { name: "Minority share of stops", color: "red", selectable: true, points: stopShares },
        { name: "Minority share of the population", color: "#555", dashed: true, points: populationShares }
    ];
    const shareMax = niceAxis(Math.max(0.1, ...shareSeries.flatMap(s => s.points.map(p => p.value ?? 0)))).max;
    drawTrendChart(shareSeries, { ...common, containerId: "trend-share-chart", yMax: Math.min(1, shareMax), formatTick: percent });
    setLegend("trend-share-legend", shareSeries);

    // stop rate vs. White, only for years with a benchmark by race
    const rateSeries: TrendSeries[] = [
        { name: "Black drivers", color: "red", selectable: true, points: trend.map(t => rateRatioPoint(t, "Black", t.blackRateRatio, t.blackStops)) },
        { name: "Hispanic drivers", color: "green", selectable: true, points: trend.map(t => rateRatioPoint(t, "Hispanic", t.hispanicRateRatio, t.hispanicStops)) }
    ];
    const rateValues = rateSeries.flatMap(s => s.points.map(p => p.value)).filter((v): v is number => v !== null);
    const ratioSection = document.getElementById("trend-ratio-section")!;
    ratioSection.hidden = rateValues.length < 2;

    if (rateValues.length >= 2) {
        const rateMax = Math.min(maxRateRatioAxis, niceAxis(Math.max(2, ...rateValues)).max);
        drawTrendChart(rateSeries, {
            ...common, containerId: "trend-ratio-chart", yMax: rateMax, formatTick: v => `${v}`,
            referenceLine: { value: 1, label: "1.0 = same rate as White drivers" }
        });
        setLegend("trend-ratio-legend", rateSeries);
    }

    renderBenchmarkNote(periods, current.stopType);
    renderTrendTable(trend, agency, current);
}

function rateRatioPoint(t: YearTrend, group: string, ratio: number | null, groupStops: number): TrendPoint {
    return {
        year: t.year, value: ratio, hollow: Math.min(t.whiteStops, groupStops) < trendSmallSample,
        tooltip: ratio === null ? "" : `${t.year}: ${group} drivers were stopped at ${ratio.toFixed(1)} times the White rate (${groupStops.toLocaleString()} ${group} stops, ${t.whiteStops.toLocaleString()} White)`
    };
}

function setLegend(id: string, series: TrendSeries[]) {
    const legend = document.getElementById(id)!;
    legend.innerHTML = "";

    series.forEach(s => {
        const key = document.createElement("span");
        key.className = "key";
        const swatch = document.createElement("i");
        swatch.className = s.dashed ? "swatch dashed" : "swatch";
        swatch.style.borderTopColor = s.color;
        key.append(swatch, s.name);
        legend.appendChild(key);
    });
}

function renderBenchmarkNote(periods: ReturnType<typeof benchmarkPeriods>, stopType: StopType) {
    const note = document.getElementById("trend-benchmarks")!;
    const span = (p: { firstYear: number; lastYear: number }) => p.firstYear === p.lastYear ? `${p.firstYear}` : `${p.firstYear}-${p.lastYear}`;

    note.hidden = periods.length < 2;
    note.textContent = periods.length < 2 ? "" : `Population benchmark: ${periods.map(p => `${describePeriod(p, stopType)} (${span(p)})`).join("; ")}. `
        + "The dashed vertical lines mark where it changes. The benchmark means something different on each side of a line, so compare years across one with care.";
}

function renderTrendTable(trend: YearTrend[], agency: AgencyFile, current: Selection) {
    const body = document.querySelector("#trend-table tbody") as HTMLTableSectionElement;
    body.innerHTML = "";
    const number = (value: number | null, digits: number) => value === null ? "-" : value.toFixed(digits);

    [...trend].reverse().forEach(t => {
        const row = body.insertRow();
        row.classList.toggle("incomplete", t.incomplete);

        const link = document.createElement("a");
        link.href = `#/${current.stopType}/${agency.id}/${t.year}`;
        link.textContent = `${t.year}${t.incomplete ? " (incomplete data)" : ""}`;
        link.addEventListener("click", event => {
            event.preventDefault();
            jumpToYear(t.year);
        });
        row.insertCell().appendChild(link);

        [t.knownStops.toLocaleString(),
            t.minorityStopShare === null ? "-" : percent(t.minorityStopShare),
            t.minorityPopulationShare === null ? "-" : percent(t.minorityPopulationShare),
            number(t.minorityRatio, 2), number(t.blackRateRatio, 1), number(t.hispanicRateRatio, 1)]
            .forEach(text => row.insertCell().textContent = text);
    });
}

const raceLegend = [
    { color: Colors.BLUE, label: "White" },
    { color: Colors.RED, label: "Black" },
    { color: Colors.GREEN, label: "Hispanic" }
];

const chartWidth = (id: string) => document.getElementById(id)!.clientWidth;

function renderProjectedPopulation(stats: YearStats) {
    const shares = stopShares(stats);
    new ProjectedPopulationChartMaker(chartWidth("projected-pop-chart"), genPopHeight, sampleSize).make(shares);

    // the legend doubles as a table of how many stops each race had
    const counts = { w: stats.white.stops, b: stats.black.stops, h: stats.hispanic.stops };
    (Object.keys(counts) as (keyof typeof counts)[]).forEach(key => {
        document.getElementById(`stops-${key}`)!.textContent = counts[key].toLocaleString();
        document.getElementById(`stops-percent-${key}`)!.textContent = percent(counts[key] / stats.totalStops);
    });
    insertLegendDot("stops-legend-w", Colors.BLUE);
    insertLegendDot("stops-legend-b", Colors.RED);
    insertLegendDot("stops-legend-h", Colors.GREEN);
}

function renderMinorityComparison(comparison: MinorityComparison) {
    const knownStops = comparison.whiteStops + comparison.minorityStops;

    document.getElementById("minority-population-percent")!.textContent = percent(comparison.minorityPopulationShare);
    document.getElementById("minority-stop-percent")!.textContent = percent(comparison.minorityStopShare);
    document.getElementById("minority-known-stops")!.textContent = knownStops.toLocaleString();
    document.getElementById("minority-ratio")!.textContent = comparison.ratio === null ? "not available (IDOT estimated no minority drivers in this area)" : comparison.ratio.toFixed(2);
    document.getElementById("minority-small-sample")!.textContent = knownStops < smallSampleStops
        ? `Note: only ${knownStops} stops with a recorded race, so these percentages can swing widely from one stop to the next.`
        : "";

    // red dots are the minority share; there is no green group in this view
    new GeneralPopulationChartMaker(chartWidth("minority-pop-chart"), genPopHeight, sampleSize, "minority-pop-chart")
        .make({ red: comparison.minorityPopulationShare, green: 0 });
    new ProjectedPopulationChartMaker(chartWidth("minority-stops-chart"), genPopHeight, sampleSize, "minority-stops-chart")
        .make({ red: comparison.minorityStopShare, green: 0 });

    const legend = (share: number) => [
        { color: Colors.BLUE, label: `White ${percent(1 - share)}` },
        { color: Colors.RED, label: `Minority ${percent(share)}` }
    ];
    fillDotLegend("minority-pop-legend", legend(comparison.minorityPopulationShare));
    fillDotLegend("minority-stops-legend", legend(comparison.minorityStopShare));
}

function renderGeneralPopulation(height: number, statistics: LocalityStatisticSet) {
    document.getElementById("total-benchmark")!.innerHTML = `${statistics.totalBenchmark.toLocaleString()}`;

    document.getElementById("benchmark-w")!.innerHTML = `${statistics.white.benchmark.toLocaleString()}`;
    document.getElementById("benchmark-b")!.innerHTML = `${statistics.black.benchmark.toLocaleString()}`;
    document.getElementById("benchmark-h")!.innerHTML = `${statistics.hispanic.benchmark.toLocaleString()}`;

    document.getElementById("percent-w")!.innerHTML = `${Math.round((statistics.white.benchmark / statistics.totalBenchmark) * 100)}%`;
    document.getElementById("percent-b")!.innerHTML = `${Math.round((statistics.black.benchmark / statistics.totalBenchmark) * 100)}%`;
    document.getElementById("percent-h")!.innerHTML = `${Math.round((statistics.hispanic.benchmark / statistics.totalBenchmark) * 100)}%`;

    new GeneralPopulationChartMaker(chartWidth("pop-chart"), height, sampleSize).make(benchmarkShares(statistics));
    insertLegendDot("pop-legend-w", Colors.BLUE);
    insertLegendDot("pop-legend-b", Colors.RED);
    insertLegendDot("pop-legend-h", Colors.GREEN);
}

function renderNoBias(width: number, height: number, statistics: LocalityStatisticSet) {
    document.getElementById("total-stops")!.innerHTML = `${statistics.totalStops.toLocaleString()}`;

    const chartMaker = new NoBiasChartMaker(width, height, minStopCount);

    const count = chartMaker.getStopCountForSampleSize(statistics, sampleSize);

    document.getElementById("sample-stops")!.innerHTML = `${count}`;

    chartMaker.make(benchmarkShares(statistics), count);

    document.getElementsByClassName("stop-rate-disclaimer").item(0)!.innerHTML = getLowStopRateDisclaimerMessage(count);
}

function renderBias(width: number, height: number, statistics: LocalityStatisticSet) {
    const count = Math.round((statistics.totalStops / statistics.totalBenchmark) * sampleSize);
    const chartMaker = new BiasChartMaker(width, height, minStopCount);
    chartMaker.make(stopShares(statistics), count);

    document.getElementById("rrvw-w")!.innerHTML = `${getRateRatioVsWhite(statistics, RaceCategory.WHITE)}`;
    document.getElementById("rrvw-b")!.innerHTML = `${getRateRatioVsWhite(statistics, RaceCategory.BLACK)}`;
    document.getElementById("rrvw-h")!.innerHTML = `${getRateRatioVsWhite(statistics, RaceCategory.HISPANIC)}`;

    document.getElementsByClassName("stop-rate-disclaimer").item(1)!.innerHTML = getLowStopRateDisclaimerMessage(count);
}

function getLowStopRateDisclaimerMessage(stopCountForSampleSize: number) {
    return stopCountForSampleSize < minStopCount ? `Note: Since this department's stop rate (the ratio of number of 
        stops to the benchmark population) when applied to our sample size 
        produces only ${stopCountForSampleSize} stops to plot in this graph, 
        we've chosen to display ${minStopCount} dots as a minimum in order to 
        better visualize the stop rates by race. IN THE CASE OF THIS DEPARTMENT 
        THIS GRAPH REPRESENTS ONLY THE STOP RATES BY RACE - IT IS NOT REPRESENTATIVE 
        OF THE NUMBER OF STOPS RELATIVE TO BENCHMARK POPULATION.` : "";
}

main();
