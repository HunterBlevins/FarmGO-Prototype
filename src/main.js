import "./style.css";

import { createMap } from "./map.js";
import { appState } from "./state.js";
import { CONFIG } from "./config.js";
import { initializeUI } from "./ui.js";
import { makePanelResizable } from "./panelResize.js";
import { initializeChoropleth } from "./choropleth/choropleth.js";

import {
  initializeGeography,
  selectState,
  selectCounty,
} from "./geography.js";

import {
  setRasterVisibility,
  setRasterOpacity,
} from "./rasters.js";

import {
  setActiveFieldLayer,
  setActiveFieldOpacity,
  initializeFieldClick,
  clearFieldSelection,
} from "./fields.js";


// ============================================================
// APPLICATION STARTUP
// ============================================================

async function main() {

  document.title = CONFIG.app.title;

  // Map
  const { map, view } = createMap();

  appState.map = map;
  appState.view = view;

  // UI
  initializeUI({
    onStateChange: selectState,
    onCountyChange: selectCounty,
    onRasterChange: setRasterVisibility,
    onRasterOpacityChange: setRasterOpacity,
    onFieldLayerChange: setActiveFieldLayer,
    onFieldOpacityChange: setActiveFieldOpacity,
    onClearFieldSelection: clearFieldSelection,
  });

  // Map interaction
  initializeFieldClick();
  initializeChoropleth();

  // Resizable panels
  makePanelResizable({
    panelId: "leftPanel",
    handleId: "leftResizeHandle",
    side: "left",
    minWidth: 240,
    maxWidth: 600,
    maxFraction: 0.45,
  });

  makePanelResizable({
    panelId: "rightPanel",
    handleId: "rightResizeHandle",
    side: "right",
    minWidth: 280,
    maxWidth: 800,
    maxFraction: 0.55,
  });

  // Geography (fills the state dropdown)
  await initializeGeography();
}


main().catch((error) => {
  console.error(`${CONFIG.app.title} failed to initialize:`, error);
});