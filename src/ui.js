import { CONFIG } from "./config.js";


// ============================================================
// CALLBACKS
// ============================================================

let rasterChangeHandler = null;

let rasterOpacityChangeHandler = null;

let fieldLayerChangeHandler = null;

let fieldOpacityChangeHandler = null;

let clearFieldSelectionHandler = null;

let stateChangeHandler = null;

let countyChangeHandler = null;


// ============================================================
// INITIALIZE UI
// ============================================================

export function initializeUI({
  onStateChange,
  onCountyChange,
  onRasterChange,
  onRasterOpacityChange,
  onFieldLayerChange,
  onFieldOpacityChange,
  onClearFieldSelection,
} = {}) {

  stateChangeHandler =
    onStateChange;

  countyChangeHandler =
    onCountyChange;

  rasterChangeHandler =
    onRasterChange;

  rasterOpacityChangeHandler =
    onRasterOpacityChange;

  clearFieldSelectionHandler =
    onClearFieldSelection;

  fieldLayerChangeHandler =
    onFieldLayerChange;

  fieldOpacityChangeHandler =
    onFieldOpacityChange;


  // ----------------------------------------------------------
  // APP TITLE
  // ----------------------------------------------------------

  const title =
    document.getElementById(
      "appTitle"
    );

  if (title) {

    title.textContent =
      CONFIG.app.title;
  }


  const subtitle =
    document.getElementById(
      "appSubtitle"
    );

  if (subtitle) {

    subtitle.textContent =
      CONFIG.app.subtitle;
  }


  const logo =
    document.getElementById(
      "logo"
    );

  if (logo) {

    logo.src =
      CONFIG.app.logo;
  }


  // ----------------------------------------------------------
  // STATE DROPDOWN
  // ----------------------------------------------------------

  const stateSelect =
    document.getElementById(
      "stateSelect"
    );

  if (stateSelect) {

    stateSelect.addEventListener(
      "change",
      async (event) => {

        if (stateChangeHandler) {

          await stateChangeHandler(
            event.target.value
          );
        }
      }
    );
  }


  // ----------------------------------------------------------
  // COUNTY DROPDOWN
  // ----------------------------------------------------------

  const countySelect =
    document.getElementById(
      "countySelect"
    );

  if (countySelect) {

    countySelect.addEventListener(
      "change",
      async (event) => {

        if (countyChangeHandler) {

          await countyChangeHandler(
            event.target.value
          );
        }
      }
    );
  }


  // ----------------------------------------------------------
  // FIELD LAYER DROPDOWN
  // ----------------------------------------------------------

  const fieldSelect =
    document.getElementById(
      "fieldLayerSelect"
    );

  if (fieldSelect) {

    fieldSelect.addEventListener(
      "change",
      (event) => {

        if (fieldLayerChangeHandler) {

          fieldLayerChangeHandler(
            event.target.value
          );
        }
      }
    );
  }


  // ----------------------------------------------------------
  // FIELD TRANSPARENCY SLIDER
  // ----------------------------------------------------------

  const fieldOpacitySlider =
    document.getElementById(
      "fieldOpacitySlider"
    );

  const fieldTransparencyValue =
    document.getElementById(
      "fieldTransparencyValue"
    );


  if (fieldOpacitySlider) {

    fieldOpacitySlider.addEventListener(
      "input",
      () => {

        const transparency =
          Number(
            fieldOpacitySlider.value
          );


        if (fieldTransparencyValue) {

          fieldTransparencyValue.textContent =
            `${transparency}%`;
        }


        // Convert transparency
        // to ArcGIS opacity.

        const opacity =
          1 -
          (
            transparency / 100
          );


        if (
          fieldOpacityChangeHandler
        ) {

          fieldOpacityChangeHandler(
            opacity
          );
        }
      }
    );
  }


  // ----------------------------------------------------------
  // CLEAR FIELD BUTTON
  // ----------------------------------------------------------

  const clearFieldButton =
    document.getElementById(
      "clearFieldButton"
    );

  if (clearFieldButton) {

    clearFieldButton.addEventListener(
      "click",
      () => {

        if (clearFieldSelectionHandler) {

          clearFieldSelectionHandler();

        } else {

          renderFieldAttributes(
            null
          );
        }
      }
    );
  }


  // ----------------------------------------------------------
  // LEFT PANEL RESIZE
  // ----------------------------------------------------------

  initializeLeftPanelResize();
}


// ============================================================
// STATE DROPDOWN
// ============================================================

export function populateStateDropdown(
  states
) {

  const select =
    document.getElementById(
      "stateSelect"
    );

  if (!select) {
    return;
  }


  select.innerHTML = `
    <option value="">
      Select a state...
    </option>
  `;


  for (
    const state
    of states
  ) {

    const option =
      document.createElement(
        "option"
      );

    option.value =
      state.name;

    option.textContent =
      state.name;


    if (
      state.id !== undefined
    ) {

      option.dataset.stateId =
        state.id;
    }


    select.appendChild(
      option
    );
  }
}


// ============================================================
// COUNTY DROPDOWN
// ============================================================

