import "./choropleth.css";

import { appState } from "../state.js";
import { escapeHtml, createLatestGuard } from "../utils.js";
import { FIELD_REPORT_CONFIG as TABLE } from "../fieldReports/fieldReportConfig.js";
import { CHOROPLETH_CONFIG as CONFIG } from "./choroplethConfig.js";

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


// ============================================================
// FIELD CHOROPLETH (DEMO)
// ============================================================
//
// Adds a "Field Choropleth" section to the left panel. With a
// county and a field layer selected, the toggle shades every
// field in that county by one variable on one date.
//


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

  if (!buildSection()) {
    return;
  }

  byId("choroplethToggle").addEventListener("change", (event) =>
    event.target.checked ? turnOn() : turnOff()
  );

  byId("choroplethVariable").addEventListener("change", (event) =>
    selectVariable(event.target.value)
  );

  byId("choroplethPeriod").addEventListener("change", (event) =>
    selectPeriod(event.target.value)
  );

  const dateSlider = byId("choroplethDate");

  // Moving the slider only updates the label; the map is
  // redrawn when the slider is released.
  dateSlider.addEventListener("input", () => {
    state.timeIndex = Number(dateSlider.value);
    updateDateLabel();
  });

  dateSlider.addEventListener("change", render);

  const opacitySlider = byId("choroplethOpacity");

  opacitySlider.addEventListener("input", () => {
    byId("choroplethTransparencyValue").textContent = `${opacitySlider.value}%`;
    setChoroplethOpacity(1 - Number(opacitySlider.value) / 100);
  });

  // The choropleth belongs to one county + one field layer, so
  // it switches off whenever one of these dropdowns changes.
  // (These listeners are added after the app's own, so the
  // app has already updated its state when they run.)
  for (const id of ["stateSelect", "countySelect", "fieldLayerSelect"]) {
    byId(id)?.addEventListener("change", () => {
      turnOff();
      refreshAvailability();
    });
  }

  refreshAvailability();
}

function buildSection() {

  const panel = byId("leftPanel");

  if (!panel) {
    console.warn("leftPanel not found; choropleth demo disabled.");
    return false;
  }

  const initialTransparency = Math.round((1 - CONFIG.opacity) * 100);

  const section = document.createElement("section");

  section.id = "choroplethSection";
  section.className = "panel-section";

  section.innerHTML = `
    <h2>Field Choropleth <span class="choropleth-tag">demo</span></h2>

    <label class="choropleth-toggle">
      <input type="checkbox" id="choroplethToggle" disabled />
      <span>
        <strong>Color fields by value</strong>
        <small>
          Shades every field in the selected county by one
          variable on one date.
        </small>
      </span>
    </label>

    <div id="choroplethStatus" class="empty-state" role="status"></div>

    <div id="choroplethControls" hidden>

      <label for="choroplethVariable">Variable</label>
      <select id="choroplethVariable"></select>

      <div id="choroplethPeriodRow">
        <label for="choroplethPeriod">Time scale</label>
        <select id="choroplethPeriod"></select>
      </div>

      <div class="opacity-header">
        <span>Date</span>
        <span id="choroplethDateLabel"></span>
      </div>
      <input
        type="range"
        id="choroplethDate"
        class="opacity-slider"
        aria-label="Date"
        min="0" max="0" step="1" value="0"
      />
      <div class="opacity-labels">
        <span id="choroplethDateMin"></span>
        <span id="choroplethDateMax"></span>
      </div>

      <div class="opacity-header choropleth-gap">
        <span>Transparency</span>
        <span id="choroplethTransparencyValue">${initialTransparency}%</span>
      </div>
      <input
        type="range"
        id="choroplethOpacity"
        class="opacity-slider"
        aria-label="Choropleth transparency"
        min="0" max="100" step="1"
        value="${initialTransparency}"
      />

      <div id="choroplethLegend" class="choropleth-legend"></div>

    </div>
  `;

  panel.appendChild(section);

  return true;
}


// ============================================================
// AVAILABILITY
// ============================================================

const getCountyId = () => byId("countySelect")?.value ?? "";

function refreshAvailability() {

  const toggle = byId("choroplethToggle");

  if (!toggle || state.enabled) {
    return;
  }

  let hint = "";

  if (!getCountyId()) {
    hint = "Select a county to use this.";
  } else if (!appState.activeFieldLayer) {
    hint = "Choose a field layer to use this.";
  }

  toggle.disabled = Boolean(hint);

  setStatus(hint);
}

