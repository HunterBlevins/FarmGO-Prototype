import FeatureLayer from "@arcgis/core/layers/FeatureLayer.js";

import { escapeSqlValue } from "../utils.js";
import { monthOf, normalizePeriod, historicalPeriodOf } from "../reports/historical.js";


// ============================================================
// QUERIES SHARED BY THE FIELD AND COUNTY CHOROPLETHS
// ============================================================
//
// Both statistics tables have the same shape (an id, a START date,
// a PERIOD, a VARIABLE and a VALUE), only the column names and the
// way rows are scoped differ. So the queries here take
//
//   columns:     { id, start, period, variable, value }
//   scopeWhere:  SQL limiting the rows to one county's fields, or
//                one state's counties
//
// Every request stays small:
//
//   options   once per scope:  which variables / dates exist
//   values    once per date:   one number per field / county
//   norms     once per month:  one stored historical value per
//                              field / county (shared by every year)
//

const PAGE_SIZE = 1000;
const MAX_PAGES = 100;

// table url -> FeatureLayer
const tables = new Map();

export function getTable(url) {

  if (!tables.has(url)) {
    tables.set(url, new FeatureLayer({ url }));
  }

  return tables.get(url);
}

/** Remembers a promise per key, and forgets it if it fails. */
export function cached(cache, key, create) {

  if (!cache.has(key)) {

    const request = create().catch((error) => {
      cache.delete(key); // don't remember failures
      throw error;
    });

    cache.set(key, request);
  }

  return cache.get(key);
}


// ============================================================
// SQL HELPERS
// ============================================================

export function equalsClause(column, value) {

  return value === ""
    ? `(${column} IS NULL OR ${column} = '')`
    : `${column} = '${escapeSqlValue(value)}'`;
}

/** 1704067200000 -> "2024-01-01 00:00:00" (dates are UTC). */
export function sqlTimestamp(ms) {

  return new Date(ms).toISOString().slice(0, 19).replace("T", " ");
}


// ============================================================
// PAGING
// ============================================================

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
export async function queryAll(
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
// 1. OPTIONS: WHAT CAN BE MAPPED IN THIS SCOPE?
// ============================================================
//
// Rather than scanning every row, one sample field / county is
// read and its variables, periods and dates are used for the whole
// scope (this assumes everything shares the same schedule, which
// is normally true for gridded climate data).
//
// Only the periods in `periods` (e.g. ["monthly"]) are kept, and
// only for variables that also have the matching historical rows,
// because the map is the change from the historical norm.
//
// Returns null when nothing can be mapped, otherwise
//
//   Map< variable -> Map< period -> { times, historicalPeriod } > >
//
// times: sorted start dates (ms). Variable and period are the raw
// table values, so they can be used directly in later queries.
//

export async function fetchOptions(table, columns, scopeWhere, { periods, noRowsHint = "" }) {

  await table.load();

  // --- find any field / county in scope -------------------

  const sample = await table.queryFeatures({
    where: scopeWhere,
    outFields: [columns.id],
    returnGeometry: false,
    num: 1,
  });

  const sampleId = sample.features[0]?.attributes[columns.id];

  if (!sampleId) {
    throw new Error(
      `The statistics table has no rows where ${scopeWhere}. ${noRowsHint}`.trim()
    );
  }

  // --- read its variables / periods / dates ---------------

  const { features } = await queryAll(table, {
    where: `${columns.id} = '${escapeSqlValue(sampleId)}'`,
    outFields: [columns.variable, columns.period, columns.start],
    returnGeometry: false,
  });

  // variable -> raw period -> Set of start times
  const tree = new Map();

  for (const feature of features) {

    const a = feature.attributes;

    const variable = a[columns.variable];
    const period = a[columns.period] ?? "";
    const start = a[columns.start];

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

  // --- keep what can be compared with a historical norm ---

  const wanted = periods.map(normalizePeriod);
  const options = new Map();

  for (const [variable, byPeriod] of tree) {

    const kept = new Map();

    for (const [period, times] of byPeriod) {

      if (!wanted.includes(normalizePeriod(period))) {
        continue;
      }

      const historicalName = historicalPeriodOf(period);

      const historicalPeriod = [...byPeriod.keys()].find(
        (candidate) => normalizePeriod(candidate) === historicalName
      );

      if (historicalPeriod !== undefined) {
        kept.set(period, {
          times: [...times].sort((x, y) => x - y),
          historicalPeriod,
        });
      }
    }

    if (kept.size > 0) {
      options.set(variable, kept);
    }
  }

  return options.size > 0 ? options : null;
}


// ============================================================
// 2. VALUES: ONE NUMBER PER FIELD / COUNTY, FOR ONE DATE
// ============================================================
//
// Returns Map< id (string) -> value (number) >.
//

export async function fetchValues(table, columns, scopeWhere, { variable, period, time }) {

  await table.load();

  const where = [
    scopeWhere,
    equalsClause(columns.variable, variable),
    equalsClause(columns.period, period),
    `${columns.start} = timestamp '${sqlTimestamp(time)}'`,
  ].join(" AND ");

  const { features } = await queryAll(
    table,
    {
      where,
      outFields: [columns.id, columns.value],
      returnGeometry: false,
    },
    { sort: false }
  );

  const values = new Map();

  for (const feature of features) {

    const a = feature.attributes;
    const value = a[columns.value];

    if (isNumber(value)) {
      values.set(String(a[columns.id]), Number(value));
    }
  }

  return values;
}


// ============================================================
// 3. NORMS: THE STORED HISTORICAL VALUE FOR ONE MONTH
// ============================================================
//
// The historical norms are already in the table: one row per
// field / county, per variable, per month, with the PERIOD
// "historical monthly" and a START date in the month it describes.
// So this is a plain lookup, like the values above, for the rows
// whose START falls in the same month of the year as `time`.
//
// Returns Map< id (string) -> historical value (number) >.
//
// The month is matched on the server with EXTRACT(MONTH ...), so
// one small row per field / county comes back. If the server does
// not support that, the variable's 12 months are read instead and
// the right one is picked here (slower, but still bounded).
//

export async function fetchNorms(table, columns, scopeWhere, { variable, historicalPeriod, time }) {

  await table.load();

  const month = monthOf(time);

  const where = [
    scopeWhere,
    equalsClause(columns.variable, variable),
    equalsClause(columns.period, historicalPeriod),
  ].join(" AND ");

  const read = async (extraWhere) => {

    const { features } = await queryAll(
      table,
      {
        where: extraWhere ? `${where} AND ${extraWhere}` : where,
        outFields: [columns.id, columns.start, columns.value],
        returnGeometry: false,
      },
      { sort: false }
    );

    return features;
  };

  let features;
  let monthKnown = true;

  try {

    features = await read(`EXTRACT(MONTH FROM ${columns.start}) = ${month}`);

  } catch (error) {

    console.warn(
      "The server could not filter historical rows by month; " +
      "reading all months and filtering in the browser instead.",
      error
    );

    features = await read("");
    monthKnown = false;
  }

  const norms = new Map();

  for (const feature of features) {

    const a = feature.attributes;

    if (!isNumber(a[columns.value])) {
      continue;
    }

    if (!monthKnown && monthOf(a[columns.start]) !== month) {
      continue;
    }

    norms.set(String(a[columns.id]), Number(a[columns.value]));
  }

  return norms;
}

function isNumber(value) {

  return value !== null && value !== undefined && value !== "" &&
    Number.isFinite(Number(value));
}
