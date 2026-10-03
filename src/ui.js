import { CONFIG } from "./config.js";
import { escapeHtml } from "./utils.js";


// ============================================================
// CALLBACKS
// ============================================================
//
// main.js hands us the functions to call when the user
// interacts with the page. This keeps ui.js free of any
// knowledge about the map.
//

const handlers = {};


// ============================================================
// SMALL DOM HELPERS
// ============================================================

const byId = (id) => document.getElementById(id);

/** Replace the options of a <select>. Items are { value, label }. */
function fillSelect(id, placeholder, items = []) {

  const select = byId(id);

  if (!select) {
    return;
  }

  const options = [new Option(placeholder, "")];

  for (const item of items) {
    options.push(new Option(item.label, item.value));
  }

  select.replaceChildren(...options);
}

/** Opacity (0-1) <-> transparency percent (0-100). */
const toTransparency = (opacity) => Math.round((1 - opacity) * 100);
const toOpacity = (transparency) => 1 - Number(transparency) / 100;


// ============================================================
// INITIALIZE UI
// ============================================================

export function initializeUI(callbacks = {}) {

  Object.assign(handlers, callbacks);

  // Title / subtitle come from config.js
  // (the logo is set in index.html).
  const title = byId("appTitle");
  const subtitle = byId("appSubtitle");

  if (title) {
    title.textContent = CONFIG.app.title;
  }

  if (subtitle) {
    subtitle.textContent = CONFIG.app.subtitle;
  }

  // Dropdowns
  byId("stateSelect")?.addEventListener("change", (event) =>
    handlers.onStateChange?.(event.target.value)
  );

  byId("countySelect")?.addEventListener("change", (event) =>
    handlers.onCountyChange?.(event.target.value)
  );

  byId("fieldLayerSelect")?.addEventListener("change", (event) =>
    handlers.onFieldLayerChange?.(event.target.value)
  );

  // Field transparency slider
  const fieldSlider = byId("fieldOpacitySlider");

  fieldSlider?.addEventListener("input", () => {
    setFieldOpacityUI(toOpacity(fieldSlider.value));
    handlers.onFieldOpacityChange?.(toOpacity(fieldSlider.value));
  });

  // Clear selected field
  byId("clearFieldButton")?.addEventListener("click", () =>
    handlers.onClearFieldSelection?.()
  );

  initializeRasterListEvents();
}


// ============================================================
// STATE + COUNTY DROPDOWNS
// ============================================================

export function populateStateDropdown(
  states,
  placeholder = "Select a state..."
) {

  fillSelect(
    "stateSelect",
    placeholder,
    states.map((state) => ({ value: state.name, label: state.name }))
  );
}

export function populateCountyDropdown(counties) {

  fillSelect(
    "countySelect",
    "Select a county...",
    counties.map((county) => ({ value: county.id, label: county.name }))
  );
}

export function setCountyEnabled(enabled) {

  const select = byId("countySelect");

  if (select) {
    select.disabled = !enabled;
  }
}


// ============================================================
// RASTER LIST
// ============================================================
//
// Each raster has its own checkbox and transparency slider.
// Multiple rasters can be visible at once.
//
// Events are handled once on the list container (event
// delegation), so re-rendering the list never leaks listeners.
//

function initializeRasterListEvents() {

  const container = byId("rasterList");

  if (!container) {
    return;
  }

  container.addEventListener("change", (event) => {

    const checkbox = event.target.closest(".raster-visibility");

    if (!checkbox) {
      return;
    }

    const rasterId = checkbox.closest(".raster-option")?.dataset.rasterId;

    handlers.onRasterChange?.(rasterId, checkbox.checked);
  });

  container.addEventListener("input", (event) => {

    const slider = event.target.closest(".raster-opacity-slider");

    if (!slider) {
      return;
    }

    const wrapper = slider.closest(".raster-option");
    const label = wrapper.querySelector(".raster-transparency-value");

    if (label) {
      label.textContent = `${slider.value}%`;
    }

    handlers.onRasterOpacityChange?.(
      wrapper.dataset.rasterId,
      toOpacity(slider.value)
    );
  });
}

