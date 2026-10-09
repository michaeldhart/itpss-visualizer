# itpss-visualizer

Visualizes the Illinois Traffic and Pedestrian Stop Study (ITPSS) by police department, stop type and year.

## Development

```bash
npm install
npm run dev     # local dev server
npm test        # unit tests
npm run build   # type-check + production build into dist/
```

## Data

The site reads static JSON under `public/data/`, generated from IDOT's published PDF reports:

- `agencies.json` is the index of departments and the years available for each stop type.
- `agency/{id}.json` holds every year of traffic and pedestrian stats for one department. A `null` benchmark means that year's report doesn't publish one; the page then shows only the charts that don't need it (see `src/eras.ts`).

Source reports are listed at
<https://idot.illinois.gov/form-and-reports/crash-reports/illinois-traffic-and-pedestrian-stop-study.html>.

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
