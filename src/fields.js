import FeatureLayer from "@arcgis/core/layers/FeatureLayer.js";

import { CONFIG } from "./config.js";

import { appState } from "./state.js";

import {
  renderFieldLayerList,
  renderFieldAttributes,
  setFieldOpacityUI,
} from "./ui.js";


// ============================================================
// SELECTED FIELD HIGHLIGHT
// ============================================================
//
// ArcGIS returns a highlight handle when we call:
//
// layerView.highlight(graphic)
//
// We keep that handle here so we can remove the previous
// highlight before highlighting another field.
//

let selectedFieldHighlight = null;


// ============================================================
// LOAD FIELDS FOR STATE
// ============================================================

export function loadFieldsForState(
  stateKey
) {

  console.log(
    `Loading field layers for ${stateKey}`
  );


  // ----------------------------------------------------------
  // REMOVE PREVIOUS FIELD LAYERS
  // ----------------------------------------------------------

  removeAllFieldLayers();


  const stateConfig =
    CONFIG.states[stateKey];


  if (!stateConfig) {

    console.warn(
      "No field configuration found for:",
      stateKey
    );


    renderFieldLayerList([]);


    return;
  }


  const fields =
    stateConfig.fields ?? [];


  // ----------------------------------------------------------
  // CREATE FIELD LAYERS
  // ----------------------------------------------------------

  for (
    const config
    of fields
  ) {

    if (
      !config.url ||
      config.url.startsWith("YOUR-")
    ) {

      console.warn(
        `Field layer not configured: ${config.title}`
      );


      continue;
    }


    const layer =
      new FeatureLayer({

        url:
          config.url,

        outFields:
          ["*"],

        popupEnabled:
          false,

        // Nothing turns on automatically.

        visible:
          false,

        // Default opacity:
        // 0.85 = 15% transparent.

        opacity:
          config.opacity !== undefined
            ? config.opacity
            : 0.85,
      });


    appState.fieldLayers.set(
      config.id,
      layer
    );


    appState.map.add(
      layer
    );
  }


  // ----------------------------------------------------------
  // RENDER FIELD DROPDOWN
  // ----------------------------------------------------------

  const availableFields =
    fields.filter(
      (field) =>
        field.url &&
        !field.url.startsWith("YOUR-")
    );


  renderFieldLayerList(
    availableFields
  );


  // ----------------------------------------------------------
  // DO NOT ACTIVATE FIRST FIELD
  // ----------------------------------------------------------
  //
  // The user must select a field layer.
  //
}


// ============================================================
// SWITCH FIELD LAYER
// ============================================================

export function setActiveFieldLayer(
  layerId
) {

  console.log(
    `Switching field layer to ${layerId}`
  );


  // ----------------------------------------------------------
  // CLEAR EXISTING FIELD HIGHLIGHT
  // ----------------------------------------------------------

  clearSelectedFieldHighlight();


  // ----------------------------------------------------------
  // IF SELECTION WAS CLEARED
  // ----------------------------------------------------------

  if (!layerId) {

    for (
      const layer
      of appState.fieldLayers.values()
    ) {

      layer.visible =
        false;
    }


    appState.activeFieldLayer =
      null;


    appState.activeFieldLayerId =
      null;


    appState.selectedField =
      null;


    renderFieldAttributes(
      null
    );


    // Reset slider to default:
    // 15% transparency.

    setFieldOpacityUI(
      0.85
    );


    return;
  }


  // ----------------------------------------------------------
  // FIND SELECTED LAYER
  // ----------------------------------------------------------

  const selectedLayer =
    appState.fieldLayers.get(
      layerId
    );


  if (!selectedLayer) {

    console.warn(
      "Field layer not found:",
      layerId
    );


    return;
  }


  // ----------------------------------------------------------
  // HIDE ALL OTHER FIELD LAYERS
  // ----------------------------------------------------------

  for (
    const [
      id,
      layer,
    ]
    of appState.fieldLayers
  ) {

    layer.visible =
      id === layerId;
  }


  // ----------------------------------------------------------
  // STORE ACTIVE FIELD
  // ----------------------------------------------------------

  appState.activeFieldLayer =
    selectedLayer;


  appState.activeFieldLayerId =
    layerId;


  appState.selectedField =
    null;


  // ----------------------------------------------------------
  // UPDATE TRANSPARENCY SLIDER
  // ----------------------------------------------------------

  setFieldOpacityUI(
    selectedLayer.opacity
  );


  renderFieldAttributes(
    null
  );
}


// ============================================================
// FIELD OPACITY
// ============================================================

