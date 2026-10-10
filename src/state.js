// ============================================================
// SHARED APPLICATION STATE
// ============================================================

export const appState = {

  // Map
  map: null,
  view: null,

  // Geography
  stateLayer: null,
  countyLayer: null,
  selectedState: null,
  selectedCounty: null,
  stateHighlight: null,
  countyHighlight: null,

  // Rasters (id -> ImageryTileLayer)
  rasterLayers: new Map(),

  // Fields (id -> FeatureLayer)
  fieldLayers: new Map(),
  activeFieldLayer: null,
  selectedField: null,

  // True while the fields are drawn as a variable choropleth. The
  // field layer is hidden then: only one of the two is on the map.
  visualizing: false,
};
