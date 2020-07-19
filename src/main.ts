import { Data, LocalityStatisticSet } from "./data";

import "./styles.scss";
import { GeneralPopulationChartMaker } from "./generalPopulationChartMaker";
import { Colors } from "./utils";
import { NoBiasChartMaker } from "./noBiasChartMaker";
import { BiasChartMaker } from "./biasChartMaker";
import { ProjectedPopulationChartMaker } from "./projectedPopulationChartMaker";

const sampleSize = 250;
const genPopHeight = 400;
const noBiasHeight = 100;

let resizeTimeout: NodeJS.Timeout;

function main() {
    render();

    window.onresize = () => {
        clearTimeout(resizeTimeout);

        render();
    }
}

function render() {
    resizeTimeout = setTimeout(() => {
        renderGeneralPopulation(document.getElementById("pop-chart").clientWidth, genPopHeight, Data[0]);
        renderNoBias(document.getElementById("pop-chart").clientWidth, noBiasHeight, Data[0]);
        renderBias(document.getElementById("pop-chart").clientWidth, noBiasHeight, Data[0]);
        renderProjectedPopulation(document.getElementById("pop-chart").clientWidth, genPopHeight, Data[0])
    }, 500);
}

function renderGeneralPopulation(width: number, height: number, statistics: LocalityStatisticSet) {
    document.getElementById("total-benchmark").innerHTML = `${statistics.totalBenchmark}`;
    const sampleSizeSpans = document.getElementsByClassName("sample-size").length;

    for (let i = 0; i < sampleSizeSpans; i++) {
        document.getElementsByClassName("sample-size").item(i).innerHTML = `${sampleSize}`;
    }

    document.getElementById("benchmark-w").innerHTML = `${statistics.white.benchmark}`;
    document.getElementById("benchmark-b").innerHTML = `${statistics.black.benchmark}`;
    document.getElementById("benchmark-h").innerHTML = `${statistics.hispanic.benchmark}`;

    document.getElementById("percent-w").innerHTML = `${Math.round((statistics.white.benchmark / statistics.totalBenchmark) * 100)}%`;
    document.getElementById("percent-b").innerHTML = `${Math.round((statistics.black.benchmark / statistics.totalBenchmark) * 100)}%`;
    document.getElementById("percent-h").innerHTML = `${Math.round((statistics.hispanic.benchmark / statistics.totalBenchmark) * 100)}%`;

    const chartMaker = new GeneralPopulationChartMaker(width, height, sampleSize);
    chartMaker.make(statistics);
    chartMaker.insertLegendDot("pop-legend-w", Colors.BLUE);
    chartMaker.insertLegendDot("pop-legend-b", Colors.RED);
    chartMaker.insertLegendDot("pop-legend-h", Colors.GREEN);
}

function renderNoBias(width: number, height: number, statistics: LocalityStatisticSet) {
    document.getElementById("total-stops").innerHTML = `${statistics.totalStops}`;

    const count = Math.round((statistics.totalStops / statistics.totalBenchmark) * sampleSize);
    const chartMaker = new NoBiasChartMaker(width, height);

    document.getElementById("sample-stops").innerHTML = `${chartMaker.getStopCountForSampleSize(statistics, sampleSize)}`;

    chartMaker.make(statistics, count);
}

function renderBias(width: number, height: number, statistics: LocalityStatisticSet) {
    const count = Math.round((statistics.totalStops / statistics.totalBenchmark) * sampleSize);
    const chartMaker = new BiasChartMaker(width, height);
    chartMaker.make(statistics, count);
}

function renderProjectedPopulation(width: number, height: number, statistics: LocalityStatisticSet) {
    const chartMaker = new ProjectedPopulationChartMaker(width, height, sampleSize);
    chartMaker.make(statistics);
}

main();