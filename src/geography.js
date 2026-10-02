import FeatureLayer from "@arcgis/core/layers/FeatureLayer.js";
import Graphic from "@arcgis/core/Graphic.js";
import SimpleFillSymbol from "@arcgis/core/symbols/SimpleFillSymbol.js";

import { CONFIG } from "./config.js";
import { appState } from "./state.js";

import {
  populateStateDropdown,
  populateCountyDropdown,
  setCountyEnabled,
  renderCountyReport,
  clearRasterList,
  clearFieldLayerList,
} from "./ui.js";

import {
  loadRastersForState,
} from "./rasters.js";

import {
  loadFieldsForState,
} from "./fields.js";

import {
  loadCountyReport,
} from "./reports/countyReport.js";


// ============================================================
// SYMBOLS
// ============================================================

const stateSymbol =
  new SimpleFillSymbol({

    style:
      "none",

    outline: {
      color:
        [0, 170, 255, 1],

      width:
        3,
    },
  });


const countySymbol =
  new SimpleFillSymbol({

    style:
      "none",

    outline: {
      color:
        [255, 210, 0, 1],

      width:
        3,
    },
  });


// ============================================================
// INITIALIZE GEOGRAPHY
// ============================================================

export async function initializeGeography() {

  // ----------------------------------------------------------
  // STATES LAYER
  // ----------------------------------------------------------

  appState.stateLayer =
    new FeatureLayer({

      url:
        CONFIG.geography.states.url,

      outFields:
        ["*"],

      popupEnabled:
        false,
    });


  // ----------------------------------------------------------
  // COUNTIES LAYER
  // ----------------------------------------------------------

  appState.countyLayer =
    new FeatureLayer({

      url:
        CONFIG.geography.counties.url,

      outFields:
        ["*"],

      popupEnabled:
        false,
    });


  // ----------------------------------------------------------
  // LOAD BOTH LAYERS
  // ----------------------------------------------------------

  try {

    await Promise.all([

      appState.stateLayer.load(),

      appState.countyLayer.load(),

    ]);

  } catch (error) {

    console.error(
      "Could not load geography layers:",
      error
    );

    return;
  }


  // ----------------------------------------------------------
  // POPULATE STATE DROPDOWN
  // ----------------------------------------------------------

  await populateStatesFromLayer();
}


// ============================================================
// POPULATE STATES FROM FEATURESERVER
// ============================================================

async function populateStatesFromLayer() {

  const config =
    CONFIG.geography.states;


  try {

    const result =
      await appState.stateLayer.queryFeatures({

        where:
          "1=1",

        outFields: [

          config.nameField,

          config.idField,

        ],

        returnGeometry:
          false,

        orderByFields: [

          `${config.nameField} ASC`,

        ],
      });


    const states =
      result.features

        .map(
          (feature) => {

            const name =
              feature.attributes[
                config.nameField
              ];


            const id =
              feature.attributes[
                config.idField
              ];


            return {
              name,
              id,
            };
          }
        )

        .filter(
          (state) =>
            state.name
        );


    // --------------------------------------------------------
    // REMOVE DUPLICATE STATE NAMES
    // --------------------------------------------------------

    const uniqueStates =
      Array.from(

        new Map(

          states.map(
            (state) => [

              state.name,

              state,

            ]
          )

        ).values()

      );


    populateStateDropdown(
      uniqueStates
    );


    console.log(
      `Loaded ${uniqueStates.length} states from the States FeatureServer.`
    );


  } catch (error) {

    console.error(
      "Could not populate states:",
      error
    );
  }
}


// ============================================================
// STATE SELECTION
// ============================================================
//
// IMPORTANT:
//
// The dropdown value is the STATE NAME.
//
// Therefore:
//
// "Texas"    -> CONFIG.states["Texas"]
// "Arizona"  -> CONFIG.states["Arizona"]
// "Virginia" -> CONFIG.states["Virginia"]
//
// No state ID or separate config key is required.
// ============================================================

