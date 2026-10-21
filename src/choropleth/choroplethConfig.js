// ============================================================
// CHOROPLETH CONFIGURATION (fields and counties)
// ============================================================
//
// Table URL, column names, variable labels and the field-ID
// attribute are shared with the field reports and are read
// from  src/fieldReports/fieldReportConfig.js.
//

export const CHOROPLETH_CONFIG = {

  // ----------------------------------------------------------
  // COUNTY FILTER
  // ----------------------------------------------------------
  //
  // Fields are selected by an exact match on a county column,
  // in both the statistics table and the field boundary layer.
  // (Index the column in both for speed.)
  //
  // The same attribute filters the field layers themselves: once
  // a county is chosen, only that county's fields are offered
  // and drawn.
  //

  // Column in the statistics table.
  countyIdColumn: "COUNTY_ID",

  // Attribute on the field boundary layer.
  countyIdAttribute: "COUNTY_ID",

  // The value to look for, given the county chosen in the
  // dropdown (its GEOID, e.g. "48221"). Change this if your
  // COUNTY_ID values are formatted differently.
  countyIdValue: ({ countyId }) => String(countyId).slice(-3),


  // ----------------------------------------------------------
  // WHAT IS MAPPED
  // ----------------------------------------------------------
  //
  // Only these time scales are offered. Each date is shown as its
  // change from the historical norm for the same time of year,
  // which comes from the table's "historical <period>" rows
  // (e.g. "historical monthly"; see fieldReportConfig.js,
  // historicalPrefix). A variable without historical rows for the
  // period cannot be mapped, so it is not offered.
  //

  periods: ["monthly"],


  // ----------------------------------------------------------
  // COUNTIES
  // ----------------------------------------------------------
  //
  // "Visualize counties" shades every county of the chosen state
  // from the county statistics table (config.js, reports).
  //

  county: {

    // Column names in the county statistics table.
    columns: {
      id:       "GEOID",
      start:    "START",
      period:   "PERIOD",
      variable: "VARIABLE",
      value:    "VALUE",
    },

    // Simplifies county outlines (map units, metres on the default
    // basemap). Counties are large, so this can be generous.
    maxAllowableOffset: 250,
  },


  // ----------------------------------------------------------
  // COLOURS
  // ----------------------------------------------------------
  //
  // Red = below the historical norm, green = above it. The scale
  // is symmetric around "no change".
  //

  // Low -> normal -> high. Colours are blended between these.
  divergingRamp: [
    "#a50026", "#d73027", "#f46d43", "#fdae61", "#fee08b",
    "#ffffbf",
    "#d9ef8b", "#a6d96a", "#66bd63", "#1a9850", "#006837",
  ],

  // Distinct colours used across the scale (shared symbols keep
  // drawing fast). Odd, so "no change" has a colour of its own.
  colorSteps: 21,

  // How far from the norm the scale reaches full red / full green,
  // in the variable's own units (°F, in, ...). Variables not listed
  // use the 95th percentile of what is on screen, rounded to a tidy
  // number, so one extreme field cannot wash out the rest. Setting
  // a value keeps the colours comparable from date to date:
  //
  //   changeRange: { tmean: 10, ppt: 2 },
  //
  // Keys are VARIABLE values in lower case.
  changeRange: {},

  // Fields / counties with no value or no norm for the chosen date.
  noDataColor: [150, 150, 150, 0.35],

  outlineColor: [255, 255, 255, 0.5],
  outlineWidth: 0.0,

  // 0 = invisible, 1 = solid.
  opacity: 0.9,


  // ----------------------------------------------------------
  // PERFORMANCE
  // ----------------------------------------------------------

  // Sort the one-date values query by object id? Sorting makes
  // paging fully reliable but can be much slower on a big
  // table. Leave false unless the "with data" count changes
  // when you move the date slider away and back.
  sortValuesQuery: false,

  // Simplifies field outlines (in map units, i.e. metres on
  // the default basemap). Bigger = faster, rougher shapes.
  maxAllowableOffset: 15,

  // Safety cap on the number of field shapes drawn.
  maxFeatures: 20000,

  // Shapes requested per page. The server may return fewer.
  shapePageSize: 2000,
};