export function renderRasterList(rasters) {

  const container = byId("rasterList");

  if (!container) {
    return;
  }

  if (!rasters || rasters.length === 0) {

    container.innerHTML = `
      <div class="empty-state">
        No raster datasets are configured for this state.
      </div>
    `;

    return;
  }

  container.innerHTML = rasters.map((raster) => {

    const transparency = toTransparency(
      raster.opacity ?? CONFIG.defaults.rasterOpacity
    );

    const id = escapeHtml(raster.id);

    return `
      <div class="raster-option" data-raster-id="${id}">

        <label class="layer-option">

          <input type="checkbox" class="raster-visibility" />

          <span class="layer-option-text">
            <strong>${escapeHtml(raster.title)}</strong>
            ${raster.description
              ? `<small>${escapeHtml(raster.description)}</small>`
              : ""}
          </span>

        </label>

        <div class="raster-opacity">

          <div class="opacity-header">
            <span>Transparency</span>
            <span class="raster-transparency-value">${transparency}%</span>
          </div>

          <input
            type="range"
            class="opacity-slider raster-opacity-slider"
            aria-label="${escapeHtml(raster.title)} transparency"
            min="0"
            max="100"
            step="1"
            value="${transparency}"
          />

          <div class="opacity-labels">
            <span>Opaque</span>
            <span>Transparent</span>
          </div>

        </div>

      </div>
    `;

  }).join("");
}

export function clearRasterList() {

  const container = byId("rasterList");

  if (container) {
    container.innerHTML = `
      <div class="empty-state">
        Select a state to view available datasets.
      </div>
    `;
  }
}

/**
 * A raster service failed to load: switch its checkbox off, disable it
 * and say so, instead of leaving a control that silently does nothing.
 */
export function markRasterUnavailable(rasterId) {

  const wrapper = byId("rasterList")?.querySelector(
    `.raster-option[data-raster-id="${CSS.escape(rasterId)}"]`
  );

  if (!wrapper) {
    return;
  }

  wrapper.classList.add("unavailable");

  const checkbox = wrapper.querySelector(".raster-visibility");

  if (checkbox) {
    checkbox.checked = false;
    checkbox.disabled = true;
  }

  const text = wrapper.querySelector(".layer-option-text");

  if (text && !text.querySelector(".unavailable-note")) {
    text.insertAdjacentHTML(
      "beforeend",
      `<small class="unavailable-note">Could not load this dataset.</small>`
    );
  }

  wrapper.querySelector(".raster-opacity-slider")?.setAttribute("disabled", "");
}


// ============================================================
// LEGEND
// ============================================================
//
// `layerInfos` is an array of { layer, title } for the visible
// rasters. An empty array shows the placeholder message.
//

export function setLegend(layerInfos) {

  const legend = byId("legend");
  const empty = byId("legendEmpty");

  if (!legend || !empty) {
    return;
  }

  const hasLayers = layerInfos.length > 0;

  if (hasLayers) {
    legend.layerInfos = layerInfos;
  }

  legend.hidden = !hasLayers;
  empty.hidden = hasLayers;
}


// ============================================================
// FIELD LAYER DROPDOWN + OPACITY
// ============================================================

/** Pass an empty array to reset the dropdown. */
export function renderFieldLayerList(fields) {

  fillSelect(
    "fieldLayerSelect",
    "Select a field layer...",
    (fields ?? []).map((field) => ({ value: field.id, label: field.title }))
  );
}

export function setFieldOpacityUI(opacity) {

  const slider = byId("fieldOpacitySlider");
  const label = byId("fieldTransparencyValue");

  const transparency = toTransparency(opacity);

  if (slider) {
    slider.value = transparency;
  }

  if (label) {
    label.textContent = `${transparency}%`;
  }
}


// ============================================================
// FIELD ATTRIBUTES
// ============================================================

export function renderFieldAttributes(attributes) {

  const container = byId("fieldAttributes");

  if (!container) {
    return;
  }

  if (!attributes) {

    container.innerHTML = `
      <div class="empty-state">
        Click a field on the map to view its attributes.
      </div>
    `;

    return;
  }

  container.innerHTML = Object.entries(attributes).map(
    ([name, value]) => `
      <div class="attribute-row">
        <div class="attribute-name">${escapeHtml(name)}</div>
        <div class="attribute-value">${escapeHtml(formatValue(value))}</div>
      </div>
    `
  ).join("");
}

function formatValue(value) {

  if (value === null || value === undefined || value === "") {
    return "—";
  }

  return typeof value === "object"
    ? JSON.stringify(value)
    : String(value);
}
