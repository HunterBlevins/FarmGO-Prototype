import { escapeHtml } from "../utils.js";
import { createLineChart } from "./reportCharts.js";
import { COMPARISONS, groupRecords, compareSeries } from "./comparison.js";
import { FIELD_REPORT_CONFIG as CONFIG } from "../fieldReports/fieldReportConfig.js";

import {
  describeVariable,
  sortVariables,
  sortPeriods,
  variableColor,
  capitalize,
} from "./variables.js";


// ============================================================
// COMPARISON REPORT (shared by county + field reports)
// ============================================================
//
//   Change from last:   [Week] [Month] [Year] [Historical Norm]
//
//   NDVI                                         +0.10
//   Last week: 0.20  →  Now: 0.30
//   ...
//
// Rows are tinted green when "Now" is higher than what it is
// compared with and red when it is lower; the bigger the change,
// the stronger the colour. Clicking a row opens that variable's
// chart under it; clicking again closes it.
//
// Each report keeps its own `ui` object (see createReportUiState),
// so the county report and the field report stay independent.
//

const GREEN = "22, 163, 74";
const RED = "220, 38, 38";


/** Settings that survive moving from one county / field to the next. */
export function createReportUiState() {

  return {
    comparison: COMPARISONS[0].id,
    period: null,
    expanded: new Set(), // variables whose chart is open
  };
}


// ============================================================
// RENDER
// ============================================================
//
// headerHtml: the heading (name + id) shown above the controls.
// records:    [{ START, VALUE, PERIOD, VARIABLE }] (PERIOD and
//             VARIABLE trimmed + lower-case).
//

export function renderComparisonReport(container, { headerHtml, records, ui }) {

  if (records.length === 0) {

    container.innerHTML = `
      ${headerHtml}
      <div class="empty-state">
        No statistics are available.
      </div>
    `;

    return;
  }

  // --- Time scale -----------------------------------------

  const periods = sortPeriods([...new Set(records.map((r) => r.PERIOD))]);

  if (!periods.includes(ui.period)) {
    ui.period =
      CONFIG.preferredPeriods.find((p) => periods.includes(p)) ?? periods[0];
  }

  const periodControl =
    periods.length > 1
      ? `
        <label class="compare-period-label">
          Time scale
          <select class="compare-period">
            ${periods.map((p) => `
              <option value="${escapeHtml(p)}"
                ${p === ui.period ? "selected" : ""}>
                ${escapeHtml(capitalize(p) || "Unspecified")}
              </option>
            `).join("")}
          </select>
        </label>
      `
      : "";

  // --- Skeleton -------------------------------------------

  container.innerHTML = `
    ${headerHtml}

    <div class="compare-bar">
      <span class="compare-label">Change from last:</span>
      <div class="compare-tabs" role="group" aria-label="Compare against">
        ${COMPARISONS.map((c) => `
          <button type="button"
                  class="compare-tab"
                  data-comparison="${c.id}">
            ${escapeHtml(c.tab)}
          </button>
        `).join("")}
      </div>
    </div>

    ${periodControl}

    <div class="compare-list"></div>
    <div class="compare-note"></div>
  `;

  const list = container.querySelector(".compare-list");
  const note = container.querySelector(".compare-note");
  const tabs = [...container.querySelectorAll(".compare-tab")];

  let groups = groupRecords(records, ui.period);

  const draw = () => {

    for (const tab of tabs) {

      const active = tab.dataset.comparison === ui.comparison;

      tab.classList.toggle("active", active);
      tab.setAttribute("aria-pressed", String(active));
    }

    drawRows(list, note, groups, ui);
  };

  // --- Events ---------------------------------------------

  container.querySelector(".compare-bar").addEventListener("click", (event) => {

    const tab = event.target.closest(".compare-tab");

    if (tab) {
      ui.comparison = tab.dataset.comparison;
      draw();
    }
  });

  container.querySelector(".compare-period")?.addEventListener("change", (event) => {

    ui.period = event.target.value;
    groups = groupRecords(records, ui.period);
    draw();
  });

  list.addEventListener("click", (event) => {

    const row = event.target.closest(".compare-row");

    if (!row) {
      return;
    }

    const item = row.closest(".compare-item");
    const name = item.dataset.variable;

    if (ui.expanded.has(name)) {
      ui.expanded.delete(name);
      closeChart(item);
    } else {
      ui.expanded.add(name);
      openChart(item, name, groups, ui);
    }
  });

  draw();
}


// ============================================================
// ROWS
// ============================================================