export function populateCountyDropdown(
  counties
) {

  const select =
    document.getElementById(
      "countySelect"
    );

  if (!select) {
    return;
  }


  select.innerHTML = `
    <option value="">
      Select a county...
    </option>
  `;


  for (
    const county
    of counties
  ) {

    const option =
      document.createElement(
        "option"
      );

    option.value =
      county.id;

    option.textContent =
      county.name;


    select.appendChild(
      option
    );
  }
}


// ============================================================
// COUNTY DROPDOWN ENABLE / DISABLE
// ============================================================

export function setCountyEnabled(
  enabled
) {

  const select =
    document.getElementById(
      "countySelect"
    );

  if (!select) {
    return;
  }


  select.disabled =
    !enabled;
}


// ============================================================
// RASTER LIST
// ============================================================
//
// Each raster is independently controlled.
//
// Checkbox:
//   Turns that raster on/off.
//
// Transparency slider:
//   Controls only that raster.
//
// Multiple rasters can be visible at once.
// ============================================================

export function renderRasterList(
  rasters
) {

  const container =
    document.getElementById(
      "rasterList"
    );

  if (!container) {
    return;
  }


  container.innerHTML =
    "";


  if (
    !rasters ||
    rasters.length === 0
  ) {

    container.innerHTML = `
      <div class="empty-state">
        No raster datasets are configured for this state.
      </div>
    `;

    return;
  }


  // ----------------------------------------------------------
  // CREATE EACH RASTER
  // ----------------------------------------------------------

  for (
    const raster
    of rasters
  ) {

    const wrapper =
      document.createElement(
        "div"
      );


    wrapper.className =
      "raster-option";


    // --------------------------------------------------------
    // STARTING OPACITY
    // --------------------------------------------------------

    const startingOpacity =
      raster.opacity !== undefined
        ? raster.opacity
        : 0.85;


    const startingTransparency =
      Math.round(
        (1 - startingOpacity) * 100
      );


    // --------------------------------------------------------
    // RASTER HTML
    // --------------------------------------------------------

    wrapper.innerHTML = `

      <div class="raster-header">

        <label class="layer-option">

          <input
            type="checkbox"
            class="raster-visibility"
            value="${escapeHtml(
              raster.id
            )}"
          />

          <span class="layer-option-text">

            <strong>
              ${escapeHtml(
                raster.title
              )}
            </strong>

            ${
              raster.description
                ? `
                  <small>
                    ${escapeHtml(
                      raster.description
                    )}
                  </small>
                `
                : ""
            }

          </span>

        </label>

      </div>


      <div class="raster-opacity">

        <div class="opacity-header">

          <span>
            Transparency
          </span>

          <span
            class="raster-transparency-value"
          >
            ${startingTransparency}%
          </span>

        </div>


        <input
          type="range"
          class="opacity-slider raster-opacity-slider"
          min="0"
          max="100"
          step="1"
          value="${startingTransparency}"
        />


        <div class="opacity-labels">

          <span>
            Opaque
          </span>

          <span>
            Transparent
          </span>

        </div>

      </div>

    `;


    // --------------------------------------------------------
    // VISIBILITY CHECKBOX
    // --------------------------------------------------------

    const checkbox =
      wrapper.querySelector(
        ".raster-visibility"
      );


    if (checkbox) {

      checkbox.addEventListener(
        "change",
        () => {

          if (
            rasterChangeHandler
          ) {

            rasterChangeHandler(
              raster.id,
              checkbox.checked
            );
          }
        }
      );
    }


    // --------------------------------------------------------
    // TRANSPARENCY SLIDER
    // --------------------------------------------------------

    const slider =
      wrapper.querySelector(
        ".raster-opacity-slider"
      );


    const valueLabel =
      wrapper.querySelector(
        ".raster-transparency-value"
      );


    if (slider) {

      slider.addEventListener(
        "input",
        () => {

          const transparency =
            Number(
              slider.value
            );


          if (valueLabel) {

            valueLabel.textContent =
              `${transparency}%`;
          }


          const opacity =
            1 -
            (
              transparency / 100
            );


          if (
            rasterOpacityChangeHandler
          ) {

            rasterOpacityChangeHandler(
              raster.id,
              opacity
            );
          }
        }
      );
    }


    container.appendChild(
      wrapper
    );
  }
}


// ============================================================
// CLEAR RASTER LIST
// ============================================================

export function clearRasterList() {

  const container =
    document.getElementById(
      "rasterList"
    );

  if (!container) {
    return;
  }


  container.innerHTML = `
    <div class="empty-state">
      Select a state to view available datasets.
    </div>
  `;
}


// ============================================================
// RASTER LOADING
// ============================================================

export function setRasterLoading(
  isLoading
) {

  const container =
    document.getElementById(
      "rasterList"
    );

  if (!container) {
    return;
  }


  if (isLoading) {

    container.classList.add(
      "loading"
    );


    let loading =
      container.querySelector(
        ".raster-loading"
      );


    if (!loading) {

      loading =
        document.createElement(
          "div"
        );


      loading.className =
        "raster-loading";


      loading.textContent =
        "Loading raster...";


      container.appendChild(
        loading
      );
    }

  } else {

    container.classList.remove(
      "loading"
    );


    const loading =
      container.querySelector(
        ".raster-loading"
      );


    if (loading) {

      loading.remove();
    }
  }
}


