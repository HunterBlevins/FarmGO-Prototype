import { appState } from "../state.js";
import { escapeHtml, createLatestGuard, isConfiguredUrl } from "../utils.js";
import { createLineChart } from "../reports/reportCharts.js";

import { FIELD_REPORT_CONFIG as CONFIG } from "./fieldReportConfig.js";
import { getFieldStatistics } from "./fieldReportData.js";


// ============================================================
// PANEL SECTION
// ============================================================
//
// The section is created by this file the first time it is
// needed and appended to the right panel, so index.html does
// not need to change. It reuses the existing report styles.
//

const SECTION_ID = "fieldReportSection";
const CONTAINER_ID = "fieldReport";

// Only the most recently clicked field may update the panel.
const reportGuard = createLatestGuard();

// Remember the chosen period when moving between fields.
let currentPeriod = null;


function getContainer() {

  let section = document.getElementById(SECTION_ID);

  if (!section) {

    const panel = document.getElementById("rightPanel");

    if (!panel) {
      console.warn("rightPanel not found; field report cannot be shown.");
      return null;
    }

    section = document.createElement("section");
    section.id = SECTION_ID;
    section.className = "panel-section";
    section.hidden = true;

    section.innerHTML = `
      <h2>Field Report</h2>
      <div id="${CONTAINER_ID}" class="report-content" aria-live="polite"></div>
    `;

    panel.appendChild(section);
  }

  return section.querySelector(`#${CONTAINER_ID}`);
}

function showSection(visible) {

  const section = document.getElementById(SECTION_ID);

  if (section) {
    section.hidden = !visible;
  }
}


// ============================================================
// CLEAR FIELD REPORT
// ============================================================
//
// Safe to call at any time, even before the first report.
//

export function clearFieldReport() {

  reportGuard.cancel();

  const section = document.getElementById(SECTION_ID);

  if (section) {
    section.hidden = true;
    section.querySelector(`#${CONTAINER_ID}`)?.replaceChildren();
  }
}


// ============================================================
// LOAD FIELD REPORT
// ============================================================
//
// `attributes` are the clicked feature's attributes.
//

export async function loadFieldReport(attributes) {

  const container = getContainer();

  if (!container) {
    return;
  }

  const isCurrent = reportGuard.next();

  showSection(true);

  // --- Which table? ---------------------------------------

  const tableUrl = getTableUrl();

  if (!isConfiguredUrl(tableUrl)) {

    container.innerHTML = `
      <div class="empty-state">
        The field statistics table is not configured yet.
        Set <code>tableUrl</code> in
        <code>src/fieldReports/fieldReportConfig.js</code>.
      </div>
    `;

    return;
  }

  // --- Which field? ---------------------------------------

  const fieldId = resolveFieldId(attributes);

  if (fieldId === null) {

    container.innerHTML = `
      <div class="empty-state">
        Could not find the field ID on this feature. Set
        <code>idAttribute</code> in
        <code>fieldReportConfig.js</code> to one of its attributes:
        ${escapeHtml(Object.keys(attributes ?? {}).join(", "))}
      </div>
    `;

    return;
  }

  // --- Load + render --------------------------------------

  container.innerHTML = `
    <div class="report-loading">
      <div class="report-loading-spinner"></div>
      <div>Loading field report...</div>
    </div>
  `;

  try {

    const records = await getFieldStatistics(tableUrl, fieldId);

    if (!isCurrent()) {
      return;
    }

    renderFieldReport(container, fieldId, records);

  } catch (error) {

  console.error("Field report failed:", error);

  if (isCurrent()) {
    container.innerHTML = `
      <div class="report-error">
        Could not load the field report.
        <br>
        <small>${escapeHtml(error?.message ?? String(error))}</small>
      </div>
    `;
  }
}
}


// ============================================================
// FIND TABLE + FIELD ID
// ============================================================

function getTableUrl() {

  const stateName = appState.selectedState?.name;

  return (
    CONFIG.tableUrlByState?.[stateName] ??
    CONFIG.tableUrl
  );
}

/** The config id (from config.js) of the active field layer. */
function getActiveLayerId() {

  for (const [id, layer] of appState.fieldLayers) {

    if (layer === appState.activeFieldLayer) {
      return id;
    }
  }

  return null;
}

function resolveFieldId(attributes) {

  if (!attributes) {
    return null;
  }

  const wanted = (
    CONFIG.idAttribute[getActiveLayerId()] ??
    CONFIG.idAttribute.default
  ).toLowerCase();

  const key = Object.keys(attributes).find(
    (name) => name.toLowerCase() === wanted
  );

  const value = key ? attributes[key] : null;

  return value === null || value === undefined || value === ""
    ? null
    : String(value);
}


// ============================================================
// RENDER REPORT
// ============================================================

