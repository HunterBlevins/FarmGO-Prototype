import { appState } from "../state.js";
import { escapeHtml, createLatestGuard, isConfiguredUrl } from "../utils.js";
import { renderComparisonReport, createReportUiState } from "../reports/reportView.js";

import { FIELD_REPORT_CONFIG as CONFIG } from "./fieldReportConfig.js";
import { getFieldStatistics } from "./fieldReportData.js";


// ============================================================
// PANEL SECTION
// ============================================================
//
// The section lives in index.html (right panel, under the county
// report) and is only shown while a field is selected.
//

const SECTION_ID = "fieldReportSection";
const CONTAINER_ID = "fieldReport";

// Only the most recently clicked field may update the panel.
const reportGuard = createLatestGuard();

// This report's own tab / time scale / open charts. Kept apart
// from the county report's, so each can be set independently.
const ui = createReportUiState();


function getContainer() {

  const container = document.getElementById(CONTAINER_ID);

  if (!container) {
    console.warn("fieldReport container not found; field report cannot be shown.");
  }

  return container;
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

  showSection(false);

  document.getElementById(CONTAINER_ID)?.replaceChildren();
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

    const headerHtml = `
      <div class="report-header">
        <h3 class="report-county">${escapeHtml(fieldId)}</h3>
        <div class="report-id">Field ID</div>
      </div>
    `;

    renderComparisonReport(container, { headerHtml, records, ui });

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
