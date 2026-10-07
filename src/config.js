export const CONFIG = {

  // ==========================================================
  // APPLICATION
  // ==========================================================

  app: {

    title:
      "FarmGO",

    subtitle:
      "Agricultural data dashboard",
  },


// ==========================================================
// DEFAULTS
// ==========================================================
//
// Opacity is 0 (invisible) to 1 (solid).
// 0.85 = 15% transparent.
//

defaults: {

  fieldOpacity:
    0.85,

  rasterOpacity:
    0.85,
},


// ==========================================================
// GEOGRAPHY SERVICES
// ==========================================================

geography: {

  states: {

    url:
      "https://services3.arcgis.com/0OPQIK59PJJqLK0A/arcgis/rest/services/FarmGoInitialStates/FeatureServer",

    nameField:
      "STATE_NAME",

    idField:
      "STATE_FIPS",
  },


  counties: {

    url:
      "https://services2.arcgis.com/FiaPA4ga0iQKduv3/ArcGIS/rest/services/TIGERweb_Counties_v1/FeatureServer/0",

    nameField:
      "NAME",

    idField:
      "GEOID",

    stateIdField:
      "STATE",
  },
},


// ==========================================================
// DATASET DEFINITIONS
// ==========================================================

datasets: {

  // --------------------------------------------------------
  // SOIL MOISTURE
  // --------------------------------------------------------

  soilMoisture: {

    title:
      "Soil Moisture",

    description:
      "Mean monthly soil moisture",

    type:
      "imageryTile",

    opacity:
      1.00,

    colorRamp: [

      "#8c510a",
      "#d8b365",
      "#f6e8c3",
      "#c7eae5",
      "#5ab4ac",
      "#01665e",

    ],
  },


  // --------------------------------------------------------
  // OPENET
  // --------------------------------------------------------
  //
  // Low ET = yellow/orange
  // High ET = green/blue
  //
  // --------------------------------------------------------

  OpenET: {

    title:
      "OpenET",

    description:
      "Evapotranspiration from OpenET",

    type:
      "imageryTile",

    opacity:
      1.00,

    colorRamp: [

      "#8c510a",
      "#d8b365",
      "#f6e8c3",
      "#a6dba0",
      "#5aae61",
      "#2166ac",

    ],
  },


  // --------------------------------------------------------
  // CROPLAND DATA LAYER
  // --------------------------------------------------------

  CDL: {

    title:
      "Cropland Data Layer",

    description:
      "USDA Cropland Data Layer",

    type:
      "imageryTile",

    opacity:
      1.00,
  },


  // --------------------------------------------------------
  // MAXIMUM TEMPERATURE
  // --------------------------------------------------------

  maxTemp: {

    title:
      "Maximum Temperature",

    description:
      "Mean monthly maximum temperature",

    type:
      "imageryTile",

    opacity:
      1.00,

    colorRamp: [

      "#313695",
      "#4575b4",
      "#74add1",
      "#abd9e9",
      "#fee090",
      "#f46d43",
      "#d73027",
      "#a50026",

    ],
  },


  // --------------------------------------------------------
  // MEAN TEMPERATURE
  // --------------------------------------------------------

  meanTemp: {

    title:
      "Mean Temperature",

    description:
      "Mean monthly temperature",

    type:
      "imageryTile",

    opacity:
      1.00,

    colorRamp: [

      "#313695",
      "#4575b4",
      "#74add1",
      "#abd9e9",
      "#ffffbf",
      "#fdae61",
      "#f46d43",
      "#d73027",

    ],
  },


  // --------------------------------------------------------
  // TOTAL PRECIPITATION
  // --------------------------------------------------------

  precipitation: {

    title:
      "Total Precipitation",

    description:
      "Total monthly precipitation",

    type:
      "imageryTile",

    opacity:
      1.00,

    colorRamp: [

      "#f7fbff",
      "#deebf7",
      "#c6dbef",
      "#9ecae1",
      "#6baed6",
      "#3182bd",
      "#08519c",

    ],
  },
},


// ==========================================================
// STATE-SPECIFIC DATA
// ==========================================================

states: {


  // ========================================================
  // TEXAS
  // ========================================================

  "Texas": {

    rasters: {

      soilMoisture:
        "https://tiledimageservices3.arcgis.com/0OPQIK59PJJqLK0A/arcgis/rest/services/AprMeanSoilMoisture_Texas/ImageServer",

      OpenET:
        "https://tiledimageservices3.arcgis.com/0OPQIK59PJJqLK0A/arcgis/rest/services/OpenET_YTD_Texas/ImageServer",

      precipitation:
        "https://tiledimageservices3.arcgis.com/0OPQIK59PJJqLK0A/arcgis/rest/services/Prism_ppt_Apr_Texas/ImageServer",

      meanTemp:
        "https://tiledimageservices3.arcgis.com/0OPQIK59PJJqLK0A/arcgis/rest/services/Prism_tmean_Apr_Texas/ImageServer",

      /*maxTemp:
        "https://tiledimageservices3.arcgis.com/0OPQIK59PJJqLK0A/arcgis/rest/services/Prism_tmax_Apr_Texas/ImageServer",

      minTemp:
        "https://tiledimageservices3.arcgis.com/0OPQIK59PJJqLK0A/arcgis/rest/services/Prism_tmin_Apr_Texas/ImageServer", */

      CDL:
        "https://tiledimageservices3.arcgis.com/0OPQIK59PJJqLK0A/arcgis/rest/services/CDL25_Texas/ImageServer",
    },


    fields: [

      {
        id:
          "tx-ftw-field-boundaries",

        title:
          "FTW Field Boundaries",

        url:
          "https://services3.arcgis.com/0OPQIK59PJJqLK0A/arcgis/rest/services/TexasFields_FTW_2025/FeatureServer",
      },


      {
        id:
          "tx-usda-fields",

        title:
          "USDA Field Boundaries",

        url:
          "https://services3.arcgis.com/0OPQIK59PJJqLK0A/arcgis/rest/services/USDAFieldLabels/FeatureServer/2",
      },

    ],
  },


  // ========================================================
  // ARIZONA
  // ========================================================

  "Arizona": {

    rasters: {

      soilMoisture:
        "https://tiledimageservices3.arcgis.com/0OPQIK59PJJqLK0A/arcgis/rest/services/AprMeanSoilMoisture_Arizona/ImageServer",

      OpenET:
        "https://tiledimageservices3.arcgis.com/0OPQIK59PJJqLK0A/arcgis/rest/services/FGArizona_ActualET_Apr2026/ImageServer",

      precipitation:
        "https://tiledimageservices3.arcgis.com/0OPQIK59PJJqLK0A/arcgis/rest/services/Prism_ppt_Apr_Arizona/ImageServer",

      meanTemp:
        "https://tiledimageservices3.arcgis.com/0OPQIK59PJJqLK0A/arcgis/rest/services/Prism_tmean_Apr_Arizona/ImageServer",

     /* maxTemp:
        "https://tiledimageservices3.arcgis.com/0OPQIK59PJJqLK0A/arcgis/rest/services/Prism_tmax_Apr_Arizona/ImageServer",

      minTemp:
        "https://tiledimageservices3.arcgis.com/0OPQIK59PJJqLK0A/arcgis/rest/services/Prism_tmin_Apr_Arizona/ImageServer", */

      CDL:
        "https://tiledimageservices3.arcgis.com/0OPQIK59PJJqLK0A/arcgis/rest/services/CDL25_Arizona/ImageServer",
    },


    fields: [

      {
        id:
          "az-ftw-field-boundaries",

        title:
          "FTW Field Boundaries",

        url:
          "https://services3.arcgis.com/0OPQIK59PJJqLK0A/arcgis/rest/services/FTW_2025/FeatureServer/2",
      },


      {
        id:
          "az-usda-fields",

        title:
          "USDA Field Boundaries",

        url:
          "https://services3.arcgis.com/0OPQIK59PJJqLK0A/arcgis/rest/services/USDAFieldLabels/FeatureServer/3",
      },

    ],
  },


  // ========================================================
  // HAWAII
  // ========================================================

  "Hawaii": {

    rasters: {

      soilMoisture:
        "https://tiledimageservices3.arcgis.com/0OPQIK59PJJqLK0A/arcgis/rest/services/AprMeanSoilMoisture_Hawaii/ImageServer",

      /*OpenET:
        "https://tiledimageservices3.arcgis.com/0OPQIK59PJJqLK0A/arcgis/rest/services/OpenET_YTD_Hawaii/ImageServer",

      precipitation:
        "https://tiledimageservices3.arcgis.com/0OPQIK59PJJqLK0A/arcgis/rest/services/Prism_ppt_Apr_Hawaii/ImageServer",

      meanTemp:
        "https://tiledimageservices3.arcgis.com/0OPQIK59PJJqLK0A/arcgis/rest/services/Prism_tmean_Apr_Hawaii/ImageServer",

      maxTemp:
        "https://tiledimageservices3.arcgis.com/0OPQIK59PJJqLK0A/arcgis/rest/services/Prism_tmax_Apr_Hawaii/ImageServer",

      minTemp:
        "https://tiledimageservices3.arcgis.com/0OPQIK59PJJqLK0A/arcgis/rest/services/Prism_tmin_Apr_Hawaii/ImageServer",*/

      CDL:
        "https://tiledimageservices3.arcgis.com/0OPQIK59PJJqLK0A/arcgis/rest/services/CDL25_Hawaii/ImageServer",
    },


    fields: [

      {
        id:
          "hi-ftw-field-boundaries",

        title:
          "FTW Field Boundaries",

        url:
          "https://services3.arcgis.com/0OPQIK59PJJqLK0A/arcgis/rest/services/FTW_2025/FeatureServer/3",
      },

    ],
  },
},


// ==========================================================
// REPORTS
// ==========================================================

reports: {

  countyStatisticsUrl:
    "https://services3.arcgis.com/0OPQIK59PJJqLK0A/arcgis/rest/services/CountyStatistics/FeatureServer",
},

};