// ============================================================
// FIELD LAYER LIST
// ============================================================
//
// Selecting a state does NOT automatically select
// a field layer.
// ============================================================

export function renderFieldLayerList(
  fields
) {

  const select =
    document.getElementById(
      "fieldLayerSelect"
    );

  if (!select) {
    return;
  }


  select.innerHTML = `
    <option value="">
      Select a field layer...
    </option>
  `;


  if (
    !fields ||
    fields.length === 0
  ) {

    return;
  }


  for (
    const field
    of fields
  ) {

    const option =
      document.createElement(
        "option"
      );


    option.value =
      field.id;


    option.textContent =
      field.title;


    select.appendChild(
      option
    );
  }


  // No field layer is selected automatically.
}


// ============================================================
// CLEAR FIELD LAYERS
// ============================================================

export function clearFieldLayerList() {

  const select =
    document.getElementById(
      "fieldLayerSelect"
    );

  if (!select) {
    return;
  }


  select.innerHTML = `
    <option value="">
      Select a field layer...
    </option>
  `;
}


// ============================================================
// FIELD OPACITY UI
// ============================================================

export function setFieldOpacityUI(
  opacity
) {

  const slider =
    document.getElementById(
      "fieldOpacitySlider"
    );


  const valueLabel =
    document.getElementById(
      "fieldTransparencyValue"
    );


  if (!slider) {
    return;
  }


  const transparency =
    Math.round(
      (1 - opacity) * 100
    );


  slider.value =
    transparency;


  if (valueLabel) {

    valueLabel.textContent =
      `${transparency}%`;
  }
}


// ============================================================
// COUNTY REPORT
// ============================================================

export async function renderCountyReport(
  selection
) {

  const container =
    document.getElementById(
      "countyReport"
    );

  if (!container) {
    return;
  }


  if (!selection) {

    container.innerHTML = `
      <div class="empty-state">
        Select a county to view its weekly report.
      </div>
    `;

    return;
  }


  container.innerHTML = `
    <div class="loading-state">
      Loading county report...
    </div>
  `;


  container.innerHTML = `

    <div class="report-title">
      ${escapeHtml(
        selection.countyName
      )} County
    </div>

    <div class="report-meta">
      ${escapeHtml(
        selection.stateName || ""
      )}
    </div>

    <div class="report-summary">
      Weekly county report will appear here.
    </div>

  `;
}


// ============================================================
// FIELD ATTRIBUTES
// ============================================================

export function renderFieldAttributes(
  attributes
) {

  const container =
    document.getElementById(
      "fieldAttributes"
    );


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


  const entries =
    Object.entries(
      attributes
    );


  container.innerHTML =
    "";


  for (
    const [
      field,
      value,
    ]
    of entries
  ) {

    const row =
      document.createElement(
        "div"
      );


    row.className =
      "attribute-row";


    row.innerHTML = `

      <div class="attribute-name">
        ${escapeHtml(
          field
        )}
      </div>

      <div class="attribute-value">
        ${escapeHtml(
          formatValue(value)
        )}
      </div>

    `;


    container.appendChild(
      row
    );
  }
}


// ============================================================
// FORMAT VALUE
// ============================================================

function formatValue(
  value
) {

  if (
    value === null ||
    value === undefined
  ) {

    return "—";
  }


  if (
    typeof value === "object"
  ) {

    return JSON.stringify(
      value
    );
  }


  return String(
    value
  );
}


// ============================================================
// HTML ESCAPING
// ============================================================

function escapeHtml(
  value
) {

  return String(
    value
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


// ============================================================
// LEFT PANEL RESIZING
// ============================================================

function initializeLeftPanelResize() {

  const panel =
    document.getElementById(
      "leftPanel"
    );


  const handle =
    document.getElementById(
      "leftResizeHandle"
    );


  if (
    !panel ||
    !handle
  ) {

    return;
  }


  let dragging =
    false;


  handle.addEventListener(
    "pointerdown",
    (event) => {

      dragging =
        true;


      handle.setPointerCapture(
        event.pointerId
      );


      document.body.classList.add(
        "resizing"
      );
    }
  );


  handle.addEventListener(
    "pointermove",
    (event) => {

      if (!dragging) {
        return;
      }


      const minimumWidth =
        240;


      const maximumWidth =
        Math.min(
          600,
          window.innerWidth * 0.45
        );


      const width =
        Math.max(
          minimumWidth,
          Math.min(
            maximumWidth,
            event.clientX
          )
        );


      panel.style.width =
        `${width}px`;
    }
  );


  handle.addEventListener(
    "pointerup",
    () => {

      dragging =
        false;


      document.body.classList.remove(
        "resizing"
      );
    }
  );


  handle.addEventListener(
    "pointercancel",
    () => {

      dragging =
        false;


      document.body.classList.remove(
        "resizing"
      );
    }
  );
}