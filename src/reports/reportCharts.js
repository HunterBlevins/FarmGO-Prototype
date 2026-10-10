import { escapeHtml, clamp } from "../utils.js";

// ============================================================
// COUNTY REPORT CHARTS
// ============================================================
//
// One line-chart renderer draws every chart in the report.
// The x axis is a real time scale, so series with different
// dates line up correctly. Charts are drawn at the width of
// their container (so text is never stretched) and redrawn
// when the panel is resized.
//

const CHART_HEIGHT = 280;
const MARGIN = { top: 14, right: 16, bottom: 34, left: 52 };
const MIN_WIDTH = 260;
const CARD_PADDING = 38; // card padding + border, in px
const Y_GRID_LINES = 5;
const MAX_VISIBLE_POINTS = 60;
const DAY_MS = 24 * 60 * 60 * 1000;

const DEFAULT_COLOR = "#2563eb";

const TEMPERATURE_SERIES = [
  { key: "tmin", name: "Minimum", color: "#2563eb" },
  { key: "tmean", name: "Mean", color: "#f59e0b" },
  { key: "tmax", name: "Maximum", color: "#dc2626" },
];

const resizeObservers = new WeakMap();


// ============================================================
// PUBLIC: SINGLE-SERIES CHART
// ============================================================

export function createTimeSeriesChart(container, data, options = {}) {

  createLineChart(container, {
    title: options.title ?? "Time Series",
    subtitle: options.yAxisLabel ?? "",
    unit: options.valueSuffix ?? "",
    series: [{
      name: options.title ?? "",
      color: options.color ?? DEFAULT_COLOR,
      records: data,
    }],
  });
}


// ============================================================
// PUBLIC: TEMPERATURE CHART (min / mean / max)
// ============================================================

export function createTemperatureChart(container, climate) {

  createLineChart(container, {
    title: "Temperature",
    subtitle: "Minimum, mean, and maximum temperature",
    unit: "°",
    emptyMessage: "No temperature data available.",
    showLegend: true,
    series: TEMPERATURE_SERIES.map(({ key, name, color }) => ({
      name,
      color,
      records: climate?.[key] ?? [],
    })),
  });
}


// ============================================================
// LINE CHART
// ============================================================
//
// config = {
//   title, subtitle, unit, emptyMessage, showLegend,
//   series: [{ name, color, records: [{ START, VALUE }] }]
// }
//

export function createLineChart(container, config) {

  if (!container) {
    console.warn("Chart container not found.");
    return;
  }

  drawChart(container, config);

  watchContainerWidth(container, config);
}

function drawChart(container, config) {

  const {
    title,
    subtitle = "",
    unit = "",
    emptyMessage = "No data available.",
    showLegend = false,
  } = config;

  const series = prepareSeries(config.series);

  if (series.length === 0) {

    container.innerHTML = card(
      title,
      subtitle,
      "",
      `<div class="report-no-data">${escapeHtml(emptyMessage)}</div>`
    );

    return;
  }

  // ----------------------------------------------------------
  // SIZE
  // ----------------------------------------------------------

  const width = Math.max(
    MIN_WIDTH,
    Math.floor(container.clientWidth - CARD_PADDING)
  );

  const height = CHART_HEIGHT;

  const plotWidth = width - MARGIN.left - MARGIN.right;
  const plotHeight = height - MARGIN.top - MARGIN.bottom;

  // ----------------------------------------------------------
  // SCALES
  // ----------------------------------------------------------

  const allPoints = series.flatMap((s) => s.points);

  const times = allPoints.map((p) => p.time);
  const values = allPoints.map((p) => p.value);

  const minTime = Math.min(...times);
  const maxTime = Math.max(...times);

  let minValue = Math.min(...values);
  let maxValue = Math.max(...values);

  if (minValue === maxValue) {

    minValue -= 1;
    maxValue += 1;

  } else {

    const padding = (maxValue - minValue) * 0.12;

    minValue -= padding;
    maxValue += padding;
  }

  // Small ranges (e.g. NDVI, 0 - 1) need more decimals than 72.4°.
  const span = maxValue - minValue;
  const axisDecimals = span >= 5 ? 1 : span >= 0.5 ? 2 : 3;
  const tipDecimals = span >= 5 ? 1 : 3;

  const x = (time) =>
    minTime === maxTime
      ? MARGIN.left + plotWidth / 2
      : MARGIN.left + ((time - minTime) / (maxTime - minTime)) * plotWidth;

  const y = (value) =>
    MARGIN.top +
    plotHeight -
    ((value - minValue) / (maxValue - minValue)) * plotHeight;

  // ----------------------------------------------------------
  // GRID + Y LABELS
  // ----------------------------------------------------------

  let grid = "";

  for (let i = 0; i <= Y_GRID_LINES; i++) {

    const value = minValue + ((maxValue - minValue) * i) / Y_GRID_LINES;
    const lineY = y(value);

    grid += `
      <line x1="${MARGIN.left}" y1="${lineY}"
            x2="${MARGIN.left + plotWidth}" y2="${lineY}"
            class="chart-grid-line" />
      <text x="${MARGIN.left - 8}" y="${lineY + 4}"
            class="chart-axis-label" text-anchor="end">
        ${formatNumber(value, axisDecimals)}${escapeHtml(unit)}
      </text>
    `;
  }

  // ----------------------------------------------------------
  // X LABELS
  // ----------------------------------------------------------

  const labelCount =
    minTime === maxTime ? 1 : clamp(Math.floor(plotWidth / 90), 2, 6);

  const dateStyle = maxTime - minTime <= 120 * DAY_MS ? "short" : "month";

  let xLabels = "";

  for (let i = 0; i < labelCount; i++) {

    const time =
      labelCount === 1
        ? minTime
        : minTime + ((maxTime - minTime) * i) / (labelCount - 1);

    // Keep the first and last labels inside the chart.
    const anchor =
      labelCount === 1 ? "middle" : i === 0 ? "start" : i === labelCount - 1 ? "end" : "middle";

    xLabels += `
      <text x="${x(time)}" y="${height - 10}"
            class="chart-axis-label" text-anchor="${anchor}">
        ${formatDate(time, dateStyle)}
      </text>
    `;
  }

  // ----------------------------------------------------------
  // LINES + POINTS
  // ----------------------------------------------------------

  let lines = "";
  let points = "";

  for (const s of series) {

    const color = escapeHtml(s.color);

    lines += `
      <polyline class="chart-line" style="color:${color}"
        points="${s.points.map((p) => `${x(p.time)},${y(p.value)}`).join(" ")}" />
    `;

    // Dense series get invisible hover targets instead of dots.
    const visible = s.points.length <= MAX_VISIBLE_POINTS;

    for (const p of s.points) {

      const label = `${s.name ? `${s.name} — ` : ""}${formatDate(p.time, "full")}: ${formatNumber(p.value, tipDecimals)}${unit}`;

      points += `
        <circle cx="${x(p.time)}" cy="${y(p.value)}"
                r="${visible ? 4.5 : 6}"
                class="${visible ? "chart-point" : "chart-point-hover"}"
                style="color:${color}">
          <title>${escapeHtml(label)}</title>
        </circle>
      `;
    }
  }

  // ----------------------------------------------------------
  // RENDER
  // ----------------------------------------------------------

  const legend = showLegend
    ? `<div class="chart-legend">
        ${series.map((s) => `
          <div class="chart-legend-item">
            <span class="chart-legend-marker"
                  style="background:${escapeHtml(s.color)}"></span>
            <span>${escapeHtml(s.name)}</span>
          </div>
        `).join("")}
      </div>`
    : "";

  container.innerHTML = card(
    title,
    subtitle,
    legend,
    `
      <div class="report-chart-svg-wrapper">
        <svg class="report-chart-svg"
             viewBox="0 0 ${width} ${height}"
             role="img"
             aria-label="${escapeHtml(title)} chart">
          ${grid}
          <line x1="${MARGIN.left}" y1="${MARGIN.top}"
                x2="${MARGIN.left}" y2="${MARGIN.top + plotHeight}"
                class="chart-axis" />
          <line x1="${MARGIN.left}" y1="${MARGIN.top + plotHeight}"
                x2="${MARGIN.left + plotWidth}" y2="${MARGIN.top + plotHeight}"
                class="chart-axis" />
          ${lines}
          ${points}
          ${xLabels}
        </svg>
      </div>
    `
  );

  container.dataset.chartWidth = String(width);
}


