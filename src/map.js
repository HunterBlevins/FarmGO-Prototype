import ArcGISMap from "@arcgis/core/Map.js";
import MapView from "@arcgis/core/views/MapView.js";

import "@arcgis/map-components/components/arcgis-search";
import "@arcgis/map-components/components/arcgis-compass";
import "@arcgis/map-components/components/arcgis-legend";


export function createMap() {

  const map = new ArcGISMap({
    basemap: "satellite",
  });

  const view = new MapView({
    container: "viewDiv",
    map,
    center: [-98.5, 31.0],
    zoom: 5,
    popupEnabled: false,
  });

  // Connect the web components to the view.
  for (const id of ["mapSearch", "mapCompass", "legend"]) {

    const component = document.getElementById(id);

    if (component) {
      component.view = view;
    }
  }

  return { map, view };
}