function drawRows(list, note, groups, ui) {

  const comparison = COMPARISONS.find((c) => c.id === ui.comparison);

  const names = sortVariables([...groups.keys()]);

  if (names.length === 0) {

    list.innerHTML = `
      <div class="empty-state">No data for this time scale.</div>
    `;
    note.textContent = "";

    return;
  }

  list.innerHTML = names.map((name) => {

    const result = compareSeries(groups.get(name).points, comparison);

    return rowHtml(name, result, comparison, ui.expanded.has(name));

  }).join("");

  note.textContent =
    `Green: higher than ${comparison.label.toLowerCase()}. ` +
    `Red: lower. Stronger colour = bigger change. Click a row for its chart.`;

  // Charts that were open stay open when the comparison changes.
  for (const item of list.querySelectorAll(".compare-item")) {

    if (ui.expanded.has(item.dataset.variable)) {
      openChart(item, item.dataset.variable, groups, ui);
    }
  }
}

function rowHtml(name, result, comparison, expanded) {

  const info = describeVariable(name);

  const decimals = decimalsFor(
    Math.max(Math.abs(result.now), Math.abs(result.base ?? 0))
  );

  const show = (value) =>
    value === null ? "—" : `${value.toFixed(decimals)}${info.unit}`;

  const tint = tintFor(result, info.higherIsBetter);

  const style = tint
    ? `style="--row-bg: ${tint.background}; --row-edge: ${tint.edge};"`
    : "";

  const delta =
    result.delta === null
      ? ""
      : `<span class="compare-delta">${formatDelta(result.delta, decimals)}${escapeHtml(info.unit)}</span>`;

  return `
    <div class="compare-item" data-variable="${escapeHtml(name)}">

      <button type="button"
              class="compare-row ${tint ? "tinted" : ""}"
              aria-expanded="${expanded}"
              title="${escapeHtml(tooltip(result, comparison))}"
              ${style}>

        <span class="compare-top">
          <span class="compare-name">${escapeHtml(info.label)}</span>
          ${delta}
          <span class="compare-chevron" aria-hidden="true"></span>
        </span>

        <span class="compare-values">
          <span>${escapeHtml(comparison.label)}: <b>${escapeHtml(show(result.base))}</b></span>
          <span class="compare-arrow" aria-hidden="true">→</span>
          <span>Now: <b>${escapeHtml(show(result.now))}</b></span>
        </span>

      </button>

      <div class="compare-chart" hidden></div>

    </div>
  `;
}

function tintFor(result, higherIsBetter) {

  if (!result.direction || result.strength <= 0) {
    return null;
  }

  // "Green when higher" unless the variable is configured the
  // other way round (higherIsBetter: false in the config).
  const good = (result.direction > 0) === higherIsBetter;
  const rgb = good ? GREEN : RED;

  return {
    background: `rgba(${rgb}, ${(0.10 + 0.38 * result.strength).toFixed(3)})`,
    edge: `rgba(${rgb}, ${(0.45 + 0.55 * result.strength).toFixed(3)})`,
  };
}

function tooltip(result, comparison) {

  const parts = [`Now: ${formatDate(result.nowTime)}`];

  if (result.base === null) {

    parts.push(`No ${comparison.label.toLowerCase()} data to compare with.`);

  } else if (comparison.id === "norm") {

    parts.push(
      `Historical norm: average of ${result.samples} prior ` +
      `year${result.samples === 1 ? "" : "s"} at this time of year.`
    );

  } else {

    parts.push(`${comparison.label}: ${formatDate(result.baseTime)}`);
  }

  return parts.join("\n");
}


// ============================================================
// CHARTS
// ============================================================

function openChart(item, name, groups, ui) {

  const target = item.querySelector(".compare-chart");
  const group = groups.get(name);

  if (!target || !group) {
    return;
  }

  item.querySelector(".compare-row").setAttribute("aria-expanded", "true");

  // Visible first: the chart sizes itself to its container.
  target.hidden = false;

  const info = describeVariable(name);

  const index = sortVariables([...groups.keys()]).indexOf(name);

  createLineChart(target, {
    title: info.label,
    subtitle: capitalize(ui.period),
    unit: info.unit,
    series: [{
      name: "", // single series: the title already says it
      color: variableColor(name, index),
      records: group.records,
    }],
  });
}

function closeChart(item) {

  item.querySelector(".compare-row").setAttribute("aria-expanded", "false");

  const target = item.querySelector(".compare-chart");

  target.replaceChildren();
  target.hidden = true;
}


// ============================================================
// FORMATTING
// ============================================================

/** More decimals for small numbers (0.31), fewer for big ones (104). */
function decimalsFor(magnitude) {

  return magnitude >= 100 ? 0 : magnitude >= 10 ? 1 : 2;
}

function formatDelta(delta, decimals) {

  const text = Math.abs(delta).toFixed(decimals);

  // A change that rounds to zero is shown without a sign.
  if (Number(text) === 0) {
    return text;
  }

  return `${delta > 0 ? "+" : "−"}${text}`;
}

/** Dates are stored in UTC; show them as stored. */
function formatDate(time) {

  return new Date(time).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}
