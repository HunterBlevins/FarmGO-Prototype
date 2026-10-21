import GraphicsLayer from "@arcgis/core/layers/GraphicsLayer.js";
import Graphic from "@arcgis/core/Graphic.js";
import SimpleFillSymbol from "@arcgis/core/symbols/SimpleFillSymbol.js";

import { appState } from "../state.js";
import { clamp } from "../utils.js";
import { CHOROPLETH_CONFIG as CONFIG } from "./choroplethConfig.js";


// ============================================================
// THE MAP LAYERS
// ============================================================
//
// One plain GraphicsLayer per kind of choropleth ("fields",
// "counties"), owned by this file. A layer is added to the map when
// something is drawn and removed again when cleared, so nothing
// else in the app is affected.
//
// Counties sit at the bottom of the map (above the basemap), as a
// thematic backdrop: field layers, rasters and the state / county
// outlines stay visible on top of them. Fields sit on top.
//

const layers = new Map(); // level -> GraphicsLayer

function getLayer(level) {

  if (!layers.has(level)) {

    layers.set(level, new GraphicsLayer({
      title: `${level} choropleth`,
      opacity: CONFIG.opacity,
      listMode: "hide",
    }));
  }

  const layer = layers.get(level);
  const map = appState.map;

  if (!map.layers.includes(layer)) {
    map.add(layer);
  }

  map.reorder(layer, level === "counties" ? 0 : map.layers.length - 1);

  return layer;
}

/** The layer the field shapes are drawn on, or null if none is drawn. */
export function getChoroplethLayer() {

  const layer = layers.get("fields");

  return layer && appState.map.layers.includes(layer) ? layer : null;
}

export function clearChoropleth(level) {

  const layer = layers.get(level);

  if (!layer) {
    return;
  }

  layer.removeAll();

  appState.map.remove(layer);
}

/** Applies to every choropleth layer (only one is ever drawn). */
export function setChoroplethOpacity(opacity) {

  const value = clamp(Number(opacity), 0, 1);

  for (const layer of layers.values()) {
    layer.opacity = value;
  }
}


// ============================================================
// DRAW
// ============================================================
//
// shapes:  [{ id, geometry }]
// changes: Map(id -> change from the norm)
// scale:   from buildScale (choroplethScale.js)
//
// Returns { matched, total } for the status line.
//

function fillSymbol(color) {

  return new SimpleFillSymbol({
    color,
    outline: { color: CONFIG.outlineColor, width: CONFIG.outlineWidth },
  });
}

export function drawChoropleth(level, shapes, changes, scale) {

  const target = getLayer(level);

  // One symbol per colour step, shared by every graphic with that
  // colour (graphics are given their symbol before they are added,
  // which is much faster than changing them while on the map).
  const symbols = scale.colors.map((color) => fillSymbol(color));
  const noDataSymbol = fillSymbol(CONFIG.noDataColor);

  let matched = 0;

  const graphics = shapes.map((shape) => {

    const change = changes.get(shape.id);

    if (change !== undefined) {
      matched++;
    }

    return new Graphic({
      geometry: shape.geometry,
      symbol: change === undefined
        ? noDataSymbol
        : symbols[scale.indexFor(change)],
      attributes: { id: shape.id, change: change ?? null },
    });
  });

  target.removeAll();
  target.addMany(graphics);

  return { matched, total: shapes.length };
}
