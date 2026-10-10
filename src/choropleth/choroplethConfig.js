// ============================================================
// FIELD CHOROPLETH (DEMO) CONFIGURATION
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
  // COLOURS
  // ----------------------------------------------------------

  // Number of colour classes (quantiles: roughly equal numbers
  // of fields per class).
  classes: 5,

  // Light -> dark. Needs at least `classes` colours.
  ramp: ["#ffffcc", "#a1dab4", "#41b6c4", "#2c7fb8", "#253494"],

  // Fields with no value for the chosen variable/date.
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