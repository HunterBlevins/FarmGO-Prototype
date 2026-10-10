import "./choropleth.css";

import { appState } from "../state.js";
import { escapeHtml, createLatestGuard } from "../utils.js";
import { CHOROPLETH_CONFIG as CONFIG } from "./choroplethConfig.js";

import {
  describeVariable,
  sortVariables,
  sortPeriods,
  capitalize,
} from "../reports/variables.js";

import {
  getStatisticsTableUrl,
  getCountyOptions,
  getCountyFieldShapes,
  getFieldValues,
} from "./choroplethData.js";

import {
  drawChoropleth,
  clearChoropleth,
  setChoroplethOpacity,
  legendHtml,
} from "./choroplethRenderer.js";

import {
  onFieldContextChange,
  setActiveFieldLayerVisible,
} from "../fields.js";


// ============================================================
// VISUALIZE BY VARIABLES
// ============================================================
//
// The "Visualize by variables" button sits under the Field Layer
// dropdown. Clicking it swaps the field boundaries for the same
// fields shaded by one variable on one date, and shows the
// variable, time scale and date slider. Clicking it again goes
// back to the boundaries.
//
// Only one of the two is ever on the map: the field layer is
// hidden when the shaded fields appear and shown again when they
// go.
//

const BUTTON_LABEL = "Visualize by variables";
const BUTTON_LABEL_ACTIVE = "Stop visualizing";

const state = {
  enabled: false,
  countyId: "",
  options: null,   // Map< variable -> Map< period -> times[] > >
  variable: "",
  period: "",
  times: [],
  timeIndex: 0,
};

// Only the most recent request may update the map and panel.
const guard = createLatestGuard();

const byId = (id) => document.getElementById(id);


// ============================================================
// INITIALIZE
// ============================================================

export function initializeChoropleth() {

  const button = byId("visualizeButton");

  if (!button) {
    console.warn("visualizeButton not found; visualization disabled.");
    return;
  }

  button.addEventListener("click", () =>
    state.enabled ? turnOff() : turnOn()
  );

  byId("visualizeVariable").addEventListener("change", (event) =>
    selectVariable(event.target.value)
  );

  byId("visualizePeriod").addEventListener("change", (event) =>
    selectPeriod(event.target.value)
  );

  const dateSlider = byId("visualizeDate");

  // Moving the slider only updates the label; the map is
  // redrawn when the slider is released.
  dateSlider.addEventListener("input", () => {
    state.timeIndex = Number(dateSlider.value);
    updateDateLabel();
  });

  dateSlider.addEventListener("change", render);

  // The shaded fields belong to one county + one field layer.
  // When either changes, drop them (the field code has already
  // put the right layer back on the map).
  onFieldContextChange(() => {
    deactivate();
    refreshAvailability();
  });

  refreshAvailability();
}


// ============================================================
// AVAILABILITY
// ============================================================

function refreshAvailability() {

  const button = byId("visualizeButton");

  if (!button || state.enabled) {
    return;
  }

  let hint = "";

  if (!appState.selectedCounty) {
    hint = "Select a county to use this.";
  } else if (!appState.activeFieldLayer) {
    hint = "Choose a field layer to use this.";
  }

  button.disabled = Boolean(hint);

  setStatus(hint);
}

function setStatus(message, isError = false) {

  const status = byId("visualizeStatus");

  if (status) {
    status.textContent = message;
    status.classList.toggle("error", isError);
  }
}


// ============================================================
// TURN ON / OFF
// ============================================================

async function turnOn() {

  const countyId = appState.selectedCounty?.id;

  if (!countyId || !appState.activeFieldLayer) {
    return;
  }

  if (!getStatisticsTableUrl()) {
    return abort(
      "The field statistics table is not configured " +
      "(see fieldReportConfig.js).",
      true
    );
  }

  state.enabled = true;
  state.countyId = countyId;

  const button = byId("visualizeButton");

  button.textContent = BUTTON_LABEL_ACTIVE;
  button.setAttribute("aria-pressed", "true");

  byId("visualizeControls").hidden = true;
  setStatus("Loading available variables…");

  const isCurrent = guard.next();

  try {

    const options = await getCountyOptions(countyId);

    if (!isCurrent()) {
      return;
    }

    if (!options) {
      return abort("No statistics were found for fields in this county.");
    }

    state.options = options;

    byId("visualizeControls").hidden = false;

    populateVariables();

  } catch (error) {

    console.error("Visualization setup failed:", error);

    if (isCurrent()) {
      abort(`Could not load the variables: ${error.message}`, true);
    }
  }
}

