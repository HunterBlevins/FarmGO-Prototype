export const CONFIG = {

  // ==========================================================
  // APPLICATION
  // ==========================================================

  app: {

    title:
      "FarmGO",

    subtitle:
      "Agricultural data dashboard",

    logo:
      "/FarmGOLogo.png",
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
    // PRECIPITATION
    // --------------------------------------------------------
    //
    // Low = light yellow
    // High = dark blue
    //
    // --------------------------------------------------------

    precipitation: {

      title:
        "Precipitation",

      description:
        "Mean precipitation",

      type:
        "imageryTile",

      opacity:
        0.85,

      colorRamp: [

        "#ffffcc",
        "#c7e9b4",
        "#7fcdbb",
        "#41b6c4",
        "#2c7fb8",
        "#253494",

      ],
    },


    // --------------------------------------------------------
    // CROP CONDITION
    // --------------------------------------------------------
    //
    // Poor = red
    // Fair = yellow
    // Good = light green
    // Excellent = dark green
    //
    // --------------------------------------------------------

    cropCondition: {

      title:
        "Crop Condition",

      description:
        "Crop condition classification",

      type:
        "imageryTile",

      opacity:
        0.85,

      colorRamp: [

        "#d73027",
        "#fc8d59",
        "#fee08b",
        "#91cf60",
        "#1a9850",

      ],
    },


    // --------------------------------------------------------
    // VEGETATION INDEX
    // --------------------------------------------------------
    //
    // Low vegetation = brown
    // Moderate = yellow/green
    // High = dark green
    //
    // --------------------------------------------------------

    vegetationIndex: {

      title:
        "Vegetation Index",

      description:
        "Vegetation index",

      type:
        "imageryTile",

      opacity:
        0.85,

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
        "#2166ac"
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

        cropCondition:
          "YOUR-TEXAS-CROP-CONDITION-IMAGESERVER",

        vegetationIndex:
          "YOUR-TEXAS-VEGETATION-INDEX-IMAGESERVER",
      },


      fields: [

        {
          id:
            "tx-field-boundaries",

          title:
            "Field Boundaries",

          url:
            "https://services3.arcgis.com/0OPQIK59PJJqLK0A/arcgis/rest/services/FTW_2025/FeatureServer/4",
        },


        {
          id:
            "tx-qa-fields",

          title:
            "QA Fields",

          url:
            "YOUR-TEXAS-QA-FIELDS-FEATURESERVER",
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

        precipitation:
          "YOUR-ARIZONA-PRECIPITATION-IMAGESERVER",

        cropCondition:
          "YOUR-ARIZONA-CROP-CONDITION-IMAGESERVER",

        vegetationIndex:
          "YOUR-ARIZONA-VEGETATION-INDEX-IMAGESERVER",
      },


      fields: [

        {
          id:
            "az-field-boundaries",

          title:
            "Field Boundaries",

          url:
            "YOUR-ARIZONA-FIELD-BOUNDARIES-FEATURESERVER",
        },


        {
          id:
            "az-qa-fields",

          title:
            "QA Fields",

          url:
            "YOUR-ARIZONA-QA-FIELDS-FEATURESERVER",
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