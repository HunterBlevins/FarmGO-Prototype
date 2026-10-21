import { appState } from "../state.js";
import { isConfiguredUrl } from "../utils.js";
import { countyClause } from "../countyFilter.js";
import { FIELD_REPORT_CONFIG as TABLE } from "../fieldReports/fieldReportConfig.js";
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
// FIELD DATA
// ============================================================
//
// Everything is scoped to ONE county: the field statistics table
// and the field layer are both filtered by the county column (see
// choroplethConfig.js). The queries themselves are shared with the
// county choropleth, see choroplethQueries.js.
//

const COLUMNS = {
  id:       TABLE.columns.fieldId,
  start:    TABLE.columns.start,
  period:   TABLE.columns.period,
  variable: TABLE.columns.variable,
  value:    TABLE.columns.value,
};

const optionsCache = new Map();
const valuesCache = new Map();
const normsCache = new Map();
const shapesCache = new Map();

/** URL of the statistics table for the selected state, or null. */
export function getStatisticsTableUrl() {

  const url =
    TABLE.tableUrlByState?.[appState.selectedState?.name] ??
    TABLE.tableUrl;

  return isConfiguredUrl(url) ? url : null;
}

/** The table, and the SQL that limits it to one county's fields. */
async function scopeFor(countyId) {

  const url = getStatisticsTableUrl();
  const table = getTable(url);

  await table.load(); // needed to know the county column's type

  return {
    url,
    table,
    where: countyClause(table, CONFIG.countyIdColumn, countyId, "statistics table"),
  };
}


// ============================================================
// OPTIONS / VALUES / NORMS
// ============================================================

/** See fetchOptions: Map< variable -> Map< period -> { times, historicalPeriod } > > */
export function getCountyOptions(countyId) {

  return cached(
    optionsCache,
    `${getStatisticsTableUrl()}|${countyId}`,
    async () => {

      const { table, where } = await scopeFor(countyId);

      return fetchOptions(table, COLUMNS, where, {
        periods: CONFIG.periods,
        noRowsHint:
          `Check that countyIdValue in choroplethConfig.js matches ` +
          `the values stored in the table's ${CONFIG.countyIdColumn} column.`,
      });
    }
  );
}

/** Map< fieldId -> value > for one variable, period and date. */
export function getFieldValues({ countyId, variable, period, time }) {

  return cached(
    valuesCache,
    `${getStatisticsTableUrl()}|${countyId}|${variable}|${period}|${time}`,
    async () => {

      const { table, where } = await scopeFor(countyId);

      return fetchValues(table, COLUMNS, where, { variable, period, time });
    }
  );
}

/** Map< fieldId -> historical value > for the month of `time`. */
export function getFieldNorms({ countyId, variable, historicalPeriod, time }) {

  const month = new Date(time).getUTCMonth();

  return cached(
    normsCache,
    `${getStatisticsTableUrl()}|${countyId}|${variable}|${historicalPeriod}|${month}`,
    async () => {

      const { table, where } = await scopeFor(countyId);

      return fetchNorms(table, COLUMNS, where, { variable, historicalPeriod, time });
    }
  );
}


// ============================================================
// SHAPES: THE COUNTY'S FIELD POLYGONS
// ============================================================
//
// The shapes come from the field layer currently chosen in the
// "Field layer" dropdown. They are fetched once per county; the
// date slider only changes colours.
//
// Returns { shapes: [{ id, geometry }], truncated }
//

export function getCountyFieldShapes(countyId) {

  const layer = appState.activeFieldLayer;

  if (!layer) {
    return Promise.reject(new Error("Choose a field layer first."));
  }

  return cached(
    shapesCache,
    `${layer.id}|${countyId}`,
    () => fetchShapes(layer, countyId)
  );
}

function getActiveLayerConfigId() {

  for (const [id, layer] of appState.fieldLayers) {

    if (layer === appState.activeFieldLayer) {
      return id;
    }
  }

  return null;
}

async function fetchShapes(layer, countyId) {

  await layer.load();

  // Which attribute on the map layer holds the field ID? It is
  // the key that joins a polygon to its row in the table.
  const wanted = (
    TABLE.idAttribute[getActiveLayerConfigId()] ??
    TABLE.idAttribute.default
  ).toLowerCase();

  const idField = layer.fields.find((f) => f.name.toLowerCase() === wanted);

  if (!idField) {
    throw new Error(
      `The field layer has no "${wanted}" attribute. ` +
      `Set idAttribute in fieldReportConfig.js. ` +
      `Available: ${layer.fields.map((f) => f.name).join(", ")}`
    );
  }

  const { features, truncated } = await queryAll(
    layer,
    {
      where: countyClause(
        layer,
        CONFIG.countyIdAttribute,
        countyId,
        "field layer"
      ),
      outFields: [idField.name],
      returnGeometry: true,
      outSpatialReference: appState.view.spatialReference,
      maxAllowableOffset: CONFIG.maxAllowableOffset,
    },
    {
      pageSize: CONFIG.shapePageSize,
      maxRecords: CONFIG.maxFeatures,
    }
  );

  const shapes = features
    .filter((feature) => feature.geometry)
    .map((feature) => ({
      id: String(feature.attributes[idField.name]),
      geometry: feature.geometry,
    }));

  return { shapes, truncated };
}