export function setActiveFieldOpacity(
  opacity
) {

  const activeLayer =
    appState.activeFieldLayer;


  if (!activeLayer) {

    return;
  }


  // Keep opacity safely between 0 and 1.

  const safeOpacity =
    Math.max(
      0,
      Math.min(
        1,
        Number(opacity)
      )
    );


  activeLayer.opacity =
    safeOpacity;
}


// ============================================================
// REMOVE ALL FIELD LAYERS
// ============================================================

export function removeAllFieldLayers() {

  // ----------------------------------------------------------
  // REMOVE SELECTED FIELD HIGHLIGHT
  // ----------------------------------------------------------

  clearSelectedFieldHighlight();


  // ----------------------------------------------------------
  // REMOVE LAYERS FROM MAP
  // ----------------------------------------------------------

  for (
    const layer
    of appState.fieldLayers.values()
  ) {

    appState.map.remove(
      layer
    );
  }


  appState.fieldLayers.clear();


  // ----------------------------------------------------------
  // CLEAR ACTIVE FIELD STATE
  // ----------------------------------------------------------

  appState.activeFieldLayer =
    null;


  appState.activeFieldLayerId =
    null;


  appState.selectedField =
    null;


  renderFieldAttributes(
    null
  );


  setFieldOpacityUI(
    0.85
  );
}


// ============================================================
// FIELD CLICK HANDLING
// ============================================================

export function initializeFieldClick() {

  appState.view.on(
    "click",
    async (event) => {

      const activeLayer =
        appState.activeFieldLayer;


      // ------------------------------------------------------
      // NOTHING SELECTED
      // ------------------------------------------------------

      if (
        !activeLayer ||
        !activeLayer.visible
      ) {

        return;
      }


      try {

        // ----------------------------------------------------
        // HIT TEST ACTIVE FIELD LAYER
        // ----------------------------------------------------

        const response =
          await appState.view.hitTest(
            event,
            {
              include:
                activeLayer,
            }
          );


        // ----------------------------------------------------
        // FIND GRAPHIC FROM ACTIVE FIELD LAYER
        // ----------------------------------------------------

        const result =
          response.results.find(
            (item) =>
              item.type === "graphic" &&
              item.graphic?.layer ===
                activeLayer
          );


        // ----------------------------------------------------
        // NOTHING WAS CLICKED
        // ----------------------------------------------------

        if (!result) {

          return;
        }


        const graphic =
          result.graphic;


        // ----------------------------------------------------
        // CLEAR PREVIOUS HIGHLIGHT
        // ----------------------------------------------------

        clearSelectedFieldHighlight();


        // ----------------------------------------------------
        // STORE SELECTED FIELD
        // ----------------------------------------------------

        appState.selectedField =
          graphic;


        // ----------------------------------------------------
        // GET LAYERVIEW
        // ----------------------------------------------------
        //
        // highlight() works on the FeatureLayerView,
        // not directly on the FeatureLayer.
        //

        const layerView =
          await appState.view.whenLayerView(
            activeLayer
          );


        // ----------------------------------------------------
        // HIGHLIGHT SELECTED FIELD
        // ----------------------------------------------------

        selectedFieldHighlight =
          layerView.highlight(
            graphic
          );


        // ----------------------------------------------------
        // SHOW ATTRIBUTES
        // ----------------------------------------------------

        renderFieldAttributes(
          graphic.attributes
        );


        console.log(
          "Selected field:",
          graphic.attributes
        );


      } catch (error) {

        console.error(
          "Field click failed:",
          error
        );
      }
    }
  );
}


// ============================================================
// CLEAR SELECTED FIELD HIGHLIGHT
// ============================================================

export function clearSelectedFieldHighlight() {

  if (
    selectedFieldHighlight
  ) {

    selectedFieldHighlight.remove();

    selectedFieldHighlight =
      null;
  }
}


// ============================================================
// CLEAR FIELD SELECTION
// ============================================================
//
// Clears the selected field, removes its highlight, and clears
// the attributes panel.
//
// The active field layer remains visible.
//

export function clearFieldSelection() {

  // ----------------------------------------------------------
  // REMOVE SELECTED FIELD HIGHLIGHT
  // ----------------------------------------------------------

  clearSelectedFieldHighlight();


  // ----------------------------------------------------------
  // CLEAR SELECTED FIELD STATE
  // ----------------------------------------------------------

  appState.selectedField =
    null;


  // ----------------------------------------------------------
  // CLEAR FIELD ATTRIBUTES
  // ----------------------------------------------------------

  renderFieldAttributes(
    null
  );
}