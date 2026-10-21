import { escapeHtml } from "../utils.js";
import { CHOROPLETH_CONFIG as CONFIG } from "./choroplethConfig.js";


// ============================================================
// CHANGE FROM THE HISTORICAL NORM
// ============================================================
//
// Every field / county is coloured by
//
//     change = value for the chosen date - historical norm for
//              the same time of year
//
// in the variable's own units. Red = lower than the norm, green =
// higher, and the colour is symmetric around "no change".
//

/**
 * Map< id -> change > for every id that has both a value and a
 * norm. Ids missing either are left out (they are drawn as "no data").
 */
export function computeChanges(values, norms) {

  const changes = new Map();

  for (const [id, value] of values) {

    const norm = norms.get(id);

    if (norm !== undefined) {
      changes.set(id, value - norm);
    }
  }

  return changes;
}


// ============================================================
// THE SCALE
// ============================================================
//
// Returns {
//   range,            the change that gets full red / full green
//   steps,            number of distinct colours
//   colors,           [[r, g, b], ...] from full red to full green
//   indexFor(change), which colour a change gets
// }
//

export function buildScale(changes, variable) {

  const range = resolveRange(changes, variable);

  const steps = Math.max(3, CONFIG.colorSteps | 1); // at least 3, odd
  const colors = [];

  for (let i = 0; i < steps; i++) {
    colors.push(blend(CONFIG.divergingRamp, i / (steps - 1)));
  }

  const indexFor = (change) => {

    const t = Math.max(-1, Math.min(1, change / range)); // -1 .. 1

    return Math.round(((t + 1) / 2) * (steps - 1));
  };

  return { range, steps, colors, indexFor };
}

/** Configured range for the variable, else a tidy number from the data. */
function resolveRange(changes, variable) {

  const fixed = CONFIG.changeRange?.[String(variable).toLowerCase()];

  if (Number.isFinite(fixed) && fixed > 0) {
    return fixed;
  }

  const sizes = [...changes.values()].map(Math.abs).sort((a, b) => a - b);

  if (sizes.length === 0) {
    return 1;
  }

  // 95th percentile: one extreme value must not wash out the rest.
  const p95 = sizes[Math.floor(0.95 * (sizes.length - 1))];

  return p95 > 0 ? niceNumber(p95) : 1;
}

/** Rounds up to 1, 2, 2.5, 5 or 10 times a power of ten. */
function niceNumber(value) {

  const power = 10 ** Math.floor(Math.log10(value));
  const fraction = value / power;

  const nice = [1, 2, 2.5, 5, 10].find((step) => fraction <= step);

  return nice * power;
}

/** Linear blend along a list of "#rrggbb" colours; t is 0 - 1. */
function blend(ramp, t) {

  const position = t * (ramp.length - 1);
  const low = Math.floor(position);
  const high = Math.min(ramp.length - 1, low + 1);
  const weight = position - low;

  const a = hexToRgb(ramp[low]);
  const b = hexToRgb(ramp[high]);

  return a.map((channel, i) => Math.round(channel + (b[i] - channel) * weight));
}

function hexToRgb(hex) {

  const value = parseInt(hex.slice(1), 16);

  return [(value >> 16) & 255, (value >> 8) & 255, value & 255];
}


// ============================================================
// LEGEND
// ============================================================

function cssColor(color) {

  return Array.isArray(color)
    ? `rgba(${color[0]}, ${color[1]}, ${color[2]}, ${color[3] ?? 1})`
    : color;
}

/** Same decimals for every label, based on how big the range is. */
function decimalsFor(range) {

  return range >= 10 ? 0 : range >= 1 ? 1 : range >= 0.1 ? 2 : 3;
}

/** "+2.5°F", "−0.40 in", "0". */
export function formatChange(change, range, unit = "") {

  const text = Math.abs(change).toFixed(decimalsFor(range));

  if (Number(text) === 0) {
    return "0";
  }

  return `${change > 0 ? "+" : "−"}${text}${unit}`;
}

export function legendHtml(scale, { unit = "", normLabel = "" } = {}) {

  if (!scale) {
    return "";
  }

  const gradient = scale.colors
    .map((color, i) =>
      `rgb(${color.join(",")}) ${((i / (scale.steps - 1)) * 100).toFixed(1)}%`
    )
    .join(", ");

  const { range } = scale;

  return `
    <div class="choropleth-legend-title">
      Change from the historical norm${normLabel ? ` (${escapeHtml(normLabel)})` : ""}
    </div>

    <div class="choropleth-ramp"
         style="background: linear-gradient(to right, ${gradient})"></div>

    <div class="choropleth-ramp-labels">
      <span>${escapeHtml(formatChange(-range, range, unit))}</span>
      <span>Norm</span>
      <span>${escapeHtml(formatChange(range, range, unit))}</span>
    </div>

    <div class="choropleth-ramp-labels choropleth-ramp-meaning">
      <span>Lower</span>
      <span>Higher</span>
    </div>

    <div class="choropleth-legend-item">
      <span class="choropleth-swatch"
            style="background:${cssColor(CONFIG.noDataColor)}"></span>
      <span>No data</span>
    </div>
  `;
}
