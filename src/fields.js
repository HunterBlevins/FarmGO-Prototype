import FeatureLayer from "@arcgis/core/layers/FeatureLayer.js";

import { CONFIG } from "./config.js";
import { appState } from "./state.js";
import { clamp, createLatestGuard, isConfiguredUrl } from "./utils.js";

import {
  renderFieldLayerList,
  renderFieldAttributes,
  setFieldOpacityUI,
} from "./ui.js";


// ============================================================
// SELECTED FIELD HIGHLIGHT
// ============================================================
//
// layerView.highlight(graphic) returns a handle. We keep it so
// the previous highlight can be removed before highlighting
// another field.
//

let selectedFieldHighlight = null;

// Only the most recent click is allowed to finish.
const clickGuard = createLatestGuard();


// ============================================================
// LOAD FIELDS FOR STATE
// ============================================================

export function loadFieldsForState(stateKey) {

  removeAllFieldLayers();

  const fields = (CONFIG.states[stateKey]?.fields ?? []).filter(
    (field) => isConfiguredUrl(field.url)
  );

  for (const config of fields) {

    const layer = new FeatureLayer({
      url: config.url,
      title: config.title,
      outFields: ["*"],
      popupEnabled: false,
      visible: false, // nothing turns on automatically
      opacity: config.opacity ?? CONFIG.defaults.fieldOpacity,
    });

    appState.fieldLayers.set(config.id, layer);
    appState.map.add(layer);

    layer.load().catch((error) => {
      console.error(`Field layer failed to load: ${config.title}`, error);
    });
  }

  // The user chooses which field layer to show.
  renderFieldLayerList(fields);
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
}


// ============================================================
// FIELD OPACITY
// ============================================================

export function setActiveFieldOpacity(opacity) {

  if (appState.activeFieldLayer) {
    appState.activeFieldLayer.opacity = clamp(Number(opacity), 0, 1);
  }
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

  renderFieldLayerList([]);
  setFieldOpacityUI(CONFIG.defaults.fieldOpacity);
}


// ============================================================
// FIELD CLICK HANDLING
// ============================================================

export function initializeFieldClick() {

  appState.view.on("click", async (event) => {

    const activeLayer = appState.activeFieldLayer;

    if (!activeLayer?.visible) {
      return;
    }

    const isCurrent = clickGuard.next();

    try {

      const response = await appState.view.hitTest(event, {
        include: activeLayer,
      });

      const result = response.results.find(
        (item) =>
          item.type === "graphic" && item.graphic?.layer === activeLayer
      );

      // Clicking empty map deselects the field.
      if (!result) {
        if (isCurrent()) {
          clearFieldSelection();
        }
        return;
      }

      // highlight() lives on the layer view, not the layer.
      const layerView = await appState.view.whenLayerView(activeLayer);

      // A newer click (or a layer change) happened while we waited.
      if (!isCurrent() || appState.activeFieldLayer !== activeLayer) {
        return;
      }

      const graphic = result.graphic;

      clearSelectedFieldHighlight();

      appState.selectedField = graphic;
      selectedFieldHighlight = layerView.highlight(graphic);

      renderFieldAttributes(graphic.attributes);

    } catch (error) {

      console.error("Field click failed:", error);
    }
  });
}


// ============================================================
// CLEAR SELECTION
// ============================================================

export function clearSelectedFieldHighlight() {

  selectedFieldHighlight?.remove();
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
}
