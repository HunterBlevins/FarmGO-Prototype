import { getCountyClimateData } from "./reportData.js";

import {
  createTimeSeriesChart,
  createTemperatureChart,
} from "./reportCharts.js";


// ============================================================
// LOAD COUNTY REPORT
// ============================================================

export async function loadCountyReport(
  countyId,
  countyName,
  stateName
) {

  console.log(
    "Loading county report:",
    countyName,
    countyId
  );


  const reportContainer =
    document.getElementById(
      "countyReport"
    );


  if (!reportContainer) {

    console.warn(
      "countyReport container not found."
    );

    return;

  }


  // ----------------------------------------------------------
  // LOADING STATE
  // ----------------------------------------------------------

  reportContainer.innerHTML = `

    <div class="report-loading">

      <div class="report-loading-spinner"></div>

      <div>
        Loading county report...
      </div>

    </div>

  `;


  try {

    // --------------------------------------------------------
    // GET CLIMATE DATA
    // --------------------------------------------------------

    const climate =
      await getCountyClimateData(
        countyId
      );


    console.log(
      "Climate data:",
      climate
    );


    // --------------------------------------------------------
    // RENDER REPORT
    // --------------------------------------------------------

    renderCountyReport(
      reportContainer,
      {
        countyId,
        countyName,
        stateName,
        climate,
      }
    );


  } catch (error) {

    console.error(
      "County report failed:",
      error
    );


    reportContainer.innerHTML = `

      <div class="empty-state">

        Could not load county report.

      </div>

    `;

  }

}


// ============================================================
// OPEN COUNTY REPORT
// ============================================================
//
// Keep this export because reports.js imports it.
//

export async function openCountyReport(
  countyId,
  countyName,
  stateName
) {

  return loadCountyReport(
    countyId,
    countyName,
    stateName
  );

}


// ============================================================
// RENDER COUNTY REPORT
// ============================================================

function renderCountyReport(
  container,
  {
    countyId,
    countyName,
    stateName,
    climate,
  }
) {

  // ----------------------------------------------------------
  // REPORT HTML
  // ----------------------------------------------------------

  container.innerHTML = `

    <div class="county-report">


      <!-- ================================================
           COUNTY HEADER
           ================================================ -->

      <div class="report-header">

        <h3 class="report-county">

          ${escapeHtml(countyName)}

        </h3>


        <div class="report-id">

          GEOID: ${escapeHtml(countyId)}

        </div>

      </div>


      <!-- ================================================
           PRECIPITATION
           ================================================ -->

      <div class="report-section">

        <div
          id="countyPrecipitationChart"
          class="report-chart"
        ></div>

      </div>


      <!-- ================================================
           TEMPERATURE
           ================================================ -->

      <div class="report-section">

        <div
          id="countyTemperatureChart"
          class="report-chart"
        ></div>

      </div>


      <!-- ================================================
           DEW POINT
           ================================================ -->

      <div class="report-section">

        <div
          id="countyDewPointChart"
          class="report-chart"
        ></div>

      </div>


    </div>

  `;


  // ----------------------------------------------------------
  // PRECIPITATION
  // ----------------------------------------------------------

  createTimeSeriesChart(

    document.getElementById(
      "countyPrecipitationChart"
    ),

    climate.ppt,

    {

      title:
        "Precipitation",

      yAxisLabel:
        "Precipitation",

      valueSuffix:
        "",

    }

  );


  // ----------------------------------------------------------
  // TEMPERATURE
  // ----------------------------------------------------------

  createTemperatureChart(

    document.getElementById(
      "countyTemperatureChart"
    ),

    climate

  );


  // ----------------------------------------------------------
  // DEW POINT
  // ----------------------------------------------------------

  createTimeSeriesChart(

    document.getElementById(
      "countyDewPointChart"
    ),

    climate.tdmean,

    {

      title:
        "Dew Point",

      yAxisLabel:
        "Mean dew point",

      valueSuffix:
        "°",

    }

  );


  console.log(
    "County report rendered:",
    {
      countyId,
      countyName,
      climate,
    }
  );

}


// ============================================================
// ESCAPE HTML
// ============================================================

function escapeHtml(
  value
) {

  return String(
    value ?? ""
  )
    .replaceAll(
      "&",
      "&amp;"
    )
    .replaceAll(
      "<",
      "&lt;"
    )
    .replaceAll(
      ">",
      "&gt;"
    )
    .replaceAll(
      '"',
      "&quot;"
    )
    .replaceAll(
      "'",
      "&#039;"
    );

}