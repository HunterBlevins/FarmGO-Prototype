import FeatureLayer from "@arcgis/core/layers/FeatureLayer.js";

import { CONFIG } from "../config.js";


// ============================================================
// COUNTY STATISTICS LAYER
// ============================================================

const countyStatisticsLayer =
  new FeatureLayer({

    url:
      CONFIG.reports.countyStatisticsUrl,

  });


// ============================================================
// GET COUNTY CLIMATE DATA
// ============================================================

export async function getCountyClimateData(
  geoid
) {

  console.log(
    "Querying CountyStatistics for:",
    geoid
  );


  if (!geoid) {

    console.warn(
      "No county GEOID supplied."
    );

    return {

      ppt: [],
      tmin: [],
      tmean: [],
      tmax: [],
      tdmean: [],

    };

  }


  // ----------------------------------------------------------
  // QUERY
  // ----------------------------------------------------------

  const query =
    countyStatisticsLayer.createQuery();


  query.where =
    `GEOID = '${escapeSqlValue(geoid)}'`;


  query.outFields = [

    "GEOID",
    "START",
    "END_",
    "PERIOD",
    "VARIABLE",
    "VALUE",

  ];


  query.returnGeometry =
    false;


  query.orderByFields = [
    "START ASC",
  ];


  try {

    const result =
      await countyStatisticsLayer.queryFeatures(
        query
      );


    const records =
      result.features.map(
        feature =>
          feature.attributes
      );


    console.log(
      `CountyStatistics returned ${records.length} records for ${geoid}.`
    );


    if (
      records.length > 0
    ) {

      console.log(
        "First county record:",
        records[0]
      );

    }


    // --------------------------------------------------------
    // GROUP VARIABLES
    // --------------------------------------------------------

    const grouped = {

      ppt: [],
      tmin: [],
      tmean: [],
      tmax: [],
      tdmean: [],

    };


    for (
      const record
      of records
    ) {

      const variable =
        String(
          record.VARIABLE ?? ""
        )
          .toLowerCase();


      if (
        Object.prototype.hasOwnProperty.call(
          grouped,
          variable
        )
      ) {

        grouped[variable].push(
          record
        );

      }

    }


    console.log(
      "Grouped climate data:",
      grouped
    );


    return grouped;

  } catch (error) {

    console.error(
      "Could not load county climate data:",
      error
    );


    throw error;

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