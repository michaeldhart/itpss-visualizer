import { SVG, Circle } from "@svgdotjs/svg.js";
import { LocalityStatisticSet } from "./data";
import { Colors } from "./utils";

export class ProjectedPopulationChartMaker {
    private width: number;
    private height: number;
    private sampleSize: number;
    private dotSize: number

    constructor(width: number, height: number, sampleSize: number) {
        this.width = width;
        this.height = height;
        this.sampleSize = sampleSize;
        this.dotSize = 10;
    }

    make = (statistics: LocalityStatisticSet) => {
        const id = "projected-pop-chart";
        document.getElementById(id).innerHTML = "";

        var svg = SVG().addTo(`#${id}`).size(this.width, this.height);

        const whitePercent = statistics.white.stops / statistics.totalStops;
        const blackPercent = statistics.black.stops / statistics.totalStops;
        const hispanicPercent = statistics.hispanic.stops / statistics.totalStops;

        let whiteCount = this.sampleSize * whitePercent;
        let blackCount = this.sampleSize * blackPercent;
        let hispanicCount = this.sampleSize * hispanicPercent;

        const dots: Circle[] = [];

        for (let i = 0; i < this.sampleSize; i++) {
            let coordinates = this.generateCoordinates();

            while (!this.coordinatesAreUnique(coordinates, dots)) {
                coordinates = this.generateCoordinates();
            }

            let color = Colors.BLUE;

            if (blackCount > 0) {
                color = Colors.RED;
                blackCount--;
            } else if (hispanicCount > 0) {
                color = Colors.GREEN;
                hispanicCount--;
            }

            const dot = svg.circle(this.dotSize)
                .attr({ fill: color})
                .attr({ cx: coordinates.x, cy: coordinates.y });

            dots.push(dot);
        }
    }

    private generateCoordinates = (): Coordinates => {
        const minX = this.dotSize / 2;
        const maxX = this.width - (this.dotSize / 2);
        const minY = this.dotSize / 2;
        const maxY = this.height - (this.dotSize / 2);

        const x = Math.round(Math.max(minX, Math.random() * maxX));
        const y = Math.round(Math.max(minY, Math.random() * maxY));

        return { x, y };
    }

    private coordinatesAreUnique = (coordinates: Coordinates, dots: Circle[]) => {
        return dots.every(d => this.dotsDontOverlap(coordinates, d));
    }

    private dotsDontOverlap = (coordinates: Coordinates, dot: Circle) => {
        return (coordinates.x < dot.cx() - this.dotSize || coordinates.x > dot.cx() + this.dotSize) 
            || (coordinates.y < dot.cy() - this.dotSize || coordinates.y > dot.cy() + this.dotSize);
    }
}

interface Coordinates {
    x: number;
    y: number;
}