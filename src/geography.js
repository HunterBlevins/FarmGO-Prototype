import FeatureLayer from "@arcgis/core/layers/FeatureLayer.js";
import Graphic from "@arcgis/core/Graphic.js";
import SimpleFillSymbol from "@arcgis/core/symbols/SimpleFillSymbol.js";

import { CONFIG } from "./config.js";
import { appState } from "./state.js";
import { escapeSqlValue, createLatestGuard } from "./utils.js";

import {
  populateStateDropdown,
  populateCountyDropdown,
  setCountyEnabled,
  clearRasterList,
} from "./ui.js";

import { loadRastersForState, removeAllRasterLayers } from "./rasters.js";
import {
  loadFieldsForState,
  removeAllFieldLayers,
  showFieldsForCounty,
  clearFieldCounty,
} from "./fields.js";
import { loadCountyReport, clearCountyReport } from "./reports/countyReport.js";


// ============================================================
// OUTLINE SYMBOLS
// ============================================================

function outlineSymbol(color) {

  return new SimpleFillSymbol({
    style: "none",
    outline: { color, width: 3 },
  });
}

const stateSymbol = outlineSymbol([0, 170, 255, 1]);
const countySymbol = outlineSymbol([255, 210, 0, 1]);

const ZOOM_PADDING = { top: 40, bottom: 40, left: 40, right: 40 };


// ============================================================
// RACE PROTECTION
// ============================================================
//
// If the user changes the state/county quickly, only the latest
// choice is allowed to update the map and the panels.
//

const stateGuard = createLatestGuard();
const countyGuard = createLatestGuard();


// ============================================================
// INITIALIZE GEOGRAPHY
// ============================================================

export async function initializeGeography() {

  appState.stateLayer = new FeatureLayer({
    url: CONFIG.geography.states.url,
    outFields: ["*"],
    popupEnabled: false,
  });

  appState.countyLayer = new FeatureLayer({
    url: CONFIG.geography.counties.url,
    outFields: ["*"],
    popupEnabled: false,
  });

  try {

    await Promise.all([
      appState.stateLayer.load(),
      appState.countyLayer.load(),
    ]);

    await populateStatesFromLayer();

  } catch (error) {

    console.error("Could not load geography layers:", error);

    populateStateDropdown([], "Could not load states");
  }
}


// ============================================================
// POPULATE STATES FROM FEATURESERVER
// ============================================================

async function populateStatesFromLayer() {

  const { nameField } = CONFIG.geography.states;

  const result = await appState.stateLayer.queryFeatures({
    where: "1=1",
    outFields: [nameField],
    returnGeometry: false,
    orderByFields: [`${nameField} ASC`],
  });

  // The dropdown value is the state NAME, which is also the key
  // used in CONFIG.states (e.g. "Texas"). Remove duplicates.
  const names = [
    ...new Set(
      result.features
        .map((feature) => feature.attributes[nameField])
        .filter(Boolean)
    ),
  ];

  populateStateDropdown(names.map((name) => ({ name })));
}


// ============================================================
// QUERY HELPERS
// ============================================================

/** Returns the first feature matching `field = value`, or null. */
async function findFeature(layer, field, value) {

  try {

    const result = await layer.queryFeatures({
      where: `${field} = '${escapeSqlValue(value)}'`,
      outFields: ["*"],
      returnGeometry: true,
      num: 1,
    });

    return result.features[0] ?? null;

  } catch (error) {

    console.error(`Query failed for ${field} = ${value}:`, error);

    return null;
  }
}

async function zoomTo(geometry) {

  try {

    await appState.view.goTo(
      { target: geometry, padding: ZOOM_PADDING },
      { duration: 800 }
    );

  } catch (error) {

    // goTo is rejected when the user interrupts the animation.
    console.warn("Could not zoom:", error);
  }
}


// ============================================================
// STATE SELECTION
// ============================================================

