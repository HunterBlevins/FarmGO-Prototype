import { appState } from "../state.js";
import { setActiveFieldLayerVisible } from "../fields.js";

import {
  getStatisticsTableUrl,
  getCountyOptions,
  getCountyFieldShapes,
  getFieldValues,
  getFieldNorms,
} from "./choroplethData.js";

import {
  isCountyTableConfigured,
  getStateCountyOptions,
  getStateCountyShapes,
  getStateCountyValues,
  getStateCountyNorms,
} from "./countyChoroplethData.js";


// ============================================================
// WHAT CAN BE VISUALIZED
// ============================================================
//
// The panel (choropleth.js) draws one of these at a time. Each
// "source" says what it needs, where its data comes from, and what
// happens on the map when it starts and stops, so the panel itself
// does not care whether it is shading fields or counties.
//
//   id, noun         "fields" / "counties" (layer key, wording)
//   buttonId         the button that turns it on and off
//   hintId           where "Select a county to use this." goes
//   label            the button text while it is off
//
//   unavailableHint()          why it cannot start now ("" = it can)
//   scope()                    the thing the data is limited to:
//                              a county id (fields) or state id (counties)
//   keepsOnContextChange(scope)  stays on when the county / state / field
//                              layer selection changes?
//
//   getOptions(scope)          Map< variable -> Map< period -> { times, historicalPeriod } > >
//   getShapes(scope)           { shapes, truncated }
//   getValues(scope, choice)   Map< id -> value >
//   getNorms(scope, choice)    Map< id -> historical value >
//
//   onDrawn() / onCleared() / onReleased()   optional map hooks
//
// `choice` is { variable, period, historicalPeriod, time }.
//

const byId = (id) => document.getElementById(id);


// ------------------------------------------------------------
// FIELDS  (one county's fields, from the chosen field layer)
// ------------------------------------------------------------
//
// While the shaded fields are drawn, the field layer's own
// boundaries are hidden: only one of the two is on the map.
//

export const FIELD_SOURCE = {

  id: "fields",
  noun: "fields",
  buttonId: "visualizeButton",
  hintId: "visualizeFieldsHint",
  label: "Visualize fields",

  idHint: "Check that FIELD_ID values match the map layer's IDs.",

  noOptionsMessage:
    "No monthly statistics with a historical norm were found " +
    "for fields in this county.",

  unavailableHint() {

    if (!getStatisticsTableUrl()) {
      return "The field statistics table is not configured " +
        "(see fieldReportConfig.js).";
    }

    if (!appState.selectedCounty) {
      return "Select a county to use this.";
    }

    if (!appState.activeFieldLayer) {
      return "Choose a field layer to use this.";
    }

    return "";
  },

  scope: () => appState.selectedCounty?.id ?? "",

  // The shaded fields belong to one county + one field layer: any
  // change drops them (the field code has already put the right
  // layer back on the map).
  keepsOnContextChange: () => false,

  getOptions: (countyId) => getCountyOptions(countyId),

  getShapes: (countyId) => getCountyFieldShapes(countyId),

  getValues: (countyId, { variable, period, time }) =>
    getFieldValues({ countyId, variable, period, time }),

  getNorms: (countyId, { variable, historicalPeriod, time }) =>
    getFieldNorms({ countyId, variable, historicalPeriod, time }),

  onDrawn() {

    // First draw: swap the field boundaries for the shaded fields.
    if (!appState.visualizing) {
      appState.visualizing = true;
      setActiveFieldLayerVisible(false);
    }
  },

  onCleared() {
    appState.visualizing = false;
  },

  // The user switched it off: the field boundaries come back.
  onReleased() {
    setActiveFieldLayerVisible(true);
  },
};


// ------------------------------------------------------------
// COUNTIES  (every county of the chosen state)
// ------------------------------------------------------------
//
// Drawn underneath everything else, so nothing needs hiding. It
// stays on while the county or field layer changes, and goes when
// the state does.
//

export const COUNTY_SOURCE = {

  id: "counties",
  noun: "counties",
  buttonId: "visualizeCountiesButton",
  hintId: "visualizeCountiesHint",
  label: "Visualize counties",

  idHint: "Check that GEOID values match the county layer's IDs.",

  noOptionsMessage:
    "No monthly statistics with a historical norm were found " +
    "for counties in this state.",

  unavailableHint() {

    if (!isCountyTableConfigured()) {
      return "The county statistics table is not configured (see config.js).";
    }

    if (!appState.selectedState) {
      return "Select a state to use this.";
    }

    return "";
  },

  scope: () => String(appState.selectedState?.id ?? ""),

  keepsOnContextChange: (stateId) =>
    String(appState.selectedState?.id ?? "") === stateId,

  getOptions: (stateId) => getStateCountyOptions(stateId),

  getShapes: (stateId) => getStateCountyShapes(stateId),

  getValues: (stateId, { variable, period, time }) =>
    getStateCountyValues({ stateId, variable, period, time }),

  getNorms: (stateId, { variable, historicalPeriod, time }) =>
    getStateCountyNorms({ stateId, variable, historicalPeriod, time }),
};

export const SOURCES = [FIELD_SOURCE, COUNTY_SOURCE];

/** The button, and the hint under it, of a source (null if not in the page). */
export function getSourceElements(source) {

  return { button: byId(source.buttonId), hint: byId(source.hintId) };
}
