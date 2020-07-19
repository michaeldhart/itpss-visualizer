import { SVG, Circle } from "@svgdotjs/svg.js";
import { LocalityStatisticSet } from "./data";
import { Colors } from "./utils";

export class NoBiasChartMaker {
    private width: number;
    private height: number;
    private dotSize: number

    constructor(width: number, height: number) {
        this.width = width;
        this.height = height;
        this.dotSize = 10;
    }

    make = (statistics: LocalityStatisticSet, count: number) => {
        const id = "no-bias-chart";
        document.getElementById(id).innerHTML = "";

        var svg = SVG().addTo(`#${id}`).size(this.width, this.height);

        const whitePercent = statistics.white.benchmark / statistics.totalBenchmark;
        const blackPercent = statistics.black.benchmark / statistics.totalBenchmark;
        const hispanicPercent = statistics.hispanic.benchmark / statistics.totalBenchmark;

        let whiteCount = count * whitePercent;
        let blackCount = count * blackPercent;
        let hispanicCount = count * hispanicPercent;

        const dots: Circle[] = [];

        const columnCount = Math.floor(this.width / this.dotSize);
            
        let currentRow = 0;
        let currentColumn = 0;

        for (let i = 0; i < count; i++) {
            let color = Colors.BLUE;

            if (blackCount > 0) {
                color = Colors.RED;
                blackCount--;
            } else if (hispanicCount > 0) {
                color = Colors.GREEN;
                hispanicCount--;
            }

            currentRow = Math.floor(i / columnCount);

            const x = (currentColumn * this.dotSize * 2) + (this.dotSize / 2);
            const y = (currentRow * this.dotSize * 2) + (this.dotSize / 2);

            const dot = svg.circle(this.dotSize)
                .attr({ fill: color })
                .attr({ cx: x, cy: y });

            dots.push(dot);

            if (currentColumn < columnCount - 1) {
                currentColumn++;
            } else {
                currentColumn = 0;
            }
        }
    }

    getStopCountForSampleSize = (statistics: LocalityStatisticSet, count: number) => {
        const stopPercent = statistics.totalStops / statistics.totalBenchmark;

        return Math.round(count * stopPercent);
    }
}