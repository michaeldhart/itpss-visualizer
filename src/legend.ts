import { SVG } from "@svgdotjs/svg.js";
import { Colors } from "./utils";

const dotSize = 10;

export interface LegendEntry {
    color: Colors;
    label: string;
}

export function insertLegendDot(id: string, color: Colors) {
    const container = document.getElementById(id)!;
    container.innerHTML = "";

    SVG().addTo(container).size(dotSize, dotSize).circle(dotSize).attr({ fill: color });
}

// A row of colored dots, each followed by its label, e.g. "● White  ● Black  ● Hispanic"
export function fillDotLegend(id: string, entries: LegendEntry[]) {
    const legend = document.getElementById(id)!;
    legend.innerHTML = "";

    entries.forEach(entry => {
        const key = document.createElement("span");
        key.className = "dot-key";
        legend.appendChild(key);

        SVG().addTo(key).size(dotSize, dotSize).circle(dotSize).attr({ fill: entry.color });
        key.append(entry.label);
    });
}