export async function selectState(
  stateName
) {

  // ----------------------------------------------------------
  // CLEAR SELECTION
  // ----------------------------------------------------------

  if (!stateName) {

    clearStateSelection();

    return;
  }


  console.log(
    `Selecting state: ${stateName}`
  );


  // ----------------------------------------------------------
  // FIND STATE CONFIG BY NAME
  // ----------------------------------------------------------

  const stateConfig =
    CONFIG.states[stateName] ??
    null;


  // ----------------------------------------------------------
  // FIND STATE FEATURE
  // ----------------------------------------------------------

  const stateFeature =
    await findStateFeature(
      stateName
    );


  if (!stateFeature) {

    console.warn(
      `Could not find ${stateName} in the States FeatureServer.`
    );

    return;
  }


  // ----------------------------------------------------------
  // GET STATE ID
  // ----------------------------------------------------------

  const stateIdField =
    CONFIG.geography.states.idField;


  const stateId =
    stateFeature.attributes[
      stateIdField
    ];


  // ----------------------------------------------------------
  // CLEAR PREVIOUS SELECTION
  // ----------------------------------------------------------

  clearStateHighlight();

  clearCountySelection();

  clearRasterList();

  clearFieldLayerList();


  // ----------------------------------------------------------
  // STORE SELECTED STATE
  // ----------------------------------------------------------

  appState.selectedState = {

    key:
      stateName,

    name:
      stateName,

    id:
      stateId,

    feature:
      stateFeature,

    config:
      stateConfig,
  };


  appState.currentStateConfig =
    stateConfig;


  // ----------------------------------------------------------
  // HIGHLIGHT STATE
  // ----------------------------------------------------------

  showStateHighlight(
    stateFeature
  );


  // ----------------------------------------------------------
  // ZOOM TO STATE
  // ----------------------------------------------------------

  try {

    await appState.view.goTo(

      {
        target:
          stateFeature.geometry,

        padding: {

          top:
            40,

          bottom:
            40,

          left:
            40,

          right:
            40,
        },
      },

      {
        duration:
          800,
      }

    );

  } catch (error) {

    console.warn(
      "Could not zoom to state:",
      error
    );
  }


  // ----------------------------------------------------------
  // LOAD STATE DATA
  // ----------------------------------------------------------

  if (stateConfig) {

    console.log(
      `Loading configured data for ${stateName}`
    );


    // IMPORTANT:
    //
    // Pass the STATE NAME because that is now
    // the key in CONFIG.states.

    loadRastersForState(
      stateName
    );


    loadFieldsForState(
      stateName
    );

  } else {

    console.warn(
      `${stateName} exists in the geography layer but has no data configuration yet.`
    );


    populateCountyDropdown(
      []
    );


    setCountyEnabled(
      false
    );


    return;
  }


  // ----------------------------------------------------------
  // LOAD COUNTIES
  // ----------------------------------------------------------

  await loadCounties(
    stateId
  );
}


// ============================================================
// FIND STATE FEATURE
// ============================================================

async function findStateFeature(
  stateName
) {

  const config =
    CONFIG.geography.states;


  const where =
    `${config.nameField} = '${escapeSqlValue(
      stateName
    )}'`;


  try {

    const result =
      await appState.stateLayer.queryFeatures({

        where,

        outFields:
          ["*"],

        returnGeometry:
          true,
      });


    if (
      result.features.length ===
      0
    ) {

      return null;
    }


    return result.features[0];


  } catch (error) {

    console.error(
      "State query failed:",
      error
    );

    return null;
  }
}


// ============================================================
// LOAD COUNTIES
// ============================================================

async function loadCounties(
  stateId
) {

  const config =
    CONFIG.geography.counties;


  const where =
    `${config.stateIdField} = '${escapeSqlValue(
      stateId
    )}'`;


  try {

    const result =
      await appState.countyLayer.queryFeatures({

        where,

        outFields: [

          config.nameField,

          config.idField,

        ],

        returnGeometry:
          false,

        orderByFields: [

          `${config.nameField} ASC`,

        ],
      });


    const counties =
      result.features

        .map(
          (feature) => ({

            id:
              feature.attributes[
                config.idField
              ],

            name:
              feature.attributes[
                config.nameField
              ],

          })
        )

        .filter(
          (county) =>
            county.name
        );


    populateCountyDropdown(
      counties
    );


    setCountyEnabled(
      counties.length > 0
    );


    console.log(
      `Loaded ${counties.length} counties for ${stateId}.`
    );


  } catch (error) {

    console.error(
      "County query failed:",
      error
    );


    populateCountyDropdown(
      []
    );


    setCountyEnabled(
      false
    );
  }
}


