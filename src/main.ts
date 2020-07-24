import { Data, LocalityStatisticSet } from "./data";

import "./styles.scss";
import { GeneralPopulationChartMaker } from "./generalPopulationChartMaker";
import { Colors, getStopRateRatio, getRateRatioVsWhite, RaceCategory } from "./utils";
import { NoBiasChartMaker } from "./noBiasChartMaker";
import { BiasChartMaker } from "./biasChartMaker";
import { ProjectedPopulationChartMaker } from "./projectedPopulationChartMaker";

const sampleSize = 250;
const genPopHeight = 400;
const noBiasHeight = 50;
const minStopCount = 10;

let selectedDataSet = 0;
let resizeTimeout: NodeJS.Timeout;

function main() {
    setTimeout(() => {
        const select = document.getElementById("data-sets") as HTMLSelectElement;

        Data.forEach((d, i) => {
            const option = document.createElement("option");
            option.value = i.toString();
            option.text = d.name;

            select.add(option);
        });

        select.onchange = (event: Event) => {
            selectedDataSet = select.selectedIndex;
            render();
        }
    }, 500);

    render();

    window.onresize = () => {
        clearTimeout(resizeTimeout);

        render();
    }
}

function render() {
    resizeTimeout = setTimeout(() => {
        renderGeneralPopulation(document.getElementById("pop-chart").clientWidth, genPopHeight, Data[selectedDataSet]);
        renderNoBias(document.getElementById("pop-chart").clientWidth, noBiasHeight, Data[selectedDataSet]);
        renderBias(document.getElementById("pop-chart").clientWidth, noBiasHeight, Data[selectedDataSet]);
        renderProjectedPopulation(document.getElementById("pop-chart").clientWidth, genPopHeight, Data[selectedDataSet])
    }, 500);
}

function renderGeneralPopulation(width: number, height: number, statistics: LocalityStatisticSet) {
    document.getElementById("total-benchmark").innerHTML = `${statistics.totalBenchmark.toLocaleString()}`;
    const sampleSizeSpans = document.getElementsByClassName("sample-size").length;

    for (let i = 0; i < sampleSizeSpans; i++) {
        document.getElementsByClassName("sample-size").item(i).innerHTML = `${sampleSize}`;
    }

    document.getElementById("benchmark-w").innerHTML = `${statistics.white.benchmark.toLocaleString()}`;
    document.getElementById("benchmark-b").innerHTML = `${statistics.black.benchmark.toLocaleString()}`;
    document.getElementById("benchmark-h").innerHTML = `${statistics.hispanic.benchmark.toLocaleString()}`;

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
    document.getElementById("total-stops").innerHTML = `${statistics.totalStops.toLocaleString()}`;

    const chartMaker = new NoBiasChartMaker(width, height, minStopCount);

    const count = chartMaker.getStopCountForSampleSize(statistics, sampleSize);

    document.getElementById("sample-stops").innerHTML = `${count}`;

    chartMaker.make(statistics, count);

    document.getElementsByClassName("stop-rate-disclaimer").item(0).innerHTML = getLowStopRateDisclaimerMessage(count);
}

function renderBias(width: number, height: number, statistics: LocalityStatisticSet) {
    const count = Math.round((statistics.totalStops / statistics.totalBenchmark) * sampleSize);
    const chartMaker = new BiasChartMaker(width, height, minStopCount);
    chartMaker.make(statistics, count);

    document.getElementById("rrvw-w").innerHTML = `${getRateRatioVsWhite(statistics, RaceCategory.WHITE)}`;
    document.getElementById("rrvw-b").innerHTML = `${getRateRatioVsWhite(statistics, RaceCategory.BLACK)}`;
    document.getElementById("rrvw-h").innerHTML = `${getRateRatioVsWhite(statistics, RaceCategory.HISPANIC)}`;

    document.getElementsByClassName("stop-rate-disclaimer").item(1).innerHTML = getLowStopRateDisclaimerMessage(count);
}

function renderProjectedPopulation(width: number, height: number, statistics: LocalityStatisticSet) {
    const chartMaker = new ProjectedPopulationChartMaker(width, height, sampleSize);
    chartMaker.make(statistics);
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