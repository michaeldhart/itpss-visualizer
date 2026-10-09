import { SVG, Circle } from "@svgdotjs/svg.js";
import { DotShares, dotColors } from "./utils";

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

    make = (shares: DotShares, count: number) => {
        // if this actual count is less than minStopCount, use minStopCount
        count = Math.max(count, this.minStopCount);
        
        const id = "bias-chart";
        document.getElementById(id)!.innerHTML = "";

        var svg = SVG().addTo(`#${id}`).size(this.width, this.height);

        const colors = dotColors(count, shares);

        const dots: Circle[] = [];

        const columnCount = Math.floor(this.width / (this.dotSize * 2));
            
        let currentRow = 0;
        let currentColumn = 0;

        for (let i = 0; i < count; i++) {
            currentRow = Math.floor(i / columnCount);

            const x = (currentColumn * this.dotSize * 2) + (this.dotSize / 2);
            const y = (currentRow * this.dotSize * 2) + (this.dotSize / 2);

            const dot = svg.circle(this.dotSize)
                .attr({ fill: colors[i] })
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