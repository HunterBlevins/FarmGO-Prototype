import "./choropleth.css";

import { escapeHtml, createLatestGuard } from "../utils.js";
import { CHOROPLETH_CONFIG as CONFIG } from "./choroplethConfig.js";

import {
  describeVariable,
  sortVariables,
  sortPeriods,
  capitalize,
} from "../reports/variables.js";

import {
  drawChoropleth,
  clearChoropleth,
  setChoroplethOpacity,
} from "./choroplethRenderer.js";

import {
  computeChanges,
  buildScale,
  legendHtml,
} from "./choroplethScale.js";

import { SOURCES, getSourceElements } from "./choroplethSources.js";
import { onFieldContextChange } from "../fields.js";


// ============================================================
// VISUALIZE BY VARIABLES
// ============================================================
//
// Under the Field Layer dropdown there is one button per thing
// that can be shaded:
//
//   Visualize fields     the chosen county's fields
//   Visualize counties   every county of the chosen state
//
// Turning one on shows the variable, time scale and date slider;
// turning it off (or turning the other on) goes back. Only one is
// ever on. What each one needs and where its data comes from is
// described in choroplethSources.js.
//
// Each shape is coloured by how far the chosen date is from the
// historical norm for the same time of year: red below, green above
// (see choroplethScale.js).
//

const BUTTON_LABEL_ACTIVE = "Stop visualizing";

const state = {
  source: null,    // the source that is on, or null
  scope: "",       // its county / state id
  options: null,   // Map< variable -> Map< period -> { times, historicalPeriod } > >
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

  const buttons = SOURCES.map((source) => getSourceElements(source).button);

  if (buttons.some((button) => !button)) {
    console.warn("A visualize button was not found; visualization disabled.");
    return;
  }

  for (const source of SOURCES) {

    getSourceElements(source).button.addEventListener("click", () =>
      state.source === source ? turnOff() : turnOn(source)
    );
  }

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

  // The state, county or field layer changed. Whatever is on may
  // no longer apply (the field code has already put the right
  // layer back on the map).
  onFieldContextChange(() => {

    if (state.source && !state.source.keepsOnContextChange(state.scope)) {
      deactivate();
    }

    refreshAvailability();
  });

  refreshAvailability();
}


// ============================================================
// AVAILABILITY
// ============================================================

function refreshAvailability() {

  for (const source of SOURCES) {

    const { button, hint } = getSourceElements(source);

    if (!button || state.source === source) {
      continue;
    }

    const message = source.unavailableHint();

    button.disabled = Boolean(message);

    if (hint) {
      hint.textContent = message;
    }
  }

  if (!state.source) {
    setStatus("");
  }
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

async function turnOn(source) {

  // Switching from one to the other.
  if (state.source) {
    turnOff();
  }

  if (source.unavailableHint()) {
    return refreshAvailability();
  }

  const scope = source.scope();

  state.source = source;
  state.scope = scope;

  const { button, hint } = getSourceElements(source);

  button.textContent = BUTTON_LABEL_ACTIVE;
  button.setAttribute("aria-pressed", "true");

  if (hint) {
    hint.textContent = "";
  }

  byId("visualizeControls").hidden = true;
  setStatus("Loading available variables…");

  const isCurrent = guard.next();

  try {

    const options = await source.getOptions(scope);

    if (!isCurrent()) {
      return;
    }

    if (!options) {
      return abort(source.noOptionsMessage);
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

/** The user switched it off: the map goes back to how it was. */
function turnOff() {

  const source = state.source;

  deactivate();

  source?.onReleased?.();

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
 * Removes the shading and resets the controls. Does NOT put back
 * what the visualization replaced: whoever calls this decides what
 * is drawn next.
 */
function deactivate() {

  guard.cancel();

  const source = state.source;

  state.source = null;
  state.scope = "";
  state.options = null;

  if (source) {

    const { button } = getSourceElements(source);

    button.textContent = source.label;
    button.setAttribute("aria-pressed", "false");

    clearChoropleth(source.id);
    source.onCleared?.();
  }

  const controls = byId("visualizeControls");

  if (controls) {
    controls.hidden = true;
  }

  byId("visualizeLegend")?.replaceChildren();
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

  state.times = state.options.get(state.variable).get(period).times;

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

  const { source, scope } = state;

  if (!source) {
    return;
  }

  const isCurrent = guard.next();

  const { variable, period } = state;
  const time = state.times[state.timeIndex];
  const { historicalPeriod } = state.options.get(variable).get(period);

  const choice = { variable, period, historicalPeriod, time };

  setStatus(`Loading ${source.noun}…`);

  try {

    // Shapes and norms are cached (per scope / per month of the
    // year), so moving the date slider mostly re-queries one
    // number per field or county.
    const [{ shapes, truncated }, values, norms] = await Promise.all([
      source.getShapes(scope),
      source.getValues(scope, choice),
      source.getNorms(scope, choice),
    ]);

    if (!isCurrent() || state.source !== source) {
      return;
    }

    const changes = computeChanges(values, norms);
    const scale = buildScale(changes, variable);

    const { matched, total } = drawChoropleth(source.id, shapes, changes, scale);

    // The one transparency slider controls whatever is drawn.
    setChoroplethOpacity(currentOpacity());

    source.onDrawn?.();

    byId("visualizeLegend").innerHTML = legendHtml(scale, {
      unit: describeVariable(variable).unit,
      normLabel: `${monthName(time)} norm`,
    });

    setStatus(statusMessage({ source, shapes, total, matched, norms, truncated }));

  } catch (error) {

    console.error("Visualization failed:", error);

    if (isCurrent()) {
      setStatus(`Could not visualize the ${source.noun}: ${error.message}`, true);
    }
  }
}

function statusMessage({ source, total, matched, norms, truncated }) {

  if (total === 0) {
    return `No ${source.noun} shapes were found.`;
  }

  let message = `${total.toLocaleString()} ${source.noun}, ${matched.toLocaleString()} with data.`;

  if (truncated) {
    message += ` Showing the first ${CONFIG.maxFeatures.toLocaleString()} only.`;
  }

  if (matched === 0) {
    message += norms.size === 0
      ? " No historical norm was found for this variable and month."
      : ` ${source.idHint}`;
  }

  return message;
}

/** The transparency slider's setting as an opacity (0 - 1). */
function currentOpacity() {

  const slider = byId("fieldOpacitySlider");

  return slider ? 1 - Number(slider.value) / 100 : CONFIG.opacity;
}


// ============================================================
// FORMATTING
// ============================================================

/** Dates are stored in UTC; show them as stored. Monthly: "Mar 2026". */
function formatDate(ms) {

  const monthly = state.period.trim().toLowerCase() === "monthly";

  return new Date(ms).toLocaleDateString("en-US", {
    month: "short",
    ...(monthly ? {} : { day: "numeric" }),
    year: "numeric",
    timeZone: "UTC",
  });
}

function monthName(ms) {

  return new Date(ms).toLocaleDateString("en-US", {
    month: "long",
    timeZone: "UTC",
  });
}
