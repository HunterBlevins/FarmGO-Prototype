import FeatureLayer from "@arcgis/core/layers/FeatureLayer.js";
import Graphic from "@arcgis/core/Graphic.js";
import SimpleFillSymbol from "@arcgis/core/symbols/SimpleFillSymbol.js";

import { CONFIG } from "./config.js";
import { appState } from "./state.js";
import { clamp, createLatestGuard, isConfiguredUrl } from "./utils.js";
import { countyClause, exactClause } from "./countyFilter.js";
import { CHOROPLETH_CONFIG } from "./choropleth/choroplethConfig.js";
import { FIELD_REPORT_CONFIG as TABLE } from "./fieldReports/fieldReportConfig.js";

import {
  getChoroplethLayer,
  setChoroplethOpacity,
} from "./choropleth/choroplethRenderer.js";

import {
  renderFieldLayerList,
  setFieldLayerEnabled,
  setFieldLayerNote,
  renderFieldAttributes,
  setFieldOpacityUI,
} from "./ui.js";

import { loadFieldReport, clearFieldReport } from "./fieldReports/fieldReport.js";


// ============================================================
// HOW FIELDS REACH THE MAP
// ============================================================
//
//   1. A state is chosen   -> its field layers are created, but
//                             hidden and not offered yet.
//   2. A county is chosen  -> each layer is filtered to that
//                             county (definitionExpression), then
//                             offered in the Field Layer dropdown.
//   3. A layer is chosen   -> that layer is drawn.
//   4. "Visualize by variables" -> the layer is hidden and the
//                             choropleth is drawn in its place.
//
// Only one of the field layer / choropleth is ever on the map.
//

const PLACEHOLDER_NO_COUNTY = "Select a county first...";

// Config entries (id, title, url) of the current state's field layers.
let fieldConfigs = [];

// The selected field is outlined with one extra graphic. (Using the
// layer view's highlight() was very slow on a layer with thousands
// of shapes, i.e. the variable view.)
let selectedFieldHighlight = null;

const selectionSymbol = new SimpleFillSymbol({
  style: "none",
  outline: { color: [0, 255, 255, 1], width: 3 },
});

// Only the most recent click is allowed to finish.
const clickGuard = createLatestGuard();

// Only the most recent county may finish filtering the layers.
const countyGuard = createLatestGuard();

// Called when the county or the field layer changes, so the
// choropleth (which depends on both) can switch itself off.
const contextListeners = new Set();

export function onFieldContextChange(listener) {

  contextListeners.add(listener);
}

function notifyContextChange() {

  for (const listener of contextListeners) {
    listener();
  }
}


// ============================================================
// LOAD FIELDS FOR STATE
// ============================================================

export function loadFieldsForState(stateKey) {

  removeAllFieldLayers();

  fieldConfigs = (CONFIG.states[stateKey]?.fields ?? []).filter(
    (field) => isConfiguredUrl(field.url)
  );

  for (const config of fieldConfigs) {

    const layer = new FeatureLayer({
      url: config.url,
      title: config.title,
      outFields: ["*"], // narrowed below, once the field names are known
      popupEnabled: false,
      visible: false, // nothing turns on automatically
      opacity: config.opacity ?? CONFIG.defaults.fieldOpacity,
    });

    appState.fieldLayers.set(config.id, layer);
    appState.map.add(layer);

    layer.load().then(
      () => useLightOutFields(config.id, layer),
      (error) => {
        console.error(`Field layer failed to load: ${config.title}`, error);
      }
    );
  }

  // The layers are offered once a county has been chosen.
  showNoCountyState();
}

/**
 * Drawing needs geometry only; downloading every attribute of every
 * field in view made the layer slow to appear. Just the id (needed
 * to find a clicked field's report) is requested; a clicked field's
 * full attributes are looked up on demand (fetchFieldAttributes).
 */
function useLightOutFields(configId, layer) {

  const wanted = (TABLE.idAttribute[configId] ?? TABLE.idAttribute.default)
    .toLowerCase();

  const idField = layer.fields.find((f) => f.name.toLowerCase() === wanted);

  // Unknown id column: keep everything so reports still work.
  if (idField) {
    layer.outFields = [idField.name];
  }
}

