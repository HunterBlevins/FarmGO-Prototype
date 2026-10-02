import Map from "@arcgis/core/Map.js";
import MapView from "@arcgis/core/views/MapView.js";

import "@arcgis/map-components/components/arcgis-search";
import "@arcgis/map-components/components/arcgis-compass";


export function createMap() {

  // ==========================================================
  // CREATE MAP
  // ==========================================================

  const map = new Map({
    basemap: "satellite",
  });


  // ==========================================================
  // CREATE MAP VIEW
  // ==========================================================

  const view = new MapView({

    container:
      "viewDiv",

    map:
      map,

    center:
      [-98.5, 31.0],

    zoom:
      5,

    popupEnabled:
      false,

  });


  // ==========================================================
  // GET SEARCH COMPONENT
  // ==========================================================

  const search =
    document.getElementById(
      "mapSearch"
    );


  // ==========================================================
  // GET COMPASS COMPONENT
  // ==========================================================

  const compass =
    document.getElementById(
      "mapCompass"
    );


  // ==========================================================
  // CONNECT SEARCH TO MAP
  // ==========================================================

  if (search) {

    search.view =
      view;

  }


  // ==========================================================
  // CONNECT COMPASS TO MAP
  // ==========================================================

  if (compass) {

    compass.view =
      view;

  }


  // ==========================================================
  // RETURN MAP + VIEW
  // ==========================================================

  return {
    map,
    view,
  };
}