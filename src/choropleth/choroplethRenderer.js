import GraphicsLayer from "@arcgis/core/layers/GraphicsLayer.js";
import Graphic from "@arcgis/core/Graphic.js";
import SimpleFillSymbol from "@arcgis/core/symbols/SimpleFillSymbol.js";

import { appState } from "../state.js";
import { clamp, escapeHtml } from "../utils.js";
import { CHOROPLETH_CONFIG as CONFIG } from "./choroplethConfig.js";


// ============================================================
// THE MAP LAYER
// ============================================================
//
// A plain GraphicsLayer owned by this file. It is added to the
// map when something is drawn and removed again when cleared,
// so nothing else in the app is affected.
//

let layer = null;

function getLayer() {

  if (!layer) {

    layer = new GraphicsLayer({
      title: "Field choropleth",
      opacity: CONFIG.opacity,
      listMode: "hide",
    });
  }

  const map = appState.map;

  if (!map.layers.includes(layer)) {
    map.add(layer);
  }

  // Keep it above layers that were added later.
  map.reorder(layer, map.layers.length - 1);

  return layer;
}

/** The layer the shapes are drawn on, or null if nothing is drawn. */
export function getChoroplethLayer() {

  return layer && appState.map.layers.includes(layer) ? layer : null;
}

export function clearChoropleth() {

  if (!layer) {
    return;
  }

  layer.removeAll();

  appState.map.remove(layer);
}

export function setChoroplethOpacity(opacity) {

  if (layer) {
    layer.opacity = clamp(Number(opacity), 0, 1);
  }
}


// ============================================================
// CLASSIFICATION (quantiles)
// ============================================================
//
// Returns { min, uppers } where uppers[i] is the highest value
// in class i, or null if there are no values. Duplicate
// thresholds are merged, so there can be fewer classes than
// requested.
//

export function classify(values, classes = CONFIG.classes) {

  const sorted = values.filter(Number.isFinite).sort((a, b) => a - b);

  if (sorted.length === 0) {
    return null;
  }

  const uppers = [];

  for (let i = 1; i <= classes; i++) {

    const value = sorted[Math.ceil((i * sorted.length) / classes) - 1];

    if (uppers.length === 0 || value > uppers[uppers.length - 1]) {
      uppers.push(value);
    }
  }

  return { min: sorted[0], uppers };
}

function classIndex(scheme, value) {

  return scheme.uppers.findIndex((upper) => value <= upper);
}

/** Picks colour number `i` of `count` from the ramp. */
export function colorFor(i, count) {

  const ramp = CONFIG.ramp;

  return count === 1
    ? ramp[Math.floor((ramp.length - 1) / 2)]
    : ramp[Math.round((i * (ramp.length - 1)) / (count - 1))];
}


// ============================================================
// DRAW
// ============================================================
//
// shapes: [{ id, geometry }]     values: Map(id -> number)
//
// Returns { scheme, matched, total } for the legend and status.
//

function fillSymbol(color) {

  return new SimpleFillSymbol({
    color,
    outline: { color: CONFIG.outlineColor, width: CONFIG.outlineWidth },
  });
}

export function drawChoropleth(shapes, values) {

  const target = getLayer();

  const present = shapes
    .map((shape) => values.get(shape.id))
    .filter((value) => value !== undefined);

  const scheme = classify(present);

  // One symbol per class, shared by every graphic in that class.
  const symbols = scheme
    ? scheme.uppers.map((_, i) => fillSymbol(colorFor(i, scheme.uppers.length)))
    : [];

  const noDataSymbol = fillSymbol(CONFIG.noDataColor);

  const graphics = shapes.map((shape) => {

    const value = values.get(shape.id);

    return new Graphic({
      geometry: shape.geometry,
      symbol: value === undefined
        ? noDataSymbol
        : symbols[classIndex(scheme, value)],
      attributes: { id: shape.id, value: value ?? null },
    });
  });

  // Swap everything in one go (graphics are given their symbol
  // before they are added, which is much faster than changing
  // them while they are on the map).
  target.removeAll();
  target.addMany(graphics);

  return { scheme, matched: present.length, total: shapes.length };
}


// ============================================================
// LEGEND
// ============================================================

/** Same number of decimals for every legend entry, based on the data range. */
function decimalsFor(span) {

  return span >= 100 ? 0 : span >= 10 ? 1 : span >= 1 ? 2 : 3;
}

export function formatValue(value, decimals = 2) {

  return value.toFixed(decimals);
}

function cssColor(color) {

  return Array.isArray(color)
    ? `rgba(${color[0]}, ${color[1]}, ${color[2]}, ${color[3] ?? 1})`
    : color;
}

export function legendHtml(scheme, unit = "") {

  if (!scheme) {
    return "";
  }

  const max = scheme.uppers[scheme.uppers.length - 1];
  const decimals = decimalsFor(max - scheme.min);

  const rows = scheme.uppers.map((upper, i) => {

    const lower = i === 0 ? scheme.min : scheme.uppers[i - 1];

    const text =
      lower === upper
        ? `${formatValue(upper, decimals)}${unit}`
        : `${formatValue(lower, decimals)} – ${formatValue(upper, decimals)}${unit}`;

    return legendRow(colorFor(i, scheme.uppers.length), text);
  });

  rows.push(legendRow(CONFIG.noDataColor, "No data"));

  return rows.join("");
}

function legendRow(color, text) {

  return `
    <div class="choropleth-legend-item">
      <span class="choropleth-swatch"
            style="background:${cssColor(color)}"></span>
      <span>${escapeHtml(text)}</span>
    </div>
  `;
}
