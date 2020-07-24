import { LocalityStatisticSet } from "./data";
import { SVG, Circle } from "@svgdotjs/svg.js";
import { Colors } from "./utils";

export class BiasChartMaker {
    private width: number;
    private height: number;
    private minStopCount: number;
    private dotSize: number;

    constructor(width: number, height: number, minStopCount: number) {
        this.width = width;
        this.height = height;
        this.minStopCount = minStopCount;
        this.dotSize = 10;
    }

    make = (statistics: LocalityStatisticSet, count: number) => {
        // if this actual count is less than minStopCount, use minStopCount
        count = Math.max(count, this.minStopCount);
        
        const id = "bias-chart";
        document.getElementById(id).innerHTML = "";

        var svg = SVG().addTo(`#${id}`).size(this.width, this.height);

        const whitePercent = statistics.white.stops / statistics.totalStops;
        const blackPercent = statistics.black.stops / statistics.totalStops;
        const hispanicPercent = statistics.hispanic.stops / statistics.totalStops;

        let whiteCount = count * whitePercent;
        let blackCount = count * blackPercent;
        let hispanicCount = count * hispanicPercent;

        const dots: Circle[] = [];

        const columnCount = Math.floor(this.width / (this.dotSize * 2));
            
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
}