import ImageryTileLayer from "@arcgis/core/layers/ImageryTileLayer.js";
import Legend from "@arcgis/core/widgets/Legend.js";

import {
  createColorRamp,
} from "@arcgis/core/smartMapping/raster/support/colorRamps.js";

import { CONFIG } from "./config.js";
import { appState } from "./state.js";

import {
  renderRasterList,
} from "./ui.js";


// ============================================================
// LOAD RASTERS FOR STATE
// ============================================================

export async function loadRastersForState(
  stateKey
) {

  console.log(
    `Loading rasters for ${stateKey}`
  );


  // ----------------------------------------------------------
  // REMOVE PREVIOUS RASTERS
  // ----------------------------------------------------------

  removeAllRasterLayers();


  const stateConfig =
    CONFIG.states[stateKey];


  if (!stateConfig) {

    console.warn(
      "No state configuration found:",
      stateKey
    );

    renderRasterList([]);

    return;
  }


  // ----------------------------------------------------------
  // CREATE RASTER CONFIGURATION
  // ----------------------------------------------------------

  const rasterConfigs =
    [];


  for (
    const [
      datasetId,
      url,
    ]
    of Object.entries(
      stateConfig.rasters ?? {}
    )
  ) {

    const dataset =
      CONFIG.datasets[
        datasetId
      ];


    if (!dataset) {

      console.warn(
        `Dataset "${datasetId}" is not defined in CONFIG.datasets`
      );

      continue;
    }


    if (
      !url ||
      url.startsWith("YOUR-")
    ) {

      console.warn(
        `No URL configured for ${stateKey} → ${datasetId}`
      );

      continue;
    }


    rasterConfigs.push({

      id:
        `${stateKey.toLowerCase()}-${datasetId}`,

      datasetId,

      title:
        dataset.title,

      description:
        dataset.description,

      type:
        dataset.type,

      url,

      opacity:
        dataset.opacity ?? 0.85,

      colorRamp:
        dataset.colorRamp ?? null,
    });
  }


  // ----------------------------------------------------------
  // CREATE LAYERS
  // ----------------------------------------------------------

  for (
    const config
    of rasterConfigs
  ) {

    // --------------------------------------------------------
    // CREATE RENDERER
    // --------------------------------------------------------

    let renderer =
      null;


    if (
      config.colorRamp &&
      config.colorRamp.length >= 2
    ) {

      try {

        const colorRamp =
          createColorRamp({

            colors:
              config.colorRamp,

          });


        if (colorRamp) {

          renderer = {

            type:
              "raster-stretch",

            stretchType: "percent-clip",

            minPercent: 2,

            maxPercent: 2,

            colorRamp,

          };
        }

      } catch (error) {

        console.error(
          `Failed to create color ramp for ${config.title}:`,
          error
        );
      }
    }


    // --------------------------------------------------------
    // CREATE IMAGERY TILE LAYER
    // --------------------------------------------------------

    const layerProperties = {

      url:
        config.url,

      opacity:
        config.opacity,

      visible:
        false,
    };


    // Only add renderer when a color ramp exists.

    if (renderer) {

      layerProperties.renderer =
        renderer;
    }


    const layer =
      new ImageryTileLayer(
        layerProperties
      );


    appState.rasterLayers.set(
      config.id,
      layer
    );


    appState.map.add(
      layer
    );
  }


  // ----------------------------------------------------------
  // CORRECT MAP DRAWING ORDER
  // ----------------------------------------------------------
  //
  // ArcGIS draws later-added layers above earlier-added
  // layers.
  //
  // Therefore:
  //
  // UI:
  //
  //   Raster A
  //   Raster B
  //   Raster C
  //
  // MAP:
  //
  //   Raster A  ← TOP
  //   Raster B
  //   Raster C  ← BOTTOM
  //
  // ----------------------------------------------------------

  const layers =
    rasterConfigs
      .map(
        (config) =>
          appState.rasterLayers.get(
            config.id
          )
      )
      .filter(
        (layer) =>
          layer
      );


  for (
    let i = 0;
    i < layers.length;
    i++
  ) {

    const layer =
      layers[i];


    appState.map.reorder(
      layer,
      layers.length - 1 - i
    );
  }


  // ----------------------------------------------------------
  // RENDER RASTER CONTROLS
  // ----------------------------------------------------------

  renderRasterList(
    rasterConfigs
  );


  // ----------------------------------------------------------
  // NOTHING ACTIVE INITIALLY
  // ----------------------------------------------------------

  appState.activeRaster =
    null;

  appState.activeRasterId =
    null;


  clearLegend();
}


// ============================================================
// SET RASTER VISIBILITY
// ============================================================
//
// Each raster is independent.
//
// Multiple rasters can be visible simultaneously.
// ============================================================