// ============================================================
// HELPERS
// ============================================================

function card(title, subtitle, headerExtra, body) {

  return `
    <div class="report-chart-card">

      <div class="report-chart-header">

        <div>
          <div class="report-chart-title">${escapeHtml(title)}</div>
          ${subtitle
            ? `<div class="report-chart-subtitle">${escapeHtml(subtitle)}</div>`
            : ""}
        </div>

        ${headerExtra}

      </div>

      ${body}

    </div>
  `;
}

/**
 * Turns raw records into sorted { time, value } points.
 * Records with a missing/invalid date or value are skipped
 * (a null VALUE must not be drawn as 0), and series with no
 * usable points are dropped.
 */
function prepareSeries(series = []) {

  return series
    .map((s) => ({
      ...s,
      points: (s.records ?? [])
        .map((record) => ({
          time: new Date(record.START).getTime(),
          value:
            record.VALUE === null || record.VALUE === undefined
              ? NaN
              : Number(record.VALUE),
        }))
        .filter((p) => Number.isFinite(p.time) && Number.isFinite(p.value))
        .sort((a, b) => a.time - b.time),
    }))
    .filter((s) => s.points.length > 0);
}

/** Redraw the chart when its container changes width. */
function watchContainerWidth(container, config) {

  if (typeof ResizeObserver === "undefined") {
    return;
  }

  resizeObservers.get(container)?.disconnect();

  let frame = 0;

  const observer = new ResizeObserver(() => {

    cancelAnimationFrame(frame);

    frame = requestAnimationFrame(() => {

      const drawnWidth = Number(container.dataset.chartWidth);
      const newWidth = Math.floor(container.clientWidth - CARD_PADDING);

      // Ignore tiny changes (and the observer's first callback).
      if (drawnWidth && Math.abs(newWidth - drawnWidth) > 16 && container.isConnected) {
        drawChart(container, config);
      }
    });
  });

  observer.observe(container);

  resizeObservers.set(container, observer);
}

function formatDate(time, style) {

  const date = new Date(time);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const options =
    style === "full"
      ? { month: "short", day: "numeric", year: "numeric" }
      : style === "short"
        ? { month: "short", day: "numeric" }
        : { month: "short", year: "numeric" };

  // ArcGIS dates are UTC. Formatting in the viewer's time zone would
  // show 1 March as "Feb" for anyone west of Greenwich.
  return date.toLocaleDateString("en-US", { ...options, timeZone: "UTC" });
}

function formatNumber(value, decimals = 1) {

  return Number.isFinite(Number(value)) ? Number(value).toFixed(decimals) : "";
}