function showNoCountyState() {

  renderFieldLayerList([], PLACEHOLDER_NO_COUNTY);
  setFieldLayerEnabled(false);
  setFieldLayerNote("");
}


// ============================================================
// COUNTY -> FIELD LAYERS
// ============================================================

/**
 * Filters every field layer to the chosen county, then offers
 * them in the dropdown. Until this finishes no field can be shown.
 */
export async function showFieldsForCounty(countyId) {

  const isCurrent = countyGuard.next();

  resetFieldChoice();

  if (fieldConfigs.length === 0) {
    setFieldLayerNote("No field layers are configured for this state.");
    return;
  }

  setFieldLayerNote("Loading fields…");

  const configs = [...fieldConfigs];

  const ready = await Promise.all(configs.map(async (config) => {

    const layer = appState.fieldLayers.get(config.id);

    try {

      // `fields` (needed to build the filter) exists after load.
      await layer.load();

      layer.definitionExpression = countyClause(
        layer,
        CHOROPLETH_CONFIG.countyIdAttribute,
        countyId,
        "field layer"
      );

      return config;

    } catch (error) {

      console.error(`Could not filter ${config.title} by county:`, error);

      return null;
    }
  }));

  // A different county (or state) was chosen while waiting.
  if (!isCurrent()) {
    return;
  }

  const available = ready.filter(Boolean);

  renderFieldLayerList(available);
  setFieldLayerEnabled(available.length > 0);

  setFieldLayerNote(
    available.length === 0
      ? "Could not load fields for this county. " +
        "Check countyIdAttribute in choroplethConfig.js."
      : ""
  );
}

/** The county was cleared (or changed): no fields until a new one is chosen. */
export function clearFieldCounty() {

  countyGuard.cancel();

  resetFieldChoice();

  // Never leave a layer filtered to a county that is no longer chosen.
  for (const layer of appState.fieldLayers.values()) {
    layer.definitionExpression = null;
  }

  showNoCountyState();
}

/** Deselects the field, hides every field layer and forgets the choice. */
function resetFieldChoice() {

  clearFieldSelection();

  for (const layer of appState.fieldLayers.values()) {
    layer.visible = false;
  }

  appState.activeFieldLayer = null;

  setFieldOpacityUI(CONFIG.defaults.fieldOpacity);

  notifyContextChange();
}


// ============================================================
// SWITCH FIELD LAYER
// ============================================================

export function setActiveFieldLayer(layerId) {

  clearFieldSelection();

  const selectedLayer = layerId
    ? appState.fieldLayers.get(layerId)
    : null;

  if (layerId && !selectedLayer) {
    console.warn("Field layer not found:", layerId);
  }

  // Show only the selected layer (or none).
  for (const layer of appState.fieldLayers.values()) {
    layer.visible = layer === selectedLayer;
  }

  appState.activeFieldLayer = selectedLayer ?? null;

  setFieldOpacityUI(
    selectedLayer ? selectedLayer.opacity : CONFIG.defaults.fieldOpacity
  );

  // A choropleth belongs to one layer: switch it off.
  notifyContextChange();
}

/**
 * Shows or hides the active field layer. Used to swap it with the
 * choropleth. Changing what is drawn deselects the field.
 */
export function setActiveFieldLayerVisible(visible) {

  clearFieldSelection();

  if (appState.activeFieldLayer) {
    appState.activeFieldLayer.visible = Boolean(visible);
  }
}


// ============================================================
// OPACITY
// ============================================================
//
// One transparency slider, for whichever of the field layer /
// choropleth is on the map.
//

export function setActiveFieldOpacity(opacity) {

  const value = clamp(Number(opacity), 0, 1);

  if (appState.activeFieldLayer) {
    appState.activeFieldLayer.opacity = value;
  }

  setChoroplethOpacity(value);
}


// ============================================================
// REMOVE ALL FIELD LAYERS
// ============================================================

export function removeAllFieldLayers() {

  clearFieldSelection();

  for (const layer of appState.fieldLayers.values()) {
    appState.map.remove(layer);
  }

  appState.fieldLayers.clear();
  appState.activeFieldLayer = null;
  fieldConfigs = [];

  showNoCountyState();
  setFieldOpacityUI(CONFIG.defaults.fieldOpacity);

  notifyContextChange();
}


