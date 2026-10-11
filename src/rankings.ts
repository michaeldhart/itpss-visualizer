import "./rankings.scss";
import { loadRanking, loadRankingYears } from "./data";
import { blackRatio, defaultOptions, explainExclusion, hispanicRatio, kindLabels, methodLabel, parseView, rankDepartments, RankedDepartment, RankingOptions, RankingResult, RankingView, SortMode, toQuery, groupStops } from "./ranking";
import { DepartmentKind, RankingFile, RankingRow } from "./types";

const stopType = "traffic";
// rows shown at first, and added by each press of "Show more"
const pageSize = 50;
// The bar beside the combined ratio is full at this ratio
const barFullAt = 10;

const el = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;

let view: RankingView;
let years: number[] = [];
let file: RankingFile;
let result: RankingResult;
let visibleRows = pageSize;

async function main() {
    years = (await loadRankingYears())[stopType] ?? [];

    if (years.length === 0) {
        el("rank-summary").textContent = "No ranking data has been loaded yet.";
        return;
    }

    view = parseView(location.search);
    view.year = view.year !== null && years.includes(view.year) ? view.year : years[years.length - 1];

    years.slice().reverse().forEach(y => el<HTMLSelectElement>("rank-year").add(new Option(String(y), String(y))));
    el<HTMLSelectElement>("rank-kind").add(new Option("All types", "all"));
    (Object.keys(kindLabels) as DepartmentKind[]).forEach(k => el<HTMLSelectElement>("rank-kind").add(new Option(kindLabels[k], k)));

    el("rank-year").addEventListener("change", async () => { view.year = Number(el<HTMLSelectElement>("rank-year").value); view.department = null; await load(); });
    ["rank-sort", "rank-min", "rank-kind", "rank-method", "rank-incomplete"].forEach(id => el(id).addEventListener("change", onControlsChanged));
    let searchTimer: ReturnType<typeof setTimeout>;
    el("rank-search").addEventListener("input", () => { clearTimeout(searchTimer); searchTimer = setTimeout(onControlsChanged, 150); });
    el("rank-more").addEventListener("click", () => { visibleRows += pageSize; renderTable(); });
    el("rank-controls").addEventListener("submit", event => event.preventDefault());

    await load();
}

async function load() {
    el("rank-summary").textContent = "Loading...";

    try {
        file = await loadRanking(stopType, view.year!);
    } catch {
        el("rank-summary").textContent = "The data for that year could not be loaded. Please try again.";
        el("rank-table").hidden = true;
        return;
    }

    fillMethodChoices();
    syncControls();
    recompute();
}

// The benchmark methods that appear in this year's data, in the order they first sort
function fillMethodChoices() {
    const select = el<HTMLSelectElement>("rank-method");
    const methods = [...new Set(file.rows.map(r => methodLabel(r.benchmarkMethod)))].sort();

    select.innerHTML = "";
    select.add(new Option("All methods", "all"));
    methods.forEach(m => select.add(new Option(m, m)));

    if (view.options.method !== "all" && !methods.includes(view.options.method)) {
        view.options.method = "all";
    }
}

// Show the view's settings in the controls (after the page loads or the year changes)
function syncControls() {
    const { options } = view;
    el<HTMLSelectElement>("rank-year").value = String(view.year);
    el<HTMLSelectElement>("rank-sort").value = options.sort;
    el<HTMLSelectElement>("rank-min").value = String(options.minStops);
    el<HTMLSelectElement>("rank-kind").value = options.kind;
    el<HTMLSelectElement>("rank-method").value = options.method;
    el<HTMLInputElement>("rank-incomplete").checked = options.includeIncomplete;
    el<HTMLInputElement>("rank-search").value = options.search;

    // a minimum from the address bar that isn't one of the choices still has to show up in the menu
    if (el<HTMLSelectElement>("rank-min").value !== String(options.minStops)) {
        el<HTMLSelectElement>("rank-min").add(new Option(String(options.minStops), String(options.minStops)));
        el<HTMLSelectElement>("rank-min").value = String(options.minStops);
    }
}

function onControlsChanged() {
    view.options = {
        sort: el<HTMLSelectElement>("rank-sort").value as SortMode,
        minStops: Number(el<HTMLSelectElement>("rank-min").value),
        kind: el<HTMLSelectElement>("rank-kind").value as RankingOptions["kind"],
        method: el<HTMLSelectElement>("rank-method").value,
        includeIncomplete: el<HTMLInputElement>("rank-incomplete").checked,
        search: el<HTMLInputElement>("rank-search").value.trim()
    };
    view.department = null;
    recompute();
}

