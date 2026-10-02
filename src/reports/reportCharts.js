// ============================================================
// COUNTY REPORT CHARTS
// ============================================================


// ============================================================
// CREATE TIME SERIES CHART
// ============================================================

export function createTimeSeriesChart(
  container,
  data,
  options = {}
) {

  if (!container) {

    console.warn(
      "Chart container not found."
    );

    return;
  }


  // ----------------------------------------------------------
  // OPTIONS
  // ----------------------------------------------------------

  const title =
    options.title ??
    "Time Series";

  const yAxisLabel =
    options.yAxisLabel ??
    "";

  const valueSuffix =
    options.valueSuffix ??
    "";

  const lineClass =
    options.lineClass ??
    "chart-line";

  const pointClass =
    options.pointClass ??
    "chart-point";


  // ----------------------------------------------------------
  // VALIDATE DATA
  // ----------------------------------------------------------

  if (
    !Array.isArray(data) ||
    data.length === 0
  ) {

    container.innerHTML = `

      <div class="report-chart-card">

        <div class="report-chart-title">
          ${escapeHtml(title)}
        </div>

        <div class="report-no-data">
          No data available.
        </div>

      </div>

    `;

    return;
  }


  // ----------------------------------------------------------
  // SORT DATA
  // ----------------------------------------------------------

  const sortedData =
    [...data].sort(
      (a, b) =>
        new Date(a.START) -
        new Date(b.START)
    );


  // ----------------------------------------------------------
  // VALID RECORDS
  // ----------------------------------------------------------

  const validRecords =
    sortedData.filter(
      record =>
        Number.isFinite(
          Number(record.VALUE)
        )
    );


  if (
    validRecords.length === 0
  ) {

    container.innerHTML = `

      <div class="report-chart-card">

        <div class="report-chart-title">
          ${escapeHtml(title)}
        </div>

        <div class="report-no-data">
          No valid data available.
        </div>

      </div>

    `;

    return;
  }


  // ==========================================================
  // CHART SIZE
  // ==========================================================

  const width = 900;

  const height = 420;


  const margin = {

    top: 55,

    right: 35,

    bottom: 70,

    left: 90,

  };


  const chartWidth =
    width -
    margin.left -
    margin.right;


  const chartHeight =
    height -
    margin.top -
    margin.bottom;


  // ==========================================================
  // VALUES
  // ==========================================================

  const values =
    validRecords.map(
      record =>
        Number(record.VALUE)
    );


  let minValue =
    Math.min(...values);


  let maxValue =
    Math.max(...values);


  if (
    minValue === maxValue
  ) {

    minValue -= 1;

    maxValue += 1;

  } else {

    const padding =
      (maxValue - minValue) * 0.12;

    minValue -= padding;

    maxValue += padding;

  }


  // ==========================================================
  // POSITION FUNCTIONS
  // ==========================================================

  function xPosition(
    index
  ) {

    if (
      validRecords.length === 1
    ) {

      return (
        margin.left +
        chartWidth / 2
      );

    }


    return (
      margin.left +
      (
        index /
        (validRecords.length - 1)
      ) *
      chartWidth
    );

  }


  function yPosition(
    value
  ) {

    return (
      margin.top +
      chartHeight -
      (
        (value - minValue) /
        (maxValue - minValue)
      ) *
      chartHeight
    );

  }


  // ==========================================================
  // GRID
  // ==========================================================

  let gridLines = "";

  const gridCount = 5;


  for (
    let i = 0;
    i <= gridCount;
    i++
  ) {

    const value =
      minValue +
      (
        (maxValue - minValue) *
        i /
        gridCount
      );


    const y =
      yPosition(value);


    gridLines += `

      <line
        x1="${margin.left}"
        y1="${y}"
        x2="${margin.left + chartWidth}"
        y2="${y}"
        class="chart-grid-line"
      />

      <text
        x="${margin.left - 16}"
        y="${y + 6}"
        class="chart-axis-label chart-y-label"
        text-anchor="end"
      >
        ${formatNumber(value)}
      </text>

    `;

  }


  // ==========================================================
  // X LABELS
  // ==========================================================

  let xLabels = "";


  const labelStep =
    Math.max(
      1,
      Math.ceil(
        validRecords.length / 6
      )
    );


  validRecords.forEach(
    (record, index) => {

      if (
        index % labelStep !== 0 &&
        index !== validRecords.length - 1
      ) {

        return;

      }


      const x =
        xPosition(index);


      const date =
        formatDate(
          record.START
        );


      xLabels += `

        <text
          x="${x}"
          y="${height - 28}"
          class="chart-axis-label chart-x-label"
          text-anchor="middle"
        >
          ${date}
        </text>

      `;

    }
  );


  // ==========================================================
  // LINE
  // ==========================================================

  const linePoints =
    validRecords
      .map(
        (record, index) => {

          return (

            `${xPosition(index)},` +
            `${yPosition(Number(record.VALUE))}`

          );

        }
      )
      .join(" ");


  // ==========================================================
  // POINTS
  // ==========================================================

  const points =
    validRecords
      .map(
        (record, index) => {

          const x =
            xPosition(index);

          const y =
            yPosition(
              Number(record.VALUE)
            );


          return `

            <circle
              cx="${x}"
              cy="${y}"
              r="7"
              class="${pointClass}"
            >

              <title>
                ${formatDate(record.START)}:
                ${formatNumber(Number(record.VALUE))}
                ${valueSuffix}
              </title>

            </circle>

          `;

        }
      )
      .join("");


  // ==========================================================
  // RENDER
  // ==========================================================

  container.innerHTML = `

    <div class="report-chart-card">


      <div class="report-chart-header">

        <div>

          <div class="report-chart-title">

            ${escapeHtml(title)}

          </div>


          <div class="report-chart-subtitle">

            ${escapeHtml(yAxisLabel)}

          </div>

        </div>

      </div>


      <div class="report-chart-svg-wrapper">

        <svg
          class="report-chart-svg"
          viewBox="0 0 ${width} ${height}"
          preserveAspectRatio="none"
        >

          ${gridLines}


          <line
            x1="${margin.left}"
            y1="${margin.top}"
            x2="${margin.left}"
            y2="${margin.top + chartHeight}"
            class="chart-axis"
          />


          <line
            x1="${margin.left}"
            y1="${margin.top + chartHeight}"
            x2="${margin.left + chartWidth}"
            y2="${margin.top + chartHeight}"
            class="chart-axis"
          />


          <polyline
            points="${linePoints}"
            class="${lineClass}"
            fill="none"
          />


          ${points}


          ${xLabels}

        </svg>

      </div>

    </div>

  `;
}


