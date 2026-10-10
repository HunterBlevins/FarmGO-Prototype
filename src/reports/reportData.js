import FeatureLayer from "@arcgis/core/layers/FeatureLayer.js";

import { CONFIG } from "../config.js";
import { escapeSqlValue } from "../utils.js";


// ============================================================
// COUNTY STATISTICS LAYER
// ============================================================

const countyStatisticsLayer = new FeatureLayer({
  url: CONFIG.reports.countyStatisticsUrl,
});

// Services return a limited number of rows per request, so
// large result sets are read page by page.
const PAGE_SIZE = 1000;
const MAX_PAGES = 200;

// geoid -> Promise of records (avoids re-querying a county the
// user has already opened).
const cache = new Map();


// ============================================================
// GET COUNTY STATISTICS
// ============================================================
//
// Returns an array of records for every variable in the table:
//
//   { START, VALUE, PERIOD, VARIABLE }
//
// PERIOD and VARIABLE are trimmed and lower-cased (the same
// shape the field statistics use), oldest first.
//

export function getCountyStatistics(geoid) {

  if (!geoid) {
    return Promise.resolve([]);
  }

  if (!cache.has(geoid)) {

    const request = fetchCountyStatistics(geoid).catch((error) => {

      // Don't cache failures; let the user try again.
      cache.delete(geoid);

      throw error;
    });

    cache.set(geoid, request);
  }

  return cache.get(geoid);
}


async function fetchCountyStatistics(geoid) {

  // The layer must be loaded to know its object id field name.
  await countyStatisticsLayer.load();

  const objectIdField = countyStatisticsLayer.objectIdField;

  const records = [];

  for (let page = 0; page < MAX_PAGES; page++) {

    const result = await countyStatisticsLayer.queryFeatures({
      where: `GEOID = '${escapeSqlValue(geoid)}'`,
      outFields: ["GEOID", "START", "PERIOD", "VARIABLE", "VALUE"],
      returnGeometry: false,
      orderByFields: ["START ASC", `${objectIdField} ASC`], // stable paging
      start: page * PAGE_SIZE,
      num: PAGE_SIZE,
    });

    for (const feature of result.features) {

      const a = feature.attributes;

      records.push({
        START: a.START,
        VALUE: a.VALUE,
        PERIOD: String(a.PERIOD ?? "").trim().toLowerCase(),
        VARIABLE: String(a.VARIABLE ?? "").trim().toLowerCase(),
      });
    }

    if (!result.exceededTransferLimit || result.features.length === 0) {
      break;
    }
  }

  return records;
}
