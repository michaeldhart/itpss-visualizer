import { SVG, Svg } from "@svgdotjs/svg.js";

export interface TrendPoint {
    year: number;
    value: number | null;
    // drawn as an outline instead of a solid dot, for values based on few stops
    hollow: boolean;
    tooltip: string;
}

export interface TrendSeries {
    name: string;
    color: string;
    dashed?: boolean;
    // points that jump to their year when clicked
    selectable?: boolean;
    points: TrendPoint[];
}

export interface TrendChartOptions {
    containerId: string;
    width: number;
    height: number;
    firstYear: number;
    lastYear: number;
    // top of the y axis; values above it are drawn as a triangle on the top edge
    yMax: number;
    formatTick: (value: number) => string;
    referenceLine?: { value: number; label: string };
    // x positions (years, possibly fractional) of vertical dashed lines
    breaks: { at: number; label: string }[];
    selectedYear: number | null;
    hrefForYear: (year: number) => string;
    onSelectYear: (year: number) => void;
}

const margin = { top: 14, right: 28, bottom: 30, left: 48 };
const svgNamespace = "http://www.w3.org/2000/svg";

// A round axis maximum at or above `max`, with the step between ticks, e.g. 0.37 -> 0.4 in steps of 0.1
export function niceAxis(max: number, tickCount = 4): { max: number; step: number } {
    const rough = Math.max(max, Number.EPSILON) / tickCount;
    const magnitude = Math.pow(10, Math.floor(Math.log10(rough)));
    const step = [1, 2, 2.5, 5, 10].map(m => m * magnitude).find(s => s >= rough)!;

    return { max: Math.ceil(max / step - 1e-9) * step, step };
}

// How far apart to label the years so the labels fit
function yearStep(span: number, plotWidth: number): number {
    const fit = Math.max(1, Math.floor(plotWidth / 44));

    return [1, 2, 5, 10].find(step => span / step <= fit) ?? 10;
}

// Plain SVG text so the alignment is exact: svg.js's text().move() ignores text-anchor
function addText(svg: Svg, content: string, x: number, y: number, anchor: "middle" | "end", fill: string) {
    const text = document.createElementNS(svgNamespace, "text");
    text.textContent = content;
    text.setAttribute("x", String(x));
    text.setAttribute("y", String(y));
    text.setAttribute("text-anchor", anchor);
    text.setAttribute("dominant-baseline", "middle");
    text.setAttribute("font-size", "11");
    text.setAttribute("fill", fill);
    svg.node.appendChild(text);
}

function addTitle(parent: SVGElement, text: string) {
    const title = document.createElementNS(svgNamespace, "title");
    title.textContent = text;
    parent.appendChild(title);
}

export function drawTrendChart(series: TrendSeries[], options: TrendChartOptions): Svg {
    const { width, height, firstYear, lastYear, yMax } = options;
    const container = document.getElementById(options.containerId)!;
    container.innerHTML = "";

    const svg = SVG().addTo(`#${options.containerId}`).size(width, height);
    svg.attr({ role: "img", "aria-label": `Line chart over ${firstYear} to ${lastYear}: ${series.map(s => s.name).join(", ")}. The same numbers are in the table below.` });

    const plotWidth = width - margin.left - margin.right;
    const plotHeight = height - margin.top - margin.bottom;
    const x = (year: number) => margin.left + (lastYear === firstYear ? plotWidth / 2 : ((year - firstYear) / (lastYear - firstYear)) * plotWidth);
    const y = (value: number) => margin.top + plotHeight - (Math.min(value, yMax) / yMax) * plotHeight;

    if (options.selectedYear !== null && options.selectedYear >= firstYear && options.selectedYear <= lastYear) {
        svg.rect(22, plotHeight).move(x(options.selectedYear) - 11, margin.top).fill("#e8f1fb");
    }

    // y axis: gridlines and labels
    const { step } = niceAxis(yMax);
    for (let value = 0; value <= yMax + step / 1000; value += step) {
        svg.line(margin.left, y(value), width - margin.right, y(value)).stroke({ color: value === 0 ? "#999" : "#e3e3e3", width: 1 });
        addText(svg, options.formatTick(value), margin.left - 8, y(value), "end", "#777");
    }

    // x axis: year labels
    const labelEvery = yearStep(lastYear - firstYear, plotWidth);
    for (let year = firstYear; year <= lastYear; year += labelEvery) {
        addText(svg, String(year), x(year), height - margin.bottom + 16, "middle", "#777");
    }

    options.breaks.forEach(b => {
        const line = svg.line(x(b.at), margin.top, x(b.at), margin.top + plotHeight).stroke({ color: "#999", width: 1, dasharray: "4 4" });
        addTitle(line.node, b.label);
    });

    if (options.referenceLine) {
        const line = options.referenceLine;
        svg.line(margin.left, y(line.value), width - margin.right, y(line.value)).stroke({ color: "#555", width: 1.5 });
        addText(svg, line.label, width - margin.right - 4, y(line.value) - 9, "end", "#555");
    }

    series.forEach(s => drawSeries(svg, s, options, x, y));

    return svg;
}

function drawSeries(svg: Svg, series: TrendSeries, options: TrendChartOptions, x: (year: number) => number, y: (value: number) => number) {
    const points = series.points.filter(p => p.value !== null);

    // a department that skipped a year leaves a gap rather than a line drawn across it
    const segments: TrendPoint[][] = [];
    points.forEach((p, i) => {
        if (i > 0 && p.year - points[i - 1].year === 1) {
            segments[segments.length - 1].push(p);
        } else {
            segments.push([p]);
        }
    });

    segments.filter(segment => segment.length > 1).forEach(segment => {
        svg.polyline(segment.map(p => [x(p.year), y(p.value!)]))
            .fill("none")
            .stroke({ color: series.color, width: 2, dasharray: series.dashed ? "6 4" : "" });
    });

    points.forEach(p => {
        const clipped = p.value! > options.yMax;
        const parent = series.selectable ? svg.link(options.hrefForYear(p.year)) : svg;

        if (series.selectable) {
            parent.node.addEventListener("click", event => {
                event.preventDefault();
                options.onSelectYear(p.year);
            });
        }

        const marker = clipped
            ? parent.polygon([[0, -6], [6, 5], [-6, 5]]).translate(x(p.year), y(p.value!) + 6)
            : parent.circle(series.selectable ? 9 : 6).center(x(p.year), y(p.value!));

        marker.fill(p.hollow ? "#fff" : series.color).stroke({ color: series.color, width: 2 });
        addTitle(marker.node as unknown as SVGElement, p.tooltip);
        marker.node.style.cursor = series.selectable ? "pointer" : "default";
    });
}
