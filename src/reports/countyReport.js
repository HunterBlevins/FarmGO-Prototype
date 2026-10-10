import { getCountyStatistics } from "./reportData.js";
import { renderComparisonReport, createReportUiState } from "./reportView.js";
import { escapeHtml, createLatestGuard } from "../utils.js";


// ============================================================
// REPORT CONTAINER
// ============================================================

const getContainer = () => document.getElementById("countyReport");

// Only the most recently requested county may update the panel.
const reportGuard = createLatestGuard();

// This report's own tab / time scale / open charts. Kept apart
// from the field report's, so each can be set independently.
const ui = createReportUiState();


// ============================================================
// CLEAR COUNTY REPORT
// ============================================================

export function clearCountyReport() {

  reportGuard.cancel();

  const container = getContainer();

  if (container) {
    container.innerHTML = `
      <div class="empty-state">
        Select a county to view its report.
      </div>
    `;
  }
}


// ============================================================
// LOAD COUNTY REPORT
// ============================================================

export async function loadCountyReport(countyId, countyName, stateName) {

  const container = getContainer();

  if (!container) {
    console.warn("countyReport container not found.");
    return;
  }

  const isCurrent = reportGuard.next();

  container.innerHTML = `
    <div class="report-loading">
      <div class="report-loading-spinner"></div>
      <div>Loading county report...</div>
    </div>
  `;

  try {

    const records = await getCountyStatistics(countyId);

    if (!isCurrent()) {
      return;
    }

    const headerHtml = `
      <div class="report-header">
        <h3 class="report-county">${escapeHtml(countyName)}</h3>
        <div class="report-id">
          ${stateName ? `${escapeHtml(stateName)} · ` : ""}GEOID ${escapeHtml(countyId)}
        </div>
      </div>
    `;

    renderComparisonReport(container, { headerHtml, records, ui });

  } catch (error) {

    console.error("County report failed:", error);

    if (isCurrent()) {
      container.innerHTML = `
        <div class="report-error">
          Could not load the county report. Please try again.
        </div>
      `;
    }
  }
}
