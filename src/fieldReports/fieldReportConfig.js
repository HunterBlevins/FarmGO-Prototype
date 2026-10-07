// ============================================================
// FIELD REPORT CONFIGURATION
// ============================================================
//
// Everything you are likely to edit for field reports lives
// here, so config.js does not need to change.
//

export const FIELD_REPORT_CONFIG = {

  // ----------------------------------------------------------
  // FIELD STATISTICS TABLE
  // ----------------------------------------------------------
  //
  // URL of the table (it ends in /FeatureServer/<number>).
  // Leave the "YOUR-" prefix until you have the real URL.
  //

  tableUrl:
    "https://services3.arcgis.com/0OPQIK59PJJqLK0A/arcgis/rest/services/FieldStatistics/FeatureServer",

  // Optional: use a different table for particular states.
  // Keys are state names exactly as they appear in the state
  // dropdown, e.g.  { Texas: "https://.../FeatureServer/3" }

  tableUrlByState: {},


  // ----------------------------------------------------------
  // COLUMN NAMES IN THE TABLE
  // ----------------------------------------------------------
  //
  // Change these if the service names them differently
  // (for example the county table uses END_ rather than END;
  // the end date is not needed for the charts, so it is not
  // requested).
  //

  columns: {
    fieldId:  "FIELD_ID",
    start:    "START",
    period:   "PERIOD",
    variable: "VARIABLE",
    value:    "VALUE",
  },


  // ----------------------------------------------------------
  // WHICH ATTRIBUTE ON THE MAP FEATURE HOLDS THE FIELD ID
  // ----------------------------------------------------------
  //
  // When a field is clicked, this attribute's value is looked
  // up in the table's FIELD_ID column. Matching ignores case.
  // Add an entry per field layer id from config.js if layers
  // use different attribute names, e.g.
  //   "tx-field-boundaries": "field_id"
  //

  idAttribute: {
    default: "FIELD_ID",
  },


  // ----------------------------------------------------------
  // PERIODS
  // ----------------------------------------------------------
  //
  // A chart never mixes periods (daily + weekly on one line
  // would be misleading). If the field has more than one
  // period a dropdown appears; the first of these that exists
  // is selected by default. Compared in lower case.
  //

  preferredPeriods: ["weekly", "monthly", "daily"],


  // ----------------------------------------------------------
  // VARIABLE LABELS
  // ----------------------------------------------------------
  //
  // Keys are VARIABLE values in lower case. Any variable that
  // is NOT listed still gets a chart, using its raw name made
  // readable, so new variables show up automatically.
  //
  // unit is appended directly after each number, so include a
  // leading space if you want one (" mm").
  //
  // Order here = order of the charts.
  //

  variables: {
    ppt:    { label: "Precipitation", unit: "" },
    tdmean: { label: "Dew Point",     subtitle: "Mean dew point", unit: "°" },
  },


  // ----------------------------------------------------------
  // COMBINED CHARTS
  // ----------------------------------------------------------
  //
  // Variables listed together are drawn on ONE chart with a
  // legend (like the county temperature chart). A group is
  // used only if at least one of its variables exists for the
  // field. Remove or edit these to match your VARIABLE values.
  //

  groups: [
    {
      title: "Temperature",
      subtitle: "Minimum, mean, and maximum temperature",
      unit: "°",
      series: [
        { variable: "tmin",  name: "Minimum", color: "#2563eb" },
        { variable: "tmean", name: "Mean",    color: "#f59e0b" },
        { variable: "tmax",  name: "Maximum", color: "#dc2626" },
      ],
    },
  ],


  // Colours for variables that are not in `groups`.
  palette: [
    "#2563eb", "#059669", "#7c3aed", "#db2777",
    "#0891b2", "#ca8a04", "#4b5563",
  ],
};