function renderFieldReport(container, fieldId, records) {

  const header = `
    <div class="report-header">
      <h3 class="report-county">${escapeHtml(fieldId)}</h3>
      <div class="report-id">Field ID</div>
    </div>
  `;

  if (records.length === 0) {

    container.innerHTML = `
      ${header}
      <div class="empty-state">
        No statistics are available for this field.
      </div>
    `;

    return;
  }

  // --- Periods --------------------------------------------

  const periods = sortPeriods([...new Set(records.map((r) => r.PERIOD))]);

  if (!periods.includes(currentPeriod)) {
    currentPeriod = pickDefaultPeriod(periods);
  }

  const periodControl =
    periods.length > 1
      ? `
        <label for="fieldReportPeriod">Time scale</label>
        <select id="fieldReportPeriod">
          ${periods.map((p) => `
            <option value="${escapeHtml(p)}"
              ${p === currentPeriod ? "selected" : ""}>
              ${escapeHtml(capitalize(p) || "Unspecified")}
            </option>
          `).join("")}
        </select>
      `
      : "";

  container.innerHTML = `
    ${header}
    ${periodControl}
    <div id="fieldReportCharts"></div>
  `;

  const chartsContainer = container.querySelector("#fieldReportCharts");

  const draw = () => renderCharts(chartsContainer, records, currentPeriod);

  container.querySelector("#fieldReportPeriod")?.addEventListener(
    "change",
    (event) => {
      currentPeriod = event.target.value;
      draw();
    }
  );

  draw();
}


// ============================================================
// CHARTS
// ============================================================

function renderCharts(container, records, period) {

  container.replaceChildren();

  // Only records for the chosen period, grouped by variable.
  const byVariable = new Map();

  for (const record of records) {

    if (record.PERIOD !== period || !record.VARIABLE) {
      continue;
    }

    if (!byVariable.has(record.VARIABLE)) {
      byVariable.set(record.VARIABLE, []);
    }

    byVariable.get(record.VARIABLE).push(record);
  }

  const specs = buildChartSpecs(byVariable, period);

  if (specs.length === 0) {

    container.innerHTML = `
      <div class="empty-state">
        No data for this time scale.
      </div>
    `;

    return;
  }

  for (const spec of specs) {

    // The wrapper must be in the page before drawing: the chart
    // sizes itself to its container's width.
    const section = document.createElement("div");
    section.className = "report-section";

    const target = document.createElement("div");
    target.className = "report-chart";

    section.appendChild(target);
    container.appendChild(section);

    createLineChart(target, spec);
  }
}

/**
 * Decides which charts to draw: one per group in
 * CONFIG.groups (when any of its variables exist) and one per
 * remaining variable.
 */
function buildChartSpecs(byVariable, period) {

  const periodLabel = capitalize(period);

  const specs = [];
  const used = new Set();

  // --- Combined charts ------------------------------------

  for (const group of CONFIG.groups) {

    const series = group.series
      .filter((s) => byVariable.has(s.variable))
      .map((s) => ({
        name: s.name,
        color: s.color,
        records: byVariable.get(s.variable),
      }));

    if (series.length === 0) {
      continue;
    }

    group.series.forEach((s) => used.add(s.variable));

    specs.push({
      title: group.title,
      subtitle: joinText(group.subtitle, periodLabel),
      unit: group.unit ?? "",
      showLegend: true,
      series,
    });
  }

  // --- One chart per remaining variable -------------------

  const configured = Object.keys(CONFIG.variables);

  const rank = (name) => {
    const index = configured.indexOf(name);
    return index === -1 ? Infinity : index;
  };

  const remaining = [...byVariable.keys()]
    .filter((name) => !used.has(name))
    .sort((a, b) => rank(a) - rank(b) || a.localeCompare(b));

  remaining.forEach((name, index) => {

    const info = CONFIG.variables[name];
    const label = info?.label ?? prettify(name);

    specs.push({
      title: label,
      subtitle: joinText(info?.subtitle, periodLabel),
      unit: info?.unit ?? "",
      series: [{
        name: "", // single series: the title already says it
        color:
          info?.color ??
          CONFIG.palette[index % CONFIG.palette.length],
        records: byVariable.get(name),
      }],
    });
  });

  return specs;
}


// ============================================================
// SMALL HELPERS
// ============================================================

function sortPeriods(periods) {

  const rank = (p) => {
    const index = CONFIG.preferredPeriods.indexOf(p);
    return index === -1 ? Infinity : index;
  };

  return periods.sort((a, b) => rank(a) - rank(b) || a.localeCompare(b));
}

function pickDefaultPeriod(sortedPeriods) {

  return (
    CONFIG.preferredPeriods.find((p) => sortedPeriods.includes(p)) ??
    sortedPeriods[0]
  );
}

function capitalize(text) {

  return text ? text.charAt(0).toUpperCase() + text.slice(1) : "";
}

/** "mean_temp" -> "Mean Temp" */
function prettify(name) {

  return name
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function joinText(...parts) {

  return parts.filter(Boolean).join(" · ");
}
