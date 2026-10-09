import "./styles.scss";
import { loadAgency, loadAgencyIndex } from "./data";
import { getEraNotice } from "./eras";
import { AgencyFile, AgencyIndexEntry, LocalityStatisticSet, StopType, StopTypes, YearStats } from "./types";
import { GeneralPopulationChartMaker } from "./generalPopulationChartMaker";
import { Colors, getRateRatioVsWhite, RaceCategory, toStatisticSet } from "./utils";
import { NoBiasChartMaker } from "./noBiasChartMaker";
import { BiasChartMaker } from "./biasChartMaker";
import { ProjectedPopulationChartMaker } from "./projectedPopulationChartMaker";

const sampleSize = 250;
const genPopHeight = 400;
const noBiasHeight = 50;
const minStopCount = 10;

// Benchmark-based sections, hidden for years whose reports don't publish population benchmarks
const benchmarkSections = ["general-population", "no-bias", "actual-results", "conclusion"];

interface Selection {
    agencyId: string;
    stopType: StopType;
    year: number | null;
}

let agencies: AgencyIndexEntry[] = [];
let selection: Selection;
let resizeTimeout: ReturnType<typeof setTimeout>;

const agencySelect = () => document.getElementById("agency-select") as HTMLSelectElement;
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

    agencies.forEach(a => agencySelect().add(new Option(a.name, a.id)));

    agencySelect().onchange = () => select({ agencyId: agencySelect().value, stopType: selection.stopType, year: selection.year });
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

    agencySelect().value = selection.agencyId;
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
    if (stats && stats.totalBenchmark === null && !messages.some(m => m.includes("through 2018"))) {
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

    benchmarkSections.forEach(id => document.getElementById(id)!.hidden = !statistics);

    new ProjectedPopulationChartMaker(width, genPopHeight, sampleSize).make(stats);

    if (statistics) {
        renderGeneralPopulation(width, genPopHeight, statistics);
        renderNoBias(width, noBiasHeight, statistics);
        renderBias(width, noBiasHeight, statistics);
    }
}

function renderGeneralPopulation(width: number, height: number, statistics: LocalityStatisticSet) {
    document.getElementById("total-benchmark")!.innerHTML = `${statistics.totalBenchmark.toLocaleString()}`;

    document.getElementById("benchmark-w")!.innerHTML = `${statistics.white.benchmark.toLocaleString()}`;
    document.getElementById("benchmark-b")!.innerHTML = `${statistics.black.benchmark.toLocaleString()}`;
    document.getElementById("benchmark-h")!.innerHTML = `${statistics.hispanic.benchmark.toLocaleString()}`;

    document.getElementById("percent-w")!.innerHTML = `${Math.round((statistics.white.benchmark / statistics.totalBenchmark) * 100)}%`;
    document.getElementById("percent-b")!.innerHTML = `${Math.round((statistics.black.benchmark / statistics.totalBenchmark) * 100)}%`;
    document.getElementById("percent-h")!.innerHTML = `${Math.round((statistics.hispanic.benchmark / statistics.totalBenchmark) * 100)}%`;

    const chartMaker = new GeneralPopulationChartMaker(width, height, sampleSize);
    chartMaker.make(statistics);
    chartMaker.insertLegendDot("pop-legend-w", Colors.BLUE);
    chartMaker.insertLegendDot("pop-legend-b", Colors.RED);
    chartMaker.insertLegendDot("pop-legend-h", Colors.GREEN);
}

function renderNoBias(width: number, height: number, statistics: LocalityStatisticSet) {
    document.getElementById("total-stops")!.innerHTML = `${statistics.totalStops.toLocaleString()}`;

    const chartMaker = new NoBiasChartMaker(width, height, minStopCount);

    const count = chartMaker.getStopCountForSampleSize(statistics, sampleSize);

    document.getElementById("sample-stops")!.innerHTML = `${count}`;

    chartMaker.make(statistics, count);

    document.getElementsByClassName("stop-rate-disclaimer").item(0)!.innerHTML = getLowStopRateDisclaimerMessage(count);
}

function renderBias(width: number, height: number, statistics: LocalityStatisticSet) {
    const count = Math.round((statistics.totalStops / statistics.totalBenchmark) * sampleSize);
    const chartMaker = new BiasChartMaker(width, height, minStopCount);
    chartMaker.make(statistics, count);

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
