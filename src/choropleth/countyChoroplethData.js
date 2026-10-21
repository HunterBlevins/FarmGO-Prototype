import { appState } from "../state.js";
import { CONFIG as APP } from "../config.js";
import { escapeSqlValue, isConfiguredUrl } from "../utils.js";
import { CHOROPLETH_CONFIG as CONFIG } from "./choroplethConfig.js";

import {
  getTable,
  cached,
  queryAll,
  fetchOptions,
  fetchValues,
  fetchNorms,
} from "./choroplethQueries.js";


// ============================================================
// COUNTY DATA
// ============================================================
//
// The counties of ONE state, from the county statistics table
// (config.js, reports.countyStatisticsUrl) and the county layer.
// Counties are matched by GEOID, whose first two digits are the
// state's FIPS code. The queries themselves are shared with the
// field choropleth, see choroplethQueries.js.
//

const COLUMNS = CONFIG.county.columns;

const optionsCache = new Map();
const valuesCache = new Map();
const normsCache = new Map();
const shapesCache = new Map();

const tableUrl = () => APP.reports.countyStatisticsUrl;

/** True when the county statistics table has been configured. */
export function isCountyTableConfigured() {

  return isConfiguredUrl(tableUrl());
}

/** The table, and the SQL that limits it to one state's counties. */
function scopeFor(stateId) {

  return {
    table: getTable(tableUrl()),
    where: `${COLUMNS.id} LIKE '${escapeSqlValue(stateId)}%'`,
  };
}


// ============================================================
// OPTIONS / VALUES / NORMS
// ============================================================

/** See fetchOptions: Map< variable -> Map< period -> { times, historicalPeriod } > > */
export function getStateCountyOptions(stateId) {

  return cached(optionsCache, `${stateId}`, () => {

    const { table, where } = scopeFor(stateId);

    return fetchOptions(table, COLUMNS, where, { periods: CONFIG.periods });
  });
}

/** Map< GEOID -> value > for one variable, period and date. */
export function getStateCountyValues({ stateId, variable, period, time }) {

  return cached(
    valuesCache,
    `${stateId}|${variable}|${period}|${time}`,
    () => {

      const { table, where } = scopeFor(stateId);

      return fetchValues(table, COLUMNS, where, { variable, period, time });
    }
  );
}

/** Map< GEOID -> historical value > for the month of `time`. */
export function getStateCountyNorms({ stateId, variable, historicalPeriod, time }) {

  const month = new Date(time).getUTCMonth();

  return cached(
    normsCache,
    `${stateId}|${variable}|${historicalPeriod}|${month}`,
    () => {

      const { table, where } = scopeFor(stateId);

      return fetchNorms(table, COLUMNS, where, { variable, historicalPeriod, time });
    }
  );
}


// ============================================================
// SHAPES: THE STATE'S COUNTY POLYGONS
// ============================================================
//
// Fetched once per state; the date slider only changes colours.
//
// Returns { shapes: [{ id, geometry }], truncated }
//

export function getStateCountyShapes(stateId) {

  return cached(shapesCache, `${stateId}`, async () => {

    const { stateIdField, idField } = APP.geography.counties;

    const { features, truncated } = await queryAll(
      appState.countyLayer,
      {
        where: `${stateIdField} = '${escapeSqlValue(stateId)}'`,
        outFields: [idField],
        returnGeometry: true,
        outSpatialReference: appState.view.spatialReference,
        maxAllowableOffset: CONFIG.county.maxAllowableOffset,
      },
      { pageSize: CONFIG.shapePageSize }
    );

    const shapes = features
      .filter((feature) => feature.geometry)
      .map((feature) => ({
        id: String(feature.attributes[idField]),
        geometry: feature.geometry,
      }));

    return { shapes, truncated };
  });
}
