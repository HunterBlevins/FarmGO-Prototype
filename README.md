# FarmGO

An agricultural data dashboard built with Vite and the ArcGIS Maps SDK for JavaScript.
Pick a state and county to see a climate report, switch raster datasets on and off, and
click field boundaries to inspect their attributes.

## Getting started

```bash
npm install
npm run dev       # local development server
npm run build     # production build into dist/
npm run preview   # serve the production build locally
```

## Project layout

```
index.html               page structure (panels, map, legend)
src/
  main.js                startup: wires the map, UI and panels together
  config.js              services, datasets and per-state data (edit this to add data)
  state.js               shared application state
  map.js                 map, view and map components
  ui.js                  all DOM updates for the side panels
  geography.js           state / county selection
  rasters.js             raster layers + legend
  fields.js              field layers + click-to-inspect
  panelResize.js         draggable side panels
  utils.js               shared helpers (escaping, clamp, guards)
  reports/
    countyReport.js      county report panel
    reportData.js        CountyStatistics queries (paged + cached)
    reportCharts.js      SVG line charts
  style.css
```

## Adding data for a state

Everything is configured in `src/config.js`.

1. Add the dataset's look (title, colour ramp, default opacity) under `datasets` if it is new.
2. Add the state under `states`, keyed by its exact name (e.g. `"Texas"`), with a `rasters`
   map of `datasetId -> ImageServer URL` and a `fields` list of feature layers.
3. Entries whose URL starts with `YOUR-` are treated as "not configured yet" and are skipped.

## Deployment

Pushing to `main` builds the site and publishes it to GitHub Pages
(`.github/workflows/deploy.yml`). The production build uses the base path
`/FarmGO-Prototype/` (see `vite.config.js`); local development uses `/`.