export function setActiveRaster(
  rasterId,
  visible
) {

  console.log(
    `Raster ${rasterId}: ${
      visible
        ? "ON"
        : "OFF"
    }`
  );


  const layer =
    appState.rasterLayers.get(
      rasterId
    );


  if (!layer) {

    console.warn(
      "Raster layer not found:",
      rasterId
    );

    return;
  }


  // ----------------------------------------------------------
  // CHANGE ONLY THIS RASTER
  // ----------------------------------------------------------

  layer.visible =
    Boolean(
      visible
    );


  // ----------------------------------------------------------
  // UPDATE ACTIVE RASTER REFERENCE
  // ----------------------------------------------------------

  if (visible) {

    appState.activeRaster =
      layer;

    appState.activeRasterId =
      rasterId;

  } else {

    if (
      appState.activeRasterId ===
      rasterId
    ) {

      appState.activeRaster =
        null;

      appState.activeRasterId =
        null;
    }
  }


  // ----------------------------------------------------------
  // UPDATE LEGEND
  // ----------------------------------------------------------

  updateLegend();
}


// ============================================================
// SET RASTER OPACITY
// ============================================================

export function setRasterOpacity(
  rasterId,
  opacity
) {

  const layer =
    appState.rasterLayers.get(
      rasterId
    );


  if (!layer) {

    console.warn(
      "Cannot change opacity. Raster layer not found:",
      rasterId
    );

    return;
  }


  const safeOpacity =
    Math.max(
      0,
      Math.min(
        1,
        Number(
          opacity
        )
      )
    );


  layer.opacity =
    safeOpacity;


  console.log(
    `Raster ${rasterId} opacity: ${safeOpacity}`
  );
}


// ============================================================
// FIND RASTER CONFIG
// ============================================================

function findRasterConfig(
  stateKey,
  rasterId
) {

  const stateConfig =
    CONFIG.states[
      stateKey
    ];


  if (!stateConfig) {
    return null;
  }


  for (
    const [
      datasetId,
      url,
    ]
    of Object.entries(
      stateConfig.rasters ?? {}
    )
  ) {

    const generatedId =
      `${stateKey.toLowerCase()}-${datasetId}`;


    if (
      generatedId !== rasterId
    ) {

      continue;
    }


    const dataset =
      CONFIG.datasets[
        datasetId
      ];


    if (!dataset) {
      return null;
    }


    return {

      ...dataset,

      id:
        generatedId,

      datasetId,

      url,
    };
  }


  return null;
}


// ============================================================
// REMOVE ALL RASTERS
// ============================================================

export function removeAllRasterLayers() {

  for (
    const layer
    of appState.rasterLayers.values()
  ) {

    appState.map.remove(
      layer
    );
  }


  appState.rasterLayers.clear();


  appState.activeRaster =
    null;


  appState.activeRasterId =
    null;


  clearLegend();
}


// ============================================================
// LEGEND
// ============================================================
//
// The legend follows the SAME order as the raster list.
//
// First raster in list = first/top legend.
// Last raster in list = last/bottom legend.
//
// Only visible rasters are included.
// ============================================================

function updateLegend() {

  const legendDiv =
    document.getElementById(
      "legendDiv"
    );


  if (!legendDiv) {
    return;
  }


  const stateKey =
    appState.selectedState?.key;


  if (!stateKey) {

    clearLegend();

    return;
  }


  // ----------------------------------------------------------
  // GET RASTERS IN CONFIG / UI ORDER
  // ----------------------------------------------------------

  const stateConfig =
    CONFIG.states[
      stateKey
    ];


  if (!stateConfig) {

    clearLegend();

    return;
  }


  const layerInfos =
    [];


  for (
    const [
      datasetId,
      url,
    ]
    of Object.entries(
      stateConfig.rasters ?? {}
    )
  ) {

    const rasterId =
      `${stateKey.toLowerCase()}-${datasetId}`;


    const layer =
      appState.rasterLayers.get(
        rasterId
      );


    // --------------------------------------------------------
    // ONLY INCLUDE VISIBLE RASTERS
    // --------------------------------------------------------

    if (
      !layer ||
      !layer.visible
    ) {

      continue;
    }


    const config =
      findRasterConfig(
        stateKey,
        rasterId
      );


    if (!config) {
      continue;
    }


    layerInfos.push({

      layer,

      title:
        config.title,

    });
  }


  // ----------------------------------------------------------
  // NO VISIBLE RASTERS
  // ----------------------------------------------------------

  if (
    layerInfos.length === 0
  ) {

    clearLegend();

    return;
  }


  // ----------------------------------------------------------
  // CLEAR PREVIOUS LEGEND
  // ----------------------------------------------------------

  legendDiv.innerHTML =
    "";


  // ----------------------------------------------------------
  // CREATE LEGEND
  // ----------------------------------------------------------

  new Legend({

    view:
      appState.view,

    container:
      legendDiv,

    layerInfos,

  });
}


// ============================================================
// CLEAR LEGEND
// ============================================================

function clearLegend() {

  const legendDiv =
    document.getElementById(
      "legendDiv"
    );


  if (!legendDiv) {
    return;
  }


  legendDiv.innerHTML = `
    <div class="empty-state">
      Turn on a raster layer to view its legend.
    </div>
  `;
}