function setStatus(message, isError = false) {

  const status = byId("choroplethStatus");

  if (status) {
    status.textContent = message;
    status.classList.toggle("error", isError);
  }
}


// ============================================================
// TURN ON / OFF
// ============================================================

async function turnOn() {

  const countyId = getCountyId();

  if (!countyId || !appState.activeFieldLayer) {
    return abort("");
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

  byId("choroplethControls").hidden = true;
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

    byId("choroplethControls").hidden = false;

    populateVariables();

  } catch (error) {

    console.error("Choropleth setup failed:", error);

    if (isCurrent()) {
      abort(`Could not load the variables: ${error.message}`, true);
    }
  }
}

/** Switch the feature off and leave a message. */
function abort(message, isError = false) {

  turnOff();
  refreshAvailability();

  if (message) {
    setStatus(message, isError);
  }
}

function turnOff() {

  guard.cancel();

  state.enabled = false;
  state.options = null;

  const toggle = byId("choroplethToggle");

  if (toggle) {
    toggle.checked = false;
  }

  const controls = byId("choroplethControls");

  if (controls) {
    controls.hidden = true;
  }

  const legend = byId("choroplethLegend");

  if (legend) {
    legend.replaceChildren();
  }

  clearChoropleth();
}


// ============================================================
// VARIABLE / PERIOD / DATE SELECTION
// ============================================================

function populateVariables() {

  const select = byId("choroplethVariable");

  const variables = [...state.options.keys()].sort((a, b) =>
    describeVariable(a).label.localeCompare(describeVariable(b).label)
  );

  select.innerHTML = variables.map((variable) => `
    <option value="${escapeHtml(variable)}">
      ${escapeHtml(describeVariable(variable).label)}
    </option>
  `).join("");

  selectVariable(variables[0]);
}

function selectVariable(variable) {

  state.variable = variable;

  byId("choroplethVariable").value = variable;

  // Time scales available for this variable, preferred first.
  const periods = [...state.options.get(variable).keys()].sort(
    (a, b) => periodRank(a) - periodRank(b) || a.localeCompare(b)
  );

  byId("choroplethPeriod").innerHTML = periods.map((period) => `
    <option value="${escapeHtml(period)}">
      ${escapeHtml(capitalize(period) || "Unspecified")}
    </option>
  `).join("");

  byId("choroplethPeriodRow").hidden = periods.length < 2;

  selectPeriod(periods[0]);
}

function selectPeriod(period) {

  state.period = period;

  byId("choroplethPeriod").value = period;

  state.times = state.options.get(state.variable).get(period);

  // Start on the most recent date.
  state.timeIndex = state.times.length - 1;

  const slider = byId("choroplethDate");

  slider.max = String(state.times.length - 1);
  slider.value = String(state.timeIndex);
  slider.disabled = state.times.length < 2;

  byId("choroplethDateMin").textContent = formatDate(state.times[0]);
  byId("choroplethDateMax").textContent = formatDate(state.times.at(-1));

  updateDateLabel();

  render();
}

function updateDateLabel() {

  byId("choroplethDateLabel").textContent = formatDate(
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

    byId("choroplethLegend").innerHTML = legendHtml(
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

    console.error("Choropleth failed:", error);

    if (isCurrent()) {
      setStatus(`Could not build the choropleth: ${error.message}`, true);
    }
  }
}


// ============================================================
// LABELS
// ============================================================
//
// Reuses the labels and units from fieldReportConfig.js.
//

function describeVariable(raw) {

  const key = String(raw).trim().toLowerCase();

  const info = TABLE.variables[key];

  if (info) {
    return { label: info.label, unit: info.unit ?? "" };
  }

  for (const group of TABLE.groups) {

    const series = group.series.find((s) => s.variable === key);

    if (series) {
      return {
        label: `${group.title} (${series.name})`,
        unit: group.unit ?? "",
      };
    }
  }

  return { label: prettify(String(raw)), unit: "" };
}

function periodRank(period) {

  const index = TABLE.preferredPeriods.indexOf(String(period).toLowerCase());

  return index === -1 ? Infinity : index;
}

function capitalize(text) {

  return text ? text.charAt(0).toUpperCase() + text.slice(1) : "";
}

function prettify(name) {

  return name
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

/** Dates are stored in UTC; show them as stored. */
function formatDate(ms) {

  return new Date(ms).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}
