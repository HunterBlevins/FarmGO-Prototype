import FeatureLayer from "@arcgis/core/layers/FeatureLayer.js";

import { appState } from "../state.js";
import { escapeSqlValue, isConfiguredUrl } from "../utils.js";
import { countyClause } from "../countyFilter.js";
import { FIELD_REPORT_CONFIG as TABLE } from "../fieldReports/fieldReportConfig.js";
import { CHOROPLETH_CONFIG as CONFIG } from "./choroplethConfig.js";


// ============================================================
// SETUP
// ============================================================
//
// How the data is loaded, so every request stays small:
//
//   1. Once per county:  the field shapes (cached), and which
//                        variables / periods / dates exist.
//   2. Once per date:    one number per field in the county,
//                        for ONE variable, period and date.
//
// Moving the date slider only repeats step 2, and a date that
// was already loaded comes straight from the cache.
//

//const USE_CACHE = false;

const COLUMNS = TABLE.columns;

const PAGE_SIZE = 1000;
const MAX_PAGES = 100;

// table url -> FeatureLayer
const tables = new Map();

const optionsCache = new Map();
const valuesCache = new Map();
const shapesCache = new Map();

function cached(cache, key, create) {

  if (!cache.has(key)) {

    const request = create().catch((error) => {
      cache.delete(key); // don't remember failures
      throw error;
    });

    cache.set(key, request);
  }

  return cache.get(key);
}

function getTable(url) {

  if (!tables.has(url)) {
    tables.set(url, new FeatureLayer({ url }));
  }

  return tables.get(url);
}

/** URL of the statistics table for the selected state, or null. */
export function getStatisticsTableUrl() {

  const url =
    TABLE.tableUrlByState?.[appState.selectedState?.name] ??
    TABLE.tableUrl;

  return isConfiguredUrl(url) ? url : null;
}


// ============================================================
// QUERY HELPERS
// ============================================================

function equalsClause(column, value) {

  return value === ""
    ? `(${column} IS NULL OR ${column} = '')`
    : `${column} = '${escapeSqlValue(value)}'`;
}

/** 1704067200000 -> "2024-01-01 00:00:00" (dates are UTC). */
function sqlTimestamp(ms) {

  return new Date(ms).toISOString().slice(0, 19).replace("T", " ");
}

/**
 * Reads every page of a query. Results are sorted by the object
 * id (which is always indexed) unless `sort` is false. Paging
 * continues from how many rows were actually received, because
 * a server may return fewer rows than asked for.
 *
 * sort: false skips ORDER BY, which can be much faster on big
 * tables, but then the server doesn't guarantee a stable order
 * between pages.
 */
async function queryAll(
  layer,
  params,
  { pageSize = PAGE_SIZE, maxRecords = Infinity, sort = true } = {}
) {

  await layer.load();

  const oid = layer.objectIdField;

  const features = [];
  let truncated = false;

  for (let page = 0; page < MAX_PAGES; page++) {

    const result = await layer.queryFeatures({
      ...params,
      outFields: [...params.outFields, oid],
      ...(sort && { orderByFields: [`${oid} ASC`] }),
      start: features.length,
      num: pageSize,
    });

    features.push(...result.features);

    if (!result.exceededTransferLimit || result.features.length === 0) {
      break;
    }

    if (features.length >= maxRecords) {
      truncated = true;
      break;
    }
  }

  return { features, truncated };
}


// ============================================================
// 1. WHAT CAN BE MAPPED IN THIS COUNTY?
// ============================================================
//
// Rather than scanning every row of the county, one sample
// field is read and its variables, periods and dates are used
// for the whole county (this assumes all fields share the same
// schedule, which is normally true for gridded climate data).
//
// Returns null when the county has no statistics, otherwise
//
//   Map< variable -> Map< period -> sorted array of start times (ms) > >
//
// Variable and period are the raw table values, so they can be
// used directly in later queries.
//

