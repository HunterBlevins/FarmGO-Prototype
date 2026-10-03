import { getCountyClimateData } from "./reportData.js";
import { createTimeSeriesChart, createTemperatureChart } from "./reportCharts.js";
import { escapeHtml, createLatestGuard } from "../utils.js";


// ============================================================
// REPORT CONTAINER
// ============================================================

const getContainer = () => document.getElementById("countyReport");

// Only the most recently requested county may update the panel.
const reportGuard = createLatestGuard();


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

    const climate = await getCountyClimateData(countyId);

    if (!isCurrent()) {
      return;
    }

    renderCountyReport(container, { countyId, countyName, stateName, climate });

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


// ============================================================
// RENDER COUNTY REPORT
// ============================================================

function renderCountyReport(container, { countyId, countyName, stateName, climate }) {

  container.innerHTML = `
    <div class="county-report">

      <div class="report-header">
        <h3 class="report-county">${escapeHtml(countyName)}</h3>
        <div class="report-id">
          ${stateName ? `${escapeHtml(stateName)} · ` : ""}GEOID ${escapeHtml(countyId)}
        </div>
      </div>

      <div class="report-section">
        <div id="countyPrecipitationChart" class="report-chart"></div>
      </div>

      <div class="report-section">
        <div id="countyTemperatureChart" class="report-chart"></div>
      </div>

      <div class="report-section">
        <div id="countyDewPointChart" class="report-chart"></div>
      </div>

    </div>
  `;

  createTimeSeriesChart(
    container.querySelector("#countyPrecipitationChart"),
    climate.ppt,
    {
      title: "Precipitation",
      yAxisLabel: "Precipitation",
    }
  );

  createTemperatureChart(
    container.querySelector("#countyTemperatureChart"),
    climate
  );

  createTimeSeriesChart(
    container.querySelector("#countyDewPointChart"),
    climate.tdmean,
    {
      title: "Dew Point",
      yAxisLabel: "Mean dew point",
      valueSuffix: "°",
    }
  );
}
