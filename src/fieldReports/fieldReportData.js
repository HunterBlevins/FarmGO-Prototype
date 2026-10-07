import FeatureLayer from "@arcgis/core/layers/FeatureLayer.js";

import { escapeSqlValue } from "../utils.js";
import { FIELD_REPORT_CONFIG as CONFIG } from "./fieldReportConfig.js";


// ============================================================
// FIELD STATISTICS TABLE
// ============================================================
//
// Services return a limited number of rows per request, so
// results are read page by page.
//

const PAGE_SIZE = 100;
const MAX_PAGES = 100;

// table url -> FeatureLayer
const tables = new Map();

// "url|fieldId" -> Promise of records (avoids re-querying a
// field that was already opened)
const cache = new Map();


function getTable(url) {

  if (!tables.has(url)) {
    tables.set(url, new FeatureLayer({ url }));
  }

  return tables.get(url);
}


// ============================================================
// GET FIELD STATISTICS
// ============================================================
//
// Returns an array of records:
//
//   { START, VALUE, PERIOD, VARIABLE }
//
// PERIOD and VARIABLE are trimmed and lower-cased so they can
// be compared reliably. Oldest first.
//

export function getFieldStatistics(tableUrl, fieldId) {

  const key = `${tableUrl}|${fieldId}`;

  if (!cache.has(key)) {

    const request = fetchFieldStatistics(tableUrl, fieldId).catch((error) => {

      // Don't cache failures; let the user try again.
      cache.delete(key);

      throw error;
    });

    cache.set(key, request);
  }

  return cache.get(key);
}


async function fetchFieldStatistics(tableUrl, fieldId) {

  const table = getTable(tableUrl);

  // Needed to know the object id field used for stable paging.
  await table.load();

  const c = CONFIG.columns;

  const records = [];

  for (let page = 0; page < MAX_PAGES; page++) {

    const result = await table.queryFeatures({
      where: `${c.fieldId} = '${escapeSqlValue(fieldId)}'`,
      outFields: [c.fieldId, c.start, c.period, c.variable, c.value],
      returnGeometry: false,
      orderByFields: [`${c.start} ASC`, `${c.period} ASC`, `${c.variable} ASC`],
      start: page * PAGE_SIZE,
      num: PAGE_SIZE,
    });

    for (const feature of result.features) {

      const a = feature.attributes;

      records.push({
        START: a[c.start],
        VALUE: a[c.value],
        PERIOD: String(a[c.period] ?? "").trim().toLowerCase(),
        VARIABLE: String(a[c.variable] ?? "").trim().toLowerCase(),
      });
    }

    if (!result.exceededTransferLimit || result.features.length === 0) {
      break;
    }
  }

  return records;
}
