export const appState = {
  // ==========================================================
  // MAP
  // ==========================================================

  map: null,

  view: null,


  // ==========================================================
  // GEOGRAPHY
  // ==========================================================

  stateLayer: null,

  countyLayer: null,

  selectedState: null,

  selectedCounty: null,

  stateHighlight: null,

  countyHighlight: null,


  // ==========================================================
  // RASTERS
  // ==========================================================

  activeRaster: null,

  rasterLayers: new Map(),

  activeRasterId: null,


  // ==========================================================
  // FIELDS
  // ==========================================================

  activeFieldLayer: null,

  fieldLayers: new Map(),

  activeFieldLayerId: null,

  selectedField: null,


  // ==========================================================
  // CURRENT STATE CONFIGURATION
  // ==========================================================

  currentStateConfig: null,
};