// ============================================================
// COUNTY SELECTION
// ============================================================

export async function selectCounty(
  countyId
) {

  if (!countyId) {

    clearCountySelection();

    return;
  }


  const config =
    CONFIG.geography.counties;


  const where =
    `${config.idField} = '${escapeSqlValue(
      countyId
    )}'`;


  try {

    const result =
      await appState.countyLayer.queryFeatures({

        where,

        outFields:
          ["*"],

        returnGeometry:
          true,
      });


    if (
      result.features.length ===
      0
    ) {

      console.warn(
        "County not found:",
        countyId
      );

      return;
    }


    const feature =
      result.features[0];


    const countyName =
      feature.attributes[
        config.nameField
      ];


    // --------------------------------------------------------
    // STORE COUNTY
    // --------------------------------------------------------

    appState.selectedCounty = {

      id:
        countyId,

      name:
        countyName,

      feature:
        feature,
    };


    // --------------------------------------------------------
    // HIGHLIGHT COUNTY
    // --------------------------------------------------------

    showCountyHighlight(
      feature
    );


    // --------------------------------------------------------
    // ZOOM TO COUNTY
    // --------------------------------------------------------

    try {

      await appState.view.goTo(

        {
          target:
            feature.geometry,

          padding: {

            top:
              40,

            bottom:
              40,

            left:
              40,

            right:
              40,
          },
        },

        {
          duration:
            800,
        }

      );

    } catch (error) {

      console.warn(
        "Could not zoom to county:",
        error
      );
    }


    // --------------------------------------------------------
    // COUNTY REPORT
    // --------------------------------------------------------

    loadCountyReport(

      countyId,

      countyName,

      appState.selectedState?.name ?? ""

    );


      } catch (error) {

        console.error(
          "County selection failed:",
          error
        );
      }
    }


// ============================================================
// STATE HIGHLIGHT
// ============================================================

function showStateHighlight(
  feature
) {

  clearStateHighlight();


  appState.stateHighlight =
    new Graphic({

      geometry:
        feature.geometry,

      symbol:
        stateSymbol,
    });


  appState.view.graphics.add(
    appState.stateHighlight
  );
}


// ============================================================
// COUNTY HIGHLIGHT
// ============================================================

function showCountyHighlight(
  feature
) {

  clearCountyHighlight();


  appState.countyHighlight =
    new Graphic({

      geometry:
        feature.geometry,

      symbol:
        countySymbol,
    });


  appState.view.graphics.add(
    appState.countyHighlight
  );
}


// ============================================================
// CLEAR STATE
// ============================================================

function clearStateSelection() {

  clearStateHighlight();

  clearCountySelection();

  clearRasterList();

  clearFieldLayerList();


  appState.selectedState =
    null;


  appState.currentStateConfig =
    null;


  populateCountyDropdown(
    []
  );


  setCountyEnabled(
    false
  );
}


// ============================================================
// CLEAR COUNTY
// ============================================================

function clearCountySelection() {

  clearCountyHighlight();


  appState.selectedCounty =
    null;


  renderCountyReport(
    null
  );
}


// ============================================================
// CLEAR STATE HIGHLIGHT
// ============================================================

function clearStateHighlight() {

  if (
    appState.stateHighlight
  ) {

    appState.view.graphics.remove(
      appState.stateHighlight
    );


    appState.stateHighlight =
      null;
  }
}


// ============================================================
// CLEAR COUNTY HIGHLIGHT
// ============================================================

function clearCountyHighlight() {

  if (
    appState.countyHighlight
  ) {

    appState.view.graphics.remove(
      appState.countyHighlight
    );


    appState.countyHighlight =
      null;
  }
}


// ============================================================
// SQL ESCAPING
// ============================================================

function escapeSqlValue(
  value
) {

  return String(value)
    .replaceAll(
      "'",
      "''"
    );
}