/** The user switched it off: the field boundaries come back. */
function turnOff() {

  deactivate();

  setActiveFieldLayerVisible(true);

  refreshAvailability();
}

/** Switch it off and leave a message. */
function abort(message, isError = false) {

  turnOff();

  if (message) {
    setStatus(message, isError);
  }
}

/**
 * Removes the shaded fields and resets the controls. Does NOT touch
 * the field layer: whoever calls this decides what is drawn next.
 */
function deactivate() {

  guard.cancel();

  state.enabled = false;
  state.options = null;

  appState.visualizing = false;

  const button = byId("visualizeButton");

  if (button) {
    button.textContent = BUTTON_LABEL;
    button.setAttribute("aria-pressed", "false");
  }

  const controls = byId("visualizeControls");

  if (controls) {
    controls.hidden = true;
  }

  byId("visualizeLegend")?.replaceChildren();

  clearChoropleth();
}


// ============================================================
// VARIABLE / PERIOD / DATE SELECTION
// ============================================================

function populateVariables() {

  const select = byId("visualizeVariable");

  // Same order as the reports.
  const variables = sortVariables([...state.options.keys()]);

  select.innerHTML = variables.map((variable) => `
    <option value="${escapeHtml(variable)}">
      ${escapeHtml(describeVariable(variable).label)}
    </option>
  `).join("");

  selectVariable(variables[0]);
}

function selectVariable(variable) {

  state.variable = variable;

  byId("visualizeVariable").value = variable;

  // Time scales available for this variable, preferred first.
  const periods = sortPeriods([...state.options.get(variable).keys()]);

  byId("visualizePeriod").innerHTML = periods.map((period) => `
    <option value="${escapeHtml(period)}">
      ${escapeHtml(capitalize(period) || "Unspecified")}
    </option>
  `).join("");

  byId("visualizePeriodRow").hidden = periods.length < 2;

  selectPeriod(periods[0]);
}

function selectPeriod(period) {

  state.period = period;

  byId("visualizePeriod").value = period;

  state.times = state.options.get(state.variable).get(period);

  // Start on the most recent date.
  state.timeIndex = state.times.length - 1;

  const slider = byId("visualizeDate");

  slider.max = String(state.times.length - 1);
  slider.value = String(state.timeIndex);
  slider.disabled = state.times.length < 2;

  byId("visualizeDateMin").textContent = formatDate(state.times[0]);
  byId("visualizeDateMax").textContent = formatDate(state.times.at(-1));

  updateDateLabel();

  render();
}

function updateDateLabel() {

  byId("visualizeDateLabel").textContent = formatDate(
    state.times[state.timeIndex]
  );
}


// ============================================================
// RENDER
// ============================================================

async function render() {

  if (!state.enabled) {
    return;
  }

  const isCurrent = guard.next();

  const { countyId, variable, period } = state;
  const time = state.times[state.timeIndex];

  setStatus("Loading fields…");

  try {

    // Shapes are cached per county, so moving the date slider
    // only re-queries the values.
    const [{ shapes, truncated }, values] = await Promise.all([
      getCountyFieldShapes(countyId),
      getFieldValues({ countyId, variable, period, time }),
    ]);

    if (!isCurrent() || !state.enabled) {
      return;
    }

    const { scheme, matched, total } = drawChoropleth(shapes, values);

    // The one transparency slider controls whatever is drawn.
    setChoroplethOpacity(appState.activeFieldLayer?.opacity ?? CONFIG.opacity);

    if (!appState.visualizing) {

      // First draw: swap the field boundaries for the shaded
      // fields, so only one of them is on the map.
      appState.visualizing = true;
      setActiveFieldLayerVisible(false);
    }

    byId("visualizeLegend").innerHTML = legendHtml(
      scheme,
      describeVariable(variable).unit
    );

    let message = `${total.toLocaleString()} fields, ${matched.toLocaleString()} with data.`;

    if (truncated) {
      message += ` Showing the first ${CONFIG.maxFeatures.toLocaleString()} only.`;
    }

    if (total === 0) {
      message = "No field shapes were found for this county.";
    } else if (matched === 0) {
      message += " Check that FIELD_ID values match the map layer's IDs.";
    }

    setStatus(message);

  } catch (error) {

    console.error("Visualization failed:", error);

    if (isCurrent()) {
      setStatus(`Could not visualize the fields: ${error.message}`, true);
    }
  }
}


// ============================================================
// FORMATTING
// ============================================================

/** Dates are stored in UTC; show them as stored. */
function formatDate(ms) {

  return new Date(ms).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}
