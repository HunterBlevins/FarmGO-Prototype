// ============================================================
// GET COUNTY REPORT CONTAINER
// ============================================================

function getReportContainer() {

  return document.getElementById(
    "countyReport"
  );

}


// ============================================================
// SHOW LOADING
// ============================================================

export function showReportLoading() {

  const container =
    getReportContainer();


  if (!container) {

    console.warn(
      "County report container not found."
    );

    return;

  }


  container.innerHTML = `

    <div class="report-loading">

      <div class="report-loading-text">
        Loading county report...
      </div>

    </div>

  `;

}


// ============================================================
// SHOW ERROR
// ============================================================

export function showReportError(
  message
) {

  const container =
    getReportContainer();


  if (!container) {
    return;
  }


  container.innerHTML = `

    <div class="report-error">

      <div class="report-error-title">
        Report Error
      </div>

      <div class="report-error-message">
        ${message}
      </div>

    </div>

  `;

}


// ============================================================
// RENDER COUNTY REPORT
// ============================================================

export function renderCountyReport(
  geoid,
  statistics
) {

  const container =
    getReportContainer();


  if (!container) {

    console.warn(
      "County report container not found."
    );

    return;

  }


  // ----------------------------------------------------------
  // NO DATA
  // ----------------------------------------------------------

  if (
    !statistics ||
    statistics.length === 0
  ) {

    container.innerHTML = `

      <div class="county-report">

        <div class="report-header">

          <div class="report-label">
            COUNTY REPORT
          </div>

          <h2>
            County ${geoid}
          </h2>

        </div>


        <div class="empty-state">

          No statistics are available
          for this county.

        </div>

      </div>

    `;

    return;

  }


  // ----------------------------------------------------------
  // REPORT
  // ----------------------------------------------------------

  container.innerHTML = `

    <div class="county-report">


      <!-- ================================================ -->
      <!-- HEADER -->
      <!-- ================================================ -->

      <div class="report-header">

        <div>

          <div class="report-label">
            COUNTY REPORT
          </div>

          <h2>
            County ${geoid}
          </h2>

        </div>

      </div>


      <!-- ================================================ -->
      <!-- VARIABLE -->
      <!-- ================================================ -->

      <div class="report-controls">

        <label for="reportVariable">

          Variable

        </label>


        <select id="reportVariable">

          <option value="ppt">
            Precipitation
          </option>

          <option value="tmin">
            Minimum Temperature
          </option>

          <option value="tmax">
            Maximum Temperature
          </option>

          <option value="tmean">
            Mean Temperature
          </option>

          <option value="tdmean">
            Mean Dew Point
          </option>

        </select>

      </div>


      <!-- ================================================ -->
      <!-- STATISTICS -->
      <!-- ================================================ -->

      <div class="report-section">

        <div class="report-section-title">

          Observations

        </div>


        <div class="report-stat-count">

          ${statistics.length.toLocaleString()}

        </div>

      </div>


      <!-- ================================================ -->
      <!-- CHART -->
      <!-- ================================================ -->

      <div
        id="countyTimeSeries"
        class="report-chart"
      >

      </div>


    </div>

  `;

}