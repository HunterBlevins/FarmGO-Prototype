import FeatureLayer from "@arcgis/core/layers/FeatureLayer.js";

import { CONFIG } from "../config.js";
import { escapeSqlValue } from "../utils.js";


// ============================================================
// COUNTY STATISTICS LAYER
// ============================================================

const countyStatisticsLayer = new FeatureLayer({
  url: CONFIG.reports.countyStatisticsUrl,
});

const CLIMATE_VARIABLES = ["ppt", "tmin", "tmean", "tmax", "tdmean"];

// Services return a limited number of rows per request, so
// large result sets are read page by page.
const PAGE_SIZE = 1000;
const MAX_PAGES = 50;

// geoid -> Promise of grouped data (avoids re-querying a county
// the user has already opened).
const cache = new Map();


function emptyGroups() {

  return Object.fromEntries(CLIMATE_VARIABLES.map((name) => [name, []]));
}


// ============================================================
// GET COUNTY CLIMATE DATA
// ============================================================
//
// Returns { ppt: [], tmin: [], tmean: [], tmax: [], tdmean: [] }
// where each array holds the records for that variable, oldest
// first.
//

export function getCountyClimateData(geoid) {

  if (!geoid) {
    return Promise.resolve(emptyGroups());
  }

  if (!cache.has(geoid)) {

    const request = fetchCountyClimateData(geoid).catch((error) => {

      // Don't cache failures; let the user try again.
      cache.delete(geoid);

      throw error;
    });

    cache.set(geoid, request);
  }

  return cache.get(geoid);
}


async function fetchCountyClimateData(geoid) {

  // The layer must be loaded to know its object id field name.
  await countyStatisticsLayer.load();

  const objectIdField = countyStatisticsLayer.objectIdField;

  const records = [];

  for (let page = 0; page < MAX_PAGES; page++) {

    const result = await countyStatisticsLayer.queryFeatures({
      where: `GEOID = '${escapeSqlValue(geoid)}'`,
      outFields: ["GEOID", "START", "END_", "PERIOD", "VARIABLE", "VALUE"],
      returnGeometry: false,
      orderByFields: ["START ASC", `${objectIdField} ASC`], // stable paging
      start: page * PAGE_SIZE,
      num: PAGE_SIZE,
    });

    records.push(...result.features.map((feature) => feature.attributes));

    if (!result.exceededTransferLimit || result.features.length === 0) {
      break;
    }
  }

  const grouped = emptyGroups();

  for (const record of records) {

    const variable = String(record.VARIABLE ?? "").toLowerCase();

    if (variable in grouped) {
      grouped[variable].push(record);
    }
  }

  return grouped;
}