// ============================================================
// FIELD CLICK HANDLING
// ============================================================
//
// A clicked shape only carries the field id (keeps the layers
// light), so the report starts straight away from the id and the
// full attributes are looked up in the field layer alongside it.
//

export function initializeFieldClick() {

  appState.view.on("click", async (event) => {

    const activeLayer = appState.activeFieldLayer;
    const visualizing = appState.visualizing;

    const hitLayer = visualizing ? getChoroplethLayer() : activeLayer;

    if (!activeLayer || !hitLayer) {
      return;
    }

    if (!visualizing && !activeLayer.visible) {
      return;
    }

    const isCurrent = clickGuard.next();

    // True while nothing has changed since the click.
    const stillValid = () =>
      isCurrent() &&
      appState.activeFieldLayer === activeLayer &&
      appState.visualizing === visualizing;

    try {

      const response = await appState.view.hitTest(event, {
        include: hitLayer,
      });

      const result = response.results.find(
        (item) =>
          item.type === "graphic" && item.graphic?.layer === hitLayer
      );

      // Clicking empty map deselects the field.
      if (!result) {
        if (isCurrent()) {
          clearFieldSelection();
        }
        return;
      }

      if (!stillValid()) {
        return;
      }

      const graphic = result.graphic;

      // The field's id is all the report needs, so the report and
      // the attribute lookup start together instead of one after
      // the other.
      const idName = getIdAttributeName(activeLayer);

      const fieldId = visualizing
        ? graphic.attributes.id
        : findAttribute(graphic.attributes, idName);

      const basics = { [idName]: fieldId };

      clearSelectedFieldHighlight();

      appState.selectedField = graphic;
      selectedFieldHighlight = new Graphic({
        geometry: graphic.geometry,
        symbol: selectionSymbol,
      });
      appState.view.graphics.add(selectedFieldHighlight);

      renderFieldAttributes(basics);
      loadFieldReport(basics);

      const attributes = await fetchFieldAttributes(activeLayer, fieldId)
        .catch((error) => {
          console.error("Could not load field attributes:", error);
          return null;
        });

      if (attributes && stillValid()) {
        renderFieldAttributes(attributes);
      }

    } catch (error) {

      console.error("Field click failed:", error);
    }
  });
}

/** The config id (from config.js) of a field layer. */
function getLayerConfigId(layer) {

  for (const [id, candidate] of appState.fieldLayers) {

    if (candidate === layer) {
      return id;
    }
  }

  return null;
}

/** Name of the attribute that holds the field id (see fieldReportConfig.js). */
function getIdAttributeName(layer) {

  return (
    TABLE.idAttribute[getLayerConfigId(layer)] ??
    TABLE.idAttribute.default
  );
}

/** Reads an attribute ignoring upper / lower case in its name. */
function findAttribute(attributes, name) {

  const key = Object.keys(attributes ?? {}).find(
    (candidate) => candidate.toLowerCase() === name.toLowerCase()
  );

  return key ? attributes[key] : null;
}

/** All attributes of one field, found by its id. */
async function fetchFieldAttributes(layer, fieldId) {

  await layer.load();

  const wanted = getIdAttributeName(layer);

  const result = await layer.queryFeatures({
    where: exactClause(layer, wanted, fieldId, "field layer"),
    outFields: ["*"],
    returnGeometry: false,
    num: 1,
  });

  return result.features[0]?.attributes ?? null;
}


// ============================================================
// CLEAR SELECTION
// ============================================================

export function clearSelectedFieldHighlight() {

  if (selectedFieldHighlight) {
    appState.view.graphics.remove(selectedFieldHighlight);
  }

  selectedFieldHighlight = null;
}

/**
 * Clears the selected field, its highlight and the attribute
 * panel. The active field layer stays visible.
 */
export function clearFieldSelection() {

  clickGuard.cancel();

  clearSelectedFieldHighlight();

  appState.selectedField = null;

  renderFieldAttributes(null);
  clearFieldReport();
}
