import ImageryTileLayer from "@arcgis/core/layers/ImageryTileLayer.js";

import {
  createColorRamp,
} from "@arcgis/core/smartMapping/raster/support/colorRamps.js";

import { CONFIG } from "./config.js";
import { appState } from "./state.js";
import { clamp, isConfiguredUrl } from "./utils.js";

import {
  renderRasterList,
  setLegend,
  markRasterUnavailable,
} from "./ui.js";


// ============================================================
// RASTER CONFIGS FOR THE CURRENT STATE
// ============================================================
//
// Kept in the same order as the raster list in the UI.
// The legend and the map drawing order both follow this order.
//

let rasterConfigs = [];


// ============================================================
// BUILD CONFIGS
// ============================================================

function buildRasterConfigs(stateKey) {

  const stateConfig = CONFIG.states[stateKey];

  const configs = [];

  for (const [datasetId, url] of Object.entries(stateConfig?.rasters ?? {})) {

    const dataset = CONFIG.datasets[datasetId];

    if (!dataset) {
      console.warn(`Dataset "${datasetId}" is not defined in CONFIG.datasets`);
      continue;
    }

    if (!isConfiguredUrl(url)) {
      continue;
    }

    configs.push({
      id: `${stateKey.toLowerCase()}-${datasetId}`,
      datasetId,
      title: dataset.title,
      description: dataset.description,
      url,
      opacity: dataset.opacity ?? CONFIG.defaults.rasterOpacity,
      colorRamp: dataset.colorRamp ?? null,
    });
  }

  return configs;
}


// ============================================================
// CREATE ONE LAYER
// ============================================================

function createRasterLayer(config) {

  const properties = {
    url: config.url,
    title: config.title,
    opacity: config.opacity,
    visible: false,
  };

  if (config.colorRamp?.length >= 2) {

    try {

      properties.renderer = {
        type: "raster-stretch",
        stretchType: "percent-clip",
        minPercent: 2,
        maxPercent: 2,
        colorRamp: createColorRamp({ colors: config.colorRamp }),
      };

    } catch (error) {

      console.error(`Failed to create color ramp for ${config.title}:`, error);
    }
  }

  return new ImageryTileLayer(properties);
}


// ============================================================
// LOAD RASTERS FOR STATE
// ============================================================

export function loadRastersForState(stateKey) {

  removeAllRasterLayers();

  rasterConfigs = buildRasterConfigs(stateKey);

  for (const config of rasterConfigs) {

    const layer = createRasterLayer(config);

    appState.rasterLayers.set(config.id, layer);
    appState.map.add(layer);

    // If the service can't be reached, tell the user.
    layer.load().catch((error) => {

      console.error(`Raster failed to load: ${config.title}`, error);

      // Ignore if the user already switched to another state.
      if (appState.rasterLayers.get(config.id) === layer) {
        markRasterUnavailable(config.id);
      }
    });
  }

  // ArcGIS draws later layers on top. Reverse the order so the
  // first raster in the list is drawn on top of the others.
  rasterConfigs.forEach((config, index) => {

    appState.map.reorder(
      appState.rasterLayers.get(config.id),
      rasterConfigs.length - 1 - index
    );
  });

  renderRasterList(rasterConfigs);
}


// ============================================================
// RASTER VISIBILITY + OPACITY
// ============================================================
//
// Each raster is independent; several can be on at once.
//

export function setRasterVisibility(rasterId, visible) {

  const layer = appState.rasterLayers.get(rasterId);

  if (!layer) {
    console.warn("Raster layer not found:", rasterId);
    return;
  }

  layer.visible = Boolean(visible);

  updateLegend();
}

export function setRasterOpacity(rasterId, opacity) {

  const layer = appState.rasterLayers.get(rasterId);

  if (!layer) {
    console.warn("Cannot change opacity. Raster layer not found:", rasterId);
    return;
  }

  layer.opacity = clamp(Number(opacity), 0, 1);
}


// ============================================================
// REMOVE ALL RASTERS
// ============================================================

export function removeAllRasterLayers() {

  for (const layer of appState.rasterLayers.values()) {
    appState.map.remove(layer);
  }

  appState.rasterLayers.clear();

  rasterConfigs = [];

  setLegend([]);
}


// ============================================================
// LEGEND
// ============================================================
//
// Shows the visible rasters, in the same order as the list.
//

function updateLegend() {

  const layerInfos = rasterConfigs
    .map((config) => ({
      layer: appState.rasterLayers.get(config.id),
      title: config.title,
    }))
    .filter(({ layer }) => layer?.visible);

  setLegend(layerInfos);
}