// ============================================================
// CREATE TEMPERATURE CHART
// ============================================================
//
// Minimum = blue
// Mean    = orange
// Maximum = red
//
// ============================================================

export function createTemperatureChart(
  container,
  climate
) {

  if (!container) {

    console.warn(
      "Temperature chart container not found."
    );

    return;
  }


  const tmin =
    climate?.tmin ?? [];


  const tmean =
    climate?.tmean ?? [];


  const tmax =
    climate?.tmax ?? [];


  // ----------------------------------------------------------
  // VALIDATE
  // ----------------------------------------------------------

  if (
    tmin.length === 0 &&
    tmean.length === 0 &&
    tmax.length === 0
  ) {

    container.innerHTML = `

      <div class="report-chart-card">

        <div class="report-chart-title">
          Temperature
        </div>

        <div class="report-no-data">
          No temperature data available.
        </div>

      </div>

    `;

    return;
  }


  // ==========================================================
  // ALL TEMPERATURE VALUES
  // ==========================================================

  const allValues = [];


  [
    ...tmin,
    ...tmean,
    ...tmax,
  ].forEach(
    record => {

      const value =
        Number(record.VALUE);


      if (
        Number.isFinite(value)
      ) {

        allValues.push(value);

      }

    }
  );


  if (
    allValues.length === 0
  ) {

    container.innerHTML = `

      <div class="report-chart-card">

        <div class="report-chart-title">
          Temperature
        </div>

        <div class="report-no-data">
          No valid temperature data available.
        </div>

      </div>

    `;

    return;
  }


  let minValue =
    Math.min(...allValues);


  let maxValue =
    Math.max(...allValues);


  if (
    minValue === maxValue
  ) {

    minValue -= 1;

    maxValue += 1;

  } else {

    const padding =
      (maxValue - minValue) * 0.12;

    minValue -= padding;

    maxValue += padding;

  }


  // ==========================================================
  // CHART SIZE
  // ==========================================================

  const width = 900;

  const height = 440;


  const margin = {

    top: 65,

    right: 35,

    bottom: 70,

    left: 90,

  };


  const chartWidth =
    width -
    margin.left -
    margin.right;


  const chartHeight =
    height -
    margin.top -
    margin.bottom;


  // ==========================================================
  // BASE DATA
  // ==========================================================

  const baseData =
    tmean.length > 0
      ? tmean
      : (
          tmin.length > 0
            ? tmin
            : tmax
        );


  // ==========================================================
  // POSITION FUNCTIONS
  // ==========================================================

  function xPosition(
    index
  ) {

    if (
      baseData.length === 1
    ) {

      return (
        margin.left +
        chartWidth / 2
      );

    }


    return (
      margin.left +
      (
        index /
        (baseData.length - 1)
      ) *
      chartWidth
    );

  }


  function yPosition(
    value
  ) {

    return (
      margin.top +
      chartHeight -
      (
        (value - minValue) /
        (maxValue - minValue)
      ) *
      chartHeight
    );

  }


  // ==========================================================
  // GRID
  // ==========================================================

  let gridLines = "";


  for (
    let i = 0;
    i <= 5;
    i++
  ) {

    const value =
      minValue +
      (
        (maxValue - minValue) *
        i /
        5
      );


    const y =
      yPosition(value);


    gridLines += `

      <line
        x1="${margin.left}"
        y1="${y}"
        x2="${margin.left + chartWidth}"
        y2="${y}"
        class="chart-grid-line"
      />

      <text
        x="${margin.left - 16}"
        y="${y + 6}"
        class="chart-axis-label chart-y-label"
        text-anchor="end"
      >
        ${formatNumber(value)}°
      </text>

    `;

  }


  // ==========================================================
  // X LABELS
  // ==========================================================

  let xLabels = "";


  const labelStep =
    Math.max(
      1,
      Math.ceil(
        baseData.length / 6
      )
    );


  baseData.forEach(
    (record, index) => {

      if (
        index % labelStep !== 0 &&
        index !== baseData.length - 1
      ) {

        return;

      }


      xLabels += `

        <text
          x="${xPosition(index)}"
          y="${height - 28}"
          class="chart-axis-label chart-x-label"
          text-anchor="middle"
        >
          ${formatDate(record.START)}
        </text>

      `;

    }
  );


  // ==========================================================
  // SERIES
  // ==========================================================

  const series = [

    {
      name:
        "Minimum",

      data:
        tmin,

      lineClass:
        "chart-line-temperature-min",

      pointClass:
        "chart-point-temperature-min",

      color:
        "#2563eb",

    },

    {
      name:
        "Mean",

      data:
        tmean,

      lineClass:
        "chart-line-temperature-mean",

      pointClass:
        "chart-point-temperature-mean",

      color:
        "#f59e0b",

    },

    {
      name:
        "Maximum",

      data:
        tmax,

      lineClass:
        "chart-line-temperature-max",

      pointClass:
        "chart-point-temperature-max",

      color:
        "#dc2626",

    },

  ];


  let lines = "";

  let points = "";


  // ==========================================================
  // CREATE SERIES GRAPHICS
  // ==========================================================

  series.forEach(
    seriesItem => {

      if (
        seriesItem.data.length === 0
      ) {

        return;

      }


      const validSeriesData =
        seriesItem.data.filter(
          record =>
            Number.isFinite(
              Number(record.VALUE)
            )
        );


      if (
        validSeriesData.length === 0
      ) {

        return;

      }


      // ------------------------------------------------------
      // LINE
      // ------------------------------------------------------

      const linePoints =
        validSeriesData
          .map(
            record => {

              const value =
                Number(record.VALUE);


              const originalIndex =
                seriesItem.data.indexOf(
                  record
                );


              return (

                `${xPosition(originalIndex)},` +
                `${yPosition(value)}`

              );

            }
          )
          .join(" ");


      lines += `

        <polyline
          points="${linePoints}"
          class="${seriesItem.lineClass}"
          fill="none"
        />

      `;


      // ------------------------------------------------------
      // POINTS
      // ------------------------------------------------------

      validSeriesData.forEach(
        record => {

          const value =
            Number(record.VALUE);


          const originalIndex =
            seriesItem.data.indexOf(
              record
            );


          const x =
            xPosition(
              originalIndex
            );


          const y =
            yPosition(
              value
            );


          points += `

            <circle
              cx="${x}"
              cy="${y}"
              r="6"
              class="${seriesItem.pointClass}"
            >

              <title>
                ${seriesItem.name}
                —
                ${formatDate(record.START)}:
                ${formatNumber(value)}°
              </title>

            </circle>

          `;

        }
      );

    }
  );


  // ==========================================================
  // RENDER
  // ==========================================================

  container.innerHTML = `

    <div class="report-chart-card">


      <div class="report-chart-header">

        <div>

          <div class="report-chart-title">
            Temperature
          </div>


          <div class="report-chart-subtitle">
            Minimum, mean, and maximum temperature
          </div>

        </div>


        <!-- ================================================
             LEGEND
             ================================================ -->

        <div class="temperature-legend">


          <div class="temperature-legend-item">

            <span
              class="temperature-legend-marker temperature-legend-min"
            ></span>

            <span>
              Minimum
            </span>

          </div>


          <div class="temperature-legend-item">

            <span
              class="temperature-legend-marker temperature-legend-mean"
            ></span>

            <span>
              Mean
            </span>

          </div>


          <div class="temperature-legend-item">

            <span
              class="temperature-legend-marker temperature-legend-max"
            ></span>

            <span>
              Maximum
            </span>

          </div>


        </div>

      </div>


      <!-- ================================================
           CHART
           ================================================ -->

      <div class="report-chart-svg-wrapper">

        <svg
          class="report-chart-svg"
          viewBox="0 0 ${width} ${height}"
          preserveAspectRatio="none"
        >

          ${gridLines}


          <line
            x1="${margin.left}"
            y1="${margin.top}"
            x2="${margin.left}"
            y2="${margin.top + chartHeight}"
            class="chart-axis"
          />


          <line
            x1="${margin.left}"
            y1="${margin.top + chartHeight}"
            x2="${margin.left + chartWidth}"
            y2="${margin.top + chartHeight}"
            class="chart-axis"
          />


          ${lines}


          ${points}


          ${xLabels}

        </svg>

      </div>

    </div>

  `;

}


// ============================================================
// DATE FORMAT
// ============================================================

function formatDate(
  value
) {

  if (!value) {

    return "";

  }


  const date =
    new Date(value);


  if (
    Number.isNaN(
      date.getTime()
    )
  ) {

    return "";

  }


  return date.toLocaleDateString(
    "en-US",
    {

      month:
        "short",

      year:
        "numeric",

    }
  );

}


// ============================================================
// NUMBER FORMAT
// ============================================================

function formatNumber(
  value
) {

  if (
    !Number.isFinite(
      Number(value)
    )
  ) {

    return "";

  }


  return Number(value)
    .toFixed(1);

}


// ============================================================
// HTML ESCAPING
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