export async function selectState(stateName) {

  const isCurrent = stateGuard.next();

  // Anything the previous state put on the map goes away first.
  clearStateSelection();

  if (!stateName) {
    return;
  }

  const stateConfig = CONFIG.states[stateName] ?? null;

  const { nameField, idField } = CONFIG.geography.states;

  const stateFeature = await findFeature(
    appState.stateLayer,
    nameField,
    stateName
  );

  if (!isCurrent()) {
    return;
  }

  if (!stateFeature) {
    console.warn(`Could not find ${stateName} in the States FeatureServer.`);
    return;
  }

  const stateId = stateFeature.attributes[idField];

  appState.selectedState = {
    key: stateName,
    name: stateName,
    id: stateId,
    feature: stateFeature,
  };

  appState.stateHighlight = addOutline(stateFeature.geometry, stateSymbol);

  // Datasets for this state. A state with no configuration simply
  // ends up with empty lists and a "not configured" message.
  loadRastersForState(stateName);
  loadFieldsForState(stateName);

  if (!stateConfig) {
    console.warn(
      `${stateName} exists in the geography layer but has no data configuration yet.`
    );
  }

  const zoom = zoomTo(stateFeature.geometry);

  // Counties are only offered for states that have data configured.
  if (stateConfig) {
    await Promise.all([zoom, loadCounties(stateId, isCurrent)]);
  } else {
    await zoom;
  }
}


// ============================================================
// LOAD COUNTIES
// ============================================================

async function loadCounties(stateId, isCurrent) {

  const { stateIdField, nameField, idField } = CONFIG.geography.counties;

  try {

    const result = await appState.countyLayer.queryFeatures({
      where: `${stateIdField} = '${escapeSqlValue(stateId)}'`,
      outFields: [nameField, idField],
      returnGeometry: false,
      orderByFields: [`${nameField} ASC`],
    });

    if (!isCurrent()) {
      return;
    }

    const counties = result.features
      .map((feature) => ({
        id: feature.attributes[idField],
        name: feature.attributes[nameField],
      }))
      .filter((county) => county.name);

    populateCountyDropdown(counties);
    setCountyEnabled(counties.length > 0);

  } catch (error) {

    console.error("County query failed:", error);

    if (isCurrent()) {
      populateCountyDropdown([]);
      setCountyEnabled(false);
    }
  }
}


// ============================================================
// COUNTY SELECTION
// ============================================================

export async function selectCounty(countyId) {

  // Clear first: clearing cancels older requests, so the new
  // request's guard must be created afterwards.
  clearCountySelection();

  if (!countyId) {
    return;
  }

  const isCurrent = countyGuard.next();

  const { nameField, idField } = CONFIG.geography.counties;

  const feature = await findFeature(appState.countyLayer, idField, countyId);

  if (!isCurrent()) {
    return;
  }

  if (!feature) {
    console.warn("County not found:", countyId);
    return;
  }

  const countyName = feature.attributes[nameField];

  appState.selectedCounty = { id: countyId, name: countyName, feature };

  appState.countyHighlight = addOutline(feature.geometry, countySymbol);

  // Fields are only offered once a county is chosen, and only that
  // county's fields. (Runs in the background; the dropdown fills
  // in when it is ready.)
  showFieldsForCounty(countyId);

  // Start the report and the zoom together.
  loadCountyReport(
    countyId,
    countyName,
    appState.selectedState?.name ?? ""
  );

  await zoomTo(feature.geometry);
}


// ============================================================
// HIGHLIGHT OUTLINES
// ============================================================

function addOutline(geometry, symbol) {

  const graphic = new Graphic({ geometry, symbol });

  appState.view.graphics.add(graphic);

  return graphic;
}

function removeOutline(graphic) {

  if (graphic) {
    appState.view.graphics.remove(graphic);
  }
}


// ============================================================
// CLEARING
// ============================================================

/** Removes everything that belongs to the currently selected state. */
function clearStateSelection() {

  removeOutline(appState.stateHighlight);
  appState.stateHighlight = null;
  appState.selectedState = null;

  clearCountySelection();

  // Map layers and their controls (previously these stayed on the
  // map when a state was deselected or had no configuration).
  removeAllRasterLayers();
  removeAllFieldLayers();
  clearRasterList();

  populateCountyDropdown([]);
  setCountyEnabled(false);
}

function clearCountySelection() {

  // Cancel any county request that is still running.
  countyGuard.cancel();

  removeOutline(appState.countyHighlight);
  appState.countyHighlight = null;
  appState.selectedCounty = null;

  clearFieldCounty();
  clearCountyReport();
}
