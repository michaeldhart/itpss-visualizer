import { searchAgencies } from "./agencySearch";
import { AgencyIndexEntry } from "./types";

const maxResults = 50;

// A search box with a list of matching departments underneath, following the ARIA combobox pattern.
export class AgencyCombobox {
    private input = document.getElementById("agency-input") as HTMLInputElement;
    private list = document.getElementById("agency-listbox") as HTMLUListElement;
    private selected: AgencyIndexEntry | undefined;
    private matches: AgencyIndexEntry[] = [];
    private active = -1;

    constructor(private agencies: AgencyIndexEntry[], private onSelect: (id: string) => void) {
        this.input.addEventListener("input", () => this.open());
        this.input.addEventListener("focus", () => { this.input.select(); this.open(); });
        // the input keeps focus after Escape or choosing a department, so clicking it again must reopen the list
        this.input.addEventListener("click", () => {
            if (this.list.hidden) {
                this.input.select();
                this.open();
            }
        });
        this.input.addEventListener("keydown", event => this.onKeyDown(event));
        // mousedown rather than click: it fires before the input loses focus and closes the list
        this.list.addEventListener("mousedown", event => {
            const item = (event.target as HTMLElement).closest<HTMLElement>("[data-id]");

            if (item) {
                event.preventDefault();
                this.choose(item.dataset.id!);
            }
        });
        this.input.addEventListener("blur", () => this.close());
    }

    setSelected(id: string) {
        this.selected = this.agencies.find(a => a.id === id);
        this.input.value = this.selected?.name ?? "";
    }

    private open() {
        const result = searchAgencies(this.input.value, this.agencies, maxResults);
        this.matches = result.matches;
        this.active = this.matches.length > 0 ? 0 : -1;

        this.list.innerHTML = "";
        this.matches.forEach((agency, i) => {
            const item = document.createElement("li");
            item.id = `agency-option-${i}`;
            item.setAttribute("role", "option");
            item.dataset.id = agency.id;
            item.textContent = agency.name;
            this.list.appendChild(item);
        });

        if (this.matches.length === 0) {
            this.addNote("No departments match.");
        } else if (result.total > this.matches.length) {
            this.addNote(`Showing ${this.matches.length} of ${result.total}. Keep typing to narrow the list.`);
        }

        this.list.hidden = false;
        this.input.setAttribute("aria-expanded", "true");
        this.highlight();
    }

    private addNote(text: string) {
        const note = document.createElement("li");
        note.className = "note";
        note.setAttribute("role", "presentation");
        note.textContent = text;
        this.list.appendChild(note);
    }

    private close() {
        this.list.hidden = true;
        this.input.setAttribute("aria-expanded", "false");
        this.input.removeAttribute("aria-activedescendant");
        // abandon a half-typed search and show the department that is actually selected
        this.input.value = this.selected?.name ?? "";
    }

    private choose(id: string) {
        this.setSelected(id);
        this.close();
        this.input.blur();
        this.onSelect(id);
    }

    private highlight() {
        this.list.querySelectorAll("[role=option]").forEach((item, i) => {
            item.setAttribute("aria-selected", String(i === this.active));
        });

        const current = this.active >= 0 ? document.getElementById(`agency-option-${this.active}`) : null;

        if (current) {
            this.input.setAttribute("aria-activedescendant", current.id);
            current.scrollIntoView({ block: "nearest" });
        } else {
            this.input.removeAttribute("aria-activedescendant");
        }
    }

    private onKeyDown(event: KeyboardEvent) {
        if (event.key === "ArrowDown" || event.key === "ArrowUp") {
            event.preventDefault();

            if (this.list.hidden) {
                this.open();
            } else if (this.matches.length > 0) {
                const step = event.key === "ArrowDown" ? 1 : -1;
                this.active = (this.active + step + this.matches.length) % this.matches.length;
                this.highlight();
            }
        } else if (event.key === "Enter" && !this.list.hidden && this.active >= 0) {
            event.preventDefault();
            this.choose(this.matches[this.active].id);
        } else if (event.key === "Escape") {
            this.close();
        }
    }
}