export function getCountyOptions(countyId) {

  const tableUrl = getStatisticsTableUrl();

  return cached(
    optionsCache,
    `${tableUrl}|${countyId}`,
    () => fetchCountyOptions(tableUrl, countyId)
  );
}

async function fetchCountyOptions(tableUrl, countyId) {

  const table = getTable(tableUrl);

  await table.load();

  // --- find any field in the county -----------------------

  const countyWhere = countyClause(
    table,
    CONFIG.countyIdColumn,
    countyId,
    "statistics table"
  );

  const sample = await table.queryFeatures({
    where: countyWhere,
    outFields: [COLUMNS.fieldId],
    returnGeometry: false,
    num: 1,
  });

  const sampleId = sample.features[0]?.attributes[COLUMNS.fieldId];

  if (!sampleId) {
    throw new Error(
      `The statistics table has no rows where ${countyWhere}. ` +
      `Check that countyIdValue in choroplethConfig.js matches ` +
      `the values stored in the table's ${CONFIG.countyIdColumn} column.`
    );
  }

  // --- read that field's variables / periods / dates ------

  const { features } = await queryAll(table, {
    where: `${COLUMNS.fieldId} = '${escapeSqlValue(sampleId)}'`,
    outFields: [COLUMNS.variable, COLUMNS.period, COLUMNS.start],
    returnGeometry: false,
  });

  const tree = new Map();

  for (const feature of features) {

    const a = feature.attributes;

    const variable = a[COLUMNS.variable];
    const period = a[COLUMNS.period] ?? "";
    const start = a[COLUMNS.start];

    if (variable === null || variable === undefined || !Number.isFinite(start)) {
      continue;
    }

    if (!tree.has(variable)) {
      tree.set(variable, new Map());
    }

    if (!tree.get(variable).has(period)) {
      tree.get(variable).set(period, new Set());
    }

    tree.get(variable).get(period).add(start);
  }

  // Sets -> sorted arrays
  for (const periods of tree.values()) {
    for (const [period, times] of periods) {
      periods.set(period, [...times].sort((x, y) => x - y));
    }
  }

  return tree.size > 0 ? tree : null;
}


// ============================================================
// 2. VALUES: ONE NUMBER PER FIELD, FOR ONE DATE
// ============================================================
//
// Returns Map< fieldId (string) -> value (number) > for every
// field in the county that has a row for this ONE variable,
// period and date. Only FIELD_ID and VALUE are requested, so
// each row is tiny.
//

export function getFieldValues({ countyId, variable, period, time }) {

  const tableUrl = getStatisticsTableUrl();

  return cached(
    valuesCache,
    `${tableUrl}|${countyId}|${variable}|${period}|${time}`,
    () => fetchFieldValues(tableUrl, { countyId, variable, period, time })
  );
}

async function fetchFieldValues(tableUrl, { countyId, variable, period, time }) {

  const table = getTable(tableUrl);

  await table.load(); // needed to know the COUNTY_ID column's type

  const where = [
    countyClause(table, CONFIG.countyIdColumn, countyId, "statistics table"),
    equalsClause(COLUMNS.variable, variable),
    equalsClause(COLUMNS.period, period),
    `${COLUMNS.start} = timestamp '${sqlTimestamp(time)}'`,
  ].join(" AND ");

  const { features } = await queryAll(
    table,
    {
      where,
      outFields: [COLUMNS.fieldId, COLUMNS.value],
      returnGeometry: false,
    },
    { sort: CONFIG.sortValuesQuery }
  );

  const values = new Map();

  for (const feature of features) {

    const a = feature.attributes;
    const value = a[COLUMNS.value];

    if (value !== null && value !== undefined && Number.isFinite(Number(value))) {
      values.set(String(a[COLUMNS.fieldId]), Number(value));
    }
  }

  return values;
}


// ============================================================
// 3. SHAPES: THE COUNTY'S FIELD POLYGONS
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