# itpss-visualizer

Visualizes the Illinois Traffic and Pedestrian Stop Study (ITPSS) by police department, stop type and year.

## The site

Three pages, built with Vite from `index.html`, `department/index.html` and `rankings/index.html`:

- **Home** (`/`): what the project is and how to read the numbers.
- **Check Your Department** (`/department/`): one department, one year, with the trend across years.
- **How Departments Compare** (`/rankings/`): every department for a year, ranked by the combined Black and Hispanic rate ratio vs. White.

The nav bar, shared `<head>` tags and footer are written once in `site/` and filled into each page at build time (a `<!-- site-nav -->` comment marks the spot). `site/config.ts` holds the site's name and the page list.
Links shared before the home page existed (`/#/traffic/belvidere-police/2019`) are sent on to `/department/#/...`.

## Development

```bash
npm install
npm run dev     # local dev server
npm test        # unit tests, including a real build of the whole site
npm run build   # type-check + production build into dist/
```

GitHub Pages serves the site from a folder named after the repository, so the deploy workflow builds with `BASE_PATH=/<repo name>/`. Locally the base is `/`; to try the Pages layout, run `BASE_PATH=/itpss-visualizer/ npm run build && BASE_PATH=/itpss-visualizer/ npx vite preview`.

## Data

The site reads static JSON under `public/data/`, generated from IDOT's published PDF reports:

- `agencies.json` is the index of departments and the years available for each stop type.
- `agency/{id}.json` holds every year of traffic and pedestrian stats for one department. A `null` benchmark means that year's report doesn't publish one; the page then shows only the charts that don't need it (see `src/eras.ts`). From 2019, each file also holds IDOT's printed 95% interval for the Black and Hispanic rate ratios.
- `rankings/traffic-{year}.json` is what the Rankings page loads: each comparable department's counts for one year, so the page needs one request, not one per department.

Source reports are listed at
<https://idot.illinois.gov/form-and-reports/crash-reports/illinois-traffic-and-pedestrian-stop-study.html>.

### Merging a department that changed names

IDOT's agency names change between years (spelling, "Police" vs "Police Department", real renames), and each distinct name becomes its own agency. `python -m pipeline.rename_report` writes `pipeline/rename_candidates.md`: spelling variants of one department (with a proposed `agency_aliases.json`), and pairs where one name extends another that need a human decision. Confirmed merges go in `pipeline/agency_aliases.json` as `{"id to merge": "id to keep"}`; the next `build_data` combines their years, and fails if an id in the file matches no agency.

### Regenerating the data

The pipeline is Python (`pipeline/`) and covers every year from 2004 to 2025, traffic and pedestrian. Two parsers handle the two report layouts: `parse_tables.py` (2019 onward, with a population benchmark by race) and `parse_legacy.py` (2004-2018 per-agency pages; stops by race, and for pedestrian stops from 2016 a population count by race).

```bash
python3 -m venv .venv && .venv/bin/pip install -r pipeline/requirements.txt
.venv/bin/python -m pipeline.manifest      # refresh the list of IDOT report PDFs (pipeline/manifest.json)
.venv/bin/python -m pipeline.build_data    # download PDFs (~450 MB for all years), parse, validate, write public/data/
.venv/bin/python -m pytest pipeline        # parser tests
```

PDFs and extracted text are cached in `pipeline/cache/` (not committed); `pipeline/manifest.lock.json` records each PDF's checksum.
`build_data` refuses to write anything if a page fails validation: each agency's stops and benchmark by race must sum to the totals stated on the page.
`pipeline/data_warnings.txt` lists the discrepancies it tolerated (IDOT's own inconsistencies, kept as printed) and compares agency sums to the statewide totals.
`pipeline/page_overrides.json` and `pipeline/name_overrides.json` hold the few manual corrections (a page missing its header in IDOT's PDF, and display-name fixes).

## Deployment

Pushes to `main` build and publish to GitHub Pages via `.github/workflows/deploy.yml`.
In the repo's Settings > Pages, set the source to "GitHub Actions".