function recompute() {
    result = rankDepartments(file.rows, file.departmentsReporting, view.options);
    visibleRows = pageSize;
    history.replaceState(null, "", `${location.pathname}${toQuery(view)}`);

    renderSummary();
    renderMedian();

    // a department from a link on another page: make sure it is visible and pointed out
    const target = view.department;
    const index = target ? result.ranked.findIndex(d => d.row.id === target) : -1;

    if (index >= visibleRows) {
        visibleRows = index + 1;
    }

    renderTable(target);
    renderNotice(target, index);
}

function renderSummary() {
    const { counts } = result;
    const filtered = counts.shown !== counts.eligible;
    const parts = [
        `${counts.incomplete.toLocaleString()} flagged by IDOT as incomplete`,
        `${counts.tooFewStops.toLocaleString()} with fewer than ${view.options.minStops} stops in a group`,
        `${counts.noBenchmark.toLocaleString()} with no population benchmark by race`
    ].filter((_, i) => [counts.incomplete, counts.tooFewStops, counts.noBenchmark][i] > 0);

    el("rank-summary").textContent = `Showing ${filtered ? `${counts.shown.toLocaleString()} of ` : ""}${counts.eligible.toLocaleString()} comparable departments`
        + ` (${counts.reporting.toLocaleString()} reported traffic stops in ${view.year}).`
        + (parts.length ? ` Left out: ${parts.join(", ")}.` : "");
}

function renderMedian() {
    const median = result.medianRatio;

    el("rank-median").textContent = median === null ? "No department has enough stops to compare."
        : `In ${view.year} the typical department in this table has a ratio of ${median.toFixed(1)}×, so being above 1.0 is common.`;
}

function renderNotice(target: string | null, index: number) {
    const notice = el("rank-notice");
    notice.hidden = !target;

    if (!target) {
        return;
    }

    const row = file.rows.find(r => r.id === target);
    const name = row?.name ?? "That department";
    const reason = index >= 0 ? null : explainExclusion(row, view.options);

    notice.textContent = index >= 0
        ? `${name} is number ${index + 1} of ${result.ranked.length.toLocaleString()} in this list.`
        : `${name} is not in this list. ${reason}`;
}

// One decimal, but a ratio near zero would show as "0.0×" and look like no stops at all
const times = (value: number | null) => value === null ? "-" : `${value > 0 && value < 0.1 ? value.toFixed(2) : value.toFixed(1)}×`;
const range = (interval?: [number, number]) => interval ? `${interval[0]}–${interval[1]}` : "";

function cell(row: HTMLTableRowElement, text: string, className?: string, detail?: string) {
    const td = row.insertCell();
    td.textContent = text;
    td.className = className ?? "";

    if (detail) {
        const small = document.createElement("span");
        small.className = "interval";
        small.textContent = detail;
        td.appendChild(small);
    }

    return td;
}

function renderRow(body: HTMLTableSectionElement, department: RankedDepartment, number: number, highlight: boolean) {
    const { row } = department;
    const tr = body.insertRow();
    tr.id = `row-${row.id}`;
    tr.classList.toggle("highlight", highlight);

    cell(tr, String(number), "rank-number");

    const name = document.createElement("th");
    name.scope = "row";
    const link = document.createElement("a");
    link.href = `${import.meta.env.BASE_URL}department/#/${stopType}/${row.id}/${view.year}`;
    link.textContent = row.name;
    const type = document.createElement("span");
    type.className = "department-type";
    type.textContent = kindLabels[row.kind] + (row.incomplete ? " (incomplete data)" : "");
    name.append(link, type);
    tr.appendChild(name);

    const combined = cell(tr, times(department.combinedRatio), "ratio");
    const bar = document.createElement("span");
    bar.className = "bar";
    const fill = document.createElement("span");
    fill.style.width = `${Math.min(100, (department.combinedRatio / barFullAt) * 100)}%`;
    bar.appendChild(fill);
    combined.appendChild(bar);

    cell(tr, times(department.lowEnd));
    cell(tr, times(blackRatio(row)), "", range(row.blackRatioInterval));
    cell(tr, times(hispanicRatio(row)), "", range(row.hispanicRatioInterval));
    cell(tr, `${row.white.stops.toLocaleString()} / ${groupStops(row).toLocaleString()}`);
    cell(tr, methodLabel(row.benchmarkMethod));
}

function renderTable(highlightId: string | null = view.department) {
    const table = el<HTMLTableElement>("rank-table");
    const body = table.tBodies[0];
    const shown = result.ranked.slice(0, visibleRows);

    body.innerHTML = "";
    shown.forEach((department, i) => renderRow(body, department, i + 1, department.row.id === highlightId));

    table.hidden = shown.length === 0;
    el("rank-more").hidden = shown.length >= result.ranked.length;
    el("rank-more").textContent = `Show ${Math.min(pageSize, result.ranked.length - shown.length)} more`;

    document.getElementById(`row-${highlightId}`)?.scrollIntoView({ block: "center" });
}

main();
